// Motif drawings of the landmarks of central Vietnam and the Central Highlands, one signature drawing each,
// plus a few drawings used only there. See src/js/motifs.js for the conventions.
import { f, each, polar, hatch, scales, curl, water, roof, tiles, peak } from './helpers.js';

export const CENTRAL = {
  // The citadel of the Hồ dynasty: the south gate of huge fitted stone blocks, three arched openings
  'ho-gate': { loop: 'shine', svg: `
    <path class="w2" d="M4 92V30H96V92"/><path class="w2" d="M16 92V66Q24 54 32 66V92M42 92V62Q50 48 58 62V92M68 92V66Q76 54 84 66V92"/>
    <path class="w0" d="${each(7, (r) => each(6 - (r % 2), (i) => { const y = 30 + r * 9, x = 4 + i * 18 + (r % 2) * 9; return `M${x} ${y}V${y + 9}`; }) + `M4 ${39 + r * 9}H96`)}"/>
    <path class="w0" d="M18 66Q24 58 30 66M44 62Q50 52 56 62M70 66Q76 58 82 66"/><path class="w2" d="M0 94H100"/>
    <g class="lp"><path class="w0" d="M10 18q4-3 8 0M70 14q4-3 8 0M40 10q3-2 6 0"/></g>` },
  // Kim Liên: the thatched house of Làng Sen with its bamboo screen and the areca palm
  'thatch-house': { loop: 'sway', svg: `
    ${hatch('t', 'M10 52L36 24H72L92 52Z', [10, 24, 92, 52], 2.4, '/')}
    <path class="w2" d="M6 54L34 22H74L96 54"/><path class="w0" d="M34 22L38 54M74 22L70 54"/><path class="w2" d="M14 54H88V88H14Z"/>
    <path class="w0" d="${each(14, (i) => `M${18 + i * 5} 60V84`)}"/><path class="w2" d="M44 88V62H58V88"/><path class="w2" d="M8 90H94"/>
    <g class="lp"><path class="w2" d="M90 90Q92 60 94 28"/><path d="M94 28Q84 22 80 26M94 28Q90 18 84 16M94 28Q100 20 100 14M94 28Q102 30 100 36"/></g>` },
  // Ngã ba Đồng Lộc: incense at the graves, and the combs, mirrors and flowers visitors leave
  'dong-loc': { loop: 'steam', svg: `
    ${each(5, (i) => { const x = 10 + i * 20; return `<path class="w2" d="M${x - 7} 92V74Q${x - 7} 66 ${x} 66Q${x + 7} 66 ${x + 7} 74V92"/><path class="w0" d="M${x - 4} 76H${x + 4}M${x - 4} 80H${x + 4}"/>`; })}
    <path class="w2" d="M0 94H100"/><path d="M30 92V60M50 92V56M70 92V60"/><circle class="dot son" cx="30" cy="59" r="1.4"/><circle class="dot son" cx="50" cy="55" r="1.4"/><circle class="dot son" cx="70" cy="59" r="1.4"/>
    <g class="lp"><path class="w0" d="${curl(30, 54, 22)}"/></g><g class="lp2"><path class="w0" d="${curl(50, 50, 24, -1)}"/></g><g class="lp3"><path class="w0" d="${curl(70, 54, 20)}"/></g>
    <circle class="w2" cx="86" cy="22" r="7"/><path class="w0" d="M86 29V40M82 22h8"/><path class="w2" d="M8 20H24V24H8Z"/><path class="w0" d="${each(8, (i) => `M${9 + i * 2} 24V30`)}"/>
    ${each(3, (i) => { const [x, y] = [40 + i * 10, 18 + (i % 2) * 4]; return `${each(5, (k) => { const [px, py] = polar(x, y, 3.4, -Math.PI / 2 + k * 2 * Math.PI / 5); return `<path class="w0" d="M${x} ${y}L${px} ${py}"/>`; })}<circle class="fill son soft" cx="${x}" cy="${y}" r="3.4"/>`; })}` },
  // Hiền Lương bridge over the Bến Hải river, the flagpole on its bank
  'hien-luong': { loop: 'flutter', svg: `
    <path class="w2" d="M2 66H98"/><path d="M2 62H98"/><path class="w0" d="${each(17, (i) => `M${4 + i * 5.6} 62V66`)}"/>
    <path class="w2" d="M8 66V80M30 66V80M50 66V80M70 66V80M92 66V80"/><path class="w0" d="M8 72L30 66M30 72L50 66M50 72L70 66M70 72L92 66"/>
    <path class="w2" d="M18 62V10"/><path class="w0" d="M15 62V58H21V62"/>
    <g class="lp"><path class="fill son" d="M18 10H44V26H18Z"/><path class="w2" d="M18 10H44V26H18Z"/><path class="fill gold" d="M31 13l1.4 4h4.2l-3.4 2.4 1.2 4-3.4-2.4-3.4 2.4 1.2-4-3.4-2.4h4.2Z"/></g>
    <path d="${water(86, -4, 104, 12, 2.4)}"/><path class="w0" d="${water(93, 4, 96, 12, 2)}"/>` },
  // Huế's Meridian Gate (Ngọ Môn): the stone base with its five openings, the Five Phoenix pavilion above
  'ngo-mon': { loop: 'shine', svg: `
    ${hatch('b', 'M4 60H96V94H4Z', [4, 60, 96, 94], 3.2, '-')}
    <path class="w2" d="M2 94V58H98V94"/><path class="w2" d="M42 94V78Q50 68 58 78V94"/><path d="M22 94V82Q27 76 32 82V94M68 94V82Q73 76 78 82V94M8 94V86Q11 82 14 86V94M86 94V86Q89 82 92 86V94"/>
    <path class="w2" d="M14 58V44H86V58"/><path class="w0" d="${each(13, (i) => `M${18 + i * 5.4} 44V58`)}"/>
    <path class="w2" d="${roof(8, 92, 44, 12, 6)}"/><path class="w0" d="${tiles(8, 92, 44, 12, 16)}"/><path class="w2" d="M28 36V28H72V36"/>
    <path class="w2" d="${roof(22, 78, 28, 10, 5)}"/><path class="w0" d="${tiles(22, 78, 28, 10, 10)}"/><path class="w2" d="M40 20Q50 14 60 20"/><circle class="dot son" cx="50" cy="16" r="1.8"/>
    <path class="w2" d="M8 44Q4 38 8 34M92 44Q96 38 92 34"/>` },
  // Hội An: the Japanese covered bridge (Chùa Cầu), and lanterns along the street
  'chua-cau': { loop: 'lantern', svg: `
    ${hatch('r', 'M14 40Q50 28 86 40L78 30H22Z', [14, 28, 86, 42], 2.2, '|')}
    <path class="w2" d="${roof(10, 90, 42, 10, 6)}"/><path class="w2" d="M14 40L24 28H76L86 40"/><path class="w2" d="M20 28Q50 22 80 28"/>
    <path class="w2" d="M16 42V62M84 42V62M36 42V62M64 42V62"/><path class="w0" d="M16 50H84M20 42L36 50M80 42L64 50"/>
    <path class="w2" d="M4 62Q50 54 96 62"/><path d="M8 68Q50 60 92 68"/><path class="w2" d="M10 66V84M90 66V84"/><path class="w0" d="${water(88, -4, 104, 12, 2)}${water(95, 4, 96, 12, 2)}"/>
    <g class="lp">${[26, 50, 74].map((x) => `<path class="w0" d="M${x} 42V46"/><ellipse class="fill son soft" cx="${x}" cy="51" rx="4" ry="5"/><ellipse class="w2" cx="${x}" cy="51" rx="4" ry="5"/><path class="w0" d="M${x} 56V59"/>`).join('')}</g>` },
  // Lý Sơn: the volcanic island, its crater, and the garlic fields in white sand
  'ly-son': { loop: 'sway', svg: `
    <path class="w2" d="M2 56Q20 30 40 34Q46 22 58 24Q66 32 72 30Q86 34 98 56"/><path class="w0" d="M42 34Q50 30 58 26M46 32Q52 28 56 30"/>
    <path class="w0" d="M12 52Q26 44 40 46M64 44Q78 42 88 50"/><path d="M2 60H98"/>
    <g class="lp">${[22, 40, 58, 76].map((x) => `<path class="w2" d="M${x} 90Q${x - 8} 84 ${x - 7} 76Q${x - 4} 70 ${x} 68Q${x + 4} 70 ${x + 7} 76Q${x + 8} 84 ${x} 90Z"/><path class="w0" d="M${x} 90Q${x - 3} 80 ${x} 68Q${x + 3} 80 ${x} 90M${x} 68Q${x - 2} 60 ${x - 4} 54M${x} 68Q${x + 1} 58 ${x + 4} 52"/>`).join('')}</g>
    <path class="w0" d="M4 94H96"/>` },
  // Quang Trung Museum: the Tây Sơn war drums
  'tay-son-drum': { loop: 'sound', svg: `
    ${hatch('d', 'M24 40H76V80H24Z', [24, 40, 76, 80], 2.6, '|')}
    <ellipse class="w2" cx="50" cy="40" rx="28" ry="9"/><ellipse class="w0" cx="50" cy="40" rx="22" ry="6"/><path class="w2" d="M22 40Q18 60 22 80Q50 92 78 80Q82 60 78 40"/>
    <path class="w0" d="${each(10, (i) => `M${f(26 + i * 5.4)} ${f(44 + Math.sin((i / 9) * Math.PI) * 6)}l0 3`)}${each(10, (i) => `M${f(26 + i * 5.4)} ${f(76 + Math.sin((i / 9) * Math.PI) * 6)}l0 -3`)}"/>
    <path class="w2" d="M22 80L14 94M78 80L86 94M50 88V96"/><path class="w2" d="M30 10L42 32M70 10L58 32"/><circle class="w2" cx="30" cy="9" r="3"/><circle class="w2" cx="70" cy="9" r="3"/>
    <g class="lp"><path class="w0" d="M8 30Q2 40 8 50M92 30Q98 40 92 50M14 24Q4 40 14 56M86 24Q96 40 86 56"/></g>` },
  // Po Nagar: the Cham brick tower on its hill
  'po-nagar': { loop: 'shine', svg: `
    ${hatch('t', 'M32 40H68V88H32Z', [32, 40, 68, 88], 2.6, '-')}
    <path class="w2" d="M30 88V40H70V88"/><path class="w2" d="M34 40V28H66V40M38 28V18H62V28M42 18V10H58V18M46 10L50 2L54 10"/>
    <path class="w2" d="M42 88V64Q42 54 50 50Q58 54 58 64V88"/><path class="w0" d="M46 88V66Q50 58 54 66V88"/>
    <path class="w0" d="M30 48H26V40M70 48H74V40M34 34H30M66 34H70M38 24H34M62 24H66"/><path d="M26 40L30 36M74 40L70 36M30 30L34 26M70 30L66 26"/>
    <path class="w2" d="M4 96Q20 86 30 88H70Q80 86 96 96"/><path class="w0" d="M10 94Q20 90 28 92M72 92Q80 90 90 94"/>
    <g class="lp"><path class="w0" d="M12 20l1.4-4 1.4 4-4-1.4 4-1.4M84 30l1.4-4 1.4 4-4-1.4 4-1.4"/></g>` },
  // Đà Lạt railway station: the three pointed gables, and the pines behind
  'dalat-station': { loop: 'sway', svg: `
    ${hatch('g', 'M18 54L30 24L42 54ZM40 54L50 18L60 54ZM58 54L70 24L82 54Z', [18, 18, 82, 54], 2.4, '\\')}
    <path class="w2" d="M16 56L30 22L44 56M38 56L50 16L62 56M56 56L70 22L84 56"/><path class="w0" d="M24 48H36M46 44H54M64 48H76"/>
    <path class="w2" d="M8 56H92V90H8Z"/><path class="w0" d="${each(8, (i) => `M${14 + i * 10} 62V84`)}"/><path class="w2" d="M44 90V66H56V90"/><path class="w2" d="M2 92H98"/>
    <g class="lp">${[6, 94].map((x) => `<path class="w2" d="M${x} 56V24"/><path d="M${x - 6} 34L${x} 20L${x + 6} 34M${x - 7} 44L${x} 30L${x + 7} 44M${x - 8} 54L${x} 40L${x + 8} 54"/>`).join('')}</g>` },
  // Cham pottery shaped by hand, without a wheel, at Bàu Trúc
  'cham-pot': { loop: 'shine', svg: `
    ${hatch('p', 'M30 36Q14 50 22 74Q30 92 50 92Q70 92 78 74Q86 50 70 36Z', [14, 50, 86, 92], 2.4, '\\')}
    <path class="w2" d="M36 20H64V30Q70 34 72 36Q88 50 80 74Q72 94 50 94Q28 94 20 74Q12 50 28 36Q30 34 36 30Z"/><path d="M36 30H64"/>
    <path class="w0" d="M22 54Q50 62 78 54M24 64Q50 72 76 64"/><path class="son w0" d="${each(8, (i) => `M${f(26 + i * 6.4)} ${f(57 + Math.sin(i) * .5)}l3.2 4l3.2 -4`)}"/>
    <g class="lp"><path class="w0" d="M12 20q3-3 6 0M82 14q3-3 6 0"/></g>` },
};
