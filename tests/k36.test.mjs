import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {planDay, defaultK36, normalizeK36, completeStation, isDayDone, awardSticker, stickerFor, nextDay, goToDay, logSpeech, speechSummary,
  STATION_IDS, STICKERS, WEEKS, DAYS, graphemeTiles, rng, shuffle} from '../js/k36-core.js';

const root = resolve(import.meta.dirname, '..');
const data = JSON.parse(await readFile(resolve(root, 'data/k36.json'), 'utf8'));
const pics = JSON.parse(await readFile(resolve(root, 'data/pics.json'), 'utf8'));
const TARGET_SETS = [[], ['s'], ['r', 'l'], ['th', 'sbl', 'rbl', 'k']];

function iconsIn(item) {
  const out = [];
  const walk = v => {
    if (!v || typeof v !== 'object') return;
    if (Array.isArray(v)) { v.forEach(walk); return; }
    for (const [k, x] of Object.entries(v)) {
      if (['i', 'icon'].includes(k) && typeof x === 'string') out.push(x);
      else if (k === 'props' && Array.isArray(x)) x.forEach(p => out.push(p[0]));
      else if (k === 'items' && Array.isArray(x) && x.every(s => typeof s === 'string')) x.forEach(s => out.push(s));
      else walk(x);
    }
  };
  walk(item);
  return out;
}

test('curriculum data has 36 complete weeks', () => {
  assert.equal(data.weeks.length, WEEKS);
  data.weeks.forEach((w, i) => {
    assert.equal(w.n, i + 1);
    assert.ok(w.title && data.units[String(w.u)]);
    assert.ok(w.story.pages.length >= 4, `week ${w.n} story`);
    assert.equal(w.math.length, 4, `week ${w.n} math`);
    assert.ok(w.words.length >= 3, `week ${w.n} words`);
    assert.ok(w.known.length >= 3);
    for (const p of w.pics) assert.ok(data.lex[p], `week ${w.n}: ${p} missing from lexicon`);
  });
  for (const g of ['s', 'a', 't', 'sh', 'qu']) assert.ok(data.sounds[g]?.key);
});

test('every picture the app can show exists', () => {
  const need = new Set([
    ...Object.values(data.lex).map(e => e.i), ...Object.values(data.sounds).map(s => s.i),
    ...data.weeks.flatMap(w => w.story.pages.flatMap(p => p.props.map(x => x[0]))),
    ...data.speech.decks.flatMap(d => d.items.map(i => i.i)), ...data.speech.pairs.flatMap(p => [p.ai, p.bi]),
    ...data.compounds.flatMap(c => [c.i, c.ib].filter(Boolean)), ...Object.values(data.units).map(u => u.icon),
    ...Object.values(STICKERS).flat(), 'ear', 'musical-notes', 'open-book', 'building-construction', 'red-heart', 'abacus', 'books', 'speaking-head',
    'sparkles', 'glowing-star', 'person-swimming', 'clapping-hands', 'package', 'cat-face', 'tennis-ball', 'pencil', 'bubbles', 'dolphin', 'frog', 'butterfly', 'tennis', 'unicorn', 'star'
  ]);
  const missing = [...need].filter(n => !pics[n]);
  assert.deepEqual(missing, []);
  for (const [name, [vb, body]] of Object.entries(pics)) {
    assert.match(vb, /^\d+ \d+ \d+ \d+$/, name);
    assert.ok(!/<script|on\w+=|javascript:/i.test(body), `${name} must be plain SVG`);
  }
});

test('every day of all 36 weeks plans valid, answerable games', () => {
  let items = 0;
  for (const targets of TARGET_SETS) for (let w = 1; w <= WEEKS; w++) for (let d = 1; d <= DAYS; d++) {
    const plan = planDay(data, w, d, {targets});
    const ids = plan.stations.map(s => s.id);
    assert.equal(new Set(ids).size, ids.length, `W${w}D${d} duplicate station`);
    assert.ok(plan.stations.filter(s => s.required).length >= 3, `W${w}D${d} too few games`);
    assert.equal(plan.stations.at(-1).id, 'talk');
    const W = data.weeks[w - 1];
    for (const s of plan.stations) {
      assert.ok(STATION_IDS.includes(s.id));
      assert.ok(s.items.length >= 1 && s.items.length <= 14, `W${w}D${d} ${s.id} has ${s.items.length} items`);
      for (const it of s.items) {
        items++;
        for (const icon of iconsIn(it)) assert.ok(pics[icon], `W${w}D${d} ${s.id}: missing picture ${icon}`);
        if (it.type === 'mc') {
          const vals = it.choices.map(c => String(c.v));
          assert.ok(vals.length >= 2, `W${w}D${d} ${it.mode} choices`);
          assert.equal(new Set(vals).size, vals.length, `W${w}D${d} ${it.mode} duplicate choices ${vals}`);
          assert.equal(vals.filter(v => v === String(it.answer)).length, 1, `W${w}D${d} ${it.mode}: answer ${it.answer} not in ${vals}`);
          assert.ok(it.prompt && it.say);
        }
        if (it.type === 'readPic') {
          assert.ok(W.pics.includes(it.w), `W${w}D${d}: ${it.w} is not decodable this week`);
          assert.equal(it.choices.filter(c => c.v === it.answer).length, 1);
        }
        if (it.type === 'readWord') assert.ok(W.words.some(x => x.w === it.w) || W.pics.includes(it.w));
        if (it.type === 'build') {
          const bank = [...it.bank];
          for (const slot of it.slots) { const k = bank.indexOf(slot.t); assert.ok(k >= 0, `W${w}D${d} build ${it.w}: no tile ${slot.t}`); bank.splice(k, 1); }
          assert.ok(it.bank.length <= it.slots.length + 2);
        }
        if (it.type === 'readSentence') assert.ok(it.tokens.length >= 1);
        if (it.type === 'say') assert.ok(it.w && pics[it.i]);
      }
    }
    if (targets.length) {
      const talk = plan.stations.find(s => s.id === 'talk');
      const decks = new Set(talk.items.filter(i => i.type === 'say').map(i => i.deck));
      for (const k of targets) assert.ok(decks.has(k), `W${w}D${d}: target ${k} missing from Talk Time`);
    }
  }
  assert.ok(items > 20000);
});

