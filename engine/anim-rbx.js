// anim-rbx.js — "Nguồn B": emote/animation Roblox THẬT (KeyframeSequence tải theo id, đổi sang khớp R6 bằng `node tools/roblox.mjs anim`).
//   Dữ liệu: assets/nhap/anims/<tên>.json (+ index.json) — chỉ là clip đã đổi trục; KHÔNG chứa mã của ai. Ghi công: assets/nhap/CREDITS.md ([anim/<tên>]) + assets/manifest.json.
//
// DÙNG (cùng định dạng pose của r15.js/r6-rig.js, giống anim-nch.js):
//   import { rbxPose, registerRbx, loadRbxClips, RBX_META } from './anim-rbx.js';
//   const clips = await loadRbxClips('/assets/nhap/anims/');      // trình duyệt: nạp index.json + từng clip (xong hết trước khi tua → window.__ready)
//   registerRbx(clips, R15_ANIMATIONS);                           // thêm 'rbx_<tên>' → char.animate('rbx_wave', t, opt) chạy ngay
//   const pose = rbxPose(t, clips.wave, { speed: 1, loop: undefined });   // hoặc gọi thẳng; trả { body, hips, head, rightArm, leftArm, rightLeg, leftLeg }
// HÀM THUẦN của t: cùng t → cùng pose; không giờ thực, không Math.random. Lặp: t mod dur. Một lần: giữ khung cuối (trước 0 giữ khung đầu).
// opt: speed (nhân t, mặc định 1) · loop (true/false ghi đè clip.loop) · hold (khi một lần: giây giữ cuối — không dùng, chỉ để mở rộng).
//
// ĐỊNH DẠNG CLIP (rbx-anim-1): { dinhDang, nguon:'roblox', id, ten, loop, dur, khop:[…], keys:[{ t, j:{ <khớp>: [qx,qy,qz,qw, px,py,pz, es, ed] } }] }
//   khớp = hips (Torso) · head · rightArm · leftArm · rightLeg · leftLeg. q = xoay của khớp so với tư thế nghỉ (R6 buông thẳng), ĐÃ đổi hệ trục
//   Roblox (mặt −Z) → ta (mặt +Z); p = dịch khung gốc (chỉ dùng cho hips → body). es/ed = PoseEasingStyle/Direction của khung ĐÍCH
//   (Roblox: easing của một Pose điều khiển cách NỘI SUY TỚI pose đó): style 0 Linear · 1 Constant · 2 Elastic · 3 Cubic · 4 Bounce; dir 0 In · 1 Out · 2 InOut.
// Khớp thiếu ở một khung = khung đó không đặt khoá cho khớp ấy → nội suy giữa hai khung CÓ khoá gần nhất (track riêng từng khớp).
// Thân (Torso) quay quanh TÂM thân R6 (y=3) còn bộ xương ta quay quanh hông (y=2): bù bằng body = p + (I − R)·(0,1,0).

const PI = Math.PI, TAU = PI * 2;
const JOINTS = ['hips', 'head', 'rightArm', 'leftArm', 'rightLeg', 'leftLeg'];
export const RBX_META = {};            // tên → { dur, loop, keys, id, ten } (điền khi registerRbx/rbxMeta)

// ---------- easing ----------
const bounceOut = (x) => { const n = 7.5625, d = 2.75; if (x < 1 / d) return n * x * x; if (x < 2 / d) return n * (x -= 1.5 / d) * x + 0.75; if (x < 2.5 / d) return n * (x -= 2.25 / d) * x + 0.9375; return n * (x -= 2.625 / d) * x + 0.984375; };
const IN = [
  (x) => x,                                                                             // 0 Linear
  (x) => (x >= 1 ? 1 : 0),                                                              // 1 Constant (nhảy ở khung đích)
  (x) => (x <= 0 ? 0 : x >= 1 ? 1 : -(2 ** (10 * x - 10)) * Math.sin((x * 10 - 10.75) * (TAU / 3))),   // 2 Elastic
  (x) => x * x * x,                                                                     // 3 Cubic
  (x) => 1 - bounceOut(1 - x),                                                          // 4 Bounce
];
export function ease(x, es = 0, ed = 0) {
  x = x < 0 ? 0 : x > 1 ? 1 : x;
  const f = IN[es] || IN[0];
  if (es === 1) return x >= 1 ? 1 : 0;
  if (ed === 1) return 1 - f(1 - x);
  if (ed === 2) return x < 0.5 ? f(2 * x) / 2 : 1 - f(2 - 2 * x) / 2;
  return f(x);
}

