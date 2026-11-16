// node tools/dang-phim.mjs [ep001 ep002 ep003] [--thu] [--ep-ep ép]  — đẩy bản studio/tập mới nhất lên R2 (3js-studio-phim) cho web.
// gzip dist/<ep>.html → wrangler r2 object put --remote; bỏ qua tập không đổi (so sha256 với .cache/dang-phim.json).
// Chỉ ep001–003; ep004/ep005 bị chặn. --thu = chỉ in việc sẽ làm. --ep-ep: không dùng. Khoá Cloudflare: wrangler login (không in khoá).
import fs from 'node:fs'; import path from 'node:path'; import zlib from 'node:zlib'; import crypto from 'node:crypto'; import { spawnSync } from 'node:child_process'; import { fileURLToPath } from 'node:url';
import { docEnv } from './web-nhan.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OK = ['ep001', 'ep002', 'ep003'], BUCKET = '3js-studio-phim';
const STATE = path.join(ROOT, '.cache/dang-phim.json');
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');

export function dangPhim({ taps, thu = false, log = console.log, goc = ROOT } = {}) {
  const env = docEnv(), host = String(env.WEB_URL || 'https://3js.tuanchau.io.vn').replace(/\/$/, '');
  const ds = (taps?.length ? taps : OK);
  const bad = ds.filter((t) => !OK.includes(t)); if (bad.length) throw new Error(`không được đưa lên web: ${bad.join(', ')} (chỉ ${OK.join(', ')})`);
  let st = {}; try { st = JSON.parse(fs.readFileSync(STATE, 'utf8')); } catch {}
  const kq = [];
  for (const ep of ds) {
    const src = path.join(goc, 'dist', `${ep}.html`);
    if (!fs.existsSync(src)) { log(`${ep}: thiếu ${src} (gộp bằng npm run bundle:${ep})`); kq.push({ ep, trangThai: 'thieu' }); continue; }
    const raw = fs.readFileSync(src), h = sha(raw);
    if (st[ep]?.sha === h) { log(`${ep}: không đổi, bỏ qua  ${host}/phim/${ep}`); kq.push({ ep, trangThai: 'khong-doi' }); continue; }
    if (thu) { log(`${ep}: sẽ đẩy ${(raw.length / 2 ** 20).toFixed(1)} MB (thử, chưa làm)`); kq.push({ ep, trangThai: 'se-day' }); continue; }
    const gz = path.join(goc, 'output/_tmp', `${ep}.html.gz`); fs.mkdirSync(path.dirname(gz), { recursive: true });
    fs.writeFileSync(gz, zlib.gzipSync(raw, { level: 9 }));
    const wr = path.join(goc, 'node_modules/wrangler/bin/wrangler.js');
    const r = spawnSync(process.execPath, [wr, 'r2', 'object', 'put', `${BUCKET}/${ep}.html`, '--file', gz, '--content-type', 'text/html; charset=utf-8', '--content-encoding', 'gzip', '--remote'], { cwd: goc, encoding: 'utf8', env: { ...process.env, ...(env.CLOUDFLARE_API_TOKEN ? { CLOUDFLARE_API_TOKEN: env.CLOUDFLARE_API_TOKEN } : {}) } });
    fs.rmSync(gz, { force: true });
    if (r.status !== 0) { log(`${ep}: LỖI wrangler (${(r.stderr || '').slice(-200).trim()})`); kq.push({ ep, trangThai: 'loi' }); continue; }
    st[ep] = { sha: h, luc: new Date().toISOString(), mb: +(raw.length / 2 ** 20).toFixed(1) };
    fs.mkdirSync(path.dirname(STATE), { recursive: true }); fs.writeFileSync(STATE, JSON.stringify(st, null, 1));
    log(`${ep}: đã đẩy ${(raw.length / 2 ** 20).toFixed(1)} MB  ${host}/phim/${ep}`); kq.push({ ep, trangThai: 'da-day' });
  }
  return kq;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const a = process.argv.slice(2);
  try { const kq = dangPhim({ taps: a.filter((x) => !x.startsWith('--')), thu: a.includes('--thu') }); if (kq.some((k) => k.trangThai === 'loi')) process.exit(1); } catch (x) { console.error(x.message); process.exit(1); }
}
