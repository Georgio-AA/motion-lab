import { initHero } from './ribbons.js';

const DEFAULT_PALETTE = ['#d5f591', '#78cfac'];

export function initHome() {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');

  // Background ribbons. A failure here must never break the page.
  let world = null;
  const atmosphere = document.querySelector('.atmosphere');
  try { world = atmosphere ? initHero(atmosphere) : null; } catch { atmosphere?.classList.remove('canvas-ready'); }

  // Scrolling speed gently stretches the ribbons.
  let lastY = scrollY, lastT = performance.now();
  addEventListener('scroll', () => {
    const now = performance.now();
    world?.setScrollVelocity((scrollY - lastY) / Math.max(16, now - lastT) * 1000);
    lastY = scrollY; lastT = now;
  }, { passive: true });

  // Lab cards: hovering (or keyboard focus) tints the ribbons and plays the preview film.
  // Touch devices keep the poster only, so phones never download the films.
  const cards = document.querySelectorAll('.lab-card');
  let resetTimer = 0;
  cards.forEach(card => {
    const video = card.querySelector('video');
    const [light] = card.dataset.palette.split(',');

    const enter = () => {
      clearTimeout(resetTimer);
      world?.setPalette([light, mix(light)]);
      if (!video || reduced.matches || !finePointer.matches) return;
      if (!video.src) video.src = video.dataset.src;
      video.play().then(() => video.classList.add('is-playing')).catch(() => {});
    };
    const leave = () => {
      resetTimer = setTimeout(() => world?.setPalette(DEFAULT_PALETTE), 250);
      if (!video) return;
      video.pause();
      video.classList.remove('is-playing');
    };
    card.addEventListener('pointerenter', enter);
    card.addEventListener('focus', enter);
    card.addEventListener('pointerleave', leave);
    card.addEventListener('blur', leave);
  });

  // Pause any running film when the tab is hidden.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) document.querySelectorAll('.lab-card video').forEach(v => v.pause());
  });
}

// A softer partner colour for the second ribbon gradient stop.
function mix(hex) {
  const n = parseInt(hex.slice(1), 16);
  const blend = (c, t) => Math.round(c + (t - c) * 0.45);
  const r = blend((n >> 16) & 255, 0x78), g = blend((n >> 8) & 255, 0xcf), b = blend(n & 255, 0xac);
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}
