// anim-nch.js — "Nguồn A": động tác THỦ TỤC port từ nocodehack-roblox-engine (Apache-2.0) sang three.js cho nhân vật R6.
//   Ghi công: xem assets/nhap/NOTICE-nocodehack.txt + assets/nhap/CREDITS.md. Nguồn gốc: skills/roblox-engine/engine/{poses,fight,locomotion}.py
//   (bảng pose theo độ, thời điểm beat/anticipation/overshoot, bộ số đấm/đá/né/hit/knockback/fall). Đây là bản VIẾT LẠI bằng JS, không chạy mã của họ.
//
// DÙNG (cùng định dạng pose của r15.js/r6-rig.js — createR6Rig().animate(tên, t, opt) đọc thẳng):
//   import { NCH, nchPose, registerNch, NCH_META } from './anim-nch.js';
//   registerNch();                         // thêm 'nch_<tên>' vào R15_ANIMATIONS → char.animate('nch_walk', t, opt) chạy ngay (không sửa r6-rig.js)
//   const pose = nchPose('punch', 0.4, { hand: 'R' });   // hoặc gọi thẳng, trả { hips, torso, head, rightArm, leftArm, rightLeg, leftLeg, body }
// MỖI ĐỘNG TÁC = hàm thuần (t giây, opt) → pose. Không giờ thực, không Math.random. Tua tới/lui/nhảy cóc cho cùng kết quả.
//   NCH_META[tên] = { dur (giây; loop thì = 1 chu kỳ), loop (true = lặp theo t, false = một lần rồi GIỮ pose cuối), bones: [...], opt: {...mặc định} }
//   nchSpeed('walk'|'run', opt) = vận tốc đi/chạy (stud/s) khớp bước chân để cảnh đẩy root cho chân không trượt.
//   Hậu kỳ: lookAt(pose, targetLocal) = lớp nhìn theo thêm lên pose bất kỳ; breathe(t) = lớp thở.
//
// HỆ TRỤC (Blender Z lên, nhìn -Y  →  three Y lên, nhìn +Z). Bảng pose của họ viết theo ĐỘ, kênh người dùng:
//   R/L    = [raise, out]   raise>0 = đưa tay ra TRƯỚC/lên (0 = buông, 90 = ngang, 180 = thẳng đầu), out>0 = dạng RA xa thân
//   legR/L = [raise, out]   như tay
//   head   = [down, left, roll]   left>0 = quay sang TRÁI của nhân vật; roll>0 = nghiêng đầu về TRÁI
//   body   = [fwd, twist, lean]   thân trên quanh hông: chúi tới, xoay trái, nghiêng trái
// → r15: tay/chân x = −raise (x<0 = đưa trước), z = −out cho bên PHẢI (ở −X), +out cho bên TRÁI; torso/head x = +fwd/down, y = +twist/left, z = −lean/roll.
//   body.{x,y,z} = tịnh tiến (stud) trong hệ nhân vật (+Z = trước), body.{rx,ry,rz} = xoay cả người (rx<0 = ngả ra sau).
// R6 là khối cứng: KHÔNG dùng khuỷu/gối (để 0) — chỉ vai/hông, nên mọi góc nằm trong giới hạn khớp thật.
// Tiếp đất: ground() hạ/nâng body.y cho đế thấp nhất chạm sàn; r6-rig.toR6Pose chỉnh nốt sai khác R15→R6.
import { R15_ANIMATIONS, soleHeight } from './r15.js';

const PI = Math.PI, S = Math.sin, C = Math.cos, F = 24;      // F = fps của họ (build.py:921; frame → giây)
const D = (d) => d * PI / 180;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const clamp01 = (v) => clamp(v, 0, 1);
const smooth = (v) => { v = clamp01(v); return v * v * (3 - 2 * v); };
const easeOut = (v) => { v = clamp01(v); return 1 - (1 - v) ** 3; };
const easeIn = (v) => { v = clamp01(v); return v * v; };
const frac = (x) => x - Math.floor(x);
const fr = (n) => n / F;                                      // frame → giây

