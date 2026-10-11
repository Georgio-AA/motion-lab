import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js';
import { mergeGeometries } from 'https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/utils/BufferGeometryUtils.js';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const lerp = (start, end, t) => start + (end - start) * t;

// Everything is procedural: a tactile textile, fluted ceramic, and a baked contact shadow.
function makeTextures() {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d'); ctx.fillStyle = '#a79c88'; ctx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 4) {
    for (let x = 0; x < 256; x += 4) {
      ctx.fillStyle = '#51483b'; ctx.fillRect(x + (y % 8 ? 1 : 0), y, 2, 2);
      ctx.fillStyle = '#c0b49e'; ctx.fillRect(x + 2, y + 2, 1, 1);
    }
  }
  const fabric = new THREE.CanvasTexture(canvas); fabric.colorSpace = THREE.SRGBColorSpace;
  fabric.wrapS = fabric.wrapT = THREE.RepeatWrapping; fabric.repeat.set(3, 1.5); fabric.anisotropy = 2;
  const shadowCanvas = document.createElement('canvas'); shadowCanvas.width = shadowCanvas.height = 128;
  const shadowCtx = shadowCanvas.getContext('2d');
  const gradient = shadowCtx.createRadialGradient(64, 64, 5, 64, 64, 63);
  gradient.addColorStop(0, 'rgba(25,20,14,.48)'); gradient.addColorStop(.35, 'rgba(25,20,14,.25)'); gradient.addColorStop(1, 'rgba(25,20,14,0)');
  shadowCtx.fillStyle = gradient; shadowCtx.fillRect(0, 0, 128, 128);
  const shadow = new THREE.CanvasTexture(shadowCanvas);
  return { fabric, shadow };
}
function buildSpeaker(color, textures) {
  const root = new THREE.Group();
  const ceramic = new THREE.MeshStandardMaterial({ color, roughness: .72, metalness: .025 });
  const textile = new THREE.MeshStandardMaterial({ color: '#9f8e77', map: textures.fabric, bumpMap: textures.fabric, bumpScale: .045, roughness: 1 });
  const aluminum = new THREE.MeshStandardMaterial({ color: '#c6b296', roughness: .32, metalness: .65 });
  const dark = new THREE.MeshStandardMaterial({ color: '#282c25', roughness: .78 });
  const base = new THREE.Group(), grille = new THREE.Group(), cap = new THREE.Group(), core = new THREE.Group();
  root.add(base, grille, cap, core);
  const profile = [new THREE.Vector2(0, -1.42), new THREE.Vector2(.86, -1.42), new THREE.Vector2(.95, -1.38), new THREE.Vector2(.99, -1.29), new THREE.Vector2(1, -.43), new THREE.Vector2(.98, -.36), new THREE.Vector2(.90, -.33), new THREE.Vector2(0, -.33)];
  base.add(new THREE.Mesh(new THREE.LatheGeometry(profile, 64), ceramic));
  // Repeated flutes are a single draw call, not dozens of individual objects.
  const ribs = new THREE.InstancedMesh(new THREE.CylinderGeometry(.013, .013, .90, 5), ceramic, 112);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 112; i++) {
    const angle = i / 112 * Math.PI * 2;
    dummy.position.set(Math.cos(angle) * .997, -.87, Math.sin(angle) * .997); dummy.updateMatrix(); ribs.setMatrixAt(i, dummy.matrix);
  }
  base.add(ribs);
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(.87, .83, .095, 64), dark); foot.position.y = -1.435; base.add(foot);
  const fabricMesh = new THREE.Mesh(new THREE.CylinderGeometry(.972, .972, 1.43, 64, 1, true), textile); fabricMesh.position.y = .385; grille.add(fabricMesh);
  const rimGeometries = [-.35, 1.1].map(y => {
    const geometry = new THREE.TorusGeometry(.976, .024, 6, 64); geometry.rotateX(Math.PI / 2); geometry.translate(0, y, 0); return geometry;
  });
  grille.add(new THREE.Mesh(mergeGeometries(rimGeometries), aluminum)); rimGeometries.forEach(geometry => geometry.dispose());
  const capProfile = [new THREE.Vector2(0, 1.10), new THREE.Vector2(.96, 1.10), new THREE.Vector2(1, 1.15), new THREE.Vector2(1, 1.23), new THREE.Vector2(.94, 1.29), new THREE.Vector2(0, 1.29)];
  cap.add(new THREE.Mesh(new THREE.LatheGeometry(capProfile, 64), ceramic));
  const topInset = new THREE.Mesh(new THREE.CylinderGeometry(.91, .91, .007, 64), ceramic); topInset.position.y = 1.292; cap.add(topInset);
  const dial = new THREE.Mesh(new THREE.CylinderGeometry(.25, .26, .13, 40), aluminum); dial.position.y = 1.36; cap.add(dial);
  const dialTop = new THREE.Mesh(new THREE.CylinderGeometry(.23, .23, .006, 40), aluminum); dialTop.position.y = 1.427; cap.add(dialTop);
  const dialMark = new THREE.Mesh(new THREE.BoxGeometry(.018, .01, .065), dark); dialMark.position.set(0, 1.433, -.17); cap.add(dialMark);
  const led = new THREE.Mesh(new THREE.SphereGeometry(.022, 8, 6), new THREE.MeshBasicMaterial({ color: '#dce6b4' })); led.position.set(.42, 1.30, .29); cap.add(led);
  const coreBody = new THREE.Mesh(new THREE.CylinderGeometry(.68, .76, 1.14, 40), dark); coreBody.position.y = .3; core.add(coreBody);
  const driver = new THREE.Mesh(new THREE.ConeGeometry(.63, .22, 40), aluminum); driver.position.y = .98; core.add(driver);
  const coreRing = new THREE.Mesh(new THREE.TorusGeometry(.64, .045, 8, 40), dark); coreRing.rotation.x = Math.PI / 2; coreRing.position.y = .90; core.add(coreRing);
  const badgeCanvas = document.createElement('canvas'); badgeCanvas.width = 256; badgeCanvas.height = 64;
  const badgeCtx = badgeCanvas.getContext('2d'); badgeCtx.font = '42px sans-serif'; badgeCtx.textAlign = 'center'; badgeCtx.fillStyle = '#ebc29b'; badgeCtx.fillText('ora', 128, 46);
  const badgeTexture = new THREE.CanvasTexture(badgeCanvas); badgeTexture.colorSpace = THREE.SRGBColorSpace;
  const badge = new THREE.Mesh(new THREE.PlaneGeometry(.36, .09), new THREE.MeshBasicMaterial({ map: badgeTexture, transparent: true, depthWrite: false })); badge.position.set(0, -1.1, 1.018); base.add(badge);
  const port = new THREE.Mesh(new THREE.BoxGeometry(.16, .045, .015), dark); port.position.set(0, -1.19, -1.014); base.add(port);
  return { root, ceramic, base, grille, cap, core };
}

