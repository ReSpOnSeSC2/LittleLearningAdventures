import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, access} from 'node:fs/promises';
import {resolve} from 'node:path';
import {WEEKS, DAYS, STATION_IDS, planDay} from '../js/k36-core.js';
import {defaultMF, normalizeMF, HEROES, HERO_IDS, unlockedHeroes, party, xpForLevel, levelOf, addXP, skillOf, recordAnswer, battleItems, BATTLE_READY,
  mapIdFor, todaysCritters, markWon, todaysStones, todaysSigns, findPath, nearestOpen, blockedFn, npcLine, MAP_BY_UNIT} from '../js/mf-core.js';

const root = resolve(import.meta.dirname, '..');
const data = JSON.parse(await readFile(resolve(root, 'data/k36.json'), 'utf8'));
const mf = JSON.parse(await readFile(resolve(root, 'data/mf.json'), 'utf8'));

test('every sprite the adventure names exists on disk', async () => {
  const art = mf.art; const files = new Set();
  for (const h of Object.values(art.heroes)) files.add(h.img);
  for (const n of Object.values(art.npcs)) files.add(n.img);
  for (const b of Object.values(art.battlers)) files.add(b.img);
  for (const c of Object.values(art.critters)) { files.add(c.img); files.add(c.mini); }
  for (const o of Object.values(art.objects)) files.add(o.img);
  for (const b of Object.values(art.busts)) files.add(b);
  for (const m of Object.values(mf.maps)) files.add(m.ground);
  files.add('fx'); files.add('logo'); files.add('title');
  for (const f of files) await access(resolve(root, `assets/mf/${f}.webp`));
  for (const id of HERO_IDS) { assert.ok(art.heroes[id], `walk sheet for ${id}`); assert.ok(art.busts[id], `portrait for ${id}`); }
});

test('six maps: every learning building, critter spot, stone, sign and friend can be reached from home', () => {
  assert.deepEqual(Object.keys(mf.maps).sort(), Object.values(MAP_BY_UNIT).sort());
  for (const m of Object.values(mf.maps)) {
    const blocked = blockedFn(m);
    assert.equal(m.blocked.length, m.h); assert.ok(m.blocked.every(r => r.length === m.w));
    assert.ok(!blocked(...m.start), `${m.id}: start blocked`);
    const stations = m.objects.filter(o => o.station).map(o => o.station).sort();
    assert.deepEqual(stations, [...STATION_IDS].sort(), `${m.id} stations`);
    const goals = [...m.objects.filter(o => o.station).map(o => o.door), m.boss, ...m.critters, ...m.stones, ...m.signs.map(([c, r]) => [c, r + 1]), ...m.npcs.map(n => [n.c, n.r])];
    for (const g of goals) {
      const p = findPath(blocked, m.w, m.h, m.start, g, 20000);
      assert.ok(p, `${m.id}: no path to ${g}`);
      for (let i = 1; i < p.length; i++) { const [a, b] = p[i - 1], [c, d] = p[i]; assert.ok(Math.max(Math.abs(a - c), Math.abs(b - d)) === 1 && !blocked(c, d)); }
    }
    for (const id of m.roster) assert.ok(mf.art.critters[id], `${m.id} roster ${id}`);
    assert.equal(m.bosses.length, 6);
    for (const id of m.bosses) assert.ok(mf.art.critters[id], `${m.id} boss ${id}`);
  }
});

test('saved adventure progress is cleaned before use', () => {
  assert.deepEqual(normalizeMF(null), defaultMF());
  const dirty = {version: 1, leader: 'bowser', xp: -5, friends: {dust_bunny: 2, '<img>': 3}, embers: {3: true, 99: true}, won: {'2-3': ['c1', 'boss', 'x<>'], '40-1': ['c1']},
    skills: {'g:s': {c: 3, t: 4, d: '2026-09-30'}, 'bad key!!': {c: 1, t: 1}, 'h:the': {c: 5, t: 2}}, pos: {meadow: [100, 200], mars: [1, 1]}, settings: {world: false, music: 'loud'}, stats: {battles: 2, q: 10, first: 20}};
  const st = normalizeMF(dirty);
  assert.equal(st.leader, 'jay'); assert.equal(st.xp, 0);
  assert.deepEqual(st.friends, {dust_bunny: 2}); assert.deepEqual(st.embers, {3: true});
  assert.deepEqual(st.won, {'2-3': ['c1', 'boss']});
  assert.deepEqual(Object.keys(st.skills), ['g:s']);
  assert.deepEqual(st.pos, {meadow: [100, 200]});
  assert.equal(st.settings.world, false); assert.equal(st.settings.music, true);
  assert.equal(st.stats.first, 10);
  assert.deepEqual(normalizeMF(JSON.parse(JSON.stringify(st))), st);
});

