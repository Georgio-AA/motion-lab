import { prefersReducedMotion } from '../shared/base.js';

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
let reduced = prefersReducedMotion();
const visibleEffects = new Set();

// Navigation never locks the body: wheel, keys, and touch keep their native behavior.
const header = $('.site-header');
const menuButton = $('.menu-toggle');
function closeMenu(returnFocus = false) {
  header.classList.remove('menu-open');
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.setAttribute('aria-label', 'Open navigation');
  if (returnFocus) menuButton.focus();
}
menuButton.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') !== 'true';
  header.classList.toggle('menu-open', open);
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
});
$$('#nav-links a').forEach(link => link.addEventListener('click', () => closeMenu()));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && header.classList.contains('menu-open')) closeMenu(true);
});
document.addEventListener('pointerdown', event => {
  if (!header.contains(event.target)) closeMenu();
});
header.addEventListener('focusout', event => {
  if (event.relatedTarget && !header.contains(event.relatedTarget)) closeMenu();
});

// The preview runs locally, with an announced completion and no network requests.
const product = $('.product-shell');
let runTimer = 0;
let runNumber = 248;
function runWorkflow(scrollToPreview = false) {
  window.clearTimeout(runTimer);
  if (scrollToPreview) product.scrollIntoView({ block: 'center', behavior: reduced ? 'instant' : 'smooth' });
  product.classList.remove('is-running');
  // Restart the finite highlight independently of the continuous data pulses.
  void product.offsetWidth;
  product.classList.add('is-running');
  $('#run-description').textContent = 'Request received → Following the flow…';
  $('#run-duration').textContent = 'Running';
  $('#run-workflow').textContent = 'Restart ↻';
  $('#run-announcement').textContent = 'Sample workflow running. Request received.';
  runTimer = window.setTimeout(() => {
    product.classList.remove('is-running');
    $('#run-description').textContent = 'Client intake → Project created';
    $('#run-duration').textContent = '1.24s';
    $('.run-id').textContent = `#KV-${String(++runNumber).padStart(4, '0')}`;
    $('#run-workflow').textContent = 'Run flow ▶';
    $('#run-announcement').textContent = 'Sample run complete. All four steps recorded. No real project was created.';
  }, reduced ? 350 : 2400);
}
$('#watch-run').addEventListener('click', () => runWorkflow(true));
$('#run-workflow').addEventListener('click', () => runWorkflow());

// Small product interactions give the bento cards a tangible, usable quality.
$$('.switch').forEach(button => button.addEventListener('click', () => {
  const checked = button.getAttribute('aria-checked') !== 'true';
  button.setAttribute('aria-checked', String(checked));
  $('#setting-note').textContent = `${button.getAttribute('aria-label')}: ${checked ? 'on' : 'off'} in this preview.`;
}));
let approved = false;
$('#approve-button').addEventListener('click', event => {
  approved = !approved;
  event.currentTarget.textContent = approved ? '✓ Approved · Reset preview ↻' : '✓ Approve sample brief';
  $('#approval-note').textContent = approved ? 'Sample brief approved. The next step is ready.' : 'Your decision moves the flow forward.';
});

// Tilt and magnetic motion are exclusive to fine pointers; touch has the same controls.
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
$$('.feature-card').forEach(card => {
  card.addEventListener('pointermove', event => {
    if (reduced || !finePointer.matches || event.pointerType === 'touch') return;
    const rect = card.getBoundingClientRect();
    const x = clamp((event.clientX - rect.left) / rect.width);
    const y = clamp((event.clientY - rect.top) / rect.height);
    card.style.setProperty('--tilt-x', `${(0.5 - y) * 5}deg`);
    card.style.setProperty('--tilt-y', `${(x - 0.5) * 5}deg`);
    card.style.setProperty('--pointer-x', `${x * 100}%`);
    card.style.setProperty('--pointer-y', `${y * 100}%`);
  });
  card.addEventListener('pointerleave', () => {
    card.style.setProperty('--tilt-x', '0deg');
    card.style.setProperty('--tilt-y', '0deg');
  });
});
$$('.magnetic').forEach(button => {
  button.addEventListener('pointermove', event => {
    if (reduced || !finePointer.matches) return;
    const rect = button.getBoundingClientRect();
    button.style.transform = `translate(${(event.clientX - rect.left - rect.width / 2) * .13}px, ${(event.clientY - rect.top - rect.height / 2) * .17}px)`;
  });
  button.addEventListener('pointerleave', () => button.style.removeProperty('transform'));
});

