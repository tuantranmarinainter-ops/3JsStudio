// Dựng STUDIO một file: dist/studio.html = trình mở gói tập + lõi (engine + vendor/three + trình phát/Xuất MP4).
//   node tools/bundle-studio.mjs [--out dist/studio.html] [--version 2026.11.15-1]
// Mở gói tập (tools/goi-tap.mjs → dist/<ep>.3js) bằng: nút Mở tập, kéo thả, hoặc ?goi=<đường dẫn tương đối/URL>.
// Kế hoạch: docs/handoff/tach-studio.md. Lõi nằm trong <script type="text/plain" id="core"> và CHỈ chạy sau khi đã đọc gói
// (vì engine tải GLB ngay lúc nạp module, vd props-kb.js) → GĐ3 thay lõi này bằng bản tải từ GitHub Release.
import { readFile, writeFile, mkdir } from 'fs/promises';
import { readdirSync, readFileSync } from 'fs';
import { join, resolve, dirname, relative } from 'path';
import { pathToFileURL, fileURLToPath } from 'url';
import { build } from 'esbuild';

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
const meta = { version, mods: keys };

const LOADER = String.raw`
(function () {
  var META = JSON.parse(document.getElementById('coremeta').textContent);
  var CORE = document.getElementById('core').textContent;
  var PACK = null, urls = new Map();
  function norm(u) { try { u = decodeURI(String(u)); } catch (e) {} return u.replace(/^[a-z]+:\/\/[^/]*/i, '').split('?')[0]; }
  function lookup(u) {
    if (!PACK) return null; var k = norm(u), F = PACK.files;
    if (!(k in F)) { var s = PACK.keys.find(function (x) { return k.endsWith(x); }); if (!s) return null; k = s; }
    if (!urls.has(k)) { var e = F[k]; urls.set(k, URL.createObjectURL(new Blob([new Uint8Array(PACK.buf, PACK.base + e[1], e[2])], { type: e[0] }))); }
    return urls.get(k);
  }
  function msg(t, bad) { var m = document.getElementById('smsg'); if (m) { m.textContent = t; m.className = bad ? 'bad' : ''; } else if (bad) alert(t); }
  function parse(buf) {
    var u8 = new Uint8Array(buf, 0, 8);
    if (String.fromCharCode(u8[0], u8[1], u8[2], u8[3]) !== '3JS1') throw new Error('Không phải gói tập .3js');
    var n = new DataView(buf).getUint32(4, true);
    var h = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 8, n)));
    h.buf = buf; h.base = 8 + n; h.keys = Object.keys(h.files); return h;
  }
  function open(buf, name) {
    var h; try { h = parse(buf); } catch (e) { return msg(name + ': ' + e.message, true); }
    if (META.version.slice(0, 10) < h.coreMin) return msg('Gói ' + h.ep + ' cần studio ≥ ' + h.coreMin + ' (đang ' + META.version + ') — bấm Cập nhật mới nhất.', true);
    var thieu = h.mods.filter(function (k) { return META.mods.indexOf(k) < 0; });
    if (thieu.length) return msg('Studio thiếu ' + thieu.length + ' module (' + thieu.slice(0, 3).join(', ') + ') — bấm Cập nhật mới nhất.', true);
    PACK = h; window.__embedURL = lookup; window.__pack = { ep: h.ep, title: h.title, built: h.built, core: META.version };
    var _fetch = window.fetch.bind(window);
    window.fetch = function (input, init) { var u = typeof input === 'string' ? input : input.url; var b = lookup(u); return _fetch(b || input, init); };
    window.__studioRun = async function () {
      try {
        await import(URL.createObjectURL(new Blob([CORE], { type: 'text/javascript' })));
        await import(lookup(h.js));
      } catch (e) { console.error(e); document.documentElement.setAttribute('data-xload', 'Lỗi mở tập: ' + (e && e.message || e)); }
    };
    var COVER = (navigator.webdriver && !new URLSearchParams(location.search).has('ui')) ? '' :
      '<script>(function(){var d=document.documentElement;d.setAttribute("data-xload","Đang mở trình phát…");var s=document.createElement("style");s.id="xpre";s.textContent="html,body{background:#0d0f14!important}body>*{visibility:hidden!important}html::after{content:attr(data-xload);position:fixed;inset:0;display:flex;align-items:center;justify-content:center;color:#8b93a7;font:15px system-ui,sans-serif;z-index:2147483647}";d.appendChild(s);setTimeout(function(){s.remove()},90000)})()<\/script>';
    var page = h.page.replace(/__PACK__:([^"]+)/g, function (m, k) { return lookup(k) || k; })
      .replace('<!--__EP_MODULE__-->', '<script type="module">window.__studioRun()<\/script>')
      .replace(/<head>/i, function (x) { return x + COVER; });
    document.open(); document.write(page); document.close();
  }
  function readFile(f) { msg('Đang đọc ' + f.name + '…'); f.arrayBuffer().then(function (b) { open(b, f.name); }, function (e) { msg(e.message, true); }); }
  window.__studioOpen = open;
  var q = new URLSearchParams(location.search).get('goi');
  if (q) { msg('Đang tải ' + q + '…'); fetch(q).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.arrayBuffer(); }).then(function (b) { open(b, q); }, function (e) { msg('Không tải được ' + q + ': ' + e.message + ' — chọn file bằng nút Mở tập.', true); }); }
  document.getElementById('sfile').addEventListener('change', function (e) { if (e.target.files[0]) readFile(e.target.files[0]); });
  addEventListener('dragover', function (e) { e.preventDefault(); document.body.classList.add('drag'); });
  addEventListener('dragleave', function () { document.body.classList.remove('drag'); });
  addEventListener('drop', function (e) { e.preventDefault(); document.body.classList.remove('drag'); var f = e.dataTransfer.files[0]; if (f) readFile(f); });
  document.getElementById('sver').textContent = 'Studio ' + META.version;
})();`;

