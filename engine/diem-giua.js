// diem-giua.js — nội suy ĐẦU → GIỮA → CUỐI cho camera / nhân vật / đạo cụ của shot (hàm thuần, không phụ thuộc three.js).
//
// Đường cong: parabol (đa thức bậc hai, = Bézier bậc hai) đi qua đúng 3 điểm
//   u = 0 → a,  u = um → m,  u = 1 → b.
// Vì là MỘT đa thức nên liên tục cả vị trí lẫn vận tốc ở mọi u: không gãy, không giật ở điểm giữa.
// Cú nhảy (a = b trên mặt đất, m ở trên cao) ra đúng quỹ đạo ném.
//
// Dùng trong engine/shots.js: u = tiến độ shot SAU easing (ke); um = moc(tm, easeFn) = easing của `tm`
// → điểm giữa rơi đúng lúc tiến độ thời gian của shot bằng `tm` (mặc định 0,5), easing của shot vẫn được tôn trọng.

const UM_MIN = 0.05, UM_MAX = 0.95;   // điểm giữa sát mép → hệ số bậc hai bùng nổ; kẹp lại

/** Mốc của điểm giữa trên trục tiến độ đã ease. tm = tiến độ thời gian (0..1, mặc định 0,5). */
export function moc(tm = 0.5, easeFn = null) {
  const u = easeFn ? easeFn(Math.min(1, Math.max(0, tm))) : tm;
  return Math.min(UM_MAX, Math.max(UM_MIN, u));
}

/** Số: qua a (u=0), m (u=um), b (u=1). */
export function qua1(a, m, b, u, um = 0.5) {
  const w0 = ((u - um) * (u - 1)) / um;                 // (0−um)(0−1) = um
  const wm = (u * (u - 1)) / (um * (um - 1));
  const w1 = (u * (u - um)) / (1 - um);
  return a * w0 + m * wm + b * w1;
}

/** Điểm [x,y,z]: qua a, m, b. */
export function qua3(a, m, b, u, um = 0.5) {
  const w0 = ((u - um) * (u - 1)) / um, wm = (u * (u - 1)) / (um * (um - 1)), w1 = (u * (u - um)) / (1 - um);
  return [a[0] * w0 + m[0] * wm + b[0] * w1, a[1] * w0 + m[1] * wm + b[1] * w1, a[2] * w0 + m[2] * wm + b[2] * w1];
}

const lerp3 = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];

/** Camera tuyệt đối của shot: c = { p, l, fov, p2, l2, fov2, pm, lm, fovm, tm }, ke = tiến độ đã ease, easeFn = easing của shot (để đặt mốc tm).
 *  Không có pm/lm/fovm ⇒ đúng công thức cũ từng số (p→p2, l→l2, fov→fov2). Thiếu p2/l2/fov2 mà có điểm giữa ⇒ cuối = đầu. */
export function mayTuyetDoi(c, ke, easeFn = null) {
  let pos = c.p2 ? lerp3(c.p, c.p2, ke) : c.p, look = c.l2 ? lerp3(c.l, c.l2, ke) : c.l;
  let fov = c.fov2 ? c.fov + (c.fov2 - c.fov) * ke : c.fov || 40;
  if (c.pm || c.lm || c.fovm !== undefined) {
    const um = moc(c.tm ?? 0.5, easeFn);
    if (c.pm) pos = qua3(c.p, c.pm, c.p2 || c.p, ke, um);
    if (c.lm) look = qua3(c.l, c.lm, c.l2 || c.l, ke, um);
    if (c.fovm !== undefined) fov = qua1(c.fov || 40, c.fovm, c.fov2 || c.fov || 40, ke, um);
  }
  return { pos, look, fov };
}

/** Vị trí diễn viên / đạo cụ: s = { at, to, atm, tm }. Không có atm ⇒ công thức cũ (at→to, hoặc at). Có atm mà không có to ⇒ về lại at (nhảy tại chỗ). */
export function viTri(s, ke, easeFn = null) {
  if (s.atm) return qua3(s.at, s.atm, s.to || s.at, ke, moc(s.tm ?? 0.5, easeFn));
  return s.to ? lerp3(s.at, s.to, ke) : s.at || [0, 0, 0];
}

/** Hướng thân diễn viên: s = { ry, ry2, rym, tm }. Không có rym ⇒ công thức cũ (có thể trả undefined: engine tự lấy hướng đi). */
export function huongThan(s, ke, easeFn = null) {
  if (s.rym !== undefined) return qua1(s.ry ?? 0, s.rym, s.ry2 ?? s.ry ?? 0, ke, moc(s.tm ?? 0.5, easeFn));
  return s.ry2 !== undefined ? (s.ry ?? 0) + (s.ry2 - (s.ry ?? 0)) * ke : s.ry;
}
