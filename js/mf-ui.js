/**
 * Meteor Falls adventure screens for Ana's kindergarten year: the walk-around town, learning battles,
 * the team, the friend album, letter stones and word signs. Glue between the kindergarten plan
 * (k36-ui.js) and the world/battle engines. Progress is saved on this phone only.
 */
import {createWorld, loadImage} from './mf-world.js';
import {createBattle} from './mf-battle.js';
import {sfx, playMusic, stopMusic, setAudio, unlockAudio} from './mf-audio.js';
import {loadMF, saveMF, normalizeMF, HEROES, HERO_IDS, party, unlockedHeroes, levelOf, xpForLevel, addXP, XP, recordAnswer, battleItems,
  mapIdFor, todaysCritters, markWon, todaysStones, todaysSigns, npcLine, skillArea} from './mf-core.js';
import {dayKey, doneStations, isDayDone, graphemeTiles, WEEKS} from './k36-core.js';

const BASE = './assets/mf/';

export function createAdventure(k) {
  const {data, mf, esc, icon} = k;
  let st = loadMF(localStorage);
  let world = null, battle = null, pending = null, lastDoor = null, pendingLevel = null, attempts = {};
  const persist = () => { if (!saveMF(localStorage, st)) k.toast('Adventure progress cannot be saved on this device right now.'); };
  const soundOn = () => k.settings().sound;
  const syncAudio = () => setAudio({sfx: soundOn(), music: soundOn() && st.settings.music});
  const svgIcon = name => {
    const p = k.pics[name]; if (!p) return Promise.resolve(null);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${p[0]}" width="64" height="64">${p[1]}</svg>`;
    return loadImage('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg));
  };
  const say = text => { if (soundOn()) k.speak(text); };
  const level = () => levelOf(st.xp);

  function gainXP(n, why) {
    const r = addXP(st, n); st = r.st; persist();
    if (r.leveled) { pendingLevel = r.level; sfx('level'); }
    return r;
  }

  /* ---------------------------------------------------------------- the town */
  function renderWorld(plan, k36st) {
    syncAudio();
    const map = mf.maps[mapIdFor(data, plan.week)];
    const W = data.weeks[plan.week - 1];
    const done = doneStations(k36st, plan.week, plan.day);
    const required = plan.stations.filter(s => s.required);
    const reqDone = required.filter(s => done.includes(s.id)).length;
    const allDone = isDayDone(k36st, plan);
    const team = party(st, plan.week);
    const key = dayKey(plan.week, plan.day);
    const critters = st.settings.battles ? todaysCritters(map, plan.week, plan.day, {done: reqDone, required: required.length, review: plan.kind === 'review', st}) : [];
    const stones = todaysStones(map, data, plan.week, plan.day).filter(s => !(st.stones[key] || []).includes(s.key));
    const signs = todaysSigns(map, data, plan.week, plan.day);
    const next = required.find(s => !done.includes(s.id))?.id || null;
    const stations = plan.stations.map(s => ({id: s.id, title: s.title, icon: s.icon, color: s.color, required: s.required, done: done.includes(s.id)}));
    const unit = data.units[String(W.u)];
    const friends = Object.keys(st.friends).length; const embers = Object.keys(st.embers).length;
    k.frame(`<section class="mf-screen" style="--uc:${unit.color}">
      <div class="mf-top">
        <div class="mf-where"><b>${esc(map.name)}</b><small>Week ${plan.week} · Day ${plan.day} · ${esc(plan.title)}</small></div>
        <div class="mf-chips">${stations.map(s => `<button class="mf-chip ${s.done ? 'done' : ''} ${s.id === next ? 'next' : ''} ${s.required ? '' : 'extra'}" data-go="${s.id}" style="--sc:${s.color}" aria-label="${esc(s.title)}${s.done ? ', done' : ''}">${k.picHtml(s.icon)}${s.done ? '<i>✓</i>' : ''}</button>`).join('')}</div>
      </div>
      <div class="mf-view" id="mf-view"></div>
      <div class="mf-bottom">
        <button class="mf-btn" id="mf-team" aria-label="Team, level ${level()}"><img src="${BASE}${mf.art.busts[team[0]]}.webp" alt=""><span><small>Team</small><b>Lv ${level()}</b></span></button>
        <button class="mf-btn" id="mf-album" aria-label="Friend album, ${friends} friends">${k.picHtml('sparkles')}<span><small>Friends</small><b>${friends}</b></span></button>
        <button class="mf-btn" id="mf-stickers" aria-label="Stickers">${k.picHtml('glowing-star')}<span><small>Stickers</small><b>${k.stickerCount()}</b></span></button>
        <button class="mf-btn" id="mf-embers" aria-label="Embers, ${embers} of ${WEEKS}"><img src="${BASE}o-ember.webp" alt=""><span><small>Embers</small><b>${embers}/${WEEKS}</b></span></button>
      </div>
      ${allDone ? `<div class="mf-daydone"><span>${k.picHtml('glowing-star')} Day ${plan.day} is done!</span><button class="button small" id="mf-next-day">Next day ${icon('arrow')}</button></div>` : ''}
    </section>`);
    const view = document.querySelector('#mf-view');
    // a new day starts at home; later in the day she comes back where she was
    const freshDay = !done.length && !(st.won[key] || []).length && !(st.stones[key] || []).length && !(st.signs[key] || []).length;
    const start = lastDoor && lastDoor.map === map.id ? lastDoor.xy : (freshDay ? null : (st.pos[map.id] || null));
    const ctxLine = {name: k.name, next: next ? plan.stations.find(s => s.id === next).title : null, left: required.length - reqDone, allDone,
      awake: critters.some(c => c.awake && !c.won && !c.boss), bossAwake: critters.some(c => c.boss && c.awake && !c.won),
      newg: W.newg.filter(g => data.sounds[g]), keys: Object.fromEntries(Object.entries(data.sounds).map(([g, s]) => [g, s.key])), heart: W.heart};
    world = createWorld({view, mf, map, base: BASE, party: team, stations, critters: critters.filter(c => !c.won), stones, signs, start, startDir: lastDoor ? 'down' : 'up',
      nextStation: next, icons: svgIcon,
      npcLine: (id, n) => npcLine(id, ctxLine, n),
      stationName: id => data && k.stationTitle(id),
      say, sfx, unlock: () => { unlockAudio(); syncAudio(); playMusic('world'); },
      onMove: (x, y) => { st.pos[map.id] = [x, y]; persist(); },
      onEnter: (id, xy) => { lastDoor = {map: map.id, xy: [xy.x, xy.y + 4]}; stopMusic(); k.navigate('k36station', {station: id}); },
      onBattle: c => startBattle(plan, map, c),
      onStone: s => stoneFound(plan, s),
      onSign: s => readSign(plan, s)});
    lastDoor = null;
    k.setCleanup(() => { world?.destroy(); world = null; stopMusic(); closeOverlay(); });
    document.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => { unlockAudio(); world?.walkToStation(b.dataset.go); }));
    document.querySelector('#mf-team').addEventListener('click', () => teamSheet(plan));
    document.querySelector('#mf-album').addEventListener('click', () => album());
    document.querySelector('#mf-stickers').addEventListener('click', () => k.navigate('k36stickers'));
    document.querySelector('#mf-embers').addEventListener('click', () => embersSheet());
    document.querySelector('#mf-next-day')?.addEventListener('click', () => k.nextDay());
    world.ready.then(() => {
      if (!st.seen.intro) return intro(plan);
      if (pendingLevel) { const L = pendingLevel; pendingLevel = null; return levelUp(L); }
      const wake = critters.find(c => c.awake && !c.won && !c.boss && !st.seen[`w${key}-${c.key}`] && c !== critters[0]);
      const boss = critters.find(c => c.boss && c.awake && !c.won);
      if (boss && !st.seen[`b${key}`]) { st.seen[`b${key}`] = true; persist(); const t = `${k.name}! The big ${mf.art.critters[boss.id].name} woke up by the meteor! Let’s help it!`; world.say(t); say(t); return; }
      if (wake) { st.seen[`w${key}-${wake.key}`] = true; persist(); const t = `A grumpy ${mf.art.critters[wake.id].name} woke up! Walk into it to battle!`; world.say(t); say(t); return; }
      const t = npcLine('glint', ctxLine, 0); world.say(t);
      if (k.settings().autoRead) say(t);
    });
  }

  /* ---------------------------------------------------------------- overlays (inside the app, not browser dialogs) */
  let overlay = null;
  function closeOverlay() { overlay?.remove(); overlay = null; }
  function sheet(html, cls = '') {
    closeOverlay();
    overlay = document.createElement('div'); overlay.className = `mf-overlay ${cls}`;
    overlay.innerHTML = `<div class="mf-sheet" role="dialog" aria-modal="true">${html}</div>`;
    document.querySelector('#main')?.append(overlay);
    overlay.addEventListener('click', e => { if (e.target === overlay) closeOverlay(); });
    overlay.querySelector('[data-close]')?.addEventListener('click', closeOverlay);
    return overlay;
  }
  function intro(plan) {
    const o = sheet(`<img class="mf-logo" src="${BASE}logo.webp" alt="Meteor Falls"><img class="mf-titleart" src="${BASE}title.webp" alt="">
      <h2>Welcome to Meteor Falls, ${esc(k.name)}!</h2>
      <p>A meteor brought the <b>Hush</b>, and it made some critters grumpy. Jay and his friends need your help!</p>
      <ul class="mf-how"><li>${k.picHtml('footprints')} Tap the ground to walk.</li><li>${k.picHtml('house')} Walk to the bouncing signs to play.</li><li>${k.picHtml('glowing-star')} Answer questions to make critters happy again!</li></ul>
      <button class="button full" id="mf-go">Let’s go! ${icon('arrow')}</button>`, 'intro');
    say(`Welcome to Meteor Falls, ${k.name}! A meteor brought the Hush, and it made some critters grumpy. Tap the ground to walk. Walk to the bouncing signs to play. Answer questions to make critters happy again!`);
    o.querySelector('#mf-go').addEventListener('click', () => { st.seen.intro = true; persist(); closeOverlay(); unlockAudio(); syncAudio(); playMusic('world'); sfx('select'); k.stopVoice(); });
  }
  function levelUp(L) {
    const o = sheet(`<div class="mf-lvl">${k.picHtml('glowing-star')}<h2>Level ${L}!</h2><p>Your team grew stronger. Keep learning!</p></div><button class="button full" data-close>Yay! ${icon('check')}</button>`, 'celebrate');
    say(`Level up! Your team is level ${L}!`);
  }
  function teamSheet(plan) {
    const open = unlockedHeroes(plan.week);
    const L = level(); const cur = st.xp - xpForLevel(L), need = xpForLevel(L + 1) - xpForLevel(L);
    const o = sheet(`<h2>Your team</h2><p class="mf-sub">Team level <b>${L}</b> · <span class="mf-xpbar"><i style="width:${Math.round(100 * cur / need)}%"></i></span> ${need - cur} XP to level ${L + 1}</p>
      <div class="mf-heroes">${HERO_IDS.map(id => {
        const h = HEROES[id]; const ok = open.includes(id);
        return `<button class="mf-hero ${ok ? '' : 'locked'} ${st.leader === id ? 'lead' : ''}" data-hero="${id}" ${ok ? '' : 'disabled'} aria-label="${esc(h.name)}${ok ? '' : ', joins in week ' + h.week}">
          <img src="${BASE}${mf.art.busts[id]}.webp" alt=""><b>${ok ? esc(h.name) : '?'}</b><small>${ok ? esc(h.move) : `Joins week ${h.week}`}</small></button>`;
      }).join('')}</div><p class="mf-sub">Tap a friend to lead the team!</p><button class="button secondary full" data-close>Done</button>`, 'team');
    say('Your team! Tap a friend to lead the team.');
    o.querySelectorAll('.mf-hero:not(.locked)').forEach(b => b.addEventListener('click', () => {
      st.leader = b.dataset.hero; persist(); sfx('select'); say(`${HEROES[st.leader].name} leads the team!`);
      closeOverlay(); k.navigate('k36', undefined, true);
    }));
  }
  function album() {
    const all = Object.entries(mf.art.critters).sort((a, b) => a[1].unit - b[1].unit);
    const o = sheet(`<h2>Friend album</h2><p class="mf-sub">Critters you helped: <b>${Object.keys(st.friends).length}</b> of ${all.length}</p>
      <div class="mf-album">${all.map(([id, c]) => st.friends[id]
        ? `<button class="mf-friend" data-name="${esc(c.name)}"><img src="${BASE}${c.mini}.webp" alt=""><small>${esc(c.name)}</small>${st.friends[id] > 1 ? `<em>×${st.friends[id]}</em>` : ''}</button>`
        : `<span class="mf-friend unknown"><img src="${BASE}${c.mini}.webp" alt=""><small>?</small></span>`).join('')}</div>
      <button class="button secondary full" data-close>Done</button>`, 'album');
    o.querySelectorAll('.mf-friend[data-name]').forEach(b => b.addEventListener('click', () => { k.speakNow(b.dataset.name); sfx('select'); }));
  }
  function embersSheet() {
    sheet(`<h2>Embers</h2><p class="mf-sub">Win the big battle at the meteor each Friday to find that week’s Ember. Every Ember helps light the rocket at the end of the year!</p>
      <div class="mf-embers">${Array.from({length: WEEKS}, (_, i) => `<span class="${st.embers[i + 1] ? 'got' : ''}" title="Week ${i + 1}"><img src="${BASE}o-ember.webp" alt=""><small>${i + 1}</small></span>`).join('')}</div>
      <button class="button secondary full" data-close>Done</button>`, 'embers');
    say(`You have ${Object.keys(st.embers).length} Embers. Win the big battle each Friday to find one!`);
  }

  /* ---------------------------------------------------------------- letter stones and word signs */
  function stoneFound(plan, s) {
    const key = dayKey(plan.week, plan.day);
    st.stones[key] = [...new Set([...(st.stones[key] || []), s.key])];
    gainXP(XP.stone);
    sfx('stone');
    const up = s.g.split('').map(c => c.toUpperCase()).join('');
    const pop = document.createElement('div'); pop.className = 'mf-stonepop';
    pop.innerHTML = `<span class="mf-stone-letter">${esc(up)} ${esc(s.g)}</span>${k.picHtml(s.i)}<b>${esc(s.word)}</b>`;
    document.querySelector('.mf-screen')?.append(pop); setTimeout(() => pop.remove(), 2600);
    k.speakNow(`${s.g.split('').map(c => c.toUpperCase()).join(' ')}! ${s.word} starts with ${s.g.split('').map(c => c.toUpperCase()).join(' ')}.`);
  }
  function readSign(plan, s) {
    const tiles = graphemeTiles(s.g);
    const o = sheet(`<p class="mf-sub">Read the sign!</p><div class="mf-signword">${tiles.map((t, i) => `<button class="mf-stile ${t.silent ? 'silent' : ''}" data-i="${i}"><span>${esc(t.t)}</span><i>${t.silent ? '' : '●'}</i></button>`).join('')}</div>
      <p class="mf-sub">Touch each dot and say the sound. Then read the whole word.</p>
      <div class="k-two"><button class="button secondary" id="mf-hear">${icon('sound')} Hear it</button><button class="button" id="mf-readit">${icon('check')} I read it!</button></div>`, 'sign');
    say('Read the sign! Touch each dot and say the sound. Then read the whole word.');
    o.querySelectorAll('.mf-stile').forEach(b => b.addEventListener('click', () => { b.classList.add('lit'); setTimeout(() => b.classList.remove('lit'), 700); sfx('select'); }));
    o.querySelector('#mf-hear').addEventListener('click', () => k.speakNow(s.w));
    o.querySelector('#mf-readit').addEventListener('click', () => {
      const key = dayKey(plan.week, plan.day); const first = !(st.signs[key] || []).includes(s.key);
      st.signs[key] = [...new Set([...(st.signs[key] || []), s.key])];
      if (first) gainXP(XP.sign);
      sfx('win'); k.speakNow(`${s.w}! Great reading!`); closeOverlay();
    });
  }

  /* ---------------------------------------------------------------- battles */
  function startBattle(plan, map, c) {
    if (window.__mfTrace) window.__mfTrace.push('ui.startBattle ' + c.key);
    const kind = c.boss ? (c.final ? 'final' : 'boss') : 'critter';
    attempts[c.key] = (attempts[c.key] || 0) + 1;
    const seed = (c.spot ?? 9) * 31 + attempts[c.key];
    const items = battleItems(data, plan.week, plan.day, st, {kind, seed});
    pending = {plan, mapId: map.id, theme: map.theme?.battle || 'meadow', critter: c, items};
    k.navigate('k36battle');
  }
  function renderBattle() {
    if (!pending) { k.navigate('k36', undefined, true); return; }
    syncAudio();
    const {plan, critter, items, theme} = pending;
    k.frame('<div id="mf-battle-root"></div>');
    const root = document.querySelector('#mf-battle-root');
    battle = createBattle({root, mf, base: BASE, critter, items, theme, heroes: HEROES, party: party(st, plan.week), level: level(), esc,
      play: (item, el, hooks) => k.playItem(el, item, hooks), sfx, music: n => { unlockAudio(); playMusic(n); }, stopMusic, say: t => say(t),
      onEnd: res => battleOver(res)});
    k.setCleanup(() => { battle?.destroy(); battle = null; stopMusic(); });
  }
  function battleOver(res) {
    const {plan, critter} = pending;
    for (const a of res.answers) st = recordAnswer(st, a.item, a.first);
    if (!res.won) { persist(); pending = null; k.navigate('k36'); return; }
    st = markWon(st, plan.week, plan.day, critter.key, critter.id);
    const earned = res.answers.reduce((n, a) => n + (a.first ? XP.first : XP.later), 0) + (critter.boss ? XP.boss : XP.win);
    const before = level(); gainXP(earned); const after = level();
    const cm = mf.art.critters[critter.id];
    const root = document.querySelector('#mf-battle-root');
    const box = document.createElement('div'); box.className = 'mf-results';
    box.innerHTML = `<div class="mf-sheet"><img class="mf-friendpic" src="${BASE}${cm.img}.webp" alt=""><h2>You won!</h2>
      <p><b>${esc(cm.name)}</b> is happy again and joined your friend album!</p>
      <p class="mf-score">${res.firstTries} of ${res.total} right on the first try · <b>+${earned} XP</b></p>
      ${after > before ? `<p class="mf-levelup">${k.picHtml('glowing-star')} Level up! Team level ${after}!</p>` : ''}
      ${critter.boss ? `<p class="mf-ember"><img src="${BASE}o-ember.webp" alt=""> You found the Ember for week ${plan.week}!</p>` : ''}
      ${critter.boss && plan.week === WEEKS ? `<p class="mf-levelup">${k.picHtml('rocket')} ${Object.keys(st.embers).length} Embers light up the rocket! The Hush is gone. ${esc(k.name)}, you are a Meteor Falls hero!</p>` : ''}
      <button class="button full" id="mf-back">Back to ${esc(mf.maps[pending.mapId].name)} ${icon('arrow')}</button></div>`;
    root?.append(box);
    if (after > before) { pendingLevel = null; setTimeout(() => sfx('level'), 700); }
    say(`You won! ${cm.name} is your friend now!${after > before ? ` Level up! Your team is level ${after}!` : ''}${critter.boss ? ' You found an Ember!' : ''}`);
    box.querySelector('#mf-back').addEventListener('click', () => { pending = null; k.navigate('k36'); });
  }

  /* ---------------------------------------------------------------- hooks from the lesson plan */
  function stationDone(id, firstTime) { if (firstTime) gainXP(XP.station); }

  /* ---------------------------------------------------------------- grown-ups */
  function parentHtml() {
    const areas = {};
    for (const [key, v] of Object.entries(st.skills)) { const a = skillArea(key); const s = areas[a] || (areas[a] = {c: 0, t: 0, weak: []}); s.c += v.c; s.t += v.t; if (v.t >= 2 && v.c / v.t < 0.6) s.weak.push(key.split(':')[1]); }
    const rows = Object.entries(areas).map(([a, v]) => `<tr><td>${esc(a)}</td><td>${v.t ? Math.round(100 * v.c / v.t) : 0}%</td><td>${v.t}</td><td>${esc(v.weak.slice(0, 6).join(', ') || '—')}</td></tr>`).join('');
    return `<section class="parent-section" id="mf-parent"><h3>Meteor Falls adventure</h3>
      <label class="toggle-line" for="mf-world-on">Walk-around town between games <input type="checkbox" id="mf-world-on" ${st.settings.world ? 'checked' : ''}></label>
      <label class="toggle-line" for="mf-battles-on">Learning battles with critters <input type="checkbox" id="mf-battles-on" ${st.settings.battles ? 'checked' : ''}></label>
      <label class="toggle-line" for="mf-music-on">Adventure music <input type="checkbox" id="mf-music-on" ${st.settings.music ? 'checked' : ''}></label>
      <p>Team level ${level()} · ${st.stats.battles} battles won · ${Object.keys(st.friends).length} critter friends · ${Object.keys(st.embers).length} Embers.</p>
      ${rows ? `<p>Battle answers right on the first try (every battle question is a lesson skill; wrong answers just make the critter dodge):</p><table class="k-sumtable"><thead><tr><th>Skill</th><th>First try</th><th>Answers</th><th>Needs practice</th></tr></thead><tbody>${rows}</tbody></table>` : '<p>Battle results will show here after her first battle.</p>'}
      <p class="tiny-caption">Art and characters from Meteor Falls.</p></section>`;
  }
  function bindParent(box) {
    const on = (id, keyName) => box.querySelector(id)?.addEventListener('change', e => { st.settings[keyName] = e.target.checked; persist(); syncAudio(); if (keyName === 'music' && !e.target.checked) stopMusic(); });
    on('#mf-world-on', 'world'); on('#mf-battles-on', 'battles'); on('#mf-music-on', 'music');
  }

  return {
    enabled: () => st.settings.world !== false,
    renderWorld, renderBattle, stationDone, parentHtml, bindParent,
    get state() { return st; },
    setState(next) { st = normalizeMF(next); persist(); },
    debug: () => ({st, world: world?.debug(), pending: pending && {critter: pending.critter, items: pending.items}}),
    worldApi: () => world
  };
}
