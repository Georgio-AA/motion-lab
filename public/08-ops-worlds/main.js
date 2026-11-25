import { prefersReducedMotion } from '../shared/base.js';
import { createWorldGuide } from './world-guide.js';

const $ = selector => document.querySelector(selector);
const reduced = prefersReducedMotion();
const viewport = $('#viewport');
const simulation = $('.simulation');
const announcement = $('#announcement');
const tabs = [...document.querySelectorAll('[data-mode]')];
const selector = $('.world-toggle');
const airportCard = $('#airport-tab');
const airportInvitation = $('#airport-invitation');
const countdown = $('.world-countdown');
const countdownLabel = $('#countdown-label');
const countdownRing = $('.ring-fill');
const stageSwitch = $('#stage-switch');
const dispatchList = $('#dispatch-list');
const followCard = $('#follow-card');
const hoverTag = $('#hover-tag');
const progressBar = $('.progress');
const progressFill = $('.progress>span');
const followName = $('#follow-name');
const followCargo = $('#follow-cargo');
const followStatus = $('#follow-status');
const followPercent = $('#follow-percent');
const radarDots = [$('#radar-dot-0'),$('#radar-dot-1'),$('#radar-dot-2')];
const timelineSteps = [...document.querySelectorAll('.route-timeline i')];
const timelineDetails = [...document.querySelectorAll('.route-timeline small')];
let mode = 'warehouse', requestedMode = mode, paused = false;
let renderer, scene, camera, world, api, THREE, sun, ambient;
let phase = 'build', phaseTime = 0, simulationTime = 0;
let selected = null, hovered = null, nextIndex = 0, visible = true, ready = false;
let zoomTarget = 1, viewHeight = 28, frameAverage = 16.7, slowTime = 0, effects = true;
let quality = Math.min(devicePixelRatio, innerWidth < 760 ? 1.25 : 1.5);
let lastFrame = 0, raf = 0, failed = false;
let width = 1, height = 1, rect;
let target, targetGoal, offset, projection, raycaster, pointer;
let dispatchRows = [];
let currentThroughput = 0, currentOnTime = 0, countAge = 0;
let lastTimelineStep = -1;
let guideVisible = false, announcedCountdown = -1;

// Keep the invitation out of the simulation/traffic clock; it never repeats this visit.
const guide = createWorldGuide(reduced,{
  countdown(seconds,progress) {
    airportCard.classList.add('is-nudged');airportInvitation.hidden=true;countdown.hidden=false;
    countdownLabel.textContent=`Night shift starts in ${seconds}…`;
    countdownRing.style.strokeDashoffset=String(100*(1-progress));
    if(seconds!==announcedCountdown) {
      announcement.textContent=`Night shift starts in ${seconds} seconds.${seconds===5?' Interact with the world or selector to stay in the warehouse.':''}`;
      announcedCountdown=seconds;
    }
  },
  prompt() {
    airportCard.classList.add('is-nudged');
    announcement.textContent='See the airport: choose the Night shift card to explore the flights.';
  },
  cancel() {
    const wasCounting=!countdown.hidden;
    clearInvitation();
    if(wasCounting) announcement.textContent='Automatic world switch cancelled. Explore at your own pace.';
  },
  switch() {
    clearInvitation();switchWorld('airport');
    announcement.textContent='Taking you to the night shift. You can return to Warehouse with either world selector.';
  }
});
function clearInvitation() {
  airportCard.classList.remove('is-nudged');countdown.hidden=true;airportInvitation.hidden=false;
}
function selectTab(nextMode) {
  for(const tab of tabs) {
    const active=tab.dataset.mode===nextMode;
    tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;
    const invitation=tab.querySelector('.world-invitation');
    invitation.firstChild.textContent=active?'Viewing ':tab.dataset.mode==='airport'?'See the airport ':'Explore day shift ';
    invitation.querySelector('span').textContent=active?'✓':'↗';
  }
  simulation.setAttribute('aria-labelledby',`${nextMode}-tab`);
  $('#stage-switch-label').textContent=nextMode==='warehouse'?'Switch to Airport':'Back to Warehouse';
  $('#stage-switch-icon').textContent=nextMode==='warehouse'?'✈':'↶';
}

