// Devuelve las horas ya ocupadas de un día, para que el calendario de citas
// no las ofrezca. Solo devuelve horas: nunca datos de los clientes.
//   POST { date: 'YYYY-MM-DD' } -> { taken: ['10:00', '10:30', ...] }

const { setCors, isAllowedOrigin, parseBody, readAppointments, blocksSlot } = require('./_lib');

module.exports = async function handler(req, res) {
  setCors(req, res);

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });
  if (!isAllowedOrigin(req)) return res.status(403).json({ error: 'Origen no permitido' });
  if (!process.env.GITHUB_TOKEN) return res.status(500).json({ error: 'Servidor sin configurar' });

  const body = parseBody(req);
  const date = body && String(body.date || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: 'Fecha no válida' });

  try {
    const { data } = await readAppointments();
    const taken = data.appointments
      .filter(function (a) { return a.date === date && blocksSlot(a); })
      .map(function (a) { return a.time; });
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ taken: Array.from(new Set(taken)).sort() });
  } catch (err) {
    console.error('availability:', err.message);
    return res.status(500).json({ error: 'No se pudo consultar la disponibilidad' });
  }
};
