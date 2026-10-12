// Food is painted once into cached canvases. Organic contours, roasted grain,
// glaze, directional highlights and garnish replace the old flat SVG scenes.
const cache=new Map();
const TAU=Math.PI*2;
function random(seed){let n=seed;return()=>{n=(n*1664525+1013904223)>>>0;return n/4294967296;};}
function surface(size=640){const c=document.createElement('canvas');c.width=c.height=size;return c;}
function ellipse(ctx,x,y,rx,ry,fill,angle=0){ctx.beginPath();ctx.ellipse(x,y,rx,ry,angle,0,TAU);ctx.fillStyle=fill;ctx.fill();}
function radial(ctx,x,y,r,colors){const g=ctx.createRadialGradient(x-r*.24,y-r*.3,1,x,y,r);colors.forEach((c,i)=>g.addColorStop(i/(colors.length-1),c));return g;}
function blob(ctx,x,y,rx,ry,fill,rng,rotation=0){ctx.save();ctx.translate(x,y);ctx.rotate(rotation);ctx.beginPath();for(let i=0;i<=64;i++){const a=i/64*TAU;const wobble=1+.04*Math.sin(a*7)+.022*Math.cos(a*13);const px=Math.cos(a)*rx*wobble,py=Math.sin(a)*ry*wobble;i?ctx.lineTo(px,py):ctx.moveTo(px,py);}ctx.closePath();ctx.fillStyle=fill;ctx.fill();ctx.restore();}
function flecks(ctx,rng,count,radius,colors,size=2,cx=320,cy=320){for(let i=0;i<count;i++){const a=rng()*TAU,r=Math.sqrt(rng())*radius;ellipse(ctx,cx+Math.cos(a)*r,cy+Math.sin(a)*r,size*(.3+rng()),size*(.3+rng()),colors[Math.floor(rng()*colors.length)],rng()*TAU);}}
function leaf(ctx,x,y,angle,size=14){
  ctx.save();ctx.translate(x,y);ctx.rotate(angle);
  ctx.shadowColor='#101a0f60';ctx.shadowBlur=2;ctx.shadowOffsetY=2;
  const g=ctx.createLinearGradient(-size,0,size,0);g.addColorStop(0,'#20351f');g.addColorStop(.42,'#8b9b55');g.addColorStop(.56,'#465c32');g.addColorStop(1,'#263821');
  ctx.beginPath();ctx.moveTo(0,size);ctx.bezierCurveTo(-size*1.3,0,-size*.65,-size,0,-size);ctx.bezierCurveTo(size*.85,-size,size*.9,0,0,size);ctx.fillStyle=g;ctx.fill();ctx.shadowBlur=0;ctx.shadowOffsetY=0;
  ctx.strokeStyle='#c2c48a70';ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(0,size);ctx.lineTo(0,-size*.8);
  for(let i=0;i<4;i++){const y=-size*.6+i*size*.35;ctx.moveTo(0,y);ctx.lineTo(-size*.36,y-size*.22);ctx.moveTo(0,y);ctx.lineTo(size*.33,y-size*.23);}ctx.stroke();
  ctx.strokeStyle='#d1d78c63';ctx.beginPath();ctx.moveTo(-size*.3,size*.3);ctx.quadraticCurveTo(-size*.63,-size*.1,-size*.22,-size*.65);ctx.stroke();ctx.restore();
}
function garnish(ctx,rng,count=14,radius=125){for(let i=0;i<count;i++){const a=rng()*TAU,r=Math.sqrt(rng())*radius;leaf(ctx,320+Math.cos(a)*r,320+Math.sin(a)*r,rng()*TAU,5+rng()*9);}}
function seeds(ctx,rng,count=30,radius=128){for(let i=0;i<count;i++){const a=rng()*TAU,r=Math.sqrt(rng())*radius,x=320+Math.cos(a)*r,y=320+Math.sin(a)*r;ellipse(ctx,x+2,y+3,4.4,5,'#21100b80');ellipse(ctx,x,y,4,5,radial(ctx,x,y,6,['#ee8880','#b63630','#691922']),a);ellipse(ctx,x-1,y-2,1.2,1.6,'#f8b99c90');}}
function oil(ctx,rx=120,ry=108){
  ctx.save();ctx.lineCap='round';ctx.strokeStyle='#8e6823b0';ctx.lineWidth=11;
  ctx.beginPath();ctx.ellipse(320,320,rx,ry,-.2,.28,4.9);ctx.stroke();
  ctx.strokeStyle='#d2a144c0';ctx.lineWidth=7;ctx.stroke();ctx.strokeStyle='#fff0b0a0';ctx.lineWidth=1.8;ctx.beginPath();ctx.ellipse(320,317,rx-2,ry-2,-.2,3.05,4.5);ctx.stroke();
  ellipse(ctx,379,398,15,7,radial(ctx,379,398,18,['#e9c36f99','#9f782938']));ellipse(ctx,374,395,8,1.7,'#fff0bca0',-.3);ctx.restore();
}
function glossyOil(ctx,rng,radius=130){
  for(let i=0;i<22;i++){const a=rng()*TAU,r=Math.sqrt(rng())*radius,x=320+Math.cos(a)*r,y=320+Math.sin(a)*r;
    ellipse(ctx,x+1,y+2,5+rng()*8,2+rng()*4,'#a76f1828',a);
    ellipse(ctx,x,y,3+rng()*6,.7+rng(), '#fff0b67b',-.4);
  }
}
function plate(ctx,rng,dark=false){
  // Shadows live inside the canvas bounds, including the offset contact shadow.
  ellipse(ctx,332,347,263,256,radial(ctx,332,347,264,['#0009','#0007','#0000']));
  ellipse(ctx,320,320,232,232,radial(ctx,320,320,232,dark?['#3e4038','#282b27','#454539','#181c19']:['#dbcbb0','#ddd2bc','#ac9c7e','#efe0c3','#82725a']));
  ctx.strokeStyle=dark?'#77705870':'#fcf1d480';ctx.lineWidth=2;ctx.beginPath();ctx.arc(320,320,226,0,TAU);ctx.stroke();
  ellipse(ctx,320,320,192,192,radial(ctx,320,320,193,dark?['#373b33','#2b2f29','#4b4b3c']:['#c4b79a','#e4d9c1','#c3b397']));
  ctx.save();ctx.beginPath();ctx.arc(320,320,225,0,TAU);ctx.clip();flecks(ctx,rng,1900,230,dark?['#aba28118','#00000020','#ffffff09']:['#5e4c3420','#ffffff38','#9e8c6420'],.9);ctx.restore();
  // Thin directional rim glints and the inner concave shadow suggest ceramic depth.
  ctx.strokeStyle=dark?'#c8b99579':'#fff4d69c';ctx.lineWidth=2.4;ctx.beginPath();ctx.arc(320,320,228,-2.9,-.6);ctx.stroke();
  ctx.strokeStyle=dark?'#070e0980':'#786c4947';ctx.lineWidth=3;ctx.beginPath();ctx.arc(320,320,192,.3,2.3);ctx.stroke();
}
function creamy(ctx,rng,labneh=false){
  blob(ctx,320,320,154,143,radial(ctx,320,320,157,labneh?['#fff1d8','#eee0c4','#c9bca2']:['#edd499','#dac18b','#b39256']),rng);
  ctx.save();ctx.lineCap='round';for(let j=0;j<3;j++){ctx.beginPath();for(let i=0;i<200;i++){const a=i*.065,r=16+i*.55;const x=320+Math.cos(a)*r,y=320+Math.sin(a)*r*.9;i?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.strokeStyle=j===0?'#785c3233':j===1?'#fff1c440':'#bba06430';ctx.lineWidth=j===0?10:3;ctx.stroke();}ctx.restore();
  oil(ctx,115,97);flecks(ctx,rng,600,142,labneh?['#435335aa','#8b7856aa','#a6966460']:['#a4563290','#7f462888','#d4ad5c50'],1.2);
  if(!labneh)for(let i=0;i<9;i++){const a=i*.4;const x=320+Math.cos(a)*73,y=320+Math.sin(a)*64;ellipse(ctx,x+2,y+3,8,7,'#98703660');ellipse(ctx,x,y,8,7,radial(ctx,x,y,10,['#f2d39b','#c79954']));}
  garnish(ctx,rng,labneh?23:8,105);
}
function bread(ctx,rng){
  // An opened pita and a torn wedge: crisp shell, soft exposed crumb, char bubbles.
  ctx.save();ctx.shadowBlur=16;ctx.shadowColor='#21130699';ctx.shadowOffsetY=12;
  ctx.beginPath();ctx.moveTo(420,189);ctx.bezierCurveTo(337,134,210,156,159,264);ctx.bezierCurveTo(112,367,176,475,287,481);ctx.bezierCurveTo(370,484,435,446,462,361);
  ctx.lineTo(445,357);ctx.lineTo(432,345);ctx.lineTo(413,351);ctx.lineTo(403,337);ctx.lineTo(383,342);ctx.lineTo(372,328);ctx.lineTo(350,333);ctx.lineTo(342,319);ctx.lineTo(319,318);ctx.lineTo(336,301);ctx.lineTo(340,278);ctx.lineTo(359,267);ctx.lineTo(363,243);ctx.lineTo(383,234);ctx.lineTo(389,210);ctx.lineTo(409,210);ctx.closePath();
  ctx.fillStyle=radial(ctx,290,315,215,['#f5d9a1','#d9ad69','#b87a3c','#895224']);ctx.fill();ctx.shadowBlur=0;ctx.shadowOffsetY=0;
  ctx.save();ctx.clip();
  for(let i=0;i<78;i++){const x=145+rng()*335,y=154+rng()*335,rx=4+rng()*19,ry=2+rng()*11;
    ellipse(ctx,x-2,y-3,rx+2,ry+2,'#f7dfac38');ellipse(ctx,x,y,rx,ry,radial(ctx,x,y,rx+4,['#26190ed0','#76451b88','#bd863d00']),rng()*TAU);
  }
  for(let i=0;i<1800;i++){const x=140+rng()*340,y=140+rng()*350;ellipse(ctx,x,y,.3+rng()*1.3,.5+rng(),i%3?'#8c622420':'#fff0cd63');}
  ctx.restore();
  ctx.strokeStyle='#f6e4bf';ctx.lineWidth=7;ctx.lineJoin='round';ctx.beginPath();ctx.moveTo(458,360);ctx.lineTo(431,349);ctx.lineTo(405,341);ctx.lineTo(377,333);ctx.lineTo(344,323);ctx.lineTo(319,318);ctx.lineTo(341,280);ctx.lineTo(368,245);ctx.lineTo(393,218);ctx.lineTo(414,192);ctx.stroke();
  ctx.strokeStyle='#a8794470';ctx.lineWidth=1;ctx.stroke();
  // The wedge rests across the open crumb rather than completing a perfect disc.
  ctx.translate(405,250);ctx.rotate(.15);ctx.beginPath();ctx.moveTo(-38,62);ctx.lineTo(-1,-85);ctx.quadraticCurveTo(111,-33,95,90);ctx.lineTo(79,84);ctx.lineTo(68,91);ctx.lineTo(50,76);ctx.lineTo(35,83);ctx.lineTo(21,69);ctx.lineTo(3,74);ctx.closePath();
  ctx.fillStyle=radial(ctx,13,-12,136,['#ebca8a','#c99249','#9b5f2a']);ctx.shadowBlur=10;ctx.shadowColor='#28170b7a';ctx.shadowOffsetY=6;ctx.fill();ctx.shadowBlur=0;ctx.shadowOffsetY=0;
  ctx.save();ctx.clip();for(let i=0;i<28;i++){const x=-20+rng()*120,y=-70+rng()*155;ellipse(ctx,x,y,4+rng()*10,2+rng()*7,radial(ctx,x,y,17,['#352112b0','#98632930','#98632900']));}ctx.restore();ctx.restore();
  flecks(ctx,rng,30,205,['#b59562','#efdbb1','#997748'],1.5);
}
function carrots(ctx,rng){
  // Tahini brushed under long, blistered carrots.
  blob(ctx,320,328,152,100,'#cdbb9360',rng);
  for(let i=0;i<6;i++){ctx.save();ctx.translate(260+i*24,320+(i%2)*13);ctx.rotate(-.3+i*.12);const g=ctx.createLinearGradient(-15,0,15,0);g.addColorStop(0,'#6d2a12');g.addColorStop(.4,'#d18039');g.addColorStop(.7,'#d79344');g.addColorStop(1,'#8a401b');ctx.beginPath();ctx.moveTo(-13,-100);ctx.quadraticCurveTo(-27,-78,-12,50);ctx.quadraticCurveTo(-2,160,9,60);ctx.quadraticCurveTo(30,-80,12,-100);ctx.closePath();ctx.fillStyle=g;ctx.fill();for(let j=0;j<16;j++){ctx.strokeStyle=j%3?'#e7a85640':'#31170bac';ctx.lineWidth=1+rng()*4;ctx.beginPath();const y=-86+j*12;ctx.moveTo(-12,y);ctx.lineTo(10-rng()*5,y+4);ctx.stroke();}ctx.restore();}
  drizzle(ctx,'#eddbb7',18);garnish(ctx,rng,12,135);flecks(ctx,rng,140,140,['#7f3023','#553b21','#e7bd73'],1.4);
}
function drizzle(ctx,color,offset=0){ctx.strokeStyle=color;ctx.lineWidth=4;ctx.lineCap='round';ctx.beginPath();for(let i=0;i<6;i++){const y=243+i*29+offset;ctx.moveTo(240,y);ctx.bezierCurveTo(280,y+25,350,y-28,405,y+5);}ctx.stroke();ctx.strokeStyle='#fff3d54a';ctx.lineWidth=1;ctx.stroke();}
function aubergine(ctx,rng){
  for(let i=0;i<2;i++){ctx.save();ctx.translate(290+i*69,320);ctx.rotate(i?.35:-.2);ellipse(ctx,4,9,68,152,'#0008');ellipse(ctx,0,0,64,151,'#272019');ellipse(ctx,0,-4,54,137,radial(ctx,0,-4,142,['#c59d60','#b17a3e','#654326','#251f16']));for(let j=0;j<13;j++){ctx.strokeStyle=j%2?'#5b342b90':'#ebc38940';ctx.lineWidth=2+rng()*6;ctx.beginPath();const y=-112+j*19;ctx.moveTo(-42,y);ctx.bezierCurveTo(-20,y+10,18,y-10,43,y+8);ctx.stroke();}for(let j=0;j<110;j++){const x=(rng()-.5)*83,y=(rng()-.5)*234;ellipse(ctx,x,y,1+rng()*4,1+rng()*3,'#35201970');}ctx.restore();}
  drizzle(ctx,'#e9d8ae');seeds(ctx,rng,42,135);garnish(ctx,rng,16,145);
}
function rice(ctx,rng){for(let i=0;i<1450;i++){const a=rng()*TAU,r=Math.sqrt(rng())*151,x=320+Math.cos(a)*r,y=320+Math.sin(a)*r,angle=rng()*TAU;ellipse(ctx,x+1,y+2,2.2,5.5,'#70511b44',angle);ellipse(ctx,x,y,1.5+rng(),4+rng()*2,['#cfaa56','#f6dea0','#e2c477','#b98f42'][Math.floor(rng()*4)],angle);if(i%3===0)ellipse(ctx,x-.7,y-1,.6,2.7,'#fff3c586',angle);}}
function chicken(ctx,rng){rice(ctx,rng);for(let i=0;i<3;i++){const x=269+(i%2)*87,y=280+Math.floor(i/2)*99;blob(ctx,x+4,y+9,62,47,'#2e1709a0',rng,i*.5);blob(ctx,x,y,59,43,radial(ctx,x,y,70,['#dcaf6a','#b8783c','#7b391f','#3b2116']),rng,i*.5);for(let j=0;j<5;j++){ctx.save();ctx.translate(x,y);ctx.rotate(-.5);ctx.strokeStyle='#3d21159c';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-36,-28+j*12);ctx.lineTo(34,-20+j*12);ctx.stroke();ctx.restore();}for(let j=0;j<60;j++)ellipse(ctx,x+(rng()-.5)*81,y+(rng()-.5)*55,1+rng()*3,1+rng()*2,'#f1c38130');}garnish(ctx,rng,12);lemon(ctx,408,403);}
function lemon(ctx,x,y){ellipse(ctx,x,y,35,35,'#c7a249');ellipse(ctx,x,y,30,30,'#d9c776');for(let i=0;i<8;i++){ctx.strokeStyle='#f5e9ac90';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+Math.cos(i/8*TAU)*28,y+Math.sin(i/8*TAU)*28);ctx.stroke();}}
function cauliflower(ctx,rng){rice(ctx,rng);for(let i=0;i<27;i++){const a=rng()*TAU,r=Math.sqrt(rng())*100,x=320+Math.cos(a)*r,y=320+Math.sin(a)*r;ellipse(ctx,x+3,y+6,22,20,'#48291670');blob(ctx,x,y,15+rng()*14,16+rng()*12,radial(ctx,x,y,28,['#e2ba75','#c98c42','#96532a']),rng);for(let j=0;j<8;j++){const dx=(rng()-.5)*25,dy=(rng()-.5)*25;ellipse(ctx,x+dx,y+dy,3,4,'#6b3a2440');}}garnish(ctx,rng,17);seeds(ctx,rng,20);}
function salad(ctx,rng){for(let i=0;i<115;i++){const a=rng()*TAU,r=Math.sqrt(rng())*147;leaf(ctx,320+Math.cos(a)*r,320+Math.sin(a)*r,rng()*TAU,10+rng()*17);}for(let i=0;i<15;i++){const a=rng()*TAU,r=Math.sqrt(rng())*130,x=320+Math.cos(a)*r,y=320+Math.sin(a)*r;ellipse(ctx,x+2,y+3,17,13,'#20170960');ellipse(ctx,x,y,16,12,radial(ctx,x,y,18,['#f39155','#b5432a','#762f20']),a);ctx.strokeStyle='#f2c88b70';ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(x,y,11,7,a,0,TAU);ctx.stroke();}for(let i=0;i<12;i++){const a=rng()*TAU,r=rng()*135,x=320+Math.cos(a)*r,y=320+Math.sin(a)*r;blob(ctx,x,y,15,20,radial(ctx,x,y,22,['#c59b61','#805733']),rng,a);}flecks(ctx,rng,120,147,['#bba06e','#703824'],1.5);}
function cake(ctx,rng){ctx.save();ctx.translate(320,320);ctx.rotate(-.25);ctx.fillStyle='#32211180';ctx.fillRect(-77,-84,171,200);const g=ctx.createLinearGradient(-80,0,80,0);g.addColorStop(0,'#6f6b35');g.addColorStop(.5,'#bab06b');g.addColorStop(1,'#8e8649');ctx.fillStyle=g;ctx.fillRect(-82,-104,164,197);ctx.fillStyle='#59662e';ctx.fillRect(-82,-104,164,24);ctx.save();ctx.beginPath();ctx.rect(-81,-103,162,185);ctx.clip();for(let i=0;i<1400;i++)ellipse(ctx,(rng()-.5)*165,-104+rng()*196,rng()*2+1,rng()*2+1,['#d2c28790','#48572580','#ddcc9950'][Math.floor(rng()*3)]);ctx.restore();ctx.strokeStyle='#e6bd7760';ctx.lineWidth=3;ctx.strokeRect(-81,-103,162,196);ctx.restore();flecks(ctx,rng,130,170,['#869450','#b7b46f','#d4be81'],2);oil(ctx,136,145);garnish(ctx,rng,4,145);}
function baklava(ctx,rng){for(let i=0;i<4;i++){ctx.save();ctx.translate(273+(i%2)*94,270+Math.floor(i/2)*104);ctx.rotate(-.1);ctx.fillStyle='#3d281780';ctx.fillRect(-37,-37,84,89);ctx.fillStyle='#bd8741';ctx.fillRect(-40,-43,80,85);for(let j=0;j<11;j++){ctx.strokeStyle=j%2?'#eed39c':'#895523';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-40,-40+j*7);ctx.lineTo(40,-35+j*7);ctx.stroke();}ctx.fillStyle='#dbb474';ctx.beginPath();ctx.moveTo(-40,-43);ctx.lineTo(15,-48);ctx.lineTo(41,-39);ctx.lineTo(-12,-35);ctx.closePath();ctx.fill();for(let j=0;j<50;j++)ellipse(ctx,(rng()-.5)*62,-37+rng()*60,2,1,['#8c6b32','#bea777','#626f37'][j%3],rng()*TAU);ctx.restore();}oil(ctx,146,140);}
function icecream(ctx,rng){for(let i=0;i<2;i++){const x=280+i*78,y=304+i*44;ellipse(ctx,x+6,y+9,75,70,'#39241160');blob(ctx,x,y,72,65,radial(ctx,x,y,83,i?['#dedfba','#b6bf8d','#899968']:['#f5dfcf','#e4c2b1','#b48f7b']),rng);for(let j=0;j<80;j++){const a=rng()*TAU,r=Math.sqrt(rng())*61;ellipse(ctx,x+Math.cos(a)*r,y+Math.sin(a)*r,rng()*5+1,1.5,'#fff4d728',a);}}flecks(ctx,rng,90,120,['#617235','#a5a35d','#a95750','#c57978'],2.5);garnish(ctx,rng,4,135);}
function glass(ctx,rng,lemonade=false){const x=320,y=320;ellipse(ctx,x+14,y+22,144,144,radial(ctx,x+14,y+22,150,['#0008','#0000']));ellipse(ctx,x,y,126,126,'#d3b99122');ellipse(ctx,x,y,111,111,radial(ctx,x,y,113,lemonade?['#c7a669','#8c7650','#51412b']:['#c4612e','#943920','#491b11']));for(let i=0;i<7;i++){const a=i*.92,r=30+rng()*51,ix=x+Math.cos(a)*r,iy=y+Math.sin(a)*r;ctx.save();ctx.translate(ix,iy);ctx.rotate(a);ctx.fillStyle='#ffe1b737';ctx.fillRect(-22,-22,44,44);ctx.strokeStyle='#fff1d060';ctx.strokeRect(-22,-22,44,44);ctx.restore();}ctx.strokeStyle='#f7e8c970';ctx.lineWidth=4;ctx.beginPath();ctx.arc(x,y,121,-2.6,.1);ctx.stroke();ctx.strokeStyle='#c6b38d30';ctx.lineWidth=3;ctx.beginPath();ctx.arc(x,y,115,0,TAU);ctx.stroke();lemon(ctx,378,258);for(let i=0;i<60;i++){const a=rng()*TAU,r=rng()*100;ellipse(ctx,x+Math.cos(a)*r,y+Math.sin(a)*r,1,1,'#f4d7a550');}ctx.strokeStyle='#879467';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(245,386);ctx.lineTo(370,257);ctx.stroke();for(let i=0;i<14;i++)leaf(ctx,250+i*8,378-i*8,-.8+i%2*1.7,7);}
function tea(ctx,rng,coffee=false){plate(ctx,rng);ctx.strokeStyle='#b59b66';ctx.lineWidth=19;ctx.beginPath();ctx.ellipse(438,320,37,50,0,0,TAU);ctx.stroke();ellipse(ctx,320,320,119,119,radial(ctx,320,320,120,['#e5d6b5','#d9c8a2','#b9a681','#efe0bd']));ellipse(ctx,320,320,94,94,radial(ctx,320,320,98,coffee?['#4e2e18','#2d1b10','#704a26']:['#b99b4f','#746a31','#403c20']));if(coffee){flecks(ctx,rng,280,89,['#bea37650','#8a6b4190'],1.5);}else{for(let i=0;i<10;i++)leaf(ctx,270+rng()*100,270+rng()*100,rng()*TAU,14+rng()*8);}ctx.strokeStyle='#f2d9a350';ctx.lineWidth=3;ctx.beginPath();ctx.arc(320,320,91,-2.6,-.6);ctx.stroke();}