const worldCopy = {
  warehouse: { coordinate:'RELAY FULFILMENT / SITE 001', caption:'THE FULFILMENT ISLAND', sub:'A thousand tiny journeys. One beautiful flow.', unit:'orders / hour', dispatch:'Moving through', badge:'SHIPMENTS', column:'SHIPMENT / ROUTE', footer:'INBOUND & OUTBOUND', route:'A box’s journey', routeBadge:'R-2048', fleet:'Fleet active', total:8, throughput:1248, onTime:99.2, trend:'12.8%' },
  airport: { coordinate:'RELAY INTERNATIONAL / SITE 002', caption:'THE NIGHT SHIFT', sub:'From one horizon to the next. Never standing still.', unit:'moves / hour', dispatch:'Departures & arrivals', badge:'FLIGHTS', column:'FLIGHT / ROUTE', footer:'TERMINAL A · LOCAL TIME', route:'Eyes on the sky', routeBadge:'RADAR', fleet:'Gates active', total:3, throughput:42, onTime:98.4, trend:'8.6%' }
};

function setCopy() {
  const c = worldCopy[mode];
  document.body.dataset.world = mode;
  selectTab(mode);
  $('#site-coordinate').textContent=c.coordinate;
  $('#world-caption').textContent=c.caption;
  $('#world-caption-sub').textContent=c.sub;
  $('#throughput-unit').textContent=c.unit;
  $('#dispatch-title').textContent=c.dispatch;
  $('#dispatch-badge').textContent=c.badge;
  $('#list-column').textContent=c.column;
  $('#dispatch-footer').textContent=c.footer;
  $('#route-title').textContent=c.route;
  $('#route-badge').textContent=c.routeBadge;
  $('#fleet-label').textContent=c.fleet;
  $('#trend-value').textContent=c.trend;
  $('#route-content').hidden=mode==='airport';
  $('#radar').hidden=mode!=='airport';
  currentThroughput=0;currentOnTime=0;countAge=0;lastTimelineStep=-1;
  renderDispatch();
}
function renderDispatch() {
  dispatchList.replaceChildren();dispatchRows=[];
  const entities=world ? world.entities.filter(e=>mode==='airport' ? e.type==='plane' : e.type==='truck'||e.type==='van').slice(0,3) : [];
  for(let i=0;i<3;i++) {
    const e=entities[i];
    const row=document.createElement('button');row.className='dispatch-row';
    const info=document.createElement('span'),id=document.createElement('span'),detail=document.createElement('span'),status=document.createElement('span');
    id.className='dispatch-id';detail.className='dispatch-detail';status.className='dispatch-status';
    id.textContent=e ? e.id : mode==='warehouse' ? `TR-${204+i}` : `RL ${[218,406,731][i]}`;
    detail.textContent=e ? (mode==='airport' ? e.cargo : e.type==='van'?'Outbound · Last mile':`Inbound · Dock 0${i+1}`) : mode==='airport' ? ['OSL → LHR','AMS → LHR','LHR → CPH'][i] : ['Inbound · Dock 01','Inbound · Dock 02','Last-mile delivery'][i];
    info.append(id,detail);row.append(info,status);
    row.addEventListener('click',()=> { if(e) follow(e);else announcement.textContent='The 3D simulation is unavailable. The overview is still accessible.'; });
    row.setAttribute('aria-label',`Follow ${id.textContent}: ${detail.textContent}`);
    dispatchList.append(row);
    const letters=[];
    if(mode==='airport') for(let j=0;j<6;j++) { const flap=document.createElement('span');flap.className='flap';status.append(flap);letters.push(flap); }
    dispatchRows.push({row,status,letters,entity:e,last:''});
  }
}
function release() {
  selected=null;followCard.hidden=true;
  if(targetGoal) targetGoal.set(0,0,0);
}
function follow(entity) {
  if(!ready||phase==='drop') return;
  selected=entity;hovered=null;hoverTag.hidden=true;followCard.hidden=false;
  followName.textContent=entity.id;
  followCargo.textContent=entity.cargo;
  zoomTarget=innerWidth<760 ? 1.2 : 1.38;
  announcement.textContent=`Following ${entity.id}. ${entity.cargo}. Escape releases the camera.`;
  updatePanels(.2);
}

