// Stories page: short narrated chapters (history, legend, culture) and films.
// The first slide shows the landmark's photo with the chapters as cards across it. Then every chapter is a
// slide of its own: its picture (or film) with the player bar, and its transcript in a card beside it,
// highlighting the sentence being read. Moving to a chapter's slide gets that chapter ready to play;
// the player's ◀ ▶ buttons and "auto-continue" move along the slides.
// Narration uses a chapter's own "audio", "video" or "youtube" when the data provides one,
// otherwise the browser's built-in text-to-speech, one sentence at a time.
import { $, $$, esc, icon, imageSrc, creditHTML, protoNote } from '../common.js';
import { slide, titleFrame, bigNumber, carousel, carNav } from '../slides.js';
import { motifLayer } from '../motifs.js';

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

export function initStory(track, layer, { lm, media, note }) {
  const chapters = lm.story;
  const still = (c) => { const film = filmOf(c, media); return film ? film.poster : imageSrc(c.image, media); };

  // ----- First slide: the landmark's photo, with the chapters as cards across its lower edge -----
  layer.innerHTML = `
    <img class="cover-img" data-parallax src="${esc(imageSrc(lm.hero, media))}" alt="${esc(lm.hero.alt ?? '')}">
    <span class="s-credit">${creditHTML(lm.hero, media)}</span>`;
  layer.insertAdjacentHTML('afterend', `
    <div class="s-strip" data-reveal data-drift="1.4" style="--d:3">
      <div class="strip-head"><p class="kicker mb-0">${chapters.length} chapters</p>${carNav('chapters')}</div>
      <div class="chapter-strip carousel" id="chapter-list">
        ${chapters.map((c, i) => { const film = filmOf(c, media); return `
          <button type="button" class="chapter-card" data-deck-go="${i + 1}">
            <span class="chapter-card-img"><img src="${esc(still(c))}" alt="" loading="lazy">
              <span class="num">${film || c.youtube ? icon('movie') : String(i + 1).padStart(2, '0')}</span></span>
            <span class="chapter-card-text"><span class="d-block fw-medium">${esc(c.title)}</span>
              <small><span class="type-label type-${esc(c.type)}">${TYPE_LABEL[c.type] ?? esc(c.type)}</span> · ${film?.duration ? `Video ${clock(film.duration)}` : film || c.youtube ? 'Video' : `${minutes(c.narration)} min`}</small></span>
          </button>`; }).join('')}
      </div>
    </div>`);
  carousel(layer.parentElement.querySelector('.s-strip'));
  if (chapters.some((c) => !c.audio && !c.video && !c.youtube)) {
    note.innerHTML = protoNote('narration is read aloud by your browser’s built-in voice (text-to-speech). The full version would use recorded narration by local guides and historians; the player already supports audio and video files.', 'mt-3 mb-0');
  }

  // ----- One slide per chapter -----
  track.insertAdjacentHTML('beforeend', chapters.map((c, i) => {
    const film = filmOf(c, media);
    const sentences = splitSentences(c.narration);
    return slide({
      id: `chapter-${i}`,
      title: esc(c.title),
      tone: i % 2 ? 'dark' : 'light',
      layout: 'story',
      flip: i % 2 === 1,
      label: `chapter-title-${i}`,
      bg: esc(still(c)),
      body: `
        ${motifLayer(c.motifs)}
        <div class="s-col">
        ${titleFrame(`
          <p class="kicker"><span class="type-label type-${esc(c.type)}">${TYPE_LABEL[c.type] ?? esc(c.type)}</span> · Chapter ${i + 1} of ${chapters.length}</p>
          <h2 id="chapter-title-${i}" class="s-title-s mb-0">${esc(c.title)}</h2>`)}
        <div class="s-card" data-reveal data-drift style="--d:2">
          <p class="t-body-s story-note mb-2" hidden></p>
          ${film || c.youtube ? `<p class="t-label mb-1">${icon('movie')} About this film</p>` : ''}
          <div class="transcript ${film || c.youtube ? 'static' : ''}" aria-label="Transcript">
            <p class="mb-0">${sentences.map((s, k) => `<span class="sentence" data-k="${k}">${esc(s)}</span>`).join(' ')}</p>
          </div>
          <p class="credit-line mt-3 mb-0">${film ? icon('movie') : icon('photo_camera')}<span>${film ? film.credit : creditHTML(c.image, media)}</span></p>
        </div>
        </div>
        <div class="s-stage" data-reveal style="--d:1"><div class="story-stage"><img src="${esc(still(c))}" alt="${esc(c.image?.alt ?? '')}"></div></div>
        ${bigNumber(String(i + 1).padStart(2, '0'))}`,
    });
  }).join(''));

  // The player bar travels with the chapter being played.
  const player = document.createElement('div');
  player.className = 'playerbar';
  player.innerHTML = `
    <button type="button" class="icon-btn" id="story-prev" aria-label="Previous chapter">${icon('skip_previous')}</button>
    <button type="button" class="icon-btn play" id="story-play" aria-label="Play narration">${icon('play_arrow', 'fill')}</button>
    <button type="button" class="icon-btn" id="story-next" aria-label="Next chapter">${icon('skip_next')}</button>
    <div class="info ms-2">
      <strong id="story-bar-title"></strong>
      <div class="bar" role="progressbar" aria-label="Chapter progress" aria-valuemin="0" aria-valuemax="100"><div id="story-progress"></div></div>
    </div>
    <label class="visually-hidden" for="story-rate">Playback speed</label>
    <select id="story-rate"><option value="0.85">0.85×</option><option value="1" selected>1×</option><option value="1.2">1.2×</option></select>
    <button type="button" class="icon-btn" id="story-auto" aria-pressed="true" aria-label="Continue to the next chapter automatically" title="Auto-continue">${icon('playlist_play')}</button>`;

  const V = (id) => $(`#${id}`, player);
  const slideOf = (i) => $(`#chapter-${i}`, track);
  const C = (sel) => $(sel, slideOf(index)); // inside the current chapter's slide
  let deck = null;
  let index = -1;
  let sentences = [];
  let pos = 0;
  let playing = false;
  let playNext = false; // play the chapter as soon as its slide is reached
  let session = 0; // invalidates callbacks from cancelled speech
  let audio = null;
  let video = null; // the <video> of a film chapter
  let autoTimer = 0; // moving on to the next chapter after this one ends

  tts?.getVoices(); // starts loading voices in Chrome

  function load(i, autoplay = false) {
    stop();
    // The chapter left behind goes back to its still picture.
    if (index >= 0 && index !== i) {
      const old = chapters[index];
      $('.story-stage', slideOf(index)).innerHTML = `<img src="${esc(still(old))}" alt="${esc(old.image?.alt ?? '')}">`;
      $$('.sentence', slideOf(index)).forEach((s) => s.classList.remove('current', 'spoken'));
    }
    index = i;
    const c = chapters[i];
    sentences = splitSentences(c.narration);
    pos = 0;

    const stageEl = C('.story-stage');
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
    }
    audio = c.audio ? new Audio(c.audio) : null;
    if (audio) {
      audio.addEventListener('timeupdate', () => setProgress(audio.currentTime / (audio.duration || 1)));
      audio.addEventListener('ended', finished);
    }

    C('.s-stage').append(player);
    V('story-bar-title').textContent = c.title;
    V('story-prev').disabled = i === 0;
    V('story-next').disabled = i === chapters.length - 1;
    V('story-play').disabled = !(audio || video || tts) || Boolean(c.youtube);
    if (!tts && !audio && !video && !c.youtube) showNote('Your browser does not support spoken narration, but you can read the story here.');
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
    $$('.sentence', slideOf(index)).forEach((s) => {
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
    const el = C('.story-note');
    el.hidden = !text;
    el.textContent = text;
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
    clearTimeout(autoTimer);
    clearTimeout(watchdog);
    utterance = null;
    tts?.cancel();
    audio?.pause();
    video?.pause();
    setPlaying(false);
  }

  /** Moves to chapter i's slide; it starts playing there if `andPlay`. */
  function goChapter(i, andPlay) {
    if (i < 0 || i >= chapters.length) return;
    playNext = andPlay;
    if (deck) deck.go(i + 1); else load(i, andPlay);
  }

  function finished() {
    setPlaying(false);
    setProgress(1);
    markSentence(sentences.length);
    pos = 0;
    const auto = V('story-auto').getAttribute('aria-pressed') === 'true';
    if (auto && index < chapters.length - 1) { const next = index + 1; autoTimer = setTimeout(() => goChapter(next, true), 900); }
  }

  function setPlaying(on) {
    playing = on;
    const btn = V('story-play');
    btn.innerHTML = icon(on ? 'pause' : 'play_arrow', 'fill');
    const what = video ? 'video' : 'narration';
    btn.setAttribute('aria-label', on ? `Pause ${what}` : `Play ${what}`);
    if (index >= 0) C('.story-stage').classList.toggle('playing', on);
  }

  V('story-play').addEventListener('click', () => (playing ? stop() : play()));
  V('story-prev').addEventListener('click', () => goChapter(index - 1, playing));
  V('story-next').addEventListener('click', () => goChapter(index + 1, playing));
  V('story-rate').addEventListener('change', () => {
    if (video) video.playbackRate = Number(V('story-rate').value);
    else if (playing) { stop(); play(); }
  });
  V('story-auto').addEventListener('click', (e) => {
    const b = e.currentTarget;
    b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') !== 'true');
  });
  // Click a sentence to start reading from there.
  track.addEventListener('click', (e) => {
    const s = e.target.closest('.sentence');
    if (!s || s.closest('.static')) return;
    const i = Number(s.closest('.slide').id.replace('chapter-', ''));
    if (i !== index) load(i);
    if (audio || video || !tts) return;
    stop();
    pos = Number(s.dataset.k);
    play();
  });
  window.addEventListener('pagehide', () => tts?.cancel());

  load(0);
  return {
    onDeck(d) { deck = d; },
    // Reaching a chapter's slide gets it ready (and plays it after ◀ ▶ or auto-continue).
    onSlide(i) {
      if (i === 0) { stop(); playNext = false; return; }
      const ch = i - 1;
      if (ch !== index) load(ch, playNext);
      else if (playNext && !playing) play();
      playNext = false;
    },
    onHide: stop,
  };
}
