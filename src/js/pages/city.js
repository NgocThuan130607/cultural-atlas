// City page, as a deck of slides (fifth round of user feedback, see slides.js):
// 1. the city's photo filling the screen, its name in a beige frame and a sand card with the essentials;
// 2. the map of landmarks with the list of places overlapping it;
// 3–5. Geography, History and Culture, each with its own photo, alternating sides and light / dark;
// 6. good to know: quick facts and local etiquette.
import {
  $, $$, esc, icon, param, loadCities, loadCity, loadLandmark, loadMedia, imageSrc, creditHTML,
  creditsBlock, localTime, formatCoords, showError, landmarkUrl, protoNote,
} from '../common.js';
import { openStatus } from '../hours.js';
import { createMap, landmarkMarker, L } from '../map.js';
import { saveButton } from '../trip.js';
import { seasonBadge } from '../season.js';
import { slide, deckHTML, photo, titleFrame, bigNumber, makeDeck } from '../slides.js';
import { motifLayer } from '../motifs.js';

/** A paragraph whose first sentence is set slightly larger, to lead the eye into the text. */
function leadParagraph(text) {
  const m = text.match(/^(.+?[.!?])\s+(.+)$/s);
  return m ? `<p><span class="lead-sentence">${esc(m[1])}</span> ${esc(m[2])}</p>` : `<p>${esc(text)}</p>`;
}
const num = (n) => String(n).padStart(2, '0');

