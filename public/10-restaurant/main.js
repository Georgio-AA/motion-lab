import '../shared/base.js';
import {courses,dishes,tagLabels,filterMenu,nextSevenDays,bookingSlots} from './menu-data.js';
import {paintDish} from './illustrations.js';
import {initFire} from './fire.js';
import {initTable} from './film.js';

const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const touch=matchMedia('(hover: none), (pointer: coarse)');
const mobile=matchMedia('(max-width: 760px)');
const root=document.documentElement;

// Controls initialize before any effect, keeping the page usable on weak GPUs.
function initBooking(){
  const dates=nextSevenDays(),dayButtons=[],dateGroup=document.querySelector('#date-chips'),slotGroup=document.querySelector('#time-slots');
  const form=document.querySelector('#booking-form'),confirmation=document.querySelector('.confirmation');
  const minus=document.querySelector('#party-minus'),plus=document.querySelector('#party-plus'),count=document.querySelector('#party-count');
  const dayFormat=new Intl.DateTimeFormat('en-US',{weekday:'short'}),fullFormat=new Intl.DateTimeFormat('en-US',{weekday:'long',month:'long',day:'numeric'});
  let party=2,selectedDay=0,time='6:30 pm';
  function updateParty(){count.value=`${party} ${party===1?'guest':'guests'}`;minus.disabled=party===1;plus.disabled=party===8;}
  minus.addEventListener('click',()=>{party=Math.max(1,party-1);updateParty();});plus.addEventListener('click',()=>{party=Math.min(8,party+1);updateParty();});updateParty();
  function renderSlots(){
    const slots=bookingSlots(dates[selectedDay].getDay());if(!slots.includes(time))time=slots[0];
    slotGroup.replaceChildren();
    for(const value of slots){const b=document.createElement('button');b.type='button';b.textContent=value;b.setAttribute('aria-pressed',String(time===value));b.addEventListener('click',()=>{time=value;for(const child of slotGroup.children)child.setAttribute('aria-pressed',String(child===b));});slotGroup.append(b);}
  }
  dates.forEach((date,index)=>{const b=document.createElement('button');b.type='button';b.innerHTML=`${dayFormat.format(date)}<strong>${date.getDate()}</strong>`;b.setAttribute('aria-label',fullFormat.format(date));b.setAttribute('aria-pressed',String(index===0));b.addEventListener('click',()=>{selectedDay=index;dayButtons.forEach((button,i)=>button.setAttribute('aria-pressed',String(index===i)));renderSlots();});dayButtons.push(b);dateGroup.append(b);});renderSlots();
  form.addEventListener('submit',event=>{event.preventDefault();document.querySelector('#confirmation-details').textContent=`${party} ${party===1?'guest':'guests'} · ${fullFormat.format(dates[selectedDay])} · ${time}`;form.hidden=true;confirmation.hidden=false;confirmation.focus({preventScroll:true});});
  document.querySelector('#book-again').addEventListener('click',()=>{confirmation.hidden=true;form.hidden=false;plus.focus({preventScroll:true});});
}

