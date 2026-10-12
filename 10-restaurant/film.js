import {dishArt,breadArt,teapotArt,waterGlassArt,oilBowlArt} from './illustrations.js';
import {clamp,coursePose,activeCourse,tablePlates,tableUnit} from './film-layout.js';

function surface(w,h=w){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
function seeded(seed){let s=seed;return()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};}
function oval(ctx,x,y,rx,ry,fill){ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();}
function gradient(ctx,x,y,r,center,edge){const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,center);g.addColorStop(1,edge);return g;}

// Baked walnut: varied horizontal boards, offset joins, flowing grain and knots.
function tableTexture(){
  const c=surface(1100,1200),ctx=c.getContext('2d');if(!ctx)return c;
  const rng=seeded(481),tones=['#39271c','#302218','#3d2a1d','#322219','#3b291d','#2f2017'];
  ctx.fillStyle='#211710';ctx.fillRect(0,0,1100,1200);
  for(let board=0;board<6;board++){
    const y=board*200,knotX=150+rng()*800,knotY=y+55+rng()*90;
    const base=ctx.createLinearGradient(0,y,0,y+200);
    base.addColorStop(0,'#211710');base.addColorStop(.06,tones[board]);base.addColorStop(.8,tones[board]);base.addColorStop(1,'#261a12');
    ctx.fillStyle=base;ctx.fillRect(0,y,1100,198);
    ctx.save();ctx.beginPath();ctx.rect(0,y+2,1100,194);ctx.clip();
    for(let i=0;i<100;i++){
      const gy=y+rng()*200,shift=rng()*30,amplitude=6+rng()*24;
      ctx.strokeStyle=i%4?'#c38b5710':'#08050433';ctx.lineWidth=.5+rng()*1.2;
      ctx.beginPath();
      for(let x=-20;x<1140;x+=24){const bend=Math.exp(-Math.pow((x-knotX)/160,2))*amplitude*Math.sign(gy-knotY);const py=gy+Math.sin(x*.008+shift)*2.5+bend;x===-20?ctx.moveTo(x,py):ctx.lineTo(x,py);}
      ctx.stroke();
    }
    for(let i=0;i<8;i++){ctx.strokeStyle=i%2?'#b9855110':'#150d0750';ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(knotX,knotY,12+i*8,2+i*2.3,.03,0,Math.PI*2);ctx.stroke();}
    const join=board%2?755:360;
    ctx.fillStyle='#080603a0';ctx.fillRect(join,y,2,200);ctx.fillStyle='#a9774930';ctx.fillRect(join+2,y,1,200);
    ctx.restore();ctx.fillStyle='#090604a0';ctx.fillRect(0,y+198,1100,2);ctx.fillStyle='#bd885429';ctx.fillRect(0,y+195,1100,1);
  }
  for(let i=0;i<11000;i++){ctx.fillStyle=i%2?'#e0aa7010':'#00000016';ctx.fillRect(rng()*1100,rng()*1200,.5+rng()*2,.5+rng()*1.2);}
  const shade=ctx.createLinearGradient(0,0,1100,1100);shade.addColorStop(0,'#08040365');shade.addColorStop(.4,'#00000000');shade.addColorStop(1,'#0804036b');ctx.fillStyle=shade;ctx.fillRect(0,0,1100,1200);
  return c;
}

