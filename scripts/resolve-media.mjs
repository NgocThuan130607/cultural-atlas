// Finds every Wikimedia Commons image or video named in public/data (any `"file": "..."` field),
// looks each one up on Commons, and writes public/data/media.json with the image URL,
// author and licence, so pages can show proper credits.
// Videos (.webm, .ogv) also get a poster image (`url`), their length and the files to stream (`sources`).
//
// Run: npm run media
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = join(root, 'public', 'data');
const outFile = join(dataDir, 'media.json');
const THUMB_WIDTH = 1280;
const UA = { 'User-Agent': 'CulturalAtlasPrototype/0.1 (educational prototype)' };

async function listJson(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await listJson(p)));
    else if (entry.name.endsWith('.json') && entry.name !== 'media.json') out.push(p);
  }
  return out;
}

function collectFiles(node, set) {
  if (Array.isArray(node)) node.forEach((n) => collectFiles(n, set));
  else if (node && typeof node === 'object') {
    if (typeof node.file === 'string') set.add(node.file);
    Object.values(node).forEach((v) => collectFiles(v, set));
  }
}

const stripHtml = (s = '') => s.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
// Commons sometimes repeats the author ("Unknown authorUnknown author or not provided"); keep it once.
const cleanArtist = (s) => s.replace(/\s*or not provided\b/i, '').replace(/^(.{4,}?)\s*\1/, '$1').trim();
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const norm = (s) => s.replace(/_/g, ' ').trim();

const isVideo = (name) => /\.(webm|ogv)$/i.test(name);

async function query(titles, video) {
  const url = 'https://commons.wikimedia.org/w/api.php?' + new URLSearchParams({
    action: 'query', format: 'json', formatversion: '2', redirects: '1',
    ...(video
      ? { prop: 'videoinfo', viprop: 'url|size|extmetadata|derivatives', viurlwidth: String(THUMB_WIDTH) }
      : { prop: 'imageinfo', iiprop: 'url|size|extmetadata', iiurlwidth: String(THUMB_WIDTH) }),
    titles: titles.map((t) => 'File:' + t).join('|'),
  });
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch(url, { headers: UA });
    const text = await res.text();
    if (text.startsWith('{')) return JSON.parse(text);
    await wait(10000 * (attempt + 1)); // rate limited: back off
  }
  throw new Error('Wikimedia API kept refusing requests');
}

const files = new Set();
for (const f of await listJson(dataDir)) collectFiles(JSON.parse(await readFile(f, 'utf8')), files);

let existing = {};
try { existing = JSON.parse(await readFile(outFile, 'utf8')); } catch { /* first run */ }

const wanted = [...files].map(norm);
const todo = wanted.filter((f) => !existing[f]);
console.log(`${wanted.length} images referenced, ${todo.length} to look up`);

const result = Object.fromEntries(wanted.filter((f) => existing[f]).map((f) => [f, existing[f]]));
const missing = [];

/** Files to stream, best first: a 720p or 480p VP9 copy made by Commons (small and widely supported), then the original. */
function videoSources(info) {
  const derivs = info.derivatives ?? [];
  const pick = ['720p.vp9.webm', '480p.vp9.webm'].map((k) => derivs.find((d) => d.transcodekey === k)).find(Boolean);
  const list = pick ? [{ src: pick.src, type: 'video/webm' }] : [];
  list.push({ src: info.url.replace(/\?.*$/, ''), type: /\.ogv$/i.test(info.url.replace(/\?.*$/, '')) ? 'video/ogg' : 'video/webm' });
  return list;
}

for (const video of [false, true]) {
  const list = todo.filter((f) => isVideo(f) === video);
  for (let i = 0; i < list.length; i += 40) {
    const batch = list.slice(i, i + 40);
    const json = await query(batch, video);
    // Map API-normalised titles back to the names used in our data.
    const back = new Map(batch.map((t) => ['File:' + t, t]));
    for (const n of json.query.normalized ?? []) back.set(n.to, back.get(n.from) ?? n.from);
    for (const r of json.query.redirects ?? []) back.set(r.to, back.get(r.from) ?? r.from);
    for (const page of json.query.pages) {
      const name = norm(back.get(page.title) ?? page.title.replace(/^File:/, ''));
      const info = (video ? page.videoinfo : page.imageinfo)?.[0];
      if (page.missing || !info) { missing.push(name); continue; }
      const meta = info.extmetadata ?? {};
      result[name] = {
        url: info.thumburl ?? info.url, // for a video: a still frame used as its poster
        width: info.thumbwidth ?? info.width,
        height: info.thumbheight ?? info.height,
        page: info.descriptionurl,
        artist: cleanArtist(stripHtml(meta.Artist?.value)) || 'Unknown author',
        license: stripHtml(meta.LicenseShortName?.value) || 'See source',
        licenseUrl: meta.LicenseUrl?.value ?? null,
        ...(video ? { duration: Math.round(info.duration ?? 0), sources: videoSources(info) } : {}),
      };
    }
    await wait(1500);
  }
}

// Keep output stable and readable.
const sorted = Object.fromEntries(Object.keys(result).sort().map((k) => [k, result[k]]));
await writeFile(outFile, JSON.stringify(sorted, null, 2) + '\n');
console.log(`Wrote ${Object.keys(sorted).length} entries to public/data/media.json`);
if (missing.length) {
  console.error('\nNot found on Wikimedia Commons:\n  ' + missing.join('\n  '));
  process.exitCode = 1;
}
