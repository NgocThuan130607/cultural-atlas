// Home page: a Google Earth–style CesiumJS globe.
// - Sharp rendering (device pixel ratio + MSAA), Esri satellite imagery, 3D terrain, and a borders/labels layer.
// - Search box, knowledge card on the left, map controls on the right, featured landmarks along the bottom.
// - Clicking a city or landmark flies the camera there and opens its card; the card links to the full guide.
import '../cesium-base.js'; // must run before Cesium loads its workers and assets
import {
  Viewer, Ion, ImageryLayer, ArcGisMapServerImageryProvider, TileMapServiceImageryProvider,
  UrlTemplateImageryProvider, Credit,
  ArcGISTiledElevationTerrainProvider, createGooglePhotorealistic3DTileset, buildModuleUrl, Terrain,
  Cartesian3, Cartesian2, Color, LabelStyle, VerticalOrigin, HorizontalOrigin, NearFarScalar,
  DistanceDisplayCondition, HeightReference, ScreenSpaceEventHandler, ScreenSpaceEventType,
  BoundingSphere, HeadingPitchRange, Math as CMath, Cartographic, defined,
  SceneTransforms, CallbackProperty, Matrix4, Transforms, PolylineGlowMaterialProperty, ArcType, EllipsoidGeodesic, EasingFunction,
} from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import {
  $, $$, esc, icon, getJSON, loadCities, loadCollections, collectionsOf, loadCity, loadLandmark, loadMedia,
  imageSrc, creditHTML, localTime, formatCoords, prefersReducedMotion, landmarkUrl,
} from '../common.js';
import { openStatus } from '../hours.js';
import { createWorldBar, snapshot, formatYear, periodOf } from '../world-year.js';
import '../trip.js'; // keeps the count on the My trip button up to date
import { initWelcome } from '../home-ui.js';
import { createShip, TRAVEL } from '../ship.js';
import { isGoodMonth, thisMonth, MONTHS } from '../season.js';

const ionToken = import.meta.env.VITE_CESIUM_ION_TOKEN;
const googleKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const ESRI = 'https://services.arcgisonline.com/ArcGIS/rest/services';
const HOME = { lon: 62, lat: 24, height: 22_500_000 };
const EOX_S2 = 'https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2021_3857/default/g/{z}/{y}/{x}.jpg';
const CLOSE_UP_LEVEL = 11; // globe tile level where Esri's detailed imagery takes over from Sentinel-2

// ---------------------------------------------------------------------------
// Viewer
// ---------------------------------------------------------------------------
/**
 * Starts Cesium. Some graphics drivers fail with the high-quality settings, so it tries
 * progressively safer setups: full quality → no MSAA at normal resolution → WebGL 1.
 * Throws the last error if every attempt fails.
 */
function createViewer() {
  if (ionToken) Ion.defaultAccessToken = ionToken;
  // Phones and tablets have little graphics memory: skip MSAA and cap the pixel density there.
  const touch = matchMedia('(pointer: coarse)').matches;
  const attempts = [
    { msaaSamples: touch ? 1 : 4, useBrowserRecommendedResolution: false },
    { msaaSamples: 1, useBrowserRecommendedResolution: true },
    { msaaSamples: 1, useBrowserRecommendedResolution: true, contextOptions: { requestWebgl1: true } },
  ];
  let viewer = null;
  let lastError = null;
  for (const [i, opts] of attempts.entries()) {
    try {
      $('#globe').innerHTML = ''; // clear anything a failed attempt left behind
      viewer = new Viewer('globe', {
        baseLayer: false, // added later
        baseLayerPicker: false, geocoder: false, homeButton: false, sceneModePicker: false,
        navigationHelpButton: false, animation: false, timeline: false, fullscreenButton: false,
        infoBox: false, selectionIndicator: false,
        creditContainer: $('#cesium-credits'),
        showRenderLoopErrors: false, // we show our own friendlier message
        ...opts,
      });
      if (i > 0) console.warn(`Globe started in safe mode ${i}`, lastError);
      break;
    } catch (err) {
      lastError = err;
      console.warn(`Globe start attempt ${i + 1} failed:`, err);
    }
  }
  if (!viewer) throw lastError;
  if (!viewer.useBrowserRecommendedResolution) {
    viewer.resolutionScale = Math.min(window.devicePixelRatio || 1, 2) / (window.devicePixelRatio || 1);
  }
  const { scene } = viewer;
  const globe = scene.globe;
  globe.maximumScreenSpaceError = touch ? 1.5 : 1; // load sharper tiles than the default (2)
  globe.tileCacheSize = 1000;
  globe.baseColor = Color.fromCssColorString('#0b1a2e');
  globe.showGroundAtmosphere = false; // the ground haze washes out the imagery; the sky glow around the globe stays
  globe.depthTestAgainstTerrain = false;
  scene.fog.enabled = true;
  scene.postProcessStages.fxaa.enabled = false; // MSAA already smooths edges; FXAA would blur the imagery
  scene.screenSpaceCameraController.minimumZoomDistance = 250;
  viewer.camera.setView({ destination: Cartesian3.fromDegrees(HOME.lon, HOME.lat, HOME.height * 1.6) });
  return viewer;
}

/** Rejects if `promise` takes longer than `ms`, so a blocked server can't stall the globe. */
const withTimeout = (promise, ms) => Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))]);

async function addImageryAndTerrain(viewer) {
  const layers = viewer.imageryLayers;

  // Base layer that always works: the Natural Earth texture shipped with Cesium (served from this site).
  // If a network blocks the online imagery, this still shows, so the globe never turns blank.
  try {
    layers.add(new ImageryLayer(await TileMapServiceImageryProvider.fromUrl(buildModuleUrl('Assets/Textures/NaturalEarthII'))));
  } catch { /* the online layers below may still work */ }

  if (ionToken) {
    layers.add(ImageryLayer.fromWorldImagery());
  } else {
    // Far away: Sentinel-2 cloudless, a true-colour satellite mosaic that stays crisp at whole-globe scale
    // (Esri's small-scale imagery is a soft, relief-shaded composite).
    // Close up: Esri World Imagery (sub-metre detail in cities). The layers hand over at CLOSE_UP_LEVEL.
    const esri = await withTimeout(ArcGisMapServerImageryProvider.fromUrl(`${ESRI}/World_Imagery/MapServer`), 10_000).catch(() => null);
    const s2 = new UrlTemplateImageryProvider({
      url: EOX_S2, maximumLevel: 14,
      credit: new Credit('<a href="https://s2maps.eu" target="_blank" rel="noopener">Sentinel-2 cloudless</a> by EOX IT Services GmbH (contains modified Copernicus Sentinel data 2021)', true),
    });
    layers.add(new ImageryLayer(s2, esri ? { maximumTerrainLevel: CLOSE_UP_LEVEL - 1 } : {}));
    if (esri) layers.add(new ImageryLayer(esri, { minimumTerrainLevel: CLOSE_UP_LEVEL }));
  }

  // Borders and place names, only once zoomed in a little (like Google Earth, the whole-globe view stays clean).
  let labels = null;
  try {
    labels = new ImageryLayer(await withTimeout(ArcGisMapServerImageryProvider.fromUrl(`${ESRI}/Reference/World_Boundaries_and_Places/MapServer`), 10_000), { minimumTerrainLevel: 4 });
    layers.add(labels);
  } catch { /* labels are optional */ }

  // 3D terrain: Cesium World Terrain with an ion token, otherwise Esri's public elevation service.
  try {
    if (ionToken) viewer.scene.setTerrain(Terrain.fromWorldTerrain());
    else viewer.terrainProvider = await withTimeout(ArcGISTiledElevationTerrainProvider.fromUrl(
      'https://elevation3d.arcgis.com/arcgis/rest/services/WorldElevation3D/Terrain3D/ImageServer'), 10_000);
  } catch { /* a flat globe is fine */ }

  // Optional: Google Photorealistic 3D Tiles (real 3D buildings) when a Google Maps key or ion token is set.
  if (googleKey || ionToken) {
    try {
      const tileset = await createGooglePhotorealistic3DTileset(googleKey ? { key: googleKey } : undefined);
      viewer.scene.primitives.add(tileset);
      viewer.scene.globe.show = false;
    } catch (err) { console.warn('Photorealistic 3D Tiles unavailable:', err); }
  }
  return labels;
}

// ---------------------------------------------------------------------------
// Markers (drawn on a canvas at 2x so they stay crisp)
// ---------------------------------------------------------------------------
function cityPin(highlight = false) {
  const s = 28; const c = document.createElement('canvas'); c.width = c.height = s * 2;
  const g = c.getContext('2d'); g.scale(2, 2);
  g.shadowColor = 'rgba(0,0,0,.5)'; g.shadowBlur = 4; g.shadowOffsetY = 1;
  g.beginPath(); g.arc(s / 2, s / 2, highlight ? 11 : 9, 0, Math.PI * 2); g.fillStyle = '#fff'; g.fill();
  g.shadowColor = 'transparent';
  g.beginPath(); g.arc(s / 2, s / 2, highlight ? 7.5 : 6, 0, Math.PI * 2); g.fillStyle = highlight ? '#d93025' : '#1a73e8'; g.fill();
  return c;
}
function landmarkPin(highlight = false) {
  const w = 30; const h = 40; const c = document.createElement('canvas'); c.width = w * 2; c.height = h * 2;
  const g = c.getContext('2d'); g.scale(2, 2);
  g.shadowColor = 'rgba(0,0,0,.45)'; g.shadowBlur = 4; g.shadowOffsetY = 1.5;
  g.beginPath();
  g.moveTo(w / 2, h - 2);
  g.bezierCurveTo(w / 2 - 2, h - 8, 2, 22, 2, 14);
  g.arc(w / 2, 14, 13, Math.PI, 0);
  g.bezierCurveTo(w - 2, 22, w / 2 + 2, h - 8, w / 2, h - 2);
  g.fillStyle = highlight ? '#b31412' : '#d93025'; g.fill();
  g.shadowColor = 'transparent';
  g.beginPath(); g.arc(w / 2, 14, 5, 0, Math.PI * 2); g.fillStyle = '#fff'; g.fill();
  return c;
}

const LABEL_FONT = '500 15px "Roboto Flex", Roboto, sans-serif';
const SMALL_LABEL_FONT = '500 13px "Roboto Flex", Roboto, sans-serif'; // for the dense map of provinces
const label = (text, offsetX, font = LABEL_FONT) => ({
  text, font, fillColor: Color.WHITE, outlineColor: Color.fromCssColorString('rgba(0,0,0,.75)'), outlineWidth: 4,
  style: LabelStyle.FILL_AND_OUTLINE, horizontalOrigin: HorizontalOrigin.LEFT, verticalOrigin: VerticalOrigin.CENTER,
  pixelOffset: new Cartesian2(offsetX, 0), heightReference: HeightReference.CLAMP_TO_GROUND, disableDepthTestDistance: 2e6,
});

