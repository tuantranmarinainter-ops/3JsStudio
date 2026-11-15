// ga-rig.js — nhân vật chính "Gà" v2: KHUNG RIÊNG theo đúng tỉ lệ ảnh phác (assets/characters/ga/front.png, back.png),
// dựng trên bộ xương/animation của r15.js. CÙNG GIAO DIỆN với createR15 (engine/r15.js) → engine/cast.js, engine/shots.js dùng thay trực tiếp.
//   import { createGa, loadGaAtlas } from './ga-rig.js';
//   const atlas = await loadGaAtlas(THREE); const faceSet = await loadGaFaces(THREE);
//   const hero = createGa(THREE, { name: 'hero', atlas, faceSet, face: 'smile' });
// Kích thước lấy từ engine/ga-dims.js (sinh bởi tools/ga_measure.py: đo ảnh phác bằng số; đỉnh đầu = 5.2 stud như hero cũ, chân y=0).
// Texture: engine/ga-atlas.js + assets/characters/ga/atlas.webp (tools/ga_atlas.py: cắt thân/tay/quần/giày từ ảnh phác, làm phẳng bóng).
// Khớp & tên phần y hệt R15 (Head, UpperTorso, LowerTorso, Right/Left UpperArm/LowerArm/Hand/UpperLeg/LowerLeg/Foot + tên R6 cũ).
// Chân ngắn/dài khác R15 → body.y của mọi animation được bù để đế giày chạm đúng cùng độ cao như R15 (không lún/lơ lửng).
// Chuyển động phụ (đuôi băng đô, dây rút) tính GIẢI TÍCH từ pose(t), pose(t−dt): không trạng thái, tua tới/lui ra cùng kết quả.

import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { applyPose, mixPose, samplePose, soleHeight, GA_FACE_MAP } from './r15.js';
import { GA_DIMS } from './ga-dims.js';
import { GA_ATLAS } from './ga-atlas.js';

const PI = Math.PI, S = Math.sin, C = Math.cos;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const clamp01 = (v) => clamp(v, 0, 1);
const strHash = (s) => { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };

// ---------- Kích thước (stud) suy từ số đo ----------
const R = GA_DIMS.rig, PXS = GA_DIMS.stud_per_px, SOLE_PX = GA_DIMS.sole_bottom_px;
export const GA_RIG = (() => {
  const LOW_H = 0.33, UA_LEN = 0.95, ANKLE_Y = 0.33, HEAD_Y = 3.7;
  const hipY = R.hem_y, torsoY0 = hipY + LOW_H, shoulderY = R.shoulder_y;
  const kneeY = ANKLE_Y + 0.7;
  return {
    LOW_H, UA_LEN, ANKLE_Y, HEAD_Y, hipY, torsoY0, shoulderY, kneeY,
    UT_H: shoulderY - torsoY0, TW: R.torso_w, TD: 0.89, AW: R.arm_w, AD: 0.8, ARM_CX: R.arm_cx,
    LA_LEN: (shoulderY - UA_LEN) - R.sleeve_cuff_y, HAND_H: R.sleeve_cuff_y - R.hand_bottom_y, HAND_W: R.hand_w,
    SHORT_W: R.shorts_w_total / 2 - 0.006, SHORT_LEN: R.shorts_y[0] - R.shorts_y[1], LEG_CX: Math.min(R.leg_cx, (R.shorts_w_total / 2 - 0.006) / 2 - 0.004) /* khép 2 chân sát nhau, không hở */, THIGH: hipY - kneeY, SHIN: kneeY - ANKLE_Y,
    SHOE_W: Math.min(R.shoe_w, 2 * Math.min(R.leg_cx, (R.shorts_w_total / 2 - 0.006) / 2 - 0.004) - 0.008), SOLE_H: R.sole_top_y, UPPER_H: R.shoe_top_y - R.sole_top_y, SHOE_BACK: -0.5, SHOE_FRONT: 0.75,
    HEAD_TOP: R.head.top, HEAD_BOT: R.head.bottom, HEAD_W: R.head.width,
  };
})();
const G = GA_RIG;

// ---------- Tải ----------
export function loadGaAtlas(THREE, { url = '/assets/characters/ga/atlas.webp' } = {}) {
  return new Promise((res) => {
    try { new THREE.TextureLoader().load(url, (t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; res(t); }, undefined, () => res(null)); } catch { res(null); }
  });
}

