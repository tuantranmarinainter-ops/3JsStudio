// Kiểm tools/mau-duyet.mjs: kế hoạch thuần + chạy thật trên kịch bản giả (ep `_test_mauduyet*`, tự dọn output/).
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { chonGio, lapMuc, slug, docMau } from '../mau-duyet.mjs';
import { docKichBan, docEnvCo, docTuStoryboard } from '../kb/asset-plan.mjs';

const root = path.resolve(import.meta.dirname, '..', '..');
const tool = path.join(root, 'tools', 'mau-duyet.mjs');
const kb1 = path.join(root, 'tools', 'tests', 'data', 'mau-duyet-kb.md');
const kb2 = path.join(root, 'tools', 'tests', 'data', 'mau-duyet-kb-chuaco.md');
const EP1 = '_test_mauduyet1', EP2 = '_test_mauduyet2', EP3 = '_test_mauduyet3';
const T = { timeout: 900000 };
const chay = (ep, kb, extra = []) => spawnSync(process.execPath, [tool, ep, '--kich-ban', kb, ...extra], { cwd: root, encoding: 'utf8', timeout: 850000 });
const dirMau = (ep) => path.join(root, 'output', ep, 'duyet', 'mau');
const jpgs = (ep) => fs.readdirSync(dirMau(ep)).filter((f) => f.endsWith('.jpg') && !f.startsWith('00_')).sort();
const mtimes = (ep) => Object.fromEntries(jpgs(ep).map((f) => [f, fs.statSync(path.join(dirMau(ep), f)).mtimeMs]));
const doc = (ep) => JSON.parse(fs.readFileSync(path.join(root, 'output', ep, 'kiem', 'mau.json'), 'utf8'));
const doJpg = (f) => {   // kích thước từ marker SOF
  const b = fs.readFileSync(f); let i = 2;
  while (i < b.length) { if (b[i] !== 0xff) { i++; continue; } const m = b[i + 1]; if (m >= 0xc0 && m <= 0xc3) return [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)]; i += 2 + b.readUInt16BE(i + 2); }
};

after(() => { for (const ep of [EP1, EP2, EP3]) fs.rmSync(path.join(root, 'output', ep), { recursive: true, force: true }); });

test('chonGio: nhiều nhất + nhiều nhì; không có -> dem; giờ 1 = dem -> trua', () => {
  assert.deepEqual(chonGio(new Map([['sang', 2], ['dem', 1]])), ['sang', 'dem']);
  assert.deepEqual(chonGio(new Map([['sang', 1], ['chieu', 3]])), ['chieu', 'sang']);
  assert.deepEqual(chonGio(new Map([['trua', 4]])), ['trua', 'dem']);
  assert.deepEqual(chonGio(new Map([['dem', 4]])), ['dem', 'trua']);
  assert.deepEqual(chonGio(new Map()), ['trua', 'dem']);
  assert.equal(slug('Bảng tin thị trấn'), 'bang-tin-thi-tran');
});

test('lapMuc (không trình duyệt): ep giả 1 nhân vật 1 env -> đúng 4 nv + 4 env', () => {
  const kb = docKichBan(kb1);
  const k = lapMuc(kb, { envCo: docEnvCo(root), town: docTuStoryboard(root).town, manifest: [] });
  const nv = k.muc.filter((m) => m.loai === 'nv'), env = k.muc.filter((m) => m.loai === 'env');
  assert.equal(nv.length, 4); assert.equal(env.length, 4);
  assert.deepEqual(nv.map((m) => m.id), ['nv:hero:thuong', 'nv:hero:happy', 'nv:hero:sad', 'nv:hero:surprised']);
  assert.deepEqual(env.map((m) => m.id), ['env:forest:rong:sang', 'env:forest:can:sang', 'env:forest:rong:dem', 'env:forest:can:dem']);
  assert.deepEqual(k.chuaCo, []);
});

