/* Stationary village NPC only. No tax, resource, story or save mutations. */
window.GensokyoJoon = (() => {
 'use strict';
 const paths=Object.freeze({normal:'npc/assets/joon-normal.png',smirk:'npc/assets/joon-smirk.png',displeased:'npc/assets/joon-displeased.png'});
 const lines=Object.freeze([
  {expression:'normal',text:'나는 요리가미 조온이야. 당분간 이 게시판 옆에 있을 테니, 용건이 있으면 말을 걸어.'},
  {expression:'smirk',text:'후후, 내 표정이 신경 쓰여? 지금은 얼굴만 익혀 두면 돼.'},
  {expression:'displeased',text:'흠…… 아직 안내할 내용은 준비 중이야. 준비가 끝나면 알려 줄게.'}
 ]);
 const definition={name:'요리가미 조온',role:'고블린왕의 징세관',location:'인간마을 · 게시판 옆',portrait:paths.normal,lines:lines.map(l=>l.text)};
 const actor={id:'yorigami-joon',name:definition.name,kind:'resident',...vp(1220,315),sprite:'joon',dir:0,phase:0};
 const mapImage=new Image();
 const state={mapReady:false,error:null};
 mapImage.onload=()=>{state.mapReady=true;};
 mapImage.onerror=()=>{state.error='조온 맵 이미지를 불러오지 못했습니다.';console.error(state.error);};
 mapImage.src='npc/assets/joon-map.png';
 // Preserve original PNGs, including alpha. Cache portraits before expression changes.
 const portraitCache=Object.values(paths).map(src=>{const img=new Image();img.src=src;return img;});
 maps.village.residents.push(actor);
 maps.village.interactions.push({id:actor.id,kind:'npc',x:actor.x,y:actor.y,
  visual:{x:actor.x,y:actor.y-60},rangeX:70,rangeY:54,hitX:32,hitY:52,label:definition.name});
 const isTalking=()=>residentDialogue.active&&residentDialogue.definition===definition;
 const priorDraw=drawResident;
 drawResident=function(r){
  if(r.id!==actor.id||mapId!=='village')return priorDraw(r);
  if(!state.mapReady)return;
  const p=projectPoint(r,view),v=actorRenderScale(vw,vh,mapId,'npc')??scale;
  // Visible hat top y=127; boot sole y=1149; foot contact x=727.
  // Full original canvas is drawn; transparent margins never become the footpoint.
  const s=74*v/(1149-127);
  ctx.save();ctx.imageSmoothingEnabled=false;
  ctx.fillStyle='#17251655';ctx.beginPath();ctx.ellipse(p.x,p.y,13*v,4*v,0,0,Math.PI*2);ctx.fill();
  ctx.drawImage(mapImage,p.x-727*s,p.y-1149*s,mapImage.width*s,mapImage.height*s);
  ctx.restore();
 };
 const priorRender=renderResidentDialogue;
 renderResidentDialogue=function(){
  if(!isTalking())return priorRender();
  const line=lines[residentDialogue.line],el=$('residentDialogue'),img=$('residentNpcPortrait');
  el.classList.add('joon-dialogue');el.classList.remove('school-conversation','school-dialogue-trial');
  el.dataset.expression=line.expression;
  if(img.getAttribute('src')!==paths[line.expression])img.src=paths[line.expression];
  img.alt='요리가미 조온 · '+({normal:'기본 미소',smirk:'얄미운 웃음',displeased:'못마땅함'}[line.expression]);
  $('residentName').textContent=definition.name;$('residentRole').textContent=definition.role;
  $('residentLocation').textContent=definition.location;$('residentLine').textContent=line.text;
  $('residentClose').hidden=false;$('residentNext').textContent=residentDialogue.line===lines.length-1?'대화 마치기':'다음';
 };
 function open(){
  if(mapId!=='village'||!state.mapReady||residentDialogue.active||inventoryView.open||farmUiActive||story.active||yujinDialogue.active||minorikoDialogue.active||minorikoShop.active||combat.battle||changing||!ready)return false;
  residentDialogue.active=true;residentDialogue.definition=definition;residentDialogue.mode='talk';
  residentDialogue.line=0;residentDialogue.readyAt=performance.now()+180;
  route=[];keys.clear();intent=null;clearStoryInput();hideHint();$('toast').hidden=true;$('interact').hidden=true;
  $('miyoiChoices').hidden=true;$('residentDialogue').querySelector('.yujin-controls').hidden=false;
  $('residentJunhaPortrait').src=$('junhaDialoguePortrait').src;
  $('residentDialogue').hidden=false;document.body.classList.add('resident-talking');
  renderResidentDialogue();$('residentNext').focus();return true;
 }
 const priorClose=closeResidentDialogue;
 closeResidentDialogue=function(){
  if(isTalking()){$('residentDialogue').classList.remove('joon-dialogue');delete $('residentDialogue').dataset.expression;}
  return priorClose();
 };
 // The close button originally captured an earlier function reference.
 $('residentClose').onclick=()=>closeResidentDialogue();
 const priorInteract=interact;
 interact=function(o){
  if(o?.id!==actor.id)return priorInteract(o);
  if(mapId==='village'&&portalCooldown<=0&&interactionAvailable(player,o,mapId))return open();
 };
 return Object.freeze({getState:()=>({position:{x:actor.x,y:actor.y},mapReady:state.mapReady,
  portraitsReady:portraitCache.every(i=>i.complete&&i.naturalWidth>0),talking:isTalking(),error:state.error})});
})();
