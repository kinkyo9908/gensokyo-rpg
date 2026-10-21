// Additive school-only save schema. No rewards or battle-vocabulary mutations.
const object=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
const integer=(v,max)=>Number.isSafeInteger(v)&&v>=0&&v<=max;
const bookKey=k=>typeof k==='string'&&/^volume-[1-9][0-9]{0,3}$/.test(k);
const fail=()=>{throw new Error('서당 학습 기록 형식을 확인할 수 없습니다. 기존 기록은 유지됩니다.');};
export function validateSchoolLearning(value){
 if(!object(value)||value.version!==1||!object(value.books)||Object.keys(value.books).length>200)fail();
 if(value.lastBookId!==null&&(!bookKey(value.lastBookId)||!Object.hasOwn(value.books,value.lastBookId)))fail();
 for(const[id,b]of Object.entries(value.books)){
  if(!bookKey(id)||!object(b)||b.bookId!==id||!integer(b.total,10000)||b.total<1||!integer(b.lastGradedIndex,b.total)||b.completed!==(b.lastGradedIndex===b.total)||!Array.isArray(b.milestonesSeen)||!object(b.results))fail();
  const milestones=b.milestonesSeen;if(new Set(milestones).size!==milestones.length||milestones.some(n=>!integer(n,b.lastGradedIndex)||n<10||n%10!==0||n>=b.total))fail();
  const entries=Object.entries(b.results);if(entries.length!==b.lastGradedIndex)fail();
  for(const[k,r]of entries){if(!/^[1-9][0-9]*$/.test(k)||!integer(Number(k),b.lastGradedIndex)||!object(r)||(r.readingCorrect!==null&&typeof r.readingCorrect!=='boolean')||typeof r.meaningCorrect!=='boolean')fail();}
 }
 return value;
}
export const emptySchoolLearning=()=>({version:1,lastBookId:null,books:{}});
export class SchoolLearningStore{
 constructor({initial,publish,save}){this.publish=publish;this.save=save;this.published=initial;this.error='';this.available=true;try{this.state=initial===undefined?emptySchoolLearning():structuredClone(validateSchoolLearning(initial));}catch(e){this.available=false;this.error=e.message;this.state=null;}}
 get lastBookId(){return this.state?.lastBookId??null;}
 read(id){return this.state?.books[id]?structuredClone(this.state.books[id]):null;}
 commit(id,total,position,result){
  if(!this.available)return{ok:false,error:this.error};
  if(!bookKey(id)||!integer(total,10000)||total<1||!integer(position,total)||position<1||(result.readingCorrect!==null&&typeof result.readingCorrect!=='boolean')||typeof result.meaningCorrect!=='boolean')return{ok:false,error:'학습 항목의 위치와 판정을 확인해 줘.'};
  const old=this.state,book=old.books[id]??{bookId:id,total,lastGradedIndex:0,completed:false,milestonesSeen:[],results:{}};
  if(book.total!==total)return{ok:false,error:'교본 구성이 저장 기록과 달라. 기록을 유지하고 수업을 중단했어.'};
  if(position<=book.lastGradedIndex)return{ok:true,duplicate:true,milestone:false,completed:book.completed};
  if(position!==book.lastGradedIndex+1)return{ok:false,error:'진도가 바뀌었어. 책장에서 이어 학습을 다시 선택해 줘.'};
  const next=structuredClone(old),b=structuredClone(book);b.lastGradedIndex=position;b.completed=position===total;b.results[String(position)]={readingCorrect:result.readingCorrect,meaningCorrect:result.meaningCorrect};
  const milestone=position%10===0&&position<total&&!b.milestonesSeen.includes(position);if(milestone)b.milestonesSeen.push(position);
  next.books[id]=b;next.lastBookId=id;validateSchoolLearning(next);
  try{this.publish(next);if(this.save()!==true)throw new Error('로컬 저장을 완료하지 못했어. 다른 창의 기록이나 저장 공간을 확인하고 다시 시도해 줘.');this.state=next;this.published=next;this.error='';return{ok:true,duplicate:false,milestone,completed:b.completed};}
  catch(e){this.publish(this.published);this.error=e.message;return{ok:false,error:this.error};}
 }
}
