/**
 * Music box for Vivian's path: sing-along tunes (traditional melodies, public domain), the ABC song,
 * a dance loop for freeze dance, and gentle sound effects. Everything is made with Web Audio; no files.
 * Music ducks while the phone voice talks. Sound effects follow the app's sound switch.
 */
const N = n => 440 * Math.pow(2, (n - 69) / 12);   // MIDI note -> Hz

/* ---------- tunes: phrases of [midi, beats]; 0 = rest. One lyric line starts on each phrase. ---------- */
const q = (...pairs) => { const out = []; for (let i = 0; i < pairs.length; i += 2) out.push([pairs[i], pairs[i + 1]]); return out; };
const FRERE = [q(60, 1, 62, 1, 64, 1, 60, 1), q(60, 1, 62, 1, 64, 1, 60, 1), q(64, 1, 65, 1, 67, 2), q(64, 1, 65, 1, 67, 2),
  q(67, .5, 69, .5, 67, .5, 65, .5, 64, 1, 60, 1), q(67, .5, 69, .5, 67, .5, 65, .5, 64, 1, 60, 1), q(60, 1, 55, 1, 60, 2), q(60, 1, 55, 1, 60, 2)];
const MARY = [q(64, 1, 62, 1, 60, 1, 62, 1, 64, 1, 64, 1, 64, 2), q(62, 1, 62, 1, 62, 2, 64, 1, 67, 1, 67, 2),
  q(64, 1, 62, 1, 60, 1, 62, 1, 64, 1, 64, 1, 64, 1, 64, 1), q(62, 1, 62, 1, 64, 1, 62, 1, 60, 4)];
const LONDON = [q(67, 1.5, 69, .5, 67, 1, 65, 1, 64, 1, 65, 1, 67, 2), q(62, 1, 64, 1, 65, 2, 64, 1, 65, 1, 67, 2),
  q(67, 1.5, 69, .5, 67, 1, 65, 1, 64, 1, 65, 1, 67, 2), q(62, 2, 67, 2, 64, 1, 60, 3)];
const TWINKLE = [q(60, 1, 60, 1, 67, 1, 67, 1, 69, 1, 69, 1, 67, 2), q(65, 1, 65, 1, 64, 1, 64, 1, 62, 1, 62, 1, 60, 2),
  q(67, 1, 67, 1, 65, 1, 65, 1, 64, 1, 64, 1, 62, 2), q(67, 1, 67, 1, 65, 1, 65, 1, 64, 1, 64, 1, 62, 2),
  q(60, 1, 60, 1, 67, 1, 67, 1, 69, 1, 69, 1, 67, 2), q(65, 1, 65, 1, 64, 1, 64, 1, 62, 1, 62, 1, 60, 2)];
const ROW = [q(60, 1.5, 60, 1.5, 60, 1, 62, .5, 64, 1.5), q(64, 1, 62, .5, 64, 1, 65, .5, 67, 3),
  q(72, .5, 72, .5, 72, .5, 67, .5, 67, .5, 67, .5, 64, .5, 64, .5, 64, .5, 60, .5, 60, .5, 60, .5), q(67, 1, 65, .5, 64, 1, 62, .5, 60, 3)];
const HOTCROSS = [q(64, 1, 62, 1, 60, 2), q(64, 1, 62, 1, 60, 2), q(60, .5, 60, .5, 60, .5, 60, .5, 62, .5, 62, .5, 62, .5, 62, .5), q(64, 1, 62, 1, 60, 2)];
const OLDMAN = [q(67, 1, 64, 1, 67, 2), q(67, 1, 64, 1, 67, 2), q(69, 1, 67, 1, 65, 1, 64, 1, 62, 1, 64, 1, 65, 2),
  q(64, .5, 65, .5, 67, 1, 60, 1, 60, .5, 60, .5, 60, 1), q(60, .5, 62, .5, 64, .5, 65, .5, 67, 2), q(67, 1, 62, 1, 62, 1, 65, 1, 64, 1, 62, 1, 60, 2)];
const OLDMAC = [q(60, 1, 60, 1, 60, 1, 55, 1, 57, 1, 57, 1, 55, 2), q(64, 1, 64, 1, 62, 1, 62, 1, 60, 3, 0, 1),
  q(55, 1, 60, 1, 60, 1, 60, 1, 55, 1, 57, 1, 57, 1, 55, 2), q(64, 1, 64, 1, 62, 1, 62, 1, 60, 3, 0, 1),
  q(55, .5, 55, .5, 60, 1, 60, 1, 60, 1, 55, .5, 55, .5, 60, 1, 60, 1, 60, 1), q(60, .5, 60, .5, 60, 1, 60, .5, 60, .5, 60, 1, 60, .5, 60, .5, 60, .5, 60, .5, 60, 1, 60, 1),
  q(60, 1, 60, 1, 60, 1, 55, 1, 57, 1, 57, 1, 55, 2), q(64, 1, 64, 1, 62, 1, 62, 1, 60, 4)];
