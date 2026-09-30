/**
 * Meteor Falls world: a small town Ana walks around between learning games.
 * Canvas drawing, tap-to-walk with pathfinding, a following party, friends to talk to,
 * roaming Hush critters, glowing letter stones and word signs. No game logic lives here:
 * everything the child does is reported through callbacks.
 */
import {findPath, nearestOpen, blockedFn} from './mf-core.js';

const T = 32;                                   // world units per tile
const SPEED = 150;                              // units per second
const CARD = {down: 0, left: 4, right: 8, up: 12};
const DIAG = {dr: 16, dl: 19, ur: 22, ul: 25};
const imgCache = new Map();
export function loadImage(src) {
  if (!imgCache.has(src)) imgCache.set(src, new Promise(res => { const im = new Image(); im.decoding = 'async'; im.onload = () => res(im); im.onerror = () => res(null); im.src = src; }));
  return imgCache.get(src);
}
export function dirFrom(dx, dy) {
  const a = Math.atan2(dy, dx) * 180 / Math.PI;
  if (a >= -22.5 && a < 22.5) return 'right';
  if (a >= 22.5 && a < 67.5) return 'dr';
  if (a >= 67.5 && a < 112.5) return 'down';
  if (a >= 112.5 && a < 157.5) return 'dl';
  if (a >= 157.5 || a < -157.5) return 'left';
  if (a >= -157.5 && a < -112.5) return 'ul';
  if (a >= -112.5 && a < -67.5) return 'up';
  return 'ur';
}
const cardinalOf = d => ({dr: 'right', ur: 'right', dl: 'left', ul: 'left'})[d] || d;
function heroFrame(dir, walking, t) {
  if (CARD[dir] !== undefined) return CARD[dir] + (walking ? Math.floor(t * 8) % 4 : 0);
  return DIAG[dir] + (walking ? 1 + Math.floor(t * 6) % 2 : 0);
}

