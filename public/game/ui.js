import {CombatEngine,HARD,TIERS,SPELLS,RULES} from './engine.js';
import {reason,createBot} from './ai.js';
import {ArenaRenderer} from './renderer.js';
import {ArenaInput} from './input.js';
import {RELAY,SITES,distance,lineClear} from './world.js';
const $=id=>document.getElementById(id),show=(id,yes)=>$(id).classList.toggle('hidden',!yes),label=(id,t)=>$(id).textContent=t;
const BOTS=[{id:'rushdown',name:'Iron Monk',style:'Rushdown',desc:'Closes distance fast and punishes exposed channels. Swift Familiar.',tier:'swift'},{id:'caster',name:'Vesper',style:'Caster',desc:'Keeps range and fires ember lances. Balanced Familiar.',tier:'oracle'},{id:'controller',name:'Rook',style:'Controller',desc:'Snares corridors and wards against pressure. Balanced Familiar.',tier:'oracle'}];
const DIFFICULTY={easy:'Easy',normal:'Normal',hard:'Hard'},MODES={ctf:'Flag Hunt',duel:'Arena Duel'},SPELL_KEYS={'conjure an ember lance':'ember','tear open a void rift':'rift','heal me':'mend'};
const clock=s=>{s=Math.max(0,Math.ceil(s));return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');};
let settings={provider:'offline',tier:'swift',bot:'rushdown',difficulty:'normal',name:'Nyx',mode:'ctf'},engine=null,botTick=null,playing=false,request=null,lastTick=performance.now(),finishShown=false,sound=false,audio=null,announcementUntil=0,dieUntil=0,lastRoll=null,latency=null;
try{const saved=JSON.parse(localStorage.getItem('jaoya-preferences-v2')||'{}');for(const k of ['tier','bot','difficulty','name','mode'])if(saved[k])settings[k]=saved[k];}catch{}
if(!TIERS[settings.tier])settings.tier='swift';if(!BOTS.find(b=>b.id===settings.bot))settings.bot='rushdown';if(!['easy','normal','hard'].includes(settings.difficulty))settings.difficulty='normal';if(!['ctf','duel'].includes(settings.mode))settings.mode='ctf';settings.name=String(settings.name).slice(0,18);
const renderer=new ArenaRenderer($('world')),controls=new ArenaInput();
function save(){try{const {provider,...preferences}=settings;localStorage.setItem('jaoya-preferences-v2',JSON.stringify(preferences));}catch{}}
function announce(message,kind=''){label('announcement',message);$('announcement').dataset.kind=kind;$('announcement').classList.add('visible');announcementUntil=performance.now()+1600;}
function tone(type){if(!sound)return;try{audio??=new AudioContext();audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.type=type==='damage'?'sawtooth':'sine';const f=type==='perfect'?880:type==='clash'?220:type==='damage'?90:380;o.frequency.setValueAtTime(f,audio.currentTime);o.frequency.exponentialRampToValueAtTime(Math.max(35,f*.5),audio.currentTime+.2);g.gain.setValueAtTime(.035,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.25);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+.26);}catch{}}
function selections(){const b=BOTS.find(x=>x.id===settings.bot),t=TIERS[settings.tier];label('selectedBotName',b.name);label('selectedBotDescription',b.style+' · '+DIFFICULTY[settings.difficulty]);label('selectedTierName',settings.name);label('selectedTierDescription',t.name+' · '+t.charge+' s casts');$('difficulty').value=settings.difficulty;$('familiarName').value=settings.name;
 $('tierCards').replaceChildren();for(const [id,tier]of Object.entries(TIERS)){const el=document.createElement('button');el.type='button';el.className='choice tiercard'+(id===settings.tier?' active':'');el.innerHTML=`<strong>${tier.name}</strong><span>${tier.charge} s casts<br>${Math.round(tier.power*100)}% power</span>`;el.onclick=()=>{settings.tier=id;save();selections();};$('tierCards').append(el);}
 $('botCards').replaceChildren();for(const b of BOTS){const el=document.createElement('button');el.type='button';el.className='choice botcard'+(settings.bot===b.id?' active':'');el.innerHTML=`<span class="choice-head"><strong>${b.name}</strong><span class="tag">${b.style}</span></span><span>${b.desc}</span>`;el.onclick=()=>{settings.bot=b.id;save();selections();};$('botCards').append(el);}
 label('connectionBadge',settings.provider==='offline'?'Offline Familiar':'OpenAI Familiar');$('connectionBadge').classList.toggle('connectionActive',settings.provider!=='offline');$('ctfMode').classList.toggle('active',settings.mode==='ctf');$('duelMode').classList.toggle('active',settings.mode==='duel');
}
function openDialog(id){controls.clear();$(id).showModal();}
for(const b of document.querySelectorAll('[data-close]'))b.onclick=()=>$(b.dataset.close).close();
$('setupButton').onclick=()=>{openDialog('setupDialog');checkConnection();};$('chooseTier').onclick=()=>{setupTab('offline');openDialog('setupDialog');};$('chooseBot').onclick=()=>openDialog('botDialog');$('helpButton').onclick=()=>openDialog('helpDialog');$('soundButton').onclick=()=>{sound=!sound;$('soundButton').classList.toggle('on',sound);$('soundButton').setAttribute('aria-pressed',String(sound));label('soundLabel',sound?'Sound on':'Sound off');tone('perfect');};
function setupTab(tab){for(const t of ['offline','api','account']){$(t+'Tab').classList.toggle('active',tab===t);show(t+'Panel',t===tab);}label('setupStatus','');}
for(const t of ['offline','api','account'])$(t+'Tab').onclick=()=>setupTab(t);
function bindOffline(){settings.provider='offline';settings.name=$('familiarName').value.trim().slice(0,18)||'Nyx';save();selections();$('setupDialog').close();}
$('useOffline').onclick=bindOffline;$('accountOffline').onclick=bindOffline;
$('confirmBot').onclick=()=>{settings.difficulty=$('difficulty').value;save();selections();$('botDialog').close();};
for(const m of ['ctf','duel'])$(m+'Mode').onclick=()=>{settings.mode=m;save();selections();};
async function checkConnection(){try{const r=await fetch('/api/familiar/connection');const d=await r.json();show('useSavedButton',!!d.connected);if(d.connected){$('modelInput').value=d.model;label('setupStatus','Saved connection: '+d.model+'. Select “Use saved API connection” for Arena Duel.');}else if(!d.available)label('setupStatus',d.message||'Server connection unavailable. Offline play is ready.');}catch{label('setupStatus','Offline play is ready. API connections require the hosted server.');}}
function useApi(){settings.provider='openai';settings.mode='duel';save();selections();label('setupStatus','API spell Familiar selected for Arena Duel. Close setup to play.');}
$('useSavedButton').onclick=useApi;
$('connectForm').onsubmit=async e=>{e.preventDefault();const key=$('apiKey').value,model=$('modelInput').value.trim();$('connectButton').disabled=true;label('setupStatus','Checking your key and model…');try{const r=await fetch('/api/familiar/connection',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key,model})});const d=await r.json();if(!r.ok)throw new Error(d.error||'Connection failed.');useApi();show('useSavedButton',true);}catch(err){label('setupStatus',err.message);}finally{$('apiKey').value='';$('connectButton').disabled=false;}};
$('disconnectButton').onclick=async()=>{try{const r=await fetch('/api/familiar/connection',{method:'DELETE',headers:{'Content-Type':'application/json'},body:'{}'});const d=await r.json();if(!r.ok)throw new Error(d.error||'Could not disconnect.');settings.provider='offline';show('useSavedButton',false);selections();label('setupStatus','Saved key deleted. Offline Familiar ready.');if(engine?.actors[0].provider==='openai'){engine.interrupt(0,'connection deleted');engine.actors[0].provider='offline';}}catch(e){label('setupStatus',e.message);}};
function start(){if(settings.mode==='ctf'&&settings.provider!=='offline'){setupTab('offline');openDialog('setupDialog');label('setupStatus','Flag Hunt uses the offline training decoder. Bind offline, or select Arena Duel for API spells.');return;}
 request?.controller.abort();request=null;controls.clear();dieUntil=0;lastRoll=null;latency=null;const b=BOTS.find(x=>x.id===settings.bot);engine=new CombatEngine({seed:Math.floor(Math.random()*1e9),tier:settings.tier,enemyTier:b.tier,enemyName:b.name,bot:b.id,difficulty:settings.difficulty,mode:settings.mode});engine.actors[0].name=settings.name;engine.actors[0].provider=settings.provider;botTick=createBot();playing=true;finishShown=false;lastTick=performance.now();$('combatLog').replaceChildren();label('enemyName',b.name);label('playerName','You');label('familiarTitle',settings.name);label('roundlabel',MODES[settings.mode]);show('menu',false);show('match',true);show('console',true);show('noeticPanel',false);show('objectivebar',settings.mode==='ctf');for(const d of document.querySelectorAll('dialog'))if(d.open)d.close();$('commandInput').value='';$('world').focus();consume();}