const TUNES = {frere: {bpm: 104, phrases: FRERE}, mary: {bpm: 108, phrases: MARY}, london: {bpm: 108, phrases: LONDON}, twinkle: {bpm: 100, phrases: TWINKLE},
  row: {bpm: 96, phrases: ROW}, hotcross: {bpm: 100, phrases: HOTCROSS}, thisoldman: {bpm: 112, phrases: OLDMAN}, oldmac: {bpm: 120, phrases: OLDMAC}, chant: {bpm: 104, phrases: null}};
export const TUNE_NAMES = Object.keys(TUNES);

/** Notes to play for a song with `lines` lyric lines: [[midi | 0 rest | -1 clap, beats, lineIndex|null]], plus the beat where each line starts. */
export function tunePlan(name, lines) {
  const t = TUNES[name] || TUNES.twinkle;
  const notes = [];
  if (!t.phrases) {                               // clapping chant: two claps per bar, one line per bar or two
    for (let i = 0; i < lines; i++) for (let b = 0; b < 4; b++) notes.push([b % 2 ? 0 : -1, 1, b === 0 ? i : null]);
  } else {
    const P = t.phrases.length, rounds = Math.max(1, Math.ceil(lines / P)), total = P * rounds;
    for (let k = 0; k < total; k++) {
      const line = Math.floor(k * lines / total);
      const starts = Math.floor((k - 1) * lines / total) !== line || k === 0;
      t.phrases[k % P].forEach((n, j) => notes.push([n[0], n[1], j === 0 && starts ? line : null]));
    }
  }
  const lineStarts = []; let beat = 0;
  for (const n of notes) { if (n[2] !== null) lineStarts[n[2]] = beat; beat += n[1]; }
  return {notes, lineStarts, beats: beat, bpm: t.bpm};
}
/* The ABC song uses the same traditional melody as Twinkle, Twinkle. */
export const ABC_NOTES = [
  [60, 1, 'A'], [60, 1, 'B'], [67, 1, 'C'], [67, 1, 'D'], [69, 1, 'E'], [69, 1, 'F'], [67, 2, 'G'],
  [65, 1, 'H'], [65, 1, 'I'], [64, 1, 'J'], [64, 1, 'K'], [62, .5, 'L'], [62, .5, 'M'], [62, .5, 'N'], [62, .5, 'O'], [60, 2, 'P'],
  [67, 1, 'Q'], [67, 1, 'R'], [65, 2, 'S'], [64, 1, 'T'], [64, 1, 'U'], [62, 2, 'V'],
  [67, 1, 'W'], [67, 1, null], [65, 2, 'X'], [64, 1, 'Y'], [64, 1, null], [62, 2, 'Z'],
  [60, 1, null, 'end'], [60, 1, null], [67, 1, null], [67, 1, null], [69, 1, null], [69, 1, null], [67, 2, null],
  [65, 1, null], [65, 1, null], [64, 1, null], [64, 1, null], [62, 1, null], [62, 1, null], [60, 2, null]];

