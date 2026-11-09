// Validates everything in public/data so a new city or landmark can't silently break the site.
// Run: npm run check
import { readFile, access } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MOTIFS } from '../src/js/motifs.js';

const dataDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'data');
const read = async (p) => JSON.parse(await readFile(join(dataDir, p), 'utf8'));
const exists = (p) => access(join(dataDir, p)).then(() => true, () => false);

const errors = [];
const warn = [];
const err = (where, msg) => errors.push(`${where}: ${msg}`);

const CATEGORIES = ['entrance', 'transport', 'food', 'sights', 'services'];
const STORY_TYPES = ['history', 'legend', 'culture', 'film'];
const TAGS = ['history', 'architecture', 'nature', 'spiritual', 'local-life', 'adventure']; // same as src/js/season.js
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const DAYS = ['daily', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const isCoord = (lat, lon) => typeof lat === 'number' && typeof lon === 'number' && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;

let media = {};
try { media = await read('media.json'); } catch { warn.push('media.json missing. Run "npm run media".'); }
const checkImage = (where, ref) => {
  if (!ref) return err(where, 'image missing');
  if (ref.src) return;
  if (!ref.file) return err(where, 'image needs "file" (Commons) or "src" (local)');
  if (!media[ref.file.replace(/_/g, ' ')]) err(where, `image "${ref.file}" not in media.json. Run "npm run media".`);
  if (!ref.alt) warn.push(`${where}: image has no alt text`);
};

// Every "motifs" list (the symbols drawn on a slide) may only name drawings that exist in src/js/motifs.js.
const checkMotifs = (where, node) => {
  if (Array.isArray(node)) return node.forEach((x, i) => checkMotifs(`${where}[${i}]`, x));
  if (!node || typeof node !== 'object') return;
  for (const [k, v] of Object.entries(node)) {
    if (k !== 'motifs') { checkMotifs(`${where}.${k}`, v); continue; }
    for (const list of Array.isArray(v) ? [v] : Object.values(v ?? {})) {
      if (!Array.isArray(list)) { err(where, '"motifs" must be a list of names, or an object of lists'); continue; }
      list.filter((m) => !MOTIFS[m]).forEach((m) => err(where, `unknown motif "${m}" (see src/js/motifs.js)`));
    }
  }
};

const { cities, collections = [{ id: 'world' }] } = await read('cities.json');
const colIds = new Set(collections.map((c) => c.id));
const ids = new Set();
for (const c of cities) {
  const w = `city "${c.id}"`;
  if (ids.has(c.id)) err(w, 'duplicate id');
  ids.add(c.id);
  // Atlases ("World", "Vietnam") the city appears in, and its group (North / Central / South) where needed.
  for (const id of c.collections ?? ['world']) {
    const col = collections.find((x) => x.id === id);
    if (!col) err(w, `collection "${id}" is not defined in cities.json "collections"`);
    else if (col.groups && !col.groups.includes(c.region)) err(w, `"region" must be one of ${col.groups.join(', ')} for the ${id} atlas`);
  }
  for (const k of ['name', 'country', 'continent', 'timezone', 'tagline']) if (!c[k]) err(w, `missing "${k}"`);
  if (!isCoord(c.lat, c.lon)) err(w, 'invalid lat/lon');
  try { new Intl.DateTimeFormat('en', { timeZone: c.timezone }); } catch { err(w, `unknown timezone "${c.timezone}"`); }
  if (!(await exists(`cities/${c.id}.json`))) { err(w, `missing file cities/${c.id}.json`); continue; }

  const d = await read(`cities/${c.id}.json`);
  checkMotifs(w, d);
  checkImage(`${w} hero`, d.hero);
  if (!d.sections?.length) err(w, 'needs at least one section');
  d.sections?.forEach((s) => { if (s.image) checkImage(`${w} section "${s.id}"`, s.image); }); // optional; otherwise borrowed from the landmark
  for (const k of ['languages', 'currency', 'bestTime', 'founded']) if (!d.facts?.[k]) err(w, `facts.${k} missing`);

  // City timeline used by "The world in one year".
  if (!d.timeline?.length) warn.push(`${w}: no timeline, so it will be empty in the world timeline`);
  for (const [i, e] of (d.timeline ?? []).entries()) {
    const tw = `${w} timeline ${i + 1}`;
    if (typeof e.year !== 'number') err(tw, '"year" must be a number (negative for BCE)');
    if (i && e.year < d.timeline[i - 1].year) err(tw, 'timeline entries must be in chronological order');
    if (!e.text) err(tw, 'missing "text"');
    if (e.image) checkImage(tw, e.image);
    if (e.landmark) {
      if (!(c.landmarks ?? []).includes(e.landmark)) err(tw, `landmark "${e.landmark}" is not one of this city's landmarks`);
      else if (await exists(`landmarks/${e.landmark}.json`)) {
        const lm = await read(`landmarks/${e.landmark}.json`);
        if (!Number.isInteger(e.era) || !lm.eras?.[e.era]) err(tw, `"era" must be an index into ${e.landmark}'s eras (0–${(lm.eras?.length ?? 1) - 1})`);
      }
    }
  }

  for (const lid of c.landmarks ?? []) {
    const lw = `landmark "${lid}"`;
    if (!(await exists(`landmarks/${lid}.json`))) { err(lw, `missing file landmarks/${lid}.json`); continue; }
    const lm = await read(`landmarks/${lid}.json`);
    checkMotifs(lw, lm);
    if (lm.id !== lid) err(lw, `"id" is "${lm.id}" but file name says "${lid}"`);
    if (lm.city !== c.id) err(lw, `"city" should be "${c.id}"`);
    if (!isCoord(lm.lat, lm.lon)) err(lw, 'invalid lat/lon');
    checkImage(`${lw} hero`, lm.hero);
    // Used by Discover and the season badges.
    if (!Array.isArray(lm.bestMonths) || !lm.bestMonths.length) warn.push(`${lw}: no "bestMonths", so it never appears in seasonal suggestions`);
    else if (lm.bestMonths.some((m) => !Number.isInteger(m) || m < 1 || m > 12) || new Set(lm.bestMonths).size !== lm.bestMonths.length) err(lw, '"bestMonths" must be distinct month numbers 1–12');
    if (!Array.isArray(lm.tags) || !lm.tags.length) warn.push(`${lw}: no "tags", so interest filters skip it`);
    else lm.tags.filter((t) => !TAGS.includes(t)).forEach((t) => err(lw, `unknown tag "${t}" (use ${TAGS.join(', ')})`));
    if ('featured' in lm && typeof lm.featured !== 'boolean') err(lw, '"featured" must be true or false');

    if (!lm.eras?.length) err(lw, 'needs at least one era');
    lm.eras?.forEach((e, i) => {
      if (typeof e.year !== 'number') err(`${lw} era ${i + 1}`, '"year" must be a number (negative for BCE)');
      if (i && e.year < lm.eras[i - 1].year) err(`${lw} era ${i + 1}`, 'eras must be in chronological order');
      for (const k of ['label', 'title', 'text']) if (!e[k]) err(`${lw} era ${i + 1}`, `missing "${k}"`);
      checkImage(`${lw} era ${i + 1}`, e.image);
    });

    lm.story?.forEach((s, i) => {
      const sw = `${lw} story ${i + 1}`;
      if (!STORY_TYPES.includes(s.type)) err(sw, `type must be one of ${STORY_TYPES.join(', ')}`);
      if (!s.narration && !s.audio && !s.video && !s.youtube) err(sw, 'needs narration text, audio or video');
      // A Commons video ({ "file": "x.webm" }) brings its own poster image, so it needs no "image".
      if (s.video?.file) {
        const m = media[s.video.file.replace(/_/g, ' ')];
        if (!m?.sources?.length) err(sw, `video "${s.video.file}" not in media.json. Run "npm run media".`);
        if (s.image) checkImage(sw, s.image);
      } else checkImage(sw, s.image);
    });

    const g = lm.guide;
    if (!g) { err(lw, 'missing guide'); continue; }
    // Outdoor places can use { "open24h": true } instead of seasons.
    if (!g.hours?.open24h && !g.hours?.seasons?.length) err(lw, 'guide.hours needs "seasons" or "open24h": true');
    const months = new Set();
    g.hours?.seasons?.forEach((s, i) => {
      s.months.forEach((m) => { if (months.has(m)) err(`${lw} hours`, `month ${m} is in two seasons`); months.add(m); });
      for (const [day, list] of Object.entries(s.days)) {
        if (!DAYS.includes(day)) err(`${lw} hours season ${i + 1}`, `unknown day key "${day}"`);
        list.forEach(([o, cl]) => { if (!TIME.test(o) || !TIME.test(cl)) err(`${lw} hours season ${i + 1}`, `bad time "${o}-${cl}" (use HH:MM)`); });
      }
    });
    if (!g.hours?.open24h && months.size !== 12) warn.push(`${lw}: hours cover ${months.size} of 12 months`);
    g.pois?.forEach((p) => {
      if (!CATEGORIES.includes(p.category)) err(`${lw} poi "${p.name}"`, `category must be one of ${CATEGORIES.join(', ')}`);
      if (!isCoord(p.lat, p.lon)) err(`${lw} poi "${p.name}"`, 'invalid lat/lon');
    });
  }
}

// Moments and periods for "Through time", one file per atlas.
for (const col of collections) {
  const file = col.moments ?? (col.id === 'world' ? 'world-moments.json' : null);
  if (!file) continue;
  if (!(await exists(file))) { warn.push(`${file} missing: "Through time" will be hidden in the ${col.id} atlas`); continue; }
  const wm = await read(file);
  const { from, to, anchors } = wm.range ?? {};
  if (typeof from !== 'number' || typeof to !== 'number' || from >= to) err(file, '"range" needs numeric from < to');
  if (anchors && anchors.some(([y, p], i) => i && (y <= anchors[i - 1][0] || p <= anchors[i - 1][1]))) err(file, '"range.anchors" must increase in both year and position');
  wm.moments?.forEach((m, i) => {
    const mw = `${file} moment ${i + 1}`;
    if (typeof m.year !== 'number' || m.year < from || m.year > to) err(mw, '"year" must be a number inside "range"');
    if (i && m.year <= wm.moments[i - 1].year) err(mw, 'moments must be in increasing year order');
    if (!m.title) err(mw, 'missing "title"');
    if (m.focusCity && !ids.has(m.focusCity)) err(mw, `focusCity "${m.focusCity}" is not in cities.json`);
    if (m.focusCity && ids.has(m.focusCity) && !(cities.find((c) => c.id === m.focusCity).collections ?? ['world']).includes(col.id)) {
      err(mw, `focusCity "${m.focusCity}" is not part of the ${col.id} atlas`);
    }
  });
  if (!wm.periods?.length) err(file, 'needs at least one period');
}

warn.forEach((w) => console.warn('warning  ' + w));
if (errors.length) {
  errors.forEach((e) => console.error('error    ' + e));
  console.error(`\n${errors.length} problem(s) found.`);
  process.exit(1);
}
console.log(`Data OK: ${cities.length} cities, ${cities.reduce((n, c) => n + (c.landmarks?.length ?? 0), 0)} landmarks.`);