// ---------- tư thế dạng KÊNH (độ) ----------
// Mọi giá trị là số → trộn từng phần tử được. root = [x,y,z (stud), rx,ry,rz (độ)], hp = [fwd] độ (gập hông, chân tự bù để đứng thẳng).
const NEUTRAL = { R: [0, 3], L: [0, 3], legR: [0, 0], legL: [0, 0], head: [0, 0, 0], body: [0, 0, 0], root: [0, 0, 0, 0, 0, 0], hp: [0] };
const KEYS = Object.keys(NEUTRAL);
export const P = (spec = {}) => { const o = {}; for (const k of KEYS) o[k] = (spec[k] || NEUTRAL[k]).slice(); for (const k of KEYS) while (o[k].length < NEUTRAL[k].length) o[k].push(NEUTRAL[k][o[k].length]); return o; };
const mixP = (a, b, w) => { const o = {}; for (const k of KEYS) o[k] = a[k].map((v, i) => v + (b[k][i] - v) * w); return o; };
const addP = (a, b, w = 1) => { const o = {}; for (const k of KEYS) o[k] = a[k].map((v, i) => v + b[k][i] * w); return o; };
const mirrorSpec = (s) => {            // cùng pose ở bên kia (poses.py mirror): tay/chân đổi bên; xoay/nghiêng/roll đổi dấu
  const sw = { R: 'L', L: 'R', legR: 'legL', legL: 'legR' }, o = {};
  for (const [k, v] of Object.entries(s)) {
    if (sw[k]) o[sw[k]] = v.slice();
    else if (k === 'head' || k === 'body') o[k] = [v[0], -v[1], -v[2]];
    else if (k === 'root') o[k] = [-v[0], v[1], v[2], v[3], -v[4], -v[5]];
    else o[k] = v.slice();
  }
  return o;
};

// ---------- thư viện pose (poses.py LIB + fight.py MOVES; độ) ----------
export const LIB = {
  stand_a: { R: [5, 8], L: [-6, 5], head: [0, 0, -4], body: [1.5, 5, 3.5] },
  stand_b: { R: [-6, 5], L: [5, 8], head: [0, 0, 4], body: [1.5, -5, -3.5] },
  stand_c: { R: [-7, 8], L: [-5, 6], head: [-4, 0, 3], body: [-3, 3, 0] },
  point_R: { R: [80, 18], L: [-10, 9], body: [5, -12, -3], head: [-3, 0, 4] },
  cheer: { R: [10, 130], L: [16, 106], head: [-16, 0, 5], body: [-9, 5, -4] },
  wave_R: { R: [20, 150], L: [-6, 8], head: [0, 0, 8], body: [-3, -6, 5] },
  shock: { R: [34, 78], L: [12, 60], head: [-14, 0, 5], body: [-15, 5, -3] },
  recoil: { R: [52, 38], L: [30, 30], head: [-8, 0, -5], body: [-17, -6, 4] },
  cower: { R: [118, -24], L: [104, -20], head: [22, 0, 7], body: [20, 7, 4] },
  think_R: { R: [128, -36], L: [22, -12], head: [-10, 0, 12] },
  carry: { R: [48, 4], L: [10, 6] },
  // đánh nhau (fight.py)
  FIGHT_STANCE: { R: [36, 12], L: [30, 14], body: [6, 0, 0], head: [6, 0, 0] },
  punch_R: { R: [92, -12], L: [65, 15], body: [8, -18, 0] },
  uppercut_R: { R: [145, -15], L: [65, 15], body: [-8, -15, 0] },
  kick_R: { legR: [100, 0], R: [45, 20], L: [70, 15], body: [-12, 0, 0] },
  block: { R: [125, -28], L: [125, -28], body: [6, 0, 0], head: [12, 0, 0] },
  dodge_back: { R: [60, 15], L: [60, 15], body: [-30, 0, 0] },
  dodge_side: { R: [55, 15], L: [70, 15], body: [0, 0, 32] },
  hit_head: { R: [25, 40], L: [20, 35], head: [-24, 18, -16], body: [-16, 8, 8] },
  hit_body: { R: [65, -15], L: [65, -15], head: [25, 0, 0], body: [25, 0, 0] },
  fly_pose: { R: [155, 8], L: [155, 8], legR: [-22, 5], legL: [-28, 5], body: [22, 0, 0] },
};
const L = (n, over = {}) => P({ ...LIB[n], ...over });

