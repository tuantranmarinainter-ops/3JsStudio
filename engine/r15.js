// r15.js — Nhân vật khối BO TRÒN kiểu R15 (15 khối, có khuỷu tay/đầu gối) cho three.js.
// Phong cách đồ chơi khối (đầu trụ tròn vàng, thân/tay/chân hộp bo cạnh) — hoàn toàn nguyên bản,
// KHÔNG dùng logo, mặt mặc định, decal hay asset chính thức của Roblox.
//
// Cùng giao diện với createR6 (engine/r6.js) để engine/shots.js dùng được ngay:
//   import { createR15, loadCharacterTextures } from './r15.js';
//   const tex = await loadCharacterTextures(THREE, 'hero');       // lúc init; file thiếu → null
//   const hero = createR15(THREE, { name: 'hero', textures: tex, shirt: '#f2c230', face: 'smile' });
//   scene.add(hero.root);
//   hero.animate('walk', t);                 // hàm thuần của t; trả về pose (có thể có .face)
//   hero.setFace('surprised');               // mặt ghép lớp: lông mày → mắt → miệng → phụ
//
// Đơn vị 1 = 1 stud; cao ≈ 5.2; chân ở y=0; mặt nhìn +Z; tay PHẢI của nhân vật ở -X.
// Tên khớp (pivot): Head, UpperTorso, LowerTorso, Right/Left UpperArm, LowerArm, Hand, UpperLeg, LowerLeg, Foot.
// parts giữ tên cũ của R6: body, torso(=UpperTorso), head, rightArm/leftArm(=UpperArm), rightLeg/leftLeg(=UpperLeg), hat
//   + mới: hips(=LowerTorso), rightElbow/leftElbow(=LowerArm), rightHand/leftHand, rightKnee/leftKnee(=LowerLeg), rightFoot/leftFoot.
// Pose: { body:{x,y,z,rx,ry,rz}, hips, torso, head, rightArm, rightElbow, rightHand, rightLeg, rightKnee, rightFoot, (left…),
//         face?, gaze?:[x,y] }. Góc như R6: tay/chân .x<0 = ra TRƯỚC; khuỷu .x<0 = gập ra trước; gối .x>0 = gập ra sau;
//         rightArm.z<0 giơ sang phải; torso.x>0 cúi; body.rx>0 ngã sấp.
// Mọi chuyển động phụ (bím tóc, râu, dây áo, mũ len) tính GIẢI TÍCH từ pose(t) và pose(t−dt): không lưu trạng thái.

import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// ---------- Kích thước & layout (PHẢI khớp tools/texture_templates.py + assets/textures/*/…_layout.json) ----------
export const R15_DIMS = {
  UpperTorso: [2.0, 1.6, 1.0], LowerTorso: [2.0, 0.4, 1.0],
  UpperArm: [1.0, 1.0, 1.0], LowerArm: [1.0, 0.6, 1.0], Hand: [1.0, 0.4, 1.0],
  UpperLeg: [1.0, 1.0, 1.0], LowerLeg: [1.0, 0.7, 1.0], Foot: [1.0, 0.3, 1.0],
};

// Bản sao "parts" của assets/textures/characters/outfit_layout.json (atlas 1024², 128 px/stud).
// Rect = [x, y, w, h] pixel từ góc trên-trái; mỗi ô nhìn từ ngoài vào, mép trên = phía đầu. Đổi JSON → sửa ở đây.
const strip = (x, y, w, d, h) => ({ front: [x, y, w, h], right: [x + w, y, d, h], back: [x + w + d, y, w, h], left: [x + 2 * w + d, y, d, h] });
export const OUTFIT_LAYOUT = {
  size: 1024,
  parts: {
    UpperTorso: { ...strip(0, 0, 256, 128, 205), top: [768, 0, 256, 128], bottom: [768, 128, 256, 128] },
    LowerTorso: { ...strip(0, 205, 256, 128, 51), top: [0, 920, 256, 100], bottom: [256, 920, 256, 100] },
    RightUpperArm: { ...strip(0, 264, 128, 128, 128), top: [0, 792, 128, 128] },
    RightLowerArm: strip(0, 392, 128, 128, 77),
    RightHand: { ...strip(0, 469, 128, 128, 51), bottom: [256, 792, 128, 128] },
    LeftUpperArm: { ...strip(512, 264, 128, 128, 128), top: [128, 792, 128, 128] },
    LeftLowerArm: strip(512, 392, 128, 128, 77),
    LeftHand: { ...strip(512, 469, 128, 128, 51), bottom: [384, 792, 128, 128] },
    RightUpperLeg: { ...strip(0, 528, 128, 128, 128), top: [768, 792, 128, 128] },
    RightLowerLeg: strip(0, 656, 128, 128, 90),
    RightFoot: { ...strip(0, 746, 128, 128, 38), bottom: [512, 792, 128, 128] },
    LeftUpperLeg: { ...strip(512, 528, 128, 128, 128), top: [896, 792, 128, 128] },
    LeftLowerLeg: strip(512, 656, 128, 128, 90),
    LeftFoot: { ...strip(512, 746, 128, 128, 38), bottom: [640, 792, 128, 128] },
  },
};

// Bản sao assets/textures/faces/face_layout.json (ô 256×128, nền trong suốt).
const FACE_CELLS = [
  ['eyes', ['open', 'half', 'closed', 'happy', 'wide', 'squint', 'sad', 'look_up']],
  ['brows', ['neutral', 'raised', 'worried', 'angry']],
  ['mouth', ['smile', 'grin', 'open', 'o', 'frown', 'flat', 'wobble', 'laugh', 'smallsmile', 'scream', 'pout', 'teeth_clench']],
  ['extra', ['blush', 'tears', 'sweat', 'shine', 'eyelashes', 'freckles', 'nose', 'cold_cheeks']],
];
export const FACE_LAYOUT = (() => {
  const sprites = {}; let i = 0;
  for (const [grp, names] of FACE_CELLS) for (const n of names) { sprites[`${grp}.${n}`] = [(i % 4) * 256, Math.floor(i / 4) * 128, 256, 128]; i++; }
  return { size: 1024, cell: [256, 128], sprites };
})();
// Vị trí tâm ô trên mặt (tỉ lệ chiều cao mặt, từ trên xuống). brows/eyes/mouth theo ghi chú face_layout.json.
// (engine đặt thấp hơn ghi chú JSON một chút để chừa vành mũ len; tỉ lệ giữa các lớp giữ nguyên)
const FACE_ROW = { brows: 0.3, eyes: 0.45, mouth: 0.74, blush: 0.61, tears: 0.59, sweat: 0.27, shine: 0.45, eyelashes: 0.45,
  freckles: 0.61, nose: 0.6, cold_cheeks: 0.61 };
const FACE_PX = 512;       // canvas mặt
const CELL_SCALE = 1.7;    // 1 ô sprite (256×128) → 435×218 px trên canvas mặt

// ---------- Mặc định ----------
export const R15_DEFAULTS = {
  name: 'r15',
  skin: '#f2c94c', shirt: '#2d6cdf', pants: '#3fa34d', face: 'smile',
  hat: 'none', hatColor: '#c0392b',          // none | cap | tophat | beanie
  faceStyle: 'cartoon',                      // (giữ cho tương thích; R15 luôn mặt hoạt hình ghép lớp)
  sleeves: null, shirtPattern: null, shirtPattern2: '#ffffff', pantsPattern: null, shoes: null,
  hair: 'none', hairColor: '#1b1b1b', beard: null, scarf: null, skirt: null, hoodie: null,
  // --- mới ở R15 (tuỳ chọn) ---
  zipper: false,        // áo khoác khoá kéo + 2 túi ngực (cha)
  boots: false,         // giày cao cổ (shoes = màu ủng)
  lashes: false,        // mi cong (mẹ)
  browThickness: 1,     // lông mày dày hơn (cha: 1.4)
  tired: false,         // quầng mắt + nếp nhăn đuôi mắt (cha trên đảo)
  freckles: false,
  blink: true,          // chớp mắt tất định
  seed: null,           // seed chớp mắt/đảo mắt (mặc định băm từ name)
  textures: null,       // kết quả loadCharacterTextures() → { outfit, outfitNormal, face }
  outfitTexture: null, outfitNormal: null, faceTexture: null,
};

export const R15_FACES = ['smile', 'happy', 'laugh', 'neutral', 'sad', 'worried', 'scared', 'panic', 'surprised', 'angry',
  'sleepy', 'sleep', 'cold', 'moved'];

// ---------- Tải texture (chỉ lúc init; file thiếu → null, không ném lỗi) ----------
// Texture là TUỲ CHỌN. Chỉ file được liệt kê trong assets/textures/index.json ("files": [...], đường dẫn
// tương đối) mới được tải → không còn request 404 dò mù. Muốn dùng texture mới: đặt PNG vào
// assets/textures/characters|faces rồi thêm tên vào index.json (vd "characters/hero_outfit.png").
const _texIndex = new Map();
function texIndex(base) {
  if (!_texIndex.has(base)) {
    _texIndex.set(base, fetch(`${base}/index.json`).then((r) => (r.ok ? r.json() : null)).then((j) => new Set((j && j.files) || [])).catch(() => new Set()));
  }
  return _texIndex.get(base);
}
export async function loadCharacterTextures(THREE, name, { base = '/assets/textures' } = {}) {
  const have = await texIndex(base);
  const loader = new THREE.TextureLoader();
  const get = (rel, srgb = true) => new Promise((res) => {
    if (!have.has(rel)) return res(null);
    try {
      loader.load(`${base}/${rel}`, (t) => { if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; res(t); }, undefined, () => res(null));
    } catch { res(null); }
  });
  const [outfit, outfitNormal, face0] = await Promise.all([
    get(`characters/${name}_outfit.png`),
    get(`characters/${name}_outfit_normal.png`, false),
    get(`faces/${name}_face.png`),
  ]);
  const face = face0 || (await get('faces/default_face.png'));
  return { outfit, outfitNormal, face };
}

