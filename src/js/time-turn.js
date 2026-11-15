// Going back in time (twenty-seventh round): when Through time is switched on, a page of an old book, printed with
// the year the globe is going to, turns over from right to left and uncovers the globe in that year, while dust,
// scratches and grain like those on an old film flicker over the screen and then settle. It is a layer over the
// whole page that never catches the mouse, gone after 3.8 seconds (twenty-eighth round: slower, it was 2.6).
// With reduced motion nothing is shown.
import { esc, prefersReducedMotion } from './common.js';

const LIFE = 3800; // ms (the page starts to turn at 0.8 s and is over at 3 s; the dust settles by 3.8 s)
const SPECKS = 42;
const SCRATCHES = 3;

/** Plays the page turn. `title` is the year, printed large on the page. */
export function playTimeTurn({ kicker = 'Through time', title = '', line = 'Turning back the pages of history' } = {}) {
  if (prefersReducedMotion()) return;
  document.querySelector('.time-turn')?.remove();
  const el = document.createElement('div');
  el.className = 'time-turn';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = `
    <div class="tt-book"><div class="tt-page">
      <div class="tt-front"><p class="tt-kicker">${esc(kicker)}</p><p class="tt-title" style="--len:${Math.max(4, String(title).length)}">${esc(title)}</p><p class="tt-line">${esc(line)}</p></div>
      <div class="tt-back"></div>
    </div></div>
    <div class="tt-dust"><div class="tt-grain"></div>${'<i></i>'.repeat(SPECKS)}${'<b></b>'.repeat(SCRATCHES)}</div>`;
  document.body.append(el);

  // The dust and scratches jump about like those on a film running through a projector
  const bits = [...el.querySelectorAll('.tt-dust i, .tt-dust b')];
  const r = Math.random;
  const scatter = () => bits.forEach((b) => {
    if (b.tagName === 'B') {
      b.style.cssText = `left:${(r() * 100).toFixed(1)}%;height:${(45 + r() * 55).toFixed(0)}%;top:${(r() * 30).toFixed(0)}%;opacity:${(0.15 + r() * 0.35).toFixed(2)}`;
    } else {
      const s = 1 + r() * r() * 5;
      b.style.cssText = `left:${(r() * 100).toFixed(1)}%;top:${(r() * 100).toFixed(1)}%;width:${s.toFixed(1)}px;height:${(s * (0.6 + r() * 0.9)).toFixed(1)}px;opacity:${(0.25 + r() * 0.55).toFixed(2)}`;
    }
  });
  scatter();
  const timer = setInterval(scatter, 90);
  setTimeout(() => { clearInterval(timer); el.remove(); }, LIFE);
}
