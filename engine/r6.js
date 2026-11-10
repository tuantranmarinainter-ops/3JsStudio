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
  hat: 'none',       // none | cap | tophat | beanie
  hatColor: '#c0392b',
  // --- phụ kiện (tuỳ chọn, mặc định tắt) ---
  faceStyle: 'classic', // classic | cartoon (mắt oval trắng-đen, lông mày)
  sleeves: null,     // màu tay áo (null = tay trần màu da); có tay áo thì thêm bàn tay màu da
  shirtPattern: null, // null | stripes | torn
  shirtPattern2: '#ffffff', // màu phụ của hoa văn
  pantsPattern: null, // null | torn
  shoes: null,       // màu giày (null = không)
  hair: 'none',      // none | braids | short
  hairColor: '#1b1b1b',
  beard: null,       // màu râu dài (null = không)
  scarf: null,       // màu khăn/nơ cổ
  skirt: null,       // màu váy dài
  hoodie: null,      // màu dây áo hoodie (null = không)
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
  const shirtMat = o.shirtPattern ? patternMat(THREE, o.shirt, o.shirtPattern, o.shirtPattern2) : mat(o.shirt);
  torso.add(box(2, 2, 1, shirtMat, 'torso_mesh'));

  // Đầu: pivot ở cổ (đỉnh thân)
  const head = pivot('head', 0, 1, 0, torso);
  const skin = mat(o.skin);
  const faceCanvas = document.createElement('canvas');
  faceCanvas.width = faceCanvas.height = 256;
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
  const armMat = o.sleeves ? (o.shirtPattern ? patternMat(THREE, o.sleeves, o.shirtPattern, o.shirtPattern2) : mat(o.sleeves)) : skin;
  rightArm.add(box(1, 2, 1, armMat, 'rightArm_mesh'));
  leftArm.add(box(1, 2, 1, armMat, 'leftArm_mesh'));
  rightArm.children[0].position.y = -0.5;
  leftArm.children[0].position.y = -0.5;
  if (o.sleeves) {           // bàn tay màu da ở cuối tay áo
    for (const a of [rightArm, leftArm]) {
      const h = box(1.02, 0.45, 1.02, skin, a.name + '_hand');
      h.position.y = -1.3; a.add(h);
    }
  }

  // Chân: pivot ở hông
  const pantsMat = o.pantsPattern ? patternMat(THREE, o.pants, o.pantsPattern, o.skin) : mat(o.pants);
  const rightLeg = pivot('rightLeg', -0.5, -1, 0, torso);
  const leftLeg = pivot('leftLeg', 0.5, -1, 0, torso);
  rightLeg.add(box(1, 2, 1, pantsMat, 'rightLeg_mesh'));
  leftLeg.add(box(1, 2, 1, pantsMat, 'leftLeg_mesh'));
  rightLeg.children[0].position.y = -1;
  leftLeg.children[0].position.y = -1;
  if (o.shoes) {
    const shoeMat = mat(o.shoes), sole = mat('#f4f4f4');
    for (const l of [rightLeg, leftLeg]) {
      const sh = box(1.04, 0.38, 1.12, shoeMat, l.name + '_shoe'); sh.position.set(0, -1.83, 0.05); l.add(sh);
      const so = box(1.06, 0.12, 1.16, sole, l.name + '_sole'); so.position.set(0, -1.97, 0.05); l.add(so);
    }
  }

  // Mũ (tuỳ chọn)
  const hat = new THREE.Group();
  hat.name = 'hat';
  hat.position.y = 1.2;
  head.add(hat);

  buildExtras(THREE, { torso, head, o, box, mat });

  const parts = { root, body, torso, head, rightArm, leftArm, rightLeg, leftLeg, hat };
  const materials = { skin, shirt: torso.children[0].material, pants: pantsMat, face: faceMat };

  const char = {
    parts,
    root,
    materials,
    options: o,
    setFace(expr) {
      o.face = expr;
      (o.faceStyle === 'cartoon' ? drawCartoonFace : drawFace)(faceCanvas, o.skin, expr, o);
      faceTex.needsUpdate = true;
    },
    // gắn vật vào bộ phận (vd. thiếp vào tay phải): attach('rightArm', mesh, [x,y,z])
    attach(part, obj, pos = [0, -1.6, 0.6]) { parts[part].add(obj); obj.position.set(...pos); return obj; },
    setColors({ skin: s, shirt, pants } = {}) {
      if (s) { o.skin = s; skin.color.set(s); char.setFace(o.face); }
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
  g.setTransform(cv.width / 128, 0, 0, cv.height / 128, 0, 0);
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
  group.position.y = 1.2;
  while (group.children.length) {
    const c = group.children.pop();
    c.geometry?.dispose();
  }
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.7 });
  const add = (geo, y, z = 0) => { const mesh = new THREE.Mesh(geo, m); mesh.position.set(0, y, z); mesh.castShadow = true; group.add(mesh); };
  if (type === 'cap') {
    add(new THREE.BoxGeometry(1.3, 0.35, 1.3), 0.17);
    add(new THREE.BoxGeometry(1.2, 0.08, 0.6), 0.04, 0.85);
  } else if (type === 'beanie') {   // mũ len có gân + vành gập
    const ribs = new THREE.MeshStandardMaterial({ color, roughness: 0.95 });
    const dark = new THREE.MeshStandardMaterial({ color: new THREE.Color(color).multiplyScalar(0.8), roughness: 0.95 });
    const band = new THREE.Mesh(new THREE.BoxGeometry(1.34, 0.42, 1.34), dark); band.position.y = 0.05; group.add(band);
    for (let i = 0; i < 9; i++) {
      const r = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.62, 1.26), i % 2 ? ribs : dark);
      r.position.set(-0.58 + i * 0.145, 0.5, 0); group.add(r);
    }
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.22, 1.08), ribs); top.position.y = 0.88; group.add(top);
    group.position.y = 1.0;
    group.traverse((m) => { if (m.isMesh) m.castShadow = true; });
    return;
  } else if (type === 'tophat') {
    add(new THREE.BoxGeometry(1.6, 0.1, 1.6), 0.05);
    add(new THREE.BoxGeometry(1.0, 1.0, 1.0), 0.6);
  }
}

