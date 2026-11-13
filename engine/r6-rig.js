// r6-rig.js — Nhân vật THÂN R6 (6 khối cứng: đầu, thân, 2 tay, 2 chân) chạy trên bộ xương + animation của r15.js.
// CÙNG GIAO DIỆN với createR15 / createGa → engine/cast.js, engine/shots.js dùng thay trực tiếp (cờ diễn viên r6:1).
//   import { createR6Rig } from './r6-rig.js';
//   const a = createR6Rig(THREE, { name: 'bach', faceSet, ...R6_LOOKS.bach });
// - Tay/chân là MỘT khối: góc khuỷu/gối của animation R15 được gộp một phần vào vai/hông (EK, KK) rồi đặt 0 → dáng R6 cứng.
// - Áo quần VẼ bằng canvas (dải màu quấn quanh + nét vẽ mặt trước/sau) như quần áo Roblox cổ điển; phụ kiện 3D gắn đầu/thân.
// - Mặt = decal ảnh bộ 37 emote (assets/faces/emote37/) — dùng chung cho mọi nhân vật; tên: số '24', tên Việt 'quyet_tam' hoặc tên phim 'smile'.
// Mọi thứ là hàm thuần của t; không trạng thái theo thời gian thực.
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { applyPose, mixPose, samplePose, soleHeight, GA_FACE_MAP, GA_FACES } from './r15.js';

