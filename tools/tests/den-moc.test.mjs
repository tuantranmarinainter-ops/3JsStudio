// Đèn theo mốc (engine/den-moc.js): hàm thuần của t, bậc thang / fade / chớp / carry-forward.
import test from 'node:test';
import assert from 'node:assert/strict';
import { danhGia, trai, BANG_MAU, mauRGB } from '../../engine/den-moc.js';

const cues = [{ at: 0, pool: 0, hemi: 0.5, hemiColor: 'lanh' }, { at: 1, pool: 1, hemi: 1, hemiColor: 'goc', flick: true }, { at: 2, sun: 0.2, fade: 0.5 }];

test('trước mốc đầu = mặc định env (hệ số 1, không màu)', () => {
  const v = danhGia([{ at: 1, pool: 0 }], 0.5);
  assert.deepEqual([v.pool, v.hemi, v.sun, v.env, v.hemiColor], [1, 1, 1, 1, null]);
});
test('bậc thang + giữ trường không ghi từ mốc trước', () => {
  const v = danhGia(cues, 0.3); assert.equal(v.pool, 0); assert.equal(v.hemi, 0.5); assert.equal(v.hemiColor, 'lanh');
  const w = danhGia(cues, 2.6); assert.equal(w.pool, 1); assert.equal(w.sun, 0.2); assert.equal(w.hemiColor, null);   // 'goc' = trả màu gốc
});
test('chớp bật đèn 1 → 0,25 → 1 (mỗi nấc 2 khung @30)', () => {
  const f = (n) => danhGia(cues, 1 + (n + 0.01) / 30, 30).pool;
  assert.deepEqual([0, 1, 2, 3, 4, 5].map(f), [1, 1, 0.25, 0.25, 1, 1]);
  assert.equal(danhGia(cues, 1.2).sun, 1);   // chớp chỉ áp trường đã đổi ở mốc đó
});
test('fade smoothstep và tất định khi tua tới/lui', () => {
  const a = danhGia(cues, 2.25).sun; assert.ok(a < 1 && a > 0.2);
  const T = trai(cues), seq = [0.1, 2.25, 1.05, 2.25, 0.1].map((t) => danhGia(T, t).sun);
  assert.equal(seq[1], seq[3]); assert.equal(seq[0], seq[4]);
});
test('bảng màu ấm/lạnh', () => {
  assert.deepEqual(mauRGB('am'), [1.0, 0.7, 0.4]); assert.deepEqual(BANG_MAU.lanh, [0.55, 0.62, 1.0]); assert.equal(mauRGB('#ff0000'), null);
});
