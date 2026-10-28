import {accrue,applyTax,validateTax,seoulDate,CROPS} from './tax-core.mjs';

const names=Object.fromEntries(CROPS.map(k=>[k,farmCropConfig[k].name]));
const panel=document.createElement('section');panel.id='taxLedger';panel.className='tax-overlay';panel.hidden=true;
panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-labelledby','taxTitle');document.body.append(panel);
const state={ledger:false,busy:false,current:null,error:'',available:true};
let slot=saveManager.villageTax;
try{if(slot!==undefined)validateTax(slot);}catch(e){state.available=false;state.error=e.message;}
// SaveManager preserves this optional field before any startup auto-save.
const lockName='gensokyo-tax:'+saveManager.key;
const clock=()=>window.GENSOKYO_TAX_TEST?.enabled===true&&saveManager.key==='gensokyo-rpg-tax-test-v1:permanent'?window.GENSOKYO_TAX_TEST.now():Date.now();
const today=()=>seoulDate(clock());
const wallet=()=>({money:saveManager.resources.money,bongma:saveManager.resources.bongma,produce:{...saveManager.farm.produce}});
function guard(){
 const b=window.GensokyoCloudBridge;
 if(b?.restoreLock||b?.externalChange)throw new Error('다른 창 또는 클라우드의 기록이 바뀌었습니다. 백업 후 새로고침해 주세요.');
 if(!state.available)throw new Error(state.error);
}
function persist(next,nextWallet=null){
 guard();validateTax(next);
 const old=slot,resources={...saveManager.resources},produce={...saveManager.farm.produce};
 try{
  slot=next;saveManager.villageTax=next;
  if(nextWallet){saveManager.resources.money=nextWallet.money;saveManager.resources.bongma=nextWallet.bongma;saveManager.farm.produce={...nextWallet.produce};}
  if(new TextEncoder().encode(JSON.stringify(saveManager.snapshot(combat))).length>900*1024)throw new Error('저장 크기 상한을 넘어 납부를 중단했습니다.');
  if(saveManager.save(combat)!==true)throw new Error('저장하지 못했습니다. 재화와 납부 상태를 되돌렸습니다.');
 }catch(e){slot=old;saveManager.villageTax=old;Object.assign(saveManager.resources,resources);saveManager.farm.produce=produce;throw e;}
 // A display failure after a durable save must never undo the committed wallet.
 try{updatePlayerHUD();}catch(e){console.warn('징세 기록은 저장됐지만 HUD 갱신에 실패했습니다.',e);}
 return true;
}
async function locked(fn){
 if(state.busy)return{ok:false,reason:'busy'};
 state.busy=true;render();
 const task=(async()=>{
  try{
   if(!navigator.locks?.request)throw new Error('이 브라우저에서는 안전한 납부 잠금을 사용할 수 없습니다. Chrome 또는 Edge의 localhost/HTTPS에서 실행해 주세요.');
   return await navigator.locks.request(lockName,()=>{guard();return fn();});
  }catch(e){state.error=e.message;return {ok:false,reason:'storage',message:e.message};}
  finally{state.busy=false;render();}
 })();state.current=task;return task;
}
async function refresh(){
 return locked(()=>{
  const a=accrue(slot,today());
  if(a.clockBack){state.error='기록된 징세 날짜보다 현재 날짜가 이전입니다. 날짜가 돌아올 때까지 납부를 중단합니다.';return {ok:false,reason:'date'};}
  if(a.changed)persist(a.state);state.error='';return{ok:true};
 });
}
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function render(){
 if(!state.ledger)return;
 const date=today(),data=state.available?slot:undefined,rows=data?.pending??[],current=rows.find(r=>r.date===date),arrears=rows.filter(r=>r.date<date),claimed=data?.bonusDays.includes(date)??false;
 const bits=current?(data.payments[current.date]??0):0;
 const todayDemand=current?[bits&1?'':current.money+'전',bits&2?'':names[current.crop]+' '+current.quantity+'개'].filter(Boolean).join(' · '):data?'오늘의 세금은 완납했습니다.':'징세 기록을 확인해 주세요.';
 const disabled=state.busy||!state.available||!!state.error;
 panel.innerHTML=`<div class="tax-book"><header><div><small>인간마을 · 개인 징세 장부</small><h1 id="taxTitle">고블린왕의 징세 장부</h1><p>${escape(date)} · 한국 날짜 기준</p></div><img class="tax-seal" src="tax/assets/seal.png" alt="징세 인가" draggable="false"></header>
  <div class="tax-today"><strong>오늘의 미납 세금</strong><p>${escape(todayDemand)}</p></div>
  <div class="tax-balance">소지금 ${wallet().money.toLocaleString()}전 · 봉마편 ${wallet().bongma.toLocaleString()}개</div>
  <p class="tax-notice" role="status">${escape(state.error||'금전과 농작물은 따로 낼 수 있습니다. 각 항목의 부분 납부는 할 수 없습니다.')}</p>
  <div class="tax-scroll"><h2>최근 7일의 미납 목록 <small>${rows.length}일</small></h2>${rows.length?rows.map(r=>{
   const bits=slot.payments[r.date]??0;return `<article class="tax-row${r.date===date?' tax-row-today':''}"><div class="tax-row-date"><time datetime="${r.date}">${r.date}</time><span>${r.date===date?'오늘':'체납'}</span></div><div class="tax-demand"><span class="${bits&1?'tax-item-paid':''}">금전 <b>${r.money}전</b></span><span class="tax-crop ${bits&2?'tax-item-paid':''}">지정 농작물 <b>${names[r.crop]} ${r.quantity}개</b><small>보유 ${wallet().produce[r.crop]}개</small></span></div><div class="tax-row-actions"><button type="button" data-pay="money" data-date="${r.date}" ${disabled||(bits&1)?'disabled':''}>${bits&1?'금전 납부 완료':'금전 '+r.money+'전 납부'}</button><button type="button" data-pay="crop" data-date="${r.date}" ${disabled||(bits&2)?'disabled':''}>${bits&2?'농작물 납부 완료':names[r.crop]+' '+r.quantity+'개 납부'}</button></div></article>`;
  }).join(''):'<p class="tax-empty">남아 있는 미납 세금이 없습니다.</p>'}</div>
  <div class="tax-book-footer"><div class="tax-bonus"><strong>완납 보너스 · 봉마편 2개</strong><small>${claimed?'오늘의 보너스를 이미 받았습니다.':rows.length?'오늘분과 남은 체납을 모두 납부하면 수령할 수 있습니다.':'오늘의 보너스를 받을 수 있습니다.'}</small><button type="button" data-bonus ${disabled||claimed?'disabled':''}>${claimed?'오늘 수령 완료':'완납 보너스 수령'}</button></div><div class="tax-bottom">${arrears.length?`<button type="button" data-arrears ${state.busy?'disabled':''}>체납 안내</button>`:''}<button type="button" data-close ${state.busy?'disabled':''}>장부 닫기</button></div><small>오늘을 포함한 최근 7일만 청구합니다. 범위를 벗어난 미납은 자동 면제되며 벌금이나 기능 제한은 없습니다.</small></div></div>`;
}
async function openLedger(){
 if(state.busy)await state.current;
 await refresh();
 if(residentDialogue.active)return false;
 residentDialogue.active=true;residentDialogue.definition={name:'징세 장부',lines:[]};residentDialogue.mode='tax';
 clearStoryInput();route=[];keys.clear();intent=null;hideHint();$('toast').hidden=true;$('interact').hidden=true;
 document.body.classList.add('resident-talking');state.ledger=true;panel.hidden=false;render();panel.querySelector('button:not(:disabled)')?.focus();return true;
}
function closeLedger(){
 if(!state.ledger||state.busy)return false;
 state.ledger=false;panel.hidden=true;residentDialogue.active=false;residentDialogue.definition=null;
 document.body.classList.remove('resident-talking');clearStoryInput();route=[];keys.clear();intent=null;portalCooldown=.25;canvas.focus();return true;
}
function reaction(text,expression){
 closeLedger();
 const ok=GensokyoJoon.showDialogue({text,expression,onClose:()=>void openLedger()});
 if(ok)$('residentNext').textContent='장부로 돌아가기';else void openLedger();
}
async function attempt(action){
 if(!state.ledger||state.busy)return;
 const result=await locked(()=>{
  const date=today(),a=accrue(slot,date);if(a.clockBack)return{ok:false,reason:'date'};
  const result=applyTax(a.state,wallet(),action,date);
  if(result.ok){persist(result.state,result.wallet);state.error='';}
  else if(a.changed)persist(a.state);
  return result;
 });
 if(result.reason==='busy')return;
 if(result.ok){
  if(result.type==='bonus')reaction('후후, 밀린 세금까지 전부 냈네? 칭찬 대신 봉마편 두 개면 충분하지?','smirk');
  else reaction(`${result.row.date}의 ${result.type==='money'?result.row.money+'전':names[result.row.crop]+' '+result.row.quantity+'개'}, 받았어. 장부에 적어 둘게.`,'normal');
 }else if(result.reason==='money')reaction('어머, 돈이 부족하잖아? 한 푼도 받지 않았으니 준비해서 다시 와.','smirk');
 else if(result.reason==='crop')reaction(`후후, ${names[result.row.crop]} ${result.row.quantity}개가 필요한데 부족하네. 지금은 아무것도 받지 않을게.`,'smirk');
 else if(result.reason==='unpaid')reaction('아직 장부에 미납이 남아 있잖아. 오늘분과 남은 체납을 모두 정리한 뒤에 와.','displeased');
 else reaction(result.message||({claimed:'오늘의 보너스는 이미 받았어.',paid:'그 항목은 이미 납부했어.',missing:'청구 내역이 바뀌었어. 장부를 다시 확인해.',date:'현재 날짜와 징세 기록을 확인해 줘.'}[result.reason]||'지금은 처리할 수 없어. 기록을 확인해 줘.'),'normal');
}
panel.addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b||b.disabled||state.busy)return;
 if(b.hasAttribute('data-close'))closeLedger();
 else if(b.hasAttribute('data-arrears'))reaction('이전 날짜의 세금이 남아 있네. 최근 일주일 안의 미납만 정리하면 돼. 추가 벌금은 없어.','displeased');
 else if(b.hasAttribute('data-bonus'))void attempt({type:'bonus'});
 else if(b.dataset.pay)void attempt({type:b.dataset.pay,date:b.dataset.date});
});
const previousClose=closeResidentDialogue;
closeResidentDialogue=function(){if(state.ledger)return closeLedger();return previousClose();};
window.GensokyoTax=Object.freeze({
 openFromJoon(){if(state.busy||residentDialogue.active)return false;const ok=GensokyoJoon.showDialogue({text:'어머, 납세하러 왔어? 좋아. 네 장부를 보여줄게.',expression:'normal',onClose:accepted=>{if(accepted)void openLedger();}});if(ok)$('residentNext').textContent='장부 보기';return ok;},
 closeLedger,refresh,get isLedgerOpen(){return state.ledger;},get busy(){return state.busy;},
 getState:()=>({ledger:state.ledger,busy:state.busy,error:state.error,available:state.available,today:today(),data:slot===undefined?null:structuredClone(slot)})
});
await refresh();
setInterval(()=>{if(!state.busy&&state.available&&slot?.through!==today())void refresh();},15000);
window.addEventListener('focus',()=>{if(!state.busy&&slot?.through!==today())void refresh();});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!state.busy&&slot?.through!==today())void refresh();});
window.dispatchEvent(new Event('gensokyo-tax-ready'));

// Exact next KST midnight, with the interval/focus checks as background-tab fallbacks.
function scheduleMidnight(){
 const delay=Math.max(1,Date.parse(today()+'T15:00:00Z')-clock());
 setTimeout(async()=>{if(!state.busy)await refresh();scheduleMidnight();},delay);
}
scheduleMidnight();
