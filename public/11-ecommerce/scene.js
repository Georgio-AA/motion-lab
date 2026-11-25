import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { stackLabels, cornerDistance } from './framing.js';

const clamp = THREE.MathUtils.clamp;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

// All maps are generated once. Tangent normals make individual yarn loops catch light.
function surfaceMaps() {
  const size = 256;
  const heights = new Float32Array(size * size);
  const normalCanvas = document.createElement('canvas'); normalCanvas.width = normalCanvas.height = size;
  const roughCanvas = normalCanvas.cloneNode(), colorCanvas = normalCanvas.cloneNode();
  const nc = normalCanvas.getContext('2d'), rc = roughCanvas.getContext('2d'), cc = colorCanvas.getContext('2d');
  const normal = nc.createImageData(size, size), rough = rc.createImageData(size, size), color = cc.createImageData(size, size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const row = Math.floor(y / 16), u = ((x + (row % 2) * 8) % 16) / 16;
    const v = (y % 16) / 16;
    const yarn = Math.sin((u + .16 * Math.sin(v * Math.PI * 2)) * Math.PI * 2);
    heights[y * size + x] = .5 + .27 * yarn * Math.sin(v * Math.PI) + .06 * Math.sin(x * Math.PI / 2);
  }
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = (y * size + x) * 4;
    const dx = (heights[y * size + (x + 1) % size] - heights[y * size + (x + size - 1) % size]) * 2;
    const dy = (heights[((y + 1) % size) * size + x] - heights[((y + size - 1) % size) * size + x]) * 2;
    const length = Math.sqrt(dx * dx + dy * dy + 1);
    normal.data[i] = 128 - dx / length * 127; normal.data[i + 1] = 128 - dy / length * 127; normal.data[i + 2] = 128 + 127 / length; normal.data[i + 3] = 255;
    const r = 170 + heights[y * size + x] * 65;
    rough.data[i] = rough.data[i + 1] = rough.data[i + 2] = r; rough.data[i + 3] = 255;
    const yarnColor = 185 + heights[y * size + x] * 70;
    color.data[i] = color.data[i + 1] = color.data[i + 2] = yarnColor; color.data[i + 3] = 255;
  }
  nc.putImageData(normal, 0, 0); rc.putImageData(rough, 0, 0); cc.putImageData(color, 0, 0);
  const knitNormal = new THREE.CanvasTexture(normalCanvas), knitRough = new THREE.CanvasTexture(roughCanvas), knitColor = new THREE.CanvasTexture(colorCanvas);
  knitColor.colorSpace = THREE.SRGBColorSpace;
  for (const map of [knitNormal, knitRough, knitColor]) { map.wrapS = map.wrapT = THREE.RepeatWrapping; map.repeat.set(6, 2.4); map.anisotropy = 4; }
  // Small variations in glaze thickness catch the studio reflection without making
  // the ceramic look metallic, noisy, or scratched.
  const glazeCanvas = normalCanvas.cloneNode(), glazeNormalCanvas = normalCanvas.cloneNode();
  const grc = glazeCanvas.getContext('2d'), gnc = glazeNormalCanvas.getContext('2d');
  const glazePixels = grc.createImageData(size, size), glazeNormals = gnc.createImageData(size, size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = (y * size + x) * 4;
    const ripple = Math.sin(x * Math.PI / 32) * Math.cos(y * Math.PI / 64);
    const grain = Math.sin(x * 12.9898 + y * 78.233) * .5;
    const roughness = 194 + ripple * 13 + grain * 7;
    glazePixels.data[i] = glazePixels.data[i + 1] = glazePixels.data[i + 2] = roughness;
    glazePixels.data[i + 3] = 255;
    glazeNormals.data[i] = 128 + Math.cos(x * Math.PI / 32) * 12;
    glazeNormals.data[i + 1] = 128 + Math.sin(y * Math.PI / 64) * 9;
    glazeNormals.data[i + 2] = 254; glazeNormals.data[i + 3] = 255;
  }
  grc.putImageData(glazePixels, 0, 0); gnc.putImageData(glazeNormals, 0, 0);
  const glazeRough = new THREE.CanvasTexture(glazeCanvas), glazeNormal = new THREE.CanvasTexture(glazeNormalCanvas);
  for (const map of [glazeRough, glazeNormal]) { map.wrapS = map.wrapT = THREE.RepeatWrapping; map.repeat.set(2, 1); }
  const dialCanvas = normalCanvas.cloneNode(), dc = dialCanvas.getContext('2d'), radial = dc.createImageData(size, size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = (y * size + x) * 4, angle = Math.atan2(y - 128, x - 128), radius = Math.hypot(x - 128, y - 128);
    const grain = Math.sin(radius * 3.3) * .12 + Math.sin(angle * 180) * .025;
    radial.data[i] = 128 + Math.cos(angle) * grain * 127; radial.data[i + 1] = 128 + Math.sin(angle) * grain * 127; radial.data[i + 2] = 254; radial.data[i + 3] = 255;
  }
  dc.putImageData(radial, 0, 0);
  const dialNormal = new THREE.CanvasTexture(dialCanvas);
  const shadowCanvas = document.createElement('canvas'); shadowCanvas.width = shadowCanvas.height = 128;
  const sc = shadowCanvas.getContext('2d'), gradient = sc.createRadialGradient(64, 64, 2, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(0,0,0,.8)'); gradient.addColorStop(.35, 'rgba(0,0,0,.4)'); gradient.addColorStop(1, 'rgba(0,0,0,0)');
  sc.fillStyle = gradient; sc.fillRect(0, 0, 128, 128);
  const shadow = new THREE.CanvasTexture(shadowCanvas);
  const glowCanvas = shadowCanvas.cloneNode(), gc = glowCanvas.getContext('2d');
  const glowGradient = gc.createRadialGradient(64,64,0,64,64,64);
  glowGradient.addColorStop(0,'rgba(255,255,255,.7)');glowGradient.addColorStop(1,'rgba(255,255,255,0)');
  gc.fillStyle=glowGradient;gc.fillRect(0,0,128,128);
  return { knitNormal, knitRough, knitColor, glazeRough, glazeNormal, dialNormal, shadow, glow: new THREE.CanvasTexture(glowCanvas) };
}