test('heroes join over the year and levels climb steadily', () => {
  assert.deepEqual(unlockedHeroes(1), ['jay', 'ana']);
  assert.ok(unlockedHeroes(2).includes('mia') && !unlockedHeroes(6).includes('milo'));
  assert.deepEqual(unlockedHeroes(36), HERO_IDS);
  assert.deepEqual(party({leader: 'mia'}, 1), ['jay', 'ana']);
  assert.equal(party({leader: 'mia'}, 3)[0], 'mia');
  for (let L = 1; L < 60; L++) { assert.ok(xpForLevel(L + 1) > xpForLevel(L)); assert.equal(levelOf(xpForLevel(L)), L); }
  const {st, leveled, level} = addXP(defaultMF(), 70);
  assert.equal(st.xp, 70); assert.ok(leveled); assert.equal(level, 2);
  for (const h of Object.values(HEROES)) assert.ok(h.name && h.move && h.hit && h.fx && h.special);
});

test('battle questions: every day of the year, answerable, mixed skills, no repeats', () => {
  let n = 0;
  for (let w = 1; w <= WEEKS; w++) for (let d = 1; d <= DAYS; d++) {
    for (const kind of ['critter', 'boss', ...(w % 6 === 0 ? ['final'] : [])]) for (const seed of [1, 2]) {
      const items = battleItems(data, w, d, defaultMF(), {kind, seed, today: '2026-09-30'});
      const want = kind === 'critter' ? 3 : kind === 'boss' ? 5 : 6;
      assert.equal(items.length, want, `W${w}D${d} ${kind}: ${items.length} questions`);
      assert.equal(new Set(items.map(i => i.skill)).size, items.length, `W${w}D${d} ${kind}: repeated skill`);
      for (const it of items) {
        n++;
        assert.ok(BATTLE_READY(it) && it.skill, `W${w}D${d}: not battle ready ${it.type}`);
        const vals = it.choices.map(c => String(c.v));
        assert.equal(vals.filter(v => v === String(it.answer)).length, 1, `W${w}D${d} ${it.mode}: answer ${it.answer}`);
        assert.ok(it.say || it.prompt);
      }
      assert.ok(items.some(it => it.skill.startsWith('m:')), `W${w}D${d} ${kind}: no math`);
      assert.ok(items.some(it => /^(g|pa|h|w):/.test(it.skill)), `W${w}D${d} ${kind}: no literacy`);
    }
  }
  assert.ok(n > 3000);
});

test('battles bring back the skills she keeps missing', () => {
  // find a letter skill that shows up only sometimes, then have her miss it a lot
  const counts = {};
  for (let seed = 1; seed <= 80; seed++) for (const it of battleItems(data, 10, 2, defaultMF(), {kind: 'boss', seed, today: '2026-09-30'})) counts[it.skill] = (counts[it.skill] || 0) + 1;
  const skill = Object.keys(counts).filter(k => k.startsWith('g:')).sort((a, b) => counts[a] - counts[b])[0];
  const item = {type: 'mc', mode: 'firstLetter', answer: skill.slice(2)};
  let st = defaultMF();
  for (let i = 0; i < 6; i++) st = recordAnswer(st, item, false, new Date('2026-09-20T10:00:00'));
  assert.equal(st.skills[skill].t, 6); assert.equal(st.skills[skill].c, 0);
  let hits = 0;
  for (let seed = 1; seed <= 80; seed++) if (battleItems(data, 10, 2, st, {kind: 'boss', seed, today: '2026-09-30'}).some(i => i.skill === skill)) hits++;
  assert.ok(hits > counts[skill] * 1.5, `weak skill ${skill} picked ${hits} vs ${counts[skill]}`);
});

