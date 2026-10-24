// Validates everything in public/data so a new city or landmark can't silently break the site.
// Run: npm run check
import { readFile, access } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const dataDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'data');
const read = async (p) => JSON.parse(await readFile(join(dataDir, p), 'utf8'));
const exists = (p) => access(join(dataDir, p)).then(() => true, () => false);

const errors = [];
const warn = [];
const err = (where, msg) => errors.push(`${where}: ${msg}`);

const CATEGORIES = ['entrance', 'transport', 'food', 'sights', 'services'];
const STORY_TYPES = ['history', 'legend', 'culture'];
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

const { cities } = await read('cities.json');
const ids = new Set();
for (const c of cities) {
  const w = `city "${c.id}"`;
  if (ids.has(c.id)) err(w, 'duplicate id');
  ids.add(c.id);
  for (const k of ['name', 'country', 'continent', 'timezone', 'tagline']) if (!c[k]) err(w, `missing "${k}"`);
  if (!isCoord(c.lat, c.lon)) err(w, 'invalid lat/lon');
  try { new Intl.DateTimeFormat('en', { timeZone: c.timezone }); } catch { err(w, `unknown timezone "${c.timezone}"`); }
  if (!(await exists(`cities/${c.id}.json`))) { err(w, `missing file cities/${c.id}.json`); continue; }

  const d = await read(`cities/${c.id}.json`);
  checkImage(`${w} hero`, d.hero);
  if (!d.sections?.length) err(w, 'needs at least one section');
  for (const k of ['languages', 'currency', 'bestTime', 'founded']) if (!d.facts?.[k]) err(w, `facts.${k} missing`);

  for (const lid of c.landmarks ?? []) {
    const lw = `landmark "${lid}"`;
    if (!(await exists(`landmarks/${lid}.json`))) { err(lw, `missing file landmarks/${lid}.json`); continue; }
    const lm = await read(`landmarks/${lid}.json`);
    if (lm.id !== lid) err(lw, `"id" is "${lm.id}" but file name says "${lid}"`);
    if (lm.city !== c.id) err(lw, `"city" should be "${c.id}"`);
    if (!isCoord(lm.lat, lm.lon)) err(lw, 'invalid lat/lon');
    checkImage(`${lw} hero`, lm.hero);

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
      checkImage(sw, s.image);
    });

    const g = lm.guide;
    if (!g) { err(lw, 'missing guide'); continue; }
    if (!g.hours?.seasons?.length) err(lw, 'guide.hours.seasons is empty');
    const months = new Set();
    g.hours?.seasons?.forEach((s, i) => {
      s.months.forEach((m) => { if (months.has(m)) err(`${lw} hours`, `month ${m} is in two seasons`); months.add(m); });
      for (const [day, list] of Object.entries(s.days)) {
        if (!DAYS.includes(day)) err(`${lw} hours season ${i + 1}`, `unknown day key "${day}"`);
        list.forEach(([o, cl]) => { if (!TIME.test(o) || !TIME.test(cl)) err(`${lw} hours season ${i + 1}`, `bad time "${o}-${cl}" (use HH:MM)`); });
      }
    });
    if (months.size !== 12) warn.push(`${lw}: hours cover ${months.size} of 12 months`);
    g.pois?.forEach((p) => {
      if (!CATEGORIES.includes(p.category)) err(`${lw} poi "${p.name}"`, `category must be one of ${CATEGORIES.join(', ')}`);
      if (!isCoord(p.lat, p.lon)) err(`${lw} poi "${p.name}"`, 'invalid lat/lon');
    });
  }
}

warn.forEach((w) => console.warn('warning  ' + w));
if (errors.length) {
  errors.forEach((e) => console.error('error    ' + e));
  console.error(`\n${errors.length} problem(s) found.`);
  process.exit(1);
}
console.log(`Data OK: ${cities.length} cities, ${cities.reduce((n, c) => n + (c.landmarks?.length ?? 0), 0)} landmarks.`);
