/**
 * Kindergarten 36-week adventure: pure logic, no DOM.
 * Plans each day from data/k36.json, generates game items, and keeps progress.
 * No network, tracking, or identifiers beyond the local learner id.
 */
export const K36_KEY = 'little-learning-k36-v1';
export const WEEKS = 36;
export const DAYS = 5;

export const STATION_INFO = {
  sounds: {title: 'Sound Studio', icon: 'ear', color: '#e64980', say: 'Sound Studio. Letters and their sounds.'},
  listen: {title: 'Listen & Play', icon: 'musical-notes', color: '#f76707', say: 'Listen and play. Use your ears!'},
  read: {title: 'Read It', icon: 'open-book', color: '#7048e8', say: 'Read it. Tap each sound, then swoop.'},
  build: {title: 'Build Words', icon: 'building-construction', color: '#d9480f', say: 'Build words with letter tiles.'},
  heart: {title: 'Heart Words', icon: 'red-heart', color: '#e03131', say: 'Heart words. Learn them by heart.'},
  numbers: {title: 'Number Fun', icon: 'abacus', color: '#1c7ed6', say: 'Number fun!'},
  story: {title: 'Story Time', icon: 'books', color: '#0c8599', say: 'Story time. Let’s read together.'},
  talk: {title: 'Talk Time', icon: 'speaking-head', color: '#2f9e44', say: 'Talk time with your grown-up.'}
};
export const STATION_IDS = Object.keys(STATION_INFO);

export const STICKERS = {
  1: ['unicorn', 'rainbow', 'sparkles', 'glowing-star', 'cherry-blossom', 'butterfly', 'balloon', 'gem-stone', 'crown', 'shooting-star'],
  2: ['dog-face', 'cat-face', 'rabbit-face', 'hamster', 'turtle', 'tropical-fish', 'hatching-chick', 'horse-face', 'teddy-bear', 'frog'],
  3: ['dolphin', 'spouting-whale', 'tropical-fish', 'crab', 'seal', 'spiral-shell', 'sailboat', 'beach-with-umbrella', 'goggles', 'person-swimming'],
  4: ['tennis', 'trophy', 'sports-medal', '1st-place-medal', 'soccer-ball', 'basketball', 'volleyball', 'running-shoe', 'star', 'glowing-star'],
  5: ['tulip', 'sunflower', 'blossom', 'four-leaf-clover', 'lady-beetle', 'honeybee', 'butterfly', 'strawberry', 'rainbow', 'bouquet'],
  6: ['rocket', 'ringed-planet', 'crystal-ball', 'magic-wand', 'dragon', 'sauropod', 'owl', 'panda', 'koala', 'milky-way']
};
export const PRAISE = ['You did it!', 'Super sounding!', 'Unicorn power!', 'Wow, great job!', 'Yes! Way to go!', 'Rainbow bright!', 'You are a star!', 'High five!'];

/* ------------------------------------------------------------------ random */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
export function shuffle(arr, r) { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const pick = (arr, r) => arr[Math.floor(r() * arr.length)];
const sample = (arr, n, r) => shuffle(arr, r).slice(0, n);
const uniq = arr => [...new Set(arr)];
const range = (a, b) => Array.from({length: b - a + 1}, (_, i) => a + i);
const clampInt = (v, lo, hi, dflt) => Number.isInteger(v) ? Math.max(lo, Math.min(hi, v)) : dflt;

/* ------------------------------------------------------------------ state */
export function defaultK36() {
  return {version: 1, week: 1, day: 1, days: {}, stickers: {}, speech: {targets: [], log: []}, settings: {breaks: true}, touchedAt: null};
}
export function normalizeK36(input) {
  const out = defaultK36();
  if (!input || typeof input !== 'object' || input.version !== 1) return out;
  out.week = clampInt(input.week, 1, WEEKS, 1);
  out.day = clampInt(input.day, 1, DAYS, 1);
  if (input.days && typeof input.days === 'object') {
    for (const [key, value] of Object.entries(input.days)) {
      if (!/^([1-9]|[12]\d|3[0-6])-[1-5]$/.test(key) || !value || typeof value !== 'object') continue;
      const done = Array.isArray(value.done) ? uniq(value.done.filter(id => STATION_IDS.includes(id))) : [];
      out.days[key] = {done, at: typeof value.at === 'string' ? value.at.slice(0, 40) : null};
    }
  }
  if (input.stickers && typeof input.stickers === 'object') {
    const all = new Set(Object.values(STICKERS).flat());
    for (const [key, value] of Object.entries(input.stickers)) if (/^([1-9]|[12]\d|3[0-6])-[1-5]$/.test(key) && all.has(value)) out.stickers[key] = value;
  }
  const sp = input.speech || {};
  if (Array.isArray(sp.targets)) out.speech.targets = uniq(sp.targets.filter(k => typeof k === 'string' && /^[a-z]{1,4}$/.test(k))).slice(0, 4);
  if (Array.isArray(sp.log)) {
    out.speech.log = sp.log.filter(e => e && /^\d{4}-\d{2}-\d{2}$/.test(e.d) && typeof e.k === 'string' && /^[a-z]{1,5}$/.test(e.k))
      .map(e => ({d: e.d, k: e.k, c: clampInt(e.c, 0, 999, 0), t: clampInt(e.t, 0, 999, 0)}))
      .filter(e => e.c <= e.t).slice(-600);
  }
  if (input.settings && typeof input.settings === 'object' && typeof input.settings.breaks === 'boolean') out.settings.breaks = input.settings.breaks;
  if (typeof input.touchedAt === 'string') out.touchedAt = input.touchedAt.slice(0, 40);
  return out;
}
export function loadK36(storage) { try { return normalizeK36(JSON.parse(storage.getItem(K36_KEY))); } catch { return defaultK36(); } }
export function saveK36(storage, st) { try { storage.setItem(K36_KEY, JSON.stringify(normalizeK36(st))); return true; } catch { return false; } }
export const dayKey = (w, d) => `${w}-${d}`;
export function doneStations(st, w, d) { return st.days[dayKey(w, d)]?.done || []; }
export function completeStation(st, w, d, id, now = new Date()) {
  if (!STATION_IDS.includes(id)) throw new Error('Unknown station');
  const next = normalizeK36(st); const key = dayKey(w, d);
  const rec = next.days[key] || {done: [], at: null};
  rec.done = uniq([...rec.done, id]); rec.at = now.toISOString();
  next.days[key] = rec; next.touchedAt = rec.at;
  return next;
}
export function isDayDone(st, plan) {
  const done = doneStations(st, plan.week, plan.day);
  return plan.stations.filter(s => s.required).every(s => done.includes(s.id));
}
export function stickerFor(w, d, unit) {
  const list = STICKERS[unit] || STICKERS[1];
  return list[((w - 1) * DAYS + (d - 1)) % list.length];
}
export function awardSticker(st, w, d, unit) {
  const next = normalizeK36(st); const key = dayKey(w, d);
  if (!next.stickers[key]) next.stickers[key] = stickerFor(w, d, unit);
  return next;
}
export function nextDay(w, d) {
  if (d < DAYS) return {week: w, day: d + 1};
  if (w < WEEKS) return {week: w + 1, day: 1};
  return {week: WEEKS, day: DAYS};
}
export function goToDay(st, w, d) {
  const next = normalizeK36(st); next.week = clampInt(w, 1, WEEKS, 1); next.day = clampInt(d, 1, DAYS, 1); return next;
}
export function isoDate(date = new Date()) {
  const y = date.getFullYear(), m = String(date.getMonth() + 1).padStart(2, '0'), d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
export function logSpeech(st, {k, c, t, date = new Date()}) {
  if (!Number.isInteger(c) || !Number.isInteger(t) || t <= 0 || c < 0 || c > t) return normalizeK36(st);
  const next = normalizeK36(st); const d = isoDate(date);
  const same = next.speech.log.find(e => e.d === d && e.k === k);
  if (same) { same.c = Math.min(999, same.c + c); same.t = Math.min(999, same.t + t); }
  else next.speech.log.push({d, k, c, t});
  next.speech.log = next.speech.log.slice(-600);
  return next;
}
export function speechSummary(st, days = 14, today = new Date()) {
  const since = new Date(today); since.setDate(since.getDate() - (days - 1));
  const from = isoDate(since); const by = {};
  for (const e of st.speech.log) {
    if (e.d < from) continue;
    const s = by[e.k] || (by[e.k] = {k: e.k, c: 0, t: 0, sessions: 0, last: e.d});
    s.c += e.c; s.t += e.t; s.sessions++; if (e.d > s.last) s.last = e.d;
  }
  return Object.values(by).map(s => ({...s, pct: s.t ? Math.round(100 * s.c / s.t) : 0})).sort((a, b) => a.k.localeCompare(b.k));
}

/* ------------------------------------------------------------------ helpers */
const letterName = g => g.split('').map(c => c.toUpperCase()).join(' ');
const pic = (data, w) => data.lex[w]?.i;
export function graphemeTiles(g) {
  // ['c','a_e','k','e_silent'] -> [{t:'c'},{t:'a',vce:true},{t:'k'},{t:'e',silent:true}]
  return g.map(x => x === 'e_silent' ? {t: 'e', silent: true} : /^[aeiou]_e$/.test(x) ? {t: x[0], vce: true} : {t: x === '-s' ? 's' : x});
}
function similarity(a, b) {
  let s = 0; for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] === b[i]) s++;
  return s - Math.abs(a.length - b.length);
}
const soundOf = (data, g) => data.sounds[g]?.snd || g;
const CK = new Set(['c', 'k', 'ck', 'qu']);
function letterDistractors(data, W, g, r, n = 2) {
  const known = W.known.filter(x => data.sounds[x] && x !== g);
  let pool = known.filter(x => soundOf(data, x) !== soundOf(data, g) && !(CK.has(g) && CK.has(x)));
  const confuse = (data.sounds[g]?.confuse || '').split(/[\s,/]+/).filter(x => pool.includes(x));
  const vowels = ['a', 'e', 'i', 'o', 'u'];
  const out = [];
  if (confuse.length) out.push(pick(confuse, r));
  if (vowels.includes(g)) pool = pool.filter(x => vowels.includes(x)).concat(pool.filter(x => !vowels.includes(x)));
  const clash = x => CK.has(x) && out.some(o => CK.has(o));
  for (const x of shuffle(pool, r)) { if (out.length >= n) break; if (!out.includes(x) && !clash(x)) out.push(x); }
  if (out.length < n) for (const x of ['m', 's', 't', 'a', 'p', 'o', 'd', 'n']) { if (out.length >= n) break; if (x !== g && !out.includes(x) && !(CK.has(g) && CK.has(x)) && soundOf(data, x) !== soundOf(data, g)) out.push(x); }
  return out.slice(0, n);
}
function wordChoicePics(data, answer, pool, r, n = 3, score = null) {
  let others = pool.filter(w => w !== answer && data.lex[w] && data.lex[w].i !== data.lex[answer]?.i);
  if (score) others = shuffle(others, r).sort((a, b) => score(b) - score(a));
  else others = shuffle(others, r);
  return shuffle([answer, ...others.slice(0, n - 1)], r).map(w => ({v: w, w, i: pic(data, w)}));
}

