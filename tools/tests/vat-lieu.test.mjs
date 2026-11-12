// Task 10: vật liệu KHAI BÁO (engine/materials.js, grunge.js, props.js, house.js, measure.js) + docs/vat-lieu.md.
// Phần 1 chạy thuần Node (three từ vendor/, không cần GL). Phần 2 mở ep001 trong trình duyệt thật (một lần cho cả nhóm).
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { extname, join, resolve, relative } from 'node:path';
import * as THREE from '../../vendor/three/three.module.js';
import { applyMaterials, classifyMaterial, khaiBao, khaiBaoMat, KHONG_GRUNGE, MAT_KINDS, MAT_DE_XUAT } from '../../engine/materials.js';
import { applyGrunge } from '../../engine/grunge.js';
import { sinhMarkdown } from '../vat-lieu-doc.mjs';
import { LUAT, nguong } from '../kiem/luat.mjs';
import { launchBrowser } from '../browser.mjs';

const root = resolve(import.meta.dirname, '..', '..');
const macDinh = JSON.parse(readFileSync(join(root, 'tools', 'kiem', 'mac-dinh.json'), 'utf8'));
const mesh = (name, mat) => { const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mat); m.name = name; return m; };
const std = (c = '#808080') => new THREE.MeshStandardMaterial({ color: c });

test('KHONG_GRUNGE khớp L9.camGrunge trong mac-dinh.json (một nguồn)', () => {
  assert.deepEqual([...KHONG_GRUNGE].sort(), [...macDinh.L9.camGrunge].sort());
  for (const k of KHONG_GRUNGE) assert.ok(MAT_KINDS[k], `kind không tồn tại: ${k}`);
});

test('applyGrunge bỏ qua mesh khai báo chrome (theo vật liệu hoặc theo mesh); mesh thường vẫn bị phủ', () => {
  const g = new THREE.Group();
  const a = mesh('a', khaiBaoMat(std(), 'chrome'));                       // khai báo ở vật liệu
  const b = mesh('b', std()); khaiBao(b, [[/^b$/, 'chrome']]);             // khai báo ở mesh
  const c = mesh('c', std());                                              // không khai báo
  const d = mesh('d', khaiBaoMat(std(), 'wood'));                          // khai báo nhưng được phủ
  g.add(a, b, c, d);
  const obc = a.material.onBeforeCompile;
  applyGrunge(THREE, g, 'build');
  assert.equal(a.material.userData.grunge, undefined);
  assert.equal(a.material.onBeforeCompile, obc, 'material chrome không được đổi');
  assert.equal(b.material.userData.grunge, undefined);
  assert.equal(c.material.userData.grunge, 'build');
  assert.equal(d.material.userData.grunge, 'build');
});

test('applyMaterials: khai báo -> matNguon khai-bao, đoán -> doan; khai báo thắng luật đoán', () => {
  const g = new THREE.Group(); g.name = 'x';
  const a = mesh('handle_top', khaiBaoMat(std(), 'plastic'));   // luật đoán sẽ ra chrome
  const b = mesh('magnet', std());                              // luật đoán: plastic
  const c = mesh('trangtri', std()); khaiBao(c, [[/./, 'chrome']]);
  g.add(a, b, c);
  assert.equal(classifyMaterial(a, a.material, 'x/handle_top'), 'plastic');
  applyMaterials(THREE, g);
  assert.equal(a.material.userData.matKind, 'plastic'); assert.equal(a.material.userData.matNguon, 'khai-bao');
  assert.equal(b.material.userData.matKind, 'plastic'); assert.equal(b.material.userData.matNguon, 'doan');
  assert.equal(c.material.userData.matKind, 'chrome'); assert.equal(c.userData.matNguon, 'khai-bao');
});

test('khaiBao trả danh sách mesh chưa khai báo', () => {
  const g = new THREE.Group(); g.add(mesh('p', std()), mesh('q', std()), mesh('r', std()));
  const con = khaiBao(g, [[/^p$/, 'wood'], [/^q$/, 'none']]);
  assert.deepEqual(con.map((o) => o.name), ['r']);
  assert.equal(g.children[1].userData.matKind, 'none');
});

