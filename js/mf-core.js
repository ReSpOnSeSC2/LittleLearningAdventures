/**
 * Meteor Falls adventure layer for the kindergarten year: pure logic, no DOM.
 * Heroes and levels, saved progress, today's critters, letter stones and word signs,
 * battle questions (this week + spaced review, weakest skills first) and pathfinding.
 * Art and characters come from Jonathan's Meteor Falls game (github.com/ReSpOnSeSC2/Meteor-Falls).
 */
import {rng, shuffle, soundItems, listenItems, readItems, heartItems, mathItems, WEEKS, DAYS, dayKey, isoDate} from './k36-core.js';

export const MF_KEY = 'little-learning-mf-v1';
export const MAP_BY_UNIT = {1: 'meadow', 2: 'park', 3: 'cove', 4: 'court', 5: 'garden', 6: 'launch'};

/* Heroes. `week` = the week they join the team. Moves are what the battle text calls out. */
export const HEROES = {
  jay: {name: 'Jay', week: 1, move: 'Casey Swing', hit: 'SMAAASH!', fx: 'smash', special: 'Vibe Surge', color: '#e03131'},
  ana: {name: 'Ana', week: 1, move: 'Rainbow Kick', hit: 'BOOM!', fx: 'star', special: 'Rainbow Blast', color: '#e64980'},
  mia: {name: 'Mia', week: 2, move: 'Frying Pan Bonk', hit: 'BONK!', fx: 'sparkle', special: 'Vibe Fire', color: '#f59f00'},
  milo: {name: 'Milo', week: 7, move: 'Bottle Rocket', hit: 'ZAP!', fx: 'volt', special: 'Mega Rocket', color: '#2f9e44'},
  dorin: {name: 'Dorin', week: 13, move: 'Palm Strike', hit: 'WHAM!', fx: 'meteor', special: 'Vibe Comet', color: '#1c7ed6'},
  pippa: {name: 'Pippa', week: 25, move: 'Thimble Toss', hit: 'PING!', fx: 'crown', special: 'Royal Rally', color: '#7048e8'}
};
export const HERO_IDS = Object.keys(HEROES);
export const unlockedHeroes = week => HERO_IDS.filter(id => HEROES[id].week <= week);
export function party(st, week) {
  const open = unlockedHeroes(week);
  const lead = open.includes(st.leader) ? st.leader : 'jay';
  return [lead, ...open.filter(h => h !== lead)].slice(0, 5);
}

/* XP and levels: early levels come quickly, later ones slow down. */
export const XP = {first: 10, later: 5, win: 25, boss: 60, station: 20, stone: 3, sign: 4};
export const xpForLevel = L => L <= 1 ? 0 : Math.round(60 * Math.pow(L - 1, 1.6));
export function levelOf(xp) { let L = 1; while (L < 99 && xp >= xpForLevel(L + 1)) L++; return L; }

const clampInt = (v, lo, hi, d) => Number.isInteger(v) ? Math.max(lo, Math.min(hi, v)) : d;
const DAYKEY = /^([1-9]|[12]\d|3[0-6])-[1-5]$/;