// Price estimates: base + overage, with a transparent annual discount on the total.
const plans = [
  { id: 'start', name: 'Start', base: 29, included: 2000, overage: 6 },
  { id: 'flow', name: 'Flow', base: 89, included: 10000, overage: 4 },
  { id: 'scale', name: 'Scale', base: 249, included: 50000, overage: 0 }
];
const usageInput = $('#usage');
let annual = false;
let selectedPlan = '';
let priceAnimationTimer = 0;
const formatNumber = new Intl.NumberFormat('en-US');
const formatPrice = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
function updatePricing(animate = true) {
  const runs = Number(usageInput.value);
  const discount = annual ? .8 : 1;
  $('#usage-output').textContent = formatNumber.format(runs);
  usageInput.style.setProperty('--usage-fill', `${(runs - 1000) / 49000 * 100}%`);
  const annualTotals = [];
  plans.forEach((plan, index) => {
    const monthly = (plan.base + Math.max(0, (runs - plan.included) / 1000) * plan.overage) * discount;
    const node = $(`#price-${plan.id}`);
    node.textContent = formatPrice.format(monthly);
    const card = node.closest('.plan');
    card.querySelector('.billing-note').textContent = annual ? `$${formatPrice.format(monthly * 12)} billed annually` : 'Billed monthly';
    card.querySelector('.base-price').textContent = `Base price: $${formatPrice.format(plan.base * discount)} / month${annual ? ', paid annually' : ''}`;
    if (animate && !reduced) {
      const price = node.parentElement;
      price.classList.remove('is-updating');
      void price.offsetWidth;
      price.classList.add('is-updating');
    }
    annualTotals[index] = `${plan.name}: $${formatPrice.format(monthly * 12)} / year`;
  });
  window.clearTimeout(priceAnimationTimer);
  priceAnimationTimer = window.setTimeout(() => $$('.price').forEach(el => el.classList.remove('is-updating')), 350);
  $('#pricing-summary').textContent = `Estimate for ${formatNumber.format(runs)} monthly runs. ${annual ? `Annual totals — ${annualTotals.join('; ')}. ` : ''}Prices in USD. Concept pricing; no checkout or charges.`;
}
$$('[data-billing]').forEach(button => button.addEventListener('click', () => {
  annual = button.dataset.billing === 'annual';
  $$('[data-billing]').forEach(item => {
    const selected = item === button;
    item.classList.toggle('selected', selected);
    item.setAttribute('aria-pressed', String(selected));
  });
  updatePricing();
}));
usageInput.addEventListener('input', () => updatePricing(false));
usageInput.addEventListener('change', () => updatePricing());
$$('[data-plan]').forEach(link => link.addEventListener('click', () => {
  selectedPlan = link.dataset.plan;
  $('#form-note').textContent = `${selectedPlan} plan selected · Demo only. No account created.`;
  if ($('#signup-success').hidden) {
    window.setTimeout(() => $('#email').focus({ preventScroll: true }), reduced ? 0 : 500);
  }
}));
updatePricing(false);

// Native details keeps the FAQ accessible even when scripts are unavailable.
$$('.faq-list details').forEach(detail => detail.addEventListener('toggle', () => {
  if (!detail.open) return;
  $$('.faq-list details').forEach(other => { if (other !== detail) other.open = false; });
}));
$('#privacy-link').addEventListener('click', () => { $('#privacy').open = true; });

// Front-end capture only: never transmit or persist the visitor's email address.
const signupForm = $('#signup-form');
const email = $('#email');
const formStatus = $('#form-status');
signupForm.addEventListener('submit', event => {
  event.preventDefault();
  email.value = email.value.trim();
  if (!email.validity.valid) {
    email.setAttribute('aria-invalid', 'true');
    formStatus.textContent = email.validity.valueMissing ? 'Add your email to try the signup preview.' : 'That email needs a little check. Use an address like you@company.com.';
    email.focus();
    return;
  }
  email.removeAttribute('aria-invalid');
  formStatus.textContent = '';
  signupForm.hidden = true;
  $('#signup-success').hidden = false;
  $('#success-message').textContent = `${selectedPlan ? `The ${selectedPlan} plan is selected. ` : ''}You’re all set for this demo. Your email hasn’t been sent or saved.`;
  // Erase the input once the local success state is shown.
  email.value = '';
  $('#reset-signup').focus({ preventScroll: true });
});
email.addEventListener('input', () => {
  email.removeAttribute('aria-invalid');
  formStatus.textContent = '';
});
$('#reset-signup').addEventListener('click', () => {
  $('#signup-success').hidden = true;
  signupForm.hidden = false;
  email.focus({ preventScroll: true });
});
$('#year').textContent = String(new Date().getFullYear());

