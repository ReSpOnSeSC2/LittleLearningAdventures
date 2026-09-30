/**
 * Tiny chiptune sound board for the Meteor Falls adventure (no audio files).
 * Sound effects follow the app's sound switch; music has its own switch and
 * ducks while the phone voice is talking so directions are always easy to hear.
 */
let ac = null, master = null, musicGain = null, loop = null;
const now = () => ac.currentTime;
function ensure() {
  if (ac) { if (ac.state === 'suspended') ac.resume().catch(() => {}); return true; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return false;
  try {
    ac = new AC(); master = ac.createGain(); master.gain.value = 0.5; master.connect(ac.destination);
    musicGain = ac.createGain(); musicGain.gain.value = 0; musicGain.connect(master);
    return true;
  } catch { ac = null; return false; }
}
function tone(freq, t0, dur, {type = 'square', vol = 0.18, to = null, out = master, attack = 0.005} = {}) {
  const o = ac.createOscillator(); const g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t0);
  if (to) o.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + attack); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(out); o.start(t0); o.stop(t0 + dur + 0.02);
}
function noise(t0, dur, {vol = 0.25, hp = 800, out = master} = {}) {
  const len = Math.max(1, Math.floor(ac.sampleRate * dur)); const buf = ac.createBuffer(1, len, ac.sampleRate); const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const s = ac.createBufferSource(); s.buffer = buf; const f = ac.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp;
  const g = ac.createGain(); g.gain.value = vol; s.connect(f); f.connect(g); g.connect(out); s.start(t0);
}
const N = n => 440 * Math.pow(2, (n - 69) / 12);   // MIDI note -> Hz

export const SFX = {
  hit() { const t = now(); noise(t, 0.12, {vol: 0.35, hp: 400}); tone(160, t, 0.18, {type: 'square', vol: 0.22, to: 55}); },
  smash() { const t = now(); noise(t, 0.25, {vol: 0.45, hp: 250}); tone(220, t, 0.3, {type: 'sawtooth', vol: 0.2, to: 40}); tone(N(84), t + 0.02, 0.12, {vol: 0.08}); },
  zap() { const t = now(); for (let i = 0; i < 6; i++) tone(900 - i * 90, t + i * 0.025, 0.05, {type: 'square', vol: 0.12}); },
  whoosh() { const t = now(); noise(t, 0.3, {vol: 0.18, hp: 1800}); tone(700, t, 0.25, {type: 'sine', vol: 0.06, to: 300}); },
  miss() { const t = now(); tone(N(64), t, 0.12, {type: 'triangle', vol: 0.15}); tone(N(60), t + 0.12, 0.2, {type: 'triangle', vol: 0.15}); },
  select() { const t = now(); tone(N(76), t, 0.07, {type: 'square', vol: 0.08}); tone(N(83), t + 0.06, 0.08, {type: 'square', vol: 0.08}); },
  stone() { const t = now(); [76, 83, 88, 95].forEach((n, i) => tone(N(n), t + i * 0.07, 0.25, {type: 'triangle', vol: 0.13})); },
  door() { const t = now(); [60, 64, 67, 72].forEach((n, i) => tone(N(n), t + i * 0.06, 0.16, {type: 'square', vol: 0.07})); },
  swirl() { const t = now(); for (let i = 0; i < 14; i++) tone(N(84 - i * 2), t + i * 0.035, 0.08, {type: 'square', vol: 0.07}); },
  win() { const t = now(); [[72, 0], [76, 0.12], [79, 0.24], [84, 0.36], [79, 0.52], [84, 0.64]].forEach(([n, d]) => tone(N(n), t + d, d > 0.6 ? 0.5 : 0.14, {type: 'square', vol: 0.12})); },
  level() { const t = now(); [67, 71, 74, 79, 83, 86].forEach((n, i) => tone(N(n), t + i * 0.07, 0.2, {type: 'square', vol: 0.1})); tone(N(91), t + 0.45, 0.5, {type: 'triangle', vol: 0.14}); },
  special() { const t = now(); for (let i = 0; i < 10; i++) tone(N(60 + i * 3), t + i * 0.04, 0.12, {type: 'sawtooth', vol: 0.07}); noise(t + 0.4, 0.4, {vol: 0.4, hp: 150}); },
  bark() { const t = now(); tone(520, t, 0.08, {type: 'square', vol: 0.12, to: 300}); tone(560, t + 0.16, 0.09, {type: 'square', vol: 0.12, to: 320}); },
  heal() { const t = now(); [79, 83, 86, 91, 95].forEach((n, i) => tone(N(n), t + i * 0.08, 0.3, {type: 'sine', vol: 0.12})); }
};