// ---------- chuyển kênh → pose r15 ----------
function toPose(c, { ground: g = true, lift = 0 } = {}) {
  const [rx, ry, rz] = [D(c.root[3]), D(c.root[4]), D(c.root[5])];
  const hp = D(c.hp[0]);
  const p = {
    hips: { x: hp },
    torso: { x: D(c.body[0]), y: D(c.body[1]), z: -D(c.body[2]) },
    head: { x: D(c.head[0]), y: D(c.head[1]), z: -D(c.head[2]) },
    rightArm: { x: -D(c.R[0]), z: -D(c.R[1]) }, leftArm: { x: -D(c.L[0]), z: D(c.L[1]) },
    rightLeg: { x: -D(c.legR[0]) - hp, z: -D(c.legR[1]) }, leftLeg: { x: -D(c.legL[0]) - hp, z: D(c.legL[1]) },
    body: { x: c.root[0], y: c.root[1], z: c.root[2], rx, ry, rz },
  };
  if (g) {
    const low = Math.min(soleHeight(p, 'right'), soleHeight(p, 'left'));
    p.body.y += -low + lift;
  }
  return p;
}

// ---------- chuỗi keyframe (thời gian theo FRAME, như poses.beat của họ) ----------
// keys = [[frame, kênhPose, kiểuEase?], …]; kiểu: 'smooth' (mặc định) | 'out' (đòn đánh: nhanh rồi chậm) | 'in' (rơi: chậm rồi nhanh) | 'lin' | 'hold' (giữ pose trước)
const EASE = { smooth, out: easeOut, in: easeIn, lin: clamp01, hold: () => 0 };
function track(keys, f) {
  if (f <= keys[0][0]) return keys[0][1];
  const last = keys[keys.length - 1];
  if (f >= last[0]) return last[1];
  let i = 0; while (keys[i + 1][0] <= f) i++;
  const [f0, a] = keys[i], [f1, b, ez = 'smooth'] = keys[i + 1];
  return mixP(a, b, EASE[ez]((f - f0) / (f1 - f0)));
}
// beat kiểu poses.beat: giữ → ngược chiều (antic) → vượt (over) → dội nhẹ → vào pose. Trả danh sách key để nối vào keys.
const beat = (from, pose, fHit, { move = 4, antic = 0.2, over = 0.15, settle = 4 } = {}) => {
  const d = (k) => addP(pose, from, -1);                       // pose − from
  const delta = d(), back = addP(from, delta, -antic), past = addP(pose, delta, over), reb = addP(pose, delta, -over * 0.35);
  return [[fHit - move, back], [fHit, past], [fHit + settle - 2, reb], [fHit + settle, pose]];
};

// ---------- lớp phụ ----------
export const breathe = (t, k = 1) => { const b = S(t * 1.7), s = S(t * 0.55); return P({ body: [0.018 * 57.3 * b * k, 0, 0], head: [-0.012 * 57.3 * b * k, 3.4 * S(t * 0.6) * k, 0], R: [2.3, 4.6 + 1.1 * b * k], L: [2.3, 4.6 + 1.1 * b * k] }); };
const roundBreath = (c, t) => addP(c, P({ body: [1.0 * S(t * 1.7), 0, 0], head: [-0.7 * S(t * 1.7), 3 * S(t * 0.6), 0] }), 1);

// nhìn theo (lookat.py): đầu theo mục tiêu trong hệ nhân vật [x(trái +), y(lên +), z(trước +)]; giới hạn yaw 70°, pitch 35°; thân phụ 25%.
export function lookAt(pose, target, { maxYaw = 70, maxPitch = 35, weight = 1 } = {}) {
  const [x, y, z] = target, hd = 3.6;                          // mắt cao ≈ 3.6 stud
  const yaw = Math.atan2(x, Math.max(z, 1e-6) + (z < 0 ? 0 : 0)) * 180 / PI;                // trái + (z âm = phía sau → quay tối đa)
  const yawA = z < 0 ? (x >= 0 ? 180 - Math.abs(Math.atan2(x, -z) * 180 / PI) : -(180 - Math.abs(Math.atan2(x, -z) * 180 / PI))) : yaw;
  const pitch = Math.atan2(hd - y, Math.hypot(x, z)) * 180 / PI;                           // nhìn xuống > 0
  const yw = clamp(yawA, -maxYaw, maxYaw), pt = clamp(pitch, -maxPitch, maxPitch);
  const head = D(1) * 0 + 0;
  const out = { ...pose, head: { ...pose.head }, torso: { ...pose.torso } };
  out.head.y = (pose.head?.y || 0) + D(yw * 0.75) * weight;
  out.head.x = (pose.head?.x || 0) + D(pt) * weight;
  out.torso.y = (pose.torso?.y || 0) + D(yw * 0.25) * weight;
  return out;
}

