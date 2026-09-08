export const STORE_KEY = 'little-learning-adventures-v1';
export const PROFILE_IDS = ['anastasia', 'vivian'];
export const TOTAL_DAYS = 60;
export const STEP_COUNT = 8;

export function defaultState() {
  return {version: 1, activeProfile: null, settings: {sound: true, autoRead: true, rate: 0.83, voice: ''}, profiles: Object.fromEntries(PROFILE_IDS.map(id => [id, {day:1, step:0, completed:[], touchedAt:null}]))};
}
export function normalizeState(input) {
  const output = defaultState();
  if (!input || input.version !== 1) return output;
  if (PROFILE_IDS.includes(input.activeProfile)) output.activeProfile = input.activeProfile;
  if (input.settings && typeof input.settings === 'object') {
    for (const key of ['sound','autoRead']) if (typeof input.settings[key] === 'boolean') output.settings[key] = input.settings[key];
    if (typeof input.settings.voice === 'string') output.settings.voice = input.settings.voice.slice(0,240);
    if (Number.isFinite(input.settings.rate)) output.settings.rate = Math.max(0.65, Math.min(1.05,input.settings.rate));
  }
  for (const id of PROFILE_IDS) {
    const p = input.profiles?.[id];
    if (!p || typeof p !== 'object') continue;
    output.profiles[id] = {
      day: Number.isInteger(p.day) ? Math.max(1,Math.min(TOTAL_DAYS,p.day)) : 1,
      step: Number.isInteger(p.step) ? Math.max(0,Math.min(STEP_COUNT-1,p.step)) : 0,
      completed: Array.isArray(p.completed) ? [...new Set(p.completed.filter(n => Number.isInteger(n) && n>=1 && n<=TOTAL_DAYS))].sort((a,b)=>a-b) : [],
      touchedAt: typeof p.touchedAt === 'string' ? p.touchedAt.slice(0,40) : null
    };
  }
  return output;
}
export function loadState(storage) {
  try {return normalizeState(JSON.parse(storage.getItem(STORE_KEY)));} catch {return defaultState();}
}
export function saveState(storage,state) {
  try {storage.setItem(STORE_KEY,JSON.stringify(normalizeState(state)));return true;} catch {return false;}
}
export function finishDay(state,id,day) {
  if (!PROFILE_IDS.includes(id) || !Number.isInteger(day) || day<1 || day>TOTAL_DAYS) throw new Error('Invalid day');
  const next=normalizeState(state);const p=next.profiles[id];
  p.completed=[...new Set([...p.completed,day])].sort((a,b)=>a-b);
  p.day=day<TOTAL_DAYS ? day+1 : TOTAL_DAYS;p.step=0;p.touchedAt=new Date().toISOString();return next;
}
export function pickDay(state,id,day) {
  if (!PROFILE_IDS.includes(id) || !Number.isInteger(day) || day<1 || day>TOTAL_DAYS) throw new Error('Invalid day');
  const next=normalizeState(state);next.activeProfile=id;next.profiles[id].day=day;next.profiles[id].step=0;return next;
}
export function escapeHtml(value='') {return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
export function speechText(value='') {
  return String(value).replace(/<[^>]*>/g,' ').replace(/\bCVC\b/g,'simple three sound').replace(/\bSEL\b/g,'feelings and friendship').replace(/_+/g,'blank').replace(/\s*->\s*/g,', ').replace(/\/([^/]+)\//g,'$1').replace(/\s+/g,' ').trim();
}
export function letterName(letter) {return String(letter).toUpperCase();}
export function dayWords(day) {
  const g=day.letterGame || {};const source=Array.isArray(g.letters) ? g.letters : [];
  return source.length ? source.map(l=>typeof l==='string'?{lower:l.toLowerCase(),upper:l.toUpperCase(),word:day.letterWord||''}:{lower:l.lowercase||l.lower||l.letter||'a',upper:l.uppercase||l.upper||String(l.lowercase||l.lower||l.letter||'a').toUpperCase(),word:l.modelWord||l.model_word||l.word||'',soundDescription:l.soundDescription||l.parent_note||''}) : [{lower:String(day.letter||'a').toLowerCase(),upper:String(day.letter||'a').toUpperCase(),word:day.letterWord||'apple'}];
}
export function letterChoices(target,seed=1) {
  const lower=String(target).toLowerCase();const candidates=['m','s','a','t','p','v','d','o','n','b'].filter(x=>x!==lower);
  const chosen=[lower,candidates[seed%candidates.length],candidates[(seed+3)%candidates.length]];
  return chosen.map((x,i)=>({key:(i*7+seed)%11,value:x})).sort((a,b)=>a.key-b.key).map(x=>x.value);
}
export function fallbackMath(day,young=false) {
  const n=Math.max(0,Math.min(20,Number(day.number??1)));
  return [{kind:'count',count:n,answer:n,prompt:young?'Touch each ball. Let’s count together.':'Touch each ball once. How many are there?',choices:[...new Set([Math.max(0,n-1),n,n+1])]}];
}
export function safeBackup(text) {
  if (typeof text!=='string'||text.length>250000) throw new Error('This backup is too large.');
  const data=JSON.parse(text);
  if (!data||data.version!==1||!data.profiles||!PROFILE_IDS.every(id=>data.profiles[id] && Array.isArray(data.profiles[id].completed))) throw new Error('Choose a Little Learning progress backup.');
  return normalizeState(data);
}
