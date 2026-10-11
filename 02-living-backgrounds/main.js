import { prefersReducedMotion } from '../shared/base.js';

const sections = [...document.querySelectorAll('.scene')];
const links = [...document.querySelectorAll('.switcher a')];
const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
let reduced = prefersReducedMotion();
const pointer = { x: .7, y: .5, active: 0 };
let active = -1, frame = 0, last = 0, time = 0;

// Full-screen procedural fields: a single triangle pair, no textures or dependencies.
const vertex = `attribute vec2 position; varying vec2 uv; void main(){uv=position*.5+.5;gl_Position=vec4(position,0.,1.);}`;
const common = `precision mediump float; varying vec2 uv; uniform vec2 resolution; uniform vec2 pointer; uniform float time; uniform float influence;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}`;
const ribbons = common + `void main(){vec2 p=uv;float aspect=resolution.x/resolution.y;vec2 d=p-pointer;d.x*=aspect;float force=exp(-dot(d,d)*12.)*influence;p.y+=d.y*force*.32;p.x+=d.x*force*.12;vec3 col=vec3(.007,.011,.007);float field=0.;float glow=0.;for(int i=0;i<30;i++){float n=float(i);float x=p.x;float center=.48+.22*sin(x*6.3+time*.24+n*.037)+.09*cos(x*10.-time*.17+n*.10);center+=(n-15.)*.005*(.4+pow(sin(x*3.14),2.)*2.);float dist=abs(p.y-center);float shine=.45+.55*sin(x*8.+n*.3+time*.4)*sin(x*8.+n*.3+time*.4);field+=.0010/(dist+.0017)*shine;glow+=exp(-dist*22.)*.014;}col+=vec3(.58,.86,.12)*field*.19+vec3(.35,.52,.13)*glow;col+=vec3(.12,.16,.035)*exp(-abs(p.y-.5)*5.);col*=.7+.3*noise(p*320.);gl_FragColor=vec4(col,1.);}`;
const gradient = common + `float fbm(vec2 p){float v=0.;float a=.5;for(int i=0;i<5;i++){v+=a*noise(p);p=p*2.03+4.7;a*=.5;}return v;}
void main(){vec2 p=(uv-.5)*vec2(resolution.x/resolution.y,1.);vec2 m=(pointer-.5)*vec2(resolution.x/resolution.y,1.);vec2 d=p-m;p+=d*exp(-dot(d,d)*4.)*influence*.28;float t=time*.13;float n=fbm(p*2.3+vec2(t,-t*.6));float n2=fbm(p*3.+n*2.+vec2(-t,t*.4));float body=length(p-vec2(.26,.02))+.20*sin(p.x*4.+n*5.+t);float wave=sin(n2*7.+p.x*2.+t);vec3 purple=vec3(.22,.08,.43);vec3 red=vec3(.95,.08,.12);vec3 orange=vec3(1.,.46,.16);vec3 c=mix(purple,red,smoothstep(-.7,.5,wave));c=mix(c,orange,smoothstep(.35,1.,n+p.y*.3));float light=.55+.55*n2;c*=light;c+=vec3(.3,.14,.26)*pow(max(0.,1.-abs(body-.58)*3.),3.);c=mix(c,vec3(.055,.026,.09),smoothstep(.8,1.7,body));c+=influence*.06*vec3(pointer.x,0.,pointer.y);c+=(hash(uv*resolution)-.5)*.035;gl_FragColor=vec4(c,1.);}`;

function shaderScene(canvas, source) {
  const gl = canvas.getContext('webgl', { alpha: false, antialias: false, powerPreference: 'low-power' });
  if (!gl) return canvasScene(canvas, true);
  function compile(type, code) { const s=gl.createShader(type); gl.shaderSource(s,code);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)) throw Error(gl.getShaderInfoLog(s));return s; }
  const program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,vertex));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,source));gl.linkProgram(program);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
  const pos=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);
  const uniforms=Object.fromEntries(['resolution','pointer','time','influence'].map(k=>[k,gl.getUniformLocation(program,k)]));
  return {resize(w,h){canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h);},draw(t){gl.uniform2f(uniforms.resolution,canvas.width,canvas.height);gl.uniform2f(uniforms.pointer,pointer.x,1-pointer.y);gl.uniform1f(uniforms.time,t);gl.uniform1f(uniforms.influence,reduced?0:pointer.active);gl.drawArrays(gl.TRIANGLES,0,6);}};
}

