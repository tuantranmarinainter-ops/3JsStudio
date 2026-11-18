// Đưa studio, gói .3js và MP4 lên R2 (3js-studio-phim) cho web https://3js.tuanchau.io.vn (xem /r2/ds).
//   node tools/dang-r2.mjs studio [--thu]                 → studio.html + dist/STUDIO RIENG/ep00{1,2,3}.3js + kho-chung (đã lọc, bỏ ep004/ep005)
//   node tools/dang-r2.mjs map <goi.3js> [--thu]         → goi/map/<tên>.3js + kho riêng <tên>.kho.3js (chỉ asset map dùng)
//   node tools/dang-r2.mjs mp4 <file.mp4> <ep> [--giu 5]  → mp4/<ep>/<ngày-giờ>.mp4 + xoá bản cũ, giữ N bản gần nhất mỗi tập
// Chỉ ep001–003. Khoá: `wrangler login` (hoặc CLOUDFLARE_API_TOKEN trong .env.local). Không in khoá. Lỗi/thiếu mạng → chỉ cảnh báo khi gọi từ xuat.mjs.
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto'; import { spawnSync } from 'node:child_process'; import { fileURLToPath } from 'node:url';
import { docEnv } from './web-nhan.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const OK = ['ep001', 'ep002', 'ep003'], BUCKET = '3js-studio-phim', GIU_MAC_DINH = 5;
const STATE = path.join(ROOT, '.cache/dang-r2.json');
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');

// "ep003_xem-thu" / "ep003" → "ep003" nếu được phép, ngược lại null (ep004, ep005, tên lạ).
export function epDuocPhep(ten) { const m = /^(ep\d{3})(?![0-9a-z])/i.exec(String(ten || '')); const ep = m && m[1].toLowerCase(); return ep && OK.includes(ep) ? ep : null; }
export function stampMp4(d = new Date()) { return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 19).replace('T', '_').replace(/:/g, '-'); }
// Giữ `giu` khoá mới nhất (tên có ngày-giờ nên sắp theo chữ), trả về các khoá cần xoá.
export function chonXoa(keys, giu = GIU_MAC_DINH) { const n = Math.max(1, Number(giu) || GIU_MAC_DINH); return [...new Set(keys)].sort().reverse().slice(n); }

// Đọc / dựng gói 3JS1 ("3JS1" + u32 độ dài header + header JSON + dữ liệu nối liền).
export function docGoi(buf) { const n = buf.readUInt32LE(4); return { h: JSON.parse(buf.subarray(8, 8 + n).toString('utf8')), body: buf.subarray(8 + n) }; }
// Kho chung chỉ giữ file mà gói ep001–003 dùng (refs) → không lọt asset riêng của ep004/ep005.
export function locKho(khoBuf, refsHopLe) {
  const { h, body } = docGoi(khoBuf), files = {}, parts = []; let off = 0;
  for (const [p, [kieu, vt, dai]] of Object.entries(h.files)) { if (!refsHopLe.has(p)) continue; files[p] = [kieu, off, dai]; parts.push(body.subarray(vt, vt + dai)); off += dai; }
  const hd = Buffer.from(JSON.stringify({ ...h, files }), 'utf8'), pre = Buffer.alloc(8); pre.write('3JS1', 0, 'latin1'); pre.writeUInt32LE(hd.length, 4);
  return Buffer.concat([pre, hd, ...parts]);
}

function wrangler(args, env, cwd = ROOT) {
  const wr = path.join(ROOT, 'node_modules/wrangler/bin/wrangler.js');
  return spawnSync(process.execPath, [wr, ...args], { cwd, encoding: 'utf8', env: { ...process.env, ...(env.CLOUDFLARE_API_TOKEN ? { CLOUDFLARE_API_TOKEN: env.CLOUDFLARE_API_TOKEN } : {}) } });
}
const put = (key, file, type, env) => wrangler(['r2', 'object', 'put', `${BUCKET}/${key}`, '--file', file, '--content-type', type, '--remote'], env);
const doc = () => { try { return JSON.parse(fs.readFileSync(STATE, 'utf8')); } catch { return {}; } };
const ghi = (s) => { fs.mkdirSync(path.dirname(STATE), { recursive: true }); fs.writeFileSync(STATE, JSON.stringify(s, null, 1)); };
const loiCuoi = (r) => (r.stderr || r.stdout || r.error?.message || '').slice(-200).trim();

