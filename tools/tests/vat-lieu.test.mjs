// Task 10: vật liệu KHAI BÁO (engine/materials.js, grunge.js, props.js, house.js, measure.js) + docs/vat-lieu.md.
// Phần 1 chạy thuần Node (three từ vendor/, không cần GL). Phần 2 mở ep001 trong trình duyệt thật (một lần cho cả nhóm).
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { extname, join, resolve, relative } from 'node:path';
import * as THREE from '../../vendor/three/three.module.js';
import { applyMaterials, classifyMaterial, khaiBao, khaiBaoMat, KHONG_GRUNGE, MAT_KINDS } from '../../engine/materials.js';
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
