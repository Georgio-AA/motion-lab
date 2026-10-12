// Inner film tilt shares the hub's scroll RAF; all geometry is cached on resize.
export function initTilt(portals, scales, schedule, motionQuery, finePointer) {
  const frames = portals.map(portal => portal.querySelector('.device-frame'));
  const glare = frames.map(frame => frame.querySelector('.preview-glare'));
  const count = frames.length;
  const x = new Float32Array(count), y = new Float32Array(count);
  const tx = new Float32Array(count), ty = new Float32Array(count);
  const light = new Float32Array(count), hovered = new Uint8Array(count);
  const cx = new Float64Array(count), cy = new Float64Array(count);
  const width = new Float64Array(count), height = new Float64Array(count);
  let previous = 0;
  function reset() {
    x.fill(0); y.fill(0); tx.fill(0); ty.fill(0); light.fill(0); hovered.fill(0);
    previous = 0;
    for (let i = 0; i < count; i++) {
      frames[i].style.transform = '';
      glare[i].style.opacity = '0';
      glare[i].style.transform = '';
      frames[i].classList.remove('is-tilting');
    }
  }
  function leave(i) { hovered[i] = 0; tx[i] = ty[i] = 0; schedule(); }
  frames.forEach((frame, i) => {
    frame.addEventListener('pointermove', event => {
      if (event.pointerType !== 'mouse' || motionQuery.matches || !finePointer.matches) return;
      hovered[i] = 1;
      tx[i] = Math.max(-1, Math.min(1, (event.clientX - cx[i]) / (width[i] * scales[i] * .5)));
      ty[i] = Math.max(-1, Math.min(1, (event.clientY + scrollY - cy[i]) / (height[i] * scales[i] * .5)));
      frame.classList.add('is-tilting');
      schedule();
    });
    frame.addEventListener('pointerleave', () => leave(i));
    frame.addEventListener('pointercancel', () => leave(i));
  });
  motionQuery.addEventListener('change', reset);
  finePointer.addEventListener('change', reset);
  document.addEventListener('visibilitychange', () => { if (document.hidden) reset(); });
  window.addEventListener('pagehide', reset);
  return {
    measure(i, rect, pageY) {
      cx[i] = rect.left + rect.width * .5;
      cy[i] = rect.top + pageY + rect.height * .5;
      width[i] = portals[i].offsetWidth; height[i] = portals[i].offsetHeight;
    },
    update(now) {
      if (motionQuery.matches || !finePointer.matches || document.hidden) return false;
      const ease = 1 - Math.exp(-Math.min(48, previous ? now - previous : 16) * .012);
      previous = now;
      let moving = false;
      for (let i = 0; i < count; i++) {
        if (!hovered[i] && !x[i] && !y[i] && !light[i]) continue;
        x[i] += (tx[i] - x[i]) * ease;
        y[i] += (ty[i] - y[i]) * ease;
        light[i] += (hovered[i] * .8 - light[i]) * ease;
        if (Math.abs(tx[i] - x[i]) < .001) x[i] = tx[i];
        if (Math.abs(ty[i] - y[i]) < .001) y[i] = ty[i];
        if (Math.abs(hovered[i] * .8 - light[i]) < .001) light[i] = hovered[i] * .8;
        frames[i].style.transform = 'rotateX(' + (-y[i] * 6).toFixed(3) + 'deg) rotateY(' + (x[i] * 6).toFixed(3) + 'deg)';
        glare[i].style.transform = 'translate3d(' + (x[i] * 25).toFixed(2) + '%, ' + (y[i] * 25).toFixed(2) + '%, 0)';
        glare[i].style.opacity = light[i].toFixed(3);
        if (x[i] !== tx[i] || y[i] !== ty[i] || Math.abs(light[i] - hovered[i] * .8) > .001) moving = true;
        if (!hovered[i] && !x[i] && !y[i] && !light[i]) frames[i].classList.remove('is-tilting');
      }
      if (!moving) previous = 0;
      return moving;
    }
  };
}
