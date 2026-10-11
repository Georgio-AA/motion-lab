import { prefersReducedMotion } from '../shared/base.js';
import { districts, residents, createSimulation, updateSimulation, clamp } from './simulation.js';
import { createQualityController } from './performance.js';
import { createViewCamera, placeViewCamera } from './view.js';

const $ = id => document.getElementById(id);
const viewport = $('viewport'), workspace = document.querySelector('.workspace');
const reducedQuery = matchMedia('(prefers-reduced-motion: reduce)');
let reduced = prefersReducedMotion(), selected = -1, mode = 'town', elapsed = 0;
let autoTime = true, timeOfDay = 1, blindValue = 0, blindTarget = 0;
let logRevision = -1, lastTask = '', failed = false;
const agents = createSimulation();
const roomStates = ['Living room','Kitchen','Bedroom','Studio','Dining room','Bathroom'].map((name,i)=>({name,on:i===0||i===4}));
const app = { select: () => {}, release: () => {}, mode: () => {}, wake: () => {}, zoom: () => {}, reset: () => {}, building: () => {}, stop: () => {}, time: () => {}, hud: () => {} };
const rows = [], rowLabels = [], bubbles = [];
const card = $('agent-card'), buildingCard = $('building-card'), tooltip = $('world-tooltip');
const cardTask=$('card-task'), cardState=$('card-state'), cardPercent=$('card-percent');
const cardProgress=$('card-progress'), progressFill=cardProgress.firstElementChild;
const activityLog=$('activity-log'), activityLines=[];
const timeInput=$('time'), timeLabel=$('time-label');
const timeLabels=['Dawn · 06:00','Day · 12:00','Dusk · 18:00','Night · 00:00'];
// Reuse eighteen log rows, rather than creating DOM nodes during simulation frames.
for(let i=0;i<18;i++){
  const line=document.createElement('li'), stamp=document.createElement('time');
  const clock=document.createTextNode(''), message=document.createTextNode('');
  stamp.append(clock);line.append(stamp,message);line.hidden=true;activityLog.append(line);
  activityLines.push({line,stamp,clock,message});
}