function addMarkers(viewer, cities, landmarks) {
  for (const c of cities) {
    const province = !collectionsOf(c).includes('world'); // only shown on the close-up Vietnam map
    viewer.entities.add({
      id: `city:${c.id}`,
      position: Cartesian3.fromDegrees(c.lon, c.lat),
      billboard: {
        image: cityPin(), width: province ? 22 : 28, height: province ? 22 : 28, heightReference: HeightReference.CLAMP_TO_GROUND,
        disableDepthTestDistance: 2e6, scaleByDistance: new NearFarScalar(1e6, 1.1, 2e7, .85),
        distanceDisplayCondition: new DistanceDisplayCondition(60_000, Number.POSITIVE_INFINITY),
      },
      label: {
        ...label(c.name, province ? 14 : 18, province ? SMALL_LABEL_FONT : LABEL_FONT),
        distanceDisplayCondition: new DistanceDisplayCondition(60_000, Number.POSITIVE_INFINITY),
      },
    });
  }
  for (const lm of landmarks) {
    viewer.entities.add({
      id: `landmark:${lm.id}`,
      position: Cartesian3.fromDegrees(lm.lon, lm.lat),
      billboard: {
        image: landmarkPin(), width: 30, height: 40, verticalOrigin: VerticalOrigin.BOTTOM,
        heightReference: HeightReference.CLAMP_TO_GROUND, disableDepthTestDistance: 2e6,
        distanceDisplayCondition: new DistanceDisplayCondition(0, 400_000),
      },
      label: { ...label(lm.name, 18), pixelOffset: new Cartesian2(18, -26), distanceDisplayCondition: new DistanceDisplayCondition(0, 120_000) },
    });
  }
}

