import { prefersReducedMotion } from '../shared/base.js';

const $ = id => document.getElementById(id);
const motion = matchMedia('(prefers-reduced-motion: reduce)');
let reduced = prefersReducedMotion(), clock = 0, last = 0, raf = 0;
const pink = '#ff4ba8', cyan = '#70eced', lime = '#c9fa7b';
const roles = ['Planner','Researcher','Analyst','Writer','Reviewer','Engineer','Designer','Auditor','Strategist','Navigator','Archivist','Sentinel','Resolver','Translator','Curator','Evaluator','Optimizer','Publisher','Synthesizer','Classifier','Forecaster','Validator','Scheduler','Observer','Retriever','Indexer','Architect','Debugger','Scout','Moderator','Composer','Coordinator','Tester','Summarizer','Router','Guardian'];
const nodes = roles.map((role,i) => ({role,i,x:0,y:0,ring:Math.floor(i/12),angle:(i%12)/12*Math.PI*2 + Math.floor(i/12)*.16,active:i%4!==0,task:i%4!==0?400+i:null}));
const select = $('agent');
roles.forEach((role,i) => {const option=document.createElement('option');option.value=i;option.textContent=`${String(i+1).padStart(2,'0')} / ${role}`;select.append(option);});

// All canvases share a visibility-aware render loop and capped pixel density.
function surface(id){const canvas=$(id),ctx=canvas.getContext('2d');const s={canvas,ctx,w:0,h:0,visible:false};new ResizeObserver(()=>{const r=canvas.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);s.w=r.width;s.h=r.height;canvas.width=Math.round(r.width*d);canvas.height=Math.round(r.height*d);ctx.setTransform(d,0,0,d,0,0);}).observe(canvas);new IntersectionObserver(entries=>{s.visible=entries[0].isIntersecting;},{rootMargin:'30px'}).observe(canvas);return s;}
const graph=surface('network'),pipe=surface('pipeline'),signal=surface('signal');
let pointer=null, hovered=-1, focused=-1;
const bursts=[];
function bezier(a,b,t,bend=0){const mx=(a.x+b.x)/2+ bend,my=(a.y+b.y)/2-bend;const q=1-t;return {x:q*q*a.x+2*q*t*mx+t*t*b.x,y:q*q*a.y+2*q*t*my+t*t*b.y};}
function path(ctx,a,b,bend){ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.quadraticCurveTo((a.x+b.x)/2+bend,(a.y+b.y)/2-bend,b.x,b.y);ctx.stroke();}
function dot(ctx,x,y,r,color,glow=0){ctx.fillStyle=color;ctx.shadowColor=color;ctx.shadowBlur=glow;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;}
let taskNumber=481;
function dispatch(i){const n=nodes[i];focused=i;select.value=i;n.task=++taskNumber;n.active=true;dismissHint();if(!reduced)for(let j=0;j<16;j++)bursts.push({i,start:clock+j*.035});const message=`Hub -> ${n.role}: task #${n.task} dispatched`;$('dispatch-status').textContent=message;addLog('DISPATCH',message);hovered=i;updateTooltip();}
$('dispatch').addEventListener('click',()=>dispatch(+select.value));select.addEventListener('change',()=>{focused=+select.value;});
graph.canvas.addEventListener('pointermove',e=>{const r=graph.canvas.getBoundingClientRect();pointer={x:e.clientX-r.left,y:e.clientY-r.top};hovered=nodes.findIndex(n=>Math.hypot(n.x-pointer.x,n.y-pointer.y)<Math.max(12,graph.w<600?13:10));updateTooltip();});
graph.canvas.addEventListener('pointerleave',()=>{pointer=null;hovered=-1;$('tooltip').hidden=true;});
graph.canvas.addEventListener('click',e=>{dismissHint();const r=graph.canvas.getBoundingClientRect();const i=nodes.findIndex(n=>Math.hypot(n.x-(e.clientX-r.left),n.y-(e.clientY-r.top))<20);if(i>=0)dispatch(i);});
function updateTooltip(){const tip=$('tooltip');tip.hidden=hovered<0;graph.canvas.style.cursor=hovered<0?'default':'pointer';if(hovered<0)return;const n=nodes[hovered];tip.innerHTML=`${n.role}<br><span>${n.active?'Processing · online':'Ready · online'}</span><br>${n.task===null?'No current task · awaiting work':`Current task #${n.task} · processing`}`;tip.style.left=`${Math.max(8,Math.min(n.x+15,graph.w-tip.offsetWidth-8))}px`;tip.style.top=`${Math.max(8,n.y-tip.offsetHeight-15)}px`;}

// A first-visit invitation follows one agent; storage failures never block the demo.
const hint=$('agent-hint'),hintAgent=2,hintKey='vanta-agent-hint-seen';
let hintSeen=false,hintStartTimer,hintEndTimer;
try{hintSeen=localStorage.getItem(hintKey)==='1';}catch{}
function rememberHint(){try{localStorage.setItem(hintKey,'1');}catch{}}
function dismissHint(){hintSeen=true;hint.hidden=true;clearTimeout(hintStartTimer);clearTimeout(hintEndTimer);rememberHint();}
function positionHint(){const n=nodes[hintAgent];hint.style.left=`${n.x}px`;hint.style.top=`${n.y}px`;hint.querySelector('span').style.left=`${Math.max(8,Math.min(n.x+22,graph.w-228))-n.x}px`;hint.querySelector('span').style.top=n.y<70?'24px':'-54px';}
if(!hintSeen)hintStartTimer=setTimeout(()=>{if(hintSeen)return;positionHint();hint.hidden=false;rememberHint();hintEndTimer=setTimeout(dismissHint,6000);},1500);

// Radial constellation: three rings, curved hub routes, peer routes, and dispatch bursts.
function renderGraph(){const {ctx:c,w,h}=graph;c.clearRect(0,0,w,h);const center={x:w/2,y:h/2},small=w<600,rx=Math.min(w*.43,480,small?w*.43:w/2-130),ry=h*.39;
 nodes.forEach(n=>{const radius=[.43,.72,1][n.ring],a=n.angle;let x=center.x+Math.cos(a)*rx*radius,y=center.y+Math.sin(a)*ry*radius;if(!reduced){x+=Math.sin(clock*.35+n.i)*3;y+=Math.cos(clock*.4+n.i)*3;if(pointer){const dx=x-pointer.x,dy=y-pointer.y,d=Math.hypot(dx,dy);if(d<70&&d>1){x+=dx/d*(70-d)*.08;y+=dy/d*(70-d)*.08;}}}n.x=x;n.y=y;});
 for(let r=0;r<3;r++){c.strokeStyle='#ffffff09';c.lineWidth=1;c.beginPath();c.ellipse(center.x,center.y,rx*[.43,.72,1][r],ry*[.43,.72,1][r],0,0,Math.PI*2);c.stroke();}
 nodes.forEach(n=>{const selected=n.i===(hovered>=0?hovered:focused),bend=Math.sin(n.angle)*30;c.lineWidth=selected?1.5:.7;c.strokeStyle=selected?cyan:n.active?'#ff4ba839':'#6c496027';path(c,center,n,bend);if(!reduced){for(let j=0;j<2;j++){const t=(clock*(.12+n.i%5*.01)+n.i*.13+j*.5)%1,p=bezier(center,n,t,bend);dot(c,p.x,p.y,selected?2.4:1.5,n.i%5===0?cyan:pink,selected?12:5);}}const peer=nodes[(n.i+1)%36];c.strokeStyle=selected?'#70ecedaa':'#ff4ba817';path(c,n,peer,12);});
 nodes.forEach(n=>{const selected=n.i===(hovered>=0?hovered:focused),pulse=reduced?0:Math.sin(clock*2+n.i)*.5+.5,col=n.active?pink:'#85868f';dot(c,n.x,n.y,selected?5:3,col,n.active?8+pulse*6:0);if(n.active||selected){c.strokeStyle=selected?cyan:`rgba(255,75,168,${.12+pulse*.12})`;c.beginPath();c.arc(n.x,n.y,selected?10:7+pulse*2,0,Math.PI*2);c.stroke();}if(!small){c.font='13px monospace';c.fillStyle=selected?'#eefaff':'#8c7183';c.textAlign=Math.cos(n.angle)>0?'left':'right';c.fillText(n.role.toUpperCase(),n.x+(Math.cos(n.angle)>0?12:-12),n.y+3);}});
 for(let i=bursts.length-1;i>=0;i--){const b=bursts[i],t=(clock-b.start)/.85;if(t>1){bursts.splice(i,1);continue;}if(t>=0){const n=nodes[b.i],p=bezier(center,n,t,Math.sin(n.angle)*30);dot(c,p.x,p.y,3,cyan,15);}}
 const glow=c.createRadialGradient(center.x,center.y,15,center.x,center.y,80);glow.addColorStop(0,'#ff4ba842');glow.addColorStop(1,'#ff4ba800');c.fillStyle=glow;c.fillRect(center.x-80,center.y-80,160,160);dot(c,center.x,center.y,small?32:39,'#120d16');c.strokeStyle=pink;c.lineWidth=1.5;c.beginPath();c.arc(center.x,center.y,small?32:39,0,Math.PI*2);c.stroke();c.strokeStyle='#ff4ba83a';c.beginPath();c.arc(center.x,center.y,small?39:47,0,Math.PI*2);c.stroke();c.textAlign='center';c.font='bold 14px monospace';c.fillStyle='#fff';c.fillText('VANTA',center.x,center.y+1);c.font='13px monospace';c.fillStyle=pink;c.fillText('HUB',center.x,center.y+17);
 if(!hint.hidden)positionHint();if(!$('tooltip').hidden)updateTooltip();
}

// The flow reveals in three stages; replay restarts its timeline without timers.
let pipelineStart=null;
new IntersectionObserver(entries=>{if(entries[0].isIntersecting&&pipelineStart===null)pipelineStart=clock;},{threshold:.3}).observe(pipe.canvas);
$('replay').addEventListener('click',()=>{pipelineStart=clock;addLog('PIPELINE','Route assembly restarted');});
const stageLabels=[['Documents','Events','Signals'],['Retrieve','Classify','Reason','Verify'],['Knowledge','Decision','Action']];
function renderPipeline(){const {ctx:c,w,h}=pipe;c.clearRect(0,0,w,h);if(pipelineStart===null)return;const progress=reduced?3:Math.min(3,(clock-pipelineStart)/.8);const stages=stageLabels.map((labels,s)=>labels.map((label,i)=>({x:w*(.14+s*.36),y:34+i*(h-68)/(labels.length-1),label,s})));const boxW=w<450?66:88,boxH=30;
 stages.slice(0,2).forEach((group,s)=>group.forEach((a,i)=>stages[s+1].forEach((b,j)=>{if((i+j)%2!==0&&j!==i)return;const p=Math.max(0,Math.min(1,progress-s-1));if(p<=0)return;const ax=a.x+boxW/2,bx=b.x-boxW/2;c.strokeStyle=s===0?'#70eced40':'#c9fa7b40';c.lineWidth=1;c.beginPath();c.moveTo(ax,a.y);c.bezierCurveTo((ax+bx)/2,a.y,(ax+bx)/2,b.y,bx,b.y);const length=Math.hypot(bx-ax,b.y-a.y)*1.3;c.setLineDash([length*p,length*2]);c.stroke();c.setLineDash([]);if(p===1&&!reduced){const t=(clock*.3+i*.24+j*.17)%1,q=1-t,x=q*q*q*ax+3*q*q*t*(ax+bx)/2+3*q*t*t*(ax+bx)/2+t*t*t*bx,y=q*q*q*a.y+3*q*q*t*a.y+3*q*t*t*b.y+t*t*t*b.y;dot(c,x,y,2,s===0?cyan:lime,8);}})));
 stages.forEach((group,s)=>{c.globalAlpha=Math.max(0,Math.min(1,progress-s));group.forEach(n=>{c.fillStyle='#10191b';c.strokeStyle=s===2?'#c9fa7b77':'#70eced66';c.lineWidth=1;c.fillRect(n.x-boxW/2,n.y-boxH/2,boxW,boxH);c.strokeRect(n.x-boxW/2,n.y-boxH/2,boxW,boxH);c.font='13px monospace';c.textAlign='center';c.fillStyle=s===2?lime:cyan;c.fillText(n.label,n.x,n.y+3);});});c.globalAlpha=1;$('pipeline-status').textContent=progress>=3?'FLOW ESTABLISHED':['INGESTING SOURCES','ASSEMBLING REASONING','CONNECTING OUTPUTS'][Math.min(2,Math.floor(progress))];
}

// Atmospheric orb and deterministic jagged traces, inspired by live signal monitors.
function renderSignal(){const {ctx:c,w,h}=signal;c.clearRect(0,0,w,h);const ox=w*.12,oy=h/2,g=c.createRadialGradient(ox,oy,2,ox,oy,h*.4);g.addColorStop(0,'#d6ffff');g.addColorStop(.12,cyan);g.addColorStop(.3,'#70eced33');g.addColorStop(1,'#70eced00');c.fillStyle=g;c.fillRect(0,0,w*.3,h);for(let j=0;j<6;j++){c.beginPath();for(let x=0;x<w*.73;x+=5){const n=x/5,y=h/2+Math.sin(n*1.7+j*2+(reduced?0:clock*.5))*(12+j*3)+Math.cos(n*.21+(reduced?0:clock)+j)*12;const px=w*.27+x;x===0?c.moveTo(px,y):c.lineTo(px,y);}c.strokeStyle=j===0?'#d6eaa5':`rgba(255,75,168,${.1+j*.055})`;c.lineWidth=j===0?1.5:.8;c.stroke();}}

// Fake realtime data is updated slowly, independently of frame rate.
const bars=Array.from({length:24},()=>{const e=document.createElement('i');$('bars').append(e);return e;});
const cells=Array.from({length:60},()=>{const e=document.createElement('i');$('heatmap').append(e);return e;});
let counter=80432,telemetryAt=-10;
const events=[['REASON','Evidence weighted · confidence 0.98'],['SYNC','36 specialists acknowledged'],['VERIFY','Output validation passed'],['ROUTE','Signal forwarded to reasoning layer'],['INDEX','Knowledge buffer updated'],['COMPLETE','Decision delivered · 12ms']];
function addLog(event,message){const row=document.createElement('div');row.className='log-line';const time=document.createElement('time');time.textContent=new Date().toLocaleTimeString('en-GB');row.append(time,document.createTextNode(event));const detail=document.createElement('span');detail.textContent=message;row.append(detail);$('logs').prepend(row);while($('logs').children.length>5)$('logs').lastChild.remove();}
function telemetry(){const health=90+Math.floor(Math.random()*8);$('health').innerHTML=`${health}<span>%</span>`;$('donut').style.background=`conic-gradient(${pink} ${health}%,#28212b 0)`;$('rate').textContent=230+Math.floor(Math.random()*40);counter+=Math.floor(15+Math.random()*70);$('counter').textContent=String(counter).padStart(6,'0').replace(/(\d{3})$/,',$1');bars.forEach(e=>e.style.height=`${20+Math.random()*80}%`);cells.forEach(e=>e.style.opacity=.08+Math.random()*.85);const event=events[Math.floor(Math.random()*events.length)];addLog(...event);}
for(let i=0;i<4;i++)addLog(...events[i]);telemetry();
function frame(now){const dt=last?Math.min((now-last)/1000,.05):0;last=now;clock+=dt;if(graph.visible)renderGraph();if(pipe.visible)renderPipeline();if(signal.visible)renderSignal();if(!reduced&&clock-telemetryAt>2.4){telemetryAt=clock;telemetry();}raf=requestAnimationFrame(frame);}
document.addEventListener('visibilitychange',()=>{cancelAnimationFrame(raf);last=0;if(!document.hidden)raf=requestAnimationFrame(frame);});
motion.addEventListener('change',()=>{reduced=motion.matches;bursts.length=0;});
raf=requestAnimationFrame(frame);
