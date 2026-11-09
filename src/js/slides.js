// Slide deck for City, Time travel, Stories and Visit (fifth round of user feedback, modelled on
// egymonuments.gov.eg): every part of a page is one full-screen slide. Scrolling (mouse wheel, trackpad,
// scrollbar, Page Down, or the ← → keys) moves the slides sideways, and a timeline along the bottom
// shows where you are and jumps to any part.
//
// How it works: the deck is one screen tall per slide. Its inner part sticks under the app bar while the
// page scrolls, and the row of slides is shifted left in step with the scroll position, so the movement
// follows the visitor's own scrolling. Snap points (CSS scroll-snap) make each gesture settle on a whole slide.
// On narrow or short screens, and when the visitor prefers reduced motion, the slides stack one under
// another instead, and the timeline stays as a compact bar along the bottom.
import { $, $$, esc, icon, prefersReducedMotion } from './common.js';
import { placeMotifs } from './motifs.js';

const wideScreen = matchMedia('(min-width: 900px) and (min-height: 560px)');
const lessMotion = matchMedia('(prefers-reduced-motion: reduce)');
const sideways = () => wideScreen.matches && !lessMotion.matches;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
// Lets the CSS hide not-yet-shown pieces only while this script runs and motion is welcome.
const markMotion = () => document.documentElement.classList.toggle('motion', !lessMotion.matches);
markMotion();
lessMotion.addEventListener('change', markMotion);
const pad = (n) => String(n).padStart(2, '0');

// ---------- Building blocks (all strings passed in must already be escaped) ----------

/**
 * One slide. `title` labels it on the timeline; `tone` is 'light' or 'dark'; `layout` names its grid;
 * `bg` is a photo shown blurred behind the slide (sixth round of feedback: no plain black backgrounds).
 */
export const slide = ({ id, title, tone = 'light', layout = 'feature', flip = false, cls = '', label = '', bg = '', body }) => `
  <section class="slide tone-${tone} lay-${layout} ${flip ? 'flip' : ''} ${cls}" id="${id}" data-title="${title}" data-tone="${tone}"
    ${label ? `aria-labelledby="${label}"` : `aria-label="${title}"`}>
    ${bg ? `<div class="s-bg" aria-hidden="true" data-bg="${bg}"></div>` : ''}
    <div class="slide-in">${body}</div>
  </section>`;

/** Sets an element's background to a photo URL (quoted, so any file name works). */
const setBg = (el, url) => { if (url) el.style.backgroundImage = `url(${JSON.stringify(url)})`; };

/** The deck around a list of slides, followed by `after` (the credits), which scrolls normally. */
export const deckHTML = (slides, after = '') => `
  <div class="deck" id="deck">
    <div class="deck-stick">
      <div class="deck-track">${slides.join('')}</div>
      <div class="deck-bar"></div>
    </div>
  </div>
  <div class="deck-after">${after}</div>`;

/** A photo that fills its box and drifts slightly as the slides move. */
export const photo = (src, alt = '', credit = '', cls = '') => `
  <figure class="s-photo ${cls}" data-reveal style="--d:1">
    <img data-parallax src="${src}" alt="${alt}" loading="lazy">
    ${credit ? `<figcaption class="s-credit">${credit}</figcaption>` : ''}
  </figure>`;

/** A slide's title block. The CSS puts a red seal with the slide's number beside it and a Đông Sơn drum band under it. */
export const titleFrame = (inner, cls = '') => `<div class="s-frame ${cls}" data-reveal>${inner}</div>`;

/** A large outlined number or year printed behind a slide's content. */
export const bigNumber = (text) => `<span class="s-num" aria-hidden="true" data-drift="-1">${text}</span>`;

// ---------- The deck ----------

/**
 * Starts the deck inside `root` (the element made by deckHTML).
 * `onSettle(i)` runs when the visitor has stopped on slide i.
 * Returns { go(i), next(), prev(), index, count, refresh() }.
 */