// ---------- Hộp bo tròn có UV theo atlas ----------
const FACE_KEYS = ['left', 'right', 'top', 'bottom', 'front', 'back'];
function boxGeo(w, h, d, r, rc, inset = 1.2) {
  const geo = new RoundedBoxGeometry(w, h, d, 3, r);
  const pos = geo.attributes.position, uv = geo.attributes.uv, per = pos.count / 6, [AW, AH] = GA_ATLAS.size;
  for (let i = 0; i < pos.count; i++) {
    const f = Math.floor(i / per), x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    let u, v;
    switch (f) {
      case 0: u = (d / 2 - z) / d; v = (h / 2 - y) / h; break;
      case 1: u = (z + d / 2) / d; v = (h / 2 - y) / h; break;
      case 2: u = (x + w / 2) / w; v = (z + d / 2) / d; break;
      case 3: u = (x + w / 2) / w; v = (d / 2 - z) / d; break;
      case 4: u = (x + w / 2) / w; v = (h / 2 - y) / h; break;
      default: u = (w / 2 - x) / w; v = (h / 2 - y) / h; break;
    }
    u = clamp01(u); v = clamp01(v);
    const q = rc[FACE_KEYS[f]] || rc.front;
    uv.setXY(i, (q[0] + inset + u * (q[2] - 2 * inset)) / AW, 1 - (q[1] + inset + v * (q[3] - 2 * inset)) / AH);
  }
  uv.needsUpdate = true;
  return geo;
}
const rect = (n) => GA_ATLAS.rects[n];
const faceRects = (pre, extra = {}) => ({ front: rect(pre + '_front'), back: rect(pre + '_back'), left: rect(pre + '_side'), right: rect(pre + '_side'), top: rect(pre + '_top'), bottom: rect(pre + '_top'), ...extra });

