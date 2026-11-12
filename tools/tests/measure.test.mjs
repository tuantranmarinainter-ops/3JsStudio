// Kiểm engine/measure.js trên tập ep001 trong trình duyệt thật (một lần mở trang cho cả 4 test).
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
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