export function dishArt(id) {
  if(cache.has(id))return cache.get(id);
  const canvas=surface(),ctx=canvas.getContext('2d');
  if(!ctx)return canvas;
  const rng=random([...id].reduce((v,c)=>v+c.charCodeAt(0)*79,17));
  const dark=['aubergine','carrots','chicken','cauliflower','salad','cake','baklava'].includes(id);
  if(id==='tea'||id==='coffee')tea(ctx,rng,id==='coffee');
  else if(id==='citrus'||id==='lemonade')glass(ctx,rng,id==='lemonade');
  else {plate(ctx,rng,dark);switch(id){case'hummus':creamy(ctx,rng);break;case'labneh':creamy(ctx,rng,true);break;case'bread':bread(ctx,rng);break;case'carrots':carrots(ctx,rng);break;case'aubergine':aubergine(ctx,rng);break;case'chicken':chicken(ctx,rng);break;case'cauliflower':cauliflower(ctx,rng);break;case'salad':salad(ctx,rng);break;case'cake':cake(ctx,rng);break;case'baklava':baklava(ctx,rng);break;case'icecream':icecream(ctx,rng);break;}}
  if(['hummus','labneh','carrots','aubergine','chicken','cauliflower','salad'].includes(id))glossyOil(ctx,rng);
  canvas.dataset.artId=id;
  cache.set(id,canvas);return canvas;
}
export function paintDish(canvas,id){const ctx=canvas.getContext('2d');if(!ctx)return;canvas.width=canvas.height=640;ctx.clearRect(0,0,640,640);ctx.drawImage(dishArt(id),0,0);}
export function breadArt(){const c=surface(),ctx=c.getContext('2d');if(ctx)bread(ctx,random(42));return c;}
export function waterGlassArt(){
  const c=surface(),ctx=c.getContext('2d');if(!ctx)return c;
  ellipse(ctx,339,352,206,197,radial(ctx,339,352,215,['#0007','#0000']));
  ellipse(ctx,320,320,162,162,radial(ctx,320,320,175,['#dfc7a21a','#9da28a24','#211d1122','#f1dfb542']));
  ctx.lineWidth=4;ctx.strokeStyle='#e7dec080';ctx.beginPath();ctx.arc(320,320,165,0,TAU);ctx.stroke();
  ctx.strokeStyle='#fff7e5ab';ctx.lineWidth=5;ctx.beginPath();ctx.arc(320,320,155,-2.8,-.4);ctx.stroke();ctx.lineWidth=2;ctx.beginPath();ctx.arc(320,320,149,.5,1.4);ctx.stroke();
  ellipse(ctx,233,243,14,42,'#fff9e638',-.65);
  ctx.strokeStyle='#e9d7b24d';ctx.lineWidth=1.5;for(let i=0;i<14;i++){const a=i/14*TAU;ctx.beginPath();ctx.moveTo(320+Math.cos(a)*143,320+Math.sin(a)*143);ctx.lineTo(320+Math.cos(a)*160,320+Math.sin(a)*160);ctx.stroke();}
  return c;
}
export function oilBowlArt(){
  const c=surface(),ctx=c.getContext('2d');if(!ctx)return c;
  ellipse(ctx,331,345,204,195,radial(ctx,331,345,205,['#0008','#0000']));
  ellipse(ctx,320,320,163,163,radial(ctx,320,320,175,['#6e6c4e','#404430','#b4a279','#323928']));
  ellipse(ctx,320,320,134,134,radial(ctx,320,320,141,['#b89c3c','#8a791f','#515019']));
  ctx.strokeStyle='#efd78b7a';ctx.lineWidth=3;ctx.beginPath();ctx.arc(320,320,132,-2.8,-.5);ctx.stroke();
  ctx.strokeStyle='#ffeab356';ctx.lineWidth=7;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(245,264);ctx.bezierCurveTo(270,239,321,232,351,245);ctx.stroke();
  leaf(ctx,351,363,-.4,24);leaf(ctx,373,339,.6,18);flecks(ctx,random(25),75,112,['#565324','#c3a55a','#e5c67b'],1.4);
  return c;
}
export function teapotArt(){
  const c=surface(),ctx=c.getContext('2d');if(!ctx)return c;
  ellipse(ctx,327,355,245,180,radial(ctx,327,355,250,['#0008','#0000']));
  ctx.strokeStyle='#af8452';ctx.lineWidth=24;ctx.beginPath();ctx.ellipse(460,320,60,98,-.1,0,TAU);ctx.stroke();
  ctx.beginPath();ctx.moveTo(210,340);ctx.bezierCurveTo(146,312,147,218,105,205);ctx.lineTo(112,183);ctx.bezierCurveTo(200,203,165,230,243,258);ctx.closePath();ctx.fillStyle='#a37642';ctx.fill();
  ellipse(ctx,325,325,143,160,radial(ctx,325,325,170,['#dfbd82','#aa7741','#66442a']));
  ellipse(ctx,325,318,91,95,radial(ctx,325,318,110,['#e3c591','#c1975e','#765333']));
  ellipse(ctx,324,319,21,23,radial(ctx,324,319,26,['#e0bb78','#725133']));
  ctx.strokeStyle='#f5dca780';ctx.lineWidth=2;ctx.beginPath();ctx.arc(325,319,88,-2.8,-.6);ctx.stroke();
  const rng=random(355);ctx.save();ctx.beginPath();ctx.ellipse(325,325,141,157,0,0,TAU);ctx.clip();flecks(ctx,rng,1600,170,['#29170818','#ffe9b527'],1.2);ctx.restore();return c;
}
