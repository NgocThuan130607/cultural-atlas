// The Lạc ship as a 3D model (sixteenth round), built here as a glTF 2.0 file in memory, so the site still needs
// no model file to download and still opens from disk. Shapes, in glTF's axes (+Z forward, +Y up, ±X the sides):
// a slim body turned on a lathe, its long nose the Lạc bird's beak; two swept wings; a crest of three plumes;
// three long tail feathers that are the engines; a band round the body like the rings of the Đông Sơn drums;
// a cockpit bubble that is the bird's red eye. Gold metal for the bird, black lacquer for the body.

const GOLD = { baseColorFactor: [1, 0.7, 0.22, 1], metallicFactor: 1, roughnessFactor: 0.32, emissive: [0.2, 0.12, 0.02] };
const LACQUER = { baseColorFactor: [0.09, 0.055, 0.04, 1], metallicFactor: 0.35, roughnessFactor: 0.22, emissive: [0.03, 0.015, 0.01] };
const SON = { baseColorFactor: [0.9, 0.16, 0.1, 1], metallicFactor: 0.1, roughnessFactor: 0.35, emissive: [0.75, 0.1, 0.06] };

class Mesh {
  constructor() { this.p = []; this.i = []; }
  vert(x, y, z) { this.p.push(x, y, z); return this.p.length / 3 - 1; }
  tri(a, b, c) { this.i.push(a, b, c); }
  quad(a, b, c, d) { this.tri(a, b, c); this.tri(a, c, d); }
  /** A flat-shaded closed slab: an outline (x, z points, in order) given a thickness, raised by y(x, z). */
  slab(outline, thick, y = () => 0) {
    const top = outline.map(([x, z]) => this.vert(x, y(x, z) + thick / 2, z));
    const bot = outline.map(([x, z]) => this.vert(x, y(x, z) - thick / 2, z));
    for (let k = 1; k < outline.length - 1; k++) { this.tri(top[0], top[k], top[k + 1]); this.tri(bot[0], bot[k + 1], bot[k]); }
    for (let k = 0; k < outline.length; k++) {
      const n = (k + 1) % outline.length;
      const [x1, z1] = outline[k]; const [x2, z2] = outline[n];
      // the side walls get their own corners, so they shade flat
      const a = this.vert(x1, y(x1, z1) + thick / 2, z1); const b = this.vert(x2, y(x2, z2) + thick / 2, z2);
      const c = this.vert(x2, y(x2, z2) - thick / 2, z2); const d = this.vert(x1, y(x1, z1) - thick / 2, z1);
      this.quad(a, d, c, b);
    }
  }
  /** A body of revolution along z: `rings` is [z, radius]; the cross-section is an ellipse (sx wide, sy tall). */
  lathe(rings, seg, sx = 1, sy = 1, cy = 0) {
    const start = this.p.length / 3;
    for (const [z, r] of rings) for (let s = 0; s < seg; s++) {
      const a = (s / seg) * Math.PI * 2;
      this.vert(Math.cos(a) * r * sx, cy + Math.sin(a) * r * sy, z);
    }
    for (let k = 0; k < rings.length - 1; k++) for (let s = 0; s < seg; s++) {
      const a = start + k * seg + s; const b = start + k * seg + ((s + 1) % seg);
      const c = start + (k + 1) * seg + ((s + 1) % seg); const d = start + (k + 1) * seg + s;
      this.quad(a, b, c, d);
    }
    // close both ends
    for (const [k, flip] of [[0, true], [rings.length - 1, false]]) {
      const [z] = rings[k];
      const centre = this.vert(0, cy, z);
      for (let s = 0; s < seg; s++) {
        const a = start + k * seg + s; const b = start + k * seg + ((s + 1) % seg);
        if (flip) this.tri(centre, b, a); else this.tri(centre, a, b);
      }
    }
  }
  sphere(cx, cy, cz, r, seg = 14) {
    const start = this.p.length / 3;
    for (let la = 0; la <= seg; la++) for (let lo = 0; lo < seg; lo++) {
      const t = (la / seg) * Math.PI; const f = (lo / seg) * Math.PI * 2;
      this.vert(cx + r * Math.sin(t) * Math.cos(f), cy + r * Math.cos(t), cz + r * Math.sin(t) * Math.sin(f));
    }
    for (let la = 0; la < seg; la++) for (let lo = 0; lo < seg; lo++) {
      const a = start + la * seg + lo; const b = start + la * seg + ((lo + 1) % seg);
      const c = start + (la + 1) * seg + ((lo + 1) % seg); const d = start + (la + 1) * seg + lo;
      this.quad(a, d, c, b);
    }
  }
  /** A ring round the z axis (a torus). */
  torus(z, R, r, sx, sy, cy, seg = 28, tube = 8) {
    const start = this.p.length / 3;
    for (let s = 0; s < seg; s++) for (let t = 0; t < tube; t++) {
      const a = (s / seg) * Math.PI * 2; const b = (t / tube) * Math.PI * 2;
      const rr = R + Math.cos(b) * r;
      this.vert(Math.cos(a) * rr * sx, cy + Math.sin(a) * rr * sy, z + Math.sin(b) * r);
    }
    for (let s = 0; s < seg; s++) for (let t = 0; t < tube; t++) {
      const a = start + s * tube + t; const b = start + s * tube + ((t + 1) % tube);
      const c = start + ((s + 1) % seg) * tube + ((t + 1) % tube); const d = start + ((s + 1) % seg) * tube + t;
      this.quad(a, b, c, d);
    }
  }
  /** Smooth normals (each vertex: the sum of its faces' normals). Flat parts have their own vertices. */
  normals() {
    const n = new Float32Array(this.p.length);
    for (let k = 0; k < this.i.length; k += 3) {
      const [a, b, c] = [this.i[k], this.i[k + 1], this.i[k + 2]];
      const ax = this.p[b * 3] - this.p[a * 3]; const ay = this.p[b * 3 + 1] - this.p[a * 3 + 1]; const az = this.p[b * 3 + 2] - this.p[a * 3 + 2];
      const bx = this.p[c * 3] - this.p[a * 3]; const by = this.p[c * 3 + 1] - this.p[a * 3 + 1]; const bz = this.p[c * 3 + 2] - this.p[a * 3 + 2];
      const nx = ay * bz - az * by; const ny = az * bx - ax * bz; const nz = ax * by - ay * bx;
      for (const v of [a, b, c]) { n[v * 3] += nx; n[v * 3 + 1] += ny; n[v * 3 + 2] += nz; }
    }
    for (let v = 0; v < n.length; v += 3) {
      const l = Math.hypot(n[v], n[v + 1], n[v + 2]) || 1;
      n[v] /= l; n[v + 1] /= l; n[v + 2] /= l;
    }
    return n;
  }
}

