import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { LUAT, kiemShot, nguong } from '../kiem/luat.mjs';
import { tao } from './anh.test.mjs';

const ng = nguong(path.join(os.tmpdir(), 'khong-co-ep-nao'));
const env0 = { dem: false, tuyet: false, mua: false };
const anhMot = (v) => tao(32, 32, () => v);
const nhieuAnh = () => tao(32, 32, (x, y) => ((x + y) & 1) ? 255 : 0);
const mk = (vat = [], extra = {}) => ({ t: 0, shot: 's', cam: {}, vat, chan: [], hat: { bui: 0, tuyet: 0, mua: 0 }, tang: { front: 1, mid: 1, back: 1 }, vatLieu: [], ...extra });
const bo3 = (m) => [m, m, m];
const ctx = (o = {}) => ({ shot: { id: 's1', type: 'establish', dur: 2 }, m: null, anh: [anhMot(128), anhMot(128), anhMot(128)], mask: null, env: env0, ...o });
const nha = (bbox) => [{ ten: 'nha', vai: 'nha', bbox, trongKhung: 1, che: 0 }, ...[0, 1, 2, 3].map((i) => ({ ten: 'c' + i, vai: 'chan-nha', bbox: [0.3 + i * 0.1, 0.8, 0.35 + i * 0.1, 0.9], trongKhung: 1, che: 0 }))];

test('nguong: mặc định, trộn sâu, file hỏng', () => {
  assert.equal(ng.L1.le, 0.05);
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'ep-'));
  fs.writeFileSync(path.join(d, 'quy-trinh.json'), '{"L1":{"le":0.1}}');
  const n = nguong(d);
  assert.equal(n.L1.le, 0.1); assert.equal(n.L1.soChan, 4);
  fs.writeFileSync(path.join(d, 'quy-trinh.json'), '{hong');
  assert.throws(() => nguong(d), /quy-trinh\.json/);
});

test('L1', () => {
  assert.equal(LUAT.L1(ctx({ m: bo3(mk(nha([0.1, 0.1, 0.9, 0.9]))) }), ng).ok, true);
  assert.equal(LUAT.L1(ctx({ m: bo3(mk(nha([0.02, 0.1, 0.9, 0.9]))) }), ng).ok, false);
  const thieu = mk(nha([0.1, 0.1, 0.9, 0.9]).slice(0, 3));
  assert.equal(LUAT.L1(ctx({ m: bo3(thieu) }), ng).ok, false);
  const c = LUAT.L1(ctx({ shot: { id: 's', type: 'closeup', dur: 1, frame: 'close' }, m: bo3(mk(nha([0.02, 0.1, 0.9, 0.9]))) }), ng);
  assert.equal(c.ok, true); assert.ok(c.ghiChu);
  assert.ok(LUAT.L1(ctx(), ng).skip);
});

test('L2', () => {
  const sh = { id: 's', type: 'insertRead', dur: 2 };
  const doc = (bbox, che = 0) => mk([{ ten: 'thiep', vai: 'doc', bbox, trongKhung: 1, che }]);
  assert.equal(LUAT.L2(ctx({ shot: sh, m: bo3(doc([0.3, 0.3, 0.7, 0.7])) }), ng).ok, true);
  assert.equal(LUAT.L2(ctx({ shot: sh, m: bo3(doc([0.0, 0.0, 0.4, 0.4])) }), ng).ok, false);
  assert.equal(LUAT.L2(ctx({ shot: sh, m: bo3(doc([0.3, 0.3, 0.7, 0.7], 0.2)) }), ng).ok, false);
  assert.equal(LUAT.L2(ctx({ shot: sh, m: bo3(doc([0.02, 0.02, 0.98, 0.98])) }), ng).ok, false);
  assert.equal(LUAT.L2(ctx({ m: bo3(doc([0, 0, 0.1, 0.1])) }), ng).ok, true); // không phải insertRead
  assert.ok(LUAT.L2(ctx({ shot: sh }), ng).skip);
});

