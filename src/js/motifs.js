// Symbol motifs on the slides (tenth round of user feedback, pilot: Hà Nội and the Hồ Chí Minh Mausoleum).
// Each motif is a gold drawing in the manner of an engraving on bronze: a bold outline, finer inner lines and
// hatching, in a gold that shades from light to bronze. It draws itself in, layer by layer, when its slide
// arrives, catches a glint of light, drifts against the sideways movement of the slides, then keeps a slow
// movement of its own (lotus petals breathe, steam curls up, a lantern swings). Which motifs a slide shows is
// set in the data (`motifs` fields); a slide without them shows none.
//
// Drawings use a 100 × 100 box. Line weights: class "w2" is the bold outline, no class the main lines, "w0" fine
// detail and hatching. "son" is drawn in son red, "fill" is a filled area ("soft": faint), "dot" a filled point.
// Parts with class "lp", "lp2", "lp3" carry the idle movements. "@" in an id is replaced by the drawing's own id.

import { f, each, polar, hatch, scales, curl } from './motif-art/helpers.js';
import { WORLD } from './motif-art/world.js';
import { NORTH } from './motif-art/north.js';
import { CENTRAL } from './motif-art/central.js';
import { SOUTH } from './motif-art/south.js';
import { THEMES } from './motif-art/themes.js';

// The Lý dragon of Thăng Long ("Ascending Dragon"): a slim, scaled, snake-like body in S-curves rising from the
// river, a crest of flame-like mane, the mouth reaching for a pearl. The body is worked out from a centre line.
function dragon() {
  const pts = [[6, 92], [22, 84], [12, 66], [30, 56], [52, 64], [62, 46], [50, 34], [62, 22], [74, 28]];
  const at = (t) => {
    const n = pts.length - 1, i = Math.min(n - 1, Math.floor(t * n)), u = t * n - i;
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n, i + 2)];
    const c = (a, b, c2, d) => 0.5 * (2 * b + (-a + c2) * u + (2 * a - 5 * b + 4 * c2 - d) * u * u + (-a + 3 * b - 3 * c2 + d) * u * u * u);
    return [c(p0[0], p1[0], p2[0], p3[0]), c(p0[1], p1[1], p2[1], p3[1])];
  };
  const N = 60, top = [], bot = [], mid = [], nrm = [];
  for (let k = 0; k <= N; k++) {
    const t = k / N, [x, y] = at(t), [x2, y2] = at(Math.min(1, t + 0.01)), [x0, y0] = at(Math.max(0, t - 0.01));
    const dx = x2 - x0, dy = y2 - y0, l = Math.hypot(dx, dy) || 1, w = 0.5 + 5.2 * Math.pow(t, 0.75);
    const nx = -dy / l, ny = dx / l;
    top.push([x + nx * w, y + ny * w]); bot.push([x - nx * w, y - ny * w]); mid.push([x, y]); nrm.push([nx, ny, w]);
  }
  const line = (a) => 'M' + a.map(([x, y]) => `${f(x)} ${f(y)}`).join('L');
  const sc = [], fin = [];
  for (let k = 6; k < N - 3; k += 2) { const [x, y] = mid[k], [nx, ny, w] = nrm[k]; sc.push([x + nx * w * 0.35, y + ny * w * 0.35]); if (k % 4 === 0) sc.push([x - nx * w * 0.4, y - ny * w * 0.4]); }
  for (let k = 8; k < N - 4; k += 4) { const [x, y] = top[k], [nx, ny] = nrm[k]; fin.push(`M${f(x)} ${f(y)}l${f(nx * 3.4 + 1)} ${f(ny * 3.4 - 1)}l${f(-nx * 1.5 + 1.2)} ${f(-ny * 1.5)}`); }
  const leg = (k) => { const [x, y] = bot[k]; return `M${f(x)} ${f(y)}q4 3 5 8M${f(x + 5)} ${f(y + 8)}l3 0M${f(x + 5)} ${f(y + 8)}l1.5 2.6M${f(x + 5)} ${f(y + 8)}l-1 2.8`; };
  return `<path class="w0" d="M0 97q8-4 16 0t16 0 16 0 16 0"/><path class="w0" d="M8 92q6-3 12 0t12 0"/>
    <g class="lp"><path class="w2" d="${line(top)}"/><path class="w2" d="${line(bot)}"/>
    <path class="w0" d="${scales(sc, 1.5)}"/><path d="${fin.join('')}"/><path d="${leg(18)}${leg(36)}"/>
    <path class="w2" d="M72 24Q82 18 94 23Q88 27 93 31Q83 35 72 33"/><path class="w0" d="M76 30Q82 29 88 31"/>
    <circle class="dot son" cx="81" cy="25.5" r="1.5"/><path d="M71 23Q64 12 72 4M75 22Q74 11 83 7M79 21Q82 13 90 13"/>
    <g class="lp2"><path class="w0" d="M93 24Q99 18 98 9M92 30Q99 34 99 42"/></g></g>
    <circle class="w2" cx="94" cy="47" r="3.6"/><path class="w0" d="M94 43.4Q91 39 94 36Q97 39 94 43.4"/><circle class="dot son" cx="94" cy="47" r="1.2"/>`;
}

// The two arcs of the Thê Húc bridge, for its railing
const arc = (x) => 4 * ((x - 6) / 88) * (1 - (x - 6) / 88);
const bridgeTop = (x) => f(64 - 19 * arc(x)), bridgeLow = (x) => f(71 - 18.5 * arc(x));