// Visibility powers reveals and pauses continuous CSS effects outside the viewport.
let effectObserver;
if ('IntersectionObserver' in window) {
  effectObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const element = entry.target;
      element.classList.toggle('paused', !entry.isIntersecting);
      if (entry.isIntersecting) {
        visibleEffects.add(element);
        element.classList.add('in-view');
        if (element.id === 'metrics') startMetrics();
      } else visibleEffects.delete(element);
    });
  }, { threshold: .08 });
  $$('.reveal, .product-shell, #metrics, .bar-scene').forEach(element => effectObserver.observe(element));
  // Only opt into concealed reveals once the observer has been created successfully.
  if (!reduced) document.body.classList.add('motion-ready');
} else {
  $$('.reveal, .product-shell, #metrics, .bar-scene').forEach(element => {
    visibleEffects.add(element);
    element.classList.add('in-view');
  });
}

// Sample log/counter updates only run for visible cards, at a modest cadence.
const logCard = $('.card-log');
const counterCard = $('.card-counter');
const logMessages = ['↳ Request received', '↳ Context enriched', '✓ Approval recorded', '✓ Project created', '↳ Digest queued', '✓ Summary delivered'];
let logIndex = 4;
let sampleSeconds = 9 * 3600 + 41 * 60 + 5;
let sampleMinutes = 272;
window.setInterval(() => {
  if (document.hidden || reduced) return;
  if (visibleEffects.has(logCard)) {
    const line = document.createElement('p');
    const time = document.createElement('time');
    const message = document.createElement('span');
    sampleSeconds += 1;
    time.textContent = `${String(Math.floor(sampleSeconds / 3600) % 24).padStart(2, '0')}:${String(Math.floor(sampleSeconds / 60) % 60).padStart(2, '0')}:${String(sampleSeconds % 60).padStart(2, '0')}`;
    message.textContent = logMessages[logIndex++ % logMessages.length];
    if (message.textContent.startsWith('✓')) message.className = 'check';
    line.append(time, message);
    $('#live-log').firstElementChild.remove();
    $('#live-log').append(line);
  }
  if (visibleEffects.has(counterCard)) {
    sampleMinutes = sampleMinutes >= 299 ? 272 : sampleMinutes + 1;
    $('#time-saved').textContent = String(Math.floor(sampleMinutes / 60)).padStart(2, '0');
    $('#time-minutes').textContent = String(sampleMinutes % 60).padStart(2, '0');
  }
}, 3200);

