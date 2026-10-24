// Landmark page: a content panel with three tabs (left) and a large viewport (right).
// Each tab owns a panel pane and a viewport layer: era photos, story media, or the visitor map.
import {
  $, $$, esc, icon, param, loadCities, loadLandmark, loadMedia, noteImage, creditsBlock,
  localTime, formatCoords, showError,
} from '../common.js';
import { openStatus } from '../hours.js';
import { initTimeline } from '../landmark/timeline.js';
import { initStory } from '../landmark/story.js';
import { initGuide } from '../landmark/guide.js';

const TABS = [
  { id: 'time', label: 'Time travel', icon: 'history' },
  { id: 'story', label: 'Stories', icon: 'headphones' },
  { id: 'guide', label: 'Visit', icon: 'directions_walk' },
];

async function main() {
  const id = param('id');
  const [cities, media] = await Promise.all([loadCities(), loadMedia()]);
  let lm;
  try { lm = await loadLandmark(id); } catch { return showError(`There's no landmark called "${id ?? ''}" in the atlas yet.`); }
  const city = cities.find((c) => c.id === lm.city);
  document.title = `${lm.name} · Atlas of Stories`;
  $('#back-btn').href = `city.html?id=${encodeURIComponent(city.id)}`;
  $('#back-btn').setAttribute('aria-label', `Back to ${city.name}`);

  // Every image the page can show is listed in the credits.
  [lm.hero, ...lm.eras.map((e) => e.image), ...lm.story.map((s) => s.image)].forEach((ref) => noteImage(ref, media));

  const status = openStatus(lm.guide.hours, city.timezone);
  $('#panel').innerHTML = `
    <header class="panel-section">
      <p class="crumb mb-1"><a href="index.html#${esc(lm.id)}">Globe</a> › <a href="city.html?id=${encodeURIComponent(city.id)}">${esc(city.name)}</a></p>
      <h1 class="t-display mb-1">${esc(lm.name)}</h1>
      <p class="muted mb-3">${esc(lm.localName ?? '')}</p>
      <div class="meta-row">
        <button type="button" class="status ${status.state} border-0 bg-transparent p-0" data-goto="guide">${esc(status.text)}</button>
        <span>${icon('schedule')}<span id="lm-time">${esc(localTime(city.timezone))}</span></span>
        <span>${icon('location_on')}${formatCoords(lm.lat, lm.lon, 4)}</span>
      </div>
      <p class="mt-3 mb-0">${esc(lm.summary)}</p>
    </header>
    <nav class="m-tabs" role="tablist" aria-label="Ways to explore">
      ${TABS.map((t, i) => `
        <button class="m-tab ${i === 0 ? 'active' : ''}" type="button" role="tab" id="tab-${t.id}" data-tab="${t.id}"
          aria-selected="${i === 0}" aria-controls="pane-${t.id}" tabindex="${i === 0 ? 0 : -1}">${icon(t.icon)}${t.label}</button>`).join('')}
    </nav>
    ${TABS.map((t, i) => `<div class="tab-pane-m" role="tabpanel" id="pane-${t.id}" aria-labelledby="tab-${t.id}" ${i ? 'hidden' : ''}></div>`).join('')}
    ${creditsBlock(lm.credits)}`;

  $('#viewport').innerHTML = TABS.map((t, i) => `<div class="viewport-layer" id="vp-${t.id}" ${i ? 'hidden' : ''}></div>`).join('');

  const ctx = { lm, city, media };
  const tabs = {
    time: initTimeline($('#pane-time'), $('#vp-time'), ctx),
    story: initStory($('#pane-story'), $('#vp-story'), ctx),
    guide: initGuide($('#pane-guide'), $('#vp-guide'), ctx),
  };

  let current = 'time';
  function select(tabId, { focus = false } = {}) {
    if (!tabs[tabId] || tabId === current) return;
    tabs[current].onHide?.();
    current = tabId;
    for (const t of TABS) {
      const on = t.id === tabId;
      const btn = $(`#tab-${t.id}`);
      btn.classList.toggle('active', on);
      btn.setAttribute('aria-selected', on);
      btn.tabIndex = on ? 0 : -1;
      $(`#pane-${t.id}`).hidden = !on;
      $(`#vp-${t.id}`).hidden = !on;
    }
    if (focus) $(`#tab-${tabId}`).focus();
    tabs[tabId].onShow?.();
    history.replaceState(null, '', `#${tabId}`);
  }

  const tablist = $('.m-tabs');
  tablist.addEventListener('click', (e) => { const b = e.target.closest('[data-tab]'); if (b) select(b.dataset.tab); });
  tablist.addEventListener('keydown', (e) => {
    const i = TABS.findIndex((t) => t.id === current);
    if (e.key === 'ArrowRight') select(TABS[(i + 1) % TABS.length].id, { focus: true });
    if (e.key === 'ArrowLeft') select(TABS[(i + TABS.length - 1) % TABS.length].id, { focus: true });
  });
  $$('[data-goto]').forEach((el) => el.addEventListener('click', () => {
    select(el.dataset.goto);
    tablist.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }));

  const initial = location.hash.slice(1);
  if (tabs[initial]) select(initial);

  setInterval(() => { $('#lm-time').textContent = localTime(city.timezone); }, 30_000);
}

main().catch((err) => { console.error(err); showError('Something went wrong while loading this landmark.'); });
