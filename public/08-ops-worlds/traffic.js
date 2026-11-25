// World-independent lane geometry and traffic. Distances are metres, speeds metres/s.
const EPS = 1e-6;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const VEHICLES = {
  truck: { halfWidth:.72, halfLength:1.5, height:1.8, speed:1.65 },
  van: { halfWidth:.5, halfLength:.88, height:1.5, speed:1.9 },
  forklift: { halfWidth:.52, halfLength:1.4, height:1.8, speed:.9 },
  plane: { halfWidth:1.92, halfLength:1.85, height:1.55, speed:1.65 },
  tug: { halfWidth:.5, halfLength:.94, height:1.5, speed:1.1 },
};

function bezier(a, b, c, d, t, out) {
  const u=1-t, aa=u*u*u, bb=3*u*u*t, cc=3*u*t*t, dd=t*t*t;
  out.x=aa*a[0]+bb*b[0]+cc*c[0]+dd*d[0];
  out.y=aa*a[1]+bb*b[1]+cc*c[1]+dd*d[1];
  out.z=aa*a[2]+bb*b[2]+cc*c[2]+dd*d[2];
  out.heading=Math.atan2(3*u*u*(b[0]-a[0])+6*u*t*(c[0]-b[0])+3*t*t*(d[0]-c[0]),
    3*u*u*(b[2]-a[2])+6*u*t*(c[2]-b[2])+3*t*t*(d[2]-c[2]));
}

export class LaneGraph {
  constructor(type) { this.type=type; this.nodes=new Map(); this.edges=new Map(); }
  node(id,x,z,y=.05) { this.nodes.set(id,[x,y,z]); return id; }
  edge(id,from,to,options={}) {
    const a=this.nodes.get(from), d=this.nodes.get(to);
    if(!a||!d) throw new Error(`Missing lane node: ${id}`);
    const b=options.controls?.[0] || a.map((v,i)=>v+(d[i]-v)/3);
    const c=options.controls?.[1] || a.map((v,i)=>v+2*(d[i]-v)/3);
    const edge={id,from,to,a,b,c,d,reverse:false,laneKey:id,...options};
    const count=256, lengths=new Float64Array(count+1), p={};
    bezier(a,b,c,d,0,p); let x=p.x,y=p.y,z=p.z;
    for(let i=1;i<=count;i++) {
      bezier(a,b,c,d,i/count,p);
      lengths[i]=lengths[i-1]+Math.hypot(p.x-x,p.y-y,p.z-z); x=p.x;y=p.y;z=p.z;
    }
    edge.length=lengths[count]; edge.lengths=lengths;
    edge.junctionKey=`junction:${d[0].toFixed(2)}:${d[2].toFixed(2)}:${d[1]<2?'ground':'air'}`;
    this.edges.set(id,edge); return edge;
  }
  reversed(id,source,options={}) {
    const e=this.edges.get(source);
    return this.edge(id,e.to,e.from,{controls:[e.c,e.b],reverse:true,markKey:source,...options});
  }
}

export function sampleEdge(edge,distance,out) {
  const lengths=edge.lengths, s=clamp(distance,0,edge.length);
  let lo=0,hi=lengths.length-1;
  while(hi-lo>1) { const mid=(lo+hi)>>1; if(lengths[mid]<s) lo=mid; else hi=mid; }
  const t=(lo+(s-lengths[lo])/Math.max(EPS,lengths[hi]-lengths[lo]))/(lengths.length-1);
  bezier(edge.a,edge.b,edge.c,edge.d,t,out);
  if(edge.reverse) out.heading+=Math.PI;
  return out;
}

// Separating-axis test includes the carried pallet and the aircraft wingspan.
// The four axes are calculated directly; no vectors/arrays are allocated per tick.
export function overlaps(a,shapeA,b,shapeB,padding=0) {
  if(a.y+shapeA.height<b.y || b.y+shapeB.height<a.y) return false;
  const dx=b.x-a.x,dz=b.z-a.z;
  if(Math.abs(dx)>shapeA.halfLength+shapeA.halfWidth+shapeB.halfLength+shapeB.halfWidth+padding ||
     Math.abs(dz)>shapeA.halfLength+shapeA.halfWidth+shapeB.halfLength+shapeB.halfWidth+padding) return false;
  const sa=Math.sin(a.heading),ca=Math.cos(a.heading),sb=Math.sin(b.heading),cb=Math.cos(b.heading);
  const cos=Math.abs(sa*sb+ca*cb),sin=Math.abs(ca*sb-sa*cb);
  if(Math.abs(dx*sa+dz*ca)>=shapeA.halfLength+shapeB.halfLength*cos+shapeB.halfWidth*sin+padding) return false;
  if(Math.abs(dx*ca-dz*sa)>=shapeA.halfWidth+shapeB.halfLength*sin+shapeB.halfWidth*cos+padding) return false;
  if(Math.abs(dx*sb+dz*cb)>=shapeB.halfLength+shapeA.halfLength*cos+shapeA.halfWidth*sin+padding) return false;
  if(Math.abs(dx*cb-dz*sb)>=shapeB.halfWidth+shapeA.halfLength*sin+shapeA.halfWidth*cos+padding) return false;
  return true;
}

