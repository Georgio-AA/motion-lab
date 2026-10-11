import * as THREE from 'three';
import { sampleEdge } from './traffic.js';

// All scenery comes from the same footprint registry used by the clearance check.
export function drawLayout(k,world) {
  const night=world.mode==='airport', tiles=[];
  for(let row=0;row<5;row++) for(let col=0;col<6;col++) {
    const x=(col-2.5)*5,z=(row-2)*5+.4,group=new THREE.Group(),b=k.builder();
    group.position.set(x,0,z);k.block(b,4.94,.55,4.94,night?0x27334b:0xe4e9e3,0,-.32,0);
    const t={group,b,x,z,delay:(x+12.5)*.011+(z+9.6)*.018+(row*6+col)*.006};
    tiles.push(t);world.tiles.push(t);world.group.add(group);
  }
  for(const o of world.layout.obstacles) {
    if(o.kind==='door') continue; // Animated separately, with its closed footprint still checked.
    let t=tiles[0],distance=Infinity;
    for(const candidate of tiles) { const d=(candidate.x-o.x)**2+(candidate.z-o.z)**2;if(d<distance){t=candidate;distance=d;} }
    const b=t.b,x=o.x-t.x,z=o.z-t.z,y=o.minY+o.height/2;
    if(o.kind==='rack') {
      k.block(b,o.w,.14,o.d,0x294aa5,x,.18,z);
      const posts=[],shelves=[],boxes=[];
      for(const sx of [-.85,.85]) for(const sz of [-1.9,0,1.9]) posts.push([x+sx,1.47,z+sz]);
      for(let level=0;level<3;level++) {
        shelves.push([x,.25+level*.85,z]);
        for(let j=0;j<4;j++) boxes.push([x,.62+level*.85,z-1.5+j]);
      }
      k.instances(t.group,k.box(.1,2.9,.1),posts,0x3c68e9);
      k.instances(t.group,k.box(1.8,.1,4),shelves,0x294aa5);
      k.instances(t.group,k.box(1.25,.64,.78),boxes,[0xdfb580,0xeec997,0xc49c70]);
    } else if(o.kind==='pallet') {
      k.block(b,.9,.12,.75,0xc2a074,x,.06,z);k.block(b,.78,.65,.64,0xddb174,x,.445,z);
      k.block(b,.06,.65,.65,0xf1d0a4,x,.445,z);
    } else if(o.kind==='tree') {
      k.piece(b,k.cylinder(.1,.65),0xb49166,x,.38,z);
      k.piece(b,k.cylinder(.45,.95,7),0x93b59a,x,1.05,z);k.piece(b,k.cylinder(.35,.55,7),0xa7c8a6,x,1.65,z);
    } else if(o.kind==='tower') {
      k.block(b,1.1,3.5,1.1,0x7b8ba3,x,1.8,z);k.block(b,2,.2,1.8,0x455d7c,x,3.52,z);
      k.block(b,1.8,.65,1.6,0x9ad8df,x,3.94,z,0,0,0,true);k.block(b,2.1,.22,1.95,0x7993aa,x,4.39,z);
      k.piece(b,k.cylinder(.05,.8),0xa3b8cb,x,4.85,z);k.block(b,.15,.15,.15,0xef896b,x,5.3,z,0,0,0,true);
      const radar=new THREE.Group(),rb=k.builder();radar.position.set(x,4.95,z);k.block(rb,1.25,.26,.13,0x8aa8c4,0,0,0);k.finish(rb,radar);
      const sg=new THREE.CircleGeometry(1.7,12,0,.75);sg.rotateX(-Math.PI/2);
      const sm=new THREE.MeshBasicMaterial({color:0x91dfb9,transparent:true,opacity:.2,depthWrite:false,side:THREE.DoubleSide});
      radar.add(new THREE.Mesh(sg,sm));t.group.add(radar);world.radar=radar;
    } else {
      const color=o.kind==='roof'||o.kind==='frame'?0x3c68e9:o.kind==='conveyor'?0x738b9c:o.kind==='dock'?0x8094a1:
        o.kind==='terminal'?0x566b83:o.kind==='gate'?0x8ea2b5:o.kind==='building'?0x455d7a:0xe5edf3;
      k.block(b,o.w,o.height,o.d,color,x,y,z);
      if(o.kind==='roof') {
        const skylights=[];for(let j=0;j<5;j++) skylights.push([x-o.w*.4+j*o.w*.2,y+o.height/2+.025,z]);
        k.instances(t.group,k.box(.7,.045,1.8),skylights,0x9fceef);
      }
      if(o.kind==='terminal') {
        // Roof slab sits 6cm above the walls with a small overhang; a top flush with the
        // terminal block (both at 1.9) z-fought and flickered while zooming.
        k.block(b,o.w+.18,.2,o.d+.18,0x8093ab,x,o.minY+o.height+.06-.1,z);
        const windows=[];for(let j=0;j<26;j++) windows.push([x-8+j*.64,.85,z+o.d/2+.008]);
        const mat=new THREE.MeshBasicMaterial({color:0xf4d4a2});world.materials.push(mat);
        k.instances(t.group,k.box(.49,.95,.025),windows,null,mat);
        k.block(b,o.w,.1,.12,0xf2d09b,x,1.55,z+o.d/2,0,0,0,true);
      }
      if(o.kind==='gate') k.block(b,o.w*.85,.35,.025,0xf6d7a6,x,1,z+o.d/2+.005,0,0,0,true);
      if(o.kind==='conveyor') {
        const rollers=[];const horizontal=o.w>o.d,count=Math.floor((horizontal?o.w:o.d)/.22);
        for(let j=0;j<count;j++) rollers.push([x+(horizontal?-o.w/2+.12+j*.22:0),.7,z+(horizontal?0:-o.d/2+.12+j*.22),horizontal?0:Math.PI/2,0,horizontal?Math.PI/2:0]);
        k.instances(t.group,k.cylinder(.045,.48,6),rollers,0xa8bac6);
      }
    }
  }
  for(const t of tiles) k.finish(t.b,t.group);
  const ground=new THREE.Group();world.group.add(ground);world.extras.push(ground);
  drawLanes(k,world,ground);
  if(night) airportDetails(k,world,ground);else warehouseDetails(k,world,ground);
}

