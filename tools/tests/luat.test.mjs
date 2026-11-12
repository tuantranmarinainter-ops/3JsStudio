import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { LUAT, kiemShot, nguong } from '../kiem/luat.mjs';
import { tao } from './_ham.mjs';

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
  const ch = (dat, hat) => co([{ ten: 'c', chamDat: dat, hatGan: hat }], {});
  assert.equal(LUAT.L6(ctx({ m: [ch(false, 0), ch(true, 0), ch(true, 0)] }), ng).ok, false);   // vừa chạm, không hạt
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
  assert.equal(LUAT.L10(ctx({ mask: mask1, m: bo3(v2) }), ng).ok, true); // 1 thành phần chồng cả hai bbox: đủ (không đòi số thành phần = số vật)
  const v2xa = mk([{ ten: 'a', vai: 'hero', bbox: [0.2, 0.2, 0.7, 0.8], trongKhung: 1, che: 0 }, { ten: 'b', vai: 'nha', bbox: [0.9, 0.9, 1, 1], trongKhung: 1, che: 0 }]);
  const kx = LUAT.L10(ctx({ mask: mask1, m: bo3(v2xa) }), ng);
  assert.equal(kx.ok, false); assert.deepEqual(kx.val.thieu, ['b']);   // vật b không có thành phần nào chồng
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

// ---- Vòng sửa 1 ----
test('kiemShot bắt lỗi từng luật', () => {
  const r = kiemShot(ctx({ anh: [anhMot(0), anhMot(0), tao(16, 16, () => 0)] }), ng);
  assert.equal(r.L4.ok, false); assert.equal(r.L4.skip, 'loi'); assert.match(r.L4.ghiChu, /^loi: /);
  assert.equal(r.L11.ok, true); assert.equal(Object.keys(r).length, 11);
});

test('m có phần tử null / trường thiếu không ném lỗi', () => {
  const dayDu = mk([{ ten: 'nha', vai: 'nha', bbox: [0.1, 0.1, 0.9, 0.9], trongKhung: 1, che: 0, nghieng: 9 }], { chan: [{ ten: 'c', chamDat: true, hatGan: 2 }] });
  const phong = nhieuAnh();
  const base = { anh: [phong, phong, phong], mask: tao(50, 50, (x, y) => (x < 20 && y < 30) ? 0 : 255), env: { dem: true, tuyet: true, mua: false } };
  for (const m of [[dayDu, null, dayDu], [null, null, dayDu], [dayDu, null, null], [null, null, null]]) {
    for (const type of ['sinkTilt', 'insertRead', 'chase', 'establish']) {
      const r = kiemShot(ctx({ ...base, shot: { id: 's', type, dur: 2 }, m }), ng);
      for (const [ma, v] of Object.entries(r)) assert.notEqual(v.skip, 'loi', ma + ' loi: ' + v.ghiChu);
    }
  }
  // khung giữa null -> dùng khung gần nhất
  const sh = { id: 's', type: 'sinkTilt', dur: 2 };
  assert.equal(LUAT.L5(ctx({ shot: sh, m: [dayDu, null, null] }), ng).ok, true);
  // cả 3 null -> như m === null
  assert.ok(LUAT.L5(ctx({ shot: sh, m: [null, null, null] }), ng).skip);
  assert.ok(LUAT.L6(ctx({ m: [null, null, null] }), ng).skip);
  assert.ok(LUAT.L9(ctx({ m: [null, null, null] }), ng).skip);
  // trường thiếu hoàn toàn
  const trong = { t: 0 };
  for (const ma of ['L1', 'L3', 'L5', 'L6', 'L8', 'L9', 'L10']) {
    const r = LUAT[ma](ctx({ shot: sh, m: [trong, trong, trong], mask: base.mask, anh: base.anh }), ng);
    assert.notEqual(r.skip, 'loi');
  }
  assert.equal(LUAT.L8(ctx({ anh: base.anh, m: [trong, trong, trong] }), ng).ghiChu, 'chua-gan-tang'); // tầng thiếu = chưa gắn
  assert.equal(LUAT.L10(ctx({ mask: base.mask, m: [null, dayDu, null] }), ng).ok, true); // 1 nha, 1 thành phần
});

