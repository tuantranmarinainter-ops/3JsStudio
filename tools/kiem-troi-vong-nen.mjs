// kiem-troi-vong-nen.mjs — kiểm TRỜI bám camera bay + 3 ô Trời / Vòng bao / Nền của chế độ 3D (thường + song song).
//   node tools/kiem-troi-vong-nen.mjs [episodes/ep003/index.html] [--t 3.5] [--out output/troi-vong-nen]
// Đạt khi: camera bay đi xa vẫn thấy trời (hàng trên khung 3D không phải màu nền) · đổi ô → khung đổi · song song: Phim đổi theo.
// Ảnh lưu vào --out để agent phụ xem; in số liệu thay vì đưa ảnh vào phiên.
import { createServer } from 'http';
import { readFile, mkdir, writeFile } from 'fs/promises';
import { join, resolve, relative, extname } from 'path';
import { launchBrowser } from './browser.mjs';

const args = process.argv.slice(2), opt = {}, pos = [];
for (let i = 0; i < args.length; i++) { if (args[i].startsWith('--')) opt[args[i].slice(2)] = args[++i]; else pos.push(args[i]); }
const pagePath = (pos[0] || 'episodes/ep003/index.html').replace(/\\/g, '/');
const TS = (opt.t || '5,40,90').split(',').map(Number);
const out = opt.out || 'output/che-do-3d';
await mkdir(out, { recursive: true });