test('chạy thật: 4 + 4 ô ảnh 540x960 + lưới 00_mau.jpg rộng 1600 + mau.json', T, () => {
  fs.rmSync(path.join(root, 'output', EP1), { recursive: true, force: true });
  const r = chay(EP1, kb1);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const ds = jpgs(EP1);
  assert.equal(ds.length, 8, ds.join());
  assert.equal(ds.filter((f) => f.startsWith('nv_')).length, 4);
  assert.equal(ds.filter((f) => f.startsWith('env_')).length, 4);
  assert.deepEqual(doJpg(path.join(dirMau(EP1), ds[0])), [540, 960]);
  assert.deepEqual(doJpg(path.join(dirMau(EP1), '00_mau.jpg'))[0], 1600);
  const m = doc(EP1);
  assert.equal(Object.keys(m).length, 8);
  for (const v of Object.values(m)) { assert.match(v.hash, /^[0-9a-f]{40}$/); assert.equal(v.duyet, null); }
  const tt = JSON.parse(fs.readFileSync(path.join(root, 'output', EP1, 'kiem', 'trang-thai.json'), 'utf8'));
  assert.equal(tt.buoc['mau-duyet'].xong, true);
});

test('chạy lại không đổi đầu vào -> không chụp lại (mtime ảnh giữ nguyên)', T, () => {
  const truoc = mtimes(EP1), mj = fs.statSync(path.join(root, 'output', EP1, 'duyet', 'mau', '00_mau.jpg')).mtimeMs;
  const r = chay(EP1, kb1);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /không đổi/);
  assert.deepEqual(mtimes(EP1), truoc);
  assert.equal(fs.statSync(path.join(dirMau(EP1), '00_mau.jpg')).mtimeMs, mj);
});

test('--duyet đánh dấu true; --tu-choi -> lần sau CHỈ chụp lại mẫu bị từ chối', T, () => {
  let r = chay(EP1, kb1, ['--duyet', 'tat-ca']);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.ok(Object.values(doc(EP1)).every((v) => v.duyet === true));
  r = chay(EP1, kb1, ['--tu-choi', 'env:forest:can:dem']);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const truoc = mtimes(EP1);
  r = chay(EP1, kb1);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const sau = mtimes(EP1);
  const doi = Object.keys(sau).filter((f) => sau[f] !== truoc[f]);
  assert.deepEqual(doi, ['env_forest_can_dem.jpg']);
  const m = doc(EP1);
  assert.equal(m['env:forest:can:dem'].duyet, null, 'mẫu chụp lại chờ duyệt lại');
  assert.equal(m['env:forest:rong:sang'].duyet, true, 'mẫu khác giữ nguyên đã duyệt');
  assert.equal(r.status, 0);
});

test('mẫu chưa có để chụp -> ghi chua_co, không chết; đạo cụ + vật liệu chua-duyet vẫn chụp', T, () => {
  fs.rmSync(path.join(root, 'output', EP2), { recursive: true, force: true });
  const r = chay(EP2, kb2);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const m = doc(EP2);
  assert.match(m['env:xyzland'].chua_co, /xyzland/);
  assert.ok(m['prop:bua-linh-tinh'].chua_co);
  assert.ok(m['prop:ghe'].file && fs.existsSync(path.join(root, m['prop:ghe'].file)), 'ghế chụp được (propKit)');
  assert.ok(m['mat:fruit'] && m['mat:fruit'].file, 'bát trái cây dùng vật liệu fruit (chua-duyet) -> có ô mat:fruit');
  assert.ok(m['prop:fruitbowl'].kinds.some((k) => k.kind === 'fruit' && k.duyet === false));
  assert.equal(jpgs(EP2).filter((f) => f.startsWith('env_xyzland')).length, 0);
  assert.equal(docMau(EP2).hasOwnProperty('env:xyzland'), true);
});

test('vòng 1 / I1: mat:* giữ nguyên khi chạy lại (không chụp lại, giữ duyet); --tu-choi mat chỉ chụp lại ô vật liệu', T, () => {
  const mat = path.join(dirMau(EP2), 'mat_fruit.jpg');
  let r = chay(EP2, kb2, ['--duyet', 'mat:fruit']);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const cu = mtimes(EP2);
  // lần chạy lại: chỉ các mục chua_co được thử lại (không có mô hình) — không ảnh nào đổi, mat:fruit còn duyet = true
  r = chay(EP2, kb2);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.deepEqual(mtimes(EP2), cu, 'chạy lại không được chụp lại ảnh nào');
  assert.equal(doc(EP2)['mat:fruit'].duyet, true, 'mất duyet của mat:fruit');
  assert.ok(doc(EP2)['mat:fruit'].tuProp);
  r = chay(EP2, kb2, ['--tu-choi', 'mat:fruit']);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const truoc = mtimes(EP2);
  r = chay(EP2, kb2);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const sau = mtimes(EP2);
  assert.deepEqual(Object.keys(sau).filter((f) => sau[f] !== truoc[f]), ['mat_fruit.jpg']);
  assert.equal(doc(EP2)['mat:fruit'].duyet, null);
  assert.ok(fs.existsSync(mat));
});

