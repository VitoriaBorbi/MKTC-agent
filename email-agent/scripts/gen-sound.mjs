// Gera o som "YOU DIED" do Dark Souls como WAV sintético
// Uso: node gen-sound.mjs [output.wav]
import { writeFileSync } from 'fs';

const OUT  = process.argv[2] || '/tmp/you-scheduled.wav';
const SR   = 44100;
const DUR  = 5.2;
const N    = Math.floor(SR * DUR);
const buf  = new Float32Array(N);

// ── Helpers ────────────────────────────────────────────────
function sine(phase)     { return Math.sin(2 * Math.PI * phase); }
function saw(phase)      { return 2 * (phase % 1) - 1; }
function clamp(v, a, b)  { return Math.max(a, Math.min(b, v)); }

function addOsc(freq, type, startSec, endSec, ampFn) {
  const s0 = Math.floor(startSec * SR);
  const s1 = Math.min(Math.floor(endSec * SR), N);
  for (let i = s0; i < s1; i++) {
    const t     = (i - s0) / SR;
    const phase = (freq * (i - s0)) / SR;
    const wave  = type === 'sine' ? sine(phase) : saw(phase);
    buf[i]     += wave * ampFn(t);
  }
}

// Reverb simples: eco atenuado em dois delays
function addReverb(delayMs, gain) {
  const offset = Math.floor(delayMs * SR / 1000);
  for (let i = offset; i < N; i++) buf[i] += buf[i - offset] * gain;
}

// ── 1. CRASH GRAVE (thud inicial) ─────────────────────────
// Frequência cai de 90→28 Hz num pitch-sweep
addOsc(90,  'sine', 0, 1.4, t => {
  const amp = t < 0.02 ? (t / 0.02) * 0.85 : 0.85 * Math.exp(-(t - 0.02) * 3.2);
  return amp;
});
addOsc(45,  'sine', 0, 1.4, t => {
  const amp = t < 0.02 ? (t / 0.02) * 0.45 : 0.45 * Math.exp(-(t - 0.02) * 3.2);
  return amp;
});
addOsc(28,  'sine', 0.05, 1.6, t => 0.3 * Math.exp(-t * 2.5));

// ── 2. CORO ESCURO — acorde Am ─────────────────────────────
// A1=55, E2=82.4, A2=110, C#3=138.6, E3=164.8
const chordFreqs = [55, 82.4, 110, 138.6, 164.8];
chordFreqs.forEach((f, i) => {
  const startSec = i * 0.12;
  const peak     = 0.13 / (i * 0.45 + 1);
  const attack   = 0.75 + i * 0.12;

  // Fundamental
  addOsc(f, 'sawtooth', startSec, DUR, t => {
    if (t < attack) return (t / attack) * peak;
    if (t < 3.6)    return peak;
    return peak * Math.max(0, 1 - (t - 3.6) / 1.5);
  });
  // Harmônico suave
  addOsc(f * 2, 'sine', startSec, DUR, t => {
    if (t < attack) return (t / attack) * peak * 0.25;
    if (t < 3.6)    return peak * 0.25;
    return peak * 0.25 * Math.max(0, 1 - (t - 3.6) / 1.5);
  });
});

// ── 3. STING ALTO — coro agudo ─────────────────────────────
// A3=220, C#4=277, E4=330, A4=440
const highFreqs = [220, 277.2, 329.6, 440];
highFreqs.forEach((f, i) => {
  const startSec = 0.48 + i * 0.06;
  const peak     = 0.055 / (i * 0.6 + 1);
  addOsc(f, 'sine', startSec, DUR, t => {
    if (t < 0.55) return (t / 0.55) * peak;
    return peak * Math.exp(-(t - 0.55) * 0.9);
  });
});

// ── Reverb ────────────────────────────────────────────────
addReverb(80,  0.28);
addReverb(160, 0.16);
addReverb(340, 0.10);
addReverb(680, 0.06);

// ── Normalizar ────────────────────────────────────────────
let peak = 0;
for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(buf[i]));
for (let i = 0; i < N; i++) buf[i] = clamp(buf[i] / peak * 0.82, -1, 1);

// ── WAV header (mono 16-bit PCM) ──────────────────────────
const dataSize = N * 2;
const wav      = Buffer.alloc(44 + dataSize);
wav.write('RIFF', 0);
wav.writeUInt32LE(36 + dataSize, 4);
wav.write('WAVE', 8);
wav.write('fmt ', 12);
wav.writeUInt32LE(16, 16);
wav.writeUInt16LE(1,  20);   // PCM
wav.writeUInt16LE(1,  22);   // mono
wav.writeUInt32LE(SR, 24);
wav.writeUInt32LE(SR * 2, 28);
wav.writeUInt16LE(2,  32);
wav.writeUInt16LE(16, 34);
wav.write('data', 36);
wav.writeUInt32LE(dataSize, 40);
for (let i = 0; i < N; i++) {
  wav.writeInt16LE(Math.floor(clamp(buf[i], -1, 1) * 32767), 44 + i * 2);
}

writeFileSync(OUT, wav);
console.log(`✓ WAV gerado: ${OUT}`);