/* ---------- sound engine ---------- */
let ac = null, master = null, musicBus = null, current = null, duckTimer = null;
const enabled = {sfx: true, music: true};
const now = () => ac.currentTime;
function ensure() {
  if (typeof window === 'undefined') return false;
  if (ac) { if (ac.state === 'suspended') ac.resume().catch(() => {}); return true; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return false;
  try {
    ac = new AC(); master = ac.createGain(); master.gain.value = 0.55; master.connect(ac.destination);
    musicBus = ac.createGain(); musicBus.gain.value = 1; musicBus.connect(master);
    duckTimer = setInterval(() => { if (!ac) return; const talking = document.body.classList.contains('buddy-speaking'); musicBus.gain.setTargetAtTime(talking ? 0.22 : 1, now(), 0.08); }, 120);
    return true;
  } catch { ac = null; return false; }
}
function env(g, t0, vol, attack, dur) { g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + attack); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur); }
function osc(type, freq, t0, dur, vol, out, {to = null, attack = 0.006} = {}) {
  const o = ac.createOscillator(); const g = ac.createGain(); o.type = type; o.frequency.setValueAtTime(freq, t0);
  if (to) o.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + dur);
  env(g, t0, vol, attack, dur); o.connect(g); g.connect(out); o.start(t0); o.stop(t0 + dur + 0.05);
}
/* A music-box note: a bright fundamental, a softer octave and a quick glassy "tine". */
function musicBox(freq, t0, dur, vol, out) {
  osc('sine', freq, t0, dur, vol, out);
  osc('triangle', freq * 2, t0, dur * 0.55, vol * 0.28, out);
  osc('sine', freq * 4.2, t0, 0.12, vol * 0.1, out);
}
function noise(t0, dur, {vol = 0.2, type = 'highpass', f = 1200, out = master} = {}) {
  const len = Math.max(1, Math.floor(ac.sampleRate * dur)); const buf = ac.createBuffer(1, len, ac.sampleRate); const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
  const s = ac.createBufferSource(); s.buffer = buf; const fl = ac.createBiquadFilter(); fl.type = type; fl.frequency.value = f;
  const g = ac.createGain(); g.gain.value = vol; s.connect(fl); fl.connect(g); g.connect(out); s.start(t0);
}
const clap = (t, out) => { noise(t, 0.09, {vol: 0.35, f: 900, out}); noise(t + 0.012, 0.07, {vol: 0.25, f: 1500, out}); };

export const SFX = {
  tap() { const t = now(); musicBox(N(84), t, 0.18, 0.08, master); },
  good() { const t = now(); [76, 81, 88].forEach((n, i) => musicBox(N(n), t + i * 0.08, 0.5, 0.12, master)); },
  oops() { const t = now(); osc('triangle', N(67), t, 0.16, 0.12, master); osc('triangle', N(62), t + 0.14, 0.28, 0.12, master); },
  pop() { const t = now(); osc('sine', 520, t, 0.09, 0.28, master, {to: 1400}); noise(t, 0.05, {vol: 0.12, f: 2500}); },
  count(n = 1) { const t = now(); musicBox(N(67 + [0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17][Math.min(10, Math.max(0, n - 1))]), t, 0.45, 0.14, master); },
  sparkle() { const t = now(); [84, 88, 91, 96, 100].forEach((n, i) => musicBox(N(n), t + i * 0.06, 0.4, 0.07, master)); },
  crack() { const t = now(); noise(t, 0.08, {vol: 0.4, f: 1800}); noise(t + 0.1, 0.06, {vol: 0.3, f: 2200}); osc('square', 180, t, 0.06, 0.05, master); },
  hatch() { const t = now(); [[72, 0], [76, .12], [79, .24], [84, .36], [88, .52], [91, .64]].forEach(([n, d]) => musicBox(N(n), t + d, 0.7, 0.13, master)); },
  roar() { const t = now(); osc('sawtooth', 150, t, 0.7, 0.14, master, {to: 70, attack: 0.05}); osc('square', 95, t, 0.6, 0.06, master, {to: 50, attack: 0.05}); noise(t, 0.6, {vol: 0.12, type: 'lowpass', f: 700}); },
  freeze() { const t = now(); for (let i = 0; i < 8; i++) musicBox(N(96 - i * 3), t + i * 0.035, 0.35, 0.06, master); osc('sine', 900, t, 0.5, 0.05, master, {to: 200}); },
  splash() { const t = now(); noise(t, 0.4, {vol: 0.35, type: 'lowpass', f: 1400}); osc('sine', 300, t, 0.2, 0.08, master, {to: 120}); },
  bloop() { const t = now(); osc('sine', 300, t, 0.15, 0.2, master, {to: 700}); },
  plop() { const t = now(); osc('sine', 500, t, 0.25, 0.22, master, {to: 110}); },
  swish() { const t = now(); noise(t, 0.25, {vol: 0.18, type: 'bandpass', f: 2200}); },
  whoosh() { const t = now(); noise(t, 0.35, {vol: 0.14, type: 'bandpass', f: 900}); },
  yum() { const t = now(); musicBox(N(72), t, 0.2, 0.12, master); musicBox(N(79), t + 0.1, 0.35, 0.12, master); },
  step() { const t = now(); osc('sine', 140, t, 0.1, 0.18, master, {to: 80}); },
  drum() { const t = now(); osc('sine', 160, t, 0.28, 0.45, master, {to: 55}); noise(t, 0.05, {vol: 0.22, type: 'lowpass', f: 900}); }
};
export function setAudio({sfx, music} = {}) {
  if (typeof sfx === 'boolean') enabled.sfx = sfx;
  if (typeof music === 'boolean') { enabled.music = music; if (!music) stopMusic(); }
}
export function sfx(name, arg) { if (!enabled.sfx || !SFX[name] || !ensure()) return; try { SFX[name](arg); } catch {} }
export function unlockAudio() { ensure(); }
export function musicOn() { return enabled.music; }