async function main() {
  const id = param('id');
  const [cities, media] = await Promise.all([loadCities(), loadMedia()]);
  const city = cities.find((c) => c.id === id);
  if (!city) return showError(`There's no city called "${id ?? ''}" in the atlas yet.`);

  const detail = await loadCity(id);
  const landmarks = (await Promise.all(city.landmarks.map((lid) => loadLandmark(lid).catch(() => null)))).filter(Boolean);
  document.title = `${city.name} · Atlas of Stories`;
  $('#back-btn').href = `index.html#${encodeURIComponent(city.id)}`;

  // Photos for Geography, History and Culture. A section can name its own "image"; otherwise one is
  // borrowed from the flagship landmark, never repeating the hero or another section's photo.
  const used = new Set([detail.hero.file]);
  const lm0 = landmarks[0];
  // Wide photos first: a tall one cropped to a wide frame would show only a slice (often just sky).
  const wide = (x) => { const m = media[x.file?.replace(/_/g, ' ')]; return m?.width && m.width / m.height >= 1.25; };
  const take = (...refs) => {
    const free = refs.flat().filter((x) => (x?.file ? !used.has(x.file) && imageSrc(x, media) : x?.src));
    const ref = free.find((x) => x.src || wide(x)) ?? free[0];
    if (ref?.file) used.add(ref.file);
    return ref ?? null;
  };
  const pool = lm0 ? [lm0.hero, ...lm0.eras.map((e) => e.image).reverse(), ...lm0.story.map((c) => c.image)] : [];
  const pick = {
    history: () => take(lm0?.eras.slice(0, -1).map((e) => e.image) ?? [], pool), // oldest eras first
    culture: () => take(lm0?.story.filter((c) => c.type === 'culture').map((c) => c.image) ?? [], lm0?.story.map((c) => c.image) ?? [], pool),
    geography: () => take(pool),
  };
  const sectionImages = Object.fromEntries(['history', 'culture', 'geography'].map((k) => {
    const own = detail.sections.find((x) => x.id === k)?.image;
    if (own?.file) used.add(own.file);
    return [k, own ?? pick[k]?.()];
  }));
  const imageOf = (s) => s.image ?? sectionImages[s.id] ?? detail.hero;
  const extra = take(pool) ?? detail.hero; // for the "Good to know" slide

  // ---------- 1. Cover ----------
  const cover = slide({
    id: 'overview', title: 'Overview', tone: 'dark', layout: 'cover-full', label: 'city-title', bg: esc(imageSrc(detail.hero, media)),
    body: `
      ${motifLayer(detail.motifs?.cover)}
      <figure class="s-fill">
        <img data-parallax src="${esc(imageSrc(detail.hero, media))}" alt="${esc(detail.hero.alt ?? '')}">
        <figcaption class="s-credit">${creditHTML(detail.hero, media)}</figcaption>
      </figure>
      <div class="s-col">
      ${titleFrame(`
        <p class="crumb mb-3"><a href="index.html#${esc(city.id)}">Globe</a> › ${esc(city.continent)}</p>
        <h1 id="city-title" class="s-title ${city.name.length > 20 ? 'long' : ''}">${esc(city.name)}</h1>
        <p class="title-sub mb-0">${esc(city.country)}</p>`)}
      <div class="s-sand" data-reveal data-drift style="--d:2">
        <p class="lead-text">${esc(city.tagline)}.</p>
        <div class="meta-row mb-3">
          <span>${icon('schedule')}<span id="city-time">${esc(localTime(city.timezone))}</span></span>
          <span>${icon('location_on')}${formatCoords(city.lat, city.lon)}</span>
        </div>
        <div class="d-flex flex-wrap align-items-center gap-2">
          <button type="button" class="btn-m btn-dark" data-deck-go="next">Start exploring${icon('arrow_forward')}</button>
          ${lm0 ? seasonBadge(lm0) : ''}
        </div>
      </div>
      </div>`,
  });

  // ---------- 2. Landmarks on the map ----------
  const mapSlide = slide({
    id: 'ch-landmarks', title: 'Landmarks', tone: 'light', layout: 'map', label: 'lm-title', bg: esc(imageSrc(detail.hero, media)),
    body: `
      ${motifLayer(detail.motifs?.map)}
      <div class="s-col">
      ${titleFrame(`
        <p class="kicker">${esc(city.name)} · On the map</p>
        <h2 id="lm-title" class="s-title-m mb-0">Landmarks</h2>`)}
      <div class="s-card s-list" data-reveal data-drift style="--d:2">
        <ul class="place-list">
          ${landmarks.map((lm) => { const st = openStatus(lm.guide.hours, city.timezone); return `
            <li class="place-item"><a class="place-row" href="${landmarkUrl(lm.id)}" data-lm="${esc(lm.id)}">
              <img class="thumb" src="${esc(imageSrc(lm.hero, media))}" alt="" loading="lazy">
              <span class="grow"><span class="t-title-s">${esc(lm.name)}</span>
                <span class="sub">${esc(lm.localName ?? '')}</span>
                <span class="sub status ${st.state}">${esc(st.text)}</span></span>
            </a>${saveButton(lm, 'icon')}</li>`; }).join('')}
          ${(detail.planned ?? []).map((p) => `
            <li><div class="place-row planned">
              <span class="thumb empty">${icon('hourglass_empty')}</span>
              <span class="grow"><span class="t-title-s">${esc(p.name)}</span><span class="sub">Coming soon · ${esc(p.blurb)}</span></span>
            </div></li>`).join('')}
        </ul>
        ${detail.planned?.length ? protoNote('only one landmark per place is built in this prototype. The landmarks marked "Coming soon" would get the same Time travel, Stories and Visit pages in the full version.', 'mt-2 mb-0') : ''}
      </div>
      </div>
      <div class="s-map" data-reveal style="--d:1"><div class="map-fill" id="city-map" role="region" aria-label="Satellite map of ${esc(city.name)}'s landmarks"></div></div>`,
  });

  // ---------- 3–5. Geography, History, Culture ----------
  const sections = detail.sections.map((s, i) => slide({
    id: `ch-${esc(s.id)}`, title: esc(s.title), tone: i % 2 ? 'light' : 'dark', flip: i % 2 === 0, label: `sec-${esc(s.id)}`,
    bg: esc(imageSrc(imageOf(s), media)),
    body: `
      ${motifLayer(s.motifs)}
      <div class="s-col">
      ${titleFrame(`
        <p class="kicker">${esc(city.name)}</p>
        <h2 id="sec-${esc(s.id)}" class="s-title-m mb-0">${esc(s.title)}</h2>`)}
      <div class="s-card" data-reveal data-drift style="--d:2">${leadParagraph(s.text)}</div>
      ${bigNumber(num(i + 3))}
      </div>
      ${photo(esc(imageSrc(imageOf(s), media)), esc(imageOf(s).alt ?? ''), creditHTML(imageOf(s), media))}`,
  }));

  // ---------- 6. Good to know ----------
  const facts = [
    // Icon names are written out in full so the icon font loader (vite.config.js) finds them.
    [icon('wb_sunny'), 'Best time to visit', detail.facts.bestTime],
    [icon('translate'), 'Language', detail.facts.languages],
    [icon('payments'), 'Currency', detail.facts.currency],
    [icon('schedule'), 'Time zone', city.timezone.replaceAll('_', ' ')],
    [icon('history_edu'), 'Founded', detail.facts.founded],
  ];
  const know = slide({
    id: 'ch-good-to-know', title: 'Good to know', tone: detail.sections.length % 2 ? 'light' : 'dark', layout: 'know', label: 'know-title',
    bg: esc(imageSrc(extra, media)),
    body: `
      ${motifLayer(detail.motifs?.know)}
      <div class="s-col">
      ${titleFrame(`
        <p class="kicker">Before you go</p>
        <h2 id="know-title" class="s-title-m mb-0">Good to know</h2>`)}
      <ul class="glance s-glance">
        ${facts.map(([ic, k, v], i) => `<li data-reveal style="--d:${i + 1}">${ic}<span><small>${k}</small>${esc(v)}</span></li>`).join('')}
      </ul>
      </div>
      ${photo(esc(imageSrc(extra, media)), esc(extra.alt ?? ''), creditHTML(extra, media))}
      <div class="s-card" data-reveal data-drift style="--d:3">
        <h3 class="s-card-title">Local etiquette</h3>
        <ul class="check-list">
          ${detail.etiquette.map((t) => `<li class="do">${icon('check')}<span>${esc(t)}</span></li>`).join('')}
        </ul>
      </div>`,
  });

  $('#panel').innerHTML = deckHTML([cover, mapSlide, ...sections, know]);
  $('.deck-after').innerHTML = `<div class="wrap">${creditsBlock('Opening hours are approximate. Always check official sources before you travel.')}</div>`;

  // ---------- Map of the landmarks ----------
  const map = createMap($('#city-map'), { lat: city.lat, lon: city.lon, zoom: 13, style: 'satellite' });
  map.scrollWheelZoom.disable(); // the mouse wheel moves the slides; zoom with the buttons or by pinching
  const markers = new Map();
  for (const lm of landmarks) {
    const m = landmarkMarker(lm.lat, lm.lon, lm.name)
      .bindPopup(`<strong>${esc(lm.name)}</strong><br><a href="${landmarkUrl(lm.id)}">Explore</a>`)
      .addTo(map);
    markers.set(lm.id, m);
  }
  const fit = () => {
    if (landmarks.length > 1) map.fitBounds(L.latLngBounds(landmarks.map((l) => [l.lat, l.lon])).pad(0.3));
    else if (landmarks.length === 1) map.setView([landmarks[0].lat, landmarks[0].lon], 16);
  };
  fit();

  // Hovering a landmark in the list highlights it on the map.
  $$('[data-lm]').forEach((row) => {
    const m = markers.get(row.dataset.lm);
    row.addEventListener('mouseenter', () => { m?.getElement()?.firstElementChild?.classList.add('highlight'); m?.openPopup(); });
    row.addEventListener('mouseleave', () => m?.getElement()?.firstElementChild?.classList.remove('highlight'));
  });

  makeDeck($('#deck'), { onSettle: (i) => { if (i === 1) map.invalidateSize(); } });
  setInterval(() => { $('#city-time').textContent = localTime(city.timezone); }, 30_000);
}

main().catch((err) => { console.error(err); showError('Something went wrong while loading this city.'); });
