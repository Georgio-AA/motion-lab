// Run from the repository root: node --experimental-vm-modules 08-ops-worlds/traffic.test.cjs
// Uses only Node built-ins. The browser and this test execute the same layout/checker.
const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');

async function loadModules() {
  const context=vm.createContext({console});
  const traffic=new vm.SourceTextModule(fs.readFileSync('08-ops-worlds/traffic.js','utf8'),{context});
  await traffic.link(()=>{});await traffic.evaluate();
  const layouts=new vm.SourceTextModule(fs.readFileSync('08-ops-worlds/layouts.js','utf8'),{context});
  await layouts.link(()=>traffic);await layouts.evaluate();
  return {traffic:traffic.namespace,layouts:layouts.namespace};
}
function validatePlans(sim,sampleEdge) {
  const a={},b={};
  for(const actor of sim.actors) {
    const edges=actor.plan.filter(step=>step.edge).map(step=>step.edge);
    for(let i=0;i<edges.length;i++) {
      const edge=edges[i],next=edges[(i+1)%edges.length];
      sampleEdge(edge,edge.length,a);sampleEdge(next,0,b);
      assert(Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)<1e-6,`${actor.id}: discontinuous route ${edge.id}`);
      if(!edge.air&&!next.air) assert(Math.abs(Math.atan2(Math.sin(a.heading-b.heading),Math.cos(a.heading-b.heading)))<.001,`${actor.id}: sharp heading change ${edge.id}`);
    }
  }
}
function assertTraffic(sim,overlaps) {
  for(let i=0;i<sim.actors.length;i++) for(let j=i+1;j<sim.actors.length;j++) {
    const a=sim.actors[i],b=sim.actors[j];
    assert(!overlaps(a.state,a.shape,b.state,b.shape),`${a.id} overlaps ${b.id}`);
  }
  const runwaySteps=['landing','exitRunway','exitTaxi','lineupTurn','lineup','takeoff','climb'];
  for(const actor of sim.actors) {
    const edge=actor.plan[actor.index].edge;
    if(actor.type==='plane'&&edge&&runwaySteps.includes(edge.id)) assert.equal(sim.locks.get('runway'),actor,'Aircraft entered runway without clearance');
  }
}
function testFollowing(traffic) {
  const g=new traffic.LaneGraph('van');g.node('a',0,0);g.node('b',0,50);g.edge('lane','a','b');
  // One long lane isolates following behaviour from the exclusive apron rules.
  const layout={graphs:[g],actors:[{type:'van',id:'leader',plan:['lane'],distance:12},{type:'van',id:'follower',plan:['lane'],distance:5}]};
  const sim=new traffic.Traffic(layout);let slowed=false;
  for(let i=0;i<700;i++) {
    if(i===250) sim.actors[0].shape={...sim.actors[0].shape,speed:.35};
    sim.tick(1/60);
    assert(sim.actors[0].distance-sim.actors[1].distance>=2*.88+.4,'Following gap lost');
    if(i>500&&sim.actors[1].speed<.8) slowed=true;
  }
  assert(slowed,'Follower did not brake behind a slow vehicle');
}

(async()=>{
  const {traffic,layouts}=await loadModules();
  testFollowing(traffic);
  for(const mode of ['warehouse','airport']) {
    const layout=layouts[mode+'Layout']();
    const collisions=traffic.checkClearance(layout,true);
    assert.equal(collisions.length,0,collisions.join('\n'));
    // Prove that the checker detects an obstacle; a zero must not be a disabled check.
    const edge=layout.graphs[0].edges.values().next().value,p={};traffic.sampleEdge(edge,edge.length/2,p);
    layout.obstacles.push({id:'test obstruction',x:p.x,z:p.z,w:.5,d:.5,height:10});
    assert(traffic.checkClearance(layout).some(hit=>hit.includes('test obstruction')));
    layout.obstacles.pop();
    const sim=new traffic.Traffic(layout);validatePlans(sim,traffic.sampleEdge);assertTraffic(sim,traffic.overlaps);
    const actions=new Set();let elapsed=0;
    for(let frame=0;frame<36000;frame++) {
      const dt=frame%3===0?.05:frame%3===1?1/60:1/30;elapsed+=dt;sim.tick(dt);
      assertTraffic(sim,traffic.overlaps);
      for(const a of sim.actors) { const step=a.plan[a.index];if(step.action) actions.add(step.action); }
    }
    for(const a of sim.actors) assert(a.cycles>=2,`${a.id} stalled (${a.cycles} cycles)`);
    const before=JSON.stringify(sim.actors.map(a=>[a.state,a.index,a.age,a.distance]));
    sim.tick(0);assert.equal(JSON.stringify(sim.actors.map(a=>[a.state,a.index,a.age,a.distance])),before,'Pause changed traffic');
    for(const action of mode==='warehouse'?['pick','drop','unload','load']:['gate','hold']) assert(actions.has(action),`Missing operation: ${action}`);
    console.log(`${mode}: ${Math.round(elapsed)}s at mixed 20/30/60 fps; 0 vehicle overlaps; all actors completed loops; pause verified.`);
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
