// Discover page: helps travellers who don't know where to go yet.
// - "Help me choose": three questions (when, what you enjoy, where) give the three best matches, each with its reasons.
// - Places at their best in a chosen month, editor's picks, and browsing by interest.
// Seasons and interests come from each landmark's "bestMonths" and "tags" (see src/js/season.js).
import {
  $, $$, esc, icon, loadCities, loadLandmark, loadMedia, imageSrc, landmarkUrl, protoNote, showError, collectionsOf,
} from '../common.js';
import { saveButton } from '../trip.js';
import { MONTHS, TAGS, monthRanges, isGoodMonth, thisMonth, tagChips } from '../season.js';

const REGIONS = [['all', 'All places'], ['vietnam', 'Vietnam'], ['world', 'Rest of the world']];

async function main() {
  const [cities, media] = await Promise.all([loadCities(), loadMedia()]);
  const cityById = new Map(cities.map((c) => [c.id, c]));
  const landmarks = (await Promise.all(cities.flatMap((c) => c.landmarks.map((id) => loadLandmark(id).catch(() => null)))))
    .filter(Boolean).sort((a, b) => a.name.localeCompare(b.name));
  document.title = 'Discover · Atlas of Stories';

  // Vietnam = places in the Vietnam atlas; "rest of the world" = everywhere else.
  const inVietnam = (lm) => collectionsOf(cityById.get(lm.city)).includes('vietnam');
  const inRegion = (lm, region) => region === 'all' || (region === 'vietnam') === inVietnam(lm);

  const state = { month: thisMonth(), region: 'all', tags: new Set() };

  function card(lm, reasons = []) {
    const c = cityById.get(lm.city);
    const url = landmarkUrl(lm.id);
    return `
      <article class="place-card">
        <a class="place-card-img" href="${url}" tabindex="-1" aria-hidden="true">
          <img src="${esc(imageSrc(lm.hero, media))}" alt="" loading="lazy">
          ${lm.featured ? `<span class="pick-badge">${icon('star', 'fill')}Editor's pick</span>` : ''}
        </a>
        <div class="place-card-body">
          <h3 class="t-title mb-0"><a href="${url}">${esc(lm.name)}</a></h3>
          <p class="sub mb-2">${esc(c.name)}, ${esc(c.country)}</p>
          ${reasons.length ? `<ul class="reasons">${reasons.map((r) => `<li>${icon('check_circle')}${esc(r)}</li>`).join('')}</ul>` : ''}
          <p class="tags mb-2">${tagChips(lm)}</p>
          <p class="best mb-0">${icon('calendar_month')}Best: ${esc(monthRanges(lm.bestMonths))}</p>
        </div>
        <div class="place-card-actions">
          <a class="btn-m btn-tonal" href="${url}">${icon('arrow_forward')}Explore</a>
          ${saveButton(lm)}
        </div>
      </article>`;
  }
  const grid = (list, empty) => (list.length
    ? `<div class="card-grid">${list.map((lm) => card(lm)).join('')}</div>`
    : `<p class="empty-note">${icon('search_off')}${esc(empty)}</p>`);

  // ---------- Layout ----------
  $('#discover').innerHTML = `
    <header class="discover-head">
      <p class="crumb mb-1"><a href="index.html">Globe</a> › Discover</p>
      <h1 class="t-display mb-2">Discover</h1>
      <p class="lead-text mb-0">Not sure where to go? Answer three quick questions, or browse places by season and by what you enjoy.</p>
    </header>

    <section class="discover-card quiz" id="quiz" aria-labelledby="quiz-title">
      <h2 id="quiz-title">${icon('explore')}Help me choose</h2>
      <form id="quiz-form" novalidate>
        <div class="quiz-q">
          <label class="quiz-label" for="q-month">1. When are you travelling?</label>
          <select class="form-select" id="q-month" name="month">
            ${MONTHS.map((m, i) => `<option value="${i + 1}" ${i + 1 === state.month ? 'selected' : ''}>${m}</option>`).join('')}
          </select>
        </div>
        <fieldset class="quiz-q">
          <legend class="quiz-label">2. What do you enjoy? <span class="muted">(choose any)</span></legend>
          <div class="chip-options">
            ${Object.entries(TAGS).map(([id, t]) => `
              <label class="chip-option"><input type="checkbox" name="tags" value="${id}"><span>${icon(t.icon)}${esc(t.label)}</span></label>`).join('')}
          </div>
        </fieldset>
        <fieldset class="quiz-q">
          <legend class="quiz-label">3. Where would you like to go?</legend>
          <div class="chip-options">
            ${[['all', 'Anywhere'], ['vietnam', 'Vietnam'], ['world', 'Somewhere else']].map(([v, label], i) => `
              <label class="chip-option"><input type="radio" name="region" value="${v}" ${i === 0 ? 'checked' : ''}><span>${esc(label)}</span></label>`).join('')}
          </div>
        </fieldset>
        <button type="submit" class="btn-m btn-filled">${icon('auto_awesome')}Show my best matches</button>
      </form>
      <div id="quiz-results" aria-live="polite"></div>
    </section>

    <div class="browse-bar" role="group" aria-label="Show places in">
      <span class="t-label muted">Show places in</span>
      ${REGIONS.map(([v, label]) => `<button type="button" class="chip" data-region="${v}" aria-pressed="${v === state.region}">${esc(label)}</button>`).join('')}
    </div>

    <section class="discover-section" aria-labelledby="season-title">
      <div class="section-head">
        <h2 id="season-title"></h2>
        <div class="month-nav">
          <button type="button" class="icon-btn" data-month="-1" aria-label="Previous month">${icon('chevron_left')}</button>
          <label class="visually-hidden" for="month-select">Month</label>
          <select class="form-select" id="month-select">
            ${MONTHS.map((m, i) => `<option value="${i + 1}">${m}</option>`).join('')}
          </select>
          <button type="button" class="icon-btn" data-month="1" aria-label="Next month">${icon('chevron_right')}</button>
        </div>
      </div>
      <div id="season-list"></div>
    </section>

    <section class="discover-section" aria-labelledby="picks-title">
      <div class="section-head"><h2 id="picks-title">Editor's picks</h2></div>
      ${protoNote('these places are chosen by the atlas editors. The full version would also show what is popular, based on how many travellers save and plan each place.')}
      <div id="picks-list"></div>
    </section>

    <section class="discover-section" aria-labelledby="browse-title">
      <div class="section-head"><h2 id="browse-title">Browse by interest</h2></div>
      <div class="chip-row" role="group" aria-label="Interests">
        ${Object.entries(TAGS).map(([id, t]) => `<button type="button" class="chip" data-tag="${id}" aria-pressed="false">${icon(t.icon)}${esc(t.label)}</button>`).join('')}
      </div>
      <p class="t-body-s muted mt-2" id="browse-count" aria-live="polite"></p>
      <div id="browse-list"></div>
    </section>`;

  // ---------- Browsing sections ----------
  function renderLists() {
    const here = landmarks.filter((lm) => inRegion(lm, state.region));
    $('#season-title').textContent = `Good to visit in ${MONTHS[state.month - 1]}`;
    $('#month-select').value = state.month;
    $('#season-list').innerHTML = grid(here.filter((lm) => isGoodMonth(lm, state.month)), 'No places in this list are at their best that month. Try another month.');
    $('#picks-list').innerHTML = grid(here.filter((lm) => lm.featured), 'No editor’s picks here yet.');
    const browse = state.tags.size ? here.filter((lm) => (lm.tags ?? []).some((t) => state.tags.has(t))) : here;
    $('#browse-count').textContent = state.tags.size
      ? `${browse.length} ${browse.length === 1 ? 'place matches' : 'places match'} ${[...state.tags].map((t) => TAGS[t].label).join(' or ')}.`
      : `All ${browse.length} places. Choose interests to narrow the list.`;
    $('#browse-list').innerHTML = grid(browse, 'No places match. Try another interest.');
  }

  // ---------- Quiz ----------
  /** Scores every place for the answers: right season first, then shared interests, then editor's picks. */
  function matches({ month, tags, region }) {
    return landmarks.filter((lm) => inRegion(lm, region)).map((lm) => {
      const good = isGoodMonth(lm, month);
      const shared = (lm.tags ?? []).filter((t) => tags.includes(t));
      const score = (good ? 3 : 0) + shared.length * 2 + (lm.featured ? 0.5 : 0);
      const reasons = [
        good ? `At its best in ${MONTHS[month - 1]}` : `Best in ${monthRanges(lm.bestMonths)}, not ${MONTHS[month - 1]}`,
        ...(shared.length ? [`For ${shared.map((t) => TAGS[t].label.toLowerCase()).join(' and ')}`] : []),
        ...(lm.featured ? ['An editor’s pick'] : []),
      ];
      return { lm, score, reasons };
    }).sort((a, b) => b.score - a.score || a.lm.name.localeCompare(b.lm.name)).slice(0, 3);
  }

  $('#quiz-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target;
    const answers = {
      month: Number(f.elements.month.value),
      tags: $$('input[name="tags"]:checked', f).map((i) => i.value),
      region: $('input[name="region"]:checked', f).value,
    };
    const top = matches(answers);
    $('#quiz-results').innerHTML = `
      <h3 class="t-title mt-4 mb-1" tabindex="-1" id="quiz-results-title">Your best matches</h3>
      <p class="t-body-s muted">${answers.tags.length ? '' : 'Tip: choose what you enjoy for better matches. '}Save the ones you like to My trip, then plan your days there.</p>
      <div class="card-grid">${top.map(({ lm, reasons }) => card(lm, reasons)).join('')}</div>`;
    $('#quiz-results-title').focus();
  });

  // ---------- Events ----------
  $('#discover').addEventListener('click', (e) => {
    const region = e.target.closest('[data-region]');
    if (region) {
      state.region = region.dataset.region;
      $$('[data-region]').forEach((b) => b.setAttribute('aria-pressed', b === region));
      renderLists();
    }
    const step = e.target.closest('[data-month]');
    if (step) { state.month = ((state.month - 1 + Number(step.dataset.month) + 12) % 12) + 1; renderLists(); }
    const tag = e.target.closest('[data-tag]');
    if (tag) {
      const on = tag.getAttribute('aria-pressed') !== 'true';
      tag.setAttribute('aria-pressed', on);
      if (on) state.tags.add(tag.dataset.tag); else state.tags.delete(tag.dataset.tag);
      renderLists();
    }
  });
  $('#month-select').addEventListener('change', (e) => { state.month = Number(e.target.value); renderLists(); });

  renderLists();
  // discover.html#quiz (from the welcome dialog) jumps straight to the questions.
  if (location.hash === '#quiz') { $('#quiz').scrollIntoView(); $('#q-month').focus({ preventScroll: true }); }
}

main().catch((err) => { console.error(err); showError('Something went wrong while loading suggestions.'); });
