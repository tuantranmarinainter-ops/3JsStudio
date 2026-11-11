// seaweather.js — THANG THỜI TIẾT BIỂN dùng lại cho mọi tập: từ lặng đẹp → phức tạp → giông bão. Dữ liệu thuần + hàm thuần của t.
//
//   Shot:  { env: 'sea', seaWeather: 'giong' }                                   // 1 preset
//          { env: 'storm', seaWeather: { from: 'gio-nhe', to: 'giong', ease: 'inout', win: [0.2, 0.9] } }   // chuyển trong shot
//          { seaWeather: { base: 'nang', amp: 1.1, rain: 0.3 } }                 // preset + ghi đè vài trường
//   engine/shots.js đọc trường này (ô FX "seaWx" bật/tắt), envs.use() gọi applySeaWeather sau env.update.
//   Env 'sea' (engine/envs/openSea.js) dựng biển + mưa + chớp chỉ từ preset — tập mới không cần viết env.
//
//   resolveSeaWeather(spec, k) → W  (k = tiến độ shot 0..1; số + màu nội suy; mưa/chớp mờ dần theo cường độ)
//   applySeaWeather(e, W, t, ctx)  → đặt màu/bọt/gió nước (e.sea), mưa (e.rain), chớp (e.bolt + ctx.flash), ánh sáng (ctx.light/lightOverride)
//   resetSeaWeather(e) + preSeaWeather(e, W) → mỗi khung TRƯỚC env.update: trả env về như lúc dựng, rồi đặt độ xiên mưa
//
// Trường của 1 preset (mọi trường tuỳ chọn trừ id/light):
//   water   preset sóng gợi ý khi env tự dựng (engine/water.js WATER_PRESETS) — env 'sea' dùng 1 bộ sóng 'deep' cho mọi preset
//   amp     biên độ sóng (stud, tuyệt đối — như createWater amp) · steep = độ nhọn × · speed = nhịp đồng hồ biển (t biển = t·speed)
//   look    { shallow, deep, sss, foam, foamLo, foamHi, foamAmt, glint, detail, skyMix, sssK }  (bọt: lo/hi thấp ⇒ nhiều bọt hơn)
//   light   khoá LIGHTS (engine/envs.js) · sky = ghi đè LIGHTS { top, bottom, fog, fogR, hemi, sun, dir, exposure }
//   rain    0..1 phần số hạt mưa · wind { dir (độ, xoay hướng sóng), k 0..1 (cat's-paw + mưa xiên) }
//   lightning 0 | 'rare' | 'frequent' | { every, seed, peak } (engine/flash.js smoothFlash) · spray 0..1 (sương muối: kéo sương mù lại gần)
//   float   hệ số phản ứng vật nổi (× pitchK/rollK/maxPitch/maxRoll của floatHull) · night (0..1, theo light nếu bỏ)
import { smoothFlash } from './flash.js';
import { LIGHTS } from './lights.js';

const BOLT = { 0: { every: 3.1, seed: 3, peak: 0 }, off: { every: 3.1, seed: 3, peak: 0 }, rare: { every: 6.5, seed: 5, peak: 0.7 }, frequent: { every: 3.1, seed: 3, peak: 0.85 } };