test('không import vòng: grunge.js và mat-khai-bao.js không import materials.js', () => {
  for (const f of ['grunge.js', 'mat-khai-bao.js']) assert.ok(!/from\s+['"]\.\/materials\.js['"]/.test(readFileSync(join(root, 'engine', f), 'utf8')), f);
});

test('docs/vat-lieu.md có bảng đề xuất đổi loại từ MAT_DE_XUAT', () => {
  const md = readFileSync(join(root, 'docs', 'vat-lieu.md'), 'utf8');
  assert.match(md, /Đề xuất đổi loại/);
  assert.ok(MAT_DE_XUAT.length >= 5);
  for (const d of MAT_DE_XUAT) { assert.ok(md.includes(d.vat), d.vat); assert.ok(d.hienTai && d.deXuat); }
});

test('docs/vat-lieu.md đúng với MAT_KINDS (chạy node tools/vat-lieu-doc.mjs để sinh lại)', () => {
  const md = sinhMarkdown();
  assert.equal(readFileSync(join(root, 'docs', 'vat-lieu.md'), 'utf8'), md);
  for (const k of Object.keys(MAT_KINDS)) assert.ok(md.includes('`' + k + '`'), k);
  assert.match(md, /da-duyet/); assert.match(md, /chua-duyet/);
  for (const k of KHONG_GRUNGE) assert.match(md, new RegExp('`' + k + '` \\|[^\\n]*\\| không \\|'));
});

// ---- Phần 2: trình duyệt ----
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.css': 'text/css', '.svg': 'image/svg+xml' };
let srv, browser, page;
const T = { timeout: 180000 };
before(async () => {
  srv = createServer(async (req, res) => {
    try {
      const p = resolve(join(root, decodeURIComponent(req.url.split('?')[0])));
      if (relative(root, p).startsWith('..')) throw 0;
      const b = await readFile(p);
      res.writeHead(200, { 'content-type': TYPES[extname(p).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-store' });
      res.end(b);
    } catch { res.writeHead(404); res.end(); }
  }).listen(0);
  await new Promise((r) => srv.once('listening', r));
  browser = await launchBrowser();
  page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 0.25 });
  await page.goto(`http://localhost:${srv.address().port}/episodes/ep001/index.html`);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 170000 });
}, { timeout: 180000 });
after(async () => { await browser?.close(); srv?.close(); });

const measureAt = (t) => page.evaluate(async (t) => { await window.renderAt(t); return JSON.parse(JSON.stringify(window.__measure(t))); }, t);

test('ep001: mọi vật liệu của vật chính/nhà/thiếp trong khung đều khai-bao', T, async () => {
  const ts = await page.evaluate(() => window.__shots.list.map((s) => s.t0 + s.dur / 2));
  const doan = new Set(); let tong = 0, khung = 0;
  for (const t of ts.filter((_, i) => i % 3 === 0)) {
    const m = await measureAt(t); khung++;
    for (const v of m.vatLieu || []) { tong++; if (v.nguon !== 'khai-bao') doan.add(`${v.ten}:${v.kind}:${v.nguon}`); }
  }
  assert.ok(tong > 20, `quá ít vật liệu đo được (${tong}/${khung} khung)`);
  assert.deepEqual([...doan], []);
});

test('ep001: vật liệu khai báo kim loại không bị grunge', T, async () => {
  const ts = await page.evaluate(() => window.__shots.list.map((s) => s.t0 + s.dur / 2));
  const ng = nguong(join(root, 'episodes', 'ep001'));
  for (const t of ts.filter((_, i) => i % 4 === 0)) {
    const m = await measureAt(t);
    const r = LUAT.L9({ m: [m, m, m] }, ng);
    assert.equal(r.ok, true, JSON.stringify(r.val));
  }
});

test('mesh MeshStandardMaterial trơn gắn vai vat-chinh: nguon doan và L9 đỏ', T, async () => {
  const t = await page.evaluate(() => window.__shots.list[3].t0 + 0.1);
  const m = await page.evaluate(async (t) => {
    await window.renderAt(t);
    const sc = window.__stage.scene, cam = window.__stage.camera;
    const THREE = window.THREE;
    const g = new THREE.Group(); g.name = 'thu_vat_chinh'; g.userData.vai = 'vat-chinh';
    const mm = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), new THREE.MeshStandardMaterial({ color: '#888888' }));
    mm.name = 'hop_tron'; g.add(mm);
    const d = new THREE.Vector3(); cam.getWorldDirection(d); g.position.copy(cam.position).addScaledVector(d, 10);
    sc.add(g);
    const { applyMaterials } = await import('/engine/materials.js');
    applyMaterials(THREE, g);
    const r = JSON.parse(JSON.stringify(window.__measure(t)));
    sc.remove(g);
    return r;
  }, t);
  const v = (m.vatLieu || []).find((x) => x.ten === 'hop_tron');
  assert.ok(v, 'không thấy hop_tron trong vatLieu');
  assert.equal(v.nguon, 'doan');
  const r = LUAT.L9({ m: [m, m, m] }, nguong(join(root, 'tools', 'tests', 'khong-co-ep')));
  assert.equal(r.ok, false);
  assert.ok(r.val.loi.some((s) => s.startsWith('hop_tron:')));
});