// Cities whose pins pulse red in Through time. A hover must not turn them back to blue.
const pulsingPins = new Set();
function setHighlight(viewer, entityId, on) {
  const e = entityId && viewer.entities.getById(entityId);
  if (!e) return;
  e.billboard.image = entityId.startsWith('city:') ? cityPin(on || pulsingPins.has(entityId)) : landmarkPin(on);
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------
async function main() {
  const [cities, media] = await Promise.all([loadCities(), loadMedia()]);
  const cityDetails = Object.fromEntries(await Promise.all(cities.map(async (c) => [c.id, await loadCity(c.id).catch(() => null)])));
  const landmarks = (await Promise.all(cities.flatMap((c) => c.landmarks.map((id) => loadLandmark(id).catch(() => null))))).filter(Boolean);
  const cityById = new Map(cities.map((c) => [c.id, c]));
  const lmById = new Map(landmarks.map((l) => [l.id, l]));
  const statusOf = (lm) => openStatus(lm.guide.hours, cityById.get(lm.city).timezone);

  // ----- Atlases ("collections"): the World, and a close-up Vietnam with all 34 provinces -----
  const collections = await loadCollections();
  const colById = new Map(collections.map((c) => [c.id, c]));
  const DEFAULT_HOME = { lon: HOME.lon, lat: HOME.lat, height: HOME.height, zoom: 3 };
  const homeOf = (id = set) => colById.get(id)?.home ?? DEFAULT_HOME;
  const inSet = (c, id = set) => collectionsOf(c).includes(id);
  const visibleCities = () => cities.filter((c) => inSet(c));
  const visibleLandmarks = () => landmarks.filter((lm) => inSet(cityById.get(lm.city)));
  // Moments for the "Through time" bar, loaded per atlas when first needed.
  const momentsCache = new Map();
  const momentsFor = (id) => {
    const file = colById.get(id)?.moments;
    if (!file) return Promise.resolve(null);
    if (!momentsCache.has(id)) momentsCache.set(id, getJSON(file).catch(() => null));
    return momentsCache.get(id);
  };

  // The URL hash holds the atlas, a place or a year: "#vietnam&hue", "#paris", "#vietnam&year=1945".
  const hashParts = decodeURIComponent(location.hash.slice(1)).split('&').filter(Boolean);
  const hashSet = hashParts.find((p) => colById.has(p));
  const hashPlace = hashParts.find((p) => cityById.has(p) || lmById.has(p));
  const hashYear = hashParts.map((p) => /^year=(-?\d+)$/.exec(p)).find(Boolean);
  const placeCity = hashPlace && (cityById.get(hashPlace) ?? cityById.get(lmById.get(hashPlace)?.city));
  let set = hashSet ?? (placeCity && !inSet(placeCity, 'world') ? collectionsOf(placeCity)[0] : 'world');
  if (!colById.has(set)) set = collections[0].id;
  let world = await momentsFor(set);

  /** Writes the hash, prefixed with the atlas when it isn't the default one. */
  const writeHash = (part = '') => {
    const parts = [set !== collections[0].id ? set : '', part].filter(Boolean);
    history.replaceState(null, '', parts.length ? `#${parts.join('&')}` : location.pathname + location.search);
  };

  const kcard = $('#kcard');
  const yearBtn = $('#year-btn');
  const barEl = $('#worldbar');
  const cardsEl = $('#year-cards');
  document.body.dataset.set = set;
  renderSetSwitch();
  renderIntro();
  renderVoyager();

  const reduced = prefersReducedMotion();
  let yearMode = false; // "The world in one year" mode (see below)

  // `nav` moves the view: the 3D globe when WebGL works, otherwise a 2D satellite map.
  // Everything else (card, search, landmark strip, buttons) works the same with either.
  let nav = null;
  let ship = null; // the Lạc ship (src/js/ship.js), started once there is a view
  let viewer = null;
  let startError = null;
  try {
    viewer = createViewer();
  } catch (err) {
    console.error(err);
    startError = err;
  }
  nav = viewer ? await startGlobe(viewer) : await startFlatMap('start', startError);

  nav.showCities(new Set(visibleCities().map((c) => c.id)));

  // ----- Switching atlas (World ↔ Vietnam) -----
  async function setCollection(id, { fly = true } = {}) {
    if (!colById.has(id) || id === set) return;
    const wasYearMode = yearMode;
    if (yearMode) exitYearMode({ quiet: true });
    set = id;
    document.body.dataset.set = set;
    renderSetSwitch();
    nav.showCities(new Set(visibleCities().map((c) => c.id)));
    nav.setReferenceLabels?.(colById.get(set)?.referenceLabels !== false);
    renderIntro();
    renderVoyager();
    world = await momentsFor(set);
    yearBtn.hidden = !world;
    writeHash();
    if (wasYearMode && world) enterYearMode();
    else if (fly) nav.home();
  }

  // ----- The place last chosen -----
  // Kept for the session, so the Lạc ship (src/js/ship.js) starts over it after a visit to a city's or landmark's
  // page. The gold thread between places (thirteenth round) is now the ship's trail (fifteenth round).
  const LAST_KEY = 'atlas-last-place';
  let lastPlace = null;
  try { lastPlace = JSON.parse(sessionStorage.getItem(LAST_KEY) ?? 'null'); } catch { /* no storage: start afresh */ }

  // ----- The Lạc ship (fifteenth round): hovers over the part of the globe in view, flies to the city chosen -----
  /** The part of the screen left free by the panel, the buttons and the landmark strip. */
  const freeArea = () => {
    const desktop = matchMedia('(min-width: 768px)').matches;
    const open = !kcard.classList.contains('collapsed');
    return {
      left: desktop && open ? kcard.getBoundingClientRect().right + 16 : 12,
      top: desktop ? 76 : 128,
      right: innerWidth - (desktop ? 84 : 12),
      bottom: desktop ? innerHeight - ($('#voyager').offsetHeight + 110) : innerHeight - (open ? kcard.offsetHeight + 16 : 24),
    };
  };
  ship = createShip({ view: () => nav, area: freeArea, avoid: () => (yearMode ? [] : visibleCities()), start: lastPlace });
  function arrive(id, at) {
    const place = { id, lon: at.lon, lat: at.lat };
    lastPlace = place;
    try { sessionStorage.setItem(LAST_KEY, JSON.stringify(place)); } catch { /* fine */ }
  }

  // ----- Diving into a place (thirteenth round) -----
  // A link from the card to a city's or landmark's page first sends the camera down towards the place, then
  // opens the page; the page's photo then grows out of the card's photo (src/inline/view-transitions.js).
  const PAGE_LINK = /(?:^|\/)(city|timetravel|stories|visit)\.html$/;
  function diveTo(a, e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target === '_blank') return false;
    const url = new URL(a.href, location.href);
    if (!PAGE_LINK.test(url.pathname)) return false;
    const id = url.searchParams.get('id');
    const place = cityById.get(id) ?? lmById.get(id);
    if (!place) return false;
    // The photo that will grow into the next page: the row's own picture in Through time, else the card's
    $$('[data-vt-hero]').forEach((el) => el.removeAttribute('data-vt-hero'));
    a.closest('.world-row')?.querySelector('img.thumb')?.setAttribute('data-vt-hero', '');
    arrive(id, place);
    if (reduced || !nav.dive) return false; // the page opens at once
    e.preventDefault();
    ship?.flyTo(place, { duration: 0.9, hoverAlt: cityById.has(id) ? 2_400 : 300, land: false }); // if it isn't there already
    document.body.classList.add('diving');
    let gone = false;
    const go = () => { if (!gone) { gone = true; location.href = a.href; } };
    nav.dive(place, go);
    setTimeout(go, 1300); // never wait longer than this
    return true;
  }
  // Coming back with the Back button (from the browser's page cache): lift the camera out again.
  addEventListener('pageshow', (e) => {
    if (!e.persisted || !document.body.classList.contains('diving')) return;
    document.body.classList.remove('diving');
    const at = lastPlace && (cityById.get(lastPlace.id) ?? lmById.get(lastPlace.id));
    if (at) (cityById.has(at.id) ? nav.city : nav.landmark)(at);
  });

  // ----- A landmark opens its Time travel page straight away (fourteenth round) -----
  // There is no landmark card on the globe any more: choosing a landmark anywhere (a city's card, the strip
  // along the bottom, a pin, the search) dives down to it and opens its Time travel page. `fromEl` is the
  // picture that was clicked, which grows into the page's cover (src/inline/view-transitions.js).
  function openLandmark(id, fromEl = null) {
    const lm = lmById.get(id);
    if (!lm) return;
    const c = cityById.get(lm.city);
    if (yearMode) exitYearMode({ quiet: true });
    $$('[data-vt-hero]').forEach((el) => el.removeAttribute('data-vt-hero'));
    fromEl?.setAttribute('data-vt-hero', '');
    arrive(id, lm);
    writeHash(c.id); // coming back, the globe shows the landmark's city
    const url = landmarkUrl(id, 'time');
    if (reduced || !nav.dive) { location.href = url; return; }
    ship?.flyTo(lm, { duration: 0.9, hoverAlt: 300, land: false });
    document.body.classList.add('diving');
    let gone = false;
    const go = () => { if (!gone) { gone = true; location.href = url; } };
    nav.dive(lm, go);
    setTimeout(go, 1300); // never wait longer than this
  }
  /** A link to a landmark on the globe (index.html#<landmark>): its city's card, the camera over the landmark. */
  function focusLandmark(id) {
    const lm = lmById.get(id);
    if (!lm) return;
    selectCity(lm.city, { fly: false });
    nav.landmark(lm);
  }

  // ----- Selection (updates card, view and URL hash) -----
  function selectCity(id, { fly = true } = {}) {
    const c = cityById.get(id);
    if (!c) return;
    arrive(id, c);
    const wasYear = yearMode;
    // switching atlas rewrites the hash once its moments have loaded, so the place is written again after it
    if (!inSet(c)) setCollection(collectionsOf(c)[0], { fly: false }).then(() => writeHash(id));
    if (yearMode) exitYearMode({ quiet: true });
    renderCity(c);
    // The ship flies to the city in exactly the time the camera takes, pulling the gold thread behind it.
    const secs = fly ? nav.city(c) : null;
    ship?.flyTo(c, { duration: secs ?? 2.4, trail: !wasYear });
    writeHash(id);
  }
  function goIntro() {
    renderIntro();
    writeHash();
    ship?.cruise();
  }

  // ----- Knowledge card events -----
  // Pointing at a city in the list lights up its pin, so the list and the globe read as one.
  // In Through time the city's floating card lights up too.
  let rowLit = null;
  const lightRow = (id) => {
    if (id === rowLit) return;
    if (rowLit) nav?.highlightCity?.(rowLit, false);
    $$('.ycard.lit', cardsEl).forEach((c) => c.classList.remove('lit'));
    rowLit = id;
    if (!id) return;
    nav?.highlightCity?.(id, true);
    $$('.ycard', cardsEl).find((c) => c.dataset.city === id)?.classList.add('lit');
  };
  const rowId = (e) => { const r = e.target.closest?.('.city-row, .world-row'); return r?.dataset.id ?? r?.dataset.city ?? null; };
  kcard.addEventListener('pointerover', (e) => lightRow(rowId(e)));
  kcard.addEventListener('pointerleave', () => lightRow(null));
  kcard.addEventListener('focusin', (e) => lightRow(rowId(e)));
  kcard.addEventListener('click', (e) => {
    const link = e.target.closest('a[href]');
    if (link && diveTo(link, e)) return;
    // Remember whether "Earlier history" is open, so it stays that way when the year changes.
    const more = e.target.closest('.world-more > summary');
    if (more) earlierOpen = !more.parentElement.open;
    const t = e.target.closest('[data-action]');
    if (!t) return;
    const { action, id } = t.dataset;
    if (action === 'city') selectCity(id);
    if (action === 'landmark') openLandmark(id, t.querySelector('img'));
    if (action === 'intro') { goIntro(); nav.home(); }
    if (action === 'close') kcard.classList.add('collapsed');
    if (action === 'year-city') focusYearCity(id);
    if (action === 'exit-year') exitYearMode();
  });
  $('#voyager').addEventListener('click', (e) => {
    const b = e.target.closest('[data-landmark]');
    if (b) openLandmark(b.dataset.landmark, b.querySelector('img'));
  });

  // ----- Buttons shared by both views -----
  $('#home-btn').addEventListener('click', () => { if (yearMode) exitYearMode({ quiet: true }); goIntro(); nav.home(); });
  $('#zoom-in').addEventListener('click', () => nav.zoomIn());

  // ----- Turning the globe (fourteenth round): two buttons, the ← → keys, or dragging -----
  // The line "Drag or use ← → to turn the globe" fades once the globe has been turned; the buttons stay.
  const globeHint = $('#globe-hint');
  const turned = () => globeHint.classList.add('moved');
  const turnButton = (btn, dir) => {
    let timer = 0;
    const stop = () => clearInterval(timer);
    btn.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      nav.turn?.(dir);
      turned();
      clearInterval(timer);
      timer = setInterval(() => nav.turn?.(dir), 600); // keeps turning while held
      btn.setPointerCapture?.(e.pointerId);
    });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((t) => btn.addEventListener(t, stop));
    // Enter or Space on the focused button (a click with no pointer)
    btn.addEventListener('click', (e) => { if (e.detail === 0) { nav.turn?.(dir); turned(); } });
  };
  turnButton($('#turn-left'), 1);
  turnButton($('#turn-right'), -1);
  addEventListener('keydown', (e) => {
    if (yearMode || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    if (e.target.closest?.('input, select, textarea, [contenteditable], [role="slider"], .leaflet-control, #kcard, #voyager')) return;
    e.preventDefault();
    nav.turn?.(e.key === 'ArrowLeft' ? 1 : -1);
    turned();
  });
  addEventListener('pointerdown', (e) => { if (e.target.closest?.('#globe, #flat-map')) turned(); });
  $('#zoom-out').addEventListener('click', () => nav.zoomOut());

  // ----- Search -----
  initSearch({ cities, landmarks, selectCity, selectLandmark: openLandmark });

  // ----- First-visit welcome -----
  // Someone following a link to a place or year goes straight there, without the welcome.
  initWelcome({ showNow: !hashPlace && !hashYear, onTryTime: world ? () => { if (!yearMode) enterYearMode(); } : null });

  // ----- Deep link (#paris, #vietnam&hue, #vietnam&year=1945) -----
  const delay = reduced || !viewer ? 0 : 1800;
  if (hashPlace && cityById.has(hashPlace)) setTimeout(() => selectCity(hashPlace), delay);
  else if (hashPlace) setTimeout(() => focusLandmark(hashPlace), delay);
  else if (hashYear && world) setTimeout(() => enterYearMode(Number(hashYear[1])), delay);

  // ----- Atlas switch buttons -----
  $('#set-switch').addEventListener('click', (e) => {
    const b = e.target.closest('[data-set]');
    if (!b || b.dataset.set === set) return;
    nav.clearThreads?.(); // a new atlas starts a new journey
    ship?.cruise();
    setCollection(b.dataset.set);
  });

  // -------------------------------------------------------------------------
  // "The world in one year": one timeline for the whole globe
  // -------------------------------------------------------------------------
  let bar = null;
  let barSet = null; // which atlas the bar was built for
  let snap = [];
  let cardKey = '';
  let unbindView = null;
  let focusId = null; // the city the current moment is about; its card is placed first
  let earlierOpen = false; // whether the visitor opened "Earlier history" in the list
  if (!world) yearBtn.hidden = true;
  yearBtn.addEventListener('click', () => (yearMode ? exitYearMode() : enterYearMode()));

  function enterYearMode(year) {
    if (!world) return;
    yearMode = true;
    nav.clearThreads?.();
    ship?.cruise();
    document.body.classList.add('year-mode');
    yearBtn.setAttribute('aria-pressed', 'true');
    barEl.hidden = false;
    if (!bar || barSet !== set) {
      bar?.stop();
      bar = createWorldBar(barEl, { ...world, onChange: onYear, onExit: () => exitYearMode() });
      barSet = set;
    }
    nav.setCityLabels?.(false);
    bindView();
    const col = colById.get(set);
    const start = Number.isFinite(year) ? year : (world.moments.find((m) => m.year === col?.defaultYear)?.year ?? world.range.to);
    bar.setYear(start, { animate: !Number.isFinite(year) });
    barEl.querySelector('#wb-range')?.focus({ preventScroll: true });
  }

  function exitYearMode({ quiet = false } = {}) {
    if (!yearMode) return;
    yearMode = false;
    bar?.stop();
    document.body.classList.remove('year-mode');
    yearBtn.setAttribute('aria-pressed', 'false');
    barEl.hidden = true;
    cardsEl.innerHTML = '';
    cardKey = '';
    unbindView?.(); unbindView = null;
    nav.setPulse?.(new Set());
    nav.setCityLabels?.(true);
    if (!quiet) { renderIntro(); writeHash(); nav.home(); ship?.cruise(); }
  }

  /** Called by the world bar while dragging (final=false) and when a year is settled. */
  function onYear(year, { final, moment }) {
    snap = snapshot(year, visibleCities(), cityDetails, lmById);
    focusId = (moment ?? world.moments.find((m) => m.year === year))?.focusCity ?? null;
    renderWorldCard(year, moment);
    renderYearCards();
    nav.setPulse?.(new Set(snap.filter((s) => s.isEvent).map((s) => s.city.id)));
    if (!final) return;
    writeHash(`year=${year}`);
    // Moments turn the globe towards the place where history is happening.
    if (moment) {
      const focus = moment.focusCity && cityById.get(moment.focusCity);
      if (focus) nav.look(focus); else nav.home();
    }
  }

  function focusYearCity(id) {
    const c = cityById.get(id);
    if (!c) return;
    bar?.stop();
    nav.look(c);
    $$('.world-row', kcard).forEach((r) => r.classList.toggle('focused', r.dataset.city === id));
    // A card on the map can point to a row inside the closed "Earlier history": open it and show the row.
    const row = $$('.world-row', kcard).find((r) => r.dataset.city === id);
    const more = row?.closest('details');
    if (more && !more.open) { more.open = true; earlierOpen = true; }
    row?.scrollIntoView({ block: 'nearest', behavior: reduced ? 'auto' : 'smooth' });
  }

  /** Re-attaches the floating cards to whichever view is active (the globe can switch to 2D at any time). */
  function bindView() {
    unbindView?.();
    unbindView = nav.onViewChange?.(layoutYearCards) ?? null;
    layoutYearCards();
  }

  const entryImage = (s) => {
    if (s.entry?.image) return imageSrc(s.entry.image, media);
    if (s.entry?.landmark) {
      const lm = lmById.get(s.entry.landmark);
      const era = lm?.eras[s.entry.era];
      if (era) return imageSrc(era.image, media);
    }
    return imageSrc(cityDetails[s.city.id]?.hero, media);
  };

  // ----- Left card: "The world in 1889" -----
  // Round 8 of feedback: one long list of every place, with this year's news mixed in with older entries,
  // was hard to read in busy years. Now this year's events come first, older entries sit in a closed
  // "Earlier history" group, and places with no record are named in a single line.
  const yearText = (y) => formatYear(y, y < -1000);
  function renderWorldCard(year, moment) {
    const events = snap.filter((s) => s.isEvent)
      .sort((a, b) => Number(b.city.id === focusId) - Number(a.city.id === focusId) || b.entry.year - a.entry.year);
    const earlier = snap.filter((s) => s.entry && !s.isEvent).sort((a, b) => b.entry.year - a.entry.year);
    const empty = snap.filter((s) => !s.entry);
    const key = `${events.map((s) => `${s.city.id}:${s.entry.year}:${s.landmarks.map((l) => l.state + l.index).join(',')}`).join(';')}|${earlier.map((s) => `${s.city.id}:${s.entry.year}`).join(';')}|${focusId}`;
    const sub = moment?.title ?? periodOf(year, world.periods).label;
    if (kcard.dataset.view === 'world' && kcard.dataset.key === key) {
      // Same content, only the year changed (while dragging): update the year in place.
      $$('[data-world-year]', kcard).forEach((el) => { el.textContent = yearText(year); });
      $('[data-world-sub]', kcard).textContent = sub;
      return;
    }
    const scroller = () => kcard.querySelector('.kcard-scroll');
    const scroll = kcard.dataset.view === 'world' ? scroller()?.scrollTop ?? 0 : 0;
    const row = (s, { event }) => `
      <li class="world-row ${event ? 'is-event' : ''} ${s.city.id === focusId ? 'is-focus' : ''}" data-city="${esc(s.city.id)}">
        <button class="place-row" type="button" data-action="year-city" data-id="${esc(s.city.id)}">
          <img class="thumb" src="${esc(entryImage(s))}" alt="" loading="lazy">
          <span class="grow">
            <span class="world-name">${esc(s.city.name)}<span class="world-when">${event ? '' : 'Since '}${esc(formatYear(s.entry.year, s.entry.approx))}</span></span>
            <span class="world-text">${esc(s.entry.text)}</span>
          </span>
        </button>
        ${event ? s.landmarks.filter((l) => l.state === 'era').map(({ lm, era, index }) => `
          <a class="world-lm" href="${esc(landmarkUrl(lm.id, 'time', { era: index }))}">
            ${icon('history')}<span><strong>${esc(lm.name)}</strong> · ${esc(era.label)}: ${esc(era.title)}</span>${icon('arrow_forward')}
          </a>`).join('') : ''}
      </li>`;
    const places = (n) => `${n} ${n === 1 ? 'place' : 'places'}`;
    show(`
      <div class="intro-head intro-lead world-head">
        <div class="d-flex justify-content-between align-items-start gap-2">
          <p class="intro-kicker mb-1">${icon('history_toggle_off')}Through time</p>
          <button class="icon-btn" type="button" data-action="exit-year" aria-label="Leave the world timeline">${icon('close')}</button>
        </div>
        <h2 class="intro-title world-title">${esc(colById.get(set)?.yearTitle ?? 'The world in')} <span data-world-year>${esc(yearText(year))}</span></h2>
        <p class="world-sub mb-0" data-world-sub>${esc(sub)}</p>
      </div>
      <hr class="divider">
      ${events.length ? `
        <p class="list-heading world-group mb-0">Happening in <span data-world-year>${esc(yearText(year))}</span> · ${places(events.length)}</p>
        <ul class="place-list world-list ${events.length > 6 ? 'dense' : ''}">${events.map((s) => row(s, { event: true })).join('')}</ul>` : `
        <p class="world-quiet">${icon('hourglass_empty')}<span>Nothing new in the atlas this year. Press play or drag the slider to find the next event.</span></p>`}
      ${earlier.length ? `
        <details class="world-more" ${earlierOpen || !events.length ? 'open' : ''}>
          <summary class="list-heading">${icon('expand_more')}Earlier history · ${places(earlier.length)}</summary>
          <ul class="place-list world-list compact">${earlier.map((s) => row(s, { event: false })).join('')}</ul>
        </details>` : ''}
      ${empty.length ? `<p class="world-none">No record yet for ${esc(empty.map((s) => s.city.name).join(', '))}.</p>` : ''}`);
    kcard.dataset.view = 'world';
    kcard.dataset.key = key;
    if (scroll && scroller()) scroller().scrollTop = scroll;
  }

  // ----- Floating cards beside each city on the globe / map -----
  function renderYearCards() {
    const key = `${focusId}|${snap.map((s) => `${s.city.id}:${s.entry?.year}:${s.isEvent}`).join(';')}`;
    if (key === cardKey) return;
    const old = new Map($$('.ycard', cardsEl).map((el) => [el.dataset.city, el.dataset.entry]));
    cardKey = key;
    // On a dense map (34 provinces) only cities with something happening that year get a card.
    const eventsOnly = colById.get(set)?.cards === 'events';
    // Cards are listed in the order they claim space: the moment's city, this year's events (newest
    // first), then older entries. layoutYearCards places them in that order and drops what doesn't fit.
    const rank = (s) => (s.city.id === focusId && s.isEvent ? 2 : s.isEvent ? 1 : 0);
    const shown = snap.filter((s) => s.entry && (!eventsOnly || s.isEvent))
      .sort((a, b) => rank(b) - rank(a) || b.entry.year - a.entry.year);
    cardsEl.innerHTML = `<svg class="ycard-lines" aria-hidden="true"></svg>${shown.map((s) => `
      <button type="button" class="ycard ${s.isEvent ? 'is-event' : ''} ${old.get(s.city.id) && old.get(s.city.id) !== String(s.entry.year) ? 'swap' : ''}"
        data-city="${esc(s.city.id)}" data-entry="${s.entry.year}" tabindex="-1">
        <img src="${esc(entryImage(s))}" alt="">
        <span><strong>${esc(s.city.name)}</strong><small>${esc(s.entry.text)}</small></span>
      </button>`).join('')}`;
    // Card sizes don't change once drawn, so measure them once here rather than on every frame.
    for (const el of $$('.ycard', cardsEl)) { el.dataset.w = el.offsetWidth; el.dataset.h = el.offsetHeight; }
    if (rowLit) $$('.ycard', cardsEl).find((c) => c.dataset.city === rowLit)?.classList.add('lit');
    layoutYearCards();
  }

  cardsEl.addEventListener('click', (e) => {
    const c = e.target.closest('.ycard');
    if (c) focusYearCity(c.dataset.city);
  });

  /**
   * Places each card next to its city, in priority order. Each card tries a few spots around its pin
   * (right, left, then a little higher or lower on either side) and takes the first one that stays on the
   * free part of the screen without covering another card or pin. A card with no free spot is hidden:
   * its pin still pulses and the place is in the list. At most 5 cards (2 on a phone) are shown at once.
   * (Round 8 of feedback: cards used to be pushed down and clamped, and piled up on top of each other.)
   */
  function layoutYearCards() {
    if (!yearMode || !nav.project) return;
    const els = $$('.ycard', cardsEl);
    // The part of the screen not covered by the side card, the controls or the timeline bar.
    const desktop = innerWidth >= 768;
    const cap = desktop ? 5 : 2;
    const cardBox = !kcard.classList.contains('collapsed') ? kcard.getBoundingClientRect() : null;
    const safe = {
      left: desktop && cardBox ? cardBox.right + 8 : 8,
      right: innerWidth - (desktop ? 64 : 8),
      top: desktop ? 68 : 120, // below the atlas switch and the buttons at the top
      bottom: (barEl.hidden ? innerHeight : barEl.getBoundingClientRect().top) - 8,
    };
    if (!desktop && cardBox) safe.bottom = Math.min(safe.bottom, cardBox.top - 8);
    const items = els.map((el) => {
      const c = cityById.get(el.dataset.city);
      return { el, p: nav.project(c.lat, c.lon), w: Number(el.dataset.w), h: Number(el.dataset.h) };
    });
    const onScreen = ({ p }) => p.visible && p.x > safe.left && p.x < safe.right && p.y > safe.top && p.y < safe.bottom;
    // Every pin with a card is an obstacle for the other cards.
    const pins = items.filter(onScreen).map(({ el, p }) => ({ id: el.dataset.city, x1: p.x - 10, x2: p.x + 10, y1: p.y - 10, y2: p.y + 10 }));
    const hits = (b, o, m = 0) => b.x1 < o.x2 + m && b.x2 > o.x1 - m && b.y1 < o.y2 + m && b.y2 > o.y1 - m;
    const placed = [];
    let lines = '';
    for (const it of items) {
      const { el, p, w, h } = it;
      let spot = null;
      if (placed.length < cap && w && onScreen(it)) {
        const g = 18; // gap between the pin and the card
        const step = h / 2 + 8;
        for (const dy of [0, -1, 1, -2, 2, -3, 3]) {
          for (const x of [p.x + g, p.x - g - w]) {
            const b = { x1: x, x2: x + w, y1: p.y - h / 2 + dy * step, y2: p.y + h / 2 + dy * step };
            if (b.x1 < safe.left || b.x2 > safe.right || b.y1 < safe.top || b.y2 > safe.bottom) continue;
            if (placed.some((o) => hits(b, o, 6)) || pins.some((o) => o.id !== el.dataset.city && hits(b, o))) continue;
            spot = b;
            break;
          }
          if (spot) break;
        }
      }
      el.hidden = !spot;
      if (!spot) continue;
      placed.push(spot);
      el.style.transform = `translate(${Math.round(spot.x1)}px, ${Math.round(spot.y1)}px)`;
      const edge = spot.x1 > p.x ? spot.x1 : spot.x2; // the card side facing the pin
      const mid = (spot.y1 + spot.y2) / 2;
      if (Math.abs(mid - p.y) > 4) lines += `<line x1="${p.x}" y1="${p.y}" x2="${edge}" y2="${mid}"/>`;
    }
    const svg = $('.ycard-lines', cardsEl);
    if (svg) svg.innerHTML = lines;
  }

  // -------------------------------------------------------------------------
  // 3D globe (CesiumJS)
  // -------------------------------------------------------------------------
  async function startGlobe(viewer) {
  // If the graphics stop working later (driver error, phone out of memory), switch to the 2D map.
  let failed = false;
  const fail = async (kind, err) => {
    if (failed) return;
    failed = true;
    console.error(err ?? kind);
    $('#globe').style.visibility = 'hidden';
    nav = await startFlatMap(kind, err);
    ship?.bind();
    if (yearMode) { nav.setCityLabels?.(false); bindView(); onYear(bar.year, { final: false }); }
  };
  viewer.canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); fail('lost'); });
  viewer.scene.renderError.addEventListener((_, err) => fail('render', err));
  if (import.meta.env.DEV) { // lets dev tools and tests inspect the globe
    window.__viewer = viewer;
    import('cesium').then((m) => { window.__Cesium = m; });
  }
  const labelsLayerPromise = addImageryAndTerrain(viewer);
  await document.fonts?.load(LABEL_FONT).catch(() => {});
  addMarkers(viewer, cities, landmarks);
  const { camera, scene } = viewer;

  // Opening move: ease in from deep space, then the globe rests. (It used to keep spinning, but in user
  // testing the moving globe pulled first-time visitors' eyes away from the panel that explains the site.)
  { const h = homeOf(); camera.flyTo({ destination: Cartesian3.fromDegrees(h.lon, h.lat, h.height), duration: reduced ? 0 : 2.2, complete: composeHome }); }

  // ----- Picking -----
  const handler = new ScreenSpaceEventHandler(scene.canvas);
  let hovered = null;
  const pickId = (pos) => {
    const p = scene.pick(pos);
    const id = defined(p) && typeof p.id?.id === 'string' ? p.id.id : null;
    return id && (id.startsWith('city:') || id.startsWith('landmark:')) ? id : null;
  };
  handler.setInputAction((m) => {
    const id = pickId(m.endPosition);
    // Hovering only lights the pin and shows its name in a chip: the other names stay where they are.
    if (id !== hovered) {
      setHighlight(viewer, hovered, false); setHighlight(viewer, id, true); hovered = id;
      showTip(id?.startsWith('city:') ? id.slice(5) : null);
    }
    viewer.canvas.style.cursor = id ? 'pointer' : '';
    updateReadout(m.endPosition);
  }, ScreenSpaceEventType.MOUSE_MOVE);
  // Leaving the globe for the panel or a button also ends the hover.
  viewer.canvas.addEventListener('pointerleave', () => {
    if (!hovered) return;
    setHighlight(viewer, hovered, false);
    hovered = null;
    showTip(null);
  });
  handler.setInputAction((c) => {
    const id = pickId(c.position);
    if (!id) return;
    const [type, key] = id.split(':');
    if (type === 'city') { if (yearMode) focusYearCity(key); else selectCity(key); } else openLandmark(key);
  }, ScreenSpaceEventType.LEFT_CLICK);

  // ----- Camera moves -----
  /** Seconds for a flight: longer the further round the globe and the more it zooms (2 to 3.6 s). */
  function flightTime(lon, lat, range) {
    if (reduced) return 0;
    const here = camera.positionCartographic;
    const g = new EllipsoidGeodesic(new Cartographic(here.longitude, here.latitude), Cartographic.fromDegrees(lon, lat));
    const zoom = Math.abs(Math.log10(Math.max(here.height, 1) / range));
    return Math.min(3.6, Math.max(2, 1.5 + (g.surfaceDistance / 6_371_000) * 0.7 + zoom * 0.3));
  }
  // Flights to a place are run here rather than by Cesium (fifteenth round), in two overlapping parts: first
  // the globe turns until the place is in the middle of the free part of the screen (the first TRAVEL part of
  // the time), then the camera comes down and tilts, looking at the place all the way. Cesium's own flight
  // tilted towards the horizon half-way, with the place out of view. Now the place stays in view, and so does
  // the ship that flies to it at the same pace.
  let flightFrame = 0;
  const endOwnFlight = () => { cancelAnimationFrame(flightFrame); flightFrame = 0; };
  function stopFlight() { endOwnFlight(); camera.cancelFlight(); }
  for (const type of ['pointerdown', 'wheel']) scene.canvas.addEventListener(type, endOwnFlight, { passive: true }); // the visitor takes over
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
  const unit = (t) => Math.max(0, Math.min(1, t));
  const blend = (a, b, t) => a + (b - a) * t;
  const blendAngle = (a, b, t) => a + (((b - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI) * t;

  /** Looks at a point on the ground from a heading, pitch and distance, then turns the view into the free part of the screen. */
  function lookFrom(at, heading, pitch, range, { ax, ay }) {
    camera.lookAt(Cartesian3.fromRadians(at.longitude, at.latitude), new HeadingPitchRange(heading, pitch, range));
    camera.lookAtTransform(Matrix4.IDENTITY);
    camera.lookLeft(ax);
    camera.lookDown(ay);
  }
  /** What the camera is looking at now, in the terms of lookFrom; null if that is the sky. */
  function lookNow({ dx, dy }) {
    const pixel = new Cartesian2(scene.canvas.clientWidth / 2 + dx, scene.canvas.clientHeight / 2 - dy);
    const ground = camera.pickEllipsoid(pixel);
    if (!ground) return null;
    const toLocal = Matrix4.inverseTransformation(Transforms.eastNorthUpToFixedFrame(ground), new Matrix4());
    const dir = Matrix4.multiplyByPointAsVector(toLocal, camera.getPickRay(pixel).direction, new Cartesian3());
    // straight down, the heading is where the top of the view points
    const flatDir = Math.hypot(dir.x, dir.y) > 0.02 ? dir : Matrix4.multiplyByPointAsVector(toLocal, camera.upWC, new Cartesian3());
    return {
      at: Cartographic.fromCartesian(ground), range: Cartesian3.distance(camera.positionWC, ground),
      heading: Math.atan2(flatDir.x, flatDir.y), pitch: Math.asin(Math.max(-1, Math.min(1, dir.z))),
    };
  }
  /** Flies the camera to look at a point; returns the seconds it will take, so the ship can fly in step. */
  function flyTo(lon, lat, range, pitchDeg, headingDeg = 0) {
    stopFlight();
    const secs = flightTime(lon, lat, range);
    const compose = composeAngles();
    const dest = Cartographic.fromDegrees(lon, lat);
    const heading = CMath.toRadians(headingDeg);
    const pitch = CMath.toRadians(pitchDeg);
    const from = secs ? lookNow(compose) : null;
    if (!from) { // no motion wanted (or the view is on the sky): be there
      lookFrom(dest, heading, pitch, range, compose);
      return 0;
    }
    const path = new EllipsoidGeodesic(new Cartographic(from.at.longitude, from.at.latitude), dest);
    const far = path.surfaceDistance;
    // Between two places that are both seen from close by, the camera first rises until both are in view.
    const rise = Math.max(0, far * 0.9 - Math.max(from.range, range));
    const t0 = performance.now();
    const step = (now) => {
      const u = unit((now - t0) / (secs * 1000));
      const turn = easeInOut(Math.min(1, u / TRAVEL)); // the globe turns to the place...
      const zoom = easeInOut(unit((u - 0.3) / 0.7)); // ...then the camera comes down and tilts
      const up = Math.sin(Math.PI * easeInOut(u));
      const at = far > 1 ? path.interpolateUsingFraction(turn) : dest;
      const r = Math.exp(blend(Math.log(from.range), Math.log(range), zoom)) + up * rise;
      const p = blend(blend(from.pitch, pitch, zoom), -Math.PI / 2, rise > 0 ? up : 0); // from high up, look straight down
      lookFrom(at, blendAngle(from.heading, heading, zoom), p, r, compose);
      flightFrame = u < 1 ? requestAnimationFrame(step) : 0;
    };
    flightFrame = requestAnimationFrame(step);
    return secs;
  }
  function flyHome() {
    stopFlight();
    const h = homeOf();
    camera.flyTo({ destination: Cartesian3.fromDegrees(h.lon, h.lat, h.height), orientation: { heading: 0, pitch: -CMath.PI_OVER_TWO }, duration: reduced ? 0 : 2, complete: composeHome });
  }

  // Centre the view in the space left free by the card (left) and the landmark strip (bottom),
  // by turning the camera slightly rather than moving it. The turn is eased over a few frames.
  /** How far the middle of the free part of the screen is from the middle of the screen: in pixels, and as angles. */
  function composeAngles() {
    const w = scene.canvas.clientWidth;
    const h = scene.canvas.clientHeight;
    const fov = camera.frustum.fov; // horizontal when the screen is wider than tall
    const focal = (w >= h ? w : h) / 2 / Math.tan(fov / 2);
    const desktop = matchMedia('(min-width: 768px)').matches;
    const cardOpen = !kcard.classList.contains('collapsed');
    const dx = desktop && cardOpen ? (kcard.offsetWidth + 12) / 2 : 0;
    const dy = desktop ? ($('#voyager').offsetHeight + 40) / 2 : (cardOpen ? kcard.offsetHeight / 2 : 0);
    return { dx, dy, ax: Math.atan(dx / focal), ay: Math.atan(dy / focal) };
  }
  function composeHome() {
    const { ax, ay } = composeAngles();
    if (reduced) { camera.lookLeft(ax); camera.lookDown(ay); return; }
    const frames = 24;
    let n = 0;
    let done = 0;
    const step = () => {
      n += 1;
      const t = 1 - (1 - n / frames) ** 3; // ease-out
      const d = t - done;
      done = t;
      camera.lookLeft(ax * d);
      camera.lookDown(ay * d);
      if (n < frames) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  let labelsLayer = null;
  let wantReferenceLabels = colById.get(set)?.referenceLabels !== false;
  labelsLayerPromise.then((layer) => {
    labelsLayer = layer;
    if (layer) layer.show = wantReferenceLabels;
  });

  // ----- Status-bar readout -----
  const readout = $('#readout');
  let cursorText = '';
  function updateReadout(pos) {
    if (pos) {
      const cart = camera.pickEllipsoid(pos);
      if (cart) {
        const g = Cartographic.fromCartesian(cart);
        cursorText = formatCoords(CMath.toDegrees(g.latitude), CMath.toDegrees(g.longitude), 4);
      } else cursorText = '';
    }
    const h = camera.positionCartographic.height;
    const cam = h > 10_000 ? `${Math.round(h / 1000).toLocaleString()} km` : `${Math.round(h).toLocaleString()} m`;
    readout.textContent = `${cursorText ? `${cursorText}   ` : ''}Camera ${cam}`;
  }
  // ----- Label decluttering (like Google Earth): hide names that would overlap pins or other names -----
  const groundCarto = new Cartographic();
  const projectPoint = (lat, lon, alt = 0) => {
    // Close to the ground, heights are measured from the terrain (as the pins are), not from sea level.
    let base = 0;
    if (camera.positionCartographic.height < 200_000) {
      base = scene.globe.getHeight(Cartographic.fromDegrees(lon, lat, 0, groundCarto)) ?? 0;
    }
    const p = Cartesian3.fromDegrees(lon, lat, base + alt);
    const toCamera = Cartesian3.subtract(camera.positionWC, p, new Cartesian3());
    const facing = Cartesian3.dot(toCamera, Cartesian3.normalize(p, new Cartesian3())) > 0;
    const win = facing ? SceneTransforms.worldToWindowCoordinates(scene, p) : null;
    return win ? { x: win.x, y: win.y, visible: true } : { visible: false };
  };
  let labelsOn = true;
  const measureCtx = document.createElement('canvas').getContext('2d');
  const labelWidth = new Map();
  const isProvince = (c) => !collectionsOf(c).includes('world');
  const widthOf = (c) => {
    if (!labelWidth.has(c.id)) {
      measureCtx.font = isProvince(c) ? SMALL_LABEL_FONT : LABEL_FONT;
      labelWidth.set(c.id, measureCtx.measureText(c.name).width + 6);
    }
    return labelWidth.get(c.id);
  };
  // Cities first, then provinces; within each, keep the list order (north to south). Hover doesn't
  // change the order: it used to, and every hover reshuffled the names around it (user feedback, round 8).
  const priority = (c) => (c.kind === 'City' ? 2 : 1);
  function declutter() {
    if (!labelsOn) return;
    const items = visibleCities()
      .map((c) => ({ c, e: viewer.entities.getById(`city:${c.id}`), p: projectPoint(c.lat, c.lon) }))
      .filter((x) => x.e);
    // Every visible pin is an obstacle that other cities' names must not cover.
    const pins = items.filter((x) => x.p.visible).map(({ c, p }) => ({ id: c.id, x1: p.x - 9, x2: p.x + 9, y1: p.y - 9, y2: p.y + 9 }));
    const placed = [];
    const hits = (b, list) => list.some((o) => b.x1 < o.x2 && b.x2 > o.x1 && b.y1 < o.y2 && b.y2 > o.y1);
    for (const { c, e, p } of [...items].sort((a, b) => priority(b.c) - priority(a.c))) {
      if (!p.visible) { e.label.show = false; continue; }
      const h = isProvince(c) ? 16 : 19;
      const gap = isProvince(c) ? 13 : 17;
      const w = widthOf(c);
      const others = pins.filter((o) => o.id !== c.id);
      // Try the name to the right of the pin, then left, then above and below.
      const sides = [
        { box: { x1: p.x + gap, x2: p.x + gap + w, y1: p.y - h / 2, y2: p.y + h / 2 }, h: HorizontalOrigin.LEFT, v: VerticalOrigin.CENTER, off: [gap, 0] },
        { box: { x1: p.x - gap - w, x2: p.x - gap, y1: p.y - h / 2, y2: p.y + h / 2 }, h: HorizontalOrigin.RIGHT, v: VerticalOrigin.CENTER, off: [-gap, 0] },
        { box: { x1: p.x - w / 2, x2: p.x + w / 2, y1: p.y - gap - h, y2: p.y - gap }, h: HorizontalOrigin.CENTER, v: VerticalOrigin.BOTTOM, off: [0, -gap] },
        { box: { x1: p.x - w / 2, x2: p.x + w / 2, y1: p.y + gap, y2: p.y + gap + h }, h: HorizontalOrigin.CENTER, v: VerticalOrigin.TOP, off: [0, gap] },
      ];
      let side = sides.find((s) => !hits(s.box, placed) && !hits(s.box, others));
      // Big cities are always named, at least where they don't hide another name.
      if (!side && priority(c) >= 2) side = sides.find((s) => !hits(s.box, placed)) ?? sides[0];
      // A name hidden to avoid overlaps is still shown while it is pointed at, where it would go, and without
      // moving any other name.
      const onlyWhilePointed = !side && c.id === tipId;
      if (onlyWhilePointed) side = sides[0];
      e.label.show = Boolean(side);
      if (!side) continue;
      e.label.horizontalOrigin = side.h;
      e.label.verticalOrigin = side.v;
      e.label.pixelOffset = new Cartesian2(...side.off);
      if (!onlyWhilePointed) placed.push(side.box);
    }
  }

  // ----- The name of the place under the mouse (or of the city row being pointed at in the panel) -----
  // Fourteenth round: the name is lit where it is, on a dark chip, and never moves. It used to be hidden and
  // repeated in a chip above the pin; with the mouse on the name, the name vanished, the hover ended, the name
  // came back and the hover started again, so the name seemed to jump. The pin and its name now point to the
  // same city, and nothing moves while the mouse goes from one to the other.
  let tipId = null;
  const CHIP = Color.fromCssColorString('rgba(32, 33, 36, .92)');
  const CHIP_PAD = new Cartesian2(7, 4);
  function lightLabel(id, on) {
    const l = viewer.entities.getById(`city:${id}`)?.label;
    if (!l) return;
    l.showBackground = on;
    l.backgroundColor = CHIP;
    l.backgroundPadding = CHIP_PAD;
    l.outlineWidth = on ? 0 : 4;
  }
  function showTip(id) {
    const next = id && cityById.has(id) ? id : null;
    if (next === tipId) return;
    if (tipId) lightLabel(tipId, false);
    tipId = next;
    if (tipId) lightLabel(tipId, true);
    declutter(); // shows a hidden name while it is pointed at (and hides it again after)
  }
  camera.percentageChanged = 0.01;
  camera.changed.addEventListener(() => { updateReadout(); declutter(); });
  camera.moveEnd.addEventListener(declutter);
  updateReadout();
  declutter();

  // ----- Gold threads between places (thirteenth round), now the trail of the Lạc ship (fifteenth round) -----
  // The ship adds a point to its trail every frame, so the head of the thread is always exactly at the ship.
  // The last three stay; older ones fade.
  const GOLD = Color.fromCssColorString('#e8c56a');
  const threads = [];
  const glow = (alpha) => new PolylineGlowMaterialProperty({ glowPower: 0.2, taperPower: 1, color: GOLD.withAlpha(alpha) });
  function trail() {
    const pts = [];
    const ent = viewer.entities.add({ polyline: {
      positions: new CallbackProperty(() => pts, false), show: new CallbackProperty(() => pts.length > 1, false),
      width: 8, arcType: ArcType.NONE, material: glow(0.95),
    } });
    threads.push(ent);
    while (threads.length > 3) viewer.entities.remove(threads.shift());
    threads.forEach((x, i) => { x.polyline.material = glow([0.95, 0.6, 0.32][threads.length - 1 - i]); });
    return {
      push: (lon, lat, alt) => pts.push(Cartesian3.fromDegrees(lon, lat, Math.max(alt, 500))),
      end: () => { // stop recomputing
        if (!viewer.entities.contains(ent)) return;
        if (pts.length < 2) { viewer.entities.remove(ent); threads.splice(threads.indexOf(ent), 1); return; }
        ent.polyline.positions = pts.slice();
        ent.polyline.show = true;
      },
    };
  }
  function clearThreads() { threads.splice(0).forEach((x) => viewer.entities.remove(x)); }

  // ----- Turning the globe with the buttons or the arrow keys (fourteenth round) -----
  // About 30° when the whole globe is in view, proportionally less when closer in, eased over 0.6 s.
  // dir 1 turns the globe's face to the left (the camera moves east), -1 to the right.
  let turnFrame = 0;
  function turn(dir) {
    cancelAnimationFrame(turnFrame);
    stopFlight();
    const h = camera.positionCartographic.height;
    const total = CMath.toRadians(30) * Math.min(1, Math.max(0.002, h / 20_000_000)) * dir;
    if (reduced) { camera.rotate(Cartesian3.UNIT_Z, total); return; }
    const t0 = performance.now();
    let done = 0;
    const step = (now) => {
      const k = Math.max(0, Math.min(1, (now - t0) / 600));
      const e = 1 - (1 - k) ** 3;
      camera.rotate(Cartesian3.UNIT_Z, (e - done) * total);
      done = e;
      if (k < 1) turnFrame = requestAnimationFrame(step);
    };
    turnFrame = requestAnimationFrame(step);
  }

  // ----- The line "Drag or use ← → to turn the globe" sits centred under the globe (fifteenth round) -----
  // It used to be centred in the free part of the screen, which is not where the globe's centre is.
  // Close in, when the globe fills the screen, it goes back to the middle of the free part (the CSS default).
  const hintEl = $('#globe-hint');
  let hintX = null;
  scene.postRender.addEventListener(() => {
    let x = null;
    if (camera.positionCartographic.height > 3_000_000) {
      const c = SceneTransforms.worldToWindowCoordinates(scene, Cartesian3.ZERO);
      if (c) x = Math.round(c.x);
    }
    if (x === hintX) return;
    hintX = x;
    if (x === null) hintEl.style.removeProperty('--hint-x'); else hintEl.style.setProperty('--hint-x', `${x}px`);
  });

  // ----- Diving into a place before its page opens (thirteenth round) -----
  function dive(place, done) {
    stopFlight();
    const isCity = cityById.has(place.id);
    camera.flyToBoundingSphere(new BoundingSphere(Cartesian3.fromDegrees(place.lon, place.lat), 50), {
      offset: new HeadingPitchRange(camera.heading, CMath.toRadians(isCity ? -58 : -40), isCity ? 2_500 : 350),
      duration: 0.9,
      easingFunction: EasingFunction.CUBIC_IN,
      complete: done,
      cancel: done,
    });
  }

  return {
    turn,
    dive,
    trail,
    clearThreads,
    /** For the ship: a point on screen → the ground under it; the camera's height; a call after every frame. */
    pick: (x, y) => {
      const cart = camera.pickEllipsoid(new Cartesian2(x, y));
      if (!cart) return null;
      const g = Cartographic.fromCartesian(cart);
      return { lon: CMath.toDegrees(g.longitude), lat: CMath.toDegrees(g.latitude) };
    },
    viewHeight: () => camera.positionCartographic.height,
    onFrame: (cb) => scene.postRender.addEventListener(cb),
    city: (c) => flyTo(c.lon, c.lat, 24_000, -42),
    landmark: (lm) => flyTo(lm.lon, lm.lat, 1_600, -28, 15),
    home: flyHome,
    highlightCity: (id, on) => {
      setHighlight(viewer, `city:${id}`, on);
      if (on) showTip(id); else if (tipId === id) showTip(null);
    },
    zoomIn: () => { camera.zoomIn(camera.positionCartographic.height * 0.45); },
    zoomOut: () => { camera.zoomOut(camera.positionCartographic.height * 0.8); },
    /** Shows or hides the map's own borders and place names (they would repeat our labels on the Vietnam map). */
    setReferenceLabels: (on) => {
      wantReferenceLabels = on;
      if (labelsLayer) labelsLayer.show = on;
    },
    // ----- Used by the world timeline -----
    /** Turns the whole globe to face a city, keeping the rest of the world in view. */
    look: (c) => {
      stopFlight();
      camera.flyTo({
        destination: Cartesian3.fromDegrees(c.lon, c.lat, colById.get(set)?.lookHeight ?? 9_000_000),
        orientation: { heading: 0, pitch: -CMath.PI_OVER_TWO, roll: 0 },
        duration: reduced ? 0 : 2.2, complete: composeHome,
      });
    },
    /** Screen position of a place; `visible` is false when it is on the far side of the Earth. */
    project: projectPoint,
    /** Calls `cb` after every frame; returns a function that stops it. */
    onViewChange: (cb) => scene.postRender.addEventListener(cb),
    /** Makes the given cities' pins red and gently pulsing. */
    setPulse: (() => {
      let last = '';
      return (ids) => {
        const key = [...ids].sort().join(',');
        if (key === last) return;
        last = key;
        const t0 = performance.now();
        pulsingPins.clear();
        for (const id of ids) pulsingPins.add(`city:${id}`);
        for (const c of cities) {
          const e = viewer.entities.getById(`city:${c.id}`);
          if (!e) continue;
          const on = ids.has(c.id);
          e.billboard.image = cityPin(on);
          e.billboard.scale = !on ? 1 : reduced ? 1.35
            : new CallbackProperty(() => 1.25 + 0.2 * Math.sin((performance.now() - t0) / 280), false);
        }
      };
    })(),
    setCityLabels: (on) => {
      labelsOn = on;
      if (on) declutter();
      else for (const c of cities) { const e = viewer.entities.getById(`city:${c.id}`); if (e) e.label.show = false; }
    },
    /** Shows only the given cities (and their landmarks) on the globe. */
    showCities: (ids) => {
      for (const c of cities) {
        const e = viewer.entities.getById(`city:${c.id}`);
        if (e) e.show = ids.has(c.id);
      }
      for (const lm of landmarks) {
        const e = viewer.entities.getById(`landmark:${lm.id}`);
        if (e) e.show = ids.has(lm.city);
      }
      declutter();
    },
  };
  } // end startGlobe

  // -------------------------------------------------------------------------
  // 2D fallback: a satellite map (Leaflet, no WebGL needed) with the same pins and behaviour
  // -------------------------------------------------------------------------
  async function startFlatMap(kind, err) {
    const { createMap, landmarkMarker, L } = await import('../map.js');
    document.body.classList.add('flat-mode');
    const holder = document.createElement('div');
    holder.id = 'flat-map';
    holder.setAttribute('aria-label', '2D satellite map. Use the search box or the place list to choose a city.');
    document.body.prepend(holder);
    const start = homeOf();
    const map = createMap(holder, { lat: start.lat, lon: start.lon, zoom: start.zoom ?? 3, minZoom: 2, style: 'satellite', zoomButtons: false });

    // City dots with names, like on the globe.
    const cityMarkers = new Map();
    for (const c of cities) {
      const m = L.marker([c.lat, c.lon], {
        title: c.name, alt: c.name, riseOnHover: true, keyboard: true,
        icon: L.divIcon({ className: '', html: `<span class="flat-city"><i></i><span>${esc(c.name)}</span></span>`, iconSize: [0, 0], iconAnchor: [9, 9] }),
      }).on('click', () => (yearMode ? focusYearCity(c.id) : selectCity(c.id)));
      if (inSet(c)) m.addTo(map);
      cityMarkers.set(c.id, m);
    }
    // Hide names that would overlap another name (cities first, then provinces in list order).
    const declutterFlat = () => {
      const placed = [];
      const list = cities.filter((c) => inSet(c)).sort((a, b) => (b.kind === 'City') - (a.kind === 'City'));
      const overlaps = (r, o) => r.left < o.right && r.right > o.left && r.top < o.bottom && r.bottom > o.top;
      // Pins are obstacles for province names (big cities may cover a neighbour's pin).
      const pins = list.map((c) => ({ id: c.id, r: cityMarkers.get(c.id).getElement()?.querySelector('.flat-city > i')?.getBoundingClientRect() })).filter((x) => x.r);
      for (const c of list) {
        const el = cityMarkers.get(c.id).getElement()?.querySelector('.flat-city');
        const span = el?.querySelector(':scope > span');
        if (!span) continue;
        span.style.visibility = '';
        // Try the name on the right of the dot, then on the left.
        let ok = false;
        for (const left of [false, true]) {
          el.classList.toggle('left', left);
          const r = span.getBoundingClientRect();
          if (!placed.some((o) => overlaps(r, o)) && !pins.some((p) => p.id !== c.id && overlaps(r, p.r))) { placed.push(r); ok = true; break; }
        }
        if (!ok && c.kind === 'City') { el.classList.remove('left'); placed.push(span.getBoundingClientRect()); ok = true; }
        span.style.visibility = ok ? '' : 'hidden';
        // A hidden name must not catch the mouse, or pointing at a neighbour's dot would show this name.
        span.style.pointerEvents = ok ? '' : 'none';
      }
    };
    map.on('zoomend moveend', declutterFlat);
    setTimeout(declutterFlat, 0);
    // Landmark pins appear once zoomed in to city level.
    const lmMarkers = new Map(landmarks.map((lm) => [lm.id, landmarkMarker(lm.lat, lm.lon, lm.name)
      .bindTooltip(esc(lm.name), { permanent: true, direction: 'right', offset: [12, -26], className: 'flat-label' })
      .on('click', () => openLandmark(lm.id))]));
    const pins = L.layerGroup();
    const fillPins = () => {
      pins.clearLayers();
      for (const lm of landmarks) if (inSet(cityById.get(lm.city))) pins.addLayer(lmMarkers.get(lm.id));
    };
    fillPins();
    const syncPins = () => { if (map.getZoom() >= 9) pins.addTo(map); else pins.remove(); };
    map.on('zoomend', syncPins);
    syncPins();

    // Status bar: cursor position and zoom level.
    const readout = $('#readout');
    map.on('mousemove', (e) => { readout.textContent = `${formatCoords(e.latlng.lat, e.latlng.wrap().lng, 4)}   Zoom ${map.getZoom()}`; });

    showFlatNotice(kind, err);

    // Frame a place in the space left free by the card (left) and the landmark strip (bottom).
    const frame = (lat, lon, radiusM) => {
      const desktop = matchMedia('(min-width: 768px)').matches;
      const cardOpen = !kcard.classList.contains('collapsed');
      const left = desktop && cardOpen ? kcard.offsetWidth + 24 : 0;
      const bottom = desktop ? $('#voyager').offsetHeight + 56 : (cardOpen ? kcard.offsetHeight : 0);
      map.flyToBounds(L.latLng(lat, lon).toBounds(radiusM * 2), {
        paddingTopLeft: [left + 16, 80], paddingBottomRight: [72, bottom + 16], animate: !reduced, duration: 1.4,
      });
    };
    // Gold threads on the flat map: the trail of the Lạc ship, a point added every frame.
    const flatThreads = [];
    const flatTrail = () => {
      const line = L.polyline([], { className: 'gold-thread', weight: 3, interactive: false }).addTo(map);
      flatThreads.push(line);
      while (flatThreads.length > 3) flatThreads.shift().remove();
      flatThreads.forEach((x, i) => x.setStyle({ opacity: [0.95, 0.6, 0.32][flatThreads.length - 1 - i] }));
      return { push: (lon, lat) => line.addLatLng([lat, lon]), end: () => {} };
    };
    const metresPerPixel = (lat) => (40_075_016.686 * Math.cos((lat * Math.PI) / 180)) / (256 * 2 ** map.getZoom());
    const flat = {
      turn: (dir) => map.panBy([dir * map.getSize().x * 0.25, 0], { animate: !reduced, duration: 0.6 }),
      trail: flatTrail,
      clearThreads: () => flatThreads.splice(0).forEach((x) => x.remove()),
      // For the ship. On a flat map it moves in straight lines, and its height is shown as a lift on screen.
      linear: true,
      pick: (x, y) => { const ll = map.containerPointToLatLng([x, y]); return { lon: ll.lng, lat: ll.lat }; },
      viewHeight: () => metresPerPixel(map.getCenter().lat) * map.getSize().y,
      onFrame: (cb) => {
        let id = 0;
        const loop = () => { cb(); id = requestAnimationFrame(loop); };
        id = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(id);
      },
      dive: (place, done) => {
        map.once('moveend', done);
        map.flyTo([place.lat, place.lon], Math.min(18, Math.max(map.getZoom() + 2, cityById.has(place.id) ? 13 : 16)), { duration: 0.8, easeLinearity: 0.1 });
      },
      city: (c) => { frame(c.lat, c.lon, 12_000); return reduced ? 0 : 1.4; },
      landmark: (lm) => frame(lm.lat, lm.lon, 700),
      home: () => {
        const h = homeOf();
        // Atlases with "bounds" (Vietnam) are fitted into the space beside the card and above the strip.
        if (h.bounds) {
          const desktop = matchMedia('(min-width: 768px)').matches;
          const cardOpen = !kcard.classList.contains('collapsed');
          map.flyToBounds(h.bounds, {
            paddingTopLeft: [(desktop && cardOpen ? kcard.offsetWidth + 24 : 16), 64],
            paddingBottomRight: [72, desktop ? $('#voyager').offsetHeight + 56 : (cardOpen ? kcard.offsetHeight + 16 : 16)],
            animate: !reduced, duration: 1.2,
          });
        } else map.flyTo([h.lat, h.lon], h.zoom ?? 3, { animate: !reduced });
      },
      zoomIn: () => map.zoomIn(),
      zoomOut: () => map.zoomOut(),
      // Hover never re-runs declutterFlat: the name just gets a dark chip and comes to the front (see .flat-city.hover).
      highlightCity: (id, on) => {
        const m = cityMarkers.get(id);
        m?.getElement()?.querySelector('.flat-city')?.classList.toggle('hover', on);
        m?.setZIndexOffset(on ? 1000 : 0);
      },
      showCities: (ids) => {
        cityMarkers.forEach((m, id) => { if (ids.has(id)) m.addTo(map); else m.remove(); });
        fillPins();
        setTimeout(declutterFlat, 0);
      },
      // ----- Used by the world timeline -----
      look: (c) => map.flyTo([c.lat, c.lon], colById.get(set)?.lookZoom ?? 4, { animate: !reduced }),
      project: (lat, lon, alt = 0) => {
        const p = map.latLngToContainerPoint([lat, lon]);
        p.y -= Math.min(90, alt / metresPerPixel(lat));
        const size = map.getSize();
        return { x: p.x, y: p.y, visible: p.x > -40 && p.y > -40 && p.x < size.x + 40 && p.y < size.y + 40 };
      },
      onViewChange: (cb) => { map.on('move zoom resize', cb); return () => map.off('move zoom resize', cb); },
      setPulse: (ids) => cityMarkers.forEach((m, id) => m.getElement()?.querySelector('.flat-city')?.classList.toggle('pulse', ids.has(id))),
      setCityLabels: (on) => document.body.classList.toggle('hide-city-names', !on),
    };
    // If the globe failed mid-visit, keep showing the place the visitor had selected;
    // otherwise frame the whole atlas.
    const current = decodeURIComponent(location.hash.slice(1)).split('&').find((p) => cityById.has(p) || lmById.has(p));
    if (cityById.has(current)) flat.city(cityById.get(current));
    else if (lmById.has(current)) flat.landmark(lmById.get(current));
    else if (homeOf().bounds) setTimeout(flat.home, 0);
    return flat;
  }

  // -------------------------------------------------------------------------
  // Card renderers
  // -------------------------------------------------------------------------
  function show(html) {
    kcard.innerHTML = `<div class="kcard-scroll">${html}</div>`;
    kcard.classList.remove('collapsed');
    kcard.scrollTop = 0;
  }

  function heroBlock(ref, { back, backLabel }) {
    return `
      <div class="kcard-hero">
        <img src="${esc(imageSrc(ref, media))}" alt="${esc(ref?.alt ?? '')}">
        <div class="kcard-hero-actions">
          ${back ? `<button class="icon-btn on-image" type="button" ${back} aria-label="${esc(backLabel)}">${icon('arrow_back')}</button>` : '<span></span>'}
          <button class="icon-btn on-image" type="button" data-action="close" aria-label="Close panel">${icon('close')}</button>
        </div>
        <span class="kcard-credit">${creditHTML(ref, media)}</span>
      </div>`;
  }

  function renderIntro() {
    const col = colById.get(set) ?? {};
    const row = (c) => `
      <li><button class="place-row city-row" type="button" data-action="city" data-id="${esc(c.id)}">
        <img class="thumb" src="${esc(imageSrc(cityDetails[c.id]?.hero, media))}" alt="" loading="lazy">
        <span class="grow"><span class="city-name">${esc(c.name)}</span>
          <span class="sub">${c.region ? `${esc(c.kind ?? 'Province')} · ${esc(lmById.get(c.landmarks[0])?.name ?? '')}` : `${esc(c.country)} · ${esc(c.continent)}`}</span></span>
        ${icon('chevron_right', 'muted')}
      </button></li>`;
    // Every place is listed, under one section per atlas (World, Vietnam), the atlas on screen first. A place
    // in several atlases (Hà Nội) is listed once, under its most local one. Atlases with groups (Vietnam:
    // North / Central / South) list their places under those headings.
    const homeSet = (c) => collections.filter((k) => inSet(c, k.id)).at(-1)?.id ?? collections[0].id;
    const ordered = [col, ...collections.filter((k) => k.id !== set)];
    const body = ordered.map((k) => {
      const items = cities.filter((c) => homeSet(c) === k.id);
      if (!items.length) return '';
      const groups = k.groups
        ? k.groups.map((g) => {
          const inG = items.filter((c) => c.region === g);
          return inG.length ? `<p class="list-heading mb-0">${esc(g)} · ${inG.length}</p><ul class="place-list">${inG.map(row).join('')}</ul>` : '';
        }).join('')
        : `<ul class="place-list">${items.map(row).join('')}</ul>`;
      return `<h2 class="list-section mb-0">${esc(k.label)} · ${items.length}</h2>${groups}`;
    }).join('');
    show(`
      <div class="intro-head intro-lead">
        <div class="d-flex justify-content-between align-items-start gap-2">
          <p class="intro-kicker mb-1">Explore before you travel</p>
          <button class="icon-btn" type="button" data-action="close" aria-label="Close panel">${icon('close')}</button>
        </div>
        <h1 class="intro-title">${esc(col.title ?? 'Atlas of Stories')}</h1>
        <p class="intro-text mb-3">${esc(col.intro ?? 'History, geography and etiquette for famous places, so you understand a place before you visit it. Choose a city to begin.')}</p>
        <a class="btn-m btn-filled" href="discover.html">${icon('explore')}Find a place for my trip</a>
        ${seasonPicks()}
      </div>
      <hr class="divider">
      ${body}`);
  }

  /** Up to three landmarks in this atlas that are at their best this month, editor's picks first. */
  function seasonPicks() {
    const month = thisMonth();
    const picks = visibleLandmarks().filter((lm) => isGoodMonth(lm, month))
      .sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured))).slice(0, 3);
    if (!picks.length) return '';
    return `
      <p class="t-label muted mt-3 mb-2">${icon('wb_sunny')} Good to visit in ${MONTHS[month - 1]}</p>
      <div class="d-flex flex-wrap gap-2">
        ${picks.map((lm) => `<button type="button" class="chip" data-action="landmark" data-id="${esc(lm.id)}">${esc(lm.name)}</button>`).join('')}
      </div>`;
  }

  /** World / Vietnam buttons. */
  function renderSetSwitch() {
    const icons = { world: icon('public'), vietnam: icon('star') };
    $('#set-switch').innerHTML = collections.map((c) => `
      <button type="button" data-set="${esc(c.id)}" aria-pressed="${c.id === set}">${icons[c.id] ?? icon('map')}<span>${esc(c.label)}</span></button>`).join('');
  }

  function renderCity(c) {
    const d = cityDetails[c.id] ?? {};
    const lms = c.landmarks.map((id) => lmById.get(id)).filter(Boolean);
    show(`
      ${heroBlock(d.hero, { back: 'data-action="intro"', backLabel: 'All cities' })}
      <div class="kcard-body">
        <h2 class="kcard-title mb-1">${esc(c.name)}</h2>
        <p class="muted mb-0">${esc(c.country)} · ${esc(c.continent)}</p>
        <div class="kcard-meta">
          <span>${icon('schedule')}${esc(localTime(c.timezone))}</span>
          <span>${icon('location_on')}${formatCoords(c.lat, c.lon)}</span>
        </div>
        <p class="mt-3 mb-0">${esc(c.tagline)}.</p>
        <div class="kcard-actions">
          <a class="btn-m btn-filled" href="city.html?id=${encodeURIComponent(c.id)}">${icon('menu_book')}City guide</a>
        </div>
      </div>
      <hr class="divider">
      <p class="list-heading mb-0">Landmarks</p>
      <ul class="place-list">
        ${lms.map((lm) => { const s = statusOf(lm); return `
          <li><button class="place-row" type="button" data-action="landmark" data-id="${esc(lm.id)}">
            <img class="thumb" src="${esc(imageSrc(lm.hero, media))}" alt="" loading="lazy">
            <span class="grow"><span class="t-title-s">${esc(lm.name)}</span>
              <span class="sub">${esc(lm.localName ?? '')}</span>
              <span class="sub status ${s.state}">${esc(s.text)}</span></span>
            ${icon('chevron_right', 'muted')}
          </button></li>`; }).join('')}
        ${(d.planned ?? []).map((p) => `
          <li><div class="place-row planned">
            <span class="thumb empty">${icon('hourglass_empty')}</span>
            <span class="grow"><span class="t-title-s">${esc(p.name)}</span><span class="sub">Coming soon</span></span>
          </div></li>`).join('')}
      </ul>`);
  }

  function renderVoyager() {
    $('#voyager').innerHTML = visibleLandmarks().map((lm) => `
      <button class="vcard" type="button" data-landmark="${esc(lm.id)}">
        <img src="${esc(imageSrc(lm.hero, media))}" alt="" loading="lazy">
        <span><strong>${esc(lm.name)}</strong><small>${esc(cityById.get(lm.city).name)}</small></span>
      </button>`).join('');
  }
}

