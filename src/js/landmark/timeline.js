// Time travel page, styled after Google Earth's historical-imagery slider.
// The first slide holds the photo and the time slider; then every era is a slide of its own (its year in the
// beige frame, its photo, and a card with its story), so the timeline along the bottom of the page is a
// real timeline of the landmark. Moving to an era's slide also sets the slider to that era, and
// "See it on the time slider" or "Compare" go back to the first slide at that era.
// Eras are spaced evenly on the slider (not by real years), so a landmark covering 4,500 years
// and one covering 140 years both get a usable slider. While you drag, the two neighbouring
// era images cross-fade; when you let go, the slider snaps to the nearest era.
import { $, $$, esc, icon, imageSrc, creditHTML, prefersReducedMotion } from '../common.js';
import { slide, photo, titleFrame, bigNumber } from '../slides.js';
import { motifLayer } from '../motifs.js';

export function initTimeline(track, layer, { lm, media, initialEra = 0 }) {
  const eras = lm.eras;
  const last = eras.length - 1;
  const src = (i) => imageSrc(eras[i].image, media);
  // How old an era is, from 0 (now) to 1 (thousands of years ago): older eras get a heavier film grain.
  const thisYear = new Date().getFullYear();
  const ageOf = (era) => Math.min(1, Math.log10(Math.max(1, thisYear - (era.year ?? thisYear)) + 1) / Math.log10(5000));
  let deck = null;

  track.insertAdjacentHTML('beforeend', eras.map((e, i) => slide({
    id: `era-${i}`,
    title: esc(e.label),
    tone: i % 2 ? 'dark' : 'light',
    flip: i % 2 === 1,
    label: `era-title-${i}`,
    cls: 'era-slide',
    bg: esc(src(i)),
    body: `
      ${motifLayer(e.motifs)}
      <div class="s-col">
      ${titleFrame(`
        <p class="kicker">Era ${i + 1} of ${eras.length}</p>
        <p class="s-year">${esc(e.label)}</p>
        <h2 id="era-title-${i}" class="s-title-s mb-0">${esc(e.title)}</h2>`)}
      <div class="s-card" data-reveal data-drift style="--d:2">
        <p>${esc(e.text)}</p>
        <div class="s-actions">
          <button type="button" class="btn-m btn-frame" data-show-era="${i}">${icon('history')}See it on the time slider</button>
          ${i < last ? `<button type="button" class="btn-m btn-line" data-compare-era="${i}">${icon('compare')}Compare with ${esc(eras[last].label)}</button>` : ''}
        </div>
      </div>
      ${bigNumber(String(i + 1).padStart(2, '0'))}
      </div>
      ${photo(esc(src(i)), esc(e.image.alt ?? ''), creditHTML(e.image, media))}`,
  })).join(''));

  layer.innerHTML = `
    <figure class="era-stage m-0" id="era-stage">
      <div class="era-bg" aria-hidden="true"></div>
      <img class="era-img" id="era-img-a" alt="">
      <img class="era-img" id="era-img-b" alt="" aria-hidden="true" style="opacity:0">
      <div class="era-caption" aria-hidden="true"><span class="era-year"></span><span class="era-cap-title"></span></div>
    </figure>
    <div class="compare" id="compare" hidden>
      <img class="cmp-a" id="cmp-a" alt="">
      <img class="cmp-b" id="cmp-b" alt="">
      <div class="cmp-handle" aria-hidden="true">${icon('swap_horiz')}</div>
      <span class="cmp-label left" id="cmp-label-a"></span>
      <span class="cmp-label right" id="cmp-label-b"></span>
      <label for="cmp-range" class="visually-hidden">Move the divider between the two eras</label>
      <input type="range" class="cmp-range" id="cmp-range" min="0" max="100" value="50">
    </div>
    <div class="timebar">
      <button type="button" class="icon-btn" id="era-play" aria-label="Play through time">${icon('play_arrow')}</button>
      <button type="button" class="icon-btn" id="era-prev" aria-label="Previous era">${icon('chevron_left')}</button>
      <div class="track" id="era-track">
        <label for="era-range" class="visually-hidden">Drag through time</label>
        <input type="range" id="era-range" min="0" max="${last}" step="any" value="0">
        <div class="ticks">
          ${eras.map((e, i) => `<button type="button" class="tick" data-i="${i}" tabindex="-1" style="left:${last ? (i / last) * 100 : 50}%">${esc(e.label)}</button>`).join('')}
        </div>
      </div>
      <div class="compare-selects" id="compare-selects" hidden>
        <label class="visually-hidden" for="cmp-sel-a">Left photo</label><select id="cmp-sel-a"></select>
        ${icon('compare_arrows')}
        <label class="visually-hidden" for="cmp-sel-b">Right photo</label><select id="cmp-sel-b"></select>
      </div>
      <button type="button" class="icon-btn" id="era-next" aria-label="Next era">${icon('chevron_right')}</button>
      <button type="button" class="icon-btn" id="compare-toggle" aria-pressed="false" aria-label="Before and after comparison" title="Before / after">${icon('compare')}</button>
    </div>`;

  // Each era's slide develops its photo when it arrives, with a grain that grows with the era's age (CSS).
  eras.forEach((e, i) => track.querySelector(`#era-${i}`)?.style.setProperty('--age', ageOf(e).toFixed(2)));

  // Preload all era images so dragging is smooth.
  eras.forEach((_, i) => { const im = new Image(); im.src = src(i); });

  const q = (sel) => $(sel, layer);
  const stage = q('#era-stage');
  const imgA = q('#era-img-a');
  const imgB = q('#era-img-b');
  const range = q('#era-range');
  let current = -1;
  let baseIndex = -1;

  function render(value) {
    const i = Math.min(Math.floor(value), last);
    const f = value - i;
    if (baseIndex !== i) {
      baseIndex = i;
      imgA.src = src(i);
      imgA.alt = eras[i].image.alt ?? '';
      if (i < last) imgB.src = src(i + 1);
    }
    imgB.style.opacity = i < last ? f : 0;
    const nearest = Math.round(value);
    if (nearest !== current) showEra(nearest);
  }

  // ----- Thirteenth round: the photo develops like a print in a darkroom, and the year rolls like a counter -----
  let devTimer = 0;
  function develop(era) {
    if (prefersReducedMotion() || stage.classList.contains('dragging')) return;
    stage.style.setProperty('--age', ageOf(era).toFixed(2));
    stage.classList.remove('developing');
    void stage.offsetWidth; // restart the animation
    stage.classList.add('developing');
    clearTimeout(devTimer);
    devTimer = setTimeout(() => stage.classList.remove('developing'), 1700);
  }
  /** Writes the era's label; when both labels are years of the same length, their digits roll from one to the other. */
  const yearEl = stage.querySelector('.era-year');
  let shownLabel = '';
  function setYear(label) {
    const from = /^(\D*)(\d+)(\D*)$/.exec(shownLabel);
    const to = /^(\D*)(\d+)(\D*)$/.exec(label);
    const was = shownLabel;
    shownLabel = label;
    if (!was || prefersReducedMotion() || stage.classList.contains('dragging')) { yearEl.textContent = label; return; }
    if (!from || !to || from[1] !== to[1] || from[3] !== to[3] || from[2].length !== to[2].length) {
      yearEl.textContent = label;
      yearEl.classList.remove('year-swap');
      void yearEl.offsetWidth;
      yearEl.classList.add('year-swap');
      return;
    }
    const up = label > was; // later years roll upwards
    const strip = Array.from({ length: 10 }, (_, d) => `<span>${d}</span>`).join('');
    yearEl.innerHTML = `${esc(to[1])}${[...to[2]].map((d, k) => `<span class="odo"><span class="odo-col" style="--d:${from[2][k]}">${strip}</span></span>`).join('')}${esc(to[3])}`;
    const cols = $$('.odo-col', yearEl);
    void yearEl.offsetWidth; // start from the old digits
    cols.forEach((c, k) => {
      if (to[2][k] === from[2][k]) return;
      c.style.transitionDelay = `${(up ? cols.length - 1 - k : k) * 70}ms`;
      c.style.setProperty('--d', to[2][k]);
    });
  }

  function showEra(i) {
    const first = current === -1;
    current = i;
    const e = eras[i];
    setYear(e.label);
    if (!first) develop(e);
    stage.querySelector('.era-cap-title').textContent = e.title;
    stage.querySelector('.era-bg').style.backgroundImage = `url("${src(i)}")`;
    range.setAttribute('aria-valuetext', `${e.label}: ${e.title}`);
    $$('.tick', layer).forEach((t) => t.classList.toggle('active', Number(t.dataset.i) === i));
    q('#era-prev').disabled = i === 0;
    q('#era-next').disabled = i === last;
  }

  let anim = null;
  function goTo(target) {
    target = Math.max(0, Math.min(last, target));
    cancelAnimationFrame(anim);
    const from = Number(range.value);
    if (prefersReducedMotion() || from === target) { range.value = target; render(target); return; }
    const start = performance.now();
    const dur = 600;
    const step = (now) => {
      // The first frame's timestamp can be a little before `start`; never let progress go below 0.
      const t = Math.max(0, Math.min(1, (now - start) / dur));
      const v = from + (target - from) * (1 - (1 - t) ** 3);
      range.value = v;
      render(v);
      if (t < 1) anim = requestAnimationFrame(step);
    };
    anim = requestAnimationFrame(step);
  }

  range.addEventListener('pointerdown', () => { stopPlay(); cancelAnimationFrame(anim); stage.classList.add('dragging'); });
  range.addEventListener('input', () => render(Number(range.value)));
  range.addEventListener('change', () => { stage.classList.remove('dragging'); userGo(Math.round(Number(range.value))); });
  range.addEventListener('keydown', (e) => {
    const keys = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1 };
    if (e.key in keys) { e.preventDefault(); stopPlay(); userGo(current + keys[e.key]); }
    if (e.key === 'Home') { e.preventDefault(); userGo(0); }
    if (e.key === 'End') { e.preventDefault(); userGo(last); }
  });
  q('.ticks').addEventListener('click', (e) => { const t = e.target.closest('.tick'); if (t) { stopPlay(); userGo(Number(t.dataset.i)); } });
  q('#era-prev').addEventListener('click', () => { stopPlay(); userGo(current - 1); });
  q('#era-next').addEventListener('click', () => { stopPlay(); userGo(current + 1); });

  /** Moves the photo and slider to era i. */
  function userGo(i) { goTo(Math.max(0, Math.min(last, i))); }
  // "See it on the time slider" and "Compare": back to the first slide, at that era.
  track.addEventListener('click', (e) => {
    const show = e.target.closest('[data-show-era]');
    const cmp = e.target.closest('[data-compare-era]');
    if (!show && !cmp) return;
    stopPlay();
    deck?.go(0);
    if (show) {
      if (compareOn) setCompare(false);
      userGo(Number(show.dataset.showEra));
      range.focus({ preventScroll: true });
    } else {
      selA.value = cmp.dataset.compareEra; selB.value = last;
      setCompare(true);
      q('#cmp-range').focus({ preventScroll: true });
    }
  });

  // Auto-play through all eras.
  let timer = null;
  const playBtn = q('#era-play');
  function stopPlay() {
    clearInterval(timer); timer = null;
    playBtn.innerHTML = icon('play_arrow');
    playBtn.setAttribute('aria-label', 'Play through time');
  }
  playBtn.addEventListener('click', () => {
    if (timer) return stopPlay();
    if (compareOn) setCompare(false);
    if (current === last) goTo(0);
    playBtn.innerHTML = icon('pause');
    playBtn.setAttribute('aria-label', 'Pause');
    timer = setInterval(() => (current >= last ? stopPlay() : userGo(current + 1)), 4200);
  });

  // ----- Before / after comparison -----
  const selA = q('#cmp-sel-a');
  const selB = q('#cmp-sel-b');
  const options = eras.map((e, i) => `<option value="${i}">${esc(e.label)}</option>`).join('');
  selA.innerHTML = options; selB.innerHTML = options;
  selA.value = 0; selB.value = last;
  let compareOn = false;

  function updateCompare() {
    // Photos fill the frame; image.focus (CSS object-position) keeps the subject in view when cropped.
    const set = (el, i) => { const era = eras[i]; el.src = src(i); el.alt = era.image.alt ?? ''; el.style.objectPosition = era.image.focus ?? 'center'; };
    set(q('#cmp-a'), selA.value); set(q('#cmp-b'), selB.value);
    q('#cmp-label-a').textContent = eras[selA.value].label;
    q('#cmp-label-b').textContent = eras[selB.value].label;
  }
  function setCompare(on) {
    compareOn = on;
    stopPlay();
    q('#compare-toggle').setAttribute('aria-pressed', on);
    q('#compare').hidden = !on;
    stage.hidden = on;
    q('#era-track').hidden = on;
    q('#compare-selects').hidden = !on;
    ['#era-prev', '#era-next', '#era-play'].forEach((s) => { q(s).hidden = on; });
    if (on) updateCompare();
  }
  selA.addEventListener('change', updateCompare);
  selB.addEventListener('change', updateCompare);
  q('#cmp-range').addEventListener('input', (e) => q('#compare').style.setProperty('--pos', `${e.target.value}%`));
  q('#compare-toggle').addEventListener('click', () => setCompare(!compareOn));

  const start = Number.isInteger(initialEra) ? Math.min(Math.max(initialEra, 0), last) : 0;
  range.value = start;
  render(start);
  return {
    onDeck(d) { deck = d; },
    // Reading an era's slide sets the slider to that era, ready for when the visitor goes back.
    onSlide(i) {
      if (i === 0) return;
      stopPlay();
      if (current !== i - 1 && !compareOn) { cancelAnimationFrame(anim); range.value = i - 1; render(i - 1); }
    },
    onHide: stopPlay,
  };
}
