import { prefersReducedMotion } from '../shared/base.js';

const reduced = prefersReducedMotion();
const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
document.body.classList.toggle('reduced-motion', reduced);
const copy = [...document.querySelectorAll('.stage')];
const controls = [...document.querySelectorAll('.stage-controls button')];
const hero = document.querySelector('.hero');
const track = document.querySelector('.story-track');
const journey = document.querySelector('.journey');
const viewport = document.querySelector('.journey-viewport');
const progressBar = document.querySelector('.story-progress span');
const numeral = document.querySelector('.stage-numeral');
const clamp = value => Math.max(0, Math.min(1, value));
const stops = [0, .25, .5, .75, 1];
const state = { progress: 0, room: 0 };
const pointer = { x: 0, y: 0, easedX: 0, easedY: 0 };
const visible = { bloom: true, room: false };
const renderers = {};
let bloom, room, activeStage = -1, scrollDirty = true, resizeDirty = false;
let geometry = { heroStart: 0, heroLength: 1, roomStart: 0, roomLength: 1 };

// No wheel/touch/key interception: CSS sticky supplies the pin, native scroll owns input.
// Boot the frame loop before any optional setup or CDN import can fail or stall.
function tick(time) {
  requestAnimationFrame(tick);
  if (document.hidden) return;
  if (resizeDirty) { resizeDirty = false; measure(); resizeScene('bloom'); resizeScene('room'); }
  if (scrollDirty) { scrollDirty = false; readScroll(); }
  pointer.easedX += (pointer.x - pointer.easedX) * .045;
  pointer.easedY += (pointer.y - pointer.easedY) * .045;
  drawScene('bloom', state.progress, time);
  drawScene('room', state.room, time);
  updateCursor();
}
requestAnimationFrame(tick);

function safely(setup) { try { setup(); } catch { /* Optional polish never disables native scroll. */ } }
function measure() {
  const top = document.querySelector('.brand-nav').offsetHeight;
  geometry = {
    heroStart: track.getBoundingClientRect().top + scrollY - top,
    heroLength: Math.max(1, track.offsetHeight - hero.offsetHeight),
    roomStart: journey.getBoundingClientRect().top + scrollY - top,
    roomLength: Math.max(1, journey.offsetHeight - viewport.offsetHeight)
  };
  scrollDirty = true;
}
function readScroll() {
  state.progress = clamp((scrollY - geometry.heroStart) / geometry.heroLength);
  state.room = clamp((scrollY - geometry.roomStart) / geometry.roomLength);
  setCopy(state.progress);
  // These bounds also work if IntersectionObserver is unavailable.
  visible.bloom = !reduced && scrollY < geometry.heroStart + track.offsetHeight && scrollY + innerHeight > geometry.heroStart;
  visible.room = scrollY + innerHeight > geometry.roomStart && scrollY < geometry.roomStart + journey.offsetHeight;
  journey.style.setProperty('--journey-progress', state.room);
}
function dropScene(key) {
  const item = key === 'bloom' ? bloom : room;
  safely(() => (item?.renderer || renderers[key])?.dispose());
  delete renderers[key];
  document.querySelectorAll(key === 'bloom' ? '#bloom-scene canvas' : '#room-scene canvas').forEach(canvas => canvas.remove());
  document.body.classList.remove(key === 'bloom' ? 'webgl-ready' : 'room-ready');
  if (key === 'bloom') bloom = null; else room = null;
}
function resizeScene(key) {
  try {
    const item = key === 'bloom' ? bloom : room;
    if (item) { item.resize(); item.needsFrame = true; }
  } catch { dropScene(key); }
}
function drawScene(key, progress, time) {
  const item = key === 'bloom' ? bloom : room;
  if (!item || !visible[key]) return;
  // Reduced motion renders only on resize/scroll, with no ambient drift.
  if (reduced && item.lastProgress === progress && !item.needsFrame) return;
  try {
    item.pose(progress, reduced ? 0 : time / 1000, innerWidth < 700);
    const started = performance.now();
    item.renderer.render(item.scene, item.camera);
    // Reduce only pixel density after sustained expensive draws; preserve the scene.
    item.slowDraws = performance.now() - started > 20 ? (item.slowDraws || 0) + 1 : 0;
    if (item.slowDraws > 45 && item.renderer.getPixelRatio() > 1) {
      item.renderer.setPixelRatio(Math.max(1, item.renderer.getPixelRatio() - .25));
      item.slowDraws = 0; item.resize();
    }
    item.lastProgress = progress; item.needsFrame = false;
  } catch { dropScene(key); }
}

