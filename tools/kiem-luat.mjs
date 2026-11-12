// Đo 11 luật kiểm khung hình bằng SỐ trên một trang tập phim; ghi luat.json + thư mục ảnh duyệt có nhãn.
//   node tools/kiem-luat.mjs <trang> [--ep ep001] [--shots s001,s002|all] [--out output/<ep>/kiem]
//        [--duyet output/<ep>/duyet] [--jobs 4] [--cho 120] [--khong-anh]
//   Mỗi shot đo 3 khung: đầu (start+1/30), giữa, cuối (end-1/30). Mã thoát: 0 không lỗi, 1 có lỗi, 2 môi trường.
//   KHÔNG chạy 2 tiến trình cùng --out/--duyet (luat.json ghi nguyên tử nhưng ảnh duyệt thì không có khoá).
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
  return `http://localhost:${port}/${rel.split('/').map(encodeURIComponent).join('/')}${q}`;
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
const lam4 = (x) => Math.round(x * 1e4) / 1e4;
const thuTu = (a, b) => a.index - b.index;

const dumpCtx = {};
// shot ném lỗi: mọi luật = lỗi, skip 'loi'
function ketQuaLoi(msg) {
  const luat = {};
  for (const ma of Object.keys(LUAT)) luat[ma] = { ok: false, val: null, nguong: null, skip: 'loi', ghiChu: 'loi: ' + msg };
  return luat;
}

// ẩn mọi lớp chữ phủ ngoài canvas (phụ đề #cap…) trong lúc chụp ảnh đo; ảnh duyệt cũng không phụ đề
const AN_CHU_CSS = '#root > :not(canvas):not(audio) { visibility: hidden !important; }';
async function doShot(tab, s, ng) {
  const { page, C, coMeasure } = tab;
  const dur = lam4(Math.round((s.t1 - s.t0) * FPS) / FPS);
  try {
    await page.evaluate((css) => { const st = document.createElement('style'); st.id = 'kiem-an-chu'; st.textContent = css; document.head.appendChild(st); }, AN_CHU_CSS);
    try {
      return await doShotTrong(tab, s, ng, dur);
    } finally {
      await page.evaluate(() => { const st = document.getElementById('kiem-an-chu'); if (st) st.remove(); }).catch(() => {});
    }
  } catch (err) {
    try { await page.evaluate(() => { try { if (window.__mask) window.__mask(null); } catch { /* bỏ */ } }); } catch { /* bỏ */ }
    const msg = String((err && err.message) || err).split(/\r?\n/)[0].slice(0, 200);
    const t = [s.t0 + 1 / FPS, (s.t0 + s.t1) / 2, s.t1 - 1 / FPS];
    return { id: s.id, index: s.index, loiMsg: msg, jpgs: [], rec: { type: s.type ?? null, dur, khung: t.map(khungSo), luat: ketQuaLoi(msg), loi: ['loi'], coMeasureShot: false, coVaiShot: false } };
  }
}

