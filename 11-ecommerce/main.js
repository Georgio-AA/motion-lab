import { prefersReducedMotion } from '../shared/base.js';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
let reducedMotion = prefersReducedMotion();
motionQuery.addEventListener('change', event => { reducedMotion = event.matches; });
const money = value => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
const finishes = { clay: { name: 'Clay', hex: '#b8593b', index: '01' }, chalk: { name: 'Chalk', hex: '#d3c9b6', index: '02' }, moss: { name: 'Moss', hex: '#626955', index: '03' } };
const catalog = {
  speaker: { name: 'Onda One', description: 'Sculptural ceramic wireless speaker', price: 289 },
  dock: { name: 'The resting place', description: 'Charging dock · Clay', price: 59 },
  stand: { name: 'A place of its own', description: 'Solid oak speaker stand', price: 89 },
  sleeve: { name: 'Room to roam', description: 'Woven travel sleeve · Natural', price: 39 }
};
const variants = { single: { name: 'One speaker', price: 289, compare: 349 }, pair: { name: 'Stereo pair', price: 529, compare: 698 } };
let finish = 'clay', variant = 'single', quantity = 1;
let productScene;
let cart = [];
const storageKey = 'ora-concept-bag-v1';
const maxLineQuantity = 99;

// Validate persisted data against the catalog; never trust stored prices or markup.
function makeItem(id, color = 'clay', setup = 'single', qty = 1) {
  if (!Object.hasOwn(catalog, id)) return null;
  if (id === 'speaker' && (!Object.hasOwn(finishes, color) || !Object.hasOwn(variants, setup))) return null;
  return { key: id === 'speaker' ? `${id}-${color}-${setup}` : id, id, color: id === 'speaker' ? color : 'clay', setup: id === 'speaker' ? setup : 'single', qty: Math.max(1, Math.min(maxLineQuantity, Math.floor(qty))), price: id === 'speaker' ? variants[setup].price : catalog[id].price };
}
try {
  const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
  if (Array.isArray(saved)) {
    saved.slice(0, 20).forEach(entry => {
      if (!entry || typeof entry !== 'object' || !Number.isFinite(entry.qty) || entry.qty <= 0) return;
      const item = makeItem(entry.id, entry.color, entry.setup, entry.qty);
      if (!item) return;
      const duplicate = cart.find(line => line.key === item.key);
      if (duplicate) duplicate.qty = Math.min(maxLineQuantity, duplicate.qty + item.qty);
      else cart.push(item);
    });
  }
} catch { /* A private browser or damaged storage must not interrupt shopping. */ }

function persist() {
  try { localStorage.setItem(storageKey, JSON.stringify(cart.map(({ id, color, setup, qty }) => ({ id, color, setup, qty })))); }
  catch { /* Keep the active session usable when storage is unavailable. */ }
}
let toastTimer;
function toast(message) {
  clearTimeout(toastTimer);
  $('#toast').textContent = message;
  $('#toast').classList.add('show');
  toastTimer = setTimeout(() => $('#toast').classList.remove('show'), 4300);
}

// Native dialogs provide modal focus containment, Escape handling, and focus restoration.
let returnFocus;
let closeTimer;
function openDialog(dialog) {
  if (dialog.open) return;
  clearTimeout(closeTimer);
  $$('dialog[open]').forEach(other => other.close());
  returnFocus = document.activeElement;
  document.documentElement.style.setProperty('--scrollbar-gap', `${innerWidth - document.documentElement.clientWidth}px`);
  document.documentElement.classList.add('dialog-open');
  dialog.showModal();
  requestAnimationFrame(() => dialog.classList.add('open'));
}
function closeDialog(dialog) {
  dialog.classList.remove('open');
  if (dialog === $('#cart-dialog') && !reducedMotion) {
    closeTimer = setTimeout(() => dialog.close(), 350);
  } else dialog.close();
}
$$('dialog').forEach(dialog => {
  $$('[data-close]', dialog).forEach(button => button.addEventListener('click', () => closeDialog(dialog)));
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeDialog(dialog);
  });
  dialog.addEventListener('cancel', event => { event.preventDefault(); closeDialog(dialog); });
  dialog.addEventListener('close', () => {
    dialog.classList.remove('open');
    if (!$('dialog[open]')) document.documentElement.classList.remove('dialog-open');
    returnFocus?.focus({ preventScroll: true });
  });
});
$('#open-cart').addEventListener('click', () => openDialog($('#cart-dialog')));

