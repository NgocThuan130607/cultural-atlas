// Clicking a symbol motif redraws it (twelfth round of user feedback): its lines vanish, draw themselves in
// again layer by layer, and the glint of light runs over the gold once more. Enter or Space does the same for
// a motif reached with Tab (each motif is a button, see motifLayer in src/js/motifs.js).
//
// The drawings sit behind the slide's columns, which are transparent but still catch the pointer, so a click
// is matched to them here: it counts when it lands inside a drawing's box and not on a photo, a card, a map
// or a control. A drawing glows under the mouse and the pointer turns into a hand, so it reads as something to
// click.

import { SOFT } from './motifs.js';
import { prefersReducedMotion } from './common.js';

// What a click can land on and still not be "on" a drawing behind it
const BLOCK = `a, button:not(.motif), input, select, textarea, label, video, iframe, [contenteditable], .leaflet-container, ${SOFT}`;

/** Lets the visitor redraw the motifs inside `root` (a deck of slides) by clicking or tapping them. */
export function motifRedraw(root) {
  /** The drawing at a point on the screen, or null. */
  function hit(x, y) {
    const el = document.elementFromPoint(x, y);
    if (!el) return null;
    const own = el.closest('.motif');
    if (own) return root.contains(own) ? own : null;
    if (el.closest(BLOCK)) return null;
    const slide = el.closest('.slide');
    if (!slide || !root.contains(slide)) return null;
    for (const m of slide.querySelectorAll('.motif:not([hidden])')) {
      const r = m.getBoundingClientRect();
      // the drawing fills the middle of its box
      if (x > r.left + r.width * 0.1 && x < r.right - r.width * 0.1 && y > r.top + r.height * 0.08 && y < r.bottom - r.height * 0.08) return m;
    }
    return null;
  }

  const timers = new WeakMap();
  function redraw(m) {
    if (prefersReducedMotion()) return;
    clearTimeout(timers.get(m));
    m.classList.remove('redraw');
    m.classList.add('replay');
    void m.offsetWidth; // the lines are now undrawn
    m.classList.remove('replay');
    m.classList.add('redraw'); // shorter delays while it draws in again
    timers.set(m, setTimeout(() => m.classList.remove('redraw'), 2600));
    try {
      m.animate([{ backgroundPosition: '100% 0', opacity: 1 }, { backgroundPosition: '0 0', opacity: 1 }],
        { duration: 1300, delay: 1000, easing: 'ease-in-out', pseudoElement: '::after' });
    } catch { /* no glint in browsers that cannot animate it */ }
  }

  // Over a drawing (mouse and pen only) it glows and the pointer becomes a hand
  let hot = null;
  const setHot = (m) => {
    if (m === hot) return;
    hot?.classList.remove('is-hot');
    hot = m;
    m?.classList.add('is-hot');
    document.documentElement.classList.toggle('motif-pointer', !!m);
  };
  let frame = 0;
  let last = null;
  addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    last = e;
    if (!frame) frame = requestAnimationFrame(() => { frame = 0; setHot(hit(last.clientX, last.clientY)); });
  }, { passive: true });
  document.addEventListener('mouseout', (e) => { if (!e.relatedTarget) setHot(null); });
  // the slides move under a still mouse
  addEventListener('scroll', () => setHot(null), { passive: true });

  // Click, tap, Enter or Space
  document.addEventListener('click', (e) => {
    let m = e.target.closest?.('.motif');
    if (m && !root.contains(m)) m = null;
    // e.detail is 0 for a click made with the keyboard, which always comes from the focused button itself
    if (!m && e.detail) m = hit(e.clientX, e.clientY);
    if (m) redraw(m);
  });
}