/* ------------------------------------------------------------------ sounds */
function introItem(data, g) {
  const s = data.sounds[g];
  const team = g.length > 1;
  return {type: 'intro', g, up: s.up, key: s.key, i: s.i, cue: s.cue, action: s.action, tip: s.tip, mouth: s.mouth,
    say: team ? `These letters work together: ${letterName(g)}. ${s.key} starts with ${letterName(g)}. ${s.key}.` : `This is ${letterName(g)}. ${s.key} starts with ${letterName(g)}. ${s.key}.`};
}
function matchItem(data, W, g, r, used) {
  const s = data.sounds[g]; if (!s) return null;
  const cands = uniq([...(s.yes || []), ...Object.keys(data.lex).filter(w => data.lex[w].fg === g)]).filter(w => data.lex[w] && data.lex[w].fg === g && !used.has(w));
  if (!cands.length) return null;
  const w = pick(cands, r); used.add(w);
  const choices = shuffle([g, ...letterDistractors(data, W, g, r)], r).map(x => ({v: x, label: x}));
  return {type: 'mc', mode: 'firstLetter', layout: 'letters', prompt: `What letter does ${w} start with?`, say: `${w}. What letter does ${w} start with?`,
    target: {w, i: pic(data, w)}, choices, answer: g, cue: s.cue, tipG: g, right: `Yes! ${w} starts with ${letterName(g)}.`};
}
const TEAMS = ['a_e', 'i_e', 'o_e', 'u_e', 'e_e', 'ee', 'ea', 'ai', 'ay', 'oa', 'ow', 'ar', 'or', 'er', 'ir', 'ur', 'oo', 'ou'];
const teamLabel = t => t.includes('_') ? t.replace('_', '_') : t;
function teamItem(data, W, team, r, used) {
  const known = W.known.filter(t => TEAMS.includes(t));
  const cands = Object.keys(data.lex).filter(w => data.lex[w].g.includes(team) && !used.has(w) && data.lex[w].reg);
  if (!cands.length) return null;
  const w = pick(cands, r); used.add(w);
  const soundTwin = {ee: 'ea', ea: 'ee', ai: 'ay', ay: 'ai', er: 'ir', ir: 'ur', ur: 'er', oa: 'ow', ow: 'oa', ou: 'ow2'};
  const others = shuffle(known.filter(t => t !== team && t !== soundTwin[team] && !(soundTwin[t] === team)), r).slice(0, 2);
  if (others.length < 2) for (const t of ['a_e', 'ee', 'oa', 'ar']) if (others.length < 2 && t !== team && !others.includes(t)) others.push(t);
  const choices = shuffle([team, ...others], r).map(x => ({v: x, label: teamLabel(x)}));
  return {type: 'mc', mode: 'team', layout: 'letters', prompt: `Listen: ${w}. Which letters spell the middle sound?`, say: `${w}. Which letters spell the vowel sound in ${w}?`,
    target: {w, i: pic(data, w)}, choices, answer: team, right: `Yes! ${w}.`};
}
export function soundItems(data, W, r, {intro = false, review = false} = {}) {
  const known = W.known.filter(g => data.sounds[g]);
  let focus = W.newg.filter(g => data.sounds[g]);
  if (!focus.length && W.new.includes('vowels')) focus = ['a', 'e', 'i', 'o', 'u'];
  const teams = W.newg.filter(g => TEAMS.includes(g));
  const items = []; const used = new Set();
  if (intro) for (const g of focus.slice(0, 3)) items.push(introItem(data, g));
  const n = intro ? Math.max(3, 6 - items.length) : 5;
  let guard = 0;
  while (items.filter(i => i.type === 'mc').length < n && guard++ < 60) {
    const i = items.length;
    if (teams.length && i % 2 === 0) { const it = teamItem(data, W, pick(teams, r), r, used); if (it) { items.push(it); continue; } }
    const g = (focus.length && !review && r() < 0.6) ? pick(focus, r) : pick(known, r);
    const it = matchItem(data, W, g, r, used); if (it) items.push(it);
  }
  // Handwriting: trace the new letters (lowercase first, capital on Day 2), with the same strokes as the printed pages.
  const rt = rng(W.n * 131 + (intro ? 1 : review ? 2 : 3));      // own random stream, so the other games stay the same
  const singles = focus.filter(g => /^[a-z]$/.test(g)), knownSingles = known.filter(g => /^[a-z]$/.test(g));
  if (intro) for (const g of singles.slice(0, 2)) items.push({type: 'trace', ch: g, sound: g});
  else if (!review && singles.length) {
    if (singles[2]) items.push({type: 'trace', ch: singles[2], sound: singles[2]});          // the third new letter, lowercase
    const g = pick(singles, rt); items.push({type: 'trace', ch: g.toUpperCase(), sound: g});
  }
  else if (knownSingles.length) {
    const g = pick(knownSingles, rt); items.push({type: 'trace', ch: g, sound: g});
    if (review) { const c = pick(knownSingles.filter(x => x !== g), rt) || g; items.push({type: 'trace', ch: c.toUpperCase(), sound: c}); }   // review days add a capital
  }
  return items;
}

