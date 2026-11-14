// tools/do-nang.mjs: chấm ngưỡng (hàm thuần) + quét đường dẫn tài sản trên chuỗi mẫu.
import test from 'node:test';
import assert from 'node:assert/strict';
import { chamDoNang, quetDuongDanTaiSan, NGUONG_MAC_DINH } from '../do-nang.mjs';

const tt = (kq, k) => kq.muc.find((m) => m.khoa === k)?.tt;

test('ngưỡng mặc định: đạt', () => {
  const kq = chamDoNang({ gopMB: 30, taiSan: [{ file: 'assets/a.glb', mb: 5 }], moGiay: 10, shader: 80 });
  assert.deepEqual(kq.muc.map((m) => m.tt), ['dat', 'dat', 'dat', 'dat']);
  assert.equal(kq.coLoi, false);
});
test('cảnh báo vượt ngưỡng dưới, lỗi vượt ngưỡng trên (biên: > chứ không >=)', () => {
  assert.equal(tt(chamDoNang({ gopMB: 30.1 }), 'gop'), 'canhbao');
  assert.equal(tt(chamDoNang({ gopMB: 45 }), 'gop'), 'canhbao');
  assert.equal(tt(chamDoNang({ gopMB: 51 }), 'gop'), 'loi');
  assert.equal(tt(chamDoNang({ moGiay: 19 }), 'mo'), 'canhbao');
  assert.equal(tt(chamDoNang({ moGiay: 20.5 }), 'mo'), 'loi');
  assert.equal(tt(chamDoNang({ shader: 81 }), 'shader'), 'canhbao');
  assert.equal(tt(chamDoNang({ shader: 132 }), 'shader'), 'loi');
});
test('trường hợp bản gộp tập trước (51 MB, 19 s, 132 shader): có lỗi', () => {
  const kq = chamDoNang({ gopMB: 51, moGiay: 19, shader: 132 });
  assert.deepEqual(kq.muc.map((m) => m.tt), ['loi', 'canhbao', 'loi']);
  assert.equal(kq.coLoi, true);
  assert.ok(kq.muc.every((m) => m.goiY));
});
test('tài sản đơn > 5 MB: cảnh báo, gợi ý nén; thiếu số đo thì bỏ mục', () => {
  const kq = chamDoNang({ taiSan: [{ file: 'assets/to.glb', mb: 6 }, { file: 'assets/nho.glb', mb: 1 }] });
  assert.equal(kq.muc.length, 1);
  assert.equal(kq.muc[0].tt, 'canhbao');
  assert.match(kq.muc[0].goiY, /nen-model\.mjs assets\/to\.glb/);
  assert.equal(chamDoNang({}).muc.length, 0);
});
test('ngưỡng cấu hình được (ghi đè từng phần)', () => {
  const kq = chamDoNang({ gopMB: 12, shader: 50 }, { gopMB: { canhBao: 5, loi: 10 }, shader: { loi: 40 } });
  assert.equal(tt(kq, 'gop'), 'loi');
  assert.equal(tt(kq, 'shader'), 'loi');
  assert.equal(NGUONG_MAC_DINH.gopMB.loi, 45);   // không làm hỏng mặc định
});
test('quét đường dẫn tài sản trên chuỗi mẫu', () => {
  const src = 'load("assets/kenney/house.glb"); const t = \'assets/polyhaven/nen_1k.jpg\'; x("assets/kenney/house.glb");\n' +
    '// không phải: assets/ , myassets/x.glb , assets/readme.txt\n' +
    'url: `assets/special/twist.gltf`, snd: "assets/sfx/rung.ogg", m: "assets/manifest.json"';
  const r = quetDuongDanTaiSan(src);
  assert.deepEqual([...r].sort(), ['assets/kenney/house.glb', 'assets/manifest.json', 'assets/polyhaven/nen_1k.jpg', 'assets/sfx/rung.ogg', 'assets/special/twist.gltf'].sort());
  assert.deepEqual(quetDuongDanTaiSan(''), []);
});
