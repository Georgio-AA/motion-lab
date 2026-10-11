import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Traffic, LaneGraph, sampleEdge, checkClearance } from './traffic.js';
import { warehouseLayout, airportLayout } from './layouts.js';
import { drawLayout } from './scenery.js';

const clamp = THREE.MathUtils.clamp;

// Each tile is one merged, vertex-coloured mesh. Repeated details are instanced.
class Workshop {
  constructor() {
    this.lit = new THREE.MeshStandardMaterial({ roughness:.78, metalness:.02, vertexColors:true });
    this.instanceMaterial = new THREE.MeshStandardMaterial({ roughness:.8, metalness:.02 });
    this.glow = new THREE.MeshBasicMaterial({ vertexColors:true });
    this.shadowMaterial = new THREE.MeshBasicMaterial({ color:0x1a2d45, transparent:true, opacity:.12, depthWrite:false });
    this.cache = new Map();
    this.matrix = new THREE.Matrix4();
    this.dummy = new THREE.Object3D();
    this.color = new THREE.Color();
  }
  box(w,h,d,rounded=true) {
    const key = `${w}/${h}/${d}/${rounded}`;
    if (!this.cache.has(key)) {
      const geometry = rounded ? new RoundedBoxGeometry(w,h,d,1,Math.min(w,h,d,.3)*.13) : new THREE.BoxGeometry(w,h,d);
      this.cache.set(key,geometry.index ? geometry.toNonIndexed() : geometry);
      if(geometry.index) geometry.dispose();
    }
    return this.cache.get(key);
  }
  cylinder(r,h,n=10) {
    const key=`c${r}/${h}/${n}`;
    if (!this.cache.has(key)) {
      const g=new THREE.CylinderGeometry(r,r,h,n).toNonIndexed();
      this.cache.set(key,g);
    }
    return this.cache.get(key);
  }
  builder() { return { solid:[], glow:[] }; }
  piece(builder,geometry,color,x,y,z,rx=0,ry=0,rz=0,glow=false) {
    // copy() avoids re-running RoundedBoxGeometry's constructor (clone() does), which warns.
    const g=new THREE.BufferGeometry().copy(geometry);
    this.dummy.position.set(x,y,z); this.dummy.rotation.set(rx,ry,rz); this.dummy.scale.set(1,1,1); this.dummy.updateMatrix();
    g.applyMatrix4(this.dummy.matrix);
    this.color.set(color);
    const colors=new Float32Array(g.attributes.position.count*3);
    for (let i=0;i<colors.length;i+=3) { colors[i]=this.color.r; colors[i+1]=this.color.g; colors[i+2]=this.color.b; }
    g.setAttribute('color',new THREE.BufferAttribute(colors,3));
    (glow ? builder.glow : builder.solid).push(g);
  }
  block(b,w,h,d,c,x,y,z,rx=0,ry=0,rz=0,glow=false) { this.piece(b,this.box(w,h,d),c,x,y,z,rx,ry,rz,glow); }
  finish(builder,parent) {
    for (const kind of ['solid','glow']) {
      if (!builder[kind].length) continue;
      const g=mergeGeometries(builder[kind]);
      builder[kind].forEach(part=>part.dispose());
      const mesh=new THREE.Mesh(g,kind==='glow' ? this.glow : this.lit);mesh.matrixAutoUpdate=false;parent.add(mesh);
    }
  }
  instances(parent,geometry,positions,colors,material=this.instanceMaterial) {
    const mesh=new THREE.InstancedMesh(geometry,material,positions.length);
    for (let i=0;i<positions.length;i++) {
      const p=positions[i];
      this.dummy.position.set(p[0],p[1],p[2]); this.dummy.rotation.set(p[3]||0,p[4]||0,p[5]||0); this.dummy.scale.set(1,1,1); this.dummy.updateMatrix();
      mesh.setMatrixAt(i,this.dummy.matrix);
      if (colors) mesh.setColorAt(i,this.color.set(Array.isArray(colors) ? colors[i%colors.length] : colors));
    }
    mesh.matrixAutoUpdate=false;parent.add(mesh); return mesh;
  }
  shadow(parent,w,d) {
    const g=new THREE.CircleGeometry(1,20); g.rotateX(-Math.PI/2);
    const mesh=new THREE.Mesh(g,this.shadowMaterial); mesh.position.y=.06; mesh.scale.set(w,1,d); parent.add(mesh);parent.userData.shadow=mesh;
  }
}

