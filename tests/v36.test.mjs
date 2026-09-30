import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {planDay, stationItems, defaultV36, normalizeV36, completeStation, isDayDone, awardSticker, eggStage, hatchFriend, nextDay, goToDay,
  loadV36, saveV36, logTalk, logSound, stickerFor, STICKERS, STROKE_PATHS, itemIcons, distractors, rng, WEEKS, DAYS, V36_KEY, NAME} from '../js/v36-core.js';
import {TUNE_NAMES, tunePlan, ABC_NOTES} from '../js/v36-audio.js';

const data = JSON.parse(readFileSync(new URL('../data/v36.json', import.meta.url)));
const pics = JSON.parse(readFileSync(new URL('../data/pics.json', import.meta.url)));
const tracing = JSON.parse(readFileSync(new URL('../data/tracing.json', import.meta.url)));
const memory = () => { const m = new Map(); return {getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), m}; };

test('36 weeks of 5 days, each with 3 or 4 unique stations', () => {
  assert.equal(data.weeks.length, WEEKS);
  for (let w = 1; w <= WEEKS; w++) for (let d = 1; d <= DAYS; d++) {
    const p = planDay(data, w, d);
    assert.ok(p.stations.length >= 3 && p.stations.length <= 4, `week ${w} day ${d}`);
    assert.equal(new Set(p.stations.map(s => s.id)).size, p.stations.length, `unique stations ${w}-${d}`);
    for (const s of p.stations) {
      assert.ok(s.title && s.title.length <= 32, `title ${s.title}`);
      assert.ok(pics[s.icon], `station icon ${s.icon} (${w}-${d})`);
    }
    assert.ok(p.paper.every(code => data.paperTitles[code]), `paper codes ${w}-${d}`);
  }
});

