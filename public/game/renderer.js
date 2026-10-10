import {RULES} from './rules.js';
import {WORLD,WALLS,SITES,RELAY,distance,lineClear,clamp} from './world.js';
// Ink-and-mist renderer: pale lavender fog, white cloud filigree, black ink tendrils, thorned eyes and white starbursts.
// Pure presentation: never touches engine state or combat RNG. All shapes are seeded so they do not jitter between frames.
const PAPER='#ece8ee',MIST='#d4cdd9',INK='#141016',INK2='#2c2531',GREY='#8b8292',WHITE='#fbf9fc',VIOLET='#5d3f7a',BLOOD='#7c1626';
const SERIF='"Cormorant Garamond","Palatino Linotype",Palatino,"Book Antiqua",Georgia,serif';
const TEAM=[{mantle:WHITE,vein:'#14101699',head:INK,accent:VIOLET,hp:'#3b2a52',label:'#2c2531'},{mantle:INK,vein:'#fbf9fc66',head:INK,accent:BLOOD,hp:BLOOD,label:'#4a1520'}];
const TINT={ember:BLOOD,rift:VIOLET,nova:WHITE,siphon:INK2,mend:WHITE,decoy:GREY,field:INK};
const SITE_TINT={north:VIOLET,vault:INK2,tower:BLOOD};
const hash=n=>{const s=Math.sin(n*127.1+311.7)*43758.5453;return s-Math.floor(s);};
export class ArenaRenderer{
 constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.effects=[];this.camera={x:1120,y:770,zoom:.8};this.shake=0;this.tear=0;this.flash=0;this.motion=[{},{}];this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;this.layer=this.bake();this.resize();new ResizeObserver(()=>this.resize()).observe(canvas);}
 resize(){const b=this.canvas.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);this.dpr=d;this.w=b.width;this.h=b.height;this.canvas.width=this.w*d;this.canvas.height=this.h*d;this.ctx.setTransform(d,0,0,d,0,0);}
 view(playing){const bottom=this.w<800?172:145;return {x:this.w/2,y:64+(this.h-64-(playing?bottom:0))/2,height:this.h-64-bottom};}
 screenToWorld(x,y){const v=this.view(true),c=this.camera;return {x:(x-v.x)/c.zoom+c.x,y:(y-v.y)/c.zoom+c.y};}
 event(e,engine){if(['damage','perfect','release','nova','wardBreak','clash','clashEnd','heal','death','proof'].includes(e.type)){const a=engine.actors[e.actor??0];this.effects.push({...e,x:a.x,y:a.y,at:performance.now()/1000,seed:Math.random()*100});}
  if(['damage','clashEnd'].includes(e.type))this.shake=e.type==='clashEnd'?8:3.5;
  if(['damage','death','clash','clashEnd'].includes(e.type))this.tear=Math.max(this.tear,e.type==='damage'?.4:.9);
  if(['clash','clashEnd','perfect','death','proof'].includes(e.type))this.flash=e.type==='perfect'?.07:.12;}
 // Static arena art is baked once into an offscreen layer when the platform supports it.
 bake(){try{const scale=1.5,cv=typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(WORLD.width*scale,WORLD.height*scale):document.createElement('canvas');if(!cv.getContext)return null;cv.width=WORLD.width*scale;cv.height=WORLD.height*scale;const ctx=cv.getContext('2d');if(!ctx)return null;ctx.scale(scale,scale);const keep=this.ctx;this.ctx=ctx;this.floor();WALLS.forEach((w,i)=>this.wall(w,i));this.ctx=keep;return cv;}catch{return null;}}
 draw(now,engine,playing){const c=this.ctx,w=this.w,h=this.h,t=now/1000,v=this.view(playing),cam=this.camera;c.clearRect(0,0,w,h);c.fillStyle=MIST;c.fillRect(0,0,w,h);
  if(playing&&engine){const a=engine.actors[0];cam.zoom=.82;const x=clamp(a.x,w/(2*cam.zoom),WORLD.width-w/(2*cam.zoom)),y=clamp(a.y,v.height/(2*cam.zoom),WORLD.height-v.height/(2*cam.zoom));cam.x+=(x-cam.x)*.12;cam.y+=(y-cam.y)*.12;}else{cam.x=1120;cam.y=770;cam.zoom=Math.min(w/WORLD.width,h/WORLD.height)*.95;}
  c.save();c.translate(v.x,v.y);if(this.shake>.05&&!this.reduced){c.translate(Math.sin(t*121)*this.shake,Math.cos(t*113)*this.shake);this.shake*=.87;}c.scale(cam.zoom,cam.zoom);c.translate(-cam.x,-cam.y);
  if(this.layer)c.drawImage(this.layer,0,0,WORLD.width,WORLD.height);else{this.floor();WALLS.forEach((wall,i)=>this.wall(wall,i));}
  this.floorLive(t);for(const s of SITES)this.site(s,t,engine);this.relay(t);
  if(engine){for(const z of engine.zones)this.zone(z,t);
   for(const d of engine.decoys){c.save();c.globalAlpha=.35+(this.reduced?0:Math.sin(t*9)*.08);this.human({...d,facing:0,ward:0,hp:100},d.from,t,engine.time,true);c.restore();}
   for(const p of engine.projectiles)this.projectile(p,t);
   const order=[0,1].filter(i=>!i||!(!lineClear(engine.actors[0],engine.actors[i])||distance(engine.actors[0],engine.actors[i])>850)||engine.clash).sort((p,q)=>engine.actors[p].y-engine.actors[q].y);
   for(const i of order){const a=engine.actors[i];this.human(a,i,t,engine.time);this.familiar(a,i,t);}
  }else{const demo=[{x:920,y:760,facing:.3,hp:100,ward:0,cast:{kind:'thinking',start:0},name:'NYX'},{x:1430,y:830,facing:Math.PI-.3,hp:100,ward:0,cast:null,name:'MONK'}];demo.forEach((a,i)=>{this.human(a,i,t,0);this.familiar(a,i,t);});}
  this.effects=this.effects.filter(e=>t-e.at<1.5);for(const e of this.effects)this.effect(e,t,engine);
  if(engine&&playing){const a=engine.actors[0];const fog=c.createRadialGradient(a.x,a.y,230,a.x,a.y,640);fog.addColorStop(0,'#d8d1dd00');fog.addColorStop(.7,'#d8d1dd55');fog.addColorStop(1,'#cfc7d5b8');c.fillStyle=fog;c.fillRect(0,0,WORLD.width,WORLD.height);}
  c.restore();
  if(!playing)this.keyArt(t);
  this.post(t);
  if(playing&&engine)this.minimap(engine,t);
 }
 // ---------- ink primitives ----------
 // A tapered, curling ink stroke: the basic mark for tendrils, thorns, drips, hair and claws.
 tendril(x,y,ang,len,width,curl=0,seed=0,wob=0){const c=this.ctx,N=12,L=[],R=[];let px=x,py=y;for(let k=0;k<=N;k++){const s=k/N,a=ang+curl*s+wob*Math.sin(s*6+seed);if(k){px+=Math.cos(a)*len/N;py+=Math.sin(a)*len/N;}const hw=width*Math.pow(1-s,.85)/2,nx=-Math.sin(a),ny=Math.cos(a);L.push([px+nx*hw,py+ny*hw]);R.push([px-nx*hw,py-ny*hw]);}
  c.beginPath();c.moveTo(L[0][0],L[0][1]);for(const p of L)c.lineTo(p[0],p[1]);for(let k=R.length-1;k>=0;k--)c.lineTo(R[k][0],R[k][1]);c.closePath();c.fill();}
 swirl(x,y,r,turns=1.6,rot=0,dir=1){const c=this.ctx,total=turns*Math.PI*2;c.beginPath();for(let a=0;a<=total;a+=.22){const rr=r*(1-a/total*.88);c.lineTo(x+Math.cos(rot+dir*a)*rr,y+Math.sin(rot+dir*a)*rr);}c.stroke();}
 // White cloud filigree like etched mist: a few spirals joined by S-curves.
 cloud(x,y,size,seed){const c=this.ctx;const n=2+Math.floor(hash(seed)*3);for(let k=0;k<n;k++){const ox=(hash(seed+k*3)-.5)*size*2.2,oy=(hash(seed+k*5)-.5)*size*.9,r=size*(.35+hash(seed+k*7)*.5);this.swirl(x+ox,y+oy,r,1.3+hash(seed+k)*.9,hash(seed+k*11)*6,k%2?1:-1);c.beginPath();c.moveTo(x+ox-r,y+oy);c.bezierCurveTo(x+ox-r*1.8,y+oy+r*.9,x+ox-r*2.6,y+oy-r*.4,x+ox-r*3.2,y+oy+r*.3);c.stroke();}}
 eye(x,y,w,h,look=0,open=1){const c=this.ctx;c.save();c.beginPath();c.moveTo(x-w,y);c.quadraticCurveTo(x,y-h*2*open,x+w,y);c.quadraticCurveTo(x,y+h*2*open,x-w,y);c.closePath();c.fillStyle=WHITE;c.fill();c.save();c.clip();c.fillStyle=INK;c.beginPath();c.arc(x+look,y,h*.95,0,Math.PI*2);c.fill();c.fillStyle=WHITE;c.beginPath();c.arc(x+look,y,h*.42,0,Math.PI*2);c.fill();c.fillStyle=INK;c.beginPath();c.arc(x+look,y,h*.26,0,Math.PI*2);c.fill();c.restore();c.strokeStyle=INK;c.lineWidth=Math.max(.8,h*.18);c.stroke();c.restore();}
 starburst(x,y,r1,r2,n,rot=0,fill=WHITE,stroke=INK){const c=this.ctx;c.save();const g=c.createRadialGradient(x,y,0,x,y,r1*1.8);g.addColorStop(0,'#ffffffcc');g.addColorStop(1,'#ffffff00');c.fillStyle=g;c.beginPath();c.arc(x,y,r1*1.8,0,Math.PI*2);c.fill();c.beginPath();for(let k=0;k<n*2;k++){const a=rot+k/(n*2)*Math.PI*2,r=k%2?r2:r1*(.75+hash(k+n)*.45);c.lineTo(x+Math.cos(a)*r,y+Math.sin(a)*r);}c.closePath();c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=Math.max(.6,r1*.05);c.stroke();}c.restore();}
 // The thorned eye: black iris disc with a white almond eye, a hair-thin spiky halo and an optional filigree tail.
 thornEye(x,y,r,t,seed=1,tail=0,look=0){const c=this.ctx,sway=this.reduced?0:Math.sin(t*1.3+seed)*.06;c.save();c.fillStyle=INK;
  for(let k=0;k<42;k++){const a=k/42*Math.PI*2+hash(seed+k)*.2,long=k%7===0,len=r*(long?1.5+hash(k+seed*3):.35+hash(k*2+seed)*.7);this.tendril(x+Math.cos(a)*r*.92,y+Math.sin(a)*r*.92,a+sway,len,long?r*.14:r*.08,(hash(k*5+seed)-.5)*.9,seed);}
  c.strokeStyle=INK;c.lineWidth=Math.max(.6,r*.035);for(let k=0;k<4;k++){c.beginPath();c.arc(x,y,r*(1.08+k*.09),hash(seed+k)*6,hash(seed+k)*6+2+hash(k)*2);c.stroke();}
  if(tail){c.lineWidth=Math.max(.8,r*.05);c.beginPath();c.moveTo(x+r,y);c.lineTo(x+r+tail,y+tail*.02);c.stroke();for(let j=0;j<Math.floor(tail/(r*.55));j++){const px=x+r*1.2+j*r*.55,up=j%2?-1:1,sz=r*(.18+hash(seed+j)*.28)*(1-j*r*.55/tail*.6);c.lineWidth=Math.max(.6,r*.035);this.swirl(px,y+up*sz*1.1,sz,1.2,j,up);c.fillStyle=INK;this.tendril(px,y,-Math.PI/2*up+(hash(j)-.5),sz*2.4,sz*.35,(hash(j+3)-.5)*1.2,j);}}
  c.fillStyle=INK;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();this.eye(x,y,r*.62,r*.28,look);c.restore();}
 label(text,x,y,size,fill=INK,stroke=PAPER,align='center'){const c=this.ctx;c.font=`italic 700 ${size}px ${SERIF}`;c.textAlign=align;c.lineJoin='round';c.lineWidth=Math.max(2.5,size*.2);c.strokeStyle=stroke;c.strokeText(text,x,y);c.fillStyle=fill;c.fillText(text,x,y);}
 ring(x,y,r,color,opacity=1,width=1.5){const c=this.ctx;c.save();c.globalAlpha*=opacity;c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.stroke();c.restore();}
 splatter(x,y,r,seed,color=INK){const c=this.ctx;c.fillStyle=color;c.beginPath();c.arc(x,y,r*.45,0,Math.PI*2);c.fill();for(let k=0;k<11;k++){const a=hash(seed+k)*Math.PI*2,d=r*(.4+hash(seed+k*3)*.9);this.tendril(x+Math.cos(a)*r*.2,y+Math.sin(a)*r*.2,a,d,r*(.12+hash(k+seed)*.14),(hash(k*7+seed)-.5)*.6,k);c.beginPath();c.arc(x+Math.cos(a)*(d+r*.25),y+Math.sin(a)*(d+r*.25),r*(.04+hash(k*9+seed)*.08),0,Math.PI*2);c.fill();}}
 // ---------- arena ----------
 floor(){const c=this.ctx,W=WORLD.width,H=WORLD.height;const g=c.createRadialGradient(W/2,H/2,100,W/2,H/2,W*.62);g.addColorStop(0,'#f1eef3');g.addColorStop(.6,'#ddd6e1');g.addColorStop(1,'#c4bbca');c.fillStyle=g;c.fillRect(0,0,W,H);
  for(let n=0;n<14;n++){const x=hash(n+40)*W,y=hash(n+80)*H,r=180+hash(n)*260,m=c.createRadialGradient(x,y,0,x,y,r);m.addColorStop(0,n%3?'#ffffff40':'#b6abc030');m.addColorStop(1,'#ffffff00');c.fillStyle=m;c.fillRect(x-r,y-r,r*2,r*2);}
  // Etched cloud filigree, a grey ghost under each white line so it reads on pale mist.
  c.lineCap='round';for(const [col,off,lw] of [['#9d93a666',1.6,1.6],['#ffffffcc',0,1.4]]){c.strokeStyle=col;c.lineWidth=lw;c.save();c.translate(off,off);for(let n=0;n<85;n++)this.cloud(hash(n+300)*W,hash(n+600)*H,16+hash(n+900)*30,n*13);c.restore();}
  // Fine etched hatching that darkens toward the rim.
  c.strokeStyle='#3a30401f';c.lineWidth=1;for(let n=0;n<700;n++){const edge=hash(n+5)<.5,x=edge?(hash(n)<.5?hash(n+1)*160:W-hash(n+1)*160):hash(n+2)*W,y=edge?hash(n+3)*H:(hash(n)<.5?hash(n+4)*130:H-hash(n+4)*130),a=.9+hash(n+7)*.4,l=6+hash(n+8)*14;c.beginPath();c.moveTo(x,y);c.lineTo(x+Math.cos(a)*l,y+Math.sin(a)*l);c.stroke();}
  // Midlane: an etched cartouche.
  c.strokeStyle='#1410165c';c.lineWidth=1;c.strokeRect(878,700,484,160);c.strokeRect(886,708,468,144);for(const [x,y] of [[878,700],[1362,700],[878,860],[1362,860]]){c.beginPath();c.arc(x,y,9,0,Math.PI*2);c.stroke();}
  c.font=`italic 600 17px ${SERIF}`;c.textAlign='center';c.fillStyle='#14101688';c.fillText('the contested midlane',1120,744);c.font=`10px ${SERIF}`;c.fillStyle='#14101666';c.fillText('— where the two minds meet —',1120,764);
  // Ink frame with thorny vines creeping in from the rim.
  c.fillStyle=INK;for(let n=0;n<120;n++){const side=n%4,p=hash(n+70),x=side===0?p*W:side===1?W-14:side===2?p*W:14,y=side===0?14:side===1?p*H:side===2?H-14:p*H,a=[Math.PI/2,Math.PI,-Math.PI/2,0][side]+(hash(n+90)-.5)*1.1;this.tendril(x,y,a,20+hash(n+11)*70,3+hash(n+12)*5,(hash(n+13)-.5)*2.2,n,.15);}
  c.strokeStyle=INK;c.lineWidth=10;c.strokeRect(5,5,W-10,H-10);c.lineWidth=1;c.strokeRect(22,22,W-44,H-44);
 }
 // Walls are ink monoliths: ragged edges, white etched highlights, drips and thorns.
 wall(w,i){const c=this.ctx,j=(k,s)=>(hash(i*97+k*13+s)-.5)*6;
  c.fillStyle='#4a405233';c.fillRect(w.x+10,w.y+14,w.w,w.h+6);
  c.beginPath();let k=0;for(let x=w.x;x<w.x+w.w;x+=12)c.lineTo(x,w.y+j(k++,1));for(let y=w.y;y<w.y+w.h;y+=12)c.lineTo(w.x+w.w+j(k++,2),y);for(let x=w.x+w.w;x>w.x;x-=12)c.lineTo(x,w.y+w.h+j(k++,3));for(let y=w.y+w.h;y>w.y;y-=12)c.lineTo(w.x+j(k++,4),y);c.closePath();
  const g=c.createLinearGradient(w.x,w.y,w.x+w.w,w.y+w.h);g.addColorStop(0,'#2c2531');g.addColorStop(1,INK);c.fillStyle=g;c.fill();
  c.save();c.clip();c.strokeStyle='#fbf9fc2e';c.lineWidth=1;for(let n=0;n<(w.w+w.h)/5;n++){const x=w.x+hash(i*31+n)*w.w*.6,y=w.y+hash(i*17+n)*w.h*.5;c.beginPath();c.moveTo(x,y);c.lineTo(x+5+hash(n)*9,y+7+hash(n+1)*10);c.stroke();}
  c.strokeStyle='#fbf9fc55';c.lineWidth=1.2;this.swirl(w.x+w.w*.5,w.y+w.h*.5,Math.min(w.w,w.h)*.28,1.8,i,i%2?1:-1);c.restore();
  c.fillStyle=INK;const drips=Math.max(2,Math.floor(w.w/22));for(let n=0;n<drips;n++){const x=w.x+(n+.5)*w.w/drips+(hash(i+n)-.5)*8,len=10+hash(i*7+n)*34;this.tendril(x,w.y+w.h-2,Math.PI/2+(hash(n+i)-.5)*.3,len,4+hash(n*3+i)*4,(hash(n*5+i)-.5)*.4,n);c.beginPath();c.arc(x+(hash(n)-.5)*3,w.y+w.h+len*.95,1.6+hash(n+9)*1.6,0,Math.PI*2);c.fill();}
  for(let n=0;n<4;n++){const left=n%2===0,y=w.y+hash(i*3+n)*w.h;this.tendril(left?w.x+2:w.x+w.w-2,y,left?Math.PI+(hash(n)-.5)*.8:(hash(n)-.5)*.8,12+hash(i+n*5)*22,4,(hash(n+i*9)-.5)*1.6,n);}
  if(i%4===1)this.eye(w.x+w.w/2,w.y+w.h*.3,Math.min(10,w.w*.14),Math.min(4,w.w*.05),0,.55);
 }
 floorLive(t){const c=this.ctx;if(this.reduced)return;c.save();for(let n=0;n<34;n++){const x=(hash(n+900)*WORLD.width+t*(8+hash(n)*14))%WORLD.width,y=hash(n+700)*WORLD.height+Math.sin(t*.4+n)*30,r=30+hash(n+3)*70,g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,'#ffffff2a');g.addColorStop(1,'#ffffff00');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);}c.restore();}
 site(s,t,engine){const c=this.ctx,proof=engine?.actors[0].proof?.siteId===s.id?engine.actors[0]:null,spin=this.reduced?0:t*.15,tint=SITE_TINT[s.id]||INK;c.save();c.translate(s.x,s.y);
  const g=c.createRadialGradient(0,0,10,0,0,100);g.addColorStop(0,proof?'#ffffffee':'#ffffff55');g.addColorStop(1,'#ffffff00');c.fillStyle=g;c.beginPath();c.arc(0,0,100,0,Math.PI*2);c.fill();
  this.ring(0,0,96,INK,.7,1);this.ring(0,0,90,INK,.35,1);c.save();c.rotate(spin);c.fillStyle=tint;for(let k=0;k<28;k++){const a=k/28*Math.PI*2;this.tendril(Math.cos(a)*90,Math.sin(a)*90,a,k%4?7:16,k%4?2:3,(hash(k)-.5)*.6,k);}c.restore();
  c.strokeStyle=tint;c.lineWidth=1.1;for(let k=0;k<3;k++)this.swirl(Math.cos(k*2.1+spin)*58,Math.sin(k*2.1+spin)*58,12,1.4,k,k%2?1:-1);
  if(proof){this.starburst(0,0,38,10,12,this.reduced?0:t*.3);this.eye(0,0,16,6,0,1);}else this.eye(0,0,14,5,0,.35);
  this.label(s.name,0,-112,17,INK);c.font=`italic 11px ${SERIF}`;c.textAlign='center';c.fillStyle=proof?VIOLET:'#14101699';c.fillText(proof?'the flag proof is verified':'a candidate site',0,124);
  if(proof&&proof.capture>0){c.strokeStyle=INK;c.lineWidth=6;c.beginPath();c.arc(0,0,96,-Math.PI/2,-Math.PI/2+proof.capture/RULES.captureTime*Math.PI*2);c.stroke();}c.restore();}
 relay(t){const x=RELAY.x,y=RELAY.y,c=this.ctx;const g=c.createRadialGradient(x,y,10,x,y,90);g.addColorStop(0,'#ffffffaa');g.addColorStop(1,'#ffffff00');c.fillStyle=g;c.beginPath();c.arc(x,y,90,0,Math.PI*2);c.fill();
  this.thornEye(x,y,26,t,7,0,this.reduced?0:Math.sin(t*.7)*5);this.label('Noetic Relay',x,y-82,16,VIOLET);c.font=`italic 11px ${SERIF}`;c.textAlign='center';c.fillStyle='#14101699';c.fillText('approach, and scan',x,y+88);}
 zone(z,t){const c=this.ctx,col=z.from===0?VIOLET:INK,spin=this.reduced?0:t*.6;c.save();c.translate(z.x,z.y);const g=c.createRadialGradient(0,0,10,0,0,z.radius);g.addColorStop(0,'#1410160a');g.addColorStop(1,'#14101630');c.fillStyle=g;c.beginPath();c.arc(0,0,z.radius,0,Math.PI*2);c.fill();
  this.ring(0,0,z.radius,col,.75,1.4);c.rotate(spin);c.fillStyle=col;for(let k=0;k<24;k++){const a=k/24*Math.PI*2;this.tendril(Math.cos(a)*z.radius,Math.sin(a)*z.radius,a+Math.PI,14+hash(k)*16,3,(hash(k+1)-.5)*.8,k);}c.restore();}
 projectile(p,t){const c=this.ctx,tint=TINT[p.action]||INK,ang=Math.atan2(p.vy,p.vx),len=Math.hypot(p.vx,p.vy)*.12;c.save();
  c.fillStyle=tint;for(let k=0;k<3;k++)this.tendril(p.x,p.y,ang+Math.PI+(k-1)*.18,len*(1-Math.abs(k-1)*.35),p.radius*(k===1?1.2:.6),(k-1)*.3,p.id+k,this.reduced?0:.25*Math.sin(t*20+k));
  c.fillStyle=INK;this.tendril(p.x,p.y,ang+Math.PI,len*1.2,1.6,0,p.id);
  if(tint===WHITE)this.starburst(p.x,p.y,p.radius*1.3,p.radius*.5,8,t*4);else{c.fillStyle=tint;c.beginPath();c.arc(p.x,p.y,p.radius*.75,0,Math.PI*2);c.fill();c.strokeStyle=INK;c.lineWidth=1.5;c.stroke();this.eye(p.x,p.y,p.radius*.5,p.radius*.2,Math.cos(ang)*2);}c.restore();}
 // ---------- characters ----------
 // A summoner as in the reference: a small dark head crowned by a starburst (or thorns),
 // a wide mantle swept into horns, ink tendrils dripping from its hem, and long dark legs.
 figure(i,facing,opts={}){const c=this.ctx,T=TEAM[i],t=opts.t||0,walk=opts.walk||0,moving=opts.moving||0,grand=opts.grand?1:0,dir=Math.cos(facing)>=0?1:-1,breathe=this.reduced?0:Math.sin(t*1.8+i)*.8,sp=1+grand*.6;
  c.lineJoin='round';c.lineCap='round';c.fillStyle=INK;
  const sa=Math.sin(walk)*.28*moving,sway=this.reduced?0:Math.sin(t*2.2+i)*.12,reach=(grand?36:28)*sp,hem=14*sp,nd=grand?13:7;
  // Dripping hem first, so the legs and mantle sit over it.
  for(let n=0;n<nd;n++){const x=-hem+n*hem*2/(nd-1),len=(7+hash(n+i*9)*16)*(1+grand*1.6);this.tendril(x,-28,Math.PI/2+(hash(n+i)-.5)*.5+sway*.5,len,(3+hash(n*3)*3)*(1+grand*.3),(hash(n*5+i)-.5)*.8,n,.08);if(n%3===0){c.beginPath();c.arc(x+(hash(n)-.5)*4,-28+len+3+grand*3,1+hash(n+2)*(1+grand),0,Math.PI*2);c.fill();}}
  const legW=grand?11:7,legL=26+grand*20;this.tendril(-5,-28,Math.PI/2+sa*.6+.05,legL,legW,-.15,1);this.tendril(5,-28,Math.PI/2-sa*.6-.05,legL,legW,.15,2);
  c.beginPath();c.ellipse(-6+sa*6,-28+legL,4+grand*2,2.2+grand,0,0,Math.PI*2);c.ellipse(6-sa*6,-28+legL,4+grand*2,2.2+grand,0,0,Math.PI*2);c.fill();
  // Horn claws: one curling up from each tip, one sweeping down from the underside.
  for(const side of [-1,1]){this.tendril(side*reach,-50-breathe,side>0?-.15:Math.PI+.15,10*sp+grand*16,3.5+grand,-side*2.4,side,.1);this.tendril(side*22*sp,-38,side>0?.55:Math.PI-.55,10*sp+grand*18,3.2+grand,side*1.5,side+5,.1);}
  // Mantle: a wide form swept into horns, narrowing to the hem.
  c.beginPath();c.moveTo(-5,-53);c.quadraticCurveTo(-16*sp,-58,-reach,-50-breathe);c.quadraticCurveTo(-22*sp,-42,-hem,-28);c.quadraticCurveTo(0,-22,hem,-28);c.quadraticCurveTo(22*sp,-42,reach,-50-breathe);c.quadraticCurveTo(16*sp,-58,5,-53);c.closePath();
  if(i===0){const g=c.createLinearGradient(0,-55,0,-24);g.addColorStop(0,WHITE);g.addColorStop(1,'#dcd5e0');c.fillStyle=g;}else c.fillStyle=T.mantle;c.fill();c.strokeStyle=INK;c.lineWidth=1.6;c.stroke();
  c.strokeStyle=T.vein;c.lineWidth=.9;for(let n=0;n<6;n++){const a=-Math.PI/2+(n-2.5)*.55,l=7+hash(n+i*4)*9;c.beginPath();c.moveTo(dir*2,-40);c.quadraticCurveTo(dir*2+Math.cos(a+.6)*l*.6,-40+Math.sin(a+.6)*l*.6+6,dir*2+Math.cos(a)*l*1.4,-40+Math.sin(a)*l*.6+8);c.stroke();}
  c.fillStyle=i?WHITE:INK;c.beginPath();c.arc(dir*2,-40,1.4,0,Math.PI*2);c.fill();
  // Blade.
  if(!opts.noBlade){const swing=opts.swing,blade=swing!=null?facing+(swing-.5)*2.4:facing+.9*dir,hx=Math.cos(facing)*13,hy=-36+Math.sin(facing)*5;c.save();c.translate(hx,hy);c.rotate(blade);c.strokeStyle=INK;c.lineWidth=2.6;c.beginPath();c.moveTo(-3,0);c.lineTo(32,0);c.stroke();c.strokeStyle=i?BLOOD:WHITE;c.lineWidth=.9;c.beginPath();c.moveTo(4,-.6);c.lineTo(30,-.6);c.stroke();c.fillStyle=INK;this.tendril(2,0,-Math.PI/2,7,2.4,.6,3);this.tendril(2,0,Math.PI/2,7,2.4,-.6,4);c.restore();}
  // Head and crown.
  const hy0=-58;if(i===0)this.starburst(0,hy0-2,15+breathe,5,13,this.reduced?0:t*.25);else{c.fillStyle=INK;for(let k=0;k<9;k++){const a=-Math.PI/2+(k-4)*.32;this.tendril(Math.cos(a)*5,hy0+Math.sin(a)*5,a+(hash(k)-.5)*.3,10+hash(k+1)*8,2.4,(hash(k+2)-.5)*.8,k,.1);}}
  c.fillStyle=T.head;c.beginPath();c.ellipse(0,hy0,6.2,7,0,0,Math.PI*2);c.fill();
  if(Math.sin(facing)>-.55){c.fillStyle=i?BLOOD:WHITE;c.beginPath();c.ellipse(Math.cos(facing)*2.6,hy0,1.4,.9,0,0,Math.PI*2);c.fill();}
 }
 human(a,i,t,simTime,ghost=false){const c=this.ctx,x=a.x,y=a.y,T=TEAM[i];c.save();c.translate(x,y);if(a.hp<=0)c.globalAlpha=.25;
  let walk=0,moving=0;if(!ghost){const m=this.motion[i],dx=x-(m.x??x),dy=y-(m.y??y),sp=Math.hypot(dx,dy);m.x=x;m.y=y;m.walk=(m.walk||0)+sp*.16;m.speed=(m.speed||0)*.8+Math.min(1,sp/3)*.2;walk=m.walk;moving=m.speed;
   if(a.dodge>simTime&&!this.reduced){c.save();c.rotate(Math.atan2(dy,dx));c.strokeStyle='#14101666';for(let k=0;k<8;k++){const oy=(hash(k+Math.floor(t*30))-.5)*50,l=40+hash(k*3)*70;c.lineWidth=k%2?.8:1.6;c.beginPath();c.moveTo(-20-l,oy);c.lineTo(-20,oy);c.stroke();}c.restore();}}
  c.fillStyle='#2c253133';c.beginPath();c.ellipse(2,3,22,7,0,0,Math.PI*2);c.fill();c.strokeStyle=i?BLOOD:INK;c.lineWidth=1;c.beginPath();c.ellipse(0,0,25,9,0,0,Math.PI*2);c.stroke();
  c.save();c.scale(1,.38);c.fillStyle=i?BLOOD:INK;this.tendril(Math.cos(a.facing)*24,Math.sin(a.facing)*24,a.facing,12,5,0,1);c.restore();
  if(a.ward>simTime){c.save();c.strokeStyle=INK;c.lineWidth=.9;for(let k=0;k<3;k++)this.ring(0,-30,40+k*4,k?WHITE:INK,.9,k?2:1);c.fillStyle='#ffffff30';c.beginPath();c.arc(0,-30,40,0,Math.PI*2);c.fill();c.restore();}
  if(a.guard>simTime){c.strokeStyle=INK;c.lineWidth=3;c.beginPath();c.ellipse(0,-8,32,16,0,a.facing-.8,a.facing+.8);c.stroke();}
  if(a.parry>simTime){c.save();c.strokeStyle=INK;c.lineWidth=6;c.beginPath();c.ellipse(0,-20,38,26,0,a.facing-1,a.facing+1);c.stroke();c.strokeStyle=WHITE;c.lineWidth=3;c.stroke();c.restore();}
  if(a.cast){const progress=a.cast.end?(simTime-a.cast.start)/(a.cast.end-a.cast.start):.2+Math.sin(t*3)*.08,spin=this.reduced?0:t;c.save();c.scale(1,.4);this.ring(0,0,48,INK,.4,1);this.ring(0,0,54,INK,.25,1);c.strokeStyle=VIOLET;c.lineWidth=5;c.beginPath();c.arc(0,0,48,-Math.PI/2,-Math.PI/2+clamp(progress,0,1)*2*Math.PI);c.stroke();c.fillStyle=INK;for(let k=0;k<12;k++){const ang=k/12*Math.PI*2+spin*.6;this.tendril(Math.cos(ang)*54,Math.sin(ang)*54,ang,k%3?6:12,2,.5,k);}c.restore();}
  if(a.swing&&!a.swing.done){const p=clamp((simTime-a.swing.start)/(a.swing.impact-a.swing.start),0,1),R=RULES.meleeRange*(.55+p*.45),s=a.swing.angle;c.save();c.globalAlpha*=.25+p*.55;c.fillStyle=i?BLOOD:INK;c.beginPath();c.arc(0,0,R,s-1.2,s+1.2);c.arc(Math.cos(s)*R*.25,Math.sin(s)*R*.25,R*.82,s+1.05,s-1.05,true);c.closePath();c.fill();c.restore();}
  const swing=a.swing?clamp((simTime-a.swing.start)/((a.swing.end||a.swing.impact)-a.swing.start),0,1):null,stunned=a.stun>simTime;if(stunned&&!this.reduced)c.translate(Math.sin(t*60)*1.5,0);
  c.save();c.scale(1.3,1.3);this.figure(i,a.facing,{t,walk,moving,swing});c.restore();
  if(stunned){c.strokeStyle=INK;c.lineWidth=1.2;this.swirl(0,-108,8,1.6,t*6,1);}
  if(!ghost){c.font=`italic 600 11px ${SERIF}`;c.textAlign='center';c.fillStyle=T.label;c.fillText(i?'hostile':'you',0,24);
   c.fillStyle='#fbf9fcaa';c.fillRect(-25,30,50,4);c.fillStyle=T.hp;c.fillRect(-25,30,50*clamp(a.hp/RULES.heroHp,0,1),4);c.strokeStyle=INK;c.lineWidth=.8;c.strokeRect(-25,30,50,4);}
  c.restore();}
 // Familiars: yours is a thorned eye with a filigree tail; the hostile one is a spiked ink wisp with a single eye.
 familiar(a,i,t){if(a.hp<=0)return;const c=this.ctx,bob=this.reduced?0:Math.sin(t*2+i)*4,x=a.x-42,y=a.y-102+bob;c.save();
  if(a.cast){const g=c.createRadialGradient(x,y,0,x,y,34);g.addColorStop(0,'#ffffffcc');g.addColorStop(1,'#ffffff00');c.fillStyle=g;c.beginPath();c.arc(x,y,34,0,Math.PI*2);c.fill();}
  if(i===0)this.thornEye(x,y,8.5,t,3,0,Math.cos(a.facing||0)*2);else this.wisp(x,y,1,t,a.facing||Math.PI);
  c.font=`italic 600 10px ${SERIF}`;c.textAlign='center';c.fillStyle=i?BLOOD:VIOLET;c.fillText(i?'familiar':(a.name||'').toLowerCase(),x,y-26);c.restore();}
 wisp(x,y,s,t,facing=Math.PI){const c=this.ctx,dir=Math.cos(facing)>=0?1:-1,back=dir>0?Math.PI:0,sway=this.reduced?0:Math.sin(t*3)*.15;c.save();c.translate(x,y);c.scale(s,s);c.fillStyle=INK;
  for(let k=0;k<9;k++){const a=back+(k-4)*.17+sway*(k%2?1:-1);this.tendril(0,0,a,20+hash(k)*20,6-Math.abs(k-4)*.6,(hash(k+3)-.5)*1.4,k,.12);}
  for(let k=0;k<5;k++){const a=back+(k-2)*.5+Math.PI*(k%2?.5:-.5)*.4;this.tendril(dir*2,0,a+Math.PI,8+hash(k+7)*8,2.5,(hash(k)-.5),k);}
  c.beginPath();c.ellipse(dir*3,0,11,8,0,0,Math.PI*2);c.fill();c.strokeStyle='#fbf9fc66';c.lineWidth=.8;this.swirl(-dir*2,1,6,1.5,0,dir);this.eye(dir*5,-1,5.5,2.3,dir*1.5);c.restore();}
 // ---------- effects ----------
 effect(e,t,engine){const c=this.ctx,age=t-e.at,fade=clamp(1-age/1.3,0,1),grow=Math.min(1,age/.18);c.save();c.globalAlpha=fade;
  if(e.type==='damage'){if(age<.6){c.save();c.globalAlpha=clamp(1-age/.6,0,1);this.splatter(e.x,e.y-34,30*(.6+grow*.6),e.seed,e.actor?BLOOD:INK);c.restore();}this.label('−'+e.value,e.x+(e.seed%1-.5)*30,e.y-80-age*36,24,e.actor?BLOOD:INK);}
  else if(e.type==='heal'){c.fillStyle=WHITE;for(let k=0;k<7;k++){const ox=(hash(e.seed+k)-.5)*40,oy=-30-age*60*(.6+hash(k)*.6);this.starburst(e.x+ox,e.y+oy,4,1.5,4,k);}this.label('+'+e.value,e.x,e.y-82-age*36,22,VIOLET);}
  else if(e.type==='perfect'){if(!this.reduced)this.inkLines(e.x,e.y-34,40,170,26,age);this.starburst(e.x,e.y-34,26+age*60,8,14,age);this.label('perfect',e.x,e.y-96,24,INK);}
  else if(e.type==='nova'){const r=Math.min(e.radius,age*420);this.ring(e.x,e.y,r,INK,.85,3);c.fillStyle=INK;for(let k=0;k<20;k++){const a=k/20*Math.PI*2;this.tendril(e.x+Math.cos(a)*r,e.y+Math.sin(a)*r,a,10+hash(k)*14,3,0,k);}this.starburst(e.x,e.y-20,30*(1-age),8,10,age);}
  else if(engine&&(e.type==='clash'||e.type==='clashEnd')){const a=engine.actors[0],b=engine.actors[1],x=(a.x+b.x)/2,y=(a.y+b.y)/2-34;if(!this.reduced)this.inkLines(x,y,60,330,44,age);this.starburst(x,y,40+age*100,12,16,age*.5);this.ring(x,y,20+age*260,INK,.8,2);this.label(e.type==='clash'?'resonance':e.winner===0?'claimed':e.winner===1?'lost':'parted',x,y-90,30,INK);}
  else if(e.type==='wardBreak'){for(let k=0;k<9;k++){const ang=k/9*Math.PI*2+e.seed,d=22+age*90;c.save();c.translate(e.x+Math.cos(ang)*d,e.y-34+Math.sin(ang)*d);c.rotate(ang+age*5);c.fillStyle=WHITE;c.strokeStyle=INK;c.lineWidth=1;c.beginPath();c.moveTo(0,-7);c.lineTo(4,5);c.lineTo(-4,5);c.closePath();c.fill();c.stroke();c.restore();}}
  else if(e.type==='death'){this.splatter(e.x,e.y-20,50+grow*40,e.seed,e.actor?BLOOD:INK);c.fillStyle=INK;for(let k=0;k<12;k++){const a=hash(k+e.seed)*Math.PI*2;this.tendril(e.x,e.y-20,a,age*(120+hash(k)*120),5,(hash(k+1)-.5)*1.4,k);}}
  else if(e.type==='proof'){this.starburst(e.x,e.y-40,30+age*80,10,18,age);this.eye(e.x,e.y-40,18,7,0,Math.min(1,age*3));this.label('the eye opens',e.x,e.y-110,20,VIOLET);}
  else if(e.type==='release'&&e.action){c.fillStyle=TINT[e.action]||INK;for(let k=0;k<6;k++){const a=k/6*Math.PI*2+e.seed;this.tendril(e.x,e.y-34,a,10+age*50,3,.5,k);}}
  c.restore();}
 inkLines(x,y,r1,r2,n,age){const c=this.ctx;c.save();c.globalAlpha*=clamp(1-age*1.3,0,1);c.fillStyle=INK;for(let k=0;k<n;k++){const ang=k/n*Math.PI*2+hash(k)*.2,w=.006+hash(k+9)*.012,a=r1+age*60,b=r2+hash(k+3)*90;c.beginPath();c.moveTo(x+Math.cos(ang-w)*b,y+Math.sin(ang-w)*b);c.lineTo(x+Math.cos(ang)*a,y+Math.sin(ang)*a);c.lineTo(x+Math.cos(ang+w)*b,y+Math.sin(ang+w)*b);c.fill();}c.restore();}
 // ---------- screen space ----------
 // Menu key art after the reference: the radiant summoner hovering under a thorned eye trailing filigree, an ink wisp beside it.
 keyArt(t){const c=this.ctx,w=this.w,h=this.h;if(w<1000)return;const s=Math.min(h/250,w/400),cx=w*.77,cy=h*.7+(this.reduced?0:Math.sin(t*.9)*4);
  c.save();const g=c.createRadialGradient(cx,cy-40*s,10,cx,cy-40*s,h*.6);g.addColorStop(0,'#ffffffd0');g.addColorStop(.55,'#efebf180');g.addColorStop(1,'#e2dce600');c.fillStyle=g;c.fillRect(0,0,w,h);
  c.strokeStyle='#ffffffcc';c.lineWidth=1.6;for(let n=0;n<16;n++)this.cloud(w*.55+hash(n+40)*w*.45,h*.12+hash(n+50)*h*.85,14+hash(n)*26,n*7+3);
  this.thornEye(w*.62,h*.2,h*.055,t,11,w*.3,this.reduced?0:Math.sin(t*.5)*h*.01);
  this.wisp(w*.9,h*.36,s*1.3,t,Math.PI);
  c.translate(cx,cy);c.scale(s,s);this.figure(0,Math.PI/2,{t,grand:true,noBlade:true});c.restore();}
 post(t){const c=this.ctx,w=this.w,h=this.h;
  if(this.flash>0&&!this.reduced){c.save();c.fillStyle=WHITE;c.globalAlpha=clamp(this.flash*5,0,.55);c.fillRect(0,0,w,h);c.restore();this.flash-=1/60;}
  if(this.reduced){this.tear=0;return;}
  // Ink tear: a few horizontal slices of the frame slip sideways on heavy impacts.
  if(this.tear>.03){const d=this.dpr||1,slices=2+Math.floor(this.tear*6);for(let n=0;n<slices;n++){const sy=hash(n*13+Math.floor(t*40))*h,sh=3+hash(n*7+Math.floor(t*30))*20*this.tear,dx=(hash(n+Math.floor(t*50))-.5)*44*this.tear;try{c.drawImage(this.canvas,0,sy*d,w*d,sh*d,dx,sy,w,sh);}catch{}}}
  this.tear*=.88;}
 minimap(engine,t){const c=this.ctx,w=190,h=130,x=this.w-w-28,y=this.h-(this.w<800?172:145)-h-34,sx=w/WORLD.width,sy=h/WORLD.height;c.save();
  c.fillStyle='#f1edf3e8';c.fillRect(x,y,w,h);c.strokeStyle=INK;c.lineWidth=1;c.strokeRect(x,y,w,h);c.strokeRect(x+3,y+3,w-6,h-6);
  c.fillStyle=INK;for(const wall of WALLS)c.fillRect(x+wall.x*sx,y+wall.y*sy,wall.w*sx,wall.h*sy);
  for(const site of SITES){const hot=engine.actors[0].proof?.siteId===site.id;c.fillStyle=hot?VIOLET:SITE_TINT[site.id];c.beginPath();c.arc(x+site.x*sx,y+site.y*sy,hot?4.5:3,0,Math.PI*2);c.fill();if(hot)this.ring(x+site.x*sx,y+site.y*sy,7,VIOLET,.8,1);}
  c.fillStyle=INK;c.beginPath();c.arc(x+RELAY.x*sx,y+RELAY.y*sy,3.5,0,Math.PI*2);c.fill();c.fillStyle=WHITE;c.fillRect(x+RELAY.x*sx-1.5,y+RELAY.y*sy-.6,3,1.2);
  engine.actors.forEach((a,i)=>{if(i&&(!lineClear(engine.actors[0],a)||distance(engine.actors[0],a)>850))return;const px=x+a.x*sx,py=y+a.y*sy;c.fillStyle=i?BLOOD:WHITE;c.strokeStyle=INK;c.lineWidth=1;c.beginPath();c.arc(px,py,3.5,0,Math.PI*2);c.fill();c.stroke();if(!i&&!this.reduced)this.ring(px,py,4+(t*8%8),INK,.4);});
  c.font=`italic 600 11px ${SERIF}`;c.fillStyle=INK;c.textAlign='left';c.fillText('the hollow · three candidate sites',x,y-8);c.restore();}
}
