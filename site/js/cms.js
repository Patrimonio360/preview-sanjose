var CMS = (function() {
  var REPO = 'Patrimonio360/preview-sanjose';
  var BRANCH = 'master';
  var RAW = 'https://raw.githubusercontent.com/' + REPO + '/' + BRANCH;

  function parseYAML(text) {
    var lines = text.split('\n');
    var obj = {};
    var currentKey = null;
    var inList = false;
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (line.match(/^---\s*$/)) continue;
      if (line.match(/^\s*-\s+/) && inList && currentKey) {
        var item = line.replace(/^\s*-\s+/, '').trim();
        if (!Array.isArray(obj[currentKey])) obj[currentKey] = [];
        obj[currentKey].push(item);
        continue;
      }
      var m = line.match(/^(\w+):\s*(.*)/);
      if (m) {
        currentKey = m[1];
        var val = m[2].trim();
        if (val === '' || val === '[]') {
          inList = true;
          obj[currentKey] = [];
        } else {
          inList = false;
          obj[currentKey] = parseVal(val);
        }
      }
    }
    return obj;
  }

  function parseVal(v) {
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))
      return v.slice(1, -1);
    if (v === 'true') return true;
    if (v === 'false') return false;
    if (v === 'null' || v === '') return '';
    var n = Number(v);
    if (!isNaN(n) && v !== '') return n;
    return v;
  }

  function fetchFolder(path) {
    var url = 'https://api.github.com/repos/' + REPO + '/contents/' + path + '?ref=' + BRANCH;
    return fetch(url).then(function(r) {
      if (!r.ok) throw new Error('GitHub API error ' + r.status);
      return r.json();
    }).then(function(files) {
      var mdFiles = files.filter(function(f) { return f.name.endsWith('.md'); });
      var promises = mdFiles.map(function(f) {
        return fetch(f.download_url).then(function(r) { return r.text(); }).then(parseYAML);
      });
      return Promise.all(promises);
    });
  }

  function applyColors() {
    return fetch(RAW + '/_data/colors.json')
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

  return { fetchFolder: fetchFolder, applyColors: applyColors };
})();