const html = `<!doctype html>
<!-- 3JS Studio ${version} — dựng bởi tools/bundle-studio.mjs (${now.toISOString()}). Mở gói tập dist/<ep>.3js (tools/goi-tap.mjs). -->
<html lang="vi"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
<title>3JS Studio</title>
<style>
  :root { color-scheme: dark; }
  html, body { margin: 0; height: 100%; background: #0e1116; color: #e8ecf2; font: 15px/1.5 "Segoe UI", system-ui, sans-serif; }
  #spick { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; padding: 16px; box-sizing: border-box; text-align: center; }
  #spick h1 { margin: 0; font-size: 26px; letter-spacing: .3px; } #spick h1 span { color: #4da3ff; }
  #spick .box { border: 2px dashed #2a3342; border-radius: 14px; padding: 34px 28px; max-width: 460px; width: 100%; box-sizing: border-box; background: #161b23; }
  body.drag #spick .box { border-color: #4da3ff; }
  #spick label.btn { display: inline-block; background: #1f6fd1; color: #fff; border-radius: 8px; padding: 9px 18px; font-weight: 700; cursor: pointer; }
  #spick input { display: none; } #spick .muted { color: #8b96a8; font-size: 13px; }
  #smsg { min-height: 1.5em; } #smsg.bad { color: #f2647a; }
</style>
<script>${esc(gsap)}</script>
<script type="application/json" id="coremeta">${JSON.stringify(meta)}</script>
<script type="text/plain" id="core">${esc(core)}</script>
</head><body>
<div id="spick">
  <h1>3JS <span>Studio</span></h1>
  <div class="box">
    <p><label class="btn">Mở tập…<input id="sfile" type="file" accept=".3js" /></label></p>
    <p class="muted">hoặc kéo thả file <b>.3js</b> (dist/ep003.3js…) vào đây</p>
    <p id="smsg"></p>
  </div>
  <div class="muted" id="sver"></div>
</div>
<script>${esc(LOADER)}</script>
</body></html>`;
await mkdir(dirname(out), { recursive: true });
await writeFile(out, html);
console.log(`studio ${version}: lõi ${(core.length / 1024).toFixed(0)} KB, ${keys.length} module → ${relative(root, out).replace(/\\/g, '/')} (${(Buffer.byteLength(html) / 1048576).toFixed(2)} MB)`);
console.log(`  mở: ${pathToFileURL(out).href}`);
