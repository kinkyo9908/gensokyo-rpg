/* Pre-baked native-pixel bucket rotation. No runtime rotation/filters or terrain access. */
(function(){'use strict';
 const image=new Image();let ready=false,failed=false,clock=0,draws=0;const options={enabled:true,speed:1,debug:false};
 function prepare(){return new Promise(resolve=>{image.onload=()=>{ready=true;resolve(true)};image.onerror=()=>{failed=true;options.enabled=false;resolve(false)};image.src=VillageMillData.image});}
 function update(dt){if(ready&&!failed&&options.enabled&&Number.isFinite(dt)&&dt>0)clock+=Math.min(dt,.1)*options.speed;}
 function paint(ctx,view,scale,width,height){draws=0;if(!ready||failed||!options.enabled)return;const d=VillageMillData,x=view.ox+d.x*scale,y=view.oy+d.y*scale,w=d.width*scale,h=d.height*scale;if(x+w<=0||y+h<=0||x>=width||y>=height)return;const f=Math.floor(clock*d.fps)%d.frameCount;ctx.save();ctx.imageSmoothingEnabled=false;ctx.drawImage(image,f*d.width,0,d.width,d.height,x,y,w,h);ctx.restore();draws=1;}
 function debug(ctx,view,scale){if(!options.debug)return;const d=VillageMillData;ctx.save();ctx.strokeStyle='#ffbe68';ctx.lineWidth=1.5;ctx.strokeRect(view.ox+d.x*scale,view.oy+d.y*scale,d.width*scale,d.height*scale);ctx.font='12px sans-serif';ctx.fillStyle='#ffe5a0';ctx.fillText('mill-wheel · baked bucket poses',view.ox+d.x*scale,view.oy+d.y*scale-6);ctx.restore();}
 function configure(p){if(typeof p.enabled==='boolean')options.enabled=p.enabled;if(typeof p.debug==='boolean')options.debug=p.debug;if(Number.isFinite(p.speed))options.speed=Math.max(.25,Math.min(2,p.speed));}
 function reset(){clock=0;options.enabled=true;options.speed=1;options.debug=false;}
 window.VillageMill={prepare,update,paint,debug,configure,reset,get snapshot(){return {ready,failed,clock,frame:Math.floor(clock*VillageMillData.fps)%VillageMillData.frameCount,draws,options:{...options},bounds:{x:VillageMillData.x,y:VillageMillData.y,width:VillageMillData.width,height:VillageMillData.height}}}};
})();
