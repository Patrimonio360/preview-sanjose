// Cerebro de VetBot: decide qué responder a cada mensaje, igual para el chat
// de la web y para WhatsApp (VetBot Pro).
//
// - Pedir cita es una conversación guiada que NO usa IA (los modelos
//   gratuitos tienen un cupo diario pequeño): servicio → día → hora libre →
//   nombre → mascota → motivo → teléfono/email → confirmación. Solo ofrece
//   días y horas libres de verdad según el horario del panel y el calendario.
// - Las preguntas libres las responde la IA con los datos de la clínica; si
//   la IA no está disponible, se usan las respuestas del panel (VetBot).
//
// El estado de la conversación viaja con cada mensaje (lo guarda el chat de
// la web o VetBot Pro), así el servidor no tiene que recordar nada.

const ClinicSchedule = require('../site/js/schedule.js');

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const WEEKDAYS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
const SHORT_DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const SHORT_MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const BOOKING_INTENT = /\b(cita|citas|reserv\w*|agend\w*|turno|pedir hora|coger hora|hora para|consulta para|quiero (ir|llevar|traer)|llevar a mi|traer a mi|pasar consulta)\b/;
const CANCEL_WORDS = /^(cancelar|cancela|salir|sal|olvidalo|dejalo|no quiero|para|stop)\b/;
const NO_WORDS = /^(no|nada|ninguno|ninguna|sin email|no tengo|paso|-)\b/;
const YES_WORDS = /^(si|sí|vale|ok|okay|correcto|confirmo|confirmar|adelante|perfecto|de acuerdo|claro|solicitar)\b/;

// Minúsculas y sin tildes, para comparar textos escritos de cualquier forma.
function norm(text) {
  return String(text || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
}

function pad(n) { return (n < 10 ? '0' : '') + n; }

function dayOfWeek(dateStr) {
  const p = dateStr.split('-');
  return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])).getUTCDay();
}

function shortDate(dateStr) {
  const p = dateStr.split('-');
  return SHORT_DAYS[dayOfWeek(dateStr)] + ' ' + (+p[2]) + ' ' + SHORT_MONTHS[+p[1] - 1];
}

function longDate(dateStr) {
  const p = dateStr.split('-');
  const name = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'][dayOfWeek(dateStr)];
  return name + ' ' + (+p[2]) + ' de ' + MONTHS[+p[1] - 1];
}

// Próximos días en los que se puede reservar.
function nextBookableDays(settings, count, now) {
  const today = ClinicSchedule.madridNow(now).date;
  const out = [];
  for (let i = 0; i <= ClinicSchedule.MAX_DAYS_AHEAD && out.length < count; i++) {
    const d = ClinicSchedule.addDays(today, i);
    if (ClinicSchedule.isBookableDay(d, settings, now)) out.push(d);
  }
  return out;
}

// Interpreta una fecha escrita: "mañana", "el lunes", "12/10", "12 de octubre", "día 12"…
function parseDate(text, settings, now) {
  const t = norm(text).replace(/^(el|para el|para|dia|el dia)\s+/, '');
  const today = ClinicSchedule.madridNow(now).date;
  const year = +today.slice(0, 4), month = +today.slice(5, 7), day = +today.slice(8, 10);

  if (/^hoy\b/.test(t)) return today;
  if (/^pasado manana\b/.test(t)) return ClinicSchedule.addDays(today, 2);
  if (/^manana\b/.test(t)) return ClinicSchedule.addDays(today, 1);

  const wd = WEEKDAYS.findIndex(function (w) { return new RegExp('\\b' + w + '\\b').test(t); });
  if (wd !== -1) {
    const nextWeek = /que viene|proxim|siguiente/.test(t);
    for (let i = 0; i < 14; i++) {
      const d = ClinicSchedule.addDays(today, i);
      if (dayOfWeek(d) === wd && (!nextWeek || i > 0)) return d;
    }
  }

  let m = /\b(\d{1,2})\s*[\/\-.]\s*(\d{1,2})(?:\s*[\/\-.]\s*(\d{2,4}))?\b/.exec(t);
  if (m) {
    let y = m[3] ? +m[3] : year;
    if (y < 100) y += 2000;
    if (!m[3] && (+m[2] < month || (+m[2] === month && +m[1] < day))) y++;
    return validDate(y, +m[2], +m[1]);
  }

  m = new RegExp('\\b(\\d{1,2})\\s*(?:de\\s+)?(' + MONTHS.join('|') + ')\\b').exec(t);
  if (m) {
    const mo = MONTHS.indexOf(m[2]) + 1;
    let y = year;
    if (mo < month || (mo === month && +m[1] < day)) y++;
    return validDate(y, mo, +m[1]);
  }

  m = /^(\d{1,2})$/.exec(t);
  if (m && +m[1] >= 1 && +m[1] <= 31) {
    let y = year, mo = month;
    if (+m[1] < day) { mo++; if (mo > 12) { mo = 1; y++; } }
    return validDate(y, mo, +m[1]);
  }
  return null;
}

