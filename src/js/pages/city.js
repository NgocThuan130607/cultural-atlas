// City page: a content panel (left) beside a satellite map of the city's landmarks (right).
import {
  $, $$, esc, icon, param, loadCities, loadCity, loadLandmark, loadMedia, imageSrc, creditHTML,
  creditsBlock, localTime, formatCoords, showError,
} from '../common.js';
import { openStatus } from '../hours.js';
import { createMap, landmarkMarker, L } from '../map.js';

async function main() {
  const id = param('id');
  const [cities, media] = await Promise.all([loadCities(), loadMedia()]);
  const city = cities.find((c) => c.id === id);
  if (!city) return showError(`There's no city called "${id ?? ''}" in the atlas yet.`);

  const detail = await loadCity(id);
  const landmarks = (await Promise.all(city.landmarks.map((lid) => loadLandmark(lid).catch(() => null)))).filter(Boolean);
  document.title = `${city.name} · Atlas of Stories`;
  $('#back-btn').href = `index.html#${encodeURIComponent(city.id)}`;

  const section = (s) => `
    <section class="panel-section prose" aria-labelledby="sec-${esc(s.id)}">
      <h2 id="sec-${esc(s.id)}">${esc(s.title)}</h2>
      <p>${esc(s.text)}</p>
    </section>`;

  $('#panel').innerHTML = `
    <div class="panel-hero">
      <img src="${esc(imageSrc(detail.hero, media))}" alt="${esc(detail.hero.alt ?? '')}">
      <span class="credit">${creditHTML(detail.hero, media)}</span>
    </div>
    <header class="panel-section">
      <p class="crumb mb-1"><a href="index.html#${esc(city.id)}">Globe</a> › ${esc(city.continent)}</p>
      <h1 class="t-display mb-1">${esc(city.name)}</h1>
      <p class="muted mb-3">${esc(city.country)}</p>
      <div class="meta-row">
        <span>${icon('schedule')}<span id="city-time">${esc(localTime(city.timezone))}</span></span>
        <span>${icon('location_on')}${formatCoords(city.lat, city.lon)}</span>
      </div>
      <p class="mt-3 mb-0">${esc(city.tagline)}.</p>
    </header>

    <section class="panel-section px-0" aria-labelledby="lm-title">
      <h2 id="lm-title" class="px-4 mb-1">Landmarks</h2>
      <ul class="place-list">
        ${landmarks.map((lm) => { const s = openStatus(lm.guide.hours, city.timezone); return `
          <li><a class="place-row px-4" href="landmark.html?id=${encodeURIComponent(lm.id)}" data-lm="${esc(lm.id)}">
            <img class="thumb" src="${esc(imageSrc(lm.hero, media))}" alt="" loading="lazy">
            <span class="grow"><span class="t-title-s">${esc(lm.name)}</span>
              <span class="sub">${esc(lm.localName ?? '')}</span>
              <span class="sub status ${s.state}">${esc(s.text)}</span></span>
            ${icon('chevron_right', 'muted')}
          </a></li>`; }).join('')}
        ${(detail.planned ?? []).map((p) => `
          <li><div class="place-row planned px-4">
            <span class="thumb empty">${icon('hourglass_empty')}</span>
            <span class="grow"><span class="t-title-s">${esc(p.name)}</span><span class="sub">Coming soon · ${esc(p.blurb)}</span></span>
          </div></li>`).join('')}
      </ul>
    </section>

    ${detail.sections.map(section).join('')}

    <section class="panel-section" aria-labelledby="facts-title">
      <h2 id="facts-title">Good to know</h2>
      <dl class="facts">
        <dt>Language</dt><dd>${esc(detail.facts.languages)}</dd>
        <dt>Currency</dt><dd>${esc(detail.facts.currency)}</dd>
        <dt>Best time</dt><dd>${esc(detail.facts.bestTime)}</dd>
        <dt>Founded</dt><dd>${esc(detail.facts.founded)}</dd>
        <dt>Time zone</dt><dd>${esc(city.timezone.replaceAll('_', ' '))}</dd>
      </dl>
    </section>

    <section class="panel-section" aria-labelledby="etq-title">
      <h2 id="etq-title">Local etiquette</h2>
      <ul class="check-list">
        ${detail.etiquette.map((t) => `<li class="do">${icon('check_circle')}<span>${esc(t)}</span></li>`).join('')}
      </ul>
    </section>
    ${creditsBlock('Opening hours are approximate. Always check official sources before you travel.')}`;

  // Satellite map of the landmarks.
  $('#viewport').innerHTML = '<div class="map-fill" id="city-map" role="region" aria-label="Satellite map"></div>';
  const map = createMap($('#city-map'), { lat: city.lat, lon: city.lon, zoom: 13, style: 'satellite' });
  const markers = new Map();
  for (const lm of landmarks) {
    const m = landmarkMarker(lm.lat, lm.lon, lm.name)
      .bindPopup(`<strong>${esc(lm.name)}</strong><br><a href="landmark.html?id=${encodeURIComponent(lm.id)}">Explore</a>`)
      .addTo(map);
    markers.set(lm.id, m);
  }
  if (landmarks.length > 1) map.fitBounds(L.latLngBounds(landmarks.map((l) => [l.lat, l.lon])).pad(0.3));
  else if (landmarks.length === 1) map.setView([landmarks[0].lat, landmarks[0].lon], 16);

  // Hovering a landmark in the list highlights it on the map.
  $$('[data-lm]').forEach((row) => {
    const m = markers.get(row.dataset.lm);
    row.addEventListener('mouseenter', () => { m?.getElement()?.firstElementChild?.classList.add('highlight'); m?.openPopup(); });
    row.addEventListener('mouseleave', () => m?.getElement()?.firstElementChild?.classList.remove('highlight'));
  });

  setInterval(() => { $('#city-time').textContent = localTime(city.timezone); }, 30_000);
}

main().catch((err) => { console.error(err); showError('Something went wrong while loading this city.'); });