const root = process.cwd();
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.ttf': 'font/ttf', '.webp': 'image/webp', '.ktx2': 'application/octet-stream', '.wasm': 'application/wasm' };
const srv = createServer(async (req, res) => {
  try {
    const p = resolve(join(root, decodeURIComponent(req.url.split('?')[0])));
    if (relative(root, p).startsWith('..')) throw 0;
    const b = await readFile(p);
    res.writeHead(200, { 'content-type': TYPES[extname(p).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-store' }); res.end(b);
  } catch { res.writeHead(404); res.end(); }
}).listen(0);
await new Promise((r) => srv.once('listening', r));
const url = `http://localhost:${srv.address().port}/${pagePath}`;


const browser = await launchBrowser();
const page = await browser.newPage({ viewport: { width: 1700, height: 900 } });
page.on('pageerror', (e) => console.log('  pageerror:', e.message));
await page.goto(url);
await page.waitForFunction(() => window.__ready === true && !!window.__che3d, null, { timeout: 300000 });
const T = +(opt.t || 3.5);
import('fs/promises').then(() => {});
const shot = async (file) => {   // song song: chép thẳng canvas khung 3D (bố cục trang dev không có ô riêng); thường: chụp trang
  const d = await page.evaluate(() => { const c = document.querySelector('.c3d-ssview'); return c ? c.toDataURL('image/png') : null; });
  if (d) await writeFile(file, Buffer.from(d.split(',')[1], 'base64')); else await page.screenshot({ path: file });
};
const loi = [];
const sel = async (k, v) => { await page.evaluate(({ k, v }) => { const s = document.querySelector(`.c3d-bar select[data-o=${k}]`); s.value = v; s.dispatchEvent(new Event('change', { bubbles: true })); }, { k, v }); await page.waitForTimeout(2600); };
// đo hàng trên (30%) của ô 3D: độ xanh trung bình (b − r) và sáng trung bình
const topStat = () => page.evaluate(() => {
  const cv = document.querySelector('.c3d-ssview') || document.getElementById('stage'), W = cv.width, H = cv.height;
  let g; const t = document.createElement('canvas'); t.width = W; t.height = H; g = t.getContext('2d'); g.drawImage(cv, 0, 0);
  const d = g.getImageData(0, 0, W, Math.floor(H * 0.3)).data; let r = 0, b = 0, l = 0, n = 0;
  for (let i = 0; i < d.length; i += 4) { r += d[i]; b += d[i + 2]; l += (d[i] + d[i + 1] + d[i + 2]) / 3; n++; }
  return { xanh: +((b - r) / n).toFixed(1), sang: +(l / n).toFixed(1) };
});
for (const ss of [false, true]) {
  const nm = ss ? 'ss' : 'thuong';
  await page.evaluate(async ({ T, ss }) => {
    const c = window.__che3d; if (c.on) { const p = c.tat(); if (p?.then) await p; }
    let host = document.getElementById('kiem-host');
    if (ss && !host) { host = document.createElement('div'); host.id = 'kiem-host'; host.style.cssText = 'position:fixed;right:0;top:0;width:900px;height:900px;display:flex;z-index:99999;background:#000'; document.body.appendChild(host); }
    c.bat(ss ? host : undefined, ss ? { songSong: true } : {});
    const p = window.renderAt(T); if (p?.then) await p;
  }, { T, ss });
  await page.waitForTimeout(1200);
  // camera bay ra xa (trước đây trời ở lại chỗ camera phim → mất trời)
  await page.evaluate(() => { const c = window.__che3d, f = c.camera; f.position.set(300, 90, -300); f.lookAt(0, 20, 0); f.updateProjectionMatrix(); window.__che3d.goc && 0; window.renderAt(window.__stage ? 3.5 : 3.5); });
  await page.waitForTimeout(800);
  const a = await topStat(); console.log(`[${nm}] camera bay xa: hàng trên xanh=${a.xanh} sáng=${a.sang}`);
  await shot(join(out, `${nm}_1_troi.png`));
  if (a.xanh < 8) loi.push(`${nm}: hàng trên không thấy trời (xanh=${a.xanh})`);
  await sel('vb', 'rung-thong'); await sel('nen', 'co');
  const s1 = await page.evaluate(() => ({ cur: window.__vien.cur, ov: window.__vien.override }));
  console.log(`[${nm}] sau chọn:`, JSON.stringify(s1)); if (s1.cur.vongBao !== 'rung-thong' || s1.cur.nen !== 'co') loi.push(`${nm}: ô Vòng bao/Nền không áp`);
  await shot(join(out, `${nm}_2_vong_nen.png`));
  await sel('troi', 'sky-6');
  const s2 = await page.evaluate(() => window.__vien.cur.troi); console.log(`[${nm}] trời đang dùng: ${s2}`); if (s2 !== 'sky-6') loi.push(`${nm}: ô Trời không áp`);
  await shot(join(out, `${nm}_3_sky6.png`));
  const sh = await page.evaluate(() => document.querySelector('.c3d-bar select[data-o=troi]').options[0].textContent); console.log(`[${nm}] nhãn dòng đầu ô Trời: ${sh}`);
  // tắt hết → về như cũ
  await sel('troi', 'tat'); await sel('vb', 'tat'); await sel('nen', 'tat');
  await shot(join(out, `${nm}_4_tat.png`));
  await sel('troi', ''); await sel('vb', ''); await sel('nen', '');
  if (ss) { await page.evaluate(() => { document.querySelector('[data-k=ghi]').click(); }); const g = await page.evaluate(() => document.querySelector('.c3d-ghi textarea')?.value); console.log(`[${nm}] ghi vào tập: ${JSON.stringify(g)}`); }
}
if (opt.presets) {   // mỗi preset 1 ảnh (camera tự do ở giữa nhìn ra chân trời) → output/<out>/preset_*.png
  await page.evaluate(() => { const f = window.__che3d.camera; f.position.set(0, 14, 40); f.lookAt(60, 24, -140); f.updateProjectionMatrix(); });
  for (const v of ['rung-thong', 'cay-tron', 'doi-xa', 'nui-xa', 'dai-anh']) { await sel('vb', v); await sel('nen', 'co'); await shot(join(out, `preset_vb_${v}.png`));
    const inf = await page.evaluate(() => { const g = window.__stage.scene.getObjectByName('vien'); const r = []; g?.traverse((o) => { if (o.isMesh && o.visible && o.parent.visible !== false) { o.geometry.computeBoundingBox(); const b = o.geometry.boundingBox; r.push(`${o.name}[y ${b.min.y.toFixed(0)}..${b.max.y.toFixed(0)}, x ${b.min.x.toFixed(0)}..${b.max.x.toFixed(0)}]`); } }); const f = window.__che3d.camera; return { r, cam: f.position.toArray().map((x) => +x.toFixed(1)), fog: window.__stage.scene.fog && [window.__stage.scene.fog.near, window.__stage.scene.fog.far] }; });
    console.log(v, JSON.stringify(inf)); }
  await sel('vb', 'tat');
  for (const v of ['co', 'dat', 'cat', 'da']) { await sel('nen', v); await shot(join(out, `preset_nen_${v}.png`)); }
}
await browser.close(); srv.close();
if (loi.length) { console.log('LỖI:\n - ' + loi.join('\n - ')); process.exit(1); } else console.log('ĐẠT');
