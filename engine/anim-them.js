// anim-them.js — animation bổ sung cho NGƯỜI (R15 và Gà dùng chung bảng R15_ANIMATIONS qua samplePose) cho tập ep002.
//   Import file này một lần (engine/cast.js đã import) → đăng ký thêm vào R15_ANIMATIONS, KHÔNG ghi đè tên đã có.
//   Thêm: sitUp climb drag vanish peek putDown ringBell sleepy (+ bí danh sitting). Đã có sẵn: lie hold hug panic cower lookAround.
//   Mọi hàm là hàm thuần của t (tua tới/lui ra cùng kết quả). Hệ trục như r15.js: tay x<0 = giơ trước, chân x<0 = đưa trước, thân x>0 = chúi tới.
//   Co nhỏ (vanish) dùng pose.body.ds (scale thân = 1 − ds) — r15.js applyPose đọc khoá này.
import { R15_ANIMATIONS, soleHeight } from './r15.js';

const PI = Math.PI, S = Math.sin, C = Math.cos;
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const ease = (v) => { v = clamp01(v); return v * v * (3 - 2 * v); };
const base = (n, t, o) => R15_ANIMATIONS[n](t, o);
function ground(p, lift = 0) {
  const low = Math.min(soleHeight(p, 'right'), soleHeight(p, 'left'));
  p.body = { ...(p.body || {}) }; p.body.y = (p.body.y || 0) - low + lift;
  return p;
}
const flat = (p, side, pitch = 0) => { const a2 = (p.hips?.x || 0) + (p[side + 'Leg']?.x || 0) + (p[side + 'Knee']?.x || 0); p[side + 'Foot'] = { ...(p[side + 'Foot'] || {}), x: pitch - a2 }; };