test('L3', () => {
  const hero = (tk, che = 0) => mk([{ ten: 'hero', vai: 'hero', bbox: [0.3, 0.2, 0.6, 0.8], trongKhung: tk, che: 0, mat: { che } }]);
  assert.equal(LUAT.L3(ctx({ m: bo3(hero(0.95)) }), ng).ok, true);
  assert.equal(LUAT.L3(ctx({ m: bo3(hero(0.3)) }), ng).ok, false);
  assert.equal(LUAT.L3(ctx({ m: bo3(hero(0.95, 0.5)) }), ng).ok, false);
  assert.equal(LUAT.L3(ctx({ m: bo3(mk([])) }), ng).ok, true); // không có hero
  assert.ok(LUAT.L3(ctx(), ng).skip);
});

test('L4', () => {
  assert.equal(LUAT.L4(ctx({ anh: [anhMot(0), anhMot(0), anhMot(255)] }), ng).ok, true);
  assert.equal(LUAT.L4(ctx({ anh: [anhMot(100), anhMot(0), anhMot(100)] }), ng).ok, false);
  const t = LUAT.L4(ctx({ shot: { id: 's', type: 'closeup', dur: 1, static: true }, anh: [anhMot(100), anhMot(0), anhMot(100)] }), ng);
  assert.equal(t.ok, true); assert.ok(t.ghiChu);
});

test('L5', () => {
  const sh = { id: 's', type: 'sinkTilt', dur: 2 };
  const nh = (o) => mk([{ ten: 'nha', vai: 'nha', bbox: [0, 0, 1, 1], trongKhung: 1, che: 0, ...o }]);
  assert.equal(LUAT.L5(ctx({ shot: sh, m: bo3(nh({ nghieng: 8 })) }), ng).ok, true);
  assert.equal(LUAT.L5(ctx({ shot: sh, m: bo3(nh({ chim: 0.7 })) }), ng).ok, true);
  assert.equal(LUAT.L5(ctx({ shot: sh, m: bo3(nh({ nghieng: 1, chim: 0.1 })) }), ng).ok, false);
  assert.equal(LUAT.L5(ctx({ m: bo3(nh({ nghieng: 0 })) }), ng).ok, true); // khác sinkTilt
  assert.ok(LUAT.L5(ctx({ shot: sh }), ng).skip);
});

test('L6', () => {
  const co = (chan, hat) => mk([], { chan, hat: { bui: 0, tuyet: 0, mua: 0, ...hat } });
  assert.equal(LUAT.L6(ctx({ m: bo3(co([{ ten: 'c', chamDat: true, hatGan: 3 }], {})) }), ng).ok, true);
  assert.equal(LUAT.L6(ctx({ m: bo3(co([{ ten: 'c', chamDat: true, hatGan: 0 }], {})) }), ng).ok, false);
  assert.equal(LUAT.L6(ctx({ m: bo3(co([{ ten: 'c', chamDat: false, hatGan: 0 }], {})) }), ng).ok, true);
  assert.equal(LUAT.L6(ctx({ env: { ...env0, tuyet: true }, m: bo3(co([], { tuyet: 0 })) }), ng).ok, false);
  assert.equal(LUAT.L6(ctx({ env: { ...env0, tuyet: true }, m: bo3(co([], { tuyet: 5 })) }), ng).ok, true);
  assert.equal(LUAT.L6(ctx({ env: { ...env0, mua: true }, m: bo3(co([], { mua: 0 })) }), ng).ok, false);
  assert.ok(LUAT.L6(ctx(), ng).skip);
});

test('L7', () => {
  const sang = tao(32, 32, (x, y) => ((x % 10 < 2) && (y % 10 < 2)) ? 255 : 90);
  const toi = anhMot(0);
  assert.equal(LUAT.L7(ctx({ env: { ...env0, dem: true }, anh: [sang, sang, sang] }), ng).ok, true);
  assert.equal(LUAT.L7(ctx({ env: { ...env0, dem: true }, anh: [toi, toi, toi] }), ng).ok, false);
  assert.equal(LUAT.L7(ctx({ anh: [toi, toi, toi] }), ng).ok, true); // không phải đêm
});