// UV mũ trùm/cổ áo: v theo độ cao thế giới (sọc thẳng hàng với thân), u theo x
function hoodUV(geo, torsoY0, shift = 0) {
  const p = geo.attributes.position, uv = new Float32Array(p.count * 2), q = rect('HOOD'), [AW, AH] = GA_ATLAS.size;
  const rowSh = SOLE_PX - G.shoulderY / PXS, rows = q[3];
  for (let i = 0; i < p.count; i++) {
    const yw = p.getY(i) + torsoY0, row = SOLE_PX - yw / PXS;
    let dv = Math.abs(row - rowSh) + shift; dv = dv % (2 * (rows - 4)); if (dv > rows - 4) dv = 2 * (rows - 4) - dv;
    const u = clamp01(0.5 + p.getX(i) / 3.4 + p.getZ(i) * 0.03);
    uv[i * 2] = (q[0] + 2 + u * (q[2] - 4)) / AW; uv[i * 2 + 1] = 1 - (q[1] + 2 + dv) / AH;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}
// Mũ trùm dựng bằng Blender (tools/blender/ga_hood.py → assets/characters/ga/hood.glb): mesh tĩnh theo toạ độ cục bộ của torso.
// Tải 1 lần TRƯỚC khi dựng Gà (await), truyền qua createGa(..., { hood }). Thiếu/lỗi → null → dùng mũ thủ tục cũ. Tắt: { hoodGlb: false }.
let _hoodP = null;
export function loadGaHood(THREE_, { url = '/assets/characters/ga/hood.glb' } = {}) {
  if (_hoodP) return _hoodP;
  _hoodP = new GLTFLoader(THREE_.DefaultLoadingManager).loadAsync(url).then((gltf) => {
    let g = null; gltf.scene.traverse((m) => { if (m.isMesh && !g) g = m.geometry; });
    return g;
  }).catch(() => null);
  return _hoodP;
}
let THREE;   // gán trong createGa (tránh import cứng để trang lab dùng importmap)

// ---------- Tư thế: bù độ cao để đế chạm đất với kích thước chân của Gà ----------
function gaSole(p, side) {
  const h = p.hips || {}, L = p[side + 'Leg'] || {}, K = p[side + 'Knee'] || {}, F = p[side + 'Foot'] || {};
  const sx = side === 'right' ? -G.LEG_CX : G.LEG_CX;
  const hipY = G.hipY + sx * S(h.z || 0);
  const cz = C((h.z || 0) + (L.z || 0));
  const a1 = (h.x || 0) + (L.x || 0), a2 = a1 + (K.x || 0), a3 = a2 + (F.x || 0);
  const ankle = hipY - (G.THIGH * C(a1) + G.SHIN * C(a2)) * cz;
  const s3 = S(a3), c3 = C(a3);
  // hai mép đế (gót z=-0.5, mũi z=+0.75) ở y=-ANKLE_Y so với cổ chân; xoay quanh trục X: y' = y·cos − z·sin
  const low = Math.min(-G.ANKLE_Y * c3 + 0.5 * s3, -G.ANKLE_Y * c3 - G.SHOE_FRONT * s3);
  return ankle + low * cz;
}
function regroundGa(p) {
  const low15 = Math.min(soleHeight(p, 'right'), soleHeight(p, 'left'));
  const lowGa = Math.min(gaSole(p, 'right'), gaSole(p, 'left'));
  p.body = { ...(p.body || {}) }; p.body.y = (p.body.y || 0) + low15 - lowGa;
  return p;
}
function fullPose(name, t, opt) {
  let pose = samplePose(name, t, opt);
  if (opt.from && opt.mix !== undefined && opt.mix < 1) pose = mixPose(samplePose(opt.from, opt.fromT ?? t, opt), pose, opt.mix);
  return regroundGa(pose);
}

// ---------- Đầu: biên dạng đo từ ảnh phác ----------
const HEAD_K = 0.965;   // ảnh phác: đầu nhìn trước rộng 334 px, nhìn sau 315 px → lấy giữa (hệ số 0.965 trên số đo ảnh trước)
function headProfile() {
  const H = R.head, top = H.top, pts = [];
  pts.push([top, 0]);
  for (const [d, r] of H.profile_top_down) pts.push([top - d, r]);
  const last = pts[pts.length - 1], bot = H.bottom;
  const rLast = last[1], yLast = last[0];
  for (let i = 1; i <= 5; i++) { const k = i / 5; pts.push([yLast + (bot - yLast) * k, rLast * Math.sqrt(Math.max(0, 1 - k * k * 0.97))]); }
  pts.reverse();                                            // từ đáy lên đỉnh
  // lấy mẫu đều theo y + làm mượt
  const n = 96, ys = [], rs = [];
  for (let i = 0; i <= n; i++) {
    const y = bot + (top - bot) * i / n; let j = 0;
    while (j < pts.length - 2 && pts[j + 1][0] < y) j++;
    const a = pts[j], b = pts[j + 1], k = b[0] === a[0] ? 0 : clamp01((y - a[0]) / (b[0] - a[0]));
    ys.push(y); rs.push(a[1] + (b[1] - a[1]) * k);
  }
  for (let pass = 0; pass < 3; pass++) for (let i = 1; i < n; i++) rs[i] = (rs[i - 1] + 2 * rs[i] + rs[i + 1]) / 4;
  rs[0] = Math.max(rs[0], 0.0001); rs[n] = 0.0001;
  return ys.map((y, i) => [rs[i] * HEAD_K, y - G.HEAD_Y]);          // [r, y cục bộ đầu]
}
const radiusAt = (prof, y) => { for (let i = 1; i < prof.length; i++) if (prof[i][1] >= y) { const a = prof[i - 1], b = prof[i], k = (y - a[1]) / (b[1] - a[1] || 1); return a[0] + (b[0] - a[0]) * k; } return 0; };

export function createGa(THREE_, opts = {}) {
  THREE = THREE_;
  const o = { name: 'ga', skin: '#feda1c', face: 'smile', blink: false, atlas: null, faceSet: null, hood: null, hoodGlb: true, seed: null, headband: '#e8140f', crest: '#fdec24', drawstring: '#f1e7d2', ...opts };
  const seed = o.seed ?? strHash(o.name);
  const root = new THREE.Group(); root.name = o.name;
  const piv = (name, x, y, z, parent) => { const g = new THREE.Group(); g.name = name; g.position.set(x, y, z); parent.add(g); return g; };
  const addMesh = (parent, geo, mat, name, { cast = true } = {}) => { const m = new THREE.Mesh(geo, mat); m.name = name; m.castShadow = cast; m.receiveShadow = true; parent.add(m); return m; };
  const std = (color, rough = 0.7) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0 });
  const RB = (w, h, d, r = 0.05) => new RoundedBoxGeometry(w, h, d, 2, r);

  const skinMat = std(o.skin, 0.58);
  const hasAtlas = !!o.atlas;
  const outfitMat = hasAtlas ? new THREE.MeshStandardMaterial({ map: o.atlas, roughness: 0.82, metalness: 0 }) : std('#91a846', 0.85);
  const box = (w, h, d, r, pre, cy) => {   // hộp có texture atlas (hoặc hộp phẳng nếu thiếu atlas)
    const g = hasAtlas ? boxGeo(w, h, d, r, faceRects(pre)) : new RoundedBoxGeometry(w, h, d, 3, r);
    g.translate(0, cy, 0); return g;
  };

  // --- khung ---
  const body = piv('body', 0, 0, 0, root);
  const hips = piv('LowerTorso', 0, G.hipY, 0, body);
  const torso = piv('UpperTorso', 0, G.LOW_H, 0, hips);
  const head = piv('Head', 0, G.HEAD_Y - G.torsoY0, 0, torso);
  const arm = {}, leg = {};
  const sideTex = { Right: 'R', Left: 'L' };
  for (const [side, sx] of [['Right', -1], ['Left', 1]]) {
    const k = sideTex[side];
    const up = piv(side + 'UpperArm', sx * G.ARM_CX, G.shoulderY - 0.33 - G.torsoY0, 0, torso);
    const lo = piv(side + 'LowerArm', 0, -(G.UA_LEN - 0.33), 0, up);
    const hd = piv(side + 'Hand', 0, -G.LA_LEN, 0, lo);
    arm[side] = { up, lo, hd };
    const th = piv(side + 'UpperLeg', sx * G.LEG_CX, 0, 0, hips);
    const kn = piv(side + 'LowerLeg', 0, -G.THIGH, 0, th);
    const ft = piv(side + 'Foot', 0, -G.SHIN, 0, kn);
    leg[side] = { th, kn, ft };
    // tay áo (UV từ tay áo ảnh phác, cuộn sọc liền khớp)
    addMesh(up, box(G.AW, G.UA_LEN, G.AD, 0.11, k + 'UA', 0.33 - G.UA_LEN / 2), outfitMat, side + 'UpperArm');
    addMesh(lo, box(G.AW, G.LA_LEN + 0.06, G.AD, 0.1, k + 'LA', (0.06 - G.LA_LEN) / 2), outfitMat, side + 'LowerArm');
    const hand = addMesh(hd, RB(G.HAND_W, G.HAND_H + 0.08, G.AD * 0.88, 0.09), skinMat, side + 'Hand'); hand.position.y = (0.08 - G.HAND_H) / 2;
    // quần short rộng (UV quần ảnh phác) + cẳng chân da + giày
    {   // quần short loe dần xuống gấu (đo: rộng ở hông ~0.92 so với gấu), co về phía mép trong
      const sg = box(G.SHORT_W, G.SHORT_LEN, 1.06, 0.085, k + 'SH', -G.SHORT_LEN / 2), sp = sg.attributes.position, inner = -sx * G.SHORT_W / 2;
      for (let i = 0; i < sp.count; i++) { const f = 0.915 + 0.085 * clamp01(-sp.getY(i) / G.SHORT_LEN); sp.setX(i, inner + (sp.getX(i) - inner) * f); sp.setZ(i, sp.getZ(i) * f); }
      sg.computeBoundingSphere(); addMesh(th, sg, outfitMat, 'shorts_' + side);
    }
    const SHIN_W = Math.min(1.0, 2 * G.LEG_CX - 0.012), shin = addMesh(kn, RB(SHIN_W, G.SHIN + 0.12, 0.93, 0.09), skinMat, side + 'LowerLeg'); shin.position.y = -(G.SHIN + 0.12) / 2;
    const sl = G.SHOE_FRONT - G.SHOE_BACK;   // dài đế 1.25
    const soleGeo = hasAtlas ? boxGeo(G.SHOE_W, G.SOLE_H, sl, 0.075, faceRects(k + 'SO')) : new RoundedBoxGeometry(G.SHOE_W, G.SOLE_H, sl, 3, 0.075);
    const sole = addMesh(ft, soleGeo, hasAtlas ? outfitMat : std('#dccfc8', 0.6), 'sneaker_sole'); sole.position.set(0, -G.ANKLE_Y + G.SOLE_H / 2, (G.SHOE_FRONT + G.SHOE_BACK) / 2);
    const upL = sl - 0.12, upGeo = hasAtlas ? boxGeo(G.SHOE_W - 0.05, G.UPPER_H, upL, 0.095, faceRects(k + 'UP')) : new RoundedBoxGeometry(G.SHOE_W - 0.05, G.UPPER_H, upL, 3, 0.095);
    const upper = addMesh(ft, upGeo, hasAtlas ? outfitMat : std('#212020', 0.55), 'sneaker_upper');
    upper.position.set(0, -G.ANKLE_Y + G.SOLE_H + G.UPPER_H / 2 - 0.01, (G.SHOE_FRONT + G.SHOE_BACK) / 2 + 0.02);
    // dây giày 3D nổi khối trên mặt trước thân giày + lỗ xỏ
    const wallZ = upper.position.z + upL / 2, yMid = upper.position.y;
    const lace = std(o.laces || '#f6f6f2', 0.62), eye = std('#8d8f95', 0.4); eye.metalness = 0.6;
    const strand = (a, b, rad = 0.026) => {
      const A = new THREE.Vector3(...a), Bv = new THREE.Vector3(...b), dir = Bv.clone().sub(A), len = dir.length();
      const m = addMesh(ft, new THREE.CapsuleGeometry(rad, len, 4, 8), lace, 'sneaker_lace', { cast: false });
      m.position.copy(A).add(Bv).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()); m.scale.set(1, 1, 0.8);
    };
    const ex = 0.2, y1 = yMid + 0.11, y2 = yMid - 0.02, zz = wallZ + 0.014;
    strand([-ex, y1, zz], [ex, y2, zz]); strand([ex, y1, zz], [-ex, y2, zz]); strand([-ex, y1, zz + 0.02], [ex, y1, zz + 0.02]);
    strand([-ex, y2, zz], [-ex - 0.03, y2 - 0.08, zz], 0.022); strand([ex, y2, zz], [ex + 0.03, y2 - 0.08, zz], 0.022);
    for (const x of [-ex, ex]) for (const y of [y1, y2]) { const r = addMesh(ft, new THREE.TorusGeometry(0.036, 0.013, 6, 14), eye, 'sneaker_eyelet', { cast: false }); r.position.set(x, y, wallZ + 0.008); }
  }
  // thân áo
  addMesh(hips, box(G.TW, G.LOW_H, G.TD, 0.1, 'LT', G.LOW_H / 2), outfitMat, 'LowerTorso_mesh');
  addMesh(torso, box(G.TW, G.UT_H, G.TD, 0.12, 'UT', G.UT_H / 2), outfitMat, 'UpperTorso_mesh');

  // --- đầu: biên dạng đo từ ảnh phác (vòm trên, thân trụ, đáy bo) ---
  const prof = headProfile();
  const latheG = (pr, seg = 56, a0 = 0, a1 = PI * 2) => new THREE.LatheGeometry(pr.map(([r, y]) => new THREE.Vector2(Math.max(0.0001, r), y)), seg, a0, a1);
  addMesh(head, latheG(prof, 64), skinMat, 'head_mesh');
  const neck = addMesh(head, new THREE.CylinderGeometry(0.2, 0.22, 0.42, 20), skinMat, 'neck'); neck.position.y = 0.0;

  // --- mặt decal ảnh ---
  const FACE_PX = 512, DEC = o.faceSize ?? 0.86;   // thu nhỏ mặt cho cân đầu khối (người dùng 2026-11-12: miệng lẹm xuống cổ)   // canvas 512² ↔ ô vuông DEC×DEC stud quanh tâm mặt
  const faceCanvas = document.createElement('canvas'); faceCanvas.width = faceCanvas.height = FACE_PX;
  const fg = faceCanvas.getContext('2d');
  const faceTex = new THREE.CanvasTexture(faceCanvas); faceTex.colorSpace = THREE.SRGBColorSpace; faceTex.anisotropy = 8;
  const faceMat = new THREE.MeshStandardMaterial({ map: faceTex, transparent: true, roughness: 0.55, metalness: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const BAND_Y0 = R.band.y1 - (R.band.y1 - R.band.y0) * (o.bandK ?? 0.6);   // băng đô mỏng lại 60% (giữ mép trên) → chừa chỗ cho mặt
  const FACE_C = G.HEAD_Y > 0 ? BAND_Y0 + (o.faceLift ?? 0.11) - DEC / 2 - G.HEAD_Y : 0.5;   // mép trên ô mặt nằm dưới băng đô một chút → mắt ngay dưới băng đô, miệng ở 1/3 dưới mặt, không chạm cằm
  {
    const NU = 32, NV = 32, pos = [], uv = [], idx = [], y0 = Math.max(FACE_C - DEC / 2, G.HEAD_BOT - G.HEAD_Y + 0.04), y1 = FACE_C + DEC / 2;
    for (let j = 0; j <= NV; j++) {
      const y = y0 + (y1 - y0) * j / NV, r = Math.max(0.3, radiusAt(prof, y)) + 0.005;
      for (let i = 0; i <= NU; i++) {
        const ph = (i / NU - 0.5) * DEC / Math.max(r, 0.45), rr = Math.max(0.0001, radiusAt(prof, y)) + 0.005;
        pos.push(rr * S(ph), y, rr * C(ph)); uv.push(i / NU, 1 - ((FACE_C + DEC / 2 - y) / DEC));
      }
    }
    for (let j = 0; j < NV; j++) for (let i = 0; i < NU; i++) { const a = j * (NU + 1) + i, b = a + 1, c = a + NU + 1, d = c + 1; idx.push(a, b, d, a, d, c); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    const facePatch = addMesh(head, g, faceMat, 'face', { cast: false }); facePatch.renderOrder = 2;
  }
  const gaSet = o.faceSet || {};
  const gaKey = (n) => { const k = GA_FACE_MAP[n] || n; return gaSet[k] ? k : 'binh_thuong'; };
  // tự căn từng mặt theo khung nét thật của ảnh (bbox alpha) vào ô an toàn: dưới băng đô, trên cằm (audit 2026-11-12)
  const FACE_BOX = o.faceBox || { x0: 0.08, x1: 0.92, y0: 0.23, y1: 0.92 }, FACE_GROW = o.faceGrow ?? 1.25, FACE_FIX = o.faceFix || {};
  const bbCache = {};
  const faceBB = (k, img) => {
    if (bbCache[k]) return bbCache[k];
    const w = img.width || img.naturalWidth, h = img.height || img.naturalHeight, cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const c2 = cv.getContext('2d', { willReadFrequently: true }); c2.drawImage(img, 0, 0); const d = c2.getImageData(0, 0, w, h).data;
    let x0 = w, x1 = -1, y0 = h, y1 = -1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 40) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    return (bbCache[k] = x1 < 0 ? { x0: 0, y0: 0, x1: w, y1: h, w, h } : { x0, y0, x1: x1 + 1, y1: y1 + 1, w, h });
  };
  const gaDraw = (k) => {
    const img = gaSet[k]?.image; if (!img) return;
    const b = faceBB(k, img), fx = FACE_FIX[k] || {}, bw = b.x1 - b.x0, bh = b.y1 - b.y0;
    const tw = (FACE_BOX.x1 - FACE_BOX.x0) * FACE_PX, th = (FACE_BOX.y1 - FACE_BOX.y0) * FACE_PX;
    const sc = Math.min(tw / bw, th / bh, FACE_GROW * FACE_PX / b.w) * (fx.s ?? 1);
    const cx = (FACE_BOX.x0 + FACE_BOX.x1) / 2 * FACE_PX + (fx.dx ?? 0) * FACE_PX, cy = (FACE_BOX.y0 + FACE_BOX.y1) / 2 * FACE_PX + (fx.dy ?? 0) * FACE_PX;
    fg.drawImage(img, b.x0, b.y0, bw, bh, cx - bw * sc / 2, cy - bh * sc / 2, bw * sc, bh * sc);
  };
  let faceKey = '', lastT = 0, lastPoseFace;
  function faceAt(t, name = o.face, { from, mix = 1 } = {}) {
    const key = gaKey(name), fk = from && mix < 1 ? gaKey(from) : null;
    const wq = fk && fk !== key ? Math.round(clamp01(mix) * 8) / 8 : 1;
    const fkey = `G|${key}|${wq < 1 ? fk : ''}|${wq}`;
    if (fkey !== faceKey) {
      faceKey = fkey; fg.setTransform(1, 0, 0, 1, 0, 0); fg.clearRect(0, 0, FACE_PX, FACE_PX);
      if (wq < 1) { fg.globalAlpha = 1 - wq; gaDraw(fk); fg.globalAlpha = wq; gaDraw(key); fg.globalAlpha = 1; } else gaDraw(key);
      faceTex.needsUpdate = true;
    }
    const st = { brows: 'neutral', eyes: 'open', mouth: 'smile', extras: [], eyesQ: { gaze: [0, 0] }, ms: 1, browDy: 0, mixK: wq, ga: key };
    char.lastFace = st; return st;
  }

  // --- băng đô: vòng đệm dày theo đo (rộng 1.267, cao 0.28) + nút + 2 đuôi ---
  const bandM = new THREE.MeshStandardMaterial({ color: o.headband, roughness: 0.74, metalness: 0, side: THREE.DoubleSide });
  const bY0 = BAND_Y0 - G.HEAD_Y, bY1 = R.band.y1 - G.HEAD_Y, bR = R.band.w / 2 * 0.97, bC = 0.05;
  {
    const inner = 0.52, pts = [[inner, bY0 + 0.012], [bR - bC, bY0]];
    for (let i = 1; i <= 4; i++) { const a = -PI / 2 + (i / 4) * PI / 2; pts.push([bR - bC + bC * C(a), bY0 + bC + bC * S(a)]); }
    pts.push([bR, bY1 - bC]);
    for (let i = 1; i <= 4; i++) { const a = (i / 4) * PI / 2; pts.push([bR - bC + bC * C(a), bY1 - bC + bC * S(a)]); }
    pts.push([inner, bY1 - 0.012]);
    addMesh(head, latheG(pts.map(([r, y]) => [r, y]), 64), bandM, 'headband');
  }
  const yBand = (bY0 + bY1) / 2, zBack = -bR;
  const knot = addMesh(head, new THREE.SphereGeometry(0.1, 16, 12), bandM, 'headband_knot'); knot.position.set(0, yBand, zBack - 0.02); knot.scale.set(1.25, 1.0, 0.9);
  for (const sx of [-1, 1]) {
    const w = addMesh(head, RB(0.2, 0.17, 0.045, 0.02), bandM, 'headband_wing'); w.position.set(sx * 0.14, yBand + 0.01, zBack - 0.015); w.rotation.z = -sx * 0.22;
  }
  const bandTails = [];
  for (const sx of [-1, 1]) {
    const p = piv('headband_tail', sx * 0.04, yBand - 0.04, zBack - 0.03, head);
    const m = addMesh(p, RB(0.19, 0.56, 0.035, 0.016), bandM, 'headband_tail_mesh'); m.position.y = -0.28;
    bandTails.push({ p, sx });
  }

  // --- chỏm lông: 3 cọng mập cong như lá ---
  const crestM = new THREE.MeshStandardMaterial({ color: o.crest, roughness: 0.5, metalness: 0 });
  const crest = piv('crest', 0, G.HEAD_TOP - G.HEAD_Y - 0.03, 0, head);
  const ell = new THREE.SphereGeometry(1, 20, 14);
  for (const [bx, len, ang, wd] of [[-0.06, 0.19, 0.25, 0.068], [0.0, 0.235, -0.18, 0.085], [0.055, 0.16, -0.6, 0.068]]) {
    const leaf = piv('crest_leaf', bx, 0, 0, crest); leaf.rotation.z = ang;
    const a = addMesh(leaf, ell, crestM, 'crest_tuft'); a.scale.set(wd, len * 0.55, wd * 0.62); a.position.y = len * 0.45;
    const b2 = piv('crest_tip', 0, len * 0.78, 0, leaf); b2.rotation.z = -0.5 * Math.sign(ang || 1) * 0.0 - 0.38;
    const c2 = addMesh(b2, ell, crestM, 'crest_tuft_tip'); c2.scale.set(wd * 0.9, len * 0.4, wd * 0.58); c2.position.y = len * 0.2;
  }

  // --- mũ trùm khối thật: viền cổ ôm chân đầu + vạt sọc rủ sau gáy + 2 dây rút ---
  const hoodM = hasAtlas ? new THREE.MeshStandardMaterial({ map: o.atlas, roughness: 0.86, metalness: 0, side: THREE.DoubleSide }) : std('#91a846', 0.85);
  const useGlb = o.hoodGlb !== false && !!o.hood;
  if (useGlb) {
    const hg = o.hood.clone(); if (hasAtlas) hoodUV(hg, G.torsoY0, 26);   // lệch pha ~0.4 chu kỳ sọc so với thân → túi tách khỏi lưng áo (như ảnh phác)
    if (hg.attributes.color) hoodM.vertexColors = true;   // AO nướng sẵn (Blender) → nếp gấp, dưới viền, chóp tối hơn
    addMesh(torso, hg, hoodM, 'hood_blender');
  } else {
    const N = 72, a = 0.69, pts = [];
    for (let i = 0; i < N; i++) {
      const ph = (i / N) * PI * 2, b = 0.57 - 0.13 * C(ph), yw = 3.95 - 0.2 * C(ph);
      pts.push(new THREE.Vector3(a * S(ph), yw - G.torsoY0, b * C(ph)));
    }
    const curve = new THREE.CatmullRomCurve3(pts, true, 'catmullrom', 0.5);
    const g = new THREE.TubeGeometry(curve, 144, 0.125, 18, true);
    if (hasAtlas) hoodUV(g, G.torsoY0);
    const collar = addMesh(torso, g, hoodM, 'hood_collar'); collar.scale.set(1, 1, 1);
    // vạt mũ trùm rủ sau gáy: nửa elip treo từ cổ áo, phồng nhẹ, có viền cuộn
    const NA = 40, NR = 10, ad = 0.8, bd = 0.74, yTop = 4.06 - G.torsoY0, pos = [], idx = [], zt = -G.TD / 2 - 0.018;
    for (let j = 0; j <= NR; j++) for (let i = 0; i <= NA; i++) {
      const rho = j / NR, th = (i / NA) * PI, x = ad * rho * C(th), y = yTop - bd * rho * S(th), t = clamp01((y - (yTop - bd)) / bd);
      const bulge = 0.05 * Math.sqrt(Math.max(0, 1 - rho * rho)) * (0.4 + 0.6 * t);
      pos.push(x, y, zt - 0.2 * Math.pow(t, 1.25) * (1 - 0.3 * (x / ad) * (x / ad)) - bulge);
    }
    for (let j = 0; j < NR; j++) for (let i = 0; i < NA; i++) { const A = j * (NA + 1) + i, B = A + 1, Cc = A + NA + 1, D = Cc + 1; idx.push(A, Cc, B, B, Cc, D); }
    const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); dg.setIndex(idx); dg.computeVertexNormals();
    if (hasAtlas) hoodUV(dg, G.torsoY0);
    addMesh(torso, dg, hoodM, 'hood_drape');
    const rim = [];
    for (let i = 0; i <= NA; i++) { const j = NR * (NA + 1) + i; rim.push(new THREE.Vector3(pos[j * 3], pos[j * 3 + 1], pos[j * 3 + 2])); }
    const rg = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rim), 60, 0.04, 10, false);
    if (hasAtlas) hoodUV(rg, G.torsoY0);
    addMesh(torso, rg, hoodM, 'hood_drape_rim');
    const seam = addMesh(torso, RB(0.014, bd * 0.86, 0.02, 0.006), std('#5b6a2a', 0.9), 'hood_seam', { cast: false }); seam.position.set(0, yTop - bd * 0.43, zt - 0.2 * 0.5 - 0.03); seam.rotation.x = 0.0;
  }
  const strM = std(o.drawstring, 0.72), tipM = std(o.drawstring, 0.5), eyeM = std('#8d8f95', 0.4); eyeM.metalness = 0.6;
  const strings = [];
  for (const sx of [-1, 1]) {
    const p = piv('hoodie_string', sx * 0.2, 3.7 - G.torsoY0, 0.55, torso);
    const sg = addMesh(p, new THREE.CylinderGeometry(0.034, 0.034, 0.5, 10), strM, 'hoodie_string_mesh'); sg.position.y = -0.25;
    const ag = addMesh(p, new THREE.CapsuleGeometry(0.047, 0.1, 4, 10), tipM, 'hoodie_aglet'); ag.position.y = -0.6;
    const er = addMesh(torso, new THREE.TorusGeometry(0.052, 0.016, 8, 16), eyeM, 'hoodie_eyelet', { cast: false }); er.position.set(sx * 0.2, 3.75 - G.torsoY0, 0.575);
    strings.push(p);
  }

  const hat = piv('hat', 0, 0, 0, head);
  const parts = {
    root, body, hips, torso, head, hat,
    rightArm: arm.Right.up, leftArm: arm.Left.up, rightElbow: arm.Right.lo, leftElbow: arm.Left.lo, rightHand: arm.Right.hd, leftHand: arm.Left.hd,
    rightLeg: leg.Right.th, leftLeg: leg.Left.th, rightKnee: leg.Right.kn, leftKnee: leg.Left.kn, rightFoot: leg.Right.ft, leftFoot: leg.Left.ft,
    Head: head, UpperTorso: torso, LowerTorso: hips,
    RightUpperArm: arm.Right.up, RightLowerArm: arm.Right.lo, RightHand: arm.Right.hd, LeftUpperArm: arm.Left.up, LeftLowerArm: arm.Left.lo, LeftHand: arm.Left.hd,
    RightUpperLeg: leg.Right.th, RightLowerLeg: leg.Right.kn, RightFoot: leg.Right.ft, LeftUpperLeg: leg.Left.th, LeftLowerLeg: leg.Left.kn, LeftFoot: leg.Left.ft,
  };
  root.userData.vai = (o.name === 'hero' || o.vai === 'hero' || o.hero === true) ? 'hero' : 'nguoi';
  for (const k of ['rightArm', 'leftArm']) parts[k].userData.vai = 'tay';
  for (const k of ['rightLeg', 'leftLeg']) parts[k].userData.vai = 'chan-nguoi';

  // ---- chuyển động phụ giải tích ----
  const sigOf = (p) => {
    const b = p.body || {}, h = p.hips || {}, tr = p.torso || {}, hd = p.head || {};
    return { P: (b.rx || 0) + (h.x || 0) + (tr.x || 0) + (hd.x || 0), R: (b.rz || 0) + (h.z || 0) + (tr.z || 0) + (hd.z || 0) + (b.x || 0) * 0.6, Y: b.y || 0,
      Pt: (b.rx || 0) + (h.x || 0) + (tr.x || 0), Rt: (b.rz || 0) + (h.z || 0) + (tr.z || 0) + (b.x || 0) * 0.6 };
  };
  const update = (p0, p1, p2, name) => {
    const a = sigOf(p0), b = sigOf(p1), c = sigOf(p2);
    const sig = { P: a.P, R: a.R, Pt: a.Pt, Rt: a.Rt, dP1: b.P - a.P, dR1: b.R - a.R, dPt: b.Pt - a.Pt, dRt: b.Rt - a.Rt, dY: a.Y - b.Y, drag: name === 'run' ? 0.5 : name === 'walk' ? 0.15 : 0 };
    for (const { p, sx } of bandTails) {
      const th = clamp(0.08 - 0.9 * sig.P - 0.8 * sig.dP1 + 0.35 * sig.drag + 0.5 * sig.dY, 0.02, 1.1);
      const tz = clamp(sx * 0.26 - 0.6 * sig.R - 0.8 * sig.dR1, -0.7, 0.7);
      p.rotation.set(th, 0, tz);
    }
    strings.forEach((p, i) => p.rotation.set(Math.min(-0.02, -0.85 * sig.Pt + 0.9 * sig.dPt + 0.8 * sig.dY - 0.03), 0, -0.8 * sig.Rt + 0.9 * sig.dRt + (i ? 0.03 : -0.03)));
  };

  const detail = { folds: false, hair: false };
  const char = {
    parts, root, options: o, materials: { skin: skinMat, outfit: outfitMat, shirt: outfitMat, pants: outfitMat, face: faceMat, headband: bandM, crest: crestM, hood: hoodM },
    faceCanvas,
    headCenter: [0, 0.75, 0], faceCenter: [0, FACE_C, 0.6], handGrip: [0, -0.1, 0.12],
    setFace(expr) { o.face = expr; faceAt(lastT, expr); },
    faceAt,
    sampleFace(anim, t = 0, opt = {}) { try { return fullPose(anim, t, opt).face; } catch { return undefined; } },
    attach(part, obj, pos) {
      const p = parts[part] || parts.rightHand, isHand = p === parts.rightHand || p === parts.leftHand;
      p.add(obj); obj.position.set(...(pos || (isHand ? char.handGrip : [0, -1.6, 0.6]))); return obj;
    },
    setColors({ skin: s } = {}) { if (s) { o.skin = s; skinMat.color.set(s); } },
    setHat() { /* Gà không đội mũ: băng đô + chỏm là một phần nhân vật */ },
    setDetail() { return { ...detail }; },
    apply(pose) { applyPose(parts, pose); update(pose, pose, pose); },
    animate(name, t, opt = {}) {
      lastT = t;
      const pose = fullPose(name, t, opt);
      applyPose(parts, pose);
      update(pose, fullPose(name, t - 0.07, opt), fullPose(name, t - 0.16, opt), name);
      if (pose.face !== lastPoseFace) { lastPoseFace = pose.face; if (pose.face) o.face = pose.face; }
      if (opt.faceFrom !== undefined) { pose.faceFrom = opt.faceFrom; pose.faceMix = opt.faceMix; }
      char.lastPose = pose;
      if (!opt.noFace) faceAt(t, o.face, { from: opt.faceFrom, mix: opt.faceMix });
      return pose;
    },
  };
  // màu tươi sáng khớp ảnh demo (đo 2026-11-12: bản 3D tối hơn phác ~20%, sắc giống) → nhân màu chất liệu; trừ mặt (decal nét đen)
  { const k = o.vivid ?? 1.3, ks = o.vividSkin ?? 1.42, done = new Set([faceMat]);
    root.traverse((m) => { const mt = m.material; if (!m.isMesh || !mt || done.has(mt) || !mt.color) return; done.add(mt); mt.color.multiplyScalar(mt === skinMat ? ks : k); }); }
  root.userData.setFace = (f) => char.setFace(f);
  root.userData.setDetail = (d) => char.setDetail(d);
  faceAt(0, o.face);
  applyPose(parts, {}); update({}, {}, {});
  return char;
}
