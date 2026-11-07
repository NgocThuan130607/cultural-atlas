// Seasons and interests: which months are best for a landmark ("bestMonths": [1..12]) and what it offers
// ("tags"). Used by the Discover page, the season badge on city and landmark pages, and My trip.
import { esc, icon } from './common.js';

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const SHORT = MONTHS.map((m) => m.slice(0, 3));

/** Interests a landmark can be tagged with, in the order they are shown. */
export const TAGS = {
  history: { label: 'History', icon: 'history_edu' },
  architecture: { label: 'Architecture', icon: 'account_balance' },
  nature: { label: 'Nature', icon: 'forest' },
  spiritual: { label: 'Temples & faith', icon: 'temple_buddhist' },
  'local-life': { label: 'Local life', icon: 'storefront' },
  adventure: { label: 'Adventure', icon: 'hiking' },
};

export const thisMonth = () => new Date().getMonth() + 1;

/** Months as short ranges: [3,4,5,9,10] → "Mar–May, Sep–Oct"; [12,1,2] → "Dec–Feb". */
export function monthRanges(months = []) {
  const set = new Set(months);
  if (set.size === 12) return 'All year';
  if (!set.size) return '';
  // Start each range at a month whose previous month is not in the set, so Dec–Feb stays together.
  const ranges = [];
  for (let m = 1; m <= 12; m++) {
    const prev = m === 1 ? 12 : m - 1;
    if (!set.has(m) || set.has(prev)) continue;
    let end = m;
    while (set.has(end === 12 ? 1 : end + 1) && (end === 12 ? 1 : end + 1) !== m) end = end === 12 ? 1 : end + 1;
    ranges.push(end === m ? SHORT[m - 1] : `${SHORT[m - 1]}–${SHORT[end - 1]}`);
  }
  return ranges.join(', ');
}

export const isGoodMonth = (lm, month) => (lm.bestMonths ?? []).includes(month);

/** { good, text } for visiting `lm` in `month`, e.g. { good: false, text: 'Best in Mar–May, Sep–Oct' }. */
export function seasonNote(lm, month = thisMonth()) {
  if (!lm.bestMonths?.length) return null;
  return isGoodMonth(lm, month)
    ? { good: true, text: `Good time to visit in ${MONTHS[month - 1]}` }
    : { good: false, text: `Best in ${monthRanges(lm.bestMonths)}` };
}

/** Small badge for the current month, shown on city and landmark pages. */
export function seasonBadge(lm, month = thisMonth()) {
  const s = seasonNote(lm, month);
  if (!s) return '';
  return `<span class="season-badge ${s.good ? 'good' : ''}">${s.good ? icon('wb_sunny') : icon('calendar_month')}${esc(s.text)}</span>`;
}

export const tagChips = (lm) => (lm.tags ?? []).filter((t) => TAGS[t])
  .map((t) => `<span class="tag">${icon(TAGS[t].icon)}${esc(TAGS[t].label)}</span>`).join('');
