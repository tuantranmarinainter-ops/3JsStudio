import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { dung, moi, congToken, nhan, danhSachDot, chuanMuc, chuanHoa, themUngVien } from '../duyet.mjs';

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

test('dựng 2 đợt, ảnh thiếu, có kết quả', () => {
  const goc = fs.mkdtempSync(path.join(os.tmpdir(), 'duyet-'));
  fs.mkdirSync(path.join(goc, 'x'), { recursive: true }); fs.writeFileSync(path.join(goc, 'x', 'a.png'), PNG);
  const nhom = [{ id: 'g', ten: 'G', mota: '', anh: ['x/a.png', 'x/thieu.png'], muc: [['m1', 'Một', ''], ['m2', 'Hai', '']] }];
  const d1 = moi('t', 'Đầu', goc); assert.ok(fs.existsSync(d1));
  const j = JSON.parse(fs.readFileSync(d1, 'utf8')); j.nhom = nhom; fs.writeFileSync(d1, JSON.stringify(j));
  moi('t', 'Hai', goc);
  assert.equal(congToken('t', 1, 'việc a', 100, 'sonnet', goc), 100);
  assert.equal(congToken('t', 1, 'việc b', 50, 'haiku', goc), 150);
  const kq = path.join(goc, 'kq.json'); fs.writeFileSync(kq, JSON.stringify({ tap: 't', dot: 1, duyet: ['m1'], sua: ['m2'], ghiChu: { m2: 'x' } }));
  nhan('t', kq, goc);
  const canh = []; const o = dung('t', { goc, log: m => canh.push(m) });
  assert.equal(o.dots, 2); assert.deepEqual(o.thieu, ['x/thieu.png']); assert.ok(canh.some(c => c.includes('thieu.png')));
  const html = fs.readFileSync(o.out, 'utf8');
  assert.match(html, /id="du-lieu"/); assert.match(html, /data:image\/(png|jpeg);base64,/);
  const du = JSON.parse(html.match(/<script type="application\/json" id="du-lieu">([\s\S]*?)<\/script>/)[1]);
  assert.equal(du.dots.length, 2); assert.equal(du.dots[0].token.tong, 150); assert.ok(du.dots[0].ketqua); assert.equal(du.dots[1].ketqua, null);
  assert.equal(danhSachDot('t', goc)[0].so, 1);
  fs.rmSync(goc, { recursive: true, force: true });
});

test('chuanMuc: mảng cũ và đối tượng mới, link tương đối từ dist', () => {
  const a = chuanMuc(['m1', 'Một', 'p']);
  assert.deepEqual([a.id, a.ten, a.phu, a.anh, a.links], ['m1', 'Một', 'p', [], []]);
  const b = chuanMuc({ id: 'x', ten: 'X', anh: 'o/x.png', link: 'https://sketchfab.com/3d-models/a', linkTen: 'Mở' });
  assert.deepEqual(b.anh, ['o/x.png']); assert.deepEqual(b.links, [{ ten: 'Mở', href: 'https://sketchfab.com/3d-models/a' }]);
  const c = chuanMuc({ id: 'y', ten: 'Y', anh: 'o/y.png' });
  assert.deepEqual(c.links, [{ ten: 'ảnh lớn', href: '../o/y.png' }]);
  const p = chuanMuc({ id: 'z', ten: 'Z', anhTruoc: 'a.png', anhSau: 'b.png' }, 'cap');
  assert.equal(p.links.length, 2);
});

test('them-ung-vien: tạo đợt, thay nhóm cùng id, dựng trang', () => {
  const goc = fs.mkdtempSync(path.join(os.tmpdir(), 'duyet-'));
  fs.mkdirSync(path.join(goc, 'x'), { recursive: true }); fs.writeFileSync(path.join(goc, 'x', 'a.png'), PNG);
  moi('t', 'Đầu', goc);
  const uv = { nhomId: 'dao', ten: 'Đạo cụ', mota: 'm', khe: [1, 2].map(i => ({ id: 'k' + i, ten: 'Khe ' + i, phu: '', anhHienTai: 'x/a.png', ungVien: [1, 2].map(j => ({ id: 'u' + j, ten: 'UV' + j, anh: 'x/a.png', link: 'https://sketchfab.com/3d-models/q', tacGia: 'T', giayPhep: 'CC BY 4.0', tamGiac: 100 })) })) };
  const f = path.join(goc, 'uv.json'); fs.writeFileSync(f, JSON.stringify(uv));
  themUngVien('t', 2, f, goc); themUngVien('t', 2, f, goc); // lần 2 thay, không nhân đôi
  const ds = danhSachDot('t', goc); assert.equal(ds.length, 2); assert.equal(ds[1].nhom.length, 1); assert.equal(ds[1].nhom[0].kieu, 'ung-vien');
  const h = chuanHoa(ds[1]); assert.equal(h.nhom[0].muc[0].ungVien[0].links[0].href, 'https://sketchfab.com/3d-models/q'); assert.deepEqual(h.nhom[0].muc[0].anh, ['x/a.png']);
  const o = dung('t', { goc, log() {} }); assert.equal(o.dots, 2); assert.equal(o.thieu.length, 0);
  assert.throws(() => themUngVien('t', 2, (fs.writeFileSync(f, '{"nhomId":"a","khe":[]}'), f), goc));
  fs.rmSync(goc, { recursive: true, force: true });
});
