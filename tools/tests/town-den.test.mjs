import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { nap } from './_three.mjs';

// Đọc GLB nhà Kenney thành BufferGeometry (không cần GLTFLoader/ảnh) → thử bộ tìm cửa sổ của engine/town.js
const THREE = await nap();
const { cuaKinh } = await import('../../engine/town.js');
function geoTuGlb(f) {
  const b = fs.readFileSync(f), jl = b.readUInt32LE(12), J = JSON.parse(b.subarray(20, 20 + jl)), bin = 20 + jl + 8;
  const acc = (i) => { const a = J.accessors[i], v = J.bufferViews[a.bufferView], n = { SCALAR: 1, VEC2: 2, VEC3: 3 }[a.type];
    const T = { 5126: Float32Array, 5123: Uint16Array, 5125: Uint32Array }[a.componentType], off = bin + (v.byteOffset || 0) + (a.byteOffset || 0);
    return { d: new T(b.buffer.slice(b.byteOffset + off, b.byteOffset + off + a.count * n * T.BYTES_PER_ELEMENT)), n }; };
  const p = J.meshes[0].primitives[0], P = acc(p.attributes.POSITION), U = acc(p.attributes.TEXCOORD_0), I = acc(p.indices);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(P.d, 3)); g.setAttribute('uv', new THREE.BufferAttribute(U.d, 2)); g.setIndex(new THREE.BufferAttribute(I.d, 1));
  return g;
}
const DIR = 'assets/kenney/city-kit-suburban';

test('mọi nhà Kenney (a…u) có cửa sổ hướng ra ngoài, pháp tuyến nằm ngang, kích thước dương', () => {
  for (const c of 'abcdefghijklmnopqrstu') {
    const ws = cuaKinh(geoTuGlb(`${DIR}/building-type-${c}.glb`));
    assert.ok(ws.length >= 2, `nhà ${c}: ${ws.length} cửa sổ`);
    for (const w of ws) {
      assert.ok(Math.abs(Math.hypot(w.n[0], w.n[2]) - 1) < 1e-6 && w.n[1] === 0, `nhà ${c}: pháp tuyến`);
      assert.ok(w.w > 0 && w.h > 0 && w.w < 1.2 && w.h < 1.2, `nhà ${c}: cỡ ${w.w} × ${w.h}`);
    }
  }
});

test('cuaKinh tất định (hai lần dựng cho cùng danh sách, đã sắp thứ tự)', () => {
  const a = cuaKinh(geoTuGlb(`${DIR}/building-type-d.glb`)), b = cuaKinh(geoTuGlb(`${DIR}/building-type-d.glb`));
  assert.deepEqual(a, b);
  for (let i = 1; i < a.length; i++) assert.ok(a[i - 1].c[1] <= a[i].c[1] + 1e-12);
});
