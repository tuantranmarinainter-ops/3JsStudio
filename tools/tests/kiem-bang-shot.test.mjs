import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { kiemBangShot } from '../kiem-bang-shot.mjs';

const goc = JSON.parse(fs.readFileSync(new URL('./fixtures/dau-vao-mau/bang-shot.json', import.meta.url), 'utf8'));
const sao = () => structuredClone(goc);
const coLoi = (d, re) => kiemBangShot(d).loi.some((e) => re.test(e.msg));

test('bộ mẫu đạt 0 lỗi', () => {
  assert.deepEqual(kiemBangShot(sao()).loi, []);
});
test('id shot trùng', () => { const d = sao(); d.shots[1].id = 's001'; assert.ok(coLoi(d, /trùng/)); });
test('id shot sai dạng', () => { const d = sao(); d.shots[0].id = 'shot1'; assert.ok(coLoi(d, /s001/)); });
test('bối cảnh không có trong danh sách', () => { const d = sao(); d.shots[0].boiCanh = 'khong-co'; assert.ok(coLoi(d, /bối cảnh "khong-co"/)); });
test('nhân vật không có trong danh sách', () => { const d = sao(); d.shots[1].nhanVat = ['ma']; assert.ok(coLoi(d, /nhân vật "ma"/)); });
test('id nhân vật có dấu/hoa', () => { const d = sao(); d.nhanVat[0].id = 'Gà'; assert.ok(coLoi(d, /không dấu/)); });
test('dur <= 0', () => { const d = sao(); d.shots[0].dur = 0; assert.ok(coLoi(d, /dur/)); });
test('camera.loai sai', () => { const d = sao(); d.shots[0].camera.loai = 'bay'; assert.ok(coLoi(d, /camera\.loai/)); });
test('gocMay sai', () => { const d = sao(); d.shots[0].camera.gocMay = 'xien'; assert.ok(coLoi(d, /gocMay/)); });
test('coKhung sai độ dài / giá trị', () => {
  const d = sao(); d.shots[0].camera.coKhung = ['toan']; assert.ok(coLoi(d, /coKhung/));
  const e = sao(); e.shots[0].camera.coKhung = ['toan', 'xa']; assert.ok(coLoi(e, /coKhung/));
});
test('hinh ngoài 1-3', () => { const d = sao(); d.shots[0].hinh = 4; assert.ok(coLoi(d, /hinh phải/)); });
test('hinh:2 thiếu cuoi', () => { const d = sao(); delete d.shots[0].cuoi; assert.ok(coLoi(d, /thiếu mô tả "cuoi"/)); });
test('hinh:3 thiếu giua', () => { const d = sao(); delete d.shots[4].giua; assert.ok(coLoi(d, /thiếu mô tả "giua"/)); });
test('hinh>=2 thiếu hanhDong', () => { const d = sao(); delete d.shots[0].hanhDong; assert.ok(coLoi(d, /hanhDong/)); });
test('dung với hinh khác 1', () => { const d = sao(); d.shots[0].camera.loai = 'dung'; assert.ok(coLoi(d, /"dung" chỉ đi với hinh:1/)); });
test('doiHuong với hinh khác 3', () => { const d = sao(); d.shots[0].camera.loai = 'doiHuong'; assert.ok(coLoi(d, /"doiHuong" chỉ đi với hinh:3/)); });
test('hỏng dấu', () => {
  const d = sao(); d.shots[0].dau = 'Mái nh� pastel'; assert.ok(coLoi(d, /hỏng dấu/));
  const e = sao(); e.shots[0].thoai = 'Ở thị tr?n này'; assert.ok(coLoi(e, /hỏng dấu/));
});
test('câu hỏi kết thúc bằng ? không bị coi là hỏng dấu', () => { assert.ok(!coLoi(sao(), /hỏng dấu/)); });
test('cảnh báo: 1 nhân vật zoomOut, 2 nhân vật zoomIn, >20% hinh:3', () => {
  const d = sao(); d.shots[1].camera.loai = 'zoomOut'; d.shots[2].camera.loai = 'zoomIn';
  const r = kiemBangShot(d);
  assert.ok(r.canhBao.some((e) => e.shot === 's002'));
  assert.ok(r.canhBao.some((e) => e.shot === 's003'));
  const e = sao(); e.shots[0].hinh = 3; e.shots[0].giua = 'x';
  assert.ok(kiemBangShot(e).canhBao.some((w) => /20%/.test(w.msg)));
});
test('thiếu mảng shots', () => { const d = sao(); delete d.shots; assert.ok(coLoi(d, /shots/)); });
