// Đo 11 luật kiểm khung hình bằng SỐ trên một trang tập phim; ghi luat.json + thư mục ảnh duyệt có nhãn.
//   node tools/kiem-luat.mjs <trang> [--ep ep001] [--shots s001,s002|all] [--out output/<ep>/kiem]
//        [--duyet output/<ep>/duyet] [--jobs 4] [--cho 120] [--khong-anh]
//   Mỗi shot đo 3 khung: đầu (start+1/30), giữa, cuối (end-1/30). Mã thoát: 0 không lỗi, 1 có lỗi, 2 môi trường.
//   Trang thiếu __measure nhưng có __stage + THREE: tiêm engine/measure.js. Vẫn không có -> m = null (luật skip).
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { launchBrowser } from './browser.mjs';
import { kiemShot, nguong as docNguong, LUAT } from './kiem/luat.mjs';
import { docAnh, ganNhan, luoiAnh } from './kiem/nhan.mjs';
import { loaiEnv } from './kiem/env-loai.mjs';

const FPS = 30;
const TEN_LUAT = {
  L1: 'nha-du-chan-trong-khung', L2: 'vat-doc-o-giua', L3: 'hero-trong-khung', L4: 'camera-dong', L5: 'nha-nghieng-chim',
  L6: 'hat-bui-tuyet-mua', L7: 'dem-khong-toi-den', L8: 'khung-khong-trong', L9: 'vat-lieu-grunge', L10: 'bong-dang', L11: 'thoi-luong-toi-thieu',
};

