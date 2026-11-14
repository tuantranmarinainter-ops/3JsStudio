// Kiểm tools/nhap-model.mjs: lọc giấy phép, ghi manifest chỉ-thêm, ghi công, lệnh kiem (không gọi mạng / Blender).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chuanGiayPhep, giayPhepHopLe, ghiManifest, ghiCredits, dongGhiCong, kiem, docEnv, che, ppTuHtml } from '../nhap-model.mjs';

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'nhap-'));

test('chỉ nhận CC0 và CC BY', () => {
  assert.equal(chuanGiayPhep('CC0').ma, 'CC0');
  assert.equal(chuanGiayPhep('CC Attribution').ma, 'CC BY 4.0');
  assert.equal(chuanGiayPhep('CC-BY 3.0').ma, 'CC BY 3.0');
  for (const x of ['CC Attribution-NonCommercial', 'CC Attribution-NoDerivs', 'CC Attribution-ShareAlike', 'Standard', 'Editorial', 'CC BY-NC 4.0', '', null])
    assert.equal(chuanGiayPhep(x), null, String(x));
  assert.ok(giayPhepHopLe('CC BY 4.0') && giayPhepHopLe('CC0') && !giayPhepHopLe('CC BY-NC 4.0') && !giayPhepHopLe('Standard'));
});

test('ghiManifest chỉ thêm / thay dòng nhap/, giữ nguyên dòng cũ', () => {
  const d = tmp(), f = path.join(d, 'm.json');
  const cu = [{ id: 'a/b', src: 'x.glb', license: 'CC0', scale: 1 }];
  fs.writeFileSync(f, JSON.stringify(cu, null, 1));
  ghiManifest({ id: 'nhap/t', src: 'assets/nhap/t.glb', license: 'CC BY 4.0', credit: 'c', source: 's' }, f);
  ghiManifest({ id: 'nhap/t', src: 'assets/nhap/t.glb', license: 'CC BY 4.0', credit: 'c2', source: 's' }, f);
  const a = JSON.parse(fs.readFileSync(f, 'utf8'));
  assert.equal(a.length, 2); assert.deepEqual(a[0], cu[0]); assert.equal(a[1].credit, 'c2');
  assert.throws(() => ghiManifest({ id: 'a/b', license: 'CC0' }, f));
});

test('kiem: báo thiếu manifest / ghi công / giấy phép sai', () => {
  const d = tmp(), dir = path.join(d, 'nhap'); fs.mkdirSync(dir);
  const man = path.join(d, 'm.json'), cre = path.join(dir, 'CREDITS.md');
  fs.writeFileSync(path.join(dir, 'ok.glb'), 'x'); fs.writeFileSync(path.join(dir, 'xau.glb'), 'x'); fs.writeFileSync(path.join(dir, 'mo.glb'), 'x');
  fs.writeFileSync(man, JSON.stringify([
    { id: 'nhap/ok', license: 'CC BY 4.0', credit: 'c', source: 's', loai: 'vua', tris_goc: 500 },
    { id: 'nhap/xau', license: 'CC BY-NC 4.0', credit: 'c', source: 's' }]));
  const info = { ten: 'M', tacGia: 'Ai', tacGiaUrl: 'https://x/ai', url: 'https://x/m', gp: chuanGiayPhep('CC Attribution') };
  ghiCredits(info, 'ok', cre); ghiCredits(info, 'xau', cre);
  const r = kiem({ dir, manifest: man, credits: cre });
  assert.equal(r.n, 3);
  assert.ok(r.loi.some((l) => l.startsWith('xau.glb') && /CC0\/CC BY/.test(l)));
  assert.ok(r.loi.some((l) => l.startsWith('mo.glb') && /manifest/.test(l)));
  assert.ok(r.loi.some((l) => l.startsWith('mo.glb') && /CREDITS/.test(l)));
  assert.ok(!r.loi.some((l) => l.startsWith('ok.glb')));
});

