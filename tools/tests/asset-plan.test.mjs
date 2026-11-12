// Kiểm tools/kb/asset-plan.mjs: liệt kê env/prop/anim còn thiếu, tra manifest + danh mục cục bộ, không tải mạng.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { lapKeHoach, tachTuThe, dichLoai, docDanhMuc, docKichBan, docEnvCo, docAnimCo, docTuStoryboard, docManifest } from '../kb/asset-plan.mjs';

const root = path.resolve(import.meta.dirname, '..', '..');
const kbChim = path.join(root, 'tools', 'tests', 'data', 'asset-plan-chim-bay.md');
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'asset-plan-'));
const ent = (id, pose, extra = {}) => ({ id, src: `assets/x/${id}.glb`, title: id, pose, ...extra });
const kb = (can_dung = [], shots = [], meta = {}) => ({ meta, shots, can_dung, loi_doc: [] });
const TOWN = { anim: [], noi: [['quang truong', 'square']], town: new Set(['square', 'home', 'street']) };

test('tachTuThe / dichLoai', () => {
  assert.deepEqual(tachTuThe('chim bay'), { loai: 'chim', tuThe: 'flying' });
  assert.deepEqual(tachTuThe('cá voi', 'pose=swimming'), { loai: 'cá voi', tuThe: 'swimming' });
  assert.deepEqual(dichLoai('tàu đắm'), ['shipwreck', 'wreck']);
  assert.deepEqual(dichLoai('penguin'), ['penguin']);
  assert.deepEqual(dichLoai('cây cọ'), ['palm']);
  assert.deepEqual(tachTuThe('cọ'), { loai: 'cọ', tuThe: null });
  assert.deepEqual(dichLoai('cỏ'), ['grass']);
});

test('chim bay: manifest chỉ có chim đậu -> prop không ứng viên + tuDung', () => {
  const man = [ent('x/bird-a', ['standing'])];
  const r = lapKeHoach({ kb: kb([{ kind: 'prop', name: 'chim bay', desc: '' }]), manifest: man, envCo: new Set(), animCo: new Set() });
  assert.equal(r.prop.length, 1);
  assert.equal(r.prop[0].tuThe, 'flying');
  assert.ok(!r.prop[0].ungVien.some((u) => u.id));
  assert.deepEqual(r.prop[0].coSanKhacTuThe.map((x) => x.id), ['x/bird-a']);
  assert.ok(r.tuDung.some((t) => t.loai === 'prop' && t.ten === 'chim bay'));
  const r2 = lapKeHoach({ kb: kb([{ kind: 'prop', name: 'chim bay', desc: '' }]), manifest: man, envCo: new Set(), animCo: new Set(), danhMuc: { muc: [], trangThai: { polyhaven: 'chua-co-danh-muc', kenney: 'co-file' } } });
  assert.equal(r2.prop[0].ungVien[0].nguon, 'chua-co-danh-muc');
  assert.deepEqual(r2.prop[0].ungVien[0].thieu, ['polyhaven']);
});

test('chim bay: manifest có chim bay -> đã có, không thiếu', () => {
  const man = [ent('x/bird-a', ['standing']), ent('x/bird-b', ['standing', 'flying'])];
  const r = lapKeHoach({ kb: kb([{ kind: 'prop', name: 'chim bay', desc: '' }]), manifest: man, envCo: new Set(), animCo: new Set() });
  assert.equal(r.prop.length, 0);
  assert.equal(r.daCo.prop[0].id, 'x/bird-b');
});