function build() {
  const body = new Mesh();
  const gold = new Mesh();
  const son = new Mesh();
  // Body: from the tail (z −1.0) to the tip of the beak (z 1.75)
  body.lathe([[-1.0, 0.06], [-0.92, 0.17], [-0.7, 0.26], [-0.35, 0.33], [0, 0.34], [0.35, 0.3], [0.62, 0.24], [0.85, 0.15]], 28, 0.9, 1);
  gold.lathe([[0.85, 0.15], [1.05, 0.1], [1.3, 0.06], [1.55, 0.03], [1.78, 0.004]], 20, 0.8, 0.9, -0.02); // the beak
  gold.torus(0.06, 0.345, 0.035, 0.9, 1, 0); // the drum band
  gold.torus(-0.5, 0.31, 0.025, 0.9, 1, 0);
  // Wings: swept back, a little raised at the tips, curved trailing edge
  const wing = (s) => [[0.25 * s, 0.32], [0.95 * s, -0.25], [1.55 * s, -0.78], [1.32 * s, -0.86], [0.8 * s, -0.6], [0.25 * s, -0.55]];
  for (const s of [1, -1]) gold.slab(wing(s), 0.05, (x) => Math.abs(x) * 0.16 - 0.04);
  // Feather lines on the wings (thin raised ribs)
  for (const s of [1, -1]) for (const k of [0, 1, 2]) {
    const x0 = (0.45 + k * 0.28) * s; const z0 = 0.05 - k * 0.27;
    gold.slab([[x0, z0], [x0 + 0.42 * s, z0 - 0.42], [x0 + 0.39 * s, z0 - 0.45], [x0 - 0.03 * s, z0 - 0.03]], 0.09, (x) => Math.abs(x) * 0.16 - 0.03);
  }
  // Crest of three plumes on the back, sweeping backwards: slabs standing upright (in the y–z plane)
  const vslab = (pts, thick) => {
    const m = gold;
    const top = pts.map(([y, z]) => m.vert(thick / 2, y, z));
    const bot = pts.map(([y, z]) => m.vert(-thick / 2, y, z));
    for (let k = 1; k < pts.length - 1; k++) { m.tri(top[0], top[k + 1], top[k]); m.tri(bot[0], bot[k], bot[k + 1]); }
    for (let k = 0; k < pts.length; k++) {
      const n = (k + 1) % pts.length;
      const a = m.vert(thick / 2, pts[k][0], pts[k][1]); const b = m.vert(thick / 2, pts[n][0], pts[n][1]);
      const c = m.vert(-thick / 2, pts[n][0], pts[n][1]); const d = m.vert(-thick / 2, pts[k][0], pts[k][1]);
      m.quad(a, b, c, d);
    }
  };
  for (const k of [0, 1, 2]) {
    const z = 0.5 - k * 0.2; const h = 0.68 - k * 0.1;
    vslab([[0.25, z], [h, z - 0.16], [h + 0.04, z - 0.3], [0.27, z - 0.2]], 0.04);
  }
  // Three tail feathers = the engines, fanning out behind
  for (const a of [-0.24, 0, 0.24]) {
    const c = Math.cos(a); const s = Math.sin(a);
    const pts = [[0.05, -0.85], [0.06, -1.95], [0, -2.15], [-0.06, -1.95], [-0.05, -0.85]].map(([x, z]) => [x * c + (z + 0.85) * s, z]);
    gold.slab(pts, 0.05, (x, z) => -0.02 + Math.abs(a) * 0.1 * (-(z + 0.85)));
  }
  gold.lathe([[-0.9, 0.1], [-1.0, 0.13], [-1.08, 0.1]], 16, 1, 1, 0); // the engine's collar
  // The eye / cockpit
  son.sphere(0, 0.2, 0.62, 0.11);
  return [[body, LACQUER], [gold, GOLD], [son, SON]];
}

