// Guarda una cita en appointments.json del repositorio PRIVADO sanjose-citas.
// Las citas contienen datos personales, por eso no se guardan en el
// repositorio público de la web.
// Requiere la variable de entorno GITHUB_TOKEN (token fine-grained con
// "Contents: Read and write" sobre sanjose-citas).

const {
  APPOINTMENTS_REPO, APPOINTMENTS_PATH,
  setCors, isAllowedOrigin, parseBody, readFile, writeFile
} = require('./_lib');

const MAX_LEN = { service: 100, patientName: 100, patientPhone: 30, patientEmail: 120, message: 1000 };

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

async function readAppointments() {
  const file = await readFile(APPOINTMENTS_REPO, APPOINTMENTS_PATH);
  if (!file) return { data: { appointments: [] }, sha: undefined };
  let data;
  try {
    data = JSON.parse(file.content.toString('utf8'));
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

    const result = await writeFile(
      APPOINTMENTS_REPO,
      APPOINTMENTS_PATH,
      Buffer.from(JSON.stringify(data, null, 2) + '\n', 'utf8'),
      'Nueva cita: ' + appt.date + ' ' + appt.time,
      sha
    );

    if (result.ok) return { ok: true };
    if (result.status !== 409 && result.status !== 422) throw new Error('GitHub write ' + result.status);
  }
  throw new Error('No se pudo guardar tras varios intentos');
}

module.exports = async function handler(req, res) {
  setCors(req, res);

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });
  if (!isAllowedOrigin(req)) return res.status(403).json({ error: 'Origen no permitido' });
  if (!process.env.GITHUB_TOKEN) return res.status(500).json({ error: 'Servidor sin configurar' });

  const body = parseBody(req);
  if (!body) return res.status(400).json({ error: 'Datos no válidos' });

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
