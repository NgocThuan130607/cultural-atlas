// Tells Cesium where its static Workers/Assets/Widgets folders are (copied by vite.config.js).
// Imported before Cesium so it is set before Cesium first needs it.
window.CESIUM_BASE_URL = new URL('cesium/', document.baseURI).href;
