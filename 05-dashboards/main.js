import { prefersReducedMotion } from '../shared/base.js';

const main = document.querySelector('main');
const views = ['Overview', 'Tasks', 'Team', 'Calendar', 'Reports', 'Settings'];
const paths = ['M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z','M5 5h14v16H5z M9 2h6v5H9z M9 12l2 2 4-4 M9 18h6','M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M17 4a4 4 0 0 1 0 7 M22 21v-2a4 4 0 0 0-3-4','M3 5h18v16H3z M7 2v6 M17 2v6 M3 10h18 M7 14h2 M13 14h2 M7 18h2','M4 20V4 M4 20h17 M8 16v-4 M13 16V8 M18 16V5','M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M10 2h4l1 3 3 1 3-1 2 4-2 3v3l2 3-2 4-3-1-3 1-1 3h-4l-1-3-3-1-3 1-2-4 2-3v-3L1 9l2-4 3 1 3-1z'];
const icon = i => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true"><path d="${paths[i]}"/></svg>`;
const escape = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const members = [
  {name:'Amelia Lane',initials:'AL',color:'peach',role:'Creative director',tasks:24,hours:32,location:'Copenhagen, DK',bio:'Turning thoughtful ideas into brands people feel. Usually sketching, occasionally making excellent coffee.'},
  {name:'Noah Chen',initials:'NC',color:'mint',role:'Product designer',tasks:18,hours:28,location:'London, UK',bio:'Making complex things feel simple. Currently shaping the next chapter of the Northstar experience.'},
  {name:'Sofia Rossi',initials:'SR',color:'lilac',role:'Brand strategist',tasks:21,hours:30,location:'Milan, IT',bio:'Finding the story underneath the strategy. A believer in good questions and generous collaboration.'},
  {name:'Oliver Park',initials:'OP',color:'sky',role:'Frontend developer',tasks:32,hours:36,location:'Seoul, KR',bio:'Building small details that make a big difference. Bringing our studio’s ideas to life, one interaction at a time.'},
  {name:'Maya Brooks',initials:'MB',color:'rose',role:'Motion designer',tasks:16,hours:26,location:'Brooklyn, US',bio:'A little rhythm, a little character, a lot of curiosity. Making everything move with a purpose.'},
  {name:'Leo Jensen',initials:'LJ',color:'sand',role:'Project manager',tasks:27,hours:34,location:'Stockholm, SE',bio:'Keeping the big picture clear and the little things on track. Here to give good work room to grow.'}
];
const avatar = (m, extra='') => `<span class="avatar ${m.color} ${extra}" aria-label="${m.name}">${m.initials}</span>`;
const initialTasks = [
  {id:'t1',title:'Shape the Northstar story',desc:'Explore positioning and the core brand narrative.',tag:'Strategy',member:2,status:0},
  {id:'t2',title:'Homepage wireframes',desc:'Map out the first impression. Keep it simple.',tag:'Design',member:1,status:0},
  {id:'t3',title:'Collect launch inspiration',desc:'A shared moodboard for the next chapter.',tag:'Design',member:4,status:0},
  {id:'t4',title:'Build the design system',desc:'Tokens, components, and a little consistency.',tag:'Design',member:1,status:1},
  {id:'t5',title:'Prototype the onboarding',desc:'Make the first five minutes feel effortless.',tag:'Development',member:3,status:1},
  {id:'t6',title:'Motion explorations',desc:'Find our rhythm for the new brand.',tag:'Design',member:4,status:1},
  {id:'t7',title:'Kickoff & discovery',desc:'Good questions. Clear direction. Ready to go.',tag:'Strategy',member:5,status:2},
  {id:'t8',title:'Project roadmap',desc:'A thoughtful plan for the next six weeks.',tag:'Strategy',member:0,status:2}
];
const storage = {get(key){try{return JSON.parse(localStorage.getItem(key));}catch{return null;}},set(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{return false;}}};
let tasks = storage.get('sprig-tasks');
if (!Array.isArray(tasks) || tasks.length !== initialTasks.length || !tasks.every(t => initialTasks.some(i=>i.id===t.id) && Number.isInteger(t.status) && t.status>=0 && t.status<=2) || new Set(tasks.map(t=>t.id)).size!==initialTasks.length) tasks=initialTasks.map(t=>({...t}));
else tasks=tasks.map(t=>({...initialTasks.find(i=>i.id===t.id),status:t.status}));
let currentView = '', entranceFrame = 0, entranceTimeout, toastTimeout, drag = null, pendingDrag = null, viewTransition = null;
const themes = {green:['#246b4e','#123b2c','#e9f2eb','#b5d9ae'],blue:['#376ba0','#19354d','#eaf1f8','#afcde7'],violet:['#7855a3','#39284f','#f0ebf6','#cebae4'],orange:['#ad632e','#4b2d1b','#f8eee6','#edc4a0']};
const darkAccents = {green:'#8bc9a7',blue:'#91bdec',violet:'#c3a3ed',orange:'#efb17f'};
let darkMode = storage.get('sprig-dark') === true;
document.documentElement.dataset.mode = darkMode ? 'dark' : 'light';
let currentTheme = storage.get('sprig-theme');
if (!themes[currentTheme]) currentTheme='green';
function applyTheme(name, animate=false){
  currentTheme=name;
  if(animate) document.body.classList.add('theme-changing');
  ['--accent','--deep','--soft','--bright'].forEach((key,i)=>document.documentElement.style.setProperty(key, darkMode ? [darkAccents[name],themes[name][1],`${themes[name][1]}`,themes[name][3]][i] : themes[name][i]));
  document.querySelectorAll('.swatch').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.theme===name)));
  storage.set('sprig-theme',name);
  if(animate) setTimeout(()=>document.body.classList.remove('theme-changing'),600);
}
applyTheme(currentTheme);
document.querySelector('#navigation').innerHTML = views.map((name,i)=>`<button class="nav-button" data-view="${name.toLowerCase()}">${icon(i)}<span>${name}</span>${i===1?'<span class="nav-count">8</span>':''}</button>`).join('');
const head = (title, subtitle, actions='') => `<div class="page-heading"><div><h1>${title}</h1><p>${subtitle}</p></div><div class="heading-actions">${actions}</div></div>`;
const cardHead = (title, detail='') => `<div class="card-head"><h2>${title}</h2><span>${detail}</span></div>`;
const metric = (label, value, note, index, suffix='') => `<article class="card metric" style="--delay:${index*65}ms"><div class="metric-top"><span class="metric-label">${label}</span>${icon(index)}</div><div class="metric-number"><span data-count="${value}">${value}</span>${suffix}</div><div class="metric-note">${note}</div></article>`;