// Each existing line keeps its spaces; words rise through individual masks.
function splitHeadings() {
  copy.forEach(article => {
    const heading = article.querySelector('h1, h2');
    let index = 0;
    function split(parent) {
      [...parent.childNodes].forEach(node => {
        if (node.nodeType === Node.TEXT_NODE) {
          const fragment = document.createDocumentFragment();
          node.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) { fragment.append(document.createTextNode(part)); return; }
            const mask = document.createElement('span'); mask.className = 'word-mask';
            const word = document.createElement('span'); word.className = 'word'; word.textContent = part;
            word.style.setProperty('--word-delay', `${index++ * 38}ms`); mask.append(word); fragment.append(mask);
          });
          node.replaceWith(fragment);
        } else if (node.nodeType === Node.ELEMENT_NODE && node.tagName !== 'BR') split(node);
      });
    }
    split(heading);
  });
}
function setCopy(progress) {
  const next = Math.min(4, Math.floor(progress * 4 + .5));
  if (next !== activeStage) {
    activeStage = next;
    copy.forEach((article, i) => {
      article.classList.toggle('active', i === next);
      article.setAttribute('aria-hidden', String(i !== next));
      article.inert = i !== next;
    });
    controls.forEach((button, i) => {
      button.classList.toggle('selected', i === next);
      button.setAttribute('aria-pressed', String(i === next));
    });
    numeral.textContent = `0${next + 1}`;
  }
  progressBar.style.transform = `scaleX(${progress})`;
}

// Time-based intro has its own CSS fail-safe and never locks or captures scrolling.
function intro() {
  const overlay = document.querySelector('.intro');
  if (reduced || scrollY > 40 || location.hash) { overlay.remove(); document.body.classList.add('intro-done'); return; }
  document.body.classList.add('intro-running');
  const start = performance.now(), counter = overlay.querySelector('.intro-counter');
  const end = () => { document.body.classList.add('intro-done'); document.body.classList.remove('intro-running'); };
  setTimeout(end, 2050);
  setTimeout(() => overlay.remove(), 2900);
  function count(now) {
    const p = clamp((now - start) / 1450);
    counter.textContent = String(Math.round(p * 100)).padStart(3, '0');
    if (p < 1 && !document.body.classList.contains('intro-done')) requestAnimationFrame(count);
    else end();
  }
  requestAnimationFrame(count);
  // A visitor who scrolls, tabs or follows an anchor can bypass the curtain instantly.
  window.addEventListener('scroll', end, { once: true, passive: true });
  window.addEventListener('keydown', end, { once: true });
}

const products = [
  ['Bloom Crème', 'The beginning of a softer morning. A silken cream in rose-tinted glass; smooth a little over clean skin and take a moment to pause.', '$48 · 50 ml'],
  ['Dew Essence', 'A light first layer for the daily ritual. Pat gently into clean skin before your cream, and let the morning arrive at its own pace.', '$36 · 100 ml'],
  ['Still Balm', 'An evening ritual for slowing down. Warm a little between your hands, then gently massage over the skin as the day draws to a close.', '$42 · 30 ml'],
  ['First Light', 'A luminous little morning moment. A few drops, a gentle touch, and a little space for yourself before the day begins.', '$54 · 30 ml']
];
function productDetails() {
  const dialog = document.querySelector('#product-dialog');
  document.querySelectorAll('.product-open').forEach(button => button.addEventListener('click', () => {
    const [name, description, price] = products[Number(button.dataset.product)];
    dialog.querySelector('h2').textContent = name;
    dialog.querySelector('.dialog-description').textContent = description;
    dialog.querySelector('.dialog-price').textContent = price;
    dialog.showModal();
  }));
  dialog.querySelectorAll('.dialog-close, .dialog-done').forEach(button => button.addEventListener('click', () => dialog.close()));
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const r = dialog.getBoundingClientRect();
    if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close();
  });
}

function staticStory() {
  const container = document.querySelector('#static-story');
  container.hidden = false;
  copy.forEach((article, i) => {
    const frame = document.createElement('article');
    const text = article.cloneNode(true);
    text.removeAttribute('class'); text.removeAttribute('aria-hidden'); text.removeAttribute('inert');
    const h1 = text.querySelector('h1');
    if (h1) { const h2 = document.createElement('h2'); h2.innerHTML = h1.innerHTML; h1.replaceWith(h2); }
    const illustration = document.createElement('div'); illustration.className = 'still-fallback';
    illustration.innerHTML = document.querySelector('.scene-fallback').outerHTML;
    illustration.setAttribute('role', 'img'); illustration.setAttribute('aria-label', 'Pink botanical bloom and skincare jar');
    illustration.style.setProperty('--bloom-open', i / 4);
    frame.append(text, illustration); container.append(frame);
  });
}