// ---------- vận tốc đi/chạy cho chân không trượt ----------
// Chân chịu lực: sin(góc) giảm đều ⇒ bàn chân đứng yên so với sàn khi thân tiến đều: v = 4·L·sin(A)·f (L = 2 stud).
export const nchSpeed = (name, o = {}) => {
  const run = name === 'run', f = o.speed ?? (run ? 2.6 : 1.8), A = D((o.stride ?? (run ? 46 : 28)) * (o.amp ?? 1));
  return 4 * 2 * S(A) * f;
};
function legSwing(u, s0) {                                    // u ∈ [0,1): chân phải; u<0.5 chống (sin tuyến tính), u≥0.5 vung (Hermite cùng vận tốc)
  let s;
  if (u < 0.5) s = s0 * (1 - 4 * u);
  else { const k = (u - 0.5) * 2, m = -2 * s0; s = (2 * k ** 3 - 3 * k ** 2 + 1) * -s0 + (k ** 3 - 2 * k ** 2 + k) * m + (-2 * k ** 3 + 3 * k ** 2) * s0 + (k ** 3 - k ** 2) * m; }
  return Math.asin(clamp(s, -1, 1));                          // góc chân ra TRƯỚC (rad)
}
// hông cao lên/hạ xuống theo tư thế nằm: gốc body quay quanh mép gót (fall của họ), cộng nhấc đầu 0.12 để không lún sàn
const lieOff = (th) => ({ y: -0.5 * S(th) + 0.12 * S(th) ** 2, z: -0.5 + 0.5 * C(th) });

// ---------- ĐỘNG TÁC ----------
const lieLimp = () => P({ R: [4, 12], L: [10, 20], legR: [0, 6], legL: [0, 10], head: [8, 6, 0], body: [0, 0, 0] });

function walkRun(run) {
  return (t, o = {}) => {
    const f = o.speed ?? (run ? 2.6 : 1.8), k = o.amp ?? 1, A = D((o.stride ?? (run ? 46 : 28)) * k), s0 = S(A);
    const u = frac(t * f), w = 2 * PI * u;
    const aR = legSwing(u, s0), aL = legSwing(frac(u + 0.5), s0);
    const armK = run ? 1.25 : 0.9;
    const c = P({
      legR: [D(0) + aR * 180 / PI, 0], legL: [aL * 180 / PI, 0],
      R: [-armK * aR * 180 / PI * (run ? 1 : 1) + (run ? 18 : 0), 6], L: [-armK * aL * 180 / PI + (run ? 18 : 0), 6],
      body: [(run ? 12 : 3) + 1.2 * C(2 * w), -(run ? 9 : 6) * C(w) * k, 0],        // chúi tới, thân xoay ngược chân
      head: [(run ? -8 : -2), (run ? 9 : 6) * C(w) * k, 0],
      hp: [0],
    });
    c.root[5] = 1.4 * k * S(w);                                                       // hông lắc nhẹ
    // chạy: có pha bay (2 lần/chu kỳ, lúc hai chân khép); đi: cao thấp tự có từ hình học chân chống
    const lift = run ? (o.air ?? 0.45) * S(w) ** 2 : 0;
    return toPose(c, { lift });
  };
}