function validDate(y, m, d) {
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  return y + '-' + pad(m) + '-' + pad(d);
}

// Interpreta una hora: "10", "10:30", "a las 5" (tarde), "5 y media", "la primera"…
function parseTime(text, free) {
  const t = norm(text).replace(/^(a las|a la|las|la)\s+/, '');
  if (/^(la )?primer/.test(t) && free.length) return free[0];
  if (/^(la )?ultim/.test(t) && free.length) return free[free.length - 1];
  const m = /^(\d{1,2})(?:\s*(?::|\.|h)\s*(\d{2})|\s+y\s+(media|cuarto))?\b/.exec(t);
  if (!m) return null;
  let h = +m[1];
  const mi = m[2] ? +m[2] : m[3] === 'media' ? 30 : m[3] === 'cuarto' ? 15 : 0;
  const candidates = [pad(h) + ':' + pad(mi)];
  if (h < 12) candidates.push(pad(h + 12) + ':' + pad(mi)); // "a las 5" = 17:00
  return candidates.filter(function (c) { return free.indexOf(c) !== -1; })[0] || candidates[0];
}

// Elige una opción por número ("2") o por texto parecido.
function pickOption(text, options) {
  const t = norm(text);
  const n = /^(\d{1,2})[.)]?$/.exec(t);
  if (n && +n[1] >= 1 && +n[1] <= options.length) return options[+n[1] - 1];
  return options.filter(function (o) { return norm(o) === t; })[0]
    || options.filter(function (o) { return t.length >= 3 && norm(o).indexOf(t) !== -1; })[0]
    || options.filter(function (o) { return norm(o).length >= 4 && t.indexOf(norm(o)) !== -1; })[0]
    || null;
}

function numbered(options) {
  return options.map(function (o, i) { return (i + 1) + '. ' + o; }).join('\n');
}

// ===== Conversación guiada para pedir cita =====

function startBooking(ctx, intro) {
  const services = ctx.services.map(function (s) { return s.name; }).concat(['Otro motivo']);
  return {
    reply: (intro ? intro + '\n\n' : '') + '¡Claro! Te ayudo a pedir cita 🐾 ¿Para qué servicio es?\n' + numbered(services)
      + '\n\n(Puedes escribir "cancelar" en cualquier momento.)',
    options: services,
    state: { mode: 'booking', step: 'service', data: {}, offered: services }
  };
}

function askDate(ctx, state, prefix) {
  const days = nextBookableDays(ctx.settings, 6, ctx.now);
  if (!days.length) {
    return { reply: 'Lo siento, ahora mismo no hay días disponibles para reservar online. Llámanos al ' + ctx.clinic.phone + ' y te buscamos hueco.', state: null };
  }
  const labels = days.map(shortDate);
  state.step = 'date';
  state.offered = days;
  return {
    reply: (prefix ? prefix + '\n\n' : '') + '¿Qué día te viene bien? Estos son los próximos con hueco:\n' + numbered(labels)
      + '\n\nTambién puedes escribir otro día (por ejemplo "el jueves" o "15 de octubre").',
    options: labels,
    state
  };
}

async function askTime(ctx, state, prefix) {
  const date = state.data.date;
  const taken = await ctx.takenSlots(date);
  const free = ClinicSchedule.slotsFor(date, ctx.settings, ctx.now).filter(function (s) { return taken.indexOf(s) === -1; });
  if (!free.length) {
    state.data.date = null;
    return askDate(ctx, state, 'El ' + longDate(date) + ' ya no quedan horas libres. Elige otro día, por favor.');
  }
  state.step = 'time';
  state.offered = free;
  const morning = free.filter(function (s) { return s < '14:00'; });
  const afternoon = free.filter(function (s) { return s >= '14:00'; });
  let list = '';
  if (morning.length) list += '🌤️ Mañana: ' + morning.join(', ') + '\n';
  if (afternoon.length) list += '🌙 Tarde: ' + afternoon.join(', ') + '\n';
  return {
    reply: (prefix ? prefix + '\n\n' : '') + 'Horas libres el ' + longDate(date) + ':\n' + list + '\n¿Cuál prefieres?',
    options: free,
    state
  };
}

