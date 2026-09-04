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
          navPhone.innerHTML = '&#9742; ' + s.phone;
        }
        // Hero badge hours
        var heroBadge = document.querySelector('.hero-badge span');
        if (heroBadge && s.hours) {
          heroBadge.textContent = 'Abierto ahora · ' + s.hours;
        }
        // Footer brand
        var footerBrand = document.querySelector('.footer-brand');
        if (footerBrand && s.name) {
          footerBrand.textContent = '🐾 ' + s.name;
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

  return { applyColors: applyColors, loadSettings: loadSettings, resetColors: resetColors, DEFAULT_COLORS: DEFAULT_COLORS };
})();
