/**
 * Kindergarten 36-week adventure: screens and games for the phone.
 * Uses k36-core.js for plans and progress. Speech uses the phone's voice via ctx.speak.
 */
import {planDay, loadK36, saveK36, normalizeK36, defaultK36, completeStation, isDayDone, awardSticker, nextDay, goToDay, doneStations, dayKey,
  logSpeech, speechSummary, STATION_INFO, PRAISE, STICKERS, WEEKS, DAYS, stickerFor, isoDate} from './k36-core.js';
import {createAdventure} from './mf-ui.js';

const BG = {grass: ['#e7f5ff', '#d3f9d8'], park: ['#e7f5ff', '#d3f9d8'], farm: ['#fff9db', '#d8f5a2'], garden: ['#e7f5ff', '#d3f9d8'], camp: ['#e5dbff', '#d3f9d8'],
  hill: ['#e7f5ff', '#c3fae8'], pond: ['#e7f5ff', '#d3f9d8'], room: ['#fff4e6', '#ffe8cc'], vet: ['#f1f3f5', '#e9ecef'], shop: ['#fff4e6', '#ffe8cc'],
  bath: ['#e3fafc', '#c5f6fa'], sea: ['#d0ebff', '#a5d8ff'], beach: ['#e7f5ff', '#fff3bf'], pool: ['#e7f5ff', '#a5d8ff'], court: ['#e7f5ff', '#b2f2bb'], sky: ['#d0ebff', '#e7f5ff']};
const MOVES = [
  ['person-swimming', 'Freestyle arms', 'Big arm circles, one arm at a time. Ten strokes!'],
  ['dolphin', 'Dolphin kick', 'Feet together, wiggle like a dolphin. Wiggle, wiggle!'],
  ['frog', 'Frog kick', 'Squat down low, then jump out like a frog. Five jumps!'],
  ['butterfly', 'Butterfly arms', 'Swing both arms up and over together. Five times!'],
  ['bubbles', 'Bubble breaths', 'Breathe in through your nose. Blow out slowly, like bubbles. Three times.'],
  ['tennis', 'Tennis swings', 'Five forehands, then five backhands!'],
  ['unicorn', 'Unicorn gallop', 'Gallop around the room and back to your spot.'],
  ['star', 'Star jumps', 'Jump out wide like a star. Five star jumps!']
];
const COIN = {penny: ['1¢', '#d08c60', '#9c5b32', 38], nickel: ['5¢', '#ced4da', '#868e96', 46], dime: ['10¢', '#e9ecef', '#868e96', 34], quarter: ['25¢', '#e9ecef', '#868e96', 54]};