test('every station makes playable, well-formed games for all 180 days', () => {
  const types = new Set();
  for (let w = 1; w <= WEEKS; w++) for (let d = 1; d <= DAYS; d++) {
    for (const s of planDay(data, w, d).stations) {
      for (const seed of [0, 1, 2]) {
        const items = stationItems(data, w, d, s.kind, s.mode, {seed});
        assert.ok(items.length >= 1 && items.length <= 6, `${s.id} ${w}-${d} has ${items.length} items`);
        for (const it of items) {
          types.add(it.type);
          const where = `${it.type} in ${s.id} week ${w} day ${d}`;
          for (const ic of itemIcons(it)) assert.ok(pics[ic], `missing picture ${ic} for ${where}`);
          switch (it.type) {
            case 'letterFind':
              assert.ok(it.choices.includes(it.target), where); assert.equal(new Set(it.choices).size, it.choices.length, where);
              assert.ok(it.choices.length >= 3 && it.choices.length <= 4, where); break;
            case 'letterPop': assert.equal(it.bubbles.filter(b => b === it.target).length, 3, where); assert.equal(it.bubbles.length, 9, where); break;
            case 'count': assert.ok(it.n >= 1 && it.n <= 10 && it.choices.includes(it.n) && it.choices.length === 3, where); break;
            case 'quick': assert.ok(it.n >= 1 && it.n <= 4 && it.choices.includes(it.n), where); break;
            case 'give': assert.ok(it.n >= 1 && it.n <= 10 && it.max > it.n && it.max <= 10, where); break;
            case 'zero': assert.ok(it.groups.includes(0) && new Set(it.groups).size === 3, where); break;
            case 'combine': assert.ok(it.choices.includes(it.a + it.b), where); break;
            case 'colorPick': assert.ok(it.choices.includes(it.answer) && new Set(it.choices).size === 3 && it.choices.every(c => data.colors[c]), where); break;
            case 'colorMix': assert.ok(it.choices.includes(it.answer) && data.colors[it.a] && data.colors[it.b], where); break;
            case 'colorHunt': assert.ok(data.colors[it.color] && it.targets.length === 3 && it.others.length === 3 && it.others.every(o => o[2] !== it.color), where); break;
            case 'shapeFind': assert.ok(it.choices.includes(it.shape) && new Set(it.choices).size === 3, where); break;
            case 'shapeThings': assert.ok(data.shapes[it.shape] && it.things.length === 3, where); break;
            case 'trace':
              if (it.model.kind === 'stroke') assert.ok(STROKE_PATHS[it.model.key] && data.strokes[it.model.key], where);
              else if (it.model.kind === 'number') assert.ok(tracing.numbers[it.model.key], where);
              else assert.ok(tracing.letters[it.model.key], where);
              break;
            case 'song': assert.ok(TUNE_NAMES.includes(it.tune) && it.lines.length >= 4, where); break;
            case 'story': assert.equal(it.pages.length, 8, where); assert.ok(it.qs.length >= 2, where); break;
            case 'sequence': assert.equal(it.cards.length, 3, where); break;
            case 'soundPlay': assert.ok(it.words.length >= 4 && data.mouthSvg[it.mouth], where); break;
            case 'talkWords': assert.ok(it.words.length >= 4, where); break;
            case 'talkAsk': assert.ok(it.qs.length >= 2, where); break;
            case 'sortPick': assert.ok(it.bins.some(b => b[0] === it.answer), where); break;
            case 'pattern': assert.ok(it.choices.includes(it.answer) && it.seq.length === 5, where); break;
            case 'nameBuild': assert.equal(it.name, NAME); break;
            case 'nameFind': assert.ok(it.choices.includes(NAME) && new Set(it.choices).size === it.choices.length && it.choices.length === 3, where); break;
            case 'letterPic': assert.ok(it.choices.some(c => c[0] === it.answer[0]) && it.choices.length === 3, where);
              assert.equal(it.choices.filter(c => c[0].toUpperCase().startsWith(it.letter)).length, it.answer[0].toUpperCase().startsWith(it.letter) ? 1 : 0, `${where}: only one picture goes with ${it.letter}`); break;
            case 'beat': assert.ok(TUNE_NAMES.includes(it.tune) && it.goal >= 4, where); break;
          }
        }
      }
    }
  }
  for (const t of ['song', 'beat', 'letterPic', 'nameFind', 'letterMeet', 'letterFind', 'letterPop', 'abcSong', 'nameBuild', 'count', 'quick', 'give', 'zero', 'more', 'size', 'pattern', 'order', 'sortPick', 'measure',
    'combine', 'colorHunt', 'colorPick', 'colorMix', 'shapeThings', 'shapeFind', 'trace', 'story', 'sequence', 'talkWords', 'talkAsk', 'soundPlay', 'moveCard', 'freeze'])
    assert.ok(types.has(t), `game type ${t} is used somewhere in the year`);
});

test('letter games stay fair for a 3-year-old', () => {
  const r = rng(5);
  for (const t of 'VIANDRETSMBH') {
    const early = distractors(t, 3, r, 2);
    assert.ok(!early.includes(t) && early.length === 3);
    assert.ok(early.every(c => !('WYAU'.includes(c) && t === 'V')), 'no look-alikes in the first weeks');
  }
  const late = distractors('V', 3, rng(9), 20);
  assert.ok('WYAU'.includes(late[0]), 'later weeks add one look-alike');
});

test('tracing paths are valid path commands inside the box', () => {
  for (const [key, strokes] of Object.entries(STROKE_PATHS)) {
    assert.ok(strokes.length >= 1, key);
    for (const s of strokes) {
      assert.equal(s[0][0], 'M', key);
      for (const c of s) {
        assert.ok(['M', 'L', 'C', 'Q'].includes(c[0]), `${key} command ${c[0]}`);
        for (const v of c.slice(1)) assert.ok(Number.isFinite(v) && v >= 0 && v <= 100, `${key} value ${v}`);
      }
    }
  }
  for (const k of Object.keys(data.strokes)) if (!['name', 'letters'].includes(k)) assert.ok(STROKE_PATHS[k], `stroke ${k} has a path`);
});