export function checkClearance(layout,log=false) {
  const hits=[],p={},boxPose={heading:0};
  for(const graph of layout.graphs) for(const edge of graph.edges.values()) {
    const shape=VEHICLES[graph.type];
    for(const obstacle of layout.obstacles) {
      let hit=false;
      boxPose.x=obstacle.x;boxPose.z=obstacle.z;boxPose.y=obstacle.minY||0;
      const box={halfWidth:obstacle.w/2,halfLength:obstacle.d/2,height:obstacle.height||3};
      const samples=Math.ceil(edge.length/.025);
      for(let i=0;i<=samples;i++) {
        sampleEdge(edge,edge.length*i/samples,p);
        if(p.y+shape.height<=boxPose.y || p.y>=boxPose.y+box.height) continue;
        // Required centreline vs inflated AABB, plus a stricter full-body sweep.
        if((Math.abs(p.x-obstacle.x)<box.halfWidth+shape.halfWidth &&
            Math.abs(p.z-obstacle.z)<box.halfLength+shape.halfWidth) || overlaps(p,shape,boxPose,box)) { hit=true;break; }
      }
      if(hit) hits.push(`${graph.type}/${edge.id} intersects ${obstacle.id}`);
    }
  }
  if(log) {
    console.info(`[Relay ${layout.mode}] lane clearance: ${hits.length} collisions`);
    for(const hit of hits) console.error(`[Relay clearance] ${hit}`);
  }
  return hits;
}

