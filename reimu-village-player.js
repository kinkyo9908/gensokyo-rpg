(function(root){'use strict';
 const labels={down:'아래',down_left:'좌하',left:'왼쪽',up_left:'좌상',up:'위',up_right:'우상',right:'오른쪽',down_right:'우하'};
 const octants=['right','down_right','down','down_left','left','up_left','up','up_right'];
 let direction='down',phase=0,moving=false,walkFps=6,effectiveFps=0;
 function facing(dx,dy){return octants[(Math.round(Math.atan2(dy,dx)/(Math.PI/4))+8)%8];}
 function advance({dx,dy,distance,dt,actor=1}){
  moving=distance>.001;
  if(moving){if(dx||dy)direction=facing(dx,dy);const frames=distance*walkFps/(260*Math.max(.01,actor));phase=(phase+frames)%4;effectiveFps=dt>0?frames/dt:0;}
  else effectiveFps=0;
 }
 function reset(){direction='down';phase=0;moving=false;effectiveFps=0;}
 function configure(fps){walkFps=Math.max(4,Math.min(10,Number(fps)||6));}
 function bounds({x,y,height,pad=4}){
  const data=ReimuSprites.data,d=data.directions[direction],f=moving?d.frames[Math.floor(phase)%4]:d.idle,s=height/data.bodyHeight,[vx,vy,vw,vh]=f.virtualRect;
  const left=Math.min(x+(vx-data.footAnchor[0])*s,x-height*.18),right=Math.max(x+(vx-data.footAnchor[0]+vw)*s,x+height*.18);
  const top=y+(vy-data.footAnchor[1])*s,bottom=Math.max(y+(vy-data.footAnchor[1]+vh)*s,y+height*.06);
  return {x:Math.floor(left-pad),y:Math.floor(top-pad),width:Math.ceil(right-left+pad*2+1),height:Math.ceil(bottom-top+pad*2+1)};
 }
 function paint(ctx,{x,y,height,shadowHeight=4}){
  ctx.save();ctx.fillStyle='#17251665';ctx.beginPath();ctx.ellipse(x,y,height*.18,shadowHeight,0,0,Math.PI*2);ctx.fill();ctx.restore();
  ReimuSprites.paint(ctx,{direction,mode:moving?'walk':'idle',frame:Math.floor(phase)%4,x,y,height});
 }
 root.ReimuVillagePlayer={advance,reset,configure,bounds,paint,facing,get snapshot(){return {direction,label:labels[direction],moving,frame:Math.floor(phase)%4,phase,walkFps,effectiveFps,sourceVersion:'0.8-review'};}};
})(window);
