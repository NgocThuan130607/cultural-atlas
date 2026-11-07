// My trip page: the landmarks the visitor saved, a day-by-day plan that checks each visit against the
// opening hours, and a map of every saved place. The plan can be downloaded as a calendar file or printed.
import {
  $, $$, esc, icon, loadCities, loadLandmark, loadMedia, imageSrc, showError, landmarkUrl, protoNote,
} from '../common.js';
import { checkVisit, hoursOn } from '../hours.js';
import { createMap, L } from '../map.js';
import { tripItems, updateItem, removeLandmark, clearTrip, onTripChange, saveButton, storageWorks } from '../trip.js';
import { seasonNote } from '../season.js';

const monthOf = (iso) => Number(iso.slice(5, 7));

const DURATIONS = [[30, '30 minutes'], [60, '1 hour'], [90, '1½ hours'], [120, '2 hours'], [180, '3 hours'], [240, 'Half a day (4 hours)']];
const IDEAS = ['eiffel-tower', 'hue-imperial-city', 'kinkaku-ji', 'ha-long-bay']; // shown while the trip is empty
const FAR_KM = 150; // two visits on the same day further apart than this get a warning

// ---------- Dates and times ----------
const pad = (n) => String(n).padStart(2, '0');
const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const toMin = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
const fmtMin = (min) => `${pad(Math.floor(min / 60) % 24)}:${pad(min % 60)}`;
const dayTitle = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(Date.UTC(y, m - 1, d));
};
const shortDay = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(Date.UTC(y, m - 1, d));
};

/** Great-circle distance in km. */
function distanceKm(a, b) {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

// ---------- Calendar file (.ics) ----------
/** Milliseconds that `timeZone` is ahead of UTC at instant `t`. */
function tzOffset(timeZone, t) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric',
  }).formatToParts(new Date(t)).map((x) => [x.type, Number(x.value)]));
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - t;
}
/** The moment a wall-clock time happens in `timeZone` (e.g. 10:00 in Paris). */
function zonedToDate(date, time, timeZone) {
  const [y, m, d] = date.split('-').map(Number);
  const [h, mi] = time.split(':').map(Number);
  const wall = Date.UTC(y, m - 1, d, h, mi);
  let t = wall - tzOffset(timeZone, wall);
  t = wall - tzOffset(timeZone, t); // second pass in case the first guess crossed a daylight-saving change
  return new Date(t);
}
const icsDate = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const icsText = (s) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
const fold = (line) => line.match(/.{1,73}/gu).join('\r\n '); // calendar lines are kept short