function pallet(k,b,x,y,z) {
  k.block(b,.9,.12,.75,0xc2a074,x,y,z);
  k.block(b,.78,.65,.64,0xddb174,x,y+.38,z);
  k.block(b,.06,.65,.65,0xf1d0a4,x,y+.38,z);
}
function wingGeometry(span,length) {
  const shape=new THREE.Shape();shape.moveTo(-.25,length*.45);shape.lineTo(-span,-length*.15);shape.lineTo(-span,-length*.4);shape.lineTo(0,-length*.2);shape.lineTo(span,-length*.4);shape.lineTo(span,-length*.15);shape.lineTo(.25,length*.45);shape.closePath();
  const g=new THREE.ExtrudeGeometry(shape,{depth:.09,bevelEnabled:false});g.rotateX(Math.PI/2);return g.index ? g.toNonIndexed() : g;
}
function addEntity(k,world,actor) {
  const {type,id,cargo,accent}=actor;
  const group=new THREE.Group(),b=k.builder();world.group.add(group);
  if(type==='plane') {
    const fuselage=new THREE.SphereGeometry(1,12,8).toNonIndexed();fuselage.scale(.36,.34,1.8);k.piece(b,fuselage,0xdce5ed,0,.55,0);fuselage.dispose();
    const wings=wingGeometry(1.85,1.65);k.piece(b,wings,0xb4c3d2,0,.5,-.1);wings.dispose();
    const tail=wingGeometry(.8,.7);k.piece(b,tail,accent,0,.75,-1.3);tail.dispose();
    k.block(b,.1,.77,.64,accent,0,1.05,-1.35,Math.PI/10);
    k.block(b,.3,.16,.4,0x334860,0,.8,1.05,Math.PI/9);
    k.piece(b,k.cylinder(.16,.65),0x99aabe,-.7,.37,-.4,Math.PI/2);k.piece(b,k.cylinder(.16,.65),0x99aabe,.7,.37,-.4,Math.PI/2);
    const windows=[];for(let i=0;i<8;i++) { windows.push([.34,.66,-.9+i*.24]);windows.push([-.34,.66,-.9+i*.24]); }
    k.instances(group,k.box(.035,.065,.09,false),windows,0x435570);
    k.block(b,.075,.07,.09,0xe88178,-1.8,.51,-.3,0,0,0,true);k.block(b,.075,.07,.09,0x95d7b1,1.8,.51,-.3,0,0,0,true);
    k.shadow(group,1.6,1.65);
  } else {
    const truck=type==='truck',fork=type==='forklift',tug=type==='tug';
    const w=truck ? 1.15 : fork ? .65 : .8,l=truck ? 2.8 : fork ? 1.15 : 1.5;
    k.block(b,w,.36,l,0x384d62,0,.35,0);
    if(fork) {
      k.block(b,.7,.35,.65,accent,0,.58,-.3);k.block(b,.12,1.2,.12,0x405566,-.27,1,.15);k.block(b,.12,1.2,.12,0x405566,.27,1,.15);k.block(b,.75,.12,.7,accent,0,1.62,-.1);
      k.block(b,.5,.16,.4,0x35414d,0,.8,-.06);k.block(b,.6,1.05,.1,0x4a5f70,0,.75,.57);
      const forks=new THREE.Group(),fb=k.builder();k.block(fb,.07,.08,.7,0x70818b,-.22,.23,.9);k.block(fb,.07,.08,.7,0x70818b,.22,.23,.9);k.finish(fb,forks);group.add(forks);group.userData.forks=forks;
      const load=new THREE.Group(),pb=k.builder();pallet(k,pb,0,.31,.9);k.finish(pb,load);group.add(load);
      group.userData.load=load;
    } else {
      k.block(b,w,.8,l*.42,accent,0,.9,l*.27);k.block(b,w+.02,.3,.08,0x648ba6,0,1.02,l*.48);
      if(truck) {
        k.block(b,.09,1.25,1.75,0xf3f5f3,-(w-.09)/2,1,-.5);k.block(b,.09,1.25,1.75,0xf3f5f3,(w-.09)/2,1,-.5);
        k.block(b,w,.09,1.75,0xf3f5f3,0,1.625,-.5);k.block(b,w,1.25,.08,0xf3f5f3,0,1,.34);
        k.block(b,.03,.28,1.5,0x3d6fe2,w*.51,1.12,-.5);k.block(b,.03,.28,1.5,0x3d6fe2,-w*.51,1.12,-.5);
        const door=new THREE.Group(),db=k.builder();door.position.set(0,1,-1.39);
        k.block(db,w,1.25,.06,0xe5ebed,0,0,0);
        for(let j=0;j<5;j++) k.block(db,w*.92,.025,.012,0xb7c5ce,0,-.5+j*.25,-.038);
        k.finish(db,door);group.add(door);group.userData.rearDoor=door;group.userData.rearOpen=0;
      }
      else if(!tug) k.block(b,w,.78,l*.55,accent,0,.9,-.25);
      if(tug) k.block(b,.65,.35,.65,0xb1b6bd,0,.67,-.65);
      k.block(b,.18,.12,.05,0xf4e6bc,-w*.3,.68,l*.51,0,0,0,true);k.block(b,.18,.12,.05,0xf4e6bc,w*.3,.68,l*.51,0,0,0,true);
    }
    const wheels=[]; for(let side=-1;side<=1;side+=2) for(let i=0;i<2;i++) wheels.push([side*w*.51,.25,(i ? 1 : -1)*l*.32,0,0,Math.PI/2]);
    k.instances(group,k.cylinder(fork ? .18 : .23,.13,8),wheels,0x304255);
    k.shadow(group,w*.9,l*.6);
  }
  k.finish(b,group);
  // Oversized proxies are invisible but raycastable, making small vehicles easy to select.
  const hit=new THREE.Mesh(new THREE.BoxGeometry(type==='plane' ? 4 : 1.6,2,type==='plane' ? 4 : 3.1),world.hitMaterial);
  hit.position.y=.8;hit.layers.set(1);group.add(hit);
  const entity={group,hit,type,id,cargo,actor,state:actor.state};
  hit.userData.entity=entity;world.entities.push(entity);world.hitTargets.push(hit);
  group.position.set(entity.state.x,entity.state.y,entity.state.z);group.rotation.y=entity.state.heading;
}

