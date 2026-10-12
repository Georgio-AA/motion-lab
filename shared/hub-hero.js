// A single GPU draw paints every strand. Geometry and uniform arrays are reused.
const vertexSource = `
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
}`;
const fragmentSource = `
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
}`;

export function initHero(atmosphere) {
  const canvas = atmosphere.querySelector('canvas');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const current = new Float32Array(6);
  const from = new Float32Array(6);
  const target = new Float32Array(6);
  let gl, program, buffer, uniforms, count;
  let width=1, height=1, quality=1, reduced=motion.matches;
  let pointerX=.72, pointerY=.42, targetX=.72, targetY=.42;
  let velocity=0, scrollVelocity=0, influence=0, time=3;
  let frame=0, previous=0, slowFrames=0, running=false, failed=false;
  let paletteStart=0, tweening=false;

  function shader(type, source) {
    const result = gl.createShader(type);
    gl.shaderSource(result,source); gl.compileShader(result);
    if (!gl.getShaderParameter(result,gl.COMPILE_STATUS)) {
      gl.deleteShader(result); throw new Error('Ribbon shader unavailable');
    }
    return result;
  }
  function setup() {
    gl = canvas.getContext('webgl',{alpha:true,antialias:false,depth:false,stencil:false,powerPreference:'low-power'});
    if (!gl) throw new Error('WebGL unavailable');
    const vertex=shader(gl.VERTEX_SHADER,vertexSource);
    const fragment=shader(gl.FRAGMENT_SHADER,fragmentSource);
    program=gl.createProgram();
    gl.attachShader(program,vertex); gl.attachShader(program,fragment); gl.linkProgram(program);
    gl.deleteShader(vertex); gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program,gl.LINK_STATUS)) throw new Error('Ribbon program unavailable');
    gl.useProgram(program);
    const segments=112, strands=22;
    count=segments*strands*6;
    const vertices=new Float32Array(count*3);
    let offset=0;
    // The same immutable triangle strip is deformed by the vertex shader.
    for (let n=0;n<strands;n++) {
      const band=n/(strands-1)*2-1;
      for (let j=0;j<segments;j++) {
        const a=j/segments*Math.PI*2, b=(j+1)/segments*Math.PI*2;
        for (let k=0;k<6;k++) {
          vertices[offset++]=(k===0||k===1||k===3)?a:b;
          vertices[offset++]=band;
          vertices[offset++]=(k===0||k===3||k===5)?-1:1;
        }
      }
    }
    buffer=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    gl.bufferData(gl.ARRAY_BUFFER,vertices,gl.STATIC_DRAW);
    const attribute=gl.getAttribLocation(program,'aRibbon');
    gl.enableVertexAttribArray(attribute); gl.vertexAttribPointer(attribute,3,gl.FLOAT,false,0,0);
    uniforms={};
    for (const name of ['Resolution','Pointer','Time','Velocity','Pulse','ColorA','ColorB']) uniforms[name]=gl.getUniformLocation(program,'u'+name);
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA,gl.ONE);
    gl.clearColor(0,0,0,0);
    failed=false; resize(); atmosphere.classList.add('canvas-ready');
  }
  function resize() {
    width=innerWidth; height=innerHeight;
    const dpr=Math.min(devicePixelRatio||1,1.5,1920/width,1200/height)*quality;
    canvas.width=Math.max(1,Math.round(width*dpr));
    canvas.height=Math.max(1,Math.round(height*dpr));
    if (gl && !failed) { gl.viewport(0,0,canvas.width,canvas.height); draw(); }
  }
  function draw() {
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(uniforms.Resolution,width,height);
    gl.uniform2f(uniforms.Pointer,pointerX,pointerY);
    gl.uniform1f(uniforms.Time,time);
    gl.uniform1f(uniforms.Velocity,velocity);
    gl.uniform1f(uniforms.Pulse,influence);
    gl.uniform3f(uniforms.ColorA,current[0],current[1],current[2]);
    gl.uniform3f(uniforms.ColorB,current[3],current[4],current[5]);
    gl.drawArrays(gl.TRIANGLES,0,count);
  }
  function stop() {
    running=false; cancelAnimationFrame(frame); frame=0;
    document.body.dataset.effectActive='false';
  }
  function fallback() {
    failed=true; stop(); atmosphere.classList.remove('canvas-ready');
  }
  function tick(now) {
    if (!running) return;
    const elapsed=previous?now-previous:16.7;
    previous=now;
    const dt=Math.min(elapsed,48), ease=1-Math.exp(-dt*.006);
    time+=dt*.001;
    pointerX+=(targetX-pointerX)*ease; pointerY+=(targetY-pointerY)*ease;
    influence+=(1-influence)*ease;
    scrollVelocity*=Math.exp(-dt*.006);
    velocity+=(scrollVelocity-velocity)*ease;
    if (tweening) {
      const p=Math.min(1,(now-paletteStart)/800), t=p*p*(3-2*p);
      for (let i=0;i<6;i++) current[i]=from[i]+(target[i]-from[i])*t;
      if (p===1) tweening=false;
    }
    // Lower pixel density only after sustained pressure; no render-loop objects.
    if (elapsed>20 && elapsed<200) slowFrames++;
    else slowFrames=Math.max(0,slowFrames-2);
    if (slowFrames>90 && quality>.64) {
      quality=Math.max(.64,quality*.8); slowFrames=0; resize();
    }
    try { draw(); } catch { fallback(); return; }
    frame=requestAnimationFrame(tick);
  }
  function updateRunning() {
    if (failed || document.hidden) { stop(); return; }
    if (reduced) { stop(); current.set(target); tweening=false; draw(); return; }
    if (!running) { running=true; previous=0; document.body.dataset.effectActive='true'; frame=requestAnimationFrame(tick); }
  }
  function setPalette(palette, immediate=false) {
    from.set(current);
    for (let color=0;color<2;color++) {
      const hex=parseInt(palette[color].slice(1),16), i=color*3;
      target[i]=((hex>>16)&255)/255; target[i+1]=((hex>>8)&255)/255; target[i+2]=(hex&255)/255;
    }
    paletteStart=performance.now(); tweening=true;
    if (immediate || reduced || document.hidden) { current.set(target); tweening=false; }
    if (reduced && gl && !failed && !document.hidden) draw();
  }
  setPalette(['#d5f591','#78cfac'],true);
  try { setup(); updateRunning(); } catch { fallback(); }
  window.addEventListener('pointermove',event => {
    if (reduced) return;
    targetX=event.clientX/width; targetY=event.clientY/height;
  },{passive:true});
  window.addEventListener('pointerdown',event => {
    if (reduced) return;
    targetX=event.clientX/width; targetY=event.clientY/height; influence=1.8;
  },{passive:true});
  window.addEventListener('resize',resize,{passive:true});
  motion.addEventListener('change',event => { reduced=event.matches; updateRunning(); });
  document.addEventListener('visibilitychange',updateRunning);
  window.addEventListener('pagehide',stop);
  window.addEventListener('pageshow',updateRunning);
  canvas.addEventListener('webglcontextlost',event => { event.preventDefault(); fallback(); });
  canvas.addEventListener('webglcontextrestored',() => {
    try { setup(); updateRunning(); } catch { fallback(); }
  });
  return {setPalette,setScrollVelocity(value) { scrollVelocity=Math.min(1.5,Math.abs(value)/1800); }};
}