// MP4 → R2. Không bao giờ ném lỗi: trả { ok, ly_do }.
export function dangMp4({ file, ep, giu = GIU_MAC_DINH, thu = false, log = console.log, du = {} } = {}) {
  const e = epDuocPhep(ep); if (!e) return { ok: false, boQua: true, ly_do: `${ep}: không thuộc ${OK.join('/')} — không đăng web` };
  if (!file || !fs.existsSync(file)) return { ok: false, ly_do: `không thấy ${file}` };
  const env = { ...docEnv(), ...du }, key = `mp4/${e}/${stampMp4()}.mp4`;
  if (thu) { log(`(thử) sẽ đăng ${file} → ${key}`); return { ok: true, thu: true, key }; }
  let r; try { r = put(key, file, 'video/mp4', env); } catch (x) { return { ok: false, ly_do: x.message }; }
  if (r.status !== 0) return { ok: false, ly_do: 'wrangler lỗi: ' + loiCuoi(r) };
  const st = doc(), ds = [...(st.mp4?.[e] || []), key], xoa = chonXoa(ds, giu), con = ds.filter((k) => !xoa.includes(k));
  const daXoa = xoa.filter((k) => { const d = wrangler(['r2', 'object', 'delete', `${BUCKET}/${k}`, '--remote'], env); if (d.status !== 0) log(`⚠ chưa xoá được ${k}: ${loiCuoi(d)}`); return d.status === 0; });
  st.mp4 = { ...st.mp4, [e]: [...con, ...xoa.filter((k) => !daXoa.includes(k))].sort() }; ghi(st);
  const host = String(env.WEB_URL || 'https://3js.tuanchau.io.vn').replace(/\/$/, '');
  return { ok: true, key, url: `${host}/#tap-phim`, daXoa };
}

// Map (gói kind 'boi-canh', vd city-moi-5x5.3js) → kho riêng chỉ chứa asset map dùng, đóng từ file gốc trong repo (kiểm sha256).
export const RE_MAP = /^[a-z0-9][a-z0-9-]{0,60}$/;
export function dongKhoMap(goiBuf, goc = ROOT) {
  const { h } = docGoi(goiBuf), files = {}, parts = []; let off = 0;
  for (const [p, [kieu, sh, dai]] of Object.entries(h.refs || {})) {
    const f = path.join(goc, p.replace(/^\/+/, '')); if (!fs.existsSync(f)) throw new Error('thiếu asset ' + p);
    const b = fs.readFileSync(f); if (sha(b) !== sh || b.length !== dai) throw new Error('asset đã đổi so với gói (sha khác): ' + p + ' — dựng lại gói map');
    files[p] = [kieu, off, dai, sh]; parts.push(b); off += dai;
  }
  const hd = Buffer.from(JSON.stringify({ v: 2, kind: 'kho', built: h.built || new Date().toISOString(), files }), 'utf8'), pre = Buffer.alloc(8); pre.write('3JS1', 0, 'latin1'); pre.writeUInt32LE(hd.length, 4);
  return Buffer.concat([pre, hd, ...parts]);
}
export function dangMap({ file, studio = null, thu = false, log = console.log, goc = ROOT } = {}) {
  const ten = path.basename(String(file || ''), '.3js'); if (!RE_MAP.test(ten) || /^ep00[45]/i.test(ten)) throw new Error('tên map không hợp lệ: ' + ten);
  const buf = fs.readFileSync(file), { h } = docGoi(buf); if (h.kind !== 'boi-canh') throw new Error(ten + ': không phải gói bối cảnh (kind=' + h.kind + ')');
  const tmp = path.join(goc, 'output/_tmp'); fs.mkdirSync(tmp, { recursive: true });
  const kf = path.join(tmp, ten + '.kho.3js'); fs.writeFileSync(kf, dongKhoMap(buf, goc));
  const dir = path.join(goc, 'dist/STUDIO RIENG'), bc = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => /^studio-boi-canh.*\.html$/.test(f)).sort().pop() : null;
  const stu = studio || (bc ? path.join(dir, bc) : path.join(dir, 'studio.html'));   // studio có module xem bối cảnh (engine/boi-canh-xem.js)
  const env = docEnv(), muc = [{ key: `goi/map/${ten}.3js`, file }, { key: `goi/map/${ten}.kho.3js`, file: kf }, { key: 'goi/map/studio.html', file: stu, type: 'text/html; charset=utf-8' }];
  log('studio cho map: ' + path.relative(goc, stu));
  for (const m of muc) { const mb = (fs.statSync(m.file).size / 2 ** 20).toFixed(1);
    if (thu) { log(`${m.key}: sẽ đẩy ${mb} MB (thử)`); continue; }
    const r = put(m.key, m.file, m.type || 'application/octet-stream', env); if (r.status !== 0) throw new Error(m.key + ': ' + loiCuoi(r)); log(`${m.key}: đã đẩy ${mb} MB`); }
  const host = String(env.WEB_URL || 'https://3js.tuanchau.io.vn').replace(/\/$/, '');
  return `${host}/r2/m/studio?goi=${encodeURIComponent('/r2/m/' + ten + '.3js')}&kho=${encodeURIComponent('/r2/m/' + ten + '.kho.3js')}`;
}

