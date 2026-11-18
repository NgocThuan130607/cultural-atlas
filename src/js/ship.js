// The guide on the home page: the Lạc bird of the Đông Sơn drums (fifteenth round of user feedback; a 3D model in
// the sixteenth and seventeenth; since the eighteenth a drawing again, seen from the side as on the drums and in
// gold-on-bronze engraving, with the cloud scrolls of the motifs as its wake):
//
// - cruise: it hovers over the part of the globe in view. Since the sixteenth round it keeps its place on screen
//   while the globe is turned, so the ground slides beneath it: it faces the way it is flying (turned left or
//   right, its beak never tipped more than 30°), and beats its wings harder and faster the faster the globe turns
//   (at rest it glides, the wings barely moving). Gold cloud scrolls stream out behind it (ship-clouds.js).
// - flying: when a city is chosen it flies there along the great circle while the globe turns to the city,
//   pulling the gold thread behind it as its trail, then comes down over the city as the camera zooms in.
// - landed: it hovers low over the city while its card is open; two rings of light spread from the ground.
//
// The ship has a real position on the Earth (longitude, latitude, height). Each frame that position is
// projected to the screen by the view (the 3D globe or the 2D map, see `nav` in pages/globe.js), so the ship
// stays locked to the ground through every turn, zoom and flight of the camera, on the 3D globe and the 2D map
// alike. (The files keep the name "ship" from the fifteenth round.)
import { prefersReducedMotion } from './common.js';
import { createClouds } from './ship-clouds.js';

const RAD = Math.PI / 180;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const mix = (a, b, t) => a + (b - a) * t;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const toVec = (lon, lat) => [Math.cos(lat * RAD) * Math.cos(lon * RAD), Math.cos(lat * RAD) * Math.sin(lon * RAD), Math.sin(lat * RAD)];
const toLL = ([x, y, z]) => ({ lon: Math.atan2(y, x) / RAD, lat: Math.asin(clamp(z, -1, 1)) / RAD });
const angleBetween = (a, b) => Math.acos(clamp(a[0] * b[0] + a[1] * b[1] + a[2] * b[2], -1, 1));
/** A point on the great circle from a to b (unit vectors). */
function slerp(a, b, t) {
  const w = angleBetween(a, b);
  const s = Math.sin(w);
  if (w < 1e-7 || s < 1e-7) return t < 1 ? a : b;
  const k1 = Math.sin((1 - t) * w) / s;
  const k2 = Math.sin(t * w) / s;
  return [a[0] * k1 + b[0] * k2, a[1] * k1 + b[1] * k2, a[2] * k1 + b[2] * k2];
}
/** On the flat map the ship moves in straight lines on the map instead (a great circle could leave by one edge). */
const lerpLL = (a, b, t) => toVec(mix(toLL(a).lon, toLL(b).lon, t), mix(toLL(a).lat, toLL(b).lat, t));
/** The part of a flight's time in which the globe turns to the place; the camera comes down in the rest. */
export const TRAVEL = 0.6;
const turnTo = (from, to, k) => from + (((to - from + Math.PI * 3) % (Math.PI * 2)) - Math.PI) * k;