function updateSelection() {
  const color = finishes[finish], setup = variants[variant];
  document.documentElement.style.setProperty('--finish', color.hex);
  $('#finish-label').textContent = color.name;
  $('#gallery-finish').textContent = `${color.name.toUpperCase()} / ${color.index}`;
  $('#product-price').textContent = money(setup.price);
  $('#compare-price').textContent = money(setup.compare);
  $('#mobile-summary').textContent = `${color.name} · ${money(setup.price)}`;
  $('#quantity').value = quantity;
  $('#quantity-minus').disabled = quantity <= 1;
  $('#quantity-plus').disabled = quantity >= 10;
  $$('.swatch').forEach(button => { const active = button.dataset.color === finish; button.classList.toggle('selected', active); button.setAttribute('aria-pressed', String(active)); });
  $$('.variant').forEach(button => { const active = button.dataset.variant === variant; button.classList.toggle('selected', active); button.setAttribute('aria-pressed', String(active)); });
  $('.static-product').style.filter = finish === 'chalk' ? 'saturate(.15) brightness(1.45)' : finish === 'moss' ? 'hue-rotate(55deg) saturate(.4)' : '';
  productScene?.setColor(color.hex);
}
$$('.swatch').forEach(button => button.addEventListener('click', () => { finish = button.dataset.color; updateSelection(); }));
$$('.variant').forEach(button => button.addEventListener('click', () => { variant = button.dataset.variant; updateSelection(); }));
$('#quantity-minus').addEventListener('click', () => { quantity = Math.max(1, quantity - 1); updateSelection(); });
$('#quantity-plus').addEventListener('click', () => { quantity = Math.min(10, quantity + 1); updateSelection(); });

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function thumbnail(item) {
  const thumb = element('div', 'cart-thumb');
  thumb.setAttribute('aria-hidden', 'true');
  if (item.id === 'speaker') {
    const image = element('img'); image.src = 'speaker.svg'; image.alt = '';
    image.style.filter = item.color === 'chalk' ? 'saturate(.15) brightness(1.45)' : item.color === 'moss' ? 'hue-rotate(55deg) saturate(.4)' : '';
    thumb.append(image);
  } else thumb.append(element('div', `small-accessory ${item.id}`));
  return thumb;
}
function renderCart(focusKey, focusAction) {
  const count = cart.reduce((total, line) => total + line.qty, 0);
  const total = cart.reduce((subtotal, line) => subtotal + line.price * line.qty, 0);
  $('#cart-count').textContent = count;
  $('#drawer-count').textContent = count;
  $('#open-cart').setAttribute('aria-label', `Open bag, ${count} ${count === 1 ? 'item' : 'items'}`);
  $('#cart-subtotal').textContent = money(total);
  $('#checkout').disabled = !cart.length;
  $('#shipping-message').textContent = total >= 350 ? 'A little extra joy. Your shipping is on us.' : total ? `You’re ${money(350 - total)} away from free shipping.` : 'Your next favorite is waiting.';
  $('#shipping-progress').style.width = `${Math.min(100, total / 350 * 100)}%`;
  $('.shipping-track').setAttribute('aria-valuenow', Math.min(total, 350));
  $('.shipping-track').setAttribute('aria-valuetext', total >= 350 ? 'Free shipping unlocked' : `${money(350 - total)} to free shipping`);
  const list = $('#cart-items'); list.replaceChildren();
  if (!cart.length) {
    const empty = element('div', 'empty-cart');
    empty.append(element('h3', '', 'Make room for a good thing.'), element('p', '', 'Your bag is empty. Find an object that feels like you.'));
    list.append(empty);
  }
  cart.forEach(item => {
    const row = element('article', 'cart-item'); row.dataset.key = item.key;
    const info = element('div', 'cart-item-info');
    info.append(element('h3', '', catalog[item.id].name), element('p', '', item.id === 'speaker' ? `${finishes[item.color].name} · ${variants[item.setup].name}` : catalog[item.id].description));
    const bottom = element('div', 'cart-item-bottom');
    const controls = element('div', 'stepper'); controls.setAttribute('aria-label', `${catalog[item.id].name} quantity`);
    const minus = element('button', '', '−'), plus = element('button', '', '+'), value = element('output', '', item.qty);
    minus.setAttribute('aria-label', `Decrease ${catalog[item.id].name} quantity`); minus.dataset.action = 'minus'; minus.disabled = item.qty <= 1;
    plus.setAttribute('aria-label', `Increase ${catalog[item.id].name} quantity`); plus.dataset.action = 'plus'; plus.disabled = item.qty >= maxLineQuantity;
    minus.addEventListener('click', () => changeQuantity(item.key, -1));
    plus.addEventListener('click', () => changeQuantity(item.key, 1));
    controls.append(minus, value, plus);
    bottom.append(controls, element('strong', '', money(item.price * item.qty)));
    const remove = element('button', 'remove-item', 'Remove'); remove.dataset.action = 'remove';
    remove.setAttribute('aria-label', `Remove ${catalog[item.id].name}, ${item.id === 'speaker' ? finishes[item.color].name : 'accessory'}, from bag`);
    remove.addEventListener('click', () => {
      const nextIndex = cart.indexOf(item);
      cart = cart.filter(line => line.key !== item.key); persist(); renderCart();
      const next = $$('.cart-item')[Math.min(nextIndex, cart.length - 1)];
      (next ? $('.remove-item', next) : $('[data-close]', $('#cart-dialog'))).focus();
      $('#cart-announcement').textContent = `${catalog[item.id].name} removed from your bag.`;
    });
    info.append(bottom, remove); row.append(thumbnail(item), info); list.append(row);
  });
  if (focusKey) {
    const row = $$('.cart-item').find(node => node.dataset.key === focusKey);
    const next = row && $(`[data-action="${focusAction}"]`, row);
    if (next && !next.disabled) next.focus();
    else if (row) $('[data-action="remove"]', row).focus();
  }
}
function changeQuantity(key, delta) {
  const line = cart.find(item => item.key === key);
  if (!line) return;
  line.qty = Math.max(1, Math.min(maxLineQuantity, line.qty + delta));
  persist(); renderCart(key, delta > 0 ? 'plus' : 'minus');
  $('#cart-announcement').textContent = `${catalog[line.id].name} quantity ${line.qty}.`;
}