// Particle positions spring back to their rotating homes after pointer repulsion.
function canvasScene(canvas, nebula = false) {
  const ctx=canvas.getContext('2d');
  if (!ctx) return { resize() {}, draw() {} };
  let w=1,h=1;let ink=[];
  // Tight angular scatter preserves three arms; a separate dense bulge fills the core.
  const stars=nebula ? Array.from({length:6800},(_,i)=>{
    const core=i<2300;
    const r=core ? Math.pow(Math.random(),1.8)*.28 : .12+Math.pow(Math.random(),.8)*.88;
    const a=core ? Math.random()*Math.PI*2 : (i%3)*Math.PI*2/3+r*5.5+(Math.random()-.5)*(.18+.3*r);
    return {r,a,z:(Math.random()-.5)*(core?.10:.035),dx:0,dy:0,
      size:.65+Math.random()*1.15,depth:Math.random(),gold:Math.max(0,1-r/.62)};
  }) : [];
  const dust=nebula ? Array.from({length:1100},()=>({x:Math.random(),y:Math.random(),size:.3+Math.random()*.65,alpha:.04+Math.random()*.14})) : [];
  function dot(x,y,r,color){ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}
  return {resize(width,height){canvas.width=width;canvas.height=height;w=width;h=height;},
    gesture(x,y,px,py){if(nebula||reduced)return;const distance=Math.hypot((x-px)*w,(y-py)*h);const count=Math.min(35,Math.max(2,Math.ceil(distance/6)));for(let i=0;i<count;i++){let f=i/count;ink.push({x:(px+(x-px)*f)*w,y:(py+(y-py)*f)*h,vx:(x-px)*w*.015+(Math.random()-.5)*1.5,vy:(y-py)*h*.015+(Math.random()-.5)*1.5,life:1,hue:time*22+f*35,size:7+Math.random()*14});}if(ink.length>1500)ink.splice(0,ink.length-1500);},
    draw(t,dt=16){ctx.globalCompositeOperation='source-over';ctx.fillStyle='#05070d';ctx.fillRect(0,0,w,h);ctx.globalCompositeOperation='lighter';
      if(nebula){
        const dpr=Math.min(devicePixelRatio,2),scale=Math.min(w*.48,h*.64),rot=t*.045;
        const cx=w*.63,cy=h*.51;
        for(const d of dust)dot(d.x*w,d.y*h,d.size*dpr,`rgba(115,160,215,${d.alpha})`);
        // An elliptical haze supports the additive blue arms and warm point core.
        const halo=ctx.createRadialGradient(cx,cy,0,cx,cy,scale*.8);
        halo.addColorStop(0,'rgba(255,181,77,.22)');
        halo.addColorStop(.16,'rgba(222,151,66,.13)');
        halo.addColorStop(.45,'rgba(39,104,215,.09)');
        halo.addColorStop(1,'rgba(20,54,115,0)');
        ctx.save();ctx.translate(cx,cy);ctx.scale(1,.56);ctx.translate(-cx,-cy);
        ctx.fillStyle=halo;ctx.fillRect(cx-scale,cy-scale,scale*2,scale*2);ctx.restore();
        for(const s of stars){
          const a=s.a+rot,bx=cx+Math.cos(a)*s.r*scale;
          const by=cy+Math.sin(a)*s.r*scale*.52+s.z*scale;
          const dx=bx+s.dx-pointer.x*w,dy=by+s.dy-pointer.y*h,dist=Math.hypot(dx,dy);
          const near=Math.max(0,1-dist/(Math.min(w,h)*.20))*(reduced?0:pointer.active);
          const ease=Math.min(dt/16,2),push=Math.min(w,h)*.13;
          s.dx+=(dx/(dist+1)*near*push-s.dx)*.10*ease;
          s.dy+=(dy/(dist+1)*near*push-s.dy)*.10*ease;
          // Depth attenuates point size; DPR preserves brightness on dense displays.
          const radius=s.size*dpr*(.65+.75*s.depth)*(1+near*1.5);
          const red=Math.round(92+163*s.gold),green=Math.round(164+40*s.gold),blue=Math.round(255-149*s.gold);
          const alpha=Math.min(1,.48+(1-s.r)*.35+near*.5),x=bx+s.dx,y=by+s.dy;
          dot(x,y,radius*3.5,`rgba(${red},${green},${blue},${.025+near*.10})`);
          dot(x,y,radius,`rgba(${red},${green},${blue},${alpha})`);
          if(near>.25)dot(x,y,radius*.45,`rgba(235,247,255,${near*.8})`);
        }
      }else{if(reduced||ink.length===0){for(let i=0;i<90;i++){let a=i/90*Math.PI*3;dot(w*.65+Math.cos(a)*w*.17,h*.5+Math.sin(a)*h*.16,4,`hsla(${190+i},85%,65%,.13)`);}}for(const p of ink){p.x+=p.vx*dt/16;p.y+=p.vy*dt/16;p.vx+=Math.sin(p.y*.009+t)*.02;p.vy+=Math.cos(p.x*.008+t)*.02;p.life-=dt*.00045;let glow=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.size*2);glow.addColorStop(0,`hsla(${p.hue},95%,70%,${Math.max(0,p.life)*.32})`);glow.addColorStop(1,`hsla(${p.hue},95%,40%,0)`);ctx.fillStyle=glow;ctx.fillRect(p.x-p.size*2,p.y-p.size*2,p.size*4,p.size*4);}ink=ink.filter(p=>p.life>0);}
    }};
}

