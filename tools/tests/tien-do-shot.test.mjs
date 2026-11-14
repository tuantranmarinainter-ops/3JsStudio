// tools/tien-do.mjs: bảng trạng thái từng shot (khoá tuỳ chọn `shotTheoTap` trong tien-do.json).
// Dựng bằng tiến trình con với TIEN_DO_JSON / TIEN_DO_RA trỏ vào thư mục tạm (không đụng docs/ hay dist/ thật).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..', '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tien-do-shot-'));
const w = (f, o) => { const p = path.join(tmp, f); fs.writeFileSync(p, typeof o === 'string' ? o : JSON.stringify(o)); return p; };

const goc = { capNhat: 'thử', canBan: ['việc cần bạn'], daChot: [['k', 'đã chốt']],
  nhom: [{ ten: 'Nhóm A', tap: 'Tập 5', viec: [{ ten: 'việc 1', tt: 'dang', pt: 50 }, { ten: 'việc 2', tt: 'xong' }] }] };

const khop = w('khop.json', { shots: {
  s001: { tt: 'dat', diem: 0.95 },
  s002: { tt: 'lech', diem: 0.6, ghiChu: 'lệch góc' },
  s003: { tt: 'hong', nguocHuong: true, ghiChu: 'ngược chiều' },
  s004: { tt: 'dat', diem: 0.9 },
  s005: { tt: 'thieu' },
} });
const cdMang = w('cd-mang.json', { shots: [
  { id: 's001', loi: [], canhBao: [] },
  { id: 's004', loi: ['nhân vật xuyên tường'], canhBao: [] },
  { id: 's006', loi: [], canhBao: ['camera giật'], camDungIm: true },
] });
const cdObj = w('cd-obj.json', { shots: { s001: { loi: [], canhBao: [] }, s004: { loi: ['nhân vật xuyên tường'] }, s006: { canhBao: ['camera giật'] } } });

function dung(tienDo, ten) {
  const ra = path.join(tmp, 'ra-' + ten);
  const r = spawnSync(process.execPath, [path.join(root, 'tools/tien-do.mjs')], { cwd: root, encoding: 'utf8', env: { ...process.env, TIEN_DO_JSON: w(ten + '.json', tienDo), TIEN_DO_RA: ra } });
  assert.equal(r.status, 0, r.stderr);
  return { dist: fs.readFileSync(path.join(ra, 'dist/tien-do.html'), 'utf8'), art: fs.readFileSync(path.join(ra, 'output/artifact/tien-do.html'), 'utf8'), log: r.stdout };
}
const soO = (html) => (html.match(/class="sc sc-/g) || []).length;

test('có shotTheoTap: thẻ mới, đủ ô, đếm đúng (hợp nhất khớp + chuyển động; chấp nhận mảng và object)', () => {
  for (const cd of [cdMang, cdObj]) {
    const { dist, art } = dung({ ...goc, shotTheoTap: [{ tap: 'Tập 5', khop, chuyenDong: cd }] }, 'co-' + path.basename(cd, '.json'));
    for (const html of [dist, art]) {
      assert.match(html, /data-tab="shot:Tập 5"[^>]*>Shot · Tập 5 <span class="num">6<\/span>/);   // s001..s006
      assert.equal(soO(html), 6);
      // s001 đạt, s002 lệch (khớp), s003 hỏng (khớp), s004 hỏng (khớp đạt nhưng có lỗi chuyển động), s005 thiếu, s006 lệch (cảnh báo, không có ở khớp)
      assert.match(html, /✔ Đạt 1<\/span> · <span class="st-lech">▲ Lệch 2<\/span> · <span class="st-hong">✖ Hỏng 2<\/span> · <span class="st-thieu">\? Thiếu 1<\/span> · tổng 6/);
      assert.match(html, /class="sc sc-hong"[^>]*><b>s004<\/b>/);
      assert.match(html, /class="sc sc-lech"[^>]*><b>s006<\/b>/);
      assert.match(html, /class="sc sc-thieu"[^>]*><b>s005<\/b>/);
      assert.match(html, /data-note="s004 — Hỏng: [^"]*lỗi chuyển động: nhân vật xuyên tường/);
      assert.match(html, /data-note="s002 — Lệch: điểm khớp 0\.6 · lệch góc"/);
      assert.match(html, /<span>✖ Hỏng<\/span>/);   // trạng thái có ký hiệu + chữ, không chỉ màu
      assert.match(html, /class="sbar"/);
    }
    assert.match(art, /--bad:#b3261e/);                       // token màu trên :root
    assert.match(art, /prefers-color-scheme: dark\) \{ :root:not\(\[data-theme="light"\]\) \{ --bad/);
    assert.doesNotMatch(art, /localhost|127\.0\.0\.1/);
    assert.match(dist, /Gửi tới Claude/);                     // bản máy tính giữ nút gửi
  }
});

test('chỉ có một trong hai file: vẫn dựng; file không tồn tại → bỏ qua lặng lẽ', () => {
  const chiKhop = dung({ ...goc, shotTheoTap: [{ tap: 'Tập 5', khop, chuyenDong: path.join(tmp, 'khong-co.json') }] }, 'chi-khop').dist;
  assert.equal(soO(chiKhop), 5);
  const chiCd = dung({ ...goc, shotTheoTap: [{ tap: 'Tập 5', khop: path.join(tmp, 'khong-co.json'), chuyenDong: cdMang }] }, 'chi-cd').dist;
  assert.equal(soO(chiCd), 3);
  const khongCo = dung({ ...goc, shotTheoTap: [{ tap: 'Tập 9', khop: 'khong/co.json', chuyenDong: 'cung/khong/co.json' }] }, 'khong-co').dist;
  assert.doesNotMatch(khongCo, /Shot · Tập 9/);
});

test('không có shotTheoTap (hoặc chỉ trỏ file thiếu): đầu ra giống hệt nhau và không có dấu vết bảng shot', () => {
  const a = dung(goc, 'khong-khoa');
  const b = dung({ ...goc, shotTheoTap: [{ tap: 'Tập 9', khop: 'khong/co.json' }] }, 'khoa-thieu-file');
  assert.equal(a.dist, b.dist);
  assert.equal(a.art, b.art);
  for (const html of [a.dist, a.art]) assert.doesNotMatch(html, /Shot ·|shotp|--bad|sgrid|data-tab="shot:/);
  assert.match(a.log, /tien-do: 2 việc/);
});
