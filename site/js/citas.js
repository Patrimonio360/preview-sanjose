(function() {
  function esc(s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

  var API = 'https://preview-sanjose.vercel.app/api';
  var MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  var DAYNAMES = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];

  var settings = {};
  var selectedDate = null;   // 'YYYY-MM-DD'
  var selectedTime = null;
  var takenSlots = [];
  var slotsRequest = 0;

  var today = ClinicSchedule.madridNow().date;
  var lastDay = ClinicSchedule.addDays(today, ClinicSchedule.MAX_DAYS_AHEAD);
  var currentYear = +today.slice(0, 4);
  var currentMonth = +today.slice(5, 7) - 1;

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function ymd(y, m, d) { return y + '-' + pad(m + 1) + '-' + pad(d); }
  function monthKey(dateStr) { return dateStr.slice(0, 7); }

  function displayDate(dateStr) {
    var p = dateStr.split('-');
    return +p[2] + ' de ' + MONTHS[+p[1] - 1].toLowerCase() + ' de ' + p[0];
  }


  // Ajustes de la clínica (horario, email…) y servicios
  Promise.all([
    fetch('_data/settings.json?t=' + Date.now()).then(function(r) { return r.json(); }).catch(function() { return {}; }),
    fetch('_data/services.json?t=' + Date.now()).then(function(r) { return r.json(); }).catch(function() { return {}; })
  ]).then(function(res) {
    settings = res[0];
    // Motivos de cita de Ajustes del panel (los mismos que ofrece VetBot).
    var sel = document.getElementById('bookService');
    ClinicOptions.bookingReasons(settings, res[1].services || []).forEach(function(reason) {
      var opt = document.createElement('option');
      opt.value = reason;
      opt.textContent = reason;
      sel.appendChild(opt);
    });
    renderCalendar();
  });


  // Calendario
  function renderCalendar() {
    var grid = document.getElementById('calGrid');
    document.getElementById('calMonth').textContent = MONTHS[currentMonth] + ' ' + currentYear;

    var shown = ymd(currentYear, currentMonth, 1);
    document.getElementById('calPrev').disabled = monthKey(shown) <= monthKey(today);
    document.getElementById('calNext').disabled = monthKey(shown) >= monthKey(lastDay);

    var daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    var startDay = (new Date(currentYear, currentMonth, 1).getDay() + 6) % 7; // lunes = 0

    var html = '';
    DAYNAMES.forEach(function(d) { html += '<div class="calendar-dayname">' + d + '</div>'; });
    for (var i = 0; i < startDay; i++) html += '<div class="calendar-day empty"></div>';

    for (var d = 1; d <= daysInMonth; d++) {
      var date = ymd(currentYear, currentMonth, d);
      var cls = 'calendar-day';
      if (!ClinicSchedule.isBookableDay(date, settings)) cls += ' disabled';
      if (date === today) cls += ' today';
      if (date === selectedDate) cls += ' selected';
      html += '<div class="' + cls + '" data-date="' + date + '">' + d + '</div>';
    }
    grid.innerHTML = html;

    grid.querySelectorAll('.calendar-day:not(.disabled):not(.empty)').forEach(function(el) {
      el.addEventListener('click', function() {
        selectedDate = el.dataset.date;
        selectedTime = null;
        document.getElementById('bookDate').value = displayDate(selectedDate);
        document.getElementById('bookTime').value = '';
        renderCalendar();
        loadTakenSlots();
      });
    });
  }

  // Horas ya reservadas del día elegido (solo horas, sin datos de clientes)
  function loadTakenSlots() {
    var request = ++slotsRequest;
    takenSlots = [];
    renderTimeSlots(true);
    fetch(API + '/availability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: selectedDate })
    })
      .then(function(r) { return r.ok ? r.json() : { taken: [] }; })
      .catch(function() { return { taken: [] }; })
      .then(function(out) {
        if (request !== slotsRequest) return; // el usuario ya eligió otro día
        takenSlots = out.taken || [];
        renderTimeSlots(false);
      });
  }

  function renderTimeSlots(loading) {
    var title = document.getElementById('timeslotsTitle');
    var grid = document.getElementById('timeslotsGrid');
    if (!selectedDate) {
      title.style.display = 'none';
      grid.innerHTML = '';
      return;
    }
    title.style.display = '';
    if (loading) {
      grid.innerHTML = '<div class="timeslots-note">Consultando horas libres…</div>';
      return;
    }

    var slots = ClinicSchedule.slotsFor(selectedDate, settings);
    var free = slots.filter(function(s) { return takenSlots.indexOf(s) === -1; });
    if (!free.length) {
      grid.innerHTML = '<div class="timeslots-note">No quedan horas libres este día. Elige otra fecha.</div>';
      return;
    }
    grid.innerHTML = slots.map(function(s) {
      var cls = 'timeslot';
      if (takenSlots.indexOf(s) !== -1) cls += ' taken';
      if (s === selectedTime) cls += ' selected';
      return '<div class="' + cls + '" data-time="' + s + '">' + s + '</div>';
    }).join('');

    grid.querySelectorAll('.timeslot:not(.taken)').forEach(function(el) {
      el.addEventListener('click', function() {
        selectedTime = el.dataset.time;
        document.getElementById('bookTime').value = selectedTime;
        renderTimeSlots(false);
      });
    });
  }

  document.getElementById('calPrev').addEventListener('click', function() {
    currentMonth--;
    if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    renderCalendar();
  });
  document.getElementById('calNext').addEventListener('click', function() {
    currentMonth++;
    if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    renderCalendar();
  });


  // Envío del formulario
  document.getElementById('bookingForm').addEventListener('submit', function(e) {
    e.preventDefault();
    if (!selectedDate || !selectedTime) {
      alert('Por favor, selecciona una fecha y una hora en el calendario.');
      return;
    }

    var btn = document.getElementById('bookSubmit');
    btn.disabled = true;
    btn.textContent = 'Enviando...';

    var appointment = {
      service: document.getElementById('bookService').value,
      date: selectedDate,
      time: selectedTime,
      patientName: document.getElementById('bookName').value.trim(),
      patientPhone: document.getElementById('bookPhone').value.trim(),
      patientEmail: document.getElementById('bookEmail').value.trim(),
      message: document.getElementById('bookMessage').value.trim(),
      website: document.getElementById('bookWebsite').value // campo trampa para robots
    };

    saveAppointment(appointment).then(function(result) {
      if (result.status === 409) {
        alert('Lo sentimos, esa hora acaba de ser reservada por otra persona. Por favor, elige otra hora.');
        resetButton();
        selectedTime = null;
        document.getElementById('bookTime').value = '';
        loadTakenSlots();
        return;
      }
      if (!result.ok) {
        alert(result.error || 'No hemos podido registrar tu cita en este momento. Inténtalo de nuevo en unos minutos o llámanos por teléfono.');
        resetButton();
        return;
      }
      notifyClinic(appointment);
      showSuccess(appointment);
    });

    function resetButton() {
      btn.disabled = false;
      btn.textContent = 'Solicitar cita';
    }
  });

  // Devuelve { ok, status, error } y nunca lanza error.
  function saveAppointment(appt) {
    return fetch(API + '/book-appointment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(appt)
    })
      .then(function(r) {
        return r.json().catch(function() { return {}; }).then(function(out) {
          return { ok: r.ok, status: r.status, error: out.error };
        });
      })
      .catch(function(err) {
        console.error('Error guardando la cita:', err);
        return { ok: false, status: 0 };
      });
  }


  // Aviso por email a la clínica (al email de Ajustes del panel) con
  // FormSubmit. La primera vez FormSubmit envía a ese email un mensaje para
  // activar el aviso; tras pulsar "Activate" llegan todas las reservas.
  function notifyClinic(appt) {
    var to = settings.email;
    if (!to) return;
    fetch('https://formsubmit.co/ajax/' + encodeURIComponent(to), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        _subject: 'Nueva solicitud de cita: ' + appt.patientName + ' — ' + displayDate(appt.date) + ' ' + appt.time,
        _template: 'table',
        _replyto: appt.patientEmail,
        Cliente: appt.patientName,
        'Teléfono': appt.patientPhone,
        Email: appt.patientEmail,
        Servicio: appt.service,
        Fecha: displayDate(appt.date),
        Hora: appt.time,
        Mensaje: appt.message || '—',
        'Qué hacer': 'Entra en el panel de administración, apartado Citas, para confirmarla o proponer otra hora.'
      })
    }).catch(function(err) { console.error('Aviso a la clínica no enviado:', err); });
  }


  function showSuccess(appointment) {
    var summary = document.getElementById('bookingSummary');
    if (summary) {
      summary.innerHTML = ''
        + '<div style="margin-bottom:12px;font-weight:600;color:var(--forest);font-size:15px">Resumen de tu solicitud:</div>'
        + '<div style="display:grid;grid-template-columns:auto 1fr;gap:6px 16px">'
        + '<div style="font-weight:600;color:var(--gray-500)">Servicio:</div><div>' + esc(appointment.service) + '</div>'
        + '<div style="font-weight:600;color:var(--gray-500)">Fecha:</div><div>' + displayDate(appointment.date) + '</div>'
        + '<div style="font-weight:600;color:var(--gray-500)">Hora:</div><div>' + esc(appointment.time) + '</div>'
        + '<div style="font-weight:600;color:var(--gray-500)">Nombre:</div><div>' + esc(appointment.patientName) + '</div>'
        + '<div style="font-weight:600;color:var(--gray-500)">Teléfono:</div><div>' + esc(appointment.patientPhone) + '</div>'
        + '<div style="font-weight:600;color:var(--gray-500)">Email:</div><div>' + esc(appointment.patientEmail) + '</div>'
        + '</div>'
        + (appointment.message ? '<div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--gray-200)"><div style="font-weight:600;color:var(--gray-500);margin-bottom:4px">Mensaje:</div><div style="font-style:italic;color:var(--gray-600)">' + esc(appointment.message) + '</div></div>' : '');
    }

    var note = document.getElementById('bookingEmailNote');
    if (note) {
      note.innerHTML = 'Te escribiremos a <strong>' + esc(appointment.patientEmail) + '</strong> o al <strong>' + esc(appointment.patientPhone) + '</strong> (revisa también la carpeta de spam).';
    }

    document.getElementById('bookingForm').style.display = 'none';
    var success = document.getElementById('bookingSuccess');
    success.style.display = 'block';
    success.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }


  renderCalendar();
  renderTimeSlots(false);
})();