// A sampled parabola gives the thumbnail a curved flight without a render-loop library.
let addInProgress = false;
async function flyToBag(button, item) {
  if (reducedMotion || !button.animate) return;
  const source = button.getBoundingClientRect(), destination = $('#open-cart').getBoundingClientRect();
  const startX = source.left + source.width / 2 - 37, startY = source.top - 60;
  const endX = destination.left + destination.width / 2 - 37, endY = destination.top - 20;
  const flyer = thumbnail(item); flyer.className = 'flying-product';
  flyer.style.left = `${startX}px`; flyer.style.top = `${startY}px`; document.body.append(flyer);
  const frames = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    frames.push({ offset: t, transform: `translate(${(endX - startX) * t}px, ${(endY - startY) * t - Math.sin(Math.PI * t) * 130}px) scale(${1 - t * .7}) rotate(${t * 12}deg)`, opacity: t < .85 ? 1 : 1 - (t - .85) / .15 });
  }
  try { await flyer.animate(frames, { duration: 720, easing: 'cubic-bezier(.25,.6,.3,1)', fill: 'forwards' }).finished; }
  catch { /* Animation cancellation does not cancel the cart update. */ }
  finally { flyer.remove(); }
}
async function addToCart(id, button) {
  if (addInProgress) return;
  addInProgress = true;
  const item = makeItem(id, finish, variant, id === 'speaker' ? quantity : 1);
  const existing = cart.find(line => line.key === item.key);
  if (existing && existing.qty >= maxLineQuantity) { toast('This item has reached the bag limit of 99.'); addInProgress = false; return; }
  const actualAdded = existing ? Math.min(item.qty, maxLineQuantity - existing.qty) : item.qty;
  if (existing) existing.qty += actualAdded; else cart.push(item);
  persist(); renderCart();
  $('#cart-announcement').textContent = `${actualAdded} ${catalog[id].name} added to your bag.`;
  try {
    await flyToBag(button, item);
    if (!reducedMotion) $('#cart-count').animate([{ transform: 'scale(1)' }, { transform: 'scale(1.6)' }, { transform: 'scale(1)' }], { duration: 420, easing: 'cubic-bezier(.2,.8,.2,1)' });
    openDialog($('#cart-dialog'));
  } finally { addInProgress = false; }
}
$('#add-to-cart').addEventListener('click', event => addToCart('speaker', event.currentTarget));
$('#mobile-add').addEventListener('click', event => addToCart('speaker', event.currentTarget));
$$('[data-add]').forEach(button => button.addEventListener('click', event => addToCart(button.dataset.add, event.currentTarget)));
$('#checkout').addEventListener('click', () => toast('Demo checkout — no payment is taken. Your bag is saved for next time.'));
renderCart(); updateSelection();