/* ------------------------------------------------------------------ listening (no print) */
function groupBy(data, key, filter = () => true) {
  const out = {};
  for (const [w, e] of Object.entries(data.lex)) { const v = e[key]; if (v && filter(w, e)) (out[v] || (out[v] = [])).push(w); }
  return out;
}
function pictureChoiceItem(data, r, {mode, target, answer, others, prompt, sayPrompt, right}) {
  const choices = shuffle([answer, ...others], r).map(w => ({v: w, w, i: pic(data, w)}));
  const names = choices.map(c => c.w).join(', ');
  return {type: 'mc', mode, layout: 'pics', listen: true, prompt, ask: sayPrompt, say: `${sayPrompt} ${names}?`, target: target ? {w: target, i: pic(data, target)} : null, choices, answer, right};
}
const LISTEN_TYPES = {
  rhyme: ['rhyme'], rhyme_make: ['rhyme'], syllables: ['syllables'], first_sound: ['first', 'odd'], onset_rime: ['first', 'rhyme'], blend3: ['count', 'first'],
  review1: ['rhyme', 'first', 'syllables'], last_sound: ['last'], segment3: ['count'], middle_vowel: ['middle'], blend4: ['count', 'first'], segment4: ['count'],
  review2: ['first', 'last', 'middle'], delete_syllable: ['delete', 'blend'], delete_onset: ['last', 'rhyme'], substitute_onset: ['swap', 'rhyme'],
  substitute_final: ['last', 'swap'], delete_blend: ['count', 'first'], review3: ['delete', 'middle', 'swap'], blend_cluster: ['count', 'first'],
  delete_cluster: ['count', 'rhyme'], substitute_cluster: ['swap', 'rhyme'], segment_cluster: ['count'], compound: ['blend', 'delete'], review4: ['count', 'swap', 'delete'],
  vowel_swap: ['middle', 'rhyme'], reverse: ['first', 'last'], review_manip: ['swap', 'middle', 'last', 'delete'], review5: ['rhyme', 'count', 'swap'], review6: ['first', 'last', 'middle', 'blend']
};
function listenItem(data, W, type, r, used) {
  const L = data.lex; const words = Object.keys(L).filter(w => !used.has(w));
  const fresh = arr => arr.filter(w => !used.has(w));
  const done = (it, ...ws) => { if (it) ws.forEach(w => used.add(w)); return it; };
  if (type === 'rhyme') {
    const groups = Object.values(groupBy(data, 'r')).map(fresh).filter(g => g.length >= 2);
    if (!groups.length) return null;
    const g = pick(groups, r); const [t, a] = sample(g, 2, r);
    const others = sample(words.filter(w => L[w].r && L[w].r !== L[t].r && L[w].fs !== L[t].fs), 2, r);
    return done(pictureChoiceItem(data, r, {mode: 'rhyme', target: t, answer: a, others, prompt: `Which one rhymes with ${t}?`, sayPrompt: `Which one rhymes with ${t}?`, right: `Yes! ${t}, ${a}. They rhyme!`}), t, a);
  }
  if (type === 'first' || type === 'last' || type === 'middle') {
    const key = {first: 'fs', last: 'ls', middle: 'v'}[type];
    const filt = type === 'middle' ? (w, e) => 'aeiou'.includes(e.v) && e.reg : () => true;
    const groups = Object.values(groupBy(data, key, filt)).map(fresh).filter(g => g.length >= 2);
    if (!groups.length) return null;
    const g = pick(groups, r); const [t, a] = sample(g, 2, r);
    const others = sample(words.filter(w => L[w][key] && L[w][key] !== L[t][key] && (type !== 'middle' || 'aeiou'.includes(L[w].v)) && (type === 'first' || L[w].fs !== L[t].fs)), 2, r);
    const phrase = {first: 'starts like', last: 'ends like', middle: 'has the same middle sound as'}[type];
    return done(pictureChoiceItem(data, r, {mode: type, target: t, answer: a, others, prompt: `Which one ${phrase} ${t}?`, sayPrompt: `Which one ${phrase} ${t}?`, right: `Yes! ${t} and ${a}.`}), t, a);
  }
  if (type === 'odd') {
    const groups = Object.values(groupBy(data, 'fs')).map(fresh).filter(g => g.length >= 3);
    if (!groups.length) return null;
    const g = sample(pick(groups, r), 3, r); const odd = pick(words.filter(w => L[w].fs !== L[g[0]].fs), r);
    const choices = shuffle([...g, odd], r).map(w => ({v: w, w, i: pic(data, w)}));
    return done({type: 'mc', mode: 'odd', layout: 'pics', listen: true, prompt: 'Which one does NOT start like the others?', ask: 'Which one does not start like the others?', say: `Which one does not start like the others? ${choices.map(c => c.w).join(', ')}?`, choices, answer: odd, right: `Yes! ${odd} starts with a different sound.`}, ...g, odd);
  }
  if (type === 'syllables') {
    const byS = {}; for (const w of words) { const s = L[w].s; if (s >= 1 && s <= 3) (byS[s] || (byS[s] = [])).push(w); }
    const s = pick(Object.keys(byS).map(Number).filter(k => byS[k].length), r); const w = pick(byS[s], r);
    const choices = [1, 2, 3].map(n => ({v: n, label: String(n)}));
    return done({type: 'mc', mode: 'syllables', layout: 'claps', prompt: `Clap it: ${w}. How many claps?`, say: `Clap it with me: ${w}. How many claps?`, target: {w, i: pic(data, w)}, choices, answer: s, right: `Yes! ${w} has ${s} ${s === 1 ? 'clap' : 'claps'}.`}, w);
  }
  if (type === 'count') {
    const four = ['blend4', 'segment4', 'delete_blend', 'blend_cluster', 'delete_cluster', 'segment_cluster'].includes(W.pa);
    const pool = words.filter(w => L[w].reg && L[w].b >= 2 && L[w].b <= 5 && (four ? L[w].b >= 3 : L[w].b <= 4));
    if (!pool.length) return null;
    const w = pick(pool, r); const b = L[w].b;
    const choices = [2, 3, 4, 5].filter(n => Math.abs(n - b) <= 2).slice(0, 3);
    if (!choices.includes(b)) choices[choices.length - 1] = b;
    return done({type: 'mc', mode: 'countSounds', layout: 'nums', prompt: `How many sounds in ${w}?`, say: `Say it slowly: ${w}. Tap a finger for each sound. How many sounds?`, target: {w, i: pic(data, w)}, choices: choices.map(n => ({v: n, label: String(n)})), answer: b, right: `Yes! ${w} has ${b} sounds.`, boxes: b}, w);
  }
  if (type === 'blend' || type === 'delete') {
    const comps = data.compounds.filter(c => !used.has(c.w) && (type === 'blend' || c.ib));
    if (comps.length < 3) return null;
    const c = pick(comps, r); used.add(c.w);
    if (type === 'blend') {
      const others = sample(data.compounds.filter(x => x.w !== c.w), 2, r);
      const choices = shuffle([c, ...others], r).map(x => ({v: x.w, w: x.w, i: x.i}));
      return {type: 'mc', mode: 'blendParts', layout: 'pics', listen: true, prompt: `${c.a} + ${c.b} = ?`, ask: 'Put it together! Which one is it?', say: `Listen: ${c.a}. ${c.b}. Put it together!`, parts: [c.a, c.b], choices, answer: c.w, right: `Yes! ${c.a}, ${c.b}, ${c.w}!`};
    }
    const wrong = sample(data.compounds.filter(x => x.w !== c.w && x.ib && x.b !== c.b), 1, r);
    const choices = shuffle([{v: c.b, w: c.b, i: c.ib}, {v: c.w, w: c.w, i: c.i}, ...wrong.map(x => ({v: x.b, w: x.b, i: x.ib}))], r);
    return {type: 'mc', mode: 'deleteSyl', layout: 'pics', listen: true, prompt: `Say ${c.w} without ${c.a}.`, ask: `Say ${c.w}. Now say it without ${c.a}. What is left?`, drop: c.a, say: `Say ${c.w}. Now say it without ${c.a}. What is left?`, target: {w: c.w, i: c.i}, choices, answer: c.b, right: `Yes! ${c.w} without ${c.a} is ${c.b}.`};
  }
  if (type === 'swap') {
    // Rhymes with the target AND starts like the cue word (sound substitution without phoneme audio).
    const groups = Object.values(groupBy(data, 'r')).map(fresh).filter(g => g.length >= 2 && new Set(g.map(w => L[w].fs)).size >= 2);
    if (!groups.length) return null;
    const g = pick(groups, r); const t = pick(g, r); const a = pick(g.filter(w => L[w].fs !== L[t].fs), r);
    const cue = pick(words.filter(w => L[w].fs === L[a].fs && L[w].r !== L[a].r && w !== a), r);
    if (!cue) return null;
    const third = pick(words.filter(w => L[w].fs !== L[a].fs && L[w].r !== L[a].r && w !== t), r);
    return done(pictureChoiceItem(data, r, {mode: 'swap', target: t, answer: a, others: [cue, third], prompt: `Rhymes with ${t}, starts like ${cue}.`, sayPrompt: `Find the one that rhymes with ${t} and starts like ${cue}.`, right: `Yes! ${a} rhymes with ${t} and starts like ${cue}.`}), t, a, cue);
  }
  return null;
}
export function listenItems(data, W, r, {mix = false} = {}) {
  let types = LISTEN_TYPES[W.pa] || ['rhyme', 'first'];
  if (mix) types = uniq([...types, 'rhyme', 'first', 'syllables']);
  const items = []; const used = new Set(); let i = 0, guard = 0;
  while (items.length < 5 && guard++ < 50) { const it = listenItem(data, W, types[i++ % types.length], r, used); if (it) items.push(it); }
  return items;
}

