// Story mode tab: short narrated chapters (history, legend, culture).
// The viewport shows the chapter's image (slow Ken Burns zoom while playing) with a player bar;
// the panel shows the transcript, highlighting the sentence being read.
// Narration uses a chapter's own "audio", "video" or "youtube" when the data provides one,
// otherwise the browser's built-in text-to-speech, one sentence at a time.
import { $, $$, esc, icon, imageSrc, creditHTML } from '../common.js';

const TYPE_LABEL = { history: 'History', legend: 'Legend', culture: 'Culture' };
const tts = 'speechSynthesis' in window ? window.speechSynthesis : null;

const splitSentences = (text) => text.match(/[^.!?]+[.!?]+["”’']?\s*|[^.!?]+$/g)?.map((s) => s.trim()).filter(Boolean) ?? [text];
const minutes = (text) => Math.max(1, Math.round(text.split(/\s+/).length / 150));

function pickVoice() {
  const voices = tts?.getVoices() ?? [];
  const en = voices.filter((v) => v.lang?.toLowerCase().startsWith('en'));
  return en.find((v) => /natural|neural|google|samantha|daniel/i.test(v.name)) ?? en[0] ?? null;
}

export function initStory(pane, layer, { lm, media }) {
  const chapters = lm.story;

  pane.innerHTML = `
    <div class="panel-section" id="story-head"></div>
    <div class="panel-section pt-0">
      <p class="t-body-s muted" id="story-note" hidden></p>
      <div class="transcript" id="story-transcript" aria-label="Transcript"></div>
      <p class="t-body-s muted mt-3 mb-0" id="story-credit"></p>
    </div>
    <section class="panel-section px-0" aria-labelledby="chapters-title">
      <h2 id="chapters-title" class="px-4">Chapters</h2>
      <div id="chapter-list">
        ${chapters.map((c, i) => `
          <button type="button" class="chapter-row" data-i="${i}" aria-current="false">
            <span class="num">${i + 1}</span>
            <span class="grow"><span class="d-block fw-medium">${esc(c.title)}</span>
              <small><span class="type-label type-${esc(c.type)}">${TYPE_LABEL[c.type] ?? esc(c.type)}</span> · ${c.video || c.youtube ? 'Video' : `${minutes(c.narration)} min`}</small></span>
          </button>`).join('')}
      </div>
    </section>`;

  layer.innerHTML = `
    <div class="story-stage" id="story-stage"></div>
    <div class="playerbar">
      <button type="button" class="icon-btn" id="story-prev" aria-label="Previous chapter">${icon('skip_previous')}</button>
      <button type="button" class="icon-btn play" id="story-play" aria-label="Play narration">${icon('play_arrow', 'fill')}</button>
      <button type="button" class="icon-btn" id="story-next" aria-label="Next chapter">${icon('skip_next')}</button>
      <div class="info ms-2">
        <strong id="story-bar-title"></strong>
        <div class="bar" role="progressbar" aria-label="Chapter progress" aria-valuemin="0" aria-valuemax="100"><div id="story-progress"></div></div>
      </div>
      <label class="visually-hidden" for="story-rate">Narration speed</label>
      <select id="story-rate"><option value="0.85">0.85×</option><option value="1" selected>1×</option><option value="1.2">1.2×</option></select>
      <button type="button" class="icon-btn" id="story-auto" aria-pressed="true" aria-label="Continue to the next chapter automatically" title="Auto-continue">${icon('playlist_play')}</button>
    </div>`;

  const P = (id) => $(`#${id}`, pane);
  const V = (id) => $(`#${id}`, layer);
  let index = 0;
  let sentences = [];
  let pos = 0;
  let playing = false;
  let session = 0; // invalidates callbacks from cancelled speech
  let audio = null;

  if (!tts) {
    P('story-note').hidden = false;
    P('story-note').textContent = 'Your browser does not support spoken narration, but you can read each story below.';
  }
  tts?.getVoices(); // starts loading voices in Chrome

  function load(i, autoplay = false) {
    stop();
    index = i;
    const c = chapters[i];
    sentences = splitSentences(c.narration);
    pos = 0;

    const stageEl = V('story-stage');
    if (c.youtube) {
      stageEl.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(c.youtube)}" title="${esc(c.title)}" allow="encrypted-media; picture-in-picture" allowfullscreen></iframe>`;
    } else if (c.video) {
      stageEl.innerHTML = `<video src="${esc(c.video)}" controls preload="metadata" poster="${esc(imageSrc(c.image, media))}"></video>`;
    } else {
      stageEl.innerHTML = `<img src="${esc(imageSrc(c.image, media))}" alt="${esc(c.image?.alt ?? '')}">`;
    }
    audio = c.audio ? new Audio(c.audio) : null;
    if (audio) {
      audio.addEventListener('timeupdate', () => setProgress(audio.currentTime / (audio.duration || 1)));
      audio.addEventListener('ended', finished);
    }

    P('story-head').innerHTML = `
      <p class="mb-1"><span class="type-label type-${esc(c.type)}">${TYPE_LABEL[c.type] ?? esc(c.type)}</span>
        <span class="t-body-s muted"> · Chapter ${i + 1} of ${chapters.length}</span></p>
      <h2 class="t-headline mb-0">${esc(c.title)}</h2>`;
    P('story-transcript').innerHTML = `<p class="mb-0">${sentences.map((s, k) => `<span class="sentence" data-k="${k}">${esc(s)}</span>`).join(' ')}</p>`;
    P('story-credit').innerHTML = `Image: ${creditHTML(c.image, media)}`;
    V('story-bar-title').textContent = c.title;
    $$('.chapter-row', pane).forEach((b) => {
      const on = Number(b.dataset.i) === i;
      b.classList.toggle('active', on);
      b.setAttribute('aria-current', on);
    });
    V('story-prev').disabled = i === 0;
    V('story-next').disabled = i === chapters.length - 1;
    V('story-play').disabled = !(audio || tts) || Boolean(c.video || c.youtube);
    setProgress(0);
    if (autoplay) play();
  }

  function setProgress(fraction) {
    const pct = Math.round(Math.min(1, fraction) * 100);
    V('story-progress').style.width = `${pct}%`;
    V('story-progress').parentElement.setAttribute('aria-valuenow', pct);
  }

  function markSentence(k) {
    $$('.sentence', pane).forEach((s) => {
      const n = Number(s.dataset.k);
      s.classList.toggle('current', n === k);
      s.classList.toggle('spoken', n < k);
    });
  }

  function speakFrom(k, id) {
    if (id !== session) return;
    if (k >= sentences.length) return finished();
    pos = k;
    markSentence(k);
    setProgress(k / sentences.length);
    const u = new SpeechSynthesisUtterance(sentences[k]);
    const voice = pickVoice();
    if (voice) { u.voice = voice; u.lang = voice.lang; } else { u.lang = 'en-GB'; }
    u.rate = Number(V('story-rate').value);
    u.onend = () => speakFrom(k + 1, id);
    u.onerror = (e) => { if (e.error !== 'interrupted' && e.error !== 'canceled') setPlaying(false); };
    tts.speak(u);
  }

  function play() {
    setPlaying(true);
    if (audio) { audio.playbackRate = Number(V('story-rate').value); audio.play(); return; }
    if (!tts) return;
    tts.cancel();
    speakFrom(pos, ++session);
  }

  function stop() {
    session++;
    tts?.cancel();
    audio?.pause();
    setPlaying(false);
  }

  function finished() {
    setPlaying(false);
    setProgress(1);
    markSentence(sentences.length);
    pos = 0;
    const auto = V('story-auto').getAttribute('aria-pressed') === 'true';
    if (auto && index < chapters.length - 1) setTimeout(() => load(index + 1, true), 900);
  }

  function setPlaying(on) {
    playing = on;
    const btn = V('story-play');
    btn.innerHTML = icon(on ? 'pause' : 'play_arrow', 'fill');
    btn.setAttribute('aria-label', on ? 'Pause narration' : 'Play narration');
    V('story-stage').classList.toggle('playing', on);
  }

  V('story-play').addEventListener('click', () => (playing ? stop() : play()));
  V('story-prev').addEventListener('click', () => load(index - 1, playing));
  V('story-next').addEventListener('click', () => load(index + 1, playing));
  V('story-rate').addEventListener('change', () => { if (playing) { stop(); play(); } });
  V('story-auto').addEventListener('click', (e) => {
    const b = e.currentTarget;
    b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') !== 'true');
  });
  P('chapter-list').addEventListener('click', (e) => {
    const b = e.target.closest('[data-i]');
    if (b) load(Number(b.dataset.i), playing);
  });
  // Click a sentence to start reading from there.
  P('story-transcript').addEventListener('click', (e) => {
    const s = e.target.closest('.sentence');
    if (!s || audio || !tts) return;
    stop();
    pos = Number(s.dataset.k);
    play();
  });
  window.addEventListener('pagehide', () => tts?.cancel());

  load(0);
  return { onHide: stop };
}
