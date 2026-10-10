import {RULES} from './rules.js';
import {WORLD,WALLS,SITES,RELAY,distance,lineClear,clamp} from './world.js';
// Airbrushed fantasy-painting renderer: cold blue-grey fog, brushed steel and gold, crimson cloth,
// white hair, drifting embers and smoke. No ink outlines: form comes from soft gradients, rim light and blur.
// Pure presentation: never touches engine state or combat RNG. Shapes are seeded so they never jitter.
const FOG='#dde3e8',SLATE='#262b33',STEEL='#9aa4ae',STEEL_L='#eef2f5',STEEL_D='#373d46',GOLD='#c9a15a',GOLD_D='#6e5023',CRIMSON='#a3202a',CRIMSON_D='#4f0d13',SKIN='#e6c6b2',SKIN_D='#9c7466',EMBER='#ff8a3c',WHITE='#ffffff',SMOKE='#1b1f25';
const TEAM=[{armor:[STEEL_D,'#b8c1ca',STEEL_L],trim:GOLD,cape:[CRIMSON,CRIMSON_D],hair:['#aeb6c0','#ffffff'],eye:'#ff6a4a',aura:'#bcd4ff'},
 {armor:['#121418','#3a3f48','#7b828c'],trim:'#8e2a2a',cape:['#2a2d33','#0d0e11'],hair:['#0e0f12','#3a3d44'],eye:'#ff2a2a',aura:'#ff6a4a'}];
