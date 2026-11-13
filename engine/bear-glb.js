// bear-glb.js — gấu Bắp bằng model GLB có xương (assets/characters/bap/bap*.glb) thay gấu dựng bằng khối (engine/bear.js).
//   createBearGlb(THREE, opts) trả đúng giao diện của createBear (parts/root/animate/attach/materials/headCenter…), nên cast.js, shots.js, timeline… không đổi.
//
// Cách làm: giữ NGUYÊN bộ xương khối của createBear làm "người lái" (ẩn lưới, KHÔNG dùng clip, KHÔNG AnimationMixer): pose vẫn lấy từ BEAR_ANIMATIONS (hàm thuần của t),
// áp lên các khớp người lái như cũ; rồi mỗi khung đọc xoay thế giới của khớp (so với thân gấu) và đặt lên xương GLB:  xoay_thế_giới(xương) = xoay_khớp × xoay_thế_giới_lúc_nghỉ(xương).
// Vì dùng xoay thế giới nên không phụ thuộc hướng trục xương GLB. Vật cầm (holdProp) vẫn gắn vào bàn tay của người lái ⇒ vị trí cầm y như gấu cũ.
//   Khớp → xương: torso→base_01 (thân; chân/đầu/tay là con của base_01 nhưng lấy xoay riêng), head→head_02, arm→arm-*_09, elbow→arm-*001_*, leg→leg-*_05, knee→leg-*001_*.
//
// Bật/tắt: ?bearGlb=0|1 (thắng) → globalThis.__bearGlb === true (episode.js: EPISODE.bearGlb) → mặc định TẮT (tập khác không đổi). Tắt → createBear như cũ.
// Nạp: bearGlbPreload() gọi trong buildCast (cast.js) trước __ready; Node/test không có window → không nạp → gấu khối.
import { createBear, BEAR_DIMS, bearApplyPose, bearSample } from './bear.js';

export const BEAR_GLB_VARIANTS = ['characters/bap', 'characters/bap2', 'characters/bap3'];   // Bắp · kem nơ đỏ · nâu sẫm nơ vàng
export const BEAR_GLB_HEIGHT = BEAR_DIMS.height;                                            // cỡ trong cảnh = gấu khối cũ (2,2 stud), co từ 2,6
export const BEAR_GLB_SHEEN = 0.3;                                                           // nhân màu sheen (gốc 1): sheen đầy làm mắt/mũi đen bị xám

// [khớp người lái, tên xương, khoá cha (xương GLB cha đã lái) | null]
const MAP = [
  ['torso', 'base_01', null],
  ['head', 'head_02', 'torso'],
  ['rightArm', 'arm-r_09', 'torso'], ['rightElbow', 'arm-r001_010', 'rightArm'],
  ['leftArm', 'arm-l_011', 'torso'], ['leftElbow', 'arm-l001_012', 'leftArm'],
  ['rightLeg', 'leg-r_05', 'torso'], ['rightKnee', 'leg-r001_06', 'rightLeg'],
  ['leftLeg', 'leg-l_07', 'torso'], ['leftKnee', 'leg-l001_08', 'leftLeg'],
];

let LIB = null;
const urlFlag = () => { try { const v = new URLSearchParams(globalThis.location?.search || '').get('bearGlb'); return v === null ? null : v !== '0'; } catch (e) { return null; } };
export const bearGlbWanted = () => (urlFlag() ?? (globalThis.__bearGlb === true));
export const bearGlbOn = () => LIB !== null && bearGlbWanted();

// biến thể theo tên diễn viên / thứ tự gấu trong tập: gấu đầu (Bắp) = bap, các gấu sau xoay vòng bap2, bap3, bap…
export function bearGlbVariant(name, index = 0, explicit) {
  if (explicit) return explicit.includes('/') ? explicit : 'characters/' + explicit;
  if (name === 'bap') return BEAR_GLB_VARIANTS[0];
  if (name === 'bear2') return BEAR_GLB_VARIANTS[1];
  if (name === 'bear3') return BEAR_GLB_VARIANTS[2];
  return BEAR_GLB_VARIANTS[index % BEAR_GLB_VARIANTS.length];
}

export const bearGlbSetLib = (lib) => { LIB = lib ? { fixed: new Set(), ...lib } : null; };   // chỉ cho test (nạp thư viện giả)

export async function bearGlbPreload(ids = BEAR_GLB_VARIANTS) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  if (!bearGlbWanted()) return false;
  if (LIB) return true;
  const THREE = await import('three');
  const { createAssetLib } = await import('./assets.js');
  const A = createAssetLib(THREE);
  await A.load(ids);
  LIB = { THREE, A, fixed: new Set() };
  return true;
}

// giảm sheen + roughness 1 (lông bông) một lần cho mỗi model nạp
function chinhVatLieu(id, inst) {
  if (LIB.fixed.has(id)) return; LIB.fixed.add(id);
  inst.traverse((o) => {
    if (!o.isMesh) return;
    for (const m of [].concat(o.material)) {
      if (!m) continue;
      m.roughness = 1;
      if (m.sheenColor) m.sheenColor.multiplyScalar(BEAR_GLB_SHEEN);
      m.needsUpdate = true;
    }
  });
}

