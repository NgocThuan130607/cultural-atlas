// A city's book (thirtieth round): in Through time, choosing a city opens a book with its whole story. A lacquer
// cover with the city's name in gold opens by itself; the first spread has the city's photo and a title page that
// says what the book is and how to read it; then each period of history (the atlas's own periods: Ancient,
// Medieval… or, for Vietnam, Early kingdoms, Chinese rule…) is a page: its name on top, the city's changes in that
// period as a timeline below. Tabs on the book's left edge jump to a period.
// Thirty-seventh round: turning the pages (wheel, arrow keys, a click on a page, the tabs) turns only the book; the
// year bar and the globe behind it stay where they were (before, each period moved the year bar to its first event).
//
// The book is a <dialog> (Esc closes it, focus stays inside, and goes back where it was). On a wide screen it is a
// spread of two pages whose leaves turn round the spine in 3D; on a phone it shows one page at a time and slides.
// With reduced motion the pages change at once. A period too long for one page goes on over the next: the pages
// are laid out, measured, and laid out again with fewer events on any page that would overflow.
//
// Thirty-second round: a thicker, more real book. On a wide screen it lies a little tilted back, as on a table, so
// the edges of its pages show along the bottom as a thick block (read on the left, still to read on the right,
// growing and shrinking as the leaves turn) with the boards of the cover under them, the stitched spine between,
// and the leaves turning in that space; the tabs are bookmarks sticking out of its left edge. Specks of dust float
// in the light over it. The mouse wheel turns the pages too.
import { esc, icon, imageSrc, focusStyle, landmarkUrl, prefersReducedMotion } from './common.js';
import { wheelSorter } from './touchpad.js';

const PER_PAGE = 6; // events on one page at most (fewer where they would not fit, see fitPages)
const NARROW = '(max-width: 767.98px)';

let current = null; // the open book, if any

/** Closes the open book, if any. */
export function closeCityBook() { current?.close(); }

/**
 * Opens the book of `city`. `details` has its timeline, hero and tagline; `periods` are the atlas's periods;
 * `formatYear(year, approx)` writes a year as the timeline does; `onClose()` is called when the book has been closed.
 */
