/**
 * Vivian's 36-week preschool path: the map, the station player, stickers, the weekly egg and friends,
 * and the grown-up's section. Games live in v36-games.js; plans and progress in v36-core.js.
 */
import {planDay, stationItems, loadV36, saveV36, normalizeV36, defaultV36, completeStation, isDayDone, awardSticker, eggStage, hatchFriend, nextDay, goToDay,
  doneStations, dayKey, stickerFor, logTalk, logSound, logTries, PRAISE, WEEKS, DAYS} from './v36-core.js';
import {createGames, FREEZE_MOVES} from './v36-games.js';
import {sfx, setAudio, playTune, playAbc, playDance, stopMusic, unlockAudio} from './v36-audio.js';
import {eggSvg} from './v36-art.js';

const BG = {grass: ['#e7f5ff', '#d3f9d8'], park: ['#e7f5ff', '#d3f9d8'], farm: ['#fff9db', '#d8f5a2'], garden: ['#e7f5ff', '#d3f9d8'], camp: ['#e5dbff', '#d3f9d8'],
  hill: ['#e7f5ff', '#c3fae8'], pond: ['#e7f5ff', '#d3f9d8'], room: ['#fff4e6', '#ffe8cc'], bath: ['#e3fafc', '#c5f6fa'], sea: ['#d0ebff', '#a5d8ff'],
  beach: ['#e7f5ff', '#fff3bf'], sky: ['#d0ebff', '#e7f5ff']};
const PLAY_TEXT = {move: w => `${w.move[0]}: ${w.move[1]}`, 'color hunt': w => (w.color && w.color.length > 3 && !['review', 'mix'].includes(w.color) ? `Color hunt: walk around the house and find ${w.color} things.` : 'Color hunt: name the colors of things around the house.'),
  wonder: w => `${w.wonder[0]}: ${w.wonder[1]}`, hands: w => `Busy hands: ${w.hands}`, celebrate: () => 'Celebrate: show a grown-up the week’s pages and put a sticker on the chart.'};
/* Pictures the screens use directly (checked by tests). */
export const V36_UI_ICONS = ['sparkles', 'glowing-star', 'star', 'sauropod', 'egg', 'hatching-chick', 'woman-dancing', 'musical-notes', 'snowflake', 'water-wave', 'artist-palette',
  'party-popper', 'teddy-bear', 'seedling', ...FREEZE_MOVES.map(m => m[0])];

