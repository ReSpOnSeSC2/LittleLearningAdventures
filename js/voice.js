import {speechText} from './core.js';
let current=null, token=0;
export function stopVoice(){token++;if('speechSynthesis' in window)window.speechSynthesis.cancel();current=null;document.body.classList.remove('buddy-speaking');}
export function voices(){return ('speechSynthesis' in window ? window.speechSynthesis.getVoices():[]).filter(v=>/^en(-|_)/i.test(v.lang));}
function pickVoice(settings){const available=voices();return available.find(v=>v.voiceURI===settings.voice)||available.find(v=>v.localService && /^en-US/i.test(v.lang))||available.find(v=>v.localService)||available.find(v=>/^en-US/i.test(v.lang))||available[0];}
/* Speak a list of short phrases one after another, telling the caller which one is playing (used to light up each picture as its word is said). */
export function sayList(items,settings={},onItem=()=>{},onError=()=>{},gap=280){
  stopVoice();if(!settings.sound){onItem(-1);return;}
  if(!('speechSynthesis' in window)){onItem(-1);onError('Read together: spoken directions are not available in this browser.');return;}
  const utteranceToken=token;const voice=pickVoice(settings);let i=0;
  const finish=()=>{document.body.classList.remove('buddy-speaking');onItem(-1);};
  function next(){
    if(token!==utteranceToken)return;
    if(i>=items.length){finish();return;}
    const idx=i++;const text=speechText(items[idx]);if(!text){next();return;}
    const u=new SpeechSynthesisUtterance(text);current=u;u.lang=voice?.lang||'en-US';if(voice)u.voice=voice;u.rate=settings.rate||0.83;u.pitch=1.06;
    let ended=false;const guard=setTimeout(()=>go(),2500+text.length*160);const go=()=>{if(ended)return;ended=true;clearTimeout(guard);setTimeout(next,gap);};
    u.onstart=()=>{if(token!==utteranceToken)return;document.body.classList.add('buddy-speaking');onItem(idx);};
    u.onend=go;u.onerror=e=>{if(token!==utteranceToken)return;if(['canceled','interrupted'].includes(e.error))return;finish();onError('You can read the words together. Check the phone’s speech settings for a voice.');};
    window.speechSynthesis.speak(u);
  }
  next();
}
export function say(text,settings={},onError=()=>{}) {
  stopVoice();if(!settings.sound)return;
  if(!('speechSynthesis' in window)){onError('Read together: spoken directions are not available in this browser.');return;}
  const raw=speechText(text);if(!raw)return;
  const parts=raw.match(/[^.!?]+[.!?]+|[^.!?]+$/g)||[raw];const utteranceToken=token;
  const voice=pickVoice(settings);
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
