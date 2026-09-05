// Preview Templates for Decap CMS
// Uses h() and createClass() globals provided by Decap CMS (NOT React directly)

(function() {
  // Debug: check what globals are available
  console.log('Preview templates loading...', {
    h: typeof h,
    createClass: typeof createClass,
    CMS: typeof CMS,
    React: typeof React
  });

  // Get h from any available source
  var hFunc = (typeof h === 'function') ? h
    : (typeof React === 'object' && React && typeof React.createElement === 'function') ? React.createElement
    : null;

  if (!hFunc) {
    console.error('Preview templates: h/React.createElement not available');
    return;
  }

  var createClassFunc = (typeof createClass === 'function') ? createClass
    : (typeof React === 'object' && React && typeof React.createClass === 'function') ? React.createClass
    : null;

  function render(html) {
    return hFunc('div', {
      dangerouslySetInnerHTML: { __html: html },
      style: { padding: '20px' }
    });
  }

  // ========================
  // PRODUCTS PREVIEW
  // ========================
  CMS.registerPreviewTemplate('products', createClassFunc({
    render: function() {
      var data = this.props.entry.get('data');
      var products = data.get('products') || data;

      // If it's a list of products, render all
      var items = [];
      if (products && typeof products.forEach === 'function') {
        products.forEach(function(p) {
          items.push(p);
        });
      } else if (products && products.toJS) {
        items = products.toJS();
      }

      // If no items found, try treating data as single product
      if (items.length === 0) {
        items = [data];
      }

      var allHtml = '<div style="font-family:Inter,system-ui,sans-serif;padding:16px;">'
        + '<h2 style="font-size:20px;font-weight:700;color:#1C1C1C;margin:0 0 16px 0;">Productos (' + items.length + ')</h2>'
        + '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px;">';

      items.forEach(function(item) {
        var name = item.get ? (item.get('name') || 'Producto') : (item.name || 'Producto');
        var brand = item.get ? (item.get('brand') || '') : (item.brand || '');
        var price = item.get ? (item.get('price') || 0) : (item.price || 0);
        var image = item.get ? (item.get('image') || '') : (item.image || '');
        var tag = item.get ? (item.get('tag') || '') : (item.tag || '');
        var description = item.get ? (item.get('description') || '') : (item.description || '');

        var imgHtml = image
          ? '<img src="' + image + '" style="width:100%;height:100%;object-fit:cover;" />'
          : '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#999;font-size:48px;">\uD83D\uDCF7</div>';

        var tagHtml = tag
          ? '<div style="position:relative;margin-top:-48px;margin-left:12px;margin-bottom:12px;"><span style="background:#D4764E;color:white;font-size:11px;font-weight:700;padding:4px 12px;border-radius:50px;">' + tag + '</span></div>'
          : '';

        allHtml += '<div style="background:#FBF9F5;border-radius:16px;overflow:hidden;">'
          + '<div style="width:100%;aspect-ratio:1;overflow:hidden;background:#eee;">' + imgHtml + '</div>'
          + tagHtml
          + '<div style="padding:0 16px 16px;">'
          + '<div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">' + brand + '</div>'
          + '<div style="font-size:14px;font-weight:600;color:#1C1C1C;margin-bottom:8px;line-height:1.3;">' + name + '</div>'
          + '<div style="font-family:Fraunces,serif;font-size:20px;color:#1A3C2A;margin-bottom:12px;">' + (typeof price === 'number' ? price.toFixed(2) : price) + '\u20AC</div>'
          + '<button style="width:100%;padding:12px;border-radius:50px;background:#1A3C2A;color:white;border:none;font-size:13px;font-weight:600;cursor:pointer;">A\u00F1adir al carrito</button>'
          + '</div></div>';
      });

      allHtml += '</div></div>';
      return render(allHtml);
    }
  }));

  // ========================
  // SERVICES PREVIEW
  // ========================
  CMS.registerPreviewTemplate('services', createClassFunc({
    render: function() {
      var data = this.props.entry.get('data');
      var services = data.get('services') || data;

      var items = [];
      if (services && typeof services.forEach === 'function') {
        services.forEach(function(s) { items.push(s); });
      } else if (services && services.toJS) {
        items = services.toJS();
      }
      if (items.length === 0) items = [data];

      var allHtml = '<div style="font-family:Inter,system-ui,sans-serif;padding:16px;">'
        + '<h2 style="font-size:20px;font-weight:700;color:#1C1C1C;margin:0 0 16px 0;">Servicios (' + items.length + ')</h2>';

      items.forEach(function(item) {
        var name = item.get ? (item.get('name') || 'Servicio') : (item.name || 'Servicio');
        var icon = item.get ? (item.get('icon') || '\uD83E\uDE7A') : (item.icon || '\uD83E\uDE7A');
        var shortDesc = item.get ? (item.get('shortDesc') || '') : (item.shortDesc || '');
        var description = item.get ? (item.get('description') || '') : (item.description || '');
        var image = item.get ? (item.get('image') || '') : (item.image || '');
        var features = item.get ? item.get('features') : (item.features || []);

        var imgHtml = image
          ? '<div style="width:100%;border-radius:12px;overflow:hidden;margin-bottom:20px;"><img src="' + image + '" style="width:100%;aspect-ratio:16/10;object-fit:cover;display:block;" /></div>'
          : '';

        var featuresHtml = '';
        if (features && features.size > 0) {
          featuresHtml = '<div style="margin-bottom:20px;">';
          features.forEach(function(f) {
            var ft = typeof f === 'object' ? (f.get ? (f.get('feature') || f.get('')) : (f.feature || f)) : f;
            if (ft) {
              featuresHtml += '<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #f0f0f0;">'
                + '<span style="color:#2D6B45;font-weight:700;font-size:12px;">\u2713</span>'
                + '<span style="font-size:13px;color:#555;">' + ft + '</span></div>';
            }
          });
          featuresHtml += '</div>';
        }

        allHtml += '<div style="background:white;border-radius:16px;box-shadow:0 4px 20px rgba(0,0,0,0.08);overflow:hidden;margin-bottom:16px;">'
          + '<div style="padding:24px;">'
          + '<div style="display:flex;align-items:center;gap:16px;margin-bottom:20px;">'
          + '<div style="width:56px;height:56px;background:#FBF9F5;border-radius:16px;display:flex;align-items:center;justify-content:center;font-size:28px;flex-shrink:0;">' + icon + '</div>'
          + '<div><h3 style="font-size:18px;font-weight:700;color:#1C1C1C;margin:0 0 4px 0;">' + name + '</h3>'
          + (shortDesc ? '<p style="font-size:13px;color:#888;margin:0;">' + shortDesc + '</p>' : '')
          + '</div></div>'
          + imgHtml
          + (description ? '<div style="font-size:14px;color:#555;line-height:1.8;margin-bottom:20px;">' + description + '</div>' : '')
          + featuresHtml
          + '<a href="#" style="display:block;text-align:center;padding:12px;border-radius:50px;background:#1A3C2A;color:white;text-decoration:none;font-size:13px;font-weight:600;">Solicitar cita \u2192</a>'
          + '</div></div>';
      });

      allHtml += '</div>';
      return render(allHtml);
    }
  }));

  // ========================
  // PLANS PREVIEW
  // ========================
  CMS.registerPreviewTemplate('plans', createClassFunc({
    render: function() {
      var data = this.props.entry.get('data');
      var plans = data.get('plans') || data;

      var items = [];
      if (plans && typeof plans.forEach === 'function') {
        plans.forEach(function(p) { items.push(p); });
      } else if (plans && plans.toJS) {
        items = plans.toJS();
      }
      if (items.length === 0) items = [data];

      var allHtml = '<div style="font-family:Inter,system-ui,sans-serif;padding:16px;">'
        + '<h2 style="font-size:20px;font-weight:700;color:#1C1C1C;margin:0 0 16px 0;">Planes de Salud (' + items.length + ')</h2>'
        + '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;">';

      items.forEach(function(item) {
        var name = item.get ? (item.get('name') || 'Plan') : (item.name || 'Plan');
        var icon = item.get ? (item.get('icon') || '\uD83D\uDCCB') : (item.icon || '\uD83D\uDCCB');
        var price = item.get ? (item.get('price') || 0) : (item.price || 0);
        var period = item.get ? (item.get('period') || 'mes') : (item.period || 'mes');
        var description = item.get ? (item.get('description') || '') : (item.description || '');
        var badge = item.get ? (item.get('badge') || '') : (item.badge || '');
        var savings = item.get ? (item.get('savings') || '') : (item.savings || '');
        var features = item.get ? item.get('features') : (item.features || []);

        var borderColor = badge ? '#D4764E' : 'transparent';
        var badgeHtml = badge
          ? '<div style="position:absolute;top:-12px;left:50%;transform:translateX(-50%);background:#D4764E;color:white;font-size:11px;font-weight:700;padding:4px 14px;border-radius:50px;text-transform:uppercase;letter-spacing:0.5px;">' + badge + '</div>'
          : '';

        var savingsHtml = savings
          ? '<div style="font-size:12px;color:#2D6B45;font-weight:600;margin-bottom:16px;padding:6px 12px;background:#E8F5E9;border-radius:8px;display:inline-block;">' + savings + '</div>'
          : '';

        var featuresHtml = '';
        if (features && features.size > 0) {
          featuresHtml = '<div style="text-align:left;margin-bottom:24px;">';
          features.forEach(function(f) {
            var ft = typeof f === 'object' ? (f.get ? (f.get('feature') || f.get('')) : (f.feature || f)) : f;
            if (ft) {
              featuresHtml += '<div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid #f0f0f0;font-size:13px;color:#555;">'
                + '<span style="color:#2D6B45;font-weight:700;">\u2713</span>'
                + '<span>' + ft + '</span></div>';
            }
          });
          featuresHtml += '</div>';
        }

        var btnBg = badge ? '#D4764E' : '#1A3C2A';
        var priceStr = (typeof price === 'number' ? price.toFixed(2) : price).replace('.', ',');

        allHtml += '<div style="background:white;border-radius:20px;box-shadow:0 4px 20px rgba(0,0,0,0.08);text-align:center;position:relative;border:2px solid ' + borderColor + ';padding:32px 24px;">'
          + badgeHtml
          + '<div style="font-size:36px;margin-bottom:12px;">' + icon + '</div>'
          + '<div style="font-size:13px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">' + name + '</div>'
          + '<div style="font-family:Fraunces,serif;font-size:36px;color:#1A3C2A;margin-bottom:4px;line-height:1;"><span>' + priceStr + '</span></div>'
          + '<div style="font-size:13px;color:#888;margin-bottom:20px;">\u20AC/' + period + '</div>'
          + savingsHtml
          + (description ? '<div style="font-size:13px;color:#666;line-height:1.6;margin-bottom:20px;">' + description + '</div>' : '')
          + featuresHtml
          + '<a href="#" style="display:block;width:100%;padding:12px;border-radius:50px;background:' + btnBg + ';color:white;text-decoration:none;font-size:13px;font-weight:600;">Ver detalles \u2192</a>'
          + '</div>';
      });

      allHtml += '</div></div>';
      return render(allHtml);
    }
  }));

  // ========================
  // REVIEWS PREVIEW
  // ========================
  CMS.registerPreviewTemplate('reviews', createClassFunc({
    render: function() {
      var data = this.props.entry.get('data');
      var author = data.get('author') || 'An\u00F3nimo';
      var pet = data.get('pet') || '';
      var text = data.get('text') || '';
      var rating = data.get('rating') || 5;

      var initials = author.split(' ').map(function(w) { return w[0] || ''; }).join('').substring(0, 2);
      var stars = '';
      for (var i = 0; i < rating; i++) stars += '\u2605';
      for (var i = rating; i < 5; i++) stars += '\u2606';

      var html = ''
        + '<div style="font-family:Inter,system-ui,sans-serif;max-width:400px;margin:0 auto;background:white;border-radius:16px;box-shadow:0 4px 20px rgba(0,0,0,0.06);padding:24px;">'
        + '<div style="color:#F4B400;font-size:14px;letter-spacing:2px;margin-bottom:12px;">' + stars + '</div>'
        + '<blockquote style="font-size:14px;line-height:1.7;color:#555;font-style:italic;margin:0 0 16px 0;">"' + text + '"</blockquote>'
        + '<div style="display:flex;align-items:center;gap:10px;">'
        + '<div style="width:36px;height:36px;border-radius:50%;background:#1A3C2A;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:white;">' + initials + '</div>'
        + '<div><div style="font-size:13px;font-weight:600;color:#1C1C1C;">' + author + '</div>'
        + (pet ? '<div style="font-size:11px;color:#888;">' + pet + '</div>' : '')
        + '</div></div></div>';

      return render(html);
    }
  }));

  // ========================
  // PHOTOS PREVIEW
  // ========================
  CMS.registerPreviewTemplate('photos', createClassFunc({
    render: function() {
      var data = this.props.entry.get('data');
      var title = data.get('title') || 'Foto';
      var image = data.get('image') || '';
      var usage = data.get('usage') || 'general';
      var description = data.get('description') || '';

      var usageLabels = {
        'hero': 'Portada / Hero',
        'home': 'Inicio',
        'nosotros': 'Nosotros',
        'servicios': 'Servicios',
        'contacto': 'Contacto',
        'general': 'General'
      };

      var imgHtml = image
        ? '<div style="width:100%;border-radius:8px;overflow:hidden;margin-bottom:12px;"><img src="' + image + '" style="width:100%;aspect-ratio:16/10;object-fit:cover;display:block;" /></div>'
        : '';

      var html = ''
        + '<div style="font-family:Inter,system-ui,sans-serif;max-width:400px;margin:0 auto;background:white;border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,0.06);padding:16px;">'
        + imgHtml
        + '<div style="font-size:14px;font-weight:600;color:#1C1C1C;margin-bottom:4px;">' + title + '</div>'
        + '<div style="display:inline-block;font-size:11px;padding:4px 10px;background:#FBF9F5;border-radius:6px;color:#666;margin-bottom:8px;">' + (usageLabels[usage] || usage) + '</div>'
        + (description ? '<div style="font-size:12px;color:#888;line-height:1.5;">' + description + '</div>' : '')
        + '</div>';

      return render(html);
    }
  }));

  // ========================
  // SETTINGS PREVIEW
  // ========================
  CMS.registerPreviewTemplate('settings', createClassFunc({
    render: function() {
      var data = this.props.entry.get('data');

      var fields = [
        { key: 'name', label: 'Nombre', icon: '\uD83C\uDFE5' },
        { key: 'address', label: 'Direccion', icon: '\uD83D\uDCCD' },
        { key: 'phone', label: 'Telefono', icon: '\u260E\uFE0F' },
        { key: 'email', label: 'Email', icon: '\u2709\uFE0F' },
        { key: 'hours', label: 'Horario', icon: '\uD83D\uDCC5' },
        { key: 'cif', label: 'CIF/NIF', icon: '\uD83D\uDCCB' },
        { key: 'whatsapp', label: 'WhatsApp', icon: '\uD83D\uDCAC' },
        { key: 'footerDesc', label: 'Texto footer', icon: '\uD83D\uDCDD' }
      ];

      var rows = '';
      fields.forEach(function(f) {
        var val = data.get(f.key) || '';
        if (val) {
          rows += '<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid #f5f5f5;">'
            + '<span style="font-size:16px;">' + f.icon + '</span>'
            + '<div><div style="font-size:11px;color:#888;text-transform:uppercase;">' + f.label + '</div>'
            + '<div style="font-size:13px;color:#333;font-weight:500;">' + val + '</div></div></div>';
        }
      });

      var html = ''
        + '<div style="font-family:Inter,system-ui,sans-serif;max-width:500px;margin:0 auto;background:white;border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,0.06);padding:24px;">'
        + '<h3 style="font-size:16px;font-weight:700;color:#1C1C1C;margin:0 0 16px 0;padding-bottom:12px;border-bottom:1px solid #eee;">Vista previa de ajustes</h3>'
        + rows + '</div>';

      return render(html);
    }
  }));

  // ========================
  // CHATBOT PREVIEW
  // ========================
  CMS.registerPreviewTemplate('chatbot', createClassFunc({
    render: function() {
      var data = this.props.entry.get('data');
      var keywords = data.get('keywords') || '';
      var response = data.get('response') || '';

      var kwBadges = '';
      keywords.split(',').forEach(function(kw) {
        kw = kw.trim();
        if (kw) {
          kwBadges += '<span style="font-size:11px;padding:4px 10px;background:#E8F5E9;color:#2D6B45;border-radius:20px;margin:2px;">' + kw + '</span>';
        }
      });

      var html = ''
        + '<div style="font-family:Inter,system-ui,sans-serif;max-width:400px;margin:0 auto;background:white;border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,0.06);padding:16px;">'
        + '<div style="margin-bottom:12px;">'
        + '<div style="font-size:11px;color:#888;text-transform:uppercase;margin-bottom:6px;">Palabras clave</div>'
        + '<div style="display:flex;flex-wrap:wrap;gap:6px;">' + kwBadges + '</div></div>'
        + '<div><div style="font-size:11px;color:#888;text-transform:uppercase;margin-bottom:6px;">Respuesta del bot</div>'
        + '<div style="padding:12px;background:#f5f5f5;border-radius:8px;font-size:13px;color:#333;line-height:1.6;">' + response + '</div></div></div>';

      return render(html);
    }
  }));

  console.log('Preview templates loaded successfully');
})();
