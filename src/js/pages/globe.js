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
  SceneTransforms, CallbackProperty,
} from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import {
  $, $$, esc, icon, getJSON, loadCities, loadCollections, collectionsOf, loadCity, loadLandmark, loadMedia,
  imageSrc, creditHTML, localTime, formatCoords, prefersReducedMotion, landmarkUrl,
} from '../common.js';
import { openStatus } from '../hours.js';
import { createWorldBar, snapshot, formatYear, periodOf } from '../world-year.js';

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

  // ----- Selection (updates card, view and URL hash) -----
  function selectCity(id, { fly = true } = {}) {
    const c = cityById.get(id);
    if (!c) return;
    if (!inSet(c)) setCollection(collectionsOf(c)[0], { fly: false });
    if (yearMode) exitYearMode({ quiet: true });
    renderCity(c);
    if (fly) nav.city(c);
    writeHash(id);
  }
  function selectLandmark(id, { fly = true } = {}) {
    const lm = lmById.get(id);
    if (!lm) return;
    const c = cityById.get(lm.city);
    if (!inSet(c)) setCollection(collectionsOf(c)[0], { fly: false });
    if (yearMode) exitYearMode({ quiet: true });
    renderLandmark(lm);
    if (fly) nav.landmark(lm);
    writeHash(id);
  }
  function goIntro() {
    renderIntro();
    writeHash();
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
    if (action === 'year-city') focusYearCity(id);
    if (action === 'exit-year') exitYearMode();
  });
  $('#voyager').addEventListener('click', (e) => {
    const b = e.target.closest('[data-landmark]');
    if (b) selectLandmark(b.dataset.landmark);
  });

  // ----- Buttons shared by both views -----
  $('#home-btn').addEventListener('click', () => { if (yearMode) exitYearMode({ quiet: true }); goIntro(); nav.home(); });
  $('#zoom-in').addEventListener('click', () => nav.zoomIn());
  $('#zoom-out').addEventListener('click', () => nav.zoomOut());
  $('#layers-btn').addEventListener('click', (e) => {
    const on = nav.toggleLabels?.();
    if (on !== undefined) e.currentTarget.setAttribute('aria-pressed', on);
  });

  // ----- Search -----
  initSearch({ cities, landmarks, selectCity, selectLandmark });

  // ----- Deep link (#paris, #vietnam&hue, #vietnam&year=1945) -----
  const delay = reduced || !viewer ? 0 : 1800;
  if (hashPlace && cityById.has(hashPlace)) setTimeout(() => selectCity(hashPlace), delay);
  else if (hashPlace) setTimeout(() => selectLandmark(hashPlace), delay);
  else if (hashYear && world) setTimeout(() => enterYearMode(Number(hashYear[1])), delay);

  // ----- Atlas switch buttons -----
  $('#set-switch').addEventListener('click', (e) => {
    const b = e.target.closest('[data-set]');
    if (b) setCollection(b.dataset.set);
  });

  // -------------------------------------------------------------------------
  // "The world in one year": one timeline for the whole globe
  // -------------------------------------------------------------------------
  let bar = null;
  let barSet = null; // which atlas the bar was built for
  let snap = [];
  let cardKey = '';
  let unbindView = null;
  if (!world) yearBtn.hidden = true;
  yearBtn.addEventListener('click', () => (yearMode ? exitYearMode() : enterYearMode()));

  function enterYearMode(year) {
    if (!world) return;
    yearMode = true;
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
    if (!quiet) { renderIntro(); writeHash(); nav.home(); }
  }

  /** Called by the world bar while dragging (final=false) and when a year is settled. */
  function onYear(year, { final, moment }) {
    snap = snapshot(year, visibleCities(), cityDetails, lmById);
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
  function renderWorldCard(year, moment) {
    const key = `${year}|${snap.map((s) => `${s.entry?.year}:${s.landmarks.map((l) => l.state + l.index).join(',')}`).join(';')}|${moment?.title ?? ''}`;
    const heading = $('[data-world-year]', kcard);
    if (heading && kcard.dataset.view === 'world') {
      heading.textContent = formatYear(year, year < -1000);
      $('[data-world-sub]', kcard).textContent = moment?.title ?? periodOf(year, world.periods).label;
      if (kcard.dataset.key === key.slice(key.indexOf('|'))) return; // same content, only the year changed
    }
    const rows = [...snap].sort((a, b) => Number(b.isEvent) - Number(a.isEvent));
    show(`
      <div class="intro-head">
        <div class="d-flex justify-content-between align-items-start gap-2">
          <div>
            <p class="t-label muted mb-1">${icon('history_toggle_off')} Through time</p>
            <h2 class="t-headline mb-0">${esc(colById.get(set)?.yearTitle ?? 'The world in')} <span data-world-year>${esc(formatYear(year, year < -1000))}</span></h2>
          </div>
          <button class="icon-btn" type="button" data-action="exit-year" aria-label="Leave the world timeline">${icon('close')}</button>
        </div>
        <p class="t-body-s muted mt-1 mb-0" data-world-sub>${esc(moment?.title ?? periodOf(year, world.periods).label)}</p>
      </div>
      <hr class="divider">
      <ul class="place-list world-list">
        ${rows.map((s) => `
          <li class="world-row ${s.isEvent ? 'is-event' : ''} ${s.entry ? '' : 'is-empty'}" data-city="${esc(s.city.id)}">
            <button class="place-row" type="button" data-action="year-city" data-id="${esc(s.city.id)}">
              <img class="thumb" src="${esc(entryImage(s))}" alt="" loading="lazy">
              <span class="grow">
                <span class="t-title-s">${esc(s.city.name)}${s.isEvent ? ' <span class="now-badge">This year</span>' : ''}</span>
                <span class="world-text">${s.entry ? esc(s.entry.text) : 'No record in the atlas for this time yet.'}</span>
                ${s.entry ? `<span class="sub">${s.isEvent ? '' : 'Since '}${esc(formatYear(s.entry.year, s.entry.approx))}</span>` : ''}
              </span>
            </button>
            ${s.landmarks.map(({ lm, state, era, index }) => (state === 'era' ? `
              <a class="world-lm" href="${esc(landmarkUrl(lm.id, 'time', { era: index }))}">
                ${icon('history')}<span><strong>${esc(lm.name)}</strong> · ${esc(era.label)}: ${esc(era.title)}</span>${icon('arrow_forward')}
              </a>` : `
              <span class="world-lm future">${icon('hourglass_empty')}<span><strong>${esc(lm.name)}</strong> · its story begins in ${esc(era.label)}</span></span>`)).join('')}
          </li>`).join('')}
      </ul>`);
    kcard.dataset.view = 'world';
    kcard.dataset.key = key.slice(key.indexOf('|'));
  }

  // ----- Floating cards beside each city on the globe / map -----
  function renderYearCards() {
    const key = snap.map((s) => `${s.city.id}:${s.entry?.year}:${s.isEvent}`).join(';');
    if (key === cardKey) return;
    const old = new Map($$('.ycard', cardsEl).map((el) => [el.dataset.city, el.dataset.entry]));
    cardKey = key;
    // On a dense map (34 provinces) only cities with something happening that year get a card.
    const eventsOnly = colById.get(set)?.cards === 'events';
    cardsEl.innerHTML = `<svg class="ycard-lines" aria-hidden="true"></svg>${snap.filter((s) => s.entry && (!eventsOnly || s.isEvent)).map((s) => `
      <button type="button" class="ycard ${s.isEvent ? 'is-event' : ''} ${old.get(s.city.id) && old.get(s.city.id) !== String(s.entry.year) ? 'swap' : ''}"
        data-city="${esc(s.city.id)}" data-entry="${s.entry.year}" tabindex="-1">
        <img src="${esc(entryImage(s))}" alt="">
        <span><strong>${esc(s.city.name)}</strong><small>${esc(s.entry.text)}</small></span>
      </button>`).join('')}`;
    layoutYearCards();
  }

  cardsEl.addEventListener('click', (e) => {
    const c = e.target.closest('.ycard');
    if (c) focusYearCity(c.dataset.city);
  });

  /**
   * Places each card next to its city. Cards are hidden when the city is on the far side of the
   * Earth or under the side card / timeline bar, flipped to the left near the right edge,
   * and nudged apart when they would overlap.
   */
  function layoutYearCards() {
    if (!yearMode || !nav.project) return;
    const els = $$('.ycard', cardsEl);
    // The part of the screen not covered by the side card, the controls or the timeline bar.
    const desktop = innerWidth >= 768;
    const cardBox = !kcard.classList.contains('collapsed') ? kcard.getBoundingClientRect() : null;
    const safe = {
      left: desktop && cardBox ? cardBox.right + 8 : 8,
      right: innerWidth - (desktop ? 64 : 8),
      top: desktop ? 8 : 64,
      bottom: (barEl.hidden ? innerHeight : barEl.getBoundingClientRect().top) - 8,
    };
    const placed = [];
    const items = els.map((el) => {
      const c = cityById.get(el.dataset.city);
      return { el, p: nav.project(c.lat, c.lon) };
    }).filter(({ el, p }) => {
      const show = p.visible && p.x > safe.left && p.x < safe.right && p.y > safe.top && p.y < safe.bottom;
      el.hidden = !show;
      return show;
    }).sort((a, b) => a.p.y - b.p.y);
    let lines = '';
    for (const { el, p } of items) {
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      // Prefer the right of the pin, flip left near the edge, and always stay on screen.
      let left = p.x + 18 + w > safe.right ? p.x - 18 - w : p.x + 18;
      left = Math.min(Math.max(left, safe.left), safe.right - w);
      let top = Math.min(Math.max(p.y - h / 2, safe.top), safe.bottom - h);
      for (const r of placed) {
        const overlapX = left < r.left + r.w && left + w > r.left;
        if (overlapX && top < r.top + r.h + 6 && top + h > r.top - 6) top = r.top + r.h + 6;
      }
      placed.push({ left, top, w, h });
      el.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`;
      const edge = left > p.x ? left : left + w; // the card side facing the pin
      if (Math.abs(top + h / 2 - p.y) > 4) lines += `<line x1="${p.x}" y1="${p.y}" x2="${edge}" y2="${top + h / 2}"/>`;
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

  // Opening move: ease in from deep space, then spin slowly until the user takes over.
  let spinning = !reduced;
  const stopSpin = () => { spinning = false; };
  if (set !== 'world') spinning = false; // a close-up country map shouldn't drift away
  { const h = homeOf(); camera.flyTo({ destination: Cartesian3.fromDegrees(h.lon, h.lat, h.height), duration: reduced ? 0 : 2.2, complete: composeHome }); }
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
    if (id !== hovered) { setHighlight(viewer, hovered, false); setHighlight(viewer, id, true); hovered = id; declutter(); }
    viewer.canvas.style.cursor = id ? 'pointer' : '';
    updateReadout(m.endPosition);
  }, ScreenSpaceEventType.MOUSE_MOVE);
  handler.setInputAction((c) => {
    const id = pickId(c.position);
    if (!id) return;
    const [type, key] = id.split(':');
    if (type === 'city') { if (yearMode) focusYearCity(key); else selectCity(key); } else selectLandmark(key);
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
    const h = homeOf();
    camera.flyTo({ destination: Cartesian3.fromDegrees(h.lon, h.lat, h.height), orientation: { heading: 0, pitch: -CMath.PI_OVER_TWO }, duration: reduced ? 0 : 2, complete: composeHome });
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
  let wantReferenceLabels = colById.get(set)?.referenceLabels !== false;
  labelsLayerPromise.then((layer) => {
    labelsLayer = layer;
    if (layer) layer.show = wantReferenceLabels;
    $('#layers-btn').setAttribute('aria-pressed', Boolean(layer?.show));
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
  // ----- Label decluttering (like Google Earth): hide names that would overlap pins or other names -----
  const projectPoint = (lat, lon) => {
    const p = Cartesian3.fromDegrees(lon, lat);
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
  // Hovered place first, then cities, then provinces; within each, keep the list order (north to south).
  const priority = (c) => (hovered === `city:${c.id}` ? 3 : c.kind === 'City' ? 2 : 1);
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
      // The hovered place and big cities are always named, at least where they don't hide another name.
      if (!side && priority(c) >= 2) side = sides.find((s) => !hits(s.box, placed)) ?? sides[0];
      e.label.show = Boolean(side);
      if (!side) continue;
      e.label.horizontalOrigin = side.h;
      e.label.verticalOrigin = side.v;
      e.label.pixelOffset = new Cartesian2(...side.off);
      placed.push(side.box);
    }
  }
  camera.percentageChanged = 0.01;
  camera.changed.addEventListener(() => { updateReadout(); declutter(); });
  camera.moveEnd.addEventListener(declutter);
  updateReadout();
  declutter();

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
    /** Shows or hides the map's own borders and place names (they would repeat our labels on the Vietnam map). */
    setReferenceLabels: (on) => {
      wantReferenceLabels = on;
      if (labelsLayer) labelsLayer.show = on;
      $('#layers-btn').setAttribute('aria-pressed', on);
    },
    // ----- Used by the world timeline -----
    /** Turns the whole globe to face a city, keeping the rest of the world in view. */
    look: (c) => {
      stopSpin();
      camera.cancelFlight();
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
      if (set !== 'world') stopSpin();
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
      }
    };
    map.on('zoomend moveend', declutterFlat);
    setTimeout(declutterFlat, 0);
    // Landmark pins appear once zoomed in to city level.
    const lmMarkers = new Map(landmarks.map((lm) => [lm.id, landmarkMarker(lm.lat, lm.lon, lm.name)
      .bindTooltip(esc(lm.name), { permanent: true, direction: 'right', offset: [12, -26], className: 'flat-label' })
      .on('click', () => selectLandmark(lm.id))]));
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
    const flat = {
      city: (c) => frame(c.lat, c.lon, 12_000),
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
      showCities: (ids) => {
        cityMarkers.forEach((m, id) => { if (ids.has(id)) m.addTo(map); else m.remove(); });
        fillPins();
        setTimeout(declutterFlat, 0);
      },
      // ----- Used by the world timeline -----
      look: (c) => map.flyTo([c.lat, c.lon], colById.get(set)?.lookZoom ?? 4, { animate: !reduced }),
      project: (lat, lon) => {
        const p = map.latLngToContainerPoint([lat, lon]);
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
    const list = visibleCities();
    const row = (c) => `
      <li><button class="place-row" type="button" data-action="city" data-id="${esc(c.id)}">
        <img class="thumb" src="${esc(imageSrc(cityDetails[c.id]?.hero, media))}" alt="" loading="lazy">
        <span class="grow"><span class="t-title-s">${esc(c.name)}</span>
          <span class="sub">${c.region ? `${esc(c.kind ?? 'Province')} · ${esc(lmById.get(c.landmarks[0])?.name ?? '')}` : `${esc(c.country)} · ${esc(c.continent)}`}</span></span>
        ${icon('chevron_right', 'muted')}
      </button></li>`;
    // Atlases with groups (Vietnam: North / Central / South) list their places under headings.
    const body = col.groups
      ? col.groups.map((g) => {
        const items = list.filter((c) => c.region === g);
        return items.length ? `<p class="list-heading mb-0">${esc(g)} · ${items.length}</p><ul class="place-list">${items.map(row).join('')}</ul>` : '';
      }).join('')
      : `<p class="list-heading mb-0">${list.length} cities</p><ul class="place-list">${list.map(row).join('')}</ul>`;
    show(`
      <div class="intro-head">
        <div class="d-flex justify-content-between align-items-start gap-2">
          <h1 class="t-headline mb-1">${esc(col.title ?? 'Atlas of Stories')}</h1>
          <button class="icon-btn" type="button" data-action="close" aria-label="Close panel">${icon('close')}</button>
        </div>
        <p class="t-body-s muted mb-0">${esc(col.intro ?? 'History, geography and etiquette for famous places, so you understand a place before you visit it. Choose a city to begin.')}</p>
      </div>
      <hr class="divider">
      ${body}`);
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
    const url = (page) => landmarkUrl(lm.id, page);
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
          <a class="btn-m btn-filled" href="${url('time')}">${icon('arrow_forward')}Explore</a>
        </div>
        <div class="kcard-actions mt-2">
          <a class="chip" href="${url('time')}">${icon('history')}Time travel</a>
          <a class="chip" href="${url('story')}">${icon('headphones')}Stories</a>
          <a class="chip" href="${url('guide')}">${icon('directions_walk')}Visit</a>
        </div>
      </div>`);
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