export function createWorld(mode) {
  const k=new Workshop();
  const world={mode,group:new THREE.Group(),tiles:[],extras:[],entities:[],hitTargets:[],edgeLights:[],materials:[],boxes:null,radar:null,strobes:null,completed:0,kit:k};
  world.hitMaterial=new THREE.MeshBasicMaterial({visible:false});
  try {
    world.layout=mode==='warehouse'?warehouseLayout():airportLayout();
    world.traffic=new Traffic(world.layout);
    if(new URLSearchParams(window.location.search).has('debug')) world.collisionCount=checkClearance(world.layout,true).length;
    drawLayout(k,world);
    for(const actor of world.traffic.actors) addEntity(k,world,actor);
    if(world.boxes) {
      const graph=new LaneGraph('parcel'),nodes=world.beltNodes;
      for(let i=0;i<nodes.length;i++) graph.node(String(i),nodes[i][0],nodes[i][1],.92);
      for(let i=0;i<nodes.length;i++) {
        const j=(i+1)%nodes.length,a=nodes[i],d=nodes[j];let controls;
        if(i%2) {
          const corner=i===1?[1.5,-8.7]:i===3?[1.5,-7.5]:i===5?[-1.5,-7.5]:[-1.5,-8.7];
          controls=[[a[0]+(corner[0]-a[0])*.5523,.92,a[1]+(corner[1]-a[1])*.5523],
            [d[0]+(corner[0]-d[0])*.5523,.92,d[1]+(corner[1]-d[1])*.5523]];
        }
        graph.edge(String(i),String(i),String(j),controls?{controls}:{});
      }
      world.beltEdges=Array.from(graph.edges.values());world.beltLength=world.beltEdges.reduce((n,e)=>n+e.length,0);
    }
  }
  catch(error) { disposeWorld(world);throw error; }
  world.group.rotation.y=-.08;
  return world;
}