// ---------------------------------------------------------------------------
// Message shown in place of the globe when it can't run
// ---------------------------------------------------------------------------
/** What this browser's graphics can do, checked on a throwaway canvas. */
function graphicsInfo() {
  try {
    const canvas = document.createElement('canvas');
    const gl2 = canvas.getContext('webgl2');
    const gl = gl2 || canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return { webgl: 'none' };
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const info = {
      webgl: gl2 ? 'WebGL 2' : 'WebGL 1',
      gpu: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
      instancing: gl2 || gl.getExtension('ANGLE_instanced_arrays') ? 'yes' : 'no',
      vertexTextures: gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS),
    };
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return info;
  } catch (err) {
    return { webgl: 'error', error: String(err) };
  }
}

/**
 * Small card explaining why the 2D map is shown instead of the 3D globe, how to get 3D back,
 * and copyable technical details. `kind`: 'start' (couldn't start), 'render' (failed while
 * drawing) or 'lost' (graphics reset or ran out of memory).
 */
function showFlatNotice(kind, err) {
  if ($('.flat-notice')) return;
  const gfx = graphicsInfo();
  const noWebgl = gfx.webgl === 'none' || gfx.webgl === 'error';
  const mac = /Macintosh|Mac OS X/.test(navigator.userAgent);

  const title = kind === 'lost' ? 'The 3D globe stopped: the graphics ran out of memory'
    : noWebgl ? '3D isn’t available in this browser'
      : 'The 3D globe can’t run on this device’s graphics';
  const steps = noWebgl ? [
    'Chrome / Edge: Settings → System (and performance) → turn on <em>"Use graphics acceleration when available"</em>.',
    mac ? 'Then quit the browser completely with <strong>⌘ Cmd + Q</strong> and open it again. Closing the window isn’t enough on a Mac.'
      : 'Then close every browser window and open it again.',
    mac ? 'Or open this page in <strong>Safari</strong>, which has its own 3D support.' : 'Or try another browser (Chrome, Edge, Firefox).',
    'Check: <a href="https://get.webgl.org" target="_blank" rel="noopener">get.webgl.org</a> should show a spinning cube.',
  ] : [
    'Update the browser to the latest version.',
    mac ? 'Update macOS (System Settings → General → Software Update).'
      : 'Update the graphics driver (Windows Update → Advanced options → Optional updates).',
    kind === 'start' ? 'Or try another browser.' : 'Or reload the page.',
  ];
  const details = [
    `Problem: ${kind}`,
    `Error: ${err ? String(err.message ?? err).split('\n')[0].slice(0, 300) : '-'}`,
    `Graphics: ${gfx.webgl}${gfx.gpu ? `, ${gfx.gpu}` : ''}`,
    gfx.instancing ? `Instancing: ${gfx.instancing}, vertex textures: ${gfx.vertexTextures}` : '',
    `Browser: ${navigator.userAgent}`,
  ].filter(Boolean).join('\n');

  const el = document.createElement('aside');
  el.className = 'flat-notice floating';
  el.setAttribute('role', 'status');
  el.innerHTML = `
    <div class="d-flex align-items-start gap-2">
      ${icon('info', 'flat-notice-icon')}
      <div class="flex-grow-1">
        <p class="t-title-s mb-0">${title}</p>
        <p class="t-body-s muted mb-2">Showing a 2D satellite map instead. Everything else works the same.</p>
        <div class="d-flex flex-wrap gap-2">
          <button type="button" class="btn-m btn-tonal" data-toggle aria-expanded="false">${icon('help')}How to get 3D</button>
          ${kind === 'start' ? '' : `<button type="button" class="btn-m btn-text" onclick="location.reload()">${icon('refresh')}Reload</button>`}
        </div>
      </div>
      <button type="button" class="icon-btn" data-close aria-label="Hide this message">${icon('close')}</button>
    </div>
    <div class="flat-notice-more" hidden>
      <ol class="t-body-s mt-3 mb-2 ps-3">${steps.map((s) => `<li>${s}</li>`).join('')}</ol>
      <details class="t-body-s">
        <summary>Technical details</summary>
        <pre>${esc(details)}</pre>
        <button type="button" class="btn-m btn-outlined" data-copy>${icon('content_copy')}Copy details</button>
      </details>
    </div>`;
  const more = el.querySelector('.flat-notice-more');
  el.querySelector('[data-toggle]').addEventListener('click', (e) => {
    more.hidden = !more.hidden;
    e.currentTarget.setAttribute('aria-expanded', !more.hidden);
  });
  el.querySelector('[data-close]').addEventListener('click', () => el.remove());
  const copyBtn = el.querySelector('[data-copy]');
  copyBtn.addEventListener('click', () => {
    navigator.clipboard?.writeText(details).then(() => { copyBtn.lastChild.textContent = 'Copied'; }).catch(() => {});
  });
  document.body.append(el);
}

