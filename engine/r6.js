// r6.js — Nhân vật khối vuông kiểu R6 (6 khối) cho three.js.
// Phong cách khối chung chung, KHÔNG dùng asset/logo chính thức của Roblox.
//
// Dùng:
//   import * as THREE from 'three';
//   import { createR6, R6_ANIMATIONS } from './r6.js';
//   const hero = createR6(THREE, { name: 'hero', shirt: '#e74c3c', face: 'smile' });
//   scene.add(hero.root);
//   // trong render(t):  hero.animate('walk', t);
//   // chuyển mượt:       hero.animate('run', t, { from: 'walk', mix: 0.5 });
//
// Đơn vị: 1 = 1 "stud". Nhân vật cao ~5.2, đứng tại gốc toạ độ, mặt nhìn về +Z.
// Mọi animation là hàm thuần của t (giây) → render theo frame không giật.

export const R6_DEFAULTS = {
  name: 'r6',
  skin: '#f2c94c',   // đầu + tay
  shirt: '#2d6cdf',  // thân
  pants: '#3fa34d',  // chân
  face: 'smile',     // smile | happy | neutral | sad | scared | surprised | angry | sleepy
  hat: 'none',       // none | cap | tophat
  hatColor: '#c0392b',
};

export const R6_FACES = ['smile', 'happy', 'neutral', 'sad', 'scared', 'surprised', 'angry', 'sleepy'];

// ---------- Khung xương & hình khối ----------
export function createR6(THREE, opts = {}) {
  const o = { ...R6_DEFAULTS, ...opts };
  const mat = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.75, metalness: 0 });
  const box = (w, h, d, m, name) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    mesh.name = name;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  };
  const pivot = (name, x, y, z, parent) => {
    const g = new THREE.Group();
    g.name = name;
    g.position.set(x, y, z);
    parent.add(g);
    return g;
  };

  const root = new THREE.Group();
  root.name = o.name;
  // body: nhận dịch chuyển nhún/nhảy/ngã (pivot ở chân)
  const body = pivot('body', 0, 0, 0, root);

  // Thân: tâm ở y=3 (chân 0..2, thân 2..4)
  const torso = pivot('torso', 0, 3, 0, body);
  torso.add(box(2, 2, 1, mat(o.shirt), 'torso_mesh'));

  // Đầu: pivot ở cổ (đỉnh thân)
  const head = pivot('head', 0, 1, 0, torso);
  const skin = mat(o.skin);
  const faceCanvas = document.createElement('canvas');
  faceCanvas.width = faceCanvas.height = 128;
  const faceTex = new THREE.CanvasTexture(faceCanvas);
  faceTex.colorSpace = THREE.SRGBColorSpace;
  const faceMat = new THREE.MeshStandardMaterial({ map: faceTex, roughness: 0.75 });
  // thứ tự mặt BoxGeometry: +x, -x, +y, -y, +z(trước), -z
  const headMesh = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), [skin, skin, skin, skin, faceMat, skin]);
  headMesh.name = 'head_mesh';
  headMesh.position.y = 0.6;
  headMesh.castShadow = headMesh.receiveShadow = true;
  head.add(headMesh);

  // Tay: pivot ở vai. Mặt nhìn +Z nên tay PHẢI của nhân vật nằm ở -X.
  const rightArm = pivot('rightArm', -1.5, 0.5, 0, torso);
  const leftArm = pivot('leftArm', 1.5, 0.5, 0, torso);
  rightArm.add(box(1, 2, 1, skin, 'rightArm_mesh'));
  leftArm.add(box(1, 2, 1, skin, 'leftArm_mesh'));
  rightArm.children[0].position.y = -0.5;
  leftArm.children[0].position.y = -0.5;

  // Chân: pivot ở hông
  const pantsMat = mat(o.pants);
  const rightLeg = pivot('rightLeg', -0.5, -1, 0, torso);
  const leftLeg = pivot('leftLeg', 0.5, -1, 0, torso);
  rightLeg.add(box(1, 2, 1, pantsMat, 'rightLeg_mesh'));
  leftLeg.add(box(1, 2, 1, pantsMat, 'leftLeg_mesh'));
  rightLeg.children[0].position.y = -1;
  leftLeg.children[0].position.y = -1;

  // Mũ (tuỳ chọn)
  const hat = new THREE.Group();
  hat.name = 'hat';
  hat.position.y = 1.2;
  head.add(hat);

  const parts = { root, body, torso, head, rightArm, leftArm, rightLeg, leftLeg, hat };
  const materials = { skin, shirt: torso.children[0].material, pants: pantsMat, face: faceMat };

  const char = {
    parts,
    root,
    materials,
    options: o,
    setFace(expr) { o.face = expr; drawFace(faceCanvas, o.skin, expr); faceTex.needsUpdate = true; },
    setColors({ skin: s, shirt, pants } = {}) {
      if (s) { o.skin = s; skin.color.set(s); drawFace(faceCanvas, s, o.face); faceTex.needsUpdate = true; }
      if (shirt) { o.shirt = shirt; materials.shirt.color.set(shirt); }
      if (pants) { o.pants = pants; pantsMat.color.set(pants); }
    },
    setHat(type, color = o.hatColor) { o.hat = type; o.hatColor = color; buildHat(THREE, hat, type, color); },
    apply(pose) { applyPose(parts, pose); },
    animate(name, t, opt = {}) {
      let pose = samplePose(name, t, opt);
      if (opt.from && opt.mix !== undefined && opt.mix < 1) {
        pose = mixPose(samplePose(opt.from, opt.fromT ?? t, opt), pose, opt.mix);
      }
      applyPose(parts, pose);
      return pose;
    },
  };

  root.userData.setFace = (f) => char.setFace(f);
  char.setFace(o.face);
  char.setHat(o.hat, o.hatColor);
  return char;
}