// The ordinary controls work before any CDN or WebGL setup has completed.
function residentButton(index, withStatus = true) {
  const agent = agents[index], button = document.createElement('button');
  button.className = 'agent-row';
  button.innerHTML = '<span class="avatar" style="--robot:'+agent.color+'" aria-hidden="true"></span><span class="row-copy"><strong>'+agent.name+'</strong><small></small></span><span class="row-arrow" aria-hidden="true">↗</span>';
  button.querySelector('small').textContent = withStatus ? agent.status : agent.role;
  button.setAttribute('aria-label', agent.name+', '+agent.role+'. Follow resident.');
  button.setAttribute('aria-pressed','false');
  button.addEventListener('click',()=>selectAgent(index));
  return button;
}
agents.forEach((agent,i)=>{
  const button = residentButton(i); rows.push(button); rowLabels.push(button.querySelector('small')); $('agent-list').append(button);
  const bubble = document.createElement('div'); bubble.className = 'robot-bubble';
  bubble.textContent = agent.status; $('bubble-layer').append(bubble); bubbles.push(bubble);
});
districts.forEach((district,i)=>{
  const button=document.createElement('button');button.textContent=district.name;
  button.addEventListener('click',()=>selectBuilding(i));$('building-list').append(button);
});
function selectAgent(index) {
  if(mode!=='town') switchMode('town');
  selected=index;buildingCard.hidden=true;card.hidden=false;logRevision=-1;
  rows.forEach((row,i)=>row.setAttribute('aria-pressed',String(i===index)));
  workspace.classList.add('following');
  $('follow-state').textContent='Following '+agents[index].name;
  $('card-name').textContent=agents[index].name+' / RESIDENT 0'+(index+1);
  $('card-role').textContent=agents[index].role;
  $('announcement').textContent='Following '+agents[index].name+'. '+agents[index].status+'. Escape releases the camera.';
  updateCard();app.select(index);app.wake();
}
function release() {
  selected=-1;card.hidden=true;workspace.classList.remove('following');
  rows.forEach(row=>row.setAttribute('aria-pressed','false'));
  $('follow-state').textContent='Live local simulation';app.release();app.wake();
}
function updateCard() {
  if(selected<0) return;
  const agent=agents[selected],percent=Math.round(agent.progress*100);
  if(cardTask.textContent!==agent.status){cardTask.textContent=agent.status;app.hud();}
  const state=agent.phase==='walk'?'On the move':'At work';
  if(cardState.textContent!==state)cardState.textContent=state;
  if(cardPercent.textContent!==percent+'%')cardPercent.textContent=percent+'%';
  cardProgress.setAttribute('aria-valuenow',percent);
  progressFill.style.transform='scaleX('+agent.progress+')';
  if(lastTask!==agent.status){lastTask=agent.status;$('announcement').textContent=agent.name+': '+agent.status;}
  if(logRevision!==agent.revision) {
    const wasNearBottom=activityLog.scrollHeight-activityLog.scrollTop-activityLog.clientHeight<24;
    for(let i=0;i<activityLines.length;i++) {
      const row=activityLines[i], entry=agent.log[i];row.line.hidden=!entry;
      if(!entry)continue;
      const seconds=Math.floor(entry.time);
      row.clock.nodeValue=String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0');
      row.stamp.dateTime='PT'+seconds+'S';row.message.nodeValue=entry.text;
    }
    if(wasNearBottom||logRevision===-1)activityLog.scrollTop=activityLog.scrollHeight;
    logRevision=agent.revision;
  }
}
function selectBuilding(index) {
  if(mode!=='town')switchMode('town');
  release();buildingCard.hidden=false;
  const district=districts[index];
  $('building-name').textContent=district.name;$('building-description').textContent=district.description;
  $('building-agents').replaceChildren();
  residents.forEach((resident,i)=>{if(resident.home===index)$('building-agents').append(residentButton(i,false));});
  $('announcement').textContent=district.name+'. '+district.description;
  app.building(index);app.wake();
}
$('close-card').addEventListener('click',release);
$('close-building').addEventListener('click',()=>{buildingCard.hidden=true;app.wake();});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){release();buildingCard.hidden=true;tooltip.hidden=true;}
});
function switchMode(next) {
  mode=next;release();buildingCard.hidden=true;tooltip.hidden=true;
  $('town-panel').hidden=next!=='town';$('home-panel').hidden=next==='town';
  $('time-control').hidden=next!=='town';$('bubble-layer').hidden=next!=='town';
  document.querySelectorAll('[data-mode]').forEach(button=>{
    const active=button.dataset.mode===next;
    button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;
  });
  $('description').textContent=next==='town'?'Seven curious minds. Every step has a purpose.':'Slow down. Settle in. Make yourself at home.';
  $('world-name').textContent=next==='town'?'OUTPOST 01 / THE QUIET DESERT':'RESIDENCE 02 / THE WARM RETREAT';
  app.mode(next);app.wake();
}
document.querySelectorAll('[data-mode]').forEach(button=>{
  button.addEventListener('click',()=>switchMode(button.dataset.mode));
  button.addEventListener('keydown',event=>{
    if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
    event.preventDefault();
    const next=event.key==='Home'?'town':event.key==='End'?'home':mode==='town'?'home':'town';
    switchMode(next);$(next+'-tab').focus();
  });
});
function updateRooms(){
  roomStates.forEach(room=>{
    room.button.setAttribute('aria-pressed',String(room.on));
    room.button.lastElementChild.textContent=room.on?'On':'Off';
  });
  $('light-count').textContent='Lights on '+roomStates.filter(room=>room.on).length+'/6';
  app.wake();
}
roomStates.forEach(room=>{
  const button=document.createElement('button');button.className='room-pill';
  button.append(document.createTextNode(room.name),document.createElement('span'));
  button.addEventListener('click',()=>{room.on=!room.on;updateRooms();});
  room.button=button;$('room-list').append(button);
});
updateRooms();
$('all-on').addEventListener('click',()=>{roomStates.forEach(room=>room.on=true);updateRooms();});
$('all-off').addEventListener('click',()=>{roomStates.forEach(room=>room.on=false);updateRooms();});
document.querySelectorAll('[data-blind]').forEach(button=>button.addEventListener('click',()=>{
  blindTarget=button.dataset.blind==='stop'?blindValue:Number(button.dataset.blind);
  $('blind-state').textContent=button.dataset.blind==='stop'?'Stopped at '+Math.round(blindValue*100)+'%':blindTarget?'Lowering…':'Raising…';
  if(failed){blindValue=blindTarget;$('blind-state').textContent=blindValue?'Fully lowered':'Fully raised';}
  app.wake();
}));
$('time').addEventListener('input',()=>{
  autoTime=false;timeOfDay=Number($('time').value);
  $('auto-time').setAttribute('aria-pressed','false');$('auto-time').textContent='Resume cycle';
  updateTimeLabel();app.time();app.wake();
});
$('auto-time').addEventListener('click',()=>{
  autoTime=!autoTime;$('auto-time').setAttribute('aria-pressed',String(autoTime));
  $('auto-time').textContent=autoTime?'Auto cycle':'Resume cycle';app.wake();
});
function updateTimeLabel(){
  const label=timeLabels[Math.round(timeOfDay)];
  if(timeLabel.textContent!==label)timeLabel.textContent=label;
}
$('zoom-in').addEventListener('click',()=>app.zoom(1.22));
$('zoom-out').addEventListener('click',()=>app.zoom(1/1.22));
$('reset').addEventListener('click',()=>{release();buildingCard.hidden=true;app.reset();});