const PI = Math.PI, S = Math.sin, C = Math.cos;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v)), clamp01 = (v) => clamp(v, 0, 1);
const strHash = (s) => { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const hash01 = (n, seed) => { let x = Math.imul(n + 1, 374761393) ^ Math.imul(seed | 0, 668265263); x = Math.imul(x ^ (x >>> 13), 1274126177); return ((x ^ (x >>> 16)) >>> 0) / 4294967296; };

export const R6_RIG_DEFAULTS = {
  name: 'r6', skin: '#f5cd30', face: 'binh_thuong', faceSet: null, faceSize: 1.0, faceY: 0.6,
  scale: 1, wide: 1, headScale: 1.12,
  shirt: '#2d6cdf', sleeves: null, pants: '#3a4a5c', shoes: '#2b2b2b', sole: null, hands: null,
  torso: null, arm: null, leg: null,     // { bands:[[y0,y1,màu]…], front:[nét…], back:[nét…] } — y tính từ trên xuống 0..1
  hair: null, hat: null, acc: [],        // hair:{style,color,…}  hat:{style,color,…}  acc:[{kind,…}]
  EK: 0.6, KK: 0.25,
};

// ---------- pose R15 → R6 cứng ----------
const r6Sole = (p, side) => {
  const h = p.hips || {}, L = p[side + 'Leg'] || {}, sx = side === 'right' ? -0.5 : 0.5;
  const a = (h.x || 0) + (L.x || 0), cz = C((h.z || 0) + (L.z || 0));
  return 2.0 + sx * S(h.z || 0) - (2.0 * C(a) + 0.5 * Math.abs(S(a))) * cz;
};
export function toR6Pose(p, EK = 0.6, KK = 0.25) {
  const q = { ...p };
  for (const s of ['right', 'left']) {
    const A = { ...(p[s + 'Arm'] || {}) }, L = { ...(p[s + 'Leg'] || {}) };
    A.x = (A.x || 0) + EK * (p[s + 'Elbow']?.x || 0); L.x = (L.x || 0) + KK * (p[s + 'Knee']?.x || 0);
    q[s + 'Arm'] = A; q[s + 'Leg'] = L; q[s + 'Elbow'] = {}; q[s + 'Hand'] = {}; q[s + 'Knee'] = {}; q[s + 'Foot'] = {};
  }
  const b = p.body || {}, sit = (q.rightLeg.x || 0) < -1.2 && (q.leftLeg.x || 0) < -1.2, lie = Math.abs(b.rx || 0) > 0.6 || Math.abs(b.rz || 0) > 0.6;
  if (!sit && !lie) {
    const low15 = Math.min(soleHeight(p, 'right'), soleHeight(p, 'left')), low6 = Math.min(r6Sole(q, 'right'), r6Sole(q, 'left'));
    q.body = { ...b, y: (b.y || 0) + low15 - low6 };
  }
  return q;
}

// ---------- vẽ áo quần ----------
const PX = 128;   // px / stud
function paint(g, W, H, ops = []) {
  const X = (v) => v * W, Y = (v) => v * H;
  for (const o of ops) {
    g.fillStyle = g.strokeStyle = o.color || '#000'; g.globalAlpha = o.a ?? 1; g.lineWidth = (o.w ?? 0.03) * W; g.lineCap = 'round'; g.lineJoin = 'round';
    if (o.op === 'rect') { const r = (o.r || 0) * W; g.beginPath(); g.roundRect ? g.roundRect(X(o.x), Y(o.y), X(o.w0 ?? o.wd), Y(o.h), r) : g.rect(X(o.x), Y(o.y), X(o.w0 ?? o.wd), Y(o.h)); o.stroke ? g.stroke() : g.fill(); }
    else if (o.op === 'circle') { g.beginPath(); g.ellipse(X(o.x), Y(o.y), o.r * W, (o.ry ?? o.r) * W, 0, 0, PI * 2); o.stroke ? g.stroke() : g.fill(); }
    else if (o.op === 'line') { g.beginPath(); g.moveTo(X(o.x1), Y(o.y1)); g.lineTo(X(o.x2), Y(o.y2)); g.stroke(); }
    else if (o.op === 'poly') { g.beginPath(); o.pts.forEach(([x, y], i) => (i ? g.lineTo(X(x), Y(y)) : g.moveTo(X(x), Y(y)))); g.closePath(); o.stroke ? g.stroke() : g.fill(); }
    else if (o.op === 'stripes') { const n = o.n || 5, h = (o.h ?? 0.06), y0 = o.y0 ?? 0, y1 = o.y1 ?? 1; for (let i = 0; i < n; i++) g.fillRect(0, Y(y0 + (y1 - y0) * (i + 0.5) / n - h / 2), W, Y(h)); }
    g.globalAlpha = 1;
  }
}
function partMats(THREE, w, h, spec, base, rough = 0.82) {
  const bands = spec?.bands || [[0, 1, base]];
  const mk = (ops) => {
    const cv = document.createElement('canvas'); cv.width = Math.round(w * PX); cv.height = Math.round(h * PX);
    const g = cv.getContext('2d');
    for (const [y0, y1, c] of bands) { g.fillStyle = c; g.fillRect(0, Math.floor(y0 * cv.height), cv.width, Math.ceil((y1 - y0) * cv.height) + 1); }
    paint(g, cv.width, cv.height, spec?.wrap); paint(g, cv.width, cv.height, ops);
    const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 4;
    return new THREE.MeshStandardMaterial({ map: tx, roughness: rough, metalness: 0 });
  };
  const side = mk(spec?.side), front = spec?.front ? mk(spec.front) : side, back = spec?.back ? mk(spec.back) : side;
  const flat = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: rough, metalness: 0 });
  // thứ tự mặt BoxGeometry: +x, −x, +y, −y, +z (trước), −z (sau)
  return [side, side, flat(bands[0][2]), flat(bands[bands.length - 1][2]), front, back];
}

// ---------- đầu ----------
const HR = 0.68, HH = 1.3, HB = 0.24;   // bán kính, cao, bo
function headProfile(grow = 0) {
  const pts = [], R = HR + grow, n = 8;
  pts.push([0.0001, 0.02 - grow]);
  for (let i = 0; i <= n; i++) { const a = -PI / 2 + (i / n) * PI / 2; pts.push([R - HB + HB * C(a), 0.02 - grow + HB + HB * S(a)]); }
  for (let i = 0; i <= n; i++) { const a = (i / n) * PI / 2; pts.push([R - HB + HB * C(a), 0.02 + HH + grow - HB + HB * S(a)]); }
  pts.push([0.0001, 0.02 + HH + grow]);
  return pts;
}
const radiusAt = (y) => { const b = y - 0.02, t = HH - b; if (b < HB) return HR - HB + Math.sqrt(Math.max(0, HB * HB - (HB - b) ** 2)); if (t < HB) return HR - HB + Math.sqrt(Math.max(0, HB * HB - (HB - t) ** 2)); return HR; };

