import { createSoundscape } from './audio.js';
import '../shared/base.js';

const $=selector=>document.querySelector(selector);
const reducedQuery=matchMedia('(prefers-reduced-motion: reduce)');
const finePointer=matchMedia('(pointer: fine)');
const finishes={
  clay:{name:'Clay',shell:'#c4532f',fabric:'#795a46',accent:'#f49166',stage:'#171715',light:'#373028',text:'#f0ece3',muted:'#bbb5a8',paper:'#eee9df',ink:'#262720',filter:'none'},
  moss:{name:'Moss',shell:'#85977b',fabric:'#465044',accent:'#c1d8a6',stage:'#18221c',light:'#344d3a',text:'#e8efdf',muted:'#afbcaa',paper:'#e1e8d9',ink:'#26352b',filter:'hue-rotate(60deg) saturate(.52)'},
  bone:{name:'Bone',shell:'#ded5c5',fabric:'#a29b8c',accent:'#9b603f',stage:'#dad4c8',light:'#f0eadd',text:'#292a26',muted:'#595c51',paper:'#f5f1e8',ink:'#33362e',filter:'saturate(.15) brightness(1.35)'},
  ink:{name:'Ink',shell:'#414c5d',fabric:'#303843',accent:'#a3b9e0',stage:'#11171f',light:'#29384c',text:'#edf0f4',muted:'#a8b3c3',paper:'#e1e6ed',ink:'#242e3f',filter:'hue-rotate(180deg) saturate(.35) brightness(.65)'}
};
let selected='clay',experience=null,storyTrigger=null,scrubProgress=0;
const audio=createSoundscape();

// Shopping works before either optional animation or WebGL has loaded.
const bag=new Map(),drawer=$('#bag-drawer'),bagButton=$('#open-bag');
let previousFocus=null,drawerTimer=0,plinth=false;
function money(value){return '$'+value.toLocaleString('en-US');}
function openBag(opener){clearTimeout(drawerTimer);previousFocus=opener||document.activeElement;if(!drawer.open)drawer.showModal();$('#close-bag').focus();}
function closeBag(){drawer.close();previousFocus?.focus({preventScroll:true});}
bagButton.addEventListener('click',()=>openBag(bagButton));$('#close-bag').addEventListener('click',closeBag);
document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',closeBag));
drawer.addEventListener('cancel',e=>{e.preventDefault();closeBag();});
drawer.addEventListener('click',e=>{if(e.target===drawer){const r=drawer.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeBag();}});
drawer.addEventListener('keydown',e=>{
  if(e.key!=='Tab')return;
  const focusable=Array.from(drawer.querySelectorAll('button:not(:disabled),a[href],input')).filter(el=>el.getClientRects().length);
  const first=focusable[0],last=focusable[focusable.length-1];
  if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
});
function renderBag(focusKey){
  let quantity=0,total=plinth?69:0;
  const fragment=document.createDocumentFragment();
  for(const [key,count] of bag){
    const finish=finishes[key];quantity+=count;total+=count*289;
    const item=document.createElement('article');item.className='bag-item';
    // Only fixed finish identifiers and local quantities enter this markup.
    item.innerHTML=`<div class="bag-thumb"><img src="speaker.svg" alt="Onda One in ${finish.name}" width="100" height="126" style="filter:${finish.filter}"></div><div><h3>Onda One</h3><p>${finish.name} / Wireless speaker</p><div class="bag-item-bottom"><div class="quantity-controls"><button data-key="${key}" data-quantity="-1" aria-label="Decrease ${finish.name} quantity">−</button><output aria-label="${finish.name} quantity">${count}</output><button data-key="${key}" data-quantity="1" aria-label="Increase ${finish.name} quantity" ${count>=9?'disabled':''}>+</button></div><span>${money(count*289)}</span></div><button class="remove-item" data-key="${key}" data-remove aria-label="Remove ${finish.name} speaker">Remove</button></div>`;
    fragment.append(item);
  }
  if(plinth){const item=document.createElement('article');item.className='bag-item';item.innerHTML='<div class="bag-thumb"><div class="upsell-art" aria-hidden="true"></div></div><div><h3>The Onda plinth</h3><p>Solid oak / $69</p><button class="remove-item" data-remove-plinth>Remove plinth</button></div>';fragment.append(item);}
  $('#bag-items').replaceChildren(fragment);$('#bag-count').textContent=quantity+(plinth?1:0);bagButton.setAttribute('aria-label',`Open bag, ${quantity+(plinth?1:0)} items`);
  $('#bag-empty').hidden=total>0;$('#bag-filled').hidden=total===0;$('#bag-total').textContent=money(total);
  $('#shipping-progress').style.width=Math.min(100,total/350*100)+'%';
  $('#shipping-message').textContent=total>=350?'Your bag qualifies for free shipping.':`${money(350-total)} away from free shipping.`;
  $('#add-plinth').disabled=plinth;$('#add-plinth').textContent=plinth?'Plinth added ✓':'Add plinth · $69 +';
  if(focusKey){const el=drawer.querySelector(focusKey);(el||$('#close-bag')).focus({preventScroll:true});}
}
$('#bag-items').addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.hasAttribute('data-remove-plinth'))plinth=false;
  else if(b.hasAttribute('data-remove'))bag.delete(b.dataset.key);
  else if(b.dataset.quantity){const count=(bag.get(b.dataset.key)||0)+Number(b.dataset.quantity);if(count<=0)bag.delete(b.dataset.key);else bag.set(b.dataset.key,Math.min(9,count));}
  renderBag(b.dataset.quantity?`[data-key="${b.dataset.key}"][data-quantity="${b.dataset.quantity}"]`:null);
  if(!document.activeElement||document.activeElement===document.body)$('#close-bag').focus();
  $('#bag-status').textContent='Bag updated. '+$('#bag-total').textContent+' subtotal.';
});
$('#add-plinth').addEventListener('click',()=>{plinth=true;renderBag();$('#bag-status').textContent='Onda plinth added to your concept bag.';});
function flyToBag(button){
  if(reducedQuery.matches)return;
  const start=button.getBoundingClientRect(),end=bagButton.getBoundingClientRect();
  const flying=document.createElement('div');flying.className='flying-product';flying.innerHTML='<img src="speaker.svg" alt="">';flying.style.filter=finishes[selected].filter;flying.style.left=start.left+start.width/2-40+'px';flying.style.top=start.top-60+'px';document.body.append(flying);
  const dx=end.left+end.width/2-(start.left+start.width/2),dy=end.top+end.height/2-(start.top-10);
  flying.animate([{transform:'translate(0,0) rotate(-14deg) scale(1)',opacity:1},{transform:`translate(${dx*.52}px,${Math.min(-140,dy*.7)}px) rotate(12deg) scale(.7)`,opacity:1,offset:.5},{transform:`translate(${dx}px,${dy}px) rotate(35deg) scale(.1)`,opacity:0}],{duration:650,easing:'cubic-bezier(.4,0,.2,1)'}).finished.then(()=>flying.remove()).catch(()=>flying.remove());
}
document.querySelectorAll('[data-add]').forEach(button=>button.addEventListener('click',()=>{
  bag.set(selected,Math.min(9,(bag.get(selected)||0)+1));renderBag();flyToBag(button);
  $('#bag-status').textContent=`Onda One in ${finishes[selected].name} added to your concept bag.`;
  bagButton.classList.remove('bump');setTimeout(()=>bagButton.classList.add('bump'),reducedQuery.matches?0:450);
  clearTimeout(drawerTimer);drawerTimer=setTimeout(()=>openBag(button),reducedQuery.matches?0:680);
}));

