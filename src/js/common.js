// Shared helpers used by every page: styles, data loading, image credits, theme and the app bar.
import '../scss/main.scss';
import 'bootstrap/js/dist/dropdown';

// ---------- Small utilities ----------
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ESC[c]);

export const param = (name) => new URLSearchParams(location.search).get(name);
export const prefersReducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** A Material Symbols icon. Literal names passed to this helper are picked up by the font loader in vite.config.js. */
export const icon = (name, cls = '') => `<span class="ms ${cls}" aria-hidden="true">${name}</span>`;

// ---------- Data loading ----------
// All content lives as static JSON in /public/data, so adding a city never needs code changes.
const cache = new Map();
export function getJSON(path) {
  if (!cache.has(path)) {
    cache.set(path, fetch(`data/${path}`).then((r) => {
      if (!r.ok) throw new Error(`Could not load ${path} (${r.status})`);
      return r.json();
    }));
  }
  return cache.get(path);
}
export const loadCities = () => getJSON('cities.json').then((d) => d.cities);
export const loadCity = (id) => getJSON(`cities/${id}.json`);
export const loadLandmark = (id) => getJSON(`landmarks/${id}.json`);
export const loadMedia = () => getJSON('media.json').catch(() => ({}));

// ---------- Images & credits ----------
// An image reference is either { file: "<Wikimedia Commons file>" } or { src: "local/path.jpg", credit: "..." }.
const usedImages = new Map();
const mediaEntry = (ref, media) => media[ref?.file?.replace(/_/g, ' ')];

export function imageSrc(ref, media) {
  if (!ref) return '';
  if (ref.src) return ref.src;
  return mediaEntry(ref, media)?.url ?? '';
}

export function creditHTML(ref, media) {
  if (!ref) return '';
  if (ref.src) return ref.credit ? esc(ref.credit) : '';
  const m = mediaEntry(ref, media);
  if (!m) return '';
  usedImages.set(ref.file, m);
  return `${esc(m.artist)} · ${esc(m.license)} · <a href="${esc(m.page)}" target="_blank" rel="noopener">Wikimedia Commons</a>`;
}

/** Marks an image as shown so it appears in the credits list, without printing an inline credit. */
export function noteImage(ref, media) {
  const m = mediaEntry(ref, media);
  if (m) usedImages.set(ref.file, m);
}

/** HTML block listing every Commons image shown on the page, with author and licence. */
export function creditsBlock(disclaimer = '') {
  const items = [...usedImages.entries()].map(([file, m]) =>
    `<li><a href="${esc(m.page)}" target="_blank" rel="noopener">${esc(file.replace(/\.[a-z]+$/i, ''))}</a>, ${esc(m.artist)} (${esc(m.license)})</li>`).join('');
  return `<footer class="credits-block">
    ${disclaimer ? `<p class="mb-2">${esc(disclaimer)}</p>` : ''}
    <details><summary>Image credits (${usedImages.size})</summary><ul>${items}</ul></details>
  </footer>`;
}

// ---------- Time & places ----------
export function localTime(timezone, date = new Date()) {
  return new Intl.DateTimeFormat(undefined, { timeZone: timezone, hour: '2-digit', minute: '2-digit', weekday: 'short' }).format(date);
}
export function formatCoords(lat, lon, digits = 2) {
  return `${Math.abs(lat).toFixed(digits)}° ${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lon).toFixed(digits)}° ${lon >= 0 ? 'E' : 'W'}`;
}

// ---------- Theme ----------
export const currentTheme = () => document.documentElement.getAttribute('data-bs-theme') || 'light';

function setTheme(theme) {
  document.documentElement.setAttribute('data-bs-theme', theme);
  try { localStorage.setItem('atlas-theme', theme); } catch { /* storage unavailable */ }
  $$('#theme-toggle').forEach((btn) => { btn.innerHTML = theme === 'dark' ? icon('light_mode') : icon('dark_mode'); });
}

function initTheme() {
  setTheme(currentTheme());
  $$('#theme-toggle').forEach((btn) => btn.addEventListener('click', () => setTheme(currentTheme() === 'dark' ? 'light' : 'dark')));
}

// ---------- App bar ----------
async function initNav() {
  const menu = $('#nav-cities');
  if (!menu) return;
  try {
    const cities = await loadCities();
    menu.innerHTML = cities.map((c) =>
      `<li><a class="dropdown-item" href="city.html?id=${encodeURIComponent(c.id)}">${esc(c.name)} <small>· ${esc(c.country)}</small></a></li>`).join('');
  } catch {
    menu.innerHTML = '<li><span class="dropdown-item-text">Could not load cities</span></li>';
  }
}

export function showError(message) {
  const panel = $('#panel');
  (panel ?? document.body).innerHTML = `
    <div class="panel-section text-center py-5">
      <span class="ms" style="font-size:3rem;color:var(--primary)" aria-hidden="true">wrong_location</span>
      <h1 class="t-headline mt-3">We couldn't find that place</h1>
      <p class="muted">${esc(message)}</p>
      <a class="btn-m btn-filled" href="index.html">${icon('public')}Back to the globe</a>
    </div>`;
}

initTheme();
initNav();
