// Reuse the original game scenes, NPC dialogue, shops and school; adapt only the exterior.
window.VillageRemaster=(()=>{'use strict';
 const S=5120/1448,terrain=VillageCollision.make(VillageCollisionData),placements=[],doorLog=[];
 let prepared=false,installed=false,priorMap='village',lastPlayerHeight=0,activeMask=[];
 const point=(x,y)=>({x:x*S,y:y*S});
 function safe(x,y,r=12/S){if(terrain.valid(x,y,r))return {x,y};for(let d=2;d<=70;d+=2)for(let i=0;i<32;i++){const a=i*Math.PI/16,xx=x+Math.cos(a)*d,yy=y+Math.sin(a)*d;if(terrain.valid(xx,yy,r))return {x:xx,y:yy};}throw Error('마을 연결 위치를 확인할 수 없습니다: '+x+','+y);}
 function place(id,x,y){const p=safe(x,y),r=maps.village.residents.find(r=>r.id===id);if(r){Object.assign(r,point(p.x,p.y));placements.push({id,name:r.name,...p});}return p;}
 function doorway(id,x,y,arrivalMap,label){const o=maps.village.interactions.find(o=>o.id===id);if(!o)return;const p=safe(x,y);Object.assign(o,{...point(p.x,p.y),visual:point(p.x,p.y-15),kind:arrivalMap?'travel':o.kind,label:label||o.label,rx:0,ry:0,rangeX:80,rangeY:62,hitX:55,hitY:55});if(arrivalMap){o.to=arrivalMap;o.arrival={...maps[arrivalMap].arrival};}doorLog.push({id,to:o.to??null,x:p.x,y:p.y,label:o.label});return o;}
 function returnTo(id,x,y){const p=safe(x,y);for(const o of maps[id].interactions||[])if(o.kind==='travel'&&o.to==='village')o.arrival={...point(p.x,p.y),dir:0};}
 function options(){return {view,sourceScale:S,width:vw,height:vh,occlusion:true,dpr:Math.min(devicePixelRatio||1,2)};}
 function masked(foot,bounds,draw){const screenBox=bounds,box={x:(bounds.x-view.ox)/(S*view.scale),y:(bounds.y-view.oy)/(S*view.scale),width:bounds.width/(S*view.scale),height:bounds.height/(S*view.scale)};VillageOcclusion.paint(ctx,{foot:{x:foot.x/S,y:foot.y/S},box,screenBox,visible:{x:-view.ox/(S*view.scale),y:-view.oy/(S*view.scale),width:vw/(S*view.scale),height:vh/(S*view.scale)},enabled:true,view,scale:S*view.scale,dpr:Math.min(devicePixelRatio||1,2),draw});activeMask=[...VillageOcclusion.activeIds];}
 function install(){if(installed)return;installed=true;
  Object.assign(maps.village,{asset:'assets/village.png',width:5120,height:1086*S,spawn:{...point(710,467),dir:0},arrival:{...point(125,350),dir:1},occluders:[]});
  maps.village.obstacles=[];
  const originalValid=valid;valid=function(x,y,id='courtyard'){return id==='village'?terrain.valid(x/S,y/S,12/S):originalValid(x,y,id);};
  const originalMove=movePlayer;movePlayer=function(p,dx,dy,distance,id){if(id!=='village')return originalMove(p,dx,dy,distance,id);const length=Math.hypot(dx,dy);if(!length)return false;const before={x:p.x,y:p.y},r=terrain.move(p.x/S,p.y/S,dx/length*distance/S,dy/length*distance/S,12/S);p.x=r.x*S;p.y=r.y*S;return Math.hypot(p.x-before.x,p.y-before.y)>.001;};
  doorway('terakoya-door',394,275,'terakoya','케이네의 서당');returnTo('terakoya',421,302);
  doorway('geidontei-door',1159,220,'geidontei','게이돈테이');returnTo('geidontei',1159,256);
  doorway('yujin-room-door',830,332,'yujinRoom');returnTo('yujinRoom',830,345);
  doorway('warehouse-door',720,249,'warehouse','외곽의 빈 창고');returnTo('warehouse',735,260);
  doorway('home-road',82,343,'courtyard','레이무의 거처로');returnTo('courtyard',125,350);
  doorway('field-road',1367,218,'dungeonHub','마을 외곽 · 갈림길로');returnTo('dungeonHub',1348,244);returnTo('field',1348,244);
  const general=doorway('general-store',1122,419,null,'향림당');general.text='향림당 · '+general.text.replace(/^잡화점 · /,'');
  place('aki-minoriko',650,512);place('outsider-schoolgirl',460,645);place('outsider-youth',935,610);place('outsider-traveler',1205,475);place('village-aunt-ambient',740,475);place('village-youth-ambient',550,640);place('village-grandma-ambient',325,580);
  const minoriko=maps.village.residents.find(r=>r.id==='aki-minoriko'),minorikoInteraction=maps.village.interactions.find(o=>o.id==='aki-minoriko');Object.assign(minorikoInteraction,{x:minoriko.x,y:minoriko.y+18,visual:{x:minoriko.x,y:minoriko.y-48},rangeX:100,rangeY:80});
  const inspect={ 'village-board':[1130,300],'village-well':[1217,448]};for(const [id,xy]of Object.entries(inspect)){const o=maps.village.interactions.find(o=>o.id===id);if(o){const p=safe(...xy);Object.assign(o,{...point(p.x,p.y),visual:point(p.x,p.y-12)});}}
  const previousAvailable=interactionAvailable;
  interactionAvailable=function(p,o,id){if(id==='village'){const f={x:p.x/S,y:p.y/S};if(o.id==='terakoya-door')return VillageSchoolEntry.canInteract(f,terrain,12/S);if(o.id==='geidontei-door')return VillageGeidonteiEntry.canInteract(f,terrain,12/S);if(o.id==='general-store')return VillageKourindouEntry.canInteract(f,terrain,12/S);}return previousAvailable(p,o,id);};
  const previousScene=drawObliqueScene;drawObliqueScene=function(bg,m){if(mapId!=='village')return previousScene(bg,m);ctx.imageSmoothingEnabled=true;ctx.drawImage(bg,view.ox,view.oy,m.width*view.scale,m.height*view.scale);VillageWater.paint(ctx,view,S*view.scale,vw,vh);VillageMill.paint(ctx,view,S*view.scale,vw,vh);VillageSmoke.paint(ctx,view,S*view.scale,vw,vh);};
  const previousPerson=drawPerson;drawPerson=function(p,index,height,walk,kind='player'){if(p!==player||kind!=='player')return previousPerson(p,index,height,walk,kind);const q=projectPoint(p,view),h=height*(actorRenderScale(vw,vh,mapId,kind)??scale)*(mapId==='village'?.90:1);lastPlayerHeight=h;const draw=g=>ReimuVillagePlayer.paint(g,{x:q.x,y:q.y,height:h,shadowHeight:Math.max(2,4*view.scale)});if(mapId==='village')masked(p,ReimuVillagePlayer.bounds({x:q.x,y:q.y,height:h}),draw);else draw(ctx);};
  const previousResident=drawResident;drawResident=function(r){if(mapId!=='village')return previousResident(r);const q=projectPoint(r,view),h=100*(actorRenderScale(vw,vh,'village','npc')??scale);masked(r,{x:Math.floor(q.x-h*.65-4),y:Math.floor(q.y-h-8),width:Math.ceil(h*1.3+8),height:Math.ceil(h+18)},g=>{window.RemasterDrawContext=g;try{previousResident(r);}finally{window.RemasterDrawContext=null;}});};
  Object.assign(player,maps.village.spawn);camera.x=player.x;camera.y=player.y-65;transform();
  const panel=document.createElement('details');panel.id='connectedGuide';const summary=document.createElement('summary');summary.textContent='마을길 안내';panel.append(summary);const p=document.createElement('p');p.textContent='연결 시험 · 진행 기록은 이 창에서만 유지돼요.';panel.append(p);
  for(const d of doorLog){const b=document.createElement('button');b.textContent=d.label+' 앞';b.onclick=()=>{if(mapId!=='village'||residentDialogue.active||yujinDialogue.active||minorikoDialogue.active||minorikoShop.active||story.active||changing)return;visit(d.id);};panel.append(b);}const m=document.createElement('button');m.textContent='미노리코 앞';m.onclick=()=>{if(mapId==='village'&&!residentDialogue.active&&!yujinDialogue.active&&!minorikoDialogue.active&&!minorikoShop.active&&!story.active&&!changing)visit('aki-minoriko');};panel.append(m);document.body.append(panel);
  const previousUI=updateMapUI;updateMapUI=function(){previousUI();panel.hidden=mapId!=='village';};
 }
 async function prepare(){await Promise.all([ReimuSprites.load(),VillageOcclusion.prepare(),VillageWater.prepare(),VillageMill.prepare(),VillageSmoke.prepare(),VillageCat.prepare(terrain),VillageDog.prepare(terrain)]);prepared=true;}
 function update({dt,dx,dy,distance,blocked}){if(priorMap!==mapId){ReimuVillagePlayer.reset();const lookup=['down','right','up','left'];const direction=lookup[player.dir]||'down',vectors={down:[0,1],right:[1,0],up:[0,-1],left:[-1,0]};const v=vectors[direction];ReimuVillagePlayer.advance({dx:v[0],dy:v[1],distance:.002,dt:.01});ReimuVillagePlayer.advance({dx:0,dy:0,distance:0,dt:0});priorMap=mapId;}
  ReimuVillagePlayer.advance({dx,dy,distance:blocked?0:distance,dt,actor:1});
  if(prepared&&mapId==='village'&&!document.hidden){VillageWater.update(dt);VillageMill.update(dt);VillageSmoke.update(dt);VillageCat.update(dt);VillageDog.update(dt);}
 }
 function animals(){return [{id:'cat',kind:'remaster-animal',y:VillageCat.snapshot.y*S},{id:'dog',kind:'remaster-animal',y:VillageDog.snapshot.y*S}];}
 function paintAnimal(actor){if(actor.id==='cat')VillageCat.paint(ctx,options());else VillageDog.paint(ctx,options());}
 function visit(id){const o=maps.village.interactions.find(o=>o.id===id);if(!o)return false;const xs=[0,8,-8,16,-16,24,-24];let chosen=null;
  search:for(const dy of xs)for(const dx of xs){const p={x:o.x+dx,y:o.y+dy};if(valid(p.x,p.y,'village')&&interactionAvailable(p,o,'village')){chosen=p;break search;}}
  if(!chosen){for(let yy=-90;yy<=90&&!chosen;yy+=3)for(let xx=-90;xx<=90;xx+=3){const p={x:o.x+xx,y:o.y+yy};if(valid(p.x,p.y,'village')&&interactionAvailable(p,o,'village')){chosen=p;break;}}}
  if(!chosen)return false;route=[];keys.clear();intent=null;Object.assign(player,chosen);camera.x=player.x;camera.y=player.y-65;portalCooldown=0;transform();canvas.focus();return true;
 }
 return {install,prepare,update,animals,paintAnimal,visit,get snapshot(){return {installed,prepared,mapId,player:{x:player.x,y:player.y},reimu:ReimuVillagePlayer.snapshot,lastPlayerHeight,placements,doors:doorLog,objectCount:terrain.objects.length,cat:VillageCat.snapshot,dog:VillageDog.snapshot,water:VillageWater.snapshot,mill:VillageMill.snapshot,smoke:VillageSmoke.snapshot,activeMask,storage:ConnectedTestStorage.mode};}};
})();