// đấm/đá: stance → windup → (giữ) → đòn 3 frame → stance sau 6 frame; frame 0 = stance, đòn trúng ở f=13
function strike(move, windupDef, legMove = false) {
  return (t, o = {}) => {
    const mir = (o.hand || 'R') === 'L';
    const mk = (s) => P(mir ? mirrorSpec(s) : s);
    const fp = t * F, hold = o.hold ?? 0, hit = 13;
    const stance = mk(LIB.FIGHT_STANCE), mv = mk({ ...LIB[move] }), wind = mk({ ...LIB[move], ...windupDef });
    const lunge = o.lunge ?? 0.7;
    // chân: xuất bộ đòn bước lên (đấm: chân đối bên tiến, chân cùng bên lùi)
    if (!legMove) {
      const lf = mir ? 'legR' : 'legL', lb = mir ? 'legL' : 'legR';
      for (const c of [mv, wind]) { c[lf] = [24, 3]; c[lb] = [-18, 3]; }
      const dz = (c, z) => { c.root[2] = z; return c; };
      dz(mv, lunge); dz(wind, 0.1);
    } else {                                                     // đá: chân trụ hơi gập hông, chân đá vung từ sau ra trước
      const sup = mir ? 'legR' : 'legL', hitL = mir ? 'legL' : 'legR';
      mv[sup] = [4, 3]; wind[sup] = [4, 3];
      wind.root[2] = -0.1; mv.root[2] = 0.2;
      void hitL;
    }
    const keys = [[0, stance], [5, wind, 'smooth'], [hit - 3, wind, 'hold'], [hit, mv, 'out'], [hit + hold, mv, 'hold'], [hit + hold + 6, stance, 'smooth']];
    return toPose(track(keys, fp));
  };
}
const kickKeys = () => (t, o = {}) => {
  const mir = (o.hand || 'R') === 'L', mk = (s) => P(mir ? mirrorSpec(s) : s), kl = mir ? 'legL' : 'legR', sup = mir ? 'legR' : 'legL';
  const stance = mk(LIB.FIGHT_STANCE), wind = mk({ ...LIB.kick_R, legR: [-24, 8] }), mv = mk(LIB.kick_R), fp = t * F, hit = 13, hold = o.hold ?? 0;
  for (const c of [wind, mv]) c[sup] = [5, 3];
  wind.root[2] = -0.15; mv.root[2] = 0.15;
  void kl;
  return toPose(track([[0, stance], [6, wind], [hit - 4, wind, 'hold'], [hit - 1, mv, 'out'], [hit + hold, mv, 'hold'], [hit + hold + 8, stance]], fp));
};

