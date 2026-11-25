import { prefersReducedMotion } from '../shared/base.js';

const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
const wait = ms => new Promise(resolve => setTimeout(resolve, prefersReducedMotion() ? 0 : ms));
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const emailValid = input => input.value.trim() !== '' && input.validity.valid;
const passwordValid = input => input.value.length >= 8;
const visible = element => !document.hidden && element.closest('.stage').dataset.inView !== 'false';
function message(element, text, error = false) { element.textContent = text; element.classList.toggle('error', error); }
function invalid(input, status, text) { input.setAttribute('aria-invalid', 'true'); message(status, text, true); input.focus({ preventScroll: true }); }
function busy(form, value) { form.setAttribute('aria-busy', String(value)); }
function focusReplay(control, submittedFrom) {
  // Restore keyboard continuity only if the visitor stayed with this interaction.
  const bounds = control.closest('.stage').getBoundingClientRect();
  const onScreen = !document.hidden && bounds.bottom > 0 && bounds.top < window.innerHeight;
  if (onScreen && (document.activeElement === submittedFrom || document.activeElement === document.body)) {
    control.focus({ preventScroll: true });
  }
}
function replayAnimation(element, className) { element.classList.remove(className); void element.getBoundingClientRect(); element.classList.add(className); }

// Native scrolling remains untouched. Pause ornaments as their stages leave the viewport.
const stages = $$('.stage');
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    entry.target.dataset.inView = String(entry.isIntersecting);
    entry.target.dispatchEvent(new Event('stagevisibility'));
  }), { threshold: 0 });
  stages.forEach(stage => observer.observe(stage));
  const links = $$('.station-nav a');
  const navObserver = new IntersectionObserver(entries => {
    const active = entries.find(entry => entry.isIntersecting); if (!active) return;
    links.forEach(link => {
      if (link.hash === `#${active.target.id}`) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }, { rootMargin: '-15% 0px -55% 0px' });
  $$('.station').forEach(section => navObserver.observe(section));
}
$$('input').forEach(input => input.addEventListener('input', () => input.removeAttribute('aria-invalid')));
$$('[data-eye]').forEach(button => button.addEventListener('click', () => {
  const input = document.getElementById(button.dataset.eye), show = input.type === 'password';
  input.type = show ? 'text' : 'password';
  button.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
  button.setAttribute('aria-pressed', String(show)); input.dispatchEvent(new Event('passwordvisibility'));
}));

// Bursts render only while alive and on-screen. A missing 2D context never breaks a form.
function makeBurst(stage) {
  const canvas = $('.burst-canvas', stage); let context;
  try { context = canvas.getContext('2d'); } catch { return () => {}; }
  if (!context) return () => {};
  let particles = [], raf = 0, last = 0, width = 0, height = 0;
  function resize() {
    const rect = stage.getBoundingClientRect(); width = rect.width; height = rect.height;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function clear() { cancelAnimationFrame(raf); raf = 0; particles = []; context.clearRect(0, 0, width, height); }
  function draw(now) {
    raf = 0;
    if (!visible(canvas) || prefersReducedMotion()) { clear(); return; }
    const dt = Math.min((now - last) / 1000, .035); last = now;
    context.clearRect(0, 0, width, height); particles = particles.filter(p => p.life > 0);
    for (const p of particles) {
      p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.gravity * dt;
      p.vx *= Math.pow(.985, dt * 60); p.rotation += p.spin * dt;
      context.save(); context.translate(p.x, p.y); context.rotate(p.rotation);
      context.globalAlpha = clamp(p.life / .65, 0, 1); context.fillStyle = p.color;
      if (p.round) { context.beginPath(); context.arc(0, 0, p.size / 2, 0, Math.PI * 2); context.fill(); }
      else context.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * .65);
      context.restore();
    }
    if (particles.length) raf = requestAnimationFrame(draw); else clear();
  }
  stage.addEventListener('stagevisibility', () => { if (!visible(canvas)) clear(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) clear(); });
  return (origin, colors, radial = false) => {
    if (prefersReducedMotion() || !visible(canvas)) return;
    resize();
    const rect = stage.getBoundingClientRect(), point = origin.getBoundingClientRect();
    const x = point.left + point.width / 2 - rect.left, y = point.top + point.height / 2 - rect.top;
    particles = Array.from({ length: radial ? 65 : 90 }, () => {
      const angle = radial ? Math.random() * Math.PI * 2 : -Math.PI / 2 + (Math.random() - .5) * 2.3;
      const speed = 130 + Math.random() * 310;
      return { x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, gravity: radial ? 35 : 420,
        life: 1.1 + Math.random() * 1.3, color: colors[Math.floor(Math.random() * colors.length)],
        size: 3 + Math.random() * 6, rotation: Math.random() * Math.PI, spin: (Math.random() - .5) * 12, round: radial };
    });
    cancelAnimationFrame(raf); last = performance.now(); raf = requestAnimationFrame(draw);
  };
}
const bursts = new Map(stages.map(stage => [stage, makeBurst(stage)]));
function burst(origin, colors, radial = false) { bursts.get(origin.closest('.stage'))(origin, colors, radial); }

// 01 / One spring owns position; committed escapes cannot chase every mouse event.
function setupRunaway() {
  const form = $('#run-form'), email = $('#run-email'), password = $('#run-password');
  const button = $('.run-button'), track = $('.track'), trail = $('.run-trail'), status = $('#run-status'), reset = $('#run-reset');
  const stage = button.closest('.stage'), inputs = [email, password];
  let working = false, signedIn = false, keyboard = false;
  let x = 0, velocity = 0, target = 0, trailX = 0, squash = 0, raf = 0, previous = 0;
  let inRange = false, pendingEncounter = false, cornerWhipped = false, whipping = false;
  let committedUntil = 0, lastEscapeAt = -Infinity, cooldownUntil = 0, distanceAtCommit = Infinity;
  let ignoreClickUntil = 0, feedbackTimer = 0, cooldownTimer = 0;
  const ready = () => emailValid(email) && passwordValid(password);
  const range = () => Math.max(0, (track.clientWidth - button.offsetWidth) / 2 - 12);
  const arrived = () => Math.abs(target - x) < 2.5 && Math.abs(velocity) < 18;
  function render() {
    const stretch = Math.min(Math.abs(velocity) / 1900, .2);
    button.style.transform = `translateX(${x}px) scale(${1 + stretch - squash * .42},${1 - stretch * .8 + squash * .4})`;
    trail.style.transform = `translateX(${trailX}px)`;
    trail.style.opacity = String(Math.min(Math.abs(x - trailX) / 100 + squash * .3, .55));
  }
  function clearEncounter() {
    inRange = pendingEncounter = cornerWhipped = whipping = false;
    committedUntil = cooldownUntil = 0; lastEscapeAt = -Infinity; distanceAtCommit = Infinity;
    clearTimeout(cooldownTimer); button.classList.remove('run-nervous');
  }
  function hold() {
    cancelAnimationFrame(raf); raf = 0;
    target = x; velocity = squash = 0; trailX = x; clearEncounter(); render();
  }
  function startCooldown(now) {
    whipping = false; cooldownUntil = now + 700;
    button.classList.add('run-nervous');
    clearTimeout(cooldownTimer);
    cooldownTimer = setTimeout(() => button.classList.remove('run-nervous'), 700);
  }
  function tick(now) {
    raf = 0;
    if (!visible(button) || prefersReducedMotion()) { hold(); return; }
    const dt = Math.min((now - previous) / 1000, 1 / 30); previous = now;
    // Critical damping (2 * sqrt(324) = 36), small integration steps, bounded speed.
    const steps = Math.max(1, Math.ceil(dt * 120)), step = dt / steps, limit = range();
    for (let i = 0; i < steps; i++) {
      velocity = clamp(velocity + ((target - x) * 324 - velocity * 36) * step, -650, 650);
      x += velocity * step;
      if (Math.abs(x) > limit) { x = clamp(x, -limit, limit); velocity = 0; }
    }
    squash *= Math.exp(-dt * 14);
    trailX += (x - trailX) * Math.min(1, dt * 10); render();
    // The whip finishes first; its full 700ms rest then wiggles without moving the target.
    if (whipping && arrived()) startCooldown(now);
    if (Math.abs(target - x) > .08 || Math.abs(velocity) > .1 || squash > .005 || Math.abs(trailX - x) > .1) {
      raf = requestAnimationFrame(tick);
    } else { velocity = squash = 0; trailX = x; render(); }
  }
  function move(value, whip = false) {
    if (prefersReducedMotion()) { hold(); return; }
    target = clamp(value, -range(), range());
    // Even a whip is spring travel: events never write x or kick velocity.
    squash = Math.max(squash, whip ? 1 : .12);
    if (!raf) { previous = performance.now(); raf = requestAnimationFrame(tick); }
  }
  function escape(px, py, now, force = false) {
    if (prefersReducedMotion()) return;
    const distance = Math.hypot(px - x, py);
    if (inRange && distance >= 170) {
      inRange = pendingEncounter = cornerWhipped = false;
    } else if (!inRange && distance <= 120) {
      inRange = pendingEncounter = true;
    }
    // No direction decisions during travel, commitment, or the post-whip rest.
    if (whipping || now < cooldownUntil || now < committedUntil || now - lastEscapeAt < 500 || !arrived()) return;
    const limit = range();
    const cornered = Math.abs(target) > .5 && Math.abs(Math.abs(target) - limit) < 3;
    const comingCloser = Math.hypot(px - target, py) < distanceAtCommit - 18;
    const whip = !cornerWhipped && cornered && inRange && distance < 105 && comingCloser;
    if (!whip && !pendingEncounter && !force) return;
    const next = whip ? -target : (px < 0 ? 1 : px > 0 ? -1 : x > 0 ? -1 : 1) * limit;
    // Hovering near an already chosen end is not a reason to reverse it.
    if (Math.abs(next - target) < .5) return;
    pendingEncounter = false; lastEscapeAt = now; committedUntil = now + 500;
    distanceAtCommit = Math.hypot(px - next, py);
    if (whip) { cornerWhipped = true; whipping = true; }
    move(next, whip);
  }
  function valid(input) { return input === email ? emailValid(email) : passwordValid(password); }
  function validateTouched(input) {
    if (input.dataset.runTouched && !valid(input)) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
  }
  function hint(input) {
    return input === email ? (email.value.trim() ? 'That email needs a valid address, like you@example.com.' : 'Your email is missing. Tell me where to find you.')
      : password.value ? 'Your password needs at least 8 characters.' : 'Your password is missing. Give me an 8-character secret.';
  }
  function update() {
    inputs.forEach(input => { validateTouched(input); input.closest('.field').classList.toggle('good', valid(input)); });
    button.classList.toggle('ready', ready());
    if (ready()) { clearEncounter(); move(0); }
    if (!working && !signedIn) message(status, ready() ? 'Locked in. Go on then.' : emailValid(email) || passwordValid(password) ? 'One to go. Still too quick to catch.' : 'Two fields to fill before it stands still.');
  }
  function deny(source = 'keyboard', clientX) {
    inputs.forEach(input => { input.dataset.runTouched = 'true'; validateTouched(input); });
    const missing = inputs.find(input => !valid(input));
    if (!missing) return;
    message(status, hint(missing), true);
    replayAnimation(button, 'run-nope'); replayAnimation(missing.closest('.field'), 'run-field-pulse');
    clearTimeout(feedbackTimer);
    feedbackTimer = setTimeout(() => {
      button.classList.remove('run-nope'); inputs.forEach(input => input.closest('.field').classList.remove('run-field-pulse'));
    }, 520);
    if (source === 'keyboard') { keyboard = true; hold(); missing.focus({ preventScroll: true }); }
    else {
      keyboard = false;
      const bounds = track.getBoundingClientRect();
      const pointer = Number.isFinite(clientX) ? clientX - bounds.left - bounds.width / 2 : x;
      escape(pointer, 0, performance.now(), true);
    }
  }
  // Fresh fields stay neutral, including browser-restored validity state.
  inputs.forEach(input => {
    input.removeAttribute('aria-invalid'); delete input.dataset.runTouched;
    input.addEventListener('blur', () => { input.dataset.runTouched = 'true'; validateTouched(input); });
  });
  form.addEventListener('input', update);
  document.addEventListener('keydown', event => { if (event.key === 'Tab') { keyboard = true; hold(); } });
  button.addEventListener('focus', () => { keyboard = true; hold(); });
  stage.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse' || working || signedIn || ready() || prefersReducedMotion()) return;
    if (keyboard && document.activeElement === button) return;
    keyboard = false;
    const bounds = track.getBoundingClientRect();
    escape(event.clientX - bounds.left - bounds.width / 2, event.clientY - bounds.top - bounds.height / 2, performance.now());
  });
  // Leaving the stage rearms the next encounter; it never reverses a committed spring.
  stage.addEventListener('pointerleave', () => { inRange = pendingEncounter = cornerWhipped = false; });
  // Pointerdown precedes browser focus and native submit; click guards cover synthetic activation too.
  button.addEventListener('pointerdown', event => {
    if (working || signedIn || ready()) return;
    event.preventDefault(); ignoreClickUntil = performance.now() + 600;
    deny(event.pointerType === 'mouse' ? 'mouse' : 'touch', event.clientX);
  });
  button.addEventListener('click', event => {
    if (ready() || working || signedIn) return;
    event.preventDefault(); event.stopPropagation();
    if (event.detail === 0 || performance.now() > ignoreClickUntil) deny(event.detail === 0 ? 'keyboard' : 'mouse', event.clientX);
  });
  stage.addEventListener('stagevisibility', () => { if (!visible(button)) hold(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) hold(); });
  window.addEventListener('resize', () => { clearEncounter(); move(0); });
  form.addEventListener('submit', async event => {
    event.preventDefault(); if (working || signedIn) return;
    if (!ready()) { deny('keyboard'); return; }
    clearEncounter(); move(0); inputs.forEach(input => input.removeAttribute('aria-invalid'));
    const submittedFrom = document.activeElement;
    working = true; busy(form, true); button.disabled = true; email.readOnly = password.readOnly = true;
    button.innerHTML = '<i class="spinner" aria-hidden="true"></i><span class="sr-only">Signing in</span>';
    message(status, 'Signing you in…'); await wait(800);
    signedIn = true; working = false; busy(form, false); button.textContent = '✓ You’re in';
    message(status, 'Signed in. Nice catch.'); burst(button, ['#62e7cc', '#fff9d5', '#eba391', '#a5d3ff']); reset.hidden = false;
    focusReplay(reset, submittedFrom);
  });
  reset.addEventListener('click', () => {
    form.reset(); clearEncounter(); move(0); email.readOnly = password.readOnly = false; signedIn = false; button.disabled = false;
    button.innerHTML = 'Log in <span>↗</span>'; reset.hidden = true; clearTimeout(feedbackTimer); button.classList.remove('run-nope');
    inputs.forEach(input => { input.removeAttribute('aria-invalid'); delete input.dataset.runTouched; input.closest('.field').classList.remove('run-field-pulse'); });
    update(); email.focus({ preventScroll: true });
  });
}