// The drawing (eighteenth round): the Lạc bird seen from the side, beak to the right, in bronze (a gradient fill)
// engraved with gold lines. A long straight beak, a small round head with a big round eye, a flag of a crest
// with a drum sun, a long curved neck with the drums' chain of tangent circles, a slim body with chevrons, a
// fan of long tail feathers, thin legs trailing behind; the near wing rises up and back, long striped feathers
// with a fringe along its edge, and the far wing shows below the body. Each wing turns at its shoulder (--flap,
// in degrees, set each frame) as it beats. 200 × 100 units; the tail ends at x 6, the beak at x 199.
const SUN = (x, y) => `<circle cx="${x}" cy="${y}" r="2.6"/><path class="w0" d="${Array.from({ length: 8 }, (_, i) => { const a = (i * Math.PI) / 4; return `M${(x + Math.cos(a) * 3.4).toFixed(1)} ${(y + Math.sin(a) * 3.4).toFixed(1)}L${(x + Math.cos(a) * 5.4).toFixed(1)} ${(y + Math.sin(a) * 5.4).toFixed(1)}`; }).join('')}"/>`;
const CHAIN = [[145, 43], [140, 48.5], [134, 53], [127, 56.5], [120, 59]].map(([x, y]) => `<circle class="w0" cx="${x}" cy="${y}" r="2.5"/>`).join('');
const ART = `
<svg viewBox="0 0 200 100" focusable="false" aria-hidden="true">
  <defs><linearGradient id="ship-gold" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="200" y2="100">
    <stop offset="0" stop-color="#fff0c2"/><stop offset=".5" stop-color="#ebc56a"/><stop offset="1" stop-color="#c79a3e"/></linearGradient>
    <linearGradient id="ship-bronze" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="40" y2="100">
    <stop offset="0" stop-color="#d19a5a"/><stop offset=".5" stop-color="#9a6234"/><stop offset="1" stop-color="#5c331a"/></linearGradient></defs>
  <g class="wing-far">
    <path class="bronze dim" d="M106 64C98 74 86 82 72 88C62 92 50 94 38 94C48 90 54 86 58 82C70 78 82 72 92 63Z"/>
    <path class="w0" d="M98 68L48 91M92 66L58 84M86 66L66 78"/>
  </g>
  <path class="bronze" d="M62 56L14 40L6 56L10 70L22 82L64 68Z"/>
  <path class="w0" d="M60 58L14 42M60 61L8 56M60 64L11 69M61 67L22 80"/><path class="w0" d="M34 47l5 6l-6 4M30 58l6 3l-6 4M32 70l5 3l-6 3"/>
  <path class="w0" d="M86 71L42 86l-6 1M86 71L42 86l-4 4M93 71L52 91l-6 0M93 71L52 91l-4 4"/>
  <path class="bronze w2" d="M56 60C68 50 100 49 122 55C125 61 121 68 112 70C92 74 70 72 56 60Z"/>
  <path class="w0" d="M72 56l6 5.5l-6 5.5M82 55l6 6l-6 6M92 55l6 6l-6 6M102 55.5l5 5.5l-5 5.5"/>
  <path class="bronze w2" d="M140 35C134 46 126 53 112 55.5L115 66C131 64 143 55 151 39Z"/>${CHAIN}
  <path class="bronze" d="M141 25L110 13Q115 22 112 31L139 34Z"/>${SUN(125, 25)}
  <path class="beak" d="M154 26.5L199 12.5L156 33Z"/><path class="w0" d="M156 29.6L196 14"/>
  <circle class="bronze w2" cx="148" cy="31" r="9"/><circle cx="149.5" cy="29.5" r="4.6"/><circle class="dot" cx="150" cy="29.2" r="2"/>
  <g class="wing-near">
    <path class="bronze w2" d="M110 54C106 38 98 26 88 18C70 10 46 6 22 6C28 10 32 13 36 15C32 16 30 18 30 20C38 22 44 23 50 24C46 26 45 28 46 30C56 32 62 33 68 34C64 37 64 40 66 42C74 44 82 48 88 56Z"/>
    <path class="w0" d="M104 48C90 26 60 12 26 8M100 50C88 32 66 20 34 17M96 51C86 38 72 28 50 24M92 53C84 44 76 38 68 35"/>
    <path class="w0" d="M88 56l-3 4M80 49l-3.6 3M72 43l-3.8 2.4M62 33l-3 3M54 30l-3.4 2.4M44 24l-3 3M36 20l-3.4 2"/>
  </g>
</svg>`;

