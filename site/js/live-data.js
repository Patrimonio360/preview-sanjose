// Datos al momento: los cambios del panel se ven en segundos.
//
// La web pide sus datos con fetch('_data/…json'). Esos archivos los publica
// GitHub Pages, que tarda de 30 s a varios minutos en reconstruir la web tras
// cada cambio del panel. Este archivo (cargado el primero en cada página)
// desvía esas peticiones al servidor (api/site-data), que lee el repositorio
// al momento; si el servidor falla, se usa el archivo de GitHub Pages como
// siempre. Cada archivo se pide una sola vez por página.
(function () {
  var API = 'https://preview-sanjose.vercel.app/api/site-data?path=';
  var realFetch = window.fetch.bind(window);
  var pending = {};

  window.fetch = function (input, init) {
    var url = typeof input === 'string' ? input : (input && input.url) || '';
    var m = /(?:^|\/)_data\/([a-z0-9_\/-]+\.json)(?:\?|$)/.exec(url);
    if (!m || (init && init.method && init.method !== 'GET')) return realFetch(input, init);

    var path = 'site/_data/' + m[1];
    if (!pending[path]) {
      pending[path] = realFetch(API + encodeURIComponent(path))
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
        .catch(function () {
          return realFetch(input, init).then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); });
        });
    }
    return pending[path].then(
      function (text) { return new Response(text, { status: 200, headers: { 'Content-Type': 'application/json' } }); },
      function () { delete pending[path]; return realFetch(input, init); }
    );
  };
})();