export function makeDeck(root, { onSettle } = {}) {
  const stick = $('.deck-stick', root);
  const track = $('.deck-track', root);
  const bar = $('.deck-bar', root);
  const slides = $$('.slide', track);
  const n = slides.length;

  bar.innerHTML = `
    <p class="deck-hint">${icon('swipe')}<span>Scroll or use the ← → keys</span></p>
    <nav class="deck-timeline" aria-label="Parts of this page" style="--n:${n}">
      <span class="deck-line" aria-hidden="true"><span class="deck-fill"></span></span>
      <span class="deck-marker" aria-hidden="true"></span>
      <ol>${slides.map((s, i) => `
        <li><button type="button" data-go="${i}"><span class="dot" aria-hidden="true"></span><span class="lbl">${esc(s.dataset.title)}</span></button></li>`).join('')}
      </ol>
    </nav>
    <div class="deck-pager">
      <button type="button" data-step="-1" aria-label="Previous part">${icon('arrow_back')}</button>
      <span class="deck-count" aria-hidden="true"><span class="cur">01</span><span class="rule"></span><span class="tot">${pad(n)}</span></span>
      <button type="button" data-step="1" aria-label="Next part">${icon('arrow_forward')}</button>
    </div>
    <p class="visually-hidden" aria-live="polite" id="deck-live"></p>`;
  const nav = $('.deck-timeline', bar);
  const dots = $$('[data-go]', bar);
  const prevBtn = $('[data-step="-1"]', bar);
  const nextBtn = $('[data-step="1"]', bar);

  // One snap point per slide (used only when the slides move sideways).
  root.insertAdjacentHTML('afterbegin', slides.map((_, i) => `<i class="deck-snap" aria-hidden="true" style="--i:${i}"></i>`).join(''));

  // Blurred photos behind the slides. Stacked, each slide shows its own; sideways, they sit still behind
  // the moving row and cross-fade into each other as the visitor scrolls.
  const bgs = slides.map((s) => $('.s-bg', s)?.dataset.bg ?? '');
  bgs.forEach((url, i) => { const own = $('.s-bg', slides[i]); if (own) setBg(own, url); });
  stick.insertAdjacentHTML('afterbegin', `<div class="deck-bg" aria-hidden="true">${slides.map((s) => `<i class="tone-${s.dataset.tone}"></i>`).join('')}</div>`);
  const layers = $$('.deck-bg > i', stick);
  layers.forEach((el, i) => setBg(el, bgs[i] || bgs[0]));
  const inners = slides.map((s) => $('.slide-in', s));

  let mode = null; // true: sideways, false: stacked
  let step = 0; // page scroll distance per slide
  let appbar = 64;
  let p = 0; // position in slides (0 = first, 1.5 = halfway between the second and third)
  let active = -1;
  let frame = 0;
  let settleTimer = 0;
  let moved = false;
  let effects = [];

  /** Re-reads the moving pictures and cards of each slide (after a page replaces some of its content). */
  function refresh() {
    effects = slides.map((s) => ({ par: $$('[data-parallax]', s), drift: $$('[data-drift]', s) }));
    schedule();
  }

  function layout() {
    const side = sideways();
    appbar = $('.appbar')?.offsetHeight ?? 64;
    if (side !== mode) {
      mode = side;
      root.classList.toggle('sideways', side);
      document.documentElement.classList.toggle('slides-snap', side);
      if (!side) {
        track.style.transform = '';
        effects.forEach((fx) => [...fx.par, ...fx.drift].forEach((el) => { el.style.translate = ''; }));
        inners.forEach((el) => { el.style.opacity = ''; });
      }
    }
    if (side) {
      step = innerHeight - appbar;
      root.style.setProperty('--stick-h', `${step}px`);
      root.style.height = `${n * step}px`;
    } else {
      root.style.height = '';
    }
    update();
    placeSoon();
  }

  // The symbol motifs (motifs.js) are fitted into the empty parts of each slide once the layout is known.
  let placeFrame = 0;
  function placeSoon() {
    cancelAnimationFrame(placeFrame);
    placeFrame = requestAnimationFrame(() => placeMotifs(root, { stacked: !mode, bottom: mode ? bar.offsetHeight : 0 }));
  }

  function update() {
    frame = 0;
    if (mode) {
      p = clamp((appbar - root.getBoundingClientRect().top) / step, 0, n - 1);
      track.style.transform = `translate3d(${(-p * 100).toFixed(3)}%, 0, 0)`;
      slides.forEach((s, i) => {
        const d = i - p;
        const far = Math.abs(d);
        // The background photos cross-fade with the position, drifting a little against the movement.
        const layer = layers[i];
        layer.style.opacity = Math.max(0, 1 - far).toFixed(3);
        layer.style.visibility = far < 1 ? 'visible' : 'hidden';
        if (far < 1) layer.style.translate = `${(d * -6).toFixed(2)}% 0`;
        // A slide fades its pieces in each time it arrives, so they are reset once it is fully off screen.
        if (far < 0.5) s.classList.add('seen');
        else if (far >= 1) s.classList.remove('seen');
        if (far > 1.2) return;
        // Leaving content dims as it slides away.
        inners[i].style.opacity = (1 - Math.min(1, far) * 0.55).toFixed(3);
        // Photos lag behind the slide and cards run slightly ahead, so the layers separate as they move.
        effects[i].par.forEach((el) => { el.style.translate = `${(d * 10).toFixed(2)}% 0`; });
        effects[i].drift.forEach((el) => { el.style.translate = `${(d * 70 * Number(el.dataset.drift || 1)).toFixed(1)}px 0`; });
      });
    } else {
      // Stacked: the slide whose top has passed 40% of the screen is the current one.
      const line = innerHeight * 0.4;
      let k = 0;
      slides.forEach((s, i) => {
        const r = s.getBoundingClientRect();
        if (r.top <= line) k = i;
        if (r.top < innerHeight * 0.88) s.classList.add('seen');
        if (r.bottom > 0 && r.top < innerHeight) {
          const off = clamp((innerHeight / 2 - (r.top + r.height / 2)) / innerHeight, -1, 1);
          effects[i].par.forEach((el) => { el.style.translate = `0 ${(off * 24).toFixed(1)}px`; });
        }
      });
      // Near the bottom of the page the last slide counts as current, even if it is short.
      if (innerHeight + scrollY >= document.documentElement.scrollHeight - 4) k = n - 1;
      p = k;
    }
    nav.style.setProperty('--p', p.toFixed(3));
    if (p > 0.15 && !moved) { moved = true; bar.classList.add('moved'); }
    setActive(Math.round(p));
  }

  function setActive(i) {
    if (i === active) return;
    active = i;
    dots.forEach((b, k) => (k === i ? b.setAttribute('aria-current', 'step') : b.removeAttribute('aria-current')));
    stick.dataset.tone = slides[i].dataset.tone;
    $('.cur', bar).textContent = pad(i + 1);
    prevBtn.disabled = i === 0;
    nextBtn.disabled = i === n - 1;
    // While a move is running, the slides it passes are not "settled on"; the end of the move settles.
    if (!tween) settleSoon();
  }

  function settleSoon() {
    clearTimeout(settleTimer);
    settleTimer = setTimeout(() => {
      $('#deck-live', bar).textContent = `${slides[active].dataset.title}, part ${active + 1} of ${n}`;
      onSettle?.(active);
    }, 280);
  }

  const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };

  // Moves between slides are animated here rather than by the browser, so they can be slower and
  // ease in and out. Snapping is switched off while a move runs so it cannot pull against it.
  let tween = 0; // animation frame of the running move
  let aim = 0; // the slide a running move is heading to
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

  function scrollToSmoothly(top, slideCount) {
    cancelAnimationFrame(tween);
    const from = scrollY;
    const dist = top - from;
    if (Math.abs(dist) < 1) { tween = 0; settleSoon(); return; }
    const dur = Math.min(1300, 850 + 120 * (slideCount - 1));
    const t0 = performance.now();
    document.documentElement.classList.remove('slides-snap');
    const tick = (now) => {
      const t = Math.min(1, (now - t0) / dur);
      scrollTo({ top: from + dist * ease(t), behavior: 'instant' }); // Bootstrap makes the page scroll smoothly by default
      if (t < 1) { tween = requestAnimationFrame(tick); return; }
      tween = 0;
      if (mode) document.documentElement.classList.add('slides-snap');
      scrollTo({ top, behavior: 'instant' });
      settleSoon();
    };
    tween = requestAnimationFrame(tick);
  }

  /** Moves to slide i. */
  function go(i, smooth = !prefersReducedMotion()) {
    i = clamp(i, 0, n - 1);
    const top = Math.max(0, Math.round(mode
      ? root.getBoundingClientRect().top + scrollY - appbar + i * step
      // Stacked, a landmark page also has its sticky Time travel / Stories / Visit tabs under the app bar.
      : slides[i].getBoundingClientRect().top + scrollY - appbar - ($('.lm-tabs-page')?.offsetHeight ?? 0)));
    if (mode && smooth) {
      const count = Math.abs(i - (tween ? aim : active)) || 1;
      aim = i;
      scrollToSmoothly(top, count);
      return;
    }
    if (tween) { cancelAnimationFrame(tween); tween = 0; if (mode) document.documentElement.classList.add('slides-snap'); }
    scrollTo({ top, behavior: smooth ? 'smooth' : 'auto' });
  }
  /** Moves k slides on from the current one, or from where a running move is heading. */
  const stepBy = (k) => go((tween ? aim : active) + k);

  bar.addEventListener('click', (e) => {
    const dot = e.target.closest('[data-go]');
    if (dot) return go(Number(dot.dataset.go));
    const s = e.target.closest('[data-step]');
    if (s) stepBy(Number(s.dataset.step));
  });
  // Buttons inside slides can jump too: data-deck-go="next" or a slide number.
  track.addEventListener('click', (e) => {
    const b = e.target.closest('[data-deck-go]');
    if (!b) return;
    if (b.dataset.deckGo === 'next') stepBy(1); else go(Number(b.dataset.deckGo));
  });

  // ← → keys move between slides (unless the key belongs to a control, the map or a video).
  addEventListener('keydown', (e) => {
    if (!mode || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    if (e.target.closest?.('input, select, textarea, [contenteditable], video, .leaflet-container, .carousel')) return;
    e.preventDefault();
    stepBy(e.key === 'ArrowRight' ? 1 : -1);
  });

  // One turn of the mouse wheel (or one swipe on a trackpad) moves one whole slide. The wheel still
  // scrolls a list or card that has more to show, a strip of cards scrolls sideways on its own, and past
  // the last slide the page scrolls on to the credits as usual.
  let wheelLock = 0;
  let wheelQuiet = 0;
  let wheelSum = 0;
  addEventListener('wheel', (e) => {
    if (!mode || e.ctrlKey || e.defaultPrevented) return;
    const sideTurn = Math.abs(e.deltaX) > Math.abs(e.deltaY);
    const delta = sideTurn ? e.deltaX : e.deltaY;
    if (!delta) return;
    const r = root.getBoundingClientRect();
    if (r.top > appbar + 2 || r.bottom < innerHeight - 2) return; // the deck isn't filling the screen
    if ((delta > 0 && active === n - 1 && p >= n - 1.01) || (delta < 0 && active === 0 && p <= 0.01)) return;
    for (let el = e.target; el && el !== root; el = el.parentElement) {
      if (sideTurn && el.classList?.contains('carousel')) return;
      if (!sideTurn && el.scrollHeight > el.clientHeight + 2 && /auto|scroll/.test(getComputedStyle(el).overflowY)) {
        const canScroll = delta > 0 ? el.scrollTop + el.clientHeight < el.scrollHeight - 1 : el.scrollTop > 0;
        if (canScroll) return;
      }
    }
    e.preventDefault();
    clearTimeout(wheelQuiet);
    // A trackpad keeps sending small wheel events after a swipe; wait for them to stop before the next move.
    wheelQuiet = setTimeout(() => { wheelSum = 0; wheelLock = 0; }, 200);
    if (wheelLock) return;
    wheelSum += delta;
    if (Math.abs(wheelSum) < 24) return;
    wheelLock = 1;
    stepBy(Math.sign(wheelSum));
  }, { passive: false });

  // Tabbing into a slide that is off to the side brings it into view.
  root.addEventListener('focusin', (e) => {
    if (!mode) return;
    const i = slides.indexOf(e.target.closest('.slide'));
    if (i >= 0 && i !== active && Math.abs(i - p) > 0.05) go(i, false);
  });

  // Grabbing the scrollbar or touching the screen stops a running move; snapping then takes over.
  const stopMove = (e) => {
    if (!tween || e.target.closest?.('button, a, input, label')) return; // buttons start their own move
    cancelAnimationFrame(tween);
    tween = 0;
    if (mode) document.documentElement.classList.add('slides-snap');
    settleSoon();
  };
  addEventListener('pointerdown', stopMove);
  addEventListener('touchstart', stopMove, { passive: true });

  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', () => { const keep = active; layout(); if (mode) go(keep, false); });
  const onModeChange = () => { const keep = active; layout(); go(keep, false); };
  wideScreen.addEventListener('change', onModeChange);
  lessMotion.addEventListener('change', onModeChange);

  refresh();
  layout();
  document.fonts?.ready.then(placeSoon);
  slides[0].classList.add('seen');
  // A link to a part of the page (city.html?id=paris#ch-history) opens that slide.
  const fromHash = slides.findIndex((s) => location.hash && s.id === decodeURIComponent(location.hash.slice(1)));
  if (fromHash > 0) go(fromHash, false);

  return {
    go, refresh,
    next: () => stepBy(1),
    prev: () => stepBy(-1),
    get index() { return active; },
    count: n,
    slides,
  };
}