function createStudio(canvas, color, textures, isStory) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.22;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(33, 1, .1, 40);
  camera.position.set(5.2, 3.2, isStory ? 10.9 : 8.7); camera.lookAt(0, isStory ? .27 : 0, 0);
  scene.add(new THREE.HemisphereLight('#fff6e5', isStory ? '#626e55' : '#a5a692', 2.5));
  const key = new THREE.DirectionalLight('#fff2d8', 3.3); key.position.set(-3, 5, 4); scene.add(key);
  const speaker = buildSpeaker(color, textures); scene.add(speaker.root);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(5.3, 4.7), new THREE.MeshBasicMaterial({ map: textures.shadow, transparent: true, depthWrite: false, opacity: isStory ? .42 : 1 }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = -1.49; scene.add(shadow);
  const parent = canvas.parentElement;
  const studio = { renderer, scene, camera, speaker, shadow, parent, visible: false, width: 0, height: 0, failed: false, dirty: true };
  function resize() {
    studio.width = parent.clientWidth; studio.height = parent.clientHeight;
    if (!studio.width || !studio.height) return;
    renderer.setSize(studio.width, studio.height, false); camera.aspect = studio.width / studio.height; camera.updateProjectionMatrix(); studio.dirty = true;
  }
  const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(parent); resize();
  const intersectionObserver = new IntersectionObserver(entries => { studio.visible = entries[0].isIntersecting; studio.dirty = true; }, { rootMargin: '0px' }); intersectionObserver.observe(parent);
  studio.cleanup = () => { resizeObserver.disconnect(); intersectionObserver.disconnect(); renderer.dispose(); };
  canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); studio.failed = true; parent.classList.remove('ready'); });
  canvas.addEventListener('webglcontextrestored', () => { studio.failed = false; studio.dirty = true; });
  return studio;
}