// ---- tham số ----
const FLAGS = new Set(['khong-anh']);
const opt = {}; const pos = [];
{
  const a = process.argv.slice(2);
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith('--')) { const k = a[i].slice(2); if (FLAGS.has(k)) opt[k] = true; else opt[k] = a[++i]; } else pos.push(a[i]);
  }
}
const root = process.cwd();
const loiMoi = (msg) => { console.error(msg); process.exit(2); };
if (!pos[0]) loiMoi('Dùng: node tools/kiem-luat.mjs <trang> [--ep ep001] [--shots s001,s002|all] [--out dir] [--duyet dir] [--jobs 4] [--cho 120] [--khong-anh]');
const pageArg = pos[0];
const suyEp = () => {
  const rel = path.relative(root, path.resolve(pageArg.split('?')[0])).replace(/\\/g, '/');
  let m = rel.match(/^episodes\/([^/]+)\//); if (m) return m[1];
  m = rel.match(/^dist\/(ep\d+)/i); return m ? m[1].toLowerCase() : null;
};
const ep = opt.ep || suyEp();
const outDir = path.resolve(opt.out || path.join('output', ep || 'khong-ep', 'kiem'));
const duyetDir = path.resolve(opt.duyet || path.join('output', ep || 'khong-ep', 'duyet'));
const jobs = Math.max(1, parseInt(opt.jobs || '4', 10) || 4);
const cho = Math.max(1, Number(opt.cho || 120)) * 1000;
const coAnh = !opt['khong-anh'];

// ---- phục vụ trang (như look.mjs: repo qua http, dist/ngoài repo qua file://) ----
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.glb': 'model/gltf-binary', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.ttf': 'font/ttf', '.otf': 'font/otf', '.woff': 'font/woff', '.woff2': 'font/woff2', '.css': 'text/css', '.svg': 'image/svg+xml', '.srt': 'text/plain; charset=utf-8', '.mp4': 'video/mp4', '.wasm': 'application/wasm' };
let srv, port;
async function ensureServer() {
  if (srv) return;
  srv = createServer(async (req, res) => {
    try {
      const p = path.resolve(path.join(root, decodeURIComponent(req.url.split('?')[0])));
      if (path.relative(root, p).startsWith('..')) throw 0;
      const b = await readFile(p);
      res.writeHead(200, { 'content-type': TYPES[path.extname(p).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-store' });
      res.end(b);
    } catch { res.writeHead(404, { 'cache-control': 'no-store' }); res.end(); }
  }).listen(0);
  await new Promise((r) => srv.once('listening', r));
  port = srv.address().port;
}
async function toUrl(p) {
  if (/^(https?|file):\/\//i.test(p)) return p;
  let q = '';
  const qi = p.indexOf('?'); if (qi >= 0) { q = p.slice(qi); p = p.slice(0, qi); }
  const abs = path.resolve(p);
  if (!fs.existsSync(abs)) loiMoi('Không thấy trang: ' + p);
  const rel = path.relative(root, abs).replace(/\\/g, '/');
  if (rel.startsWith('dist/') || rel.startsWith('..') || path.isAbsolute(rel)) return pathToFileURL(abs).href + q;
  await ensureServer();
  return `http://localhost:${port}/${rel}${q}`;
}

// ---- làm tròn 4 chữ số / bỏ undefined ----
const lam = (v) => {
  if (typeof v === 'number') return Number.isFinite(v) ? Math.round(v * 1e4) / 1e4 : null;
  if (Array.isArray(v)) return v.map(lam);
  if (v && typeof v === 'object') { const o = {}; for (const k of Object.keys(v)) if (v[k] !== undefined) o[k] = lam(v[k]); return o; }
  return v;
};

// ---- mở một tab đã sẵn sàng ----
const loiConsole = [];
let browser;
async function moTab(url) {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 0.5 });
  page.on('console', (m) => { if (m.type() === 'error') loiConsole.push(m.text().slice(0, 300)); });
  page.on('pageerror', (e) => loiConsole.push('pageerror: ' + e.message));
  await page.goto(url);
  try {
    await page.waitForFunction(() => window.__ready === true, null, { timeout: cho });
  } catch {
    console.error(`Quá hạn ${cho / 1000} s chờ window.__ready (trang không sẵn sàng).`);
    if (loiConsole.length) console.error('Lỗi console của trang:\n  ' + [...new Set(loiConsole)].slice(0, 15).join('\n  '));
    throw Object.assign(new Error('__ready timeout'), { moi: true });
  }
  if (!(await page.evaluate(() => !!(window.__shots && window.renderAt)))) {
    throw Object.assign(new Error('Trang thiếu window.renderAt / window.__shots'), { moi: true });
  }
  // tiêm measure.js cho bản gộp cũ
  const co = await page.evaluate(() => ({ m: typeof window.__measure === 'function', stage: !!window.__stage, three: !!window.THREE }));
  let coMeasure = co.m;
  if (!co.m && co.stage && co.three) {
    try {
      const src = fs.readFileSync(path.join(root, 'engine', 'measure.js'), 'utf8').replace(/\bexport\s+function\s+installMeasure/, 'function installMeasure');
      await page.addScriptTag({ content: src + '\n;window.__installMeasure = installMeasure;' });
      coMeasure = await page.evaluate(() => { try { window.__installMeasure({ THREE: window.THREE, stage: window.__stage, shots: window.__shots }); return typeof window.__measure === 'function'; } catch (e) { return false; } });
    } catch { coMeasure = false; }
  }
  const C = await browser.newPage({ viewport: { width: 400, height: 400 } });
  await C.setContent('<body></body>');
  return { page, C, coMeasure };
}

// ---- đo một shot ----
async function chup(page) {
  const sel = (await page.locator('#root').count()) ? '#root' : 'canvas';
  return page.locator(sel).first().screenshot({ type: 'png' });
}
const seek = (page, t) => page.evaluate(async (t) => { const r = window.renderAt(t); if (r && r.then) await r; }, t);
const khungSo = (t) => Math.round(t * FPS);

async function doShot({ page, C, coMeasure }, s, ng) {
  const ts = [s.t0 + 1 / FPS, (s.t0 + s.t1) / 2, s.t1 - 1 / FPS];
  const pngs = [], anh = [], m = [];
  for (const t of ts) {
    await seek(page, t);
    m.push(coMeasure ? await page.evaluate((t) => { try { return JSON.parse(JSON.stringify(window.__measure(t))); } catch { return null; } }, t) : null);
    const png = await chup(page);
    pngs.push(png);
    anh.push(await docAnh(C, png, 135, 240));
  }
  let mask = null;
  if (await page.evaluate(() => typeof window.__mask === 'function')) {
    try {
      await page.evaluate(async (t) => { await window.__mask(t); }, ts[1]);
      mask = await docAnh(C, await chup(page), 135, 240);
    } catch { mask = null; }
    finally { await page.evaluate(() => { try { window.__mask(null); } catch { /* bỏ */ } }); }
  }
  const e = loaiEnv(s);
  const ctx = {
    shot: { id: s.id, type: s.type, dur: s.dur, static: s.static, frame: s.frame, read: s.read },
    m: m.some(Boolean) ? m : null, anh, mask, env: { dem: e.dem, tuyet: e.tuyet, mua: e.mua },
  };
  const luat = kiemShot(ctx, ng);
  if (e.ghiChu) luat.L7 = { ...luat.L7, ghiChu: [luat.L7.ghiChu, e.ghiChu].filter(Boolean).join('; ') };
  const loi = Object.keys(luat).filter((k) => luat[k].ok === false && !luat[k].skip);
  const khung = [khungSo(ts[0]), khungSo(ts[1]), khungSo(ts[2])];
  const jpgs = [];
  if (coAnh) {
    const dong2 = loi.length ? loi.map((k) => `${k} ${TEN_LUAT[k]}`).join(' · ') : '✅';
    for (let i = 0; i < 3; i++) jpgs.push(await ganNhan(C, pngs[i], `${s.id} f${khung[i]} t=${ts[i].toFixed(2)}s`, dong2));
  }
  // tên file: khung đầu đặt theo frame bắt đầu của shot (s001 -> f0000), giữa/cuối theo frame đo
  return { id: s.id, rec: { type: s.type ?? null, dur: s.dur, khung, luat, loi }, jpgs, tenKhung: [khungSo(s.t0), khung[1], khung[2]] };
}

// ---- chạy ----
const t0 = Date.now();
try {
  browser = await launchBrowser();
  const url = await toUrl(pageArg);
  const dau = await moTab(url);
  const tatCa = await dau.page.evaluate(() => window.__shots.list.map((s) => ({ id: s.id, t0: s.t0, t1: s.t1, dur: s.dur ?? (s.t1 - s.t0), type: s.type, static: s.static, frame: s.frame, read: s.read, env: s.env, light: s.light, fx: s.fx ? JSON.parse(JSON.stringify(s.fx)) : undefined })));
  let chon = tatCa;
  if (opt.shots && opt.shots !== 'all') {
    chon = opt.shots.split(',').map((x) => x.trim()).filter(Boolean).map((id) => tatCa.find((s) => s.id === id) || loiMoi('Không có shot ' + id));
  }
  const ng = docNguong(path.join(root, 'episodes', ep || '_khong-co-ep'));

  if (coAnh) {
    fs.mkdirSync(path.join(duyetDir, '01_shots'), { recursive: true });
    fs.rmSync(path.join(duyetDir, '02_loi'), { recursive: true, force: true });
    fs.mkdirSync(path.join(duyetDir, '02_loi'), { recursive: true });
  }
  fs.mkdirSync(outDir, { recursive: true });

  // chia dải liên tiếp cho các tab (mỗi tab tự nạp trang)
  const n = Math.min(jobs, chon.length) || 1;
  const dai = Array.from({ length: n }, (_, i) => chon.slice(Math.floor(i * chon.length / n), Math.floor((i + 1) * chon.length / n)));
  const tabs = [dau];
  if (n > 1) tabs.push(...await Promise.all(dai.slice(1).map(() => moTab(url))));
  const kq = await Promise.all(dai.map(async (ds, i) => {
    const out = [];
    for (const s of ds) out.push(await doShot(tabs[i], s, ng));
    return out;
  }));
  const dsKq = kq.flat();
  const coMeasure = tabs.some((t) => t.coMeasure);

  // ghi ảnh duyệt
  if (coAnh) {
    const giuaLoi = [];
    for (const r of dsKq) {
      const ten = (i) => `${r.id}_f${String(r.tenKhung[i]).padStart(4, '0')}.jpg`;
      for (let i = 0; i < 3; i++) {
        fs.writeFileSync(path.join(duyetDir, '01_shots', ten(i)), r.jpgs[i]);
        if (r.rec.loi.length) fs.writeFileSync(path.join(duyetDir, '02_loi', ten(i)), r.jpgs[i]);
      }
      if (r.rec.loi.length) giuaLoi.push(r.jpgs[1]);
    }
    const lu = await luoiAnh(tabs[0].C, giuaLoi.slice(0, 12), { cot: 4, rong: 800 });
    if (lu) fs.writeFileSync(path.join(duyetDir, 'luoi-loi.jpg'), lu);
    else fs.rmSync(path.join(duyetDir, 'luoi-loi.jpg'), { force: true });
  }

  // tổng hợp
  const shots = {}; for (const r of dsKq) shots[r.id] = r.rec;
  const theoLuat = {};
  for (const ma of Object.keys(LUAT)) {
    let loi = 0, skip = 0;
    for (const r of dsKq) { const x = r.rec.luat[ma]; if (x.skip) skip++; else if (x.ok === false) loi++; }
    theoLuat[ma] = { loi, tyLe: dsKq.length ? loi / dsKq.length : 0, skip };
  }
  const shotLoi = dsKq.filter((r) => r.rec.loi.length).length;
  const lyDo = [];
  if (shotLoi > ng.goi.shotLoiMax) lyDo.push(`shot-loi ${shotLoi} > ${ng.goi.shotLoiMax}`);
  for (const ma of Object.keys(theoLuat)) if (theoLuat[ma].tyLe > ng.goi.tyLeLuatMax) lyDo.push(`${ma} loi ${(theoLuat[ma].tyLe * 100).toFixed(1)}% > ${ng.goi.tyLeLuatMax * 100}%`);
  const luatJson = {
    ep: ep || null, trang: pageArg, luc: new Date().toISOString(), coMeasure,
    shots, tong: { soShot: dsKq.length, shotLoi, theoLuat }, goi: { can: lyDo.length > 0, lyDo },
  };
  const fJson = path.join(outDir, 'luat.json');
  fs.writeFileSync(fJson, JSON.stringify(lam(luatJson), null, 1) + '\n');

  // nhật ký (chỉ khi biết tập)
  const giay = Math.round((Date.now() - t0) / 1000);
  if (ep) {
    try {
      const { ghiNhatKy } = await import('./kiem/trang-thai.mjs');
      ghiNhatKy(ep, { buoc: 'kiem-luat', hanh_dong: 'do', so_shot: dsKq.length, shot_loi: shotLoi, co_measure: coMeasure, goi_can: lyDo.length > 0, giay });
    } catch { /* lỗi ghi nhật ký: bỏ qua */ }
  }

  // stdout
  const pct = (x) => (x * 100).toFixed(1).padStart(5) + '%';
  console.log(`kiem-luat ${ep || '-'}  ${dsKq.length} shot  loi ${shotLoi}  measure ${coMeasure ? 'co' : 'khong'}  ${giay}s`);
  for (const ma of Object.keys(theoLuat)) {
    const x = theoLuat[ma];
    console.log(`  ${ma.padEnd(3)} loi ${String(x.loi).padStart(3)}  skip ${String(x.skip).padStart(3)}  ${pct(x.tyLe)}  ${TEN_LUAT[ma]}`);
  }
  const dsLoi = dsKq.filter((r) => r.rec.loi.length);
  if (dsLoi.length) {
    console.log(`Shot loi (${Math.min(10, dsLoi.length)}/${dsLoi.length}):`);
    for (const r of dsLoi.slice(0, 10)) console.log(`  ${r.id}  ${r.rec.loi.join(',')}`);
  }
  if (lyDo.length) console.log('Can goi: ' + lyDo.join('; '));
  console.log('luat.json: ' + fJson);
  if (coAnh) console.log('anh duyet: ' + duyetDir);
  await browser.close().catch(() => {});
  srv?.close();
  process.exit(dsLoi.length ? 1 : 0);
} catch (e) {
  if (!e.moi) console.error('Lỗi môi trường: ' + ((e && e.stack) || e));
  else if (!/__ready/.test(e.message)) console.error(e.message);
  try { await browser?.close(); } catch { /* bỏ */ }
  process.exit(2);
}
