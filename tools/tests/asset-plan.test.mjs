// Kiểm tools/kb/asset-plan.mjs: liệt kê env/prop/anim còn thiếu, tra manifest + danh mục cục bộ, không tải mạng.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { chay, lapKeHoach, tachTuThe, dichLoai, docDanhMuc, docKichBan, docEnvCo, docAnimCo, docTuStoryboard, docManifest } from '../kb/asset-plan.mjs';

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

test('"cửa" không bị khớp thành "cua" (cua = crab)', () => {
  assert.deepEqual(dichLoai('cửa'), ['door']);
  assert.deepEqual(dichLoai('cửa sổ'), ['window']);
  assert.deepEqual(dichLoai('cua'), ['crab']);
  assert.deepEqual(dichLoai('con cua biển'), ['crab']);
});

test('ep001 dựng lại (manifest giả): đúng 5 thứ phải dựng tay', () => {
  const k = docKichBan(path.join(root, 'tools', 'tests', 'data', 'asset-plan-ep001.md'), root);
  const man = [
    ent('polyfork/penguin-base', ['standing', 'swimming'], { title: 'Penguin' }), ent('sea/killer_whale', ['swimming'], { title: 'Cá voi sát thủ' }),
    ent('sea/sperm_whale', ['standing', 'swimming'], { title: 'Whale' }), ent('polyfork/herring-gull', ['standing', 'flying'], { title: 'Herring Gull' }),
    ent('polyfork/old-lighthouse', undefined, { title: 'Old Lighthouse' }), ent('polyfork/curbside-mailbox', undefined, { title: 'Curbside Mailbox' }),
    ent('pirate-kit/boat-row-large', undefined), ent('pirate-kit/palm-bend', undefined),
  ];
  const r = lapKeHoach({ kb: k, manifest: man, envCo: new Set(['town', 'hawaii', 'kitchen', 'island', 'antarctica', 'sahara']),
    animCo: new Set(['idle', 'hug', 'shiver', 'tumble']), tuStoryboard: TOWN });
  assert.deepEqual(r.prop.map((p) => p.ten).sort(), ['buồm', 'cua', 'kim tự tháp', 'lạc đà', 'san hô']);
  assert.deepEqual(r.tuDung.map((t) => t.ten).sort(), ['buồm', 'cua', 'kim tự tháp', 'lạc đà', 'san hô']);
  assert.deepEqual(r.env, []);
  assert.deepEqual(r.anim, []);
});

test('bộ nhớ đệm mất hiệu lực khi env / GLB / catalog / công thức đổi', () => {
  const g = tmp();
  const cp = (rel) => { fs.mkdirSync(path.dirname(path.join(g, rel)), { recursive: true }); fs.copyFileSync(path.join(root, rel), path.join(g, rel)); };
  for (const f of ['tools/kb/kichban.py', 'tools/storyboard.py', 'engine/r15.js', 'engine/shottypes.js', 'engine/envs.js', 'engine/envs/cong-thuc.js', 'engine/envs/town.js']) cp(f);
  fs.mkdirSync(path.join(g, 'assets'), { recursive: true });
  fs.writeFileSync(path.join(g, 'assets', 'manifest.json'), '[]');
  const kbf = path.join(g, 'kb.md'), ra = path.join(g, 'thieu.json');
  fs.copyFileSync(kbChim, kbf);
  const chayLai = () => {
    const log = []; const cu = console.log; console.log = (...a) => log.push(a.join(' '));
    try { const ma = chay('ep-cache', { kichBan: kbf, ra, goc: g }); assert.equal(ma, 0); } finally { console.log = cu; }
    return log.join('\n');
  };
  assert.doesNotMatch(chayLai(), /dùng lại/);
  assert.match(chayLai(), /dùng lại/);
  fs.writeFileSync(path.join(g, 'engine', 'envs', 'moi.js'), 'export default 1;\n');
  assert.doesNotMatch(chayLai(), /dùng lại/, 'env mới');
  assert.match(chayLai(), /dùng lại/);
  fs.mkdirSync(path.join(g, 'assets', 'kenney'), { recursive: true });
  fs.writeFileSync(path.join(g, 'assets', 'kenney', 'bird.glb'), '');
  assert.doesNotMatch(chayLai(), /dùng lại/, 'GLB mới');
  assert.match(chayLai(), /dùng lại/);
  fs.mkdirSync(path.join(g, 'assets', 'catalogs'), { recursive: true });
  fs.writeFileSync(path.join(g, 'assets', 'catalogs', 'polyfork.json'), '[]');
  assert.doesNotMatch(chayLai(), /dùng lại/, 'catalog mới');
  assert.match(chayLai(), /dùng lại/);
  fs.appendFileSync(path.join(g, 'engine', 'envs', 'cong-thuc.js'), '\n// đổi\n');
  assert.doesNotMatch(chayLai(), /dùng lại/, 'công thức đổi');
});

