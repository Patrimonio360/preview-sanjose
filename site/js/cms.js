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
    return fetch('_data/colors.json')
      .then(function(r) { return r.json(); })
      .then(function(c) {
        var root = document.documentElement;
        if (c.primary) root.style.setProperty('--forest', c.primary);
        if (c.primaryLight) root.style.setProperty('--forest-light', c.primaryLight);
        if (c.sage) root.style.setProperty('--sage', c.sage);
        if (c.coral) root.style.setProperty('--coral', c.coral);
        if (c.coralDark) root.style.setProperty('--coral-dark', c.coralDark);
        if (c.cream) root.style.setProperty('--cream', c.cream);
        if (c.charcoal) root.style.setProperty('--charcoal', c.charcoal);
        if (c.white) root.style.setProperty('--white', c.white);
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

  return { applyColors: applyColors, resetColors: resetColors, DEFAULT_COLORS: DEFAULT_COLORS };
})();
