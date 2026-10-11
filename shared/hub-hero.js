// A luminous, folding ribbon drawn with a few thousand vertices and no dependencies.
export function initHero(hero) {
  const canvas = hero.querySelector('canvas');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let ctx;
  try { ctx = canvas.getContext('2d', { alpha: true, desynchronized: true }); } catch { return; }
  if (!ctx) return;

  const segments = 128, strands = 32;
  const sin = new Float32Array(segments + 1);
  const cos = new Float32Array(segments + 1);
  const sin2 = new Float32Array(segments + 1);
  const cos2 = new Float32Array(segments + 1);
  for (let i = 0; i <= segments; i++) {
    const a = i / segments * Math.PI * 2;
    sin[i] = Math.sin(a); cos[i] = Math.cos(a);
    sin2[i] = Math.sin(a * 2); cos2[i] = Math.cos(a * 2);
  }

  let width = 1, height = 1, dpr = 1, quality = 1;
  let targetX = .72, targetY = .42, pointerX = .72, pointerY = .42, influence = 0;
  let visible = true, reduced = motion.matches, running = false, frame = 0;
  let previous = 0, time = 3, slowFrames = 0, qualityQueued = false;
  let pulseStart = -10, pulseX = .7, pulseY = .5;
  let ribbonGradient, glowGradient;

  // Gradients and trig tables are cached. No objects are allocated in the drawing loop.
  function resize() {
    width = hero.clientWidth; height = hero.clientHeight;
    dpr = Math.min(devicePixelRatio || 1, 1.5, 1800 / width, 1100 / height) * quality;
    canvas.width = Math.max(1, Math.round(width * dpr));
    canvas.height = Math.max(1, Math.round(height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ribbonGradient = ctx.createLinearGradient(width * .2, height * .9, width, height * .1);
    ribbonGradient.addColorStop(0, '#467f7d');
    ribbonGradient.addColorStop(.35, '#91d5b2');
    ribbonGradient.addColorStop(.68, '#d5f591');
    ribbonGradient.addColorStop(1, '#f5ffd7');
    glowGradient = ctx.createLinearGradient(width * .3, 0, width, height);
    glowGradient.addColorStop(0, '#60bf96');
    glowGradient.addColorStop(1, '#d5f591');
    draw();
    hero.classList.add('canvas-ready');
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    const drift = Math.sin(time * .13) * .09;
    const rotateCos = Math.cos(drift), rotateSin = Math.sin(drift);
    const phaseSin = Math.sin(time * .17), phaseCos = Math.cos(time * .17);
    const cx = width * (width < 700 ? .75 : .68), cy = height * .43;
    const pulseAge = time - pulseStart;
    const pulseRadius = pulseAge * .36;
    for (let n = 0; n < strands; n++) {
      const band = (n / (strands - 1) - .5) * 2;
      ctx.beginPath();
      for (let j = 0; j <= segments; j++) {
        const twistSin = sin2[j] * phaseCos + cos2[j] * phaseSin;
        const twistCos = cos2[j] * phaseCos - sin2[j] * phaseSin;
        const bx = sin[j] * .33 + cos2[j] * .055 + band * twistCos * .049;
        const by = cos[j] * .30 + sin2[j] * .08 + band * twistSin * .079;
        let x = cx + (bx * rotateCos - by * rotateSin) * width;
        let y = cy + (by * rotateCos + bx * rotateSin) * height;
        const dx = x / width - pointerX, dy = y / height - pointerY;
        const force = Math.exp(-(dx * dx + dy * dy) * 14) * influence;
        x += dx * width * force * .19;
        y += dy * height * force * .23;
        // A tap sends a travelling pressure wave through the entire light sculpture.
        if (pulseAge >= 0 && pulseAge < 2.8) {
          const px = x / width - pulseX, py = y / height - pulseY;
          const distance = Math.sqrt(px * px + py * py);
          const wave = Math.exp(-Math.pow((distance - pulseRadius) * 17, 2)) * (1 - pulseAge / 2.8);
          x += px * width * wave * .12;
          y += py * height * wave * .16;
        }
        if (j === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      if (n % 4 === 0) {
        ctx.strokeStyle = glowGradient; ctx.lineWidth = 13;
        ctx.globalAlpha = .035; ctx.stroke();
        ctx.lineWidth = 4; ctx.globalAlpha = .075; ctx.stroke();
      }
      ctx.strokeStyle = ribbonGradient;
      ctx.lineWidth = n % 5 === 0 ? 1.05 : .7;
      ctx.globalAlpha = .25 + Math.sin(n * .48 + time * .15) * .13;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  // Sustained slow frames lower pixel density; quality changes happen outside the loop.
  function lowerQuality() {
    qualityQueued = false;
    if (quality > .64) { quality = Math.max(.64, quality * .8); resize(); }
  }
  function tick(now) {
    if (!running) return;
    const elapsed = previous ? now - previous : 16.7;
    previous = now;
    const dt = Math.min(elapsed, 48);
    time += dt * .001;
    const ease = Math.min(1, dt * .006);
    pointerX += (targetX - pointerX) * ease;
    pointerY += (targetY - pointerY) * ease;
    influence += (1 - influence) * .035;
    if (elapsed > 20 && elapsed < 200) slowFrames++;
    else slowFrames = Math.max(0, slowFrames - 2);
    if (slowFrames > 90 && quality > .64 && !qualityQueued) {
      slowFrames = 0; qualityQueued = true; setTimeout(lowerQuality, 0);
    }
    try { draw(); } catch {
      running = false; hero.classList.remove('canvas-ready'); return;
    }
    frame = requestAnimationFrame(tick);
  }
  function updateRunning() {
    const shouldRun = visible && !document.hidden && !reduced;
    hero.dataset.effectActive = String(shouldRun);
    if (shouldRun && !running) {
      running = true; previous = 0; frame = requestAnimationFrame(tick);
    } else if (!shouldRun) {
      running = false; cancelAnimationFrame(frame); frame = 0;
      if (visible && !document.hidden && reduced) draw();
    }
  }
  function updatePointer(event) {
    if (reduced) return;
    const rect = hero.getBoundingClientRect();
    targetX = (event.clientX - rect.left) / width;
    targetY = (event.clientY - rect.top) / height;
  }
  hero.addEventListener('pointermove', updatePointer, { passive: true });
  hero.addEventListener('pointerdown', event => {
    if (reduced) return;
    updatePointer(event); pulseX = targetX; pulseY = targetY; pulseStart = time;
  }, { passive: true });
  hero.addEventListener('pointerleave', () => { targetX = .72; targetY = .42; });
  motion.addEventListener('change', event => { reduced = event.matches; updateRunning(); });
  document.addEventListener('visibilitychange', updateRunning);
  window.addEventListener('pagehide', () => {
    running = false; cancelAnimationFrame(frame); hero.dataset.effectActive = 'false';
  });
  window.addEventListener('pageshow', updateRunning);
  canvas.addEventListener('contextlost', event => {
    event.preventDefault(); running = false; cancelAnimationFrame(frame);
    hero.classList.remove('canvas-ready'); hero.dataset.effectActive = 'false';
  });
  canvas.addEventListener('contextrestored', () => { resize(); updateRunning(); });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting; updateRunning();
    }, { threshold: 0 }).observe(hero);
  } else {
    window.addEventListener('scroll', () => {
      const rect = hero.getBoundingClientRect();
      visible = rect.bottom > 0 && rect.top < innerHeight; updateRunning();
    }, { passive: true });
  }
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(hero);
  else window.addEventListener('resize', resize, { passive: true });

  try { resize(); updateRunning(); } catch { hero.classList.remove('canvas-ready'); }
}
