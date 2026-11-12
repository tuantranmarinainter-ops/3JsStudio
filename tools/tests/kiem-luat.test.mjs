// Kiểm tools/kiem-luat.mjs trên 2 trang giả (tools/tests/data). Kết quả ghi vào thư mục tạm.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..', '..');
const tool = path.join(root, 'tools', 'kiem-luat.mjs');
const treo = path.join(root, 'tools', 'tests', 'data', 'trang-treo.html');
const toiThieu = path.join(root, 'tools', 'tests', 'data', 'trang-toi-thieu.html');
const loiShot = path.join(root, 'tools', 'tests', 'data', 'trang-loi-shot.html');
const khongVai = path.join(root, 'tools', 'tests', 'data', 'trang-khong-vai.html');
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'kiem-luat-test-'));
const chay = (args, timeout = 120000) => spawnSync(process.execPath, [tool, ...args], { cwd: root, encoding: 'utf8', timeout });
const chayTrang = (d, extra = []) => {
  const out = path.join(d, 'kiem'), duyet = path.join(d, 'duyet');
  const r = chay([toiThieu, '--shots', 'all', '--jobs', '1', '--out', out, '--duyet', duyet, ...extra]);
  return { r, out, duyet, luat: path.join(out, 'luat.json') };
};
const doc = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const bo = (j) => { const c = JSON.parse(JSON.stringify(j)); delete c.luc; return c; };
const T = { timeout: 180000 };

test('trang treo -> mã 2, stderr có __ready', T, () => {
  const d = tmp();
  const t0 = Date.now();
  const r = chay([treo, '--cho', '3', '--out', path.join(d, 'k'), '--duyet', path.join(d, 'd')], 130000);
  assert.equal(r.status, 2, r.stdout + r.stderr);
  assert.match(r.stderr, /__ready/);
  assert.ok(Date.now() - t0 <= 130000);
});

test('trang tối thiểu: coMeasure false, skip, L4/L8/L11 có số', T, () => {
  const { r, luat } = chayTrang(tmp());
  assert.ok(r.status === 0 || r.status === 1, r.stdout + r.stderr);
  const j = doc(luat);
  assert.equal(j.coMeasure, false);
  const s = j.shots.s001.luat;
  for (const ma of ['L1', 'L3', 'L6', 'L9']) assert.ok(s[ma].skip, ma + ' phải skip');
  for (const ma of ['L2', 'L5', 'L10']) assert.ok(s[ma].skip || s[ma].ghiChu, ma + ' phải skip/miễn');
  assert.equal(s.L1.skip, 'khong-co-measure');
  for (const ma of ['L4', 'L8', 'L11']) assert.ok(s[ma].val !== null && s[ma].val !== undefined && !s[ma].skip, ma + ' phải có số');
});

