// Datos de la web (site/_data/*.json) leídos al momento del repositorio.
//
// Cuando la clínica guarda algo en el panel, GitHub Pages tarda en
// reconstruir la web (de 30 s a varios minutos). La web pide sus datos aquí
// (ver site/js/live-data.js) y ve los cambios en segundos.
//
//   GET /api/site-data?path=site/_data/settings.json -> el JSON tal cual
//
// La respuesta se guarda 10 s en la CDN de Vercel para no pedir a GitHub en
// cada visita.

const { SITE_REPO, readFile } = require('./_lib');

function isPublicDataFile(path) {
  return /^site\/_data\/[a-z0-9_-]+(\/[a-z0-9_-]+)?\.json$/.test(path) && path !== 'site/_data/admin-config.json';
}

module.exports = async function handler(req, res) {
  // Datos públicos (los mismos que publica GitHub Pages): cualquier web puede
  // leerlos. Con "*" la respuesta que guarda la CDN vale para todos; con un
  // origen concreto, la CDN podía servírsela a otro origen y el navegador la rechazaba.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método no permitido' });

  const path = String((req.query && req.query.path) || '');
  if (!isPublicDataFile(path)) return res.status(400).json({ error: 'Ruta no permitida' });

  try {
    const file = await readFile(SITE_REPO, path);
    if (!file) return res.status(404).json({ error: 'No encontrado' });
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=10, stale-while-revalidate=60');
    return res.status(200).send(file.content.toString('utf8'));
  } catch (err) {
    console.error('site-data:', err.message);
    return res.status(502).json({ error: 'No se pudieron leer los datos' });
  }
};
