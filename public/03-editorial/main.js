import { prefersReducedMotion } from '../shared/base.js';
import { scene } from './scenes.js';
import { createHeroSky } from './sky.js';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const clamp = (value, low=0, high=1) => Math.min(high,Math.max(low,value));
const lerp = (a,b,t) => a+(b-a)*t;
const reduced = prefersReducedMotion();
const finePointer = matchMedia('(hover:hover) and (pointer:fine)');
const hero = $('.hero');
const heroArt = $('.hero-art');
const brand = $('.brand-moment');
const brandStage = $('.brand-stage');
const brandLetters = $$('.sky-type span');
const brandCanvas = $('.brand-canvas');
const brandContext = brandCanvas.getContext('2d');
const brandMask = document.createElement('canvas');
const brandMaskContext = brandMask.getContext('2d');
const brandCheck = document.createElement('canvas');
brandCheck.width=64; brandCheck.height=32;
const brandCheckContext = brandCheck.getContext('2d', {willReadFrequently:true});
const skyCanvas = document.createElement('canvas');
skyCanvas.width=720; skyCanvas.height=420;
const skyContext = skyCanvas.getContext('2d');
const listings = $('.listings');
const gallery = $('.gallery-window');
const track = $('.listing-track');
const properties = $$('.property');
const meter = $('.gallery-meter');
const preview = $('.cursor-preview');
const cursor = $('.custom-cursor');
const marquee = $('.marquee-track');
const dialog = $('#property-dialog');
let heroSky=null, metrics={}, cardMetrics=[], letterMetrics=[], brandDrawing={};
let brandFontsReady=false, brandDrawFailed=false, cursorArea=null, pointerInside=false;
let pinned=false, galleryDistance=0, activeCard=0;
let frameId=0, previousTime=0, previousY=scrollY, velocity=0, marqueeX=0;
let pointer={x:.5,y:.5}, pointerTarget={x:.5,y:.5}, ripple=0;
let mouse={x:innerWidth/2,y:innerHeight/2}, cursorPos={...mouse}, previewPos={...mouse};
let previewTarget={...mouse}, previewActive=false, previewKind='', wipeAnimation=null;
let introStart=performance.now(), layoutFrame=0, galleryDirty=true;
const visible = new Set();
const movingSections = [hero,brand,$('.editorial'),$('.services'),listings,$('.stats'),$('.statement')];
const observers = [];

// Native links, dialogs and the form are live before any GPU or font setup.
$$('[data-property]').forEach(button => button.addEventListener('click', () => {
  $('#dialog-title').textContent=button.dataset.property;
  dialog.showModal();
}));
$('.dialog-close').addEventListener('click', () => dialog.close());
$('#dialog-contact').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => {
  if(event.target!==dialog) return;
  const rect=dialog.getBoundingClientRect();
  if(event.clientX<rect.left || event.clientX>rect.right || event.clientY<rect.top || event.clientY>rect.bottom) dialog.close();
});
$('#newsletter').addEventListener('submit', event => {
  event.preventDefault();
  $('#form-status').textContent='Thank you — this is a showcase form; no email has been sent or stored.';
  event.target.reset();
});
$('#contact-link').addEventListener('click', () => $('#email').focus({preventScroll:true}));

// Preserve the real spaces between words when introducing per-letter rise animations.
$$('.hero .word').forEach(word => {
  const text=word.textContent;
  word.textContent='';
  for(const character of text) {
    const mask=document.createElement('span'); mask.className='letter-mask';
    const letter=document.createElement('span'); letter.className='hero-letter';
    letter.textContent=character; mask.append(letter); word.append(mask);
  }
});
if(!reduced) {
  $$('.hero-letter').forEach((letter,index) => letter.animate([
    {transform:'translateY(115%) rotate(5deg)'}, {transform:'translateY(0) rotate(0deg)'}
  ],{duration:1000,delay:2200+index*17,easing:'cubic-bezier(.16,1,.3,1)',fill:'backwards'}));
  $$('.hero-copy>p,.hero-copy>.pill').forEach((el,index) => el.animate([
    {opacity:0,transform:'translateY(15px)'}, {opacity:1,transform:'translateY(0)'}
  ],{duration:850,delay:2500+index*90,easing:'cubic-bezier(.16,1,.3,1)',fill:'backwards'}));
}

