/* One deterministic, non-colliding ambient cat. No storage/network/pathfinding. */
(function(root){'use strict';
 function create(data){
  let s;const direction=(dx,dy)=>Math.abs(dx)>Math.abs(dy)?(dx>0?'walk_right':'walk_left'):(dy>0?'walk_down':'walk_up');
  function animation(name){if(s.animation!==name){s.animation=name;s.animationTime=0;}}
  function beginLeg(index){s.legIndex=index;s.waypoint=1;s.mode='walk';s.hold=0;const p=data.legs[index].path[1];animation(direction(p[0]-s.x,p[1]-s.y));}
  function reset(){s={x:data.points.A[0],y:data.points.A[1],mode:'walk',animation:'walk_up',animationTime:0,legIndex:0,waypoint:1,hold:0,cycles:0,elapsed:0};beginLeg(0);}
  function nextLeg(){const index=(s.legIndex+1)%data.legs.length;if(index===0)s.cycles++;beginLeg(index);}
  function update(dt){
   // Discard background-tab gaps, never fast-forward through the route.
   let remaining=Math.max(0,Math.min(Number.isFinite(dt)?dt:0,.05));s.elapsed+=remaining;
   for(let guard=0;remaining>1e-10&&guard<32;guard++){
    const leg=data.legs[s.legIndex];
    if(s.mode==='rest'){
     const step=Math.min(remaining,s.hold);s.hold=Math.max(0,s.hold-step);s.animationTime+=step;remaining-=step;
     if(s.hold<=1e-9)nextLeg();continue;
    }
    const p=leg.path[s.waypoint],dx=p[0]-s.x,dy=p[1]-s.y,distance=Math.hypot(dx,dy);
    animation(direction(dx,dy));const time=distance/data.speed,step=Math.min(remaining,time);s.animationTime+=step;remaining-=step;
    if(time<=step+1e-10){
     s.x=p[0];s.y=p[1];s.waypoint++;
     if(s.waypoint>=leg.path.length){
      if(leg.rest){s.mode='rest';s.hold=leg.rest.seconds;animation(leg.rest.animation);}
      else nextLeg();
     }
    }else{const k=step*data.speed/distance;s.x+=dx*k;s.y+=dy*k;}
   }
  }
  function snapshot(){const leg=data.legs[s.legIndex];return {...s,leg:leg.id,target:s.mode==='rest'?leg.to:leg.to,nextWaypoint:s.mode==='rest'?null:[...leg.path[s.waypoint]]};}
  reset();return {update,reset,snapshot};
 }
 function validate(data,terrain){let samples=0,failed=[];
  for(let l=0;l<data.legs.length;l++){const leg=data.legs[l],prev=data.legs[(l+data.legs.length-1)%data.legs.length];
   if(JSON.stringify(leg.path[0])!==JSON.stringify(data.points[leg.from])||JSON.stringify(leg.path.at(-1))!==JSON.stringify(data.points[leg.to])||JSON.stringify(prev.path.at(-1))!==JSON.stringify(leg.path[0]))throw Error('고양이 경로 연결 데이터 오류');
   for(let i=1;i<leg.path.length;i++){const a=leg.path[i-1],b=leg.path[i],n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/data.sampleSpacing);
    for(let j=0;j<=n;j++){const t=j/n,x=a[0]+(b[0]-a[0])*t,y=a[1]+(b[1]-a[1])*t;samples++;if(!terrain.valid(x,y,data.validationRadius))failed.push({leg:leg.id,segment:i,x,y,objects:terrain.blockers(x,y,data.validationRadius).map(o=>o.id)});}
   }
  }return {valid:failed.length===0,samples,radius:data.validationRadius,spacing:data.sampleSpacing,failed};
 }
 if(typeof module!=='undefined')module.exports={create,validate};
 if(typeof document==='undefined')return;
 const routine=create(root.VillageCatData),images={},lastIds=[];let ready=false,failed=false,culled=false,routeCheck=null,renderCount=0,debugEnabled=false;
 async function prepare(terrain){try{
  routeCheck=validate(root.VillageCatData,terrain);if(!routeCheck.valid)throw Error('고양이 산책로가 기존 지형과 겹칩니다.');
  await Promise.all(Object.entries(root.VillageCatAssets.animations).map(([key,a])=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>{if(im.naturalWidth!==96*a.frames.length||im.naturalHeight!==96){reject(Error('고양이 시트 규격 오류: '+key));return;}images[key]=im;resolve();};im.onerror=()=>reject(Error('고양이 에셋 누락: '+a.sheet));im.src='assets/cat/'+a.sheet;})));
  ready=true;return true;
 }catch(e){failed=e.message;return false;}}
 function paint(ctx,{view,sourceScale,width,height,occlusion,dpr}){
  lastIds.length=0;if(!ready)return;const s=routine.snapshot(),a=root.VillageCatAssets.animations[s.animation],frame=a.frames[Math.floor(s.animationTime*a.fps)%a.frames.length],p=root.VillageCatData,scale=sourceScale*view.scale;
  // Same immutable world size in every animation; source-coordinate path never scales.
  const pixelScale=p.framePixelToWorld*view.scale,x=view.ox+s.x*scale,y=view.oy+s.y*scale,w=96*pixelScale,h=w,correction=root.VillageAnimalRenderAlignment?.offset("cat",s.animation,Math.floor(s.animationTime*a.fps)%a.frames.length)||{x:0,y:0},left=x-(p.anchor[0]-correction.x)*pixelScale,top=y-(p.anchor[1]-correction.y)*pixelScale;
  const screenBox={x:Math.floor(left-3),y:Math.floor(top-3),width:Math.ceil(w+6),height:Math.ceil(h+6)};
  culled=screenBox.x+screenBox.width<0||screenBox.x>width||screenBox.y+screenBox.height<0||screenBox.y>height;if(culled)return;
  const box={x:(screenBox.x-view.ox)/scale,y:(screenBox.y-view.oy)/scale,width:screenBox.width/scale,height:screenBox.height/scale};
  root.VillageOcclusion.paint(ctx,{foot:{x:s.x,y:s.y},box,screenBox,visible:{x:-view.ox/scale,y:-view.oy/scale,width:width/scale,height:height/scale},enabled:occlusion,view,scale,dpr,draw(g){g.save();g.fillStyle='#17251645';g.beginPath();g.ellipse(x,y,5*view.scale,1.7*view.scale,0,0,Math.PI*2);g.fill();g.imageSmoothingEnabled=false;g.drawImage(images[s.animation],...frame.rect,left,top,w,h);g.restore();}});
  lastIds.push(...root.VillageOcclusion.activeIds);renderCount++;
 }
 function debug(ctx,view,scale){if(!debugEnabled)return;const d=root.VillageCatData,s=routine.snapshot();ctx.save();ctx.translate(view.ox,view.oy);ctx.scale(scale,scale);ctx.lineWidth=2/scale;
  const colors=['#ffd974','#8fdfb0','#9dcfff','#eda7d1'];d.legs.forEach((leg,i)=>{ctx.strokeStyle=colors[i];ctx.beginPath();leg.path.forEach(([x,y],j)=>j?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();for(const [x,y]of leg.path){ctx.fillStyle=colors[i];ctx.beginPath();ctx.arc(x,y,2.5/scale,0,Math.PI*2);ctx.fill();}});
  for(const [name,[x,y]]of Object.entries(d.points)){ctx.strokeStyle='#fff3bf';ctx.fillStyle='#fff3bf';ctx.beginPath();ctx.arc(x,y,6/scale,0,Math.PI*2);ctx.stroke();ctx.font=`bold ${15/scale}px sans-serif`;ctx.fillText(name,x+9/scale,y-7/scale);}
  ctx.strokeStyle='#f6c67588';ctx.setLineDash([3/scale,3/scale]);ctx.beginPath();ctx.arc(s.x,s.y,d.validationRadius,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='#ffce82';ctx.beginPath();ctx.arc(s.x,s.y,2.5/scale,0,Math.PI*2);ctx.fill();ctx.restore();
 }
 root.VillageCat={prepare,paint,debug,reset:()=>routine.reset(),update:dt=>{if(ready)routine.update(dt)},configureDebug:v=>{debugEnabled=!!v},get snapshot(){const s=routine.snapshot(),a=root.VillageCatAssets.animations[s.animation];return {...s,frame:Math.floor(s.animationTime*a.fps)%a.frames.length,ready,failed,culled,renderCount,activeOcclusion:[...lastIds],debug:debugEnabled,routeValidation:routeCheck}}};
})(typeof window==='undefined'?globalThis:window);