// ---------- C1: đạo cụ dựng bằng code / sổ đạo cụ theo kịch bản / diễn viên gấu-gà / place ----------
import { docPropCo } from '../kb/asset-plan.mjs';

test('C1: đạo cụ có khoá trong propKit hoặc props-kb -> đã có, không đòi dựng', () => {
  const propCo = new Set(['fridge', 'bap', 'day_chuyen', 'mu_ga']);
  const r = lapKeHoach({
    kb: kb([{ kind: 'prop', name: 'bap', desc: 'gấu' }, { kind: 'prop', name: 'dây chuyền', desc: '' }, { kind: 'prop', name: 'tủ lạnh', desc: '' }, { kind: 'prop', name: 'mu_ga', desc: '' }, { kind: 'prop', name: 'đồng hồ', desc: '' }]),
    manifest: [], envCo: new Set(), animCo: new Set(), propCo,
  });
  assert.deepEqual(r.prop.map((p) => p.ten), ['đồng hồ']);
  assert.deepEqual(r.daCo.prop.map((p) => p.ten).sort(), ['bap', 'dây chuyền', 'mu_ga', 'tủ lạnh']);
  assert.ok(r.daCo.prop.every((p) => p.nguon === 'code'));
});

test('C1: docPropCo đọc khoá propKit + PROPS_KB; props-kb.js chưa có -> rỗng, không ném', () => {
  const g = tmp();
  fs.mkdirSync(path.join(g, 'engine'));
  fs.writeFileSync(path.join(g, 'engine', 'props.js'), "export function propKit(THREE) {\n  const K = {\n    M, mesh, box,\n\n    fridge({ a = 1 } = {}) {},\n    mailbox() {},\n    bush(r = 2) { return 1; },\n  };\n  return K;\n}\n");
  const a = docPropCo(g);
  assert.ok(a.has('fridge') && a.has('mailbox') && a.has('bush'));
  assert.ok(!a.has('mesh') && !a.has('box'), 'bỏ hàm phụ');
  fs.writeFileSync(path.join(g, 'engine', 'props-kb.js'), "export const PROPS_KB = {\n  'bap': (THREE) => null,\n  day_chuyen: (THREE) => null,\n  \"ve\": (T) => null,\n};\n");
  const b = docPropCo(g);
  assert.ok(b.has('bap') && b.has('day_chuyen') && b.has('ve') && b.has('fridge'));
  fs.writeFileSync(path.join(g, 'engine', 'props-kb.js'), 'đây không phải JS hợp lệ {{{');
  assert.ok(docPropCo(g).has('fridge'));
});

test('C1: diễn viên bear=1 / ga=1 không bị đòi dựng như đạo cụ', () => {
  const r = lapKeHoach({
    kb: kb([{ kind: 'prop', name: 'bear2', desc: 'gấu nơ đỏ' }, { kind: 'prop', name: 'hero', desc: 'Gà' }, { kind: 'prop', name: 'ví', desc: '' }],
      [], { actors: { bear2: { bear: 1 }, hero: { ga: 1 }, bach: { beard: true } } }),
    manifest: [], envCo: new Set(), animCo: new Set(),
  });
  assert.deepEqual(r.prop.map((p) => p.ten), ['ví']);
});

test('C1: place khai đầu kịch bản không đòi dựng env cùng tên; env: <place> -> canhBao; env thật thiếu vẫn báo', () => {
  const r = lapKeHoach({
    kb: kb([{ kind: 'env', name: 'bakery', desc: 'tiệm bánh' }, { kind: 'env', name: 'bedroom', desc: 'phòng Gà' }],
      [{ id: 's1', at: 'balcony' }, { id: 's2', at: 'roof' }, { id: 's3', at: 'hangngam' }],
      { places: { bakery: { pos: [18, 0, -6] }, balcony: {}, roof: {} } }),
    manifest: [], envCo: new Set(['sea']), animCo: new Set(),
  });
  assert.deepEqual(r.env.map((e) => e.ten).sort(), ['bedroom', 'hangngam']);
  assert.ok(r.canhBao.some((x) => x.includes('bakery')), JSON.stringify(r.canhBao));
  assert.ok(!r.canhBao.some((x) => x.includes('balcony')), 'at: place không cần cảnh báo');
});

