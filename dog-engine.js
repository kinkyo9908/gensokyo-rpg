/* One non-solid ambient dog. Fixed stages only; no AI, runtime physics or storage. */
(function(root){'use strict';
 function create(data){let s,multiplier=data.speedMultiplier;
  const direction=(dx,dy)=>Math.abs(dx)>Math.abs(dy)?(dx>0?'walk_right':'walk_left'):(dy>0?'walk_down':'walk_up');
  function animation(name){if(s.animation!==name){s.animation=name;s.animationTime=0;}}
  function begin(index){s.stageIndex=index;s.waypoint=1;const p=data.stages[index];if(p.route){s.mode='move';s.hold=0;const q=data.routes[p.route][1];animation(direction(q[0]-s.x,q[1]-s.y));}else{s.mode='rest';s.hold=p.seconds;animation(p.animation);}}
  function reset(){multiplier=data.speedMultiplier;s={x:data.points.A[0],y:data.points.A[1],mode:'rest',stageIndex:0,waypoint:1,hold:20,animation:'rest',animationTime:0,cycles:0,elapsed:0};begin(0);}
  function next(){const i=(s.stageIndex+1)%data.stages.length;if(i===0)s.cycles++;begin(i);}
  function configure(options){if(Number.isFinite(options.speedMultiplier))multiplier=Math.max(1,Math.min(2,options.speedMultiplier));}
  function update(dt){let left=Math.max(0,Math.min(Number.isFinite(dt)?dt:0,.05));s.elapsed+=left;
   for(let guard=0;left>1e-10&&guard<40;guard++){
    const p=data.stages[s.stageIndex];if(!p.route){const t=Math.min(left,s.hold);s.animationTime+=t;s.hold=Math.max(0,s.hold-t);left-=t;if(s.hold<=1e-9)next();continue;}
    const q=data.routes[p.route][s.waypoint],dx=q[0]-s.x,dy=q[1]-s.y,distance=Math.hypot(dx,dy),speed=data.catReferenceSpeed*multiplier;animation(direction(dx,dy));const t=Math.min(left,distance/speed);s.animationTime+=t*multiplier;left-=t;
    if(distance/speed<=t+1e-10){s.x=q[0];s.y=q[1];s.waypoint++;if(s.waypoint>=data.routes[p.route].length)next();}
    else{const k=t*speed/distance;s.x+=dx*k;s.y+=dy*k;}
   }
  }
  function snapshot(){const p=data.stages[s.stageIndex];return {...s,stage:p.id,target:p.target||p.point,nextWaypoint:p.route?[...data.routes[p.route][s.waypoint]]:null,speed:data.catReferenceSpeed*multiplier,speedMultiplier:multiplier,movementAnimation:'existing-walk-frames',effectiveWalkFps:5*multiplier};}
  reset();return {reset,update,configure,snapshot};
 }
 function validate(data,terrain){let samples=0,failed=[];for(const [name,points]of Object.entries(data.routes))for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/data.sampleSpacing);for(let k=0;k<=n;k++){const t=k/n,x=a[0]+(b[0]-a[0])*t,y=a[1]+(b[1]-a[1])*t;samples++;if(!terrain.valid(x,y,data.validationRadius))failed.push({route:name,segment:i,x,y,ids:terrain.blockers(x,y,data.validationRadius).map(o=>o.id)});}}return {valid:!failed.length,samples,radius:data.validationRadius,spacing:data.sampleSpacing,failed};}
 if(typeof module!=='undefined')module.exports={create,validate};if(typeof document==='undefined')return;
 const routine=create(root.VillageDogData),images={},activeIds=[];let ready=false,failed=false,culled=false,renderCount=0,debugEnabled=false,routeCheck=null;
 async function prepare(terrain){try{routeCheck=validate(root.VillageDogData,terrain);if(!routeCheck.valid)throw Error('황구 경로가 기존 장애물과 겹칩니다.');await Promise.all(Object.entries(root.VillageDogAssets.animations).map(([key,a])=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>{if(im.naturalWidth!==96*a.frames.length||im.naturalHeight!==96){reject(Error('황구 시트 규격 오류: '+key));return;}images[key]=im;resolve();};im.onerror=()=>reject(Error('황구 시트 누락: '+a.sheet));im.src='assets/dog/'+a.sheet;})));ready=true;return true;}catch(e){failed=e.message;return false;}}
 function paint(ctx,{view,sourceScale,width,height,occlusion,dpr}){activeIds.length=0;if(!ready)return;const s=routine.snapshot(),a=root.VillageDogAssets.animations[s.animation],f=a.frames[Math.floor(s.animationTime*a.fps)%a.frames.length],d=root.VillageDogData,scale=sourceScale*view.scale,pixel=d.framePixelToWorld*view.scale,x=view.ox+s.x*scale,y=view.oy+s.y*scale,w=96*pixel,left=x-d.anchor[0]*pixel,top=y-d.anchor[1]*pixel;
  const screenBox={x:Math.floor(left-3),y:Math.floor(top-3),width:Math.ceil(w+6),height:Math.ceil(w+6)};culled=screenBox.x+screenBox.width<0||screenBox.y+screenBox.height<0||screenBox.x>width||screenBox.y>height;if(culled)return;
  const box={x:(screenBox.x-view.ox)/scale,y:(screenBox.y-view.oy)/scale,width:screenBox.width/scale,height:screenBox.height/scale};root.VillageOcclusion.paint(ctx,{foot:{x:s.x,y:s.y},box,screenBox,visible:{x:-view.ox/scale,y:-view.oy/scale,width:width/scale,height:height/scale},enabled:occlusion,view,scale,dpr,draw(g){g.save();g.fillStyle='#17251645';g.beginPath();g.ellipse(x,y,7*view.scale,2*view.scale,0,0,Math.PI*2);g.fill();g.imageSmoothingEnabled=false;g.drawImage(images[s.animation],...f.rect,left,top,w,w);g.restore();}});activeIds.push(...root.VillageOcclusion.activeIds);renderCount++;
 }
 function debug(ctx,view,scale){if(!debugEnabled)return;const d=root.VillageDogData,s=routine.snapshot();ctx.save();ctx.translate(view.ox,view.oy);ctx.scale(scale,scale);const colors={AB:'#ffcc69',BC:'#88dfff',CA:'#e9a0e0'};for(const [id,points]of Object.entries(d.routes)){ctx.strokeStyle=colors[id];ctx.lineWidth=(id==='CA'?1:2)/scale;ctx.setLineDash(id==='CA'?[4/scale,4/scale]:[]);ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();for(const[x,y]of points){ctx.fillStyle=colors[id];ctx.beginPath();ctx.arc(x,y,2/scale,0,Math.PI*2);ctx.fill();}}
  ctx.setLineDash([]);for(const [name,[x,y]]of Object.entries(d.points)){ctx.strokeStyle='#fff0b0';ctx.fillStyle='#fff0b0';ctx.beginPath();ctx.arc(x,y,6/scale,0,Math.PI*2);ctx.stroke();ctx.font=`bold ${15/scale}px sans-serif`;ctx.fillText('Dog '+name,x+8/scale,y-8/scale);}ctx.strokeStyle='#ffd68088';ctx.setLineDash([3/scale,3/scale]);ctx.beginPath();ctx.arc(s.x,s.y,d.validationRadius,0,Math.PI*2);ctx.stroke();ctx.restore();
 }
 root.VillageDog={prepare,paint,debug,reset:routine.reset,configure:routine.configure,update:dt=>{if(ready)routine.update(dt)},configureDebug:v=>debugEnabled=!!v,get snapshot(){const s=routine.snapshot(),a=root.VillageDogAssets.animations[s.animation];return {...s,frame:Math.floor(s.animationTime*a.fps)%a.frames.length,ready,failed,culled,renderCount,debug:debugEnabled,activeOcclusion:[...activeIds],routeValidation:routeCheck}}};
})(typeof window==='undefined'?globalThis:window);
