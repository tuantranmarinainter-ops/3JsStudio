import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { lapKeHoach, soanDeBai } from '../codex-ve.mjs';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.join(aqui, '..', 'codex-ve.mjs');
const GIA = path.join(aqui, 'fixtures', 'codex-gia.mjs');
const MAU = path.join(aqui, 'fixtures', 'dau-vao-mau');
const bangMau = JSON.parse(fs.readFileSync(path.join(MAU, 'bang-shot.json'), 'utf8'));

function banSao() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-ve-'));
  const thuMuc = path.join(root, 'tap mau'); // có dấu cách, giống "S:\3JS Studio"
  fs.mkdirSync(thuMuc);
  fs.copyFileSync(path.join(MAU, 'bang-shot.json'), path.join(thuMuc, 'bang-shot.json'));
  return { root, thuMuc, state: path.join(root, 'state') };
}
function duyet(thuMuc) { fs.writeFileSync(path.join(thuMuc, 'duyet-1.json'), '{"duyet":true}'); }
function ref(thuMuc) {
  fs.mkdirSync(path.join(thuMuc, 'tham-chieu'), { recursive: true });
  for (const f of ['bc_pho', 'bc_tiem-banh', 'nv_ga', 'nv_ba-ban-banh']) fs.writeFileSync(path.join(thuMuc, 'tham-chieu', `${f}.png`), 'x');
}
function cli(args, extraEnv = {}, state) {
  return spawnSync(process.execPath, [CLI, ...args], {
    encoding: 'utf8',
    env: { ...process.env, CODEX_BIN: `node "${GIA}"`, CODEX_GIA_DIR: state, ...extraEnv },
  });
}
const dem = (d, ext = '.png') => (fs.existsSync(d) ? fs.readdirSync(d).filter((f) => f.endsWith(ext)).length : 0);
const peak = (state) => Math.max(0, ...fs.readFileSync(path.join(state, 'peak.log'), 'utf8').split('\n').filter(Boolean).map(Number));

test('kế hoạch tham-chieu: đủ 4 hình trong 1 cụm', () => {
  const ke = lapKeHoach(bangMau, 'tham-chieu');
  assert.equal(ke.length, 1);
  assert.deepEqual(ke[0].hinh.map((h) => h.file).sort(),
    ['tham-chieu/bc_pho.png', 'tham-chieu/bc_tiem-banh.png', 'tham-chieu/nv_ba-ban-banh.png', 'tham-chieu/nv_ga.png']);
  assert.ok(ke[0].hinh.every((h) => h.moTa.length > 10));
  const de = soanDeBai(ke[0], bangMau);
  assert.match(de, /FILE: tham-chieu\/nv_ga\.png/);
  assert.match(de, /TIEN-DO: codex\/tien-do-tc1\.txt/);
});

test('kế hoạch shot: 12 hình, 2 cụm theo bối cảnh, đúng ảnh kèm', () => {
  const ke = lapKeHoach(bangMau, 'shot');
  assert.deepEqual(ke.map((c) => c.cum), ['tiem-banh', 'pho']); // theo thứ tự khai báo boiCanh
  assert.equal(ke[0].hinh.length, 6); // s003(2) s004(1) s005(3)
  assert.equal(ke[1].hinh.length, 6); // s001(2) s002(2) s006(2)
  assert.equal(ke.reduce((n, c) => n + c.hinh.length, 0), 12);
  assert.deepEqual(ke[1].anhKem, ['tham-chieu/bc_pho.png', 'tham-chieu/nv_ga.png']);
  assert.deepEqual(ke[0].anhKem, ['tham-chieu/bc_tiem-banh.png', 'tham-chieu/nv_ga.png', 'tham-chieu/nv_ba-ban-banh.png']);
  const files = ke[0].hinh.map((h) => h.file);
  assert.ok(files.includes('hinh/shot_s005_giua.png'));
  assert.ok(files.includes('hinh/shot_s004_dau.png') && !files.includes('hinh/shot_s004_cuoi.png'));
  // hình đã có thì không đưa lại
  const ke2 = lapKeHoach(bangMau, 'shot', { coFile: (f) => /shot_s00[126]_/.test(f) });
  assert.deepEqual(ke2.map((c) => c.cum), ['tiem-banh']);
});

test('cụm quá 25 shot thì tách đôi', () => {
  const shots = Array.from({ length: 30 }, (_, i) => ({ id: `s${String(i + 1).padStart(3, '0')}`, boiCanh: 'pho', nhanVat: [], hinh: 1, dau: 'x' }));
  const ke = lapKeHoach({ ...bangMau, shots }, 'shot');
  assert.deepEqual(ke.map((c) => c.cum), ['pho-1', 'pho-2']);
  assert.equal(ke[0].hinh.length + ke[1].hinh.length, 30);
});

