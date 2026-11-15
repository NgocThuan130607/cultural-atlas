// Time travel page. The first slide (Overview) shows the landmark's own picture, the same as on its Stories and
// Visit pages (twentieth round; it used to show one of its eras). Then every era is a slide of its own (its
// year in the beige frame, its photo, and a card with its story), so the timeline along the bottom of the page
// is the landmark's timeline and the only way through time (nineteenth round: the Overview's own time slider,
// its play button and its before / after comparison were taken out, with the "See it on the time slider" and
// "Compare with …" buttons of the eras). Each era's photo develops like a print as its slide arrives, under a
// film grain that is heavier the older the era.
import { esc, imageSrc, creditHTML } from '../common.js';
import { slide, photo, titleFrame, bigNumber } from '../slides.js';
import { motifLayer } from '../motifs.js';

export function initTimeline(track, layer, { lm, media }) {
  const eras = lm.eras;
  const src = (i) => imageSrc(eras[i].image, media);
  // How old an era is, from 0 (now) to 1 (thousands of years ago): older eras get a heavier film grain.
  const thisYear = new Date().getFullYear();
  const ageOf = (era) => Math.min(1, Math.log10(Math.max(1, thisYear - (era.year ?? thisYear)) + 1) / Math.log10(5000));

  track.insertAdjacentHTML('beforeend', eras.map((e, i) => slide({
    id: `era-${i}`,
    title: esc(e.label),
    tone: i % 2 ? 'dark' : 'light',
    flip: i % 2 === 1,
    label: `era-title-${i}`,
    cls: 'era-slide',
    bg: esc(src(i)),
    body: `
      ${motifLayer(e.motifs)}
      <div class="s-col">
      ${titleFrame(`
        <p class="kicker">Era ${i + 1} of ${eras.length}</p>
        <p class="s-year">${esc(e.label)}</p>
        <h2 id="era-title-${i}" class="s-title-s mb-0">${esc(e.title)}</h2>`)}
      <div class="s-card" data-reveal data-drift style="--d:2">
        <p>${esc(e.text)}</p>
      </div>
      ${bigNumber(String(i + 1).padStart(2, '0'))}
      </div>
      ${photo(esc(src(i)), esc(e.image.alt ?? ''), creditHTML(e.image, media), '', e.image)}`,
  })).join(''));
  eras.forEach((e, i) => track.querySelector(`#era-${i}`)?.style.setProperty('--age', ageOf(e).toFixed(2)));

  // The Overview: the landmark's own picture
  layer.innerHTML = `
    <img class="cover-img" data-parallax src="${esc(imageSrc(lm.hero, media))}" alt="${esc(lm.hero.alt ?? '')}">
    <span class="s-credit">${creditHTML(lm.hero, media)}</span>`;
  return {};
}
