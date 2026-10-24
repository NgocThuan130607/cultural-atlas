import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { resolve } from 'node:path';
import { readFileSync, readdirSync } from 'node:fs';

const root = import.meta.dirname;

// Cesium ships prebuilt workers, widgets and assets that must be served as static files.
const cesiumBuild = 'node_modules/cesium/Build/Cesium';
const cesiumDirs = ['Workers', 'ThirdParty', 'Assets', 'Widgets'];

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
    const sources = [...files(resolve(root, 'src')), ...['index.html', 'city.html', 'landmark.html'].map((f) => resolve(root, f))];
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

export default defineConfig({
  base: './', // relative paths so the build works on GitHub Pages sub-folders too
  plugins: [
    googleFonts(),
    viteStaticCopy({
      targets: cesiumDirs.map((dir) => ({
        src: `${cesiumBuild}/${dir}`,
        dest: 'cesium',
        rename: { stripBase: 4 },
      })),
    }),
  ],
  css: {
    preprocessorOptions: {
      // Bootstrap 5.3's Sass still uses @import; hide those upstream deprecation warnings.
      scss: { quietDeps: true, silenceDeprecations: ['import', 'global-builtin', 'color-functions', 'if-function'] },
    },
  },
  build: {
    chunkSizeWarningLimit: 6000, // Cesium is large by nature
    rollupOptions: {
      input: {
        index: resolve(root, 'index.html'),
        city: resolve(root, 'city.html'),
        landmark: resolve(root, 'landmark.html'),
      },
    },
  },
});
