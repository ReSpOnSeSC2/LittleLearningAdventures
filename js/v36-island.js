/**
 * Didi's Island: Vivian's little play world (her version of Ana's Meteor Falls town).
 * Each day the island hides 5 "I spy" quests built from that week's letter, number, color, shape and words,
 * and the friends she has hatched live there. islandPlan() is pure (tested); mountIsland() draws it.
 */
import {rng, shuffle, distractors, weekData, NUM_WORDS} from './v36-core.js';
import {shapeSvg} from './v36-art.js';
import {plural} from './v36-games.js';

export const QUESTS_PER_DAY = 5;
/* Things to tap and name on each unit's island (vocabulary), never used as quest answers. */
export const ISLAND_DECOR = {
  1: [['house', 'house-with-garden'], ['teddy bear', 'teddy-bear'], ['sunflower', 'sunflower'], ['kite', 'kite']],
  2: [['volcano', 'volcano'], ['bone', 'bone'], ['tree', 'evergreen-tree'], ['rock', 'rock']],
  3: [['drum', 'drum'], ['guitar', 'guitar'], ['trumpet', 'trumpet'], ['piano', 'musical-keyboard']],
  4: [['tractor', 'tractor'], ['puppy', 'dog-face'], ['kitty', 'cat-face'], ['hut', 'hut']],
  5: [['sunflower', 'sunflower'], ['tulip', 'tulip'], ['mushroom', 'mushroom'], ['butterfly', 'butterfly']],
  6: [['boat', 'sailboat'], ['shell', 'spiral-shell'], ['crab', 'crab'], ['beach umbrella', 'beach-with-umbrella']]
};
/* Places on the island (percent of width, island units of height 0-130). Two corners hold the palm tree and hut. */
const SPOTS = [[36, 58], [60, 57], [16, 73], [38, 74], [61, 73], [84, 74], [14, 90], [37, 91], [60, 90], [84, 91], [26, 106], [50, 107], [73, 106]];
const COUNTABLE = w => (['clap', 'paw prints', 'bubbles'].includes(w.mobj[0]) ? ['star', 'star'] : w.mobj);

function place(objs, r) {
  const spots = shuffle(SPOTS, r);
  return objs.slice(0, spots.length).map((o, i) => ({...o, x: spots[i][0] + (r() * 4 - 2), y: spots[i][1] + (r() * 3 - 1.5)}));
}

