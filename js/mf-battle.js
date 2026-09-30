/**
 * Meteor Falls learning battles. EarthBound-style: a swirling background, a Hush-touched critter,
 * and the team from behind. Every attack is a learning question from this week (plus review).
 * A right answer lands a hit; a wrong one just makes the critter dodge, so she can never lose.
 * When the Hush meter is empty the critter is happy again and joins her friend album.
 */
import {loadImage} from './mf-world.js';

const THEMES = {
  meadow: [['#ffafcc', '#ffc8dd', '#cdb4db'], ['#a2d2ff', '#bde0fe', '#ffffff']],
  park: [['#ffb703', '#fb8500', '#ffd6a5'], ['#8ecae6', '#219ebc', '#ffffff']],
  sea: [['#48cae4', '#00b4d8', '#90e0ef'], ['#caf0f8', '#0077b6', '#ffffff']],
  court: [['#c7f464', '#4ecdc4', '#f7fff7'], ['#ffe66d', '#ff6b6b', '#ffffff']],
  garden: [['#ff595e', '#ffca3a', '#8ac926'], ['#1982c4', '#6a4c93', '#ffffff']],
  space: [['#3c096c', '#7b2cbf', '#e0aaff'], ['#10002b', '#ff9e00', '#ffffff']],
  boss: [['#7209b7', '#3a0ca3', '#f72585'], ['#4361ee', '#4cc9f0', '#ffffff']]
};
const HIT_WORDS = ['SMAAASH!', 'BONK!', 'POW!', 'WHAM!', 'ZAP!', 'BOOM!'];