test('--thu: ghi đề bài, không tạo hình, không chạy Codex', () => {
  const b = banSao();
  const r = cli(['shot', b.thuMuc, '--thu'], {}, b.state);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /2 cụm, 12 hình/);
  assert.match(r.stdout, /codex-gia\.mjs/);
  assert.equal(dem(path.join(b.thuMuc, 'hinh')), 0);
  assert.equal(dem(path.join(b.thuMuc, 'codex'), '.md'), 2);
  assert.ok(!fs.existsSync(b.state), 'Codex giả không được chạy');
  const r2 = cli(['tham-chieu', b.thuMuc, '--thu'], {}, b.state);
  assert.equal(r2.status, 0);
  assert.match(r2.stdout, /1 cụm, 4 hình/);
});

test('tham-chieu chạy thật (Codex giả): đủ file, thoát 0; chạy lại thì "đủ"', () => {
  const b = banSao();
  const r = cli(['tham-chieu', b.thuMuc], {}, b.state);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.equal(dem(path.join(b.thuMuc, 'tham-chieu')), 4);
  assert.ok(fs.existsSync(path.join(b.thuMuc, 'codex', 'ket-qua-tham-chieu.json')));
  assert.ok(fs.existsSync(path.join(b.thuMuc, 'codex', 'tien-do-tc1.txt')));
  const r2 = cli(['tham-chieu', b.thuMuc], {}, b.state);
  assert.equal(r2.status, 0);
  assert.match(r2.stdout, /Đủ/);
});

test('shot chạy thật: 12 hình, kèm ảnh tham chiếu bằng -i, chạy lại thì "đủ"', () => {
  const b = banSao();
  duyet(b.thuMuc); ref(b.thuMuc);
  const r = cli(['shot', b.thuMuc], {}, b.state);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.equal(dem(path.join(b.thuMuc, 'hinh')), 12);
  const calls = fs.readFileSync(path.join(b.state, 'calls.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  assert.equal(calls.length, 2);
  assert.ok(calls.every((c) => c.images.length >= 2 && c.images.every((i) => i.endsWith('.png'))));
  assert.ok(calls.every((c) => path.resolve(c.cwd) === path.resolve(b.thuMuc)));
  const r2 = cli(['shot', b.thuMuc], {}, b.state);
  assert.equal(r2.status, 0);
  assert.match(r2.stdout, /Đủ/);
  assert.equal(calls.length, 2);
});

test('Codex sót 1 file: thoát 1 và nêu đúng file', () => {
  const b = banSao();
  duyet(b.thuMuc); ref(b.thuMuc);
  const r = cli(['shot', b.thuMuc], { CODEX_GIA_SOT: 'shot_s005_giua' }, b.state);
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stdout, /hinh\/shot_s005_giua\.png/);
  assert.equal(dem(path.join(b.thuMuc, 'hinh')), 11);
  const kq = JSON.parse(fs.readFileSync(path.join(b.thuMuc, 'codex', 'ket-qua-shot.json'), 'utf8'));
  assert.deepEqual(kq.thieu, ['hinh/shot_s005_giua.png']);
});

test('thiếu duyet-1.json: thoát 2, không chạy gì', () => {
  const b = banSao();
  const r = cli(['shot', b.thuMuc], {}, b.state);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /duyet-1\.json/);
  assert.equal(dem(path.join(b.thuMuc, 'hinh')), 0);
});

test('trần song song được tôn trọng', () => {
  const b1 = banSao(); duyet(b1.thuMuc); ref(b1.thuMuc);
  const r1 = cli(['shot', b1.thuMuc, '--tran', '1'], { CODEX_GIA_NGU: '500' }, b1.state);
  assert.equal(r1.status, 0, r1.stdout + r1.stderr);
  assert.equal(peak(b1.state), 1);
  const b2 = banSao(); duyet(b2.thuMuc); ref(b2.thuMuc);
  const r2 = cli(['shot', b2.thuMuc, '--tran', '2'], { CODEX_GIA_NGU: '500' }, b2.state);
  assert.equal(r2.status, 0, r2.stdout + r2.stderr);
  assert.equal(peak(b2.state), 2);
});

test('rate limit lần đầu: chạy lại cụm bị giới hạn một lần với trần giảm một nửa', () => {
  const b = banSao(); duyet(b.thuMuc); ref(b.thuMuc);
  const r = cli(['shot', b.thuMuc, '--tran', '2'], { CODEX_GIA_429: '1', CODEX_GIA_NGU: '200' }, b.state);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /Bị giới hạn/);
  assert.equal(dem(path.join(b.thuMuc, 'hinh')), 12);
  const kq = JSON.parse(fs.readFileSync(path.join(b.thuMuc, 'codex', 'ket-qua-shot.json'), 'utf8'));
  assert.equal(kq.cum.filter((c) => c.gioiHan).length, 1);
  assert.equal(kq.cum.filter((c) => c.chayLai).length, 1);
});