export const NCH = {
  // đứng thở + dáng đứng (contrapposto a/b/c) — loop
  idle: (t, o = {}) => toPose(roundBreath(o.stance ? L('stand_' + o.stance) : P({ R: [2, 5], L: [2, 5], body: [1, 0, 0] }), t)),

  walk: walkRun(false),
  run: walkRun(true),

  // đấm (poses.LIB punch_R + FIGHT_STANCE, windup (25,25)) — opt.hand 'R'|'L', opt.hold (frame giữ ở điểm trúng), opt.lunge (stud)
  punch: strike('punch_R', { R: [25, 25] }),
  uppercut: strike('uppercut_R', { R: [55, 20] }),
  kick: kickKeys(),

  // đỡ: hai tay lên 125°, giữ
  block: (t) => toPose(track([[0, L('FIGHT_STANCE')], [4, L('block'), 'out'], [4 + 12, L('block'), 'hold']], t * F)),

  // né: opt.side 'back'|'R'|'L', opt.dist (stud, mặc định 1.5): lùi/nghiêng rồi về thế đỡ sau 8 frame
  dodge: (t, o = {}) => {
    const side = o.side || 'back', dist = o.dist ?? 1.5, sc = clamp(dist / 1.5, 0, 1.5);
    const mk = (d) => { const c = side === 'back' ? L('dodge_back') : L('dodge_side'); if (side === 'back') { c.body[0] = -30 * sc; c.root[2] = -d; c.legR = [-8 * sc, 3]; c.legL = [16 * sc, 3]; } else { const sg = side === 'L' ? 1 : -1; c.body[2] = 32 * sc * sg; c.root[0] = sg * d; c[side === 'L' ? 'legL' : 'legR'] = [0, 14 * sc]; } return c; };
    return toPose(track([[0, L('FIGHT_STANCE')], [4, mk(dist), 'out'], [8, mk(dist), 'hold'], [14, L('block')], [22, L('FIGHT_STANCE')]], t * F));
  },

  // bị đánh trúng đầu/thân: giật ra rồi về thế đánh sau 8 frame (+ lùi 0.22 stud) — opt.part 'head'|'body'
  hit: (t, o = {}) => {
    const hb = o.part === 'body', h = L(hb ? 'hit_body' : 'hit_head'); h.root[2] = -0.22;
    return toPose(track([[0, L('FIGHT_STANCE')], [2, h, 'out'], [8, L('FIGHT_STANCE')]], t * F));
  },

  // bị đánh văng (fight.knockback): 24 frame bay (parabol), rơi nằm ngửa, nảy 3+3 frame, rồi nằm. opt.dist=8, opt.height=2 (stud)
  knockback: (t, o = {}) => {
    const dist = o.dist ?? 8, hgt = o.height ?? 2, fp = t * F, u = clamp01(fp / 24);
    const hitP = L('hit_head'), fly = P({ R: [75, 70], L: [60, 62], legR: [-8, 6], legL: [-14, 8], head: [-10, 10, 0], body: [-6, 0, 0] });
    const c = track([[0, L('FIGHT_STANCE')], [6, hitP, 'out'], [16, fly], [24, lieLimp()], [30, lieLimp()]], fp);
    const th = D(-90 * smooth(u * 1.0 + 0.0 * u) - 0 * u) * 1;     // 0 → −90° suốt chuyến bay
    const lo = lieOff(th);
    const bounce = fp < 24 ? 0 : fp < 27 ? 0.14 * (fp - 24) / 3 : fp < 30 ? 0.14 * (1 - (fp - 27) / 3) : 0;
    const p = toPose(c, { ground: false });
    p.body = { x: 0, y: lo.y + 4 * hgt * u * (1 - u) + bounce, z: lo.z - dist * u, rx: th, ry: D(25) * smooth(u), rz: 0 };
    return p;
  },

  // ngã (locomotion.fall): đứng → ngả ra sau quanh mép gót ~10 frame (97°, dội 84°, 90°); opt.back=false → ngã sấp
  fall: (t, o = {}) => {
    const back = o.back !== false, sg = back ? -1 : 1, fp = t * F;
    const keys = [[0, 0, 'in'], [7, 97], [9, 84], [11, 90]];
    let deg = 90; for (let i = 0; i + 1 < keys.length; i++) if (fp < keys[i + 1][0]) { const [a, da] = keys[i], [b, db, ez] = keys[i + 1]; deg = da + (db - da) * (EASE[ez || 'smooth']((fp - a) / (b - a))); break; }
    if (fp < 0) deg = 0;
    const th = D(sg * deg), a = Math.abs(S(th));
    // ngã sấp: mép mũi chân là điểm tựa (đối xứng): y = −0.5·|sin|, z = +0.5 − 0.5·cos
    const off = back ? lieOff(th) : { y: 0.5 * a + 0.12 * a * a, z: 0.5 - 0.5 * C(th) };
    const c = P({ R: [60 * a + 4, 30 * a + 5], L: [50 * a + 4, 36 * a + 5], head: [-18 * a, 0, 0], body: [-5 * a, 0, 0] });
    const p = toPose(mixP(c, lieLimp(), smooth((fp - 7) / 4)), { ground: false });
    p.body = { x: 0, y: off.y, z: off.z, rx: th, ry: 0, rz: 0 };
    return p;
  },

  // đứng dậy (locomotion.get_up): chiếu NGƯỢC clip ngã, 13 frame
  getUp: (t, o = {}) => NCH.fall(Math.max(0, 11 / F - t * 11 / 13), o),

  // vẫy tay (poses wave_R + wiggle ra/vào ±14°): lên 8 frame rồi lặp — opt.hand
  wave: (t, o = {}) => {
    const mir = (o.hand || 'R') === 'L', a = L('wave_R'), e = smooth(t * F / 8), w = S(t * 2 * PI * 2.2) * 14 * e;
    const c = mixP(L('stand_c'), a, e); c.R[1] += w; c.R[0] += 5 * C(t * 2 * PI * 2.2) * e;
    return toPose(roundBreath(mir ? P(mirrorSpec(Object.fromEntries(KEYS.map((k) => [k, c[k]])))) : c, t));
  },

  // chỉ tay (point_R): giơ lên + ra, vượt rồi vào pose, giữ — opt.hand, opt.aim (độ, xoay thân về phía chỉ)
  point: (t, o = {}) => {
    const mir = (o.hand || 'R') === 'L', from = L('stand_b'), to = L('point_R'); to.body[1] += (o.aim ?? 0) * (mir ? -1 : 1);
    const keys = [[0, from], ...beat(from, to, 8, { move: 6, over: 0.12, settle: 5 })];
    let c = track(keys, t * F); c = addP(c, P({ R: [0, 1.5 * S(t * 3)] }), 1);
    return toPose(mir ? P(mirrorSpec(Object.fromEntries(KEYS.map((k) => [k, c[k]])))) : c);
  },

  // cổ vũ: tay vung lên, nhảy nhẹ, tay đập xen kẽ — loop
  cheer: (t, o = {}) => {
    const f = o.speed ?? 1.6, w = 2 * PI * f * t, c = L('cheer');
    c.R[0] += 14 * S(w); c.L[0] -= 14 * S(w); c.R[1] += 6 * C(w); c.L[1] -= 6 * C(w); c.head[0] += 6 * S(2 * w); c.body[0] += 3 * S(2 * w);
    return toPose(c, { lift: 0.28 * Math.abs(S(w)) });
  },

  // ôm: dang tay → khép (tay bắt chéo trước ngực), thân chúi 12°, nhún nhẹ khi giữ — một lần
  hug: (t) => {
    const open = P({ R: [68, 62], L: [68, 62], body: [8, 0, 0], head: [-4, 0, 0] }), hold = P({ R: [88, -34], L: [80, -30], body: [14, 0, 0], head: [10, 0, 0] });
    hold.root[2] = 0.35;
    const k = track([[0, L('stand_c')], [9, open, 'out'], [16, open, 'hold'], [28, hold, 'in'], [40, hold]], t * F);
    return toPose(addP(k, P({ body: [1.2 * S(t * 2.4) * smooth((t * F - 28) / 6), 0, 0] }), 1));
  },

  // nhặt/cầm (grab.py + reach_R): cúi gập hông (chân đứng thẳng), tay chạm sàn, đứng lên với đồ trước ngực (carry). pose.fx.grab = tiến độ nhặt 0..1 (VFX/đạo cụ)
  pickUp: (t, o = {}) => {
    const stoop = P({ R: [88, 6], L: [88, 6], hp: [62], body: [26, 0, 0], head: [-30, 0, 0], root: [0, 0, -0.9, 0, 0, 0] }), mid = P({ R: [60, 6], L: [60, 6], hp: [30], body: [14, 0, 0], head: [-14, 0, 0], root: [0, 0, -0.4, 0, 0, 0] });
    const carryP = L('carry'); carryP.body = [-3, 0, 0];
    const fp = t * F, c = track([[0, L('stand_a')], [8, mid], [16, stoop], [24, stoop, 'hold'], [34, mid], [46, carryP]], fp);
    const p = toPose(c); p.fx = { grab: smooth((fp - 22) / 6) }; return p;
  },

  // nhìn theo: đầu bám mục tiêu đang chuyển động (lookat.look_track, lag 2 frame). opt.target(t) → [x,y,z] hệ nhân vật; mặc định mục tiêu lượn qua trước mặt
  lookFollow: (t, o = {}) => {
    const tg = o.target || ((tt) => [6 * S(tt * 1.1), 3.6 + 1.2 * S(tt * 0.7), 5 + 4 * C(tt * 1.1)]);
    return lookAt(NCH.idle(t, { stance: 'a' }), tg(Math.max(0, t - 2 / F)), o);
  },

  // giật mình (shock → recoil): bật ra sau, tay vung lệch
  shock: (t) => { const a = L('shock'), r = L('recoil'), fp = t * F; return toPose(track([[0, L('stand_c')], [3, r, 'out'], [9, a, 'smooth'], [20, a, 'hold']], fp)); },
  // co rúm (cower): cúi, tay che đầu, run nhẹ
  cower: (t) => { const c = track([[0, L('stand_c')], [8, L('cower'), 'out']], t * F); return toPose(addP(c, P({ body: [0.9 * S(t * 38), 0, 0], head: [0, 0.6 * S(t * 33), 0] }), 1)); },

  // nhảy (poses.jump): chân gập hông, 1 trước 1 sau 22° lúc lên, cao 0.9·… stud, rồi chạm đất — một lần
  jump: (t, o = {}) => {
    const h = o.height ?? 1.4, fp = t * F, tk = 4, air = 8;     // frame: nhún 0..4, rời đất f=4 (t0), bay 8, tiếp đất f=12
    const dz = track([[0, [0]], [tk, [0]], [tk + 2, [0.35 * h]], [tk + air / 2, [h]], [tk + air - 2, [0.25 * h]], [tk + air, [0]], [tk + air + 4, [0]]].map(([f, v]) => [f, { ...P(), root: [0, v[0], 0, 0, 0, 0] }]), fp).root[1];
    const tuck = track([[0, 0], [tk, 0], [tk + 2, 12], [tk + air / 2, 22], [tk + air - 2, 8], [tk + air, 0]].map(([f, v]) => [f, P({ legR: [-v, 0], legL: [v, 0], R: [v * 2.4, 12 + v], L: [v * 2.4, 12 + v] })]), fp);
    const p = toPose(tuck); p.body.y += dz; return p;
  },

  // nói chuyện: 3 cử chỉ (explain / open_palms / count) nối nhau, đổi bên mỗi cử chỉ — loop 3 s
  talk: (t, o = {}) => {
    const g = [{ R: [48, 14], L: [-6, 8], body: [5, -7, -2] }, { R: [40, 30], L: [26, 20], body: [-3, 3, 3] }, { R: [54, 24], L: [16, 4], body: [2, -6, -3] }];
    const seg = 1.0, i = Math.floor(t / seg) % 3, i2 = (i + 1) % 3, k = smooth((t % seg - 0.55) / 0.45);
    const mk = (n) => P((n % 2 === 0) ? g[n % 3] : mirrorSpec(g[n % 3]));
    return toPose(roundBreath(mixP(mk(i + (Math.floor(t / (seg * 3)) % 2)), mk(i2 + (Math.floor((t + seg) / (seg * 3)) % 2)), k), t));
  },
};

