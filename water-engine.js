/* Render-only precomputed water atlases. No pixel processing, particles or terrain mutation. */
(function(){'use strict';
 const images=new Map();let clock=0,ready=false,failed=false,lastDraws=0;
 const defaults=Object.freeze({enabled:true,river:true,canal:true,waterfall:true,speed:1});const options={...defaults};
 async function prepare(){try{await Promise.all(VillageWaterData.atlases.map(a=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>{images.set(a.id,im);resolve()};im.onerror=()=>reject(Error(a.image+' 물 프레임을 열 수 없습니다.'));im.src=a.image;})));ready=true;return true;}catch(e){failed=true;options.enabled=false;return false;}}
 function update(dt){if(ready&&!failed&&options.enabled&&Number.isFinite(dt)&&dt>0)clock+=Math.min(dt,.1)*options.speed;}
 function paint(ctx,view,scale,width,height){lastDraws=0;if(!ready||failed||!options.enabled)return;const left=-view.ox/scale,top=-view.oy/scale,right=(width-view.ox)/scale,bottom=(height-view.oy)/scale;ctx.save();ctx.imageSmoothingEnabled=false;
  for(const r of VillageWaterData.regions){if(!options[r.kind])continue;const a=VillageWaterData.atlases.find(a=>a.id===r.id),im=images.get(r.id),frame=Math.floor(clock*r.fps)%VillageWaterData.frameCount;for(const t of r.tiles){if(t.x+t.width<=left||t.y+t.height<=top||t.x>=right||t.y>=bottom)continue;ctx.drawImage(im,frame*a.frameWidth+t.sx,t.sy,t.width,t.height,view.ox+t.x*scale,view.oy+t.y*scale,t.width*scale,t.height*scale);lastDraws++;}}ctx.restore();}
 function configure(patch){for(const k of ['enabled','river','canal','waterfall'])if(typeof patch[k]==='boolean')options[k]=patch[k];if(Number.isFinite(patch.speed))options.speed=Math.min(2,Math.max(.25,patch.speed));}
 function reset(){Object.assign(options,defaults);clock=0;}
 window.VillageWater={prepare,update,paint,configure,reset,get snapshot(){return{ready,failed,clock,draws:lastDraws,loaded:images.size,options:{...options},frames:Object.fromEntries(VillageWaterData.regions.map(r=>[r.id,Math.floor(clock*r.fps)%VillageWaterData.frameCount]))}}};
})();
