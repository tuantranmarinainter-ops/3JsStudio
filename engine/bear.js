// bear.js — gấu bông stylized (Bắp và các bản nơ đỏ / vàng) dựng bằng code, KHÔNG GLB. Cùng giao diện diễn viên với createR15.
//   createBear(THREE, { name:'bap', bow:'#2e86de', fur:'#c68a4a' })
//   Rig (pivot cổ / vai / hông, đặt tên rõ): root > body > hips > { torso > { head > {ears, mõm, mắt, hat}, arm L/R > elbow > hand }, leg L/R > knee > foot }.
//   parts: root body hips torso head hat rightArm leftArm rightElbow leftElbow rightHand leftHand rightLeg leftLeg rightKnee leftKnee rightFoot leftFoot (+ ear*, bow, tail).
//   Cao ≈ 2,2 stud (người ≈ 5,2). Hệ trục như R15: nhìn +Z, tay PHẢI ở −X; góc cánh tay x<0 = giơ ra trước; chân x<0 = đưa ra trước; thân x>0 = chúi tới.
//   Animation = hàm thuần của t (xem BEAR_ANIMATIONS). Tên lạ → idle. Pose dùng khoá y như R15 (hips/torso/head/…/body{x,y,z,rx,ry,rz}) + body.ds = độ co (scale = 1 − ds, vanish).
//   Không import gì (THREE nhận qua tham số) → chạy được trong node để test.
const PI = Math.PI, S = Math.sin, C = Math.cos;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const clamp01 = (v) => clamp(v, 0, 1);
const ease = (v) => { v = clamp01(v); return v * v * (3 - 2 * v); };
const frac = (x) => x - Math.floor(x);

export const BEAR_DIMS = { height: 2.2, hipsY: 0.69, seatY: -0.29, headY: 1.67, anchorY: 1.62 };
export const BEAR_DEFAULTS = { name: 'bear', fur: '#c68a4a', muzzle: '#f2dcb8', belly: '#e9cfa0', bow: '#2e86de', eye: '#1a1210', nose: '#3a2218', blush: '#eb9c92', face: 'smile' };
export const BEAR_JOINTS = ['hips', 'torso', 'head', 'rightArm', 'leftArm', 'rightElbow', 'leftElbow', 'rightHand', 'leftHand',
  'rightLeg', 'leftLeg', 'rightKnee', 'leftKnee', 'rightFoot', 'leftFoot'];

// ---------- tư thế ----------
const SIT_BODY_Y = BEAR_DIMS.seatY;
// ngồi ngoan kiểu gấu bông: chân duỗi thẳng ra trước, hơi giạng, bàn chân ngửa
function sitBase(t, { look = 0.08 } = {}) {
  const b = S(t * 1.6), s = S(t * 0.55);
  return {
    body: { y: SIT_BODY_Y + 0.008 * b },
    hips: { x: 0 }, torso: { x: 0.04 + 0.012 * b, z: 0.01 * s }, head: { x: 0.06 + 0.01 * b, y: look * S(t * 0.7), z: 0.1 * S(t * 0.5) },
    rightLeg: { x: -1.5, z: -0.2 }, leftLeg: { x: -1.5, z: 0.2 }, rightKnee: { x: 0.04 }, leftKnee: { x: 0.04 },
    rightFoot: { x: -0.25, z: -0.1 }, leftFoot: { x: -0.25, z: 0.1 },
    rightArm: { x: -0.5, z: -0.5 }, leftArm: { x: -0.5, z: 0.5 }, rightElbow: { x: -0.6 }, leftElbow: { x: -0.6 },
  };
}
// đứng: chân thẳng, tay buông
function standBase(t) {
  const b = S(t * 1.7), s = S(t * 0.55);
  return {
    body: { y: 0 }, torso: { x: 0.02 * b, z: 0.015 * s }, head: { x: -0.02 * b, y: 0.07 * S(t * 0.6), z: 0.03 * s },
    rightLeg: { x: 0, z: -0.06 }, leftLeg: { x: 0, z: 0.06 },
    rightArm: { x: 0.05, z: -0.22 }, leftArm: { x: 0.05, z: 0.22 }, rightElbow: { x: -0.2 }, leftElbow: { x: -0.2 },
  };
}
const waddle = (t, sp, k) => {   // bước lạch bạch: chân ngắn đưa xa, thân lắc, nhún
  const ph = t * sp * PI * 2, s = S(ph), c = C(ph), kn = (q) => 0.12 + 0.5 * Math.max(0, C(q + 0.9));
  return {
    body: { y: 0.07 * k * Math.abs(c) },
    hips: { z: 0.08 * s * k }, torso: { x: 0.06 * k, z: -0.12 * s * k, y: -0.12 * s * k }, head: { x: -0.05 * k, z: 0.08 * s * k, y: 0.1 * s * k },
    rightLeg: { x: -0.7 * s * k, z: -0.1 }, leftLeg: { x: 0.7 * s * k, z: 0.1 },
    rightKnee: { x: kn(ph) * k }, leftKnee: { x: kn(ph + PI) * k },
    rightFoot: { x: 0.25 * k * Math.max(0, -s) - 0.04 }, leftFoot: { x: 0.25 * k * Math.max(0, s) - 0.04 },
    rightArm: { x: 0.65 * s * k, z: -0.3 - 0.05 * c * k }, leftArm: { x: -0.65 * s * k, z: 0.3 + 0.05 * c * k },
    rightElbow: { x: -0.35 - 0.25 * Math.max(0, -s) * k }, leftElbow: { x: -0.35 - 0.25 * Math.max(0, s) * k },
  };
};