const statement=$('.statement h2');
const sentence=statement.textContent;
statement.setAttribute('aria-label',sentence);
statement.textContent='';
sentence.split(' ').forEach((word,index) => {
  if(index) statement.append(' ');
  const span=document.createElement('span'); span.textContent=word; span.setAttribute('aria-hidden','true');
  statement.append(span);
});
const statementWords=[...statement.children];
const footerWord=$('.footer-brand');
footerWord.textContent='';
for(const letter of 'AURA') { const span=document.createElement('span'); span.textContent=letter; footerWord.append(span); }

// Reveals use the frame mask and a separate inner SVG, leaving parallax independent.
const revealObserver=new IntersectionObserver(entries => entries.forEach(entry => {
  if(!entry.isIntersecting) return;
  revealObserver.unobserve(entry.target);
  const target=entry.target;
  if(reduced) return;
  if(target.matches('.art-window,.property-art')) {
    target.animate([{clipPath:'inset(12% 0 88% 0)'},{clipPath:'inset(0)'}],
      {duration:1250,easing:'cubic-bezier(.76,0,.24,1)',fill:'backwards'});
    target.querySelector('svg')?.animate([{transform:'scale(1.22)'},{transform:'scale(1)'}],
      {duration:1700,easing:'cubic-bezier(.16,1,.3,1)',fill:'backwards'});
  } else if(target===footerWord) {
    [...target.children].forEach((letter,index) => letter.animate([
      {transform:'translateY(110%) rotate(5deg)'},{transform:'translateY(0) rotate(0)'}
    ],{duration:1200,delay:index*110,easing:'cubic-bezier(.16,1,.3,1)',fill:'backwards'}));
  } else {
    target.animate([{opacity:0,transform:'translateY(32px)'},{opacity:1,transform:'translateY(0)'}],
      {duration:1000,easing:'cubic-bezier(.16,1,.3,1)',fill:'backwards'});
  }
}),{threshold:.12});
$$('.art-window,.property-art,.reveal,.section-heading h2,.services-top, .footer-brand').forEach(el => revealObserver.observe(el));
observers.push(revealObserver);

// Only visible canvases and sections receive their continuous motion work.
const visibilityObserver=new IntersectionObserver(entries => entries.forEach(entry => {
  if(entry.isIntersecting) visible.add(entry.target); else visible.delete(entry.target);
  if(entry.target===listings) galleryDirty=true;
  requestFrame();
}),{rootMargin:'80px 0px'});
movingSections.forEach(el => visibilityObserver.observe(el));
observers.push(visibilityObserver);

const countObserver=new IntersectionObserver(entries => entries.forEach(entry => {
  if(!entry.isIntersecting) return;
  countObserver.unobserve(entry.target);
  if(reduced) return;
  $$('[data-count]').forEach(el => {
    const start=performance.now(), total=Number(el.dataset.count);
    function count(time) {
      const p=clamp((time-start)/1500), value=Math.round(total*(1-Math.pow(1-p,3)));
      el.textContent=value.toLocaleString('en-US')+(el.dataset.suffix||'');
      if(p<1) requestAnimationFrame(count);
    }
    requestAnimationFrame(count);
  });
}),{threshold:.3});
countObserver.observe($('.stats')); observers.push(countObserver);