/** The day's island: decorations, friends living there, and 5 quests, each with its own objects. */
export function islandPlan(data, week, day, friends = {}) {
  const w = weekData(data, week); const r = rng(week * 733 + day * 37 + 11);
  const unit = Number(w.u) || 1;
  const hatched = data.friends.map((f, i) => ({...f, week: i + 1})).filter(f => friends[f.week]).slice(-4);
  const decor = (ISLAND_DECOR[unit] || ISLAND_DECOR[1]).map(([word, icon]) => ({kind: 'decor', icon, word}));
  const known = w.known.length ? w.known : ['V'];
  const letter = w.letter.length === 1 ? w.letter : shuffle(w.review?.letters?.length ? w.review.letters : known, r)[0];
  const colorsKnown = w.colorsKnown.length ? w.colorsKnown : ['red', 'blue', 'yellow'];
  const color = data.colors[w.color] ? w.color : shuffle(colorsKnown, r)[0];
  const shapesKnown = w.shapesKnown.length ? w.shapesKnown : ['circle', 'square', 'triangle'];
  const shape = data.shapes[w.shape] ? w.shape : shuffle(shapesKnown, r)[0];
  const [cword, cicon] = COUNTABLE(w);
  const n = day <= 2 && w.number >= 1 ? Math.min(6, w.number) : 2 + Math.floor(r() * (Math.min(6, Math.max(3, w.nmax)) - 1));
  const q = [];
  q.push({kind: 'letters', need: 3, prompt: `Find 3 ${letter}’s!`, say: `Find the ${letter === 'A' ? 'ay' : letter} signs hiding on the island! There are three.`, letter,
    objects: shuffle([...Array.from({length: 3}, () => ({kind: 'letter', ch: letter, target: true})), ...distractors(letter, 3, r, week).map(ch => ({kind: 'letter', ch, target: false}))], r)});
  q.push({kind: 'count', need: n, n, prompt: `How many ${plural(cword)}?`, say: `How many ${plural(cword)} are on the island? Touch each one to count!`,
    choices: [...new Set([n, n + 1, Math.max(1, n - 1), n + 2])].slice(0, 3).sort((a, b) => a - b), objects: Array.from({length: n}, () => ({kind: 'pic', icon: cicon, word: cword, target: true}))});
  const cThings = shuffle(data.colors[color].things.filter(t => !/heart|square|circle/.test(t[1])), r).slice(0, 2);
  const others = shuffle(colorsKnown.filter(c => c !== color && !(['white', 'gray'].includes(c) && ['white', 'gray'].includes(color))).concat(['blue', 'yellow', 'green', 'red'].filter(c => c !== color)), r);
  const oThings = [...new Set(others)].slice(0, 3).map(c => [...shuffle(data.colors[c].things.filter(t => !/heart|square|circle/.test(t[1])), r)[0], c]);
  q.push({kind: 'color', need: cThings.length, color, prompt: `Find ${cThings.length} ${color} things!`, say: `Find the ${cThings.length === 2 ? 'two' : ''} ${color} things on the island!`,
    objects: shuffle([...cThings.map(([word, icon]) => ({kind: 'pic', icon, word, color, target: true})), ...oThings.map(([word, icon, c]) => ({kind: 'pic', icon, word, color: c, target: false}))], r)});
  const sThing = shuffle(data.shapes[shape].filter(t => !/heart$/.test(t[1]) || shape === 'heart'), r)[0];
  const oShapes = shuffle(['circle', 'square', 'triangle', 'star', 'heart', 'rectangle', 'oval', 'diamond'].filter(s => s !== shape), r).slice(0, 3);
  q.push({kind: 'shape', need: 2, shape, prompt: `Find 2 ${shape}s!`, say: `Find two ${shape}s on the island!`,
    objects: shuffle([{kind: 'shape', shape, target: true}, {kind: 'pic', icon: sThing[1], word: sThing[0], shape, target: true}, ...oShapes.map(s => ({kind: 'shape', shape: s, target: false}))], r)});
  if (hatched.length && day % 2 === 0) {
    const f = hatched[Math.floor(r() * hatched.length)];
    const mine = new Set(hatched.map(x => x.icon));
    const extra = shuffle([...hatched.filter(x => x.week !== f.week).map(x => ({icon: x.icon, name: x.name})), ...[['duck', 'Duck'], ['frog', 'Frog'], ['snail', 'Snail'], ['bird', 'Bird']].filter(([ic]) => !mine.has(ic)).map(([icon, name]) => ({icon, name}))], r).slice(0, 2);
    q.push({kind: 'friend', need: 1, prompt: `Find ${f.name}!`, say: `Can you find your friend ${f.name}?`, friend: f.name,
      objects: shuffle([{kind: 'friend', icon: f.icon, word: f.name, target: true}, ...extra.map(x => ({kind: 'friend', icon: x.icon, word: x.name, target: false}))], r)});
  } else {
    const words = shuffle(w.talk.words, r); const [tw, ti] = words[0];
    q.push({kind: 'word', need: 1, prompt: `Where is the ${tw}?`, say: `Where is the ${tw}? Find the ${tw}!`, word: tw,
      objects: shuffle([{kind: 'pic', icon: ti, word: tw, target: true}, ...words.slice(1, 4).map(([word, icon]) => ({kind: 'pic', icon, word, target: false}))], r)});
  }
  const order = shuffle(q.slice(0, QUESTS_PER_DAY), rng(week * 17 + day));
  return {week: w.n, day, unit, decor, friends: hatched, quests: order.map((x, i) => ({...x, id: i, objects: place(x.objects, rng(week * 97 + day * 13 + i))}))};
}

/** Every picture the island may draw, for checks. */
export function islandIcons(plan) {
  const out = new Set(['palm-tree', 'hut', 'gem-stone', ...plan.decor.map(d => d.icon), ...plan.friends.map(f => f.icon)]);
  for (const qq of plan.quests) for (const o of qq.objects) if (o.icon) out.add(o.icon);
  return [...out];
}