// 02 / Independent pupil, arm and body layers. Email focus takes priority over the pointer.
function setupWatcher() {
  const form = $('#watch-form'), character = $('#watch-character'), pupils = $('.pupils');
  const email = $('#watch-email'), password = $('#watch-password'), eye = $('[data-eye="watch-password"]');
  const status = $('#watch-status'), caption = $('#pip-caption'), button = $('.watch-submit'), reset = $('#watch-reset');
  let working = false, success = false, pointing = 0, pointX = 0, pointY = 0, wrongAttempt = 0;
  // Mask holes make Pip actually peek through his fingers, rather than lower his arms.
  const ns = 'http://www.w3.org/2000/svg', mask = document.createElementNS(ns, 'mask');
  mask.id = 'pip-peek-mask'; mask.setAttribute('maskUnits', 'userSpaceOnUse');
  mask.innerHTML = '<rect width="260" height="225" fill="white"/><rect x="86" y="104" width="20" height="7" rx="3" fill="black"/><rect x="154" y="104" width="20" height="7" rx="3" fill="black"/>';
  $('defs', character).append(mask);
  const hands = document.createElementNS(ns, 'g'); $('.pip-body').append(hands);
  $$('.hand', character).forEach(hand => hands.append(hand));
  function look(x, y) { pupils.style.transform = `translate(${clamp(x, -12, 12)}px,${clamp(y, -7, 9)}px)`; }
  function emailLook() {
    if (document.activeElement !== email) return;
    const caret = email.selectionStart ?? email.value.length;
    look(-11 + Math.min(caret, 28) / 28 * 23, 7);
  }
  function updatePose() {
    if (success || working) return;
    const focused = document.activeElement, covered = focused === password || focused === eye;
    const peek = covered && password.type === 'text';
    character.classList.toggle('covering', covered); character.classList.toggle('peeking', peek);
    if (peek) hands.setAttribute('mask', 'url(#pip-peek-mask)'); else hands.removeAttribute('mask');
    caption.textContent = peek ? '“Just a tiny peek…?”' : covered ? '“I saw absolutely nothing.”' : focused === email ? '“That’s a lovely name.”' : '“Oh, hello you.”';
    if (focused === email) emailLook(); else look(0, covered ? 1 : 0);
  }
  form.addEventListener('focusin', updatePose); form.addEventListener('focusout', () => queueMicrotask(updatePose));
  password.addEventListener('passwordvisibility', updatePose);
  ['input', 'keyup', 'select', 'pointerup'].forEach(type => email.addEventListener(type, emailLook));
  character.closest('.stage').addEventListener('pointermove', event => {
    if (prefersReducedMotion() || working || success || document.activeElement === email || character.classList.contains('covering')) return;
    const rect = character.getBoundingClientRect();
    pointX = (event.clientX - rect.left - rect.width / 2) / rect.width * 20;
    pointY = (event.clientY - rect.top - rect.height * .48) / rect.height * 12;
    if (!pointing) pointing = requestAnimationFrame(() => { pointing = 0; if (visible(character)) look(pointX, pointY); });
  });
  character.closest('.stage').addEventListener('pointerleave', () => { if (document.activeElement !== email) look(0, 0); });
  form.addEventListener('submit', async event => {
    event.preventDefault(); if (working || success) return;
    if (!emailValid(email)) { invalid(email, status, 'A valid email first, please.'); return; }
    if (password.value !== 'peekaboo') {
      invalid(password, status, 'Not quite. The demo password is peekaboo.');
      character.classList.remove('covering', 'peeking'); hands.removeAttribute('mask');
      caption.textContent = '“Hmm… that’s not our secret.”'; replayAnimation(character, 'shaking');
      const attempt = ++wrongAttempt;
      await wait(750); if (attempt === wrongAttempt) { character.classList.remove('shaking'); updatePose(); } return;
    }
    const submittedFrom = document.activeElement;
    ++wrongAttempt; character.classList.remove('shaking');
    $$('[aria-invalid]', form).forEach(input => input.removeAttribute('aria-invalid'));
    working = true; busy(form, true); button.disabled = true; email.readOnly = password.readOnly = true;
    character.classList.remove('covering', 'peeking'); hands.removeAttribute('mask');
    caption.textContent = '“One moment, friend.”'; message(status, 'Pip is checking the guest list…'); await wait(650);
    working = false; success = true; busy(form, false); character.classList.add('celebrating');
    caption.textContent = '“You’re here! You’re really here!”'; message(status, 'Welcome in. Pip is very happy to see you.');
    button.innerHTML = 'Welcome, friend <span>✓</span>'; reset.hidden = false; burst(character, ['#ee9b71', '#eec264', '#7fa693', '#fff9e3']);
    focusReplay(reset, submittedFrom);
  });
  reset.addEventListener('click', () => {
    success = false; form.reset(); email.readOnly = password.readOnly = false; button.disabled = false;
    password.type = 'password'; eye.setAttribute('aria-pressed', 'false'); eye.setAttribute('aria-label', 'Show password');
    character.classList.remove('celebrating', 'shaking'); button.innerHTML = 'Let me in <span>↗</span>'; reset.hidden = true;
    message(status, 'Use any valid email and the demo password.'); email.focus({ preventScroll: true }); updatePose();
  });
}

