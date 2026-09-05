// Preview Templates for Decap CMS
// Shows visual previews for Products, Services, and Plans

(function() {
  // Wait for CMS to be ready
  if (typeof CMS === 'undefined') {
    console.warn('CMS not loaded yet');
    return;
  }

  // ========================
  // PRODUCTS PREVIEW
  // ========================
  CMS.registerPreviewTemplate('products', function(props) {
    var entry = props.entry;
    var data = entry.get('data');
    var name = data.get('name') || 'Producto';
    var brand = data.get('brand') || '';
    var price = data.get('price') || 0;
    var image = data.get('image') || '';
    var tag = data.get('tag') || '';
    var description = data.get('description') || '';
    var category = data.get('category') || '';

    var html = '<div style="font-family:Inter,system-ui,sans-serif;max-width:400px;margin:20px auto;padding:16px;background:#FBF9F5;border-radius:16px;">';
    
    // Image
    html += '<div style="width:100%;aspect-ratio:1;overflow:hidden;border-radius:12px;margin-bottom:16px;background:#eee;">';
    if (image) {
      html += '<img src="' + image + '" style="width:100%;height:100%;object-fit:cover;" />';
    } else {
      html += '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#999;font-size:48px;">📷</div>';
    }
    html += '</div>';
    
    // Tag
    if (tag) {
      html += '<div style="position:relative;margin-top:-48px;margin-left:12px;margin-bottom:12px;">';
      html += '<span style="background:#D4764E;color:white;font-size:11px;font-weight:700;padding:4px 12px;border-radius:50px;">' + tag + '</span>';
      html += '</div>';
    }
    
    // Info
    html += '<div style="padding:0 4px;">';
    html += '<div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">' + brand + '</div>';
    html += '<div style="font-size:14px;font-weight:600;color:#1C1C1C;margin-bottom:8px;line-height:1.3;">' + name + '</div>';
    html += '<div style="font-family:Fraunces,serif;font-size:20px;color:#1A3C2A;margin-bottom:12px;">' + price.toFixed(2) + '€</div>';
    
    if (description) {
      html += '<div style="font-size:12px;color:#666;line-height:1.6;margin-bottom:16px;">' + description.substring(0, 120) + (description.length > 120 ? '...' : '') + '</div>';
    }
    
    // Button
    html += '<button style="width:100%;padding:12px;border-radius:50px;background:#1A3C2A;color:white;border:none;font-size:13px;font-weight:600;cursor:pointer;">Añadir al carrito</button>';
    html += '</div>';
    
    html += '</div>';
    
    return html;
  });

  // ========================
  // SERVICES PREVIEW
  // ========================
  CMS.registerPreviewTemplate('services', function(props) {
    var entry = props.entry;
    var data = entry.get('data');
    var name = data.get('name') || 'Servicio';
    var icon = data.get('icon') || '🩺';
    var shortDesc = data.get('shortDesc') || '';
    var description = data.get('description') || '';
    var image = data.get('image') || '';
    var features = data.get('features') || [];

    var html = '<div style="font-family:Inter,system-ui,sans-serif;max-width:600px;margin:20px auto;padding:24px;background:white;border-radius:16px;box-shadow:0 4px 20px rgba(0,0,0,0.08);">';
    
    // Header with icon
    html += '<div style="display:flex;align-items:center;gap:16px;margin-bottom:20px;">';
    html += '<div style="width:56px;height:56px;background:#FBF9F5;border-radius:16px;display:flex;align-items:center;justify-content:center;font-size:28px;">' + icon + '</div>';
    html += '<div>';
    html += '<h3 style="font-size:18px;font-weight:700;color:#1C1C1C;margin:0 0 4px 0;">' + name + '</h3>';
    if (shortDesc) {
      html += '<p style="font-size:13px;color:#888;margin:0;">' + shortDesc + '</p>';
    }
    html += '</div>';
    html += '</div>';
    
    // Image
    if (image) {
      html += '<div style="width:100%;border-radius:12px;overflow:hidden;margin-bottom:20px;">';
      html += '<img src="' + image + '" style="width:100%;aspect-ratio:16/10;object-fit:cover;display:block;" />';
      html += '</div>';
    }
    
    // Description
    if (description) {
      html += '<div style="font-size:14px;color:#555;line-height:1.8;margin-bottom:20px;">' + description + '</div>';
    }
    
    // Features list
    if (features && features.size > 0) {
      html += '<div style="margin-bottom:20px;">';
      features.forEach(function(f) {
        var featureText = typeof f === 'object' ? (f.get('feature') || f.get('')) : f;
        if (featureText) {
          html += '<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #f0f0f0;">';
          html += '<span style="color:#2D6B45;font-weight:700;font-size:12px;">✓</span>';
          html += '<span style="font-size:13px;color:#555;">' + featureText + '</span>';
          html += '</div>';
        }
      });
      html += '</div>';
    }
    
    // CTA button
    html += '<a href="#" style="display:block;text-align:center;padding:12px;border-radius:50px;background:#1A3C2A;color:white;text-decoration:none;font-size:13px;font-weight:600;">Solicitar cita →</a>';
    
    html += '</div>';
    
    return html;
  });

  // ========================
  // PLANS PREVIEW
  // ========================
  CMS.registerPreviewTemplate('plans', function(props) {
    var entry = props.entry;
    var data = entry.get('data');
    var name = data.get('name') || 'Plan';
    var icon = data.get('icon') || '📋';
    var price = data.get('price') || 0;
    var period = data.get('period') || 'mes';
    var description = data.get('description') || '';
    var badge = data.get('badge') || '';
    var savings = data.get('savings') || '';
    var features = data.get('features') || [];

    var html = '<div style="font-family:Inter,system-ui,sans-serif;max-width:340px;margin:20px auto;padding:32px 24px;background:white;border-radius:20px;box-shadow:0 4px 20px rgba(0,0,0,0.08);text-align:center;position:relative;border:2px solid ' + (badge ? '#D4764E' : 'transparent') + ';">';
    
    // Badge
    if (badge) {
      html += '<div style="position:absolute;top:-12px;left:50%;transform:translateX(-50%);background:#D4764E;color:white;font-size:11px;font-weight:700;padding:4px 14px;border-radius:50px;text-transform:uppercase;letter-spacing:0.5px;">' + badge + '</div>';
    }
    
    // Icon
    html += '<div style="font-size:36px;margin-bottom:12px;">' + icon + '</div>';
    
    // Name
    html += '<div style="font-size:13px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">' + name + '</div>';
    
    // Price
    html += '<div style="font-family:Fraunces,serif;font-size:36px;color:#1A3C2A;margin-bottom:4px;line-height:1;">';
    html += '<span>' + price.toFixed(2).replace('.', ',') + '</span>';
    html += '</div>';
    html += '<div style="font-size:13px;color:#888;margin-bottom:20px;">€/' + period + '</div>';
    
    // Savings
    if (savings) {
      html += '<div style="font-size:12px;color:#2D6B45;font-weight:600;margin-bottom:16px;padding:6px 12px;background:#E8F5E9;border-radius:8px;display:inline-block;">' + savings + '</div>';
    }
    
    // Description
    if (description) {
      html += '<div style="font-size:13px;color:#666;line-height:1.6;margin-bottom:20px;">' + description + '</div>';
    }
    
    // Features list
    if (features && features.size > 0) {
      html += '<div style="text-align:left;margin-bottom:24px;">';
      features.forEach(function(f) {
        var featureText = typeof f === 'object' ? (f.get('feature') || f.get('')) : f;
        if (featureText) {
          html += '<div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid #f0f0f0;font-size:13px;color:#555;">';
          html += '<span style="color:#2D6B45;font-weight:700;">✓</span>';
          html += '<span>' + featureText + '</span>';
          html += '</div>';
        }
      });
      html += '</div>';
    }
    
    // CTA button
    var btnBg = badge ? '#D4764E' : '#1A3C2A';
    html += '<a href="#" style="display:block;width:100%;padding:12px;border-radius:50px;background:' + btnBg + ';color:white;text-decoration:none;font-size:13px;font-weight:600;">Ver detalles →</a>';
    
    html += '</div>';
    
    return html;
  });

  // ========================
  // REVIEWS PREVIEW
  // ========================
  CMS.registerPreviewTemplate('reviews', function(props) {
    var entry = props.entry;
    var data = entry.get('data');
    var author = data.get('author') || 'Anónimo';
    var pet = data.get('pet') || '';
    var text = data.get('text') || '';
    var rating = data.get('rating') || 5;

    var initials = author.split(' ').map(function(w) { return w[0] || ''; }).join('').substring(0, 2);
    var stars = '';
    for (var i = 0; i < rating; i++) stars += '★';
    for (var i = rating; i < 5; i++) stars += '☆';

    var html = '<div style="font-family:Inter,system-ui,sans-serif;max-width:400px;margin:20px auto;padding:24px;background:white;border-radius:16px;box-shadow:0 4px 20px rgba(0,0,0,0.06);">';
    
    // Stars
    html += '<div style="color:#F4B400;font-size:14px;letter-spacing:2px;margin-bottom:12px;">' + stars + '</div>';
    
    // Quote
    html += '<blockquote style="font-size:14px;line-height:1.7;color:#555;font-style:italic;margin:0 0 16px 0;">"' + text + '"</blockquote>';
    
    // Author
    html += '<div style="display:flex;align-items:center;gap:10px;">';
    html += '<div style="width:36px;height:36px;border-radius:50%;background:#1A3C2A;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:white;">' + initials + '</div>';
    html += '<div>';
    html += '<div style="font-size:13px;font-weight:600;color:#1C1C1C;">' + author + '</div>';
    if (pet) {
      html += '<div style="font-size:11px;color:#888;">' + pet + '</div>';
    }
    html += '</div>';
    html += '</div>';
    
    html += '</div>';
    
    return html;
  });

  // ========================
  // PHOTOS PREVIEW
  // ========================
  CMS.registerPreviewTemplate('photos', function(props) {
    var entry = props.entry;
    var data = entry.get('data');
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

    var html = '<div style="font-family:Inter,system-ui,sans-serif;max-width:400px;margin:20px auto;padding:16px;background:white;border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,0.06);">';
    
    // Image
    if (image) {
      html += '<div style="width:100%;border-radius:8px;overflow:hidden;margin-bottom:12px;">';
      html += '<img src="' + image + '" style="width:100%;aspect-ratio:16/10;object-fit:cover;display:block;" />';
      html += '</div>';
    }
    
    // Title
    html += '<div style="font-size:14px;font-weight:600;color:#1C1C1C;margin-bottom:4px;">' + title + '</div>';
    
    // Usage badge
    html += '<div style="display:inline-block;font-size:11px;padding:4px 10px;background:#FBF9F5;border-radius:6px;color:#666;margin-bottom:8px;">' + (usageLabels[usage] || usage) + '</div>';
    
    // Description
    if (description) {
      html += '<div style="font-size:12px;color:#888;line-height:1.5;">' + description + '</div>';
    }
    
    html += '</div>';
    
    return html;
  });

  // ========================
  // SETTINGS PREVIEW
  // ========================
  CMS.registerPreviewTemplate('settings', function(props) {
    var entry = props.entry;
    var data = entry.get('data');

    var html = '<div style="font-family:Inter,system-ui,sans-serif;max-width:500px;margin:20px auto;padding:24px;background:white;border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,0.06);">';
    html += '<h3 style="font-size:16px;font-weight:700;color:#1C1C1C;margin:0 0 16px 0;padding-bottom:12px;border-bottom:1px solid #eee;">Vista previa de ajustes</h3>';
    
    var fields = [
      { key: 'name', label: 'Nombre', icon: '🏥' },
      { key: 'address', label: 'Direccion', icon: '📍' },
      { key: 'phone', label: 'Telefono', icon: '☎️' },
      { key: 'email', label: 'Email', icon: '✉️' },
      { key: 'hours', label: 'Horario', icon: '📅' },
      { key: 'cif', label: 'CIF/NIF', icon: '📋' },
      { key: 'whatsapp', label: 'WhatsApp', icon: '💬' },
      { key: 'footerDesc', label: 'Texto footer', icon: '📝' }
    ];
    
    fields.forEach(function(f) {
      var val = data.get(f.key) || '';
      if (val) {
        html += '<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid #f5f5f5;">';
        html += '<span style="font-size:16px;">' + f.icon + '</span>';
        html += '<div>';
        html += '<div style="font-size:11px;color:#888;text-transform:uppercase;">' + f.label + '</div>';
        html += '<div style="font-size:13px;color:#333;font-weight:500;">' + val + '</div>';
        html += '</div>';
        html += '</div>';
      }
    });
    
    html += '</div>';
    
    return html;
  });

  // ========================
  // CHATBOT PREVIEW
  // ========================
  CMS.registerPreviewTemplate('chatbot', function(props) {
    var entry = props.entry;
    var data = entry.get('data');
    var keywords = data.get('keywords') || '';
    var response = data.get('response') || '';

    var html = '<div style="font-family:Inter,system-ui,sans-serif;max-width:400px;margin:20px auto;padding:16px;background:white;border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,0.06);">';
    
    // Keywords
    html += '<div style="margin-bottom:12px;">';
    html += '<div style="font-size:11px;color:#888;text-transform:uppercase;margin-bottom:6px;">Palabras clave</div>';
    html += '<div style="display:flex;flex-wrap:wrap;gap:6px;">';
    keywords.split(',').forEach(function(kw) {
      kw = kw.trim();
      if (kw) {
        html += '<span style="font-size:11px;padding:4px 10px;background:#E8F5E9;color:#2D6B45;border-radius:20px;">' + kw + '</span>';
      }
    });
    html += '</div>';
    html += '</div>';
    
    // Response
    html += '<div>';
    html += '<div style="font-size:11px;color:#888;text-transform:uppercase;margin-bottom:6px;">Respuesta del bot</div>';
    html += '<div style="padding:12px;background:#f5f5f5;border-radius:8px;font-size:13px;color:#333;line-height:1.6;">' + response + '</div>';
    html += '</div>';
    
    html += '</div>';
    
    return html;
  });

  console.log('Preview templates loaded');
})();