// ---------- Tiện ích ----------
const PI = Math.PI, S = Math.sin, C = Math.cos;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const clamp01 = (v) => clamp(v, 0, 1);
const ease = (v) => v * v * (3 - 2 * v);
const frac = (x) => x - Math.floor(x);
const mix = (a, b, k) => a + (b - a) * k;
const strHash = (s) => { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const hash01 = (n, seed) => { let x = (Math.imul(n | 0, 374761393) + Math.imul(seed | 0, 668265263)) >>> 0; x = Math.imul(x ^ (x >>> 13), 1274126177); x ^= x >>> 16; return (x >>> 0) / 4294967296; };
function rng(seed) { let a = seed >>> 0 || 1; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function hexRgb(h) { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map((c) => c + c).join(''); const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
// shade(+) → sáng về trắng, shade(−) → tối về đen
function shade(hex, k) { const c = hexRgb(hex); const t = k < 0 ? 0 : 255, a = Math.abs(k); return `rgb(${c.map((v) => Math.round(v + (t - v) * a)).join(',')})`; }
function rgba(hex, a) { const c = hexRgb(hex); return `rgba(${c[0]},${c[1]},${c[2]},${a})`; }
const toHex = (css) => { if (css.startsWith('#')) return css; const m = css.match(/\d+/g).map(Number); return '#' + m.slice(0, 3).map((v) => v.toString(16).padStart(2, '0')).join(''); };
const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
function rr(g, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

// ---------- Hình học: hộp bo tròn có UV theo atlas ----------
const FACE_KEYS = ['left', 'right', 'top', 'bottom', 'front', 'back']; // thứ tự mặt BoxGeometry: +x,-x,+y,-y,+z,-z
function partGeometry(w, h, d, r, rects, { atlas = 1024, inset = 1.5 } = {}) {
  const geo = new RoundedBoxGeometry(w, h, d, 3, r);
  const pos = geo.attributes.position, uv = geo.attributes.uv;
  const per = pos.count / 6;
  for (let i = 0; i < pos.count; i++) {
    const f = Math.floor(i / per), x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    let key = FACE_KEYS[f], u, v;
    switch (f) {
      case 0: u = (d / 2 - z) / d; v = (h / 2 - y) / h; break;   // left (+X) nhìn từ ngoài
      case 1: u = (z + d / 2) / d; v = (h / 2 - y) / h; break;   // right (−X)
      case 2: u = (x + w / 2) / w; v = (z + d / 2) / d; break;   // top: mép trên ảnh = sau lưng
      case 3: u = (x + w / 2) / w; v = (d / 2 - z) / d; break;   // bottom: mép trên ảnh = phía trước
      case 4: u = (x + w / 2) / w; v = (h / 2 - y) / h; break;   // front (+Z)
      default: u = (w / 2 - x) / w; v = (h / 2 - y) / h; break;  // back (−Z)
    }
    u = clamp01(u); v = clamp01(v);
    let rc = rects[key];
    if (!rc) { // mặt khuất ở khớp, không có ô → dải mép của mặt trước
      const fr = rects.front; rc = key === 'top' ? [fr[0], fr[1], fr[2], 3] : [fr[0], fr[1] + fr[3] - 3, fr[2], 3];
    }
    const px = rc[0] + inset + u * (rc[2] - 2 * inset), py = rc[1] + inset + v * (rc[3] - 2 * inset);
    uv.setXY(i, px / atlas, 1 - py / atlas);
  }
  uv.needsUpdate = true;
  return geo;
}

// ---------- Thân từ mô hình tham chiếu (assets/characters/r15_body.glb, ShiroTheDream, CC BY 4.0) ----------
// 1 mesh tĩnh Z-up (chân z=-3, đỉnh đầu z=2.1), 8 khối rời. Đổi trục: X=x, Y=z+3, Z=-y (khớp ma trận node gốc).
// Tách theo khối rời rồi cắt theo mặt phẳng khớp của khung R15 bên dưới → 15 bộ phận, dời về tâm khớp, chiếu lại UV vào atlas.
const PIVOTS = {
  UpperTorso: [0, 2.4, 0], LowerTorso: [0, 2.0, 0], Head: [0, 4.0, 0],
  RightUpperArm: [-1.5, 3.6, 0], RightLowerArm: [-1.5, 3.0, 0], RightHand: [-1.5, 2.4, 0],
  LeftUpperArm: [1.5, 3.6, 0], LeftLowerArm: [1.5, 3.0, 0], LeftHand: [1.5, 2.4, 0],
  RightUpperLeg: [-0.5, 2.0, 0], RightLowerLeg: [-0.5, 1.0, 0], RightFoot: [-0.5, 0.3, 0],
  LeftUpperLeg: [0.5, 2.0, 0], LeftLowerLeg: [0.5, 1.0, 0], LeftFoot: [0.5, 0.3, 0],
};
let _bodyPromise = null;
export function loadR15Body(THREE, url = '/assets/characters/r15_body.glb') {
  if (_bodyPromise) return _bodyPromise;
  _bodyPromise = new GLTFLoader(THREE.DefaultLoadingManager).loadAsync(url).then((gltf) => {
    let src = null; gltf.scene.traverse((m) => { if (m.isMesh && !src) src = m.geometry; });
    if (!src) return null;
    const g = src.index ? src.toNonIndexed() : src;
    const P = g.attributes.position, N = g.attributes.normal;
    const nv = P.count, ntri = nv / 3;
    const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3);
    for (let i = 0; i < nv; i++) {  // đổi trục Z-up → Y-up
      pos[i * 3] = P.getX(i); pos[i * 3 + 1] = P.getZ(i) + 3; pos[i * 3 + 2] = -P.getY(i);
      nor[i * 3] = N.getX(i); nor[i * 3 + 1] = N.getZ(i); nor[i * 3 + 2] = -N.getY(i);
    }
    // khối rời: union-find trên đỉnh trùng vị trí
    const keyOf = (i) => `${Math.round(pos[i * 3] * 1e3)},${Math.round(pos[i * 3 + 1] * 1e3)},${Math.round(pos[i * 3 + 2] * 1e3)}`;
    const id = new Map(), par = [];
    const vid = (i) => { const k = keyOf(i); if (!id.has(k)) { id.set(k, par.length); par.push(par.length); } return id.get(k); };
    const find = (x) => { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; } return x; };
    const tv = new Int32Array(nv); for (let i = 0; i < nv; i++) tv[i] = vid(i);
    for (let t = 0; t < ntri; t++) { const a = find(tv[t * 3]); par[find(tv[t * 3 + 1])] = a; par[find(tv[t * 3 + 2])] = a; }
    const comp = new Map();   // root → bbox
    for (let i = 0; i < nv; i++) { const r = find(tv[i]); let b = comp.get(r); if (!b) comp.set(r, b = [1e9, 1e9, -1e9, -1e9]); b[0] = Math.min(b[0], pos[i * 3]); b[1] = Math.min(b[1], pos[i * 3 + 1]); b[2] = Math.max(b[2], pos[i * 3]); b[3] = Math.max(b[3], pos[i * 3 + 1]); }
    const kind = (b) => {   // phân loại khối theo bbox (x0,y0,x1,y1)
      const cx = (b[0] + b[2]) / 2, h = b[3] - b[1];
      if (b[1] > 3.7) return 'head';
      if (Math.abs(cx) > 1.1) return h < 0.5 ? 'hand' : 'arm';
      if (b[3] < 0.45) return 'feet';
      if (b[1] < 0.5) return 'legs';
      return 'torso';
    };
    const buckets = {}; for (const k of Object.keys(PIVOTS)) buckets[k] = [];
    for (let t = 0; t < ntri; t++) {
      const kd = kind(comp.get(find(tv[t * 3])));
      let cx = 0, cy = 0; for (let k = 0; k < 3; k++) { cx += pos[(t * 3 + k) * 3]; cy += pos[(t * 3 + k) * 3 + 1]; } cx /= 3; cy /= 3;
      const side = cx < 0 ? 'Right' : 'Left';   // tay PHẢI của nhân vật ở −X
      let part;
      if (kd === 'head') part = 'Head';
      else if (kd === 'torso') part = cy > 2.4 ? 'UpperTorso' : 'LowerTorso';
      else if (kd === 'arm') part = side + (cy > 3.0 ? 'UpperArm' : 'LowerArm');
      else if (kd === 'hand') part = side + 'Hand';
      else if (kd === 'legs') part = side + (cy > 1.0 ? 'UpperLeg' : 'LowerLeg');
      else part = side + 'Foot';
      buckets[part].push(t);
    }
    const out = {};
    for (const [part, tris] of Object.entries(buckets)) {
      if (!tris.length) continue;
      const pv = PIVOTS[part], ps = new Float32Array(tris.length * 9), ns = new Float32Array(tris.length * 9);
      tris.forEach((t, j) => { for (let k = 0; k < 9; k++) { ps[j * 9 + k] = pos[t * 9 + k] - pv[k % 3]; ns[j * 9 + k] = nor[t * 9 + k]; } });
      const bg = new THREE.BufferGeometry();
      bg.setAttribute('position', new THREE.BufferAttribute(ps, 3)); bg.setAttribute('normal', new THREE.BufferAttribute(ns, 3));
      bg.computeBoundingBox(); out[part] = bg;
    }
    return out;
  }).catch((e) => { console.warn('[r15] không tải được thân tham chiếu:', e.message); return null; });
  return _bodyPromise;
}
// Chiếu UV theo hướng pháp tuyến chính vào các ô của atlas (giống partGeometry), dùng bbox của bộ phận.
function projectBodyUV(THREE, geo, rects, { atlas = 1024, inset = 1.5 } = {}) {
  const g = geo.clone(); g.computeBoundingBox();
  const { min, max } = g.boundingBox, w = max.x - min.x, h = max.y - min.y, d = max.z - min.z;
  const P = g.attributes.position, N = g.attributes.normal, uv = new Float32Array(P.count * 2);
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i), y = P.getY(i), z = P.getZ(i), nx = N.getX(i), ny = N.getY(i), nz = N.getZ(i);
    const ax = Math.abs(nx), ay = Math.abs(ny), az = Math.abs(nz);
    let key, u, v;
    const fx = (x - min.x) / w, fy = (max.y - y) / h, fz = (z - min.z) / d;
    if (ay >= ax && ay >= az) { key = ny > 0 ? 'top' : 'bottom'; u = fx; v = ny > 0 ? fz : 1 - fz; }
    else if (az >= ax) { key = nz > 0 ? 'front' : 'back'; u = nz > 0 ? fx : 1 - fx; v = fy; }
    else { key = nx > 0 ? 'left' : 'right'; u = nx > 0 ? 1 - fz : fz; v = fy; }
    let rc = rects[key];
    if (!rc) { const fr = rects.front; rc = key === 'top' ? [fr[0], fr[1], fr[2], 3] : [fr[0], fr[1] + fr[3] - 3, fr[2], 3]; }
    uv[i * 2] = (rc[0] + inset + clamp01(u) * (rc[2] - 2 * inset)) / atlas; uv[i * 2 + 1] = 1 - (rc[1] + inset + clamp01(v) * (rc[3] - 2 * inset)) / atlas;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}

// Biên dạng đầu trụ bo: bán kính theo chiều cao y (0..H)
const HEAD = { R: 0.63, H: 1.2, E: 0.2 };
function headRadius(y) {
  const { R, H, E } = HEAD;
  if (y < E) return R - E + Math.sqrt(Math.max(0, E * E - (E - y) * (E - y)));
  if (y > H - E) return R - E + Math.sqrt(Math.max(0, E * E - (y - (H - E)) * (y - (H - E))));
  return R + 0.012 * S(PI * (y - E) / (H - 2 * E)); // phình nhẹ
}
function headProfile(THREE) {
  const { R, H, E } = HEAD, pts = [new THREE.Vector2(0.0001, 0)];
  for (let i = 0; i <= 10; i++) { const a = -PI / 2 + (i / 10) * PI / 2; pts.push(new THREE.Vector2(R - E + E * C(a), E + E * S(a))); }
  for (let i = 1; i < 8; i++) { const y = E + (H - 2 * E) * i / 8; pts.push(new THREE.Vector2(headRadius(y), y)); }
  for (let i = 0; i <= 10; i++) { const a = (i / 10) * PI / 2; pts.push(new THREE.Vector2(R - E + E * C(a), H - E + E * S(a))); }
  pts.push(new THREE.Vector2(0.0001, H));
  return pts;
}
// Mảng mặt trước bám theo biên dạng đầu; UV = (cung ngang, chiều cao) → canvas mặt không méo
const FACE_Y = [0.02, 0.97];
function facePatchGeometry(THREE) {
  const span = (FACE_Y[1] - FACE_Y[0]) / HEAD.R, NU = 28, NV = 28;
  const pos = [], uv = [], idx = [];
  for (let j = 0; j <= NV; j++) {
    const y = FACE_Y[0] + (FACE_Y[1] - FACE_Y[0]) * j / NV, r = headRadius(y) + 0.006;
    for (let i = 0; i <= NU; i++) {
      const ph = -span / 2 + span * i / NU;
      pos.push(r * S(ph), y, r * C(ph)); uv.push(i / NU, j / NV);
    }
  }
  for (let j = 0; j < NV; j++) for (let i = 0; i < NU; i++) {
    const a = j * (NU + 1) + i, b = a + 1, c = a + NU + 1, d = c + 1;
    idx.push(a, b, d, a, d, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}
// lathe bán kính theo hàm, cho mũ/tóc: prof = [[r,y],…]
function lathe(THREE, prof, seg = 40, phiStart = 0, phiLen = PI * 2) {
  return new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(Math.max(0.0001, r), y)), seg, phiStart, phiLen);
}
// vòm siêu-elip (mũ len, tóc): bán kính rx, tâm cy, cao ry, mũ n
function domeProfile(rx, y0, cy, ry, n = 3, steps = 16) {
  const out = [[rx, y0]];
  for (let i = 0; i <= steps; i++) { const k = i / steps, y = cy + ry * k; out.push([rx * Math.pow(Math.max(0, 1 - Math.pow(k, n)), 1 / n), y]); }
  return out;
}

// ---------- Texture phụ kiện (canvas, lặp) ----------
function repTex(THREE, cv, rx = 1, ry = 1) {
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = 8; return t;
}
function knitCanvas(color) {
  const cv = canvas(128, 128), g = cv.getContext('2d');
  g.fillStyle = shade(color, -0.22); g.fillRect(0, 0, 128, 128);
  g.lineCap = 'round';
  for (let cx = 0; cx < 128; cx += 16) for (let y = -6; y < 128; y += 11) {
    g.strokeStyle = shade(color, 0.06); g.lineWidth = 5;
    g.beginPath(); g.moveTo(cx + 3, y); g.lineTo(cx + 8, y + 8); g.stroke();
    g.strokeStyle = color; g.beginPath(); g.moveTo(cx + 13, y); g.lineTo(cx + 8, y + 8); g.stroke();
  }
  g.fillStyle = 'rgba(0,0,0,0.18)'; for (let cx = 0; cx < 128; cx += 16) g.fillRect(cx - 1, 0, 2, 128);
  return cv;
}
function strandCanvas(color, { tip = false, seed = 3 } = {}) {
  const cv = canvas(128, 128), g = cv.getContext('2d'), r = rng(seed);
  g.fillStyle = color; g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 70; i++) {
    const x = r() * 128, w = 1 + r() * 2.5, l = r() < 0.5 ? shade(color, 0.18 + r() * 0.15) : shade(color, -0.2 - r() * 0.2);
    g.strokeStyle = l; g.lineWidth = w; g.globalAlpha = 0.35 + r() * 0.4;
    g.beginPath(); g.moveTo(x, -4); g.bezierCurveTo(x + 6 * (r() - 0.5), 40, x + 8 * (r() - 0.5), 90, x + 4 * (r() - 0.5), 132); g.stroke();
  }
  g.globalAlpha = 1;
  if (tip) { const gr = g.createLinearGradient(0, 96, 0, 128); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.25)'); g.fillStyle = gr; g.fillRect(0, 96, 128, 32); }
  return cv;
}
function clothCanvas(color, { folds = 10, hem = true } = {}) {
  const cv = canvas(256, 256), g = cv.getContext('2d');
  g.fillStyle = color; g.fillRect(0, 0, 256, 256);
  for (let x = 0; x < 256; x++) { const s = S(x / 256 * PI * 2 * folds); g.fillStyle = s > 0 ? `rgba(255,255,255,${s * 0.07})` : `rgba(0,0,0,${-s * 0.16})`; g.fillRect(x, 0, 1, 256); }
  const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, 'rgba(0,0,0,0.12)'); gr.addColorStop(0.15, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.05)');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  if (hem) {
    g.fillStyle = shade(color, -0.18); g.fillRect(0, 232, 256, 24);
    g.strokeStyle = shade(color, 0.3); g.lineWidth = 2; g.setLineDash([6, 5]); g.beginPath(); g.moveTo(0, 238); g.lineTo(256, 238); g.stroke(); g.setLineDash([]);
    g.fillStyle = shade(color, -0.2); g.fillRect(0, 0, 256, 10);
  }
  return cv;
}

