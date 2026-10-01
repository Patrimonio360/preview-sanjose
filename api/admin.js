// Intermediario entre el panel de administración y GitHub.
// El panel solo conoce la contraseña; el token de GitHub vive en Vercel
// (GITHUB_TOKEN) y nunca llega al navegador.
//
// Variables de entorno necesarias:
//   GITHUB_TOKEN          token fine-grained con "Contents: Read and write"
//                         sobre preview-sanjose y sanjose-citas
//   ADMIN_PASSWORD_HASH   SHA-256 (hex) de la contraseña del panel
//   ADMIN_SESSION_SECRET  texto aleatorio largo para firmar las sesiones
//
// Peticiones (POST, JSON):
//   { action: 'login',  password }                      -> { token }
//   { action: 'read',   path }                          -> { data, sha }
//   { action: 'write',  path, data, sha, message }      -> { sha }
//   { action: 'upload', path, base64, message }         -> { url }
// Todas salvo 'login' necesitan la cabecera "Authorization: Bearer <token>".

const crypto = require('crypto');
const {
  SITE_REPO, APPOINTMENTS_REPO, APPOINTMENTS_PATH,
  setCors, isAllowedOrigin, parseBody, readFile, writeFile
} = require('./_lib');

const SESSION_HOURS = 12;
const MAX_UPLOAD_BASE64 = 4 * 1024 * 1024; // ~3 MB de imagen

function sha256(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest();
}

function sign(payload) {
  return crypto.createHmac('sha256', process.env.ADMIN_SESSION_SECRET).update(payload).digest('base64url');
}

function createSession() {
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + SESSION_HOURS * 3600 * 1000 })).toString('base64url');
  return payload + '.' + sign(payload);
}

function validSession(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return false;
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return false;
  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')).exp > Date.now();
  } catch (e) {
    return false;
  }
}

function checkPassword(password) {
  const expected = Buffer.from(process.env.ADMIN_PASSWORD_HASH || '', 'hex');
  const given = sha256(String(password || ''));
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}

// Qué archivos puede tocar el panel y en qué repositorio están.
function targetForData(path) {
  if (path === APPOINTMENTS_PATH) return APPOINTMENTS_REPO;
  if (/^site\/_data\/[a-z0-9_-]+(\/[a-z0-9_-]+)?\.json$/.test(path) && path !== 'site/_data/admin-config.json') {
    return SITE_REPO;
  }
  return null;
}

function isAllowedUpload(path) {
  return /^site\/img\/uploads\/[A-Za-z0-9_-][A-Za-z0-9._-]*\.(jpe?g|png|webp|gif)$/i.test(path);
}

async function handleRead(body, res) {
  const target = targetForData(body.path);
  if (!target) return res.status(400).json({ error: 'Ruta no permitida' });
  const file = await readFile(target, body.path);
  if (!file) return res.status(404).json({ error: 'No encontrado' });
  return res.status(200).json({ data: JSON.parse(file.content.toString('utf8')), sha: file.sha });
}

async function handleWrite(body, res) {
  const target = targetForData(body.path);
  if (!target) return res.status(400).json({ error: 'Ruta no permitida' });
  if (body.data === undefined) return res.status(400).json({ error: 'Faltan datos' });
  const buffer = Buffer.from(JSON.stringify(body.data, null, 2) + '\n', 'utf8');
  const result = await writeFile(target, body.path, buffer, String(body.message || 'admin: actualizar ' + body.path).slice(0, 200), body.sha);
  if (result.status === 409 || result.status === 422) {
    return res.status(409).json({ error: 'Otra persona ha cambiado estos datos. Recarga la sección y vuelve a intentarlo.' });
  }
  if (!result.ok) throw new Error('GitHub write ' + result.status);
  return res.status(200).json({ sha: result.sha });
}

async function handleUpload(body, res) {
  if (!isAllowedUpload(body.path)) return res.status(400).json({ error: 'Nombre o tipo de imagen no permitido' });
  if (typeof body.base64 !== 'string' || body.base64.length > MAX_UPLOAD_BASE64) {
    return res.status(400).json({ error: 'Imagen no válida o demasiado grande (máx. 3 MB)' });
  }
  const existing = await readFile(SITE_REPO, body.path);
  const result = await writeFile(SITE_REPO, body.path, Buffer.from(body.base64, 'base64'),
    String(body.message || 'admin: subir imagen').slice(0, 200), existing && existing.sha);
  if (!result.ok) throw new Error('GitHub upload ' + result.status);
  return res.status(200).json({
    url: 'https://raw.githubusercontent.com/' + SITE_REPO.owner + '/' + SITE_REPO.repo + '/' + SITE_REPO.branch + '/' + body.path
  });
}

module.exports = async function handler(req, res) {
  setCors(req, res, 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });
  if (!isAllowedOrigin(req)) return res.status(403).json({ error: 'Origen no permitido' });
  if (!process.env.GITHUB_TOKEN || !process.env.ADMIN_PASSWORD_HASH || !process.env.ADMIN_SESSION_SECRET) {
    return res.status(500).json({ error: 'Servidor sin configurar' });
  }

  const body = parseBody(req);
  if (!body) return res.status(400).json({ error: 'Datos no válidos' });

  try {
    if (body.action === 'login') {
      if (!checkPassword(body.password)) {
        // Pequeña espera para frenar a quien pruebe contraseñas a lo loco.
        await new Promise(function (r) { setTimeout(r, 1000); });
        return res.status(401).json({ error: 'Contraseña incorrecta' });
      }
      return res.status(200).json({ token: createSession() });
    }

    if (!validSession(req)) return res.status(401).json({ error: 'Sesión caducada' });

    if (body.action === 'read') return await handleRead(body, res);
    if (body.action === 'write') return await handleWrite(body, res);
    if (body.action === 'upload') return await handleUpload(body, res);
    return res.status(400).json({ error: 'Acción desconocida' });
  } catch (err) {
    console.error('admin:', err.message);
    return res.status(500).json({ error: 'Error al hablar con GitHub' });
  }
};