/** The glTF of the ship as a data URI (JSON with its buffer inside). */
export function shipModelUri() {
  const parts = build();
  const chunks = [];
  const bufferViews = [];
  const accessors = [];
  const primitives = [];
  const materials = [];
  let offset = 0;
  const addView = (array, target) => {
    const bytes = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
    const pad = (4 - (bytes.length % 4)) % 4;
    chunks.push(bytes, new Uint8Array(pad));
    bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: bytes.length, target });
    offset += bytes.length + pad;
    return bufferViews.length - 1;
  };
  parts.forEach(([mesh, mat], k) => {
    const pos = new Float32Array(mesh.p);
    const nrm = mesh.normals();
    const idx = new Uint32Array(mesh.i);
    const min = [Infinity, Infinity, Infinity]; const max = [-Infinity, -Infinity, -Infinity];
    for (let v = 0; v < pos.length; v += 3) for (let c = 0; c < 3; c++) { min[c] = Math.min(min[c], pos[v + c]); max[c] = Math.max(max[c], pos[v + c]); }
    accessors.push({ bufferView: addView(pos, 34962), componentType: 5126, count: pos.length / 3, type: 'VEC3', min, max });
    accessors.push({ bufferView: addView(nrm, 34962), componentType: 5126, count: nrm.length / 3, type: 'VEC3' });
    accessors.push({ bufferView: addView(idx, 34963), componentType: 5125, count: idx.length, type: 'SCALAR' });
    materials.push({ pbrMetallicRoughness: { baseColorFactor: mat.baseColorFactor, metallicFactor: mat.metallicFactor, roughnessFactor: mat.roughnessFactor }, emissiveFactor: mat.emissive, doubleSided: true });
    primitives.push({ attributes: { POSITION: k * 3, NORMAL: k * 3 + 1 }, indices: k * 3 + 2, material: k });
  });
  const all = new Uint8Array(offset);
  let at = 0;
  for (const c of chunks) { all.set(c, at); at += c.length; }
  let bin = '';
  for (let k = 0; k < all.length; k += 0x8000) bin += String.fromCharCode(...all.subarray(k, k + 0x8000));
  const gltf = {
    asset: { version: '2.0', generator: 'Atlas of Stories - Lac ship' },
    scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0 }],
    meshes: [{ primitives }], materials, accessors, bufferViews,
    buffers: [{ byteLength: all.length, uri: `data:application/octet-stream;base64,${btoa(bin)}` }],
  };
  return `data:model/gltf+json;base64,${btoa(JSON.stringify(gltf))}`;
}
