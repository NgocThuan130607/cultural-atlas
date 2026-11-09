// Shared motif drawings for Vietnam, by theme: landscape, village life, culture, history and nature.
// Each place's own drawings are in north.js, central.js and south.js. See src/js/motifs.js for the conventions.
import { f, each, polar, hatch, scales, curl, water, roof, tiles, peak } from './helpers.js';

export const THEMES = {
  // ---------- Landscape ----------
  // Limestone peaks rising from water or fields
  karst: { loop: 'ripple', svg: `
    ${hatch('a', `${peak(30, 80, 34, 66, -2)}Z`, [12, 14, 48, 80], 2.6, '\\')}
    <path class="w2" d="${peak(30, 80, 34, 66, -2)}"/><path class="w2" d="${peak(66, 80, 30, 50, 3)}"/><path d="${peak(88, 80, 18, 30)}"/><path d="${peak(8, 80, 14, 24)}"/>
    <path class="w0" d="M24 30q4 6 2 14M60 42q4 6 2 12M34 50q-3 8 0 16M70 56q-3 6 0 12"/>
    <path class="w0" d="M18 26l3 2M40 36l-3 2M72 40l3 1"/>
    <g class="lp"><path d="${water(86, -4, 104, 12, 2.4)}"/><path class="w0" d="${water(93, 4, 96, 12, 2)}"/></g>` },
  // Rice terraces stepping down a hillside
  terraces: { loop: 'shine', svg: `
    <path class="w2" d="M2 30Q30 20 56 26Q78 30 98 22"/><path d="M2 42Q32 32 58 38Q80 42 98 34"/><path class="w2" d="M2 54Q34 44 60 50Q82 54 98 46"/>
    <path d="M2 66Q36 56 62 62Q84 66 98 58"/><path class="w2" d="M2 78Q38 68 64 74Q86 78 98 70"/><path d="M2 90Q40 80 66 86Q88 90 98 82"/>
    <path class="w0" d="${each(5, (k) => each(9, (i) => { const x = 8 + i * 10 + (k % 2) * 4, y = 34 + k * 12 - Math.sin(i / 3) * 3; return `M${x} ${f(y)}l0 -3M${x + 2} ${f(y)}l1 -3`; }))}"/>
    <g class="lp"><path class="w0" d="M12 12q3-3 6 0M30 8q3-3 6 0M78 12q3-3 6 0"/></g>` },
  // A waterfall over stepped rock
  waterfall: { loop: 'fall', svg: `
    ${hatch('r', 'M0 20H22V96H0ZM78 20H100V96H78Z', [0, 20, 100, 96], 5, '/')}
    <path class="w2" d="M0 18H24Q30 18 32 26V40Q34 46 40 46H60Q66 46 68 40V26Q70 18 76 18H100"/><path d="M14 46H40M60 46H86M10 70H30M70 70H90"/>
    <path class="w2" d="M24 18V96M76 18V96"/>
    <g class="lp"><path d="M34 22V44M42 28V48M50 24V50M58 28V48M66 22V44"/><path class="w0" d="M38 50V74M46 52V80M54 52V80M62 50V74"/></g>
    <g class="lp2"><path class="w0" d="M36 80V92M44 84V96M56 84V96M64 80V92"/></g>
    <path class="w2" d="M24 86Q50 80 76 86"/><path class="w0" d="M30 90q4-3 8 0M48 92q4-3 8 0M62 90q4-3 8 0"/>` },
  // A cave mouth with stalactites, a boat gliding in
  cave: { loop: 'bob', svg: `
    ${hatch('c', 'M0 70Q0 12 50 6Q100 12 100 70Q80 30 50 30Q20 30 0 70Z', [0, 6, 100, 70], 3.2, '/')}
    <path class="w2" d="M0 70Q20 30 50 30Q80 30 100 70"/><path class="w2" d="M0 70Q0 12 50 6Q100 12 100 70"/>
    <path d="M30 37L32 48L34 36M44 31L46 46L48 31M58 32L60 44L62 33M72 38L73 46L75 40"/>
    <path class="w2" d="M0 76H100"/><path class="w0" d="${water(84, 0, 100, 12, 2)}"/>
    <g class="lp"><path class="w2" d="M30 72Q50 78 70 72L66 68H34Z"/><path d="M50 68V52M50 56L60 66"/><path class="w0" d="M44 68l-2-4M56 68l2-4"/></g>` },
  // A rowing boat (sampan) with its rower's oar
  sampan: { loop: 'bob', svg: `<g class="lp">
    <path class="w2" d="M4 62Q26 76 50 76Q74 76 96 62Q80 66 50 66Q20 66 4 62Z"/><path class="w0" d="M10 66Q30 72 50 72Q70 72 90 66"/>
    <path class="w2" d="M36 66V50Q50 42 64 50V66"/><path class="w0" d="M40 52V66M44 49V66M48 47V66M52 47V66M56 49V66M60 52V66"/>
    <path class="w2" d="M78 64L92 30"/><path class="w0" d="M90 36L94 34"/><path d="M14 64L6 46"/></g>
    <path d="${water(84, -4, 104, 12, 2.4)}"/><path class="w0" d="${water(92, 4, 96, 12, 2)}"/>` },
  // A sailing junk with ribbed sails
  junk: { loop: 'bob', svg: `<g class="lp">
    ${hatch('s', 'M30 10Q22 34 30 60H58Q52 34 58 10Z', [22, 10, 58, 60], 2.6, '|')}
    <path class="w2" d="M30 10Q22 34 30 60H58Q52 34 58 10Z"/><path d="M28 20H57M26 30H55M26 40H55M27 50H56"/>
    <path class="w2" d="M64 22Q58 40 64 60H84Q80 40 84 22Z"/><path class="w0" d="M62 32H82M61 42H81M62 52H82"/>
    <path class="w2" d="M44 60V6M74 60V18"/><path class="w2" d="M6 60H94L86 74H16Z"/><path class="w0" d="M12 66H90M16 70H86"/></g>
    <path d="${water(82, -4, 104, 12, 2.4)}"/><path class="w0" d="${water(90, 4, 96, 12, 2)}"/>` },
  // A mountain road climbing in hairpins
  'mountain-road': { loop: 'shine', svg: `
    <path class="w2" d="M0 40Q20 10 40 30Q60 4 82 22Q92 14 100 18"/><path class="w0" d="M10 40l4-6M30 24l4 4M54 18l3 6M70 14l4 4"/>
    <path class="w2" d="M30 96Q60 92 66 84Q72 74 40 72Q16 70 22 62Q30 54 62 54Q82 52 76 46Q70 40 50 42"/>
    <path class="w0" d="M36 96Q64 94 70 84Q76 72 44 68Q20 66 26 62Q34 58 64 58Q86 54 80 46"/>
    <g class="lp"><circle class="dot son" cx="50" cy="42" r="2"/><path class="w0" d="M8 70q4-2 8 0M84 76q4-2 8 0M6 54q3-2 6 0"/></g>` },
  // A sea of cloud filling the valleys between mountains
  'cloud-sea': { loop: 'glide', svg: `
    <path class="w2" d="${peak(28, 56, 40, 46)}"/><path class="w2" d="${peak(72, 56, 46, 40, 2)}"/><path class="w0" d="M24 20q4 8 2 18M68 26q4 8 2 14"/>
    <g class="lp"><path class="w2" d="M0 58Q10 48 22 54Q30 44 44 52Q54 44 66 52Q78 46 88 54Q96 50 100 54"/>
    <path d="M0 70Q14 62 26 68Q38 60 52 68Q64 62 76 68Q88 62 100 68"/><path class="w0" d="M0 80Q16 74 30 80Q44 74 58 80Q72 74 86 80Q94 76 100 80"/></g>` },
  pine: { loop: 'sway', svg: `<path class="w2" d="M50 98V30"/><path class="w0" d="M46 96L48 86M52 90L54 80"/>
    <g class="lp">${[[22, 26], [34, 20], [46, 16], [58, 12]].map(([y, w]) => `<path class="w2" d="M${50 - w} ${y + 16}Q50 ${y} ${50 + w} ${y + 16}"/><path class="w0" d="${each(Math.round(w / 3), (i) => { const x = 50 - w + i * 6 + 3; return `M${x} ${f(y + 16 - Math.sin(((x - 50 + w) / (2 * w)) * Math.PI) * 12)}l-1 4M${x + 1} ${f(y + 16 - Math.sin(((x - 50 + w) / (2 * w)) * Math.PI) * 12)}l1 4`; })}"/>`).join('')}
    <path class="w2" d="M44 18L50 4L56 18"/></g>` },
  bamboo: { loop: 'sway', svg: `<g class="lp">${[[30, 0], [50, 4], [70, -2]].map(([x, d]) =>
    `<path class="w2" d="M${x} 98Q${x + d} 50 ${x + d * 2} 4"/><path class="w0" d="M${x - 3} 80H${x + 3}M${x - 2.6 + d * .4} 60H${x + 3.4 + d * .4}M${x - 2.4 + d * .8} 40H${x + 3.6 + d * .8}M${x - 2 + d * 1.2} 20H${x + 4 + d * 1.2}"/>`).join('')}
    <path d="M32 58Q20 52 12 54Q20 60 32 58ZM50 38Q62 30 72 32Q62 40 50 38ZM70 64Q82 58 92 60Q82 66 70 64ZM52 74Q40 70 34 72Q42 78 52 74ZM48 18Q38 10 30 12Q38 20 48 18Z"/>
    <path class="w0" d="M32 58L14 55M50 38L70 33M70 64L90 61M52 74L36 73M48 18L32 13"/></g>` },
  coconut: { loop: 'sway', svg: `<path class="w2" d="M44 98Q48 70 56 36"/><path class="w0" d="M44 90h5M45 80h5M47 70h5M49 60h5M51 50h5M53 42h5"/>
    <g class="lp">${[[-1, 10, 46], [-1, 4, 30], [1, 6, 30], [1, 12, 50], [0, -2, 16]].map(([s, dy, l]) => `<path class="w2" d="M56 36Q${56 + s * l * .6} ${20 - dy} ${56 + s * l + (s === 0 ? 0 : 0)} ${36 + dy}"/><path class="w0" d="${each(6, (i) => { const t = (i + 1) / 7, x = 56 + s * l * t, y = 36 + (20 - dy - 36) * 2 * t * (1 - t) + (36 + dy - 36) * t * t; return `M${f(x)} ${f(y)}l${s * 2} 5`; })}"/>`).join('')}
    <circle class="w2" cx="52" cy="40" r="3.4"/><circle class="w2" cx="59" cy="41" r="3.4"/></g>` },
  // Mangroves standing on their roots in the tide
  mangrove: { loop: 'ripple', svg: `
    <path class="w2" d="M30 60Q30 40 34 30M70 62Q70 44 66 32"/><path d="M30 60Q22 66 18 80M30 60Q28 70 26 82M30 60Q36 70 38 82M30 60Q40 64 44 78M70 62Q62 68 58 82M70 62Q70 72 72 84M70 62Q80 68 84 80"/>
    <path class="w2" d="M34 30Q14 30 12 18Q20 4 38 10Q52 0 62 12Q82 6 88 20Q88 34 66 32"/><path class="w0" d="M18 18Q26 14 32 18M42 10Q50 8 56 14M66 14Q76 12 82 20M40 24Q50 20 60 24"/>
    <g class="lp"><path d="${water(84, -4, 104, 12, 2)}"/><path class="w0" d="${water(92, 4, 96, 12, 2)}"/></g>` },
  // A lighthouse on its headland
  lighthouse: { loop: 'sound', svg: `
    ${hatch('t', 'M40 34H60L64 84H36Z', [36, 34, 64, 84], 3, '-')}
    <path class="w2" d="M40 34H60L64 84H36Z"/><path class="w2" d="M38 34H62V28H38ZM42 28V18H58V28"/><path class="w2" d="M40 18L50 10L60 18"/><path class="w0" d="M46 22H54"/>
    <path class="w2" d="M10 96Q20 84 40 84H70Q90 84 96 96"/><path class="w0" d="M18 92Q26 88 36 88"/>
    <g class="lp"><path class="w0" d="M58 22L92 12M58 24L94 24M42 22L8 12M42 24L6 24"/></g>` },
  // Sand dunes in the wind
  dunes: { loop: 'glide', svg: `<path class="w2" d="M0 70Q24 40 46 58Q66 34 100 52"/><path d="M0 84Q30 64 56 76Q78 62 100 72"/>
    <path class="w0" d="M8 66Q24 50 40 60M54 54Q66 44 86 50M10 80Q28 70 46 76M60 74Q76 66 92 70"/><path class="w2" d="M0 94H100"/>
    <g class="lp"><path class="w0" d="M70 20q6-2 10 1M80 28q6-2 10 1M62 30q5-2 8 1"/><circle class="fill son" cx="22" cy="20" r="7"/><circle class="w2" cx="22" cy="20" r="7"/></g>` },
  // A wind turbine of the Bạc Liêu coast
  windmill: { loop: 'turn-window', svg: `<path class="w2" d="M48 96L50 34L52 96"/><path class="w2" d="M40 96H60"/>
    <g class="lp"><circle class="w2" cx="50" cy="32" r="3"/><path class="w2" d="M50 29Q52 14 50 2Q47 16 50 29ZM52.6 33.5Q66 40 78 46Q66 36 52.6 33.5ZM47.4 33.5Q34 40 22 46Q34 36 47.4 33.5Z"/></g>
    <path class="w0" d="${water(88, 0, 100, 12, 2)}"/>` },

  // ---------- Village life ----------
  // A water buffalo with its plough
  buffalo: { loop: 'bob', svg: `<g class="lp">
    <path class="w2" d="M18 44Q24 36 40 38H66Q80 38 82 50Q84 62 76 64V80M70 64V80M30 64V80M24 62V80Q14 60 18 44Z"/>
    <path class="w0" d="M30 44Q46 40 64 44M28 52Q46 48 66 52"/><path class="w2" d="M18 44Q10 44 6 50Q8 56 14 56Q18 54 18 50"/>
    <path class="w2" d="M14 40Q4 32 6 24Q10 34 18 38M20 38Q24 28 34 26Q26 32 24 40"/><circle class="dot" cx="11" cy="48" r="1"/>
    <path class="w0" d="M82 50Q90 52 90 62"/><path d="M76 44L94 34M88 30L96 40L94 52"/></g>
    <path class="w0" d="M0 84H100M6 90q4-2 8 0M40 90q4-2 8 0M76 90q4-2 8 0"/>` },
  // Rice ready for harvest: a sheaf of heavy stalks
  rice: { loop: 'sway', svg: `<g class="lp">${[[-14, 20], [-6, 12], [2, 8], [10, 14], [18, 24]].map(([dx, y]) =>
    `<path class="w2" d="M50 96Q${50 + dx * .4} 60 ${50 + dx} ${y + 20}"/><path d="M${50 + dx} ${y + 20}Q${50 + dx * 1.8} ${y} ${50 + dx * 2.4} ${y + 6}"/>${each(5, (i) => `<ellipse class="w0" cx="${f(50 + dx + (dx * 1.4) * (i / 5))}" cy="${f(y + 18 - i * 3)}" rx="1.4" ry="2.4" transform="rotate(${dx > 0 ? 30 : -30} ${f(50 + dx + (dx * 1.4) * (i / 5))} ${f(y + 18 - i * 3)})"/>`)}`).join('')}
    <path class="w2" d="M42 80H58"/><path class="w0" d="M44 84H56"/></g>` },
  // The round basket boat (thúng chai) of the central coast
  'basket-boat': { loop: 'bob', svg: `<g class="lp">
    ${hatch('b', 'M16 56Q16 82 50 82Q84 82 84 56Z', [16, 56, 84, 84], 3, '/')}${hatch('c', 'M16 56Q16 82 50 82Q84 82 84 56Z', [16, 56, 84, 84], 3, '\\')}
    <path class="w2" d="M14 56Q14 84 50 84Q86 84 86 56"/><ellipse class="w2" cx="50" cy="56" rx="36" ry="9"/><ellipse class="w0" cx="50" cy="56" rx="32" ry="7"/>
    <path class="w2" d="M70 52L90 20"/><path class="w0" d="M88 24L92 22"/></g>
    <path d="${water(88, -4, 104, 12, 2.4)}"/><path class="w0" d="${water(95, 4, 96, 12, 2)}"/>` },
  // A lift net (vó) over the water
  'fishing-net': { loop: 'swing', svg: `<path class="w2" d="M10 96L40 22"/><path class="w0" d="M14 96L42 26"/>
    <g class="lp"><path class="w2" d="M40 22L20 48M40 22L60 48M40 22L84 40"/><path class="w2" d="M20 48Q40 62 60 48Q74 54 84 40"/>
    <path class="w0" d="M24 50L44 26M30 53L48 28M36 55L52 30M42 56L58 34M48 56L64 38M54 54L70 40M26 52Q40 58 56 50M32 54Q48 58 62 50"/></g>
    <path d="${water(76, -4, 104, 12, 2.4)}"/><path class="w0" d="${water(84, 4, 96, 12, 2)}"/>` },
  // A carrying pole with two baskets of the market
  'carrying-pole': { loop: 'swing', svg: `<path class="w2" d="M6 26Q50 16 94 26"/><g class="lp">
    <path d="M14 26L8 54M14 26L22 54M86 26L80 54M86 26L94 54"/>
    ${[[15, 54], [87, 54]].map(([x, y]) => `${hatch(`k${x}`, `M${x - 12} ${y}H${x + 12}L${x + 9} ${y + 26}H${x - 9}Z`, [x - 12, y, x + 12, y + 26], 2.6, '/')}<path class="w2" d="M${x - 12} ${y}H${x + 12}L${x + 9} ${y + 26}H${x - 9}Z"/><path class="w0" d="M${x - 11} ${y + 8}H${x + 11}M${x - 10} ${y + 16}H${x + 10}"/>`).join('')}
    <circle class="w2" cx="10" cy="48" r="4"/><circle cx="18" cy="47" r="3.6"/><circle class="w2" cx="84" cy="48" r="4"/><circle cx="91" cy="47" r="3.4"/></g>` },
  // The bicycle that carried supplies over the mountains to Điện Biên Phủ
  'bicycle-tho': { loop: 'bob', svg: `<g class="lp">
    <circle class="w2" cx="20" cy="74" r="14"/><circle class="w2" cx="80" cy="74" r="14"/><path class="w0" d="${each(8, (i) => { const [x, y] = polar(20, 74, 13, i * Math.PI / 4), [x2, y2] = polar(80, 74, 13, i * Math.PI / 4); return `M20 74L${x} ${y}M80 74L${x2} ${y2}`; })}"/>
    <path class="w2" d="M20 74L40 50H70L80 74M40 50L52 74H62L70 50M52 74L46 50"/><path class="w2" d="M70 50L74 36H66M74 36L82 34"/>
    <path class="w2" d="M30 50V24H66V50"/><path class="w0" d="M30 32H66M30 40H66M42 24V50M54 24V50"/><path class="w2" d="M34 24V14H62V24"/><path class="w0" d="M38 14V24M48 14V24M58 14V24"/>
    <path class="w2" d="M74 36L94 40"/></g>` },
  // The Ba Na and Xơ Đăng communal house (nhà rông) with its tall axe-blade roof
  longhouse: { loop: 'shine', svg: `
    ${hatch('r', 'M50 4L80 58H20Z', [20, 4, 80, 58], 2.4, '|')}
    <path class="w2" d="M50 4L82 58H18Z"/><path class="w0" d="M50 4V58M34 32H66M26 46H74"/><path class="w2" d="M44 4L56 4M48 0V8"/>
    <path class="w2" d="M24 58H76V70H24Z"/><path class="w0" d="${each(10, (i) => `M${27 + i * 5} 58V70`)}"/>
    <path class="w2" d="M28 70V92M44 70V92M56 70V92M72 70V92"/><path d="M60 70L70 92M62 76H68M64 82H70"/><path class="w2" d="M8 92H92"/>` },
  // Cồng chiêng: bossed gongs of the Central Highlands, hung to play
  gongs: { loop: 'sound', svg: `<path class="w2" d="M8 14H92"/><path d="M28 14V24M72 14V24M50 14V44"/>
    ${[[28, 40, 16], [72, 40, 16], [50, 66, 22]].map(([x, y, r]) => `<circle class="w2" cx="${x}" cy="${y}" r="${r}"/><circle class="w0" cx="${x}" cy="${y}" r="${r - 3}"/><circle cx="${x}" cy="${y}" r="${r * .35}"/><circle class="fill soft" cx="${x}" cy="${y}" r="${r * .35}"/>`).join('')}
    <g class="lp"><path class="w0" d="M4 34Q0 40 4 46M96 34Q100 40 96 46M22 66Q16 72 22 78M78 66Q84 72 78 78"/></g>` },
  // A lute: the đàn tính of the Tày, its gourd body and long neck
  lute: { loop: 'sound', svg: `<path class="w2" d="M60 6L36 70"/><path class="w0" d="M62 8L38 71"/>
    <path class="w2" d="M56 6L66 4L64 14Z"/><path class="w0" d="M58 12l-4-1M57 16l-4-1M55 20l5 1"/>
    <path class="w2" d="M38 70Q14 64 16 82Q20 98 40 94Q58 90 50 74Q46 68 38 70Z"/><circle class="w0" cx="34" cy="84" r="5"/><path d="M28 90L44 76"/>
    <g class="lp"><path class="w0" d="M70 30q6 2 6 8M74 24q10 4 10 16M18 50q-4-4-2-10"/></g>` },
  // Quan họ: the nón quai thao hat with its tassel, and a betel tray
  'quan-ho': { loop: 'swing', svg: `<g class="lp">
    <ellipse class="w2" cx="50" cy="40" rx="40" ry="12"/><ellipse class="w0" cx="50" cy="40" rx="32" ry="9"/><ellipse class="w2" cx="50" cy="37" rx="14" ry="5"/>
    <path class="w0" d="${each(14, (i) => { const a = i * Math.PI / 7, [x, y] = [50 + 18 * Math.cos(a), 40 + 6 * Math.sin(a)], [x2, y2] = [50 + 38 * Math.cos(a), 40 + 11 * Math.sin(a)]; return `M${f(x)} ${f(y)}L${f(x2)} ${f(y2)}`; })}"/>
    <path class="son w2" d="M20 46Q22 66 30 74M80 46Q78 66 70 74"/><path class="son w0" d="M28 72l-2 8M30 74l0 8M32 72l2 8M68 72l-2 8M70 74l0 8M72 72l2 8"/></g>
    <path class="w2" d="M34 90H66L62 96H38Z"/><path class="w0" d="M40 90Q40 84 46 86Q50 82 54 86Q60 84 60 90"/>` },
  // A Đông Hồ woodblock print: the fat pig, in its frame
  'dong-ho': { loop: 'shine', svg: `<path class="w2" d="M8 8H92V92H8Z"/><path class="w0" d="M12 12H88V88H12Z"/>
    <path class="w2" d="M22 56Q22 38 44 36H64Q80 36 82 50Q84 62 74 64V74M66 64V74M34 64V74M28 62V74Q22 64 22 56Z"/>
    <path class="w2" d="M82 46L88 42M80 52Q86 54 86 58"/><circle class="dot" cx="76" cy="46" r="1.2"/>
    <path class="w0" d="M30 50Q34 44 40 48Q44 52 50 48Q56 44 62 48Q66 52 72 48"/><path class="w0" d="M36 44q2-3 5 0M50 42q2-3 5 0M62 44q2-3 5 0"/>
    <g class="lp"><path class="fill son" d="M16 16H28V28H16Z"/><path class="w0" d="M18 20h8M18 24h8"/></g>` },
  // Bánh chưng, the square rice cake of Tết, wrapped in leaves and tied with bamboo strips
  'banh-chung': { loop: 'shine', svg: `
    ${hatch('l', 'M20 30H80V86H20Z', [20, 30, 80, 86], 3, '\\')}
    <path class="w2" d="M18 28H82V88H18Z"/><path class="w0" d="M22 32H78V84H22Z"/><path class="son w2" d="M18 46H82M18 70H82M36 28V88M64 28V88"/>
    <path class="w2" d="M18 28L30 16H94L82 28M82 88L94 76V16"/><path class="son w0" d="M36 28L48 16M64 28L76 16M82 46L94 34M82 70L94 58"/>
    <g class="lp"><path class="w0" d="M40 10q4-4 8 0M58 8q4-4 8 0"/></g>` },
  // Highland coffee through a phin filter, drip by drip
  'coffee-phin': { loop: 'fall', svg: `
    <path class="w2" d="M32 20H68V40Q68 46 62 46H38Q32 46 32 40Z"/><path class="w0" d="M34 26H66M36 32H64"/><path class="w2" d="M26 46H74V50H26Z"/><path class="w2" d="M30 14H70V20H30Z"/><circle class="w2" cx="50" cy="10" r="3"/>
    ${hatch('g', 'M32 54H68V82Q68 92 50 92Q32 92 32 82Z', [32, 64, 68, 92], 2.4, '/')}
    <path class="w2" d="M30 52H70V82Q70 94 50 94Q30 94 30 82Z"/><path class="w0" d="M32 62H68"/><path d="M70 60Q82 60 82 70Q82 80 70 78"/>
    <g class="lp"><path class="w0" d="M50 52V56"/><circle class="dot" cx="50" cy="58" r="1.2"/></g>
    <path class="w0" d="M10 30Q6 26 10 22Q16 24 14 30Q12 34 10 30M90 34Q86 30 90 26Q96 28 94 34Q92 38 90 34"/>` },
  // A branch of tea, two leaves and a bud
  'tea-leaves': { loop: 'sway', svg: `<path class="w2" d="M50 98Q48 70 52 44"/><g class="lp">
    <path class="w2" d="M52 44Q52 26 58 14Q64 28 52 44Z"/><path class="w0" d="M52 44L57 20"/>
    ${[[50, 60, -1, 30], [51, 50, 1, 28], [49, 74, 1, 32], [49, 84, -1, 26]].map(([x, y, s, l]) => `<path class="w2" d="M${x} ${y}Q${x + s * l * .5} ${y - 16} ${x + s * l} ${y - 12}Q${x + s * l * .6} ${y + 2} ${x} ${y}Z"/><path class="w0" d="M${x} ${y}L${x + s * l * .9} ${y - 11}${each(3, (i) => `M${f(x + s * l * (.2 + i * .22))} ${f(y - 3 - i * 2.6)}l${s * 3} -5`)}"/>`).join('')}</g>` },
  // A loom with cloth on it
  loom: { loop: 'shine', svg: `<path class="w2" d="M10 96V20M90 96V20M6 20H94M10 60H90"/><path class="w0" d="M14 24H86"/>
    ${hatch('c', 'M20 24H80V60H20Z', [20, 24, 80, 60], 2.6, '|')}<path class="w2" d="M20 24H80V60H20Z"/>
    <path class="w0" d="${each(6, (i) => `M22 ${30 + i * 5}H78`)}"/><path class="son w0" d="M22 40H78M22 50H78"/>
    <path class="w2" d="M20 70H80V76H20Z"/><path class="w0" d="${each(13, (i) => `M${22 + i * 4.6} 60V70`)}"/>
    <g class="lp"><path class="w2" d="M30 84H70L74 88L70 92H30L26 88Z"/></g>` },
  // Brocade (thổ cẩm): a woven band of diamonds, hooks and stars
  brocade: { loop: 'shine', svg: `<path class="w2" d="M4 22H96M4 78H96"/><path class="w0" d="M4 26H96M4 74H96"/>
    <path class="w2" d="${each(4, (i) => { const x = 16 + i * 23; return `M${x} 50L${x + 11} 34L${x + 22} 50L${x + 11} 66Z`; })}"/>
    <path class="w0" d="${each(4, (i) => { const x = 16 + i * 23; return `M${x + 5} 50L${x + 11} 42L${x + 17} 50L${x + 11} 58Z`; })}"/>
    <path class="son" d="${each(5, (i) => { const x = 15 + i * 23; return `M${x - 4} 50H${x + 4}M${x} 46V54`; })}"/>
    <path class="w0" d="${each(16, (i) => `M${6 + i * 6} 30l3 3l3-3M${6 + i * 6} 70l3-3l3 3`)}"/>
    <g class="lp"><path class="w0" d="${each(8, (i) => `M${8 + i * 12} 12l2 4 2-4M${8 + i * 12} 88l2-4 2 4`)}"/></g>` },
  // A glazed vase (Biên Hòa, Bàu Trúc and the old kilns)
  vase: { loop: 'shine', svg: `
    ${hatch('v', 'M40 20Q22 40 28 70Q34 92 50 94Q66 92 72 70Q78 40 60 20Z', [22, 50, 78, 94], 2.4, '\\')}
    <path class="w2" d="M40 8H60V20Q78 40 72 70Q66 94 50 96Q34 94 28 70Q22 40 40 20Z"/><path d="M40 20H60M30 44H70"/>
    <path class="w0" d="M34 52Q40 46 46 52Q52 58 58 52Q64 46 68 52"/><path class="w0" d="M44 36Q50 30 56 36M46 62q4-6 8 0"/>
    <g class="lp"><path class="w0" d="M12 30l2-4 2 4M84 22l2-4 2 4"/></g>` },
  // A Mid-Autumn star lantern
  'star-lantern': { loop: 'swing', svg: `<path class="w0" d="M50 0V8"/><g class="lp"><path d="M50 8V16"/>
    <path class="fill son soft" d="M50 16L58 40L84 40L63 55L71 80L50 64L29 80L37 55L16 40L42 40Z"/><path class="w2" d="M50 16L58 40L84 40L63 55L71 80L50 64L29 80L37 55L16 40L42 40Z"/>
    <path class="w0" d="M50 16L50 50M84 40L50 50M71 80L50 50M29 80L50 50M16 40L50 50"/><path class="son w0" d="M71 80L74 92M29 80L26 92M50 64L50 74"/></g>` },

  // ---------- History ----------
  // A citadel gate: three arched openings and the watch-pavilion above
  'citadel-gate': { loop: 'shine', svg: `
    ${hatch('w', 'M6 50H94V94H6Z', [6, 50, 94, 94], 3.2, '-')}
    <path class="w2" d="M4 94V50H96V94"/><path class="w2" d="M38 94V76Q50 62 62 76V94"/><path d="M14 94V82Q20 74 26 82V94M74 94V82Q80 74 86 82V94"/>
    <path class="w0" d="${each(11, (i) => `M${6 + i * 8.4} 50V44H${10 + i * 8.4}V50`)}"/>
    <path class="w2" d="M26 44V30H74V44"/><path class="w0" d="M34 30V44M42 30V44M50 30V44M58 30V44M66 30V44"/>
    <path class="w2" d="${roof(20, 80, 30, 12, 6)}"/><path class="w0" d="${tiles(20, 80, 30, 12, 12)}"/><path class="w2" d="M30 22Q50 14 70 22"/><path d="M50 16V8"/>` },
  // A temple bell hanging in its frame
  bell: { loop: 'swing', svg: `<path class="w2" d="M10 96V12M90 96V12M4 12H96"/><path class="w0" d="M10 18H90"/><path class="w2" d="${roof(4, 96, 8, 8, 4)}"/>
    <g class="lp"><path d="M50 12V20"/><path class="w2" d="M38 24Q38 20 50 20Q62 20 62 24V30Q68 36 68 60H32Q32 36 38 30Z"/>
    <path class="w0" d="M36 34H64M34 44H66M33 54H67M44 34V54M56 34V54"/><path class="w2" d="M30 60H70V64H30Z"/><circle class="w0" cx="50" cy="48" r="4"/></g>
    <path class="w2" d="M70 72L94 70"/><path class="w0" d="M70 74L94 72"/>` },
  // A temple or communal-house roof with dragons on the ridge
  'temple-roof': { loop: 'shine', svg: `
    ${hatch('r', 'M14 54Q50 46 86 54L78 30H22Z', [14, 30, 86, 56], 2.4, '|')}
    <path class="w2" d="${roof(10, 90, 56, 14, 7)}"/><path class="w2" d="M14 54L24 30H76L86 54"/><path class="w2" d="M18 30Q50 24 82 30"/>
    <path class="w2" d="M24 30Q18 24 22 16Q26 22 30 22M76 30Q82 24 78 16Q74 22 70 22"/><path class="w2" d="M44 24Q50 14 56 24"/><circle class="w2" cx="50" cy="14" r="3.4"/>
    <path class="w2" d="M20 56H80V92H20Z"/><path class="w0" d="M30 56V92M40 56V92M60 56V92M70 56V92"/><path class="w2" d="M44 92V70H56V92"/><path class="w2" d="M10 94H90"/>` },
  // A stone stele carried on a tortoise, as at the temples of learning
  stele: { loop: 'shine', svg: `
    ${hatch('s', 'M34 14H66V70H34Z', [34, 14, 66, 70], 3, '-')}
    <path class="w2" d="M32 70V18Q32 8 50 8Q68 8 68 18V70"/><path class="w0" d="M40 22H60M38 30H62M38 38H62M38 46H62M38 54H62"/><path class="w2" d="M40 14Q50 10 60 14"/>
    <path class="w2" d="M18 82Q18 66 50 66Q82 66 82 82Q82 90 50 90Q18 90 18 82Z"/><path class="w0" d="${scales([[30, 76], [40, 72], [50, 71], [60, 72], [70, 76], [36, 82], [50, 80], [64, 82]], 3)}"/>
    <path class="w2" d="M82 78Q92 74 94 80Q92 86 84 84"/><path class="w0" d="M22 88L16 94M78 88L84 94"/>` },
  // An imperial seal with its tortoise-shaped handle
  seal: { loop: 'shine', svg: `<path class="w2" d="M18 60H82V90H18Z"/><path class="w0" d="M22 64H78V86H22Z"/>
    <path class="w2" d="M30 60Q30 40 50 38Q70 40 70 60"/><path class="w0" d="${scales([[42, 50], [50, 46], [58, 50], [46, 56], [54, 56]], 3)}"/><path class="w2" d="M70 52Q80 50 82 54Q78 58 70 58"/>
    <path class="son w0" d="M28 70H40V82H28ZM32 70V82M28 76H40M46 70H56V82H46M60 70H72V82H60ZM66 70V82"/>
    <g class="lp"><path class="w0" d="M10 36l2-4 2 4M86 30l2-4 2 4"/></g>` },
  // A war drum (also the Đông Sơn drum from the side)
  'war-drum': { loop: 'sound', svg: `
    ${hatch('d', 'M18 36H82V80H18Z', [18, 36, 82, 80], 3, '|')}
    <ellipse class="w2" cx="50" cy="36" rx="34" ry="10"/><ellipse class="w0" cx="50" cy="36" rx="28" ry="7"/><path class="w2" d="M16 36V80Q50 94 84 80V36"/>
    <path class="w0" d="${each(12, (i) => `M${18 + i * 6} ${f(80 + Math.sin((i / 11) * Math.PI) * 5)}l3 -4l3 4`)}"/><path class="w2" d="M16 50Q50 62 84 50"/>
    <path class="w2" d="M30 6L44 30M70 6L56 30"/><circle class="w2" cx="30" cy="6" r="3"/><circle class="w2" cx="70" cy="6" r="3"/>
    <g class="lp"><path class="w0" d="M6 20Q2 28 6 36M94 20Q98 28 94 36M10 12Q2 26 10 42M90 12Q98 26 90 42"/></g>` },
  // One of the nine dynastic urns of Huế
  urn: { loop: 'shine', svg: `
    ${hatch('u', 'M20 30Q14 60 34 80H66Q86 60 80 30Z', [14, 46, 86, 80], 2.4, '\\')}
    <path class="w2" d="M16 28H84Q90 58 66 80H34Q10 58 16 28Z"/><path class="w2" d="M12 24H88V28H12Z"/><path class="w2" d="M16 24Q6 18 10 10Q16 16 22 24M84 24Q94 18 90 10Q84 16 78 24"/>
    <path class="w0" d="M22 40H78M26 52H74"/><path d="M38 44Q44 38 50 44Q56 50 62 44"/><path class="w0" d="M34 64Q42 58 50 64Q58 70 66 64"/>
    <path class="w2" d="M34 80L28 96M66 80L72 96M50 84V96"/>` },
  // A steam locomotive of the colonial railways
  train: { loop: 'steam', svg: `
    ${hatch('b', 'M30 40H76V68H30Z', [30, 40, 76, 68], 3, '-')}
    <path class="w2" d="M28 40H78V70H28Z"/><path class="w2" d="M70 40V22H92V70H78"/><path class="w0" d="M74 28H88V40H74Z"/><path class="w2" d="M66 22H96V18H66Z"/>
    <path class="w2" d="M34 40V24H44V40"/><path class="w2" d="M30 24H48V20H30Z"/><path class="w2" d="M8 70L28 58V70Z"/>
    <circle class="w2" cx="40" cy="80" r="10"/><circle class="w2" cx="64" cy="80" r="10"/><circle class="w2" cx="86" cy="82" r="7"/>
    <path class="w0" d="${each(6, (i) => { const [x, y] = polar(40, 80, 9, i * Math.PI / 3), [x2, y2] = polar(64, 80, 9, i * Math.PI / 3); return `M40 80L${x} ${y}M64 80L${x2} ${y2}`; })}"/><path class="w2" d="M40 80H64"/>
    <path class="w2" d="M0 94H100"/><path class="w0" d="${each(10, (i) => `M${4 + i * 10} 94V98`)}"/>
    <g class="lp"><path class="w0" d="${curl(39, 18, 18)}"/></g><g class="lp2"><path class="w0" d="${curl(36, 12, 14, -1)}"/></g>` },
  // A church tower, as in Sa Pa, Phát Diệm or La Vang
  church: { loop: 'shine', svg: `
    ${hatch('w', 'M26 50H74V94H26Z', [26, 50, 74, 94], 3.2, '-')}
    <path class="w2" d="M24 94V50L50 26L76 50V94"/><path class="w2" d="M40 94V76Q50 66 60 76V94"/><circle class="w2" cx="50" cy="54" r="7"/><path class="w0" d="M50 47V61M43 54H57"/>
    <path class="w2" d="M42 34V14L50 4L58 14V34"/><path class="w0" d="M46 18V26Q50 22 54 26V18"/><path class="w2" d="M50 4V-4M46 0H54"/>
    <path class="w2" d="M8 94V62L24 52M92 94V62L76 52"/><path class="w0" d="M14 70V80M86 70V80"/><path class="w2" d="M2 96H98"/>` },

  // ---------- Nature ----------
  // A branch of peach blossom (hoa đào), flower of Tết in the north
  peach: { loop: 'sway', svg: `<path class="w2" d="M8 92Q30 74 46 60Q62 46 92 40"/><path d="M46 60Q44 40 56 26M64 50Q74 36 72 20"/>
    <g class="lp">${[[56, 24, 7], [72, 18, 6], [92, 40, 6], [30, 76, 7], [80, 46, 5], [44, 42, 5]].map(([x, y, r]) => `${each(5, (k) => { const a = -Math.PI / 2 + k * 2 * Math.PI / 5, [px, py] = polar(x, y, r, a), [l1, l2] = polar(x, y, r * 1.2, a - .55), [r1, r2] = polar(x, y, r * 1.2, a + .55); return `<path d="M${x} ${y}C${l1} ${l2} ${r1} ${r2} ${x} ${y}"/>`; })}<circle class="fill son soft" cx="${x}" cy="${y}" r="${r * .9}"/><circle class="dot son" cx="${x}" cy="${y}" r="1.1"/>`).join('')}</g>` },
  // Ban flowers (bauhinia) that whiten the hills of the north-west in March
  'hoa-ban': { loop: 'sway', svg: `<path class="w2" d="M50 98Q46 74 50 52"/><g class="lp">
    ${[[50, 40, 0], [26, 56, -30], [74, 54, 30]].map(([x, y, rot]) => `<g transform="rotate(${rot} ${x} ${y})">${each(5, (k) => { const a = -Math.PI / 2 + k * 2 * Math.PI / 5, [px, py] = polar(x, y, 13, a), [l1, l2] = polar(x, y, 13, a - .5), [r1, r2] = polar(x, y, 13, a + .5); return `<path class="w2" d="M${x} ${y}Q${l1} ${l2} ${px} ${py}Q${r1} ${r2} ${x} ${y}"/><path class="w0" d="M${x} ${y}L${px} ${py}"/>`; })}<path class="w0" d="M${x} ${y}l-3 -8M${x} ${y}l3 -8M${x} ${y}l0 -10"/></g>`).join('')}
    <path d="M50 52Q38 54 26 56M50 56Q62 56 74 54"/><path class="w2" d="M44 80Q30 74 22 78Q30 86 44 80ZM56 70Q70 64 78 68Q70 76 56 70Z"/></g>` },
  // A stork over the rice fields
  stork: { loop: 'glide', svg: `<g class="lp">
    <path class="w2" d="M30 50Q40 44 56 46Q66 48 70 54Q60 58 46 56Q36 56 30 50Z"/><path class="w2" d="M30 50Q22 48 18 40Q16 34 20 32"/><circle class="w2" cx="21" cy="31" r="3"/><path class="w2" d="M18 30L4 34"/>
    <path class="w2" d="M44 46Q52 22 80 12Q72 30 62 46"/><path class="w0" d="M50 44L66 22M56 46L72 20M60 46L76 18"/>
    <path class="w2" d="M70 54L92 62M70 54L94 58"/><path class="w0" d="M78 56l2 2M84 58l2 2"/></g>
    <path class="w0" d="M0 86Q14 80 28 86T56 86T84 86T112 86M4 92h8M20 94h8M60 92h8"/>` },
  // An elephant, as kept by the M'nông of Buôn Đôn
  elephant: { loop: 'bob', svg: `<g class="lp">
    ${hatch('e', 'M30 30Q56 22 74 34Q84 44 82 60V84H72V68H44V84H34V64Q22 58 26 42Z', [22, 24, 84, 84], 3, '\\')}
    <path class="w2" d="M30 34Q56 22 74 34Q86 44 82 62V86H72V70H44V86H34V66Q26 62 26 52"/><path class="w2" d="M30 34Q16 34 14 48Q12 62 18 74Q20 82 14 86"/>
    <path class="w2" d="M26 36Q36 32 40 42Q42 54 30 56Q24 54 26 44"/><circle class="dot" cx="22" cy="42" r="1.2"/><path d="M18 56Q10 60 8 54"/>
    <path class="w0" d="M48 40Q60 36 72 42M36 70h6M74 70h6M82 50Q90 52 90 60"/></g>` },
  // A pack horse of the mountain trails
  horse: { loop: 'bob', svg: `<g class="lp">
    <path class="w2" d="M24 46Q30 40 46 40H68Q80 40 82 50Q84 60 78 62V88M72 62V88M34 62V88M28 60V88Q20 58 24 46Z"/>
    <path class="w2" d="M24 46Q18 34 22 20L28 14Q34 18 34 26Q32 34 38 40"/><path class="w0" d="M22 20L16 26Q14 30 18 30M28 14l-2-6l4 4"/><circle class="dot" cx="26" cy="22" r="1"/>
    <path class="w0" d="M30 20Q34 26 40 34M32 18Q38 24 44 32"/><path class="w2" d="M82 50Q90 54 92 70"/>
    <path class="w2" d="M40 40V32H68V40"/><path class="w0" d="M44 32V40M52 32V40M60 32V40M40 36H68"/></g>` },
  // Maize growing in pockets of soil between the rocks
  maize: { loop: 'sway', svg: `<g class="lp">
    <path class="w2" d="M50 96V20"/><path class="w2" d="M50 74Q30 66 16 70Q30 60 50 66M50 56Q72 46 86 50Q72 40 50 48M50 38Q34 26 24 28Q36 20 50 30"/>
    <path class="w0" d="M50 72L22 69M50 54L80 50M50 36L30 28"/>
    <path class="w2" d="M56 60Q66 52 62 40Q54 46 56 60Z"/><path class="w0" d="${scales([[59, 50], [61, 46], [59, 54]], 1.4)}M62 40l2-6M63 40l4-4"/>
    <path class="w2" d="M50 20L46 8M50 20L54 6M50 20L50 4"/></g>
    <path class="w2" d="M4 96Q10 80 24 84Q28 76 36 82M64 82Q72 74 80 82Q90 78 96 96"/><path class="w0" d="M10 90q4-4 8 0M76 88q4-4 8 0"/>` },
  // A flame tree in red blossom (phượng), as in Hải Phòng
  'flame-tree': { loop: 'sway', svg: `<path class="w2" d="M50 98Q48 76 52 60M52 64Q36 56 24 58M52 62Q66 52 80 54"/>
    <g class="lp"><path class="w2" d="M10 50Q6 30 24 26Q30 10 50 12Q70 8 78 24Q96 28 92 48Q84 62 64 56Q50 64 36 58Q16 64 10 50Z"/>
    ${each(14, (i) => { const [x, y] = [18 + (i % 7) * 11, 26 + Math.floor(i / 7) * 16 + (i % 2) * 4]; return `<circle class="fill son soft" cx="${x}" cy="${y}" r="4.4"/><path class="son w0" d="M${x - 3} ${y}l3-3l3 3l-3 3Z"/>`; })}
    <path class="w0" d="M20 40q4-4 8 0M40 30q4-4 8 0M60 34q4-4 8 0M74 44q4-4 8 0"/></g>` },
  // A fish, of the river and the sea
  fish: { loop: 'glide', svg: `<g class="lp"><path class="w2" d="M18 56Q34 40 58 50Q36 66 18 56Z"/><path class="w0" d="${scales([[32, 52], [38, 50], [44, 50], [50, 51], [36, 56], [42, 55.6]], 1.6)}"/>
    <circle class="dot" cx="24" cy="53" r="1.2"/><path d="M36 46l3-4 3 4M38 60l3 3"/><g class="lp2"><path class="w2" d="M58 50L70 42L66 52L70 62Z"/></g></g>
    <path class="w0" d="${water(84, 0, 100, 12, 2)}"/>` },
};
