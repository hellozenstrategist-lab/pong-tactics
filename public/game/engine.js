import {RULES,TIERS,SPELLS,HARD,LEGAL} from './rules.js';
import {WORLD,SITES,RELAY,distance,moveBody,lineClear,blocked} from './world.js';
import {ObjectivePuzzle,deduce} from './objective.js';
export {RULES,TIERS,SPELLS,HARD,LEGAL};
export function seeded(seed=1){let x=seed>>>0;return ()=>{x+=0x6D2B79F5;let t=x;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};}
const diff=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
function actor(name,x,y,tier){return {name,x,y,radius:RULES.radius,tier,facing:0,hp:RULES.heroHp,mana:100,stamina:100,cast:null,swing:null,generation:0,guard:0,ward:0,parry:0,parryStart:-10,parryReady:0,dodge:0,dodgeReady:0,attackReady:0,stun:0,invulnerable:0,counter:0,focus:false,feint:0,feintReady:0,defenseReady:0,swapReady:0,deadUntil:0,kills:0,deaths:0,provider:'offline',reserve:'offline',proof:null,capture:0};}
export class CombatEngine{
 constructor({seed=1,tier='swift',enemyTier='swift',enemyName='Iron Monk',bot='rushdown',difficulty='normal',mode='ctf'}={}){
  this.seed=seed;this.rng=seeded(seed);this.time=0;this.accumulator=0;this.status='running';this.mode=mode;this.bot=bot;this.difficulty=difficulty;this.actors=[actor('Nyx',285,800,tier),actor(enemyName,1710,760,enemyTier)];this.actors[1].facing=Math.PI;
  this.input=[{x:0,y:0,angle:0},{x:0,y:0,angle:Math.PI}];this.projectiles=[];this.zones=[];this.decoys=[];this.events=[];this.history=[];this.clash=null;this.nextId=0;this.matchId=`local-${seed}`;this.objective=new ObjectivePuzzle(this.rng,this.matchId);this.stats={parries:0,clashes:0,damage:0,casts:0,rolls:0};this.emit('start','Fight for space. Protect your Familiar. Capture the Core.');
 }
 emit(type,text,data={}){const e={type,text,time:this.time,...data};this.events.push(e);this.history.push(e);if(this.history.length>200)this.history.shift();}
 drain(){return this.events.splice(0);}
 setInput(i,input){this.input[i]={x:Number(input.x)||0,y:Number(input.y)||0,angle:Number.isFinite(input.angle)?input.angle:this.actors[i].facing};}
 alive(i){return this.actors[i].hp>0;}
 advance(seconds,botTick){if(!Number.isFinite(seconds)||seconds<0)return;this.accumulator+=Math.min(seconds,RULES.duration+1);while(this.accumulator>=RULES.tick&&this.status==='running'){this.accumulator-=RULES.tick;if(botTick)botTick(this);this.step(RULES.tick);}}
 step(dt){
  this.time+=dt;
  for(let i=0;i<2;i++){
   const a=this.actors[i];if(a.hp<=0){if(this.mode==='ctf'&&this.time>=a.deadUntil)this.respawn(i);continue;}
   a.mana=Math.min(100,a.mana+dt*6);a.stamina=Math.min(100,a.stamina+dt*16);a.facing=this.input[i].angle;
   if(a.stun>this.time||this.clash)continue;
   const m=this.input[i],length=Math.hypot(m.x,m.y),slow=this.zones.some(z=>z.from!==i&&z.until>this.time&&distance(z,a)<z.radius)?.48:1;
   if(length>0)moveBody(a,m.x/length*(i?RULES.enemySpeed:RULES.speed)*slow*dt,m.y/length*(i?RULES.enemySpeed:RULES.speed)*slow*dt);
  }
  if(this.clash&&this.time>=this.clash.end)this.resolveClash();
  if(!this.clash){this.checkMeleeClash();for(let i=0;i<2;i++){if(this.status!=='running')break;this.processSwing(i);}}
  this.processProjectiles(dt);
  for(let i=0;i<2;i++){const a=this.actors[i];if(!this.alive(i))continue;const c=a.cast;if(c&&c.kind!=='thinking'&&this.time>=c.end&&!this.clash){a.cast=null;this.completeCast(i,c);}}
  this.zones=this.zones.filter(z=>z.until>this.time);this.decoys=this.decoys.filter(d=>d.until>this.time);
  if(this.mode==='ctf')this.processCapture(dt);
  if(this.time>=RULES.duration){if(this.mode==='ctf'){this.finish('draw','time');}else this.finish(this.actors[0].hp===this.actors[1].hp?'draw':this.actors[0].hp>this.actors[1].hp?'win':'lose','time');}
 }
 interrupt(i,reason){const a=this.actors[i];a.generation++;if(a.cast){a.cast=null;this.emit('interrupt',`${a.name}: channel interrupted · ${reason}`,{actor:i});}}
 ready(i){const a=this.actors[i];return this.status==='running'&&this.alive(i)&&!this.clash&&this.time>=a.stun;}
 beginThinking(i=0){const a=this.actors[i];if(!this.ready(i)||a.cast)return null;const token=++a.generation;a.cast={kind:'thinking',start:this.time,token};this.emit('think',`${a.name} is thinking. Protect the channel.`,{actor:i});return token;}
 acceptThinking(i,token,action){const a=this.actors[i];if(this.status!=='running'||a.cast?.kind!=='thinking'||a.generation!==token)return false;a.cast=null;if(!LEGAL.includes(action)){this.emit('error','Jev rejected an illegal action.');return false;}return this.command(i,action,true);}
 failThinking(i,token,message){const a=this.actors[i];if(a.cast?.kind==='thinking'&&a.generation===token){a.cast=null;a.generation++;this.emit('error',message);}}
 command(i,raw,ai=false){
  const action=raw==='strike'?'attack':raw,a=this.actors[i];if(this.status!=='running')return false;
  if(['push','redirect','break'].includes(action)){if(!this.clash){if(i===0)this.emit('error','That tactic is only legal during a clash.');return false;}this.clash.choices[i]=action;if(i===0)this.emit('tactic',`Your ${action.toUpperCase()} tactic is sealed.`);return true;}
  if(action==='cancel'){this.interrupt(i,'command');return true;}if(!this.ready(i)){if(i===0)this.emit('error',a.hp<=0?'Your summoner is returning to the arena.':'Recovering from a stagger or clash.');return false;}
  if(action==='attack'||action==='counter'){
   if(a.swing||this.time<a.attackReady)return false;if(action==='counter'&&a.counter<=this.time){if(i===0)this.emit('error','Counter requires a perfect parry.');return false;}
   a.swing={id:++this.nextId,start:this.time,impact:this.time+RULES.attackWindup,end:this.time+RULES.attackWindup+RULES.attackActive,angle:a.facing,done:false,counter:action==='counter'};a.attackReady=this.time+RULES.attackRecovery;if(action==='counter')a.counter=0;this.emit('attack',`${a.name} · ${action}`,{actor:i});return true;
  }
  if(['defend','ward','parry','dodge','focus','feint'].includes(action)){
   const cooldown=action==='parry'?'parryReady':action==='dodge'?'dodgeReady':action==='feint'?'feintReady':'defenseReady';if(this.time<a[cooldown])return false;
   const cost=action==='ward'?14:action==='parry'?4:action==='focus'?10:action==='feint'?6:0;if(a.mana<cost){if(i===0)this.emit('error','Not enough mana.');return false;}
   if(action==='dodge'&&a.stamina<25){if(i===0)this.emit('error','Not enough stamina to dash.');return false;}a.mana-=cost;
   a[cooldown]=this.time+(action==='parry'?RULES.parryCooldown:action==='dodge'?RULES.dodgeCooldown:1);
   if(action==='defend')a.guard=this.time+RULES.guardDuration;
   if(action==='ward')a.ward=this.time+RULES.wardDuration;
   if(action==='parry'){a.parry=this.time+RULES.parryWindow;a.parryStart=this.time;}
   if(action==='focus')a.focus=true;
   if(action==='feint'){a.feint=this.time+.8;a.feintReady=this.time+4;}
   if(action==='dodge'){a.stamina-=25;a.dodge=this.time+RULES.dodgeTime;this.interrupt(i,'dash');const m=this.input[i],angle=Math.hypot(m.x,m.y)>.1?Math.atan2(m.y,m.x):a.facing;moveBody(a,Math.cos(angle)*RULES.dodgeDistance,Math.sin(angle)*RULES.dodgeDistance);}
   this.emit(action,`${a.name} · ${action.toUpperCase()}`,{actor:i});return true;
  }
  if(action==='scan')return this.startScan(i);
  if(action==='swap'){
   if(a.cast||this.time<a.swapReady){if(i===0)this.emit('error','Finish your channel; reserve cooldown may still be active.');return false;}
   a.cast={kind:'swap',start:this.time,end:this.time+RULES.swapTime,token:++a.generation};this.emit('swap',`${a.name}: reserve summoning · protect the 5s channel`,{actor:i});return true;
  }
  const spell=SPELLS[action];if(!spell)return false;if(a.cast){if(i===0)this.emit('error','Familiar busy. Protect it, or type cancel.');return false;}if(a.mana<spell.cost){if(i===0)this.emit('error',`Need ${spell.cost} mana for ${spell.name}.`);return false;}
  a.mana-=spell.cost;const tier=TIERS[a.tier];a.cast={kind:'spell',action,start:this.time,end:this.time+spell.charge+tier.charge,token:++a.generation,power:tier.power,focused:a.focus};a.focus=false;if(i===0)this.stats.casts++;this.emit('cast',`${a.name} invokes ${spell.name}`,{actor:i,action});return true;
 }
 startScan(i){const a=this.actors[i];if(this.mode!=='ctf'){if(i===0)this.emit('error','Relay tasks belong to Flag Hunt.');return false;}if(a.cast)return false;const stage=this.objective.stage(i);
  if(stage===4){if(i===0)this.emit('help','Signature verified. Move to the glowing flag site and hold it.');return false;}
  if(stage===0&&distance(a,RELAY)>RULES.scanRange){if(i===0)this.emit('help','Reach the Noetic Relay in the western lane to begin.');return false;}
  a.cast={kind:'scan',start:this.time,end:this.time+RULES.scanTime,token:++a.generation};this.emit('scan',`${a.name}: ${['inspect relay','correlate registry','assemble seal','verify flag proof'][stage]} · channeling`,{actor:i});return true;
 }
 completeCast(i,c){const a=this.actors[i];if(c.kind==='scan'){const stage=this.objective.stage(i);if(stage<3){const record=this.objective.inspect(i);this.emit('clue',`${i?'Enemy':'Your'} Familiar gathered ${record.kind} evidence.`,{actor:i,record});}
   else{const guess=deduce(this.objective.view(i).records),proof=this.objective.submit(i,guess||{});if(proof){a.proof=proof;const site=SITES.find(s=>s.id===proof.siteId);this.emit('proof',`${i?'Enemy':'Your'} Familiar identified ${site.name}. Physical binding required.`,{actor:i,siteId:site.id});}else this.emit('error','The evidence does not validate a flag proof.');}return;}
  if(c.kind==='swap'){a.provider='offline';a.tier='swift';a.swapReady=this.time+RULES.swapCooldown;this.emit('swapped',`${a.name}: offline reserve is now bound.`,{actor:i});return;}
  const s=SPELLS[c.action];if(s.heal){a.hp=Math.min(RULES.heroHp,a.hp+s.heal);this.emit('heal',`${a.name} restores ${s.heal} HP`,{actor:i,value:s.heal});return;}
  if(c.action==='decoy'){this.decoys.push({x:a.x+Math.cos(a.facing)*80,y:a.y+Math.sin(a.facing)*80,from:i,until:this.time+s.duration});this.emit('release','False echo manifested.',{actor:i,action:c.action});return;}
  if(c.action==='field'){const zone={x:a.x+Math.cos(a.facing)*180,y:a.y+Math.sin(a.facing)*180,radius:s.radius,from:i,until:this.time+s.duration};this.zones.push(zone);this.emit('release','Gravity snare deployed.',{actor:i,action:c.action});return;}
  if(s.aoe){const other=this.actors[1-i];if(distance(a,other)<=s.aoe&&lineClear(a,other))this.hit(1-i,Math.round(s.damage*c.power),i,c.action);this.emit('nova','Eclipse shockwave.',{actor:i,radius:s.aoe});return;}
  this.projectiles.push({id:++this.nextId,x:a.x+Math.cos(a.facing)*28,y:a.y+Math.sin(a.facing)*28,vx:Math.cos(a.facing)*s.speed,vy:Math.sin(a.facing)*s.speed,radius:s.radius,damage:Math.round(s.damage*c.power),action:c.action,from:i,expires:this.time+2.5});this.emit('release',s.name+' released.',{actor:i,action:c.action});
 }
 checkMeleeClash(){const [a,b]=this.actors,s=a.swing,t=b.swing;if(!s||!t||s.done||t.done||!this.alive(0)||!this.alive(1))return;if(this.time<s.impact||this.time<t.impact||Math.abs(s.impact-t.impact)>RULES.clashWindow)return;
  if(distance(a,b)>RULES.clashRange||!lineClear(a,b))return;const angle=Math.atan2(b.y-a.y,b.x-a.x);if(Math.abs(diff(s.angle,angle))>1.25||Math.abs(diff(t.angle,angle+Math.PI))>1.25)return;s.done=t.done=true;this.startClash('melee');
 }
 processSwing(i){const a=this.actors[i],s=a.swing;if(!s)return;if(this.time>s.end){a.swing=null;return;}if(this.time<s.impact||s.done||!this.alive(i)||this.clash)return;s.done=true;const b=this.actors[1-i],angle=Math.atan2(b.y-a.y,b.x-a.x);if(this.alive(1-i)&&distance(a,b)<=RULES.meleeRange&&Math.abs(diff(s.angle,angle))<=1.2&&lineClear(a,b))this.hit(1-i,s.counter?28:RULES.meleeDamage,i,s.counter?'counter':'melee');}
 processProjectiles(dt){for(const p of [...this.projectiles]){if(!this.projectiles.includes(p))continue;const steps=Math.ceil(Math.hypot(p.vx*dt,p.vy*dt)/8);let removed=false;
   for(let n=0;n<steps;n++){p.x+=p.vx*dt/steps;p.y+=p.vy*dt/steps;if(blocked(p.x,p.y,p.radius)||this.time>=p.expires){removed=true;break;}const other=this.projectiles.find(q=>q.from!==p.from&&distance(p,q)<p.radius+q.radius);if(other&&!this.clash){this.projectiles=this.projectiles.filter(q=>q!==other&&q!==p);this.startClash('spell');removed=true;break;}
    const target=this.actors[1-p.from];if(this.alive(1-p.from)&&distance(p,target)<target.radius+p.radius){this.hit(1-p.from,p.damage,p.from,p.action);removed=true;break;}}
   if(removed)this.projectiles=this.projectiles.filter(q=>q!==p);}}
 hit(i,amount,from,action){const a=this.actors[i];if(!this.alive(i)||this.time<a.invulnerable)return false;if(a.dodge>this.time){this.emit('evade',`${a.name} evaded the strike.`,{actor:i});return false;}
  if(a.parry>this.time){const perfect=this.time-a.parryStart<=RULES.perfectWindow;this.emit(perfect?'perfect':'block',`${a.name} · ${perfect?'PERFECT PARRY':'PARRIED'}`,{actor:i});if(perfect){const b=this.actors[from];this.interrupt(from,'perfect parry');b.swing=null;b.stun=this.time+RULES.stagger;a.counter=this.time+1.2;if(i===0)this.stats.parries++;}return false;}
  if(a.ward>this.time){a.ward=0;this.emit('wardBreak',`${a.name}: ward absorbed the strike.`,{actor:i});return false;}
  if(a.cast||a.guard>this.time){const roll=1+Math.floor(this.rng()*6),threshold=a.guard>this.time?RULES.guardThreshold:a.cast?.focused?3:RULES.channelThreshold,pass=roll>=threshold;if(i===0)this.stats.rolls++;this.emit('roll',`${a.name}: d6 ${roll} · ${pass?'CHANNEL HELD':'DEFENSE FAILED'}`,{actor:i,roll,threshold,pass});if(pass)return false;this.interrupt(i,'failed d6');}
  a.hp=Math.max(0,a.hp-amount);a.invulnerable=this.time+RULES.hitProtection;a.capture=Math.max(0,a.capture-1);if(i===1)this.stats.damage+=amount;this.emit('damage',`${a.name} takes ${amount} damage.`,{actor:i,value:amount,action});
  if(action==='siphon')this.actors[from].hp=Math.min(RULES.heroHp,this.actors[from].hp+Math.round(amount*.5));
  if(a.hp===0){a.deaths++;this.actors[from].kills++;this.interrupt(i,'summoner fell');a.swing=null;a.deadUntil=this.time+RULES.respawnTime;this.emit('death',`${a.name} falls. ${this.mode==='ctf'?'Returning in 4s.':'Contract ended.'}`,{actor:i});if(this.mode!=='ctf')this.finish(i===1?'win':'lose','combat');}return true;
 }
 startClash(type){if(this.clash)return;for(let i=0;i<2;i++){this.interrupt(i,'resonance');this.actors[i].swing=null;}const options=['push','redirect','break'];this.clash={type,start:this.time,end:this.time+RULES.clashDuration,choices:[null,options[Math.floor(this.rng()*3)]]};this.stats.clashes++;this.emit('clash','RESONANCE · Seal PUSH, REDIRECT, or BREAK.',{clashType:type});}
 resolveClash(){const c=this.clash;if(!c)return;this.clash=null;const [p,q]=c.choices,beats={push:'break',break:'redirect',redirect:'push'},winner=!p?1:p===q?null:beats[p]===q?0:1;
  this.emit('clashEnd',winner===null?`CLASH TIED · ${p} / ${q}`:winner===0?`RESONANCE CLAIMED · ${p} > ${q}`:`RESONANCE LOST · ${q} > ${p||'silence'}`,{winner,choices:c.choices});
  const [a,b]=this.actors,angle=Math.atan2(b.y-a.y,b.x-a.x);moveBody(a,-Math.cos(angle)*65,-Math.sin(angle)*65);moveBody(b,Math.cos(angle)*65,Math.sin(angle)*65);if(winner!==null){const loser=1-winner;this.hit(loser,RULES.clashDamage,winner,'clash');this.actors[loser].stun=this.time+RULES.stagger;}
 }
 processCapture(dt){for(let i=0;i<2;i++){const a=this.actors[i];if(!a.proof||!this.objective.valid(i,a.proof)||!this.alive(i))continue;const site=SITES.find(s=>s.id===a.proof.siteId),b=this.actors[1-i],inside=distance(a,site)<95,contested=this.alive(1-i)&&distance(b,site)<140;
   if(inside&&!contested&&!a.cast&&!this.clash){a.capture=Math.min(RULES.captureTime,a.capture+dt);if(a.capture>=RULES.captureTime){this.finish(i===0?'win':'lose','flag');return;}}else if(!inside)a.capture=Math.max(0,a.capture-dt*.6);
  }}
 respawn(i){const a=this.actors[i];a.x=i?1710:285;a.y=i?760:800;a.hp=RULES.heroHp;a.mana=100;a.stamina=100;a.ward=0;a.guard=0;a.parry=0;a.dodge=0;a.stun=0;a.cast=null;a.swing=null;a.invulnerable=this.time+1;a.capture=0;this.emit('respawn',`${a.name} returns.`,{actor:i});}
 finish(result,reason){if(this.status!=='running')return;this.status=result;this.resultReason=reason;this.clash=null;for(let i=0;i<2;i++)this.interrupt(i,'contract ended');this.emit('finish',result==='win'?(reason==='flag'?'THE FLAG IS YOURS':'CONTRACT FULFILLED'):result==='draw'?(this.mode==='ctf'?'NO CORE CLAIMED':'CONTRACT UNBROKEN'):'CONTRACT BROKEN',{result,reason});}
 snapshot(){return {time:Math.round(this.time*100)/100,actors:this.actors.map(a=>({hp:Math.round(a.hp),mana:Math.round(a.mana),casting:a.cast?.action??a.cast?.kind??null,x:Math.round(a.x),y:Math.round(a.y)})),status:this.status};}
}