// A useful static composition survives blocked CDNs, failed setup or a lost context.
function fallback() {
  app.stop();failed=true;app.wake=()=>{};
  viewport.querySelector('canvas')?.remove();$('loading')?.remove();
  $('bubble-layer').hidden=true;tooltip.hidden=true;
  viewport.querySelector('.fallback-world')?.remove();viewport.querySelector('.fallback-note')?.remove();
  const world=document.createElement('div');world.className='fallback-world';
  const note=document.createElement('p');note.className='fallback-note';
  note.textContent='The 3D view is unavailable. You can still meet every resident and explore the controls.';
  viewport.append(note,world);
  const paint=next=>{
    world.replaceChildren();
    (next==='town'?agents:roomStates).forEach((item,i)=>{
      const button=document.createElement('button');
      button.textContent=item.name;const caption=document.createElement('small');
      caption.textContent=next==='town'?item.role:(item.on?'Lights on':'Lights off');button.append(caption);
      button.addEventListener('click',()=>{if(next==='town')selectAgent(i);else{item.on=!item.on;updateRooms();paint('home');}});
      world.append(button);
    });
  };
  app.select=()=>{card.style.transform='translate(20px, 380px)';};
  app.mode=paint;app.release=()=>{};app.building=()=>{};
  paint(mode);$('zoom-in').disabled=true;$('zoom-out').disabled=true;
}
let renderer;
const mobile=matchMedia('(max-width: 800px)').matches;
const lowTier=navigator.hardwareConcurrency<=4 || navigator.deviceMemory<=4;
const quality=createQualityController(devicePixelRatio,mobile,lowTier);
const debug=new URLSearchParams(location.search).has('debug');
try {
  const [THREE,{RoundedBoxGeometry},{mergeGeometries},{createWorld}]=await Promise.all([
    import('three'),import('three/addons/geometries/RoundedBoxGeometry.js'),
    import('three/addons/utils/BufferGeometryUtils.js'),import('./world.js')
  ]);
  renderer=new THREE.WebGLRenderer({antialias:quality.dpr===1,alpha:false,powerPreference:'high-performance'});
  init(THREE,RoundedBoxGeometry,mergeGeometries,createWorld);
} catch {
  renderer?.dispose();fallback();
}

