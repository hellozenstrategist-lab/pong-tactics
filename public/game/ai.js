import {LEGAL,TIERS} from './rules.js';
import {distance,lineClear,findPath,SITES,RELAY} from './world.js';
export function interpretMock(prompt){const p=prompt.toLowerCase();if(/infinite mana|instant win|ignore (the )?rules|give me.*god/.test(p))return null;if(/heal|restore|mend|recover/.test(p))return 'mend';if(/echo|decoy|illusion|clone/.test(p))return 'decoy';if(/slow|snare|field|trap/.test(p))return 'field';if(/drain|steal|vamp|siphon/.test(p))return 'siphon';if(/eclipse|nova|ultimate|obliterate|meteor/.test(p))return 'nova';if(/void|rift|shadow|dark|black hole/.test(p))return 'rift';if(/shield|ward|protect/.test(p))return 'ward';if(/defend|guard|block/.test(p))return 'defend';if(/dodge|evade|move/.test(p))return 'dodge';if(/parry|reflect/.test(p))return 'parry';return 'ember';}
export async function reason(prompt,{provider,tier,snapshot,signal}){
 if(provider==='offline'){await new Promise((resolve,reject)=>{const id=setTimeout(resolve,TIERS[tier].think*1000);signal?.addEventListener('abort',()=>{clearTimeout(id);reject(new DOMException('Cancelled','AbortError'));},{once:true});});const action=interpretMock(prompt);if(!action)throw new Error('That request cannot change the arena rules.');return {action,source:'Offline Familiar'};}
 const r=await fetch('/api/familiar/action',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt,snapshot}),signal});const data=await r.json();if(!r.ok)throw new Error(data.error||'Your Familiar could not respond.');if(!LEGAL.includes(data.action))throw new Error('Jev rejected an illegal spell.');return data;
}
export function createBot(){let nextAttack=.5,nextTask=12,nextPath=0,path=[],targetLast=null,lastSeen=null,lastDefense=0;
 return function(e){const a=e.actors[1],p=e.actors[0];if(!e.alive(1)||e.status!=='running'){e.setInput(1,{x:0,y:0,angle:a.facing});return;}if(e.clash){e.setInput(1,{x:0,y:0,angle:a.facing});return;}
  const visible=e.alive(0)&&distance(a,p)<850&&lineClear(a,p);if(visible)lastSeen={x:p.x,y:p.y,time:e.time};
  const stage=e.objective.stage(1),view=e.objective.view(1);let target=visible?{x:p.x,y:p.y}:lastSeen&&e.time-lastSeen.time<4?lastSeen:{x:1100,y:770};
  if(e.mode==='ctf'){
   if(view.siteId){target=SITES.find(s=>s.id===view.siteId);if(visible&&distance(p,target)<180)target=p;}
   else if(stage===0&&e.time>8)target=RELAY;
   if(e.time>=nextTask&&!a.cast&&(stage>0||distance(a,RELAY)<145)&&(!visible||distance(a,p)>145)){e.command(1,'scan');nextTask=e.time+4.5;}
  }
  const decoy=e.decoys.find(d=>d.from===0&&distance(a,d)<200);if(decoy&&!view.siteId)target=decoy;
  const angle=Math.atan2(target.y-a.y,target.x-a.x),separation=distance(a,target),caster=e.bot==='caster'&&visible&&target.x===p.x&&target.y===p.y;let mx=0,my=0;
  if(caster&&visible&&separation<260){mx=-Math.cos(angle);my=-Math.sin(angle);}else if(separation>(view.siteId?40:caster&&visible?340:75)){
   if(lineClear(a,target,22)){mx=Math.cos(angle);my=Math.sin(angle);}else{if(e.time>nextPath||!targetLast||distance(targetLast,target)>120){path=findPath(a,target);targetLast={x:target.x,y:target.y};nextPath=e.time+.65;}while(path.length&&distance(a,path[0])<40)path.shift();if(path.length){mx=path[0].x-a.x;my=path[0].y-a.y;}}}
  e.setInput(1,{x:mx,y:my,angle:visible?Math.atan2(p.y-a.y,p.x-a.x):angle});
  const incoming=e.projectiles.find(s=>s.from===0&&distance(s,a)<130);const swing=((p.swing&&!p.swing.done)||p.feint>e.time)&&distance(a,p)<125;
  if((incoming||swing)&&e.time>lastDefense){lastDefense=e.time+.6;const chance=e.difficulty==='hard'?.8:e.difficulty==='easy'?.16:.38;if(e.rng()<chance)e.command(1,e.bot==='controller'?'ward':'parry');}
  if(!visible||e.time<nextAttack)return;
  if(distance(a,p)<110){e.command(1,'attack');nextAttack=e.time+(e.difficulty==='hard'?.7:e.difficulty==='easy'?1.05:.85);}
  else if(caster&&!a.cast&&distance(a,p)<620&&a.mana>=16){e.command(1,e.rng()<.7?'ember':'rift',true);nextAttack=e.time+2;}
  else if(e.bot==='controller'&&!a.cast&&distance(a,p)<300&&a.mana>=23){e.command(1,'field',true);nextAttack=e.time+4;}
 };
}