export const SEA_WEATHER = [
  { id: 'lang', en: 'glassy calm dawn', water: 'tropical', amp: 0.16, steep: 0.6, speed: 0.8, float: 0.5,
    look: { shallow: '#62b9c9', deep: '#1d5a85', sss: '#ffd7b0', foam: '#ffffff', foamLo: 0.6, foamHi: 0.95, foamAmt: 0.25, glint: 1.35, detail: 0.22, skyMix: 0.78, sssK: 0.5 },
    light: 'beach', sky: { top: '#6c8cc8', bottom: '#ffd3ad', fog: '#f4d6bf', fogR: [200, 900], hemi: ['#ffe9d8', '#6a7f9a', 1.1], sun: ['#ffc596', 2.1], dir: [-0.8, 0.32, 0.5], exposure: 1.0 },
    rain: 0, wind: { dir: 0, k: 0.05 }, lightning: 0, spray: 0 },
  { id: 'nang', en: 'sunny tropical, clear blue (≈ env ocean)', water: 'deep', amp: 0.6, steep: 1, speed: 1, float: 1,
    look: { shallow: '#1f9fd0', deep: '#06557f', sss: '#62d6ff', foam: '#ffffff', foamLo: 0.45, foamHi: 0.85, foamAmt: 0.7, glint: 1.1, detail: 0.5, skyMix: 0.72, sssK: 0.7 },
    light: 'ocean', rain: 0, wind: { dir: 0, k: 0.3 }, lightning: 0, spray: 0 },
  { id: 'gio-nhe', en: 'breezy, whitecaps start', water: 'deep', amp: 0.95, steep: 1.15, speed: 1.1, float: 1.1,
    look: { shallow: '#2aa2c8', deep: '#0a4f78', sss: '#6fd4f0', foam: '#ffffff', foamLo: 0.36, foamHi: 0.72, foamAmt: 0.85, glint: 1.0, detail: 0.7, skyMix: 0.72, sssK: 0.65 },
    light: 'beach', sky: { fogR: [170, 760] }, rain: 0, wind: { dir: 12, k: 0.5 }, lightning: 0, spray: 0.15 },
  { id: 'u-am', en: 'overcast grey-green, choppier', water: 'deep', amp: 1.25, steep: 1.12, speed: 1.15, float: 1.15,
    look: { shallow: '#3f7d7a', deep: '#16343f', sss: '#7fb0a4', foam: '#eef3f2', foamLo: 0.32, foamHi: 0.68, foamAmt: 0.85, glint: 0.35, detail: 0.75, skyMix: 0.85, sssK: 0.45 },
    light: 'day', sky: { top: '#7d8a96', bottom: '#c3ccd2', fog: '#b7c0c6', fogR: [120, 560], hemi: ['#dfe6ea', '#55606a', 1.3], sun: ['#e8eef2', 1.2], dir: [0.3, 1, 0.4], exposure: 1.05 },
    rain: 0, wind: { dir: 20, k: 0.6 }, lightning: 0, spray: 0.25 },
  { id: 'mua', en: 'rain, steady', water: 'deep', amp: 1.35, steep: 1.1, speed: 1.2, float: 1.15,
    look: { shallow: '#3a6c70', deep: '#132b36', sss: '#6f9a96', foam: '#e6eceb', foamLo: 0.32, foamHi: 0.66, foamAmt: 0.85, glint: 0.2, detail: 0.9, skyMix: 0.88, sssK: 0.4 },
    light: 'day', sky: { top: '#5e6a78', bottom: '#9aa6b0', fog: '#8c98a2', fogR: [80, 420], hemi: ['#c8d2da', '#3e4850', 1.35], sun: ['#d0d8e0', 0.9], dir: [0.3, 1, 0.4], exposure: 1.1 },
    rain: 0.6, wind: { dir: 25, k: 0.6 }, lightning: 0, spray: 0.4 },
  { id: 'giong', en: 'squall: dark, gusty, rain + occasional lightning', water: 'storm', amp: 1.8, steep: 1.15, speed: 1.3, float: 1.2,
    look: { shallow: '#23505f', deep: '#0b1f2e', sss: '#5f9a9a', foam: '#e6eef4', foamLo: 0.26, foamHi: 0.6, foamAmt: 0.95, glint: 0.6, detail: 0.9, skyMix: 0.9, sssK: 0.38 },
    light: 'storm', sky: { top: '#1d2a40', bottom: '#4a5c70', fog: '#3a4a5c', fogR: [60, 340] },
    rain: 0.85, wind: { dir: 30, k: 0.85 }, lightning: 'rare', spray: 0.6 },
  { id: 'bao', en: 'full storm: huge swell, heavy rain, frequent lightning (≈ env storm / shipStorm)', water: 'storm', amp: 2.4, steep: 1, speed: 1.6, float: 1,
    look: { shallow: '#1f4a63', deep: '#081a2c', sss: '#5fa0a0', foam: '#e6eef6', foamLo: 0.22, foamHi: 0.55, foamAmt: 1.0, glint: 0.8, detail: 0.9, skyMix: 0.9, sssK: 0.35 },
    light: 'storm', rain: 1, wind: { dir: 0, k: 1 }, lightning: 'frequent', spray: 0.8 },
  { id: 'dem-trang', en: 'moonlit calm night (≈ env iceSea mặt nước)', water: 'night', amp: 0.25, steep: 0.8, speed: 0.9, float: 0.6,
    look: { shallow: '#1d3566', deep: '#0b1530', sss: '#3a5ea8', foam: '#cfdcff', foamLo: 0.45, foamHi: 0.8, foamAmt: 0.45, glint: 1.4, detail: 0.45, skyMix: 0.95, sssK: 0.2 },
    light: 'night', sky: { top: '#0a1436', bottom: '#2c3d7a', sun: ['#cfdcff', 1.15], dir: [-0.3, 0.6, -0.8] }, rain: 0, wind: { dir: 0, k: 0.1 }, lightning: 0, spray: 0 },
  { id: 'dem-bao', en: 'night storm', water: 'storm', amp: 2.2, steep: 1.05, speed: 1.5, float: 1,
    look: { shallow: '#183a52', deep: '#050f1c', sss: '#4a7f8a', foam: '#d6e0ec', foamLo: 0.22, foamHi: 0.55, foamAmt: 1.0, glint: 0.7, detail: 0.9, skyMix: 0.92, sssK: 0.3 },
    light: 'storm', sky: { top: '#070c1c', bottom: '#1b2742', fog: '#141d33', fogR: [50, 300], exposure: 1.3 },
    rain: 1, wind: { dir: -20, k: 1 }, lightning: { every: 2.6, seed: 11, peak: 0.9 }, spray: 0.8 },
  { id: 'bang', en: 'icy cold sea, pale daylight', water: 'night', amp: 0.3, steep: 0.8, speed: 0.85, float: 0.7,
    look: { shallow: '#5f8fa8', deep: '#15354d', sss: '#a9d8ea', foam: '#eef6ff', foamLo: 0.42, foamHi: 0.8, foamAmt: 0.6, glint: 0.9, detail: 0.4, skyMix: 0.85, sssK: 0.45 },
    light: 'snow', sky: { fog: '#dde9f2', fogR: [110, 520] }, rain: 0, wind: { dir: -10, k: 0.35 }, lightning: 0, spray: 0.2 },
];
export const SEA_WX = Object.fromEntries(SEA_WEATHER.map((p) => [p.id, p]));
// env cũ ↔ preset gần nhất (chỉ để tra; env cũ KHÔNG bị áp preset trừ khi shot ghi seaWeather)
export const ENV_WEATHER = { ocean: 'nang', hawaii: 'nang', island: 'nang', reef: 'nang', storm: 'bao', shipStorm: 'bao', iceSea: 'dem-trang' };