function summary(d) {
  return '📋 Servicio: ' + d.service
    + '\n📅 Día: ' + longDate(d.date) + ' a las ' + d.time
    + '\n👤 A nombre de: ' + d.name
    + (d.pet ? '\n🐾 Mascota: ' + d.pet : '')
    + (d.reason ? '\n📝 Motivo: ' + d.reason : '')
    + '\n📞 Teléfono: ' + d.phone
    + (d.email ? '\n✉️ Email: ' + d.email : '');
}

// Paso siguiente que falta por rellenar.
async function nextStep(ctx, state, prefix) {
  const d = state.data;
  if (!d.service) return startBooking(ctx, prefix);
  if (!d.date) return askDate(ctx, state, prefix);
  if (!d.time) return askTime(ctx, state, prefix);
  const ask = function (step, question, options) {
    state.step = step;
    state.offered = options || [];
    return { reply: (prefix ? prefix + '\n\n' : '') + question, options: options, state };
  };
  if (!d.name) return ask('name', '¿A nombre de quién pongo la cita?');
  if (d.pet === undefined) return ask('pet', '¿Cómo se llama tu mascota y qué animal es? (por ejemplo: "Toby, perro")');
  if (d.reason === undefined) return ask('reason', 'Cuéntame brevemente el motivo de la visita (o escribe "no").', ['No']);
  if (!d.phone) return ask('phone', '¿Un teléfono de contacto para confirmarte la cita?');
  if (d.email === undefined && ctx.channel !== 'whatsapp') return ask('email', '¿Y un email? (opcional, escribe "no" si prefieres solo teléfono)', ['No']);
  return ask('confirm', 'Revisa los datos de tu cita:\n\n' + summary(d) + '\n\n¿La solicito?', ['Sí, solicitar', 'Cambiar algo', 'Cancelar']);
}