// 03 / True z coordinates in a tilted orbital plane, then a springy final click.
function setupOrbit() {
  const inputs = $$('.digits input'), row = $('.digits'), scene = $('.orbit-scene'), tiles = $('.orbit-tiles');
  const status = $('#otp-status'), fill = $('#fill-code'), resend = $('#resend'), reset = $('#otp-reset'), verified = $('.verified');
  let working = false, resendAt = Date.now() + 30000, raf = 0, elapsed = 0, previous = 0, focusAfter = false;
  function clearError() {
    row.classList.remove('wrong'); inputs.forEach(input => input.removeAttribute('aria-invalid'));
    if (!working) message(status, 'Your next chapter is four digits away.');
  }
  function distribute(value, index = 0) {
    const digits = value.replace(/\D/g, '').slice(0, 4 - index); if (!digits) return;
    clearError(); [...digits].forEach((digit, offset) => { inputs[index + offset].value = digit; });
    inputs[Math.min(index + digits.length, 3)].focus({ preventScroll: true }); check();
  }
  inputs.forEach((input, index) => {
    input.addEventListener('focus', () => input.select());
    input.addEventListener('input', () => {
      if (working) return;
      const value = input.value.replace(/\D/g, ''); clearError();
      if (value.length > 1) { distribute(value, value.length === 4 ? 0 : index); return; }
      input.value = value.slice(-1);
      if (input.value && index < 3) inputs[index + 1].focus({ preventScroll: true }); check();
    });
    input.addEventListener('keydown', event => {
      if (working) return;
      if (event.key === 'Backspace') {
        event.preventDefault(); clearError();
        if (input.value) input.value = '';
        else if (index > 0) { inputs[index - 1].value = ''; inputs[index - 1].focus({ preventScroll: true }); }
      }
      if (event.key === 'ArrowLeft' && index > 0) { event.preventDefault(); inputs[index - 1].focus({ preventScroll: true }); }
      if (event.key === 'ArrowRight' && index < 3) { event.preventDefault(); inputs[index + 1].focus({ preventScroll: true }); }
      if (event.key === 'Enter') check();
    });
    input.addEventListener('paste', event => {
      event.preventDefault(); if (working) return;
      const code = event.clipboardData?.getData('text').replace(/\D/g, '') || '';
      if (code.length >= 4) { inputs.forEach(input => { input.value = ''; }); distribute(code, 0); }
      else distribute(code, index);
    });
  });
  function finish() {
    cancelAnimationFrame(raf); raf = 0; tiles.replaceChildren(); scene.classList.add('orbit-complete');
    verified.hidden = false; reset.hidden = false; row.setAttribute('aria-busy', 'false');
    message(status, 'Verified successfully. You’re in.'); burst(verified, ['#78f1b9', '#c9ffed', '#90cfff'], true);
    if (focusAfter && (document.activeElement === fill || inputs.includes(document.activeElement) || document.activeElement === document.body) && visible(reset)) reset.focus({ preventScroll: true });
  }
  function animate(now) {
    raf = 0; if (prefersReducedMotion()) { finish(); return; }
    // Pause and resume the short choreography without jumping when off-screen.
    if (!visible(scene)) { previous = 0; return; }
    elapsed += previous ? Math.min(now - previous, 40) : 0; previous = now;
    const progress = Math.min(elapsed / 2600, 1);
    const opening = clamp(progress / .24, 0, 1), closing = clamp((progress - .72) / .28, 0, 1);
    const easeOpen = 1 - Math.pow(1 - opening, 3), easeClose = closing * closing * (3 - 2 * closing);
    const radius = Math.min(scene.clientWidth * .31, 132) * easeOpen * (1 - easeClose);
    const phase = progress * Math.PI * 2 * 1.45;
    $$('.orbit-tile', tiles).forEach((tile, i) => {
      const angle = i * Math.PI / 2 + phase;
      const start = (i - 1.5) * (inputs[0].offsetWidth + (scene.clientWidth < 350 ? 10 : 14));
      const x = Math.cos(angle) * radius + start * (1 - easeOpen), planeY = Math.sin(angle) * radius;
      const y = planeY * Math.cos(Math.PI / 3.3), z = planeY * Math.sin(Math.PI / 3.3);
      tile.style.transform = `translate3d(${x}px,${y}px,${z}px) rotateY(${Math.sin(angle) * 28}deg) rotateZ(${Math.cos(angle) * 16}deg) scale(${1 - easeClose * .85})`;
      tile.style.opacity = String(1 - easeClose);
    });
    if (progress >= 1) finish(); else raf = requestAnimationFrame(animate);
  }
  function check() {
    if (working || inputs.some(input => !input.value)) return;
    if (inputs.map(input => input.value).join('') !== '4719') {
      replayAnimation(row, 'wrong'); inputs.forEach(input => input.setAttribute('aria-invalid', 'true'));
      message(status, 'That code doesn’t match. Try the demo code 4719.', true); return;
    }
    focusAfter = document.activeElement === fill || inputs.includes(document.activeElement);
    working = true; clearError(); fill.disabled = true; resend.disabled = true;
    inputs.forEach(input => { input.readOnly = true; }); row.setAttribute('aria-busy', 'true');
    message(status, 'Code accepted. Bringing it all together…');
    tiles.innerHTML = inputs.map(input => `<div class="orbit-tile">${input.value}</div>`).join('');
    scene.classList.add('orbiting'); elapsed = 0; previous = 0;
    if (prefersReducedMotion()) finish(); else raf = requestAnimationFrame(animate);
  }
  function resume() { if (working && verified.hidden && visible(scene) && !raf) { previous = 0; raf = requestAnimationFrame(animate); } }
  scene.closest('.stage').addEventListener('stagevisibility', resume); document.addEventListener('visibilitychange', resume);
  fill.addEventListener('click', () => { if (!working) { inputs.forEach((input, i) => { input.value = '4719'[i]; }); check(); } });
  reset.addEventListener('click', () => {
    cancelAnimationFrame(raf); raf = 0; working = false; fill.disabled = false; row.setAttribute('aria-busy', 'false');
    inputs.forEach(input => { input.readOnly = false; input.value = ''; input.removeAttribute('aria-invalid'); });
    row.classList.remove('wrong'); scene.classList.remove('orbiting', 'orbit-complete'); verified.hidden = true;
    tiles.replaceChildren(); reset.hidden = true; message(status, 'Ready for another orbit. Demo code: 4719.');
    countdown(); inputs[0].focus({ preventScroll: true });
  });
  function countdown() {
    const seconds = Math.max(0, Math.ceil((resendAt - Date.now()) / 1000));
    resend.textContent = seconds ? `Resend in ${seconds}s` : 'Resend code ↗'; resend.disabled = seconds > 0 || working;
  }
  countdown(); setInterval(countdown, 1000);
  resend.addEventListener('click', () => {
    if (working) return;
    resendAt = Date.now() + 30000; countdown(); inputs.forEach(input => { input.value = ''; }); clearError();
    message(status, 'A fresh demo code is ready: 4719.'); inputs[0].focus({ preventScroll: true });
  });
}

