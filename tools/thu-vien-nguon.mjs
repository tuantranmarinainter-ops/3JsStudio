// Bộ chuyển nguồn cho ô tìm của thư viện asset: Sketchfab, Poly Pizza, Polyfork, Kenney (máy).
// Mỗi hàm trả mảng mẫu {id, ten, tacGia, tamGiac, gp, anh, link} — id đã có tiền tố nguồn (vd "sketchfab:abc").
// Khoá API đọc từ .env.local, chỉ gửi qua header; KHÔNG in ra / ghi lại / đưa vào URL.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { docEnv } from './roblox.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENV = docEnv();
const UA = 'Mozilla/5.0 (thu-vien-asset)';
export const NGUON = ['sketchfab', 'polypizza', 'polyfork', 'kenney'];

async function lay(url, headers = {}) {
  for (let lan = 0; lan < 3; lan++) {
    const r = await fetch(url, { headers: { 'User-Agent': UA, ...headers }, signal: AbortSignal.timeout(30000) });
    if (r.ok) return r.json();
    if (r.status === 429 || r.status >= 500) { await new Promise((ok) => setTimeout(ok, 2500 * (lan + 1))); continue; }
    throw new Error(`HTTP ${r.status} ${new URL(url).host}`);
  }
  throw new Error('hết lượt thử lại ' + new URL(url).host);
}

async function timSketchfab(q) {
  if (!ENV.SKETCHFAB_API_TOKEN) throw new Error('thiếu SKETCHFAB_API_TOKEN');
  const h = { Authorization: `Token ${ENV.SKETCHFAB_API_TOKEN}` }, out = [];
  for (const lic of ['cc0', 'by']) {
    const j = await lay(`https://api.sketchfab.com/v3/search?type=models&q=${encodeURIComponent(q)}&downloadable=true&license=${lic}&count=24&sort_by=-likeCount`, h);
    for (const m of j.results || []) {
      const im = m.thumbnails?.images || [];
      const a = im.find((i) => i.width === 256) || im.find((i) => i.width >= 200) || im[0];
      if (!a || out.some((o) => o.id === 'sketchfab:' + m.uid)) continue;
      out.push({ id: 'sketchfab:' + m.uid, ten: m.name, tacGia: m.user?.displayName || m.user?.username || '?', tamGiac: m.faceCount ?? null, gp: lic === 'cc0' ? 'CC0' : 'CC BY', anh: a.url, link: `https://sketchfab.com/3d-models/${m.uid}` });
    }
  }
  return out.slice(0, 30);
}

async function timPolyPizza(q) {
  if (!ENV.POLY_PIZZA_API_KEY) throw new Error('thiếu POLY_PIZZA_API_KEY');
  const j = await lay(`https://api.poly.pizza/v1.1/search/${encodeURIComponent(q)}?Limit=30`, { 'x-auth-token': ENV.POLY_PIZZA_API_KEY });
  return (j.results || []).map((m) => ({ id: 'polypizza:' + m.ID, ten: m.Title, tacGia: m.Creator?.Username || '?', tamGiac: m['Tri Count'] ?? null,
    gp: /cc0|public/i.test(m.Licence || '') ? 'CC0' : 'CC BY', anh: m.Thumbnail, link: `https://poly.pizza/m/${m.ID}` })).filter((x) => x.anh).slice(0, 30);
}

async function timPolyfork(q) {   // API công khai, không cần khoá để duyệt; mẫu thấp poly đều miễn phí
  const h = ENV.POLYFORK_API_KEY ? { Authorization: `Bearer ${ENV.POLYFORK_API_KEY}` } : {};
  const j = await lay(`https://polyfork.dev/api/assets?q=${encodeURIComponent(q)}&per_page=30`, h);
  return (j.assets || []).filter((a) => a.thumbnail).map((a) => ({ id: 'polyfork:' + a.id, ten: a.title, tacGia: 'Polyfork', tamGiac: a.triangles ?? null, gp: 'CC BY', anh: a.thumbnail, link: a.page })).slice(0, 30);
}