// ---------- Hoa văn áo/quần (canvas) ----------
function patternMat(THREE, base, kind, c2) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 128;
  const g = cv.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, 128, 128);
  if (kind === 'stripes') {
    g.fillStyle = c2; for (let x = 0; x < 128; x += 16) g.fillRect(x, 0, 6, 128);
  } else if (kind === 'torn') {          // vá + mép rách
    let s = 9; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    g.fillStyle = 'rgba(0,0,0,0.22)';
    for (let i = 0; i < 7; i++) { const x = r() * 110, y = r() * 110; g.fillRect(x, y, 10 + r() * 14, 8 + r() * 10); }
    g.fillStyle = c2;
    for (let i = 0; i < 6; i++) {
      const x = r() * 120, y = r() * 120; g.beginPath(); g.moveTo(x, y);
      g.lineTo(x + 6 + r() * 8, y + 3); g.lineTo(x + 3, y + 8 + r() * 8); g.closePath(); g.fill();
    }
    g.fillStyle = base; g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(0, 120); for (let x = 0; x <= 128; x += 8) g.lineTo(x, 112 + r() * 16); g.stroke();
  }
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 });
}

// ---------- Tóc, râu, khăn, váy, dây hoodie ----------
function buildExtras(THREE, { torso, head, o, box, mat }) {
  if (o.hair === 'braids' || o.hair === 'short') {
    const hm = mat(o.hairColor);
    const top = box(1.3, 0.35, 1.3, hm, 'hair_top'); top.position.set(0, 1.25, 0); head.add(top);
    const back = box(1.3, 1.25, 0.25, hm, 'hair_back'); back.position.set(0, 0.62, -0.6); head.add(back);
    for (const sx of [-1, 1]) {
      const side = box(0.2, 1.0, 1.3, hm, 'hair_side'); side.position.set(sx * 0.66, 0.8, 0); head.add(side);
      const fr = box(0.58, 0.32, 0.12, hm, 'hair_fringe'); fr.position.set(sx * 0.33, 1.1, 0.62); fr.rotation.z = sx * 0.25; head.add(fr);
    }
    if (o.hair === 'braids') {
      for (const sx of [-1, 1]) {
        for (let i = 0; i < 5; i++) {
          const b = box(0.32, 0.36, 0.32, hm, 'braid'); b.position.set(sx * 0.78, 0.2 - i * 0.36, 0.25 + (i % 2) * 0.03);
          b.rotation.y = (i % 2) * 0.4; head.add(b);
        }
        const tie = box(0.3, 0.12, 0.3, mat('#c0392b'), 'braid_tie'); tie.position.set(sx * 0.78, -1.45, 0.26); head.add(tie);
      }
    }
  }
  if (o.beard) {
    const bm = mat(o.beard);
    const b1 = box(1.24, 0.55, 0.2, bm, 'beard'); b1.position.set(0, 0.18, 0.62); head.add(b1);
    const b2 = box(1.0, 0.7, 0.3, bm, 'beard_low'); b2.position.set(0, -0.35, 0.6); head.add(b2);
    const b3 = box(0.6, 0.5, 0.3, bm, 'beard_tip'); b3.position.set(0, -0.85, 0.58); head.add(b3);
    for (const sx of [-1, 1]) { const sd = box(0.16, 0.7, 1.0, bm, 'beard_side'); sd.position.set(sx * 0.62, 0.35, 0.1); head.add(sd); }
  }
  if (o.scarf) {
    const sm = mat(o.scarf);
    const k = box(1.4, 0.3, 1.1, sm, 'scarf'); k.position.set(0, 0.92, 0); torso.add(k);
    const bow = box(0.7, 0.35, 0.2, sm, 'scarf_bow'); bow.position.set(0, 0.72, 0.56); torso.add(bow);
    const tail = box(0.3, 0.8, 0.12, sm, 'scarf_tail'); tail.position.set(0.05, 0.3, 0.58); tail.rotation.z = 0.12; torso.add(tail);
  }
  if (o.skirt) {
    const sk = box(2.2, 2.0, 1.25, mat(o.skirt), 'skirt'); sk.position.set(0, -1.85, 0); torso.add(sk);
  }
  if (o.hoodie) {
    const hm = mat(o.hoodie);
    for (const sx of [-1, 1]) { const st = box(0.12, 1.0, 0.08, hm, 'hoodie_string'); st.position.set(sx * 0.3, 0.35, 0.53); torso.add(st); }
    const hood = box(1.7, 0.45, 0.5, mat(o.shirt), 'hood'); hood.position.set(0, 1.0, -0.42); torso.add(hood);
  }
}

