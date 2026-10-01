// Guarda una cita en site/_data/appointments.json del repositorio de GitHub.
// Requiere la variable de entorno GITHUB_TOKEN (token fine-grained con
// "Contents: Read and write" solo sobre este repositorio).

const OWNER = process.env.GITHUB_OWNER || 'Patrimonio360';
const REPO = process.env.GITHUB_REPO || 'preview-sanjose';
const BRANCH = process.env.GITHUB_BRANCH || 'master';
const FILE_PATH = process.env.APPOINTMENTS_PATH || 'site/_data/appointments.json';

// Solo la web publicada (y pruebas en local) puede llamar a esta función.
const ALLOWED_ORIGINS = [
  'https://patrimonio360.github.io',
  'http://localhost:8080',
  'http://127.0.0.1:8080'
];

const MAX_LEN = { service: 100, patientName: 100, patientPhone: 30, patientEmail: 120, message: 1000 };

function setCors(req, res) {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function clean(value, max) {
  return String(value == null ? '' : value).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
}

function validate(body) {
  const appt = {
    service: clean(body.service, MAX_LEN.service),
    date: clean(body.date, 10),
    time: clean(body.time, 5),
    patientName: clean(body.patientName, MAX_LEN.patientName),
    patientPhone: clean(body.patientPhone, MAX_LEN.patientPhone),
    patientEmail: clean(body.patientEmail, MAX_LEN.patientEmail),
    message: clean(body.message, MAX_LEN.message)
  };

  if (!appt.service || !appt.patientName || !appt.patientPhone || !appt.patientEmail) {
    return { error: 'Faltan campos obligatorios' };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(appt.date) || isNaN(new Date(appt.date + 'T00:00:00'))) {
    return { error: 'Fecha no válida' };
  }
  if (!/^\d{2}:\d{2}$/.test(appt.time)) {
    return { error: 'Hora no válida' };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(appt.patientEmail)) {
    return { error: 'Email no válido' };
  }
  return { appt };
}

async function github(path, options) {
  const res = await fetch('https://api.github.com/repos/' + OWNER + '/' + REPO + path, {
    ...options,
    headers: {
      Authorization: 'Bearer ' + process.env.GITHUB_TOKEN,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'sanjose-book-appointment',
      ...(options && options.headers)
    }
  });
  return res;
}

async function readAppointments() {
  const res = await github('/contents/' + FILE_PATH + '?ref=' + BRANCH);
  if (res.status === 404) return { data: { appointments: [] }, sha: undefined };
  if (!res.ok) throw new Error('GitHub read ' + res.status);
  const file = await res.json();
  let data;
  try {
    data = JSON.parse(Buffer.from(file.content, 'base64').toString('utf8'));
  } catch (e) {
    data = {};
  }
  if (!Array.isArray(data.appointments)) data.appointments = [];
  return { data, sha: file.sha };
}

async function saveAppointment(appt) {
  // Si dos personas reservan a la vez, GitHub rechaza la segunda escritura
  // (409/422); en ese caso se vuelve a leer el archivo y se reintenta.
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, sha } = await readAppointments();

    const taken = data.appointments.some(function (a) {
      return a.date === appt.date && a.time === appt.time && a.status !== 'cancelled';
    });
    if (taken) return { conflict: true };

    data.appointments.push(appt);

    const res = await github('/contents/' + FILE_PATH, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Nueva cita: ' + appt.date + ' ' + appt.time,
        content: Buffer.from(JSON.stringify(data, null, 2) + '\n', 'utf8').toString('base64'),
        branch: BRANCH,
        sha: sha
      })
    });

    if (res.ok) return { ok: true };
    if (res.status !== 409 && res.status !== 422) throw new Error('GitHub write ' + res.status);
  }
  throw new Error('No se pudo guardar tras varios intentos');
}

module.exports = async function handler(req, res) {
  setCors(req, res);

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });
  if (!ALLOWED_ORIGINS.includes(req.headers.origin)) return res.status(403).json({ error: 'Origen no permitido' });
  if (!process.env.GITHUB_TOKEN) return res.status(500).json({ error: 'Servidor sin configurar' });

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = null; }
  }
  if (!body || typeof body !== 'object') return res.status(400).json({ error: 'Datos no válidos' });

  const result = validate(body);
  if (result.error) return res.status(400).json({ error: result.error });

  // id, estado y fecha de creación los pone el servidor, no el navegador.
  const appt = {
    id: Date.now(),
    ...result.appt,
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  try {
    const saved = await saveAppointment(appt);
    if (saved.conflict) return res.status(409).json({ error: 'Esa hora ya está reservada' });
    return res.status(200).json({ success: true, id: appt.id });
  } catch (err) {
    console.error('book-appointment:', err.message);
    return res.status(500).json({ error: 'No se pudo guardar la cita' });
  }
};
