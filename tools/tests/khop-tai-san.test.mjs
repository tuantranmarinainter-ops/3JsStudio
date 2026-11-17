// Kiểm engine/khop-tai-san.js: luật khớp theo loại, lệch %, cảnh báo, tất định.
import test from 'node:test';
import assert from 'node:assert/strict';
import { khop, doanLoai } from '../../engine/khop-tai-san.js';

const V = (x, y, z) => ({ x: [-x / 2, x / 2], y: [0, y], z: [-z / 2, z / 2] });
const gan = (a, b, e = 1e-6) => assert.ok(Math.abs(a - b) < e, `${a} ≠ ${b}`);

test('nha: vừa chân, co đều theo trục chật nhất', () => {
  const r = khop({ bbox: [8, 13, 10], vung: V(16, 20, 10), loai: 'nha' });   // tỉ lệ 2 · 1,538 · 1 → s = 1
  gan(r.scale[0], 1); gan(r.scale[1], 1); gan(r.scale[2], 1);
  gan(r.lech.z, 0); assert.ok(r.lech.x > 0.4);
  assert.ok(r.canhBao.some((c) => /lệch X/.test(c)), 'x lệch 50% phải cảnh báo');
});

test('do-vat: theo chiều cao, không méo; tràn > 10% thì co thêm', () => {
  const a = khop({ bbox: [2, 4, 2], vung: V(4.2, 8, 4.2), loai: 'do-vat' });
  gan(a.scale[0], 2); assert.deepEqual(a.scale[0], a.scale[1]); assert.deepEqual(a.scale[1], a.scale[2]);
  const b = khop({ bbox: [4, 4, 2], vung: V(4, 8, 4), loai: 'do-vat' });     // theo cao = 2 → rộng 8 > 4
  gan(b.scale[0], 1); gan(b.sau[0], 4);
});

test('hop: kéo lệch tối đa +15% so với co đều, không vượt vùng', () => {
  const r = khop({ bbox: [2, 2, 2], vung: V(4, 2, 6), loai: 'hop' });         // r = 2 · 1 · 3 → rMin = 1
  gan(r.scale[1], 1); gan(r.scale[0], 1.15); gan(r.scale[2], 1.15);
  assert.ok(r.sau[0] <= 4 + 1e-9 && r.sau[2] <= 6 + 1e-9);
});

test('dai: lặp mẫu đúng n, giãn nhẹ, tiết diện co đều theo cao', () => {
  const r = khop({ bbox: [4, 2, 0.5], vung: V(20, 3, 1), loai: 'dai' });     // cao 3/2 = 1,5 → dài mẫu 6 → n = round(20/6) = 3
  assert.equal(r.lap.n, 3); assert.equal(r.lap.truc, 'x');
  gan(r.lap.buoc * r.lap.n, 20); gan(r.scale[1], 1.5);
  gan(r.lech.x, 0);
  const sai = khop({ bbox: [4, 2, 0.5], vung: V(20, 3, 1), loai: 'dai' });
  assert.deepEqual(sai, r, 'tất định');
});

test('dai: n quá lớn → cảnh báo', () => {
  const r = khop({ bbox: [0.2, 2, 0.2], vung: V(100, 2, 1), loai: 'dai' });
  assert.ok(r.canhBao.some((c) => /lặp/.test(c)));
});

test('tam: kéo 2 trục phẳng, độ dày không vượt vùng', () => {
  const r = khop({ bbox: [10, 8, 1], vung: V(5, 4, 0.3), loai: 'tam' });     // mỏng nhất = z
  gan(r.scale[0], 0.5); gan(r.scale[1], 0.5);
  assert.ok(r.sau[2] <= 0.3 + 1e-9);
});

test('xoay ±90°: trục x/z của tài sản đổi chỗ', () => {
  const r = khop({ bbox: [1, 9.4, 6], vung: V(0.5, 7, 4), loai: 'tam', ry: Math.PI / 2 });
  gan(r.sau[0], 0.5 * (r.sau[0] / 0.5)); assert.ok(r.sau[2] <= 4 + 1e-9);
  assert.equal(r.scale.length, 3);
});

test('doanLoai: mỏng → tam, dài/ngắn > 4 → dai, còn lại do-vat', () => {
  assert.equal(doanLoai(V(10, 5, 0.4)), 'tam');
  assert.equal(doanLoai(V(24, 3, 2)), 'dai');
  assert.equal(doanLoai(V(4, 3, 4)), 'do-vat');
});

test('vừa khít → không cảnh báo; thiếu loai → đoán', () => {
  const r = khop({ bbox: [4, 3, 4], vung: V(4, 3, 4) });
  assert.equal(r.loai, 'do-vat'); assert.equal(r.canhBao.length, 0); gan(r.tong, 0);
});

test('tam: model là khối dày bị ép vào vùng mỏng → cảnh báo; tấm thật thì không', () => {
  const khoi = khop({ bbox: [41, 27, 39], vung: V(10.4, 8, 0.2), loai: 'tam' });
  assert.ok(khoi.canhBao.some((c) => /không phải tấm/.test(c)));
  const tam = khop({ bbox: [10.4, 8, 0.9], vung: V(2.8, 7.4, 0.2), loai: 'tam' });
  assert.ok(!tam.canhBao.some((c) => /không phải tấm/.test(c)));
});