export function createK36(ctx) {
  const {data, pics, speak, stopVoice, toast, esc, icon} = ctx;
  let st = loadK36(localStorage);
  let plan = null, run = null, lastBreak = 0;
  const persist = () => { if (!saveK36(localStorage, st)) toast('Progress cannot be saved on this device right now. You can keep playing.'); };
  const settings = () => ctx.settings();
  const talk = text => { if (settings().sound) speak(text); };
  const takeIntro = () => { const t = run?.intro; if (run) run.intro = null; return t || ''; };
  const auto = text => { const pre = takeIntro(); if (settings().autoRead) talk(pre ? `${pre} ${text}` : text); };
  /* A tap that asks to hear something always speaks, even if sound was switched off. */
  const hearNow = text => { if (ctx.speakNow) ctx.speakNow(text); else speak(text); };
  function glow(el) { document.querySelectorAll('.k-speaking').forEach(x => x.classList.remove('k-speaking')); if (el) el.classList.add('k-speaking'); }
  /* Say each step in turn and light up its picture while it is spoken. */
  function speakSteps(steps, explicit = false) {
    if (!explicit && !settings().sound) return;
    if (!ctx.speakList) { (explicit ? hearNow : speak)(steps.map(x => x.text).join('. ')); return; }
    ctx.speakList(steps.map(x => x.text), i => glow(i >= 0 ? steps[i].el : null), explicit);
  }

  /* ------------------------------------------------------------ pictures */
  function pic(name, cls = '', label = '') {
    const p = name && pics[name];
    const aria = label ? ` role="img" aria-label="${esc(label)}"` : ' aria-hidden="true"';
    if (!p) return `<span class="k-pic k-missing ${cls}"${aria}>${esc((label || name || '?').slice(0, 1))}</span>`;
    return `<svg class="k-pic ${cls}" viewBox="${p[0]}"${aria} focusable="false">${p[1]}</svg>`;
  }
  function scene(bg, props, cls = '') {
    const [sky, ground] = BG[bg] || BG.grass;
    const parts = props.map(([name, x, y, h, flip]) => {
      const p = pics[name]; if (!p) return '';
      const svg = `<svg x="${x - h / 2}" y="${y - h}" width="${h}" height="${h}" viewBox="${p[0]}">${p[1]}</svg>`;
      return flip === 'f' ? `<g transform="translate(${2 * x},0) scale(-1,1)">${svg}</g>` : svg;
    }).join('');
    return `<svg class="k-scene ${cls}" viewBox="0 0 100 66" aria-hidden="true"><rect width="100" height="66" fill="${sky}"/><rect y="58" width="100" height="8" fill="${ground}"/>${data.scenes[bg] || ''}${parts}</svg>`;
  }
  const unitOf = w => data.units[String(data.weeks[w - 1].u)] || data.units['1'];

  /* ------------------------------------------------------------ Meteor Falls adventure (walk-around town and learning battles) */
  let adv = null;
  if (ctx.mf) {
    try {
      adv = createAdventure({data, mf: ctx.mf, pics, esc, icon, picHtml: n => pic(n), speak: text => speak(text), speakNow: text => (ctx.speakNow ? ctx.speakNow(text) : speak(text)),
        stopVoice, toast, settings, frame: html => ctx.frame(html), setCleanup: fn => ctx.setCleanup?.(fn), navigate: (s, extra, replace) => ctx.navigate(s, extra, replace),
        name: ctx.name, stationTitle: id => STATION_INFO[id]?.title || id, stickerCount: () => Object.keys(st.stickers).length,
        nextDay: () => { const p = currentPlan(); const n = nextDay(p.week, p.day); st = goToDay(st, n.week, n.day); persist(); ctx.navigate('k36', undefined, true); },
        playItem: (el, item, hooks) => playItem(el, item, hooks)});
    } catch (e) { adv = null; }
    if (adv && /[?&]test=1\b/.test(location.search)) window.__mf = adv;      // hook for automated checks only
  }

  /* ------------------------------------------------------------ visuals */
  const DOTS = {1: [[1, 1]], 2: [[0, 0], [2, 2]], 3: [[0, 0], [1, 1], [2, 2]], 4: [[0, 0], [2, 0], [0, 2], [2, 2]], 5: [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]], 6: [[0, 0], [2, 0], [0, 1], [2, 1], [0, 2], [2, 2]]};
  function diceSvg(n, size = 120) {
    if (n > 6) return tenFrameSvg(n, 30);
    const dots = (DOTS[n] || []).map(([x, y]) => `<circle cx="${22 + x * 28}" cy="${22 + y * 28}" r="9" fill="#30243d"/>`).join('');
    return `<svg viewBox="0 0 100 100" width="${size}" height="${size}" aria-label="${n} dots" role="img"><rect x="4" y="4" width="92" height="92" rx="18" fill="#fff" stroke="#30243d" stroke-width="4"/>${dots}</svg>`;
  }
  function tenFrameSvg(n, cell = 34, color = '#1c7ed6') {
    const c = [];
    for (let i = 0; i < 10; i++) { const x = 2 + (i % 5) * cell, y = 2 + Math.floor(i / 5) * cell; c.push(`<rect x="${x}" y="${y}" width="${cell}" height="${cell}" fill="#fff" stroke="#30243d" stroke-width="2"/>`); if (i < n) c.push(`<circle cx="${x + cell / 2}" cy="${y + cell / 2}" r="${cell * 0.33}" fill="${color}"/>`); }
    return `<svg viewBox="0 0 ${cell * 5 + 4} ${cell * 2 + 4}" width="${cell * 5 + 4}" height="${cell * 2 + 4}">${c.join('')}</svg>`;
  }
  function objs(iconName, n, frame, interactive = true) {
    const cells = [];
    const slots = frame === 'five' ? 5 : frame === 'ten' ? 10 : frame === 'double' ? 20 : n;
    for (let i = 0; i < slots; i++) {
      if (i < n) cells.push(interactive ? `<button class="k-obj" type="button" data-obj="${i}" aria-label="Count ${i + 1}">${pic(iconName)}<span class="k-objn"></span></button>` : `<span class="k-obj">${pic(iconName)}</span>`);
      else cells.push('<span class="k-obj k-empty" aria-hidden="true"></span>');
    }
    if (frame === 'double') return `<div class="k-frames"><div class="k-objs k-frame">${cells.slice(0, 10).join('')}</div><div class="k-objs k-frame">${cells.slice(10).join('')}</div></div>`;
    return `<div class="k-objs ${frame ? 'k-frame' : ''}">${cells.join('')}</div>`;
  }
  function clockSvg(h, m, size = 200) {
    const p = [`<circle cx="60" cy="60" r="54" fill="#fff" stroke="#30243d" stroke-width="4"/>`];
    for (let i = 1; i <= 12; i++) { const a = (i * 30 - 90) * Math.PI / 180; p.push(`<text x="${(60 + 40 * Math.cos(a)).toFixed(1)}" y="${(60 + 40 * Math.sin(a) + 5).toFixed(1)}" font-size="13" font-weight="700" text-anchor="middle" font-family="Andika, sans-serif" fill="#30243d">${i}</text>`); }
    for (let i = 0; i < 60; i++) { const a = (i * 6 - 90) * Math.PI / 180, r1 = i % 5 ? 51 : 48; p.push(`<line x1="${(60 + r1 * Math.cos(a)).toFixed(1)}" y1="${(60 + r1 * Math.sin(a)).toFixed(1)}" x2="${(60 + 53 * Math.cos(a)).toFixed(1)}" y2="${(60 + 53 * Math.sin(a)).toFixed(1)}" stroke="#868e96" stroke-width="${i % 5 ? 1.2 : 2}"/>`); }
    const ha = ((h % 12) * 30 + m * 0.5 - 90) * Math.PI / 180, ma = (m * 6 - 90) * Math.PI / 180;
    p.push(`<line x1="60" y1="60" x2="${(60 + 27 * Math.cos(ha)).toFixed(1)}" y2="${(60 + 27 * Math.sin(ha)).toFixed(1)}" stroke="#1c7ed6" stroke-width="6" stroke-linecap="round"/>`);
    p.push(`<line x1="60" y1="60" x2="${(60 + 41 * Math.cos(ma)).toFixed(1)}" y2="${(60 + 41 * Math.sin(ma)).toFixed(1)}" stroke="#e64980" stroke-width="4" stroke-linecap="round"/><circle cx="60" cy="60" r="4.5" fill="#30243d"/>`);
    return `<svg viewBox="0 0 120 120" width="${size}" height="${size}" role="img" aria-label="A clock">${p.join('')}</svg>`;
  }
  function coinSvg(kind, scale = 1.4) {
    const [lab, fill, edge, d] = COIN[kind]; const r = d * scale / 2;
    return `<svg viewBox="0 0 ${2 * r + 4} ${2 * r + 4}" width="${2 * r + 4}" height="${2 * r + 4}" role="img" aria-label="${kind}"><circle cx="${r + 2}" cy="${r + 2}" r="${r}" fill="${fill}" stroke="${edge}" stroke-width="3"/><circle cx="${r + 2}" cy="${r + 2}" r="${r - 6}" fill="none" stroke="${edge}" stroke-width="1.2" stroke-dasharray="3 3"/><text x="${r + 2}" y="${r + 2 + r * 0.22}" font-size="${(r * 0.62).toFixed(1)}" font-weight="700" text-anchor="middle" font-family="system-ui, sans-serif" fill="#30243d">${lab}</text></svg>`;
  }
  function shapeSvg(name, size = 96) {
    const f = 'fill="#d0ebff" stroke="#1c7ed6" stroke-width="5" stroke-linejoin="round"';
    const s = {circle: `<circle cx="50" cy="50" r="38" ${f}/>`, square: `<rect x="14" y="14" width="72" height="72" ${f}/>`, triangle: `<polygon points="50,10 90,86 10,86" ${f}/>`,
      rectangle: `<rect x="6" y="26" width="88" height="48" ${f}/>`, hexagon: `<polygon points="28,12 72,12 94,50 72,88 28,88 6,50" ${f}/>`, oval: `<ellipse cx="50" cy="50" rx="44" ry="28" ${f}/>`,
      rhombus: `<polygon points="50,6 90,50 50,94 10,50" ${f}/>`, star: `<polygon points="50,6 61,36 94,37 68,57 78,90 50,71 22,90 32,57 6,37 39,36" ${f}/>`,
      sphere: `<circle cx="50" cy="50" r="38" ${f}/><ellipse cx="50" cy="50" rx="38" ry="12" fill="none" stroke="#1c7ed6" stroke-width="3" stroke-dasharray="5 4"/>`,
      cube: `<polygon points="18,32 50,16 82,32 82,72 50,88 18,72" ${f}/><path d="M18 32 L50 48 L82 32 M50 48 V88" fill="none" stroke="#1c7ed6" stroke-width="4"/>`,
      cylinder: `<path d="M20 24 V76 C20 94 80 94 80 76 V24 Z" ${f}/><ellipse cx="50" cy="24" rx="30" ry="11" ${f}/>`,
      cone: `<path d="M50 8 L86 78 C86 96 14 96 14 78 Z" ${f}/><ellipse cx="50" cy="78" rx="36" ry="10" fill="none" stroke="#1c7ed6" stroke-width="3"/>`}[name] || '';
    return `<svg viewBox="0 0 100 100" width="${size}" height="${size}" role="img" aria-label="${name}">${s}</svg>`;
  }
  function fracSvg(kind, size = 100) {
    const f = 'fill="#fff3bf" stroke="#30243d" stroke-width="4"';
    const L = 'stroke="#30243d" stroke-width="4"';
    const m = {halves: `<circle cx="50" cy="50" r="40" ${f}/><line x1="50" y1="10" x2="50" y2="90" ${L}/>`, 'halves-unequal': `<circle cx="50" cy="50" r="40" ${f}/><line x1="26" y1="18" x2="26" y2="82" ${L}/>`,
      fourths: `<rect x="12" y="12" width="76" height="76" ${f}/><line x1="50" y1="12" x2="50" y2="88" ${L}/><line x1="12" y1="50" x2="88" y2="50" ${L}/>`,
      'fourths-unequal': `<rect x="12" y="12" width="76" height="76" ${f}/><line x1="30" y1="12" x2="30" y2="88" ${L}/><line x1="30" y1="36" x2="88" y2="36" ${L}/><line x1="62" y1="36" x2="62" y2="88" ${L}/>`}[kind] || '';
    return `<svg viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true">${m}</svg>`;
  }
  function tallySvg(n) {
    const groups = [];
    for (let g = 0; g < n; g += 5) { const k = Math.min(5, n - g); let s = ''; for (let i = 0; i < Math.min(k, 4); i++) s += `<line x1="${8 + i * 11}" y1="6" x2="${8 + i * 11}" y2="54" stroke="#30243d" stroke-width="4" stroke-linecap="round"/>`; if (k === 5) s += '<line x1="0" y1="46" x2="50" y2="14" stroke="#e64980" stroke-width="4" stroke-linecap="round"/>'; groups.push(`<svg viewBox="0 0 52 60" width="52" height="60">${s}</svg>`); }
    return `<div class="k-tally">${groups.join('')}</div>`;
  }
  function positionSvg(pos) {
    const box = pics.package, cat = pics['cat-face']; if (!box || !cat) return '';
    const b = `<svg x="30" y="${pos === 'below' ? 8 : 38}" width="40" height="40" viewBox="${box[0]}">${box[1]}</svg>`;
    const cxy = {above: [34, 4], below: [34, 52], 'next to': [70, 44]}[pos];
    const c = `<svg x="${cxy[0]}" y="${cxy[1]}" width="${pos === 'next to' ? 26 : 32}" height="${pos === 'next to' ? 26 : 32}" viewBox="${cat[0]}">${cat[1]}</svg>`;
    return `<svg class="k-possvg" viewBox="0 0 100 86" aria-label="cat ${pos} the box" role="img"><rect width="100" height="86" rx="10" fill="#fff9db"/>${pos === 'below' ? c + b : b + c}</svg>`;
  }
  function visual(v) {
    if (!v) return '';
    switch (v.kind) {
      case 'objs': return objs(v.icon, v.n, v.frame);
      case 'dots': return `<div class="k-flash" data-flash="${v.flash || 0}">${diceSvg(v.n, 150)}</div>`;
      case 'seq': return `<div class="k-seq">${v.items.map(x => x === null ? '<span class="k-seqq">?</span>' : `<span>${x}</span>`).join('')}</div>`;
      case 'add': return `<div class="k-eq">${objs(v.icon, v.a, null)}<span class="k-op">+</span>${objs(v.icon, v.b, null)}</div>`;
      case 'sub': return `<div class="k-sub">${objs(v.icon, v.a, null, true)}</div>`;
      case 'bond': return `<div class="k-bond"><div class="k-whole">${v.whole}</div><div class="k-parts"><div>${v.part}</div><div class="k-seqq">?</div></div></div>`;
      case 'shape': return `<div class="k-center">${shapeSvg(v.shape, 150)}</div>`;
      case 'pattern': return `<div class="k-pattern">${v.items.map(i => pic(i)).join('')}<span class="k-seqq">?</span></div>`;
      case 'ruler': return `<div class="k-ruler"><svg class="k-pencil" viewBox="0 0 ${v.n * 40} 26" width="${v.n * 40}" height="26" aria-label="a pencil" role="img"><rect x="0" y="3" width="${v.n * 40 - 26}" height="20" rx="3" fill="#ffd43b" stroke="#30243d" stroke-width="2"/><rect x="0" y="3" width="12" height="20" rx="3" fill="#ff8fab" stroke="#30243d" stroke-width="2"/><path d="M${v.n * 40 - 26} 3 L${v.n * 40 - 2} 13 L${v.n * 40 - 26} 23 Z" fill="#f4d6a8" stroke="#30243d" stroke-width="2"/><path d="M${v.n * 40 - 8} 10.5 L${v.n * 40 - 2} 13 L${v.n * 40 - 8} 15.5 Z" fill="#30243d"/></svg><div class="k-ruler-balls">${Array.from({length: v.n}, () => pic('tennis-ball')).join('')}</div></div>`;
      case 'graph': return `<div class="k-graph">${v.rows.map(rw => `<div class="k-grow">${pic(rw.i, 'k-glabel')}<div class="k-gbar">${Array.from({length: rw.n}, () => pic(rw.i)).join('')}</div></div>`).join('')}</div>`;
      case 'tally': return tallySvg(v.n);
      case 'clock': return `<div class="k-center">${clockSvg(v.h, v.m)}</div>`;
      case 'coins': return `<div class="k-coins">${Array.from({length: v.n}, () => coinSvg(v.coin, 1.1)).join('')}</div>`;
      case 'sticks': return `<div class="k-sticks">${Array.from({length: v.tens}, () => '<span class="k-ten"></span>').join('')}<span class="k-ones">${Array.from({length: v.ones}, () => '<span class="k-one"></span>').join('')}</span></div>`;
      default: return '';
    }
  }
  function choiceInner(c, layout) {
    switch (layout) {
      case 'letters': return `<span class="k-letter">${esc(String(c.label))}</span>`;
      case 'words': return `<span class="k-word">${esc(String(c.label))}</span>`;
      case 'nums': return `<span class="k-num">${esc(String(c.label))}</span>`;
      case 'claps': return `<span class="k-num">${esc(String(c.label))}</span><span class="k-claps">${Array.from({length: c.v}, () => pic('clapping-hands')).join('')}</span>`;
      case 'pics': return `${pic(c.i, 'k-cpic', c.w)}${c.w ? `<span class="k-plabel">${esc(c.w)}</span>` : ''}`;
      case 'icons': return pic(c.i, 'k-cpic', c.v);
      case 'groups': return objs(c.objs.icon, c.objs.n, null, false);
      case 'shapes': return shapeSvg(c.shape, 84);
      case 'bars': return `<span class="k-bar-wrap">${pic(c.i, 'k-bar-pic')}<span class="k-bar" style="width:${c.bar}%"></span></span>`;
      case 'scenes': return positionSvg(c.pos);
      case 'coins': return coinSvg(c.coin, 1.5);
      case 'fractions': return fracSvg(c.frac);
      default: return esc(String(c.label ?? c.v));
    }
  }

  /* ------------------------------------------------------------ screens: map */
  function currentPlan() {
    plan = planDay(data, st.week, st.day, {targets: st.speech.targets});
    return plan;
  }
  function renderMap() {
    if (adv && adv.enabled()) { run = null; adv.renderWorld(currentPlan(), st); return; }
    const p = currentPlan(); const u = unitOf(p.week); const done = doneStations(st, p.week, p.day);
    const allDone = isDayDone(st, p);
    const sticker = st.stickers[dayKey(p.week, p.day)];
    const total = Object.keys(st.stickers).length;
    const stations = p.stations.map((s, i) => {
      const ok = done.includes(s.id);
      return `<button class="k-stop ${ok ? 'done' : ''} ${i % 2 ? 'right' : 'left'}" data-station="${s.id}" style="--sc:${s.color}" aria-label="${esc(s.title)}${ok ? ', done' : ''}">
        <span class="k-stop-icon">${pic(s.icon)}</span><span class="k-stop-label">${esc(s.title)}${s.required ? '' : '<small>with a grown-up</small>'}</span>${ok ? '<span class="k-stop-star">★</span>' : ''}</button>`;
    }).join('');
    ctx.frame(`<section class="k-hero" style="--uc:${u.color}">
        <button class="k-avatar-btn" id="k-hi" aria-label="Hear today’s plan"><img class="k-avatar" src="${ctx.mascot}" alt="">${icon('sound')}</button>
        <div><p class="eyebrow" style="color:${u.color}">${esc(u.name)}</p><h1>Hi, ${esc(ctx.name)}!</h1><p class="k-weekline">Week ${p.week} · Day ${p.day} · <b>${esc(p.title)}</b></p></div>
        <span class="k-unit-badge" aria-hidden="true">${pic(u.icon)}</span></section>
      ${allDone ? `<section class="k-daydone-card"><div>${pic(sticker || 'glowing-star', 'k-mini-sticker')}</div><div><strong>Day ${p.day} is done!</strong><p>Tap a game to play again, or go on.</p></div><button class="button small" id="k-next-day">Next day ${icon('arrow')}</button></section>` : ''}
      <nav class="k-path" aria-label="Today’s games">${stations}</nav>
      <div class="k-bottom-row"><button class="button secondary" id="k-stickers">${pic('sparkles', 'k-btn-pic')} Stickers <b>${total}</b></button><button class="button secondary" id="k-break">${pic('person-swimming', 'k-btn-pic')} Swim break</button></div>
      <p class="grownup-note">Printed pages: <b>Week ${p.week} packet, Day ${p.day}</b>. Games take about 2 to 4 minutes each. Stop while it is still fun.</p>`);
    document.querySelectorAll('[data-station]').forEach(b => b.addEventListener('click', () => { ctx.navigate('k36station', {station: b.dataset.station}); }));
    document.querySelector('#k-stickers').addEventListener('click', () => ctx.navigate('k36stickers'));
    document.querySelector('#k-break').addEventListener('click', () => swimBreak());
    document.querySelector('#k-next-day')?.addEventListener('click', () => { const n = nextDay(p.week, p.day); st = goToDay(st, n.week, n.day); persist(); renderMap(); auto(`Week ${n.week}, day ${n.day}. ${data.weeks[n.week - 1].title}. Pick a game!`); });
    document.querySelector('#k-hi').addEventListener('click', () => { if (!settings().sound) ctx.soundOn(); speak(`Hi ${ctx.name}! Week ${p.week}, day ${p.day}. ${p.title}. Pick a game on your path.`); });
  }

  /* ------------------------------------------------------------ station player */
  function startStation(id) {
    const p = plan && plan.week === st.week && plan.day === st.day ? plan : currentPlan();
    const s = p.stations.find(x => x.id === id);
    if (!s) { ctx.navigate('k36'); return; }
    run = {station: s, index: 0, misses: 0, speech: {}, startedAt: Date.now(), intro: s.say};
    renderItem();
    if (run.intro) { const t = run.intro; run.intro = null; auto(t); }
  }
  function stationFrame(inner, {showSay = true} = {}) {
    const s = run.station; const n = s.items.length;
    if (run.container) {
      run.container.innerHTML = `<div class="k-station k-battleq" style="--sc:${s.color}">
        ${showSay ? `<button class="k-say" id="k-say" aria-label="Hear it again"><img src="${ctx.mascot}" alt="">${icon('sound')}<span>Hear it</span></button>` : ''}
        <section class="k-card" id="k-card">${inner}</section>
        <p class="k-feedback" id="k-feedback" role="status" aria-live="polite"></p>
        <div class="k-actions" id="k-actions"></div></div>`;
      return;
    }
    const dots = Array.from({length: n}, (_, i) => `<span class="${i < run.index ? 'done' : i === run.index ? 'current' : ''}"></span>`).join('');
    ctx.frame(`<div class="k-station" style="--sc:${s.color}">
      <div class="k-station-head"><span class="k-station-icon">${pic(s.icon)}</span><strong>${esc(s.title)}</strong><span class="k-count">${Math.min(run.index + 1, n)} of ${n}</span></div>
      <div class="k-progress" aria-hidden="true">${dots}</div>
      ${showSay ? `<button class="k-say" id="k-say" aria-label="Hear it again"><img src="${ctx.mascot}" alt="">${icon('sound')}<span>Hear it</span></button>` : ''}
      <section class="k-card" id="k-card">${inner}</section>
      <p class="k-feedback" id="k-feedback" role="status" aria-live="polite"></p>
      <div class="k-actions" id="k-actions"></div></div>`);
  }
  function bindSay(text) { const b = document.querySelector('#k-say'); if (b) b.onclick = () => { if (!settings().sound) { ctx.soundOn(); } speak(text); }; }
  function feedback(msg, kind = '') { const f = document.querySelector('#k-feedback'); if (f) { f.textContent = msg; f.className = `k-feedback ${kind}`; } }
  function nextButton(label = 'Next', primary = true) {
    if (run?.battle) { const r = run; const first = r._m === 0; document.querySelector('#k-actions')?.replaceChildren(); r.battle = false; setTimeout(() => r.onSolved?.(first), 250); return; }
    const a = document.querySelector('#k-actions');
    a.innerHTML = `<button class="button full ${primary ? '' : 'secondary'}" id="k-next">${esc(label)} ${icon('arrow')}</button>`;
    const b = document.querySelector('#k-next'); b.addEventListener('click', advance); b.focus({preventScroll: true});
  }
  function advance() {
    stopVoice();
    run.index++;
    if (run.index >= run.station.items.length) return finishStation();
    renderItem();
  }
  function renderItem() {
    const it = run.station.items[run.index];
    const R = {intro: itemIntro, mc: itemMC, readPic: itemRead, readWord: itemRead, readSentence: itemSentence, build: itemBuild, heartIntro: itemHeartIntro, story: itemStory, say: itemSay}[it.type];
    R(it);
    if (!run.container) window.scrollTo({top: 0, behavior: 'instant'});
  }
  function praise() { return PRAISE[Math.floor(Math.random() * PRAISE.length)]; }
  /* One question inside a battle: same games, no Next button. hooks.onSolved(firstTry), hooks.onMiss() */
  function playItem(container, item, {onSolved, onMiss, intro = null} = {}) {
    run = {station: {id: 'battle', title: 'Battle', color: '#7048e8', icon: 'star', items: [item]}, index: 0, _m: 0, speech: {}, startedAt: Date.now(),
      container, onSolved, onMiss, battle: true, intro};
    Object.defineProperty(run, 'misses', {get() { return this._m; }, set(v) { if (v > this._m) this.onMiss?.(); this._m = v; }});
    renderItem();
  }

  /* intro card: a new letter or team */
  function itemIntro(it) {
    const mouth = data.mouthSvg[it.mouth] || '';
    stationFrame(`<div class="k-intro">
        <div class="k-bigletters"><span>${esc(it.g.length > 1 ? it.g : it.up)}</span>${it.g.length > 1 ? '' : `<span>${esc(it.g)}</span>`}</div>
        <button class="k-keypic" id="k-key" aria-label="${esc(it.key)}">${pic(it.i, 'k-keyimg')}<span>${esc(it.key)}</span></button>
        <details class="k-grownup" open><summary>Grown-up: say the sound</summary>
          <div class="k-mouthrow"><div class="k-mouth">${mouth}</div><div><p><b>${esc(it.cue)}.</b> ${esc(it.tip)}</p><p>${esc(it.action)}</p></div></div></details></div>`);
    bindSay(it.say); auto(it.say);
    document.querySelector('#k-key').addEventListener('click', () => talk(it.key));
    nextButton('I know it!');
  }

  /* generic multiple choice */
  function itemMC(it) {
    const listen = !!it.listen && it.choices.every(c => c.w);
    const ear = listen ? `<span class="k-earbadge" aria-hidden="true">${icon('sound')}</span>` : '';
    const target = it.target ? `<button class="k-target" id="k-target" aria-label="${esc(it.target.w)}">${pic(it.target.i, 'k-tpic')}<span>${esc(it.target.w)}</span>${ear}</button>` : '';
    const parts = it.parts ? `<div class="k-parts-say">${it.parts.map(p => `<button class="k-part" data-part="${esc(p)}">${esc(p)}</button>`).join('<span class="k-op">+</span>')}</div>` : '';
    const hear = it.hear ? `<button class="k-bigear" id="k-hear" aria-label="Hear the word">${pic('ear')}<span>Hear it</span></button>` : '';
    const flash = it.flash ? `<div class="k-flashword" id="k-flashword">${heartWordHtml(it.flash, it.tricky)}</div>` : '';
    const cols = it.layout === 'groups' || it.layout === 'bars' ? 1 : it.choices.length === 4 ? 2 : Math.min(3, it.choices.length);
    stationFrame(`<p class="k-prompt">${esc(it.prompt)}</p>${target}${parts}${hear}${flash}<div class="k-visual">${visual(it.visual)}</div>
      <div class="k-choices layout-${it.layout}${listen ? ' k-listen' : ''}" style="--cols:${cols}" ${it.flash || it.visual?.flash ? 'hidden' : ''}>${it.choices.map((c, i) => `<button class="k-choice" data-i="${i}" aria-label="${esc(String(c.w || c.label || c.v))}"${listen ? ' aria-pressed="false"' : ''}>${choiceInner(c, it.layout)}${ear}</button>`).join('')}</div>
      ${listen ? '<p class="k-tapnote">Tap each picture to hear it. Then tap <b>This one!</b></p>' : ''}`);
    if (listen) return listenMC(it);
    bindSay(it.say);
    document.querySelector('#k-target')?.addEventListener('click', () => talk(it.target.w));
    document.querySelector('#k-hear')?.addEventListener('click', () => talk(it.hear));
    document.querySelectorAll('[data-part]').forEach(b => b.addEventListener('click', () => talk(b.dataset.part)));
    bindCounting();
    const box = document.querySelector('.k-choices');
    const reveal = () => { box.hidden = false; };
    if (it.flash) {
      auto('Look carefully!');
      setTimeout(() => { const f = document.querySelector('#k-flashword'); if (f) { f.classList.add('gone'); reveal(); auto(it.say); addAgain(() => { f.classList.remove('gone'); setTimeout(() => f.classList.add('gone'), 1600); }); } }, 2200);
    } else if (it.visual?.flash) {
      auto('Quick look!');
      setTimeout(() => { const f = document.querySelector('.k-flash'); if (f) { f.classList.add('gone'); reveal(); auto(it.say); addAgain(() => { f.classList.remove('gone'); setTimeout(() => f.classList.add('gone'), it.visual.flash); }); } }, it.visual.flash);
    } else auto(it.say);
    let solved = false, tries = 0;
    box.querySelectorAll('.k-choice').forEach(b => b.addEventListener('click', () => {
      if (solved) return;
      const c = it.choices[Number(b.dataset.i)];
      if (String(c.v) === String(it.answer)) {
        solved = true; b.classList.add('correct'); box.classList.add('solved');
        feedback(it.right || praise(), 'good'); talk(it.right || praise());
        sparkle(b); nextButton();
      } else {
        tries++; run.misses++; b.classList.add('retry'); b.disabled = true;
        const hint = it.mode === 'firstLetter' ? `Listen: ${it.target.w}. Try again!` : it.mode === 'pair' ? `Listen again: ${it.hear}.` : 'Try again!';
        feedback(hint, 'try'); talk(hint);
        if (tries >= 2) { const good = [...box.querySelectorAll('.k-choice')].find(x => String(it.choices[Number(x.dataset.i)].v) === String(it.answer)); good?.classList.add('hint'); }
      }
    }));
  }
  /* Listening games for children who cannot read yet: every picture says its word when tapped.
     Tapping only picks a picture; the big check button gives the answer. */
  function listenSteps(it) {
    const cards = [...document.querySelectorAll('.k-choices .k-choice')];
    const steps = [];
    if (it.parts) {
      const pb = [...document.querySelectorAll('[data-part]')];
      steps.push({text: 'Listen.', el: null});
      it.parts.forEach((p, i) => steps.push({text: p, el: pb[i] || null}));
      steps.push({text: it.ask || 'Which one is it?', el: null});
    } else steps.push({text: it.ask || it.prompt, el: document.querySelector('#k-target')});
    it.choices.forEach((c, i) => steps.push({text: c.w, el: cards[i]}));
    return steps;
  }
  function listenWrong(it, c) {
    const t = it.target?.w;
    switch (it.mode) {
      case 'rhyme': return `${t}, ${c.w}. They do not rhyme. Try another one!`;
      case 'first': return `${t}, ${c.w}. They start with different sounds. Try another one!`;
      case 'last': return `${t}, ${c.w}. They end with different sounds. Try another one!`;
      case 'middle': return `${t}, ${c.w}. Their middle sounds are different. Try another one!`;
      case 'odd': return `${c.w} starts like the others. Try another one!`;
      case 'swap': return `${t}, ${c.w}. They do not rhyme. Try another one!`;
      case 'blendParts': return `Listen: ${it.parts.join(', ')}. Try another one!`;
      case 'deleteSyl': return `Say ${t} without ${it.drop}. Try another one!`;
      default: return 'Not that one. Try another one!';
    }
  }
  function bindListenChoices(it, {sayOf, isRight, onRight, onWrong}) {
    const box = document.querySelector('.k-choices');
    const a = document.querySelector('#k-actions');
    a.innerHTML = `<button class="button full k-checkbtn" id="k-check" disabled>${icon('check')} This one!</button>`;
    const check = document.querySelector('#k-check');
    let picked = null, solved = false;
    box.querySelectorAll('.k-choice').forEach(b => b.addEventListener('click', () => {
      if (solved || b.disabled) return;
      const c = it.choices[Number(b.dataset.i)];
      box.querySelectorAll('.k-choice.picked').forEach(x => { x.classList.remove('picked'); x.setAttribute('aria-pressed', 'false'); });
      b.classList.add('picked'); b.setAttribute('aria-pressed', 'true'); picked = b;
      check.disabled = false; feedback('');
      glow(b); hearNow(sayOf(c)); setTimeout(() => b.classList.remove('k-speaking'), 1100);
    }));
    check.addEventListener('click', () => {
      if (!picked || solved) return;
      const b = picked; const c = it.choices[Number(b.dataset.i)];
      stopVoice(); glow(null);
      b.classList.remove('picked'); b.setAttribute('aria-pressed', 'false'); picked = null;
      if (isRight(c)) { solved = true; b.classList.add('correct'); box.classList.add('solved'); onRight(b, c); }
      else { b.classList.add('retry'); b.disabled = true; check.disabled = true; onWrong(b, c, box); }
    });
  }
  function listenMC(it) {
    const steps = () => listenSteps(it);
    const sayBtn = document.querySelector('#k-say'); if (sayBtn) sayBtn.onclick = () => speakSteps(steps(), true);
    document.querySelector('#k-target')?.addEventListener('click', e => { glow(e.currentTarget); hearNow(it.target.w); setTimeout(() => glow(null), 1100); });
    document.querySelectorAll('[data-part]').forEach(b => b.addEventListener('click', () => { glow(b); hearNow(b.dataset.part); setTimeout(() => glow(null), 1100); }));
    const pre = takeIntro();
    if (settings().autoRead) speakSteps(pre ? [{text: pre, el: null}, ...steps()] : steps());
    let tries = 0;
    bindListenChoices(it, {
      sayOf: c => c.w,
      isRight: c => String(c.v) === String(it.answer),
      onRight: (b) => { const msg = it.right || praise(); feedback(msg, 'good'); talk(msg); sparkle(b); nextButton(); },
      onWrong: (b, c, box) => {
        tries++; run.misses++;
        const msg = listenWrong(it, c); feedback(msg, 'try'); talk(msg);
        if (tries >= 2) [...box.querySelectorAll('.k-choice')].find(x => String(it.choices[Number(x.dataset.i)].v) === String(it.answer))?.classList.add('hint');
      }
    });
  }
  function addAgain(fn) {
    const a = document.querySelector('#k-actions');
    a.innerHTML = '<button class="quiet-help" id="k-again">Show me again</button>';
    document.querySelector('#k-again').addEventListener('click', fn);
  }
  function bindCounting() {
    let n = 0;
    document.querySelectorAll('.k-visual .k-obj[data-obj]').forEach(b => b.addEventListener('click', () => {
      if (b.classList.contains('counted')) return;
      n++; b.classList.add('counted'); b.querySelector('.k-objn').textContent = n; talk(String(n));
    }));
  }
  function sparkle(el) {
    const s = document.createElement('span'); s.className = 'k-sparkle'; s.innerHTML = pic('sparkles');
    el.append(s); setTimeout(() => s.remove(), 900);
  }

  /* reading: tap sounds, swoop, then choose */
  function tilesHtml(tiles, big = true) {
    return `<div class="k-readword ${big ? 'big' : ''}">${tiles.map((t, i) => `<button class="k-rtile ${t.silent ? 'silent' : ''} ${t.vce ? 'vce' : ''}" data-t="${i}"><span class="k-rl">${esc(t.t)}</span><span class="k-rdot">${t.silent ? '' : (t.t.length > 1 ? '▬' : '●')}</span></button>`).join('')}</div>
      <button class="k-swoop" id="k-swoop" aria-label="Swoop and read the whole word"><svg viewBox="0 0 200 40" aria-hidden="true"><path d="M10 12 Q100 50 190 12" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round"/><path d="M176 4 L192 12 L178 22" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg></button>`;
  }
  function bindTiles() {
    document.querySelectorAll('.k-rtile').forEach(b => b.addEventListener('click', () => { b.classList.add('lit'); setTimeout(() => b.classList.remove('lit'), 900); }));
    document.querySelector('#k-swoop')?.addEventListener('click', () => {
      const tiles = [...document.querySelectorAll('.k-rtile')];
      tiles.forEach((t, i) => setTimeout(() => { t.classList.add('lit'); setTimeout(() => t.classList.remove('lit'), 500); }, i * 180));
    });
  }
  function itemRead(it) {
    const isPic = it.type === 'readPic';
    stationFrame(`<p class="k-prompt">${isPic ? 'Read the word. Then tap its picture.' : 'Read the word to your grown-up.'}</p>
      ${tilesHtml(it.tiles)}
      ${isPic ? `<div class="k-choices layout-pics k-listen" style="--cols:3">${it.choices.map((c, i) => `<button class="k-choice" data-i="${i}" aria-label="picture ${i + 1}" aria-pressed="false">${pic(c.i, 'k-cpic')}<span class="k-earbadge" aria-hidden="true">${icon('sound')}</span></button>`).join('')}</div>
        <p class="k-tapnote">Tap a picture to hear its name. Then tap <b>This one!</b></p>` :
      `<div class="k-parent-check"><p class="tiny-caption">Grown-up: she taps each dot and says the sounds, then swoops to read the word.</p><div class="k-two"><button class="button secondary" id="k-hearword">${icon('sound')} Check it</button><button class="button" id="k-readok">${icon('check')} She read it</button></div></div>`}`);
    bindSay(it.say); auto(it.say); bindTiles();
    if (isPic) {
      let tries = 0;
      bindListenChoices(it, {
        sayOf: c => c.v,
        isRight: c => c.v === it.answer,
        onRight: b => { feedback(`Yes! ${it.w}.`, 'good'); talk(`Yes! ${it.w}.`); sparkle(b); nextButton(); },
        onWrong: (b, c, box) => {
          tries++; run.misses++; const msg = 'Look at each letter again. Tap the dots and swoop!'; feedback(msg, 'try'); talk(msg);
          if (tries >= 2) [...box.querySelectorAll('.k-choice')].find(x => it.choices[Number(x.dataset.i)].v === it.answer)?.classList.add('hint');
        }
      });
    } else {
      document.querySelector('#k-hearword').addEventListener('click', () => talk(it.w));
      document.querySelector('#k-readok').addEventListener('click', () => { feedback(praise(), 'good'); talk(`${it.w}! ${praise()}`); nextButton(); });
    }
  }
  function tokenHtml(tokens) {
    return `<p class="k-sentence">${tokens.map((t, i) => `<button class="k-tok ${t.heart ? 'heart' : ''} ${t.name ? 'name' : ''}" data-w="${esc(t.w)}" data-i="${i}">${t.heart ? '<span class="k-tokheart">♥</span>' : ''}${esc(t.t)}<span class="k-tokdot"></span></button>`).join(' ')}</p>`;
  }
  function bindTokens() { document.querySelectorAll('.k-tok').forEach(b => b.addEventListener('click', () => { b.classList.add('lit'); talk(b.dataset.w); setTimeout(() => b.classList.remove('lit'), 900); })); }
  function itemSentence(it) {
    stationFrame(`<p class="k-prompt">Point to each word and read the sentence.</p>${tokenHtml(it.tokens)}
      <p class="tiny-caption">Stuck on a word? Sound it out first. Tap a word to hear it. ♥ = heart word.</p>
      ${it.choices ? `<p class="k-prompt small">Which picture matches?</p><div class="k-choices layout-scenes2" style="--cols:1" hidden>${it.choices.map((c, i) => `<button class="k-choice" data-i="${i}" aria-label="picture ${i + 1}">${scene(c.scene.bg, c.scene.props)}</button>`).join('')}</div>` : ''}`);
    bindSay(it.say); auto(it.say); bindTokens();
    const a = document.querySelector('#k-actions');
    a.innerHTML = `<button class="button full" id="k-didread">${icon('check')} I read it!</button>`;
    document.querySelector('#k-didread').addEventListener('click', () => {
      talk(it.text);
      if (!it.choices) { feedback(praise(), 'good'); nextButton(); return; }
      a.innerHTML = ''; const box = document.querySelector('.k-choices'); box.hidden = false; box.scrollIntoView({behavior: 'smooth', block: 'nearest'});
      let solved = false;
      box.querySelectorAll('.k-choice').forEach(b => b.addEventListener('click', () => {
        if (solved) return; const c = it.choices[Number(b.dataset.i)];
        if (c.v === it.answer) { solved = true; b.classList.add('correct'); feedback(it.right, 'good'); talk(praise()); nextButton(); }
        else { run.misses++; b.classList.add('retry'); b.disabled = true; feedback('Read it again and look closely.', 'try'); talk('Read it again and look closely.'); }
      }));
    });
  }

  /* build a word with tiles */
  function itemBuild(it) {
    const slots = it.slots.map((s, i) => `<span class="k-slot ${s.silent ? 'silent' : ''}" data-s="${i}">${s.silent ? '<small>quiet e</small>' : ''}</span>`).join('');
    stationFrame(`<p class="k-prompt">Build the word. Say it slowly, one sound at a time.</p>
      <div class="k-buildtop">${it.i ? pic(it.i, 'k-bpic', it.w) : ''}<button class="k-bigear" id="k-hear">${pic('ear')}<span>Hear it</span></button></div>
      <div class="k-slots">${slots}</div>
      <div class="k-bank">${it.bank.map((t, i) => `<button class="k-btile" data-b="${i}">${esc(t)}</button>`).join('')}</div>`);
    bindSay(it.say); auto(it.say);
    document.querySelector('#k-hear').addEventListener('click', () => talk(it.w));
    let pos = 0, tries = 0;
    document.querySelectorAll('.k-btile').forEach(b => b.addEventListener('click', () => {
      if (pos >= it.slots.length) return;
      const want = it.slots[pos].t;
      if (b.textContent === want) {
        const slot = document.querySelector(`.k-slot[data-s="${pos}"]`); slot.textContent = want; slot.classList.add('filled');
        b.disabled = true; b.classList.add('used'); pos++; tries = 0;
        if (pos >= it.slots.length) { feedback(it.right, 'good'); talk(`${it.w}! ${praise()}`); sparkle(document.querySelector('.k-slots')); nextButton(); }
      } else {
        tries++; run.misses++; b.classList.add('shake'); setTimeout(() => b.classList.remove('shake'), 500);
        const msg = it.slots[pos].silent ? 'Almost! Add the quiet e at the end.' : `Listen: ${it.w}. What comes next?`;
        feedback(msg, 'try'); talk(msg);
        if (tries >= 2) [...document.querySelectorAll('.k-btile')].find(x => !x.disabled && x.textContent === want)?.classList.add('hint');
      }
    }));
  }

  /* heart words */
  function heartWordHtml(w, tricky) {
    const [a, b] = tricky || [0, 0];
    return `<span class="k-hword">${[...w].map((ch, i) => `<span class="${i >= a && i < b ? 'tricky' : ''}">${i === a && b > a ? '<i class="k-hmark">♥</i>' : ''}${esc(ch)}</span>`).join('')}</span>`;
  }
  function itemHeartIntro(it) {
    stationFrame(`<p class="k-prompt">A new heart word!</p><div class="k-heartcard">${heartWordHtml(it.w, it.tricky)}</div>
      <p class="tiny-caption">The red part is tricky. Learn it by heart: say it, spell it, say it again.</p>
      <div class="k-two"><button class="button secondary" id="k-spell">${icon('sound')} Spell it with me</button></div>`);
    bindSay(it.say); auto(it.say);
    document.querySelector('#k-spell').addEventListener('click', () => talk(`${it.w}. ${[...it.w].map(c => c.toUpperCase()).join('. ')}. ${it.w}!`));
    nextButton('Got it!');
  }

  /* story time */
  function itemStory(it) {
    let page = 0;
    const draw = () => {
      const p = it.pages[page];
      stationFrame(`<p class="k-prompt">${esc(it.title)} · page ${page + 1} of ${it.pages.length}</p>
        <div class="k-storypage">${scene(p.bg, p.props, 'k-storyscene')}${tokenHtml(p.tokens)}</div>
        <div class="k-two"><button class="button secondary" id="k-readme">${icon('sound')} Read to me</button></div>`, {showSay: false});
      bindTokens();
      document.querySelector('#k-readme').addEventListener('click', () => talk(p.t));
      const a = document.querySelector('#k-actions');
      a.innerHTML = `<div class="k-two">${page > 0 ? `<button class="button secondary" id="k-prev">${icon('back')} Back</button>` : ''}<button class="button" id="k-pnext">${page + 1 < it.pages.length ? 'Next page' : 'The end!'} ${icon('arrow')}</button></div>`;
      document.querySelector('#k-prev')?.addEventListener('click', () => { page--; stopVoice(); draw(); });
      document.querySelector('#k-pnext').addEventListener('click', () => { stopVoice(); if (page + 1 < it.pages.length) { page++; draw(); } else { talk('The end! You read the whole story!'); advance(); } });
    };
    draw(); auto(`${it.title}. You read first. Tap Read to me to check.`);
  }

  /* talk time: say it with a grown-up judge */
  function hlWord(w, h, pos) {
    if (!h) return esc(w);
    let i = pos === 'End' ? w.lastIndexOf(h) : pos && pos.startsWith('Middle') ? w.indexOf(h, 1) : w.indexOf(h);
    if (i < 0) i = w.indexOf(h);
    if (i < 0) return esc(w);
    return `${esc(w.slice(0, i))}<b>${esc(w.slice(i, i + h.length))}</b>${esc(w.slice(i + h.length))}`;
  }
  function itemSay(it) {
    const mouth = it.mouth ? data.mouthSvg[it.mouth] : '';
    const hl = hlWord(it.w, it.h, it.pos);
    const tally = run.speech[it.deck || 'clear'] || (run.speech[it.deck || 'clear'] = {c: 0, t: 0});
    stationFrame(`<p class="k-prompt">Say it clearly! <span class="k-deck">${esc(it.deckName)}</span></p>
      <button class="k-saycard" id="k-sayword">${pic(it.i, 'k-saypic', it.w)}<span class="k-sayw">${hl}</span></button>
      ${mouth ? `<details class="k-grownup"><summary>Grown-up: mouth tip</summary><div class="k-mouthrow"><div class="k-mouth">${mouth}</div><p>${esc(it.cue)}</p></div></details>` : `<p class="tiny-caption">${esc(it.cue)}</p>`}
      <p class="tiny-caption">Grown-up: tap after she says it. Clear so far: <span id="k-tally"><b>${tally.c}</b> of <b>${tally.t}</b></span></p>`);
    bindSay(it.w);
    document.querySelector('#k-sayword').addEventListener('click', () => talk(it.w));
    const a = document.querySelector('#k-actions');
    a.innerHTML = `<div class="k-two"><button class="button k-notyet" id="k-notyet">↻ Not yet</button><button class="button k-clear" id="k-clear">${icon('check')} Clear!</button></div>`;
    const count = () => { const el = document.querySelector('#k-tally'); if (el) el.innerHTML = `<b>${tally.c}</b> of <b>${tally.t}</b>`; };
    const mark = ok => { tally.t++; if (ok) tally.c++; count(); if (ok) { sparkle(document.querySelector('#k-sayword')); talk(praise()); setTimeout(advance, 700); } else talk(`Listen: ${it.w}. Your turn!`); };
    document.querySelector('#k-clear').addEventListener('click', () => mark(true));
    document.querySelector('#k-notyet').addEventListener('click', () => {
      mark(false); feedback('Try once more, or tap Next word.', 'try');
      a.innerHTML = `<div class="k-two"><button class="button k-notyet" id="k-notyet2">↻ Not yet</button><button class="button k-clear" id="k-clear2">${icon('check')} Clear!</button></div><button class="quiet-help" id="k-skip">Next word</button>`;
      document.querySelector('#k-clear2').addEventListener('click', () => mark(true));
      document.querySelector('#k-notyet2').addEventListener('click', () => { tally.t++; count(); advance(); });
      document.querySelector('#k-skip').addEventListener('click', advance);
      document.querySelector('#k-clear2').focus({preventScroll: true}); });
  }

  /* ------------------------------------------------------------ finishing */
  function finishStation() {
    const s = run.station;
    // Save speech tallies.
    for (const [k, v] of Object.entries(run.speech)) if (v.t) st = logSpeech(st, {k: k === 'clear' ? 'clear' : k, c: v.c, t: v.t});
    const firstTime = !doneStations(st, plan.week, plan.day).includes(s.id);
    st = completeStation(st, plan.week, plan.day, s.id);
    let dayDone = false;
    if (isDayDone(st, plan) && !st.stickers[dayKey(plan.week, plan.day)]) { st = awardSticker(st, plan.week, plan.day, plan.unit); dayDone = true; }
    persist();
    adv?.stationDone(s.id, firstTime);
    const speechLine = Object.entries(run.speech).filter(([, v]) => v.t).map(([k, v]) => `${k === 'clear' ? 'Clear words' : (data.speech.decks.find(d => d.k === k)?.name || k) + ' sound'}: ${v.c} of ${v.t}`).join(' · ');
    ctx.frame(`<section class="k-finish" style="--sc:${s.color}"><div class="k-burst">${pic('glowing-star', 'k-burst-star')}</div><h1>${esc(praise())}</h1><p>You finished <b>${esc(s.title)}</b>!</p>
      ${speechLine ? `<p class="k-speechsum">${esc(speechLine)}</p>` : ''}
      <button class="button full" id="k-back-map">${dayDone ? 'Get my sticker!' : (adv && adv.enabled() ? 'Back to the map' : 'Back to my path')} ${icon('arrow')}</button></section>`, false);
    talk(`${praise()} You finished ${s.title}!`);
    document.querySelector('#k-back-map').addEventListener('click', () => {
      if (dayDone) { ctx.navigate('k36done'); return; }
      const breaks = st.settings.breaks; const count = doneStations(st, plan.week, plan.day).length;
      if (breaks && count % 2 === 0 && count !== lastBreak) { lastBreak = count; ctx.navigate('k36'); setTimeout(swimBreak, 200); return; }
      ctx.navigate('k36');
    });
  }
  function renderDayDone() {
    const p = plan || currentPlan(); const key = dayKey(p.week, p.day); const sticker = st.stickers[key] || stickerFor(p.week, p.day, p.unit);
    const medal = p.kind === 'review' && p.day === DAYS; const u = unitOf(p.week);
    ctx.frame(`<section class="k-finish k-daydone"><div class="k-confetti" aria-hidden="true">${Array.from({length: 24}, (_, i) => `<i style="--i:${i}"></i>`).join('')}</div>
      <p class="eyebrow">Week ${p.week} · Day ${p.day}</p><h1>Day ${p.day} is done!</h1>
      <div class="k-sticker-reveal">${pic(sticker, 'k-sticker-big')}</div><p>You earned a new sticker!</p>
      ${medal ? `<div class="k-medal" style="--uc:${u.color}">${pic(u.icon)}<span>${esc(u.name)} Champion!</span></div>` : ''}
      <div class="k-two"><button class="button secondary" id="k-see-book">${pic('sparkles', 'k-btn-pic')} Sticker book</button><button class="button" id="k-done-map">${adv && adv.enabled() ? 'Back to the map' : 'My path'} ${icon('arrow')}</button></div>
      <p class="grownup-note">Grown-up: add a sticker to the paper sticker chart too. Next time: Week ${nextDay(p.week, p.day).week}, Day ${nextDay(p.week, p.day).day}.</p></section>`, false);
    talk(`Hooray ${ctx.name}! Day ${p.day} is done! You earned a new sticker!${medal ? ` And a ${u.name} medal!` : ''}`);
    document.querySelector('#k-see-book').addEventListener('click', () => ctx.navigate('k36stickers'));
    document.querySelector('#k-done-map').addEventListener('click', () => ctx.navigate('k36'));
  }
  function renderStickers() {
    const units = Object.entries(data.units);
    const html = units.map(([u, info]) => {
      const weeks = data.weeks.filter(w => String(w.u) === u);
      const rows = weeks.map(w => `<div class="k-srow"><span class="k-swk">Wk ${w.n}</span>${Array.from({length: DAYS}, (_, i) => { const s = st.stickers[dayKey(w.n, i + 1)]; return `<span class="k-slotst ${s ? 'got' : ''}">${s ? pic(s) : ''}</span>`; }).join('')}</div>`).join('');
      return `<section class="k-sunit" style="--uc:${info.color}"><h2>${pic(info.icon, 'k-sunit-icon')}${esc(info.name)}</h2>${rows}</section>`;
    }).join('');
    ctx.frame(`<div class="k-stickerbook"><h1>My sticker book</h1><p class="tiny-caption">${Object.keys(st.stickers).length} stickers. One for every finished day!</p>${html}</div>`);
    talk(`Your sticker book! You have ${Object.keys(st.stickers).length} stickers.`);
  }
  function swimBreak() {
    const m = MOVES[Math.floor(Math.random() * MOVES.length)];
    const d = document.createElement('div'); d.className = 'k-break'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-label', 'Swim break');
    d.innerHTML = `<div class="k-break-card"><p class="eyebrow">Swim break!</p>${pic(m[0], 'k-break-pic')}<h2>${esc(m[1])}</h2><p>${esc(m[2])}</p><div class="k-timer"><span id="k-secs">20</span></div><button class="button full" id="k-break-done">All done!</button></div>`;
    document.body.append(d);
    talk(`Swim break! ${m[1]}. ${m[2]}`);
    let secs = 20; const t = setInterval(() => { secs--; const el = d.querySelector('#k-secs'); if (el) el.textContent = Math.max(0, secs); if (secs <= 0) { clearInterval(t); talk('Great moving! Back to learning.'); } }, 1000);
    d.querySelector('#k-break-done').addEventListener('click', () => { clearInterval(t); stopVoice(); d.remove(); });
  }

  /* ------------------------------------------------------------ parent section */
  function parentSection(container) {
    const weekOpts = data.weeks.map(w => `<option value="${w.n}" ${w.n === st.week ? 'selected' : ''}>Week ${w.n} · ${esc(w.title)}</option>`).join('');
    const decks = data.speech.decks.map(d => `<label class="k-check"><input type="checkbox" value="${d.k}" ${st.speech.targets.includes(d.k) ? 'checked' : ''}> ${esc(d.name)}</label>`).join('');
    const sum = speechSummary(st, 14);
    const sumRows = sum.length ? `<table class="k-sumtable"><tr><th>Sound</th><th>Clear</th><th>%</th><th>Last</th></tr>${sum.map(s => `<tr><td>${esc(s.k === 'clear' ? 'Clear words' : (data.speech.decks.find(d => d.k === s.k)?.name || s.k))}</td><td>${s.c} / ${s.t}</td><td>${s.pct}%</td><td>${esc(s.last.slice(5))}</td></tr>`).join('')}</table>` : '<p>No speech practice logged in the last two weeks.</p>';
    container.innerHTML = `<h3>Kindergarten adventure (36 weeks)</h3>
      <label for="k-pweek">Week</label><select id="k-pweek">${weekOpts}</select>
      <div class="parent-days" id="k-pdays"></div>
      <p>Match the app to her printed packet: Week and Day are printed on every page. Tap a day to open it.</p>
      <h3 style="margin-top:14px">Speech practice sounds</h3>
      <p>Choose up to 4 sounds from her Sound Check or speech therapist. Talk Time uses these cards and listening pairs.</p>
      <div class="k-checks" id="k-targets">${decks}</div>
      <h3 style="margin-top:14px">Speech tallies · last 14 days</h3>${sumRows}
      <p class="tiny-caption">Copy these into the Progress Book speech graph. 8 of 10 clear (80%) means move up a step.</p>
      <label class="toggle-line" for="k-breaks">Swim breaks between games<input id="k-breaks" type="checkbox" ${st.settings.breaks ? 'checked' : ''}></label>
      ${adv ? adv.parentHtml() : ''}`;
    if (adv) adv.bindParent(container);
    const days = () => {
      const w = Number(container.querySelector('#k-pweek').value);
      container.querySelector('#k-pdays').innerHTML = Array.from({length: DAYS}, (_, i) => { const d = i + 1; const done = !!st.stickers[dayKey(w, d)]; const cur = w === st.week && d === st.day; return `<button class="parent-day ${cur ? 'current' : ''} ${done ? 'done' : ''}" data-kday="${d}" aria-label="Open day ${d}${done ? ', done' : ''}">${done ? '✓ ' : ''}${d}</button>`; }).join('');
      container.querySelectorAll('[data-kday]').forEach(b => b.addEventListener('click', () => { st = goToDay(st, w, Number(b.dataset.kday)); persist(); ctx.closeParents(); ctx.navigate('k36'); }));
    };
    days(); container.querySelector('#k-pweek').onchange = days;
    container.querySelectorAll('#k-targets input').forEach(cb => cb.addEventListener('change', () => {
      const chosen = [...container.querySelectorAll('#k-targets input:checked')].map(x => x.value);
      if (chosen.length > 4) { cb.checked = false; toast('Choose up to 4 sounds at a time.'); return; }
      st = normalizeK36({...st, speech: {...st.speech, targets: chosen}}); persist(); plan = null;
    }));
    container.querySelector('#k-breaks').onchange = e => { st = normalizeK36({...st, settings: {...st.settings, breaks: e.target.checked}}); persist(); };
  }

  return {
    get state() { return st; },
    setState(next) { st = normalizeK36(next); persist(); plan = null; },
    reset() { st = defaultK36(); persist(); plan = null; adv?.setState(null); },
    hasProgress() { return Object.keys(st.days).length > 0; },
    renderMap, startStation, renderDayDone, renderStickers, parentSection, swimBreak,
    renderBattle() { if (adv) adv.renderBattle(); else ctx.navigate('k36', undefined, true); },
    get mfState() { return adv ? adv.state : undefined; },
    setMFState(next) { adv?.setState(next); },
    adventure: () => adv,
    stopRun() { run = null; }
  };
}