// ---------------------------------------------------------------------------
// Search box (combobox with keyboard support)
// ---------------------------------------------------------------------------
function initSearch({ cities, landmarks, selectCity, selectLandmark }) {
  const input = $('#search');
  const list = $('#search-results');
  const clear = $('#search-clear');
  const fold = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase();
  const cityName = new Map(cities.map((c) => [c.id, c.name]));
  const entries = [
    // Provinces merged in 2025 can also be found by their former names (e.g. "Hà Giang" → Tuyên Quang).
    ...cities.map((c) => ({
      type: 'city', id: c.id, title: c.name,
      sub: `${c.country} · ${c.kind ?? 'City'}${c.formerly?.length ? ` · incl. ${c.formerly.join(', ')}` : ''}`,
      hay: fold(`${c.name} ${c.country} ${c.continent} ${(c.formerly ?? []).join(' ')}`),
    })),
    ...landmarks.map((l) => ({ type: 'landmark', id: l.id, title: l.name, sub: `${cityName.get(l.city)} · Landmark`, hay: fold(`${l.name} ${l.localName ?? ''} ${cityName.get(l.city)}`) })),
  ];
  let results = [];
  let active = -1;

  function render() {
    const q = fold(input.value.trim());
    results = q ? entries.filter((e) => e.hay.includes(q)) : entries.filter((e) => e.type === 'city');
    active = results.length ? 0 : -1;
    list.innerHTML = results.length
      ? results.map((r, i) => `
          <li role="option" id="opt-${i}" aria-selected="${i === active}" data-i="${i}">
            ${icon(r.type === 'city' ? 'location_city' : 'location_on')}
            <span><span>${esc(r.title)}</span><small>${esc(r.sub)}</small></span>
          </li>`).join('')
      : '<li class="empty" role="option" aria-disabled="true">No places match. Try "Kyoto" or "tower".</li>';
    open(true);
    clear.hidden = !input.value;
  }
  function open(on) {
    list.hidden = !on;
    input.setAttribute('aria-expanded', on);
    if (on && active >= 0) input.setAttribute('aria-activedescendant', `opt-${active}`);
    else input.removeAttribute('aria-activedescendant');
  }
  function move(delta) {
    if (!results.length) return;
    active = (active + delta + results.length) % results.length;
    $$('li[role=option]', list).forEach((li, i) => li.setAttribute('aria-selected', i === active));
    input.setAttribute('aria-activedescendant', `opt-${active}`);
    $(`#opt-${active}`)?.scrollIntoView({ block: 'nearest' });
  }
  function choose(i) {
    const r = results[i];
    if (!r) return;
    input.value = r.title;
    open(false);
    input.blur();
    if (r.type === 'city') selectCity(r.id); else selectLandmark(r.id);
  }

  input.addEventListener('focus', render);
  input.addEventListener('input', render);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
    else if (e.key === 'Enter') { e.preventDefault(); choose(active); }
    else if (e.key === 'Escape') { open(false); input.blur(); }
  });
  list.addEventListener('mousedown', (e) => {
    const li = e.target.closest('[data-i]');
    if (li) { e.preventDefault(); choose(Number(li.dataset.i)); }
  });
  input.addEventListener('blur', () => setTimeout(() => open(false), 120));
  clear.addEventListener('click', () => { input.value = ''; clear.hidden = true; input.focus(); });
}

main().catch((err) => console.error(err));
