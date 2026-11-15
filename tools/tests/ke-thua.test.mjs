// tools/ke-thua.mjs — doctor mục 12: env không vá món của builder dùng chung
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { kiemKeThua } from '../ke-thua.mjs';

const VA = `
  e.bed = K.bed();
  for (const nm of ['pillow', 'blanket_cuff']) { const o = e.bed.getObjectByName(nm); if (o) o.parent.remove(o); }
  fr.traverse((o) => {
    if (o.isMesh) { o.material = o.material.clone(); }
  });
  g.traverse((o) => { if (o.isMesh) { o.userData.matKind = 'none'; } });
`;
const TU_DUNG = `
  box(mid, 'phong_chan', 4, 0.3, 6, 0, 1, 0, '#c33', 'fabric');
  const w = new THREE.Mesh(geo, mat); w.name = 'window_glass_west';
`;
const SACH = `
  // bedroom: K.bed tự có vải mềm — không gỡ 'pillow' ở đây nữa
  e.bed = K.bed(); e.window = K.window({ w: 7 });
  const sea = plane(900, 900, mat('#0e5f86'), -10, 'seabed');
  export const LIGHT = 'bedNight'; const NOI = new Set(['bedroom', 'kitchen']);
`;

test('báo đủ 3 kiểu vá: gỡ bộ phận, ghi đè trong traverse, matKind none', () => {
  const kinds = kiemKeThua([{ file: 'engine/envs/va.js', src: VA }]).map((r) => r.kind);
  assert.deepEqual(kinds.sort(), ['ghi-de', 'go-bo-phan', 'matKind-none']);
});

test('báo env tự dựng giường / cửa sổ mà không gọi builder', () => {
  const r = kiemKeThua([{ file: 'engine/envs/tu.js', src: TU_DUNG }]);
  assert.deepEqual(r.map((x) => x.kind), ['tu-dung', 'tu-dung']);
  assert.match(r[0].msg, /giường/); assert.match(r[1].msg, /cửa sổ/);
});

test('env sạch (gọi builder, tên seabed/bedroom/bedNight, dòng chú thích) không bị báo', () => {
  assert.deepEqual(kiemKeThua([{ file: 'engine/envs/sach.js', src: SACH }]), []);
});

test('miễn trừ theo file + chuỗi con', () => {
  const allow = [{ file: 'engine/envs/va.js', mau: "matKind = 'none'", lyDo: 'thử' }];
  const kinds = kiemKeThua([{ file: 'engine/envs/va.js', src: VA }], allow).map((r) => r.kind);
  assert.ok(!kinds.includes('matKind-none'));
  assert.equal(kinds.length, 2);
});