// Loại HIỆU LỰC của luật cũ (trước Task 10) cho một mesh: tag tay cũ (props.js dòng 71 cũ: vỏ/tay nắm tủ lạnh = 'none') > classifyMaterial không khai báo
// (tag/matDecl bị bỏ) > bỏ qua vật liệu trong suốt không phải kính (applyMaterials không vá → 'none'). Danh sách ngoại lệ RỖNG.
test('MÁY: khai báo của mọi mesh đạo cụ chính (tủ lạnh, hộp thư, hải đăng, tàu, thiếp, nhà) == luật đoán cũ, ngoại lệ rỗng', T, async () => {
  const diff = await page.evaluate(async () => {
    const THREE = window.THREE;
    const { classifyMaterial } = await import('/engine/materials.js');
    const { propKit } = await import('/engine/props.js');
    const { createHouse } = await import('/engine/house.js');
    const cu = (o, m, path) => {
      if (/^(fridge_body|fridge_split|handle_)/.test(o.name) && ('/' + path + '/').includes('/fridge/')) return 'none';   // tag tay cũ (props.js cũ dòng 71)
      const k = classifyMaterial({ userData: {} }, { name: m.name, userData: {} }, path);
      if (!k) return 'none';
      return (m.transparent && k !== 'glass') ? 'none' : k;
    };
    const K = propKit(THREE), out = [];
    const walk = (o, path, label) => {
      const p = o.name ? (path ? path + '/' + o.name.toLowerCase() : o.name.toLowerCase()) : path;
      if (o.isMesh) {
        const m = Array.isArray(o.material) ? o.material[0] : o.material;
        const decl = o.userData.matKind || m.userData.matDecl, old = cu(o, m, p);
        if (!decl) out.push(`${label}/${o.name}: chưa khai báo`);
        else if (decl !== old) out.push(`${label}/${o.name}: khai báo ${decl} != cũ ${old}`);
      }
      o.children.forEach((c) => walk(c, p, label));
    };
    const run = (label, root) => walk(root, '', label);
    run('fridge', K.fridge()); run('fridge-dense', K.fridge({ dense: true })); run('mailbox', K.mailbox()); run('lighthouse', K.lighthouse());
    run('ship', K.ship()); run('cardStack', K.cardStack());
    run('house', createHouse(THREE, { style: 'family', name: 'house' }).root); run('house-ill', createHouse(THREE, { style: 'illustration', name: 'house' }).root);
    // cảnh thật của ep001 (đường dẫn đầy đủ từ scene): mọi mesh có vai vat-chinh/nha/chan-nha/doc gần nhất
    const sc = window.__stage.scene, VAI = new Set(['vat-chinh', 'nha', 'chan-nha', 'doc']);
    const vaiGan = (o) => { for (let p = o; p; p = p.parent) if (p.userData && p.userData.vai) return p.userData.vai; return null; };
    const walkS = (o, path) => {
      const p = o.name ? (path ? path + '/' + o.name.toLowerCase() : o.name.toLowerCase()) : path;
      // tay nắm tủ bếp: engine/envs/kitchen.js đặt tay 'chrome' SAU khi K.fridge() dựng (có từ trước Task 10, không thuộc DECL) → bỏ khỏi so sánh cảnh
      if (o.isMesh && !o.isInstancedMesh && VAI.has(vaiGan(o)) && !/env_kitchen\/.*fridge\/handle_/.test(p)) {
        const m = Array.isArray(o.material) ? o.material[0] : o.material;
        if (m && m.isMeshStandardMaterial) {
          const decl = o.userData.matKind || m.userData.matDecl, old = cu(o, m, p);
          if (!decl) out.push(`scene/${p}: chưa khai báo`); else if (decl !== old) out.push(`scene/${p}: khai báo ${decl} != cũ ${old}`);
        }
      }
      o.children.forEach((c) => walkS(c, p));
    };
    walkS(sc, '');
    return [...new Set(out)];
  });
  assert.deepEqual(diff, []);
});