export function openCityBook({ city, details, periods, lmById, media, formatYear, onClose = () => {} }) {
  current?.close(true);
  const timeline = [...(details?.timeline ?? [])].sort((a, b) => a.year - b.year);
  if (!timeline.length) return null;
  const reduced = prefersReducedMotion();
  const thisYear = new Date().getFullYear();
  const span = (p) => `${formatYear(p.from)} – ${p.to >= thisYear - 1 ? 'today' : formatYear(p.to)}`;
  const eraOf = (e) => (e.landmark ? lmById.get(e.landmark) : null);
  const picOf = (e) => eraOf(e)?.eras?.[e.era]?.image ?? null;

  // ----- The periods with events -----
  const chapters = periods.map((p, i) => ({
    p, i, events: timeline.filter((e) => e.year >= p.from && (e.year < p.to || (i === periods.length - 1 && e.year <= p.to))),
  })).filter((c) => c.events.length);
  const early = timeline.filter((e) => e.year < periods[0].from); // events before the first period (rare) join it
  if (early.length && chapters[0]) chapters[0].events.unshift(...early);
  if (!chapters.length) return null;

  // ----- The pages (rebuilt with fewer events on a page if a page would overflow) -----
  const room = new Map(chapters.map((c) => [c.i, PER_PAGE])); // events per page, for each period
  let pages = [];
  function buildPages() {
    pages = [];
    pages.push({ kind: 'cover', html: `
      <div class="cb-cover">
        <span class="cb-star" aria-hidden="true"></span>
        <p class="cb-cover-kicker">The story of</p>
        <p class="cb-cover-title">${esc(city.name)}</p>
        <p class="cb-cover-sub">${esc(city.country ?? '')}</p>
      </div>` });
    pages.push({ kind: 'photo', html: `
      <figure class="cb-photo">
        <img src="${esc(imageSrc(details.hero, media))}" alt="${esc(details.hero?.alt ?? '')}">
        <figcaption><strong>${esc(city.name)}</strong><span>${esc([city.country, city.continent].filter(Boolean).join(' · '))}</span></figcaption>
      </figure>` });
    pages.push({ kind: 'intro', html: `
      <div class="cb-intro ${chapters.length > 4 ? 'many' : ''}">
        <p class="cb-kicker">The story of a city</p>
        <h2 class="cb-title" id="cb-title">${esc(city.name)} through time</h2>
        ${city.tagline ? `<p class="cb-lead">${esc(city.tagline)}.</p>` : ''}
        <div class="cb-note">${icon('help')}<p>Turn the pages with the arrows, the ← → keys or the mouse wheel, or jump to a period with the tabs on the left.
          Gold links open a landmark at that moment.</p></div>
        <p class="cb-contents-head">${chapters.length} ${chapters.length === 1 ? 'period' : 'periods'} · ${timeline.length} changes</p>
        <ol class="cb-contents">${chapters.map((c) => `
          <li><button type="button" data-go-chapter="${c.i}"><span>${esc(c.p.label)}</span><small>${esc(span(c.p))} · ${c.events.length}</small></button></li>`).join('')}
        </ol>
      </div>` });
    chapters.forEach((c, n) => {
      const pic = c.events.map(picOf).find(Boolean);
      const per = room.get(c.i);
      for (let k = 0, part = 0; k < c.events.length; part++) {
        const fit = Math.max(1, part === 0 && pic ? per - 1 : per); // the picture takes the room of one event
        const events = c.events.slice(k, k + fit);
        k += fit;
        pages.push({ kind: 'chapter', chapter: c, first: events[0], part, html: `
          <div class="cb-chapter" data-chapter="${c.i}">
            <header class="cb-chapter-head">
              <p class="cb-kicker">Period ${n + 1} of ${chapters.length}</p>
              <h3 class="cb-chapter-title">${esc(c.p.label)}${part ? ' <span>(continued)</span>' : ''}</h3>
              <p class="cb-span">${esc(span(c.p))}</p>
              ${pic && !part ? `<img class="cb-strip" src="${esc(imageSrc(pic, media))}" alt="" style="${focusStyle(pic)}">` : ''}
            </header>
            <ol class="cb-events">${events.map((e) => {
              const lm = eraOf(e); const era = lm?.eras?.[e.era];
              return `<li><p class="cb-year">${esc(formatYear(e.year, e.approx))}</p><p class="cb-text">${esc(e.text)}</p>${lm && era ? `
                <a class="cb-lm" href="${esc(landmarkUrl(lm.id, 'time', { part: `era-${e.era}` }))}">${icon('history')}<span>${esc(lm.name)} · ${esc(era.title)}</span>${icon('arrow_forward')}</a>` : ''}</li>`;
            }).join('')}</ol>
          </div>` });
      }
    });
    pages.push({ kind: 'end', html: `
      <div class="cb-end"><span class="cb-star" aria-hidden="true"></span><p>The story of ${esc(city.name)} goes on.</p>
        <button type="button" class="btn-m btn-filled" data-close>${icon('public')}Back to the globe</button></div>` });
    if (pages.length % 2) pages.splice(pages.length - 1, 0, { kind: 'blank', html: '<div class="cb-blank" aria-hidden="true"></div>' });
  }
  const pageNo = (k) => (k >= 2 ? `<span class="cb-no">${k - 1}</span>` : '');

  // ----- The book -----
  const dialog = document.createElement('dialog');
  dialog.className = 'city-book';
  dialog.setAttribute('aria-labelledby', 'cb-title');
  dialog.innerHTML = `
    <button type="button" class="cb-close icon-btn" data-close aria-label="Close the book">${icon('close')}</button>
    <div class="cb-stage">
      <div class="cb-volume closed">
        <div class="cb-body" aria-hidden="true">
          <div class="cb-shadow"></div>
          <div class="cb-side cb-side-left"><div class="cb-board"></div><div class="cb-edge"></div></div>
          <div class="cb-side cb-side-right"><div class="cb-board"></div><div class="cb-edge"></div></div>
          <div class="cb-spine"></div>
        </div>
        <nav class="cb-tabs" aria-label="Periods">
          <button type="button" data-go-page="2">Contents</button>
          ${chapters.map((c) => `<button type="button" data-go-chapter="${c.i}">${esc(c.p.label)}</button>`).join('')}
        </nav>
        <div class="cb-book closed"></div>
      </div>
      <div class="cb-motes" aria-hidden="true">${Array.from({ length: 18 }, (_, k) => `<i style="--x:${(7 + ((k * 37) % 86))}%;--y:${(12 + ((k * 53) % 76))}%;--t:${(9 + ((k * 7) % 9))}s;--d:-${(k * 1.7).toFixed(1)}s;--s:${(1.5 + (k % 3) * 0.8).toFixed(1)}px"></i>`).join('')}</div>
      <div class="cb-controls">
        <button type="button" class="cb-arrow cb-prev icon-btn" aria-label="Previous page">${icon('chevron_left')}</button>
        <span class="cb-pages" aria-live="polite"></span>
        <button type="button" class="cb-arrow cb-next icon-btn" aria-label="Next page">${icon('chevron_right')}</button>
      </div>
    </div>`;
  document.body.append(dialog);
  const book = dialog.querySelector('.cb-book');
  const volume = dialog.querySelector('.cb-volume');
  let leafEls = [];
  let L = 0;
  const firstPageOf = new Map(); // period index → page index
  function renderBook() {
    buildPages();
    const leaves = [];
    for (let i = 0; i * 2 < pages.length; i++) leaves.push([pages[i * 2], pages[i * 2 + 1]]);
    book.innerHTML = `<div class="cb-base cb-base-left"></div><div class="cb-base cb-base-right"></div>${leaves.map(([front, back], i) => `
      <div class="cb-leaf" data-leaf="${i}">
        <div class="cb-face cb-front cb-page-${front.kind}">${front.html}${pageNo(i * 2)}</div>
        <div class="cb-face cb-back cb-page-${back.kind}">${back.html}${pageNo(i * 2 + 1)}</div>
      </div>`).join('')}`;
    leafEls = [...book.querySelectorAll('.cb-leaf')];
    L = leafEls.length;
    firstPageOf.clear();
    pages.forEach((pg, k) => { if (pg.chapter && !firstPageOf.has(pg.chapter.i)) firstPageOf.set(pg.chapter.i, k); });
  }
  /** Lays the pages out again with fewer events wherever a page overflows (wide screens; a phone's pages scroll). */
  function fitPages() {
    for (let round = 0; round < 4; round++) {
      if (matchMedia(NARROW).matches) break;
      const over = new Set([...book.querySelectorAll('.cb-chapter')].filter((el) => el.scrollHeight > el.clientHeight + 1).map((el) => Number(el.dataset.chapter)));
      // the title page: a little smaller, then without the line about the city, then the contents in two columns
      const intro = book.querySelector('.cb-intro');
      for (const cls of ['tight', 'short', 'many']) if (intro && intro.scrollHeight > intro.clientHeight + 1) intro.classList.add(cls);
      let changed = false;
      for (const i of over) if (room.get(i) > 1) { room.set(i, room.get(i) - 1); changed = true; }
      if (!changed) break;
      renderBook();
      paint();
    }
    clearOrnaments();
  }
  /** Leaves the faint drum off each page whose words or pictures reach the place it is printed in. */
  function clearOrnaments() {
    const R = 136; // the half drum on the outer edge (CSS: 260px across, its middle on the edge, 176px above the bottom)
    for (const face of book.querySelectorAll('.cb-face')) {
      const W = face.clientWidth;
      const H = face.clientHeight;
      const back = face.classList.contains('cb-back');
      const scrolls = [face, ...face.children].some((el) => el.scrollHeight > el.clientHeight + 1);
      const hit = scrolls || [...face.querySelectorAll('h2, h3, p, li, figure, a, button, img, .cb-note')].some((el) => {
        if (el.closest('.cb-no') || !el.offsetParent) return false;
        let x = 0;
        let y = 0;
        for (let e = el; e && e !== face; e = e.offsetParent) { x += e.offsetLeft; y += e.offsetTop; }
        // how far the box is from the drum's middle
        const cx = back ? 0 : W;
        const cy = H - 176;
        const dx = Math.max(x - cx, 0, cx - (x + el.offsetWidth));
        const dy = Math.max(y - cy, 0, cy - (y + el.offsetHeight));
        return Math.hypot(dx, dy) < R;
      });
      face.classList.toggle('no-orn', hit);
    }
  }

  const narrow = () => matchMedia(NARROW).matches;
  // Wide: `spread` leaves are turned (0: closed, L: all turned). Narrow: `page` is the page shown (from 1, the photo).
  let spread = 0;
  let page = 1;
  let wanted = null; // a period chosen with a tab: it is the one marked while its page is in view

  /** The pages in view: [left, right] on a wide screen, [page] on a narrow one. */
  const inView = () => (narrow() ? [page] : [spread * 2 - 1, spread * 2].filter((k) => k >= 0 && k < pages.length));
  function paint() {
    if (narrow()) {
      leafEls.forEach((el) => { el.classList.remove('turned', 'moving'); el.style.zIndex = ''; });
      book.querySelectorAll('.cb-face').forEach((f, k) => f.classList.toggle('shown', k === page));
      book.classList.remove('closed');
      clearOrnaments(); // (a phone's page is laid out once it is shown)
    } else {
      book.querySelectorAll('.cb-face.shown').forEach((f) => f.classList.remove('shown'));
      leafEls.forEach((el, i) => {
        el.classList.toggle('turned', i < spread);
        // in the book's 3D space the leaves are stacked by height, a hair apart, not by z-index
        if (!el.classList.contains('moving')) { el.style.zIndex = String(i < spread ? i + 1 : L - i); el.style.setProperty('--z', `${(i < spread ? i + 1 : L - i) * 0.4}px`); }
      });
      book.classList.toggle('closed', spread === 0);
      volume.classList.toggle('closed', spread === 0);
      // how thick the stacks of pages read and still to read are (thirty-first round)
      volume.style.setProperty('--left', (spread / L).toFixed(3));
      volume.style.setProperty('--right', (1 - spread / L).toFixed(3));
    }
    const seen = inView();
    const prev = dialog.querySelector('.cb-prev');
    const next = dialog.querySelector('.cb-next');
    prev.disabled = narrow() ? page <= 1 : spread <= 1;
    next.disabled = narrow() ? page >= pages.length - 1 : spread >= L;
    // Thirty-seventh round: an arrow button that has just been switched off (on the last or the first page) drops
    // the focus out of the book, and the ← → keys stopped turning its pages; the focus goes to the other arrow.
    const lost = document.activeElement;
    if (dialog.open && (!lost || lost === document.body || (lost.disabled && dialog.contains(lost)))) (prev.disabled ? next : prev).focus({ preventScroll: true });
    // The period in view: the one chosen with a tab if its page is here; else the first one that begins on these
    // pages; else the one going on.
    const vis = seen.map((k) => pages[k]).filter((pg) => pg?.chapter);
    const pick = (wanted != null ? vis.find((pg) => pg.chapter.i === wanted && !pg.part) : null)
      ?? vis.find((pg) => !pg.part) ?? vis[0] ?? null;
    const ch = pick?.chapter ?? null;
    dialog.querySelectorAll('.cb-tabs button').forEach((b) => {
      const on = b.dataset.goChapter != null ? ch?.i === Number(b.dataset.goChapter) : !ch;
      b.classList.toggle('active', on);
      if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
    // pages are numbered from the title page (the cover and the photo have no number)
    const nums = seen.filter((k) => k >= 2).map((k) => k - 1);
    dialog.querySelector('.cb-pages').textContent = nums.length > 1 ? `Pages ${nums[0]}–${nums[1]} of ${pages.length - 2}` : `Page ${nums[0] ?? 1} of ${pages.length - 2}`;
  }
  /** Turns to spread `s`; several leaves turn one after another. */
  function goSpread(s) {
    s = Math.max(1, Math.min(L, s));
    if (s === spread) return;
    const dir = s > spread ? 1 : -1;
    const from = spread;
    const steps = Math.abs(s - from);
    for (let n = 0; n < steps; n++) {
      const i = dir > 0 ? from + n : from - 1 - n;
      const el = leafEls[i];
      const run = () => {
        el.classList.add('moving');
        el.style.zIndex = String(L + 10 + n);
        el.style.setProperty('--z', `${(L + 2) * 0.4}px`);
        spread += dir;
        paint();
        setTimeout(() => { el.classList.remove('moving'); paint(); }, reduced ? 0 : 900);
      };
      if (reduced || n === 0) run(); else setTimeout(run, n * 90);
    }
  }
  const goPage = (k) => { if (narrow()) { page = Math.max(1, Math.min(pages.length - 1, k)); paint(); } else goSpread(Math.ceil(k / 2)); };
  const step = (by) => { wanted = null; if (narrow()) goPage(page + by); else goSpread(spread + by); };

  dialog.addEventListener('click', (e) => {
    if (e.target === dialog || e.target.closest('[data-close]')) { close(); return; }
    const ch = e.target.closest('[data-go-chapter]');
    if (ch) { wanted = Number(ch.dataset.goChapter); goPage(firstPageOf.get(wanted)); paint(); return; }
    const pg = e.target.closest('[data-go-page]');
    if (pg) { wanted = null; goPage(Number(pg.dataset.goPage)); return; }
    if (e.target.closest('.cb-prev')) { step(-1); return; }
    if (e.target.closest('.cb-next')) { step(1); return; }
    // a click on the left or right page turns back or on (not on a link)
    if (!narrow() && e.target.closest('.cb-book') && !e.target.closest('a, button')) {
      const r = book.getBoundingClientRect();
      step(e.clientX < r.left + r.width / 2 ? -1 : 1);
    }
  });
  dialog.addEventListener('keydown', (e) => {
    const dir = { ArrowRight: 1, PageDown: 1, ArrowLeft: -1, PageUp: -1 }[e.key];
    if (!dir) return;
    e.preventDefault();
    e.stopPropagation(); // the page's own arrow keys (turning the globe, the year bar) are for when the book is shut
    step(dir);
  });
  // Thirty-second round: the mouse wheel (or a touchpad) turns the pages too, one turn per flick. On a phone, a
  // page that scrolls is scrolled first, and the page turns at its end.
  // Thirty-fifth round: a touchpad goes on sending small wheel events for a second or more after the fingers
  // leave it, so one flick turned two or three pages; now a touchpad turns one page a flick, the next flick
  // counting once its glide has stopped. A pinch is left to the browser.
  const sortWheel = wheelSorter();
  let wheelSum = 0;
  let wheelLast = 0;
  let wheelLock = 0;
  let padDone = false;
  dialog.addEventListener('wheel', (e) => {
    e.stopPropagation(); // nothing behind the book reacts to it
    const kind = sortWheel(e);
    if (kind === 'pinch') return;
    const page = narrow() ? e.target.closest?.('.cb-intro, .cb-chapter') : null;
    if (page && (e.deltaY > 0 ? page.scrollTop + page.clientHeight < page.scrollHeight - 1 : page.scrollTop > 0)) return;
    e.preventDefault();
    const now = performance.now();
    const quiet = now - wheelLast > 220;
    wheelLast = now;
    if (quiet) { wheelSum = 0; padDone = false; }
    if (kind === 'pad' && padDone) return;
    wheelSum += (Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX) * (e.deltaMode === 1 ? 16 : 1);
    if (now < wheelLock || Math.abs(wheelSum) < 40) return;
    step(wheelSum > 0 ? 1 : -1);
    wheelSum = 0;
    padDone = kind === 'pad';
    wheelLock = now + (reduced ? 250 : 600);
  }, { passive: false });
  // swipe on a phone (or a touch screen)
  let x0 = null;
  book.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') x0 = e.clientX; });
  book.addEventListener('pointerup', (e) => {
    if (x0 == null) return;
    const dx = e.clientX - x0; x0 = null;
    if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
  });
  const onResize = () => { if (narrow()) page = Math.max(1, Math.min(pages.length - 1, inView()[0] ?? 1)); paint(); clearOrnaments(); };
  addEventListener('resize', onResize);

  function close(now = false) {
    if (!dialog.isConnected) return;
    removeEventListener('resize', onResize);
    if (current === api) current = null;
    const done = () => { if (dialog.open) dialog.close(); dialog.remove(); if (!now) onClose(); };
    if (now || reduced) { done(); return; }
    dialog.classList.add('closing');
    setTimeout(done, 380);
  }
  dialog.addEventListener('cancel', (e) => { e.preventDefault(); close(); });
  const api = { close };
  current = api;

  renderBook();
  dialog.showModal();
  paint();
  fitPages();
  // pictures arriving later can push a page over: fit again once they have loaded
  book.querySelectorAll('img').forEach((img) => { if (!img.complete) img.addEventListener('load', fitPages, { once: true }); });
  dialog.querySelector('.cb-next').focus({ preventScroll: true });
  // the cover opens by itself
  if (narrow()) { page = 1; paint(); } else setTimeout(() => goSpread(1), reduced ? 0 : 300);
  return api;
}