// Both selectors use the existing fold/camera transition and the same renderer.
function switchWorld(nextMode) {
  clearInvitation();
  requestedMode=nextMode;
  if(requestedMode===mode && phase!=='drop') return;
  release();
  if(!ready) { mode=requestedMode;setCopy();if(failed)updatePanels(3);return; }
  if(phase==='drop') return;
  if(reduced) { replaceWorld();return; }
  phase='drop';phaseTime=0;simulation.classList.add('switching');
  document.body.dataset.world=requestedMode;
  $('#transition-name').textContent=requestedMode==='airport' ? 'A new horizon.' : 'A fresh perspective.';
  selectTab(requestedMode);
}
tabs.forEach(tab=>tab.addEventListener('click',()=> {guide.cancel();switchWorld(tab.dataset.mode);}));
selector.addEventListener('keydown',event=> {
  if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
  event.preventDefault();
  const current=tabs.indexOf(document.activeElement),direction=event.key==='ArrowLeft'?-1:1;
  const index=event.key==='Home'?0:event.key==='End'?tabs.length-1:(Math.max(0,current)+direction+tabs.length)%tabs.length;
  tabs[index].focus();tabs[index].click();
});
stageSwitch.addEventListener('click',()=> {guide.cancel();switchWorld(requestedMode==='warehouse'?'airport':'warehouse');});
// Intent takes priority, including keyboard focus, hover, touch and scrolling over the canvas.
for(const surface of [selector,simulation,$('#follow-next')]) {
  for(const type of ['pointerdown','pointermove','keydown','focusin','wheel']) surface.addEventListener(type,()=>guide.cancel(),{passive:true});
}
$('#release').addEventListener('click',release);
$('#zoom-in').addEventListener('click',()=>zoomTarget=Math.min(2.1,zoomTarget*1.18));
$('#zoom-out').addEventListener('click',()=>zoomTarget=Math.max(.65,zoomTarget/1.18));
$('#reset-view').addEventListener('click',()=> { release();zoomTarget=1;if(targetGoal)targetGoal.set(0,0,0); });
$('#pause').addEventListener('click',()=> {
  paused=!paused;$('#pause').textContent=paused ? '▶' : 'Ⅱ';$('#pause').setAttribute('aria-pressed',String(paused));$('#pause').setAttribute('aria-label',paused ? 'Resume simulation' : 'Pause simulation');
  document.body.classList.toggle('simulation-paused',paused);
  announcement.textContent=paused ? 'Simulation paused.' : 'Simulation resumed.';
});
$('#follow-next').addEventListener('click',()=> { if(world&&ready) { follow(world.entities[nextIndex%world.entities.length]);nextIndex++; }else announcement.textContent='The 3D simulation is unavailable.'; });
document.addEventListener('keydown',event=> { if(event.key==='Escape')release(); });
const deck=$('.panel-deck');
deck.addEventListener('scroll',()=> {
  const index=Math.round(deck.scrollLeft/(deck.clientWidth-24));
  document.querySelectorAll('.sheet-pagination i').forEach((dot,i)=>dot.classList.toggle('active',i===index));
},{passive:true});

function replaceWorld() {
  release();scene.remove(world.group);api.disposeWorld(world);world=null;
  mode=requestedMode;
  try {
    world=api.createWorld(mode);scene.add(world.group);
    simulationTime=0;phaseTime=0;phase='build';nextIndex=0;zoomTarget=1;targetGoal.set(0,0,0);
    setCopy();sun.intensity=mode==='airport' ? 2 : 3.2;ambient.intensity=mode==='airport' ? 1.25 : 2.25;
    sun.color.set(mode==='airport' ? 0xb8cfff : 0xfff5df);
    announcement.textContent=mode==='airport' ? 'Airport world ready. Select a flight to follow its journey.' : 'Warehouse world ready. Select a vehicle to follow.';
  }catch(error) { failGracefully(error); }
}

