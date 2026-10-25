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
} from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import {
  $, $$, esc, icon, loadCities, loadCity, loadLandmark, loadMedia, imageSrc, creditHTML,
  localTime, formatCoords, prefersReducedMotion,
} from '../common.js';
import { openStatus } from '../hours.js';

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
const label = (text, offsetX) => ({
  text, font: LABEL_FONT, fillColor: Color.WHITE, outlineColor: Color.fromCssColorString('rgba(0,0,0,.75)'), outlineWidth: 4,
  style: LabelStyle.FILL_AND_OUTLINE, horizontalOrigin: HorizontalOrigin.LEFT, verticalOrigin: VerticalOrigin.CENTER,
  pixelOffset: new Cartesian2(offsetX, 0), heightReference: HeightReference.CLAMP_TO_GROUND, disableDepthTestDistance: 2e6,
});

function addMarkers(viewer, cities, landmarks) {
  for (const c of cities) {
    viewer.entities.add({
      id: `city:${c.id}`,
      position: Cartesian3.fromDegrees(c.lon, c.lat),
      billboard: {
        image: cityPin(), width: 28, height: 28, heightReference: HeightReference.CLAMP_TO_GROUND,
        disableDepthTestDistance: 2e6, scaleByDistance: new NearFarScalar(1e6, 1.1, 2e7, .85),
        distanceDisplayCondition: new DistanceDisplayCondition(60_000, Number.POSITIVE_INFINITY),
      },
      label: { ...label(c.name, 18), distanceDisplayCondition: new DistanceDisplayCondition(60_000, Number.POSITIVE_INFINITY) },
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

function setHighlight(viewer, entityId, on) {
  const e = entityId && viewer.entities.getById(entityId);
  if (!e) return;
  e.billboard.image = entityId.startsWith('city:') ? cityPin(on) : landmarkPin(on);
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

  const kcard = $('#kcard');
  renderIntro();
  renderVoyager();

  const reduced = prefersReducedMotion();

  // `nav` moves the view: the 3D globe when WebGL works, otherwise a 2D satellite map.
  // Everything else (card, search, landmark strip, buttons) works the same with either.
  let nav = null;
  let viewer = null;
  let startError = null;
  try {
    viewer = createViewer();
  } catch (err) {
    console.error(err);
    startError = err;
  }
  nav = viewer ? await startGlobe(viewer) : await startFlatMap('start', startError);

  // ----- Selection (updates card, view and URL hash) -----
  function selectCity(id, { fly = true } = {}) {
    const c = cityById.get(id);
    if (!c) return;
    renderCity(c);
    if (fly) nav.city(c);
    history.replaceState(null, '', `#${id}`);
  }
  function selectLandmark(id, { fly = true } = {}) {
    const lm = lmById.get(id);
    if (!lm) return;
    renderLandmark(lm);
    if (fly) nav.landmark(lm);
    history.replaceState(null, '', `#${id}`);
  }
  function goIntro() {
    renderIntro();
    history.replaceState(null, '', location.pathname + location.search);
  }

  // ----- Knowledge card events -----
  kcard.addEventListener('click', (e) => {
    const t = e.target.closest('[data-action]');
    if (!t) return;
    const { action, id } = t.dataset;
    if (action === 'city') selectCity(id);
    if (action === 'landmark') selectLandmark(id);
    if (action === 'intro') { goIntro(); nav.home(); }
    if (action === 'close') kcard.classList.add('collapsed');
    if (action === 'refly') { const c = cityById.get(id); if (c) nav.city(c); }
  });
  $('#voyager').addEventListener('click', (e) => {
    const b = e.target.closest('[data-landmark]');
    if (b) selectLandmark(b.dataset.landmark);
  });

  // ----- Buttons shared by both views -----
  $('#home-btn').addEventListener('click', () => { goIntro(); nav.home(); });
  $('#zoom-in').addEventListener('click', () => nav.zoomIn());
  $('#zoom-out').addEventListener('click', () => nav.zoomOut());
  $('#layers-btn').addEventListener('click', (e) => {
    const on = nav.toggleLabels?.();
    if (on !== undefined) e.currentTarget.setAttribute('aria-pressed', on);
  });

  // ----- Search -----
  initSearch({ cities, landmarks, selectCity, selectLandmark });

  // ----- Deep link (#paris, #eiffel-tower) -----
  const hash = decodeURIComponent(location.hash.slice(1));
  const delay = reduced || !viewer ? 0 : 1800;
  if (cityById.has(hash)) setTimeout(() => selectCity(hash), delay);
  else if (lmById.has(hash)) setTimeout(() => selectLandmark(hash), delay);

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

  // Opening move: ease in from deep space, then spin slowly until the user takes over.
  let spinning = !reduced;
  const stopSpin = () => { spinning = false; };
  camera.flyTo({ destination: Cartesian3.fromDegrees(HOME.lon, HOME.lat, HOME.height), duration: reduced ? 0 : 2.2, complete: composeHome });
  viewer.clock.onTick.addEventListener(() => { if (spinning) camera.rotate(Cartesian3.UNIT_Z, -0.0005); });
  ['pointerdown', 'wheel', 'touchstart'].forEach((ev) => viewer.canvas.addEventListener(ev, stopSpin, { passive: true }));

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
    if (id !== hovered) { setHighlight(viewer, hovered, false); setHighlight(viewer, id, true); hovered = id; }
    viewer.canvas.style.cursor = id ? 'pointer' : '';
    updateReadout(m.endPosition);
  }, ScreenSpaceEventType.MOUSE_MOVE);
  handler.setInputAction((c) => {
    const id = pickId(c.position);
    if (!id) return;
    const [type, key] = id.split(':');
    if (type === 'city') selectCity(key); else selectLandmark(key);
  }, ScreenSpaceEventType.LEFT_CLICK);

  // ----- Camera moves -----
  function flyTo(lon, lat, range, pitchDeg, headingDeg = 0) {
    stopSpin();
    camera.cancelFlight();
    camera.flyToBoundingSphere(new BoundingSphere(Cartesian3.fromDegrees(lon, lat), 200), {
      offset: new HeadingPitchRange(CMath.toRadians(headingDeg), CMath.toRadians(pitchDeg), range),
      duration: reduced ? 0 : undefined, // Cesium picks a natural duration from the distance
      maximumHeight: range > 100_000 ? undefined : 3_000_000,
      complete: composeHome,
    });
  }
  function flyHome() {
    camera.cancelFlight();
    camera.flyTo({ destination: Cartesian3.fromDegrees(HOME.lon, HOME.lat, HOME.height), orientation: { heading: 0, pitch: -CMath.PI_OVER_TWO }, duration: reduced ? 0 : 2, complete: composeHome });
  }

  // Centre the view in the space left free by the card (left) and the landmark strip (bottom),
  // by turning the camera slightly rather than moving it. The turn is eased over a few frames.
  function composeHome() {
    const w = scene.canvas.clientWidth;
    const h = scene.canvas.clientHeight;
    const fov = camera.frustum.fov; // horizontal when the screen is wider than tall
    const focal = (w >= h ? w : h) / 2 / Math.tan(fov / 2);
    const desktop = matchMedia('(min-width: 768px)').matches;
    const cardOpen = !kcard.classList.contains('collapsed');
    const dx = desktop && cardOpen ? (kcard.offsetWidth + 12) / 2 : 0;
    const dy = desktop ? ($('#voyager').offsetHeight + 40) / 2 : (cardOpen ? kcard.offsetHeight / 2 : 0);
    const ax = Math.atan(dx / focal);
    const ay = Math.atan(dy / focal);
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

  // ----- Globe-only controls -----
  $('#compass').addEventListener('click', () => {
    if (failed) return;
    const center = screenCenter();
    if (!center) return camera.setView({ orientation: { heading: 0, pitch: camera.pitch, roll: 0 } });
    camera.flyToBoundingSphere(new BoundingSphere(center, 1), {
      offset: new HeadingPitchRange(0, camera.pitch, Cartesian3.distance(camera.position, center)), duration: .6,
    });
  });
  $('#tilt-btn').addEventListener('click', () => {
    if (failed) return;
    stopSpin();
    const center = screenCenter();
    if (!center) return;
    const topDown = camera.pitch < CMath.toRadians(-75);
    camera.flyToBoundingSphere(new BoundingSphere(center, 1), {
      offset: new HeadingPitchRange(camera.heading, CMath.toRadians(topDown ? -35 : -90), Cartesian3.distance(camera.position, center)),
      duration: 1,
    });
  });
  let labelsLayer = null;
  labelsLayerPromise.then((layer) => { labelsLayer = layer; });

  function screenCenter() {
    const c = new Cartesian2(scene.canvas.clientWidth / 2, scene.canvas.clientHeight / 2);
    const ray = camera.getPickRay(c);
    return (ray && scene.globe.pick(ray, scene)) ?? camera.pickEllipsoid(c);
  }

  // ----- Compass, tilt label and status-bar readout -----
  const compassIcon = $('#compass .ms');
  const tiltLabel = $('#tilt-btn .tilt-label');
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
  let lastHeading = null;
  scene.postRender.addEventListener(() => {
    const heading = camera.heading;
    if (lastHeading === null || Math.abs(heading - lastHeading) > 0.002) {
      compassIcon.style.transform = `rotate(${-heading}rad)`;
      lastHeading = heading;
    }
    tiltLabel.textContent = camera.pitch < CMath.toRadians(-75) ? '3D' : '2D';
  });
  camera.percentageChanged = 0.01;
  camera.changed.addEventListener(() => updateReadout());
  updateReadout();

  return {
    city: (c) => flyTo(c.lon, c.lat, 24_000, -42),
    landmark: (lm) => flyTo(lm.lon, lm.lat, 1_600, -28, 15),
    home: flyHome,
    zoomIn: () => { stopSpin(); camera.zoomIn(camera.positionCartographic.height * 0.45); },
    zoomOut: () => { stopSpin(); camera.zoomOut(camera.positionCartographic.height * 0.8); },
    toggleLabels: () => {
      if (!labelsLayer) return undefined;
      labelsLayer.show = !labelsLayer.show;
      return labelsLayer.show;
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
    const map = createMap(holder, { lat: 25, lon: 40, zoom: 3, minZoom: 2, style: 'satellite', zoomButtons: false });

    // City dots with names, like on the globe.
    for (const c of cities) {
      L.marker([c.lat, c.lon], {
        title: c.name, alt: c.name, riseOnHover: true, keyboard: true,
        icon: L.divIcon({ className: '', html: `<span class="flat-city"><i></i>${esc(c.name)}</span>`, iconSize: [0, 0], iconAnchor: [9, 9] }),
      }).on('click', () => selectCity(c.id)).addTo(map);
    }
    // Landmark pins appear once zoomed in to city level.
    const pins = L.layerGroup(landmarks.map((lm) => landmarkMarker(lm.lat, lm.lon, lm.name)
      .bindTooltip(esc(lm.name), { permanent: true, direction: 'right', offset: [12, -26], className: 'flat-label' })
      .on('click', () => selectLandmark(lm.id))));
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
    const flat = {
      city: (c) => frame(c.lat, c.lon, 12_000),
      landmark: (lm) => frame(lm.lat, lm.lon, 700),
      home: () => map.flyTo([25, 40], 3, { animate: !reduced }),
      zoomIn: () => map.zoomIn(),
      zoomOut: () => map.zoomOut(),
    };
    // If the globe failed mid-visit, keep showing the place the visitor had selected.
    const current = decodeURIComponent(location.hash.slice(1));
    if (cityById.has(current)) flat.city(cityById.get(current));
    else if (lmById.has(current)) flat.landmark(lmById.get(current));
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
    show(`
      <div class="intro-head">
        <div class="d-flex justify-content-between align-items-start gap-2">
          <h1 class="t-headline mb-1">Atlas of Stories</h1>
          <button class="icon-btn" type="button" data-action="close" aria-label="Close panel">${icon('close')}</button>
        </div>
        <p class="t-body-s muted mb-0">History, geography and etiquette for famous places, so you understand a place before you visit it. Choose a city to begin.</p>
      </div>
      <hr class="divider">
      <p class="list-heading mb-0">${cities.length} cities</p>
      <ul class="place-list">
        ${cities.map((c) => `
          <li><button class="place-row" type="button" data-action="city" data-id="${esc(c.id)}">
            <img class="thumb" src="${esc(imageSrc(cityDetails[c.id]?.hero, media))}" alt="" loading="lazy">
            <span class="grow"><span class="t-title-s">${esc(c.name)}</span><span class="sub">${esc(c.country)} · ${esc(c.continent)}</span></span>
            ${icon('chevron_right', 'muted')}
          </button></li>`).join('')}
      </ul>`);
  }

  function renderCity(c) {
    const d = cityDetails[c.id] ?? {};
    const lms = c.landmarks.map((id) => lmById.get(id)).filter(Boolean);
    show(`
      ${heroBlock(d.hero, { back: 'data-action="intro"', backLabel: 'All cities' })}
      <div class="kcard-body">
        <h2 class="t-headline mb-0">${esc(c.name)}</h2>
        <p class="muted mb-0">${esc(c.country)} · ${esc(c.continent)}</p>
        <div class="kcard-meta">
          <span>${icon('schedule')}${esc(localTime(c.timezone))}</span>
          <span>${icon('location_on')}${formatCoords(c.lat, c.lon)}</span>
        </div>
        <p class="mt-3 mb-0">${esc(c.tagline)}.</p>
        <div class="kcard-actions">
          <a class="btn-m btn-filled" href="city.html?id=${encodeURIComponent(c.id)}">${icon('menu_book')}City guide</a>
          <button class="btn-m btn-outlined" type="button" data-action="refly" data-id="${esc(c.id)}">${icon('my_location')}Fly here</button>
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

  function renderLandmark(lm) {
    const c = cityById.get(lm.city);
    const s = statusOf(lm);
    const url = `landmark.html?id=${encodeURIComponent(lm.id)}`;
    show(`
      ${heroBlock(lm.hero, { back: `data-action="city" data-id="${esc(c.id)}"`, backLabel: `Back to ${c.name}` })}
      <div class="kcard-body">
        <p class="t-label muted mb-1">${esc(c.name)}, ${esc(c.country)}</p>
        <h2 class="t-headline mb-0">${esc(lm.name)}</h2>
        <p class="muted mb-0">${esc(lm.localName ?? '')}</p>
        <div class="kcard-meta">
          <span class="status ${s.state}">${esc(s.text)}</span>
          <span>${icon('location_on')}${formatCoords(lm.lat, lm.lon, 4)}</span>
        </div>
        <p class="mt-3 mb-0">${esc(lm.summary)}</p>
        <div class="kcard-actions">
          <a class="btn-m btn-filled" href="${url}">${icon('arrow_forward')}Explore</a>
        </div>
        <div class="kcard-actions mt-2">
          <a class="chip" href="${url}#time">${icon('history')}Time travel</a>
          <a class="chip" href="${url}#story">${icon('headphones')}Stories</a>
          <a class="chip" href="${url}#guide">${icon('directions_walk')}Visit</a>
        </div>
      </div>`);
  }

  function renderVoyager() {
    $('#voyager').innerHTML = landmarks.map((lm) => `
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
    ...cities.map((c) => ({ type: 'city', id: c.id, title: c.name, sub: `${c.country} · City`, hay: fold(`${c.name} ${c.country} ${c.continent}`) })),
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