// ---------- Atlas quần áo vẽ thủ tục (1024², đúng layout) ----------
function paintOutfit(o, seed) {
  const cv = canvas(1024, 1024), g = cv.getContext('2d'), P = OUTFIT_LAYOUT.parts;
  const r = rng(seed ^ 0x5bd1e995);
  const skin = o.skin, shirt = o.shirt, sleeve = o.sleeves || null, pants = o.pants;
  const tornS = o.shirtPattern === 'torn', tornP = o.pantsPattern === 'torn', stripes = o.shirtPattern === 'stripes';
  const lower = o.skirt || pants;
  const shoe = o.shoes || (tornP ? null : toHex(shade(lower, -0.45)));
  const jeans = !o.skirt && !tornP && hexRgb(pants)[2] > hexRgb(pants)[0] + 40; // quần xanh → chỉ khâu vàng kiểu jean
  g.fillStyle = '#808080'; g.fillRect(0, 0, 1024, 1024);

  const base = {
    UpperTorso: shirt, LowerTorso: o.skirt || (o.hoodie ? shirt : pants),
    UpperArm: sleeve || skin, LowerArm: sleeve || skin, Hand: skin,
    UpperLeg: lower, LowerLeg: lower, Foot: shoe || skin,
  };
  const segOf = (part) => part.replace(/^(Right|Left)/, '');
  // lượt 1: tràn mép 4 px bằng màu nền
  for (const [part, faces] of Object.entries(P)) for (const rc of Object.values(faces)) { g.fillStyle = base[segOf(part)]; g.fillRect(rc[0] - 4, rc[1] - 4, rc[2] + 8, rc[3] + 8); }

  const grain = (w, h, amt = 1) => {
    for (let i = 0, n = (w * h) / 26; i < n; i++) { g.fillStyle = r() < 0.5 ? `rgba(255,255,255,${0.05 * amt})` : `rgba(0,0,0,${0.06 * amt})`; g.fillRect(r() * w, r() * h, 1 + r() * 1.5, 1 + r() * 1.5); }
  };
  const vgrad = (w, h, top, bot) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, top); gr.addColorStop(1, bot); g.fillStyle = gr; g.fillRect(0, 0, w, h); };
  const edgeAO = (w, h, top = 0, bot = 0) => {
    if (top) { const gr = g.createLinearGradient(0, 0, 0, top); gr.addColorStop(0, 'rgba(0,0,0,0.22)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, top); }
    if (bot) { const gr = g.createLinearGradient(0, h - bot, 0, h); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.22)'); g.fillStyle = gr; g.fillRect(0, h - bot, w, bot); }
  };
  const stitch = (pts, col, dash = [5, 4], lw = 1.6) => { g.save(); g.strokeStyle = col; g.lineWidth = lw; g.setLineDash(dash); g.beginPath(); g.moveTo(...pts[0]); for (const p of pts.slice(1)) g.lineTo(...p); g.stroke(); g.restore(); };
  const jag = (x0, x1, y, amp, step = 7) => { const pts = []; for (let x = x0; x <= x1 + 0.1; x += step) pts.push([x, y + (r() - 0.5) * 2 * amp]); return pts; };
  // lỗ rách: đa giác răng cưa lộ da + viền tối + sợi chỉ
  const hole = (cx, cy, rx, ry, fill = skin) => {
    g.beginPath(); const n = 11;
    for (let i = 0; i < n; i++) { const a = (i / n) * PI * 2, k = 0.65 + r() * 0.5; const x = cx + C(a) * rx * k, y = cy + S(a) * ry * k; i ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.closePath(); g.fillStyle = fill; g.fill(); g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 2.5; g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.45)'; g.lineWidth = 1;
    for (let i = 0; i < 4; i++) { const a = r() * PI * 2; g.beginPath(); g.moveTo(cx + C(a) * rx * 0.8, cy + S(a) * ry * 0.8); g.lineTo(cx + C(a) * rx * 0.45, cy + S(a) * ry * 0.45); g.stroke(); }
  };
  const raggedBottom = (w, h, y, fill) => { // vải dừng ở y, dưới là `fill`
    g.beginPath(); g.moveTo(-2, h + 2); for (const [x, yy] of jag(-2, w + 2, y, 5, 6)) g.lineTo(x, yy); g.lineTo(w + 2, h + 2); g.closePath();
    g.fillStyle = fill; g.fill(); g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 2; g.stroke();
  };
  const paint = (part, fn) => {
    for (const [face, rc] of Object.entries(P[part])) {
      g.save(); g.beginPath(); g.rect(rc[0], rc[1], rc[2], rc[3]); g.clip(); g.translate(rc[0], rc[1]);
      fn(face, rc[2], rc[3], part.startsWith('Right') ? -1 : 1); g.restore();
    }
  };
  const fabric = (w, h, col, face, pat = stripes) => {
    g.fillStyle = col; g.fillRect(0, 0, w, h);
    if (pat && col !== skin && face !== 'top' && face !== 'bottom') { g.fillStyle = rgba(o.shirtPattern2, 0.9); for (let x = 6; x < w; x += 26) g.fillRect(x, 0, 10, h); }
    if (tornS && col === shirt) { for (let i = 0; i < 3; i++) { g.fillStyle = 'rgba(255,255,255,0.10)'; rr(g, r() * w, r() * h, 18 + r() * 40, 12 + r() * 30, 8); g.fill(); } }
    grain(w, h);
    vgrad(w, h, 'rgba(255,255,255,0.05)', 'rgba(0,0,0,0.07)');
    if (face === 'right' || face === 'left') { g.fillStyle = 'rgba(0,0,0,0.05)'; g.fillRect(0, 0, w, h); }
  };

  // --- Thân trên ---
  paint('UpperTorso', (face, w, h) => {
    fabric(w, h, shirt, face);
    if (face === 'front') {
      // cổ áo
      g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.ellipse(w / 2, -6, 50, 26, 0, 0, PI); g.fill();
      if (o.hoodie) {
        // túi kangaroo
        const y0 = h * 0.56, pc = shade(shirt, -0.06);
        g.beginPath(); g.moveTo(w * 0.2, h + 2); g.lineTo(w * 0.26, y0 + 14); g.quadraticCurveTo(w * 0.27, y0, w * 0.32, y0);
        g.lineTo(w * 0.68, y0); g.quadraticCurveTo(w * 0.73, y0, w * 0.74, y0 + 14); g.lineTo(w * 0.8, h + 2); g.closePath();
        g.fillStyle = pc; g.fill(); g.strokeStyle = shade(shirt, -0.3); g.lineWidth = 3; g.stroke();
        stitch([[w * 0.235, h], [w * 0.28, y0 + 10], [w * 0.32, y0 + 5], [w * 0.68, y0 + 5], [w * 0.72, y0 + 10], [w * 0.765, h]], shade(shirt, 0.35));
        g.strokeStyle = shade(shirt, -0.38); g.lineWidth = 3;
        g.beginPath(); g.moveTo(w * 0.27, y0 + 12); g.lineTo(w * 0.33, h - 4); g.stroke();
        g.beginPath(); g.moveTo(w * 0.73, y0 + 12); g.lineTo(w * 0.67, h - 4); g.stroke();
        // viền mũ trùm quanh cổ
        g.strokeStyle = shade(shirt, -0.25); g.lineWidth = 7; g.beginPath(); g.ellipse(w / 2, 0, 62, 34, 0, 0.05, PI - 0.05); g.stroke();
        // lỗ xỏ dây
        g.fillStyle = shade(shirt, -0.5); for (const sx of [-1, 1]) { g.beginPath(); g.arc(w / 2 + sx * 28, 26, 3.5, 0, PI * 2); g.fill(); }
      }
      if (o.zipper) {
        g.fillStyle = shade(shirt, -0.35); g.fillRect(w / 2 - 4, 0, 8, h);
        g.fillStyle = '#c9ccd2'; for (let y = 4; y < h; y += 6) g.fillRect(w / 2 - 3, y, 6, 2);
        g.fillStyle = '#d9dce2'; rr(g, w / 2 - 5, 34, 10, 20, 3); g.fill();
        // cổ bẻ
        for (const sx of [-1, 1]) {
          g.beginPath(); g.moveTo(w / 2 + sx * 6, 0); g.lineTo(w / 2 + sx * 58, 0); g.lineTo(w / 2 + sx * 18, 44); g.closePath();
          g.fillStyle = shade(shirt, 0.08); g.fill(); g.strokeStyle = shade(shirt, -0.4); g.lineWidth = 2.5; g.stroke();
          // túi ngực có nắp + cúc
          const px = w / 2 + sx * 62 - 26, py = 62;
          g.fillStyle = shade(shirt, -0.06); rr(g, px, py, 52, 46, 6); g.fill(); g.strokeStyle = shade(shirt, -0.38); g.lineWidth = 2; g.stroke();
          g.fillStyle = shade(shirt, 0.06); rr(g, px - 2, py - 4, 56, 16, 5); g.fill(); g.stroke();
          g.fillStyle = '#d8b25a'; g.beginPath(); g.arc(px + 26, py + 6, 3.5, 0, PI * 2); g.fill();
          stitch([[px + 4, py + 16], [px + 4, py + 42], [px + 48, py + 42], [px + 48, py + 16]], shade(shirt, 0.3), [4, 3], 1.2);
        }
      }
      if (!o.hoodie && !o.zipper && !o.scarf) { g.strokeStyle = shade(shirt, -0.3); g.lineWidth = 4; g.beginPath(); g.ellipse(w / 2, 0, 44, 22, 0, 0, PI); g.stroke(); }
    }
    if (face === 'back' && o.hoodie) { g.strokeStyle = shade(shirt, -0.28); g.lineWidth = 4; g.beginPath(); g.ellipse(w / 2, 0, 70, 60, 0, 0.1, PI - 0.1); g.stroke(); }
    if (face === 'top') { g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(w / 2, h / 2, 70, 44, 0, 0, PI * 2); g.fill(); }
    if (face !== 'top' && face !== 'bottom') {
      edgeAO(w, h, 16, 0);
      stitch([[0, h - 8], [w, h - 8]], 'rgba(0,0,0,0.25)', [5, 4], 1.5);   // gấu áo
      if (face === 'right' || face === 'left') stitch([[w / 2, 0], [w / 2, h]], 'rgba(0,0,0,0.22)', [6, 4], 1.4);
    }
    if (tornS && face !== 'top') {
      for (let i = 0; i < (face === 'front' || face === 'back' ? 3 : 1); i++) hole(20 + r() * (w - 40), 30 + r() * (h - 70), 10 + r() * 12, 8 + r() * 10);
      raggedBottom(w, h, h - 6, rgba(skin, 0));
      // miếng vá
      if (face === 'front') { g.fillStyle = shade(shirt, 0.2); rr(g, w * 0.62, h * 0.55, 40, 32, 4); g.fill(); stitch([[w * 0.62 + 4, h * 0.55 + 4], [w * 0.62 + 36, h * 0.55 + 4], [w * 0.62 + 36, h * 0.55 + 28], [w * 0.62 + 4, h * 0.55 + 28], [w * 0.62 + 4, h * 0.55 + 4]], '#e8dcc0', [4, 3], 1.5); }
    }
  });

  // --- Thân dưới (hông) ---
  paint('LowerTorso', (face, w, h) => {
    if (o.skirt) { fabric(w, h, o.skirt, face, false); return; }
    fabric(w, h, pants, face, false);
    if (face === 'top' || face === 'bottom') return;
    if (o.hoodie) { // gấu hoodie bo len phủ nửa trên
      g.fillStyle = shade(shirt, -0.08); g.fillRect(0, 0, w, h * 0.55);
      g.fillStyle = 'rgba(0,0,0,0.12)'; for (let x = 2; x < w; x += 6) g.fillRect(x, 0, 2, h * 0.55);
      g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(0, h * 0.55, w, 3);
    } else if (o.zipper) { // thắt lưng
      g.fillStyle = '#4a3222'; g.fillRect(0, 2, w, 14); if (face === 'front') { g.strokeStyle = '#d8b25a'; g.lineWidth = 3; g.strokeRect(w / 2 - 10, 1, 20, 16); }
    } else { g.fillStyle = shade(pants, -0.18); g.fillRect(0, 0, w, 10); }
    if (face === 'front') { stitch([[w / 2, h * 0.55], [w / 2, h]], shade(pants, jeans ? 0.0 : -0.35)); if (jeans) stitch([[w / 2 + 8, h * 0.6], [w / 2 + 8, h]], '#e0a64a'); }
    if (tornS && !o.hoodie) raggedBottom(w, h, -100, 'rgba(0,0,0,0)');
  });

  // --- Tay ---
  for (const side of ['Right', 'Left']) {
    paint(side + 'UpperArm', (face, w, h) => {
      fabric(w, h, sleeve || skin, face, stripes && !!sleeve);
      if (sleeve && face !== 'top') { stitch([[0, 6], [w, 6]], 'rgba(0,0,0,0.25)'); edgeAO(w, h, 10, 0); }
      if (tornS && sleeve && face === 'front') hole(w * 0.5, h * 0.55, 12, 9);
      if (!sleeve) edgeAO(w, h, 0, 8);
    });
    paint(side + 'LowerArm', (face, w, h) => {
      fabric(w, h, sleeve || skin, face, stripes && !!sleeve);
      edgeAO(w, h, 10, 0);
      if (!sleeve) return;
      if (tornS) { raggedBottom(w, h, h * 0.62, skin); return; }
      if (o.hoodie) { g.fillStyle = shade(sleeve, -0.1); g.fillRect(0, h * 0.62, w, h); g.fillStyle = 'rgba(0,0,0,0.12)'; for (let x = 2; x < w; x += 6) g.fillRect(x, h * 0.62, 2, h); g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(0, h * 0.62, w, 2); }
      else { g.fillStyle = shade(sleeve, -0.12); g.fillRect(0, h * 0.72, w, h); stitch([[0, h * 0.72 + 4], [w, h * 0.72 + 4]], shade(sleeve, 0.3), [4, 3], 1.2); }
    });
    paint(side + 'Hand', (face, w, h) => {
      g.fillStyle = skin; g.fillRect(0, 0, w, h); grain(w, h, 0.6);
      vgrad(w, h, 'rgba(0,0,0,0.12)', 'rgba(0,0,0,0.0)');
      if (face === 'front' || face === 'back') { g.strokeStyle = rgba(toHex(shade(skin, -0.45)), 0.35); g.lineWidth = 2; g.lineCap = 'round'; for (const x of [0.32, 0.5, 0.68]) { g.beginPath(); g.moveTo(w * x, h * 0.55); g.lineTo(w * x, h - 2); g.stroke(); } }
    });
  }

  // --- Chân ---
  for (const side of ['Right', 'Left']) {
    const outer = side === 'Right' ? 'right' : 'left', inner = side === 'Right' ? 'left' : 'right';
    paint(side + 'UpperLeg', (face, w, h) => {
      fabric(w, h, lower, face, false);
      if (face === 'top') return;
      edgeAO(w, h, 10, 0);
      if (o.skirt) return;
      if (face === outer) { stitch([[w / 2 - 3, 0], [w / 2 - 3, h]], jeans ? '#e0a64a' : 'rgba(0,0,0,0.25)'); if (jeans) stitch([[w / 2 + 3, 0], [w / 2 + 3, h]], '#e0a64a'); }
      if (face === inner) stitch([[w / 2, 0], [w / 2, h]], 'rgba(0,0,0,0.22)');
      if (face === 'front') {
        const ox = side === 'Right' ? 0 : w; g.strokeStyle = shade(lower, -0.3); g.lineWidth = 2.5;
        g.beginPath(); g.moveTo(Math.abs(ox - w * 0.62), 0); g.quadraticCurveTo(Math.abs(ox - w * 0.55), h * 0.28, ox, h * 0.34); g.stroke();
        if (jeans) stitch([[Math.abs(ox - w * 0.55), 0], [Math.abs(ox - w * 0.5), h * 0.22], [ox, h * 0.28]], '#e0a64a', [4, 3], 1.2);
      }
      if (tornP && (face === 'front')) hole(w * 0.5, h * 0.84, 22, 12);
    });
    paint(side + 'LowerLeg', (face, w, h) => {
      fabric(w, h, lower, face, false);
      edgeAO(w, h, 12, 0);
      if (o.skirt) { g.fillStyle = shade(lower, -0.25); g.fillRect(0, 0, w, h); grain(w, h); edgeAO(w, h, 14, 0); return; }
      if (tornP) { if (face === 'front') hole(w * 0.45, h * 0.18, 18, 10); raggedBottom(w, h, h * 0.66, skin); return; }
      if (o.boots && shoe) {
        g.fillStyle = shoe; g.fillRect(0, h * 0.45, w, h); grain(w, h * 0.5);
        g.fillStyle = shade(shoe, 0.18); g.fillRect(0, h * 0.45, w, 7); g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(0, h * 0.45 + 7, w, 2);
        if (face === 'front') { g.strokeStyle = '#d8c7a0'; g.lineWidth = 2; for (let y = h * 0.55; y < h; y += 9) { g.beginPath(); g.moveTo(w * 0.38, y); g.lineTo(w * 0.62, y + 5); g.moveTo(w * 0.62, y); g.lineTo(w * 0.38, y + 5); g.stroke(); } }
        return;
      }
      g.fillStyle = shade(lower, -0.12); g.fillRect(0, h * 0.82, w, h); stitch([[0, h * 0.82 + 4], [w, h * 0.82 + 4]], jeans ? '#e0a64a' : shade(lower, 0.25), [4, 3], 1.3);
      if (face === outer && jeans) stitch([[w / 2, 0], [w / 2, h * 0.8]], '#e0a64a');
    });
    paint(side + 'Foot', (face, w, h) => {
      if (!shoe) { // chân trần
        g.fillStyle = skin; g.fillRect(0, 0, w, h); grain(w, h, 0.6); vgrad(w, h, 'rgba(0,0,0,0.1)', 'rgba(0,0,0,0.16)');
        if (face === 'front') { g.strokeStyle = rgba(toHex(shade(skin, -0.45)), 0.4); g.lineWidth = 2; for (const x of [0.25, 0.42, 0.58, 0.75]) { g.beginPath(); g.moveTo(w * x, h * 0.3); g.lineTo(w * x, h); g.stroke(); } }
        return;
      }
      const sole = o.boots ? '#2a1d14' : '#f4f4f4';
      g.fillStyle = shoe; g.fillRect(0, 0, w, h); grain(w, h);
      if (face === 'bottom') { g.fillStyle = sole; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(0,0,0,0.18)'; g.lineWidth = 3; for (let y = 10; y < h; y += 14) { g.beginPath(); g.moveTo(8, y); g.lineTo(w - 8, y); g.stroke(); } return; }
      g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(0, 0, w, h * 0.2);
      g.fillStyle = sole; g.fillRect(0, h * 0.62, w, h); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, h * 0.62, w, 2);
      if (face === 'front' && !o.boots) { g.fillStyle = 'rgba(255,255,255,0.18)'; rr(g, w * 0.2, 2, w * 0.6, h * 0.5, 6); g.fill(); }
    });
  }
  return cv;
}

// ---------- MẶT: vẽ vector theo "ô sprite" 256×128 (cùng tên với face_layout.json) ----------
const INK = '#1b1b1b';
const OPENISH = new Set(['open', 'wide', 'sad', 'look_up', 'half']);
const EYE_KIND = {
  open: { es: 1, lid: [0, 0], ps: 1 },
  half: { es: 1, lid: [0.5, 0.5], ps: 1 },
  wide: { es: 1.12, lid: [0, 0], ps: 0.62 },
  sad: { es: 1, lid: [0.12, 0.42], ps: 1.05, wet: true },
  look_up: { es: 1, lid: [0, 0], ps: 1, gaze: [0, -1] },
};
function drawEyesCell(g, kind, q, P) {
  for (const side of [-1, 1]) {
    const cx = 128 + side * 52, cy = 64;
    if (kind === 'closed' || kind === 'happy') {
      const up = kind === 'happy' ? -1 : 1;
      g.strokeStyle = INK; g.lineWidth = 7; g.lineCap = 'round';
      g.beginPath(); g.moveTo(cx - 24, cy + 2 - up * 4); g.quadraticCurveTo(cx, cy + up * 20, cx + 24, cy + 2 - up * 4); g.stroke();
      if (P.lashes) { g.lineWidth = 4; const ox = cx + side * 24, oy = cy + 2 - up * 4; g.beginPath(); g.moveTo(ox, oy); g.lineTo(ox + side * 7, oy - (kind === 'happy' ? 9 : -2)); g.stroke(); }
      continue;
    }
    if (kind === 'squint') {
      g.strokeStyle = INK; g.lineWidth = 7; g.lineCap = 'round'; g.lineJoin = 'round';
      g.beginPath(); g.moveTo(cx + side * 18, cy - 17); g.lineTo(cx - side * 14, cy); g.lineTo(cx + side * 18, cy + 17); g.stroke();
      continue;
    }
    const K = { ...EYE_KIND[kind] || EYE_KIND.open, ...q };
    const rx = 27.5 * K.es, ry = 34.5 * K.es;
    const gz = K.gaze || [0, 0];
    const lidI = K.lid[0], lidO = K.lid[1];
    const yI = cy - ry + 2 * ry * lidI, yO = cy - ry + 2 * ry * lidO;
    const xL = cx - rx - 6, xR = cx + rx + 6;
    const yL = side < 0 ? yO : yI, yR = side < 0 ? yI : yO;
    const eyePath = (ex = 0) => { g.beginPath(); g.ellipse(cx, cy, rx + ex, ry + ex, 0, 0, PI * 2); };
    const hasLid = lidI > 0.02 || lidO > 0.02;
    g.save(); eyePath(); g.clip();
    g.fillStyle = '#ffffff'; g.fill();
    // bóng mí trên
    const sh = g.createLinearGradient(0, cy - ry, 0, cy - ry * 0.2); sh.addColorStop(0, 'rgba(60,50,90,0.22)'); sh.addColorStop(1, 'rgba(60,50,90,0)');
    g.fillStyle = sh; g.fillRect(cx - rx, cy - ry, rx * 2, ry);
    // đồng tử lớn + ánh ấm phía dưới + 2 điểm sáng
    const lidAvg = (lidI + lidO) / 2;
    const px = cx + gz[0] * rx * 0.42, py = cy + gz[1] * ry * 0.4 + lidAvg * ry * 0.35;
    const prx = rx * 0.64 * K.ps, pry = ry * 0.66 * K.ps;
    g.fillStyle = INK; g.beginPath(); g.ellipse(px, py, prx, pry, 0, 0, PI * 2); g.fill();
    const ig = g.createRadialGradient(px, py + pry * 0.55, 0, px, py + pry * 0.55, pry * 0.9);
    ig.addColorStop(0, 'rgba(150,100,70,0.75)'); ig.addColorStop(1, 'rgba(150,100,70,0)');
    g.fillStyle = ig; g.beginPath(); g.ellipse(px, py, prx, pry, 0, 0, PI * 2); g.fill();
    g.fillStyle = '#ffffff';
    g.beginPath(); g.ellipse(px - prx * 0.32, py - pry * 0.4, prx * 0.38, pry * 0.32, -0.4, 0, PI * 2); g.fill();
    g.beginPath(); g.arc(px + prx * 0.38, py + pry * 0.38, prx * 0.17, 0, PI * 2); g.fill();
    if (K.wet || K.shine) {
      g.fillStyle = 'rgba(140,205,255,0.55)'; g.beginPath(); g.ellipse(cx, cy + ry * 0.92, rx * 0.95, ry * 0.36, 0, 0, PI * 2); g.fill();
      g.fillStyle = '#ffffff'; g.beginPath(); g.arc(px + prx * 0.05, py - pry * 0.05, prx * 0.12, 0, PI * 2); g.fill();
      g.beginPath(); g.ellipse(px - prx * 0.1, py + pry * 0.68, prx * 0.3, pry * 0.09, 0, 0, PI * 2); g.fill();
    }
    if (hasLid) { // mí trên màu da
      g.fillStyle = P.skin; g.beginPath(); g.moveTo(xL, cy - ry - 8); g.lineTo(xR, cy - ry - 8); g.lineTo(xR, yR); g.lineTo(xL, yL); g.closePath(); g.fill();
    }
    g.restore();
    // viền mắt (chỉ phần dưới mí)
    g.save();
    if (hasLid) { g.beginPath(); g.moveTo(xL, yL); g.lineTo(xR, yR); g.lineTo(xR, cy + ry + 20); g.lineTo(xL, cy + ry + 20); g.closePath(); g.clip(); }
    g.strokeStyle = INK; g.lineWidth = 6; eyePath(); g.stroke();
    if (!hasLid && P.lashes) { g.lineWidth = 8.5; g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, PI * 1.08, PI * 1.92); g.stroke(); }
    g.restore();
    if (hasLid) { g.save(); eyePath(4); g.clip(); g.strokeStyle = INK; g.lineWidth = P.lashes ? 8 : 6.5; g.lineCap = 'round'; g.beginPath(); g.moveTo(xL, yL); g.lineTo(xR, yR); g.stroke(); g.restore(); }
    if (P.lashes) { // mi cong ở đuôi mắt
      g.strokeStyle = INK; g.lineCap = 'round'; g.lineWidth = 4;
      const lidY = hasLid ? (side < 0 ? yL : yR) : null;
      for (let k = 0; k < 3; k++) {
        let bx, by;
        if (lidY !== null) { bx = cx + side * (rx - k * 7); by = lidY + (k * 2); }
        else { const a = side < 0 ? PI + 0.25 + k * 0.3 : -0.25 - k * 0.3; bx = cx + rx * C(a); by = cy + ry * S(a); }
        g.beginPath(); g.moveTo(bx, by); g.quadraticCurveTo(bx + side * 6, by - 4, bx + side * (9 - k), by - 10 + k * 2); g.stroke();
      }
    }
    if (P.tired) {
      g.strokeStyle = 'rgba(120,70,50,0.45)'; g.lineWidth = 3; g.lineCap = 'round';
      g.beginPath(); g.ellipse(cx, cy + ry * 0.62, rx * 0.85, ry * 0.5, 0, PI * 0.2, PI * 0.8); g.stroke();
      g.strokeStyle = 'rgba(120,70,50,0.35)'; g.lineWidth = 2.5;
      for (const dy of [-6, 4]) { g.beginPath(); g.moveTo(cx + side * (rx + 5), cy + dy); g.lineTo(cx + side * (rx + 13), cy + dy * 1.5 - 2); g.stroke(); }
    }
  }
}
const BROWS = { neutral: [38, 39, -5], raised: [22, 26, -10], worried: [25, 43, 2], angry: [52, 30, 3], low: [45, 45, -3] };
function drawBrowsCell(g, kind, P) {
  const s = BROWS[kind] || BROWS.neutral, T = 9 * (P.browThickness || 1);
  g.strokeStyle = P.browColor || INK; g.lineCap = 'round'; g.lineWidth = T;
  for (const side of [-1, 1]) {
    const cx = 128 + side * 52, xi = cx - side * 21, xo = cx + side * 23;
    g.beginPath(); g.moveTo(xi, s[0]); g.quadraticCurveTo((xi + xo) / 2, (s[0] + s[1]) / 2 + s[2], xo, s[1]); g.stroke();
  }
}
const MOUTH_IN = '#5a1622', TONGUE = '#ff7b8f';
function drawMouthCell(g, kind) {
  g.strokeStyle = INK; g.lineCap = 'round'; g.lineJoin = 'round'; g.lineWidth = 6.5;
  const openShape = (pathFn, { teethTop = 0, teethBot = 0, tongue = null } = {}) => {
    pathFn(); g.fillStyle = MOUTH_IN; g.fill();
    g.save(); pathFn(); g.clip();
    if (tongue) { g.fillStyle = TONGUE; g.beginPath(); g.ellipse(tongue[0], tongue[1], tongue[2], tongue[3], 0, 0, PI * 2); g.fill(); g.strokeStyle = 'rgba(160,40,60,0.6)'; g.lineWidth = 2; g.beginPath(); g.moveTo(tongue[0], tongue[1] - tongue[3] * 0.6); g.lineTo(tongue[0], tongue[1] + tongue[3] * 0.1); g.stroke(); }
    if (teethTop) { g.fillStyle = '#ffffff'; g.fillRect(0, 0, 256, teethTop); }
    if (teethBot) { g.fillStyle = '#ffffff'; g.fillRect(0, teethBot, 256, 128); }
    g.restore();
    g.strokeStyle = INK; g.lineWidth = 6.5; pathFn(); g.stroke();
  };
  const stroke = (fn) => { g.beginPath(); fn(); g.stroke(); };
  switch (kind) {
    case 'smile': stroke(() => { g.moveTo(98, 56); g.quadraticCurveTo(128, 84, 158, 56); }); break;
    case 'smallsmile': stroke(() => { g.moveTo(110, 60); g.quadraticCurveTo(128, 74, 146, 60); }); break;
    case 'frown': stroke(() => { g.moveTo(102, 74); g.quadraticCurveTo(128, 50, 154, 74); }); break;
    case 'flat': stroke(() => { g.moveTo(108, 64); g.quadraticCurveTo(128, 67, 148, 63); }); break;
    case 'pout': stroke(() => { g.moveTo(112, 70); g.quadraticCurveTo(128, 56, 144, 70); }); g.lineWidth = 4; stroke(() => { g.moveTo(120, 80); g.quadraticCurveTo(128, 85, 136, 80); }); break;
    case 'wobble': stroke(() => { g.moveTo(98, 64); for (let x = 98; x <= 158; x += 2) g.lineTo(x, 64 + 6 * S((x - 98) / 60 * PI * 3)); }); break;
    case 'grin': openShape(() => { g.beginPath(); g.moveTo(94, 52); g.quadraticCurveTo(128, 58, 162, 52); g.quadraticCurveTo(158, 96, 128, 96); g.quadraticCurveTo(98, 96, 94, 52); g.closePath(); }, { teethTop: 66, tongue: [128, 96, 18, 10] }); break;
    case 'open': openShape(() => { g.beginPath(); g.moveTo(100, 54); g.quadraticCurveTo(128, 60, 156, 54); g.quadraticCurveTo(154, 94, 128, 94); g.quadraticCurveTo(102, 94, 100, 54); g.closePath(); }, { tongue: [130, 92, 17, 11] }); break;
    case 'laugh': openShape(() => { g.beginPath(); g.moveTo(88, 46); g.quadraticCurveTo(128, 54, 168, 46); g.quadraticCurveTo(164, 108, 128, 108); g.quadraticCurveTo(92, 108, 88, 46); g.closePath(); }, { teethTop: 60, tongue: [128, 106, 24, 15] }); break;
    case 'o': openShape(() => { g.beginPath(); g.ellipse(128, 66, 13, 16, 0, 0, PI * 2); }, { tongue: [128, 80, 9, 6] }); break;
    case 'scream': openShape(() => { g.beginPath(); g.moveTo(106, 46); g.quadraticCurveTo(128, 38, 150, 46); g.quadraticCurveTo(162, 100, 128, 106); g.quadraticCurveTo(94, 100, 106, 46); g.closePath(); }, { teethTop: 52, tongue: [128, 102, 18, 12] }); break;
    case 'teeth_clench': {
      const p = () => rr(g, 98, 50, 60, 28, 11);
      p(); g.fillStyle = '#ffffff'; g.fill();
      g.save(); p(); g.clip(); g.strokeStyle = 'rgba(0,0,0,0.55)'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(96, 64); g.lineTo(160, 64);
      for (let x = 110; x < 158; x += 12) { g.moveTo(x, 50); g.lineTo(x, 78); } g.stroke(); g.restore();
      g.strokeStyle = INK; g.lineWidth = 6; p(); g.stroke(); break;
    }
    default: stroke(() => { g.moveTo(98, 56); g.quadraticCurveTo(128, 84, 158, 56); });
  }
}
function drawExtraCell(g, kind, P) {
  const soft = (x, y, rx, ry, col, a) => { const gr = g.createRadialGradient(x, y, 0, x, y, rx); gr.addColorStop(0, rgba(col, a)); gr.addColorStop(1, rgba(col, 0)); g.save(); g.translate(x, y); g.scale(1, ry / rx); g.translate(-x, -y); g.fillStyle = gr; g.beginPath(); g.arc(x, y, rx, 0, PI * 2); g.fill(); g.restore(); };
  switch (kind) {
    case 'blush': for (const sx of [-1, 1]) { soft(128 + sx * 72, 64, 26, 13, '#ff6f86', 0.55); g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 2.5; g.lineCap = 'round'; for (let k = -1; k <= 1; k++) { g.beginPath(); g.moveTo(128 + sx * 72 + k * 8 - 3, 70); g.lineTo(128 + sx * 72 + k * 8 + 3, 60); g.stroke(); } } break;
    case 'cold_cheeks': for (const sx of [-1, 1]) soft(128 + sx * 70, 64, 28, 15, '#e8394d', 0.6); soft(128, 50, 9, 7, '#e8394d', 0.55); break;
    case 'freckles': g.fillStyle = 'rgba(150,85,50,0.55)'; for (const sx of [-1, 1]) for (const [dx, dy] of [[0, 0], [9, 5], [-8, 6], [3, 12], [14, -3]]) { g.beginPath(); g.arc(128 + sx * (64 + dx), 60 + dy, 2.4, 0, PI * 2); g.fill(); } break;
    case 'nose': g.strokeStyle = rgba(INK, 0.55); g.lineWidth = 4; g.lineCap = 'round'; g.beginPath(); g.arc(128, 60, 7, PI * 0.15, PI * 0.85); g.stroke(); break;
    case 'tears':
      for (const sx of [-1, 1]) {
        const x = 128 + sx * 56;
        g.fillStyle = 'rgba(120,195,255,0.85)'; g.beginPath(); g.moveTo(x - 6, 30); g.quadraticCurveTo(x - 8, 80, x - 1, 104); g.quadraticCurveTo(x + 9, 108, x + 7, 96); g.quadraticCurveTo(x + 5, 60, x + 6, 30); g.closePath(); g.fill();
        g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 2.5; g.lineCap = 'round'; g.beginPath(); g.moveTo(x - 2, 40); g.lineTo(x - 3, 80); g.stroke();
      }
      break;
    case 'sweat': {
      const x = 196, y = 52;
      g.beginPath(); g.moveTo(x, y - 26); g.quadraticCurveTo(x + 16, y, x + 14, y + 8); g.arc(x, y + 8, 14, 0, PI); g.quadraticCurveTo(x - 16, y, x, y - 26); g.closePath();
      g.fillStyle = '#9fdcff'; g.fill(); g.strokeStyle = '#3f8fd6'; g.lineWidth = 3.5; g.stroke();
      g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(x - 5, y + 6, 3, 6, 0.3, 0, PI * 2); g.fill(); break;
    }
    case 'shine': g.fillStyle = '#ffffff'; for (const sx of [-1, 1]) { const x = 128 + sx * 52 + 12, y = 44; g.beginPath(); g.moveTo(x, y - 9); g.lineTo(x + 2.5, y - 2.5); g.lineTo(x + 9, y); g.lineTo(x + 2.5, y + 2.5); g.lineTo(x, y + 9); g.lineTo(x - 2.5, y + 2.5); g.lineTo(x - 9, y); g.lineTo(x - 2.5, y - 2.5); g.closePath(); g.fill(); } break;
    default: break;
  }
}