// The new page snapshot expands from the clicked finish: a true whole-world wipe.
let paletteTransition=null,paletteVersion=0;
function applyPalette(key,snapshot=false){
  selected=key;const f=finishes[key],style=document.documentElement.style;
  for(const [property,value] of Object.entries({'--stage':f.stage,'--stage-light':f.light,'--text':f.text,'--muted':f.muted,'--accent':f.accent,'--paper':f.paper,'--paper-ink':f.ink,'--finish':f.shell,'--product-filter':f.filter,'--line':key==='bone'?'rgba(40,42,38,.23)':'rgba(240,236,227,.2)'}))style.setProperty(property,value);
  document.body.dataset.finish=key;$('meta[name="theme-color"]').content=f.stage;
  document.querySelectorAll('[data-finish-name]').forEach(el=>el.textContent=f.name);
  document.querySelectorAll('button[data-finish]').forEach(el=>{const active=el.dataset.finish===key;el.classList.toggle('selected',active);el.setAttribute('aria-pressed',String(active));});
  experience?.setFinish(f,snapshot);
}
document.querySelectorAll('button[data-finish]').forEach(button=>button.addEventListener('click',()=>{
  const key=button.dataset.finish;if(key===selected)return;
  const r=button.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2,radius=Math.hypot(Math.max(x,innerWidth-x),Math.max(y,innerHeight-y));
  const version=++paletteVersion;
  paletteTransition?.skipTransition();
  if(!reducedQuery.matches&&document.startViewTransition){
    document.documentElement.classList.add('palette-transition');
    paletteTransition=document.startViewTransition(()=>applyPalette(key,true));
    paletteTransition.ready.then(()=>document.documentElement.animate([{clipPath:`circle(0px at ${x}px ${y}px)`},{clipPath:`circle(${radius}px at ${x}px ${y}px)`}],{duration:850,easing:'cubic-bezier(.22,1,.36,1)',pseudoElement:'::view-transition-new(root)'})).catch(()=>{});
    paletteTransition.finished.finally(()=>{if(version===paletteVersion)document.documentElement.classList.remove('palette-transition');}).catch(()=>{});
  }else if(!reducedQuery.matches){
    document.querySelector('.finish-wipe')?.remove();const wipe=document.createElement('div');wipe.className='finish-wipe';wipe.style.setProperty('--wipe-color',finishes[key].stage);wipe.style.setProperty('--wipe-x',x+'px');wipe.style.setProperty('--wipe-y',y+'px');document.body.append(wipe);
    const animation=wipe.animate([{clipPath:`circle(0px at ${x}px ${y}px)`},{clipPath:`circle(${radius}px at ${x}px ${y}px)`}],{duration:550,fill:'forwards',easing:'cubic-bezier(.22,1,.36,1)'});
    applyPalette(key);animation.finished.then(()=>wipe.animate([{opacity:1},{opacity:0}],{duration:250}).finished).then(()=>wipe.remove()).catch(()=>wipe.remove());
  }else applyPalette(key);
}));

