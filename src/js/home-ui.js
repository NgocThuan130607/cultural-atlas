// Home page helpers added after user testing, when first-time visitors weren't sure what the site was for:
// a welcome dialog on the first visit, explaining the purpose in three steps (reopened with the "?" button).
// Seventh round of feedback: it also introduces "Through time", with a button that starts it.
// (The "Map options" menu that used to live here, with borders, tilt and point north, was removed in the same
// round: testers couldn't see what those controls were for.)
import { $, icon, prefersReducedMotion } from './common.js';

const SEEN_KEY = 'atlas-welcome-seen';

/** `onTryTime` starts the Through time view on the globe. */
export function initWelcome({ showNow, onTryTime }) {
  const dialog = document.createElement('dialog');
  dialog.className = 'welcome';
  dialog.setAttribute('aria-labelledby', 'welcome-title');
  dialog.innerHTML = `
    <button type="button" class="icon-btn welcome-close" data-close aria-label="Close">${icon('close')}</button>
    <span class="welcome-mark" aria-hidden="true"></span>
    <h2 id="welcome-title" class="t-headline">Welcome to Atlas of Stories</h2>
    <p class="welcome-lead">Get to know a place before you travel: its history, its stories and its local customs.</p>
    <ol class="welcome-steps">
      <li>${icon('travel_explore')}<span><strong>Choose a place</strong>Spin the globe, search, or let us suggest one for you.</span></li>
      <li>${icon('headphones')}<span><strong>Explore it</strong>Listen to its stories, watch old films and learn the local customs.</span></li>
      <li>${icon('luggage')}<span><strong>Plan your visit</strong>Save places, check opening hours and plan your days.</span></li>
    </ol>
    <section class="welcome-time" aria-labelledby="welcome-time-title">
      ${icon('history_toggle_off', 'welcome-time-icon')}
      <div>
        <h3 id="welcome-time-title">Travel through time</h3>
        <p>Pick a year, like 1889 or 1945, and the globe shows what was happening in every city at that moment.
          On each landmark, follow the timeline along the bottom of its Time travel page from era to era to watch it change over the centuries.</p>
        ${onTryTime ? `<button type="button" class="btn-m btn-tonal" data-try-time>${icon('history')}Try Through time</button>` : ''}
      </div>
    </section>
    <div class="welcome-actions">
      <a class="btn-m btn-filled" href="discover.html#quiz">${icon('explore')}Help me choose a place</a>
      <button type="button" class="btn-m btn-outlined" data-close>${icon('public')}Explore the globe</button>
    </div>`;
  document.body.append(dialog);

  let afterClose = null;
  // Thirty-second round: closing, the dialog shrinks into the "?" button at the top right, which then glows for a
  // moment, so the visitor sees where the welcome can be found again; opened from that button, it grows out of it.
  const help = () => { const b = $('#help-btn'); return b && b.offsetParent ? b : null; };
  /** The move from the dialog to the "?" button, as a transform. */
  const towardHelp = () => {
    const b = help().getBoundingClientRect();
    const d = dialog.getBoundingClientRect();
    const s = Math.max(0.04, b.width / d.width);
    return `translate(${b.left + b.width / 2 - (d.left + d.width / 2)}px, ${b.top + b.height / 2 - (d.top + d.height / 2)}px) scale(${s})`;
  };
  let closing = false;
  const close = () => {
    if (closing || !dialog.open) return;
    if (prefersReducedMotion() || !help() || !dialog.animate) { dialog.close(); return; }
    closing = true;
    dialog.classList.add('closing');
    const to = towardHelp();
    const run = dialog.animate([
      { transform: 'none', opacity: 1, borderRadius: '6px' },
      { transform: to, opacity: 0.4, borderRadius: '50%', offset: 0.85 },
      { transform: to, opacity: 0, borderRadius: '50%' },
    ], { duration: 640, easing: 'cubic-bezier(.55, 0, .7, .2)', fill: 'forwards' });
    run.onfinish = () => {
      dialog.close();
      run.cancel();
      dialog.classList.remove('closing');
      closing = false;
      const b = help();
      if (b) { b.classList.remove('help-glow'); void b.offsetWidth; b.classList.add('help-glow'); }
    };
  };
  dialog.addEventListener('cancel', (e) => { e.preventDefault(); close(); }); // Esc
  dialog.addEventListener('click', (e) => {
    if (e.target.closest('[data-try-time]')) { afterClose = onTryTime; close(); return; }
    if (e.target.closest('[data-close]') || e.target === dialog) close(); // the backdrop counts as "outside"
  });
  dialog.addEventListener('close', () => {
    try { localStorage.setItem(SEEN_KEY, '1'); } catch { /* shown again next time */ }
    if (afterClose) { const run = afterClose; afterClose = null; run(); return; } // it moves focus to the year slider
    $('#help-btn')?.focus();
  });
  $('#help-btn')?.addEventListener('click', () => {
    if (dialog.open) return;
    $('#help-btn').classList.remove('help-glow');
    dialog.showModal();
    if (prefersReducedMotion() || !help() || !dialog.animate) return;
    dialog.animate([{ transform: towardHelp(), opacity: 0, borderRadius: '50%' }, { transform: 'none', opacity: 1, borderRadius: '6px' }],
      { duration: 480, easing: 'cubic-bezier(.2, .8, .3, 1)' });
  });
  $('#help-btn')?.addEventListener('animationend', (e) => e.currentTarget.classList.remove('help-glow'));

  let seen = false;
  try { seen = localStorage.getItem(SEEN_KEY) === '1'; } catch { /* storage blocked */ }
  if (!seen && showNow) dialog.showModal();
}
