/* School preview only. No Firebase SDK, authentication or production save access. */
'use strict';
window.GENSOKYO_SCHOOL_TEST=Object.freeze({sourceCommit:'b476739372c03e2a2d010cfd505a1bccf71fa2c8',version:'15.4',cloudEnabled:false,saveKey:'gensokyo-rpg-school-test:permanent'});
document.addEventListener('DOMContentLoaded',()=>{const note=document.createElement('div');note.id='schoolTestNotice';note.setAttribute('role','note');note.textContent='조온 NPC 배치 테스트 · 별도 로컬 저장 · 클라우드 연결 없음';Object.assign(note.style,{position:'fixed',left:'8px',bottom:'8px',zIndex:'25000',background:'#30251fe8',color:'#ffe6b1',padding:'4px 9px',font:'11px/1.5 sans-serif',pointerEvents:'none',borderRadius:'3px'});document.body.append(note);},{once:true});
