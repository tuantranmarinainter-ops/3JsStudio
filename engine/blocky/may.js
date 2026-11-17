// MÁY QUAY KIỂU BLOCKY (shot ghi `cam: { bk: {...} }`) — ngữ pháp camera của bộ skill 'blocky-shorts' (In This Town Skill Files,
// engine/js/engine.js frameShot / applyMove / whip / crash / punch / shake; người dùng cho dùng 2026-11-14), nối sang engine của mình.
//   bk = { on: 'hero' | ['a','b'] | [x,y,z] | 'obj:<đạo cụ>',  co: cỡ cảnh (extreme|close|medium|cowboy|full|wide|establishing hoặc tên Việt),
//          goc: 'eye'|'low'|'high'|'top'|'worm',  from: 'front'|'front-left'|'front-right'|'left'|'right'|'behind'… hoặc độ,  side: độ lệch thêm (10),
//          yaw: độ tuyệt đối (bỏ qua hướng chủ thể),  move: push|pull|static|zoom-in|zoom-out|crane-up|crane-down|track-left|track-right|orbit-left|orbit-right|handheld,
//          amount, ease: inout|in|out|linear,  look: [dx,dy,dz] chỉnh tâm nhìn,  offset: [dx,dy,dz] chỉnh máy,  fov (50), roll (độ, nghiêng Hà Lan),
//          whip: { to, at, dur (.26), co, from, goc, move },  crash: { at, dur (.36), co ('close'), on } }
//   fx của shot (shot.bfx): [{ punch: .2, t }, { shake: .12, t, dur: .28 }] — t = giây từ đầu shot.
// CO = BẢNG CỠ CẢNH DUY NHẤT của engine (hiệu chỉnh cho R6: chân 0–2, thân 2–4, đầu 4–5.2): S = chiều cao khung (stud), y = độ cao tâm nhìn tính từ chân.
//   Cả `cam.bk.co` lẫn trường `co:` của loại shot cũ (engine/blocky/co-canh.js → apCoCanh) đều đọc bảng này qua frameShot. Tên Việt = bí danh (VN).
// Hàm thuần của (bk, vị trí chủ thể, local): tua tới/lui ra cùng hình. Không import three → chạy được trong node test.
export const CO = { extreme: { S: 1.8, y: 4.6 }, close: { S: 3.8, y: 4.3 }, medium: { S: 4.6, y: 3.9 }, cowboy: { S: 6, y: 3.4 }, full: { S: 8, y: 2.9 }, wide: { S: 14, y: 4.5 }, establishing: { S: 28, y: 7 } };
export const VN = { cucCan: 'extreme', can: 'close', trung: 'medium', ngangDui: 'cowboy', toanThan: 'full', rong: 'wide', toanCanh: 'establishing' };
const FROM = { front: 0, 'front-left': -35, 'front-right': 35, left: -80, right: 80, behind: 180, back: 180, 'behind-left': -150, 'behind-right': 150 };
const AMT = { push: .22, pull: .22, static: 0, 'zoom-in': .2, 'zoom-out': .2, 'crane-up': .5, 'crane-down': .5, 'track-left': .5, 'track-right': .5, 'orbit-left': .5, 'orbit-right': .5, handheld: 1 };
const ASPECT = 9 / 16;
export const E = {
  linear: (t) => t, in: (t) => t * t * t, out: (t) => 1 - Math.pow(1 - t, 3),
  inout: (t) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
};
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const inv = (a, b, x) => (b === a ? (x >= b ? 1 : 0) : clamp((x - a) / (b - a)));
const rad = (d) => d * Math.PI / 180;
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const mix = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
export const CO_BK = [...Object.keys(CO), ...Object.keys(VN)];

