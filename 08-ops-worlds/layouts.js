import { LaneGraph } from './traffic.js';

const p=(x,z,y=.05)=>[x,y,z];
const move=(edge,locks=[],release=[])=>({edge,locks,release});
const wait=(duration,status,action,release=[])=>({duration,status,action,release});
function obstacle(layout,id,x,z,w,d,height=3,minY=0,kind='wall') {
  const o={id,x,z,w,d,height,minY,kind};layout.obstacles.push(o);return o;
}
function base(mode) { return {mode,graphs:[],obstacles:[],actors:[],docks:[],gates:[],surfaces:[]}; }

function road(type) {
  const g=new LaneGraph(type), xs=[-10.4,-8,-3,-2,2,3,8,10.4];
  for(let i=0;i<xs.length;i++) g.node(`road${i}`,xs[i],7.3);
  for(let i=0;i<xs.length-1;i++) g.edge(`road${i}`,`road${i}`,`road${i+1}`,{status:'Arriving',laneKey:`road${i}`});
  g.node('east',12,8.9);g.node('returnEast',10.4,10.5);g.node('returnWest',-10.4,10.5);g.node('west',-12,8.9);
  g.edge('eastIn','road7','east',{controls:[p(11.28,7.3),p(12,8.02)],status:'Out for delivery'});
  g.edge('eastOut','east','returnEast',{controls:[p(12,9.78),p(11.28,10.5)],status:'Out for delivery'});
  g.edge('return','returnEast','returnWest',{status:'Returning to base'});
  g.edge('westIn','returnWest','west',{controls:[p(-11.28,10.5),p(-12,9.78)],status:'Returning to base'});
  g.edge('westOut','west','road0',{controls:[p(-12,8.02),p(-11.28,7.3)],status:'Arriving'});
  return g;
}
function dockBranch(g,id,x,entry,merge,park) {
  g.node(`${id}align`,x,6.4);g.node(`${id}park`,x,park);
  const ex=g.nodes.get(`road${entry}`)[0],mx=g.nodes.get(`road${merge}`)[0];
  g.edge(`${id}approach`,`road${entry}`,`${id}align`,{controls:[p(ex+2,7.3),p(x,4.9)],status:'To loading dock',speed:.7});
  g.edge(`${id}reverse`,`${id}align`,`${id}park`,{reverse:true,status:'Reversing into dock',speed:.45});
  g.edge(`${id}leave`,`${id}park`,`${id}align`,{status:'Departing',speed:.6,markKey:`${id}reverse`});
  g.edge(`${id}merge`,`${id}align`,`road${merge}`,{controls:[p(x,7.0),p(mx-1,7.3)],status:'Outbound',speed:.8});
}
function roadMission(g,id,entry,merge,action) {
  const plan=[];
  for(let i=0;i<entry;i++) plan.push(`road${i}`);
  plan.push(move(`${id}approach`,[id]),`${id}reverse`,wait(action==='unload'?10:7,action==='unload'?'Loading at dock':'Loading outbound',action),`${id}leave`,move(`${id}merge`,[],[id]));
  for(let i=merge;i<7;i++) plan.push(`road${i}`);
  plan.push('eastIn','eastOut','return','westIn','westOut');
  // The dock apron is a single manoeuvring zone: reversing trucks get priority
  // over through traffic until their tail has cleared the outbound merge.
  const first=typeof plan[0]==='string'?{edge:plan[0]}:plan[0];first.locks=[...(first.locks||[]),'dock-apron'];plan[0]=first;
  plan[plan.length-5]=move('eastIn',[],['dock-apron']);return plan;
}

