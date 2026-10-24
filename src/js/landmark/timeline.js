// Time travel tab, styled after Google Earth's historical-imagery slider.
// Eras are spaced evenly on the slider (not by real years), so a landmark covering 4,500 years
// and one covering 140 years both get a usable slider. While you drag, the two neighbouring
// era images cross-fade; when you let go, the slider snaps to the nearest era.
import { $, $$, esc, icon, imageSrc, creditHTML, prefersReducedMotion } from '../common.js';

export function initTimeline(pane, layer, { lm, media }) {
  const eras = lm.eras;
  const last = eras.length - 1;
  const src = (i) => imageSrc(eras[i].image, media);

  pane.innerHTML = `
    <div class="panel-section era-detail" id="era-detail" aria-live="polite"></div>
    <section class="panel-section" aria-labelledby="eras-title">
      <h2 id="eras-title">Timeline</h2>
      <ol class="timeline-list" id="timeline-list">
        ${eras.map((e, i) => `
          <li><button type="button" data-i="${i}">
            <span class="y">${esc(e.label.replace('Today', 'Now'))}</span><span class="dot"></span>
            <span class="label">${esc(e.title)}</span>
          </button></li>`).join('')}
      </ol>
      <p class="t-body-s muted mt-3 mb-0">Drag the slider under the photo, or use the arrow keys. Steps are spaced evenly, not to scale.</p>
    </section>`;

  layer.innerHTML = `
    <figure class="era-stage m-0" id="era-stage">
      <div class="era-bg" aria-hidden="true"></div>
      <img class="era-img" id="era-img-a" alt="">
      <img class="era-img" id="era-img-b" alt="" aria-hidden="true" style="opacity:0">
      <span class="era-year" aria-hidden="true"></span>
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

  function showEra(i) {
    current = i;
    const e = eras[i];
    stage.querySelector('.era-year').textContent = e.label;
    stage.querySelector('.era-bg').style.backgroundImage = `url("${src(i)}")`;
    const detail = $('#era-detail', pane);
    detail.classList.remove('swap'); void detail.offsetWidth; detail.classList.add('swap');
    detail.innerHTML = `
      <p class="year mb-1">${esc(e.label)}</p>
      <h2 class="t-title mb-2">${esc(e.title)}</h2>
      <p>${esc(e.text)}</p>
      <p class="t-body-s muted mb-0">Image: ${creditHTML(e.image, media)}</p>`;
    range.setAttribute('aria-valuetext', `${e.label}: ${e.title}`);
    $$('.tick', layer).forEach((t) => t.classList.toggle('active', Number(t.dataset.i) === i));
    $$('#timeline-list button', pane).forEach((b) => b.parentElement.classList.toggle('active', Number(b.dataset.i) === i));
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
      const t = Math.min(1, (now - start) / dur);
      const v = from + (target - from) * (1 - (1 - t) ** 3);
      range.value = v;
      render(v);
      if (t < 1) anim = requestAnimationFrame(step);
    };
    anim = requestAnimationFrame(step);
  }

  range.addEventListener('pointerdown', () => { stopPlay(); cancelAnimationFrame(anim); stage.classList.add('dragging'); });
  range.addEventListener('input', () => render(Number(range.value)));
  range.addEventListener('change', () => { stage.classList.remove('dragging'); goTo(Math.round(Number(range.value))); });
  range.addEventListener('keydown', (e) => {
    const keys = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1 };
    if (e.key in keys) { e.preventDefault(); stopPlay(); goTo(current + keys[e.key]); }
    if (e.key === 'Home') { e.preventDefault(); goTo(0); }
    if (e.key === 'End') { e.preventDefault(); goTo(last); }
  });
  q('.ticks').addEventListener('click', (e) => { const t = e.target.closest('.tick'); if (t) { stopPlay(); goTo(Number(t.dataset.i)); } });
  $('#timeline-list', pane).addEventListener('click', (e) => {
    const b = e.target.closest('[data-i]');
    if (b) { stopPlay(); if (compareOn) setCompare(false); goTo(Number(b.dataset.i)); }
  });
  q('#era-prev').addEventListener('click', () => { stopPlay(); goTo(current - 1); });
  q('#era-next').addEventListener('click', () => { stopPlay(); goTo(current + 1); });

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
    timer = setInterval(() => (current >= last ? stopPlay() : goTo(current + 1)), 4200);
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

  render(0);
  return { onHide: stopPlay };
}
