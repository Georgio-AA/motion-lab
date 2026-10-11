// Edit all owner details here. Replace the two contact placeholders before publishing.
const OWNER = {
  name: 'Georgio Abi Aad',
  roleLine: 'Software engineer · Interactive web development',
  promise: 'Websites that feel alive.',
  intro: 'I build expressive websites with thoughtful design, purposeful motion, and care in every detail.',
  upworkUrl: 'https://www.upwork.com/freelancers/~01d09e8e7c1f809bab',
  email: 'georgioabiaad@gmail.com',
  closing: 'Let’s make something worth feeling.',
  contactNote: 'Have a landing page, a product experience, or a bigger idea in mind? Let’s build it.'
};

const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
const mobileQuery = matchMedia('(max-width: 699px)');
const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
const chapters = [...document.querySelectorAll('.work-item')];
const index = document.querySelector('.progress-index');
const indexLinks = [...index.querySelectorAll('a')];
let reduced = motionQuery.matches;
const PALETTES = {
  intro: ['#d5f591', '#78cfac', '#101411'],
  '10': ['#e8a54b', '#c4532d', '#1b120c'],
  '02': ['#c7fc78', '#3f8f3a', '#0a0f0a'],
  '08': ['#3b6ff5', '#a9c8ff', '#0a1022'],
  '07': ['#e9cf8f', '#8fb08a', '#14130f'],
  '09': ['#c6ff63', '#6fe3b0', '#070906'],
  '11': ['#c8643f', '#d8c9ae', '#15110f'],
  '04': ['#4fd6c2', '#8ef0ff', '#06201f'],
  '05': ['#3fa36b', '#b8f0cf', '#0b1a12'],
  '03': ['#e3b679', '#f1e3cc', '#141414'],
  '01': ['#f0a6c0', '#7a3d6b', '#160c14'],
  '06': ['#ff4fb3', '#5be7ff', '#07060b']
};
const chapterIndices = new Map(chapters.map((chapter, i) => [chapter, i]));
const chapterTops = new Float64Array(chapters.length);
const chapterBottoms = new Float64Array(chapters.length);
const chapterCenters = new Float64Array(chapters.length);
const portalCenters = new Float64Array(chapters.length);
const portalMax = new Float32Array(chapters.length);
const portalScales = new Float32Array(chapters.length);
const portalEnergies = new Float32Array(chapters.length);
portalScales.fill(.86);
const visuals = chapters.map(chapter => chapter.querySelector('.work-visual'));
let world = null, paletteKey = 'intro', workTop = 0, workBottom = 0;
let lastScrollY = scrollY, lastScrollTime = performance.now();
function applyPalette(key) {
  if (key === paletteKey) return;
  paletteKey = key;
  const palette = PALETTES[key];
  document.body.style.setProperty('--world-a', palette[0]);
  document.body.style.setProperty('--world-b', palette[1]);
  document.body.style.setProperty('--world-deep', palette[2]);
  document.querySelector('meta[name="theme-color"]').content = palette[2];
  world?.setPalette(palette);
}
function updatePortal(i, scale, energy) {
  if (Math.abs(portalScales[i] - scale) > .0001) {
    portalScales[i] = scale;
    visuals[i].style.setProperty('--portal-scale', scale.toFixed(4));
  }
  if (Math.abs(portalEnergies[i] - energy) > .0001) {
    portalEnergies[i] = energy;
    visuals[i].style.setProperty('--portal-energy', energy.toFixed(3));
  }
}

// Config fills every personal label; fallback HTML stays usable without JavaScript.
const nameParts = OWNER.name.trim().split(/\s+/);
const initials = nameParts[0][0] + (nameParts.length > 1 ? nameParts[nameParts.length - 1][0] : '');
document.querySelectorAll('[data-owner]').forEach(element => {
  element.textContent = element.dataset.owner === 'initials' ? initials + '.' : OWNER[element.dataset.owner];
});
document.title = OWNER.name + ' — Interactive Web Developer';
document.querySelector('meta[name="description"]').content =
  OWNER.name + ', ' + OWNER.roleLine.toLowerCase() + '. ' + OWNER.promise + ' Explore eleven interactive concept demos.';
document.querySelectorAll('[data-upwork]').forEach(link => { link.href = OWNER.upworkUrl; link.target = '_blank'; link.rel = 'noopener'; });
document.querySelectorAll('[data-email]').forEach(link => {
  link.href = 'mailto:' + OWNER.email + '?subject=' + encodeURIComponent('Project inquiry from your portfolio');
  link.setAttribute('aria-label', 'Email ' + OWNER.name + ' at ' + OWNER.email);
});
const nameHeading = document.querySelector('#hero-title');
nameHeading.replaceChildren();
[nameParts[0], nameParts.slice(1).join(' ')].filter(Boolean).forEach((line, i) => {
  if (i) nameHeading.append(document.createTextNode(' '));
  const mask = document.createElement('span');
  mask.className = 'name-line';
  const text = document.createElement('span');
  text.textContent = line;
  mask.append(text);
  nameHeading.append(mask);
});

