// A 32-second seamless soundscape, synthesized locally after a user gesture.
// Offline rendering keeps oscillator scheduling out of the visual render loop.
async function compose() {
  const duration=32,sampleRate=22050;
  const ctx=new OfflineAudioContext(2,duration*sampleRate,sampleRate);
  const master=ctx.createGain();master.gain.value=.48;
  const limiter=ctx.createDynamicsCompressor();limiter.threshold.value=-18;limiter.knee.value=16;limiter.ratio.value=4;limiter.attack.value=.01;limiter.release.value=.3;
  master.connect(limiter);limiter.connect(ctx.destination);
  const filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=1500;filter.Q.value=.4;filter.connect(master);
  const delay=ctx.createDelay(2),echo=ctx.createGain();delay.delayTime.value=.375;echo.gain.value=.22;filter.connect(delay);delay.connect(echo);echo.connect(delay);echo.connect(master);
  const chords=[[130.81,164.81,196,246.94],[110,130.81,164.81,196],[87.31,130.81,174.61,220],[98,146.83,196,246.94]];
  // Duplicate the preceding/following chord at the boundaries for a soft loop seam.
  for(let bar=-1;bar<=4;bar++){
    const start=bar*8,chord=chords[(bar+4)%4];
    for(let n=0;n<4;n++)for(let voice=0;voice<2;voice++){
      const osc=ctx.createOscillator(),amp=ctx.createGain(),pan=ctx.createStereoPanner();osc.type=voice?'triangle':'sine';osc.frequency.value=chord[n];osc.detune.value=voice?5:-5;pan.pan.value=(voice?1:-1)*(.25+n*.12);
      const s=Math.max(0,start),end=Math.min(duration,start+10);if(end<=s)continue;
      amp.gain.setValueAtTime(start<0?.015:0,s);amp.gain.linearRampToValueAtTime(.028,Math.max(s,start+2));amp.gain.setValueAtTime(.028,Math.max(s,start+7));amp.gain.linearRampToValueAtTime(0,end);
      osc.connect(amp);amp.connect(pan);pan.connect(filter);osc.start(s);osc.stop(end);
    }
  }
  const noise=ctx.createBuffer(1,sampleRate*.12,sampleRate),nd=noise.getChannelData(0);
  for(let i=0;i<nd.length;i++)nd[i]=(Math.random()*2-1)*Math.exp(-i/(sampleRate*.025));
  for(let step=0;step<64;step++){
    const t=step*.5;
    if(step%2===0){const kick=ctx.createOscillator(),g=ctx.createGain();kick.frequency.setValueAtTime(92,t);kick.frequency.exponentialRampToValueAtTime(42,t+.16);g.gain.setValueAtTime(.21,t);g.gain.exponentialRampToValueAtTime(.0001,t+.32);kick.connect(g);g.connect(master);kick.start(t);kick.stop(t+.34);}
    const hat=ctx.createBufferSource(),hp=ctx.createBiquadFilter(),hg=ctx.createGain();hat.buffer=noise;hp.type='highpass';hp.frequency.value=step%4===2?1800:5500;hg.gain.value=step%4===2?.08:.035;hat.connect(hp);hp.connect(hg);hg.connect(master);hat.start(t+.25);
    if(step%4===3){const bell=ctx.createOscillator(),bg=ctx.createGain();bell.frequency.value=chords[Math.floor(t/8)][2]*2;bell.type='sine';bg.gain.setValueAtTime(.028,t);bg.gain.exponentialRampToValueAtTime(.0001,Math.min(duration,t+1.5));bell.connect(bg);bg.connect(filter);bell.start(t);bell.stop(Math.min(duration,t+1.5));}
  }
  const buffer=await ctx.startRendering();
  // Blend the final half-second into the opening to eliminate clicks at wraparound.
  const seam=Math.floor(sampleRate*.5);
  for(let channel=0;channel<2;channel++){const data=buffer.getChannelData(channel);for(let i=0;i<seam;i++){const t=i/seam;data[data.length-seam+i]=data[data.length-seam+i]*(1-t)+data[i]*t;}}
  return buffer;
}

export function createSoundscape() {
  let context=null,analyser=null,source=null,volume=null,buffer=null,playing=false,busy=false,data=null;
  return {
    get playing(){return playing;},
    get busy(){return busy;},
    async toggle(){
      if(busy)return playing;
      if(playing){volume.gain.setTargetAtTime(0,context.currentTime,.04);playing=false;setTimeout(()=>{if(!playing)context.suspend().catch(()=>{});},200);return false;}
      busy=true;
      try{
        if(!context){const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)throw new Error('Audio unavailable');context=new Audio();volume=context.createGain();volume.gain.value=0;analyser=context.createAnalyser();analyser.fftSize=256;analyser.smoothingTimeConstant=.7;data=new Uint8Array(analyser.frequencyBinCount);volume.connect(analyser);analyser.connect(context.destination);}
        await context.resume();
        if(!buffer)buffer=await compose();
        if(!source){source=context.createBufferSource();source.buffer=buffer;source.loop=true;source.connect(volume);source.start();}
        volume.gain.setTargetAtTime(.42,context.currentTime,.3);playing=true;return true;
      }finally{busy=false;}
    },
    energy(){if(!playing||!analyser)return 0;analyser.getByteFrequencyData(data);let sum=0;for(let i=1;i<18;i++)sum+=data[i];return Math.min(1,sum/(17*180));},
    pause(){if(context&&playing){playing=false;volume.gain.value=0;context.suspend().catch(()=>{});}}
  };
}