export function defaultMF() {
  return {version: 1, leader: 'jay', xp: 0, friends: {}, embers: {}, skills: {}, won: {}, stones: {}, signs: {}, pos: {}, seen: {},
    settings: {world: true, battles: true, music: true}, stats: {battles: 0, q: 0, first: 0}};
}
export function normalizeMF(input) {
  const out = defaultMF();
  if (!input || typeof input !== 'object' || input.version !== 1) return out;
  if (HERO_IDS.includes(input.leader)) out.leader = input.leader;
  out.xp = clampInt(input.xp, 0, 5e6, 0);
  const obj = v => v && typeof v === 'object' && !Array.isArray(v);
  if (obj(input.friends)) for (const [k, v] of Object.entries(input.friends)) if (/^[a-z_]{2,40}$/.test(k)) out.friends[k] = clampInt(v, 1, 9999, 1);
  if (obj(input.embers)) for (const k of Object.keys(input.embers)) { const w = Number(k); if (Number.isInteger(w) && w >= 1 && w <= WEEKS) out.embers[w] = true; }
  if (obj(input.skills)) {
    const rows = Object.entries(input.skills).filter(([k, v]) => /^[a-z]{1,2}:[\w' -]{1,30}$/i.test(k) && obj(v))
      .map(([k, v]) => [k, {c: clampInt(v.c, 0, 9999, 0), t: clampInt(v.t, 0, 9999, 0), d: typeof v.d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v.d) ? v.d : ''}])
      .filter(([, v]) => v.c <= v.t && v.t > 0).sort((a, b) => (b[1].d || '').localeCompare(a[1].d || '')).slice(0, 500);
    for (const [k, v] of rows) out.skills[k] = v;
  }
  for (const key of ['won', 'stones', 'signs']) if (obj(input[key])) {
    for (const [k, v] of Object.entries(input[key])) if (DAYKEY.test(k) && Array.isArray(v)) out[key][k] = [...new Set(v.filter(x => typeof x === 'string' && /^[a-z]{1,6}\d{0,2}$/.test(x)))].slice(0, 12);
  }
  if (obj(input.pos)) for (const [k, v] of Object.entries(input.pos)) if (Object.values(MAP_BY_UNIT).includes(k) && Array.isArray(v) && v.length === 2 && v.every(n => Number.isFinite(n) && n >= 0 && n < 4000)) out.pos[k] = [Math.round(v[0]), Math.round(v[1])];
  if (obj(input.seen)) for (const k of Object.keys(input.seen)) if (/^[a-z0-9_-]{1,30}$/.test(k)) out.seen[k] = true;
  if (obj(input.settings)) for (const k of ['world', 'battles', 'music']) if (typeof input.settings[k] === 'boolean') out.settings[k] = input.settings[k];
  if (obj(input.stats)) { out.stats.battles = clampInt(input.stats.battles, 0, 99999, 0); out.stats.q = clampInt(input.stats.q, 0, 999999, 0); out.stats.first = clampInt(input.stats.first, 0, out.stats.q, 0); }
  return out;
}
export function loadMF(storage) { try { return normalizeMF(JSON.parse(storage.getItem(MF_KEY))); } catch { return defaultMF(); } }
export function saveMF(storage, st) { try { storage.setItem(MF_KEY, JSON.stringify(normalizeMF(st))); return true; } catch { return false; } }

export function addXP(st, n) {
  const before = levelOf(st.xp); const next = normalizeMF(st); next.xp = Math.min(5e6, next.xp + Math.max(0, n | 0));
  return {st: next, level: levelOf(next.xp), leveled: levelOf(next.xp) > before};
}

/* ------------------------------------------------------------------ skills */
const LISTEN_MODES = new Set(['rhyme', 'first', 'last', 'middle', 'swap', 'blendParts', 'deleteSyl', 'syllables', 'countSounds']);
export function skillOf(it) {
  if (!it) return null;
  if (it.type === 'readPic' || it.type === 'readWord') return `w:${it.w}`;
  if (it.type === 'build') return `b:${it.w}`;
  if (it.type !== 'mc') return null;
  if (it.mode === 'firstLetter' || it.mode === 'team') return `g:${it.answer}`;
  if (it.mode === 'heartFind' || it.mode === 'heartFlash') return `h:${String(it.answer).toLowerCase()}`;
  if (it.mode === 'pair') return `sp:${it.tag}`;
  if (it.listen || LISTEN_MODES.has(it.mode)) return `pa:${it.mode}`;
  return `m:${it.mode}`;
}
export const skillArea = key => ({g: 'Letters and sounds', h: 'Heart words', w: 'Reading words', b: 'Spelling', pa: 'Listening for sounds', sp: 'Speech listening', m: 'Math'})[String(key).split(':')[0]] || 'Other';
export function recordAnswer(st, item, firstTry, date = new Date()) {
  const next = normalizeMF(st); const key = skillOf(item);
  next.stats.q++; if (firstTry) next.stats.first++;
  if (key) { const s = next.skills[key] || {c: 0, t: 0, d: ''}; s.t++; if (firstTry) s.c++; s.d = isoDate(date); next.skills[key] = s; }
  return next;
}
const weakness = (st, key, today) => {
  const s = st.skills[key];
  if (!s) return 0.55;
  let w = 1 - (s.c + 1) / (s.t + 2);
  if (s.t >= 2 && s.c / s.t < 0.7) w += 0.25;
  if (s.d === today) w -= 0.2;
  return w;
};

/* ------------------------------------------------------------------ battle questions */
const DOMAINS = {
  letters: (data, W, r) => soundItems(data, W, r, {review: true}).filter(it => it.type === 'mc'),
  listen: (data, W, r) => listenItems(data, W, r, {mix: true}),
  heart: (data, W, r) => heartItems(data, W, r, {review: true}),
  read: (data, W, r) => readItems(data, W, r).filter(it => it.type === 'readPic'),
  math: (data, W, r) => mathItems(data, W, r, W.math, 4)
};
export const BATTLE_READY = it => (it.type === 'mc' && Array.isArray(it.choices) && it.choices.length >= 2) || it.type === 'readPic';
function reviewWeek(week, r) {
  const back = [1, 2, 4, 8, 16].map(n => week - n).filter(w => w >= 1);
  return back.length ? back[Math.floor(r() * back.length)] : week;
}
/**
 * Questions for one battle. kind: 'critter' (3), 'boss' (5), 'final' (6 on celebration weeks).
 * Every battle mixes a sound/letter skill, a reading skill and math, prefers skills she has missed,
 * and the boss adds spaced review from an earlier week.
 */
export function battleItems(data, week, day, st, {kind = 'critter', seed = 1, today = isoDate()} = {}) {
  const w = clampInt(week, 1, WEEKS, 1); const d = clampInt(day, 1, DAYS, 1);
  const r = rng(w * 7919 + d * 613 + seed * 97 + (kind === 'critter' ? 0 : 50021));
  const W = data.weeks[w - 1];
  const plan = kind === 'critter' ? [r() < 0.5 ? 'letters' : 'listen', r() < 0.5 ? 'heart' : 'read', 'math']
    : ['letters', 'listen', r() < 0.5 ? 'heart' : 'read', 'math', 'review', ...(kind === 'final' ? ['review'] : [])];
  const items = []; const usedSkills = new Set(); const usedText = new Set();
  const choose = (pool) => {
    const ok = pool.filter(it => BATTLE_READY(it) && !usedSkills.has(skillOf(it)) && !usedText.has(it.prompt + '|' + (it.w || '') + '|' + it.answer));
    if (!ok.length) return null;
    return ok.map(it => ({it, s: weakness(st, skillOf(it), today) + r() * 0.3})).sort((a, b) => b.s - a.s)[0].it;
  };
  for (const slot of plan) {
    let pick = null;
    if (slot === 'review') {
      const RW = data.weeks[reviewWeek(w, r) - 1];
      const doms = shuffle(['letters', 'heart', 'math', 'listen'], r);
      for (const dom of doms) { pick = choose(DOMAINS[dom](data, RW, r)); if (pick) break; }
    } else {
      pick = choose(DOMAINS[slot](data, W, r));
      if (!pick && slot === 'read') pick = choose(DOMAINS.heart(data, W, r));
      if (!pick) pick = choose(DOMAINS.letters(data, W, r)) || choose(DOMAINS.math(data, W, r));
    }
    if (pick) { items.push({...pick, skill: skillOf(pick)}); usedSkills.add(skillOf(pick)); usedText.add(pick.prompt + '|' + (pick.w || '') + '|' + pick.answer); }
  }
  return items;
}

/* ------------------------------------------------------------------ today's world */
export const mapIdFor = (data, week) => MAP_BY_UNIT[data.weeks[clampInt(week, 1, WEEKS, 1) - 1].u] || 'meadow';
/** Critters roaming today. The first is awake from the start; the next wake up as stations get done. */
export function todaysCritters(map, week, day, {done = 0, required = 4, review = false, st = defaultMF()} = {}) {
  const r = rng(week * 131 + day * 17 + 5);
  const n = review ? 3 : 2;
  const spots = shuffle(map.critters.map((_, i) => i), r).slice(0, n);
  const bossId = map.bosses[(week - 1) % map.bosses.length];
  // On boss day the small critters are other kinds, so the boss feels new.
  const pool = day === DAYS ? map.roster.filter(id => id !== bossId) : map.roster;
  const roster = shuffle(pool.length ? pool : map.roster, rng(week * 71 + day));
  const won = st.won[dayKey(week, day)] || [];
  const out = spots.map((i, k) => {
    const key = `c${i}`;
    return {key, spot: i, c: map.critters[i][0], r: map.critters[i][1], id: roster[k % roster.length], awake: done >= [0, 2, 3][k], won: won.includes(key)};
  });
  const boss = {key: 'boss', c: map.boss[0], r: map.boss[1], id: bossId, boss: true,
    awake: day === DAYS && done >= required, won: won.includes('boss'), final: review};
  return day === DAYS ? [...out, boss] : out;
}
export function markWon(st, week, day, key, critterId) {
  const next = normalizeMF(st); const k = dayKey(week, day);
  next.won[k] = [...new Set([...(next.won[k] || []), key])];
  if (critterId) next.friends[critterId] = (next.friends[critterId] || 0) + 1;
  next.stats.battles++;
  if (key === 'boss') next.embers[week] = true;
  return next;
}
/** Letter stones: this week's new sounds first, then review sounds. */
export function todaysStones(map, data, week, day) {
  const W = data.weeks[clampInt(week, 1, WEEKS, 1) - 1];
  const r = rng(week * 37 + day * 11);
  const fresh = W.newg.filter(g => data.sounds[g]);
  const review = shuffle(W.known.filter(g => data.sounds[g] && !fresh.includes(g)), r);
  const letters = [...fresh, ...review].slice(0, Math.min(5, map.stones.length));
  const spots = shuffle(map.stones.map((_, i) => i), r).slice(0, letters.length);
  return letters.map((g, k) => ({key: `s${spots[k]}`, c: map.stones[spots[k]][0], r: map.stones[spots[k]][1], g, word: data.sounds[g].key, i: data.sounds[g].i}));
}
/** Word signs: short decodable words of the week to read in the world. */
export function todaysSigns(map, data, week, day) {
  const W = data.weeks[clampInt(week, 1, WEEKS, 1) - 1];
  const r = rng(week * 53 + day * 29);
  const words = shuffle([...new Set(W.words.map(x => x.w).filter(x => x === x.toLowerCase() && x.length <= 6))], r);
  return map.signs.slice(0, Math.min(3, words.length)).map((s, i) => ({key: `w${i}`, c: s[0], r: s[1], w: words[i], g: (W.words.find(x => x.w === words[i]) || {}).g || words[i].split('')}));
}

/* ------------------------------------------------------------------ pathfinding */
/** A* on the tile grid (8 directions, no corner cutting). blocked(c, r) -> bool. Returns tiles from start to goal (inclusive) or null. */
export function findPath(blocked, w, h, start, goal, maxNodes = 4000) {
  const key = (c, r) => r * w + c; const [sc, sr] = start; const [gc, gr] = goal;
  if (blocked(gc, gr)) return null;
  if (sc === gc && sr === gr) return [[sc, sr]];
  const hcost = (c, r) => { const dx = Math.abs(c - gc), dy = Math.abs(r - gr); return (dx + dy) + (Math.SQRT2 - 2) * Math.min(dx, dy); };
  const open = [[hcost(sc, sr), 0, sc, sr]]; const g = new Map([[key(sc, sr), 0]]); const from = new Map();
  let n = 0;
  while (open.length && n++ < maxNodes) {
    let bi = 0; for (let i = 1; i < open.length; i++) if (open[i][0] < open[bi][0]) bi = i;
    const [, cost, c, r] = open.splice(bi, 1)[0];
    if (c === gc && r === gr) {
      const path = [[c, r]]; let k = key(c, r);
      while (from.has(k)) { k = from.get(k); path.unshift([k % w, Math.floor(k / w)]); }
      return path;
    }
    if (cost > (g.get(key(c, r)) ?? Infinity)) continue;
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const nc = c + dc, nr = r + dr;
      if (nc < 0 || nr < 0 || nc >= w || nr >= h || blocked(nc, nr)) continue;
      if (dc && dr && (blocked(c + dc, r) || blocked(c, r + dr))) continue;
      const ng = cost + (dc && dr ? Math.SQRT2 : 1);
      if (ng < (g.get(key(nc, nr)) ?? Infinity)) { g.set(key(nc, nr), ng); from.set(key(nc, nr), key(c, r)); open.push([ng + hcost(nc, nr), ng, nc, nr]); }
    }
  }
  return null;
}
/** Nearest walkable tile to (c, r), searching outward ring by ring. */
export function nearestOpen(blocked, w, h, c, r, maxR = 6) {
  if (c >= 0 && r >= 0 && c < w && r < h && !blocked(c, r)) return [c, r];
  for (let d = 1; d <= maxR; d++) {
    let best = null, bd = Infinity;
    for (let dr = -d; dr <= d; dr++) for (let dc = -d; dc <= d; dc++) {
      if (Math.max(Math.abs(dc), Math.abs(dr)) !== d) continue;
      const nc = c + dc, nr = r + dr;
      if (nc < 0 || nr < 0 || nc >= w || nr >= h || blocked(nc, nr)) continue;
      const dist = dc * dc + dr * dr; if (dist < bd) { bd = dist; best = [nc, nr]; }
    }
    if (best) return best;
  }
  return null;
}
export function blockedFn(map) {
  const rows = map.blocked;
  return (c, r) => c < 0 || r < 0 || c >= map.w || r >= map.h || rows[r][c] === '1';
}

