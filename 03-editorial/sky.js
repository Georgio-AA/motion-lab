// A single full-screen plane raycasts the stepped residence in the fragment shader.
// No models, photographs or texture downloads are needed.
const fragmentShader = `
precision highp float;
varying vec2 vUv;
uniform float uTime;
uniform float uAspect;
uniform float uScroll;
uniform vec2 uPointer;
uniform float uRipple;

float hash(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float noise(vec2 p) {
  vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);
}
float fbm(vec2 p) {
  float n=0., a=.52;
  for(int i=0;i<4;i++) { n+=a*noise(p); p=p*2.03+vec2(5.2,1.3); a*=.48; }
  return n;
}
vec3 sky(vec3 rd) {
  float h=clamp(rd.y*.9+.42,0.,1.);
  vec3 col=mix(vec3(.80,.48,.29),vec3(.49,.65,.72),smoothstep(0.,.9,h));
  col=mix(col,vec3(.98,.84,.65),exp(-pow((h-.33)*4.,2.))*.65);
  vec2 cloudUV=rd.xz/(abs(rd.y)+.42)*1.8+vec2(uTime*.016,uTime*.003);
  float cloud=fbm(cloudUV+fbm(cloudUV*.7));
  float mask=smoothstep(.43,.73,cloud)*smoothstep(-.2,.4,rd.y);
  col=mix(col,vec3(.97,.91,.80),mask*.8);
  vec3 sunDir=normalize(vec3(-.85,.18,.4));
  float sun=max(dot(rd,sunDir),0.);
  col+=vec3(.4,.23,.08)*pow(sun,12.)+vec3(.65,.45,.22)*pow(sun,180.);
  return col;
}

// Slabs, glazing and roof planting have separate analytic intersections.
void boxHit(vec3 ro,vec3 rd,vec3 lo,vec3 hi,float mat,
            inout float best,inout vec3 normal,inout float material) {
  vec3 inv=1./rd, t0=(lo-ro)*inv, t1=(hi-ro)*inv;
  vec3 nearT=min(t0,t1), farT=max(t0,t1);
  float enter=max(max(nearT.x,nearT.y),nearT.z);
  float leave=min(min(farT.x,farT.y),farT.z);
  if(enter>0. && enter<leave && enter<best) {
    best=enter; material=mat;
    normal=-sign(rd)*step(nearT.yzx,nearT.xyz)*step(nearT.zxy,nearT.xyz);
  }
}
void main() {
  vec2 uv=vUv;
  vec2 delta=(uv-uPointer)*vec2(uAspect,1.);
  float d=length(delta);
  float wave=sin(d*44.-uTime*4.)*exp(-d*5.5)*uRipple*.012;
  uv+=normalize(delta+vec2(.0001))*wave;
  vec2 p=(uv-.5)*vec2(uAspect,1.);
  // On phones the camera backs out so the entire architectural silhouette fits.
  float distanceScale=mix(1.45,1.,smoothstep(.5,1.5,uAspect));
  vec3 ro=vec3(8.,5.4,13.)*distanceScale;
  ro*=1.-uScroll*.12;
  ro.x+=(uPointer.x-.5)*.17;
  vec3 look=vec3(0.,2.45-uScroll*.4,0.);
  vec3 forward=normalize(look-ro), right=normalize(cross(forward,vec3(0,1,0)));
  vec3 up=cross(right,forward);
  vec3 rd=normalize(forward*1.8+right*p.x+up*p.y);
  vec3 col=sky(rd), normal=vec3(0.);
  float best=1000., material=0.;
  for(int i=0;i<5;i++) {
    float f=float(i), y=-1.2+f*.66;
    float left=-3.8+f*.72, edge=3.4-f*.27, depth=1.55-f*.16;
    boxHit(ro,rd,vec3(left,y,-depth),vec3(edge,y+.57,depth),1.,best,normal,material);
    boxHit(ro,rd,vec3(left-.14,y+.57,-depth-.12),vec3(edge+.18,y+.68,depth+.12),2.,best,normal,material);
    if(i<4) {
      boxHit(ro,rd,vec3(left+.08,y+.68,depth-.35),vec3(left+.57,y+.84,depth-.1),3.,best,normal,material);
    }
  }
  if(best<999.) {
    vec3 pos=ro+rd*best;
    float light=max(dot(normal,normalize(vec3(-.8,1.,.6))),0.);
    if(material<1.5) {
      vec3 reflection=sky(reflect(rd,normal));
      float fresnel=pow(1.-max(dot(-rd,normal),0.),3.);
      float faceUV=abs(normal.z)>.5 ? pos.x : pos.z;
      float seam=abs(fract((faceUV+4.)*2.25)-.5);
      float mullion=1.-smoothstep(.012,.028,seam);
      float floorUV=fract((pos.y+1.2)/.66);
      mullion=max(mullion,1.-smoothstep(.012,.023,abs(floorUV-.42)));
      float room=hash(vec2(floor((faceUV+4.)*2.25),floor((pos.y+1.2)/.66)));
      vec3 inside=mix(vec3(.17,.22,.23),vec3(.60,.41,.24),step(.69,room));
      col=mix(inside,reflection,.52+fresnel*.3);
      col+=vec3(.10,.07,.04)*sin(faceUV*11.+pos.y*6.)*.13;
      col=mix(col,vec3(.16,.20,.20),mullion*.85);
      col*=.80+light*.2;
    } else if(material<2.5) {
      float stone=fbm(pos.xz*24.)*.07;
      col=vec3(.73,.65,.52)*(.64+light*.48)+stone;
      col+=vec3(.14,.065,.018)*light;
    } else {
      float leaf=fbm(pos.xz*35.);
      col=mix(vec3(.21,.27,.13),vec3(.46,.47,.23),leaf)*(.75+light*.4);
    }
    col=mix(col,vec3(.90,.74,.55),1.-exp(-best*.005));
  }
  // Subtle film grain, warm grade and vignette give the procedural scene tactility.
  col+= (hash(gl_FragCoord.xy)-.5)*.016;
  col*=1.-.12*dot(vUv-.5,vUv-.5);
  gl_FragColor=vec4(col,1.);
}`;