test('matDecl none ở mức vật liệu: nguon khai-bao (không bị báo chua-va)', T, async () => {
  const t = await page.evaluate(() => window.__shots.list[3].t0 + 0.1);
  const m = await page.evaluate(async (t) => {
    await window.renderAt(t);
    const sc = window.__stage.scene, cam = window.__stage.camera, THREE = window.THREE;
    const { khaiBaoMat, applyMaterials } = await import('/engine/materials.js');
    const g = new THREE.Group(); g.name = 'thu_none'; g.userData.vai = 'vat-chinh';
    const mm = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), khaiBaoMat(new THREE.MeshStandardMaterial({ color: '#88aaff' }), 'none'));
    mm.name = 'hop_none'; g.add(mm);
    const d = new THREE.Vector3(); cam.getWorldDirection(d); g.position.copy(cam.position).addScaledVector(d, 10);
    sc.add(g); applyMaterials(THREE, g);
    const r = JSON.parse(JSON.stringify(window.__measure(t))); sc.remove(g); return r;
  }, t);
  const v = (m.vatLieu || []).find((x) => x.ten === 'hop_none');
  assert.ok(v); assert.equal(v.nguon, 'khai-bao'); assert.equal(v.kind, 'none');
});

test('hải đăng GLB của ep001 (vai vat-phu: L9 đo, L10 không đòi) khai-bao', T, async () => {
  const t = await page.evaluate(() => { const s = window.__shots.list.find((x) => x.id === 's107'); return s.t0 + s.dur / 2; });
  const m = await measureAt(t);
  const lh = (m.vatLieu || []).filter((v) => /lighthouse|door-mesh|lifebuoy/.test(v.ten));
  assert.ok(lh.length >= 1, 'không thấy hải đăng trong vatLieu');
  for (const v of lh) { assert.equal(v.nguon, 'khai-bao'); assert.equal(v.kind, 'metalpaint'); assert.equal(v.grunge, false); }
});

test('mesh có vai nhưng vật liệu trong suốt chưa vá: nguon chua-va và L9 đỏ', T, async () => {
  const t = await page.evaluate(() => window.__shots.list[3].t0 + 0.1);
  const m = await page.evaluate(async (t) => {
    await window.renderAt(t);
    const sc = window.__stage.scene, cam = window.__stage.camera, THREE = window.THREE;
    const g = new THREE.Group(); g.name = 'thu_trong_suot'; g.userData.vai = 'vat-chinh';
    const mm = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), new THREE.MeshStandardMaterial({ color: '#88aaff', transparent: true, opacity: 0.5 }));
    mm.name = 'hop_trong_suot'; g.add(mm);
    const d = new THREE.Vector3(); cam.getWorldDirection(d); g.position.copy(cam.position).addScaledVector(d, 10);
    sc.add(g);
    const { applyMaterials } = await import('/engine/materials.js');
    applyMaterials(THREE, g);
    const r = JSON.parse(JSON.stringify(window.__measure(t)));
    sc.remove(g);
    return r;
  }, t);
  const v = (m.vatLieu || []).find((x) => x.ten === 'hop_trong_suot');
  assert.ok(v, 'mesh trong suốt bị bỏ qua im lặng');
  assert.equal(v.nguon, 'chua-va');
  const r = LUAT.L9({ m: [m, m, m] }, nguong(join(root, 'tools', 'tests', 'khong-co-ep')));
  assert.equal(r.ok, false);
  assert.ok(r.val.loi.some((s) => s.startsWith('hop_trong_suot:')));
});
