// Shared helpers for the motif drawings (src/js/motifs.js and src/js/motif-art/*.js). Drawings use a
// 100 × 100 box; see motifs.js for the line-weight and movement classes.

export const f = (v) => +v.toFixed(1);
export const each = (n, fn) => Array.from({ length: n }, (_, i) => fn(i)).join('');
export const polar = (cx, cy, r, a) => [f(cx + r * Math.cos(a)), f(cy + r * Math.sin(a))];

/** Parallel lines across a box, for hatching: "/" and "\" diagonals, "-" across, "|" down. */
export function lines(x0, y0, x1, y1, step, dir) {
  const h = y1 - y0, out = [];
  if (dir === '-') for (let y = y0; y <= y1; y += step) out.push(`M${f(x0)} ${f(y)}H${f(x1)}`);
  else if (dir === '|') for (let x = x0; x <= x1; x += step) out.push(`M${f(x)} ${f(y0)}V${f(y1)}`);
  else for (let x = x0 - h; x <= x1; x += step) out.push(dir === '/' ? `M${f(x)} ${f(y1)}L${f(x + h)} ${f(y0)}` : `M${f(x)} ${f(y0)}L${f(x + h)} ${f(y1)}`);
  return out.join('');
}
/** Hatching clipped to a shape, like the shading of an engraving. */
export const hatch = (id, shape, box, step = 2.4, dir = '/') =>
  `<clipPath id="@${id}"><path d="${shape}"/></clipPath><path class="w0 hatch" clip-path="url(#@${id})" d="${lines(...box, step, dir)}"/>`;
/** Small arcs in rows, for scales and feathers. */
export const scales = (pts, r = 2.2) => pts.map(([x, y]) => `M${f(x - r)} ${f(y)}a${r} ${r} 0 0 0 ${f(2 * r)} 0`).join('');
/** A steam or smoke curl rising from (x, y). */
export const curl = (x, y, h = 26, s = 1) => `M${x} ${y}q${-5 * s} ${-h * 0.25} 0 ${-h * 0.5}t0 ${-h * 0.5}`;

/** A row of gentle waves across the box at height y. */
export const water = (y, x0 = -4, x1 = 104, w = 12, a = 3) => {
  let d = `M${x0} ${y}`; for (let x = x0; x < x1; x += w) d += `q${w / 4} ${-a} ${w / 2} 0t${w / 2} 0`; return d;
};
/** The eave line of a Vietnamese roof from x0 to x1 at height y: a slight sag, the ends turned up. */
export const roof = (x0, x1, y, h, curl = 5) => {
  const m = (x0 + x1) / 2;
  return `M${x0} ${y}Q${m} ${f(y + h * 0.12)} ${x1} ${y}Q${x1 + curl * 0.8} ${y - curl * 0.4} ${x1 + curl} ${y - curl * 1.2}M${x0} ${y}Q${x0 - curl * 0.8} ${y - curl * 0.4} ${x0 - curl} ${y - curl * 1.2}`;
};
/** Tiles along a roof line: short strokes under the curve. */
export const tiles = (x0, x1, y, h, n = 10, len = 3.4) => each(n + 1, (i) => {
  const t = i / n, x = x0 + (x1 - x0) * t, yy = y + (h * 0.12) * 4 * t * (1 - t) * 0.5;
  return `M${f(x)} ${f(yy)}l-0.8 ${-len}`;
});
/** A limestone peak: rounded, steep, slightly leaning. */
export const peak = (x, base, w, h, lean = 0) =>
  `M${f(x - w / 2)} ${base}Q${f(x - w / 2 + 1)} ${f(base - h * 0.7)} ${f(x - w * 0.18 + lean)} ${f(base - h * 0.95)}Q${f(x + lean)} ${f(base - h * 1.04)} ${f(x + w * 0.18 + lean)} ${f(base - h * 0.92)}Q${f(x + w / 2 - 1)} ${f(base - h * 0.65)} ${f(x + w / 2)} ${base}`;