export async function createHeroSky(host, reduced) {
  let renderer, geometry, material;
  try {
    // Probe before importing: unsupported GPUs keep the existing SVG composition.
    const probe = document.createElement('canvas');
    const context = probe.getContext('webgl2') || probe.getContext('webgl');
    if (!context) return null;
    context.getExtension('WEBGL_lose_context')?.loseContext();
    const THREE = await import('https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js');
    renderer = new THREE.WebGLRenderer({ antialias:false, alpha:false, powerPreference:'low-power' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    const uniforms = {
      uTime:{ value:0 }, uAspect:{ value:1 }, uScroll:{ value:0 },
      uPointer:{ value:new THREE.Vector2(.5,.5) }, uRipple:{ value:0 }
    };
    material = new THREE.ShaderMaterial({ uniforms, fragmentShader,
      vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}' });
    geometry = new THREE.PlaneGeometry(2,2);
    const scene = new THREE.Scene();
    scene.add(new THREE.Mesh(geometry,material));
    const camera = new THREE.Camera();
    const resize = () => {
      const width = host.clientWidth, height = host.clientHeight;
      renderer.setSize(width,height,false);
      uniforms.uAspect.value=width/height;
    };
    resize();
    // Surface shader compilation failures without leaving a black hero.
    let compiled = true;
    renderer.debug.onShaderError = () => { compiled=false; };
    renderer.render(scene,camera);
    if (!compiled) throw new Error('Shader unavailable');
    renderer.domElement.setAttribute('aria-hidden','true');
    host.append(renderer.domElement);
    host.classList.add('webgl-ready');
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    let available=true;
    renderer.domElement.addEventListener('webglcontextlost', event => {
      event.preventDefault(); available=false; host.classList.remove('webgl-ready');
    });
    renderer.domElement.addEventListener('webglcontextrestored', () => {
      available=true; host.classList.add('webgl-ready');
    });
    return {
      render(time, scroll, pointer, ripple) {
        if (!available) return;
        uniforms.uTime.value=reduced ? 0 : time;
        uniforms.uScroll.value=reduced ? 0 : scroll;
        uniforms.uPointer.value.set(pointer.x,pointer.y);
        uniforms.uRipple.value=reduced ? 0 : ripple;
        try { renderer.render(scene,camera); }
        catch { available=false; host.classList.remove('webgl-ready'); }
      },
      dispose() { observer.disconnect(); geometry.dispose(); material.dispose(); renderer.dispose(); }
    };
  } catch {
    geometry?.dispose(); material?.dispose(); renderer?.dispose();
    host.classList.remove('webgl-ready');
    return null;
  }
}
