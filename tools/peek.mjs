// Chụp nhanh trang lab/composition bằng Playwright (không qua HyperFrames).
//   node tools/peek.mjs "<đường dẫn từ gốc repo>?query" t1,t2,... out.png [cols]
// Ghép các khung thành 1 ảnh lưới (mỗi ô 270×480).
import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('playwright');
import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { extname, join } from 'path';
const [,, url, times = '0', out = 'peek.png', cols = '6'] = process.argv;
const root = process.cwd();
const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.mp3': 'audio/mpeg' };
const srv = createServer(async (req, res) => {
  try { const p = join(root, decodeURIComponent(req.url.split('?')[0])); const b = await readFile(p);
    res.writeHead(200, { 'content-type': types[extname(p)] || 'application/octet-stream' }); res.end(b);
  } catch { res.writeHead(404); res.end(); }
}).listen(0);
const port = srv.address().port;
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 540, height: 960 } });
page.on('console', (m) => { if (m.type() === 'error') console.log('console:', m.text()); });
page.on('pageerror', (e) => console.log('pageerror:', e.message));
await page.goto(`http://localhost:${port}/${url}`);
await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
const ts = times.split(',').map(Number), shots = [];
for (const t of ts) { await page.evaluate((t) => window.renderAt(t), t); const sel = (await page.locator('#root').count()) ? '#root' : 'canvas'; shots.push(await page.locator(sel).first().screenshot()); }
// ghép lưới bằng canvas trong trang
const c = Math.min(+cols, ts.length), r = Math.ceil(ts.length / c);
const grid = await page.evaluate(async ({ imgs, c, r }) => {
  const cv = document.createElement('canvas'); cv.width = c * 270; cv.height = r * 480; const g = cv.getContext('2d');
  for (let i = 0; i < imgs.length; i++) { const im = new Image(); im.src = 'data:image/png;base64,' + imgs[i]; await im.decode();
    g.drawImage(im, (i % c) * 270, Math.floor(i / c) * 480, 270, 480); }
  return cv.toDataURL('image/png').split(',')[1];
}, { imgs: shots.map((b) => b.toString('base64')), c, r });
await (await import('fs/promises')).writeFile(out, Buffer.from(grid, 'base64'));
await browser.close(); srv.close();
console.log('ok', out);
