/**
 * The little games inside Vivian's stations. Each game draws one screen with env.frame()
 * and calls env.next() when it is finished. Built for a 3-year-old: big pictures, few choices,
 * every picture talks when tapped, gentle retries, and a hint after two tries.
 */
import {shapeSvg, splatSvg, paintPotSvg, cupSvg, nestSvg, plateSvg, dotsSvg, tankSvg, letterTileSvg} from './v36-art.js';
import {createGuidedTracer} from './tracing-engine.js';
import {STROKE_PATHS, NUM_WORDS, NAME} from './v36-core.js';

const SAY_LETTER = {A: 'ay'};          // some phone voices read a lone "A" as "uh"
export const sayLetter = L => SAY_LETTER[L] || L;
export const FREEZE_MOVES = [['sauropod', 'Stomp like Didi!'], ['bird', 'Flap like a bird!'], ['tropical-fish', 'Swim like a fish!'], ['rabbit', 'Hop like a bunny!'],
  ['dizzy', 'Spin around slowly!'], ['raised-hand', 'Wave your hands up high!'], ['snail', 'Wiggle like a snail!'], ['drum', 'March like a drummer!'],
  ['butterfly', 'Flutter like a butterfly!'], ['frog', 'Jump like a frog!']];
const SKY = new Set(['sun', 'crescent-moon', 'cloud', 'cloud-with-rain', 'rainbow', 'star', 'glowing-star', 'shooting-star', 'bird', 'butterfly', 'kite', 'balloon', 'honeybee', 'sparkles',
  'dizzy', 'high-voltage', 'cloud-with-lightning', 'snowflake', 'rocket', 'musical-notes', 'musical-note', 'party-popper', 'owl', 'parrot', 'dove', 'eagle', 'bat', 'fireworks', 'bubbles']);
const COLOR_NAMES = {red: 'Red', blue: 'Blue', yellow: 'Yellow', green: 'Green', pink: 'Pink', orange: 'Orange', brown: 'Brown', white: 'White', gray: 'Gray', purple: 'Purple', black: 'Black'};
export const an = w => (/^[aeiou]/i.test(w) ? 'an ' : 'a ') + w;
export function plural(word, n = 2) {
  if (n === 1) return word;
  if (/(fish|sheep|maracas|bubbles|prints|socks)$/.test(word)) return word;
  if (word === 'leaf') return 'leaves';
  if (/[^aeiou]y$/.test(word)) return word.slice(0, -1) + 'ies';
  if (/(s|x|sh|ch)$/.test(word)) return word + 'es';
  return word + 's';
}
const moveIcon = (name, how) => { const t = `${name} ${how}`.toLowerCase();
  return /swim|splash|kick/.test(t) ? 'person-swimming' : /hop|bunny|jump/.test(t) ? 'rabbit' : /stomp|dino|roar/.test(t) ? 'sauropod' : /fly|flap|bird|wing/.test(t) ? 'bird'
    : /shake|drum|march/.test(t) ? 'drum' : /stretch|tall|grow|seed/.test(t) ? 'seedling' : /wiggle|worm|snail/.test(t) ? 'snail' : /frog/.test(t) ? 'frog' : 'woman-dancing'; };

