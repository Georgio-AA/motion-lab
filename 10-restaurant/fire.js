// Two small WebGL2 canvases share the same flame shader. One instanced ember draw each.
const vertex = `#version 300 es
precision highp float;
out vec2 uv;
void main(){vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));uv=p;gl_Position=vec4(p*2.-1.,0.,1.);}`;
const fragment = `#version 300 es
precision highp float;
in vec2 uv;out vec4 color;
uniform float time;uniform float aspect;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*noise(p);p=p*2.03+vec2(7.1,3.4);a*=.5;}return v;}
void main(){
 vec2 p=vec2(uv.x*aspect,uv.y);float t=time;
 float count=clamp(aspect*2.8,13.,27.);
 float x=uv.x*count,cell=floor(x),y=uv.y;
 // Upward-advection grows faster and more turbulent toward the flame tips.
 float turbulence=fbm(vec2(p.x*4.2,y*7.5-t*(2.1+y*3.8)));
 float curl=(turbulence-.5)*(.08+y*y*.92);
 float detail=noise(vec2(p.x*22.+turbulence*2.,y*14.-t*7.));
 float density=0.,temperature=0.;
 for(int i=-2;i<=2;i++){
   float id=cell+float(i),seed=hash(vec2(id,19.3));
   float middle=pow(max(0.,1.-abs((id+.5)/count*2.-1.)),.65);
   float height=.24+middle*(.33+seed*.21)+seed*.07+.04*sin(t*2.8+seed*31.);
   float rise=clamp(y/height,0.,1.);
   float bend=sin(rise*5.2-t*(2.5+seed)+seed*15.)*rise*.17;
   float center=id+.48+(seed-.5)*.66;
   float width=(.85+seed*.45)*pow(max(1.-rise,.001),.75)+.025;
   float q=(x-center+curl+bend)/width;
   float tongue=exp(-q*q*2.6)*(1.-smoothstep(height-.10,height+.015,y));
   tongue*=mix(.92,1.12,detail)*(1.-smoothstep(.92,1.,rise)*.25);
   density+=tongue;
   temperature+=tongue*(1.-rise*.68);
 }
 // A continuous rolling combustion front joins every tongue above the ember bed.
 float base=(1.-smoothstep(.06,.28+turbulence*.09,y))*(.7+.25*detail);
 density=max(density,base);
 temperature=max(temperature,base*.8);
 density=min(density,1.);temperature=min(temperature,1.);
 float side=smoothstep(0.,.07,uv.x)*smoothstep(0.,.07,1.-uv.x);
 float opacity=smoothstep(.025,.62,density)*side;
 vec3 fire=mix(vec3(.65,.035,.008),vec3(1.,.27,.015),smoothstep(.12,.46,temperature));
 fire=mix(fire,vec3(1.,.72,.12),smoothstep(.38,.73,temperature));
 fire=mix(fire,vec3(1.,.98,.77),smoothstep(.68,.93,temperature));
 float halo=exp(-y*4.7)*(.075+.022*sin(t*3.1))*side;
 float smoke=(turbulence*.12)*smoothstep(.42,.78,y)*(1.-smoothstep(.82,1.,y));
 vec3 emission=fire*opacity+vec3(.8,.18,.035)*halo+vec3(.09,.065,.047)*smoke;
 float alpha=clamp(opacity+halo+smoke,0.,1.);
 color=vec4(min(emission,vec3(alpha)),alpha);
}`;
const sparkVertex = `#version 300 es
precision highp float;
layout(location=0) in vec4 seed;uniform float time;uniform float dpr;out float alpha;
void main(){float life=fract(seed.y+time*seed.z);float x=seed.x+sin(life*12.+seed.w+time*.8)*life*.035;gl_Position=vec4(x*2.-1.,life*1.95-1.,0.,1.);gl_PointSize=(1.8+seed.w*.55)*dpr;alpha=sin(life*3.14159)*.85;}`;
const sparkFragment = `#version 300 es
precision highp float;
in float alpha;out vec4 color;
void main(){float r=length(gl_PointCoord-.5);float a=alpha*(1.-smoothstep(.08,.5,r));color=vec4(vec3(1.,.66,.25)*a,a);}`;

