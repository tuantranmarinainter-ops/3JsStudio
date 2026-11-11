// sfx.js — Hiệu ứng âm thanh sinh bằng code (không cần file, không lo giấy phép).
// Thuần JS, chạy được cả trong trình duyệt lẫn Node. Seed = hash(tên) + biến thể → lần nào cũng ra giống hệt.
//
// Dùng:
//   import { renderSfx, toWav, SFX_LIST } from './sfx.js';
//   const pcm = renderSfx('pop');            // Float32Array mono 44.1 kHz, đỉnh ~0.9
//   const wav = toWav(pcm);                   // Uint8Array, ghi ra file .wav
//   Trình duyệt: const buf = ctx.createBuffer(1, pcm.length, SR); buf.copyToChannel(pcm, 0);
// Xuất cả bộ ra assets/sfx/*.wav: node tools/sfx.mjs

export const SR = 44100;

// ---------- ngẫu nhiên có seed ----------
function mulberry32(seed) {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

// ---------- khối DSP cơ bản ----------
const len = (sec) => Math.max(1, Math.round(sec * SR));
const buf = (sec) => new Float32Array(len(sec));

function noise(sec, r) { const b = buf(sec); for (let i = 0; i < b.length; i++) b[i] = r() * 2 - 1; return b; }

// Dao động có tần số thay đổi: f(u) với u = 0..1 dọc thời lượng. shape: sine | square | saw | tri
function osc(sec, f, shape = 'sine') {
  const b = buf(sec), n = b.length, F = typeof f === 'function' ? f : () => f;
  let ph = 0;
  for (let i = 0; i < n; i++) {
    ph += F(i / n) / SR;
    const p = ph - Math.floor(ph);
    b[i] = shape === 'sine' ? Math.sin(p * 2 * Math.PI)
      : shape === 'square' ? (p < 0.5 ? 1 : -1)
      : shape === 'saw' ? p * 2 - 1
      : 1 - 4 * Math.abs(p - 0.5);
  }
  return b;
}

// Bộ lọc biquad RBJ; freq có thể là hàm f(u) → lọc quét (cập nhật hệ số mỗi 32 mẫu)
function biquad(x, type, freq, q = 0.707) {
  const n = x.length, y = new Float32Array(n), F = typeof freq === 'function' ? freq : () => freq;
  let b0, b1, b2, a1, a2, x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  const coef = (f) => {
    const w = 2 * Math.PI * Math.min(Math.max(f, 10), SR * 0.45) / SR, c = Math.cos(w), al = Math.sin(w) / (2 * q);
    let B0, B1, B2;
    if (type === 'lp') { B0 = (1 - c) / 2; B1 = 1 - c; B2 = (1 - c) / 2; }
    else if (type === 'hp') { B0 = (1 + c) / 2; B1 = -(1 + c); B2 = (1 + c) / 2; }
    else { B0 = al; B1 = 0; B2 = -al; } // bp
    const A0 = 1 + al;
    b0 = B0 / A0; b1 = B1 / A0; b2 = B2 / A0; a1 = -2 * c / A0; a2 = (1 - al) / A0;
  };
  for (let i = 0; i < n; i++) {
    if (i % 32 === 0) coef(F(i / n));
    const v = b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v;
  }
  return y;
}

// Đường bao: tấn công tuyến tính (giây) rồi tắt dần mũ (thời gian giảm 60 dB ≈ decay giây)
function env(x, attack = 0.002, decay = 0.3, hold = 0) {
  const a = len(attack), h = len(hold), k = Math.log(1000) / (decay * SR);
  for (let i = 0; i < x.length; i++) {
    const g = i < a ? i / a : i < a + h ? 1 : Math.exp(-k * (i - a - h));
    x[i] *= g;
  }
  return x;
}
// Đường bao hình chuông theo u (0..1), đỉnh ở peak
function bell(x, peak = 0.5, sharp = 2) {
  const n = x.length;
  for (let i = 0; i < n; i++) {
    const u = i / n, d = u < peak ? u / peak : (1 - u) / (1 - peak);
    x[i] *= Math.pow(Math.max(d, 0), sharp);
  }
  return x;
}
function gain(x, g) { for (let i = 0; i < x.length; i++) x[i] *= g; return x; }
function sat(x, drive = 2) { const k = Math.tanh(drive); for (let i = 0; i < x.length; i++) x[i] = Math.tanh(x[i] * drive) / k; return x; }
function mix(total, ...parts) { // parts: [buffer, offsetSec, gain]
  const out = buf(total);
  for (const [b, off = 0, g = 1] of parts) {
    const o = len(off) - (off === 0 ? 1 : 0);
    for (let i = 0; i < b.length && o + i < out.length; i++) out[o + i] += b[i] * g;
  }
  return out;
}
function fade(x, sec = 0.005) { const f = len(sec); for (let i = 0; i < f && i < x.length; i++) { x[i] *= i / f; x[x.length - 1 - i] *= i / f; } return x; }
function normalize(x, peak = 0.9) {
  let m = 0; for (const v of x) m = Math.max(m, Math.abs(v));
  return m > 0 ? gain(x, peak / m) : x;
}
// Chuông/kim loại: tổng các mode (tỉ lệ tần số, thời gian tắt)
function modal(sec, f0, modes, r) {
  const parts = modes.map(([ratio, dec, g]) => [env(osc(sec, f0 * ratio * (1 + (r() - 0.5) * 0.004)), 0.001, dec), 0, g]);
  return mix(sec, ...parts);
}

// ---------- thư viện âm thanh ----------
// Mỗi hàm nhận r() (ngẫu nhiên có seed) và v (số biến thể) → Float32Array
const LIB = {
  pop: (r) => mix(0.15, [env(osc(0.15, (u) => 900 * Math.pow(0.22, u)), 0.001, 0.09)], [env(biquad(noise(0.02, r), 'hp', 3000), 0.0005, 0.01), 0, 0.3]),
  click: (r) => env(biquad(noise(0.03, r), 'hp', 2500), 0.0003, 0.012),
  beep: () => env(osc(0.14, 1000), 0.003, 0.4, 0.09),
  ding: (r, v) => modal(1.6, 1320 * (1 + v * 0.12), [[1, 1.3, 1], [2.76, 0.6, 0.45], [5.4, 0.3, 0.25], [8.93, 0.15, 0.12]], r),
  coin: () => mix(0.45, [env(sat(osc(0.08, 988, 'square'), 1), 0.001, 0.4, 0.06), 0, 0.5], [env(osc(0.37, 1319, 'square'), 0.001, 0.35), 0.075, 0.5]),
  whoosh: (r) => bell(biquad(noise(0.55, r), 'bp', (u) => 300 + 2600 * Math.sin(Math.PI * u), 1.2), 0.45, 1.6),
  rise: (r) => {
    const n = bell(biquad(noise(1.6, r), 'bp', (u) => 200 * Math.pow(30, u), 2), 0.95, 2);
    const t = bell(osc(1.6, (u) => 120 * Math.pow(8, u), 'saw'), 0.95, 2);
    return mix(1.6, [n, 0, 1], [biquad(t, 'lp', 3000), 0, 0.25]);
  },
  footstep: (r) => {
    const p = 0.85 + r() * 0.3;
    return mix(0.15, [env(osc(0.12, (u) => 95 * p * Math.pow(0.55, u)), 0.002, 0.07)], [env(biquad(noise(0.08, r), 'lp', 1400 * p), 0.001, 0.04), 0, 0.6]);
  },
  jump: () => env(biquad(osc(0.2, (u) => 280 * Math.pow(3.2, u), 'square'), 'lp', 3500), 0.003, 0.18, 0.05),
  land: (r) => mix(0.3, [env(osc(0.25, (u) => 70 * Math.pow(0.6, u)), 0.002, 0.18)], [env(biquad(noise(0.2, r), 'lp', 600), 0.002, 0.1), 0, 0.8]),
  thud: (r) => sat(mix(0.6, [env(biquad(noise(0.5, r), 'lp', 220), 0.002, 0.35)], [env(osc(0.5, 58), 0.002, 0.4), 0, 0.8]), 2),
  boom: (r) => sat(mix(2.2, [env(biquad(noise(2.2, r), 'lp', (u) => 900 * Math.pow(0.08, u)), 0.004, 1.6), 0, 1], [env(osc(2.2, (u) => 55 - 15 * u), 0.004, 1.3), 0, 0.9]), 2.5),
  laser: () => env(osc(0.3, (u) => 1800 * Math.pow(0.1, u), 'saw'), 0.001, 0.25),
  error: () => {
    const z = () => env(biquad(mix(0.16, [osc(0.16, 180, 'saw')], [osc(0.16, 186, 'saw')]), 'lp', 2200), 0.003, 0.5, 0.11);
    return mix(0.42, [z(), 0, 0.5], [z(), 0.22, 0.5]);
  },
  sparkle: (r) => {
    const parts = [];
    for (let i = 0; i < 9; i++) parts.push([env(osc(0.3, 2400 + r() * 2600), 0.001, 0.12 + r() * 0.15), r() * 0.55, 0.25 + r() * 0.2]);
    return mix(0.9, ...parts);
  },
  heartbeat: () => {
    const b = () => env(biquad(osc(0.12, (u) => 60 * Math.pow(0.7, u)), 'lp', 200), 0.004, 0.1);
    return mix(0.8, [b(), 0, 1], [b(), 0.2, 0.7]);
  },
  tick: (r) => env(biquad(noise(0.03, r), 'bp', 4200, 4), 0.0003, 0.02),
};

export const SFX_LIST = Object.keys(LIB);
// Âm liên tục (sóng vuông/sine giữ lâu) nghe to hơn → hạ đỉnh cho đều tai
const LEVEL = { beep: 0.45, jump: 0.55, coin: 0.65, error: 0.65 };

// Âm thanh `name`, biến thể `variant` (cùng tên + biến thể → cùng mẫu PCM)
export function renderSfx(name, variant = 0) {
  const f = LIB[name];
  if (!f) throw new Error(`sfx.js: không có âm "${name}". Có: ${SFX_LIST.join(', ')}`);
  const r = mulberry32(hashStr(name) + variant * 7919);
  return normalize(fade(f(r, variant), 0.002), LEVEL[name] ?? 0.9);
}

// PCM 16-bit mono WAV
export function toWav(pcm, sr = SR) {
  const n = pcm.length, out = new Uint8Array(44 + n * 2), d = new DataView(out.buffer);
  const str = (o, s) => { for (let i = 0; i < s.length; i++) out[o + i] = s.charCodeAt(i); };
  str(0, 'RIFF'); d.setUint32(4, 36 + n * 2, true); str(8, 'WAVE');
  str(12, 'fmt '); d.setUint32(16, 16, true); d.setUint16(20, 1, true); d.setUint16(22, 1, true);
  d.setUint32(24, sr, true); d.setUint32(28, sr * 2, true); d.setUint16(32, 2, true); d.setUint16(34, 16, true);
  str(36, 'data'); d.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) d.setInt16(44 + i * 2, Math.max(-1, Math.min(1, pcm[i])) * 32767, true);
  return out;
}
