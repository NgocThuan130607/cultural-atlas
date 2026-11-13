// Shared frame for the three landmark pages (Time travel, Stories, Visit), built as a deck of slides
// (fifth round of feedback, see slides.js). The first slide is the same on every page: the landmark's
// name in a beige frame, a sand-coloured card with the summary, opening status and Save, and the page's
// own large picture beside them (the time slider, the story chapters or a photo). Each page then adds
// its own slides. The Time travel / Stories / Visit switcher sits in the app bar (under it on phones).
import {
  $, esc, icon, param, loadCities, loadLandmark, loadMedia, noteImage, creditsBlock, imageSrc,
  formatCoords, showError, LANDMARK_PAGES, landmarkUrl,
} from '../common.js';
import { openStatus } from '../hours.js';
import { saveButton } from '../trip.js';
import { seasonBadge } from '../season.js';
import { slide, deckHTML, titleFrame, makeDeck } from '../slides.js';
import { motifLayer } from '../motifs.js';
import { applyDaylight, daylightHTML } from '../daylight.js';

/**
 * Builds a landmark page.
 * @param {string} active  which page this is: 'time', 'story' or 'guide'
 * @param {(track: HTMLElement, media: HTMLElement, ctx: object) => object} init  the page's own view.
 *   It fills `media` (the big picture on the first slide), adds its slides to `track`, and may return
 *   { onDeck(deck), onSlide(i), onShow(), onHide() }.
 */
export async function initLandmarkPage(active, init) {
  const page = LANDMARK_PAGES.find((p) => p.id === active);
  const id = param('id');
  const [cities, media] = await Promise.all([loadCities(), loadMedia()]);
  let lm;
  try { lm = await loadLandmark(id); } catch { return showError(`There's no landmark called "${id ?? ''}" in the atlas yet.`); }
  const city = cities.find((c) => c.id === lm.city);
  document.title = `${lm.name} · ${page.label} · Atlas of Stories`;
  $('#back-btn').href = `city.html?id=${encodeURIComponent(city.id)}`;
  $('#back-btn').setAttribute('aria-label', `Back to ${city.name}`);

  // Every image and video the landmark can show is listed in the credits.
  [lm.hero, ...lm.eras.map((e) => e.image), ...lm.story.flatMap((s) => [s.image, s.video])].forEach((ref) => noteImage(ref, media));

  // Page switcher: in the app bar on wide screens, under it on phones.
  const tabs = (cls) => `
    <nav class="${cls}" aria-label="Ways to explore ${esc(lm.name)}">
      ${LANDMARK_PAGES.map((p) => `
        <a class="m-tab ${p.id === active ? 'active' : ''}" href="${landmarkUrl(lm.id, p.id)}"
          ${p.id === active ? 'aria-current="page"' : ''}>${icon(p.icon)}<span>${p.label}</span></a>`).join('')}
    </nav>`;
  $('.appbar .brand').insertAdjacentHTML('afterend', tabs('lm-tabs'));

  const status = openStatus(lm.guide.hours, city.timezone);
  const cover = slide({
    id: 's-overview', title: 'Overview', tone: 'dark', layout: 'cover', label: 'lm-title', cls: `cover-${active}`,
    bg: esc(imageSrc(lm.hero, media)),
    body: `
      ${motifLayer(lm.motifs?.cover)}
      <div class="s-col">
      ${titleFrame(`
        <p class="crumb mb-3"><a href="index.html#${esc(lm.id)}">Globe</a> › <a href="city.html?id=${encodeURIComponent(city.id)}">${esc(city.name)}</a> › ${esc(page.label)}</p>
        <h1 id="lm-title" class="s-title ${lm.name.length > 20 ? 'long' : ''}">${esc(lm.name)}</h1>
        <p class="title-sub mb-0">${esc(lm.localName ?? '')}</p>`)}
      <div class="s-sand" data-reveal data-drift style="--d:2">
        <p class="lead-text">${esc(lm.summary)}</p>
        <div class="meta-row mb-3">
          <a class="status ${status.state}" href="${landmarkUrl(lm.id, 'guide')}#plan" title="See opening hours">${esc(status.text)}</a>
          <span class="daylight" id="lm-time">${daylightHTML(city.timezone, city.name)}</span>
          <span>${icon('location_on')}${formatCoords(lm.lat, lm.lon, 4)}</span>
        </div>
        <div class="d-flex flex-wrap align-items-center gap-2">${saveButton(lm)}${seasonBadge(lm)}</div>
        <div id="cover-note"></div>
      </div>
      </div>
      <div class="s-media" id="vp" data-reveal style="--d:1"></div>`,
  });

  $('#panel').innerHTML = tabs('m-tabs lm-tabs-page') + deckHTML([cover]);

  const era = Number(param('era'));
  const ctx = { lm, city, media, initialEra: Number.isInteger(era) ? era : 0, note: $('#cover-note') };
  const view = init($('.deck-track'), $('#vp'), ctx);
  $('.deck-after').innerHTML = `<div class="wrap">${creditsBlock(lm.credits)}</div>`;
  const deck = makeDeck($('#deck'), { onSettle: (i) => view?.onSlide?.(i), mark: lm.motifs?.cover?.[0] });
  view?.onDeck?.(deck);
  view?.onShow?.();
  // Stop narration or autoplay when leaving the page (also covers the back/forward cache).
  addEventListener('pagehide', () => view?.onHide?.());

  // The page's tint and its clock follow the time of day there (thirteenth round)
  applyDaylight(city.timezone, { el: $('#lm-time'), place: city.name });
}

/** Runs a landmark page and shows a friendly message if anything fails. */
export function runLandmarkPage(active, init) {
  initLandmarkPage(active, init).catch((err) => { console.error(err); showError('Something went wrong while loading this landmark.'); });
}
