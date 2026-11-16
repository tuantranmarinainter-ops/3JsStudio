// Đóng GÓI TẬP (chỉ dữ liệu, không engine) để mở bằng dist/studio.html — kế hoạch docs/handoff/tach-studio.md (GĐ1).
//   node tools/goi-tap.mjs ep003                 → dist/ep003.3js
//   node tools/goi-tap.mjs ep003 --out x.3js
//   node tools/goi-tap.mjs ep003 --tu-chua       → nhét cả asset dùng chung vào gói (gửi cho máy chưa có kho chung)
// Gói = "3JS1" + u32 độ dài header + header JSON + dữ liệu nhị phân nối liền (không base64, không nén lại).
//   header = { v:2, kind:'tap', ep, title, built, coreMin, mods:[khoá module engine cần], page:<HTML tập đã bỏ script>,
//              js:'/__ep.js', files: { '/đường/dẫn': [kiểu, vị trí, độ dài] },
//              refs: { '/assets/…': [kiểu, sha256, độ dài] } }   ← asset DÙNG CHUNG: studio lấy từ kho chung (IndexedDB)
// Riêng của tập = file trong episodes/<ep>/ + mã tập; còn lại (assets/, vendor/…) là dùng chung → tools/kho-chung.mjs.
// Mã tập (episode.js, shots.js… + khối module của index.html) gộp bằng esbuild, nhưng MỌI import vào engine/ và vendor/
// được thay bằng globalThis.__mods['<khoá>'] — studio cung cấp (tools/bundle-studio.mjs).
import { createServer } from 'http';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync, readFileSync } from 'fs';
import { createHash } from 'crypto';
import { extname, join, resolve, dirname, relative, isAbsolute } from 'path';
import { pathToFileURL, fileURLToPath } from 'url';
import { build } from 'esbuild';
import { launchBrowser } from './browser.mjs';

const args = process.argv.slice(2);
const ep = args.find((a) => !a.startsWith('--'));
if (!ep) { console.error('Dùng: node tools/goi-tap.mjs <ep> [--out dist/<ep>.3js]'); process.exit(1); }
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const epDir = join(root, 'episodes', ep);
const out = resolve(root, opt('out', `dist/STUDIO RIENG/${ep}.3js`));
const srcHtml = await readFile(join(epDir, 'index.html'), 'utf8');
export const CORE_MIN = '2026.11.15';

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json', '.bin': 'application/octet-stream', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg',
  '.ktx2': 'image/ktx2', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf' };
const typeOf = (p) => TYPES[extname(p).toLowerCase()] || 'application/octet-stream';

// ---- 1. Ghi lại file trang tải lúc init (như tools/bundle.mjs bước 1) ----
const loaded = new Map();
const missing = new Set();
const srv = createServer(async (req, res) => {
  const path = decodeURIComponent(req.url.split('?')[0]);
  try { const buf = await readFile(join(root, path)); loaded.set(path, buf); res.writeHead(200, { 'content-type': typeOf(path) }); res.end(buf); }
  catch { missing.add(path); res.writeHead(404); res.end(); }
}).listen(0);
const browser = await launchBrowser();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
page.on('pageerror', (e) => console.log('  pageerror:', e.message));
console.log(`[1/3] mở episodes/${ep}/index.html để ghi asset…`);
await page.goto(`http://localhost:${srv.address().port}/episodes/${ep}/index.html`);
await page.waitForFunction(() => window.__ready === true, null, { timeout: 180000 });
await browser.close(); srv.close();
if (missing.size) console.log(`      (bỏ qua ${missing.size} file không có — engine tự dùng bản dự phòng)`);

const files = new Map();   // '/path' -> Buffer
for (const [p, buf] of loaded) if (p !== `/episodes/${ep}/index.html` && !/\.(m?js)$/.test(p)) files.set(p, buf);
const addFile = (p) => { if (!files.has(p) && existsSync(join(root, p))) files.set(p, readFileSync(join(root, p))); };
const vIndex = join(epDir, 'voices', 'index.json');   // giọng đọc nhiều giọng: chỉ tải khi người xem chọn
if (existsSync(vIndex)) for (const v of JSON.parse(readFileSync(vIndex, 'utf8')))
  for (const p of [v.audio, v.caps, v.audio && v.audio.replace(/\.(ogg|mp3)$/, '.levels.json')].filter(Boolean)) addFile(p);
addFile(`/episodes/${ep}/ghi-cong.png`);
// ảnh cây PNG của vòng bao 'cay-png' (engine/vong-bao.js): chỉ tải khi người xem chọn trong ô Vòng bao → luôn đưa vào (thành tham chiếu kho chung)
for (const m of readFileSync(join(root, 'engine', 'vong-bao.js'), 'utf8').matchAll(/'(\/assets\/nhap\/vong-bao-png\/[\w-]+\.png)'/g)) addFile(m[1]);

