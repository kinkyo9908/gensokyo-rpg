/* One parent BGM, two school-only ambient voices. No save/storage/network state. */
(()=>{'use strict';
 const config=window.GensokyoAudioConfig,audio=document.getElementById('junhaBgm');if(!config||!audio)return;
 const tracks=config.tracks,scenes=config.scenes,mapGroups=Object.freeze(Object.fromEntries(Object.entries(scenes).map(([id,p])=>[id,p.track])));
 const breeze=document.createElement('audio'),pages=document.createElement('audio');breeze.id='schoolBreeze';pages.id='schoolPages';breeze.src=config.ambience.breeze;pages.src=config.ambience.pages;breeze.loop=true;breeze.preload=pages.preload='none';document.body.append(breeze,pages);
 let enabled=true,suspended=false,unlocked=false,entered=false,map='courtyard',desired='boundary',current='boundary',epoch=0,transitioning=false,transitionTarget=null,failed=null;
 let rampTimer=null,finishRamp=null,envelope=1,ambientEpoch=0,ambientRunning=false,pageTimer=null,nextPageAt=null,duckTimer=null,speaking=false;
 const ambientRequests=new WeakMap();
 const levels={schoolMusic:.25,breeze:.2,pages:.35};
 function gain(){const policy=entered?(scenes[map]||{track:'village',gain:1}):{track:'boundary',gain:1};return tracks[current].volume*(entered&&map==='terakoya'?levels.schoolMusic:policy.gain)*(speaking&&map==='terakoya'?config.duckGain:1);}
 function applyVolumes(){audio.volume=Math.max(0,Math.min(1,gain()*envelope));const duck=speaking?config.duckGain:1;breeze.volume=levels.breeze*duck;pages.volume=levels.pages*duck;}
 function allowed(){return enabled&&!suspended&&!document.hidden;}
 function schoolActive(){return entered&&map==='terakoya'&&allowed();}
 function clearPageTimer(){if(pageTimer!==null)clearTimeout(pageTimer);pageTimer=null;nextPageAt=null;}
 function stopAmbience(){ambientEpoch++;ambientRunning=false;clearPageTimer();for(const a of [breeze,pages]){a.pause();a.currentTime=0;}}
 async function playAmbient(a,token){if(!schoolActive()||token!==ambientEpoch)return false;try{ambientRequests.set(a,token);await a.play();if(!schoolActive()||token!==ambientEpoch){if(!schoolActive()||ambientRequests.get(a)===token)a.pause();return false;}return true;}catch{return false;}}
 function schedulePage(){clearPageTimer();if(!schoolActive())return;const token=ambientEpoch,delay=config.ambience.minDelay+Math.random()*(config.ambience.maxDelay-config.ambience.minDelay);nextPageAt=Date.now()+delay;pageTimer=setTimeout(async()=>{pageTimer=null;nextPageAt=null;if(token!==ambientEpoch||!schoolActive())return;pages.currentTime=0;if(!await playAmbient(pages,token))if(token===ambientEpoch&&schoolActive())schedulePage();},delay);}
 pages.addEventListener('ended',()=>{if(schoolActive())schedulePage();});
 pages.addEventListener('error',()=>{if(schoolActive())schedulePage();});
 function syncAmbience(){if(!schoolActive()){if(ambientRunning||pageTimer!==null||!breeze.paused||!pages.paused)stopAmbience();return;}if(!ambientRunning){ambientRunning=true;ambientEpoch++;schedulePage();}applyVolumes();if(breeze.paused)void playAmbient(breeze,ambientEpoch);}
 function syncButton(){for(const id of ['bgmToggle','loginBgmToggle']){const t=document.getElementById(id);if(!t)continue;t.textContent=id==='loginBgmToggle'?(enabled?'♪ 음악 끄기':'♩ 음악 켜기'):(enabled?'♪':'♩');t.setAttribute('aria-label',enabled?'BGM 끄기':'BGM 켜기');t.title=enabled?'BGM 끄기':'BGM 켜기';t.style.opacity=enabled?'1':'.58';}}
 function cancelRamp(){if(rampTimer!==null)clearInterval(rampTimer);rampTimer=null;if(finishRamp){const done=finishRamp;finishRamp=null;done(false);}}
 function ramp(to,ms,token){cancelRamp();return new Promise(resolve=>{const from=envelope,started=performance.now();finishRamp=resolve;rampTimer=setInterval(()=>{if(token!==epoch){cancelRamp();return;}const fraction=Math.min(1,(performance.now()-started)/ms);envelope=from+(to-from)*fraction;applyVolumes();if(fraction===1){clearInterval(rampTimer);rampTimer=null;finishRamp=null;resolve(true);}},25);});}
 async function play(token){if(!allowed()||failed===current)return false;try{await audio.play();unlocked=true;if(!allowed()){audio.pause();return false;}return token===epoch;}catch(error){if(token===epoch&&error?.name!=='NotAllowedError')failed=current;return false;}}
 async function reconcile(){syncAmbience();if(!allowed()){audio.pause();return;}if(transitioning&&transitionTarget===desired)return;if(current===desired&&!transitioning){envelope=1;applyVolumes();if(audio.paused)await play(epoch);return;}
  const group=desired,token=++epoch;transitionTarget=group;cancelRamp();transitioning=true;
  if(!audio.paused){if(!await ramp(0,375,token))return;}if(token!==epoch)return;audio.pause();envelope=0;current=group;failed=null;audio.src=tracks[current].src;audio.load();applyVolumes();
  if(await play(token))await ramp(1,375,token);if(token===epoch){transitioning=false;envelope=1;applyVolumes();}
 }
 function selectGroup(){desired=entered?(scenes[map]?.track||'village'):'boundary';applyVolumes();void reconcile();syncControls();}
 function setSpeechActive(value){speaking=!!value&&map==='terakoya';if(duckTimer!==null)clearTimeout(duckTimer);duckTimer=null;if(speaking)duckTimer=setTimeout(()=>{speaking=false;duckTimer=null;applyVolumes();},25000);applyVolumes();}
 function setSchoolVolume(channel,value){if(!Object.hasOwn(levels,channel)||!Number.isFinite(value))return false;levels[channel]=Math.max(0,Math.min(1,value));applyVolumes();syncControls();return true;}
 const controls=document.createElement('details');controls.id='schoolAudioControls';controls.hidden=true;const summary=document.createElement('summary');summary.textContent='서당 음량';controls.append(summary);
 for(const [id,label]of [['schoolMusic','배경음악 · 마을 대비'],['breeze','산들바람·새소리'],['pages','책장 소리']]){const row=document.createElement('label');row.textContent=label;const output=document.createElement('output'),input=document.createElement('input');input.type='range';input.min=0;input.max=100;input.step=1;input.dataset.audioChannel=id;input.setAttribute('aria-label',label);input.addEventListener('input',()=>setSchoolVolume(id,Number(input.value)/100));row.append(output,input);controls.append(row);}
 const note=document.createElement('small');note.textContent='발음 듣기 중 자동으로 낮아집니다. 설정은 이번 실행 동안 유지됩니다.';controls.append(note);document.body.append(controls);
 function syncControls(){controls.hidden=!(entered&&map==='terakoya'&&!suspended&&!document.body.classList.contains('boundary-active'));if(controls.hidden)controls.open=false;for(const input of controls.querySelectorAll('input')){const n=Math.round(levels[input.dataset.audioChannel]*100);input.value=String(n);input.previousElementSibling.value=n+'%';}}
 const manager={tracks,mapGroups,scenes,suspend(value){suspended=!!value;epoch++;cancelRamp();transitioning=false;if(suspended){audio.pause();stopAmbience();setSpeechActive(false);}else selectGroup();syncControls();},setMap(id){if(map!==id)setSpeechActive(false);map=id;selectGroup();},enterGame(){entered=true;selectGroup();queueMicrotask(syncControls);},setSpeechActive,setSchoolVolume,getState(){return{enabled,unlocked,entered,map,desired,current,transitioning,failed,suspended,speaking,levels:{...levels},nextPageAt,ambientRunning};}};window.GensokyoBgm=manager;
 function gesture(e){if(e.target?.closest?.('#bgmToggle,#loginBgmToggle'))return;unlocked=true;if(enabled)void reconcile();}
 window.addEventListener('pointerdown',gesture,true);window.addEventListener('keydown',e=>{gesture(e);if(controls.contains(e.target)){if(e.key==='Escape'){controls.open=false;summary.focus();e.preventDefault();}e.stopImmediatePropagation();}},true);
 for(const type of ['keyup','pointerdown'])window.addEventListener(type,e=>{if(controls.contains(e.target))e.stopImmediatePropagation();},true);
 document.getElementById('bgmToggle')?.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();unlocked=true;enabled=!enabled;epoch++;cancelRamp();transitioning=false;if(!enabled){audio.pause();stopAmbience();}else{failed=null;void reconcile();}syncButton();});
 document.getElementById('loginBgmToggle')?.addEventListener('click',()=>document.getElementById('bgmToggle')?.click());
 audio.addEventListener('error',()=>{failed=current;audio.pause();});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){epoch++;cancelRamp();transitioning=false;audio.pause();stopAmbience();setSpeechActive(false);}});
 window.addEventListener('pagehide',()=>{epoch++;cancelRamp();audio.pause();stopAmbience();setSpeechActive(false);});
 syncButton();applyVolumes();void reconcile();
})();
