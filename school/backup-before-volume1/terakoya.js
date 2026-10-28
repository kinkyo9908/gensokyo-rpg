/* School phase 1. Additive scene adapter; no save fields, currency, word or battle changes. */
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
 async function prepare(){if(state.prepared)return;[assets.atlas,assets.exterior,assets.wallboard]=await Promise.all([loadImage(imageSources.atlas),loadImage(imageSources.exterior),loadImage(imageSources.wallboard)]);assets.cells=[[39,199,333,269],[420,118,444,361],[928,2,291,479],[1280,30,479,469],[114,502,229,354],[546,507,216,349],[977,497,229,362],[1425,511,228,346]].map(([x,y,w,h])=>alphaBounds(assets.atlas,x,y,w,h));assets.building=alphaBounds(assets.exterior);assets.keine=alphaBounds(await loadImage(imageSources.keine));await Promise.all(['normal','smile'].map(expression=>loadImage('school/assets/keine_dialogue_'+expression+'.png')));await fetch('school/bookshelf-catalog.json').then(r=>{if(!r.ok)throw new Error('catalog');return r.json();}).then(data=>GensokyoLessonBook.setCatalog(data)).catch(()=>GensokyoLessonBook.setCatalog({volumes:[]},'책장 정보를 불러오지 못했어. 페이지를 새로고침해 줘.'));state.prepared=true;}
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
 function prepareMenu(){menu=document.createElement('div');menu.id='schoolLessonChoices';menu.className='minoriko-dialogue-choices school-lesson-choices';menu.hidden=true;const choices=[['new','새로운 학습'],['review','배운 단어 복습하기'],['notebook','내 단어장 보기'],['mistakes','오답 복습'],['close','대화 마치기']];for(const [id,name] of choices){const b=document.createElement('button');b.type='button';b.dataset.lesson=id;b.textContent=name;b.addEventListener('click',()=>{if(!isSchoolTalk())return;if(id==='close'){closeResidentDialogue();return;}if(id==='new'){GensokyoLessonBook.openShelf(()=>{if(isSchoolTalk()){$('residentDialogue').hidden=false;applyDialogueLayout();b.focus();}});return;}document.dispatchEvent(new CustomEvent('gensokyo-school-lesson-request',{detail:{lesson:id,implemented:false}}));$('residentLine').textContent='이 수업은 다음에 함께 준비하자. 오늘은 서당을 편하게 둘러보렴.';});menu.append(b);}$('residentDialogue').querySelector('.yujin-vn-box').append(menu);}
 function openTeacher(){if(mapId!==ID||residentDialogue.active||inventoryView.open||farmUiActive||story.active||yujinDialogue.active||minorikoDialogue.active||minorikoShop.active||combat.battle||changing||!ready)return false;teacherDefinition.portrait='school/assets/keine_dialogue_normal.png';residentDialogue.active=true;residentDialogue.definition=teacherDefinition;residentDialogue.mode='talk';residentDialogue.line=0;residentDialogue.readyAt=performance.now()+180;clearStoryInput();hideHint();$('toast').hidden=true;$('interact').hidden=true;$('miyoiChoices').hidden=true;state.menu=false;menu.hidden=true;$('residentDialogue').querySelector('.yujin-controls').hidden=false;$('residentJunhaPortrait').src=$('junhaDialoguePortrait').src;$('residentNpcPortrait').src=teacherDefinition.portrait;$('residentDialogue').hidden=false;$('residentDialogue').classList.add('school-conversation');document.body.classList.add('resident-talking');applyDialogueLayout();renderResidentDialogue();$('residentNext').focus();return true;}
 function install(){window.addEventListener('resize',()=>{if(isSchoolTalk())applyDialogueLayout();});if(state.installed)return;state.installed=true;new ResizeObserver(()=>{if(isSchoolTalk())applyDialogueLayout();}).observe($('residentDialogue').querySelector('.yujin-vn-box'));
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

/* Isolated lesson prototype. Session memory only: no vocabulary/save/cloud writes. */
window.GensokyoLessonBook = (() => {
 'use strict';
 const words=Object.freeze([
  Object.freeze({spelling:'学校',reading:'がっこう',meaning:'학교',romaji:'gakkou',acceptedRomaji:Object.freeze(['gakkou','gakkō']),explanation:'배우고 공부하는 곳을 가리키는 말이야. 작은 っ은 다음 소리를 잠깐 막아 발음해 보렴.',example:'学校に行きます。',translation:'학교에 갑니다.'}),
  Object.freeze({spelling:'先生',reading:'せんせい',meaning:'선생님',romaji:'sensei',acceptedRomaji:Object.freeze(['sensei']),explanation:'누군가를 가르치는 선생님을 부르는 말이야. 두 한자를 하나의 단어로 함께 익혀 보자.',example:'先生に聞きます。',translation:'선생님께 묻습니다.'}),
  Object.freeze({spelling:'本',reading:'ほん',meaning:'책',romaji:'hon',acceptedRomaji:Object.freeze(['hon']),explanation:'읽는 책을 뜻해. 한 글자짜리 단어도 읽기와 뜻을 함께 기억해 두렴.',example:'本を読みます。',translation:'책을 읽습니다.'})
 ]);
 const needsReading=word=>/[\u3400-\u4dbf\u4e00-\u9fff々]/u.test(word.spelling);
 const normalize=value=>String(value??'').normalize('NFKC').replace(/\s+/gu,'').trim();
 // Preserve the existing hiragana/meaning comparison. Romanization is an explicit
 // allowlist: keep macrons and internal characters; never guess missing sounds.
 const normalizeRomaji=value=>String(value??'').normalize('NFKC').trim().toLowerCase();
 const grade=(word,answer)=>({reading:!needsReading(word)||normalize(answer.reading)===normalize(word.reading)||(word.acceptedRomaji??[]).some(allowed=>normalizeRomaji(answer.reading)===normalizeRomaji(allowed)),meaning:normalize(answer.meaning)===normalize(word.meaning)});
 let root,index=0,step='learn',returnToMenu=null,composing=false,imeReadyAt=0,viewMode='lesson',catalog=[],catalogError='',shelfPage=0,selectedNumber=null;
 let progressReader=()=>null;
 const pageSize=10,statusLabels=Object.freeze({unlearned:'미학습',in_progress:'진행 중',completed:'학습 완료'});
 function el(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;}
 function button(text,action,primary=false){const b=el('button','lesson-button'+(primary?' lesson-primary':''),text);b.type='button';b.addEventListener('click',action);return b;}
 function panel(parent,label){const p=el('section','lesson-page');p.append(el('p','lesson-kicker',label));parent.append(p);return p;}
 function focusStart(){root.querySelector('[data-focus]')?.focus({preventScroll:true});}
 function render(answer,result){
  const w=words[index];root.replaceChildren();
  const book=el('div','lesson-book'),header=el('header','lesson-header'),heading=el('div');
  heading.append(el('small','lesson-series',`케이네의 서당 · ${selectedNumber?'제'+selectedNumber+'권 · ':''}세 단어 UI 테스트`),el('h1',null,'환상향 단어장'));
  heading.lastChild.id='lessonBookTitle';header.append(heading,button('책장으로',()=>showShelf()));
  const ribbon=el('span','lesson-bookmark');ribbon.setAttribute('aria-hidden','true');book.append(ribbon,header);
  const progress=el('nav','lesson-progress');progress.setAttribute('aria-label','수업 단계');
  ['학습','문제풀이','채점'].forEach((name,i)=>{const n=el('span',step===['learn','quiz','grade'][i]?'is-current':'',`${i+1} ${name}`);if(n.className)n.setAttribute('aria-current','step');progress.append(n);});book.append(progress);
  const spread=el('div','lesson-spread'),left=panel(spread,step==='learn'?'왼쪽 페이지 · 단어 익히기':'왼쪽 페이지 · 복습 안내'),right=panel(spread,'오른쪽 페이지 · '+({learn:'선생님의 안내',quiz:'스스로 풀어보기',grade:'답 확인하기',done:'수업 마무리'}[step]));book.append(spread);
  if(step==='learn'){
   left.append(el('h2','lesson-word',w.spelling));left.lastChild.lang='ja';
   if(needsReading(w)){const r=el('p','lesson-reading',w.reading);r.lang='ja';left.append(r);}
   left.append(el('p','lesson-meaning',w.meaning),el('p','lesson-copy',w.explanation));
   const example=el('div','lesson-note');example.append(el('small',null,'짧은 예문'),el('p','lesson-example',w.example),el('p',null,w.translation));example.children[1].lang='ja';left.append(example);
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
   form.addEventListener('submit',e=>{e.preventDefault();if(step!=='quiz'||composing||performance.now()<imeReadyAt)return;const a=Object.fromEntries(new FormData(form));if(!normalize(a.meaning)||(needsReading(w)&&!normalize(a.reading))){error.textContent='필요한 답안을 모두 입력해 줘.';return;}const r=grade(w,a);step='grade';render(a,r);});right.append(form);
  }else if(step==='grade'){
   const correct=result.reading&&result.meaning;
   left.append(el('h2',null,correct?'잘 기억하고 있구나!':'괜찮아, 다시 익혀 보자.'),el('p','lesson-copy',correct?'표기와 읽기, 뜻을 연결해서 기억했네. 다음 단어도 천천히 살펴보렴.':'아래의 올바른 답과 네 답을 비교해 보렴. 다시 학습해서 확인한 뒤 넘어가도 좋아.'));
   const reference=el('dl','lesson-reference');reference.setAttribute('aria-label','올바른 단어 정보');
   for(const [label,value,lang] of [['일본어 표기',w.spelling,'ja'],['히라가나 읽기',w.reading,'ja'],['로마자 읽기',w.romaji,'en'],['한국어 뜻',w.meaning,'ko']]){const dd=el('dd',null,value);dd.lang=lang;reference.append(el('dt',null,label),dd);}left.append(reference);
   if(w.acceptedRomaji?.length>1)left.append(el('p','lesson-allowed','허용 로마자: '+w.acceptedRomaji.join(' / ')));
   const status=el('h2',correct?'lesson-success':'lesson-retry',correct?'정답이야!':'다시 확인해 보자');status.setAttribute('role','status');right.append(status,el('p','lesson-copy','네가 입력한 답을 읽기와 뜻으로 나누어 확인해 보렴.'));
   const answers=el('dl','lesson-answers');
   if(!needsReading(w))answers.append(el('dt',null,'읽기 · 입력 대상 아님'),el('dd','lesson-given','가나 단어는 한국어 뜻만 확인해.'));
   for(const [key,label] of [...(needsReading(w)?[['reading','읽기']]:[]),['meaning','뜻']]){const dt=el('dt',result[key]?'lesson-field-correct':'lesson-field-wrong',`${label} · ${result[key]?'정답':'오답'}`);dt.dataset.result=result[key]?'correct':'incorrect';const given=el('dd','lesson-given','입력한 답: '+answer[key]);given.dataset.answer=key;answers.append(dt,given);}right.append(answers);
   const actions=el('div','lesson-actions'),next=button(index===words.length-1?'수업 마치기':'다음 단어',()=>{if(index<words.length-1){index++;step='learn';}else step='done';render();},true);next.dataset.focus='';actions.append(next,button('다시 학습',()=>{step='learn';render();}));right.append(actions);
  }else{
   left.append(el('h2',null,'첫 수업을 마쳤어.'),el('p','lesson-copy','테스트 단어 세 개를 모두 살펴보았구나. 오늘은 책을 펼치고, 기억하고, 확인하는 연습을 했어.'));
   right.append(el('h2',null,'다시 만나자, 서당에서.'),el('p','lesson-copy','이 수업의 답안과 진행은 저장하지 않아. 기존 학습 기록과 보상은 그대로 유지돼.'));
   const b=button('처음부터 다시 학습',()=>{index=0;step='learn';render();},true);b.dataset.focus='';right.append(b,button('책장으로',()=>showShelf()));
  }
  const foot=el('footer','lesson-footer');foot.append(el('span',null,`공통 UI 테스트 · ${index+1} / ${words.length} · 실제 단어장 연결 전`),el('span',null,'시간제한 없음 · Esc 책장'));book.append(foot);root.append(book);root.scrollTop=0;composing=false;focusStart();
 }
 function enter(callback,mode){if(root&&!root.hidden)return false;returnToMenu=callback;index=0;step='learn';viewMode=mode;composing=false;imeReadyAt=0;if(!root){root=el('div','school-book-overlay');root.id='schoolLessonBook';root.hidden=true;root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-labelledby','lessonBookTitle');root.addEventListener('compositionstart',()=>{composing=true;});root.addEventListener('compositionend',()=>{composing=false;imeReadyAt=performance.now()+220;});document.body.append(root);}clearStoryInput();document.getElementById('residentDialogue').hidden=true;document.body.classList.add('school-book-open');root.hidden=false;return true;}
 function open(callback){if(enter(callback,'lesson'))render();}
 function openShelf(callback){if(enter(callback,'shelf'))renderShelf();}

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
 function showShelf(){viewMode='shelf';composing=false;imeReadyAt=0;renderShelf();}
 function renderShelf(focusNumber=null,keepScroll=false){
  const scroll=keepScroll?root.scrollTop:0;root.replaceChildren();
  const book=el('div','lesson-book school-shelf'),header=el('header','lesson-header'),heading=el('div');heading.append(el('small','lesson-series','케이네의 서당 · 교본 책장'),el('h1',null,'환상향 단어장'));heading.lastChild.id='lessonBookTitle';header.append(heading,button('수업 메뉴로',()=>close()));book.append(el('span','lesson-bookmark'),header);
  const content=el('div','shelf-paper');book.append(content);
  const title=el('div','shelf-titleline');title.append(el('h2',null,'어느 교본을 펼쳐 볼까?'),el('span',null,`현재 등록 ${catalog.length}권`));content.append(title);
  content.append(el('p','shelf-caption','한 책장에 열 권씩. 교본을 고르면 아래에서 내용을 살펴볼 수 있어.'));
  const pages=Math.max(1,Math.ceil(catalog.length/pageSize));shelfPage=Math.min(shelfPage,pages-1);
  const nav=el('div','shelf-nav');const prev=button('이전 책장',()=>{shelfPage--;selectedNumber=catalog[shelfPage*pageSize]?.number??null;renderShelf(selectedNumber);});prev.disabled=shelfPage===0;prev.dataset.shelfNav='previous';
  const next=button('다음 책장',()=>{shelfPage++;selectedNumber=catalog[shelfPage*pageSize]?.number??null;renderShelf(selectedNumber);});next.disabled=shelfPage>=pages-1;next.dataset.shelfNav='next';nav.append(prev,el('span','shelf-page-count',`${shelfPage+1} / ${pages} 책장`),next);content.append(nav);
  const rack=el('div','shelf-rack');rack.setAttribute('aria-label','교본 목록');
  const visible=catalog.slice(shelfPage*pageSize,(shelfPage+1)*pageSize);
  for(let slot=0;slot<pageSize;slot++){
   const volume=visible[slot];if(!volume){const empty=el('div','shelf-empty','빈 자리');empty.setAttribute('aria-hidden','true');rack.append(empty);continue;}
   const status=progressFor(volume),b=button('',()=>{selectedNumber=volume.number;renderShelf(volume.number,true);});b.className='shelf-volume';b.dataset.volume=volume.number;b.dataset.tone=slot%5;b.setAttribute('aria-pressed',String(volume.number===selectedNumber));b.setAttribute('aria-label',`제${volume.number}권 · ${volume.wordCount}단어 · ${status.label}`);
   b.append(el('span','shelf-spine-label',`제${volume.number}권`),el('small','shelf-word-count',`${volume.wordCount}단어`),el('span','shelf-volume-status',status.label));rack.append(b);
  }content.append(rack);
  const jump=el('form','shelf-jump'),label=el('label',null,'권수로 이동'),input=el('input');input.id='shelfVolumeInput';input.name='volume';input.type='text';input.inputMode='numeric';input.autocomplete='off';input.maxLength=9;input.setAttribute('aria-describedby','shelfJumpError');label.htmlFor=input.id;input.placeholder='예: 3';const go=el('button','lesson-button','찾아가기');go.type='submit';const error=el('p','shelf-error');error.id='shelfJumpError';error.setAttribute('role','status');jump.append(label,input,go,error);
  jump.addEventListener('submit',e=>{e.preventDefault();if(composing||performance.now()<imeReadyAt)return;const value=input.value.normalize('NFKC').trim(),number=/^[0-9]+$/.test(value)?Number(value):NaN,i=catalog.findIndex(v=>v.number===number);if(!Number.isSafeInteger(number)||number<1){error.textContent='권수는 1 이상의 정수로 입력해 줘.';return;}if(i<0){error.textContent=`제${number}권은 아직 등록되지 않았어.`;return;}selectedNumber=number;shelfPage=Math.floor(i/pageSize);renderShelf(number);});content.append(jump);
  const volume=catalog.find(v=>v.number===selectedNumber),info=el('section','shelf-selection');info.setAttribute('aria-label','선택한 교본 정보');
  if(volume){const status=progressFor(volume);info.append(el('p','lesson-kicker','선택한 교본'),el('h2',null,`제${volume.number}권`),el('p','shelf-meta',`등록 단어 ${volume.wordCount}개${volume.stageId?' · 스테이지 '+volume.stageId:''} · ${status.label}`),el('p','shelf-caption',status.hasRecord?'확인된 서당 학습 기록을 표시하고 있어.':'서당 진도 기록은 아직 연결하지 않았어. 전투 기록을 학습 완료로 표시하지 않아.'),el('p','shelf-demo-notice','전체 단어장 학습은 연결 전이야. 지금은 어느 권을 선택해도 学校·先生·本 세 단어로 화면을 시험해 볼 수 있어.'));
   const start=button('학습 시작 · 3단어 테스트',()=>{viewMode='lesson';index=0;step='learn';render();},true);start.dataset.shelfStart='';info.append(start);
  }else info.append(el('p','shelf-error',catalogError||'등록된 교본이 없어. 교본 정보를 확인해 줘.'));content.append(info);content.append(el('p','shelf-caption','미학습 · 진행 중 · 학습 완료 표시 구조 준비 / 이번 개발본에서는 새 진도를 저장하지 않아.'));
  book.append(el('footer','lesson-footer','Esc · 수업 메뉴로 돌아가기'));root.append(book);root.scrollTop=scroll;
  if(focusNumber!==null)root.querySelector(`[data-volume="${focusNumber}"]`)?.focus({preventScroll:true});else (root.querySelector('[data-volume]')??root.querySelector('button'))?.focus({preventScroll:true});
 }
 function close(restore=true){if(!root||root.hidden)return;root.hidden=true;root.replaceChildren();document.body.classList.remove('school-book-open');composing=false;clearStoryInput();const callback=returnToMenu;returnToMenu=null;if(restore)callback?.();}
 // Called by the existing resident menu's capture handler. Do not cancel text input.
 function handleKey(e){e.stopImmediatePropagation();if(e.isComposing||e.keyCode===229||composing)return;const k=e.key.toLowerCase();if(k==='escape'){e.preventDefault();if(viewMode==='lesson')showShelf();else close();return;}if(k==='tab'){e.preventDefault();const items=[...root.querySelectorAll('button,input')].filter(n=>!n.disabled),i=items.indexOf(document.activeElement);items[(i+(e.shiftKey?-1:1)+items.length)%items.length]?.focus();return;}if(e.repeat)return;if(k==='enter'){e.preventDefault();if(performance.now()<imeReadyAt)return;if(document.activeElement?.matches('input'))root.querySelector('form')?.requestSubmit();else document.activeElement?.click();}else if(k===' '&&document.activeElement?.matches('button')){e.preventDefault();document.activeElement.click();}}
 return Object.freeze({open,openShelf,close,handleKey,setCatalog,setProgressReader:reader=>{progressReader=typeof reader==='function'?reader:()=>null;},get active(){return !!root&&!root.hidden;},needsReading,grade});
})();