async function continueBooking(ctx, state, text) {
  const t = norm(text);
  const d = state.data;
  if (CANCEL_WORDS.test(t)) {
    return { reply: 'Sin problema, he cancelado la solicitud. Si necesitas algo más, aquí estoy. 😊', state: null };
  }

  switch (state.step) {
    case 'service': {
      const picked = pickOption(text, state.offered || []);
      if (picked && picked !== 'Otro motivo') d.service = picked;
      else if (picked === 'Otro motivo' || t.length >= 3) d.service = 'Consulta general';
      if (!picked && t.length >= 3) d.reason = text.trim();
      if (!d.service) return { reply: 'Elige un servicio de la lista escribiendo su número, por favor.', options: state.offered, state };
      return nextStep(ctx, state);
    }
    case 'date': {
      const offered = state.offered || [];
      const n = /^(\d{1,2})[.)]?$/.exec(t);
      let date = n && +n[1] >= 1 && +n[1] <= offered.length ? offered[+n[1] - 1] : null;
      if (!date) {
        const byLabel = pickOption(text, offered.map(shortDate));
        date = byLabel ? offered[offered.map(shortDate).indexOf(byLabel)] : parseDate(text, ctx.settings, ctx.now);
      }
      if (!date) return askDate(ctx, state, 'No he entendido el día.');
      if (!ClinicSchedule.isBookableDay(date, ctx.settings, ctx.now)) {
        return askDate(ctx, state, 'El ' + longDate(date) + ' no podemos darte cita online (la clínica está cerrada, ya ha pasado o está demasiado lejos).');
      }
      d.date = date;
      d.time = null;
      return askTime(ctx, state);
    }
    case 'time': {
      const free = state.offered || [];
      const n = /^(\d{1,2})[.)]$/.exec(t);
      let time = n && +n[1] <= free.length ? free[+n[1] - 1] : parseTime(text, free);
      if (!time || free.indexOf(time) === -1) {
        const near = time ? free.filter(function (s) { return s.slice(0, 2) === time.slice(0, 2); }) : [];
        return { reply: (time ? 'A las ' + time + ' no hay hueco. ' : 'No he entendido la hora. ') + (near.length ? 'Cerca tienes: ' + near.join(', ') + '. ' : '') + 'Elige una de las horas libres, por favor.', options: free, state };
      }
      d.time = time;
      return nextStep(ctx, state, 'Perfecto, ' + longDate(d.date) + ' a las ' + time + '. ✅');
    }
    case 'name':
      if (t.length < 2) return { reply: '¿Me dices tu nombre, por favor?', state };
      d.name = text.trim().slice(0, 100);
      return nextStep(ctx, state);
    case 'pet': {
      d.pet = NO_WORDS.test(t) ? '' : text.trim().slice(0, 100);
      return nextStep(ctx, state);
    }
    case 'reason':
      d.reason = NO_WORDS.test(t) ? (d.reason || '') : text.trim().slice(0, 500);
      return nextStep(ctx, state);
    case 'phone': {
      const digits = text.replace(/\D/g, '');
      if (digits.length < 9) return { reply: 'Ese teléfono no parece completo. ¿Me lo escribes con sus 9 cifras?', state };
      d.phone = text.trim().slice(0, 30);
      return nextStep(ctx, state);
    }
    case 'email': {
      if (NO_WORDS.test(t)) { d.email = ''; return nextStep(ctx, state); }
      const email = text.trim().split(/\s+/).filter(function (w) { return w.indexOf('@') !== -1; })[0] || '';
      if (!ctx.isEmail(email)) return { reply: 'Ese email no parece correcto. Escríbelo de nuevo o pon "no".', options: ['No'], state };
      d.email = email.slice(0, 120);
      return nextStep(ctx, state);
    }
    case 'confirm': {
      if (/^(cambiar|cambia|modificar|corregir)/.test(t)) {
        state.step = 'change';
        const fields = ['Servicio', 'Día y hora', 'Nombre', 'Mascota', 'Motivo', 'Teléfono'].concat(ctx.channel !== 'whatsapp' ? ['Email'] : []);
        state.offered = fields;
        return { reply: '¿Qué quieres cambiar?\n' + numbered(fields), options: fields, state };
      }
      if (!YES_WORDS.test(t)) return { reply: '¿Solicito la cita? Responde "sí", "cambiar algo" o "cancelar".', options: ['Sí, solicitar', 'Cambiar algo', 'Cancelar'], state };
      return book(ctx, state);
    }
    case 'change': {
      const field = pickOption(text, state.offered || []);
      const reset = { 'Servicio': ['service'], 'Día y hora': ['date', 'time'], 'Nombre': ['name'], 'Mascota': ['pet'], 'Motivo': ['reason'], 'Teléfono': ['phone'], 'Email': ['email'] }[field];
      if (!reset) return { reply: 'Elige qué quieres cambiar escribiendo su número.', options: state.offered, state };
      reset.forEach(function (k) { if (k === 'pet' || k === 'reason' || k === 'email') delete d[k]; else d[k] = null; });
      if (field === 'Servicio') return startBooking(ctx);
      return nextStep(ctx, state);
    }
  }
  return nextStep(ctx, state);
}

const ANIMALS = /^(perro|perra|perrito|perrita|cachorro|cachorra|gato|gata|gatito|gatita|conejo|coneja|huron|hurona|cobaya|hamster|loro|periquito|pajaro|ave|canario|tortuga|reptil|serpiente|iguana|caballo|cerdo|chinchilla|raton|rata|erizo)$/;

// "Toby, perro" / "Toby perro" / "Toby" -> [nombre, animal]
function splitPet(text) {
  const parts = String(text || '').split(/,| y | - | \(/).map(function (p) { return p.replace(/\)$/, '').trim(); }).filter(Boolean);
  if (parts.length > 1) return [parts[0], parts[1]];
  const words = String(text || '').trim().split(/\s+/);
  if (words.length > 1 && ANIMALS.test(norm(words[words.length - 1]))) return [words.slice(0, -1).join(' '), words[words.length - 1]];
  if (words.length > 1 && ANIMALS.test(norm(words[0]))) return [words.slice(1).join(' '), words[0]];
  return [String(text || '').trim(), ''];
}

