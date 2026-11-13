// Light that follows the clock at the place (thirteenth round). A city or landmark page is tinted for the time
// of day it is there right now: a rosy gold at dawn, plain daylight, amber at dusk, a deep indigo at night.
// Only the blurred photos behind the slides are tinted (see [data-daylight] in main.scss), never the text.
// The local time shown on the page gets a sun or moon and a word for the time of day.
import { zonedParts } from './hours.js';
import { icon, esc, localTime } from './common.js';

// Minutes after midnight, local time. `icon:` names are picked up by the icon-font scan in vite.config.js.
const PHASES = [
  { id: 'night', until: 5 * 60, icon: 'dark_mode', word: 'Night' },
  { id: 'dawn', until: 7 * 60, icon: 'wb_twilight', word: 'Dawn' },
  { id: 'day', until: 17 * 60, icon: 'light_mode', word: 'Daytime' },
  { id: 'dusk', until: 19 * 60, icon: 'wb_twilight', word: 'Evening' },
  { id: 'night', until: 24 * 60, icon: 'dark_mode', word: 'Night' },
];

/** The time of day at a place: { id: 'dawn' | 'day' | 'dusk' | 'night', icon, word }. */
export function phaseAt(timeZone, date = new Date()) {
  const { minutes } = zonedParts(timeZone, date);
  return PHASES.find((p) => minutes < p.until) ?? PHASES[0];
}

/** The local time with a sun or moon and the time of day, e.g. "☾ Mon 10:07 PM · Night in Huế". */
export function daylightHTML(timeZone, place) {
  const p = phaseAt(timeZone);
  return `${icon(p.icon)}<span>${esc(localTime(timeZone))}</span><span class="dl-word">· ${esc(p.word)} in ${esc(place)}</span>`;
}

/**
 * Tints the page for the time of day at the place, and keeps the local time in `el` (if given) up to date.
 * Checked every 30 seconds, like the clock on the page.
 */
export function applyDaylight(timeZone, { el = null, place = '' } = {}) {
  const update = () => {
    document.documentElement.dataset.daylight = phaseAt(timeZone).id;
    if (el) el.innerHTML = daylightHTML(timeZone, place);
  };
  update();
  setInterval(update, 30_000);
}
