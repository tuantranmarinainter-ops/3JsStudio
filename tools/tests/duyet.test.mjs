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

// ---- máy chủ cục bộ (mo --mot-lan) ----
import { spawn } from 'node:child_process';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
const DUYET = fileURLToPath(new URL('../duyet.mjs', import.meta.url));

function taoGoc() {
  const goc = fs.mkdtempSync(path.join(os.tmpdir(), 'duyet-'));
  fs.mkdirSync(path.join(goc, 'x'), { recursive: true }); fs.writeFileSync(path.join(goc, 'x', 'a.png'), PNG);
  fs.writeFileSync(path.join(goc, 'bi-mat.txt'), 'x');
  const d = moi('t', 'Đầu', goc); const j = JSON.parse(fs.readFileSync(d, 'utf8'));
  j.nhom = [{ id: 'g', ten: 'G', mota: '', anh: [], muc: [{ id: 'm1', ten: 'Một', anh: 'x/a.png' }, { id: 'm2', ten: 'Hai' }] }];
  fs.writeFileSync(d, JSON.stringify(j));
  return goc;
}

function khoiDong(goc, extra = []) {
  const cong = 20000 + Math.floor(Math.random() * 20000);
  const p = spawn(process.execPath, [DUYET, 't', 'mo', '--khong-mo', '--cong', String(cong), '--thu-muc', goc, ...extra], { stdio: ['ignore', 'pipe', 'pipe'] });
  let out = ''; p.stdout.on('data', c => out += c);
  const thoat = new Promise(r => p.on('exit', code => r(code)));
  const san = new Promise((ok, loi) => { const t = setInterval(() => { const m = out.match(/MO http:\/\/127\.0\.0\.1:(\d+)\//); if (m) { clearInterval(t); ok(+m[1]); } }, 50); setTimeout(() => { clearInterval(t); loi(new Error('máy chủ không lên: ' + out)); }, 15000); });
  return { p, san, thoat, out: () => out };
}

test('mo --mot-lan: GET /, POST hợp lệ ghi file và thoát 0; sai tap / quá cỡ / thoát thư mục bị chặn', async () => {
  const goc = taoGoc(), s = khoiDong(goc, ['--mot-lan']);
  try {
    const cong = await s.san, base = `http://127.0.0.1:${cong}`;
    const g = await fetch(base + '/'); assert.equal(g.status, 200);
    assert.match(await g.text(), /Gửi tới Claude/);
    assert.equal((await fetch(base + '/x/a.png')).status, 200);
    assert.equal((await fetch(base + '/bi-mat.txt')).status, 403);
    const raw = (p) => new Promise(ok => { const h = http.get({ host: '127.0.0.1', port: cong, path: p }, r => { r.resume(); ok(r.statusCode); }); });
    assert.ok([400, 403, 404].includes(await raw('/../../x.png')));
    assert.ok([400, 403, 404].includes(await raw('/%2e%2e/%2e%2e/x.png')));
    const kqDir = path.join(goc, 'duyet', 't', 'dot-01.ketqua.json');
    const post = (body, hdr = {}) => fetch(base + '/gui', { method: 'POST', headers: { 'Content-Type': 'application/json', ...hdr }, body });
    assert.equal((await post(JSON.stringify({ tap: 'khac', dot: 1 }))).status, 422);
    assert.equal((await post(JSON.stringify({ tap: 't', dot: 9 }))).status, 422);
    assert.equal((await post('{sai')).status, 400);
    assert.equal((await post(JSON.stringify({ tap: 't', dot: 1 }), { Origin: 'http://evil.example' })).status, 403);
    const to = await post(JSON.stringify({ tap: 't', dot: 1, ghiChu: { m1: 'x'.repeat(2.5 * 2 ** 20) } })).then(r => r.status, () => 413);
    assert.equal(to, 413);
    assert.ok(!fs.existsSync(kqDir), 'chưa được ghi');
    const ok = await post(JSON.stringify({ tap: 't', dot: 1, duyet: ['m1'], sua: ['m2'], chon: {} }));
    assert.equal(ok.status, 200);
    assert.equal(await s.thoat, 0);
    assert.ok(fs.existsSync(kqDir)); assert.equal(JSON.parse(fs.readFileSync(kqDir, 'utf8')).duyet[0], 'm1');
    assert.match(s.out(), /DA-NHAN dot=1 file=/);
    const hop = JSON.parse(fs.readFileSync(path.join(goc, 'duyet', 't', 'hop-thu.jsonl'), 'utf8').trim());
    assert.deepEqual([hop.dot, hop.soDuyet, hop.soSua], [1, 1, 1]);
  } finally { s.p.kill(); fs.rmSync(goc, { recursive: true, force: true }); }
});

test('mo: Host lạ bị từ chối', async () => {
  const goc = taoGoc(), s = khoiDong(goc);
  try {
    const cong = await s.san;
    const st = await new Promise(ok => { http.get({ host: '127.0.0.1', port: cong, path: '/', headers: { Host: 'evil.example' } }, r => { r.resume(); ok(r.statusCode); }); });
    assert.equal(st, 403);
  } finally { s.p.kill(); fs.rmSync(goc, { recursive: true, force: true }); }
});

// ---- CORS cho file://, /ping ----
function yeuCau(cong, method, p, { origin, body, hdr = {} } = {}) {
  return new Promise((ok, loi) => {
    const h = { ...hdr }; if (origin !== undefined) h.Origin = origin; if (body !== undefined) { h['Content-Type'] = 'application/json'; h['Content-Length'] = Buffer.byteLength(body); }
    const r = http.request({ host: '127.0.0.1', port: cong, path: p, method, headers: h }, res => { let t = ''; res.on('data', c => t += c); res.on('end', () => ok({ st: res.statusCode, h: res.headers, t })); });
    r.on('error', loi); if (body !== undefined) r.write(body); r.end();
  });
}

test('mo: /ping, Origin null (file://) được nhận kèm CORS, preflight 204, origin web lạ 403', async () => {
  const goc = taoGoc(), s = khoiDong(goc);
  try {
    const cong = await s.san;
    const pg = await yeuCau(cong, 'GET', '/ping', { origin: 'null' });
    assert.equal(pg.st, 200); assert.deepEqual(JSON.parse(pg.t), { ung: 'duyet', ep: 't' }); assert.equal(pg.h['access-control-allow-origin'], 'null');
    assert.equal((await yeuCau(cong, 'GET', '/ping')).h['access-control-allow-origin'], '*'); // không có Origin (Chrome từ file://)
    assert.equal((await yeuCau(cong, 'GET', '/ping', { origin: 'file://' })).h['access-control-allow-origin'], 'file://');
    const pf = await yeuCau(cong, 'OPTIONS', '/gui', { origin: 'null', hdr: { 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type', 'Access-Control-Request-Private-Network': 'true' } });
    assert.equal(pf.st, 204); assert.equal(pf.h['access-control-allow-origin'], 'null'); assert.match(pf.h['access-control-allow-methods'], /POST/); assert.match(pf.h['access-control-allow-headers'], /Content-Type/i); assert.equal(pf.h['access-control-allow-private-network'], 'true');
    assert.equal((await yeuCau(cong, 'OPTIONS', '/gui', { origin: 'https://example.com' })).st, 403);
    assert.equal((await yeuCau(cong, 'GET', '/ping', { origin: 'https://example.com' })).st, 403);
    assert.equal((await yeuCau(cong, 'POST', '/gui', { origin: 'https://example.com', body: JSON.stringify({ tap: 't', dot: 1 }) })).st, 403);
    const lanh = await yeuCau(cong, 'POST', '/gui', { origin: 'http://localhost:' + cong, body: JSON.stringify({ tap: 'khac', dot: 1 }) });
    assert.equal(lanh.st, 422); assert.equal(lanh.h['access-control-allow-origin'], 'http://localhost:' + cong); // lỗi vẫn có CORS để trang đọc được
    const kq = path.join(goc, 'duyet', 't', 'dot-01.ketqua.json');
    assert.equal((await yeuCau(cong, 'POST', '/gui', { origin: 'null', body: JSON.stringify({ tap: 'khac', dot: 1 }) })).st, 422);
    assert.equal((await yeuCau(cong, 'POST', '/gui', { origin: 'null', body: JSON.stringify({ tap: 't', dot: 9 }) })).st, 422);
    assert.ok(!fs.existsSync(kq));
    const ok = await yeuCau(cong, 'POST', '/gui', { origin: 'null', body: JSON.stringify({ tap: 't', dot: 1, duyet: ['m1'], sua: [], chon: {} }) });
    assert.equal(ok.st, 200); assert.equal(ok.h['access-control-allow-origin'], 'null'); assert.ok(fs.existsSync(kq));
  } finally { s.p.kill(); fs.rmSync(goc, { recursive: true, force: true }); }
});

// ---- chống trùng giữa các đợt ----
import { tongHop, timTrung } from '../duyet.mjs';

function taoHaiDot() {
  const goc = fs.mkdtempSync(path.join(os.tmpdir(), 'duyet-'));
  fs.mkdirSync(path.join(goc, 'x'), { recursive: true }); fs.writeFileSync(path.join(goc, 'x', 'a.png'), PNG);
  const uvk = (id, ten, n) => ({ id, ten, anhHienTai: 'x/a.png', ungVien: Array.from({ length: n }, (_, i) => ({ id: id + '__' + (i + 1), ten: ten + ' U' + (i + 1), anh: 'x/a.png', link: 'https://sketchfab.com/3d-models/q' })) });
  const d1 = moi('t', 'Đợt 1', goc), d2 = moi('t', 'Đợt 2', goc);
  const j1 = JSON.parse(fs.readFileSync(d1, 'utf8')); j1.nhom = [{ id: 'a', ten: 'A', kieu: 'ung-vien', muc: [uvk('ket_tien', 'Két tiền', 2), uvk('chuong', 'Chuông', 2), uvk('ke_trong', 'Kệ', 2), uvk('guong', 'Gương', 2)] }]; fs.writeFileSync(d1, JSON.stringify(j1));
  const j2 = JSON.parse(fs.readFileSync(d2, 'utf8'));
  j2.nhom = [{ id: 'b', ten: 'B', kieu: 'ung-vien', muc: [uvk('rb-ket-sat', 'Két Roblox', 2), uvk('rb-chuong', 'Chuông Roblox', 2), uvk('rb-ke-go', 'Kệ gỗ', 2), uvk('rb-guong', 'Gương Roblox', 2), uvk('rb-moi', 'Mới hoàn toàn', 2)] },
    { id: 'c', ten: 'C', muc: [{ id: 'dn-ke_trong', ten: 'Kệ đã nhập', anh: 'x/a.png' }, { id: 'tu-chon', chuDe: 'chuong', ten: 'Chuông ghi tay' }] }];
  fs.writeFileSync(d2, JSON.stringify(j2));
  // đợt 1: chọn két U2, chuông U1, kệ: Không cái nào, gương chưa quyết
  fs.writeFileSync(path.join(goc, 'duyet', 't', 'dot-01.ketqua.json'), JSON.stringify({ tap: 't', dot: 1, chon: { ket_tien: 'ket_tien__2', chuong: 'chuong__1', ke_trong: null }, ghiChu: { chuong: 'to hơn' }, chuaChon: ['guong'] }));
  return goc;
}

test('chống trùng: đợt 2 đánh dấu mục đã quyết ở đợt 1, "không cái nào"/chưa quyết không tính', () => {
  const goc = taoHaiDot();
  const o = dung('t', { goc, log() {} });
  const html = fs.readFileSync(o.out, 'utf8');
  const du = JSON.parse(html.match(/<script type="application\/json" id="du-lieu">([\s\S]*?)<\/script>/)[1]);
  const b = du.dots[1].nhom[0].muc, c = du.dots[1].nhom[1].muc, by = id => [...b, ...c].find(m => m.id === id);
  assert.equal(by('rb-ket-sat').chuDe, 'ket'); assert.deepEqual([by('rb-ket-sat').daQuyet[0].dot, by('rb-ket-sat').daQuyet[0].ten, by('rb-ket-sat').daQuyet[0].id], [1, 'Két tiền U2', 'ket_tien']);
  assert.equal(by('rb-chuong').daQuyet[0].ten, 'Chuông U1'); assert.equal(by('tu-chon').daQuyet[0].ten, 'Chuông U1'); // chuDe ghi tay
  assert.equal(by('rb-ke-go').daQuyet, undefined, 'đợt 1 chọn "Không cái nào" cho kệ → chưa coi là đã quyết');
  assert.equal(by('dn-ke_trong').daQuyet, undefined);
  assert.equal(by('rb-guong').daQuyet, undefined, 'gương chưa quyết');
  assert.equal(by('rb-moi').daQuyet, undefined);
  assert.equal(o.trung, 3);
  assert.match(html, /Đã quyết ở đợt trước/); assert.match(html, /doiTuDot/);
  assert.equal(du.dots[0].nhom[0].muc[0].daQuyet, undefined);
  fs.rmSync(goc, { recursive: true, force: true });
});

test('tong-hop: đợt sau ghi đè đợt trước theo chủ đề; timTrung báo đúng', () => {
  const goc = taoHaiDot();
  // đợt 2: duyệt kệ đã nhập, chọn két Roblox U1 (ghi đè), chuông ghi tay "sua"
  fs.writeFileSync(path.join(goc, 'duyet', 't', 'dot-02.ketqua.json'), JSON.stringify({ tap: 't', dot: 2, chon: { 'rb-ket-sat': 'rb-ket-sat__1' }, duyet: ['dn-ke_trong'], sua: ['tu-chon'], ghiChu: {} }));
  const th = tongHop('t', goc);
  assert.deepEqual([th.ket.dot, th.ket.id, th.ket.trangThai, th.ket.ten, th.ket.truoc.dot], [2, 'rb-ket-sat', 'chon', 'Két Roblox U1', 1]);
  assert.equal(th.chuong.dot, 2); assert.equal(th.chuong.trangThai, 'sua'); assert.equal(th.chuong.truoc.trangThai, 'chon'); // đợt 2 "sua" ghi đè, giữ vết đợt trước
  assert.deepEqual([th.ke.dot, th.ke.trangThai], [2, 'duyet']);
  assert.equal(th.guong, undefined); // chưa quyết ở đâu
  const tr = timTrung('t', 2, [{ id: 'rb-chuong' }, { id: 'rb-guong' }, { id: 'rb-ke-go' }], goc);
  assert.deepEqual(tr.map(x => x.item.id), ['rb-chuong']);
  fs.rmSync(goc, { recursive: true, force: true });
});

test('them-ung-vien: báo TRÙNG và --bo-trung bỏ khe trùng', () => {
  const goc = taoHaiDot();
  const uv = { nhomId: 'moi', ten: 'Mới', khe: ['rb-ket-sat', 'rb-chuong', 'rb-khac'].map(id => ({ id, ten: id, ungVien: [{ id: id + '__1', ten: 'U', anh: 'x/a.png' }] })) };
  const f = path.join(goc, 'uv.json'); fs.writeFileSync(f, JSON.stringify(uv));
  const nhat = []; themUngVien('t', 3, f, goc, { log: m => nhat.push(m) });
  assert.equal(nhat.filter(m => m.startsWith('TRÙNG:')).length, 2); assert.ok(nhat.some(m => /TRÙNG: rb-ket-sat ↔ Đợt 1 ket_tien = Két tiền U2/.test(m)));
  assert.equal(danhSachDot('t', goc).find(d => d.so === 3).nhom[0].muc.length, 3);
  const nhat2 = []; themUngVien('t', 3, f, goc, { boTrung: true, log: m => nhat2.push(m) });
  assert.deepEqual(danhSachDot('t', goc).find(d => d.so === 3).nhom[0].muc.map(k => k.id), ['rb-khac']);
  assert.ok(nhat2.some(m => /bỏ 2 khe/.test(m)));
  fs.rmSync(goc, { recursive: true, force: true });
});