export const ANIM_THEM = {
  // bật dậy khỏi giường: nằm ngửa → ngồi chống tay, chân duỗi thẳng trên giường; ~1 s rồi giữ dáng ngồi, thở. Tự xoay thân nằm (KHÔNG kèm lie:true).
  sitUp: (t, o = {}) => {
    const dur = o.dur ?? 1.0, k = clamp01(t / dur), e = ease(k), over = S(PI * k) * 0.1, b = S(t * 1.5);
    return {
      body: { rx: -PI / 2, z: 2.0, y: 0.5 },
      torso: { x: PI / 2 * e + over + (k >= 1 ? 0.03 * b : 0) }, head: { x: -0.5 * (1 - e) + 0.12 * e, y: 0.15 * S(t * 0.8) * e, z: 0.04 },
      rightLeg: { x: 0, z: -0.06 }, leftLeg: { x: 0, z: 0.06 }, rightFoot: { x: 0.25 }, leftFoot: { x: 0.25 },
      rightArm: { x: -0.35 - 1.0 * S(PI * k) + 0.45 * e, z: -0.15 - 0.15 * e },
      leftArm: { x: -0.35 - 1.0 * S(PI * k) + 0.45 * e, z: 0.15 + 0.15 * e },
      rightElbow: { x: -0.2 - 0.3 * S(PI * k) }, leftElbow: { x: -0.2 - 0.3 * S(PI * k) },
    };
  },

  // trèo (thùng gỗ / kệ): hai tay thay nhau với lên, chân thay nhau co gối; loop
  climb: (t, o = {}) => {
    const ph = t * (o.speed ?? 1.3) * PI * 2, s = S(ph), p = base('idle', t);
    p.hips = { x: 0.05 }; p.torso = { x: 0.1, z: 0.05 * s }; p.head = { x: -0.45, z: -0.04 * s };
    p.rightArm = { x: -2.6 + 0.5 * s, z: -0.2 }; p.leftArm = { x: -2.6 - 0.5 * s, z: 0.2 };
    p.rightElbow = { x: -0.3 - 0.5 * Math.max(0, -s) }; p.leftElbow = { x: -0.3 - 0.5 * Math.max(0, s) };
    p.rightLeg = { x: -0.2 - 1.0 * Math.max(0, s), z: -0.06 }; p.leftLeg = { x: -0.2 - 1.0 * Math.max(0, -s), z: 0.06 };
    p.rightKnee = { x: 0.3 + 1.1 * Math.max(0, s) }; p.leftKnee = { x: 0.3 + 1.1 * Math.max(0, -s) };
    flat(p, 'right', 0.4); flat(p, 'left', 0.4);
    return ground(p, 0.1 * Math.abs(s));
  },

  // kéo vật ra sau: lùi từng bước, người ngả ra sau, hai tay nắm phía trước; loop
  drag: (t, o = {}) => {
    const sp = o.speed ?? 1.1, p = R15_ANIMATIONS.walk(-t, { speed: sp, amp: 0.5 }), s = S(t * sp * PI * 2);
    p.torso = { ...p.torso, x: -0.2 }; p.head = { ...p.head, x: 0.18 };
    p.rightArm = { x: -0.85 + 0.08 * s, z: -0.1 }; p.leftArm = { x: -0.85 - 0.08 * s, z: 0.1 };
    p.rightElbow = { x: -0.2 }; p.leftElbow = { x: -0.2 }; p.rightHand = { x: 0.2 }; p.leftHand = { x: 0.2 };
    return p;
  },

  // biến mất: giật mình rồi co về 0 + xoay nhẹ trong ~0,35 s cuối của `dur` (mặc định 0,9 s); sau đó giữ scale ≈ 0. pose.fx.dust = tiến độ 0..1 cho VFX
  vanish: (t, o = {}) => {
    const tt = t * (o.speed ?? 1), dur = o.dur ?? 0.9, win = Math.min(0.35, dur), t0 = dur - win, k = clamp01((tt - t0) / win), e = k * k * (3 - 2 * k);
    const p = base('idle', t);
    p.body = { ...(p.body || {}), ry: 1.6 * e, ds: 0.999 * e };
    p.head = { ...p.head, x: -0.15 * S(PI * clamp01(tt / t0)) }; p.rightArm = { x: -0.3, z: -0.9 }; p.leftArm = { x: -0.3, z: 0.9 };
    p.fx = { dust: e, at: k };
    return p;
  },

  // ghé mắt qua kính: hơi khom về trước, một tay che trán, đầu chúi và nghiêng, nhích nhẹ
  peek: (t) => {
    const b = S(t * 1.8), s = S(t * 0.7), p = base('idle', t);
    p.hips = { ...p.hips, x: 0.08 };
    p.torso = { x: 0.3 + 0.015 * b, z: 0.03 * s, y: 0.12 }; p.head = { x: 0.18 + 0.02 * b, y: -0.12 + 0.04 * s, z: 0.09 };
    p.rightArm = { x: -1.95, z: -0.2 }; p.rightElbow = { x: -2.0 + 0.03 * b }; p.rightHand = { x: 0.2, z: 0.1 };   // bàn tay che trán
    p.leftArm = { x: -0.5, z: 0.22 }; p.leftElbow = { x: -1.1 }; p.leftHand = { x: 0.2 };                          // tay kia tì vào kính
    p.rightLeg = { x: -0.14, z: -0.04 }; p.leftLeg = { x: 0.1, z: 0.04 }; p.rightKnee = { x: 0.2 }; p.leftKnee = { x: 0.12 };
    p.gaze = [0.2, 0.15];
    flat(p, 'right'); flat(p, 'left');
    return ground(p);
  },

  // đặt đồ xuống: đang cầm trước ngực → cúi gập gối đặt xuống → buông tay → đứng thẳng lại; ~0,8 s, không lặp
  putDown: (t, o = {}) => {
    const dur = o.dur ?? 0.8, k = clamp01(t / dur), d = Math.pow(S(PI * k), 0.8), rel = ease((k - 0.45) / 0.35), p = base('idle', t);
    p.hips = { x: 0.35 * d }; p.torso = { x: 0.1 + 0.4 * d }; p.head = { x: 0.06 - 0.15 * d };
    p.rightLeg = { x: -1.0 * d, z: -0.06 }; p.leftLeg = { x: -1.0 * d, z: 0.06 }; p.rightKnee = { x: 1.5 * d }; p.leftKnee = { x: 1.5 * d };
    const ax = (-1.0 - 0.3 * d) * (1 - rel) + 0.04 * rel, az = 0.22 * (1 - rel) - 0.08 * rel;
    p.rightArm = { x: ax, z: az }; p.leftArm = { x: ax, z: -az };
    p.rightElbow = { x: -0.4 * (1 - rel) - 0.15 * rel }; p.leftElbow = { x: -0.4 * (1 - rel) - 0.15 * rel };
    flat(p, 'right'); flat(p, 'left');
    return ground(p);
  },

  // rung chuông tay: tay phải giơ cao, cẳng tay lắc nhanh, thân lắc nhẹ theo nhịp
  ringBell: (t) => {
    const sh = S(t * 44), sw = S(t * 7), p = base('idle', t);
    p.torso = { x: 0.03, z: -0.05 * sw, y: 0.08 * sw }; p.head = { x: -0.1, z: 0.06 * sw };
    p.rightArm = { x: -0.5, z: -2.0 + 0.1 * sw }; p.rightElbow = { x: -0.7 + 0.45 * sh }; p.rightHand = { x: 0.25 * sh, z: 0.2 * sh };
    p.leftArm = { x: 0.05, z: 0.3 + 0.1 * sw }; p.leftElbow = { x: -0.3 };
    p.rightLeg = { ...p.rightLeg, x: (p.rightLeg.x || 0) - 0.06 * Math.max(0, sw) }; p.rightKnee = { x: 0.12 + 0.12 * Math.max(0, sw) };
    return ground(p);
  },

  // vừa dậy: ngáp (vươn hai tay, ngửa đầu) rồi dụi mắt bằng mu bàn tay; chu kỳ 4 s, loop. Mặt 'sleepy'
  sleepy: (t) => {
    const q = (t % 4) / 4, yawn = ease(q / 0.12) * (1 - ease((q - 0.34) / 0.1)), rub = ease((q - 0.45) / 0.08) * (1 - ease((q - 0.9) / 0.08)), r = S(t * 14), sw = S(t * 0.9), p = base('idle', t);
    p.torso = { x: 0.05 - 0.12 * yawn + 0.1 * rub, z: 0.02 * sw }; p.head = { x: -0.3 * yawn + 0.18 * rub, z: 0.1 * sw + 0.12 * rub, y: 0.05 * sw };
    p.rightArm = { x: -0.04 - 2.5 * yawn - 1.55 * rub, z: -0.08 - 0.4 * yawn }; p.leftArm = { x: -0.04 - 2.5 * yawn, z: 0.08 + 0.4 * yawn };
    p.rightElbow = { x: -0.16 - 0.3 * yawn - 2.0 * rub + 0.25 * rub * r }; p.leftElbow = { x: -0.16 - 0.3 * yawn };
    p.rightHand = { x: -0.05 + 0.3 * rub, z: 0.25 * rub * r };
    p.face = 'sleepy';
    return ground(p);
  },
};

// đăng ký (không ghi đè tên đã có) + bí danh
export function registerAnimThem(table = R15_ANIMATIONS) {
  const added = [];
  for (const [k, fn] of Object.entries(ANIM_THEM)) if (!table[k]) { table[k] = fn; added.push(k); }
  if (!table.sitting && table.sit) { table.sitting = (t, o) => table.sit(t, o); added.push('sitting'); }
  return added;
}
registerAnimThem();
