import test from 'node:test';
import assert from 'node:assert/strict';
import { tao } from './_ham.mjs';
import { psnr, tyLeToi, diemSang, oPhang, thanhPhan } from '../kiem/anh.mjs';

const den = () => tao(64, 64, () => 0);
const trang = () => tao(64, 64, () => 255);

test('psnr: giống hệt = Infinity, khác thì hữu hạn', () => {
  assert.equal(psnr(den(), den()), Infinity);
  const p = psnr(den(), trang());
  assert.ok(Number.isFinite(p) && p < 1);
});
test('tyLeToi: đen 1, trắng 0', () => {
  assert.equal(tyLeToi(den()), 1);
  assert.equal(tyLeToi(trang()), 0);
});
test('diemSang: 3 chấm rời = 3, ảnh đen = 0, chấm quá nhỏ bị bỏ', () => {
  const chamTai = (cs) => tao(64, 64, (x, y) => cs.some(([cx, cy]) => x >= cx && x < cx + 3 && y >= cy && y < cy + 3) ? 255 : 0);
  assert.equal(diemSang(chamTai([[5, 5], [30, 30], [50, 10]])), 3);
  assert.equal(diemSang(den()), 0);
  const nho = tao(64, 64, (x, y) => (x === 10 && y === 10) ? 255 : 0);
  assert.equal(diemSang(nho), 0);
});
test('oPhang: một màu = 1, bàn cờ = 0', () => {
  assert.equal(oPhang(tao(64, 64, () => 128)), 1);
  assert.equal(oPhang(tao(64, 64, (x, y) => ((x + y) & 1) ? 255 : 0)), 0);
});
test('thanhPhan nhận ngưỡng tuỳ chỉnh', () => {
  const m = tao(20, 20, (x, y) => (x < 4 && y < 4) ? 100 : 255);
  assert.equal(thanhPhan(m).length, 1);
  assert.equal(thanhPhan(m, { nguongDen: 0.3 }).length, 0);
  assert.equal(thanhPhan(m, { cumMin: 0.5 }).length, 0);
});
test('thanhPhan: 2 khối đen rời = 2, bỏ cụm < 0,1%', () => {
  const mask = tao(64, 64, (x, y) => ((x < 10 && y < 10) || (x >= 40 && x < 55 && y >= 40 && y < 55)) ? 0 : 255);
  const tp = thanhPhan(mask);
  assert.equal(tp.length, 2);
  assert.ok(tp[0].dienTich > tp[1].dienTich && tp[0].dienTich < 1);
  assert.equal(tp[1].bbox.length, 4);
  assert.equal(thanhPhan(tao(64, 64, (x, y) => (x === 3 && y === 3) ? 0 : 255)).length, 0);
});