export function createV36(ctx) {
  const {data, pics, speak, stopVoice, toast, esc, icon} = ctx;
  let st = loadV36(localStorage);
  let plan = null, run = null, sinceBreak = 0, lastHatch = null;
  const persist = () => { if (!saveV36(localStorage, st)) toast('Progress cannot be saved on this device right now. You can keep playing.'); };
  const settings = () => ctx.settings();
  const syncAudio = () => setAudio({sfx: !!settings().sound, music: !!settings().sound && st.settings.music});
  const talk = text => { if (text && settings().sound) speak(text); };
  const hear = text => { if (!text) return; if (ctx.speakNow) ctx.speakNow(text); else speak(text); };
  const praise = () => PRAISE[Math.floor(Math.random() * PRAISE.length)];
  function glow(el) { document.querySelectorAll('.v-speaking').forEach(x => x.classList.remove('v-speaking')); if (el) el.classList.add('v-speaking'); }
  function speakSteps(steps, explicit = false) {
    if (!explicit && !settings().sound) return;
    if (!ctx.speakList) { (explicit ? hear : talk)(steps.map(x => x.text).join('. ')); return; }
    ctx.speakList(steps.map(x => x.text), i => glow(i >= 0 ? steps[i].el : null), explicit);
  }
  function pic(name, cls = '', label = '') {
    const p = name && pics[name];
    const aria = label ? ` role="img" aria-label="${esc(label)}"` : ' aria-hidden="true"';
    if (!p) return `<span class="v-pic v-missing ${cls}"${aria}>${esc((label || name || '?').slice(0, 1))}</span>`;
    return `<svg class="v-pic ${cls}" viewBox="${p[0]}"${aria} focusable="false">${p[1]}</svg>`;
  }
  function sceneSvg(bg, inner, cls = '', viewBox = null) {
    const [sky, ground] = BG[bg] || BG.grass;
    return `<svg class="v-scene ${cls}" viewBox="${viewBox || '0 0 100 66'}" aria-hidden="true"><rect width="100" height="66" fill="${sky}"/><rect y="58" width="100" height="8" fill="${ground}"/>${data.scenes[bg] || ''}${inner}</svg>`;
  }
  const unitOf = w => data.units[String(data.weeks[w - 1].u)] || data.units['1'];
  const friendOf = w => data.friends[w - 1];

  /* ------------------------------------------------------------ the environment the games use */
  let cleanups = [];
  const runCleanup = () => { const list = cleanups; cleanups = []; list.forEach(f => { try { f(); } catch {} }); stopMusic(); glow(null); };
  const env = {
    data, pics, esc, icon, pic, sceneSvg, tracing: ctx.tracing, mascot: ctx.mascot, toast,
    music: {playTune, playAbc, playDance, stopMusic},
    musicReady() { if (!settings().sound) ctx.soundOn(); syncAudio(); unlockAudio(); return st.settings.music; },
    sfx: (n, a) => { syncAudio(); sfx(n, a); },
    talk, hear, stopVoice, speakSteps, glow, praise,
    frame: (inner, opts) => stationFrame(inner, opts),
    setSay(fn) { const b = document.querySelector('#v-say'); if (b) b.onclick = () => { if (!settings().sound) ctx.soundOn(); fn(); }; },
    feedback(msg, kind = '') { const f = document.querySelector('#v-feedback'); if (f) { f.textContent = msg; f.className = `v-feedback ${kind}`; } },
    actions(html) { const a = document.querySelector('#v-actions'); if (a && html !== null && html !== undefined) a.innerHTML = html; return a; },
    next(label = 'Next') {
      const a = document.querySelector('#v-actions'); if (!a) return;
      a.innerHTML = `<button class="button full v-nextbtn" id="v-next">${esc(label)} ${icon('arrow')}</button>`;
      const b = a.querySelector('#v-next'); b.addEventListener('click', advance); b.focus({preventScroll: true});
    },
    skip(label) { const a = document.querySelector('#v-actions'); if (!a) return; a.innerHTML = `<button class="quiet-help v-skip" id="v-skip">${esc(label)} · skip</button>`; a.querySelector('#v-skip').addEventListener('click', advance); },
    advance: () => advance(),
    sparkle(el) { if (!el) return; const s = document.createElement('span'); s.className = 'v-sparkle'; s.innerHTML = pic('sparkles'); el.append(s); setTimeout(() => s.remove(), 1000); },
    miss() { if (run) run.misses++; },
    firstTry(ok) { if (run) { st = logTries(st, ok); } },
    onCleanup(fn) { cleanups.push(fn); },
    logTalk(word) { st = logTalk(st, word); persist(); },
    logSound(s, ok) { st = logSound(st, s, ok); persist(); },
    debug(fn) { if (/[?&]test=1\b/.test(location.search)) window.__v36trace = fn; }
  };
  const games = createGames(env);
  if (/[?&]test=1\b/.test(location.search)) window.__v36 = {run: () => run && {station: run.station, index: run.index, item: run.items[run.index], count: run.items.length}, state: () => st};   // automated checks only

  /* ------------------------------------------------------------ the map */
  function currentPlan() { plan = planDay(data, st.week, st.day); return plan; }
  function renderMap() {
    syncAudio();
    const p = currentPlan(); const u = unitOf(p.week); const done = doneStations(st, p.week, p.day);
    const allDone = isDayDone(st, p); const sticker = st.stickers[dayKey(p.week, p.day)];
    const nextIdx = p.stations.findIndex(s => !done.includes(s.id));
    const stage = eggStage(st, p.week); const fr = friendOf(p.week); const hatched = !!st.friends[p.week];
    const stops = p.stations.map((s, i) => {
      const ok = done.includes(s.id), here = i === nextIdx;
      return `<div class="v-stoprow ${i % 2 ? 'right' : 'left'}">${here ? `<img class="v-walker" src="${ctx.mascot}" alt="">` : ''}<button class="v-stop ${ok ? 'done' : ''} ${here ? 'here' : ''}" data-station="${s.id}" style="--sc:${s.color}" aria-label="${esc(s.title)}${ok ? ', done' : ''}">
        <span class="v-stop-icon">${pic(s.icon)}</span><span class="v-stop-label">${esc(s.title)}${s.group && s.group !== s.title ? `<small>${esc(s.group)}</small>` : ''}</span>${ok ? '<span class="v-stop-star" aria-hidden="true">★</span>' : ''}</button></div>`;
    }).join('');
    const paper = p.paper.map(c => data.paperTitles[c] || c).join(', ');
    const play = p.play.map(k => PLAY_TEXT[k]?.(p.w)).filter(Boolean)[0] || '';
    ctx.frame(`<section class="v-hero" style="--uc:${u.color};--uc2:${u.c2}">
        <button class="v-avatar-btn" id="v-hi" aria-label="Hear today’s plan"><img class="v-avatar" src="${ctx.mascot}" alt="">${icon('sound')}</button>
        <div><p class="eyebrow" style="color:${u.c3}">${esc(u.name)}</p><h1>Hi, Vivi!</h1><p class="v-weekline">Week ${p.week} · Day ${p.day} · <b>${esc(p.title)}</b></p></div>
        <span class="v-unit-badge" aria-hidden="true">${pic(u.icon)}</span></section>
      ${allDone ? `<section class="v-daydone-card"><div>${pic(sticker || 'glowing-star', 'v-mini-sticker')}</div><div><strong>Day ${p.day} is done!</strong><p>Play a game again, or go on.</p></div><button class="button small" id="v-next-day">Next day ${icon('arrow')}</button></section>` : ''}
      <nav class="v-path" aria-label="Today’s games" style="--uc:${u.color}">${stops}</nav>
      <section class="v-eggrow" style="--uc:${u.color}">
        <button class="v-eggbtn ${stage >= 3 && !hatched ? 'wobbly' : ''}" id="v-egg" aria-label="${hatched ? `${esc(fr.name)} hatched` : 'This week’s egg'}">${hatched ? pic(fr.icon, 'v-friendpic') : eggSvg(stage, u.color, 92)}</button>
        <div><strong>${hatched ? `${esc(fr.name)} hatched!` : 'This week’s egg'}</strong><p>${hatched ? 'A new friend for your friends page.' : stage >= 4 ? 'It’s wiggling! One more day to hatch it!' : `Finish all 5 days to hatch it. ${stage} of 5 done.`}</p>
        <div class="v-eggdays">${Array.from({length: DAYS}, (_, i) => `<span class="${st.stickers[dayKey(p.week, i + 1)] ? 'on' : ''}">${i + 1}</span>`).join('')}</div></div></section>
      <div class="v-bottom-row"><button class="button secondary" id="v-book">${pic('sparkles', 'v-btn-pic')} Stickers <b>${Object.keys(st.stickers).length}</b></button><button class="button secondary" id="v-friends">${pic('hatching-chick', 'v-btn-pic')} Friends <b>${Object.keys(st.friends).length}</b></button></div>
      <button class="button secondary full v-dancebtn" id="v-dance">${pic('woman-dancing', 'v-btn-pic')} Dance break!</button>
      <div class="grownup-note v-note"><p><b>Paper today</b> (Week ${p.week} packet, Day ${p.day}): ${esc(paper)}.</p>${play ? `<p><b>Off-screen play:</b> ${esc(play)}</p>` : ''}<p>Each game takes 2 to 4 minutes. Stop while it’s still fun.</p></div>`);
    document.querySelectorAll('[data-station]').forEach(b => b.addEventListener('click', () => { unlockAudio(); ctx.navigate('v36station', {station: b.dataset.station}); }));
    document.querySelector('#v-book').addEventListener('click', () => ctx.navigate('v36book', {tab: 'stickers'}));
    document.querySelector('#v-friends').addEventListener('click', () => ctx.navigate('v36book', {tab: 'friends'}));
    document.querySelector('#v-dance').addEventListener('click', () => { unlockAudio(); wiggleBreak(true); });
    document.querySelector('#v-egg').addEventListener('click', () => { const b = document.querySelector('#v-egg'); b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); syncAudio(); sfx(hatched ? 'hatch' : 'crack');
      hear(hatched ? `${fr.name} says hi!` : stage >= 4 ? 'Your egg is wiggling! Finish today to hatch it!' : 'Something is inside your egg! Finish all your days to hatch it.'); });
    document.querySelector('#v-next-day')?.addEventListener('click', () => { const n = nextDay(p.week, p.day); st = goToDay(st, n.week, n.day); persist(); renderMap(); window.scrollTo({top: 0}); talk(`Week ${n.week}, day ${n.day}. ${data.weeks[n.week - 1].title}! Pick a game.`); });
    document.querySelector('#v-hi').addEventListener('click', () => { if (!settings().sound) ctx.soundOn(); hear(`Hi Vivi! It's week ${p.week}, day ${p.day}. ${p.title}! ${nextIdx >= 0 ? `Let's play ${p.stations[nextIdx].title}! Tap it.` : 'You did every game today!'}`); });
  }

  /* ------------------------------------------------------------ station player */
  function startStation(id) {
    const p = plan && plan.week === st.week && plan.day === st.day ? plan : currentPlan();
    const s = p.stations.find(x => x.id === id);
    if (!s) { ctx.navigate('v36', undefined, true); return; }
    const replay = doneStations(st, p.week, p.day).includes(s.id);
    const items = stationItems(data, p.week, p.day, s.kind, s.mode, {seed: replay ? 1 + Math.floor(Math.random() * 97) : 0});
    run = {station: s, items, index: 0, misses: 0, intro: `${s.title.replace(/[!.?…]+$/, '')}!`};
    syncAudio(); renderItem();
  }
  function stationFrame(inner, {say = null} = {}) {
    const s = run.station; const n = run.items.length;
    const dots = Array.from({length: n}, (_, i) => `<span class="${i < run.index ? 'done' : i === run.index ? 'current' : ''}"></span>`).join('');
    ctx.frame(`<div class="v-station" style="--sc:${s.color}">
      <div class="v-station-head"><span class="v-station-icon">${pic(s.icon)}</span><strong>${esc(s.title)}</strong>${n > 1 ? `<span class="v-count">${Math.min(run.index + 1, n)} of ${n}</span>` : ''}</div>
      ${n > 1 ? `<div class="v-progress" aria-hidden="true">${dots}</div>` : ''}
      <button class="v-say" id="v-say" aria-label="Hear it again"><img src="${ctx.mascot}" alt="">${icon('sound')}<span>Hear it</span></button>
      <section class="v-card" id="v-card">${inner}</section>
      <p class="v-feedback" id="v-feedback" role="status" aria-live="polite"></p>
      <div class="v-actions" id="v-actions"></div></div>`);
    ctx.setCleanup(runCleanup);
    const intro = run.intro; run.intro = null;
    const b = document.querySelector('#v-say');
    b.onclick = () => { if (!settings().sound) ctx.soundOn(); if (say) hear(say); };
    if (say && settings().autoRead) talk(intro ? `${intro} ${say}` : say);
    else if (intro && settings().autoRead) talk(intro);
  }
  function renderItem() {
    const it = run.items[run.index];
    const game = games[it.type];
    if (!game) { advance(); return; }
    game(it);
    window.scrollTo({top: 0, behavior: 'instant'});
  }
  function advance() {
    stopVoice(); runCleanup();
    if (!run) { ctx.navigate('v36', undefined, true); return; }
    run.index++;
    if (run.index >= run.items.length) return finishStation();
    renderItem();
  }
  function finishStation() {
    const s = run.station; const p = plan;
    st = completeStation(st, p.week, p.day, s.id);
    let dayDone = false;
    if (isDayDone(st, p) && !st.stickers[dayKey(p.week, p.day)]) { st = awardSticker(st, p.week, p.day); dayDone = true; if (eggStage(st, p.week) >= DAYS && !st.friends[p.week]) { st = hatchFriend(st, p.week); lastHatch = p.week; } }
    persist(); sinceBreak++;
    const cheer = praise();
    ctx.frame(`<section class="v-finish" style="--sc:${s.color}"><div class="v-confetti" aria-hidden="true">${Array.from({length: 18}, (_, i) => `<i style="--i:${i}"></i>`).join('')}</div>
      <img class="v-finish-didi" src="${ctx.mascot}" alt=""><h1>${esc(cheer)}</h1><p>You finished <b>${esc(s.title)}</b>!</p>
      <div class="v-stars" aria-hidden="true">${pic('glowing-star', 'v-star1')}${pic('glowing-star', 'v-star2')}${pic('glowing-star', 'v-star3')}</div>
      <button class="button full" id="v-back-map">${dayDone ? 'Get my sticker!' : 'Back to my path'} ${icon('arrow')}</button></section>`, false);
    syncAudio(); sfx('sparkle'); talk(`${cheer} You finished ${s.title.replace(/[!.?…]+$/, '')}!`);
    run = null;
    document.querySelector('#v-back-map').addEventListener('click', () => {
      if (dayDone) { ctx.navigate('v36done'); return; }
      ctx.navigate('v36');
      if (st.settings.breaks && sinceBreak >= 2) { sinceBreak = 0; setTimeout(() => wiggleBreak(false), 250); }
    });
  }

  /* ------------------------------------------------------------ day done: sticker, egg, new friend */
  function renderDayDone() {
    const p = plan || currentPlan(); const sticker = st.stickers[dayKey(p.week, p.day)] || stickerFor(p.week, p.day);
    const u = unitOf(p.week); const stage = eggStage(st, p.week); const fr = friendOf(p.week); const hatch = lastHatch === p.week; lastHatch = null;
    const nd = nextDay(p.week, p.day);
    ctx.frame(`<section class="v-finish v-daydone"><div class="v-confetti" aria-hidden="true">${Array.from({length: 24}, (_, i) => `<i style="--i:${i}"></i>`).join('')}</div>
      <p class="eyebrow">Week ${p.week} · Day ${p.day}</p><h1>Day ${p.day} is done!</h1>
      <div class="v-sticker-reveal">${pic(sticker, 'v-sticker-big')}</div><p>A new sticker for your book!</p>
      <div class="v-hatch ${hatch ? 'hatching' : ''}" id="v-hatch" style="--uc:${u.color}">
        ${hatch ? `<div class="v-hatch-egg">${eggSvg(4, u.color, 130)}</div><div class="v-hatch-friend">${eggSvg(5, u.color, 150)}<span class="v-hatch-pic">${pic(fr.icon, 'v-friend-big')}</span></div><p class="v-hatch-name" id="v-hatch-name">Meet <b>${esc(fr.name)}</b>!</p>`
        : `<div class="v-crack">${eggSvg(stage, u.color, 110)}</div><p>${stage >= 4 ? 'Your egg is wiggling! Tomorrow it hatches!' : `Crack! ${stage} of 5 days. Keep going to hatch your egg!`}</p>`}</div>
      <div class="v-two"><button class="button secondary" id="v-see-book">${pic(hatch ? 'hatching-chick' : 'sparkles', 'v-btn-pic')} ${hatch ? 'Friends' : 'Stickers'}</button><button class="button" id="v-done-map">My path ${icon('arrow')}</button></div>
      <p class="grownup-note">Grown-up: add a sticker to the paper chart too. Next time: Week ${nd.week}, Day ${nd.day}.</p></section>`, false);
    syncAudio(); sfx('sparkle');
    if (hatch) {
      setTimeout(() => sfx('crack'), 500); setTimeout(() => sfx('crack'), 1100); setTimeout(() => sfx('hatch'), 1800);
      talk(`Hooray Vivi! Day ${p.day} is done! Look, your egg is hatching! Crack, crack... It's ${fr.name}! ${fr.name} is your new friend!`);
    } else talk(`Hooray Vivi! Day ${p.day} is done! You got a new sticker! ${stage >= 4 ? 'Your egg is wiggling!' : 'Your egg got a new crack!'}`);
    document.querySelector('#v-see-book').addEventListener('click', () => ctx.navigate('v36book', {tab: hatch ? 'friends' : 'stickers'}));
    document.querySelector('#v-done-map').addEventListener('click', () => ctx.navigate('v36'));
  }
  function renderBook(tab = 'stickers') {
    const nSt = Object.keys(st.stickers).length, nFr = Object.keys(st.friends).length;
    let body;
    if (tab === 'friends') {
      body = `<div class="v-friendgrid">${data.friends.map((f, i) => { const got = st.friends[i + 1]; const u = unitOf(i + 1);
        return `<button class="v-friend ${got ? 'got' : ''}" data-f="${i}" style="--uc:${u.color}" aria-label="${got ? esc(f.name) : `Week ${i + 1} egg`}">${got ? pic(f.icon, 'v-friendpic') : eggSvg(eggStage(st, i + 1), u.color, 56)}<span>${got ? esc(f.name) : `Week ${i + 1}`}</span></button>`; }).join('')}</div>`;
    } else {
      body = Object.entries(data.units).map(([uid, info]) => {
        const rows = data.weeks.filter(w => String(w.u) === uid).map(w => `<div class="v-srow"><span class="v-swk">Wk ${w.n}</span>${Array.from({length: DAYS}, (_, i) => { const s = st.stickers[dayKey(w.n, i + 1)]; return `<span class="v-slotst ${s ? 'got' : ''}">${s ? pic(s) : ''}</span>`; }).join('')}</div>`).join('');
        return `<section class="v-sunit" style="--uc:${info.color}"><h2>${pic(info.icon, 'v-sunit-icon')}${esc(info.name)}</h2>${rows}</section>`;
      }).join('');
    }
    ctx.frame(`<div class="v-book"><div class="v-tabs" role="tablist"><button role="tab" class="${tab === 'stickers' ? 'on' : ''}" aria-selected="${tab === 'stickers'}" id="v-tab-st">${pic('sparkles', 'v-btn-pic')} Stickers ${nSt}</button><button role="tab" class="${tab === 'friends' ? 'on' : ''}" aria-selected="${tab === 'friends'}" id="v-tab-fr">${pic('hatching-chick', 'v-btn-pic')} Friends ${nFr}</button></div>${body}</div>`);
    document.querySelector('#v-tab-st').addEventListener('click', () => ctx.navigate('v36book', {tab: 'stickers'}, true));
    document.querySelector('#v-tab-fr').addEventListener('click', () => ctx.navigate('v36book', {tab: 'friends'}, true));
    document.querySelectorAll('.v-friend').forEach(b => b.addEventListener('click', () => { const i = Number(b.dataset.f); const f = data.friends[i];
      if (st.friends[i + 1]) { b.classList.remove('wiggle'); void b.offsetWidth; b.classList.add('wiggle'); syncAudio(); sfx('pop'); hear(`${f.name}!`); }
      else hear(`Week ${i + 1} egg. Finish week ${i + 1} to hatch it!`); }));
    talk(tab === 'friends' ? `Your friends! You have ${nFr}.` : `Your sticker book! You have ${nSt} stickers.`);
  }

  /* ------------------------------------------------------------ wiggle / dance breaks */
  function wiggleBreak(manual) {
    const m = FREEZE_MOVES[Math.floor(Math.random() * FREEZE_MOVES.length)];
    const d = document.createElement('div'); d.className = 'v-break'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-label', 'Dance break');
    d.innerHTML = `<div class="v-break-card"><p class="eyebrow">${manual ? 'Dance break!' : 'Wiggle break!'}</p>${pic(m[0], 'v-break-pic')}<h2>${esc(m[1])}</h2><div class="v-timer small"><span id="v-bsecs">20</span></div><button class="button full" id="v-break-done">All done!</button></div>`;
    document.body.append(d);
    syncAudio(); talk(`${manual ? 'Dance break' : 'Wiggle break'}! ${m[1]}`);
    const musicT = setTimeout(() => { if (st.settings.music && settings().sound) playDance(); }, 1600);
    let secs = 20; const t = setInterval(() => { secs--; const el = d.querySelector('#v-bsecs'); if (el) el.textContent = Math.max(0, secs); if (secs <= 0) { clearInterval(t); stopMusic(); sfx('good'); talk('Great moving! Back to the games.'); } }, 1000);
    const close = () => { clearTimeout(musicT); clearInterval(t); stopMusic(); stopVoice(); d.remove(); };
    d.querySelector('#v-break-done').addEventListener('click', close);
    ctx.setCleanup(close);
  }

  /* ------------------------------------------------------------ grown-up's corner */
  function parentSection(container) {
    const weekOpts = data.weeks.map(w => `<option value="${w.n}" ${w.n === st.week ? 'selected' : ''}>Week ${w.n} · ${esc(w.title)}</option>`).join('');
    const sounds = Object.entries(st.sounds).map(([k, v]) => `<tr><td>${esc(data.sounds[k]?.label || k)}</td><td>${v.clear}</td><td>${v.notyet}</td></tr>`).join('');
    const words = Object.entries(st.talk).sort((a, b) => b[1] - a[1]).slice(0, 16).map(([w, n]) => `${esc(w)}${n > 1 ? ` ×${n}` : ''}`).join(', ');
    const tries = st.stats.tries ? Math.round(100 * st.stats.firstTry / st.stats.tries) : null;
    container.innerHTML = `<h3>Vivian’s preschool path (36 weeks)</h3>
      <label for="v-pweek">Week</label><select id="v-pweek">${weekOpts}</select>
      <div class="parent-days" id="v-pdays"></div>
      <p>Match the app to her printed packet: Week and Day are on every page. Tap a day to open it.</p>
      <label class="toggle-line" for="v-music">Music box songs and dance music<input id="v-music" type="checkbox" ${st.settings.music ? 'checked' : ''}></label>
      <label class="toggle-line" for="v-breaks">Wiggle breaks after every 2 games<input id="v-breaks" type="checkbox" ${st.settings.breaks ? 'checked' : ''}></label>
      <h3 style="margin-top:14px">What she is doing</h3>
      <p>${Object.keys(st.stickers).length} days finished · ${Object.keys(st.friends).length} friends hatched · ${st.stats.stations} games played${tries !== null ? ` · ${tries}% right on the first try` : ''}.</p>
      ${sounds ? `<table class="k-sumtable"><tr><th>Sound play</th><th>Clear</th><th>Not yet</th></tr>${sounds}</table>` : '<p>Sound play tallies show here after Day 4 each week.</p>'}
      ${words ? `<p><b>Talk time words she tried:</b> ${words}.</p>` : ''}
      <p class="tiny-caption">Copy the numbers into the Progress Book once a week. Right-on-the-first-try is only a rough guide; trying is what matters at 3.</p>
      <div class="parent-actions"><button class="button small secondary" id="v-old">Older 60-day routine</button></div>`;
    const days = () => {
      const w = Number(container.querySelector('#v-pweek').value);
      container.querySelector('#v-pdays').innerHTML = Array.from({length: DAYS}, (_, i) => { const d = i + 1; const done = !!st.stickers[dayKey(w, d)]; const cur = w === st.week && d === st.day;
        return `<button class="parent-day ${cur ? 'current' : ''} ${done ? 'done' : ''}" data-vday="${d}" aria-label="Open day ${d}${done ? ', done' : ''}">${done ? '✓ ' : ''}${d}</button>`; }).join('');
      container.querySelectorAll('[data-vday]').forEach(b => b.addEventListener('click', () => { st = goToDay(st, w, Number(b.dataset.vday)); persist(); plan = null; ctx.closeParents(); ctx.navigate('v36'); }));
    };
    days(); container.querySelector('#v-pweek').onchange = days;
    container.querySelector('#v-music').onchange = e => { st = normalizeV36({...st, settings: {...st.settings, music: e.target.checked}}); persist(); syncAudio(); };
    container.querySelector('#v-breaks').onchange = e => { st = normalizeV36({...st, settings: {...st.settings, breaks: e.target.checked}}); persist(); };
    container.querySelector('#v-old').onclick = () => { ctx.closeParents(); ctx.openOld(); };
  }

  return {
    get state() { return st; },
    setState(next) { st = normalizeV36(next); persist(); plan = null; },
    reset() { st = defaultV36(); persist(); plan = null; },
    hasProgress() { return Object.keys(st.days).length > 0; },
    renderMap, startStation, renderDayDone, renderBook, parentSection,
    stopRun() { runCleanup(); run = null; }
  };
}
