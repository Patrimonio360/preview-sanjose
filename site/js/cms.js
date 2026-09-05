var CMS = (function() {
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

  function applyColors() {
    return fetch('_data/colors.json?t=' + Date.now())
      .then(function(r) { return r.json(); })
      .then(function(c) {
        var root = document.documentElement;
        var map = {primary:'--forest',primaryLight:'--forest-light',sage:'--sage',coral:'--coral',coralDark:'--coral-dark',cream:'--cream',charcoal:'--charcoal',white:'--white'};
        Object.keys(map).forEach(function(k){if(c[k])root.style.setProperty(map[k],c[k]);});
        document.body.classList.add('colors-loaded');
      })
      .catch(function() {});
  }

  function loadSettings() {
    return fetch('_data/settings.json?t=' + Date.now())
      .then(function(r) { return r.json(); })
      .then(function(s) {
        // Nav phone
        var navPhone = document.querySelector('.nav-cta');
        if (navPhone) {
          navPhone.href = 'tel:' + s.phone.replace(/\s/g, '');
          navPhone.innerHTML = '\u260E ' + s.phone;
        }
        // Hero badge hours
        var heroBadge = document.querySelector('.hero-badge span');
        if (heroBadge && s.hours) {
          heroBadge.textContent = 'Abierto ahora \u00B7 ' + s.hours;
        }
        // Footer brand
        var footerBrand = document.querySelector('.footer-brand');
        if (footerBrand && s.name) {
          footerBrand.textContent = s.name;
        }
        // Footer description
        var footerDesc = document.querySelector('.footer-desc');
        if (footerDesc && s.footerDesc) {
          footerDesc.textContent = s.footerDesc;
        }
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
        // Footer social links
        var socialLinks = document.querySelectorAll('.footer-social a');
        socialLinks.forEach(function(a) {
          if (s.facebook && a.href.includes('facebook.com')) {
            a.href = s.facebook;
          }
          if (s.instagram && a.href.includes('instagram.com')) {
            a.href = s.instagram;
          }
        });
        // WhatsApp buttons
        var whatsappBtns = document.querySelectorAll('[href*="wa.me/"]');
        whatsappBtns.forEach(function(a) {
          a.href = 'https://wa.me/' + s.whatsapp;
        });
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
        if (contactoHours && s.hours) {
          contactoHours.innerHTML = s.hours.replace(/\n/g, '<br>');
        }
        // Aviso legal CIF
        var avisoCif = document.querySelector('.aviso-cif');
        if (avisoCif && s.cif) {
          avisoCif.textContent = s.cif;
        }
        // Trust stats
        var trustYears = document.querySelector('[data-trust="years"]');
        if (trustYears && s.trustYears) trustYears.textContent = s.trustYears;
        var trustFamilies = document.querySelector('[data-trust="families"]');
        if (trustFamilies && s.trustFamilies) trustFamilies.textContent = s.trustFamilies;
        var trustLab = document.querySelector('[data-trust="lab"]');
        if (trustLab && s.trustLab) trustLab.textContent = s.trustLab;
        var trustAccessible = document.querySelector('[data-trust="accessible"]');
        if (trustAccessible && s.trustAccessible) trustAccessible.textContent = s.trustAccessible;
      })
      .catch(function() {});
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

  function loadPhotos() {
    return fetch('_data/photos/index.json?t=' + Date.now())
      .then(function(r) { return r.json(); })
      .then(function(photos) {
        // Hero photos (usage=hero)
        var heroPhotos = photos.filter(function(p){return p.usage==='hero'});
        var heroImg = document.querySelector('.hero-img img');
        if (heroImg && heroPhotos.length > 0) {
          heroImg.src = heroPhotos[0].image;
        }
        // Hero avatars
        var heroAvatars = document.querySelectorAll('.hero-proof-avatar img, .hero-img-label-avatar img');
        heroAvatars.forEach(function(img, i) {
          if (heroPhotos[i % heroPhotos.length]) {
            img.src = heroPhotos[i % heroPhotos.length].image;
          }
        });
        // About page photos (usage=nosotros)
        var nosotrosPhotos = photos.filter(function(p){return p.usage==='nosotros'});
        var aboutImg = document.querySelector('.about-img img');
        if (aboutImg && nosotrosPhotos.length > 0) {
          aboutImg.src = nosotrosPhotos[0].image;
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
    loadPhotos: loadPhotos,
    resetColors: resetColors,
    DEFAULT_COLORS: DEFAULT_COLORS
  };
})();