// A soft, folded linen asset with a rolled edge, diagonal flap and woven threads.
function linenTexture(){
  const c=surface(400,650),ctx=c.getContext('2d');if(!ctx)return c;
  ctx.save();ctx.translate(200,325);ctx.rotate(-.12);
  ctx.shadowColor='#0009';ctx.shadowBlur=24;ctx.shadowOffsetX=9;ctx.shadowOffsetY=16;
  ctx.beginPath();ctx.moveTo(-115,-251);ctx.quadraticCurveTo(-9,-270,112,-244);ctx.lineTo(112,247);ctx.quadraticCurveTo(10,264,-119,243);ctx.closePath();
  const linen=ctx.createLinearGradient(-120,0,115,0);linen.addColorStop(0,'#605a4a');linen.addColorStop(.17,'#9f9580');linen.addColorStop(.4,'#b0a48b');linen.addColorStop(.49,'#857b65');linen.addColorStop(.55,'#b6a991');linen.addColorStop(.8,'#9b8f75');linen.addColorStop(1,'#655b49');ctx.fillStyle=linen;ctx.fill();ctx.shadowBlur=0;ctx.shadowOffsetX=0;ctx.shadowOffsetY=0;
  ctx.save();ctx.clip();
  for(let x=-120;x<125;x+=2){ctx.strokeStyle=x%4?'#fff2cc12':'#201c1438';ctx.lineWidth=.6;ctx.beginPath();ctx.moveTo(x,-265);ctx.lineTo(x+Math.sin(x)*3,267);ctx.stroke();}
  for(let y=-266;y<269;y+=2.5){ctx.strokeStyle='#eaddbe20';ctx.lineWidth=.5;ctx.beginPath();ctx.moveTo(-125,y);ctx.lineTo(125,y+Math.sin(y*.1)*2);ctx.stroke();}
  for(let i=0;i<9;i++){const y=-210+i*55;ctx.strokeStyle='#33291c25';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(-120,y);ctx.bezierCurveTo(-80,y-15,60,y+20,120,y-8);ctx.stroke();ctx.strokeStyle='#eadcc03b';ctx.lineWidth=1.5;ctx.stroke();}
  ctx.restore();
  ctx.beginPath();ctx.moveTo(-114,-249);ctx.lineTo(111,-245);ctx.lineTo(21,-99);ctx.quadraticCurveTo(-53,-138,-114,-249);ctx.closePath();
  const fold=ctx.createLinearGradient(0,-255,0,-105);fold.addColorStop(0,'#aaa088');fold.addColorStop(.8,'#b3a78f');fold.addColorStop(1,'#6f655340');ctx.fillStyle=fold;ctx.fill();
  ctx.strokeStyle='#e9dec047';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-108,-243);ctx.lineTo(20,-105);ctx.lineTo(106,-240);ctx.stroke();ctx.restore();return c;
}
function cutleryTexture(){
  const c=surface(180,600),ctx=c.getContext('2d');if(!ctx)return c;
  const metal=ctx.createLinearGradient(0,0,180,0);metal.addColorStop(0,'#514032');metal.addColorStop(.28,'#c1b296');metal.addColorStop(.32,'#f1ddba');metal.addColorStop(.42,'#736251');metal.addColorStop(.75,'#d9c5a0');metal.addColorStop(1,'#685444');
  ctx.fillStyle=metal;ctx.shadowColor='#0009';ctx.shadowBlur=8;ctx.shadowOffsetX=5;ctx.shadowOffsetY=7;
  ctx.beginPath();ctx.moveTo(34,103);ctx.quadraticCurveTo(19,123,30,160);ctx.lineTo(39,199);ctx.lineTo(32,520);ctx.quadraticCurveTo(35,539,45,530);ctx.lineTo(48,199);ctx.lineTo(59,158);ctx.quadraticCurveTo(67,129,56,105);ctx.lineTo(55,157);ctx.lineTo(51,157);ctx.lineTo(49,104);ctx.lineTo(44,104);ctx.lineTo(44,158);ctx.lineTo(39,157);ctx.lineTo(39,103);ctx.closePath();ctx.fill();
  ctx.beginPath();ctx.moveTo(114,92);ctx.bezierCurveTo(87,127,93,239,118,243);ctx.lineTo(111,522);ctx.quadraticCurveTo(117,540,126,526);ctx.lineTo(129,94);ctx.quadraticCurveTo(124,81,114,92);ctx.fill();
  ctx.shadowBlur=0;ctx.strokeStyle='#f4e0b780';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(39,219);ctx.lineTo(38,514);ctx.moveTo(122,115);ctx.lineTo(119,515);ctx.stroke();return c;
}
function scatterTexture(){
  const c=surface(1100,1200),ctx=c.getContext('2d');if(!ctx)return c;const rng=seeded(624);
  // Clusters sit between dishes, not uniformly sprinkled across the whole image.
  const clusters=[[200,540],[730,180],[865,810],[500,1100]];
  for(const [cx,cy] of clusters){
    for(let i=0;i<18;i++){const x=cx+(rng()-.5)*105,y=cy+(rng()-.5)*105;oval(ctx,x+2,y+3,2.6,2,'#0007');oval(ctx,x,y,1+rng()*2.5,1+rng()*2,['#b08b57','#80613d','#ccb484'][i%3]);}
    for(let i=0;i<4;i++){const x=cx+(rng()-.5)*95,y=cy+(rng()-.5)*80;oval(ctx,x+2,y+2,4,5,'#0008');oval(ctx,x,y,3.2,4.5,gradient(ctx,x-1,y-2,6,'#e59b85','#791e27'));}
    for(let i=0;i<5;i++){ctx.save();ctx.translate(cx+(rng()-.5)*115,cy+(rng()-.5)*100);ctx.rotate(rng()*6);ctx.fillStyle='#526140';ctx.beginPath();ctx.moveTo(0,10);ctx.quadraticCurveTo(-14,-2,0,-15);ctx.quadraticCurveTo(11,-2,0,10);ctx.fill();ctx.strokeStyle='#a4ab703f';ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(0,8);ctx.lineTo(0,-12);ctx.stroke();ctx.restore();}
  }return c;
}
function lightTexture(){const c=surface(512),ctx=c.getContext('2d');if(ctx){const g=ctx.createRadialGradient(256,256,0,256,256,256);g.addColorStop(0,'#ffd28875');g.addColorStop(.12,'#fdb34c3d');g.addColorStop(.45,'#dd812522');g.addColorStop(1,'#de8d2900');ctx.fillStyle=g;ctx.fillRect(0,0,512,512);}return c;}
function candleTexture(){
  const c=surface(200),ctx=c.getContext('2d');if(!ctx)return c;
  oval(ctx,107,113,67,63,gradient(ctx,107,113,68,'#0009','#0000'));
  oval(ctx,101,104,43,43,gradient(ctx,87,88,65,'#ebd4a6','#6f583b'));
  // Hand-poured wax lip is irregular; the translucent melt pool is offset.
  ctx.beginPath();for(let i=0;i<=80;i++){const a=i/80*Math.PI*2,r=40+Math.sin(a*7)*1.8+Math.cos(a*11);const x=100+Math.cos(a)*r,y=99+Math.sin(a)*r;i?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.fillStyle=gradient(ctx,86,84,61,'#fff0c8','#aa9064');ctx.fill();
  oval(ctx,98,97,27,25,gradient(ctx,94,92,34,'#dab779','#ab864f'));
  ctx.strokeStyle='#fff3ce91';ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(98,97,27,25,0,-2.8,-.2);ctx.stroke();
  oval(ctx,100,102,3,5,'#322219');
  oval(ctx,100,92,35,37,gradient(ctx,100,92,38,'#ffd97686','#ffb64c00'));
  ctx.beginPath();ctx.moveTo(101,105);ctx.bezierCurveTo(87,99,97,83,107,76);ctx.bezierCurveTo(104,88,114,100,101,105);ctx.fillStyle='#ffd067';ctx.fill();
  ctx.beginPath();ctx.moveTo(101,102);ctx.quadraticCurveTo(96,94,103,87);ctx.quadraticCurveTo(109,99,101,102);ctx.fillStyle='#fff8dc';ctx.fill();return c;
}
function steamTexture(){const c=surface(100,180),ctx=c.getContext('2d');if(ctx){ctx.strokeStyle='#ecdac134';ctx.lineWidth=5;ctx.lineCap='round';ctx.shadowBlur=12;ctx.shadowColor='#ead5b8';for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(23+i*25,165);ctx.bezierCurveTo(70+i*10,115,-10+i*30,72,42+i*20,8);ctx.stroke();}}return c;}