// Roving tab focus follows the WAI-ARIA automatic activation pattern.
const tabs = $$('[role="tab"]');
function activateTab(tab) {
  tabs.forEach(button => {
    const active = button === tab; button.setAttribute('aria-selected', String(active)); button.tabIndex = active ? 0 : -1;
    $(`#${button.getAttribute('aria-controls')}`).hidden = !active;
  });
}
tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => activateTab(tab));
  tab.addEventListener('keydown', event => {
    let next;
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = tabs.length - 1;
    if (next !== undefined) { event.preventDefault(); tabs[next].focus(); activateTab(tabs[next]); }
  });
});
$('.footer-bottom a').addEventListener('click', () => activateTab($('#tab-shipping')));

$('#write-review').addEventListener('click', () => openDialog($('#review-dialog')));
$('#review-form').addEventListener('submit', event => {
  event.preventDefault();
  const form = event.currentTarget;
  const name = $('#review-name'), title = $('#review-title'), body = $('#review-text');
  [name, title, body].forEach(field => {
    field.setCustomValidity(field.value.trim().length < Number(field.minLength) ? `Please enter at least ${field.minLength} non-space characters.` : '');
  });
  if (!form.reportValidity()) return;
  const score = Number($('#review-rating').value);
  const card = element('article', 'review-card preview-review');
  const stars = element('span', 'stars', '★'.repeat(score) + '☆'.repeat(5 - score)); stars.setAttribute('aria-label', `${score} out of 5 stars`);
  card.append(stars, element('h3', '', title.value.trim()), element('p', '', body.value.trim()));
  const person = element('div', 'review-person');
  const details = element('div'); details.append(element('strong', '', name.value.trim()), element('span', '', 'Your demo preview · Not published'));
  person.append(element('span', 'avatar', name.value.trim().slice(0, 2).toUpperCase()), details); card.append(person);
  $('.preview-review')?.remove(); $('.reviews-grid').append(card);
  closeDialog($('#review-dialog')); toast('Your review preview is ready. It is not saved or published.'); form.reset();
});
$$('#review-form input, #review-form textarea').forEach(field => field.addEventListener('input', () => field.setCustomValidity('')));
$('#newsletter-form').addEventListener('submit', event => {
  event.preventDefault();
  if (!event.currentTarget.reportValidity()) return;
  toast('You’re on the demo list. No email was sent or stored.'); event.currentTarget.reset();
});

