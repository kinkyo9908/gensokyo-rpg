/* Calendar and ledger rules only. No browser, storage, rewards outside taxation. */
export const CROPS=Object.freeze(['radish','carrot','potato','cabbage']);
const DAY=86400000,own=(o,k)=>Object.hasOwn(o,k);
const object=o=>!!o&&typeof o==='object'&&!Array.isArray(o);
const fail=()=>{throw new Error('징세 기록 형식을 확인할 수 없습니다. 기존 기록을 유지합니다.');};
export function dayNumber(s){
 if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s))fail();
 const t=Date.parse(s+'T00:00:00Z');
 if(!Number.isFinite(t)||new Date(t).toISOString().slice(0,10)!==s||s<'2000-01-01'||s>'9998-12-31')fail();
 return t/DAY;
}
export const dateAt=n=>new Date(n*DAY).toISOString().slice(0,10);
export function seoulDate(now=Date.now()){
 const p=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(now));
 const v=Object.fromEntries(p.map(x=>[x.type,x.value]));return v.year+'-'+v.month+'-'+v.day;
}
export function requirement(start,date){
 const n=dayNumber(date)-dayNumber(start)+1;if(n<1)fail();
 return {day:n,money:Math.min(220,80+10*Math.floor((n-1)/3)),quantity:n<=14?1:n<=42?2:3};
}
export function validateTax(value){
 if(!object(value)||value.version!==1||!Array.isArray(value.pending)||value.pending.length>7||!object(value.payments)||!Array.isArray(value.bonusDays))fail();
 const start=dayNumber(value.startDate),through=dayNumber(value.through);if(through<start)fail();
 for(const [date,bits] of Object.entries(value.payments))if(dayNumber(date)<start||dayNumber(date)>through||![1,2,3].includes(bits))fail();
 let previous='';const dates=new Set();
 for(const r of value.pending){
  if(!object(r)||dayNumber(r.date)<Math.max(start,through-6)||dayNumber(r.date)>through||r.date<=previous||dates.has(r.date)||!CROPS.includes(r.crop))fail();
  const q=requirement(value.startDate,r.date);if(r.money!==q.money||r.quantity!==q.quantity||(value.payments[r.date]??0)===3)fail();
  previous=r.date;dates.add(r.date);
 }
 for(let d=Math.max(start,through-6);d<=through;d++){const date=dateAt(d);if(!dates.has(date)&&value.payments[date]!==3)fail();}
 previous='';for(const d of value.bonusDays){if(dayNumber(d)<start||dayNumber(d)>through||d<=previous||value.payments[d]!==3)fail();previous=d;}
 return value;
}
export function randomCrop(){const n=new Uint32Array(1);globalThis.crypto.getRandomValues(n);return CROPS[Math.floor(n[0]/4294967296*4)];}
export function accrue(initial,today=seoulDate(),choose=randomCrop){
 const current=dayNumber(today);
 const state=initial===undefined?{version:1,startDate:today,through:today,pending:[],payments:{},bonusDays:[]}:structuredClone(validateTax(initial));
 if(initial!==undefined&&current<dayNumber(state.through))return {state,changed:false,clockBack:true};
 if(initial!==undefined&&today===state.through)return {state,changed:false,clockBack:false};
 const start=dayNumber(state.startDate),last=initial===undefined?current-1:dayNumber(state.through);
 const cutoff=Math.max(start,current-6);state.pending=state.pending.filter(r=>dayNumber(r.date)>=cutoff);
 for(let d=Math.max(cutoff,last+1);d<=current;d++){
  const date=dateAt(d),q=requirement(state.startDate,date),crop=choose(date);
  if(!CROPS.includes(crop))throw new Error('지정 농작물을 확인할 수 없습니다.');
  state.pending.push({date,money:q.money,crop,quantity:q.quantity});
 }
 state.through=today;validateTax(state);return {state,changed:true,clockBack:false};
}
export function applyTax(initial,wallet,action,today=seoulDate()){
 const state=structuredClone(validateTax(initial));
 if(today!==state.through)return {ok:false,reason:'date'};
 if(!object(wallet)||!object(wallet.produce)||![wallet.money,wallet.bongma,...CROPS.map(k=>wallet.produce[k])].every(n=>Number.isSafeInteger(n)&&n>=0))return{ok:false,reason:'wallet'};
 const next=structuredClone(wallet);
 if(action.type==='bonus'){
  if(state.bonusDays.includes(today))return {ok:false,reason:'claimed'};
  if(state.pending.length||state.payments[today]!==3)return {ok:false,reason:'unpaid'};
  if(!Number.isSafeInteger(next.bongma+2))return{ok:false,reason:'overflow'};
  state.bonusDays.push(today);next.bongma+=2;validateTax(state);return{ok:true,state,wallet:next,type:'bonus',amount:2};
 }
 const row=state.pending.find(r=>r.date===action.date),bit=action.type==='money'?1:action.type==='crop'?2:0;
 if(!row||!bit)return {ok:false,reason:'missing'};
 const bits=state.payments[row.date]??0;if(bits&bit)return {ok:false,reason:'paid'};
 if(bit===1){if(next.money<row.money)return{ok:false,reason:'money',row};next.money-=row.money;}
 else {if(next.produce[row.crop]<row.quantity)return{ok:false,reason:'crop',row};next.produce[row.crop]-=row.quantity;}
 state.payments[row.date]=bits|bit;if((bits|bit)===3)state.pending=state.pending.filter(r=>r.date!==row.date);
 validateTax(state);return {ok:true,state,wallet:next,type:action.type,row};
}