async function book(ctx, state) {
  const d = state.data;
  const petParts = splitPet(d.pet);
  const result = await ctx.createAppointment({
    service: d.service,
    date: d.date,
    time: d.time,
    patientName: d.name,
    patientPhone: d.phone,
    patientEmail: d.email || '',
    petName: petParts[0] ? petParts[0].trim() : '',
    petType: petParts[1] ? petParts[1].trim() : '',
    message: d.reason || '',
    source: ctx.channel === 'whatsapp' ? 'whatsapp' : 'chat'
  });
  if (result.ok) {
    const via = ctx.channel === 'whatsapp' ? 'por aquí, por WhatsApp' : (d.email ? 'por email o WhatsApp' : 'por WhatsApp o teléfono');
    return {
      reply: '¡Listo! 🎉 Tu solicitud de cita está registrada y queda *pendiente de revisión*.\n\n' + summary(d)
        + '\n\nLa clínica la revisará y te confirmará ' + via + ' lo antes posible. Si esa hora no fuera posible, te propondremos otra.',
      state: null,
      booked: {
        id: result.appt.id, date: d.date, time: d.time, service: d.service, patientName: d.name,
        petName: petParts[0] || '', petType: petParts[1] || '', message: d.reason || ''
      }
    };
  }
  if (result.status === 409 || result.status === 400) {
    d.time = null;
    return askTime(ctx, state, 'Vaya, esa hora se acaba de ocupar. 😕');
  }
  return { reply: 'Lo siento, no he podido registrar la cita por un problema técnico. Inténtalo en unos minutos o llámanos al ' + ctx.clinic.phone + '.', state };
}

// ===== Preguntas libres =====