test('ứng viên từ GLB chưa vào manifest và từ assets/catalogs, kèm ghi công', () => {
  const g = tmp();
  fs.mkdirSync(path.join(g, 'assets', 'kenney', 'nature-kit'), { recursive: true });
  fs.writeFileSync(path.join(g, 'assets', 'kenney', 'nature-kit', 'bird_flying.glb'), '');
  fs.mkdirSync(path.join(g, 'assets', 'catalogs'), { recursive: true });
  fs.writeFileSync(path.join(g, 'assets', 'catalogs', 'polyfork.json'), JSON.stringify([{ id: 'polyfork/eagle-bird', ten: 'Eagle', tags: ['bird', 'flying'], giayPhep: 'CC BY 4.0' }]));
  const man = [];
  const dm = docDanhMuc(g, man);
  assert.equal(dm.trangThai.polyfork, 'co-file');
  assert.equal(dm.trangThai.polyhaven, 'chua-co-danh-muc');
  const r = lapKeHoach({ kb: kb([{ kind: 'prop', name: 'chim bay', desc: '' }]), manifest: man, envCo: new Set(), animCo: new Set(), danhMuc: dm });
  const uv = r.prop[0].ungVien;
  assert.deepEqual(uv.map((u) => u.nguon).sort(), ['kenney', 'polyfork']);
  assert.ok(uv.every((u) => u.dongManifest === false));
  assert.equal(uv.find((u) => u.nguon === 'kenney').giayPhep, 'CC0');
  assert.match(uv.find((u) => u.nguon === 'polyfork').ghiCong, /CC BY 4\.0/);
  assert.equal(r.tuDung.length, 0);
});

test('vật tĩnh không khai pose được coi là đứng; vật cần bay thì không', () => {
  const man = [ent('k/palm-a', undefined)];
  const nc = (tuThe) => lapKeHoach({ kb: kb([{ kind: 'prop', name: 'cọ', desc: tuThe ? 'pose=' + tuThe : '' }]), manifest: man, envCo: new Set(), animCo: new Set() });
  assert.equal(nc('standing').prop.length, 0);
  assert.equal(nc(null).prop.length, 0);
  assert.equal(nc('flying').prop.length, 1);
});

test('GLB đã có dòng manifest thì không tính là ứng viên mới', () => {
  const g = tmp();
  fs.mkdirSync(path.join(g, 'assets', 'kenney'), { recursive: true });
  fs.writeFileSync(path.join(g, 'assets', 'kenney', 'bird.glb'), '');
  const dm = docDanhMuc(g, [{ id: 'k/bird', src: 'assets/kenney/bird.glb' }]);
  assert.equal(dm.muc.length, 0);
});

test('env: thiếu có công thức / không công thức; env có sẵn và địa điểm thị trấn bị bỏ qua', () => {
  const shots = [{ id: 's1', at: 'square' }, { id: 's2', at: 'bến cảng sương mù' }, { id: 's3', at: 'hầm mỏ bỏ hoang' }, { id: 's4', at: 'kitchen' }, { id: 's5', at: 'quảng trường' }];
  const r = lapKeHoach({ kb: kb([], shots), manifest: [], envCo: new Set(['town', 'kitchen']), animCo: new Set(), tuStoryboard: TOWN });
  const ten = r.env.map((e) => e.ten);
  assert.deepEqual(ten, ['bến cảng sương mù', 'hầm mỏ bỏ hoang']);
  assert.equal(r.env[0].congThuc.env, 'sea');
  assert.equal(r.env[1].congThuc, null);
  assert.ok(r.tuDung.some((t) => t.loai === 'env' && t.ten === 'hầm mỏ bỏ hoang'));
  assert.deepEqual(r.env[0].shot, ['s2']);
});

test('env: mục "Cần dựng" đã có trong engine thì không thiếu; chưa có thì thiếu kèm mô tả', () => {
  const cd = [{ kind: 'env', name: 'kitchen', desc: 'bếp nhà tôi' }, { kind: 'env', name: 'tauNgam', desc: 'trong tàu ngầm' }];
  const r = lapKeHoach({ kb: kb(cd), manifest: [], envCo: new Set(['kitchen']), animCo: new Set() });
  assert.deepEqual(r.env.map((e) => e.ten), ['tauNgam']);
  assert.equal(r.env[0].moTa, 'trong tàu ngầm');
});