// Each view keeps the surrounding workspace in place and enters in a short stagger.
function overview(){
  const bars=[45,66,58,88,72,42,53];
  const pattern=Array.from({length:30},(_,i)=>`<path d="M-30 ${i*15} Q90 ${i*15-80} 200 ${i*15-30} T450 ${i*15-70}"/>`).join('');
  return head('A little room for great work.', 'Good morning, Amelia. Let’s make something meaningful.', '<span class="date-pill">◷ Monday, October 12</span><button class="btn primary" data-view="tasks">Your workspace ↗</button>')+
    `<section class="metrics" aria-label="Project metrics">${metric('Total projects',24,'<b>↗ 4</b> projects this month',0)}${metric('In progress',10,'<b>↗ 2</b> moving forward',1)}${metric('Completed',12,'<b>↗ 6</b> wins this month',2)}${metric('Team members',6,'<b>All hands</b> good company',3)}</section>
    <section class="bento" aria-label="Workspace overview">
      <article class="card activity" style="--delay:170ms">${cardHead('Project activity','This week ⌄')}<p class="chart-sub">Small steps. Steady progress.</p><div class="bars" role="img" aria-label="Tasks completed this week: Monday 9, Tuesday 13, Wednesday 12, Thursday 18, Friday 14, Saturday 8, Sunday 11">${bars.map((height,i)=>`<div class="bar-group"><div class="bar ${i<5?'filled':''}" style="height:${height}%;--delay:${200+i*80}ms"></div><span>${['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][i]}</span></div>`).join('')}</div><div class="legend"><span><i></i>Completed tasks</span><span><i class="pale"></i>Weekend pace</span><span style="margin-left:auto">↑ 18% from last week</span></div></article>
      <article class="card reminder" style="--delay:220ms">${cardHead('A gentle reminder','↗')}<span class="meeting-time">◷ Today, 11:00–11:30</span><h3>Northstar<br> design check-in</h3><p>A fresh look at where we’re heading.</p><button class="btn primary" data-view="calendar">View in calendar <span>↗</span></button></article>
      <article class="card" style="--delay:260ms">${cardHead('Your projects','3 active')}${[['✳','Northstar rebrand','Brand identity','Oct 23'],['◈','Forma website','Digital experience','Oct 28'],['⌘','Studio essentials','Internal toolkit','Nov 06']].map(p=>`<div class="project-row"><span class="project-emblem">${p[0]}</span><div><h3>${p[1]}</h3><p>${p[2]}</p></div><span>${p[3]}</span></div>`).join('')}</article>
      <article class="card" style="--delay:310ms">${cardHead('Making progress','On track')}<div class="gauge-wrap" role="img" aria-label="72 percent of this month’s tasks completed"><svg viewBox="0 0 120 120"><circle class="gauge-track" cx="60" cy="60" r="48"/><circle class="gauge-fill" cx="60" cy="60" r="48"/></svg><div class="gauge-label"><span data-count="72">72</span>%<small>This month’s goal</small></div></div><div class="progress-meta"><span>● 72 completed</span><span>○ 28 remaining</span></div></article>
      <article class="card timer" style="--delay:350ms"><svg class="timer-pattern" viewBox="0 0 350 300" preserveAspectRatio="none" aria-hidden="true">${pattern}</svg>${cardHead('Time to focus','◷')}<span class="timer-label">Northstar / Design exploration</span><div class="time" id="timer-display">01:24:08</div><div class="timer-actions"><button id="timer-toggle" aria-label="Pause time tracker">Ⅱ</button><button class="stop" id="timer-stop" aria-label="Stop and reset time tracker">■</button></div><p class="timer-status" id="timer-status">A little focus goes a long way.</p></article>
      <article class="card team-strip" style="--delay:400ms"><div><h2>Better, together.</h2><p>Your people. Your next big idea.</p></div><div class="avatar-stack">${members.map((m,i)=>`<span style="--delay:${450+i*70}ms">${avatar(m)}</span>`).join('')}</div><button class="btn" data-view="team">Meet the team ↗</button></article>
      <article class="card focus-note" style="--delay:440ms"><span>✳</span><div><h2>You’re in a good rhythm.</h2><p>12 projects finished. Take a breath.</p></div></article>
      ${liveChartMarkup()}
    </section>`;
}
const columns=['To do','In progress','Done'];
function taskCard(t){return `<article class="task-card" data-task="${t.id}" tabindex="0" aria-label="${escape(t.title)}. Alt plus left or right arrow to change status."><span class="tag ${t.tag.toLowerCase()}">${t.tag}</span><button class="drag-handle" aria-label="Drag ${escape(t.title)}" title="Drag any part of this card, or use Alt + arrow keys">⠿</button><h3>${t.title}</h3><p>${t.desc}</p><div class="task-bottom">${avatar(members[t.member])}<small>◷ Oct ${18+Number(t.id.slice(1))}</small><select aria-label="Move ${escape(t.title)}" data-move="${t.id}">${columns.map((name,i)=>`<option value="${i}" ${t.status===i?'selected':''}>${name}</option>`).join('')}</select></div></article>`;}
function tasksView(){return head('Make room for momentum.', 'One thoughtful step at a time. Here’s what’s next.', '<button class="btn" data-view="overview">← Overview</button>')+`<div class="toolbar"><div class="tabs"><span>Board view</span></div><p>Drag any card. On touch, hold then move.<br>Keyboard: Alt + ← / → or the status selector.</p></div><section class="kanban" aria-label="Task board">${columns.map((name,i)=>`<section class="kanban-column" data-column="${i}" style="--delay:${i*80}ms"><h2 class="column-head"><i></i>${name} <span class="column-count">${tasks.filter(t=>t.status===i).length}</span></h2><div class="task-list">${tasks.filter(t=>t.status===i).map(taskCard).join('')}</div></section>`).join('')}</section>`;}
function team(){return head('Good company. Great work.', 'Six curious minds, one shared direction.', '<span class="date-pill"><span class="status-dot"></span> Everyone’s connected</span>')+`<div class="toolbar"><span class="eyebrow">THE STUDIO / 06 PEOPLE</span><p>Get to know your team ↗</p></div><section class="team-grid" aria-label="Team members">${members.map((m,i)=>`<button class="member-card" data-member="${i}" style="--delay:${i*70}ms"><div class="member-top">${avatar(m)}<span>● ${i===4?'Focusing':'Available'}</span></div><h2>${m.name}</h2><p>${m.role}</p><div class="member-stats"><div><b>${m.tasks}</b><small>Tasks completed</small></div><div><b>${m.hours}h</b><small>This week</small></div><span style="margin-left:auto;align-self:center;color:var(--muted)">↗</span></div></button>`).join('')}</section>`;}
const events={12:['Design check-in','11:00 AM'],14:['Brand workshop','2:00 PM'],16:['Weekly wrap-up','4:00 PM'],19:['Sprint planning','10:00 AM'],21:['Client review','1:00 PM'],23:['Northstar launch','9:00 AM'],28:['Forma handoff','3:00 PM']};
function calendar(){return head('A little perspective.', 'A clear view of what’s ahead. Leave some room to breathe.', '<span class="date-pill">Studio timezone · CEST</span>')+`<section class="calendar-layout"><article class="card calendar-card">${cardHead('October 2026','MONTH / 10')}<div class="calendar" role="table" aria-label="October 2026 calendar">${['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d=>`<div class="day-name" role="columnheader">${d}</div>`).join('')}${Array.from({length:35},(_,i)=>{const date=i-2;const inMonth=date>0&&date<=31;return `<div class="day ${inMonth?'':'faded'} ${date===12?'today':''}" role="cell"><span>${date<1?30+date:date>31?date-31:date}</span>${events[date]?`<span class="event ${date===23?'warm':''}" title="${events[date].join(' · ')}" style="--delay:${180+i*22}ms">${events[date][0]}</span>`:''}</div>`;}).join('')}</div></article><article class="card upcoming-list" style="--delay:180ms">${cardHead('Coming up','This week')}${[12,14,16].map((date,i)=>`<div class="upcoming-event"><small>OCT ${date} / ${['MONDAY','WEDNESDAY','FRIDAY'][i]}</small><h3>${events[date][0]}</h3><p>◷ ${events[date][1]} · 30 min</p><div class="avatar-stack" style="margin:14px 0 0 5px">${members.slice(i,i+3).map(m=>avatar(m)).join('')}</div></div>`).join('')}</article></section>`;}
const reportValues=[32,38,36,49,44,51,48,58,53,55,68,62,65,72,67,80,76,73,83,79,88];
const reportPoints=reportValues.map((v,i)=>[42+i*25.7,225-v*2]);
function reports(){const line=smoothPath(reportPoints);return head('Progress, with perspective.', 'The small wins add up. Here’s the bigger picture.', '<span class="date-pill">October 01 — 31, 2026</span>')+`<section class="metrics" aria-label="Report metrics">${metric('Tasks completed',627,'<b>↗ 18%</b> vs. last month',0)}${metric('Hours of good work',3429,'<b>↗ 12%</b> vs. last month',1)}${metric('On-time delivery',89,'<b>↗ 5%</b> vs. last month',2,'%')}${metric('Average cycle',3,'<b>↓ 0.8d</b> getting smoother',3,'d')}</section><section class="reports-grid"><article class="card">${cardHead('Steady, thoughtful progress','Throughput / October')}<p class="chart-sub">Completed tasks across the studio. Explore the chart.</p><div class="area-chart"><svg id="report-chart" viewBox="0 0 600 270" role="img" aria-label="Daily completed tasks rising from 32 to 88. Use left and right arrow keys to explore." tabindex="0"><defs><linearGradient id="area-gradient" x1="0" y1="0" x2="0" y2="1"><stop stop-color="var(--accent)" stop-opacity=".22"/><stop offset="1" stop-color="var(--accent)" stop-opacity=".01"/></linearGradient></defs>${[50,100,150,200].map((y,i)=>`<line class="gridline" x1="42" y1="${y}" x2="565" y2="${y}"/><text class="axis-label" x="8" y="${y+3}">${100-i*25}</text>`).join('')}<path class="area-fill" d="${line} L556 225 L42 225 Z"/><path class="area-line" d="${line}"/>${[0,5,10,15,20].map((i)=>`<text class="axis-label" x="${reportPoints[i][0]-12}" y="252">Oct ${i+1}</text>`).join('')}<g id="chart-marker" visibility="hidden"><line class="chart-guide" y1="25" y2="225"/><circle class="chart-dot" r="5"/></g></svg><div class="chart-tooltip" hidden></div></div><div class="chart-summary"><span>More flow. Fewer bottlenecks.</span><strong>↑ 18% this month</strong></div></article><article class="card" style="--delay:180ms">${cardHead('Work in balance','October')}<div class="donut" role="img" aria-label="73 percent design, 18 percent development, 9 percent strategy"><svg viewBox="0 0 130 130"><circle cx="65" cy="65" r="50" stroke="var(--soft)"/><circle cx="65" cy="65" r="50" stroke="var(--bright)" stroke-dasharray="57 314" stroke-dashoffset="-230"/><circle class="donut-ring" cx="65" cy="65" r="50"/></svg><div class="donut-label">3,429<small>Total studio hours</small></div></div>${[['Design',73,'var(--accent)'],['Development',18,'var(--bright)'],['Strategy',9,'var(--soft)']].map(row=>`<div class="donut-key"><span><i style="background:${row[2]}"></i>${row[0]}</span><b>${row[1]}%</b></div>`).join('')}</article></section><article class="card insight" style="--delay:250ms"><span>✳</span><div><h2>A rhythm worth keeping.</h2><p>Your team completed 18% more tasks while keeping the average work week under 36 hours.</p></div></article>`;}
function settings(){return head('Make yourself at home.', 'A workspace that feels a little more like you.')+`<section class="settings-layout"><article class="card">${cardHead('A color for your kind of work','Appearance')}<p class="setting-description">Same thoughtful workspace. A fresh point of view.</p><div class="swatches" role="group" aria-label="Workspace accent color">${Object.keys(themes).map(name=>`<button class="swatch" data-theme="${name}" aria-pressed="${name===currentTheme}" style="--swatch:${themes[name][0]}"><i></i>${name[0].toUpperCase()+name.slice(1)}</button>`).join('')}</div><div class="theme-preview"><span>♧</span><div><h3>Your ideas look good here.</h3><p>Every accent, chart, and little detail follows your lead.</p></div></div></article><article class="card" style="--delay:120ms">${cardHead('Room to grow','Sprig Pro')}<p class="setting-description">A flexible plan for a growing studio.</p><div class="pricing-number">$<span id="plan-price">89</span><small> / month</small></div><label class="range-label" for="plan-seats">People in your studio <output id="seat-count">6 members</output></label><input id="plan-seats" type="range" min="2" max="30" value="6" step="1" aria-describedby="pricing-note"><ul class="plan-features"><li>Unlimited projects and a shared calendar</li><li>Time tracking & thoughtful reports</li><li>A little more space for everyone</li></ul><p class="setting-description" id="pricing-note">Plan estimate: $29 base + $10 per member.</p></article><p class="settings-note">Your color preference and task board are saved on this device. Plan prices are illustrative.</p></section>`;}
const renderers={overview,tasks:tasksView,team,calendar,reports,settings};
function navigate(name){
  if(!renderers[name])name='overview';
  if(currentView===name)return;
  clearPendingDrag();
  if(drag) finishDrag(true);
  viewTransition?.skipTransition();
  const render=()=>renderView(name);
  if(currentView && document.startViewTransition && !prefersReducedMotion()){
    viewTransition=document.startViewTransition(render);
    viewTransition.finished.catch(()=>{});
  }else render();
}
function renderView(name){
  cancelAnimationFrame(entranceFrame);
  currentView=name;
  main.innerHTML=renderers[name]();main.className='view-enter';
  window.scrollTo({top:0,behavior:'instant'});
  clearTimeout(entranceTimeout);
  entranceTimeout=setTimeout(()=>main.classList.remove('view-enter'),1500);
  document.querySelector('#crumb').textContent=views.find(v=>v.toLowerCase()===name);
  document.querySelectorAll('.nav-button').forEach(b=>{const active=b.dataset.view===name;b.classList.toggle('active',active);if(active)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
  if(location.hash!==`#${name}`)history.replaceState(null,'',`#${name}`);
  main.querySelectorAll('.card').forEach((card,i)=>{if(!card.style.getPropertyValue('--delay'))card.style.setProperty('--delay',`${i*65}ms`);});
  animateCounts();if(name==='overview'){updateTimer();bindLiveChart();}if(name==='reports')bindReport();
}
function animateCounts(){const counters=[...main.querySelectorAll('[data-count]')];if(prefersReducedMotion())return;const start=performance.now();const tick=now=>{if(document.hidden){counters.forEach(el=>el.textContent=Number(el.dataset.count).toLocaleString());return;}const progress=Math.min(1,(now-start)/1100);counters.forEach(el=>el.textContent=Math.round(Number(el.dataset.count)*(1-Math.pow(1-progress,3))).toLocaleString());if(progress<1)entranceFrame=requestAnimationFrame(tick);};entranceFrame=requestAnimationFrame(tick);}
function toast(message, undo){
  const el=document.querySelector('.toast');el.replaceChildren();
  const text=document.createElement('span');text.textContent=message;el.append(text);
  if(undo){const button=document.createElement('button');button.textContent='Undo';button.addEventListener('click',()=>{undo();toast('A little room to change your mind. Task restored.');},{once:true});el.append(button);}
  el.classList.add('visible');clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>el.classList.remove('visible'),undo?8000:3500);
}

// Timer uses elapsed real time so view changes and sleeping tabs never cause drift.
let timerSeconds=5048, timerStarted=performance.now(), timerRunning=true, timerStopped=false;
function elapsedSeconds(){return timerSeconds+(timerRunning?Math.floor((performance.now()-timerStarted)/1000):0);}
function updateTimer(){const display=document.querySelector('#timer-display');if(!display)return;const seconds=elapsedSeconds();display.textContent=[Math.floor(seconds/3600),Math.floor(seconds/60)%60,seconds%60].map(v=>String(v).padStart(2,'0')).join(':');const toggle=document.querySelector('#timer-toggle');toggle.textContent=timerRunning?'Ⅱ':'▶';toggle.setAttribute('aria-label',timerRunning?'Pause time tracker':'Start time tracker');document.querySelector('#timer-status').textContent=timerRunning?'A little focus goes a long way.':timerStopped?'Fresh start. Whenever you’re ready.':'Paused. Take a little breath.';}
setInterval(()=>{if(currentView==='overview'&&!document.hidden)updateTimer();},1000);

// Native modal dialog supplies focus containment and restores focus on close.
const dialog=document.querySelector('#member-dialog');
function openMember(index){const m=members[index];dialog.querySelector('.drawer-content').innerHTML=`<button class="drawer-close" aria-label="Close member details" autofocus>×</button>${avatar(m)}<h2 id="drawer-name">${m.name}</h2><p class="drawer-role">${m.role}</p><div class="member-stats"><div><b>${m.tasks}</b><small>Tasks completed</small></div><div><b>${m.hours}h</b><small>This week</small></div></div><div class="drawer-detail"><span>Studio</span>Sprig Creative</div><div class="drawer-detail"><span>Location</span>${m.location}</div><div class="drawer-detail"><span>Working on</span>Northstar rebrand</div><div class="drawer-detail"><span>Joined</span>March 2025</div><p class="drawer-bio">${m.bio}</p><button class="btn primary" id="member-tasks">See ${m.name.split(' ')[0]}’s tasks ↗</button>`;dialog.showModal();document.body.style.overflow='hidden';}
dialog.addEventListener('click',event=>{const r=dialog.getBoundingClientRect();if(event.target.closest('.drawer-close')||event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();if(event.target.closest('#member-tasks')){dialog.close();navigate('tasks');toast('Showing the studio board — assignees appear on each task.');}});
dialog.addEventListener('close',()=>document.body.style.overflow='');
dialog.addEventListener('keydown',event=>{if(event.key!=='Tab')return;const controls=[...dialog.querySelectorAll('button')];if(event.shiftKey&&document.activeElement===controls[0]){event.preventDefault();controls.at(-1).focus();}else if(!event.shiftKey&&document.activeElement===controls.at(-1)){event.preventDefault();controls[0].focus();}});

// Freeze measured boxes; only a same-size placeholder enters another column.
const flipAnimations = new Map();
function positions(){return new Map([...main.querySelectorAll('.task-card')].map(el=>[el,el.getBoundingClientRect()]));}
function flip(before){
  if(prefersReducedMotion())return;
  before.forEach((r,el)=>{
    flipAnimations.get(el)?.cancel();
    const next=el.getBoundingClientRect(),x=r.left-next.left,y=r.top-next.top;
    if(x||y){const animation=el.animate([{transform:`translate(${x}px,${y}px)`},{transform:'translate(0,0)'}],{duration:280,easing:'cubic-bezier(.22,1,.36,1)'});flipAnimations.set(el,animation);animation.finished.then(()=>{if(flipAnimations.get(el)===animation)flipAnimations.delete(el);}).catch(()=>{});}
  });
}
function saveBoard(){
  tasks=[...main.querySelectorAll('.task-card')].map(el=>({...tasks.find(t=>t.id===el.dataset.task),status:Number(el.closest('.kanban-column').dataset.column)}));
  const saved=storage.set('sprig-tasks',tasks);
  main.querySelectorAll('.kanban-column').forEach(col=>col.querySelector('.column-count').textContent=col.querySelectorAll('.task-card').length);
  main.querySelectorAll('[data-move]').forEach(s=>s.value=String(tasks.find(t=>t.id===s.dataset.move).status));return saved;
}
function clearPendingDrag(){if(pendingDrag)clearTimeout(pendingDrag.timer);pendingDrag=null;}
function startDrag(pending){
  if(!pending.card.isConnected)return;
  clearPendingDrag();
  main.classList.remove('view-enter');
  flipAnimations.forEach(animation=>animation.cancel());flipAnimations.clear();
  const {card,pointerId,x,y}=pending,r=card.getBoundingClientRect(),board=card.closest('.kanban');
  const locked=[...board.querySelectorAll('.kanban-column,.task-list,.task-card')].map(el=>({el,style:el.getAttribute('style'),r:el.getBoundingClientRect()}));
  locked.forEach(({el,r:box})=>{el.style.width=`${box.width}px`;el.style.height=`${box.height}px`;el.style.minHeight=`${box.height}px`;});
  const ghost=card.cloneNode(true);ghost.classList.add('task-ghost');ghost.removeAttribute('data-task');ghost.removeAttribute('tabindex');ghost.setAttribute('aria-hidden','true');ghost.inert=true;
  Object.assign(ghost.style,{width:`${r.width}px`,height:`${r.height}px`,minHeight:`${r.height}px`,left:`${r.left}px`,top:`${r.top}px`});
  const placeholder=document.createElement('div');placeholder.className='task-placeholder';placeholder.setAttribute('aria-hidden','true');placeholder.style.height=`${r.height}px`;placeholder.style.width=`${r.width}px`;
  const originalParent=card.parentNode,originalNext=card.nextSibling;
  card.replaceWith(placeholder);
  // Keep the touch target connected so its cancellable touchmove still bubbles.
  card.hidden=true;document.body.append(card,ghost);board.classList.add('is-dragging');
  main.setPointerCapture(pointerId);
  drag={card,ghost,placeholder,board,locked,pointerId,offsetX:x-r.left,offsetY:y-r.top,originalParent,originalNext,snapshot:tasks.map(t=>({...t})),x,y,frame:0};
  drag.frame=requestAnimationFrame(dragFrame);
}
function updateDropTarget(){
  if(!drag)return;
  const {x,y,placeholder,board}=drag;
  const column=document.elementFromPoint(x,y)?.closest('.kanban-column');
  board.querySelectorAll('.kanban-column').forEach(el=>el.classList.toggle('drop-over',el===column));
  if(!column)return;
  const list=column.querySelector('.task-list'),cards=[...list.querySelectorAll('.task-card')];
  const next=cards.find(c=>{const r=c.getBoundingClientRect();return y<r.top+r.height/2;})||null;
  if(placeholder.parentNode!==list||placeholder.nextSibling!==next){const before=positions();list.insertBefore(placeholder,next);flip(before);}
}
function dragFrame(){
  if(!drag)return;
  drag.ghost.style.transform=`translate3d(${drag.x-drag.offsetX-parseFloat(drag.ghost.style.left)}px,${drag.y-drag.offsetY-parseFloat(drag.ghost.style.top)}px,0)`;
  const edge=90,speed=drag.y>innerHeight-edge?Math.min(14,(drag.y-innerHeight+edge)/5):drag.y<edge?-Math.min(14,(edge-drag.y)/5):0;
  if(speed){window.scrollBy({top:speed,behavior:'instant'});updateDropTarget();}
  drag.frame=requestAnimationFrame(dragFrame);
}
main.addEventListener('pointerdown',event=>{
  const card=event.target.closest('.task-card');
  if(!card||drag||event.button!==0||event.target.closest('select,input,a')||event.target.closest('button:not(.drag-handle)'))return;
  const pending={card,pointerId:event.pointerId,x:event.clientX,y:event.clientY,touch:event.pointerType==='touch'};
  pendingDrag=pending;
  // Touch can still scroll normally; holding a card arms the drag.
  if(pending.touch)pending.timer=setTimeout(()=>{if(pendingDrag===pending)startDrag(pending);},240);
  else event.preventDefault();
});
main.addEventListener('pointermove',event=>{
  if(pendingDrag?.pointerId===event.pointerId){
    const distance=Math.hypot(event.clientX-pendingDrag.x,event.clientY-pendingDrag.y);
    if(distance>6){if(pendingDrag.touch)clearPendingDrag();else startDrag(pendingDrag);}
  }
  if(!drag||drag.pointerId!==event.pointerId)return;
  event.preventDefault();drag.x=event.clientX;drag.y=event.clientY;updateDropTarget();
});
document.addEventListener('touchmove',event=>{if(drag&&event.cancelable)event.preventDefault();},{passive:false});
document.addEventListener('contextmenu',event=>{if(drag)event.preventDefault();});
function finishDrag(cancel=false){
  clearPendingDrag();if(!drag)return;
  const state=drag;drag=null;cancelAnimationFrame(state.frame);
  const {card,ghost,placeholder,board,locked,pointerId,originalParent,originalNext,snapshot}=state;
  const before=positions();
  if(cancel){placeholder.remove();originalParent.insertBefore(card,originalNext);}else placeholder.replaceWith(card);
  card.hidden=false;
  ghost.remove();board.classList.remove('is-dragging');
  locked.forEach(({el,style})=>{if(style===null)el.removeAttribute('style');else el.setAttribute('style',style);});
  if(main.hasPointerCapture(pointerId))main.releasePointerCapture(pointerId);
  board.querySelectorAll('.kanban-column').forEach(c=>c.classList.remove('drop-over'));
  flip(before);if(!cancel)completeMove(card,snapshot);card.focus({preventScroll:true});
}
main.addEventListener('pointerup',event=>{if(drag?.pointerId===event.pointerId)finishDrag();else clearPendingDrag();});
main.addEventListener('pointercancel',()=>{clearPendingDrag();finishDrag(true);});
main.addEventListener('lostpointercapture',event=>{if(drag?.pointerId===event.pointerId)finishDrag(true);});
window.addEventListener('blur',()=>{clearPendingDrag();finishDrag(true);});
window.addEventListener('resize',()=>finishDrag(true));
document.addEventListener('visibilitychange',()=>{if(document.hidden)finishDrag(true);});
function restoreBoard(snapshot){
  tasks=snapshot.map(t=>({...t}));storage.set('sprig-tasks',tasks);
  if(currentView==='tasks'){
    const before=positions();
    tasks.forEach(t=>main.querySelector(`[data-column="${t.status}"] .task-list`).append(main.querySelector(`[data-task="${t.id}"]`)));
    saveBoard();flip(before);
  }
}
function completeMove(card,snapshot){
  const previous=snapshot.find(t=>t.id===card.dataset.task).status,status=Number(card.closest('.kanban-column').dataset.column),saved=saveBoard();
  if(status===2&&previous!==2)confetti(card.getBoundingClientRect());
  toast(`${status===2&&previous!==2?'A small win! ':''}Task moved to ${columns[status]}.${saved?'':' Saved for this visit.'}`,()=>restoreBoard(snapshot));
}
function moveCard(card,status){
  if(drag)return;
  const snapshot=tasks.map(t=>({...t})),before=positions();
  main.querySelector(`[data-column="${status}"] .task-list`).append(card);flip(before);completeMove(card,snapshot);
}
main.addEventListener('change',event=>{const select=event.target.closest('[data-move]');if(!select)return;moveCard(select.closest('.task-card'),Number(select.value));select.focus({preventScroll:true});});
main.addEventListener('keydown',event=>{const card=event.target.closest('.task-card');if(card&&event.altKey&&['ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();const status=Number(card.closest('.kanban-column').dataset.column);moveCard(card,Math.max(0,Math.min(2,status+(event.key==='ArrowRight'?1:-1))));card.focus({preventScroll:true});}});
function confetti(rect){
  if(prefersReducedMotion())return;
  const x=Math.min(innerWidth-30,Math.max(30,rect.left+rect.width/2)),y=Math.min(innerHeight-100,Math.max(60,rect.top+30));
  for(let i=0;i<24;i++){
    const piece=document.createElement('i');piece.className='confetti';piece.style.left=`${x}px`;piece.style.top=`${y}px`;piece.style.background=['var(--accent)','#e9b860','#bd9cda','#8abfb0'][i%4];document.body.append(piece);
    const angle=Math.PI+(i/24)*Math.PI,range=65+Math.random()*100;
    piece.animate([{transform:'translate(0,0) rotate(0)',opacity:1},{transform:`translate(${Math.cos(angle)*range}px,${Math.sin(angle)*range}px) rotate(${i*37}deg)`,opacity:1,offset:.55},{transform:`translate(${Math.cos(angle)*range*1.3}px,${60+Math.random()*90}px) rotate(${i*65}deg)`,opacity:0}],{duration:1000+Math.random()*300,easing:'cubic-bezier(.15,.7,.4,1)'}).finished.then(()=>piece.remove()).catch(()=>piece.remove());
  }
}

// SVG coordinates, rather than screen pixels, keep the report tooltip responsive.
function bindReport(){const svg=document.querySelector('#report-chart'),marker=document.querySelector('#chart-marker'),tooltip=main.querySelector('.chart-tooltip');let active=10;function show(index){active=Math.max(0,Math.min(reportPoints.length-1,index));const [x,y]=reportPoints[active];marker.setAttribute('visibility','visible');const guide=marker.querySelector('line');guide.setAttribute('x1',x);guide.setAttribute('x2',x);marker.querySelector('circle').setAttribute('cx',x);marker.querySelector('circle').setAttribute('cy',y);tooltip.hidden=false;tooltip.innerHTML=`<small>October ${active+1}, 2026</small>${reportValues[active]} tasks completed`;const r=svg.getBoundingClientRect();tooltip.style.left=`${Math.max(0,Math.min(r.width-120,x/600*r.width-55))}px`;tooltip.style.top=`${Math.max(0,y/270*r.height-60)}px`;svg.setAttribute('aria-label',`October ${active+1}: ${reportValues[active]} tasks completed. Left and right arrows explore dates.`);}
  svg.addEventListener('pointermove',event=>{const r=svg.getBoundingClientRect();show(Math.round(((event.clientX-r.left)/r.width*600-42)/25.7));});svg.addEventListener('pointerdown',event=>{const r=svg.getBoundingClientRect();show(Math.round(((event.clientX-r.left)/r.width*600-42)/25.7));});svg.addEventListener('pointerleave',()=>{if(document.activeElement!==svg){tooltip.hidden=true;marker.setAttribute('visibility','hidden');}});svg.addEventListener('focus',()=>show(active));svg.addEventListener('blur',()=>{tooltip.hidden=true;marker.setAttribute('visibility','hidden');});svg.addEventListener('keydown',event=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();show(event.key==='Home'?0:event.key==='End'?20:active+(event.key==='ArrowRight'?1:-1));}});
}
document.addEventListener('click',event=>{const nav=event.target.closest('[data-view]');if(nav){navigate(nav.dataset.view);main.focus({preventScroll:true});}const member=event.target.closest('[data-member]');if(member)openMember(Number(member.dataset.member));const theme=event.target.closest('[data-theme]');if(theme)applyTheme(theme.dataset.theme,true);if(event.target.closest('#timer-toggle')){timerSeconds=elapsedSeconds();timerRunning=!timerRunning;timerStarted=performance.now();timerStopped=false;updateTimer();}if(event.target.closest('#timer-stop')){const seconds=elapsedSeconds();timerSeconds=0;timerRunning=false;timerStopped=true;updateTimer();toast(`Focus session finished: ${Math.floor(seconds/60)} minutes. Ready for a fresh start.`);}});
main.addEventListener('input',event=>{if(event.target.id==='plan-seats'){const count=Number(event.target.value);document.querySelector('#seat-count').textContent=`${count} members`;document.querySelector('#plan-price').textContent=29+count*10;}});
// A fuzzy command menu keeps input focus while its active option changes.
const search=document.querySelector('#search'),palette=document.querySelector('#command-dialog'),commandInput=document.querySelector('#command-input'),commandResults=document.querySelector('#command-results');
let commandMatches=[],commandIndex=0,paletteClosing=false;
function fuzzyScore(query,text){
  query=query.toLowerCase().trim();text=text.toLowerCase();
  if(!query)return 1;
  if(text.includes(query))return 100-query.length*.1-text.indexOf(query);
  let cursor=0,score=0,previous=-2;
  for(const char of query.replace(/\s/g,'')){const index=text.indexOf(char,cursor);if(index===-1)return 0;score+=index===previous+1?8:2;if(index===0||text[index-1]===' ')score+=6;score-=Math.min(3,(index-cursor)*.1);previous=index;cursor=index+1;}
  return score;
}
function updateCommands(){
  const entries=[...views.map((name,i)=>({text:name,detail:'Workspace view',view:name.toLowerCase(),symbol:icon(i)})),...tasks.map(t=>({text:t.title,detail:`Task · ${columns[t.status]}`,view:'tasks',task:t.id,symbol:'↗',extra:t.desc})),...members.map((m,i)=>({text:m.name,detail:m.role,member:i,symbol:avatar(m),extra:m.role}))];
  commandMatches=entries.map(entry=>({...entry,score:fuzzyScore(commandInput.value,entry.text+' '+(entry.extra||''))})).filter(entry=>entry.score>0).sort((a,b)=>b.score-a.score).slice(0,10);
  commandIndex=0;
  commandResults.innerHTML=commandMatches.length?commandMatches.map((m,i)=>`<div class="command-option" id="command-option-${i}" role="option" aria-selected="${i===0}" data-command="${i}"><span class="command-symbol">${m.symbol}</span><span>${escape(m.text)}<small>${escape(m.detail)}</small></span><span class="command-arrow">↵</span></div>`).join(''):'<p class="empty-state">No matches yet. Try “design”, “Noah” or “reports”.</p>';
  document.querySelector('#command-caption').textContent=commandInput.value?`${commandMatches.length} RESULTS / FOLLOW YOUR CURIOSITY`:'YOUR WORKSPACE, AT YOUR FINGERTIPS';
  selectCommand(0);
}
function selectCommand(index){
  commandIndex=(index+commandMatches.length)%Math.max(1,commandMatches.length);
  commandResults.querySelectorAll('[role="option"]').forEach((el,i)=>el.setAttribute('aria-selected',String(i===commandIndex)));
  const active=commandResults.querySelector(`#command-option-${commandIndex}`);
  if(active){commandInput.setAttribute('aria-activedescendant',active.id);active.scrollIntoView({block:'nearest',behavior:'instant'});}else commandInput.removeAttribute('aria-activedescendant');
}
function openPalette(){
  finishDrag(true);if(palette.open)return;
  if(dialog.open)dialog.close();
  commandInput.value='';updateCommands();paletteClosing=false;palette.showModal();commandInput.focus();
}
function closePalette(action){
  if(!palette.open||paletteClosing)return;
  paletteClosing=true;
  const finish=()=>{palette.close();paletteClosing=false;action?.();};
  if(prefersReducedMotion())finish();else palette.animate([{opacity:1,transform:'translateY(0)'},{opacity:0,transform:'translateY(8px)'}],{duration:140,easing:'ease-in'}).finished.then(finish).catch(finish);
}
function runCommand(index){
  const match=commandMatches[index];if(!match)return;
  closePalette(()=>{
    if(match.member!==undefined){openMember(match.member);return;}
    navigate(match.view);
    const focusTask=()=>{const card=main.querySelector(`[data-task="${match.task}"]`);if(card){card.scrollIntoView({block:'center',behavior:prefersReducedMotion()?'instant':'smooth'});card.focus({preventScroll:true});card.classList.add('task-found');setTimeout(()=>card.classList.remove('task-found'),1600);}else main.focus({preventScroll:true});};
    if(viewTransition) viewTransition.updateCallbackDone.then(focusTask).catch(()=>{});else focusTask();
  });
}
search.addEventListener('click',openPalette);
commandInput.addEventListener('input',updateCommands);
palette.addEventListener('keydown',event=>{if(['ArrowDown','ArrowUp','Enter'].includes(event.key)){event.preventDefault();if(event.key==='Enter')runCommand(commandIndex);else selectCommand(commandIndex+(event.key==='ArrowDown'?1:-1));}});
palette.addEventListener('cancel',event=>{event.preventDefault();closePalette();});
palette.addEventListener('click',event=>{const option=event.target.closest('[data-command]');if(option)runCommand(Number(option.dataset.command));if(event.target===palette||event.target.closest('#command-close')){const rect=palette.getBoundingClientRect();if(event.target.closest('#command-close')||event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)closePalette();}});
document.addEventListener('keydown',event=>{
  if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'){event.preventDefault();palette.open?closePalette():openPalette();}
  if(event.key==='Escape'){clearPendingDrag();finishDrag(true);}
  if(event.key==='/'&&!dialog.open&&!palette.open&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)){event.preventDefault();openPalette();}
});

// The new theme grows outward from the toggle, with a simple immediate fallback.
const modeToggle=document.querySelector('#mode-toggle');
function updateModeButton(){modeToggle.textContent=darkMode?'☀':'☾';modeToggle.setAttribute('aria-pressed',String(darkMode));modeToggle.setAttribute('aria-label',`Switch to ${darkMode?'light':'dark'} mode`);}
updateModeButton();
modeToggle.addEventListener('click',event=>{
  if(drag)finishDrag(true);
  viewTransition?.skipTransition();
  const rect=modeToggle.getBoundingClientRect(),x=event.detail?event.clientX:rect.left+rect.width/2,y=event.detail?event.clientY:rect.top+rect.height/2;
  const radius=Math.hypot(Math.max(x,innerWidth-x),Math.max(y,innerHeight-y));
  const change=()=>{darkMode=!darkMode;document.documentElement.dataset.mode=darkMode?'dark':'light';applyTheme(currentTheme);updateModeButton();storage.set('sprig-dark',darkMode);};
  if(!document.startViewTransition||prefersReducedMotion()){change();return;}
  document.documentElement.classList.add('mode-reveal');
  viewTransition=document.startViewTransition(change);
  viewTransition.ready.then(()=>document.documentElement.animate({clipPath:[`circle(0px at ${x}px ${y}px)`,`circle(${radius}px at ${x}px ${y}px)`]},{duration:650,easing:'cubic-bezier(.22,1,.36,1)',pseudoElement:'::view-transition-new(root)'}).finished).catch(()=>{}).finally(()=>document.documentElement.classList.remove('mode-reveal'));
  viewTransition.finished.catch(()=>{});
});

// Cubic interpolation softens the line without overshooting the data excessively.
function smoothPath(points){
  return points.map((p,i)=>{if(!i)return `M${p.join(' ')}`;const prev=points[i-1],before=points[i-2]||prev,after=points[i+1]||p;return `C${prev[0]+(p[0]-before[0])/6} ${prev[1]+(p[1]-before[1])/6},${p[0]-(after[0]-prev[0])/6} ${p[1]-(after[1]-prev[1])/6},${p.join(' ')}`;}).join(' ');
}
const liveValues=[38,42,39,49,46,54,51,56,52,60,58,65,61,68,64,70,67,74,71,78,75];
function livePoints(values=liveValues){return values.map((value,i)=>[42+i*25.7,225-value*2]);}
function liveChartMarkup(){
  const line=smoothPath(livePoints());
  return `<article class="card live-activity" style="--delay:480ms">${cardHead('The studio pulse','<span class="live-badge"><i></i> Live demo</span>')}<div class="live-heading"><p class="chart-sub">Good work has a rhythm. This is ours.</p><span><b id="live-value">${liveValues.at(-1)}</b> tasks / day</span></div><div class="area-chart"><svg id="live-chart" viewBox="0 0 600 270" preserveAspectRatio="none" role="img" tabindex="0" aria-label="Live studio activity. Use left and right arrows to explore."><defs><linearGradient id="live-gradient" x1="0" y1="0" x2="0" y2="1"><stop stop-color="var(--accent)" stop-opacity=".26"/><stop offset="1" stop-color="var(--accent)" stop-opacity="0"/></linearGradient></defs>${[50,100,150,200].map(y=>`<line class="gridline" x1="42" x2="556" y1="${y}" y2="${y}"/>`).join('')}<path id="live-fill" d="${line} L556 225 L42 225 Z"/><path id="live-line" class="area-line" d="${line}"/><circle id="live-tip" class="chart-dot" cx="556" cy="${livePoints().at(-1)[1]}" r="5"/><g class="live-marker" visibility="hidden"><line class="chart-guide" y1="25" y2="225"/><circle class="chart-dot" r="5"/></g><text class="axis-label" x="42" y="252">Earlier today</text><text class="axis-label" x="526" y="252">Now</text></svg><div class="chart-tooltip" hidden></div></div></article>`;
}
let liveFrame=0;
function bindLiveChart(){
  cancelAnimationFrame(liveFrame);
  const svg=main.querySelector('#live-chart'),tooltip=svg.parentNode.querySelector('.chart-tooltip'),marker=svg.querySelector('.live-marker');let active=20;
  const show=index=>{active=Math.max(0,Math.min(20,index));const [x,y]=livePoints()[active],rect=svg.getBoundingClientRect();marker.setAttribute('visibility','visible');marker.querySelector('line').setAttribute('x1',x);marker.querySelector('line').setAttribute('x2',x);marker.querySelector('circle').setAttribute('cx',x);marker.querySelector('circle').setAttribute('cy',y);tooltip.hidden=false;tooltip.innerHTML=`<small>${active===20?'Right now':`${(20-active)*5} seconds ago`}</small>${Math.round(liveValues[active])} tasks / day`;tooltip.style.left=`${Math.max(0,Math.min(rect.width-150,x/600*rect.width-70))}px`;tooltip.style.top=`${Math.max(0,y/270*rect.height-65)}px`;svg.setAttribute('aria-label',`${Math.round(liveValues[active])} tasks per day. Left and right arrows explore.`);};
  const point=event=>{const rect=svg.getBoundingClientRect();show(Math.round(((event.clientX-rect.left)/rect.width*600-42)/25.7));};
  svg.addEventListener('pointermove',point);svg.addEventListener('pointerdown',point);svg.addEventListener('focus',()=>show(active));
  const hide=()=>{tooltip.hidden=true;marker.setAttribute('visibility','hidden');};svg.addEventListener('blur',hide);svg.addEventListener('pointerleave',()=>{if(document.activeElement!==svg)hide();});
  svg.addEventListener('keydown',event=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();show(event.key==='Home'?0:event.key==='End'?20:active+(event.key==='ArrowRight'?1:-1));}});
}
setInterval(()=>{
  const svg=main.querySelector('#live-chart');if(!svg||document.hidden)return;
  const rect=svg.getBoundingClientRect();if(rect.bottom<0||rect.top>innerHeight)return;
  const previous=liveValues.slice(),next=[...liveValues.slice(1),Math.max(35,Math.min(92,liveValues.at(-1)+(Math.random()-.43)*14))];
  const start=performance.now(),duration=prefersReducedMotion()?0:800;
  const draw=now=>{
    if(!svg.isConnected)return;
    const progress=duration?Math.min(1,(now-start)/duration):1,ease=1-Math.pow(1-progress,3),values=next.map((value,i)=>previous[i]+(value-previous[i])*ease),points=livePoints(values),line=smoothPath(points);
    svg.querySelector('#live-line').setAttribute('d',line);svg.querySelector('#live-fill').setAttribute('d',`${line} L556 225 L42 225 Z`);svg.querySelector('#live-tip').setAttribute('cy',points.at(-1)[1]);
    if(progress<1)liveFrame=requestAnimationFrame(draw);else{liveValues.splice(0,liveValues.length,...next);main.querySelector('#live-value').textContent=Math.round(next.at(-1));}
  };cancelAnimationFrame(liveFrame);liveFrame=requestAnimationFrame(draw);
},5000);

// Demo collaborators glide between measured cards, pause, then explore again.
const presenceLayer=document.querySelector('#presence-layer');
const collaborators=[{member:1,color:'#c08050'},{member:2,color:'#9378c3'},{member:4,color:'#568d9c'}].map((person,i)=>{
  const el=document.createElement('div');el.className='presence-cursor';el.style.setProperty('--cursor-color',person.color);el.innerHTML=`<svg viewBox="0 0 24 28"><path d="M2 2L20 17l-9 1-5 7z"/></svg><span>${members[person.member].name.split(' ')[0]}</span>`;presenceLayer.append(el);return {...person,el,index:i,x:0,y:0,target:null,next:0,fromX:0,fromY:0,start:0,duration:2200};
});
let presenceFrame=0;
function presenceTick(now){
  const hidden=document.hidden||prefersReducedMotion()||palette.open||dialog.open||!!drag;
  presenceLayer.hidden=hidden;
  if(hidden){presenceFrame=0;return;}
  const cards=[...main.querySelectorAll('.card,.task-card,.member-card')].filter(el=>{const r=el.getBoundingClientRect();return r.top>90&&r.top<innerHeight-110;});
  collaborators.forEach(person=>{
    if(now>person.next||!person.target?.isConnected){
      person.target=cards[Math.floor(Math.random()*cards.length)];if(!person.target)return;
      const rect=person.target.getBoundingClientRect();person.fromX=person.x||rect.left+30;person.fromY=person.y||rect.top+40;person.toX=rect.left+Math.min(rect.width-65,40+Math.random()*rect.width*.6);person.toY=rect.top+25+Math.random()*Math.min(80,rect.height*.5);person.start=now;person.duration=2000+Math.random()*1800;person.next=now+person.duration+1400+Math.random()*2200;
    }
    if(!person.target)return;
    const t=Math.min(1,(now-person.start)/person.duration),ease=t*t*(3-2*t);
    person.x=person.fromX+(person.toX-person.fromX)*ease;person.y=person.fromY+(person.toY-person.fromY)*ease-Math.sin(t*Math.PI)*18;
    person.el.style.transform=`translate3d(${person.x}px,${person.y}px,0)`;person.el.classList.toggle('is-hovering',t===1);
  });
  presenceFrame=requestAnimationFrame(presenceTick);
}
function resumePresence(){if(!presenceFrame){collaborators.forEach(p=>p.next=0);presenceFrame=requestAnimationFrame(presenceTick);}}
setInterval(resumePresence,1500);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)resumePresence();});
document.querySelector('.sidebar').classList.add('shell-enter');
document.querySelector('.topbar').classList.add('shell-enter');
setTimeout(()=>document.querySelectorAll('.shell-enter').forEach(el=>el.classList.remove('shell-enter')),1400);
window.addEventListener('hashchange',()=>navigate(location.hash.slice(1)));
navigate(location.hash.slice(1)||'overview');
resumePresence();
