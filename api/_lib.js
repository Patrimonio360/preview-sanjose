// Utilidades compartidas por las funciones de /api.
// Los archivos que empiezan por "_" no se publican como funciones en Vercel.

// Solo la web publicada (y pruebas en local) puede llamar a estas funciones.
const ALLOWED_ORIGINS = [
  'https://patrimonio360.github.io',
  'http://localhost:8080',
  'http://127.0.0.1:8080'
];

// Repositorio público de la web y repositorio privado de citas.
const SITE_REPO = { owner: 'Patrimonio360', repo: 'preview-sanjose', branch: 'master' };
const APPOINTMENTS_REPO = {
  owner: process.env.GITHUB_OWNER || 'Patrimonio360',
  repo: process.env.GITHUB_REPO || 'sanjose-citas',
  branch: process.env.GITHUB_BRANCH || 'main'
};
const APPOINTMENTS_PATH = process.env.APPOINTMENTS_PATH || 'appointments.json';

function setCors(req, res, headers) {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', headers || 'Content-Type');
}

function isAllowedOrigin(req) {
  return ALLOWED_ORIGINS.includes(req.headers.origin);
}

function parseBody(req) {
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = null; }
  }
  return body && typeof body === 'object' ? body : null;
}

async function github(target, path, options) {
  return fetch('https://api.github.com/repos/' + target.owner + '/' + target.repo + path, {
    ...options,
    headers: {
      Authorization: 'Bearer ' + process.env.GITHUB_TOKEN,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'sanjose-api',
      ...(options && options.headers)
    }
  });
}

// Lee un archivo. Devuelve { content (Buffer), sha } o null si no existe.
async function readFile(target, path) {
  const res = await github(target, '/contents/' + path + '?ref=' + target.branch);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('GitHub read ' + res.status);
  const file = await res.json();
  // Por encima de 1 MB GitHub no incluye el contenido: se pide aparte en bruto.
  if (!file.content && file.size > 0) {
    const raw = await github(target, '/contents/' + path + '?ref=' + target.branch, {
      headers: { Accept: 'application/vnd.github.raw' }
    });
    if (!raw.ok) throw new Error('GitHub read raw ' + raw.status);
    return { content: Buffer.from(await raw.arrayBuffer()), sha: file.sha };
  }
  return { content: Buffer.from(file.content || '', 'base64'), sha: file.sha };
}

// Escribe un archivo. Devuelve { ok, status, sha }.
async function writeFile(target, path, buffer, message, sha) {
  const res = await github(target, '/contents/' + path, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: message,
      content: buffer.toString('base64'),
      branch: target.branch,
      sha: sha || undefined
    })
  });
  if (!res.ok) return { ok: false, status: res.status };
  const data = await res.json();
  return { ok: true, status: res.status, sha: data.content.sha };
}

// Ajustes públicos de la clínica (horario, email…) tal como están en el repo.
async function readSettings() {
  const file = await readFile(SITE_REPO, 'site/_data/settings.json');
  return file ? JSON.parse(file.content.toString('utf8')) : {};
}

// Lista de citas del repositorio privado y su sha.
async function readAppointments() {
  const file = await readFile(APPOINTMENTS_REPO, APPOINTMENTS_PATH);
  if (!file) return { data: { appointments: [] }, sha: undefined };
  // Si el archivo no se puede leer se para todo: seguir con una lista vacía
  // haría que la siguiente cita sobrescribiera todas las anteriores.
  const data = JSON.parse(file.content.toString('utf8'));
  if (!Array.isArray(data.appointments)) data.appointments = [];
  return { data, sha: file.sha };
}

// Una cita ocupa su hora salvo que esté cancelada.
function blocksSlot(appt) {
  return appt.status !== 'cancelled';
}

module.exports = {
  readSettings,
  readAppointments,
  blocksSlot,
  SITE_REPO,
  APPOINTMENTS_REPO,
  APPOINTMENTS_PATH,
  setCors,
  isAllowedOrigin,
  parseBody,
  readFile,
  writeFile
};
