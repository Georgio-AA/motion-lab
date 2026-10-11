// A small preallocated particle pool; rendering stops outside the visible kitchen scene.
export function createEmbers(canvas, mobile) {
  const ctx = canvas.getContext('2d', {alpha:true});
  if(!ctx) return {setActive(){},destroy(){}};
  const count = mobile ? 18 : 40;
  const seed = new Float32Array(count),spread = new Float32Array(count),size = new Float32Array(count);
  for(let i=0;i<count;i++){seed[i]=Math.random();spread[i]=Math.random()-.5;size[i]=.8+Math.random()*1.8;}
  let width=1,height=1,dpr=Math.min(devicePixelRatio||1,1.5),limit=count;
  let frame=0,enabled=false,inView=false,previous=0,slowFrames=0;
  function resize(){
    width=canvas.clientWidth;height=canvas.clientHeight;
    canvas.width=Math.max(1,Math.round(width*dpr));canvas.height=Math.max(1,Math.round(height*dpr));
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  function paint(now){
    frame=0;
    if(!enabled||!inView||document.hidden)return;
    const elapsed=previous?now-previous:16;previous=now;
    if(elapsed>20)slowFrames++;else slowFrames=Math.max(0,slowFrames-1);
    if(slowFrames>12&&dpr>1){dpr=1;limit=Math.ceil(count*.65);resize();slowFrames=0;}
    ctx.clearRect(0,0,width,height);
    for(let i=0;i<limit;i++){
      const phase=(now*.00015+seed[i])%1;
      const x=width*.68+spread[i]*width*.24+Math.sin(phase*7+seed[i]*12)*18;
      const y=height*.77-phase*height*.46;
      ctx.globalAlpha=Math.sin(phase*Math.PI)*.85;
      ctx.fillStyle=i%3?'#edba69':'#f9dca0';
      ctx.fillRect(x,y,size[i],size[i]*(1+phase*2));
    }
    ctx.globalAlpha=1;frame=requestAnimationFrame(paint);
  }
  function sync(){
    if(enabled&&inView&&!document.hidden){if(!frame){previous=0;frame=requestAnimationFrame(paint);}}
    else if(frame){cancelAnimationFrame(frame);frame=0;}
  }
  const observer=new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;sync();});
  observer.observe(canvas);
  const sizing=new ResizeObserver(resize);sizing.observe(canvas);
  document.addEventListener('visibilitychange',sync);resize();
  return {setActive(value){enabled=value;sync();},destroy(){enabled=false;sync();observer.disconnect();sizing.disconnect();document.removeEventListener('visibilitychange',sync);ctx.clearRect(0,0,width,height);}};
}