// Words retain their spaces, so both textContent and assistive reading are natural.
document.querySelectorAll('[data-split]').forEach(heading => {
  const words = heading.textContent.trim().split(/\s+/);
  heading.replaceChildren();
  words.forEach((word, i) => {
    if (i) heading.append(document.createTextNode(' '));
    const mask = document.createElement('span');
    mask.className = 'split-word';
    mask.style.setProperty('--word-index', i);
    const text = document.createElement('span');
    text.textContent = word;
    mask.append(text);
    heading.append(mask);
  });
});

if ('IntersectionObserver' in window) {
  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -5% 0px', threshold: 0 });
  document.querySelectorAll('.work-item, .reveal-section').forEach(section => {
    section.classList.add('reveal-ready');
    revealObserver.observe(section);
  });
}
motionQuery.addEventListener('change', event => {
  reduced = event.matches;
  if (reduced) document.querySelectorAll('.reveal-ready').forEach(section => section.classList.add('is-visible'));
  scheduleScrollUpdate();
});

// Load only near the viewport. Evict before mounting, never exceeding two iframes.
const nearby = new Set();
const livePreviews = new Map();
function removePreview(chapter) {
  const iframe = livePreviews.get(chapter);
  if (!iframe) return;
  iframe.remove();
  livePreviews.delete(chapter);
  chapter.querySelector('[data-preview]').classList.remove('is-loaded');
}
function mountPreview(chapter) {
  if (!chapter || livePreviews.has(chapter)) return;
  const viewport = chapter.querySelector('[data-preview]');
  viewport.style.setProperty('--preview-scale', viewport.clientWidth / 1440);
  const iframe = document.createElement('iframe');
  iframe.title = chapter.querySelector('h2').textContent + ' — live concept preview';
  iframe.tabIndex = -1;
  iframe.inert = true;
  iframe.setAttribute('aria-hidden', 'true');
  iframe.setAttribute('scrolling', 'no');
  iframe.loading = 'eager'; // IntersectionObserver already owns the lazy-loading policy.
  iframe.addEventListener('load', () => {
    if (livePreviews.get(chapter) === iframe) viewport.classList.add('is-loaded');
  }, { once: true });
  livePreviews.set(chapter, iframe);
  iframe.src = chapter.querySelector('.device-frame').href;
  viewport.append(iframe);
}
function syncPreviews() {
  if (mobileQuery.matches || document.hidden) {
    for (const chapter of livePreviews.keys()) removePreview(chapter);
    return;
  }
  let first = null, second = null, firstDistance = Infinity, secondDistance = Infinity;
  for (const chapter of nearby) {
    const distance = Math.abs(chapterCenters[chapterIndices.get(chapter)] - scrollY - innerHeight * .5);
    if (distance < firstDistance) {
      second = first; secondDistance = firstDistance;
      first = chapter; firstDistance = distance;
    } else if (distance < secondDistance) {
      second = chapter; secondDistance = distance;
    }
  }
  for (const chapter of livePreviews.keys()) {
    if (chapter !== first && chapter !== second) removePreview(chapter);
  }
  mountPreview(first);
  mountPreview(second);
}
if ('IntersectionObserver' in window) {
  const previewObserver = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.isIntersecting) nearby.add(entry.target);
      else nearby.delete(entry.target);
    }
    syncPreviews();
  }, { rootMargin: '280px 0px', threshold: 0 });
  chapters.forEach(chapter => previewObserver.observe(chapter));
}
if ('ResizeObserver' in window) {
  const previewResize = new ResizeObserver(entries => {
    for (const entry of entries) entry.target.style.setProperty('--preview-scale', entry.contentRect.width / 1440);
  });
  document.querySelectorAll('[data-preview]').forEach(viewport => previewResize.observe(viewport));
}
mobileQuery.addEventListener('change', () => { syncPreviews(); scheduleScrollUpdate(); });
document.addEventListener('visibilitychange', syncPreviews);
window.addEventListener('pagehide', () => {
  for (const chapter of livePreviews.keys()) removePreview(chapter);
});
window.addEventListener('pageshow', syncPreviews);

