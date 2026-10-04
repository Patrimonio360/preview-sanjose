// Opciones de la clínica que se eligen en Ajustes del panel y usan a la vez
// el panel, el formulario de citas y VetBot (servidor):
//  - settings.species:        animales que atiende la clínica (claves de SPECIES)
//  - settings.bookingReasons: motivos de cita que se ofrecen al pedir cita
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ClinicOptions = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  // words: palabras (sin tildes, en singular) con las que la gente nombra a
  // cada animal; se aceptan también en plural.
  var SPECIES = [
    { key: 'perros', label: 'Perros', name: 'perros', group: 'Habituales', words: ['perro', 'perra', 'perrito', 'perrita', 'cachorro', 'cachorra'] },
    { key: 'gatos', label: 'Gatos', name: 'gatos', group: 'Habituales', words: ['gato', 'gata', 'gatito', 'gatita', 'minino', 'minina'] },
    { key: 'conejos', label: 'Conejos', name: 'conejos', group: 'Exóticos', words: ['conejo', 'coneja', 'conejito', 'conejita'] },
    { key: 'roedores', label: 'Roedores (hámster, cobaya, chinchilla…)', name: 'roedores', group: 'Exóticos', words: ['hamster', 'cobaya', 'conejillo de indias', 'chinchilla', 'rata', 'raton', 'jerbo', 'degu', 'roedor'] },
    { key: 'hurones', label: 'Hurones', name: 'hurones', group: 'Exóticos', words: ['huron', 'hurona'] },
    { key: 'aves', label: 'Aves (loros, periquitos, canarios…)', name: 'aves', group: 'Exóticos', words: ['pajaro', 'ave', 'loro', 'periquito', 'canario', 'agapornis', 'agaporni', 'cacatua', 'ninfa', 'jilguero', 'paloma', 'gallina'] },
    { key: 'reptiles', label: 'Reptiles (tortugas, iguanas, serpientes…)', name: 'reptiles', group: 'Exóticos', words: ['tortuga', 'galapago', 'iguana', 'serpiente', 'culebra', 'lagarto', 'lagartija', 'gecko', 'camaleon', 'pogona', 'dragon barbudo', 'reptil'] },
    { key: 'peces', label: 'Peces', name: 'peces', group: 'Exóticos', words: ['pez', 'peces', 'pececito', 'goldfish', 'betta', 'acuario'] },
    { key: 'anfibios', label: 'Anfibios (ranas, ajolotes…)', name: 'anfibios', group: 'Exóticos', words: ['rana', 'sapo', 'ajolote', 'axolotl', 'salamandra', 'triton', 'anfibio'] },
    { key: 'granja', label: 'Caballos y animales de granja', name: 'caballos y animales de granja', group: 'Otros', words: ['caballo', 'yegua', 'poni', 'pony', 'burro', 'asno', 'cabra', 'oveja', 'cerdo', 'vaca', 'ternero'] }
  ];
  var DEFAULT_SPECIES = ['perros', 'gatos'];
  var DEFAULT_REASONS = ['Consulta', 'Vacunación', 'Revisión', 'Cirugía', 'Peluquería'];

  function norm(text) {
    return String(text || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  function acceptedSpecies(settings) {
    var list = settings && Array.isArray(settings.species) ? settings.species : DEFAULT_SPECIES;
    return SPECIES.filter(function (s) { return list.indexOf(s.key) !== -1; });
  }

  // Animal que se menciona en un texto (o null).
  function detectSpecies(text) {
    var t = ' ' + norm(text).replace(/[^a-z0-9ñ]+/g, ' ') + ' ';
    for (var i = 0; i < SPECIES.length; i++) {
      var words = SPECIES[i].words;
      for (var j = 0; j < words.length; j++) {
        var w = words[j];
        var plural = /[aeiou]$/.test(w) ? w + 's' : w + 'es';
        if (t.indexOf(' ' + w + ' ') !== -1 || t.indexOf(' ' + plural + ' ') !== -1) return SPECIES[i];
      }
    }
    return null;
  }

  // "perros, gatos y conejos"
  function speciesText(settings) {
    var names = acceptedSpecies(settings).map(function (s) { return s.name; });
    if (names.length <= 1) return names.join('');
    return names.slice(0, -1).join(', ') + ' y ' + names[names.length - 1];
  }

  // Motivos de cita: los de Ajustes; si no hay, los nombres de los servicios.
  function bookingReasons(settings, services) {
    var list = settings && Array.isArray(settings.bookingReasons) ? settings.bookingReasons : [];
    list = list.map(function (r) { return String(r).trim(); }).filter(Boolean);
    if (list.length) return list;
    var fromServices = (services || []).map(function (s) { return s.name; }).filter(Boolean);
    return fromServices.length ? fromServices : DEFAULT_REASONS.slice();
  }

  return {
    SPECIES: SPECIES,
    DEFAULT_SPECIES: DEFAULT_SPECIES,
    DEFAULT_REASONS: DEFAULT_REASONS,
    acceptedSpecies: acceptedSpecies,
    detectSpecies: detectSpecies,
    speciesText: speciesText,
    bookingReasons: bookingReasons
  };
});