function ribbon(edge,width) {
  const positions=[],normals=[],uvs=[],a={},b={},count=Math.max(2,Math.ceil(edge.length/.25));
  for(let i=0;i<count;i++) {
    sampleEdge(edge,edge.length*i/count,a);sampleEdge(edge,edge.length*(i+1)/count,b);
    const sign=edge.reverse?-1:1;
    const ax=Math.cos(a.heading)*width/2*sign,az=-Math.sin(a.heading)*width/2*sign,bx=Math.cos(b.heading)*width/2*sign,bz=-Math.sin(b.heading)*width/2*sign;
    positions.push(a.x-ax,0,a.z-az,b.x+bx,0,b.z+bz,a.x+ax,0,a.z+az,a.x-ax,0,a.z-az,b.x-bx,0,b.z-bz,b.x+bx,0,b.z+bz);
    for(let j=0;j<6;j++){normals.push(0,1,0);uvs.push(0,0);}
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  g.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));return g;
}
function drawLanes(k,world,parent) {
  const b=k.builder(),seen=new Set(),marks={road:[],forklift:[],plane:[],tug:[]},p={};
  // Broad manoeuvring aprons support the whole turning body, beyond its centreline.
  if(world.mode==='warehouse') k.block(b,18,.018,5.8,0xb1c0c8,0,0,5.75);
  else k.block(b,24.8,.018,9.4,0x2b384f,0,0,1.1);
  for(const graph of world.layout.graphs) for(const edge of graph.edges.values()) {
    if(edge.air) continue;
    const type=graph.type==='truck'||graph.type==='van'?'road':graph.type,key=`${type}/${edge.markKey||edge.laneKey}`;
    if(seen.has(key)) continue;seen.add(key);
    const runway=type==='plane'&&(edge.id==='landing'||edge.id==='takeoff');
    const width=type==='road'?3:type==='forklift'?1.45:type==='tug'?1.55:4.25;
    if(!runway) {
      const g=ribbon(edge,width);k.piece(b,g,type==='forklift'?0xc9d6dd:type==='road'?0x9baebc:type==='tug'?0x344159:0x202b40,0,type==='tug'?.019:.014,0);g.dispose();
    }
    const spacing=type==='plane'?.36:.6;
    for(let s=.15;s<edge.length;s+=spacing) { sampleEdge(edge,s,p);marks[type].push([p.x,.041,p.z,0,p.heading,0]); }
  }
  if(world.mode==='airport') k.block(b,25,.04,4.4,0x172134,0,.004,8.2);
  k.finish(b,parent);
  for(const type of Object.keys(marks)) if(marks[type].length) k.instances(parent,k.box(type==='plane'?.045:.06,.014,type==='plane'?.37:.3,false),marks[type],
    type==='plane'?0xd5b768:type==='forklift'?0x6284ac:type==='tug'?0xa9bace:0xf7f4e9);
}

