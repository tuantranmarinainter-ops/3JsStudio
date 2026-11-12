// Kiểm engine/measure.js trên tập ep001 trong trình duyệt thật (một lần mở trang cho cả 4 test).
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { extname, join, resolve, relative } from 'node:path';
import { launchBrowser } from '../browser.mjs';

const root = resolve(import.meta.dirname, '..', '..');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.css': 'text/css', '.svg': 'image/svg+xml' };
let srv, browser, page;

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
const T = { timeout: 180000 };

test('measure tất định', T, async () => {
  const a = await measureAt(41), b0 = await measureAt(10), c = await measureAt(41);
  assert.ok(b0.t === 10);
  assert.deepEqual(a, c);
});

test('mask khôi phục', T, async () => {
  const t = 41;
  await page.evaluate((t) => window.renderAt(t), t);
  const shot = () => page.locator('canvas').first().screenshot();
  const truoc = await shot();
  await page.evaluate(async (t) => { await window.__mask(t); }, t);
  const dangMask = await shot();
  await page.evaluate(async (t) => { window.__mask(null); await window.renderAt(t); }, t);
  const sau = await shot();
  assert.ok(truoc.equals(sau), 'ảnh sau khôi phục khác ảnh trước');
  assert.ok(!truoc.equals(dangMask), 'mask không đổi ảnh');
});

test('có hero', T, async () => {
  // giữa shot đầu tiên có hero và hero lọt khung > 50%
  const ids = await page.evaluate(() => window.__shots.list.filter((s) => s.type === 'closeup' || s.cast?.hero).map((s) => s.t0 + s.dur / 2));
  let thay = null;
  for (const t of ids) {
    const m = await measureAt(t);
    const h = m.vat.find((v) => v.vai === 'hero');
    if (h && h.trongKhung > 0.5) { thay = h; break; }
  }
  assert.ok(thay, 'không shot nào có hero trongKhung > 0.5');
  assert.ok(Array.isArray(thay.bbox) && thay.bbox.length === 4 && thay.che >= 0 && thay.che <= 1);
  assert.ok(thay.mat && thay.mat.che >= 0);
});

test('nhà đủ chân', T, async () => {
  const ts = await page.evaluate(() => window.__shots.list.filter((s) => s.house?.to).map((s) => s.t0 + s.dur / 2));
  assert.ok(ts.length > 0, 'không có shot nhà đi');
  const m = await measureAt(ts[0]);
  const nha = m.vat.filter((v) => v.vai === 'nha'), chan = m.vat.filter((v) => v.vai === 'chan-nha');
  assert.equal(nha.length, 1);
  assert.equal(chan.length, 4);
  assert.equal(m.chan.length, 4);
  assert.ok(typeof nha[0].nghieng === 'number' && nha[0].chim >= 0);
});

// ---- Vòng sửa 1 ----
const shotHero = async () => {
  const ids = await page.evaluate(() => window.__shots.list.filter((s) => s.cast?.hero).map((s) => s.t0 + s.dur / 2));
  for (const t of ids) { const m = await measureAt(t); const h = m.vat.find((v) => v.vai === 'hero'); if (h && h.trongKhung > 0.5) return t; }
  throw new Error('không có shot hero');
};
const demMesh = () => {
  const sc = window.__stage.scene; let tong = 0, hien = 0;
  sc.traverse((o) => {
    if (!o.isMesh) return;
    let p = o, tay = false, hero = false; while (p) { if (p.userData?.vai === 'tay' || p.userData?.vai === 'chan-nguoi') tay = true; if (p.userData?.vai === 'hero') hero = true; p = p.parent; }
    if (!tay || !hero) return;   // chỉ tay/chân thuộc hero (người khác bị ẩn là đúng)
    let v = true; for (let q = o.parent; q; q = q.parent) if (!q.visible) v = false;
    if (v) { tong++; if (o.visible) hien++; }
  });
  return { tong, hien };
};

test('mask giữ mesh của tay/chân (vai lồng trong hero)', T, async () => {
  const t = await shotHero();
  await page.evaluate((t) => window.renderAt(t), t);
  const dang = await page.evaluate(async ([t, f]) => { await window.__mask(t); const r = (0, eval)('(' + f + ')')(); window.__mask(null); return r; }, [t, demMesh.toString()]);
  assert.ok(dang.tong > 0, 'không có mesh tay/chân');
  assert.equal(dang.hien, dang.tong);
});

test('mask khôi phục khi render ném lỗi', T, async () => {
  const t = await shotHero();
  await page.evaluate((t) => window.renderAt(t), t);
  const r = await page.evaluate(async (t) => {
    const sc = window.__stage.scene, rd = window.__stage.renderer;
    const dem = () => { let n = 0; sc.traverse((o) => { if (o.visible && (o.isMesh || o.isPoints)) n++; }); return n; };
    const truoc = dem(), orig = rd.render; let loi = false;
    // renderAt trong __mask gọi render qua post; chỉ ném ở lần vẽ mask (khi đã có overrideMaterial)
    rd.render = function (...a) { if (sc.overrideMaterial && sc.background?.isColor && sc.background.getHex() === 0xffffff) throw new Error('boom'); return orig.apply(this, a); };
    try { await window.__mask(t); } catch { loi = true; }
    rd.render = orig;
    return { loi, truoc, sau: dem(), over: sc.overrideMaterial == null };
  }, t);
  assert.ok(r.loi); assert.equal(r.sau, r.truoc); assert.ok(r.over);
});