export function warehouseLayout() {
  const l=base('warehouse');
  obstacle(l,'rear wall',0,-9.4,19,.16,2.8);
  obstacle(l,'west wall',-9.5,-3.45,.16,12.05,2.8);
  obstacle(l,'east wall',9.5,-3.45,.16,12.05,1.1);
  // Actual gaps in the front wall, with a pallet staging pocket beside each door.
  for(const [x,w] of [[-8.1,2.8],[-2.5,2.2],[2.5,2.2],[8.1,2.8]]) obstacle(l,`front wall ${x}`,x,2.5,w,.16,1.7);
  for(const x of [-5,0,5]) {
    obstacle(l,`rack ${x}`,x,-4.7,1.8,4,2.9,0,'rack');
    obstacle(l,`dock ${x}`,x,2.67,2.4,.22,.18,0,'dock');
    obstacle(l,`staging ${x}`,x+1.75,2,.9,.75,.78,0,'pallet');
    for(const side of [-1,1]) obstacle(l,`door post ${x}/${side}`,x+side*1.3,2.5,.12,.16,2.6,0,'frame');
    obstacle(l,`door lintel ${x}`,x,2.5,2.72,.16,.12,2.54,'frame');
    obstacle(l,`dock door ${x}`,x,2.49,2.35,.08,1.8,.1,'door');
    l.docks.push({x,id:x===0?'outbound':`dock${x}`,doorY:1.0});
  }
  obstacle(l,'left roof',-6.8,-8,4.3,2.5,.22,3.1,'roof');
  obstacle(l,'right roof',6.8,-8,4.3,2.5,.22,3.1,'roof');
  // Conveyor is behind the picking area, outside all forklift aisle envelopes.
  for(const z of [-8.7,-7.5]) obstacle(l,`belt ${z}`,0,z,3.5,.5,.68,0,'conveyor');
  for(const x of [-1.5,1.5]) obstacle(l,`belt end ${x}`,x,-8.1,.5,1.2,.68,0,'conveyor');
  for(const [x,z] of [[-11,-7.8],[11,-7.8],[-11,-3],[11,-3]]) obstacle(l,`tree ${x}/${z}`,x,z,.9,.9,2.1,0,'tree');
  const forklifts=new LaneGraph('forklift');l.graphs.push(forklifts);
  for(let i=0;i<3;i++) {
    const x=-5+i*5,a=x-2.5,id=`f${i}`;
    forklifts.node(`${id}pre`,a,-6.2);forklifts.node(`${id}pick`,a,-4.7);
    forklifts.node(`${id}mouth`,a,-.9);forklifts.node(`${id}stage`,x,.65);
    forklifts.edge(`${id}pick`,`${id}pre`,`${id}pick`,{controls:[p(a,-5.2),p(a-.2,-4.7)],status:'Picking a pallet',speed:.6});
    forklifts.reversed(`${id}back`,`${id}pick`,{status:'Returning to aisle',speed:.5});
    forklifts.edge(`${id}aisle`,`${id}pre`,`${id}mouth`,{status:'To dock staging'});
    forklifts.edge(`${id}cross`,`${id}mouth`,`${id}stage`,{controls:[p(a,.4),p(x,-.1)],status:'To dock staging',speed:.6});
    forklifts.reversed(`${id}uncross`,`${id}cross`,{status:'Returning',speed:.55});
    forklifts.reversed(`${id}up`,`${id}aisle`,{status:'Returning',speed:.6});
    l.actors.push({type:'forklift',id:`FL-0${i+1}`,cargo:['Home goods','Studio supplies','Everyday essentials'][i]+' · 1 pallet',accent:0xe8b559,
      start:i===1?3:0,distance:i===1?2.3:0,plan:[`${id}pick`,wait(3,'Picking a pallet','pick'),`${id}back`,`${id}aisle`,`${id}cross`,wait(2,'Unloading','drop'),`${id}uncross`,`${id}up`]});
  }
  const trucks=road('truck'),vans=road('van');l.graphs.push(trucks,vans);
  for(let i=0;i<2;i++) {
    const x=i?5:-5,id=`dock${x}`,entry=i?4:1,merge=i?6:3;
    dockBranch(trucks,id,x,entry,merge,4.45);
    const plan=roadMission(trucks,id,entry,merge,'unload');
    l.actors.push({type:'truck',id:`TR-${204+i}`,cargo:`Inbound · ${64-i*16} parcels`,accent:0xf3f6f7,plan,start:i?plan.length-3:0,distance:i?8:0,dock:id});
  }
  dockBranch(vans,'outbound',0,2,5,4.2);
  for(let i=0;i<3;i++) {
    const plan=roadMission(vans,'outbound',2,5,'load');
    l.actors.push({type:'van',id:`VN-${81+i}`,cargo:`Last mile · ${18+i*7} deliveries`,accent:[0x4879de,0xf0bf6f,0x70bca9][i],plan,
      start:i===0?4:i===1?plan.length-3:plan.length-2,distance:i===1?17:i===2?.7:0,initialLocks:i===0?['outbound','dock-apron']:[],dock:'outbound'});
  }
  return l;
}