// ---------- siêu dữ liệu (cho anim-lab, tài liệu, test) ----------
export const NCH_META = {
  idle: { dur: 3.7, loop: true, bones: ['torso', 'head', 'arms'], opt: { stance: 'a|b|c' } },
  walk: { dur: 1 / 1.8, loop: true, bones: ['legs', 'arms', 'torso', 'head', 'root'], opt: { speed: 1.8, stride: 28, amp: 1 } },
  run: { dur: 1 / 2.6, loop: true, bones: ['legs', 'arms', 'torso', 'head', 'root'], opt: { speed: 2.6, stride: 46, air: 0.45 } },
  punch: { dur: 0.85, loop: false, bones: ['arms', 'torso', 'legs', 'root'], opt: { hand: 'R|L', hold: 0, lunge: 0.7 } },
  uppercut: { dur: 0.85, loop: false, bones: ['arms', 'torso', 'legs', 'root'], opt: { hand: 'R|L' } },
  kick: { dur: 0.95, loop: false, bones: ['legs', 'arms', 'torso', 'root'], opt: { hand: 'R|L' } },
  block: { dur: 0.55, loop: false, bones: ['arms', 'torso', 'head'], opt: {} },
  dodge: { dur: 0.75, loop: false, bones: ['torso', 'arms', 'legs', 'root'], opt: { side: 'back|R|L', dist: 1.5 } },
  hit: { dur: 0.4, loop: false, bones: ['head', 'torso', 'arms', 'root'], opt: { part: 'head|body' } },
  knockback: { dur: 1.2, loop: false, bones: ['all', 'root'], opt: { dist: 8, height: 2 } },
  fall: { dur: 0.5, loop: false, bones: ['all', 'root'], opt: { back: true } },
  getUp: { dur: 0.5, loop: false, bones: ['all', 'root'], opt: { back: true } },
  wave: { dur: 1.4, loop: true, bones: ['arm', 'head', 'torso'], opt: { hand: 'R|L' } },
  point: { dur: 1.0, loop: false, bones: ['arm', 'torso', 'head'], opt: { hand: 'R|L', aim: 0 } },
  cheer: { dur: 1 / 1.6, loop: true, bones: ['arms', 'head', 'root'], opt: { speed: 1.6 } },
  hug: { dur: 1.4, loop: false, bones: ['arms', 'torso', 'head', 'root'], opt: {} },
  pickUp: { dur: 1.55, loop: false, bones: ['hips', 'torso', 'arms', 'head', 'root'], opt: {} },
  lookFollow: { dur: 6, loop: true, bones: ['head', 'torso'], opt: { target: '(t)=>[x,y,z]' } },
  shock: { dur: 0.7, loop: false, bones: ['arms', 'torso', 'head'], opt: {} },
  cower: { dur: 1.2, loop: true, bones: ['arms', 'torso', 'head'], opt: {} },
  jump: { dur: 0.55, loop: false, bones: ['legs', 'arms', 'root'], opt: { height: 1.4 } },
  talk: { dur: 6, loop: true, bones: ['arms', 'torso', 'head'], opt: {} },
};

export const nchPose = (name, t, opt = {}) => { const fn = NCH[name]; if (!fn) throw new Error(`anim-nch: không có "${name}". Có: ${Object.keys(NCH).join(', ')}`); return fn(t, opt); };
// Thêm 'nch_<tên>' vào bảng R15_ANIMATIONS (cùng cách anim-them.js) → char.animate('nch_walk', t) chạy với createR6Rig mà không sửa r6-rig.js.
export function registerNch(table = R15_ANIMATIONS) { for (const [k, fn] of Object.entries(NCH)) if (!table['nch_' + k]) table['nch_' + k] = fn; return Object.keys(NCH).map((k) => 'nch_' + k); }