// ---------- Mặt vẽ bằng canvas ----------
function drawFace(cv, skinColor, expr) {
  const g = cv.getContext('2d');
  g.fillStyle = skinColor;
  g.fillRect(0, 0, 128, 128);
  g.fillStyle = '#1b1b1b';
  g.strokeStyle = '#1b1b1b';
  g.lineWidth = 6;
  g.lineCap = 'round';
  const eye = (x, y, rx = 7, ry = 11) => { g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill(); };
  const arc = (cy, r, a0, a1) => { g.beginPath(); g.arc(64, cy, r, a0, a1); g.stroke(); };
  const line = (x0, y0, x1, y1) => { g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); };

  switch (expr) {
    case 'happy': // mắt cười ^^ + miệng há
      g.beginPath(); g.arc(44, 58, 9, Math.PI, 0); g.stroke();
      g.beginPath(); g.arc(84, 58, 9, Math.PI, 0); g.stroke();
      g.beginPath(); g.arc(64, 74, 22, 0, Math.PI); g.closePath(); g.fill();
      break;
    case 'neutral':
      eye(44, 54); eye(84, 54); line(48, 88, 80, 88); break;
    case 'sad':
      eye(44, 56); eye(84, 56); arc(102, 18, Math.PI * 1.2, Math.PI * 1.8); break;
    case 'scared':
      g.fillStyle = '#fff'; eye(44, 52, 12, 14); eye(84, 52, 12, 14);
      g.fillStyle = '#1b1b1b'; eye(44, 54, 5, 6); eye(84, 54, 5, 6);
      line(30, 34, 54, 40); line(98, 34, 74, 40);
      g.beginPath(); g.ellipse(64, 92, 10, 14, 0, 0, Math.PI * 2); g.fill(); break;
    case 'surprised':
      eye(44, 50, 8, 13); eye(84, 50, 8, 13);
      g.beginPath(); g.ellipse(64, 90, 9, 12, 0, 0, Math.PI * 2); g.fill(); break;
    case 'angry':
      eye(44, 58); eye(84, 58); line(30, 38, 56, 48); line(98, 38, 72, 48);
      arc(104, 18, Math.PI * 1.2, Math.PI * 1.8); break;
    case 'sleepy':
      line(34, 56, 54, 56); line(74, 56, 94, 56);
      g.beginPath(); g.ellipse(64, 88, 6, 7, 0, 0, Math.PI * 2); g.fill(); break;
    case 'smile':
    default:
      eye(44, 54); eye(84, 54); arc(70, 22, Math.PI * 0.2, Math.PI * 0.8); break;
  }
}

