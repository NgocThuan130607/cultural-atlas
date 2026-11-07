// Story mode tab: short narrated chapters (history, legend, culture).
// The viewport shows the chapter's image (slow Ken Burns zoom while playing) with a player bar;
// the panel shows the transcript, highlighting the sentence being read.
// Narration uses a chapter's own "audio", "video" or "youtube" when the data provides one,
// otherwise the browser's built-in text-to-speech, one sentence at a time.
import { $, $$, esc, icon, imageSrc, creditHTML, protoNote } from '../common.js';

const TYPE_LABEL = { history: 'History', legend: 'Legend', culture: 'Culture', film: 'Film' };

/**
 * A chapter's video, if it has one: `"video": { "file": "<Commons video>" }` (streamed from Wikimedia Commons,
 * see scripts/resolve-media.mjs) or `"video": "local/clip.webm"`.
 */
function filmOf(c, media) {
  if (!c.video) return null;
  if (typeof c.video === 'string') return { sources: [{ src: c.video }], poster: imageSrc(c.image, media), duration: 0, credit: creditHTML(c.image, media) };
  const m = media[c.video.file?.replace(/_/g, ' ')];
  if (!m?.sources) return null;
  return { sources: m.sources, poster: m.url, duration: m.duration ?? 0, credit: creditHTML(c.video, media) };
}
const clock = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
const tts = 'speechSynthesis' in window ? window.speechSynthesis : null;

