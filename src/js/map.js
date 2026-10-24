// Leaflet helpers shared by the city page and the visitor guide.
// Two base styles, like Google Maps: a street map (follows light/dark theme) and satellite imagery with labels.
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { esc, icon, currentTheme } from './common.js';

export const CATEGORIES = {
  entrance: { label: 'Entrances', icon: 'door_open' },
  transport: { label: 'Transport', icon: 'directions_transit' },
  food: { label: 'Food & drink', icon: 'restaurant' },
  sights: { label: 'Sights', icon: 'photo_camera' },
  services: { label: 'Toilets & services', icon: 'wc' },
};

const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services';
const tile = (path) => `${ESRI}/${path}/MapServer/tile/{z}/{y}/{x}`;
const ATTR = 'Tiles &copy; Esri, Maxar, Earthstar Geographics, HERE, Garmin, &copy; OpenStreetMap contributors';

function streetLayer() {
  const dark = currentTheme() === 'dark';
  return L.tileLayer(tile(dark ? 'Canvas/World_Dark_Gray_Base' : 'World_Street_Map'), {
    maxZoom: 19, maxNativeZoom: dark ? 16 : 19, attribution: ATTR,
  });
}
function satelliteLayer() {
  return L.layerGroup([
    L.tileLayer(tile('World_Imagery'), { maxZoom: 19, attribution: ATTR }),
    L.tileLayer(tile('Reference/World_Transportation'), { maxZoom: 19, opacity: .7 }),
    L.tileLayer(tile('Reference/World_Boundaries_and_Places'), { maxZoom: 19 }),
  ]);
}

/**
 * Creates a map. `style` is 'satellite' or 'street'.
 * A small Map / Satellite switch is added in the top-right corner.
 */
export function createMap(el, { lat, lon, zoom = 15, style = 'street' }) {
  const map = L.map(el, { center: [lat, lon], zoom, zoomControl: false, scrollWheelZoom: true });
  L.control.zoom({ position: 'bottomright' }).addTo(map);

  let current = style;
  let layer = (style === 'satellite' ? satelliteLayer() : streetLayer()).addTo(map);
  const setStyle = (s) => {
    current = s;
    map.removeLayer(layer);
    layer = (s === 'satellite' ? satelliteLayer() : streetLayer()).addTo(map);
    switcher.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.style === s));
  };

  const Switch = L.Control.extend({
    onAdd() {
      const div = L.DomUtil.create('div', 'map-switch');
      div.innerHTML = `
        <button type="button" data-style="street" aria-pressed="${style === 'street'}">${icon('map')}Map</button>
        <button type="button" data-style="satellite" aria-pressed="${style === 'satellite'}">${icon('satellite_alt')}Satellite</button>`;
      L.DomEvent.disableClickPropagation(div);
      div.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) setStyle(b.dataset.style); });
      return div;
    },
  });
  const switcher = new Switch({ position: 'topright' }).addTo(map).getContainer();

  // Street style follows the light/dark theme.
  new MutationObserver(() => { if (current === 'street') setStyle('street'); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ['data-bs-theme'] });
  return map;
}

const PIN_SVG = '<svg viewBox="0 0 36 46" aria-hidden="true"><path d="M18 0C8.06 0 0 8.06 0 18c0 12.6 15.3 26.2 16 26.8a3 3 0 0 0 4 0c.7-.6 16-14.2 16-26.8C36 8.06 27.94 0 18 0z" fill="#d93025"/><path d="M18 1.5C8.9 1.5 1.5 8.9 1.5 18" stroke="rgba(255,255,255,.25)" fill="none"/></svg>';

export function landmarkMarker(lat, lon, name) {
  return L.marker([lat, lon], {
    title: name, alt: name, zIndexOffset: 1000, riseOnHover: true,
    icon: L.divIcon({ className: '', html: `<div class="pin-landmark">${PIN_SVG}${icon('star', 'fill')}</div>`, iconSize: [36, 46], iconAnchor: [18, 46], popupAnchor: [0, -42] }),
  });
}

export function poiMarker(poi) {
  const cat = CATEGORIES[poi.category] ?? CATEGORIES.sights;
  return L.marker([poi.lat, poi.lon], {
    title: poi.name, alt: poi.name, riseOnHover: true,
    icon: L.divIcon({ className: '', html: `<div class="pin-poi bg-cat-${esc(poi.category)}">${icon(cat.icon)}</div>`, iconSize: [30, 30], iconAnchor: [15, 15], popupAnchor: [0, -14] }),
  }).bindPopup(`<strong>${esc(poi.name)}</strong><br><span class="text-secondary">${esc(poi.note ?? '')}</span>`);
}

export { L };