function faqAnswer(ctx, text) {
  const t = norm(text);
  const responses = (ctx.faq && ctx.faq.responses) || [];
  for (const r of responses) {
    const keywords = String(r.keywords || '').split(',').map(norm).filter(Boolean);
    if (keywords.some(function (k) { return new RegExp('(^|\\W)' + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(\\W|$)').test(t); })) {
      return fillPlaceholders(ctx, r.response);
    }
  }
  return null;
}

function hoursText(ctx) {
  return ClinicSchedule.groups(ctx.settings).map(function (g) { return g.days + ': ' + (g.closed ? 'cerrado' : g.hours); }).join('; ');
}

function fillPlaceholders(ctx, text) {
  return String(text)
    .replace(/\{horario\}/g, hoursText(ctx))
    .replace(/\{estado\}/g, ClinicSchedule.status(ctx.settings, ctx.now).text)
    .replace(/\{telefono\}/g, ctx.clinic.phone);
}

function systemPrompt(ctx) {
  const s = ctx.settings;
  const services = ctx.services.map(function (x) { return '- ' + x.name + (x.shortDesc ? ': ' + x.shortDesc : ''); }).join('\n');
  const faq = ((ctx.faq && ctx.faq.responses) || []).map(function (r) { return '- ' + fillPlaceholders(ctx, r.response); }).join('\n');
  return 'Eres VetBot, el asistente virtual de ' + ctx.clinic.name + ', una clínica veterinaria. '
    + (ctx.channel === 'whatsapp' ? 'Respondes por WhatsApp.' : 'Respondes en el chat de la web.')
    + '\n\nDATOS DE LA CLÍNICA\n'
    + 'Nombre: ' + ctx.clinic.name + '\n'
    + (s.address ? 'Dirección: ' + s.address + '\n' : '')
    + 'Teléfono: ' + ctx.clinic.phone + '\n'
    + (s.email ? 'Email: ' + s.email + '\n' : '')
    + 'Horario: ' + hoursText(ctx) + '\n'
    + 'Ahora mismo: ' + ClinicSchedule.status(s, ctx.now).text + ' (hoy es ' + longDate(ClinicSchedule.madridNow(ctx.now).date) + ')\n'
    + 'Servicios:\n' + services + '\n'
    + (faq ? '\nINFORMACIÓN ADICIONAL DE LA CLÍNICA\n' + faq + '\n' : '')
    + '\nREGLAS\n'
    + '- Responde en español, breve (máximo 4-5 frases), amable y profesional. Usa emojis con moderación.\n'
    + '- NUNCA des precios. Si preguntan, di que el precio depende de cada caso y que lo consulten con la clínica al ' + ctx.clinic.phone + '.\n'
    + '- NUNCA inventes diagnósticos, medicamentos, dosis ni tratamientos. Ante síntomas, recomienda una consulta con el veterinario.\n'
    + '- Para vacunas, di que el veterinario valorará el protocolo adecuado para cada mascota.\n'
    + '- Urgencias: la clínica no atiende urgencias fuera de su horario. Si la mascota está grave y la clínica está cerrada, recomienda acudir a una clínica de urgencias 24 horas cercana.\n'
    + '- No inventes datos de la clínica que no estén arriba.\n'
    + '- Si hace una PREGUNTA (sobre servicios, animales que atendéis, vacunas, horarios…), respóndela; puedes terminar ofreciendo pedir cita escribiendo "cita". En ese caso NO uses la etiqueta [RESERVAR].\n'
    + '- Usa la etiqueta [RESERVAR] SOLO si la persona pide claramente una cita o que vean a su mascota (por ejemplo "quiero que vean a mi perro", "¿me dais hora?"). Entonces NO preguntes fecha ni datos: responde una frase corta y termina con la etiqueta exacta [RESERVAR] para abrir el asistente de citas.';
}

// Preguntas básicas que se responden con los datos del panel, sin gastar IA.
function basicAnswer(ctx, text) {
  const t = norm(text);
  const s = ctx.settings;
  if (/^(hola|buenas|buenos dias|buenas tardes|buenas noches|hey|holi|saludos)\b[\s!.,¡]*$/.test(t)) {
    return '¡Hola! 👋 Soy VetBot, el asistente de ' + ctx.clinic.name + '. Puedo ayudarte a pedir cita o resolver dudas sobre la clínica (horario, dirección, servicios…). ¿Qué necesitas?'
      + (ctx.channel === 'whatsapp' ? '\n\nSi quieres cita, escribe "cita".' : '');
  }
  if (/^(gracias|muchas gracias|vale gracias|ok gracias|genial|perfecto)\b[\s!.,]*$/.test(t)) {
    return '¡A ti! 😊 Si necesitas algo más, aquí estoy.';
  }
  if (/\b(donde|direccion|ubicacion|ubicados|como llego|como llegar|mapa)\b/.test(t) && s.address) {
    return '📍 Estamos en ' + s.address + '.\nCómo llegar: https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(ctx.clinic.name + ' ' + s.address);
  }
  if (/\b(telefono|llamar|llamaros|numero de contacto|whatsapp)\b/.test(t) && ctx.clinic.phone) {
    return '📞 Puedes llamarnos al ' + ctx.clinic.phone + (s.email ? ' o escribirnos a ' + s.email : '') + '.\nNuestro horario: ' + hoursText(ctx) + '.';
  }
  if (/\b(horario|abiert|abris|abren|abrir|cerrais|cierran|cerrad|a que hora)/.test(t)) {
    return '🕒 Nuestro horario: ' + hoursText(ctx) + '.\n' + ClinicSchedule.status(s, ctx.now).text + '.';
  }
  return null;
}

async function freeAnswer(ctx, text, history) {
  const faq = faqAnswer(ctx, text) || basicAnswer(ctx, text);
  if (faq) return { reply: faq, state: null, via: 'faq' };

  const messages = [{ role: 'system', content: systemPrompt(ctx) }]
    .concat((history || []).slice(-8).map(function (m) {
      return { role: m.role === 'user' ? 'user' : 'assistant', content: String(m.text || '').slice(0, 1000) };
    }))
    .concat([{ role: 'user', content: text.slice(0, 1000) }]);

  const ai = await ctx.ai(messages);
  if (!ai) {
    return {
      reply: 'Ahora mismo no puedo responder a esa pregunta. 🙏 Puedes llamarnos al ' + ctx.clinic.phone
        + ' o, si quieres, te ayudo a pedir cita: escribe "cita".',
      options: ['Pedir cita'],
      state: null,
      via: 'fallback'
    };
  }
  if (/\[RESERVAR\]/i.test(ai)) {
    // La frase de la IA sobra: el asistente de citas ya saluda.
    const r = startBooking(ctx);
    if (ctx.channel === 'whatsapp' && ctx.phone) r.state.data.phone = ctx.phone;
    return Object.assign(r, { via: 'ai' });
  }
  return { reply: ai.trim(), state: null, via: 'ai' };
}

// ===== Entrada principal =====

// ctx: { channel, settings, services, faq, clinic: {name, phone}, now,
//        takenSlots(date), createAppointment(body), ai(messages), isEmail(text) }
async function handleMessage(ctx, text, state, history) {
  text = String(text || '').trim().slice(0, 1000);
  if (!text) return { reply: '¿En qué puedo ayudarte?', state: state || null };

  if (state && state.mode === 'booking') {
    // En WhatsApp el teléfono ya se conoce.
    if (ctx.channel === 'whatsapp' && ctx.phone && !state.data.phone) state.data.phone = ctx.phone;
    return continueBooking(ctx, state, text);
  }
  if (BOOKING_INTENT.test(norm(text))) {
    const r = startBooking(ctx);
    if (ctx.channel === 'whatsapp' && ctx.phone) r.state.data.phone = ctx.phone;
    return r;
  }
  return freeAnswer(ctx, text, history);
}

module.exports = { handleMessage, parseDate, parseTime, norm };
