// Kiểm BẰNG SỐ các shot đặt máy theo khung (cam.khung, engine/dat-may.js): chủ thể ra đâu trên khung, chiếm bao nhiêu %, có vật chắn không.
//   node tools/khung-kiem.mjs <ep> [s014,s018 | all]      → bảng: mong muốn | đo được | vật chắn; thoát mã 1 nếu có shot lệch/bị chắn
// Ngưỡng: lệch vị trí > 3 điểm %, lệch cỡ > 15 %, có vật chắn giữa máy và điểm đặt, máy thấp hơn sàn (y < 0.2).
import { createServer } from 'http'; import { readFile } from 'fs/promises'; import { extname, join, resolve, relative } from 'path'; import { pathToFileURL } from 'url';
import { launchBrowser } from './browser.mjs';
const [ep, pick = 'all'] = process.argv.slice(2), root = process.cwd();
const { SHOTS } = await import(pathToFileURL(join(root, 'episodes', ep, 'shots.js')).href);
let t0 = 0; const rows = SHOTS.map((s) => { const r = { id: s.id, t: t0 + s.dur / 2, khung: s.cam?.khung }; t0 += s.dur; return r; }).filter((r) => r.khung && (pick === 'all' || pick.split(',').includes(r.id)));
const T = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json' };
const srv = createServer(async (q, r) => { try { const p = resolve(join(root, decodeURIComponent(q.url.split('?')[0]))); if (relative(root, p).startsWith('..')) throw 0; const b = await readFile(p); r.writeHead(200, { 'content-type': T[extname(p)] || 'application/octet-stream', 'cache-control': 'no-store' }); r.end(b); } catch { r.writeHead(404); r.end(); } }).listen(0);
await new Promise((r) => srv.once('listening', r));
const b = await launchBrowser(), page = await b.newPage({ viewport: { width: 540, height: 960 } });
page.on('pageerror', (e) => console.log('LỖI TRANG', e.message));
await page.goto(`http://localhost:${srv.address().port}/episodes/${ep}/index.html`);
await page.waitForFunction('window.__ready === true', { timeout: 180000 });
let bad = 0;
console.log('shot   nhắm        mong (x, y, %)     đo (x, y, %)       máyY   vật chắn');
for (const r of rows) {
  const m = await page.evaluate((t) => { globalThis.__khung = null; window.renderAt(t); const K = globalThis.__khung; return K ? K.kiem() : null; }, r.t);
  const k = r.khung, wx = (k.x ?? 50) + ((k.x2 ?? k.x ?? 50) - (k.x ?? 50)) / 2, wy = (k.y ?? 50) + ((k.y2 ?? k.y ?? 50) - (k.y ?? 50)) / 2, wp = k.pct + ((k.pct2 ?? k.pct) - k.pct) / 2;
  if (!m) { bad++; console.log(`${r.id}   ${String(k.nham).padEnd(10)}  KHÔNG GIẢI ĐƯỢC (không thấy chủ thể trong shot)`); continue; }
  const lech = Math.abs(m.x - wx) > 3 || Math.abs(m.y - wy) > 3 || Math.abs(m.pct - wp) > wp * 0.15, loi = lech || m.chan || m.mayY < 0.2; if (loi) bad++;
  console.log(`${r.id}   ${String(k.nham).padEnd(10)}  ${wx.toFixed(0).padStart(3)}, ${wy.toFixed(0).padStart(3)}, ${wp.toFixed(1).padStart(5)}    ${m.x.toFixed(0).padStart(3)}, ${m.y.toFixed(0).padStart(3)}, ${m.pct.toFixed(1).padStart(5)}    ${m.mayY.toFixed(1).padStart(5)}  ${m.chan ? '⚠ ' + m.chan + ' @' + m.chanCach : '—'}${lech ? '  ⚠ lệch' : ''}${m.mayY < 0.2 ? '  ⚠ máy dưới sàn' : ''}`);
}
console.log(`${rows.length} shot, ${bad} cần xem`);
await b.close(); srv.close(); process.exit(bad ? 1 : 0);
