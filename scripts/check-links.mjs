// Checks every outside link in public/data (the landmarks' official websites), apart from Wikimedia images.
// Run: npm run links   (needs the internet; a site that answers 403 to scripts may still open in a browser)
import { readFile, readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const dataDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'data');
const links = [];
const walk = (node, where) => {
  if (Array.isArray(node)) node.forEach((x, i) => walk(x, `${where}[${i}]`));
  else if (node && typeof node === 'object') for (const [k, v] of Object.entries(node)) walk(v, `${where}.${k}`);
  else if (typeof node === 'string' && /^https?:\/\//.test(node) && !/wikimedia|wikipedia/.test(node)) links.push({ url: node, where });
};
for (const dir of ['cities', 'landmarks']) {
  for (const f of await readdir(join(dataDir, dir))) walk(JSON.parse(await readFile(join(dataDir, dir, f), 'utf8')), `${dir}/${f}`);
}
const unique = [...new Set(links.map((l) => l.url))];
const check = async (url) => {
  try {
    const r = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(20000), headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130 Safari/537.36' } });
    return { ok: r.status < 400 || r.status === 403, status: r.status };
  } catch (e) {
    // Two kinds of failure that browsers get past, so the link still works for visitors: a certificate sent
    // without its intermediate (browsers fetch it), and a redirect that sets a cookie and sends you back to
    // the same address (browsers keep the cookie, a script does not). These are marked "browser".
    const why = e.cause?.code ?? e.cause?.message ?? e.name;
    const browserOnly = /UNABLE_TO_VERIFY_LEAF_SIGNATURE|redirect count exceeded/.test(why);
    return { ok: browserOnly, status: browserOnly ? 'browser' : why };
  }
};
let bad = 0;
for (const url of unique) {
  const r = await check(url);
  if (!r.ok) bad++;
  console.log(`${r.ok ? 'ok  ' : 'FAIL'} ${String(r.status).padEnd(12)} ${url}${r.ok ? '' : `  (${links.filter((l) => l.url === url).map((l) => l.where.split('.')[0]).join(', ')})`}`);
}
console.log(`\n${unique.length} links, ${bad} not answering`);
process.exitCode = bad ? 1 : 0;
