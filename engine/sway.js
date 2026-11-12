// sway.js — cây đung đưa theo GIÓ DÙNG CHUNG (engine/wind.js) trên CPU: chỉ xoay Object3D có sẵn,
// KHÔNG shader mới, KHÔNG onBeforeCompile. Tất định: update(t) luôn = quaternion gốc × f(t), không phụ thuộc lần gọi trước.
//
//   const sway = createSway(THREE, wind, { seed: 3 });
//   sway.addPalm(palmGroup);          // coconut.js: crown + từng pivot lá + thân
//   sway.addTree(treeObj);            // cây Kenney/Polyfork: nghiêng nhẹ cả cây quanh gốc
//   sway.add(obj, { kind:'trunk'|'crown'|'frond'|'tree', amp, flutter, freq })   // amp/flutter = radian
//   sway.update(t);                   // SAU wind.update(t) / grass.update(t) (dùng t, hướng, tốc độ của gió lúc đó)
//   sway.rest();                      // về tư thế gốc nhưng giữ danh sách (nút tắt)
//   sway.clear();                     // trả quaternion về gốc rồi quên hết
// Trục xoay = vuông góc hướng gió trong thế giới (up × dir), đổi sang không gian cha của vật → nghiêng đúng chiều gió.
const PRESETS = {
  trunk: { amp: 0.010, flutter: 0.004, freq: 0.9 },
  crown: { amp: 0.026, flutter: 0.012, freq: 1.3 },    // ~1.5°
  frond: { amp: 0.045, flutter: 0.075, freq: 2.4 },    // ~2.6° + dao động ~4–6° ở gió mạnh
  tree: { amp: 0.017, flutter: 0.006, freq: 1.0 },     // ~1°
};
const hash = (seed, i) => { let h = Math.imul((seed | 0) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(i + 1, 0xc2b2ae35); h ^= h >>> 13; h = Math.imul(h, 0x27d4eb2f); h ^= h >>> 15; return (h >>> 0) / 4294967296; };

export function createSway(THREE, wind, { seed = 1 } = {}) {
  const items = [];                  // { obj, base, kind, amp, flutter, freq, phase, depth }
  let dirty = false;
  const q1 = new THREE.Quaternion(), q2 = new THREE.Quaternion(), qp = new THREE.Quaternion(), axisW = new THREE.Vector3(), axisL = new THREE.Vector3(), axis2 = new THREE.Vector3(), pos = new THREE.Vector3();
  const depthOf = (o) => { let d = 0; for (let p = o.parent; p; p = p.parent) d++; return d; };

  function add(obj, opts = {}) {
    const kind = opts.kind || 'tree', pr = PRESETS[kind] || PRESETS.tree, i = items.length;
    const k = items.find((it) => it.obj === obj); if (k) items.splice(items.indexOf(k), 1);
    items.push({ obj, base: obj.quaternion.clone(), kind, amp: opts.amp ?? pr.amp, flutter: opts.flutter ?? pr.flutter, freq: opts.freq ?? pr.freq,
      phase: hash(seed, i * 7 + 1) * Math.PI * 2, depth: depthOf(obj) });
    dirty = true; return obj;
  }

  function addPalm(group) {          // cấu trúc coconut.js: group > pivot(yaw) > [trunk, crown > (piv > tilt > frond)×n]
    const pivot = group.children.find((c) => c.type === 'Group'), trunk = group.getObjectByName('trunk'), crown = group.getObjectByName('crown');
    if (pivot) add(pivot, { kind: 'trunk' });                       // thân cong cả cây: rất nhỏ (xoay quanh gốc)
    if (crown) {
      add(crown, { kind: 'crown' });
      for (const piv of crown.children) if (piv.type === 'Group') add(piv, { kind: 'frond' });   // mỗi pivot lá (cả 2 lá non)
    }
    return group;
  }
  function addTree(obj, opts = {}) { return add(obj, { kind: 'tree', ...opts }); }

  function update(t) {
    if (dirty) { items.sort((a, b) => a.depth - b.depth); dirty = false; }
    const [dx, dz] = wind.dirXZ(), P = wind.params;
    const k = Math.min(1.6, Math.max(0, P.speed / 6)), gk = P.gust;
    axisW.set(dz, 0, -dx).normalize();                              // up × dir
    for (const it of items) {                                       // cha trước con → ma trận thế giới của cha là hàm thuần của t
      const o = it.obj;
      if (o.parent) o.parent.updateWorldMatrix(true, false);
      pos.copy(o.position).applyMatrix4(o.parent ? o.parent.matrixWorld : o.matrixWorld);
      const g = wind.gustAt(pos.x, pos.z) * gk;
      const ang = it.amp * k * (0.35 + 0.65 * g) + it.flutter * (0.4 + 0.6 * k) * Math.sin(t * it.freq + it.phase) * (0.5 + 0.5 * g);
      const ang2 = it.flutter * 0.5 * k * Math.sin(t * it.freq * 0.73 + it.phase * 1.7);      // lắc ngang gió
      if (o.parent) { o.parent.getWorldQuaternion(qp); qp.invert(); } else qp.identity();
      axisL.copy(axisW).applyQuaternion(qp);
      axis2.set(dx, 0, dz).applyQuaternion(qp);
      q1.setFromAxisAngle(axisL, ang); q2.setFromAxisAngle(axis2, ang2);
      // xoay trong không gian THẾ GIỚI trước rồi mới tới tư thế gốc: q = (cha⁻¹·R·cha)·base  (axisL đã ở không gian cha)
      o.quaternion.copy(q1).multiply(q2).multiply(it.base);
      o.updateMatrix();
    }
  }
  function rest() { for (const it of items) { it.obj.quaternion.copy(it.base); it.obj.updateMatrix(); } }   // về tư thế gốc (tắt đung đưa), vẫn giữ danh sách
  function clear() { for (const it of items) it.obj.quaternion.copy(it.base); items.length = 0; }
  return { add, addPalm, addTree, update, rest, clear, get count() { return items.length; } };
}
