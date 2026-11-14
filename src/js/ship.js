// The Lạc ship (fifteenth round of user feedback): a small spaceship in the shape of the Lạc bird of the Đông
// Sơn drums, drawn in the same gold engraving as the motifs. It lives on the home page as the visitor's guide:
//
// - cruise: it hovers over the part of the globe in view. Since the sixteenth round it keeps its place on screen
//   while the globe is turned, so the ground slides beneath it: it turns its nose the way it is "flying",
//   banks into the turns, and its engines burn brighter the faster the globe spins.
// - flying: when a city is chosen it flies there along the great circle while the globe turns to the city,
//   pulling the gold thread behind it as its trail, then comes down over the city as the camera zooms in.
// - landed: it hovers low over the city while its card is open; two rings of light spread from the ground.
//
// The ship has a real position on the Earth (longitude, latitude, height). Each frame that position is
// projected to the screen by the view (the 3D globe or the 2D map, see `nav` in pages/globe.js), so the ship
// stays locked to the ground through every turn, zoom and flight of the camera. On the 3D globe the ship is a
// real 3D model (ship3d.js, ship-model.js) given by the view as `shipBody`; on the 2D map it is the drawing below.
import { prefersReducedMotion } from './common.js';

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

// The drawing: nose to the right. Bold outline, finer inner lines, a lacquer-dark body so the gold reads over
// bright deserts as well as dark seas. The long beak is the nose, the red eye the cockpit, the crest of three
// plumes and the spread wings are the bird's, the band of tangent circles is from the drums, and the three long
// tail feathers are the engines.
const ART = `
<svg viewBox="-10 0 130 64" focusable="false" aria-hidden="true">
  <defs><linearGradient id="ship-gold" gradientUnits="userSpaceOnUse" x1="0" y1="4" x2="118" y2="60">
    <stop offset="0" stop-color="#fff0c2"/><stop offset=".5" stop-color="#ebc56a"/><stop offset="1" stop-color="#b8892f"/></linearGradient></defs>
  <g class="flames">
    <path d="M18 22.4L18 25.6L-2 23Z"/><path d="M14 30.2L14 33.8L-9 32Z"/><path d="M18 38.4L18 41.6L-2 41Z"/>
  </g>
  <g class="hull">
    <path class="w2" d="M56 21.6Q46 10 24 4Q35 14 41 24.4Z"/><path class="w2" d="M56 42.4Q46 54 24 60Q35 50 41 39.6Z"/>
    <path class="w2" d="M36 32C44 20 66 18 84 24L117 30L84 37C66 43 46 44 36 32Z"/>
  </g>
  <path class="w0" d="M50 17.5L33 8.6M46 20L31 12.4M50 46.5L33 55.4M46 44L31 51.6"/>
  <path class="w2" d="M38.5 29L18 24M36 32H14M38.5 35L18 40"/><path d="M18 22V26M14 30V34M18 38V42"/>
  <path d="M84 24Q88 30.5 84 37"/><path class="w0" d="M88 30.6H112"/>
  <path d="M60 21.4Q63.4 31 60 41.6M53 22.6Q56.4 31.4 53 41.4"/>
  <circle class="w0" cx="57" cy="26.6" r="1.5"/><circle class="w0" cx="57.8" cy="31.4" r="1.5"/><circle class="w0" cx="57" cy="36.4" r="1.5"/>
  <path class="w0" d="M43 37.4l3.4-3.4M47.6 39.4l4-4M65 40.4l4-4M70 39.6l3.6-3.6M75 38.4l3-3"/>
  <path d="M75 22.2Q71 13 62 10.4q-2.4-.4-2 1.6M71 21.6Q68 15.4 60.4 14.6q-2-.2-1.6 1.4M67.4 21.4Q65 18.6 59.6 18.6"/>
  <circle class="w2" cx="77" cy="28.6" r="4.2"/><circle class="eye" cx="77" cy="28.6" r="2.3"/>
</svg>`;

/**
 * Starts the ship. `view()` returns the current view (it can change from the globe to the 2D map), which gives
 * project(lat, lon, alt), pick(x, y), viewHeight(), onFrame(cb), trail() and `linear` (true on the flat map).
 * `area()` is the part of the screen left free by the panel and the controls, `avoid()` the places whose pins the
 * hovering ship keeps clear of. `start` is a place to appear over.
 * Returns { flyTo(place, opts), cruise(), bind(), leave(), resume() }.
 */
