// Gold cloud scrolls behind the Lạc bird (eighteenth round): small curled clouds, drawn like the cloud scroll of
// the motifs (motifs.js, 'van-may'), that leave the bird's tail, drift back the way it came, open out and fade.
// A fixed set of elements on the page is reused, so a frame only changes their place, size and opacity. On the
// 3D globe the bird keeps its place on screen while the ground slides beneath it, so the clouds stream out behind
// it as its wake; in a flight they are left along the way.

const SHAPES = [
  '<path class="w2" d="M2 18Q1 8 11 8Q18 8 18 14Q18 18 14 18Q10 18 10 15Q10 12 13 12"/><path class="w2" d="M18 14Q19 3 29 3Q38 3 38 11Q38 16 33 16Q29 16 29 13"/><path d="M2 21.5H34Q39 21.5 39 17"/>',
  '<path class="w2" d="M3 18Q2 8 13 8Q22 8 22 15Q22 19 17 19Q13 19 13 16Q13 13 16 13"/><path d="M3 21.5H30Q37 21.5 37 15Q37 10 32 10Q28 10 28 13"/>',
  '<path class="w2" d="M4 17Q4 6 14 6Q22 6 22 12Q24 4 31 4Q38 4 38 10Q38 14 34 14Q31 14 31 11"/><path d="M2 21H36Q39 21 39 18"/>',
];

/** Returns { step(dt, from, back, effort, size), clear() }. */
export function createClouds(count = 14) {
  const box = document.createElement('div');
  box.className = 'ship-clouds';
  box.setAttribute('aria-hidden', 'true');
  const clouds = [];
  for (let k = 0; k < count; k++) {
    const el = document.createElement('i');
    el.innerHTML = `<svg viewBox="0 0 40 24" focusable="false">${SHAPES[k % SHAPES.length]}</svg>`;
    box.append(el);
    clouds.push({ el, on: false, age: 0, life: 0, x: 0, y: 0, vx: 0, vy: 0, flip: 1, w: 30 });
  }
  document.body.append(box);
  let due = 0;
  let next = 0;

  function spawn({ x, y }, back, speed, w) {
    const c = clouds[next];
    next = (next + 1) % count;
    const a = back + (Math.random() - 0.5) * 0.5;
    const v = speed * (0.7 + Math.random() * 0.5);
    c.x = x + (Math.random() - 0.5) * 8;
    c.y = y + (Math.random() - 0.5) * 8;
    c.vx = Math.cos(a) * v;
    c.vy = Math.sin(a) * v;
    c.age = 0;
    c.life = 1.2 + Math.random() * 0.6;
    c.flip = Math.random() < 0.5 ? -1 : 1;
    c.w = w * (0.85 + Math.random() * 0.4);
    c.el.style.width = `${c.w.toFixed(0)}px`;
  }

  return {
    /**
     * One frame. `from`: where on screen the clouds leave (null: they only fade); `back`: the angle on screen they
     * drift towards; `effort` 0 to 1: how hard the bird is flying (more clouds, faster); `size`: the bird's width.
     */
    step(dt, from, back, effort, size) {
      if (from) {
        due += dt * (0.8 + effort * 5);
        while (due >= 1) { due -= 1; spawn(from, back, 20 + effort * 80, size * 0.3); }
      } else due = 0;
      for (const c of clouds) {
        if (c.age >= c.life) {
          if (c.on) { c.el.style.opacity = '0'; c.on = false; }
          continue;
        }
        c.age += dt;
        const k = Math.min(1, c.age / c.life);
        const drag = 1 - Math.min(1, dt * 1.2);
        c.x += c.vx * dt;
        c.y += c.vy * dt;
        c.vx *= drag;
        c.vy *= drag;
        const s = 0.5 + 0.6 * Math.sqrt(k);
        c.el.style.opacity = (Math.min(1, k / 0.15) * (1 - k) ** 1.4 * 0.95).toFixed(2);
        c.el.style.transform = `translate3d(${c.x.toFixed(1)}px, ${c.y.toFixed(1)}px, 0) translate(-50%, -50%) scale(${(s * c.flip).toFixed(2)}, ${s.toFixed(2)})`;
        c.on = true;
      }
    },
    clear() {
      for (const c of clouds) { c.age = 0; c.life = 0; c.on = false; c.el.style.opacity = '0'; }
      due = 0;
    },
  };
}