function menu(){request?.controller.abort();request=null;engine=null;playing=false;renderer.effects=[];controls.clear();for(const d of document.querySelectorAll('dialog'))if(d.open)d.close();show('menu',true);show('match',false);show('console',false);for(const id of ['dice','clash','respawn','noeticPanel','objectivebar'])show(id,false);}
$('startButton').onclick=start;$('forfeitButton').onclick=menu;$('homeLink').onclick=e=>{e.preventDefault();menu();};$('returnButton').onclick=menu;$('rematchButton').onclick=start;
function toggleClues(){if(engine?.mode!=='ctf')return;$('noeticPanel').classList.toggle('hidden');}
$('objectiveButton').onclick=toggleClues;$('closeNoetic').onclick=()=>show('noeticPanel',false);$('scanButton').onclick=()=>submit('scan');
async function submit(raw){if(!engine||engine.status!=='running')return;const input=raw.trim().slice(0,500),normal=input.toLowerCase();if(!input)return;engine.emit('input','› '+input);
 if(HARD.includes(normal)){engine.command(0,normal);consume();return;}
 if(engine.clash){engine.emit('help','Seal push, redirect, or break.');consume();return;}
 const token=engine.beginThinking();if(token===null){engine.emit('error','Your Familiar is busy or staggered. Cancel the channel to change spells.');consume();return;}
 const match=engine,controller=new AbortController();request={controller,token};const begin=performance.now();consume();
 try{const result=await reason(input,{provider:match.actors[0].provider,tier:match.actors[0].tier,snapshot:match.snapshot(),signal:controller.signal});if(match!==engine)return;if(match.acceptThinking(0,token,result.action)){latency=Math.round(performance.now()-begin);match.emit('interpret',match.actors[0].name+' understood: '+(SPELLS[result.action]?.name||result.action)+' · '+latency+' ms');}}
 catch(e){if(e.name!=='AbortError'&&match===engine)match.failThinking(0,token,'Familiar: '+e.message);}
 finally{if(request?.token===token&&match===engine)request=null;if(match===engine)consume();}
}
$('commandForm').onsubmit=e=>{e.preventDefault();const s=$('commandInput').value;$('commandInput').value='';submit(s);};
for(const b of document.querySelectorAll('[data-command]')){b.addEventListener('mousedown',e=>e.preventDefault());b.onclick=()=>submit(b.dataset.command);}
for(const b of document.querySelectorAll('[data-tactic]'))b.addEventListener('mousedown',e=>e.preventDefault());
for(const b of document.querySelectorAll('[data-tactic]'))b.onclick=()=>submit(b.dataset.tactic);
function typing(){return document.activeElement===$('commandInput');}
$('commandInput').addEventListener('focus',()=>controls.typing());
const quick={q:'parry',e:'ward',f:'defend',r:'counter',x:'cancel'},tactics=['push','redirect','break'];
document.addEventListener('keydown',e=>{const key=e.key.toLowerCase();if(!playing||document.querySelector('dialog[open]'))return;
 if(key==='escape'){e.preventDefault();controls.clear();$('world').focus();return;}
 if(key==='tab'){e.preventDefault();toggleClues();return;}
 if(e.altKey&&quick[key]){e.preventDefault();if(!e.repeat)submit(quick[key]);return;}
 if(key==='enter'&&!typing()){e.preventDefault();controls.typing();$('commandInput').focus();return;}
 if(engine.clash&&['1','2','3'].includes(key)){e.preventDefault();if(!e.repeat)submit(tactics[Number(key)-1]);return;}
 if(['arrowup','arrowdown','arrowleft','arrowright'].includes(key)||(!typing()&&['w','a','s','d'].includes(key))){e.preventDefault();controls.keys.add(key);return;}
 if(typing())return;if(key==='?'||key==='h'){openDialog('helpDialog');return;}if(e.repeat)return;
 if(quick[key]){e.preventDefault();submit(quick[key]);}else if(e.code==='Space'||key==='shift'){e.preventDefault();submit('dodge');}else if(['1','2','3'].includes(key)){e.preventDefault();submit(['conjure an ember lance','tear open a void rift','heal me'][Number(key)-1]);}
});
document.addEventListener('keyup',e=>controls.keys.delete(e.key.toLowerCase()));window.addEventListener('blur',()=>controls.clear());
$('world').addEventListener('mousemove',e=>{controls.pointer={x:e.clientX,y:e.clientY};});
$('world').addEventListener('mousedown',e=>{if(!playing||document.querySelector('dialog[open]'))return;e.preventDefault();controls.pointer={x:e.clientX,y:e.clientY};engine.setInput(0,controls.sample(engine.actors[0],renderer,typing()));engine.actors[0].facing=engine.input[0].angle;if(e.button===0)submit('attack');if(e.button===2)controls.right=true;});
window.addEventListener('mouseup',e=>{if(e.button===2)controls.right=false;});$('world').addEventListener('contextmenu',e=>e.preventDefault());
const VERBS={attack:'attacks',strike:'strikes',counter:'counters',parry:'parries',ward:'wards',dodge:'dashes',defend:'guards',focus:'focuses',feint:'feints'};
function logText(e,match){const who=e.actor!=null?match.actors[e.actor].name:'';
 switch(e.type){case 'start':return match.mode==='ctf'?'Match started. Reach the Noetic Relay.':'Match started. Defeat your opponent.';case 'clash':return 'Clash! Choose push, redirect or break.';
  case 'clashEnd':{const [p,q]=e.choices||[];return e.winner===null?`Clash tied (${p} vs ${q})`:e.winner===0?`Clash won: ${p} beats ${q}`:`Clash lost: ${q} beats ${p||'no pick'}`;}
  case 'roll':return `${who} rolled ${e.roll} on d6: ${e.pass?'channel held':'channel broken'}`;case 'perfect':return `${who} lands a perfect parry`;case 'block':return `${who} parries the strike`;
  case 'tactic':{const m=/Your (\w+) tactic/.exec(e.text);return m?'You chose '+m[1].toLowerCase():e.text;}case 'interrupt':{const m=/channel interrupted · (.*)$/.exec(e.text);return `${who}'s channel was interrupted`+(m?` (${m[1]})`:'');}
  case 'attack':{const m=/· (\w+)$/.exec(e.text);return `${who} ${VERBS[m?.[1]]||'attacks'}`;}case 'proof':return `Flag site found: ${SITES.find(s=>s.id===e.siteId)?.name}. Hold it for 4 s.`;
  case 'scan':{const m=/: (.*) · channeling$/.exec(e.text);return `${who} is scanning`+(m?`: ${m[1]}`:'');}case 'swap':return `${who} is summoning the reserve (5 s channel)`;case 'swapped':return `${who}'s offline reserve is bound`;case 'finish':return e.result==='win'?'Victory':e.result==='lose'?'Defeat':'Draw';}
 return VERBS[e.type]&&who?`${who} ${VERBS[e.type]}`:e.text;}
