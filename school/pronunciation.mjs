// School-only, ephemeral speech. No spelling inference, answer grading, storage,
// audio-setting changes or automatic playback (including after voiceschanged).
export function registeredReadings(word){
 const source=Array.isArray(word?.readings)?word.readings:typeof word?.reading==='string'?[word.reading]:[];
 if(!source.length||source.some(r=>typeof r!=='string'||!r||r.length>100||!/^([ぁ-ゖゝゞー]|[ァ-ヺヽヾ])+$/u.test(r)))return{readings:[],error:'등록된 읽기를 확인할 수 없어 발음을 재생하지 않았어.'};
 return{readings:[...new Set(source)],error:''};
}
const japanese=voice=>typeof voice?.lang==='string'&&/^ja(?:-|$)/i.test(voice.lang.replaceAll('_','-'));
export function japaneseVoice(voices){return [...voices].filter(japanese).sort((a,b)=>Number(b.localService===true)-Number(a.localService===true)||Number(b.lang.toLowerCase().replaceAll('_','-')==='ja-jp')-Number(a.lang.toLowerCase().replaceAll('_','-')==='ja-jp')||Number(b.default===true)-Number(a.default===true))[0]??null;}
export class SchoolPronunciation{
 constructor(host=globalThis){this.host=host;this.synth=host.speechSynthesis;this.current=null;this.generation=0;this.listeners=new Set();this.guardTimer=null;this.startTimer=null;
  this.voicesChanged=()=>{for(const listener of this.listeners)listener();};
  this.synth?.addEventListener?.('voiceschanged',this.voicesChanged);
  this.onHidden=()=>{if(host.document?.hidden)this.stop();};this.onExit=()=>this.stop();
  host.document?.addEventListener?.('visibilitychange',this.onHidden);host.addEventListener?.('pagehide',this.onExit);
 }
 supported(){return !!this.synth&&typeof this.synth.getVoices==='function'&&typeof this.synth.speak==='function'&&typeof this.synth.cancel==='function'&&typeof this.host.SpeechSynthesisUtterance==='function';}
 availability(){if(!this.supported())return{available:false,unsupported:true,message:'이 브라우저는 발음 듣기를 지원하지 않아.'};try{const voice=japaneseVoice(this.synth.getVoices());return voice?{available:true,voice,message:''}:{available:false,unsupported:false,message:'일본어 음성이 없어. 기기의 일본어 음성 설정을 확인한 뒤 다시 눌러 줘.'};}catch{return{available:false,unsupported:false,message:'음성 목록을 불러오지 못했어. 잠시 후 다시 눌러 줘.'};}}
 subscribe(listener){this.listeners.add(listener);return()=>this.listeners.delete(listener);}
 clearTimers(){if(this.guardTimer!==null)this.host.clearInterval(this.guardTimer);if(this.startTimer!==null)this.host.clearTimeout(this.startTimer);this.guardTimer=this.startTimer=null;}
 stop(){const current=this.current;this.generation++;this.current=null;this.clearTimers();if(current){current.onstart=current.onend=current.onerror=null;try{this.synth.cancel();}catch{}}}
 speak(reading,{allowed=()=>false,report=()=>{}}={}){
  // Called synchronously by the visible pronunciation button. Never defer speak
  // into an async voice-list handler: user activation must belong to this click.
  if(!allowed())return false;
  if(registeredReadings({readings:[reading]}).error){report('등록된 읽기를 확인할 수 없어 발음을 재생하지 않았어.');return false;}
  const availability=this.availability();if(!availability.available){this.stop();report(availability.message);return false;}
  this.stop();const generation=this.generation;let utterance;
  const valid=()=>generation===this.generation&&this.current===utterance&&allowed();
  const finish=message=>{if(!valid())return;this.current=null;this.clearTimers();report(message);};
  try{
   utterance=new this.host.SpeechSynthesisUtterance(reading);utterance.lang='ja-JP';utterance.voice=availability.voice;utterance.rate=.85;utterance.pitch=1;utterance.volume=1;
   utterance.onstart=()=>{if(!valid())return;if(this.startTimer!==null)this.host.clearTimeout(this.startTimer);this.startTimer=null;report('일본어 발음 재생 중');};
   utterance.onend=()=>finish('다시 들으려면 발음 버튼을 눌러 줘.');
   utterance.onerror=event=>finish(event.error==='not-allowed'?'브라우저의 음성 재생을 허용한 뒤 다시 눌러 줘.':event.error==='network'?'음성을 재생하지 못했어. 연결을 확인한 뒤 다시 눌러 줘.':'발음을 재생하지 못했어. 일본어 음성 설정을 확인한 뒤 다시 눌러 줘.');
   this.current=utterance;report('일본어 발음을 준비하고 있어.');
   this.guardTimer=this.host.setInterval(()=>{if(!valid())this.stop();},150);
   this.startTimer=this.host.setTimeout(()=>{if(!valid())return;this.stop();report('음성 엔진이 응답하지 않았어. 일본어 음성 설정을 확인한 뒤 다시 눌러 줘.');},12000);
   // Retain the utterance until end/error/cancel so engines cannot collect it.
   if(this.synth.paused&&typeof this.synth.resume==='function')this.synth.resume();
   this.synth.speak(utterance);return true;
  }catch{this.stop();report('발음을 재생하지 못했어. 일본어 음성 설정을 확인한 뒤 다시 눌러 줘.');return false;}
 }
 destroy(){this.stop();this.listeners.clear();this.synth?.removeEventListener?.('voiceschanged',this.voicesChanged);this.host.document?.removeEventListener?.('visibilitychange',this.onHidden);this.host.removeEventListener?.('pagehide',this.onExit);}
}
