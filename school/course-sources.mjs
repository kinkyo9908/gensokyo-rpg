// Read the existing battle configuration as data. Never execute embedded scripts,
// copy battle romaji aliases, mutate the source, or deduplicate learning entries.
const totals=Object.freeze({2:105,3:82,4:82,5:80});
export function readBattleCourse(source,number){
 if(typeof source!=='string'||!Object.hasOwn(totals,number))throw new Error('교본 원본 없음');
 const marker='const ENEMY_CONFIGS=',start=source.indexOf(marker)+marker.length;
 if(start<marker.length||source[start]!=='[')throw new Error('전투 단어 배열 없음');
 let depth=0,quoted=false,escaped=false,end=-1;
 for(let i=start;i<source.length;i++){
  const c=source[i];if(quoted){if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c==='"')quoted=false;continue;}
  if(c==='"')quoted=true;else if(c==='[')depth++;else if(c===']'&&--depth===0){end=i+1;break;}
 }
 if(end<0)throw new Error('전투 단어 배열 불완전');
 const enemies=JSON.parse(source.slice(start,end));
 if(!Array.isArray(enemies)||enemies.length!==4||!enemies.every(e=>Array.isArray(e.pool)))throw new Error('일반전 범위 오류');
 const words=enemies.flatMap(e=>e.pool);
 if(words.length!==totals[number])throw new Error('교본 개수 불일치');
 return {sourceTotal:totals[number],enabledCount:totals[number],entries:words.map((w,i)=>({id:w.id,sourceOrdinal:i+1,spelling:w.word,readings:w.readings,meanings:w.meanings,...(w.sourceMeanings?{sourceMeanings:w.sourceMeanings}:{})}))};
}