function clueLine(text,cls=''){const p=document.createElement('p');p.textContent=text;if(cls)p.className=cls;return p;}
function refreshClues(){const view=engine.objective.view(0);label('clueSteps',view.stage+' of 4 scans');$('clueFeed').replaceChildren();
 for(const r of view.records){const card=document.createElement('div'),title=document.createElement('strong');card.className='clue';title.textContent={relay:'Relay reading',registry:'Registry',seal:'Seal shards'}[r.kind]||r.kind;card.append(title,clueLine(r.text));
  if(r.kind==='relay')card.append(clueLine('Cycle '+r.epoch+' · signature '+r.glyph,'clue-data'));
  if(r.kind==='registry')for(const e of r.entries)card.append(clueLine(SITES.find(s=>s.id===e.siteId).name+' · cycle '+e.epoch+' · '+e.glyph+' · check '+e.check,'clue-data'));
  if(r.kind==='seal')card.append(clueLine('Left '+r.left+' · right '+r.right,'clue-data'));
  $('clueFeed').append(card);}
 if(view.siteId)$('clueFeed').append(clueLine('Verified: '+SITES.find(s=>s.id===view.siteId).name+'. Go there and hold it for 4 seconds.','clue-verified'));}
function consume(){if(!engine)return;const match=engine;for(const e of match.drain()){if(e.actor===1&&(['clue','proof'].includes(e.type)||distance(match.actors[0],match.actors[1])>850||!lineClear(match.actors[0],match.actors[1])))continue;renderer.event(e,match);const row=document.createElement('div');row.className='logentry log-'+e.type;const time=document.createElement('time');time.textContent=String(Math.floor(e.time/60)).padStart(2,'0')+':'+String(Math.floor(e.time%60)).padStart(2,'0');row.append(time,document.createTextNode(logText(e,match)));$('combatLog').append(row);while($('combatLog').childElementCount>70)$('combatLog').firstChild.remove();$('combatLog').classList.toggle('full',$('combatLog').childElementCount>6);$('combatLog').scrollTop=$('combatLog').scrollHeight;
 if(['damage','release','perfect','clash','clashEnd'].includes(e.type))tone(e.type);if(e.type==='perfect')announce(e.actor===0?'Perfect parry · R to counter':'Enemy perfect parry',e.actor===0?'good':'bad');else if(e.type==='clashEnd')announce(e.winner===0?'Clash won':e.winner===1?'Clash lost':'Clash tied',e.winner===0?'good':e.winner===1?'bad':'');else if(e.type==='swapped')announce('Reserve Familiar bound');else if(e.type==='proof')announce('Flag site found: '+SITES.find(s=>s.id===e.siteId).name,'good');else if(e.type==='interrupt'&&e.actor===0)announce('Channel interrupted','bad');
 if(e.type==='roll'&&e.actor===0){lastRoll=e;dieUntil=performance.now()+1300;}
 if((e.type==='clue'||e.type==='proof')&&e.actor===0)refreshClues();
 if(e.type==='finish'&&!finishShown){finishShown=true;request?.controller.abort();controls.clear();setTimeout(()=>{if(engine!==match||!playing)return;const won=e.result==='win';label('resultMeta',MODES[match.mode]+' · '+clock(match.time));label('resultTitle',won?'Victory':e.result==='lose'?'Defeat':'Draw');
   label('resultDescription',e.reason==='flag'?(won?'You held the verified flag site.':'Your opponent held the flag site.'):e.reason==='combat'?(won?'Your opponent fell.':'You fell.'):match.mode==='ctf'?'Time ran out before anyone held the flag.':e.result==='draw'?'Time ran out with both summoners even.':'Time ran out. Remaining health decided it.');
   $('resultStats').innerHTML=`<div><strong>${match.actors[0].kills}</strong><span>Kills</span></div><div><strong>${match.stats.parries}</strong><span>Perfect parries</span></div><div><strong>${match.stats.clashes}</strong><span>Clashes</span></div>`;openDialog('resultDialog');},600);}}
 if(request&&match.actors[0].generation!==request.token){request.controller.abort();request=null;}
}
// Cooldown fraction and availability for each [data-command] button.
function slotState(cmd,a){const t=engine.time,cd=(ready,dur)=>Math.max(0,Math.min(1,(ready-t)/dur)),free=engine.ready(0),spell=SPELLS[SPELL_KEYS[cmd]];
 if(spell)return {cd:0,ok:free&&!a.cast&&a.mana>=spell.cost};
 switch(cmd){case 'attack':return {cd:cd(a.attackReady,RULES.attackRecovery),ok:free};case 'parry':return {cd:cd(a.parryReady,RULES.parryCooldown),ok:free&&a.mana>=4};case 'counter':return {cd:0,ok:free&&a.counter>t,lit:free&&a.counter>t};
  case 'ward':return {cd:cd(a.defenseReady,1),ok:free&&a.mana>=14};case 'defend':return {cd:cd(a.defenseReady,1),ok:free};case 'dodge':return {cd:cd(a.dodgeReady,RULES.dodgeCooldown),ok:free&&a.stamina>=25};
  case 'cancel':return {cd:0,ok:!!a.cast};case 'swap':return {cd:cd(a.swapReady,RULES.swapCooldown),ok:free&&!a.cast};
  case 'scan':{const stage=engine.objective.stage(0);return {cd:0,ok:free&&!a.cast&&stage<4&&(stage>0||distance(a,RELAY)<=RULES.scanRange)};}}return null;}