/* Music: short loops written as [melody, bass] note lists (0 = rest), 8th notes. */
const SONGS = {
  world: {bpm: 112, mel: [72, 0, 76, 79, 81, 79, 76, 0, 74, 0, 77, 81, 79, 77, 74, 0, 72, 0, 76, 79, 84, 83, 81, 79, 77, 76, 74, 76, 72, 0, 0, 0],
    bass: [48, 0, 55, 0, 53, 0, 55, 0, 50, 0, 57, 0, 55, 0, 53, 0, 48, 0, 55, 0, 57, 0, 53, 0, 50, 0, 55, 0, 48, 0, 55, 0]},
  battle: {bpm: 150, mel: [76, 76, 0, 79, 81, 0, 79, 76, 74, 74, 0, 77, 79, 0, 77, 74, 76, 76, 0, 79, 84, 83, 81, 79, 81, 0, 79, 0, 76, 0, 74, 0],
    bass: [45, 57, 45, 57, 43, 55, 43, 55, 41, 53, 41, 53, 43, 55, 43, 55, 45, 57, 45, 57, 43, 55, 43, 55, 41, 53, 43, 55, 45, 57, 40, 52]},
  boss: {bpm: 160, mel: [69, 72, 76, 72, 69, 72, 77, 72, 68, 71, 76, 71, 68, 71, 74, 71, 69, 72, 76, 81, 79, 76, 72, 76, 74, 77, 81, 77, 76, 72, 71, 68],
    bass: [45, 45, 57, 45, 45, 45, 57, 45, 44, 44, 56, 44, 44, 44, 56, 44, 45, 45, 57, 45, 41, 41, 53, 41, 38, 38, 50, 38, 40, 40, 52, 40]}
};
let enabled = {sfx: true, music: true};
export function setAudio({sfx, music}) {
  if (typeof sfx === 'boolean') enabled.sfx = sfx;
  if (typeof music === 'boolean') { enabled.music = music; if (!music) stopMusic(); }
}
export function sfx(name) { if (!enabled.sfx || !SFX[name] || !ensure()) return; try { SFX[name](); } catch {} }
export function playMusic(name) {
  if (!enabled.music || !ensure()) return;
  if (loop && loop.name === name) return;
  stopMusic();
  const song = SONGS[name]; if (!song) return;
  const step = 60 / song.bpm / 2; let i = 0; let next = now() + 0.1;
  musicGain.gain.cancelScheduledValues(now()); musicGain.gain.setValueAtTime(0.0001, now()); musicGain.gain.linearRampToValueAtTime(1, now() + 0.6);
  const timer = setInterval(() => {
    if (!ac) return;
    const talking = document.body.classList.contains('buddy-speaking');
    musicGain.gain.setTargetAtTime(talking ? 0.25 : 1, now(), 0.08);
    while (next < now() + 0.25) {
      const m = song.mel[i % song.mel.length], b = song.bass[i % song.bass.length];
      if (m) tone(N(m), next, step * 0.9, {type: 'square', vol: 0.035, out: musicGain});
      if (b) tone(N(b), next, step * 0.95, {type: 'triangle', vol: 0.06, out: musicGain});
      i++; next += step;
    }
  }, 60);
  loop = {name, timer};
}
export function stopMusic() {
  if (loop) { clearInterval(loop.timer); loop = null; }
  if (musicGain && ac) { musicGain.gain.cancelScheduledValues(now()); musicGain.gain.setTargetAtTime(0.0001, now(), 0.05); }
}
export function unlockAudio() { ensure(); }
