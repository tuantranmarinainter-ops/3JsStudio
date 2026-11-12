import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { BUOC, docTrangThai, hashVao, canChay, batDau, datBuoc, ghiNhatKy, docNhatKy, thuMucKiem } from '../kiem/trang-thai.mjs';

const tmp = () => ({ goc: fs.mkdtempSync(path.join(os.tmpdir(), 'task7-')) });

test('BUOC có 8 bước', () => assert.equal(BUOC.length, 8));

test('file trạng thái hỏng → rỗng + đổi tên .hong-*', () => {
  const o = tmp(); const dir = thuMucKiem('epx', o);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'trang-thai.json'), '{hong');
  assert.deepEqual(docTrangThai('epx', o), { ep: 'epx', buoc: {} });
  assert.ok(fs.readdirSync(dir).some((f) => f.startsWith('trang-thai.json.hong-')));
  assert.deepEqual(docTrangThai('epx', o), { ep: 'epx', buoc: {} });
});

test('nhật ký cắt dở: không ghi đè, dòng dở giữ nguyên, ghi tiếp trên dòng mới', () => {
  const o = tmp(); const dir = thuMucKiem('epx', o);
  fs.mkdirSync(dir, { recursive: true });
  const f = path.join(dir, 'nhat-ky.jsonl');
  const dau = '{"ts":"a","ep":"epx","buoc":"shot","hanh_dong":"x"}\n{"ts":"b","ep":"ep';
  fs.writeFileSync(f, dau);
  assert.equal(docNhatKy('epx', o).length, 1);
  ghiNhatKy('epx', { buoc: 'shot', hanh_dong: 'y' }, o);
  const s = fs.readFileSync(f, 'utf8');
  assert.ok(s.startsWith(dau + '\n'));
  assert.ok(s.endsWith('\n'));
  const d = docNhatKy('epx', o);
  assert.equal(d.length, 2); assert.equal(d[1].hanh_dong, 'y');
});

test('batDau ghi bat_dau vào file; datBuoc tính phut từ đó, xoá khoá', () => {
  const o = tmp();
  batDau('epx', 'giong', o);
  const f = path.join(thuMucKiem('epx', o), 'trang-thai.json');
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  assert.equal(d.buoc.giong.xong, false); assert.ok(d.buoc.giong.bat_dau);
  d.buoc.giong.bat_dau = new Date(Date.now() - 90000).toISOString();
  fs.writeFileSync(f, JSON.stringify(d));
  const b = datBuoc('epx', 'giong', { hash: 'h', xong: true }, o);
  assert.ok(Math.abs(b.phut - 1.5) < 0.05, String(b.phut));
  assert.equal('bat_dau' in JSON.parse(fs.readFileSync(f, 'utf8')).buoc.giong, false);
  // chưa có bat_dau và chưa có phut cũ → null, không phải 0
  assert.equal(datBuoc('epx', 'asset', { hash: 'h' }, o).phut, null);
});

test('ghi trạng thái nguyên tử: không để lại file tmp', () => {
  const o = tmp();
  datBuoc('epx', 'shot', { hash: 'h' }, o);
  assert.deepEqual(fs.readdirSync(thuMucKiem('epx', o)), ['trang-thai.json']);
});

test('hashVao: thư mục đệ quy, tuyệt đối = tương đối', () => {
  const o = tmp();
  const d = path.join(o.goc, 'd'); fs.mkdirSync(path.join(d, 'sub'), { recursive: true });
  fs.writeFileSync(path.join(d, 'a.txt'), '1'); fs.writeFileSync(path.join(d, 'sub', 'b.txt'), '2');
  const h = hashVao([d], o);
  assert.equal(hashVao(['d'], o), h);
  fs.writeFileSync(path.join(d, 'sub', 'b.txt'), '3');
  assert.notEqual(hashVao([d], o), h);
});

test('canChay: hash không hợp lệ → true', () => {
  const o = tmp();
  datBuoc('epx', 'shot', { hash: '', xong: true }, o);
  assert.equal(canChay('epx', 'shot', '', o), true);
  assert.equal(canChay('epx', 'shot', undefined, o), true);
});

test('canChay + datBuoc + hashVao', () => {
  const o = tmp();
  const f = path.join(o.goc, 'a.txt'); fs.writeFileSync(f, 'một');
  const h1 = hashVao([f], o);
  assert.match(h1, /^[0-9a-f]{40}$/);
  assert.equal(canChay('epx', 'shot', h1, o), true);
  batDau('epx', 'shot', o);
  const b = datBuoc('epx', 'shot', { hash: h1, xong: true }, o);
  assert.equal(typeof b.phut, 'number'); assert.equal(b.goi, 0);
  assert.equal(canChay('epx', 'shot', h1, o), false);
  fs.writeFileSync(f, 'hai');
  assert.equal(canChay('epx', 'shot', hashVao([f], o), o), true);
  datBuoc('epx', 'ra-loi', { hash: 'z', xong: false }, o);
  assert.equal(canChay('epx', 'ra-loi', 'z', o), true);
});
