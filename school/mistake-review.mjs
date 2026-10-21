// Only current candidate/target identities are persisted. Opportunity tickets,
// queue order and UI answers live in memory and are never serialized.
export const emptyMistakes=()=>({version:1,candidates:[],targets:[]});
export function validateMistakes(value){
 const validKey=k=>typeof k==='string'&&/^volume-[1-5]:(?:ordinal-[1-9]\d{0,2}|stage[2-5]-[1-9]\d{0,2})$/.test(k);
 if(!value||value.version!==1||Object.keys(value).sort().join(',')!=='candidates,targets,version'||!Array.isArray(value.candidates)||!Array.isArray(value.targets))throw new Error('오답 목록 형식을 확인할 수 없습니다. 기존 기록은 유지됩니다.');
 const all=[...value.candidates,...value.targets];if(all.length>450||all.some(k=>!validKey(k))||new Set(all).size!==all.length)throw new Error('오답 항목 식별자를 확인할 수 없습니다. 기존 기록은 유지됩니다.');
 return value;
}
export class MistakeStore{
 constructor({initial,keys,publish,save,onChange=()=>{}}){this.publish=publish;this.save=save;this.onChange=onChange;this.keys=new Set(keys);this.tickets=new WeakSet();this.available=true;this.dirty=false;this.error='';try{this.state=structuredClone(initial===undefined?emptyMistakes():validateMistakes(initial));if([...this.state.candidates,...this.state.targets].some(k=>!this.keys.has(k)))throw new Error('현재 교본에 없는 오답 항목이 있어 기존 기록을 유지했어.');}catch(e){this.available=false;this.error=e.message;this.state=null;}}
 read(){return this.state?structuredClone(this.state):null;}
 flush(){if(!this.available)return false;if(!this.dirty)return true;try{this.publish(structuredClone(this.state));if(this.save()!==true)throw new Error('오답 목록 저장 대기 중이야. 이 창을 닫기 전에 다시 저장해 줘.');this.dirty=false;this.error='';}catch(e){this.error=e.message;}this.onChange(this.error);return !this.dirty;}
 update(next){validateMistakes(next);this.state=next;this.dirty=true;this.flush();return true;}
 observe(key,opportunity,success){if(!this.available||!this.keys.has(key)||!opportunity||typeof opportunity!=='object'||typeof success!=='boolean'||this.tickets.has(opportunity))return false;this.tickets.add(opportunity);
  const next=this.read();if(next.targets.includes(key))return true;const i=next.candidates.indexOf(key);
  if(success){if(i<0)return true;next.candidates.splice(i,1);}else if(i>=0){next.candidates.splice(i,1);next.targets.push(key);}else next.candidates.push(key);
  return this.update(next);
 }
 graduate(key){if(!this.available||!this.state.targets.includes(key))return false;const next=this.read();next.targets=next.targets.filter(k=>k!==key);return this.update(next);}
}
export class MistakeSession{
 constructor({getPool,store,grade,random=Math.random}){Object.assign(this,{getPool,store,grade,random});this.pending=[];this.seen=new Set();this.lastKey=null;this.current=null;this.outcome=null;this.round=0;}
 next(){const map=new Map(this.getPool().map(item=>[item.key,item]));this.pending=this.pending.filter(k=>map.has(k)&&!this.seen.has(k));const queued=new Set(this.pending);this.pending.push(...[...map.keys()].filter(k=>!this.seen.has(k)&&!queued.has(k)));
  if(!map.size){this.current=null;this.outcome=null;return null;}
  if(!this.pending.length){this.seen.clear();this.pending=[...map.keys()];this.round++;}else if(!this.round)this.round=1;
  for(let i=this.pending.length-1;i>0;i--){const j=Math.floor(this.random()*(i+1));[this.pending[i],this.pending[j]]=[this.pending[j],this.pending[i]];}
  if(this.pending.length>1&&this.pending.at(-1)===this.lastKey){const i=this.pending.findIndex(k=>k!==this.lastKey);[this.pending[i],this.pending[this.pending.length-1]]=[this.pending.at(-1),this.pending[i]];}
  const key=this.pending.pop();this.seen.add(key);this.lastKey=key;this.current=map.get(key);this.outcome=null;return this.current;
 }
 submit(answer){if(!this.current||this.outcome)return{locked:true};const result=this.grade(this.current.word,answer);if(result.reading&&result.meaning){if(!this.store.graduate(this.current.key))return{locked:true};this.outcome='correct';}return{...result,outcome:this.outcome};}
 reveal(){if(!this.current||this.outcome)return false;this.outcome='revealed';return true;}
}
