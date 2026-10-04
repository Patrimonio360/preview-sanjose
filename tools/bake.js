// Escribe los datos de Ajustes (site/_data/settings.json) dentro de las páginas
// HTML, para que Google, WhatsApp, Facebook… los vean sin ejecutar JavaScript.
//
//   node tools/bake.js
//
// Lo ejecuta GitHub Actions (.github/workflows/bake.yml) cada vez que el panel
// guarda los Ajustes. Se puede ejecutar las veces que haga falta: el resultado
// es siempre el mismo para los mismos Ajustes.
//
// Qué hace en cada página:
//   - Rellena los elementos marcados con data-clinic, data-clinic-logo,
//     data-clinic-alt y data-trust (los mismos que rellena js/cms.js en el navegador).
//   - Pone teléfono, email, WhatsApp y redes en los enlaces.
//   - Regenera el bloque <!-- seo:start --> … <!-- seo:end --> de <head>: título,
//     descripción, robots, canonical, Open Graph, favicon y la ficha de la
//     clínica para Google (JSON-LD VeterinaryCare).
// Y además genera site/sitemap.xml y site/robots.txt.
//
// Mientras no haya dominio en Ajustes (siteUrl), todas las páginas llevan
// noindex y robots.txt bloquea a los buscadores: la vista previa no se indexa.

const fs = require('fs');
const path = require('path');
const ClinicSchedule = require('../site/js/schedule.js');

const SITE = path.join(__dirname, '..', 'site');
const settings = JSON.parse(fs.readFileSync(path.join(SITE, '_data', 'settings.json'), 'utf8'));

// Título y descripción de cada página. {name}, {city}, {phone} y {address}
// salen de Ajustes. noindex: páginas que no interesa que salgan en Google.
const PAGES = {
  'index.html': {
    title: '{name} | Veterinario en {city}',
    description: '{name} en {city}: consulta, vacunas, cirugía, laboratorio y diagnóstico por imagen. Pide cita online o llama al {phone}.',
    priority: '1.0'
  },
  'servicios.html': {
    title: 'Servicios veterinarios en {city} | {name}',
    description: 'Consulta general, vacunación, cirugía, laboratorio, diagnóstico por imagen y más en {name}, tu veterinario en {city}.',
    priority: '0.9'
  },
  'citas.html': {
    title: 'Pedir cita online | {name}',
    description: 'Reserva tu cita en {name} ({city}): elige servicio, día y hora en un minuto, sin llamar.',
    priority: '0.9'
  },
  'contacto.html': {
    title: 'Contacto y cómo llegar | {name}',
    description: 'Dirección, teléfono y horario de {name}: {address}. Tel. {phone}.',
    priority: '0.8'
  },
  'nosotros.html': {
    title: 'Sobre nosotros | {name}',
    description: 'Conoce al equipo de {name} en {city}: veterinarios con experiencia, instalaciones modernas y trato cercano.',
    priority: '0.7'
  },
  'planes.html': {
    title: 'Planes de salud para mascotas | {name}',
    description: 'Planes de salud preventivos para tu perro o gato en {name} ({city}): vacunas, revisiones y descuentos.',
    priority: '0.7'
  },
  'resenas.html': {
    title: 'Opiniones de clientes | {name}',
    description: 'Lo que dicen los clientes de {name} en {city}: opiniones reales publicadas en Google.',
    priority: '0.6'
  },
  'galeria.html': {
    title: 'Galería de fotos | {name}',
    description: 'Fotos de las instalaciones y del equipo de {name} en {city}.',
    priority: '0.5'
  },
  'tienda.html': {
    title: 'Tienda para mascotas | {name}',
    description: 'Alimentación, juguetes, accesorios e higiene para mascotas en {name}, {city}. Consúltanos por WhatsApp.',
    priority: '0.5'
  },
  'aviso-legal.html': { title: 'Aviso legal | {name}', description: 'Aviso legal de {name}.', noindex: true },
  'politica-privacidad.html': { title: 'Política de privacidad | {name}', description: 'Política de privacidad de {name}.', noindex: true }
};

// ---------- Datos de la clínica ----------

function cityOf(s) {
  if (s.city) return s.city.trim();
  const m = /\b\d{5}\s+([^,]+)/.exec(s.address || '');
  return m ? m[1].trim() : '';
}

