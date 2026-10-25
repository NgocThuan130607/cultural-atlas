// Runs before Cesium loads.

// Tells Cesium where its static Workers/Assets/Widgets folders are (copied by vite.config.js).
window.CESIUM_BASE_URL = new URL('cesium/', document.baseURI).href;

// WebGL 1 fix. Since CesiumJS 1.140 the billboard and label shaders declare `flat in` / `flat out` varyings.
// On devices without WebGL 2 (older GPUs, or GPUs whose WebGL 2 is blocked by the browser) Cesium converts
// its shaders to WebGL 1 syntax, but only rewrites `in`/`out` at the start of a line, so these declarations
// are left as-is and WebGL 1 rejects them. The whole globe then stops drawing.
// In WebGL 1 both forms are simply `varying`. That varying holds the same value on every vertex of a
// billboard, so losing `flat` changes nothing visible. Only WebGL 1 is patched; WebGL 2 has its own prototype.
const gl1 = window.WebGLRenderingContext?.prototype;
if (gl1?.shaderSource) {
  const shaderSource = gl1.shaderSource;
  gl1.shaderSource = function patchedShaderSource(shader, source) {
    return shaderSource.call(this, shader, String(source).replace(/\bflat\s+(?:varying|in|out)\b/g, 'varying'));
  };
}