/* ------------------------------------------------------------------ friendly talk */
const letterName = g => g.split('').map(c => c.toUpperCase()).join(' ');
/** What each friend says, based on today. ctx: {name, next, left, allDone, awake, stones, newg, keys, heart, unit, visits} */
export function npcLine(id, ctx, n = 0) {
  const nm = ctx.name || 'friend';
  const g = ctx.newg?.[n % Math.max(1, ctx.newg.length)];
  const key = ctx.keys?.[g];
  const heart = ctx.heart?.[n % Math.max(1, ctx.heart?.length || 1)];
  switch (id) {
    case 'glint': {
      if (ctx.bossAwake) return `${nm}! The big Hush critter is at the meteor! Your team can do it!`;
      if (ctx.allDone) return ctx.awake ? `You did every game today! A Hush critter is still grumpy. Want to help it?` : `You did everything today, ${nm}! You are a shining star!`;
      if (ctx.next) return [`Hi ${nm}! Let’s go to ${ctx.next}! Follow me!`, `${ctx.next} is waiting for you, ${nm}!`, `Tap ${ctx.next} and I’ll show you the way!`][n % 3];
      return `Hi ${nm}! I’m Glint. Let’s learn and play!`;
    }
    case 'vivi': return [
      g && key ? `${nm}! ${key} starts with ${letterName(g)}! Can you say ${key}?` : `${nm}! Play with me!`,
      `Let’s find the glowing letter stones, ${nm}!`,
      `Cat, hat, bat! They rhyme! Can you think of one more?`,
      `I love you, ${nm}!`][n % 4];
    case 'buni': return [
      `Buni is so proud of you, sweetheart!`,
      heart ? `Buni’s special word today is ${heart}. It’s a heart word! Can you find it?` : `Read me a word from a sign, my dear!`,
      `Slow and steady, one sound at a time. You can do it!`][n % 3];
    case 'mom': return [
      `Great job today, ${nm}! Mommy loves you!`,
      ctx.left ? `Only ${ctx.left} more ${ctx.left === 1 ? 'game' : 'games'} today! You can do it!` : `You finished today! High five!`,
      `Take a big breath, then let’s keep going!`][n % 3];
    case 'biscuit': return ['Woof! Woof!', 'Arf arf! Biscuit wants to play!', 'Woof! Biscuit is happy!'][n % 3];
    default: return `Hi ${nm}!`;
  }
}