// CSS jars give every card live depth without four extra WebGL contexts.
function cardInteractions() {
  document.querySelectorAll('.product').forEach((card, index) => {
    card.style.setProperty('--reveal-delay', `${index * 110}ms`);
    const art = card.querySelector('.product-art');
    const jar = art.querySelector('.svg-jar, .svg-bottle');
    const shine = document.createElement('i'); shine.className = 'card-glare'; shine.setAttribute('aria-hidden', 'true'); art.append(shine);
    const top = document.createElement('i'); top.className = 'jar-top'; top.setAttribute('aria-hidden', 'true'); jar.prepend(top);
    const base = document.createElement('i'); base.className = 'jar-base'; base.setAttribute('aria-hidden', 'true'); jar.append(base);
    card.addEventListener('pointermove', event => {
      if (reduced || !finePointer.matches || event.pointerType === 'touch') return;
      const bounds = art.getBoundingClientRect();
      const x = clamp((event.clientX - bounds.left) / bounds.width), y = clamp((event.clientY - bounds.top) / bounds.height);
      art.style.setProperty('--rx', `${(y - .5) * -9}deg`);
      art.style.setProperty('--ry', `${(x - .5) * 12}deg`);
      art.style.setProperty('--jar-rx', `${(y - .5) * -20}deg`);
      art.style.setProperty('--jar-ry', `${(x - .5) * 34}deg`);
      art.style.setProperty('--gx', `${x * 100}%`); art.style.setProperty('--gy', `${y * 100}%`);
    });
    card.addEventListener('pointerleave', () => {
      ['--rx', '--ry', '--jar-rx', '--jar-ry'].forEach(prop => art.style.setProperty(prop, '0deg'));
    });
  });
}
function magneticButtons() {
  document.querySelectorAll('.pill, .nav-cta').forEach(button => {
    button.addEventListener('pointermove', event => {
      if (reduced || !finePointer.matches || event.pointerType === 'touch') return;
      const bounds = button.getBoundingClientRect();
      button.style.translate = `${(event.clientX - bounds.left - bounds.width / 2) * .15}px ${(event.clientY - bounds.top - bounds.height / 2) * .2}px`;
    });
    button.addEventListener('pointerleave', () => { button.style.translate = '0px 0px'; });
    button.addEventListener('blur', () => { button.style.translate = '0px 0px'; });
  });
}
const cursor = { x: -100, y: -100, ringX: -100, ringY: -100, active: false };
function customCursor() {
  if (reduced || !finePointer.matches) return;
  window.addEventListener('pointermove', event => {
    if (event.pointerType === 'touch') { cursor.active = false; document.body.classList.remove('cursor-visible'); return; }
    cursor.x = event.clientX; cursor.y = event.clientY; cursor.active = true;
    document.body.classList.add('cursor-visible');
    document.body.classList.toggle('cursor-hover', !!event.target.closest('a, button, .product-art'));
    const r = hero.getBoundingClientRect();
    pointer.x = clamp((event.clientX - r.left) / r.width) * 2 - 1;
    pointer.y = clamp((event.clientY - r.top) / r.height) * 2 - 1;
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => { cursor.active = false; document.body.classList.remove('cursor-visible'); pointer.x = pointer.y = 0; });
  window.addEventListener('blur', () => { cursor.active = false; document.body.classList.remove('cursor-visible'); });
}
const dot = document.querySelector('.cursor-dot'), ring = document.querySelector('.cursor-ring');
function updateCursor() {
  if (!cursor.active) return;
  cursor.ringX += (cursor.x - cursor.ringX) * .18; cursor.ringY += (cursor.y - cursor.ringY) * .18;
  dot.style.transform = `translate3d(${cursor.x}px,${cursor.y}px,0)`;
  ring.style.transform = `translate3d(${cursor.ringX}px,${cursor.ringY}px,0)`;
}
function entranceObserver() {
  const targets = document.querySelectorAll('.product, .section-heading, .closing');
  if (reduced || !('IntersectionObserver' in window)) return;
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) { entry.target.classList.add('in-view'); observer.unobserve(entry.target); }
  }), { threshold: .12 });
  targets.forEach(target => observer.observe(target));
  document.body.classList.add('reveal-ready');
}

// Independent scene setup and context loss recovery: either scene can fail alone.
async function initializeScenes() {
  let T, RoomEnvironment;
  try { [T, { RoomEnvironment }] = await Promise.all([import('three'), import('three/addons/environments/RoomEnvironment.js')]); }
  catch { return; }
  if (!reduced) {
    try { bloom = makeBloom(T, RoomEnvironment); watchContext('bloom', bloom); }
    catch { dropScene('bloom'); }
  }
  try { room = makeRoom(T); watchContext('room', room); }
  catch { dropScene('room'); }
  resizeDirty = true;
}
function watchContext(key, item) {
  item.renderer.domElement.addEventListener('webglcontextlost', () => dropScene(key), { once: true });
}

safely(splitHeadings);
safely(() => { if (reduced) staticStory(); });
safely(measure); safely(() => readScroll()); safely(intro);
safely(productDetails); safely(cardInteractions); safely(magneticButtons); safely(customCursor); safely(entranceObserver);
window.addEventListener('scroll', () => { scrollDirty = true; }, { passive: true });
window.addEventListener('resize', () => { resizeDirty = true; }, { passive: true });
window.addEventListener('pageshow', () => { resizeDirty = true; }, { passive: true });
document.addEventListener('visibilitychange', () => { scrollDirty = true; });
document.fonts?.ready.then(() => { resizeDirty = true; }).catch(() => {});
controls.forEach((button, i) => button.addEventListener('click', () => {
  window.scrollTo({ top: geometry.heroStart + stops[i] * geometry.heroLength, behavior: reduced ? 'instant' : 'smooth' });
}));
initializeScenes().catch(() => { dropScene('bloom'); dropScene('room'); });