// Studio + gói + kho → R2. Bỏ qua file không đổi (sha256 trong .cache/dang-r2.json).
export function dangStudio({ goc = ROOT, thu = false, log = console.log } = {}) {
  const env = docEnv(), dir = path.join(goc, 'dist/STUDIO RIENG'), tmp = path.join(goc, 'output/_tmp'); fs.mkdirSync(tmp, { recursive: true });
  const st = doc(), muc = [], refs = new Set();
  const studio = path.join(dir, 'studio.html'); if (fs.existsSync(studio)) muc.push({ key: 'studio.html', file: studio, type: 'text/html; charset=utf-8' }); else log('thiếu studio.html');
  for (const ep of OK) { const f = path.join(dir, `${ep}.3js`); if (!fs.existsSync(f)) { log(`${ep}.3js: thiếu, bỏ qua`); continue; }
    muc.push({ key: `goi/${ep}.3js`, file: f, type: 'application/octet-stream' }); for (const p of Object.keys(docGoi(fs.readFileSync(f)).h.refs || {})) refs.add(p); }
  const kho = path.join(dir, 'kho-chung.3js');
  if (fs.existsSync(kho)) { const b = locKho(fs.readFileSync(kho), refs), f = path.join(tmp, 'kho-chung.web.3js'); fs.writeFileSync(f, b); muc.push({ key: 'goi/kho-chung.3js', file: f, type: 'application/octet-stream' }); }
  const kq = [];
  for (const m of muc) {
    const h = sha(fs.readFileSync(m.file)), mb = (fs.statSync(m.file).size / 2 ** 20).toFixed(1);
    if (st.studio?.[m.key]?.sha === h) { log(`${m.key}: không đổi`); kq.push({ key: m.key, tt: 'khong-doi' }); continue; }
    if (thu) { log(`${m.key}: sẽ đẩy ${mb} MB (thử)`); kq.push({ key: m.key, tt: 'se-day' }); continue; }
    const r = put(m.key, m.file, m.type, env);
    if (r.status !== 0) { log(`${m.key}: LỖI ${loiCuoi(r)}`); kq.push({ key: m.key, tt: 'loi' }); continue; }
    st.studio = { ...st.studio, [m.key]: { sha: h, luc: new Date().toISOString() } }; ghi(st); log(`${m.key}: đã đẩy ${mb} MB`); kq.push({ key: m.key, tt: 'da-day' });
  }
  return kq;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const a = process.argv.slice(2), gt = (k, d) => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : d; };
  try {
    if (a[0] === 'studio') { if (dangStudio({ thu: a.includes('--thu') }).some((k) => k.tt === 'loi')) process.exit(1); }
    else if (a[0] === 'map') { const u = dangMap({ file: a[1], thu: a.includes('--thu') }); console.log('Mở map: ' + u); }
    else if (a[0] === 'mp4') { const r = dangMp4({ file: a[1], ep: a[2], giu: gt('--giu', GIU_MAC_DINH), thu: a.includes('--thu') }); console.log(r.ok ? (r.thu ? `(thử, chưa đăng) ${r.key}` : `đã đăng ${r.key}`) : 'KHÔNG đăng: ' + r.ly_do); process.exit(r.ok ? 0 : 1); }
    else { console.error('Dùng: dang-r2.mjs studio [--thu] | map <goi.3js> [--thu] | mp4 <file.mp4> <ep> [--giu 5]'); process.exit(1); }
  } catch (x) { console.error(x.message); process.exit(1); }
}