test('skill tags', () => {
  assert.equal(skillOf({type: 'mc', mode: 'firstLetter', answer: 's'}), 'g:s');
  assert.equal(skillOf({type: 'mc', mode: 'heartFind', answer: 'The'}), 'h:the');
  assert.equal(skillOf({type: 'mc', mode: 'rhyme', listen: true}), 'pa:rhyme');
  assert.equal(skillOf({type: 'mc', mode: 'odd', listen: true}), 'pa:odd');
  assert.equal(skillOf({type: 'mc', mode: 'odd'}), 'm:odd');
  assert.equal(skillOf({type: 'readPic', w: 'cat'}), 'w:cat');
});

test('today in the world: critters wake up between games, the boss on Friday, stones and signs fit the week', () => {
  for (let w = 1; w <= WEEKS; w++) for (let d = 1; d <= DAYS; d++) {
    const map = mf.maps[mapIdFor(data, w)]; const review = data.weeks[w - 1].kind === 'review';
    const plan = planDay(data, w, d); const req = plan.stations.filter(s => s.required).length;
    const c0 = todaysCritters(map, w, d, {done: 0, required: req, review});
    const c9 = todaysCritters(map, w, d, {done: 9, required: req, review});
    assert.deepEqual(todaysCritters(map, w, d, {done: 0, required: req, review}), c0);
    assert.equal(c0.filter(c => !c.boss).length, review ? 3 : 2);
    assert.equal(c0[0].awake, true); assert.equal(c0[1].awake, false);
    assert.ok(c9.every(c => c.awake));
    assert.equal(c0.some(c => c.boss), d === DAYS);
    for (const c of c0) assert.ok(mf.art.critters[c.id]);
    const boss = c0.find(c => c.boss);
    if (boss) assert.ok(c0.every(c => c.boss || c.id !== boss.id), `W${w} boss ${boss.id} is also a small critter`);
    const stones = todaysStones(map, data, w, d);
    assert.ok(stones.length >= 3 && stones.length <= 5, `W${w}D${d} ${stones.length} stones`);
    for (const s of stones) assert.ok(data.sounds[s.g] && s.word && !blockedFn(map)(s.c, s.r));
    assert.ok(stones.slice(0, data.weeks[w - 1].newg.filter(g => data.sounds[g]).length).every(s => data.weeks[w - 1].newg.includes(s.g)));
    const signs = todaysSigns(map, data, w, d);
    assert.ok(signs.length >= 1, `W${w}D${d} no signs`);
    for (const s of signs) assert.ok(data.weeks[w - 1].words.some(x => x.w === s.w));
  }
  let st = markWon(defaultMF(), 5, 5, 'boss', 'aurora_moth');
  assert.equal(st.embers[5], true); assert.equal(st.friends.aurora_moth, 1);
  const map = mf.maps.meadow;
  assert.ok(todaysCritters(map, 5, 5, {done: 9, required: 4, st}).find(c => c.boss).won);
});

test('pathfinding goes around walls and finds the nearest open tile', () => {
  const grid = ['00000', '01110', '01010', '01110', '00000'];
  const blocked = (c, r) => c < 0 || r < 0 || c > 4 || r > 4 || grid[r][c] === '1';
  const p = findPath(blocked, 5, 5, [0, 2], [4, 2]);
  assert.ok(p && p[0].join() === '0,2' && p.at(-1).join() === '4,2' && p.length === 9);
  assert.equal(findPath(blocked, 5, 5, [0, 0], [2, 2]), null);
  assert.deepEqual(nearestOpen(blocked, 5, 5, 2, 1), [2, 0]);
});

test('friends always have something kind to say', () => {
  for (const id of ['glint', 'vivi', 'buni', 'mom', 'biscuit'])
    for (let n = 0; n < 6; n++) {
      const line = npcLine(id, {name: 'Ana', next: 'the Arcade', left: 2, newg: ['s', 'a'], keys: {s: 'sun', a: 'apple'}, heart: ['the']}, n);
      assert.ok(typeof line === 'string' && line.length > 4 && !/undefined|null/.test(line), `${id}: ${line}`);
    }
});