// DOM updates are throttled to 4 Hz. Character flaps only animate changed cells.
function updatePanels(delta) {
  countAge+=delta;
  const c=worldCopy[mode],ease=1-Math.exp(-countAge*2.4);
  const completed=world ? world.completed : 0;
  currentThroughput=Math.round((c.throughput+completed*(mode==='airport' ? 1 : 6))*ease);
  currentOnTime=c.onTime*ease;
  $('#throughput').textContent=currentThroughput.toLocaleString('en-US');
  $('#on-time').textContent=`${currentOnTime.toFixed(1)}%`;
  const active=world ? (mode==='airport' ? world.entities.filter(e=>e.type==='plane'&&e.state.z< -1.4&&e.state.y<1).length : world.entities.length) : c.total;
  $('#fleet').firstChild.textContent=String(active).padStart(2,'0');
  $('.metric-divider').textContent=` / ${String(c.total).padStart(2,'0')}`;
  for(const r of dispatchRows) {
    const status=r.entity ? r.entity.state.status : ['Arriving','Loading at dock','Out for delivery'][dispatchRows.indexOf(r)];
    if(mode==='airport') {
      const text=(status==='At gate' ? 'AT GTE' : status==='On approach' ? 'APPRCH' : status==='Landing' ? 'LANDED' : status==='Takeoff'||status==='Airborne' ? 'DEPART' : status==='Pushback' ? 'PUSHBK' : status==='Hold short'||status==='Awaiting pushback'||status==='Holding pattern'?'HOLD  ':status==='Line up'?'LINEUP':'TAXI  ');
      for(let i=0;i<6;i++) if(r.letters[i].textContent!==text[i]) { r.letters[i].textContent=text[i];r.letters[i].classList.remove('flip');void r.letters[i].offsetWidth;r.letters[i].classList.add('flip');r.letters[i].style.animationDelay=`${i*25}ms`; }
      r.row.setAttribute('aria-label',`Follow ${r.entity ? r.entity.id : 'flight'}: ${status}`);
    }else r.status.textContent=status==='Loading at dock' ? 'At dock' : status==='Out for delivery' ? 'In transit' : status==='Next shipment' ? 'Scheduled' : status;
    r.last=status;
  }
  if(selected) {
    followStatus.textContent=selected.state.status;
    const percent=Math.round(selected.state.progress*100);
    followPercent.textContent=`${percent}%`;
    progressFill.style.width=`${percent}%`;progressBar.setAttribute('aria-valuenow',String(percent));
  }
  if(mode==='airport'&&world) for(let i=0;i<3;i++) {
    const s=world.entities[i].state;
    radarDots[i].style.left=`${Math.max(8,Math.min(88,50+s.x*2))}%`;
    radarDots[i].style.top=`${Math.max(8,Math.min(88,50+s.z*3))}%`;
  }
  if(mode==='warehouse'&&world) {
    const actor=(selected&&selected.type==='forklift'?selected:world.entities[0]).actor;
    const step=actor.index<1?0:actor.index===1?1:actor.index<5?2:3;
    if(step!==lastTimelineStep) {
      timelineSteps.forEach((dot,i)=> {dot.classList.toggle('done',i<step);dot.classList.toggle('current',i===step);});
      lastTimelineStep=step;
    }
    $('#route-badge').textContent=`${actor.id} / ${actor.cycles+1}`;
    timelineDetails.forEach((detail,i)=>detail.textContent=i<step?'Complete':i===step?'Just now':'Up next');
  }
}

function resize() {
  rect=viewport.getBoundingClientRect();width=rect.width;height=rect.height;
  if(!renderer||height===0) return;
  const aspect=width/height;
  viewHeight=Math.max(innerWidth<760 ? 29 : 28,39/aspect);
  camera.left=-viewHeight*aspect/2;camera.right=viewHeight*aspect/2;camera.top=viewHeight/2;camera.bottom=-viewHeight/2;camera.updateProjectionMatrix();
  renderer.setSize(width,height,false);
}

