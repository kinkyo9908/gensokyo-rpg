/* School scene adapter and additive school-only learning progress. No rewards. */
window.GensokyoSchool = (() => {
 'use strict';
 const ID='terakoya', assets={}, imageSources={atlas:'school/assets/classroom-atlas.png',exterior:'school/assets/school-exterior.png',keine:'school/assets/keine_map.png',wallboard:'school/assets/blackboard-wall.png'};
 const xy=(u,v)=>({x:705+.697*u-.56*v,y:335+.268*u+.283*v});
 const footprint=(u,v,uw,vw)=>[[u-uw,v-vw],[u+uw,v-vw],[u+uw,v+vw],[u-uw,v+vw]].map(([u,v])=>{const p=xy(u,v);return[p.x,p.y]});
 const desks=[{id:'desk-nw',u:280,v:360,student:4},{id:'desk-ne',u:720,v:360,student:5},{id:'desk-sw',u:280,v:690,student:6},{id:'desk-se',u:720,v:690,student:7}];
 // Shared render-only seating calibration. Collision/world anchors are unchanged.
 const studyVisual=Object.freeze({deskWidth:154,deskOffsetY:12,studentHeight:140,seatOffsetU:0,seatOffsetV:-38});
 const props=[],state={installed:false,prepared:false,menu:false,returnFocus:null,experimentalDialogue:true};
 let menu,teacherDefinition;
 function loadImage(src){return new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(new Error('서당 자산을 읽을 수 없습니다: '+src));i.src=src;});}
 function alphaBounds(img,x=0,y=0,w=img.width,h=img.height){const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');g.drawImage(img,x,y,w,h,0,0,w,h);const d=g.getImageData(0,0,w,h).data;let l=w,t=h,r=-1,b=-1;for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++)if(d[(yy*w+xx)*4+3]>32){l=Math.min(l,xx);t=Math.min(t,yy);r=Math.max(r,xx);b=Math.max(b,yy);}return{img,sx:x+l,sy:y+t,sw:r-l+1,sh:b-t+1};}
 async function prepare(){if(state.prepared)return;const {SchoolLearningStore}=await import(new URL('school/learning-state.mjs',document.baseURI).href);state.learning=new SchoolLearningStore({initial:state.learningSlot.value,publish:value=>{state.learningSlot.value=value;},save:()=>{const bridge=window.GensokyoCloudBridge;if(bridge?.restoreLock||bridge?.externalChange)return false;return saveManager.save(combat);}});GensokyoLessonBook.setLearningStore(state.learning);GensokyoLessonBook.setReviewModule(await import(new URL('school/talisman-review.mjs',document.baseURI).href));[assets.atlas,assets.exterior,assets.wallboard]=await Promise.all([loadImage(imageSources.atlas),loadImage(imageSources.exterior),loadImage(imageSources.wallboard)]);assets.cells=[[39,199,333,269],[420,118,444,361],[928,2,291,479],[1280,30,479,469],[114,502,229,354],[546,507,216,349],[977,497,229,362],[1425,511,228,346]].map(([x,y,w,h])=>alphaBounds(assets.atlas,x,y,w,h));assets.building=alphaBounds(assets.exterior);assets.keine=alphaBounds(await loadImage(imageSources.keine));await Promise.all(['normal','smile'].map(expression=>loadImage('school/assets/keine_dialogue_'+expression+'.png')));await fetch('school/bookshelf-catalog.json').then(r=>{if(!r.ok)throw new Error('catalog');return r.json();}).then(data=>GensokyoLessonBook.setCatalog(data)).catch(()=>GensokyoLessonBook.setCatalog({volumes:[]},'책장 정보를 불러오지 못했어. 페이지를 새로고침해 줘.'));await fetch('school/volume1-words.json').then(r=>{if(!r.ok)throw new Error('words');return r.json();}).then(data=>GensokyoLessonBook.setVolume1(data)).catch(()=>GensokyoLessonBook.setVolume1(null,'제1권 자료를 불러오지 못했어. 페이지를 새로고침해 줘.'));const {readBattleCourse}=await import(new URL('school/course-sources.mjs',document.baseURI).href);for(const [number,source] of [[2,FOREST_WORD_CONFIG],[3,GRASS_WORD_CONFIG],[4,MOUNTAIN_WORD_CONFIG],[5,FOG_WORD_CONFIG]]){try{GensokyoLessonBook.setCourse(number,readBattleCourse(source,number));}catch{GensokyoLessonBook.setCourse(number,null,`제${number}권 전투 자료를 확인하지 못했어. 기존 기록은 유지했어.`);}}GensokyoLessonBook.setMistakeModule(await import(new URL('school/mistake-review.mjs',document.baseURI).href),{initial:state.mistakeSlot.value,publish:value=>{state.mistakeSlot.value=value;},save:()=>{const b=window.GensokyoCloudBridge;if(b?.restoreLock||b?.externalChange)return false;return saveManager.save(combat);}});try{GensokyoLessonBook.setSpeechModule(await import(new URL('school/pronunciation.mjs',document.baseURI).href));}catch{GensokyoLessonBook.setSpeechModule(null);}state.prepared=true;}
 function sprite(s,p,width,height){if(!s||!s.sw||!s.sh)return;const q=projectPoint(p,view),w=width*view.scale,h=(height??width*s.sh/s.sw)*view.scale;ctx.drawImage(s.img,s.sx,s.sy,s.sw,s.sh,q.x-w/2,q.y-h,w,h);}
 function addProp(id,cell,u,v,width,depthOffset=0){const p=xy(u,v),entry={id,cell,...p,width};props.push({y:p.y+depthOffset,schoolProp:entry});return entry;}
 function drawProp(p){if(p.id==='blackboard-wall'){drawWallBoard(p);return;}if(p.id==='teacher-platform'){drawPlatform();return;}const studyDesk=desks.some(d=>d.id===p.id);sprite(assets.cells?.[p.cell],studyDesk?{...p,y:p.y+studyVisual.deskOffsetY}:p,studyDesk?studyVisual.deskWidth:p.width);}
 // The wall contact anchor is in source PNG pixels, independent of floor footpoints.
 // Keep the full original canvas and a uniform scale; no skew, rotation or art edits.
 function drawWallBoard(p){const im=assets.wallboard;if(!im)return;const q=projectPoint({x:p.wallX,y:p.wallY},view),s=p.imageScale*view.scale,x=q.x-p.sourceX*s,y=q.y-p.sourceY*s,w=im.width*s,h=im.height*s;ctx.save();ctx.imageSmoothingEnabled=false;ctx.globalAlpha=.12;ctx.filter='brightness(0)';ctx.drawImage(im,x+1.5*view.scale,y+1.5*view.scale,w,h);ctx.filter='none';ctx.globalAlpha=1;ctx.drawImage(im,x,y,w,h);ctx.restore();}
 function drawPlatform(){const points=[[470,35],[870,35],[870,245],[470,245]].map(([u,v])=>xy(u,v));const g=ctx;g.save();g.beginPath();points.forEach((p,i)=>{const q=projectPoint(p,view);i?g.lineTo(q.x,q.y):g.moveTo(q.x,q.y)});g.closePath();g.fillStyle='#a9713d55';g.fill();g.strokeStyle='#d3a86e';g.lineWidth=2*view.scale;g.stroke();g.restore();}
 function setExpression(expression){const img=$('residentNpcPortrait'),src='school/assets/keine_dialogue_'+expression+'.png';if(img.getAttribute('src')!==src)img.src=src;img.alt='케이네 · '+(expression==='smile'?'웃는 표정':'기본 표정');}
 function applyDialogueLayout(){const el=$('residentDialogue');el.classList.toggle('school-dialogue-trial',state.experimentalDialogue&&isSchoolTalk());if(isSchoolTalk()&&state.experimentalDialogue){const h=el.querySelector('.yujin-vn-box').getBoundingClientRect().height;el.style.setProperty('--school-box-height',h+'px');}}
 function isSchoolTalk(){return residentDialogue.active&&residentDialogue.definition===teacherDefinition;}
 function showMenu(){setExpression('smile');state.menu=true;residentDialogue.mode='menu';$('residentLine').textContent='좋아, 어떤 수업부터 시작할까?';$('residentDialogue').querySelector('.yujin-controls').hidden=true;menu.hidden=false;applyDialogueLayout();menu.querySelector('button').focus();}
 function prepareMenu(){menu=document.createElement('div');menu.id='schoolLessonChoices';menu.className='minoriko-dialogue-choices school-lesson-choices';menu.hidden=true;const choices=[['new','새로운 학습'],['continue','이어 학습'],['review','부적 만들기'],['mistakes','오답 복습'],['close','대화 마치기']];for(const [id,name] of choices){const b=document.createElement('button');b.type='button';b.dataset.lesson=id;b.textContent=name;b.addEventListener('click',()=>{if(!isSchoolTalk())return;if(id==='close'){closeResidentDialogue();return;}if(id==='new'||id==='continue'||id==='review'||id==='mistakes'){GensokyoLessonBook[id==='mistakes'?'openMistakes':id==='review'?'openTalismans':id==='continue'?'openContinue':'openShelf'](()=>{if(isSchoolTalk()){$('residentDialogue').hidden=false;applyDialogueLayout();b.focus();}});return;}document.dispatchEvent(new CustomEvent('gensokyo-school-lesson-request',{detail:{lesson:id,implemented:false}}));$('residentLine').textContent=id==='review'?'부적 만들기는 준비 중이야. 다음 수업에서 함께 배워 보자.':'오답 복습은 준비 중이야. 오늘은 학습한 단어를 다시 살펴보렴.';});menu.append(b);}$('residentDialogue').querySelector('.yujin-vn-box').append(menu);}
 function openTeacher(){if(mapId!==ID||residentDialogue.active||inventoryView.open||farmUiActive||story.active||yujinDialogue.active||minorikoDialogue.active||minorikoShop.active||combat.battle||changing||!ready)return false;teacherDefinition.portrait='school/assets/keine_dialogue_normal.png';residentDialogue.active=true;residentDialogue.definition=teacherDefinition;residentDialogue.mode='talk';residentDialogue.line=0;residentDialogue.readyAt=performance.now()+180;clearStoryInput();hideHint();$('toast').hidden=true;$('interact').hidden=true;$('miyoiChoices').hidden=true;state.menu=false;menu.hidden=true;$('residentDialogue').querySelector('.yujin-controls').hidden=false;$('residentJunhaPortrait').src=$('junhaDialoguePortrait').src;$('residentNpcPortrait').src=teacherDefinition.portrait;$('residentDialogue').hidden=false;$('residentDialogue').classList.add('school-conversation');document.body.classList.add('resident-talking');applyDialogueLayout();renderResidentDialogue();$('residentNext').focus();return true;}
 function install(){window.addEventListener('resize',()=>{if(isSchoolTalk())applyDialogueLayout();});if(state.installed)return;state.installed=true;state.learningSlot={value:saveManager.read().schoolLearning};state.mistakeSlot={value:saveManager.read().schoolMistakes};const schoolSnapshot=saveManager.snapshot.bind(saveManager);saveManager.snapshot=function(c){const result=schoolSnapshot(c);if(state.learningSlot.value!==undefined)result.schoolLearning=structuredClone(state.learningSlot.value);if(state.mistakeSlot.value!==undefined)result.schoolMistakes=structuredClone(state.mistakeSlot.value);return result;};new ResizeObserver(()=>{if(isSchoolTalk())applyDialogueLayout();}).observe($('residentDialogue').querySelector('.yujin-vn-box'));
  const exit=xy(450,990),arrival=xy(450,850),talk=xy(690,270),teacher=xy(690,110);
  maps[ID]={title:'케이네의 서당',subtitle:'밝은 창가 · 인간마을의 작은 학당',asset:'school/assets/room-shell.png',width:1536,height:1024,spawn:{...arrival,dir:2},arrival:{...arrival,dir:2},walkArea:[xy(55,60),xy(955,60),xy(955,1028),xy(55,1028)].map(p=>[p.x,p.y]),obstacles:[...desks.flatMap(d=>[{id:d.id,poly:footprint(d.u,d.v,95,45)},{id:d.id+'-chair',poly:footprint(d.u,d.v+118,55,40)}]),{id:'teacher-desk',poly:footprint(500,165,132,70)},{id:'bookcase-left',poly:footprint(68,68,65,80)}],occluders:[{id:'school-front-left-rail',frontY:745,poly:[[42,532],[313,639],[318,757],[29,642]]},{id:'school-front-right-rail',frontY:965,poly:[[616,714],[846,808],[1472,543],[1491,651],[849,1000],[614,856]]}],residents:[{id:'school-keine',name:'ケイネ',kind:'resident',...teacher,sprite:'school-keine',dir:0,phase:0},...desks.map((d,i)=>({id:'school-student-'+(i+1),name:'마을 학생',kind:'resident',...xy(d.u,d.v+118),sprite:'school-student',cell:d.student,dir:2,phase:0}))],interactions:[{id:'school-exit',kind:'travel',...exit,visual:{...xy(450,1030)},rx:27,ry:17,rangeX:70,rangeY:52,label:'인간마을로 나가기',to:'village',arrival:{...vp(480,465),dir:0}},{id:'school-keine',kind:'npc',...talk,visual:{x:teacher.x,y:teacher.y-88},rangeX:94,rangeY:66,hitX:68,hitY:92,label:'케이네 선생님'}]};
  const door=maps.village.interactions.find(o=>o.id==='terakoya-door');Object.assign(door,{...vp(462,454),visual:vp(445,416),kind:'travel',label:'케이네의 서당',to:ID,arrival:{...maps[ID].arrival},rx:0,ry:0,rangeX:120,rangeY:95,hitX:55,hitY:62});
  const schoolOccluder=maps.village.occluders.find(o=>o.id==='terakoya');if(schoolOccluder){schoolOccluder.frontY=438*villageScale;schoolOccluder.poly=vpoly([[303,288],[320,244],[400,219],[515,251],[598,286],[610,315],[598,428],[542,438],[447,424],[308,368]]);}
  sceneZoom[ID]=1;teacherDefinition={name:'카미시라사와 케이네',role:'서당 선생님',location:'인간마을 · 케이네의 서당',portrait:'',lines:['어서 와. 오늘도 공부하러 온 거구나.','좋아, 어떤 수업부터 시작할까?']};prepareMenu();
  props.push({y:340,schoolProp:{id:'teacher-platform'}});props.push({y:Number.NEGATIVE_INFINITY,schoolProp:{id:'blackboard-wall',wallX:920,wallY:220,sourceX:280,sourceY:110,imageScale:.25}});addProp('teacher-desk',1,500,165,210,0);addProp('bookshelf-left',2,68,48,113,0);for(const d of desks)addProp(d.id,0,d.u,d.v,studyVisual.deskWidth,studyVisual.deskOffsetY);
  const priorValid=valid;valid=function(x,y,id='courtyard'){if(id!==ID)return priorValid(x,y,id);return [[0,0],[-9,0],[9,0],[0,-6],[0,6]].every(([dx,dy])=>pointValid(x+dx,y+dy,maps[ID]));};
  const priorCamera=cameraView;cameraView=function(w,h,z,c,id){if(id!==ID)return priorCamera(w,h,z,c,id);const s=Math.min(w/1610,Math.max(260,h-138)/1055)*z;return{scale:s,ox:(w-1536*s)/2,oy:(h-1024*s)/2+20,cx:768,cy:512,vw:w,vh:h};};
  const priorFollow=followCamera;followCamera=function(c,p,dt,w,h,z,id){if(id===ID){c.x=768;c.y=512;return;}return priorFollow(c,p,dt,w,h,z,id);};
  const priorHud=updatePlayerHUD;updatePlayerHUD=function(){priorHud();if(mapId===ID)$('playerHUD').hidden=false;};
  const priorUI=updateMapUI;updateMapUI=function(){priorUI();if(mapId===ID){document.body.classList.add('interior');$('hint').innerHTML='창가의 책상 사이로 천천히 걸어 봐. 뒤쪽 교탁 앞에서 케이네 선생님을 만날 수 있어.<span>방향키 / WASD / 바닥 클릭 · 이동　F · 대화·출입</span>';}groundKey='';};
  const priorResident=drawResident;drawResident=function(r){if(mapId!==ID)return priorResident(r);if(r.sprite==='school-keine'){const s=assets.keine;if(s)sprite(s,r,126*s.sw/s.sh,126);return;}if(r.sprite==='school-student'){const s=assets.cells?.[r.cell];if(s){const delta=xy(studyVisual.seatOffsetU,studyVisual.seatOffsetV),origin=xy(0,0);sprite(s,{...r,x:r.x+delta.x-origin.x,y:r.y+delta.y-origin.y},studyVisual.studentHeight*s.sw/s.sh,studyVisual.studentHeight);}return;}return priorResident(r);};
  const priorScene=drawObliqueScene;drawObliqueScene=function(bg,m){if(mapId===ID){const key=[mapId,vw,vh,view.scale].join(':');if(groundKey!==key){groundKey=key;groundSurface.width=vw;groundSurface.height=vh;groundContext.imageSmoothingEnabled=false;groundContext.fillStyle='#17161d';groundContext.fillRect(0,0,vw,vh);groundContext.drawImage(bg,view.ox,view.oy,m.width*view.scale,m.height*view.scale);}ctx.drawImage(groundSurface,0,0,vw,vh);return;}priorScene(bg,m);if(mapId==='village'&&assets.building){if(state.exteriorKey!==groundKey){drawExterior(groundContext);state.exteriorKey=groundKey;}ctx.drawImage(groundSurface,0,0,vw,vh);}};
  const priorInteract=interact;interact=function(o){if(o?.id==='school-keine'&&mapId===ID){if(portalCooldown===0&&interactionAvailable(player,o,ID))openTeacher();return;}return priorInteract(o);};
  const priorRender=renderResidentDialogue;renderResidentDialogue=function(){priorRender();if(!isSchoolTalk()){menu.hidden=true;$('residentDialogue').classList.remove('school-conversation','school-dialogue-trial');return;}setExpression(residentDialogue.line===0?'normal':'smile');if(state.menu){showMenu();return;}$('residentNext').textContent=residentDialogue.line===1?'수업 메뉴':'다음';};
  const priorAdvance=advanceResidentDialogue;advanceResidentDialogue=function(){if(!isSchoolTalk())return priorAdvance();if(performance.now()<residentDialogue.readyAt)return;residentDialogue.readyAt=performance.now()+160;if(state.menu)return;if(residentDialogue.line===1){showMenu();return;}residentDialogue.line++;renderResidentDialogue();};
  const priorClose=closeResidentDialogue;closeResidentDialogue=function(){GensokyoLessonBook.close(false);menu.hidden=true;state.menu=false;$('residentDialogue').classList.remove('school-conversation','school-dialogue-trial');return priorClose();};$('residentNext').onclick=()=>advanceResidentDialogue();$('residentClose').onclick=()=>closeResidentDialogue();
  const priorMenuKey=handleMiyoiMenuKey;handleMiyoiMenuKey=function(e){if(GensokyoLessonBook.active){GensokyoLessonBook.handleKey(e);return;}if(!isSchoolTalk())return priorMenuKey(e);e.preventDefault();e.stopImmediatePropagation();const k=e.key.toLowerCase(),buttons=[...menu.querySelectorAll('button')];if(k==='tab'){let i=buttons.indexOf(document.activeElement);buttons[(i+(e.shiftKey?-1:1)+buttons.length)%buttons.length].focus();return;}if(e.repeat||e.isComposing)return;if(k==='escape')closeResidentDialogue();else if(['enter','f',' '].includes(k))(menu.contains(document.activeElement)?document.activeElement:buttons[0]).click();};
 }
 function drawExterior(g=ctx){// New sprite occupies the existing school lot. Other village artwork is unchanged.
  const s=assets.building,p=vp(455,438),point=projectPoint(p,view),w=310*villageScale*view.scale,h=w*s.sh/s.sw;
  g.save();g.imageSmoothingEnabled=false;g.drawImage(s.img,s.sx,s.sy,s.sw,s.sh,point.x-w/2,point.y-h,w,h);g.restore();
 }
 function drawMarkers(){if(mapId!==ID||residentDialogue.active||inventoryView.open)return;for(const o of maps[ID].interactions)if(!interactionAvailable(player,o,ID))drawInteractionDiamond(projectPoint(o.visual??o,view));}
 return {setDialogueLayout:layout=>{state.experimentalDialogue=layout!=='legacy';applyDialogueLayout();},install,prepare,layers:id=>id===ID?props:[],drawProp,drawMarkers,xy,desks,openTeacher,getState:()=>({installed:state.installed,prepared:state.prepared,menu:state.menu,mapId}),mapId:ID};
})();