test('C1: "- prop: a, b, c" tách thành từng đạo cụ; env "Cần dựng" trùng địa điểm thị trấn (street) -> canhBao, không đòi env riêng', () => {
  const r = lapKeHoach({
    kb: kb([{ kind: 'prop', name: 'dây chuyền, đồng hồ,  ví', desc: '' }, { kind: 'env', name: 'street', desc: 'phố chính' }]),
    manifest: [], envCo: new Set(), animCo: new Set(), tuStoryboard: TOWN,
  });
  assert.deepEqual(r.prop.map((p) => p.ten), ['dây chuyền', 'đồng hồ', 'ví']);
  assert.deepEqual(r.env, []);
  assert.ok(r.canhBao.some((x) => x.includes('street')));
});

// ---------- vòng sửa 2: anim-them/bear, alias vat, khớp lỏng, co_san ----------
test('V2: docAnimCo đọc cả ANIM_THEM (anim-them.js) và BEAR_ANIMATIONS (bear.js)', () => {
  const g = tmp();
  fs.mkdirSync(path.join(g, 'engine'));
  fs.writeFileSync(path.join(g, 'engine', 'r15.js'), 'export const R15_ANIMATIONS = {\n  idle: () => 1,\n};\n');
  fs.writeFileSync(path.join(g, 'engine', 'anim-them.js'), 'export const ANIM_THEM = {\n  // c\n  sitUp: (t) => 1,\n  climb: (t) => 2,\n};\n');
  fs.writeFileSync(path.join(g, 'engine', 'bear.js'), 'export const BEAR_ANIMATIONS = {\n  idle: (t) => 1,\n  hug: (t) => 1,\n};\nBEAR_ANIMATIONS.cower = BEAR_ANIMATIONS.hug;\n');
  const a = docAnimCo(g);
  for (const k of ['idle', 'sitUp', 'climb', 'hug', 'cower']) assert.ok(a.has(k), k);
});

test('V2: đạo cụ khớp alias `vat`, khớp lỏng theo tiền tố từ (ghi canhBao), ưu tiên code trước manifest', () => {
  const propCo = new Set(['nhan_moi', 'ket_tien', 'bang_tin', 'thung_tiem_bach', 'ban_do']);
  const man = [ent('furniture/table', ['standing'])];
  const r = lapKeHoach({
    kb: kb([{ kind: 'prop', name: 'nhẫn', desc: '' }, { kind: 'prop', name: 'két tiền tiệm bánh', desc: '' }, { kind: 'prop', name: 'chồng thùng in tên tiệm', desc: '' },
      { kind: 'prop', name: 'bản đồ thị trấn', desc: '' }, { kind: 'prop', name: 'kèn', desc: '' }], [], { vat: { thung_tiem_bach: ['chồng thùng in tên tiệm'] } }),
    manifest: man, envCo: new Set(), animCo: new Set(), propCo,
  });
  assert.deepEqual(r.prop.map((p) => p.ten), ['kèn']);
  assert.ok(r.daCo.prop.filter((p) => p.nguon === 'code').length === 4);
  assert.ok(r.canhBao.some((x) => x.includes('"nhẫn"') && x.includes('nhan_moi')));
  assert.ok(r.canhBao.some((x) => x.includes('két tiền tiệm bánh') && x.includes('ket_tien')));
  assert.ok(!r.canhBao.some((x) => x.includes('chồng thùng')), 'alias là khớp chính xác, không cảnh báo');
});

test('V2: co_san bỏ mục khỏi thiếu và ghi canhBao', () => {
  const r = lapKeHoach({
    kb: kb([{ kind: 'prop', name: 'mu_ga', desc: '' }, { kind: 'prop', name: 'mũ lính gác', desc: '' }, { kind: 'prop', name: 'kèn', desc: '' }], [], { co_san: 'mu_ga, mũ lính gác' }),
    manifest: [], envCo: new Set(), animCo: new Set(),
  });
  assert.deepEqual(r.prop.map((p) => p.ten), ['kèn']);
  assert.equal(r.canhBao.filter((x) => x.includes('co_san')).length, 2);
});