// ---- 2. Gộp mã tập, engine/vendor thành tham chiếu tới studio ----
const mods = [...srcHtml.matchAll(/<script type="module">([\s\S]*?)<\/script>/g)];
if (mods.length !== 1) throw new Error(`cần đúng 1 <script type="module"> trong index.html, thấy ${mods.length}`);
const importmap = JSON.parse((srcHtml.match(/<script type="importmap">([\s\S]*?)<\/script>/) || [, '{"imports":{}}'])[1]).imports;
// import động theo mẫu chuỗi (`../../engine/envs/${n}.js`) → studio tra bảng module
const code = mods[0][1].replace(/import\(\s*`(?:\.\.\/)+engine\/([^`]*)`\s*\)/g, (m, p) => `globalThis.__modImport(\`/engine/${p}\`)`);
const need = new Set();
const res = await build({
  stdin: { contents: code, resolveDir: epDir, loader: 'js', sourcefile: `${ep}/index.html` },
  bundle: true, format: 'esm', target: 'es2022', minify: true, write: false, legalComments: 'none', logLevel: 'warning',
  define: { 'import.meta.url': JSON.stringify('file:///studio/engine/envs/_.js') },   // lõi chạy từ blob: (không làm gốc URL được); lớp chặn fetch khớp theo đuôi đường dẫn
  plugins: [{
    name: 'studio-mods',
    setup(b) {
      b.onResolve({ filter: /.*/ }, (a) => {
        if (a.namespace === 'studio') return null;
        let p = a.path;
        for (const [k, v] of Object.entries(importmap)) if (k.endsWith('/') ? p.startsWith(k) : p === k) { p = v + p.slice(k.length); break; }
        const abs = p.startsWith('/') ? join(root, p) : isAbsolute(p) ? p : resolve(a.resolveDir, p);
        const rel = relative(root, abs).replace(/\\/g, '/');
        if (/^(engine|vendor)\//.test(rel)) { const key = '/' + rel; need.add(key); return { path: key, namespace: 'studio' }; }
        if (p.startsWith('/')) return { path: abs };
        return null;
      });
      b.onLoad({ filter: /.*/, namespace: 'studio' }, (a) => ({
        contents: `const m = globalThis.__mods[${JSON.stringify(a.path)}]; if (!m) throw new Error('Studio thiếu module ${a.path} — bấm Cập nhật mới nhất'); module.exports = m;`,
        loader: 'js' }));
    },
  }],
});
const js = res.outputFiles[0].text;
files.set('/__ep.js', Buffer.from(js));
console.log(`[2/3] mã tập: ${(js.length / 1024).toFixed(0)} KB, cần ${need.size} module studio`);

// ---- 3. Trang tập (DOM + CSS, không script) ----
let html = srcHtml;
html = html.replace(/<script src="[^"]*gsap[^"]*"><\/script>\s*/g, '');                 // gsap có sẵn trong studio
html = html.replace(/<script type="importmap">[\s\S]*?<\/script>\s*/, '');
html = html.replace(/<script type="module">[\s\S]*?<\/script>/, '<!--__EP_MODULE__-->');
html = html.replace(/url\((['"]?)([^'")]+\.(?:ttf|otf|woff2?))\1\)/gi, (m, q, src) => {   // phông CSS không qua lớp chặn fetch → data URI
  const p = src.startsWith('/') ? join(root, src) : join(epDir, src);
  return `url('data:${typeOf(p)};base64,${readFileSync(p).toString('base64')}')`;
});
html = html.replace(/(<audio\b[^>]*\ssrc=")([^"]+)(")/g, (m, a, src, c) => {               // <audio src> → file trong gói
  if (src.startsWith('data:')) return m;
  const key = src.startsWith('/') ? src : `/episodes/${ep}/${src}`; addFile(key);
  return `${a}__PACK__:${key}${c}`;
});

// ---- ghi gói ----
const tuChua = args.includes('--tu-chua');
const entries = {}; const refs = {}; const bufs = []; let off = 0, refBytes = 0;
for (const [p, buf] of files) {
  if (!tuChua && p !== '/__ep.js' && !p.startsWith(`/episodes/${ep}/`)) {   // dùng chung → chỉ ghi tham chiếu
    refs[p] = [typeOf(p), createHash('sha256').update(buf).digest('hex'), buf.length]; refBytes += buf.length; continue;
  }
  entries[p] = [typeOf(p), off, buf.length]; bufs.push(buf); off += buf.length;
}
const title = (srcHtml.match(/<title>([^<]*)<\/title>/) || [, ep])[1];
const header = Buffer.from(JSON.stringify({ v: 2, kind: 'tap', ep, title, built: new Date().toISOString(), coreMin: CORE_MIN, mods: [...need].sort(),
  page: html, js: '/__ep.js', files: entries, refs }));
if (!tuChua) console.log(`      dùng chung (lấy từ kho chung): ${Object.keys(refs).length} file, ${(refBytes / 1048576).toFixed(1)} MB → node tools/kho-chung.mjs`);
const len = Buffer.alloc(4); len.writeUInt32LE(header.length);
await mkdir(dirname(out), { recursive: true });
await writeFile(out, Buffer.concat([Buffer.from('3JS1'), len, header, ...bufs]));
const rel = (p) => relative(root, p).replace(/\\/g, '/');
console.log(`[3/3] ghi ${rel(out)} — ${files.size} file, ${((off + header.length) / 1048576).toFixed(1)} MB`);
console.log(`      mở: file:///${resolve(root, 'dist/STUDIO RIENG/studio.html').replace(/\\/g, '/').replace(/ /g, '%20')}?goi=${encodeURIComponent(out.split(/[\\/]/).pop())}`);