const sampleButton=$('#sample-button');
function syncAudio(){sampleButton.classList.toggle('playing',audio.playing);sampleButton.setAttribute('aria-pressed',String(audio.playing));$('#sample-label').textContent=audio.playing?'Pause sample':'Play a sample';$('.play-symbol').textContent=audio.playing?'Ⅱ':'▶';}
sampleButton.addEventListener('click',async()=>{
  if(audio.busy)return;
  sampleButton.disabled=true;$('#sample-label').textContent=audio.playing?'Pausing…':'Composing…';
  try{await audio.toggle();syncAudio();$('#audio-note').textContent=audio.playing?'“Slow current” / ORA original · 32-second loop':'An original soundscape. Best with headphones.';experience?.wake();}
  catch{syncAudio();$('#audio-note').textContent='Audio is unavailable in this browser. Enjoy the silent light study.';}
  finally{sampleButton.disabled=false;}
});
document.addEventListener('visibilitychange',()=>{if(document.hidden){audio.pause();syncAudio();}});

// One native scroll listener works before/without ScrollTrigger or WebGL.
const craft=$('#craft'),hero=$('#product'),sticky=$('#sticky-buy');
const buySection=$('#finish');
const buyBlockers=Array.from(document.querySelectorAll('.manifesto-strip,.section-heading,.spec-grid,.detail-row'));
const blockerTop=new Float64Array(buyBlockers.length),blockerBottom=new Float64Array(buyBlockers.length);
let scrollQueued=false,storyStart=0,storyEnd=1,heroEnd=1,buyStart=Infinity,buyReserve=120;
function measure(){
  heroEnd=hero.offsetHeight;storyStart=craft.getBoundingClientRect().top+scrollY;
  storyEnd=storyStart+Math.max(1,craft.offsetHeight-$('#story-viewport').offsetHeight);
  if(storyTrigger){storyStart=storyTrigger.start;storyEnd=storyTrigger.end;}
  buyStart=buySection.getBoundingClientRect().top+scrollY;
  const safeInset=Math.max(0,parseFloat(getComputedStyle(sticky).bottom)-(innerWidth<=700?12:20));
  buyReserve=(parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--buy-reserve'))||120)+safeInset;
  for(let i=0;i<buyBlockers.length;i++){
    const rect=buyBlockers[i].getBoundingClientRect();
    blockerTop[i]=rect.top+scrollY;blockerBottom[i]=rect.bottom+scrollY;
  }
  updateScroll();
}
function updateScroll(){
  // Hand the canvas over before the first story viewport becomes a blank stage.
  scrollQueued=false;const active=scrollY>=storyStart-innerHeight*.45&&scrollY<storyEnd+innerHeight;
  const progress=Math.max(0,Math.min(1,(scrollY-storyStart)/(storyEnd-storyStart)));
  experience?.setStory(storyTrigger?scrubProgress:progress,active);
  // Static content gets right of way. Story composition reserves the bottom band.
  let occluded=scrollY+innerHeight>=buyStart;
  const bandTop=scrollY+innerHeight-buyReserve,bandBottom=scrollY+innerHeight;
  for(let i=0;i<buyBlockers.length&&!occluded;i++){
    occluded=blockerBottom[i]>bandTop&&blockerTop[i]<bandBottom;
  }
  const buyVisible=scrollY>heroEnd-100&&!occluded;
  sticky.classList.toggle('visible',buyVisible);sticky.classList.toggle('occluded',occluded);
  // Invisible quick-buy controls must not receive keyboard focus.
  sticky.inert=!buyVisible;
  if(!experience){
    const rig=$('#visual-rig'),target=active?$('#story-viewport'):hero;
    if(rig.parentElement!==target)target.append(rig);
    $('#story-viewport').classList.toggle('room-active',progress>=.6);$('#story-progress').style.transform=`scaleX(${progress})`;
    const day=Math.max(0,Math.min(1,(progress-.66)/.16)),hour=Math.round(7+day*15);
    $('#room-time').textContent=String(hour).padStart(2,'0')+':00';$('#room-period').textContent=hour<12?'MORNING LIGHT':hour<18?'AFTERNOON GLOW':'ONE LAST TRACK';$('#time-progress').style.transform=`scaleX(${day})`;
  }
}
addEventListener('scroll',()=>{if(!scrollQueued){scrollQueued=true;requestAnimationFrame(updateScroll);}},{passive:true});
addEventListener('resize',measure,{passive:true});measure();
document.fonts?.ready.then(measure);

// Optional CDN setup is isolated; no awaited dependency can lock native scrolling.
function staticFallback(){
  document.body.classList.add('webgl-fallback');
  $('#hero-drag').setAttribute('aria-label','Onda One static product view. Interactive 3D is unavailable.');$('#hero-drag').tabIndex=-1;
  $('.rotation-note').textContent='A study in ceramic, knit and light.';
  updateScroll();
}
import('./scene.js').then(({createProductExperience})=>{
  try{experience=createProductExperience({audio,reducedQuery,initialFinish:finishes[selected]});document.body.classList.remove('webgl-fallback');measure();}
  catch{staticFallback();}
}).catch(staticFallback);

Promise.all([import('https://cdn.jsdelivr.net/npm/gsap@3.12.5/+esm'),import('https://cdn.jsdelivr.net/npm/gsap@3.12.5/ScrollTrigger.js/+esm')]).then(([g,s])=>{
  const gsap=g.gsap||g.default,ScrollTrigger=s.ScrollTrigger||s.default;gsap.registerPlugin(ScrollTrigger);
  const mm=gsap.matchMedia();
  mm.add('(prefers-reduced-motion: no-preference)',()=>{
    document.body.classList.add('gsap-story');
    const playhead={value:0};
    const timeline=gsap.to(playhead,{value:1,ease:'none',onUpdate:()=>{scrubProgress=playhead.value;updateScroll();},scrollTrigger:{trigger:craft,start:'top top',end:()=>'+='+Math.max(3200,innerHeight*4.4),pin:$('#story-viewport'),scrub:.35,invalidateOnRefresh:true,onRefresh:self=>{storyTrigger=self;measure();}}});
    storyTrigger=timeline.scrollTrigger;measure();
    return ()=>{timeline.scrollTrigger.kill();timeline.kill();storyTrigger=null;document.body.classList.remove('gsap-story');measure();};
  });
  // Count-ups run once, independently of the pinned story.
  const counts=document.querySelectorAll('[data-count]');
  const observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){const el=entry.target,target=Number(el.dataset.count);if(!reducedQuery.matches){const counter={value:0};gsap.to(counter,{value:target,duration:1.6,ease:'power3.out',onUpdate:()=>el.textContent=Math.round(counter.value)});}observer.unobserve(el);}},{threshold:.4});counts.forEach(el=>observer.observe(el));
}).catch(()=>{document.body.classList.remove('gsap-story');measure();});

// A light cursor and magnetic hover: event driven, no second permanent RAF loop.
const cursor=$('#cursor-ring');
if(finePointer.matches&&!reducedQuery.matches){
  document.addEventListener('pointermove',e=>{cursor.style.left=e.clientX+'px';cursor.style.top=e.clientY+'px';cursor.style.opacity='1';},{passive:true});
  document.addEventListener('pointerover',e=>{cursor.classList.toggle('hover',!!e.target.closest('button,a'));cursor.classList.toggle('drag',!!e.target.closest('.drag-surface'));});
  document.documentElement.addEventListener('pointerleave',()=>cursor.style.opacity='0');
  document.querySelectorAll('.magnetic').forEach(button=>{button.addEventListener('pointermove',e=>{if(reducedQuery.matches)return;const r=button.getBoundingClientRect();button.style.transform=`translate(${(e.clientX-r.left-r.width/2)*.08}px,${(e.clientY-r.top-r.height/2)*.12}px)`;});button.addEventListener('pointerleave',()=>button.style.transform='');});
}
