import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { readFileSync, readdirSync } from 'node:fs';

const root = import.meta.dirname;

/** Every page of the site. scripts/build.mjs builds them one at a time. */
export const PAGES = ['index', 'city', 'timetravel', 'stories', 'visit', 'trip', 'discover'];
// public/landmark.html is a plain redirect for older links (landmark.html?id=…#story) and is copied as-is.

// CesiumJS's Assets and Widgets are loaded from the jsDelivr CDN (same version as package.json),
// and its workers are embedded (see cesiumEmbeddedWorkers), so the site needs no local server.
const cesiumVersion = JSON.parse(readFileSync(resolve(root, 'node_modules/cesium/package.json'), 'utf8')).version;

/**
 * Loads Roboto Flex and Material Symbols from Google Fonts.
 * Only the icons actually used in the code are requested, so the icon font stays tiny.
 * Icons are found by scanning for ms-class spans, icon(...) calls and `icon:` properties with literal names.
 */
function googleFonts() {
  const files = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? files(resolve(dir, e.name)) : /\.(js|html)$/.test(e.name) ? [resolve(dir, e.name)] : []);
  const scanIcons = () => {
    const names = new Set();
    const sources = [...files(resolve(root, 'src')), ...PAGES.map((p) => resolve(root, `${p}.html`))];
    const patterns = [/class="ms[^"]*"[^>]*>([a-z0-9_]+)</g, /icon\(\s*'([a-z0-9_]+)'/g, /\bicon:\s*'([a-z0-9_]+)'/g];
    for (const file of sources) {
      const text = readFileSync(file, 'utf8');
      for (const re of patterns) for (const m of text.matchAll(re)) names.add(m[1]);
    }
    return [...names].sort();
  };
  return {
    name: 'google-fonts',
    transformIndexHtml() {
      const icons = scanIcons().join(',');
      return [
        { tag: 'link', attrs: { rel: 'preconnect', href: 'https://fonts.googleapis.com' }, injectTo: 'head-prepend' },
        { tag: 'link', attrs: { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }, injectTo: 'head-prepend' },
        { tag: 'link', attrs: { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Roboto+Flex:opsz,wght@8..144,300..700&display=swap' }, injectTo: 'head' },
        { tag: 'link', attrs: { rel: 'stylesheet', href: `https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,300..500,0..1,0&icon_names=${icons}&display=block` }, injectTo: 'head' },
      ];
    },
  };
}

/**
 * Lets the 3D globe run when the site is opened straight from disk.
 * Cesium does its heavy work (terrain meshes, etc.) in Web Workers. On a file:// page the browser blocks
 * workers loaded from files, from other sites, or via importScripts. Only a worker whose whole code is inside
 * the worker itself still runs. So:
 * - `virtual:cesium-workers` defines CESIUM_WORKERS: Cesium's own prebuilt bundle of every worker
 *   (taken from node_modules/cesium/Build/Cesium/Cesium.js, about 0.9 MB).
 * - TaskProcessor.js is patched so it uses that bundle first, with the worker code inlined into the worker
 *   instead of loaded with importScripts.
 * Other Cesium files (images, star map) still come from CESIUM_BASE_URL on the CDN.
 */
function cesiumEmbeddedWorkers() {
  const VIRTUAL = 'virtual:cesium-workers';
  return {
    name: 'cesium-embedded-workers',
    enforce: 'pre',
    resolveId: (id) => (id === VIRTUAL ? `\0${VIRTUAL}` : null),
    load(id) {
      if (id !== `\0${VIRTUAL}`) return null;
      const iife = readFileSync(resolve(root, 'node_modules/cesium/Build/Cesium/Cesium.js'), 'utf8');
      const b64 = iife.match(/CESIUM_WORKERS\s*=\s*atob\("([A-Za-z0-9+/=]+)"\)/)?.[1];
      if (!b64) throw new Error('cesium-embedded-workers: CESIUM_WORKERS not found in Cesium.js');
      return `globalThis.CESIUM_WORKERS = ${JSON.stringify(Buffer.from(b64, 'base64').toString('utf8'))};`;
    },
    transform(code, id) {
      if (!/@cesium[\\/]engine[\\/]Source[\\/]Core[\\/]TaskProcessor\.js$/.test(id)) return null;
      const patched = code
        .replace('if (crossOriginUrl) {', 'if (crossOriginUrl && typeof CESIUM_WORKERS === "undefined") {')
        .replace('importScripts("${urlFromScript(CESIUM_WORKERS)}");', '${CESIUM_WORKERS}');
      if (patched === code || !patched.includes('${CESIUM_WORKERS}')) throw new Error('cesium-embedded-workers: TaskProcessor.js has changed; update the patch');
      return patched;
    },
  };
}

/**
 * Makes the built site open straight from disk (double-clicking index.html).
 * - All JSON data is loaded from one plain script, data/atlas-data.js (made by scripts/bundle-data.mjs),
 *   because browsers block fetch() on file:// pages.
 * - Page scripts are built as classic scripts (IIFE) with `defer`, because browsers block
 *   <script type="module"> on file:// pages.
 */
function openFromDisk() {
  return {
    name: 'open-from-disk',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        if (!/type="module"/.test(html)) return html; // the redirect page has no bundle
        const out = html
          .replace(/<script type="module" crossorigin src=/g, '<script defer src=')
          .replace(/<link rel="stylesheet" crossorigin href=/g, '<link rel="stylesheet" href=');
        return {
          html: out,
          tags: [{ tag: 'script', attrs: { src: 'data/atlas-data.js' }, injectTo: 'head' }],
        };
      },
    },
  };
}

export default defineConfig(({ command }) => ({
  base: './', // relative paths, so the site works from a sub-folder or straight from disk
  plugins: [googleFonts(), cesiumEmbeddedWorkers(), command === 'build' ? openFromDisk() : null],
  define: {
    __CESIUM_BASE_URL__: JSON.stringify(`https://cdn.jsdelivr.net/npm/cesium@${cesiumVersion}/Build/Cesium/`),
  },
  css: {
    preprocessorOptions: {
      // Bootstrap 5.3's Sass still uses @import; hide those upstream deprecation warnings.
      scss: { quietDeps: true, silenceDeprecations: ['import', 'global-builtin', 'color-functions', 'if-function'] },
    },
  },
  build: {
    chunkSizeWarningLimit: 8000, // the globe page bundles CesiumJS, which is large by nature
    rollupOptions: {
      // Overridden per page by scripts/build.mjs; listed here so `vite build` alone still works.
      input: Object.fromEntries(PAGES.map((p) => [p, resolve(root, `${p}.html`)])),
    },
  },
}));
