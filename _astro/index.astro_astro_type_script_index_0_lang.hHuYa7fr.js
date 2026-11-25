function e(e){let t=e.querySelector(`canvas`),n=matchMedia(`(prefers-reduced-motion: reduce)`),r=new Float32Array(6),i=new Float32Array(6),a=new Float32Array(6),o,s,c,l,u,d=1,f=1,p=1,m=n.matches,h=.72,g=.42,_=.72,v=.42,y=0,b=0,x=0,S=3,C=0,w=0,T=0,E=!1,D=!1,O=0,k=!1;function A(e,t){let n=o.createShader(e);if(o.shaderSource(n,t),o.compileShader(n),!o.getShaderParameter(n,o.COMPILE_STATUS))throw o.deleteShader(n),Error(`Ribbon shader unavailable`);return n}function j(){if(o=t.getContext(`webgl`,{alpha:!0,antialias:!1,depth:!1,stencil:!1,powerPreference:`low-power`}),!o)throw Error(`WebGL unavailable`);let n=A(o.VERTEX_SHADER,`
precision highp float;
attribute vec3 aRibbon;
uniform vec2 uResolution;
uniform vec2 uPointer;
uniform float uTime;
uniform mediump float uVelocity;
uniform float uPulse;
varying mediump float vBand;
varying mediump float vDepth;
varying mediump float vEdge;
vec2 curve(float a, float band) {
  float phase = uTime * .17;
  float twist = a * 2.0 + phase;
  vec2 p = vec2(sin(a)*.33 + cos(a*2.0)*.055 + band*cos(twist)*.049,
                cos(a)*.30 + sin(a*2.0)*.08 + band*sin(twist)*.079);
  float drift = sin(uTime*.13)*.09;
  p = mat2(cos(drift),sin(drift),-sin(drift),cos(drift))*p;
  p.x *= 1.0 + uVelocity*.075;
  p.y *= 1.0 - uVelocity*.025;
  p += vec2(uResolution.x < 700.0 ? .64 : .66, .48);
  vec2 delta = p-uPointer;
  p += delta*exp(-dot(delta,delta)*14.0)*.18*uPulse;
  return p;
}
void main() {
  float a = aRibbon.x;
  float band = aRibbon.y;
  vec2 p = curve(a,band);
  vec2 tangent = (curve(a+.002,band)-p)*uResolution;
  vec2 normal = normalize(vec2(-tangent.y,tangent.x));
  // A narrow core and soft shoulder give luminous depth without a blur pass.
  p += normal*aRibbon.z*2.5/uResolution;
  gl_Position = vec4(p.x*2.0-1.0, 1.0-p.y*2.0, 0.0, 1.0);
  vBand = band;
  vDepth = .5+.5*sin(a*2.0+uTime*.17);
  vEdge = aRibbon.z;
}`),r=A(o.FRAGMENT_SHADER,`
precision mediump float;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform mediump float uVelocity;
varying mediump float vBand;
varying mediump float vDepth;
varying mediump float vEdge;
void main() {
  float core = pow(max(0.0,1.0-abs(vEdge)),3.0);
  vec3 color = mix(uColorB,uColorA,vDepth);
  color = mix(color,vec3(1.0),vDepth*.13);
  float alpha = core*(.30+vDepth*.20+uVelocity*.13);
  gl_FragColor = vec4(color,alpha);
}`);if(s=o.createProgram(),o.attachShader(s,n),o.attachShader(s,r),o.linkProgram(s),o.deleteShader(n),o.deleteShader(r),!o.getProgramParameter(s,o.LINK_STATUS))throw Error(`Ribbon program unavailable`);o.useProgram(s),u=14784;let i=new Float32Array(u*3),a=0;for(let e=0;e<22;e++){let t=e/21*2-1;for(let e=0;e<112;e++){let n=e/112*Math.PI*2,r=(e+1)/112*Math.PI*2;for(let e=0;e<6;e++)i[a++]=e===0||e===1||e===3?n:r,i[a++]=t,i[a++]=e===0||e===3||e===5?-1:1}}c=o.createBuffer(),o.bindBuffer(o.ARRAY_BUFFER,c),o.bufferData(o.ARRAY_BUFFER,i,o.STATIC_DRAW);let d=o.getAttribLocation(s,`aRibbon`);o.enableVertexAttribArray(d),o.vertexAttribPointer(d,3,o.FLOAT,!1,0,0),l={};for(let e of[`Resolution`,`Pointer`,`Time`,`Velocity`,`Pulse`,`ColorA`,`ColorB`])l[e]=o.getUniformLocation(s,`u`+e);o.enable(o.BLEND),o.blendFunc(o.SRC_ALPHA,o.ONE),o.clearColor(0,0,0,0),D=!1,M(),e.classList.add(`canvas-ready`)}function M(){d=innerWidth,f=innerHeight;let e=Math.min(devicePixelRatio||1,1.5,1920/d,1200/f)*p;t.width=Math.max(1,Math.round(d*e)),t.height=Math.max(1,Math.round(f*e)),o&&!D&&(o.viewport(0,0,t.width,t.height),N())}function N(){o.clear(o.COLOR_BUFFER_BIT),o.uniform2f(l.Resolution,d,f),o.uniform2f(l.Pointer,h,g),o.uniform1f(l.Time,S),o.uniform1f(l.Velocity,y),o.uniform1f(l.Pulse,x),o.uniform3f(l.ColorA,r[0],r[1],r[2]),o.uniform3f(l.ColorB,r[3],r[4],r[5]),o.drawArrays(o.TRIANGLES,0,u)}function P(){E=!1,cancelAnimationFrame(C),C=0,document.body.dataset.effectActive=`false`}function F(){D=!0,P(),e.classList.remove(`canvas-ready`)}function I(e){if(!E)return;let t=w?e-w:16.7;w=e;let n=Math.min(t,48),o=1-Math.exp(-n*.006);if(S+=n*.001,h+=(_-h)*o,g+=(v-g)*o,x+=(1-x)*o,b*=Math.exp(-n*.006),y+=(b-y)*o,k){let t=Math.min(1,(e-O)/800),n=t*t*(3-2*t);for(let e=0;e<6;e++)r[e]=i[e]+(a[e]-i[e])*n;t===1&&(k=!1)}t>20&&t<200?T++:T=Math.max(0,T-2),T>90&&p>.64&&(p=Math.max(.64,p*.8),T=0,M());try{N()}catch{F();return}C=requestAnimationFrame(I)}function L(){D||document.hidden?P():m?(P(),r.set(a),k=!1,N()):E||(E=!0,w=0,document.body.dataset.effectActive=`true`,C=requestAnimationFrame(I))}function R(e,t=!1){i.set(r);for(let t=0;t<2;t++){let n=parseInt(e[t].slice(1),16),r=t*3;a[r]=(n>>16&255)/255,a[r+1]=(n>>8&255)/255,a[r+2]=(n&255)/255}O=performance.now(),k=!0,(t||m||document.hidden)&&(r.set(a),k=!1),m&&o&&!D&&!document.hidden&&N()}R([`#d5f591`,`#78cfac`],!0);try{j(),L()}catch{F()}return window.addEventListener(`pointermove`,e=>{m||(_=e.clientX/d,v=e.clientY/f)},{passive:!0}),window.addEventListener(`pointerdown`,e=>{m||(_=e.clientX/d,v=e.clientY/f,x=1.8)},{passive:!0}),window.addEventListener(`resize`,M,{passive:!0}),n.addEventListener(`change`,e=>{m=e.matches,L()}),document.addEventListener(`visibilitychange`,L),window.addEventListener(`pagehide`,P),window.addEventListener(`pageshow`,L),t.addEventListener(`webglcontextlost`,e=>{e.preventDefault(),F()}),t.addEventListener(`webglcontextrestored`,()=>{try{j(),L()}catch{F()}}),{setPalette:R,setScrollVelocity(e){b=Math.min(1.5,Math.abs(e)/1800)}}}var t=[`#d5f591`,`#78cfac`];function n(){let n=matchMedia(`(prefers-reduced-motion: reduce)`),i=matchMedia(`(hover: hover) and (pointer: fine)`),a=null,o=document.querySelector(`.atmosphere`);try{a=o?e(o):null}catch{o?.classList.remove(`canvas-ready`)}let s=scrollY,c=performance.now();addEventListener(`scroll`,()=>{let e=performance.now();a?.setScrollVelocity((scrollY-s)/Math.max(16,e-c)*1e3),s=scrollY,c=e},{passive:!0});let l=document.querySelectorAll(`.lab-card`),u=0;l.forEach(e=>{let o=e.querySelector(`video`),[s]=e.dataset.palette.split(`,`),c=()=>{clearTimeout(u),a?.setPalette([s,r(s)]),o&&!n.matches&&i.matches&&(o.src||=o.dataset.src,o.play().then(()=>o.classList.add(`is-playing`)).catch(()=>{}))},l=()=>{u=setTimeout(()=>a?.setPalette(t),250),o&&(o.pause(),o.classList.remove(`is-playing`))};e.addEventListener(`pointerenter`,c),e.addEventListener(`focus`,c),e.addEventListener(`pointerleave`,l),e.addEventListener(`blur`,l)}),document.addEventListener(`visibilitychange`,()=>{document.hidden&&document.querySelectorAll(`.lab-card video`).forEach(e=>e.pause())})}function r(e){let t=parseInt(e.slice(1),16),n=(e,t)=>Math.round(e+(t-e)*.45),r=n(t>>16&255,120),i=n(t>>8&255,207),a=n(t&255,172);return`#`+(r<<16|i<<8|a).toString(16).padStart(6,`0`)}n();