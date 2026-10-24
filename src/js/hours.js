// Opening-hours logic. Everything is calculated in the landmark's own time zone,
// so "Open now" is correct wherever the visitor is browsing from.
//
// Data format (in each landmark's guide.hours):
//   seasons: [{ label, months: [1..12], days: { daily | mon | tue | ...: [["09:00","17:00"], ...] } }]
//   closedDates: ["12-25"]   (MM-DD)
// A closing time earlier than the opening time means "after midnight" (e.g. 09:00–00:45).

export const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_MS = 86_400_000;

const toMin = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
const fmt = (min) => `${String(Math.floor(min / 60) % 24).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

/** Date parts as seen on a wall clock in `timeZone`. */
export function zonedParts(timeZone, date = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone, year: 'numeric', month: 'numeric', day: 'numeric', weekday: 'short',
    hour: 'numeric', minute: 'numeric', hourCycle: 'h23',
  }).formatToParts(date).map((p) => [p.type, p.value]));
  return {
    month: Number(parts.month),
    day: Number(parts.day),
    weekday: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday),
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

export const seasonFor = (hours, month) => hours.seasons.find((s) => s.months.includes(month)) ?? null;

function isClosedDate(hours, p) {
  const key = `${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
  return (hours.closedDates ?? []).includes(key);
}

/** Opening intervals for one local day, as [openMin, closeMin] (close may exceed 1440). */
export function intervalsFor(hours, p) {
  if (isClosedDate(hours, p)) return [];
  const season = seasonFor(hours, p.month);
  if (!season) return [];
  const list = season.days[DAY_KEYS[p.weekday]] ?? season.days.daily ?? [];
  return list.map(([o, c]) => {
    const open = toMin(o);
    let close = toMin(c);
    if (close <= open) close += 1440;
    return [open, close];
  });
}

/**
 * Returns { state: 'open' | 'closing' | 'closed', text } for the given moment.
 * 'closing' means it closes within the next hour.
 */
export function openStatus(hours, timeZone, now = new Date()) {
  const today = zonedParts(timeZone, now);
  const m = today.minutes;

  // Still open from an interval that started yesterday and runs past midnight?
  const yesterday = zonedParts(timeZone, new Date(now.getTime() - DAY_MS));
  for (const [, close] of intervalsFor(hours, yesterday)) {
    if (close > 1440 && m < close - 1440) return openResult(close - 1440 - m, close);
  }
  for (const [open, close] of intervalsFor(hours, today)) {
    if (m >= open && m < close) return openResult(close - m, close);
  }
  // Closed: find the next opening in the coming week.
  for (const [open] of intervalsFor(hours, today)) {
    if (open > m) return { state: 'closed', text: `Closed · opens today at ${fmt(open)}` };
  }
  for (let d = 1; d <= 7; d++) {
    const p = zonedParts(timeZone, new Date(now.getTime() + d * DAY_MS));
    const first = intervalsFor(hours, p)[0];
    if (first) {
      const when = d === 1 ? 'tomorrow' : `on ${DAY_NAMES[p.weekday]}`;
      return { state: 'closed', text: `Closed · opens ${when} at ${fmt(first[0])}` };
    }
  }
  return { state: 'closed', text: 'Closed' };
}

function openResult(minutesLeft, close) {
  return minutesLeft <= 60
    ? { state: 'closing', text: `Closing soon · closes at ${fmt(close)}` }
    : { state: 'open', text: `Open now · closes at ${fmt(close)}` };
}

/** Monday-first weekly table for one season: [{ day, weekday, text }]. */
export function weekTable(season) {
  return [1, 2, 3, 4, 5, 6, 0].map((wd) => {
    const list = season.days[DAY_KEYS[wd]] ?? season.days.daily ?? [];
    return { day: DAY_NAMES[wd], weekday: wd, text: list.length ? list.map(([o, c]) => `${o}–${c}`).join(', ') : 'Closed' };
  });
}