test('docEnv đọc đường dẫn có dấu cách; che() giấu khoá', () => {
  const f = path.join(tmp(), 'e'); fs.writeFileSync(f, '# c\nBLENDER=S:/Program Files/B/blender.exe\nK=\n');
  const e = docEnv(f); assert.equal(e.BLENDER, 'S:/Program Files/B/blender.exe'); assert.equal(e.K, '');
  assert.equal(typeof che('abc'), 'string');
});

// ---------- ngưỡng low poly ----------
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { NGUONG, phanLoai, sapXepUngVien, loaiHopLe } from '../nhap-model.mjs';
const TOOL = fileURLToPath(new URL('../nhap-model.mjs', import.meta.url));

test('bảng ngưỡng đủ 5 loại, đúng số người dùng chốt', () => {
  const L = NGUONG.loai;
  assert.deepEqual(Object.keys(L).sort(), ['chu-dao', 'lon', 'nho', 'phu-kien', 'vua']);
  assert.deepEqual([L.nho.min, L.nho.lyTuong, L.nho.toiDa], [100, 600, 1500]);
  assert.deepEqual([L['phu-kien'].min, L['phu-kien'].lyTuong, L['phu-kien'].toiDa], [200, 800, 2000]);
  assert.deepEqual([L.vua.min, L.vua.lyTuong, L.vua.toiDa], [300, 1500, 3000]);
  assert.deepEqual([L.lon.min, L.lon.lyTuong, L.lon.toiDa], [500, 3000, 6000]);
  assert.deepEqual([L['chu-dao'].min, L['chu-dao'].lyTuong, L['chu-dao'].toiDa], [2000, 6000, 12000]);
  assert.equal(NGUONG.mac_dinh, 'vua'); assert.ok(loaiHopLe('nho') && !loaiHopLe('khong-co'));
});

test('phanLoai + sắp ứng viên: lý tưởng trước, vượt cuối', () => {
  assert.equal(phanLoai(7678, 'phu-kien'), 'vuot');
  assert.equal(phanLoai(2000, 'phu-kien'), 'chap-nhan');
  assert.equal(phanLoai(500, 'phu-kien'), 'ly-tuong');
  assert.equal(phanLoai(50, 'phu-kien'), 'thap');
  assert.equal(phanLoai(null, 'vua'), 'chua-ro');
  const xs = sapXepUngVien([{ id: 'a', tamGiac: 9000 }, { id: 'b', tamGiac: 1900 }, { id: 'c', tamGiac: 400 }], 'phu-kien').map((m) => m.id);
  assert.deepEqual(xs, ['c', 'b', 'a']);
});

test('nhap từ chối model gốc vượt tối đa (không cần mạng): cần --cho-phep-nang kèm lý do', () => {
  // Poly Haven không cần khoá; dùng id giả: lỗi mạng/404 vẫn mã ≠ 0, nên chỉ kiểm tra cờ rỗng lý do (xảy ra TRƯỚC khi gọi mạng).
  const r = spawnSync(process.execPath, [TOOL, 'nhap', 'polyhaven:x', '--ten', 'x', '--cho-phep-nang'], { encoding: 'utf8' });
  assert.notEqual(r.status, 0); assert.match(r.stderr, /lý do/);
  const r2 = spawnSync(process.execPath, [TOOL, 'nhap', 'polyhaven:x', '--ten', 'x', '--loai', 'sai'], { encoding: 'utf8' });
  assert.notEqual(r2.status, 0); assert.match(r2.stderr, /--loai lạ/);
});