/** Khung tĩnh (hàm khung DUY NHẤT cho cỡ cảnh): neo(ref) → { feet:[x,y,z], yaw: rad } | null. Trả { pos, look, fov, S }. */
export function frameShot(spec, neo) {
  const list = Array.isArray(spec.on) && typeof spec.on[0] !== 'number' ? spec.on : [spec.on];
  const tg = [];
  for (const o of list) {
    if (o == null) continue;
    if (Array.isArray(o)) { tg.push({ feet: [o[0], o[1], o[2]], yaw: 0, diem: true }); continue; }   // điểm = tâm nhìn
    const a = neo(o); if (a) tg.push(a);
  }
  if (!tg.length) tg.push({ feet: [0, 0, 0], yaw: 0 });
  const feet = mul(tg.reduce((s, x) => add(s, x.feet), [0, 0, 0]), 1 / tg.length);
  let spread = 0; for (const a of tg) for (const b of tg) spread = Math.max(spread, Math.hypot(a.feet[0] - b.feet[0], a.feet[2] - b.feet[2]));
  const size = CO[VN[spec.co] || spec.co] || CO.full;
  let S = size.S; if (tg.length > 1) S = Math.max(S, (spread + 4.6) / ASPECT);
  if (spec.spread) S = Math.max(S, (spec.spread + 4.6) / ASPECT);   // khoảng cách người cho sẵn (loại shot cũ: apCoCanh) — chỉ nới khung, không hạ tâm nhìn
  if (spec.S) S = spec.S;   // ghi đè chiều cao khung (stud) khi cỡ cảnh tự tính quá rộng / quá chật
  const fov = spec.fov ?? 50;
  const d = (S / 2) / Math.tan(rad(fov / 2));
  const look = tg.length === 1 && tg[0].diem ? [...feet] : [feet[0], feet[1] + (tg.length > 1 && S > size.S ? Math.min(size.y, 2.9) : size.y), feet[2]];
  const base = spec.yaw != null ? spec.yaw : (tg.length === 1 ? tg[0].yaw * 180 / Math.PI : 0);
  const yaw = base + (typeof spec.from === 'number' ? spec.from : FROM[spec.from || 'front'] ?? 0) + (spec.side ?? 10);
  const ang = spec.goc || 'eye';
  const dy = { eye: .06 * d, low: -.42 * d, high: .5 * d, top: 1.1 * d, worm: -(look[1] - feet[1]) + .5 }[ang] ?? .06 * d;
  let camY = look[1] + dy; if (ang === 'low') camY = Math.max(feet[1] + .7, camY);
  const horiz = Math.sqrt(Math.max(d * d * .25, d * d - (camY - look[1]) ** 2));
  let pos = [look[0] + Math.sin(rad(yaw)) * horiz, camY, look[2] + Math.cos(rad(yaw)) * horiz];
  let lk = look;
  if (spec.look) lk = add(lk, spec.look);
  if (spec.offset) pos = add(pos, spec.offset);
  return { pos, look: lk, fov, S };
}

/** Chuyển động máy trong cả shot: u = tiến độ 0..1. */
export function applyMove(F, spec, u, local = 0) {
  const move = spec.move || 'push', a = spec.amount ?? AMT[move] ?? .2;
  const e = (E[spec.ease || 'inout'] || E.inout)(clamp(u));
  const off = sub(F.pos, F.look), L = Math.hypot(off[0], off[2]) || 1;
  const perp = [off[2] / L, 0, -off[0] / L];
  const R = { pos: [...F.pos], look: [...F.look], fov: F.fov, S: F.S };
  switch (move) {
    case 'push': case 'static': R.pos = add(F.look, mul(off, lerp(1 + a / 2, 1 - a / 2, e))); break;
    case 'pull': R.pos = add(F.look, mul(off, lerp(1 - a / 2, 1 + a / 2, e))); break;
    case 'zoom-in': R.fov = F.fov * lerp(1 + a / 2, 1 - a / 2, e); break;
    case 'zoom-out': R.fov = F.fov * lerp(1 - a / 2, 1 + a / 2, e); break;
    case 'crane-up': case 'crane-down': { const k = a * F.S * .5 * (move === 'crane-up' ? 1 : -1); R.pos[1] = Math.max(.4, R.pos[1] + lerp(-k, k, e)); R.look[1] += lerp(-k, k, e) * .25; break; }
    case 'track-left': case 'track-right': { const k = a * F.S * .9 * (move === 'track-right' ? 1 : -1); const o = mul(perp, lerp(-k, k, e)); R.pos = add(R.pos, o); R.look = add(R.look, o); break; }
    case 'orbit-left': case 'orbit-right': { const g = rad(a * 45) * (move === 'orbit-right' ? 1 : -1) * lerp(-1, 1, e); const c = Math.cos(g), s = Math.sin(g); R.pos = add(F.look, [off[0] * c + off[2] * s, off[1], -off[0] * s + off[2] * c]); break; }
    case 'handheld': { const n = (f, p) => Math.sin(local * f + p) * .5 + Math.sin(local * f * 1.7 + p * 2) * .3; const k = .05 * a * F.S / 4; R.pos = add(R.pos, [n(1.3, 0) * k, n(1.1, 2) * k, n(.9, 4) * k]); break; }
  }
  return R;
}