// Biểu cảm = lựa chọn lớp + tham số. eyesQ ghi đè EYE_KIND (lid [trong, ngoài], ps cỡ đồng tử, gaze).
export const FACE_PRESETS = {
  smile: { brows: 'neutral', eyes: 'open', mouth: 'smile' },
  happy: { brows: 'raised', eyes: 'happy', mouth: 'open', extras: ['blush'] },
  laugh: { brows: 'raised', eyes: 'happy', mouth: 'laugh', extras: ['blush'], ms: 1.05 },
  grin: { brows: 'raised', eyes: 'open', mouth: 'grin', extras: ['blush'] },
  neutral: { brows: 'neutral', eyes: 'open', mouth: 'flat' },
  sad: { brows: 'worried', eyes: 'sad', mouth: 'frown', eyesQ: { gaze: [0, 0.35] } },
  worried: { brows: 'worried', eyes: 'open', mouth: 'wobble', ms: 0.72, eyesQ: { ps: 0.9, lid: [0.06, 0.16] } },
  scared: { brows: 'worried', eyes: 'wide', mouth: 'teeth_clench', extras: ['sweat'], eyesQ: { ps: 0.55 } },
  panic: { brows: 'worried', eyes: 'wide', mouth: 'scream', extras: ['sweat'], eyesQ: { ps: 0.48 }, saccade: false },
  surprised: { brows: 'raised', eyes: 'wide', mouth: 'o', eyesQ: { ps: 0.78 }, saccade: false },
  angry: { brows: 'angry', eyes: 'open', mouth: 'frown', eyesQ: { lid: [0.4, 0.12], ps: 0.9 } },
  sleepy: { brows: 'low', eyes: 'half', mouth: 'smallsmile', eyesQ: { lid: [0.58, 0.58], gaze: [0, 0.4] }, saccade: false },
  sleep: { brows: 'low', eyes: 'closed', mouth: 'smallsmile', saccade: false },
  cold: { brows: 'worried', eyes: 'squint', mouth: 'wobble', extras: ['cold_cheeks'], saccade: false },
  moved: { brows: 'worried', eyes: 'sad', mouth: 'smallsmile', extras: ['tears', 'blush', 'shine'], eyesQ: { lid: [0.06, 0.26], ps: 1.12, shine: true }, saccade: false },
  shy: { brows: 'worried', eyes: 'open', mouth: 'smallsmile', extras: ['blush'], eyesQ: { gaze: [0.5, 0.4] } },
};