export const BEAR_ANIMATIONS = {
  idle: (t) => sitBase(t),
  stand: (t) => standBase(t),
  sit: (t) => { const p = sitBase(t, { look: 0.22 }); p.head.x = 0.1; return p; },
  sitting: (t) => BEAR_ANIMATIONS.sit(t),

  // nằm ngửa (dùng kèm root xoay nằm như R15 lie): tay xuôi, thở
  lie: (t) => {
    const b = S(t * 1.2);
    return { body: { y: 0.02 * b }, torso: { x: -0.02 * b }, head: { x: -0.05, z: 0.08 },
      rightArm: { z: -0.3, x: -0.05 }, leftArm: { z: 0.3, x: -0.05 }, rightElbow: { x: -0.2 }, leftElbow: { x: -0.2 },
      rightLeg: { z: -0.12 }, leftLeg: { z: 0.12 }, rightFoot: { x: 0.3 }, leftFoot: { x: 0.3 } };
  },

  // bật ngồi dậy từ nằm ngửa (tự xoay thân nằm; KHÔNG kèm lie:true), ~0,9 s rồi ngồi ngoan
  sitUp: (t, o = {}) => {
    const dur = o.dur ?? 0.9, k = t / dur;
    if (k >= 1) return sitBase(t);
    const e = ease(k), over = S(PI * clamp01(k)) * 0.12;
    return {
      body: { rx: -PI / 2, z: BEAR_DIMS.hipsY, y: 0.46 * (1 - e) + 0.2 * e },   // z = hipsY: hông giữ nguyên chỗ khi thân nằm xuống
      torso: { x: PI / 2 * e + over }, head: { x: -0.35 * (1 - e) + 0.06 * e, z: 0.1 * e },
      rightLeg: { z: -0.2 * e - 0.1 }, leftLeg: { z: 0.2 * e + 0.1 }, rightFoot: { x: -0.25 * e + 0.3 * (1 - e) }, leftFoot: { x: -0.25 * e + 0.3 * (1 - e) },
      rightArm: { x: -0.5 * e - 1.6 * S(PI * k), z: -0.5 * e - 0.3 }, leftArm: { x: -0.5 * e - 1.6 * S(PI * k), z: 0.5 * e + 0.3 },
      rightElbow: { x: -0.6 * e - 0.3 }, leftElbow: { x: -0.6 * e - 0.3 },
    };
  },

  walk: (t, o = {}) => waddle(t, o.speed ?? 1.7, (o.amp ?? 0.75) / 0.75),
  run: (t, o = {}) => {   // lạch bạch chạy: bước ngắn gấp, thân chúi, tay vẫy ra sau
    const sp = o.speed ?? 3.2, k = (o.amp ?? 1.1) / 1.1, p = waddle(t, sp, 1.35 * k), ph = t * sp * PI * 2;
    p.torso.x = 0.22 * k; p.head.x = -0.16; p.body.y = 0.14 * Math.abs(C(ph)) * k;
    p.rightArm = { x: 0.2 + 0.7 * S(ph), z: -0.45 }; p.leftArm = { x: 0.2 - 0.7 * S(ph), z: 0.45 };
    p.rightElbow = { x: -0.9 }; p.leftElbow = { x: -0.9 };
    return p;
  },

  // trèo (kệ / thùng): hai tay thay nhau với lên, chân thay nhau co gối; loop
  climb: (t, o = {}) => {
    const ph = t * (o.speed ?? 1.5) * PI * 2, s = S(ph), p = standBase(t);
    p.body = { y: 0.04 * Math.abs(s) }; p.torso = { x: 0.14, z: 0.05 * s }; p.head = { x: -0.5, z: -0.05 * s };
    p.rightArm = { x: -2.55 + 0.5 * s, z: -0.3 }; p.leftArm = { x: -2.55 - 0.5 * s, z: 0.3 };
    p.rightElbow = { x: -0.35 - 0.4 * Math.max(0, -s) }; p.leftElbow = { x: -0.35 - 0.4 * Math.max(0, s) };
    p.rightLeg = { x: -0.15 - 0.95 * Math.max(0, s), z: -0.12 }; p.leftLeg = { x: -0.15 - 0.95 * Math.max(0, -s), z: 0.12 };
    p.rightKnee = { x: 0.2 + 1.1 * Math.max(0, s) }; p.leftKnee = { x: 0.2 + 1.1 * Math.max(0, -s) };
    p.rightFoot = { x: 0.35 }; p.leftFoot = { x: 0.35 };
    return p;
  },

  // ôm vật to trước ngực (đứng): hai tay vòng ra trước, thân ngả nhẹ ra sau cho cân
  hug: (t) => {
    const b = S(t * 2.4), p = standBase(t);
    p.torso = { x: -0.1 + 0.01 * b }; p.head = { x: 0.12, y: 0.05 * S(t * 0.8), z: 0.05 };
    p.rightArm = { x: -1.2, z: 0.28 }; p.leftArm = { x: -1.2, z: -0.28 }; p.rightElbow = { x: -0.45, z: 0.85 }; p.leftElbow = { x: -0.45, z: -0.85 };
    p.rightHand = { z: 0.2 }; p.leftHand = { z: -0.2 };
    p.rightLeg = { x: -0.04, z: -0.12 }; p.leftLeg = { x: -0.04, z: 0.12 };
    return p;
  },
  // cầm vật ở trước bụng bằng hai tay
  hold: (t) => {
    const b = S(t * 1.7), p = standBase(t);
    p.torso = { x: -0.04 }; p.head = { x: 0.1, y: 0.06 * S(t * 0.6) };
    p.rightArm = { x: -0.95 + 0.02 * b, z: 0.2 }; p.leftArm = { x: -0.95 + 0.02 * b, z: -0.2 };
    p.rightElbow = { x: -0.7 }; p.leftElbow = { x: -0.7 }; p.rightHand = { x: 0.1 }; p.leftHand = { x: 0.1 };
    return p;
  },

  // kéo vật ra sau lưng: lùi từng bước nhỏ, người ngả ra sau, tay nắm phía trước; loop
  drag: (t, o = {}) => {
    const sp = o.speed ?? 1.1, p = waddle(-t, sp, 0.6), ph = t * sp * PI * 2, s = S(ph);
    p.torso = { x: -0.22, z: p.torso.z, y: p.torso.y * 0.5 }; p.head = { x: 0.2, z: 0.06 * s };
    p.rightArm = { x: -0.95 + 0.1 * s, z: -0.12 }; p.leftArm = { x: -0.95 - 0.1 * s, z: 0.12 };
    p.rightElbow = { x: -0.25 }; p.leftElbow = { x: -0.25 }; p.rightHand = { x: 0.2 }; p.leftHand = { x: 0.2 };
    return p;
  },

  // đặt vật xuống: cúi xuống, tay buông ra, đứng thẳng lại; ~0,8 s, không lặp
  putDown: (t, o = {}) => {
    const dur = o.dur ?? 0.8, k = clamp01(t / dur), d = Math.pow(S(PI * k), 0.8), rel = ease((k - 0.45) / 0.35), p = standBase(t);
    p.body = { y: -0.12 * d }; p.torso = { x: 0.1 + 0.55 * d }; p.head = { x: 0.05 - 0.2 * d };
    p.rightLeg = { x: -0.5 * d, z: -0.12 }; p.leftLeg = { x: -0.5 * d, z: 0.12 }; p.rightKnee = { x: 0.8 * d }; p.leftKnee = { x: 0.8 * d };
    p.rightFoot = { x: -0.3 * d }; p.leftFoot = { x: -0.3 * d };
    const ax = -0.95 * (1 - d * 0.1) * (1 - rel) + 0.05 * rel - 0.35 * d * (1 - rel), az = (0.2 * (1 - rel)) - 0.22 * rel;
    p.rightArm = { x: ax, z: az }; p.leftArm = { x: ax, z: -az };
    p.rightElbow = { x: -0.7 * (1 - rel) - 0.2 * rel }; p.leftElbow = { x: -0.7 * (1 - rel) - 0.2 * rel };
    return p;
  },

  // biến mất: hơi giật mình rồi co về 0 + xoay nhẹ trong ~0,35 s cuối của `dur` (mặc định 0,9 s); sau đó giữ scale ≈ 0
  vanish: (t, o = {}) => {
    const sp = o.speed ?? 1, tt = t * sp, dur = o.dur ?? 0.9, win = Math.min(0.35, dur), t0 = dur - win, k = clamp01((tt - t0) / win), e = k * k * (3 - 2 * k);
    const p = sitBase(t);
    const wob = S(tt * 22) * 0.04 * (1 - k);
    p.body = { y: SIT_BODY_Y + 0.1 * S(PI * k) , ry: 1.6 * e, rz: wob, ds: 0.999 * e };
    p.head = { x: -0.15 * S(PI * clamp01(tt / t0)), z: 0.12 }; p.rightArm = { x: -0.6, z: -1.0 }; p.leftArm = { x: -0.6, z: 1.0 };
    p.fx = { dust: e, at: k };   // gợi ý cho VFX (bụi lấp lánh): dust = tiến độ co 0..1
    return p;
  },

  wave: (t) => {
    const p = sitBase(t, { look: 0.1 }), w = S(t * 9);
    p.rightArm = { x: -0.3, z: -2.35 }; p.rightElbow = { x: -0.3, z: -0.2 + 0.5 * w }; p.rightHand = { z: 0.25 * S(t * 9 - 0.7) };
    p.head = { x: 0.04, z: 0.14 };
    return p;
  },

  // sợ / co rúm: run, hai tay ôm đầu (đứng khom)
  scared: (t) => {
    const j = S(t * 45) * 0.04, p = standBase(t);
    p.body = { y: -0.1, x: j }; p.torso = { x: 0.3 }; p.head = { x: 0.15, z: j };
    p.rightLeg = { x: -0.5, z: -0.12 }; p.leftLeg = { x: -0.5, z: 0.12 }; p.rightKnee = { x: 0.9 }; p.leftKnee = { x: 0.9 };
    p.rightArm = { x: -2.3, z: 0.25 }; p.leftArm = { x: -2.3, z: -0.25 }; p.rightElbow = { x: -1.4 + j * 3 }; p.leftElbow = { x: -1.4 - j * 3 };
    return p;
  },
};
BEAR_ANIMATIONS.cower = BEAR_ANIMATIONS.scared; BEAR_ANIMATIONS.panic = BEAR_ANIMATIONS.scared;

