// Documentos legales que la clínica descarga desde el panel (imprimir/PDF o Word).
// Los datos de la clínica salen de Ajustes (site/_data/settings.json), así la
// misma web sirve para cualquier clínica sin tocar estos textos.
var LegalDocs = (function() {

  // Campos de Ajustes que necesitan los documentos.
  var REQUIRED = [
    { key: 'legalName', label: 'Razón social o titular' },
    { key: 'cif', label: 'CIF/NIF' },
    { key: 'address', label: 'Dirección' },
    { key: 'phone', label: 'Teléfono' },
    { key: 'email', label: 'Email' }
  ];

  function esc(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Localidad para "En ..., a ... de ...": la de Ajustes o, si no hay, la que
  // sigue al código postal en la dirección ("41300 San José de La Rinconada, Sevilla").
  function cityOf(s) {
    if (s.city) return s.city.trim();
    var m = /\b\d{5}\s+([^,]+)/.exec(s.address || '');
    return m ? m[1].trim() : '';
  }

  function socialsOf(s) {
    var list = [];
    if (s.facebook) list.push('Facebook');
    if (s.instagram) list.push('Instagram');
    return list.length ? list.join(' e ') : '';
  }

  function info(s) {
    s = s || {};
    return {
      tradeName: (s.name || '').trim(),
      legalName: (s.legalName || s.name || '').trim(),
      cif: (s.cif || '').trim(),
      address: (s.address || '').trim(),
      phone: (s.phone || '').trim(),
      email: (s.email || '').trim(),
      city: cityOf(s),
      socials: socialsOf(s)
    };
  }

  function missing(s) {
    return REQUIRED.filter(function(f) {
      return !String((f.key === 'legalName' ? (s.legalName || s.name) : s[f.key]) || '').trim();
    });
  }

  // Un dato o, si falta, una línea en blanco para rellenar a mano.
  function v(val, blank) { return val ? esc(val) : (blank || '______________________'); }

  // "Clínica X SL, con CIF B-1, nombre comercial Clínica X, y domicilio en ..."
  function whoIs(c) {
    var out = '<strong>' + v(c.legalName) + '</strong>, con CIF/NIF ' + v(c.cif, '____________');
    if (c.tradeName && c.tradeName !== c.legalName) out += ', que gira con el nombre comercial <strong>' + esc(c.tradeName) + '</strong>';
    return out + ', y domicilio en ' + v(c.address);
  }

  function letterhead(c) {
    return '<div class="lh"><strong>' + v(c.tradeName || c.legalName) + '</strong><br>'
      + v(c.legalName) + ' · CIF/NIF ' + v(c.cif, '____________') + '<br>'
      + v(c.address) + '<br>Tel. ' + v(c.phone, '__________') + ' · ' + v(c.email) + '</div>';
  }

  function checkTable(head, rows) {
    return '<table class="chk"><tr><th>' + head + '</th><th class="c">SÍ</th><th class="c">NO</th></tr>'
      + rows.map(function(r) { return '<tr><td>' + r + '</td><td class="c">☐</td><td class="c">☐</td></tr>'; }).join('')
      + '</table>';
  }

  function dateLine(c) {
    return '<p class="date">En ' + v(c.city, '____________________') + ', a ____ de ______________ de 20____.</p>';
  }

  function signatures(left) {
    return '<table class="sig"><tr><td><strong>' + left + '</strong><br><br><br><br>Firma:<br><br>Nombre:</td>'
      + '<td><strong>Por la Clínica</strong><br><br><br><br>Firma:<br><br>Nombre y cargo:</td></tr></table>';
  }

  function dataProtection(c, purpose, basis, keep) {
    return '<ul>'
      + '<li><strong>Responsable:</strong> ' + v(c.legalName) + ', CIF/NIF ' + v(c.cif, '____________') + ', ' + v(c.address) + ', ' + v(c.email) + '.</li>'
      + '<li><strong>Finalidad:</strong> ' + purpose + '</li>'
      + '<li><strong>Base legal:</strong> ' + basis + '</li>'
      + '<li><strong>Conservación:</strong> ' + keep + '</li>'
      + '<li><strong>Derechos:</strong> puede pedir el acceso, rectificación, supresión, oposición, limitación y portabilidad de sus datos escribiendo a ' + v(c.email) + ' o a la dirección anterior, y reclamar ante la Agencia Española de Protección de Datos (www.aepd.es).</li>'
      + '</ul>';
  }

  var socialRow = function(c) {
    return 'Redes sociales de la Clínica' + (c.socials ? ' (' + esc(c.socials) + ')' : ': ______________________');
  };

  var DOCS = [
    {
      id: 'imagen-trabajadores',
      icon: '&#x1F4F8;',
      title: 'Autorización de uso de imagen – Trabajadores',
      desc: 'Permiso de cada trabajador para usar sus fotos y vídeos en la web, redes, Google y material impreso.',
      body: function(c) {
        return letterhead(c)
          + '<h1>Autorización para la captación y uso de la imagen del personal</h1>'
          + '<p>D./Dª ____________________________________, con DNI/NIE ______________, que presta servicios en la clínica como ______________________ (en adelante, «la persona trabajadora»),</p>'
          + '<p><strong>AUTORIZA</strong> a ' + whoIs(c) + ' (en adelante, «la Clínica»), a tomar y usar fotografías y vídeos en los que aparezca, en las condiciones siguientes.</p>'
          + '<h2>1. Para qué se usarán las imágenes</h2><p>Marque con una X lo que autoriza:</p>'
          + checkTable('Uso', [
              'Página web de la Clínica (secciones Nosotros, Galería, Servicios y similares)',
              socialRow(c),
              'Ficha de Google de la Clínica (Google Maps / Perfil de Empresa)',
              'Material impreso: carteles, folletos, tarjetas',
              'Mostrar su nombre y cargo junto a la imagen'
            ])
          + '<h2>2. Condiciones</h2><ul>'
          + '<li>La autorización es gratuita y voluntaria. Negarse o retirarla no tendrá ninguna consecuencia en la relación laboral.</li>'
          + '<li>Las imágenes se usarán solo para dar a conocer la Clínica y sus servicios. Nunca se usarán de forma que dañe su honor, intimidad o reputación, ni se cederán a otras empresas para su propia publicidad.</li>'
          + '<li>La Clínica podrá recortar o ajustar el color y el tamaño de las imágenes, sin alterar su sentido.</li>'
          + '<li>Al publicarse en internet, las imágenes pueden verse desde cualquier país. La Clínica no puede impedir que terceros las copien, aunque actuará si conoce un uso indebido.</li>'
          + '<li>Se autoriza por tiempo indefinido mientras no se retire. Cuando termine la relación laboral, la Clínica retirará sus imágenes de la web y del perfil de Google en un plazo máximo de 30 días, salvo que marque esta casilla: ☐ Autorizo que se mantengan tras finalizar mi relación con la Clínica.</li>'
          + '<li>Las publicaciones antiguas en redes sociales podrán mantenerse, salvo que pida expresamente su retirada.</li></ul>'
          + '<h2>3. Retirar el permiso</h2>'
          + '<p>Puede retirar esta autorización en cualquier momento, total o parcialmente, comunicándolo por escrito a la Clínica o por email a ' + v(c.email) + '. La Clínica retirará las imágenes en un plazo máximo de 30 días. Lo publicado antes de la retirada sigue siendo válido.</p>'
          + '<h2>4. Información sobre protección de datos</h2>'
          + dataProtection(c,
              'difundir la actividad de la Clínica en los medios marcados arriba. Las imágenes serán visibles públicamente en esos medios; los proveedores de la web y las redes sociales pueden tratarlas fuera de la Unión Europea con las garantías que exige el RGPD.',
              'su consentimiento (art. 6.1.a del RGPD) y la Ley Orgánica 1/1982 de protección del derecho a la propia imagen.',
              'mientras se mantenga la autorización y, después, el tiempo necesario para atender posibles reclamaciones.')
          + dateLine(c) + signatures('La persona trabajadora');
      }
    },
    {
      id: 'imagen-clientes',
      icon: '&#x1F436;',
      title: 'Autorización de uso de imagen – Clientes y mascotas',
      desc: 'Permiso del cliente para publicar fotos de su mascota (y suyas, si aparece) en la galería, reseñas y redes.',
      body: function(c) {
        return letterhead(c)
          + '<h1>Autorización para el uso de imágenes de clientes y sus mascotas</h1>'
          + '<p>D./Dª ____________________________________, con DNI/NIE ______________, teléfono ______________, propietario/a de la mascota llamada ______________ (especie/raza: ______________),</p>'
          + '<p><strong>AUTORIZA</strong> a ' + whoIs(c) + ' (en adelante, «la Clínica»), a publicar fotografías y vídeos tomados en la Clínica en los términos que marque a continuación.</p>'
          + checkTable('Qué se puede publicar', [
              'Imágenes de mi mascota',
              'Imágenes en las que aparezco yo',
              'El nombre de mi mascota',
              'Mi nombre o iniciales (por ejemplo, junto a una reseña)'
            ])
          + checkTable('Dónde', [
              'Página web de la Clínica (Galería, Testimonios)',
              socialRow(c),
              'Ficha de Google de la Clínica'
            ])
          + '<h2>Condiciones</h2>'
          + '<p>La autorización es gratuita y no afecta a la atención que recibe su mascota. Nunca se publicarán datos clínicos, ni su dirección o teléfono. Las imágenes no se cederán a otras empresas. Si quien aparece en la imagen es menor de 14 años, firma su padre, madre o tutor.</p>'
          + '<p>Puede retirar el permiso en cualquier momento en recepción o escribiendo a ' + v(c.email) + '. La Clínica retirará las imágenes en un plazo máximo de 30 días.</p>'
          + '<h2>Información sobre protección de datos</h2>'
          + dataProtection(c,
              'difundir la actividad de la Clínica. Las imágenes serán públicas en los medios autorizados; los proveedores de la web y las redes sociales pueden tratarlas fuera de la Unión Europea con las garantías que exige el RGPD.',
              'su consentimiento (art. 6.1.a del RGPD).',
              'mientras no retire el permiso.')
          + dateLine(c) + signatures('El/la cliente');
      }
    },
    {
      id: 'confidencialidad',
      icon: '&#x1F512;',
      title: 'Compromiso de confidencialidad – Trabajadores',
      desc: 'Deber de secreto sobre los datos de clientes (fichas, panel de citas, WhatsApp). Debe firmarlo todo el personal.',
      body: function(c) {
        return letterhead(c)
          + '<h1>Compromiso de confidencialidad y deber de secreto</h1>'
          + '<p>D./Dª ____________________________________, con DNI/NIE ______________, que presta servicios para ' + whoIs(c) + ' (en adelante, «la Clínica»), como ______________________,</p>'
          + '<p><strong>SE COMPROMETE</strong> a:</p><ol>'
          + '<li>Guardar secreto sobre los datos personales de clientes, proveedores y compañeros a los que acceda por su trabajo, también después de terminar su relación con la Clínica (art. 5 de la Ley Orgánica 3/2018).</li>'
          + '<li>Usar esos datos solo para las tareas de su puesto y siguiendo las instrucciones de la Clínica.</li>'
          + '<li>No copiar, fotografiar, reenviar ni sacar de la Clínica datos de clientes (por ejemplo, a su móvil o email personal), salvo que sea necesario para su trabajo y esté autorizado.</li>'
          + '<li>No compartir con nadie las contraseñas del panel de administración de la web, del ordenador de la Clínica ni de otras herramientas, y cerrar la sesión al terminar.</li>'
          + '<li>No dejar documentos con datos de clientes a la vista en el mostrador o en las consultas.</li>'
          + '<li>No publicar en sus redes personales fotos de clientes, de sus mascotas o de documentos de la Clínica sin autorización.</li>'
          + '<li>Avisar de inmediato a la dirección si detecta una pérdida, robo o acceso indebido a datos (por ejemplo, un móvil perdido o un email enviado por error), para que la Clínica pueda avisar a la Agencia Española de Protección de Datos en el plazo de 72 horas si es necesario.</li>'
          + '<li>Devolver o borrar todos los datos de la Clínica que tenga cuando termine su relación laboral.</li></ol>'
          + '<p>Incumplir este compromiso puede suponer sanciones disciplinarias según el convenio colectivo aplicable, además de las responsabilidades legales que correspondan.</p>'
          + '<h2>Información sobre sus propios datos</h2>'
          + dataProtection(c,
              'gestionar la relación laboral (nóminas, Seguridad Social, prevención de riesgos). Los datos se comunican a la gestoría, la Seguridad Social, la Agencia Tributaria y la mutua cuando lo exige la ley.',
              'el contrato de trabajo y las obligaciones legales de la Clínica (art. 6.1.b y 6.1.c del RGPD).',
              'durante la relación laboral y, después, durante los plazos que fija la ley.')
          + dateLine(c) + signatures('La persona trabajadora');
      }
    }
  ];

  var STYLE = ''
    + 'body{font-family:Calibri,Arial,sans-serif;font-size:11pt;line-height:1.45;color:#111;margin:0}'
    + '.page{max-width:720px;margin:0 auto;padding:32px}'
    + '.lh{font-size:9.5pt;color:#444;border-bottom:1px solid #999;padding-bottom:8px;margin-bottom:18px}'
    + 'h1{font-size:15pt;text-align:center;text-transform:uppercase;margin:18px 0 16px}'
    + 'h2{font-size:12pt;margin:18px 0 6px}'
    + 'p,li{margin:0 0 8px;text-align:justify}'
    + 'table{border-collapse:collapse;width:100%;margin:6px 0 12px}'
    + '.chk th,.chk td{border:1px solid #888;padding:5px 8px;font-size:10.5pt;text-align:left}'
    + '.chk th{background:#eee}.chk .c{width:48px;text-align:center}'
    + '.date{margin-top:22px}'
    + '.sig td{width:50%;vertical-align:top;padding:8px 12px 8px 0}'
    + '@page{margin:18mm}@media print{.page{padding:0;max-width:none}}';

  function html(doc, settings) {
    return '<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>' + esc(doc.title) + '</title>'
      + '<style>' + STYLE + '</style></head><body><div class="page">' + doc.body(info(settings)) + '</div></body></html>';
  }

  function find(id) {
    return DOCS.filter(function(d) { return d.id === id; })[0];
  }

  // Imprime con un iframe oculto: desde el diálogo de impresión se puede
  // "Guardar como PDF" y no lo bloquean los bloqueadores de ventanas.
  function print(id, settings) {
    var frame = document.createElement('iframe');
    frame.style.cssText = 'position:fixed;width:0;height:0;border:0;right:0;bottom:0';
    frame.srcdoc = html(find(id), settings);
    frame.onload = function() {
      frame.contentWindow.focus();
      frame.contentWindow.print();
      setTimeout(function() { frame.remove(); }, 60000);
    };
    document.body.appendChild(frame);
  }

  // Word abre sin problema un HTML guardado como .doc, y así se puede retocar.
  function downloadWord(id, settings) {
    var doc = find(id);
    var content = html(doc, settings).replace('<html lang="es">',
      '<html lang="es" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">');
    var blob = new Blob(['﻿' + content], { type: 'application/msword' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = doc.id + '.doc';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
  }

  return { DOCS: DOCS, REQUIRED: REQUIRED, info: info, missing: missing, html: html, print: print, downloadWord: downloadWord };
})();