function status(f,i,now){if(!engine.alive(i))return ['Fallen','',0];if(f.stun>engine.time)return ['Staggered',(f.stun-engine.time).toFixed(1)+' s',0];
 if(f.cast){const c=f.cast;if(c.kind==='thinking')return ['Thinking · vulnerable',(engine.time-c.start).toFixed(1)+' s',20+Math.sin(now/350)*10];return [c.kind==='scan'?'Scanning':c.kind==='swap'?'Summoning reserve':'Casting '+SPELLS[c.action].name,Math.max(0,c.end-engine.time).toFixed(1)+' s',(engine.time-c.start)/(c.end-c.start)*100];}
 return [f.parry>engine.time?'Parrying':f.ward>engine.time?'Warded · blocks one hit':f.guard>engine.time?'Guarding':'Ready','',0];}
function hud(now){if(!engine||!playing)return;const a=engine.actors[0],b=engine.actors[1],seen=engine.alive(1)&&distance(a,b)<850&&lineClear(a,b);
 label('timer',clock(RULES.duration-engine.time));label('score','Kills '+a.kills+'–'+b.kills);label('playerTier',TIERS[a.tier].name);label('latency',latency===null?(a.provider==='offline'?'Offline':'OpenAI'):latency+' ms');
 for(let i=0;i<2;i++){const prefix=i?'e':'p',f=engine.actors[i],[text,time,fill]=status(f,i,now);$(prefix+'hp').style.width=f.hp/RULES.heroHp*100+'%';label(prefix+'hpText',Math.ceil(f.hp)+' / '+RULES.heroHp);label(prefix+'status',text);label(prefix+'casttime',time);$(prefix+'charge').style.width=fill+'%';}
 $('pmana').style.width=a.mana+'%';label('pmanaText',Math.floor(a.mana));$('pstamina').style.width=a.stamina+'%';label('pstaminaText',Math.floor(a.stamina));label('enemyIntel',seen?'In sight':'Out of sight');$('enemyCard').classList.toggle('lost',!seen);
 for(const el of document.querySelectorAll('[data-command]')){const st=slotState(el.dataset.command,a);if(!st)continue;el.classList.toggle('blocked',!st.ok);el.classList.toggle('lit',!!st.lit);el.querySelector?.('.cd')?.style.setProperty('--cd',st.cd.toFixed(3));}
 const c=engine.clash;show('clash',!!c);if(c){$('clashFill').style.width=Math.max(0,(c.end-engine.time)/RULES.clashDuration*100)+'%';label('clashChosen',c.choices[0]?'Locked in: '+c.choices[0][0].toUpperCase()+c.choices[0].slice(1):'Press 1, 2 or 3');for(const t of document.querySelectorAll('[data-tactic]'))t.classList.toggle('selected',c.choices[0]===t.dataset.tactic);}
 show('dice',!!lastRoll&&now<dieUntil);if(lastRoll){$('dieFace').dataset.roll=String(lastRoll.roll);label('dieFace',String(lastRoll.roll));label('diceTitle',lastRoll.pass?'Channel held':'Channel broken');label('diceText','Rolled '+lastRoll.roll+' on d6 · needed '+lastRoll.threshold+'+');$('dice').classList.toggle('fail',!lastRoll.pass);}
 show('respawn',!engine.alive(0)&&engine.mode==='ctf'&&engine.status==='running');label('respawnTime',Math.max(0,a.deadUntil-engine.time).toFixed(1)+' s');
 if(engine.mode==='ctf'){const stage=engine.objective.stage(0),site=a.proof&&SITES.find(s=>s.id===a.proof.siteId),meters=Math.round(distance(a,site||RELAY));label('objectiveText',stage===4?'Hold '+site.name+' · '+meters+' m':stage===0?'Reach the Noetic Relay · '+meters+' m':'Keep scanning · '+stage+' of 4 decoded');
  [...$('objectiveSteps').children].forEach((el,k)=>el.classList.toggle('done',k<stage));$('objectivebar').classList.toggle('binding',stage===4);$('captureFill').style.width=a.capture/RULES.captureTime*100+'%';label('captureText',a.capture.toFixed(1)+' / 4 s');}
 label('inputHint',typing()?'Enter to cast · Esc to fight · arrow keys move':'Enter to speak to '+a.name+(engine.mode==='ctf'?' · Tab for clues':''));if(now>announcementUntil)$('announcement').classList.remove('visible');
}
setInterval(()=>{const now=performance.now(),dt=Math.max(0,(now-lastTick)/1000);lastTick=now;if(playing&&engine){engine.setInput(0,controls.sample(engine.actors[0],renderer,typing()));engine.advance(dt,botTick);consume();}},25);
function frame(now){renderer.draw(now,engine,playing);hud(now);requestAnimationFrame(frame);}requestAnimationFrame(frame);selections();
// State-only hooks for deterministic integration testing; credentials never exposed.
window.JAOYA={start,menu,submit,get engine(){return engine;},get settings(){return {...settings};},controls};