// Chớp mắt tất định: 1 lần/ô 3.3 s ở vị trí băm, đôi khi chớp kép. Trả 0 (mở), 1 (lim dim), 2 (nhắm).
function blinkPhase(t, seed) {
  const P = 3.3, b = Math.floor(t / P);
  for (const k of [b, b - 1]) {
    const t0 = k * P + 0.25 + hash01(k, seed) * 2.6;
    const times = hash01(k, seed + 7) > 0.72 ? [t0, t0 + 0.28] : [t0];
    for (const s of times) { const d = t - s; if (d >= 0 && d < 0.14) return d < 0.035 || d > 0.105 ? 1 : 2; }
  }
  return 0;
}
// Đảo mắt nhẹ (saccade) tất định, lượng tử hoá để ít vẽ lại
function saccade(t, seed) {
  const P = 1.9, k = Math.floor(t / P + hash01(3, seed));
  if (hash01(k, seed + 11) < 0.45) return [0, 0];
  const q = (v) => Math.round(v * 10) / 10;
  return [q((hash01(k, seed + 13) - 0.5) * 0.7), q((hash01(k, seed + 17) - 0.5) * 0.3)];
}

// ---------- Khung xương & dựng nhân vật ----------
export function createR15(THREE, opts = {}) {
  const o = { ...R15_DEFAULTS, ...opts };
  if (o.textures) { o.outfitTexture ||= o.textures.outfit; o.outfitNormal ||= o.textures.outfitNormal; o.faceTexture ||= o.textures.face; }
  const seed = o.seed ?? strHash(o.name);
  const root = new THREE.Group(); root.name = o.name;
  const piv = (name, x, y, z, parent) => { const g = new THREE.Group(); g.name = name; g.position.set(x, y, z); parent.add(g); return g; };
  const meshes = [];
  const addMesh = (parent, geo, mat, name, { cast = true } = {}) => { const m = new THREE.Mesh(geo, mat); m.name = name; m.castShadow = cast; m.receiveShadow = true; parent.add(m); meshes.push(m); return m; };

  // --- vật liệu ---
  const skinMat = new THREE.MeshStandardMaterial({ color: o.skin, roughness: 0.58, metalness: 0 });
  let atlasCanvas = null, atlasTex;
  if (o.outfitTexture) atlasTex = o.outfitTexture;
  else { atlasCanvas = paintOutfit(o, seed); atlasTex = new THREE.CanvasTexture(atlasCanvas); atlasTex.colorSpace = THREE.SRGBColorSpace; atlasTex.anisotropy = 8; }
  const outfitMat = new THREE.MeshStandardMaterial({ map: atlasTex, normalMap: o.outfitNormal || null, roughness: 0.8, metalness: 0 });
  const mat = (c, rough = 0.8) => new THREE.MeshStandardMaterial({ color: c, roughness: rough, metalness: 0 });

  // --- khung ---
  const body = piv('body', 0, 0, 0, root);
  const hips = piv('LowerTorso', 0, 2.0, 0, body);           // khớp hông (y=2)
  const torso = piv('UpperTorso', 0, 0.4, 0, hips);          // eo (y=2.4)
  const head = piv('Head', 0, 1.6, 0, torso);                // cổ (y=4)
  const arm = {}, leg = {};
  for (const [side, sx] of [['Right', -1], ['Left', 1]]) {
    const up = piv(side + 'UpperArm', sx * 1.5, 1.2, 0, torso);   // vai (y=3.6)
    const lo = piv(side + 'LowerArm', 0, -0.6, 0, up);            // khuỷu (y=3.0)
    const hd = piv(side + 'Hand', 0, -0.6, 0, lo);                // cổ tay (y=2.4), bàn tay tới y=2.0
    arm[side] = { up, lo, hd };
    const th = piv(side + 'UpperLeg', sx * 0.5, 0, 0, hips);      // hông (y=2)
    const kn = piv(side + 'LowerLeg', 0, -1.0, 0, th);            // gối (y=1)
    const ft = piv(side + 'Foot', 0, -0.7, 0, kn);                // mắt cá (y=0.3)
    leg[side] = { th, kn, ft };
    const L = OUTFIT_LAYOUT.parts, D = R15_DIMS;
    const seg = (parent, key, dims, cy, { r = 0.1, wk = 1, ext = 0, z = 0, dk = 1 } = {}) => {
      if (o.body && o.body[key]) return addMesh(parent, projectBodyUV(THREE, o.body[key], L[key]), outfitMat, key);
      const [w, h, d] = dims; const geo = partGeometry(w * wk, h + ext, d * wk * dk, r, L[key]);
      geo.translate(0, cy + ext / 2, z); return addMesh(parent, geo, outfitMat, key);
    };
    seg(up, side + 'UpperArm', D.UpperArm, -0.1, { r: 0.13 });
    seg(lo, side + 'LowerArm', D.LowerArm, -0.3, { r: 0.11, wk: 0.94, ext: 0.12 });
    seg(hd, side + 'Hand', D.Hand, -0.2, { r: 0.13, wk: 0.9, ext: 0.06 });
    seg(th, side + 'UpperLeg', D.UpperLeg, -0.5, { r: 0.11 });
    seg(kn, side + 'LowerLeg', D.LowerLeg, -0.35, { r: 0.1, wk: 0.95, ext: 0.14 });
    seg(ft, side + 'Foot', D.Foot, -0.15, { r: 0.1, wk: 0.97, dk: 1.1, ext: 0.05, z: 0.07 });
  }
  {
    const L = OUTFIT_LAYOUT.parts, D = R15_DIMS;
    const B = o.body;
    let g1, g2;
    if (B && B.LowerTorso) g1 = projectBodyUV(THREE, B.LowerTorso, L.LowerTorso); else { g1 = partGeometry(...D.LowerTorso, 0.12, L.LowerTorso); g1.translate(0, 0.2, 0); }
    if (B && B.UpperTorso) g2 = projectBodyUV(THREE, B.UpperTorso, L.UpperTorso); else { g2 = partGeometry(...D.UpperTorso, 0.16, L.UpperTorso); g2.translate(0, 0.8, 0); }
    addMesh(hips, g1, outfitMat, 'LowerTorso_mesh'); addMesh(torso, g2, outfitMat, 'UpperTorso_mesh');
  }

  // --- đầu trụ bo + mảng mặt ---
  let headGeo;
  if (o.body && o.body.Head) {   // đầu tham chiếu (R≈0.6, đáy y=-0.1) → khớp biên dạng R=0.63, đáy y=0 của mảng mặt
    headGeo = o.body.Head.clone(); headGeo.computeBoundingBox(); const hb = headGeo.boundingBox;
    const k = HEAD.R / Math.max(0.01, (hb.max.x - hb.min.x) / 2); headGeo.translate(0, -hb.min.y, 0); headGeo.scale(k, HEAD.H / (hb.max.y - hb.min.y), k);
  } else headGeo = new THREE.LatheGeometry(headProfile(THREE), 56);
  const headMesh = addMesh(head, headGeo, skinMat, 'head_mesh');
  const neck = addMesh(head, new THREE.CylinderGeometry(0.36, 0.4, 0.2, 24), skinMat, 'neck'); neck.position.y = 0.02;
  const faceCanvas = canvas(FACE_PX, FACE_PX), fg = faceCanvas.getContext('2d');
  const faceTex = new THREE.CanvasTexture(faceCanvas); faceTex.colorSpace = THREE.SRGBColorSpace; faceTex.anisotropy = 8;
  const faceMat = new THREE.MeshStandardMaterial({ map: faceTex, transparent: true, roughness: 0.55, metalness: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const facePatch = addMesh(head, facePatchGeometry(THREE), faceMat, 'face', { cast: false });
  facePatch.renderOrder = 2;

  const hat = piv('hat', 0, 0, 0, head);
  const parts = {
    root, body, hips, torso, head, hat,
    rightArm: arm.Right.up, leftArm: arm.Left.up, rightElbow: arm.Right.lo, leftElbow: arm.Left.lo, rightHand: arm.Right.hd, leftHand: arm.Left.hd,
    rightLeg: leg.Right.th, leftLeg: leg.Left.th, rightKnee: leg.Right.kn, leftKnee: leg.Left.kn, rightFoot: leg.Right.ft, leftFoot: leg.Left.ft,
    // tên R15 đầy đủ
    Head: head, UpperTorso: torso, LowerTorso: hips,
    RightUpperArm: arm.Right.up, RightLowerArm: arm.Right.lo, RightHand: arm.Right.hd, LeftUpperArm: arm.Left.up, LeftLowerArm: arm.Left.lo, LeftHand: arm.Left.hd,
    RightUpperLeg: leg.Right.th, RightLowerLeg: leg.Right.kn, RightFoot: leg.Right.ft, LeftUpperLeg: leg.Left.th, LeftLowerLeg: leg.Left.kn, LeftFoot: leg.Left.ft,
  };

  // --- phụ kiện ---
  const acc = buildAccessories(THREE, { o, head, torso, hips, parts, addMesh, mat, seed });

  // --- mặt: ghép lớp, cache theo khoá trạng thái ---
  const faceImg = o.faceTexture ? (o.faceTexture.image || o.faceTexture) : null;
  const FP = { skin: o.skin, lashes: o.lashes, browThickness: o.browThickness, tired: o.tired, browColor: o.hair !== 'none' ? o.hairColor : INK };
  let faceKey = '', lastT = 0, lastPoseFace;
  const layer = (row, ms = 1, dy = 0) => { const s = CELL_SCALE * ms, cy = FACE_ROW[row] * FACE_PX + dy; fg.setTransform(s, 0, 0, s, FACE_PX / 2 - 128 * s, cy - 64 * s); };
  const sprite = (key) => { const rc = FACE_LAYOUT.sprites[key]; if (!rc || !faceImg) return false; fg.drawImage(faceImg, rc[0], rc[1], rc[2], rc[3], 0, 0, 256, 128); return true; };
  function drawFaceState(st) {
    fg.setTransform(1, 0, 0, 1, 0, 0); fg.clearRect(0, 0, FACE_PX, FACE_PX);
    const extras = st.extras;
    const under = extras.filter((e) => e === 'blush' || e === 'cold_cheeks' || e === 'freckles' || e === 'nose');
    for (const e of under) { layer(e); if (!sprite('extra.' + e)) drawExtraCell(fg, e, FP); }
    layer('brows', 1, st.browDy); if (!sprite('brows.' + st.brows)) drawBrowsCell(fg, st.brows, FP);
    layer('eyes'); if (!faceImg || !sprite('eyes.' + st.eyes)) drawEyesCell(fg, st.eyes, st.eyesQ, FP);
    else if (FP.lashes && st.eyes !== 'closed') { layer('eyelashes'); sprite('extra.eyelashes'); }
    layer('mouth', st.ms * 1.12); if (!sprite('mouth.' + st.mouth)) drawMouthCell(fg, st.mouth);
    for (const e of extras) if (!under.includes(e)) { layer(e); if (!sprite('extra.' + e)) drawExtraCell(fg, e, FP); }
    fg.setTransform(1, 0, 0, 1, 0, 0);
    faceTex.needsUpdate = true;
  }
  function faceAt(t, name = o.face, { blink = o.blink, gaze } = {}) {
    const pr = FACE_PRESETS[name] || FACE_PRESETS[{ sleepy: 'sleepy', panic: 'panic' }[name]] || FACE_PRESETS.smile;
    const eyesQ = { ...(pr.eyesQ || {}) };
    let eyes = pr.eyes;
    let gz = gaze || eyesQ.gaze || (pr.saccade === false ? [0, 0] : saccade(t, seed));
    if (eyes === 'look_up') gz = [gz[0], -1];
    eyesQ.gaze = gz;
    if (blink && OPENISH.has(eyes)) { const b = blinkPhase(t, seed); if (b === 2) eyes = 'closed'; else if (b === 1) { eyes = 'half'; eyesQ.lid = [0.62, 0.62]; } }
    const extras = [...(pr.extras || [])]; if (o.freckles) extras.unshift('freckles');
    const st = { brows: pr.brows, eyes, mouth: pr.mouth, extras, eyesQ, ms: pr.ms || 1, browDy: pr.browDy || 0 };
    const key = `${st.brows}|${eyes}|${st.mouth}|${extras.join(',')}|${JSON.stringify(eyesQ)}|${st.ms}`;
    if (key !== faceKey) { faceKey = key; drawFaceState(st); }
    return st;
  }

  const char = {
    parts, root, options: o, materials: { skin: skinMat, outfit: outfitMat, shirt: outfitMat, pants: outfitMat, face: faceMat, ...acc.materials },
    faceCanvas,
    // neo cho máy quay cận mặt: tâm đầu (head local)
    headCenter: [0, 0.6, 0], faceCenter: [0, 0.55, 0.64],
    // điểm cầm đồ trong bàn tay (hand local)
    handGrip: [0, -0.3, 0.12],
    setFace(expr) { o.face = expr; faceAt(lastT, expr); },
    faceAt,
    attach(part, obj, pos) {
      const p = parts[part] || parts.rightHand;
      const isHand = p === parts.rightHand || p === parts.leftHand;
      p.add(obj); obj.position.set(...(pos || (isHand ? char.handGrip : [0, -1.6, 0.6]))); return obj;
    },
    setColors({ skin: s, shirt, pants } = {}) {
      if (s) { o.skin = s; FP.skin = s; skinMat.color.set(s); faceKey = ''; }
      if (shirt) o.shirt = shirt; if (pants) o.pants = pants;
      if (atlasCanvas && (s || shirt || pants)) { const cv = paintOutfit(o, seed); atlasCanvas.getContext('2d').drawImage(cv, 0, 0); atlasTex.needsUpdate = true; }
      faceAt(lastT, o.face);
    },
    setHat(type, color = o.hatColor) { o.hat = type; o.hatColor = color; buildHat(THREE, hat, type, color, o); },
    apply(pose) { applyPose(parts, pose); acc.update(pose, pose, pose); },
    animate(name, t, opt = {}) {
      lastT = t;
      const pose = fullPose(name, t, opt);
      applyPose(parts, pose);
      if (acc.dynamic) acc.update(pose, fullPose(name, t - 0.07, opt), fullPose(name, t - 0.16, opt), name);
      if (pose.face !== lastPoseFace) { lastPoseFace = pose.face; if (pose.face) o.face = pose.face; }
      faceAt(t, o.face, { gaze: pose.gaze });
      return pose;
    },
  };
  root.userData.setFace = (f) => char.setFace(f);
  char.setHat(o.hat, o.hatColor);
  faceAt(0, o.face);
  applyPose(parts, {}); acc.update({}, {}, {});
  return char;
}

function fullPose(name, t, opt) {
  let pose = samplePose(name, t, opt);
  if (opt.from && opt.mix !== undefined && opt.mix < 1) pose = mixPose(samplePose(opt.from, opt.fromT ?? t, opt), pose, opt.mix);
  return pose;
}

// ---------- Mũ ----------
function buildHat(THREE, group, type, color, o) {
  while (group.children.length) { const c = group.children.pop(); c.traverse?.((m) => m.geometry?.dispose()); }
  group.position.set(0, 0, 0); group.scale.set(1, 1, 1); group.rotation.set(0, 0, 0);
  const shadow = (m) => { m.traverse((x) => { if (x.isMesh) { x.castShadow = true; x.receiveShadow = true; } }); return m; };
  if (type === 'beanie') {
    // gốc nhóm ở đỉnh đầu (để co giãn quanh đó); hình học dời xuống tương ứng
    group.position.y = 0.95;
    const knit = repTex(THREE, knitCanvas(color), 10, 2.2), knitCuff = repTex(THREE, knitCanvas(toHex(shade(color, -0.12))), 12, 1);
    const m = new THREE.MeshStandardMaterial({ map: knit, roughness: 0.95, color: '#ffffff' });
    const mc = new THREE.MeshStandardMaterial({ map: knitCuff, roughness: 0.95, color: '#ffffff' });
    const dome = new THREE.Mesh(lathe(THREE, domeProfile(0.672, 0.92, 0.94, 0.6, 2.6, 18).map(([r, y]) => [r, y - 0.95]), 48), m);
    dome.name = 'beanie_dome'; group.add(dome);
    // vành gập dày (2 mặt + mép bo)
    const prof = [[0.69, 0.9], [0.712, 0.91], [0.722, 0.97], [0.722, 1.08], [0.71, 1.13], [0.68, 1.14]].map(([r, y]) => [r, y - 0.95]);
    const cuff = new THREE.Mesh(lathe(THREE, prof, 48), mc); cuff.name = 'beanie_cuff'; group.add(cuff);
    // nút len nhỏ trên đỉnh
    const nub = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), m); nub.position.y = 1.54 - 0.95; nub.scale.y = 0.7; nub.name = 'beanie_nub'; group.add(nub);
    shadow(group);
    return;
  }
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.7 });
  if (type === 'cap') {
    const dome = new THREE.Mesh(lathe(THREE, domeProfile(0.67, 0.95, 0.98, 0.42, 2.4, 14), 40), m); group.add(dome);
    const brim = new THREE.Mesh(new RoundedBoxGeometry(1.0, 0.07, 0.6, 2, 0.03), m); brim.position.set(0, 1.0, 0.82); brim.rotation.x = 0.08; group.add(brim);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.675, 0.675, 0.08, 40, 1, true), new THREE.MeshStandardMaterial({ color: shade(color, -0.25), roughness: 0.8, side: THREE.DoubleSide })); band.position.y = 0.99; group.add(band);
  } else if (type === 'tophat') {
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.98, 0.98, 0.07, 40), m); brim.position.y = 1.14; group.add(brim);
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.62, 0.95, 40), m); crown.position.y = 1.64; group.add(crown);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.625, 0.63, 0.16, 40), new THREE.MeshStandardMaterial({ color: '#c0392b', roughness: 0.6 })); band.position.y = 1.26; group.add(band);
  }
  shadow(group);
}

