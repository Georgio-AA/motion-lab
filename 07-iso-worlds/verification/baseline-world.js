// Dev-only reference fixture: unchanged world builder from commit 956082a.
// Procedural miniatures only; cached geometry, instanced terrain and shared materials.
export function createWorld(THREE, RoundedBoxGeometry, residents, districts) {
const materials = new Map(), geometries = new Map();
const robots = [], rooms = [], windows = [], buildings = [], lamps = [];
const town = new THREE.Group(), home = new THREE.Group();
const scenery = {};
// Shared geometry and materials keep the small procedural world inexpensive.
function material(color, roughness = .8) {
  if (!materials.has(color)) materials.set(color, new THREE.MeshStandardMaterial({ color, roughness }));
  return materials.get(color);
}
function mesh(parent, geometry, color, x, y, z) {
  const object = new THREE.Mesh(geometry, typeof color === 'string' ? material(color) : color);
  object.position.set(x, y, z); object.castShadow = true; object.receiveShadow = true; parent.add(object); return object;
}
function box(parent, w, h, d, color, x, y, z, rounded = false) {
  const key = `${w}/${h}/${d}/${rounded}`;
  if (!geometries.has(key)) geometries.set(key, rounded ? new RoundedBoxGeometry(w, h, d, 2, Math.min(w,h,d) * .18) : new THREE.BoxGeometry(w,h,d));
  return mesh(parent, geometries.get(key), color, x,y,z);
}
function cylinder(parent, radius, height, color, x,y,z, top = radius, sides = 16) {
  const key = `c/${radius}/${height}/${top}/${sides}`;
  if (!geometries.has(key)) geometries.set(key, new THREE.CylinderGeometry(top,radius,height,sides));
  return mesh(parent, geometries.get(key), color,x,y,z);
}
function dome(parent, radius, color, x,y,z) {
  const key = `d/${radius}`;
  if (!geometries.has(key)) geometries.set(key, new THREE.SphereGeometry(radius,16,8,0,Math.PI*2,0,Math.PI/2));
  return mesh(parent, geometries.get(key),color,x,y,z);
}
function glowing(color) { return new THREE.MeshStandardMaterial({ color, emissive: '#ffc66e', emissiveIntensity: 0, roughness: .4 }); }


function buildTown() {
  const island = cylinder(town,12.2,1.25,'#b6a182',0,-.55,0,12.6,6);
  island.rotation.y = Math.PI / 6;
  cylinder(town,12.6,.22,'#ddcfaa',0,.12,0,12.6,6).rotation.y = Math.PI / 6;
  box(town,21,.07,1.1,'#efe5c9',0,.28,0);
  box(town,1.1,.07,13,'#efe5c9',0,.28,0);
  // Inlaid stepping stones and path lamps give the avenues a human scale.
  for(let i=0;i<24;i++) box(town,.38,.035,.52,'#c5bea4',-10+i*.86,.335,0,true);
  for(const x of [-8,-4,0,4,8]) for(const z of [-.65,.65]) {
    cylinder(town,.06,.55,'#4e7565',x,.6,z);
    const light = cylinder(town,.12,.17,glowing('#f3e5b6'),x,.9,z);
    lamps.push(light.material);
  }
  districts.forEach((district,i) => {
    const group = new THREE.Group(); group.position.set(district.x,0,district.z); town.add(group);
    box(group,5.5,.12,5.35,['#83b9a6','#d8a779','#91b9c9'][i%3],0,.32,0,true);
    box(group,5.2,.09,5.05,'#c7cbb5',0,.41,0,true);
    const rim = new THREE.Mesh(new THREE.BoxGeometry(5.48,.06,5.3),new THREE.MeshBasicMaterial({color:'#d7fbb8',wireframe:true,transparent:true,opacity:.9}));
    rim.position.y=.49; rim.visible=false; group.add(rim);
    let screen = null, rotor = null;
    if([0,1,3,5].includes(i)) {
      cylinder(group,1.48,.2,'#eee9d5',0,.57,-.45);
      cylinder(group,1.25,1.4,['#a5c8be','#a9c6ce','#c5ced2'][i%3],0,1.3,-.45);
      cylinder(group,1.37,.15,'#f3edda',0,2,-.45);
      dome(group,1.16,i===1||i===5?'#dc9767':'#92b8af',0,2.05,-.45);
      const windowMat=glowing('#334f51'); windows.push(windowMat);
      box(group,.8,.45,.12,windowMat,.35,1.48,.79,true);
      box(group,.65,.8,.15,'#466365',-.6,.93,.79,true);
      cylinder(group,.12,.9,'#ede7d5',1.15,2.4,-.5);
      cylinder(group,.24,.12,'#e9ab70',1.15,2.9,-.5);
      if(i===3) {
        cylinder(group,.17,.7,'#6f8e80',-.5,2.8,-.65);
        scenery.chimney = new THREE.Vector3(district.x-.5,3.25,district.z-.65);
      }
    }
    if(i===2) {
      for(let row=0;row<3;row++) for(let col=0;col<2;col++) {
        box(group,.1,.65,.1,'#6a8283',col*2-1,.8,row*1.35-1.35);
        box(group,1.75,.09,1.1,'#385c75',col*2-1,1.1,row*1.35-1.35).rotation.x=-.22;
        for(let stripe=0;stripe<4;stripe++) box(group,.025,.025,1,'#82aaa9',col*2-1.65+stripe*.43,1.18,row*1.35-1.35).rotation.x=-.22;
      }
    }
    if(i===4) {
      cylinder(group,1.3,.25,'#eae6cf',0,.6,-.4);
      cylinder(group,.7,3.4,'#b7cdc4',0,2.35,-.4,.4);
      cylinder(group,1.15,.4,'#eee9d9',0,3.9,-.4);
      dome(group,.75,'#de9b6f',0,4.12,-.4);
      cylinder(group,.07,1.6,'#496e65',0,5,-.4);
      rotor=new THREE.Group(); rotor.position.set(0,5.6,-.4);group.add(rotor);
      const dish = new THREE.Mesh(new THREE.SphereGeometry(.6,16,8,0,Math.PI*2,0,Math.PI/2),material('#86aea0'));
      dish.rotation.z=.8;rotor.add(dish);
      box(rotor,.06,.08,1.5,'#ede8d7',0,.2,.15);
      const beacon=cylinder(group,.1,.18,glowing('#c6efae'),0,5.8,-.4);
      scenery.beacon=beacon;
    }
    if(district.kind==='terminal') {
      box(group,1.45,.08,.65,'#b99871',-.55,1.03,1.15,true);
      for(const x of [-1.1,0]) box(group,.08,.6,.08,'#557467',x,.72,1.15);
      box(group,.85,.53,.12,'#304e49',-.55,1.35,1.02,true);
      screen=box(group,.72,.4,.035,new THREE.MeshStandardMaterial({color:'#99dbc7',emissive:'#8cffe0',emissiveIntensity:.25}),-.55,1.36,1.09,true);
      for(let j=0;j<3;j++) box(group,.4-j*.06,.025,.012,'#e2ffe2',-.65,1.46-j*.1,1.115);
      box(group,.65,.04,.25,'#637d70',-.55,1.095,1.34);
    }
    if(i===5) {
      // The pond uses translucent rings; moving highlights mimic shallow ripples.
      const pond=cylinder(group,.92,.055,new THREE.MeshStandardMaterial({color:'#68bdb0',metalness:.3,roughness:.2}),1.45,.5,.9, .92,32);
      scenery.pond=pond;
      scenery.ripples=[];
      for(let j=0;j<3;j++) {
        const ring=new THREE.Mesh(new THREE.RingGeometry(.35,.37,32),new THREE.MeshBasicMaterial({color:'#d7f4cf',transparent:true,opacity:.4,side:THREE.DoubleSide}));
        ring.rotation.x=-Math.PI/2;ring.position.set(1.45,.54+j*.001,.9);group.add(ring);scenery.ripples.push(ring);
      }
      for(let j=0;j<5;j++) {
        const x=-1.4+j*.4;
        cylinder(group,.19,.3,'#b7976b',x,.65,1.05);
        const plant=dome(group,.29,'#6c996f',x,.88,1.05);
        plant.scale.y=1.8;
      }
    }
    box(group,.65,.6,.6,'#d78e6f',-1.85,.8,-1.55,true);
    box(group,.65,.1,.64,'#f0e5cf',-1.85,1.12,-1.55);
    cylinder(group,.36,.65,'#7eaaa6',1.8,.8,-1.7);
    cylinder(group,.38,.09,'#dfe3c9',1.8,1.16,-1.7);
    for(let j=0;j<3;j++) dome(group,.22,'#87ac79',1.7+(j%2)*.35,.65,1.65+Math.floor(j/2)*.3);
    const hit=mesh(group,new THREE.BoxGeometry(5.1,i===4?5.5:3.1,4.9),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}),0,i===4?2.8:1.7,0);
    hit.castShadow=false;hit.receiveShadow=false;hit.userData.building=i;
    buildings.push({group,hit,screen,rotor,rim,district});
  });
  // One draw call for all scattered stones.
  const rocks=new THREE.InstancedMesh(new THREE.DodecahedronGeometry(.3,0),material('#bbaa87'),36);
  const dummy=new THREE.Object3D();
  for(let i=0;i<36;i++) {
    const angle=i*2.399, radius=10.7+Math.sin(i*12)*.5;
    dummy.position.set(Math.cos(angle)*radius,.4,Math.sin(angle)*radius*.73);
    dummy.scale.setScalar(.45+(i%4)*.22);dummy.rotation.set(i,i*.6,0);dummy.updateMatrix();rocks.setMatrixAt(i,dummy.matrix);
  }
  rocks.castShadow=true;town.add(rocks);
  residents.forEach((resident,i)=>{
    const robot=new THREE.Group();
    const bodyMaterial=material(resident.color).clone();
    box(robot,.46,.48,.35,bodyMaterial,0,.5,0,true);
    box(robot,.58,.42,.44,'#eee9db',0,.97,0,true);
    box(robot,.43,.2,.05,'#304d4b',0,.98,.235,true);
    const limbs=[];
    for(const side of [-1,1]) {
      box(robot,.085,.06,.045,new THREE.MeshBasicMaterial({color:'#bbefca'}),side*.115,.98,.265,true);
      const arm=new THREE.Group();arm.position.set(side*.34,.69,0);robot.add(arm);
      box(arm,.13,.31,.16,bodyMaterial,0,-.13,0,true);
      const leg=new THREE.Group();leg.position.set(side*.15,.3,0);robot.add(leg);
      cylinder(leg,.09,.25,'#46635c',0,-.11,0);box(leg,.19,.12,.27,'#efe9d8',0,-.22,.05,true);
      limbs.push({arm,leg,side});
    }
    cylinder(robot,.025,.16,'#4d7466',0,1.25,0);dome(robot,.065,resident.color,0,1.34,0);
    const halo=new THREE.Mesh(new THREE.RingGeometry(.5,.66,32),new THREE.MeshBasicMaterial({color:'#e9ffb9',transparent:true,opacity:.85,side:THREE.DoubleSide}));
    halo.rotation.x=-Math.PI/2;halo.position.y=.02;halo.visible=false;robot.add(halo);
    // Raycast ONLY these large targets, ahead of building hits. Opacity zero still raycasts.
    const hit=mesh(robot,new THREE.BoxGeometry(1.3,1.9,1.3),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}),0,.85,0);
    hit.castShadow=false;hit.receiveShadow=false;hit.userData.agent=i;
    const crate=new THREE.Group();crate.position.set(0,.5,.46);robot.add(crate);
    box(crate,.53,.45,.43,'#d69a6e',0,0,0,true);box(crate,.08,.46,.44,'#ead4a3',0,0,0);crate.visible=false;
    const can=new THREE.Group();can.position.set(.38,.45,.35);robot.add(can);
    cylinder(can,.15,.27,'#c8d69e',0,0,0);
    const spout=cylinder(can,.045,.34,'#c8d69e',0,-.02,.19);spout.rotation.x=Math.PI/3;
    can.visible=false;
    const effects=new THREE.BufferGeometry();
    effects.setAttribute('position',new THREE.BufferAttribute(new Float32Array(12*3),3));
    const sparks=new THREE.Points(effects,new THREE.PointsMaterial({color:'#ffda80',size:.075,transparent:true,opacity:.95,depthWrite:false}));
    sparks.visible=false;robot.add(sparks);
    const robotScale=1.13;robot.scale.setScalar(robotScale);
    robot.userData={hit,halo,limbs,bodyMaterial,crate,can,sparks,robotScale};
    town.add(robot);robots.push(robot);
  });
  // Shared smoke puffs, airborne dust and two quiet delivery drones.
  const smoke=new THREE.InstancedMesh(new THREE.SphereGeometry(.22,8,6),new THREE.MeshBasicMaterial({color:'#f3f1df',transparent:true,opacity:.25,depthWrite:false}),9);
  smoke.instanceMatrix.setUsage(THREE.DynamicDrawUsage);smoke.frustumCulled=false;town.add(smoke);scenery.smoke=smoke;
  const dustGeo=new THREE.BufferGeometry(),positions=new Float32Array(45*3);
  for(let i=0;i<45;i++){positions[i*3]=Math.sin(i*2.4)*14;positions[i*3+1]=1+(i%9)*.65;positions[i*3+2]=Math.cos(i*5.3)*10;}
  dustGeo.setAttribute('position',new THREE.BufferAttribute(positions,3));
  const dust=new THREE.Points(dustGeo,new THREE.PointsMaterial({color:'#fff8da',size:.045,transparent:true,opacity:.55,depthWrite:false}));
  town.add(dust);scenery.dust=dust;
  scenery.drones=[];
  for(let i=0;i<2;i++){
    const drone=new THREE.Group();box(drone,.5,.16,.35,'#e9e9d7',0,0,0,true);
    box(drone,.15,.04,.15,new THREE.MeshBasicMaterial({color:'#a1e1c4'}),0,-.1,0);
    for(const x of [-.4,.4]){box(drone,.15,.05,.55,'#46685d',x,.04,0);cylinder(drone,.18,.018,'#6c8975',x,.08,0);}
    town.add(drone);scenery.drones.push(drone);
  }
}
function buildHome(home) {
  box(home,13.1,.7,9.2,'#b5b8a1',0,-.2,0,true);
  box(home,13,.2,9.1,'#e4dfcd',0,.25,0,true);
  const names = ['Living room','Kitchen','Bedroom','Studio','Dining room','Bathroom'];
  for (let i = 0; i < 6; i++) {
    const x = (i % 3 - 1) * 4.1, z = Math.floor(i / 3) * 4.2 - 2.1;
    const group = new THREE.Group(); group.position.set(x,0,z); home.add(group);
    const floorMat = glowing('#a4b3af');
    const floor = box(group,3.95,.1,4.05,floorMat,0,.41,0);
    // Full back walls and low front partitions create a readable cutaway.
    box(group,4.08,i < 3 ? 2.65 : .45,.12,'#f1ecdb',0,i < 3 ? 1.78 : .68,-2.03);
    box(group,.12,i % 3 === 0 ? 2.65 : .7,4.13,'#e4e1d0',-2,i % 3 === 0 ? 1.78 : .82,0);
    box(group,3.98,.32,.12,'#f1ecdb',0,.58,2.03);
    const fixture = cylinder(group,.18,.05,glowing('#f1dab0'),1.5,.54,1.5);
    rooms.push({ name:names[i], floor, fixture, on:i === 0 || i === 4, glow:-.01 });
    if (i === 0) {
      box(group,2.4,.45,.8,'#668f83',-.2,.76,-.9,true);
      box(group,2.4,.55,.22,'#668f83',-.2,1.07,-1.23,true);
      for (let j = 0; j < 3; j++) box(group,.7,.12,.7,'#9eb6a0',-.95+j*.75,1,-.83,true);
      box(group,2.45,.04,2,'#ded4b4',0,.48,.45);
      box(group,1.2,.4,.7,'#b99470',0,.75,.4,true);
      box(group,1.05,.025,.58,'#eadbbe',0,.97,.4);
    } else if (i === 1) {
      box(group,3.4,.9,.7,'#91a799',0,.9,-1.55,true);
      box(group,3.5,.09,.8,'#eee9da',0,1.4,-1.55);
      box(group,1.65,.9,.8,'#b29675',.1,.9,.45,true);
      box(group,1.75,.1,.9,'#eee9da',.1,1.4,.45);
      cylinder(group,.25,.06,'#4e6661',-.5,1.48,-1.55);
      cylinder(group,.25,.06,'#4e6661',.15,1.48,-1.55);
      box(group,.55,1.8,.65,'#c6d0c6',1.55,1.4,-1.55,true);
    } else if (i === 2) {
      box(group,2.1,.4,2.9,'#aa9479',-.2,.7,0,true);
      box(group,2.1,.22,2.8,'#eee8d5',-.2,1,0,true);
      box(group,2.12,.08,1.8,'#b6a8c4',-.2,1.14,.4,true);
      for (const side of [-1,1]) box(group,.8,.2,.5,'#fff4e1',-.2+side*.5,1.2,-.9,true);
      box(group,.6,.6,.65,'#b6a385',1.35,.75,-.9,true);
    } else if (i === 3) {
      box(group,2.3,.1,.9,'#c2a47b',0,1.25,-1);
      for (const side of [-1,1]) box(group,.1,.8,.65,'#6d8377',side*.95,.8,-1);
      box(group,.8,.5,.06,'#355351',0,1.6,-1.15,true);
      box(group,.7,.15,.15,'#9bada0',0,1.33,-1.13);
      box(group,.75,.8,.8,'#839e91',0,.95,.1,true);
      box(group,.7,1.5,.3,'#ad9473',-1.4,1.2,-1.65);
    } else if (i === 4) {
      box(group,2.25,.12,1.3,'#c4a179',0,1.13,0,true);
      for (const side of [-1,1]) for (const pos of [-.7,.7]) {
        box(group,.45,.65,.5,'#79968b',pos,.83,side*.95,true);
        box(group,.45,.5,.09,'#79968b',pos,1.16,side*1.15,true);
      }
      cylinder(group,.2,.2,'#ede2c9',0,1.32,0);
      dome(group,.24,'#a6b787',0,1.43,0);
    } else {
      box(group,1.5,.55,2.2,'#eee8d9',-.6,.76,-.1,true);
      box(group,1.1,.07,1.8,'#9ec4c3',-.6,1.05,-.1,true);
      box(group,.8,.8,.6,'#b09d7e',1.2,.9,-1.3,true);
      cylinder(group,.32,.12,'#f2eadb',1.2,1.4,-1.3);
      box(group,.75,.9,.07,'#91b0b4',1.2,2,-1.93,true);
    }
    cylinder(group,.22,.32,'#c7aa85',-1.4,.62,1.35);
    dome(group,.4,'#7e9d6f',-1.4,.9,1.35);
  }
  // A compressed group of slats grows downward from the window's upper rail.
  box(home,2.65,2.2,.08,'#749e9e',-4.1,1.78,-4.15);
  box(home,2.85,.12,.17,'#eee7d5',-4.1,2.96,-4.2);
  const blind = new THREE.Group(); home.add(blind); blind.position.set(-4.1,2.87,-4.25);
  for (let i = 0; i < 15; i++) box(blind,2.6,.12,.08,'#d5c3a3',0,1.1-i*.155,0);
  blind.scale.y = .025;
  return blind;
}


buildTown();
const blind=buildHome(home);home.visible=false;
return {town,home,robots,rooms,windows,buildings,lamps,scenery,blind};
}
