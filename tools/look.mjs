// Một lệnh cho mọi việc kiểm khung hình: chụp, bảng ghép có nhãn, so A/B (PSNR), kiểm tất định (--det).
//   node tools/look.mjs <trang> [chọn thời điểm] [tuỳ chọn]
//   <trang>: episodes/ep001/index.html (phục vụ qua http tại gốc repo) | dist/ep001.html (file://) | URL
//   chọn thời điểm (một trong):
//     --t 12.5,30,61.2          các thời điểm (giây)
//     --range 61:67:0.4         từ:đến:bước
//     --shots s054,s056         giữa các shot   |   --shots all  giữa mọi shot
//   --query "lang=en&subs=0"    thêm query vào URL
//   --opts '{"lang":"en"}'      gọi window.setOptions(...) trước khi chụp
//   --out <thư mục>             lưu từng khung PNG (mặc định output/look/<tên>)
//   --sheet <file.jpg>          bảng ghép (mặc định <out>/sheet.jpg); --cols 6; --tile 270 (rộng ô, cao = tỉ lệ 9:16)
//   --ab <trang2>               chụp cùng thời điểm ở trang thứ 2, ghép cặp A|B, in PSNR từng t + trung bình
//   --det                       kiểm tất định: chụp lại mỗi t sau khi tua tới t khác; báo sai khác lớn nhất + số điểm ảnh lệch > 16/255; thoát mã 1 nếu vùng lệch > 0,005% khung (lưu *_det-lai.png)
//   --full                      lưu PNG 1080×1920 (mặc định lưu 540×960)
import { createServer } from 'http';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { extname, join, resolve, basename, relative, isAbsolute } from 'path';
import { pathToFileURL } from 'url';
import { launchBrowser } from './browser.mjs';

const args = process.argv.slice(2);
const FLAGS = new Set(['det', 'full']);
const opt = {}; const pos = [];
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a.startsWith('--')) { const k = a.slice(2); if (FLAGS.has(k)) opt[k] = true; else opt[k] = args[++i]; } else pos.push(a);
}
const pageArg = pos[0];
if (!pageArg) {
  console.error('Dùng: node tools/look.mjs <trang> [--t a,b | --range a:b:bước | --shots s054,s056|all] [--query q] [--opts json] [--out dir] [--sheet f.jpg] [--cols 6] [--tile 270] [--ab trang2] [--det] [--full]');
  process.exit(1);
}
const root = process.cwd();
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.glb': 'model/gltf-binary', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.ttf': 'font/ttf', '.otf': 'font/otf', '.woff': 'font/woff', '.woff2': 'font/woff2', '.css': 'text/css', '.svg': 'image/svg+xml', '.srt': 'text/plain; charset=utf-8', '.mp4': 'video/mp4', '.wasm': 'application/wasm' };