function init(THREE,RoundedBoxGeometry,mergeGeometries,createWorld) {
  renderer.setPixelRatio(quality.dpr);
  renderer.shadowMap.enabled=false;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate=false;renderer.outputColorSpace=THREE.SRGBColorSpace;
  const scene=new THREE.Scene();
  const world=createWorld(THREE,RoundedBoxGeometry,residents,districts,mergeGeometries,debug);
  const {town,home,robots,rooms,windows,buildings,lamps,scenery,blind,batches}=world;
  scene.add(town,home);
  const ambient=new THREE.HemisphereLight('#f9ffe7','#9a8279',2.3);
  const sun=new THREE.DirectionalLight('#fff1cd',3.3);
  sun.position.set(-8,15,9);sun.castShadow=false;sun.shadow.mapSize.set(1024,1024);
  Object.assign(sun.shadow.camera,{left:-15,right:15,top:15,bottom:-15,near:1,far:65});
  sun.shadow.bias=-.001;scene.add(ambient,sun);
  const camera=createViewCamera(THREE);
  const target=new THREE.Vector3(),desired=new THREE.Vector3(),offset=new THREE.Vector3();
  const projected=new THREE.Vector3(),pointer=new THREE.Vector2(),raycaster=new THREE.Raycaster();
  const plane=new THREE.Plane(new THREE.Vector3(0,1,0),.34);
  const groundA=new THREE.Vector3(),groundB=new THREE.Vector3(),localPoint=new THREE.Vector3();
  const localRay=new THREE.Ray(),hitInverse=new THREE.Matrix4();
  const smokePose=new THREE.Object3D(),dustPose=new THREE.Object3D();
  const lastSun=new THREE.Vector3(100,100,100),lastTarget=new THREE.Vector3(100,100,100),lastOffset=new THREE.Vector3();
  const lastRobots=new Float64Array(robots.length*3).fill(Infinity);
  const placed=new Float64Array(robots.length*3),bubbleWidth=new Float64Array(robots.length);
  const bubbleX=new Float64Array(robots.length).fill(Infinity),bubbleY=new Float64Array(robots.length).fill(Infinity);
  const activeStations=new Uint8Array(buildings.length);
  const robotHits=robots.map(robot=>robot.userData.hit),buildingHits=buildings.map(building=>building.hit),roomHits=rooms.map(room=>room.floor);
  const picked={agent:undefined,building:undefined,room:undefined};
  const mini=$('minimap').getContext('2d'),dustPositions=scenery.dustPositions;
  const skies=['#f1dcc5','#eeeede','#dac2c3','#182c3b'].map(color=>new THREE.Color(color));
  const sunColors=['#ffcf9a','#fff0d2','#f2ad91','#a1bce4'].map(color=>new THREE.Color(color));
  const sunStrength=[2.4,3.3,1.7,.5],ambientStrength=[2,2.3,1.5,.7],mapColors=['#accbb7','#dfb599','#b2c8d2'];
  const tempColor=new THREE.Color(),warm=new THREE.Color('#e8bd78'),cool=new THREE.Color('#a4b3af');
  const hoverGlow=new THREE.Color('#9abd66'),waterColor=new THREE.Color('#99f7ea'),sparkColor=new THREE.Color('#ffe69a');
  let width=1,height=1,zoom=1,desiredZoom=1,frame=0,last=0,visible=true;
  let uiTime=0,lightTime=-1,renderTime=0,hovered=-1,hoverBuilding=-1;
  let pointerLocation=null,drag=null,gesture=null,autoPhase=Math.asin(-1/3),intro=0;
  let half=13.5,lensShift=4.1,boundLeft=0,boundTop=0,screenX=0,screenY=0;
  let frameNumber=0,hudDirty=true,lastZoom=-1,lastShift=-1,cardX=Infinity,cardY=Infinity;
  let cardWidth=0,cardHeight=0,debugPrinted=false,stopped=false;
  const points=new Map();
  // Freeze only the full scene traversal; the camera and animated subtrees still update explicitly.
  scene.updateMatrixWorld(true);scene.matrixWorldAutoUpdate=false;

  function wake(){if(!stopped&&!frame&&visible&&!document.hidden)frame=requestAnimationFrame(tick);}
  function bounds(){const rect=viewport.getBoundingClientRect();boundLeft=rect.left;boundTop=rect.top;hudDirty=true;}
  function resize(){
    if(stopped)return;
    width=Math.max(1,viewport.clientWidth);height=Math.max(1,viewport.clientHeight);
    renderer.setSize(width,height);renderer.setPixelRatio(quality.dpr);
    const aspect=width/height;half=Math.max(13.5,12.4/aspect);lensShift=width<650?7:4.1;
    camera.left=-half*aspect;camera.right=half*aspect;camera.top=half+lensShift;camera.bottom=-half+lensShift;
    camera.updateProjectionMatrix();bounds();wake();
  }
  function stop(){if(frame)cancelAnimationFrame(frame);frame=0;last=0;quality.resetWindow();}
  app.stop=()=>{stopped=true;stop();};app.hud=()=>{hudDirty=true;};
  app.time=()=>{const phase=Math.asin(clamp((timeOfDay-1.5)/1.5,-1,1));autoPhase=Math.cos(autoPhase)<0?Math.PI-phase:phase;};
  new ResizeObserver(resize).observe(viewport);
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible){bounds();wake();}else stop();}).observe(viewport);
  window.addEventListener('scroll',bounds,{passive:true});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();else{bounds();wake();}});
  reducedQuery.addEventListener('change',event=>{reduced=event.matches;hudDirty=true;wake();});
  renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();stopped=true;stop();fallback();});
  function constrain(){
    desired.y=0;const radius=mode==='town'?8.4:3.5,length=Math.hypot(desired.x,desired.z);
    if(length>radius){desired.x*=radius/length;desired.z*=radius/length;}desiredZoom=clamp(desiredZoom,.85,2.4);
  }
  app.select=index=>{desired.set(agents[index].x,0,agents[index].z);desiredZoom=width<650?1.85:1.65;constrain();hudDirty=true;wake();};
  app.release=()=>{desired.copy(target);hudDirty=true;wake();};
  app.reset=()=>{desired.set(0,0,0);desiredZoom=mode==='town'?1:1.25;hudDirty=true;wake();};
  app.zoom=factor=>{desiredZoom*=factor;constrain();wake();};
  app.mode=next=>{town.visible=next==='town';home.visible=next==='home';hovered=-1;hoverBuilding=-1;pointerLocation=null;viewport.classList.remove('is-hovering');app.reset();lightTime=-1;};
  app.building=index=>{desired.set(districts[index].x*.45,0,districts[index].z*.45);desiredZoom=1.15;constrain();hudDirty=true;wake();};
  app.wake=wake;if(mode!=='town')app.mode(mode);if(selected>=0)app.select(selected);
  function ray(x,y){pointer.set((x-boundLeft)/width*2-1,-(y-boundTop)/height*2+1);raycaster.setFromCamera(pointer,camera);}
  function ground(x,y,out){ray(x,y);return raycaster.ray.intersectPlane(plane,out);}
  function screenPoint(position,up=0){projected.copy(position);projected.y+=up;projected.project(camera);screenX=(projected.x+1)*width/2;screenY=(1-projected.y)*height/2;}
  // Intersect the existing generous hit boxes without allocating Raycaster hit arrays.
  function closest(objects){
    let index=-1,distance=Infinity;
    for(let i=0;i<objects.length;i++){
      const hit=objects[i];hitInverse.copy(hit.matrixWorld).invert();
      localRay.copy(raycaster.ray).applyMatrix4(hitInverse);
      if(!localRay.intersectBox(hit.geometry.boundingBox,localPoint))continue;
      localPoint.applyMatrix4(hit.matrixWorld);
      const d=localPoint.distanceToSquared(raycaster.ray.origin);if(d<distance){distance=d;index=i;}
    }return index;
  }
  function pick(x,y){
    picked.agent=undefined;picked.building=undefined;picked.room=undefined;ray(x,y);
    if(mode==='town'){
      let nearest=-1,distance=22;
      for(let i=0;i<robots.length;i++){screenPoint(robots[i].position,.8);const d=Math.hypot(screenX-(x-boundLeft),screenY-(y-boundTop));if(d<distance){nearest=i;distance=d;}}
      if(nearest<0)nearest=closest(robotHits);
      if(nearest>=0)picked.agent=nearest;else{const building=closest(buildingHits);if(building>=0)picked.building=building;}
    }else{const room=closest(roomHits);if(room>=0)picked.room=room;}return picked;
  }
  function metrics(){
    const all=[...points.values()],a=all[0],b=all[1]||a;
    return {x:(a.x+b.x)/2,y:(a.y+b.y)/2,distance:Math.hypot(a.x-b.x,a.y-b.y)};
  }
  viewport.addEventListener('pointerdown',event=>{
    if(event.button!==0||failed)return;
    points.set(event.pointerId,{x:event.clientX,y:event.clientY});
    viewport.setPointerCapture(event.pointerId);
    const m=metrics(),hit=pick(m.x,m.y);gesture={...m};drag={startX:m.x,startY:m.y,moved:false,multi:points.size>1,pressedHit:{agent:hit.agent,building:hit.building,room:hit.room}};
    pointerLocation=null;tooltip.hidden=true;
  });
  viewport.addEventListener('pointermove',event=>{
    if(!points.has(event.pointerId)){
      if(event.pointerType==='mouse'){pointerLocation={x:event.clientX,y:event.clientY};hudDirty=true;}
      return;
    }
    points.set(event.pointerId,{x:event.clientX,y:event.clientY});
    const m=metrics();
    if(points.size>1)drag.multi=true;
    // Compare against the original press. Sub-threshold jitter never pans or releases follow.
    if(!drag.moved&&(Math.hypot(m.x-drag.startX,m.y-drag.startY)>5||drag.multi)){
      drag.moved=true;release();buildingCard.hidden=true;viewport.classList.add('is-dragging');
    }
    if(drag.moved){
      const a=ground(gesture.x,gesture.y,groundA),b=ground(m.x,m.y,groundB);
      if(a&&b)desired.add(a.sub(b));
      if(points.size>1&&gesture.distance>0)desiredZoom*=m.distance/gesture.distance;
      constrain();wake();
    }
    gesture=m;
  });
  function finish(event,cancelled=false){
    if(!points.has(event.pointerId))return;
    // Pointerup can arrive without a final move event. Check its displacement as well.
    const travelled=Math.hypot(event.clientX-drag.startX,event.clientY-drag.startY);
    if(!cancelled&&!drag.moved&&!drag.multi&&travelled<=5){
      // Keep the pressed resident even if it walks a few pixels before the release.
      const hit=drag.pressedHit?.agent!==undefined?drag.pressedHit:pick(event.clientX,event.clientY);
      if(hit.agent!==undefined)selectAgent(hit.agent);
      else if(hit.building!==undefined)selectBuilding(hit.building);
      else if(hit.room!==undefined){roomStates[hit.room].on=!roomStates[hit.room].on;updateRooms();}
      else{release();buildingCard.hidden=true;}
    }
    points.delete(event.pointerId);
    if(viewport.hasPointerCapture(event.pointerId))viewport.releasePointerCapture(event.pointerId);
    if(points.size){const m=metrics();gesture=m;drag={startX:m.x,startY:m.y,moved:true,multi:true};}
    else{gesture=null;drag=null;viewport.classList.remove('is-dragging');}
    wake();
  }
  viewport.addEventListener('pointerup',event=>finish(event));
  viewport.addEventListener('pointercancel',event=>finish(event,true));
  viewport.addEventListener('pointerleave',()=>{pointerLocation=null;hovered=-1;hoverBuilding=-1;tooltip.hidden=true;viewport.classList.remove('is-hovering');hudDirty=true;});
  viewport.addEventListener('dblclick',event=>{
    if(failed)return;
    if(selected<0){const hit=ground(event.clientX,event.clientY,groundA);if(hit){desired.copy(hit);constrain();}}
    app.zoom(1.35);
  });
  // Normal wheel, trackpad and vertical touch gestures retain native document scrolling.
  viewport.addEventListener('wheel',event=>{
    if(!event.shiftKey||failed)return;
    event.preventDefault();app.zoom(Math.exp(-event.deltaY*.0015));
  },{passive:false});
  viewport.addEventListener('keydown',event=>{
    if(event.key==='+'||event.key==='='||event.key==='-'){
      event.preventDefault();app.zoom(event.key==='-'?1/1.2:1.2);
    }else if(event.altKey&&event.key.startsWith('Arrow')){
      event.preventDefault();release();
      const dx=event.key==='ArrowRight'?1:event.key==='ArrowLeft'?-1:0;
      const dz=event.key==='ArrowDown'?1:event.key==='ArrowUp'?-1:0;
      desired.x+=dx+dz;desired.z+=dz-dx;constrain();wake();
    }
  });

  function lighting(){
    const stage=Math.min(2,Math.floor(timeOfDay)),fraction=timeOfDay-stage;
    renderer.setClearColor(mode==='home'?'#e2e7dd':tempColor.copy(skies[stage]).lerp(skies[stage+1],fraction));
    sun.color.copy(sunColors[stage]).lerp(sunColors[stage+1],fraction);
    sun.intensity=mode==='home'?2:THREE.MathUtils.lerp(sunStrength[stage],sunStrength[stage+1],fraction);
    ambient.intensity=mode==='home'?1.9:THREE.MathUtils.lerp(ambientStrength[stage],ambientStrength[stage+1],fraction);
    sun.position.set(-10+timeOfDay*8,15-Math.abs(timeOfDay-1)*4,8);sun.updateMatrixWorld();
    const night=clamp((timeOfDay-1.65)/1.35,0,1);
    for(let i=0;i<windows.length;i++)windows[i].emissiveIntensity=night*2;
    for(let i=0;i<lamps.length;i++)lamps[i].emissiveIntensity=.12+night*3;
    workspace.classList.toggle('is-night',mode==='town'&&timeOfDay>2.35);updateTimeLabel();
  }
  function spring(t){return t>=1?1:1-Math.exp(-7*t)*Math.cos(10*t);}
  function animateRobots(){
    const sparkLimit=quality.settings.sparks;
    for(let i=0;i<robots.length;i++){
      const robot=robots[i],agent=agents[i],u=robot.userData,working=agent.phase==='work',kind=districts[agent.station].kind;
      const walk=agent.phase==='walk',rhythm=Math.sin(elapsed*9+i),carrying=kind==='crate'||(walk&&(i===1||i===6));
      robot.position.set(agent.x,.39+(!reduced&&walk?Math.abs(rhythm)*.065:0),agent.z);
      if(working&&kind==='crate'&&!reduced)robot.position.x+=Math.sin(agent.progress*Math.PI*2)*.45;
      robot.rotation.y=agent.angle;u.crate.visible=carrying;u.can.visible=working&&kind==='water';
      u.can.rotation.x=reduced?-.2:Math.sin(elapsed*2)*.15-.2;
      for(let j=0;j<u.limbs.length;j++){
        const limb=u.limbs[j];
        limb.leg.rotation.x=reduced?0:walk?rhythm*limb.side*.42:kind==='crate'?Math.sin(elapsed*4)*limb.side*.2:0;
        limb.arm.rotation.x=carrying?-1.1:working?(kind==='terminal'?-1.1:kind==='repair'?-.7:kind==='water'?-.45:0)+(!reduced?Math.sin(elapsed*(kind==='terminal'?15:8)+limb.side)*.17:0):reduced?0:-rhythm*limb.side*.4;
      }
      const highlight=selected===i||hovered===i;
      u.halo.visible=highlight;u.halo.scale.setScalar(reduced?1:1+Math.sin(elapsed*3)*.055);
      if(highlight)u.bodyMaterial.emissive.copy(hoverGlow);else u.bodyMaterial.emissive.setRGB(0,0,0);
      u.bodyMaterial.emissiveIntensity=highlight?.45:0;
      u.sparks.visible=working&&(kind==='repair'||kind==='water')&&!reduced;
      if(u.sparks.visible){
        const water=kind==='water',attribute=u.sparks.geometry.attributes.position;
        u.sparks.material.color.copy(water?waterColor:sparkColor);
        for(let j=0;j<sparkLimit;j++){
          const phase=(elapsed*(water?1.3:3)+j/sparkLimit)%1;
          attribute.setXYZ(j,(water?.3:0)+Math.sin(j*7)*phase*(water?.12:.42),.55+(water?-phase*.5:Math.sin(phase*Math.PI)*.5),.6+phase*.25);
        }
      }
      const entrance=reduced?1:clamp((intro-.75-i*.1)/.6,0,1);
      robot.scale.setScalar(u.robotScale*spring(entrance));robot.updateMatrixWorld(true);
    }
  }
  function worldLife(dt){
    const settings=quality.settings;
    batches.intro.value=reduced?3:Math.min(3,intro);
    activeStations.fill(0);
    for(let i=0;i<agents.length;i++)if(agents[i].phase==='work')activeStations[agents[i].station]=1;
    for(let i=0;i<buildings.length;i++){
      const building=buildings[i];building.rim.visible=hoverBuilding===i;
      if(building.screen)building.screen.material.emissiveIntensity=activeStations[i]?(reduced?1:1+Math.sin(elapsed*5)*.25):.2;
      if(building.rotor&&!reduced)building.rotor.rotation.y+=dt*.5;
      // Static surfaces pop in the shader; only their animated attachments need CPU poses.
      const scale=reduced?1:Math.max(.001,spring(clamp((intro-i*.14)/1.15,0,1)));
      if(building.group.scale.y!==scale){building.group.scale.y=scale;building.group.updateMatrixWorld(true);}
      else if(building.rotor)building.rotor.updateMatrixWorld(true);
    }
    scenery.beacon.material.emissiveIntensity=reduced?1:Math.sin(elapsed*3)>0?2:.1;
    scenery.smoke.count=settings.smoke;scenery.smoke.visible=!reduced;
    if(!reduced){
      for(let i=0;i<settings.smoke;i++){
        const t=(elapsed*.18+i/settings.smoke)%1,p=scenery.chimney;
        smokePose.position.set(p.x+Math.sin(t*4)*.35,p.y+t*2.5,p.z+t*.6);
        smokePose.scale.setScalar(.45+t*2.2);smokePose.updateMatrix();scenery.smoke.setMatrixAt(i,smokePose.matrix);
      }scenery.smoke.instanceMatrix.needsUpdate=true;
    }
    for(let i=0;i<scenery.drones.length;i++){
      const drone=scenery.drones[i],t=elapsed*.12+i*Math.PI;drone.visible=!reduced&&i<settings.drones;
      if(drone.visible){drone.position.set(Math.sin(t)*11,6+i+Math.cos(t*2)*.3,Math.cos(t)*6);drone.rotation.y=t+Math.PI/2;drone.updateMatrixWorld(true);}
    }
    scenery.dust.count=settings.dust;
    for(let i=0;i<settings.dust;i++){
      dustPose.position.set(dustPositions[i*3]+(reduced?0:Math.sin(elapsed*.22+i)*.65),dustPositions[i*3+1]+(reduced?0:Math.cos(elapsed*.3+i)*.4),dustPositions[i*3+2]);
      dustPose.updateMatrix();scenery.dust.setMatrixAt(i,dustPose.matrix);
    }scenery.dust.instanceMatrix.needsUpdate=true;
    for(let i=0;i<scenery.ripples.length;i++){
      const ring=scenery.ripples[i],phase=(elapsed*.35+i/3)%1;
      ring.scale.setScalar(reduced?1:.5+phase*2);ring.material.opacity=reduced?.2:(1-phase)*.45;ring.updateMatrixWorld(true);
    }
    scenery.pond.material.roughness=reduced?.3:.25+Math.sin(elapsed*2)*.08;
  }
  function drawMinimap(){
    if(!mini)return;
    mini.clearRect(0,0,160,100);mini.fillStyle='#e5e9db';mini.fillRect(0,0,160,100);
    if(mode==='town'){
      for(let i=0;i<districts.length;i++){mini.fillStyle=mapColors[i%3];mini.fillRect(35+(i%3)*32,25+Math.floor(i/3)*28,25,20);}
      for(let i=0;i<agents.length;i++){const agent=agents[i];mini.fillStyle=selected===i?'#c75f3b':'#355c46';mini.beginPath();mini.arc(80+agent.x*4,50+agent.z*4,selected===i?3:2,0,Math.PI*2);mini.fill();}
    }else for(let i=0;i<rooms.length;i++){mini.fillStyle=roomStates[i].on?'#e7bb77':'#c0c8bd';mini.fillRect(38+i%3*28,26+Math.floor(i/3)*24,25,21);}
    mini.strokeStyle='#3a5d49';mini.lineWidth=1;mini.strokeRect(80+target.x*4-15/zoom,50+target.z*4-10/zoom,30/zoom,20/zoom);
  }
  function moved(){
    if(hudDirty||Math.abs(zoom-lastZoom)>.0001||Math.abs(lensShift-lastShift)>.0001||target.distanceToSquared(lastTarget)>.000001||offset.distanceToSquared(lastOffset)>.000001)return true;
    if(mode==='town')for(let i=0;i<robots.length;i++){
      const p=robots[i].position,j=i*3;
      if(Math.abs(p.x-lastRobots[j])>.001||Math.abs(p.y-lastRobots[j+1])>.001||Math.abs(p.z-lastRobots[j+2])>.001)return true;
    }return false;
  }
  function overlays(){
    // Every other frame after a pose/input change; cache dimensions before writing transforms.
    if(pointerLocation&&!drag){
      const hit=pick(pointerLocation.x,pointerLocation.y);
      hovered=hit.agent??-1;hoverBuilding=hovered<0?hit.building??-1:-1;
      viewport.classList.toggle('is-hovering',hovered>=0||hoverBuilding>=0||hit.room!==undefined);tooltip.hidden=hoverBuilding<0;
      if(hoverBuilding>=0){
        const district=districts[hoverBuilding];
        if(tooltip.firstElementChild.textContent!==district.name){tooltip.firstElementChild.textContent=district.name;tooltip.lastElementChild.textContent=district.description;}
        tooltip.style.left=clamp(pointerLocation.x-boundLeft+15,12,width-tooltip.offsetWidth-12)+'px';
        tooltip.style.top=clamp(pointerLocation.y-boundTop-70,350,height-tooltip.offsetHeight-150)+'px';
      }
    }
    let placedCount=0;
    for(let i=0;i<robots.length;i++){
      const robot=robots[i],bubble=bubbles[i],agent=agents[i],highlight=hovered===i||selected===i,text=highlight?agent.name+' · '+agent.status:agent.status;
      bubble.classList.toggle('is-highlighted',highlight);
      if(bubble.textContent!==text||bubbleWidth[i]===0){bubble.textContent=text;bubble.hidden=false;bubbleWidth[i]=bubble.offsetWidth;}
      screenPoint(robot.position,1.85);
      bubble.hidden=mode!=='town'||robot.scale.x<.2||screenX<-50||screenX>width+50||(!highlight&&(screenY<350||screenY>height-140))||selected===i;
      if(!bubble.hidden){
        const w=bubbleWidth[i];let x=clamp(screenX-w/2,6,width-w-6),y=screenY-30;
        for(let pass=0;pass<3;pass++)for(let j=0;j<placedCount;j++){const k=j*3;if(Math.abs(placed[k+1]-y)<27&&x<placed[k]+placed[k+2]&&x+w>placed[k]){y-=28;break;}}
        const p=placedCount++*3;placed[p]=x;placed[p+1]=y;placed[p+2]=w;
        if(Math.abs(x-bubbleX[i])>.1||Math.abs(y-bubbleY[i])>.1){bubble.style.transform='translate('+x+'px,'+y+'px)';bubbleX[i]=x;bubbleY[i]=y;}
      }
      const p=i*3;lastRobots[p]=robot.position.x;lastRobots[p+1]=robot.position.y;lastRobots[p+2]=robot.position.z;
    }
    if(selected>=0){
      if(hudDirty||!cardWidth){cardWidth=card.offsetWidth;cardHeight=card.offsetHeight;}
      screenPoint(robots[selected].position,1.7);
      const minTop=width<650?300:350;
      const x=clamp(screenX-cardWidth/2,12,width-cardWidth-12),y=clamp(screenY-cardHeight-22,minTop,Math.max(minTop,height-cardHeight-155));
      if(Math.abs(x-cardX)>.1||Math.abs(y-cardY)>.1){card.style.transform='translate('+x+'px,'+y+'px)';cardX=x;cardY=y;}
    }
    lastTarget.copy(target);lastOffset.copy(offset);lastZoom=zoom;lastShift=lensShift;hudDirty=false;
  }
  function shadows(){
    const enabled=quality.settings.shadows&&!mobile&&mode==='town'&&(reduced||intro>=3);
    const changed=renderer.shadowMap.enabled!==enabled;
    renderer.shadowMap.enabled=enabled;sun.castShadow=enabled;
    // Only static building surfaces cast; walking robots never invalidate the cached map.
    if(enabled&&(changed||sun.position.distanceToSquared(lastSun)>.36)){renderer.shadowMap.needsUpdate=true;lastSun.copy(sun.position);}
  }
  function tick(now){
    frame=0;if(stopped||!visible||document.hidden)return;
    const milliseconds=last?now-last:0,dt=Math.min(milliseconds/1000,.05);
    last=now;elapsed+=dt;intro+=dt;frameNumber++;
    // Exclude initial shader compilation; quality only moves down after sixty visible RAF intervals.
    if(intro>3.5&&quality.recordFrame(milliseconds)){renderer.setPixelRatio(quality.dpr);hudDirty=true;}
    if(mode==='town'){
      updateSimulation(agents,dt,elapsed,reduced);
      if(autoTime){autoPhase+=dt*(Math.PI*2/160);timeOfDay=1.5+Math.sin(autoPhase)*1.5;}
      animateRobots();worldLife(dt);batches.sync(town,quality.settings.sparks);
    }else{
      for(let i=0;i<rooms.length;i++){
        const room=rooms[i];room.glow=THREE.MathUtils.lerp(Math.max(0,room.glow),roomStates[i].on?1:0,reduced?1:1-Math.exp(-dt*5));
        room.floor.material.color.copy(cool).lerp(warm,room.glow);room.floor.material.emissiveIntensity=room.glow*.55;room.fixture.material.emissiveIntensity=room.glow*2;
      }
      if(Math.abs(blindValue-blindTarget)>.001){
        blindValue=reduced?blindTarget:clamp(blindValue+Math.sign(blindTarget-blindValue)*dt*.3,Math.min(blindValue,blindTarget),Math.max(blindValue,blindTarget));
        blind.scale.y=.025+blindValue*.975;blind.position.y=2.9-blind.scale.y*1.15;blind.updateMatrixWorld(true);
        if(Math.abs(blindValue-blindTarget)<.001)$('blind-state').textContent=blindValue<.01?'Fully raised':blindValue>.99?'Fully lowered':'Stopped at '+Math.round(blindValue*100)+'%';
      }batches.sync(home,0);
    }
    if(selected>=0)desired.set(robots[selected].position.x,0,robots[selected].position.z);
    constrain();
    const smoothing=reduced?1:1-Math.exp(-dt*5);target.lerp(desired,smoothing);zoom=THREE.MathUtils.lerp(zoom,desiredZoom,smoothing);
    const baseShift=(width<650?7:4.1)+(selected>=0?(width<650?2.5:2):0),lowestFocus=width<650?height-170:height-45;
    lensShift=THREE.MathUtils.lerp(lensShift,Math.min(baseShift,half*2*(lowestFocus/height-.5)/zoom),smoothing);
    camera.top=half+lensShift;camera.bottom=-half+lensShift;
    const arrival=reduced?1:1-Math.pow(1-clamp(intro/2.7,0,1),3);
    offset.set(THREE.MathUtils.lerp(13,22,arrival),THREE.MathUtils.lerp(46,22,arrival),THREE.MathUtils.lerp(17,22,arrival));
    placeViewCamera(camera,target,offset,zoom);
    if(elapsed-lightTime>.12||lightTime<0){lighting();lightTime=elapsed;}shadows();
    if(now-renderTime>(reduced?33:0)){
      try{renderer.render(scene,camera);}catch{stopped=true;stop();renderer.dispose();fallback();return;}
      renderTime=now;
      if(debug&&!debugPrinted&&intro>=3.2){
        console.info('Elsewhere startup — draw calls:',renderer.info.render.calls,'triangles:',renderer.info.render.triangles,'DPR:',quality.dpr);
        batches.checkBounds(town);batches.checkBounds(home);debugPrinted=true;
      }
    }
    if(elapsed-uiTime>.08||dt===0){
      timeInput.value=String(timeOfDay);updateCard();drawMinimap();
      for(let i=0;i<rowLabels.length;i++)if(rowLabels[i].textContent!==agents[i].status){rowLabels[i].textContent=agents[i].status;hudDirty=true;}
      uiTime=elapsed;
    }
    if((frameNumber&1)===0&&moved())overlays();wake();
  }
  viewport.append(renderer.domElement);renderer.domElement.setAttribute('aria-hidden','true');
  $('loading')?.remove();lighting();resize();
}