export function createWorld(o) {
  const {view, mf, map, base} = o;
  const art = mf.art;
  const blocked = blockedFn(map);
  const W = map.w * T, H = map.h * T;
  view.innerHTML = `<canvas class="mf-canvas" role="img" aria-label="${map.name}. Tap where to walk. Tap a building to go inside."></canvas><div class="mf-bubbles" aria-live="polite"></div><div class="mf-fade"></div>`;
  const canvas = view.querySelector('canvas'); const ctx = canvas.getContext('2d');
  const bubbles = view.querySelector('.mf-bubbles'); const fade = view.querySelector('.mf-fade');
  let cssW = 0, cssH = 0, dpr = 1, s = 1, camY = 0, camTarget = 0, dragging = null, raf = 0, last = 0, clock = 0, alive = true, busy = false;
  const img = {};
  const tileCenter = (c, r) => [(c + 0.5) * T, (r + 0.5) * T + 6];
  const tileOf = (x, y) => [Math.max(0, Math.min(map.w - 1, Math.floor(x / T))), Math.max(0, Math.min(map.h - 1, Math.floor((y - 6) / T)))];

  /* ---------------------------------------------------------------- entities */
  const startXY = o.start && !blocked(...tileOf(o.start[0], o.start[1])) ? o.start : tileCenter(...map.start);
  const hero = {id: o.party[0], x: startXY[0], y: startXY[1], dir: o.startDir || 'down', path: [], walking: false, onArrive: null};
  const trail = [];
  for (let i = 0; i < 80; i++) trail.push([hero.x, hero.y + i * 0.01]);
  const followers = o.party.slice(1).map(id => ({id, x: hero.x, y: hero.y, dir: 'down', walking: false}));
  const glint = {x: hero.x - 30, y: hero.y - 70, t: 0};
  const npcs = map.npcs.filter(n => n.id !== 'glint' && art.npcs[n.id]).map(n => {
    const [x, y] = tileCenter(n.c, n.r); return {id: n.id, x, y, hx: x, hy: y, dir: 'down', walking: false, path: [], next: 2 + Math.random() * 4, talk: 0};
  });
  const critters = (o.critters || []).map(c => { const [x, y] = tileCenter(c.c, c.r); return {...c, x, y, hx: x, hy: y, phase: Math.random() * 6, next: 1 + Math.random() * 3, path: []}; });
  const stones = (o.stones || []).map(st => { const [x, y] = tileCenter(st.c, st.r); return {...st, x, y}; });
  const signs = (o.signs || []).map(sg => ({...sg, prop: map.props.find(p => p.k === 'sign' && Math.floor((p.x - 1) / T) >= sg.c - 1 && Math.floor((p.x - 1) / T) <= sg.c + 1 && Math.round(p.y / T) - 1 === sg.r)}));
  const stations = new Map((o.stations || []).map(st => [st.id, st]));
  const buildings = map.objects.map(b => ({...b, today: b.station && stations.has(b.station)}));
  const statics = [...buildings, ...map.props];
  let target = null;           // tap ring
  let nextStation = o.nextStation || null;

  /* ---------------------------------------------------------------- assets */
  const want = new Set([map.ground, 'fx']);
  for (const b of statics) want.add(art.objects[b.k].img);
  for (const id of o.party) want.add(art.heroes[id].img);
  for (const n of npcs) want.add(art.npcs[n.id].img);
  want.add(art.npcs.glint.img);
  for (const c of critters) want.add(art.critters[c.id].mini);
  const ready = Promise.all([...want].map(async k => { img[k] = await loadImage(`${base}${k}.webp`); }))
    .then(async () => { if (o.icons) for (const st of stations.values()) img['icon:' + st.id] = await o.icons(st.icon); });

  /* ---------------------------------------------------------------- sizing */
  function resize() {
    const r = view.getBoundingClientRect();
    cssW = Math.max(200, Math.round(r.width)); cssH = Math.max(240, Math.round(r.height));
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(cssW * dpr); canvas.height = Math.round(cssH * dpr);
    canvas.style.width = cssW + 'px'; canvas.style.height = cssH + 'px';
    s = cssW / W;
    camTarget = clampCam(hero.y - cssH / s * 0.58); camY = camTarget;
  }
  const clampCam = y => Math.max(0, Math.min(H - cssH / s, y));
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => resize()) : null;
  ro?.observe(view);
  resize();

  /* ---------------------------------------------------------------- movement */
  const trace = (...a) => { if (window.__mfTrace) window.__mfTrace.push(a.join(' ')); };
  function walkTo(c, r, onArrive, {stopShort = false} = {}) {
    const from = tileOf(hero.x, hero.y);
    trace('walkTo', from.join(','), '->', c, r, onArrive ? 'act' : '', busy ? 'BUSY' : '');
    const goal = nearestOpen(blocked, map.w, map.h, c, r) || from;
    const p = findPath(blocked, map.w, map.h, from, goal);
    if (!p) { o.say?.('I can’t get there. Try another spot!'); return false; }
    let pts = p.slice(1).map(([pc, pr]) => tileCenter(pc, pr));
    if (stopShort && pts.length) pts = pts.slice(0, -1);
    hero.path = pts; hero.onArrive = onArrive || null; hero.walking = pts.length > 0;
    if (!pts.length && onArrive) { hero.onArrive = null; onArrive(); }
    target = {x: (goal[0] + 0.5) * T, y: (goal[1] + 0.5) * T + 6, t: 0};
    return true;
  }
  function stepHero(dt) {
    if (!hero.path.length) { if (hero.walking) { hero.walking = false; o.onMove?.(hero.x, hero.y); const f = hero.onArrive; hero.onArrive = null; f?.(); } return; }
    const [tx, ty] = hero.path[0]; const dx = tx - hero.x, dy = ty - hero.y; const d = Math.hypot(dx, dy);
    const step = SPEED * dt;
    if (d > 0.5) hero.dir = dirFrom(dx, dy);
    if (d <= step) { hero.x = tx; hero.y = ty; hero.path.shift(); } else { hero.x += dx / d * step; hero.y += dy / d * step; }
    hero.walking = true;
    const lastT = trail[trail.length - 1];
    if (Math.hypot(hero.x - lastT[0], hero.y - lastT[1]) > 2.5) { trail.push([hero.x, hero.y]); if (trail.length > 200) trail.shift(); }
    // stepping on a letter stone collects it
    for (const st of stones) if (!st.got && Math.hypot(st.x - hero.x, st.y - hero.y) < 14) { st.got = true; st.pop = 0; o.onStone?.(st); }
    // bumping into an awake critter starts a battle
    for (const c of critters) if (c.awake && !c.won && Math.hypot(c.x - hero.x, c.y - hero.y) < 24) { startBattle(c); return; }
  }
  function stepFollowers() {
    followers.forEach((f, i) => {
      const k = Math.max(0, trail.length - 1 - (i + 1) * 11);
      const [x, y] = trail[k]; const dx = x - f.x, dy = y - f.y;
      f.walking = Math.hypot(dx, dy) > 0.3; if (f.walking) f.dir = dirFrom(dx, dy);
      f.x = x; f.y = y;
    });
  }
  function stepNPCs(dt) {
    for (const n of npcs) {
      n.talk = Math.max(0, n.talk - dt);
      const near = Math.hypot(hero.x - n.x, hero.y - n.y) < 80;
      if (n.path.length) {
        const [tx, ty] = n.path[0]; const dx = tx - n.x, dy = ty - n.y, d = Math.hypot(dx, dy), step = (n.id === 'biscuit' ? 70 : 45) * dt;
        if (d > 0.5) n.dir = dirFrom(dx, dy);
        if (d <= step) { n.x = tx; n.y = ty; n.path.shift(); } else { n.x += dx / d * step; n.y += dy / d * step; }
        n.walking = true; continue;
      }
      n.walking = false;
      if (near || n.talk > 0) { n.dir = dirFrom(hero.x - n.x, hero.y - n.y); continue; }
      n.next -= dt;
      if (n.next <= 0) {
        n.next = 3 + Math.random() * 5;
        const [hc, hr] = tileOf(n.hx, n.hy); const range = n.id === 'biscuit' ? 3 : 1;
        const gc = hc + Math.round((Math.random() * 2 - 1) * range), gr = hr + Math.round((Math.random() * 2 - 1) * range);
        const goal = nearestOpen(blocked, map.w, map.h, gc, gr, 1);
        if (goal) { const p = findPath(blocked, map.w, map.h, tileOf(n.x, n.y), goal, 400); if (p) n.path = p.slice(1).map(([c, r]) => tileCenter(c, r)); }
      }
    }
  }
  function stepCritters(dt) {
    for (const c of critters) {
      c.phase += dt;
      if (!c.awake || c.won || c.boss) continue;
      if (c.path.length) {
        const [tx, ty] = c.path[0]; const dx = tx - c.x, dy = ty - c.y, d = Math.hypot(dx, dy), step = 34 * dt;
        if (d <= step) { c.x = tx; c.y = ty; c.path.shift(); } else { c.x += dx / d * step; c.y += dy / d * step; }
        c.flip = dx < 0; continue;
      }
      if (c.frozen || Math.hypot(hero.x - c.x, hero.y - c.y) < 90) continue;      // it noticed her and waits
      c.next -= dt;
      if (c.next <= 0) {
        c.next = 2 + Math.random() * 3;
        const [hc, hr] = tileOf(c.hx, c.hy);
        const goal = nearestOpen(blocked, map.w, map.h, hc + Math.round(Math.random() * 2 - 1), hr + Math.round(Math.random() * 2 - 1), 1);
        if (goal) { const p = findPath(blocked, map.w, map.h, tileOf(c.x, c.y), goal, 200); if (p) c.path = p.slice(1).map(([pc, pr]) => tileCenter(pc, pr)); }
      }
    }
  }

  /* ---------------------------------------------------------------- actions */
  function startBattle(c) {
    trace('startBattle', c.key, busy ? 'BUSY' : '', alive ? '' : 'DEAD');
    if (busy) return; busy = true;
    hero.path = []; hero.walking = false; hero.onArrive = null;
    o.onMove?.(hero.x, hero.y);
    bubble(c, c.boss ? '!!' : '!', 900);
    o.sfx?.('swirl');
    setTimeout(() => { trace('onBattle', c.key, alive ? '' : 'DEAD'); if (alive) o.onBattle?.(c); }, 650);
  }
  function enter(b) {
    if (busy) return; busy = true;
    hero.dir = 'up'; o.sfx?.('door');
    fade.classList.add('on');
    setTimeout(() => { if (alive) o.onEnter?.(b.station, {x: hero.x, y: hero.y}); }, 380);
  }
  function talkTo(n) {
    n.talk = 4; n.count = (n.count || 0) + 1;
    const text = o.npcLine?.(n.id, n.count - 1) || '';
    if (n.id === 'biscuit') o.sfx?.('bark');
    bubble(n, text, 4200); o.say?.(text);
  }
  function readSign(sg) { o.onSign?.(sg); }

  /* ---------------------------------------------------------------- input */
  function worldPoint(ev) {
    const r = canvas.getBoundingClientRect();
    return [(ev.clientX - r.left) / s, (ev.clientY - r.top) / s + camY];
  }
  function hit(x, y) {
    for (const st of stones) if (!st.got && Math.hypot(st.x - x, st.y - y) < 20) return {kind: 'stone', e: st};
    for (const c of critters) if (!c.won) { const m = art.critters[c.id]; const sz = c.boss ? 64 : 42; if (Math.abs(x - c.x) < sz * 0.6 && y < c.y + 8 && y > c.y - sz * (m.mh / Math.max(m.mw, m.mh)) - 8) return {kind: 'critter', e: c}; }
    for (const n of npcs) if (Math.abs(x - n.x) < 22 && y < n.y + 6 && y > n.y - (n.id === 'biscuit' ? 34 : 60)) return {kind: 'npc', e: n};
    if (Math.abs(x - glint.x) < 18 && Math.abs(y - glint.y) < 18) return {kind: 'glint'};
    for (const sg of signs) if (sg.prop && Math.abs(x - sg.prop.x) < 24 && y < sg.prop.y + 4 && y > sg.prop.y - sg.prop.h - 4) return {kind: 'sign', e: sg};
    const hits = buildings.filter(b => x > b.x - b.w / 2 && x < b.x + b.w / 2 && y > b.y - b.h && y < b.y + 4).sort((a, b) => b.y - a.y);
    if (hits.length) return {kind: 'building', e: hits[0]};
    return {kind: 'ground'};
  }
  function tap(x, y) {
    trace('tap', Math.round(x), Math.round(y), busy ? 'BUSY' : '');
    if (busy) return;
    o.unlock?.();
    const h = hit(x, y);
    if (h.kind === 'stone') return walkTo(h.e.c, h.e.r);
    if (h.kind === 'critter') {
      const c = h.e;
      if (!c.awake) { bubble(c, 'Zzz…', 1800); o.say?.(c.boss ? 'The big critter is sleeping. Finish today’s games to wake it up!' : 'Shh! It’s sleeping. Play more games to wake it up!'); return; }
      c.frozen = true; c.path = []; bubble(c, '!', 1200);
      return walkTo(...tileOf(c.x, c.y), () => startBattle(c));
    }
    if (h.kind === 'npc') { const n = h.e; return walkTo(...tileOf(n.x, n.y), () => talkTo(n), {stopShort: true}); }
    if (h.kind === 'glint') { const text = o.npcLine?.('glint', (glint.n = (glint.n || 0) + 1) - 1) || ''; bubble(glint, text, 4200); o.say?.(text); return; }
    if (h.kind === 'sign') { const sg = h.e; return walkTo(sg.c, sg.r + 1, () => { hero.dir = 'up'; readSign(sg); }); }
    if (h.kind === 'building') {
      const b = h.e;
      if (b.station && b.today) return walkTo(b.door[0], b.door[1], () => enter(b));
      if (b.station) { const text = `${o.stationName?.(b.station) || 'This place'} is not on today’s path. Look for the bouncing signs!`; bubble(glintAnchor(), text, 3500); o.say?.(text); return; }
      if (b.k === 'home') { const text = 'Home sweet home! Everyone starts the day here.'; bubble(glintAnchor(), text, 3000); o.say?.(text); return walkTo(b.door[0], b.door[1]); }
    }
    const [c, r] = tileOf(x, y);
    walkTo(c, r);
  }
  const glintAnchor = () => glint;
  function onDown(ev) { dragging = {x: ev.clientX, y: ev.clientY, cam: camY, moved: false, id: ev.pointerId}; canvas.setPointerCapture?.(ev.pointerId); }
  function onMoveP(ev) {
    if (!dragging || ev.pointerId !== dragging.id) return;
    const dy = ev.clientY - dragging.y;
    if (Math.abs(dy) > 8 || Math.abs(ev.clientX - dragging.x) > 8) dragging.moved = true;
    if (dragging.moved) { camY = clampCam(dragging.cam - dy / s); camTarget = camY; dragging.panned = performance.now(); }
  }
  function onUp(ev) {
    if (!dragging || ev.pointerId !== dragging.id) return;
    const d = dragging; dragging = null;
    if (!d.moved) { const [x, y] = worldPoint(ev); tap(x, y); }
  }
  canvas.addEventListener('pointerdown', onDown); canvas.addEventListener('pointermove', onMoveP);
  canvas.addEventListener('pointerup', onUp); canvas.addEventListener('pointercancel', () => { dragging = null; });

  /* ---------------------------------------------------------------- bubbles (DOM, so text wraps nicely) */
  const live = [];
  function bubble(who, text, ms = 3000) {
    if (!text) return;
    const el = document.createElement('div'); el.className = 'mf-bubble'; el.textContent = text;
    bubbles.append(el); const b = {who, el, until: performance.now() + ms}; live.push(b);
    for (const x of live) if (x !== b && x.who === who) x.until = 0;
  }
  function placeBubbles(t) {
    for (let i = live.length - 1; i >= 0; i--) {
      const b = live[i];
      if (t > b.until) { b.el.remove(); live.splice(i, 1); continue; }
      const w = b.who; const top = (w.y - (w === glint ? 20 : w.boss ? 80 : 66) - camY) * s;
      const left = Math.max(8, Math.min(cssW - b.el.offsetWidth - 8, w.x * s - b.el.offsetWidth / 2));
      b.el.style.transform = `translate(${left}px, ${Math.max(4, top - b.el.offsetHeight)}px)`;
    }
  }

  /* ---------------------------------------------------------------- drawing */
  function drawSheet(key, meta, frame, x, y, wUnits, flip = false, alpha = 1) {
    const im = img[meta.img]; if (!im) return;
    const cols = meta.cols; const sx = (frame % cols) * meta.fw, sy = Math.floor(frame / cols) * meta.fh;
    const k = wUnits / meta.fw; const dw = meta.fw * k, dh = meta.fh * k; const foot = (meta.foot || meta.fh) * k;
    ctx.save(); ctx.globalAlpha = alpha;
    if (flip) { ctx.translate(x, 0); ctx.scale(-1, 1); ctx.drawImage(im, sx, sy, meta.fw, meta.fh, -dw / 2, y - foot, dw, dh); }
    else ctx.drawImage(im, sx, sy, meta.fw, meta.fh, x - dw / 2, y - foot, dw, dh);
    ctx.restore();
  }
  function shadow(x, y, w) { ctx.fillStyle = 'rgba(20,30,20,.22)'; ctx.beginPath(); ctx.ellipse(x, y, w, w * 0.32, 0, 0, Math.PI * 2); ctx.fill(); }
  function fx(name, x, y, size, alpha = 1) {
    const r = art.fx[name]; const im = img.fx; if (!r || !im) return;
    ctx.save(); ctx.globalAlpha = alpha; ctx.drawImage(im, r[0], r[1], r[2], r[3], x - size / 2, y - size / 2, size, size); ctx.restore();
  }
  function drawWalker(e, meta, isHero) {
    shadow(e.x, e.y, 12);
    if (meta.dog) { const fr = e.walking ? 1 + Math.floor(clock * 8) % 3 : 1; drawSheet('dog', meta, fr, e.x, e.y, 40, e.dir === 'left' || e.dir === 'ul' || e.dir === 'dl'); return; }
    const frame = isHero ? heroFrame(e.dir, e.walking, clock) : CARD[cardinalOf(e.dir)] + (e.walking ? Math.floor(clock * 6) % 4 : 0);
    drawSheet('w', meta, frame, e.x, e.y, 48);
  }
  function draw(t) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = map.theme?.bg?.[0] || '#b5e48c'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr * s, 0, 0, dpr * s, 0, -camY * dpr * s);
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    if (img[map.ground]) ctx.drawImage(img[map.ground], 0, 0, W, H);
    // tap target ring
    if (target) { target.t += 1 / 60; const a = Math.max(0, 1 - target.t / 0.8); if (a > 0) { ctx.strokeStyle = `rgba(255,255,255,${a})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(target.x, target.y, 10 + target.t * 14, 5 + target.t * 6, 0, 0, Math.PI * 2); ctx.stroke(); } }
    // letter stones on the ground
    for (const st of stones) {
      if (st.got) { if (st.pop !== undefined && st.pop < 1) { st.pop += 1 / 45; fx('sparkle', st.x, st.y - 20 - st.pop * 30, 36, 1 - st.pop); } continue; }
      const glow = 0.55 + 0.45 * Math.sin(t * 3 + st.x);
      ctx.fillStyle = `rgba(255,236,153,${0.35 * glow})`; ctx.beginPath(); ctx.ellipse(st.x, st.y, 22, 11, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff8e1'; ctx.strokeStyle = '#f59f00'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.ellipse(st.x, st.y - 4, 15, 12, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#7048e8'; ctx.font = '700 15px Andika, system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(st.g, st.x, st.y - 5);
    }
    // everything that stands up, sorted by feet
    const list = [];
    for (const b of statics) list.push([b.y, 's', b]);
    for (const n of npcs) list.push([n.y, 'n', n]);
    for (const c of critters) if (!c.won || c.cheer) list.push([c.y, 'c', c]);
    for (const f of followers) list.push([f.y - 0.1, 'f', f]);
    list.push([hero.y, 'h', hero]);
    list.sort((a, b) => a[0] - b[0]);
    for (const [, kind, e] of list) {
      if (kind === 's') {
        const m = art.objects[e.k]; const im = img[m.img]; if (!im) continue;
        ctx.drawImage(im, e.x - e.w / 2, e.y - e.h, e.w, e.h);
        if (e.k === 'sign') { const sg = signs.find(q => q.prop === e); if (sg) { ctx.fillStyle = '#3b2412'; ctx.font = `700 ${sg.w.length > 4 ? 10 : 12}px Andika, system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(sg.w, e.x, e.y - e.h * 0.68); } }
      } else if (kind === 'n') drawWalker(e, art.npcs[e.id], false);
      else if (kind === 'f') drawWalker(e, art.heroes[e.id], true);
      else if (kind === 'h') drawWalker(e, art.heroes[e.id], true);
      else if (kind === 'c') drawCritter(e, t);
    }
    // glint flies beside the leader
    const gx = hero.x - 26, gy = hero.y - 78 + Math.sin(t * 2.4) * 5;
    glint.x += (gx - glint.x) * 0.08; glint.y += (gy - glint.y) * 0.08;
    drawSheet('g', art.npcs.glint, Math.floor(t * 6) % 4, glint.x, glint.y + 22, 34);
    // station signs bouncing over today's buildings
    for (const b of buildings) {
      if (!b.today) continue;
      const st = stations.get(b.station); const bob = Math.sin(t * 3 + b.x) * 3;
      const cx = b.x, cy = b.y - b.h - 16 + bob;
      const isNext = nextStation === b.station && !st.done;
      if (isNext) { ctx.fillStyle = `rgba(255,212,59,${0.35 + 0.25 * Math.sin(t * 5)})`; ctx.beginPath(); ctx.arc(cx, cy, 24, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = st.done ? '#fff9db' : '#ffffff'; ctx.strokeStyle = st.done ? '#fab005' : (st.color || '#7048e8'); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(cx, cy, 17, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx - 5, cy + 15); ctx.lineTo(cx, cy + 22); ctx.lineTo(cx + 5, cy + 15); ctx.fillStyle = st.done ? '#fab005' : (st.color || '#7048e8'); ctx.fill();
      const ic = img['icon:' + b.station]; if (ic) ctx.drawImage(ic, cx - 11, cy - 11, 22, 22);
      if (st.done) fx('star', cx + 14, cy - 12, 18);
    }
    // off-screen hint toward the next station
    if (nextStation) {
      const b = buildings.find(q => q.station === nextStation);
      if (b) {
        const sy = (b.y - b.h / 2 - camY) * s;
        if (sy < 0 || sy > cssH) {
          const up = sy < 0; const ax = b.x, ay = up ? camY + 26 / s : camY + (cssH - 26) / s;
          ctx.save(); ctx.translate(ax, ay + Math.sin(t * 5) * 3); if (!up) ctx.rotate(Math.PI);
          ctx.fillStyle = '#ffd43b'; ctx.strokeStyle = '#30243d'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(11, 6); ctx.lineTo(-11, 6); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
        }
      }
    }
  }
  function drawCritter(c, t) {
    const m = art.critters[c.id]; const im = img[m.mini]; if (!im) return;
    const size = c.boss ? 64 : 42; const k = size / Math.max(m.mw, m.mh); const w = m.mw * k, h = m.mh * k;
    const hop = c.awake && !c.won ? Math.abs(Math.sin(c.phase * 4)) * 5 : 0;
    shadow(c.x, c.y, w * 0.4);
    ctx.save(); ctx.globalAlpha = c.awake ? 1 : 0.75;
    if (m.pixel) ctx.imageSmoothingEnabled = false;
    if (c.flip) { ctx.translate(c.x, 0); ctx.scale(-1, 1); ctx.drawImage(im, -w / 2, c.y - h - hop, w, h); }
    else ctx.drawImage(im, c.x - w / 2, c.y - h - hop, w, h);
    ctx.restore();
    if (!c.awake) fx('zzz', c.x + w * 0.45, c.y - h - 6 + Math.sin(t * 2) * 3, 20, 0.9);
    else if (Math.hypot(hero.x - c.x, hero.y - c.y) < 110) fx('exclaim', c.x, c.y - h - 14 + Math.sin(t * 8) * 2, 20);
    if (c.boss && c.awake) { ctx.strokeStyle = `rgba(174,62,201,${0.4 + 0.3 * Math.sin(t * 4)})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(c.x, c.y, w * 0.6, w * 0.2, 0, 0, Math.PI * 2); ctx.stroke(); }
  }

  /* ---------------------------------------------------------------- loop */
  let skip = 0;
  function loop(ts) {
    if (!alive) return;
    const dt = Math.min(0.05, last ? (ts - last) / 1000 : 0); last = ts; clock += dt;
    stepHero(dt); stepFollowers(); stepNPCs(dt); stepCritters(dt);
    if (!dragging && hero.walking) camTarget = clampCam(hero.y - cssH / s * 0.58);
    if (!dragging) camY += (camTarget - camY) * Math.min(1, dt * 6);
    // save battery: when nobody is walking and the camera is still, redraw at about 20 frames a second
    const busyScene = hero.walking || dragging || Math.abs(camTarget - camY) > 0.5 || live.length || npcs.some(n => n.walking) || critters.some(c => c.path.length);
    if (busyScene || ++skip >= 3) { skip = 0; draw(clock); }
    placeBubbles(ts);
    raf = requestAnimationFrame(loop);
  }
  ready.then(() => { if (!alive) return; raf = requestAnimationFrame(loop); o.onReady?.(); });

  return {
    ready,
    walkToStation(id) { const b = buildings.find(q => q.station === id); if (b && b.today) walkTo(b.door[0], b.door[1], () => enter(b)); },
    setNext(id) { nextStation = id; },
    wakeCritters(list) { for (const c of critters) { const n = list.find(q => q.key === c.key); if (n && n.awake && !c.awake) { c.awake = true; bubble(c, '!', 1500); } } },
    say(text, who = 'glint') { bubble(who === 'glint' ? glint : (npcs.find(n => n.id === who) || glint), text, 4200); },
    heroPos: () => [hero.x, hero.y],
    debug: () => ({hero: {...hero, path: hero.path.length, onArrive: !!hero.onArrive}, camY, s, critters: critters.map(c => ({key: c.key, x: c.x, y: c.y, awake: c.awake, won: c.won})),
      stones: stones.map(st => ({key: st.key, x: st.x, y: st.y, got: !!st.got})), npcs: npcs.map(n => ({id: n.id, x: n.x, y: n.y}))}),
    tapWorld: (x, y) => tap(x, y),
    destroy() { alive = false; cancelAnimationFrame(raf); ro?.disconnect(); canvas.replaceWith(canvas.cloneNode(false)); live.length = 0; }
  };
}