function makeBloom(T, RoomEnvironment) {
  const host = document.querySelector('#bloom-scene');
  const renderer = new T.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: reduced });
  renderers.bloom = renderer;
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setClearColor(0xfaf3ee, 0); renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
  host.append(renderer.domElement);
  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(36, 1, .1, 60);
  const pmrem = new T.PMREMGenerator(renderer);
  const envRoom = new RoomEnvironment();
  const environment = pmrem.fromScene(envRoom, .04);
  scene.environment = environment.texture; envRoom.dispose(); pmrem.dispose();
  scene.add(new T.HemisphereLight(0xfffaf7, 0xaf708d, 1.1));
  const key = new T.DirectionalLight(0xffeee6, 2.5); key.position.set(-3, 6, 5); scene.add(key);
  const rim = new T.DirectionalLight(0xffd8e8, 2.5); rim.position.set(3, 3, -3); scene.add(rim);
  const fill = new T.DirectionalLight(0xfff4e3, .7); fill.position.set(-4, 1, -1); scene.add(fill);
  const root = new T.Group(); scene.add(root);
  const flower = new T.Group(); root.add(flower);
  const petals = [];
  // Overlapping spherical cups morph into broad petals; neither shape has a pointed lip.
  function petalGeometry(length, width, phase, layer, rootRadius) {
    const geometry = new T.BufferGeometry(); const positions = [], unfolded = [], indices = [], colors = [];
    const rows = 48, columns = 32;
    const base = new T.Color('#a83f6c'), tip = new T.Color('#f8c4d7');
    for (let row = 0; row <= rows; row++) {
      const v = row / rows;
      for (let column = 0; column <= columns; column++) {
        const u = column / columns * 2 - 1;
        const curl = Math.pow(v, 6);
        const cap = .24 * u * u * curl;
        const radius = .22 - layer * .016 + (1.04 - layer * .035) * Math.pow(Math.sin(Math.PI * v), .72);
        const angle = u * (.24 + .34 * Math.sin(Math.PI * v * .78));
        // Broad overlapping arcs close inward at the crown, instead of fanning into spikes.
        positions.push(Math.sin(angle) * radius, v * length - cap,
          Math.cos(angle) * radius - rootRadius);
        const breadth = width * (.14 + .86 * Math.pow(Math.sin(Math.PI * v * .86), .75));
        unfolded.push(u * breadth, v * length - cap - curl * .08,
          .18 + .43 * v * v + .32 * u * u * Math.sin(Math.PI * v) - .22 * Math.sin(Math.PI * v) + curl * .2);
        const color = base.clone().lerp(tip, Math.min(1, Math.pow(v, .85) * .88 + Math.abs(u) * .12));
        // Subtle branching veins are baked into vertex colors; no texture fetches.
        const vein = Math.pow(Math.max(0, Math.cos(u * 29 + v * 5 + phase)), 12) * .035;
        color.multiplyScalar(1 + vein - Math.sin(v * 13 + u * 4) * .025);
        colors.push(color.r, color.g, color.b);
      }
    }
    for (let row = 0; row < rows; row++) for (let col = 0; col < columns; col++) {
      const a = row * (columns + 1) + col, b = a + columns + 1;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
    geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new T.Float32BufferAttribute(colors, 3)); geometry.setIndex(indices); geometry.computeVertexNormals();
    const openGeometry = new T.BufferGeometry();
    openGeometry.setAttribute('position', new T.Float32BufferAttribute(unfolded, 3)); openGeometry.setIndex(indices); openGeometry.computeVertexNormals();
    geometry.morphAttributes.position = [openGeometry.attributes.position];
    geometry.morphAttributes.normal = [openGeometry.attributes.normal];
    openGeometry.dispose();
    return geometry;
  }
  const petalMaterial = new T.MeshPhysicalMaterial({ vertexColors: true, flatShading: false, roughness: .82, metalness: 0, side: T.DoubleSide, sheen: .16, sheenColor: new T.Color('#e5adc5'), sheenRoughness: .9, transmission: 0, transparent: false, opacity: 1, depthWrite: true, thickness: .12, envMapIntensity: .2 });
  for (let layer = 0; layer < 6; layer++) {
    const count = 15 - layer;
    const rootRadius = .18 + (5 - layer) * .075;
    const geometry = petalGeometry(2.5 - layer * .18, .72 - layer * .055, layer * 1.8, layer, rootRadius);
    for (let i = 0; i < count; i++) {
      const pivot = new T.Group(); pivot.rotation.y = i / count * Math.PI * 2 + layer * .34;
      pivot.position.set(Math.sin(pivot.rotation.y) * rootRadius, -.4 + layer * .07, Math.cos(pivot.rotation.y) * rootRadius);
      const hinge = new T.Group(); pivot.add(hinge);
      const mesh = new T.Mesh(geometry, petalMaterial); hinge.add(mesh); flower.add(pivot);
      petals.push({ mesh, hinge, layer, variation: Math.sin(i * 4.7 + layer) * .06 });
    }
  }
  const calyx = new T.Mesh(new T.SphereGeometry(.6, 32, 16), new T.MeshStandardMaterial({ color: '#b87b8d', roughness: .8 }));
  calyx.position.y = -.37; calyx.scale.y = .32; flower.add(calyx);
  // An opaque inner cup seals tiny seams while closed, then withdraws inside the opening flower.
  const budCore = new T.Mesh(new T.SphereGeometry(1, 64, 48), new T.MeshStandardMaterial({ color:'#e4a6bd', roughness:.9, metalness:0, flatShading:false }));
  budCore.position.y = .68; flower.add(budCore);
  const product = new T.Group(); root.add(product);
  const glass = new T.MeshPhysicalMaterial({ color: '#f3adc5', metalness: .05, roughness: .12, transmission: .72, thickness: .25, ior: 1.46, clearcoat: 1, clearcoatRoughness: .14, envMapIntensity: 1.2 });
  const profile = [[0, -.62], [.6, -.62], [.78, -.55], [.82, -.42], [.82, .42], [.77, .5], [.71, .5], [.71, -.32], [.58, -.4], [0, -.4]].map(p => new T.Vector2(...p));
  const jar = new T.Mesh(new T.LatheGeometry(profile, 96), glass); product.add(jar);
  const rimMesh = new T.Mesh(new T.TorusGeometry(.747, .04, 12, 80), glass); rimMesh.rotation.x = Math.PI / 2; rimMesh.position.y = .49; product.add(rimMesh);
  const creamMaterial = new T.MeshStandardMaterial({ color: '#fff9e9', roughness: .37 });
  const cream = new T.Mesh(new T.CylinderGeometry(.7, .7, .22, 64), creamMaterial); cream.position.y = .29; product.add(cream);
  class CreamSpiral extends T.Curve {
    getPoint(t, target = new T.Vector3()) {
      const angle = t * Math.PI * 5.5, radius = .58 * (1 - t);
      return target.set(Math.cos(angle) * radius, .44 + t * .16, Math.sin(angle) * radius);
    }
  }
  const swirl = new T.Mesh(new T.TubeGeometry(new CreamSpiral(), 160, .065, 10, false), creamMaterial); product.add(swirl);
  const lid = new T.Group(); product.add(lid);
  const lidMaterial = new T.MeshPhysicalMaterial({ color: '#332339', metalness: .55, roughness: .2, clearcoat: 1 });
  const lidMesh = new T.Mesh(new T.CylinderGeometry(.87, .86, .23, 96), lidMaterial); lid.add(lidMesh);
  const lidTop = new T.Mesh(new T.CylinderGeometry(.8, .8, .012, 96), new T.MeshStandardMaterial({ color: '#49304f', metalness: .35, roughness: .25 })); lidTop.position.y = .122; lid.add(lidTop);
  const lidBand = new T.Mesh(new T.TorusGeometry(.866, .014, 8, 96), new T.MeshStandardMaterial({ color: '#e6c6bc', metalness: .8, roughness: .25 })); lidBand.rotation.x = Math.PI / 2; lidBand.position.y = -.065; lid.add(lidBand);
  // A curved label is generated locally; no texture or image downloads are needed.
  const labelCanvas = document.createElement('canvas'); labelCanvas.width = 1024; labelCanvas.height = 512;
  const context = labelCanvas.getContext('2d'); context.textAlign = 'center'; context.fillStyle = '#654061';
  context.font = '108px Georgia'; context.fillText('avelune', 512, 265);
  context.font = '22px sans-serif'; context.fillText('B L O O M   C R È M E', 512, 330); context.font = '18px sans-serif'; context.fillText('A DAILY MOMENT · 50 ML', 512, 390);
  const labelTexture = new T.CanvasTexture(labelCanvas); labelTexture.colorSpace = T.SRGBColorSpace;
  const label = new T.Mesh(new T.CylinderGeometry(.826, .826, .64, 64, 1, true, -.68, 1.36), new T.MeshBasicMaterial({ map: labelTexture, transparent: true, depthWrite: false, side: T.DoubleSide }));
  label.rotation.y = 0; label.position.y = -.02; product.add(label);
  const shadowCanvas = document.createElement('canvas'); shadowCanvas.width = shadowCanvas.height = 128;
  const shadowContext = shadowCanvas.getContext('2d'), gradient = shadowContext.createRadialGradient(64,64,4,64,64,64);
  gradient.addColorStop(0,'rgba(125,62,97,.24)'); gradient.addColorStop(1,'rgba(125,62,97,0)'); shadowContext.fillStyle = gradient; shadowContext.fillRect(0,0,128,128);
  const shadow = new T.Mesh(new T.PlaneGeometry(7,7), new T.MeshBasicMaterial({ map: new T.CanvasTexture(shadowCanvas), transparent: true, depthWrite: false })); shadow.rotation.x = -Math.PI/2; shadow.position.y = -.75; root.add(shadow);
  // One lightweight point cloud drifts around the bloom and yields to the pointer.
  const dust = makeDust(T, 135, '#d695ad', .045, 7);
  scene.add(dust.points);
  const clamp = T.MathUtils.clamp, lerp = T.MathUtils.lerp;
  const segment = (p, start, end) => { const x = clamp((p - start) / (end - start), 0, 1); return x * x * (3 - 2 * x); };
  function pose(p, time, mobile) {
    const open = segment(p, .02, .4), rise = segment(p, .1, .46), lift = segment(p, .39, .66), overhead = segment(p, .58, .86), exit = segment(p, .87, 1);
    petals.forEach(({ mesh, hinge, layer, variation }) => {
      mesh.morphTargetInfluences[0] = open;
      hinge.rotation.x = lerp(-.018 + layer * .004, 1.38 - layer * .11 + variation, open);
    });
    const coreSize = Math.max(.001, 1 - open / .42);
    budCore.scale.set(coreSize * .88, coreSize * 1.13, coreSize * .88);
    budCore.visible = open < .42;
    label.material.opacity = segment(open, .12, .45);
    flower.rotation.y = Math.sin(time * .16) * .06;
    product.position.set(0, lerp(.92, 2.04, rise) + Math.sin(time * .6) * .025, 0);
    product.rotation.y = Math.sin(time * .18) * .08;
    lid.position.set(lift * 1.17, .65 + lift * 1.12, lift * -.22);
    lid.rotation.set(lift * .48, lift * .2, lift * -.38);
    // Fit the entire bloom below the mobile copy, with room above the bottom controls.
    root.scale.setScalar(mobile ? .78 : 1);
    root.position.set(0, mobile ? -.05 - exit * 1.25 : -.05 - exit * 1.7, 0);
    root.rotation.y = -.13 + pointer.easedX * .055;
    const cameraHeight = lerp(mobile ? 2.7 : 2.85, 7.3, overhead);
    const distance = lerp(mobile ? 7.8 : 9.5, mobile ? 4.6 : 3.3, overhead);
    camera.position.set((mobile ? 0 : .3) + pointer.easedX * .3, cameraHeight - pointer.easedY * .15, distance);
    camera.lookAt(0, 1.05, 0);
    dust.update(time, pointer.easedX, pointer.easedY);
  }
  function resize() { const width = Math.max(1,host.clientWidth), height = Math.max(1,host.clientHeight); renderer.setSize(width,height); camera.aspect = width / height; camera.updateProjectionMatrix(); }
  resize(); pose(0,0,innerWidth < 700); renderer.render(scene,camera); document.body.classList.add('webgl-ready');
  return { renderer, scene, camera, pose, resize };
}

