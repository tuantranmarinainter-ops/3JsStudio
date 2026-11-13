// Chụp trang engine/r6-lab.html (bảng mẫu nhân vật thân R6).  node tools/r6-mau.mjs <thư mục ra> "<tên>=<query>" ...
//   vd: node tools/r6-mau.mjs output/ep003/mau-r6 "truoc-sau=view=fb" "di=view=34&anim=walk&t=0.3"
import { createServer } from 'http';
import { readFile, mkdir } from 'fs/promises';
import { extname, join, resolve, relative } from 'path';
import { launchBrowser } from './browser.mjs';
const [outDir, ...jobs] = process.argv.slice(2);
const root = process.cwd();
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp' };
const srv = createServer(async (req, res) => {
  try { const p = resolve(join(root, decodeURIComponent(req.url.split('?')[0]))); if (relative(root, p).startsWith('..')) throw 0;
    const buf = await readFile(p); res.writeHead(200, { 'content-type': TYPES[extname(p)] || 'application/octet-stream', 'cache-control': 'no-store' }); res.end(buf); } catch { res.writeHead(404); res.end(); }
}).listen(0);
await new Promise((r) => srv.once('listening', r));
await mkdir(outDir, { recursive: true });
const browser = await launchBrowser();
let bad = 0;
for (const j of jobs) {
  const i = j.indexOf('='), name = j.slice(0, i), query = j.slice(i + 1);
  const page = await browser.newPage({ viewport: { width: 3200, height: 1200 } }); const errs = [];
  page.on('pageerror', (e) => errs.push(String(e.stack).split(String.fromCharCode(10)).slice(0, 4).join(' @ '))); page.on('console', (m) => { if (m.type() === 'error' && !/404/.test(m.text())) errs.push(m.text()); });
  await page.goto(`http://localhost:${srv.address().port}/engine/r6-lab.html?${query}`);
  try { await page.waitForFunction('window.__ready === true', { timeout: 60000 }); } catch { errs.push('không __ready'); }
  if (errs.length) { bad++; console.log(`✗ ${name}: ${errs.slice(0, 4).join(' | ')}`); }
  else { await page.locator('#c').screenshot({ path: join(outDir, name + '.png') }); console.log(`✓ ${join(outDir, name + '.png')}`); }
  await page.close();
}
await browser.close(); srv.close(); process.exit(bad ? 1 : 0);
