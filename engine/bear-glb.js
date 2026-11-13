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
