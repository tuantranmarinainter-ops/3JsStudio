import test from 'node:test';
import assert from 'node:assert/strict';
import { rutDiemDung, kiem, dongGoi, docYeuCau, dungTrangMay } from '../trung-tam.mjs';

test('dungTrangMay gắn dữ liệu, chống </script> trong chữ', () => {
  const html = dungTrangMay('<script>const BANG_NHUNG=null/*__BANG__*/;</script>', { rows: [{ ten: 'a</script>b' }] });
  assert.ok(html.startsWith('<!doctype html>'));
  assert.ok(html.includes('const BANG_NHUNG={"rows"'));
  assert.ok(!html.includes('a</script>'));
  assert.throws(() => dungTrangMay('<p>x</p>', {}));
});

test('docYeuCau lấy id phiên từ link, bỏ yêu cầu rỗng', () => {
  const phien = { a: { ten: 'A', link: 'claude://claude.ai/epitaxy/local_12ab-cd' }, b: { ten: 'B' } };
  const v = docYeuCau({ a: { hanhDong: 'luu-tru', ghiChu: 'cất' }, b: { hanhDong: '', ghiChu: '' }, c: { ghiChu: 'nhắc' } }, phien);
  assert.equal(v.length, 2);
  assert.deepEqual([v[0].sid, v[0].hanhDong], ['local_12ab-cd', 'luu-tru']);
  assert.equal(v[1].hanhDong, '');
});

test('rutDiemDung lấy dòng chính trong khối ĐIỂM DỪNG', () => {
  const md = '# X\n<!-- ĐIỂM DỪNG: ... -->\n- **Đang làm:** dựng nhà\n- **Bước kế tiếp:** chụp lại\n- Ghi chú khác\n- **Đang chờ:** người dùng duyệt\n';
  assert.deepEqual(rutDiemDung(md), ['Đang làm: dựng nhà', 'Bước kế tiếp: chụp lại', 'Đang chờ: người dùng duyệt']);
});

test('rutDiemDung cắt dòng dài', () => {
  const md = 'ĐIỂM DỪNG\n- Đang làm: ' + 'a'.repeat(300);
  assert.equal(rutDiemDung(md, 50)[0].length, 50);
});

test('kiem bắt trạng thái sai, thiếu tên, chờ bạn mà thiếu banCan', () => {
  const loi = kiem({ phien: { a: { trangThai: 'lung-tung' }, b: { ten: 'B', trangThai: 'cho-ban' }, c: { ten: 'C', trangThai: 'xong', la: 1 } } });
  assert.ok(loi.some(l => l.startsWith('a: thiếu "ten"')));
  assert.ok(loi.some(l => l.startsWith('a: trangThai')));
  assert.ok(loi.some(l => l.startsWith('b:') && l.includes('banCan')));
  assert.ok(loi.some(l => l.includes('trường lạ "la"')));
  assert.deepEqual(kiem({ phien: { ok: { ten: 'O', trangThai: 'dang-lam' } } }), []);
});

test('dongGoi ra mảng đủ trường, đếm theo trạng thái', () => {
  const b = dongGoi({ phien: { x: { ten: 'X', trangThai: 'xong' }, y: { ten: 'Y', trangThai: 'cho-ban', banCan: 'duyệt' } } }, new Date('2026-11-16T02:00:00.123Z'));
  assert.equal(b.capNhat, '2026-11-16T02:00:00Z');
  assert.equal(b.rows.length, 2);
  assert.equal(b.rows[0].link, '');
  assert.equal(b.dem.xong, 1);
  assert.equal(b.dem['cho-ban'], 1);
});