// ---------- pose helpers (không phụ thuộc r15.js) ----------
const ZERO = Object.freeze({});
export function bearApplyPose(parts, pose) {
  for (const j of BEAR_JOINTS) { const r = pose[j] || ZERO; parts[j].rotation.set(r.x || 0, r.y || 0, r.z || 0); }
  const b = pose.body || ZERO;
  parts.body.position.set(b.x || 0, b.y || 0, b.z || 0);
  parts.body.rotation.set(b.rx || 0, b.ry || 0, b.rz || 0);
  parts.body.scale.setScalar(Math.max(1 - (b.ds || 0), 0.001));
}
export function bearMixPose(a, b, w) {
  const out = {};
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (k === 'face' || k === 'gaze' || k === 'fx') { out[k] = w < 0.5 ? a[k] : b[k]; continue; }
    const pa = a[k] || ZERO, pb = b[k] || ZERO, sub = {};
    for (const c of new Set([...Object.keys(pa), ...Object.keys(pb)])) sub[c] = (pa[c] || 0) * (1 - w) + (pb[c] || 0) * w;
    out[k] = sub;
  }
  return out;
}
export function bearSample(name, t, opt = {}) {
  const fn = BEAR_ANIMATIONS[name] || BEAR_ANIMATIONS.idle;   // tên lạ → idle
  let pose = fn(t, opt);
  if (opt.from && opt.mix !== undefined && opt.mix < 1) pose = bearMixPose((BEAR_ANIMATIONS[opt.from] || BEAR_ANIMATIONS.idle)(opt.fromT ?? t, opt), pose, opt.mix);
  return pose;
}

