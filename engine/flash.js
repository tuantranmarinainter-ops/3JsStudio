// flash.js — Chớp bão MƯỢT (thay lightning() nhấp nháy 1 → 0.3 → 0.8 mỗi 2 khung gây "giật" hình).
// Cùng nhịp thời điểm với fx.lightning (every/seed) nhưng bao hình: sáng lên trong 1 khung rồi tắt dần mũ
// (~0.35 s ≈ 10 khung), một nhịp phụ nhỏ hơn mềm sau 0.18 s. Hàm thuần của t → tất định.
const hash = (i, s) => { let x = Math.imul(i ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(s + 1, 0xc2b2ae35); x ^= x >>> 13; x = Math.imul(x, 0x27d4eb2f); x ^= x >>> 16; return (x >>> 0) / 4294967296; };
export function smoothFlash(t, { every = 3.1, seed = 3, peak = 0.85 } = {}) {
  const n = Math.floor(t / every), local = t - n * every, at = hash(n, seed) * (every - 0.8);
  const d = local - at; if (d < 0 || d > 0.8) return 0;
  const rise = Math.min(1, d / 0.034);
  const main = rise * Math.exp(-d / 0.11);
  const d2 = d - 0.18, second = d2 > 0 ? Math.min(1, d2 / 0.05) * Math.exp(-d2 / 0.13) * 0.45 : 0;
  return Math.min(1, (main + second) * peak);
}