// ---------- quaternion ----------
function slerp(a, b, w) {
  let [ax, ay, az, aw] = a, [bx, by, bz, bw] = b, d = ax * bx + ay * by + az * bz + aw * bw;
  if (d < 0) { bx = -bx; by = -by; bz = -bz; bw = -bw; d = -d; }
  let s0, s1;
  if (d > 0.9995) { s0 = 1 - w; s1 = w; } else { const th = Math.acos(d), sn = Math.sin(th); s0 = Math.sin((1 - w) * th) / sn; s1 = Math.sin(w * th) / sn; }
  const x = ax * s0 + bx * s1, y = ay * s0 + by * s1, z = az * s0 + bz * s1, ww = aw * s0 + bw * s1, n = Math.hypot(x, y, z, ww) || 1;
  return [x / n, y / n, z / n, ww / n];
}
/** quaternion → Euler XYZ đúng quy ước THREE.Euler('XYZ') (r15.js đặt rotation.set(x,y,z)). Trả [x,y,z] rad và ma trận 3×3 (hàng). */
export function quatEuler(q) {
  const [x, y, z, w] = q, x2 = x + x, y2 = y + y, z2 = z + z, xx = x * x2, xy = x * y2, xz = x * z2, yy = y * y2, yz = y * z2, zz = z * z2, wx = w * x2, wy = w * y2, wz = w * z2;
  const m11 = 1 - (yy + zz), m12 = xy - wz, m13 = xz + wy, m22 = 1 - (xx + zz), m23 = yz - wx, m32 = yz + wx, m33 = 1 - (xx + yy);
  const ey = Math.asin(Math.max(-1, Math.min(1, m13)));
  const e = Math.abs(m13) < 0.9999999 ? [Math.atan2(-m23, m33), ey, Math.atan2(-m12, m11)] : [Math.atan2(m32, m22), ey, 0];
  return { e, m: [m11, m12, m13, xy + wz, m22, m23, xz - wy, yz + wx, m33] };
}

// ---------- track theo khớp (dựng 1 lần cho mỗi clip) ----------
const CACHE = new WeakMap();
function tracks(clip) {
  let c = CACHE.get(clip); if (c) return c;
  c = {}; for (const j of JOINTS) c[j] = [];
  for (const k of clip.keys) for (const j of JOINTS) if (k.j && k.j[j]) c[j].push({ t: k.t, v: k.j[j] });
  CACHE.set(clip, c); return c;
}
const ID = [0, 0, 0, 1, 0, 0, 0, 0, 0];
function sampleTrack(tr, tt) {
  if (!tr.length) return ID;
  if (tt <= tr[0].t) return tr[0].v;
  const last = tr[tr.length - 1]; if (tt >= last.t) return last.v;
  let lo = 0, hi = tr.length - 1;                                    // tìm khoảng [lo, lo+1] chứa tt
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (tr[m].t <= tt) lo = m; else hi = m; }
  const A = tr[lo], B = tr[hi], span = B.t - A.t, w = span > 1e-9 ? ease((tt - A.t) / span, B.v[7], B.v[8]) : 1;
  const q = slerp(A.v, B.v, w);
  return [q[0], q[1], q[2], q[3], A.v[4] + (B.v[4] - A.v[4]) * w, A.v[5] + (B.v[5] - A.v[5]) * w, A.v[6] + (B.v[6] - A.v[6]) * w, 0, 0];
}

/** (t giây, clip, opt) → pose r15/r6. Tất định, không NaN. */
export function rbxPose(t, clip, opt = {}) {
  const sp = Number.isFinite(opt.speed) ? opt.speed : 1, loop = opt.loop ?? clip.loop, dur = clip.dur || 0;
  let tt = (Number.isFinite(t) ? t : 0) * sp;
  if (dur > 0) tt = loop ? tt - Math.floor(tt / dur) * dur : Math.min(Math.max(tt, 0), dur);
  else tt = 0;
  const tr = tracks(clip), pose = {};
  for (const j of JOINTS) {
    const v = sampleTrack(tr[j], tt), { e, m } = quatEuler(v);
    pose[j] = { x: e[0], y: e[1], z: e[2] };
    if (j === 'hips') pose.body = { x: v[4] - m[1], y: v[5] + 1 - m[4], z: v[6] - m[7] };   // dịch gốc + bù tâm xoay (tâm thân cao hơn hông 1 stud)
  }
  return pose;
}

export const rbxMeta = (clip) => ({ dur: clip.dur, loop: !!clip.loop, keys: clip.keys.length, id: clip.id, ten: clip.ten, bones: clip.khop || JOINTS });

/** Thêm 'rbx_<tên>' vào bảng R15_ANIMATIONS (như registerNch). clips = { tên: clip }. Trả danh sách tên đã thêm. */
export function registerRbx(clips, table) {
  const out = [];
  for (const [k, clip] of Object.entries(clips)) {
    RBX_META[k] = rbxMeta(clip);
    if (table && !table['rbx_' + k]) table['rbx_' + k] = (t, opt = {}) => rbxPose(t, clip, opt);
    out.push('rbx_' + k);
  }
  return out;
}

/** Trình duyệt: nạp `<base>index.json` ({ names:[…] } hoặc mảng) rồi từng `<tên>.json`. Lỗi một clip → bỏ clip đó, không làm hỏng cả bộ. */
export async function loadRbxClips(base = '/assets/nhap/anims/', names = null) {
  const idx = names || await fetch(base + 'index.json').then((r) => (r.ok ? r.json() : [])).then((j) => j.names || j).catch(() => []);
  const clips = {};
  await Promise.all(idx.map(async (n) => { try { const r = await fetch(`${base}${n}.json`); if (r.ok) clips[n] = await r.json(); } catch { /* bỏ qua */ } }));
  return Object.fromEntries(Object.entries(clips).sort(([a], [b]) => (a < b ? -1 : 1)));
}