export class Traffic {
  constructor(layout) {
    this.layout=layout; this.actors=[];this.locks=new Map();this.completed=0;
    for(const spec of layout.actors) {
      const graph=layout.graphs.find(g=>g.type===spec.type);
      const plan=spec.plan.map(step=>typeof step==='string' ? {edge:graph.edges.get(step)} : {...step,edge:step.edge ? graph.edges.get(step.edge) : null});
      for(let i=0;i<plan.length;i++) {
        const step=plan[i];
        if(!step.edge) {
          let previous=(i+plan.length-1)%plan.length;
          while(!plan[previous].edge) previous=(previous+plan.length-1)%plan.length;
          step.poseEdge=plan[previous].edge;
        }
        step.locks=step.locks||[];step.release=step.release||[];
      }
      const actor={...spec,graph,plan,index:spec.start||0,distance:spec.distance||0,age:spec.age||0,
        speed:0,cycles:0,loaded:spec.type==='van',lift:0,held:new Set(),
        state:{x:0,y:0,z:0,heading:0,status:'',progress:0,eta:0},candidate:{},shape:VEHICLES[spec.type],junctionItems:new Map(),junctionRecords:[]};
      for(const edge of graph.edges.values()) if(!actor.junctionItems.has(edge.junctionKey)) {
        const item={key:edge.junctionKey,node:graph.nodes.get(edge.to),entered:false,active:false};
        actor.junctionItems.set(edge.junctionKey,item);actor.junctionRecords.push(item);
      }
      this.pose(actor);this.actors.push(actor);
      for(const lock of spec.initialLocks||[]) { if(this.locks.has(lock)) throw new Error(`Occupied initial resource ${lock}`);this.locks.set(lock,actor);actor.held.add(lock); }
    }
  }
  pose(a) {
    const step=a.plan[a.index],edge=step.edge||step.poseEdge;
    sampleEdge(edge,step.edge ? a.distance : edge.length,a.state);
    a.state.status=step.status||edge.status||'In transit';
    a.state.progress=(a.index+(step.edge ? a.distance/edge.length : a.age/step.duration))/a.plan.length;
    a.state.eta=Math.ceil(step.edge ? (edge.length-a.distance)/Math.max(.2,a.speed) : Math.max(0,step.duration-a.age));
  }
  canAcquire(a,locks) {
    for(let i=0;i<locks.length;i++) { const owner=this.locks.get(locks[i]);if(owner&&owner!==a) return false; }
    for(let i=0;i<locks.length;i++) { this.locks.set(locks[i],a);a.held.add(locks[i]); }
    return true;
  }
  release(a,key) { if(this.locks.get(key)===a) this.locks.delete(key);a.held.delete(key); }
  finish(a) {
    const step=a.plan[a.index];
    if(step.action==='pick') a.loaded=true;
    if(step.action==='drop') { a.loaded=false;this.completed++; }
    if(step.action==='unload'||step.action==='load') this.completed++;
    for(let i=0;i<step.release.length;i++) this.release(a,step.release[i]);
    a.index=(a.index+1)%a.plan.length; a.distance=0;a.age=0;
    if(a.index===0) { a.cycles++; if(a.type==='plane') this.completed++; }
    this.pose(a);
  }
  tick(dt) {
    const steps=Math.max(1,Math.ceil(dt*60)),h=dt/steps;
    if(dt<=0) return;
    for(let sub=0;sub<steps;sub++) for(let i=0;i<this.actors.length;i++) this.advance(this.actors[i],h);
  }
  advance(a,dt) {
    const step=a.plan[a.index],edge=step.edge;
    // Junction ownership lasts until the entire body has left its disk.
    for(let i=0;i<a.junctionRecords.length;i++) {
      const item=a.junctionRecords[i];if(!item.active) continue;
      const distance=Math.hypot(a.state.x-item.node[0],a.state.z-item.node[2]);
      if(distance<.15) item.entered=true;
      if(item.entered&&distance>a.shape.halfLength+a.shape.halfWidth+.3) { this.release(a,item.key);item.active=false; }
    }
    if(!this.canAcquire(a,step.locks)) {
      a.speed=0;
      a.state.status=a.type==='plane'?(edge?.reverse?'Awaiting pushback':'Holding pattern'):a.type==='tug'?'Waiting at crossing':'Waiting for dock';
      return;
    }
    if(!edge) {
      a.speed=0;a.age+=dt;
      const u=clamp(a.age/step.duration,0,1);
      if(step.action==='pick') a.lift=Math.sin(Math.PI*u)*.65;
      if(step.action==='drop') a.lift=(1-u)*.2;
      if(a.age>=step.duration) this.finish(a);else this.pose(a);
      return;
    }
    let desired=edge.speed||a.shape.speed;
    const remaining=edge.length-a.distance, next=a.plan[(a.index+1)%a.plan.length];
    // Reserve a junction before the nose reaches it; disjoint class graphs share coordinates.
    const key=edge.junctionKey;
    const stopping=a.speed*a.speed/2.4+a.shape.halfLength+.6;
    let allowed=true;
    if(remaining<stopping) {
      const owner=this.locks.get(key);
      if(owner&&owner!==a) allowed=false;
      else { this.locks.set(key,a);a.held.add(key);const item=a.junctionItems.get(key);if(!item.active) { item.entered=false;item.active=true; } }
      if(!this.canAcquire(a,next.locks)) allowed=false;
    }
    if(!allowed) desired=Math.min(desired,Math.max(0,(remaining-a.shape.halfLength-.25)*1.2));
    if(!next.edge) desired=Math.min(desired,Math.sqrt(Math.max(0,remaining)*2.4));
    // Following distance on a shared directed edge and the next connected edge.
    for(let j=0;j<this.actors.length;j++) {
      const other=this.actors[j];if(other===a) continue;
      const otherStep=other.plan[other.index],otherEdge=otherStep.edge;
      let gap=Infinity;
      if(otherEdge&&otherEdge.laneKey===edge.laneKey&&other.distance>a.distance) gap=other.distance-a.distance;
      else if(next.edge&&otherEdge&&otherEdge.laneKey===next.edge.laneKey) gap=remaining+other.distance;
      if(gap<Infinity) desired=Math.min(desired,Math.max(0,(gap-a.shape.halfLength-other.shape.halfLength-.45)*.9));
    }
    a.speed+=clamp(desired-a.speed,-2.4*dt,1.2*dt);
    let distance=Math.min(edge.length,a.distance+a.speed*dt);
    sampleEdge(edge,distance,a.candidate);
    // Final footprint guard covers merges, crossings, reversals and long turning bodies.
    for(let j=0;j<this.actors.length;j++) {
      const other=this.actors[j];
      if(other!==a&&overlaps(a.candidate,a.shape,other.state,other.shape,.12)) { a.speed=0;distance=a.distance;break; }
    }
    if(!allowed&&distance>=edge.length-.001) return;
    a.distance=distance;this.pose(a);
    if(a.distance>=edge.length-EPS) this.finish(a);
  }
}
