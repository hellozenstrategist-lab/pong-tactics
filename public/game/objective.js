// Synthetic symbolic deduction game only: no vulnerable services, shell, filesystem,
// network discovery, or exploit execution. Match proofs gate physical capture.
import {SITES} from './world.js';
const glyphs=['moon','thorn','crown'],values={moon:3,thorn:5,crown:8};
export function checksum(epoch,glyph){return (epoch+values[glyph]*7)%97;}
export class ObjectivePuzzle{
 #site;#seal;#epoch;#glyph;#records;#teams;#match;
 constructor(rng,matchId){this.#match=matchId;this.#site=SITES[Math.floor(rng()*3)].id;this.#epoch=100+Math.floor(rng()*800);this.#glyph=glyphs[Math.floor(rng()*3)];this.#seal=String(10000+Math.floor(rng()*90000));this.#teams=[{stage:0,records:[],proof:null},{stage:0,records:[],proof:null}];
  this.#records=SITES.map((site,i)=>({siteId:site.id,epoch:this.#epoch,glyph:site.id===this.#site?this.#glyph:glyphs[(glyphs.indexOf(this.#glyph)+i+1)%3],check:site.id===this.#site?checksum(this.#epoch,this.#glyph):-1}));
 }
 stage(team){return this.#teams[team]?.stage??0;}
 view(team){const t=this.#teams[team];return {stage:t.stage,records:structuredClone(t.records),siteId:t.proof?.siteId??null};}
 inspect(team){const t=this.#teams[team];if(t.stage===0){const record={kind:'relay',text:`Current cycle ${this.#epoch}. True signature: ${this.#glyph}. Check = (cycle + glyph × 7) mod 97. Glyph values: moon 3, thorn 5, crown 8.`,epoch:this.#epoch,glyph:this.#glyph};t.records.push(record);t.stage=1;return record;}
  if(t.stage===1){const record={kind:'registry',text:'Registry received. Some entries are decoys; verify their checksum.',entries:structuredClone(this.#records)};t.records.push(record);t.stage=2;return record;}
  if(t.stage===2){const n=Number(this.#seal),record={kind:'seal',text:'Seal shards received. Multiply the left shard by 100 and add the right.',left:Math.floor(n/100),right:n%100};t.records.push(record);t.stage=3;return record;}return null;
 }
 submit(team,{siteId,seal}={}){const t=this.#teams[team];if(t.stage<3||siteId!==this.#site||String(seal)!==this.#seal)return null;t.proof={matchId:this.#match,team,siteId};t.stage=4;return {...t.proof};}
 valid(team,proof){const p=this.#teams[team].proof;return !!p&&proof?.matchId===this.#match&&proof?.team===team&&proof?.siteId===p.siteId;}
}
export function deduce(records){const relay=records.find(r=>r.kind==='relay'),registry=records.find(r=>r.kind==='registry'),seal=records.find(r=>r.kind==='seal');if(!relay||!registry||!seal)return null;const matches=registry.entries.filter(e=>e.epoch===relay.epoch&&e.glyph===relay.glyph&&e.check===checksum(relay.epoch,relay.glyph));if(matches.length!==1)return null;return {siteId:matches[0].siteId,seal:String(seal.left*100+seal.right)};}