export function createBattle(o) {
  const {root, mf, base, critter, items, heroes} = o;
  const art = mf.art; const cm = art.critters[critter.id];
  const partyIds = o.party.slice(0, 4);
  const hpMax = items.length; let hp = hpMax;
  const theme = THEMES[critter.boss ? 'boss' : (o.theme || 'meadow')] || THEMES.meadow;
  root.innerHTML = `<section class="mf-battle ${critter.boss ? 'boss' : ''}">
    <div class="mf-stage"><canvas class="mf-bcanvas" aria-hidden="true"></canvas>
      <div class="mf-etag"><b>${o.esc(cm.name)}</b><span class="mf-hush" aria-label="Hush meter">${Array.from({length: hpMax}, () => '<i></i>').join('')}</span></div>
      <button class="mf-run" type="button">Run</button></div>
    <div class="mf-btext" aria-live="polite"></div>
    <div class="mf-party ${partyIds.length > 3 ? 'many' : ''}">${partyIds.map(id => `<div class="mf-pbox" data-hero="${id}"><img src="${base}${art.busts[id]}.webp" alt=""><div><b>${o.esc(heroes[id].name)}</b><small>Lv <span class="mf-lv">${o.level}</span></small></div><span class="mf-odo" aria-label="Vibe">000</span></div>`).join('')}</div>
    <div class="mf-vibe"><span>Vibe</span><i><b></b></i><em></em></div>
    <div class="mf-q" id="mf-q"></div></section>`;
  const canvas = root.querySelector('canvas'); const g = canvas.getContext('2d');
  const textEl = root.querySelector('.mf-btext'); const qEl = root.querySelector('#mf-q');
  const hushEls = [...root.querySelectorAll('.mf-hush i')];
  const vibeBar = root.querySelector('.mf-vibe b'); const vibeLabel = root.querySelector('.mf-vibe em');
  let alive = true, raf = 0, t0 = performance.now(), cssW = 0, cssH = 0, dpr = 1;
  let turn = 0, combo = 0, qi = 0, firstTries = 0, busy = false;
  const answers = [];
  const img = {};
  const enemy = {x: 0.5, y: 0.47, shake: 0, flash: 0, dodge: 0, happy: 0, scale: 1, enter: 0};
  const hero = {id: partyIds[0], anim: null, slide: 1};
  const pops = [];            // floating text and effects
  const vibe = {n: 0};

  /* ---------------------------------------------------------------- assets */
  const want = [cm.img, 'fx', ...partyIds.map(id => art.battlers[id]?.img || art.heroes[id].img)];
  const ready = Promise.all(want.map(async k => { img[k] = await loadImage(`${base}${k}.webp`); }));

  /* ---------------------------------------------------------------- swirling background */
  const pat = document.createElement('canvas'); pat.width = 96; pat.height = 96;
  (function paint() {
    const p = pat.getContext('2d'); const [a, b, c] = theme[0];
    p.fillStyle = a; p.fillRect(0, 0, 96, 96);
    for (let i = 0; i < 6; i++) { p.fillStyle = i % 2 ? b : c; p.beginPath(); p.moveTo(48, 48 - (48 - i * 8)); p.lineTo(48 + (48 - i * 8), 48); p.lineTo(48, 48 + (48 - i * 8)); p.lineTo(48 - (48 - i * 8), 48); p.closePath(); p.fill(); }
  })();
  const pat2 = document.createElement('canvas'); pat2.width = 64; pat2.height = 64;
  (function paint2() {
    const p = pat2.getContext('2d'); const [a, b, c] = theme[1];
    p.fillStyle = a; p.fillRect(0, 0, 64, 64); p.fillStyle = b;
    for (let y = 0; y < 64; y += 16) p.fillRect(0, y, 64, 8);
    p.fillStyle = c; p.globalAlpha = 0.6; p.beginPath(); p.arc(32, 32, 10, 0, Math.PI * 2); p.fill();
  })();
  let strip = null, strip2 = null;
  function makeStrip(src, w) {
    const c = document.createElement('canvas'); c.width = w + src.width * 2; c.height = src.height;
    const x = c.getContext('2d'); for (let i = 0; i < c.width; i += src.width) x.drawImage(src, i, 0); return c;
  }
  function background(t) {
    const W = canvas.width, H = canvas.height; const band = Math.max(2, Math.round(3 * dpr));
    if (!strip || strip.width < W + 192) { strip = makeStrip(pat, W); strip2 = makeStrip(pat2, W); }
    for (let y = 0; y < H; y += band) {
      const off1 = (Math.sin(y * 0.021 + t * 1.7) * 22 + t * 18) * dpr; const row1 = ((y + t * 20 * dpr) % pat.height + pat.height) % pat.height;
      g.globalAlpha = 1; g.drawImage(strip, ((off1 % pat.width) + pat.width) % pat.width, row1, W, 1, 0, y, W, band);
      const off2 = (Math.sin(y * 0.035 - t * 2.3) * 30 - t * 12) * dpr; const row2 = ((y * 0.7 - t * 14 * dpr) % pat2.height + pat2.height) % pat2.height;
      g.globalAlpha = 0.45; g.drawImage(strip2, ((off2 % pat2.width) + pat2.width) % pat2.width, row2, W, 1, 0, y, W, band);
    }
    g.globalAlpha = 1;
  }

  /* ---------------------------------------------------------------- drawing */
  function resize() {
    const r = canvas.getBoundingClientRect(); cssW = Math.max(200, r.width); cssH = Math.max(160, r.height);
    dpr = Math.min(2, window.devicePixelRatio || 1); canvas.width = Math.round(cssW * dpr); canvas.height = Math.round(cssH * dpr); strip = null;
  }
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null; ro?.observe(canvas);
  function fx(name, x, y, size, alpha = 1, rot = 0) {
    const r = art.fx[name]; const im = img.fx; if (!r || !im) return;
    g.save(); g.globalAlpha = alpha; g.translate(x, y); g.rotate(rot); g.drawImage(im, r[0], r[1], r[2], r[3], -size / 2, -size / 2, size, size); g.restore();
  }
  function drawEnemy(t) {
    const im = img[cm.img]; if (!im) return;
    const k = dpr; const maxH = cssH * (critter.boss ? 0.7 : 0.6) * k, maxW = cssW * 0.58 * k;
    const sc = Math.min(maxW / cm.w, maxH / cm.h) * (enemy.enter < 1 ? enemy.enter : 1) * enemy.scale;
    const w = cm.w * sc, h = cm.h * sc;
    const breathe = 1 + Math.sin(t * 2.2) * 0.025;
    const cx = cssW * enemy.x * k + Math.sin(enemy.shake * 40) * enemy.shake * 18 * k + enemy.dodge * cssW * 0.3 * k;
    const bottom = cssH * 0.76 * k - enemy.happy * Math.abs(Math.sin(t * 6)) * 18 * k;
    g.save(); g.imageSmoothingEnabled = !cm.pixel;
    g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(cx, cssH * 0.77 * k, w * 0.38, h * 0.06, 0, 0, Math.PI * 2); g.fill();
    g.translate(cx, bottom); g.scale(1 / breathe, breathe);
    if (enemy.happy) g.filter = `saturate(${1 + enemy.happy * 0.5}) brightness(${1 + enemy.happy * 0.15})`;
    g.drawImage(im, -w / 2, -h, w, h);
    if (enemy.flash > 0) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = enemy.flash; g.drawImage(im, -w / 2, -h, w, h); }
    g.restore();
    enemy.box = {cx: cx / k, top: (bottom - h) / k, h: h / k, w: w / k};
  }
  function drawHero(t) {
    const id = hero.id; const b = art.battlers[id]; const k = dpr;
    const a = hero.anim; let frame = Math.floor(t * 4) % 4; let lunge = 0;
    if (a && a.hold) { frame = a.special ? 8 + Math.floor(t * 6) % 2 : 4; lunge = -0.02 + Math.sin(t * 20) * 0.004; }
    else if (a) {
      const e = (performance.now() - a.start) / 1000;
      const seq = a.special ? [9, 4, 5, 6, 7] : [5, 6, 7]; const fps = a.special ? 9 : 10;
      const i = Math.min(seq.length - 1, Math.floor(e * fps)); frame = seq[i];
      lunge = Math.sin(Math.min(1, e * fps / seq.length) * Math.PI) * 0.12;
    }
    const x = cssW * (0.2 + lunge) * k + (1 - hero.slide) * -cssW * 0.4 * k; const y = cssH * 1.0 * k;
    if (b && img[b.img]) {
      const hgt = cssH * 0.6 * k; const sc = hgt / b.fh; const w = b.fw * sc;
      g.drawImage(img[b.img], (frame % b.cols) * b.fw, Math.floor(frame / b.cols) * b.fh, b.fw, b.fh, x - w / 2, y - hgt + 6 * k, w, hgt);
    } else {
      // no battle art (Ana): her walking sprite from behind, bouncing into the attack
      const m = art.heroes[id]; const hgt = cssH * 0.5 * k; const sc = hgt / m.fh; const w = m.fw * sc;
      const fr = 12 + (a ? Math.floor(t * 12) % 4 : 0); const hop = a ? Math.abs(Math.sin(t * 10)) * 14 * k : 0;
      g.drawImage(img[m.img], (fr % m.cols) * m.fw, Math.floor(fr / m.cols) * m.fh, m.fw, m.fh, x - w / 2, y - hgt - hop, w, hgt);
    }
  }
  function drawPops(t) {
    const now = performance.now();
    for (let i = pops.length - 1; i >= 0; i--) {
      const p = pops[i]; const e = (now - p.start) / p.ms; if (e >= 1) { pops.splice(i, 1); continue; }
      const k = dpr;
      if (p.fx) fx(p.fx, p.x * k, (p.y - e * (p.rise || 0)) * k, p.size * k * (0.7 + e * 0.5), 1 - e * e, p.spin ? e * 3 : 0);
      if (p.text) {
        g.save(); g.font = `800 ${p.size * k}px system-ui, sans-serif`; g.textAlign = 'center'; g.lineWidth = 5 * k; g.strokeStyle = '#1b1035'; g.fillStyle = p.color || '#fff';
        g.globalAlpha = 1 - Math.max(0, e - 0.6) / 0.4; const y = (p.y - e * 30) * k; g.strokeText(p.text, p.x * k, y); g.fillText(p.text, p.x * k, y); g.restore();
      }
    }
  }
  function frame() {
    if (!alive) return;
    const t = (performance.now() - t0) / 1000;
    enemy.shake = Math.max(0, enemy.shake - 0.035); enemy.flash = Math.max(0, enemy.flash - 0.06);
    enemy.dodge += (0 - enemy.dodge) * 0.12; enemy.enter = Math.min(1, enemy.enter + 0.05);
    hero.slide = Math.min(1, hero.slide + 0.08);
    background(t); drawEnemy(t); drawHero(t); drawPops(t);
    raf = requestAnimationFrame(frame);
  }

  /* ---------------------------------------------------------------- text box and meters */
  function say(text, speak = false) { textEl.textContent = text; textEl.classList.remove('pop'); void textEl.offsetWidth; textEl.classList.add('pop'); if (speak) o.say(text); }
  function setHush() { hushEls.forEach((el, i) => el.classList.toggle('gone', i >= hp)); }
  function rollOdo(id, to) {
    const el = root.querySelector(`.mf-pbox[data-hero="${id}"] .mf-odo`); if (!el) return;
    const from = Number(el.textContent) || 0; const start = performance.now();
    const step = () => { const e = Math.min(1, (performance.now() - start) / 700); el.textContent = String(Math.round(from + (to - from) * e)).padStart(3, '0'); if (e < 1 && alive) requestAnimationFrame(step); };
    step();
  }
  function setVibe() {
    const full = combo >= 3; vibeBar.style.width = `${Math.min(3, combo) / 3 * 100}%`;
    vibeLabel.textContent = full ? `${heroes[hero.id].special} ready!` : '';
    root.querySelector('.mf-vibe').classList.toggle('full', full);
  }
  function markTurn() { root.querySelectorAll('.mf-pbox').forEach(b => b.classList.toggle('turn', b.dataset.hero === hero.id)); }

  /* ---------------------------------------------------------------- the fight */
  let introText = null;
  const speaking = () => document.body.classList.contains('buddy-speaking');
  function afterSpeech(fn, min = 0, max = 4500) {
    const start = performance.now();
    const check = () => { if (!alive) return; const e = performance.now() - start; if (e >= max || (e >= min && !speaking())) fn(); else setTimeout(check, 120); };
    setTimeout(check, Math.min(min, 150));
  }
  function ask() {
    if (!alive) return;
    busy = false;
    const it = items[qi];
    hero.id = partyIds[turn % partyIds.length]; hero.slide = 0; markTurn();
    say(`${heroes[hero.id].name}’s turn! Answer to attack!`);
    o.play(it, qEl, {onSolved: first => attack(first), onMiss: () => dodge(), intro: introText});
    introText = null;
    // short screens: bring the answer buttons into view without hiding more of the fight than needed
    const answersEl = qEl.querySelector('.k-choices, .k-actions');
    if (answersEl && answersEl.getBoundingClientRect().bottom > window.innerHeight) answersEl.scrollIntoView({block: 'nearest', behavior: 'smooth'});
  }
  function dodge() {
    enemy.dodge = Math.random() < 0.5 ? -1 : 1; o.sfx('whoosh');
    say(`${cm.name} dodged! Try again!`);
    pops.push({text: 'MISS', x: cssW * 0.5, y: cssH * 0.3, size: 22, color: '#ffe066', start: performance.now(), ms: 900});
  }
  const BOSS_MOVES = ['did a big stretch! Nothing happened.', 'tried to look scary! Nobody was scared.', 'sneezed! Ah-choo!', 'did a silly wiggle dance!', 'yawned a great big yawn.', 'rolled around and missed!'];
  /* After a right answer: a quick TAP! chance for a critical hit (just for fun, no penalty), then the hit. */
  function attack(first) {
    if (busy) return; busy = true;
    answers.push({item: items[qi], first});
    if (first) { firstTries++; combo++; } else combo = 0;
    const special = combo > 3 || (first && combo === 3 && qi === items.length - 1);
    const h = heroes[hero.id];
    hero.anim = {hold: true, special};
    say(special ? `${h.name} used ${h.special}!` : `${h.name} tried the ${h.move}! Tap to power up!`);
    if (special) { o.sfx('special'); pops.push({fx: h.fx, x: cssW * 0.5, y: cssH * 0.38, size: 150, start: performance.now(), ms: 1100, spin: true}); combo = 0; }
    let landed = false;
    const tapBtn = document.createElement('button'); tapBtn.type = 'button'; tapBtn.className = 'mf-tap'; tapBtn.innerHTML = '<span>TAP!</span>';
    tapBtn.setAttribute('aria-label', 'Tap for a power hit');
    root.querySelector('.mf-stage').append(tapBtn);
    const land = crit => {
      if (landed || !alive) return; landed = true; tapBtn.remove();
      hero.anim = {start: performance.now(), special};
      setTimeout(() => impact(crit), 160);
    };
    tapBtn.addEventListener('click', e => { e.stopPropagation(); o.sfx('select'); land(true); });
    setTimeout(() => land(false), special ? 1400 : 1150);
    function impact(crit) {
      if (!alive) return;
      const big = special || crit;
      const dmg = special ? 40 + Math.floor(Math.random() * 20) : (8 + Math.floor(Math.random() * 9) + (first ? 4 : 0)) * (crit ? 2 : 1);
      o.sfx(big ? 'smash' : (h.fx === 'volt' ? 'zap' : 'hit'));
      enemy.flash = 1; enemy.shake = big ? 1.4 : 1; hp = Math.max(0, hp - 1); setHush();
      const bx = enemy.box?.cx || cssW * 0.5, by = (enemy.box?.top || cssH * 0.3) + (enemy.box?.h || 80) * 0.55;
      pops.push({fx: special ? h.fx : 'smash', x: bx, y: by, size: big ? 124 : 84, start: performance.now(), ms: 650});
      const word = special ? h.hit : crit ? 'CRITICAL!' : (first ? h.hit : HIT_WORDS[qi % HIT_WORDS.length]);
      pops.push({text: `${word} ${dmg}`, x: bx, y: by - 4, size: big ? 30 : 24, color: big ? '#ffd43b' : '#fff', start: performance.now(), ms: 1300});
      if (crit) { say(`SMAAAASH!! A critical hit!`); root.querySelector('.mf-stage').classList.add('quake'); setTimeout(() => root.querySelector('.mf-stage')?.classList.remove('quake'), 400); }
      vibe.n += dmg; partyIds.forEach(id => rollOdo(id, Math.min(999, vibe.n)));
      setVibe();
      setTimeout(() => {
        if (!alive) return;
        hero.anim = null; turn++; qi++;
        const done = hp <= 0 || qi >= items.length;
        if (!done && critter.boss) {
          // the boss takes a harmless, silly turn
          say(`${cm.name} ${BOSS_MOVES[(qi + turn) % BOSS_MOVES.length]}`);
          enemy.scale = 1.12; enemy.shake = 0.6; o.sfx('whoosh');
          root.querySelector('.mf-party')?.classList.add('wobble');
          setTimeout(() => { enemy.scale = 1; root.querySelector('.mf-party')?.classList.remove('wobble'); }, 450);
          setTimeout(() => afterSpeech(ask, 0, 3500), 1100);
        } else afterSpeech(done ? win : ask, 0, 3500);
      }, 900);
    }
  }
  function win() {
    busy = true; qEl.innerHTML = '';
    enemy.happy = 1; o.stopMusic(); o.sfx('win');
    for (let i = 0; i < 10; i++) pops.push({fx: i % 2 ? 'heart' : 'sparkle', x: cssW * (0.3 + Math.random() * 0.4), y: cssH * (0.25 + Math.random() * 0.3), size: 34, start: performance.now() + i * 90, ms: 1400, rise: 40});
    const line = critter.boss ? `The Hush is gone! ${cm.name} is happy again! You found an Ember!` : `The Hush floated away! ${cm.name} is happy again!`;
    say(line, true);
    setTimeout(() => { if (alive) o.onEnd({won: true, answers, firstTries, total: items.length, vibe: vibe.n}); }, 2400);
  }
  root.querySelector('.mf-run').addEventListener('click', () => {
    if (!alive) return;
    o.sfx('whoosh'); say('You ran away! The critter will wait for you.', true);
    busy = true; setTimeout(() => { if (alive) o.onEnd({won: false, answers, firstTries, total: items.length}); }, 900);
  });

  ready.then(() => {
    if (!alive) return;
    resize(); raf = requestAnimationFrame(frame);
    o.music(critter.boss ? 'boss' : 'battle');
    const intro = critter.boss ? `The big ${cm.name} blocks the meteor! Answer questions to chase the Hush away!` : `A grumpy ${cm.name} appeared!`;
    say(intro); introText = intro;
    setHush(); setVibe();
    setTimeout(ask, 1300);
  });
  return {destroy() { alive = false; cancelAnimationFrame(raf); ro?.disconnect(); o.stopMusic(); }};
}
