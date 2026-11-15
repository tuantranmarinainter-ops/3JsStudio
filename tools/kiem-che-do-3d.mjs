// kiem-che-do-3d.mjs — kiểm CHẾ ĐỘ 3D (engine/che-do-3d.js) trên trang dev một tập.
//   node tools/kiem-che-do-3d.mjs [episodes/ep003/index.html] [--t 5,40,90] [--out output/che-do-3d]
// Kiểm: (1) bật 3D rồi tắt → khung Phim GIỐNG HỆT từng pixel; (2) ở 3D rê t thì camera shot + đường đi đổi theo;
// (3) WASD/QE di chuyển camera tự do; (4) có nhãn, chóp. Ghi ảnh 3D (khung rộng 1600×900) vào --out để agent phụ xem.
import { createServer } from 'http';
import { readFile, mkdir, writeFile } from 'fs/promises';
import { join, resolve, relative, extname } from 'path';
import { createHash } from 'crypto';
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
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 0.5 });
page.on('pageerror', (e) => console.log('  pageerror:', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.log('  console:', m.text().slice(0, 200)); });
const t0 = Date.now();
await page.goto(url);
await page.waitForFunction(() => window.__ready === true, null, { timeout: 300000 });
console.log(`mở trang ${((Date.now() - t0) / 1000).toFixed(1)} s`);

// đọc điểm ảnh canvas tại t; lần đầu lưu làm chuẩn (window.__px0[t]), lần sau so: lệch lớn nhất + số điểm lệch > 16
const hashAt = (t) => page.evaluate(async (t) => {
  const p = window.renderAt(t); if (p && p.then) await p;
  const c = document.getElementById('stage'), g = c.getContext('webgl2') || c.getContext('webgl');
  const px = new Uint8Array(c.width * c.height * 4); g.readPixels(0, 0, c.width, c.height, g.RGBA, g.UNSIGNED_BYTE, px);
  const S = (window.__px0 ||= {});
  if (!S[t]) { S[t] = px; return { w: c.width, h: c.height, max: 0, n: 0 }; }
  let max = 0, n = 0; const a = S[t];
  if (a.length !== px.length) return { w: c.width, h: c.height, max: 255, n: -1 };
  for (let i = 0; i < px.length; i++) { const d = Math.abs(a[i] - px[i]); if (d > max) max = d; if (d > 16) n++; }
  return { w: c.width, h: c.height, max, n };
}, t);