export function initTable(reduced){
  const section=document.querySelector('#table'),stage=section.querySelector('.table-stage');
  const copy=section.querySelector('.course-copy');
  const canvas=document.querySelector('#table-canvas'),ctx=canvas.getContext('2d');if(!ctx)return null;
  const texture=tableTexture(),linen=linenTexture(),cutlery=cutleryTexture(),scatter=scatterTexture();
  const light=lightTexture(),candle=candleTexture(),steam=steamTexture();
  const sets=[['hummus','labneh','carrots'],['aubergine','chicken','salad'],['cake','baklava','icecream'],['citrus','tea','coffee']];
  const art=sets.map(ids=>ids.map(dishArt)),bread=breadArt(),pot=teapotArt(),water=waterGlassArt(),oil=oilBowlArt();
  const panels=[...document.querySelectorAll('.course-panel')],controls=[...document.querySelectorAll('.course-controls button')],progress=document.querySelector('.course-progress span');
  const pose={enter:0,leave:0,alpha:0};
  let visible=false,width=1,height=1,dpr=Math.min(devicePixelRatio||1,1.5),course=-1,lastTime=-2,lastDraw=0,top=0,range=1,slow=0,previous=0,panelHidden=false;
  function measure(){const b=canvas.getBoundingClientRect();width=b.width;height=b.height;canvas.width=Math.max(1,Math.round(width*dpr));canvas.height=Math.max(1,Math.round(height*dpr));top=section.getBoundingClientRect().top+scrollY;range=Math.max(1,section.offsetHeight-stage.offsetHeight);lastTime=-2;}
  const ro=new ResizeObserver(measure);ro.observe(canvas);measure();
  const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;previous=0;lastTime=-2;},{rootMargin:'100px'});observer.observe(canvas);
  document.fonts?.ready.then(measure);window.addEventListener('resize',measure,{passive:true});
  function markCourse(index){if(index===course)return;course=index;for(let i=0;i<4;i++){panels[i].classList.toggle('active',i===index);panels[i].inert=!reduced.matches&&i!==index;controls[i].classList.toggle('active',i===index);if(i===index)controls[i].setAttribute('aria-current','step');else controls[i].removeAttribute('aria-current');}canvas.setAttribute('aria-label',`Overhead candle-lit table: ${sets[index].join(', ')}. Detailed procedural food illustrations.`);}
  for(let i=0;i<4;i++)controls[i].addEventListener('click',()=>{measure();window.scrollTo({top:top+range*((i+.5)/4),behavior:reduced.matches?'instant':'smooth'});});
  function image(asset,x,y,size,angle=0,alpha=1){ctx.save();ctx.globalAlpha=alpha;ctx.translate(x,y);ctx.rotate(angle);ctx.drawImage(asset,-size/2,-size/2,size,size);ctx.restore();}
  function lightPool(x,y,size,alpha){ctx.globalAlpha=alpha;ctx.drawImage(light,x-size/2,y-size/2,size,size);ctx.globalAlpha=1;}
  function render(ms){
    // Update even when the canvas is off-screen: arbitrary jumps cannot leave stale UI.
    const exited=!reduced.matches&&scrollY>=top+range;
    if(exited!==panelHidden){panelHidden=exited;stage.classList.toggle('is-exited',exited);copy.inert=exited;copy.setAttribute('aria-hidden',String(exited));}
    if(!visible||document.hidden)return;
    // Negative time serves the first course as the stage scrolls into view.
    const time=reduced.matches ? .5 : clamp((scrollY-top)/range,-.15,1)*4;
    if(reduced.matches&&time===lastTime)return;
    if(previous&&ms-previous>20)slow++;else slow=Math.max(0,slow-1);previous=ms;
    if(slow>90&&dpr>1){dpr=1;slow=0;measure();}
    // A changed scroll position paints immediately, even between RAF frame budgets.
    if(time===lastTime&&ms-lastDraw<16)return;lastDraw=ms;lastTime=time;
    const index=activeCourse(time);markCourse(index);progress.style.transform=`scaleX(${clamp(time/4)})`;
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);ctx.drawImage(texture,0,0,width,height);
    const unit=tableUnit(width,height),flicker=reduced.matches?1:1+Math.sin(ms*.0031)*.05+Math.sin(ms*.017)*.022;
    lightPool(width*.87,height*.13,unit*1.6,.8*flicker);lightPool(width*.12,height*.56,unit*1.35,.65*flicker);
    ctx.drawImage(linen,width*.01,height*.47,unit*.26,unit*.46);
    ctx.save();ctx.translate(width*.89,height*.73);ctx.rotate(.13);ctx.drawImage(cutlery,-unit*.07,-unit*.3,unit*.16,unit*.52);ctx.restore();
    image(water,width*.14,height*.12,unit*.27,-.08);
    image(oil,width*.86,height*.58,unit*.27,.1);
    if(index<3)image(bread,width*.79,height*.85,unit*.43,.18);
    ctx.drawImage(scatter,0,0,width,height);
    // Shared absolute poses: tests assert actual draw calls, not just active labels.
    for(let set=0;set<4;set++)for(let i=0;i<3;i++){
      coursePose(time,set,i,pose);if(pose.alpha<.001)continue;
      const p=tablePlates[i],x=width*p.x+p.dx*unit*(1-pose.enter)*1.05+pose.leave*unit*.35;
      const y=height*p.y+p.dy*height*(1-pose.enter)*.9+pose.leave*height*.12;
      image(art[set][i],x,y,unit*p.size,p.angle+(1-pose.enter)*.18,pose.alpha);
      if(dpr>1&&set===index&&(set===0&&i===0||set===1&&i===1||set===3&&i>0)){
        const rise=reduced.matches?0:(ms*.00012+i*.31)%1;ctx.globalAlpha=pose.alpha*(1-rise)*.42;ctx.drawImage(steam,x-unit*.07,y-unit*.09-rise*unit*.12,unit*.16,unit*.3);ctx.globalAlpha=1;
      }
    }
    if(time>=2.71){coursePose(time,3,2,pose);image(pot,width*.78+unit*(1-pose.enter),height*.83,unit*.44,.1,pose.enter);}
    // A light veil shades food as well as wood; candle assets remain luminous on top.
    ctx.globalCompositeOperation='screen';lightPool(width*.87,height*.13,unit*1.4,.12*flicker);lightPool(width*.12,height*.56,unit*1.2,.09*flicker);ctx.globalCompositeOperation='source-over';
    image(candle,width*.87,height*.13,unit*.22,0,flicker*.9);image(candle,width*.12,height*.56,unit*.17,.2,.94);
  }
  reduced.addEventListener('change',()=>{lastTime=-2;course=-1;measure();for(const panel of panels)panel.inert=false;});
  return {render};
}