// Isolate each context: a failed shader cannot stop the other scenes or navigation.
const renderers=sections.map((section,i)=>{
  const canvas=section.querySelector('canvas');
  try { return i<2?shaderScene(canvas,i===0?ribbons:gradient):canvasScene(canvas,i===3); }
  catch {
    // A canvas already bound to WebGL cannot acquire a 2D fallback context.
    const fallback=canvas.cloneNode(false);canvas.replaceWith(fallback);
    try { return canvasScene(fallback,true); } catch { return {resize(){},draw(){}}; }
  }
});
function resize(){sections.forEach((s,i)=>{const dpr=Math.min(devicePixelRatio,2),r=s.getBoundingClientRect();renderers[i].resize(Math.round(r.width*dpr),Math.round(r.height*dpr));});if(active>=0)renderers[active].draw(reduced?6:time);}
resize();window.addEventListener('resize',resize);
sections.forEach((s,i)=>{s.addEventListener('pointermove',e=>{const r=s.getBoundingClientRect(),px=pointer.x,py=pointer.y;pointer.x=(e.clientX-r.left)/r.width;pointer.y=(e.clientY-r.top)/r.height;pointer.active=1;renderers[i].gesture?.(pointer.x,pointer.y,px,py);});s.addEventListener('pointerdown',e=>{const r=s.getBoundingClientRect();pointer.x=(e.clientX-r.left)/r.width;pointer.y=(e.clientY-r.top)/r.height;pointer.active=1;renderers[i].gesture?.(pointer.x,pointer.y,pointer.x+.002,pointer.y+.002);});s.addEventListener('pointerleave',()=>pointer.active=0);s.addEventListener('pointerup',e=>{if(e.pointerType!=='mouse')pointer.active=0;});});

// One scheduler, one visible renderer. Contexts remain allocated between visits.
function tick(now){frame=0;if(active<0||reduced||document.hidden)return;const dt=Math.min(now-last||16,32);last=now;time+=dt/1000;renderers[active].draw(time,dt);frame=requestAnimationFrame(tick);}
function start(){cancelAnimationFrame(frame);frame=0;last=0;if(active>=0){renderers[active].draw(reduced?6:time);if(!reduced&&!document.hidden)frame=requestAnimationFrame(tick);}}
const ratios=new Map();const observer=new IntersectionObserver(entries=>{entries.forEach(e=>ratios.set(sections.indexOf(e.target),e.isIntersecting?e.intersectionRatio:0));let best=-1,value=0;ratios.forEach((v,i)=>{if(v>value){best=i;value=v;}});if(best!==active){active=best;links.forEach((l,i)=>{if(i===active)l.setAttribute('aria-current','true');else l.removeAttribute('aria-current');});start();}},{threshold:[0,.1,.25,.5,.75,1]});sections.forEach(s=>observer.observe(s));
motionQuery.addEventListener('change',()=>{reduced=motionQuery.matches;start();});document.addEventListener('visibilitychange',start);