function renderSearch() {
  const query = $('#search-input').value.trim().toLowerCase();
  const results = $('#search-results'); results.replaceChildren();
  const matches = Object.entries(catalog).filter(([, item]) => `${item.name} ${item.description}`.toLowerCase().includes(query));
  matches.forEach(([id, item]) => {
    const button = element('button', 'search-result', item.name);
    button.append(element('span', '', `${money(item.price)} ↗`));
    button.addEventListener('click', () => {
      closeDialog($('#search-dialog'));
      const target = id === 'speaker' ? $('#product') : $(`[data-add="${id}"]`);
      target.scrollIntoView({ behavior: reducedMotion ? 'instant' : 'smooth', block: 'center' });
      setTimeout(() => (id === 'speaker' ? $('#add-to-cart') : target).focus({ preventScroll: true }), reducedMotion ? 0 : 400);
    });
    results.append(button);
  });
  if (!matches.length) results.append(element('p', 'search-empty', 'No objects found. Try “speaker”, “dock”, “oak”, or “sleeve”.'));
}
$('#open-search').addEventListener('click', () => { renderSearch(); openDialog($('#search-dialog')); $('#search-input').focus(); });
$('#search-input').addEventListener('input', renderSearch);
const carousel = $('#product-carousel');
function scrollCarousel(direction) { carousel.scrollBy({ left: direction * ($('.related-card').getBoundingClientRect().width + 20), behavior: reducedMotion ? 'instant' : 'smooth' }); }
$('#carousel-prev').addEventListener('click', () => scrollCarousel(-1));
$('#carousel-next').addEventListener('click', () => scrollCarousel(1));
carousel.addEventListener('keydown', event => {
  if (event.target !== carousel) return;
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); scrollCarousel(event.key === 'ArrowLeft' ? -1 : 1); }
});
function updateCarouselButtons() {
  $('#carousel-prev').disabled = carousel.scrollLeft <= 3;
  $('#carousel-next').disabled = carousel.scrollLeft + carousel.clientWidth >= carousel.scrollWidth - 3;
}
carousel.addEventListener('scroll', updateCarouselButtons, { passive: true });
new ResizeObserver(updateCarouselButtons).observe(carousel);
updateCarouselButtons();
new IntersectionObserver(entries => {
  $('.mobile-buy').classList.toggle('visible', !entries[0].isIntersecting && entries[0].boundingClientRect.top < 0);
}, { threshold: 0 }).observe($('.purchase-row'));

// Keep content visible before effects initialize. Intro uses only transform and opacity.
if (!reducedMotion) {
  $('.hero-headline').animate([{ opacity: 0, transform: 'translateY(22px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 1000, easing: 'cubic-bezier(.2,.8,.2,1)' });
  $('.product-heading').animate([{ opacity: 0, transform: 'translateY(18px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 800, delay: 150, fill: 'backwards', easing: 'cubic-bezier(.2,.8,.2,1)' });
  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.animate([{ opacity: .35, transform: 'translateY(25px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 850, easing: 'cubic-bezier(.2,.8,.2,1)' });
      revealObserver.unobserve(entry.target);
    });
  }, { threshold: .15 });
  $$('.section-title, .reviews-header, .collection-header, .related-card').forEach(node => revealObserver.observe(node));
}
// Optional WebGL is isolated from all store interactions and native scrolling.
import('./scene.js').then(({ createProductExperience }) => {
  productScene = createProductExperience(finishes[finish].hex);
}).catch(() => {
  $('#rotate-hint').textContent = 'Studio product view';
  $('#hero-stage').setAttribute('aria-label', 'Onda One studio product illustration');
  $('.view-controls').hidden = true;
  $('#craft').classList.add('static-story');
  $('.craft-heading > p:last-child').textContent = 'Every detail, in one considered form.';
  $('#story-state').textContent = 'A considered object';
  $('#story-progress').style.transform = 'scaleX(1)';
  $$('.callout').forEach(label => label.classList.add('visible'));
});
