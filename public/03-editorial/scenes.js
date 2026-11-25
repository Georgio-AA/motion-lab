// Original vector scenes: sky, glass mullions, cantilevered slabs and planted roofs.
let sceneId = 0;
export function scene(kind) {
  const id = `sky-${sceneId++}`;
  const warm = kind === 'courtyard';
  let shapes = '';
  if (warm) {
    shapes = `<path d="M0 220H800V800H0Z" fill="#c4a085"/><path d="M60 270H730V800H60Z" fill="#dbc2a7"/><path d="M340 760V430a140 140 0 0 1 280 0v330" fill="#705545"/><path d="M378 760V440a100 100 0 0 1 200 0v320" fill="#b69a76"/><path d="M398 450H560V690H398Z" fill="url(#glass-${id})"/><path d="M0 720 800 610V800H0Z" fill="#e4d1b8"/><path d="M140 710 166 390 180 710" fill="#645d42"/>`;
    for (let i=0;i<30;i++) { const a=i*2.4; shapes += `<ellipse cx="${165+Math.cos(a)*100}" cy="${365+Math.sin(a)*65}" rx="45" ry="18" transform="rotate(${i*27} ${165+Math.cos(a)*100} ${365+Math.sin(a)*65})" fill="${i%2?'#73745a':'#8c8a6b'}"/>`; }
  } else {
    if (kind === 'coast') shapes += '<path d="M0 420H800V800H0Z" fill="#96a9a6"/><path d="M0 540Q230 510 800 550V800H0Z" fill="#b9c7bd"/>';
    const tower = kind === 'tower';
    const levels = tower ? 7 : 4;
    for (let i=0;i<levels;i++) {
      const x=tower?220+i*7:80+i*65, y=tower?730-i*80:750-i*91, w=tower?370:650-i*97;
      shapes += `<rect x="${x}" y="${y-82}" width="${w}" height="84" fill="url(#glass-${id})"/><path d="M${x} ${y-82}h${w}l40 -20H${x+40}Z" fill="#d2c1ab"/><path d="M${x+w} ${y-82}l40 -20v83l-40 21Z" fill="#7e827d"/><rect x="${x-12}" y="${y-8}" width="${w+35}" height="12" fill="#dccbb5"/>`;
      // Alternate warm interior lights and cool, cloud-like glass reflections.
      for(let j=1;j<w/40;j++) {
        shapes += `<path d="M${x+j*40} ${y-80}v70" stroke="#394b4e" stroke-width="3" opacity=".7"/>`;
        if((j+i)%4===0) shapes += `<rect x="${x+j*40+6}" y="${y-70}" width="23" height="54" fill="#f0c691" opacity=".28"/><path d="M${x+j*40+15} ${y-52}h12v3h-12Z" fill="#f9e5b9" opacity=".6"/>`;
      }
      shapes += `<path d="M${x+20} ${y-68}Q${x+w*.3} ${y-105} ${x+w*.7} ${y-48}T${x+w} ${y-60}" fill="none" stroke="#e2e1ca" stroke-width="15" opacity=".18"/><path d="M${x} ${y-6}h${w}" stroke="#615447" stroke-width="5" opacity=".4"/>`;
      shapes += `<path d="M${x} ${y-45}h${w}" stroke="#dfd8c3" stroke-width="2" opacity=".55"/>`;
      if(i>0) { for(let j=0;j<9;j++) shapes += `<ellipse cx="${x+22+j*11}" cy="${y-91-(j%3)*4}" rx="16" ry="10" fill="${kind==='garden'?'#636e50':'#8b8053'}"/>`; }
    }
    shapes += '<path d="M0 785H800V800H0Z" fill="#958b72"/>';
  }
  const hero = kind === 'hero';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${hero ? 1400 : 800} 800" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><linearGradient id="${id}" x2=".2" y2="1"><stop stop-color="#aebec3"/><stop offset=".42" stop-color="#e9ded0"/><stop offset=".73" stop-color="#f0cc9e"/><stop offset="1" stop-color="#bf8861"/></linearGradient><linearGradient id="glass-${id}" x2="1" y2=".7"><stop stop-color="#536a73"/><stop offset=".25" stop-color="#a0b2ad"/><stop offset=".4" stop-color="#b0b6aa"/><stop offset=".49" stop-color="#7b8f91"/><stop offset=".65" stop-color="#d7a77c"/><stop offset="1" stop-color="#647676"/></linearGradient><radialGradient id="sun-${id}"><stop stop-color="#fff6d9" stop-opacity=".9"/><stop offset="1" stop-color="#fff6d9" stop-opacity="0"/></radialGradient><filter id="grain-${id}"><feTurbulence type="fractalNoise" baseFrequency=".65" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope=".1"/></feComponentTransfer><feBlend in="SourceGraphic" mode="soft-light"/></filter><filter id="cloud-${id}"><feGaussianBlur stdDeviation="18"/></filter></defs><rect width="1400" height="800" fill="url(#${id})"/><ellipse cx="120" cy="480" rx="400" ry="270" fill="url(#sun-${id})"/><g filter="url(#cloud-${id})" opacity=".4"><path d="M-60 170Q170 105 340 180T1500 150M-60 240Q300 170 540 235T1520 215" fill="none" stroke="#fff4dc" stroke-width="42"/></g><g transform="translate(${hero ? 300 : 0} 0)">${shapes}</g><rect width="1400" height="800" fill="transparent" filter="url(#grain-${id})" opacity=".3"/></svg>`;
}
document.querySelectorAll('[data-scene]').forEach(el => { el.innerHTML = scene(el.dataset.scene); });