// ---------- Mặt hoạt hình (mắt oval trắng, đồng tử đen, lông mày) ----------
function drawCartoonFace(cv, skinColor, expr) {
  const g = cv.getContext('2d');
  g.setTransform(cv.width / 128, 0, 0, cv.height / 128, 0, 0);
  g.fillStyle = skinColor; g.fillRect(0, 0, 128, 128);
  const ink = '#1b1b1b';
  g.lineCap = 'round'; g.lineJoin = 'round';
  const eye = (x, y, rx, ry, px = 0, py = 0, pr = 0.55) => {
    g.fillStyle = '#fff'; g.strokeStyle = ink; g.lineWidth = 3;
    g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill(); g.stroke();
    g.fillStyle = ink; g.beginPath(); g.ellipse(x + px, y + py, rx * pr, ry * pr, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(x + px - rx * 0.2, y + py - ry * 0.25, rx * 0.16, 0, Math.PI * 2); g.fill();
  };
  const stroke = (w, pts) => { g.strokeStyle = ink; g.lineWidth = w; g.beginPath(); g.moveTo(...pts[0]); for (const p of pts.slice(1)) g.lineTo(...p); g.stroke(); };
  const brows = (dy, tiltIn) => { stroke(4, [[30, 34 + dy - tiltIn], [52, 34 + dy + tiltIn]]); stroke(4, [[98, 34 + dy - tiltIn], [76, 34 + dy + tiltIn]]); };
  const mouth = (cy, r, a0, a1, w = 4) => { g.strokeStyle = ink; g.lineWidth = w; g.beginPath(); g.arc(64, cy, r, a0, a1); g.stroke(); };
  const open = (cx, cy, rx, ry) => { g.fillStyle = '#3a1c1c'; g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); g.fill(); };
  const closed = (y) => { mouth(y - 6, 10, Math.PI * 0.15, Math.PI * 0.85, 4); };
  switch (expr) {
    case 'happy':
      stroke(5, [[32, 58], [42, 50], [52, 58]]); stroke(5, [[76, 58], [86, 50], [96, 58]]);
      g.fillStyle = '#3a1c1c'; g.beginPath(); g.arc(64, 78, 16, 0, Math.PI); g.closePath(); g.fill();
      g.fillStyle = '#e06666'; g.beginPath(); g.ellipse(64, 88, 8, 4, 0, 0, Math.PI * 2); g.fill(); break;
    case 'surprised':
      eye(42, 54, 12, 15, 0, 0, 0.42); eye(86, 54, 12, 15, 0, 0, 0.42); brows(-6, -2); open(64, 92, 7, 9); break;
    case 'scared': case 'panic':
      eye(42, 54, 12, 15, 0, 2, 0.38); eye(86, 54, 12, 15, 0, 2, 0.38); brows(-4, -5);
      open(64, 94, 10, 8); break;
    case 'worried': case 'sad':
      eye(42, 56, 10, 13, 0, 2); eye(86, 56, 10, 13, 0, 2); brows(-2, -5);
      mouth(102, 12, Math.PI * 1.2, Math.PI * 1.8, 4); break;
    case 'cold':   // nhắm tịt mắt >< + miệng run
      stroke(5, [[30, 46], [50, 54], [30, 62]]); stroke(5, [[98, 46], [78, 54], [98, 62]]);
      stroke(4, [[48, 90], [54, 86], [60, 90], [66, 86], [72, 90], [78, 86]]); break;
    case 'sleep': case 'sleepy':
      stroke(4, [[32, 56], [52, 56]]); stroke(4, [[76, 56], [96, 56]]); closed(90); break;
    case 'moved':  // xúc động: mắt long lanh, môi mím
      eye(42, 55, 10, 13, 0, 1, 0.6); eye(86, 55, 10, 13, 0, 1, 0.6); brows(-3, -4);
      g.fillStyle = '#7fc8ff'; g.beginPath(); g.ellipse(36, 72, 3, 6, 0, 0, Math.PI * 2); g.fill();
      mouth(96, 7, Math.PI * 1.15, Math.PI * 1.85, 4); break;
    case 'neutral':
      eye(42, 55, 10, 13); eye(86, 55, 10, 13); stroke(4, [[54, 88], [74, 88]]); break;
    case 'angry':
      eye(42, 58, 10, 11); eye(86, 58, 10, 11); brows(2, 5); mouth(100, 10, Math.PI * 1.2, Math.PI * 1.8); break;
    case 'smile': default:
      eye(42, 55, 10, 13); eye(86, 55, 10, 13); closed(92); break;
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

  // nằm ngủ (dùng kèm root xoay nằm): tay xuôi
  lie: (t) => ({ body: { y: S(t * 1.2) * 0.03 }, face: 'sleep' }),

  shiver: (t) => ({
    body: { x: S(t * 50) * 0.05 },
    torso: { x: 0.12 }, head: { x: 0.15 },
    rightArm: { x: -0.9, z: 0.7 }, leftArm: { x: -0.9, z: -0.7 },
    face: 'cold',
  }),

  // cầm vật trước ngực bằng hai tay
  hold: (t) => ({
    ...R6_ANIMATIONS.idle(t),
    rightArm: { x: -1.25, z: 0.28 }, leftArm: { x: -1.25, z: -0.28 },
  }),

  // giơ hai tay hoảng hốt
  panic: (t) => ({
    body: { y: Math.abs(S(t * 7)) * 0.08 },
    rightArm: { x: -0.4, z: -1.9 + S(t * 9) * 0.25 }, leftArm: { x: -0.4, z: 1.9 - S(t * 9 + 1) * 0.25 },
    head: { z: S(t * 4) * 0.08 },
    face: 'panic',
  }),

  // ôm (tay vòng ra trước)
  hug: (t) => ({
    body: { y: Math.abs(S(t * 3)) * 0.05 },
    rightArm: { x: -1.5, z: 0.75 }, leftArm: { x: -1.5, z: -0.75 },
    face: 'happy',
  }),

  // ngồi ôm vật trên đùi
  sitHold: (t) => ({
    body: { y: -1.5 },
    rightLeg: { x: -PI / 2 }, leftLeg: { x: -PI / 2 },
    rightArm: { x: -0.95, z: 0.25 }, leftArm: { x: -0.95, z: -0.25 },
    head: { x: 0.25 + S(t * 0.8) * 0.03 },
  }),

  // ngồi viết
  write: (t) => ({
    body: { y: -1.5 },
    rightLeg: { x: -PI / 2 }, leftLeg: { x: -PI / 2 },
    rightArm: { x: -1.1 + S(t * 9) * 0.08, y: S(t * 4) * 0.15 }, leftArm: { x: -0.9, z: -0.15 },
    head: { x: 0.35 },
  }),

  lookUp: (t) => ({ ...R6_ANIMATIONS.idle(t), head: { x: -0.45 }, torso: { x: -0.08 } }),

  // ngã ngửa (không lặp)
  tumble: (t) => {
    const k = ease(clamp01(t / 0.6));
    return {
      body: { rx: -k * PI / 2, y: k * 0.5 },
      rightArm: { z: -0.5 - k * 1.8 }, leftArm: { z: 0.5 + k * 1.8 },
      rightLeg: { x: -k * 0.6 }, leftLeg: { x: -k * 0.3 },
      face: 'happy',
    };
  },

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
