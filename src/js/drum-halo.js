// The rings of a Đông Sơn bronze drum around the globe (twenty-second round): the globe sits where the star sits
// at the centre of the drum's face, and faint gold rings go round it as they go round the star: a fine line and
// a band of tangent circles with their dots, which turns very slowly. (Twenty-third round: two more rings, comb
// teeth and a line of dots, were taken out and the rest made fainter, so the page is calmer.)
//
// The rings are a page layer over the globe's canvas (under the panels), placed every frame on the globe's disc
// as it is seen: its centre and its size come from the camera, so the rings stay round the Earth as it is
// turned, zoomed or flown. They fade out once the globe fills the screen, and are not used on the 2D map.
// Each ring is its own layer turned by CSS, so turning costs nothing; reduced motion stops it (main.scss).
import { Cartesian3, SceneTransforms } from 'cesium';

const R_EARTH = 6_378_137;
const DISC = 300; // the globe's radius in the drawing's units
const VB = 420; // the drawing spans −VB…VB, so it is 2·VB/DISC times the globe's radius across
const f1 = (n) => n.toFixed(1);
const svg = (body) => `<svg viewBox="${-VB} ${-VB} ${VB * 2} ${VB * 2}" focusable="false">${body}</svg>`;
const around = (n, r, fn) => Array.from({ length: n }, (_, k) => { const a = (k / n) * Math.PI * 2; return fn(Math.cos(a) * r, Math.sin(a) * r, a); }).join('');

/** The band of tangent circles, each with a dot, between two lines (as on the drum). */
function tangentBand(r, size) {
  const n = Math.round((Math.PI * 2 * r) / (size * 2.1));
  return `<circle r="${r - size - 2.5}" stroke-width=".9"/><circle r="${r + size + 2.5}" stroke-width=".9"/>${around(n, r, (x, y) => `<circle cx="${f1(x)}" cy="${f1(y)}" r="${size}" stroke-width=".8"/><circle cx="${f1(x)}" cy="${f1(y)}" r="1.2" fill="currentColor" stroke="none"/>`)}`;
}

/** Starts the rings for a Cesium viewer. Returns { hide() }. */
export function createDrumHalo(viewer) {
  const { scene, camera } = viewer;
  const el = document.createElement('div');
  el.className = 'drum-halo';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = `<div class="halo-in">
    <div class="ring">${svg('<circle r="318" stroke-width="1.1"/>')}</div>
    <div class="ring turn">${svg(tangentBand(338, 6.5))}</div>
  </div>`;
  document.body.append(el);

  const scratch = { w: new Cartesian3(), v: new Cartesian3(), p: new Cartesian3(), t: new Cartesian3() };
  /** A point where a line from the camera grazes the Earth, on the side given by v (across the line of sight). */
  function limb(E, w, axis, sign, sinA, cosA, L) {
    const { v, p, t } = scratch;
    Cartesian3.multiplyByScalar(w, Cartesian3.dot(axis, w), t);
    Cartesian3.subtract(axis, t, v);
    Cartesian3.normalize(v, v);
    Cartesian3.multiplyByScalar(w, cosA, p);
    Cartesian3.add(p, Cartesian3.multiplyByScalar(v, sign * sinA, t), p);
    Cartesian3.multiplyByScalar(p, L, p);
    Cartesian3.add(E, p, p);
    return SceneTransforms.worldToWindowCoordinates(scene, p);
  }

  let last = '';
  let shown = false;
  function place() {
    const E = camera.positionWC;
    const d = Cartesian3.magnitude(E);
    let vis = 0;
    let box = null;
    if (d > R_EARTH * 1.02) {
      const w = Cartesian3.normalize(Cartesian3.negate(E, scratch.w), scratch.w);
      const sinA = R_EARTH / d;
      const cosA = Math.sqrt(1 - sinA * sinA);
      const L = Math.sqrt(d * d - R_EARTH * R_EARTH);
      const right = limb(E, w, camera.rightWC, 1, sinA, cosA, L)?.clone();
      const left = limb(E, w, camera.rightWC, -1, sinA, cosA, L)?.clone();
      const top = limb(E, w, camera.upWC, 1, sinA, cosA, L)?.clone();
      const bottom = limb(E, w, camera.upWC, -1, sinA, cosA, L)?.clone();
      if (right && left && top && bottom) {
        const rx = Math.abs(right.x - left.x) / 2;
        const ry = Math.abs(bottom.y - top.y) / 2;
        box = { cx: (right.x + left.x) / 2, cy: (top.y + bottom.y) / 2, rx, ry };
        // whole at a globe as tall as 70% of the screen, gone once it is as tall as 95% of it
        vis = Math.max(0, Math.min(1, (0.95 - (ry * 2) / innerHeight) / 0.25));
      }
    }
    if (!box || vis <= 0) {
      if (shown) { el.style.visibility = 'hidden'; shown = false; last = ''; }
      return;
    }
    const size = (box.rx * 2 * VB) / DISC;
    const key = `${box.cx.toFixed(1)} ${box.cy.toFixed(1)} ${size.toFixed(1)} ${(box.ry / box.rx).toFixed(3)} ${vis.toFixed(2)}`;
    if (key === last) return;
    last = key;
    if (!shown) { el.style.visibility = 'visible'; shown = true; }
    el.style.width = `${size.toFixed(1)}px`;
    el.style.height = `${size.toFixed(1)}px`;
    el.style.opacity = vis.toFixed(2);
    el.style.transform = `translate3d(${(box.cx - size / 2).toFixed(1)}px, ${(box.cy - size / 2).toFixed(1)}px, 0) scaleY(${(box.ry / box.rx).toFixed(3)})`;
  }
  scene.postRender.addEventListener(place);
  return {
    hide() { scene.postRender.removeEventListener(place); el.remove(); },
  };
}