function lathe(points, segments = 80) {
  const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(p[0], p[1], 0)));
  const profile = curve.getPoints(60).map(p => new THREE.Vector2(Math.max(0, p.x), p.y));
  return new THREE.LatheGeometry(profile, segments);
}
function ring(radius, tube, material, y = 0) {
  const mesh = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 8, 80), material);
  mesh.rotation.x = Math.PI / 2; mesh.position.y = y; return mesh;
}
function mesh(geometry, material, parent, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geometry, material); m.position.set(x, y, z); parent.add(m); return m;
}

// Six actual assemblies, with a curved ceramic profile and an oval footprint.
function makeSpeaker(maps) {
  const root = new THREE.Group(); root.scale.z = .88;
  const ceramic = new THREE.MeshPhysicalMaterial({ color: '#c4532f', metalness: 0, roughness: .3, roughnessMap: maps.glazeRough, normalMap: maps.glazeNormal, normalScale: new THREE.Vector2(.075, .075), clearcoat: 1, clearcoatRoughness: .09, envMapIntensity: 1.1 });
  const textile = new THREE.MeshStandardMaterial({ color: '#795a46', map: maps.knitColor, normalMap: maps.knitNormal, normalScale: new THREE.Vector2(.7, .7), roughnessMap: maps.knitRough, roughness: .95, emissive: '#f49166', emissiveIntensity: 0 });
  const metal = new THREE.MeshStandardMaterial({ color: '#d7d1c5', metalness: 1, roughness: .28, normalMap: maps.dialNormal, normalScale: new THREE.Vector2(.25, .25) });
  const rubber = new THREE.MeshStandardMaterial({ color: '#242724', roughness: .8 });
  const copper = new THREE.MeshStandardMaterial({ color: '#c79060', metalness: .9, roughness: .36 });
  const light = new THREE.MeshStandardMaterial({ color: '#fff3d5', emissive: '#ffd6a3', emissiveIntensity: 2.5, roughness: .3 });
  const dial = new THREE.Group(), shell = new THREE.Group(), fabric = new THREE.Group(), driver = new THREE.Group(), radiator = new THREE.Group(), battery = new THREE.Group();
  root.add(dial, shell, fabric, driver, radiator, battery);
  mesh(lathe([[0,.67],[.72,.67],[.96,.69],[1.025,.78],[1.01,.92],[.94,1.08],[.77,1.2],[.48,1.24],[0,1.24]]), ceramic, shell);
  const lower = mesh(lathe([[0,-1.26],[.6,-1.26],[.89,-1.22],[1.01,-1.1],[1.025,-.92],[.995,-.77],[.96,-.68],[0,-.68]]), ceramic, shell);
  mesh(new THREE.CylinderGeometry(.78,.78,.035,64), rubber, shell, 0,-1.27);
  mesh(lathe([[.97,-.71],[.976,-.61],[.925,-.35],[.906,0],[.92,.35],[.982,.64],[.98,.69]]), textile, fabric);
  fabric.add(ring(.987,.012,metal,.69),ring(.97,.012,metal,-.71));
  shell.add(ring(.996,.016,light,.713));
  mesh(new THREE.CylinderGeometry(.37,.4,.14,80),metal,dial,0,1.3);
  const face = mesh(new THREE.CircleGeometry(.365,80),metal,dial,0,1.375); face.rotation.x = -Math.PI/2;
  const knurl = new THREE.InstancedMesh(new THREE.BoxGeometry(.011,.11,.015),metal,100), dummy = new THREE.Object3D();
  for(let i=0;i<100;i++){const a=i/100*Math.PI*2;dummy.position.set(Math.sin(a)*.38,1.3,Math.cos(a)*.38);dummy.rotation.y=a;dummy.updateMatrix();knurl.setMatrixAt(i,dummy.matrix);} dial.add(knurl);
  mesh(new THREE.BoxGeometry(.014,.004,.07),rubber,dial,0,1.379,.25);
  mesh(new THREE.CylinderGeometry(.18,.18,.07,32),rubber,dial,0,1.21);
  // A shallow diaphragm, rolled surround, a ventilated basket and a real magnet.
  driver.position.y=.02;
  mesh(lathe([[0,.33],[.15,.38],[.25,.3],[.62,.45],[.67,.5],[.7,.46]]),rubber,driver);
  driver.add(ring(.68,.055,rubber,.45),ring(.72,.028,metal,.43));
  mesh(new THREE.SphereGeometry(.17,24,12,0,Math.PI*2,0,Math.PI/2),rubber,driver,0,.34);
  mesh(new THREE.CylinderGeometry(.31,.34,.28,32),metal,driver,0,-.23);
  mesh(new THREE.CylinderGeometry(.24,.24,.15,32),rubber,driver,0,-.43);
  const spokes=new THREE.InstancedMesh(new THREE.BoxGeometry(.07,.43,.07),metal,8);
  for(let i=0;i<8;i++){const a=i/8*Math.PI*2;dummy.position.set(Math.sin(a)*.49,.15,Math.cos(a)*.49);dummy.rotation.set(Math.sin(a)*-.55,a,Math.cos(a)*.55);dummy.updateMatrix();spokes.setMatrixAt(i,dummy.matrix);}driver.add(spokes);
  mesh(new THREE.CylinderGeometry(.55,.55,.07,48),rubber,radiator,0,-.65);radiator.add(ring(.58,.05,rubber,-.65),ring(.64,.025,metal,-.65));
  const packMat=new THREE.MeshStandardMaterial({color:'#477064',metalness:.2,roughness:.45});
  const cells=new THREE.InstancedMesh(new THREE.CylinderGeometry(.13,.13,.64,16),packMat,4);
  for(let i=0;i<4;i++){dummy.position.set((i-1.5)*.26,-.87,0);dummy.rotation.set(Math.PI/2,0,0);dummy.updateMatrix();cells.setMatrixAt(i,dummy.matrix);}battery.add(cells);
  mesh(new THREE.BoxGeometry(1.1,.035,.6),rubber,battery,0,-.96);
  mesh(new THREE.BoxGeometry(.95,.014,.08),copper,battery,0,-.73,.24);
  const badgeCanvas=document.createElement('canvas');badgeCanvas.width=256;badgeCanvas.height=64;const bc=badgeCanvas.getContext('2d');bc.fillStyle='#f3d7bd';bc.font='48px Arial';bc.textAlign='center';bc.fillText('ora',128,47);
  const badgeMap=new THREE.CanvasTexture(badgeCanvas);badgeMap.colorSpace=THREE.SRGBColorSpace;
  mesh(new THREE.PlaneGeometry(.23,.058),new THREE.MeshBasicMaterial({map:badgeMap,transparent:true,depthWrite:false}),shell,0,-1.04,1.032);
  mesh(new THREE.BoxGeometry(.14,.035,.035),rubber,shell,0,-1.05,-1.01);
  return {root,ceramic,textile,light,metal,dial,shell,fabric,driver,radiator,battery,lower};
}