test('kiem: vượt ngưỡng loại mà không duyetNang → lỗi; có duyetNang → qua; thiếu loai → lỗi; vượt phong cách → cảnh báo', () => {
  const d = tmp(), dir = path.join(d, 'nhap'); fs.mkdirSync(dir);
  const man = path.join(d, 'm.json'), cre = path.join(dir, 'CREDITS.md');
  for (const t of ['nang', 'duyet', 'nhe', 'thieu']) fs.writeFileSync(path.join(dir, t + '.glb'), 'x');
  const e = (id, extra) => ({ id: 'nhap/' + id, license: 'CC BY 4.0', credit: 'c', source: 's', ...extra });
  fs.writeFileSync(man, JSON.stringify([e('nang', { loai: 'phu-kien', tris_goc: 7678 }), e('duyet', { loai: 'phu-kien', tris_goc: 7678, duyetNang: 'người dùng duyệt' }),
    e('nhe', { loai: 'phu-kien', tris_goc: 500 }), e('thieu', { tris_goc: 10 })]));
  const info = { ten: 'M', tacGia: 'Ai', tacGiaUrl: 'https://x/ai', url: 'https://x/m', gp: chuanGiayPhep('CC Attribution') };
  for (const t of ['nang', 'duyet', 'nhe', 'thieu']) ghiCredits(info, t, cre);
  const r = kiem({ dir, manifest: man, credits: cre });
  assert.ok(r.loi.some((l) => l.startsWith('nang.glb') && /duyetNang/.test(l)));
  assert.ok(!r.loi.some((l) => l.startsWith('duyet.glb')));
  assert.ok(!r.loi.some((l) => l.startsWith('nhe.glb')));
  assert.ok(r.loi.some((l) => l.startsWith('thieu.glb') && /loai/.test(l)));
  assert.deepEqual(r.canhBao, []);   // tệp giả không phải GLB: bỏ qua soi phong cách
});

test('docGlb + cảnh báo phong cách trên GLB tối giản', () => {
  const j = Buffer.from(JSON.stringify({ asset: { version: '2.0' }, materials: Array(8).fill({}), meshes: [{ primitives: Array(12).fill({}) }] }));
  const pad = Buffer.concat([j, Buffer.alloc((4 - (j.length % 4)) % 4, 0x20)]);
  const h = Buffer.alloc(20); h.writeUInt32LE(0x46546c67, 0); h.writeUInt32LE(2, 4); h.writeUInt32LE(20 + pad.length, 8); h.writeUInt32LE(pad.length, 12); h.writeUInt32LE(0x4e4f534a, 16);
  const d = tmp(), dir = path.join(d, 'nhap'); fs.mkdirSync(dir);
  fs.writeFileSync(path.join(dir, 'a.glb'), Buffer.concat([h, pad]));
  const man = path.join(d, 'm.json'), cre = path.join(dir, 'CREDITS.md');
  fs.writeFileSync(man, JSON.stringify([{ id: 'nhap/a', license: 'CC0', credit: 'c', source: 's', loai: 'nho', tris_goc: 300 }]));
  ghiCredits({ ten: 'A', tacGia: 'Ai', tacGiaUrl: '', url: 'https://x/a', gp: chuanGiayPhep('CC0') }, 'a', cre);
  const r = kiem({ dir, manifest: man, credits: cre });
  assert.deepEqual(r.loi, []);
  assert.equal(r.canhBao.length, 2); assert.ok(r.canhBao.some((l) => /8 vật liệu/.test(l)) && r.canhBao.some((l) => /12 mảnh/.test(l)));
});

test('tim: không có low poly → mã thoát 3 + dòng cảnh báo (dữ liệu giả, không mạng)', () => {
  const r = spawnSync(process.execPath, ['--input-type=module', '-e', `
    import { NGUONG, sapXepUngVien } from ${JSON.stringify(new URL('../nhap-model.mjs', import.meta.url).href)};
    const xep = sapXepUngVien([{ id: 'a', tamGiac: 9000, gp: {} }], 'phu-kien');
    if (xep.filter((m) => m.hang !== 'vuot').length === 0) { console.log('KHÔNG CÓ LOW POLY'); process.exit(3); }`], { encoding: 'utf8' });
  assert.equal(r.status, 3); assert.match(r.stdout, /KHÔNG CÓ LOW POLY/);
});

