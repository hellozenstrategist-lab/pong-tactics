export const WORLD=Object.freeze({width:2240,height:1540});
export const SITES=Object.freeze([{id:'north',name:'North Shrine',x:1120,y:235,color:'#40ffb4'},{id:'vault',name:'Moon Vault',x:1825,y:1210,color:'#b790ff'},{id:'tower',name:'Broken Tower',x:395,y:325,color:'#ff2f7d'}]);
export const RELAY={x:550,y:850,radius:58,name:'NOETIC RELAY'};
export const WALLS=Object.freeze([
 {x:755,y:400,w:110,h:290},{x:755,y:850,w:110,h:295},
 {x:1370,y:400,w:110,h:290},{x:1370,y:850,w:110,h:295},
 {x:1000,y:580,w:230,h:80},{x:1000,y:960,w:230,h:80},
 {x:410,y:530,w:140,h:110},{x:410,y:1080,w:140,h:110},
 {x:1720,y:530,w:140,h:110},{x:1720,y:840,w:140,h:110},
 {x:900,y:140,w:70,h:170},{x:1270,y:140,w:70,h:170},
 {x:1540,y:1230,w:100,h:110},{x:1980,y:1020,w:75,h:130},
 {x:265,y:170,w:70,h:110},{x:500,y:195,w:65,h:190}
]);
export const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function blocked(x,y,r=18){return x<r||y<r||x>WORLD.width-r||y>WORLD.height-r||WALLS.some(w=>x>w.x-r&&x<w.x+w.w+r&&y>w.y-r&&y<w.y+w.h+r);}
export function moveBody(a,dx,dy){const steps=Math.max(1,Math.ceil(Math.hypot(dx,dy)/8));for(let n=0;n<steps;n++){let x=clamp(a.x+dx/steps,a.radius,WORLD.width-a.radius),y=clamp(a.y+dy/steps,a.radius,WORLD.height-a.radius);if(!blocked(x,a.y,a.radius))a.x=x;if(!blocked(a.x,y,a.radius))a.y=y;}}
export function lineClear(a,b,r=3){const count=Math.ceil(distance(a,b)/12);for(let n=1;n<count;n++){const t=n/count;if(blocked(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t,r))return false;}return true;}
// A* over a small navigation grid. Paths use only positions/terrain visible to policy.
export function findPath(from,to){const cell=70,cols=Math.ceil(WORLD.width/cell),rows=Math.ceil(WORLD.height/cell),index=(x,y)=>y*cols+x;
 const start={x:Math.floor(from.x/cell),y:Math.floor(from.y/cell)},goal={x:Math.floor(to.x/cell),y:Math.floor(to.y/cell)};
 const key=index(start.x,start.y),target=index(goal.x,goal.y),open=[key],scores=new Map([[key,0]]),parent=new Map(),closed=new Set();
 const h=k=>Math.abs(k%cols-goal.x)+Math.abs(Math.floor(k/cols)-goal.y);
 for(let loops=0;open.length&&loops<1200;loops++){open.sort((a,b)=>(scores.get(a)+h(a))-(scores.get(b)+h(b)));const k=open.shift();if(k===target){const path=[{x:to.x,y:to.y}];let p=k;while(parent.has(p)){path.unshift({x:(p%cols+.5)*cell,y:(Math.floor(p/cols)+.5)*cell});p=parent.get(p);}return path;}if(closed.has(k))continue;closed.add(k);const x=k%cols,y=Math.floor(k/cols);
  for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=cols||ny>=rows||blocked((nx+.5)*cell,(ny+.5)*cell,22))continue;const nk=index(nx,ny),g=scores.get(k)+1;if(g<(scores.get(nk)??Infinity)){scores.set(nk,g);parent.set(nk,k);open.push(nk);}}}
 return [];
}
