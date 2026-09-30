/**
 * Vivian's 36-week preschool path (age 3): state, daily plans and the little games for each station.
 * Pure functions with no DOM, so everything here is checked by tests/v36.test.mjs.
 * Progress stays on this device. No names beyond the learner's first name, no tracking.
 */
export const V36_KEY = 'little-learning-v36-v1';
export const WEEKS = 36, DAYS = 5;
export const NAME = 'VIVIAN';

export const STATION_INFO = {
  song: {title: 'Sing along', icon: 'musical-notes', color: '#d6336c'},
  letter: {title: 'Letter fun', icon: 'input-latin-uppercase', color: '#e64980'},
  count: {title: 'Count with Didi', icon: 'input-numbers', color: '#1c7ed6'},
  story: {title: 'Story time', icon: 'open-book', color: '#ae3ec9'},
  color: {title: 'Colors', icon: 'artist-palette', color: '#f76707'},
  talk: {title: 'Talk time', icon: 'speaking-head', color: '#2f9e44'},
  move: {title: 'Dino dance', icon: 'woman-dancing', color: '#e67700'},
  trace: {title: 'Trace it', icon: 'crayon', color: '#0c8599'},
  shape: {title: 'Shapes', icon: 'red-triangle', color: '#7048e8'},
  math: {title: 'Number game', icon: 'abacus', color: '#1971c2'},
  sound: {title: 'Sound play', icon: 'speaker-high-volume', color: '#2b8a3e'},
  name: {title: 'My name', icon: 'girl', color: '#c2255c'},
  dance: {title: 'Freeze dance', icon: 'musical-note', color: '#f59f00'},
  review: {title: 'Show what I know', icon: 'glowing-star', color: '#e67700'}
};
export const STICKERS = ['sauropod', 'glowing-star', 'rainbow', 'balloon', 'sunflower', 'red-heart', 'party-popper', 'sparkles', 'lady-beetle', 'tropical-fish', 'butterfly', 'baby-chick',
  'cupcake', 'soft-ice-cream', 'strawberry', 'hatching-chick', 'teddy-bear', 'crayon', 'musical-notes', 'star', 'sun', 'bubbles', 'lollipop', 't-rex'];
export const PRAISE = ['Yay!', 'You did it!', 'Great job!', 'Hooray!', 'Super!', 'Wow!', 'Nice work!', 'Roar-some!'];
export const NUM_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];

/* Tracing paths drawn in a 100 x 100 box, as SVG path commands. A one-point stroke is a dot to tap. */
const spiral = () => {
  const pts = [['M', 50, 50]];
  for (let a = 20; a <= 810; a += 15) { const t = a * Math.PI / 180, rr = 2 + 36 * a / 810; pts.push(['L', +(50 + rr * Math.cos(t)).toFixed(1), +(50 + rr * Math.sin(t)).toFixed(1)]); }
  return [pts];
};
const rays = () => Array.from({length: 8}, (_, i) => { const t = i * Math.PI / 4 - Math.PI / 2; return [['M', +(50 + 19 * Math.cos(t)).toFixed(1), +(50 + 19 * Math.sin(t)).toFixed(1)], ['L', +(50 + 42 * Math.cos(t)).toFixed(1), +(50 + 42 * Math.sin(t)).toFixed(1)]]; });
export const STROKE_PATHS = {
  down: [[['M', 50, 14], ['L', 50, 86]]],
  across: [[['M', 12, 50], ['L', 88, 50]]],
  dots: [[['M', 22, 28]], [['M', 50, 28]], [['M', 78, 28]], [['M', 36, 70]], [['M', 64, 70]]],
  circle: [[['M', 50, 15], ['C', 69.33, 15, 85, 30.67, 85, 50], ['C', 85, 69.33, 69.33, 85, 50, 85], ['C', 30.67, 85, 15, 69.33, 15, 50], ['C', 15, 30.67, 30.67, 15, 50, 15]]],
  spikes: [[['M', 17, 32], ['L', 17, 70]], [['M', 39, 32], ['L', 39, 70]], [['M', 61, 32], ['L', 61, 70]], [['M', 83, 32], ['L', 83, 70]]],
  hills: [[['M', 8, 72], ['Q', 21, 16, 34, 72], ['Q', 47, 16, 60, 72], ['Q', 73, 16, 86, 72]]],
  curve: [[['M', 14, 80], ['C', 14, 16, 86, 16, 86, 80]]],
  cross: [[['M', 50, 14], ['L', 50, 86]], [['M', 14, 50], ['L', 86, 50]]],
  waves: [[['M', 10, 50], ['Q', 20, 26, 30, 50], ['Q', 40, 74, 50, 50], ['Q', 60, 26, 70, 50], ['Q', 80, 74, 90, 50]]],
  tall: [[['M', 18, 14], ['L', 18, 86]], [['M', 40, 52], ['L', 40, 86]], [['M', 62, 14], ['L', 62, 86]], [['M', 84, 52], ['L', 84, 86]]],
  zigzag: [[['M', 12, 28], ['L', 29, 72], ['L', 46, 28], ['L', 63, 72], ['L', 80, 28]]],
  square: [[['M', 22, 20], ['L', 22, 80], ['L', 78, 80], ['L', 78, 20], ['L', 22, 20]]],
  slide: [[['M', 14, 16], ['C', 22, 62, 30, 82, 46, 84]], [['M', 56, 16], ['C', 64, 62, 72, 82, 88, 84]]],
  spiral: spiral(),
  rays: rays()
};
const NAME_TRACE = ['V', 'I', 'A', 'N'];
const LINE_LETTERS = ['I', 'T', 'L', 'H'];