export function initFire(canvas, reduced) {
  let gl, flame, sparks, buffer, vao;
  function compile(type, source) { const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){gl.deleteShader(s);throw new Error('Flame shader unavailable');}return s; }
  function program(v,f){const p=gl.createProgram();const vs=compile(gl.VERTEX_SHADER,v),fs=compile(gl.FRAGMENT_SHADER,f);gl.attachShader(p,vs);gl.attachShader(p,fs);gl.linkProgram(p);gl.deleteShader(vs);gl.deleteShader(fs);if(!gl.getProgramParameter(p,gl.LINK_STATUS)){gl.deleteProgram(p);throw new Error('Flame program unavailable');}return p;}
  try {
    gl=canvas.getContext('webgl2',{alpha:true,antialias:false,depth:false,stencil:false,powerPreference:'low-power',premultipliedAlpha:true});
    if(!gl) return null;
    flame=program(vertex,fragment);sparks=program(sparkVertex,sparkFragment);
    const seeds=new Float32Array(64*4);
    for(let i=0;i<64;i++){seeds[i*4]=.04+Math.random()*.92;seeds[i*4+1]=Math.random();seeds[i*4+2]=.07+Math.random()*.12;seeds[i*4+3]=Math.random()*3;}
    vao=gl.createVertexArray();gl.bindVertexArray(vao);buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,seeds,gl.STATIC_DRAW);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,4,gl.FLOAT,false,0,0);gl.vertexAttribDivisor(0,1);gl.bindVertexArray(null);
    const flameTime=gl.getUniformLocation(flame,'time'),aspect=gl.getUniformLocation(flame,'aspect'),sparkTime=gl.getUniformLocation(sparks,'time'),pixel=gl.getUniformLocation(sparks,'dpr');
    let visible=false,ready=false,lost=false,dpr=Math.min(devicePixelRatio||1,1.5),width=1,height=1,previous=0,slow=0;
    function resize(){const box=canvas.getBoundingClientRect();width=Math.max(1,box.width);height=Math.max(1,box.height);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);gl.viewport(0,0,canvas.width,canvas.height);}
    const ro=new ResizeObserver(resize);ro.observe(canvas);resize();
    const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;previous=0;},{rootMargin:'60px'});observer.observe(canvas);
    canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();lost=true;canvas.parentElement.classList.remove('fire-ready');});
    // On restoration retain the warm CSS fallback; no scroll behavior depends on WebGL.
    function render(ms){
      if(!visible||lost||document.hidden||reduced.matches&&ready)return;
      if(previous&&ms-previous>20)slow++;else slow=Math.max(0,slow-1);previous=ms;
      if(slow>80&&dpr>1){dpr=1;slow=0;resize();}
      gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE);gl.useProgram(flame);gl.uniform1f(flameTime,reduced.matches?8:ms*.001);gl.uniform1f(aspect,width/height);gl.drawArrays(gl.TRIANGLES,0,3);
      gl.useProgram(sparks);gl.uniform1f(sparkTime,reduced.matches?8:ms*.001);gl.uniform1f(pixel,dpr);gl.bindVertexArray(vao);gl.drawArraysInstanced(gl.POINTS,0,1,dpr===1?32:64);gl.bindVertexArray(null);gl.disable(gl.BLEND);
      if(!ready){ready=true;canvas.parentElement.classList.add('fire-ready');}
    }
    reduced.addEventListener('change',()=>{ready=false;});
    return {render};
  } catch {
    canvas.parentElement.classList.remove('fire-ready');
    if(gl){if(flame)gl.deleteProgram(flame);if(sparks)gl.deleteProgram(sparks);if(buffer)gl.deleteBuffer(buffer);if(vao)gl.deleteVertexArray(vao);}
    return null;
  }
}
