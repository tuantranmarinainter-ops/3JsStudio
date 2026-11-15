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
  var Q = new URLSearchParams(location.search);
  var PACK = null, urls = new Map(), refUrls = {}, pending = null;
  function norm(u) { try { u = decodeURI(String(u)); } catch (e) {} return u.replace(/^[a-z]+:\/\/[^/]*/i, '').split('?')[0]; }
  function lookup(u) {
    if (!PACK) return null; var k = norm(u), F = PACK.files;
    if (!(k in F) && !(k in refUrls)) { var s = PACK.keys.find(function (x) { return k.endsWith(x); }); if (!s) return null; k = s; }
    if (k in refUrls) return refUrls[k];
    if (!urls.has(k)) { var e = F[k]; urls.set(k, URL.createObjectURL(new Blob([new Uint8Array(PACK.buf, PACK.base + e[1], e[2])], { type: e[0] }))); }
    return urls.get(k);
  }
  function msg(t, bad) { var m = document.getElementById('smsg'); if (m) { m.textContent = t; m.className = bad ? 'bad' : ''; } else if (bad) alert(t); }
  function mb(n) { return (n / 1048576).toFixed(1) + ' MB'; }
  function parse(buf) {
    var u8 = new Uint8Array(buf, 0, 8);
    if (String.fromCharCode(u8[0], u8[1], u8[2], u8[3]) !== '3JS1') throw new Error('Không phải file .3js');
    var n = new DataView(buf).getUint32(4, true);
    var h = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 8, n)));
    h.buf = buf; h.base = 8 + n; h.kind = h.kind || 'tap'; h.refs = h.refs || {}; return h;
  }

  // ---- KHO CHUNG: IndexedDB '3js-studio' — store 'blob' (sha256 → Blob), 'path' (đường dẫn → sha256 mới nhất) ----
  var DB = null;
  function idb() {
    return DB || (DB = new Promise(function (res, rej) {
      var r = indexedDB.open('3js-studio', 1);
      r.onupgradeneeded = function () { r.result.createObjectStore('blob'); r.result.createObjectStore('path'); };
      r.onsuccess = function () { res(r.result); }; r.onerror = function () { rej(r.error); };
    }));
  }
  function req(store, fn) {   // 1 giao dịch đọc trên 1 store, fn(store) → mảng IDBRequest → mảng kết quả
    return idb().then(function (d) { return new Promise(function (res, rej) {
      var t = d.transaction(store, 'readonly'), rs = fn(t.objectStore(store));
      t.oncomplete = function () { res(rs.map(function (r) { return r.result; })); }; t.onerror = function () { rej(t.error); };
    }); });
  }
  function khoStatus() {
    var el = document.getElementById('skho'); if (!el) return;
    req('path', function (s) { return [s.count()]; }).then(function (r) {
      el.textContent = r[0] ? 'Kho chung trong máy: ' + r[0] + ' file' : 'Chưa có kho chung trong máy — kéo dist/kho-chung.3js vào (1 lần).';
      document.getElementById('sxoa').style.display = r[0] ? '' : 'none';
    }, function (e) { el.textContent = 'Trình duyệt không cho lưu kho (IndexedDB): ' + e.message; });
  }
  function importKho(h, name) {
    msg('Đang lưu kho chung vào máy…');
    try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (e) {}
    return idb().then(function (d) { return new Promise(function (res, rej) {
      var t = d.transaction(['blob', 'path'], 'readwrite'), B = t.objectStore('blob'), P = t.objectStore('path'), seen = {}, n = 0, bytes = 0;
      for (var p in h.files) {
        var e = h.files[p];   // [kiểu, vị trí, độ dài, sha256]
        if (!seen[e[3]]) { seen[e[3]] = 1; B.put(new Blob([new Uint8Array(h.buf, h.base + e[1], e[2])], { type: e[0] }), e[3]); bytes += e[2]; }
        P.put(e[3], p); n++;
      }
      t.oncomplete = function () { msg('Đã lưu kho chung: ' + n + ' file, ' + mb(bytes) + '.'); khoStatus(); res(); };
      t.onerror = t.onabort = function () { rej(t.error || new Error('lưu kho thất bại (ổ đầy?)')); };
    }); });
  }
  function resolveRefs(h) {   // → danh sách đường dẫn còn thiếu; điền refUrls
    var paths = Object.keys(h.refs);
    return req('blob', function (s) { return paths.map(function (p) { return s.get(h.refs[p][1]); }); }).then(function (blobs) {
      var miss = paths.filter(function (p, i) { if (blobs[i]) { refUrls[p] = URL.createObjectURL(blobs[i].slice(0, blobs[i].size, h.refs[p][0])); return false; } return true; });
      if (!miss.length) return miss;
      // sha lệch (kho dựng sau khi asset đổi) → lấy bản mới nhất theo đường dẫn, báo trong console
      return req('path', function (s) { return miss.map(function (p) { return s.get(p); }); }).then(function (shas) {
        return req('blob', function (s) { return shas.map(function (x) { return s.get(x || '-'); }); }).then(function (b2) {
          return miss.filter(function (p, i) {
            if (b2[i]) { console.warn('[kho] ' + p + ': bản trong kho khác lúc đóng gói ' + h.ep + ' — dùng bản trong kho'); refUrls[p] = URL.createObjectURL(b2[i].slice(0, b2[i].size, h.refs[p][0])); return false; }
            return true;
          });
        });
      });
    });
  }
  function fetchBuf(u) { return fetch(u).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.arrayBuffer(); }); }

  async function handle(buf, name) {
    var h; try { h = parse(buf); } catch (e) { return msg(name + ': ' + e.message, true); }
    if (h.kind === 'kho') { await importKho(h, name); if (pending) { var p = pending; pending = null; return handle(p.buf, p.name); } return; }
    if (META.version.slice(0, 10) < h.coreMin) return msg('Gói ' + h.ep + ' cần studio ≥ ' + h.coreMin + ' (đang ' + META.version + ') — bấm Cập nhật mới nhất.', true);
    var thieu = h.mods.filter(function (k) { return META.mods.indexOf(k) < 0; });
    if (thieu.length) return msg('Studio thiếu ' + thieu.length + ' module (' + thieu.slice(0, 3).join(', ') + ') — bấm Cập nhật mới nhất.', true);
    var miss = [];
    if (Object.keys(h.refs).length) {
      msg('Đang lấy asset dùng chung từ kho…');
      try { miss = await resolveRefs(h); } catch (e) { miss = Object.keys(h.refs); }
      if (miss.length) {   // thử kho-chung.3js cạnh studio (chạy được khi qua http hoặc công cụ tự động); không được thì nhờ người dùng kéo vào
        try { await importKho(parse(await fetchBuf(Q.get('kho') || 'kho-chung.3js')), 'kho-chung.3js'); miss = await resolveRefs(h); } catch (e) {}
      }
      if (miss.length) {
        pending = { buf: buf, name: name };
        var b = miss.reduce(function (s, p) { return s + h.refs[p][2]; }, 0);
        return msg('Tập ' + h.ep + ' cần ' + miss.length + ' file dùng chung (' + mb(b) + ') chưa có trong máy — kéo dist/kho-chung.3js vào đây (chỉ 1 lần), tập sẽ tự mở.', true);
      }
    }
    open(h);
  }
  function open(h) {
    PACK = h; PACK.keys = Object.keys(h.files).concat(Object.keys(h.refs));
    window.__embedURL = lookup; window.__pack = { ep: h.ep, title: h.title, built: h.built, core: META.version };
    var _fetch = window.fetch.bind(window);
    window.fetch = function (input, init) { var u = typeof input === 'string' ? input : input.url; var b = lookup(u); return _fetch(b || input, init); };
    window.__studioRun = async function () {
      try {
        await import(URL.createObjectURL(new Blob([CORE], { type: 'text/javascript' })));
        await import(lookup(h.js));
      } catch (e) { console.error(e); document.documentElement.setAttribute('data-xload', 'Lỗi mở tập: ' + (e && e.message || e)); }
    };
    var COVER = (navigator.webdriver && !Q.has('ui')) ? '' :
      '<script>(function(){var d=document.documentElement;d.setAttribute("data-xload","Đang mở trình phát…");var s=document.createElement("style");s.id="xpre";s.textContent="html,body{background:#0d0f14!important}body>*{visibility:hidden!important}html::after{content:attr(data-xload);position:fixed;inset:0;display:flex;align-items:center;justify-content:center;color:#8b93a7;font:15px system-ui,sans-serif;z-index:2147483647}";d.appendChild(s);setTimeout(function(){s.remove()},90000)})()<\/script>';
    var page = h.page.replace(/__PACK__:([^"]+)/g, function (m, k) { return lookup(k) || k; })
      .replace('<!--__EP_MODULE__-->', '<script type="module">window.__studioRun()<\/script>')
      .replace(/<head>/i, function (x) { return x + COVER; });
    document.open(); document.write(page); document.close();
  }
  async function readFiles(list) {   // nhiều file một lần: kho trước, tập sau
    var fs = Array.prototype.slice.call(list).sort(function (a, b) { return (b.name.indexOf('kho') === 0) - (a.name.indexOf('kho') === 0); });
    for (var i = 0; i < fs.length; i++) {
      msg('Đang đọc ' + fs[i].name + '…');
      try { await handle(await fs[i].arrayBuffer(), fs[i].name); } catch (e) { msg(fs[i].name + ': ' + e.message, true); }
    }
  }
  window.__studioOpen = handle;
  var q = Q.get('goi');
  if (q) { msg('Đang tải ' + q + '…'); fetchBuf(q).then(function (b) { return handle(b, q); }, function (e) { msg('Không tải được ' + q + ': ' + e.message + ' — chọn file bằng nút Mở tập.', true); }); }
  document.getElementById('sfile').addEventListener('change', function (e) { readFiles(e.target.files); });
  document.getElementById('sxoa').addEventListener('click', function () {
    if (!confirm('Xoá kho asset dùng chung khỏi máy? Lần mở tập sau phải kéo lại dist/kho-chung.3js.')) return;
    idb().then(function (d) { var t = d.transaction(['blob', 'path'], 'readwrite'); t.objectStore('blob').clear(); t.objectStore('path').clear(); t.oncomplete = function () { msg('Đã xoá kho chung.'); khoStatus(); }; });
  });
  addEventListener('dragover', function (e) { e.preventDefault(); document.body.classList.add('drag'); });
  addEventListener('dragleave', function () { document.body.classList.remove('drag'); });
  addEventListener('drop', function (e) { e.preventDefault(); document.body.classList.remove('drag'); readFiles(e.dataTransfer.files); });
  document.getElementById('sver').textContent = 'Studio ' + META.version;
  khoStatus();
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
  #spick button { background: #1d2430; color: #e8ecf2; border: 1px solid #2a3342; border-radius: 6px; padding: 2px 8px; cursor: pointer; }
  #smsg { min-height: 1.5em; } #smsg.bad { color: #f2647a; }
</style>
<script>${esc(gsap)}</script>
<script type="application/json" id="coremeta">${JSON.stringify(meta)}</script>
<script type="text/plain" id="core">${esc(core)}</script>
</head><body>
<div id="spick">
  <h1>3JS <span>Studio</span></h1>
  <div class="box">
    <p><label class="btn">Mở tập…<input id="sfile" type="file" accept=".3js" multiple /></label></p>
    <p class="muted">hoặc kéo thả file <b>.3js</b> vào đây: gói tập (dist/ep003.3js…) và — lần đầu — kho chung (dist/kho-chung.3js)</p>
    <p id="smsg"></p>
  </div>
  <div class="muted"><span id="skho"></span> <button id="sxoa" style="display:none">Xoá kho</button></div>
  <div class="muted" id="sver"></div>
</div>
<script>${esc(LOADER)}</script>
</body></html>`;
await mkdir(dirname(out), { recursive: true });
await writeFile(out, html);
console.log(`studio ${version}: lõi ${(core.length / 1024).toFixed(0)} KB, ${keys.length} module → ${relative(root, out).replace(/\\/g, '/')} (${(Buffer.byteLength(html) / 1048576).toFixed(2)} MB)`);
console.log(`  mở: ${pathToFileURL(out).href}`);