/* ------------------------------------------------------------------ small helpers */
export function rng(seed) {
  let a = (seed >>> 0) || 1;
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
export function shuffle(list, r) { const a = [...list]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const pick = (list, r) => list[Math.floor(r() * list.length)];
const clampInt = (v, lo, hi, dflt) => { const n = Math.round(Number(v)); return v !== null && v !== '' && Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : dflt; };
const DAY_KEY = /^([1-9]|[12]\d|3[0-6])-[1-5]$/;
export const dayKey = (w, d) => `${w}-${d}`;
export const isoDate = (d = new Date()) => d.toISOString().slice(0, 10);

/* ------------------------------------------------------------------ state */
export function defaultV36() {
  return {version: 1, week: 1, day: 1, days: {}, stickers: {}, friends: {}, island: {}, talk: {}, sounds: {}, stats: {stations: 0, firstTry: 0, tries: 0},
    settings: {music: true, breaks: true}, updatedAt: null};
}
export function normalizeV36(raw) {
  const d = defaultV36();
  if (!raw || typeof raw !== 'object' || raw.version !== 1) return d;
  d.week = clampInt(raw.week, 1, WEEKS, 1); d.day = clampInt(raw.day, 1, DAYS, 1);
  if (raw.days && typeof raw.days === 'object') for (const [k, v] of Object.entries(raw.days)) {
    if (!DAY_KEY.test(k) || !v || typeof v !== 'object') continue;
    d.days[k] = {done: Array.isArray(v.done) ? [...new Set(v.done.filter(x => typeof x === 'string' && /^[a-z]{2,8}-[a-z]{2,8}$/.test(x)))].slice(0, 8) : [],
      at: typeof v.at === 'string' ? v.at.slice(0, 30) : null};
  }
  const stickers = new Set(STICKERS);
  if (raw.stickers && typeof raw.stickers === 'object') for (const [k, v] of Object.entries(raw.stickers)) if (DAY_KEY.test(k) && stickers.has(v)) d.stickers[k] = v;
  if (raw.friends && typeof raw.friends === 'object') for (const [k, v] of Object.entries(raw.friends)) { const n = Number(k); if (Number.isInteger(n) && n >= 1 && n <= WEEKS && v) d.friends[n] = true; }
  if (raw.island && typeof raw.island === 'object') for (const [k, v] of Object.entries(raw.island)) if (DAY_KEY.test(k)) { const n = clampInt(v, 0, 5, 0); if (n) d.island[k] = n; }
  if (raw.talk && typeof raw.talk === 'object') for (const [k, v] of Object.entries(raw.talk).slice(0, 500)) if (/^[a-z][a-z' .-]{0,30}$/i.test(k)) d.talk[k] = clampInt(v, 0, 9999, 0);
  if (raw.sounds && typeof raw.sounds === 'object') for (const [k, v] of Object.entries(raw.sounds).slice(0, 30)) {
    if (!/^[a-z]{1,2}$/.test(k) || !v || typeof v !== 'object') continue;
    d.sounds[k] = {clear: clampInt(v.clear, 0, 99999, 0), notyet: clampInt(v.notyet, 0, 99999, 0)};
  }
  if (raw.stats && typeof raw.stats === 'object') for (const k of Object.keys(d.stats)) d.stats[k] = clampInt(raw.stats[k], 0, 1e7, 0);
  if (raw.settings && typeof raw.settings === 'object') { d.settings.music = raw.settings.music !== false; d.settings.breaks = raw.settings.breaks !== false; }
  d.updatedAt = typeof raw.updatedAt === 'string' ? raw.updatedAt.slice(0, 30) : null;
  return d;
}
export function loadV36(storage) {
  try { const s = storage.getItem(V36_KEY); return s ? normalizeV36(JSON.parse(s)) : defaultV36(); } catch { return defaultV36(); }
}
export function saveV36(storage, st) {
  try { storage.setItem(V36_KEY, JSON.stringify({...st, updatedAt: new Date().toISOString()})); return true; } catch { return false; }
}
export function goToDay(st, week, day) { return {...st, week: clampInt(week, 1, WEEKS, 1), day: clampInt(day, 1, DAYS, 1)}; }
export function nextDay(week, day) { return day < DAYS ? {week, day: day + 1} : week < WEEKS ? {week: week + 1, day: 1} : {week: WEEKS, day: DAYS}; }
export function doneStations(st, week, day) { return st.days[dayKey(week, day)]?.done || []; }
export function completeStation(st, week, day, id) {
  const k = dayKey(week, day); const cur = st.days[k] || {done: [], at: null};
  if (cur.done.includes(id)) return st;
  return {...st, days: {...st.days, [k]: {done: [...cur.done, id], at: isoDate()}}, stats: {...st.stats, stations: st.stats.stations + 1}};
}
export function isDayDone(st, plan) { const done = doneStations(st, plan.week, plan.day); return plan.stations.every(s => done.includes(s.id)); }
export function stickerFor(week, day) { return STICKERS[((week - 1) * DAYS + day - 1) * 7 % STICKERS.length]; }
export function awardSticker(st, week, day) {
  const k = dayKey(week, day); if (st.stickers[k]) return st;
  return {...st, stickers: {...st.stickers, [k]: stickerFor(week, day)}};
}
/** Days finished this week (0-5): the week's egg cracks a little more each day and hatches on the fifth. */
export function eggStage(st, week) { let n = 0; for (let d = 1; d <= DAYS; d++) if (st.stickers[dayKey(week, d)]) n++; return n; }
export function hatchFriend(st, week) { return st.friends[week] ? st : {...st, friends: {...st.friends, [week]: true}}; }
export function logTalk(st, word) { const k = String(word).toLowerCase().slice(0, 30); return {...st, talk: {...st.talk, [k]: (st.talk[k] || 0) + 1}}; }
export function logSound(st, s, clear) {
  const cur = st.sounds[s] || {clear: 0, notyet: 0};
  return {...st, sounds: {...st.sounds, [s]: {clear: cur.clear + (clear ? 1 : 0), notyet: cur.notyet + (clear ? 0 : 1)}}};
}
export function logTries(st, firstTry) { return {...st, stats: {...st.stats, tries: st.stats.tries + 1, firstTry: st.stats.firstTry + (firstTry ? 1 : 0)}}; }

/* ------------------------------------------------------------------ plans */
export function weekData(data, week) { return data.weeks[clampInt(week, 1, WEEKS, 1) - 1]; }
const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;

function stationTitle(data, w, kind, mode) {
  const L = w.letter;
  if (kind === 'letter') {
    if (mode === 'review') return 'Letters I know';
    if (mode === 'meet') return L.length === 1 ? `Meet ${L}` : L === 'name' ? 'My name letters' : 'ABC song';
    return L.length === 1 ? `Find ${L}` : 'Letter bubbles';
  }
  if (kind === 'count') return mode === 'review' || w.number === 1 ? 'Count with Didi' : w.number === 0 ? 'Zero!' : `Count to ${w.number}`;
  if (kind === 'color') return w.color === 'mix' && mode !== 'review' ? 'Mix colors' : data.colors[w.color] && mode !== 'review' ? `${cap(w.color)} hunt` : 'Colors I know';
  if (kind === 'shape') return data.shapes[w.shape] && mode !== 'review' ? `Find the ${w.shape}` : 'Shape hunt';
  if (kind === 'story') return mode === 'retell' ? 'Tell the story' : mode === 'ask' ? 'Story talk' : 'Story time';
  if (kind === 'trace') return mode === 'review' ? 'Trace it' : (data.strokes[w.stroke]?.title || 'Trace it');
  if (kind === 'math') return {count: 'Give to Didi', give: 'Give to Didi', quick: 'Quick look', zero: 'Zero eggs', more: 'Which has more?', size: 'Big and little', pattern: 'What comes next?',
    order: 'First and last', sort: w.n >= 30 ? 'Sink or float' : 'Sort the animals', measure: 'Full and empty', combine: 'One more', review: 'Number game'}[mode] || 'Number game';
  if (kind === 'talk') return mode === 'ask' ? 'Talk together' : 'Say the words';
  if (kind === 'move') return w.move?.[0] || 'Dino dance';
  if (kind === 'song') return (w.song?.title || 'Sing along').replace(/\s*\(.*\)\s*$/, '');
  return STATION_INFO[kind]?.title || kind;
}
function stationIcon(data, w, kind, mode) {
  if (kind === 'story') return w.story.pages[0][1].find(p => !p.startsWith('letter:')) || 'open-book';
  if (kind === 'color' && data.colors[w.color]) return data.colors[w.color].things[0][1];
  if (kind === 'shape' && data.shapes[w.shape]) return data.shapes[w.shape][0][1];
  if (kind === 'trace' && data.strokes[w.stroke] && mode !== 'review') return data.strokes[w.stroke].a;
  if (kind === 'math') return w.mobj[1];
  if (kind === 'letter' && w.letter.length === 1 && data.abc[w.letter]) return data.abc[w.letter][1];
  return STATION_INFO[kind]?.icon || 'glowing-star';
}

export function planDay(data, week, day) {
  const w = weekData(data, week); const dd = clampInt(day, 1, DAYS, 1); const d = w.days[dd - 1];
  const stations = d.app.map(([kind, mode]) => ({id: `${kind}-${mode}`, kind, mode, title: stationTitle(data, w, kind, mode), icon: stationIcon(data, w, kind, mode),
    color: STATION_INFO[kind]?.color || '#7048e8', group: data.titles?.[kind] || STATION_INFO[kind]?.title || kind}));   // group = the name on the printed Week Plan
  return {week: w.n, day: dd, title: w.title, unit: w.u, kind: w.kind, stations, paper: d.paper, play: d.play, w};
}

/* ------------------------------------------------------------------ the little games */
const LETTER_POOL = 'ABCDEFGHIJKLMNOPRSTUVWXYZ'.split('');
export const LOOKALIKE = {V: 'WYAU', I: 'LTJH', A: 'VHNM', N: 'MHZV', D: 'OBPC', R: 'PBKA', E: 'FBLH', T: 'ILFY', S: 'ZCGB', M: 'NWVH', B: 'DPER', H: 'NAMK',
  J: 'LIUT', P: 'RBDF', C: 'OGQD', G: 'COQS', K: 'RXHY', Q: 'OCGD', F: 'EPTL', L: 'IJTE', U: 'VJOW', Y: 'VXTK', Z: 'SNXK', W: 'MVNU', O: 'QCDG', X: 'KYZV'};
/** Early weeks use letters that look very different; from week 13 one look-alike joins in. */
export function distractors(target, n, r, week = 1) {
  const alike = (LOOKALIKE[target] || '').split('');
  const far = shuffle(LETTER_POOL.filter(c => c !== target && !alike.includes(c)), r);
  const out = week > 12 && alike.length ? [pick(alike, r), ...far] : far;
  return [...new Set(out)].slice(0, n);
}
function letterFind(target, n, r, week, prompt) {
  return {type: 'letterFind', target, choices: shuffle([target, ...distractors(target, n - 1, r, week)], r), prompt: prompt || `Find ${target}!`};
}
function numberChoices(n, r, lo = 1, hi = 10) {
  const set = new Set([n]);
  for (const x of shuffle([n - 1, n + 1, n + 2, n - 2].filter(x => x >= lo && x <= hi), r)) { if (set.size >= 3) break; set.add(x); }
  return [...set].sort((a, b) => a - b);
}
function countItem(n, icon, word, r) { return {type: 'count', n, icon, word, choices: numberChoices(n, r)}; }
function colorPick(data, color, r, known) {
  const things = data.colors[color].things.filter(t => !/heart|square|circle/.test(t[1]));
  const [word, icon] = pick(things.length ? things : data.colors[color].things, r);
  const pool = (known && known.length >= 3 ? known : data.colorOrder.slice(0, 4)).filter(c => c !== color && data.colors[c] && !(['white', 'gray'].includes(c) && ['white', 'gray'].includes(color)));
  return {type: 'colorPick', icon, word, answer: color, choices: shuffle([color, ...shuffle(pool, r).slice(0, 2)], r)};
}
function shapeFind(shape, r, pool) {
  const others = shuffle((pool && pool.length >= 3 ? pool : ['circle', 'square', 'triangle', 'heart', 'star']).filter(s => s !== shape), r).slice(0, 2);
  return {type: 'shapeFind', shape, choices: shuffle([shape, ...others], r)};
}
const strokeItem = key => ({type: 'trace', model: {kind: 'stroke', key}});
const letterTrace = key => ({type: 'trace', model: {kind: 'letter', key}});
const numberTrace = key => ({type: 'trace', model: {kind: 'number', key: String(key)}});

/* Spaced review: things taught in earlier weeks come back in later games. */
export const NAME_FRIENDS = ['DIDI', 'PEEP', 'TEDDY', 'HOOT', 'POLLY', 'REXY', 'SHELLY', 'PINKY', 'MOE', 'ZIPPY'];
export const NAME_LOOKALIKES = ['IVAN', 'VIOLET', 'VIVI', 'NIAV', 'AVIAN'];
const firstWeeks = new WeakMap();
export function conceptWeeks(data) {
  if (firstWeeks.has(data)) return firstWeeks.get(data);
  const out = {};
  for (const w of data.weeks) if (w.math && w.math !== 'review' && !(w.math in out)) out[w.math] = w.n;
  firstWeeks.set(data, out);
  return out;
}
/** One number-game item for an idea taught before this week (never this week's own idea). */
export function reviewMath(data, week, r, skip = null) {
  const w = weekData(data, week); const cw = conceptWeeks(data);
  const ideas = Object.entries(cw).filter(([m, n]) => n < week && m !== skip && m !== 'count').map(([m]) => m);
  const [word, icon] = pick(data.weeks.slice(0, week).map(x => x.mobj).filter(m => !['clap', 'paw prints', 'bubbles'].includes(m[0])), r) || w.mobj;
  const top = Math.max(3, Math.min(6, w.nmax));
  const mode = ideas.length ? pick(ideas, r) : 'give';
  switch (mode) {
    case 'quick': { const n = 1 + Math.floor(r() * 4); return {type: 'quick', n, choices: [1, 2, 3, 4]}; }
    case 'zero': return {type: 'zero', groups: shuffle([0, 1 + Math.floor(r() * 2), 3], r), icon: pick(['egg', 'baby-chick', 'strawberry'], r)};
    case 'more': { const a = 1 + Math.floor(r() * 3), b = a + 2 + Math.floor(r() * 3); return {type: 'more', ...(r() < 0.5 ? {a, b} : {a: b, b: a}), icon}; }
    case 'size': return {type: 'size', icon: pick(['sauropod', 'elephant', 'teddy-bear', 'duck', 'house'], r), ask: r() < 0.5 ? 'big' : 'little'};
    case 'pattern': { const [x, y, wx, wy] = pick([['star', 'red-heart', 'star', 'heart'], ['sun', 'crescent-moon', 'sun', 'moon'], ['red-apple', 'banana', 'apple', 'banana'], ['duck', 'frog', 'duck', 'frog']], r);
      return {type: 'pattern', seq: [x, y, x, y, x], answer: y, choices: shuffle([x, y], r), words: {[x]: wx, [y]: wy}}; }
    case 'order': return {type: 'order', icon: 'duck', n: 4 + Math.floor(r() * 2), ask: r() < 0.5 ? 'first' : 'last'};
    case 'sort': return week > 33 && r() < 0.5
      ? (([name, item, answer]) => ({type: 'sortPick', mode: 'water', name, item, answer, bins: [['floats', 'sailboat'], ['sinks', 'anchor']], prompt: `Will the ${name} float or sink?`}))(pick([['rock', 'rock', 'sinks'], ['duck', 'duck', 'floats'], ['coin', 'coin', 'sinks'], ['leaf', 'leaf-fluttering-in-wind', 'floats']], r))
      : (([name, item, answer]) => ({type: 'sortPick', mode: 'pens', name, item, answer, bins: [['cows', 'cow-face'], ['pigs', 'pig-face']], prompt: `Where does the ${name} go?`}))(pick([['cow', 'cow-face', 'cows'], ['pig', 'pig-face', 'pigs']], r));
    case 'measure': return {type: 'measure', ask: r() < 0.5 ? 'full' : 'empty'};
    case 'combine': { const a = 1 + Math.floor(r() * 3); return {type: 'combine', a, b: 1, icon: 'tropical-fish', choices: numberChoices(a + 1, r)}; }
    default: { const n = 1 + Math.floor(r() * top); return {type: 'give', n, icon, word, max: Math.min(10, n + 3)}; }
  }
}
function earlierOf(list, current, r) { const pool = list.filter(x => x !== current); return pool.length ? pick(pool, r) : null; }
function letterPic(data, w, L, r) {
  const own = (w.lwords || []).filter(([word]) => word.toUpperCase().startsWith(L));
  const answer = own.length ? pick(own, r) : data.abc[L];
  const others = shuffle(Object.keys(data.abc).filter(c => c !== L && !data.abc[c][0].toUpperCase().startsWith(L)), r).slice(0, 2).map(c => data.abc[c]);
  return {type: 'letterPic', letter: L, answer, choices: shuffle([answer, ...others], r)};
}
function nameFind(week, r) {
  const others = shuffle(NAME_FRIENDS, r).slice(0, week > 18 ? 1 : 2);
  if (week > 18) others.push(pick(NAME_LOOKALIKES, r));
  return {type: 'nameFind', name: NAME, choices: shuffle([NAME, ...others], r)};
}

export function stationItems(data, week, day, kind, mode, {seed = 0} = {}) {
  const w = weekData(data, week);
  const r = rng(week * 1009 + day * 101 + seed * 7919 + kind.charCodeAt(0) * 13 + mode.charCodeAt(0));
  const L = w.letter, N = w.number, [mword, micon] = w.mobj;
  const known = w.known.length ? w.known : ['V'];
  const colorsKnown = w.colorsKnown.length >= 2 ? w.colorsKnown : ['red', 'blue', 'yellow'];
  const shapesKnown = w.shapesKnown.length >= 3 ? w.shapesKnown : ['circle', 'square', 'triangle'];
  const oneLetter = L.length === 1 ? L : null;
  switch (kind) {
    case 'song': return [{type: 'song', title: w.song.title, tune: w.song.tune, lines: w.song.lines}, {type: 'beat', title: w.song.title, tune: w.song.tune, lines: w.song.lines.length, goal: 8}];
    case 'move': return [{type: 'moveCard', name: w.move[0], how: w.move[1], secs: 30}];
    case 'dance': return [{type: 'freeze', rounds: 3}];
    case 'name': return [{type: 'nameBuild', name: NAME}, nameFind(week, r)];
    case 'letter': {
      if (mode === 'meet') {
        if (oneLetter) return [{type: 'letterMeet', letter: oneLetter, words: w.lwords, note: w.lnote}, letterPic(data, w, oneLetter, r), letterFind(oneLetter, 3, r, week), letterFind(oneLetter, 4, r, week)];
        if (L === 'name') return [{type: 'letterMeet', letter: 'V', words: w.lwords, note: w.lnote}, {type: 'nameBuild', name: NAME}, letterPic(data, w, 'A', r), letterFind('A', 3, r, week, 'Find A!')];
        return [{type: 'abcSong'}, ...shuffle(known, r).slice(0, 3).map(t => letterFind(t, 4, r, week))];
      }
      if (mode === 'find') {
        const t = oneLetter || pick(L === 'name' ? NAME_TRACE : known, r);
        const back = earlierOf(known, t, r);                       // an earlier letter comes back
        return [{type: 'letterPop', target: t, bubbles: shuffle([t, t, t, ...distractors(t, 6, r, week)], r)}, letterFind(t, 4, r, week, `Find ${t} one more time!`),
          ...(back ? [letterFind(back, 4, r, week, `Do you remember ${back}? Find ${back}!`)] : [letterPic(data, w, t, r)])];
      }
      const pool = w.review?.letters?.length ? w.review.letters : w.letters?.length ? w.letters : known;
      return shuffle(pool, r).slice(0, 4).map(t => letterFind(t, 4, r, week));
    }
    case 'count': {
      if (mode === 'review') {
        const ns = (w.review?.numbers || [1, 2, 3]).filter(x => x > 0 && x <= 10);
        const small = ns.filter(x => x <= 5);
        return [countItem(pick(ns, r), micon, mword, r), countItem(pick(ns, r), 'star', 'star', r), {type: 'quick', n: pick(small.length ? small.map(x => Math.min(x, 4)) : [2, 3], r), choices: [1, 2, 3, 4]}, reviewMath(data, week, r)];
      }
      if (N === 0) return [{type: 'zero', groups: shuffle([0, 2, 1], r), icon: 'egg'}, countItem(3, micon, mword, r), reviewMath(data, week, r, 'zero')];
      const other = N === 1 ? 2 : Math.max(1, N - 1);
      return [countItem(N, micon, mword, r), countItem(other, 'star', 'star', r), week > 3 ? reviewMath(data, week, r, w.math) : {type: 'quick', n: Math.min(3, N + 1), choices: [1, 2, 3]}];
    }
    case 'color': {
      if (w.color === 'mix' && mode !== 'review') return [{type: 'colorMix', a: 'red', b: 'yellow', answer: 'orange', choices: shuffle(['orange', 'green', 'purple'], r)},
        {type: 'colorMix', a: 'blue', b: 'yellow', answer: 'green', choices: shuffle(['green', 'orange', 'purple'], r)}, colorPick(data, pick(colorsKnown, r), r, colorsKnown)];
      if (mode === 'review' || !data.colors[w.color]) { const pool = w.review?.colors || colorsKnown.slice(-4); return shuffle(pool, r).slice(0, 3).map(c => colorPick(data, c, r, colorsKnown)); }
      const others = colorsKnown.filter(c => c !== w.color && !(['white', 'gray'].includes(c) && ['white', 'gray'].includes(w.color)));
      const otherPool = (others.length >= 2 ? others : ['blue', 'yellow', 'green'].filter(c => c !== w.color)).flatMap(c => data.colors[c].things.slice(0, 3).map(t => [t[0], t[1], c]));
      const backColor = earlierOf(colorsKnown, w.color, r);          // an earlier color comes back
      return [{type: 'colorHunt', color: w.color, targets: data.colors[w.color].things.slice(0, 3), others: shuffle(otherPool, r).slice(0, 3)}, colorPick(data, w.color, r, colorsKnown),
        ...(backColor ? [colorPick(data, backColor, r, colorsKnown)] : [])];
    }
    case 'shape': {
      if (mode === 'review' || !data.shapes[w.shape]) { const pool = w.review?.shapes || shapesKnown.slice(-4); return shuffle(pool, r).slice(0, 3).map(s => shapeFind(s, r, shapesKnown)); }
      const backShape = earlierOf(w.shapesKnown, w.shape, r);        // an earlier shape comes back
      return [{type: 'shapeThings', shape: w.shape, things: data.shapes[w.shape].slice(0, 3)}, shapeFind(w.shape, r, shapesKnown), backShape ? shapeFind(backShape, r, shapesKnown) : shapeFind(w.shape, r)];
    }
    case 'trace': {
      if (mode === 'review') {
        const ks = (w.review?.strokes || ['down', 'across', 'circle']).filter(k => STROKE_PATHS[k]);
        const lt = pick((w.review?.letters || known).filter(c => c.length === 1), r);
        const nt = pick((w.review?.numbers || [1, 2, 3]).filter(x => x >= 0 && x <= 9), r) ?? 3;
        return [...shuffle(ks, r).slice(0, 2).map(strokeItem), letterTrace(lt), numberTrace(nt)];
      }
      const num = numberTrace(N <= 9 ? N : 5 + Math.floor(r() * 5));          // the week's number (5 to 9 once she counts to 10)
      if (w.stroke === 'name') return [...NAME_TRACE.map(letterTrace), num];
      if (w.stroke === 'letters') return [...LINE_LETTERS.map(letterTrace), num];
      return [strokeItem(STROKE_PATHS[w.stroke] ? w.stroke : 'down'), ...(oneLetter ? [letterTrace(oneLetter)] : []), num];
    }
    case 'story': {
      if (mode === 'retell') { const p = w.story.pages; return [{type: 'sequence', title: w.story.title, cards: [p[0], p[3], p[p.length - 1]], bg: w.bg}]; }
      return [{type: 'story', title: w.story.title, pages: w.story.pages, ask: mode === 'ask', qs: w.story.qs, me: !!w.story.me, bg: w.bg}];
    }
    case 'talk': return mode === 'ask' ? [{type: 'talkAsk', qs: w.talk.qs, target: w.talk.target, tip: w.talk.tip, pics: w.talk.words.map(x => x[1])}]
      : [{type: 'talkWords', words: w.talk.words, target: w.talk.target, tip: w.talk.tip}];
    case 'sound': { const s = data.sounds[w.sound]; return [{type: 'soundPlay', s: w.sound, label: s.label, mouth: s.mouth, cue: s.cue, words: w.swords}]; }
    case 'math': return [...mathItems(w, mode, r, micon, mword), reviewMath(data, week, r, mode)];
    case 'review': {
      const t = pick(known.slice(-6), r), n = 1 + Math.floor(r() * Math.max(1, Math.min(5, w.nmax)));
      return [letterFind(t, 4, r, week), countItem(n, pick(['star', 'balloon', 'baby-chick', 'tropical-fish'], r), 'thing', r), colorPick(data, pick(colorsKnown, r), r, colorsKnown), shapeFind(pick(shapesKnown, r), r, shapesKnown), reviewMath(data, week, r)];
    }
  }
  return [];
}

function mathItems(w, mode, r, icon, word) {
  const N = Math.max(1, w.number), M = Math.max(3, w.nmax);
  const give = n => { const k = Math.min(8, n); return {type: 'give', n: k, icon, word, max: Math.min(10, k + 3)}; };   // Give-N up to 8, with extras to choose from
  switch (mode) {
    case 'count': case 'give': return [give(N), give(N === 1 ? 2 : Math.max(1, Math.min(M, N - 1)))];
    case 'quick': return shuffle([1, 2, 3], r).map(n => ({type: 'quick', n, choices: [1, 2, 3]}));
    case 'zero': return [{type: 'zero', groups: shuffle([0, 2, 1], r), icon: 'egg'}, {type: 'zero', groups: shuffle([0, 3, 1], r), icon: 'baby-chick'}];
    case 'more': return [{type: 'more', a: 2, b: 5, icon}, {type: 'more', a: 4, b: 1, icon: 'star'}];
    case 'size': return [{type: 'size', icon, ask: 'big'}, {type: 'size', icon: 'mouse', ask: 'little'}];
    case 'pattern': return w.n < 20
      ? [{type: 'pattern', seq: ['clapping-hands', 'footprints', 'clapping-hands', 'footprints', 'clapping-hands'], answer: 'footprints', choices: ['footprints', 'clapping-hands'], words: {'clapping-hands': 'clap', footprints: 'stomp'}},
        {type: 'pattern', seq: ['star', 'red-heart', 'star', 'red-heart', 'star'], answer: 'red-heart', choices: shuffle(['red-heart', 'star'], r), words: {star: 'star', 'red-heart': 'heart'}}]
      : [{type: 'pattern', seq: ['fallen-leaf', 'lady-beetle', 'fallen-leaf', 'lady-beetle', 'fallen-leaf'], answer: 'lady-beetle', choices: shuffle(['lady-beetle', 'fallen-leaf'], r), words: {'fallen-leaf': 'leaf', 'lady-beetle': 'ladybug'}},
        {type: 'pattern', seq: ['sun', 'cloud-with-rain', 'sun', 'cloud-with-rain', 'sun'], answer: 'cloud-with-rain', choices: shuffle(['cloud-with-rain', 'sun'], r), words: {sun: 'sun', 'cloud-with-rain': 'rain'}}];
    case 'order': return [{type: 'order', icon: 'duck', n: 5, ask: 'first'}, {type: 'order', icon: 'duck', n: 5, ask: 'last'}];
    case 'sort': return w.n >= 30
      ? shuffle([['rock', 'rock', 'sinks'], ['duck', 'duck', 'floats'], ['coin', 'coin', 'sinks'], ['leaf', 'leaf-fluttering-in-wind', 'floats']], r).map(([name, item, answer]) => ({type: 'sortPick', mode: 'water', name, item, answer, bins: [['floats', 'sailboat'], ['sinks', 'anchor']], prompt: `Will the ${name} float or sink?`}))
      : shuffle([['cow', 'cow-face', 'cows'], ['pig', 'pig-face', 'pigs'], ['cow', 'cow-face', 'cows'], ['pig', 'pig-face', 'pigs']], r).map(([name, item, answer]) => ({type: 'sortPick', mode: 'pens', name, item, answer, bins: [['cows', 'cow-face'], ['pigs', 'pig-face']], prompt: `Where does the ${name} go?`}));
    case 'measure': return [{type: 'measure', ask: 'full'}, {type: 'measure', ask: 'empty'}];
    case 'combine': return [{type: 'combine', a: 2, b: 1, icon: 'tropical-fish', choices: numberChoices(3, r)}, {type: 'combine', a: 3, b: 1, icon: 'tropical-fish', choices: numberChoices(4, r)}];
    default: { const n = 1 + Math.floor(r() * Math.min(5, M)); return [give(n), {type: 'quick', n: Math.min(3, n), choices: [1, 2, 3]}]; }
  }
}

/** Every icon a day's games may show, for checks. */
export function itemIcons(item) {
  const out = [];
  const add = x => { if (typeof x === 'string' && !x.startsWith('letter:')) out.push(x); };
  switch (item.type) {
    case 'letterMeet': case 'talkWords': case 'soundPlay': (item.words || []).forEach(x => add(x[1])); break;
    case 'count': case 'give': case 'more': case 'size': case 'order': case 'combine': case 'zero': add(item.icon); break;
    case 'colorPick': add(item.icon); break;
    case 'colorHunt': item.targets.forEach(x => add(x[1])); item.others.forEach(x => add(x[1])); break;
    case 'shapeThings': item.things.forEach(x => add(x[1])); break;
    case 'pattern': item.seq.forEach(add); item.choices.forEach(add); break;
    case 'sortPick': add(item.item); item.bins.forEach(b => add(b[1])); break;
    case 'story': item.pages.forEach(p => p[1].forEach(add)); break;
    case 'sequence': item.cards.forEach(p => p[1].forEach(add)); break;
    case 'talkAsk': item.pics.forEach(add); break;
    case 'letterPic': item.choices.forEach(x => add(x[1])); break;
  }
  return out;
}
