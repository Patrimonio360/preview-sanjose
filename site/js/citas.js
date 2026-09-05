(function() {
  function esc(s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
  var services = [];
  var selectedDate = null;
  var selectedTime = null;
  var currentMonth = new Date().getMonth();
  var currentYear = new Date().getFullYear();

  var MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  var DAYNAMES = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];

  // Clinic hours: L-V 10-21, Sáb 10-13:30
  function getSlotsForDay(date) {
    var day = date.getDay(); // 0=Sun, 6=Sat
    var slots = [];
    if (day === 0) return slots; // Sunday closed
    if (day === 6) {
      // Saturday 10:00-13:30
      for (var h = 10; h < 14; h++) {
        slots.push(h + ':00');
        if (h < 13) slots.push(h + ':30');
      }
    } else {
      // Monday-Friday 10:00-21:00
      for (var h = 10; h < 21; h++) {
        slots.push(h + ':00');
        slots.push(h + ':30');
      }
    }
    return slots;
  }

  // Load services
  fetch('_data/services.json?t=' + Date.now())
    .then(function(r) { return r.json(); })
    .then(function(data) {
      services = data.services || [];
      var sel = document.getElementById('bookService');
      services.forEach(function(s) {
        var opt = document.createElement('option');
        opt.value = s.name;
        opt.textContent = (s.icon || '') + ' ' + s.name;
        sel.appendChild(opt);
      });
    })
    .catch(function() {});

  // Render calendar
  function renderCalendar() {
    var grid = document.getElementById('calGrid');
    var monthLabel = document.getElementById('calMonth');
    monthLabel.textContent = MONTHS[currentMonth] + ' ' + currentYear;

    var firstDay = new Date(currentYear, currentMonth, 1);
    var lastDay = new Date(currentYear, currentMonth + 1, 0);
    var startDay = (firstDay.getDay() + 6) % 7; // Monday=0
    var today = new Date();
    today.setHours(0,0,0,0);

    var html = '';
    DAYNAMES.forEach(function(d) {
      html += '<div class="calendar-dayname">' + d + '</div>';
    });

    // Empty cells before first day
    for (var i = 0; i < startDay; i++) {
      html += '<div class="calendar-day empty"></div>';
    }

    // Day cells
    for (var d = 1; d <= lastDay.getDate(); d++) {
      var date = new Date(currentYear, currentMonth, d);
      var isPast = date < today;
      var isSunday = date.getDay() === 0;
      var isToday = date.getTime() === today.getTime();
      var isSelected = selectedDate && date.getTime() === selectedDate.getTime();
      var cls = 'calendar-day';
      if (isPast || isSunday) cls += ' disabled';
      if (isToday) cls += ' today';
      if (isSelected) cls += ' selected';
      html += '<div class="' + cls + '" data-date="' + currentYear + '-' + String(currentMonth+1).padStart(2,'0') + '-' + String(d).padStart(2,'0') + '">' + d + '</div>';
    }

    grid.innerHTML = html;

    // Bind clicks
    grid.querySelectorAll('.calendar-day:not(.disabled):not(.empty)').forEach(function(el) {
      el.addEventListener('click', function() {
        var parts = el.dataset.date.split('-');
        selectedDate = new Date(parseInt(parts[0]), parseInt(parts[1])-1, parseInt(parts[2]));
        selectedTime = null;
        document.getElementById('bookDate').value = el.dataset.date;
        document.getElementById('bookTime').value = '';
        renderCalendar();
        renderTimeSlots();
      });
    });
  }

  function renderTimeSlots() {
    var title = document.getElementById('timeslotsTitle');
    var grid = document.getElementById('timeslotsGrid');
    if (!selectedDate) {
      title.style.display = 'none';
      grid.innerHTML = '';
      return;
    }
    title.style.display = '';
    var slots = getSlotsForDay(selectedDate);
    var html = '';
    slots.forEach(function(s) {
      var cls = 'timeslot';
      if (s === selectedTime) cls += ' selected';
      html += '<div class="' + cls + '" data-time="' + s + '">' + s + '</div>';
    });
    if (slots.length === 0) {
      html = '<div style="grid-column:1/-1;text-align:center;color:var(--gray-400);padding:20px">Cerrado este día</div>';
    }
    grid.innerHTML = html;

    grid.querySelectorAll('.timeslot').forEach(function(el) {
      el.addEventListener('click', function() {
        selectedTime = el.dataset.time;
        document.getElementById('bookTime').value = selectedTime;
        renderTimeSlots();
      });
    });
  }

  // Navigation
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

  // Form submit
  document.getElementById('bookingForm').addEventListener('submit', function(e) {
    e.preventDefault();
    if (!selectedDate || !selectedTime) {
      alert('Por favor, selecciona una fecha y hora.');
      return;
    }

    var btn = document.getElementById('bookSubmit');
    btn.disabled = true;
    btn.textContent = 'Reservando...';

    var dateStr = selectedDate.getFullYear() + '-' + String(selectedDate.getMonth()+1).padStart(2,'0') + '-' + String(selectedDate.getDate()).padStart(2,'0');
    var dateDisplay = selectedDate.getDate() + ' de ' + MONTHS[selectedDate.getMonth()] + ' ' + selectedDate.getFullYear();

    var appointment = {
      id: Date.now(),
      service: document.getElementById('bookService').value,
      date: dateStr,
      time: selectedTime,
      patientName: document.getElementById('bookName').value,
      patientPhone: document.getElementById('bookPhone').value,
      patientEmail: document.getElementById('bookEmail').value,
      message: document.getElementById('bookMessage').value,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    // Save to GitHub
    fetch('_data/appointments.json?t=' + Date.now())
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (!data.appointments) data.appointments = [];
        data.appointments.push(appointment);
        return data;
      })
      .catch(function() {
        return { appointments: [appointment] };
      })
      .then(function(data) {
        // Try to send email via Web3Forms
        sendBookingEmail(appointment, dateDisplay);

        // Build summary
        var summary = document.getElementById('bookingSummary');
        if (summary) {
          summary.innerHTML = ''
            + '<div style="margin-bottom:12px;font-weight:600;color:var(--forest);font-size:15px">Resumen de tu cita:</div>'
            + '<div style="display:grid;grid-template-columns:auto 1fr;gap:6px 16px">'
            + '<div style="font-weight:600;color:var(--gray-500)">Servicio:</div><div>' + esc(appointment.service) + '</div>'
            + '<div style="font-weight:600;color:var(--gray-500)">Fecha:</div><div>' + dateDisplay + '</div>'
            + '<div style="font-weight:600;color:var(--gray-500)">Hora:</div><div>' + esc(appointment.time) + '</div>'
            + '<div style="font-weight:600;color:var(--gray-500)">Nombre:</div><div>' + esc(appointment.patientName) + '</div>'
            + '<div style="font-weight:600;color:var(--gray-500)">Teléfono:</div><div>' + esc(appointment.patientPhone) + '</div>'
            + '<div style="font-weight:600;color:var(--gray-500)">Email:</div><div>' + esc(appointment.patientEmail) + '</div>'
            + '</div>'
            + (appointment.message ? '<div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--gray-200)"><div style="font-weight:600;color:var(--gray-500);margin-bottom:4px">Mensaje:</div><div style="font-style:italic;color:var(--gray-600)">' + esc(appointment.message) + '</div></div>' : '');
        }

        // Show success
        document.getElementById('bookingForm').style.display = 'none';
        document.getElementById('bookingSuccess').style.display = '';
      })
      .catch(function(err) {
        btn.disabled = false;
        btn.textContent = 'Reservar cita';
        alert('Error al reservar. Por favor, intenta de nuevo o llámanos al 955 321 470.');
      });
  });

  function sendBookingEmail(appt, dateDisplay) {
    // Load email config
    fetch('_data/settings.json?t=' + Date.now())
      .then(function(r) { return r.json(); })
      .then(function(settings) {
        var clinicEmail = settings.email || 'sanjose.clinicaveterinaria@gmail.com';
        var phone = settings.phone || '955 321 470';
        var clinicName = settings.name || 'Clinica Veterinaria San Jose';

        var web3Key = '6d0e9bc7-1c66-445a-ae61-3a2a232429fe';

        // 1) Notify clinic
        var clinicSubject = 'Nueva cita solicitada — ' + appt.patientName;
        var clinicMessage = 'Nueva solicitud de cita:\n\n'
          + 'Paciente: ' + appt.patientName + '\n'
          + 'Telefono: ' + appt.patientPhone + '\n'
          + 'Email: ' + appt.patientEmail + '\n'
          + 'Servicio: ' + appt.service + '\n'
          + 'Fecha: ' + dateDisplay + '\n'
          + 'Hora: ' + appt.time + '\n'
          + (appt.message ? 'Mensaje: ' + appt.message + '\n' : '')
          + '\nPara confirmar la cita, accede al panel de administracion.';

        fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            access_key: web3Key,
            subject: clinicSubject,
            from_name: 'Cita Web - ' + clinicName,
            email: clinicEmail,
            message: clinicMessage,
            botcheck: ''
          })
        }).catch(function() {});

        // 2) Send confirmation to patient
        var patientDateDisplay = new Date(appt.date + 'T00:00:00').toLocaleDateString('es-ES', {
          weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
        });
        var patientSubject = 'Confirmacion de tu cita en ' + clinicName;
        var patientMessage = 'Hola ' + appt.patientName + ',\n\n'
          + 'Tu cita ha sido recibida correctamente.\n\n'
          + 'Detalles de tu cita:\n'
          + '  Servicio: ' + appt.service + '\n'
          + '  Fecha: ' + patientDateDisplay + '\n'
          + '  Hora: ' + appt.time + '\n\n'
          + 'Te confirmaremos la cita por email en breve.\n\n'
          + 'Si tienes cualquier duda, puedes contactarnos:\n'
          + '  Tel: ' + phone + '\n'
          + '  Email: ' + clinicEmail + '\n\n'
          + 'Un saludo,\n' + clinicName;

        fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            access_key: web3Key,
            subject: patientSubject,
            from_name: clinicName,
            email: appt.patientEmail,
            message: patientMessage,
            botcheck: ''
          })
        }).catch(function() {});
      })
      .catch(function() {});
  }

  // Init
  renderCalendar();
  renderTimeSlots();
})();
