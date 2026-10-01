// Envío de emails (aviso a la clínica y emails al cliente) con Resend,
// desde el dominio de Patrimonio360. El remitente muestra el nombre de la
// clínica y las respuestas van al email de la clínica (Ajustes del panel).
// Variables de entorno:
//   RESEND_API_KEY  clave de la API de Resend
//   MAIL_FROM       dirección remitente verificada en Resend
//                   (por defecto citas@patrimonio360.com)

const { SITE_REPO, readFile } = require('./_lib');

const MAIL_FROM = process.env.MAIL_FROM || 'citas@patrimonio360.com';

const DEFAULT_CLINIC = {
  name: 'Clínica Veterinaria San José',
  phone: '955 321 470',
  email: 'sanjose.clinicaveterinaria@gmail.com',
  address: ''
};

function mailConfigured() {
  return Boolean(process.env.RESEND_API_KEY);
}

async function clinicSettings() {
  try {
    const file = await readFile(SITE_REPO, 'site/_data/settings.json');
    const s = file ? JSON.parse(file.content.toString('utf8')) : {};
    return {
      name: s.name || DEFAULT_CLINIC.name,
      phone: s.phone || DEFAULT_CLINIC.phone,
      email: s.email || DEFAULT_CLINIC.email,
      address: s.address || DEFAULT_CLINIC.address
    };
  } catch (e) {
    return DEFAULT_CLINIC;
  }
}

function longDate(isoDate) {
  return new Date(isoDate + 'T00:00:00').toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Madrid'
  });
}

function details(appt) {
  return '  Servicio: ' + appt.service + '\n'
    + '  Fecha: ' + longDate(appt.date) + '\n'
    + '  Hora: ' + appt.time + '\n';
}

function footer(clinic) {
  return '\nSi tienes cualquier duda, puedes contactarnos:\n'
    + '  Tel: ' + clinic.phone + '\n'
    + '  Email: ' + clinic.email + '\n'
    + (clinic.address ? '  Dirección: ' + clinic.address + '\n' : '')
    + '\nUn saludo,\n' + clinic.name;
}

const TEMPLATES = {
  received: function (appt, clinic) {
    return {
      subject: 'Hemos recibido tu solicitud de cita — ' + clinic.name,
      text: 'Hola ' + appt.patientName + ',\n\n'
        + 'Hemos recibido tu solicitud de cita. Todavía no está confirmada: '
        + 'la clínica la revisará y te enviaremos otro email en cuanto quede confirmada.\n\n'
        + 'Datos de tu solicitud:\n' + details(appt)
        + footer(clinic)
    };
  },
  confirmed: function (appt, clinic) {
    return {
      subject: 'Tu cita está confirmada — ' + clinic.name,
      text: 'Hola ' + appt.patientName + ',\n\n'
        + '¡Tu cita está confirmada! Te esperamos.\n\n'
        + 'Detalles de tu cita:\n' + details(appt)
        + '\nSi no puedes venir, por favor avísanos con antelación.\n'
        + footer(clinic)
    };
  },
  cancelled: function (appt, clinic) {
    return {
      subject: 'Tu cita ha sido cancelada — ' + clinic.name,
      text: 'Hola ' + appt.patientName + ',\n\n'
        + 'Lamentamos informarte de que tu cita ha sido cancelada.\n\n'
        + 'Cita cancelada:\n' + details(appt)
        + '\nPuedes llamarnos para buscar otra fecha o reservar de nuevo en nuestra web.\n'
        + footer(clinic)
    };
  }
};

function clinicNotification(appt) {
  return {
    subject: 'Nueva cita solicitada — ' + appt.patientName,
    text: 'Nueva solicitud de cita desde la web:\n\n'
      + '  Cliente: ' + appt.patientName + '\n'
      + '  Teléfono: ' + appt.patientPhone + '\n'
      + '  Email: ' + appt.patientEmail + '\n'
      + details(appt)
      + (appt.message ? '  Mensaje: ' + appt.message + '\n' : '')
      + '\nLa cita aparece como Pendiente en el panel de administración. '
      + 'Al confirmarla o cancelarla allí, el cliente recibe un email automáticamente.\n'
      + 'Puedes responder a este email para escribir directamente al cliente.'
  };
}

async function send(clinic, to, replyTo, message) {
  if (!mailConfigured()) throw new Error('Email no configurado');
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + process.env.RESEND_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: clinic.name.replace(/["<>]/g, '') + ' <' + MAIL_FROM + '>',
      reply_to: replyTo,
      to: [to],
      subject: message.subject,
      text: message.text
    })
  });
  if (!res.ok) throw new Error('Resend ' + res.status + ': ' + (await res.text()).slice(0, 200));
}

// type: 'received' | 'confirmed' | 'cancelled'
async function sendPatientEmail(type, appt) {
  const clinic = await clinicSettings();
  await send(clinic, appt.patientEmail, clinic.email, TEMPLATES[type](appt, clinic));
}

// Aviso a la clínica, al email configurado en Ajustes del panel.
async function sendClinicEmail(appt) {
  const clinic = await clinicSettings();
  await send(clinic, clinic.email, appt.patientEmail, clinicNotification(appt));
}

module.exports = { mailConfigured, sendPatientEmail, sendClinicEmail };
