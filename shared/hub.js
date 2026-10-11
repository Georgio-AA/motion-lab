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

// Config fills every personal label; fallback HTML stays usable without JavaScript.
const nameParts = OWNER.name.trim().split(/\s+/);
const initials = nameParts[0][0] + (nameParts.length > 1 ? nameParts[nameParts.length - 1][0] : '');
document.querySelectorAll('[data-owner]').forEach(element => {
  element.textContent = element.dataset.owner === 'initials' ? initials + '.' : OWNER[element.dataset.owner];
});
document.title = OWNER.name + ' — Interactive Web Development';
document.querySelector('meta[name="description"]').content =
  OWNER.name + ', ' + OWNER.roleLine.toLowerCase() + '. ' + OWNER.promise + ' Explore ten interactive concept demos.';
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
    const rect = chapter.getBoundingClientRect();
    const distance = Math.abs(rect.top + rect.height * .5 - innerHeight * .5);
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
function updateProgress() {
  scrollFrame = 0;
  const workRect = work.getBoundingClientRect();
  index.classList.toggle('is-active', workRect.top < innerHeight * .7 && workRect.bottom > innerHeight * .3);
  let nearest = 0, distance = Infinity;
  for (let i = 0; i < chapters.length; i++) {
    const rect = chapters[i].getBoundingClientRect();
    const d = Math.abs(rect.top + rect.height * .5 - innerHeight * .5);
    if (d < distance) { nearest = i; distance = d; }
  }
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
window.addEventListener('resize', scheduleScrollUpdate, { passive: true });
scheduleScrollUpdate();

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
import('./hub-hero.js').then(({ initHero }) => initHero(document.querySelector('.hero')))
  .catch(() => { document.querySelector('.hero').classList.remove('canvas-ready'); });
