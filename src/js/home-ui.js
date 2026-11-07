// Home page helpers added after user testing, when first-time visitors weren't sure what the site was for
// and found too many buttons:
// - a welcome dialog on the first visit, explaining the purpose in three steps (reopened with the "?" button);
// - a "Map options" menu that holds the less-used globe controls.
import { $, icon } from './common.js';

const SEEN_KEY = 'atlas-welcome-seen';

export function initWelcome({ showNow }) {
  const dialog = document.createElement('dialog');
  dialog.className = 'welcome';
  dialog.setAttribute('aria-labelledby', 'welcome-title');
  dialog.innerHTML = `
    <button type="button" class="icon-btn welcome-close" data-close aria-label="Close">${icon('close')}</button>
    <span class="ms welcome-mark" aria-hidden="true">travel_explore</span>
    <h2 id="welcome-title" class="t-headline">Welcome to Atlas of Stories</h2>
    <p class="welcome-lead">Get to know a place before you travel: its history, its stories and its local customs.</p>
    <ol class="welcome-steps">
      <li>${icon('travel_explore')}<span><strong>Choose a place</strong>Spin the globe, search, or let us suggest one for you.</span></li>
      <li>${icon('history')}<span><strong>Explore it</strong>Travel back through its history, listen to its stories and watch old films.</span></li>
      <li>${icon('luggage')}<span><strong>Plan your visit</strong>Save places, check opening hours and plan your days.</span></li>
    </ol>
    <div class="welcome-actions">
      <a class="btn-m btn-filled" href="discover.html#quiz">${icon('explore')}Help me choose a place</a>
      <button type="button" class="btn-m btn-outlined" data-close>${icon('public')}Explore the globe</button>
    </div>`;
  document.body.append(dialog);

  const close = () => dialog.close();
  dialog.addEventListener('click', (e) => {
    if (e.target.closest('[data-close]') || e.target === dialog) close(); // the backdrop counts as "outside"
  });
  dialog.addEventListener('close', () => {
    try { localStorage.setItem(SEEN_KEY, '1'); } catch { /* shown again next time */ }
    $('#help-btn')?.focus();
  });
  $('#help-btn')?.addEventListener('click', () => dialog.showModal());

  let seen = false;
  try { seen = localStorage.getItem(SEEN_KEY) === '1'; } catch { /* storage blocked */ }
  if (!seen && showNow) dialog.showModal();
}

/** The "Map options" button and its menu (borders and labels, 2D/3D tilt, point north). */
export function initMapMenu() {
  const btn = $('#map-options');
  const menu = $('#map-menu');
  if (!btn || !menu) return;
  const setOpen = (open) => {
    menu.hidden = !open;
    btn.setAttribute('aria-expanded', open);
    if (open) menu.querySelector('button:not([hidden])')?.focus();
  };
  btn.addEventListener('click', () => setOpen(menu.hidden));
  document.addEventListener('click', (e) => { if (!menu.hidden && !e.target.closest('#map-menu, #map-options')) setOpen(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) { setOpen(false); btn.focus(); } });
}