// ---- máy chủ tĩnh ở gốc repo ----
let srv, port;
async function ensureServer() {
  if (srv) return;
  srv = createServer(async (req, res) => {
    try {
      const p = resolve(join(root, decodeURIComponent(req.url.split('?')[0])));
      if (relative(root, p).startsWith('..')) throw 0;
      const b = await readFile(p);
      res.writeHead(200, { 'content-type': TYPES[extname(p).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-store' });
      res.end(b);
    } catch { res.writeHead(404, { 'cache-control': 'no-store' }); res.end(); }
  }).listen(0);
  await new Promise((r) => srv.once('listening', r));
  port = srv.address().port;
}
const withQuery = (u, q) => (q ? u + (u.includes('?') ? '&' : '?') + q.replace(/^[?&]/, '') : u);
async function toUrl(p, query) {
  if (/^https?:\/\//i.test(p) || /^file:\/\//i.test(p)) return withQuery(p, query);
  // cho phép ghi tham số ngay trong đường dẫn: "episodes/ep001/index.html?fx=none" (mỗi trang A/B một tham số riêng)
  const qi = p.indexOf('?');
  if (qi >= 0) { query = [p.slice(qi + 1), query].filter(Boolean).join('&'); p = p.slice(0, qi); }
  const abs = resolve(p);
  if (!existsSync(abs)) throw new Error('Không thấy trang: ' + p);
  const rel = relative(root, abs).replace(/\\/g, '/');
  if (rel.startsWith('dist/') || rel.startsWith('..') || isAbsolute(rel)) return withQuery(pathToFileURL(abs).href, query);
  await ensureServer();
  return withQuery(`http://localhost:${port}/${rel}`, query);
}

// ---- mở trang ----
const browser = await launchBrowser();
const viewport = { width: 1080, height: 1920 };
async function openPage(p) {
  const url = await toUrl(p, opt.query);
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  page.on('console', (m) => { if (m.type() === 'error') console.log('  console:', m.text().slice(0, 200)); });
  page.on('pageerror', (e) => console.log('  pageerror:', e.message));
  await page.goto(url);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 300000 });
  if (opt.opts) {
    const o = JSON.parse(opt.opts);
    await page.evaluate(async (o) => { const r = window.setOptions(o); if (r && r.then) await r; }, o);
  }
  return page;
}
const A = await openPage(pageArg);
const B = opt.ab ? await openPage(opt.ab) : null;

// ---- chọn thời điểm ----
const shotsInfo = await A.evaluate(() => window.__shots ? { list: window.__shots.list.map((s) => ({ id: s.id, t0: s.t0, t1: s.t1 })), total: window.__shots.total } : null);
let times = [];
if (opt.t) times = opt.t.split(',').map(Number);
else if (opt.range) {
  const [a, b, st = '1'] = opt.range.split(':').map(Number);
  for (let t = a; t <= b + 1e-9; t += st) times.push(+t.toFixed(4));
} else if (opt.shots) {
  if (!shotsInfo) throw new Error('Trang không có window.__shots');
  const want = opt.shots === 'all' ? shotsInfo.list.map((s) => s.id) : opt.shots.split(',');
  for (const id of want) {
    const s = shotsInfo.list.find((x) => x.id === id);
    if (!s) throw new Error('Không có shot ' + id);
    times.push(+((s.t0 + s.t1) / 2).toFixed(3));
  }
} else times = [0];
if (!times.length || times.some((t) => !isFinite(t))) throw new Error('Thời điểm không hợp lệ');
const total = shotsInfo ? shotsInfo.total : 0;
const shotAt = (t) => {
  if (!shotsInfo) return '';
  const s = shotsInfo.list.find((x) => t >= x.t0 && t < x.t1) || shotsInfo.list[shotsInfo.list.length - 1];
  return s ? s.id : '';
};

// ---- chụp ----
async function shot(page, t) {
  await page.evaluate(async (t) => { const r = window.renderAt(t); if (r && r.then) await r; }, t);
  const sel = (await page.locator('#root').count()) ? '#root' : 'canvas';
  return page.locator(sel).first().screenshot({ type: 'png' });
}

// trang phụ để ghép ảnh / tính sai khác (không đụng trang tập)
const C = await browser.newPage({ viewport: { width: 400, height: 400 } });
await C.setContent('<body></body>');
async function compare(b1, b2) {
  return C.evaluate(async ({ x, y }) => {
    const load = async (s) => { const im = new Image(); im.src = 'data:image/png;base64,' + s; await im.decode(); return im; };
    const [i1, i2] = [await load(x), await load(y)];
    if (i1.width !== i2.width || i1.height !== i2.height) return { psnr: 0, max: 255, size: true };
    const d = (im) => { const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const g = c.getContext('2d'); g.drawImage(im, 0, 0); return g.getImageData(0, 0, im.width, im.height).data; };
    const p = d(i1), q = d(i2);
    let se = 0, mx = 0, n = 0, bad = 0;
    for (let i = 0; i < p.length; i += 4) {
      let pm = 0;
      for (let k = 0; k < 3; k++) { const e = Math.abs(p[i + k] - q[i + k]); se += e * e; if (e > mx) mx = e; if (e > pm) pm = e; n++; }
      if (pm > 16) bad++;   // điểm ảnh lệch thấy được
    }
    const mse = se / n;
    return { psnr: mse === 0 ? Infinity : 10 * Math.log10(255 * 255 / mse), max: mx, bad, px: p.length / 4 };
  }, { x: b1.toString('base64'), y: b2.toString('base64') });
}

const name = basename(pageArg).replace(/\.html?.*$/i, '').replace(/[^\w.-]/g, '_') || 'trang';
const outDir = resolve(opt.out || join('output', 'look', name));
await mkdir(outDir, { recursive: true });
const sheetPath = resolve(opt.sheet || join(outDir, 'sheet.jpg'));
await mkdir(join(sheetPath, '..'), { recursive: true });

async function save(buf, file) {
  if (opt.full) return writeFile(file, buf);
  const small = await C.evaluate(async (s) => {
    const im = new Image(); im.src = 'data:image/png;base64,' + s; await im.decode();
    const c = document.createElement('canvas'); c.width = 540; c.height = 960; const g = c.getContext('2d');
    g.imageSmoothingQuality = 'high'; g.drawImage(im, 0, 0, 540, 960);
    return c.toDataURL('image/png').split(',')[1];
  }, buf.toString('base64'));
  return writeFile(file, Buffer.from(small, 'base64'));
}

const rows = [], tilesA = [], tilesB = [];
let detFail = false;
for (const t of times) {
  const id = shotAt(t);
  const tag = `t${t.toFixed(2).padStart(7, '0')}${id ? '_' + id : ''}`;
  const row = { t, id };
  const bufA = await shot(A, t);
  row.file = join(outDir, B ? tag + '_A.png' : tag + '.png');
  await save(bufA, row.file);
  tilesA.push(bufA);
  if (B) {
    const bufB = await shot(B, t);
    await save(bufB, join(outDir, tag + '_B.png'));
    tilesB.push(bufB);
    row.psnr = (await compare(bufA, bufB)).psnr;
  }
  if (opt.det) {
    // tua xa phía sau (hoặc phía trước nếu đang ở nửa cuối), rồi lùi/nhích tới rồi mới về t
    const far = total ? (t < total / 2 ? Math.min(total - 0.05, t + total * 0.45) : Math.max(0, t - total * 0.45)) : t + 30;
    await shot(A, far);
    await shot(A, Math.max(0, t - 3.7));
    await shot(A, t + 2.3);
    const again = await shot(A, t);
    const c = await compare(bufA, again);
    row.diff = c.max; row.bad = c.bad;
    // lỗi tất định = có điểm ảnh lệch thấy được (> 16/255) quá 0,005% khung; 1–2 chấm hạt lấp lánh / nhiễu GPU thì bỏ qua
    if (c.bad > c.px * 0.00005) { detFail = true; await save(again, join(outDir, tag + '_det-lai.png')); }   // lưu khung chụp lại để so
  }
  rows.push(row);
  process.stdout.write(`\r  đã chụp ${rows.length}/${times.length}   `);
}
process.stdout.write('\n');

// ---- bảng ghép có nhãn ----
const tileW = +(opt.tile || 270), tileH = Math.round(tileW * 16 / 9);
const perRow = Math.max(1, +(opt.cols || 6));
const cellsPerRow = B ? Math.max(1, Math.floor(perRow / 2)) : perRow;
const cols = Math.min(cellsPerRow, times.length), nr = Math.ceil(times.length / cols);
const cellW = B ? tileW * 2 + 2 : tileW;
const sheet = await C.evaluate(async ({ imgsA, imgsB, labels, cols, nr, tileW, tileH, cellW }) => {
  const cv = document.createElement('canvas'); cv.width = cols * (cellW + 4); cv.height = nr * (tileH + 4);
  const g = cv.getContext('2d'); g.fillStyle = '#111'; g.fillRect(0, 0, cv.width, cv.height);
  const load = async (s) => { const im = new Image(); im.src = 'data:image/png;base64,' + s; await im.decode(); return im; };
  const fs = Math.max(11, Math.round(tileW / 16));
  g.font = `bold ${fs}px sans-serif`; g.textBaseline = 'middle';
  const label = (txt, x, y) => {
    const w = g.measureText(txt).width + 8, h = fs + 6;
    g.fillStyle = 'rgba(0,0,0,0.78)'; g.fillRect(x + 3, y + tileH - h - 3, w, h);
    g.fillStyle = '#fff'; g.fillText(txt, x + 7, y + tileH - h / 2 - 3);
  };
  for (let i = 0; i < imgsA.length; i++) {
    const x = (i % cols) * (cellW + 4) + 2, y = Math.floor(i / cols) * (tileH + 4) + 2;
    g.drawImage(await load(imgsA[i]), x, y, tileW, tileH); label((imgsB.length ? 'A ' : '') + labels[i], x, y);
    if (imgsB.length) { g.drawImage(await load(imgsB[i]), x + tileW + 2, y, tileW, tileH); label('B ' + labels[i], x + tileW + 2, y); }
  }
  return cv.toDataURL('image/jpeg', 0.88).split(',')[1];
}, {
  imgsA: tilesA.map((b) => b.toString('base64')), imgsB: tilesB.map((b) => b.toString('base64')),
  labels: rows.map((r, i) => `${r.id || '-'} t=${r.t.toFixed(2)}s` + (B ? ` ${Number.isFinite(r.psnr) ? r.psnr.toFixed(1) + 'dB' : '=='}` : '')),
  cols, nr, tileW, tileH, cellW,
});
await writeFile(sheetPath, Buffer.from(sheet, 'base64'));

// ---- tóm tắt ----
console.log('\n t(s)     shot   ' + (B ? 'PSNR(dB)  ' : '') + (opt.det ? 'maxdiff  lệch>16  ' : '') + 'file');
for (const r of rows) {
  console.log(` ${r.t.toFixed(2).padStart(7)}  ${(r.id || '-').padEnd(6)} ` +
    (B ? (Number.isFinite(r.psnr) ? r.psnr.toFixed(2) : 'inf').padStart(8) + '  ' : '') +
    (opt.det ? String(r.diff).padStart(7) + '  ' + String(r.bad).padStart(7) + '  ' : '') + relative(root, r.file));
}
if (B) {
  const fin = rows.filter((r) => Number.isFinite(r.psnr)).map((r) => r.psnr);
  console.log(`PSNR trung bình: ${fin.length ? (fin.reduce((a, b) => a + b, 0) / fin.length).toFixed(2) : 'inf'} dB (${rows.length - fin.length} khung giống hệt)`);
}
if (opt.det) console.log(detFail ? 'TẤT ĐỊNH: LỖI (có vùng lệch thấy được)' : 'TẤT ĐỊNH: OK (không có vùng lệch thấy được)');
console.log('Bảng ghép:', sheetPath);
await browser.close(); if (srv) srv.close();
process.exit(detFail ? 1 : 0);
