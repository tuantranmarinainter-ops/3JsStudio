// Gom một tập phim thành MỘT file HTML tự chứa (JS engine + three + gsap + GLB + texture + giọng đọc nhúng base64).
//   node tools/bundle.mjs ep001            → dist/ep001.html
//   node tools/bundle.mjs ep001 --out x.html
// Cách làm:
//   1. Mở episodes/<ep>/index.html qua server tĩnh tại gốc repo bằng Chrome/Edge có sẵn (playwright-core),
//      ghi lại MỌI file trang tải trong lúc init (manifest, GLB, texture…) cho tới khi window.__ready.
//   2. esbuild gộp <script type="module"> của tập (cùng engine/, vendor/three) thành 1 module.
//      Module "embed" chạy trước: biến các file đã ghi thành blob URL, chặn fetch() và gắn URL modifier
//      cho THREE.DefaultLoadingManager → GLTFLoader/TextureLoader đọc từ file nhúng, không cần mạng/server.
//   3. Ghi HTML: gsap inline, bỏ importmap, <audio src> thành data URI.
// File ra mở trực tiếp được (file://) bằng Chrome/Edge: có nút ▶ Xem và ⬇ Xuất MP4 (2K/1080p/4K) render ngay trên máy
// người xem (WebCodecs). Vẫn render được bằng tools/render-local.mjs (khi bị điều khiển tự động, giao diện tự tắt).
import { createServer } from 'http';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync, readFileSync } from 'fs';
import { extname, join, resolve, dirname } from 'path';
import { pathToFileURL, fileURLToPath } from 'url';
import { build } from 'esbuild';
import { launchBrowser } from './browser.mjs';

const args = process.argv.slice(2);
const ep = args.find((a) => !a.startsWith('--'));
if (!ep) { console.error('Dùng: node tools/bundle.mjs <ep> [--out dist/<ep>.html]'); process.exit(1); }
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const epDir = join(root, 'episodes', ep);
const out = resolve(root, opt('out', `dist/${ep}.html`));
const srcHtml = await readFile(join(epDir, 'index.html'), 'utf8');

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json', '.bin': 'application/octet-stream', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg',
  '.ktx2': 'image/ktx2', '.woff2': 'font/woff2', '.ttf': 'font/ttf' };

// ---- 1. Ghi lại file tải lúc init ----
const loaded = new Map(); // '/assets/..' -> {type, buf}
const srv = createServer(async (req, res) => {
  const path = decodeURIComponent(req.url.split('?')[0]);
  try {
    const buf = await readFile(join(root, path));
    const type = TYPES[extname(path).toLowerCase()] || 'application/octet-stream';
    loaded.set(path, { type, buf });
    res.writeHead(200, { 'content-type': type }); res.end(buf);
  } catch { missing.add(path); res.writeHead(404); res.end(); }
}).listen(0);
const missing = new Set();
const port = srv.address().port;
const browser = await launchBrowser();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
page.on('pageerror', (e) => console.log('  pageerror:', e.message));
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('404')) console.log('  console:', m.text()); });
console.log(`[1/3] mở episodes/${ep}/index.html để ghi asset…`);
await page.goto(`http://localhost:${port}/episodes/${ep}/index.html`);
await page.waitForFunction(() => window.__ready === true, null, { timeout: 180000 });
await browser.close(); srv.close();
if (missing.size) console.log(`      (bỏ qua ${missing.size} file không có trong repo — engine tự dùng bản dự phòng: ${[...missing].slice(0, 6).join(', ')}${missing.size > 6 ? ', …' : ''})`);

// Không nhúng: chính trang, mã JS (đã gộp bằng esbuild), gsap (inline riêng), audio (data URI riêng).
const embed = {};
let embedBytes = 0;
for (const [p, { type, buf }] of loaded) {
  if (p === `/episodes/${ep}/index.html` || /\.(m?js)$/.test(p) || p.endsWith('.mp3') || p.endsWith('.wav')) continue;
  embed[p] = [type, buf.toString('base64')];
  embedBytes += buf.length;
}
// Giọng đọc nhiều giọng (voices/index.json): file audio chỉ tải khi người xem chọn → không có trong lúc init, nhúng thêm
const vIndex = join(epDir, 'voices', 'index.json');
if (existsSync(vIndex)) {
  let n = 0;
  for (const v of JSON.parse(readFileSync(vIndex, 'utf8'))) {
    for (const p of [v.audio, v.caps].filter(Boolean)) {
      if (embed[p]) continue;
      const buf = readFileSync(join(root, p));
      embed[p] = [TYPES[extname(p).toLowerCase()] || (p.endsWith('.ogg') ? 'audio/ogg' : 'application/octet-stream'), buf.toString('base64')];
      embedBytes += buf.length; n++;
    }
  }
  console.log(`      + giọng đọc: ${n} file từ voices/index.json`);
}
console.log(`      ${Object.keys(embed).length} file nhúng, ${(embedBytes / 1048576).toFixed(1)} MB`);