test('Poly Pizza không khoá: đọc model + URL GLB từ trang công khai', () => {
  const rid = '8d8927eb-1a6c-4692-884f-d0e976b71a69';
  const html = `<script>window.__SERVER_APP_STATE__ =  {"initialData":{"model":{"Title":"Mirror \\"x\\" {","ResourceID":"${rid}","PublicID":"cjvm-bUFBAW","Tris":52,"Creator":{"Username":"Poly by Google"},"Category":"Furniture","Licence":"CC-BY 3.0"}}};</script><div>}</div>`;
  const i = ppTuHtml(html, 'cjvm-bUFBAW');
  assert.equal(i.glb, `https://static.poly.pizza/${rid}.glb`);
  assert.equal(i.tamGiac, 52); assert.equal(i.tacGia, 'Poly by Google'); assert.equal(i.gp.ma, 'CC BY 3.0');
  assert.throws(() => ppTuHtml('<html></html>', 'x'), /không có dữ liệu/);
  assert.throws(() => ppTuHtml(html.replace(rid, '../etc'), 'x'), /ResourceID/);
});

test('dongGhiCong: model ghép (--ghep-nguon) được ghi công chung và vẫn qua kiểm ghi công', () => {
  const a = { ten: 'Ring box', tacGia: 'A', url: 'https://x/a', gp: chuanGiayPhep('CC Attribution') };
  const b = { ten: 'Ring', tacGia: 'B', url: 'https://x/b', gp: chuanGiayPhep('CC Attribution') };
  const d = dongGhiCong({ ...a, them: [b] }, 'hop');
  assert.match(d, /Ring box.*by A, licensed under/); assert.match(d, /Ghép thêm: "Ring" \(https:\/\/x\/b\) by B, licensed under/);
  assert.equal(dongGhiCong(a, 'hop').includes('Ghép thêm'), false);
});

test('ghiManifest giữ kiểu xuống dòng CRLF: thêm, thay, và nhánh định dạng lạ đều không lẫn LF', () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'nhap-crlf-')), f = path.join(d, 'manifest.json');
  const leLF = (t) => (t.match(/(?<!\r)\n/g) || []).length;
  const dau = [{ id: 'a/b', license: 'CC0' }];
  fs.writeFileSync(f, JSON.stringify(dau, null, 1).replace(/\n/g, '\r\n'));              // CRLF, không xuống dòng cuối
  ghiManifest({ id: 'nhap/t', src: 'x.glb', license: 'CC0', credit: 'c', source: 's', bbox: [1, 2, 3] }, f);
  ghiManifest({ id: 'nhap/t', src: 'x.glb', license: 'CC0', credit: 'c2', source: 's', bbox: [1, 2, 3] }, f);   // thay được → đã nhận là định dạng chuẩn
  let t = fs.readFileSync(f, 'utf8');
  assert.equal(leLF(t), 0); assert.ok(t.includes('\r\n')); assert.ok(!t.endsWith('\n'));
  assert.deepEqual(JSON.parse(t).map((e) => e.credit), [undefined, 'c2']);
  fs.writeFileSync(f, '[\r\n  {"id": "a/b"}\r\n]\r\n');                                    // định dạng lạ + CRLF
  ghiManifest({ id: 'nhap/u', src: 'u.glb', license: 'CC0', credit: 'c', source: 's' }, f);
  t = fs.readFileSync(f, 'utf8');
  assert.equal(leLF(t), 0); assert.ok(t.endsWith(']\r\n')); assert.deepEqual(JSON.parse(t).map((e) => e.id), ['a/b', 'nhap/u']);
  fs.writeFileSync(f, JSON.stringify(dau, null, 1) + '\n');                                // LF vẫn là LF
  ghiManifest({ id: 'nhap/t', src: 'x.glb', license: 'CC0', credit: 'c', source: 's' }, f);
  assert.ok(!fs.readFileSync(f, 'utf8').includes('\r'));
});