async function doShotTrong(tab, s, ng, dur) {
  const { page, C, coMeasure } = tab;
  {
    const ts = [s.t0 + 1 / FPS, (s.t0 + s.t1) / 2, s.t1 - 1 / FPS];
    const pngs = [], anh = [], m = [];
    for (const t of ts) {
      await seek(page, t);
      m.push(coMeasure ? await page.evaluate((t) => { try { return JSON.parse(JSON.stringify(window.__measure(t))); } catch { return null; } }, t) : null);
      const png = await chup(page);
      pngs.push(png);
      anh.push(await docAnh(C, png, 135, 240));
    }
    // coVai của shot = __measure khung giữa có vật gắn vai đang hiện
    const coVaiShot = !!(m[1] && Array.isArray(m[1].vat) && m[1].vat.length > 0);
    let mask = null;
    if (coVaiShot && await page.evaluate(() => typeof window.__maskAnh === 'function')) {
      try {
        const r = await page.evaluate(async (t) => { const x = await window.__maskAnh(t); return { w: x.w, h: x.h, data: x.data }; }, ts[1]);
        mask = { w: r.w, h: r.h, data: Uint8ClampedArray.from(r.data) };
      } catch { mask = null; }
    }
    const e = loaiEnv(s);
    const ctx = {
      shot: { id: s.id, type: s.type, dur, static: s.static, frame: s.frame, read: s.read },
      m: m.some(Boolean) ? m : null, anh, mask, env: { dem: e.dem, tuyet: e.tuyet, mua: e.mua },
    };
    if (opt['luu-ctx']) {   // đổ dữ liệu vào để phát lại luật offline khi hiệu chỉnh ngưỡng (ảnh -> xám 8 bit, base64)
      const xam = (im) => im ? Buffer.from(Uint8Array.from({ length: im.w * im.h }, (_, i) => Math.round(0.2126 * im.data[i * 4] + 0.7152 * im.data[i * 4 + 1] + 0.0722 * im.data[i * 4 + 2]))).toString('base64') : null;
      dumpCtx[s.id] = { shot: ctx.shot, m: ctx.m, env: ctx.env, anh: anh.map(xam), mask: xam(mask), w: 135, h: 240 };
    }
    const luat = kiemShot(ctx, ng);    if (e.ghiChu) luat.L7 = { ...luat.L7, ghiChu: [luat.L7.ghiChu, e.ghiChu].filter(Boolean).join('; ') };
    const loi = Object.keys(luat).filter((k) => luat[k].ok === false && !luat[k].skip);
    const khung = ts.map(khungSo);
    const jpgs = [];
    if (coAnh) {
      const dong2 = loi.length ? loi.map((k) => `${k} ${TEN_LUAT[k]}`).join(' · ') : '✅';
      for (let i = 0; i < 3; i++) jpgs.push(await ganNhan(C, pngs[i], `${s.id} f${khung[i]} t=${ts[i].toFixed(2)}s`, dong2));
    }
    return { id: s.id, index: s.index, rec: { type: s.type ?? null, dur, khung, luat, loi, coMeasureShot: !!ctx.m, coVaiShot }, jpgs };
  }
}

const keHoach = (s) => ({ dur: lam4(Math.round((s.t1 - s.t0) * FPS) / FPS), khung: [s.t0 + 1 / FPS, (s.t0 + s.t1) / 2, s.t1 - 1 / FPS].map(khungSo) });
const khop = (rec, s) => { const k = keHoach(s); return rec && Array.isArray(rec.khung) && rec.khung.length === 3 && rec.khung.every((x, i) => x === k.khung[i]) && Math.abs(rec.dur - k.dur) < 1e-3; };
const VAI_PHU_THUOC = ['L1', 'L2', 'L3', 'L5', 'L10'];
const tenAnh = (id, f) => `${id}_f${String(f).padStart(4, '0')}.jpg`;
const xoaAnhShot = (dir, id) => {
  if (!fs.existsSync(dir)) return;
  for (const f of fs.readdirSync(dir)) if (f.startsWith(id + '_f') && f.endsWith('.jpg')) fs.rmSync(path.join(dir, f), { force: true });
};

