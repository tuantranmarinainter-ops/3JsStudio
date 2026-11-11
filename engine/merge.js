// merge.js — Gộp mesh tĩnh theo VẬT LIỆU (ý tưởng từ Saltline): số lần vẽ tỉ lệ với số vật liệu, không với số vật.
// Dùng cho thị trấn (Kenney/Polyfork/khối tự dựng) trước khi render — cloud render bằng CPU nên mỗi draw call đều tốn.
//
// Dùng:
//   import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
//   import { mergeByMaterial } from './merge.js';
//   const stats = mergeByMaterial(THREE, town, mergeGeometries);   // sửa tại chỗ: town giữ nguyên vị trí trong scene
//   console.log(stats);  // { meshesBefore, meshesAfter }
// Giữ riêng (không gộp): object có userData.noMerge = true (và mọi con của nó) — vật cần chuyển động, đổi màu, ẩn/hiện.
// Gộp xong mất tên từng vật con → tra cứu/điều khiển vật nào thì đánh noMerge cho vật đó.
// Gọi SAU applySnowCover/applyStyle… chỉ khi các hàm đó không cần phân biệt từng mesh (chúng làm việc theo material nên vẫn đúng).

const KEEP = ['position', 'normal', 'uv', 'color'];

function prepare(THREE, geo, matrix) {
  // Chuẩn hoá: không index, chỉ giữ thuộc tính chung, đã nhân ma trận về toạ độ của gốc
  let g = geo.index ? geo.toNonIndexed() : geo.clone();
  for (const name of Object.keys(g.attributes)) if (!KEEP.includes(name)) g.deleteAttribute(name);
  if (!g.attributes.normal) g.computeVertexNormals();
  g.applyMatrix4(matrix);
  if (matrix.determinant() < 0) { // scale âm lật chiều tam giác → đảo lại để mặt không bị ẩn
    for (const a of Object.values(g.attributes)) {
      const s = a.itemSize, arr = a.array;
      for (let i = 0; i < a.count; i += 3) {
        for (let k = 0; k < s; k++) { const t = arr[(i + 1) * s + k]; arr[(i + 1) * s + k] = arr[(i + 2) * s + k]; arr[(i + 2) * s + k] = t; }
      }
    }
  }
  g.morphAttributes = {};
  return g;
}

function sliceGroup(THREE, g, start, count) {
  const out = new THREE.BufferGeometry();
  for (const [name, a] of Object.entries(g.attributes)) {
    const s = a.itemSize;
    out.setAttribute(name, new THREE.BufferAttribute(a.array.slice(start * s, (start + count) * s), s, a.normalized));
  }
  return out;
}

export function mergeByMaterial(THREE, root, mergeGeometries, opts = {}) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const buckets = new Map();
  const victims = [];

  const visit = (obj) => {
    if (obj.userData.noMerge) return;
    if (obj.isMesh && !obj.isSkinnedMesh && !obj.isInstancedMesh && obj.visible && obj.geometry?.attributes.position) {
      const m = new THREE.Matrix4().multiplyMatrices(inv, obj.matrixWorld);
      const base = prepare(THREE, obj.geometry, m);
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      const groups = Array.isArray(obj.material) && obj.geometry.groups.length
        ? obj.geometry.groups.map((gr) => ({ mat: mats[gr.materialIndex], g: sliceGroup(THREE, base, gr.start, Math.min(gr.count, base.attributes.position.count - gr.start)) }))
        : [{ mat: mats[0], g: base }];
      for (const { mat, g } of groups) {
        if (!mat) continue;
        const key = `${mat.uuid}|${obj.castShadow}|${obj.receiveShadow}`;
        if (!buckets.has(key)) buckets.set(key, { mat, cast: obj.castShadow, recv: obj.receiveShadow, geos: [] });
        buckets.get(key).geos.push(g);
      }
      victims.push(obj);
    }
    for (const c of obj.children) visit(c);
  };
  for (const c of root.children) visit(c);

  let after = 0;
  for (const [, b] of buckets) {
    // mọi phần trong 1 nhóm phải có cùng bộ thuộc tính → thêm uv 0 / màu trắng nếu thiếu
    const need = KEEP.filter((n) => b.geos.some((g) => g.attributes[n]));
    for (const g of b.geos) {
      const n = g.attributes.position.count;
      if (need.includes('uv') && !g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
      if (need.includes('color') && !g.attributes.color) g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3).fill(1), 3));
      if (g.attributes.color && g.attributes.color.itemSize === 4 && b.geos.some((x) => x.attributes.color?.itemSize === 3)) {
        const c4 = g.attributes.color.array, c3 = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) c3.set([c4[i * 4], c4[i * 4 + 1], c4[i * 4 + 2]], i * 3);
        g.setAttribute('color', new THREE.BufferAttribute(c3, 3));
      }
    }
    const merged = mergeGeometries(b.geos, false);
    if (!merged) { console.warn('merge.js: không gộp được nhóm', b.mat.name || b.mat.uuid); continue; }
    merged.computeBoundingSphere();
    const mesh = new THREE.Mesh(merged, b.mat);
    mesh.name = `merged_${b.mat.name || b.mat.type}_${after}`;
    mesh.castShadow = b.cast;
    mesh.receiveShadow = b.recv;
    root.add(mesh);
    after++;
    for (const g of b.geos) g.dispose();
  }
  for (const v of victims) v.parent?.remove(v);
  // dọn group rỗng còn lại
  const empty = [];
  root.traverse((o) => { if (o !== root && o.isGroup && !o.children.length && !o.userData.noMerge) empty.push(o); });
  for (const e of empty) e.parent?.remove(e);
  return { meshesBefore: victims.length, meshesAfter: after };
}