// ---------------- nội suy thuần (không cần THREE) ----------------
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const EASE = { linear: (k) => k, smooth: (k) => k * k * (3 - 2 * k), in: (k) => k * k * k, out: (k) => 1 - Math.pow(1 - k, 3),
  inout: (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2) };
const hex = (s) => { const n = parseInt(s.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const toHex = (c) => '#' + c.map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('');
const isHex = (v) => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);
function mix(a, b, m) {
  if (a === undefined || a === null) return b; if (b === undefined || b === null) return a;
  if (m <= 0) return a; if (m >= 1) return b;
  if (typeof a === 'number' && typeof b === 'number') return a + (b - a) * m;
  if (isHex(a) && isHex(b)) { const x = hex(a), y = hex(b); return toHex(x.map((v, i) => v + (y[i] - v) * m)); }
  if (Array.isArray(a) && Array.isArray(b)) return a.map((v, i) => mix(v, b[i], m));
  if (typeof a === 'object' && typeof b === 'object') { const o = {}; for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) o[k] = mix(a[k], b[k], m); return o; }
  return m < 0.5 ? a : b;
}
const boltOf = (v) => (typeof v === 'object' && v ? { every: 3.1, seed: 3, peak: 0.85, ...v } : BOLT[v || 0] || BOLT.off);

