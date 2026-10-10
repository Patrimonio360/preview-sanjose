var CMS = (function() {
  // Agencia que desarrolla y mantiene la web (crédito del pie y canal de
  // sugerencias del panel). Fijo a propósito: no se edita desde Ajustes.
  var AGENCY = { name: 'Patrimonio360', email: 'patrimonio360.pro@gmail.com' };

  var DEFAULT_COLORS = {
    primary: '#1A3C2A',
    primaryLight: '#2D6B45',
    sage: '#6B9B7A',
    coral: '#D4764E',
    coralDark: '#B85E3A',
    cream: '#FBF9F5',
    charcoal: '#1C1C1C',
    white: '#FFF'
  };

  // Colores de un tema: clave en colors.json, variable CSS, nombre en el panel
  // y valor por defecto (el del tema original).
  var COLOR_ROLES = [
    { key: 'navBg',        css: '--nav-bg',       group: 'Barra de menú',   label: 'Fondo de la barra de menú',               def: '#FFFFFF' },
    { key: 'navTitle',     css: '--nav-title',    group: 'Barra de menú',   label: 'Nombre de la clínica en la barra',        def: '#1A3C2A' },
    { key: 'navText',      css: '--nav-text',     group: 'Barra de menú',   label: 'Enlaces del menú',                        def: '#3A3A3A' },
    { key: 'heading',      css: '--heading',      group: 'Textos',          label: 'Títulos de sección',                      def: '#1C1C1C' },
    { key: 'charcoal',     css: '--charcoal',     group: 'Textos',          label: 'Texto general',                           def: '#1C1C1C' },
    { key: 'primary',      css: '--forest',       group: 'Marca y botones', label: 'Color principal (marca, botones, iconos)', def: '#1A3C2A' },
    { key: 'primaryLight', css: '--forest-light', group: 'Marca y botones', label: 'Color principal al pasar el ratón',       def: '#2D6B45' },
    { key: 'coral',        css: '--coral',        group: 'Marca y botones', label: 'Botones destacados (Pedir cita, teléfono)', def: '#D4764E' },
    { key: 'coralDark',    css: '--coral-dark',   group: 'Marca y botones', label: 'Botones destacados al pasar el ratón',    def: '#B85E3A' },
    { key: 'sage',         css: '--sage',         group: 'Marca y botones', label: 'Detalles y etiquetas',                    def: '#6B9B7A' },
    { key: 'cream',        css: '--cream',        group: 'Fondos',          label: 'Fondo de la página',                      def: '#FBF9F5' },
    { key: 'white',        css: '--white',        group: 'Fondos',          label: 'Fondo de tarjetas y recuadros',           def: '#FFFFFF' },
    { key: 'footerBg',     css: '--footer-bg',    group: 'Pie de página',   label: 'Fondo del pie de página',                 def: '#1C1C1C' },
    { key: 'footerText',   css: '--footer-text',  group: 'Pie de página',   label: 'Texto del pie de página',                 def: '#FFFFFF' }
  ];

  function applyColors() {
    return fetch('_data/colors.json?t=' + Date.now())
      .then(function(r) { return r.json(); })
      .then(function(c) {
        var root = document.documentElement;
        COLOR_ROLES.forEach(function(role) { if (c[role.key]) root.style.setProperty(role.css, c[role.key]); });
        // El acento claro (palabra destacada del título, brillo de la foto) sale
        // del color de los botones destacados del tema, para que no quede naranja.
        if (c.coral) root.style.setProperty('--coral-light', 'color-mix(in srgb, ' + c.coral + ' 70%, #fff)');
        document.body.classList.add('colors-loaded');
      })
      .catch(function() {});
  }

  function loadSettings() {
    return fetch('_data/settings.json?v=' + Date.now())
      .then(function(r) { return r.json(); })
      .then(function(s) {
        // Nav phone
        var navPhone = document.querySelector('.nav-cta');
        if (navPhone) {
          navPhone.href = 'tel:' + s.phone.replace(/\s/g, '');
          navPhone.innerHTML = '\u260E ' + s.phone;
        }
        // Abierto / cerrado seg\u00FAn el horario del panel
        showOpeningStatus(s);
        // Tienda activable desde el panel
        applyStoreSetting(s);
        // "Web desarrollada por Patrimonio360" en el pie
        showAgencyCredit(s);
        // Footer brand
        document.querySelectorAll('.footer-brand').forEach(function(el) {
          if (s.name) el.textContent = s.name;
        });
        // Footer description
        document.querySelectorAll('.footer-desc').forEach(function(el) {
          if (s.footerDesc) el.textContent = s.footerDesc;
        });
        // Footer phone
        var footerPhones = document.querySelectorAll('.footer-col a[href^="tel:"]');
        footerPhones.forEach(function(a) {
          a.href = 'tel:' + s.phone.replace(/\s/g, '');
          a.textContent = s.phone;
        });
        // Footer email
        var footerEmails = document.querySelectorAll('.footer-col a[href^="mailto:"]');
        footerEmails.forEach(function(a) {
          a.href = 'mailto:' + s.email;
          a.textContent = s.email;
        });
        // Redes sociales: el enlace de Ajustes, o se ocultan si la clínica no tiene
        [['facebook', 'facebook.com'], ['instagram', 'instagram.com']].forEach(function(net) {
          document.querySelectorAll('a[href*="' + net[1] + '"]').forEach(function(a) {
            if (s[net[0]]) { a.href = s[net[0]]; a.hidden = false; }
            else if (net[0] in s) a.hidden = true;
          });
        });
        // WhatsApp buttons
        // (se cambia el número y se conserva el texto del mensaje)
        if (s.whatsapp) {
          document.querySelectorAll('[href*="wa.me/"]').forEach(function(a) {
            a.href = a.href.replace(/wa\.me\/\d*/, 'wa.me/' + s.whatsapp);
          });
        }
        // Contacto page info
        var contactoInfo = document.querySelector('.contacto-info-phone');
        if (contactoInfo) {
          contactoInfo.href = 'tel:' + s.phone.replace(/\s/g, '');
          contactoInfo.textContent = s.phone;
        }
        var contactoEmail = document.querySelector('.contacto-info-email');
        if (contactoEmail) {
          contactoEmail.href = 'mailto:' + s.email;
          contactoEmail.textContent = s.email;
        }
        var contactoAddress = document.querySelector('.contacto-info-address');
        if (contactoAddress) {
          contactoAddress.textContent = s.address;
        }
        var contactoHours = document.querySelector('.contacto-info-hours');
        if (contactoHours && window.ClinicSchedule) {
          contactoHours.innerHTML = ClinicSchedule.groups(s).map(function(g) {
            return g.days + ': ' + (g.closed ? 'cerrado' : g.hours);
          }).join('<br>');
        }
        // Nombre, logo, textos y datos de contacto: <span data-clinic="name">
        fillClinicData(s);
        // Reseñas de Google: enlaces a la ficha y círculos con iniciales
        showGoogleReviews(s);
        // Trust stats
        var trust = { years: s.trustYears, families: s.trustFamilies, lab: s.trustLab, accessible: s.trustAccessible };
        document.querySelectorAll('[data-trust]').forEach(function(el) {
          var val = trust[el.dataset.trust];
          if (val) el.textContent = val;
        });
      })
      .catch(function() {});
  }

  // Nombre corto para el menú: el de Ajustes o el nombre sin "Clínica Veterinaria".
  function shortName(s) {
    return s.shortName || String(s.name || '').replace(/^cl[ií]nica\s+veterinaria\s+/i, '') || s.name;
  }

  // Rellena todo lo propio de la clínica con los datos de Ajustes, para que la
  // misma web sirva a cualquier clínica:
  //   data-clinic="clave"      texto (en enlaces de teléfono/email, también el enlace)
  //   data-clinic-alt[="clave"] texto alternativo de una imagen (por defecto, el nombre)
  //   data-clinic-logo          imagen del logo
  //   data-clinic-box           se oculta si su primer dato se ha dejado vacío en Ajustes
  // Si una clave no existe en Ajustes se deja el texto de ejemplo del HTML.
  // tools/bake.js hace lo mismo al publicar, para que los buscadores lo vean
  // sin JavaScript; esto aplica al momento los cambios recién guardados.
  // "4.7 en Google · N opiniones": enlace a la ficha de Google Maps de Ajustes
  // (si no hay, a una búsqueda de la clínica en Google Maps) y, en vez de
  // fotos, las iniciales de los clientes de las reseñas del panel.
  function showGoogleReviews(s) {
    var url = String(s.googleMapsUrl || '').trim();
    if (!/^https:\/\//.test(url)) {
      url = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent([s.name, s.address].filter(Boolean).join(' '));
    }
    document.querySelectorAll('[data-google-reviews]').forEach(function(a) { a.href = url; });

    var box = document.getElementById('reviewAvatars');
    if (!box) return;
    fetch('_data/reviews/index.json?t=' + Date.now())
      .then(function(r) { return r.json(); })
      .then(function(data) {
        var reviews = (Array.isArray(data) ? data : (data.reviews || [])).filter(function(r) { return r.author; });
        if (!reviews.length) return;
        var spans = box.querySelectorAll('.hero-proof-avatar');
        spans.forEach(function(span, i) {
          var author = reviews[i % reviews.length].author;
          span.textContent = author.split(/\s+/).map(function(w) { return w.charAt(0); }).join('').slice(0, 2).toUpperCase();
        });
      })
      .catch(function() {});
  }

  function fillClinicData(s) {
    var values = Object.assign({}, s, {
      legalName: s.legalName || s.name,
      shortName: shortName(s),
      site: location.host,
      year: String(new Date().getFullYear())
    });
    document.querySelectorAll('[data-clinic]').forEach(function(el) {
      var key = el.dataset.clinic;
      if (!(key in values)) return;
      var val = String(values[key] || '').trim();
      el.hidden = !val;
      if (!val) return;
      el.textContent = val;
      if (el.tagName === 'A' && key === 'email') el.href = 'mailto:' + val;
      if (el.tagName === 'A' && key === 'phone') el.href = 'tel:' + val.replace(/\s/g, '');
    });
    // Un bloque (p. ej. la tarjeta del director) se oculta si su dato principal está vacío
    document.querySelectorAll('[data-clinic-box]').forEach(function(box) {
      var main = box.querySelector('[data-clinic]');
      if (main) box.hidden = main.hidden;
    });
    // Cualquier otro enlace de llamar o escribir lleva a la clínica de Ajustes
    if (s.phone) document.querySelectorAll('a[href^="tel:"]').forEach(function(a) { a.href = 'tel:' + s.phone.replace(/\s/g, ''); });
    // (el enlace del crédito de Patrimonio360 lleva su propio email)
    if (s.email) document.querySelectorAll('a[href^="mailto:"]:not(.agency-credit a)').forEach(function(a) { a.href = 'mailto:' + s.email; });
    document.querySelectorAll('[data-clinic-alt]').forEach(function(img) {
      var val = values[img.dataset.clinicAlt || 'name'] || s.name;
      if (val) img.alt = val;
    });
    document.querySelectorAll('[data-clinic-logo]').forEach(function(img) {
      if (s.logo) img.src = s.logo;
      if (s.name) img.alt = 'Logo de ' + s.name;
    });
  }

  // "Abierto ahora · hasta las 21:00" / "Cerrado ahora · Te esperamos mañana…"
  function showOpeningStatus(s) {
    if (!window.ClinicSchedule) return;
    var st = ClinicSchedule.status(s);
    var badge = document.querySelector('.hero-badge');
    if (badge) {
      badge.classList.toggle('is-closed', !st.open);
      var span = badge.querySelector('span');
      if (span) span.textContent = st.text;
    }
    var card = document.querySelector('.hero-float--hours .hero-float-info');
    if (card) {
      card.querySelector('strong').textContent = st.todayText;
      card.querySelector('span').textContent = st.open ? 'Abierto ahora' : 'Cerrado ahora';
    }
  }

  // Crédito de la agencia en el pie, con un email para contactar o hacer
  // peticiones. Es fijo: va en el código, no en Ajustes, para que no se
  // pueda cambiar ni quitar desde el panel.
  function showAgencyCredit(s) {
    document.querySelectorAll('.agency-credit').forEach(function(el) { el.remove(); });
    var email = AGENCY.email;
    var subject = 'Contacto desde la web de ' + (s.name || 'la clínica');
    document.querySelectorAll('.footer-bottom').forEach(function(bar) {
      var span = document.createElement('span');
      span.className = 'agency-credit';
      span.appendChild(document.createTextNode('Web desarrollada por '));
      var a = document.createElement('a');
      a.href = 'mailto:' + email + '?subject=' + encodeURIComponent(subject);
      a.textContent = 'Patrimonio360';
      a.title = 'Contactar con Patrimonio360';
      span.appendChild(a);
      bar.appendChild(span);
    });
  }

  function storeEnabled(s) {
    return ['false', 'no', '0', 'off'].indexOf(String(s.storeEnabled).trim().toLowerCase()) === -1;
  }

  // Con la tienda desactivada en el panel se ocultan sus enlaces y su sección.
  function applyStoreSetting(s) {
    var on = storeEnabled(s);
    document.querySelectorAll('[data-store-link], [data-store-section]').forEach(function(el) {
      el.style.display = on ? '' : 'none';
    });
    document.documentElement.classList.toggle('store-off', !on);
  }

  // Planes de salud en la portada: los mismos del panel (los de la página
  // Planes), en tarjetas resumidas.
  function loadHomePlans() {
    var grid = document.getElementById('homePlans');
    if (!grid) return;
    function esc(t) { var d = document.createElement('div'); d.textContent = t == null ? '' : t; return d.innerHTML; }
    return fetch('_data/plans.json?t=' + Date.now())
      .then(function(r) { return r.json(); })
      .then(function(data) {
        var plans = Array.isArray(data) ? data : (data.plans || []);
        grid.innerHTML = plans.map(function(p, i) {
          var features = (p.features || []).map(function(f) {
            return String(typeof f === 'object' ? f.feature : f).replace(/^\s*[•·\-–]\s*/, '').trim();
          }).filter(Boolean);
          var shown = features.slice(0, 5);
          var price = typeof p.price === 'number' ? p.price.toFixed(2).replace('.', ',') : esc(p.price);
          var popular = !!p.badge;
          return '<div class="plan-home-card' + (popular ? ' plan-home-card--popular' : '') + ' reveal visible" style="transition-delay:' + (i * 0.1) + 's">'
            + (popular ? '<div class="plan-home-popular">' + esc(p.badge) + '</div>' : '')
            + '<div class="plan-home-tag">' + esc(String(p.name || '').replace(/^Plan\s+/i, '')) + '</div>'
            + '<div class="plan-home-price"><span>' + price + '</span>€' + esc(String(p.period || '').trim()) + '</div>'
            + '<ul class="plan-home-list">' + shown.map(function(f) { return '<li>' + esc(f) + '</li>'; }).join('')
            + (features.length > shown.length ? '<li>y ' + (features.length - shown.length) + ' ventajas más</li>' : '') + '</ul>'
            + '<a href="planes.html" class="plan-home-btn' + (popular ? ' plan-home-btn--primary' : '') + '">Ver detalles →</a>'
            + '</div>';
        }).join('');
      })
      .catch(function() {});
  }

  // Servicios de la portada: tarjetas con la foto de cada servicio del panel.
  // Sin foto, se muestra el icono del servicio sobre el color del tema.
  function loadHomeServices() {
    var grid = document.getElementById('homeServices');
    if (!grid) return;
    function esc(t) { var d = document.createElement('div'); d.textContent = t == null ? '' : t; return d.innerHTML; }
    return fetch('_data/services.json?t=' + Date.now())
      .then(function(r) { return r.json(); })
      .then(function(data) {
        var list = (Array.isArray(data) ? data : (data.services || [])).filter(function(s) { return s.name; });
        if (!list.length) return;
        grid.innerHTML = list.map(function(s) {
          var name = String(s.name).replace(/\.\s*$/, '');
          var media = s.image
            ? '<img src="' + esc(s.image) + '" alt="' + esc(name) + '" loading="lazy">'
            : '<span class="svc-photo-icon" aria-hidden="true">' + esc(s.icon || '🐾') + '</span>';
          return '<a href="servicios.html#svc-' + esc(s.id) + '" class="svc-photo">'
            + '<div class="svc-photo-img">' + media + '</div>'
            + '<div class="svc-photo-body"><h3>' + esc(name) + '</h3>'
            + (s.shortDesc ? '<p>' + esc(s.shortDesc) + '</p>' : '')
            + '<span class="svc-photo-more">Ver más →</span></div></a>';
        }).join('');
      })
      .catch(function() {});
  }

  // "Productos destacados" de la portada: 4 productos del panel, primero los
  // marcados como producto estrella (con su motivo encima de la foto).
  function loadHomeProducts() {
    var grid = document.getElementById('homeProducts');
    if (!grid) return;
    function esc(t) { var d = document.createElement('div'); d.textContent = t == null ? '' : t; return d.innerHTML; }
    return fetch('_data/products.json?t=' + Date.now())
      .then(function(r) { return r.json(); })
      .then(function(data) {
        var all = Array.isArray(data) ? data : (data.products || []);
        var list = all.filter(function(p) { return p.star; }).concat(all.filter(function(p) { return !p.star; })).slice(0, 4);
        grid.innerHTML = list.map(function(p, i) {
          var price = Number(p.price) > 0 ? Number(p.price).toFixed(2).replace('.', ',') + '€' : 'Consultar precio';
          return '<a href="tienda.html" class="product-home reveal visible" style="text-decoration:none;transition-delay:' + (i * 0.1) + 's">'
            + '<div class="product-home-img"><img src="' + esc(p.image) + '" alt="' + esc((p.brand || '') + ' ' + (p.name || '')) + '" loading="lazy">'
            + (p.star ? '<span class="product-home-star">★ ' + esc(p.starReason || 'Producto destacado') + '</span>' : '') + '</div>'
            + '<div class="product-home-info"><div class="product-home-brand">' + esc(p.brand) + '</div>'
            + '<div class="product-home-name">' + esc(p.name) + '</div>'
            + '<div class="product-home-price">' + price + '</div></div></a>';
        }).join('');
      })
      .catch(function() {});
  }

  // Equipo (página Nosotros): una tarjeta por trabajador con su biografía.
  // Si no hay nadie visible, la sección se queda oculta.
  function loadTeam() {
    var section = document.getElementById('teamSection');
    var grid = document.getElementById('teamGrid');
    if (!section || !grid) return;
    function esc(t) { var d = document.createElement('div'); d.textContent = t == null ? '' : t; return d.innerHTML; }
    return fetch('_data/team.json?t=' + Date.now())
      .then(function(r) { return r.json(); })
      .then(function(data) {
        var list = (Array.isArray(data) ? data : (data.team || [])).filter(function(m) { return m.visible !== false && m.name; });
        if (!list.length) { section.hidden = true; return; }
        grid.innerHTML = list.map(function(m) {
          var initials = String(m.name).replace(/^(dra?|sr|sra)\.?\s+/i, '').split(/\s+/).slice(0, 2).map(function(w) { return w.charAt(0); }).join('').toUpperCase();
          var photo = m.photo
            ? '<img src="' + esc(m.photo) + '" alt="' + esc(m.name) + '" loading="lazy">'
            : '<span>' + esc(initials) + '</span>';
          var bio = String(m.bio || '').trim();
          var paras = bio ? bio.split(/\n+/).map(function(p) { return '<p>' + esc(p) + '</p>'; }).join('') : '';
          return '<article class="team-card">'
            + '<div class="team-photo">' + photo + '</div>'
            + '<h3 class="team-name">' + esc(m.name) + '</h3>'
            + (m.role ? '<div class="team-role">' + esc(m.role) + '</div>' : '')
            + (paras ? '<div class="team-bio">' + paras + '</div><button type="button" class="team-more" aria-expanded="false" hidden>Leer más</button>' : '')
            + '</article>';
        }).join('');
        section.hidden = false;
        // "Leer más" solo si el texto no cabe en las líneas visibles.
        grid.querySelectorAll('.team-card').forEach(function(card) {
          var bioEl = card.querySelector('.team-bio');
          var btn = card.querySelector('.team-more');
          if (!bioEl || !btn) return;
          if (bioEl.scrollHeight > bioEl.clientHeight + 2) btn.hidden = false;
          btn.addEventListener('click', function() {
            var open = card.classList.toggle('open');
            btn.setAttribute('aria-expanded', open ? 'true' : 'false');
            btn.textContent = open ? 'Leer menos' : 'Leer más';
          });
        });
      })
      .catch(function() { section.hidden = true; });
  }

  function loadTestimonials() {
    var container = document.getElementById('testimonialsList');
    if (!container) return;
    return fetch('_data/reviews/index.json?t=' + Date.now())
      .then(function(r) { return r.json(); })
      .then(function(reviews) {
        container.innerHTML = '';
        reviews.forEach(function(r) {
          var stars = '';
          for (var i = 0; i < (r.rating || 5); i++) stars += '\u2605';
          var initials = r.author.split(' ').map(function(w){return w[0]}).join('');
          var card = document.createElement('div');
          card.className = 'review-home reveal';
          card.innerHTML = '<div class="review-home-stars">' + stars + '</div>' +
            '<blockquote>"' + r.text + '"</blockquote>' +
            '<div class="review-home-author"><div class="review-home-avatar">' + initials + '</div>' +
            '<div><div class="review-home-name">' + r.author + '</div>' +
            '<div class="review-home-pet">' + r.pet + '</div></div></div>';
          container.appendChild(card);
        });
      })
      .catch(function() {});
  }

  // Carrusel de la foto enmarcada de la portada: las fotos pasan solas cada
  // 6 s con un fundido; los puntos permiten elegir una. Cada foto se descarga
  // justo antes de mostrarla.
  var HERO_INTERVAL = 6000;
  function heroCarousel(photos) {
    var box = document.getElementById('heroCarousel');
    var dots = document.getElementById('heroDots');
    if (!box || !photos.length) return;
    box.querySelectorAll('.hero-slide').forEach(function(el) { el.remove(); });
    if (dots) dots.innerHTML = '';
    var slides = photos.map(function(p, i) {
      var el = document.createElement('img');
      el.className = 'hero-slide';
      el.alt = p.title || 'Instalaciones de la clínica';
      el.dataset.src = p.image;
      box.insertBefore(el, dots);
      if (dots && photos.length > 1) {
        var b = document.createElement('button');
        b.className = 'hero-dot';
        b.type = 'button';
        b.setAttribute('aria-label', 'Ver foto ' + (i + 1) + (p.title ? ': ' + p.title : ''));
        b.addEventListener('click', function() { show(i); restart(); });
        dots.appendChild(b);
      }
      return el;
    });
    var current = -1, timer = null;

    function load(i) {
      var el = slides[i];
      if (el.dataset.src) { el.src = el.dataset.src; delete el.dataset.src; }
    }
    function show(i) {
      if (i === current) return;
      load(i);
      load((i + 1) % slides.length); // la siguiente ya va descargándose
      slides.forEach(function(el, j) {
        el.classList.toggle('active', j === i);
        // Reinicia el zoom suave de la foto que entra
        if (j === i) { el.style.animation = 'none'; void el.offsetWidth; el.style.animation = ''; }
      });
      if (dots) Array.prototype.forEach.call(dots.children, function(d, j) { d.classList.toggle('active', j === i); });
      current = i;
    }
    function restart() {
      clearInterval(timer);
      // Pasa siempre solo. Con "reducir animaciones" el CSS quita el zoom y
      // queda solo el fundido (muchos Windows lo tienen activado sin saberlo).
      if (slides.length > 1) timer = setInterval(function() { show((current + 1) % slides.length); }, HERO_INTERVAL);
    }
    show(0);
    restart();
    // Sin animación mientras la pestaña está oculta
    document.addEventListener('visibilitychange', function() { if (document.hidden) clearInterval(timer); else restart(); });
  }

  function loadPhotos() {
    return fetch('_data/photos/index.json?t=' + Date.now())
      .then(function(r) { return r.json(); })
      .then(function(photos) {
        // Fondo fijo de la portada (usage=fondo)
        var bgPhoto = photos.filter(function(p){ return p.usage === 'fondo' && p.image; })[0];
        var heroBg = document.getElementById('heroBg');
        if (heroBg && bgPhoto) heroBg.style.backgroundImage = 'url("' + bgPhoto.image.replace(/"/g, '%22') + '")';
        // Carrusel de la foto enmarcada: fotos con la casilla marcada en el panel
        heroCarousel(photos.filter(function(p){ return p.image && p.carousel; }));
        // About page photos (usage=nosotros)
        var nosotrosPhotos = photos.filter(function(p){return p.usage==='nosotros'});
        var aboutImg = document.querySelector('.about-img img');
        if (aboutImg && nosotrosPhotos.length > 0) {
          aboutImg.src = nosotrosPhotos[0].image;
        }
        // Nosotros gallery
        var gallery = document.getElementById('nosotrosGallery');
        if (gallery && nosotrosPhotos.length > 0) {
          gallery.innerHTML = nosotrosPhotos.map(function(p) {
            return '<div style="border-radius:12px;overflow:hidden;aspect-ratio:4/3;position:relative">' +
              '<img src="' + p.image + '" alt="' + (p.title || '') + '" loading="lazy" style="width:100%;height:100%;object-fit:cover;display:block">' +
              (p.title ? '<div style="position:absolute;bottom:0;left:0;right:0;padding:8px 12px;background:linear-gradient(transparent,rgba(0,0,0,.6));color:white;font-size:12px;font-weight:600">' + p.title + '</div>' : '') +
              '</div>';
          }).join('');
        }
        // Services page photos (usage=servicios)
        var svcPhotos = photos.filter(function(p){return p.usage==='servicios'});
        var svcItems = document.querySelectorAll('.svc-img img');
        svcItems.forEach(function(img, i) {
          if (svcPhotos[i % svcPhotos.length]) {
            img.src = svcPhotos[i % svcPhotos.length].image;
          }
        });
      })
      .catch(function() {});
  }

  function resetColors() {
    var root = document.documentElement;
    root.style.setProperty('--forest', DEFAULT_COLORS.primary);
    root.style.setProperty('--forest-light', DEFAULT_COLORS.primaryLight);
    root.style.setProperty('--sage', DEFAULT_COLORS.sage);
    root.style.setProperty('--coral', DEFAULT_COLORS.coral);
    root.style.setProperty('--coral-dark', DEFAULT_COLORS.coralDark);
    root.style.setProperty('--cream', DEFAULT_COLORS.cream);
    root.style.setProperty('--charcoal', DEFAULT_COLORS.charcoal);
    root.style.setProperty('--white', DEFAULT_COLORS.white);
  }

  return {
    applyColors: applyColors,
    loadSettings: loadSettings,
    loadTestimonials: loadTestimonials,
    loadHomePlans: loadHomePlans,
    loadHomeProducts: loadHomeProducts,
    loadHomeServices: loadHomeServices,
    loadTeam: loadTeam,
    loadPhotos: loadPhotos,
    resetColors: resetColors,
    shortName: shortName,
    storeEnabled: storeEnabled,
    AGENCY: AGENCY,
    COLOR_ROLES: COLOR_ROLES,
    DEFAULT_COLORS: DEFAULT_COLORS
  };
})();
