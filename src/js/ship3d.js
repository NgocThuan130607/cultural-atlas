// The Lạc ship drawn in 3D on the globe (sixteenth round): the model from ship-model.js, lit from over the
// viewer's shoulder, with the flame of its engines. src/js/ship.js decides where the ship is and how it leans;
// this file only places and draws it. The ship is sized in screen pixels (so it reads the same from space as over
// a city).
//
// The flame is a glowing shape on the page, laid over the globe at the ship's tail and pointing away from its
// nose, its length set by the thrust. (Cesium's particles stay where they were made in the world, so while the
// globe turns under the ship they were left far behind it; a flame fixed to the tail always reads as the ship's.)
import {
  Model, Matrix3, Matrix4, Cartesian2, Cartesian3, Color, DirectionalLight, ShadowMode, Ellipsoid, SceneTransforms,
} from 'cesium';
import { shipModelUri } from './ship-model.js';

const LENGTH = 3.95; // model units from beak to tail feathers
const TAIL = -1.5; // where the flame starts (just behind the engine collar), along the model's forward axis

/** The 3D ship for a Cesium viewer. Returns { update(state), hide() }. */
export function createShipBody(viewer, { reduced = false } = {}) {
  const { scene, camera } = viewer;
  let model = null;
  Model.fromGltfAsync({ url: shipModelUri(), shadows: ShadowMode.DISABLED, silhouetteColor: Color.fromCssColorString('#f6d98a'), silhouetteSize: 1.5 })
    .then((m) => { model = scene.primitives.add(m); model.show = false; })
    .catch((e) => console.warn('Lạc ship model', e));

  // The globe is not lit; this light only shades the ship. It comes from over the viewer's shoulder, so the
  // gold always catches it whichever way the ship faces.
  scene.light = new DirectionalLight({ direction: new Cartesian3(0, 0, -1), intensity: 2.6 });
  const lightDir = new Cartesian3();
  scene.preRender.addEventListener(() => {
    Cartesian3.multiplyByScalar(camera.directionWC, 1, lightDir);
    Cartesian3.add(lightDir, Cartesian3.multiplyByScalar(camera.rightWC, 0.45, new Cartesian3()), lightDir);
    Cartesian3.add(lightDir, Cartesian3.multiplyByScalar(camera.upWC, -0.55, new Cartesian3()), lightDir);
    scene.light.direction = Cartesian3.normalize(lightDir, lightDir);
  });

  const flame = document.createElement('div');
  flame.className = 'ship-flame';
  flame.setAttribute('aria-hidden', 'true');
  flame.innerHTML = '<i></i><i></i><i></i>';
  if (!reduced) document.body.append(flame);

  const frame = new Matrix4();
  const rot = new Matrix3();
  const scratch = new Cartesian3();
  const tailAt = new Cartesian3();
  const backAt = new Cartesian3();

  function show(on) {
    if (model) model.show = on;
    flame.classList.toggle('on', on && !reduced);
  }

  return {
    /**
     * Places the ship. `at` and `ahead` are { lon, lat, alt } (ahead gives the way the nose points); `size` is
     * its length on screen in pixels; `roll` and `pitch` are in radians; `thrust` 0 to 1 sets the flame.
     */
    update({ at, ahead, size, roll = 0, pitch = 0, thrust = 0.2, visible = true }) {
      if (!model) return;
      show(visible);
      if (!visible) return;
      const pos = Cartesian3.fromDegrees(at.lon, at.lat, at.alt);
      const up = Ellipsoid.WGS84.geodeticSurfaceNormal(pos, new Cartesian3());
      const to = Cartesian3.subtract(Cartesian3.fromDegrees(ahead.lon, ahead.lat, at.alt), pos, scratch);
      // forward along the ground (the part of "to" across the up direction)
      let forward = Cartesian3.subtract(to, Cartesian3.multiplyByScalar(up, Cartesian3.dot(to, up), new Cartesian3()), new Cartesian3());
      if (Cartesian3.magnitude(forward) < 1e-6) forward = Cartesian3.cross(Cartesian3.UNIT_Z, up, new Cartesian3());
      Cartesian3.normalize(forward, forward);
      const left = Cartesian3.cross(up, forward, new Cartesian3());
      // pitch (nose up is positive) about the left axis, then roll (right wing down is positive) about forward
      const cp = Math.cos(pitch); const sp = Math.sin(pitch);
      const f2 = Cartesian3.add(Cartesian3.multiplyByScalar(forward, cp, new Cartesian3()), Cartesian3.multiplyByScalar(up, sp, new Cartesian3()), new Cartesian3());
      const u2 = Cartesian3.subtract(Cartesian3.multiplyByScalar(up, cp, new Cartesian3()), Cartesian3.multiplyByScalar(forward, sp, new Cartesian3()), new Cartesian3());
      const cr = Math.cos(roll); const sr = Math.sin(roll);
      const l3 = Cartesian3.add(Cartesian3.multiplyByScalar(left, cr, new Cartesian3()), Cartesian3.multiplyByScalar(u2, sr, new Cartesian3()), new Cartesian3());
      const u3 = Cartesian3.subtract(Cartesian3.multiplyByScalar(u2, cr, new Cartesian3()), Cartesian3.multiplyByScalar(left, sr, new Cartesian3()), new Cartesian3());
      Matrix3.setColumn(rot, 0, f2, rot);
      Matrix3.setColumn(rot, 1, l3, rot);
      Matrix3.setColumn(rot, 2, u3, rot);
      // metres per pixel at the ship, so it is `size` pixels long wherever it is
      const dist = Cartesian3.distance(camera.positionWC, pos);
      const mpp = camera.frustum.getPixelDimensions(scene.drawingBufferWidth, scene.drawingBufferHeight, dist, scene.pixelRatio, new Cartesian2()).y;
      const scale = (size * mpp) / LENGTH; // mpp is per CSS pixel already (pixelRatio given above)
      Matrix4.fromRotationTranslation(rot, pos, frame);
      model.modelMatrix = Matrix4.multiplyByUniformScale(frame, scale, new Matrix4());
      if (reduced) return;
      // The flame: from the engine collar, backwards along the ship's own axis
      Cartesian3.add(pos, Cartesian3.multiplyByScalar(f2, TAIL * scale, scratch), tailAt);
      Cartesian3.add(pos, Cartesian3.multiplyByScalar(f2, (TAIL - 1) * scale, scratch), backAt);
      const a = SceneTransforms.worldToWindowCoordinates(scene, tailAt);
      const b = SceneTransforms.worldToWindowCoordinates(scene, backAt);
      if (!a || !b) { flame.classList.remove('on'); return; }
      const unit = Math.hypot(b.x - a.x, b.y - a.y); // pixels per model unit, foreshortened
      const turn = Math.atan2(b.y - a.y, b.x - a.x);
      const long = unit * (0.5 + thrust * 2.6);
      flame.style.setProperty('--w', `${Math.max(6, size * 0.11 * (0.8 + thrust * 0.5)).toFixed(1)}px`);
      flame.style.width = `${long.toFixed(1)}px`;
      flame.style.transform = `translate3d(${a.x.toFixed(1)}px, ${a.y.toFixed(1)}px, 0) rotate(${turn.toFixed(3)}rad)`;
      flame.style.opacity = (0.55 + thrust * 0.45).toFixed(2);
    },
    hide() {
      show(false);
      scene.requestRender();
    },
  };
}