// ---------- Mũ ----------
function buildHat(THREE, group, type, color) {
  while (group.children.length) {
    const c = group.children.pop();
    c.geometry?.dispose();
  }
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.7 });
  const add = (geo, y, z = 0) => { const mesh = new THREE.Mesh(geo, m); mesh.position.set(0, y, z); mesh.castShadow = true; group.add(mesh); };
  if (type === 'cap') {
    add(new THREE.BoxGeometry(1.3, 0.35, 1.3), 0.17);
    add(new THREE.BoxGeometry(1.2, 0.08, 0.6), 0.04, 0.85);
  } else if (type === 'tophat') {
    add(new THREE.BoxGeometry(1.6, 0.1, 1.6), 0.05);
    add(new THREE.BoxGeometry(1.0, 1.0, 1.0), 0.6);
  }
}

// ---------- Hệ thống pose ----------
// Pose = { body:{y,rx,rz,x}, torso:{x,y,z}, head:{...}, rightArm, leftArm, rightLeg, leftLeg, face? }
// Quy ước góc (radian):
//   arm/leg .x < 0  → vung ra TRƯỚC;   .x > 0 → ra sau
//   rightArm .z < 0 → giơ ngang/lên phía phải; leftArm .z > 0 → giơ phía trái
//   torso .x > 0 → cúi về trước;  body.rx > 0 → ngã sấp về trước
const JOINTS = ['torso', 'head', 'rightArm', 'leftArm', 'rightLeg', 'leftLeg'];
const PI = Math.PI;
const S = Math.sin;
const C = Math.cos;
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const ease = (v) => v * v * (3 - 2 * v);

export const R6_ANIMATIONS = {
  idle: (t) => ({
    body: { y: 0 },
    head: { y: S(t * 0.6) * 0.08 },
    rightArm: { z: -0.04 - S(t * 1.8) * 0.03 },
    leftArm: { z: 0.04 + S(t * 1.8) * 0.03 },
  }),

  walk: (t, o = {}) => {
    const s = S(t * PI * 2 * (o.speed ?? 1.6));
    const a = o.amp ?? 0.75;
    return {
      body: { y: Math.abs(s) * 0.06 },
      rightArm: { x: s * a }, leftArm: { x: -s * a },
      rightLeg: { x: -s * a }, leftLeg: { x: s * a },
    };
  },

  run: (t, o = {}) => {
    const s = S(t * PI * 2 * (o.speed ?? 2.6));
    const a = o.amp ?? 1.1;
    return {
      body: { y: Math.abs(s) * 0.18 },
      torso: { x: 0.15 },
      rightArm: { x: s * a }, leftArm: { x: -s * a },
      rightLeg: { x: -s * a }, leftLeg: { x: s * a },
    };
  },

  // nhảy lặp chu kỳ 1s, cao 2.2 stud
  jump: (t, o = {}) => {
    const p = (t % (o.period ?? 1)) / (o.period ?? 1);
    const h = o.height ?? 2.2;
    return {
      body: { y: 4 * h * p * (1 - p) },
      rightArm: { z: -2.9 }, leftArm: { z: 2.9 },
      rightLeg: { x: -0.25 }, leftLeg: { x: 0.25 },
    };
  },

  fall: (t) => ({
    rightArm: { z: -2.6 + S(t * 14) * 0.35 }, leftArm: { z: 2.6 + S(t * 14 + 1) * 0.35 },
    rightLeg: { z: -0.35 + S(t * 12) * 0.15 }, leftLeg: { z: 0.35 - S(t * 12) * 0.15 },
    face: 'scared',
  }),

  wave: (t) => ({
    ...R6_ANIMATIONS.idle(t),
    rightArm: { z: -2.7 + S(t * 9) * 0.35 },
    face: 'happy',
  }),

  point: (t) => ({
    ...R6_ANIMATIONS.idle(t),
    rightArm: { x: -PI / 2 },
    head: { y: 0 },
  }),

  sit: () => ({
    body: { y: -1.5 },
    rightLeg: { x: -PI / 2 }, leftLeg: { x: -PI / 2 },
    rightArm: { x: -0.4 }, leftArm: { x: -0.4 },
  }),

  scared: (t) => ({
    body: { x: S(t * 45) * 0.04 },
    torso: { x: -0.1 },
    rightArm: { x: -2.3, z: 0.35 }, leftArm: { x: -2.3, z: -0.35 },
    head: { x: -0.1 },
    face: 'scared',
  }),

  cheer: (t) => ({
    body: { y: Math.abs(S(t * PI * 2.5)) * 0.5 },
    rightArm: { z: -2.8 + S(t * 15) * 0.15 }, leftArm: { z: 2.8 - S(t * 15) * 0.15 },
    face: 'happy',
  }),

  dance: (t) => {
    const b = t * PI * 2 * 1.2;
    return {
      body: { y: Math.abs(S(b)) * 0.25 },
      torso: { y: S(b / 2) * 0.35 },
      rightArm: { z: S(b) > 0 ? -2.7 : -0.3 }, leftArm: { z: S(b) > 0 ? 0.3 : 2.7 },
      rightLeg: { z: -0.2 * Math.abs(S(b)) }, leftLeg: { z: 0.2 * Math.abs(S(b)) },
      head: { z: S(b) * 0.15 },
      face: 'happy',
    };
  },

  lookAround: (t) => ({
    ...R6_ANIMATIONS.idle(t),
    head: { y: S(t * 1.4) * 0.9 },
    face: 'neutral',
  }),

  // ngã sấp về trước rồi nằm im (không lặp). t tính từ lúc bắt đầu ngã.
  faint: (t) => {
    const k = ease(clamp01(t / 0.7));
    return {
      body: { rx: k * PI / 2, y: k * 0.5 },
      rightArm: { z: -k * 0.4 }, leftArm: { z: k * 0.4 },
      face: 'sleepy',
    };
  },

  // ngồi run sợ, ôm đầu
  cower: (t) => ({
    body: { y: -1.5, x: S(t * 40) * 0.03 },
    torso: { x: 0.35 },
    rightLeg: { x: -PI / 2 }, leftLeg: { x: -PI / 2 },
    rightArm: { x: -2.6, z: 0.5 }, leftArm: { x: -2.6, z: -0.5 },
    face: 'scared',
  }),

  // tư thế "đứng hình" (T-pose) — dùng để kiểm tra rig
  tpose: () => ({ rightArm: { z: -PI / 2 }, leftArm: { z: PI / 2 } }),
};

