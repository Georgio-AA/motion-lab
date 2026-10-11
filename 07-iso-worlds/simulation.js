// Deterministic routines: travel via the central promenade, work, then visit a new station.
export const districts = [
  { name: 'Frame House', description: 'Clips are rendered, edited and sent into the world.', kind: 'terminal', task: 'Rendering clips', x: -6.1, z: -3.05 },
  { name: 'Parcel Port', description: 'Discoveries are packed and carried to the next expedition.', kind: 'crate', task: 'Carrying supplies', x: 0, z: -3.05 },
  { name: 'Sun Yard', description: 'Panels are repaired to keep the whole neighbourhood powered.', kind: 'repair', task: 'Fixing panel 3', x: 6.1, z: -3.05 },
  { name: 'Idea Works', description: 'Fresh prototypes take shape at the fabrication terminal.', kind: 'terminal', task: 'Testing a prototype', x: -6.1, z: 3.05 },
  { name: 'Signal Tower', description: 'The relay keeps every district connected and in sync.', kind: 'terminal', task: 'Syncing the network', x: 0, z: 3.05 },
  { name: 'Oasis Garden', description: 'Seedlings are watered and the oasis stays green.', kind: 'water', task: 'Watering seedlings', x: 6.1, z: 3.05 },
];
export const residents = [
  { name: 'Pip', role: 'Motion designer', color: '#b8d9a7', home: 0, schedule: [0, 1, 4] },
  { name: 'Nova', role: 'Field researcher', color: '#f1a578', home: 1, schedule: [1, 0, 5] },
  { name: 'Milo', role: 'Solar engineer', color: '#a0c7db', home: 2, schedule: [2, 4, 1] },
  { name: 'Cleo', role: 'Prototype maker', color: '#d5b4d7', home: 3, schedule: [3, 2, 0] },
  { name: 'Otto', role: 'Network keeper', color: '#e7cf7e', home: 4, schedule: [4, 3, 2] },
  { name: 'Lumi', role: 'Oasis caretaker', color: '#81cbb3', home: 5, schedule: [5, 1, 3] },
  { name: 'Remy', role: 'Expedition courier', color: '#eea8a6', home: 1, schedule: [1, 3, 5] },
];
export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
export function workPoint(station, index) {
  const district = districts[station];
  return { x: district.x + (index === 6 && station === 1 ? .95 : -.55), z: district.z + 1.85 };
}

const moveStatus = districts.map(district => 'To ' + district.name);
const arrivalLog = districts.map(district => 'Arrived · ' + district.task);
const doneLog = districts.map(district => 'Done · ' + district.task);
const headingLog = districts.map(district => 'Heading to ' + district.name);
const workNotes = {
  terminal: ['Source checked', 'Processing the next batch', 'Final pass underway'],
  crate: ['Parcel collected', 'Supplies checked', 'Delivery almost ready'],
  repair: ['Fault isolated', 'New cell fitted', 'Checking the output'],
  water: ['Soil checked', 'Roots getting a drink', 'Reservoir topped up'],
};

export function createSimulation() {
  return residents.map((resident, i) => {
    const p = workPoint(resident.home, i);
    const agent = { ...resident, x:p.x, z:p.z, angle:Math.PI, step:0, station:resident.home,
      phase:'work', elapsed:i*1.05, duration:10+i%3*2, progress:0,
      status:districts[resident.home].task, distance:0, remaining:0,
      path:Array.from({length:5},()=>({x:0,z:0})), pathIndex:0, pathCount:0,
      checkpoint:0, revision:0, log:[], logSlot:0,
      logPool:Array.from({length:18},()=>({time:0,text:''})) };
    appendLog(agent, 0, 'Started at ' + districts[agent.station].name);
    return agent;
  });
}
function appendLog(agent, time, text) {
  const entry = agent.logPool[agent.logSlot];
  agent.logSlot = (agent.logSlot + 1) % agent.logPool.length;
  if (agent.log.length === 18) agent.log.shift();
  entry.time = time; entry.text = text;
  agent.log.push(entry); agent.revision++;
}
function addWaypoint(agent, x, z) {
  const point = agent.path[agent.pathCount++];
  point.x = x; point.z = z;
}
function startJourney(agent, index, time) {
  const departure = districts[agent.station];
  agent.step = (agent.step + 1) % agent.schedule.length;
  agent.station = agent.schedule[agent.step];
  const destination = districts[agent.station];
  const endX = destination.x + (index === 6 && agent.station === 1 ? .95 : -.55);
  const endZ = destination.z + 1.85;
  const lane = (index % 3 - 1) * .2;
  const exitX = departure.z > 0 ? departure.x - 2.15 : agent.x;
  const entryX = destination.z > 0 ? destination.x - 2.15 : endX;
  // Reuse five waypoints; approach southern districts around the domes.
  agent.pathIndex = 0; agent.pathCount = 0;
  if (departure.z > 0) addWaypoint(agent, exitX, agent.z);
  addWaypoint(agent, exitX, lane); addWaypoint(agent, entryX, lane);
  if (destination.z > 0) addWaypoint(agent, entryX, endZ);
  addWaypoint(agent, endX, endZ);
  agent.distance = 0;
  let x = agent.x, z = agent.z;
  for (let i = 0; i < agent.pathCount; i++) {
    const next = agent.path[i];
    agent.distance += Math.hypot(next.x-x,next.z-z); x = next.x; z = next.z;
  }
  agent.remaining = agent.distance;
  agent.phase = 'walk'; agent.elapsed = 0; agent.checkpoint = 0;
  agent.status = moveStatus[agent.station];
  appendLog(agent,time,headingLog[agent.station]);
}
export function updateSimulation(agents, dt, time, reduced = false) {
  for (let index = 0; index < agents.length; index++) {
    const agent = agents[index]; agent.elapsed += dt;
    if (agent.phase === 'walk') {
      let budget = dt * (reduced ? .75 : 1.35);
      while (agent.pathIndex < agent.pathCount && budget > 0) {
        const next = agent.path[agent.pathIndex], dx = next.x-agent.x, dz = next.z-agent.z;
        const distance = Math.hypot(dx,dz);
        if (distance > .001) agent.angle = Math.atan2(dx,dz);
        const movement = Math.min(budget,distance);
        if (distance > 0) { agent.x += dx/distance*movement; agent.z += dz/distance*movement; }
        agent.remaining = Math.max(0,agent.remaining-movement); budget -= movement;
        if (distance <= movement+.00001) agent.pathIndex++;
      }
      agent.progress = clamp(1-agent.remaining/Math.max(.001,agent.distance),0,1);
      if (agent.pathIndex === agent.pathCount) {
        agent.phase = 'work'; agent.elapsed = 0; agent.progress = 0; agent.angle = Math.PI;
        agent.status = districts[agent.station].task;
        appendLog(agent,time,arrivalLog[agent.station]);
      }
    } else {
      agent.progress = clamp(agent.elapsed/agent.duration,0,1);
      const milestone = Math.floor(agent.progress*4);
      if (milestone > agent.checkpoint && milestone < 4) {
        agent.checkpoint = milestone;
        appendLog(agent,time,workNotes[districts[agent.station].kind][milestone-1]);
      }
      if (agent.progress >= 1) {
        appendLog(agent,time,doneLog[agent.station]); startJourney(agent,index,time);
      }
    }
  }
}