function documentRect(el) {
  const rect=el.getBoundingClientRect();
  return {top:rect.top+scrollY,height:el.offsetHeight,width:rect.width};
}
function measure() {
  layoutFrame=0;
  const oldPinned=pinned;
  pinned=!reduced && finePointer.matches && innerWidth>=768 && innerHeight>=650;
  listings.classList.toggle('gallery-pinned',pinned);
  track.style.transform='';
  properties.forEach(card => card.style.transform='');
  if(pinned) {
    const padding=Math.max(0,(gallery.clientWidth-properties[0].offsetWidth)/2);
    track.style.paddingLeft=track.style.paddingRight=`${padding}px`;
  } else { track.style.paddingLeft=track.style.paddingRight=''; }
  galleryDistance=Math.max(0,track.scrollWidth-gallery.clientWidth);
  listings.style.height=pinned ? `${innerHeight+galleryDistance}px` : '';
  if(pinned && !oldPinned) gallery.scrollLeft=0;
  for(const el of movingSections) metrics[el.classList[0]]=documentRect(el);
  metrics.tiles=$$('.art-window').map(el => ({el,art:el.querySelector('.architecture'),...documentRect(el)}));
  cardMetrics=properties.map(card => ({left:card.offsetLeft,width:card.offsetWidth}));
  // Resizing clears the canvas; keep the CSS wordmark until its replacement is painted.
  brand.classList.remove('brand-textured');
  brandDrawFailed=false;
  if(brandContext && brandMaskContext) {
    const width=brandCanvas.clientWidth,height=brandCanvas.clientHeight;
    const dpr=Math.min(devicePixelRatio||1,2);
    brandCanvas.width=Math.round(width*dpr); brandCanvas.height=Math.round(height*dpr);
    brandMask.width=brandCanvas.width; brandMask.height=brandCanvas.height;
    brandContext.setTransform(dpr,0,0,dpr,0,0);
    brandMaskContext.setTransform(dpr,0,0,dpr,0,0);
    const canvasRect=brandCanvas.getBoundingClientRect();
    const typeStyle=getComputedStyle(brandLetters[0]);
    brandDrawing={width,height,font:`${typeStyle.fontWeight} ${typeStyle.fontSize} ${typeStyle.fontFamily}`};
    letterMetrics=brandLetters.map(letter => {
      const rect=letter.getBoundingClientRect();
      return {x:rect.left-canvasRect.left,y:rect.top-canvasRect.top,width:rect.width,height:rect.height};
    });
  }
  marquee.unitWidth=marquee.firstElementChild.offsetWidth;
  galleryDirty=true;
  requestFrame();
}
function scheduleMeasure() { if(!layoutFrame) layoutFrame=requestAnimationFrame(measure); }
window.addEventListener('resize',scheduleMeasure,{passive:true});
finePointer.addEventListener('change',scheduleMeasure);
document.fonts.ready.then(() => {
  brandFontsReady=document.fonts.check('800 100px Manrope','AURA');
  scheduleMeasure();
}).catch(() => { brand.classList.remove('brand-textured'); });