// ---------- Kenney: quét assets/kenney/**.glb, khớp theo từ trong tên file / tên bộ ----------
let KEN = null;
function quetKenney() {
  if (KEN) return KEN;
  KEN = [];
  const goc = path.join(ROOT, 'assets', 'kenney');
  const di = (d, kit) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) di(p, kit || e.name);
      else if (/\.glb$/i.test(e.name) && kit) KEN.push({ kit, ten: e.name.replace(/\.glb$/i, ''), rel: path.relative(ROOT, p).split(path.sep).join('/') });
    }
  };
  if (fs.existsSync(goc)) di(goc, '');
  return KEN;
}
const tach = (s) => s.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
const goc = (w) => w.replace(/(ies)$/, 'y').replace(/(es|s)$/, '');
export function kenneyAnhTen(m) { return 'kn-' + m.kit + '__' + m.ten + '.jpg'; }
function timKenney(q) {
  const ws = tach(q).map(goc).filter((w) => w.length > 1);
  if (!ws.length) return [];
  const ds = [];
  for (const m of quetKenney()) {
    const tk = tach(m.ten).map(goc), kt = tach(m.kit).map(goc);
    let d = 0, hit = 0;
    for (const w of ws) { if (tk.includes(w)) { d += 3; hit++; } else if (tk.some((t) => t.startsWith(w) || w.startsWith(t) && t.length > 3)) { d += 2; hit++; } else if (kt.includes(w)) d += 0.5; }
    if (hit) ds.push({ m, d: d - tk.length * 0.05 });
  }
  ds.sort((a, b) => b.d - a.d);
  return ds.slice(0, 30).map(({ m }) => ({ id: `kenney:${m.kit}/${m.ten}`, ten: m.ten, tacGia: 'Kenney · ' + m.kit, tamGiac: null, gp: 'CC0', anh: 'thu-vien-asset-anh/' + kenneyAnhTen(m),
    link: 'https://kenney.nl/assets', _rel: m.rel, _file: kenneyAnhTen(m) }));
}

/** Vẽ ảnh nhỏ (256 px) cho các model Kenney chưa có ảnh: một trang three.js trong Chrome headless, máy chủ tĩnh đọc gốc repo. */
let KHOA_VE = Promise.resolve();   // một lần vẽ tại một thời điểm (tránh mở nhiều Chrome cùng lúc)
export function veAnhKenney(mau, dirAnh) {
  const p = KHOA_VE.then(() => Promise.race([veAnhKenney1(mau, dirAnh), new Promise((_, no) => setTimeout(() => no(new Error('vẽ ảnh Kenney quá 90 s')), 90000))]));
  KHOA_VE = p.catch(() => {});
  return p;
}
async function veAnhKenney1(mau, dirAnh) {
  const can = mau.filter((m) => m._rel && !fs.existsSync(path.join(dirAnh, m._file)));
  if (!can.length) return 0;
  fs.mkdirSync(dirAnh, { recursive: true });
  const mime = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.glb': 'model/gltf-binary' };
  const sv = http.createServer((req, res) => {
    const p = path.resolve(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, ''));
    if (!p.startsWith(ROOT + path.sep) || !fs.existsSync(p) || !fs.statSync(p).isFile()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': mime[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res);
  });
  await new Promise((ok) => sv.listen(0, '127.0.0.1', ok));
  const { launchBrowser } = await import('./browser.mjs');
  const b = await launchBrowser(); let n = 0;
  try {
    const pg = await b.newPage();
    await pg.goto(`http://127.0.0.1:${sv.address().port}/tools/kenney-anh.html`);
    await pg.waitForFunction('window.__ready === true', null, { timeout: 30000 });
    for (const m of can) {
      const url = await pg.evaluate((r) => window.ve('/' + r), m._rel).catch(() => null);
      if (url) { fs.writeFileSync(path.join(dirAnh, m._file), Buffer.from(url.split(',')[1], 'base64')); n++; }
    }
  } finally { await b.close(); sv.close(); }
  return n;
}

const BO = { sketchfab: timSketchfab, polypizza: timPolyPizza, polyfork: timPolyfork, kenney: async (q) => timKenney(q) };
export async function timNguon(nguon, q, { cacheDir, lamLai = false } = {}) {
  if (!BO[nguon]) throw new Error('nguồn lạ: ' + nguon);
  const f = cacheDir && path.join(cacheDir, nguon + '-' + q.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 60) + '.json');
  if (f && nguon !== 'kenney' && !lamLai && fs.existsSync(f)) { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch {} }
  const mau = await BO[nguon](q);
  if (f && nguon !== 'kenney') { fs.mkdirSync(cacheDir, { recursive: true }); fs.writeFileSync(f, JSON.stringify(mau)); }
  return mau;
}