/* ------------------------------------------------------------------ reading */
const lowerWords = W => W.words.map(x => x.w).filter(w => w === w.toLowerCase());
function readWordItem(data, W, w) {
  const e = W.words.find(x => x.w === w) || {w, g: data.lex[w]?.g || w.split('')};
  return {type: 'readWord', w, tiles: graphemeTiles(e.g), say: 'Tap each sound, then swoop and read the word.', right: `${w}!`};
}
export function readItems(data, W, r) {
  const pics = W.pics.filter(w => data.lex[w]);
  const items = [];
  if (pics.length >= 3) {
    const newg = W.newg;
    const pref = pics.filter(w => data.lex[w].g.some(g => newg.includes(g)));
    const chosen = uniq([...sample(pref, 3, r), ...sample(pics, 6, r)]).slice(0, 4);
    for (const w of chosen) {
      const tiles = graphemeTiles(data.lex[w].g);
      const choices = wordChoicePics(data, w, pics, r, 3, x => similarity(data.lex[x].g, data.lex[w].g));
      items.push({type: 'readPic', w, tiles, choices, answer: w, say: 'Read the word. Then tap its picture.', right: `Yes! ${w}.`});
    }
    const extra = lowerWords(W).filter(w => !chosen.includes(w) && !data.lex[w]);
    if (extra.length) items.push(readWordItem(data, W, pick(extra, r)));
  } else {
    for (const w of sample(lowerWords(W), 5, r)) items.push(readWordItem(data, W, w));
  }
  return items;
}
function sentenceTokens(W, text) {
  const heart = new Set(W.heartAll.map(h => h.toLowerCase())); const names = new Set(W.names);
  return text.split(/\s+/).filter(Boolean).map(tok => {
    const bare = tok.replace(/[^A-Za-z'-]/g, '');
    return {t: tok, w: bare, heart: heart.has(bare.toLowerCase()), name: names.has(bare)};
  });
}
export function sentenceItems(data, W, r) {
  const pages = W.story.pages;
  const items = [];
  for (const p of sample(pages, 3, r)) {
    const other = pick(pages.filter(q => q.t !== p.t && JSON.stringify(q.props) !== JSON.stringify(p.props)), r) || null;
    const choices = shuffle([{v: 'a', scene: {bg: p.bg, props: p.props}}, ...(other ? [{v: 'b', scene: {bg: other.bg, props: other.props}}] : [])], r);
    items.push({type: 'readSentence', text: p.t, tokens: sentenceTokens(W, p.t), choices: other ? choices : null, answer: 'a', say: 'Read the sentence. Point to each word. Then tap the picture that matches.', right: 'Yes! You read it!'});
  }
  const extra = W.sentences.filter(s => !pages.some(p => p.t === s));
  if (extra.length) { const s = pick(extra, r); items.push({type: 'readSentence', text: s, tokens: sentenceTokens(W, s), choices: null, say: 'Read the sentence to your grown-up. Point to each word.', right: 'Great reading!'}); }
  return items;
}

/* ------------------------------------------------------------------ build */
export function buildItems(data, W, r, n = 3) {
  const pics = W.pics.filter(w => data.lex[w]);
  let pool = pics.length >= n ? pics : lowerWords(W);
  const pref = pool.filter(w => (data.lex[w]?.g || W.words.find(x => x.w === w)?.g || []).some(g => W.newg.includes(g)));
  const chosen = uniq([...sample(pref, 2, r), ...sample(pool, n + 2, r)]).slice(0, n);
  const known = W.known.filter(g => data.sounds[g] || TEAMS.includes(g));
  return chosen.map(w => {
    const g = data.lex[w]?.g || W.words.find(x => x.w === w)?.g || w.split('');
    const tiles = graphemeTiles(g);
    const letters = tiles.map(t => t.t);
    const vowels = ['a', 'e', 'i', 'o', 'u'];
    const extra = [];
    const v = tiles.find(t => vowels.includes(t.t) && !t.silent);
    if (v) { const alt = shuffle(vowels.filter(x => !letters.includes(x) && known.includes(x)), r)[0]; if (alt) extra.push(alt); }
    const confuse = {b: 'd', d: 'b', p: 'b', m: 'n', n: 'm', f: 'v', s: 'z', t: 'd', g: 'k', c: 'g', sh: 'ch', ch: 'sh', th: 'f'};
    for (const t of tiles) { const c = confuse[t.t]; if (c && known.includes(c) && !letters.includes(c) && !extra.includes(c)) { extra.push(c); break; } }
    for (const x of shuffle(known.filter(x => x.length === 1), r)) { if (extra.length >= 2) break; if (!letters.includes(x) && !extra.includes(x)) extra.push(x); }
    const bank = shuffle([...letters, ...extra.slice(0, 2)], r);
    return {type: 'build', w, i: pic(data, w) || null, slots: tiles, bank, say: `Build the word ${w}. ${w}.`, right: `Yes! You built ${w}.`};
  });
}

/* ------------------------------------------------------------------ heart words */
export function heartItems(data, W, r, {intro = false, review = false} = {}) {
  const items = []; const all = W.heartAll.length ? W.heartAll : ['the', 'I'];
  if (intro) for (const h of W.heart) {
    const spell = h.split('').map(c => c.toUpperCase()).join(', ');
    items.push({type: 'heartIntro', w: h, tricky: data.tricky[h.toLowerCase()] || [0, h.length], say: `${h}. ${spell}. ${h}. The red heart shows the tricky part.`});
  }
  const pool = all;
  const fillers = W.words.map(x => x.w).filter(w => !all.includes(w));
  const count = intro ? 3 : 5;
  const targets = [];
  for (let i = 0; i < count; i++) {
    let t = (!review && i < W.heart.length) ? W.heart[i] : pick(pool, r);
    let guard = 0;
    while (pool.length > 1 && t === targets[targets.length - 1] && guard++ < 10) t = pick(pool, r);
    targets.push(t);
  }
  targets.forEach((t, i) => {
    let others = sample(all.filter(x => x !== t), 2, r);
    if (others.length < 2) others = [...others, ...sample(fillers.filter(x => x !== t && !others.includes(x)), 2 - others.length, r)];
    const choices = shuffle([t, ...others], r).map(x => ({v: x, label: x}));
    const flash = !intro && i % 2 === 1;
    items.push({type: 'mc', mode: flash ? 'heartFlash' : 'heartFind', layout: 'words', prompt: flash ? 'Look! Then find the word you saw.' : `Find the word ${t}.`,
      say: flash ? 'Look carefully. Which word did you see?' : `Find the word: ${t}.`, flash: flash ? t : null, choices, answer: t, right: `Yes! ${t}.`,
      tricky: data.tricky[t.toLowerCase()] || null});
  });
  return items;
}

/* ------------------------------------------------------------------ story */
export function storyItems(data, W) {
  return [{type: 'story', title: W.story.title, pages: W.story.pages.map(p => ({t: p.t, bg: p.bg, props: p.props, tokens: sentenceTokens(W, p.t)})), say: `${W.story.title}. Let’s read it together.`}];
}

/* ------------------------------------------------------------------ talk (speech) */
const PAIR_TAGS = {
  s: ['s / t', 's / th', 'sn / n'], z: ['s / th', 's / t'], r: ['r / w', 'tr / r', 'br / b', 'cr / c', 'fr / f', 'tr / t'], l: ['cl / c', 'gl / g'],
  th: ['s / th', 'ending th'], sh: ['ending ch', 's / t'], ch: ['ending ch'], j: ['ending ch'], k: ['k / t', 'k / g'], g: ['k / g'], f: ['f / p', 'fr / f'],
  v: ['f / p'], sbl: ['sn / n'], lbl: ['cl / c', 'gl / g'], rbl: ['cr / c', 'tr / r', 'fr / f', 'br / b', 'tr / t']
};
export function talkItems(data, W, r, targets = []) {
  const decks = data.speech.decks.filter(d => targets.includes(d.k));
  const items = [];
  if (decks.length) {
    const per = Math.ceil(10 / decks.length);
    const lists = decks.map(d => sample(d.items, per, r).map(it => ({type: 'say', deck: d.k, deckName: d.name, w: it.w, i: it.i, h: it.h, pos: it.pos, mouth: d.mouth, cue: d.cue,
      say: it.w})));
    for (let i = 0; i < 10; i++) { const l = lists[i % lists.length]; const it = l[Math.floor(i / lists.length)]; if (it) items.push(it); }
  } else {
    const pool = uniq([...W.pics, ...W.words.map(x => x.w)].filter(w => data.lex[w]));
    const extra = Object.keys(data.lex).filter(w => data.lex[w].reg);
    for (const w of sample(pool.length >= 6 ? pool : [...pool, ...extra], 6, r)) items.push({type: 'say', deck: null, deckName: 'Clear words', w, i: pic(data, w), h: '', pos: '', mouth: null, cue: 'Say each word clearly. Face to face, a little slower.', say: w});
  }
  const tags = uniq(decks.flatMap(d => PAIR_TAGS[d.k] || []));
  let pairs = data.speech.pairs.filter(p => !tags.length || tags.includes(p.tag));
  if (pairs.length < 3) pairs = data.speech.pairs;
  for (const p of sample(pairs, 3, r)) {
    const which = r() < 0.5 ? 'a' : 'b';
    const word = p[which];
    const choices = shuffle([{v: p.a, w: p.a, i: p.ai}, {v: p.b, w: p.b, i: p.bi}], r);
    items.push({type: 'mc', mode: 'pair', layout: 'pics', prompt: 'Listen. Which one did you hear?', say: `Listen carefully. ${word}. Which one did you hear?`, hear: word, choices, answer: word, tag: p.tag, right: `Yes! ${word}.`});
  }
  return items;
}

/* ------------------------------------------------------------------ math */
const COUNT_ICONS = ['unicorn', 'tennis-ball', 'star', 'tropical-fish', 'dog-face', 'cat-face', 'red-apple', 'blossom', 'balloon', 'strawberry', 'honeybee', 'butterfly'];
const SHAPES2D = ['circle', 'square', 'triangle', 'rectangle', 'hexagon', 'oval', 'rhombus'];
const SOLIDS = ['sphere', 'cube', 'cylinder', 'cone'];
const numChoices = (ans, r, lo = 0, hi = 20, n = 3) => {
  const set = new Set([ans]); const near = shuffle([ans - 1, ans + 1, ans - 2, ans + 2, ans + 3, ans - 3], r).filter(x => x >= lo && x <= hi);
  for (const x of near) { if (set.size >= n) break; set.add(x); }
  let k = lo; while (set.size < n && k <= hi) set.add(k++);
  return shuffle([...set], r).map(v => ({v, label: String(v)}));
};
const tensChoices = (ans, r) => shuffle(uniq([ans, ans + 10, ans - 10, ans + 1, ans - 1].filter(x => x >= 0 && x <= 120)).slice(0, 3), r).map(v => ({v, label: String(v)}));
function mathItem(kind, p, r, W) {
  const icon = pick(COUNT_ICONS, r);
  const nMax = typeof p === 'number' ? p : 10;
  const count = (lo, hi, frame = null) => { const n = lo + Math.floor(r() * (hi - lo + 1)); return {type: 'mc', mode: 'count', layout: 'nums', prompt: 'How many? Touch each one to count.', say: 'Touch each one and count. How many?', visual: {kind: 'objs', icon, n, frame}, choices: numChoices(n, r, 0, 20), answer: n, right: `Yes! ${n}.`}; };
  const numeral = (lo, hi) => { const n = lo + Math.floor(r() * (hi - lo + 1)); return {type: 'mc', mode: 'numeral', layout: 'nums', prompt: `Find the number ${n}.`, say: `Find the number ${n}.`, choices: numChoices(n, r, 0, 20), answer: n, right: `Yes! That is ${n}.`}; };
  const quick = (lo, hi) => { const n = lo + Math.floor(r() * (hi - lo + 1)); return {type: 'mc', mode: 'quick', layout: 'nums', prompt: 'Quick look! How many dots?', say: 'Quick look! How many dots did you see?', visual: {kind: 'dots', n, flash: 1600}, choices: numChoices(n, r, 1, 10), answer: n, right: `Yes! ${n} dots.`}; };
  const compareGroups = (hi, relation = pick(['more', 'fewer'], r)) => {
    let a = 1 + Math.floor(r() * hi), b = 1 + Math.floor(r() * hi); if (a === b) b = a === hi ? a - 1 : a + 1;
    const ans = relation === 'more' ? (a > b ? 'L' : 'R') : (a < b ? 'L' : 'R');
    return {type: 'mc', mode: 'compareGroups', layout: 'groups', prompt: `Which group has ${relation}?`, say: `Which group has ${relation}?`, choices: [{v: 'L', objs: {icon, n: a}}, {v: 'R', objs: {icon: pick(COUNT_ICONS, r), n: b}}], answer: ans, right: `Yes! That group has ${relation}.`};
  };
  const compareNums = (hi, lo = 0) => { let a = lo + Math.floor(r() * (hi - lo + 1)), b = lo + Math.floor(r() * (hi - lo + 1)); if (a === b) b = a === hi ? a - 1 : a + 1; const big = r() < 0.5; const ans = big ? Math.max(a, b) : Math.min(a, b); return {type: 'mc', mode: 'compareNums', layout: 'nums', prompt: `Which number is ${big ? 'bigger' : 'smaller'}?`, say: `Which number is ${big ? 'bigger' : 'smaller'}? ${a} or ${b}?`, choices: shuffle([a, b], r).map(v => ({v, label: String(v)})), answer: ans, right: `Yes! ${ans} is ${big ? 'bigger' : 'smaller'}.`}; };
  const seq = (hi, step = 1, lo = 0) => { const len = 4; const start = lo + step * Math.floor(r() * Math.max(1, Math.floor((hi - lo - step * (len - 1)) / step) + 1)); const vals = Array.from({length: len}, (_, i) => start + i * step); const miss = 1 + Math.floor(r() * (len - 1)); const ans = vals[miss]; return {type: 'mc', mode: 'sequence', layout: 'nums', prompt: 'What number is missing?', say: `Count along. What number is missing? ${vals.map((v, i) => i === miss ? 'blank' : v).join(', ')}.`, visual: {kind: 'seq', items: vals.map((v, i) => i === miss ? null : v)}, choices: step === 10 ? tensChoices(ans, r) : numChoices(ans, r, lo, hi + step), answer: ans, right: `Yes! ${ans}.`}; };
  const oneMore = (hi) => { const n = Math.floor(r() * hi); const more = r() < 0.5 || n === 0; const ans = more ? n + 1 : n - 1; return {type: 'mc', mode: 'oneMore', layout: 'nums', prompt: `What is one ${more ? 'more' : 'less'} than ${n}?`, say: `What is one ${more ? 'more' : 'less'} than ${n}?`, visual: {kind: 'objs', icon, n, frame: n > 5 ? 'ten' : null}, choices: numChoices(ans, r, 0, 21), answer: ans, right: `Yes! One ${more ? 'more' : 'less'} than ${n} is ${ans}.`}; };
  const add = (hi, story = false) => { const a = 1 + Math.floor(r() * (hi - 1)); const b = 1 + Math.floor(r() * (hi - a)); const ans = a + b; const noun = (k, n) => k === 'tennis-ball' ? (n === 1 ? 'tennis ball' : 'tennis balls') : (n === 1 ? 'star' : 'stars'); const tale = story ? `Ana has ${a} ${noun(icon, a)}. She gets ${b} more. How many now?` : `${a} plus ${b}. How many in all?`; return {type: 'mc', mode: 'add', layout: 'nums', prompt: story ? tale : `${a} + ${b} = ?`, say: tale, visual: {kind: 'add', icon: story ? (icon === 'tennis-ball' ? 'tennis-ball' : 'star') : icon, a, b}, choices: numChoices(ans, r, 0, 20), answer: ans, right: `Yes! ${a} plus ${b} is ${ans}.`}; };
  const sub = (hi, story = false) => { const a = 2 + Math.floor(r() * (hi - 1)); const b = 1 + Math.floor(r() * (a - 1)); const ans = a - b; const tale = story ? `There are ${a} fish. ${b} ${b === 1 ? 'swims' : 'swim'} away. How many are left?` : `${a} take away ${b}. How many are left?`; return {type: 'mc', mode: 'sub', layout: 'nums', prompt: story ? tale : `${a} − ${b} = ?`, say: tale, visual: {kind: 'sub', icon: story ? 'tropical-fish' : icon, a, b}, choices: numChoices(ans, r, 0, 20), answer: ans, right: `Yes! ${a} take away ${b} is ${ans}.`}; };
  const bond = (whole) => { const w = whole || 5 + Math.floor(r() * 6); const a = 1 + Math.floor(r() * (w - 1)); const ans = w - a; return {type: 'mc', mode: 'bond', layout: 'nums', prompt: `${w} is ${a} and what?`, say: `${w} is ${a} and how many more?`, visual: {kind: 'bond', whole: w, part: a, icon}, choices: numChoices(ans, r, 0, w), answer: ans, right: `Yes! ${a} and ${ans} make ${w}.`}; };
  const makeTen = () => { const n = 1 + Math.floor(r() * 9); const ans = 10 - n; return {type: 'mc', mode: 'makeTen', layout: 'nums', prompt: 'How many more to make 10?', say: `There are ${n}. How many more to make ten?`, visual: {kind: 'objs', icon, n, frame: 'ten'}, choices: numChoices(ans, r, 0, 10), answer: ans, right: `Yes! ${n} and ${ans} make 10.`}; };
  const teen = (lo = 11, hi = 20) => { const n = lo + Math.floor(r() * (hi - lo + 1)); return {type: 'mc', mode: 'teen', layout: 'nums', prompt: 'A full ten and some more. How many?', say: 'Ten and some more. How many?', visual: {kind: 'objs', icon, n, frame: 'double'}, choices: numChoices(n, r, 10, 20), answer: n, right: `Yes! 10 and ${n - 10} is ${n}.`}; };
  const tensOnes = (hi = 99) => { const tens = 1 + Math.floor(r() * Math.min(9, Math.floor(hi / 10))); const ones = Math.floor(r() * 10); const n = tens * 10 + ones; return {type: 'mc', mode: 'tensOnes', layout: 'nums', prompt: 'Tens and ones. How many?', say: `Count the tens, then the ones. How many?`, visual: {kind: 'sticks', tens, ones}, choices: tensChoices(n, r), answer: n, right: `Yes! ${tens} tens and ${ones} ones is ${n}.`}; };
  const shape = (list = SHAPES2D) => { const s = pick(list, r); const choices = shuffle([s, ...sample(list.filter(x => x !== s), 2, r)], r).map(v => ({v, shape: v, label: v})); return {type: 'mc', mode: 'shape', layout: 'shapes', prompt: `Find the ${s}.`, say: `Find the ${s}.`, choices, answer: s, right: `Yes! That is a ${s}.`}; };
  const sides = () => { const s = pick([['triangle', 3], ['square', 4], ['rectangle', 4], ['hexagon', 6]], r); return {type: 'mc', mode: 'sides', layout: 'nums', prompt: `How many sides does this ${s[0]} have?`, say: `Count the sides. How many sides?`, visual: {kind: 'shape', shape: s[0]}, choices: shuffle([3, 4, 6], r).map(v => ({v, label: String(v)})), answer: s[1], right: `Yes! A ${s[0]} has ${s[1]} sides.`}; };
  const pattern = () => { const [a, b, c] = sample(['unicorn', 'rainbow', 'tennis-ball', 'star', 'blossom', 'dolphin'], 3, r); const kinds = [[a, b], [a, a, b], [a, b, b], [a, b, c]]; const unit = pick(kinds, r); const s = []; while (s.length < 6) s.push(unit[s.length % unit.length]); const ans = unit[s.length % unit.length]; return {type: 'mc', mode: 'pattern', layout: 'icons', prompt: 'What comes next?', say: 'Say the pattern. What comes next?', visual: {kind: 'pattern', items: s}, choices: shuffle([a, b, c], r).map(v => ({v, i: v})), answer: ans, right: 'Yes! You found the pattern.'}; };
  const lengths = () => { const pair = pick([['pencil', 'crayon'], ['snake', 'bug'], ['giraffe', 'dog-face'], ['train', 'bicycle']], r); const long = r() < 0.5; return {type: 'mc', mode: 'length', layout: 'bars', prompt: `Which is ${long ? 'longer' : 'shorter'}?`, say: `Which is ${long ? 'longer' : 'shorter'}?`, choices: shuffle([{v: 'L', bar: 90, i: pair[0]}, {v: 'S', bar: 45, i: pair[1]}], r), answer: long ? 'L' : 'S', right: 'Yes! Line them up at the start to compare.'}; };
  const measure = () => { const n = 2 + Math.floor(r() * 6); return {type: 'mc', mode: 'measure', layout: 'nums', prompt: 'How many tennis balls long?', say: 'Count the tennis balls under it. How many balls long?', visual: {kind: 'ruler', n}, choices: numChoices(n, r, 1, 9), answer: n, right: `Yes! ${n} tennis balls long.`}; };
  const heavy = () => { const pairs = [['elephant', 'feather', 'heavier'], ['automobile', 'leaf-fluttering-in-wind', 'heavier'], ['mouse', 'horse', 'lighter'], ['balloon', 'bowling', 'lighter'], ['bathtub', 'teacup-without-handle', 'holds more'], ['cup-with-straw', 'bucket', 'holds less']]; const [x, y, q] = pick(pairs, r); return {type: 'mc', mode: 'heavy', layout: 'pics', prompt: `Which one ${q === 'heavier' || q === 'lighter' ? 'is ' + q : q}?`, say: `Which one ${q === 'heavier' || q === 'lighter' ? 'is ' + q : q}?`, choices: shuffle([{v: x, i: x, w: ''}, {v: y, i: y, w: ''}], r), answer: x, right: 'Yes! Good thinking.'}; };
  const odd = () => { const groups = [['red-apple', 'banana', 'strawberry', 'grapes'], ['dog-face', 'cat-face', 'rabbit-face', 'horse-face'], ['automobile', 'bus', 'bicycle', 'sailboat'], ['tennis-ball', 'soccer-ball', 'basketball', 'volleyball']]; const g = sample(groups, 2, r); const three = sample(g[0], 3, r); const o = pick(g[1], r); return {type: 'mc', mode: 'odd', layout: 'pics', prompt: 'Which one does not belong?', say: 'Which one does not belong?', choices: shuffle([...three, o], r).map(v => ({v, i: v, w: ''})), answer: o, right: 'Yes! It is in a different group.'}; };
  const positions = () => { const q = pick(['above', 'below', 'next to'], r); return {type: 'mc', mode: 'position', layout: 'scenes', prompt: `Which picture shows the cat ${q} the box?`, say: `Which picture shows the cat ${q} the box?`, choices: shuffle(['above', 'below', 'next to'].map(v => ({v, pos: v})), r), answer: q, right: `Yes! The cat is ${q} the box.`}; };
  const days = () => { const d = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']; const i = Math.floor(r() * 7); const ans = d[(i + 1) % 7]; return {type: 'mc', mode: 'days', layout: 'words', prompt: `What day comes after ${d[i]}?`, say: `What day comes after ${d[i]}?`, choices: shuffle(uniq([ans, d[(i + 3) % 7], d[(i + 5) % 7]]), r).map(v => ({v, label: v})), answer: ans, speakChoices: true, right: `Yes! ${ans} comes after ${d[i]}.`}; };
  const clock = (half = false) => { const h = 1 + Math.floor(r() * 12); const m = half && r() < 0.5 ? 30 : 0; const lab = (hh, mm) => `${hh}:${mm ? '30' : '00'}`; const ans = lab(h, m); const others = uniq([lab(((h + 2) % 12) + 1, m), lab(((h + 5) % 12) + 1, m), lab(h, m ? 0 : 30)]).filter(x => x !== ans).slice(0, 2); return {type: 'mc', mode: 'clock', layout: 'words', prompt: 'What time is it?', say: 'Look at the short hand for the hour. What time is it?', visual: {kind: 'clock', h, m}, choices: shuffle([ans, ...others], r).map(v => ({v, label: v})), answer: ans, speakChoices: true, right: `Yes! ${h} ${m ? 'thirty' : 'o’clock'}.`}; };
  const coins = () => { const c = pick(['penny', 'nickel', 'dime', 'quarter'], r); return {type: 'mc', mode: 'coin', layout: 'coins', prompt: `Find the ${c}.`, say: `Find the ${c}.`, choices: shuffle([c, ...sample(['penny', 'nickel', 'dime', 'quarter'].filter(x => x !== c), 2, r)], r).map(v => ({v, coin: v})), answer: c, right: `Yes! That is a ${c}.`}; };
  const pennies = (dimes = false) => { const n = 2 + Math.floor(r() * (dimes ? 7 : 9)); const ans = dimes ? n * 10 : n; return {type: 'mc', mode: 'cents', layout: 'nums', prompt: 'How many cents?', say: dimes ? 'Count the dimes by tens. How many cents?' : 'Count the pennies. How many cents?', visual: {kind: 'coins', coin: dimes ? 'dime' : 'penny', n}, choices: (dimes ? tensChoices(ans, r) : numChoices(ans, r, 1, 12)).map(c => ({...c, label: c.label + '¢'})), answer: ans, right: `Yes! ${ans} cents.`}; };
  const fraction = () => { const q = pick(['halves', 'fourths'], r); return {type: 'mc', mode: 'fraction', layout: 'fractions', prompt: `Which one shows ${q}?`, say: `Which one shows ${q}? Equal parts!`, choices: shuffle([{v: 'yes', frac: q}, {v: 'no', frac: q + '-unequal'}, {v: 'other', frac: q === 'halves' ? 'fourths' : 'halves'}], r), answer: 'yes', right: `Yes! Equal parts make ${q}.`}; };
  const graph = () => { const kinds = sample(['dog-face', 'cat-face', 'tropical-fish', 'rabbit-face'], 3, r); const vals = sample([1, 2, 3, 4, 5, 6], 3, r); const most = r() < 0.5; const idx = vals.indexOf(most ? Math.max(...vals) : Math.min(...vals)); return {type: 'mc', mode: 'graph', layout: 'pics', prompt: `Which pet has the ${most ? 'most' : 'fewest'}?`, say: `Look at the graph. Which one has the ${most ? 'most' : 'fewest'}?`, visual: {kind: 'graph', rows: kinds.map((k, i) => ({i: k, n: vals[i]}))}, choices: kinds.map(k => ({v: k, i: k, w: ''})), answer: kinds[idx], right: 'Yes! You read the graph.'}; };
  const tally = () => { const n = 3 + Math.floor(r() * 10); return {type: 'mc', mode: 'tally', layout: 'nums', prompt: 'How many tally marks?', say: 'Count by fives, then ones. How many tally marks?', visual: {kind: 'tally', n}, choices: numChoices(n, r, 1, 15), answer: n, right: `Yes! ${n}.`}; };
  const solids = () => { const s = pick(SOLIDS, r); return {type: 'mc', mode: 'solid', layout: 'shapes', prompt: `Find the ${s}.`, say: `Find the ${s}.`, choices: shuffle([s, ...sample(SOLIDS.filter(x => x !== s), 2, r)], r).map(v => ({v, shape: v, label: v})), answer: s, right: `Yes! That is a ${s}.`}; };
  const low = W.n <= 12;
  switch (kind) {
    case 'number_intro': return [() => count(nMax === 0 ? 0 : Math.max(1, nMax - 2), nMax), () => numeral(Math.max(0, nMax - 3), nMax), () => quick(1, Math.min(6, Math.max(2, nMax)))];
    case 'quick_look': case 'five_frame': return [() => quick(1, 5), () => count(1, 5, 'five')];
    case 'count_match': case 'review_count': return [() => count(1, nMax), () => numeral(0, nMax)];
    case 'more_fewer': case 'same_equal': case 'review_compare': return [() => compareGroups(Math.min(8, nMax))];
    case 'compare_numbers': case 'bigger_number': return [() => compareNums(10)];
    case 'compare_20': return [() => compareNums(20, 5)];
    case 'compare_2digit': return [() => compareNums(99, 10)];
    case 'order_numbers': case 'number_line': case 'before_after': case 'missing_numbers': return [() => seq(10), () => oneMore(9)];
    case 'one_more_less': return [() => oneMore(10)];
    case 'shapes_2d': return [() => shape(Array.isArray(p) ? p : SHAPES2D)];
    case 'review_shapes': case 'sides_corners': return [() => shape(), () => sides()];
    case 'shapes_3d': case 'review_shapes3d': return [() => solids()];
    case 'patterns': case 'review_patterns': return [() => pattern()];
    case 'ten_frame': case 'rainbow_ten': case 'ten_frame_more': case 'make_ten_facts': case 'review_make10': return [() => count(5, 10, 'ten'), () => makeTen()];
    case 'double_ten_frame': case 'teen_intro': case 'teen_as_ten': case 'build_teens': case 'ten_and_ones': case 'review_teens': case 'write_numbers': return [() => teen()];
    case 'count_to_20': case 'review_numbers': return [() => count(8, 20, 'double'), () => numeral(10, 20)];
    case 'picture_graph': case 'bar_graph': case 'read_graph': case 'review_graphs': return [() => graph()];
    case 'tally_survey': case 'tally_charts': return [() => tally(), () => graph()];
    case 'sort_classify': case 'sort_size': return [() => odd()];
    case 'shake_spill': case 'ways_to_make': case 'part_part_whole': case 'fingers_five': case 'review_bonds': return [() => bond(5)];
    case 'make_n': return [() => bond(typeof p === 'number' ? p : 6)];
    case 'missing_addend': return [() => bond(10)];
    case 'add_story': case 'add_word_problems': case 'my_story_problem': return [() => add(low ? 5 : 10, true)];
    case 'add_plus': case 'add_dots': case 'add_ten_frame': case 'facts_to_5': return [() => add(5)];
    case 'count_on': case 'doubles': case 'add_number_line': case 'plus_one': case 'plus_two': case 'think_add': case 'review_add': return [() => add(10)];
    case 'make_ten_add': case 'ten_plus': case 'doubles_20': case 'add_three': return [() => add(20), () => teen()];
    case 'sub_story': case 'sub_word_problems': return [() => sub(low ? 5 : 10, true)];
    case 'sub_minus': case 'sub_cross': return [() => sub(5)];
    case 'minus_one': case 'minus_two': case 'minus_zero_all': case 'review_sub': return [() => sub(10)];
    case 'ten_minus': case 'count_back': return [() => sub(20)];
    case 'add_or_sub': case 'fact_families': case 'mixed_facts': case 'math_olympics': return [() => add(10), () => sub(10)];
    case 'count_by_tens': case 'review_hundred': return [() => seq(100, 10, 0)];
    case 'hundred_chart': case 'missing_hundred': case 'count_on_from': return [() => seq(100, 1, 11)];
    case 'count_to_120': return [() => seq(120, 1, 95), () => seq(120, 10, 0)];
    case 'tens_ones': case 'build_tens': case 'review_place': return [() => tensOnes(99)];
    case 'longer_shorter': case 'order_length': case 'review_measure': return [() => lengths()];
    case 'measure_units': case 'measure_clips': return [() => measure(), () => lengths()];
    case 'heavier_lighter': case 'holds_more': case 'compare_home': return [() => heavy()];
    case 'positions': return [() => positions()];
    case 'day_sequence': case 'days_of_week': case 'calendar': case 'my_day_schedule': return [() => days()];
    case 'clock_intro': case 'clock_hour': return [() => clock(false)];
    case 'clock_half': case 'review_time': return [() => clock(true)];
    case 'coins': case 'review_money': return [() => coins()];
    case 'count_pennies': return [() => pennies(false)];
    case 'count_dimes': return [() => pennies(true)];
    case 'equal_parts': case 'halves': case 'fourths': case 'fair_share': case 'review_fractions': return [() => fraction()];
    case 'review_all': return [() => add(10), () => sub(10), () => count(5, 20, 'double'), () => shape()];
    default: return [() => count(1, 10)];
  }
}
export function mathItems(data, W, r, focus, n = 5) {
  const gens = focus.flatMap(([k, p]) => mathItem(k, p, r, W));
  const items = [];
  for (let i = 0; i < n; i++) items.push(gens[i % gens.length]());
  return items;
}

/* ------------------------------------------------------------------ day plan */
export function planDay(data, week, day, {targets = []} = {}) {
  const w = clampInt(week, 1, WEEKS, 1), d = clampInt(day, 1, DAYS, 1);
  const W = data.weeks[w - 1];
  const r = rng(w * 1009 + d * 97 + 13);
  const M = W.math;
  const S = (id, items, extra = {}) => ({id, ...STATION_INFO[id], items, required: true, ...extra});
  let st;
  if (W.kind !== 'review') {
    if (d === 1) st = [S('sounds', soundItems(data, W, r, {intro: true})), S('listen', listenItems(data, W, r)), S('heart', heartItems(data, W, r, {intro: true})), S('numbers', mathItems(data, W, r, [M[0]]))];
    else if (d === 2) st = [S('sounds', soundItems(data, W, r)), S('read', readItems(data, W, r)), S('build', buildItems(data, W, r)), S('numbers', mathItems(data, W, r, [M[1]]))];
    else if (d === 3) st = [S('listen', listenItems(data, W, r)), S('read', readItems(data, W, r)), S('heart', heartItems(data, W, r)), S('numbers', mathItems(data, W, r, [M[2]]))];
    else if (d === 4) st = [S('sounds', soundItems(data, W, r, {review: true})), S('build', buildItems(data, W, r)), S('read', sentenceItems(data, W, r)), S('numbers', mathItems(data, W, r, [M[3]]))];
    else st = [S('story', storyItems(data, W)), S('heart', heartItems(data, W, r, {review: true})), S('listen', listenItems(data, W, r, {mix: true})), S('numbers', mathItems(data, W, r, M))];
  } else {
    if (d === 1) st = [S('sounds', soundItems(data, W, r, {review: true})), S('listen', listenItems(data, W, r, {mix: true})), S('numbers', mathItems(data, W, r, [M[0]]))];
    else if (d === 2) st = [S('read', readItems(data, W, r)), S('build', buildItems(data, W, r)), S('numbers', mathItems(data, W, r, [M[1]]))];
    else if (d === 3) st = [S('heart', heartItems(data, W, r, {review: true})), S('read', sentenceItems(data, W, r)), S('numbers', mathItems(data, W, r, [M[2]]))];
    else if (d === 4) st = [S('story', storyItems(data, W)), S('sounds', soundItems(data, W, r, {review: true})), S('numbers', mathItems(data, W, r, [M[3]]))];
    else st = [S('listen', listenItems(data, W, r, {mix: true})), S('read', readItems(data, W, r)), S('build', buildItems(data, W, r, 4)), S('numbers', mathItems(data, W, r, M))];
  }
  st.push(S('talk', talkItems(data, W, r, targets), {required: false}));
  return {week: w, day: d, unit: W.u, title: W.title, kind: W.kind, newg: W.newg, heart: W.heart, stations: st};
}