export function samplePose(name, t, opt = {}) {
  const fn = R6_ANIMATIONS[name];
  if (!fn) throw new Error(`R6: không có animation "${name}". Có: ${Object.keys(R6_ANIMATIONS).join(', ')}`);
  return fn(t, opt);
}

export function mixPose(a, b, w) {
  const out = {};
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    if (k === 'face') { out.face = w < 0.5 ? a.face : b.face; continue; }
    const pa = a[k] || {}, pb = b[k] || {};
    const sub = {};
    for (const c of new Set([...Object.keys(pa), ...Object.keys(pb)])) {
      sub[c] = (pa[c] || 0) * (1 - w) + (pb[c] || 0) * w;
    }
    out[k] = sub;
  }
  return out;
}

const lastFace = new WeakMap();
export function applyPose(parts, pose) {
  for (const j of JOINTS) {
    const r = pose[j] || {};
    parts[j].rotation.set(r.x || 0, r.y || 0, r.z || 0);
  }
  const b = pose.body || {};
  parts.body.position.set(b.x || 0, b.y || 0, b.z || 0);
  parts.body.rotation.set(b.rx || 0, b.ry || 0, b.rz || 0);
  // mặt: chỉ vẽ lại khi đổi (đọc từ hàm setFace trên đối tượng char nếu có)
  if (pose.face && parts.root.userData.setFace && lastFace.get(parts.root) !== pose.face) {
    lastFace.set(parts.root, pose.face);
    parts.root.userData.setFace(pose.face);
  }
}

// Tạo màu ngẫu nhiên có seed cho dân thị trấn
export function randomLook(seed = 1) {
  let s = seed >>> 0 || 1;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  return {
    skin: pick(['#f2c94c', '#f5d0a9', '#e0ac69', '#c68642', '#8d5524', '#ffdbac']),
    shirt: pick(['#2d6cdf', '#e74c3c', '#8e44ad', '#16a085', '#f39c12', '#2c3e50', '#ecf0f1', '#d35400']),
    pants: pick(['#3fa34d', '#34495e', '#7f8c8d', '#2c3e50', '#6d4c41', '#1a237e']),
    hat: pick(['none', 'none', 'cap', 'tophat']),
    hatColor: pick(['#c0392b', '#2c3e50', '#27ae60', '#f1c40f']),
    face: pick(['smile', 'neutral', 'happy']),
  };
}
