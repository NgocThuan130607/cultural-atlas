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
// The built site also gets every file in one plain script (data/atlas-data.js, made by scripts/bundle-data.mjs),
// because browsers block fetch() when the site is opened straight from disk.
const cache = new Map();
export function getJSON(path) {
  const bundled = window.ATLAS_DATA?.[path];
  if (bundled && !cache.has(path)) cache.set(path, Promise.resolve(bundled));
  if (!cache.has(path)) {
    cache.set(path, fetch(`data/${path}`).then((r) => {
      if (!r.ok) throw new Error(`Could not load ${path} (${r.status})`);
      return r.json();
    }));
  }
  return cache.get(path);
}
export const loadCities = () => getJSON('cities.json').then((d) => d.cities);
/** Atlases the globe can switch between ("World", "Vietnam"); each city lists the ones it belongs to. */
export const loadCollections = () => getJSON('cities.json').then((d) => d.collections ?? [{ id: 'world', label: 'World' }]);
export const collectionsOf = (city) => city.collections ?? ['world'];
export const loadCity = (id) => getJSON(`cities/${id}.json`);
export const loadLandmark = (id) => getJSON(`landmarks/${id}.json`);
export const loadMedia = () => getJSON('media.json').catch(() => ({}));

// ---------- Landmark pages ----------
/** The three landmark pages, in the order shown in the page switcher. */
export const LANDMARK_PAGES = [
  { id: 'time', file: 'timetravel.html', label: 'Time travel', icon: 'history' },
  { id: 'story', file: 'stories.html', label: 'Stories', icon: 'headphones' },
  { id: 'guide', file: 'visit.html', label: 'Visit', icon: 'directions_walk' },
];

/** URL of one landmark page, e.g. landmarkUrl('eiffel-tower', 'time', { part: 'era-2' }). */
export function landmarkUrl(id, page = 'time', extra = {}) {
  const { file } = LANDMARK_PAGES.find((p) => p.id === page) ?? LANDMARK_PAGES[0];
  const q = new URLSearchParams({ id, ...extra });
  return `${file}?${q}`;
}

// ---------- Images & credits ----------
// An image reference is either { file: "<Wikimedia Commons file>" } or { src: "local/path.jpg", credit: "..." }.
const usedImages = new Map();
const mediaEntry = (ref, media) => media[ref?.file?.replace(/_/g, ' ')];

/** Commons sometimes repeats the author ("Unknown authorUnknown author or not provided"); show it once. */
export function cleanArtist(name = '') {
  // A phrase repeated back to back at the start ("Unknown authorUnknown author, restored by …") is kept once.
  const s = name.replace(/\s*or not provided\b/i, '').replace(/^(.{4,}?)\s*\1/, '$1').trim();
  return s || 'Unknown author';
}

export function imageSrc(ref, media) {
  if (!ref) return '';
  if (ref.src) return ref.src;
  return mediaEntry(ref, media)?.url ?? '';
}

/**
 * The part of a photo to keep when it is cropped to fill its box (thirty-second round): an image may say
 * `"focus": "center 92%"` when what it shows is not in its middle (the 1887 photo of the Eiffel Tower is three
 * quarters empty sky, with the four legs at the bottom). For a `style` attribute; '' when the middle will do.
 */
export const focusStyle = (ref) => (ref?.focus && /^[\w\s.%-]+$/.test(ref.focus) ? `object-position: ${ref.focus}` : '');

// Thirty-second round: a photo that does not load (a slow network, Commons down) shows a sheet of old paper with
// the drum's star instead of an empty frame or a broken-image sign.
const PAPER_STAR = (() => {
  const pts = [];
  for (let k = 0; k < 28; k++) { const a = -Math.PI / 2 + (k * Math.PI) / 14; const r = k % 2 ? 9 : 26; pts.push(`${(100 + Math.cos(a) * r).toFixed(1)},${(75 + Math.sin(a) * r).toFixed(1)}`); }
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 150' preserveAspectRatio='xMidYMid slice'><rect width='200' height='150' fill='#e9dcbc'/><g fill='none' stroke='#9a7433' stroke-opacity='.55'><circle cx='100' cy='75' r='44'/><circle cx='100' cy='75' r='40'/><circle cx='100' cy='75' r='31'/></g><polygon points='${pts.join(' ')}' fill='#b8892f' fill-opacity='.6'/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
})();
document.addEventListener('error', (e) => {
  const img = e.target;
  if (!(img instanceof HTMLImageElement) || img.dataset.fallback) return;
  img.dataset.fallback = '1';
  img.src = PAPER_STAR;
}, true);

export function creditHTML(ref, media) {
  if (!ref) return '';
  if (ref.src) return ref.credit ? esc(ref.credit) : '';
  const m = mediaEntry(ref, media);
  if (!m) return '';
  usedImages.set(ref.file, m);
  return `${esc(cleanArtist(m.artist))} · ${esc(m.license)} · <a href="${esc(m.page)}" target="_blank" rel="noopener">Wikimedia Commons</a>`;
}

/** Marks an image as shown so it appears in the credits list, without printing an inline credit. */
export function noteImage(ref, media) {
  if (typeof ref !== 'object') return;
  const m = mediaEntry(ref, media);
  if (m) usedImages.set(ref.file, m);
}

/** HTML block listing every Commons image shown on the page, with author and licence. */
export function creditsBlock(disclaimer = '') {
  const items = [...usedImages.entries()].map(([file, m]) =>
    `<li><a href="${esc(m.page)}" target="_blank" rel="noopener">${esc(file.replace(/\.[a-z]+$/i, ''))}</a>, ${esc(cleanArtist(m.artist))} (${esc(m.license)})</li>`).join('');
  return `<footer class="credits-block">
    ${disclaimer ? `<p class="mb-2">${esc(disclaimer)}</p>` : ''}
    <details><summary>${[...usedImages.values()].some((m) => m.sources) ? 'Image and video' : 'Image'} credits (${usedImages.size})</summary><ul>${items}</ul></details>
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

/**
 * A small "Prototype note": marks where this prototype differs from the planned full product,
 * so no feature looks finished when it isn't.
 */
export const protoNote = (text, cls = '') =>
  `<p class="proto-note ${cls}">${icon('construction')}<span><strong>Prototype note:</strong> ${esc(text)}</span></p>`;

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