test('luat.json đúng khoá', T, () => {
  const { luat } = chayTrang(tmp());
  const j = doc(luat);
  for (const k of ['ep', 'trang', 'luc', 'coMeasure', 'shots', 'tong', 'goi']) assert.ok(k in j, k);
  assert.deepEqual(Object.keys(j.shots), ['s001', 's002', 's003']);
  for (const id of Object.keys(j.shots)) {
    const s = j.shots[id];
    for (const k of ['type', 'dur', 'khung', 'luat', 'loi']) assert.ok(k in s, id + '.' + k);
    assert.equal(s.khung.length, 3);
    assert.deepEqual(Object.keys(s.luat), ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8', 'L9', 'L10', 'L11']);
    assert.ok(Array.isArray(s.loi));
  }
  assert.equal(j.tong.soShot, 3);
  assert.equal(typeof j.tong.shotLoi, 'number');
  assert.deepEqual(Object.keys(j.tong.theoLuat.L1), ['loi', 'tyLe', 'skip']);
  assert.equal(typeof j.goi.can, 'boolean');
  assert.ok(Array.isArray(j.goi.lyDo));
});

test('nhãn: ảnh 540x960 tồn tại, thư mục lỗi và lưới', T, () => {
  const { duyet } = chayTrang(tmp());
  const f = path.join(duyet, '01_shots', 's001_f0001.jpg');
  assert.ok(fs.existsSync(f));
  const b = fs.readFileSync(f);
  assert.equal(b[0], 0xff); assert.equal(b[1], 0xd8);
  // đọc kích thước từ marker SOF
  let i = 2, w = 0, h = 0;
  while (i < b.length) {
    if (b[i] !== 0xff) { i++; continue; }
    const m = b[i + 1];
    if (m >= 0xc0 && m <= 0xc3) { h = b.readUInt16BE(i + 5); w = b.readUInt16BE(i + 7); break; }
    i += 2 + b.readUInt16BE(i + 2);
  }
  assert.deepEqual([w, h], [540, 960]);
  assert.ok(fs.existsSync(path.join(duyet, '02_loi')));
});

test('chạy 2 lần: luat.json giống nhau trừ luc', T, () => {
  const a = chayTrang(tmp()), b = chayTrang(tmp());
  const ja = bo(doc(a.luat)), jb = bo(doc(b.luat));
  assert.deepEqual(ja, jb);
});

test('chạy một phần không ghi đè cả phim', T, () => {
  const d = tmp();
  const a = chayTrang(d);
  assert.ok(a.r.status === 0 || a.r.status === 1);
  const truoc = doc(a.luat);
  const r = chay([toiThieu, '--shots', 's002', '--jobs', '1', '--out', a.out, '--duyet', a.duyet]);
  assert.ok(r.status === 0 || r.status === 1, r.stdout + r.stderr);
  const j = doc(a.luat);
  assert.deepEqual(Object.keys(j.shots), ['s001', 's002', 's003']);
  assert.equal(j.tong.soShot, 3);
  assert.deepEqual(j.shots.s001, truoc.shots.s001);
  assert.ok(fs.existsSync(path.join(a.duyet, '01_shots', 's001_f0001.jpg')));
  // gõ ngược thứ tự: khoá vẫn theo thứ tự phim
  const r2 = chay([toiThieu, '--shots', 's003,s001', '--jobs', '1', '--out', a.out, '--duyet', a.duyet]);
  assert.ok(r2.status === 0 || r2.status === 1);
  assert.deepEqual(Object.keys(doc(a.luat).shots), ['s001', 's002', 's003']);
});

test('shot ném lỗi: lượt chạy hết, loiShot, mã 1', T, () => {
  const d = tmp();
  const out = path.join(d, 'k');
  const r = chay([loiShot, '--shots', 'all', '--jobs', '1', '--out', out, '--duyet', path.join(d, 'd')]);
  assert.equal(r.status, 1, r.stdout + r.stderr);
  const j = doc(path.join(out, 'luat.json'));
  assert.equal(j.tong.soShot, 3);
  assert.deepEqual(j.loiShot.map((x) => x.id), ['s002']);
  assert.equal(j.shots.s002.luat.L4.skip, 'loi');
  assert.equal(j.shots.s002.luat.L4.ok, false);
  assert.match(j.shots.s002.luat.L4.ghiChu, /^loi: /);
  assert.ok(j.shots.s001.luat.L4.val !== null);
});

test('có __measure nhưng không có vật nào gắn vai: coVai false, skip khong-co-vai', T, () => {
  const d = tmp();
  const out = path.join(d, 'k');
  const r = chay([khongVai, '--shots', 'all', '--jobs', '1', '--out', out, '--duyet', path.join(d, 'd')]);
  assert.ok(r.status === 0 || r.status === 1, r.stdout + r.stderr);
  const j = doc(path.join(out, 'luat.json'));
  assert.equal(j.coMeasure, true);
  assert.equal(j.coVai, false);
  assert.equal(j.shots.s001.luat.L1.skip, 'khong-co-vai');
});

test('dur tròn theo khung nguyên (2.4 - 1.6 không rơi dưới 0.8)', T, () => {
  const d = tmp();
  const t = path.join(d, 'p.html');
  fs.writeFileSync(t, fs.readFileSync(toiThieu, 'utf8').replace("{ id: 's001', index: 0, t0: 0, t1: 1, dur: 1, env: 'town' }", "{ id: 's001', index: 0, t0: 1.6, t1: 2.4, type: 'closeup', env: 'town' }"));
  const out = path.join(d, 'k');
  const r = chay([t, '--shots', 's001', '--jobs', '1', '--out', out, '--duyet', path.join(d, 'd')]);
  assert.ok(r.status === 0 || r.status === 1, r.stdout + r.stderr);
  const s = doc(path.join(out, 'luat.json')).shots.s001;
  assert.equal(s.dur, 0.8);
  assert.equal(s.luat.L11.ok, true);
});

const coVai = path.join(root, 'tools', 'tests', 'data', 'trang-co-vai.html');

test('trang coVai:false có hat/tang: L6/L8 không skip, L1/L3/L10 skip khong-co-vai', T, () => {
  const d = tmp(); const out = path.join(d, 'k');
  const r = chay([khongVai, '--shots', 'all', '--jobs', '1', '--out', out, '--duyet', path.join(d, 'd')]);
  assert.ok(r.status === 0 || r.status === 1, r.stdout + r.stderr);
  const s = doc(path.join(out, 'luat.json')).shots.s001.luat;
  for (const ma of ['L6', 'L8']) assert.ok(!s[ma].skip, ma + ' không được skip');
  for (const ma of ['L1', 'L2', 'L3', 'L5', 'L10']) assert.equal(s[ma].skip, 'khong-co-vai', ma);
});

test('chạy một phần trên trang có vai: coVai cấp cao vẫn true, coVaiShot theo shot', T, () => {
  const d = tmp(); const out = path.join(d, 'k'), du = path.join(d, 'd');
  const a = chay([coVai, '--shots', 'all', '--jobs', '1', '--out', out, '--duyet', du]);
  assert.ok(a.status === 0 || a.status === 1, a.stdout + a.stderr);
  assert.equal(doc(path.join(out, 'luat.json')).coVai, true);
  assert.equal(doc(path.join(out, 'luat.json')).shots.s002.coVaiShot, true);
  assert.ok(!doc(path.join(out, 'luat.json')).shots.s001.luat.L1.skip);
  chay([coVai, '--shots', 's002', '--jobs', '1', '--out', out, '--duyet', du]);
  const j = doc(path.join(out, 'luat.json'));
  assert.equal(j.coVai, true); assert.equal(j.coMeasure, true);
});

test('gộp: shot đổi dur được đo lại; shot bị xoá mất bản ghi + ảnh', T, () => {
  const d = tmp(); const out = path.join(d, 'k'), du = path.join(d, 'd');
  const p = path.join(d, 'p.html');
  const goc = fs.readFileSync(toiThieu, 'utf8');
  fs.writeFileSync(p, goc);
  const a = chay([p, '--shots', 'all', '--jobs', '1', '--out', out, '--duyet', du]);
  assert.ok(a.status === 0 || a.status === 1, a.stdout + a.stderr);
  const cu = doc(path.join(out, 'luat.json'));
  // s002 dài hơn (t1 2.5 -> 3.0), s003 bị xoá
  const moi = goc.replace("t1: 2.5, dur: 1.5", "t1: 3.0, dur: 2").replace(/\s*\{ id: 's003'[^\n]*\n/, '\n');
  assert.notEqual(moi, goc);
  fs.writeFileSync(p, moi);
  const r = chay([p, '--shots', 's001', '--jobs', '1', '--out', out, '--duyet', du]);
  assert.ok(r.status === 0 || r.status === 1, r.stdout + r.stderr);
  assert.match(r.stderr, /đo lại vì đổi: s002/);
  const j = doc(path.join(out, 'luat.json'));
  assert.deepEqual(Object.keys(j.shots), ['s001', 's002']);
  assert.equal(j.tong.soShot, 2);
  assert.equal(j.shots.s002.dur, 2);
  assert.ok(!j.shots.s003);
  for (const dir of ['01_shots', '02_loi']) assert.deepEqual(fs.readdirSync(path.join(du, dir)).filter((f) => f.startsWith('s003_')), []);
});