test('val serialize được (JSON) và hữu hạn', () => {
  const g = anhMot(50);
  const hero = mk([{ ten: 'h', vai: 'hero', bbox: [0.3, 0.2, 0.6, 0.8], che: 0 }]); // thiếu trongKhung
  const r4 = LUAT.L4(ctx({ anh: [g, g, g] }), ng);
  assert.equal(r4.val, 100); assert.equal(r4.ok, false);
  const r3 = LUAT.L3(ctx({ m: bo3(hero) }), ng);
  assert.equal(r3.val.trongKhung, 0); assert.ok(r3.ghiChu); assert.equal(r3.ok, false);
  const kq = kiemShot(ctx({ anh: [g, g, g], m: bo3(hero), mask: tao(20, 20, () => 255) }), ng);
  assert.deepEqual(JSON.parse(JSON.stringify(kq)), kq);
  const so = (o) => { for (const v of Object.values(o ?? {})) { if (typeof v === 'number') assert.ok(Number.isFinite(v)); else if (v && typeof v === 'object') so(v); } };
  for (const v of Object.values(kq)) { if (typeof v.val === 'number') assert.ok(Number.isFinite(v.val)); else so(v.val); }
});

test('ngưỡng ảnh lấy từ ng', () => {
  const sang = tao(32, 32, (x, y) => ((x % 10 < 2) && (y % 10 < 2)) ? 255 : 90);
  const dem = { ...env0, dem: true };
  assert.equal(LUAT.L7(ctx({ env: dem, anh: [sang, sang, sang] }), ng).ok, true);
  const ng2 = { ...ng, L7: { ...ng.L7, nguongSang: 1.1 } }; // không điểm nào đủ sáng
  assert.equal(LUAT.L7(ctx({ env: dem, anh: [sang, sang, sang] }), ng2).ok, false);
  const ng3 = { ...ng, L10: { ...ng.L10, cumMin: 0.9 } };
  assert.equal(LUAT.L10(ctx({ mask: tao(50, 50, (x, y) => (x < 20 && y < 30) ? 0 : 255) }), ng3).ok, false);
  const ng4 = { ...ng, L8: { ...ng.L8, doLech: 0.5 } }; // ảnh một màu vẫn phẳng; ảnh nhẹ lệch không còn phẳng
  const nhe = tao(32, 32, (x) => 100 + (x & 1) * 10);
  assert.equal(LUAT.L8(ctx({ anh: [nhe, nhe, nhe] }), ng).ok, false);
  assert.equal(LUAT.L8(ctx({ anh: [nhe, nhe, nhe] }), ng4).ok, true);
});

test('L2 không thấy vật doc; dx dy; L1 canh + soChan', () => {
  const sh = { id: 's', type: 'insertRead', dur: 2 };
  assert.equal(LUAT.L2(ctx({ shot: sh, m: bo3(mk([])) }), ng).ghiChu, 'khong-thay-vat-doc');
  assert.equal(LUAT.L2(ctx({ shot: sh, m: bo3(mk([])) }), ng).ok, false);
  const d = mk([{ ten: 't', vai: 'doc', bbox: [0.5, 0.4, 0.7, 0.6], trongKhung: 1, che: 0 }]);
  const r = LUAT.L2(ctx({ shot: sh, m: bo3(d) }), ng);
  assert.ok(Math.abs(r.val.dx - 0.1) < 1e-9 && Math.abs(r.val.dy) < 1e-9);
  const l1 = LUAT.L1(ctx({ m: bo3(mk(nha([0.02, 0.1, 0.9, 0.9]))) }), ng);
  assert.equal(l1.val.canh, 'trai'); assert.equal(l1.val.soChan, 4);
  assert.equal(LUAT.L1(ctx({ m: bo3(mk(nha([0.1, 0.1, 0.9, 0.98]))) }), ng).val.canh, 'duoi');
});