function makeRoom(maps) {
  const root = new THREE.Group();
  const plaster = new THREE.MeshStandardMaterial({color:'#c3bbac',roughness:1});
  const wood = new THREE.MeshStandardMaterial({color:'#947855',roughness:.62});
  const green = new THREE.MeshStandardMaterial({color:'#52644a',roughness:.75,side:THREE.DoubleSide});
  const clay = new THREE.MeshStandardMaterial({color:'#8d5842',roughness:.9});
  mesh(new THREE.BoxGeometry(10,.12,3.6),wood,root,0,-1.4,.1);
  mesh(new THREE.BoxGeometry(11,8,.14),plaster,root,0,1.5,-2.1);
  const windowMat=new THREE.MeshBasicMaterial({color:'#ffe3b4'});
  mesh(new THREE.PlaneGeometry(2.9,3.8),windowMat,root,-3,1.7,-1.99);
  const frameMat=new THREE.MeshStandardMaterial({color:'#655f53',roughness:.7});
  const frames=[];
  for(const x of [-4.48,-3,-1.52]){const g=new THREE.BoxGeometry(.06,3.94,.09);g.translate(x,1.7,-1.93);frames.push(g);}
  for(const y of [-.27,1.7,3.67]){const g=new THREE.BoxGeometry(3.05,.06,.09);g.translate(-3,y,-1.93);frames.push(g);}
  mesh(mergeGeometries(frames),frameMat,root);frames.forEach(g=>g.dispose());
  // The window's soft shaft and the ring's pool are emissive surfaces, not extra lights.
  const shaftMat=new THREE.MeshBasicMaterial({color:'#ffe1a1',transparent:true,opacity:.12,depthWrite:false});
  const shaft=mesh(new THREE.PlaneGeometry(4,3.3),shaftMat,root,-1,-1.325,.2);shaft.rotation.x=-Math.PI/2;shaft.rotation.z=-.35;
  mesh(lathe([[0,-1.32],[.32,-1.32],[.4,-.75],[.45,-.65],[0,-.65]],40),clay,root,3.15,0,-.4);
  const stemMat=new THREE.MeshStandardMaterial({color:'#45523c',roughness:1});
  const stems=new THREE.InstancedMesh(new THREE.CylinderGeometry(.018,.023,1.5,6),stemMat,9);
  const leaves=new THREE.InstancedMesh(new THREE.SphereGeometry(1,12,6),green,18), dummy=new THREE.Object3D();
  for(let i=0;i<9;i++){const a=i*2.4;dummy.position.set(3.15+Math.sin(a)*.19,.05+Math.sin(i)*.12,-.4+Math.cos(a)*.15);dummy.rotation.set(Math.sin(a)*.3,0,Math.cos(a)*.3);dummy.scale.set(1,1,1);dummy.updateMatrix();stems.setMatrixAt(i,dummy.matrix);
    for(let j=0;j<2;j++){dummy.position.set(3.15+Math.sin(a)*(.4+j*.08),.35+j*.25+Math.sin(i)*.2,-.4+Math.cos(a)*.35);dummy.rotation.set(Math.cos(a)*.5,a,Math.sin(a)*.7);dummy.scale.set(.18,.5,.025);dummy.updateMatrix();leaves.setMatrixAt(i*2+j,dummy.matrix);}}
  root.add(stems,leaves);
  mesh(new THREE.BoxGeometry(.8,.12,.6),wood,root,1.8,-1.27,-.6);
  const poolMat=new THREE.MeshBasicMaterial({color:'#ffb874',map:maps.glow,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,opacity:0});
  const pool=mesh(new THREE.PlaneGeometry(5,4),poolMat,root,0,-1.328,0);pool.rotation.x=-Math.PI/2;
  mesh(new THREE.PlaneGeometry(5,4),poolMat,root,0,.4,-1.98);
  root.visible=false;
  return {root,plaster,windowMat,shaftMat,poolMat};
}