// ---------- dựng ----------
export function createBear(THREE, opts = {}) {
  const o = { ...BEAR_DEFAULTS, ...opts };
  const root = new THREE.Group(); root.name = o.name;
  const std = (c, rough = 1) => new THREE.MeshStandardMaterial({ color: c, roughness: rough, metalness: 0 });
  const M = { fur: std(o.fur, 0.95), furDark: std(o.fur, 0.95), muzzle: std(o.muzzle, 0.9), belly: std(o.belly, 0.95), eye: std(o.eye, 0.25), nose: std(o.nose, 0.35),
    blush: std(o.blush, 0.9), bow: std(o.bow, 0.5), bowKnot: std(o.bow, 0.5), earIn: std(o.muzzle, 0.95) };
  M.furDark.color.multiplyScalar(0.8); M.earIn.color.set(o.blush).lerp(new THREE.Color(o.muzzle), 0.55); M.bowKnot.color.multiplyScalar(0.72);
  for (const k of ['bow', 'bowKnot']) { M[k].emissive = new THREE.Color(M[k].color).multiplyScalar(0.28); }   // nơ nổi rõ dưới ánh sáng dịu
  const ball = new THREE.SphereGeometry(1, 28, 20), meshes = [];
  const piv = (name, x, y, z, parent) => { const g = new THREE.Group(); g.name = name; g.position.set(x, y, z); parent.add(g); return g; };
  const blob = (parent, name, mat, [rx, ry, rz], [x, y, z] = [0, 0, 0], rot) => {
    const m = new THREE.Mesh(ball, mat); m.name = name; m.scale.set(rx, ry, rz); m.position.set(x, y, z); if (rot) m.rotation.set(...rot);
    m.castShadow = true; m.receiveShadow = true; parent.add(m); meshes.push(m); return m;
  };

  const body = piv('body', 0, 0, 0, root);
  const hips = piv('Hips', 0, BEAR_DIMS.hipsY, 0, body);
  const torso = piv('Torso', 0, 0.25, 0, hips);
  const head = piv('Head', 0, 0.33, 0, torso);
  blob(hips, 'seat', M.fur, [0.4, 0.38, 0.4], [0, -0.02, -0.04]);
  blob(torso, 'belly', M.fur, [0.52, 0.45, 0.47], [0, 0.02, 0]);
  blob(torso, 'belly_patch', M.belly, [0.33, 0.31, 0.1], [0, -0.04, 0.4]);
  blob(hips, 'tail', M.fur, [0.14, 0.14, 0.14], [0, -0.05, -0.42]);
  // đầu to + mõm + mặt hạt
  blob(head, 'head_mesh', M.fur, [0.6, 0.52, 0.54], [0, 0.4, 0]);
  blob(head, 'muzzle', M.muzzle, [0.25, 0.2, 0.18], [0, 0.27, 0.45]);
  blob(head, 'nose', M.nose, [0.08, 0.058, 0.05], [0, 0.365, 0.62]);
  for (const sx of [-1, 1]) {
    blob(head, sx < 0 ? 'eye_R' : 'eye_L', M.eye, [0.075, 0.085, 0.055], [sx * 0.22, 0.47, 0.485]);
    blob(head, sx < 0 ? 'cheek_R' : 'cheek_L', M.blush, [0.09, 0.06, 0.03], [sx * 0.38, 0.3, 0.38], [0, sx * 0.55, 0]);
    // tai theo đầu (nằm trong nhóm đầu): vành ngoài + ruột sáng
    const ear = piv(sx < 0 ? 'ear_R' : 'ear_L', sx * 0.4, 0.78, -0.02, head); ear.rotation.z = -sx * 0.25;
    blob(ear, 'ear_mesh', M.fur, [0.2, 0.2, 0.13]);
    blob(ear, 'ear_inner', M.earIn, [0.12, 0.12, 0.05], [0, 0, 0.1]);
  }
  const mouthG = new THREE.TorusGeometry(0.065, 0.013, 6, 18, PI);
  for (const sx of [-1, 1]) { const m = new THREE.Mesh(mouthG, M.nose); m.name = 'mouth'; m.position.set(sx * 0.062, 0.268, 0.615); m.rotation.z = PI; head.add(m); }
  const lip = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.07, 6), M.nose); lip.name = 'mouth_line'; lip.position.set(0, 0.32, 0.62); head.add(lip);
  const hat = piv('hat', 0, 0.9, 0, head);
  // nơ ở cổ (theo thân)
  const bow = piv('bow', 0, 0.2, 0.44, torso);
  blob(bow, 'bow_knot', M.bowKnot, [0.1, 0.1, 0.08]);
  for (const sx of [-1, 1]) {
    const w = new THREE.Mesh(new THREE.ConeGeometry(0.21, 0.3, 14), M.bow); w.name = sx < 0 ? 'bow_wing_R' : 'bow_wing_L';
    w.rotation.z = sx * PI / 2; w.position.set(sx * 0.24, 0, 0); w.scale.set(1, 1, 0.5); w.castShadow = true; bow.add(w); meshes.push(w);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.22, 0.035), M.bow); tail.name = 'bow_tail'; tail.position.set(sx * 0.06, -0.17, 0.0); tail.rotation.z = sx * 0.22; bow.add(tail); meshes.push(tail);
  }
  // tay + chân
  const arm = {}, leg = {};
  for (const [side, sx] of [['Right', -1], ['Left', 1]]) {
    const up = piv(side + 'UpperArm', sx * 0.5, 0.2, 0.02, torso);
    blob(up, 'arm_upper', M.fur, [0.17, 0.26, 0.17], [0, -0.17, 0]);
    const lo = piv(side + 'LowerArm', 0, -0.34, 0, up);
    blob(lo, 'arm_lower', M.fur, [0.15, 0.2, 0.15], [0, -0.12, 0]);
    const hd = piv(side + 'Hand', 0, -0.26, 0, lo);
    blob(hd, 'paw', M.fur, [0.14, 0.14, 0.14], [0, -0.03, 0]);
    blob(hd, 'paw_pad', M.muzzle, [0.07, 0.07, 0.04], [0, -0.03, 0.11]);
    arm[side] = { up, lo, hd };
    const th = piv(side + 'UpperLeg', sx * 0.27, -0.05, 0, hips);
    blob(th, 'leg_upper', M.fur, [0.22, 0.26, 0.23], [0, -0.17, 0]);
    const kn = piv(side + 'LowerLeg', 0, -0.3, 0, th);
    blob(kn, 'leg_lower', M.fur, [0.18, 0.2, 0.18], [0, -0.11, 0]);
    const ft = piv(side + 'Foot', 0, -0.22, 0, kn);
    blob(ft, 'foot', M.fur, [0.18, 0.1, 0.26], [0, -0.02, 0.07]);
    blob(ft, 'foot_pad', M.muzzle, [0.12, 0.012, 0.17], [0, -0.115, 0.08]);
    leg[side] = { th, kn, ft };
  }
  const parts = {
    root, body, hips, torso, head, hat, bow,
    rightArm: arm.Right.up, leftArm: arm.Left.up, rightElbow: arm.Right.lo, leftElbow: arm.Left.lo, rightHand: arm.Right.hd, leftHand: arm.Left.hd,
    rightLeg: leg.Right.th, leftLeg: leg.Left.th, rightKnee: leg.Right.kn, leftKnee: leg.Left.kn, rightFoot: leg.Right.ft, leftFoot: leg.Left.ft,
    Head: head, UpperTorso: torso, LowerTorso: hips,
    RightUpperArm: arm.Right.up, RightLowerArm: arm.Right.lo, RightHand: arm.Right.hd, LeftUpperArm: arm.Left.up, LeftLowerArm: arm.Left.lo, LeftHand: arm.Left.hd,
    RightUpperLeg: leg.Right.th, RightLowerLeg: leg.Right.kn, RightFoot: leg.Right.ft, LeftUpperLeg: leg.Left.th, LeftLowerLeg: leg.Left.kn, LeftFoot: leg.Left.ft,
  };
  root.userData.vai = 'nguoi';
  for (const k of ['rightArm', 'leftArm']) parts[k].userData.vai = 'tay';
  for (const k of ['rightLeg', 'leftLeg']) parts[k].userData.vai = 'chan-nguoi';

  // Camera của đạo diễn (engine/shots.js anchorOf) ngắm "root + 4,2" (ngực/mặt người cao 5,2) → với gấu cao 2,2 sẽ ngắm quá cao.
  // Bù: báo vị trí thế giới của root thấp đi sao cho điểm neo trúng đầu gấu (theo cả scale cast). Chỉ anchorOf gọi root.getWorldPosition.
  const proto = THREE.Object3D.prototype.getWorldPosition;
  root.getWorldPosition = function (target) {
    proto.call(this, target);
    if (o.cameraAnchor !== false) target.y -= 4.2 - BEAR_DIMS.anchorY * this.scale.y;
    return target;
  };

  let lastT = 0;
  const char = {
    parts, root, options: o, materials: { fur: M.fur, skin: M.fur, outfit: M.fur, shirt: M.bow, pants: M.fur, face: M.eye, bow: M.bow, muzzle: M.muzzle }, meshes,
    isBear: true, height: BEAR_DIMS.height, anchorY: BEAR_DIMS.anchorY,
    headCenter: [0, 0.4, 0], faceCenter: [0, 0.35, 0.55], handGrip: [0, -0.1, 0.12],
    // mặt hạt: không đổi theo biểu cảm; chỉ ghi nhận tên để đạo diễn không gọi lại mỗi khung, không ném lỗi với tên bất kỳ
    setFace(expr) { o.face = expr; },
    faceAt() { return { brows: 'neutral', eyes: 'open', mouth: 'smile', extras: [], bear: true }; },
    sampleFace() { return undefined; },
    attach(part, obj, pos) {
      const p = parts[part] || parts.rightHand, isHand = p === parts.rightHand || p === parts.leftHand;
      p.add(obj); obj.position.set(...(pos || (isHand ? char.handGrip : [0, -0.6, 0.3]))); return obj;
    },
    setColors({ fur, bow: bw } = {}) {
      if (fur) { o.fur = fur; M.fur.color.set(fur); M.furDark.color.set(fur).multiplyScalar(0.8); }
      if (bw) { o.bow = bw; M.bow.color.set(bw); M.bowKnot.color.set(bw).multiplyScalar(0.72); M.bow.emissive.copy(M.bow.color).multiplyScalar(0.28); M.bowKnot.emissive.copy(M.bowKnot.color).multiplyScalar(0.28); }
    },
    setHat() { /* gấu không đội mũ */ },
    setDetail() { return {}; },
    apply(pose) { bearApplyPose(parts, pose); },
    animate(name, t, opt = {}) {
      lastT = t;
      const pose = bearSample(name, t, opt);
      bearApplyPose(parts, pose);
      char.lastPose = pose;
      return pose;
    },
  };
  root.userData.setFace = (f) => char.setFace(f);
  root.userData.setDetail = (d) => char.setDetail(d);
  bearApplyPose(parts, BEAR_ANIMATIONS.idle(0));
  char.lastPose = BEAR_ANIMATIONS.idle(0);
  return char;
}