/**
 * Starts the ship. `view()` returns the current view (it can change from the globe to the 2D map), which gives
 * project(lat, lon, alt), pick(x, y), viewHeight(), onFrame(cb), trail() and `linear` (true on the flat map).
 * `area()` is the part of the screen left free by the panel and the controls, `avoid()` the places whose pins the
 * hovering ship keeps clear of. `start` is a place to appear over. While `paused()` is true the bird is put away (its
 * shadow and clouds too) and stops flying; it comes back hovering over the view (twenty-first round: it is put
 * away in the Through time mode).
 * Returns { flyTo(place, opts), cruise(), bind(), leave(), resume() }.
 */
export function createShip({ view, area, avoid = () => [], start = null, paused = () => false }) {
  const reduced = prefersReducedMotion();
  const el = document.createElement('div');
  el.className = 'ship';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = ART;
  const shadow = document.createElement('div');
  shadow.className = 'ship-shadow';
  shadow.setAttribute('aria-hidden', 'true');
  document.body.append(shadow, el);
  const clouds = reduced ? null : createClouds();

  let mode = 'cruise';
  let pos = null; // { v: unit vector, alt: metres }
  let prev = null; // the position one frame ago
  let flight = null;
  let angle = -0.14; // the way the nose points on screen: a little up, facing right
  let roll = 0;
  let thrust = 0.2; // how hard it flies, 0 to 1: sets the beat of the wings and the clouds
  let flapPhase = 0;
  let last = performance.now();
  let free = null;
  let scr = null; // where the ship was on screen last frame
  let spotAt = null; // cruise: the ship's place on screen, eased towards the chosen spot
  let under = null; // cruise: the ground that was under that place last frame
  let leaving = false;
  let away = false; // put away while paused()
  const rings = [];
  const setMode = (m) => { mode = m; el.dataset.state = m; };
  setMode('cruise');

  const move = (v) => (v.linear ? lerpLL : slerp);

  // Places on screen where the ship may hover, as fractions of the free area. Twice a second it looks for the
  // one furthest from the city pins (so it never sits on a city or its name), and only moves for a clearly
  // better one.
  // Thirty-sixth round: the spots are gathered round the middle of the globe (they used to reach out to the
  // edges of the free area, so the bird wandered off towards the corners), and the nearer the middle the better.
  const SPOTS = [[0.5, 0.42], [0.62, 0.36], [0.38, 0.36], [0.62, 0.5], [0.38, 0.5], [0.5, 0.3], [0.5, 0.56], [0.66, 0.6], [0.34, 0.6]];
  let spot = 0;
  let chosenAt = -1e9;
  function chooseSpot(v, now) {
    if (now - chosenAt < 500) return;
    chosenAt = now;
    free = area();
    const w = free.right - free.left;
    const h = free.bottom - free.top;
    const pins = avoid().map((c) => v.project(c.lat, c.lon, 0)).filter((p) => p.visible);
    // Thirty-sixth round: as near the middle of the globe as it can be without covering a city's pin or name;
    // covering one rules a spot out (the pull to the middle used to win over a name now and then).
    const room = (i) => {
      const x = free.left + w * SPOTS[i][0];
      const y = free.top + h * SPOTS[i][1];
      if (!v.pick(x, y)) return -1; // off the globe
      // Thirty-fifth round: the room between the bird with the gold clouds streaming out behind it and each pin
      // with its name to its right (it used to be measured from the pin alone, so a cloud could brush a name).
      const bird = { l: x - 150, r: x + 70, t: y - 40, b: y + 35 };
      return Math.min(220, ...pins.map((p) => Math.hypot(Math.max(0, bird.l - (p.x + 105), p.x - 12 - bird.r),
        Math.max(0, bird.t - (p.y + 14), p.y - 14 - bird.b))));
    };
    const score = (i) => {
      const r = room(i);
      if (r < 0) return -1000;
      return (r < 8 ? -300 : r * 0.5) - Math.hypot((SPOTS[i][0] - 0.5) * w, (SPOTS[i][1] - 0.46) * h) * 0.35;
    };
    let best = spot;
    let bestScore = score(spot) + (room(spot) >= 8 ? 30 : 0); // stay unless another is clearly better
    SPOTS.forEach((_, i) => { if (i === spot) return; const s = score(i); if (s > bestScore) { best = i; bestScore = s; } });
    spot = best;
  }

  function land(now) {
    flight.trail?.end();
    const withRings = flight.land && !reduced;
    const at = toLL(flight.to);
    flight = null;
    setMode('landed');
    if (!withRings) return;
    for (const delay of [0, 260]) {
      const r = document.createElement('div');
      r.className = 'ship-ring';
      r.style.animationDelay = `${delay}ms`;
      document.body.append(r);
      rings.push({ el: r, at, until: now + 1400 + delay });
    }
  }

  function frame() {
    const v = view();
    if (!v || leaving) return;
    if (paused()) {
      if (!away) { away = true; el.classList.remove('on'); shadow.classList.remove('on'); clouds?.clear(); }
      return;
    }
    if (away) { away = false; last = performance.now(); prev = null; spotAt = null; under = null; }
    const now = performance.now();
    const dt = clamp((now - last) / 1000, 0.001, 0.05);
    last = now;
    const height = v.viewHeight();
    const hover = clamp(height * 0.045, 300, 700_000);
    let drift = null; // cruise: how the ground slid under the ship this frame, on screen

    if (mode === 'flying' && flight) {
      // The ship crosses to the place along the great circle while the globe turns to it (the first TRAVEL part
      // of the time, in step with the camera's own flight in pages/globe.js), then waits over the place and comes
      // down as the camera does. It never flies higher than a small part of the camera's own height.
      const u = flight.dur ? clamp((now - flight.t0) / flight.dur, 0, 1) : 1;
      const across = ease(Math.min(1, u / TRAVEL));
      const high = mix(flight.fromAlt, flight.toAlt, ease(u)) + Math.sin(Math.PI * across) * flight.lift;
      pos = { v: move(v)(flight.from, flight.to, across), alt: Math.min(high, Math.max(flight.toAlt, height * 0.06)) };
      const ll = toLL(pos.v);
      if (!flight.there) flight.trail?.push(ll.lon, ll.lat, pos.alt); // the thread ends where the ship arrives
      flight.there = across >= 1;
      if (u >= 1) land(now);
    } else if (mode === 'cruise') {
      // Sixteenth round, "the ship leads, the ground slides beneath": the ship keeps its place on screen and is
      // put over whatever ground is there each frame, so a turn of the globe reads as the ship flying over it.
      // Its place only moves (smoothly) when another spot is chosen, away from the city pins.
      chooseSpot(v, now);
      if (free) {
        const tx = free.left + (free.right - free.left) * SPOTS[spot][0];
        const ty = free.top + (free.bottom - free.top) * SPOTS[spot][1];
        if (!spotAt) spotAt = scr ? { ...scr } : { x: tx, y: ty };
        const k = reduced ? 1 : 1 - Math.exp(-dt / 0.45);
        spotAt.x = mix(spotAt.x, tx, k);
        spotAt.y = mix(spotAt.y, ty, k);
        const ground = v.pick(spotAt.x, spotAt.y);
        if (ground) {
          if (under) {
            const was = v.project(under.lat, under.lon, 0);
            if (was.visible) drift = { x: was.x - spotAt.x, y: was.y - spotAt.y };
          }
          under = ground;
          const alt = pos ? mix(pos.alt, hover, k) : hover;
          pos = { v: toVec(ground.lon, ground.lat), alt };
        } else under = null;
      }
      if (!pos && start) pos = { v: toVec(start.lon, start.lat), alt: hover };
    }
    if (!pos) return;

    const ll = toLL(pos.v);
    const p = v.project(ll.lat, ll.lon, pos.alt);
    const g = v.project(ll.lat, ll.lon, 0);
    // Which way the ship is going, as seen on screen: in cruise against the ground's slide (the ground going
    // left means the ship flies right over it), otherwise its own movement.
    let speed = 0;
    let dx = 0;
    let dy = 0;
    if (drift) { dx = -drift.x; dy = -drift.y; }
    else if (prev && p.visible && mode !== 'cruise') {
      const pl = toLL(prev.v);
      const q = v.project(pl.lat, pl.lon, prev.alt);
      if (q.visible) { dx = p.x - q.x; dy = p.y - q.y; }
    }
    speed = Math.hypot(dx, dy) / (dt * 60); // pixels per frame at 60 fps
    prev = pos;
    const before = angle;
    if (speed > 0.3 && !reduced) angle = turnTo(angle, Math.atan2(dy, dx), 1 - Math.exp(-dt / 0.16));
    const left = Math.cos(angle) < 0;
    if (speed <= 0.3 && !reduced) angle = turnTo(angle, left ? Math.PI + 0.14 : -0.14, 1 - Math.exp(-dt / 0.5)); // settles level, nose a little up
    // Leans into its turns (a dip of the beak, seen from the side) and comes level again in about 0.4 s
    const turning = (((angle - before + Math.PI * 3) % (Math.PI * 2)) - Math.PI) / dt; // radians a second
    roll = reduced ? 0 : mix(roll, clamp(turning * 0.22, -0.75, 0.75) + clamp(speed / 14, 0, 0.25) * Math.sin(now / 300), 1 - Math.exp(-dt / 0.12));
    thrust = reduced ? 0 : mix(thrust, clamp((mode === 'flying' ? 0.45 : 0.18) + speed / 9, 0.18, 1), 1 - Math.exp(-dt / 0.12));
    // The wings: a slow, shallow beat while it glides, deeper and faster the harder it flies
    const effort = clamp((thrust - 0.18) / 0.6, 0, 1);
    flapPhase += Math.PI * 2 * mix(0.45, 1.8, effort) * dt;
    const beat = reduced ? 0 : mix(6, 28, effort) * Math.sin(flapPhase); // degrees

    const still = 1 - clamp(speed / 3, 0, 1);
    const bob = reduced ? 0 : Math.sin(now / 520) * 4 * still - beat * 0.08; // it rises a touch on each down-beat
    const rise = mode === 'cruise' ? 0 : 26 * (flight ? ease(clamp((now - flight.t0) / (flight.dur || 1), 0, 1)) : 1); // clear of the pin and its name
    const shown = p.visible && p.x > -60 && p.y > -60 && p.x < innerWidth + 60 && p.y < innerHeight + 60;
    scr = shown ? { x: p.x, y: p.y - rise + bob } : null;
    const zoom = clamp((Math.log10(Math.max(height, 1)) - 4.5) / 2.8, 0, 1); // 0 over a city, 1 from space
    const size = Math.round(innerWidth < 768 ? 64 + 10 * zoom : 100 + 15 * zoom);
    lastSize = size;

    // Seen from the side, the bird only turns to face left or right; its beak tips up or down by at most 30°.
    const facing = pose();
    el.classList.toggle('on', shown);
    if (shown) {
      el.style.width = `${size}px`;
      el.style.setProperty('--flap', beat.toFixed(2));
      el.style.transform = place(scr.x, scr.y, facing);
    }
    // the clouds leave from the end of the tail: the drawing is 200 units wide, its centre at (100, 50)
    const k = size / 200;
    const lx = -96 * k; const ly = 10 * k * facing.flip;
    const from = shown ? { x: scr.x + lx * Math.cos(facing.turn) - ly * Math.sin(facing.turn), y: scr.y + lx * Math.sin(facing.turn) + ly * Math.cos(facing.turn) } : null;
    clouds?.step(dt, from, facing.turn + Math.PI, thrust, size);
    const gap = g.visible ? Math.hypot(p.x - g.x, p.y - rise - g.y) : 0;
    shadow.classList.toggle('on', shown && g.visible && gap > 18);
    if (g.visible) {
      shadow.style.width = `${Math.round(size * 0.5)}px`;
      shadow.style.transform = `translate3d(${g.x.toFixed(1)}px, ${g.y.toFixed(1)}px, 0) translate(-50%, -50%)`;
      shadow.style.opacity = shown && gap > 18 ? clamp(0.5 - gap / 500, 0.14, 0.42).toFixed(2) : '';
    }
    for (let i = rings.length - 1; i >= 0; i--) {
      const r = rings[i];
      if (now > r.until) { r.el.remove(); rings.splice(i, 1); continue; }
      const c = v.project(r.at.lat, r.at.lon, 0);
      r.el.style.display = c.visible ? '' : 'none';
      if (c.visible) { r.el.style.left = `${c.x.toFixed(1)}px`; r.el.style.top = `${c.y.toFixed(1)}px`; }
    }
  }
  let lastSize = 110;
  /** How the drawing is turned: facing left or right (flip), the beak tipped by at most 30° and the lean. */
  function pose() {
    const left = Math.cos(angle) < 0;
    const tip = clamp((((angle - (left ? Math.PI : 0) + Math.PI * 3) % (Math.PI * 2)) - Math.PI) + roll * 0.25 * (left ? -1 : 1), -0.52, 0.52);
    return { flip: left ? -1 : 1, turn: (left ? Math.PI : 0) + tip };
  }
  const place = (x, y, { flip, turn }) => `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -50%) rotate(${turn.toFixed(3)}rad) scaleY(${flip})`;

  let unbind = null;
  /** (Re)attaches the ship to the current view; called again if the globe gives way to the 2D map. */
  function bind() {
    unbind?.();
    unbind = view()?.onFrame(frame) ?? null;
  }
  bind();
  setTimeout(() => el.classList.add('ready'), reduced ? 0 : 900); // appears once the opening move is under way

  return {
    bind,
    /**
     * Flies to a place in `duration` seconds (the camera's own flight time) and hovers `hoverAlt` metres above it.
     * `trail`: pull a gold thread behind; `land`: rings of light on arrival.
     */
    flyTo(place, { duration = 2.4, hoverAlt = 2_400, trail = true, land: withRings = true } = {}) {
      const v = view();
      const to = toVec(place.lon, place.lat);
      flight?.trail?.end();
      spotAt = null;
      under = null;
      if (!v || !pos || reduced) { // nothing to fly from (or no motion wanted): be there
        pos = { v: to, alt: hoverAlt };
        prev = null;
        flight = null;
        setMode('landed');
        return;
      }
      const far = angleBetween(pos.v, to) * 6_371_000;
      if (far < 200 && mode === 'landed') return; // already here
      flight = {
        from: pos.v, fromAlt: pos.alt, to, toAlt: hoverAlt, t0: performance.now(), dur: duration * 1000, land: withRings,
        lift: Math.min(500_000, far * 0.06),
        trail: trail && far > 40_000 ? v.trail?.() ?? null : null, // no thread to a landmark in the same city
      };
      setMode('flying');
    },
    /** Back to hovering over whatever part of the globe is in view. */
    cruise() {
      flight?.trail?.end();
      flight = null;
      spotAt = null;
      under = null;
      setMode('cruise');
    },
    /**
     * Just before the page is left for a city's or landmark's page: the bird is pinned where it is on screen and
     * named for the page change (src/inline/view-transitions.js), so it flies into the gold drawing on the next
     * page's cover.
     */
    leave() {
      leaving = true;
      clouds?.clear();
      // where it was, kept on screen (the camera may have come down past it)
      const x = clamp(scr?.x ?? innerWidth / 2, lastSize, innerWidth - lastSize);
      const y = clamp(scr?.y ?? innerHeight / 2, lastSize * 0.6, innerHeight - lastSize * 0.6);
      el.style.width = `${lastSize}px`;
      el.style.transform = place(x, y, pose());
      el.style.transition = 'none';
      el.classList.add('ready', 'on');
      el.setAttribute('data-vt-ship', '');
    },
    /** Back from the browser's page cache: the ship flies again. */
    resume() {
      leaving = false;
      el.removeAttribute('data-vt-ship');
      el.style.transition = '';
      last = performance.now();
    },
  };
}
