// Bộ đặt máy theo khung (engine/dat-may.js): lõi toán thuần — đặt máy rồi chiếu ngược phải ra đúng vị trí và đúng cỡ đã yêu cầu.
import test from 'node:test';
import assert from 'node:assert/strict';
import { tinhMay, chieu, fovTuMm } from '../../engine/dat-may.js';

const gan = (a, b, e = 0.05) => assert.ok(Math.abs(a - b) <= e, `${a} ≠ ${b}`);
test('tiêu cự → fov dọc cho khung dọc', () => { gan(fovTuMm(85), 23.9, 0.1); gan(fovTuMm(50), 39.6, 0.1); gan(fovTuMm(24), 73.7, 0.1); });
for (const c of [
  { ten: 'chính diện, giữa khung', s: { pct: 30, x: 50, y: 50, ngang: 0, cao: 0, fov: 40 } },
  { ten: '3/4, lệch tâm, máy cao', s: { pct: 34, x: 62, y: 38, ngang: 35, cao: 12, fov: 31 } },
  { ten: 'sau lưng, máy thấp, góc rộng', s: { pct: 9, x: 30, y: 70, ngang: 160, cao: -15, fov: 74 } },
]) test(`đặt rồi chiếu lại: ${c.ten}`, () => {
  const T = [3, 4.7, -2], H = 1.4, F = [Math.sin(0.7), Math.cos(0.7)];
  const R = tinhMay({ T, H, F, ...c.s });
  const m = chieu(T, R), a = chieu([T[0], T[1] + H / 2, T[2]], R), b = chieu([T[0], T[1] - H / 2, T[2]], R);
  gan(m.x, c.s.x); gan(m.y, c.s.y);
  const mong = c.s.pct * Math.cos(c.s.cao * Math.PI / 180);   // đoạn thẳng đứng nhìn chếch `cao` độ thì ngắn lại theo cos; lệch tâm + góc rộng làm dài thêm chút (phối cảnh)
  gan(Math.abs(b.y - a.y), mong, mong * 0.12);
  assert.ok(m.sau > 0);
});
test('dấu của góc ngang: dương = máy ở phía tay trái nhân vật (+X khi mặt nhìn +Z)', () => {
  const R = tinhMay({ T: [0, 5, 0], H: 1, F: [0, 1], pct: 30, ngang: 40, fov: 40 });
  assert.ok(R.p[0] > 0 && R.p[2] > 0);
  const mui = chieu([0, 5, 1], R);   // điểm trước mặt nhân vật phải nằm bên TRÁI khung
  assert.ok(mui.x < 50);
});
test('dấu của góc cao: dương = máy cao hơn điểm đặt', () => { assert.ok(tinhMay({ T: [0, 5, 0], H: 1, pct: 30, cao: 20, fov: 40 }).p[1] > 5); });