/**
 * A strip of cards that scrolls sideways, with ← → buttons (`[data-car="-1"]` / `[data-car="1"]`)
 * inside `wrap`. The buttons are disabled at either end.
 */
export function carousel(wrap) {
  const strip = $('.carousel', wrap);
  const prev = $('[data-car="-1"]', wrap);
  const next = $('[data-car="1"]', wrap);
  if (!strip) return null;
  const update = () => {
    if (prev) prev.disabled = strip.scrollLeft <= 4;
    if (next) next.disabled = strip.scrollLeft + strip.clientWidth >= strip.scrollWidth - 4;
  };
  wrap.addEventListener('click', (e) => {
    const b = e.target.closest('[data-car]');
    if (!b) return;
    strip.scrollBy({ left: Number(b.dataset.car) * strip.clientWidth * 0.8, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  });
  strip.addEventListener('scroll', update, { passive: true });
  addEventListener('resize', update);
  update();
  return { update };
}

/** Square ← → buttons for a carousel, in the style of the reference site. */
export const carNav = (what) => `
  <div class="car-nav">
    <button type="button" data-car="-1" aria-label="Scroll ${what} left">${icon('arrow_back')}</button>
    <button type="button" data-car="1" aria-label="Scroll ${what} right">${icon('arrow_forward')}</button>
  </div>`;