test('L8', () => {
  const phong = nhieuAnh();
  assert.equal(LUAT.L8(ctx({ anh: [phong, phong, phong], m: bo3(mk()) }), ng).ok, true);
  assert.equal(LUAT.L8(ctx({ m: bo3(mk()) }), ng).ok, false); // ảnh một màu = trống
  assert.equal(LUAT.L8(ctx({ anh: [phong, phong, phong], m: bo3(mk([], { tang: { front: 1, mid: 0, back: 2 } })) }), ng).ok, false);
  const k = LUAT.L8(ctx({ anh: [phong, phong, phong] }), ng); // m null: chỉ kiểm ảnh
  assert.equal(k.ok, true); assert.ok(k.ghiChu);
});

test('L9', () => {
  const vl = (a) => bo3(mk([], { vatLieu: a }));
  assert.equal(LUAT.L9(ctx({ m: vl([{ ten: 'a', kind: 'wood', nguon: 'khai-bao', grunge: false }]) }), ng).ok, true);
  assert.equal(LUAT.L9(ctx({ m: vl([{ ten: 'a', kind: 'wood', nguon: 'mac-dinh', grunge: false }]) }), ng).ok, false);
  assert.equal(LUAT.L9(ctx({ m: vl([{ ten: 'a', kind: 'chrome', nguon: 'khai-bao', grunge: true }]) }), ng).ok, false);
  assert.equal(LUAT.L9(ctx({ m: vl([{ ten: 'a', kind: 'chrome', nguon: 'khai-bao', grunge: false }]) }), ng).ok, true);
  assert.ok(LUAT.L9(ctx(), ng).skip);
});

test('L10', () => {
  const khoi = (...hs) => tao(50, 50, (x, y) => hs.some(([x0, y0, x1, y1]) => x >= x0 && x < x1 && y >= y0 && y < y1) ? 0 : 255);
  const mask1 = khoi([10, 10, 35, 40]);
  assert.equal(LUAT.L10(ctx({ mask: mask1 }), ng).ok, true);
  assert.equal(LUAT.L10(ctx({ mask: khoi([10, 10, 14, 14]) }), ng).ok, false); // nhỏ
  const v2 = mk([{ ten: 'a', vai: 'hero', bbox: [0, 0, 1, 1], trongKhung: 1, che: 0 }, { ten: 'b', vai: 'nha', bbox: [0, 0, 1, 1], trongKhung: 1, che: 0 }]);
  assert.equal(LUAT.L10(ctx({ mask: mask1, m: bo3(v2) }), ng).ok, false); // cần 2 thành phần
  assert.equal(LUAT.L10(ctx({ mask: khoi([2, 2, 20, 30], [30, 10, 48, 40]), m: bo3(v2) }), ng).ok, true);
  const hd = LUAT.L10(ctx({ shot: { id: 's', type: 'chase', dur: 2 }, mask: mask1 }), ng);
  assert.equal(hd.ok, true); assert.ok(hd.ghiChu); // thiếu dữ liệu tách thân
  assert.equal(LUAT.L10(ctx({ shot: { id: 's', type: 'chase', dur: 2 }, mask: khoi([2, 2, 20, 30], [30, 10, 48, 40]) }), ng).ok, true);
  assert.ok(LUAT.L10(ctx(), ng).skip);
});

test('L11', () => {
  const r = LUAT.L11(ctx({ shot: { id: 's', type: 'insertRead', dur: 1.2 } }), ng);
  assert.equal(r.ok, false); assert.equal(r.val, 1.2); assert.equal(r.nguong, 1.5);
  assert.equal(LUAT.L11(ctx({ shot: { id: 's', type: 'insertRead', dur: 1.5 } }), ng).ok, true);
  assert.equal(LUAT.L11(ctx({ shot: { id: 's', type: 'chase', dur: 0.9 } }), ng).nguong, 1.0);
  assert.equal(LUAT.L11(ctx({ shot: { id: 's', type: 'khac', dur: 0.8 } }), ng).ok, true);
  assert.equal(LUAT.L11(ctx({ shot: { id: 's', type: 'khac', dur: 0.8 } }), ng).nguong, 0.8);
});

test('kiemShot trả đủ 11 mã', () => {
  const r = kiemShot(ctx(), ng);
  assert.deepEqual(Object.keys(r), ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8', 'L9', 'L10', 'L11']);
});
