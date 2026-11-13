import test from 'node:test';
import assert from 'node:assert/strict';
import { STYLES, KIEU, ganMau, KHOANG_KE, capHopLe, bam } from '../../engine/town-styles.js';

// lưới như engine/town.js mặc định: 7 khối × 4 nhà, 2 dãy × 2, khối cách 80
const lay = () => { const hs = []; let idx = 1; for (const [bx, bz] of [[0, 0], [0, 1], [0, 2], [1, 0], [1, 2], [2, 0], [2, 2]]) for (const sd of [1, -1]) for (const k of [-1, 1]) hs.push({ idx: idx++, x: (bx - 1) * 80 + k * 16, z: (bz - 1) * 80 + sd * 15 }); return hs; };
const ke = (a, b) => Math.hypot(a.x - b.x, a.z - b.z) < KHOANG_KE;

for (const kieu of KIEU) test(`bảng ${kieu}: hàng xóm không trùng, phân bố đều, tất định`, () => {
  const hs = lay(), vai = [{ ten: 'bakery', idx: 13 }, { ten: 'tailor', idx: 21 }];
  for (const seed of [1, 7, 21, 99]) {
    const m = ganMau(kieu, hs, { seed, vai }), m2 = ganMau(kieu, hs, { seed, vai });
    assert.deepEqual(m, m2);
    const dem = {};
    for (const a of hs) {
      dem[m[a.idx].tuongGoc] = (dem[m[a.idx].tuongGoc] || 0) + 1;
      for (const b of hs) if (a.idx < b.idx && ke(a, b)) {
        assert.notEqual(m[a.idx].tuongGoc, m[b.idx].tuongGoc, `${kieu} seed ${seed}: nhà ${a.idx}/${b.idx} trùng tường`);
        assert.notEqual(m[a.idx].tuongGoc + m[a.idx].maiGoc, m[b.idx].tuongGoc + m[b.idx].maiGoc);
      }
    }
    assert.ok(Math.max(...Object.values(dem)) <= Math.ceil(hs.length * 0.3), `${kieu} màu nhiều nhất ${JSON.stringify(dem)}`);
    for (const h of hs) if (!m[h.idx].vai) assert.ok(capHopLe(STYLES[kieu], m[h.idx].tuongGoc, m[h.idx].maiGoc), 'cặp tường–mái hợp lệ');
    assert.ok(m[13].vai === 'bakery' && m[13].tuongGoc !== m[21].tuongGoc);
    assert.ok(!STYLES[kieu].tuong.some(([c]) => c === m[13].tuongGoc), 'nhà có vai dùng màu nhấn riêng');
  }
});

test('nhà có vai khai tay được giữ nguyên (sau lệch sáng ±5%)', () => {
  const m = ganMau('pastel', lay(), { seed: 3, vai: [{ ten: 'mayor', idx: 5 }], nha: { mayor: { tuong: '#336699', mai: '#cc3333' } } });
  assert.equal(m[5].tuongGoc, '#336699'); assert.equal(m[5].maiGoc, '#cc3333');
});
test('bam: [0,1) và tất định', () => { for (let i = 0; i < 200; i++) { const v = bam(5, i); assert.ok(v >= 0 && v < 1); assert.equal(v, bam(5, i)); } });

test('11 bảng, mỗi bảng đủ vai màu, màu nhấn không nằm trong bảng tường, mỗi tường có ≥ 1 mái hợp lệ', () => {
  assert.equal(KIEU.length, 11);
  for (const k of ['keo-ngot', 'dia-trung-hai', 'rung-thu', 'sa-mac', 'dem-neon', 'nhat-ban']) assert.ok(KIEU.includes(k), k);
  for (const [k, st] of Object.entries(STYLES)) {
    for (const f of ['tuong', 'mai', 'vien', 'cua', 'nhan']) assert.ok(st[f].length >= 3, `${k}.${f}`);
    for (const n of st.nhan) assert.ok(!st.tuong.some(([c]) => c === n.tuong), `${k}: nhấn trùng tường ${n.tuong}`);
    for (const [t] of st.tuong) assert.ok(st.mai.some(([m]) => capHopLe(st, t, m)), `${k}: tường ${t} không có mái hợp lệ`);
  }
});