// This small offscreen sky is reused inside four separately transformed letter masks.
function drawBrand(time,progress) {
  if(reduced || !brandFontsReady || brandDrawFailed || !brandContext || !brandMaskContext || !brandCheckContext || !skyContext || !letterMetrics.length) return;
  const {width,height,font}=brandDrawing;
  if(!Number.isFinite(width) || !Number.isFinite(height) || width<=0 || height<=0) return;
  try {
    const w=720,h=420;
    const gradient=skyContext.createLinearGradient(0,0,w*.25,h);
    gradient.addColorStop(0,'#7e9ba9'); gradient.addColorStop(.38,'#c4d0cd');
    gradient.addColorStop(.68,'#f1d5b1'); gradient.addColorStop(1,'#b77b50');
    skyContext.fillStyle=gradient; skyContext.fillRect(0,0,w,h);
    const glow=skyContext.createRadialGradient(100,300,0,100,300,290);
    glow.addColorStop(0,'#ffe4bbaa'); glow.addColorStop(1,'#ffe4bb00');
    skyContext.fillStyle=glow; skyContext.fillRect(0,0,w,h);
    skyContext.save(); skyContext.filter='blur(15px)';
    for(let i=0;i<13;i++) {
      const x=((i*127+time*5*(1+i%3*.15))%(w+240))-120;
      const y=100+Math.sin(i*1.3)*85;
      skyContext.fillStyle=`rgba(255,245,224,${.10+(i%3)*.025})`;
      skyContext.beginPath(); skyContext.ellipse(x,y,120+(i%3)*40,14+(i%4)*8,-.16,0,Math.PI*2); skyContext.fill();
    }
    skyContext.restore();
    // Paint all four glyphs into one mask. Separate destination-in calls intersect
    // disjoint letters and erase the wordmark instead of combining its silhouettes.
    const mask=brandMaskContext;
    mask.clearRect(0,0,width,height);
    mask.globalCompositeOperation='source-over';
    mask.fillStyle='#000'; mask.textBaseline='top'; mask.font=font;
    const scale=lerp(1.6,1,progress);
    mask.save(); mask.translate(width/2,height/2); mask.scale(scale,scale); mask.translate(-width/2,-height/2);
    letterMetrics.forEach((rect,index) => {
      const lift=(1-progress)*[24,-30,44,-18][index];
      mask.fillText('AURA'[index],rect.x,rect.y+lift);
    });
    mask.restore();
    const ctx=brandContext;
    ctx.globalCompositeOperation='source-over';
    ctx.clearRect(0,0,width,height);
    ctx.drawImage(skyCanvas,0,0,width,height);
    ctx.globalCompositeOperation='destination-in';
    ctx.drawImage(brandMask,0,0,width,height);
    ctx.globalCompositeOperation='source-over';
    if(!brand.classList.contains('brand-textured')) {
      // A tiny alpha check runs once per resize, never on every animation frame.
      brandCheckContext.clearRect(0,0,64,32);
      brandCheckContext.drawImage(brandCanvas,0,0,64,32);
      const pixels=brandCheckContext.getImageData(0,0,64,32).data;
      const painted=pixels.some((value,index)=>index%4===3 && value>0);
      if(painted) brand.classList.add('brand-textured');
      else brandDrawFailed=true;
    }
  } catch {
    brandDrawFailed=true;
    brandContext.globalCompositeOperation='source-over';
    brand.classList.remove('brand-textured');
  }
}

