/**
 * Handwriting trace pad: one letter on the same four writing lines as the printed pages
 * (sky, fence, grass, dirt), with numbered green start dots, a "Show me" demo and a
 * guided tracer that only accepts strokes in the right order and direction.
 * Glyph paths come from data/hw.json (the stroke library used for the printed handwriting pages).
 */
import {createGuidedTracer} from './tracing-engine.js';

const SVG = 'http://www.w3.org/2000/svg';
const INKS = ['#e64980', '#7048e8', '#1c7ed6', '#f76707'];

export function mountTracePad(host, {glyph, onDone = () => {}, onStroke = () => {}, onHint = () => {}, corridorScale = 1} = {}) {
  host.innerHTML = '<div class="tp-box"><canvas class="tp-canvas" role="img" aria-label="Writing space"></canvas></div>';
  const box = host.querySelector('.tp-box'), canvas = host.querySelector('canvas'), g = canvas.getContext('2d');
  const meas = document.createElementNS(SVG, 'svg'); meas.setAttribute('aria-hidden', 'true'); meas.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden'; document.body.append(meas);
  let W = 0, H = 0, S = 1, left = 0, top = 0, paths = [], tracer = null, ink = [], active = null, pid = null, done = false, demoRaf = 0, demoPt = null, alive = true;
  const toUnits = p => ({x: (p.x - left) / S, y: (p.y - top) / S});
  const toPx = p => ({x: left + p.x * S, y: top + p.y * S});

  function sample() {
    meas.replaceChildren();
    return glyph.strokes.map(cmds => {
      const p = document.createElementNS(SVG, 'path'); p.setAttribute('d', cmds.map(c => c.join(' ')).join(' ')); meas.append(p);
      const len = p.getTotalLength();
      if (len < 0.3) { const m = cmds.find(c => c[0] === 'M'); return [toPx({x: m[1], y: m[2]})]; }
      const n = Math.max(2, Math.ceil(len * S / 2.2)); const pts = [];
      for (let i = 0; i <= n; i++) { const q = p.getPointAtLength(len * i / n); pts.push(toPx({x: q.x, y: q.y})); }
      return pts;
    });
  }
  function layout() {
    const pad = 16;
    S = Math.min((H - 2 * pad) / 150, (W - 2 * pad) / Math.max(40, glyph.w));
    left = (W - glyph.w * S) / 2; top = (H - 150 * S) / 2;
  }
  function reset(keep = false) {
    layout(); paths = sample(); active = null;
    if (keep && done) { draw(); return; }
    ink = []; done = false;
    const corridor = Math.max(13, Math.min(22, S * 9)) * corridorScale;
    tracer = createGuidedTracer(paths, {corridor, startRadius: corridor + 13, resumeRadius: corridor + 13, lookAhead: 42, maxStep: 58, backtrack: 32, maxArcRatio: 1.6});
    draw();
  }
  function line(pts, color, width, dash = []) {
    if (!pts.length) return; g.strokeStyle = color; g.fillStyle = color; g.lineWidth = width; g.lineCap = 'round'; g.lineJoin = 'round'; g.setLineDash(dash);
    if (pts.length === 1) { g.beginPath(); g.arc(pts[0].x, pts[0].y, width / 2, 0, Math.PI * 2); g.fill(); return; }
    g.beginPath(); g.moveTo(pts[0].x, pts[0].y); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y); g.stroke();
  }
  function guides() {
    const y = u => top + u * S; const x0 = 10, x1 = W - 10;
    const rule = (u, color, width, dash = []) => { g.strokeStyle = color; g.lineWidth = width; g.setLineDash(dash); g.beginPath(); g.moveTo(x0, y(u)); g.lineTo(x1, y(u)); g.stroke(); };
    rule(0, '#74c0fc', 2); rule(50, '#adb5bd', 2, [8, 8]); rule(100, '#40c057', 3); rule(150, '#c9a27e', 2);
    g.setLineDash([]);
  }
  function draw() {
    g.clearRect(0, 0, W, H); guides();
    const st = tracer?.getState();
    paths.forEach((pts, i) => {
      const doneStroke = done || (st && (st.complete || i < st.strokeIndex));
      line(pts, doneStroke ? '#d3f9d8' : '#fff0f6', Math.max(26, S * 16)); line(pts, '#c9a3b8', 2.4, [2, 8]);
    });
    ink.forEach(s => line(s.pts.map(toPx), s.color, Math.max(9, S * 5.5)));
    g.setLineDash([]);
    // numbered start dots so the stroke order is visible, like the printed pages
    paths.forEach((pts, i) => {
      if (done || (st && i < st.strokeIndex)) return;
      const p = pts[0]; const current = st && i === st.strokeIndex;
      g.fillStyle = current ? '#2f9e44' : '#b2f2bb'; g.beginPath(); g.arc(p.x, p.y, current ? 12 : 9, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#fff'; g.font = `800 ${current ? 13 : 11}px system-ui`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(i + 1), p.x, p.y + 0.5);
    });
    const dot = demoPt || (!done && st && !st.complete && st.strokeProgress > 0 ? st.currentPoint : null);
    if (dot) { g.fillStyle = '#fff'; g.beginPath(); g.arc(dot.x, dot.y, 13, 0, Math.PI * 2); g.fill(); g.fillStyle = '#2f9e44'; g.beginPath(); g.arc(dot.x, dot.y, 9, 0, Math.PI * 2); g.fill(); }
  }
  function resize() {
    if (!alive) return;
    const ratio = Math.max(1, window.devicePixelRatio || 1);
    const nw = Math.max(200, box.clientWidth), nh = Math.max(200, box.clientHeight);
    if (Math.abs(nw - W) < 1 && Math.abs(nh - H) < 1) return;
    W = nw; H = nh; canvas.width = Math.round(W * ratio); canvas.height = Math.round(H * ratio); canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    g.setTransform(ratio, 0, 0, ratio, 0, 0); reset(true);
  }
  const pt = e => { const r = canvas.getBoundingClientRect(); return {x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height}; };
  function accept(res, down) {
    if (!res.accepted) { active = null; if (!res.complete) onHint(res.reason === 'start-too-far' || res.reason === 'resume-too-far' ? 'start' : 'path'); return; }
    const pts = (res.drawPoints?.length ? res.drawPoints : [res.point]).map(toUnits);
    if (down || !active) { active = {color: INKS[ink.length % INKS.length], pts}; ink.push(active); } else active.pts.push(...pts);
    if (res.strokeComplete) { active = null; onStroke(res.strokeIndex); if (res.complete && !done) { done = true; draw(); onDone(); } }
  }
  function cancelDemo() { if (demoRaf) cancelAnimationFrame(demoRaf); demoRaf = 0; demoPt = null; }
  function onDown(e) {
    if (pid !== null || e.isPrimary === false || done) return; e.preventDefault(); cancelDemo(); pid = e.pointerId; try { canvas.setPointerCapture(pid); } catch {}
    const p = pt(e); accept(tracer.pointerDown(p.x, p.y), true); draw();
  }
  function onMove(e) {
    if (e.pointerId !== pid) return; e.preventDefault();
    for (const ev of (e.getCoalescedEvents?.() || [e])) { const p = pt(ev); accept(tracer.pointerMove(p.x, p.y)); if (done) break; }
    draw();
  }
  function onUp(e) { if (e.pointerId !== pid) return; tracer.pointerUp(); pid = null; active = null; draw(); }
  canvas.addEventListener('pointerdown', onDown, {passive: false}); canvas.addEventListener('pointermove', onMove, {passive: false});
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => canvas.addEventListener(t, onUp));
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => requestAnimationFrame(resize)) : null; ro?.observe(box);
  resize();
  return {
    demo() {
      cancelDemo(); const all = paths.flat(); if (!all.length) return; const t0 = performance.now(), dur = Math.min(5200, Math.max(1800, all.length * 14));
      const tick = now => { const f = Math.min(1, (now - t0) / dur); demoPt = all[Math.min(all.length - 1, Math.floor(f * (all.length - 1)))]; draw(); if (f < 1) demoRaf = requestAnimationFrame(tick); else { demoRaf = 0; demoPt = null; draw(); } };
      demoRaf = requestAnimationFrame(tick);
    },
    again() { cancelDemo(); done = false; reset(); },
    debug: () => ({paths: paths.map(s => s.map(p => ({...p}))), state: tracer?.getState(), done}),
    destroy() { alive = false; cancelDemo(); ro?.disconnect(); meas.remove(); }
  };
}