/* ---------------------------------------------------------------- drawing (browser only) */
const ISLAND_BG = `<svg class="v-isle-bg" viewBox="0 0 100 130" preserveAspectRatio="none" aria-hidden="true">
  <defs><linearGradient id="isky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a5d8ff"/><stop offset="1" stop-color="#e7f5ff"/></linearGradient>
  <linearGradient id="isea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#74c0fc"/><stop offset="1" stop-color="#4dabf7"/></linearGradient></defs>
  <rect width="100" height="130" fill="url(#isky)"/><circle cx="84" cy="14" r="8" fill="#ffe066"/><circle cx="84" cy="14" r="11" fill="#ffe066" opacity=".3"/>
  <g fill="#fff" opacity=".9"><ellipse cx="22" cy="16" rx="11" ry="4.5"/><ellipse cx="29" cy="13" rx="7" ry="4.5"/><ellipse cx="56" cy="26" rx="9" ry="3.5"/></g>
  <rect y="36" width="100" height="94" fill="url(#isea)"/>
  <g fill="none" stroke="#fff" stroke-width=".8" opacity=".6"><path d="M4 42 q4 -2 8 0 t8 0"/><path d="M70 40 q4 -2 8 0 t8 0"/><path d="M8 124 q4 -2 8 0 t8 0"/><path d="M76 126 q4 -2 8 0 t8 0"/></g>
  <path d="M6 70 C4 52 22 44 50 44 C78 44 97 50 95 70 C98 96 90 120 50 121 C12 122 2 98 6 70 Z" fill="#ffe8a3"/>
  <path d="M10 66 C9 53 25 47 50 47 C75 47 91 53 90 66 C92 90 84 112 50 113 C16 114 8 92 10 66 Z" fill="#b2f2bb"/>
  <path d="M10 66 C9 53 25 47 50 47 C75 47 91 53 90 66" fill="none" stroke="#8ce99a" stroke-width="1.2"/>
  <g fill="#8ce99a" opacity=".7"><circle cx="30" cy="80" r="1.2"/><circle cx="70" cy="96" r="1.2"/><circle cx="50" cy="66" r="1"/><circle cx="24" cy="100" r="1"/><circle cx="76" cy="80" r="1"/></g></svg>`;

