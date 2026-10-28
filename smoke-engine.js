/* One quiet domestic smoke overlay. Cached generated pixel sprites, no particles or filters. */
(function(){'use strict';
 const plume=new Image(),vent=new Image();let ready=false,failed=false,clock=0,draws=0,active=[];const options={enabled:true,strength:1};
 const objects=()=>VillageSmokeData.objects.filter(o=>o.enabled).slice(0,2);
 function bounds(o){const d=VillageSmokeData;return{x:Math.min(o.x,o.vent.x),y:o.y-Math.ceil(d.risePerPhase),width:Math.max(o.x+o.width,o.vent.x+o.vent.width)-Math.min(o.x,o.vent.x),height:o.vent.y+o.vent.height-(o.y-Math.ceil(d.risePerPhase))};}
 function load(im,src){return new Promise((resolve,reject)=>{im.onload=resolve;im.onerror=()=>reject(Error(src+' 연기 에셋을 열 수 없습니다.'));im.src=src});}
 async function prepare(){try{await Promise.all([load(plume,VillageSmokeData.image),load(vent,VillageSmokeData.ventImage)]);ready=true;return true}catch(e){failed=true;options.enabled=false;return false}}
 function update(dt){if(ready&&!failed&&options.enabled&&Number.isFinite(dt)&&dt>0)clock+=Math.min(dt,.1);}
 function paint(ctx,view,scale,width,height){draws=0;active=[];if(!ready||failed||!options.enabled)return;const d=VillageSmokeData,p=clock*d.fps,frame=Math.floor(p)%d.frameCount,t=p-Math.floor(p),next=(frame+1)%d.frameCount;
  ctx.save();ctx.imageSmoothingEnabled=false;
  for(const o of objects()){const b=bounds(o),x=view.ox+b.x*scale,y=view.oy+b.y*scale;if(x+b.width*scale<=0||y+b.height*scale<=0||x>=width||y>=height)continue;active.push(o.houseId);
   ctx.globalAlpha=1;ctx.drawImage(vent,view.ox+o.vent.x*scale,view.oy+o.vent.y*scale,o.vent.width*scale,o.vent.height*scale);draws++;
   // Constant thin root joins the vent. Only the upper wisp rises and blends.
   ctx.globalAlpha=d.rootOpacity*options.strength;ctx.drawImage(plume,0,d.frameHeight-d.rootHeight,d.frameWidth,d.rootHeight,view.ox+o.x*scale,view.oy+(o.y+d.frameHeight-d.rootHeight)*scale,o.width*scale,d.rootHeight*scale);draws++;
   if(1-t>1e-5){ctx.globalAlpha=d.opacity*options.strength*(1-t);ctx.drawImage(plume,frame*d.frameWidth,0,d.frameWidth,d.mainHeight,view.ox+o.x*scale,view.oy+(o.y-t*d.risePerPhase)*scale,o.width*scale,d.mainHeight*scale);draws++;}
   if(t>1e-5){ctx.globalAlpha=d.opacity*options.strength*t;ctx.drawImage(plume,next*d.frameWidth,0,d.frameWidth,d.mainHeight,view.ox+o.x*scale,view.oy+(o.y+(1-t)*d.risePerPhase)*scale,o.width*scale,d.mainHeight*scale);draws++;}
  }ctx.restore();
 }
 function configure(p){if(typeof p.enabled==='boolean')options.enabled=p.enabled;if(Number.isFinite(p.strength))options.strength=Math.max(.25,Math.min(1,p.strength));}
 function reset(){clock=0;options.enabled=true;options.strength=1;}
 window.VillageSmoke={prepare,update,paint,configure,reset,bounds,get snapshot(){return {ready,failed,clock,frame:Math.floor(clock*VillageSmokeData.fps)%VillageSmokeData.frameCount,draws,activeHouseIds:[...active],houseIds:objects().map(o=>o.houseId),options:{...options}}}};
})();