/** Máy tại giờ local (giây từ đầu shot). o = { neo, dur, fx (shot.bfx), move (true = có chuyển động / whip / crash), punch (true = có punch + rung) }. */
export function mayBlocky(bk, { neo, local = 0, dur = 1, fx = [], move = true, punch = true } = {}) {
  const u = clamp(local / Math.max(1e-3, dur));
  const spec = move ? bk : { ...bk, move: 'static' };
  let F = applyMove(frameShot(spec, neo), spec, u, local);
  let settle = 0;
  if (move && bk.whip) {
    const w = bk.whip, t0 = w.at ?? 0, wd = w.dur ?? .26;
    const ws = { ...bk, ...w, on: w.to ?? w.on, move: w.move || 'push' };
    const B = applyMove(frameShot(ws, neo), ws, u, local);
    const k = E.inout(inv(t0, t0 + wd, local));
    if (k > 0) { F = { ...F, pos: mix(F.pos, B.pos, k), look: mix(F.look, B.look, k), fov: lerp(F.fov, B.fov, k) * (1 + .12 * Math.sin(k * Math.PI)) }; }
  }
  if (move && bk.crash) {
    const c = bk.crash, t0 = c.at ?? dur * .6, cd = c.dur ?? .36;
    const C = frameShot({ ...bk, on: c.on ?? bk.on, co: c.co || 'close', goc: 'eye', from: c.from ?? bk.from }, neo);
    const k = E.in(inv(t0, t0 + cd, local));
    if (k > 0) {
      const y = lerp(F.pos[1], C.pos[1], Math.pow(k, 3));
      const p = mix(F.pos, C.pos, k); p[1] = Math.max(y, C.pos[1]);
      F = { ...F, pos: p, look: mix(F.look, C.look, k), fov: lerp(F.fov, C.fov * .95, k) };
      if (local > t0 + cd) { const st = local - t0 - cd; settle = .06 * Math.exp(-st * 10) * Math.sin(st * 60); }
    }
  }
  let fov = F.fov, shake = 0;
  if (punch) for (const f of fx || []) {
    const t0 = f.t ?? 0; if (local < t0) continue;
    if (f.punch != null) fov *= 1 - (f.punch === true ? .2 : f.punch) * E.out(clamp((local - t0) / .13));
    if (f.shake != null) { const sd = f.dur ?? .28, k = (local - t0) / sd; if (k < 1) shake += (f.shake === true ? .1 : f.shake) * Math.pow(1 - k, 2); }
  }
  let pos = [...F.pos];
  if (settle) pos[1] += settle;
  if (shake) { pos[0] += Math.sin(local * 97.3) * shake + Math.sin(local * 41.1) * shake * .6; pos[1] += Math.sin(local * 83.7 + 1) * shake; }
  const roll = (bk.roll || 0) * Math.PI / 180 + (shake ? Math.sin(local * 61.7) * shake * .04 : 0);
  const tam = bk.look ? sub(F.look, bk.look) : F.look;   // chủ thể (tâm nhìn trước khi lệch `look`) — né tường chiếu tia tới đây
  return { pos, look: F.look, fov, roll, shake, tam };
}
