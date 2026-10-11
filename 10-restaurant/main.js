import { prefersReducedMotion } from '../shared/base.js';
import { food } from './illustrations.js';
import { dishes, localDateKey, parseLocalDate, kitchenHours, isOpen, timeLabel, availableSlots } from './menu-data.js';
import { initTastingMenu, initFilm } from './film.js';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
let reducedMotion = prefersReducedMotion();
matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', event => { reducedMotion = event.matches; });
const money = value => '$' + value;

function initHours() {
  function update() {
    const now=new Date(),hours=kitchenHours(now.getDay()),open=isOpen(now);
    const status=$('#open-status');status.textContent=open?'Open now':'Closed';status.classList.toggle('is-open',open);
    $$('.hours-card [data-days]').forEach(row=>row.classList.toggle('today',row.dataset.days.split(',').includes(String(now.getDay()))));
    $('#hours-note').textContent=`${open?`Kitchen closes at ${timeLabel(hours.closes)}.`:now.getHours()<hours.opens?`The light comes on at ${timeLabel(hours.opens)}.`:'See you tomorrow.'} Status uses your device’s local time.`;
  }
  update();setInterval(update,30000);
}

function initBooking() {
  const form=$('#reservation-form'),dateInput=$('#booking-date'),slots=$('#time-slots');
  const minus=$('#party-minus'),plus=$('#party-plus'),confirmation=$('#confirmation');
  let party=2,selectedTime='',renderedSlotsKey='';
  const limits=()=>{
    const now=new Date(),last=new Date(now);last.setDate(last.getDate()+90);
    dateInput.min=localDateKey(now);dateInput.max=localDateKey(last);
  };
  limits();const tomorrow=new Date();tomorrow.setDate(tomorrow.getDate()+1);dateInput.value=localDateKey(tomorrow);
  function renderSlots() {
    const available=availableSlots(dateInput.value,party);
    if(!available.some(slot=>slot.value===selectedTime&&!slot.disabled)) selectedTime='';
    const slotsKey=dateInput.value+available.map(slot=>`${slot.value}:${slot.full}:${slot.past}`).join('|');
    if(slotsKey===renderedSlotsKey) return;
    renderedSlotsKey=slotsKey;
    slots.innerHTML=available.map(slot=>`<label><input type="radio" name="time" value="${slot.value}" ${slot.disabled?'disabled':''} ${slot.value===selectedTime?'checked':''} aria-describedby="time-error"><span>${slot.label}${slot.disabled?`<small>${slot.past?'Passed':'Full'}</small>`:''}</span></label>`).join('');
    if(!available.length) slots.innerHTML='<p class="demo-note">Choose a valid date to see times.</p>';
    else if(available.every(slot=>slot.disabled)) slots.insertAdjacentHTML('beforeend','<p class="demo-note">No tables left for this date. Try another evening.</p>');
  }
  function changeParty(delta) {
    party=Math.max(1,Math.min(8,party+delta));
    $('#party-count').textContent=`${party} ${party===1?'guest':'guests'}`;
    minus.disabled=party===1;plus.disabled=party===8;renderSlots();
    $('#time-error').textContent='';
  }
  minus.addEventListener('click',()=>changeParty(-1));plus.addEventListener('click',()=>changeParty(1));
  dateInput.addEventListener('change',()=>{renderSlots();$('#date-error').textContent='';dateInput.removeAttribute('aria-invalid');$('#time-error').textContent='';});
  slots.addEventListener('change',event=>{selectedTime=event.target.value;$('#time-error').textContent='';});
  function validate() {
    limits();
    const name=$('#guest-name'),phone=$('#guest-phone'),email=$('#guest-email');
    const date=parseLocalDate(dateInput.value);
    const dateValid=date && dateInput.value>=dateInput.min && dateInput.value<=dateInput.max;
    const timeValid=availableSlots(dateInput.value,party).some(slot=>slot.value===selectedTime&&!slot.disabled);
    const errors=[
      [dateInput,'date-error',dateValid?'':'Choose a date within the next 90 days.'],
      [name,'name-error',name.value.trim().length>=2?'':'Please enter your name (at least 2 characters).'],
      [phone,'phone-error',/^[+()\d\s.\-]+$/.test(phone.value.trim()) && phone.value.replace(/\D/g,'').length>=7 && phone.value.replace(/\D/g,'').length<=15 ?'':'Enter a phone number with 7–15 digits.'],
      [email,'email-error',email.value.trim() && email.validity.valid?'':'Enter a valid email address.']
    ];
    errors.forEach(([input,id,message])=>{document.getElementById(id).textContent=message;input.setAttribute('aria-invalid',String(Boolean(message)));});
    $('#time-error').textContent=timeValid?'':'Choose an available time for your table.';
    const first=errors.find(([, ,message])=>message);
    if(first) first[0].focus();else if(!timeValid) slots.querySelector('input:not(:disabled)')?.focus();
    return !first&&timeValid;
  }
  form.addEventListener('submit',event=>{
    event.preventDefault();if(!validate()) return;
    const date=parseLocalDate(dateInput.value);
    const friendlyDate=date.toLocaleDateString(undefined,{weekday:'long',month:'short',day:'numeric'});
    const hour=Number(selectedTime.split(':')[0]);
    $('#confirmation-name').textContent=`We’ll imagine a lovely evening for you, ${$('#guest-name').value.trim()}.`;
    $('#confirmation-details').replaceChildren();
    [['Date',friendlyDate],['Time',timeLabel(hour)],['Company',`${party} ${party===1?'guest':'guests'}`]].forEach(([title,value])=>{
      const row=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');
      dt.textContent=title;dd.textContent=value;row.append(dt,dd);$('#confirmation-details').append(row);
    });
    form.hidden=true;confirmation.hidden=false;confirmation.focus({preventScroll:true});
    confirmation.scrollIntoView({behavior:reducedMotion?'instant':'smooth',block:'center'});
    if(!reducedMotion){confirmation.animate([{opacity:0,transform:'translateY(25px) rotate(-3deg)'},{opacity:1,transform:'translateY(0) rotate(0)'}],{duration:750,easing:'cubic-bezier(.22,1,.36,1)'});$('.confirmation-star').animate([{transform:'rotate(-80deg) scale(.3)'},{transform:'rotate(0) scale(1)'}],{duration:1000,easing:'cubic-bezier(.22,1,.36,1)'});}
  });
  $$('input',form).forEach(input=>input.addEventListener('input',()=>{if(input.id.startsWith('guest-')){input.removeAttribute('aria-invalid');document.getElementById(`${input.name}-error`).textContent='';}}));
  $('#book-again').addEventListener('click',()=>{confirmation.hidden=true;form.hidden=false;form.reset();const nextDay=new Date();nextDay.setDate(nextDay.getDate()+1);dateInput.value=localDateKey(nextDay);selectedTime='';renderedSlotsKey='';party=2;changeParty(0);dateInput.focus();});
  form.addEventListener('focusin',()=>{limits();});
  renderSlots();
  // Recheck same-day times when the tab resumes or a clock boundary passes.
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){limits();renderSlots();}});
  setInterval(()=>{if(!form.hidden){limits();renderSlots();}},60000);
  if('IntersectionObserver' in window) {
    const observer=new IntersectionObserver(entries=>{entries.forEach(entry=>$('.mobile-book').classList.toggle('is-hidden',entry.isIntersecting));},{threshold:.08});
    observer.observe($('.booking-panel'));
  }
}