function initMenu(){
  const tabs=[...document.querySelectorAll('[role=tab]')],filters=[...document.querySelectorAll('[data-filter]')];
  const list=document.querySelector('#menu-list'),empty=document.querySelector('.menu-empty'),status=document.querySelector('#menu-status');
  const preview=document.querySelector('#menu-plate'),hover=document.querySelector('#hover-plate'),floating=document.querySelector('.floating-plate');
  const inline=[],rows=[],animations=new Map();let category='Starters',activeDish='',revision=0;
  function showDish(dish,row,pointer=false){
    if(activeDish!==dish.id){activeDish=dish.id;paintDish(preview,dish.id);paintDish(hover,dish.id);preview.setAttribute('aria-label',`Detailed illustration of ${dish.name}`);document.querySelector('#plate-caption').textContent=dish.name;floating.querySelector('span').textContent=dish.name;}
    if(touch.matches||mobile.matches){for(const c of inline)c.hidden=true;const c=row.querySelector('canvas');if(c){paintDish(c,dish.id);c.hidden=false;}}
    else {floating.classList.add('visible');if(!pointer){const b=row.getBoundingClientRect();pointerX=Math.min(innerWidth-280,b.right+20);pointerY=b.top+40;}}
  }
  for(const dish of dishes){const row=document.createElement('button');row.type='button';row.className='dish';row.dataset.id=dish.id;row.hidden=dish.category!==category;row.innerHTML=`<span class="dish-top"><span class="dish-name">${dish.name}</span><span class="dish-leader" aria-hidden="true"></span><span class="dish-price">$${dish.price}</span></span><span class="dish-description">${dish.description}</span><span class="dish-tags">${dish.tags.map(t=>tagLabels[t]).join(' · ')}</span>`;
    const c=document.createElement('canvas');c.className='dish-inline';c.hidden=true;c.setAttribute('role','img');c.setAttribute('aria-label',`Detailed illustration of ${dish.name}`);inline.push(c);row.append(c);
    row.addEventListener('pointerenter',()=>showDish(dish,row,true));row.addEventListener('focus',()=>showDish(dish,row));row.addEventListener('click',()=>{showDish(dish,row);if(touch.matches||mobile.matches)row.setAttribute('aria-expanded','true');});
    row.addEventListener('pointerleave',()=>{if(document.activeElement!==row)floating.classList.remove('visible');});row.addEventListener('blur',()=>floating.classList.remove('visible'));rows.push(row);list.append(row);
  }
  function render(){
    const selected=filters.filter(b=>b.getAttribute('aria-pressed')==='true').map(b=>b.dataset.filter),matches=filterMenu(category,selected),ids=new Set(matches.map(d=>d.id)),current=++revision;
    list.setAttribute('aria-labelledby',tabs[courses.indexOf(category)].id);empty.hidden=matches.length>0;floating.classList.remove('visible');
    for(const row of rows){animations.get(row)?.cancel();animations.delete(row);const show=ids.has(row.dataset.id);
      if(show){row.hidden=false;row.inert=false;row.classList.remove('enter');if(!reduced.matches){const animation=row.animate([{opacity:0,transform:'translateY(10px)'},{opacity:1,transform:'none'}],{duration:320,easing:'cubic-bezier(.22,1,.36,1)'});animations.set(row,animation);}}
      else if(!row.hidden&&!reduced.matches){row.inert=true;const animation=row.animate([{opacity:1},{opacity:0,transform:'translateY(-8px)'}],{duration:160});animations.set(row,animation);animation.onfinish=()=>{if(current===revision)row.hidden=true;};}
      else {row.hidden=true;row.inert=true;}
    }
    for(const c of inline)c.hidden=true;
    if(matches.length){const first=matches[0];activeDish='';const row=rows.find(r=>r.dataset.id===first.id);showDish(first,row);floating.classList.remove('visible');}
    else {preview.hidden=true;document.querySelector('#plate-caption').textContent='A little room for something else.';}
    preview.hidden=!matches.length;status.textContent=`${matches.length} ${matches.length===1?'dish':'dishes'} in ${category}${selected.length?', filtered by '+selected.map(t=>tagLabels[t]).join(', '):''}.`;
  }
  function selectTab(index){category=courses[index];tabs.forEach((tab,i)=>{tab.setAttribute('aria-selected',String(i===index));tab.tabIndex=i===index?0:-1;});render();}
  tabs.forEach((tab,index)=>{tab.addEventListener('click',()=>selectTab(index));tab.addEventListener('keydown',event=>{let target=index;if(event.key==='ArrowRight')target=(index+1)%4;else if(event.key==='ArrowLeft')target=(index+3)%4;else if(event.key==='Home')target=0;else if(event.key==='End')target=3;else return;event.preventDefault();selectTab(target);tabs[target].focus();});});
  for(const b of filters)b.addEventListener('click',()=>{b.setAttribute('aria-pressed',String(b.getAttribute('aria-pressed')!=='true'));render();});
  touch.addEventListener('change',render);mobile.addEventListener('change',render);reduced.addEventListener('change',render);render();
  document.querySelector('[data-order]').addEventListener('click',()=>{const note=document.querySelector('#order-note');note.hidden=false;setTimeout(()=>note.focus({preventScroll:true}),0);});
  return floating;
}

let pointerX=innerWidth*.5,pointerY=innerHeight*.5,lightX=pointerX,lightY=pointerY,plateX=pointerX,plateY=pointerY;
window.addEventListener('pointermove',event=>{pointerX=event.clientX;pointerY=event.clientY;},{passive:true});
initBooking();
const floating=initMenu();

// Split lines are authored with real spaces. Observers reveal without blocking input.
if(!reduced.matches)root.classList.add('js-motion');
else document.querySelectorAll('.course-panel').forEach(p=>{p.inert=false;});
const revealObserver=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){entry.target.classList.add('visible');revealObserver.unobserve(entry.target);}},{threshold:.12});
document.querySelectorAll('.reveal').forEach(el=>revealObserver.observe(el));
reduced.addEventListener('change',()=>{root.classList.toggle('js-motion',!reduced.matches);});

const effects=[];
for(const canvas of document.querySelectorAll('[data-fire]')){const effect=initFire(canvas,reduced);if(effect)effects.push(effect);}
try {const table=initTable(reduced);if(table)effects.push(table);else throw new Error('Canvas unavailable');}catch {document.querySelector('.table-film').classList.add('table-fallback');document.querySelectorAll('.course-panel').forEach(p=>{p.inert=false;});}
// Bread painting is a static cached asset; CSS adds only a restrained puff.
const bread=document.querySelector('#bread-canvas');paintDish(bread,'bread');

let previousFrame=0,raf=0;
function frame(ms){
  if(!document.hidden){
    for(let i=0;i<effects.length;i++)effects[i].render(ms);
    const delta=Math.min((ms-previousFrame)||16,50);previousFrame=ms;
    if(!reduced.matches){
      if(touch.matches){pointerX=innerWidth*(.5+Math.sin(ms*.00012)*.3);pointerY=innerHeight*(.5+Math.cos(ms*.00009)*.25);}
      const smoothing=1-Math.pow(.88,delta/16);lightX+=(pointerX-lightX)*smoothing;lightY+=(pointerY-lightY)*smoothing;
      root.style.setProperty('--light-x',`${lightX.toFixed(1)}px`);root.style.setProperty('--light-y',`${lightY.toFixed(1)}px`);
    }
    if(floating.classList.contains('visible')&&!touch.matches){const targetX=Math.max(8,Math.min(innerWidth-272,pointerX+28)),targetY=Math.max(8,Math.min(innerHeight-302,pointerY-110));const s=reduced.matches?1:.2;plateX+=(targetX-plateX)*s;plateY+=(targetY-plateY)*s;floating.style.transform=`translate3d(${plateX.toFixed(1)}px,${plateY.toFixed(1)}px,0)`;}
  }
  raf=requestAnimationFrame(frame);
}
raf=requestAnimationFrame(frame);
document.addEventListener('visibilitychange',()=>{cancelAnimationFrame(raf);if(!document.hidden){previousFrame=0;raf=requestAnimationFrame(frame);}});
