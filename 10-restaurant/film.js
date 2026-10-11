import { filterMenu } from './menu-data.js';
import { filmLayout, chapterNames, courseNames } from './film-layout.js';
import { createEmbers } from './embers.js';

const $ = (selector, root=document)=>root.querySelector(selector);
const $$ = (selector, root=document)=>[...root.querySelectorAll(selector)];
let controller=null,updateCourse=()=>{},galleryIndex=0;

// All plates are inline and permanently connected. Filters dim their HTML card wrapper.
export function initTastingMenu(){
  const tabs=$$('.menu-tabs [role="tab"]'),courses=$$('.tasting-course'),inputs=$$('.diet-filters input');
  let active=0;
  function filters(){
    const selected=inputs.filter(input=>input.checked).map(input=>input.value);
    $$('.dish-card').forEach(card=>{
      const matching=selected.every(tag=>card.dataset.tags.split(' ').includes(tag));
      card.classList.toggle('is-dimmed',!matching);
    });
    const matches=filterMenu(courseNames[active],selected).length;
    $('.menu-status').textContent=`${courseNames[active]}: ${matches} matching ${matches===1?'dish':'dishes'}. Other dishes stay on the table, dimmed.`;
  }
  updateCourse=index=>{
    active=index;
    tabs.forEach((tab,i)=>{tab.setAttribute('aria-selected',String(i===index));tab.tabIndex=i===index?0:-1;});
    courses.forEach((course,i)=>{
      if(controller){course.setAttribute('aria-hidden',String(i!==index));course.inert=i!==index;}
      else{course.removeAttribute('aria-hidden');course.inert=false;}
    });
    filters();
  };
  function navigate(index){
    if(controller)controller.course(index);
    else{updateCourse(index);courses[index].scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});}
  }
  tabs.forEach((tab,index)=>{
    tab.addEventListener('click',()=>navigate(index));
    tab.addEventListener('keydown',event=>{
      let next;
      if(event.key==='ArrowRight')next=(index+1)%4;
      if(event.key==='ArrowLeft')next=(index+3)%4;
      if(event.key==='Home')next=0;
      if(event.key==='End')next=3;
      if(next!==undefined){event.preventDefault();tabs[next].focus();navigate(next);}
    });
  });
  inputs.forEach(input=>input.addEventListener('change',filters));updateCourse(0);
  // Gallery controls become film navigation; the fallback keeps ordinary horizontal scrolling.
  const strip=$('.gallery-strip');
  function gallery(direction){
    if(controller){galleryIndex=Math.max(0,Math.min(3,galleryIndex+direction));controller.gallery(galleryIndex);}
    else strip.scrollBy({left:strip.clientWidth*.65*direction,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  }
  $('#gallery-prev').addEventListener('click',()=>gallery(-1));
  $('#gallery-next').addEventListener('click',()=>gallery(1));
  strip.addEventListener('keydown',event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();gallery(event.key==='ArrowRight'?1:-1);}});
  let dragging=false,start=0,left=0;
  strip.addEventListener('pointerdown',event=>{if(controller||event.pointerType==='touch'||event.button!==0)return;dragging=true;start=event.clientX;left=strip.scrollLeft;strip.setPointerCapture(event.pointerId);});
  strip.addEventListener('pointermove',event=>{if(dragging)strip.scrollLeft=left-(event.clientX-start);});
  const stop=()=>{dragging=false;};strip.addEventListener('pointerup',stop);strip.addEventListener('pointercancel',stop);
}

function fitSigns(){
  $$('.scene-art').forEach(art=>{
    const sign=$('.facade-sign',art);if(!sign)return;
    const scale=Math.max(art.clientWidth/1600,art.clientHeight/1000);
    const fit=innerWidth<=760?Math.min(1,(art.clientWidth-48)/(634*scale)):1;
    sign.style.transform=`scale(${fit})`;
  });
}

