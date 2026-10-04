// Guarda una cita pedida desde el formulario de la web (citas.html) en el
// calendario de la clínica (repositorio PRIVADO sanjose-citas). Las
// comprobaciones están en _booking.js, compartidas con el chat y WhatsApp.
// Requiere la variable de entorno GITHUB_TOKEN.

const { setCors, isAllowedOrigin, parseBody } = require('./_lib');
const { createAppointment } = require('./_booking');

module.exports = async function handler(req, res) {
  setCors(req, res);

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });
  if (!isAllowedOrigin(req)) return res.status(403).json({ error: 'Origen no permitido' });
  if (!process.env.GITHUB_TOKEN) return res.status(500).json({ error: 'Servidor sin configurar' });

  const body = parseBody(req);
  if (!body) return res.status(400).json({ error: 'Datos no válidos' });

  // Campo trampa: las personas no lo ven; si viene relleno es un robot.
  // Se responde como si todo fuera bien para no darle pistas.
  if (body.website) return res.status(200).json({ success: true });

  const result = await createAppointment(Object.assign({}, body, { source: 'web' }));
  if (!result.ok) return res.status(result.status).json({ error: result.error });
  return res.status(200).json({ success: true, id: result.appt.id });
};
