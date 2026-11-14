// gau-ke.js — GẤU BÔNG TRÊN KỆ (tĩnh, ngồi, có nơ) từ mẫu Roblox: assets/characters/rb/gau_ke/gau.glb do tools/gau-ke.mjs dựng
// (thân: Roblox 104566604295071; nơ mượn của 8820218869). Dùng để rải bằng InstancedMesh (engine/envs/factory.js). Không có xương, không động.
// Bật/tắt: ?gauKe=0|1 (thắng) → globalThis.__gauKe === true (episode.js: `globalThis.__gauKe = EPISODE.gauKe === true`) → mặc định TẮT (tập khác không đổi).
//   Tắt / thiếu file → kệ giữ gấu cũ (gấu GLB nướng tĩnh của bear-glb.js, hoặc gấu khối).
// Nạp: gauKePreload() gọi trong buildCast (cast.js) trước __ready. Kết quả không phụ thuộc t.

export const GAU_KE_URL = new URL('../assets/characters/rb/gau_ke/gau.glb', import.meta.url).href;
export const GAU_KE_MAU = { long: ['#d9a066', '#b8804e', '#e8c99a'], no: ['#3f7fe0', '#e0453f', '#f2c230'] };   // = bảng màu gấu khối cũ trên kệ
const THU_TU = ['gau_long', 'gau_mat', 'gau_no'];   // group 0, 1, 2

let LIB = null;   // { geometry, box, size }
const urlFlag = () => { try { const v = new URLSearchParams(globalThis.location?.search || '').get('gauKe'); return v === null ? null : v !== '0'; } catch (e) { return null; } };
export const gauKeWanted = () => (urlFlag() ?? (globalThis.__gauKe === true));
export const gauKeOn = () => LIB !== null && gauKeWanted();
export const gauKeSetLib = (lib) => { LIB = lib; };   // cho test

/** Gộp các lưới gau_long / gau_mat / gau_no của một scene glTF thành 1 BufferGeometry có 3 group (theo THU_TU). Thiếu lưới lông → null. */
export function gauKeGop(THREE, scene) {
  scene.updateMatrixWorld(true);
  const parts = THU_TU.map((ten) => { let m = null; scene.traverse((o) => { if (!m && o.isMesh && (o.name === ten || o.parent?.name === ten)) m = o; }); return m; });
  if (!parts[0]) return null;
  let nv = 0, ni = 0; for (const m of parts) if (m) { nv += m.geometry.attributes.position.count; ni += m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count; }
  const P = new Float32Array(nv * 3), N = new Float32Array(nv * 3), I = new Uint32Array(ni), geo = new THREE.BufferGeometry(), v = new THREE.Vector3(); let vo = 0, io = 0;
  parts.forEach((m, gi) => {
    if (!m) return;
    const g = m.geometry, A = g.attributes.position, B = g.attributes.normal, c = A.count, start = io;
    for (let i = 0; i < c; i++) {
      v.fromBufferAttribute(A, i).applyMatrix4(m.matrixWorld); P.set([v.x, v.y, v.z], (vo + i) * 3);
      if (B) { v.fromBufferAttribute(B, i).transformDirection(m.matrixWorld); N.set([v.x, v.y, v.z], (vo + i) * 3); }
    }
    if (g.index) for (let i = 0; i < g.index.count; i++) I[io++] = g.index.getX(i) + vo; else for (let i = 0; i < c; i++) I[io++] = i + vo;
    geo.addGroup(start, io - start, gi); vo += c;
  });
  geo.setAttribute('position', new THREE.BufferAttribute(P, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(N, 3)); geo.setIndex(new THREE.BufferAttribute(I, 1));
  geo.computeBoundingBox(); geo.computeBoundingSphere();
  const bb = geo.boundingBox;
  return { geometry: geo, box: bb, size: [bb.max.x - bb.min.x, bb.max.y - bb.min.y, bb.max.z - bb.min.z] };
}

/** Nạp model (1 lần). Trả true khi sẵn sàng; tắt hoặc lỗi → false (kệ giữ gấu cũ). */
export async function gauKePreload(THREE, url = GAU_KE_URL) {
  if (LIB) return true;
  if (!gauKeWanted() || typeof window === 'undefined') return false;
  try { const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');   // nạp động: Node/test nhập file này không cần three
    const g = await new GLTFLoader().loadAsync(url); LIB = gauKeGop(THREE, g.scene); } catch (e) { console.warn('[gau-ke] không nạp được', url, e?.message); LIB = null; }
  return LIB !== null;
}

const MATS = new Map();
/** Gấu kệ biến thể v (0..2): { geometry (dùng chung), materials: [lông, mắt mũi, nơ], box, size } hoặc null khi tắt / chưa nạp. */
export function gauKeStatic(THREE, v = 0) {
  if (!gauKeOn()) return null;
  const k = ((v % 3) + 3) % 3;
  if (!MATS.has(k)) {
    const mk = (color, decl, rough) => { const m = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0 }); m.userData.matDecl = decl; m.userData.matNguon = 'khai-bao'; return m; };
    MATS.set(k, [mk(GAU_KE_MAU.long[k], 'fabric', 0.95), mk('#1a1412', 'plastic', 0.4), mk(GAU_KE_MAU.no[k], 'fabric', 0.8)]);
  }
  return { ...LIB, materials: MATS.get(k), variant: k };
}

/** Hai lưới rời cho bối cảnh tự rải: `than` (lông + mắt mũi, MÀU ĐỈNH → vật liệu vertexColors) và `no` (nơ, không màu → tô bằng màu từng instance).
 *  Cùng hệ với gauKeStatic (mông y=0, mặt +Z). Trả null khi tắt / chưa nạp. */
export function gauKeTach(THREE, { long = '#C77A2F', mat = '#2a1a12' } = {}) {
  if (!gauKeOn()) return null;
  const g = LIB.geometry, P = g.attributes.position, N = g.attributes.normal, I = g.index, c = new THREE.Color();
  const cat = (groups, mau) => {
    const map = new Map(), pos = [], nor = [], col = [], idx = [];
    groups.forEach((gr, k) => { if (!gr) return; if (mau) c.set(mau[k]);
      for (let i = gr.start; i < gr.start + gr.count; i++) { const a = I.getX(i), key = a + ':' + k; let b = map.get(key);
        if (b === undefined) { b = pos.length / 3; map.set(key, b); pos.push(P.getX(a), P.getY(a), P.getZ(a)); nor.push(N.getX(a), N.getY(a), N.getZ(a)); if (mau) col.push(c.r, c.g, c.b); }
        idx.push(b); } });
    const o = new THREE.BufferGeometry(); o.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); o.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    if (mau) o.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); o.setIndex(idx); o.computeBoundingBox(); o.computeBoundingSphere(); return o;
  };
  const G = (mi) => g.groups.find((x) => x.materialIndex === mi);
  return { than: cat([G(0), G(1)], [long, mat]), no: G(2) ? cat([G(2)]) : null, box: LIB.box, size: LIB.size };
}
