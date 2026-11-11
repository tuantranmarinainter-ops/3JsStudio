// Kiểm thời điểm hiệu ứng âm thanh so với khung hình trong MỘT lệnh.
//   node tools/sfx/cue-check.mjs ep001 [--range 60:70] [--shots s054,s056] [--name splash] [--steps]
//                                [--around 0.3] [--step 0.1] [--out output/cue-check/<dấu thời gian>]
// Mỗi cue = 1 hàng: nhãn (t, tên, shot, lý do) + các khung từ t-around … t+around, khung gần t nhất viền đỏ.
// Mỗi bảng ghép ~8 cue → <out>/cues_01.jpg …, kèm <out>/report.md.
import { createServer } from 'http';
import { readFile, writeFile, mkdir, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import { extname, join, resolve, relative } from 'path';
import { launchBrowser } from '../browser.mjs';

const args = process.argv.slice(2);
const opt = {}; const pos = [];
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a.startsWith('--')) { const k = a.slice(2); if (k === 'steps') opt[k] = true; else opt[k] = args[++i]; } else pos.push(a);
}
const ep = pos[0];
if (!ep) {
  console.error('Dùng: node tools/sfx/cue-check.mjs <tập, vd ep001> [--range a:b] [--shots s054,s056] [--name chuỗi] [--steps] [--around 0.3] [--step 0.1] [--out thư mục]');
  process.exit(1);
}
const root = process.cwd();
const epDir = join(root, 'episodes', ep);
if (!existsSync(join(epDir, 'index.html'))) { console.error('Không thấy episodes/' + ep + '/index.html'); process.exit(1); }
const around = +(opt.around ?? 0.3), step = +(opt.step ?? 0.1);
if (!(step > 0) || !(around >= 0)) { console.error('--around/--step không hợp lệ'); process.exit(1); }
const PER_SHEET = 8;

// ---- nạp và lọc cue ----
let cues = [];
if (opt.steps) {
  const st = JSON.parse(await readFile(join(epDir, 'sfx', 'steps.json'), 'utf8'));
  cues = st.map((s) => ({ t: s.t, name: `bước ${s.house} ${s.leg}`, shot: s.shot, why: `onScreen=${s.onScreen} dist=${s.dist}` }));
} else {
  const files = (await readdir(join(epDir, 'sfx'))).filter((f) => /^cues_.*\.json$/.test(f)).sort();
  for (const f of files) for (const c of JSON.parse(await readFile(join(epDir, 'sfx', f), 'utf8'))) cues.push({ ...c, file: f });
}
if (opt.range) { const [a, b] = opt.range.split(':').map(Number); cues = cues.filter((c) => c.t >= a && c.t <= b); }
if (opt.shots) { const set = new Set(opt.shots.split(',')); cues = cues.filter((c) => set.has(c.shot)); }
if (opt.name) { const n = opt.name.toLowerCase(); cues = cues.filter((c) => String(c.name).toLowerCase().includes(n)); }
cues.sort((a, b) => a.t - b.t);
if (!cues.length) { console.error('Không có cue nào khớp bộ lọc.'); process.exit(1); }
console.log(`Chọn ${cues.length} cue, ${Math.ceil(cues.length / PER_SHEET)} bảng.`);