// Scrub the connected workflow, bar growth, and square-to-banner transition.
const buildPanel = $('#build-panel');
const buildNodes = $$('.build-node');
const buildLabels = ['01 / Catch the request', '02 / Add the context', '03 / Keep the human call', '04 / A clean handoff'];
const bars = $$('.iso-bar');
const barScene = $('.bar-scene');
const morphStage = $('#morph-stage');
const morphBanner = $('#morph-banner');
const morphCopy = $('.morph-copy');
const morphMark = $('.morph-mark');
let scrollQueued = false;
function updateScrollEffects() {
  scrollQueued = false;
  const viewport = window.innerHeight;
  const buildRect = buildPanel.getBoundingClientRect();
  const progress = reduced ? 1 : clamp((viewport * .88 - buildRect.top) / (viewport * .55 + buildRect.height * .35));
  buildPanel.style.setProperty('--build-progress', progress);
  buildNodes.forEach((node, index) => {
    const step = reduced ? 1 : clamp((progress * 1.4 - index * .21) / .42);
    node.style.setProperty('--step-y', `${(1 - step) * 20}px`);
    node.style.setProperty('--step-opacity', .4 + step * .6);
    node.style.setProperty('--status-opacity', .2 + step * .8);
    node.classList.toggle('connected', step > .7);
  });
  $('#build-status').textContent = buildLabels[Math.min(3, Math.floor(progress * 4))];
  const barRect = barScene.getBoundingClientRect();
  const barProgress = reduced ? 1 : clamp((viewport * .93 - barRect.top) / (viewport * .65));
  bars.forEach((bar, index) => bar.style.setProperty('--bar-progress', clamp(barProgress * 1.7 - index * .09, .06, 1)));
  const morphRect = morphStage.getBoundingClientRect();
  const morphProgress = reduced ? 1 : clamp((viewport * .92 - morphRect.top) / (viewport * .76));
  const eased = 1 - Math.pow(1 - morphProgress, 3);
  const maxWidth = Math.min(1376, window.innerWidth - (window.innerWidth <= 650 ? 24 : 64));
  const maxHeight = window.innerWidth <= 900 ? 330 : 390;
  morphBanner.style.width = `${88 + (maxWidth - 88) * eased}px`;
  morphBanner.style.height = `${88 + (maxHeight - 88) * eased}px`;
  morphBanner.style.borderRadius = `${22 - 6 * eased}px`;
  const textProgress = reduced ? 1 : clamp((morphProgress - .3) / .35);
  morphCopy.style.opacity = textProgress;
  morphCopy.style.transform = `translateY(${(1 - textProgress) * 20}px)`;
  // Inert prevents tabbing into the banner while it is still a small closed square.
  morphCopy.inert = textProgress < .55;
  morphMark.style.opacity = reduced ? 0 : clamp(1 - morphProgress * 2.5);
  if (window.innerWidth > 650 && morphProgress > .4) morphMark.style.opacity = .12;
  if (morphProgress < .4) {
    morphMark.style.left = '50%';
    morphMark.style.transform = 'translate(-50%,-50%)';
    morphMark.style.fontSize = '55px';
  } else {
    morphMark.style.left = window.innerWidth > 650 ? '8%' : '50%';
    morphMark.style.transform = window.innerWidth > 650 ? 'translateY(-50%)' : 'translate(-50%,-50%)';
    morphMark.style.fontSize = window.innerWidth > 900 ? '125px' : '65px';
  }
}
function queueScrollEffects() {
  if (!scrollQueued) {
    scrollQueued = true;
    requestAnimationFrame(updateScrollEffects);
  }
}
window.addEventListener('scroll', queueScrollEffects, { passive: true });
window.addEventListener('resize', () => {
  if (window.innerWidth > 650) closeMenu();
  queueScrollEffects();
}, { passive: true });
queueScrollEffects();

// Metrics count once, then settle. Values are explicitly labelled illustrative.
let metricsStarted = false;
let metricsFrame = 0;
const metricNodes = $$('[data-count]');
const metrics = $('#metrics');
function settleMetrics() {
  metricNodes.forEach(node => {
    node.textContent = Number(node.dataset.count).toLocaleString('en-US', { minimumFractionDigits: Number(node.dataset.decimals || 0), maximumFractionDigits: Number(node.dataset.decimals || 0) });
  });
  metrics.style.setProperty('--metric-progress', 1);
}
function startMetrics() {
  if (metricsStarted) return;
  metricsStarted = true;
  if (reduced) { settleMetrics(); return; }
  const start = performance.now();
  function tick(now) {
    const progress = clamp((now - start) / 1800);
    const ease = 1 - Math.pow(1 - progress, 3);
    metricNodes.forEach(node => {
      const decimals = Number(node.dataset.decimals || 0);
      const value = Number(node.dataset.count) * ease;
      node.textContent = (decimals ? value : Math.round(value)).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    });
    metrics.style.setProperty('--metric-progress', ease);
    if (progress < 1 && !reduced && !document.hidden) metricsFrame = requestAnimationFrame(tick);
    else settleMetrics();
  }
  metricsFrame = requestAnimationFrame(tick);
}

