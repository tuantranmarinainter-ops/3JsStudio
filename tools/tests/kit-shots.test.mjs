import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { kitSangShots, dungModule } from '../kit-shots.mjs';
import { SHOT_TYPES } from '../../engine/shottypes.js';

const AQ = path.dirname(fileURLToPath(import.meta.url));
const MAU = path.join(AQ, 'fixtures', 'dau-vao-mau');
const CLI = path.join(AQ, '..', 'kit-shots.mjs');
const doc = (f, d = MAU) => JSON.parse(fs.readFileSync(path.join(d, f), 'utf8'));
const bs = () => doc('bang-shot.json'), kit = () => doc('kit.json');
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const taoTam = () => { const d = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-shots-')); for (const f of ['bang-shot.json', 'kit.json']) fs.copyFileSync(path.join(MAU, f), path.join(d, f)); return d; };

test('bộ mẫu sinh đủ 6 shot, id và dur khớp', () => {
  const b = bs(), { shots } = kitSangShots(b, kit());
  assert.equal(shots.length, 6);
  b.shots.forEach((s, i) => { assert.equal(shots[i].id, s.id); assert.equal(shots[i].dur, s.dur); assert.equal(shots[i].env, s.boiCanh); });
});

test('mọi type sinh ra có trong engine/shottypes.js', () => {
  for (const s of kitSangShots(bs(), kit()).shots) assert.ok(SHOT_TYPES[s.type], `type ${s.type} của ${s.id}`);
});

test('zoomIn: máy→điểm nhìn cuối gần hơn đầu; zoomOut thì xa hơn', () => {
  const b = bs(), { shots } = kitSangShots(b, kit());
  for (const [i, s] of b.shots.entries()) {
    const c = shots[i].cam; if (!c.p2) continue;
    const d0 = dist(c.p, c.l), d1 = dist(c.p2, c.l2);
    if (s.camera.loai === 'zoomIn') assert.ok(d1 < d0, `${s.id}: ${d1} < ${d0}`);
    if (s.camera.loai === 'zoomOut') assert.ok(d1 > d0, `${s.id}: ${d1} > ${d0}`);
  }
});

test('dung: camera đầu = cuối (không có p2)', () => {
  const b = bs(), { shots } = kitSangShots(b, kit());
  const i = b.shots.findIndex((s) => s.camera.loai === 'dung');
  assert.ok(i >= 0);
  assert.equal(shots[i].cam.p2, undefined);
  assert.equal(shots[i].cam.l2, undefined);
});

test('camera đầu/cuối và nhân vật khớp kit', () => {
  const k = kit(), { shots } = kitSangShots(bs(), k);
  const s006 = shots.find((s) => s.id === 's006'), ks = k.shots.find((s) => s.id === 's006');
  assert.deepEqual(s006.cam.p, ks.may.dau.p);
  assert.deepEqual(s006.cam.p2, ks.may.cuoi.p);
  assert.deepEqual(s006.cast.ga.at, [-14, 0, 0]);
  assert.deepEqual(s006.cast.ga.to, [14, 0, 0]);
  assert.equal(s006.cast.ga.anim, 'run');   // 28 stud / 1,1 s > ngưỡng chạy
});

test('hinh:3 dùng điểm giữa của engine (cam.pm/lm/fovm, cast.atm), không còn CẦN SỬA TAY; vi phạm luật được đếm', () => {
  const r = kitSangShots(bs(), kit());
  const s005 = r.shots.find((s) => s.id === 's005'), k5 = kit().shots.find((s) => s.id === 's005');
  assert.deepEqual(s005.cam.pm, k5.may.giua.p); assert.deepEqual(s005.cam.lm, k5.may.giua.nhin);
  assert.equal(s005.cam.fovm, 38);                       // 38 ≠ trung bình (38+40)/2 → ghi fovm
  assert.deepEqual(s005.cast.ga.atm, [0, 1.6, 3]);       // Gà nhảy lên ở khung giữa
  assert.equal(s005.cast.ga.to, undefined); assert.equal(s005.cast.ga.ease, 'linear');
  assert.ok(!r.ghiChu.some((g) => g.id === 's005' && g.loai === 'sua-tay'));
  for (const s of r.shots) if (s.id !== 's005') { assert.equal(s.cam.pm, undefined); for (const c of Object.values(s.cast || {})) assert.equal(c.atm, undefined); }
  const mod = dungModule(r, 'mau');
  assert.doesNotMatch(mod.split('\n').find((l) => l.includes('"s005"')), /CẦN SỬA TAY/);
  // hinh:3 mà kit thiếu may.giua → vẫn báo sửa tay
  const kThieu = kit(); delete kThieu.shots.find((s) => s.id === 's005').may.giua;
  assert.ok(kitSangShots(bs(), kThieu).ghiChu.some((g) => g.id === 's005' && g.loai === 'sua-tay' && /may\.giua/.test(g.msg)));
  // s005: 1 nhân vật mà máy lùi ra (doiHuong) → vi phạm luật
  assert.ok(r.ghiChu.some((g) => g.id === 's005' && g.loai === 'luat' && /zoom out/.test(g.msg)));
});

test('--goc: dịch và xoay 90° đúng toạ độ', () => {
  const k = kit(), goc = { pho: { goc: [100, 0, 50], xoay: 90 } };
  const a = kitSangShots(bs(), k).shots.find((s) => s.id === 's006');
  const b = kitSangShots(bs(), k, goc).shots.find((s) => s.id === 's006');
  // (x,z) → (x·cos+z·sin, −x·sin+z·cos) với θ=90°: (x,z) → (z, −x), rồi + gốc
  const map = (p) => [100 + p[2], p[1], 50 - p[0]];
  assert.deepEqual(b.cam.p, map(a.cam.p));
  assert.deepEqual(b.cam.l2, map(a.cam.l2));
  assert.deepEqual(b.cast.ga.at, map(a.cast.ga.at));
  assert.deepEqual(b.cast.ga.to, map(a.cast.ga.to));
  assert.ok(Math.abs(b.cast.ga.ry - (a.cast.ga.ry + Math.PI / 2)) < 1e-3);
  // bối cảnh khác không bị ảnh hưởng
  const a3 = kitSangShots(bs(), k).shots.find((s) => s.id === 's003'), b3 = kitSangShots(bs(), k, goc).shots.find((s) => s.id === 's003');
  assert.deepEqual(a3.cam, b3.cam);
});

test('CLI: kit còn lỗi → thoát 2, không ghi file', () => {
  const d = taoTam(), k = doc('kit.json', d);
  k.shots[0].may.dau.fov = 5;
  fs.writeFileSync(path.join(d, 'kit.json'), JSON.stringify(k));
  const r = spawnSync(process.execPath, [CLI, d], { encoding: 'utf8' });
  assert.equal(r.status, 2, r.stdout + r.stderr);
  assert.match(r.stdout, /fov/);
  assert.equal(fs.existsSync(path.join(d, 'shots.tao.js')), false);
});

test('CLI: bản sao bộ mẫu ra file import được, có thống kê', async () => {
  const d = taoTam(), ra = path.join(d, 'ra', 'shots.js');
  const r = spawnSync(process.execPath, [CLI, d, '--ra', ra], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /Theo loại:/);
  assert.match(r.stdout, /Cần sửa tay: \d+ shot/);
  assert.match(r.stdout, /Vi phạm luật camera: \d+ shot/);
  const m = await import(pathToFileURL(ra).href);
  assert.equal(m.SHOTS.length, 6);
  for (const s of m.SHOTS) assert.ok(SHOT_TYPES[s.type]);
  // mặc định ghi vào thư mục tập, không đụng episodes/
  const r2 = spawnSync(process.execPath, [CLI, d], { encoding: 'utf8' });
  assert.equal(r2.status, 0);
  assert.ok(fs.existsSync(path.join(d, 'shots.tao.js')));
});
