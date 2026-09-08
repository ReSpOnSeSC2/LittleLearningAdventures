import {speechText} from './core.js';
let current=null, token=0;
export function stopVoice(){token++;if('speechSynthesis' in window)window.speechSynthesis.cancel();current=null;document.body.classList.remove('buddy-speaking');}
export function voices(){return ('speechSynthesis' in window ? window.speechSynthesis.getVoices():[]).filter(v=>/^en(-|_)/i.test(v.lang));}
export function say(text,settings={},onError=()=>{}) {
  stopVoice();if(!settings.sound)return;
  if(!('speechSynthesis' in window)){onError('Read together: spoken directions are not available in this browser.');return;}
  const raw=speechText(text);if(!raw)return;
  const parts=raw.match(/[^.!?]+[.!?]+|[^.!?]+$/g)||[raw];const utteranceToken=token;
  const available=voices();const voice=available.find(v=>v.voiceURI===settings.voice)||available.find(v=>v.localService && /^en-US/i.test(v.lang))||available.find(v=>v.localService)||available.find(v=>/^en-US/i.test(v.lang))||available[0];
  let i=0;
  function next(){
    if(token!==utteranceToken)return;
    if(i>=parts.length){document.body.classList.remove('buddy-speaking');return;}
    const u=new SpeechSynthesisUtterance(parts[i++].trim());current=u;u.lang=voice?.lang||'en-US';if(voice)u.voice=voice;u.rate=settings.rate||0.83;u.pitch=1.06;
    u.onstart=()=>{if(token===utteranceToken)document.body.classList.add('buddy-speaking');};
    u.onend=next;u.onerror=e=>{if(token!==utteranceToken)return;document.body.classList.remove('buddy-speaking');if(!['canceled','interrupted'].includes(e.error))onError('You can read the words together. Check the phone’s speech settings for a voice.');};
    window.speechSynthesis.speak(u);
  }
  next();
}