// Mouse drag and two-finger touch pan; one-finger touch and ordinary wheel keep native scrolling.
function setupGestures() {
  const touches=new Map();let dragX=0,dragY=0,downX=0,downY=0,dragged=false,pinchDistance=0,touchMoved=false;
  let twoFingerGesture=false,touchCenterX=0,touchCenterY=0,touchDistance=0;
  function pan(dx,dy) {
    if(selected)release();
    const scale=viewHeight/(height*zoomTarget);
    targetGoal.x=THREE.MathUtils.clamp(targetGoal.x-(dx*.75+dy*.8)*scale,-7,7);
    targetGoal.z=THREE.MathUtils.clamp(targetGoal.z+(dx*.65-dy*.9)*scale,-6,6);
  }
  function pick(x,y) {
    rect=viewport.getBoundingClientRect();pointer.set((x-rect.left)/width*2-1,-(y-rect.top)/height*2+1);
    scene.updateMatrixWorld();raycaster.setFromCamera(pointer,camera);
    const hits=raycaster.intersectObjects(world.hitTargets,false);
    return hits.length ? hits[0].object.userData.entity : null;
  }
  viewport.addEventListener('pointerdown',event=> {
    if(!ready||phase==='drop') return;
    downX=dragX=event.clientX;downY=dragY=event.clientY;dragged=false;
    if(event.pointerType==='touch') {
      touches.set(event.pointerId,{x:event.clientX,y:event.clientY});
      if(touches.size===2) { viewport.style.touchAction='none';const pts=[...touches.values()];pinchDistance=Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y);touchMoved=true; }
    }else { viewport.setPointerCapture(event.pointerId);viewport.classList.add('dragging'); }
  });
  viewport.addEventListener('pointermove',event=> {
    if(!ready||phase==='drop')return;
    if(event.pointerType==='touch'&&touches.has(event.pointerId)) {
      if(twoFingerGesture) return;
      const old=touches.get(event.pointerId);const dx=event.clientX-old.x,dy=event.clientY-old.y;old.x=event.clientX;old.y=event.clientY;
      if(touches.size===2) {
        const pts=[...touches.values()],dist=Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y);
        if(pinchDistance>0)zoomTarget=THREE.MathUtils.clamp(zoomTarget*dist/pinchDistance,.65,2.1);
        pinchDistance=dist;pan(dx*.5,dy*.5);dragged=true;
      }else if(Math.hypot(event.clientX-downX,event.clientY-downY)>8)dragged=true;
      return;
    }
    if(event.buttons===1&&viewport.hasPointerCapture(event.pointerId)) {
      if(Math.hypot(event.clientX-downX,event.clientY-downY)>4)dragged=true;
      pan(event.clientX-dragX,event.clientY-dragY);dragX=event.clientX;dragY=event.clientY;hovered=null;hoverTag.hidden=true;
    }else if(event.pointerType==='mouse') {
      const previous=hovered;hovered=pick(event.clientX,event.clientY);
      hoverTag.hidden=!hovered||!!selected;
      if(hovered&&!selected) {
        hoverTag.querySelector('strong').textContent=hovered.id;hoverTag.querySelector('span').textContent=`${hovered.cargo} · ETA ${hovered.state.eta}s`;
        if(hovered!==previous) {hoverTag.style.left=`${event.clientX-rect.left}px`;hoverTag.style.top=`${event.clientY-rect.top}px`;}
      }
    }
  });
  viewport.addEventListener('pointerup',event=> {
    if(!ready)return;
    if(!dragged&&!touchMoved) { const entity=pick(event.clientX,event.clientY);if(entity)follow(entity); }
    touches.delete(event.pointerId);if(touches.size===0) {touchMoved=false;viewport.style.touchAction='pan-y';}
    if(viewport.hasPointerCapture(event.pointerId))viewport.releasePointerCapture(event.pointerId);
    viewport.classList.remove('dragging');
  });
  viewport.addEventListener('pointercancel',event=> { touches.delete(event.pointerId);if(!touches.size) { viewport.style.touchAction='pan-y';touchMoved=false; }viewport.classList.remove('dragging'); });
  // Cancel only two-finger browser gestures; a single finger can always scroll the page.
  viewport.addEventListener('touchstart',event=> {
    if(event.touches.length!==2||!ready) return;
    event.preventDefault();twoFingerGesture=true;touchMoved=true;
    const a=event.touches[0],b=event.touches[1];touchCenterX=(a.clientX+b.clientX)/2;touchCenterY=(a.clientY+b.clientY)/2;touchDistance=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);
  },{passive:false});
  viewport.addEventListener('touchmove',event=> {
    if(event.touches.length!==2||!twoFingerGesture||!ready) return;
    event.preventDefault();dragged=true;
    const a=event.touches[0],b=event.touches[1],x=(a.clientX+b.clientX)/2,y=(a.clientY+b.clientY)/2,distance=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);
    if(touchDistance>0)zoomTarget=THREE.MathUtils.clamp(zoomTarget*distance/touchDistance,.65,2.1);
    pan(x-touchCenterX,y-touchCenterY);touchCenterX=x;touchCenterY=y;touchDistance=distance;
  },{passive:false});
  viewport.addEventListener('touchend',event=> {if(event.touches.length===0) {twoFingerGesture=false;touchMoved=false;}});
  viewport.addEventListener('touchcancel',()=> {twoFingerGesture=false;touchMoved=false;});
  viewport.addEventListener('pointerleave',()=> { hovered=null;hoverTag.hidden=true; });
  viewport.addEventListener('dblclick',event=> { event.preventDefault();zoomTarget=Math.min(2.1,zoomTarget*1.35); });
  viewport.addEventListener('wheel',event=> { if(event.shiftKey||event.ctrlKey) { event.preventDefault();zoomTarget=THREE.MathUtils.clamp(zoomTarget*Math.exp(-event.deltaY*.002),.65,2.1); } },{passive:false});
  viewport.addEventListener('keydown',event=> {
    if(event.key==='+'||event.key==='=') {event.preventDefault();$('#zoom-in').click();}
    if(event.key==='-') {event.preventDefault();$('#zoom-out').click();}
    if(event.key==='Enter') {event.preventDefault();$('#follow-next').click();}
    if(event.altKey&&event.key.startsWith('Arrow')) { event.preventDefault();pan(event.key==='ArrowLeft' ? 30 : event.key==='ArrowRight' ? -30 : 0,event.key==='ArrowUp' ? 30 : event.key==='ArrowDown' ? -30 : 0); }
  });
}