export function createGames(env) {
  const {data, esc, icon, pic} = env;
  const E = env;

  /* ---------------------------------------------------------------- shared bits */
  function choose(buttons, {isRight, onRight, onWrong, hintAfter = 2}) {
    let solved = false, tries = 0;
    buttons.forEach((b, i) => b.addEventListener('click', () => {
      if (solved || b.disabled) return;
      if (isRight(i, b)) {
        solved = true; b.classList.add('correct'); b.closest('.v-choices')?.classList.add('solved');
        E.sfx('good'); E.sparkle(b); E.firstTry(tries === 0); onRight(b, i);
      } else {
        tries++; E.miss(); b.classList.add('retry'); E.sfx('oops');
        setTimeout(() => b.classList.remove('retry'), 500);
        if (b.dataset.keep !== '1') b.disabled = true;
        onWrong(b, i, tries);
        if (tries >= hintAfter) buttons.find((x, j) => isRight(j, x))?.classList.add('hint');
      }
    }));
  }
  const numChoice = c => `<button class="v-num" data-v="${c}" aria-label="${c}"><b>${c}</b>${dotsSvg(c, 44)}</button>`;
  const praiseSay = extra => { const p = E.praise(); E.talk(extra ? `${p} ${extra}` : p); return p; };

  /* scene for a story page: pictures stand on the ground; sky things float */
  const SLOTS = {1: [50], 2: [32, 68], 3: [20, 50, 80], 4: [14, 38, 62, 86]};
  function pageScene(bg, pics, cls = '', viewBox = null) {
    const ground = pics.filter(p => !SKY.has(p)), sky = pics.filter(p => SKY.has(p));
    const place = (list, y) => {
      const n = Math.min(4, list.length); if (!n) return [];
      const h = n === 1 ? 34 : n === 2 ? 30 : n === 3 ? 25 : 21;
      return list.slice(0, 4).map((p, i) => [p, SLOTS[n][i], y, y < 40 ? h * 0.8 : h]);
    };
    const props = [...place(ground, 61), ...place(sky, 30)];
    const parts = props.map(([name, x, y, h]) => {
      if (name.startsWith('letter:')) return letterTileSvg(esc(name.slice(7)), x, y, h * 0.8);
      const p = E.pics[name]; if (!p) return '';
      return `<svg x="${(x - h / 2).toFixed(1)}" y="${(y - h).toFixed(1)}" width="${h}" height="${h}" viewBox="${p[0]}">${p[1]}</svg>`;
    }).join('');
    return E.sceneSvg(bg, parts, cls, viewBox);
  }

  /* ---------------------------------------------------------------- songs & moving */
  function song(it) {
    const tuneName = data.tunes[it.tune] || '';
    E.frame(`<div class="v-song">
        <div class="v-song-top">${pic('musical-notes', 'v-song-pic')}<div><h2>${esc(it.title)}</h2><p class="v-tune">${it.tune === 'chant' ? 'A clapping chant' : `Tune: ${esc(tuneName)}`}</p></div></div>
        <ol class="v-lyrics">${it.lines.map((l, i) => `<li><button class="v-line" data-l="${i}">${esc(l)}</button></li>`).join('')}</ol>
        <div class="v-two stack"><button class="button" id="v-play">${icon('sound')} Play the song</button><button class="button secondary" id="v-words">Say the words</button></div>
        <p class="v-tip">Sing it together. Clap, stomp and do the actions!</p></div>`, {say: `Let's sing ${it.title}! Tap Play the song and sing with me.`});
    const lines = [...document.querySelectorAll('.v-line')];
    const light = i => lines.forEach((l, j) => { l.classList.toggle('lit', j === i); l.classList.toggle('sung', j < i); });
    let stop = null;
    const play = document.querySelector('#v-play');
    const reset = () => { stop = null; play.innerHTML = `${icon('sound')} Play it again`; };
    play.addEventListener('click', () => {
      E.stopVoice();
      if (stop) { stop(); reset(); light(-1); return; }
      if (!E.musicReady()) { E.toast('Music is off. Turn it on in the Grown-up’s corner, or sing it together!'); return; }
      play.innerHTML = '■ Stop';
      stop = E.music.playTune(it.tune, it.lines.length, {onLine: i => { light(i); lines[i]?.scrollIntoView({block: 'nearest', behavior: 'smooth'}); },
        onEnd: ok => { reset(); if (ok) { lines.forEach(l => { l.classList.remove('lit'); l.classList.add('sung'); }); E.sfx('sparkle'); E.talk('Great singing!'); } }});
      E.onCleanup(() => stop?.());
    });
    document.querySelector('#v-words').addEventListener('click', () => { stop?.(); reset(); E.speakSteps(it.lines.map((t, i) => ({text: t, el: lines[i]})), true); });
    lines.forEach((l, i) => l.addEventListener('click', () => { E.glow(l); E.hear(it.lines[i]); setTimeout(() => E.glow(null), 1600); }));
    E.next('We sang it!');
  }

  function moveCard(it) {
    const ic = moveIcon(it.name, it.how);
    E.frame(`<div class="v-move"><div class="v-move-pic" id="v-mover">${pic(ic, 'v-bigpic')}</div><h2>${esc(it.name)}</h2><p class="v-how">${esc(it.how)}</p>
      <div class="v-timer" id="v-timer"><svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="44" class="v-ring-bg"/><circle cx="50" cy="50" r="44" class="v-ring" id="v-ring"/></svg><span id="v-secs">${it.secs}</span></div>
      <button class="button full" id="v-go">${icon('arrow')} Start the music!</button></div>`, {say: `${it.name}! ${it.how}`});
    let t = null, left = it.secs;
    const ring = document.querySelector('#v-ring'); const C = 2 * Math.PI * 44; ring.style.strokeDasharray = C; ring.style.strokeDashoffset = 0;
    const go = document.querySelector('#v-go');
    const finish = () => { clearInterval(t); t = null; E.music.stopMusic(); document.querySelector('#v-mover')?.classList.remove('dancing'); E.sfx('good'); E.talk('Great moving! You did it!'); go.hidden = true; E.next('All done!'); };
    go.addEventListener('click', () => {
      if (t) { finish(); return; }
      E.stopVoice(); E.music.playDance(); document.querySelector('#v-mover').classList.add('dancing'); go.textContent = 'We’re done!';
      t = setInterval(() => { left--; const s = document.querySelector('#v-secs'); if (!s) { clearInterval(t); return; } s.textContent = Math.max(0, left); ring.style.strokeDashoffset = C * (1 - left / it.secs); if (left <= 0) finish(); }, 1000);
    });
    E.onCleanup(() => { clearInterval(t); E.music.stopMusic(); });
    E.skip('We moved with our grown-up');
  }

  function freeze(it) {
    E.frame(`<div class="v-freeze" id="v-fz"><div class="v-floor"><img class="v-dancer" id="v-dancer" src="${E.mascot}" alt=""><div class="v-ice" aria-hidden="true">${pic('snowflake', 'v-ice-pic')}</div></div>
      <p class="v-fword" id="v-fword">Freeze dance!</p><p class="v-fmove" id="v-fmove">Dance when the music plays. Freeze when it stops!</p>
      <div class="v-rounds">${Array.from({length: it.rounds}, (_, i) => `<span data-r="${i}"></span>`).join('')}</div>
      <button class="button full" id="v-fgo">${icon('arrow')} Let’s dance!</button></div>`, {say: 'Freeze dance! Dance when the music plays. When it stops, freeze like a statue!'});
    const box = document.querySelector('#v-fz'), word = document.querySelector('#v-fword'), move = document.querySelector('#v-fmove'), go = document.querySelector('#v-fgo');
    let round = 0, timers = [], running = false;
    const T = (fn, ms) => timers.push(setTimeout(fn, ms));
    const moves = [...FREEZE_MOVES].sort(() => Math.random() - 0.5);
    function dance() {
      const [ic, text] = moves[round % moves.length];
      box.classList.remove('frozen'); box.classList.add('dancing');
      word.textContent = 'Dance!'; move.innerHTML = `${pic(ic, 'v-fpic')} ${esc(text)}`;
      E.talk(`Dance! ${text}`);
      T(() => { if (E.musicReady()) E.music.playDance(); else move.innerHTML += '<br><small>Grown-up: sing or clap a song!</small>'; }, 900);
      T(freezeNow, 900 + 5500 + Math.random() * 4500);
    }
    function freezeNow() {
      E.music.stopMusic(); E.sfx('freeze'); box.classList.remove('dancing'); box.classList.add('frozen');
      word.textContent = 'FREEZE!'; E.hear('Freeze!');
      T(() => {
        document.querySelector(`[data-r="${round}"]`)?.classList.add('done'); round++;
        if (round >= it.rounds) { box.classList.remove('frozen'); word.textContent = 'Super dancing!'; move.textContent = 'You froze like a statue. Wow!'; E.sfx('sparkle'); E.talk('Super dancing! You froze like a statue!'); running = false; E.next('All done!'); return; }
        word.textContent = 'Great freezing!'; E.talk('Great freezing! Get ready.'); T(dance, 2200);
      }, 3500);
    }
    go.addEventListener('click', () => { if (running) return; running = true; go.hidden = true; E.stopVoice(); dance(); });
    E.onCleanup(() => { timers.forEach(clearTimeout); E.music.stopMusic(); });
    E.skip('We danced without the phone');
  }

  /* ---------------------------------------------------------------- letters */
  function letterMeet(it) {
    const L = it.letter, inName = NAME.includes(L);
    E.frame(`<div class="v-meet"><button class="v-bigletter" id="v-letter" aria-label="${L}"><span>${L}</span></button>
      <div class="v-words">${it.words.map(([w, ic], i) => `<button class="v-wordcard" data-w="${i}">${pic(ic, 'v-wpic', w)}<span>${esc(w)}</span></button>`).join('')}</div>
      ${inName ? `<p class="v-namenote">${L} is in ${[...NAME].map(c => `<b class="${c === L ? 'hl' : ''}">${c}</b>`).join('')}!</p>` : ''}
      <details class="v-grownup"><summary>Grown-up tip</summary><p>${esc(it.note)}</p><p>Say the letter’s name, then trace it in the air together. Point to ${L} on signs, books and cereal boxes this week.</p></details></div>`,
      {say: `This is ${sayLetter(L)}! ${sayLetter(L)} is for ${it.words.map(w => w[0]).join(', ')}.${inName ? ` ${sayLetter(L)} is in your name!` : ''}`});
    const big = document.querySelector('#v-letter');
    big.addEventListener('click', () => { big.classList.remove('wiggle'); void big.offsetWidth; big.classList.add('wiggle'); E.sfx('tap'); E.hear(`${sayLetter(L)}!`); });
    document.querySelectorAll('[data-w]').forEach(b => b.addEventListener('click', () => { const w = it.words[Number(b.dataset.w)][0]; E.glow(b); E.hear(w); setTimeout(() => E.glow(null), 1200); }));
    E.next(`Hi, ${L}!`);
  }
  function letterPic(it) {
    const L = it.letter;
    E.frame(`<div class="v-letterpic"><div class="v-ask"><span class="v-lpbig">${L}</span><span class="v-askbubble">${L} is for…</span></div>
      <div class="v-choices v-lpchoices" style="--cols:3">${it.choices.map(([w, ic], i) => `<button class="v-lpchoice" data-i="${i}" aria-label="${esc(w)}">${pic(ic, 'v-lppic', w)}<span>${esc(w)}</span></button>`).join('')}</div></div>`,
      {say: `${sayLetter(L)} is for... which one? Tap a picture.`});
    choose([...document.querySelectorAll('.v-lpchoice')], {isRight: i => it.choices[i][0] === it.answer[0],
      onRight: () => { E.feedback(`${L} is for ${it.answer[0]}!`, 'good'); praiseSay(`${sayLetter(L)} is for ${it.answer[0]}!`); E.next(); },
      onWrong: (b, i) => { const w = it.choices[i][0]; const first = w[0].toUpperCase(); E.feedback(`${w[0].toUpperCase() + w.slice(1)} is for ${first}.`, 'try'); E.talk(`${w}. ${w} is for ${sayLetter(first)}. Find the one for ${sayLetter(L)}!`); }});
  }
  function nameFind(it) {
    E.frame(`<div class="v-namefind"><div class="v-ask"><img src="${E.mascot}" alt=""><span class="v-askbubble">Find your name!</span></div>
      <div class="v-choices v-namecards" style="--cols:1">${it.choices.map((c, i) => `<button class="v-namecard" data-i="${i}" aria-label="${esc(c)}">${esc(c)}</button>`).join('')}</div></div>`,
      {say: 'Which one says your name? Find your name!'});
    choose([...document.querySelectorAll('.v-namecard')], {isRight: i => it.choices[i] === it.name,
      onRight: () => { E.feedback(`${it.name}! That’s you!`, 'good'); praiseSay('That says Vivian! That is your name!'); E.next(); },
      onWrong: (b, i) => { const c = it.choices[i]; E.feedback(`That says ${c}.`, 'try'); E.talk(`That says ${c.charAt(0) + c.slice(1).toLowerCase()}. Your name starts with ${sayLetter('V')}!`); }});
  }
  function beat(it) {
    const goal = it.goal || 8;
    E.frame(`<div class="v-beat"><p class="v-prompt">Drum with Didi!</p>
      <div class="v-beatstars" id="v-bstars">${Array.from({length: goal}, () => '<span></span>').join('')}</div>
      <button class="v-drum" id="v-drum" aria-label="Drum"><span class="v-beatring" id="v-ring"></span>${pic('drum', 'v-drumpic')}</button>
      <p class="v-tip">Tap the drum when the circle glows. Boom, boom, boom!</p>
      <button class="button full" id="v-beatgo">${icon('sound')} Start the song</button></div>`,
      {say: `Drum with Didi! Tap the drum to the beat of ${it.title}. Tap Start the song.`});
    const plan = E.music.tunePlan(it.tune, it.lines); const spb = 60000 / plan.bpm;
    const drum = document.querySelector('#v-drum'), ring = document.querySelector('#v-ring'), go = document.querySelector('#v-beatgo');
    let start = 0, raf = 0, stop = null, got = 0, lastBeat = -1, done = false, t = null;
    const stars = [...document.querySelectorAll('#v-bstars span')];
    const finish = msg => { if (done) return; done = true; cancelAnimationFrame(raf); clearTimeout(t); stop?.(); E.sfx('sparkle'); E.feedback(msg, 'good'); E.talk(msg); E.firstTry(true); E.next('Boom! Next'); };
    const tick = () => {
      if (!start || done) return;
      const ph = ((performance.now() - start) % spb) / spb;
      ring.classList.toggle('on', ph < 0.22 || ph > 0.92);
      raf = requestAnimationFrame(tick);
    };
    go.addEventListener('click', () => {
      E.stopVoice(); go.hidden = true;
      const quiet = !E.musicReady();
      stop = quiet ? null : E.music.playTune(it.tune, it.lines, {onEnd: ok => { if (ok) finish(got >= goal / 2 ? 'Great drumming!' : 'Good drumming! Keep practicing the beat.'); }});
      start = performance.now() + 150; raf = requestAnimationFrame(tick);
      if (quiet) t = setTimeout(() => finish('Great drumming!'), spb * 24);      // no music: sing it and drum for a little while
    });
    drum.addEventListener('click', () => {
      E.sfx('drum'); drum.classList.remove('hit'); void drum.offsetWidth; drum.classList.add('hit');
      if (!start || done) return;
      const since = performance.now() - start; const k = Math.round(since / spb); const off = Math.abs(since - k * spb);
      if (off <= spb * 0.28 && k !== lastBeat && got < goal) { lastBeat = k; stars[got].classList.add('on'); got++; if (got >= goal) finish('You kept the beat!'); }
    });
    E.onCleanup(() => { cancelAnimationFrame(raf); clearTimeout(t); stop?.(); });
    E.skip('We drummed on a pot');
  }
  function letterFind(it) {
    const cols = it.choices.length === 4 ? 2 : 3;
    E.frame(`<div class="v-find"><div class="v-ask"><img src="${E.mascot}" alt=""><span class="v-askbubble">Find <b class="v-target">${it.target}</b></span></div>
      <div class="v-choices v-letters" style="--cols:${cols}">${it.choices.map((c, i) => `<button class="v-lchoice" data-i="${i}" aria-label="${c}">${c}</button>`).join('')}</div></div>`,
      {say: it.prompt.replace(/\b([A-Z])\b/g, (m, x) => sayLetter(x))});
    const btns = [...document.querySelectorAll('.v-lchoice')];
    choose(btns, {isRight: i => it.choices[i] === it.target,
      onRight: () => { E.feedback(`Yes! That’s ${it.target}!`, 'good'); E.talk(`Yes! That's ${sayLetter(it.target)}!`); E.next(); },
      onWrong: (b, i) => { const c = it.choices[i]; E.feedback(`That’s ${c}. Find ${it.target}!`, 'try'); E.talk(`That's ${sayLetter(c)}. Find ${sayLetter(it.target)}!`); }});
  }
  function abcSong() {
    E.frame(`<div class="v-abc"><div class="v-abcgrid">${Object.keys(data.abc).map(L => `<button class="v-abctile" data-l="${L}">${L}</button>`).join('')}</div>
      <div class="v-abcpop" id="v-abcpop" hidden></div>
      <div class="v-two stack"><button class="button" id="v-abcplay">${icon('sound')} Sing the ABCs</button><button class="button secondary" id="v-abcsay">Say the letters</button></div></div>`,
      {say: 'The ABC song! Tap Sing the ABCs and sing along. Tap any letter to hear it.'});
    const tiles = Object.fromEntries([...document.querySelectorAll('.v-abctile')].map(b => [b.dataset.l, b]));
    const pop = document.querySelector('#v-abcpop');
    let stop = null; const play = document.querySelector('#v-abcplay');
    const clear = () => Object.values(tiles).forEach(t => t.classList.remove('lit', 'sung', 'party'));
    play.addEventListener('click', () => {
      E.stopVoice();
      if (stop) { stop(); stop = null; clear(); play.innerHTML = `${icon('sound')} Sing the ABCs`; return; }
      if (!E.musicReady()) { E.toast('Music is off. Tap Say the letters instead!'); return; }
      clear(); play.textContent = '■ Stop';
      stop = E.music.playAbc({onLetter: L => {
        if (L === 'end') { Object.values(tiles).forEach(t => { t.classList.remove('lit'); t.classList.add('party'); }); return; }
        Object.values(tiles).forEach(t => { if (t.classList.contains('lit')) { t.classList.remove('lit'); t.classList.add('sung'); } }); tiles[L]?.classList.add('lit');
      }, onEnd: ok => { stop = null; play.innerHTML = `${icon('sound')} Sing it again`; if (ok) { E.sfx('sparkle'); E.talk('Now you know your A B Cs!'); } }});
      E.onCleanup(() => stop?.());
    });
    document.querySelector('#v-abcsay').addEventListener('click', () => { stop?.(); stop = null; clear(); E.speakSteps(Object.keys(tiles).map(L => ({text: sayLetter(L), el: tiles[L]})), true); });
    Object.entries(tiles).forEach(([L, b]) => b.addEventListener('click', () => {
      const [w, ic] = data.abc[L]; pop.hidden = false; pop.innerHTML = `${pic(ic, 'v-abcpic', w)}<span><b>${L}</b> is for ${esc(w)}</span>`;
      E.hear(`${sayLetter(L)} is for ${w}`); E.sfx('tap');
    }));
    E.next('We sang it!');
  }
  function letterPop(it) {
    E.frame(`<div class="v-pop"><div class="v-ask"><img src="${E.mascot}" alt=""><span class="v-askbubble">Pop every <b class="v-target">${it.target}</b></span><span class="v-popcount" id="v-pc">0 / 3</span></div>
      <div class="v-bubbles">${it.bubbles.map((c, i) => `<button class="v-bubble" data-i="${i}" style="--d:${(i * 0.37) % 1.6}s" aria-label="${c}"><span>${c}</span></button>`).join('')}</div></div>`,
      {say: `Pop all the ${sayLetter(it.target)} bubbles!`});
    let got = 0, tries = 0;
    document.querySelectorAll('.v-bubble').forEach(b => b.addEventListener('click', () => {
      if (b.classList.contains('popped') || got >= 3) return;
      const c = it.bubbles[Number(b.dataset.i)];
      if (c === it.target) {
        got++; b.classList.add('popped'); E.sfx('pop'); document.querySelector('#v-pc').textContent = `${got} / 3`;
        if (got >= 3) { E.firstTry(tries === 0); E.feedback('You popped them all!', 'good'); praiseSay(`You found every ${sayLetter(it.target)}!`); E.next(); }
        else E.talk(`${sayLetter(it.target)}! ${NUM_WORDS[got]}!`);
      } else {
        tries++; E.miss(); b.classList.remove('wobble'); void b.offsetWidth; b.classList.add('wobble'); E.sfx('oops');
        E.feedback(`That’s ${c}. Pop ${it.target}!`, 'try'); E.talk(`That's ${sayLetter(c)}. Pop ${sayLetter(it.target)}!`);
        if (tries >= 3) document.querySelectorAll('.v-bubble:not(.popped)').forEach(x => { if (it.bubbles[Number(x.dataset.i)] === it.target) x.classList.add('hint'); });
      }
    }));
  }
  function nameBuild(it) {
    const letters = [...it.name];
    const order = letters.map((c, i) => ({c, i})).sort(() => Math.random() - 0.5);
    E.frame(`<div class="v-name"><p class="v-prompt">Build your name!</p>
      <div class="v-nameslots">${letters.map((c, i) => `<span class="v-nslot ${i === 0 ? 'next' : ''}" data-s="${i}"><i>${c}</i></span>`).join('')}</div>
      <div class="v-namebank">${order.map(({c}, k) => `<button class="v-ntile" data-k="${k}">${c}</button>`).join('')}</div><div class="v-namecheer" aria-hidden="true"><img src="${E.mascot}" alt="">${pic('party-popper', 'v-cheerpic')}</div></div>`,
      {say: `Let's build your name! Find ${sayLetter(letters[0])}.`});
    let pos = 0, tries = 0, total = 0;
    document.querySelectorAll('.v-ntile').forEach(b => b.addEventListener('click', () => {
      if (pos >= letters.length || b.disabled) return;
      const want = letters[pos];
      if (b.textContent === want) {
        const slot = document.querySelector(`.v-nslot[data-s="${pos}"]`); slot.innerHTML = want; slot.classList.remove('next'); slot.classList.add('filled');
        b.disabled = true; b.classList.add('used'); E.sfx('count', pos + 1); pos++; tries = 0;
        if (pos >= letters.length) {
          E.firstTry(total === 0); document.querySelector('.v-nameslots').classList.add('done'); document.querySelector('.v-name').classList.add('done'); E.sfx('hatch');
          E.feedback(`${it.name}! That’s your name!`, 'good');
          E.speakSteps([...letters.map((c, i) => ({text: sayLetter(c), el: document.querySelector(`.v-nslot[data-s="${i}"]`)})), {text: 'Vivian! That is your name!', el: document.querySelector('.v-nameslots')}]);
          E.next('That’s me!');
        } else { document.querySelector(`.v-nslot[data-s="${pos}"]`).classList.add('next'); E.talk(`${sayLetter(want)}! Now find ${sayLetter(letters[pos])}.`); }
      } else {
        tries++; total++; E.miss(); E.sfx('oops'); b.classList.remove('wobble'); void b.offsetWidth; b.classList.add('wobble');
        E.talk(`That's ${sayLetter(b.textContent)}. We need ${sayLetter(want)}!`);
        if (tries >= 2) [...document.querySelectorAll('.v-ntile')].find(x => !x.disabled && x.textContent === want)?.classList.add('hint');
      }
    }));
  }

  /* ---------------------------------------------------------------- numbers */
  function count(it) {
    const many = plural(it.word, it.n);
    E.frame(`<div class="v-counting"><p class="v-prompt">Count the ${esc(many)}!</p>
      <div class="v-objs n${it.n}">${Array.from({length: it.n}, (_, i) => `<button class="v-obj" data-o="${i}" aria-label="${esc(it.word)} ${i + 1}">${pic(it.icon, 'v-objpic')}<span class="v-objn"></span></button>`).join('')}</div>
      <div class="v-after" id="v-after" hidden><p class="v-prompt small">How many ${esc(plural(it.word))}? Tap the number.</p><div class="v-choices v-nums">${it.choices.map(numChoice).join('')}</div></div></div>`,
      {say: `Let's count the ${many}! Touch each one.`});
    let n = 0;
    document.querySelectorAll('.v-obj').forEach(b => b.addEventListener('click', () => {
      if (b.classList.contains('counted')) { E.talk(`We counted that one!`); return; }
      n++; b.classList.add('counted'); b.querySelector('.v-objn').textContent = n; E.sfx('count', n); E.hear(NUM_WORDS[n] || String(n));
      if (n === it.n) setTimeout(() => {
        document.querySelector('.v-objs').classList.add('all'); const after = document.querySelector('#v-after'); after.hidden = false;
        E.talk(`${NUM_WORDS[it.n]}! ${it.n} ${many}! How many ${plural(it.word)}? Tap the number.`); after.scrollIntoView({behavior: 'smooth', block: 'nearest'});
      }, 700);
    }));
    const btns = [...document.querySelectorAll('.v-num')];
    choose(btns, {isRight: i => it.choices[i] === it.n,
      onRight: () => { E.feedback(`${it.n} ${many}!`, 'good'); praiseSay(`${it.n} ${many}!`); E.next(); },
      onWrong: (b, i) => { const c = it.choices[i]; E.feedback(`That’s ${c}. We counted ${it.n}!`, 'try'); E.talk(`That's ${NUM_WORDS[c]}. We counted ${NUM_WORDS[it.n]}. Find ${it.n}!`); }});
  }
  function quick(it) {
    const spots = dotsSvg(it.n, 170, '#e64980');
    E.frame(`<div class="v-quick"><p class="v-prompt">Quick look! How many?</p><div class="v-flash" id="v-flash">${spots}</div>
      <div class="v-choices v-nums" id="v-qc" hidden>${it.choices.map(numChoice).join('')}</div><button class="quiet-help" id="v-again" hidden>Look again</button></div>`,
      {say: 'Quick look! How many dots?'});
    const flash = document.querySelector('#v-flash'), qc = document.querySelector('#v-qc'), again = document.querySelector('#v-again');
    const hide = () => { flash.classList.add('gone'); qc.hidden = false; again.hidden = false; };
    const t = setTimeout(hide, 1700); E.onCleanup(() => clearTimeout(t));
    again.addEventListener('click', () => { flash.classList.remove('gone'); setTimeout(() => flash.classList.add('gone'), 1400); });
    choose([...qc.querySelectorAll('.v-num')], {isRight: i => it.choices[i] === it.n,
      onRight: () => { flash.classList.remove('gone'); E.feedback(`${it.n}!`, 'good'); praiseSay(`${NUM_WORDS[it.n]} dots!`); E.next(); },
      onWrong: (b, i) => { E.feedback('Look again!', 'try'); E.talk(`That's ${NUM_WORDS[it.choices[i]]}. Look again!`); flash.classList.remove('gone'); setTimeout(() => flash.classList.add('gone'), 1400); }});
  }
  function give(it) {
    const many = plural(it.word, it.n);
    E.frame(`<div class="v-give"><div class="v-goal"><span class="v-goaln">${it.n}</span>${dotsSvg(it.n, 42)}<span>Give Didi <b>${it.n}</b> ${esc(many)}!</span></div>
      <div class="v-giverow"><div class="v-pile" id="v-pile">${Array.from({length: it.max}, (_, i) => `<button class="v-gitem" data-g="${i}" aria-label="${esc(it.word)}">${pic(it.icon, 'v-gpic')}</button>`).join('')}</div>
      <div class="v-didi"><img src="${E.mascot}" alt="Didi" class="v-didiimg"><div class="v-plate" id="v-plate">${plateSvg(150)}<div class="v-onplate" id="v-onplate"></div></div><span class="v-platecount" id="v-pcount">0</span></div></div>
      <p class="v-tip">Tap ${esc(an(it.word))} to give it. Tap it on the plate to take it back.</p></div>`,
      {say: `Didi is hungry! Give Didi ${it.n} ${many}. Then tap Done.`});
    const pile = document.querySelector('#v-pile'), plate = document.querySelector('#v-onplate'), cnt = document.querySelector('#v-pcount');
    const update = () => { const k = plate.children.length; cnt.textContent = k; return k; };
    let solved = false, tries = 0;
    document.querySelectorAll('.v-gitem').forEach(b => b.addEventListener('click', () => {
      if (solved) return;
      if (b.parentElement === pile) { plate.append(b); const k = update(); E.sfx('count', k); E.hear(NUM_WORDS[k] || String(k)); }
      else { pile.append(b); update(); E.sfx('whoosh'); }
    }));
    const a = E.actions(`<button class="button full" id="v-gdone">${icon('check')} Done!</button>`);
    a.querySelector('#v-gdone').addEventListener('click', () => {
      if (solved) return; const k = update();
      if (k === it.n) { solved = true; E.firstTry(tries === 0); E.sfx('yum'); document.querySelector('.v-didiimg').classList.add('happy'); const yum = /cookie|apple|strawberr|carrot|banana|cake|seed|berr|melon/.test(it.word);
        E.feedback(`${yum ? 'Yum!' : 'Thank you!'} ${it.n} ${many}!`, 'good'); praiseSay(`${yum ? 'Yum yum!' : 'Thank you!'} ${it.n} ${many}! Just right!`); E.next(); }
      else { tries++; E.miss(); E.sfx('oops'); const msg = k > it.n ? `That’s ${k}. Too many! Take some back.` : `That’s ${k}. Didi wants ${it.n}!`; E.feedback(msg, 'try'); E.talk(msg.replace('’', "'")); }
    });
  }
  function zero(it) {
    const word = it.icon === 'egg' ? 'eggs' : 'chicks';
    E.frame(`<div class="v-zero"><p class="v-prompt">Which nest has <b>zero</b> ${word}?</p>
      <div class="v-choices v-nests" style="--cols:3">${it.groups.map((g, i) => `<button class="v-nestbtn" data-i="${i}" aria-label="${g} ${word}"><span class="v-nestitems">${Array.from({length: g}, () => pic(it.icon, 'v-nestpic')).join('')}</span>${nestSvg(96)}</button>`).join('')}</div></div>`,
      {say: `Which nest has zero ${word}? Zero means none!`});
    choose([...document.querySelectorAll('.v-nestbtn')], {isRight: i => it.groups[i] === 0,
      onRight: () => { E.feedback('Zero! None at all!', 'good'); praiseSay(`Zero ${word}! That nest is empty.`); E.next(); },
      onWrong: (b, i) => { const g = it.groups[i]; E.feedback(`That nest has ${g}.`, 'try'); E.talk(`That nest has ${NUM_WORDS[g]}. Find the empty one!`); }});
  }
  function more(it) {
    E.frame(`<div class="v-more"><p class="v-prompt">Which one has <b>more</b>?</p>
      <div class="v-choices v-trays" style="--cols:2">${[it.a, it.b].map((n, i) => `<button class="v-tray" data-i="${i}" aria-label="${n}">${Array.from({length: n}, () => pic(it.icon, 'v-traypic')).join('')}</button>`).join('')}</div></div>`,
      {say: 'Which one has more?'});
    const big = Math.max(it.a, it.b), small = Math.min(it.a, it.b);
    choose([...document.querySelectorAll('.v-tray')], {isRight: i => [it.a, it.b][i] === big,
      onRight: () => { E.feedback(`${big} is more than ${small}!`, 'good'); praiseSay(`${NUM_WORDS[big]} is more than ${NUM_WORDS[small]}!`); E.next(); },
      onWrong: () => { E.feedback('That one has less. Try the other!', 'try'); E.talk('That one has less. Which one has more?'); }});
  }
  function size(it) {
    const sizes = [['big', 100], ['middle', 64], ['little', 36]].sort(() => Math.random() - 0.5);
    E.frame(`<div class="v-size"><p class="v-prompt">Find the <b>${it.ask === 'big' ? 'BIG' : 'little'}</b> one!</p>
      <div class="v-choices v-sizes" style="--cols:3">${sizes.map(([k, px], i) => `<button class="v-sizebtn" data-i="${i}" aria-label="${k}"><span style="width:${px}%">${pic(it.icon, 'v-sizepic')}</span></button>`).join('')}</div></div>`,
      {say: it.ask === 'big' ? 'Find the big one! The biggest!' : 'Find the little one! The smallest!'});
    choose([...document.querySelectorAll('.v-sizebtn')], {isRight: i => sizes[i][0] === it.ask,
      onRight: () => { E.feedback(it.ask === 'big' ? 'Yes! That one is BIG!' : 'Yes! That one is little!', 'good'); praiseSay(it.ask === 'big' ? 'That one is big!' : 'That one is little!'); E.next(); },
      onWrong: () => { E.feedback(it.ask === 'big' ? 'Find a bigger one!' : 'Find a smaller one!', 'try'); E.talk(it.ask === 'big' ? 'Find a bigger one!' : 'Find a smaller one!'); }});
  }
  function pattern(it) {
    const w = x => it.words?.[x] || x.replace(/-/g, ' ');
    E.frame(`<div class="v-pattern"><p class="v-prompt">What comes next?</p>
      <div class="v-seq">${it.seq.map((x, i) => `<span class="v-seqitem" data-s="${i}">${pic(x, 'v-seqpic', w(x))}</span>`).join('')}<span class="v-seqitem v-q" id="v-q">?</span></div>
      <div class="v-choices v-pchoices" style="--cols:2">${it.choices.map((c, i) => `<button class="v-pchoice" data-i="${i}" aria-label="${esc(w(c))}">${pic(c, 'v-ppic', w(c))}<span>${esc(w(c))}</span></button>`).join('')}</div></div>`,
      {say: null});
    const items = [...document.querySelectorAll('.v-seqitem[data-s]')];
    const readSeq = extra => E.speakSteps([...it.seq.map((x, i) => ({text: w(x), el: items[i]})), ...(extra || [{text: 'What comes next?', el: document.querySelector('#v-q')}])]);
    E.setSay(() => readSeq(), true); readSeq();
    choose([...document.querySelectorAll('.v-pchoice')], {isRight: i => it.choices[i] === it.answer,
      onRight: () => { const q = document.querySelector('#v-q'); q.innerHTML = pic(it.answer, 'v-seqpic'); q.classList.add('filled'); E.feedback('Yes! The pattern goes on!', 'good');
        E.speakSteps([...it.seq.map((x, i) => ({text: w(x), el: items[i]})), {text: w(it.answer), el: q}, {text: 'You did it! Now do the pattern with your body!', el: null}]); E.next(); },
      onWrong: () => { E.feedback('Listen to the pattern again!', 'try'); readSeq(); }});
  }
  function order(it) {
    E.frame(`<div class="v-order"><p class="v-prompt">Which duck is <b>${it.ask}</b>?</p>
      <div class="v-line-up"><div class="v-choices v-ducks" style="--cols:${it.n}">${Array.from({length: it.n}, (_, i) => `<button class="v-duck" data-i="${i}" aria-label="duck ${i + 1}">${pic(it.icon, 'v-duckpic')}</button>`).join('')}</div>
      <div class="v-pond" aria-hidden="true">${pic('water-wave', 'v-pondpic')}</div></div><p class="v-tip">The ducks are walking to the pond. The first duck is at the front!</p></div>`,
      {say: `The ducks are walking to the pond. Which duck is ${it.ask}?`});
    const want = it.ask === 'first' ? it.n - 1 : 0;           // ducks walk right, toward the pond
    choose([...document.querySelectorAll('.v-duck')], {isRight: i => i === want,
      onRight: () => { E.feedback(it.ask === 'first' ? 'Yes! That duck is first!' : 'Yes! That duck is last!', 'good'); praiseSay(`That duck is ${it.ask}! Quack quack!`); E.next(); },
      onWrong: () => { E.feedback(it.ask === 'first' ? 'The first duck is closest to the pond!' : 'The last duck is at the very back!', 'try'); E.talk(it.ask === 'first' ? 'The first duck is at the front, closest to the pond!' : 'The last duck is at the very back of the line!'); }});
  }
  function sortPick(it) {
    if (it.mode === 'water') {
      E.frame(`<div class="v-sink"><p class="v-prompt">Will the ${esc(it.name)} float or sink?</p>
        <div class="v-tank" id="v-tank">${tankSvg(260)}<span class="v-sinkitem" id="v-si">${pic(it.item, 'v-sinkpic', it.name)}</span></div>
        <div class="v-choices v-bins" style="--cols:2">${it.bins.map(([k, ic], i) => `<button class="v-bin" data-i="${i}">${pic(ic, 'v-binpic')}<span>${k === 'floats' ? 'Float' : 'Sink'}</span></button>`).join('')}</div></div>`,
        {say: `Will the ${it.name} float on top, or sink to the bottom? What do you think?`});
      let done = false;
      document.querySelectorAll('.v-bin').forEach(b => b.addEventListener('click', () => {
        if (done) return; done = true; const guess = it.bins[Number(b.dataset.i)][0]; b.classList.add('picked');
        const si = document.querySelector('#v-si'); si.classList.add('drop'); E.sfx('splash');
        setTimeout(() => { si.classList.add(it.answer === 'floats' ? 'floating' : 'sunk'); E.sfx(it.answer === 'floats' ? 'bloop' : 'plop'); }, 650);
        setTimeout(() => {
          const right = guess === it.answer; E.firstTry(right);
          const res = it.answer === 'floats' ? 'It floats!' : 'It sinks!';
          E.feedback(right ? `${res} You guessed right!` : `${res} Now we know!`, 'good');
          E.talk(right ? `${res} You guessed right!` : `${res} Good guess. Now we know!`); if (right) E.sparkle(b); E.next();
        }, 1500);
      }));
      return;
    }
    E.frame(`<div class="v-sort"><p class="v-prompt">Where does the ${esc(it.name)} go?</p><div class="v-sortitem" id="v-sortitem">${pic(it.item, 'v-sortpic', it.name)}</div>
      <div class="v-choices v-bins" style="--cols:2">${it.bins.map(([k, ic], i) => `<button class="v-bin v-pen" data-i="${i}">${pic(ic, 'v-binpic')}${pic(ic, 'v-binpic small')}<span>${esc(k)}</span></button>`).join('')}</div></div>`,
      {say: `Where does the ${it.name} go? With the cows, or with the pigs?`});
    choose([...document.querySelectorAll('.v-pen')], {isRight: i => it.bins[i][0] === it.answer,
      onRight: b => { document.querySelector('#v-sortitem').classList.add('gone'); b.classList.add('got'); E.feedback(`The ${it.name} goes with the ${it.answer}!`, 'good'); praiseSay(it.name === 'cow' ? 'Moo! Moo!' : 'Oink! Oink!'); E.next(); },
      onWrong: () => { E.feedback('Look at the animals. Try the other one!', 'try'); E.talk(`Is that ${an(it.name)}? Try the other one!`); }});
  }
  function measure(it) {
    const levels = [[1, 'full'], [0.5, 'some'], [0, 'empty']].sort(() => Math.random() - 0.5);
    E.frame(`<div class="v-measure"><p class="v-prompt">Which cup is <b>${it.ask}</b>?</p>
      <div class="v-choices v-cups" style="--cols:3">${levels.map(([lv, k], i) => `<button class="v-cupbtn" data-i="${i}" aria-label="${k}">${cupSvg(lv, 96)}</button>`).join('')}</div></div>`,
      {say: it.ask === 'full' ? 'Which cup is full? Full to the top!' : 'Which cup is empty? Nothing inside!'});
    choose([...document.querySelectorAll('.v-cupbtn')], {isRight: i => levels[i][1] === it.ask,
      onRight: () => { E.feedback(it.ask === 'full' ? 'Full to the top!' : 'Empty! Nothing inside!', 'good'); praiseSay(it.ask === 'full' ? 'That cup is full!' : 'That cup is empty!'); E.next(); },
      onWrong: (b, i) => { const k = levels[i][1]; const msg = k === 'some' ? 'That cup has some water.' : k === 'full' ? 'That cup is full.' : 'That cup is empty.'; E.feedback(msg, 'try'); E.talk(`${msg} Find the ${it.ask} cup!`); }});
  }
  function combine(it) {
    E.frame(`<div class="v-combine"><p class="v-prompt" id="v-cq">${NUM_WORDS[it.a][0].toUpperCase() + NUM_WORDS[it.a].slice(1)} fish are swimming.</p>
      <div class="v-fishtank" id="v-fishtank">${Array.from({length: it.a}, (_, i) => `<button class="v-fish" style="--i:${i}" aria-label="fish">${pic(it.icon, 'v-fishpic')}</button>`).join('')}</div>
      <button class="button full" id="v-splash">${pic('water-wave', 'v-btnpic')} Splash! One more!</button>
      <div class="v-after" id="v-cafter" hidden><div class="v-choices v-nums">${it.choices.map(numChoice).join('')}</div></div></div>`,
      {say: `${NUM_WORDS[it.a]} fish are swimming. Tap Splash for one more!`});
    const tank = document.querySelector('#v-fishtank');
    const counter = () => { let n = 0; tank.querySelectorAll('.v-fish').forEach(f => { f.onclick = () => { if (f.classList.contains('counted')) return; n++; f.classList.add('counted'); E.sfx('count', n); E.hear(NUM_WORDS[n]); }; }); };
    counter();
    document.querySelector('#v-splash').addEventListener('click', e => {
      e.currentTarget.hidden = true; E.sfx('splash');
      for (let k = 0; k < it.b; k++) tank.insertAdjacentHTML('beforeend', `<button class="v-fish new" style="--i:${it.a + k}" aria-label="fish">${pic(it.icon, 'v-fishpic')}</button>`);
      tank.querySelectorAll('.v-fish').forEach(f => f.classList.remove('counted')); counter();
      document.querySelector('#v-cq').textContent = 'How many fish now?'; document.querySelector('#v-cafter').hidden = false;
      E.talk(`Splash! One more fish. How many fish now? You can touch them to count.`);
    });
    choose([...document.querySelectorAll('#v-cafter .v-num')], {isRight: i => it.choices[i] === it.a + it.b,
      onRight: () => { E.feedback(`${it.a} and 1 more make ${it.a + it.b}!`, 'good'); praiseSay(`${NUM_WORDS[it.a]} and one more make ${NUM_WORDS[it.a + it.b]}!`); E.next(); },
      onWrong: (b, i) => { E.feedback('Touch the fish to count them!', 'try'); E.talk(`That's ${NUM_WORDS[it.choices[i]]}. Touch each fish to count!`); }});
  }

  /* ---------------------------------------------------------------- colors & shapes */
  function colorHunt(it) {
    const cards = [...it.targets.map(([w, ic]) => ({w, ic, c: it.color})), ...it.others.map(([w, ic, c]) => ({w, ic, c}))].sort(() => Math.random() - 0.5);
    const hex = data.colors[it.color].hex;
    E.frame(`<div class="v-hunt" style="--hc:${hex}"><div class="v-ask">${splatSvg(hex, 64, it.color)}<span class="v-askbubble">Find <b>${esc(it.color)}</b> things!</span><span class="v-popcount" id="v-hc">0 / 3</span></div>
      <div class="v-choices v-huntgrid" style="--cols:3">${cards.map((k, i) => `<button class="v-huntcard" data-i="${i}" data-keep="1" aria-label="${esc(k.w)}">${pic(k.ic, 'v-huntpic', k.w)}</button>`).join('')}</div></div>`,
      {say: `Let's find ${it.color} things! Tap everything that is ${it.color}.`});
    let got = 0, tries = 0;
    document.querySelectorAll('.v-huntcard').forEach(b => b.addEventListener('click', () => {
      if (b.classList.contains('found') || got >= 3) return;
      const k = cards[Number(b.dataset.i)];
      if (k.c === it.color) {
        got++; b.classList.add('found'); E.sfx('count', got); document.querySelector('#v-hc').textContent = `${got} / 3`; E.hear(`${k.w}! ${it.color}!`);
        if (got >= 3) { E.firstTry(tries === 0); E.feedback(`You found all the ${it.color} things!`, 'good'); setTimeout(() => praiseSay(`You found all the ${it.color} things!`), 900); E.sparkle(document.querySelector('.v-huntgrid')); E.next(); }
      } else {
        tries++; E.miss(); E.sfx('oops'); b.classList.remove('wobble'); void b.offsetWidth; b.classList.add('wobble');
        E.feedback(`The ${k.w} is ${k.c}.`, 'try'); E.talk(`The ${k.w} is ${k.c}. Find ${it.color}!`);
      }
    }));
  }
  function colorPick(it) {
    E.frame(`<div class="v-paint"><p class="v-prompt">What color is the ${esc(it.word)}?</p><div class="v-paintpic" id="v-pp">${pic(it.icon, 'v-bigpic', it.word)}</div>
      <div class="v-choices v-pots" style="--cols:3">${it.choices.map((c, i) => `<button class="v-potbtn" data-i="${i}" aria-label="${c}">${paintPotSvg(data.colors[c].hex, 78, c)}<span>${COLOR_NAMES[c]}</span></button>`).join('')}</div></div>`,
      {say: `What color is the ${it.word}? Pick a paint!`});
    choose([...document.querySelectorAll('.v-potbtn')], {isRight: i => it.choices[i] === it.answer,
      onRight: () => { document.querySelector('#v-pp').classList.add('painted'); E.sfx('swish'); E.feedback(`${COLOR_NAMES[it.answer]}! The ${it.word} is ${it.answer}!`, 'good'); praiseSay(`${it.answer}! The ${it.word} is ${it.answer}!`); E.next(); },
      onWrong: (b, i) => { const c = it.choices[i]; E.feedback(`That’s ${c}. Try another paint!`, 'try'); E.talk(`That's ${c}. Try another color!`); }});
  }
  function colorMix(it) {
    const A = data.colors[it.a].hex, B = data.colors[it.b].hex, R = data.colors[it.answer].hex;
    E.frame(`<div class="v-mix"><p class="v-prompt">${COLOR_NAMES[it.a]} and ${it.b} make…?</p>
      <div class="v-mixrow" id="v-mixrow"><span class="v-blob a">${splatSvg(A, 84, it.a)}</span><span class="v-plus">+</span><span class="v-blob b">${splatSvg(B, 84, it.b)}</span><span class="v-plus">=</span><span class="v-bowl" id="v-bowl" style="--mix:${R}"><span class="v-bowlq">?</span></span></div>
      <button class="button full" id="v-mixgo">${pic('artist-palette', 'v-btnpic')} Mix them!</button>
      <div class="v-after" id="v-mafter" hidden><p class="v-prompt small">What color did we make?</p><div class="v-choices v-pots" style="--cols:3">${it.choices.map((c, i) => `<button class="v-potbtn" data-i="${i}" aria-label="${c}">${splatSvg(data.colors[c].hex, 70, c)}<span>${COLOR_NAMES[c]}</span></button>`).join('')}</div></div></div>`,
      {say: `${it.a} and ${it.b}. Let's mix them! What color will we make?`});
    document.querySelector('#v-mixgo').addEventListener('click', e => {
      e.currentTarget.hidden = true; E.sfx('swish'); document.querySelector('#v-mixrow').classList.add('mixing');
      setTimeout(() => { document.querySelector('#v-bowl').classList.add('mixed'); E.sfx('sparkle'); const af = document.querySelector('#v-mafter'); af.hidden = false; E.talk('Ta-da! What color did we make?'); af.scrollIntoView({behavior: 'smooth', block: 'nearest'}); }, 1300);
    });
    choose([...document.querySelectorAll('#v-mafter .v-potbtn')], {isRight: i => it.choices[i] === it.answer,
      onRight: () => { E.feedback(`${COLOR_NAMES[it.a]} and ${it.b} make ${it.answer}!`, 'good'); praiseSay(`${it.a} and ${it.b} make ${it.answer}!`); E.next(); },
      onWrong: (b, i) => { E.feedback(`That’s ${it.choices[i]}. Look at the bowl!`, 'try'); E.talk(`That's ${it.choices[i]}. Look at the bowl!`); }});
  }
  function shapeThings(it) {
    E.frame(`<div class="v-shapemeet"><button class="v-bigshape" id="v-bigshape">${shapeSvg(it.shape, 170)}</button><h2>This is ${esc(an(it.shape))}!</h2>
      <div class="v-words">${it.things.map(([w, ic], i) => `<button class="v-wordcard" data-t="${i}">${pic(ic, 'v-wpic', w)}<span>${esc(w)}</span></button>`).join('')}</div>
      <p class="v-tip">Trace the ${esc(it.shape)} with your finger. Can you find ${esc(an(it.shape))} in your room?</p></div>`,
      {say: `This is ${an(it.shape)}! Trace it with your finger. ${it.things.map(t => an(t[0])).join(', ')}. They are ${it.shape}s too!`});
    const big = document.querySelector('#v-bigshape');
    big.addEventListener('click', () => { big.classList.remove('wiggle'); void big.offsetWidth; big.classList.add('wiggle'); E.sfx('tap'); E.hear(`${it.shape}!`); });
    document.querySelectorAll('[data-t]').forEach(b => b.addEventListener('click', () => { const w = it.things[Number(b.dataset.t)][0]; E.glow(b); E.hear(`The ${w} is ${an(it.shape)}!`); setTimeout(() => E.glow(null), 1500); }));
    E.next(`Hi, ${it.shape}!`);
  }
  function shapeFind(it) {
    const tint = [['#ffc9c9', '#e03131'], ['#a5d8ff', '#1971c2'], ['#b2f2bb', '#2f9e44']].sort(() => Math.random() - 0.5);
    E.frame(`<div class="v-shapefind"><div class="v-ask"><img src="${E.mascot}" alt=""><span class="v-askbubble">Find the <b>${esc(it.shape)}</b>!</span></div>
      <div class="v-choices v-shapes" style="--cols:3">${it.choices.map((s, i) => `<button class="v-shapebtn" data-i="${i}" aria-label="${s}">${shapeSvg(s, 92, tint[i])}</button>`).join('')}</div></div>`,
      {say: `Find the ${it.shape}!`});
    choose([...document.querySelectorAll('.v-shapebtn')], {isRight: i => it.choices[i] === it.shape,
      onRight: () => { E.feedback(`Yes! It’s ${an(it.shape)}!`, 'good'); praiseSay(`That's ${an(it.shape)}!`); E.next(); },
      onWrong: (b, i) => { E.feedback(`That’s ${an(it.choices[i])}.`, 'try'); E.talk(`That's ${an(it.choices[i])}. Find the ${it.shape}!`); }});
  }

  /* ---------------------------------------------------------------- tracing */
  function trace(it) {
    const isNumber = it.model.kind === 'number';
    const isLetter = it.model.kind === 'letter' || isNumber;          // letters and numbers are both glyphs to trace
    const key = it.model.key;
    const strokes = isNumber ? E.tracing?.numbers?.[key]?.strokes : isLetter ? E.tracing?.letters?.[key]?.strokes : STROKE_PATHS[key];
    const info = isLetter ? null : data.strokes[key];
    const title = isLetter ? `Trace ${key}` : info.title;
    const cue = isLetter ? `Start at the green dot. Follow the path. Lift your finger for each new line.` : key === 'dots' ? 'Tap each ladybug with one finger, one at a time!' : info.cue;
    E.frame(`<div class="v-trace"><div class="v-tracehead">${isLetter ? `<span class="v-tletter">${key}</span>` : pic(info.a, 'v-tpic')}<h2>${esc(title)}</h2><button class="v-demo" id="v-demo">▶ Show me</button></div>
      <div class="v-tracebox" id="v-tracebox"><canvas id="v-canvas" aria-label="Tracing space" role="img"></canvas><div class="v-traceart" id="v-traceart" aria-hidden="true"></div></div>
      <p class="v-tip" id="v-tstatus">${esc(cue)}</p></div>`,
      {say: isNumber ? `Let's trace the number ${key}! Start at the green dot.` : isLetter ? `Let's trace ${sayLetter(key)}! Start at the green dot.` : `${info.title}! ${cue.replace(/\bSTOP\b/, 'stop')}`});
    if (!strokes) { E.next(); return; }
    const canvas = document.querySelector('#v-canvas'), boxEl = document.querySelector('#v-tracebox'), art = document.querySelector('#v-traceart'), status = document.querySelector('#v-tstatus');
    const g = canvas.getContext('2d');
    const svgNS = 'http://www.w3.org/2000/svg'; const meas = document.createElementNS(svgNS, 'svg'); meas.setAttribute('aria-hidden', 'true'); meas.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden'; document.body.append(meas);
    let W = 0, H = 0, paths = [], tracer = null, ink = [], active = null, pid = null, demoRaf = 0, demoPt = null, done = false, lastHint = 0, S = 0, left = 0, top = 0;
    const isDots = key === 'dots';
    function sample() {
      meas.replaceChildren();
      S = Math.min(W, H) - 40; left = (W - S) / 2; top = (H - S) / 2;
      return strokes.map(cmds => {
        const p = document.createElementNS(svgNS, 'path'); p.setAttribute('d', cmds.map(c => c.join(' ')).join(' ')); meas.append(p);
        const len = p.getTotalLength();
        if (len < 0.3) { const m = cmds.find(c => c[0] === 'M'); return [{x: left + m[1] * S / 100, y: top + m[2] * S / 100}]; }
        const n = Math.max(2, Math.ceil(len * S / 100 / 2.4)); const pts = [];
        for (let i = 0; i <= n; i++) { const q = p.getPointAtLength(len * i / n); pts.push({x: left + q.x * S / 100, y: top + q.y * S / 100}); }
        return pts;
      });
    }
    function placeArt() {
      if (isLetter || !info) { art.innerHTML = ''; return; }
      const first = paths[0][0], lastS = paths[paths.length - 1], last = lastS[lastS.length - 1];
      const cl = (v, hi) => Math.max(26, Math.min(hi - 26, v));
      const at = (p, name, cls, dx = 0, dy = 0) => `<span class="v-tart ${cls}" style="left:${cl(p.x + dx, W).toFixed(0)}px;top:${cl(p.y + dy, H).toFixed(0)}px">${pic(name, 'v-tartpic')}</span>`;
      if (isDots) art.innerHTML = paths.map((s, i) => at(s[0], info.a, `dot d${i}`)).join('');
      else if (info.a !== info.b) art.innerHTML = at(first, info.a, 'start', -34, -34) + at(last, info.b, 'end', 30, 30);
      else art.innerHTML = `<span class="v-tart corner">${pic(info.a, 'v-tartpic')}</span>`;
    }
    const toUnits = p => ({x: (p.x - left) * 100 / S, y: (p.y - top) * 100 / S});
    const toPx = p => ({x: left + p.x * S / 100, y: top + p.y * S / 100});
    function reset(keep = false) {
      paths = sample(); active = null;
      if (keep && done) { placeArt(); draw(); return; }        // a finished tracing survives a resize or rotation
      ink = []; done = false;
      const corridor = Math.max(22, Math.min(30, S * 0.085));
      tracer = createGuidedTracer(paths, {corridor, startRadius: corridor + 16, resumeRadius: corridor + 16, lookAhead: 46, maxStep: 64, backtrack: 38, maxArcRatio: 1.6});
      placeArt(); draw();
    }
    function line(pts, color, width, dash = []) {
      if (!pts.length) return; g.strokeStyle = color; g.fillStyle = color; g.lineWidth = width; g.lineCap = 'round'; g.lineJoin = 'round'; g.setLineDash(dash);
      if (pts.length === 1) { g.beginPath(); g.arc(pts[0].x, pts[0].y, width / 2, 0, Math.PI * 2); g.fill(); return; }
      g.beginPath(); g.moveTo(pts[0].x, pts[0].y); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y); g.stroke();
    }
    function draw() {
      g.clearRect(0, 0, W, H);
      const st = tracer?.getState();
      paths.forEach((pts, i) => {
        const doneStroke = done || (st && (st.complete || i < st.strokeIndex));
        if (isDots) { g.fillStyle = doneStroke ? '#b2f2bb' : '#fff3bf'; g.beginPath(); g.arc(pts[0].x, pts[0].y, 30, 0, Math.PI * 2); g.fill(); return; }
        line(pts, doneStroke ? '#d3f9d8' : '#fff0f6', 54); line(pts, '#c9a3b8', 3, [2, 9]);
      });
      ink.forEach(s => line(s.pts.map(toPx), s.color, 14));
      g.setLineDash([]);
      const dot = demoPt || (!done && st && !st.complete ? (st.currentPoint || paths[st.strokeIndex]?.[0]) : null);
      if (dot && !isDots) { g.fillStyle = '#fff'; g.beginPath(); g.arc(dot.x, dot.y, 17, 0, Math.PI * 2); g.fill(); g.fillStyle = '#2f9e44'; g.beginPath(); g.arc(dot.x, dot.y, 12, 0, Math.PI * 2); g.fill(); }
      if (dot && isDots) { g.strokeStyle = '#2f9e44'; g.lineWidth = 5; g.beginPath(); g.arc(dot.x, dot.y, 34, 0, Math.PI * 2); g.stroke(); }
      art.querySelectorAll('.v-tart.dot').forEach((el, i) => el.classList.toggle('done', done || (!!st && (st.complete || i < st.strokeIndex))));
    }
    function resize() {
      const ratio = Math.max(1, window.devicePixelRatio || 1);
      const nw = Math.max(200, boxEl.clientWidth), nh = Math.max(200, boxEl.clientHeight);
      if (Math.abs(nw - W) < 1 && Math.abs(nh - H) < 1) return;
      W = nw; H = nh; canvas.width = Math.round(W * ratio); canvas.height = Math.round(H * ratio); canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
      g.setTransform(ratio, 0, 0, ratio, 0, 0); reset(true);
    }
    const colors = ['#e64980', '#7048e8', '#1c7ed6', '#f76707'];
    const pt = e => { const r = canvas.getBoundingClientRect(); return {x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height}; };
    function hint(msg) { const t = performance.now(); status.textContent = msg; if (t - lastHint > 4000) { lastHint = t; E.talk(msg); } }
    function accept(res, down) {
      if (!res.accepted) { active = null; if (!res.complete) hint(res.reason === 'start-too-far' || res.reason === 'resume-too-far' ? 'Start at the green dot!' : 'Stay on the path. Go back to the green dot!'); return; }
      const pts = (res.drawPoints?.length ? res.drawPoints : [res.point]).map(toUnits);
      if (down || !active) { active = {color: colors[ink.length % colors.length], pts}; ink.push(active); } else active.pts.push(...pts);
      if (res.strokeComplete) {
        active = null; E.sfx(isDots ? 'pop' : 'count', res.strokeIndex + 1);
        if (res.complete) { finished(); return; }
        status.textContent = isDots ? 'Tap the next one!' : 'Lift your finger. Find the next green dot!';
      }
    }
    function finished() {
      if (done) return; done = true; E.firstTry(true); E.sfx('sparkle'); boxEl.classList.add('traced');
      status.textContent = ''; E.feedback(isLetter ? `You traced ${key}!` : 'You did it!', 'good');
      praiseSay(isNumber ? `You traced the number ${key}!` : isLetter ? `You traced ${sayLetter(key)}!` : 'You followed the path!'); E.sparkle(boxEl);
      E.next();
      E.actions(null)?.insertAdjacentHTML('beforeend', '<button class="quiet-help" id="v-tagain">Trace it again</button>');
      document.querySelector('#v-tagain')?.addEventListener('click', () => { boxEl.classList.remove('traced'); reset(); E.feedback(''); status.textContent = cue; });
    }
    function down(e) {
      if (pid !== null || e.isPrimary === false || done) return; e.preventDefault(); cancelDemo(); pid = e.pointerId; try { canvas.setPointerCapture(pid); } catch {}
      const p = pt(e); accept(tracer.pointerDown(p.x, p.y), true); draw();
    }
    function move(e) {
      if (e.pointerId !== pid) return; e.preventDefault();
      for (const ev of (e.getCoalescedEvents?.() || [e])) { const p = pt(ev); accept(tracer.pointerMove(p.x, p.y)); if (done) break; }
      draw();
    }
    function up(e) { if (e.pointerId !== pid) return; tracer.pointerUp(); pid = null; active = null; draw(); }
    function cancelDemo() { if (demoRaf) cancelAnimationFrame(demoRaf); demoRaf = 0; demoPt = null; }
    function demo() {
      cancelDemo(); const all = paths.flat(); if (!all.length) return; const t0 = performance.now(), dur = Math.min(5200, Math.max(1800, all.length * 14));
      E.talk('Watch the green dot. Then you try!');
      const tick = now => { const f = Math.min(1, (now - t0) / dur); demoPt = all[Math.min(all.length - 1, Math.floor(f * (all.length - 1)))]; draw(); if (f < 1) demoRaf = requestAnimationFrame(tick); else { demoRaf = 0; demoPt = null; draw(); status.textContent = 'Your turn!'; } };
      demoRaf = requestAnimationFrame(tick);
    }
    canvas.addEventListener('pointerdown', down, {passive: false}); canvas.addEventListener('pointermove', move, {passive: false});
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => canvas.addEventListener(t, up));
    document.querySelector('#v-demo').addEventListener('click', demo);
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => requestAnimationFrame(resize)) : null; ro?.observe(boxEl);
    resize();
    E.onCleanup(() => { cancelDemo(); ro?.disconnect(); meas.remove(); });
    E.skip('We traced it on paper');
    E.debug(() => ({paths: paths.map(s => s.map(p => ({...p}))), state: tracer?.getState(), done}));
  }

  /* ---------------------------------------------------------------- stories & talking */
  const blanks = t => esc(t).replace(/_{3,}/g, '<span class="v-blank">?</span>');
  const speakable = t => t.replace(/_{3,}/g, '...').replace(/"/g, '');
  function story(it) {
    let page = 0;
    const show = () => {
      const [text, pics] = it.pages[page];
      E.frame(`<div class="v-story"><p class="v-storytitle">${esc(it.title)}</p><div class="v-page">${pageScene(it.bg, pics, 'v-storyscene')}<p class="v-storytext">${blanks(text)}</p></div>
        ${it.me && /_{3,}/.test(text) ? '<p class="v-tip">Your turn! Tell your grown-up.</p>' : ''}
        <div class="v-pagedots">${it.pages.map((_, i) => `<span class="${i === page ? 'on' : i < page ? 'seen' : ''}"></span>`).join('')}</div></div>`, {say: speakable(text)});
      const a = E.actions(`<div class="v-two">${page > 0 ? `<button class="button secondary" id="v-prev">${icon('back')} Back</button>` : ''}<button class="button" id="v-pnext">${page + 1 < it.pages.length ? 'Turn the page' : 'The end!'} ${icon('arrow')}</button></div>`);
      a.querySelector('#v-prev')?.addEventListener('click', () => { E.stopVoice(); page--; show(); });
      a.querySelector('#v-pnext').addEventListener('click', () => { E.stopVoice(); E.sfx('whoosh'); if (page + 1 < it.pages.length) { page++; show(); } else if (it.ask) askQs(); else { E.talk('The end!'); E.advance(); } });
    };
    const askQs = () => {
      let qi = 0;
      const q = () => {
        const [question, answer] = it.qs[qi];
        E.frame(`<div class="v-talkq"><p class="v-storytitle">Let’s talk about the story</p>${pageScene(it.bg, it.pages[Math.min(it.pages.length - 1, qi * 3)][1], 'v-storyscene')}
          <p class="v-question">${esc(question)}</p><details class="v-grownup"><summary>Grown-up: an answer</summary><p>${esc(answer)}</p><p>Wait 5 seconds. Then add one more word to what she says.</p></details></div>`, {say: question});
        const a = E.actions(`<div class="v-two"><button class="button" id="v-answered">${icon('check')} She answered!</button></div><button class="quiet-help" id="v-qskip">Skip this question</button>`);
        const nextQ = () => { E.stopVoice(); qi++; if (qi < it.qs.length) q(); else { E.talk('Great talking!'); E.advance(); } };
        a.querySelector('#v-answered').addEventListener('click', () => { E.sfx('good'); E.talk(E.praise()); setTimeout(nextQ, 700); });
        a.querySelector('#v-qskip').addEventListener('click', nextQ);
      };
      q();
    };
    show();
  }
  function sequence(it) {
    const order = [0, 1, 2].sort(() => Math.random() - 0.5); if (order.join() === '0,1,2') order.reverse();
    E.frame(`<div class="v-seqgame"><div class="v-slots3">${['First', 'Next', 'Last'].map((w, i) => `<div class="v-slot3" data-s="${i}"><span class="v-slotn">${i + 1}</span><small>${w}</small></div>`).join('')}</div>
      <p class="v-prompt">What happened first?</p>
      <div class="v-cards3">${order.map(k => `<button class="v-card3" data-k="${k}" aria-label="picture">${pageScene(it.bg, it.cards[k][1], 'v-cardscene', '0 12 100 54')}<span class="v-ear" aria-hidden="true">${icon('sound')}</span></button>`).join('')}</div></div>`,
      {say: `Let's tell the story ${it.title}! What happened first? Tap a picture to hear it.`});
    let pos = 0, tries = 0, total = 0;
    document.querySelectorAll('.v-card3').forEach(b => b.addEventListener('click', () => {
      if (b.disabled || pos > 2) return; const k = Number(b.dataset.k);
      if (k === pos) {
        const slot = document.querySelector(`.v-slot3[data-s="${pos}"]`); slot.append(b); b.disabled = true; slot.classList.add('filled');
        E.sfx('count', pos + 1); E.hear(speakable(it.cards[k][0])); pos++; tries = 0;
        if (pos > 2) { E.firstTry(total === 0); E.feedback('You told the story!', 'good'); document.querySelector('.v-seqgame .v-prompt').textContent = 'That’s the story!';
          setTimeout(() => E.speakSteps([{text: 'First,', el: null}, {text: speakable(it.cards[0][0]), el: document.querySelector('.v-slot3[data-s="0"]')}, {text: 'Next,', el: null},
            {text: speakable(it.cards[1][0]), el: document.querySelector('.v-slot3[data-s="1"]')}, {text: 'At the end,', el: null}, {text: speakable(it.cards[2][0]), el: document.querySelector('.v-slot3[data-s="2"]')}, {text: 'You told the story!', el: null}]), 1800);
          E.next(); }
        else document.querySelector('.v-prompt').textContent = pos === 1 ? 'What happened next?' : 'What happened at the end?';
      } else {
        tries++; total++; E.miss(); E.sfx('oops'); b.classList.remove('wobble'); void b.offsetWidth; b.classList.add('wobble');
        E.hear(speakable(it.cards[k][0]) + (pos === 0 ? '. Did that happen first?' : '. Did that happen next?'));
        if (tries >= 2) document.querySelector(`.v-card3[data-k="${pos}"]`)?.classList.add('hint');
      }
    }));
    E.skip('We told it together');
  }
  function talkWords(it) {
    E.frame(`<div class="v-talk"><p class="v-prompt">Say it with me!</p>
      <div class="v-talkgrid">${it.words.map(([w, ic], i) => `<div class="v-talkcard" data-i="${i}"><button class="v-talkpic" data-i="${i}" aria-label="${esc(w)}">${pic(ic, 'v-wpic', w)}<span>${esc(w)}</span></button><button class="v-said" data-i="${i}" aria-label="She said ${esc(w)}">★</button></div>`).join('')}</div>
      <p class="v-tip">Tap a picture to hear it. She says it. Grown-up: tap ★ when she tries it.</p>
      <details class="v-grownup"><summary>Grown-up tip</summary><p><b>${esc(it.target)}.</b> ${esc(it.tip)}</p><p>Any try counts! Say the word back the right way, with a smile. Never ask her to repeat it again and again.</p></details></div>`,
      {say: 'Talk time! Tap a picture. Listen, and say it with me!'});
    document.querySelectorAll('.v-talkpic').forEach(b => b.addEventListener('click', () => { const w = it.words[Number(b.dataset.i)][0]; E.glow(b); E.hear(`${w}. Your turn! ${w}.`); setTimeout(() => E.glow(null), 2200); }));
    let said = 0;
    document.querySelectorAll('.v-said').forEach(b => b.addEventListener('click', () => {
      if (b.classList.contains('on')) return; b.classList.add('on'); said++; E.logTalk(it.words[Number(b.dataset.i)][0]); E.sfx('sparkle'); E.sparkle(b.parentElement);
      E.talk(E.praise()); if (said === it.words.length) E.feedback('She said every word!', 'good');
    }));
    E.next('We talked!');
  }
  function talkAsk(it) {
    let qi = 0;
    const q = () => {
      const [question, answer] = it.qs[qi];
      E.frame(`<div class="v-talkq"><div class="v-talkpics">${it.pics.slice(qi * 2, qi * 2 + 3).map(p => pic(p, 'v-tpic2')).join('')}</div><p class="v-question">${esc(question)}</p>
        <details class="v-grownup"><summary>Grown-up: ideas</summary><p>${esc(answer)}</p><p><b>${esc(it.target)}.</b> ${esc(it.tip)}</p></details>
        <div class="v-pagedots">${it.qs.map((_, i) => `<span class="${i === qi ? 'on' : i < qi ? 'seen' : ''}"></span>`).join('')}</div></div>`, {say: question});
      const a = E.actions(`<div class="v-two"><button class="button" id="v-answered">${icon('check')} She answered!</button></div><button class="quiet-help" id="v-qskip">Next question</button>`);
      const nextQ = () => { E.stopVoice(); qi++; if (qi < it.qs.length) q(); else { E.talk('Great talking!'); E.advance(); } };
      a.querySelector('#v-answered').addEventListener('click', () => { E.sfx('good'); E.talk(E.praise()); setTimeout(nextQ, 800); });
      a.querySelector('#v-qskip').addEventListener('click', nextQ);
    };
    q();
  }
  function soundPlay(it) {
    let wi = 0, clear = 0;
    const show = () => {
      const [w, ic] = it.words[wi];
      E.frame(`<div class="v-sound"><div class="v-soundhead"><div class="v-mouth">${data.mouthSvg[it.mouth] || ''}</div><div><span class="v-soundlabel">${esc(it.label)}</span><p>${esc(it.cue)}</p></div></div>
        <button class="v-saycard" id="v-sayw">${pic(ic, 'v-saypic', w)}<span>${esc(w)}</span></button>
        <div class="v-pagedots">${it.words.map((_, i) => `<span class="${i === wi ? 'on' : i < wi ? 'seen' : ''}"></span>`).join('')}</div>
        <p class="v-tip">Grown-up: say the word slowly. She tries. Then tap.</p></div>`, {say: `${w}. Say ${w}!`});
      document.querySelector('#v-sayw').addEventListener('click', () => { E.hear(w); });
      const a = E.actions(`<div class="v-two"><button class="button v-notyet" id="v-ny">↻ Not yet</button><button class="button v-clear" id="v-cl">${icon('check')} Clear!</button></div>`);
      const go = ok => { E.logSound(it.s, ok); if (ok) { clear++; E.sfx('pop'); E.sparkle(document.querySelector('#v-sayw')); E.talk(E.praise()); } else E.talk('Good trying!');
        setTimeout(() => { wi++; if (wi < it.words.length) show(); else done(); }, 700); };
      a.querySelector('#v-cl').addEventListener('click', () => go(true));
      a.querySelector('#v-ny').addEventListener('click', () => go(false));
    };
    const done = () => {
      E.frame(`<div class="v-sound"><div class="v-soundhead"><div class="v-mouth">${data.mouthSvg[it.mouth] || ''}</div><div><span class="v-soundlabel">${esc(it.label)}</span></div></div>
        <p class="v-bigresult">${clear} of ${it.words.length} clear!</p><p class="v-tip">Every try helps. The Progress Book has a page for these numbers.</p></div>`, {say: 'Great sound play!'});
      E.sfx('sparkle'); E.next('All done!');
    };
    show();
  }

  return {song, beat, letterPic, nameFind, moveCard, freeze, letterMeet, letterFind, abcSong, letterPop, nameBuild, count, quick, give, zero, more, size, pattern, order, sortPick, measure, combine,
    colorHunt, colorPick, colorMix, shapeThings, shapeFind, trace, story, sequence, talkWords, talkAsk, soundPlay, pageScene};
}