// ---- máy chủ tĩnh ----
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.ttf': 'font/ttf', '.otf': 'font/otf', '.woff': 'font/woff', '.woff2': 'font/woff2', '.css': 'text/css', '.svg': 'image/svg+xml', '.wasm': 'application/wasm' };
const srv = createServer(async (req, res) => {
  try {
    const p = resolve(join(root, decodeURIComponent(req.url.split('?')[0])));
    if (relative(root, p).startsWith('..')) throw 0;
    const b = await readFile(p);
    res.writeHead(200, { 'content-type': TYPES[extname(p).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(b);
  } catch { res.writeHead(404); res.end(); }
}).listen(0);
await new Promise((r) => srv.once('listening', r));
const url = `http://localhost:${srv.address().port}/episodes/${ep}/index.html?peek=1`;

// ---- trình duyệt (một cái, dùng lại một trang; mở lại 1 lần nếu đóng) ----
let browser, page, sheetPage;
async function boot() {
  try { if (browser) await browser.close(); } catch {}
  browser = await launchBrowser();
  page = await browser.newPage({ viewport: { width: 540, height: 960 }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.log('  pageerror:', e.message));
  await page.goto(url);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 300000 });
  sheetPage = await browser.newPage({ viewport: { width: 400, height: 400 } });
  await sheetPage.setContent('<body></body>');
}
await boot();
const total = await page.evaluate(() => (window.__shots && window.__shots.total) || 1e9);

async function frame(t) {
  const tt = Math.min(Math.max(0, t), total - 1 / 60);
  for (let attempt = 0; ; attempt++) {
    try {
      await page.evaluate(async (t) => { const r = window.renderAt(t); if (r && r.then) await r; }, tt);
      const sel = (await page.locator('#root').count()) ? '#root' : 'canvas';
      return (await page.locator(sel).first().screenshot({ type: 'jpeg', quality: 85 })).toString('base64');
    } catch (e) {
      if (attempt >= 1) throw e;
      console.log('  trang/trình duyệt đóng, mở lại…');
      await boot();
    }
  }
}

// ---- chụp từng cue ----
const offs = [];
for (let o = -around; o <= around + 1e-9; o += step) offs.push(+o.toFixed(4));
const centerIdx = offs.reduce((bi, o, i) => (Math.abs(o) < Math.abs(offs[bi]) ? i : bi), 0);
const rows = [];
for (let i = 0; i < cues.length; i++) {
  const c = cues[i];
  const imgs = [];
  for (const o of offs) imgs.push(await frame(c.t + o));
  rows.push({ c, imgs });
  process.stdout.write(`\r  đã chụp ${i + 1}/${cues.length} cue   `);
}
process.stdout.write('\n');

// ---- ghép bảng ----
const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
const outDir = resolve(opt.out || join('output', 'cue-check', stamp));
await mkdir(outDir, { recursive: true });
const tw = 160, th = 284, labW = 330;
const sheets = [];
for (let s = 0; s * PER_SHEET < rows.length; s++) {
  const part = rows.slice(s * PER_SHEET, (s + 1) * PER_SHEET);
  const b64 = await sheetPage.evaluate(async ({ part, offs, centerIdx, tw, th, labW, base }) => {
    const cv = document.createElement('canvas');
    cv.width = labW + offs.length * (tw + 4) + 4; cv.height = part.length * (th + 4) + 4;
    const g = cv.getContext('2d'); g.fillStyle = '#111'; g.fillRect(0, 0, cv.width, cv.height);
    const wrap = (txt, maxW) => {   // ngắt dòng theo từ (có chữ tiếng Việt)
      const out = []; let line = '';
      for (const w of String(txt).split(/\s+/)) {
        const tryL = line ? line + ' ' + w : w;
        if (g.measureText(tryL).width > maxW && line) { out.push(line); line = w; } else line = tryL;
      }
      if (line) out.push(line); return out;
    };
    for (let r = 0; r < part.length; r++) {
      const y = r * (th + 4) + 4, { c, imgs } = part[r];
      g.fillStyle = '#fff'; g.font = 'bold 22px sans-serif'; g.textBaseline = 'top';
      g.fillText(`#${base + r + 1}  t=${c.t.toFixed(2)}s`, 8, y + 4);
      g.fillStyle = '#ffd24a'; g.font = 'bold 18px sans-serif';
      let ly = y + 34;
      for (const l of wrap(c.name, labW - 16).slice(0, 3)) { g.fillText(l, 8, ly); ly += 22; }
      g.fillStyle = '#9fd'; g.font = '16px sans-serif';
      g.fillText(`shot ${c.shot || '-'}` + (c.vol != null ? `  vol ${c.vol}` : '') + (c.dur ? `  dur ${c.dur}` : ''), 8, ly); ly += 22;
      g.fillStyle = '#ccc';
      for (const l of wrap(c.why || '', labW - 16).slice(0, 7)) { g.fillText(l, 8, ly); ly += 20; }
      for (let k = 0; k < imgs.length; k++) {
        const im = new Image(); im.src = 'data:image/jpeg;base64,' + imgs[k]; await im.decode();
        const x = labW + k * (tw + 4);
        g.drawImage(im, x, y, tw, th);
        const o = offs[k];
        const txt = (o >= 0 ? '+' : '') + o.toFixed(2);
        g.font = 'bold 15px sans-serif'; g.fillStyle = 'rgba(0,0,0,0.75)'; g.fillRect(x, y, 52, 20);
        g.fillStyle = k === centerIdx ? '#ff6' : '#fff'; g.fillText(txt, x + 4, y + 2);
        if (k === centerIdx) { g.strokeStyle = '#f22'; g.lineWidth = 4; g.strokeRect(x + 2, y + 2, tw - 4, th - 4); }
      }
    }
    return cv.toDataURL('image/jpeg', 0.85).split(',')[1];
  }, { part: part.map((r) => ({ c: r.c, imgs: r.imgs })), offs, centerIdx, tw, th, labW, base: s * PER_SHEET });
  const file = join(outDir, `cues_${String(s + 1).padStart(2, '0')}.jpg`);
  await writeFile(file, Buffer.from(b64, 'base64'));
  sheets.push(file);
}

// ---- báo cáo ----
let md = `# Kiểm cue ${ep}${opt.steps ? ' (bước chân nhà)' : ''}\n\nKhung từ t-${around.toFixed(2)} đến t+${around.toFixed(2)} mỗi ${step}s; khung viền đỏ = đúng thời điểm cue.\n\n| # | bảng | hàng | t (s) | tên | shot | lý do |\n|---|---|---|---|---|---|---|\n`;
rows.forEach((r, i) => {
  const c = r.c;
  md += `| ${i + 1} | cues_${String(Math.floor(i / PER_SHEET) + 1).padStart(2, '0')}.jpg | ${(i % PER_SHEET) + 1} | ${c.t.toFixed(2)} | ${String(c.name).replace(/\|/g, '/')} | ${c.shot || '-'} | ${String(c.why || '').replace(/\|/g, '/')} |\n`;
});
await writeFile(join(outDir, 'report.md'), md);
console.log('Báo cáo:', join(outDir, 'report.md'));
for (const f of sheets) console.log('Bảng ghép:', f);
await browser.close(); srv.close();
process.exit(0);