function warehouseDetails(k,world,parent) {
  const b=k.builder();world.doors=[];world.unloads=[];
  for(const dock of world.layout.docks) {
    const x=dock.x,door=new THREE.Group(),db=k.builder();door.position.set(x,1,2.49);
    k.block(db,2.35,1.8,.08,0x3d6bd2,0,0,0);
    for(let j=0;j<6;j++) k.block(db,2.2,.025,.025,0x7397e0,0,-.72+j*.28,.052);
    k.finish(db,door);parent.add(door);world.doors.push({group:door,id:dock.id,open:0});
    for(const side of [-1,1]) k.block(b,.045,.02,2.6,0xf7f4e9,x+side*1.1,.055,4.15);
    const cargo=new THREE.Group(),cb=k.builder();k.block(cb,.7,.12,.6,0xc2a074,0,.08,0);k.block(cb,.62,.5,.5,0xddb174,0,.4,0);k.finish(cb,cargo);parent.add(cargo);
    world.unloads.push({group:cargo,id:dock.id,x});
  }
  k.finish(b,parent);
  const material=new THREE.MeshStandardMaterial({roughness:.8});world.materials.push(material);
  world.boxes=k.instances(parent,k.box(.33,.33,.33),Array.from({length:18},()=>[0,.92,0]),[0xd8a971,0xe7c495],material);
  world.boxes.instanceMatrix.setUsage(THREE.DynamicDrawUsage);world.boxes.frustumCulled=false;
  // A filleted belt loop uses the same arc-length sampler as the vehicle lanes.
  // Small square corners are rounded with cubic quarter-arcs, keeping every parcel on the rollers.
  const nodes=[[-1.25,-8.7],[1.25,-8.7],[1.5,-8.45],[1.5,-7.75],[1.25,-7.5],[-1.25,-7.5],[-1.5,-7.75],[-1.5,-8.45]];
  // The graph is imported by world.js; this descriptor is built once there.
  world.beltNodes=nodes;
}
function airportDetails(k,world,parent) {
  const b=k.builder(),lights=[];
  for(let x=-12;x<=12;x+=.75) for(const z of [6.02,10.38]) lights.push([x,.08,z]);
  const lm=new THREE.MeshBasicMaterial({color:0xbad6ff});world.materials.push(lm);world.edgeLights.push(k.instances(parent,k.box(.1,.045,.1),lights,null,lm));
  for(const x of [-10.8,10.8]) for(let i=0;i<7;i++) k.block(b,.08,.02,1.1,0xdde9f5,x+i*.2-.6,.055,8.2,0,0,0,true);
  // Hold-short double line and the stand stop bars communicate the actual stop points.
  for(const x of [-9.5,-9.35]) k.block(b,.07,.025,3.8,0xe4b861,x,.05,3.8);
  for(const gate of world.layout.gates) k.block(b,1.35,.02,.075,0xd5b768,gate.x,.052,-1.5);
  k.finish(b,parent);
  const strobes=[];for(let i=0;i<12;i++) strobes.push([-15+i*.5,.09,8.2]);
  const sm=new THREE.MeshBasicMaterial({color:0xffe5bd});world.materials.push(sm);
  world.strobes=k.instances(parent,k.box(.13,.04,.13),strobes,null,sm);world.strobes.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const am=new THREE.LineBasicMaterial({color:0x7b9ccd,transparent:true,opacity:.17});world.materials.push(am);
  for(let a=0;a<3;a++) {
    const points=[];for(let i=0;i<=48;i++){const u=i/48;points.push(new THREE.Vector3(-15+u*30,Math.sin(u*Math.PI)*(4+a),-5-a*1.8+Math.sin(u*Math.PI)*2));}
    parent.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),am));
  }
}
