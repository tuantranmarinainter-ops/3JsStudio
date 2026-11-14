import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { dungTrang, tomTat, moMay, dungFile } from '../duyet-bang-shot.mjs';

const AQ = path.dirname(fileURLToPath(import.meta.url));
const MAU = path.join(AQ, 'fixtures', 'dau-vao-mau');
const CLI = path.join(AQ, '..', 'duyet-bang-shot.mjs');
const bangMau = () => JSON.parse(fs.readFileSync(path.join(MAU, 'bang-shot.json'), 'utf8'));
const banSao = () => { const d = fs.mkdtempSync(path.join(os.tmpdir(), 'duyet1-')); fs.copyFileSync(path.join(MAU, 'bang-shot.json'), path.join(d, 'bang-shot.json')); return d; };

test('dựng trang từ bộ mẫu: thẻ và số tổng', () => {
  const bs = bangMau(), html = dungTrang(bs, { coAnh: false });
  assert.equal((html.match(/data-k="nhanVat"/g) || []).length, 2);
  assert.equal((html.match(/data-k="boiCanh"/g) || []).length, 2);
  assert.equal((html.match(/data-k="shots"/g) || []).length, 6);
  const hinh = bs.shots.reduce((s, x) => s + x.hinh, 0);
  assert.match(html, /6 shot/);
  assert.match(html, new RegExp(`Sẽ vẽ ${hinh} hình`));
  assert.match(html, /chưa có ảnh/);
  assert.match(html, /Duyệt tất cả shot/);
  assert.match(html, /1 hình: 1/); assert.match(html, /2 hình: 4/); assert.match(html, /3 hình: 1/);
  assert.match(dungTrang(bs, { coAnh: true }), /src="tham-chieu\/nv_ga\.png"/);
  const js = html.match(/<script>([\s\S]*)<\/script>/)[1];
  assert.doesNotThrow(() => new Function(js)); // cú pháp JS nội tuyến hợp lệ
});

test('ký tự đặc biệt được escape', () => {
  const bs = bangMau();
  bs.nhanVat[0].moTa = '<script>alert(1)</script> & "x"';
  bs.shots[0].dau = '<img src=x onerror=1>';
  const html = dungTrang(bs, { coAnh: true });
  assert.ok(!html.includes('<script>alert(1)'));
  assert.ok(!html.includes('<img src=x onerror=1>'));
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt; &amp; &quot;x&quot;/);
});

test('dungFile ghi duyet-1.html vào bản sao', () => {
  const d = banSao(), f = dungFile(d);
  assert.equal(path.basename(f), 'duyet-1.html');
  assert.ok(fs.statSync(f).size > 1000);
  const out = execFileSync(process.execPath, [CLI, d], { encoding: 'utf8' });
  assert.match(out, /file:\/\/\//);
});

test('tomTat: duyệt hết / có mục sửa / thiếu mục', () => {
  const bs = bangMau();
  const hết = { nhanVat: {}, boiCanh: {}, shots: {} };
  for (const k of ['nhanVat', 'boiCanh', 'shots']) for (const x of bs[k]) hết[k][x.id] = { tt: 'duyet', ghiChu: '' };
  assert.deepEqual(tomTat(hết, bs), { duyet: 10, sua: 0, chua: 0, muc: [] });
  const sua = structuredClone(hết); sua.shots.s003 = { tt: 'sua', ghiChu: 'gần hơn' };
  const t = tomTat(sua, bs);
  assert.equal(t.sua, 1); assert.equal(t.duyet, 9); assert.equal(t.chua, 0);
  assert.deepEqual(t.muc, [{ loai: 'shots', id: 's003', ghiChu: 'gần hơn' }]);
  const thieu = structuredClone(hết); delete thieu.shots.s006; delete thieu.nhanVat;
  const u = tomTat(thieu, bs);
  assert.equal(u.chua, 3); assert.equal(u.duyet, 7);
  assert.deepEqual(tomTat(null, bs).chua, 10);
});

const gui = (cong, body) => fetch(`http://127.0.0.1:${cong}/gui`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

test('máy nhận: ghi duyet-1.json, tắt khi --mot-lan', async () => {
  const d = banSao(), bs = bangMau();
  const { server, cong } = await moMay(d, { cong: 0, motLan: true, log: () => {} });
  const dong = new Promise(r => server.once('close', r));
  const shots = Object.fromEntries(bs.shots.map(s => [s.id, { tt: 'duyet', ghiChu: '' }]));
  shots.s002 = { tt: 'sua', ghiChu: 'cận hơn' };
  const nv = Object.fromEntries(bs.nhanVat.map(x => [x.id, { tt: 'duyet', ghiChu: '' }]));
  const bc = Object.fromEntries(bs.boiCanh.map(x => [x.id, { tt: 'duyet', ghiChu: '' }]));
  const r = await gui(cong, { luc: 'x', nhanVat: nv, boiCanh: bc, shots, tatCaDuyet: true });
  assert.equal(r.status, 200);
  const j = JSON.parse(fs.readFileSync(path.join(d, 'duyet-1.json'), 'utf8'));
  assert.equal(j.tatCaDuyet, false); // máy nhận tự tính lại
  assert.equal(j.shots.s002.tt, 'sua'); assert.equal(j.shots.s002.ghiChu, 'cận hơn');
  assert.equal(tomTat(j, bs).sua, 1);
  await Promise.race([dong, new Promise((_, no) => setTimeout(() => no(new Error('không tắt')), 3000))]);
});

test('máy nhận: CORS, ping, từ chối origin lạ và JSON sai', async () => {
  const d = banSao();
  const { server, cong } = await moMay(d, { cong: 0, log: () => {} });
  try {
    const op = await fetch(`http://127.0.0.1:${cong}/gui`, { method: 'OPTIONS', headers: { origin: 'null' } });
    assert.equal(op.status, 204); assert.equal(op.headers.get('access-control-allow-origin'), 'null');
    assert.equal((await fetch(`http://127.0.0.1:${cong}/ping`)).status, 200);
    const la = await fetch(`http://127.0.0.1:${cong}/gui`, { method: 'POST', headers: { origin: 'https://evil.example' }, body: '{}' });
    assert.equal(la.status, 403);
    const sai = await fetch(`http://127.0.0.1:${cong}/gui`, { method: 'POST', body: 'không phải json' });
    assert.equal(sai.status, 400);
    assert.ok(!fs.existsSync(path.join(d, 'duyet-1.json')));
  } finally { server.close(); server.closeAllConnections(); }
});

test('lệnh doc: mã thoát theo trạng thái duyệt', () => {
  const d = banSao(), bs = bangMau();
  const chay = () => { try { execFileSync(process.execPath, [CLI, d, 'doc'], { encoding: 'utf8', stdio: 'pipe' }); return 0; } catch (e) { return e.status; } };
  assert.equal(chay(), 1); // chưa có file
  const mk = tt => Object.fromEntries(['nhanVat', 'boiCanh', 'shots'].map(k => [k, Object.fromEntries(bs[k].map(x => [x.id, { tt, ghiChu: '' }]))]));
  fs.writeFileSync(path.join(d, 'duyet-1.json'), JSON.stringify({ ...mk('sua'), tatCaDuyet: false }));
  assert.equal(chay(), 1);
  fs.writeFileSync(path.join(d, 'duyet-1.json'), JSON.stringify({ ...mk('duyet'), tatCaDuyet: true }));
  assert.equal(chay(), 0);
});