export function createProductExperience(initialColor) {
  const textures = makeTextures();
  let hero, story;
  try {
    hero = createStudio(document.querySelector('#hero-canvas'), initialColor, textures, false);
    story = createStudio(document.querySelector('#story-canvas'), initialColor, textures, true);
  } catch (error) {
    hero?.cleanup(); story?.cleanup(); throw error;
  }
  const query = matchMedia('(prefers-reduced-motion: reduce)');
  let reduced = query.matches;
  const desiredColor = new THREE.Color(initialColor);
  let colorChanging = false;
  const stage = hero.parent;
  let rotation = -.4, targetRotation = -.4, targetTilt = .035, tilt = .035;
  let dragging = false, startX = 0, startY = 0, lastX = 0, lastInteraction = performance.now();
  let galleryOffset = 0, storyProgress = 0, explosion = 0, targetExplosion = 0;
  let heroZoom = 1, storyScale = .89;
  const storySection = document.querySelector('#craft');
  const storyBar = document.querySelector('#story-progress');
  const storyState = document.querySelector('#story-state');
  const callouts = [...document.querySelectorAll('.callout')];
  const phaseNames = ['01 — The whole', '02 — Every layer matters', '03 — Back in harmony'];
  let phase = -1;
  let storyStart = 0, storyDistance = 1, heroStart = 0, heroHeight = 1, scrollDirty = true;
  function measure() {
    const storyRect = storySection.getBoundingClientRect();
    const heroRect = stage.getBoundingClientRect();
    storyStart = storyRect.top + scrollY - (innerWidth <= 760 ? 70 : 84);
    storyDistance = Math.max(1, storySection.offsetHeight - document.querySelector('.craft-sticky').offsetHeight);
    heroStart = heroRect.top + scrollY; heroHeight = heroRect.height;
    galleryOffset = innerWidth <= 760 ? .12 : .36;
    storyScale = innerWidth <= 760 ? .78 : .89;
    scrollDirty = true;
  }
  measure(); addEventListener('resize', measure, { passive: true });
  addEventListener('scroll', () => { scrollDirty = true; }, { passive: true });
  new ResizeObserver(measure).observe(storySection);
  query.addEventListener('change', event => { reduced = event.matches; measure(); hero.dirty = story.dirty = true; });

  // Whole-stage hit area keeps rotation generous; vertical swipes remain native scroll.
  stage.addEventListener('pointerdown', event => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    startX = lastX = event.clientX; startY = event.clientY; dragging = true;
    stage.setPointerCapture(event.pointerId); lastInteraction = performance.now();
  });
  stage.addEventListener('pointermove', event => {
    if (!dragging) return;
    const dx = event.clientX - lastX;
    if (Math.abs(event.clientX - startX) > Math.abs(event.clientY - startY) || event.pointerType === 'mouse') {
      targetRotation += dx * .009; targetTilt = clamp((event.clientY - startY) * .0007 + .035, -.09, .17); hero.dirty = true;
    }
    lastX = event.clientX; lastInteraction = performance.now();
  });
  function stopDrag(event) {
    dragging = false; lastInteraction = performance.now(); targetTilt = .035;
    if (stage.hasPointerCapture(event.pointerId)) stage.releasePointerCapture(event.pointerId);
  }
  stage.addEventListener('pointerup', stopDrag); stage.addEventListener('pointercancel', stopDrag);
  stage.addEventListener('keydown', event => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault(); targetRotation += event.key === 'ArrowLeft' ? -.35 : .35; lastInteraction = performance.now(); hero.dirty = true;
  });
  [...document.querySelectorAll('[data-view]')].forEach(button => button.addEventListener('click', () => {
    targetRotation = [-.4, -.54, Math.PI - .54][Number(button.dataset.view)]; lastInteraction = performance.now(); hero.dirty = true;
    document.querySelectorAll('[data-view]').forEach(view => { const active = view === button; view.classList.toggle('active', active); view.setAttribute('aria-pressed', String(active)); });
  }));

  let previousTime = performance.now(), frameCount = 0, slowFrames = 0, quality = Math.min(devicePixelRatio, 1.5);
  function draw(studio) {
    if (studio.failed) return;
    try {
      studio.renderer.render(studio.scene, studio.camera);
      if (!studio.parent.classList.contains('ready')) studio.parent.classList.add('ready');
      studio.dirty = false;
    } catch {
      studio.failed = true; studio.parent.classList.remove('ready');
    }
  }
  // Cached geometry, colors and coordinates; no object allocation in the animation loop.
  function frame(now) {
    requestAnimationFrame(frame);
    const elapsed = now - previousTime; previousTime = now;
    if (document.hidden || (!hero.visible && !story.visible)) return;
    const dt = Math.min(elapsed / 1000, .05);
    const ease = reduced ? 1 : 1 - Math.exp(-dt * 10);
    if (scrollDirty) {
      storyProgress = clamp((scrollY - storyStart) / storyDistance, 0, 1);
      targetExplosion = reduced ? .78 : Math.sin(Math.PI * clamp((storyProgress - .10) / .8, 0, 1));
      heroZoom = reduced ? 1 : 1 + clamp((scrollY - heroStart + 100) / heroHeight, 0, 1) * .09;
      storyBar.style.transform = `scaleX(${reduced ? 1 : storyProgress})`;
      const nextPhase = reduced ? 1 : storyProgress < .2 ? 0 : storyProgress > .82 ? 2 : 1;
      if (phase !== nextPhase) {
        phase = nextPhase; storyState.textContent = phaseNames[phase];
        for (let i = 0; i < callouts.length; i++) callouts[i].classList.toggle('visible', phase === 1);
      }
      hero.dirty = story.dirty = true; scrollDirty = false;
    }
    if (colorChanging) {
      hero.speaker.ceramic.color.lerp(desiredColor, ease); story.speaker.ceramic.color.copy(hero.speaker.ceramic.color);
      if (Math.abs(hero.speaker.ceramic.color.r - desiredColor.r) + Math.abs(hero.speaker.ceramic.color.g - desiredColor.g) + Math.abs(hero.speaker.ceramic.color.b - desiredColor.b) < .001) { hero.speaker.ceramic.color.copy(desiredColor); story.speaker.ceramic.color.copy(desiredColor); colorChanging = false; }
      hero.dirty = story.dirty = true;
    }
    if (hero.visible) {
      if (!reduced && !dragging && now - lastInteraction > 3500) targetRotation += dt * .095;
      rotation = lerp(rotation, targetRotation, ease); tilt = lerp(tilt, targetTilt, ease);
      hero.speaker.root.rotation.set(tilt, rotation, -.045); hero.speaker.root.position.x = galleryOffset;
      hero.speaker.root.scale.setScalar(heroZoom * 1.16);
      hero.shadow.position.y = -1.49 * heroZoom * 1.16;
      hero.shadow.scale.setScalar(heroZoom * 1.16);
      if (!reduced || hero.dirty) draw(hero);
    }
    if (story.visible) {
      explosion = lerp(explosion, targetExplosion, ease);
      story.speaker.cap.position.y = explosion * 1.9;
      story.speaker.grille.position.set(explosion * .12, explosion * .65, 0);
      story.speaker.core.position.set(-explosion * .12, -explosion * .85, 0);
      story.speaker.base.position.y = -explosion * 1.4;
      story.speaker.root.rotation.y = -.42 + (reduced ? 0 : storyProgress * .65);
      story.speaker.root.scale.setScalar(storyScale);
      story.shadow.position.y = (-1.49 - explosion * 1.4) * storyScale;
      story.shadow.scale.setScalar(storyScale);
      if (!reduced || story.dirty) draw(story);
    }
    // Sustained slow frame times drop resolution, with a grace period for initialization.
    frameCount++;
    if (frameCount > 60 && elapsed > 20 && elapsed < 250) slowFrames++; else slowFrames = Math.max(0, slowFrames - 1);
    if (slowFrames > 35 && quality > .75) {
      quality = Math.max(.75, quality - .25); hero.renderer.setPixelRatio(quality); story.renderer.setPixelRatio(quality); hero.dirty = story.dirty = true; slowFrames = 0;
    }
  }
  requestAnimationFrame(frame);
  return { setColor(hex) { desiredColor.set(hex); colorChanging = true; hero.dirty = story.dirty = true; } };
}