export function createBearGlb(THREE, opts = {}) {
  const id = opts.glbId || bearGlbVariant(opts.name, opts.glbIndex || 0, opts.glb);
  const inst = LIB.A.instance(id, { name: (opts.name || 'bear') + '_glb' });
  if (!inst.children.length) return null;   // model không nạp được → để cast.js dùng gấu khối
  chinhVatLieu(id, inst);
  const d = createBear(THREE, { ...opts, cameraAnchor: opts.cameraAnchor });
  const { parts } = d;
  d.root.traverse((m) => { if (m.isMesh) m.visible = false; });   // ẩn lưới khối; xương khối vẫn lái pose + giữ vật cầm

  // vật liệu riêng cho mỗi bản (setColors không lan sang bản khác)
  const mats = [];
  inst.traverse((o) => {
    if (!o.isMesh) return;
    o.material = Array.isArray(o.material) ? o.material.map((m) => m.clone()) : o.material.clone();
    mats.push(...[].concat(o.material));
    o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false;
    o.userData.matKind = 'none'; o.userData.grungeKind = 'none';
  });
  const fur = mats.find((m) => m.name === 'body') || mats[0], bow = mats.find((m) => m.name === 'no_mau') || mats[1] || mats[0];

  // cỡ: co model về BEAR_GLB_HEIGHT (đo hộp bao ở tư thế nghỉ, chân y=0)
  inst.updateMatrixWorld(true);
  const holder = new THREE.Group(); holder.name = (opts.name || 'bear') + '_glbBody';
  holder.add(inst);
  const box0 = new THREE.Box3().setFromObject(inst, true);
  const k = BEAR_GLB_HEIGHT / Math.max(box0.max.y - box0.min.y, 1e-3);
  holder.scale.setScalar(k);
  holder.position.y = -box0.min.y * k;   // chân y=0
  parts.body.add(holder);

  // xương + xoay thế giới lúc nghỉ (trong hệ của inst)
  const bones = {}, rest = {}, parentRest = {};
  inst.updateMatrixWorld(true);
  const sc = new THREE.Vector3(), tp = new THREE.Vector3();
  for (const [j, bn] of MAP) {
    const b = inst.getObjectByName(bn); if (!b) { console.warn('[bear-glb] thiếu xương', bn, 'trong', id); continue; }
    bones[j] = b; rest[j] = new THREE.Quaternion(); b.matrixWorld.decompose(tp, rest[j], sc);
    parentRest[j] = new THREE.Quaternion(); b.parent.matrixWorld.decompose(tp, parentRest[j], sc);
  }
  // hệ số cho độ lệch body.y/z của pose (xem hiệu chỉnh ngồi bên dưới)
  let ratio = 1;
  const cur = {}, q = new THREE.Quaternion(), qi = new THREE.Quaternion();
  const relQ = (node) => { q.identity(); for (let n = node; n && n !== parts.body; n = n.parent) q.premultiply(n.quaternion); return q; };
  const sync = () => {
    for (const [j, , pk] of MAP) {
      const b = bones[j]; if (!b) continue;
      const w = (cur[j] ||= new THREE.Quaternion());
      w.copy(relQ(parts[j])).multiply(rest[j]);
      const pw = pk && cur[pk] ? cur[pk] : parentRest[j];
      qi.copy(pw).invert(); b.quaternion.copy(qi).multiply(w);
    }
  };
  const nap = (pose) => {
    const b = pose.body;
    const p = ratio !== 1 && b && (b.y || b.z) ? { ...pose, body: { ...b, y: (b.y || 0) * ratio, z: (b.z || 0) * ratio } } : pose;
    bearApplyPose(parts, p); sync();
  };

  // hiệu chỉnh độ lệch body.y: ngồi (idle) phải chạm đất, không lơ lửng / chìm
  const minY = () => { d.root.updateMatrixWorld(true); inst.traverse((o) => o.isSkinnedMesh && o.skeleton.update()); return new THREE.Box3().setFromObject(inst, true).min.y; };
  nap(bearSample('idle', 0.4)); const m1 = minY();
  const drop = BEAR_DIMS.seatY;   // pose ngồi dịch body.y = seatY (<0) so với đứng
  if (drop < -0.05) ratio = Math.min(3, Math.max(0.3, 1 + m1 / -drop));
  nap(bearSample('idle', 0.4)); const m2 = minY();
  nap(bearSample('stand', 0));

  const char = d;
  Object.assign(char, {
    isBearGlb: true, glb: holder, glbId: id, glbRatio: ratio,
    materials: { fur, skin: fur, outfit: fur, shirt: bow, pants: fur, face: fur, bow, muzzle: fur },
    apply(pose) { nap(pose); },
    animate(name, t, opt = {}) {
      const pose = bearSample(name, t, opt);
      nap(pose);
      char.lastPose = pose;
      return pose;
    },
    setColors({ fur: f, bow: bw } = {}) { if (f) fur.color.set(f); if (bw) bow.color.set(bw); },
  });
  char.glbDebug = { id, k, ratio, m1, m2, box0: box0.max.y - box0.min.y };
  d.root.userData.setDetail = (x) => char.setDetail(x);
  char.root.userData.glb = id; char.root.userData.glbDebug = char.glbDebug;
  return char;
}

