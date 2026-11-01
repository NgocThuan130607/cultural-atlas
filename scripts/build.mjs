// Builds every page into dist/ as classic scripts, so the site opens straight from disk.
// Classic (IIFE) bundles can't share chunks, so each page is built on its own, one after another.
import { build } from 'vite';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PAGES } from '../vite.config.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
for (const [i, page] of PAGES.entries()) {
  await build({
    root,
    logLevel: 'warn',
    build: {
      emptyOutDir: i === 0,
      cssCodeSplit: false, // one CSS file linked from the page, instead of CSS injected by the script
      rollupOptions: {
        input: resolve(root, `${page}.html`),
        output: {
          format: 'iife',
          // Readable, stable names (js/city.js, css/city.css) so the file list is easy to follow.
          entryFileNames: 'js/[name].js',
          assetFileNames: (a) => (a.names?.[0] ?? a.name ?? '').endsWith('.css') ? `css/${page}.css` : 'assets/[name][extname]',
        },
        // Cesium only reads import.meta.url when CESIUM_BASE_URL is unset, so an empty object is fine here.
        onwarn(w, warn) { if (w.code !== 'EMPTY_IMPORT_META') warn(w); },
      },
    },
  });
  console.log(`built ${page}.html`);
}
