// All prototype balance values live here. Game profiles are not provider speed claims.
export const RULES=Object.freeze({tick:1/60,duration:240,heroHp:130,mana:100,stamina:100,speed:215,enemySpeed:182,radius:18,meleeRange:110,attackWindup:.24,attackActive:.13,attackRecovery:.65,meleeDamage:16,parryWindow:.5,perfectWindow:.2,parryCooldown:1.1,dodgeTime:.22,dodgeDistance:100,dodgeCooldown:1.25,guardDuration:1.6,wardDuration:4,stagger:.65,hitProtection:.25,clashWindow:.3,clashDuration:1.8,clashRange:145,clashDamage:22,channelThreshold:4,guardThreshold:2,respawnTime:4,captureTime:4,scanTime:2.7,scanRange:160,swapTime:5,swapCooldown:20});
export const TIERS=Object.freeze({swift:{name:'Swift',charge:1.3,power:1,think:.3},oracle:{name:'Balanced',charge:3.2,power:1.18,think:.6},titan:{name:'Deep',charge:6.5,power:1.4,think:1.05}});
export const SPELLS=Object.freeze({
 ember:{name:'Ember lance',cost:16,charge:.25,damage:27,speed:560,radius:12,color:'#ff7b8e'},
 rift:{name:'Void rift',cost:24,charge:.65,damage:36,speed:440,radius:20,color:'#b790ff'},
 nova:{name:'Eclipse nova',cost:38,charge:1,damage:43,aoe:185,color:'#40ffb4'},
 siphon:{name:'Soul siphon',cost:22,charge:.45,damage:24,speed:510,radius:14,color:'#40ffb4'},
 mend:{name:'Moon mend',cost:25,charge:.5,heal:30,color:'#97eaff'},
 decoy:{name:'False echo',cost:18,charge:.25,duration:5,color:'#aaa0ff'},
 field:{name:'Gravity snare',cost:23,charge:.5,duration:4,radius:155,color:'#ff2f7d'}
});
export const HARD=['attack','strike','defend','ward','parry','dodge','cancel','focus','feint','counter','scan','swap','push','redirect','break'];
export const LEGAL=[...HARD,...Object.keys(SPELLS)];