// All per-frame scratch objects are persistent. No geometry, lights or vectors in the loop.
const instanceDummy=new THREE.Object3D();
const beltState={x:0,y:0,z:0,heading:0,status:'',progress:0,eta:0};
export function updateWorld(world,time,dt,buildTime,phase='build',reduced=false,effects=true) {
  if(phase!=='drop') world.traffic.tick(dt*(reduced?.45:1));
  world.completed=world.traffic.completed;
  for(let i=0;phase!=='live'&&i<world.tiles.length;i++) {
    const t=world.tiles[i];
    if(reduced) { t.group.scale.setScalar(1);t.group.position.y=0;t.group.rotation.z=0;continue; }
    if(phase==='drop') {
      const p=clamp((buildTime-t.delay*.6)/.55,0,1);
      t.group.position.y=-10*p*p;t.group.scale.setScalar(Math.max(.001,1-p));t.group.rotation.z=p*.3;
    } else {
      const p=clamp((buildTime-t.delay)/.9,0,1);
      const spring=p===1 ? 1 : 1-Math.exp(-7*p)*Math.cos(p*10);
      t.group.scale.setScalar(Math.max(.001,spring));t.group.position.y=-3*(1-p)*(1-p);t.group.rotation.z=0;
    }
  }
  const reveal=reduced ? 1 : clamp((buildTime-.3)/.8,0,1);
  for(let i=0;i<world.extras.length;i++) { world.extras[i].visible=phase!=='drop';world.extras[i].scale.setScalar(Math.max(.001,reveal)); }
  for(let i=0;i<world.entities.length;i++) {
    const e=world.entities[i],s=e.state;
    e.group.visible=phase!=='drop' && reveal>.8 && s.status!=='Next rotation' && s.status!=='Next shipment';
    if(e.type==='plane'&&e.actor.index===0&&e.actor.distance===0&&world.traffic.locks.get('runway')!==e.actor) e.group.visible=false;
    e.group.position.set(s.x,s.y,s.z);
    if(e.type==='plane') e.group.userData.shadow.position.y=.06-s.y;
    e.group.rotation.y=s.heading;
    if(e.type==='forklift') {
      const step=e.actor.plan[e.actor.index];
      e.group.userData.load.visible=e.actor.loaded||step.action==='pick'&&e.actor.age>1;
      e.group.userData.load.position.y=e.actor.lift;e.group.userData.forks.position.y=e.actor.lift;
    }
    if(e.type==='truck') {
      const data=e.group.userData,open=s.status==='Loading at dock'?1:0;
      data.rearOpen+=(open-data.rearOpen)*(1-Math.exp(-dt*6));
      data.rearDoor.scale.y=1-.98*data.rearOpen;data.rearDoor.position.y=1+.625*data.rearOpen;
    }
  }
  if(world.boxes) {
    for(let i=0;i<18;i++) {
      let distance=(time*.55+i*world.beltLength/18)%world.beltLength;
      let edge=world.beltEdges[0];
      for(let j=0;j<world.beltEdges.length;j++) { edge=world.beltEdges[j];if(distance<=edge.length) break;distance-=edge.length; }
      sampleEdge(edge,distance,beltState);instanceDummy.position.set(beltState.x,beltState.y,beltState.z);instanceDummy.rotation.set(0,beltState.heading,0);instanceDummy.scale.set(1,1,1);instanceDummy.updateMatrix();world.boxes.setMatrixAt(i,instanceDummy.matrix);
    }
    world.boxes.instanceMatrix.needsUpdate=true;
    for(let i=0;i<world.doors.length;i++) {
      const door=world.doors[i],cargo=world.unloads[i];let actor=null;
      for(let j=0;j<world.traffic.actors.length;j++) {
        const candidate=world.traffic.actors[j];
        if(candidate.dock===door.id&&(candidate.state.status==='Loading at dock'||candidate.state.status==='Loading outbound')) { actor=candidate;break; }
      }
      const open=actor?Math.min(1,actor.age/1.2):0;
      door.open+=(open-door.open)*(1-Math.exp(-dt*6));
      door.group.scale.y=1-.98*door.open;door.group.position.y=1+.9*door.open;
      cargo.group.visible=!!actor&&actor.age>1.5;
      if(actor) {
        const u=((actor.age-1.5)%2.1)/2.1,v=actor.type==='van'?1-Math.max(0,u):Math.max(0,u);
        cargo.group.position.set(cargo.x+(v>.65?(v-.65)/.35*1.75:0),.22,v<.65?3.05-v/.65*1.35:1.7+(v-.65)/.35*.3);
      }
    }
  }
  if(world.radar) world.radar.rotation.y=reduced ? 0 : time*.7;
  if(world.strobes) {
    const phaseIndex=Math.floor(time*12)%12;
    for(let i=0;i<12;i++) {
      instanceDummy.position.set(-15+i*.5,.09,8.2);instanceDummy.rotation.set(0,0,0);instanceDummy.scale.setScalar(effects && i===phaseIndex ? 1.9 : .6);instanceDummy.updateMatrix();world.strobes.setMatrixAt(i,instanceDummy.matrix);
    }
    world.strobes.instanceMatrix.needsUpdate=true;
  }
  for(let i=0;i<world.edgeLights.length;i++) {
    const intensity=reduced||!effects ? .8 : .8+.2*Math.sin(time*2+i*.4);
    world.edgeLights[i].material.color.setRGB(.65*intensity,.8*intensity,intensity);
  }
}

export function disposeWorld(world) {
  if(!world) return;
  const geometries=new Set(),materials=new Set(world.materials);
  world.group.traverse(object=> { if(object.geometry) geometries.add(object.geometry);if(object.material) { if(Array.isArray(object.material)) object.material.forEach(m=>materials.add(m));else materials.add(object.material); }if(object.isInstancedMesh) object.dispose(); });
  world.kit.cache.forEach(g=>geometries.add(g));
  materials.add(world.kit.lit);materials.add(world.kit.glow);materials.add(world.kit.instanceMaterial);materials.add(world.kit.shadowMaterial);materials.add(world.hitMaterial);
  geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());world.group.clear();
}