// ---- Vòng sửa 1 (reviewer) ----
test('L6 chỉ đòi bụi cho bàn chân VỪA chạm', () => {
  const c = (dat, hat = 0, y = 0) => mk([], { chan: [{ ten: 'c', chamDat: dat, hatGan: hat, y }] });
  assert.equal(LUAT.L6(ctx({ m: [c(true), c(true), c(true)] }), ng).ok, true, 'đứng yên chạm đất cả 3 khung');
  assert.equal(LUAT.L6(ctx({ m: [c(false, 0, 3), c(true, 0), c(true)] }), ng).ok, false, 'vừa chạm không hạt');
  assert.equal(LUAT.L6(ctx({ m: [c(false, 0, 3), c(true, 5), c(true)] }), ng).ok, true, 'vừa chạm có hạt');
  assert.equal(LUAT.L6(ctx({ m: [c(false, 0, 3), c(false, 0, 2), c(false)] }), ng).ok, true, 'không chạm');
  assert.equal(LUAT.L6(ctx({ env: { ...env0, tuyet: true }, m: bo3(mk([], { chan: [] })) }), ng).ok, false, 'hạt rơi giữ nguyên');
});

test('L8 chưa gắn tầng (tổng 0) chỉ kiểm ô phẳng + ghiChu', () => {
  const phong = nhieuAnh();
  const r = LUAT.L8(ctx({ anh: [phong, phong, phong], m: bo3(mk([], { tang: { front: 0, mid: 0, back: 0 } })) }), ng);
  assert.equal(r.ok, true); assert.equal(r.ghiChu, 'chua-gan-tang');
  assert.equal(LUAT.L8(ctx({ m: bo3(mk([], { tang: { front: 0, mid: 0, back: 0 } })) }), ng).ok, false); // ảnh trống vẫn trượt
  assert.equal(LUAT.L8(ctx({ anh: [phong, phong, phong], m: bo3(mk([], { tang: { front: 1, mid: 0, back: 2 } })) }), ng).ok, false);
});

test('bbox null: bỏ qua, không kéo lề về 0', () => {
  const n = nha([0.1, 0.1, 0.9, 0.9]);
  const voiNull = [...n, { ten: 'c4', vai: 'chan-nha', bbox: null, trongKhung: 0, che: 0 }];
  const r1 = LUAT.L1(ctx({ m: bo3(mk(voiNull)) }), ng);
  assert.equal(r1.ok, true); assert.ok(r1.val.le >= 0.1);
  const thieuChan = [...n.slice(0, 3), { ten: 'c3', vai: 'chan-nha', bbox: null, trongKhung: 0, che: 0 }, { ten: 'c4', vai: 'chan-nha', bbox: null, trongKhung: 0, che: 0 }];
  const r2 = LUAT.L1(ctx({ m: bo3(mk(thieuChan)) }), ng);
  assert.equal(r2.ok, false); assert.equal(r2.val.soChan, 2);
  const sh = { id: 's', type: 'insertRead', dur: 2 };
  assert.doesNotThrow(() => LUAT.L2(ctx({ shot: sh, m: bo3(mk([{ ten: 't', vai: 'doc', bbox: null, trongKhung: 0, che: 0 }])) }), ng));
  const r = kiemShot(ctx({ shot: { id: 's', type: 'chase', dur: 2 }, mask: tao(50, 50, () => 255), m: bo3(mk([{ ten: 'h', vai: 'hero', bbox: null, trongKhung: 0, che: 0 }, { ten: 'h/RightUpperArm', vai: 'tay', chu: 'h', bbox: null, trongKhung: 0, che: 0 }])) }), ng);
  for (const [ma, v] of Object.entries(r)) assert.notEqual(v.skip, 'loi', ma + ': ' + v.ghiChu);
});

