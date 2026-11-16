// node tools/dang-web.mjs [--chi-dung] [--tap ep003] [--du-an <tên Pages>]
// Dựng web (dashboard đầu việc + trang duyệt tài nguyên) vào dist/web/ rồi đẩy lên Cloudflare Pages (cd web/ để lấy functions/ + wrangler.toml).
// Khoá Cloudflare: đăng nhập `npx wrangler login` (hoặc CLOUDFLARE_API_TOKEN trong .env.local). Không in khoá.
// Tập lên web: chỉ trong TAP_OK (mặc định ep003). ep004/ep005 không bao giờ vào web.
import fs from 'node:fs'; import path from 'node:path'; import { spawnSync } from 'node:child_process'; import { fileURLToPath } from 'node:url';
import { dung } from './duyet.mjs';
import { docEnv } from './web-nhan.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CAM = /^ep00[45]\b/i;   // không đưa lên web
const e = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function cotViec(d) {
  const nhom = d.nhom.filter((n) => !CAM.test(String(n.tap || '')) && !CAM.test(String(n.ten || '')));
  const cot = { dang: [], cho: [], xong: [], chua: [] };
  for (const n of nhom) for (const v of n.viec) {
    const k = v.tt === 'xong' ? 'xong' : v.tt === 'cho' ? 'cho' : v.tt === 'chua' ? 'chua' : 'dang';
    cot[k].push({ ten: v.ten, ghiChu: v.ghiChu || '', nhom: n.ten, tt: v.tt, pt: v.tt === 'xong' ? 100 : v.pt ?? null });
  }
  const canBan = (d.canBan || []).filter((s) => !CAM.test(s)).map((s) => ({ ten: s, ghiChu: '', nhom: 'Cần bạn quyết', tt: 'cho', pt: null }));
  cot.cho = [...canBan, ...cot.cho];
  return cot;
}

