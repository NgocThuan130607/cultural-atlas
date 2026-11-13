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
  // The photo that grows from one page into the other
  function heroOut() {
    return document.querySelector('[data-vt-hero]') || document.querySelector('#kcard .kcard-hero img');
  }
  function heroIn() {
    return document.querySelector('.deck-track > .slide:first-of-type :is(.s-fill img, .cover-img, #era-img-a)');
  }
  function share(el, vt) {
    if (!el) return;
    el.style.viewTransitionName = 'place-hero';
    vt.finished.finally(function () { el.style.viewTransitionName = ''; });
  }
  addEventListener('pageswap', function (e) {
    if (!e.viewTransition || !e.activation || !e.activation.entry) return;
    var k = kind(location.href, e.activation.entry.url);
    e.viewTransition.types.add(k);
    if (k === 'dive') share(heroOut(), e.viewTransition);
  });
  addEventListener('pagereveal', function (e) {
    if (!e.viewTransition) return;
    var from = window.navigation && navigation.activation && navigation.activation.from;
    if (!from || !from.url) return;
    var k = kind(from.url, location.href);
    e.viewTransition.types.add(k);
    document.documentElement.dataset.arrived = k; // for tests and debugging
    if (k === 'dive') share(heroIn(), e.viewTransition);
  });
})();