// 04 / Password strength drives the dial; opening releases each bolt before moving the hinge.
function setupVault() {
  const form = $('#vault-form'), password = $('#vault-password'), status = $('#vault-status');
  const button = $('.vault-submit'), reset = $('#vault-reset'), visual = $('#vault-visual'), dial = $('.vault-dial');
  const lights = $$('.vault-indicators i'), bolts = $$('.vault-bolts i'), meter = $('.strength-meter');
  const bars = $$('i', meter), label = $('#strength-label'), mechanism = $('#vault-mechanism');
  let working = false, unlocked = false, dialAngle = 0;
  const names = ['Awaiting a secret', 'Weak', 'Medium', 'Strong'];
  function strength(value) {
    if (!value) return 0;
    const variety = Number(/[a-z]/.test(value)) + Number(/[A-Z]/.test(value)) + Number(/\d/.test(value)) + Number(/[^a-zA-Z0-9]/.test(value));
    return value.length >= 12 && variety >= 3 ? 3 : value.length >= 8 && variety >= 2 ? 2 : 1;
  }
  function update() {
    if (working || unlocked) return;
    const value = password.value, level = strength(value), color = ['#6b7764', '#e8a28e', '#edce8c', '#bde89e'][level];
    form.closest('.stage').style.setProperty('--bolt-color', color);
    label.textContent = names[level]; meter.setAttribute('aria-valuenow', String(level)); meter.setAttribute('aria-valuetext', names[level]);
    bars.forEach((bar, i) => bar.classList.toggle('lit', i < level));
    const count = level === 3 ? 8 : level === 2 ? 5 : level === 1 ? 2 : 0;
    lights.forEach((light, i) => light.classList.toggle('lit', i < count));
    dialAngle = Math.min(value.length, 24) * 15 + Math.max(0, level - 1) * 38; dial.style.transform = `rotate(${dialAngle}deg)`;
    visual.setAttribute('aria-label', `Mechanical vault: locked. ${names[level]} password. ${count} of eight indicators lit.`);
    message(status, 'Try typing a password. Then use the demo key.');
  }
  password.addEventListener('input', update);
  form.addEventListener('submit', async event => {
    event.preventDefault(); if (working || unlocked) return;
    if (password.value !== 'OpenSesame!42') {
      invalid(password, status, 'That key doesn’t fit. Try OpenSesame!42.'); replayAnimation(visual, 'denied');
      setTimeout(() => visual.classList.remove('denied'), 600); return;
    }
    const submittedFrom = document.activeElement;
    password.removeAttribute('aria-invalid');
    working = true; busy(form, true); password.readOnly = true; button.disabled = true;
    message(status, 'Key accepted. Aligning the mechanism…'); mechanism.textContent = 'ALIGNING THE TUMBLERS';
    dial.style.transitionDuration = prefersReducedMotion() ? '0s' : '1.3s'; dial.style.transform = `rotate(${dialAngle + 1080}deg)`; await wait(1350);
    for (let i = 0; i < bolts.length; i++) {
      bolts[i].classList.add('retracted'); lights[i].classList.add('lit');
      mechanism.textContent = `BOLT ${String(i + 1).padStart(2, '0')} / 08 RELEASED`; await wait(135);
    }
    message(status, 'All eight bolts released. Opening your world…'); mechanism.textContent = 'ALL CLEAR. STEP INSIDE.';
    visual.classList.add('unlocked'); await wait(1550);
    unlocked = true; working = false; busy(form, false); reset.hidden = false;
    visual.setAttribute('aria-label', 'Vault open, revealing a glowing Welcome interior.');
    message(status, 'Welcome. Your world is unlocked.'); button.innerHTML = 'Vault open <span>✓</span>';
    burst($('.vault-interior'), ['#bde89e', '#eafad1', '#f6d49e'], true);
    focusReplay(reset, submittedFrom);
  });
  reset.addEventListener('click', async () => {
    if (working) return;
    working = true; reset.disabled = true; visual.classList.remove('unlocked');
    message(status, 'Closing the vault…'); await wait(1500);
    bolts.forEach(bolt => bolt.classList.remove('retracted')); password.readOnly = false; password.value = '';
    dial.style.transitionDuration = ''; button.disabled = false; reset.disabled = false; reset.hidden = true;
    button.innerHTML = 'Unlock the vault <span>↗</span>'; unlocked = false; working = false;
    mechanism.textContent = 'EIGHT BOLTS. ONE SECRET.'; update(); password.focus({ preventScroll: true });
  });
}

