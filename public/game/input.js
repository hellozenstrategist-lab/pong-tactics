// Keyboard state is independent from text content. Text focus disables letter movement.
export class ArenaInput{
 constructor(){this.keys=new Set();this.right=false;this.pointer=null;}
 clear(){this.keys.clear();this.right=false;}
 typing(){for(const key of ['w','a','s','d'])this.keys.delete(key);}
 direction(isTyping=false){const has=k=>this.keys.has(k);return {x:Number(has('arrowright')||(!isTyping&&has('d')))-Number(has('arrowleft')||(!isTyping&&has('a'))),y:Number(has('arrowdown')||(!isTyping&&has('s')))-Number(has('arrowup')||(!isTyping&&has('w')))};}
 sample(actor,renderer,isTyping=false){const move=this.direction(isTyping);let angle=actor.facing;if(this.pointer){const target=renderer.screenToWorld(this.pointer.x,this.pointer.y);angle=Math.atan2(target.y-actor.y,target.x-actor.x);if(this.right){const dx=target.x-actor.x,dy=target.y-actor.y,len=Math.hypot(dx,dy);if(len>24){move.x=dx/len;move.y=dy/len;}}}return {...move,angle};}
}