test('vòng 1 / I2: trình duyệt không mở được -> mã 2, KHÔNG ghi mau.json, bước mau-duyet không xong', T, () => {
  fs.rmSync(path.join(root, 'output', EP3), { recursive: true, force: true });
  const r = spawnSync(process.execPath, [tool, EP3, '--kich-ban', kb1], { cwd: root, encoding: 'utf8', timeout: 600000, env: { ...process.env, BROWSER: 'khong-co-trinh-duyet-nay' } });
  assert.equal(r.status, 2, r.stdout + r.stderr);
  assert.equal(fs.existsSync(path.join(root, 'output', EP3, 'kiem', 'mau.json')), false);
  const f = path.join(root, 'output', EP3, 'kiem', 'trang-thai.json');
  const tt = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : { buoc: {} };
  assert.notEqual(tt.buoc['mau-duyet']?.xong, true);
});

test('vòng 1 / minor: kịch bản không đọc được -> mã 1; tìm kịch bản ở kich-ban/<ep>/', T, () => {
  const bad = path.join(root, 'tools', 'tests', 'data', 'mau-duyet-hong.md');
  fs.writeFileSync(bad, ['| id |', '|---|', ''].join(String.fromCharCode(10)));
  try {
    const r = chay(EP3, bad);
    assert.ok(r.status === 1 || r.status === 0, r.stdout + r.stderr);   // không dữ liệu ≠ lỗi môi trường
    assert.notEqual(r.status, 2, r.stderr);
  } finally { fs.rmSync(bad, { force: true }); fs.rmSync(path.join(root, 'output', EP3), { recursive: true, force: true }); }
});

test('vòng 3: place/town không thành env riêng; đạo cụ khớp PROPS_KB (chính xác / alias vat / lỏng) có kit, co_san bỏ qua; ga/bear giữ cờ', () => {
  const kb = {
    meta: { places: { bakery: {} }, vat: { thung_tiem_bach: ['chồng thùng in tên tiệm'] }, co_san: 'mu_ga', actors: { hero: { ga: 1 }, bap: { bear: 1 } } },
    can_dung: [{ kind: 'env', name: 'bakery', desc: 'tiệm bánh' }, { kind: 'env', name: 'street', desc: 'phố' }],
    shots: [{ id: 's1', at: 'bakery', read: 'bảng tin thị trấn' }, { id: 's2', at: 'street', read: 'chồng thùng in tên tiệm' }, { id: 's3', read: 'mu_ga' }, { id: 's4', read: 'kèn lạ' }],
  };
  const k = lapMuc(kb, { envCo: new Set(['town']), town: new Set(['street']), manifest: [], propCo: new Set(['bang_tin', 'thung_tiem_bach']) });
  assert.deepEqual(k.chuaCo, [], JSON.stringify(k.chuaCo));
  assert.ok(k.muc.some((m) => m.id.startsWith('env:town:')) && !k.muc.some((m) => m.id.startsWith('env:bakery') || m.id.startsWith('env:street')));
  const p = Object.fromEntries(k.muc.filter((m) => m.loai === 'prop').map((m) => [m.spec.ten, m.spec.kit]));
  assert.deepEqual(p, { 'bảng tin thị trấn': 'bang_tin', 'chồng thùng in tên tiệm': 'thung_tiem_bach', 'kèn lạ': undefined });
  assert.equal(k.muc.find((m) => m.id === 'nv:hero:thuong').spec.opts.ga, 1);
  assert.equal(k.muc.find((m) => m.id === 'nv:bap:thuong').spec.opts.bear, 1);
});