function makeRoom(T) {
  const host = document.querySelector('#room-scene');
  const renderer = new T.WebGLRenderer({ antialias: true }); renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderers.room = renderer;
  renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.2; host.append(renderer.domElement);
  const scene = new T.Scene(); scene.background = new T.Color('#2b1c2a'); scene.fog = new T.FogExp2('#624353', .065);
  const camera = new T.PerspectiveCamera(48, 1, .1, 70);
  scene.add(new T.HemisphereLight('#b48caa', '#302637', 1.1));
  const wallMaterial = new T.MeshStandardMaterial({ color: '#594050', roughness: .8 });
  const floorMaterial = new T.MeshStandardMaterial({ color: '#322937', roughness: .38, metalness: .25 });
  function box(width, height, depth, x, y, z, material) { const mesh = new T.Mesh(new T.BoxGeometry(width,height,depth), material); mesh.position.set(x,y,z); scene.add(mesh); return mesh; }
  box(14,.2,32,0,-.1,0,floorMaterial); box(.3,8,32,-5.3,4,0,wallMaterial); box(.3,8,32,5.3,4,0,wallMaterial);
  box(11,.3,32,0,7.5,0,wallMaterial); box(11,8,.3,0,4,-12,wallMaterial);
  const glowMaterial = new T.MeshBasicMaterial({ color: '#ecc2aa' });
  // Soft additive gradients suggest shafts of light in the mist without postprocessing.
  const shaftCanvas = document.createElement('canvas'); shaftCanvas.width = 64; shaftCanvas.height = 256;
  const shaftContext = shaftCanvas.getContext('2d');
  const shaftGradient = shaftContext.createLinearGradient(0, 0, 64, 0);
  shaftGradient.addColorStop(0, 'rgba(255,235,224,0)'); shaftGradient.addColorStop(.35, 'rgba(255,235,224,.65)'); shaftGradient.addColorStop(.5, 'rgba(255,235,224,.85)'); shaftGradient.addColorStop(.65, 'rgba(255,235,224,.65)'); shaftGradient.addColorStop(1, 'rgba(255,235,224,0)');
  shaftContext.fillStyle = shaftGradient; shaftContext.fillRect(0,0,64,256);
  shaftContext.globalCompositeOperation = 'destination-in';
  const fade = shaftContext.createLinearGradient(0,0,0,256); fade.addColorStop(0,'rgba(255,255,255,0)'); fade.addColorStop(.12,'#fff'); fade.addColorStop(.55,'rgba(255,255,255,.7)'); fade.addColorStop(1,'rgba(255,255,255,0)');
  shaftContext.fillStyle = fade; shaftContext.fillRect(0,0,64,256);
  const shaftMaterial = new T.MeshBasicMaterial({ map: new T.CanvasTexture(shaftCanvas), color:'#ffe0d1', transparent:true, opacity:.44, blending:T.AdditiveBlending, depthWrite:false, side:T.DoubleSide, fog:false, toneMapped:false });
  const beams = [
    { x:-1.75, y:3.3, z:4.5, angle:-.2 },
    { x:1.6, y:3.3, z:0, angle:.24 },
    { x:-1.3, y:3.3, z:-4.4, angle:-.18 },
    { x:.65, y:3.3, z:-8.1, angle:.24 }
  ];
  const shaftGeometry = new T.PlaneGeometry(2,7);
  const shaftPositions = shaftGeometry.attributes.position;
  for (let i=0; i<shaftPositions.count; i++) {
    shaftPositions.setX(i, shaftPositions.getX(i) * (shaftPositions.getY(i) > 0 ? .2 : 1.45));
  }
  shaftGeometry.computeVertexNormals();
  beams.forEach(beam => {
    const shaft = new T.Mesh(shaftGeometry, shaftMaterial);
    shaft.position.set(beam.x,beam.y,beam.z); shaft.rotation.z = beam.angle; scene.add(shaft);
  });
  // Repeated thresholds create a real perspective journey rather than a zoomed image.
  for (const z of [6, 1, -4]) {
    const portalMaterial = new T.MeshStandardMaterial({ color: '#765464', metalness: .2, roughness: .6 });
    box(.45,5.5,.65,-2.55,2.75,z,portalMaterial); box(.45,5.5,.65,2.55,2.75,z,portalMaterial); box(5.55,.45,.65,0,5.5,z,portalMaterial);
    box(.025,5.1,.025,-2.3,2.65,z+.34,glowMaterial); box(.025,5.1,.025,2.3,2.65,z+.34,glowMaterial); box(4.6,.025,.025,0,5.2,z+.34,glowMaterial);
    const light = new T.PointLight('#ffc8a4', 18, 8, 2); light.position.set(0,4.5,z); scene.add(light);
  }
  // A feathered additive floor pool keeps the destination warm even at the far threshold.
  const poolCanvas = document.createElement('canvas'); poolCanvas.width = poolCanvas.height = 256;
  const poolContext = poolCanvas.getContext('2d'); const poolGradient = poolContext.createRadialGradient(128,128,0,128,128,128);
  poolGradient.addColorStop(0,'rgba(255,255,255,.95)'); poolGradient.addColorStop(.28,'rgba(255,255,255,.55)'); poolGradient.addColorStop(.65,'rgba(255,255,255,.15)'); poolGradient.addColorStop(1,'rgba(255,255,255,0)');
  poolContext.fillStyle = poolGradient; poolContext.fillRect(0,0,256,256);
  const poolTexture = new T.CanvasTexture(poolCanvas);
  const poolMaterial = new T.MeshBasicMaterial({ map:poolTexture, color:'#ffb2bf', transparent:true, opacity:.38, blending:T.AdditiveBlending, depthWrite:false, fog:false, toneMapped:false });
  const pool = new T.Mesh(new T.PlaneGeometry(8,8), poolMaterial); pool.rotation.x = -Math.PI/2; pool.position.set(0,.015,-8); scene.add(pool);
  const floorLight = new T.PointLight('#ffb7bf',18,7,2); floorLight.position.set(0,.6,-8); scene.add(floorLight);
  // Low translucent mist catches the same warm light, with no hard rectangle edges.
  const mistMaterial = new T.MeshBasicMaterial({ map:poolTexture, color:'#e8c0c8', transparent:true, opacity:.07, depthWrite:false, blending:T.AdditiveBlending, fog:false, toneMapped:false });
  const mist = new T.Mesh(new T.PlaneGeometry(10,5), mistMaterial); mist.rotation.x = -Math.PI/2; mist.position.set(0,.24,-5); scene.add(mist);
  // The destination is the same rose-glass jar, resting above a lit stone plinth.
  box(1.9,.18,1.9,0,.1,-8,floorMaterial); box(1.4,.18,1.4,0,.27,-8,floorMaterial);
  const plinth = new T.Mesh(new T.CylinderGeometry(.65,.75,1.15,48), new T.MeshStandardMaterial({ color:'#a58192',roughness:.6 })); plinth.position.set(0,.95,-8); scene.add(plinth);
  const orb = new T.Group(); orb.position.set(0,1.85,-8); scene.add(orb);
  const glow = new T.MeshPhysicalMaterial({ color:'#fbd1d9',emissive:'#dd91a9',emissiveIntensity:.45,metalness:.15,roughness:.18,clearcoat:1,transparent:true,opacity:.9 });
  const destinationJar = new T.Mesh(new T.CylinderGeometry(.5,.48,.65,64), glow); orb.add(destinationJar);
  const destinationLid = new T.Mesh(new T.CylinderGeometry(.54,.54,.17,64), new T.MeshPhysicalMaterial({ color:'#352338',metalness:.5,roughness:.2,clearcoat:1 }));
  destinationLid.position.y = .4; orb.add(destinationLid);
  const destinationRim = new T.Mesh(new T.TorusGeometry(.49,.022,8,64), glow); destinationRim.rotation.x = Math.PI/2; destinationRim.position.y = -.28; orb.add(destinationRim);
  // A Fresnel shell lights only the jar silhouette, gradually strengthening on approach.
  const rimGlow = new T.ShaderMaterial({
    uniforms:{ color:{value:new T.Color('#ffd2ba')}, strength:{value:.15} },
    vertexShader:`varying vec3 viewNormal; varying vec3 viewDirection;
      void main() { vec4 positionInView = modelViewMatrix * vec4(position,1.0);
        viewNormal = normalize(normalMatrix * normal); viewDirection = -positionInView.xyz;
        gl_Position = projectionMatrix * positionInView; }`,
    fragmentShader:`uniform vec3 color; uniform float strength; varying vec3 viewNormal; varying vec3 viewDirection;
      void main() { float edge = pow(1.0 - abs(dot(normalize(viewNormal),normalize(viewDirection))),2.5);
        gl_FragColor = vec4(color,edge * strength); }`,
    transparent:true, blending:T.AdditiveBlending, depthWrite:false, toneMapped:false
  });
  const rimShell = new T.Mesh(new T.CylinderGeometry(.515,.495,.665,64),rimGlow); orb.add(rimShell);
  const labelCanvas = document.createElement('canvas'); labelCanvas.width = 512; labelCanvas.height = 256;
  const labelContext = labelCanvas.getContext('2d'); labelContext.fillStyle = '#5a3059'; labelContext.textAlign = 'center'; labelContext.font = '78px Georgia'; labelContext.fillText('avelune',256,120); labelContext.font = '20px sans-serif'; labelContext.fillText('B L O O M  C R È M E',256,170);
  const labelTexture = new T.CanvasTexture(labelCanvas); labelTexture.colorSpace = T.SRGBColorSpace;
  const jarLabel = new T.Mesh(new T.CylinderGeometry(.503,.503,.42,40,1,true,-.8,1.6),new T.MeshBasicMaterial({ map:labelTexture,transparent:true,depthWrite:false,side:T.DoubleSide })); orb.add(jarLabel);
  const objectLight = new T.PointLight('#f7aecf', 25, 9, 2); objectLight.position.set(0,2.3,-7.7); scene.add(objectLight);
  for(let i=0;i<12;i++) { const z=8-i*1.6; box(.035,.015,.7,-1.15,.025,z,glowMaterial); box(.035,.015,.7,1.15,.025,z,glowMaterial); }
  // Wall fins and low seats make the space feel inhabited, without texture assets.
  for(let i=0;i<14;i++) { box(.18,5,.35,-5.05,2.5,9-i*1.5,wallMaterial); box(.18,5,.35,5.05,2.5,9-i*1.5,wallMaterial); }
  box(1.2,.65,3.5,-3.8,.33,-1,wallMaterial); box(1.2,.65,3.5,3.8,.33,-1,wallMaterial);
  const dust = makeDust(T, 160, '#ffe3cb', .06, 1, { beams, additive:true }); scene.add(dust.points);
  function pose(progress,time) {
    const p=progress*progress*(3-2*progress);
    camera.position.set(Math.sin(progress*Math.PI)*.22 + pointer.easedX * .05,2.25,12-p*16.2);
    camera.lookAt(0,1.95,-8); orb.rotation.y=Math.sin(time*.16)*.12;
    objectLight.intensity=25+p*9+Math.sin(time*.7)*2;
    glow.emissiveIntensity = .45 + p * .2;
    rimGlow.uniforms.strength.value = .15 + p * .4;
    poolMaterial.opacity = .38 + p * .08;
    mist.position.x = Math.sin(time*.1)*.22; mist.position.y = .24 + Math.sin(time*.16)*.025;
    dust.update(time, 0, 0);
  }
  function resize() { const width = Math.max(1,host.clientWidth), height = Math.max(1,host.clientHeight); renderer.setSize(width,height); camera.aspect=width/height; camera.updateProjectionMatrix(); }
  resize(); pose(0,0); renderer.render(scene,camera); document.body.classList.add('room-ready');
  return { renderer,scene,camera,pose,resize };
}