test('progress: stations, stickers, egg stages, friends and next day', () => {
  let st = defaultV36();
  const p = planDay(data, 1, 1);
  for (const s of p.stations) { assert.ok(!isDayDone(st, p)); st = completeStation(st, 1, 1, s.id); }
  assert.ok(isDayDone(st, p));
  assert.equal(completeStation(st, 1, 1, p.stations[0].id), st, 'repeat does not double count');
  st = awardSticker(st, 1, 1);
  assert.equal(st.stickers['1-1'], stickerFor(1, 1));
  assert.equal(eggStage(st, 1), 1);
  for (let d = 2; d <= 5; d++) st = awardSticker(st, 1, d);
  assert.equal(eggStage(st, 1), 5);
  st = hatchFriend(st, 1); assert.ok(st.friends[1]);
  assert.deepEqual(nextDay(1, 5), {week: 2, day: 1});
  assert.deepEqual(nextDay(36, 5), {week: 36, day: 5});
  assert.deepEqual(goToDay(st, 99, 0).week, 36);
  const all = new Set(); for (let w = 1; w <= WEEKS; w++) for (let d = 1; d <= DAYS; d++) all.add(stickerFor(w, d));
  assert.equal(all.size, STICKERS.length, 'every sticker shows up during the year');
  for (const s of STICKERS) assert.ok(pics[s], `sticker picture ${s}`);
  for (const f of data.friends) assert.ok(pics[f.icon], `friend picture ${f.icon}`);
});

test('state survives save, load and junk', () => {
  const m = memory();
  let st = defaultV36();
  st = goToDay(st, 7, 3); st = completeStation(st, 7, 3, 'trace-stroke'); st = awardSticker(st, 7, 3); st = hatchFriend(st, 6);
  st = logTalk(st, 'Dinosaur'); st = logSound(st, 'm', true); st = logSound(st, 'm', false);
  assert.ok(saveV36(m, st));
  const back = loadV36(m);
  assert.equal(back.week, 7); assert.equal(back.day, 3);
  assert.deepEqual(back.days['7-3'].done, ['trace-stroke']);
  assert.ok(back.friends[6]); assert.equal(back.talk.dinosaur, 1); assert.deepEqual(back.sounds.m, {clear: 1, notyet: 1});
  const junk = normalizeV36({version: 1, week: 'x', day: 99, days: {'99-9': {done: ['a']}, '3-2': {done: ['<script>', 'song-sing']}}, stickers: {'1-1': 'bomb'}, friends: {40: true}, sounds: {'<b>': {}}});
  assert.equal(junk.week, 1); assert.equal(junk.day, 5);
  assert.deepEqual(Object.keys(junk.days), ['3-2']); assert.deepEqual(junk.days['3-2'].done, ['song-sing']);
  assert.deepEqual(junk.stickers, {}); assert.deepEqual(junk.friends, {}); assert.deepEqual(junk.sounds, {});
  assert.deepEqual(normalizeV36(null), defaultV36());
  m.setItem(V36_KEY, '{broken'); assert.deepEqual(loadV36(m), defaultV36());
});

