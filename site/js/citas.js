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


    // Guardar la cita en el servidor (Vercel). El servidor avisa por email a
    // la clínica (al email de Ajustes del panel) y al cliente.
    saveAppointment(appointment)
      .then(function(result) {
        if (result.status === 409) {
          alert('Lo sentimos, esa hora acaba de ser reservada por otra persona. Por favor, elige otra hora.');
          resetButton();
          return;
        }
        if (!result.ok) {
          alert('No hemos podido registrar tu cita en este momento. Inténtalo de nuevo en unos minutos o llámanos por teléfono.');
          resetButton();
          return;
        }
        showSuccess(appointment, dateDisplay, result.emailSent);
      });

    function resetButton() {
      btn.disabled = false;
      btn.textContent = 'Reservar cita';
    }
  });


  var BOOKING_API = 'https://preview-sanjose.vercel.app/api/book-appointment';

  // Devuelve { ok, status, emailSent } y nunca lanza error.
  function saveAppointment(appt) {
    return fetch(BOOKING_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(appt)
    })
      .then(function(r) {
        return r.json().catch(function() { return {}; }).then(function(out) {
          return { ok: r.ok, status: r.status, emailSent: !!out.emailSent };
        });
      })
      .catch(function(err) {
        console.error('Error guardando la cita:', err);
        return { ok: false, status: 0, emailSent: false };
      });
  }


  function showSuccess(appointment, dateDisplay, emailSent) {
    var summary = document.getElementById('bookingSummary');
    if (summary) {
      summary.innerHTML = ''
        + '<div style="margin-bottom:12px;font-weight:600;color:var(--forest);font-size:15px">Resumen de tu solicitud:</div>'
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

    var emailNote = document.getElementById('bookingEmailNote');
    if (emailNote) {
      emailNote.innerHTML = emailSent
        ? 'Te hemos enviado un email con el resumen a <strong>' + esc(appointment.patientEmail) + '</strong> (si no lo ves, revisa la carpeta de spam).'
        : 'Te escribiremos al <strong>' + esc(appointment.patientPhone) + '</strong> para confirmarla.';
    }

    document.getElementById('bookingForm').style.display = 'none';
    var success = document.getElementById('bookingSuccess');
    success.style.display = 'block';
    success.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }


  // Init
  renderCalendar();
  renderTimeSlots();
})();