// 05 / Cubic edges stretch into a liquid blob; mobile morphs the whole panorama.
function setupLiquid() {
  const card = $('.liquid-card'), form = $('#liquid-form'), path = $('#liquid-path');
  const modeSwitch = $('#mode-switch'), status = $('#liquid-status'), button = $('.liquid-submit');
  const name = $('#liquid-name'), email = $('#liquid-email'), password = $('#liquid-password');
  const layers = $$('.mountain-layer'), drops = $$('.goo-drop');
  let register = false, working = false, morphing = false, progress = 0, pointerX = 0, pointerY = 0;
  let parallax = 0, currentX = 0, currentY = 0;
  const mobile = () => window.matchMedia('(max-width:760px)').matches;
  function shape(p, wave = 0) {
    if (mobile()) {
      const dip = Math.sin(p * Math.PI) * 135;
      path.setAttribute('d', `M8 8 C200 ${8 + dip} 500 ${8 - dip * .1} 792 8 L792 572 C580 ${572 - dip} 240 ${572 + dip * .1} 8 572 Z`);
    } else {
      const left = 424 * (1 - p) + 8 * p, right = 792 * (1 - p) + 376 * p, stretch = Math.sin(p * Math.PI) * 140;
      path.setAttribute('d', `M${left} 8 C${left - 25 - stretch} 75 ${left + 25 + stretch} 180 ${left + wave} 290 C${left - 22 - stretch} 390 ${left + 10} 500 ${left} 572 L${right} 572 C${right + stretch} 490 ${right - stretch} 390 ${right - wave} 290 C${right + stretch} 190 ${right - 5} 80 ${right} 8 Z`);
      drops.forEach((drop, i) => {
        drop.setAttribute('cx', String(left + (i ? -1 : 1) * stretch * .15));
        drop.setAttribute('rx', String(12 + stretch * .1)); drop.setAttribute('ry', String(24 + stretch * .17));
      });
    }
    // The form and copy share the blob's RAF progress, so all three arrive together.
    form.style.transform = mobile() ? 'none' : `translateX(${p * 100}%)`;
    $('.landscape-copy').style.transform = mobile() ? 'none' : `translateX(${-p * 100}%)`;
    const offset = mobile() ? -170 : -350 * p;
    layers.forEach(layer => {
      const depth = Number(layer.dataset.depth);
      layer.style.transform = `translate(${offset + currentX * depth}px,${currentY * depth}px)`;
    });
  }
  function settlePointer() {
    parallax = 0; if (!visible(card) || prefersReducedMotion()) return;
    currentX += (pointerX - currentX) * .12; currentY += (pointerY - currentY) * .12; shape(progress);
    if (Math.abs(pointerX - currentX) + Math.abs(pointerY - currentY) > .1) parallax = requestAnimationFrame(settlePointer);
  }
  function pointer(event) {
    if (morphing || prefersReducedMotion()) return;
    const rect = card.getBoundingClientRect();
    pointerX = ((event.clientX - rect.left) / rect.width - .5) * 18;
    pointerY = ((event.clientY - rect.top) / rect.height - .5) * 10;
    if (!parallax) parallax = requestAnimationFrame(settlePointer);
  }
  card.addEventListener('pointermove', pointer); card.addEventListener('pointerdown', pointer);
  card.addEventListener('pointerleave', () => { pointerX = pointerY = 0; if (!parallax) parallax = requestAnimationFrame(settlePointer); });
  function updateCopy() {
    card.classList.toggle('register', register);
    $('#liquid-title').textContent = register ? 'Start somewhere.' : 'Welcome back.';
    $('#liquid-sub').textContent = register ? 'A little curiosity goes a long way.' : 'Your next adventure starts here.';
    $('#name-label').hidden = !register; name.required = register; password.autocomplete = register ? 'new-password' : 'current-password';
    button.innerHTML = register ? 'Create account <span>↗</span>' : 'Log in <span>↗</span>';
    $('#landscape-title').innerHTML = register ? 'Already<br> wandering?' : 'Hello,<br> out there.';
    $('#landscape-sub').textContent = register ? 'Come back to your own path.' : 'Make a little room for wonder.';
    modeSwitch.innerHTML = register ? 'Back to log in <span>↗</span>' : 'Create an account <span>↗</span>';
    modeSwitch.setAttribute('aria-expanded', String(register));
    message(status, register ? 'Create your demo account.' : 'A demo journey. No account needed.');
    $$('[aria-invalid]', form).forEach(input => input.removeAttribute('aria-invalid'));
  }
  modeSwitch.addEventListener('click', () => {
    if (working || morphing) return;
    register = !register; morphing = true; updateCopy(); card.classList.add('morphing');
    modeSwitch.disabled = true; form.inert = true;
    const from = progress, to = register ? 1 : 0, start = performance.now();
    function animate(now) {
      const t = prefersReducedMotion() ? 1 : Math.min((now - start) / 1100, 1);
      const eased = t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      progress = from + (to - from) * eased; shape(progress, Math.sin(t * Math.PI * 3) * Math.sin(t * Math.PI) * 28);
      if (t < 1 && !document.hidden) requestAnimationFrame(animate);
      else {
        progress = to; shape(progress); morphing = false; card.classList.remove('morphing');
        modeSwitch.disabled = false; form.inert = false;
      }
    }
    requestAnimationFrame(animate);
  });
  window.addEventListener('resize', () => shape(progress));
  card.closest('.stage').addEventListener('stagevisibility', () => {
    if (!visible(card)) { cancelAnimationFrame(parallax); parallax = 0; }
  });
  form.addEventListener('submit', async event => {
    event.preventDefault(); if (working || morphing) return;
    const wrong = register && !name.value.trim() ? name : !emailValid(email) ? email : !passwordValid(password) ? password : null;
    if (wrong) { invalid(wrong, status, wrong === name ? 'Tell us your name.' : wrong === email ? 'Enter a valid email address.' : 'Use at least 8 characters for your password.'); return; }
    working = true; busy(form, true); button.disabled = modeSwitch.disabled = true;
    [name, email, password].forEach(input => { input.readOnly = true; });
    message(status, register ? 'Making a place for you…' : 'Finding your path…'); await wait(900);
    message(status, register ? 'Demo account created. Your adventure awaits.' : 'Signed in. Welcome to your next chapter.');
    burst(button, ['#acb9a4', '#b7797a', '#f6d1aa', '#7f8dab']);
    button.disabled = modeSwitch.disabled = false; working = false; busy(form, false);
    [name, email, password].forEach(input => { input.readOnly = false; });
  });
  shape(0);
}

// Independent initialization prevents a decorative failure from blocking other stations.
[setupRunaway, setupWatcher, setupOrbit, setupVault, setupLiquid].forEach(setup => {
  try { setup(); } catch (error) { console.warn(`Open Sesame: ${setup.name} could not initialize.`, error); }
});