// ---------- Tóc, bím, râu, khăn, váy, hoodie ----------
function buildAccessories(THREE, { o, head, torso, hips, parts, addMesh, mat, seed }) {
  const materials = {};
  const dyn = [];   // các hàm cập nhật phụ (nhận tín hiệu pose)
  const RB = (w, h, d, r = 0.08) => new RoundedBoxGeometry(w, h, d, 2, r);

  if (o.hair === 'braids' || o.hair === 'short') {
    const hm = new THREE.MeshStandardMaterial({ map: repTex(THREE, strandCanvas(o.hairColor, { seed: seed & 255 }), 6, 1), roughness: 0.5, color: '#ffffff' });
    const hmS = new THREE.MeshStandardMaterial({ map: repTex(THREE, strandCanvas(o.hairColor, { seed: seed & 255 }), 6, 1), roughness: 0.5, color: '#ffffff', side: THREE.DoubleSide });
    materials.hair = hm;
    addMesh(head, lathe(THREE, domeProfile(0.668, 0.9, 0.92, 0.42, 2.8, 16), 48), hm, 'hair_top');
    // tóc sau gáy + hai bên (chừa mặt)
    const back = [[0.665, 0.95], [0.672, 0.6], [0.69, 0.25], [0.66, 0.16]];
    addMesh(head, lathe(THREE, back, 36, 0.95, PI * 2 - 1.9), hmS, 'hair_back');
    // mái: dải cong ôm trán, lệch nhẹ một bên (rẽ ngôi)
    const fringe = addMesh(head, lathe(THREE, [[0.672, 0.84], [0.69, 0.86], [0.695, 0.95], [0.68, 1.0]], 30, -1.15, 2.3), hm, 'hair_fringe');
    fringe.rotation.z = -0.09; fringe.position.y = 0.02;
    if (o.hair === 'braids') {
      const tieM = mat('#d6322b', 0.6);
      const ball = new THREE.SphereGeometry(1, 18, 14);
      const braids = [];
      for (const sx of [-1, 1]) {
        const rootP = new THREE.Group(); rootP.name = 'braid_root'; rootP.position.set(sx * 0.6, 0.4, 0.3); head.add(rootP);
        let parent = rootP; const segs = [];
        for (let i = 0; i < 6; i++) {
          const p = new THREE.Group(); p.name = `braid_${sx < 0 ? 'R' : 'L'}${i}`; if (i) p.position.y = -0.235; parent.add(p);
          const k = 1 - i * 0.045;
          const lump = addMesh(p, ball, hm, 'braid'); lump.position.set(((i % 2) ? 0.03 : -0.03) * sx, -0.13, 0); lump.scale.set(0.15 * k, 0.17, 0.14 * k);
          lump.rotation.z = (i % 2 ? 0.45 : -0.45);
          segs.push(p); parent = p;
        }
        const tie = addMesh(parent, new THREE.CylinderGeometry(0.085, 0.085, 0.08, 16), tieM, 'braid_tie'); tie.position.y = -0.29;
        const tuft = addMesh(parent, new THREE.ConeGeometry(0.12, 0.26, 14), hm, 'braid_tuft'); tuft.position.y = -0.44; tuft.rotation.x = PI;
        braids.push({ sx, segs });
      }
      const REST = [-0.95, -0.55, -0.25, -0.1, 0.0, 0.03];
      dyn.push((p0, p1, p2, sig) => {
        for (const { sx, segs } of braids) {
          let prev = 0, prevZ = 0;
          for (let i = 0; i < segs.length; i++) {
            const g = 0.25 + 0.15 * i;                         // bù trọng lực tăng dần về ngọn
            const lag = i < 2 ? sig.dP1 : sig.dP2;             // trễ: dùng pose ở t−0.07 / t−0.16
            let th = REST[i] - g * sig.P + (0.5 + 0.25 * i) * lag + (0.25 + 0.1 * i) * sig.dY * 3 - sig.drag * (0.1 + 0.05 * i);
            th = Math.min(th, REST[i] + 0.12 - sig.headRel);     // không lật vào ngực
            th = Math.max(th, -1.5);
            let tz = -g * sig.R * 0.9 + (0.4 + 0.2 * i) * (i < 2 ? sig.dR1 : sig.dR2) - sig.yawLag * 0.25;
            tz = clamp(tz, -0.6, 0.6);
            if (sx < 0) tz = Math.max(tz, -0.25 - 0.05 * i); else tz = Math.min(tz, 0.25 + 0.05 * i); // không chui vào cổ
            segs[i].rotation.set(th - prev, 0, tz - prevZ);
            prev = th; prevZ = tz;
          }
        }
      });
    }
  }

  if (o.beard) {
    const bm = new THREE.MeshStandardMaterial({ map: repTex(THREE, strandCanvas(o.beard, { tip: true, seed: 9 }), 2, 1), roughness: 0.85, color: '#ffffff' });
    materials.beard = bm;
    const ball = new THREE.SphereGeometry(1, 20, 16);
    const blob = (parent, name, [x, y, z], [sx, sy, sz], rz = 0) => { const m = addMesh(parent, ball, bm, name); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.rotation.z = rz; return m; };
    // tóc mai + má: vỏ cong ôm hai bên đầu (chừa mắt & miệng)
    for (const sx of [-1, 1]) {
      const shell = addMesh(head, lathe(THREE, [[0.56, 0.03], [0.65, 0.1], [0.666, 0.28], [0.652, 0.45], [0.635, 0.52]], 14, sx < 0 ? -1.5 : 0.58, 0.92), bm, 'beard_side');
      shell.material = bm;
      blob(head, 'beard_mustache', [sx * 0.13, 0.375, 0.635], [0.15, 0.05, 0.07], sx * 0.3);
    }
    blob(head, 'beard_chin', [0, 0.07, 0.5], [0.46, 0.11, 0.2]);
    const b0 = new THREE.Group(); b0.name = 'beard_pivot'; b0.position.set(0, 0.11, 0.6); head.add(b0);
    const sizes = [[0.42, 0.3, 0.19], [0.34, 0.3, 0.16], [0.2, 0.28, 0.12]];
    const segs = []; let parent = b0;
    sizes.forEach(([w, h, d], i) => {
      const p = new THREE.Group(); p.name = 'beard_seg' + i; if (i) p.position.set(0, -0.3, 0.0); parent.add(p);
      blob(p, 'beard', [0, -h * 0.5, 0.04], [w, h, d]);
      if (i < 2) for (const sx of [-1, 1]) blob(p, 'beard', [sx * w * 0.55, -h * 0.75, 0.0], [w * 0.45, h * 0.8, d * 0.85], sx * 0.2);
      segs.push(p); parent = p;
    });
    dyn.push((p0, p1, p2, sig) => {
      let prev = 0;
      for (let i = 0; i < segs.length; i++) {
        let th = -0.06 - (0.2 + 0.15 * i) * sig.P + (0.4 + 0.2 * i) * (i ? sig.dP2 : sig.dP1) + 0.35 * sig.dY * 3;
        th = Math.min(th, 0.02 - sig.headRel * (i ? 1 : 0.6)); th = Math.max(th, -1.2);
        segs[i].rotation.set(th - prev, 0, (-0.3 * sig.R + 0.4 * sig.dR2) * (i + 1) / 3 - (i ? segs[i - 1].rotation.z : 0) * 0);
        prev = th;
      }
    });
  }

  if (o.scarf) {
    const sm = mat(o.scarf, 0.75); materials.scarf = sm;
    const ring = addMesh(torso, new THREE.TorusGeometry(0.5, 0.1, 10, 32), sm, 'scarf'); ring.rotation.x = PI / 2; ring.position.set(0, 1.62, 0.02); ring.scale.set(1.05, 0.9, 1);
    const knot = addMesh(torso, RB(0.2, 0.17, 0.14, 0.06), sm, 'scarf_knot'); knot.position.set(0, 1.5, 0.56);
    for (const sx of [-1, 1]) {
      const loop = addMesh(torso, new THREE.TorusGeometry(0.1, 0.045, 8, 16), sm, 'scarf_bow'); loop.position.set(sx * 0.19, 1.52, 0.56); loop.scale.set(1.35, 0.95, 1); loop.rotation.z = sx * 0.3;
    }
    const tails = [];
    for (const sx of [-1, 1]) {
      const p = new THREE.Group(); p.name = 'scarf_tail'; p.position.set(sx * 0.07, 1.46, 0.62); torso.add(p);
      const m = addMesh(p, RB(0.15, 0.48, 0.06, 0.03), sm, 'scarf_tail_mesh'); m.position.y = -0.22; p.rotation.z = sx * 0.22;
      tails.push({ p, sx });
    }
    dyn.push((p0, p1, p2, sig) => {
      for (const { p, sx } of tails) p.rotation.set(Math.min(-0.08, -0.6 * sig.Pt + 0.6 * sig.dPt), 0, sx * 0.22 - 0.5 * sig.Rt + 0.6 * sig.dRt);
    });
  }

  if (o.hoodie) {
    const hoodM = mat(o.shirt, 0.85), strM = mat(o.hoodie, 0.7), tipM = mat('#e9e2d0', 0.5);
    materials.hood = hoodM;
    // cổ mũ trùm (vòng sau gáy) + túi mũ nằm trên lưng
    const hood = addMesh(torso, new THREE.TorusGeometry(0.74, 0.15, 12, 28, PI * 1.08), hoodM, 'hood');
    hood.rotation.set(PI / 2, 0, PI * 0.96); hood.position.set(0, 1.62, 0.0); hood.scale.set(1.05, 0.9, 0.85);
    const pouch = addMesh(torso, RB(1.15, 0.62, 0.26, 0.12), hoodM, 'hood_pouch'); pouch.position.set(0, 1.3, -0.6); pouch.rotation.x = 0.22;
    const strings = [];
    for (const sx of [-1, 1]) {
      const p = new THREE.Group(); p.name = 'hoodie_string'; p.position.set(sx * 0.22, 1.42, 0.53); torso.add(p);
      const s = addMesh(p, RB(0.07, 0.62, 0.05, 0.02), strM, 'hoodie_string_mesh'); s.position.y = -0.31;
      const tip = addMesh(p, RB(0.09, 0.12, 0.07, 0.03), tipM, 'hoodie_aglet'); tip.position.y = -0.66;
      strings.push(p);
    }
    dyn.push((p0, p1, p2, sig) => {
      strings.forEach((p, i) => p.rotation.set(Math.min(-0.03, -0.85 * sig.Pt + 0.9 * sig.dPt + 0.8 * sig.dY - 0.04), 0, -0.8 * sig.Rt + 0.9 * sig.dRt + (i ? 0.03 : -0.03)));
    });
  }

  // --- váy dài: ống lofted theo trục trung bình của 2 chân (không xuyên chân) ---
  let skirt = null;
  if (o.skirt) {
    const NA = 44, LV = [-0.42, -0.22, 0.0, 0.2, 0.42, 0.66, 0.9, 1.14, 1.36, 1.5];
    const NR = LV.length;
    const pos = new Float32Array((NA + 1) * NR * 3), uv = [], idx = [];
    for (let j = 0; j < NR; j++) for (let i = 0; i <= NA; i++) uv.push(i / NA, 1 - j / (NR - 1));
    for (let j = 0; j < NR - 1; j++) for (let i = 0; i < NA; i++) { const a = j * (NA + 1) + i, b = a + 1, c = a + NA + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx);
    const sm = new THREE.MeshStandardMaterial({ map: repTex(THREE, clothCanvas(o.skirt), 1, 1), roughness: 0.85, side: THREE.DoubleSide });
    materials.skirt = sm;
    const mesh = addMesh(hips, geo, sm, 'skirt'); mesh.frustumCulled = false;
    const q1 = new THREE.Quaternion(), q2 = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), w = new THREE.Vector3();
    const legPt = (side, s, out) => {
      const th = parts[side + 'Leg'], kn = parts[side + 'Knee'];
      if (s <= 0) return out.set(th.position.x, -s, 0);
      q1.setFromEuler(th.rotation);
      if (s <= 1) return out.set(0, -s, 0).applyQuaternion(q1).add(th.position);
      q2.setFromEuler(kn.rotation);
      w.set(0, -(s - 1), 0).applyQuaternion(q2); w.y -= 1;
      return out.copy(w).applyQuaternion(q1).add(th.position);
    };
    const PR = LV.map(() => new THREE.Vector3()), PL = LV.map(() => new THREE.Vector3()), CC = LV.map(() => new THREE.Vector3());
    const T = new THREE.Vector3(), F = new THREE.Vector3(), X = new THREE.Vector3(1, 0, 0), X2 = new THREE.Vector3(), dlt = new THREE.Vector3();
    skirt = () => {
      for (let j = 0; j < NR; j++) { legPt('right', LV[j], PR[j]); legPt('left', LV[j], PL[j]); CC[j].addVectors(PR[j], PL[j]).multiplyScalar(0.5); CC[j].x = 0; }
      let k = 0;
      for (let j = 0; j < NR; j++) {
        const s = LV[j];
        if (s <= 0) T.set(0, -1, 0);
        else { T.subVectors(CC[Math.min(NR - 1, j + 1)], CC[Math.max(0, j - 1)]).normalize(); if (s < 0.25) T.lerp(v.set(0, -1, 0), 0.5).normalize(); }
        F.crossVectors(T, X).normalize(); X2.crossVectors(F, T).normalize();
        dlt.subVectors(PR[j], PL[j]);
        const sp = Math.max(0, s);
        const a = (s < 0 ? 1.07 + 0.12 * (s + 0.42) / 0.42 : 1.19 + 0.06 * sp) + Math.max(0, Math.abs(dlt.dot(X2)) - 1) / 2;
        const b = (s < 0 ? 0.57 + 0.1 * (s + 0.42) / 0.42 : 0.67 + 0.05 * sp) + Math.abs(dlt.dot(F)) / 2;
        const fold = 0.022 * clamp01(s / 0.6);
        for (let i = 0; i <= NA; i++) {
          const ph = (i / NA) * PI * 2, c = C(ph), sn = S(ph), n = 4;
          const ex = Math.sign(c) * Math.pow(Math.abs(c), 2 / n), ef = Math.sign(sn) * Math.pow(Math.abs(sn), 2 / n);
          const wob = 1 + fold * S(ph * 12);
          pos[k++] = CC[j].x + X2.x * a * ex * wob + F.x * b * ef * wob;
          pos[k++] = CC[j].y + X2.y * a * ex * wob + F.y * b * ef * wob;
          pos[k++] = CC[j].z + X2.z * a * ex * wob + F.z * b * ef * wob;
        }
      }
      geo.attributes.position.needsUpdate = true; geo.computeVertexNormals();
    };
  }

  // tín hiệu góc "gần thế giới" của đầu/thân từ pose (thuần, không trạng thái)
  const sigOf = (p) => {
    const b = p.body || {}, h = p.hips || {}, tr = p.torso || {}, hd = p.head || {};
    return {
      P: (b.rx || 0) + (h.x || 0) + (tr.x || 0) + (hd.x || 0), R: (b.rz || 0) + (h.z || 0) + (tr.z || 0) + (hd.z || 0) + (b.x || 0) * 0.6,
      Y: (b.y || 0), yaw: (b.ry || 0) + (h.y || 0) + (tr.y || 0) + (hd.y || 0),
      Pt: (b.rx || 0) + (h.x || 0) + (tr.x || 0), Rt: (b.rz || 0) + (h.z || 0) + (tr.z || 0) + (b.x || 0) * 0.6, headRel: hd.x || 0,
    };
  };
  const hatGroup = parts.hat;
  const update = (p0, p1, p2, name) => {
    if (skirt) skirt();
    if (!dyn.length && !(o.hat === 'beanie')) return;
    const a = sigOf(p0), b = sigOf(p1), c = sigOf(p2);
    const sig = {
      P: a.P, R: a.R, Pt: a.Pt, Rt: a.Rt, headRel: a.headRel,
      dP1: b.P - a.P, dP2: c.P - a.P, dR1: b.R - a.R, dR2: c.R - a.R, dPt: b.Pt - a.Pt, dRt: b.Rt - a.Rt,
      dY: a.Y - b.Y, yawLag: c.yaw - a.yaw,
      drag: name === 'run' ? 0.5 : name === 'walk' ? 0.15 : 0,
    };
    for (const f of dyn) f(p0, p1, p2, sig);
    if (o.hat === 'beanie' && hatGroup.children.length) {   // co giãn nhẹ khi đầu chuyển động nhanh
      const w = Math.min(1, Math.abs(sig.dP1) * 2 + Math.abs(sig.dR1) * 2 + Math.abs(sig.dY) * 2.5);
      const sq = 1 - 0.06 * w * Math.sign(sig.dY || 1);
      hatGroup.scale.set(1 + (1 - sq) * 0.5, sq, 1 + (1 - sq) * 0.5);
      hatGroup.rotation.set(clamp(sig.dP1 * 0.25, -0.04, 0.04), 0, clamp(sig.dR1 * 0.25, -0.04, 0.04));
    }
  };
  return { materials, update, dynamic: dyn.length > 0 || o.hat === 'beanie' };
}

