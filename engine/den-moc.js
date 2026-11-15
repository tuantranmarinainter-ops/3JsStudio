// den-moc.js — ĐÈN THEO MỐC (shot.lightCues): đổi cường độ/màu của các đèn SẴN CÓ (hemi, sun, đèn điểm dùng chung 'interior_point', IBL) theo giây của shot.
// Hàm THUẦN của t (không giờ thực, không random) → tua tới/lui ra cùng kết quả. Không tạo đèn mới → không dịch lại shader.
// Cú pháp (mỗi mốc 1 object; trường không ghi thì GIỮ giá trị của mốc trước; trước mốc đầu = mặc định của env):
//   lightCues: [
//     { at: 0.0, pool: 0, hemi: 0.15, sun: 0.1, env: 0.5, poolColor: 'am', hemiColor: 'lanh', sunColor: 'lanh' },  // phòng gần tối
//     { at: 1.2, pool: 1, flick: true },                                // bật đèn có CHỚP (1 → 0,25 → 1, mỗi nấc 2 khung)
//     { at: 2.0, hemi: 0.6, fade: 0.4 },                                // fade: chuyển mượt (smoothstep) trong 0,4 s; không ghi = đổi bậc thang ngay
//   ]
//   at = giây TRONG shot. pool/hemi/sun/env = HỆ SỐ nhân lên cường độ gốc (1 = như cũ; env = IBL scene.environmentIntensity).
//   *Color = tên trong BANG_MAU ('am' | 'lanh' | …), '#hex', hoặc [r,g,b] tuyến tính; 'goc' = trả về màu gốc của env.
// Quy ước màu (học bộ Blender 2.5D): nguồn gần tay (đèn bàn, cửa sổ, đèn đường) ẤM ≈ (1.0,0.7,0.4); trăng / ambient LẠNH ≈ (0.55,0.62,1.0).
export const BANG_MAU = {
  am: [1.0, 0.7, 0.4],        // đèn thực dụng ~2500K
  amNhat: [1.0, 0.78, 0.6],   // fill ấm dịu
  lanh: [0.55, 0.62, 1.0],    // trăng / ambient ~9000K
  lanhTrang: [0.85, 0.9, 1.0],// đèn sân khấu / pha
};
export const CHOP = [1, 0.25, 1];   // chớp "bật đèn": nấc 0 (2 khung) = 1, nấc 1 (2 khung) = 0,25, rồi 1
const KEYS = ['pool', 'hemi', 'sun', 'env'], CKEYS = ['poolColor', 'hemiColor', 'sunColor'];
const sstep = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };

// → danh sách trạng thái đã "trải" (carry-forward) theo thứ tự at; dùng lại được (tính 1 lần cho mỗi shot)
export function trai(cues) {
  const base = { pool: 1, hemi: 1, sun: 1, env: 1, poolColor: null, hemiColor: null, sunColor: null };
  const out = []; let cur = base;
  for (const c of [...cues].sort((a, b) => a.at - b.at)) {
    const s = { ...cur, at: c.at, fade: c.fade || 0, flick: c.flick ? KEYS.filter((k) => typeof c[k] === 'number' && c[k] !== cur[k]) : [] };
    for (const k of KEYS) if (typeof c[k] === 'number') s[k] = c[k];
    for (const k of CKEYS) if (c[k] !== undefined) s[k] = c[k] === 'goc' ? null : c[k];
    out.push(s); cur = s;
  }
  return { base, cues: out };
}

export function mauRGB(m) {   // tên | '#hex' | [r,g,b] → [r,g,b] tuyến tính (hex qua THREE ở nơi gọi: trả null để nơi gọi dùng .set)
  if (Array.isArray(m)) return m;
  if (typeof m === 'string' && BANG_MAU[m]) return BANG_MAU[m];
  return null;
}

// Trạng thái tại giây tl (trong shot) → { pool, hemi, sun, env, poolColor, hemiColor, sunColor }; màu rời rạc (không nội suy) — đổi cùng mốc
export function danhGia(cuesOrTrai, tl, fps = 30) {
  const T = cuesOrTrai.cues ? cuesOrTrai : trai(cuesOrTrai);
  let i = -1; for (let j = 0; j < T.cues.length; j++) if (T.cues[j].at <= tl + 1e-9) i = j; else break;
  if (i < 0) return { ...T.base };
  const c = T.cues[i], prev = i > 0 ? T.cues[i - 1] : T.base, r = { ...c };
  const d = tl - c.at;
  for (const k of KEYS) {
    let v = c[k];
    if (c.fade > 0 && d < c.fade) v = prev[k] + (c[k] - prev[k]) * sstep(d / c.fade);
    if (c.flick.includes(k)) { const n = Math.floor(d * fps + 1e-6); v = c[k] * (n >= 2 && n < 4 ? CHOP[1] : 1); }
    r[k] = v;
  }
  return r;
}
