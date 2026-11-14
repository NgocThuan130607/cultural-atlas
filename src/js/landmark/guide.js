// Visit page, as slides after the shared first slide (which shows the landmark's photo):
// opening hours and tickets beside a photo, the map with nearby places, etiquette (do / don't),
// and local tips as cards that slide sideways.
import { $, $$, esc, icon, imageSrc, creditHTML } from '../common.js';
import { openStatus, weekTable, seasonFor, zonedParts } from '../hours.js';
import { createMap, landmarkMarker, poiMarker, CATEGORIES, L } from '../map.js';
import { slide, photo, titleFrame, carousel, carNav } from '../slides.js';
import { motifLayer } from '../motifs.js';

export function initGuide(track, layer, { lm, city, media }) {
  const g = lm.guide;
  const hours = g.hours;
  const today = zonedParts(city.timezone);
  const currentSeason = seasonFor(hours, today.month);
  const usedCats = Object.keys(CATEGORIES).filter((k) => g.pois.some((p) => p.category === k));
  // A second photo for the opening-hours slide: the landmark today, or a story picture.
  const second = [lm.eras.at(-1)?.image, ...lm.story.map((s) => s.image)].find((r) => r?.file && r.file !== lm.hero.file && imageSrc(r, media)) ?? lm.hero;
  // and one for the etiquette slide
  const third = [...lm.story.map((s) => s.image), ...lm.eras.map((e) => e.image)].find((r) => r?.file && r.file !== lm.hero.file && r.file !== second.file && imageSrc(r, media)) ?? second;

  const heroSrc = esc(imageSrc(lm.hero, media));
  const oldest = lm.eras[0]?.image;
  const tipsBg = oldest?.file && imageSrc(oldest, media) ? esc(imageSrc(oldest, media)) : heroSrc;

  // The first slide shows the landmark's photo.
  layer.innerHTML = `
    <img class="cover-img" data-parallax src="${esc(imageSrc(lm.hero, media))}" alt="${esc(lm.hero.alt ?? '')}">
    <span class="s-credit">${creditHTML(lm.hero, media)}</span>`;

  track.insertAdjacentHTML('beforeend', [
    slide({
      id: 'plan', title: 'Opening hours', tone: 'light', layout: 'hours', label: 'hours-title', bg: esc(imageSrc(second, media)),
      body: `
        ${motifLayer(g.motifs?.hours)}
        <div class="s-col">
        ${titleFrame(`
          <p class="kicker">Plan your visit</p>
          <h2 id="hours-title" class="s-title-m">Opening hours</h2>
          <p class="mb-1"><span class="status" id="open-status"></span></p>
          <p class="t-body-s muted mb-0">Local time in ${esc(city.name)} (${esc(city.timezone.replaceAll('_', ' '))})</p>`)}
        <div class="s-paper" data-reveal data-drift style="--d:2">
          ${hours.open24h ? '<p class="mb-0">Open every day, around the clock. There is no gate.</p>' : ''}
          ${(hours.seasons ?? []).map((s) => `
            <details class="season" ${s === currentSeason ? 'open' : ''}>
              <summary><span>${esc(s.label)}${s === currentSeason ? ' <span class="t-body-s muted">· now</span>' : ''}</span>${icon('expand_more', 'chev')}</summary>
              <table class="hours-table mt-1"><tbody>
                ${weekTable(s).map((r) => `
                  <tr class="${s === currentSeason && r.weekday === today.weekday ? 'today' : ''}">
                    <td>${r.day}</td><td class="${r.text === 'Closed' ? 'closed' : ''}">${esc(r.text)}</td>
                  </tr>`).join('')}
              </tbody></table>
            </details>`).join('')}
          ${hours.notes ? `<p class="t-body-s muted mt-3 mb-0">${esc(hours.notes)}</p>` : ''}
        </div>
        </div>
        ${photo(esc(imageSrc(second, media)), esc(second.alt ?? ''), creditHTML(second, media))}
        <div class="s-card" data-reveal data-drift="1.4" style="--d:3">
          <h3 class="s-card-title">${icon('confirmation_number')}Tickets</h3>
          <p>${esc(g.price)}</p>
          <a class="btn-m btn-frame" href="${esc(g.officialUrl)}" target="_blank" rel="noopener">${icon('open_in_new')}${/(^|\.)vietnam\.travel$/.test(new URL(g.officialUrl).hostname) ? 'Vietnam Tourism guide' : 'Official website'}</a>
        </div>`,
    }),
    slide({
      id: 'around', title: 'Around', tone: 'dark', layout: 'map', label: 'near-title', bg: heroSrc,
      body: `
        ${motifLayer(g.motifs?.around)}
        <div class="s-col">
        ${titleFrame(`
          <p class="kicker">On the map</p>
          <h2 id="near-title" class="s-title-m mb-0">Around ${esc(lm.name)}</h2>`)}
        <div class="s-card s-list" data-reveal data-drift style="--d:2">
          <div class="d-flex flex-wrap gap-2 mb-2" role="group" aria-label="Filter places on the map">
            ${usedCats.map((k) => `<button type="button" class="chip" data-cat="${k}" aria-pressed="true">${icon(CATEGORIES[k].icon)}${CATEGORIES[k].label}</button>`).join('')}
          </div>
          <div id="poi-list" class="poi-list"></div>
          <p class="t-body-s mt-2 mb-0 s-muted">Positions are approximate. Follow signs on site.</p>
        </div>
        </div>
        <div class="s-map" data-reveal style="--d:1"><div class="map-fill" id="guide-map" role="region" aria-label="Map of places around ${esc(lm.name)}"></div></div>`,
    }),
    slide({
      id: 'etiquette', title: 'Etiquette', tone: 'light', layout: 'etq', label: 'etq-title', bg: esc(imageSrc(third, media)),
      body: `
        ${motifLayer(g.motifs?.etiquette)}
        ${titleFrame(`
          <p class="kicker">Be a good guest</p>
          <h2 id="etq-title" class="s-title-m mb-0">Etiquette</h2>`)}
        ${photo(esc(imageSrc(third, media)), esc(third.alt ?? ''), creditHTML(third, media))}
        <div class="s-card etq-panel" data-reveal data-drift style="--d:2">
          <div>
            <h3 class="s-card-title">Do</h3>
            <ul class="check-list">${g.etiquette.do.map((t) => `<li class="do">${icon('check')}<span>${esc(t)}</span></li>`).join('')}</ul>
          </div>
          <span class="drum-band" aria-hidden="true"></span>
          <div>
            <h3 class="s-card-title">Don't</h3>
            <ul class="check-list">${g.etiquette.dont.map((t) => `<li class="dont">${icon('close')}<span><span class="visually-hidden">Don't: </span>${esc(t)}</span></li>`).join('')}</ul>
          </div>
        </div>`,
    }),
    slide({
      id: 'tips', title: 'Local tips', tone: 'dark', layout: 'tips', label: 'tips-title', bg: tipsBg,
      body: `
        ${motifLayer(g.motifs?.tips)}
        ${titleFrame(`
          <p class="kicker">From locals</p>
          <h2 id="tips-title" class="s-title-m mb-0">Local tips</h2>`)}
        <div class="s-strip tips-strip" data-reveal data-drift style="--d:1">
          <div class="tip-row carousel">
            ${g.tips.map((t) => `
              <article class="tip-card">
                <span class="tip-icon bg-cat-${esc(t.category)}">${icon((CATEGORIES[t.category] ?? CATEGORIES.sights).icon)}</span>
                <h3 class="t-title-s mb-1">${esc(t.title)}</h3>
                <p class="mb-0">${esc(t.text)}</p>
              </article>`).join('')}
          </div>
          ${carNav('tips')}
        </div>`,
    }),
  ].join(''));
  carousel($('.tips-strip', track));

  // Live opening status, refreshed every minute.
  const statusEl = $('#open-status', track);
  const refresh = () => {
    const s = openStatus(hours, city.timezone);
    statusEl.className = `status ${s.state}`;
    statusEl.textContent = s.text;
  };
  refresh();
  setInterval(refresh, 60_000);

  let map = null;
  const markers = [];
  function buildMap() {
    map = createMap($('#guide-map', track), { lat: lm.lat, lon: lm.lon, zoom: 16, style: 'street' });
    map.scrollWheelZoom.disable(); // the mouse wheel moves the slides; zoom with the buttons or by pinching
    landmarkMarker(lm.lat, lm.lon, lm.name).bindPopup(`<strong>${esc(lm.name)}</strong>`).addTo(map);
    g.pois.forEach((poi) => markers.push({ poi, marker: poiMarker(poi).addTo(map) }));
    fitAround(false);
  }

  const activeCats = () => new Set($$('[data-cat]', track).filter((c) => c.getAttribute('aria-pressed') === 'true').map((c) => c.dataset.cat));
  function renderList() {
    const active = activeCats();
    markers.forEach(({ poi, marker }) => { if (active.has(poi.category)) marker.addTo(map); else marker.remove(); });
    $('#poi-list', track).innerHTML = g.pois.filter((p) => active.has(p.category)).map((p) => `
      <button type="button" class="poi-row" data-poi="${esc(p.name)}">
        <span class="dot bg-cat-${esc(p.category)}">${icon((CATEGORIES[p.category] ?? CATEGORIES.sights).icon)}</span>
        <span><span class="t-title-s">${esc(p.name)}</span><small>${esc(p.note ?? '')}</small></span>
      </button>`).join('');
  }
  /** Fits the map to the landmark and the places in the chosen categories. */
  function fitAround(animate = true) {
    const active = activeCats();
    const pts = [[lm.lat, lm.lon], ...g.pois.filter((p) => active.has(p.category)).map((p) => [p.lat, p.lon])];
    map?.fitBounds(L.latLngBounds(pts).pad(0.15), { animate });
  }

  track.addEventListener('click', (e) => {
    const chip = e.target.closest('[data-cat]');
    if (chip) {
      chip.setAttribute('aria-pressed', chip.getAttribute('aria-pressed') !== 'true');
      if (map) { renderList(); fitAround(); }
      return;
    }
    const row = e.target.closest('[data-poi]');
    if (row && map) {
      const m = markers.find(({ poi }) => poi.name === row.dataset.poi);
      if (!m) return;
      map.flyTo(m.marker.getLatLng(), Math.max(map.getZoom(), 17), { duration: 0.6 });
      m.marker.openPopup();
    }
  });

  return {
    onShow() { if (!map) { buildMap(); renderList(); } else map.invalidateSize(); },
    onSlide(i) { if (map && i === 2) map.invalidateSize(); },
  };
}