// ---- gấu bông tĩnh để rải bằng InstancedMesh (kệ gấu trong nhà máy) ----
// Nướng lưới một gấu GLB ở tư thế `pose` (mặc định ngồi 'idle') thành BufferGeometry thường (đã áp xương 1 lần), hệ gốc: chân/mông y=0, mặt nhìn +Z, cao ~BEAR_GLB_HEIGHT.
// Trả về { geometry (group 0 = lông, group 1 = nơ), materials: [lông, nơ], size:[w,h,d], id } hoặc null khi gấu GLB tắt / chưa nạp. Có cache theo (biến thể, pose, t).
const BAKED = new Map();
export function bearGlbBakedStatic(THREE, variant = 0, pose = 'idle', t = 0.4) {
  if (!bearGlbOn()) return null;
  const id = bearGlbVariant('', variant), key = id + '|' + pose + '|' + t;
  if (BAKED.has(key)) return BAKED.get(key);
  const c = createBearGlb(THREE, { name: 'baked_' + variant, glbId: id }); if (!c) return null;
  c.animate(pose, t); c.root.updateMatrixWorld(true);
  const out = { fur: [], bow: [] }, mat = { fur: null, bow: null };
  const bm = new THREE.Matrix4(), tmp = new THREE.Matrix4(), v = new THREE.Vector3(), n = new THREE.Vector3(), a = new THREE.Vector3(), an = new THREE.Vector3(), bv = new THREE.Vector3(), bn = new THREE.Vector3();
  c.glb.traverse((sm) => {
    if (!sm.isSkinnedMesh) return;
    sm.skeleton.update();
    const bones = sm.skeleton.bones.map((_, i) => new THREE.Matrix4().fromArray(sm.skeleton.boneMatrices, i * 16));
    const fin = new THREE.Matrix4().multiplyMatrices(sm.matrixWorld, sm.bindMatrixInverse);
    const g = sm.geometry, P = g.attributes.position, N = g.attributes.normal, UV = g.attributes.uv, SI = g.attributes.skinIndex, SW = g.attributes.skinWeight;
    const pos = new Float32Array(P.count * 3), nor = new Float32Array(P.count * 3);
    for (let i = 0; i < P.count; i++) {
      v.fromBufferAttribute(P, i).applyMatrix4(sm.bindMatrix); n.fromBufferAttribute(N, i).transformDirection(sm.bindMatrix);
      a.set(0, 0, 0); an.set(0, 0, 0);
      for (let j = 0; j < 4; j++) {
        const w = SW.getComponent(i, j); if (!w) continue; bm.copy(bones[SI.getComponent(i, j)]);
        bv.copy(v).applyMatrix4(bm); bn.copy(n).transformDirection(bm); a.addScaledVector(bv, w); an.addScaledVector(bn, w);
      }
      a.applyMatrix4(fin); an.transformDirection(fin);
      pos.set([a.x, a.y, a.z], i * 3); nor.set([an.x, an.y, an.z], i * 3);
    }
    const idx = g.index ? Array.from(g.index.array) : Array.from({ length: P.count }, (_, i) => i);
    const m = [].concat(sm.material)[0], isBow = m.name === 'no_mau';
    (isBow ? out.bow : out.fur).push({ pos, nor, uv: UV ? Float32Array.from(UV.array) : new Float32Array(P.count * 2), idx });
    if (isBow) mat.bow ||= m; else mat.fur ||= m;
  });
  const geo = new THREE.BufferGeometry(); let vo = 0, io = 0;
  const all = [...out.fur, ...out.bow], nv = all.reduce((s, p) => s + p.pos.length / 3, 0), ni = all.reduce((s, p) => s + p.idx.length, 0);
  const P = new Float32Array(nv * 3), N = new Float32Array(nv * 3), U = new Float32Array(nv * 2), I = new Uint32Array(ni);
  const grp = [];
  for (const set of [out.fur, out.bow]) {
    const start = io;
    for (const p of set) { P.set(p.pos, vo * 3); N.set(p.nor, vo * 3); U.set(p.uv, vo * 2); for (let i = 0; i < p.idx.length; i++) I[io++] = p.idx[i] + vo; vo += p.pos.length / 3; }
    grp.push([start, io - start]);
  }
  geo.setAttribute('position', new THREE.BufferAttribute(P, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(N, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(U, 2));
  geo.setIndex(new THREE.BufferAttribute(I, 1)); grp.forEach(([s, n2], i) => geo.addGroup(s, n2, i));
  geo.computeBoundingBox(); geo.computeBoundingSphere();
  const bb = geo.boundingBox, res = { id, geometry: geo, materials: [mat.fur, mat.bow || mat.fur], box: bb, size: [bb.max.x - bb.min.x, bb.max.y - bb.min.y, bb.max.z - bb.min.z] };
  BAKED.set(key, res); return res;
}
export const bearGlbBakedClear = () => BAKED.clear();