test('anim: chỉ thiếu tên lạ; mô tả tự do mà storyboard đoán được thì bỏ qua', () => {
  const cd = [{ kind: 'anim', name: 'kneel', desc: 'quỳ xuống' }];
  const shots = [{ id: 's1', action: 'walk' }, { id: 's2', action: 'chạy nhanh' }, { id: 's3', action: 'bay lượn' }, { id: 's4', action: 'Cheer' }];
  const r = lapKeHoach({ kb: kb(cd, shots), manifest: [], envCo: new Set(), animCo: new Set(['walk', 'cheer']), tuStoryboard: { anim: [['chay', 'run']], noi: [], town: new Set() } });
  assert.deepEqual(r.anim.sort(), ['bay lượn', 'kneel']);
});

test('vật cần đọc + tư thế của shot thành nhu cầu đạo cụ', () => {
  const shots = [{ id: 's1', read: 'cánh cụt', pose: 'standing' }, { id: 's2', notes: 'obj:mailbox_home' }];
  const man = [ent('polyfork/penguin-base', ['standing', 'swimming'], { title: 'Penguin' })];
  const r = lapKeHoach({ kb: kb([], shots), manifest: man, envCo: new Set(), animCo: new Set() });
  assert.equal(r.daCo.prop[0].id, 'polyfork/penguin-base');
  assert.deepEqual(r.prop.map((p) => p.ten), ['mailbox home']);
});

test('CLI trên kịch bản giả: ghi thieu.json, đăng ký bước asset, dùng lại khi không đổi', () => {
  const ep = '_test-asset-plan';
  const outDir = path.join(root, 'output', ep);
  const ra = path.join(tmp(), 'thieu.json');
  const run = (extra = []) => spawnSync(process.execPath, [path.join(root, 'tools', 'kb', 'asset-plan.mjs'), ep, '--kich-ban', kbChim, '--ra', ra, ...extra], { cwd: root, encoding: 'utf8' });
  try {
    const r = run();
    assert.equal(r.status, 0, r.stdout + r.stderr);
    const j = JSON.parse(fs.readFileSync(ra, 'utf8'));
    for (const k of ['env', 'prop', 'anim', 'tuDung']) assert.ok(Array.isArray(j[k]), k);
    assert.ok(j.anim.includes('kneel'));
    assert.ok(j.env.some((e) => e.ten === 'hầm mỏ bỏ hoang'));
    assert.ok(j.daCo.prop.some((p) => p.ten === 'chim bay'));   // manifest thật có hải âu bay
    const tt = JSON.parse(fs.readFileSync(path.join(outDir, 'kiem', 'trang-thai.json'), 'utf8'));
    assert.equal(tt.buoc.asset.xong, true);
    const r2 = run();
    assert.match(r2.stdout, /dùng lại/);
    assert.equal(run(['--force']).status, 0);
  } finally { fs.rmSync(outDir, { recursive: true, force: true }); }
});

test('đọc repo thật: envCo/animCo/storyboard/manifest/kịch bản mẫu', () => {
  assert.ok(docEnvCo(root).has('kitchen') && docEnvCo(root).has('sea') && !docEnvCo(root).has('tang'));
  assert.ok(docAnimCo(root).has('walk'));
  const sb = docTuStoryboard(root);
  assert.ok(sb.anim.length > 10 && sb.noi.length >= 5 && sb.town.has('square'));
  assert.ok(docManifest(root).length > 100);
  const k = docKichBan(path.join(root, 'tools', 'kb', 'tests', 'data', 'kb_tot.md'), root);
  assert.equal(k.shots.length, 8);
  const r = lapKeHoach({ kb: k, manifest: docManifest(root), envCo: docEnvCo(root), animCo: docAnimCo(root), tuStoryboard: sb });
  assert.deepEqual(r.anim, ['kneel']);
  assert.deepEqual(r.env, []);
});