function galleryProgress(y=scrollY) {
  if(pinned) return clamp((y-metrics.listings.top)/Math.max(1,galleryDistance));
  return clamp(gallery.scrollLeft/Math.max(1,galleryDistance));
}
function updateGallery(y) {
  const p=galleryProgress(y), x=p*galleryDistance;
  if(pinned) track.style.transform=`translate3d(${-x}px,0,0)`;
  let nearest=0, smallest=Infinity;
  properties.forEach((card,index) => {
    const rect=cardMetrics[index]; if(!rect) return;
    const distance=Math.abs(rect.left+rect.width/2-x-gallery.clientWidth/2);
    if(distance<smallest) { smallest=distance; nearest=index; }
    const center=1-clamp(distance/(gallery.clientWidth*.7));
    if(!reduced) card.style.transform=`scale(${.9+center*.1})`;
    const art=card.querySelector('.property-art');
    if(!reduced) art.style.transform=`translate3d(${clamp((rect.left+rect.width/2-x-gallery.clientWidth/2)/gallery.clientWidth,-1,1)*-24}px,0,0)`;
  });
  activeCard=nearest;
  $('#listing-current').textContent=String(nearest+1).padStart(2,'0');
  meter.firstElementChild.style.transform=`scaleX(${Math.max(.02,p)})`;
  meter.setAttribute('aria-valuenow',String(Math.round(p*100)));
  $('.gallery-prev').disabled=p<=.001;
  $('.gallery-next').disabled=p>=.999;
  galleryDirty=false;
}
function goToCard(index) {
  const target=clamp(index,0,properties.length-1);
  const rect=cardMetrics[target];
  const x=clamp(rect.left+rect.width/2-gallery.clientWidth/2,0,galleryDistance);
  if(pinned) window.scrollTo({top:metrics.listings.top+x,behavior:'smooth'});
  else gallery.scrollTo({left:x,behavior:reduced?'instant':'smooth'});
}
$('.gallery-prev').addEventListener('click',()=>goToCard(activeCard-1));
$('.gallery-next').addEventListener('click',()=>goToCard(activeCard+1));
gallery.addEventListener('scroll',()=>{galleryDirty=true; requestFrame();},{passive:true});
gallery.addEventListener('keydown',event => {
  if(event.target!==gallery || !['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
  event.preventDefault();
  goToCard(event.key==='Home'?0:event.key==='End'?4:activeCard+(event.key==='ArrowRight'?1:-1));
});
// Tabbing to an offscreen listing also moves it into view in the pinned gallery.
gallery.addEventListener('focusin',event => {
  const card=event.target.closest('.property');
  if(card && pinned) { gallery.scrollLeft=0; goToCard(properties.indexOf(card)); }
});
let drag=null;
gallery.addEventListener('pointerdown',event => {
  if(event.pointerType!=='mouse' || event.button!==0 || event.target.closest('button,a')) return;
  drag={x:event.clientX,y:scrollY,startX:gallery.scrollLeft,moved:false}; gallery.setPointerCapture(event.pointerId);
});
gallery.addEventListener('pointermove',event => {
  if(!drag) return;
  const delta=drag.x-event.clientX;
  if(Math.abs(delta)>5) drag.moved=true;
  if(drag.moved) {
    if(pinned) window.scrollTo({top:clamp(drag.y+delta,metrics.listings.top,metrics.listings.top+galleryDistance),behavior:'instant'});
    else gallery.scrollLeft=clamp(drag.startX+delta,0,galleryDistance);
  }
});
for(const type of ['pointerup','pointercancel','lostpointercapture']) gallery.addEventListener(type,()=>{drag=null;});

// Two layers keep the previous preview visible beneath a fast directional wipe.
function showPreview(row,event) {
  if(reduced || !finePointer.matches || innerWidth<768) return;
  const wasActive=previewActive;
  previewActive=true; preview.classList.add('active');
  if(event) previewTarget={x:clamp(event.clientX+100,165,innerWidth-165),y:clamp(event.clientY-35,130,innerHeight-130)};
  if(!wasActive) previewPos={...previewTarget};
  if(row.dataset.preview!==previewKind) {
    const base=preview.querySelector('.preview-layer'), next=preview.querySelector('.preview-next');
    if(previewKind) base.innerHTML=scene(previewKind);
    wipeAnimation?.cancel(); next.innerHTML=scene(row.dataset.preview);
    wipeAnimation=next.animate([{clipPath:'inset(0 100% 0 0)'},{clipPath:'inset(0)'}],
      {duration:380,easing:'cubic-bezier(.76,0,.24,1)',fill:'forwards'});
    previewKind=row.dataset.preview;
  }
  requestFrame();
}
$$('.service-row').forEach(row => {
  row.addEventListener('pointerenter',event=>showPreview(row,event));
  row.addEventListener('pointermove',event=>{ if(previewActive) previewTarget={x:clamp(event.clientX+100,165,innerWidth-165),y:clamp(event.clientY-35,130,innerHeight-130)}; });
  row.addEventListener('pointerleave',()=>{previewActive=false;preview.classList.remove('active');});
  row.addEventListener('focus',()=>{
    const rect=row.getBoundingClientRect();
    showPreview(row,{clientX:innerWidth*.65,clientY:rect.top+rect.height/2});
  });
  row.addEventListener('blur',()=>{previewActive=false;preview.classList.remove('active');});
});

// Magnetic motion stays on the visible pill, with a restrained 8px attraction.
$$('.pill').forEach(button => {
  let rect;
  button.addEventListener('pointerenter',()=>{rect=button.getBoundingClientRect();});
  button.addEventListener('pointermove',event=>{
    if(reduced || !finePointer.matches || !rect) return;
    button.style.transform=`translate(${clamp((event.clientX-rect.left-rect.width/2)*.15,-8,8)}px,${clamp((event.clientY-rect.top-rect.height/2)*.22,-8,8)}px)`;
  });
  button.addEventListener('pointerleave',()=>{button.style.transform='';});
});
function updateCursorLabel(target) {
  const area=finePointer.matches && !reduced ? target?.closest?.('.gallery-window,.property button,.art-window,.service-row,.hero') || null : null;
  if(area===cursorArea) return;
  cursorArea=area;
  const label=area?.matches('.gallery-window') ? 'Drag' : area?.matches('.hero') ? 'Explore' : area ? 'View' : '';
  cursor.querySelector('span').textContent=label;
  cursor.classList.toggle('is-labelled',Boolean(label));
}
document.addEventListener('pointermove',event=>{
  if(!finePointer.matches || reduced) return;
  pointerInside=true;
  mouse={x:event.clientX,y:event.clientY}; cursor.style.opacity='1';
  updateCursorLabel(event.target);
  requestFrame();
},{passive:true});
document.addEventListener('pointerover',event=>updateCursorLabel(event.target),{passive:true});
document.addEventListener('pointerout',event=>{
  updateCursorLabel(event.relatedTarget);
  if(!event.relatedTarget) { pointerInside=false; cursor.style.opacity='0'; }
},{passive:true});
window.addEventListener('blur',()=>{pointerInside=false;updateCursorLabel(null);cursor.style.opacity='0';previewActive=false;preview.classList.remove('active');});
function heroPointer(event) {
  const rect=hero.getBoundingClientRect();
  pointerTarget={x:clamp((event.clientX-rect.left)/rect.width),y:1-clamp((event.clientY-rect.top)/rect.height)};
  if(!reduced) ripple=1;
  requestFrame();
}
hero.addEventListener('pointermove',heroPointer,{passive:true});
hero.addEventListener('pointerdown',heroPointer,{passive:true});
hero.addEventListener('pointerleave',()=>{pointerTarget={x:.5,y:.5};});

function rgbMix(from,to,p) { return `rgb(${from.map((n,index)=>Math.round(lerp(n,to[index],p))).join(' ')})`; }
function updateScroll(y) {
  if(!metrics.hero) return;
  const heroP=clamp((y-metrics.hero.top)/metrics.hero.height);
  if(visible.has(hero) && !reduced) heroArt.style.transform=`translate3d(0,${heroP*65}px,0) scale(${1+heroP*.035})`;
  const brandP=clamp((y-metrics['brand-moment'].top+innerHeight*.35)/Math.max(1,metrics['brand-moment'].height-innerHeight*.65));
  if(!brandContext || reduced) brandLetters.forEach((el,index) => el.style.transform=reduced?'':`translateY(${(1-brandP)*[24,-30,44,-18][index]}px) scale(${lerp(1.5,1,brandP)})`);
  if(visible.has($('.editorial')) && !reduced) metrics.tiles.forEach(({el,art,top,height}) => {
    const p=clamp((y+innerHeight-top)/(height+innerHeight));
    art.style.transform=`translate3d(0,${lerp(-35,35,p)}px,0)`;
  });
  // Local, scrubbed color morphs maintain the original paper / ink / amber palette.
  if(!reduced) {
    const entry=clamp((y+innerHeight-metrics.services.top)/(innerHeight*.75));
    $('.services').style.backgroundColor=rgbMix([250,248,245],[20,20,20],entry);
    const ink=rgbMix([20,20,20],[250,248,245],entry);
    $('.services').style.color=ink;
    $('.services').style.setProperty('--service-text',ink);
    const warm=clamp((y+innerHeight-metrics.stats.top)/(innerHeight+metrics.stats.height));
    $('.stats').style.backgroundColor=rgbMix([234,228,219],[206,155,115],warm*.64);
    const paper=clamp((y+innerHeight-metrics.statement.top)/(innerHeight*.75));
    $('.statement').style.backgroundColor=rgbMix([225,193,163],[250,248,245],paper);
  }
  if(visible.has($('.statement'))) {
    const p=clamp((y+innerHeight*.75-metrics.statement.top)/(metrics.statement.height*.7));
    statementWords.forEach((span,index)=>span.style.color=reduced || p>index/statementWords.length ? '#141414' : '#c9c4bc');
  }
  if(visible.has(listings) || galleryDirty) updateGallery(y);
  return {heroP,brandP};
}

function requestFrame() { if(!frameId && !document.hidden) frameId=requestAnimationFrame(frame); }
function frame(time) {
  frameId=0;
  const dt=Math.min((time-(previousTime||time))/1000,.05) || 1/60;
  previousTime=time;
  const y=scrollY, instantaneous=clamp((y-previousY)/dt,-3000,3000);
  velocity=lerp(velocity,instantaneous,1-Math.exp(-dt*10));
  const moved=y!==previousY; previousY=y;
  const progress=updateScroll(y) || {heroP:0,brandP:0};
  const elapsed=time-introStart;
  if(elapsed<1800 && !reduced) $('#intro-number').textContent=String(Math.round(clamp(elapsed/1650)*100)).padStart(2,'0');
  else $('#intro-number').textContent='100';
  if(visible.has(hero) && heroSky) {
    pointer.x=lerp(pointer.x,pointerTarget.x,1-Math.exp(-dt*7));
    pointer.y=lerp(pointer.y,pointerTarget.y,1-Math.exp(-dt*7));
    ripple*=Math.exp(-dt*1.3);
    heroSky.render(time/1000,progress.heroP,pointer,ripple);
  }
  if(visible.has(brand)) drawBrand(reduced?0:time/1000,progress.brandP);
  if(!reduced) {
    if(visible.has($('.services'))) {
      marqueeX-=(34+Math.min(Math.abs(velocity)*.16,340))*dt;
      const unit=marquee.unitWidth||1000;
      marqueeX=((marqueeX%unit)+unit)%unit-unit;
      marquee.style.transform=`translate3d(${marqueeX}px,0,0) skewX(${clamp(velocity*.002,-6,6)}deg)`;
    }
    if(visible.has($('.editorial'))) metrics.tiles.forEach(({el})=>el.style.transform=`skewY(${clamp(velocity*.00065,-1.8,1.8)}deg)`);
    if(finePointer.matches) {
      // Hit-test the actual point, including stationary pointers during scrolling
      // and captured gallery drags whose event target can remain behind the cursor.
      updateCursorLabel(pointerInside ? document.elementFromPoint(mouse.x,mouse.y) : null);
      cursorPos.x=lerp(cursorPos.x,mouse.x,1-Math.exp(-dt*20)); cursorPos.y=lerp(cursorPos.y,mouse.y,1-Math.exp(-dt*20));
      cursor.style.transform=`translate3d(${cursorPos.x+12}px,${cursorPos.y+12}px,0)`;
      if(previewActive) {
        previewPos.x=lerp(previewPos.x,previewTarget.x,1-Math.exp(-dt*9)); previewPos.y=lerp(previewPos.y,previewTarget.y,1-Math.exp(-dt*9));
        preview.style.transform=`translate3d(${previewPos.x}px,${previewPos.y}px,0) translate(-50%,-50%) rotate(${clamp((previewTarget.x-previewPos.x)*.025,-4,4)}deg)`;
      }
    }
  }
  const cursorMoving=Math.abs(cursorPos.x-mouse.x)+Math.abs(cursorPos.y-mouse.y)>1;
  if(!reduced && (elapsed<3100 || (visible.has(hero) && heroSky) || visible.has(brand) || visible.has($('.services')) || previewActive || cursorMoving || Math.abs(velocity)>.5 || moved)) requestFrame();
}
window.addEventListener('scroll',requestFrame,{passive:true});
document.addEventListener('visibilitychange',()=>{
  if(document.hidden) { cancelAnimationFrame(frameId); frameId=0; }
  else { previousTime=0; previousY=scrollY; requestFrame(); }
});
// No window.load gate, no wheel handler and no smooth-scroll dependency.
measure(); requestFrame();
createHeroSky(heroArt,reduced).then(sky=>{heroSky=sky;requestFrame();});
window.addEventListener('pagehide',event=>{
  if(event.persisted) return;
  cancelAnimationFrame(frameId); heroSky?.dispose(); observers.forEach(observer=>observer.disconnect());
},{once:true});