const M = {
  // ---------- Shared ----------
  // The Lạc bird of the Đông Sơn drums: long open beak, crest of three plumes, spread wing, long tail feathers
  'chim-lac': { loop: 'glide', svg: `<g class="lp">
    <path class="w2" d="M20.5 41L1 46.5L20.5 44.5"/><circle class="w2" cx="24.5" cy="42" r="4.4"/><circle class="dot" cx="25.2" cy="41.4" r="1.2"/>
    <path d="M24 37.6Q19 27 27 19M26.4 37.8Q25.5 27.5 34 22M28.6 39Q31 31 39 29"/>
    <path class="w2" d="M28.5 46Q44 37 62 43Q70 46 77 47Q66 54 50 55.5Q36 55.5 28.5 46Z"/>
    <path class="w0" d="${scales([[36, 48], [41, 47], [46, 46.5], [51, 47], [56, 48], [39, 51.5], [44, 51], [49, 51], [54, 51.5], [60, 50]], 1.8)}"/>
    <path class="w2" d="M40 44Q40 22 60 9Q59 21 67 26Q58 34 55 45"/>
    <path class="w0" d="M44 43.5L51.5 17M47.5 44L56 14M51 44.5L60.5 20M43 30L48 31M42 36L47 37"/>
    <path d="M75 47Q87 39 99 28M77 48Q89 45 100 40M77 49.5Q89 53 99 57.5M75 51Q85 59 92 69"/>
    <path class="w0" d="M83 42l-1 -3M88 37.5l-1.4 -2.6M93 33l-1.6 -2.2M84 46.6l-.6 -2.6M90 44.8l-.4 -2.6M84 52.6l.4 2.8M90 54.8l.2 2.8M82 59.4l1.8 2M87 64l1.8 1.6"/>
    <path d="M44 55L41 66M41 66l-3 2M41 66l1 3M52 55.5L52 66M52 66l-3 2M52 66l2 2.6"/></g>` },
  // Cloud scroll (vân mây), drawn as a double line with curled ends
  'van-may': { loop: 'bob', svg: `<g class="lp">
    <path class="w2" d="M8 64Q6 44 25 43Q39 43 39 55Q39 64 30 64Q22 64 22 57Q22 51 28 51"/>
    <path class="w2" d="M39 55Q40 31 60 31Q78 31 78 48Q78 60 66 60Q57 60 57 52Q57 46 63 46"/>
    <path class="w0" d="M12 63Q11 48 25 47Q35 47 35 55M43 54Q45 35 60 35Q74 35 74 48"/>
    <path class="w2" d="M4 70H82Q95 70 95 61Q95 53 87 53Q81 53 81 58"/><path class="w0" d="M8 74H80Q90 74 92 68"/>
    <path class="w0" d="M84 61q3 0 3-3"/></g>` },
  lotus: { loop: 'lotus', svg: `
    <path class="w2" d="M50 70Q53 84 47 98"/><path class="w0" d="M51 76l2-1M50.6 83l2 .6M49.4 90l2 1"/>
    <g class="lp"><path class="w2" d="M50 70Q20 74 8 56Q30 52 50 70"/><path class="w0" d="M44 66Q30 62 16 58M40 68Q30 66 22 64"/></g>
    <g class="lp2"><path class="w2" d="M50 70Q80 74 92 56Q70 52 50 70"/><path class="w0" d="M56 66Q70 62 84 58M60 68Q70 66 78 64"/></g>
    <g class="lp3"><path class="w2" d="M50 70Q28 63 24 38Q42 44 50 70"/><path class="w2" d="M50 70Q72 63 76 38Q58 44 50 70"/>
    <path class="w0" d="M47 64Q36 54 30 44M44 66Q34 60 28 52M53 64Q64 54 70 44M56 66Q66 60 72 52"/></g>
    <path class="w2" d="M50 24Q63 46 50 70Q37 46 50 24"/><path class="w0" d="M50 30V64M46 40Q47 54 50 64M54 40Q53 54 50 64"/>
    <path d="M41 54Q50 49 59 54"/><path class="w0" d="${each(5, (i) => `M${43 + i * 3.5} 54.5v-2.6`)}"/>
    <circle class="dot son" cx="50" cy="38" r="1.4"/>` },
  'lotus-leaf': { loop: 'sway', svg: `
    <path class="w2" d="M6 76Q10 64 30 62Q50 60 70 62Q92 64 95 76Q90 88 66 90Q50 92 32 90Q10 88 6 76Z"/>
    <path class="w0" d="M50 77L12 74M50 77L22 66M50 77L40 62M50 77L60 62M50 77L80 66M50 77L90 74M50 77L80 87M50 77L50 91M50 77L20 86"/>
    <circle cx="50" cy="77" r="2.4"/><path class="w0" d="M10 80q4 3 8 2M88 81q-4 3-8 2"/>
    <g class="lp"><path class="w2" d="M66 63Q64 50 66 40"/><path class="w2" d="M66 40Q55 30 60 14Q66 22 66 40Q66 22 72 14Q77 30 66 40"/>
    <path class="w0" d="M66 36V18M62 32Q61 24 62 18M70 32Q71 24 70 18"/></g>
    <path class="w0" d="M4 96q8-3 16 0t16 0M60 97q8-3 16 0t16 0"/>` },
  // The face of a Đông Sơn bronze drum: the 14-ray star, Lạc birds flying round it, rings of tangent circles and combs
  drum: { loop: 'turn', svg: `<circle class="w2" cx="50" cy="50" r="48"/><circle class="w0" cx="50" cy="50" r="45.5"/>
    <circle cx="50" cy="50" r="38"/><circle class="w0" cx="50" cy="50" r="36"/><circle cx="50" cy="50" r="22"/><circle class="w0" cx="50" cy="50" r="20"/>
    <path class="w0" d="${each(24, (i) => { const a = i * Math.PI / 12, [x, y] = polar(50, 50, 41.8, a), [x2, y2] = polar(50, 50, 41.8, a + Math.PI / 12); return `M${x} ${y}L${x2} ${y2}`; })}"/>
    ${each(24, (i) => { const [x, y] = polar(50, 50, 41.8, i * Math.PI / 12); return `<circle class="w0" cx="${x}" cy="${y}" r="2.3"/><circle class="dot" cx="${x}" cy="${y}" r=".7"/>`; })}
    <path class="w0" d="${each(56, (i) => { const a = i * Math.PI / 28, [x, y] = polar(50, 50, 20, a), [x2, y2] = polar(50, 50, 22, a); return `M${x} ${y}L${x2} ${y2}`; })}"/>
    <g class="lp">${each(6, (i) => { const a = i * Math.PI / 3, [x, y] = polar(50, 50, 29, a), d = (a * 180 / Math.PI + 90).toFixed(0); return `<path transform="rotate(${d} ${x} ${y})" d="M${x - 6} ${y}l3 -1.6l3 1q2 -3 5 -4l-1 3l3 .6l-3 1.4" />`; })}</g>
    <path class="w2" d="${each(14, (i) => { const a = -Math.PI / 2 + i * Math.PI / 7, b = a + Math.PI / 14, [x, y] = polar(50, 50, 18, a), [x2, y2] = polar(50, 50, 6, b), [x3, y3] = polar(50, 50, 18, a + Math.PI / 7); return `${i ? 'L' : 'M'}${x} ${y}L${x2} ${y2}${i === 13 ? `L${x3} ${y3}Z` : ''}`; })}"/>
    <circle class="fill soft" cx="50" cy="50" r="6"/><circle cx="50" cy="50" r="3"/>` },
  ripples: { loop: 'ripple', svg: `<g class="lp"><ellipse class="w2" cx="50" cy="62" rx="46" ry="12"/><ellipse cx="50" cy="62" rx="35" ry="9"/>
    <ellipse class="w0" cx="50" cy="62" rx="25" ry="6.4"/><ellipse class="w0" cx="50" cy="62" rx="15" ry="3.8"/></g>
    <path class="w0" d="M14 78h10M70 80h14M32 84h8M58 46h10M24 50h7"/>
    <path class="w2" d="M62 56Q70 50 80 54Q74 56 76 60Q68 62 62 56Z"/><path class="w0" d="M70 56l-6-1.4M70 56l6-2.6"/>` },

  // ---------- Hà Nội ----------
  // The red Thê Húc bridge over Hoàn Kiếm Lake, with its lattice railing and the posts at its ends
  'the-huc': { loop: 'ripple', svg: `<path class="son w2" d="M6 64Q50 26 94 64"/><path class="son w2" d="M6 71Q50 34 94 71"/>
    <path class="son w0" d="${each(15, (i) => { const x = 10 + i * 5.7; return `M${f(x)} ${bridgeTop(x)}L${f(x)} ${bridgeLow(x)}`; })}"/>
    <path class="son w0" d="${each(14, (i) => { const x = 10 + i * 5.7, x2 = x + 5.7; return `M${f(x)} ${bridgeTop(x)}L${f(x2)} ${bridgeLow(x2)}M${f(x)} ${bridgeLow(x)}L${f(x2)} ${bridgeTop(x2)}`; })}"/>
    <path class="son" d="M6 64V80M94 64V80M3 62h6M91 62h6M20 59V80M80 59V80"/><path class="son w0" d="M18 57h4M78 57h4"/>
    <g class="lp"><path d="M2 86q6-3 12 0t12 0 12 0 12 0 12 0 12 0 12 0 12 0"/><path class="w0" d="M10 92q6-3 12 0t12 0 12 0 12 0 12 0 12 0"/>
    <path class="w0" d="M24 97q5-2 10 0t10 0M58 97q5-2 10 0t10 0"/></g>` },
  // The Turtle Tower (Tháp Rùa) on its islet in Hoàn Kiếm Lake: three tiers, arched doors, curved eaves
  'turtle-tower': { loop: 'ripple', svg: `
    ${hatch('a', 'M30 81V60H70V81Z', [30, 60, 70, 81], 3, '-')}${hatch('b', 'M36 60V47H64V60Z', [36, 47, 64, 60], 3, '-')}
    <path class="w2" d="M30 81V60H70V81"/><path class="w2" d="M36 60V47H64V60"/><path class="w2" d="M42 47V37H58V47"/>
    <path class="w2" d="M44 81V70Q50 63 56 70V81"/><path d="M33.5 76V69Q36 66 38.5 69V76M61.5 76V69Q64 66 66.5 69V76M47 60V54Q50 50 53 54V60M47.5 47V42.5Q50 40 52.5 42.5V47"/>
    <path class="w2" d="M23 60Q50 57 77 60Q80 59 82 55M23 60Q20 59 18 55"/><path class="w2" d="M30 47Q50 44 70 47Q73 46 74 43M30 47Q27 46 26 43"/>
    <path class="w2" d="M38 37L50 24L62 37Z"/><path class="w0" d="M42 37L50 28L58 37M44 33h12"/><path d="M50 24V14"/><circle class="dot son" cx="50" cy="12.5" r="2"/>
    <path class="w2" d="M10 85Q30 79 50 80Q70 79 90 85Q70 89 50 88Q30 89 10 85Z"/><path class="w0" d="M18 84l2-3M26 82.4l1-3M74 82.4l-1-3M82 84l-2-3"/>
    <g class="lp"><path d="M14 92q6-3 12 0t12 0 12 0 12 0 12 0 12 0"/><path class="w0" d="M28 97q5-2 10 0t10 0 10 0 10 0"/></g>` },
  compass: { loop: 'tick', svg: `<circle class="w2" cx="50" cy="50" r="40"/><circle class="w0" cx="50" cy="50" r="37"/><circle cx="50" cy="50" r="30"/>
    <path class="w0" d="${each(72, (i) => { const a = i * Math.PI / 36, [x, y] = polar(50, 50, 37, a), [x2, y2] = polar(50, 50, i % 9 === 0 ? 31 : 34.5, a); return `M${x} ${y}L${x2} ${y2}`; })}"/>
    <g class="lp"><path class="w0" d="M50 26L54 46L74 50L54 54L50 74L46 54L26 50L46 46Z" transform="rotate(45 50 50)"/>
    <path class="w2" d="M50 6L56 44L94 50L56 56L50 94L44 56L6 50L44 44Z"/>
    <path class="fill soft" d="M50 6L56 44L50 50ZM94 50L56 56L50 50ZM50 94L44 56L50 50ZM6 50L44 44L50 50Z"/>
    <path class="fill son" d="M50 6L56 44L50 50L44 44Z"/><circle class="w2" cx="50" cy="50" r="3.4"/></g>
    <path class="w0" d="M47 2V-3.5l6 5.5V-3.5"/>` },
  route: { loop: 'bob', svg: `<path class="w0" d="M4 30q10-6 20 0t20 0M56 82q10-6 20 0t20 0M8 60h14M70 30h20M60 40h12"/>
    <path class="w2" d="M8 88Q22 56 42 68Q62 80 66 52Q70 30 84 30"/><path class="w0" d="M10 91Q25 61 42 72Q64 85 70 52Q74 34 84 34"/>
    <circle class="w2" cx="8" cy="88" r="3.6"/><circle class="dot" cx="8" cy="88" r="1.2"/><circle cx="42" cy="68" r="2.4"/><circle cx="66" cy="50" r="2.4"/>
    <g class="lp"><path class="w2" d="M84 30Q72 16 76 8Q84 -2 92 8Q96 16 84 30Z"/><circle cx="84" cy="12" r="4.6"/><circle class="dot son" cx="84" cy="12" r="2.2"/></g>` },
  // A silk lantern of the Old Quarter: crown, ribbed body, patterned bands, tassel
  lantern: { loop: 'lantern', svg: `<g class="lp"><path d="M50 0V14"/><path class="w2" d="M40 14H60L57 19H43Z"/><path class="w0" d="M44 16.5h12"/>
    <ellipse class="fill son soft" cx="50" cy="41" rx="21" ry="22"/><ellipse class="w2" cx="50" cy="41" rx="21" ry="22"/>
    <path d="M50 19V63M39.5 21Q31 41 39.5 61M60.5 21Q69 41 60.5 61"/><path class="w0" d="M44.5 19.6Q40 41 44.5 62.4M55.5 19.6Q60 41 55.5 62.4"/>
    <path class="w0" d="M31 32Q50 38 69 32M31 50Q50 56 69 50"/><path class="w0" d="${each(10, (i) => `M${31.5 + i * 3.8} ${f(34.4 + Math.sin(i) * .4)}l1.9 -2.6l1.9 2.6`)}"/>
    <path class="w2" d="M42 63H58L55 68H45Z"/>
    <g class="lp2"><path d="M50 68V75"/><circle class="w2" cx="50" cy="77" r="2.4"/><path class="w0" d="M47 79L45 96M49 79.5L48.5 98M51 79.5L51.5 98M53 79L55 96"/></g></g>` },
  // The Red River and the lakes: rolling waves with curled crests
  waves: { loop: 'waves', svg: `<g class="lp"><path class="w2" d="M-20 44q6-12 15-6q3 3 0 6q-3 2-5-1q6-12 16-4q8 6 14 2q6-12 15-6q3 3 0 6q-3 2-5-1q6-12 16-4q8 6 14 2q6-12 15-6q3 3 0 6q-3 2-5-1q6-12 16-4q8 6 14 2q6-12 15-6q3 3 0 6q-3 2-5-1"/>
    <path class="w0" d="M-20 50q12-6 24 0t24 0 24 0 24 0 24 0 24 0"/></g>
    <g class="lp2"><path d="M-20 64q6-10 14-5q3 3 0 5q-3 2-5-1q6-10 16-3q8 5 14 1q6-10 14-5q3 3 0 5q-3 2-5-1q6-10 16-3q8 5 14 1q6-10 14-5q3 3 0 5q-3 2-5-1q6-10 16-3q8 5 14 1q6-10 14-5q3 3 0 5"/>
    <path class="w0" d="M-20 70q12-5 24 0t24 0 24 0 24 0 24 0 24 0"/></g>
    <g class="lp3"><path class="w0" d="M-20 82q12-6 24 0t24 0 24 0 24 0 24 0 24 0M-20 90q12-5 24 0t24 0 24 0 24 0 24 0 24 0"/></g>` },
  // Rain of the summer monsoon, from a cloud scroll
  rain: { loop: 'fall', svg: `<path class="w2" d="M14 40Q8 26 22 22Q26 8 44 10Q58 6 66 18Q84 16 86 32Q90 42 78 42H22Q14 42 14 40Z"/>
    <path class="w0" d="M20 37Q16 28 26 26Q30 14 44 15M62 22Q78 22 80 34"/><path class="w0" d="M30 42q0-6 6-6q5 0 5 5M56 42q0-7 7-7q6 0 6 6"/>
    <g class="lp"><path d="M24 50L19 64M44 50L39 64M64 50L59 64M80 50L75 64"/><path class="w0" d="M34 52L30 63M54 52L50 63M72 52L68 63"/></g>
    <g class="lp2"><path d="M30 70L25 84M50 70L45 84M70 70L65 84"/><path class="w0" d="M40 72L36 83M60 72L56 83"/>
    <path d="M38 90q-3 4 0 6q3-2 0-6M62 88q-3 4 0 6q3-2 0-6"/></g>` },
  sun: { loop: 'turn', svg: `<g class="lp"><path class="w2" d="${each(8, (i) => { const a = i * Math.PI / 4, [x, y] = polar(50, 50, 25, a), [x2, y2] = polar(50, 50, 46, a); return `M${x} ${y}L${x2} ${y2}`; })}"/>
    <path class="w0" d="${each(8, (i) => { const a = i * Math.PI / 4 + Math.PI / 8; let d = ''; for (let k = 0; k <= 6; k++) { const r = 25 + k * 2.6, [x, y] = polar(50, 50, r, a + (k % 2 ? 0.05 : -0.05)); d += `${k ? 'L' : 'M'}${x} ${y}`; } return d; })}"/></g>
    <circle class="fill son" cx="50" cy="50" r="16"/><circle class="w2" cx="50" cy="50" r="16"/><circle class="w0" cx="50" cy="50" r="20"/>
    ${each(16, (i) => { const [x, y] = polar(50, 50, 22.5, i * Math.PI / 8); return `<circle class="dot" cx="${x}" cy="${y}" r=".8"/>`; })}` },
  // A willow over the lake shore, its long strands moving in the wind
  willow: { loop: 'swing', svg: `<path class="w2" d="M0 4Q30 2 52 8Q76 14 100 10"/><path class="w0" d="M0 7Q30 5 52 11"/><path d="M24 4Q30 -2 36 2"/>
    <g class="lp">${[[14, 4, 62], [28, 4, 86], [42, 6, 70], [56, 9, 92], [70, 12, 66], [86, 11, 84]].map(([x, y, l]) => {
      let leaves = ''; for (let k = 10; k < l - y; k += 7) { const yy = y + k, xx = x + Math.sin(k / 12) * 2.4, s = k % 14 ? 1 : -1; leaves += `M${f(xx)} ${yy}q${s * 3.4} 1 ${s * 2} 7M${f(xx)} ${yy}q${s * .6} 4 ${s * 2} 7`; }
      return `<path d="M${x} ${y}Q${x - 3} ${f((y + l) / 2)} ${x + 1} ${l}"/><path class="w0" d="${leaves}"/>`; }).join('')}</g>` },
  dragon: { loop: 'rise', svg: dragon() },
  // Khuê Văn Các, the pavilion of the Temple of Literature: brick piers, the round "sun" window, two roofs
  'khue-van-cac': { loop: 'turn-window', svg: `
    ${hatch('a', 'M20 96V66H80V96Z', [20, 66, 80, 96], 3.2, '-')}
    <path class="w2" d="M20 96V66H80V96"/><path class="w2" d="M30 96V80Q36 72 42 80V96M58 96V80Q64 72 70 80V96"/><path d="M45 96V82H55V96"/>
    <path class="w2" d="M14 66Q50 61 86 66Q90 64 92 59M14 66Q10 64 8 59"/><path class="w0" d="M18 63.6Q50 59 82 63.6"/>
    <path class="w2" d="M28 63V38H72V63"/><path class="w0" d="M31 41V60M69 41V60"/>
    <circle class="w2" cx="50" cy="50.5" r="9.5"/><circle class="w0" cx="50" cy="50.5" r="7.4"/>
    <g class="lp"><path class="w0" d="${each(8, (i) => { const [x, y] = polar(50, 50.5, 7.4, i * Math.PI / 4); return `M50 50.5L${x} ${y}`; })}"/><circle cx="50" cy="50.5" r="1.6"/></g>
    <path class="w2" d="M18 38Q50 31 82 38Q87 36 88 30M18 38Q13 36 12 30"/><path class="w0" d="${each(13, (i) => `M${24 + i * 4.3} ${f(36.6 - Math.sin((i / 12) * Math.PI) * 2.4)}l-1 -4`)}"/>
    <path class="w2" d="M32 30Q50 22 68 30Q72 28 73 23M32 30Q28 28 27 23"/><path d="M50 24V14"/><circle class="w2" cx="50" cy="12" r="2.4"/>
    <path class="w0" d="M37 27.6l-1-3.4M43 25.8l-.6-3.4M57 25.8l.6-3.4M63 27.6l1-3.4"/>` },
  scroll: { loop: 'bob', svg: `<g class="lp"><path class="w2" d="M24 14H78Q85 14 85 21Q85 28 78 28H24"/><path class="w2" d="M24 14Q17 14 17 21Q17 28 24 28Q29 28 29 22.5Q29 18 25 18"/>
    <path class="w2" d="M26 28V80M76 28V80"/><path class="w2" d="M24 80H78Q85 80 85 87Q85 94 78 94H24Q17 94 17 87Q17 80 24 80"/><path class="w0" d="M78 84Q81 84 81 87Q81 90 78 90"/>
    <path class="w0" d="${each(8, (i) => `M33 ${36 + i * 5}H${i % 3 === 2 ? 58 : 69}`)}"/>
    <path class="fill son" d="M60 66H70V76H60Z"/><path class="w0" d="M62 68h6M62 71h6M62 74h6"/></g>` },
  pho: { loop: 'steam', svg: `
    ${hatch('a', 'M10 52H90Q88 82 50 87Q12 82 10 52Z', [10, 64, 90, 88], 2.6, '\\')}
    <path class="w2" d="M8 52H92Q90 83 50 88Q10 83 8 52Z"/><path d="M11 58H89"/><path class="w0" d="${each(13, (i) => `M${14 + i * 5.6} 58l2.8 -3.4l2.8 3.4`)}"/>
    <path class="w2" d="M37 88L39 95H61L63 88"/>
    <path d="M18 52Q24 46 32 51Q40 56 48 50Q56 45 64 50Q72 55 80 50"/><path class="w0" d="M22 51Q30 47 38 52M52 50Q60 46 70 51"/>
    <path d="M26 48Q34 42 42 48Q34 51 26 48ZM56 47Q63 41 70 47Q63 50 56 47Z"/><path class="w0" d="M28 47.6h12M58 46.6h10"/>
    <path class="w0" d="M44 46q2-6 8-6q-1 6-8 6M46 44l4-2.6M74 46q1-6 7-7q0 6-7 7"/>
    <path class="w2" d="M58 46L94 12M64 48L98 18"/><path class="w0" d="M88 17.6l3 3M92 22l3 3"/>
    <g class="lp"><path class="w0" d="${curl(28, 38, 24)}"/></g><g class="lp2"><path d="${curl(40, 36, 30, -1)}"/></g><g class="lp3"><path class="w0" d="${curl(52, 38, 24)}"/></g>` },
  // Egg coffee, a Hanoi invention: the whipped yolk foam on top, the bowl of hot water it sits in
  'egg-coffee': { loop: 'steam', svg: `
    ${hatch('a', 'M24 52H70V66Q70 82 47 82Q24 82 24 66Z', [24, 60, 70, 84], 2.6, '\\')}
    <path class="w2" d="M22 50H72V66Q72 84 47 84Q22 84 22 66Z"/><path class="w2" d="M72 55Q86 54 86 63Q86 73 71 71"/><path class="w0" d="M72 59Q81 59 81 63Q81 68 72 67"/>
    <path class="fill soft" d="M22 50Q47 34 72 50Z"/><path class="w2" d="M22 50Q47 34 72 50"/>
    ${each(7, (i) => `<circle class="w0" cx="${30 + i * 5.6}" cy="${f(46 - Math.sin((i / 6) * Math.PI) * 5)}" r="${1 + (i % 3) * .5}"/>`)}
    <ellipse class="w2" cx="47" cy="89" rx="38" ry="6"/><ellipse class="w0" cx="47" cy="89" rx="30" ry="3.6"/>
    <path d="M62 44L84 30"/><ellipse class="w0" cx="86" cy="28.6" rx="3" ry="1.6" transform="rotate(-32 86 28.6)"/>
    <g class="lp"><path class="w0" d="${curl(36, 34, 24)}"/></g><g class="lp2"><path d="${curl(48, 32, 28, -1)}"/></g><g class="lp3"><path class="w0" d="${curl(58, 34, 22)}"/></g>` },
  // The low plastic stools of the pavement
  stool: { loop: 'bob', svg: `<g class="lp"><path class="fill son soft" d="M16 36H84L79 46H21Z"/><path class="w2" d="M16 36H84L79 46H21Z"/><path class="w0" d="M19 39.6H81"/>
    <path class="w2" d="M24 46L16 90M76 46L84 90"/><path class="w0" d="M28 46L21 88M72 46L79 88"/><path d="M40 46L37 82M60 46L63 82"/>
    <path d="M21 70H79"/><path class="w0" d="M22 73H78"/><path class="w2" d="M42 58Q50 52 58 58Q50 64 42 58Z"/></g>
    <path class="w0" d="M10 94h80M20 97h60"/>` },
  // Water puppetry: a farmer puppet in a nón lá on the water stage, with the bamboo screen behind
  'water-puppet': { loop: 'bob', svg: `<path class="w0" d="M6 6V50M94 6V50M6 6H94"/><path class="w0" d="${each(9, (i) => `M${14 + i * 9} 6V${i % 2 ? 48 : 44}`)}"/>
    <g class="lp"><path class="w2" d="M34 36L50 24L66 36Z"/><path class="w0" d="M50 24L40 36M50 24L46 36M50 24L54 36M50 24L60 36"/>
    <circle class="w2" cx="50" cy="41" r="5"/><path class="w0" d="M48 40.4h.4M52 40.4h.4M48.4 43.4q1.6 1 3.2 0"/>
    <path class="w2" d="M42 64Q42 50 50 47Q58 50 58 64Z"/><path class="w0" d="M50 47V64M46 50L50 54L54 50"/>
    <path d="M42 53L32 46M58 53L70 44"/><path class="w0" d="M70 44L80 26M78 30l4 1.6"/><path class="w0" d="M32 46l-4-6"/></g>
    <path class="w2" d="M2 70q8-6 16 0t16 0 16 0 16 0 16 0 16 0"/><path class="w0" d="M2 78q8-5 16 0t16 0 16 0 16 0 16 0 16 0M10 86q8-4 16 0t16 0 16 0 16 0 16 0"/>
    <path class="w0" d="M30 64l-3-4M70 64l3-4M24 66l-4-2M76 66l4-2"/>` },
  'non-la': { loop: 'bob', svg: `<g class="lp">
    ${hatch('a', 'M50 18L92 66Q72 74 50 74Z', [50, 18, 92, 76], 2.4, '/')}
    <path class="w2" d="M6 66L50 16L94 66Q50 80 6 66Z"/>
    <path class="w0" d="${each(11, (i) => { const x = 10 + i * 8; return `M50 16L${x} ${f(66 + Math.sin((i / 10) * Math.PI) * 7)}`; })}"/>
    <path d="M34 34Q50 39 66 34M23 47Q50 54 77 47M13 59Q50 68 87 59"/><path class="w0" d="M40 27.6Q50 30.4 60 27.6M28 41Q50 47 72 41M18 53Q50 61 82 53"/>
    <path class="son w2" d="M26 72Q50 98 74 72"/><path class="son w0" d="M30 73Q50 93 70 73"/></g>` },
  // Tea for a guest, poured and given with both hands
  tea: { loop: 'steam', svg: `
    ${hatch('a', 'M24 54Q24 82 46 82Q68 82 68 54Z', [24, 64, 68, 84], 2.4, '\\')}
    <path class="w2" d="M22 52Q22 84 46 84Q70 84 70 52Z"/><path d="M24 60H68"/><path class="w0" d="${each(8, (i) => `M${27 + i * 5} 60q2.5 3 5 0`)}"/>
    <path class="w2" d="M30 52Q46 40 62 52"/><circle class="w2" cx="46" cy="42" r="3"/><path class="w0" d="M34 50Q46 44 58 50"/>
    <path class="w2" d="M22 62Q10 60 6 46Q4 42 8 42"/><path class="w0" d="M22 66Q12 64 9 52"/>
    <path class="w2" d="M70 56Q84 58 80 72Q78 76 72 74"/>
    <path class="w2" d="M72 84H94Q92 96 83 96Q74 96 72 84"/><path class="w0" d="M74 88H92"/><path class="w2" d="M48 88H70Q68 99 59 99Q50 99 48 88"/><path class="w0" d="M50 92H68"/>
    <g class="lp"><path class="w0" d="${curl(8, 36, 22)}"/></g><g class="lp2"><path class="w0" d="${curl(14, 34, 18, -1)}"/></g>` },
  // Shoes left at the door: rubber sandals with treaded soles
  sandals: { loop: 'bob', svg: `<g class="lp">
    ${hatch('a', 'M14 30Q14 14 27 14Q40 14 40 30V76Q40 92 27 92Q14 92 14 76Z', [14, 14, 40, 92], 2.6, '-')}
    ${hatch('b', 'M50 22Q50 6 63 6Q76 6 76 22V68Q76 84 63 84Q50 84 50 68Z', [50, 6, 76, 84], 2.6, '-')}
    <path class="w2" d="M12 30Q12 12 27 12Q42 12 42 30V76Q42 94 27 94Q12 94 12 76Z"/><path class="w2" d="M48 22Q48 4 63 4Q78 4 78 22V68Q78 86 63 86Q48 86 48 68Z"/>
    <path class="w2" d="M13 42Q27 52 41 42M49 34Q63 44 77 34"/><path d="M27 46V30M63 38V22"/><path class="w0" d="M15 46Q27 55 39 46M51 38Q63 47 75 38"/></g>
    <path class="w2" d="M88 0V100"/><path class="w0" d="M92 0V100M84 96H100"/>` },
  // Crossing the street: walk slowly and the motorbikes flow around you
  motorbikes: { loop: 'flow', svg: `<g class="lp">${[[0, 0], [44, 44]].map(([dx, dy]) => `<g transform="translate(${dx} ${dy})">
    <circle class="w2" cx="12" cy="44" r="7"/><circle class="w2" cx="40" cy="44" r="7"/><circle class="w0" cx="12" cy="44" r="3.6"/><circle class="w0" cx="40" cy="44" r="3.6"/>
    <path class="w0" d="M12 37V51M5 44H19M40 37V51M33 44H47"/>
    <path class="w2" d="M5 36Q7 28 18 28H27L30 36H38L35 22H42"/><path class="w0" d="M8 34Q11 31 18 31H25"/><path d="M19 44H33"/><path d="M33 22l-2-3h6"/>
    <circle class="w2" cx="24" cy="9" r="4"/><path class="w0" d="M20 8Q24 3 28 8"/><path class="w2" d="M24 13L26 26"/><path d="M25 16L34 21M26 26L31 34"/></g>`).join('')}
    <path class="w0" d="M48 30H60M50 36H64M92 74H100M94 80H100M2 62h8M0 68h6"/></g>` },

  // ---------- Hồ Chí Minh Mausoleum ----------
  // The national flag, raised on Ba Đình Square each morning
  flag: { loop: 'flutter', svg: `<path class="w2" d="M20 10V96"/><path class="w0" d="M23 12V94"/><path class="w2" d="M10 96H34M14 92H30"/><circle class="w2" cx="21.5" cy="7.5" r="3.2"/>
    <g class="lp"><path class="fill son" d="M23 14Q38 6 52 14T80 14V48Q66 56 52 48T23 48Z"/><path class="w2" d="M23 14Q38 6 52 14T80 14V48Q66 56 52 48T23 48Z"/>
    <path class="w0" d="M38 12Q40 30 38 50M62 12Q64 30 62 50M70 13Q71 30 70 50"/>
    <path class="fill gold" d="M51 19L54.2 28.4L64 28.4L56 34.2L59 43.6L51 37.8L43 43.6L46 34.2L38 28.4L47.8 28.4Z"/></g>` },
  // The microphone of 2 September 1945: a ribbon microphone in a sprung mount on a stand
  microphone: { loop: 'sound', svg: `
    ${hatch('a', 'M38 12H62V44Q62 55 50 55Q38 55 38 44Z', [38, 12, 62, 56], 2.6, '/')}${hatch('b', 'M38 12H62V44Q62 55 50 55Q38 55 38 44Z', [38, 12, 62, 56], 2.6, '\\')}
    <path class="w2" d="M36 10H64V44Q64 57 50 57Q36 57 36 44Z"/><path d="M36 18H64M36 48H64"/>
    <path class="w2" d="M28 28Q28 62 50 64Q72 62 72 28"/><path class="w0" d="${each(4, (i) => `M${29 + i * .3} ${30 + i * 5}q-3 1.4 0 2.8M${71 - i * .3} ${30 + i * 5}q3 1.4 0 2.8`)}"/>
    <circle class="w2" cx="28" cy="28" r="2.4"/><circle class="w2" cx="72" cy="28" r="2.4"/>
    <path class="w2" d="M50 64V92"/><path class="w0" d="M48 70H52M48 78H52"/><path class="w2" d="M32 94H68Q68 90 50 89Q32 90 32 94Z"/>
    <g class="lp"><path d="M80 20Q88 32 80 44"/><path class="w0" d="M86 14Q98 32 86 50"/><path d="M20 20Q12 32 20 44"/><path class="w0" d="M14 14Q2 32 14 50"/></g>` },
  // The simple wooden stilt house he lived in from 1958
  'stilt-house': { loop: 'leaf', svg: `
    ${hatch('a', 'M8 40L50 14L92 40Z', [8, 14, 92, 40], 2.6, '|')}${hatch('b', 'M18 40V62H82V40Z', [18, 40, 82, 62], 3.2, '-')}
    <path class="w2" d="M4 42L50 12L96 42"/><path class="w0" d="M8 40H92"/><path class="w2" d="M18 40V62H82V40"/>
    <path class="w2" d="M26 46H40V56H26ZM60 46H74V56H60Z"/><path class="w0" d="M33 46V56M67 46V56M26 51H40M60 51H74"/><path class="w2" d="M45 62V48H55V62"/>
    <path class="w2" d="M14 62H86"/><path class="w0" d="M14 65H86"/><path class="w2" d="M22 65V88M38 65V88M62 65V88M78 65V88"/>
    <path d="M66 65L78 90M70 70H75M72.4 75H77.4M74.6 80H80M76.8 85H82"/>
    <path class="w2" d="M2 90H98"/><path class="w0" d="M6 94q6-2 12 0t12 0M40 95q6-2 12 0t12 0M76 94q6-2 12 0"/>
    <g class="lp"><path d="M88 28Q96 22 97 12Q88 15 88 28"/><path class="w0" d="M88 28L94 16M88 28L85 38"/></g>` },
  // The carp in the pond beside the stilt house
  carp: { loop: 'swim', svg: `<ellipse class="w2" cx="50" cy="56" rx="47" ry="32"/><ellipse class="w0" cx="50" cy="56" rx="43" ry="28.5"/>
    <path class="w0" d="M10 46l5 1M12 70l5-2M88 46l-5 1M86 70l-5-2"/><path d="M70 74Q78 68 86 74Q80 76 82 80Q74 80 70 74Z"/>
    <g class="lp"><path class="w2" d="M22 46Q36 34 56 42Q38 56 22 46Z"/><path class="w0" d="${scales([[34, 43], [39, 42], [44, 42], [49, 42.6], [37, 47], [42, 46.6], [47, 46]], 1.5)}"/>
    <circle class="dot" cx="27" cy="43.6" r="1.1"/><path class="w0" d="M22 46q-4 1-5 4M24 44q-4-1-6 1"/><path d="M38 39l4-4 3 4M40 50l2 4 3-2"/>
    <g class="lp2"><path class="w2" d="M56 42L67 34L64 42L68 51Z"/><path class="w0" d="M58 42L66 37M58 42L66 47"/></g>
    <path class="son w2" d="M78 66Q64 78 44 70Q62 58 78 66Z"/><path class="son w0" d="${scales([[54, 67], [59, 66], [64, 65.6], [69, 65.4], [57, 70.4], [62, 70], [67, 69.6]], 1.5)}"/>
    <circle class="dot son" cx="73" cy="67" r="1.1"/><path class="son" d="M62 61l-3-4-3 4M58 75l-2 4-3-2"/>
    <g class="lp3"><path class="son w2" d="M44 70L33 64L37 71L33 79Z"/></g></g>` },
  // The mausoleum: three steps, the colonnade and the flat roof with its frieze
  colonnade: { loop: 'shine', svg: `<path class="w2" d="M2 92H98"/><path d="M8 86H92"/><path class="w0" d="M8 89H92"/><path d="M14 80H86"/><path class="w0" d="M14 83H86"/>
    <path class="w2" d="M18 76H82V80H18Z"/>
    ${[24, 34, 44, 56, 66, 76].map((x) => `<path class="w2" d="M${x - 2.6} 76V44M${x + 2.6} 76V44"/><path class="w0" d="M${x} 74V46"/>`).join('')}
    <path class="w2" d="M14 44H86V36H14Z"/><path class="w0" d="${each(17, (i) => `M${17 + i * 4} 38.6V41.6`)}"/>
    <path class="w2" d="M24 36V26H76V36"/><path class="w0" d="M30 31H70"/><path class="w0" d="M47 76V60H53V76M47 60Q50 56 53 60"/>
    <g class="lp"><path class="w0" d="M10 20l3 3M90 20l-3 3M50 6v5"/></g>` },
  // Stone from every region of the country, dressed by hand
  stones: { loop: 'shine', svg: `
    ${hatch('a', 'M6 92H46V72H6Z', [6, 72, 46, 92], 3, '/')}${hatch('b', 'M18 72H58V54H18Z', [18, 54, 58, 72], 3, '\\')}${hatch('c', 'M30 54H64V38H30Z', [30, 38, 64, 54], 3, '/')}
    <path class="w2" d="M6 92H46V72H6ZM50 92H94V70H50ZM18 72H58V54H18ZM58 70H86V52H58ZM30 54H64V38H30Z"/>
    <path d="M14 84l8-4M64 84l9-3M36 64l8-4M66 62l7-3M42 46l8-3"/><path class="w0" d="M54 86h30M54 78h20M62 58h18"/>
    <g class="lp"><path class="w0" d="M74 30l2-6 2 6-6-2 6-2M86 40l1.4-4 1.4 4-4-1.4 4-1.4"/></g>` },
  // His wish: ashes on hilltops where people could plant trees
  saplings: { loop: 'grow', svg: `
    ${hatch('h', 'M0 94Q50 50 100 94Z', [0, 60, 100, 94], 3, '-')}
    <path class="w2" d="M0 94Q50 50 100 94"/><path class="w0" d="M10 86Q50 56 90 86"/>
    <g class="lp lp1"><path class="w2" d="M26 80V58"/><path d="M26 66Q14 62 16 52Q26 56 26 66ZM26 62Q38 58 36 48Q26 52 26 62Z"/><path class="w0" d="M26 66L19 56M26 62L33 51"/></g>
    <g class="lp lp2"><path class="w2" d="M50 72V36"/><path d="M50 56Q34 52 36 38Q50 42 50 56ZM50 50Q66 46 64 32Q50 36 50 50ZM50 40Q46 30 52 22Q56 30 50 40Z"/>
    <path class="w0" d="M50 56L39 41M50 50L61 35M50 40L51.6 26"/></g>
    <g class="lp lp3"><path class="w2" d="M74 80V60"/><path d="M74 68Q62 64 64 54Q74 58 74 68ZM74 64Q86 60 84 50Q74 54 74 64Z"/><path class="w0" d="M74 68L67 58M74 64L81 53"/></g>
    <path class="w0" d="M24 80q2 2 4 0M48 72q2 2 4 0M72 80q2 2 4 0"/>` },
  // The One Pillar Pagoda, a lotus rising from its pond
  'one-pillar': { loop: 'ripple', svg: `
    ${hatch('p', 'M46 88V62H54V88Z', [46, 62, 54, 88], 2.2, '-')}
    <path class="w2" d="M46 88V62M54 88V62"/><path class="w2" d="M26 62Q50 68 74 62"/><path class="w0" d="M30 59.6Q50 64 70 59.6"/>
    <path d="M32 62L46 72M68 62L54 72"/><path class="w0" d="M38 64L46 69M62 64L54 69"/>
    <path class="w2" d="M32 60V44H68V60"/><path class="w0" d="M38 46V58M44 46V58M50 46V58M56 46V58M62 46V58M32 52H68"/>
    <path class="w2" d="M20 44Q50 34 80 44Q85 42 87 37M20 44Q15 42 13 37"/><path class="w0" d="${each(11, (i) => `M${24 + i * 5.2} ${f(42.6 - Math.sin((i / 10) * Math.PI) * 3.2)}l-1 -3.6`)}"/>
    <path class="w2" d="M34 34Q50 25 66 34Q70 32 71 28M34 34Q30 32 29 28"/><path class="w0" d="M40 31.6l-.8-3M46 29.6l-.4-3M54 29.6l.4-3M60 31.6l.8-3"/>
    <path d="M50 27V18"/><circle class="dot son" cx="50" cy="16.5" r="2.2"/>
    <g class="lp"><path class="w2" d="M4 92q8-4 16 0t16 0 16 0 16 0 16 0 16 0"/><path class="w0" d="M14 98q7-3 14 0t14 0 14 0 14 0 14 0"/></g>
    <path d="M8 84Q14 80 22 84Q16 86 8 84ZM76 84Q84 80 92 84Q84 86 76 84Z"/>` },
  // Incense in a bronze burner (lư hương), the smoke rising
  incense: { loop: 'steam', svg: `
    ${hatch('a', 'M24 74Q24 92 50 92Q76 92 76 74Z', [24, 74, 76, 92], 2.4, '\\')}
    <path class="w2" d="M20 72H80Q80 94 50 94Q20 94 20 72Z"/><path class="w2" d="M16 72H84"/><path class="w0" d="${each(10, (i) => `M${24 + i * 5.4} 78l2.7 3l2.7 -3`)}"/>
    <path class="w2" d="M20 76Q10 76 12 66M80 76Q90 76 88 66"/><path class="w2" d="M32 92L28 99M68 92L72 99M50 94V99"/>
    <path d="M42 72V38M50 72V34M58 72V38"/><path class="w0" d="M42 60h.1M50 58h.1M58 60h.1"/>
    <circle class="dot son" cx="42" cy="37" r="1.8"/><circle class="dot son" cx="50" cy="33" r="1.8"/><circle class="dot son" cx="58" cy="37" r="1.8"/>
    <g class="lp"><path class="w0" d="${curl(42, 32, 26)}"/></g><g class="lp2"><path d="${curl(50, 28, 28, -1)}"/></g><g class="lp3"><path class="w0" d="${curl(58, 32, 24)}"/></g>` },
  // Morning and evening: the flag ceremonies
  sunrise: { loop: 'rise-sun', svg: `<path class="w2" d="M2 70H98"/><path class="w0" d="M10 76H90M18 81H82M26 86H74M34 91H66"/>
    <g class="lp"><path class="fill son" d="M26 70A24 24 0 0 1 74 70Z"/><path class="w2" d="M26 70A24 24 0 0 1 74 70"/><path class="w0" d="M32 70A18 18 0 0 1 68 70"/>
    <path class="w2" d="M50 40V28M28 48L20 40M72 48L80 40M18 62H8M82 62H92"/><path class="w0" d="M38 42L34 33M62 42L66 33M22 54L13 50M78 54L87 50"/></g>
    <path class="w0" d="M8 24Q8 18 14 18Q16 12 24 14Q30 14 30 20H8M70 18Q70 12 76 12Q80 8 86 10Q92 10 92 16H70"/>` },
  clock: { loop: 'clock', svg: `<circle class="w2" cx="50" cy="50" r="44"/><circle class="w0" cx="50" cy="50" r="41"/><circle cx="50" cy="50" r="35"/>
    <path class="w0" d="${each(60, (i) => { if (i % 5 === 0) return ''; const a = i * Math.PI / 30, [x, y] = polar(50, 50, 35, a), [x2, y2] = polar(50, 50, 32.6, a); return `M${x} ${y}L${x2} ${y2}`; })}"/>
    <path class="w2" d="${each(12, (i) => { const a = i * Math.PI / 6, [x, y] = polar(50, 50, 35, a), [x2, y2] = polar(50, 50, i % 3 ? 30 : 27.6, a); return `M${x} ${y}L${x2} ${y2}`; })}"/>
    <path class="w2" d="M50 50L36 40"/><path class="w0" d="M38.4 41.8l-2-3.4l4 .6"/>
    <g class="lp"><path class="w2" d="M50 50V22"/><path class="w0" d="M50 26l-2 4h4Z"/></g><circle class="w2" cx="50" cy="50" r="3"/><circle class="dot son" cx="50" cy="50" r="1.6"/>
    <path class="w2" d="M44 6H56M50 6V2"/>` },
  // No photos inside the mausoleum
  'camera-no': { loop: 'shine', svg: `
    ${hatch('a', 'M14 36H86V80H14Z', [14, 36, 86, 80], 2.6, '/')}
    <path class="w2" d="M12 34H34L40 24H60L66 34H88V82H12Z"/><path class="w0" d="M12 44H88M12 74H88"/>
    <circle class="w2" cx="50" cy="58" r="17"/><circle cx="50" cy="58" r="12"/><circle class="w0" cx="50" cy="58" r="7"/><path class="w0" d="M46 54q4-3 7 0"/>
    <path class="w2" d="M18 30H28V34H18ZM74 40H82V44H74Z"/>
    <path class="son w2" d="M6 94L94 14"/><path class="son w0" d="M10 97L97 18"/>` },
};
// The same bird, flying the other way
M['chim-lac-2'] = { loop: 'glide2', svg: `<g transform="translate(100 0) scale(-1 1)">${M['chim-lac'].svg}</g>` };