/* School courses: read-only battle vocabulary, isolated school progress, no rewards. */
window.GensokyoLessonBook = (() => {
 'use strict';
 const demoWords=Object.freeze([
  Object.freeze({spelling:'学校',reading:'がっこう',meaning:'학교',romaji:'gakkou',acceptedRomaji:Object.freeze(['gakkou','gakkō']),explanation:'배우고 공부하는 곳을 가리키는 말이야. 작은 っ은 다음 소리를 잠깐 막아 발음해 보렴.',example:'学校に行きます。',translation:'학교에 갑니다.'}),
  Object.freeze({spelling:'先生',reading:'せんせい',meaning:'선생님',romaji:'sensei',acceptedRomaji:Object.freeze(['sensei']),explanation:'누군가를 가르치는 선생님을 부르는 말이야. 두 한자를 하나의 단어로 함께 익혀 보자.',example:'先生に聞きます。',translation:'선생님께 묻습니다.'}),
  Object.freeze({spelling:'本',reading:'ほん',meaning:'책',romaji:'hon',acceptedRomaji:Object.freeze(['hon']),explanation:'읽는 책을 뜻해. 한 글자짜리 단어도 읽기와 뜻을 함께 기억해 두렴.',example:'本を読みます。',translation:'책을 읽습니다.'})
 ]);
 let words=demoWords,lessonKind='demo',activeCourse=null,reviewMode=false,learningStore=null,pendingGrade=null,renderEpoch=0,shelfNotice='';
 // Kana-derived Hepburn spellings. Battle aliases never enter this allowlist.
 const kanaRows=[['あいうえお',['a','i','u','e','o']],['かきくけこ',['ka','ki','ku','ke','ko']],['さしすせそ',['sa','shi','su','se','so']],['たちつてと',['ta','chi','tsu','te','to']],['なにぬねの',['na','ni','nu','ne','no']],['はひふへほ',['ha','hi','fu','he','ho']],['まみむめも',['ma','mi','mu','me','mo']],['やゆよ',['ya','yu','yo']],['らりるれろ',['ra','ri','ru','re','ro']],['わを',['wa','o']],['がぎぐげご',['ga','gi','gu','ge','go']],['ざじずぜぞ',['za','ji','zu','ze','zo']],['だぢづでど',['da','ji','zu','de','do']],['ばびぶべぼ',['ba','bi','bu','be','bo']],['ぱぴぷぺぽ',['pa','pi','pu','pe','po']]];
 const kanaMap=Object.fromEntries(kanaRows.flatMap(([kana,values])=>[...kana].map((c,i)=>[c,values[i]])));
 const digraphMap=Object.fromEntries([['き','ky'],['ぎ','gy'],['し','sh'],['じ','j'],['ち','ch'],['ぢ','j'],['に','ny'],['ひ','hy'],['び','by'],['ぴ','py'],['み','my'],['り','ry']].flatMap(([kana,roman])=>[['ゃ','a'],['ゅ','u'],['ょ','o']].map(([small,vowel])=>[kana+small,roman+vowel])));
 Object.assign(digraphMap,{'てぃ':'ti','ふぃ':'fi','ふぉ':'fo'});
 function strictRomaji(reading){
  const kana=String(reading).normalize('NFKC').replace(/[ァ-ヶ]/gu,c=>String.fromCharCode(c.charCodeAt(0)-96));
  const tokenAt=i=>digraphMap[kana.slice(i,i+2)]?{text:digraphMap[kana.slice(i,i+2)],size:2}:kanaMap[kana[i]]?{text:kanaMap[kana[i]],size:1}:null;
  let roman='';for(let i=0;i<kana.length;){
   const c=kana[i];if(c==='ん'){roman+=/^[あいうえおやゆよ]/u.test(kana.slice(i+1))?"n'":'n';i++;continue;}
   if(c==='っ'){const next=tokenAt(i+1);if(!next||!/^[bcdfghjklmpqrstvwxyz]/.test(next.text))throw new Error('小さいっの位置を確認してください');roman+=next.text.startsWith('ch')?'t':next.text[0];i++;continue;}
   if(c==='ー'){const vowel=roman.match(/[aeiou]$/)?.[0];if(!vowel)throw new Error('長音の位置を確認してください');roman+=vowel;i++;continue;}
   const token=tokenAt(i);if(!token)throw new Error('未対応の読み: '+reading);roman+=token.text;i+=token.size;
  }
  // ei is deliberately preserved (sensei); macrons never discard vowel length.
  const macron=roman.replace(/aa|ii|uu|ee|oo|ou/g,p=>({aa:'ā',ii:'ī',uu:'ū',ee:'ē',oo:'ō',ou:'ō'})[p]);
  return Object.freeze({display:roman,accepted:Object.freeze([...new Set([roman,macron])])});
 }
 let reviewModule=null,talismanReview=null;
 const courses=new Map(),courseErrors=new Map(),courseTotals=Object.freeze({1:101,2:105,3:82,4:82,5:80});
 function setCourse(number,data,error=''){
  try{
   if(!Object.hasOwn(courseTotals,number)||!data||data.sourceTotal!==courseTotals[number]||data.enabledCount!==data.sourceTotal||!Array.isArray(data.entries)||data.entries.length!==data.sourceTotal)throw new Error('範囲');
   const ids=new Set(),loaded=data.entries.map((e,i)=>{
    if(e.sourceOrdinal!==i+1||typeof e.spelling!=='string'||!e.spelling||!Array.isArray(e.readings)||!e.readings.length||!e.readings.every(r=>typeof r==='string'&&r)||!Array.isArray(e.meanings)||!e.meanings.length||!e.meanings.every(m=>typeof m==='string'&&m))throw new Error('項目');
    if(number>1&&(typeof e.id!=='string'||!e.id||ids.has(e.id)))throw new Error('識別子');ids.add(e.id);
    if(e.sourceMeanings!==undefined&&(!Array.isArray(e.sourceMeanings)||!e.sourceMeanings.length||!e.sourceMeanings.every(m=>typeof m==='string'&&m)))throw new Error('原義');
    const readings=Object.freeze([...e.readings]),meanings=Object.freeze([...e.meanings]),sourceMeanings=e.sourceMeanings?Object.freeze([...e.sourceMeanings]):null,derived=readings.map(strictRomaji);
    return Object.freeze({id:e.id??null,sourceOrdinal:e.sourceOrdinal,spelling:e.spelling,readings,meanings,sourceMeanings,reading:readings.join(' / '),meaning:(sourceMeanings??meanings).join(', '),romaji:derived.map(r=>r.display).join(' / '),acceptedRomaji:Object.freeze([...new Set(derived.flatMap(r=>r.accepted))]),explanation:typeof e.explanation==='string'?e.explanation:null,example:typeof e.example==='string'?e.example:null,translation:typeof e.translation==='string'?e.translation:null});
   });courses.set(number,Object.freeze({id:'volume-'+number,title:`제${number}권`,total:loaded.length,words:Object.freeze(loaded)}));courseErrors.delete(number);
  }catch{courses.delete(number);courseErrors.set(number,error||`제${number}권 학습 자료를 확인하지 못했어. 기존 진도는 유지했어.`);}
 }
 function setVolume1(data,error=''){setCourse(1,data,error);}
 function startCourse(course,review=false,position=null){if(!course||!learningStore?.available)return;const record=learningStore.read(course.id);if(record&&record.total!==course.total){shelfNotice='교본 구성이 저장 기록과 달라. 기존 진도를 유지했어.';renderShelf();return;}activeCourse=course;words=course.words;lessonKind='course';reviewMode=review;pendingGrade=null;viewMode='lesson';index=review?Math.min(Math.max(0,(position??1)-1),Math.max(0,(record?.lastGradedIndex??1)-1)):(record?.lastGradedIndex??0);if(index>=words.length){showShelf();return;}step='learn';render();}
 function startVolume1(){startCourse(courses.get(1));}
 function startReview(position=1){const course=activeCourse??courses.get(selectedNumber);if(learningStore?.read(course?.id)?.lastGradedIndex)startCourse(course,true,position);}
 function setLearningStore(store){learningStore=store;progressReader=number=>{const b=store.read('volume-'+number);return b?{status:b.completed?'completed':b.lastGradedIndex?'in_progress':'unlearned'}:null;};}
 function persistGrade(answer,result){const outcome=learningStore.commit(activeCourse.id,activeCourse.total,index+1,{readingCorrect:needsReading(words[index])?result.reading:null,meaningCorrect:result.meaning});pendingGrade=outcome.ok?null:{answer,result,error:outcome.error};step=outcome.ok&&!outcome.duplicate?(outcome.completed?'complete':outcome.milestone?'milestone':'grade'):'grade';render(answer,result);}
 function nextLesson(){if(pendingGrade)return;if(reviewMode){const limit=learningStore.read(activeCourse.id)?.lastGradedIndex??0;if(index+1>=limit){step='done';render();return;}}if(index+1<words.length){index++;step='learn';}else step='done';render();}
 function startDemo(){words=demoWords;lessonKind='demo';reviewMode=false;activeCourse=null;pendingGrade=null;viewMode='lesson';index=0;step='learn';render();}
 const needsReading=word=>/[\u3400-\u4dbf\u4e00-\u9fff々]/u.test(word.spelling);
 const normalize=value=>String(value??'').normalize('NFKC').replace(/\s+/gu,'').trim();
 // Preserve the existing hiragana/meaning comparison. Romanization is an explicit
 // allowlist: keep macrons and internal characters; never guess missing sounds.
 const normalizeRomaji=value=>String(value??'').normalize('NFKC').trim().toLowerCase();
 const grade=(word,answer)=>({reading:!needsReading(word)||(word.readings??[word.reading]).some(reading=>normalize(answer.reading)===normalize(reading))||(word.acceptedRomaji??[]).some(allowed=>normalizeRomaji(answer.reading)===normalizeRomaji(allowed)),meaning:(word.meanings??[word.meaning]).some(meaning=>normalize(answer.meaning)===normalize(meaning))});
 let root,index=0,step='learn',returnToMenu=null,composing=false,imeReadyAt=0,viewMode='lesson',catalog=[],catalogError='',shelfPage=0,selectedNumber=null;
 let progressReader=()=>null;
 const pageSize=10,statusLabels=Object.freeze({unlearned:'미학습',in_progress:'진행 중',completed:'학습 완료'});
 function el(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;}
 function button(text,action,primary=false){const b=el('button','lesson-button'+(primary?' lesson-primary':''),text),epoch=renderEpoch;b.type='button';b.addEventListener('click',()=>{if(epoch===renderEpoch)action();});return b;}

 // Pronunciation is an independent presentation-only service. It never enters
 // quiz DOM, battle frames, grade handlers or either save namespace.
 let speechModule=null,schoolSpeech=null;
 const speechSubscriptions=[];
 function setSpeechModule(module){speechModule=module;schoolSpeech?.destroy();schoolSpeech=module?new module.SchoolPronunciation(window):null;}
 function resetSpeechPage(){schoolSpeech?.stop();for(const unsubscribe of speechSubscriptions.splice(0))unsubscribe();}
 function speechPageAllowed(){
  if(!root||root.hidden||!root.isConnected||document.hidden||typeof mapId==='undefined'||mapId!=='terakoya')return false;
  if(viewMode==='lesson')return step==='learn'||['grade','milestone','complete'].includes(step);
  if(viewMode==='talismans')return !!talismanReview?.current&&!!talismanReview.outcome;
  if(viewMode==='mistakes')return !!mistakeSession?.current&&['correct','revealed'].includes(mistakeSession.outcome);
  return false;
 }
 function appendPronunciation(parent,word){
  const epoch=renderEpoch,group=el('div','school-pronunciation'),actions=el('div','school-pronunciation-actions'),status=el('span','school-pronunciation-status');
  group.dataset.schoolPronunciation='';status.setAttribute('role','status');status.setAttribute('aria-live','polite');group.append(actions,status);
  const registered=speechModule?.registeredReadings(word)??{readings:[],error:'발음 기능을 불러오지 못했어. 다시 접속해 줘.'};
  const allowed=()=>epoch===renderEpoch&&speechPageAllowed();
  const report=message=>{if(allowed())status.textContent=message;};
  if(registered.error){const unavailable=button('🔊 발음 듣기',()=>{});unavailable.disabled=true;actions.append(unavailable);status.textContent=registered.error;}
  else{
   const controls=registered.readings.map(reading=>{const b=button(registered.readings.length===1?'🔊 발음 듣기':'🔊 '+reading,()=>{if(composing||performance.now()<imeReadyAt||!allowed())return;schoolSpeech?.speak(reading,{allowed,report});});b.classList.add('school-pronunciation-button');b.setAttribute('aria-label',reading+' 발음 듣기');b.title=reading+' · 일본어 발음';b.dataset.speechReading=reading;actions.append(b);return b;});
   const refresh=()=>{const availability=schoolSpeech?.availability();for(const b of controls)b.disabled=!availability||availability.unsupported===true;if(!schoolSpeech?.current)status.textContent=availability?.message??'발음 기능을 불러오지 못했어. 다시 접속해 줘.';};
   refresh();if(schoolSpeech)speechSubscriptions.push(schoolSpeech.subscribe(refresh));
  }
  parent.append(group);
 }

 function panel(parent,label){const p=el('section','lesson-page');p.append(el('p','lesson-kicker',label));parent.append(p);return p;}
 function focusStart(){root.querySelector('[data-focus]')?.focus({preventScroll:true});}
 function render(answer,result){
  resetSpeechPage();renderEpoch++;const w=words[index];root.replaceChildren();
  const book=el('div','lesson-book'),header=el('header','lesson-header'),heading=el('div');
  heading.append(el('small','lesson-series',lessonKind==='course'?`케이네의 서당 · ${activeCourse.title} · ${reviewMode?'학습한 단어 다시 보기':'이어지는 학습'}`:`케이네의 서당 · ${selectedNumber?'제'+selectedNumber+'권 · ':''}세 단어 UI 테스트`),el('h1',null,'환상향 단어장'));
  heading.lastChild.id='lessonBookTitle';header.append(heading,button('책장으로',()=>showShelf()));
  const ribbon=el('span','lesson-bookmark');ribbon.setAttribute('aria-hidden','true');book.append(ribbon,header);
  const progress=el('nav','lesson-progress');progress.setAttribute('aria-label','수업 단계');
  ['학습','문제풀이','채점'].forEach((name,i)=>{const n=el('span',(i===2&&['grade','milestone','complete'].includes(step))||step===['learn','quiz','grade'][i]?'is-current':'',`${i+1} ${name}`);if(n.className)n.setAttribute('aria-current','step');progress.append(n);});book.append(progress);
  const spread=el('div','lesson-spread'),left=panel(spread,step==='learn'?'왼쪽 페이지 · 단어 익히기':'왼쪽 페이지 · 복습 안내'),right=panel(spread,'오른쪽 페이지 · '+({learn:'선생님의 안내',quiz:'스스로 풀어보기',grade:'답 확인하기',milestone:'채점 · 잠깐 쉬어가기',complete:'채점 · 완독 안내',done:'수업 마무리'}[step]));book.append(spread);
  if(step==='learn'){
   left.append(el('h2','lesson-word',w.spelling));left.lastChild.lang='ja';
   if(needsReading(w)){const r=el('p','lesson-reading',w.reading);r.lang='ja';left.append(r);}
   left.append(el('p','lesson-meaning',w.meaning));appendPronunciation(left,w);if(w.explanation)left.append(el('p','lesson-copy',w.explanation));
   if(w.example){const example=el('div','lesson-note');example.append(el('small',null,'짧은 예문'),el('p','lesson-example',w.example));example.children[1].lang='ja';if(w.translation)example.append(el('p',null,w.translation));left.append(example);}
   if(!w.explanation&&!w.example)left.append(el('p','lesson-missing','설명·예문 미등록'));
   right.append(el('h2',null,'천천히, 함께 익혀 보자.'),el('p','lesson-copy','표기와 읽기, 뜻을 차례로 살펴보렴. 준비가 되면 책의 내용을 가리고 직접 답해 보는 거야.'),el('div','lesson-teacher','케이네 선생님\n“서두르지 않아도 좋아. 기억이 흐릿하면 언제든 다시 읽어 보렴.”'),el('p','lesson-copy','문제 풀기를 누르면 읽기와 뜻, 예문은 모두 숨겨져. 제한시간은 없단다.'));
   const b=button('문제 풀기',()=>{step='quiz';render();},true);b.dataset.focus='';right.append(b);
  }else if(step==='quiz'){
   left.append(el('h2',null,'방금 배운 말을 떠올려 보렴.'),el('p','lesson-copy','학습 내용은 잠시 덮어 두었어. 오른쪽의 일본어 단어를 보고 스스로 답해 보자.'),el('div','lesson-teacher','시간제한은 없어.\n모르겠다면 “다시 학습”을 눌러도 괜찮아.'));
   right.append(el('h2','lesson-question',w.spelling));right.lastChild.lang='ja';
   right.append(el('p','lesson-copy',needsReading(w)?'읽기는 히라가나 또는 허용된 로마자로, 뜻은 한국어로 입력해 줘.':'한국어 뜻을 입력해 줘.'));
   const form=el('form','lesson-form');form.autocomplete='off';
   const field=(name,label,lang)=>{const l=el('label',null,label),input=el('input');input.name=name;input.lang=lang;input.required=true;input.autocomplete='off';input.spellcheck=false;input.maxLength=80;l.append(input);form.append(l);return input;};
   if(needsReading(w))field('reading','읽기 · 히라가나 / 로마자','ja');field('meaning','한국어 뜻','ko');form.querySelector('input').dataset.focus='';
   const error=el('p','lesson-validation');error.setAttribute('role','status');form.append(error);
   const actions=el('div','lesson-actions'),submit=el('button','lesson-button lesson-primary','정답 확인');submit.type='submit';actions.append(submit,button('다시 학습',()=>{step='learn';render();}));form.append(actions);
   form.addEventListener('submit',e=>{e.preventDefault();if(step!=='quiz'||composing||performance.now()<imeReadyAt)return;const a=Object.fromEntries(new FormData(form));if(!normalize(a.meaning)||(needsReading(w)&&!normalize(a.reading))){error.textContent='필요한 답안을 모두 입력해 줘.';return;}const r=grade(w,a);if(lessonKind==='course'&&!reviewMode)persistGrade(a,r);else{step='grade';render(a,r);}});right.append(form);
  }else if(['grade','milestone','complete'].includes(step)){
   const correct=result.reading&&result.meaning;
   left.append(el('h2',null,correct?'잘 기억하고 있구나!':'괜찮아, 다시 익혀 보자.'),el('p','lesson-copy',correct?'표기와 읽기, 뜻을 연결해서 기억했네. 다음 단어도 천천히 살펴보렴.':'아래의 올바른 답과 네 답을 비교해 보렴. 다시 학습해서 확인한 뒤 넘어가도 좋아.'));
   const reference=el('dl','lesson-reference');reference.setAttribute('aria-label','올바른 단어 정보');
   for(const [label,value,lang] of [['일본어 표기',w.spelling,'ja'],['히라가나 읽기',w.reading,'ja'],['로마자 읽기',w.romaji,'en'],['한국어 뜻',w.meaning,'ko']]){const dd=el('dd',null,value);dd.lang=lang;reference.append(el('dt',null,label),dd);}left.append(reference);appendPronunciation(left,w);
   if(w.sourceMeanings&&w.meanings.some(m=>!w.sourceMeanings.includes(m)))left.append(el('p','lesson-allowed','추가 허용 뜻: '+w.meanings.filter(m=>!w.sourceMeanings.includes(m)).join(' / ')));
   if(w.acceptedRomaji?.length>1)left.append(el('p','lesson-allowed','허용 로마자: '+w.acceptedRomaji.join(' / ')));
   const status=el('h2',correct?'lesson-success':'lesson-retry',correct?'정답이야!':'다시 확인해 보자');status.setAttribute('role','status');right.append(status,el('p','lesson-copy','네가 입력한 답을 읽기와 뜻으로 나누어 확인해 보렴.'));
   const answers=el('dl','lesson-answers');
   if(!needsReading(w))answers.append(el('dt',null,'읽기 · 입력 대상 아님'),el('dd','lesson-given','가나 단어는 한국어 뜻만 확인해.'));
   for(const [key,label] of [...(needsReading(w)?[['reading','읽기']]:[]),['meaning','뜻']]){const dt=el('dt',result[key]?'lesson-field-correct':'lesson-field-wrong',`${label} · ${result[key]?'정답':'오답'}`);dt.dataset.result=result[key]?'correct':'incorrect';const given=el('dd','lesson-given','입력한 답: '+answer[key]);given.dataset.answer=key;answers.append(dt,given);}right.append(answers);
   const actions=el('div','lesson-actions');
   if(pendingGrade){const warning=el('p','lesson-save-error',pendingGrade.error);warning.setAttribute('role','alert');right.append(warning);const retry=button('진도 저장 다시 시도',()=>persistGrade(pendingGrade.answer,pendingGrade.result),true);retry.dataset.focus='';actions.append(retry);}
   else if(step==='milestone'){right.prepend(el('h2','lesson-milestone-title',`${index+1}개 단어 학습 완료!`),el('p','lesson-copy','케이네: “벌써 이만큼 공부했구나. 잘했어. 조금 쉬었다가 계속해도 괜찮단다.”'));const next=button('계속 학습',nextLesson,true);next.dataset.focus='';actions.append(next,button('오늘은 여기까지',()=>showShelf()));}
   else if(step==='complete'){right.prepend(el('h2','lesson-milestone-title',`환상향 단어장 ${activeCourse.title} 학습 완료!`),el('p','lesson-copy','케이네: “끝까지 공부했구나. 수고했어. 배운 단어들은 언제든 다시 펼쳐 보렴.”'));const back=button('책장으로 돌아가기',()=>showShelf(),true);back.dataset.focus='';actions.append(back,button('학습한 단어 다시 보기',()=>startReview()));}
   else{const next=button(reviewMode&&index+1>=(learningStore.read(activeCourse.id)?.lastGradedIndex??0)?'열람 마치기':index===words.length-1?'수업 마치기':'다음 단어',nextLesson,true);next.dataset.focus='';actions.append(next,button('다시 학습',()=>{step='learn';render();}));}right.append(actions);
  }else{
   left.append(el('h2',null,'첫 수업을 마쳤어.'),el('p','lesson-copy',lessonKind==='course'?reviewMode?'학습한 단어를 다시 살펴보았구나. 기존 진도와 최초 채점 기록은 그대로야.':`${activeCourse.title}을 끝까지 살펴보았구나.`:'테스트 단어 세 개를 모두 살펴보았구나. 오늘은 책을 펼치고, 기억하고, 확인하는 연습을 했어.'));
   right.append(el('h2',null,'다시 만나자, 서당에서.'),el('p','lesson-copy',lessonKind==='course'?'서당 진도는 전투 기록과 별도로 보관해. 학습 완료는 모두 채점했다는 뜻이며, 모두 정답이었다는 뜻은 아니야.':'이 테스트의 답안과 진행은 저장하지 않아.'));
   const b=button('처음부터 다시 학습',()=>{index=0;step='learn';render();},true);b.dataset.focus='';right.append(b,button('책장으로',()=>showShelf()));
  }
  const foot=el('footer','lesson-footer');foot.append(el('span',null,lessonKind==='course'?`${activeCourse.title} · ${index+1} / ${words.length} · ${reviewMode?'다시 보기 · 기존 진도 유지':'채점 완료 시 진도 저장'}`:`공통 UI 테스트 · ${index+1} / ${words.length} · 실제 단어장 연결 전`),el('span',null,'시간제한 없음 · Esc 책장'));book.append(foot);if(lessonKind==='course'&&reviewMode){const history=learningStore.read(activeCourse.id),nav=el('form','shelf-jump lesson-review-nav'),label=el('label',null,`학습한 위치 보기 · 1~${history.lastGradedIndex}`),input=el('input');input.name='reviewPosition';input.inputMode='numeric';input.type='text';input.value=String(index+1);label.append(input);const go=el('button','lesson-button','열람');go.type='submit';const error=el('p','shelf-error');error.setAttribute('role','status');nav.append(label,go,error);nav.addEventListener('submit',e=>{e.preventDefault();if(composing||performance.now()<imeReadyAt)return;const n=/^[0-9]+$/.test(input.value.trim())?Number(input.value):NaN;if(!Number.isInteger(n)||n<1||n>history.lastGradedIndex){error.textContent='이미 채점한 위치 안에서 골라 줘.';return;}startReview(n);});book.append(nav);}root.append(book);root.scrollTop=0;composing=false;focusStart();
 }
 function enter(callback,mode){if(root&&!root.hidden)return false;returnToMenu=callback;index=0;step='learn';viewMode=mode;composing=false;imeReadyAt=0;if(!root){root=el('div','school-book-overlay');root.id='schoolLessonBook';root.hidden=true;root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-labelledby','lessonBookTitle');root.addEventListener('compositionstart',()=>{composing=true;});root.addEventListener('compositionend',()=>{composing=false;imeReadyAt=performance.now()+220;});document.body.append(root);}root.classList.toggle('talisman-overlay',mode==='talismans');clearStoryInput();document.getElementById('residentDialogue').hidden=true;document.body.classList.add('school-book-open');root.hidden=false;return true;}
 function open(callback){if(enter(callback,'lesson')){words=demoWords;lessonKind='demo';reviewMode=false;activeCourse=null;pendingGrade=null;render();}}
 function openShelf(callback){if(enter(callback,'shelf')){shelfNotice='';renderShelf();}}
 function openContinue(callback){if(!enter(callback,'shelf'))return;const id=learningStore?.lastBookId,record=id&&learningStore.read(id),number=id?Number(id.slice(7)):null,course=courses.get(number);if(course&&record){selectedNumber=number;shelfPage=Math.floor(Math.max(0,catalog.findIndex(v=>v.number===number))/pageSize);if(!record.completed){startCourse(course);return;}}shelfNotice=record?.completed?'마지막 교본의 학습을 마쳤어. 학습한 단어를 다시 볼 수 있어.':record?'마지막 교본의 자료를 확인할 수 없어. 기존 진도는 유지했어.':'아직 이어 학습할 채점 기록이 없어. 교본을 골라 시작해 보렴.';renderShelf();}

 // Metadata only. No stage word pools, save manager or completion inference here.
 // Add catalog entries to display future volumes automatically; only ten are rendered.
 function setCatalog(data,error=''){
  const seen=new Set();catalog=(Array.isArray(data?.volumes)?data.volumes:[]).filter(v=>Number.isSafeInteger(v.number)&&v.number>0&&Number.isSafeInteger(v.wordCount)&&v.wordCount>=0&&!seen.has(v.number)&&seen.add(v.number)).map(v=>Object.freeze({number:v.number,wordCount:v.wordCount,stageId:String(v.stageId??'')})).sort((a,b)=>a.number-b.number);
  catalogError=error;const selected=catalog.findIndex(v=>v.number===selectedNumber);if(selected<0){selectedNumber=catalog[0]?.number??null;shelfPage=0;}else shelfPage=Math.floor(selected/pageSize);if(root&&!root.hidden&&viewMode==='shelf')renderShelf();
 }
 function progressFor(volume){
  // Future read-only adapter. Absent/invalid records never imply completion.
  let record=null;try{record=progressReader(volume.number);}catch{}
  const status=record&&Object.hasOwn(statusLabels,record.status)?record.status:'unlearned';
  return{status,label:statusLabels[status],hasRecord:!!record&&Object.hasOwn(statusLabels,record.status)};
 }
 function showShelf(){pendingGrade=null;viewMode='shelf';composing=false;imeReadyAt=0;renderShelf();}
 // Display-only image mapping. Add an approved volume image here for future books.
 const scrollShelfArt=Object.freeze({base:'school/assets/scroll-shelf/',volumes:Object.freeze({1:'volume-1',2:'volume-2',3:'volume-3',4:'volume-4',5:'volume-5'})});
 function scrollShelfImage(name,className){const im=el('img',className);im.src=scrollShelfArt.base+name+'.png';im.alt='';im.draggable=false;im.setAttribute('aria-hidden','true');return im;}
 function renderShelf(focusNumber=null,keepScroll=false){
  resetSpeechPage();renderEpoch++;const scroll=keepScroll?root.scrollTop:0;root.replaceChildren();
  const book=el('div','lesson-book school-shelf scroll-shelf'),header=el('header','lesson-header'),heading=el('div');heading.append(el('small','lesson-series','케이네의 서당 · 교본 책장'),el('h1',null,'환상향 단어장'));heading.lastChild.id='lessonBookTitle';header.append(heading,button('수업 메뉴로',()=>close()));book.append(el('span','lesson-bookmark'),header);
  const content=el('div','shelf-paper');book.append(content);if(shelfNotice)content.append(el('p','lesson-copy',shelfNotice));
  const title=el('div','shelf-titleline');title.append(el('h2',null,'어느 교본을 펼쳐 볼까?'),el('span',null,`현재 등록 ${catalog.length}권`));content.append(title);
  content.append(el('p','shelf-caption','한 책장에 열 권씩. 교본을 고르면 아래에서 내용을 살펴볼 수 있어.'));
  const pages=Math.max(1,Math.ceil(catalog.length/pageSize));shelfPage=Math.min(shelfPage,pages-1);
  const nav=el('div','shelf-nav');const prev=button('← 이전 책장',()=>{shelfPage--;selectedNumber=catalog[shelfPage*pageSize]?.number??null;renderShelf(selectedNumber);});prev.disabled=shelfPage===0;prev.dataset.shelfNav='previous';prev.classList.add('scroll-page-button');
  const next=button('다음 책장 →',()=>{shelfPage++;selectedNumber=catalog[shelfPage*pageSize]?.number??null;renderShelf(selectedNumber);});next.disabled=shelfPage>=pages-1;next.dataset.shelfNav='next';next.classList.add('scroll-page-button');nav.append(prev,el('span','shelf-page-count',`${shelfPage+1} / ${pages} 책장`),next);content.append(nav);
  const rackViewport=el('div','scroll-rack-viewport'),rack=el('div','shelf-rack');rack.setAttribute('aria-label','교본 목록');rack.append(scrollShelfImage('cabinet','scroll-cabinet'));const plaque=el('div','scroll-plaque');plaque.append(heading.lastChild);rack.append(plaque);
  const visible=catalog.slice(shelfPage*pageSize,(shelfPage+1)*pageSize);
  for(let slot=0;slot<pageSize;slot++){
   const volume=visible[slot],number=volume?.number??Math.max(shelfPage*pageSize+slot+1,(visible.at(-1)?.number??0)+slot-visible.length+1),status=volume?progressFor(volume):null;
   const b=volume?button('',()=>{selectedNumber=volume.number;renderShelf(volume.number,true);}):el('div');b.className='shelf-volume';b.dataset.volume=number;b.dataset.registered=String(!!volume);b.style.setProperty('--slot',slot);
   b.setAttribute('aria-label',volume?`제${number}권 · ${volume.wordCount}단어 · ${status.label}`:`제${number}권 · 미등록`);
   if(volume)b.setAttribute('aria-pressed',String(number===selectedNumber));
   const visual=el('span','scroll-visual');visual.dataset.art=scrollShelfArt.volumes[number]??'unregistered';visual.append(scrollShelfImage(visual.dataset.art,'scroll-image'));
   const tag=el('span','shelf-spine-label');tag.append(el('span',null,'제'),el('span','scroll-numeral',String(number)),el('span',null,'권'));visual.append(tag);
   if(volume&&number===selectedNumber){const glow=scrollShelfImage('selection','scroll-selection');glow.dataset.selectedScroll=String(number);visual.append(glow);}
   b.append(visual,el('span','shelf-volume-status',status?.label??'미등록'));rack.append(b);
  }rackViewport.append(rack);content.append(rackViewport);

  const jump=el('form','shelf-jump'),label=el('label',null,'권수로 이동'),input=el('input');input.id='shelfVolumeInput';input.name='volume';input.type='text';input.inputMode='numeric';input.autocomplete='off';input.maxLength=9;input.setAttribute('aria-describedby','shelfJumpError');label.htmlFor=input.id;input.placeholder='예: 3';const go=el('button','lesson-button','찾아가기');go.type='submit';const error=el('p','shelf-error');error.id='shelfJumpError';error.setAttribute('role','status');jump.append(label,input,go,error);
  jump.addEventListener('submit',e=>{e.preventDefault();if(composing||performance.now()<imeReadyAt)return;const value=input.value.normalize('NFKC').trim(),number=/^[0-9]+$/.test(value)?Number(value):NaN,i=catalog.findIndex(v=>v.number===number);if(!Number.isSafeInteger(number)||number<1){error.textContent='권수는 1 이상의 정수로 입력해 줘.';return;}if(i<0){error.textContent=`제${number}권은 아직 등록되지 않았어.`;return;}selectedNumber=number;shelfPage=Math.floor(i/pageSize);renderShelf(number);});content.append(jump);
  const volume=catalog.find(v=>v.number===selectedNumber),info=el('section','shelf-selection');info.setAttribute('aria-label','선택한 교본 정보');const infoFrame=el('div','scroll-information');infoFrame.append(scrollShelfImage('information','scroll-information-art'),info);
  if(volume){const status=progressFor(volume),course=courses.get(volume.number),record=learningStore?.read('volume-'+volume.number),position=record?.lastGradedIndex??0;
   info.append(el('p','lesson-kicker','선택한 교본'),el('h2',null,`제${volume.number}권`),el('p','shelf-meta',`등록 단어 ${volume.wordCount}개${volume.stageId?' · 스테이지 '+volume.stageId:''} · ${status.label}`),el('p','shelf-caption',status.hasRecord?'확인된 서당 학습 기록을 표시하고 있어.':'아직 채점한 서당 기록이 없어. 전투 기록과는 별개야.'),el('p','shelf-demo-notice',course?'원본 순서로 학습 · 채점 시 진도 저장 · 보상 없음':'이 권의 실제 학습 자료를 확인할 수 없어. 기존 진도는 유지해.'));
   info.append(el('p','shelf-progress-count',`현재 진도 ${position}/${volume.wordCount} · ${record?.completed?`${volume.wordCount}개 모두 채점 완료`:'채점 완료한 항목 수'}`));
   if(!record?.completed){const start=button(position?`이어 학습 · ${position+1}번째부터`:`학습 시작 · 제${volume.number}권 ${volume.wordCount}개`,()=>startCourse(course),true);start.classList.add('scroll-start-button');start.dataset.courseStart=String(volume.number);if(volume.number===1)start.dataset.volume1Start='';start.disabled=!course||course.total!==volume.wordCount||!learningStore?.available;info.append(start);}
   if(position){const review=button('학습한 단어 다시 보기',()=>{activeCourse=course;startReview();});review.dataset.reviewStart='';review.disabled=!course;info.append(review);}
   if(courseErrors.get(volume.number)||learningStore?.error)info.append(el('p','shelf-error',courseErrors.get(volume.number)||learningStore.error));
   const start=button('기존 3단어 UI 테스트',startDemo);start.dataset.shelfStart='';start.classList.add('scroll-demo-link');content.append(start);
  }else info.append(el('p','shelf-error',catalogError||'등록된 교본이 없어. 교본 정보를 확인해 줘.'));content.append(infoFrame);content.append(el('p','shelf-caption','학습 완료는 해당 권의 모든 항목을 채점했다는 뜻이야. 정답률이나 보상을 뜻하지 않아.'));
  book.append(el('footer','lesson-footer','Esc · 수업 메뉴로 돌아가기'));root.append(book);root.scrollTop=scroll;
  if(focusNumber!==null)root.querySelector(`[data-volume="${focusNumber}"]`)?.focus({preventScroll:true});else (root.querySelector('[data-volume]')??root.querySelector('button'))?.focus({preventScroll:true});
 }

 // Original approved PNGs; display-only transparent-margin windows. No pixel edits.
 const talismanArt=Object.freeze({room:{src:'room.png',size:[1672,941],crop:[0,0,1672,941]},paper:{src:'paper.png',size:[1024,1536],crop:[195,60,635,1420]},right:{src:'right.png',size:[1448,1086],crop:[375,0,1073,1086]},left:{src:'left.png',size:[1448,1086],crop:[130,55,1155,1031]},seal:{src:'seal.png',size:[1254,1254],crop:[18,25,1220,1215]}});
 let talismanArtWarmed=false;
 function warmTalismanArt(){if(talismanArtWarmed)return;talismanArtWarmed=true;for(const art of Object.values(talismanArt)){const im=new Image();im.src='school/assets/talisman/'+art.src;}}
 function artSprite(name,className){const art=talismanArt[name],[x,y,w,h]=art.crop,box=el('div',className+' talisman-asset-window'),im=el('img');box.dataset.art=name;box.setAttribute('aria-hidden','true');box.style.aspectRatio=w+'/'+h;im.src='school/assets/talisman/'+art.src;im.alt='';im.draggable=false;im.width=art.size[0];im.height=art.size[1];Object.assign(im.style,{width:art.size[0]/w*100+'%',height:art.size[1]/h*100+'%',left:-x/w*100+'%',top:-y/h*100+'%'});box.append(im);return box;}
 // Decorative nine-slice windows use unchanged original PNGs; no event/model changes.
 const talismanUi=Object.freeze({"dialogue":{"size":[1774,887],"crop":[50,252,1676,387],"corner":75},"panel":{"size":[1122,1402],"crop":[79,57,964,1286],"corner":75},"input":{"size":[2048,682],"crop":[56,160,1937,362],"corner":65},"primary":{"size":[1774,887],"crop":[64,218,1648,427],"corner":80},"secondary":{"size":[2048,682],"crop":[58,165,1936,353],"corner":70}});
 function uiFrame(host,name){const a=talismanUi[name],[x,y,w,h]=a.crop,c=a.corner,skin=el('span','talisman-ui-skin');skin.dataset.uiArt=name;skin.setAttribute('aria-hidden','true');const xs=[x,x+c,x+w-c],ys=[y,y+c,y+h-c],ws=[c,w-2*c,c],hs=[c,h-2*c,c];for(let row=0;row<3;row++)for(let col=0;col<3;col++){const cell=el('span'),im=el('img');im.src='school/assets/talisman-ui/'+name+'.png';im.alt='';im.draggable=false;im.width=a.size[0];im.height=a.size[1];Object.assign(im.style,{width:a.size[0]/ws[col]*100+'%',height:a.size[1]/hs[row]*100+'%',left:-xs[col]/ws[col]*100+'%',top:-ys[row]/hs[row]*100+'%'});cell.append(im);skin.append(cell);}host.classList.add('talisman-image-ui');host.prepend(skin);}
 function decorateTalismanUi(workspace){for(const node of workspace.querySelectorAll('.talisman-guide'))uiFrame(node,'dialogue');for(const node of workspace.querySelectorAll('.talisman-controls,.talisman-empty'))uiFrame(node,'panel');for(const input of workspace.querySelectorAll('.talisman-form input')){const shell=el('span','talisman-input-shell');input.replaceWith(shell);shell.append(input);uiFrame(shell,'input');}for(const node of workspace.querySelectorAll('.lesson-button'))uiFrame(node,node.classList.contains('lesson-primary')?'primary':'secondary');}
 // Presentation only: size the unchanged spelling inside the original paper.
 let talismanWritingObserver=null;
 function layoutTalismanWriting(workspace){
  talismanWritingObserver?.disconnect();const field=workspace.querySelector('.talisman-prompt');if(!field)return;
  const spelling=field.textContent,ink=el('span','talisman-ink',spelling);ink.lang='ja';field.replaceChildren(ink);
  const count=typeof Intl.Segmenter==='function'?[...new Intl.Segmenter('ja',{granularity:'grapheme'}).segment(spelling)].length:Array.from(spelling).length;
  field.dataset.direction=count<=6?'vertical':'horizontal';field.dataset.characters=String(count);
  const fit=()=>{if(!field.isConnected)return;const paper=field.closest('.talisman-paper'),width=paper.clientWidth;let size=Math.floor(count<=2?Math.min(64,width*.38):count<=4?Math.min(54,width*.32):count<=6?Math.min(44,width*.27):Math.min(32,width*.18));size=Math.max(18,size);ink.style.fontSize=size+'px';
   while(size>12&&(ink.offsetWidth>field.clientWidth+1||ink.offsetHeight>field.clientHeight+1)){ink.style.fontSize=(--size)+'px';}
   field.dataset.fontSize=String(size);
  };
  talismanWritingObserver=new ResizeObserver(fit);talismanWritingObserver.observe(field);fit();document.fonts.ready.then(fit);
 }
 function setReviewModule(module){reviewModule=module;}
 function reviewPool(){return learningStore?.available?reviewModule.learnedPool([...courses.values()],id=>learningStore.read(id)):[];}
 function openTalismans(callback){if(!enter(callback,'talismans'))return;warmTalismanArt();if(!reviewModule){renderTalismans('복습 기능을 불러오지 못했어. 수업 메뉴로 돌아가 다시 시도해 줘.');return;}if(!talismanReview)talismanReview=new reviewModule.TalismanReview({getPool:reviewPool,grade});talismanReview.reset();talismanReview.next();renderTalismans();}
 function renderTalismans(message=''){
  resetSpeechPage();renderEpoch++;const questionEpoch=renderEpoch;root.replaceChildren();composing=false;
  const workspace=el('section','talisman-workspace');workspace.dataset.reviewLayer='workspace';
  const scene=artSprite('room','talisman-scene');scene.dataset.reviewLayer='scene';const tabletop=artSprite('room','talisman-tabletop');tabletop.dataset.reviewLayer='desk';const hands=el('div','talisman-hands');hands.dataset.reviewLayer='hands';hands.setAttribute('aria-hidden','true');for(const side of ['left','right']){const hand=artSprite(side,'talisman-hand talisman-hand-'+side);hand.dataset.reviewLayer='hand-'+side;hands.append(hand);}workspace.append(scene,tabletop,hands);
  const heading=el('header','talisman-heading'),title=el('h1',null,'부적 만들기');title.id='lessonBookTitle';heading.append(title,button('제작 종료',()=>close()));workspace.append(heading);
  const item=talismanReview?.current;workspace.dataset.state=item?(talismanReview.outcome??'question'):'empty';
  if(message||!item){const empty=el('div','talisman-empty');empty.append(el('p','talisman-guide',message||(!learningStore?.available?'학습 기록을 확인할 수 없어. 기존 기록은 유지했어.':'아직 채점을 마친 단어가 없구나. 먼저 새로운 학습에서 단어를 공부해 보렴.')),button('새로운 학습으로',()=>{viewMode='shelf';root.classList.remove('talisman-overlay');shelfNotice='';renderShelf();},true));workspace.append(empty);decorateTalismanUi(workspace);root.append(workspace);layoutTalismanWriting(workspace);heading.querySelector('button').focus();return;}
  workspace.dataset.reviewKey=item.key;
  const body=el('div','talisman-desk'),teacher=el('aside','talisman-teacher'),portrait=el('img','talisman-portrait');teacher.dataset.reviewLayer='teacher';portrait.src='school/assets/keine_dialogue_'+(talismanReview.outcome&&talismanReview.outcome!=='revealed'?'smile':'normal')+'.png';portrait.alt='케이네 선생님';portrait.width=1024;portrait.height=1536;teacher.append(portrait);const paper=el('section','talisman-paper');paper.dataset.reviewLayer='paper';paper.setAttribute('aria-label','부적');const paperArt=artSprite('paper','talisman-paper-art');paperArt.dataset.reviewLayer='ofuda-art';paper.append(paperArt);if(talismanReview.outcome&&talismanReview.outcome!=='revealed'){const seal=artSprite('seal','talisman-stamp');seal.dataset.reviewLayer='completion-seal';paper.append(seal);}
  const prompt=el('div','talisman-prompt',item.word.spelling);prompt.lang='ja';prompt.dataset.reviewPrompt='';paper.append(prompt,el('span','talisman-blank',talismanReview.outcome==='revealed'?'다시 익히기':talismanReview.outcome?'완성':''));
  const controls=el('section','talisman-controls');controls.dataset.reviewLayer='controls';const guidance=el('p','talisman-guide',talismanReview.outcome==='revealed'?'케이네: “답을 살펴보았구나. 다음에 다시 떠올려 보렴.”':talismanReview.outcome?'케이네: “잘했어. 단어를 떠올려 부적에 새겼구나.”':'케이네: “천천히 떠올려 보렴. 틀려도 몇 번이든 다시 쓸 수 있어.”');teacher.append(guidance);
  if(!talismanReview.outcome){
   const form=el('form','talisman-form');form.autocomplete='off';const fields={};
   for(const [key,labelText]of [...(needsReading(item.word)?[['reading','읽기 · 히라가나 또는 로마자']]:[]),['meaning','한국어 뜻']]){const label=el('label',null,labelText),input=el('input');input.name=key;input.type='text';input.spellcheck=false;input.autocomplete='off';input.setAttribute('aria-label',labelText);if(key==='reading')input.autocapitalize='off';label.append(input);form.append(label);fields[key]=input;}
   const error=el('p','talisman-feedback');error.setAttribute('role','status');error.setAttribute('aria-live','polite');form.append(error);
   const actions=el('div','talisman-actions'),submit=el('button','lesson-button lesson-primary','글자 새기기');submit.type='submit';const reveal=button('정답 확인하기',()=>{if(composing||performance.now()<imeReadyAt||talismanReview.current?.key!==item.key||!talismanReview.reveal())return;renderTalismans();});actions.append(submit,reveal);form.append(actions);
   form.addEventListener('submit',e=>{e.preventDefault();if(questionEpoch!==renderEpoch||composing||performance.now()<imeReadyAt||viewMode!=='talismans'||root.hidden||talismanReview.current?.key!==item.key||talismanReview.outcome)return;const answer=Object.fromEntries(new FormData(form));if(!normalize(answer.meaning)||(needsReading(item.word)&&!normalize(answer.reading))){error.textContent='필요한 답안을 모두 입력해 줘.';return;}const result=talismanReview.submit(answer);if(result.locked)return;mistakeStore?.observe(item.key,item,result.reading&&result.meaning);if(result.outcome){renderTalismans();return;}error.textContent=!result.reading&&!result.meaning?'읽기와 뜻을 다시 확인해 줘.':!result.reading?'읽기를 다시 확인해 줘.':'뜻을 다시 확인해 줘.';(fields[!result.reading?'reading':'meaning']).focus();});controls.append(form);
  }else{
   const status=el('p','talisman-outcome',talismanReview.outcome==='revealed'?'정답 확인 · 복습이 필요한 항목':'부적 완성 · '+(talismanReview.outcome==='first_correct'?'처음 제출부터 정답':'다시 도전하여 정답'));status.dataset.outcome=talismanReview.outcome;status.setAttribute('role','status');controls.append(status);
   const answers=el('dl','talisman-reference');for(const [label,value,lang]of [['일본어 표기',item.word.spelling,'ja'],['히라가나 읽기',item.word.reading,'ja'],['로마자 읽기',item.word.romaji,'en'],['한국어 뜻',item.word.meaning,'ko']]){const dd=el('dd',null,value);dd.lang=lang;answers.append(el('dt',null,label),dd);}controls.append(answers);appendPronunciation(controls,item.word);
   if(item.word.sourceMeanings&&item.word.meanings.some(m=>!item.word.sourceMeanings.includes(m)))controls.append(el('p','lesson-allowed','추가 허용 뜻: '+item.word.meanings.filter(m=>!item.word.sourceMeanings.includes(m)).join(' / ')));
   controls.append(button('다음 부적 만들기',()=>{talismanReview.next();renderTalismans();},true));
  }
  body.append(teacher,paper,controls);workspace.append(body,el('p','talisman-footer',`제${item.bookId.slice(7)}권 · ${item.position}번째 학습 항목 · 복습 대상 ${talismanReview.total}개 · 시간제한 없음 · Esc 종료`));decorateTalismanUi(workspace);root.append(workspace);layoutTalismanWriting(workspace);root.scrollTop=0;(controls.querySelector('input')??controls.querySelector('button')??heading.querySelector('button')).focus({preventScroll:true});
 }


 // Mistake review reuses the book, grade function and portrait resources. New
 // learning never calls observe; opportunity identity is held only in memory.
 let mistakeModule=null,mistakeStore=null,mistakeSession=null;
 const mistakeItems=new Map();
 function setMistakeModule(module,options){
  mistakeModule=module;for(const course of courses.values())course.words.forEach((word,i)=>{const key=course.id+':'+(word.id??'ordinal-'+(i+1));mistakeItems.set(key,Object.freeze({key,bookId:course.id,position:i+1,word}));});
  function notice(error){let box=document.getElementById('schoolMistakeSaveNotice');if(!box){box=el('aside','school-mistake-save');box.id='schoolMistakeSaveNotice';box.setAttribute('role','status');document.body.append(box);}box.replaceChildren();box.hidden=!error;if(error){const retry=el('button','lesson-button','기록 저장 다시 시도');retry.type='button';retry.onclick=()=>mistakeStore.flush();box.append(el('span',null,error),retry);}}
  mistakeStore=new module.MistakeStore({...options,keys:mistakeItems.keys(),onChange:notice});notice(mistakeStore.error);
  window.GensokyoSchoolMistakes=Object.freeze({observe:(key,opportunity,success)=>mistakeStore.observe(key,opportunity,success),keyAt:(number,position)=>{const course=courses.get(number),word=course?.words[position-1];return Number.isInteger(position)&&word?course.id+':'+(word.id??'ordinal-'+position):null;},read:()=>mistakeStore.read(),flush:()=>mistakeStore.flush()});
 }
 function mistakePool(){return(mistakeStore?.read()?.targets??[]).map(key=>mistakeItems.get(key)).filter(Boolean);}
 function openMistakes(callback){
  if(!mistakeStore?.available){document.getElementById('residentLine').textContent=mistakeStore?.error??'오답 자료를 불러오지 못했어. 기존 기록은 유지했어.';return;}
  if(!mistakePool().length){document.getElementById('residentLine').textContent='지금은 다시 살펴볼 단어가 없구나. 훌륭해! 앞으로도 꾸준히 연습하렴.';return;}
  if(!enter(callback,'mistakes'))return;mistakeSession=new mistakeModule.MistakeSession({getPool:mistakePool,store:mistakeStore,grade});mistakeSession.next();renderMistakes();
 }
 function renderMistakes(){
  resetSpeechPage();renderEpoch++;const epoch=renderEpoch,item=mistakeSession.current,w=item?.word,outcome=mistakeSession.outcome;root.replaceChildren();
  const book=el('div','lesson-book school-mistake-book'),header=el('header','lesson-header'),heading=el('div');heading.append(el('small','lesson-series','케이네의 서당 · 오답 복습'),el('h1',null,'다시 살펴보는 단어'));heading.lastChild.id='lessonBookTitle';header.append(heading,button('복습 종료',()=>close()));book.append(el('span','lesson-bookmark'),header);
  const spread=el('div','lesson-spread'),left=panel(spread,'왼쪽 페이지 · 문제'),right=panel(spread,'오른쪽 페이지 · 답안');book.append(spread);book.dataset.mistakeKey=item?.key??'';book.dataset.state=outcome??'question';
  const teacher=el('div','lesson-teacher mistake-teacher'),portrait=el('img');portrait.src='school/assets/keine_dialogue_'+(outcome==='correct'?'smile':'normal')+'.png';portrait.alt='케이네 선생님';teacher.append(portrait,el('p',null,!item?'“차근차근 잘 익혔구나. 남은 단어가 없단다.”':outcome==='correct'?'“잘했어! 이 단어는 이제 잘 기억하고 있구나.”':outcome==='revealed'?'“답을 살펴보렴. 다음 회차에 다시 떠올려 보자.”':'“천천히 생각해 보렴. 몇 번이든 다시 시도해도 괜찮단다.”'));
  if(!item){left.append(el('h2',null,'오답 복습을 마쳤어.'),el('p','lesson-copy','현재 다시 살펴볼 단어가 없어. 점수나 보상 없이, 익힌 단어만 목록에서 정리했어.'));right.append(teacher,button('수업 메뉴로',()=>close(),true));}
  else{
   const prompt=el('h2','lesson-word mistake-word',w.spelling);prompt.lang='ja';left.append(prompt,el('p','lesson-copy',`제${item.bookId.slice(7)}권 · ${item.position}번째 항목`));right.append(teacher);
   if(!outcome){
    const form=el('form','lesson-form mistake-form');form.autocomplete='off';const fields={};
    for(const [name,label,lang]of [...(needsReading(w)?[['reading','읽기 · 히라가나 / 로마자','ja']]:[]),['meaning','한국어 뜻','ko']]){const l=el('label',null,label),input=el('input');Object.assign(input,{name,lang,required:true,autocomplete:'off',spellcheck:false,maxLength:80});l.append(input);form.append(l);fields[name]=input;}
    const feedback=el('p','lesson-validation');feedback.setAttribute('role','status');form.append(feedback);const actions=el('div','lesson-actions'),submit=el('button','lesson-button lesson-primary','정답 확인하기');submit.type='submit';actions.append(submit,button('정답 보기',()=>{if(composing||performance.now()<imeReadyAt||!mistakeSession.reveal())return;renderMistakes();}));form.append(actions);
    form.addEventListener('submit',e=>{e.preventDefault();if(epoch!==renderEpoch||root.hidden||viewMode!=='mistakes'||composing||performance.now()<imeReadyAt||mistakeSession.outcome)return;const answer=Object.fromEntries(new FormData(form));if(!normalize(answer.meaning)||(needsReading(w)&&!normalize(answer.reading))){feedback.textContent='필요한 답안을 모두 입력해 줘.';return;}const result=mistakeSession.submit(answer);if(result.locked)return;if(result.outcome){renderMistakes();return;}feedback.textContent='다시 생각해 보렴. '+(!result.reading&&!result.meaning?'읽기와 뜻':!result.reading?'읽기':'뜻')+'을 확인해 줘.';fields[!result.reading?'reading':'meaning'].focus();});right.append(form);
   }else{
    left.append(el('p',outcome==='correct'?'lesson-success':'lesson-retry',outcome==='correct'?'잘 익혔어 · 오답 목록에서 제거':'답 확인 · 다음 회차에 다시 복습'));
    const reference=el('dl','lesson-reference');reference.setAttribute('aria-label','올바른 단어 정보');for(const [label,value,lang]of [['일본어 표기',w.spelling,'ja'],['히라가나 읽기',w.reading,'ja'],['로마자 읽기',w.romaji,'en'],['한국어 뜻',w.meaning,'ko']]){const dd=el('dd',null,value);dd.lang=lang;reference.append(el('dt',null,label),dd);}right.append(reference);appendPronunciation(right,w);
    if(w.sourceMeanings&&w.meanings.some(m=>!w.sourceMeanings.includes(m)))right.append(el('p','lesson-allowed','추가 허용 뜻: '+w.meanings.filter(m=>!w.sourceMeanings.includes(m)).join(' / ')));
    right.append(button('다음 문제',()=>{mistakeSession.next();renderMistakes();},true));
   }
  }
  const footer=el('footer','lesson-footer');footer.append(el('span',null,`남은 오답 ${mistakePool().length}개 · ${mistakeSession.round}회차`),el('span',null,'시간제한 없음 · Esc 복습 종료'));book.append(footer);root.append(book);root.scrollTop=0;(root.querySelector('input')??right.querySelector('button')??header.querySelector('button'))?.focus({preventScroll:true});
 }

 function close(restore=true){resetSpeechPage();if(!root||root.hidden)return;talismanWritingObserver?.disconnect();renderEpoch++;root.hidden=true;root.replaceChildren();root.classList.remove('talisman-overlay');document.body.classList.remove('school-book-open');composing=false;clearStoryInput();const callback=returnToMenu;returnToMenu=null;if(restore)callback?.();}
 // Called by the existing resident menu's capture handler. Do not cancel text input.
 function handleKey(e){e.stopImmediatePropagation();if(e.isComposing||e.keyCode===229||composing)return;const k=e.key.toLowerCase();if(k==='escape'){e.preventDefault();if(viewMode==='lesson')showShelf();else close();return;}if(k==='tab'){e.preventDefault();const items=[...root.querySelectorAll('button,input')].filter(n=>!n.disabled),i=items.indexOf(document.activeElement);items[(i+(e.shiftKey?-1:1)+items.length)%items.length]?.focus();return;}if(e.repeat)return;if(k==='enter'){e.preventDefault();if(performance.now()<imeReadyAt)return;if(document.activeElement?.matches('input'))document.activeElement.form?.requestSubmit();else document.activeElement?.click();}else if(k===' '&&document.activeElement?.matches('button')){e.preventDefault();document.activeElement.click();}}
 return Object.freeze({open,openShelf,openTalismans,openMistakes,setMistakeModule,setReviewModule,setSpeechModule,getReviewRecords:()=>talismanReview?.getRecords()??{},close,handleKey,setCatalog,setVolume1,setCourse,getCourse:number=>courses.get(number)??null,setLearningStore,openContinue,strictRomaji,setProgressReader:reader=>{progressReader=typeof reader==='function'?reader:()=>null;},get active(){return !!root&&!root.hidden;},needsReading,grade});
})();
