// "The world in one year": logic and the world timeline bar.
// Pure DOM + data, no Cesium or Leaflet, so it works with both the 3D globe and the 2D map.
import { $, $$, esc, icon, prefersReducedMotion } from './common.js';

// ---------------------------------------------------------------------------
// Year scale: piecewise-linear, so 4,600 years of antiquity don't swallow the slider.
// Each anchor is [year, position 0..1].
// ---------------------------------------------------------------------------
export function createYearScale({ from, to, anchors: custom }) {
  // `custom` (from the moments file) lets each atlas give more room to the centuries it cares about.
  const anchors = (custom ?? [[from, 0], [0, 0.18], [1000, 0.36], [1500, 0.48], [1800, 0.62], [1900, 0.74], [to, 1]])
    .filter(([y], i, a) => i === 0 || i === a.length - 1 || (y > from && y < to));
  const lerp = (a, b, t) => a + (b - a) * t;
  return {
    toPos(year) {
      const y = Math.min(to, Math.max(from, year));
      for (let i = 1; i < anchors.length; i++) {
        const [y0, p0] = anchors[i - 1];
        const [y1, p1] = anchors[i];
        if (y <= y1) return lerp(p0, p1, (y - y0) / (y1 - y0));
      }
      return 1;
    },
    toYear(pos) {
      const p = Math.min(1, Math.max(0, pos));
      for (let i = 1; i < anchors.length; i++) {
        const [y0, p0] = anchors[i - 1];
        const [y1, p1] = anchors[i];
        if (p <= p1) {
          const y = lerp(y0, y1, (p - p0) / (p1 - p0));
          // Coarser steps far back in time, single years in recent history.
          return Math.abs(y) >= 1000 && y < 0 ? Math.round(y / 10) * 10 : Math.round(y);
        }
      }
      return to;
    },
  };
}

/** "c. 2560 BCE", "80 CE", "1889". There is no year 0, so 0 shows as 1 CE. */
export function formatYear(year, approx = false) {
  const y = year === 0 ? 1 : year;
  const text = y < 0 ? `${-y} BCE` : y < 1000 ? `${y} CE` : String(y);
  return approx ? `c. ${text}` : text;
}

export const periodOf = (year, periods) => periods.find((p) => year >= p.from && year < p.to) ?? periods[periods.length - 1];

// ---------------------------------------------------------------------------
// Snapshot: what each city looked like in a given year
// ---------------------------------------------------------------------------
export const EVENT_WINDOW = 5; // an entry this many years old or newer counts as "happening now"

/**
 * For each city: the latest timeline entry at or before `year`, whether it is a fresh event,
 * and the state of each of the city's landmarks (story not started yet, or the era it is in).
 */
export function snapshot(year, cities, cityDetails, lmById) {
  return cities.map((city) => {
    const timeline = cityDetails[city.id]?.timeline ?? [];
    let entry = null;
    for (const e of timeline) if (e.year <= year) entry = e;
    const landmarks = city.landmarks.map((id) => lmById.get(id)).filter(Boolean).map((lm) => {
      if (year < lm.eras[0].year) return { lm, state: 'future', era: lm.eras[0], index: 0 };
      let index = 0;
      lm.eras.forEach((e, i) => { if (e.year <= year) index = i; });
      return { lm, state: 'era', era: lm.eras[index], index };
    });
    const isEvent = Boolean(entry && year - entry.year <= EVENT_WINDOW);
    return { city, entry, isEvent, landmarks };
  });
}

// ---------------------------------------------------------------------------
// World timeline bar
// ---------------------------------------------------------------------------
/**
 * Builds the bar inside `root`.
 * onChange(year, { final, moment }) is called while dragging (final=false) and when a year is settled.
 */