test('plans are the same every time for the same day', () => {
  assert.deepEqual(planDay(data, 12, 3), planDay(data, 12, 3));
  assert.notDeepEqual(planDay(data, 12, 3).stations[0].items, planDay(data, 12, 4).stations[0].items);
});

test('first-letter games only use words that really start with that letter sound', () => {
  for (let w = 1; w <= WEEKS; w++) for (let d = 1; d <= DAYS; d++) {
    for (const s of planDay(data, w, d).stations) for (const it of s.items) {
      if (it.mode !== 'firstLetter') continue;
      assert.equal(data.lex[it.target.w].fg, it.answer, `${it.target.w} / ${it.answer}`);
      assert.ok(!(it.choices.some(c => c.v === 'c') && it.choices.some(c => c.v === 'k')), 'c and k together are ambiguous');
    }
  }
});

test('silent e and vowel teams become the right tiles', () => {
  assert.deepEqual(graphemeTiles(['c', 'a_e', 'k', 'e_silent']), [{t: 'c'}, {t: 'a', vce: true}, {t: 'k'}, {t: 'e', silent: true}]);
  assert.deepEqual(graphemeTiles(['sh', 'i', 'p']).map(t => t.t), ['sh', 'i', 'p']);
});

test('progress: stations, stickers and days', () => {
  let st = defaultK36();
  const plan = planDay(data, 3, 2);
  for (const s of plan.stations.filter(x => x.required)) { assert.equal(isDayDone(st, plan), false); st = completeStation(st, 3, 2, s.id); }
  assert.equal(isDayDone(st, plan), true);
  st = awardSticker(st, 3, 2, plan.unit);
  assert.equal(st.stickers['3-2'], stickerFor(3, 2, plan.unit));
  assert.deepEqual(nextDay(3, 5), {week: 4, day: 1});
  assert.deepEqual(nextDay(36, 5), {week: 36, day: 5});
  st = goToDay(st, 99, -4);
  assert.equal(st.week, 36); assert.equal(st.day, 1);
  assert.throws(() => completeStation(st, 1, 1, 'unknown'));
});

test('stored progress is cleaned before use', () => {
  const dirty = {version: 1, week: 80, day: 0, days: {'1-1': {done: ['sounds', 'hack', 'sounds'], at: 5}, '99-9': {done: ['read']}, 'x': 1},
    stickers: {'1-1': 'unicorn', '1-2': '<script>'}, speech: {targets: ['s', 'r', '<b>', 'l', 'th', 'k'], log: [{d: '2026-09-01', k: 's', c: 9, t: 4}, {d: '2026-09-02', k: 's', c: 3, t: 4}, {d: 'bad'}]},
    settings: {breaks: 'yes'}};
  const st = normalizeK36(dirty);
  assert.equal(st.week, 36); assert.equal(st.day, 1);
  assert.deepEqual(Object.keys(st.days), ['1-1']);
  assert.deepEqual(st.days['1-1'].done, ['sounds']);
  assert.deepEqual(st.stickers, {'1-1': 'unicorn'});
  assert.deepEqual(st.speech.targets, ['s', 'r', 'l', 'th']);
  assert.deepEqual(st.speech.log, [{d: '2026-09-02', k: 's', c: 3, t: 4}]);
  assert.equal(st.settings.breaks, true);
  assert.deepEqual(normalizeK36(null), defaultK36());
  assert.deepEqual(normalizeK36({version: 2}), defaultK36());
});

test('speech tallies add up by day and sound', () => {
  const today = new Date(2026, 8, 30);
  let st = defaultK36();
  st = logSpeech(st, {k: 's', c: 8, t: 10, date: today});
  st = logSpeech(st, {k: 's', c: 9, t: 10, date: today});
  st = logSpeech(st, {k: 'r', c: 2, t: 10, date: new Date(2026, 8, 1)});
  st = logSpeech(st, {k: 's', c: 11, t: 10, date: today});
  assert.equal(st.speech.log.length, 2);
  const sum = speechSummary(st, 14, today);
  assert.deepEqual(sum.map(s => [s.k, s.c, s.t, s.pct]), [['s', 17, 20, 85]]);
});

test('seeded shuffle keeps every item', () => {
  const r = rng(7); const a = shuffle([1, 2, 3, 4, 5], r);
  assert.deepEqual([...a].sort(), [1, 2, 3, 4, 5]);
});
