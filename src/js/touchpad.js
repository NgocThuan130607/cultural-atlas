// Thirty-fifth round: touchpads. A mouse wheel and a touchpad both send `wheel` events, and browsers turn a pinch
// on a touchpad into a `wheel` event with the Ctrl key down (Safari on a Mac sends its own gesture events instead).
// Left alone, a pinch zoomed the whole page instead of the globe or the map, and a two-finger slide zoomed them
// in jumps. Now a pinch zooms smoothly about the fingers, a two-finger slide moves the view as dragging does,
// and a mouse wheel goes on zooming as before.

const MAC_WHEEL = 4.000244140625; // Chrome and Safari on a Mac report a mouse wheel in steps of this size

/** Tells a mouse wheel from a touchpad, one gesture at a time: returns 'pinch', 'pad' or 'mouse'. */
export function wheelSorter() {
  let kind = null;
  let last = 0;
  return (e) => {
    const lines = e.deltaMode !== 0; // read before the deltas: Firefox then reports a mouse wheel in lines
    const now = performance.now();
    const fresh = now - last > 250; // a new gesture
    last = now;
    if (e.ctrlKey) return 'pinch';
    if (fresh) kind = null;
    const { deltaX: x, deltaY: y } = e;
    const sideways = !lines && !e.shiftKey && x !== 0;
    if (!kind) {
      // A wheel turns in whole notches (a big first step, 120 in wheelDeltaY, or on a Mac steps of MAC_WHEEL); a
      // touchpad starts with small, uneven amounts, often with a little sideways movement.
      const uneven = Math.abs(y) < 50 && y % MAC_WHEEL !== 0 && !(e.wheelDeltaY && e.wheelDeltaY % 120 === 0);
      kind = sideways || (!lines && !e.shiftKey && uneven) ? 'pad' : 'mouse';
    } else if (kind === 'mouse' && sideways) kind = 'pad';
    return kind;
  };
}

/**
 * Pinch and two-finger slide on a touchpad over `el`. What adds up between two frames is handed on once a frame:
 * zoom(factor, x, y) with the factor the distance is multiplied by (above 1 zooms out) about the point (x, y) in
 * the element, and pan(dx, dy, x, y) for a slide (the view moves by dx, dy as a page scrolls). A mouse wheel
 * is left to the element's own handlers, and so is a slide when slides() says the slide belongs to the page.
 */
export function touchpadGestures(el, { zoom, pan, slides = () => true, accept = () => true }) {
  const sort = wheelSorter();
  let z = 0;
  let dx = 0;
  let dy = 0;
  let x = 0;
  let y = 0;
  let frame = 0;
  const flush = () => {
    frame = 0;
    const [zz, px, py] = [z, dx, dy];
    z = dx = dy = 0;
    if (zz) zoom(Math.exp(zz), x, y);
    if (px || py) pan(px, py, x, y);
  };
  const queue = (e) => {
    const r = el.getBoundingClientRect();
    x = e.clientX - r.left;
    y = e.clientY - r.top;
    frame ||= requestAnimationFrame(flush);
  };
  el.addEventListener('wheel', (e) => {
    if (!accept(e)) return;
    const kind = sort(e);
    if (kind === 'mouse' || (kind === 'pad' && !slides())) return;
    e.preventDefault();
    e.stopPropagation();
    const k = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1;
    if (kind === 'pinch') z += Math.max(-0.5, Math.min(0.5, e.deltaY * k * 0.01)); // Ctrl + a mouse wheel: a step at a time
    else { dx += e.deltaX * k; dy += e.deltaY * k; }
    queue(e);
  }, { capture: true, passive: false });
  // Safari on a Mac. (On a touch screen the same events come with the touches, which the element handles itself.)
  if (navigator.maxTouchPoints > 0 || !('GestureEvent' in window)) return;
  let scale = 1;
  el.addEventListener('gesturestart', (e) => { if (accept(e)) { e.preventDefault(); scale = 1; } });
  el.addEventListener('gesturechange', (e) => {
    if (!accept(e)) return;
    e.preventDefault();
    z += Math.log(scale / e.scale);
    scale = e.scale;
    queue(e);
  });
  el.addEventListener('gestureend', (e) => { if (accept(e)) e.preventDefault(); });
}