export function mountIsland(env, plan, {done = 0, onQuest = () => {}, onFinish = () => {}} = {}) {
  const {esc, pic} = env;
  let qi = Math.min(done, plan.quests.length), counted = 0, found = 0, tries = 0, busy = false;
  const root = env.frame(`<div class="v-island" style="--uc:${env.unitColor}">
      <div class="v-questbar"><button class="v-qhear" id="v-qhear" aria-label="Hear the quest"><img src="${env.mascot}" alt=""></button>
        <div class="v-qtext"><b id="v-qprompt"></b><span class="v-qstars" id="v-qstars">${plan.quests.map((_, i) => `<i class="${i < qi ? 'on' : ''}">★</i>`).join('')}</span></div></div>
      <div class="v-qchoices" id="v-qchoices" hidden></div>
      <div class="v-isle" id="v-isle">${ISLAND_BG}<span class="v-ibg palm">${pic('palm-tree')}</span><span class="v-ibg hut">${pic('hut')}</span><div id="v-iobjs"></div></div>
      <p class="v-tip" id="v-itip">Tap things on the island to hear their names.</p></div>`);
  const isle = root.querySelector('#v-iobjs'), prompt = root.querySelector('#v-qprompt'), stars = [...root.querySelectorAll('#v-qstars i')], choicesEl = root.querySelector('#v-qchoices');
  const objHtml = (o, i, cls = '') => {
    const inner = o.kind === 'letter' ? `<span class="v-isign">${esc(o.ch)}</span>` : o.kind === 'shape' ? shapeSvg(o.shape, 60) : pic(o.icon, 'v-ipic', o.word);
    return `<button class="v-iobj ${o.kind} ${cls}" data-i="${i}" style="left:${o.x.toFixed(1)}%;top:${(o.y / 130 * 100).toFixed(1)}%" aria-label="${esc(o.kind === 'letter' ? o.ch : o.word || o.shape)}">${inner}<span class="v-inum"></span></button>`;
  };
  function extras(q) {
    // decorations and friends fill the empty spots, except in color and shape quests (they would confuse the answer)
    if (q && ['color', 'shape'].includes(q.kind)) return [];
    const used = new Set(q ? q.objects.map(o => `${Math.round(o.x)}-${Math.round(o.y)}`) : []);
    const free = SPOTS.filter(([x, y]) => ![...used].some(u => { const [ux, uy] = u.split('-').map(Number); return Math.abs(ux - x) < 8 && Math.abs(uy - y) < 8; }));
    const avoid = new Set(q ? q.objects.map(o => o.icon).filter(Boolean) : []);
    const list = [...plan.decor.filter(d => !avoid.has(d.icon)), ...(q && q.kind === 'friend' ? [] : plan.friends.map(f => ({kind: 'friendfree', icon: f.icon, word: f.name})))];
    return list.slice(0, free.length).map((o, i) => ({...o, x: free[i][0], y: free[i][1]}));
  }
  function draw() {
    const q = plan.quests[qi];
    const ex = extras(q);
    isle.innerHTML = (q ? q.objects.map((o, i) => objHtml(o, i, 'q')) : []).join('') + ex.map((o, i) => objHtml(o, 100 + i, 'x')).join('');
    choicesEl.hidden = true; choicesEl.innerHTML = ''; counted = 0; found = 0; tries = 0;
    if (!q) { prompt.textContent = 'You found all the treasure today!'; return; }
    prompt.textContent = q.prompt;
    isle.querySelectorAll('.v-iobj.q').forEach(b => b.addEventListener('click', () => tapQuest(q, b)));
    isle.querySelectorAll('.v-iobj.x').forEach(b => b.addEventListener('click', () => {
      const o = ex[Number(b.dataset.i) - 100]; bounce(b); env.sfx('pop');
      env.hear(o.kind === 'friendfree' ? `${o.word} says hi, Vivi!` : o.word);
    }));
  }
  const bounce = b => { b.classList.remove('boing'); void b.offsetWidth; b.classList.add('boing'); };
  function tapQuest(q, b) {
    if (busy || b.classList.contains('got')) return;
    const o = q.objects[Number(b.dataset.i)];
    if (q.kind === 'count') {
      counted++; b.classList.add('got'); b.querySelector('.v-inum').textContent = counted; env.sfx('count', counted); env.hear(NUM_WORDS[counted] || String(counted));
      if (counted === q.n) setTimeout(() => askCount(q), 700);
      return;
    }
    if (o.target) {
      found++; b.classList.add('got'); env.sfx('good'); bounce(b);
      env.hear(o.kind === 'letter' ? (o.ch === 'A' ? 'ay!' : `${o.ch}!`) : o.kind === 'shape' ? `A ${o.shape}!` : o.kind === 'friend' ? `${o.word}!` : `${o.word}!`);
      if (found >= q.need) complete(q, tries === 0);
    } else {
      tries++; env.sfx('oops'); b.classList.remove('wobble'); void b.offsetWidth; b.classList.add('wobble');
      const name = o.kind === 'letter' ? (o.ch === 'A' ? 'ay' : o.ch) : o.kind === 'shape' ? `a ${o.shape}` : o.word;
      env.talk(q.kind === 'color' ? `The ${o.word} is ${o.color}. ${q.prompt}` : `That's ${name}. ${q.prompt}`);
    }
  }
  function askCount(q) {
    choicesEl.hidden = false;
    choicesEl.innerHTML = q.choices.map(c => `<button class="v-num" data-v="${c}" aria-label="${c}"><b>${c}</b></button>`).join('');
    env.talk(`${NUM_WORDS[q.n]}! How many? Tap the number.`);
    choicesEl.querySelectorAll('.v-num').forEach(b => b.addEventListener('click', () => {
      const v = Number(b.dataset.v);
      if (v === q.n) { b.classList.add('correct'); complete(q, tries === 0); }
      else { tries++; b.classList.add('retry'); env.sfx('oops'); env.talk(`That's ${NUM_WORDS[v]}. We counted ${NUM_WORDS[q.n]}!`); setTimeout(() => b.classList.remove('retry'), 500); }
    }));
  }
  function complete(q, first) {
    busy = true; stars[qi]?.classList.add('on'); env.sfx('sparkle'); env.firstTry(first);
    const last = qi + 1 >= plan.quests.length;
    env.talk(last ? 'You found the island treasure!' : `${env.praise()} You found it!`);
    qi++; onQuest(qi);
    setTimeout(() => {
      busy = false;
      if (last) { treasure(); onFinish(); return; }
      draw(); env.talk(plan.quests[qi].say);
    }, 1400);
  }
  function treasure() {
    draw();
    const t = document.createElement('div'); t.className = 'v-treasure';
    t.innerHTML = `<div class="v-confetti" aria-hidden="true">${Array.from({length: 18}, (_, i) => `<i style="--i:${i}"></i>`).join('')}</div>${pic('gem-stone', 'v-gem')}<p>Island treasure!</p>`;
    root.querySelector('#v-isle').append(t); env.sfx('hatch');
    root.querySelector('#v-itip').textContent = 'All 5 quests done today. Tap your friends and things on the island!';
  }
  root.querySelector('#v-qhear').addEventListener('click', () => { const q = plan.quests[qi]; env.hear(q ? q.say : 'You found all the treasure today! Tap your friends to say hi.'); });
  draw();
  if (qi >= plan.quests.length) { root.querySelector('#v-itip').textContent = 'All 5 quests done today. Tap your friends and things on the island!'; env.talk('Welcome back to Didi’s Island! You found all the treasure today.'); }
  else env.talk(`Didi's Island! ${plan.quests[qi].say}`);
  return {state: () => ({qi, counted, found})};
}