// preset đầy đủ (đã ghép light + sky + giá trị mặc định) từ id | object | { base, …ghi đè }
export function seaPreset(p) {
  if (typeof p === 'string') { if (!SEA_WX[p]) throw new Error(`seaWeather "${p}" không có. Có: ${Object.keys(SEA_WX).join(', ')}`); p = SEA_WX[p]; }
  if (p.base) { const b = seaPreset(p.base); p = { ...b, ...p, look: { ...b.look, ...(p.look || {}) }, sky: { ...(b.sky || {}), ...(p.sky || {}) }, wind: { ...b.wind, ...(p.wind || {}) }, base: undefined }; }
  const L = { ...LIGHTS[p.light || 'ocean'], ...(p.sky || {}) };
  if (p.spray && L.fogR) L.fogR = [L.fogR[0] * (1 - 0.5 * p.spray), L.fogR[1] * (1 - 0.35 * p.spray)];
  return { id: p.id || 'custom', water: p.water || 'deep', amp: p.amp ?? 0.6, steep: p.steep ?? 1, speed: p.speed ?? 1, float: p.float ?? 1, look: p.look || {}, light: p.light || 'ocean', L,
    rain: p.rain ?? 0, wind: { dir: 0, k: 0.3, ...(p.wind || {}) }, bolt: boltOf(p.lightning), spray: p.spray ?? 0, night: p.night ?? L.night ?? 0 };
}

// spec + tiến độ shot k → W (đã nội suy). spec.mix (số cố định) ghi đè tiến độ.
export function resolveSeaWeather(spec, k = 0) {
  if (!spec) return null;
  const tr = typeof spec === 'object' && (spec.from || spec.to);
  const A = seaPreset(tr ? spec.from || spec.to : spec), B = tr ? seaPreset(spec.to || spec.from) : A;
  let m = 0;
  if (tr) { const w = spec.win || [0, 1]; m = spec.mix ?? (EASE[spec.ease] || EASE.smooth)(clamp01((k - w[0]) / Math.max(1e-6, w[1] - w[0]))); }
  const W = { ...(A === B ? A : mix(A, B, m)) };
  W.m = m; W.A = A; W.B = B;
  W.light = m < 0.5 ? A.light : B.light;      // khoá cho IBL + chỉnh màu hậu kỳ (engine/post.js)
  W.speed = (A.speed + B.speed) / 2;          // nhịp đồng hồ CỐ ĐỊNH trong 1 shot (nội suy tốc độ làm pha sóng giật)
  W.night = mix(A.night, B.night, m);
  return W;
}
// chỉ biên độ — rẻ, cho đồng hồ biển (floatHull gọi nhiều lần mỗi khung)
export function seaWeatherAmp(spec, k) { return resolveSeaWeather(spec, k).amp; }

export function lightningAt(W, t) {
  const a = W.A.bolt, b = W.B.bolt;
  const fa = a.peak > 0 ? smoothFlash(t, a) : 0, fb = W.A === W.B ? fa : b.peak > 0 ? smoothFlash(t, b) : 0;
  return fa * (1 - W.m) + fb * W.m;
}

const DEG = Math.PI / 180;
export function resetSeaWeather(e) {
  e.sea?.resetLook?.();
  if (e.rain && e._wxRain) { e.rain.obj.geometry.setDrawRange(0, Infinity); e.rain.obj.material.opacity = e._wxRain.op; e.rain.slant = null; }
}
// trước env.update: những gì env tự dùng trong update (độ xiên mưa theo gió)
export function preSeaWeather(e, W) {
  if (!W || !e.rain) return;
  const a = (W.wind.dir || 0) * DEG, k = 0.12 + 0.5 * W.wind.k;
  e.rain.slant = [Math.cos(a) * k, Math.sin(a) * k * 0.4];
}
// áp W lên env e (sau env.update) — t = t toàn cục; ctx = ctx của envs.use (light, lightOverride, flash)
export function applySeaWeather(e, W, t, ctx = {}) {
  if (!W) return;
  const sea = e.sea;
  if (sea?.water) {
    sea.water.setLook(W.look);
    sea.water.setWind({ dir: (W.wind.dir || 0) * DEG, paw: 0.4 + 1.2 * W.wind.k, steep: W.steep });
  }
  if (e.rain) {
    const g = e.rain.obj.geometry, n = g.attributes.position.count / 2;
    e._wxRain ||= { op: e.rain.obj.material.opacity };
    e.rain.obj.visible = W.rain > 0.01;
    g.setDrawRange(0, Math.round(n * Math.min(1, W.rain)) * 2);
    e.rain.obj.material.opacity = e._wxRain.op * (0.5 + 0.5 * Math.min(1, W.rain));
  }
  const f = lightningAt(W, t);
  ctx.flash = f;
  if (e.bolt) e.bolt.visible = f > 0.4;
  ctx.light = ctx.shotLight || W.light;
  ctx.lightOverride = { ...W.L, ...(ctx.shotLightOverride || {}) };
  return W;
}