/* Play a list of notes with callbacks. Returns a stop function. */
function playNotes(notes, bpm, {onNote, onEnd, vol = 0.2} = {}) {
  stopMusic();
  if (!enabled.music || !ensure()) { onEnd?.(false); return () => {}; }
  const spb = 60 / bpm; const out = ac.createGain(); out.gain.value = 1; out.connect(musicBus);
  let i = 0, beat = 0, stopped = false; const t0 = now() + 0.15; const timers = [];
  const tick = () => {
    if (stopped) return;
    while (i < notes.length && t0 + beat * spb < now() + 0.35) {
      const n = notes[i]; const t = t0 + beat * spb; const idx = i;
      if (n[0] > 0) musicBox(N(n[0]), t, Math.max(0.4, n[1] * spb * 1.7), vol, out);
      else if (n[0] === -1) clap(t, out);
      timers.push(setTimeout(() => { if (!stopped) onNote?.(idx, n); }, Math.max(0, (t - now()) * 1000)));
      beat += n[1]; i++;
    }
    if (i >= notes.length) {
      clearInterval(timer);
      timers.push(setTimeout(() => { if (!stopped) { stopped = true; current = null; onEnd?.(true); } }, Math.max(0, (t0 + beat * spb - now()) * 1000 + 350)));
    }
  };
  const timer = setInterval(tick, 50); tick();
  const stop = () => {
    if (stopped) return; stopped = true; clearInterval(timer); timers.forEach(clearTimeout);
    try { out.gain.setTargetAtTime(0.0001, now(), 0.04); setTimeout(() => out.disconnect(), 400); } catch {}
    current = null;
  };
  current = {stop};
  return stop;
}
/** Play a song; onLine(i) fires as lyric line i begins. */
export function playTune(name, lines, {onLine, onEnd} = {}) {
  const plan = tunePlan(name, lines);
  return playNotes(plan.notes, plan.bpm, {onNote: (i, n) => { if (n[2] !== null) onLine?.(n[2]); }, onEnd});
}
/** The ABC song: onLetter(letter) fires as each letter is sung; onLetter('end') for the last line. */
export function playAbc({onLetter, onEnd} = {}) {
  return playNotes(ABC_NOTES, 104, {onNote: (i, n) => { if (n[2]) onLetter?.(n[2]); else if (n[3]) onLetter?.('end'); }, onEnd});
}

/* ---------- a bouncy original dance loop (music box lead, soft bass, little drums) ---------- */
const DANCE = {bpm: 126,
  mel: [72, 0, 76, 79, 0, 76, 79, 81, 79, 0, 76, 0, 74, 76, 74, 0, 72, 0, 76, 79, 0, 79, 84, 83, 81, 0, 79, 0, 77, 76, 74, 0],
  bass: [48, 0, 55, 0, 48, 0, 55, 0, 45, 0, 52, 0, 45, 0, 52, 0, 41, 0, 48, 0, 41, 0, 48, 0, 43, 0, 50, 0, 43, 0, 47, 0]};
export function playDance() {
  stopMusic();
  if (!enabled.music || !ensure()) return () => {};
  const step = 60 / DANCE.bpm / 2; let i = 0, next = now() + 0.1, stopped = false;
  const out = ac.createGain(); out.gain.setValueAtTime(0.0001, now()); out.gain.linearRampToValueAtTime(1, now() + 0.3); out.connect(musicBus);
  const timer = setInterval(() => {
    if (stopped || !ac) return;
    while (next < now() + 0.3) {
      const m = DANCE.mel[i % 32], b = DANCE.bass[i % 32];
      if (m) musicBox(N(m), next, step * 2.2, 0.12, out);
      if (b) osc('triangle', N(b), next, step * 1.6, 0.16, out);
      if (i % 4 === 0) osc('sine', 110, next, 0.12, 0.3, out, {to: 45});
      if (i % 4 === 2) noise(next, 0.05, {vol: 0.12, f: 5000, out});
      if (i % 8 === 4) clap(next, out);
      i++; next += step;
    }
  }, 50);
  const stop = () => { if (stopped) return; stopped = true; clearInterval(timer); try { out.gain.setTargetAtTime(0.0001, now(), 0.03); setTimeout(() => out.disconnect(), 300); } catch {} current = null; };
  current = {stop};
  return stop;
}
export function stopMusic() { if (current) { const c = current; current = null; c.stop(); } }
