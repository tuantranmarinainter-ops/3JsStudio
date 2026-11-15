// Chụp trang engine/ga-lab.html theo danh sách cảnh (kiểm tra Gà v2).  node tools/ga-shoot.mjs <thư mục ra> <jobs.json>
//   jobs: [{ name, query:"view=front&anim=ref&ortho=1&flat=1", w, h, set:{...}, t }]  → <ra>/<name>.png
import { createServer } from 'http';
import { readFile, mkdir } from 'fs/promises';
import { extname, join, resolve, relative } from 'path';
import { readFileSync } from 'fs';
import { launchBrowser } from './browser.mjs';

const [outDir, jobsFile] = process.argv.slice(2);
const root = process.cwd();
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.glb': 'model/gltf-binary' };
const srv = createServer(async (req, res) => {
  try {
    const p = resolve(join(root, decodeURIComponent(req.url.split('?')[0])));
    if (relative(root, p).startsWith('..')) throw 0;
    const b = await readFile(p);
    res.writeHead(200, { 'content-type': TYPES[extname(p)] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(b);
  } catch { res.writeHead(404); res.end(); }
}).listen(0);
await new Promise((r) => srv.once('listening', r));
const port = srv.address().port;
await mkdir(outDir, { recursive: true });
const jobs = JSON.parse(readFileSync(jobsFile, 'utf8'));
const browser = await launchBrowser();
for (const j of jobs) {
  const page = await browser.newPage({ viewport: { width: j.w || 540, height: j.h || 960 }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.log('pageerror', j.name, e.message));
  page.on('console', (m) => { if (m.type() === 'error') console.log('console', j.name, m.text().slice(0, 200)); });
  await page.goto(`http://localhost:${port}/engine/ga-lab.html?static=1&ui=0&${j.query || ''}`);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
  if (j.set) await page.evaluate((s) => window.__set(s), j.set);
  if (j.t !== undefined) await page.evaluate((t) => window.renderAt(t), j.t);
  if (j.eval) console.log(j.name, JSON.stringify(await page.evaluate(j.eval)));
  if (!j.noshot) await page.screenshot({ path: join(outDir, j.name + '.png') });
  await page.close();
}
await browser.close();
srv.close();
console.log('xong', jobs.length, 'ảnh ->', outDir);
