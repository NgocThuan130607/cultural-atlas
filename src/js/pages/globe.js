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
function createViewer() {
  if (ionToken) Ion.defaultAccessToken = ionToken;
  const viewer = new Viewer('globe', {
    baseLayer: false, // added below
    baseLayerPicker: false, geocoder: false, homeButton: false, sceneModePicker: false,
    navigationHelpButton: false, animation: false, timeline: false, fullscreenButton: false,
    infoBox: false, selectionIndicator: false,
    creditContainer: $('#cesium-credits'),
    useBrowserRecommendedResolution: false, // render at the screen's real pixel density (sharper on HiDPI)
    msaaSamples: 4,
  });
  const { scene } = viewer;
  const globe = scene.globe;
  globe.maximumScreenSpaceError = 1; // load sharper tiles than the default (2)
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

async function addImageryAndTerrain(viewer) {
  const layers = viewer.imageryLayers;
  let labels = null;
  try {
    if (ionToken) {
      layers.add(ImageryLayer.fromWorldImagery());
    } else {
      // Far away: Sentinel-2 cloudless, a true-colour satellite mosaic that stays crisp at whole-globe scale
      // (Esri's small-scale imagery is a soft, relief-shaded composite).
      // Close up: Esri World Imagery (sub-metre detail in cities). The layers hand over at CLOSE_UP_LEVEL.
      const s2 = new UrlTemplateImageryProvider({
        url: EOX_S2, maximumLevel: 14,
        credit: new Credit('<a href="https://s2maps.eu" target="_blank" rel="noopener">Sentinel-2 cloudless</a> by EOX IT Services GmbH (contains modified Copernicus Sentinel data 2021)', true),
      });
      layers.add(new ImageryLayer(s2, { maximumTerrainLevel: CLOSE_UP_LEVEL - 1 }));
      layers.add(new ImageryLayer(await ArcGisMapServerImageryProvider.fromUrl(`${ESRI}/World_Imagery/MapServer`), { minimumTerrainLevel: CLOSE_UP_LEVEL }));
    }
    // Borders and place names, only once zoomed in a little (like Google Earth, the whole-globe view stays clean).
    labels = new ImageryLayer(await ArcGisMapServerImageryProvider.fromUrl(`${ESRI}/Reference/World_Boundaries_and_Places/MapServer`), { minimumTerrainLevel: 4 });
    layers.add(labels);
  } catch {
    // Offline or blocked: fall back to the low-resolution Natural Earth texture bundled with Cesium.
    layers.add(new ImageryLayer(await TileMapServiceImageryProvider.fromUrl(buildModuleUrl('Assets/Textures/NaturalEarthII'))));
  }

  // 3D terrain: Cesium World Terrain with an ion token, otherwise Esri's public elevation service.
  try {
    if (ionToken) viewer.scene.setTerrain(Terrain.fromWorldTerrain());
    else viewer.terrainProvider = await ArcGISTiledElevationTerrainProvider.fromUrl(
      'https://elevation3d.arcgis.com/arcgis/rest/services/WorldElevation3D/Terrain3D/ImageServer');
  } catch { /* flat globe is fine */ }

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

  let viewer;
  try {
    viewer = createViewer();
  } catch (err) {
    console.error(err);
    $('#globe').innerHTML = `<div class="globe-fallback"><div>${icon('public_off')}
      <p class="mt-3">The 3D globe couldn't start on this device (WebGL may be turned off).<br>You can still choose a place from the list.</p></div></div>`;
    return;
  }
  if (import.meta.env.DEV) { // lets dev tools and tests inspect the globe
    window.__viewer = viewer;
    import('cesium').then((m) => { window.__Cesium = m; });
  }
  const labelsLayerPromise = addImageryAndTerrain(viewer);
  await document.fonts?.load(LABEL_FONT).catch(() => {});
  addMarkers(viewer, cities, landmarks);
  const { camera, scene } = viewer;

  // Opening move: ease in from deep space, then spin slowly until the user takes over.
  const reduced = prefersReducedMotion();
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

  // ----- Selection (updates card, camera and URL hash) -----
  function selectCity(id, { fly = true } = {}) {
    const c = cityById.get(id);
    if (!c) return;
    renderCity(c);
    if (fly) flyTo(c.lon, c.lat, 24_000, -42);
    history.replaceState(null, '', `#${id}`);
  }
  function selectLandmark(id, { fly = true } = {}) {
    const lm = lmById.get(id);
    if (!lm) return;
    renderLandmark(lm);
    if (fly) flyTo(lm.lon, lm.lat, 1_600, -28, 15);
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
    if (action === 'intro') { goIntro(); flyHome(); }
    if (action === 'close') kcard.classList.add('collapsed');
    if (action === 'refly') { const c = cityById.get(id); if (c) flyTo(c.lon, c.lat, 24_000, -42); }
  });
  $('#voyager').addEventListener('click', (e) => {
    const b = e.target.closest('[data-landmark]');
    if (b) selectLandmark(b.dataset.landmark);
  });

  // ----- Controls -----
  $('#home-btn').addEventListener('click', () => { goIntro(); flyHome(); });
  $('#zoom-in').addEventListener('click', () => { stopSpin(); camera.zoomIn(camera.positionCartographic.height * 0.45); });
  $('#zoom-out').addEventListener('click', () => { stopSpin(); camera.zoomOut(camera.positionCartographic.height * 0.8); });
  $('#compass').addEventListener('click', () => {
    const center = screenCenter();
    if (!center) return camera.setView({ orientation: { heading: 0, pitch: camera.pitch, roll: 0 } });
    camera.flyToBoundingSphere(new BoundingSphere(center, 1), {
      offset: new HeadingPitchRange(0, camera.pitch, Cartesian3.distance(camera.position, center)), duration: .6,
    });
  });
  $('#tilt-btn').addEventListener('click', () => {
    stopSpin();
    const center = screenCenter();
    if (!center) return;
    const topDown = camera.pitch < CMath.toRadians(-75);
    camera.flyToBoundingSphere(new BoundingSphere(center, 1), {
      offset: new HeadingPitchRange(camera.heading, CMath.toRadians(topDown ? -35 : -90), Cartesian3.distance(camera.position, center)),
      duration: 1,
    });
  });
  labelsLayerPromise.then((layer) => {
    $('#layers-btn').addEventListener('click', (e) => {
      if (!layer) return;
      layer.show = !layer.show;
      e.currentTarget.setAttribute('aria-pressed', layer.show);
    });
  });

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

  // ----- Search -----
  initSearch({ cities, landmarks, selectCity, selectLandmark });

  // ----- Deep link (#paris, #eiffel-tower) -----
  const hash = decodeURIComponent(location.hash.slice(1));
  if (cityById.has(hash)) setTimeout(() => selectCity(hash), reduced ? 0 : 1800);
  else if (lmById.has(hash)) setTimeout(() => selectLandmark(hash), reduced ? 0 : 1800);

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