export function createWorldBar(root, { range, periods, moments, onChange, onExit }) {
  const scale = createYearScale(range);
  const reduced = prefersReducedMotion();
  const pct = (y) => `${(scale.toPos(y) * 100).toFixed(2)}%`;

  root.innerHTML = `
    <div class="wb-head">
      <div class="wb-year">
        <span class="wb-num" id="wb-num"></span>
        <span class="wb-period" id="wb-period"></span>
      </div>
      <p class="wb-title" id="wb-title"></p>
      <div class="wb-actions">
        <button type="button" class="icon-btn" id="wb-prev" aria-label="Previous moment">${icon('skip_previous')}</button>
        <button type="button" class="icon-btn wb-play" id="wb-play" aria-label="Play through history">${icon('play_arrow', 'fill')}</button>
        <button type="button" class="icon-btn" id="wb-next" aria-label="Next moment">${icon('skip_next')}</button>
        <button type="button" class="icon-btn" id="wb-exit" aria-label="Leave the world timeline">${icon('close')}</button>
      </div>
    </div>
    <div class="wb-track">
      <div class="wb-periods" aria-hidden="true">
        ${periods.map((p) => `<span style="left:${pct(p.from)};width:calc(${pct(p.to)} - ${pct(p.from)})">${esc(p.label)}</span>`).join('')}
      </div>
      <label class="visually-hidden" for="wb-range">Choose a year</label>
      <input type="range" id="wb-range" min="0" max="1000" step="1" value="0">
      <div class="wb-ticks">
        ${moments.map((m, i) => `<button type="button" class="wb-tick" data-i="${i}" tabindex="-1" style="left:${pct(m.year)}"
          title="${esc(m.title)}"><span>${esc(m.label ?? formatYear(m.year, m.year < -1000))}</span></button>`).join('')}
      </div>
    </div>`;

  const q = (s) => $(s, root);
  const rangeEl = q('#wb-range');
  let year = range.to;
  let shownYear = year;
  let tween = null;

  const momentAt = (y) => moments.find((m) => m.year === y) ?? null;
  // Years far back in time are always approximate.
  const label = (y) => momentAt(y)?.label ?? formatYear(y, y < -1000);

  function paint(y, moment) {
    q('#wb-num').textContent = label(y);
    q('#wb-period').textContent = periodOf(y, periods).label;
    q('#wb-title').textContent = moment?.title ?? momentAt(y)?.title ?? '';
    rangeEl.value = Math.round(scale.toPos(y) * 1000);
    rangeEl.setAttribute('aria-valuetext', `${label(y)}${moment ? `: ${moment.title}` : ''}`);
    $$('.wb-tick', root).forEach((t) => t.classList.toggle('active', moments[t.dataset.i].year === y));
  }

  /** Moves to a year. With `animate`, the year counts up/down to it. */
  function setYear(y, { animate = false, final = true, moment = momentAt(y) } = {}) {
    cancelAnimationFrame(tween);
    year = y;
    if (!animate || reduced || shownYear === y) {
      shownYear = y;
      paint(y, moment);
      onChange(y, { final, moment });
      return;
    }
    // Count through the years, easing out, and report the end year once. The title changes straight away.
    q('#wb-title').textContent = moment?.title ?? '';
    const from = shownYear;
    const start = performance.now();
    const dur = 900;
    const step = (now) => {
      const t = Math.min(1, (now - start) / dur);
      const v = Math.round(from + (y - from) * (1 - (1 - t) ** 3));
      shownYear = v;
      q('#wb-num').textContent = label(t < 1 ? v : y);
      rangeEl.value = Math.round(scale.toPos(v) * 1000);
      if (t < 1) tween = requestAnimationFrame(step);
      else { shownYear = y; paint(y, moment); }
    };
    tween = requestAnimationFrame(step);
    onChange(y, { final, moment });
  }

  // ----- Dragging: live preview, snap to a nearby moment on release -----
  let frame = 0;
  rangeEl.addEventListener('pointerdown', stop);
  rangeEl.addEventListener('input', () => {
    stop();
    const y = scale.toYear(rangeEl.value / 1000);
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => setYear(y, { final: false }));
  });
  rangeEl.addEventListener('change', () => {
    const pos = rangeEl.value / 1000;
    const near = moments.find((m) => Math.abs(scale.toPos(m.year) - pos) < 0.012);
    setYear(near ? near.year : scale.toYear(pos), { final: true });
  });
  rangeEl.addEventListener('keydown', (e) => {
    const step = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1 }[e.key];
    if (step) {
      e.preventDefault(); stop();
      const by = year < -1000 ? 50 : year < 1000 ? 10 : 1; // bigger steps far back in time
      setYear(Math.min(range.to, Math.max(range.from, year + step * by)));
    } else if (e.key === 'PageUp' || e.key === 'PageDown') {
      e.preventDefault(); stop(); jump(e.key === 'PageUp' ? 1 : -1);
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault(); stop(); setYear(e.key === 'Home' ? range.from : range.to);
    }
  });

  // ----- Moments -----
  function jump(dir) {
    const next = dir > 0 ? moments.find((m) => m.year > year) : [...moments].reverse().find((m) => m.year < year);
    if (next) setYear(next.year, { animate: true, moment: next });
  }
  q('.wb-ticks').addEventListener('click', (e) => {
    const t = e.target.closest('.wb-tick');
    if (t) { stop(); const m = moments[t.dataset.i]; setYear(m.year, { animate: true, moment: m }); }
  });
  q('#wb-prev').addEventListener('click', () => { stop(); jump(-1); });
  q('#wb-next').addEventListener('click', () => { stop(); jump(1); });
  q('#wb-exit').addEventListener('click', () => { stop(); onExit(); });

  // ----- Play: a tour through every moment -----
  let timer = null;
  const playBtn = q('#wb-play');
  function stop() {
    if (!timer) return;
    clearTimeout(timer); timer = null;
    playBtn.innerHTML = icon('play_arrow', 'fill');
    playBtn.setAttribute('aria-label', 'Play through history');
  }
  function play() {
    playBtn.innerHTML = icon('pause', 'fill');
    playBtn.setAttribute('aria-label', 'Pause');
    const tick = () => {
      const next = moments.find((m) => m.year > year);
      if (!next) { stop(); return; }
      setYear(next.year, { animate: true, moment: next });
      timer = setTimeout(tick, 6500);
    };
    // Start from the beginning if we're already at the end.
    if (!moments.some((m) => m.year > year)) { setYear(moments[0].year, { animate: true, moment: moments[0] }); timer = setTimeout(tick, 6500); }
    else tick();
  }
  playBtn.addEventListener('click', () => (timer ? stop() : play()));

  return { setYear, stop, get year() { return year; }, get playing() { return Boolean(timer); } };
}