// ---------- Hệ thống pose ----------
const JOINTS = ['hips', 'torso', 'head', 'rightArm', 'leftArm', 'rightElbow', 'leftElbow', 'rightHand', 'leftHand',
  'rightLeg', 'leftLeg', 'rightKnee', 'leftKnee', 'rightFoot', 'leftFoot'];
export function applyPose(parts, pose) {
  for (const j of JOINTS) { const r = pose[j] || {}; parts[j].rotation.set(r.x || 0, r.y || 0, r.z || 0); }
  const b = pose.body || {};
  parts.body.position.set(b.x || 0, b.y || 0, b.z || 0);
  parts.body.rotation.set(b.rx || 0, b.ry || 0, b.rz || 0);
}
export function mixPose(a, b, w) {
  const out = {};
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (k === 'face' || k === 'gaze') { out[k] = w < 0.5 ? a[k] : b[k]; continue; }
    const pa = a[k] || {}, pb = b[k] || {}, sub = {};
    for (const c of new Set([...Object.keys(pa), ...Object.keys(pb)])) sub[c] = (pa[c] || 0) * (1 - w) + (pb[c] || 0) * w;
    out[k] = sub;
  }
  return out;
}
export function samplePose(name, t, opt = {}) {
  const fn = R15_ANIMATIONS[name];
  if (!fn) throw new Error(`R15: không có animation "${name}". Có: ${Object.keys(R15_ANIMATIONS).join(', ')}`);
  return fn(t, opt);
}

// Đặt chân lên sàn: tính độ cao đế giày thấp nhất (giải tích, mặt phẳng dọc) → bù body.y.
const LEG = { thigh: 1.0, shin: 0.7, foot: 0.3, half: 0.55 };
export function soleHeight(p, side) {
  const h = p.hips || {}, L = p[side + 'Leg'] || {}, K = p[side + 'Knee'] || {}, F = p[side + 'Foot'] || {};
  const sx = side === 'right' ? -0.5 : 0.5;
  const hipY = 2.0 + sx * S(h.z || 0);
  const cz = C((h.z || 0) + (L.z || 0));
  const a1 = (h.x || 0) + (L.x || 0), a2 = a1 + (K.x || 0), a3 = a2 + (F.x || 0);
  const ankle = hipY - (LEG.thigh * C(a1) + LEG.shin * C(a2)) * cz;
  return ankle - (LEG.foot * C(a3) + LEG.half * Math.abs(S(a3))) * cz;
}
function ground(p, lift = 0) {
  const low = Math.min(soleHeight(p, 'right'), soleHeight(p, 'left'));
  p.body = { ...(p.body || {}) }; p.body.y = (p.body.y || 0) - low + lift;
  return p;
}
// góc bàn chân để bàn chân phẳng (tuyệt đối = pitch)
const flatFoot = (p, side, pitch = 0) => { const a2 = (p.hips?.x || 0) + (p[side + 'Leg']?.x || 0) + (p[side + 'Knee']?.x || 0); p[side + 'Foot'] = { ...(p[side + 'Foot'] || {}), x: pitch - a2 }; };
const bump = (x, c, w, per = 44) => { let d = ((x - c) % per + per * 1.5) % per - per / 2; return Math.exp(-(d / w) * (d / w)); };
// fwjelaa R6_Walk: chân chịu lực trượt lùi đều, pha vung là đường Hermite cùng vận tốc (độ)
function legSwing(u, split = 28) {
  const s0 = S(split * PI / 180), STEP = 22;
  u = ((u % 44) + 44) % 44;
  let s;
  if (u <= STEP) s = s0 - 2 * s0 * u / STEP;
  else { const k = (u - STEP) / STEP, m = -2 * s0; s = (2 * k ** 3 - 3 * k ** 2 + 1) * -s0 + (k ** 3 - 2 * k ** 2 + k) * m + (-2 * k ** 3 + 3 * k ** 2) * s0 + (k ** 3 - k ** 2) * m; }
  return Math.asin(clamp(s, -1, 1));
}
// tư thế ngồi (hông ở y≈0.5 như R6 sit: body.y=-1.5): đùi chếch lên, cẳng chân thả, bàn chân phẳng
function sitLegs(p, { spread = 0.06, up = 0.35, shin = 0.45 } = {}) {
  p.body = { ...(p.body || {}), y: -1.5 };
  for (const [side, sx] of [['right', -1], ['left', 1]]) {
    const a1 = -(PI / 2 + up);
    p[side + 'Leg'] = { x: a1, z: sx * spread };
    p[side + 'Knee'] = { x: -shin - a1 };
    p[side + 'Foot'] = { x: shin };
  }
  return p;
}
const relaxedArms = (t, k = 1) => {
  const b = S(t * 1.7);
  return {
    rightArm: { x: 0.04, z: -0.08 - 0.02 * b * k }, leftArm: { x: 0.04, z: 0.08 + 0.02 * b * k },
    rightElbow: { x: -0.16 - 0.03 * b * k }, leftElbow: { x: -0.16 - 0.03 * b * k },
    rightHand: { x: -0.05 }, leftHand: { x: -0.05 },
  };
};

