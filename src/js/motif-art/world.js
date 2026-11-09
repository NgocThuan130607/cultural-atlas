// Motif drawings for the five cities outside Vietnam and their landmarks (Paris, Cairo, Kyoto, Rome, New York),
// in the same gold-engraving manner as the Vietnamese ones. See src/js/motifs.js for the conventions.
import { f, each, polar, hatch, scales, curl } from './helpers.js';

// A lattice of crossed iron girders between two lines, for the Eiffel Tower
const lattice = (x0, y0, x1, y1, n) => each(n, (i) => {
  const t0 = i / n, t1 = (i + 1) / n, ya = y0 + (y1 - y0) * t0, yb = y0 + (y1 - y0) * t1;
  const xl = (t) => x0 + (x1 - x0) * t; return `M${f(xl(t0))} ${f(ya)}L${f(xl(t1) + 2)} ${f(yb)}`;
});

export const WORLD = {
  // ---------- Paris ----------
  // The Eiffel Tower: four splayed legs with lattice girders, the arch between them, two platforms, the spire
  eiffel: { loop: 'shine', svg: `
    <path class="w2" d="M14 96Q30 70 40 48L44 30L47 12M86 96Q70 70 60 48L56 30L53 12"/><path d="M24 96Q36 72 44 50M76 96Q64 72 56 50"/>
    <path class="w2" d="M30 84Q50 60 70 84"/><path class="w0" d="M34 84Q50 66 66 84"/>
    <path class="w0" d="M16 94L26 86M22 88L30 80M26 80L34 72M30 72L38 64M34 64L40 56M84 94L74 86M78 88L70 80M74 80L66 72M70 72L62 64M66 64L60 56"/>
    <path class="w0" d="M18 90L28 92M24 82L33 84M29 74L37 76M34 66L41 68M82 90L72 92M76 82L67 84M71 74L63 76M66 66L59 68"/>
    <path class="w2" d="M36 58H64V62H36Z"/><path class="w0" d="${each(7, (i) => `M${38 + i * 4} 58V62`)}"/>
    <path d="M42 46L58 46M40 50L44 32M60 50L56 32"/><path class="w0" d="M42 36L58 46M58 36L42 46M44 42L56 30M56 42L44 30"/>
    <path class="w2" d="M42 30H58V33H42Z"/><path class="w0" d="M46 30L50 16M54 30L50 16M47 24H53"/>
    <path class="w2" d="M48 12H52V8H48ZM50 8V1"/><circle class="dot son" cx="50" cy="1" r="1.4"/>
    <g class="lp"><path class="w0" d="M8 30l2-5 2 5-5-2 5-2M90 22l1.6-4 1.6 4-4-1.6 4-1.6M84 44l1.2-3 1.2 3-3-1.2 3-1.2M12 54l1.2-3 1.2 3-3-1.2 3-1.2"/></g>` },
  // A Seine bridge with its arches and the river below
  'seine-bridge': { loop: 'ripple', svg: `
    ${hatch('s', 'M4 50H96V58H4Z', [4, 50, 96, 58], 2.2, '|')}
    <path class="w2" d="M2 48H98M4 58H96"/><path d="M2 44H98"/><path class="w0" d="${each(24, (i) => `M${4 + i * 4} 44V48`)}"/>
    <path class="w2" d="M4 58V78M96 58V78M10 78Q22 60 34 78M38 78Q50 60 62 78M66 78Q78 60 90 78"/>
    <path class="w0" d="M13 78Q22 64 31 78M41 78Q50 64 59 78M69 78Q78 64 87 78"/><path d="M34 78V60M38 78V60M62 78V60M66 78V60"/>
    <path class="w2" d="M20 44V34M50 44V34M80 44V34"/><circle cx="20" cy="31" r="3"/><circle cx="50" cy="31" r="3"/><circle cx="80" cy="31" r="3"/>
    <g class="lp"><path d="M2 86q6-3 12 0t12 0 12 0 12 0 12 0 12 0 12 0 12 0"/><path class="w0" d="M10 93q6-3 12 0t12 0 12 0 12 0 12 0 12 0"/></g>` },
  // Café life: a croissant beside a small cup of coffee
  croissant: { loop: 'steam', svg: `
    <path class="w2" d="M4 80Q6 52 32 46Q58 52 60 80Q54 72 48 70Q44 62 32 62Q20 62 16 70Q10 72 4 80Z"/>
    <path d="M16 70L10 58M24 63L20 50M32 62V46M40 63L44 50M48 70L54 58"/><path class="w0" d="M12 74L6 66M20 66L15 54M28 62L26 47M36 62L38 47M44 66L49 54M52 74L58 66"/>
    <path class="w2" d="M62 64H88V74Q88 84 75 84Q62 84 62 74Z"/><path d="M88 67Q95 67 95 72Q95 77 88 76"/><ellipse class="w2" cx="75" cy="88" rx="17" ry="3.4"/>
    <path class="w0" d="M64 67H86"/><g class="lp"><path class="w0" d="${curl(70, 58, 20)}"/></g><g class="lp2"><path class="w0" d="${curl(78, 56, 22, -1)}"/></g>` },
  // A painter's palette and brush, for the painters of Paris and Montmartre
  palette: { loop: 'bob', svg: `<g class="lp">
    <path class="w2" d="M50 10Q86 10 92 38Q96 58 78 60Q66 60 68 72Q70 86 52 88Q16 88 10 56Q6 18 50 10Z"/><path class="w0" d="M50 14Q82 14 88 38"/>
    <ellipse class="w2" cx="72" cy="70" rx="6" ry="5"/>
    <circle cx="30" cy="34" r="6"/><circle class="fill son" cx="30" cy="34" r="6"/><circle cx="50" cy="26" r="6"/><circle class="fill soft" cx="50" cy="26" r="6"/><circle cx="70" cy="34" r="6"/>
    <circle cx="26" cy="56" r="6"/><circle class="fill soft" cx="26" cy="56" r="6"/><circle cx="44" cy="70" r="5"/>
    <path class="w2" d="M40 54L94 94"/><path d="M36 50Q34 46 40 48L44 52Z"/><path class="w0" d="M76 80L80 84"/></g>` },
  // Lights on the tower at night
  sparkle: { loop: 'sound', svg: `<g class="lp">${[[30, 30, 14], [70, 22, 10], [62, 64, 16], [24, 72, 9], [86, 52, 7]].map(([x, y, r]) =>
    `<path class="w2" d="M${x} ${y - r}Q${x + r * .15} ${y - r * .15} ${x + r} ${y}Q${x + r * .15} ${y + r * .15} ${x} ${y + r}Q${x - r * .15} ${y + r * .15} ${x - r} ${y}Q${x - r * .15} ${y - r * .15} ${x} ${y - r}Z"/>
     <path class="w0" d="M${x - r * .5} ${y - r * .5}L${x + r * .5} ${y + r * .5}M${x + r * .5} ${y - r * .5}L${x - r * .5} ${y + r * .5}"/>`).join('')}</g>` },
  // The radio aerial that saved the tower in 1909
  antenna: { loop: 'sound', svg: `<path class="w2" d="M30 96L50 20L70 96"/><path class="w0" d="M36 74H64M40 58H60M44 42H56M36 74L60 58M64 74L40 58M40 58L56 42M60 58L44 42"/>
    <path class="w2" d="M50 20V8"/><circle class="w2" cx="50" cy="6" r="3"/><path class="w2" d="M22 96H78"/>
    <g class="lp"><path d="M62 6Q68 12 62 18M38 6Q32 12 38 18"/><path class="w0" d="M70 0Q80 12 70 24M30 0Q20 12 30 24M78 -4Q92 12 78 28M22 -4Q8 12 22 28"/></g>` },

  // ---------- Cairo ----------
  // The three pyramids of Giza and the Sphinx before them, on the desert's edge
  pyramids: { loop: 'shine', svg: `
    ${hatch('a', 'M38 78L64 30L90 78Z', [64, 30, 90, 78], 2.4, '\\')}${hatch('b', 'M6 78L28 42L50 78Z', [28, 42, 50, 78], 2.4, '\\')}
    <path class="w2" d="M38 78L64 30L90 78"/><path d="M64 30L64 78"/><path class="w0" d="${each(8, (i) => `M${f(64 - (i + 1) * 3.2)} ${f(36 + i * 5.8)}H${f(64 + (i + 1) * 3.2)}`)}"/>
    <path class="w2" d="M6 78L28 42L50 78"/><path d="M28 42V78"/><path class="w2" d="M80 78L90 62L98 78"/>
    <path class="w2" d="M14 92H44Q46 84 42 80Q40 72 34 72Q28 72 28 78H18Q14 80 14 92Z"/><path class="w0" d="M30 76Q32 78 34 76M36 72V66Q34 64 32 66L30 72M22 86H40"/>
    <path class="w2" d="M0 92Q30 86 50 90Q72 94 100 88"/><path class="w0" d="M0 97Q30 92 54 96Q76 99 100 94"/>
    <g class="lp"><circle class="fill son" cx="16" cy="16" r="7"/><circle class="w2" cx="16" cy="16" r="7"/><path class="w0" d="M16 4V0M16 28V32M4 16H0M28 16H32M8 8L5 5M24 8L27 5"/></g>` },
  // A felucca under sail on the Nile
  felucca: { loop: 'bob', svg: `<g class="lp">
    ${hatch('s', 'M50 8L86 64H50Z', [50, 8, 86, 64], 2.6, '/')}
    <path class="w2" d="M50 8L86 64H50Z"/><path class="w2" d="M44 70V12"/><path class="w2" d="M30 62L86 8"/><path class="w0" d="M50 22H62M50 36H72M50 50H80"/>
    <path class="w2" d="M8 70H92Q86 82 72 82H26Q14 82 8 70Z"/><path class="w0" d="M14 74H88M20 78H80"/><path d="M8 70L4 66"/></g>
    <path d="M0 88q6-3 12 0t12 0 12 0 12 0 12 0 12 0 12 0 12 0"/><path class="w0" d="M8 95q6-3 12 0t12 0 12 0 12 0 12 0 12 0"/>
    <path class="w0" d="M86 40Q94 34 92 24M88 42L96 36"/>` },
  // A scarab, the ancient Egyptian sign of the rising sun
  scarab: { loop: 'shine', svg: `
    <path class="w2" d="M50 30Q70 32 72 56Q72 82 50 86Q28 82 28 56Q30 32 50 30Z"/><path d="M50 46V86M30 50Q50 44 70 50"/>
    <path class="w0" d="${scales([[38, 56], [44, 60], [56, 60], [62, 56], [40, 68], [46, 72], [54, 72], [60, 68]], 2.4)}"/>
    <path class="w2" d="M40 30Q40 20 50 18Q60 20 60 30"/><path class="w0" d="M44 24H56"/>
    <path d="M30 52L14 44L6 48M30 62L12 64L6 72M32 74L18 84L14 94M70 52L86 44L94 48M70 62L88 64L94 72M68 74L82 84L86 94"/>
    <g class="lp"><circle class="fill son" cx="50" cy="10" r="7"/><circle class="w2" cx="50" cy="10" r="7"/></g>
    <path class="w0" d="M38 18Q30 8 22 10M62 18Q70 8 78 10"/>` },
  // Papyrus reeds by the river
  papyrus: { loop: 'sway', svg: `<g class="lp">${[[30, 96, 22, 28], [50, 96, 50, 14], [70, 96, 76, 30]].map(([x, y, tx, ty]) =>
    `<path class="w2" d="M${x} ${y}Q${(x + tx) / 2} ${(y + ty) / 2 + 10} ${tx} ${ty}"/>
     <path d="M${tx} ${ty}L${tx - 14} ${ty - 10}M${tx} ${ty}L${tx - 8} ${ty - 16}M${tx} ${ty}L${tx} ${ty - 18}M${tx} ${ty}L${tx + 8} ${ty - 16}M${tx} ${ty}L${tx + 14} ${ty - 10}"/>
     <path class="w0" d="M${tx - 14} ${ty - 10}q2-4 4-4M${tx - 8} ${ty - 16}q2-4 4-3M${tx} ${ty - 18}q2-3 4-2M${tx + 8} ${ty - 16}q2-3 4-1M${tx + 14} ${ty - 10}q1-3 3 0"/>`).join('')}</g>
    <path class="w0" d="M0 96q8-3 16 0t16 0 16 0 16 0 16 0 16 0"/><path d="M14 92Q22 86 30 92M66 92Q74 86 84 92"/>` },
  // A minaret against the evening sky, for the "city of a thousand minarets"
  minaret: { loop: 'shine', svg: `
    ${hatch('m', 'M42 42H58V92H42Z', [42, 42, 58, 92], 3, '-')}
    <path class="w2" d="M40 92V42H60V92"/><path class="w2" d="M36 42H64V38H36ZM44 38V24H56V38"/><path class="w0" d="M46 34V28M50 34V28M54 34V28"/>
    <path class="w2" d="M40 24H60L56 20H44Z"/><path class="w2" d="M44 20Q44 10 50 6Q56 10 56 20"/><path d="M50 6V0"/>
    <path class="w2" d="M30 92H70"/><path class="w0" d="M44 60V54Q50 48 56 54V60M44 78V72Q50 66 56 72V78"/>
    <path d="M10 92V70Q10 60 20 58Q30 60 30 70V92M70 92V70Q70 60 80 58Q90 60 90 70V92"/><path class="w0" d="M16 92V76H24V92M76 92V76H84V92"/>
    <g class="lp"><path class="w0" d="M8 20l1.4-4 1.4 4-4-1.4 4-1.4M88 12l1.4-4 1.4 4-4-1.4 4-1.4M78 30l1-3 1 3-3-1 3-1"/></g>` },
  // King Khufu's cedar boat, found beside the Great Pyramid in 1954
  'sun-boat': { loop: 'bob', svg: `<g class="lp">
    <path class="w2" d="M4 54Q14 64 30 66H70Q86 64 96 54Q90 50 86 52Q72 58 50 58Q28 58 14 52Q10 50 4 54Z"/>
    <path class="w2" d="M4 54Q2 40 10 32Q8 44 14 52M96 54Q98 40 90 32Q92 44 86 52"/><path class="w0" d="M12 56H88M18 60H82"/>
    <path class="w2" d="M36 58V40H64V58"/><path class="w0" d="M36 44H64M42 40V58M50 40V58M58 40V58"/><path d="M32 40H68"/>
    <path d="M22 58L14 78M30 60L24 80M70 60L76 80M78 58L86 78"/><path class="w0" d="M10 82H90"/></g>
    <path class="w0" d="M0 90q8-3 16 0t16 0 16 0 16 0 16 0 16 0"/>` },
  // An old glass-plate camera on its tripod (photographers of the 1850s)
  'old-camera': { loop: 'shine', svg: `
    ${hatch('c', 'M22 22H62V52H22Z', [22, 22, 62, 52], 2.6, '/')}
    <path class="w2" d="M20 20H64V54H20Z"/><path class="w2" d="M64 28L84 22V52L64 46"/><circle class="w2" cx="88" cy="37" r="5"/><circle class="w0" cx="88" cy="37" r="2.4"/>
    <path class="w0" d="M64 30L84 26M64 44L84 48"/><path d="M26 14H40V20H26Z"/>
    <path class="w2" d="M42 54L24 96M42 54L42 96M42 54L60 96"/><path class="w0" d="M32 76H52"/>
    <g class="lp"><path class="w0" d="M8 10l2 3M4 22l3 1M12 4l1 3"/></g>` },

  // ---------- Kyoto ----------
  // Kinkaku-ji, the Golden Pavilion, mirrored in its pond
  kinkaku: { loop: 'ripple', svg: `
    ${hatch('g', 'M32 30H68V44H32ZM28 52H72V64H28Z', [28, 30, 72, 64], 2.2, '|')}
    <path class="w2" d="M22 52Q50 46 78 52Q82 50 84 46M22 52Q18 50 16 46"/><path class="w2" d="M26 30Q50 24 74 30Q78 28 80 24M26 30Q22 28 20 24"/>
    <path class="w2" d="M36 18Q50 10 64 18Q67 16 68 12M36 18Q33 16 32 12"/><path d="M50 12V4"/><path class="w0" d="M46 6Q50 2 54 6L50 8Z"/>
    <path class="w2" d="M38 18V30M62 18V30M32 30V44M68 30V44M28 52V64M72 52V64"/><path d="M42 22H58M36 34H64V40H36"/>
    <path class="w2" d="M26 44H74V48H26Z"/><path class="w0" d="M38 52V64M50 52V64M62 52V64M32 56H68"/>
    <path class="w2" d="M18 64H82Q76 70 50 70Q24 70 18 64Z"/>
    <g class="lp"><path class="w0" d="M26 76H74M30 80H70M36 84H64M42 88H58"/><path d="M4 74q8-3 16 0M80 74q8-3 16 0M8 92q8-3 16 0t16 0 16 0 16 0 16 0"/></g>
    <path class="w0" d="M4 60Q10 48 18 56M86 56Q92 48 98 58"/>` },
  // A shrine gate (torii)
  torii: { loop: 'shine', svg: `
    <path class="w2" d="M4 18Q50 8 96 18L94 26Q50 18 6 26Z"/><path class="fill son" d="M4 18Q50 8 96 18L94 26Q50 18 6 26Z"/><path class="w2" d="M14 36H86V42H14Z"/>
    <path class="w2" d="M24 26V96M76 26V96M30 26V96M70 26V96"/><path class="w0" d="M48 26V36M52 26V36"/><path class="w0" d="M26 60H28M72 60H74"/>
    <path class="w2" d="M18 96H36M64 96H82"/><path class="w0" d="M40 54H60V70H40Z"/>
    <g class="lp"><path class="w0" d="M4 70q4-2 8 0M88 80q4-2 8 0M8 84q4-2 8 0"/></g>` },
  // A maple leaf turning red in autumn
  maple: { loop: 'swing', svg: `<g class="lp"><path class="w2" d="M50 90V60"/>
    <path class="w2" d="M50 62L30 70L34 60L14 56L22 50L8 38L26 38L22 24L36 32L40 14L50 26L60 14L64 32L78 24L74 38L92 38L78 50L86 56L66 60L70 70Z"/>
    <path class="fill son soft" d="M50 62L30 70L34 60L14 56L22 50L8 38L26 38L22 24L36 32L40 14L50 26L60 14L64 32L78 24L74 38L92 38L78 50L86 56L66 60L70 70Z"/>
    <path d="M50 62V24M50 56L22 42M50 56L78 42M50 50L32 28M50 50L68 28"/><path class="w0" d="M42 52L36 48M58 52L64 48M40 40L36 34M60 40L64 34M50 40L46 36M50 40L54 36"/></g>` },
  // A branch of cherry blossom
  sakura: { loop: 'sway', svg: `<path class="w2" d="M4 90Q30 70 50 66Q74 62 96 40"/><path d="M40 68Q36 50 44 36M70 58Q72 44 84 34"/>
    <g class="lp">${[[44, 34, 8], [84, 32, 7], [20, 76, 6], [62, 54, 7], [94, 40, 5]].map(([x, y, r]) => `${each(5, (k) => { const a = -Math.PI / 2 + k * 2 * Math.PI / 5, [px, py] = polar(x, y, r, a), [l1, l2] = polar(x, y, r * .55, a - .5), [r1, r2] = polar(x, y, r * .55, a + .5); return `<path d="M${x} ${y}Q${l1} ${l2} ${px} ${py}Q${r1} ${r2} ${x} ${y}"/>`; })}<circle class="dot son" cx="${x}" cy="${y}" r="1.2"/>`).join('')}</g>
    <path class="w0" d="M30 96l2-3M70 90l2-3M50 96l2-3"/>` },
  // A folding fan
  fan: { loop: 'sway', svg: `<g class="lp">
    <path class="w2" d="M50 86L8 44Q50 2 92 44Z"/><path class="w0" d="${each(11, (i) => { const a = Math.PI + Math.PI / 4 + i * (Math.PI / 2) / 10, [x, y] = polar(50, 86, 58, a); return `M50 86L${x} ${y}`; })}"/>
    <path d="M22 58Q50 30 78 58"/><path class="w0" d="M30 50Q50 32 70 50"/>
    <circle class="fill son" cx="50" cy="36" r="7"/><circle class="w2" cx="50" cy="86" r="3"/><path class="w0" d="M50 89Q50 96 44 98"/></g>` },
  // Matcha in a tea bowl, with the bamboo whisk
  matcha: { loop: 'steam', svg: `
    ${hatch('b', 'M14 52H86Q84 84 50 86Q16 84 14 52Z', [14, 62, 86, 88], 2.4, '/')}
    <path class="w2" d="M12 50H88Q86 86 50 88Q14 86 12 50Z"/><path d="M14 56H86"/><path class="fill soft" d="M16 50Q50 44 84 50Z"/>
    <path class="w2" d="M36 88L38 94H62L64 88"/>
    <path class="w2" d="M70 46L84 12"/><path class="w0" d="M74 40L80 26M70 46Q64 44 66 38L76 16Q80 14 82 18"/>
    <g class="lp"><path class="w0" d="${curl(34, 44, 22)}"/></g><g class="lp2"><path class="w0" d="${curl(46, 42, 24, -1)}"/></g>` },

  // ---------- Rome ----------
  // The Colosseum: three tiers of arches, the attic storey, the broken outer ring
  colosseum: { loop: 'shine', svg: `
    ${hatch('w', 'M4 30Q50 18 96 30V86Q50 76 4 86Z', [4, 18, 96, 86], 3.2, '-')}
    <path class="w2" d="M4 86V34Q50 20 96 28V86"/><path class="w2" d="M2 88Q50 78 98 88"/>
    ${[[66, 50], [48, 38], [30, 30]].map(([y, h], k) => `<path d="M4 ${y}Q50 ${y - 12} 96 ${y - 6 + k * 0}"/>`).join('')}
    ${[0, 1, 2].map((r) => each(8, (i) => { const x = 8 + i * 11, y = 84 - r * 18 - (i < 5 ? 0 : 0); return `<path class="${r ? 'w0' : ''}" d="M${x} ${f(y - Math.sin((i / 7) * Math.PI) * 4)}V${f(y - 10 - Math.sin((i / 7) * Math.PI) * 4)}Q${x + 4} ${f(y - 15 - Math.sin((i / 7) * Math.PI) * 4)} ${x + 8} ${f(y - 10 - Math.sin((i / 7) * Math.PI) * 4)}V${f(y - Math.sin((i / 7) * Math.PI) * 4)}"/>`; })).join('')}
    <path class="w2" d="M70 28L76 20L82 24L88 18L96 22"/>
    <g class="lp"><path class="w0" d="M10 10l1.4-4 1.4 4-4-1.4 4-1.4M30 6l1-3 1 3-3-1 3-1"/></g>` },
  // A Roman triumphal arch
  'roman-arch': { loop: 'shine', svg: `
    ${hatch('a', 'M10 30H90V92H10Z', [10, 30, 90, 92], 3.4, '-')}
    <path class="w2" d="M8 92V28H92V92"/><path class="w2" d="M36 92V62Q50 44 64 62V92"/><path class="w0" d="M39 92V63Q50 48 61 63V92"/>
    <path class="w2" d="M4 28H96V20H4Z"/><path class="w2" d="M14 20V8H86V20"/><path class="w0" d="M22 12H78M22 16H70"/>
    <path d="M16 92V34M28 92V34M72 92V34M84 92V34"/><path class="w0" d="M14 34H30M70 34H86"/>
    <path d="M16 70V58Q22 52 28 58V70M72 70V58Q78 52 84 58V70"/><path class="w2" d="M0 94H100"/>
    <g class="lp"><path class="w0" d="M46 34L50 26L54 34Z"/></g>` },
  // An amphora for oil and wine
  amphora: { loop: 'sway', svg: `<g class="lp">
    ${hatch('a', 'M30 34Q20 50 30 70Q40 88 50 94Q60 88 70 70Q80 50 70 34Z', [20, 52, 80, 94], 2.4, '\\')}
    <path class="w2" d="M40 10H60V18Q60 28 70 34Q82 50 70 72Q60 88 50 96Q40 88 30 72Q18 50 30 34Q40 28 40 18Z"/>
    <path d="M40 18H60M32 40H68"/><path class="w0" d="M26 46H74M30 52Q50 58 70 52"/><path class="w0" d="${each(7, (i) => `M${33 + i * 5.6} 46l2.8 -3.4l2.8 3.4`)}"/>
    <path class="w2" d="M40 16Q24 16 26 34M60 16Q76 16 74 34"/></g>` },
  // An olive branch
  olive: { loop: 'sway', svg: `<path class="w2" d="M6 92Q40 66 94 14"/>
    <g class="lp">${[[22, 80, -1], [32, 72, 1], [42, 62, -1], [52, 54, 1], [62, 44, -1], [72, 34, 1], [82, 24, -1]].map(([x, y, s]) =>
      `<path d="M${x} ${y}Q${x + s * 4} ${y - 14} ${x + s * 14} ${y - 18}Q${x + s * 8} ${y - 4} ${x} ${y}"/><path class="w0" d="M${x} ${y}L${x + s * 11} ${y - 15}"/>`).join('')}
    <ellipse class="w2" cx="40" cy="78" rx="4" ry="5"/><ellipse class="w2" cx="64" cy="58" rx="4" ry="5"/><ellipse class="w2" cx="78" cy="44" rx="3.4" ry="4.4"/></g>` },
  // A street drinking fountain (nasone), still running
  fountain: { loop: 'fall', svg: `
    ${hatch('f', 'M34 20H66V82H34Z', [34, 20, 66, 82], 3, '-')}
    <path class="w2" d="M32 82V22Q32 12 50 12Q68 12 68 22V82"/><path class="w2" d="M26 82H74V90H26Z"/><path class="w0" d="M40 30H60M40 70H60"/>
    <path class="w2" d="M50 46Q58 46 60 52"/><circle class="w0" cx="50" cy="40" r="4"/>
    <g class="lp"><path d="M60 54Q64 64 64 76"/><path class="w0" d="M62 58Q66 68 66 78"/></g>
    <g class="lp2"><path class="w0" d="M58 80q6-3 12 0M60 84q6-3 10 0"/></g>` },

  // ---------- New York ----------
  // The Statue of Liberty: torch raised, the crown's rays, the tablet, on her pedestal
  liberty: { loop: 'shine', svg: `
    ${hatch('p', 'M34 72H66V96H34Z', [34, 72, 66, 96], 3, '-')}
    <path class="w2" d="M30 96H70V72H34Z"/><path class="w2" d="M38 72V66H62V72"/><path class="w0" d="M42 80H58V90H42Z"/>
    <path class="w2" d="M42 66Q40 50 44 40Q46 34 50 32Q54 34 56 40Q60 50 58 66"/><path class="w0" d="M46 44Q48 56 46 66M52 44Q54 56 54 66"/>
    <circle class="w2" cx="50" cy="28" r="4"/><path d="${each(7, (i) => { const a = -Math.PI + i * Math.PI / 6, [x, y] = polar(50, 26, 5, a), [x2, y2] = polar(50, 26, 11, a); return `M${x} ${y}L${x2} ${y2}`; })}"/>
    <path class="w2" d="M56 38L64 12"/><path class="w2" d="M60 14H68L66 10H62Z"/>
    <g class="lp"><path class="fill son" d="M64 9Q58 4 64 -2Q70 4 64 9Z"/><path class="w0" d="M64 9Q58 4 64 -2Q70 4 64 9Z"/></g>
    <path class="w2" d="M44 48L36 44L38 56L46 58Z"/>` },
  // The skyline of Manhattan
  skyline: { loop: 'sound', svg: `
    <path class="w2" d="M2 92V60H12V48H20V92M20 92V36H28V26H32V12H34V26H38V36H46V92M46 92V54H56V92M56 92V30L62 20L68 30V92M68 92V46H78V92M78 92V58H90V40H98V92"/>
    <path class="w0" d="${each(5, (i) => `M24 ${42 + i * 9}H42`)}${each(6, (i) => `M60 ${36 + i * 9}H66`)}${each(4, (i) => `M82 ${64 + i * 7}H88`)}"/>
    <path class="w0" d="M6 66H10M6 74H10M6 82H10M14 54H18M14 62H18M50 60H54M50 70H54M50 80H54M70 52H76M70 62H76M70 72H76"/>
    <path class="w2" d="M0 94H100"/><g class="lp"><path class="w0" d="M86 14Q86 8 92 8Q98 8 98 14H86M10 20Q10 14 16 14Q22 14 22 20H10"/></g>` },
  // A harbour ferry of the Ellis Island years
  ferry: { loop: 'bob', svg: `<g class="lp">
    <path class="w2" d="M4 64H96L88 80H14Z"/><path class="w0" d="M10 70H92M14 75H88"/>
    <path class="w2" d="M18 64V50H82V64"/><path class="w0" d="${each(10, (i) => `M${22 + i * 6} 54V60`)}"/>
    <path class="w2" d="M28 50V40H70V50"/><path class="w2" d="M40 40V22H48V40M56 40V26H64V40"/><path d="M38 22H50M54 26H66"/>
    <g class="lp2"><path class="w0" d="${curl(44, 18, 16)}${curl(60, 22, 14, -1)}"/></g></g>
    <path d="M0 86q6-3 12 0t12 0 12 0 12 0 12 0 12 0 12 0 12 0"/><path class="w0" d="M8 93q6-3 12 0t12 0 12 0 12 0 12 0 12 0"/>` },
};