const loi = [];
// (1) Phim trước
for (const t of TS) await hashAt(t);
// bật 3D trong khung rộng
await page.setViewportSize({ width: 1600, height: 900 });
const st = [];
for (const [i, t] of TS.entries()) {
  const info = await page.evaluate(async (t) => {
    const c = window.__che3d; if (!c.on) c.bat();
    const p = window.renderAt(t); if (p && p.then) await p;
    await new Promise((r) => setTimeout(r, 400));   // chờ lấy mẫu đường đi (setTimeout 0 + 17 lần renderAt)
    const lab = [...document.querySelectorAll('.c3d-lab div')].filter((d) => d.style.display !== 'none').map((d) => d.textContent);
    return { sc: c.shotCam, nPath: c.paths.get(c.shotCam.id)?.length || 0, lab: lab.slice(0, 12), nLab: lab.length,
      cv: [document.getElementById('stage').width, document.getElementById('stage').height] };
  }, t);
  st.push(info);
  await page.screenshot({ path: join(out, `3d_t${t}.png`) });
  console.log(`3D t=${t}: shot ${info.sc.id} · đường đi ${info.nPath} điểm · ${info.nLab} nhãn · canvas ${info.cv.join('×')}`);
  if (!info.nPath) loi.push(`t=${t}: chưa có đường đi camera`);
}
if (new Set(st.map((s) => s.sc.id)).size < Math.min(2, TS.length)) loi.push('rê t mà shot không đổi');
// 🔒 Giữ góc (mặc định bật): qua ranh giới shot (tua + phát từng khung) camera bay đứng yên tuyệt đối
const giu = await page.evaluate(async () => {
  const c = window.__che3d, tl = window.__shots, sh = tl.list[Math.floor(tl.list.length / 2)];
  const r = async (t) => { const p = window.renderAt(t); if (p && p.then) await p; };
  await r(sh.t0 - 0.5); c.goc('truoc'); await new Promise((x) => setTimeout(x, 400));
  const cam = c.camera, P = () => [...cam.position.toArray(), ...cam.quaternion.toArray(), cam.fov];
  const a = P(), ids = [];
  for (let t = sh.t0 - 0.2; t < sh.t0 + 0.2; t += 1 / 30) { await r(t); ids.push(c.shotCam.id); }   // "phát" qua ranh giới
  await r(sh.t1 + 0.3); ids.push(c.shotCam.id);                                                   // tua sang shot sau nữa
  await new Promise((x) => setTimeout(x, 400));                                                   // chờ lấy mẫu đường đi xong
  const b = P();
  c.setGiuGoc(false); await r(sh.t0 - 0.5); const q0 = P(); await r(sh.t1 + 0.3); const q1 = P(); c.setGiuGoc(true);
  return { keep: c.giuGoc, nShot: new Set(ids).size, max: Math.max(...a.map((v, i) => Math.abs(v - b[i]))), moveOff: Math.max(...q0.map((v, i) => Math.abs(v - q1[i]))) };
});
console.log(`Giữ góc: qua ${giu.nShot} shot, camera bay lệch ${giu.max.toExponential(1)} (tắt Giữ góc thì đổi ${giu.moveOff.toFixed(2)}) · mặc định ${giu.keep ? 'bật' : 'TẮT'}`);
if (!(giu.max < 1e-6) || giu.nShot < 2) loi.push(`Giữ góc: camera bay đổi khi qua shot (lệch ${giu.max})`);
if (!(giu.moveOff > 1e-3)) loi.push('tắt Giữ góc mà camera không bay tới shot mới');
// góc nhìn nhanh + WASD
for (const g of ['tren', 'shot']) { await page.evaluate((g) => window.__che3d.goc(g), g); await page.screenshot({ path: join(out, `3d_goc-${g}.png`) }); }
const p0 = await page.evaluate(() => window.__che3d.camera.position.toArray());
await page.mouse.move(800, 450);
await page.keyboard.down('KeyW'); await page.waitForTimeout(500); await page.keyboard.up('KeyW');
await page.keyboard.down('KeyE'); await page.waitForTimeout(300); await page.keyboard.up('KeyE');
const p1 = await page.evaluate(() => window.__che3d.camera.position.toArray());
const moved = Math.hypot(p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]);
console.log(`WASD/E: camera đi ${moved.toFixed(2)} stud (lên ${(p1[1] - p0[1]).toFixed(2)})`);
if (moved < 1 || p1[1] - p0[1] < 0.5) loi.push('WASD/E không di chuyển camera');
// giữ chuột phải kéo = nhìn quanh
const q0 = await page.evaluate(() => window.__che3d.camera.quaternion.toArray());
await page.mouse.down({ button: 'right' }); await page.mouse.move(900, 470, { steps: 6 }); await page.mouse.up({ button: 'right' });
const q1 = await page.evaluate(() => window.__che3d.camera.quaternion.toArray());
if (q0.every((v, i) => Math.abs(v - q1[i]) < 1e-6)) loi.push('giữ chuột phải kéo mà camera không xoay');
await page.screenshot({ path: join(out, '3d_sau-bay.png') });

// (2) tắt 3D → khung Phim giống hệt
await page.evaluate(async () => { const p = window.__che3d.tat(); if (p && p.then) await p; });
await page.setViewportSize({ width: 1080, height: 1920 });
for (const t of TS) {
  const h = await hashAt(t);
  const ok = h.max <= 2 && h.n === 0 && h.w === 1080 && h.h === 1920;   // ≤ 2 mức = nhiễu GPU (look --det cũng thấy maxdiff 1)
  console.log(`Phim t=${t}: ${h.max === 0 ? 'GIỐNG HỆT' : ok ? `lệch ${h.max} mức (nhiễu GPU)` : `LỆCH max ${h.max}, ${h.n} điểm > 16`} (${h.w}×${h.h})`);
  if (!ok) loi.push(`Phim t=${t} lệch sau khi tắt 3D`);
}
const stagePng = await page.evaluate(() => document.getElementById('stage').toDataURL('image/png'));
await writeFile(join(out, `phim_sau-3d_t${TS[TS.length - 1]}.png`), Buffer.from(stagePng.split(',')[1], 'base64'));
await writeFile(join(out, 'kiem.json'), JSON.stringify({ page: pagePath, ts: TS, st, moved, loi }, null, 1));
await browser.close(); srv.close();
console.log(loi.length ? 'LỖI:\n- ' + loi.join('\n- ') : 'ĐẠT: bật/tắt 3D giữ nguyên khung Phim; 3D theo t, có đường đi, WASD/chuột phải chạy.');
process.exit(loi.length ? 1 : 0);
