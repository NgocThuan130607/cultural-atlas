// Moves between pages (thirteenth round of user feedback), with the browser's cross-document view transitions.
// vite.config.js inlines this file into the <head> of every built page, so it runs before the page's first
// paint. Browsers without view transitions, and pages opened straight from disk (file:// has no shared
// origin), simply change page as before. The animations themselves are in main.scss ("Thirteenth round (1)").
//
// - dive: from the globe into a place (or from a city into one of its landmarks). The photo on the globe's
//   card grows into the big photo of the new page, while the globe falls away behind it.
// - surface: back up to the globe (or from a landmark to its city), the reverse.
// - tab-forward / tab-back: between Time travel, Stories and Visit, the page slides in the order of the tabs
//   while the app bar and the tabs stay put.
(function () {
  var TABS = ['timetravel', 'stories', 'visit'];
  function page(url) {
    var m = /([a-z]+)\.html$/.exec(new URL(url, location.href).pathname);
    return m ? m[1] : 'index';
  }
  function kind(from, to) {
    var a = page(from);
    var b = page(to);
    var i = TABS.indexOf(a);
    var j = TABS.indexOf(b);
    if (a === b) return 'fade';
    if (b === 'index') return 'surface';
    if (a === 'index') return 'dive';
    if (i >= 0 && j >= 0) return j > i ? 'tab-forward' : 'tab-back';
    if (a === 'city' && j >= 0) return 'dive';
    if (i >= 0 && b === 'city') return 'surface';
    return 'fade';
  }
  // What moves from one page into the other (sixteenth round: "the card becomes the page"). From the globe's
  // card to a city's page, each piece of the card goes to its own place: the photo becomes the cover, the name
  // the big title, the line about the city the cover's lead, the local time its clock, the body of the card the
  // cream panel. The Lạc ship (a copy of it left on the page as it leaves, see ship.js) flies into the cover's
  // first gold drawing. To a landmark's pages, only the photo and the ship carry over (the card shows its city).
  var OUT = {
    'place-hero': '[data-vt-hero], #kcard .kcard-hero img',
    'place-ship': '[data-vt-ship]',
    'place-name': '#kcard .kcard-title',
    'place-lead': '#kcard .kc-lead',
    'place-clock': '#kcard .kc-clock',
    'place-card': '#kcard .kcard-body',
  };
  var FIRST = '.deck-track > .slide:first-of-type ';
  var IN = {
    'place-hero': FIRST + ':is(.s-fill, .cover-img, #era-img-a)', // the city's whole cover, its shading too
    'place-ship': FIRST + '.motif.hero',
    'place-name': '#city-title',
    'place-lead': FIRST + '.lead-text',
    'place-clock': '#city-time',
    'place-card': FIRST + '.s-sand',
  };
  var CITY_ONLY = ['place-name', 'place-lead', 'place-clock', 'place-card'];
  function share(map, toCity, vt) {
    var named = [];
    Object.keys(map).forEach(function (name) {
      if (!toCity && CITY_ONLY.indexOf(name) >= 0) return;
      var el = document.querySelector(map[name]);
      if (!el || !el.getClientRects().length) return;
      el.style.viewTransitionName = name;
      named.push(el);
    });
    vt.finished.finally(function () { named.forEach(function (el) { el.style.viewTransitionName = ''; }); });
  }
  addEventListener('pageswap', function (e) {
    if (!e.viewTransition || !e.activation || !e.activation.entry) return;
    var to = e.activation.entry.url;
    var k = kind(location.href, to);
    e.viewTransition.types.add(k);
    if (k === 'dive') share(OUT, page(to) === 'city' && page(location.href) === 'index', e.viewTransition);
  });
  addEventListener('pagereveal', function (e) {
    if (!e.viewTransition) return;
    var from = window.navigation && navigation.activation && navigation.activation.from;
    if (!from || !from.url) return;
    var k = kind(from.url, location.href);
    e.viewTransition.types.add(k);
    document.documentElement.dataset.arrived = k; // for tests and debugging
    if (k === 'dive') share(IN, page(location.href) === 'city' && page(from.url) === 'index', e.viewTransition);
  });
})();
