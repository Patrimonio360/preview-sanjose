// VetBot: un solo cerebro para el chat de la web y para WhatsApp (VetBot Pro).
//
// POST {
//   channel: 'web' | 'whatsapp',
//   message: 'texto del cliente',
//   state:   estado devuelto en la respuesta anterior (o null),
//   history: [{ role: 'user'|'bot', text }]  últimos mensajes (opcional),
//   phone:   teléfono del cliente (solo WhatsApp)
// }
// -> { reply, options?, state, booked? }
//
// El chat de la web llama desde el navegador (origen permitido). VetBot Pro
// llama desde el ordenador de la clínica, sin cabecera Origin. Ninguno de los
// dos puede hacer más que un cliente en el chat: pedir citas pendientes de
// revisión, que pasan por las mismas comprobaciones.
//
// IA: modelos gratuitos de OpenRouter (variable OPENROUTER_API_KEY). Tienen un
// cupo diario pequeño, por eso pedir cita no usa IA (ver _vetbot-brain.js).

const { SITE_REPO, setCors, isAllowedOrigin, parseBody, readFile, readSettings } = require('./_lib');
const { createAppointment, takenSlots, isEmail } = require('./_booking');
const { handleMessage } = require('./_vetbot-brain');

// Primero modelos concretos que siguen bien las instrucciones; "openrouter/free"
// (modelo gratuito al azar) solo como último recurso.
const AI_MODELS = ['google/gemma-4-31b-it:free', 'nvidia/nemotron-3-super-120b-a12b:free', 'openrouter/free'];

// Algunos modelos gratuitos devuelven su razonamiento interno (en inglés) en
// lugar de la respuesta. Se quita lo que va entre <think> y se descarta la
// respuesta si sigue pareciendo razonamiento o no está en español.
function cleanAIReply(text) {
  const t = String(text || '').replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/^\s*<\/?think>\s*/gi, '').trim();
  if (!t) return null;
  if (/thinking process|analy[sz]e (the )?(user|request|input)|user (asks|is asking|wants)|\*\*(analy|draft|check|plan|step)|^(let me|here'?s|first,|the user)\b/i.test(t)) return null;
  const words = t.toLowerCase().match(/[a-záéíóúñü]+/g) || [];
  const es = words.filter(function (w) { return /^(el|la|los|las|de|que|y|en|un|una|para|con|por|tu|te|su|es|no|lo|al|del|se|si|más|puedes|clínica|veterinario)$/.test(w); }).length;
  const en = words.filter(function (w) { return /^(the|and|is|to|of|you|your|it|this|that|for|with|we|i|user|should|will)$/.test(w); }).length;
  if (en > es) return null;
  return t;
}
const AI_TIMEOUT_MS = 20000;

// Los datos de la web cambian poco: se guardan un minuto para no pedirlos a
// GitHub en cada mensaje.
let cache = { at: 0, data: null };
async function loadClinicData() {
  if (cache.data && Date.now() - cache.at < 60000) return cache.data;
  const readJson = async function (path, fallback) {
    try {
      const f = await readFile(SITE_REPO, path);
      return f ? JSON.parse(f.content.toString('utf8')) : fallback;
    } catch (e) {
      return fallback;
    }
  };
  const [settings, services, faq] = await Promise.all([
    readSettings(),
    readJson('site/_data/services.json', { services: [] }),
    readJson('site/_data/chatbot/index.json', { responses: [] })
  ]);
  cache = { at: Date.now(), data: { settings, services: services.services || [], faq } };
  return cache.data;
}

// Pregunta a la IA. Devuelve el texto o null si no hay IA disponible
// (sin clave, cupo diario agotado, caída…).
async function askAI(messages) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return null;
  for (const model of AI_MODELS) {
    const controller = new AbortController();
    const timer = setTimeout(function () { controller.abort(); }, AI_TIMEOUT_MS);
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          Authorization: 'Bearer ' + key,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://vetbot.pro',
          'X-Title': 'VetBot Pro'
        },
        body: JSON.stringify({ model: model, messages: messages, max_tokens: 400, temperature: 0.4, reasoning: { exclude: true } })
      });
      if (!res.ok) {
        console.error('vetbot ai', model, res.status, (await res.text()).slice(0, 200));
        continue;
      }
      const data = await res.json();
      const text = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
      const clean = cleanAIReply(text);
      if (clean) return clean;
      console.error('vetbot ai', model, 'respuesta descartada:', String(text || '').slice(0, 80));
    } catch (e) {
      console.error('vetbot ai', model, e.message);
    } finally {
      clearTimeout(timer);
    }
  }
  return null;
}

function cleanHistory(history) {
  if (!Array.isArray(history)) return [];
  return history.slice(-8)
    .filter(function (m) { return m && typeof m.text === 'string'; })
    .map(function (m) { return { role: m.role === 'user' ? 'user' : 'bot', text: m.text.slice(0, 1000) }; });
}

function cleanState(state) {
  if (!state || typeof state !== 'object' || state.mode !== 'booking' || typeof state.data !== 'object') return null;
  return { mode: 'booking', step: String(state.step || ''), data: state.data || {}, offered: Array.isArray(state.offered) ? state.offered.slice(0, 40) : [] };
}

module.exports = async function handler(req, res) {
  setCors(req, res);

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const fromDesktop = !req.headers.origin;
  if (!isAllowedOrigin(req) && !fromDesktop) return res.status(403).json({ error: 'Origen no permitido' });
  if (!process.env.GITHUB_TOKEN) return res.status(500).json({ error: 'Servidor sin configurar' });

  const body = parseBody(req);
  if (!body || typeof body.message !== 'string') return res.status(400).json({ error: 'Datos no válidos' });

  const channel = fromDesktop && body.channel === 'whatsapp' ? 'whatsapp' : 'web';

  try {
    const data = await loadClinicData();
    const ctx = {
      channel: channel,
      phone: channel === 'whatsapp' ? String(body.phone || '').replace(/[^\d+]/g, '').slice(0, 20) : '',
      settings: data.settings,
      services: data.services,
      faq: data.faq,
      clinic: {
        name: data.settings.name || 'la clínica',
        phone: data.settings.phone || ''
      },
      takenSlots: takenSlots,
      createAppointment: function (appt) { return createAppointment(appt, data.settings); },
      ai: askAI,
      isEmail: isEmail
    };
    const out = await handleMessage(ctx, body.message, cleanState(body.state), cleanHistory(body.history));
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({
      reply: out.reply,
      options: out.options && out.options.length <= 40 ? out.options : undefined,
      state: out.state || null,
      booked: out.booked
    });
  } catch (err) {
    console.error('vetbot:', err.message);
    return res.status(500).json({ error: 'VetBot no está disponible ahora mismo' });
  }
};
