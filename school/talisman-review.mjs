// Session-only review model. No access to save managers, currency, or battle data.
export function shuffle(values,random=Math.random){
 const result=[...values];for(let i=result.length-1;i>0;i--){const r=random();if(!Number.isFinite(r)||r<0||r>=1)throw new Error('Invalid random source');const j=Math.floor(r*(i+1));[result[i],result[j]]=[result[j],result[i]];}return result;
}
export function learnedPool(courses,readProgress){
 const pool=[];for(const course of courses){const record=readProgress(course.id);if(!record||record.total!==course.total||!Number.isInteger(record.lastGradedIndex)||record.lastGradedIndex<0||record.lastGradedIndex>course.words.length)continue;
  for(let i=0;i<record.lastGradedIndex;i++){if(!Object.hasOwn(record.results??{},String(i+1)))continue;const word=course.words[i],itemId=word.id??'ordinal-'+(i+1);pool.push(Object.freeze({key:course.id+':'+itemId,bookId:course.id,itemId,position:i+1,word}));}
 }return pool;
}
export class TalismanReview{
 constructor({getPool,grade,random=Math.random}){this.getPool=getPool;this.grade=grade;this.random=random;this.records=new Map();this.reset();}
 reset(){this.current=null;this.pending=[];this.seen=new Set();this.lastKey=null;this.round=0;this.wrongAttempts=0;this.outcome=null;this.total=0;}
 next(){
  const map=new Map(this.getPool().map(item=>[item.key,item]));this.total=map.size;
  // Reconcile changes at question boundaries: remove unavailable entries and
  // include newly learned entries without reusing already seen entries this round.
  this.pending=this.pending.filter(k=>map.has(k)&&!this.seen.has(k));
  const queued=new Set(this.pending),added=[...map.keys()].filter(k=>!this.seen.has(k)&&!queued.has(k));
  if(added.length)this.pending=shuffle([...this.pending,...added],this.random);
  if(!map.size){this.current=null;this.outcome=null;return null;}
  if(!this.pending.length){this.seen.clear();this.pending=shuffle([...map.keys()],this.random);this.round++;}
  else if(this.round===0)this.round=1;
  if(this.pending.length>1&&this.pending.at(-1)===this.lastKey){const i=this.pending.findIndex(k=>k!==this.lastKey);[this.pending[i],this.pending[this.pending.length-1]]=[this.pending.at(-1),this.pending[i]];}
  const key=this.pending.pop();this.seen.add(key);this.lastKey=key;this.current=map.get(key);this.wrongAttempts=0;this.outcome=null;return this.current;
 }
 finish(outcome){
  if(!this.current||this.outcome)return false;this.outcome=outcome;
  const item=this.current,record=this.records.get(item.key)??{bookId:item.bookId,itemId:item.itemId,position:item.position,firstCorrect:0,retryCorrect:0,revealed:0,lastOutcome:null};
  const field={first_correct:'firstCorrect',retry_correct:'retryCorrect',revealed:'revealed'}[outcome];
  if(!field)throw new Error('Unknown review result');record[field]=Math.min(Number.MAX_SAFE_INTEGER,record[field]+1);record.lastOutcome=outcome;this.records.set(item.key,record);return true;
 }
 submit(answer){
  if(!this.current||this.outcome)return{locked:true};const result=this.grade(this.current.word,answer);
  if(result.reading&&result.meaning){const outcome=this.wrongAttempts?'retry_correct':'first_correct';this.finish(outcome);return{...result,outcome};}
  this.wrongAttempts=Math.min(Number.MAX_SAFE_INTEGER,this.wrongAttempts+1);return{...result,outcome:null};
 }
 reveal(){return this.finish('revealed');}
 getRecords(){return Object.fromEntries([...this.records].map(([key,value])=>[key,{...value}]));}
}
