import test from 'node:test';
import assert from 'node:assert/strict';
import { chamShot, doiToaDo } from '../kiem-chuyen-dong.mjs';

const cam = (p, d, fov = 40) => ({ p, d, fov });
const moc = (c, nv = {}) => ({ cam: c, nv });
const mau = (dau, cuoi, giua, nv = {}) => ({ id: 's001', nvLayDuoc: true, dau: moc(dau, nv.dau), cuoi: moc(cuoi, nv.cuoi), giua: giua ? moc(giua, nv.giua) : undefined });
const T = [0, 0, -1];
const co = (r, s) => r.loi.some((x) => x.startsWith(s));

test('camera đứng im, không nhân vật: đứng im hoàn toàn', () => {
  const c = cam([0, 2, 10], T);
  const r = chamShot(mau(c, c));
  assert.equal(r.camDungIm, true); assert.equal(r.loaiCam, 'dung');
  assert.ok(co(r, 'ĐỨNG IM HOÀN TOÀN'));
});
test('camera đứng im nhưng nhân vật đi: chỉ lỗi camera', () => {
  const c = cam([0, 2, 10], T);
  const r = chamShot(mau(c, c, null, { dau: { ga: { p: [0, 0, 0], yaw: 0 } }, cuoi: { ga: { p: [0, 0, -5], yaw: 0 } } }));
  assert.equal(r.nvDungIm, false);
  assert.ok(co(r, 'CAMERA ĐỨNG IM')); assert.ok(!co(r, 'ĐỨNG IM HOÀN TOÀN'));
});
test('nhân vật quay trên 2° thì không đứng im', () => {
  const c = cam([0, 2, 10], T);
  const r = chamShot(mau(c, c, null, { dau: { ga: { p: [0, 0, 0], yaw: 0 } }, cuoi: { ga: { p: [0, 0, 0], yaw: 5 } } }));
  assert.equal(r.nvDungIm, false);
});
test('zoom in', () => {
  const r = chamShot(mau(cam([0, 2, 10], T), cam([0, 2, 5], T)));
  assert.equal(r.loaiCam, 'zoomIn'); assert.equal(r.loi.length, 0);
});
test('zoom out', () => {
  assert.equal(chamShot(mau(cam([0, 2, 5], T), cam([0, 2, 10], T))).loaiCam, 'zoomOut');
});
test('zoom bằng fov', () => {
  assert.equal(chamShot(mau(cam([0, 2, 10], T), cam([0, 2, 10], T, 25))).loaiCam, 'zoomIn');
});
test('lia (camera đứng chỗ, xoay hướng)', () => {
  const r = chamShot(mau(cam([0, 2, 10], T), cam([0, 2, 10], [Math.sin(0.5), 0, -Math.cos(0.5)])));
  assert.equal(r.loaiCam, 'lia'); assert.equal(r.camDungIm, false);
});
test('theo nhân vật đi', () => {
  const r = chamShot(mau(cam([0, 2, 10], T), cam([0, 2, 4], T), null, { dau: { ga: { p: [0, 0, 0], yaw: 180 } }, cuoi: { ga: { p: [0, 0, -6], yaw: 180 } } }));
  assert.equal(r.loaiCam, 'theo');
});
test('đường cong: mẫu giữa lệch xa đường đầu–cuối', () => {
  const d = [1, 0, 0];
  const cong = chamShot(mau(cam([0, 2, 10], T), cam([10, 2, 10], T), cam([5, 2, 17], T)));
  assert.equal(cong.khongThang, true);
  const thang = chamShot(mau(cam([0, 2, 10], T), cam([10, 2, 10], T), cam([5, 2, 10.2], T)));
  assert.equal(thang.khongThang, false); void d;
});
const bang = (loai, hinh = 2, extra = {}) => ({ id: 's001', boiCanh: 'pho', hinh, camera: { loai }, ...extra });
const kitMay = (dau, cuoi) => ({ id: 's001', may: { dau, cuoi } });
const KD = { p: [0, 2, 10], nhin: [0, 2, 0], fov: 40 }, KC = { p: [0, 2, 5], nhin: [0, 2, 0], fov: 40 };
test('khớp kit', () => {
  const r = chamShot(mau(cam([0, 2, 10], T), cam([0, 2, 5], T)), { bangShot: bang('zoomIn'), kit: kitMay(KD, KC) });
  assert.deepEqual(r.loi, []);
});
test('lệch kit vị trí', () => {
  const r = chamShot(mau(cam([0, 2, 10], T), cam([0, 2, 8], T)), { kit: kitMay(KD, KC) });
  assert.ok(co(r, 'LỆCH KIT: camera cuoi')); assert.ok(r.loi[0].includes('vị trí'));
});
test('lệch kit fov', () => {
  const r = chamShot(mau(cam([0, 2, 10], T, 40), cam([0, 2, 5], T, 48)), { kit: kitMay(KD, KC) });
  assert.ok(r.loi.some((x) => x.includes('fov lệch')));
});
test('lệch kit hướng', () => {
  const r = chamShot(mau(cam([0, 2, 10], [0.3, 0, -1]), cam([0, 2, 5], T)), { kit: kitMay(KD, KC) });
  assert.ok(r.loi.some((x) => x.includes('hướng lệch')));
});
test('sai loại', () => {
  const r = chamShot(mau(cam([0, 2, 10], T), cam([0, 2, 5], T)), { bangShot: bang('zoomOut') });
  assert.ok(co(r, 'SAI LOẠI'));
});
test('hinh 2 mà đứng im', () => {
  const c = cam([0, 2, 10], T);
  const r = chamShot(mau(c, c), { bangShot: bang('zoomIn', 2) });
  assert.ok(co(r, 'KHÔNG CÓ CHUYỂN ĐỘNG'));
});
test('bảng ghi dung thì camera đứng im chỉ là cảnh báo', () => {
  const c = cam([0, 2, 10], T);
  const r = chamShot(mau(c, c, null, { dau: { ga: { p: [0, 0, 0], yaw: 0 } }, cuoi: { ga: { p: [0, 0, -3], yaw: 0 } } }), { bangShot: bang('dung', 1) });
  assert.equal(r.loi.length, 0); assert.ok(r.canhBao.length >= 1);
});
test('nhân vật lệch kit', () => {
  const c0 = cam([0, 2, 10], T), c1 = cam([0, 2, 5], T);
  const kit = { ...kitMay(KD, KC), nhanVat: [{ id: 'ga', dau: [0, 0, 0], cuoi: [0, 0, -2] }] };
  const ok = chamShot(mau(c0, c1, null, { dau: { ga: { p: [0, 0, 0], yaw: 0 } }, cuoi: { ga: { p: [0, 0, -2], yaw: 0 } } }), { kit });
  assert.ok(!co(ok, 'NHÂN VẬT LỆCH'));
  const sai = chamShot(mau(c0, c1, null, { dau: { ga: { p: [0, 0, 0], yaw: 0 } }, cuoi: { ga: { p: [0, 0, -5], yaw: 0 } } }), { kit });
  assert.ok(co(sai, 'NHÂN VẬT LỆCH'));
});
test('doiToaDo: dịch và xoay 90°', () => {
  assert.deepEqual(doiToaDo([1, 2, 3], undefined), [1, 2, 3]);
  assert.deepEqual(doiToaDo([1, 2, 3], { goc: [10, 0, -5] }), [11, 2, -2]);
  const q = doiToaDo([1, 0, 0], { goc: [10, 0, 0], xoay: 90 });
  assert.ok(Math.abs(q[0] - 10) < 1e-9 && Math.abs(q[2] + 1) < 1e-9);
});
test('kit có đổi toạ độ bằng goc theo bối cảnh', () => {
  const g = { pho: { goc: [100, 0, 0], xoay: 0 } };
  const r = chamShot(mau(cam([100, 2, 10], T), cam([100, 2, 5], T)), { bangShot: bang('zoomIn'), kit: kitMay(KD, KC), goc: g });
  assert.deepEqual(r.loi, []);
  const xoay = { pho: { goc: [0, 0, 0], xoay: 90 } };   // kit nhìn về -z → sau xoay 90° nhìn về -x
  const r2 = chamShot(mau(cam([10, 2, 0], [-1, 0, 0]), cam([5, 2, 0], [-1, 0, 0])), { bangShot: bang('zoomIn'), kit: kitMay(KD, KC), goc: xoay });
  assert.deepEqual(r2.loi, []);
});
