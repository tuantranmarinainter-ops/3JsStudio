import test from 'node:test';
import assert from 'node:assert/strict';
import { gopMon, MUC } from '../thu-vien-asset.mjs';

const o = (ten_en, kw, nhom, khung, extra = {}) => ({ ten: ten_en, ten_en, nhom, mau: ['#fff'], vat_lieu: 'Wood', kich_thuoc_stud: '1x1x1', tu_khoa_store: [kw], shot: 's001', khung, video: 'v', dia_diem: 'd', dia_diem_ten: 'D', ...extra });

test('gộp món trùng, giữ ảnh cắt lớn nhất và ghi nơi xuất hiện', () => {
  const m = gopMon([o('Red brick wall', 'brick wall', 'nha-cua', [0, 0, 0.1, 0.1]), o('Red brick wall far', 'red brick wall', 'canh-quan', [0, 0, 0.5, 0.5], { shot: 's009' }), o('Wooden door', 'wooden door', 'nha-cua', [0, 0, 0.2, 0.2])]);
  assert.equal(m.length, 2);
  const t = m.find((x) => x.khoa === 'tuong-gach');
  assert.equal(t.xuatHien.length, 2);
  assert.equal(t.anh.shot, 's009');
  assert.equal(t.muc, 'nha');
});

test('món không khớp luật rơi về mục theo nhóm; mọi mục con hợp lệ', () => {
  const m = gopMon([o('Hamster wheel', 'hamster wheel', 'do-dung', [0, 0, 0.2, 0.2]), o('Mystery', 'mystery', 'khac', null)]);
  assert.deepEqual(m.map((x) => x.muc).sort(), ['do-dung', 'khac']);
  for (const x of m) assert.ok(MUC.find((u) => u.id === x.muc).con.some((c) => c[0] === x.con));
});