function calendarFile(visits) {
  const stamp = icsDate(new Date());
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Atlas of Stories//My trip//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
  for (const { it, lm, city } of visits) {
    const start = zonedToDate(it.date, it.time, city.timezone);
    const end = new Date(start.getTime() + (it.duration ?? 60) * 60_000);
    const about = [it.note, `Opening hours that day: ${hoursOn(lm.guide.hours, it.date)} (approximate)`, 'Planned with Atlas of Stories'];
    lines.push(
      'BEGIN:VEVENT',
      `UID:${lm.id}-${it.date}-${it.time.replace(':', '')}@atlas-of-stories`,
      `DTSTAMP:${stamp}`, `DTSTART:${icsDate(start)}`, `DTEND:${icsDate(end)}`,
      `SUMMARY:${icsText(`Visit ${lm.name}`)}`,
      `LOCATION:${icsText(`${lm.name}, ${city.name}, ${city.country}`)}`,
      `GEO:${lm.lat};${lm.lon}`,
      `DESCRIPTION:${icsText(about.filter(Boolean).join('\n'))}`,
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return `${lines.map(fold).join('\r\n')}\r\n`;
}

function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ---------- Page ----------
async function main() {
  const [cities, media] = await Promise.all([loadCities(), loadMedia()]);
  const cityById = new Map(cities.map((c) => [c.id, c]));
  const landmarks = new Map();
  const getLandmark = async (id) => {
    if (!landmarks.has(id)) landmarks.set(id, await loadLandmark(id).catch(() => null));
    return landmarks.get(id);
  };
  document.title = 'My trip · Atlas of Stories';

  $('#viewport').innerHTML = '<div class="map-fill" id="trip-map" role="region" aria-label="Map of your saved places"></div>';
  const map = createMap($('#trip-map'), { lat: 30, lon: 20, zoom: 2, minZoom: 1, style: 'street' });
  const pins = L.layerGroup().addTo(map);
  const markers = new Map();
  let shownIds = '';
  let editing = null; // id of the place whose plan form is open
  let message = ''; // short note shown under the action buttons
  let focusAfter = null; // { act, id } of the control to focus once the list is redrawn

  const panel = $('#panel');

  async function render() {
    const rows = (await Promise.all(tripItems().map(async (it) => {
      const lm = await getLandmark(it.id);
      return lm && { it, lm, city: cityById.get(lm.city) };
    }))).filter(Boolean);
    const planned = rows.filter((r) => r.it.date && r.it.time)
      .sort((a, b) => `${a.it.date} ${a.it.time}`.localeCompare(`${b.it.date} ${b.it.time}`));
    const unplanned = rows.filter((r) => !(r.it.date && r.it.time));
    const number = new Map(planned.map((r, i) => [r.lm.id, i + 1]));

    const countries = new Set(rows.map((r) => r.city.country)).size;
    const range = planned.length ? ` · ${shortDay(planned[0].it.date)}${planned.at(-1).it.date !== planned[0].it.date ? `–${shortDay(planned.at(-1).it.date)}` : ''}` : '';
    const summary = rows.length
      ? `${rows.length} saved ${rows.length === 1 ? 'place' : 'places'} · ${planned.length} planned · ${countries} ${countries === 1 ? 'country' : 'countries'}${range}`
      : 'Save landmarks you want to see, then plan when to visit them.';

    const focused = document.activeElement?.closest('[data-act]');
    const refocus = focusAfter ?? (focused && { act: focused.dataset.act, id: focused.dataset.id });
    focusAfter = null;

    panel.innerHTML = `
      <header class="panel-section">
        <p class="crumb mb-1"><a href="index.html">Globe</a> › My trip</p>
        <h1 class="t-display mb-1">My trip</h1>
        <p class="muted mb-3">${esc(summary)}</p>
        ${storageWorks() ? '' : '<p class="trip-warn">' + icon('warning') + '<span>This browser is blocking saved data, so your trip will be lost when you close the page.</span></p>'}
        ${protoNote('your trip is saved only in this browser on this device. The full version would let you sign in to keep it on every device, share it with travel companions and book tickets.', 'mb-0')}
      </header>
      ${rows.length ? '' : await emptyState()}
      ${planned.length ? `
        <section class="panel-section px-0" aria-labelledby="plan-title">
          <h2 id="plan-title" class="px-4">Planned visits</h2>
          <p class="t-body-s muted px-4">Times are local time at each place. Opening hours are approximate.</p>
          ${days(planned).map(([date, visits]) => `
            <div class="trip-day">
              <h3 class="trip-day-title px-4">${icon('calendar_month')}${esc(dayTitle(date))}${date < todayISO() ? ' <span class="past-badge">Past</span>' : ''}</h3>
              ${dayWarnings(visits).map((w) => `<p class="trip-warn mx-4">${icon('warning')}<span>${esc(w)}</span></p>`).join('')}
              ${visits.map((r) => card(r, number.get(r.lm.id))).join('')}
            </div>`).join('')}
        </section>` : ''}
      ${unplanned.length ? `
        <section class="panel-section px-0" aria-labelledby="saved-title">
          <h2 id="saved-title" class="px-4">Saved, not planned yet</h2>
          <p class="t-body-s muted px-4">Choose a day and time for each place to add it to your plan.</p>
          ${unplanned.map((r) => card(r)).join('')}
        </section>` : ''}
      ${rows.length ? `
        <section class="panel-section trip-actions" aria-label="Trip actions">
          <div class="d-flex flex-wrap gap-2">
            ${planned.length ? `<button type="button" class="btn-m btn-tonal" data-act="ics">${icon('download')}Add to calendar</button>` : ''}
            <button type="button" class="btn-m btn-outlined" data-act="print">${icon('print')}Print</button>
            <button type="button" class="btn-m btn-text danger" data-act="clear">${icon('delete')}Clear trip</button>
          </div>
          <p class="t-body-s muted mt-2 mb-0" id="trip-message" aria-live="polite">${esc(message)}</p>
        </section>` : ''}`;

    drawMap(rows, number);
    if (editing) {
      updateHint($(`form[data-id="${CSS.escape(editing)}"]`, panel));
    } else if (refocus) {
      // Keep keyboard focus on the same control after the list is redrawn.
      $(`[data-act="${refocus.act}"]${refocus.id ? `[data-id="${CSS.escape(refocus.id)}"]` : ''}`, panel)?.focus();
    }
  }

  async function emptyState() {
    const ideas = (await Promise.all(IDEAS.map(getLandmark))).filter(Boolean);
    return `
      <section class="panel-section trip-empty text-center">
        <span class="ms big" aria-hidden="true">luggage</span>
        <h2 class="t-title mt-2">Nothing saved yet</h2>
        <p class="muted">Press ${icon('favorite')} <strong>Save</strong> on any landmark to keep it here. Then choose a day and time, and the atlas checks that it will be open.</p>
        <a class="btn-m btn-filled" href="index.html">${icon('public')}Explore the globe</a>
      </section>
      <section class="panel-section px-0" aria-labelledby="ideas-title">
        <h2 id="ideas-title" class="px-4">Ideas to start with</h2>
        <ul class="place-list">
          ${ideas.map((lm) => { const c = cityById.get(lm.city); return `
            <li class="place-item">
              <a class="place-row" href="${landmarkUrl(lm.id)}">
                <img class="thumb" src="${esc(imageSrc(lm.hero, media))}" alt="" loading="lazy">
                <span class="grow"><span class="t-title-s">${esc(lm.name)}</span><span class="sub">${esc(c.name)}, ${esc(c.country)}</span></span>
              </a>
              ${saveButton(lm, 'icon')}
            </li>`; }).join('')}
        </ul>
      </section>`;
  }

  /** Planned visits grouped by day: [[date, visits], ...]. */
  function days(planned) {
    const map = new Map();
    for (const r of planned) map.set(r.it.date, [...(map.get(r.it.date) ?? []), r]);
    return [...map];
  }

  /** Warnings for one day: visits that overlap, or that are too far apart to do on the same day. */
  function dayWarnings(visits) {
    const out = [];
    for (let i = 1; i < visits.length; i++) {
      const a = visits[i - 1];
      const b = visits[i];
      const aEnd = toMin(a.it.time) + (a.it.duration ?? 60);
      // Times are local, so they can only be compared within one time zone.
      if (a.city.timezone === b.city.timezone && toMin(b.it.time) < aEnd) out.push(`${a.lm.name} (until ${fmtMin(aEnd)}) overlaps with ${b.lm.name} (from ${b.it.time}).`);
      const km = distanceKm(a.lm, b.lm);
      if (km > FAR_KM) out.push(`${a.city.name} and ${b.city.name} are about ${Math.round(km).toLocaleString('en-GB')} km apart. That is hard to visit on the same day.`);
    }
    return out;
  }

  function card({ it, lm, city }, num) {
    const planned = Boolean(it.date && it.time);
    const duration = it.duration ?? 60;
    const check = planned ? checkVisit(lm.guide.hours, it.date, it.time, duration) : null;
    const id = esc(lm.id);
    return `
      <article class="trip-card ${editing === lm.id ? 'editing' : ''}" aria-label="${esc(lm.name)}">
        <div class="trip-card-main">
          <span class="trip-thumb">
            <img src="${esc(imageSrc(lm.hero, media))}" alt="" loading="lazy">
            ${num ? `<span class="trip-num" aria-label="Stop ${num}">${num}</span>` : ''}
          </span>
          <div class="grow">
            ${planned ? `<p class="trip-when">${icon('schedule')}${esc(it.time)}–${fmtMin(toMin(it.time) + duration)} <small>local time</small></p>` : ''}
            <h3 class="t-title-s mb-0"><a href="${landmarkUrl(lm.id, 'guide')}">${esc(lm.name)}</a></h3>
            <p class="sub mb-0">${esc(city.name)}, ${esc(city.country)}</p>
            ${check ? `<p class="status ${check.state} trip-check mb-0">${esc(check.text)}</p>` : ''}
            ${planned ? seasonLine(lm, it.date) : ''}
            ${it.note ? `<p class="trip-note mb-0">${icon('sticky_note_2')}<span>${esc(it.note)}</span></p>` : ''}
          </div>
        </div>
        <div class="trip-card-actions">
          <button type="button" class="chip" data-act="plan" data-id="${id}" aria-expanded="${editing === lm.id}">${icon('edit_calendar')}${planned ? 'Change plan' : 'Plan a visit'}</button>
          <button type="button" class="chip" data-act="map" data-id="${id}">${icon('location_on')}Map</button>
          ${planned ? `<button type="button" class="chip" data-act="unplan" data-id="${id}">${icon('event_busy')}Unschedule</button>` : ''}
          <button type="button" class="chip chip-icon" data-act="remove" data-id="${id}" aria-label="Remove ${esc(lm.name)} from My trip" title="Remove from My trip">${icon('delete')}</button>
        </div>
        ${editing === lm.id ? planForm(it, lm, city) : ''}
      </article>`;
  }

  /** Whether the planned month is a good season for this place. */
  function seasonLine(lm, date) {
    const s = seasonNote(lm, monthOf(date));
    return s ? `<p class="trip-season mb-0">${seasonText(s)}</p>` : '';
  }
  const seasonText = (s) => `<span class="season-badge ${s.good ? 'good' : ''}">${s.good ? icon('wb_sunny') : icon('calendar_month')}${esc(s.good ? 'Good season for this place' : `Outside the best season · ${s.text}`)}</span>`;

  function planForm(it, lm, city) {
    const id = esc(lm.id);
    const duration = it.duration ?? 60;
    return `
      <form class="trip-form" data-id="${id}" novalidate aria-label="Plan your visit to ${esc(lm.name)}">
        <div class="row g-2">
          <div class="col-6">
            <label class="form-label" for="f-date-${id}">Day</label>
            <input class="form-control" type="date" id="f-date-${id}" name="date" required min="${todayISO()}" value="${esc(it.date ?? '')}">
            <div class="invalid-feedback">Choose a day, today or later.</div>
          </div>
          <div class="col-6">
            <label class="form-label" for="f-time-${id}">Arrive at</label>
            <input class="form-control" type="time" id="f-time-${id}" name="time" required step="900" value="${esc(it.time ?? '10:00')}">
            <div class="invalid-feedback">Choose a time.</div>
          </div>
          <div class="col-12">
            <label class="form-label" for="f-dur-${id}">Time to spend there</label>
            <select class="form-select" id="f-dur-${id}" name="duration">
              ${DURATIONS.map(([v, label]) => `<option value="${v}" ${v === duration ? 'selected' : ''}>${label}</option>`).join('')}
            </select>
          </div>
          <div class="col-12">
            <label class="form-label" for="f-note-${id}">Note <span class="muted">(optional)</span></label>
            <textarea class="form-control" id="f-note-${id}" name="note" rows="2" maxlength="200" placeholder="e.g. Buy tickets online the day before">${esc(it.note ?? '')}</textarea>
          </div>
        </div>
        <p class="trip-hint" aria-live="polite"></p>
        <p class="trip-season-hint" aria-live="polite"></p>
        <p class="t-body-s muted mb-2">Use local time in ${esc(city.name)} (${esc(city.timezone.replaceAll('_', ' '))}).</p>
        <div class="d-flex flex-wrap gap-2">
          <button type="submit" class="btn-m btn-filled">${icon('check')}Save plan</button>
          <button type="button" class="btn-m btn-text" data-act="cancel">Cancel</button>
        </div>
      </form>`;
  }

  /** Live feedback under the form: that day's opening hours, and whether the chosen time works. */
  function updateHint(form) {
    if (!form) return;
    const lm = landmarks.get(form.dataset.id);
    const hint = $('.trip-hint', form);
    const { date, time, duration } = form.elements;
    const season = date.value ? seasonNote(lm, monthOf(date.value)) : null;
    $('.trip-season-hint', form).innerHTML = season ? seasonText(season) : '';
    if (!date.value) { hint.className = 'trip-hint muted'; hint.textContent = 'Pick a day to see the opening hours.'; return; }
    const hours = hoursOn(lm.guide.hours, date.value);
    if (!time.value) { hint.className = 'trip-hint'; hint.textContent = `Hours that day: ${hours}`; return; }
    const c = checkVisit(lm.guide.hours, date.value, time.value, Number(duration.value));
    hint.className = `trip-hint status ${c.state}`;
    hint.textContent = `${c.text}.${c.state === 'open' ? '' : ` Hours that day: ${hours}.`}`;
  }

  function drawMap(rows, number) {
    pins.clearLayers();
    markers.clear();
    for (const { it, lm, city } of rows) {
      const num = number.get(lm.id);
      const m = L.marker([lm.lat, lm.lon], {
        title: lm.name, alt: lm.name, riseOnHover: true,
        icon: L.divIcon({ className: '', html: `<div class="trip-pin ${num ? '' : 'saved'}">${num ?? icon('favorite', 'fill')}</div>`, iconSize: [32, 32], iconAnchor: [16, 16], popupAnchor: [0, -14] }),
      }).bindPopup(`<strong>${esc(lm.name)}</strong><br>${esc(city.name)}${it.date ? `<br>${esc(shortDay(it.date))}, ${esc(it.time)}` : ''}<br><a href="${landmarkUrl(lm.id, 'guide')}">Visitor guide</a>`);
      m.addTo(pins);
      markers.set(lm.id, m);
    }
    // Dashed line through the planned visits, in order.
    const route = rows.filter((r) => number.has(r.lm.id)).sort((a, b) => number.get(a.lm.id) - number.get(b.lm.id));
    if (route.length > 1) L.polyline(route.map((r) => [r.lm.lat, r.lm.lon]), { color: '#0b57d0', weight: 3, dashArray: '6 8', opacity: .8 }).addTo(pins);

    // Fit the map only when the set of places changes, so it doesn't jump while editing a plan.
    const ids = rows.map((r) => r.lm.id).sort().join();
    if (ids === shownIds) return;
    shownIds = ids;
    if (rows.length === 1) map.setView([rows[0].lm.lat, rows[0].lm.lon], 14);
    else if (rows.length > 1) map.fitBounds(L.latLngBounds(rows.map((r) => [r.lm.lat, r.lm.lon])).pad(0.2), { maxZoom: 14 });
    else map.setView([30, 20], 2);
  }

  function showOnMap(id) {
    const m = markers.get(id);
    if (!m) return;
    map.flyTo(m.getLatLng(), Math.max(map.getZoom(), 13), { duration: 0.8 });
    m.openPopup();
    if (matchMedia('(max-width: 991.98px)').matches) $('#viewport').scrollIntoView({ behavior: 'smooth' });
  }

  // ---------- Events ----------
  panel.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const { act, id } = btn.dataset;
    if (act === 'plan') {
      editing = editing === id ? null : id;
      await render();
      const input = $(`#f-date-${CSS.escape(id)}`, panel);
      input?.focus();
      input?.closest('.trip-card').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
    if (act === 'cancel') { focusAfter = { act: 'plan', id: editing }; editing = null; await render(); }
    if (act === 'map') showOnMap(id);
    if (act === 'unplan') updateItem(id, { date: null, time: null, duration: null });
    if (act === 'remove') { if (editing === id) editing = null; removeLandmark(id); }
    if (act === 'print') print();
    if (act === 'clear' && confirm(`Remove all ${tripItems().length} saved places and their plans from My trip?`)) {
      editing = null;
      message = '';
      clearTrip();
      panel.scrollTop = 0;
      scrollTo(0, 0);
    }
    if (act === 'ics') {
      const rows = (await Promise.all(tripItems().filter((it) => it.date && it.time).map(async (it) => {
        const lm = await getLandmark(it.id);
        return lm && { it, lm, city: cityById.get(lm.city) };
      }))).filter(Boolean);
      download('my-trip.ics', calendarFile(rows), 'text/calendar');
      message = `Downloaded my-trip.ics with ${rows.length} ${rows.length === 1 ? 'visit' : 'visits'}. Open it to add them to Google Calendar, Outlook or Apple Calendar.`;
      $('#trip-message', panel).textContent = message;
    }
  });

  panel.addEventListener('input', (e) => updateHint(e.target.closest('.trip-form')));
  panel.addEventListener('change', (e) => updateHint(e.target.closest('.trip-form')));
  panel.addEventListener('submit', (e) => {
    const form = e.target.closest('.trip-form');
    if (!form) return;
    e.preventDefault();
    form.classList.add('was-validated');
    if (form.elements.date.value && form.elements.date.value < todayISO()) form.elements.date.setCustomValidity('past');
    else form.elements.date.setCustomValidity('');
    if (!form.checkValidity()) { form.querySelector(':invalid')?.focus(); return; }
    const { date, time, duration, note } = form.elements;
    const id = form.dataset.id;
    editing = null;
    message = '';
    focusAfter = { act: 'plan', id };
    updateItem(id, { date: date.value, time: time.value, duration: Number(duration.value), note: note.value.trim() });
  });

  onTripChange(render);
  await render();
}

main().catch((err) => { console.error(err); showError('Something went wrong while loading your trip.'); });