// ---- 2. Gộp JS ----
const mods = [...srcHtml.matchAll(/<script type="module">([\s\S]*?)<\/script>/g)];
if (mods.length !== 1) throw new Error(`cần đúng 1 <script type="module"> trong index.html, thấy ${mods.length}`);
const importmap = JSON.parse((srcHtml.match(/<script type="importmap">([\s\S]*?)<\/script>/) || [, '{"imports":{}}'])[1]).imports;
const EMBED_SHIM = `
import * as THREE from 'three';
const E = window.__EMBED || {}; const urls = new Map(); const keys = Object.keys(E);
const norm = (u) => { try { u = decodeURI(String(u)); } catch {} return u.replace(/^[a-z]+:\\/\\/[^/]*/i, '').split('?')[0]; };
function lookup(u) {
  let k = norm(u); if (!(k in E)) { const s = keys.find((x) => k.endsWith(x)); if (!s) return null; k = s; }
  if (!urls.has(k)) { const [type, b64] = E[k]; const bin = atob(b64); const a = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); urls.set(k, URL.createObjectURL(new Blob([a], { type }))); }
  return urls.get(k);
}
window.__embedURL = lookup; // trang tập dùng để gắn file giọng đọc nhúng vào <audio>
THREE.DefaultLoadingManager.setURLModifier((u) => (String(u).startsWith('blob:') || String(u).startsWith('data:')) ? u : (lookup(u) || u));
const _fetch = window.fetch.bind(window);
window.fetch = (input, init) => { const u = typeof input === 'string' ? input : input.url; const b = lookup(u); return _fetch(b || input, init); };
`;
const res = await build({
  stdin: { contents: `import '@embed';\n${mods[0][1]}`, resolveDir: epDir, loader: 'js', sourcefile: 'index.html' },
  bundle: true, format: 'esm', target: 'es2022', minify: true, write: false, legalComments: 'none', logLevel: 'warning',
  plugins: [{
    name: 'paths',
    setup(b) {
      b.onResolve({ filter: /^@embed$/ }, () => ({ path: 'embed', namespace: 'embed' }));
      b.onLoad({ filter: /.*/, namespace: 'embed' }, () => ({ contents: EMBED_SHIM, resolveDir: root, loader: 'js' }));
      b.onResolve({ filter: /.*/ }, (a) => {
        let p = a.path;
        for (const [k, v] of Object.entries(importmap)) {
          if (k.endsWith('/') ? p.startsWith(k) : p === k) { p = v + p.slice(k.length); break; }
        }
        if (p.startsWith('/')) return { path: join(root, p) };
        return null;
      });
    },
  }],
});
const js = res.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
// Trình phát + nút "Xuất MP4" (WebCodecs, chạy trong trình duyệt người xem) — bỏ bằng --no-export
const noUi = args.includes('--no-export');
const uiJs = noUi ? '' : (await build({ entryPoints: [join(root, 'tools', 'export-ui.js')], bundle: true, format: 'esm', target: 'es2022',
  minify: true, write: false, legalComments: 'none', logLevel: 'warning' })).outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
console.log(`[2/3] JS gộp: ${(js.length / 1024).toFixed(0)} KB${noUi ? '' : ` + nút xuất MP4 ${(uiJs.length / 1024).toFixed(0)} KB`}`);

// ---- 3. Ghi HTML ----
let html = srcHtml;
html = html.replace(/<script src="([^"]+)"><\/script>/g, (m, src) => {
  const p = src.startsWith('/') ? join(root, src) : join(epDir, src);
  return `<script>${require_text(p).replace(/<\/script/gi, '<\\/script')}</script>`;
});
html = html.replace(/<script type="importmap">[\s\S]*?<\/script>\s*/, '');
// phông trong CSS (@font-face url(...)) → data URI (CSS không đi qua lớp chặn fetch)
html = html.replace(/url\((['"]?)([^'")]+\.(?:ttf|otf|woff2?))\1\)/gi, (m, q, src) => {
  const p = src.startsWith('/') ? join(root, src) : join(epDir, src);
  const ext = extname(p).toLowerCase().slice(1);
  const type = { ttf: 'font/ttf', otf: 'font/otf', woff: 'font/woff', woff2: 'font/woff2' }[ext];
  return `url('data:${type};base64,${readFileSync(p).toString('base64')}')`;
});
html = await replaceAsync(html, /(<audio\b[^>]*\ssrc=")([^"]+)(")/g, async (m, a, src, c) => {
  if (src.startsWith('data:')) return m;
  const p = src.startsWith('/') ? join(root, src) : join(epDir, src);
  const buf = await readFile(p);
  return `${a}data:${TYPES[extname(p).toLowerCase()] || 'audio/mpeg'};base64,${buf.toString('base64')}${c}`;
});
const embedTag = `<script>window.__EMBED=${JSON.stringify(embed)};</script>`;
html = html.replace(/<script type="module">[\s\S]*?<\/script>/, () => `${embedTag}\n<script type="module">${js}</script>${uiJs ? `\n<script type="module">${uiJs}</script>` : ''}`);
html = html.replace(/<!doctype html>/i, (d) => `${d}\n<!-- Bản gộp 1 file từ episodes/${ep}/ bởi tools/bundle.mjs (${new Date().toISOString()}). Render: node tools/render-local.mjs ${pathRel(out)} -->`);
await mkdir(dirname(out), { recursive: true });
await writeFile(out, html);
console.log(`[3/3] ghi ${pathRel(out)} (${(Buffer.byteLength(html) / 1048576).toFixed(1)} MB)`);
console.log(`      mở thử: ${pathToFileURL(out).href}`);

function require_text(p) { if (!existsSync(p)) throw new Error('thiếu ' + p); return readFileSync(p, 'utf8'); }
async function replaceAsync(s, re, fn) { const parts = []; let last = 0; for (const m of s.matchAll(re)) { parts.push(s.slice(last, m.index), await fn(...m)); last = m.index + m[0].length; } parts.push(s.slice(last)); return parts.join(''); }
function pathRel(p) { return p.startsWith(root) ? p.slice(root.length + 1).replace(/\\/g, '/') : p; }
