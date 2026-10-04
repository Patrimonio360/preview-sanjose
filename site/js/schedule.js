// Horario de la clínica: única fuente de verdad para la web, el calendario
// de citas, el panel de administración y el servidor (api/book-appointment).
//
// En settings.json, "schedule" guarda un texto por día con uno o varios
// tramos, p. ej. { "lun": "10:00-14:00, 17:00-21:00", ..., "dom": "" }.
// Un día vacío significa cerrado. Las horas son siempre de Madrid.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ClinicSchedule = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  // Índices como Date.getDay(): 0 = domingo.
  var DAY_KEYS = ['dom', 'lun', 'mar', 'mie', 'jue', 'vie', 'sab'];
  var DAY_NAMES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  var DAY_INITIALS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
  // Orden en que se muestran los días (de lunes a domingo).
  var WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

  var DEFAULT_SCHEDULE = { lun: '10:00-21:00', mar: '10:00-21:00', mie: '10:00-21:00', jue: '10:00-21:00', vie: '10:00-21:00', sab: '', dom: '' };

  var SLOT_MINUTES = 30;      // duración de cada hueco de cita
  var MIN_NOTICE_MINUTES = 60; // antelación mínima para reservar hoy
  var MAX_DAYS_AHEAD = 90;     // hasta cuántos días vista se puede reservar

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function toTime(min) { return pad(Math.floor(min / 60)) + ':' + pad(min % 60); }

  function toMinutes(text) {
    var m = /^(\d{1,2})(?:[:.h](\d{2}))?$/.exec(String(text).trim());
    if (!m) return null;
    var h = +m[1], mi = +(m[2] || 0);
    if (h > 24 || mi > 59 || (h === 24 && mi > 0)) return null;
    return h * 60 + mi;
  }

  // "10:00-14:00, 17:00-21:00" -> [[600, 840], [1020, 1260]]; null si el texto no es válido.
  function parseRanges(text) {
    var clean = String(text || '').trim();
    if (!clean || /^cerrado$/i.test(clean)) return [];
    var ranges = [];
    var parts = clean.split(/[,;y]+/);
    for (var i = 0; i < parts.length; i++) {
      if (!parts[i].trim()) continue;
      var ends = parts[i].split(/[-–a]+/);
      if (ends.length !== 2) return null;
      var open = toMinutes(ends[0]), close = toMinutes(ends[1]);
      if (open === null || close === null || close <= open) return null;
      ranges.push([open, close]);
    }
    ranges.sort(function (a, b) { return a[0] - b[0]; });
    for (var j = 1; j < ranges.length; j++) {
      if (ranges[j][0] < ranges[j - 1][1]) return null; // tramos solapados
    }
    return ranges;
  }

  function formatRanges(ranges) {
    if (!ranges.length) return 'Cerrado';
    return ranges.map(function (r) { return toTime(r[0]) + ' - ' + toTime(r[1]); }).join(' y ');
  }

  // Para frases: "de 10:00 a 14:00 y de 17:00 a 21:00".
  function rangesSentence(ranges) {
    return ranges.map(function (r) { return 'de ' + toTime(r[0]) + ' a ' + toTime(r[1]); }).join(' y ');
  }

  // Devuelve un array de 7 posiciones (0 = domingo) con los tramos de cada día.
  function weekRanges(settings) {
    var schedule = (settings && settings.schedule) || DEFAULT_SCHEDULE;
    return DAY_KEYS.map(function (key) { return parseRanges(schedule[key]) || []; });
  }

  // Fecha y hora actuales en Madrid: { date: 'YYYY-MM-DD', minutes }.
  function madridNow(now) {
    var parts = {};
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(now || new Date()).forEach(function (p) { parts[p.type] = p.value; });
    return { date: parts.year + '-' + parts.month + '-' + parts.day, minutes: (+parts.hour) * 60 + (+parts.minute) };
  }

  function dayOfWeek(dateStr) {
    var p = dateStr.split('-');
    return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])).getUTCDay();
  }

  function addDays(dateStr, days) {
    var p = dateStr.split('-');
    var d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2] + days));
    return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate());
  }

  function daysBetween(fromStr, toStr) {
    var a = fromStr.split('-'), b = toStr.split('-');
    return Math.round((Date.UTC(+b[0], +b[1] - 1, +b[2]) - Date.UTC(+a[0], +a[1] - 1, +a[2])) / 86400000);
  }

  // Huecos de cita de un día ('YYYY-MM-DD'), sin los que ya han pasado o
  // quedan fuera del plazo de reserva.
  function slotsFor(dateStr, settings, now) {
    var today = madridNow(now);
    var ahead = daysBetween(today.date, dateStr);
    if (ahead < 0 || ahead > MAX_DAYS_AHEAD) return [];
    var ranges = weekRanges(settings)[dayOfWeek(dateStr)];
    var earliest = ahead === 0 ? today.minutes + MIN_NOTICE_MINUTES : 0;
    var slots = [];
    ranges.forEach(function (r) {
      for (var t = r[0]; t + SLOT_MINUTES <= r[1]; t += SLOT_MINUTES) {
        if (t >= earliest) slots.push(toTime(t));
      }
    });
    return slots;
  }

  function isValidSlot(dateStr, time, settings, now) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
    return slotsFor(dateStr, settings, now).indexOf(time) !== -1;
  }

  function isBookableDay(dateStr, settings, now) {
    return slotsFor(dateStr, settings, now).length > 0;
  }

  // Estado actual para mostrar en la web.
  function status(settings, now) {
    var week = weekRanges(settings);
    var today = madridNow(now);
    var dow = dayOfWeek(today.date);
    var todayRanges = week[dow];
    var nowMin = today.minutes;
    var current = todayRanges.filter(function (r) { return nowMin >= r[0] && nowMin < r[1]; })[0];
    var result = { todayText: 'Hoy: ' + formatRanges(todayRanges) };

    if (current) {
      result.open = true;
      result.text = 'Abierto ahora · hasta las ' + toTime(current[1]);
      return result;
    }
    result.open = false;
    var laterToday = todayRanges.filter(function (r) { return r[0] > nowMin; })[0];
    if (laterToday) {
      result.text = 'Cerrado ahora · Abrimos hoy a las ' + toTime(laterToday[0]);
      return result;
    }
    for (var i = 1; i <= 7; i++) {
      var d = (dow + i) % 7;
      if (week[d].length) {
        var when = i === 1 ? 'mañana' : 'el ' + DAY_NAMES[d];
        result.text = 'Cerrado ahora · Te esperamos ' + when + ' ' + rangesSentence(week[d]);
        return result;
      }
    }
    result.text = 'Cerrado temporalmente';
    return result;
  }

  // Agrupa días consecutivos con el mismo horario:
  // [{ days: 'Lunes a viernes', short: 'L-V', hours: '10:00 - 21:00' }, ...]
  function groups(settings) {
    var week = weekRanges(settings);
    var out = [];
    WEEK_ORDER.forEach(function (d) {
      var hours = formatRanges(week[d]);
      var last = out[out.length - 1];
      if (last && last.hours === hours) { last.to = d; last.count++; }
      else out.push({ from: d, to: d, hours: hours, count: 1 });
    });
    return out.map(function (g) {
      var same = g.from === g.to;
      var name = DAY_NAMES[g.from].charAt(0).toUpperCase() + DAY_NAMES[g.from].slice(1);
      return {
        days: same ? name : name + (g.count === 2 ? ' y ' : ' a ') + DAY_NAMES[g.to],
        short: same ? DAY_INITIALS[g.from] : DAY_INITIALS[g.from] + '-' + DAY_INITIALS[g.to],
        hours: g.hours,
        closed: g.hours === 'Cerrado'
      };
    });
  }

  // Resumen corto, p. ej. "L-V 10:00 - 21:00 · S 10:00 - 13:30".
  function summary(settings) {
    return groups(settings).filter(function (g) { return !g.closed; })
      .map(function (g) { return g.short + ' ' + g.hours; }).join(' · ') || 'Cerrado';
  }

  return {
    DAY_KEYS: DAY_KEYS,
    DAY_NAMES: DAY_NAMES,
    WEEK_ORDER: WEEK_ORDER,
    DEFAULT_SCHEDULE: DEFAULT_SCHEDULE,
    MAX_DAYS_AHEAD: MAX_DAYS_AHEAD,
    parseRanges: parseRanges,
    formatRanges: formatRanges,
    madridNow: madridNow,
    addDays: addDays,
    slotsFor: slotsFor,
    isValidSlot: isValidSlot,
    isBookableDay: isBookableDay,
    status: status,
    groups: groups,
    summary: summary
  };
});