export function createShip({ view, area, avoid = () => [], start = null }) {
  const reduced = prefersReducedMotion();
  const el = document.createElement('div');
  el.className = 'ship';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = ART;
  const shadow = document.createElement('div');
  shadow.className = 'ship-shadow';
  shadow.setAttribute('aria-hidden', 'true');
  document.body.append(shadow, el);


  let mode = 'cruise';
  let pos = null; // { v: unit vector, alt: metres }
  let prev = null; // the position one frame ago
  let flight = null;
  let angle = -0.14; // the way the nose points on screen: a little up, facing right
  let roll = 0;
  let thrust = 0.2;
  let last = performance.now();
  let free = null;
  let scr = null; // where the ship was on screen last frame
  let spotAt = null; // cruise: the ship's place on screen, eased towards the chosen spot
  let under = null; // cruise: the ground that was under that place last frame
  let leaving = false;
  const rings = [];
  const setMode = (m) => { mode = m; el.dataset.state = m; };
  setMode('cruise');

  const move = (v) => (v.linear ? lerpLL : slerp);

  // Places on screen where the ship may hover, as fractions of the free area. Twice a second it looks for the
  // one furthest from the city pins (so it never sits on a city or its name), and only moves for a clearly
  // better one.
  const SPOTS = [[0.5, 0.2], [0.74, 0.27], [0.28, 0.25], [0.82, 0.52], [0.62, 0.42], [0.5, 0.5]];
  let spot = 0;
  let chosenAt = -1e9;
  function chooseSpot(v, now) {
    if (now - chosenAt < 500) return;
    chosenAt = now;
    free = area();
    const w = free.right - free.left;
    const h = free.bottom - free.top;
    const pins = avoid().map((c) => v.project(c.lat, c.lon, 0)).filter((p) => p.visible);
    const score = (i) => {
      const x = free.left + w * SPOTS[i][0];
      const y = free.top + h * SPOTS[i][1];
      if (!v.pick(x, y)) return -1; // off the globe
      // the ship is wider than tall, so sideways distance counts for less
      return Math.min(260, ...pins.map((p) => Math.hypot((p.x - x) * 0.7, p.y - y))) - i * 4;
    };
    let best = spot;
    let bestScore = score(spot) + 45; // stay unless another is clearly better
    SPOTS.forEach((_, i) => { const s = i === spot ? -2 : score(i); if (s > bestScore) { best = i; bestScore = s; } });
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
    const body = v.shipBody ?? null;
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
    // Banks into its turns and comes level again in about 0.4 s
    const turning = (((angle - before + Math.PI * 3) % (Math.PI * 2)) - Math.PI) / dt; // radians a second
    roll = reduced ? 0 : mix(roll, clamp(turning * 0.22, -0.75, 0.75) + clamp(speed / 14, 0, 0.25) * Math.sin(now / 300), 1 - Math.exp(-dt / 0.12));
    thrust = reduced ? 0 : mix(thrust, clamp((mode === 'flying' ? 0.45 : 0.18) + speed / 9, 0.18, 1), 1 - Math.exp(-dt / 0.12));

    const still = 1 - clamp(speed / 3, 0, 1);
    const bob = reduced ? 0 : Math.sin(now / 520) * 4 * still;
    const rise = mode === 'cruise' ? 0 : 26 * (flight ? ease(clamp((now - flight.t0) / (flight.dur || 1), 0, 1)) : 1); // clear of the pin and its name
    const shown = p.visible && p.x > -60 && p.y > -60 && p.x < innerWidth + 60 && p.y < innerHeight + 60;
    scr = shown ? { x: p.x, y: p.y - rise + bob } : null;
    const zoom = clamp((Math.log10(Math.max(height, 1)) - 4.5) / 2.8, 0, 1); // 0 over a city, 1 from space
    const size = Math.round(body ? (innerWidth < 768 ? 70 : 112) + (innerWidth < 768 ? 22 : 34) * zoom : (innerWidth < 768 ? 96 : 112) + 22 * zoom);
    lastSize = size;

    if (body) {
      // The 3D ship (ship3d.js), its nose towards the ground a short way along its heading on screen. It is
      // drawn where it really is (no lift on screen), and breathes by pitching gently while it hovers.
      el.classList.remove('on');
      if (shown) scr = { x: p.x, y: p.y };
      const ahead = v.pick(g.x + Math.cos(angle) * 40, g.y + Math.sin(angle) * 40);
      const pitch = reduced ? 0 : (mode === 'flying' ? -0.12 : 0.06) - clamp(speed / 16, 0, 0.18) + Math.sin(now / 700) * 0.06 * still;
      body.update({ at: { ...ll, alt: pos.alt }, ahead: ahead ?? { lon: ll.lon + 0.01, lat: ll.lat }, size, roll, pitch, thrust, visible: shown && !!ahead });
    } else {
      el.classList.toggle('on', shown);
      if (shown) {
        el.style.width = `${size}px`;
        el.style.setProperty('--thrust', thrust.toFixed(2));
        el.style.transform = `translate3d(${scr.x.toFixed(1)}px, ${scr.y.toFixed(1)}px, 0) translate(-50%, -50%) rotate(${angle.toFixed(3)}rad) scaleY(${left ? -1 : 1})`;
      }
    }
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
  let lastSize = 120;

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
     * Just before the page is left for a city's or landmark's page: the 3D ship gives way to its flat drawing at
     * the same place on screen, named for the page change (src/inline/view-transitions.js), so it can fly into
     * the gold drawing on the next page's cover.
     */
    leave() {
      leaving = true;
      view()?.shipBody?.hide();
      const left = Math.cos(angle) < 0;
      // where it was, kept on screen (the camera may have come down past it)
      const x = clamp(scr?.x ?? innerWidth / 2, lastSize, innerWidth - lastSize);
      const y = clamp(scr?.y ?? innerHeight / 2, lastSize * 0.6, innerHeight - lastSize * 0.6);
      el.style.width = `${lastSize}px`;
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -50%) rotate(${angle.toFixed(3)}rad) scaleY(${left ? -1 : 1})`;
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
