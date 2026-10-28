/* Circle-foot collision in original-image coordinates. No storage or network. */
(function(root){
'use strict';
const EPS=1e-7,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function nearest(x,y,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],t=clamp(((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy||1),0,1);return {x:a[0]+dx*t,y:a[1]+dy*t};}
function inside(x,y,points){let yes=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[i],b=points[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;}
function edgeInfo(o,x,y){let result={d:Infinity,x:0,y:0};const p=o.points,n=o.type==='polygon'?p.length:p.length-1;for(let i=0;i<n;i++){const q=nearest(x,y,p[i],p[(i+1)%p.length]),d=Math.hypot(x-q.x,y-q.y);if(d<result.d)result={...q,d};}return result;}
function bounds(o){if(o.type==='circle')return [o.x-o.radius,o.y-o.radius,o.x+o.radius,o.y+o.radius];const xs=o.points.map(p=>p[0]),ys=o.points.map(p=>p[1]),r=o.radius||0;return [Math.min(...xs)-r,Math.min(...ys)-r,Math.max(...xs)+r,Math.max(...ys)+r];}
function make(data){const objects=Object.entries(data.groups).flatMap(([group,list])=>list.map(o=>({...o,group,bounds:bounds(o)})));const cells=new Map(),CELL=64;for(const o of objects){const [x0,y0,x1,y1]=o.bounds;for(let y=Math.floor(y0/CELL);y<=Math.floor(y1/CELL);y++)for(let x=Math.floor(x0/CELL);x<=Math.floor(x1/CELL);x++){const key=x+','+y;if(!cells.has(key))cells.set(key,[]);cells.get(key).push(o);}}
 function nearby(x,y,r){const found=new Set();for(let cy=Math.floor((y-r)/CELL);cy<=Math.floor((y+r)/CELL);cy++)for(let cx=Math.floor((x-r)/CELL);cx<=Math.floor((x+r)/CELL);cx++)for(const o of cells.get(cx+','+cy)||[])found.add(o);return found;}
 function hit(o,x,y,r){if(o.type==='circle')return Math.hypot(x-o.x,y-o.y)<r+o.radius-EPS;const e=edgeInfo(o,x,y);return (o.type==='polygon'&&inside(x,y,o.points))||e.d<r+(o.radius||0)-EPS;}
 function blockers(x,y,r){const list=[];if(!inside(x,y,data.boundary.points)||edgeInfo(data.boundary,x,y).d<r-EPS)list.push({...data.boundary,group:'boundary'});for(const o of nearby(x,y,r)){const [x0,y0,x1,y1]=o.bounds;if(x+r<x0||x-r>x1||y+r<y0||y-r>y1)continue;if(hit(o,x,y,r))list.push(o);}return list;}
 function valid(x,y,r){return blockers(x,y,r).length===0;}
 function normal(o,x,y){let dx,dy;if(o.type==='circle'){dx=x-o.x;dy=y-o.y;}else{const q=edgeInfo(o,x,y);dx=x-q.x;dy=y-q.y;const inPoly=o.type==='polygon'&&inside(x,y,o.points);if((o.group==='boundary'&&!inPoly)||(o.group!=='boundary'&&inPoly)){dx=-dx;dy=-dy;}}const len=Math.hypot(dx,dy);return len>EPS?{x:dx/len,y:dy/len}:{x:0,y:0};}
 function move(x,y,dx,dy,r){const total=Math.hypot(dx,dy),steps=Math.max(1,Math.ceil(total/Math.max(.1,Math.min(1,r*.4))));let lastHit='';if(!valid(x,y,r))return {x,y,blocked:true,lastHit:'현재 발 위치가 충돌 영역 내부입니다.'};const sx=dx/steps,sy=dy/steps;
  for(let i=0;i<steps;i++){const hits=blockers(x+sx,y+sy,r);if(!hits.length){x+=sx;y+=sy;continue;}lastHit=hits.map(o=>o.id).join(', ');const choices=[];
   // Project onto contact tangents; never push the character out or teleport.
   let tx=sx,ty=sy;for(const h of hits){const n=normal(h,x+tx,y+ty),dot=tx*n.x+ty*n.y;if(dot<0){tx-=dot*n.x;ty-=dot*n.y;}}
   if(Math.hypot(tx,ty)>EPS&&valid(x+tx,y+ty,r))choices.push([tx,ty]);
   if(valid(x+sx,y,r))choices.push([sx,0]);if(valid(x,y+sy,r))choices.push([0,sy]);
   choices.sort((a,b)=>(b[0]*sx+b[1]*sy)-(a[0]*sx+a[1]*sy));if(choices.length){x+=choices[0][0];y+=choices[0][1];}
  }return {x,y,blocked:!!lastHit,lastHit};
 }
 return {data,objects,valid,blockers,move,inside,edgeInfo};
}
root.VillageCollision={make};if(typeof module!=='undefined')module.exports={make};
})(typeof window==='undefined'?globalThis:window);