const GLOW={ember:'#ff7a3c',rift:'#8a7bff',nova:'#e8f2ff',siphon:'#d4283a',mend:'#ffd98a',decoy:'#c9d2dc',field:'#2a2f38'};
const SITE_GLOW={north:'#bcd4ff',vault:'#d9c6ff',tower:'#ffb59a'};
const FONT='"Inter var",Inter,"Segoe UI",system-ui,sans-serif';
const hash=n=>{const s=Math.sin(n*127.1+311.7)*43758.5453;return s-Math.floor(s);};
export class ArenaRenderer{
 constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.effects=[];this.camera={x:1120,y:770,zoom:.8};this.shake=0;this.flash=0;this.motion=[{},{}];this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;this.layer=this.bake();this.resize();new ResizeObserver(()=>this.resize()).observe(canvas);}
 resize(){const b=this.canvas.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);this.dpr=d;this.w=b.width;this.h=b.height;this.canvas.width=this.w*d;this.canvas.height=this.h*d;this.ctx.setTransform(d,0,0,d,0,0);}
 // The arena fills the screen below the top bar; the HUD floats over it.
 view(){return {x:this.w/2,y:56+(this.h-56)/2,height:this.h-56};}
 screenToWorld(x,y){const v=this.view(true),c=this.camera;return {x:(x-v.x)/c.zoom+c.x,y:(y-v.y)/c.zoom+c.y};}
 event(e,engine){if(['damage','perfect','release','nova','wardBreak','clash','clashEnd','heal','death','proof'].includes(e.type)){const a=engine.actors[e.actor??0];this.effects.push({...e,x:a.x,y:a.y,at:performance.now()/1000,seed:Math.random()*100});}
  if(['damage','clashEnd'].includes(e.type))this.shake=e.type==='clashEnd'?8:3.5;
  if(['clash','clashEnd','perfect','death','proof'].includes(e.type))this.flash=e.type==='perfect'?.06:.11;}
 // Paints into an offscreen canvas once; returns null where the platform has none (tests), so callers draw live.
 offscreen(w,h,scale,paint){try{const cv=typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(Math.ceil(w*scale),Math.ceil(h*scale)):document.createElement('canvas');if(!cv.getContext)return null;cv.width=Math.ceil(w*scale);cv.height=Math.ceil(h*scale);const ctx=cv.getContext('2d');if(!ctx)return null;ctx.scale(scale,scale);const keep=this.ctx;this.ctx=ctx;try{paint();}finally{this.ctx=keep;}return cv;}catch{return null;}}
 bake(){return this.compose(WORLD.width,WORLD.height,1.25,[[()=>this.floor(),[{blur:1.6}]],[()=>WALLS.forEach((w,i)=>this.wall(w,i)),[{blur:.7}]]]);}
 draw(now,engine,playing){const c=this.ctx,w=this.w,h=this.h,t=now/1000,v=this.view(),cam=this.camera;c.clearRect(0,0,w,h);if(!playing||!engine){this.keyArt(t);return;}c.fillStyle=FOG;c.fillRect(0,0,w,h);
  {const a=engine.actors[0];cam.zoom=.82;const x=clamp(a.x,w/(2*cam.zoom),WORLD.width-w/(2*cam.zoom)),y=clamp(a.y,v.height/(2*cam.zoom),WORLD.height-v.height/(2*cam.zoom));cam.x+=(x-cam.x)*.12;cam.y+=(y-cam.y)*.12;}
  c.save();c.translate(v.x,v.y);if(this.shake>.05&&!this.reduced){c.translate(Math.sin(t*121)*this.shake,Math.cos(t*113)*this.shake);this.shake*=.87;}c.scale(cam.zoom,cam.zoom);c.translate(-cam.x,-cam.y);
  if(this.layer)c.drawImage(this.layer,0,0,WORLD.width,WORLD.height);else{this.floor();WALLS.forEach((wall,i)=>this.wall(wall,i));}
  for(const s of SITES)this.site(s,t,engine);this.relay(t);
  {for(const z of engine.zones)this.zone(z,t);
   for(const d of engine.decoys){c.save();c.globalAlpha=.4+(this.reduced?0:Math.sin(t*9)*.08);this.human({...d,facing:0,ward:0,hp:100},d.from,t,engine.time,true);c.restore();}
   for(const p of engine.projectiles)this.projectile(p,t);
   const order=[0,1].filter(i=>!i||!(!lineClear(engine.actors[0],engine.actors[i])||distance(engine.actors[0],engine.actors[i])>850)||engine.clash).sort((p,q)=>engine.actors[p].y-engine.actors[q].y);
   for(const i of order){const a=engine.actors[i];this.human(a,i,t,engine.time);this.familiar(a,i,t);}
  }
  this.effects=this.effects.filter(e=>t-e.at<1.6);for(const e of this.effects)this.effect(e,t,engine);
  this.atmosphere(t);
  {const a=engine.actors[0];const fog=c.createRadialGradient(a.x,a.y-30,220,a.x,a.y-30,660);fog.addColorStop(0,'#dde3e800');fog.addColorStop(.7,'#dde3e840');fog.addColorStop(1,'#d3dae0c8');c.fillStyle=fog;c.fillRect(0,0,WORLD.width,WORLD.height);}
  c.restore();
  if(this.flash>0&&!this.reduced){c.save();c.globalCompositeOperation='lighter';c.fillStyle='#fff6ea';c.globalAlpha=clamp(this.flash*4,0,.45);c.fillRect(0,0,w,h);c.restore();this.flash-=1/60;}
  this.minimap(engine,t);
 }
 // ---------- paint primitives ----------
 blob(x,y,r,color,alpha=1){if(!(r>0)||!(alpha>0))return;const c=this.ctx,g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,color+'00');c.save();c.globalAlpha*=alpha;c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);c.restore();}
 glow(x,y,r,color,alpha=1){const c=this.ctx;c.save();c.globalCompositeOperation='lighter';this.blob(x,y,r,color,alpha);c.restore();}
 // Airbrushed smoke: a curving chain of soft dabs that thin out toward the tip.
 smoke(x,y,ang,len,width,alpha,seed=0){let px=x,py=y;const N=Math.max(6,Math.ceil(len/(width*.45)));for(let k=0;k<=N;k++){const s=k/N,a=ang+Math.sin(s*4+seed)*.35;px+=Math.cos(a)*len/N;py+=Math.sin(a)*len/N;this.blob(px,py,width*(1-s*.6),SMOKE,alpha*(1-s*.7)*(k?1:.5));}}
 // Tapered brush stroke, used for hair, cloth, smoke and sparks.
 stroke(x,y,ang,len,width,curl=0,seed=0,wob=0){const c=this.ctx,N=10,L=[],R=[];let px=x,py=y;for(let k=0;k<=N;k++){const s=k/N,a=ang+curl*s+wob*Math.sin(s*6+seed);if(k){px+=Math.cos(a)*len/N;py+=Math.sin(a)*len/N;}const hw=width*Math.pow(1-s,.8)/2*(k?1:.7),nx=-Math.sin(a),ny=Math.cos(a);L.push([px+nx*hw,py+ny*hw]);R.push([px-nx*hw,py-ny*hw]);}
  c.beginPath();c.moveTo(L[0][0],L[0][1]);for(const p of L)c.lineTo(p[0],p[1]);for(let k=R.length-1;k>=0;k--)c.lineTo(R[k][0],R[k][1]);c.closePath();c.fill();}
 metal(x0,y0,x1,y1,stops){const g=this.ctx.createLinearGradient(x0,y0,x1,y1);stops.forEach((s,k)=>g.addColorStop(k/(stops.length-1),s));return g;}
 text(t,x,y,size,fill='rgba(20,23,28,.82)',align='center',weight=600){const c=this.ctx;c.save();c.font=`${weight} ${size}px ${FONT}`;if('letterSpacing' in c)c.letterSpacing='.12em';c.textAlign=align;c.shadowColor='#ffffffcc';c.shadowBlur=size*.6;c.fillStyle=fill;c.fillText(t,x,y);c.restore();}
 ring(x,y,r,color,opacity=1,width=1.5){const c=this.ctx;c.save();c.globalAlpha*=opacity;c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.stroke();c.restore();}
 // ---------- arena ----------
 floor(){const c=this.ctx,W=WORLD.width,H=WORLD.height;const g=c.createLinearGradient(0,0,0,H);g.addColorStop(0,'#e3e8ec');g.addColorStop(.5,'#cfd6dc');g.addColorStop(1,'#b8c0c8');c.fillStyle=g;c.fillRect(0,0,W,H);
  // Underpainting: big soft value patches.
  for(let n=0;n<60;n++){const x=hash(n+1)*W,y=hash(n+2)*H,r=120+hash(n+3)*320,tone=hash(n+4);this.blob(x,y,r,tone<.45?'#8d98a3':tone<.8?'#f4f7f9':'#b9a99c',.35+hash(n+5)*.3);}
  // Worn stone, dabbed on in soft elongated strokes along the lanes.
  for(let n=0;n<320;n++){const lane=n%3,x=lane===0?hash(n+11)*W:lane===1?1050+hash(n+12)*140:480+hash(n+13)*90,y=lane===0?700+hash(n+14)*140:hash(n+15)*H,s=18+hash(n+16)*40;c.save();c.translate(x,y);c.rotate((hash(n+17)-.5)*.6);c.scale(1,.45);this.blob(0,0,s,hash(n+18)<.55?'#f4f7f9':'#6d7680',.28);c.restore();}
  c.strokeStyle='#3a414a2a';c.lineWidth=1.2;for(let n=0;n<60;n++){let x=hash(n+19)*W,y=hash(n+20)*H;c.beginPath();c.moveTo(x,y);for(let k=0;k<4;k++){x+=(hash(n*7+k)-.5)*70;y+=(hash(n*9+k)-.5)*40;c.lineTo(x,y);}c.stroke();}
  // Dark smoke streaks sweeping across, like the painted backdrop.
  for(let n=0;n<16;n++)this.smoke(hash(n+31)*W,hash(n+32)*H,-.6+(hash(n+33)-.5)*.6,260+hash(n+34)*420,40+hash(n+35)*70,.1+hash(n+30)*.1,n);
  // Rubble and stones.
  for(let n=0;n<150;n++){const x=hash(n+50)*W,y=hash(n+51)*H,r=3+hash(n+52)*9;this.blob(x+2,y+3,r*1.6,'#2a3038',.35);c.fillStyle=this.metal(x-r,y-r,x+r,y+r,['#c8d0d7','#6d7680']);c.beginPath();c.ellipse(x,y,r,r*.65,hash(n)*3,0,Math.PI*2);c.fill();}
  // Midlane dais.
  c.fillStyle='#ffffff38';c.fillRect(880,702,480,156);c.strokeStyle='#5b636d55';c.lineWidth=3;c.strokeRect(892,714,456,132);c.strokeStyle=GOLD+'66';c.lineWidth=1.5;c.strokeRect(900,722,440,116);
  // Cliff shadow at the rim.
  for(const [x0,y0,x1,y1] of [[0,0,0,140],[0,H,0,H-140],[0,0,140,0],[W,0,W-140,0]]){const e=c.createLinearGradient(x0,y0,x1,y1);e.addColorStop(0,'#1b1f25cc');e.addColorStop(1,'#1b1f2500');c.fillStyle=e;c.fillRect(0,0,W,H);}
 }
 // Walls: weathered stone ruins lit from the upper left, some hung with torn crimson banners.
 wall(w,i){const c=this.ctx,cut=Math.min(14,w.w*.18,w.h*.18);
  c.save();c.shadowColor='#14181dcc';c.shadowBlur=22;c.shadowOffsetX=14;c.shadowOffsetY=18;c.fillStyle='#14181d99';c.fillRect(w.x+4,w.y+6,w.w-8,w.h-4);c.restore();
  const path=()=>{c.beginPath();c.moveTo(w.x+cut,w.y);c.lineTo(w.x+w.w-cut*.4,w.y);c.lineTo(w.x+w.w,w.y+cut);c.lineTo(w.x+w.w,w.y+w.h-cut*.5);c.lineTo(w.x+w.w-cut,w.y+w.h);c.lineTo(w.x+cut*.5,w.y+w.h);c.lineTo(w.x,w.y+w.h-cut);c.lineTo(w.x,w.y+cut*.6);c.closePath();};
  path();c.fillStyle=this.metal(w.x,w.y,w.x+w.w,w.y+w.h,['#6f7983','#424a54','#262b33']);c.fill();
  c.save();path();c.clip();
  this.blob(w.x+w.w*.25,w.y+w.h*.2,Math.max(w.w,w.h)*.7,'#e8eef3',.35);this.blob(w.x+w.w*.8,w.y+w.h*.85,Math.max(w.w,w.h)*.6,'#0d1014',.5);
  c.strokeStyle='#14181d66';c.lineWidth=1.2;for(let n=0;n<Math.floor(w.h/40)+1;n++){const y=w.y+(n+1)*w.h/(Math.floor(w.h/40)+2);c.beginPath();c.moveTo(w.x,y);c.lineTo(w.x+w.w,y+(hash(i+n)-.5)*4);c.stroke();}
  c.strokeStyle='#ffffff22';for(let n=0;n<6;n++){const x=w.x+hash(i*7+n)*w.w,y=w.y+hash(i*9+n)*w.h;c.beginPath();c.moveTo(x,y);c.lineTo(x+6+hash(n)*12,y+4+hash(n+2)*10);c.stroke();}
  c.restore();
  c.strokeStyle='#f4f8fbaa';c.lineWidth=2;c.beginPath();c.moveTo(w.x+1,w.y+w.h-cut);c.lineTo(w.x+1,w.y+cut*.6);c.lineTo(w.x+cut,w.y+1);c.lineTo(w.x+w.w-cut*.4,w.y+1);c.stroke();
  if(i%3===0){c.strokeStyle=GOLD;c.globalAlpha=.55;c.lineWidth=1.5;c.strokeRect(w.x+6,w.y+6,w.w-12,Math.min(10,w.h*.1));c.globalAlpha=1;}
  if(i%4===1&&w.w>=65){const bx=w.x+w.w*.5,bw=Math.min(34,w.w*.36),bh=Math.min(70,w.h*.8);c.fillStyle=this.metal(bx-bw/2,0,bx+bw/2,0,[CRIMSON_D,CRIMSON,CRIMSON_D]);c.beginPath();c.moveTo(bx-bw/2,w.y+8);c.lineTo(bx+bw/2,w.y+8);c.lineTo(bx+bw/2,w.y+8+bh);c.lineTo(bx,w.y+8+bh*.8);c.lineTo(bx-bw/2,w.y+8+bh);c.closePath();c.fill();c.fillStyle=GOLD;c.fillRect(bx-bw/2-3,w.y+6,bw+6,3);c.strokeStyle=GOLD+'aa';c.lineWidth=1;c.beginPath();c.arc(bx,w.y+8+bh*.38,bw*.22,0,Math.PI*2);c.stroke();}
 }
 // Drifting embers, ash and smoke over the battlefield.
 atmosphere(t){if(this.reduced)return;const c=this.ctx,W=WORLD.width,H=WORLD.height;
  for(let n=0;n<10;n++){const x=(hash(n+300)*W+t*(12+hash(n)*16))%(W+400)-200,y=hash(n+301)*H+Math.sin(t*.3+n)*40;this.blob(x,y,140+hash(n+2)*160,'#1b1f25',.06);}
  c.save();c.globalCompositeOperation='lighter';for(let n=0;n<70;n++){const sp=20+hash(n+400)*40,x=(hash(n+401)*W+Math.sin(t*.8+n)*30+t*sp*.4)%W,y=(hash(n+402)*H-t*sp+H*10)%H,r=1+hash(n+403)*1.8,f=.5+.5*Math.sin(t*4+n);c.fillStyle=`rgba(255,${120+hash(n)*60|0},60,${.35+f*.5})`;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();if(n%4===0)this.blob(x,y,r*6,'#ff8a3c',.18*f);}c.restore();
  c.fillStyle='#4a525c';for(let n=0;n<40;n++){const x=(hash(n+500)*W+t*30)%W,y=(hash(n+501)*H+t*(14+hash(n)*10))%H;c.globalAlpha=.25;c.save();c.translate(x,y);c.rotate(t+n);c.fillRect(-2,-1,4,2);c.restore();}c.globalAlpha=1;}
 site(s,t,engine){const c=this.ctx,proof=engine?.actors[0].proof?.siteId===s.id?engine.actors[0]:null,col=proof?'#ffd98a':SITE_GLOW[s.id]||'#bcd4ff',pulse=this.reduced?0:Math.sin(t*1.6+s.x)*.15;c.save();c.translate(s.x,s.y);
  this.blob(0,0,120,'#1b1f25',.18);this.glow(0,0,110,col,.35+pulse+(proof?.3:0));
  c.save();c.scale(1,.55);c.strokeStyle='#2a303899';c.lineWidth=4;c.beginPath();c.arc(0,0,92,0,Math.PI*2);c.stroke();c.strokeStyle=col;c.globalAlpha=.75;c.lineWidth=2;c.beginPath();c.arc(0,0,92,0,Math.PI*2);c.stroke();c.setLineDash([3,12]);c.lineDashOffset=-(this.reduced?0:t*14);c.beginPath();c.arc(0,0,74,0,Math.PI*2);c.stroke();c.setLineDash([]);c.restore();
  // A standing stone with a glowing rune.
  c.save();c.scale(1,.4);this.blob(8,10,24,'#14181d',.7);c.restore();c.fillStyle=this.metal(-12,0,12,0,['#9aa4ae','#4a525c','#262b33']);c.beginPath();c.moveTo(-12,0);c.lineTo(-9,-46);c.lineTo(0,-56);c.lineTo(10,-44);c.lineTo(12,0);c.closePath();c.fill();
  this.glow(0,-28,proof?40:22,col,.9);c.fillStyle=WHITE;c.globalAlpha=.9;c.fillRect(-1.5,-36,3,16);c.fillRect(-6,-30,12,2.5);c.globalAlpha=1;
  if(!this.reduced)for(let k=0;k<6;k++){const a=t*.5+k,rr=50+hash(k)*30,y=-20-((t*18+k*25)%80);this.glow(Math.cos(a)*rr,y+Math.sin(a)*rr*.3,6,col,.6);}
  this.text(s.name.toUpperCase(),0,-108,12);if(proof)this.text('FLAG SITE',0,72,10,'rgba(110,80,35,.95)');
  if(proof&&proof.capture>0){c.save();c.scale(1,.55);c.strokeStyle='#ffd98a';c.shadowColor='#ffb84a';c.shadowBlur=16;c.lineWidth=8;c.beginPath();c.arc(0,0,96,-Math.PI/2,-Math.PI/2+proof.capture/RULES.captureTime*Math.PI*2);c.stroke();c.restore();}c.restore();}
 relay(t){const c=this.ctx,x=RELAY.x,y=RELAY.y,p=this.reduced?0:Math.sin(t*2)*.15;c.save();c.translate(x,y);
  this.blob(0,0,110,'#1b1f25',.2);this.glow(0,-40,120,'#8fb4ff',.35+p);
  // Light pillar.
  const beam=c.createLinearGradient(0,-260,0,0);beam.addColorStop(0,'#bcd4ff00');beam.addColorStop(1,'#bcd4ff88');c.save();c.globalCompositeOperation='lighter';c.fillStyle=beam;c.fillRect(-9,-260,18,250);c.restore();
  c.save();c.scale(1,.33);this.blob(10,18,50,'#14181d',.75);c.restore();
  c.fillStyle=this.metal(-34,0,34,0,['#8a939d','#3e454e','#1d2228']);c.beginPath();c.moveTo(-34,4);c.lineTo(-26,-16);c.lineTo(26,-16);c.lineTo(34,4);c.closePath();c.fill();c.fillStyle=GOLD;c.fillRect(-26,-18,52,3);
  const bob=this.reduced?0:Math.sin(t*1.5)*4;c.fillStyle=this.metal(-12,0,12,0,['#e8f2ff','#8fb4ff','#3c5a9a']);c.beginPath();c.moveTo(0,-74+bob);c.lineTo(12,-48+bob);c.lineTo(0,-28+bob);c.lineTo(-12,-48+bob);c.closePath();c.fill();this.glow(0,-50+bob,34,'#bcd4ff',.9);
  c.restore();this.text('NOETIC RELAY',x,y-112,12);}
 zone(z,t){const c=this.ctx,col=z.from===0?'#8fb4ff':'#ff6a4a',spin=this.reduced?0:t*.5;c.save();c.translate(z.x,z.y);this.blob(0,0,z.radius,'#1b1f25',.25);
  c.save();c.fillStyle='#1b1f25';c.globalAlpha=.16;for(let k=0;k<14;k++){const a=k/14*Math.PI*2+spin;this.stroke(Math.cos(a)*z.radius,Math.sin(a)*z.radius,a+Math.PI/2+.4,z.radius*.7,18,.9,k);}c.restore();
  c.save();c.scale(1,.6);this.ring(0,0,z.radius,col,.6,2);c.restore();this.glow(0,0,z.radius*.5,col,.2);c.restore();}
 projectile(p,t){const c=this.ctx,col=GLOW[p.action]||'#ffffff',ang=Math.atan2(p.vy,p.vx),len=Math.hypot(p.vx,p.vy)*.14;
  c.save();c.fillStyle='#1b1f25';c.globalAlpha=.2;this.stroke(p.x,p.y,ang+Math.PI,len*1.3,p.radius*1.6,0,p.id,.15);c.restore();
  c.save();c.globalCompositeOperation='lighter';c.fillStyle=col;c.globalAlpha=.7;this.stroke(p.x,p.y,ang+Math.PI,len,p.radius*1.2,0,p.id);c.globalAlpha=1;c.restore();
  this.glow(p.x,p.y,p.radius*3.2,col,.9);this.glow(p.x,p.y,p.radius*1.1,'#ffffff',1);}
 // ---------- characters ----------
 // An armoured summoner painted with soft light: cape, steel plate with gold trim, fur collar, hair.
 knight(i,facing,opts={}){const c=this.ctx,T=TEAM[i],t=opts.t||0,walk=opts.walk||0,moving=opts.moving||0,dir=Math.cos(facing)>=0?1:-1,back=Math.sin(facing)<-.55,wind=this.reduced?0:Math.sin(t*2.4+i);
  const step=Math.sin(walk)*4*moving;
  // Cape flows behind, away from the facing.
  const cx=-Math.cos(facing)*12,cy=-Math.sin(facing)*4;c.fillStyle=this.metal(-14,-46,14,0,T.cape);c.beginPath();c.moveTo(-12,-46);c.quadraticCurveTo(-18+cx,-20,-16+cx*1.6+wind*2,-4+cy);c.quadraticCurveTo(cx,2+cy+wind,16+cx*1.6-wind*2,-4+cy);c.quadraticCurveTo(18+cx,-20,12,-46);c.closePath();c.fill();
  c.fillStyle=T.cape[1];for(let k=0;k<5;k++)this.stroke(-12+k*6+cx*1.4,-6+cy,Math.PI/2+(hash(k+i)-.5)*.6+wind*.1,6+hash(k)*6,4,0,k);
  // Legs.
  for(const [lx,s] of [[-5,step],[5,-step]]){c.fillStyle=this.metal(lx-4,0,lx+4,0,T.armor);c.beginPath();c.roundRect?c.roundRect(lx-4,-22+Math.min(0,s)*.3,8,20,3):c.rect(lx-4,-22,8,20);c.fill();c.fillStyle=T.armor[0];c.beginPath();c.ellipse(lx+s*.3+dir,-2,5.5,3,0,0,Math.PI*2);c.fill();}
  // Breastplate with gold V trim and rim light.
  c.fillStyle=this.metal(-13,-46,13,-20,[T.armor[2],T.armor[1],T.armor[0]]);c.beginPath();c.moveTo(-12,-46);c.lineTo(12,-46);c.quadraticCurveTo(15,-32,10,-20);c.lineTo(-10,-20);c.quadraticCurveTo(-15,-32,-12,-46);c.closePath();c.fill();
  c.strokeStyle=T.trim;c.lineWidth=1.6;c.beginPath();c.moveTo(-8,-44);c.lineTo(0,-28);c.lineTo(8,-44);c.stroke();c.fillStyle=T.armor[0];c.fillRect(-11,-23,22,3.5);c.fillStyle=T.trim;c.fillRect(-2,-23,4,3.5);
  c.strokeStyle='#ffffff88';c.lineWidth=1.2;c.beginPath();c.moveTo(-dir*12,-45);c.quadraticCurveTo(-dir*15,-32,-dir*10,-21);c.stroke();
  // Pauldrons.
  for(const sx of [-1,1]){c.fillStyle=this.metal(sx*14-7,-52,sx*14+7,-40,[T.armor[2],T.armor[1],T.armor[0]]);c.beginPath();c.ellipse(sx*13,-45,8,6,sx*.3,0,Math.PI*2);c.fill();c.strokeStyle=T.trim;c.lineWidth=1.2;c.beginPath();c.ellipse(sx*13,-45,8,6,sx*.3,Math.PI*1.05,Math.PI*1.95);c.stroke();}
  // Weapon: a curved glaive.
  if(!opts.noBlade){const swing=opts.swing,blade=swing!=null?facing+(swing-.5)*2.4:facing+.9*dir,hx=Math.cos(facing)*14,hy=-34+Math.sin(facing)*5;c.save();c.translate(hx,hy);c.rotate(blade);c.fillStyle='#2a2f36';c.fillRect(-6,-1.3,18,2.6);c.fillStyle=this.metal(0,-6,0,6,['#ffffff','#b8c1ca','#4a525c']);c.beginPath();c.moveTo(10,-2);c.quadraticCurveTo(26,-10,40,-2);c.quadraticCurveTo(28,1,10,2);c.closePath();c.fill();c.strokeStyle=T.trim;c.lineWidth=1;c.beginPath();c.moveTo(9,-3);c.lineTo(9,3);c.stroke();c.restore();
   c.fillStyle=T.armor[0];c.beginPath();c.arc(hx,hy,3.4,0,Math.PI*2);c.fill();}
  // Fur collar.
  c.fillStyle=this.metal(-14,-56,14,-44,T.cape);for(let k=0;k<11;k++){const a=Math.PI+k/10*Math.PI;this.stroke(Math.cos(a)*9,-48+Math.sin(a)*3,a+(hash(k+i)-.5)*.6,5+hash(k)*4,4.5,0,k);}
  // Head: skin with soft shading, hair falling over the eyes.
  const hy0=-58;c.fillStyle=back?T.hair[0]:this.metal(-7*dir,hy0,7*dir,hy0,[SKIN,SKIN,SKIN_D]);c.beginPath();c.ellipse(dir*.5,hy0,6.5,7.5,0,0,Math.PI*2);c.fill();
  if(!back){c.fillStyle=T.eye;c.save();c.shadowColor=T.eye;c.shadowBlur=6;c.fillRect(Math.cos(facing)*3-1.2+dir*1.5,hy0-.5,2.4,1.2);c.restore();}
  c.fillStyle=T.hair[0];for(let k=0;k<14;k++){const a=-Math.PI/2+(k-6.5)*.27,bx=Math.cos(a)*5,by=hy0-3+Math.sin(a)*5;this.stroke(bx,by,a+Math.PI*.5*(k<7?-1:1)*.55+(hash(k+i)-.5)*.4+(this.reduced?0:wind*.04),7+hash(k*3)*5,4,(k<7?-1:1)*.6,k);}
  c.fillStyle=T.hair[1];for(let k=0;k<10;k++){const a=-Math.PI/2+(k-4.5)*.3-dir*.15;this.stroke(Math.cos(a)*4,hy0-4+Math.sin(a)*4,a+Math.PI*.6*(k<5?-1:1)*.5+(hash(k+9)-.5)*.3,5+hash(k*5)*5,2.4,(k<5?-1:1)*.7,k);}
  if(!back){c.fillStyle=T.hair[1];for(let k=0;k<5;k++)this.stroke(-4+k*2+dir*1.5,hy0-6,Math.PI/2+(hash(k)-.5)*.5-dir*.25,5+hash(k+2)*3,2.6,dir*.3,k);}
 }
 human(a,i,t,simTime,ghost=false){const c=this.ctx,x=a.x,y=a.y,T=TEAM[i];c.save();c.translate(x,y);if(a.hp<=0)c.globalAlpha=.25;
  let walk=0,moving=0;if(!ghost){const m=this.motion[i],dx=x-(m.x??x),dy=y-(m.y??y),sp=Math.hypot(dx,dy);m.x=x;m.y=y;m.walk=(m.walk||0)+sp*.16;m.speed=(m.speed||0)*.8+Math.min(1,sp/3)*.2;walk=m.walk;moving=m.speed;
   if(a.dodge>simTime&&!this.reduced){c.save();c.fillStyle=T.aura;c.globalAlpha=.3;this.stroke(0,-30,Math.atan2(dy,dx)+Math.PI,90,40,0,1,.1);c.restore();}}
  c.save();c.scale(1,.36);this.blob(4,6,26,'#14181d',.7);c.restore();
  c.save();c.scale(1,.38);c.globalAlpha*=.75;c.fillStyle=T.aura;this.stroke(Math.cos(a.facing)*30,Math.sin(a.facing)*30,a.facing,16,8,0,1);c.restore();
  if(a.ward>simTime){this.glow(0,-34,52,'#8fb4ff',.45);c.save();c.globalAlpha*=.6;c.strokeStyle='#e8f2ff';c.lineWidth=1.5;c.beginPath();c.ellipse(0,-34,40,46,0,0,Math.PI*2);c.stroke();c.restore();}
  if(a.guard>simTime){c.save();c.strokeStyle=GOLD;c.shadowColor=GOLD;c.shadowBlur=10;c.lineWidth=3;c.beginPath();c.ellipse(0,-10,32,16,0,a.facing-.8,a.facing+.8);c.stroke();c.restore();}
  if(a.parry>simTime){c.save();c.globalCompositeOperation='lighter';c.strokeStyle='#e8f2ff';c.shadowColor='#bcd4ff';c.shadowBlur=18;c.lineWidth=4;c.beginPath();c.ellipse(0,-24,40,28,0,a.facing-1,a.facing+1);c.stroke();c.restore();}
  if(a.cast){const progress=a.cast.end?(simTime-a.cast.start)/(a.cast.end-a.cast.start):.2+Math.sin(t*3)*.08,spin=this.reduced?0:t;this.glow(0,0,56,T.aura,.3);c.save();c.scale(1,.4);this.ring(0,0,50,'#1b1f25',.3,2);c.strokeStyle='#e8f2ff';c.shadowColor=T.aura;c.shadowBlur=14;c.lineWidth=4;c.beginPath();c.arc(0,0,50,-Math.PI/2,-Math.PI/2+clamp(progress,0,1)*2*Math.PI);c.stroke();c.restore();
   if(!this.reduced)for(let k=0;k<6;k++){const ang=spin*1.4+k*1.05,yy=-((t*30+k*14)%70);this.glow(Math.cos(ang)*34,yy+Math.sin(ang)*8,5,T.aura,.8);}}
  if(a.swing&&!a.swing.done){const p=clamp((simTime-a.swing.start)/(a.swing.impact-a.swing.start),0,1),R=RULES.meleeRange*(.55+p*.45),s=a.swing.angle;c.save();c.globalCompositeOperation='lighter';c.globalAlpha*=.15+p*.45;const g=c.createRadialGradient(0,0,R*.5,0,0,R);g.addColorStop(0,'#ffffff00');g.addColorStop(.85,i?'#ff6a4a':'#e8f2ff');g.addColorStop(1,'#ffffff00');c.fillStyle=g;c.beginPath();c.moveTo(0,0);c.arc(0,0,R,s-1.2,s+1.2);c.closePath();c.fill();c.restore();}
  const swing=a.swing?clamp((simTime-a.swing.start)/((a.swing.end||a.swing.impact)-a.swing.start),0,1):null,stunned=a.stun>simTime;if(stunned&&!this.reduced)c.translate(Math.sin(t*60)*1.5,0);
  c.save();c.scale(1.3,1.3);this.knight(i,a.facing,{t,walk,moving,swing});c.restore();
  if(stunned&&!this.reduced)for(let k=0;k<3;k++){const ang=t*5+k*2.1;this.glow(Math.cos(ang)*14,-92+Math.sin(ang)*4,6,GOLD,.9);}
  if(!ghost){const hp=clamp(a.hp/RULES.heroHp,0,1),bar=(x,y,w,h)=>{c.beginPath();if(c.roundRect)c.roundRect(x,y,w,h,h/2);else c.rect(x,y,w,h);c.fill();};c.fillStyle='rgba(14,16,20,.72)';bar(-24,24,48,6);c.fillStyle=i?'#e04848':'#e9eef4';if(hp>0)bar(-23,25,46*hp,4);}
  c.restore();}
 // Familiars: yours a pale spirit flame, the hostile one an ember wraith trailing smoke.
 familiar(a,i,t){if(a.hp<=0)return;const c=this.ctx,bob=this.reduced?0:Math.sin(t*2+i)*4,x=a.x-40,y=a.y-100+bob,col=i?'#ff6a4a':'#bcd4ff';c.save();
  c.fillStyle=i?'#1b1f25':'#5d6c84';c.globalAlpha=.3;for(let k=0;k<3;k++)this.stroke(x,y+4,Math.PI/2+(k-1)*.35+(this.reduced?0:Math.sin(t*2+k)*.2),26+k*6,10,(k-1)*.6,k);c.globalAlpha=1;
  this.glow(x,y,a.cast?40:28,col,.75);this.glow(x,y,10,'#ffffff',1);c.fillStyle='#ffffff';c.beginPath();c.arc(x,y,3.5,0,Math.PI*2);c.fill();
  if(a.cast&&!this.reduced)for(let k=0;k<5;k++){const ang=t*2.4+k*1.26;this.glow(x+Math.cos(ang)*20,y+Math.sin(ang)*12,4,col,.9);}
  c.restore();}
 // ---------- effects ----------
 effect(e,t,engine){const c=this.ctx,age=t-e.at,fade=clamp(1-age/1.4,0,1);c.save();c.globalAlpha=fade;
  if(e.type==='damage'){const hx=e.x,hy=e.y-36;this.glow(hx,hy,60*(1-age),'#ffb36a',.8);c.fillStyle=CRIMSON;for(let k=0;k<12;k++){const a=hash(e.seed+k)*Math.PI*2,d=age*(60+hash(k+e.seed)*90);c.beginPath();c.arc(hx+Math.cos(a)*d,hy+Math.sin(a)*d+age*age*80,1.5+hash(k)*2.5,0,Math.PI*2);c.fill();}
   c.save();c.globalCompositeOperation='lighter';for(let k=0;k<10;k++){const a=hash(e.seed*3+k)*Math.PI*2,d=age*(90+hash(k)*120);c.fillStyle=EMBER;c.fillRect(hx+Math.cos(a)*d,hy+Math.sin(a)*d,2,2);}c.restore();
   this.dmg('−'+e.value,e.x+(e.seed%1-.5)*30,e.y-84-age*40,20,e.actor?'#ffd2cc':'#ffffff',e.actor?'rgba(80,10,14,.9)':'rgba(20,23,28,.85)');}
  else if(e.type==='heal'){for(let k=0;k<8;k++){const ox=(hash(e.seed+k)-.5)*40,oy=-20-age*70*(.6+hash(k)*.6);this.glow(e.x+ox,e.y+oy,8,'#ffd98a',.9);}this.dmg('+'+e.value,e.x,e.y-86-age*36,20,'#fff1c9','rgba(70,50,15,.85)');}
  else if(e.type==='perfect'){this.flare(e.x,e.y-34,1-age*.7);}
  else if(e.type==='nova'){const r=Math.min(e.radius,age*420);c.save();c.strokeStyle='#e8f2ff';c.shadowColor='#bcd4ff';c.shadowBlur=14;c.lineWidth=8;c.globalAlpha=fade*.6;c.beginPath();c.ellipse(e.x,e.y,r,r*.6,0,0,Math.PI*2);c.stroke();c.restore();this.glow(e.x,e.y-20,r*.6,'#bcd4ff',.4);}
  else if(engine&&(e.type==='clash'||e.type==='clashEnd')){const a=engine.actors[0],b=engine.actors[1],x=(a.x+b.x)/2,y=(a.y+b.y)/2-40;this.flare(x,y,1.4-age);c.save();c.strokeStyle='#1b1f25';c.globalAlpha=fade*.18;c.lineWidth=20;c.beginPath();c.ellipse(x,y+30,30+age*240,(30+age*240)*.5,0,0,Math.PI*2);c.stroke();c.restore();}
  else if(e.type==='wardBreak'){for(let k=0;k<10;k++){const ang=k/10*Math.PI*2+e.seed,d=24+age*100;c.save();c.translate(e.x+Math.cos(ang)*d,e.y-34+Math.sin(ang)*d);c.rotate(ang+age*5);c.fillStyle=this.metal(-4,-6,4,6,['#ffffff','#8fb4ff']);c.beginPath();c.moveTo(0,-7);c.lineTo(4,5);c.lineTo(-4,5);c.closePath();c.fill();c.restore();}this.glow(e.x,e.y-34,50*(1-age),'#bcd4ff',.8);}
  else if(e.type==='death'){c.save();c.fillStyle='#1b1f25';c.globalAlpha=fade*.2;for(let k=0;k<7;k++)this.stroke(e.x+(hash(k+e.seed)-.5)*40,e.y-10,-Math.PI/2+(hash(k)-.5)*.8,60+age*120,40,(hash(k+2)-.5),k,.2);c.restore();
   c.save();c.globalCompositeOperation='lighter';for(let k=0;k<26;k++){const a=-Math.PI/2+(hash(k+e.seed)-.5)*2.4,d=age*(60+hash(k)*160);c.fillStyle=EMBER;c.globalAlpha=fade;c.fillRect(e.x+Math.cos(a)*d,e.y-30+Math.sin(a)*d,2.4,2.4);}c.restore();}
  else if(e.type==='proof'){const beam=c.createLinearGradient(0,e.y-400,0,e.y);beam.addColorStop(0,'#ffd98a00');beam.addColorStop(1,'#ffd98acc');c.save();c.globalCompositeOperation='lighter';c.fillStyle=beam;c.fillRect(e.x-30*(1-age*.5),e.y-400,60*(1-age*.5),400);c.restore();this.glow(e.x,e.y-30,90,'#ffd98a',.8);}
  else if(e.type==='release'&&e.action)this.glow(e.x,e.y-34,30+age*60,GLOW[e.action]||'#ffffff',.6*(1-age));
  c.restore();}
 dmg(text,x,y,size,fill,edge){const c=this.ctx;c.save();c.font=`700 ${size}px ${FONT}`;c.textAlign='center';c.lineJoin='round';c.lineWidth=Math.max(3,size*.22);c.strokeStyle=edge;c.strokeText(text,x,y);c.fillStyle=fill;c.fillText(text,x,y);c.restore();}
 flare(x,y,k){if(k<=0)return;const c=this.ctx;this.glow(x,y,90*k,'#fff3e0',.9);this.glow(x,y,30*k,'#ffffff',1);c.save();c.globalCompositeOperation='lighter';const g=c.createLinearGradient(x-220*k,0,x+220*k,0);g.addColorStop(0,'#bcd4ff00');g.addColorStop(.5,'#ffffffcc');g.addColorStop(1,'#bcd4ff00');c.fillStyle=g;c.fillRect(x-220*k,y-1.5,440*k,3);c.restore();}
 // ---------- menu key art: a backlit summoner on a ridge, painted in layers and softened once ----------
 keyArt(t){const c=this.ctx,w=this.w,h=this.h,key=w+'x'+h;
  if(this.artKey!==key){this.artKey=key;this.art=this.compose(w,h,Math.min(this.dpr||1,1.5),this.artLayers(w,h));}
  if(this.art)c.drawImage(this.art,0,0,w,h);else for(const [paint] of this.artLayers(w,h))paint();
  if(this.reduced)return;const {fx,fy,H}=this.artFrame(w,h);c.save();
  // Drifting fog banks and rising embers keep the still painting alive.
  for(let n=0;n<5;n++){const x=((hash(n+80)*1.4+t*.012*(1+hash(n)))%1.4-.2)*w,y=h*(.55+hash(n+81)*.35);this.blob(x,y,h*(.25+hash(n+82)*.2),'#e6ebef',.1);}
  c.globalCompositeOperation='lighter';for(let n=0;n<34;n++){const sp=.04+hash(n+600)*.06,x=fx-H*.5+hash(n+601)*H*1.3+Math.sin(t*.7+n)*H*.03,y=fy-((t*sp*H+hash(n+602)*H*1.4)%(H*1.4)),f=.5+.5*Math.sin(t*3+n);this.blob(x,y,H*(.006+hash(n)*.008),'#ff8a3c',.8*f);this.blob(x,y,H*.002,'#fff2d0',f);}
  c.restore();}
 artFrame(w,h){const H=Math.min(h*.56,w*.42);return {H,s:H/100,fx:w>860?w*.7:w*.72,fy:h*.86};}
 // Paints each layer to its own canvas and composites it with the given blur passes. Falls back to direct painting.
 compose(w,h,scale,layers){return this.offscreen(w,h,scale,()=>{const c=this.ctx;for(const [paint,passes=[{}]] of layers){const layer=this.offscreen(w,h,scale,paint);if(!layer){paint();continue;}for(const p of passes){c.save();if(p.blur)c.filter=`blur(${p.blur*scale}px)`;c.globalAlpha=p.alpha??1;if(p.op)c.globalCompositeOperation=p.op;c.drawImage(layer,0,0,w,h);c.restore();}}});}
 // Fills a shape with the rim colour, then covers it with the body nudged away from the light: only the lit edge survives.
 rimFill(path,fill,rim,ox,oy){const c=this.ctx;c.save();path();c.fillStyle=rim;c.fill();c.clip();c.translate(ox,oy);path();c.fillStyle=fill;c.fill();c.restore();}
 artLayers(w,h){const {fx,fy,H,s}=this.artFrame(w,h),lx=fx+H*.2,ly=fy-H*.98,ox=-.45*s,oy=1.05*s,X=x=>fx+x*s,Y=y=>fy+y*s;
  const sky=()=>{const c=this.ctx,g=c.createLinearGradient(0,0,0,h);g.addColorStop(0,'#c3cad2');g.addColorStop(.45,'#e3e7eb');g.addColorStop(.78,'#d2d8de');g.addColorStop(1,'#a9b1ba');c.fillStyle=g;c.fillRect(0,0,w,h);
   this.blob(lx,ly+H*.25,H*1.7,'#f6efe4',.4);this.blob(lx,ly,H*1.05,'#ffffff',.95);this.blob(lx,ly,H*.42,'#ffffff',1);
   c.save();c.globalCompositeOperation='lighter';for(let k=0;k<11;k++){const a=Math.PI*.5+(hash(k+40)-.5)*2.6,len=H*(1.4+hash(k+41)*1.2),wd=.025+hash(k+42)*.05,gr=c.createLinearGradient(lx,ly,lx+Math.cos(a)*len,ly+Math.sin(a)*len);gr.addColorStop(0,'rgba(255,255,255,.2)');gr.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=gr;c.beginPath();c.moveTo(lx,ly);c.lineTo(lx+Math.cos(a-wd)*len,ly+Math.sin(a-wd)*len);c.lineTo(lx+Math.cos(a+wd)*len,ly+Math.sin(a+wd)*len);c.closePath();c.fill();}c.restore();
   for(let n=0;n<8;n++)this.smoke(w*(.05+hash(n+50)*.95),h*(.05+hash(n+51)*.35),-.35+(hash(n+52)-.5)*.5,w*(.18+hash(n+53)*.25),h*(.05+hash(n+54)*.06),.08+hash(n+55)*.08,n);};
  const far=()=>{const c=this.ctx,hz=fy-H*.12;
   c.fillStyle='rgba(150,160,170,.55)';c.beginPath();c.moveTo(0,hz+H*.08);for(let k=0;k<=24;k++)c.lineTo(k/24*w,hz-H*(.04+hash(k+60)*.08)+Math.sin(k*.7)*H*.02);c.lineTo(w,h);c.lineTo(0,h);c.closePath();c.fill();
   const ruin=(x,base,pw,ph,col)=>{c.fillStyle=col;c.beginPath();c.moveTo(x-pw/2,base);c.lineTo(x-pw/2,base-ph);c.lineTo(x-pw*.1,base-ph-pw*.25);c.lineTo(x+pw*.2,base-ph+pw*.15);c.lineTo(x+pw/2,base-ph-pw*.1);c.lineTo(x+pw/2,base);c.closePath();c.fill();};
   for(let k=0;k<9;k++){const d=hash(k+71);ruin(w*(.38+hash(k+70)*.6),hz+H*.06,H*(.035+hash(k+73)*.03)*(1-d*.4),H*(.25+hash(k+72)*.55)*(1-d*.5),`rgba(${118+d*50|0},${128+d*48|0},${140+d*44|0},${(.75-d*.4).toFixed(2)})`);}
   const ax=fx-H*.75,ab=hz+H*.06,aw=H*.42,ah=H*.55;c.fillStyle='rgba(126,136,148,.6)';c.fillRect(ax-aw/2,ab-ah,aw*.16,ah);c.fillRect(ax+aw/2-aw*.16,ab-ah,aw*.16,ah);c.beginPath();c.moveTo(ax-aw/2,ab-ah);c.quadraticCurveTo(ax,ab-ah-aw*.55,ax+aw/2,ab-ah);c.lineTo(ax+aw/2-aw*.16,ab-ah);c.quadraticCurveTo(ax,ab-ah-aw*.36,ax-aw/2+aw*.16,ab-ah);c.closePath();c.fill();
   const m=c.createLinearGradient(0,hz-H*.5,0,hz+H*.2);m.addColorStop(0,'rgba(228,233,237,0)');m.addColorStop(1,'rgba(228,233,237,.75)');c.fillStyle=m;c.fillRect(0,hz-H*.5,w,H*.7);};
  const ridge=()=>{const c=this.ctx,path=()=>{c.beginPath();c.moveTo(fx-H*1.4,h+10);c.lineTo(fx-H*1.05,fy+H*.1);c.quadraticCurveTo(fx-H*.6,fy,fx-H*.25,fy+H*.005);c.lineTo(fx+H*.2,fy-H*.01);c.quadraticCurveTo(fx+H*.6,fy+H*.02,fx+H*.85,fy+H*.09);c.lineTo(w+10,fy+H*.16);c.lineTo(w+10,h+10);c.closePath();};
   this.rimFill(path,this.metal(0,fy,0,h,['#2a2f36','#14171b']),'#dfe6ec',-s*.5,s*1.4);
   c.save();path();c.clip();c.strokeStyle='rgba(255,255,255,.08)';c.lineWidth=s*.4;for(let k=0;k<18;k++){const x=fx-H*.9+hash(k+90)*H*2,y=fy+H*(.04+hash(k+91)*.2);c.beginPath();c.moveTo(x,y);c.lineTo(x+H*(.05+hash(k+92)*.1),y+H*(.02+hash(k+93)*.05));c.stroke();}this.blob(fx,fy+H*.02,H*.35,'#000000',.35);c.restore();};
  const figure=()=>{const c=this.ctx,rim='#e9eef3',body=['#1e2228','#101215'],dark=(y0,y1)=>this.metal(0,Y(y0),0,Y(y1),body),poly=pts=>()=>{c.beginPath();pts.forEach(([x,y],k)=>k?c.lineTo(X(x),Y(y)):c.moveTo(X(x),Y(y)));c.closePath();},mirror=pts=>pts.map(([x,y])=>[-x,y]);
   c.save();c.translate(X(3),Y(1));c.scale(1,.18);this.blob(0,0,28*s,'#000000',.55);c.restore();
   // Cape, billowing right in the wind, lit through at its edges.
   const cape=()=>{c.beginPath();c.moveTo(X(-12),Y(-83));c.bezierCurveTo(X(-19),Y(-72),X(-21),Y(-48),X(-16),Y(-26));c.bezierCurveTo(X(-14),Y(-14),X(-13),Y(-8),X(-9),Y(-4));for(const [x,y] of [[-3,-6],[5,-3],[13,-8],[21,-6],[30,-13],[39,-15],[48,-24],[57,-27],[64,-36]])c.lineTo(X(x),Y(y));c.bezierCurveTo(X(52),Y(-52),X(36),Y(-70),X(14),Y(-83));c.closePath();};
   this.rimFill(cape,this.metal(X(-20),0,X(64),0,['#2a0709','#5d1016','#7d1a1f']),'#ff6a4f',ox,oy);
   c.save();cape();c.clip();c.strokeStyle='rgba(0,0,0,.35)';c.lineWidth=s*1.6;for(let k=0;k<5;k++){c.beginPath();c.moveTo(X(-6+k*6),Y(-80));c.quadraticCurveTo(X(4+k*10),Y(-50),X(8+k*12),Y(-8-k*5));c.stroke();}this.blob(X(40),Y(-40),22*s,'#ff4a3a',.18);c.restore();
   // Legs and boots.
   this.rimFill(poly([[-9.5,-34],[-2.5,-34],[-3.5,-5],[-10,-5]]),dark(-34,0),rim,ox,oy);this.rimFill(poly([[2.5,-34],[9.5,-34],[11,-5],[4.5,-5]]),dark(-34,0),rim,ox,oy);
   this.rimFill(poly([[-10.5,-7],[-3.2,-7],[-2.6,0],[-12.5,0],[-12,-2.5]]),'#0e1013',rim,ox*.6,oy*.6);this.rimFill(poly([[4.2,-7],[11.5,-7],[13.2,-2.5],[13.5,0],[3.6,0]]),'#0e1013',rim,ox*.6,oy*.6);
   // Long coat flaring to the knees, then a tapered chest.
   this.rimFill(poly([[-10.5,-62],[10.5,-62],[15,-40],[15,-30],[11,-33],[8,-27],[3,-31],[-1,-26],[-5,-31],[-9,-27],[-13,-31],[-16,-30],[-15,-40]]),dark(-62,-26),rim,ox,oy);
   this.rimFill(()=>{c.beginPath();c.moveTo(X(-10),Y(-60));c.bezierCurveTo(X(-12),Y(-68),X(-15),Y(-76),X(-15.5),Y(-81));c.lineTo(X(-6),Y(-87));c.lineTo(X(6),Y(-87));c.lineTo(X(15.5),Y(-81));c.bezierCurveTo(X(15),Y(-76),X(12),Y(-68),X(10),Y(-60));c.closePath();},dark(-87,-60),rim,ox,oy);
   c.fillStyle='rgba(255,255,255,.18)';c.fillRect(X(-10),Y(-62),20*s,.8*s);
   // Glaive in the right hand, its blade catching the light.
   this.rimFill(()=>{c.beginPath();c.moveTo(X(28.7),Y(-112));c.lineTo(X(30.3),Y(-111.7));c.lineTo(X(20.3),Y(3));c.lineTo(X(18.7),Y(2.7));c.closePath();},'#15171b','#c9d2db',ox*.5,oy*.5);
   this.rimFill(()=>{c.beginPath();c.moveTo(X(28.6),Y(-106));c.quadraticCurveTo(X(42),Y(-118),X(33),Y(-136));c.quadraticCurveTo(X(36),Y(-119),X(27.8),Y(-112));c.closePath();},this.metal(X(28),Y(-136),X(42),Y(-108),['#5b636d','#1c2026']),'#ffffff',ox*.7,oy*.7);
   c.strokeStyle='rgba(255,255,255,.9)';c.lineWidth=s*.32;c.beginPath();c.moveTo(X(29.4),Y(-108));c.quadraticCurveTo(X(41),Y(-119),X(33.2),Y(-135));c.stroke();
   // Arms with a slight bend at the elbow, and hands.
   this.rimFill(poly([[-15.5,-80],[-11.5,-79],[-15,-64],[-14.5,-50],[-18.5,-50],[-20,-64]]),dark(-80,-50),rim,ox,oy);
   this.rimFill(poly([[11.5,-79],[15.5,-80],[22,-68],[25.5,-57],[22,-55],[18,-66]]),dark(-80,-55),rim,ox,oy);
   this.rimFill(()=>{c.beginPath();c.arc(X(-16.5),Y(-48.5),2.3*s,0,Math.PI*2);c.arc(X(24),Y(-55.5),2.3*s,0,Math.PI*2);},'#121418',rim,ox*.6,oy*.6);
   // Layered pauldrons with a specular edge.
   const plateA=[[-6,-85],[-13,-88],[-20,-86],[-23,-77],[-17,-75],[-15,-80],[-6,-81]],plateB=[[-13,-79],[-20,-80],[-23.5,-72],[-18.5,-70.5],[-17.5,-75],[-13,-76]];
   for(const pts of [plateB,mirror(plateB),plateA,mirror(plateA)]){this.rimFill(poly(pts),this.metal(0,Y(-88),0,Y(-70),['#2c3239','#121418']),'#ffffff',ox,oy);}
   c.strokeStyle='rgba(255,255,255,.5)';c.lineWidth=s*.3;for(const sx of [-1,1]){c.beginPath();c.moveTo(X(sx*-7),Y(-85.2));c.quadraticCurveTo(X(sx*-17),Y(-88.5),X(sx*-22),Y(-78.5));c.stroke();}
   // Fur collar, lit on the side facing the light.
   for(let k=0;k<70;k++){const a=Math.PI+hash(k+300)*Math.PI,r=8+hash(k+301)*4.5,x=Math.cos(a)*r,y=-85.5+Math.sin(a)*3,lit=x>1.5;c.fillStyle=lit?(hash(k+302)<.5?'#ff6a4f':'#c02c2c'):(hash(k+302)<.5?'#4a0b10':'#2a0608');this.stroke(X(x),Y(y),a+(hash(k+303)-.5)*.8,s*(1.8+hash(k+304)*3),s*(.9+hash(k)*1.1),(hash(k+305)-.5)*.8,k);}
   // Head, then windswept white hair, backlit.
   this.rimFill(()=>{c.beginPath();c.ellipse(X(-.3),Y(-93),5*s,6.2*s,-.06,0,Math.PI*2);},'#121418',rim,ox,oy);
   this.blob(X(4),Y(-97),13*s,'#ffffff',.4);
   c.beginPath();c.moveTo(X(-5.2),Y(-95));c.quadraticCurveTo(X(-4),Y(-101.5),X(2),Y(-101));c.quadraticCurveTo(X(9),Y(-100.5),X(17),Y(-98.5));for(const [x,y] of [[11,-97],[19,-95],[10.5,-94.5],[16,-91.5],[7,-92]])c.lineTo(X(x),Y(y));c.quadraticCurveTo(X(3),Y(-90),X(1),Y(-92.5));c.quadraticCurveTo(X(-3),Y(-91),X(-5.2),Y(-95));c.closePath();
   c.fillStyle=this.metal(X(-5),Y(-101),X(17),Y(-91),['#ffffff','#e3e9ef','#aeb8c3']);c.fill();
   for(let k=0;k<34;k++){const sx=-3.5+hash(k+400)*8,sy=-100.5+hash(k+401)*5,tone=hash(k+403);c.fillStyle=tone<.5?'#ffffff':tone<.85?'#d9e0e7':'#9ea8b3';this.stroke(X(sx),Y(sy),-.05+hash(k+402)*.32,s*(6+hash(k+404)*9),s*(.35+hash(k)*.6),.25+hash(k+405)*.3,k);}
   c.fillStyle='#dfe6ee';for(let k=0;k<6;k++)this.stroke(X(-4.5+hash(k+410)*2),Y(-96+hash(k+411)*2),1.9+hash(k+412)*.5,s*(4+hash(k+413)*3),s*.6,.2,k);};
  const front=()=>{this.smoke(-w*.05,h*.92,-.12,w*.6,h*.09,.35,3);this.smoke(w*1.02,h*.95,Math.PI+.15,w*.4,h*.08,.3,8);for(let n=0;n<7;n++)this.blob(w*(.45+hash(n+700)*.55),h*(.15+hash(n+701)*.8),H*(.015+hash(n+702)*.03),'#ff8a3c',.35);};
  const grade=()=>{const c=this.ctx,g=c.createRadialGradient(fx,fy-H*.5,H*.3,fx,fy-H*.5,Math.hypot(w,h)*.75);g.addColorStop(0,'rgba(10,12,15,0)');g.addColorStop(1,'rgba(10,12,15,.55)');c.fillStyle=g;c.fillRect(0,0,w,h);};
  return [[sky,[{blur:6}]],[far,[{blur:2.5}]],[ridge,[{blur:1}]],[figure,[{blur:.7},{alpha:.4}]],[front,[{blur:16}]],[grade]];}
 minimap(engine,t){const c=this.ctx;if(this.w<=860)return;const w=200,h=Math.round(w*WORLD.height/WORLD.width),x=this.w-w-24,y=68,sx=w/WORLD.width,sy=h/WORLD.height,cam=this.camera,v=this.view(true);c.save();
  c.beginPath();if(c.roundRect)c.roundRect(x,y,w,h,12);else c.rect(x,y,w,h);c.fillStyle='rgba(14,16,20,.78)';c.fill();c.strokeStyle='rgba(255,255,255,.09)';c.lineWidth=1;c.stroke();c.clip();
  c.fillStyle='rgba(255,255,255,.16)';for(const wall of WALLS)c.fillRect(x+wall.x*sx,y+wall.y*sy,wall.w*sx,wall.h*sy);
  c.strokeStyle='rgba(255,255,255,.28)';c.strokeRect(x+(cam.x-this.w/2/cam.zoom)*sx,y+(cam.y-v.height/2/cam.zoom)*sy,this.w/cam.zoom*sx,v.height/cam.zoom*sy);
  for(const site of SITES){const hot=engine.actors[0].proof?.siteId===site.id;c.fillStyle=hot?'#d9b46a':'rgba(255,255,255,.4)';c.beginPath();c.arc(x+site.x*sx,y+site.y*sy,hot?4:2.5,0,Math.PI*2);c.fill();}
  c.fillStyle='#86a8ff';c.beginPath();c.arc(x+RELAY.x*sx,y+RELAY.y*sy,3,0,Math.PI*2);c.fill();
  engine.actors.forEach((a,i)=>{if(i&&(!lineClear(engine.actors[0],a)||distance(engine.actors[0],a)>850))return;const px=x+a.x*sx,py=y+a.y*sy;c.fillStyle=i?'#e04848':'#ffffff';c.beginPath();c.arc(px,py,3.5,0,Math.PI*2);c.fill();if(!i&&!this.reduced)this.ring(px,py,4+(t*8%8),'#ffffff',.45);});
  c.restore();}
}