test('chan có y, tay/chân có chu, hero có trong', T, async () => {
  const ts = await page.evaluate(() => window.__shots.list.filter((s) => s.house?.to).map((s) => s.t0 + s.dur / 2));
  const m = await measureAt(ts[0]);
  assert.equal(m.chan.length, 4);
  for (const c of m.chan) { assert.equal(typeof c.y, 'number'); assert.equal(c.chamDat, c.y <= 0.05); }
  const t = await shotHero();
  const h = await measureAt(t);
  const hero = h.vat.find((v) => v.vai === 'hero');
  assert.ok('trong' in hero && (hero.trong === null || typeof hero.trong === 'string'));
  const tay = h.vat.filter((v) => v.vai === 'tay' || v.vai === 'chan-nguoi');
  assert.ok(tay.length > 0 && tay.every((v) => typeof v.chu === 'string'));
  assert.ok(tay.some((v) => v.chu === hero.ten));
});

test('vật ngoài tầm nhìn: bbox null, trongKhung 0', T, async () => {
  const ts = await page.evaluate(() => window.__shots.list.filter((s) => s.house?.to).map((s) => s.t0 + s.dur / 2));
  const m = await page.evaluate(async (t) => {
    await window.renderAt(t);
    const sc = window.__stage.scene, cam = window.__stage.camera;
    let nha = null; sc.traverse((o) => { if (!nha && o.userData?.vai === 'nha' && o.visible) nha = o; });
    const fwd = cam.getWorldDirection(new window.THREE.Vector3()), p0 = nha.position.clone();
    nha.position.addScaledVector(fwd, -1e5);   // ra sau lưng camera
    const r = JSON.parse(JSON.stringify(window.__measure(t)));
    nha.position.copy(p0); await window.renderAt(t);
    return r;
  }, ts[0]);
  const v = m.vat.find((x) => x.vai === 'nha');
  assert.equal(v.bbox, null); assert.equal(v.trongKhung, 0); assert.equal(v.che, 0);
  assert.ok(!m.vat.some((x) => Array.isArray(x.bbox) && x.bbox.every((n) => n === 0)));
});

test('measure.js tiêm được: không import, new Function dùng được', () => {
  const src = readFileSync(join(root, 'engine', 'measure.js'), 'utf8');
  assert.ok(!/^\s*import\b/m.test(src) && !/import\.meta/.test(src));
  const fn = new Function(src.replace(/\bexport\s+function\b/, 'function') + '; return installMeasure')();
  assert.equal(typeof fn, 'function');
});

// ---- Task 8: __maskAnh + soTheHat ----
const demToi = (r) => { let n = 0; for (let i = 0; i < r.data.length; i += 4) if (r.data[i] < 128) n++; return n / (r.w * r.h); };
const maskAnh = (t) => page.evaluate(async (t) => { const r = await window.__maskAnh(t); return { w: r.w, h: r.h, data: r.data }; }, t);

test('__maskAnh: ổn định, khôi phục, tỉ lệ đen khớp', T, async () => {
  const t = await shotHero();
  await page.evaluate((t) => window.renderAt(t), t);
  const shot = () => page.locator('canvas').first().screenshot();
  const trangThai = () => page.evaluate(() => {
    const { renderer: r, scene: sc } = window.__stage; let an = 0;
    sc.traverse((o) => { if (!o.visible) an++; });
    const cc = r.getClearColor(new sc.background.constructor()).getHex?.();
    return { rt: r.getRenderTarget() === null, auto: r.autoClear, sh: r.shadowMap.autoUpdate, ca: r.getClearAlpha(), cc: typeof cc === 'number' ? cc : null,
      over: sc.overrideMaterial === null, fog: sc.fog ? sc.fog.constructor.name : null, bg: sc.background ? (sc.background.isColor ? sc.background.getHex() : 'tex') : null, an };
  });
  const tt0 = await trangThai();
  const truoc = await shot();
  const a = await maskAnh(t);
  const sau = await shot();
  assert.ok(truoc.equals(sau), 'canvas bị đổi sau __maskAnh');
  assert.deepEqual(await trangThai(), tt0, 'trạng thái renderer/scene không được khôi phục sau __maskAnh');
  assert.equal(tt0.rt, true); assert.equal(tt0.over, true);
  assert.equal(a.data.length, 135 * 240 * 4);
  const b = await maskAnh(t);
  assert.deepEqual(a.data, b.data);
  await page.evaluate(() => window.renderAt(10)); await page.evaluate((t) => window.renderAt(t), t);
  const c = await maskAnh(t);
  assert.deepEqual(a.data, c.data);
  const tl = demToi(a);
  assert.ok(tl > 0.005 && tl < 0.9, 'tỉ lệ đen ' + tl);
  const noMask = await page.evaluate(() => { const sc = window.__stage.scene; let n = 0; sc.traverse((o) => { if (o.visible && o.isMesh) n++; }); return n; });
  await page.evaluate((t) => window.renderAt(t), t);
  const demSau = await page.evaluate(() => { const sc = window.__stage.scene; let n = 0; sc.traverse((o) => { if (o.visible && o.isMesh) n++; }); return n; });
  assert.equal(demSau, noMask);
});

test('__maskAnh s010: hai lần đo cách nhau renderAt khác -> tỉ lệ đen ±0.01', T, async () => {
  const t = await page.evaluate(() => { const s = window.__shots.list.find((x) => x.id === 's010'); return (s.t0 + s.t1) / 2; });
  const a = demToi(await maskAnh(t));
  await page.evaluate(() => window.renderAt(100)); await page.evaluate((t) => window.renderAt(t), t);
  const b = demToi(await maskAnh(t));
  assert.ok(Math.abs(a - b) <= 0.01, `${a} vs ${b}`);
  assert.ok(a < 0.9);
});

test('measure có soTheHat số nguyên', T, async () => {
  const m = await measureAt(41);
  assert.ok(Number.isInteger(m.soTheHat) && m.soTheHat >= 0);
});