test('songs: every tune has a plan that lights every lyric line in order', () => {
  for (const w of data.weeks) {
    const plan = tunePlan(w.song.tune, w.song.lines.length);
    assert.ok(plan.notes.length > 4, `week ${w.n} tune ${w.song.tune}`);
    const lines = plan.lineStarts;
    assert.equal(lines.length, w.song.lines.length, `week ${w.n} line count`);
    for (let i = 1; i < lines.length; i++) assert.ok(lines[i] > lines[i - 1], `week ${w.n} lines in order`);
    assert.ok(plan.beats >= lines.at(-1) + 1);
  }
  assert.equal(ABC_NOTES.filter(n => n[2]).length, 26, 'the ABC song lights all 26 letters');
  assert.equal(ABC_NOTES.filter(n => n[2]).map(n => n[2]).join(''), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ');
});

test('every picture the screens and games name directly exists', async () => {
  const {V36_UI_ICONS} = await import('../js/v36-ui.js');
  const {FREEZE_MOVES} = await import('../js/v36-games.js');
  const names = new Set([...V36_UI_ICONS, ...FREEZE_MOVES.map(m => m[0]), 'anchor', 'sailboat', 'person-swimming', 'rabbit', 'bird', 'drum', 'seedling', 'snail', 'frog', 'woman-dancing']);
  for (const f of ['../js/v36-ui.js', '../js/v36-games.js']) {
    const src = readFileSync(new URL(f, import.meta.url), 'utf8');
    for (const m of src.matchAll(/pic\('([a-z0-9-]+)'/g)) names.add(m[1]);
    for (const m of src.matchAll(/\? '([a-z0-9-]+)' :/g)) if (m[1].includes('-') || pics[m[1]]) names.add(m[1]);
  }
  for (const n of names) assert.ok(pics[n], `missing picture ${n}`);
  for (const u of Object.values(data.units)) assert.ok(pics[u.icon], `unit icon ${u.icon}`);
});

test('spaced review: every number idea keeps coming back after its first week', () => {
  const seen = {};
  for (let w = 1; w <= WEEKS; w++) for (let d = 1; d <= DAYS; d++) for (const s of planDay(data, w, d).stations)
    for (const it of stationItems(data, w, d, s.kind, s.mode)) (seen[it.type] ||= new Set()).add(w);
  for (const t of ['quick', 'give', 'zero', 'more', 'size', 'pattern', 'order', 'sortPick']) {
    const weeks = [...(seen[t] || [])];
    assert.ok(weeks.length >= 6, `${t} shows up in ${weeks.length} weeks`);
  }
  let perDay = 0; for (let w = 1; w <= WEEKS; w++) for (let d = 1; d <= DAYS; d++) for (const s of planDay(data, w, d).stations) perDay += stationItems(data, w, d, s.kind, s.mode).length;
  assert.ok(perDay / 180 >= 8, `about ${(perDay / 180).toFixed(1)} games a day`);
});

test("Didi's Island: 5 answerable quests every day, with pictures that exist", async () => {
  const {islandPlan, islandIcons, QUESTS_PER_DAY} = await import('../js/v36-island.js');
  for (let w = 1; w <= WEEKS; w++) for (let d = 1; d <= DAYS; d++) {
    const friends = {}; for (let k = 1; k < w; k++) friends[k] = true;
    for (const f of [{}, friends]) {
      const p = islandPlan(data, w, d, f);
      assert.equal(p.quests.length, QUESTS_PER_DAY, `${w}-${d}`);
      assert.equal(new Set(p.quests.map(q => q.kind)).size, QUESTS_PER_DAY, `${w}-${d} quest kinds differ`);
      for (const ic of islandIcons(p)) assert.ok(pics[ic], `island picture ${ic}`);
      for (const q of p.quests) {
        const where = `${q.kind} ${w}-${d}`;
        const targets = q.objects.filter(o => o.target).length;
        assert.ok(q.objects.length >= 1 && q.objects.length <= 7, where);
        if (q.kind === 'count') { assert.equal(targets, q.n); assert.ok(q.choices.includes(q.n) && q.n >= 1 && q.n <= 6, where); }
        else assert.ok(targets >= q.need && q.need >= 1, `${where}: ${targets} targets for ${q.need}`);
        if (q.kind === 'color') assert.ok(q.objects.every(o => o.target === (o.color === q.color)), where);
        if (q.kind === 'letters') assert.ok(q.objects.every(o => o.target === (o.ch === q.letter)), where);
        const spots = new Set(q.objects.map(o => `${Math.round(o.x / 6)}-${Math.round(o.y / 6)}`));
        assert.equal(spots.size, q.objects.length, `${where}: objects do not overlap`);
      }
    }
  }
});