function makeDust(T, count, color, size, spread, options = {}) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 32;
  const context = canvas.getContext('2d'); const gradient = context.createRadialGradient(16,16,0,16,16,16);
  gradient.addColorStop(0,'rgba(255,255,255,1)'); gradient.addColorStop(.25,'rgba(255,255,255,.8)'); gradient.addColorStop(1,'rgba(255,255,255,0)');
  context.fillStyle = gradient; context.fillRect(0,0,32,32);
  const positions = new Float32Array(count * 3), seeds = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    seeds[i*3] = (Math.random() - .5) * spread;
    seeds[i*3+1] = Math.random() * 6 - .7;
    seeds[i*3+2] = (Math.random() - .5) * spread;
  }
  const geometry = new T.BufferGeometry(); geometry.setAttribute('position', new T.BufferAttribute(positions,3));
  const points = new T.Points(geometry, new T.PointsMaterial({ color, size, map:new T.CanvasTexture(canvas), transparent:true, opacity:options.additive ? .78 : .55, depthWrite:false, blending:options.additive ? T.AdditiveBlending : T.NormalBlending, fog:!options.additive, toneMapped:!options.additive }));
  function update(time, x, y) {
    for (let i=0; i<count; i++) {
      if (options.beams) {
        const beam = options.beams[i % options.beams.length];
        const localY = ((seeds[i*3+1]+.7+time*.055)%6)-3;
        const localX = seeds[i*3] * (.3 + (3-localY)*.2) + Math.sin(time*.22+i)*.065;
        const cosine = Math.cos(beam.angle), sine = Math.sin(beam.angle);
        positions[i*3] = beam.x + localX*cosine - localY*sine;
        positions[i*3+1] = beam.y + localX*sine + localY*cosine;
        positions[i*3+2] = beam.z + seeds[i*3+2]*.6;
        continue;
      }
      positions[i*3] = seeds[i*3] + Math.sin(time*.18+i*1.3)*.15 + x*.18;
      positions[i*3+1] = ((seeds[i*3+1]+.7+time*.035)%6)-.7 + Math.cos(time*.2+i)*.1 - y*.1;
      positions[i*3+2] = seeds[i*3+2] + Math.cos(time*.15+i)*.12;
    }
    geometry.attributes.position.needsUpdate = true;
  }
  update(0,0,0); return { points, update };
}