// Lightweight luminous strands: three cubic curves per strand, one shared canvas.
// Precomputed colors + capped/adaptive DPR keep the effect friendly to integrated GPUs.
function createRibbon() {
  const canvas = $('#ribbon');
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return { sync() {} };
  const hero = $('.hero');
  const strandCount = 38;
  const strandColors = Array.from({ length: strandCount }, (_, i) => `rgba(${173 + i % 6 * 8},${221 + i % 4 * 9},${79 + i % 5 * 10},${.14 + (i % 7) * .033})`);
  let width = 1;
  let height = 1;
  let dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  let frame = 0;
  let inView = true;
  let running = false;
  let previous = 0;
  let averageFrame = 16;
  let slowFrames = 0;
  let pointerX = 0;
  let pointerY = 0;
  let easedX = 0;
  let easedY = 0;
  let glow;
  function sizeCanvas() {
    width = hero.clientWidth;
    height = hero.clientHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    glow = ctx.createRadialGradient(width * .55, height * .73, 0, width * .55, height * .73, width * .42);
    glow.addColorStop(0, '#b7f65013');
    glow.addColorStop(.45, '#b7f65008');
    glow.addColorStop(1, '#b7f65000');
    if (!running) draw(performance.now());
  }
  function draw(now) {
    const t = reduced ? .8 : now * .00019;
    easedX += (pointerX - easedX) * .045;
    easedY += (pointerY - easedY) * .045;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < strandCount; i++) {
      const spread = (i - strandCount * .5) * (width < 650 ? 3 : 4.1);
      const wave = Math.sin(t + i * .075) * width * .027;
      const drift = Math.cos(t * .7 + i * .06) * height * .024;
      const bendX = easedX * 27;
      const bendY = easedY * 22;
      ctx.beginPath();
      ctx.moveTo(width * .07 + spread * .9, height * 1.15);
      ctx.bezierCurveTo(width * .14 + spread, height * .85, width * .67 + spread + wave, height * 1.0 + drift, width * .63 + spread + bendX, height * .74 + bendY);
      ctx.bezierCurveTo(width * .59 + spread - wave, height * .56, width * .41 + spread + wave, height * .68, width * .56 + spread + bendX, height * .45 + drift);
      ctx.bezierCurveTo(width * .69 + spread + wave, height * .22, width * .97 + spread, height * .30, width * 1.03 + spread, -height * .05);
      ctx.strokeStyle = strandColors[i];
      ctx.lineWidth = i % 6 === 0 ? 1.5 : .65;
      ctx.stroke();
      if (i % 9 === 0) {
        ctx.globalAlpha = .14;
        ctx.lineWidth = 7;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
    ctx.globalCompositeOperation = 'source-over';
  }
  function tick(now) {
    if (!running) return;
    if (previous) {
      const delta = now - previous;
      // Ignore the first frame after tab/visibility changes and isolated stalls.
      if (delta < 100) averageFrame = averageFrame * .94 + delta * .06;
      slowFrames = averageFrame > 20 ? slowFrames + 1 : 0;
      if (slowFrames > 90 && dpr > .85) {
        dpr = Math.max(.85, dpr * .8);
        sizeCanvas();
        slowFrames = 0;
      }
    }
    previous = now;
    draw(now);
    frame = requestAnimationFrame(tick);
  }
  function sync() {
    const shouldRun = inView && !document.hidden && !reduced;
    if (shouldRun && !running) {
      running = true;
      previous = 0;
      frame = requestAnimationFrame(tick);
    } else if (!shouldRun && running) {
      running = false;
      cancelAnimationFrame(frame);
      if (reduced && inView) draw(performance.now());
    } else if (reduced && inView) draw(performance.now());
  }
  hero.addEventListener('pointermove', event => {
    if (reduced) return;
    const rect = hero.getBoundingClientRect();
    pointerX = (event.clientX - rect.left) / width - .5;
    pointerY = (event.clientY - rect.top) / height - .5;
  }, { passive: true });
  hero.addEventListener('pointerleave', () => { pointerX = 0; pointerY = 0; });
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      inView = entries[0].isIntersecting;
      sync();
    });
    observer.observe(hero);
  }
  const resizeObserver = 'ResizeObserver' in window ? new ResizeObserver(sizeCanvas) : null;
  if (resizeObserver) resizeObserver.observe(hero);
  else window.addEventListener('resize', sizeCanvas, { passive: true });
  sizeCanvas();
  sync();
  return { sync };
}
let ribbon = { sync() {} };
try { ribbon = createRibbon(); }
catch {
  // Static atmospheric CSS is always present; canvas failure cannot affect scrolling.
  $('#ribbon').hidden = true;
}
document.addEventListener('visibilitychange', () => {
  document.body.classList.toggle('paused', document.hidden);
  ribbon.sync();
  if (document.hidden) {
    cancelAnimationFrame(metricsFrame);
    if (metricsStarted) settleMetrics();
  }
});
motionQuery.addEventListener('change', () => {
  reduced = motionQuery.matches;
  document.body.classList.toggle('motion-ready', !reduced && Boolean(effectObserver));
  if (reduced) {
    cancelAnimationFrame(metricsFrame);
    settleMetrics();
    $$('.feature-card').forEach(card => {
      card.style.setProperty('--tilt-x', '0deg');
      card.style.setProperty('--tilt-y', '0deg');
    });
    $$('.magnetic').forEach(button => button.style.removeProperty('transform'));
  }
  queueScrollEffects();
  ribbon.sync();
});