const rippleVertex=`varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.999,1.0);}`;
const rippleFragment=`varying vec2 vUv;uniform float uTime,uEnergy,uPlay,uAspect,uReduced;uniform vec3 uColor;void main(){vec2 p=vUv-vec2(.53,.53);p.x*=uAspect;float d=length(p*vec2(1.,1.65));float wave=pow(max(0.,sin(d*42.-uTime*2.4)),22.);float fade=exp(-d*2.7)*smoothstep(.12,.28,d);float alpha=wave*fade*(.025+uPlay*(.12+uEnergy*.24))*(1.-uReduced);gl_FragColor=vec4(uColor,alpha);}`;

export function createProductExperience({audio, reducedQuery, initialFinish}) {
  const canvas=document.querySelector('#product-canvas'),rig=document.querySelector('#visual-rig');
  const hero=document.querySelector('#product'),story=document.querySelector('#story-viewport');
  let renderer;
  try {
    renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});
    renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
    const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(31,1,.1,80);
    camera.setViewOffset(1,1,0,0,1,1);camera.clearViewOffset();
    const pmrem=new THREE.PMREMGenerator(renderer),environment=new RoomEnvironment();
    const envTarget=pmrem.fromScene(environment,.04);scene.environment=envTarget.texture;environment.dispose();pmrem.dispose();
    const key=new THREE.DirectionalLight('#fffaf2',3.2);key.position.set(3,5,6);
    const rim=new THREE.DirectionalLight('#dce8ff',2.1);rim.position.set(-4,3,-2);scene.add(key,rim);
    const maps=surfaceMaps(),speaker=makeSpeaker(maps),room=makeRoom(maps);scene.add(speaker.root,room.root);
    const contact=new THREE.Mesh(new THREE.PlaneGeometry(3.4,2.9),new THREE.MeshBasicMaterial({map:maps.shadow,transparent:true,depthWrite:false,opacity:.85}));contact.rotation.x=-Math.PI/2;contact.position.y=-1.31;contact.renderOrder=1;scene.add(contact);
    const rippleMaterial=new THREE.ShaderMaterial({vertexShader:rippleVertex,fragmentShader:rippleFragment,transparent:true,depthWrite:false,depthTest:true,uniforms:{uTime:{value:0},uEnergy:{value:0},uPlay:{value:0},uAspect:{value:1},uReduced:{value:0},uColor:{value:new THREE.Color('#f49166')}}});
    const ripples=new THREE.Mesh(new THREE.PlaneGeometry(2,2),rippleMaterial);ripples.frustumCulled=false;ripples.renderOrder=-100;scene.add(ripples);
    const targetCeramic=new THREE.Color(),targetFabric=new THREE.Color(),targetAccent=new THREE.Color();
    function setFinish(f){targetCeramic.set(f.shell);targetFabric.set(f.fabric);targetAccent.set(f.accent);}
    setFinish(initialFinish);speaker.ceramic.color.copy(targetCeramic);speaker.textile.color.copy(targetFabric);
    const labels=Array.from(document.querySelectorAll('[data-part]'));
    const paths=Array.from(document.querySelectorAll('#callout-lines path'));
    const partNames=['dial','shell','fabric','driver','radiator','battery'];
    const anchors=[new THREE.Vector3(.2,1.38,0),new THREE.Vector3(.75,1.02,0),new THREE.Vector3(-.8,0,0),new THREE.Vector3(.5,.4,0),new THREE.Vector3(-.5,-.65,0),new THREE.Vector3(.3,-.85,0)];
    const projected=new THREE.Vector3(),look=new THREE.Vector3();
    const bounds=new THREE.Box3(),corner=new THREE.Vector3();
    const cameraDirection=new THREE.Vector3(.24,.17,1).normalize();
    const tanHalfFov=Math.tan(THREE.MathUtils.degToRad(camera.fov/2));
    // Geometry and instance bounds are initialized once, so fitting needs no new boxes.
    speaker.root.traverse(object=>{
      if(object.geometry&&!object.geometry.boundingBox)object.geometry.computeBoundingBox();
      if(object.isInstancedMesh)object.computeBoundingBox();
    });
    const leftIds=[2,4],rightIds=[0,1,3,5];
    const labelX=new Float32Array(6),labelHeights=new Float32Array(6),desiredY=new Float32Array(6),labelY=new Float32Array(6),anchorX=new Float32Array(6),anchorY=new Float32Array(6);
    const assemblyCopy=document.querySelector('.assembly-copy'),roomCopy=document.querySelector('.room-copy');
    const quickBuy=document.querySelector('#sticky-buy');
    const assemblyArea={left:0,right:1,top:0,bottom:1},roomArea={left:0,right:1,top:0,bottom:1};
    let leftLabelTop=0,rightLabelTop=0,labelBottom=1,labelWidth=230,buyReserve=120;
    const callouts=document.querySelector('#callouts'),lineLayer=document.querySelector('#callout-lines');
    const scrollBar=document.querySelector('#story-progress'),phaseLabel=document.querySelector('#story-phase'),chapter=document.querySelector('#story-chapter');
    const roomTime=document.querySelector('#room-time'),roomPeriod=document.querySelector('#room-period'),timeProgress=document.querySelector('#time-progress');
    const roomDay=new THREE.Color('#c3bbac'),roomNight=new THREE.Color('#25282e'),keyDay=new THREE.Color('#fffaf2'),keyNight=new THREE.Color('#ffd0a4');
    const windowDay=new THREE.Color('#ffe3b4'),windowNight=new THREE.Color('#242e47');
    let width=1,height=1,mobile=false,heroVisible=true,storyVisible=false,mode='hero',progress=0,dirty=true,failed=false,raf=0;
    let rotation=-.55,velocity=0,dragging=false,startX=0,startY=0,lastX=0,axis=0,lastInteraction=0;
    let reduced=reducedQuery.matches,previous=performance.now(),birth=previous,quality=Math.min(devicePixelRatio,1.5),slowFrames=0,frames=0,lastRoomHour=-1,lastPhase=-1;
    function resize(){
      width=rig.clientWidth;height=rig.clientHeight;if(!width||!height)return;
      mobile=width<=700;
      renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();rippleMaterial.uniforms.uAspect.value=camera.aspect;
      const safeInset=Math.max(0,parseFloat(getComputedStyle(quickBuy).bottom)-(mobile?12:20));
      buyReserve=(parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--buy-reserve'))||120)+safeInset;
      labelWidth=mobile?132:width<=1050?190:230;
      for(let i=0;i<6;i++){
        labels[i].style.width=labelWidth+'px';
        labelHeights[i]=labels[i].offsetHeight;
        const left=i===2||i===4;
        labelX[i]=mobile?(left?12:width-labelWidth-12):(left?width*.08:Math.min(width*.77,width-labelWidth-width*.05));
      }
      const copyBottom=assemblyCopy.offsetTop+assemblyCopy.offsetHeight;
      leftLabelTop=copyBottom+28;
      rightLabelTop=mobile?copyBottom+28:Math.max(155,height*.20);
      labelBottom=height-buyReserve-60;
      assemblyArea.left=width*(mobile?.15:.43);assemblyArea.right=width*(mobile?.85:.73);
      assemblyArea.top=mobile?Math.max(copyBottom+24,height*.35):Math.max(155,height*.18);
      assemblyArea.bottom=height-buyReserve-65;
      roomArea.left=width*(mobile?.17:.49);roomArea.right=width*(mobile?.83:.9);
      roomArea.top=mobile?roomCopy.offsetTop+roomCopy.offsetHeight+24:Math.max(160,height*.19);
      roomArea.bottom=mobile?height-buyReserve-140:height-buyReserve-60;
      dirty=true;wake();
    }
    const ro=new ResizeObserver(resize);ro.observe(rig);ro.observe(assemblyCopy);ro.observe(roomCopy);
    document.fonts?.ready.then(resize);
    const io=new IntersectionObserver(entries=>{for(const entry of entries){if(entry.target===hero)heroVisible=entry.isIntersecting;else storyVisible=entry.isIntersecting;}wake();});io.observe(hero);io.observe(story);
    function switchMode(next){if(mode===next)return;mode=next;(mode==='story'?story:hero).append(rig);dirty=true;resize();}
    const drag=document.querySelector('#hero-drag');
    drag.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button!==0)return;dragging=true;axis=0;startX=lastX=e.clientX;startY=e.clientY;velocity=0;lastInteraction=performance.now();});
    drag.addEventListener('pointermove',e=>{if(!dragging)return;const dx=e.clientX-startX,dy=e.clientY-startY;if(!axis&&Math.max(Math.abs(dx),Math.abs(dy))>7){axis=Math.abs(dx)>Math.abs(dy)?1:2;if(axis===1)drag.setPointerCapture(e.pointerId);}
      if(axis===1){velocity=(e.clientX-lastX)*.008;rotation+=velocity;dirty=true;wake();}lastX=e.clientX;});
    const stop=e=>{dragging=false;if(drag.hasPointerCapture(e.pointerId))drag.releasePointerCapture(e.pointerId);lastInteraction=performance.now();wake();};drag.addEventListener('pointerup',stop);drag.addEventListener('pointercancel',stop);
    drag.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();rotation+=e.key==='ArrowLeft'?-.25:.25;lastInteraction=performance.now();dirty=true;wake();}});
    reducedQuery.addEventListener('change',()=>{reduced=reducedQuery.matches;dirty=true;wake();});
    document.addEventListener('visibilitychange',wake);
    canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();failed=true;rig.classList.remove('ready');cancelAnimationFrame(raf);raf=0;});
    canvas.addEventListener('webglcontextrestored',()=>{failed=false;dirty=true;wake();});
    function wake(){if(!raf&&!failed&&!document.hidden&&(heroVisible||storyVisible)){previous=performance.now();raf=requestAnimationFrame(frame);}}
    function frameSpeaker(left,right,top,bottom){
      speaker.root.updateMatrixWorld(true);bounds.setFromObject(speaker.root);bounds.getCenter(look);
      camera.position.copy(look).add(cameraDirection);camera.lookAt(look);camera.updateMatrixWorld();
      const fractionWidth=(right-left)/width,fractionHeight=Math.max(100,bottom-top)/height;
      let distance=4;
      for(let i=0;i<8;i++){
        corner.set(i&1?bounds.max.x:bounds.min.x,i&2?bounds.max.y:bounds.min.y,i&4?bounds.max.z:bounds.min.z).applyMatrix4(camera.matrixWorldInverse);
        distance=Math.max(distance,cornerDistance(corner.x,corner.y,corner.z+1,tanHalfFov,camera.aspect,fractionWidth,fractionHeight));
      }
      camera.position.copy(look).addScaledVector(cameraDirection,distance*1.045);
      // Shift the optical center into the reserved stage area, preserving perspective.
      camera.setViewOffset(width,height,width/2-(left+right)/2,height/2-(top+bottom)/2,width,height);
      camera.lookAt(look);camera.updateMatrixWorld();
    }
    // Strings for DOM/SVG are unavoidable; all 3D vectors, colors, maps and geometry are cached.
    function projectLabels(explosion){
      const opacity=smooth(.07,.2,explosion);callouts.style.opacity=lineLayer.style.opacity=opacity;
      if(opacity<.01)return;
      speaker.root.updateMatrixWorld(true);
      for(let i=0;i<6;i++){
        projected.copy(anchors[i]);speaker[partNames[i]].localToWorld(projected);projected.project(camera);
        anchorX[i]=(projected.x*.5+.5)*width;anchorY[i]=(-projected.y*.5+.5)*height;
        desiredY[i]=anchorY[i]-labelHeights[i]/2;
      }
      stackLabels(leftIds,desiredY,labelHeights,labelY,leftLabelTop,labelBottom,mobile?20:24);
      stackLabels(rightIds,desiredY,labelHeights,labelY,rightLabelTop,labelBottom,mobile?20:24);
      for(let i=0;i<6;i++){
        const px=anchorX[i],py=anchorY[i],lx=labelX[i],ly=labelY[i],left=i===2||i===4;
        labels[i].style.transform=`translate3d(${lx}px,${ly}px,0)`;
        const endX=left?lx+labelWidth+7:lx-7,endY=ly+13;
        paths[i].setAttribute('d',`M${px},${py} L${endX+(left?20:-20)},${endY} L${endX},${endY}`);
      }
    }
    function frame(now){
      raf=0;if(failed||document.hidden||(!heroVisible&&!storyVisible))return;
      const elapsed=now-previous,dt=Math.min(elapsed/1000,.05);previous=now;
      const ease=reduced?1:1-Math.exp(-dt*6);
      speaker.ceramic.color.lerp(targetCeramic,ease);speaker.textile.color.lerp(targetFabric,ease);speaker.textile.emissive.copy(targetAccent);rippleMaterial.uniforms.uColor.value.lerp(targetAccent,ease);
      const energy=audio.energy(),playing=audio.playing;
      const quietPulse=reduced?0:(Math.sin(now*.0012)+1)*.025;
      speaker.light.emissiveIntensity=1.7+energy*5+quietPulse*3;speaker.textile.emissiveIntensity=reduced?0:energy*.12+quietPulse*.025;
      speaker.fabric.scale.setScalar(1+(reduced?0:energy*.008));
      rippleMaterial.uniforms.uTime.value=now*.001;rippleMaterial.uniforms.uEnergy.value=energy;rippleMaterial.uniforms.uPlay.value=playing?1:0;rippleMaterial.uniforms.uReduced.value=reduced?1:0;
      if(mode==='hero'){
        const intro=reduced?1:smooth(0,1.8,(now-birth)/1000);
        if(!dragging){rotation+=velocity;velocity*=Math.pow(.92,dt*60);if(!reduced&&now-lastInteraction>3500)rotation+=dt*.045;}
        speaker.root.rotation.set(.07,rotation+(1-intro)*.65,-.12);speaker.root.position.set(mobile?0:.22,mobile?.57:.32-(1-intro)*1.7,0);
        speaker.root.scale.set(1,1,.88);
        speaker.dial.position.set(0,0,0);speaker.shell.position.set(0,0,0);speaker.lower.position.y=0;speaker.fabric.position.set(0,0,0);speaker.driver.position.set(0,.02,0);speaker.radiator.position.set(0,0,0);speaker.battery.position.set(0,0,0);
        room.root.visible=false;contact.visible=true;
        speaker.root.updateMatrixWorld(true);bounds.setFromObject(speaker.root);
        contact.position.set(speaker.root.position.x,bounds.min.y-.025,0);contact.material.opacity=.85;
        camera.clearViewOffset();camera.aspect=width/height;camera.updateProjectionMatrix();
        camera.position.set(4.0,3.1,mobile?13.6:9.5);look.set(0,mobile?-.1:.05,0);camera.lookAt(look);
        scene.environmentIntensity=.95;key.intensity=3.2;key.color.copy(keyDay);rim.intensity=2.1;
      }else{
        // Direct, deterministic phase sampling stays correct even when scroll jumps.
        const open=smooth(.015,.22,progress)*(1-smooth(.4,.53,progress));
        const inRoom=smooth(.53,.65,progress),day=smooth(.66,.82,progress);
        speaker.dial.position.set(0,open*1.88,0);speaker.shell.position.set(open*.85,open*1.06,-open*.35);speaker.lower.position.y=-open*1.4;
        speaker.fabric.position.set(-open*.7,open*.37,0);speaker.driver.position.set(open*.38,.02-open*.43,open*.25);speaker.radiator.position.set(-open*.5,-open*.98,0);speaker.battery.position.set(open*.55,-open*1.52,0);
        speaker.root.rotation.set(.02,-.5+progress*.18,-.035*(1-inRoom));speaker.root.position.set(mobile?0:.75,mobile?-.5:.03,0);speaker.root.scale.set(1,1,.88);
        room.root.visible=inRoom>.01;room.root.position.set(speaker.root.position.x,speaker.root.position.y,0);room.root.scale.setScalar(inRoom);
        contact.visible=true;contact.position.set(speaker.root.position.x,speaker.root.position.y-1.31,0);contact.material.opacity=.85;
        const explosionInset=mobile?open*width*.12:0;
        frameSpeaker(
          THREE.MathUtils.lerp(assemblyArea.left+explosionInset,roomArea.left,inRoom),
          THREE.MathUtils.lerp(assemblyArea.right-explosionInset,roomArea.right,inRoom),
          THREE.MathUtils.lerp(assemblyArea.top,roomArea.top,inRoom),
          THREE.MathUtils.lerp(assemblyArea.bottom,roomArea.bottom,inRoom)
        );
        contact.position.y=THREE.MathUtils.lerp(bounds.min.y-.035,speaker.root.position.y-1.31,inRoom);
        scene.environmentIntensity=.95-day*.83;key.intensity=3.2*(1-day)+.24;key.color.copy(keyDay).lerp(keyNight,day);rim.intensity=2.1*(1-day)+.1;
        room.plaster.color.copy(roomDay).lerp(roomNight,day);room.windowMat.color.copy(windowDay).lerp(windowNight,day);room.shaftMat.opacity=(1-day)*.14;room.poolMat.opacity=day*.9;
        speaker.light.emissiveIntensity+=day*6;
        projectLabels(open);scrollBar.style.transform=`scaleX(${progress})`;timeProgress.style.transform=`scaleX(${day})`;
        const phase=progress<.12?0:progress<.42?1:progress<.6?2:3;
        if(phase!==lastPhase){lastPhase=phase;story.classList.toggle('room-active',phase===3);phaseLabel.textContent=['SCROLL TO OPEN','EVERY LAYER MATTERS','BACK IN HARMONY','FROM DAWN TO DUSK'][phase];chapter.textContent=phase===3?'02 — In your room':'01 — Every layer matters';}
        const hour=Math.round(7+day*15);if(hour!==lastRoomHour){lastRoomHour=hour;roomTime.textContent=String(hour).padStart(2,'0')+':00';roomPeriod.textContent=hour<12?'MORNING LIGHT':hour<18?'AFTERNOON GLOW':hour<21?'GOLDEN HOUR':'ONE LAST TRACK';}
      }
      try{renderer.render(scene,camera);rig.classList.add('ready');}catch{failed=true;rig.classList.remove('ready');return;}
      frames++;if(frames>90&&elapsed>20&&elapsed<150)slowFrames++;else slowFrames=Math.max(0,slowFrames-1);
      if(slowFrames>35&&quality>.75){quality=Math.max(.75,quality-.25);renderer.setPixelRatio(quality);renderer.setSize(width,height,false);slowFrames=0;}
      dirty=false;
      // Reduced motion only redraws on demand (or while the user rotates the object).
      if(!reduced||dragging||Math.abs(velocity)>.001)raf=requestAnimationFrame(frame);
    }
    resize();wake();
    return {
      setFinish(f,snapshot=false){
        setFinish(f);
        // The radial page snapshot must contain the new glaze, not a stale GPU frame.
        if(snapshot){
          speaker.ceramic.color.copy(targetCeramic);speaker.textile.color.copy(targetFabric);rippleMaterial.uniforms.uColor.value.copy(targetAccent);
          if(!failed)try{renderer.render(scene,camera);}catch{failed=true;rig.classList.remove('ready');}
        }
        wake();
      },
      setStory(p,active){progress=clamp(p,0,1);switchMode(active?'story':'hero');dirty=true;wake();},
      wake,
      dispose(){cancelAnimationFrame(raf);ro.disconnect();io.disconnect();renderer.dispose();envTarget.dispose();}
    };
  }catch(error){renderer?.dispose();rig.classList.remove('ready');throw error;}
}
