// vcolor.js — "Texture thứ hai" bằng màu đỉnh (ý tưởng từ Saltline): tối dần sát mặt đất, mặt úp xuống tối hơn,
// mặt ngửa lên sáng hơn → khối vuông trông như đặt trên đất thật, gần như không tốn gì khi render.
// Nướng 1 lần lúc dựng cảnh, cho vật TĨNH (nhà, đường, đạo cụ). R6 đang chuyển động thì không cần.
//
// Dùng:
//   import { bakeGroundAO } from './vcolor.js';
//   bakeGroundAO(THREE, town, { height: 1.6, dark: 0.45, tint: '#5a4632' });
// Nên gọi SAU mergeByMaterial (ít geometry hơn → nhanh hơn). Mesh có userData.noAO = true thì bỏ qua.

export function bakeGroundAO(THREE, root, opts = {}) {
  const o = { groundY: 0, height: 1.6, dark: 0.45, tint: '#5a4632', down: 0.75, up: 1.08, ...opts };
  const tint = new THREE.Color(o.tint);
  root.updateMatrixWorld(true);
  const geoUse = new Map();
  root.traverse((m) => { if (m.isMesh) geoUse.set(m.geometry, (geoUse.get(m.geometry) || 0) + 1); });
  const matMap = new Map();
  const p = new THREE.Vector3(), n = new THREE.Vector3(), nm = new THREE.Matrix3();
  const smooth = (x) => { x = Math.min(Math.max(x, 0), 1); return x * x * (3 - 2 * x); };
  let count = 0;

  root.traverse((mesh) => {
    if (!mesh.isMesh || mesh.isSkinnedMesh || mesh.userData.noAO || mesh.userData.noStyle) return;
    let g = mesh.geometry;
    if (geoUse.get(g) > 1) { g = g.clone(); mesh.geometry = g; }   // geometry dùng chung → tách riêng
    const pos = g.attributes.position, nor = g.attributes.normal;
    if (!nor) g.computeVertexNormals();
    nm.getNormalMatrix(mesh.matrixWorld);
    const old = g.attributes.color;
    const col = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      p.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
      n.fromBufferAttribute(g.attributes.normal, i).applyMatrix3(nm).normalize();
      const s = smooth((p.y - o.groundY) / o.height);
      const face = n.y < -0.5 ? o.down : n.y > 0.5 ? o.up : 1;
      for (let k = 0; k < 3; k++) {
        const t = k === 0 ? tint.r : k === 1 ? tint.g : tint.b;
        const dark = o.dark * (0.6 + 0.8 * t);                       // vệt tối hơi ngả màu đất
        let v = (dark + (1 - dark) * s) * face;
        if (old) v *= old.getComponent(i, k);
        col[i * 3 + k] = v;
      }
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const conv = (m) => {
      if (m.vertexColors) return m;
      if (!matMap.has(m)) { const c = m.clone(); c.vertexColors = true; c.onBeforeCompile = m.onBeforeCompile; c.customProgramCacheKey = m.customProgramCacheKey; matMap.set(m, c); }
      return matMap.get(m);
    };
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(conv) : conv(mesh.material);
    count++;
  });
  return { meshes: count };
}