export const R15_ANIMATIONS = {
  idle: (t) => {
    const b = S(t * 1.7), s = S(t * 0.55);
    const kn = 0.07, kr = kn + 0.04 * Math.max(0, s), kl = kn + 0.04 * Math.max(0, -s);
    const p = {
      hips: { z: 0.025 * s, y: 0.02 * S(t * 0.4) },
      rightLeg: { x: -kr * 0.5, z: -0.025 * s - 0.015 }, leftLeg: { x: -kl * 0.5, z: -0.025 * s + 0.015 },
      rightKnee: { x: kr }, leftKnee: { x: kl },
      torso: { x: 0.018 * b, z: -0.022 * s }, head: { x: -0.012 * b, y: 0.06 * S(t * 0.6), z: 0.01 * s },
      ...relaxedArms(t),
    };
    flatFoot(p, 'right'); flatFoot(p, 'left');
    return ground(p);
  },

  walk: (t, o = {}) => {
    const sp = o.speed ?? 1.6, k = (o.amp ?? 0.75) / 0.75;
    const u = frac(t * sp) * 44, w = (2 * PI) / 44;
    const knee = (uu) => 0.06 + 0.2 * bump(uu, 5, 4) + 0.28 * bump(uu, 19, 4) + 1.0 * bump(uu, 30, 7.5);
    const pitch = (uu) => -0.22 * bump(uu, 1, 3.5) + 0.38 * bump(uu, 20, 3.2) + 0.12 * bump(uu, 28, 4) - 0.18 * bump(uu, 41, 3);
    const arm = 0.5 * k * C(w * (u - 3));
    const hy = 0.07 * k * C(w * u), hz = 0.045 * k * S(w * u);
    const ty = -0.1 * k * C(w * (u - 3)) - hy;
    const p = {
      hips: { y: hy, z: hz },
      torso: { x: 0.06 + 0.02 * C(2 * w * (u - 5)), y: ty, z: -hz * 0.8 },
      head: { x: -0.04 + 0.015 * C(2 * w * (u - 8)), y: -(hy + ty), z: -hz * 0.25 },
      rightLeg: { x: -legSwing(u, 28 * k), z: -hz }, leftLeg: { x: -legSwing(u + 22, 28 * k), z: -hz },
      rightKnee: { x: knee(u) * k }, leftKnee: { x: knee(u + 22) * k },
      rightArm: { x: arm, z: -0.08 - 0.02 * S(w * u) }, leftArm: { x: -arm, z: 0.08 - 0.02 * S(w * u) },
      rightElbow: { x: -(0.22 + 0.45 * Math.max(0, -C(w * (u - 5))) * k) }, leftElbow: { x: -(0.22 + 0.45 * Math.max(0, C(w * (u - 5))) * k) },
      rightHand: { x: -0.08 }, leftHand: { x: -0.08 },
    };
    flatFoot(p, 'right', pitch(u)); flatFoot(p, 'left', pitch(u + 22));
    return ground(p);
  },

  run: (t, o = {}) => {
    const sp = o.speed ?? 2.6, k = (o.amp ?? 1.1) / 1.1;
    const ph = t * sp * PI * 2, s = S(ph);
    const kneeOf = (q) => 0.35 + 1.45 * Math.pow(Math.max(0, C(q + 0.45)), 1.3);
    const p = {
      hips: { x: 0.08, y: 0.1 * s * k },
      torso: { x: 0.2, y: -0.16 * s * k, z: 0 },
      head: { x: -0.22, y: 0.06 * s },
      rightLeg: { x: -(0.25 + 0.85 * s) * k }, leftLeg: { x: -(0.25 - 0.85 * s) * k },
      rightKnee: { x: kneeOf(ph) * k }, leftKnee: { x: kneeOf(ph + PI) * k },
      rightArm: { x: 0.85 * s * k - 0.15, z: -0.12 }, leftArm: { x: -0.85 * s * k - 0.15, z: 0.12 },
      rightElbow: { x: -1.35 - 0.25 * s }, leftElbow: { x: -1.35 + 0.25 * s },
      rightHand: { x: -0.1 }, leftHand: { x: -0.1 },
    };
    flatFoot(p, 'right', 0.25 * Math.max(0, -s) - 0.1); flatFoot(p, 'left', 0.25 * Math.max(0, s) - 0.1);
    return ground(p, 0.22 * (1 + C(2 * ph)) / 2 * k);
  },

  // nhảy lặp chu kỳ: lấy đà (gối gập) → bật → đỉnh → chạm đất → hồi
  jump: (t, o = {}) => {
    const per = o.period ?? 1, H = o.height ?? 2.2, q = frac(t / per);
    const air = clamp01((q - 0.18) / 0.62), inAir = q > 0.18 && q < 0.8;
    const crouch = q < 0.18 ? S((q / 0.18) * PI / 2) : q > 0.8 ? S((1 - (q - 0.8) / 0.2) * PI / 2) * 0.8 : 0;
    const tuck = inAir ? S(air * PI) * 0.5 : 0;
    const p = {
      hips: { x: crouch * 0.3 },
      torso: { x: crouch * 0.25 - tuck * 0.1 },
      rightLeg: { x: -crouch * 0.9 - tuck * 0.5 }, leftLeg: { x: -crouch * 0.9 - tuck * 0.4 },
      rightKnee: { x: crouch * 1.5 + tuck * 0.9 }, leftKnee: { x: crouch * 1.5 + tuck * 0.8 },
      rightArm: { x: crouch * 0.6, z: inAir ? -2.7 : -0.3 }, leftArm: { x: crouch * 0.6, z: inAir ? 2.7 : 0.3 },
      rightElbow: { x: -0.3 }, leftElbow: { x: -0.3 },
    };
    flatFoot(p, 'right', tuck * 0.3); flatFoot(p, 'left', tuck * 0.3);
    return ground(p, inAir ? 4 * H * air * (1 - air) : 0);
  },

  fall: (t) => {
    const p = {
      torso: { x: -0.15 }, head: { x: -0.2 },
      rightArm: { z: -2.5 + S(t * 14) * 0.35, x: -0.3 }, leftArm: { z: 2.5 + S(t * 14 + 1) * 0.35, x: -0.3 },
      rightElbow: { x: -0.5 - 0.3 * S(t * 14) }, leftElbow: { x: -0.5 - 0.3 * S(t * 14 + 1) },
      rightLeg: { x: -0.5 + S(t * 12) * 0.3, z: -0.25 }, leftLeg: { x: -0.3 - S(t * 12) * 0.3, z: 0.25 },
      rightKnee: { x: 0.8 + 0.3 * S(t * 12) }, leftKnee: { x: 0.9 - 0.3 * S(t * 12) },
      face: 'scared',
    };
    return p;
  },

  wave: (t) => {
    const p = R15_ANIMATIONS.idle(t), w = S(t * 9);
    p.torso = { ...p.torso, z: (p.torso.z || 0) + 0.05 };
    p.rightArm = { x: -0.25, z: -2.45 };
    p.rightElbow = { x: -0.35, z: -0.25 + 0.45 * w };
    p.rightHand = { z: 0.25 * S(t * 9 - 0.7) };
    p.head = { ...p.head, z: 0.06 };
    p.face = 'happy';
    return p;
  },

  point: (t) => {
    const p = R15_ANIMATIONS.idle(t);
    p.torso = { ...p.torso, y: 0.12 }; p.head = { ...p.head, y: -0.12 };
    p.rightArm = { x: -PI / 2 + 0.04, z: -0.04 }; p.rightElbow = { x: -0.04 }; p.rightHand = { x: 0 };
    return p;
  },

  sit: (t) => {
    const b = S(t * 1.6);
    const p = sitLegs({});
    p.torso = { x: 0.06 + 0.015 * b }; p.head = { x: -0.02, y: 0.05 * S(t * 0.5) };
    p.rightArm = { x: -0.42, z: 0.12 }; p.leftArm = { x: -0.42, z: -0.12 };
    p.rightElbow = { x: -0.75 }; p.leftElbow = { x: -0.75 }; p.rightHand = { x: 0.2 }; p.leftHand = { x: 0.2 };
    return p;
  },

  scared: (t) => {
    const j = S(t * 45) * 0.03;
    const p = {
      body: { x: j },
      hips: { x: 0.12 },
      torso: { x: -0.22 }, head: { x: -0.05, z: j },
      rightLeg: { x: -0.35, z: -0.06 }, leftLeg: { x: -0.3, z: 0.06 }, rightKnee: { x: 0.5 }, leftKnee: { x: 0.45 },
      rightArm: { x: -1.75, z: 0.28 }, leftArm: { x: -1.75, z: -0.28 },
      rightElbow: { x: -1.5 + j * 3 }, leftElbow: { x: -1.5 - j * 3 }, rightHand: { x: 0.3 }, leftHand: { x: 0.3 },
      face: 'scared',
    };
    flatFoot(p, 'right'); flatFoot(p, 'left');
    return ground(p);
  },

  cheer: (t) => {
    const q = frac(t * 1.25), h = S(q * PI * 2), w = S(t * 15);
    const crouch = Math.max(0, -h), tuck = Math.max(0, h);
    const p = {
      hips: { x: crouch * 0.15 }, torso: { x: -0.08 + crouch * 0.1 }, head: { x: -0.18 },
      rightLeg: { x: -crouch * 0.45 - tuck * 0.25 }, leftLeg: { x: -crouch * 0.45 - tuck * 0.15 },
      rightKnee: { x: crouch * 0.8 + tuck * 0.5 }, leftKnee: { x: crouch * 0.8 + tuck * 0.4 },
      rightArm: { x: -0.2, z: -2.55 + w * 0.12 }, leftArm: { x: -0.2, z: 2.55 - w * 0.12 },
      rightElbow: { x: -0.3 - 0.25 * w }, leftElbow: { x: -0.3 + 0.25 * w },
      face: 'happy',
    };
    flatFoot(p, 'right', tuck * 0.35); flatFoot(p, 'left', tuck * 0.35);
    return ground(p, 0.45 * tuck);
  },

  dance: (t) => {
    const b = t * PI * 2 * 1.2, s = S(b), up = s > 0;
    const p = {
      hips: { z: 0.08 * s, y: 0.15 * S(b / 2) }, torso: { y: 0.25 * S(b / 2), z: -0.1 * s }, head: { z: 0.15 * s, y: -0.15 * S(b / 2) },
      rightArm: { z: up ? -2.6 : -0.5, x: -0.2 }, leftArm: { z: up ? 0.5 : 2.6, x: -0.2 },
      rightElbow: { x: up ? -0.3 : -1.4 }, leftElbow: { x: up ? -1.4 : -0.3 },
      rightLeg: { x: -0.3 * Math.max(0, s), z: -0.08 * s - 0.08 }, leftLeg: { x: -0.3 * Math.max(0, -s), z: -0.08 * s + 0.08 },
      rightKnee: { x: 0.25 + 0.5 * Math.max(0, s) }, leftKnee: { x: 0.25 + 0.5 * Math.max(0, -s) },
      face: 'happy',
    };
    flatFoot(p, 'right'); flatFoot(p, 'left');
    return ground(p);
  },

  lookAround: (t) => {
    const p = R15_ANIMATIONS.idle(t);
    p.head = { ...p.head, y: S(t * 1.4) * 0.75 }; p.torso = { ...p.torso, y: S(t * 1.4 - 0.4) * 0.18 };
    p.gaze = [Math.round(S(t * 1.4 + 0.3) * 5) / 10, 0];
    p.face = 'neutral';
    return p;
  },

  // ngã sấp về trước rồi nằm im (không lặp), t từ lúc bắt đầu ngã
  faint: (t) => {
    const k = ease(clamp01(t / 0.7)), buckle = S(PI * clamp01(t / 0.7));
    return {
      body: { rx: k * PI / 2, y: k * 0.5 - buckle * 0.25 },
      torso: { x: buckle * 0.2 }, head: { x: -k * 0.2 },
      rightLeg: { x: -buckle * 0.3 }, leftLeg: { x: -buckle * 0.25 }, rightKnee: { x: buckle * 0.7 }, leftKnee: { x: buckle * 0.6 },
      rightArm: { z: -k * 0.5, x: -k * 0.3 }, leftArm: { z: k * 0.5, x: -k * 0.3 }, rightElbow: { x: -0.3 }, leftElbow: { x: -0.3 },
      face: 'sleepy',
    };
  },

  // ngồi xổm run sợ, ôm đầu
  cower: (t) => {
    const j = S(t * 40) * 0.03;
    const p = {
      body: { x: j }, hips: { x: 0.25 }, torso: { x: 0.45 }, head: { x: 0.1 },
      rightLeg: { x: -1.85, z: -0.12 }, leftLeg: { x: -1.85, z: 0.12 }, rightKnee: { x: 2.3 }, leftKnee: { x: 2.3 },
      rightArm: { x: -2.75, z: 0.45 }, leftArm: { x: -2.75, z: -0.45 }, rightElbow: { x: -1.5 + j * 2 }, leftElbow: { x: -1.5 - j * 2 },
      face: 'scared',
    };
    flatFoot(p, 'right'); flatFoot(p, 'left');
    return ground(p);
  },

  // nằm ngủ (dùng kèm root xoay nằm): tay xuôi, thở
  lie: (t) => {
    const b = S(t * 1.2);
    return {
      body: { y: b * 0.02 }, torso: { x: -0.02 * b }, head: { x: -0.05, z: 0.08 },
      rightArm: { z: -0.12, x: -0.05 }, leftArm: { z: 0.12, x: -0.05 }, rightElbow: { x: -0.25 }, leftElbow: { x: -0.25 },
      rightLeg: { x: -0.05, z: -0.04 }, leftLeg: { x: -0.08, z: 0.04 }, rightKnee: { x: 0.12 }, leftKnee: { x: 0.18 },
      rightFoot: { x: 0.35 }, leftFoot: { x: 0.3 },
      face: 'sleep',
    };
  },

  // run rẩy vì lạnh: tự ôm người, gối khép
  shiver: (t) => {
    const j = S(t * 50) * 0.035, j2 = S(t * 43 + 1) * 0.04;
    const p = {
      body: { x: j }, hips: { x: 0.05 },
      torso: { x: 0.16, z: j * 0.5 }, head: { x: 0.12, z: -j },
      rightArm: { x: -0.7 + j2, z: 0.5 }, leftArm: { x: -0.7 - j2, z: -0.5 },
      rightElbow: { x: -1.85 }, leftElbow: { x: -1.75 }, rightHand: { x: 0.2, z: 0.3 }, leftHand: { x: 0.2, z: -0.3 },
      rightLeg: { x: -0.12, z: 0.05 }, leftLeg: { x: -0.12, z: -0.05 }, rightKnee: { x: 0.24 }, leftKnee: { x: 0.24 },
      face: 'cold',
    };
    flatFoot(p, 'right'); flatFoot(p, 'left');
    return ground(p);
  },

  // cầm vật trước ngực bằng hai tay (bàn tay gần chỗ R6 cầm để holdR cũ vẫn khớp)
  hold: (t) => {
    const p = R15_ANIMATIONS.idle(t), b = S(t * 1.7);
    p.rightArm = { x: -1.0 + 0.02 * b, z: 0.22 }; p.leftArm = { x: -1.0 + 0.02 * b, z: -0.22 };
    p.rightElbow = { x: -0.4 }; p.leftElbow = { x: -0.4 }; p.rightHand = { x: 0.1 }; p.leftHand = { x: 0.1 };
    p.head = { ...p.head, x: 0.06 };
    return p;
  },

  // hoảng loạn: hai tay giơ cạnh đầu khua, giậm chân tại chỗ
  panic: (t) => {
    const w = S(t * 9), st = S(t * 7);
    const p = {
      hips: { z: 0.04 * st }, torso: { x: -0.06, z: -0.04 * st }, head: { z: S(t * 4) * 0.1, x: -0.08 },
      rightArm: { x: -0.35, z: -1.75 + w * 0.25 }, leftArm: { x: -0.35, z: 1.75 - S(t * 9 + 1) * 0.25 },
      rightElbow: { x: -1.25 + 0.35 * w }, leftElbow: { x: -1.25 + 0.35 * S(t * 9 + 1) },
      rightHand: { z: 0.3 * w }, leftHand: { z: -0.3 * S(t * 9 + 1) },
      rightLeg: { x: -0.45 * Math.max(0, st), z: -0.04 * st }, leftLeg: { x: -0.45 * Math.max(0, -st), z: -0.04 * st },
      rightKnee: { x: 0.9 * Math.max(0, st) }, leftKnee: { x: 0.9 * Math.max(0, -st) },
      face: 'panic',
    };
    flatFoot(p, 'right'); flatFoot(p, 'left');
    return ground(p);
  },

  // ôm: tay vòng ra trước, cẳng tay gập vào trong
  hug: (t) => {
    const b = S(t * 3);
    const p = {
      ...R15_ANIMATIONS.idle(t),
      torso: { x: 0.08, z: 0.03 * b }, head: { x: 0.05, z: 0.1 },
      rightArm: { x: -1.3, z: 0.18 }, leftArm: { x: -1.3, z: -0.18 },
      rightElbow: { x: -0.25, z: 1.05 + 0.05 * b }, leftElbow: { x: -0.25, z: -1.05 - 0.05 * b },
      rightHand: { z: 0.3 }, leftHand: { z: -0.3 },
      face: 'happy',
    };
    return p;
  },

  // ngồi ôm vật trên đùi
  sitHold: (t) => {
    const p = sitLegs({ spread: 0.03 }), b = S(t * 0.8);
    p.torso = { x: 0.12 + 0.01 * b }; p.head = { x: 0.25 + b * 0.03 };
    p.rightArm = { x: -0.55, z: 0.32 }; p.leftArm = { x: -0.55, z: -0.32 };
    p.rightElbow = { x: -0.95 }; p.leftElbow = { x: -0.95 }; p.rightHand = { x: 0.1, z: 0.2 }; p.leftHand = { x: 0.1, z: -0.2 };
    p.gaze = [0, 0.6];
    return p;
  },

  // ngồi viết
  write: (t) => {
    const p = sitLegs({}), sc = S(t * 9);
    p.torso = { x: 0.2 }; p.head = { x: 0.35, y: 0.05 * S(t * 1.3) };
    p.rightArm = { x: -0.62 + sc * 0.04, z: 0.3, y: S(t * 4) * 0.1 }; p.leftArm = { x: -0.5, z: -0.3 };
    p.rightElbow = { x: -1.0 + sc * 0.05 }; p.leftElbow = { x: -1.05 }; p.rightHand = { x: 0.25 + sc * 0.12, z: 0.1 }; p.leftHand = { x: 0.15 };
    p.gaze = [0.1, 0.8];
    return p;
  },

  lookUp: (t) => { const p = R15_ANIMATIONS.idle(t); p.head = { ...p.head, x: -0.45 }; p.torso = { ...p.torso, x: -0.08 }; p.gaze = [0, -0.9]; return p; },

  // ngã ngửa (không lặp): chân đá lên, tay dang
  tumble: (t) => {
    const k = ease(clamp01(t / 0.6)), kick = S(t * 8) * 0.25 * k;
    return {
      body: { rx: -k * PI / 2, y: k * 0.5 },
      torso: { x: k * 0.15 }, head: { x: k * 0.2 },
      rightArm: { z: -0.5 - k * 1.6, x: -0.2 }, leftArm: { z: 0.5 + k * 1.6, x: -0.2 },
      rightElbow: { x: -0.4 - k * 0.4 }, leftElbow: { x: -0.4 - k * 0.4 },
      rightLeg: { x: -k * 0.8 + kick }, leftLeg: { x: -k * 0.45 - kick }, rightKnee: { x: k * 0.7 }, leftKnee: { x: k * 0.9 },
      face: 'happy',
    };
  },

  // T-pose kiểm tra rig
  tpose: () => ({ rightArm: { z: -PI / 2 }, leftArm: { z: PI / 2 } }),
};
