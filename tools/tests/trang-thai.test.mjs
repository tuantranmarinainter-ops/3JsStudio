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

test('nhật ký cắt dở: đọc bỏ dòng hỏng, ghi tiếp vẫn đúng', () => {
  const o = tmp(); const dir = thuMucKiem('epx', o);
  fs.mkdirSync(dir, { recursive: true });
  const f = path.join(dir, 'nhat-ky.jsonl');
  fs.writeFileSync(f, '{"ts":"a","ep":"epx","buoc":"shot","hanh_dong":"x"}\n{"ts":"b","ep":"ep');
  assert.equal(docNhatKy('epx', o).length, 1);
  ghiNhatKy('epx', { buoc: 'shot', hanh_dong: 'y' }, o);
  const s = fs.readFileSync(f, 'utf8');
  assert.ok(s.endsWith('\n'));
  const d = docNhatKy('epx', o);
  assert.equal(d.length, 2); assert.equal(d[1].hanh_dong, 'y');
  assert.equal(s.trim().split('\n').length, 2);
});

test('canChay + datBuoc + hashVao', () => {
  const o = tmp();
  const f = path.join(o.goc, 'a.txt'); fs.writeFileSync(f, 'một');
  const h1 = hashVao([f]);
  assert.match(h1, /^[0-9a-f]{40}$/);
  assert.equal(canChay('epx', 'shot', h1, o), true);
  batDau('epx', 'shot', o);
  const b = datBuoc('epx', 'shot', { hash: h1, xong: true }, o);
  assert.equal(typeof b.phut, 'number'); assert.equal(b.goi, 0);
  assert.equal(canChay('epx', 'shot', h1, o), false);
  fs.writeFileSync(f, 'hai');
  assert.equal(canChay('epx', 'shot', hashVao([f]), o), true);
  datBuoc('epx', 'ra-loi', { hash: 'z', xong: false }, o);
  assert.equal(canChay('epx', 'ra-loi', 'z', o), true);
});