function failGracefully(error) {
  guide.cancel();
  failed=true;ready=false;cancelAnimationFrame(raf);simulation.classList.remove('switching');release();
  if(world) {scene.remove(world.group);api.disposeWorld(world);world=null;}
  if(renderer) {renderer.dispose();renderer.domElement.remove();}
  $('#fallback').hidden=false;$('#load-message').textContent='A little world, at a glance. The 3D view is unavailable on this device.';
  viewport.setAttribute('aria-label','Static miniature operations illustration. Interactive 3D is unavailable.');
  $('#follow-next').disabled=true;$('.camera-controls').querySelectorAll('button').forEach(button=>button.disabled=true);
  renderDispatch();updatePanels(3);
  // A recoverable graphics failure should never interrupt native scrolling or the world toggle.
  console.info('Relay: static fallback active.',error.message);
}

// One renderer lives for the whole visit; old world resources are disposed before rebuilding.
async function initialize() {
  try {
    [THREE,api]=await Promise.all([import('three'),import('./world.js')]);
    renderer=new THREE.WebGLRenderer({alpha:true,antialias:quality>1,powerPreference:'low-power'});
    renderer.setPixelRatio(quality);renderer.setClearColor(0x000000,0);renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.domElement.setAttribute('aria-hidden','true');
    renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
    scene=new THREE.Scene();camera=new THREE.OrthographicCamera(-20,20,14,-14,.1,160);
    camera.layers.enable(0);
    ambient=new THREE.HemisphereLight(0xffffff,0x879aac,2.25);sun=new THREE.DirectionalLight(0xfff5df,3.2);sun.position.set(-8,18,12);scene.add(ambient,sun);
    target=new THREE.Vector3();targetGoal=new THREE.Vector3();offset=new THREE.Vector3();projection=new THREE.Vector3();pointer=new THREE.Vector2();raycaster=new THREE.Raycaster();raycaster.layers.set(1);
    world=api.createWorld(mode);scene.add(world.group);viewport.append(renderer.domElement);
    $('#fallback').hidden=true;ready=true;
    if(mode==='airport') {sun.intensity=2;sun.color.set(0xb8cfff);ambient.intensity=1.25;}
    setCopy();resize();setupGestures();
    new ResizeObserver(resize).observe(viewport);
    new IntersectionObserver(entries=> { visible=entries[0].isIntersecting;guideVisible=entries[0].intersectionRatio>=.35;lastFrame=0;if(visible&&!raf&&!failed)raf=requestAnimationFrame(frame); },{threshold:[0,.35]}).observe(viewport);
    setInterval(()=> {
      if(!visible||document.hidden||failed) return;
      updatePanels(.25);
      if(hovered&&!selected) {
        hovered.group.getWorldPosition(projection);projection.y+=2;projection.project(camera);
        hoverTag.style.left=`${Math.max(85,Math.min(width-85,(projection.x*.5+.5)*width))}px`;
        hoverTag.style.top=`${(-projection.y*.5+.5)*height}px`;
      }
    },250);
    document.addEventListener('visibilitychange',()=> {lastFrame=0;if(!document.hidden&&visible&&!raf&&!failed)raf=requestAnimationFrame(frame);});
    renderer.domElement.addEventListener('webglcontextlost',event=> {event.preventDefault();failGracefully(new Error('Graphics context was lost'));});
    lastFrame=0;raf=requestAnimationFrame(frame);
  }catch(error) {failGracefully(error);}
}

