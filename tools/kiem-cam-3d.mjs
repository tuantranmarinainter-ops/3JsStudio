// kiem-cam-3d.mjs — kiểm 🎥 SỬA CAMERA trong khung 3D (engine/che-do-3d-cam.js).
//   node tools/kiem-cam-3d.mjs [episodes/ep003/index.html] [--t 40] [--out output/che-do-3d/cam]
import { createServer } from 'http';
import { readFile, mkdir, writeFile } from 'fs/promises';
import { join, resolve, relative, extname } from 'path';
import { launchBrowser } from './browser.mjs';

const args = process.argv.slice(2), opt = {}, pos = [];
for (let i = 0; i < args.length; i++) { if (args[i].startsWith('--')) opt[args[i].slice(2)] = args[++i]; else pos.push(args[i]); }
const pagePath = (pos[0] || 'episodes/ep003/index.html').replace(/\\/g, '/');
const T = +(opt.t || 40), out = opt.out || 'output/che-do-3d/cam';
await mkdir(out, { recursive: true });
const root = process.cwd();
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.ttf': 'font/ttf', '.webp': 'image/webp', '.wasm': 'application/wasm' };
const srv = createServer(async (req, res) => {
  try { const p = resolve(join(root, decodeURIComponent(req.url.split('?')[0]))); if (relative(root, p).startsWith('..')) throw 0;
    const b = await readFile(p); res.writeHead(200, { 'content-type': TYPES[extname(p).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-store' }); res.end(b); }
  catch { res.writeHead(404); res.end(); }
}).listen(0);
await new Promise((r) => srv.once('listening', r));
const browser = await launchBrowser();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 0.5 });
const errs = []; page.on('pageerror', (e) => errs.push(e.message));
await page.goto(`http://localhost:${srv.address().port}/${pagePath}`);
await page.waitForFunction(() => window.__ready === true && !!window.__che3d, null, { timeout: 300000 });
await page.evaluate(() => localStorage.clear());
const loi = [], ok = (c, m) => { console.log(`${c ? 'ĐẠT' : 'LỖI'}  ${m}`); if (!c) loi.push(m); };

const px = (t, save) => page.evaluate(async ({ t, save }) => {
  const p = window.renderAt(t); if (p && p.then) await p;
  const c = document.getElementById('stage'), g = c.getContext('webgl2') || c.getContext('webgl');
  const a = new Uint8Array(c.width * c.height * 4); g.readPixels(0, 0, c.width, c.height, g.RGBA, g.UNSIGNED_BYTE, a);
  if (save) { window.__px0 = a; return 0; }
  let max = 0; for (let i = 0; i < a.length; i++) { const d = Math.abs(a[i] - window.__px0[i]); if (d > max) max = d; } return max;
}, { t, save });
await px(T, true);

// Đạt khi: 🎥 Camera mở cột + đọc camera gốc · Zoom vào đè camera Phim đúng điểm đầu/cuối · win (thu ngắn) dừng sớm ·
//   dòng `cam:` dán vào shot cho ra CÙNG camera (engine hiểu win) · bỏ "Dùng camera đã sửa" = gốc · Ctrl+Z/Y · 📷 Điểm đầu = góc đang xem ·
//   góp ý có mục cam · tắt 3D → Phim giống hệt · tải lại vẫn còn · không lỗi trang.
await page.setViewportSize({ width: 1600, height: 900 });
await page.evaluate(async (T) => { const c = window.__che3d; c.bat(); const p = window.renderAt(T); if (p?.then) await p; await new Promise((r) => setTimeout(r, 400)); }, T);
const SH = await page.evaluate((T) => { const s = window.__shots.at(T).shot; return { id: s.id, t0: s.t0, dur: s.dur }; }, T);
const camAt = (t) => page.evaluate(async (t) => { const p = window.renderAt(t); if (p?.then) await p; const c = window.__stage.camera; return [...c.position.toArray(), c.fov]; }, t);
const gan = (a, b, e = 1e-3) => a && b && a.every((v, i) => Math.abs(v - b[i]) < e);
const tA = SH.t0 + 0.02, tB = SH.t0 + SH.dur - 0.02, tM = SH.t0 + SH.dur * 0.6;
const goc0 = { A: await camAt(tA), B: await camAt(tB), M: await camAt(tM) };

await page.click('.c3s-mode button[data-m=cam]');
await page.waitForFunction(() => !!window.__che3d.cam?.goc, null, { timeout: 60000 });
const c1 = await page.evaluate(() => { const col = document.querySelector('.c3c-col'), w = document.querySelector('.c3d-wrap'); return { col: !!col && col.getBoundingClientRect().width > 100, wr: Math.round(w.getBoundingClientRect().right), cl: col ? Math.round(col.getBoundingClientRect().left) : 0, id: window.__che3d.cam.id, moc: window.__che3d.cam.mocHien }; });
ok(c1.col && c1.wr <= c1.cl && c1.id === SH.id, `🎥 Camera: cột bên phải khung 3D (khung tới ${c1.wr}px, cột từ ${c1.cl}px), shot ${c1.id}`);
ok(c1.moc, 'mốc điểm đầu / cuối hiện trong khung 3D');
const g = await page.evaluate(() => window.__che3d.cam.goc);
ok(gan(g.p, goc0.A.slice(0, 3), 0.05), `camera gốc đọc đúng điểm đầu shot (${g.p.join(', ')})`);

// Zoom vào
await page.click('.c3c-col button[data-k=vao]'); await page.waitForTimeout(200);
const moi = await page.evaluate((id) => window.__che3d.cam.ed.get(id)?.moi, SH.id);
const zA = await camAt(tA), zB = await camAt(tB);
ok(moi && gan(zB.slice(0, 3), moi.p2, 0.02) && !gan(zB.slice(0, 3), goc0.B.slice(0, 3), 0.1), `Zoom vào: cuối shot camera tới p2 (${zB.slice(0, 3).map((v) => v.toFixed(2)).join(', ')})`);
ok(gan(zA.slice(0, 3), moi.p, 0.02), 'đầu shot camera ở điểm đầu');
const dIn = Math.hypot(...moi.p2.map((v, i) => v - moi.l2[i])) < Math.hypot(...moi.p.map((v, i) => v - moi.l[i]));
ok(dIn, 'zoom vào = camera tiến gần điểm nhìn');
// thu ngắn: chạy 0 → 50% → ở 60% đã tới đích
await page.click('.c3c-col button[data-w="0,0.5"]'); await page.waitForTimeout(150);
const wM = await camAt(tM);
ok(gan(wM.slice(0, 3), moi.p2, 0.02), 'thu ngắn (Nửa đầu): ở 60% shot camera đã dừng ở điểm cuối');
// dòng cam: dán vào shot → engine ra cùng camera
const eng = await page.evaluate(async ({ id, tM }) => {
  const C = window.__che3d.cam, e = C.ed.get(id), sh = window.__shots.list.find((s) => s.id === id), cu = sh.cam;
  const dong = C.dongCam(e.moi), spec = Function('return {' + dong + '}')().cam;
  C.setDung(false); sh.cam = spec; let p = window.renderAt(tM); if (p?.then) await p; const a = window.__stage.camera.position.toArray();
  sh.cam = cu; C.setDung(true); p = window.renderAt(tM); if (p?.then) await p; const b = window.__stage.camera.position.toArray();
  return { a, b, dong };
}, { id: SH.id, tM });
ok(gan(eng.a, eng.b, 0.01), `dòng góp ý dán vào shots.js ra cùng camera: ${eng.dong.slice(0, 70)}…`);
// tắt "Dùng camera đã sửa" → gốc
await page.evaluate(() => window.__che3d.cam.setDung(false));
ok(gan(await camAt(tM), goc0.M, 1e-4), 'bỏ "Dùng camera đã sửa": camera gốc');
await page.evaluate(() => window.__che3d.cam.setDung(true));
// Ctrl+Z / Ctrl+Y
await page.evaluate(() => document.activeElement?.blur?.());
await page.keyboard.press('Control+z'); await page.keyboard.press('Control+z');
const zz = await page.evaluate((id) => window.__che3d.cam.ed.has(id), SH.id);
await page.keyboard.press('Control+y'); await page.keyboard.press('Control+y');
const yy = await page.evaluate((id) => JSON.stringify(window.__che3d.cam.ed.get(id)?.moi.win), SH.id);
ok(!zz && yy === '[0,0.5]', `Ctrl+Z ×2 bỏ hết sửa, Ctrl+Y ×2 làm lại (win ${yy})`);
// 📷 Điểm đầu = góc đang xem
const dA = await page.evaluate((id) => { const C = window.__che3d.cam, f = window.__che3d.camera; window.__che3d.setBam(false); f.position.set(3, 7, 21); f.lookAt(0, 3, 0); C.datA(); return { p: C.ed.get(id).moi.p, f: f.position.toArray() }; }, SH.id);
ok(gan(dA.p, dA.f, 1e-2), `📷 Điểm đầu = góc đang xem (${dA.p.join(', ')})`);
const gy = await page.evaluate(() => window.__che3d.ghiChu3d());
ok(gy?.cam?.length === 1 && /^cam: \{ p: \[/.test(gy.cam[0].dong) && gy.cam[0].shotId === SH.id, 'góp ý có mục cam + dòng dán shots.js');
await page.screenshot({ path: `${out}/1_cot-camera.png` });
await page.click('#c3d-ss, .c3d-bar button[data-g=ss], button[data-o=ss]').catch(() => {});
// tắt 3D → Phim giống hệt
await page.evaluate(() => window.__che3d.tat());
await page.setViewportSize({ width: 1080, height: 1920 });
const m = await px(T);
ok(m <= 2, `tắt 3D: khung Phim ${m === 0 ? 'giống hệt' : 'lệch ' + m + ' mức'}`);
// tải lại: còn
await page.reload(); await page.waitForFunction(() => window.__ready === true && !!window.__che3d, null, { timeout: 300000 });
const con = await page.evaluate(async () => { window.__che3d.bat(); await new Promise((r) => setTimeout(r, 300)); return window.__che3d.ghiChu3d()?.cam?.length; });
ok(con === 1, `tải lại trang vẫn còn ${con} camera đã sửa`);
await page.evaluate(() => { window.__che3d.cam.xoaHet(); window.__che3d.tat(); });
ok(!errs.length, 'không lỗi trang' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
await browser.close(); srv.close();
console.log(loi.length ? `\nLỖI ${loi.length}` : '\nĐẠT tất cả'); process.exit(loi.length ? 1 : 0);
