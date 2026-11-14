import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { kiemKit } from '../kiem-kit.mjs';

const doc = (f) => JSON.parse(fs.readFileSync(new URL(`./fixtures/dau-vao-mau/${f}`, import.meta.url), 'utf8'));
const bs = doc('bang-shot.json'), kit0 = doc('kit.json');
const sao = () => structuredClone(kit0);
const tatCaHinh = () => bs.shots.flatMap((s) => (s.hinh === 1 ? ['dau'] : s.hinh === 2 ? ['dau', 'cuoi'] : ['dau', 'giua', 'cuoi']).map((m) => `shot_${s.id}_${m}.png`));
const coLoi = (k, re, files = null) => kiemKit(bs, k, { files }).loi.some((e) => re.test(e.msg));
const shot = (k, id) => k.shots.find((s) => s.id === id);

test('bộ mẫu đạt 0 lỗi (đủ hình và bỏ qua hình)', () => {
  assert.deepEqual(kiemKit(bs, sao(), { files: null }).loi, []);
  assert.deepEqual(kiemKit(bs, sao(), { files: tatCaHinh() }).loi, []);
});
test('thiếu shot trong kit', () => { const k = sao(); k.shots.pop(); assert.ok(coLoi(k, /thiếu trong kit/)); });
test('thiếu may.dau', () => { const k = sao(); delete shot(k, 's001').may.dau; assert.ok(coLoi(k, /may\.dau/)); });
test('thiếu may.cuoi khi hinh>=2', () => { const k = sao(); delete shot(k, 's002').may.cuoi; assert.ok(coLoi(k, /may\.cuoi/)); });
test('thiếu may.giua khi hinh:3', () => { const k = sao(); delete shot(k, 's005').may.giua; assert.ok(coLoi(k, /may\.giua/)); });
test('không có chuyển động', () => {
  const k = sao(); const s = shot(k, 's005'); s.may.cuoi = structuredClone(s.may.dau);
  assert.ok(coLoi(k, /không có chuyển động/));
});
test('nhân vật đổi chỗ thì camera tĩnh vẫn hợp lệ', () => {
  const k = sao(); const s = shot(k, 's006'); s.may.cuoi = structuredClone(s.may.dau);
  assert.ok(!coLoi(k, /không có chuyển động/));
});
test('fov ngoài ngưỡng', () => {
  const k = sao(); shot(k, 's001').may.dau.fov = 120; assert.ok(coLoi(k, /fov/));
  const j = sao(); shot(j, 's001').may.dau.fov = 10; assert.ok(coLoi(j, /fov/));
});
test('độ cao máy <= 0 hoặc >= cao bối cảnh', () => {
  const k = sao(); shot(k, 's001').may.dau.p[1] = 0; assert.ok(coLoi(k, /p\[1\]/));
  const j = sao(); shot(j, 's001').may.dau.p[1] = 14; assert.ok(coLoi(j, /< cao bối cảnh/));
});
test('nhân vật ngoài bối cảnh', () => { const k = sao(); shot(k, 's003').nhanVat[0].dau = [50, 0, 0]; assert.ok(coLoi(k, /ngoài bối cảnh/)); });
test('thiếu toạ độ nhân vật', () => { const k = sao(); shot(k, 's003').nhanVat.pop(); assert.ok(coLoi(k, /thiếu toạ độ nhân vật "ba-ban-banh"/)); });
test('thiếu toạ độ cuoi', () => { const k = sao(); delete shot(k, 's002').nhanVat[0].cuoi; assert.ok(coLoi(k, /thiếu toạ độ cuoi/)); });
test('cao nhân vật ngoài 1–8', () => { const k = sao(); k.nhanVat[0].cao = 12; assert.ok(coLoi(k, /cao phải trong 1–8/)); });
test('luma ngoài 85–150', () => { const k = sao(); k.boiCanh[0].anhSang.luma = 200; assert.ok(coLoi(k, /luma/)); });
test('tinCay sai giá trị', () => { const k = sao(); shot(k, 's001').tinCay = 'chac'; assert.ok(coLoi(k, /tinCay phải/)); });
test('tinCay thấp: 1/6 chỉ cảnh báo, 2/6 (>20%) là lỗi', () => {
  const k = sao(); shot(k, 's001').tinCay = 'thap';
  const r = kiemKit(bs, k);
  assert.ok(r.canhBao.some((w) => w.shot === 's001'));
  assert.ok(!r.loi.some((e) => /tinCay thấp/.test(e.msg)));
  shot(k, 's002').tinCay = 'thap';
  assert.ok(coLoi(k, /tinCay thấp/));
});
test('hỏng dấu trong kit', () => { const k = sao(); k.boiCanh[0].anhSang.kieu = 'ng�y'; assert.ok(coLoi(k, /hỏng dấu/)); });
test('thiếu file hình', () => {
  const f = tatCaHinh().filter((x) => x !== 'shot_s005_giua.png');
  assert.ok(coLoi(sao(), /thiếu file hình hinh\/shot_s005_giua\.png/, f));
});
test('files=null bỏ qua kiểm hình', () => { assert.ok(!coLoi(sao(), /file hình/, null)); });
test('kit thiếu mảng', () => { const k = sao(); delete k.shots; assert.ok(coLoi(k, /shots/)); });