// The drawings for the other places: each landmark's own drawing, and shared drawings by region and theme
Object.assign(M, THEMES, WORLD, NORTH, CENTRAL, SOUTH);

export const MOTIFS = M;

// Different depths, so the motifs drift at different speeds while the slides move
const DRIFT = [1.9, -1.3, 2.4, -0.8, 1.4, -1.7];
let uid = 0;

/** The layer of motifs for one slide: `list` is an array of motif names, the first one shown larger. */
export function motifLayer(list) {
  if (!list?.length) return '';
  return `<div class="s-motifs" aria-hidden="true">${list.map((key, i) => {
    const m = M[key];
    if (!m) return '';
    const id = `m${++uid}`;
    const art = m.svg.replaceAll('@', `${id}-`).replace(/<(path|circle|ellipse|line|polyline|rect)\b/g, '<$1 pathLength="1"');
    // The same drawing as a mask, for the glint of light that runs over the gold once it is drawn
    const mask = `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' fill='none' stroke='black' stroke-width='2.6' stroke-linecap='round'>${m.svg.replaceAll('@', 'k').replace(/class="[^"]*\b(fill|dot)\b[^"]*"/g, 'fill="black" stroke="none"').replace(/class="[^"]*"/g, '')}</svg>`)}")`;
    return `<span class="motif m-${key} loop-${m.loop}${i === 0 ? ' hero' : ''}" data-drift="${DRIFT[i % DRIFT.length]}" style="--d:${i}; --mask:${mask.replaceAll('"', '&quot;')}">
      <svg viewBox="0 0 100 100" focusable="false" style="--g:url(#${id}-gold)"><defs><linearGradient id="${id}-gold" gradientUnits="userSpaceOnUse" x1="10" y1="0" x2="90" y2="100">
      <stop offset="0" style="stop-color:var(--orn-hi)"/><stop offset=".5" style="stop-color:var(--orn)"/><stop offset="1" style="stop-color:var(--orn-lo)"/></linearGradient></defs>${art}</svg></span>`;
  }).join('')}</div>`;
}

// ---------- Placement ----------
// Motifs go into the empty parts of each slide. Each one tries positions across the slide and takes the one
// furthest from the text, the buttons, the timeline and the other motifs. It may tuck a little behind a photo or
// a panel (they sit above it), but most of it stays in view. If no place is free it is drawn smaller, or left out.

const HARD = '.s-frame > *, .s-actions, .strip-head, .car-nav, .chip, button, a.btn-m, .meta-row, .playerbar';
const SOFT = '.s-card, .s-sand, .s-paper, .s-photo, .s-media, .s-stage, .s-map, .s-strip, .glance, .tip-row';

function textBox(el) {
  const range = document.createRange();
  range.selectNodeContents(el);
  const rs = [...range.getClientRects()].filter((r) => r.width && r.height);
  if (!rs.length) return el.getBoundingClientRect();
  return { left: Math.min(...rs.map((r) => r.left)), right: Math.max(...rs.map((r) => r.right)), top: Math.min(...rs.map((r) => r.top)), bottom: Math.max(...rs.map((r) => r.bottom)) };
}
const area = (r) => Math.max(0, r.right - r.left) * Math.max(0, r.bottom - r.top);
const overlap = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
const gap = (a, b) => Math.hypot(Math.max(0, a.left - b.right, b.left - a.right), Math.max(0, a.top - b.bottom, b.top - a.bottom));

/** Places the motifs of every slide inside `root`. `stacked` limits phones and short windows to 2 small ones. */
export function placeMotifs(root, { stacked = false, bottom = 0 } = {}) {
  for (const slide of root.querySelectorAll('.slide')) {
    const layer = slide.querySelector('.s-motifs');
    if (!layer) continue;
    const motifs = [...layer.children];
    motifs.forEach((m) => { m.hidden = true; });
    const S = slide.getBoundingClientRect();
    if (!S.width || !S.height) continue;
    // Boxes relative to the slide, without the sideways drift a piece may still carry from the last move,
    // and without the small rise of pieces that have not faded in yet
    const rel = (e, r, pad = 0) => {
      const dx = parseFloat(e.closest('[data-drift]')?.style.translate) || 0;
      const rv = e.closest('[data-reveal]');
      const dy = rv ? new DOMMatrix(getComputedStyle(rv).transform === 'none' ? undefined : getComputedStyle(rv).transform).m42 : 0;
      return { left: r.left - S.left - dx - pad, right: r.right - S.left - dx + pad, top: r.top - S.top - dy - pad, bottom: r.bottom - S.top - dy + pad };
    };
    const hard = [...slide.querySelectorAll(HARD)].filter((e) => !e.closest('.s-motifs') && e.offsetParent).map((e) => rel(e, e.matches('.s-frame > *') ? textBox(e) : e.getBoundingClientRect(), 18));
    const soft = [...slide.querySelectorAll(SOFT)].filter((e) => e.offsetParent).map((e) => rel(e, e.getBoundingClientRect()));
    const W = S.width, H = S.height - bottom;
    // The motifs gather around the slide's own pieces rather than drifting off to the far edges of a wide screen.
    const all = [...hard, ...soft].filter((r) => r.top < H);
    const near = all.length ? { left: Math.min(...all.map((r) => r.left)) - 60, right: Math.max(...all.map((r) => r.right)) + 60,
      top: Math.min(...all.map((r) => r.top)) - 40, bottom: Math.max(...all.map((r) => r.bottom)) + 40 } : { left: 0, right: W, top: 0, bottom: H };
    const scale = stacked ? 0.5 : Math.min(1.15, Math.max(0.66, W / 1700));
    const placed = [];
    let shown = 0;
    for (const [i, m] of motifs.entries()) {
      if (stacked && shown >= 2) break;
      let best = null;
      for (const shrink of [1, 0.8, 0.64, 0.5]) {
        const size = Math.round((i === 0 ? 205 : 145) * scale * shrink);
        const step = Math.max(10, Math.round(size / 6));
        for (let y = 12; y + size <= H - 8; y += step) {
          for (let x = 16; x + size <= W - 16; x += step) {
            // the drawing fills the middle of its box, so test a slightly smaller box
            const box = { left: x + size * 0.08, right: x + size * 0.92, top: y + size * 0.08, bottom: y + size * 0.92 };
            if (hard.some((h) => overlap(box, h) > 0)) continue;
            if (placed.some((p) => gap(box, p) < 14)) continue;
            const hidden = soft.reduce((s, r) => s + overlap(box, r), 0) / area(box);
            if (hidden > 0.3) continue;
            const clear = Math.min(140, ...hard.map((h) => gap(box, h)), ...placed.map((p) => gap(box, p) * 0.9));
            const score = clear - hidden * 120 - gap(box, near) * 0.6 + (placed.length ? Math.min(...placed.map((p) => gap(box, p))) * 0.15 : 0);
            if (!best || score > best.score) best = { x, y, size, box, score };
          }
        }
        if (best) break;
      }
      if (!best) continue;
      m.hidden = false;
      m.style.left = `${best.x}px`;
      m.style.top = `${best.y}px`;
      m.style.width = m.style.height = `${best.size}px`;
      // the line keeps about the same width whatever the size of the drawing
      m.style.setProperty('--sw', (1.5 * 100 / best.size).toFixed(2));
      placed.push(best.box);
      shown++;
    }
  }
}