export function trangDashboard(d, tapDuyet) {
  const cot = cotViec(d);
  const the = (v) => `<li class="v ${e(v.tt)}"><div class="t">${e(v.ten)}</div><div class="n">${e(v.nhom)}${v.pt != null && v.tt !== 'xong' ? ` · ~${v.pt}%` : ''}</div>${v.ghiChu ? `<div class="g">${e(v.ghiChu)}</div>` : ''}</li>`;
  const c = (id, ten, ds, mo = true) => `<section class="c" id="${id}"><h2>${ten} <b>${ds.length}</b></h2><ul>${ds.map(the).join('')}</ul></section>`;
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>3JS Studio — đầu việc</title><style>
:root{--bg:#f6f7f9;--fg:#1c2230;--mu:#6b7385;--cd:#fff;--bd:#e1e5ec;--ac:#2f6df6}
@media(prefers-color-scheme:dark){:root{--bg:#12151c;--fg:#e8ebf2;--mu:#98a1b5;--cd:#1b2030;--bd:#2a3145;--ac:#6d98ff}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.45 system-ui,"Segoe UI",sans-serif;padding:16px}
header{max-width:1200px;margin:0 auto 12px;display:flex;flex-wrap:wrap;gap:8px 16px;align-items:baseline;justify-content:space-between}
h1{font-size:20px;margin:0}.mu{color:var(--mu);font-size:13px}
nav{max-width:1200px;margin:0 auto 12px;display:flex;flex-wrap:wrap;gap:8px}
nav a,label.sw{background:var(--cd);border:1px solid var(--bd);border-radius:999px;padding:8px 14px;color:var(--ac);text-decoration:none;font-size:14px;min-height:40px;display:inline-flex;align-items:center;gap:6px}
label.sw{color:var(--fg)}
main{max-width:1200px;margin:0 auto;display:grid;gap:12px;grid-template-columns:1fr}
@media(min-width:900px){main{grid-template-columns:repeat(3,1fr);align-items:start}}
.c{background:var(--cd);border:1px solid var(--bd);border-radius:14px;padding:12px}.c h2{font-size:16px;margin:0 0 8px;display:flex;justify-content:space-between}.c h2 b{color:var(--mu);font-weight:600}
ul{list-style:none;margin:0;padding:0;display:grid;gap:8px}.v{border:1px solid var(--bd);border-radius:10px;padding:10px;border-left:4px solid var(--ac)}
.v.cho{border-left-color:#e08a00}.v.xong{border-left-color:#1e8e4e;opacity:.8}.v.chua{border-left-color:var(--mu)}
.t{font-size:15px;overflow-wrap:anywhere}.n{color:var(--mu);font-size:12px;margin-top:2px}.g{font-size:13px;margin-top:4px;overflow-wrap:anywhere}
body.an-ghichu .g{display:none}#chua{display:none}body.hien-chua #chua{display:block}
@media(min-width:900px){#chua{grid-column:1/-1}body.hien-chua #chua ul{grid-template-columns:repeat(3,1fr)}}
</style></head><body>
<header><h1>3JS Studio — đầu việc</h1><span class="mu">cập nhật ${e(d.capNhat)}</span></header>
<nav>${tapDuyet.map((t) => `<a href="/duyet/${e(t)}.html">Duyệt tài nguyên ${e(t)}</a>`).join('')}
<label class="sw"><input type="checkbox" id="swG" checked> Ghi chú</label><label class="sw"><input type="checkbox" id="swC"> Chưa làm (${cot.chua.length})</label></nav>
<main>${c('dang', 'Đang làm', cot.dang)}${c('cho', 'Chờ bạn', cot.cho)}${c('xong', 'Xong', cot.xong)}${c('chua', 'Chưa làm', cot.chua)}</main>
<script>
const b=document.body,L=(k,v)=>{try{if(v===undefined)return localStorage.getItem(k);localStorage.setItem(k,v)}catch{}};
const G=document.getElementById('swG'),C=document.getElementById('swC');
G.checked=L('3js_g')!=='0';C.checked=L('3js_c')==='1';
const ap=()=>{b.classList.toggle('an-ghichu',!G.checked);b.classList.toggle('hien-chua',C.checked);L('3js_g',G.checked?'1':'0');L('3js_c',C.checked?'1':'0')};
G.onchange=C.onchange=ap;ap();
</script></body></html>`;
}

export function dungWeb({ goc = ROOT, out = path.join(ROOT, 'dist/web'), taps, log = console.log } = {}) {
  const env = docEnv(), ok = (taps || String(env.TAP_OK || 'ep003').split(',').map((s) => s.trim()).filter(Boolean)).filter((t) => !CAM.test(t));
  fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(path.join(out, 'duyet'), { recursive: true });
  const d = JSON.parse(fs.readFileSync(path.join(goc, 'docs/tien-do.json'), 'utf8'));
  fs.writeFileSync(path.join(out, 'index.html'), trangDashboard(d, ok));
  for (const t of ok) { const r = dung(t, { goc, log: () => {} }); fs.copyFileSync(r.out, path.join(out, 'duyet', `${t}.html`)); log(`trang duyệt ${t}: ${(r.bytes / 2 ** 20).toFixed(1)} MB, ${r.anhNhung} ảnh`); }
  fs.writeFileSync(path.join(out, '_headers'), '/*\n  X-Robots-Tag: noindex\n  Cache-Control: no-cache\n');
  return { out, taps: ok };
}

export function dang({ du_an, chiDung = false, log = console.log } = {}) {
  const env = docEnv(), r = dungWeb({ log });
  if (chiDung) return r;
  const ten = du_an || env.WEB_PROJECT || '3js-studio';
  const wr = path.join(ROOT, 'node_modules/wrangler/bin/wrangler.js');
  const p = spawnSync(process.execPath, [wr, 'pages', 'deploy', r.out, '--project-name', ten, '--branch', 'main', '--commit-dirty=true'], { cwd: path.join(ROOT, 'web'), stdio: 'inherit', env: { ...process.env, ...(env.CLOUDFLARE_API_TOKEN ? { CLOUDFLARE_API_TOKEN: env.CLOUDFLARE_API_TOKEN } : {}) } });
  if (p.status !== 0) throw new Error('wrangler pages deploy lỗi (đã đăng nhập chưa? npx wrangler login)');
  return r;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const a = process.argv.slice(2), i = a.indexOf('--du-an');
  try { dang({ chiDung: a.includes('--chi-dung'), du_an: i >= 0 ? a[i + 1] : undefined }); } catch (x) { console.error(x.message); process.exit(1); }
}