test('L10: tách thân chỉ xét tay/chân của hero; hero trong nhà không là thành phần riêng', () => {
  const khoi = (...hs) => tao(50, 50, (x, y) => hs.some(([x0, y0, x1, y1]) => x >= x0 && x < x1 && y >= y0 && y < y1) ? 0 : 255);
  const sh = { id: 's', type: 'chase', dur: 2 };
  const hero = { ten: 'hero', vai: 'hero', bbox: [0.2, 0.2, 0.5, 0.8], trongKhung: 1, che: 0, trong: null };
  const tayXa = (chu) => ({ ten: chu + '/RightUpperArm', vai: 'tay', chu, bbox: [0.8, 0.2, 0.9, 0.4], trongKhung: 1, che: 0 });
  const mask1 = khoi([10, 10, 35, 40]);
  // tay của người khác tách xa không được tính
  const rm = LUAT.L10(ctx({ shot: sh, mask: mask1, m: bo3(mk([hero, tayXa('mom')])) }), ng);
  assert.equal(rm.val.tachThan, undefined); assert.match(rm.ghiChu, /khong-du-du-lieu-tach-than/);
  // tay của hero tách xa -> đạt
  assert.equal(LUAT.L10(ctx({ shot: sh, mask: mask1, m: bo3(mk([hero, tayXa('hero')])) }), ng).ok, true);
  // hero trong nhà: 1 thành phần là đủ
  const heroTrong = { ...hero, trong: 'house_family' };
  const nh = { ten: 'house_family', vai: 'nha', bbox: [0, 0, 1, 1], trongKhung: 1, che: 0 };
  assert.equal(LUAT.L10(ctx({ mask: mask1, m: bo3(mk([nh, heroTrong])) }), ng).ok, true);
  assert.equal(LUAT.L10(ctx({ mask: mask1, m: bo3(mk([nh, hero])) }), ng).ok, true);   // cả hai bbox chồng thành phần duy nhất
});

// ---- Task 8 ----
const nhaBo = (le, extra = {}) => mk(nha([le, 0.1, 0.9, 0.9]), extra);
test('L1: chỉ áp khi nhà có chân, là chủ thể và không cận cảnh', () => {
  const ap = LUAT.L1(ctx({ m: bo3(mk(nha([0.1, 0.1, 0.9, 0.9]))) }), ng);
  assert.equal(ap.ok, true); assert.equal(ap.val.apDung, true);
  // (a) nhà không chân
  const khongChan = mk([{ ten: 'nha', vai: 'nha', bbox: [0.02, 0.1, 0.9, 0.9], trongKhung: 1, che: 0 }]);
  const a = LUAT.L1(ctx({ m: bo3(khongChan) }), ng);
  assert.equal(a.ok, true); assert.equal(a.ghiChu, 'nha-khong-chan'); assert.equal(a.val.apDung, false);
  // chân bbox null vẫn đếm là nhà có chân
  const chanNull = mk([...nha([0.02, 0.1, 0.9, 0.9]).slice(0, 1), { ten: 'c', vai: 'chan-nha', bbox: null, trongKhung: 0, che: 0 }]);
  assert.equal(LUAT.L1(ctx({ m: bo3(chanNull) }), ng).ok, false);
  // (b) có người to -> nhà là nền
  const hero = { ten: 'hero', vai: 'hero', bbox: [0.3, 0.1, 0.6, 0.6], trongKhung: 1, che: 0 };
  const b = LUAT.L1(ctx({ m: bo3(mk([...nha([0.02, 0.1, 0.9, 0.9]), hero])) }), ng);
  assert.equal(b.ok, true); assert.equal(b.ghiChu, 'nha-la-nen');
  const heroNho = { ...hero, bbox: [0.3, 0.1, 0.4, 0.3] };   // cao 0.2 < 0.35
  assert.equal(LUAT.L1(ctx({ m: bo3(mk([...nha([0.02, 0.1, 0.9, 0.9]), heroNho])) }), ng).ok, false);
  // (c) cận cảnh: tràn khung / chiếm khung nhỏ
  const c1 = LUAT.L1(ctx({ m: bo3(mk(nha([-2, 0.1, 0.9, 0.9]))) }), ng);
  assert.equal(c1.ok, true); assert.equal(c1.ghiChu, 'can-canh');
  const nhoKhung = nha([0.1, 0.1, 0.9, 0.9]); nhoKhung[0] = { ...nhoKhung[0], trongKhung: 0.1 };
  assert.equal(LUAT.L1(ctx({ m: bo3(mk(nhoKhung)) }), ng).ghiChu, 'can-canh');
});

