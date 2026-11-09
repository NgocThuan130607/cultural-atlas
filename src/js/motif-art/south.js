// Motif drawings of the landmarks of southern Vietnam, one signature drawing each, plus a few drawings used only
// in the south. See src/js/motifs.js for the conventions.
import { f, each, polar, hatch, scales, curl, water, roof, tiles, peak } from './helpers.js';

export const SOUTH = {
  // Independence Palace: the modernist façade with its screen of stone "bamboo" and the lawn before it
  'independence-palace': { loop: 'shine', svg: `
    <path class="w2" d="M4 36H96V40H4Z"/><path class="w2" d="M8 40V76H92V40"/><path class="w2" d="M4 76H96V80H4Z"/>
    <path class="w0" d="${each(22, (i) => `M${10 + i * 3.8} 42V74`)}"/><path class="w0" d="${each(22, (i) => `M${10 + i * 3.8} ${50 + (i % 3) * 6}h2`)}"/>
    <path class="w2" d="M30 36V28H70V36"/><path class="w0" d="M34 28V36M66 28V36"/><path class="w2" d="M44 28V20H56V28"/>
    <path class="w2" d="M40 80V90H60V80"/><path class="w0" d="M2 94Q50 86 98 94M10 98Q50 92 90 98"/>
    <g class="lp"><path class="w2" d="M50 20V6"/><path class="fill son" d="M50 6H64V14H50Z"/></g>` },
  // Trấn Biên Temple of Literature: the triple gate before the temple of learning
  'tran-bien': { loop: 'shine', svg: `
    <path class="w2" d="M18 94V46M82 94V46M38 94V40M62 94V40"/><path class="w0" d="M22 50V90M78 50V90M42 44V90M58 44V90"/>
    <path class="w2" d="M14 46H30V42H14ZM70 46H86V42H70ZM34 40H66V36H34Z"/><path class="w2" d="${roof(30, 70, 36, 10, 5)}"/><path class="w0" d="${tiles(30, 70, 36, 10, 8)}"/>
    <path class="w2" d="M16 42Q22 36 28 42M72 42Q78 36 84 42"/><circle cx="22" cy="36" r="2.4"/><circle cx="78" cy="36" r="2.4"/>
    <path class="w2" d="M42 28Q50 22 58 28"/><path class="w0" d="M44 52H56V64H44Z"/><path class="w0" d="M46 56H54M46 60H54"/><path class="w2" d="M8 94H92"/>
    <g class="lp"><path class="w0" d="M50 24V20"/><circle class="w2" cx="50" cy="17" r="2.6"/><circle class="w0" cx="50" cy="12" r="1.6"/></g>` },
  // The Cao Đài Holy See: the two towers and the long nave of the temple (its architecture only)
  'cao-dai': { loop: 'shine', svg: `
    <path class="w2" d="M14 94V40H34V94M66 94V40H86V94"/><path class="w0" d="${each(5, (i) => `M14 ${48 + i * 9}H34M66 ${48 + i * 9}H86`)}"/>
    <path class="w2" d="M12 40L24 28L36 40M64 40L76 28L88 40"/><path class="w2" d="M18 28V20H30V28M70 28V20H82V28"/><path class="w2" d="M18 20L24 10L30 20M70 20L76 10L82 20"/>
    <path class="w2" d="M34 94V56H66V94"/><path class="w2" d="${roof(30, 70, 56, 8, 4)}"/><path class="w0" d="M40 94V70Q50 62 60 70V94"/><path class="w0" d="M38 62H62"/>
    <path class="w0" d="M20 70V78H28V70M72 70V78H80V70"/><path class="w2" d="M4 96H96"/>
    <g class="lp"><circle class="w0" cx="24" cy="6" r="2"/><circle class="w0" cx="76" cy="6" r="2"/></g>` },
  // Gò Tháp: an ancient brick tower of the Óc Eo culture among lotus ponds
  'go-thap': { loop: 'ripple', svg: `
    ${hatch('b', 'M34 34H66V80H34Z', [34, 34, 66, 80], 2.8, '-')}
    <path class="w2" d="M32 80V34H68V80"/><path class="w2" d="M36 34V22H64V34M40 22V14H60V22M44 14L50 6L56 14"/>
    <path class="w2" d="M44 80V60Q50 52 56 60V80"/><path class="w0" d="M32 44H28V34M68 44H72V34M36 28H32M64 28H68"/>
    <path class="w2" d="M18 82H82"/><g class="lp"><path d="${water(88, -4, 104, 12, 2)}"/><path class="w0" d="${water(95, 4, 96, 12, 2)}"/></g>
    <path class="w2" d="M8 84Q14 78 22 82Q16 86 8 84ZM78 82Q86 78 92 84Q86 86 78 82Z"/><path class="w0" d="M86 82Q84 70 88 62Q92 70 86 82M14 82Q12 72 8 66"/>` },
  // A Khmer pagoda roof: steep tiers with nāga serpents curling up from the eaves
  'khmer-pagoda': { loop: 'shine', svg: `
    ${hatch('r', 'M22 60L38 34H62L78 60Z', [22, 34, 78, 60], 2.2, '|')}
    <path class="w2" d="M16 62L36 32H64L84 62"/><path class="w2" d="M30 34L44 14H56L70 34"/><path class="w2" d="M48 14L50 2L52 14"/>
    <path class="w2" d="M16 62Q8 60 6 52Q10 54 12 50M84 62Q92 60 94 52Q90 54 88 50"/><path class="w2" d="M30 34Q24 30 24 24Q28 26 30 24M70 34Q76 30 76 24Q72 26 70 24"/>
    <path class="w0" d="M6 52q-2-4 0-6M94 52q2-4 0-6"/><path class="w2" d="M22 62H78V92H22Z"/><path class="w0" d="M30 62V92M40 62V92M60 62V92M70 62V92"/><path class="w2" d="M44 92V72Q50 66 56 72V92"/>
    <path class="w2" d="M10 94H90"/>` },
  // Cái Răng floating market: a boat with its samples hung from the pole (cây bẹo)
  'floating-market': { loop: 'bob', svg: `<g class="lp">
    <path class="w2" d="M4 64Q30 78 60 76Q84 74 96 60Q80 66 56 66Q28 66 4 64Z"/><path class="w0" d="M10 68Q34 74 58 72Q80 70 90 64"/>
    <path class="w2" d="M30 64V48Q46 40 62 48V64"/><path class="w0" d="M34 50V64M40 46V64M46 45V64M52 45V64M58 47V64"/>
    <path class="w2" d="M74 64V8"/><path class="w0" d="M74 14H86M74 24H84M74 34H86"/>
    <circle class="w2" cx="86" cy="18" r="4"/><circle class="w2" cx="84" cy="28" r="3.4"/><path class="w2" d="M84 36Q88 44 86 48Q82 44 84 36Z"/><circle class="w2" cx="80" cy="18" r="3"/>
    <circle class="w2" cx="14" cy="60" r="4.4"/><circle class="w2" cx="22" cy="60" r="4"/><circle cx="18" cy="54" r="4"/></g>
    <path d="${water(84, -4, 104, 12, 2.4)}"/><path class="w0" d="${water(92, 4, 96, 12, 2)}"/>` },
  // The temple of the Lady of the Realm at the foot of Sam mountain: layered green-tiled roofs
  'ba-chua-xu': { loop: 'shine', svg: `
    <path class="w0" d="M0 40Q20 16 40 22Q56 6 72 18Q88 12 100 30"/>
    <path class="w2" d="${roof(10, 90, 58, 12, 7)}"/><path class="w0" d="${tiles(10, 90, 58, 12, 16)}"/><path class="w2" d="M14 56L24 40H76L86 56"/>
    <path class="w2" d="${roof(22, 78, 40, 10, 6)}"/><path class="w0" d="${tiles(22, 78, 40, 10, 12)}"/><path class="w2" d="M26 38L34 28H66L74 38"/><path class="w2" d="${roof(30, 70, 28, 8, 5)}"/>
    <path class="w2" d="M40 22Q50 14 60 22"/><circle class="w2" cx="50" cy="16" r="3"/><path class="w2" d="M20 58H80V92H20Z"/><path class="w0" d="M30 58V92M40 58V92M60 58V92M70 58V92"/>
    <path class="w2" d="M44 92V70H56V92"/><path class="w2" d="M8 94H92"/><g class="lp"><path class="w0" d="${curl(50, 66, 14)}"/></g>` },
  // Cà Mau cape: the monument shaped like a ship's prow, facing the sea past the mangroves
  'ca-mau-cape': { loop: 'ripple', svg: `
    ${hatch('p', 'M30 70L70 30L80 70Z', [30, 30, 80, 70], 2.6, '/')}
    <path class="w2" d="M28 70L72 28L82 70Z"/><path class="w0" d="M72 28L76 70M40 60H80M52 48H78"/><path class="w2" d="M20 70H90V76H20Z"/>
    <path class="w2" d="M12 60V48"/><path d="M12 60Q6 66 4 76M12 60Q12 68 10 76M12 60Q18 66 20 76"/><path class="w2" d="M2 48Q0 38 8 36Q12 28 20 34Q28 34 24 46Q14 50 2 48Z"/><path class="w0" d="M6 42Q12 38 18 42"/>
    <g class="lp"><path d="${water(84, -4, 104, 12, 2.4)}"/><path class="w0" d="${water(92, 4, 96, 12, 2)}"/></g>
    <circle class="fill son" cx="90" cy="16" r="6"/><circle class="w2" cx="90" cy="16" r="6"/>` },
  // A coconut boat of the Mekong islands, laden with fruit
  'fruit-boat': { loop: 'bob', svg: `<g class="lp">
    <path class="w2" d="M6 62Q30 74 50 74Q70 74 94 62Q74 66 50 66Q26 66 6 62Z"/><path class="w0" d="M12 66Q32 72 50 72Q68 72 88 66"/>
    ${[[28, 56, 6], [40, 52, 7], [54, 54, 6], [66, 56, 5], [34, 60, 4], [60, 60, 4]].map(([x, y, r]) => `<circle class="w2" cx="${x}" cy="${y}" r="${r}"/><path class="w0" d="M${x} ${y - r}l1 -3"/>`).join('')}
    <path class="w2" d="M80 64L94 30"/></g><path d="${water(84, -4, 104, 12, 2.4)}"/><path class="w0" d="${water(92, 4, 96, 12, 2)}"/>` },
  // A long ngo racing boat of the Khmer Ok Om Bok festival
  'ngo-boat': { loop: 'glide', svg: `<g class="lp">
    <path class="w2" d="M2 56Q4 48 10 50Q50 62 90 50Q96 48 98 56Q94 66 50 66Q6 66 2 56Z"/><path class="fill son soft" d="M2 56Q4 48 10 50Q50 62 90 50Q96 48 98 56Q94 66 50 66Q6 66 2 56Z"/>
    <path class="w2" d="M2 56Q0 44 6 40Q8 46 10 50M98 56Q100 44 94 40Q92 46 90 50"/><path class="w0" d="${each(10, (i) => `M${16 + i * 7} ${f(57 - Math.sin((i / 9) * Math.PI) * 2)}l-4 -12`)}"/>
    <path class="w0" d="M12 60H88"/></g><path d="${water(76, -4, 104, 12, 2.4)}"/><path class="w0" d="${water(84, 4, 96, 12, 2)}"/>` },
  // Đờn ca tài tử: the moon lute (đàn kìm) of southern chamber music
  'moon-lute': { loop: 'sound', svg: `<path class="w2" d="M74 6L48 56"/><path class="w0" d="M76 8L50 57"/><path class="w2" d="M70 6L80 2L78 12Z"/>
    <path class="w0" d="M72 14l-4-2M69 20l-4-2M66 26l-4-2M63 32l-4-2"/>
    <circle class="w2" cx="40" cy="70" r="24"/><circle class="w0" cx="40" cy="70" r="20"/><circle cx="40" cy="70" r="4"/><path d="M30 80L52 58"/>
    <g class="lp"><path class="w0" d="M78 40q6 4 4 12M84 34q10 6 6 22"/></g>` },
};