export function airportLayout() {
  const l=base('airport'),g=new LaneGraph('plane'),s=new LaneGraph('tug');l.graphs.push(g,s);
  obstacle(l,'terminal',0,-7.1,16.8,3.8,1.9,0,'terminal');
  obstacle(l,'control tower',-9.5,-7.5,2.1,1.95,5.4,0,'tower');
  obstacle(l,'maintenance',10,-7.7,2,2.2,1.1,0,'building');
  for(let i=0;i<3;i++) {
    const x=-6.5+i*6.5;
    obstacle(l,`gate A${i+1} neck`,x,-4.85,.8,.7,1.25,0,'gate');
    obstacle(l,`gate A${i+1} bridge`,x,-4.2,1.2,.6,1.4,0,'gate');
    l.gates.push({x,id:`A${i+1}`});
  }
  g.node('approach',-17,8.2,5);g.node('touchdown',-10,8.2,.28);g.node('rollEnd',9,8.2,.28);
  g.node('exit',10.6,6.2,.28);g.node('taxiEast',9.7,3.8,.28);
  g.edge('approach','approach','touchdown',{controls:[p(-15,8.2,5),p(-12,8.2,.28)],status:'On approach',speed:2.6,air:true});
  g.edge('landing','touchdown','rollEnd',{status:'Landing',speed:3.2});
  g.edge('exitRunway','rollEnd','exit',{controls:[p(10.1,8.2,.28),p(10.6,7.3,.28)],status:'Taxiing to gate',speed:.9});
  g.edge('exitTaxi','exit','taxiEast',{controls:[p(10.6,4.8,.28),p(10.5,3.8,.28)],status:'Taxiing to gate',speed:.9});
  const xs=[9.7,3.2,-3.3,-9.7],names=['taxiEast','taxiMiddle','taxiWest','hold'];
  for(let i=1;i<4;i++) g.node(names[i],xs[i],3.8,.28);
  for(let i=0;i<3;i++) g.edge(`taxi${i}`,names[i],names[i+1],{status:'Taxiing',speed:1.1});
  for(let i=0;i<3;i++) {
    const x=-6.5+i*6.5,branch=2-i,id=`gate${i}`;
    g.node(id,x,-1.5,.28);
    g.edge(`${id}in`,names[branch],id,{controls:[p(x+1,3.8,.28),p(x,1,.28)],status:'Taxiing to gate',speed:.75});
    g.reversed(`${id}out`,`${id}in`,{status:'Pushback',speed:.45});
  }
  g.node('lineupTurn',-10.6,6.2,.28);g.node('lineup',-9,8.2,.28);g.node('rotate',10,8.2,.28);g.node('climb',20,8.2,8);
  g.edge('lineupTurn','hold','lineupTurn',{controls:[p(-10.5,3.8,.28),p(-10.6,4.8,.28)],status:'Line up',speed:.8});
  g.edge('lineup','lineupTurn','lineup',{controls:[p(-10.6,7.3,.28),p(-10.1,8.2,.28)],status:'Line up',speed:.8});
  g.edge('takeoff','lineup','rotate',{status:'Takeoff',speed:3.5,markKey:'landing'});
  g.edge('climb','rotate','climb',{controls:[p(14,8.2,.28),p(17,8.2,8)],status:'Airborne',speed:3.8,air:true});
  // Continuous off-scene flight instead of teleporting from departure to arrival.
  g.edge('rotation','climb','approach',{controls:[p(40,-25,14),p(-35,-25,14)],status:'Next rotation',speed:6,air:true});
  const cities=[['OSL → LHR','RL 218'],['AMS → LHR','RL 406'],['LHR → CPH','RL 731']];
  for(let i=0;i<3;i++) {
    const branch=2-i,plan=[move('approach',['runway','taxi-apron']),'landing','exitRunway',move('exitTaxi',[],['runway'])];
    for(let j=0;j<branch;j++) plan.push(`taxi${j}`);
    plan.push(move(`gate${i}in`,[`stand${i}`,'apron-crossing'],['apron-crossing','taxi-apron']),wait(12+i*3,'At gate','gate'),move(`gate${i}out`,['taxi-apron','runway','apron-crossing'],[`stand${i}`,'apron-crossing']));
    for(let j=branch;j<3;j++) plan.push(`taxi${j}`);
    plan.push(wait(2,'Hold short','hold'),move('lineupTurn',['runway']),'lineup','takeoff',move('climb',[],['runway','taxi-apron']),'rotation');
    const gateHold=plan.findIndex(step=>step.status==='At gate');
    l.actors.push({type:'plane',id:cities[i][1],cargo:cities[i][0],accent:[0xef9476,0x87c5da,0xa59bdd][i],plan,
      start:i===1?0:gateHold,age:i===2?5:0,initialLocks:i===1?['runway','taxi-apron']:[`stand${i}`]});
  }
  // Service roads cross stand lead-in lines at three explicitly controlled crossings.
  const serviceXs=[-10.8,-8.8,-2.3,4.2,10.7,10.8];
  for(let i=0;i<serviceXs.length;i++) s.node(`service${i}`,serviceXs[i],1.1);
  for(let i=0;i<5;i++) s.edge(`service${i}`,`service${i}`,`service${i+1}`,{status:'Servicing gates'});
  s.node('rightFront',11.8,.1);s.node('rightRear',11.8,-9.3);s.node('rearRight',10.8,-10.3);
  s.node('rearLeft',-10.8,-10.3);s.node('leftRear',-11.8,-9.3);s.node('leftFront',-11.8,.1);
  s.edge('rightCorner','service5','rightFront',{controls:[p(11.352,1.1),p(11.8,.652)],status:'Apron patrol'});
  s.edge('rightRoad','rightFront','rightRear',{status:'Returning'});
  s.edge('rearRightCorner','rightRear','rearRight',{controls:[p(11.8,-9.852),p(11.352,-10.3)],status:'Returning'});
  s.edge('rearRoad','rearRight','rearLeft',{status:'Returning'});
  s.edge('rearLeftCorner','rearLeft','leftRear',{controls:[p(-11.352,-10.3),p(-11.8,-9.852)],status:'Returning'});
  s.edge('leftRoad','leftRear','leftFront',{status:'Servicing gates'});
  s.edge('leftCorner','leftFront','service0',{controls:[p(-11.8,.652),p(-11.352,1.1)],status:'Servicing gates'});
  const servicePlan=[move('service0',['apron-crossing']),'service1','service2','service3','service4',
    move('rightCorner',[],['apron-crossing']),'rightRoad','rearRightCorner','rearRoad','rearLeftCorner','leftRoad','leftCorner'];
  for(let i=0;i<3;i++) l.actors.push({type:'tug',id:`GV-${12+i}`,cargo:['Baggage · Gate A1','Catering · Gate A2','Ground crew · Gate A3'][i],accent:0xe4bd73,plan:servicePlan,start:[0,6,8][i],distance:[0,4,8][i]});
  return l;
}
