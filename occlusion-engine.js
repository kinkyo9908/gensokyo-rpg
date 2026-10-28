/* Pure rendering support. Never reads or changes collision/movement state. */
(function(){'use strict';
 const images=new Map(),layer=document.createElement('canvas');let active=[];
 function inside(x,y,p){let a=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const u=p[i],v=p[j];if((u[1]>y)!==(v[1]>y)&&x<(v[0]-u[0])*(y-u[1])/(v[1]-u[1])+u[0])a=!a;}return a;}
 function depth(o,x){
  const d=o.depth;if(d.point)return d.point[1];
  // Buildings have two front-facing edges. Evaluate their shared, continuous
  // ground-contact chain instead of extending one edge across the whole roof.
  // Legacy point/line objects retain their original calculation.
  const chain=d.polyline;
  if(chain){
   if(x<=chain[0][0])return chain[0][1];
   for(let i=1;i<chain.length;i++){const a=chain[i-1],b=chain[i];if(x<=b[0]){const t=(x-a[0])/(b[0]-a[0]||1);return a[1]+(b[1]-a[1])*t;}}
   return chain[chain.length-1][1];
  }
  const[a,b]=d.line,t=Math.max(0,Math.min(1,(x-a[0])/(b[0]-a[0]||1)));return a[1]+(b[1]-a[1])*t;
 }
 function intersects(a,b){return a.x<a.x+a.width&&a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;}
 function select(foot,box,visible){return VillageOcclusionData.objects.filter(o=>o.enabled&&images.has(o.id)&&inside(foot.x,foot.y,o.zone)&&foot.y<depth(o,foot.x)&&intersects(box,o)&&(!visible||intersects(visible,o)));}
 async function prepare(){await Promise.all(VillageOcclusionData.objects.map(o=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>{images.set(o.id,im);resolve()};im.onerror=()=>reject(Error(o.image+' 전경 파일을 열 수 없습니다. ZIP 전체를 압축 해제해 주세요.'));im.src=o.image;})));}
 function paint(ctx,{foot,box,screenBox,visible,enabled,view,scale,dpr,draw}){
  active=enabled?select(foot,box,visible):[];
  if(!active.length){draw(ctx);return;}
  const left=Math.floor(screenBox.x),top=Math.floor(screenBox.y),w=Math.ceil(screenBox.width+2),h=Math.ceil(screenBox.height+2),pw=Math.ceil(w*dpr),ph=Math.ceil(h*dpr);
  if(layer.width!==pw||layer.height!==ph){layer.width=pw;layer.height=ph;}
  const g=layer.getContext('2d');g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,layer.width,layer.height);g.setTransform(dpr,0,0,dpr,-left*dpr,-top*dpr);g.globalCompositeOperation='source-over';draw(g);
  // Remove covered sprite pixels using the pre-extracted PNG alpha. The matching
  // foreground RGB is already in the original base image: never paint it twice.
  g.save();g.globalCompositeOperation='destination-out';g.imageSmoothingEnabled=true;
  for(const o of active)g.drawImage(images.get(o.id),view.ox+o.x*scale,view.oy+o.y*scale,o.width*scale,o.height*scale);
  g.restore();ctx.save();ctx.imageSmoothingEnabled=true;ctx.drawImage(layer,0,0,pw,ph,left,top,pw/dpr,ph/dpr);ctx.restore();
 }
 function debug(ctx,view,scale,additionalActiveIds=[]){ctx.save();ctx.translate(view.ox,view.oy);ctx.scale(scale,scale);for(const o of VillageOcclusionData.objects){const on=active.some(a=>a.id===o.id)||additionalActiveIds.includes(o.id);ctx.strokeStyle=on?'#ffef4c':o.group==='farm-fence'?'#6fd5ff':o.group?'#ffad73':'#9b8cff';ctx.fillStyle=on?'#ffef4c20':'#9b8cff0c';ctx.lineWidth=(on?2:1)/scale;ctx.beginPath();o.zone.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();ctx.stroke();const d=o.depth,line=d.polyline||d.line;if(line){ctx.beginPath();line.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.stroke();}const p=d.point||(d.polyline?d.polyline[1]:[(d.line[0][0]+d.line[1][0])/2,(d.line[0][1]+d.line[1][1])/2]);ctx.beginPath();ctx.arc(p[0],p[1],3/scale,0,Math.PI*2);ctx.stroke();ctx.font=(11/scale)+'px sans-serif';ctx.fillStyle=on?'#ffef4c':'#d5caff';ctx.fillText(o.id,p[0]+5/scale,p[1]-5/scale);}ctx.restore();}
 window.VillageOcclusion={prepare,paint,debug,select,depth,get activeIds(){return active.map(o=>o.id)},get size(){return images.size}};
})();
