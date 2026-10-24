// Visit tab: live opening status, hours, tickets, etiquette and tips in the panel;
// an interactive map of entrances, transport, food and services in the viewport.
import { $, $$, esc, icon } from '../common.js';
import { openStatus, weekTable, seasonFor, zonedParts } from '../hours.js';
import { createMap, landmarkMarker, poiMarker, CATEGORIES, L } from '../map.js';

export function initGuide(pane, layer, { lm, city }) {
  const g = lm.guide;
  const hours = g.hours;
  const today = zonedParts(city.timezone);
  const currentSeason = seasonFor(hours, today.month);
  const usedCats = Object.keys(CATEGORIES).filter((k) => g.pois.some((p) => p.category === k));

  pane.innerHTML = `
    <section class="panel-section" aria-labelledby="hours-title">
      <h2 id="hours-title">Opening hours</h2>
      <p class="mb-1"><span class="status" id="open-status"></span></p>
      <p class="t-body-s muted mb-3">Local time in ${esc(city.name)} (${esc(city.timezone.replaceAll('_', ' '))})</p>
      ${hours.seasons.map((s) => `
        <details class="season" ${s === currentSeason ? 'open' : ''}>
          <summary><span>${esc(s.label)}${s === currentSeason ? ' <span class="t-body-s muted">· now</span>' : ''}</span>${icon('expand_more', 'chev')}</summary>
          <table class="hours-table mt-1"><tbody>
            ${weekTable(s).map((r) => `
              <tr class="${s === currentSeason && r.weekday === today.weekday ? 'today' : ''}">
                <td>${r.day}</td><td class="${r.text === 'Closed' ? 'closed' : ''}">${esc(r.text)}</td>
              </tr>`).join('')}
          </tbody></table>
        </details>`).join('')}
      <p class="t-body-s muted mt-3">${esc(hours.notes ?? '')}</p>
      <h3 class="t-title-s mt-3 mb-1">Tickets</h3>
      <p class="mb-3">${esc(g.price)}</p>
      <a class="btn-m btn-outlined" href="${esc(g.officialUrl)}" target="_blank" rel="noopener">${icon('open_in_new')}Official website</a>
    </section>

    <section class="panel-section" aria-labelledby="etq-title">
      <h2 id="etq-title">Etiquette</h2>
      <ul class="check-list">
        ${g.etiquette.do.map((t) => `<li class="do">${icon('check_circle')}<span>${esc(t)}</span></li>`).join('')}
        ${g.etiquette.dont.map((t) => `<li class="dont">${icon('cancel')}<span><span class="visually-hidden">Don't: </span>${esc(t)}</span></li>`).join('')}
      </ul>
    </section>

    <section class="panel-section" aria-labelledby="tips-title">
      <h2 id="tips-title">Local tips</h2>
      ${g.tips.map((t) => `
        <div class="tip">
          <span class="tip-icon bg-cat-${esc(t.category)}">${icon((CATEGORIES[t.category] ?? CATEGORIES.sights).icon)}</span>
          <div><h3 class="t-title-s mb-1">${esc(t.title)}</h3><p class="t-body-s mb-0">${esc(t.text)}</p></div>
        </div>`).join('')}
    </section>

    <section class="panel-section px-0" aria-labelledby="near-title">
      <h2 id="near-title" class="px-4">Around ${esc(lm.name)}</h2>
      <div class="d-flex flex-wrap gap-2 px-4 mb-2" role="group" aria-label="Filter places on the map">
        ${usedCats.map((k) => `<button type="button" class="chip" data-cat="${k}" aria-pressed="true">${icon(CATEGORIES[k].icon)}${CATEGORIES[k].label}</button>`).join('')}
      </div>
      <div id="poi-list"></div>
      <p class="t-body-s muted px-4 mt-2 mb-0">Positions are approximate. Follow signs on site.</p>
    </section>`;

  layer.innerHTML = `<div class="map-fill" id="guide-map" role="region" aria-label="Map of places around ${esc(lm.name)}"></div>`;

  // Live opening status, refreshed every minute.
  const statusEl = $('#open-status', pane);
  const refresh = () => {
    const s = openStatus(hours, city.timezone);
    statusEl.className = `status ${s.state}`;
    statusEl.textContent = s.text;
  };
  refresh();
  setInterval(refresh, 60_000);

  // The map is created the first time the tab is shown (Leaflet needs a visible container).
  let map = null;
  const markers = [];
  function buildMap() {
    map = createMap($('#guide-map', layer), { lat: lm.lat, lon: lm.lon, zoom: 16, style: 'street' });
    landmarkMarker(lm.lat, lm.lon, lm.name).bindPopup(`<strong>${esc(lm.name)}</strong>`).addTo(map);
    g.pois.forEach((poi) => markers.push({ poi, marker: poiMarker(poi).addTo(map) }));
    map.fitBounds(L.latLngBounds([[lm.lat, lm.lon], ...g.pois.map((p) => [p.lat, p.lon])]).pad(0.15));
  }

  const activeCats = () => new Set($$('[data-cat]', pane).filter((c) => c.getAttribute('aria-pressed') === 'true').map((c) => c.dataset.cat));
  function renderList() {
    const active = activeCats();
    markers.forEach(({ poi, marker }) => { if (active.has(poi.category)) marker.addTo(map); else marker.remove(); });
    $('#poi-list', pane).innerHTML = g.pois.filter((p) => active.has(p.category)).map((p) => `
      <button type="button" class="poi-row" data-poi="${esc(p.name)}">
        <span class="dot bg-cat-${esc(p.category)}">${icon((CATEGORIES[p.category] ?? CATEGORIES.sights).icon)}</span>
        <span><span class="t-title-s">${esc(p.name)}</span><small>${esc(p.note ?? '')}</small></span>
      </button>`).join('');
  }

  pane.addEventListener('click', (e) => {
    const chip = e.target.closest('[data-cat]');
    if (chip) {
      chip.setAttribute('aria-pressed', chip.getAttribute('aria-pressed') !== 'true');
      if (map) renderList();
      return;
    }
    const row = e.target.closest('[data-poi]');
    if (row && map) {
      const m = markers.find(({ poi }) => poi.name === row.dataset.poi);
      if (!m) return;
      map.flyTo(m.marker.getLatLng(), Math.max(map.getZoom(), 17), { duration: 0.6 });
      m.marker.openPopup();
      if (matchMedia('(max-width: 991.98px)').matches) layer.scrollIntoView({ behavior: 'smooth' });
    }
  });

  // Fill the list before the map exists, so the panel isn't empty.
  $('#poi-list', pane).innerHTML = '';
  return {
    onShow() {
      if (!map) { buildMap(); renderList(); } else map.invalidateSize();
    },
  };
}
