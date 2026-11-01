// Copies the built site (dist/) into submission/website/, ready to zip with the report and coversheet.
// The separate JSON files are left out of the built site: it reads all its data from data/atlas-data.js.
// The readable source code (before building) goes into submission/website/source/, so it can be read and marked.
// Run: npm run package (checks the data and builds first).
import { cp, rm, writeFile, readdir, stat } from 'node:fs/promises';
import { join, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const out = join(root, 'submission', 'website');

await rm(out, { recursive: true, force: true });
await cp(dist, out, {
  recursive: true,
  filter: (src) => !(src.startsWith(join(dist, 'data') + sep) && src.endsWith('.json')),
});
// Remove folders left empty by the filter (data/cities, data/landmarks).
for (const d of ['cities', 'landmarks']) await rm(join(out, 'data', d), { recursive: true, force: true });

// Readable source code. Not needed to run the site.
const SOURCE = ['index.html', 'city.html', 'timetravel.html', 'stories.html', 'visit.html', 'src', 'public', 'scripts',
  'vite.config.js', 'package.json', 'package-lock.json', 'README.md'];
for (const item of SOURCE) {
  await cp(join(root, item), join(out, 'source', item), {
    recursive: true,
    filter: (src) => !src.endsWith('atlas-data.js'), // generated
  });
}

await writeFile(join(out, 'README.txt'), `Atlas of Stories - prototype

How to open: double-click index.html (the home page). No server or installation is needed.
An internet connection is needed for the satellite imagery, maps, fonts and photos.
Tested in Microsoft Edge and Google Chrome on Windows.

Pages:
  index.html       Home: 3D globe (World and Vietnam atlases, search, "Through time")
  city.html        City / province guide        e.g. city.html?id=hanoi
  timetravel.html  Landmark: Time travel         e.g. timetravel.html?id=eiffel-tower
  stories.html     Landmark: narrated Stories    e.g. stories.html?id=eiffel-tower
  visit.html       Landmark: Visitor guide       e.g. visit.html?id=eiffel-tower

The js/ and css/ files are built (minified) from the readable code in source/.
source/ is not needed to run the site. To rebuild: install Node.js 20+, then in source/ run
"npm install" and "npm run build" (output goes to source/dist/).
`);

const files = [];
async function walk(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory() && e.name === 'source') { files.push('source/ (readable source code)'); continue; }
    if (e.isDirectory()) await walk(p);
    else files.push(`${relative(out, p).split(sep).join('/').padEnd(26)} ${String(Math.round((await stat(p)).size / 1024)).padStart(6)} KB`);
  }
}
await walk(out);
console.log(`submission/website/ is ready (${files.length} files):\n  ${files.join('\n  ')}`);