function initOrdering() {
  const dialog=$('#order-dialog'),items=$('#order-items'),status=$('#order-status');
  const favorites=['hummus','aubergine','cake'].map(id=>dishes.find(dish=>dish.id===id));
  const quantities=new Map(favorites.map(dish=>[dish.id,0]));
  let returnFocus=null;
  items.innerHTML=favorites.map(dish=>`<div class="order-item"><div class="order-item-art" aria-hidden="true">${food(dish.art, 'order-art')}</div><div><h3>${dish.name}</h3><p>${money(dish.price)}</p></div><div class="order-stepper"><button type="button" data-dish="${dish.id}" data-delta="-1" aria-label="Remove one ${dish.name}" disabled>−</button><output aria-label="${dish.name} quantity" aria-live="polite" id="quantity-${dish.id}">0</output><button type="button" data-dish="${dish.id}" data-delta="1" aria-label="Add one ${dish.name}">+</button></div></div>`).join('');
  items.addEventListener('click',event=>{
    const button=event.target.closest('[data-delta]');if(!button)return;
    const id=button.dataset.dish,value=Math.min(8,Math.max(0,quantities.get(id)+Number(button.dataset.delta)));
    quantities.set(id,value);$(`#quantity-${id}`).textContent=value;
    items.querySelector(`[data-dish="${id}"][data-delta="-1"]`).disabled=value===0;
    items.querySelector(`[data-dish="${id}"][data-delta="1"]`).disabled=value===8;
    $('#order-total').textContent=money(favorites.reduce((sum,dish)=>sum+dish.price*quantities.get(dish.id),0));
    status.textContent='Choose a few favorites. Nothing is sent to a kitchen.';
  });
  $$('[data-open-order]').forEach(button=>button.addEventListener('click',()=>{returnFocus=button;dialog.showModal();}));
  $('.dialog-close').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',event=>{if(event.target===dialog){const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close();}});
  dialog.addEventListener('close',()=>returnFocus?.focus({preventScroll:true}));
  $('#order-preview').addEventListener('click',()=>{
    const count=[...quantities.values()].reduce((sum,value)=>sum+value,0);
    status.textContent=count?`Looks delicious: ${count} ${count===1?'dish':'dishes'}, ${$('#order-total').textContent}. This is a demo; no order has been placed.`:'Add at least one dish to preview your order.';
    if(!reducedMotion) status.animate([{opacity:0,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0)'}],{duration:350});
  });
}

function initFooter() {
  $('#year').textContent=new Date().getFullYear();
  $('#newsletter-form').addEventListener('submit',event=>{event.preventDefault();$('#newsletter-status').textContent='A taste of what’s possible. Demo signup complete — no email was stored or subscribed.';$('#newsletter-email').value='';});
  $$('[data-social]').forEach(button=>button.addEventListener('click',()=>{$('#social-status').textContent=`${button.dataset.social} is an illustrative social preview. Connect your restaurant’s profile here.`;}));
}

// Small magnetic responses only on precise pointers; touch targets stay stationary.
function initButtons() {
  if(!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  $$('.pill').forEach(button=>{
    button.addEventListener('pointermove',event=>{
      if(reducedMotion)return;
      const rect=button.getBoundingClientRect();
      button.style.translate=`${(event.clientX-rect.left-rect.width/2)*.05}px ${(event.clientY-rect.top-rect.height/2)*.1}px`;
    });
    button.addEventListener('pointerleave',()=>{button.style.translate='0 0';});
  });
}


// Forms work immediately, independently of the optional CDN-powered film.
for (const initialize of [initTastingMenu, initHours, initBooking, initOrdering, initFooter, initButtons]) {
  try { initialize(); } catch { /* Optional failures never interrupt native scrolling. */ }
}
initFilm().catch(()=>{ /* A failed enhancement leaves the static document usable. */ });
