// Creación de citas: la usan el formulario de la web (book-appointment),
// el chat de la web y WhatsApp (vetbot), para que todas las citas pasen por
// las mismas comprobaciones y acaben en el mismo calendario.

const {
  APPOINTMENTS_REPO, APPOINTMENTS_PATH,
  writeFile, readSettings, readAppointments, blocksSlot
} = require('./_lib');
const ClinicSchedule = require('../site/js/schedule.js');

const MAX_LEN = { service: 100, patientName: 100, patientPhone: 30, patientEmail: 120, message: 1000, petName: 60, petType: 40 };
const SOURCES = ['web', 'chat', 'whatsapp'];

function clean(value, max) {
  return String(value == null ? '' : value).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
}

function isEmail(text) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text);
}

// El formulario de la web pide email; por chat o WhatsApp basta el teléfono.
function validate(body) {
  const source = SOURCES.indexOf(body.source) !== -1 ? body.source : 'web';
  const appt = {
    service: clean(body.service, MAX_LEN.service),
    date: clean(body.date, 10),
    time: clean(body.time, 5),
    patientName: clean(body.patientName, MAX_LEN.patientName),
    patientPhone: clean(body.patientPhone, MAX_LEN.patientPhone),
    patientEmail: clean(body.patientEmail, MAX_LEN.patientEmail),
    message: clean(body.message, MAX_LEN.message),
    source: source
  };
  const petName = clean(body.petName, MAX_LEN.petName);
  const petType = clean(body.petType, MAX_LEN.petType);
  if (petName) appt.petName = petName;
  if (petType) appt.petType = petType;

  if (!appt.service || !appt.patientName || !appt.patientPhone) return { error: 'Faltan campos obligatorios' };
  if (source === 'web' && !appt.patientEmail) return { error: 'Faltan campos obligatorios' };
  if (appt.patientPhone.replace(/\D/g, '').length < 9) return { error: 'Teléfono no válido' };
  if (appt.patientEmail && !isEmail(appt.patientEmail)) return { error: 'Email no válido' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(appt.date) || isNaN(new Date(appt.date + 'T00:00:00'))) return { error: 'Fecha no válida' };
  if (!/^\d{2}:\d{2}$/.test(appt.time)) return { error: 'Hora no válida' };
  return { appt };
}

async function saveAppointment(appt) {
  // Si dos personas reservan a la vez, GitHub rechaza la segunda escritura
  // (409/422); en ese caso se vuelve a leer el archivo y se reintenta.
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, sha } = await readAppointments();

    const taken = data.appointments.some(function (a) {
      return a.date === appt.date && a.time === appt.time && blocksSlot(a);
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

// Crea una cita. Devuelve { ok, appt } o { status, error } con el código HTTP adecuado.
async function createAppointment(body, settings) {
  const result = validate(body);
  if (result.error) return { status: 400, error: result.error };

  // La hora tiene que estar dentro del horario puesto en el panel, no haber
  // pasado y no estar demasiado lejos.
  try {
    if (!settings) settings = await readSettings();
  } catch (err) {
    console.error('booking settings:', err.message);
    return { status: 500, error: 'No se pudo comprobar el horario' };
  }
  if (!ClinicSchedule.isValidSlot(result.appt.date, result.appt.time, settings)) {
    return { status: 400, error: 'Esa fecha u hora no está disponible. Por favor, elige otra en el calendario.' };
  }

  // id, estado y fecha de creación los pone el servidor, no el navegador.
  const appt = Object.assign({ id: Date.now() }, result.appt, {
    status: 'pending',
    createdAt: new Date().toISOString()
  });

  try {
    const saved = await saveAppointment(appt);
    if (saved.conflict) return { status: 409, error: 'Esa hora ya está reservada' };
  } catch (err) {
    console.error('booking:', err.message);
    return { status: 500, error: 'No se pudo guardar la cita' };
  }
  return { ok: true, appt };
}

// Horas ya ocupadas de un día.
async function takenSlots(date) {
  const { data } = await readAppointments();
  return data.appointments
    .filter(function (a) { return a.date === date && blocksSlot(a); })
    .map(function (a) { return a.time; });
}

module.exports = { createAppointment, takenSlots, isEmail };
