import test from 'node:test';
import assert from 'node:assert/strict';
import { doiDiem, doiHuongRad, chonGoc } from '../kit-toa-do.mjs';
import { doiToaDo } from '../kiem-chuyen-dong.mjs';
import { kitSangShots } from '../kit-shots.mjs';

const gan = (a, b) => a.forEach((v, i) => assert.ok(Math.abs(v - b[i]) < 1e-9, `${a} != ${b}`));

test('xoay 90°: +Z → +X, +X → −Z; rồi dịch', () => {
  gan(doiDiem([0, 0, 1], { xoay: 90 }), [1, 0, 0]);
  gan(doiDiem([1, 0, 0], { xoay: 90 }), [0, 0, -1]);
  gan(doiDiem([1, 2, 3], { goc: [10, 5, -5], xoay: 90 }), [13, 7, -6]);
  assert.ok(Math.abs(doiHuongRad(90, { xoay: 90 }) - Math.PI) < 1e-12);
});

test('chonGoc: dùng chung hoặc theo bối cảnh', () => {
  assert.deepEqual(chonGoc({ xoay: 5 }, 'x'), { xoay: 5 });
  assert.deepEqual(chonGoc({ pho: { xoay: 5 } }, 'pho'), { xoay: 5 });
  assert.equal(chonGoc({ pho: {} }, 'khac'), null);
  assert.equal(chonGoc(null, 'pho'), null);
});

test('hai công cụ cho cùng kết quả đổi toạ độ', () => {
  const g = { goc: [100, 0, -30], xoay: 37 };
  for (const p of [[0, 8, 10], [-3, 2, 7], [14, 0, 0]]) {
    gan(doiToaDo(p, g), doiDiem(p, g));
    const bs = { ep: 'm', shots: [{ id: 's1', dur: 1, hinh: 2, boiCanh: 'pho', nhanVat: [], camera: { loai: 'zoomOut', gocMay: 'thuong', coKhung: ['toan'] } }] };
    const kit = { shots: [{ id: 's1', may: { dau: { p, nhin: [0, 1, 0], fov: 40 }, cuoi: { p: [1, 2, 3], nhin: [0, 1, 0], fov: 40 } }, nhanVat: [] }], nhanVat: [] };
    const cam = kitSangShots(bs, kit, { pho: g }).shots[0].cam;
    gan(cam.p, doiDiem(p, g).map((v) => Math.round(v * 1000) / 1000));
  }
});
