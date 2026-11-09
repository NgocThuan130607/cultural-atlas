// Motif drawings of the landmarks of northern Vietnam, one signature drawing each (the hero of their pages),
// plus a few drawings used only in the north. See src/js/motifs.js for the conventions.
import { f, each, polar, hatch, scales, curl, water, roof, tiles, peak } from './helpers.js';

export const NORTH = {
  // Đồng Văn: grey karst peaks, the Happiness Road zig-zagging up, the flag tower of Lũng Cú
  'dong-van': { loop: 'flutter', svg: `
    ${hatch('k', `${peak(24, 92, 40, 70)}Z`, [4, 20, 44, 92], 2.8, '\\')}
    <path class="w2" d="${peak(24, 92, 40, 70)}"/><path class="w2" d="${peak(66, 92, 44, 58, 3)}"/><path d="${peak(94, 92, 20, 34)}"/>
    <path class="w0" d="M18 36q4 8 2 18M30 50q-3 8 0 16M60 50q4 8 2 14M72 62q-3 6 0 12"/>
    <path class="w2" d="M44 96Q60 92 58 86Q56 80 42 82Q30 82 34 76Q40 70 54 72Q66 72 62 66"/><path class="w0" d="M48 96Q64 92 62 86M38 78Q44 74 56 76"/>
    <path class="w2" d="M70 34V14M66 34H74"/><path class="w0" d="M68 34V26H72V34"/>
    <g class="lp"><path class="fill son" d="M70 6H86V14H70Z"/><path class="w2" d="M70 6H86V14H70Z"/><path class="fill gold" d="M78 8l.8 2h2l-1.6 1.2.6 2-1.8-1.2-1.8 1.2.6-2-1.6-1.2h2Z"/></g>` },
  // Sa Pa: rice terraces climbing to Fansipan, the stone church below
  sapa: { loop: 'shine', svg: `
    <path class="w2" d="M0 40L22 18L36 28L56 4L78 24L100 14"/><path class="w0" d="M56 4L52 14M56 4L62 12M22 18L20 24"/>
    <path d="M0 52Q30 42 56 48Q80 52 100 44"/><path class="w2" d="M0 62Q32 52 58 58Q82 62 100 54"/><path d="M0 72Q34 62 60 68Q84 72 100 64"/><path class="w2" d="M0 82Q36 72 62 78Q86 82 100 74"/>
    <path class="w0" d="${each(4, (k) => each(8, (i) => { const x = 6 + i * 12 + (k % 2) * 5, y = 56 + k * 10 - Math.sin(i / 2.6) * 3; return `M${x} ${f(y)}l0 -3M${x + 2} ${f(y)}l1 -3`; }))}"/>
    <path class="w2" d="M70 98V88L76 82L82 88V98M76 82V74M74 76H78"/><path class="w0" d="M74 98V92H78V98"/>
    <g class="lp"><path class="w0" d="M8 30q4-3 8 0M84 34q4-3 8 0M30 10q3-2 6 0"/></g>` },
  // Ba Bể: the lake between forested karst, a dugout canoe, a stilt house on the shore
  'ba-be': { loop: 'ripple', svg: `
    <path class="w2" d="${peak(18, 58, 34, 46)}"/><path class="w2" d="${peak(52, 58, 30, 38, 2)}"/><path d="${peak(84, 58, 32, 44, -2)}"/>
    <path class="w0" d="${each(12, (i) => `M${6 + i * 8} ${f(52 - Math.abs(Math.sin(i * 1.3)) * 6)}q2-4 4 0`)}"/>
    <path class="w2" d="M0 60H100"/><path class="w2" d="M70 60V48L78 42L86 48V60M72 48H84"/><path class="w0" d="M72 60V64M84 60V64"/>
    <g class="lp"><path class="w2" d="M18 76Q34 82 52 76L50 74H20Z"/><path class="w0" d="M44 74L56 60"/><path d="${water(86, -4, 104, 12, 2)}"/><path class="w0" d="${water(94, 4, 96, 12, 2)}"/></g>` },
  // Bản Giốc: wide tiers of falling water, a bamboo raft below
  'ban-gioc': { loop: 'fall', svg: `
    <path class="w2" d="M0 24Q20 18 40 24Q60 30 80 22Q90 18 100 22"/><path class="w0" d="M0 20Q14 12 30 18M60 16Q76 10 100 14"/>
    <path class="w2" d="M0 50Q24 44 46 50Q70 56 100 46"/><path d="M0 70Q28 64 52 70Q76 76 100 66"/>
    <g class="lp"><path d="${each(10, (i) => `M${6 + i * 10} ${f(24 + Math.sin(i) * 2)}V${f(48 - Math.sin(i * 1.4) * 2)}`)}"/><path class="w0" d="${each(10, (i) => `M${10 + i * 10} ${f(50 + Math.sin(i) * 2)}V${f(68 - Math.sin(i) * 2)}`)}"/></g>
    <g class="lp2"><path class="w0" d="${each(12, (i) => `M${4 + i * 8.6} 72V80`)}"/></g>
    <path class="w2" d="M30 88H70L66 92H34Z"/><path class="w0" d="M34 90H66M40 88V92M50 88V92M60 88V92"/><path class="w2" d="M62 88L72 74"/><path class="w0" d="${water(96, -4, 104, 12, 2)}"/>` },
  // Chi Lăng: the narrow valley between cliffs, the river and the old road, a banner on the heights
  'chi-lang': { loop: 'flutter', svg: `
    ${hatch('l', 'M0 96V10Q14 24 20 50Q26 72 34 96Z', [0, 10, 34, 96], 2.8, '/')}${hatch('r', 'M100 96V16Q86 30 80 52Q74 74 66 96Z', [66, 16, 100, 96], 2.8, '\\')}
    <path class="w2" d="M0 10Q14 24 20 50Q26 72 34 96M100 16Q86 30 80 52Q74 74 66 96"/>
    <path class="w2" d="M42 96Q46 70 48 50Q50 36 50 28M58 96Q54 70 52 50"/><path class="w0" d="M44 80h12M46 64h8"/>
    <path class="w0" d="M36 96q4-2 8 0M56 96q4-2 8 0"/><path class="w2" d="M14 26V6"/>
    <g class="lp"><path class="fill son" d="M14 6Q22 2 30 6V16Q22 20 14 16Z"/><path class="w2" d="M14 6Q22 2 30 6V16Q22 20 14 16Z"/></g>` },
  // Ô Quy Hồ: the road in long loops above a sea of cloud
  'o-quy-ho': { loop: 'glide', svg: `
    <path class="w2" d="M0 30L26 8L44 22L64 2L84 18L100 10"/><path class="w0" d="M26 8L22 16M64 2L60 12M64 2L70 10"/>
    <path class="w2" d="M100 30Q60 30 66 38Q72 44 34 44Q14 44 20 52Q26 58 64 58Q80 58 76 64"/><path class="w0" d="M100 34Q66 34 70 38M30 48Q20 50 26 54"/>
    <g class="lp"><path class="w2" d="M0 72Q12 62 26 68Q36 58 50 66Q62 58 74 66Q86 60 100 68"/><path d="M0 84Q16 76 30 82Q44 74 58 82Q72 76 86 82Q94 78 100 82"/><path class="w0" d="M0 94Q18 88 36 94Q54 88 72 94Q86 90 100 94"/></g>` },
  // Điện Biên Phủ: A1 hill with its trenches and the flag raised on the command bunker
  'a1-hill': { loop: 'flutter', svg: `
    ${hatch('h', 'M0 96Q30 40 50 40Q70 40 100 96Z', [0, 40, 100, 96], 3, '-')}
    <path class="w2" d="M0 96Q30 40 50 40Q70 40 100 96"/><path d="M14 80Q30 70 44 74Q56 78 70 70Q80 66 88 76"/><path class="w0" d="M24 64Q36 58 46 62Q58 66 72 58"/>
    <path class="w2" d="M36 52Q50 44 64 52V58H36Z"/><path class="w0" d="M40 58V54H60V58"/><path class="w2" d="M50 44V8"/>
    <g class="lp"><path class="fill son" d="M50 10H78V28H50Z"/><path class="w2" d="M50 10H78V28H50Z"/><path class="fill gold" d="M64 13l1.6 4.4h4.6l-3.8 2.8 1.4 4.4-3.8-2.8-3.8 2.8 1.4-4.4-3.8-2.8h4.6Z"/></g>
    <path class="w0" d="M8 30q3-3 6 0M20 22q3-3 6 0M86 34q3-3 6 0"/>` },
  // Sơn La prison: the stone wall and gate on Khau Cả hill, and Tô Hiệu's peach tree
  'son-la-prison': { loop: 'sway', svg: `
    ${hatch('w', 'M4 56H96V92H4Z', [4, 56, 96, 92], 3.4, '-')}
    <path class="w2" d="M2 92V54H98V92"/><path class="w0" d="${each(12, (i) => `M${4 + i * 8} 54V50H${8 + i * 8}V54`)}"/>
    <path class="w2" d="M40 92V70H60V92"/><path class="w0" d="M44 92V70M48 92V70M52 92V70M56 92V70"/><path class="w2" d="M36 70H64V64H36Z"/>
    <path class="w2" d="M0 94H100"/>
    <path class="w2" d="M80 50Q78 34 72 24M76 34Q84 28 90 30"/><g class="lp">${[[72, 22], [64, 26], [78, 16], [90, 28], [86, 20]].map(([x, y]) => `${each(5, (k) => { const a = -Math.PI / 2 + k * 2 * Math.PI / 5, [px, py] = polar(x, y, 4, a); return `<path class="w0" d="M${x} ${y}L${px} ${py}"/>`; })}<circle class="fill son soft" cx="${x}" cy="${y}" r="4"/><circle class="dot son" cx="${x}" cy="${y}" r="1"/>`).join('')}</g>` },
  // The Hùng Kings' Temple: the gate at the top of the stone steps through the forest
  'hung-temple': { loop: 'shine', svg: `
    <path class="w2" d="M30 96L42 60H58L70 96"/><path class="w0" d="${each(9, (i) => `M${f(32 + i * 1.3)} ${f(92 - i * 4)}H${f(68 - i * 1.3)}`)}"/>
    <path class="w2" d="M30 60V30M70 60V30M44 60V36M56 60V36"/><path class="w2" d="M26 30H74V26H26Z"/><path class="w0" d="M34 40H40V52H34ZM60 40H66V52H60Z"/>
    <path class="w2" d="${roof(22, 78, 26, 10, 6)}"/><path class="w0" d="${tiles(22, 78, 26, 10, 10)}"/><path class="w2" d="M40 16Q50 10 60 16"/><circle cx="50" cy="10" r="3"/>
    <path class="w2" d="M30 30Q26 24 30 18M70 30Q74 24 70 18"/>
    ${[[10, 56], [90, 54], [14, 80], [86, 80]].map(([x, y]) => `<path d="M${x} ${y + 14}V${y}"/><path class="w0" d="M${x - 8} ${y + 4}Q${x} ${y - 12} ${x + 8} ${y + 4}Z"/>`).join('')}` },
  // Dâu Pagoda: the brick Hòa Phong tower with its storeys and the bell inside
  'dau-tower': { loop: 'swing', svg: `
    ${hatch('t', 'M30 40H70V92H30Z', [30, 40, 70, 92], 2.6, '-')}
    <path class="w2" d="M28 92V58H72V92M32 58V40H68V58M36 40V26H64V40"/><path class="w2" d="${roof(24, 76, 58, 8, 5)}"/><path class="w2" d="${roof(28, 72, 40, 8, 5)}"/><path class="w2" d="${roof(32, 68, 26, 8, 4)}"/>
    <path class="w2" d="M42 92V78Q50 70 58 78V92"/><path class="w0" d="M44 50Q50 44 56 50V56H44Z"/><path class="w2" d="M46 26V18H54V26M50 18V10"/>
    <g class="lp"><path class="w0" d="M50 44V46"/><path d="M47 47Q47 46 50 46Q53 46 53 47V52H47Z"/></g><path class="w2" d="M10 94H90"/>` },
  // Hạ Long Bay: a sailing junk among the limestone islets
  'ha-long': { loop: 'bob', svg: `
    ${hatch('i', `${peak(20, 66, 26, 52)}Z`, [7, 14, 33, 66], 2.6, '\\')}
    <path class="w2" d="${peak(20, 66, 26, 52)}"/><path class="w2" d="${peak(84, 66, 24, 40, -2)}"/><path d="${peak(64, 66, 14, 22)}"/><path d="${peak(4, 66, 10, 16)}"/>
    <path class="w0" d="M16 30q3 6 2 14M80 40q3 6 1 12"/>
    <g class="lp"><path class="w2" d="M40 22Q34 40 40 60H58Q54 40 58 22Z"/><path class="fill son soft" d="M40 22Q34 40 40 60H58Q54 40 58 22Z"/><path class="w0" d="M38 30H57M37 38H56M37 46H56M38 54H57"/>
    <path class="w2" d="M48 60V16"/><path class="w2" d="M30 60H70L64 70H36Z"/><path class="w0" d="M34 64H66"/></g>
    <path d="${water(76, -4, 104, 12, 2.4)}"/><path class="w0" d="${water(84, 4, 96, 12, 2)}${water(92, -4, 104, 14, 1.6)}"/>` },
  // Kiếp Bạc and Côn Sơn: the temple gate among the pines
  'kiep-bac': { loop: 'sway', svg: `
    <path class="w2" d="M30 94V56M70 94V56M42 94V62M58 94V62"/><path class="w2" d="M26 56H74V52H26Z"/><path class="w2" d="${roof(22, 78, 52, 10, 6)}"/><path class="w0" d="${tiles(22, 78, 52, 10, 10)}"/>
    <path class="w2" d="M36 44Q50 36 64 44"/><circle cx="50" cy="38" r="2.6"/><path class="w0" d="M44 66H56V80H44Z"/><path class="w2" d="M20 94H80"/>
    <g class="lp">${[[12, 40], [88, 36]].map(([x, y]) => `<path class="w2" d="M${x} 94V${y}"/>${[0, 10, 20].map((d) => `<path d="M${x - 12 + d * .3} ${y + 8 + d}Q${x} ${y - 4 + d} ${x + 12 - d * .3} ${y + 8 + d}"/><path class="w0" d="M${x - 8} ${y + 7 + d}l-1 3M${x} ${y + 3 + d}l0 3M${x + 8} ${y + 7 + d}l1 3"/>`).join('')}`).join('')}</g>` },
  // Keo Pagoda: the three-tier wooden bell tower
  'keo-bell': { loop: 'swing', svg: `
    <path class="w2" d="M30 96V70H70V96M34 70V50H66V70M38 50V32H62V50"/>
    <path class="w2" d="${roof(22, 78, 70, 10, 6)}"/><path class="w0" d="${tiles(22, 78, 70, 10, 12)}"/><path class="w2" d="${roof(26, 74, 50, 10, 6)}"/><path class="w0" d="${tiles(26, 74, 50, 10, 10)}"/>
    <path class="w2" d="${roof(30, 70, 32, 10, 5)}"/><path class="w0" d="${tiles(30, 70, 32, 10, 8)}"/><path class="w2" d="M40 24Q50 16 60 24"/><path d="M50 18V8"/><circle class="w2" cx="50" cy="7" r="2.4"/>
    <path class="w0" d="M40 96V76M46 96V76M54 96V76M60 96V76M42 54H58V66H42Z"/>
    <g class="lp"><path class="w0" d="M50 34V36"/><path d="M45 37Q45 36 50 36Q55 36 55 37V46H45Z"/><path class="w0" d="M45 42H55"/></g><path class="w2" d="M16 98H84"/>` },
  // Tràng An: a rowing boat slipping under a karst cave arch, a temple roof among the peaks
  'trang-an': { loop: 'bob', svg: `
    ${hatch('c', 'M8 76Q8 14 50 10Q92 14 92 76Q80 42 50 42Q20 42 8 76Z', [8, 10, 92, 76], 3, '/')}
    <path class="w2" d="M8 76Q8 14 50 10Q92 14 92 76"/><path class="w2" d="M8 76Q20 42 50 42Q80 42 92 76"/>
    <path d="M36 46L38 56L40 46M60 46L62 54L64 46"/><path class="w2" d="${roof(66, 84, 12, 6, 3)}"/><path class="w0" d="M70 12V20M80 12V20"/>
    <g class="lp"><path class="w2" d="M30 78Q50 86 70 78L66 74H34Z"/><path class="w0" d="M40 74L44 64Q46 60 50 62L54 74"/><circle class="w2" cx="48" cy="58" r="3"/><path class="w2" d="M44 56L52 52L56 56"/><path d="M62 72L74 60"/></g>
    <path d="${water(88, -4, 104, 12, 2)}"/><path class="w0" d="${water(95, 4, 96, 12, 2)}"/>` },
  // The stakes of Bạch Đằng, driven into the riverbed to catch the invaders' ships at low tide
  stakes: { loop: 'ripple', svg: `<path class="w2" d="${each(9, (i) => { const x = 8 + i * 10.5, h = 30 + (i % 3) * 8; return `M${x} 84L${x + (i % 2 ? 3 : -3)} ${84 - h}L${x + (i % 2 ? 6 : 0)} 84`; })}"/>
    <path class="w0" d="${each(9, (i) => { const x = 8 + i * 10.5; return `M${x + 1} 70L${x + 3} 66`; })}"/>
    <g class="lp"><path d="${water(74, -4, 104, 12, 2.4)}"/><path class="w0" d="${water(84, 4, 96, 12, 2)}${water(92, -4, 104, 14, 1.6)}"/></g>` },
};
