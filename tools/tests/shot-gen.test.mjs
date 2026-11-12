// tools/shot-gen.mjs: kich-ban.md -> shots.js (luat camera don dap, insertRead, dur toi thieu, --khop-giong).
// Chay tren tap gia episodes/_test_shotgen (xoa khi xong), KHONG dung ep001.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { SHOT_TYPE_NAMES, expandShot } from '../../engine/shottypes.js';
import { nguong } from '../kiem/luat.mjs';
import { toiThieu, fit, khopGiong, lookAtOf, normId } from '../shot-gen.mjs';

const root = path.resolve(import.meta.dirname, '..', '..');
const EP = '_test_shotgen', epDir = path.join(root, 'episodes', EP);
const tool = path.join(root, 'tools', 'shot-gen.mjs');
const mau = path.join(root, 'tools', 'kb', 'tests', 'data', 'kb_tot.md');
const chay = (...a) => spawnSync(process.execPath, [tool, EP, ...a], { cwd: root, encoding: 'utf8', timeout: 120000 });
const docShots = async () => (await import(pathToFileURL(path.join(epDir, 'shots.js')).href + '?t=' + Date.now())).SHOTS;
const bangKb = fs.readFileSync(mau, 'utf8');
const ghiKb = (t) => fs.writeFileSync(path.join(epDir, 'kich-ban.md'), t);

before(() => { fs.rmSync(epDir, { recursive: true, force: true }); fs.mkdirSync(epDir, { recursive: true }); ghiKb(bangKb); });
after(() => fs.rmSync(epDir, { recursive: true, force: true }));

test('thieu kich-ban.md -> ma 1; da co shots.js ma thieu --force -> ma 1', async () => {
  const r0 = spawnSync(process.execPath, [tool, '_khong_co_tap_nay'], { cwd: root, encoding: 'utf8' });
  assert.equal(r0.status, 1);
  assert.equal(chay('--force').status, 0);
  const r = chay();
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stderr, /--force/);
});

test('kb_tot.md: id, type hop le, dur >= toi thieu, camera don dap', async () => {
  const r = chay('--force');
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const shots = await docShots();
  const kb = JSON.parse(spawnSync('python', ['-X', 'utf8', 'tools/kb/kichban.py', path.join(epDir, 'kich-ban.md'), '--json'], { cwd: root, encoding: 'utf8' }).stdout);
  assert.equal(shots.length, kb.shots.length);
  const L11 = nguong(epDir).L11;
  assert.deepEqual(shots.map((s) => s.id), kb.shots.map((s) => normId(s.id)));
  const ctx = {
    places: Object.fromEntries(shots.filter((s) => s.at).map((s) => [s.at, { pos: [0, 0, 0], ry: 0 }])),
    crowd: Array.from({ length: 24 }, (_, i) => 'crowd' + (i + 1)), env: 'kenneyTown', light: 'day', fps: 30,
  };
  const state = { at: null, actors: {}, env: ctx.env, light: ctx.light };
  const nguoi = {};
  for (const s of shots) {
    assert.ok(SHOT_TYPE_NAMES.includes(s.type), `${s.id}: type ${s.type}`);
    const min = toiThieu({ type: s.type, min: kb.shots.find((k) => normId(k.id) === s.id).min }, L11);
    assert.ok(s.dur >= min - 1e-9, `${s.id}: dur ${s.dur} < ${min}`);
    const ex = expandShot(s, ctx, state);
    const n = Object.keys(ex.cast).length;
    if (['insertRead', 'houseFull', 'sinkTilt', 'reveal'].includes(s.type)) continue;
    nguoi[s.id] = n;
    if (n === 1) assert.ok(ex.cam.dist2 < ex.cam.dist, `${s.id}: 1 nguoi phai zoom in (${ex.cam.dist} -> ${ex.cam.dist2})`);
    if (n >= 2) assert.ok(ex.cam.dist2 > ex.cam.dist, `${s.id}: >=2 nguoi phai zoom out (${ex.cam.dist} -> ${ex.cam.dist2})`);
  }
  assert.ok(Object.values(nguoi).includes(1) && Object.values(nguoi).some((n) => n >= 2), 'mau phai co ca 1 nguoi va nhieu nguoi: ' + JSON.stringify(nguoi));
  const s5 = shots.find((s) => s.id === 's005');
  assert.equal(s5.type, 'insertRead');
  assert.ok(s5.read);
  assert.equal(shots.find((s) => s.id === 's001').time, 'sang');
  assert.equal(shots.find((s) => s.id === 's003').weather, 'may');
  assert.equal(shots.find((s) => s.id === 's007').type, 'houseFull');
});

test('dur duoi toi thieu duoc nang len (L11)', async () => {
  ghiKb(bangKb.replace('| 1 |  | 1,5 |', '| 1 |  | 0,3 |').replace('| 5 |  | 2 |', '| 5 |  | 0,5 |'));
  const r = chay('--force');
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const shots = await docShots();
  const L11 = nguong(epDir).L11;
  assert.ok(shots[0].dur >= L11.establish);
  assert.ok(shots[4].dur >= L11.insertRead);
  ghiKb(bangKb);
});

test('--khop-giong: tong = total +-0.1, khong duoi toi thieu; thieu narration.json -> ma 1', async () => {
  fs.rmSync(path.join(epDir, 'narration.json'), { force: true });
  assert.equal(chay('--force', '--khop-giong').status, 1);
  const starts = [0, 3.0, 6.5, 9.0, 11.0, 13.5], total = 16.4;
  const lines = starts.map((s, i) => ({ line: i + 1, text: 'cau ' + i, start: s, end: s + 1.5 }));
  fs.writeFileSync(path.join(epDir, 'narration.json'), JSON.stringify({ dry: false, total, lines }));
  const r = chay('--force', '--khop-giong');
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const shots = await docShots();
  const tong = shots.reduce((a, s) => a + s.dur, 0), L11 = nguong(epDir).L11;
  assert.ok(Math.abs(tong - total) <= 0.1, `tong ${tong} != ${total}`);
  for (const s of shots) assert.ok(s.dur >= toiThieu({ type: s.type }, L11) - 1e-9, `${s.id} ${s.dur}`);
  const i2 = shots.findIndex((s) => s.line === 2);
  assert.ok(Math.abs(shots.slice(0, i2).reduce((a, s) => a + s.dur, 0) - 3.0) <= 0.1);
  assert.match(fs.readFileSync(path.join(epDir, 'narration.txt'), 'utf8'), /@at 3\.0\d /);
});

test('ham thuan: fit ghim san, khopGiong, lookAtOf', () => {
  assert.deepEqual(fit([1, 1, 1], [0.8, 0.8, 0.8], 6), [2, 2, 2]);
  assert.ok(fit([1, 1, 1], [0.8, 0.8, 0.8], 2).every((v) => v >= 0.8));
  assert.deepEqual(lookAtOf('1 2.5 3'), [1, 2.5, 3]);
  assert.equal(lookAtOf('mẹ'), 'mom');
  assert.equal(lookAtOf('máy quay'), 'cam');
  assert.equal(lookAtOf('nhà'), 'house');
  assert.equal(lookAtOf('hero'), 'hero');
  assert.deepEqual(khopGiong([{ dur: 1, line: 1 }, { dur: 1, line: 2 }], [0.8, 0.8], [{ start: 0 }, { start: 3 }], 5), [3, 2]);
  assert.throws(() => khopGiong([{ dur: 1, line: 1 }], [0.8], [{ start: 0 }, { start: 3 }], 5));
});