function frame(now) {
  raf=0;
  if(!visible||document.hidden||failed)return;
  const raw=lastFrame ? now-lastFrame : 16.7;
  const dt=Math.min(raw/1000,.05);lastFrame=now;
  try {
    phaseTime+=dt;
    if(!paused)simulationTime+=dt*(reduced ? .45 : 1);
    if(phase==='drop'&&phaseTime>1.05)replaceWorld();
    if(failed)return;
    if(phase==='build'&&phaseTime>1.8) {simulation.classList.remove('switching');phase='live';}
    if(guideVisible&&!paused&&mode==='warehouse'&&phase==='live') guide.tick(dt);
    api.updateWorld(world,simulationTime,paused ? 0 : dt,phaseTime,phase,reduced,effects&&!paused);
    if(selected) { selected.group.getWorldPosition(targetGoal);targetGoal.y*=.45; }
    const damping=1-Math.exp(-dt*(reduced ? 15 : 4));target.lerp(targetGoal,damping);
    camera.zoom+=(zoomTarget-camera.zoom)*damping;camera.updateProjectionMatrix();
    const swoop=reduced ? 0 : phase==='drop' ? Math.sin(Math.min(phaseTime/1.05,1)*Math.PI)*.25 : Math.exp(-phaseTime*3)*-.2;
    const azimuth=.76+swoop;
    offset.set(Math.sin(azimuth)*33,27,Math.cos(azimuth)*33);camera.position.copy(target).add(offset);camera.lookAt(target);
    renderer.render(scene,camera);
    // Sustained slow frames lower resolution first, then soften optional lighting motion.
    frameAverage=frameAverage*.96+Math.min(raw,80)*.04;
    if(phaseTime>2&&frameAverage>20)slowTime+=dt;else slowTime=Math.max(0,slowTime-dt);
    // Never drop below 1x: a blurry world reads worse than slightly simpler lighting.
    if(slowTime>2) {if(quality>1) {quality=Math.max(1,quality-.25);renderer.setPixelRatio(quality);resize();}else effects=false;slowTime=0;}
    raf=requestAnimationFrame(frame);
  }catch(error) {failGracefully(error);}
}

setCopy();
initialize();
