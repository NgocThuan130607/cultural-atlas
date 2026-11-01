// Shared frame for the three landmark pages (Time travel, Stories, Visit).
// Each page shows the same header and a page switcher, then one view: a content pane (left) and a large viewport (right).
import {
  $, esc, icon, param, loadCities, loadLandmark, loadMedia, noteImage, creditsBlock,
  localTime, formatCoords, showError, LANDMARK_PAGES, landmarkUrl,
} from '../common.js';
import { openStatus } from '../hours.js';

/**
 * Builds a landmark page.
 * @param {string} active  which page this is: 'time', 'story' or 'guide'
 * @param {(pane: HTMLElement, viewport: HTMLElement, ctx: object) => {onShow?, onHide?}} init  the page's own view
 */
export async function initLandmarkPage(active, init) {
  const page = LANDMARK_PAGES.find((p) => p.id === active);
  const id = param('id');
  const [cities, media] = await Promise.all([loadCities(), loadMedia()]);
  let lm;
  try { lm = await loadLandmark(id); } catch { return showError(`There's no landmark called "${id ?? ''}" in the atlas yet.`); }
  const city = cities.find((c) => c.id === lm.city);
  document.title = `${lm.name} · ${page.label} · Atlas of Stories`;
  $('#back-btn').href = `city.html?id=${encodeURIComponent(city.id)}`;
  $('#back-btn').setAttribute('aria-label', `Back to ${city.name}`);

  // Every image the landmark can show is listed in the credits.
  [lm.hero, ...lm.eras.map((e) => e.image), ...lm.story.map((s) => s.image)].forEach((ref) => noteImage(ref, media));

  const status = openStatus(lm.guide.hours, city.timezone);
  $('#panel').innerHTML = `
    <header class="panel-section">
      <p class="crumb mb-1"><a href="index.html#${esc(lm.id)}">Globe</a> › <a href="city.html?id=${encodeURIComponent(city.id)}">${esc(city.name)}</a> › ${esc(page.label)}</p>
      <h1 class="t-display mb-1">${esc(lm.name)}</h1>
      <p class="muted mb-3">${esc(lm.localName ?? '')}</p>
      <div class="meta-row">
        <a class="status ${status.state}" href="${landmarkUrl(lm.id, 'guide')}">${esc(status.text)}</a>
        <span>${icon('schedule')}<span id="lm-time">${esc(localTime(city.timezone))}</span></span>
        <span>${icon('location_on')}${formatCoords(lm.lat, lm.lon, 4)}</span>
      </div>
      <p class="mt-3 mb-0">${esc(lm.summary)}</p>
    </header>
    <nav class="m-tabs" aria-label="Ways to explore ${esc(lm.name)}">
      ${LANDMARK_PAGES.map((p) => `
        <a class="m-tab ${p.id === active ? 'active' : ''}" href="${landmarkUrl(lm.id, p.id)}"
          ${p.id === active ? 'aria-current="page"' : ''}>${icon(p.icon)}${p.label}</a>`).join('')}
    </nav>
    <div class="tab-pane-m" id="pane"></div>
    ${creditsBlock(lm.credits)}`;
  $('#viewport').innerHTML = '<div class="viewport-layer" id="vp"></div>';

  const era = Number(param('era'));
  const ctx = { lm, city, media, initialEra: Number.isInteger(era) ? era : 0 };
  const view = init($('#pane'), $('#vp'), ctx);
  view?.onShow?.();
  // Stop narration or autoplay when leaving the page (also covers the back/forward cache).
  addEventListener('pagehide', () => view?.onHide?.());

  setInterval(() => { $('#lm-time').textContent = localTime(city.timezone); }, 30_000);
}

/** Runs a landmark page and shows a friendly message if anything fails. */
export function runLandmarkPage(active, init) {
  initLandmarkPage(active, init).catch((err) => { console.error(err); showError('Something went wrong while loading this landmark.'); });
}