// Passive scroll bookkeeping, at most once per animation frame. Scrolling is never intercepted.
let scrollFrame = 0, activeChapter = -1;
const work = document.querySelector('#work');
// Measure only on layout changes; scroll frames reuse numeric bounds and scale transforms.
function measureChapters() {
  const y = scrollY;
  const workRect = work.getBoundingClientRect();
  workTop = workRect.top + y; workBottom = workRect.bottom + y;
  for (let i = 0; i < chapters.length; i++) {
    const rect = chapters[i].getBoundingClientRect();
    const portal = visuals[i].getBoundingClientRect();
    chapterTops[i] = rect.top + y;
    chapterBottoms[i] = rect.bottom + y;
    chapterCenters[i] = rect.top + y + rect.height * .5;
    portalCenters[i] = portal.top + y + portal.height * .5;
    portalMax[i] = innerWidth * .9 / visuals[i].offsetWidth;
  }
  scheduleScrollUpdate();
}
function updateProgress() {
  scrollFrame = 0;
  const y = scrollY, center = y + innerHeight * .5, now = performance.now();
  const velocity = (y - lastScrollY) / Math.max(16, now - lastScrollTime) * 1000;
  lastScrollY = y; lastScrollTime = now;
  world?.setScrollVelocity(velocity);
  index.classList.toggle('is-active', workTop - y < innerHeight * .7 && workBottom - y > innerHeight * .3);
  let nearest = 0, distance = Infinity;
  for (let i = 0; i < chapters.length; i++) {
    const d = Math.abs(chapterCenters[i] - center);
    if (d < distance) { nearest = i; distance = d; }
    if (reduced || mobileQuery.matches) {
      updatePortal(i, 1, 0);
      continue;
    }
    const proximity = Math.max(0, 1 - Math.abs(portalCenters[i] - center) / (innerHeight * .85));
    const eased = proximity * proximity * (3 - 2 * proximity);
    const scale = .86 + (portalMax[i] - .86) * eased;
    updatePortal(i, scale, eased);
  }
  applyPalette(center >= chapterTops[0] && center <= chapterBottoms[chapters.length - 1]
    ? chapters[nearest].dataset.demo : 'intro');
  if (nearest !== activeChapter) {
    activeChapter = nearest;
    indexLinks.forEach((link, i) => {
      if (i === nearest) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }
  syncPreviews();
}
function scheduleScrollUpdate() {
  if (!scrollFrame) scrollFrame = requestAnimationFrame(updateProgress);
}
window.addEventListener('scroll', scheduleScrollUpdate, { passive: true });
window.addEventListener('resize', measureChapters, { passive: true });
if ('ResizeObserver' in window) new ResizeObserver(measureChapters).observe(work);
window.addEventListener('pageshow', measureChapters);
document.fonts?.ready.then(measureChapters);
measureChapters();

// Micro-interactions affect the content of targets, keeping the hit areas stable.
document.querySelectorAll('.magnetic').forEach(button => {
  button.addEventListener('pointermove', event => {
    if (reduced || !finePointer.matches || event.pointerType !== 'mouse') return;
    const rect = button.getBoundingClientRect();
    button.style.setProperty('--mx', ((event.clientX - rect.left - rect.width / 2) * .10) + 'px');
    button.style.setProperty('--my', ((event.clientY - rect.top - rect.height / 2) * .16) + 'px');
  });
  button.addEventListener('pointerleave', () => {
    button.style.setProperty('--mx', '0px');
    button.style.setProperty('--my', '0px');
  });
});
document.querySelectorAll('.device-frame').forEach(frame => {
  frame.addEventListener('pointermove', event => {
    if (reduced || !finePointer.matches || event.pointerType !== 'mouse') return;
    const rect = frame.getBoundingClientRect();
    frame.style.setProperty('--rx', (-(event.clientY - rect.top - rect.height / 2) / rect.height * 3) + 'deg');
    frame.style.setProperty('--ry', ((event.clientX - rect.left - rect.width / 2) / rect.width * 3) + 'deg');
  });
  frame.addEventListener('pointerleave', () => {
    frame.style.setProperty('--rx', '0deg');
    frame.style.setProperty('--ry', '0deg');
  });
});

// Motion can be paused explicitly, and the marquee sleeps when off screen.
const stack = document.querySelector('.stack');
const marqueeToggle = document.querySelector('.marquee-toggle');
marqueeToggle.addEventListener('click', () => {
  const paused = stack.classList.toggle('is-paused');
  marqueeToggle.setAttribute('aria-pressed', String(paused));
  marqueeToggle.setAttribute('aria-label', (paused ? 'Resume' : 'Pause') + ' skills animation');
  marqueeToggle.firstElementChild.textContent = paused ? '▶' : 'Ⅱ';
});
if ('IntersectionObserver' in window) {
  new IntersectionObserver(entries => {
    stack.classList.toggle('is-offscreen', !entries[0].isIntersecting);
  }).observe(stack);
}

// Visual setup is isolated: a failed effect cannot stop links, previews, or native scroll.
import('./hub-hero.js').then(({ initHero }) => {
  world = initHero(document.querySelector('.world-atmosphere'));
  world?.setPalette(PALETTES[paletteKey], true);
}).catch(() => { document.querySelector('.world-atmosphere').classList.remove('canvas-ready'); });