export async function initFilm(){
  fitSigns();addEventListener('resize',fitSigns,{passive:true});
  // Forms and static chapters already work before either optional CDN import begins.
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  let gsap,ScrollTrigger;
  try{
    const modules=await Promise.all([
      import('https://cdn.jsdelivr.net/npm/gsap@3.12.5/+esm'),
      import('https://cdn.jsdelivr.net/npm/gsap@3.12.5/ScrollTrigger.js/+esm')
    ]);
    gsap=modules[0].gsap||modules[0].default?.gsap||modules[0].default;
    ScrollTrigger=modules[1].ScrollTrigger||modules[1].default;
    gsap.registerPlugin(ScrollTrigger);
  }catch{return;}
  const media=gsap.matchMedia();
  media.add({mobile:'(max-width: 760px)',desktop:'(min-width: 761px)',motion:'(prefers-reduced-motion: no-preference)'},context=>{
    if(!context.conditions.motion)return;
    const mobile=context.conditions.mobile,layout=filmLayout(mobile);
    const scenes=$$('.film-scene'),courses=$$('.tasting-course'),stage=$('#film-stage');
    const links=$$('[data-film-chapter]'),progress=$('.film-progress>span');
    const arrival=$('.arrival-facade'),doorFacade=$('.doorway-facade');
    const strip=$('.gallery-strip'),galleryWindow=$('.gallery-window');
    let particles=null,trigger=null,timeline=null,chapter=-1,course=-1;
    const disposers=[];
    function cleanup(){
      controller=null;particles?.destroy();trigger?.kill(true);timeline?.kill();
      document.body.classList.remove('film-ready');stage.classList.remove('is-paper');
      scenes.forEach(scene=>{scene.removeAttribute('aria-hidden');scene.inert=false;scene.classList.remove('is-current');});
      courses.forEach(panel=>{panel.removeAttribute('aria-hidden');panel.inert=false;});
      links.forEach(link=>link.removeAttribute('aria-current'));
      disposers.forEach(dispose=>dispose());updateCourse(0);fitSigns();
    }
    try{
      document.body.classList.add('film-ready');fitSigns();
      gsap.set(scenes,{autoAlpha:0});gsap.set(scenes[0],{autoAlpha:1});
      gsap.set(courses,{autoAlpha:0});
      gsap.set('.headline-line',{y:40,opacity:.35});
      gsap.set('.arrival-subtitle',{y:18,opacity:0});
      particles=createEmbers($('#embers'),mobile);
      const setProgress=gsap.quickSetter(progress,'scaleX');
      timeline=gsap.timeline({paused:true,defaults:{ease:'power2.inOut'}});
      // Crossfades overlap in the same pinned frame, so there is no cut between chapters.
      for(let i=1;i<scenes.length;i++){
        const cross=Math.min(layout.lengths[i-1],layout.lengths[i])*.22;
        const at=layout.starts[i]-cross*.5;
        timeline.to(scenes[i-1],{autoAlpha:0,duration:cross},at);
        timeline.fromTo(scenes[i],{autoAlpha:0},{autoAlpha:1,duration:cross,immediateRender:false},at);
      }
      const a=layout.lengths[0];
      const lights=$$('.scene-lamp-glow',arrival);
      gsap.set(lights,{opacity:.04});
      gsap.set($('.street-awning',arrival),{scaleY:.04,svgOrigin:'800 267'});
      timeline.fromTo(lights,{opacity:.04},{opacity:1,duration:a*.15,stagger:a*.12,immediateRender:false},.02);
      lights.forEach((light,index)=>{
        const at=.02+index*a*.12;
        timeline.to(light,{opacity:.35,duration:a*.02},at+a*.15);
        timeline.to(light,{opacity:1,duration:a*.04},at+a*.17);
      });
      timeline.fromTo($('.street-awning',arrival),{scaleY:.04,svgOrigin:'800 267'},{scaleY:1,duration:a*.35,immediateRender:false},a*.08);
      timeline.fromTo('.headline-line',{y:40,opacity:.35},{y:0,opacity:1,duration:a*.25,stagger:a*.13,immediateRender:false},a*.06);
      timeline.fromTo('.arrival-subtitle',{y:18,opacity:0},{y:0,opacity:1,duration:a*.22,immediateRender:false},a*.47);
      timeline.to('.dusk-veil',{opacity:.48,duration:a*.5},a*.08);
      timeline.fromTo('.vent-steam span',{y:25,opacity:0},{y:-65,opacity:.5,duration:a*.75,stagger:a*.05,immediateRender:false},a*.04);
      const d=layout.starts[1],dl=layout.lengths[1];
      timeline.fromTo(doorFacade,{scale:1,opacity:1},{scale:1.18,opacity:0,duration:dl*.65,immediateRender:false},d-dl*.08);
      timeline.fromTo('.doorway-interior',{scale:.94},{scale:1.08,duration:dl*.8,immediateRender:false},d);
      timeline.fromTo('.board-depth',{x:0,opacity:1},{x:mobile?0:300,opacity:0,duration:dl*.38,immediateRender:false},d+dl*.03);
      timeline.fromTo('.door-perspective',{opacity:0},{opacity:1,duration:dl*.18,immediateRender:false},d+dl*.06);
      timeline.fromTo('.door-panel-left',{rotationY:0},{rotationY:-106,duration:dl*.48,immediateRender:false},d+dl*.2);
      timeline.fromTo('.door-panel-right',{rotationY:0},{rotationY:106,duration:dl*.48,immediateRender:false},d+dl*.2);
      timeline.fromTo('.threshold-light',{opacity:0,scale:.65},{opacity:.9,scale:1.25,duration:dl*.55,immediateRender:false},d+dl*.19);
      timeline.to('.door-frame',{scale:mobile?1.06:1.15,duration:dl*.75},d+dl*.12);
      timeline.to('.door-perspective',{opacity:0,duration:dl*.25},d+dl*.69);
      timeline.fromTo('.threshold-copy',{y:22,opacity:0},{y:0,opacity:1,duration:dl*.2,immediateRender:false},d+dl*.23);
      const r=layout.starts[2],rl=layout.lengths[2];
      timeline.fromTo('.dining-room',{scale:1},{scale:1.12,duration:rl,ease:'none',immediateRender:false},r);
      // SVG tables already have authored translations: add depth motion to those positions.
      timeline.to($$('.room-depth-front',$('.dining-room')),{y:mobile?'+=30':'+=105',scale:mobile?'+=.05':'+=.18',duration:rl,ease:'none'},r);
      timeline.to($$('.room-depth-middle',$('.dining-room')),{y:mobile?'+=15':'+=40',duration:rl,ease:'none'},r);
      timeline.fromTo('.gold-letter',{y:48,rotationX:-45,opacity:0},{y:0,rotationX:0,opacity:1,duration:rl*.28,stagger:rl*.027,immediateRender:false},r+rl*.08);
      timeline.fromTo('.gold-amp',{scale:.7,opacity:0},{scale:1,opacity:1,duration:rl*.28,immediateRender:false},r+rl*.35);
      const k=layout.starts[3],kl=layout.lengths[3];
      timeline.fromTo('.kitchen-art',{scale:1.08,x:mobile?0:30},{scale:1,x:0,duration:kl,immediateRender:false},k);
      timeline.fromTo('.kitchen-copy',{y:40,opacity:0},{y:0,opacity:1,duration:kl*.35,immediateRender:false},k+kl*.1);
      timeline.fromTo('.kitchen-plate',{y:60,rotation:-25,opacity:0},{y:0,rotation:-12,opacity:1,duration:kl*.45,immediateRender:false},k+kl*.17);
      const m=layout.starts[4],ml=layout.courseLength;
      courses.forEach((panel,index)=>{
        const start=m+index*ml;
        const cards=$$('.dish-card',panel),titles=$$('.dish-card-body',panel);
        timeline.fromTo(cards,{y:mobile?35:100,rotation:index%2?-9:9},{y:0,rotation:0,duration:ml*.3,stagger:ml*.075,immediateRender:false},start+ml*.05);
        timeline.fromTo(titles,{y:8,opacity:0},{y:0,opacity:1,duration:ml*.17,stagger:ml*.075,immediateRender:false},start+ml*.17);
      });
      const g=layout.starts[5],gl=layout.lengths[5];
      const galleryDistance=()=>Math.max(0,strip.scrollWidth-galleryWindow.clientWidth);
      timeline.fromTo(strip,{x:0},{x:()=>-galleryDistance(),duration:gl*.78,ease:'none',immediateRender:false},g+gl*.12);
      const e=layout.starts[6],el=layout.lengths[6];
      timeline.fromTo('.nightfall',{opacity:.08},{opacity:1,duration:el*.65,immediateRender:false},e);
      timeline.fromTo('.evening-copy',{y:24,opacity:0},{y:0,opacity:1,duration:el*.3,immediateRender:false},e+el*.08);
      timeline.fromTo('.hours-card',{y:55,rotation:-6,opacity:0},{y:0,rotation:2,opacity:1,duration:el*.38,immediateRender:false},e+el*.21);
      // A sentinel preserves the full final hold even when the last visual tween ends early.
      timeline.to({hold:0},{hold:1,duration:layout.total,ease:'none'},0);
      layout.rests.forEach((time,i)=>timeline.addLabel(`chapter-${i}`,time));
      layout.courseRests.forEach((time,i)=>timeline.addLabel(`course-${i}`,time));
      function sync(){
        const time=timeline.time();
        let current=0;for(let i=1;i<layout.starts.length;i++)if(time>=layout.starts[i])current=i;
        if(current!==chapter){
          chapter=current;
          scenes.forEach((scene,i)=>{scene.classList.toggle('is-current',i===current);scene.setAttribute('aria-hidden',String(i!==current));scene.inert=i!==current;});
          links.forEach((link,i)=>{if(i===current)link.setAttribute('aria-current','step');else link.removeAttribute('aria-current');});
          $('.chapter-current').textContent=`0${current+1} / ${chapterNames[current]}`;
          stage.classList.toggle('is-paper',current===4);particles.setActive(current===3);
        }
        // Course panels are driven straight from timeline time (not tweens): each fades in over
        // the first 12% of its section and out over the last 12%, so a jump never leaves the
        // tasting table empty.
        courses.forEach((panel,i)=>{
          const local=(time-(m+i*ml))/ml;
          const fadeIn=local<0?0:Math.min(1,local/.12);
          const fadeOut=i<3?Math.min(1,Math.max(0,(1-local)/.12)):1;
          const alpha=Math.min(fadeIn,fadeOut);
          panel.style.opacity=alpha;panel.style.visibility=alpha>.01?'visible':'hidden';
          panel.style.transform=`translateY(${((1-alpha)*(local<.5?15:-25)).toFixed(1)}px)`;
        });
        const next=Math.max(0,Math.min(3,Math.floor((time-m)/ml)));
        if(next!==course){course=next;updateCourse(next);}
        galleryIndex=Math.max(0,Math.min(3,Math.round((time-g)/gl*3)));
        setProgress(time/layout.total);
      }
      timeline.eventCallback('onUpdate',sync);
      const nearest=gsap.utils.snap(layout.snapPoints);
      trigger=ScrollTrigger.create({
        trigger:'#film',pin:stage,start:'top top',end:()=>`+=${layout.total*innerHeight}`,
        animation:timeline,scrub:1.35,anticipatePin:1,invalidateOnRefresh:true,
        snap:{snapTo:value=>{
          if(document.activeElement?.matches('input,button,[role="tab"]')||$('#order-dialog').open)return value;
          return nearest(value);
        },delay:1.45,duration:{min:.5,max:1.2},ease:'power1.inOut',inertia:false},
        onRefresh:fitSigns,
        onLeave:()=>particles.setActive(false),onEnterBack:()=>particles.setActive(chapter===3)
      });
      function go(time){scrollTo({top:trigger.start+(trigger.end-trigger.start)*time/layout.total,behavior:'smooth'});}
      controller={course:index=>go(layout.courseRests[index]),gallery:index=>go(g+gl*(.12+index/3*.77)),chapter:index=>go(layout.rests[index])};
      updateCourse(Math.max(0,course));
      $$('a[href^="#"]').forEach(link=>{
        const index=scenes.findIndex(scene=>`#${scene.id}`===link.getAttribute('href'));
        if(index<0)return;
        const click=event=>{event.preventDefault();controller?.chapter(index);};
        link.addEventListener('click',click);disposers.push(()=>link.removeEventListener('click',click));
      });
      // The booking form is intentionally in normal document flow, including on small phones.
      gsap.fromTo('.booking-layout',{y:55,opacity:.45},{y:0,opacity:1,ease:'power2.out',scrollTrigger:{trigger:'#book',start:'top 85%',end:'top 25%',scrub:1}});
      sync();ScrollTrigger.refresh();
      const fontsReady=()=>ScrollTrigger.refresh();document.fonts?.ready.then(fontsReady);
      return cleanup;
    }catch{
      cleanup();context.revert();return;
    }
  });
}