test('L6: không có thẻ hạt nào -> skip', () => {
  const m = bo3(mk([], { soTheHat: 0, chan: [] }));
  const r = LUAT.L6(ctx({ env: { ...env0, tuyet: true }, m }), ng);
  assert.equal(r.skip, 'khong-co-the-hat'); assert.equal(r.ok, true);
  assert.equal(LUAT.L6(ctx({ env: { ...env0, tuyet: true }, m: bo3(mk([], { soTheHat: 3, chan: [] })) }), ng).ok, false);
});

test('L10: không vật cần, phủ kín, thành phần mồ côi', () => {
  const khoi = (...hs) => tao(50, 50, (x, y) => hs.some(([x0, y0, x1, y1]) => x >= x0 && x < x1 && y >= y0 && y < y1) ? 0 : 255);
  const hero = { ten: 'h', vai: 'hero', bbox: [0.1, 0.1, 0.5, 0.7], trongKhung: 1, che: 0 };
  assert.equal(LUAT.L10(ctx({ mask: khoi([10, 10, 30, 40]), m: bo3(mk([])) }), ng).ghiChu, 'khong-co-vat-chinh');
  const phu = LUAT.L10(ctx({ mask: tao(50, 50, () => 0), m: bo3(mk([hero])) }), ng);
  assert.equal(phu.skip, 'mask-phu-kin'); assert.equal(phu.ok, true);
  // thành phần thứ hai không chồng bbox nào -> mồ côi
  const mc = LUAT.L10(ctx({ mask: khoi([5, 5, 25, 35], [40, 40, 48, 48]), m: bo3(mk([hero])) }), ng);
  assert.equal(mc.ok, false); assert.match(mc.ghiChu, /thanh-phan-mo-coi/);
  // thành phần thứ hai trùng bbox của tay -> không mồ côi
  const tay = { ten: 'h/tay', vai: 'tay', chu: 'h', bbox: [0.78, 0.78, 0.98, 0.98], trongKhung: 1, che: 0 };
  assert.equal(LUAT.L10(ctx({ mask: khoi([5, 5, 25, 35], [40, 40, 48, 48]), m: bo3(mk([hero, tay])) }), ng).ok, true);
  // thành phần nhỏ dưới moCoiMin bị bỏ
  assert.equal(LUAT.L10(ctx({ mask: khoi([5, 5, 25, 35], [45, 45, 47, 47]), m: bo3(mk([hero])) }), ng).ok, true);
});

test('tat + rieng theo shot', () => {
  const ngT = { ...ng, L11: { ...ng.L11, tat: true } };
  const r = kiemShot(ctx({ shot: { id: 's9', type: 'x', dur: 0.1 } }), ngT);
  assert.deepEqual(r.L11, { ok: true, val: null, nguong: null, skip: 'tat' });
  const ngR = { ...ng, rieng: { s9: { L11: { macDinh: 0.05 }, L4: { tat: true } } } };
  const r2 = kiemShot(ctx({ shot: { id: 's9', type: 'x', dur: 0.1 } }), ngR);
  assert.equal(r2.L11.ok, true); assert.equal(r2.L11.nguong, 0.05); assert.equal(r2.L4.skip, 'tat');
  const r3 = kiemShot(ctx({ shot: { id: 's8', type: 'x', dur: 0.1 } }), ngR);
  assert.equal(r3.L11.ok, false); assert.notEqual(r3.L4.skip, 'tat');
});

test('L3: cận cảnh (bbox hero lớn hơn khung) miễn trongKhung, vẫn xét che mặt', () => {
  const hero = (bbox, tk, che = 0) => mk([{ ten: 'hero', vai: 'hero', bbox, trongKhung: tk, che: 0, mat: { che } }]);
  const gan = LUAT.L3(ctx({ m: bo3(hero([-1, -1, 2, 2], 0.1)) }), ng);
  assert.equal(gan.ok, true); assert.match(gan.ghiChu, /can-canh/);
  assert.equal(LUAT.L3(ctx({ m: bo3(hero([-1, -1, 2, 2], 0.1, 0.5)) }), ng).ok, false);
  assert.equal(LUAT.L3(ctx({ m: bo3(hero([0.5, 0.2, 1.3, 0.8], 0.1)) }), ng).ok, false);   // chỉ 10% trong khung, không phải cận cảnh
});
