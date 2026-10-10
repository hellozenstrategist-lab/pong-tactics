import {RULES,SPELLS} from './rules.js';
import {WORLD,WALLS,SITES,RELAY,distance,lineClear,clamp} from './world.js';
// Glitch-punk / anime cel renderer. Pure presentation: never touches engine state or combat RNG.
const INK='#07020f',CYAN='#00f0ff',PINK='#ff2a6d',ACID='#f5ff3b',VIOLET='#a46bff',WHITE='#f4f1ff';
const TEAM=[{neon:CYAN,glow:'#00f0ff',jacket:'#14203f',trim:ACID,hair:'#e9f6ff',hairShade:'#7fb6e6',iris:'#00d9ff',scarf:CYAN,label:'#aef8ff'},
 {neon:PINK,glow:'#ff2a6d',jacket:'#2a0f2c',trim:'#ff9a3c',hair:'#1b0d26',hairShade:'#5d2a6e',iris:'#ff2a6d',scarf:PINK,label:'#ffb3cb'}];
const FAMILIAR=[{body:'#1a1036',neon:VIOLET,eye:CYAN},{body:'#2c0a24',neon:'#ff7ac8',eye:PINK}];
const KANA='アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0101';
const SFX={damage:['ドン!','ズバッ','ガッ!'],perfect:['キン!'],clash:['ゴゴゴ'],death:['グシャ'],heal:['キラ'],proof:['解読'],nova:['ドドド'],wardBreak:['パリン']};
const hash=n=>{const s=Math.sin(n*127.1+311.7)*43758.5453;return s-Math.floor(s);};
export class ArenaRenderer{
 constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.effects=[];this.camera={x:1120,y:770,zoom:.8};this.shake=0;this.glitch=0;this.flash=0;this.motion=[{},{}];this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;this.layer=this.bake();this.resize();new ResizeObserver(()=>this.resize()).observe(canvas);}
 resize(){const b=this.canvas.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);this.dpr=d;this.w=b.width;this.h=b.height;this.canvas.width=this.w*d;this.canvas.height=this.h*d;this.ctx.setTransform(d,0,0,d,0,0);}
 view(playing){const bottom=this.w<800?172:145;return {x:this.w/2,y:64+(this.h-64-(playing?bottom:0))/2,height:this.h-64-bottom};}
 screenToWorld(x,y){const v=this.view(true),c=this.camera;return {x:(x-v.x)/c.zoom+c.x,y:(y-v.y)/c.zoom+c.y};}
 event(e,engine){if(['damage','perfect','release','nova','wardBreak','clash','clashEnd','heal','death','proof'].includes(e.type)){const a=engine.actors[e.actor??0];this.effects.push({...e,x:a.x,y:a.y,at:performance.now()/1000,seed:Math.random()});}
  if(['damage','clashEnd'].includes(e.type))this.shake=e.type==='clashEnd'?9:4;
  if(['damage','death','clash','clashEnd','perfect'].includes(e.type))this.glitch=Math.max(this.glitch,e.type==='damage'?.45:1);
  if(['clash','clashEnd','perfect','death'].includes(e.type))this.flash=e.type==='perfect'?.06:.1;}
 // Static arena art is baked once into an offscreen layer when the platform supports it.
 bake(){try{const scale=1.5,cv=typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(WORLD.width*scale,WORLD.height*scale):document.createElement('canvas');if(!cv.getContext)return null;cv.width=WORLD.width*scale;cv.height=WORLD.height*scale;const ctx=cv.getContext('2d');if(!ctx)return null;ctx.scale(scale,scale);const keep=this.ctx;this.ctx=ctx;this.floor();for(const wall of WALLS)this.wall(wall);this.ctx=keep;return cv;}catch{return null;}}
 draw(now,engine,playing){const c=this.ctx,w=this.w,h=this.h,t=now/1000,v=this.view(playing),cam=this.camera;c.clearRect(0,0,w,h);c.fillStyle=INK;c.fillRect(0,0,w,h);
  if(playing&&engine){const a=engine.actors[0];cam.zoom=.82;const x=clamp(a.x,w/(2*cam.zoom),WORLD.width-w/(2*cam.zoom)),y=clamp(a.y,v.height/(2*cam.zoom),WORLD.height-v.height/(2*cam.zoom));cam.x+=(x-cam.x)*.12;cam.y+=(y-cam.y)*.12;}else{cam.x=1120;cam.y=770;cam.zoom=Math.min(w/WORLD.width,h/WORLD.height)*.95;}
  c.save();c.translate(v.x,v.y);if(this.shake>.05&&!this.reduced){c.translate(Math.sin(t*121)*this.shake,Math.cos(t*113)*this.shake);this.shake*=.87;}c.scale(cam.zoom,cam.zoom);c.translate(-cam.x,-cam.y);
  if(this.layer)c.drawImage(this.layer,0,0,WORLD.width,WORLD.height);else{this.floor();for(const wall of WALLS)this.wall(wall);}
  this.floorLive(t);for(const s of SITES)this.site(s,t,engine);this.relay(t);
  if(engine){for(const z of engine.zones)this.zone(z,t);
   for(const d of engine.decoys){c.save();c.globalAlpha=.4+(this.reduced?0:Math.sin(t*30)*.12);this.human({...d,facing:0,ward:0,hp:100},d.from,t,engine.time,true);c.restore();}
   for(const p of engine.projectiles)this.projectile(p,t);
   const order=[0,1].filter(i=>!i||!(!lineClear(engine.actors[0],engine.actors[i])||distance(engine.actors[0],engine.actors[i])>850)||engine.clash).sort((p,q)=>engine.actors[p].y-engine.actors[q].y);
   for(const i of order){const a=engine.actors[i];this.human(a,i,t,engine.time);this.familiar(a,i,t);}
  }else{const demo=[{x:920,y:760,facing:.3,hp:100,ward:0,cast:{kind:'thinking',start:0},name:'NYX'},{x:1430,y:830,facing:Math.PI-.3,hp:100,ward:0,cast:null,name:'MONK'}];demo.forEach((a,i)=>{this.human(a,i,t,0);this.familiar(a,i,t);});}
  this.effects=this.effects.filter(e=>t-e.at<1.5);for(const e of this.effects)this.effect(e,t,engine);
  if(engine&&playing){const a=engine.actors[0],radius=640;const fog=c.createRadialGradient(a.x,a.y,240,a.x,a.y,radius);fog.addColorStop(0,'#0a021800');fog.addColorStop(.7,'#0a021888');fog.addColorStop(1,'#05010cd8');c.fillStyle=fog;c.fillRect(0,0,WORLD.width,WORLD.height);}
  c.restore();
  if(!playing)this.keyArt(t);
  this.post(t,playing);
  if(playing&&engine)this.minimap(engine,t);
 }
 // ---------- arena ----------
 floor(){const c=this.ctx,W=WORLD.width,H=WORLD.height;const g=c.createLinearGradient(0,0,W,H);g.addColorStop(0,'#0e0420');g.addColorStop(.5,'#120a2c');g.addColorStop(1,'#08061a');c.fillStyle=g;c.fillRect(0,0,W,H);
  // Neon street lanes.
  c.save();c.globalAlpha=.5;for(const [x,y,ww,hh,col] of [[0,700,W,140,'#1c0f3a'],[1050,0,140,H,'#160c33'],[480,0,90,H,'#140a2c']]){c.fillStyle=col;c.fillRect(x,y,ww,hh);}c.restore();
  c.lineWidth=1;for(let x=0;x<=W;x+=80){c.strokeStyle=x%320?'#2b1d5244':'#00f0ff1c';c.beginPath();c.moveTo(x,0);c.lineTo(x,H);c.stroke();}for(let y=0;y<=H;y+=80){c.strokeStyle=y%320?'#2b1d5244':'#ff2a6d18';c.beginPath();c.moveTo(0,y);c.lineTo(W,y);c.stroke();}
  // Halftone clouds, manga style.
  for(const [cx,cy,r,col] of [[220,1340,420,PINK],[2050,220,380,CYAN],[1120,770,300,VIOLET],[1900,1400,260,ACID]]){for(let y=cy-r;y<cy+r;y+=14)for(let x=cx-r;x<cx+r;x+=14){const o=(Math.floor((y-cy)/14)%2)*7,d=Math.hypot(x+o-cx,y-cy)/r;if(d>=1)continue;c.fillStyle=col+'26';c.beginPath();c.arc(x+o,y,(1-d)*4.2,0,Math.PI*2);c.fill();}}
  // Giant floor graffiti.
  c.save();c.textAlign='center';c.textBaseline='middle';for(const [txt,x,y,size,rot,col] of [['決闘',1120,1300,190,-.08,PINK],['侵入',300,1050,150,.12,CYAN],['ジャオヤ',1780,640,120,-.18,VIOLET],['GLITCH//',640,260,90,.05,ACID],['NO GODS',1650,180,70,-.04,PINK]]){c.save();c.translate(x,y);c.rotate(rot);c.font=`900 ${size}px "Arial Black",Impact,sans-serif`;c.globalAlpha=.07;c.fillStyle=col;c.fillText(txt,6,6);c.globalAlpha=.1;c.strokeStyle=col;c.lineWidth=3;c.strokeText(txt,0,0);c.restore();}c.restore();
  // Cracks and drips.
  c.strokeStyle='#00000099';c.lineWidth=2;for(let n=0;n<26;n++){let x=hash(n)*W,y=hash(n+50)*H;c.beginPath();c.moveTo(x,y);for(let k=0;k<4;k++){x+=(hash(n*7+k)-.5)*90;y+=(hash(n*9+k)-.5)*90;c.lineTo(x,y);}c.stroke();}
  for(let n=0;n<90;n++){const x=hash(n+200)*W,y=hash(n+400)*H;c.fillStyle=[CYAN,PINK,ACID,VIOLET][n%4]+'30';c.fillRect(x,y,hash(n)*14+2,2);}
  // Midlane plate with hazard stripes.
  c.save();c.fillStyle='#0b0418cc';c.fillRect(870,690,500,180);c.beginPath();c.rect(870,690,500,180);c.clip();c.fillStyle=ACID+'22';for(let x=850;x<1400;x+=34){c.beginPath();c.moveTo(x,690);c.lineTo(x+16,690);c.lineTo(x-4,710);c.lineTo(x-20,710);c.fill();c.beginPath();c.moveTo(x,850);c.lineTo(x+16,850);c.lineTo(x-4,870);c.lineTo(x-20,870);c.fill();}c.restore();
  c.strokeStyle=PINK+'66';c.lineWidth=2;c.strokeRect(885,712,470,136);c.font='900 13px "Arial Black",Impact,sans-serif';c.textAlign='center';c.fillStyle=CYAN+'88';c.fillText('THE CONTESTED MIDLANE',1120,742);c.font='11px monospace';c.fillStyle=PINK+'77';c.fillText('// 争奪区域 · NO SAFE FRAMES',1120,762);
  // Arena frame: ink, neon double rule.
  c.strokeStyle=INK;c.lineWidth=18;c.strokeRect(9,9,W-18,H-18);c.lineWidth=3;c.strokeStyle=PINK+'aa';c.strokeRect(20,20,W-40,H-40);c.lineWidth=1.5;c.strokeStyle=CYAN+'66';c.strokeRect(28,28,W-56,H-56);
  for(let x=60;x<W-60;x+=120){c.fillStyle=ACID+'55';c.fillRect(x,14,40,4);c.fillRect(x+60,H-18,40,4);}
 }
 wall(w,i=WALLS.indexOf(w)){const c=this.ctx,depth=18;
  c.fillStyle='#00000099';c.fillRect(w.x+14,w.y+16,w.w,w.h+depth);
  c.fillStyle='#120826';c.fillRect(w.x,w.y+w.h,w.w,depth);c.fillStyle=PINK+'33';c.fillRect(w.x,w.y+w.h+depth-3,w.w,3);
  const g=c.createLinearGradient(w.x,w.y,w.x+w.w*.4,w.y+w.h);g.addColorStop(0,'#3a2a66');g.addColorStop(.55,'#241845');g.addColorStop(1,'#1a1134');c.fillStyle=g;c.fillRect(w.x,w.y,w.w,w.h);
  // Cel highlight band.
  c.fillStyle='#ffffff10';c.beginPath();c.moveTo(w.x,w.y);c.lineTo(w.x+w.w*.55,w.y);c.lineTo(w.x,w.y+Math.min(w.h,w.w)*.55);c.fill();
  c.save();c.beginPath();c.rect(w.x,w.y,w.w,w.h);c.clip();
  if(i%2===0){c.fillStyle=ACID+'cc';for(let x=w.x-20;x<w.x+w.w+20;x+=18){c.beginPath();c.moveTo(x,w.y);c.lineTo(x+9,w.y);c.lineTo(x+1,w.y+9);c.lineTo(x-8,w.y+9);c.fill();}c.fillStyle=INK;c.fillRect(w.x,w.y+9,w.w,2);}
  c.font=`900 ${Math.min(26,w.w*.3)}px "Arial Black",Impact,sans-serif`;c.textAlign='center';c.textBaseline='middle';const tag=['ナ','JAO','ヤ','死','404','闇','NULL','電','ア','RIOT','零','CTRL','ガ','鬼','zz','夢'][i%16];c.save();c.translate(w.x+w.w/2,w.y+w.h/2);c.rotate(w.h>w.w?-Math.PI/2+.08:-.06);c.fillStyle=(i%3?PINK:CYAN)+'40';c.fillText(tag,0,0);c.restore();
  c.restore();
  c.strokeStyle=INK;c.lineWidth=3;c.strokeRect(w.x,w.y,w.w,w.h+depth);
  c.strokeStyle=(i%3?CYAN:PINK)+'aa';c.lineWidth=1.5;c.beginPath();c.moveTo(w.x+3,w.y+w.h-3);c.lineTo(w.x+3,w.y+3);c.lineTo(w.x+w.w-3,w.y+3);c.stroke();
  for(let n=0;n<3;n++){c.fillStyle=n===i%3?ACID:'#ffffff30';c.fillRect(w.x+w.w-14-n*7,w.y+w.h-10,4,4);}
 }
 floorLive(t){const c=this.ctx;if(this.reduced)return;
  // Drifting data rain and flickering neon seams.
  c.save();c.font='bold 14px monospace';c.textAlign='center';for(let n=0;n<46;n++){const x=hash(n+900)*WORLD.width,speed=30+hash(n+1)*60,y=(hash(n+700)*WORLD.height+t*speed)%WORLD.height,ch=KANA[(n+Math.floor(t*4+hash(n)*9))%KANA.length];c.globalAlpha=.12+.1*Math.sin(t*3+n);c.fillStyle=n%3?CYAN:PINK;c.fillText(ch,x,y);}c.restore();
  const flick=Math.sin(t*17)*Math.sin(t*3.3)>.6?.25:.85;c.save();c.globalAlpha=flick;c.strokeStyle=CYAN;c.shadowColor=CYAN;c.shadowBlur=12;c.lineWidth=2;c.beginPath();c.moveTo(40,700);c.lineTo(WORLD.width-40,700);c.stroke();c.strokeStyle=PINK;c.shadowColor=PINK;c.beginPath();c.moveTo(40,840);c.lineTo(WORLD.width-40,840);c.stroke();c.restore();}
 ring(x,y,r,color,opacity=1,width=1.5){const c=this.ctx;c.save();c.globalAlpha*=opacity;c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.stroke();c.restore();}
 poly(x,y,r,n,rot=0){const c=this.ctx;c.beginPath();for(let k=0;k<n;k++){const a=rot+k/n*Math.PI*2;c.lineTo(x+Math.cos(a)*r,y+Math.sin(a)*r);}c.closePath();}
 burst(x,y,r1,r2,n,rot=0){const c=this.ctx;c.beginPath();for(let k=0;k<n*2;k++){const a=rot+k/(n*2)*Math.PI*2,r=k%2?r2:r1;c.lineTo(x+Math.cos(a)*r,y+Math.sin(a)*r);}c.closePath();}
 label(text,x,y,size,fill,stroke=INK,align='center'){const c=this.ctx;c.font=`italic 900 ${size}px "Arial Black",Impact,sans-serif`;c.textAlign=align;c.lineJoin='round';c.lineWidth=Math.max(3,size*.22);c.strokeStyle=stroke;c.strokeText(text,x,y);c.fillStyle=fill;c.fillText(text,x,y);}
 site(s,t,engine){const c=this.ctx,proof=engine?.actors[0].proof?.siteId===s.id?engine.actors[0]:null,spin=this.reduced?0:t;c.save();c.translate(s.x,s.y);
  c.fillStyle=proof?'#00f0ff16':'#1c0d3a99';this.poly(0,0,98,6,Math.PI/6);c.fill();c.strokeStyle=INK;c.lineWidth=5;c.stroke();c.strokeStyle=proof?CYAN:s.color+'88';c.lineWidth=2;c.stroke();
  c.setLineDash([10,8]);c.lineDashOffset=-spin*20;this.ring(0,0,78,s.color,.55,2);c.setLineDash([]);
  c.save();c.rotate(spin*.6);c.strokeStyle=s.color+'aa';c.lineWidth=2;c.strokeRect(-22,-22,44,44);c.rotate(Math.PI/4);c.strokeRect(-18,-18,36,36);c.restore();
  if(proof){c.save();c.shadowColor=CYAN;c.shadowBlur=30;this.burst(0,0,30,12,4,spin);c.fillStyle=CYAN;c.fill();c.restore();}else{c.fillStyle=s.color+'cc';this.burst(0,0,14,5,4,Math.PI/4);c.fill();}
  this.label(s.name.toUpperCase(),0,-114,13,proof?CYAN:WHITE);c.font='bold 9px monospace';c.textAlign='center';c.fillStyle=proof?ACID:'#9a8fc4';c.fillText(proof?'▶ FLAG PROOF VERIFIED ◀':'CANDIDATE SITE · 候補',0,124);
  if(proof&&proof.capture>0){c.save();c.shadowColor=CYAN;c.shadowBlur=18;c.strokeStyle=CYAN;c.lineWidth=7;c.beginPath();c.arc(0,0,92,-Math.PI/2,-Math.PI/2+proof.capture/RULES.captureTime*Math.PI*2);c.stroke();c.restore();}c.restore();}
 relay(t){const c=this.ctx,x=RELAY.x,y=RELAY.y,spin=this.reduced?0:t;c.save();c.translate(x,y);
  c.fillStyle='#a46bff14';c.beginPath();c.arc(0,0,64,0,Math.PI*2);c.fill();this.ring(0,0,60,INK,1,6);this.ring(0,0,60,VIOLET,.85,2);
  c.save();c.rotate(-spin*.4);c.setLineDash([3,9]);this.ring(0,0,47,CYAN,.6,3);c.restore();c.setLineDash([]);
  // Pylon with a floating data core.
  c.save();c.rotate(spin*.5);c.shadowColor=VIOLET;c.shadowBlur=22;c.strokeStyle=VIOLET;c.lineWidth=3;c.strokeRect(-16,-16,32,32);c.rotate(Math.PI/4);c.strokeStyle=PINK;c.strokeRect(-12,-12,24,24);c.restore();
  const bob=this.reduced?0:Math.sin(t*2.4)*3;c.fillStyle=WHITE;c.shadowColor=CYAN;c.shadowBlur=16;this.poly(0,bob,7,4);c.fill();c.shadowBlur=0;
  for(let k=0;k<6;k++){const a=k/6*Math.PI*2+spin;c.fillStyle=k%2?CYAN:PINK;c.font='bold 11px monospace';c.textAlign='center';c.fillText(KANA[(k*7+Math.floor(spin*2))%KANA.length],Math.cos(a)*36,Math.sin(a)*36+4);}
  c.restore();this.label('NOETIC RELAY',x,y-78,12,VIOLET);c.font='bold 9px monospace';c.textAlign='center';c.fillStyle='#c6b4ff';c.fillText('APPROACH · SCAN // 接続',x,y+84);}
 zone(z,t){const c=this.ctx,col=z.from===0?CYAN:PINK,spin=this.reduced?0:t;c.save();c.translate(z.x,z.y);const g=c.createRadialGradient(0,0,10,0,0,z.radius);g.addColorStop(0,col+'05');g.addColorStop(1,col+'2a');c.fillStyle=g;c.beginPath();c.arc(0,0,z.radius,0,Math.PI*2);c.fill();
  c.setLineDash([14,10]);c.lineDashOffset=spin*40;this.ring(0,0,z.radius,col,.8,2);c.setLineDash([]);c.rotate(spin*1.4);for(let k=0;k<3;k++){c.rotate(Math.PI*2/3);c.strokeStyle=col+'66';c.lineWidth=2;c.beginPath();c.arc(0,0,z.radius*.55,0,1.2);c.stroke();}c.restore();}
 projectile(p,t){const c=this.ctx,color=SPELLS[p.action].color,ang=Math.atan2(p.vy,p.vx),len=Math.hypot(p.vx,p.vy)*.11;c.save();c.translate(p.x,p.y);c.rotate(ang);
  const g=c.createLinearGradient(-len,0,0,0);g.addColorStop(0,color+'00');g.addColorStop(1,color+'cc');c.fillStyle=g;c.beginPath();c.moveTo(-len,0);c.lineTo(0,-p.radius*.9);c.lineTo(p.radius*.4,0);c.lineTo(0,p.radius*.9);c.closePath();c.fill();
  if(!this.reduced)for(let k=0;k<4;k++){const ox=-hash(p.id*13+k+Math.floor(t*20))*len,oy=(hash(p.id+k*3+Math.floor(t*24))-.5)*p.radius*2;c.fillStyle=k%2?WHITE:color;c.fillRect(ox,oy,6,2);}
  c.shadowColor=color;c.shadowBlur=24;c.fillStyle=color;this.burst(0,0,p.radius,p.radius*.55,p.action==='rift'?6:4,this.reduced?0:t*8);c.fill();c.fillStyle=WHITE;c.beginPath();c.arc(0,0,p.radius*.4,0,Math.PI*2);c.fill();c.restore();}
 // ---------- characters ----------
 // Anime summoner, drawn upright (3/4 view) at the actor's feet. Facing turns eyes, scarf and blade.
 chibi(i,facing,opts={}){const c=this.ctx,T=TEAM[i],t=opts.t||0,walk=opts.walk||0,moving=opts.moving||0,dir=Math.cos(facing)>=0?1:-1,back=Math.sin(facing)<-.55,look=Math.cos(facing)*3.5,stepA=Math.sin(walk)*5*moving,stepB=-stepA;
  c.lineJoin='round';c.lineCap='round';
  // Scarf streams opposite the facing direction.
  const sx=-Math.cos(facing),sy=-Math.sin(facing)*.4,wave=this.reduced?0:Math.sin(t*9+i)*4;c.strokeStyle=INK;c.lineWidth=8;c.beginPath();c.moveTo(0,-33);c.quadraticCurveTo(sx*18,-30+sy*18+wave,sx*34,-26+sy*30-wave);c.stroke();c.strokeStyle=T.scarf;c.lineWidth=5;c.stroke();
  // Legs.
  c.strokeStyle=INK;c.lineWidth=7;c.beginPath();c.moveTo(-5,-14);c.lineTo(-6+stepA*.4,-2+Math.min(0,stepA)*.3);c.moveTo(5,-14);c.lineTo(6+stepB*.4,-2+Math.min(0,stepB)*.3);c.stroke();c.strokeStyle='#2a2340';c.lineWidth=4;c.stroke();
  c.fillStyle=INK;c.fillRect(-10+stepA*.4,-4,8,4);c.fillRect(2+stepB*.4,-4,8,4);c.fillStyle=T.neon;c.fillRect(-9+stepA*.4,-2,6,1.5);c.fillRect(3+stepB*.4,-2,6,1.5);
  // Jacket.
  c.beginPath();c.moveTo(-11,-36);c.lineTo(11,-36);c.lineTo(14,-12);c.lineTo(-14,-12);c.closePath();c.fillStyle=T.jacket;c.fill();c.strokeStyle=INK;c.lineWidth=2.5;c.stroke();
  c.fillStyle='#ffffff14';c.beginPath();c.moveTo(-11*dir,-36);c.lineTo(-2*dir,-36);c.lineTo(-6*dir,-12);c.lineTo(-14*dir,-12);c.fill();
  c.strokeStyle=T.trim;c.lineWidth=1.5;c.beginPath();c.moveTo(0,-34);c.lineTo(0,-13);c.stroke();c.strokeStyle=T.neon;c.beginPath();c.moveTo(-13,-15);c.lineTo(13,-15);c.stroke();
  // Blade arm.
  const hx=Math.cos(facing)*13,hy=-24+Math.sin(facing)*6,swing=opts.swing,blade=swing!=null?facing+(swing-.5)*2.4:facing+.9*dir,bl=34;
  if(!opts.noBlade){c.strokeStyle=INK;c.lineWidth=5;c.beginPath();c.moveTo(0,-30);c.lineTo(hx,hy);c.stroke();c.strokeStyle=T.jacket;c.lineWidth=3;c.stroke();
   c.save();c.translate(hx,hy);c.rotate(blade);c.strokeStyle=INK;c.lineWidth=5;c.beginPath();c.moveTo(-2,0);c.lineTo(bl,0);c.stroke();c.strokeStyle=WHITE;c.lineWidth=2.5;c.beginPath();c.moveTo(2,0);c.lineTo(bl,0);c.stroke();c.shadowColor=T.glow;c.shadowBlur=10;c.strokeStyle=T.neon;c.lineWidth=1;c.beginPath();c.moveTo(6,-1.5);c.lineTo(bl-2,-1.5);c.stroke();c.shadowBlur=0;c.fillStyle=T.trim;c.fillRect(-1,-4,4,8);c.restore();}
  // Head: glitch ribbon, back hair, face, eyes, then fringe.
  const hy0=-48,wob=k=>k%2&&!this.reduced?Math.sin(t*6+k)*.6:0,hair=(pts,fill)=>{c.beginPath();pts.forEach(([x,y],k)=>k?c.lineTo(x*dir+wob(k),hy0+y):c.moveTo(x*dir,hy0+y));c.closePath();c.fillStyle=fill;c.fill();c.strokeStyle=INK;c.lineWidth=2.5;c.stroke();};
  const rib=this.reduced?0:Math.sin(t*10+i)*2;c.fillStyle=INK;c.fillRect(dir>0?-27:9,hy0-12+rib,18,5);c.fillStyle=T.neon;c.fillRect(dir>0?-26:10,hy0-11+rib,16,3);c.fillStyle=T.trim;c.fillRect(dir>0?-31:24,hy0-10-rib,6,2);
  hair([[-12,-16],[-16,-2],[-17,12],[-12,7],[-10,15],[-4,8],[4,8],[10,15],[12,7],[17,12],[16,-2],[12,-16],[0,-20]],T.hair);
  if(back)hair([[-13,-2],[-15,-9],[-10,-17],[-3,-21],[5,-20],[12,-15],[15,-6],[13,3],[8,10],[0,12],[-8,10]],T.hair);
  else{c.fillStyle='#ffe4dc';c.strokeStyle=INK;c.lineWidth=2.5;c.beginPath();c.ellipse(0,hy0,12,12.5,0,0,Math.PI*2);c.fill();c.stroke();
   for(const side of [-1,1]){const ex=side*5+look,ey=hy0+2.5,ix=ex+Math.cos(facing)*.8;c.fillStyle=WHITE;c.beginPath();c.ellipse(ex,ey,3.4,4.8,0,0,Math.PI*2);c.fill();const g=c.createLinearGradient(0,ey-4,0,ey+4);g.addColorStop(0,INK);g.addColorStop(1,T.iris);c.fillStyle=g;c.beginPath();c.ellipse(ix,ey+.6,2.6,4,0,0,Math.PI*2);c.fill();c.fillStyle=WHITE;c.fillRect(ix-1.6,ey-2.6,1.8,1.8);c.fillRect(ix+.6,ey+1.6,.9,.9);c.strokeStyle=INK;c.lineWidth=1.9;c.beginPath();c.moveTo(ex-4,ey-4.2);c.quadraticCurveTo(ex,ey-6.6,ex+4,ey-4.2);c.stroke();}
   c.fillStyle='#ff7aa266';c.fillRect(-10+look,hy0+7,4,1.5);c.fillRect(6+look,hy0+7,4,1.5);
   c.strokeStyle=INK;c.lineWidth=1.2;c.beginPath();c.moveTo(-1.5+look,hy0+9);c.lineTo(1.5+look,hy0+9);c.stroke();
   hair([[-15,2],[-16,-8],[-11,-18],[-3,-22],[6,-21],[13,-14],[16,-5],[15,4],[11,-3],[8,-6],[5,-3],[2,-7],[-1,-4],[-4,-7],[-7,-4],[-10,-6],[-12,0]],T.hair);}
  c.fillStyle=T.hairShade;c.beginPath();c.moveTo(-8*dir,hy0-14);c.lineTo(2*dir,hy0-19);c.lineTo(-2*dir,hy0-12);c.closePath();c.fill();
  c.fillStyle=T.trim;c.fillRect(dir>0?8:-12,hy0-12,4,6);
 }
 human(a,i,t,simTime,ghost=false){const c=this.ctx,x=a.x,y=a.y,T=TEAM[i];c.save();c.translate(x,y);if(a.hp<=0)c.globalAlpha=.25;
  let walk=0,moving=0;if(!ghost){const m=this.motion[i],dx=x-(m.x??x),dy=y-(m.y??y),sp=Math.hypot(dx,dy);m.x=x;m.y=y;m.walk=(m.walk||0)+sp*.18;m.speed=(m.speed||0)*.8+Math.min(1,sp/3)*.2;walk=m.walk;moving=m.speed;
   if(a.dodge>simTime&&!this.reduced){c.save();c.rotate(Math.atan2(dy,dx));for(let k=0;k<9;k++){const oy=(hash(k+Math.floor(t*30))-.5)*46,l=40+hash(k*3)*70;c.strokeStyle=k%3?T.neon+'88':WHITE+'aa';c.lineWidth=k%2?1:2;c.beginPath();c.moveTo(-20-l,oy);c.lineTo(-20,oy);c.stroke();}c.restore();}}
  // Ground marker.
  c.fillStyle='#000000aa';c.beginPath();c.ellipse(3,4,22,9,0,0,Math.PI*2);c.fill();c.strokeStyle=T.neon+'aa';c.lineWidth=2;c.beginPath();c.ellipse(0,0,24,10,0,0,Math.PI*2);c.stroke();
  c.save();c.rotate(a.facing);c.fillStyle=T.neon;c.beginPath();c.moveTo(30,0);c.lineTo(22,-5);c.lineTo(22,5);c.closePath();c.fill();c.restore();
  if(a.ward>simTime){c.save();c.shadowColor=VIOLET;c.shadowBlur=14;c.strokeStyle=VIOLET;c.lineWidth=2;this.poly(0,-26,40,6,this.reduced?0:t);c.stroke();c.globalAlpha*=.12;c.fillStyle=VIOLET;c.fill();c.restore();}
  if(a.guard>simTime){c.strokeStyle=ACID;c.lineWidth=4;c.beginPath();c.ellipse(0,-6,30,16,0,a.facing-.8,a.facing+.8);c.stroke();}
  if(a.parry>simTime){c.save();c.shadowColor=CYAN;c.shadowBlur=16;c.strokeStyle=WHITE;c.lineWidth=4;c.beginPath();c.ellipse(0,-14,36,24,0,a.facing-1,a.facing+1);c.stroke();c.strokeStyle=CYAN;c.lineWidth=2;c.stroke();c.restore();}
  if(a.cast){const progress=a.cast.end?(simTime-a.cast.start)/(a.cast.end-a.cast.start):.2+Math.sin(t*3)*.08,spin=this.reduced?0:t;c.save();c.translate(0,-2);c.scale(1,.42);this.ring(0,0,46,VIOLET,.4,2);c.strokeStyle=VIOLET;c.shadowColor=VIOLET;c.shadowBlur=12;c.lineWidth=5;c.beginPath();c.arc(0,0,46,-Math.PI/2,-Math.PI/2+clamp(progress,0,1)*2*Math.PI);c.stroke();c.shadowBlur=0;c.font='bold 13px monospace';c.textAlign='center';for(let k=0;k<8;k++){const ang=k/8*Math.PI*2+spin;c.fillStyle=k%2?CYAN:VIOLET;c.fillText(KANA[(k*5+Math.floor(spin*3))%KANA.length],Math.cos(ang)*58,Math.sin(ang)*58+4);}c.restore();}
  if(a.swing&&!a.swing.done){const p=clamp((simTime-a.swing.start)/(a.swing.impact-a.swing.start),0,1);c.save();c.globalAlpha*=.25+p*.6;const g=c.createRadialGradient(0,0,20,0,0,RULES.meleeRange);g.addColorStop(0,T.neon+'00');g.addColorStop(.85,T.neon+'55');g.addColorStop(1,WHITE+'cc');c.fillStyle=g;c.beginPath();c.moveTo(0,0);c.arc(0,0,RULES.meleeRange*(.55+p*.45),a.swing.angle-1.2,a.swing.angle+1.2);c.closePath();c.fill();c.strokeStyle=WHITE;c.lineWidth=3;c.beginPath();c.arc(0,0,RULES.meleeRange*(.55+p*.45),a.swing.angle-1.2,a.swing.angle-1.2+2.4*p);c.stroke();c.restore();}
  const swing=a.swing?clamp((simTime-a.swing.start)/((a.swing.end||a.swing.impact)-a.swing.start),0,1):null;
  const stunned=a.stun>simTime;if(stunned&&!this.reduced)c.translate(Math.sin(t*60)*1.5,0);
  c.save();c.scale(1.2,1.2);this.chibi(i,a.facing,{t,walk,moving,swing});c.restore();
  if(stunned){c.font='bold 12px monospace';c.textAlign='center';for(let k=0;k<3;k++){const ang=t*5+k*2.1;c.fillStyle=ACID;c.fillText('✦',Math.cos(ang)*16,-80+Math.sin(ang)*4);}}
  if(!ghost){c.font='bold 9px monospace';c.textAlign='center';c.fillStyle=T.label;c.fillText(i?'敵 · HOSTILE':'YOU · 召喚士',0,24);
   c.fillStyle=INK;c.fillRect(-25,30,50,6);c.fillStyle='#ffffff18';c.fillRect(-24,31,48,4);c.fillStyle=T.neon;c.fillRect(-24,31,48*clamp(a.hp/RULES.heroHp,0,1),4);for(let k=1;k<5;k++){c.fillStyle=INK;c.fillRect(-24+k*9.6,31,1,4);}}
  c.restore();}
 // Floating Familiar: a small fox-like spirit with ears, tail and orbiting glyphs.
 familiar(a,i,t){if(a.hp<=0)return;const c=this.ctx,F=FAMILIAR[i],bob=this.reduced?0:Math.sin(t*2+i)*4,x=a.x-34,y=a.y-74+bob,glow=a.cast?24:10;c.save();c.translate(x,y);c.lineJoin='round';
  c.fillStyle='#00000055';c.beginPath();c.ellipse(0,40-bob,9,3,0,0,Math.PI*2);c.fill();
  const sway=this.reduced?0:Math.sin(t*3+i)*.3;c.save();c.rotate(sway);c.beginPath();c.moveTo(-4,6);c.quadraticCurveTo(-20,10,-22,-4);c.quadraticCurveTo(-14,2,-6,0);c.closePath();c.fillStyle=F.neon;c.fill();c.strokeStyle=INK;c.lineWidth=2;c.stroke();c.restore();
  c.shadowColor=F.neon;c.shadowBlur=glow;c.beginPath();c.moveTo(-11,-6);c.lineTo(-12,-19);c.lineTo(-4,-11);c.lineTo(4,-11);c.lineTo(12,-19);c.lineTo(11,-6);c.quadraticCurveTo(12,9,0,11);c.quadraticCurveTo(-12,9,-11,-6);c.closePath();c.fillStyle=F.body;c.fill();c.shadowBlur=0;c.strokeStyle=INK;c.lineWidth=2.5;c.stroke();c.strokeStyle=F.neon;c.lineWidth=1.2;c.stroke();
  c.fillStyle=F.neon;c.beginPath();c.moveTo(-10,-15);c.lineTo(-9,-9);c.lineTo(-6,-11);c.fill();c.beginPath();c.moveTo(10,-15);c.lineTo(9,-9);c.lineTo(6,-11);c.fill();
  const blink=!this.reduced&&(t+i*1.7)%4<.12;c.fillStyle=F.eye;c.shadowColor=F.eye;c.shadowBlur=8;if(blink){c.fillRect(-7,-2,5,1.5);c.fillRect(2,-2,5,1.5);}else{c.beginPath();c.ellipse(-4.5,-2,2.4,3.4,0,0,Math.PI*2);c.ellipse(4.5,-2,2.4,3.4,0,0,Math.PI*2);c.fill();c.fillStyle=WHITE;c.fillRect(-5,-4,1.3,1.3);c.fillRect(4,-4,1.3,1.3);}c.shadowBlur=0;
  c.fillStyle=ACID;this.poly(0,5,2,4);c.fill();
  c.font='bold 8px monospace';c.textAlign='center';c.fillStyle=F.neon;c.fillText(i?'使い魔':a.name.toUpperCase(),0,-26);
  if(a.cast){const spin=this.reduced?0:t*2.4;for(let n=0;n<6;n++){const ang=n*Math.PI/3+spin;c.fillStyle=n%2?F.neon:CYAN;c.save();c.translate(Math.cos(ang)*24,Math.sin(ang)*14);c.rotate(ang);c.fillRect(-2,-2,4,4);c.restore();}if(!this.reduced&&(t*6|0)%2){c.font='bold 10px monospace';c.fillStyle=WHITE;c.fillText(['考','...','?!','思'][(t*2|0)%4],14,-14);}}
  c.restore();}
 // ---------- effects ----------
 effect(e,t,engine){const c=this.ctx,age=t-e.at,fade=clamp(1-age/1.3,0,1),pop=age<.1?age/.1*1.25:1.25-Math.min(.25,(age-.1)*1.5),sfx=SFX[e.type]?.[Math.floor(e.seed*SFX[e.type].length)];c.save();c.globalAlpha=fade;
  if(e.type==='damage'||e.type==='heal'){const dmg=e.type==='damage',x=e.x+(e.seed-.5)*30,y=e.y-66-age*40;if(dmg&&age<.35){c.save();c.globalAlpha=1-age/.35;c.fillStyle=WHITE;this.burst(e.x,e.y-26,46+age*80,18,9,e.seed*6);c.fill();c.strokeStyle=INK;c.lineWidth=3;c.stroke();c.fillStyle=ACID;this.burst(e.x,e.y-26,24+age*40,10,7,e.seed*3);c.fill();c.restore();}
   c.save();c.translate(x,y);c.scale(pop,pop);c.rotate(dmg?-.12:0);this.label((dmg?'−':'+')+e.value,0,0,26,dmg?PINK:CYAN,dmg?INK:'#002a2f');if(sfx)this.label(sfx,dmg?30:-28,-24,15,dmg?ACID:WHITE);c.restore();}
  else if(e.type==='perfect'){if(!this.reduced)this.speedLines(e.x,e.y-20,40,170,24,CYAN,age);this.ring(e.x,e.y-20,30+age*120,CYAN,.9,4);c.save();c.translate(e.x,e.y-78);c.scale(pop,pop);c.rotate(-.08);this.label('PERFECT!!',0,0,22,CYAN);this.label(sfx,40,-20,13,ACID);c.restore();}
  else if(e.type==='nova'){const r=Math.min(e.radius,age*420);this.ring(e.x,e.y,r,INK,.8,8);this.ring(e.x,e.y,r,CYAN,.9,3);this.ring(e.x,e.y,r*.7,PINK,.5,2);if(age<.5)this.label(sfx,e.x,e.y-90,20,CYAN);}
  else if(engine&&(e.type==='clash'||e.type==='clashEnd')){const a=engine.actors[0],b=engine.actors[1],x=(a.x+b.x)/2,y=(a.y+b.y)/2-24;if(!this.reduced)this.speedLines(x,y,60,320,40,e.type==='clash'?WHITE:PINK,age);c.fillStyle=WHITE;this.burst(x,y,40+age*120,16,10,age*2);c.globalAlpha=fade*.5;c.fill();c.globalAlpha=fade;this.ring(x,y,20+age*260,CYAN,.9,3);this.ring(x+4,y,22+age*270,PINK,.7,3);c.save();c.translate(x,y-70);c.scale(pop,pop);this.label(e.type==='clash'?'VS':'ゴゴゴ',0,0,e.type==='clash'?40:24,e.type==='clash'?ACID:PINK);c.restore();}
  else if(e.type==='wardBreak'){for(let k=0;k<8;k++){const ang=k/8*Math.PI*2+e.seed,d=20+age*90;c.fillStyle=k%2?VIOLET:WHITE;c.save();c.translate(e.x+Math.cos(ang)*d,e.y-26+Math.sin(ang)*d);c.rotate(ang+age*6);this.poly(0,0,7,3);c.fill();c.restore();}this.label(sfx,e.x,e.y-80,14,VIOLET);}
  else if(e.type==='death'){for(let k=0;k<14;k++){const ang=hash(k+e.seed*99)*Math.PI*2,d=age*(80+hash(k)*120);c.fillStyle=k%3?(e.actor?PINK:CYAN):WHITE;c.fillRect(e.x+Math.cos(ang)*d,e.y-30+Math.sin(ang)*d,4+hash(k*2)*14,3);}this.label(sfx,e.x,e.y-90,26,PINK);}
  else if(e.type==='proof'){this.ring(e.x,e.y,30+age*200,ACID,.8,3);c.font='bold 12px monospace';c.textAlign='center';for(let k=0;k<10;k++){const ang=k/10*Math.PI*2;c.fillStyle=k%2?ACID:CYAN;c.fillText(KANA[(k*3)%KANA.length],e.x+Math.cos(ang)*(30+age*120),e.y-20+Math.sin(ang)*(30+age*120));}this.label(sfx,e.x,e.y-96,18,ACID);}
  else if(e.type==='release'&&e.action){const col=SPELLS[e.action]?.color||WHITE;this.ring(e.x,e.y-20,10+age*80,col,.7,2);}
  c.restore();}
 speedLines(x,y,r1,r2,n,color,age){const c=this.ctx;c.save();c.globalAlpha*=clamp(1-age*1.4,0,1);c.fillStyle=color;for(let k=0;k<n;k++){const ang=k/n*Math.PI*2+hash(k)*.2,w=.012+hash(k+9)*.02,a=r1+age*60,b=r2+hash(k+3)*80;c.beginPath();c.moveTo(x+Math.cos(ang-w)*b,y+Math.sin(ang-w)*b);c.lineTo(x+Math.cos(ang)*a,y+Math.sin(ang)*a);c.lineTo(x+Math.cos(ang+w)*b,y+Math.sin(ang+w)*b);c.fill();}c.restore();}
 // ---------- screen space ----------
 keyArt(t){const c=this.ctx,w=this.w,h=this.h;if(w<1000)return;const cx=w*.76,cy=h*.6,s=Math.min(h/150,w/240),bob=this.reduced?0:Math.sin(t*1.6)*4;
  c.save();const g=c.createRadialGradient(cx,cy-40,20,cx,cy-40,h*.55);g.addColorStop(0,'#ff2a6d38');g.addColorStop(.5,'#5b1fa022');g.addColorStop(1,'#07020f00');c.fillStyle=g;c.fillRect(0,0,w,h);
  if(!this.reduced)this.speedLines(cx,cy-30*s,h*.2,h*.9,48,'#ffffff',.25);
  // Diagonal sun slab and giant title glyphs.
  c.save();c.translate(cx,cy-36*s);c.rotate(-.18);c.fillStyle=PINK;c.fillRect(-w*.25,-24*s,w*.6,10*s);c.fillStyle=CYAN;c.fillRect(-w*.2,-12*s,w*.5,3*s);c.restore();
  c.save();c.globalAlpha=.16;c.font=`900 ${h*.3}px "Arial Black",Impact,sans-serif`;c.textAlign='center';c.fillStyle=PINK;c.fillText('召喚',cx+(this.reduced?0:Math.sin(t*20)>.96?8:0),cy+h*.06);c.restore();
  c.translate(cx,cy+bob);c.scale(s,s);this.chibi(0,.25,{t,walk:0,moving:0});c.restore();
  // Familiar companion over the shoulder.
  c.save();c.translate(cx-30*s,cy-66*s+bob*1.5);c.scale(s*.5,s*.5);this.familiar({x:34,y:74,hp:1,cast:{kind:'thinking'},name:'NYX'},0,t);c.restore();
  c.save();c.translate(cx+18*s,cy+4*s);c.rotate(-.08);this.label('召喚士 // SUMMONER',0,0,Math.max(12,s*4.4),WHITE,PINK,'left');c.restore();}
 post(t,playing){const c=this.ctx,w=this.w,h=this.h;
  if(this.flash>0&&!this.reduced){c.save();c.globalCompositeOperation='difference';c.fillStyle=WHITE;c.globalAlpha=clamp(this.flash*6,0,.6);c.fillRect(0,0,w,h);c.restore();this.flash-=1/60;}
  if(this.reduced){this.glitch=0;return;}
  const ambient=hash(Math.floor(t*12))>.985?.35:0,level=Math.max(this.glitch,ambient);
  if(level>.02){const d=this.dpr||1,slices=2+Math.floor(level*7);c.save();for(let n=0;n<slices;n++){const r=hash(n*13+Math.floor(t*40)),sy=r*h,sh=4+hash(n*7+Math.floor(t*30))*24*level,dx=(hash(n+Math.floor(t*50))-.5)*60*level;try{c.drawImage(this.canvas,0,sy*d,w*d,sh*d,dx,sy,w,sh);}catch{}c.globalCompositeOperation='screen';c.fillStyle=n%2?'#ff2a6d33':'#00f0ff33';c.fillRect(dx+(n%2?-6:6),sy,w,sh);c.globalCompositeOperation='source-over';}
   c.fillStyle=ACID+'aa';for(let n=0;n<Math.floor(level*10);n++)c.fillRect(hash(n*31+Math.floor(t*25))*w,hash(n*17+Math.floor(t*25))*h,hash(n)*40+8,3);c.restore();}
  this.glitch*=.9;}
 minimap(engine,t){const c=this.ctx,w=190,h=130,x=this.w-w-28,y=this.h-(this.w<800?172:145)-h-34,sx=w/WORLD.width,sy=h/WORLD.height,cut=12;c.save();
  c.beginPath();c.moveTo(x+cut,y);c.lineTo(x+w,y);c.lineTo(x+w,y+h-cut);c.lineTo(x+w-cut,y+h);c.lineTo(x,y+h);c.lineTo(x,y+cut);c.closePath();c.fillStyle='#0a0418e6';c.fill();c.strokeStyle=PINK+'aa';c.lineWidth=1.5;c.stroke();c.save();c.clip();
  for(let yy=y;yy<y+h;yy+=3){c.fillStyle='#ffffff06';c.fillRect(x,yy,w,1);}
  for(const wall of WALLS){c.fillStyle='#4a3a7a';c.fillRect(x+wall.x*sx,y+wall.y*sy,wall.w*sx,wall.h*sy);}
  for(const site of SITES){const hot=engine.actors[0].proof?.siteId===site.id;c.fillStyle=hot?CYAN:site.color+'99';this.poly(x+site.x*sx,y+site.y*sy,hot?5:3.5,6,Math.PI/6);c.fill();}
  c.fillStyle=VIOLET;this.poly(x+RELAY.x*sx,y+RELAY.y*sy,4,4);c.fill();
  engine.actors.forEach((a,i)=>{if(i&&(!lineClear(engine.actors[0],a)||distance(engine.actors[0],a)>850))return;const px=x+a.x*sx,py=y+a.y*sy;c.fillStyle=i?PINK:CYAN;c.beginPath();c.arc(px,py,3.5,0,Math.PI*2);c.fill();if(!i&&!this.reduced)this.ring(px,py,4+(t*8%8),CYAN,.6);});
  c.restore();c.font='bold 8px monospace';c.fillStyle=CYAN;c.textAlign='left';c.fillText('THE HOLLOW // 3 CANDIDATE SITES',x,y-8);c.fillStyle=PINK;c.textAlign='right';c.fillText('地図',x+w,y-8);c.restore();}
}
