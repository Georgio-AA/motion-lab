// Cursor tilt for the lab cards, ported from the original hub-tilt.js:
// the card leans up to MAX_DEG toward the pointer with eased motion, and a soft glare follows it.
// Mouse only; disabled for touch and for reduced motion. One rAF loop runs only while something moves.

const MAX_DEG = 6;
const EASE_RATE = 0.012; // same easing constant as the original

export function initTilt(cards) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const state = [...cards].map(card => ({
    card, x: 0, y: 0, tx: 0, ty: 0, light: 0, hovered: false, rect: null,
  }));
  let frame = 0, previous = 0;

  const enabled = () => !reduced.matches && finePointer.matches;

  function schedule() {
    if (!frame) frame = requestAnimationFrame(tick);
  }

  function tick(now) {
    frame = 0;
    const ease = 1 - Math.exp(-Math.min(48, previous ? now - previous : 16) * EASE_RATE);
    previous = now;
    let moving = false;
    for (const s of state) {
      const targetLight = s.hovered ? 0.8 : 0;
      if (!s.hovered && !s.x && !s.y && !s.light) continue;
      s.x += (s.tx - s.x) * ease;
      s.y += (s.ty - s.y) * ease;
      s.light += (targetLight - s.light) * ease;
      if (Math.abs(s.tx - s.x) < 0.001) s.x = s.tx;
      if (Math.abs(s.ty - s.y) < 0.001) s.y = s.ty;
      if (Math.abs(targetLight - s.light) < 0.001) s.light = targetLight;
      apply(s);
      if (s.x !== s.tx || s.y !== s.ty || s.light !== targetLight) moving = true;
      if (!s.hovered && !s.x && !s.y && !s.light) s.card.classList.remove('is-tilting');
    }
    if (moving) schedule();
    else previous = 0;
  }

  function apply(s) {
    const { style } = s.card;
    style.setProperty('--tilt-x', (-s.y * MAX_DEG).toFixed(3) + 'deg');
    style.setProperty('--tilt-y', (s.x * MAX_DEG).toFixed(3) + 'deg');
    style.setProperty('--glare-x', (50 + s.x * 50).toFixed(2) + '%');
    style.setProperty('--glare-y', (50 + s.y * 50).toFixed(2) + '%');
    style.setProperty('--glare-o', s.light.toFixed(3));
  }

  function reset() {
    cancelAnimationFrame(frame); frame = 0; previous = 0;
    for (const s of state) {
      Object.assign(s, { x: 0, y: 0, tx: 0, ty: 0, light: 0, hovered: false });
      apply(s);
      s.card.classList.remove('is-tilting');
    }
  }

  for (const s of state) {
    s.card.addEventListener('pointerenter', event => {
      if (event.pointerType !== 'mouse' || !enabled()) return;
      // Measure once per hover; the untilted layout box is stable while the pointer is inside.
      s.rect = s.card.getBoundingClientRect();
    });
    s.card.addEventListener('pointermove', event => {
      if (event.pointerType !== 'mouse' || !enabled()) return;
      if (!s.rect) s.rect = s.card.getBoundingClientRect();
      const r = s.rect;
      s.tx = Math.max(-1, Math.min(1, (event.clientX - (r.left + r.width / 2)) / (r.width / 2)));
      s.ty = Math.max(-1, Math.min(1, (event.clientY - (r.top + r.height / 2)) / (r.height / 2)));
      s.hovered = true;
      s.card.classList.add('is-tilting');
      schedule();
    });
    const leave = () => { s.hovered = false; s.tx = s.ty = 0; s.rect = null; schedule(); };
    s.card.addEventListener('pointerleave', leave);
    s.card.addEventListener('pointercancel', leave);
  }

  // The cached rect goes stale if the page scrolls under a resting pointer.
  addEventListener('scroll', () => { for (const s of state) s.rect = null; }, { passive: true });
  reduced.addEventListener('change', reset);
  finePointer.addEventListener('change', reset);
  document.addEventListener('visibilitychange', () => { if (document.hidden) reset(); });
  addEventListener('pagehide', reset);
}