// ---- chạy ----
const t0 = Date.now();
try {
  browser = await launchBrowser();
  const url = await toUrl(pageArg);
  const dau = await moTab(url);
  const tatCa = await dau.page.evaluate(() => window.__shots.list.map((s, i) => ({ id: s.id, index: i, t0: s.t0, t1: s.t1, type: s.type, static: s.static, frame: s.frame, read: s.read, env: s.env, light: s.light, night: s.night, fx: s.fx ? JSON.parse(JSON.stringify(s.fx)) : undefined })));
  const toanBo = !opt.shots || opt.shots === 'all';
  let chon = tatCa;
  if (!toanBo) {
    chon = opt.shots.split(',').map((x) => x.trim()).filter(Boolean).map((id) => tatCa.find((s) => s.id === id) || loiMoi('Không có shot ' + id));
  }
  const ng = docNguong(path.join(root, 'episodes', ep || '_khong-co-ep'));
  const fJson = path.join(outDir, 'luat.json');

  // bản cũ (chạy một phần): chỉ dùng khi cùng ep + cùng trang
  let cu = null;
  if (!toanBo && fs.existsSync(fJson)) {
    try {
      const j = JSON.parse(fs.readFileSync(fJson, 'utf8'));
      if ((j.ep ?? null) === (ep || null) && j.trang === pageArg && j.shots && typeof j.shots === 'object') cu = j;
      else console.error('Cảnh báo: luat.json cũ khác ep/trang, bỏ bản cũ.');
    } catch { console.error('Cảnh báo: luat.json cũ hỏng, bỏ bản cũ.'); }
  }
  const idsTrang = new Set(tatCa.map((x) => x.id));
  const daXoa = [];
  if (cu) {
    for (const id of Object.keys(cu.shots)) if (!idsTrang.has(id)) { delete cu.shots[id]; daXoa.push(id); }
    // bản ghi cũ lệch khung/dur so với trang hiện tại -> đo lại
    for (const sh of tatCa) {
      const rec = cu.shots[sh.id];
      if (rec && !khop(rec, sh)) {
        console.error('đo lại vì đổi: ' + sh.id + ' (khung/dur khác bản ghi cũ)');
        delete cu.shots[sh.id];
        if (!chon.some((x) => x.id === sh.id)) chon.push(sh);
      }
    }
  }
  chon = [...new Map(chon.map((x) => [x.id, x])).values()].sort(thuTu);

  if (coAnh) {
    fs.mkdirSync(path.join(duyetDir, '01_shots'), { recursive: true });
    for (const id of daXoa) { xoaAnhShot(path.join(duyetDir, '01_shots'), id); xoaAnhShot(path.join(duyetDir, '02_loi'), id); }
    if (toanBo) fs.rmSync(path.join(duyetDir, '02_loi'), { recursive: true, force: true });
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
  const dsKq = kq.flat().sort(thuTu);

  // gộp với bản cũ, sắp theo thứ tự phim
  const idsDo = new Set(dsKq.map((r) => r.id));
  const shots = {};
  for (const s of tatCa) {
    const moi = dsKq.find((r) => r.id === s.id);
    if (moi) shots[s.id] = moi.rec;
    else if (cu && cu.shots[s.id]) shots[s.id] = cu.shots[s.id];
  }
  const dsRec0 = Object.values(shots);
  const coMeasure = dsRec0.some((r) => r.coMeasureShot);
  const coVai = dsRec0.some((r) => r.coVaiShot);
  if (coMeasure && !coVai) {
    for (const rec of dsRec0) for (const ma of VAI_PHU_THUOC) if (rec.luat[ma] && rec.luat[ma].skip !== 'loi') rec.luat[ma] = { ok: true, val: null, nguong: null, skip: 'khong-co-vai' };
    for (const rec of dsRec0) rec.loi = rec.loi.filter((k) => !VAI_PHU_THUOC.includes(k));
  }
  const loiShot = [];
  if (cu && Array.isArray(cu.loiShot)) for (const x of cu.loiShot) if (!idsDo.has(x.id) && shots[x.id]) loiShot.push(x);
  for (const r of dsKq) if (r.loiMsg) loiShot.push({ id: r.id, loi: r.loiMsg });
  loiShot.sort((a, b) => tatCa.findIndex((s) => s.id === a.id) - tatCa.findIndex((s) => s.id === b.id));

  // ghi ảnh duyệt (chỉ đụng ảnh của shot vừa đo)
  if (coAnh) {
    for (const r of dsKq) {
      xoaAnhShot(path.join(duyetDir, '01_shots'), r.id);
      xoaAnhShot(path.join(duyetDir, '02_loi'), r.id);
      const da = new Set();
      for (let i = 0; i < r.jpgs.length; i++) {
        const f = r.rec.khung[i];
        if (da.has(f)) continue;
        da.add(f);
        fs.writeFileSync(path.join(duyetDir, '01_shots', tenAnh(r.id, f)), r.jpgs[i]);
        if (r.rec.loi.length) fs.writeFileSync(path.join(duyetDir, '02_loi', tenAnh(r.id, f)), r.jpgs[i]);
      }
    }
    const giuaLoi = [];
    for (const [id, rec] of Object.entries(shots)) {
      if (!rec.loi.length || giuaLoi.length >= 12) continue;
      const f = path.join(duyetDir, '01_shots', tenAnh(id, rec.khung[1]));
      if (fs.existsSync(f)) giuaLoi.push(fs.readFileSync(f));
    }
    const lu = await luoiAnh(tabs[0].C, giuaLoi, { cot: 4, rong: 800 });
    if (lu) fs.writeFileSync(path.join(duyetDir, 'luoi-loi.jpg'), lu);
    else fs.rmSync(path.join(duyetDir, 'luoi-loi.jpg'), { force: true });
  }

  // tổng hợp trên TOÀN BỘ shot
  const dsRec = Object.values(shots);
  const theoLuat = {};
  for (const ma of Object.keys(LUAT)) {
    let loi = 0, skip = 0;
    for (const rec of dsRec) { const x = rec.luat[ma]; if (!x) continue; if (x.skip) skip++; else if (x.ok === false) loi++; }
    theoLuat[ma] = { loi, tyLe: dsRec.length ? loi / dsRec.length : 0, skip };
  }
  const shotLoi = dsRec.filter((rec) => rec.loi.length).length;
  const lyDo = [];
  if (shotLoi > ng.goi.shotLoiMax) lyDo.push(`shot-loi ${shotLoi} > ${ng.goi.shotLoiMax}`);
  for (const ma of Object.keys(theoLuat)) if (theoLuat[ma].tyLe > ng.goi.tyLeLuatMax) lyDo.push(`${ma} loi ${(theoLuat[ma].tyLe * 100).toFixed(1)}% > ${ng.goi.tyLeLuatMax * 100}%`);
  const luatJson = {
    ep: ep || null, trang: pageArg, luc: new Date().toISOString(), coMeasure, coVai,
    shots, tong: { soShot: dsRec.length, shotLoi, theoLuat }, goi: { can: lyDo.length > 0, lyDo }, loiShot,
  };
  fs.writeFileSync(fJson + '.tmp', JSON.stringify(lam(luatJson), null, 1) + '\n');
  fs.renameSync(fJson + '.tmp', fJson);

  if (opt['luu-ctx']) fs.writeFileSync(path.resolve(opt['luu-ctx']), JSON.stringify(dumpCtx));
  // nhật ký (chỉ khi biết tập)
  const giay = Math.round((Date.now() - t0) / 1000);
  if (ep) {
    try {
      const { ghiNhatKy } = await import('./kiem/trang-thai.mjs');
      ghiNhatKy(ep, { buoc: 'kiem-luat', hanh_dong: 'do', so_shot: dsRec.length, shot_loi: shotLoi, co_measure: coMeasure, co_vai: coVai, goi_can: lyDo.length > 0, giay });
    } catch { /* lỗi ghi nhật ký: bỏ qua */ }
  }

  // stdout
  const pct = (x) => (x * 100).toFixed(1).padStart(5) + '%';
  console.log(`kiem-luat ${ep || '-'}  ${dsRec.length} shot  loi ${shotLoi}  measure ${coMeasure ? 'co' : 'khong'}  vai ${coVai ? 'co' : 'khong'}  ${giay}s`);
  for (const ma of Object.keys(theoLuat)) {
    const x = theoLuat[ma];
    console.log(`  ${ma.padEnd(3)} loi ${String(x.loi).padStart(3)}  skip ${String(x.skip).padStart(3)}  ${pct(x.tyLe)}  ${TEN_LUAT[ma]}`);
  }
  const dsLoi = Object.entries(shots).filter(([, rec]) => rec.loi.length);
  if (dsLoi.length) {
    console.log(`Shot loi (${Math.min(10, dsLoi.length)}/${dsLoi.length}):`);
    for (const [id, rec] of dsLoi.slice(0, 10)) console.log(`  ${id}  ${rec.loi.join(',')}`);
  }
  if (loiShot.length) console.log('Shot ném lỗi: ' + loiShot.map((x) => `${x.id} (${x.loi})`).join('; '));
  if (lyDo.length) console.log('Can goi: ' + lyDo.join('; '));
  console.log('luat.json: ' + fJson);
  if (coAnh) console.log('anh duyet: ' + duyetDir);
  await browser.close().catch(() => {});
  srv?.close();
  process.exit(dsLoi.length || loiShot.length ? 1 : 0);
} catch (e) {
  if (!e.moi) console.error('Lỗi môi trường: ' + ((e && e.stack) || e));
  else if (!/__ready/.test(e.message)) console.error(e.message);
  try { await browser?.close(); } catch { /* bỏ */ }
  process.exit(2);
}