const splitSentences = (text) => text.match(/[^.!?]+[.!?]+["”’']?\s*|[^.!?]+$/g)?.map((s) => s.trim()).filter(Boolean) ?? [text];
const minutes = (text) => Math.max(1, Math.round(text.split(/\s+/).length / 150));

// Prefers a natural-sounding English voice. Those are often online voices, so after one fails
// (no internet, blocked network) only voices installed on the computer are used.
let localOnly = false;
function pickVoice() {
  const voices = (tts?.getVoices() ?? []).filter((v) => !localOnly || v.localService);
  const en = voices.filter((v) => v.lang?.toLowerCase().startsWith('en'));
  return en.find((v) => /natural|neural|google|samantha|daniel/i.test(v.name)) ?? en[0] ?? null;
}
const START_TIMEOUT = 5000; // ms to wait for a sentence to start before trying another voice

export function initStory(pane, layer, { lm, media }) {
  const chapters = lm.story;

  pane.innerHTML = `
    <div class="panel-section" id="story-head"></div>
    <div class="panel-section pt-0">
      <p class="t-body-s muted" id="story-note" hidden></p>
      ${chapters.some((c) => !c.audio && !c.video && !c.youtube) ? protoNote('narration is read aloud by your browser’s built-in voice (text-to-speech). The full version would use recorded narration by local guides and historians; the player already supports audio and video files.') : ''}
      <div class="transcript" id="story-transcript" aria-label="Transcript"></div>
      <p class="t-body-s muted mt-3 mb-0" id="story-credit"></p>
    </div>
    <section class="panel-section px-0" aria-labelledby="chapters-title">
      <h2 id="chapters-title" class="px-4">Chapters</h2>
      <div id="chapter-list">
        ${chapters.map((c, i) => { const film = filmOf(c, media); return `
          <button type="button" class="chapter-row" data-i="${i}" aria-current="false">
            <span class="num">${film || c.youtube ? icon('movie') : i + 1}</span>
            <span class="grow"><span class="d-block fw-medium">${esc(c.title)}</span>
              <small><span class="type-label type-${esc(c.type)}">${TYPE_LABEL[c.type] ?? esc(c.type)}</span> · ${film?.duration ? `Video ${clock(film.duration)}` : film || c.youtube ? 'Video' : `${minutes(c.narration)} min`}</small></span>
          </button>`; }).join('')}
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
      <label class="visually-hidden" for="story-rate">Playback speed</label>
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
  let video = null; // the <video> of a film chapter

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
    const film = filmOf(c, media);
    video = null;
    if (c.youtube) {
      stageEl.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(c.youtube)}" title="${esc(c.title)}" allow="encrypted-media; picture-in-picture" allowfullscreen></iframe>`;
    } else if (film) {
      stageEl.innerHTML = `
        <video controls playsinline preload="metadata" poster="${esc(film.poster)}" aria-label="${esc(c.video.alt ?? c.title)}">
          ${film.sources.map((s) => `<source src="${esc(s.src)}"${s.type ? ` type="${esc(s.type)}"` : ''}>`).join('')}
        </video>`;
      const el = $('video', stageEl);
      video = el;
      // Events from a video that has since been replaced (another chapter) are ignored.
      const on = (type, fn, target = el) => target.addEventListener(type, () => { if (video === el) fn(); });
      on('play', () => { setPlaying(true); if (el.networkState !== el.NETWORK_NO_SOURCE) showNote(''); });
      on('pause', () => { if (!el.ended) setPlaying(false); });
      on('timeupdate', () => setProgress(el.currentTime / (el.duration || 1)));
      on('ended', finished);
      // Every source failed (offline, or blocked by the network).
      on('error', () => { setPlaying(false); filmFailed(); }, $$('source', el).at(-1));
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
    // A film's text describes the footage; it isn't read aloud, so its sentences aren't clickable.
    P('story-transcript').classList.toggle('static', Boolean(film || c.youtube));
    P('story-transcript').innerHTML = `
      ${film ? `<p class="t-label muted mb-1">${icon('movie')} About this film</p>` : ''}
      <p class="mb-0">${sentences.map((s, k) => `<span class="sentence" data-k="${k}">${esc(s)}</span>`).join(' ')}</p>`;
    P('story-credit').innerHTML = film ? `Film: ${film.credit}` : `Image: ${creditHTML(c.image, media)}`;
    V('story-bar-title').textContent = c.title;
    $$('.chapter-row', pane).forEach((b) => {
      const on = Number(b.dataset.i) === i;
      b.classList.toggle('active', on);
      b.setAttribute('aria-current', on);
    });
    V('story-prev').disabled = i === 0;
    V('story-next').disabled = i === chapters.length - 1;
    V('story-play').disabled = !(audio || video || tts) || Boolean(c.youtube);
    setPlaying(false); // refreshes the button label for this chapter (narration or video)
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

  let utterance = null; // kept so the browser doesn't drop it before it ends
  let watchdog = 0;

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
    let started = false;
    const failed = () => {
      clearTimeout(watchdog);
      if (id !== session) return;
      tts.cancel();
      if (voice && !voice.localService && !localOnly) { localOnly = true; speakFrom(k, id); return; }
      setPlaying(false);
      showNote('The narration could not be played. Check that your sound is on and this tab is not muted, or read the transcript below.');
    };
    u.onstart = () => { started = true; clearTimeout(watchdog); showNote(''); };
    u.onend = () => { clearTimeout(watchdog); if (started) speakFrom(k + 1, id); else failed(); };
    u.onerror = (e) => { if (e.error !== 'interrupted' && e.error !== 'canceled') failed(); };
    utterance = u;
    tts.resume(); // Chrome can get stuck in a paused state
    tts.speak(u);
    clearTimeout(watchdog);
    watchdog = setTimeout(() => { if (!started) failed(); }, START_TIMEOUT);
  }

  const filmFailed = () => showNote('The video could not be loaded. It streams from Wikimedia Commons, so it needs an internet connection. Please try again in a few minutes.');

  function showNote(text) {
    P('story-note').hidden = !text;
    P('story-note').textContent = text;
  }

  function play() {
    // A film plays in its own <video>; its play/pause events update the button.
    if (video) {
      if (video.networkState === video.NETWORK_NO_SOURCE) { filmFailed(); return; }
      video.playbackRate = Number(V('story-rate').value);
      video.play().catch(() => setPlaying(false));
      return;
    }
    setPlaying(true);
    if (audio) { audio.playbackRate = Number(V('story-rate').value); audio.play(); return; }
    if (!tts) return;
    tts.cancel();
    speakFrom(pos, ++session);
  }

  function stop() {
    session++;
    clearTimeout(watchdog);
    utterance = null;
    tts?.cancel();
    audio?.pause();
    video?.pause();
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
    const what = video ? 'video' : 'narration';
    btn.setAttribute('aria-label', on ? `Pause ${what}` : `Play ${what}`);
    V('story-stage').classList.toggle('playing', on);
  }

  V('story-play').addEventListener('click', () => (playing ? stop() : play()));
  V('story-prev').addEventListener('click', () => load(index - 1, playing));
  V('story-next').addEventListener('click', () => load(index + 1, playing));
  V('story-rate').addEventListener('change', () => {
    if (video) video.playbackRate = Number(V('story-rate').value);
    else if (playing) { stop(); play(); }
  });
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
    if (!s || audio || video || !tts) return;
    stop();
    pos = Number(s.dataset.k);
    play();
  });
  window.addEventListener('pagehide', () => tts?.cancel());

  load(0);
  return { onHide: stop };
}
