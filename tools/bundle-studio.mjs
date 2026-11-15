// Dựng STUDIO một file: dist/studio.html = trình mở gói tập + lõi (engine + vendor/three + trình phát/Xuất MP4).
//   node tools/bundle-studio.mjs [--out dist/studio.html] [--version 2026.11.15-1]
// Mở gói tập (tools/goi-tap.mjs → dist/<ep>.3js) bằng: nút Mở tập, kéo thả, hoặc ?goi=<đường dẫn tương đối/URL>.
// Asset dùng chung lấy từ kho trong IndexedDB (nạp 1 lần từ dist/kho-chung.3js — tools/kho-chung.mjs; tự động: ?kho=…).
// Kế hoạch: docs/handoff/tach-studio.md. Lõi nằm trong <script type="text/plain" id="core"> và CHỈ chạy sau khi đã đọc gói
// (vì engine tải GLB ngay lúc nạp module, vd props-kb.js) → GĐ3 thay lõi này bằng bản tải từ GitHub Release.
import { readFile, writeFile, mkdir } from 'fs/promises';
import { readdirSync, readFileSync } from 'fs';
import { join, resolve, dirname, relative } from 'path';
import { pathToFileURL, fileURLToPath } from 'url';
import { build } from 'esbuild';
import { createHash } from 'crypto';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(root, opt('out', 'dist/studio.html'));
const now = new Date(); const pad = (n) => String(n).padStart(2, '0');
const version = opt('version', `${now.getFullYear()}.${pad(now.getMonth() + 1)}.${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`);
const tpl = readFileSync(join(root, 'episodes', '_template', 'index.html'), 'utf8');
const importmap = JSON.parse(tpl.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports;

// Bảng module gói tập được dùng = module engine mà các tập import THẲNG (dò episodes/*/index.html + *.js) + mọi engine/envs/*.js
// (tập nạp động theo tên env) + three. KHÔNG lấy cả engine/*.js: có file là trang thử (vd stairs-lab.js tự tạo renderer khi nạp).
const used = new Set();
for (const d of readdirSync(join(root, 'episodes'), { withFileTypes: true })) {
  if (!d.isDirectory() || (d.name.startsWith('_') && d.name !== '_template')) continue;
  for (const f of readdirSync(join(root, 'episodes', d.name))) {
    if (!/\.(js|html)$/.test(f)) continue;
    const src = readFileSync(join(root, 'episodes', d.name, f), 'utf8');
    for (const m of src.matchAll(/(?:from|import\()\s*['"`]((?:\/|(?:\.\.\/)+)engine\/[^'"`$]+\.js)['"`]/g)) used.add('/engine/' + m[1].split('engine/')[1]);
  }
}
const keys = [...new Set([
  ...used,
  ...readdirSync(join(root, 'engine', 'envs')).filter((f) => f.endsWith('.js') && !f.includes('-lab')).map((f) => `/engine/envs/${f}`),
  importmap.three,
])].sort();
const entry = [
  `import '@hook';`,
  ...keys.map((k, i) => `import * as m${i} from ${JSON.stringify(join(root, k).replace(/\\/g, '/'))};`),
  `import ${JSON.stringify(join(root, 'tools', 'export-ui.js').replace(/\\/g, '/'))};`,
  `const M = {${keys.map((k, i) => `${JSON.stringify(k)}: m${i}`).join(', ')}};`,
  `Object.assign(globalThis.__mods || (globalThis.__mods = {}), M);`,
  `globalThis.__modImport = (k) => M[k] ? Promise.resolve(M[k]) : Promise.reject(new Error('Studio thiếu module ' + k));`,
].join('\n');
const HOOK = `import * as THREE from 'three';
const L = globalThis.__embedURL; window.THREE = THREE;
if (L) THREE.DefaultLoadingManager.setURLModifier((u) => (String(u).startsWith('blob:') || String(u).startsWith('data:')) ? u : (L(u) || u));`;
const res = await build({
  stdin: { contents: entry, resolveDir: root, loader: 'js', sourcefile: 'studio-core.js' },
  bundle: true, format: 'esm', target: 'es2022', minify: true, write: false, legalComments: 'none', logLevel: 'warning',
  define: { 'import.meta.url': JSON.stringify('file:///studio/engine/envs/_.js') },   // lõi chạy từ blob: (không làm gốc URL được); lớp chặn fetch khớp theo đuôi đường dẫn
  plugins: [{
    name: 'paths',
    setup(b) {
      b.onResolve({ filter: /^@hook$/ }, () => ({ path: 'hook', namespace: 'hook' }));
      b.onLoad({ filter: /.*/, namespace: 'hook' }, () => ({ contents: HOOK, resolveDir: root, loader: 'js' }));
      b.onResolve({ filter: /.*/ }, (a) => {
        let p = a.path;
        for (const [k, v] of Object.entries(importmap)) if (k.endsWith('/') ? p.startsWith(k) : p === k) { p = v + p.slice(k.length); break; }
        if (p.startsWith('/')) return { path: join(root, p) };
        return null;
      });
    },
  }],
});
const core = `globalThis.__studioCore = ${JSON.stringify({ version })};\n` + res.outputFiles[0].text;
const esc = (s) => s.replace(/<\/script/gi, '<\\/script');
const gsap = readFileSync(join(root, 'vendor', 'gsap', 'gsap.min.js'), 'utf8');
// NGUỒN CẬP NHẬT (chốt 15/11: GitHub Release công khai). Tệp đính kèm Release KHÔNG tải được từ trình duyệt (thiếu CORS, đã thử),
// nên: API releases/latest (có CORS) → tên thẻ → raw.githubusercontent.com/<repo>/<thẻ>/studio-core.{json,js} (thẻ nằm trên nhánh
// studio-ban do tools/phat-hanh-studio.mjs tạo). Thử nghiệm: ?nguon=<url gốc> (cần <gốc>latest.json + <gốc><thẻ>/studio-core.*).
const REPO = opt('repo', 'tuantranmarinainter-ops/3JsStudio');
const meta = { version, mods: keys, api: `https://api.github.com/repos/${REPO}/releases/latest`, raw: `https://raw.githubusercontent.com/${REPO}/` };

// Bản lõi để phát hành (tools/phat-hanh-studio.mjs đẩy lên nhánh studio-ban + Release)
const banDir = join(dirname(out), 'studio-ban');
await mkdir(banDir, { recursive: true });
await writeFile(join(banDir, 'studio-core.js'), core);
await writeFile(join(banDir, 'studio-core.json'), JSON.stringify({ version, sha256: createHash('sha256').update(core).digest('hex'),
  size: Buffer.byteLength(core), mods: keys, notes: opt('ghi-chu', '') }, null, 1));

const LOADER = readFileSync(join(root, 'tools', 'studio-loader.js'), 'utf8');

const html = `<!doctype html>
<!-- 3JS Studio ${version} — dựng bởi tools/bundle-studio.mjs (${now.toISOString()}). Mở gói tập dist/<ep>.3js (tools/goi-tap.mjs). -->
<html lang="vi"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
<title>3JS Studio</title>
<style>
  :root { color-scheme: dark; }
  html, body { margin: 0; min-height: 100%; background: #0e1116; color: #e8ecf2; font: 15px/1.5 "Segoe UI", system-ui, sans-serif; }
  #spick { max-width: 760px; margin: 0 auto; padding: 24px 16px 40px; box-sizing: border-box; display: flex; flex-direction: column; gap: 14px; }
  #spick h1 { margin: 0; font-size: 26px; letter-spacing: .3px; } #spick h1 span { color: #4da3ff; }
  #spick .top { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; } #spick .sp { flex: 1; }
  #spick .box { border: 1px solid #2a3342; border-radius: 12px; padding: 14px 16px; background: #161b23; }
  #spick .box.drop { border: 2px dashed #2a3342; text-align: center; padding: 22px 16px; } body.drag #spick .box.drop { border-color: #4da3ff; }
  #spick h3 { margin: 0 0 8px; font-size: 13px; letter-spacing: .8px; text-transform: uppercase; color: #8b96a8; }
  #spick button { background: #1d2430; color: #e8ecf2; border: 1px solid #2a3342; border-radius: 7px; padding: 6px 12px; cursor: pointer; font: inherit; font-weight: 600; }
  #spick button:hover { border-color: #4da3ff; } #spick button.main { background: #1f6fd1; border-color: #4da3ff; color: #fff; }
  #spick button:disabled { opacity: .5; cursor: default; }
  #spick .muted { color: #8b96a8; font-size: 13px; } #spick .row { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; margin-top: 8px; }
  #slist .tap { display: grid; grid-template-columns: 1fr auto; gap: 2px 10px; padding: 9px 10px; border: 1px solid #2a3342; border-radius: 9px; margin-top: 8px; cursor: pointer; }
  #slist .tap:hover { border-color: #4da3ff; background: #1d2430; } #slist .tap b { font-size: 15px; } #slist .tap .warn { color: #f5b84a; }
  #smsg { min-height: 1.5em; white-space: pre-line; } #smsg.bad { color: #f2647a; } .ok { color: #3ecf8e; } .warnc { color: #f5b84a; }
  #sban { display: none; } #sban.on { display: block; border-color: #f5b84a; }
  #skhods details { margin-top: 6px; } #skhods summary { cursor: pointer; } #skhods ul { margin: 4px 0 0; padding-left: 18px; color: #8b96a8; font-size: 12.5px; max-height: 260px; overflow: auto; }
  @media (max-width: 520px) { #spick { padding: 16px 16px 32px; } }
</style>
<script>${esc(gsap)}</script>
<script type="application/json" id="coremeta">${JSON.stringify(meta)}</script>
<script type="text/plain" id="core">${esc(core)}</script>
</head><body>
<div id="spick">
  <div class="top"><h1>3JS <span>Studio</span></h1><span class="sp"></span><span class="muted" id="sver"></span></div>
  <div class="box" id="sban"></div>
  <div class="box">
    <h3>Thư mục studio</h3>
    <div id="sdir" class="muted">Chưa chọn thư mục. Bấm “Chọn thư mục studio” và chọn thư mục chứa studio.html (vd S:\\3JS Studio\\dist) — chỉ cần 1 lần, lần sau studio tự đọc.</div>
    <div class="row"><button class="main" id="sdirbtn">Chọn thư mục studio…</button><button id="sscan" style="display:none">Quét lại</button></div>
    <div id="slist"></div>
  </div>
  <div class="box drop">
    <div class="row" style="justify-content:center;margin:0"><button id="sopen">Mở file .3js…</button><input id="sfile" type="file" accept=".3js" multiple style="display:none" /></div>
    <p class="muted" style="margin:8px 0 0">hoặc kéo thả file <b>.3js</b> vào đây (gói tập, kho chung)</p>
  </div>
  <div class="box">
    <h3>Kho asset dùng chung</h3>
    <div id="skho" class="muted"></div>
    <div class="row"><button id="skhoup" style="display:none" class="main">Cập nhật kho</button><button id="skhoxem">Xem kho</button><button id="sxoa" style="display:none">Xoá kho</button></div>
    <div id="skhods"></div>
  </div>
  <div class="box">
    <h3>Phiên bản studio</h3>
    <div id="score" class="muted"></div>
    <div class="row"><button id="supd">Cập nhật mới nhất</button><button id="sprev" style="display:none">Về bản trước</button><button id="sgoc" style="display:none">Về bản gốc</button>
      <label class="muted"><input type="checkbox" id="sauto" /> Tự kiểm bản mới khi mở</label></div>
    <div id="supdinfo" class="muted"></div>
  </div>
  <p id="smsg"></p>
</div>
<script>${esc(LOADER)}</script>
</body></html>`;
await mkdir(dirname(out), { recursive: true });
await writeFile(out, html);
console.log(`studio ${version}: lõi ${(core.length / 1024).toFixed(0)} KB, ${keys.length} module → ${relative(root, out).replace(/\\/g, '/')} (${(Buffer.byteLength(html) / 1048576).toFixed(2)} MB)`);
console.log(`  bản phát hành: dist/studio-ban/studio-core.{js,json} → node tools/phat-hanh-studio.mjs`);
console.log(`  mở: ${pathToFileURL(out).href}`);