export function createR6Rig(THREE, opts = {}) {
  const o = { ...R6_RIG_DEFAULTS, ...opts };
  const seed = strHash(o.name);
  const root = new THREE.Group(); root.name = o.name;
  const piv = (name, x, y, z, parent) => { const g = new THREE.Group(); g.name = name; g.position.set(x, y, z); parent.add(g); return g; };
  const addMesh = (parent, geo, mat, name, { cast = true } = {}) => { const m = new THREE.Mesh(geo, mat); m.name = name; m.castShadow = cast; m.receiveShadow = true; parent.add(m); return m; };
  const std = (color, rough = 0.78, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, ...extra });
  const RB = (w, h, d, r = 0.05) => new RoundedBoxGeometry(w, h, d, 2, r);
  const lathe = (pr, seg = 40, a0 = 0, a1 = PI * 2) => new THREE.LatheGeometry(pr.map(([r, y]) => new THREE.Vector2(Math.max(0.0001, r), y)), seg, a0, a1);
  const ball = new THREE.SphereGeometry(1, 16, 12);

  const sizer = piv('sizer', 0, 0, 0, root); sizer.scale.setScalar(o.scale);
  const body = piv('body', 0, 0, 0, sizer);
  const hips = piv('LowerTorso', 0, 2.0, 0, body);
  const torso = piv('UpperTorso', 0, 0.4, 0, hips);
  const head = piv('Head', 0, 1.6, 0, torso); head.scale.setScalar(o.headScale);
  const TW = 2.0 * o.wide, sleeves = o.sleeves || o.shirt, hands = o.hands || o.skin, sole = o.sole || o.shoes;
  const skinMat = std(o.skin, 0.6);

  // thân: một khối 2×2×1 (gắn vào hông, phần trên xoay theo UpperTorso không tách rời → vẽ ở hips để giữ liền khối khi vặn eo nhẹ)
  const torsoMats = partMats(THREE, TW, 2, o.torso, o.shirt);
  const torsoMesh = addMesh(torso, RB(TW, 2.0, 1.0, 0.07), torsoMats, 'torso_mesh'); torsoMesh.position.y = 0.6;
  const arm = {}, leg = {};
  const armSpec = o.arm || { bands: [[0, 0.8, sleeves], [0.8, 1, hands]] };
  const legSpec = o.leg || { bands: [[0, 0.82, o.pants], [0.82, 0.95, o.shoes], [0.95, 1, sole]] };
  const armMats = partMats(THREE, 1, 2, armSpec, sleeves), legMats = partMats(THREE, 1, 2, legSpec, o.pants);
  for (const [side, sx] of [['Right', -1], ['Left', 1]]) {
    const up = piv(side + 'UpperArm', sx * (TW / 2 + 0.5), 1.2, 0, torso), lo = piv(side + 'LowerArm', 0, -0.6, 0, up), hd = piv(side + 'Hand', 0, -0.6, 0, lo);
    arm[side] = { up, lo, hd };
    const am = addMesh(up, RB(0.98, 2.0, 0.98, 0.07), armMats, side + 'Arm_mesh'); am.position.y = -0.6;
    const th = piv(side + 'UpperLeg', sx * 0.5 * o.wide, 0, 0, hips), kn = piv(side + 'LowerLeg', 0, -1.0, 0, th), ft = piv(side + 'Foot', 0, -0.7, 0, kn);
    leg[side] = { th, kn, ft };
    const lm = addMesh(th, RB(0.98 * o.wide, 2.0, 0.98, 0.06), legMats, side + 'Leg_mesh'); lm.position.y = -1.0;
  }

  // đầu trụ bo + cổ
  addMesh(head, lathe(headProfile(), 48), skinMat, 'head_mesh');
  // mặt decal cong theo đầu
  const FACE_PX = 512, DEC = o.faceSize, FACE_C = 0.02 + HH * 0.5 + (o.faceY - 0.6);
  const faceCanvas = document.createElement('canvas'); faceCanvas.width = faceCanvas.height = FACE_PX;
  const fg = faceCanvas.getContext('2d');
  const faceTex = new THREE.CanvasTexture(faceCanvas); faceTex.colorSpace = THREE.SRGBColorSpace; faceTex.anisotropy = 8;
  const faceMat = new THREE.MeshStandardMaterial({ map: faceTex, transparent: true, roughness: 0.55, metalness: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  {
    const NU = 24, NV = 16, pos = [], uv = [], idx = [], y0 = FACE_C - DEC / 2, y1 = FACE_C + DEC / 2;
    for (let j = 0; j <= NV; j++) { const y = y0 + (y1 - y0) * j / NV, rr = radiusAt(clamp(y, 0.03, HH)) + 0.006;
      for (let i = 0; i <= NU; i++) { const ph = (i / NU - 0.5) * DEC / HR; pos.push(rr * S(ph), y, rr * C(ph)); uv.push(i / NU, j / NV); } }
    for (let j = 0; j < NV; j++) for (let i = 0; i < NU; i++) { const a = j * (NU + 1) + i, b = a + 1, c = a + NU + 1, d = c + 1; idx.push(a, b, d, a, d, c); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    addMesh(head, g, faceMat, 'face', { cast: false }).renderOrder = 2;
  }
  const set = o.faceSet || globalThis.__emoteFaces || {};
  const NUM = Object.fromEntries(GA_FACES.map(([n, k]) => [String(n).padStart(2, '0'), k]));
  const fKey = (n) => { n = String(n ?? ''); const k = NUM[n.padStart(2, '0')] || GA_FACE_MAP[n] || n; return set[k] ? k : 'binh_thuong'; };
  const bbCache = {};
  const faceBB = (k, img) => {
    if (bbCache[k]) return bbCache[k];
    const w = img.width || img.naturalWidth, h = img.height || img.naturalHeight, cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const c2 = cv.getContext('2d', { willReadFrequently: true }); c2.drawImage(img, 0, 0); const d = c2.getImageData(0, 0, w, h).data;
    let x0 = w, x1 = -1, y0 = h, y1 = -1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 40) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    return (bbCache[k] = x1 < 0 ? { x0: 0, y0: 0, x1: w, y1: h, w, h } : { x0, y0, x1: x1 + 1, y1: y1 + 1, w, h });
  };
  const FB = o.faceBox || { x0: 0.08, x1: 0.92, y0: 0.1, y1: 0.9 }, GROW = o.faceGrow ?? 1.2;
  const draw = (k) => {
    const img = set[k]?.image; if (!img) return;
    const b = faceBB(k, img), bw = b.x1 - b.x0, bh = b.y1 - b.y0, tw = (FB.x1 - FB.x0) * FACE_PX, th = (FB.y1 - FB.y0) * FACE_PX;
    const sc = Math.min(tw / bw, th / bh, GROW * FACE_PX / b.w), cx = (FB.x0 + FB.x1) / 2 * FACE_PX, cy = (FB.y0 + FB.y1) / 2 * FACE_PX;
    fg.drawImage(img, b.x0, b.y0, bw, bh, cx - bw * sc / 2, cy - bh * sc / 2, bw * sc, bh * sc);
  };
  let faceKey = '', lastT = 0, lastPoseFace;
  function faceAt(t, name = o.face, { from, mix = 1 } = {}) {
    const key = fKey(name), fk = from && mix < 1 ? fKey(from) : null, wq = fk && fk !== key ? Math.round(clamp01(mix) * 8) / 8 : 1;
    const id = `${key}|${wq < 1 ? fk : ''}|${wq}`;
    if (id !== faceKey) {
      faceKey = id; fg.setTransform(1, 0, 0, 1, 0, 0); fg.clearRect(0, 0, FACE_PX, FACE_PX);
      if (wq < 1) { fg.globalAlpha = 1 - wq; draw(fk); fg.globalAlpha = wq; draw(key); fg.globalAlpha = 1; } else draw(key);
      faceTex.needsUpdate = true;
    }
    const st = { brows: 'neutral', eyes: 'open', mouth: 'smile', extras: [], eyesQ: { gaze: [0, 0] }, ms: 1, browDy: 0, mixK: wq, ga: key };
    char.lastFace = st; return st;
  }

  // ---------- tóc / mũ / phụ kiện ----------
  const hat = piv('hat', 0, 0, 0, head);
  const TOP = 0.02 + HH;
  if (o.hair) {
    const h = o.hair, hm = std(h.color || '#3a2a1c', 0.85), G = 0.055;
    const prof = headProfile(G), capY = TOP - (h.cap ?? 0.42);                 // chỏm tóc phủ đỉnh
    addMesh(head, lathe([[HR + G, capY], ...prof.filter(([, y]) => y > capY)], 40), hm, 'hair_cap');
    const backY = TOP - (h.back ?? 0.95), arc = (h.arc ?? 1.25) * PI;            // mảng gáy + hai bên
    addMesh(head, lathe(Array.from({ length: 7 }, (_, i) => { const y = backY + (capY + 0.05 - backY) * i / 6; return [radiusAt(clamp(y, 0.03, TOP - 0.01)) + G, y]; }), 32, PI - arc / 2, arc), new THREE.MeshStandardMaterial({ color: h.color || '#3a2a1c', roughness: 0.85, side: THREE.DoubleSide }), 'hair_back');
    if (h.fringe) { const f = addMesh(head, RB(HR * 1.5, 0.3, 0.2, 0.08), hm, 'hair_fringe'); f.position.set((h.fringe === 'left' ? 1 : -1) * 0.1, capY + 0.02, HR - 0.05); f.rotation.z = (h.fringe === 'left' ? 1 : -1) * 0.22; }
    if (h.locks) for (const sx of [-1, 1]) { const l = addMesh(head, RB(0.16, h.locks, 0.2, 0.06), hm, 'hair_lock'); l.position.set(sx * (HR - 0.02) * S(1.0), capY - h.locks / 2 + 0.05, (HR - 0.02) * C(1.0)); }
    if (h.bun) { const b = addMesh(head, ball, hm, 'hair_bun'); b.scale.set(0.3, 0.27, 0.26); b.position.set(0, h.bunY ?? 0.38, -HR - 0.12); }
    if (h.bob) { addMesh(head, lathe([[HR + G + 0.03, TOP - h.bob], [HR + G + 0.04, backY + 0.05]], 32, PI - arc / 2, arc), new THREE.MeshStandardMaterial({ color: h.color, roughness: 0.85, side: THREE.DoubleSide }), 'hair_bob'); }
    if (h.curls) for (let i = 0; i < h.curls; i++) {
      const ph = PI + (hash01(i, seed) - 0.5) * arc * 1.25, y = backY + 0.1 + hash01(i, seed + 7) * (TOP - backY), r = Math.min(HR, radiusAt(Math.min(y, TOP - 0.01))) + 0.03;
      const c = addMesh(head, ball, hm, 'hair_curl', { cast: false }); c.scale.setScalar(0.17 + 0.07 * hash01(i, seed + 3)); c.position.set(r * S(ph), y, r * C(ph));
    }
    if (h.sweep) { const s = addMesh(head, RB(HR * 1.7, 0.2, HR * 1.6, 0.09), hm, 'hair_sweep'); s.position.set(0, TOP + 0.02, -0.04); s.rotation.z = h.sweep; }
  }
  if (o.hat) {
    const h = o.hat, hm = std(h.color || '#22304a', 0.8), dark = std(h.band || '#141c2c', 0.8);
    if (h.style === 'chef') {
      const band = addMesh(hat, new THREE.CylinderGeometry(HR + 0.05, HR + 0.05, 0.38, 32), hm, 'hat_band'); band.position.y = TOP - 0.1;
      const puff = addMesh(hat, ball, hm, 'hat_puff'); puff.scale.set(HR + 0.3, 0.5, HR + 0.3); puff.position.y = TOP + 0.42;
      for (let i = 0; i < 6; i++) { const a = i / 6 * PI * 2, p = addMesh(hat, ball, hm, 'hat_puff', { cast: false }); p.scale.setScalar(0.36); p.position.set((HR + 0.02) * S(a), TOP + 0.34, (HR + 0.02) * C(a)); }
    } else if (h.style === 'flatCap' || h.style === 'roundCap' || h.style === 'capBack') {
      const dir = h.style === 'capBack' ? -1 : 1;
      const band = addMesh(hat, new THREE.CylinderGeometry(HR + 0.06, HR + 0.06, 0.26, 32), dark, 'hat_band'); band.position.y = TOP - 0.12;
      if (h.style === 'flatCap') { const top = addMesh(hat, new THREE.CylinderGeometry(HR + 0.2, HR + 0.08, 0.26, 32), hm, 'hat_top'); top.position.y = TOP + 0.13; }
      else { const dome = addMesh(hat, new THREE.SphereGeometry(HR + 0.07, 28, 14, 0, PI * 2, 0, PI / 2), hm, 'hat_dome'); dome.scale.y = h.style === 'roundCap' ? 0.78 : 0.6; dome.position.y = TOP - 0.02; }
      const visor = addMesh(hat, RB(HR * 1.5, 0.07, 0.5, 0.03), h.style === 'capBack' ? hm : dark, 'hat_visor'); visor.position.set(0, TOP - 0.2, dir * (HR + 0.2)); visor.rotation.x = dir * 0.12;
      if (h.badge) { const b = addMesh(hat, ball, std(h.badge, 0.35, { metalness: 0.6 }), 'hat_badge', { cast: false }); b.scale.setScalar(0.085); b.position.set(0, TOP + (h.style === 'flatCap' ? 0.12 : 0.16), HR + (h.style === 'flatCap' ? 0.15 : 0.02)); }
    }
  }
  const dyn = [];   // chuyển động phụ giải tích: f(sig)
  for (const a of o.acc || []) {
    if (a.kind === 'glasses') {
      const m = std(a.color || '#6b4a2a', 0.5), z = HR + 0.03, y = FACE_C + (a.y ?? 0.1);
      for (const sx of [-1, 1]) { const r = addMesh(head, new THREE.TorusGeometry(a.r ?? 0.2, 0.03, 8, 24), m, 'glasses_rim', { cast: false }); r.position.set(sx * 0.26, y, z * C(0.38)); r.rotation.y = sx * 0.38; r.position.x = sx * z * S(0.38); }
      const br = addMesh(head, RB(0.14, 0.035, 0.03, 0.01), m, 'glasses_bridge', { cast: false }); br.position.set(0, y + 0.02, z + 0.01);
    } else if (a.kind === 'moustache') {
      const m = std(a.color || '#9a9a9a', 0.85), y = FACE_C + (a.y ?? -0.14);
      for (const sx of [-1, 1]) { const w = addMesh(head, ball, m, 'moustache', { cast: false }); w.scale.set(0.2, 0.07, 0.07); w.position.set(sx * 0.17, y, HR + 0.03); w.rotation.z = sx * 0.35; }
    } else if (a.kind === 'epaulettes') {
      for (const s of ['Right', 'Left']) { const e = addMesh(arm[s].up, RB(0.9, 0.12, 0.7, 0.04), std(a.color, 0.7), 'epaulette'); e.position.set(0, 0.44, 0); }
    } else if (a.kind === 'backpack') {
      const b = addMesh(torso, RB(1.3, 1.35, 0.5, 0.12), std(a.color, 0.85), 'backpack'); b.position.set(0, 0.75, -0.72);
      const pk = addMesh(torso, RB(0.8, 0.5, 0.12, 0.05), std(a.pocket || a.color, 0.9), 'backpack_pocket'); pk.position.set(0, 0.5, -1.0);
    } else if (a.kind === 'headband') {   // băng đầu + nút + 2 đuôi sau gáy (Gà)
      const m = std(a.color || '#e8140f', 0.74, { side: THREE.DoubleSide }), y = a.y ?? 0.98;
      const ring = addMesh(head, new THREE.CylinderGeometry(HR + 0.035, HR + 0.035, a.h ?? 0.22, 40, 1, true), m, 'headband'); ring.position.y = y;
      const knot = addMesh(head, ball, m, 'headband_knot'); knot.scale.set(0.13, 0.1, 0.09); knot.position.set(0, y, -HR - 0.06);
      for (const sx of [-1, 1]) { const p = piv('headband_tail', sx * 0.05, y - 0.03, -HR - 0.08, head); const t = addMesh(p, RB(0.19, 0.6, 0.04, 0.016), m, 'headband_tail_mesh'); t.position.y = -0.3;
        dyn.push((g) => p.rotation.set(clamp(0.1 - 0.9 * g.P - 0.8 * g.dP + 0.35 * g.drag + 0.5 * g.dY, 0.02, 1.1), 0, clamp(sx * 0.24 - 0.6 * g.R - 0.8 * g.dR, -0.7, 0.7))); }
    } else if (a.kind === 'crest') {      // chỏm 3 múi (Gà)
      const m = std(a.color || '#fdec24', 0.5), cg = piv('crest', 0, TOP - 0.03, 0, head);
      for (const [bx, len, ang, wd] of [[-0.09, 0.26, 0.3, 0.1], [0, 0.33, -0.12, 0.12], [0.09, 0.23, -0.6, 0.1]]) { const lf = piv('crest_leaf', bx, 0, 0, cg); lf.rotation.z = ang; const t = addMesh(lf, ball, m, 'crest_tuft'); t.scale.set(wd, len * 0.6, wd * 0.7); t.position.y = len * 0.5; }
    } else if (a.kind === 'hood') {       // mũ trùm hạ sau gáy + viền cổ
      const m = std(a.color, 0.86);
      const col = addMesh(torso, new THREE.TorusGeometry(0.62, 0.14, 10, 28), m, 'hood_collar'); col.rotation.x = PI / 2; col.position.set(0, 1.6, -0.02); col.scale.set(1.1, 0.85, 1);
      const dr = addMesh(torso, RB(1.3, 0.75, 0.3, 0.14), m, 'hood_drape'); dr.position.set(0, 1.28, -0.6); dr.rotation.x = 0.18;
    } else if (a.kind === 'strings') {    // dây rút hoodie
      for (const sx of [-1, 1]) { const p = piv('hoodie_string', sx * 0.2, 1.5, 0.52, torso); const s = addMesh(p, new THREE.CylinderGeometry(0.035, 0.035, 0.5, 8), std(a.color || '#f1e7d2', 0.7), 'hoodie_string_mesh', { cast: false }); s.position.y = -0.25;
        dyn.push((g) => p.rotation.set(Math.min(-0.02, -0.85 * g.Pt + 0.9 * g.dPt + 0.8 * g.dY - 0.03), 0, -0.8 * g.Rt)); }
    } else if (a.kind === 'bow') {        // nơ buộc sau lưng (tạp dề)
      const m = std(a.color, 0.85);
      for (const sx of [-1, 1]) { const l = addMesh(torso, RB(0.3, 0.2, 0.08, 0.04), m, 'bow_loop', { cast: false }); l.position.set(sx * 0.2, a.y ?? 0.2, -0.54); l.rotation.z = sx * 0.3; const t = addMesh(torso, RB(0.12, 0.42, 0.05, 0.02), m, 'bow_tail', { cast: false }); t.position.set(sx * 0.1, (a.y ?? 0.2) - 0.28, -0.54); t.rotation.z = -sx * 0.15; }
    } else if (a.kind === 'box') {        // khối tự do: { on:'head'|'torso', size:[w,h,d], pos:[x,y,z], color, r }
      const b = addMesh(a.on === 'head' ? head : torso, RB(...a.size, a.r ?? 0.04), std(a.color, 0.8), a.name || 'acc_box'); b.position.set(...a.pos); if (a.rot) b.rotation.set(...a.rot);
    }
  }

  const parts = {
    root, body, hips, torso, head, hat,
    rightArm: arm.Right.up, leftArm: arm.Left.up, rightElbow: arm.Right.lo, leftElbow: arm.Left.lo, rightHand: arm.Right.hd, leftHand: arm.Left.hd,
    rightLeg: leg.Right.th, leftLeg: leg.Left.th, rightKnee: leg.Right.kn, leftKnee: leg.Left.kn, rightFoot: leg.Right.ft, leftFoot: leg.Left.ft,
    Head: head, UpperTorso: torso, LowerTorso: hips,
    RightUpperArm: arm.Right.up, RightLowerArm: arm.Right.lo, RightHand: arm.Right.hd, LeftUpperArm: arm.Left.up, LeftLowerArm: arm.Left.lo, LeftHand: arm.Left.hd,
    RightUpperLeg: leg.Right.th, RightLowerLeg: leg.Right.kn, RightFoot: leg.Right.ft, LeftUpperLeg: leg.Left.th, LeftLowerLeg: leg.Left.kn, LeftFoot: leg.Left.ft,
  };
  root.userData.vai = (o.name === 'hero' || o.vai === 'hero' || o.hero === true) ? 'hero' : 'nguoi';
  root.userData.r6 = true;
  for (const k of ['rightArm', 'leftArm']) parts[k].userData.vai = 'tay';
  for (const k of ['rightLeg', 'leftLeg']) parts[k].userData.vai = 'chan-nguoi';

  const sigOf = (p) => { const b = p.body || {}, h = p.hips || {}, tr = p.torso || {}, hd = p.head || {};
    return { P: (b.rx || 0) + (h.x || 0) + (tr.x || 0) + (hd.x || 0), R: (b.rz || 0) + (h.z || 0) + (tr.z || 0) + (hd.z || 0), Y: b.y || 0, Pt: (b.rx || 0) + (h.x || 0) + (tr.x || 0), Rt: (b.rz || 0) + (h.z || 0) + (tr.z || 0) }; };
  const update = (p0, p1, name) => {
    if (!dyn.length) return;
    const a = sigOf(p0), b = sigOf(p1), g = { P: a.P, R: a.R, Pt: a.Pt, Rt: a.Rt, dP: b.P - a.P, dR: b.R - a.R, dPt: b.Pt - a.Pt, dY: a.Y - b.Y, drag: name === 'run' ? 0.5 : name === 'walk' ? 0.15 : 0 };
    for (const f of dyn) f(g);
  };
  const fullPose = (name, t, opt) => {
    let pose = samplePose(name, t, opt);
    if (opt.from && opt.mix !== undefined && opt.mix < 1) pose = mixPose(samplePose(opt.from, opt.fromT ?? t, opt), pose, opt.mix);
    return toR6Pose(pose, o.EK, o.KK);
  };
  const char = {
    parts, root, options: o, materials: { skin: skinMat, shirt: torsoMats[4], pants: legMats[0], face: faceMat },
    faceCanvas, r6: true,
    headCenter: [0, 0.02 + HH / 2, 0], faceCenter: [0, FACE_C, HR], handGrip: [0, -0.75, 0.2],
    setFace(expr) { o.face = expr; faceAt(lastT, expr); },
    faceAt,
    sampleFace(anim, t = 0, opt = {}) { try { return samplePose(anim, t, opt).face; } catch { return undefined; } },
    attach(part, obj, pos) { const p = parts[part] || parts.rightHand, isHand = p === parts.rightHand || p === parts.leftHand; p.add(obj); obj.position.set(...(pos || (isHand ? char.handGrip : [0, -1.6, 0.6]))); return obj; },
    setColors({ skin: s } = {}) { if (s) { o.skin = s; skinMat.color.set(s); } },
    setHat() {}, setDetail() { return {}; },
    apply(pose) { const q = toR6Pose(pose, o.EK, o.KK); applyPose(parts, q); update(q, q); },
    animate(name, t, opt = {}) {
      lastT = t;
      const pose = fullPose(name, t, opt);
      applyPose(parts, pose); update(pose, fullPose(name, t - 0.07, opt), name);
      if (pose.face !== lastPoseFace) { lastPoseFace = pose.face; if (pose.face) o.face = pose.face; }
      if (opt.faceFrom !== undefined) { pose.faceFrom = opt.faceFrom; pose.faceMix = opt.faceMix; }
      char.lastPose = pose;
      if (!opt.noFace) faceAt(t, o.face, { from: opt.faceFrom, mix: opt.faceMix });
      return pose;
    },
  };
  root.userData.setFace = (f) => char.setFace(f);
  faceAt(0, o.face);
  applyPose(parts, toR6Pose({}, o.EK, o.KK)); update({}, {});
  return char;
}
