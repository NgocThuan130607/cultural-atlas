// "My trip": the landmarks a visitor has saved, and when they plan to visit each one.
// Saved in this browser's localStorage, so it needs no account or server and also works when the site
// is opened straight from disk. Any page that imports this file gets working Save buttons and the
// trip counter in its top bar.
import { $, $$, esc, icon } from './common.js';

const KEY = 'atlas-trip';
let memory = { items: [] }; // used when the browser blocks storage (e.g. some private windows)

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    const data = raw ? JSON.parse(raw) : null;
    return Array.isArray(data?.items) ? data : { items: [] };
  } catch {
    return memory;
  }
}

function write(trip) {
  memory = trip;
  try { localStorage.setItem(KEY, JSON.stringify(trip)); } catch { /* kept in memory for this page only */ }
  document.dispatchEvent(new CustomEvent('trip:change'));
}

/** True when the trip will still be there after the page is closed. */
export function storageWorks() {
  try { localStorage.setItem(`${KEY}-test`, '1'); localStorage.removeItem(`${KEY}-test`); return true; } catch { return false; }
}

/**
 * Saved landmarks, oldest first: [{ id, added, date?, time?, duration?, note? }].
 * date is "YYYY-MM-DD" and time "HH:MM", both in the landmark's own local time; duration is in minutes.
 */
export const tripItems = () => read().items;
export const isSaved = (id) => tripItems().some((i) => i.id === id);

export function saveLandmark(id) {
  if (isSaved(id)) return;
  const trip = read();
  trip.items.push({ id, added: Date.now() });
  write(trip);
}

export function removeLandmark(id) {
  const trip = read();
  trip.items = trip.items.filter((i) => i.id !== id);
  write(trip);
}

/** Changes one saved landmark, e.g. updateItem(id, { date, time, duration, note }). A null value removes that field. */
export function updateItem(id, patch) {
  const trip = read();
  const item = trip.items.find((i) => i.id === id);
  if (!item) return;
  for (const [k, v] of Object.entries(patch)) { if (v == null || v === '') delete item[k]; else item[k] = v; }
  write(trip);
}

export function clearTrip() { write({ items: [] }); }

/** Calls `fn` whenever the trip changes, on this page or in another tab. */
export function onTripChange(fn) {
  document.addEventListener('trip:change', fn);
  addEventListener('storage', (e) => { if (e.key === KEY) { memory = read(); fn(); } });
}

// ---------- Save buttons ----------
/**
 * A Save button for a landmark. `style` is 'button' (pill with text) or 'icon' (heart only).
 * Clicking it is handled below for every page, so pages only need to print it.
 */
export function saveButton(lm, style = 'button') {
  const saved = isSaved(lm.id);
  return `<button type="button" class="save-btn ${style === 'icon' ? 'icon-btn' : 'btn-m btn-outlined'}" data-save="${esc(lm.id)}"
    data-name="${esc(lm.name)}" aria-pressed="${saved}" aria-label="${saved ? 'Remove' : 'Save'} ${esc(lm.name)} ${saved ? 'from' : 'to'} My trip"
    title="${saved ? 'Saved to My trip' : 'Save to My trip'}">${icon('favorite', saved ? 'fill' : '')}${style === 'icon' ? '' : `<span>${saved ? 'Saved' : 'Save'}</span>`}</button>`;
}

function refreshButtons() {
  for (const btn of $$('[data-save]')) {
    const saved = isSaved(btn.dataset.save);
    const name = btn.dataset.name;
    btn.setAttribute('aria-pressed', saved);
    btn.setAttribute('aria-label', `${saved ? 'Remove' : 'Save'} ${name} ${saved ? 'from' : 'to'} My trip`);
    btn.title = saved ? 'Saved to My trip' : 'Save to My trip';
    $('.ms', btn)?.classList.toggle('fill', saved);
    const label = $('span:not(.ms)', btn);
    if (label) label.textContent = saved ? 'Saved' : 'Save';
  }
}

function refreshCounter() {
  const n = tripItems().length;
  for (const link of $$('.trip-link')) {
    const count = $('.trip-count', link);
    if (count) { count.textContent = n; count.hidden = n === 0; }
    link.setAttribute('aria-label', n ? `My trip, ${n} saved ${n === 1 ? 'place' : 'places'}` : 'My trip');
  }
}

// ---------- Toast ("Saved to My trip · View · Undo") ----------
let toastTimer = 0;
function toast(html, undo) {
  let el = $('#trip-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'trip-toast';
    el.className = 'trip-toast';
    el.setAttribute('role', 'status');
    document.body.append(el);
  }
  el.innerHTML = `<span>${html}</span>
    ${location.pathname.endsWith('trip.html') ? '' : '<a href="trip.html">View trip</a>'}
    ${undo ? '<button type="button" data-undo>Undo</button>' : ''}`;
  el.classList.add('show');
  $('[data-undo]', el)?.addEventListener('click', () => { undo(); el.classList.remove('show'); });
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 5000);
}

document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-save]');
  if (!btn) return;
  e.preventDefault();
  e.stopPropagation(); // the button may sit inside a clickable card
  const { save: id, name } = btn.dataset;
  if (isSaved(id)) {
    const before = tripItems().find((i) => i.id === id);
    removeLandmark(id);
    toast(`Removed ${esc(name)} from My trip`, () => { const trip = read(); trip.items.push(before); write(trip); });
  } else {
    saveLandmark(id);
    toast(`${icon('favorite', 'fill')} Saved ${esc(name)} to My trip`, () => removeLandmark(id));
  }
}, true);

onTripChange(() => { refreshButtons(); refreshCounter(); });
refreshCounter();