// "Avda. San José, 173, 41300 San José de La Rinconada, Sevilla"
//   -> { street: 'Avda. San José, 173', postalCode: '41300', locality: '…', region: 'Sevilla' }
function parseAddress(address) {
  const m = /^(.*?),?\s*(\d{5})\s+([^,]+)(?:,\s*(.+))?$/.exec(String(address || '').trim());
  if (!m) return { street: address || '' };
  return { street: m[1].trim(), postalCode: m[2], locality: m[3].trim(), region: (m[4] || '').trim() };
}

function shortName(s) {
  return s.shortName || String(s.name || '').replace(/^cl[ií]nica\s+veterinaria\s+/i, '') || s.name;
}

const siteUrl = String(settings.siteUrl || '').trim().replace(/\/+$/, '');
const indexable = /^https:\/\/[^/]+/.test(siteUrl);

const values = Object.assign({}, settings, {
  legalName: settings.legalName || settings.name,
  shortName: shortName(settings),
  year: String(new Date().getFullYear()),
  site: indexable ? siteUrl.replace(/^https:\/\//, '') : (settings.site || '')
});
const city = cityOf(settings);

function absolute(url) {
  if (!url) return '';
  if (/^https?:\/\//.test(url)) return url;
  return indexable ? siteUrl + '/' + url.replace(/^\/+/, '') : '';
}

function fill(template) {
  return template
    .replace(/\{name\}/g, settings.name || '')
    .replace(/\{city\}/g, city)
    .replace(/\{phone\}/g, settings.phone || '')
    .replace(/\{address\}/g, settings.address || '')
    .replace(/\s+\|\s+$/, '').replace(/ en \s*([:,.)|])/g, '$1').replace(/\(\)/g, '').replace(/\s{2,}/g, ' ').trim();
}

function esc(text) {
  return String(text == null ? '' : text)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ---------- Ficha para Google (schema.org) ----------

const DAY_NAMES_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function openingHours() {
  const schedule = settings.schedule || ClinicSchedule.DEFAULT_SCHEDULE;
  // Agrupa los días con los mismos tramos: una entrada por tramo horario.
  const byRange = {};
  ClinicSchedule.DAY_KEYS.forEach(function (key, d) {
    (ClinicSchedule.parseRanges(schedule[key]) || []).forEach(function (r) {
      const id = r[0] + '-' + r[1];
      (byRange[id] = byRange[id] || { range: r, days: [] }).days.push(DAY_NAMES_EN[d]);
    });
  });
  const hhmm = function (m) { return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };
  return Object.keys(byRange).map(function (id) {
    const g = byRange[id];
    return { '@type': 'OpeningHoursSpecification', dayOfWeek: g.days, opens: hhmm(g.range[0]), closes: hhmm(g.range[1]) };
  });
}

function structuredData() {
  const addr = parseAddress(settings.address);
  const data = {
    '@context': 'https://schema.org',
    '@type': 'VeterinaryCare',
    name: settings.name,
    telephone: settings.phone || undefined,
    email: settings.email || undefined,
    address: {
      '@type': 'PostalAddress',
      streetAddress: addr.street || undefined,
      postalCode: addr.postalCode || undefined,
      addressLocality: addr.locality || undefined,
      addressRegion: addr.region || undefined,
      addressCountry: 'ES'
    },
    openingHoursSpecification: openingHours(),
    hasMap: settings.address ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(settings.address) : undefined,
    sameAs: [settings.facebook, settings.instagram, settings.googleMapsUrl].filter(Boolean)
  };
  if (indexable) {
    data['@id'] = siteUrl + '/#clinica';
    data.url = siteUrl + '/';
    if (settings.logo) data.logo = absolute(settings.logo);
    const image = settings.ogImage || settings.logo;
    if (image) data.image = absolute(image);
  }
  if (settings.heroSub) data.description = settings.heroSub;
  if (!data.sameAs.length) delete data.sameAs;
  // JSON dentro de <script>: "</" se escapa para que no cierre la etiqueta.
  return JSON.stringify(data, null, 2).replace(/<\//g, '<\\/');
}

// ---------- Bloque SEO de <head> ----------

function seoBlock(file, page) {
  const title = fill(page.title);
  const description = fill(page.description);
  const url = indexable ? siteUrl + '/' + (file === 'index.html' ? '' : file) : '';
  const image = absolute(settings.ogImage || settings.logo);
  const lines = [
    '<title>' + esc(title) + '</title>',
    '<meta name="description" content="' + esc(description) + '">',
    '<meta name="robots" content="' + (indexable && !page.noindex ? 'index, follow' : 'noindex') + '">'
  ];
  if (url) lines.push('<link rel="canonical" href="' + esc(url) + '">');
  if (settings.logo) lines.push('<link rel="icon" href="' + esc(settings.logo) + '">');
  lines.push(
    '<meta property="og:type" content="website">',
    '<meta property="og:locale" content="es_ES">',
    '<meta property="og:site_name" content="' + esc(settings.name) + '">',
    '<meta property="og:title" content="' + esc(title) + '">',
    '<meta property="og:description" content="' + esc(description) + '">'
  );
  if (url) lines.push('<meta property="og:url" content="' + esc(url) + '">');
  if (image) lines.push('<meta property="og:image" content="' + esc(image) + '">');
  lines.push('<meta name="twitter:card" content="' + (image ? 'summary_large_image' : 'summary') + '">');
  if (file === 'index.html' || file === 'contacto.html') {
    lines.push('<script type="application/ld+json">\n' + structuredData() + '\n    </script>');
  }
  return '<!-- seo:start (generado por tools/bake.js con los Ajustes; no editar a mano) -->\n    '
    + lines.join('\n    ') + '\n    <!-- seo:end -->';
}

// ---------- Contenido de la página ----------

function setAttr(tag, name, value) {
  const re = new RegExp('\\s' + name + '="[^"]*"');
  return re.test(tag) ? tag.replace(re, ' ' + name + '="' + esc(value) + '"') : tag.replace(/\s*\/?>$/, ' ' + name + '="' + esc(value) + '"$&');
}

function setHidden(tag, hidden) {
  tag = tag.replace(/\shidden(?=[\s>])/, '');
  return hidden ? tag.replace(/>$/, ' hidden>') : tag;
}

function bakePage(file) {
  const page = PAGES[file];
  const full = path.join(SITE, file);
  const original = fs.readFileSync(full, 'utf8');
  const nl = original.includes('\r\n') ? '\r\n' : '\n';
  let html = original.replace(/\r\n/g, '\n');

  // <head>: un único bloque SEO en lugar del <title>, la descripción y robots sueltos.
  if (html.includes('<!-- seo:start')) {
    html = html.replace(/<!-- seo:start[\s\S]*?<!-- seo:end -->/, function () { return seoBlock(file, page); });
  } else {
    html = html.replace(/\n\s*<meta name="description"[^>]*>/, '').replace(/\n\s*<meta name="robots"[^>]*>/, '');
    html = html.replace(/<title[^>]*>[\s\S]*?<\/title>/, function () { return seoBlock(file, page); });
  }

  // Textos: <x data-clinic="clave">texto</x> (elementos sin etiquetas dentro)
  html = html.replace(/<(\w+)(\s[^>]*?\bdata-clinic="([A-Za-z]+)"[^>]*)>([^<]*)<\/\1>/g, function (m, tag, attrs, key, text) {
    if (!(key in values)) return m;
    const val = String(values[key] || '').trim();
    let open = setHidden('<' + tag + attrs + '>', !val);
    if (tag === 'a' && key === 'phone' && val) open = setAttr(open, 'href', 'tel:' + val.replace(/\s/g, ''));
    if (tag === 'a' && key === 'email' && val) open = setAttr(open, 'href', 'mailto:' + val);
    return open + esc(val) + '</' + tag + '>';
  });

  // Cifras de confianza: <x data-trust="years">15+</x>
  const trust = { years: settings.trustYears, families: settings.trustFamilies, lab: settings.trustLab, accessible: settings.trustAccessible };
  html = html.replace(/<(\w+)(\s[^>]*?\bdata-trust="(\w+)"[^>]*)>([^<]*)<\/\1>/g, function (m, tag, attrs, key) {
    return trust[key] ? '<' + tag + attrs + '>' + esc(trust[key]) + '</' + tag + '>' : m;
  });

  // Nombre y descripción del pie, teléfono del menú
  if (settings.name) html = html.replace(/(<div class="footer-brand">)[^<]*(<\/div>)/g, '$1' + esc(settings.name) + '$2');
  if (settings.footerDesc) html = html.replace(/(<p class="footer-desc"[^>]*>)[^<]*(<\/p>)/g, '$1' + esc(settings.footerDesc) + '$2');
  if (settings.phone) html = html.replace(/(class="nav-cta">)[^<]*(<\/a>)/g, '$1☎ ' + esc(settings.phone) + '$2');

  // Imágenes: logo y textos alternativos
  html = html.replace(/<img\b[^>]*\bdata-clinic-logo\b[^>]*>/g, function (tag) {
    if (settings.logo) tag = setAttr(tag, 'src', settings.logo);
    return settings.name ? setAttr(tag, 'alt', 'Logo de ' + settings.name) : tag;
  });
  html = html.replace(/<img\b[^>]*\bdata-clinic-alt(?:="(\w+)")?[^>]*>/g, function (tag, key) {
    const val = values[key || 'name'] || settings.name;
    return val ? setAttr(tag, 'alt', val) : tag;
  });

  // Enlaces de llamar, escribir, WhatsApp, redes y mapa
  if (settings.phone) html = html.replace(/href="tel:[^"]*"/g, 'href="tel:' + esc(settings.phone.replace(/\s/g, '')) + '"');
  if (settings.email) html = html.replace(/href="mailto:[^"]*"/g, 'href="mailto:' + esc(settings.email) + '"');
  if (settings.whatsapp) html = html.replace(/wa\.me\/\d*/g, 'wa.me/' + String(settings.whatsapp).replace(/\D/g, ''));
  [['facebook', 'facebook\\.com'], ['instagram', 'instagram\\.com']].forEach(function (net) {
    if (!(net[0] in settings)) return;
    html = html.replace(new RegExp('<a\\b[^>]*href="https?://(?:www\\.)?' + net[1] + '[^"]*"[^>]*>', 'g'), function (tag) {
      return settings[net[0]] ? setHidden(setAttr(tag, 'href', settings[net[0]]), false) : setHidden(tag, true);
    });
  });
  if (settings.address) {
    html = html.replace(/(id="mapDirections" href=")[^"]*(")/, '$1https://www.google.com/maps/search/?api=1&amp;query=' + encodeURIComponent(settings.address) + '$2');
  }

  html = html.replace(/\n/g, nl);
  if (html !== original) fs.writeFileSync(full, html, 'utf8');
  return html !== original;
}

// ---------- sitemap.xml y robots.txt ----------

function writeIfChanged(file, content) {
  const full = path.join(SITE, file);
  const old = fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : null;
  if (old === content) return false;
  fs.writeFileSync(full, content, 'utf8');
  return true;
}

function sitemap() {
  if (!indexable) return writeIfChanged('sitemap.xml', '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>\n');
  const urls = Object.keys(PAGES).filter(function (f) { return !PAGES[f].noindex; }).map(function (f) {
    return '  <url><loc>' + siteUrl + '/' + (f === 'index.html' ? '' : f) + '</loc><priority>' + PAGES[f].priority + '</priority></url>';
  });
  return writeIfChanged('sitemap.xml', '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls.join('\n') + '\n</urlset>\n');
}

function robots() {
  return writeIfChanged('robots.txt', indexable
    ? 'User-agent: *\nDisallow: /admin/\nDisallow: /_data/\n\nSitemap: ' + siteUrl + '/sitemap.xml\n'
    : '# Vista previa: sin dominio en Ajustes no se deja indexar.\nUser-agent: *\nDisallow: /\n');
}

const changed = Object.keys(PAGES).filter(bakePage);
if (sitemap()) changed.push('sitemap.xml');
if (robots()) changed.push('robots.txt');
console.log(changed.length ? 'Actualizado: ' + changed.join(', ') : 'Sin cambios');
console.log(indexable ? 'Dominio: ' + siteUrl + ' (indexable)' : 'Sin dominio en Ajustes: páginas con noindex');
