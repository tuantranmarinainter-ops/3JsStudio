// kiem-sua-them.mjs — kiểm phần thêm của ✥ Sửa vật: nhân vật trong thẻ Asset, vật có animation (sửa = lệch thêm, vẫn chạy theo shot), ô số gõ được, 📋 Copy điều chỉnh.
//   node tools/kiem-sua-them.mjs [episodes/ep003/index.html] [--t 40] [--out output/che-do-3d/cam]
import { createServer } from 'http';
import { readFile, mkdir, writeFile } from 'fs/promises';
import { join, resolve, relative, extname } from 'path';
import { launchBrowser } from './browser.mjs';

const args = process.argv.slice(2), opt = {}, pos = [];
for (let i = 0; i < args.length; i++) { if (args[i].startsWith('--')) opt[args[i].slice(2)] = args[++i]; else pos.push(args[i]); }
const pagePath = (pos[0] || 'episodes/ep003/index.html').replace(/\\/g, '/');
const T = +(opt.t || 40), out = opt.out || 'output/che-do-3d/sua-them';
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
await page.setViewportSize({ width: 1600, height: 900 });
let T2 = T + 1.5;
await page.evaluate(async (T) => { const c = window.__che3d; c.bat(); const p = window.renderAt(T); if (p?.then) await p; await new Promise((r) => setTimeout(r, 400)); }, T);
await page.click('.c3s-mode button[data-m=sua]');
// nhân vật trong thẻ Asset; ghi tư thế director ở T, T2 khi CHƯA sửa
const nv = await page.evaluate(async ({ T, T2: t2 }) => { let T2 = t2;
  const S = window.__che3d.sua, L = S.assets(), ds = L.filter((a) => a.lop === 'Nhân vật');
  const i = L.findIndex((a) => a.lop === 'Nhân vật'); if (i < 0) return { n: 0 };
  const o = S.assetObj(i); window.__nv = o; const P = {};
  { const p = window.renderAt(T); if (p?.then) await p; } const p0 = o.position.clone();
  for (let t = T + 0.5; t < T + 40; t += 0.5) { const p = window.renderAt(t); if (p?.then) await p; if (o.visible && o.position.distanceTo(p0) > 0.8) { T2 = t; break; } }
  for (const t of [T, T2]) { const p = window.renderAt(t); if (p?.then) await p; P[t] = o.position.toArray(); }
  const p = window.renderAt(T); if (p?.then) await p; S.chon(o);
  return { T2, n: ds.length, ten: L[i].ten, P, sel: S.sel?.name, dich: Math.hypot(...P[T].map((v, k) => v - P[T2][k])) };
}, { T, T2 });
T2 = nv.T2 ?? T2;
ok(nv.n > 0 && nv.sel, `thẻ Asset có nhóm "Nhân vật" (${nv.n}) và chọn được ${nv.ten} (đi ${nv.dich?.toFixed(2)} stud từ ${T}s → ${T2}s)`);
// gõ ô số: vị trí x += 2 (qua ô nhập, như người dùng)
const x0 = await page.evaluate(() => +document.querySelector('.c3s-col .o-so tr[data-r=p] input').value);
await page.fill('.c3s-col .o-so tr[data-r=p] input', String(+(x0 + 2).toFixed(3))); await page.keyboard.press('Enter');
await page.waitForTimeout(150);
const s1 = await page.evaluate(() => { const o = window.__che3d.sua.sel; return o.position.toArray(); });
ok(Math.abs(s1[0] - (x0 + 2)) < 1e-3, `ô Vị trí x gõ được: ${x0} → ${s1[0].toFixed(3)}`);
// gõ ô thế giới y
const wy = await page.evaluate(() => +document.querySelectorAll('.c3s-col .o-so tr[data-r=w] input')[1].value);
await page.fill('.c3s-col .o-so tr[data-r=w] input >> nth=1', String(+(wy + 0.5).toFixed(3))); await page.keyboard.press('Enter'); await page.waitForTimeout(150);
const w1 = await page.evaluate(() => { const v = new window.THREE.Vector3(); window.__che3d.sua.sel.getWorldPosition(v); return v.y; });
ok(Math.abs(w1 - (wy + 0.5)) < 1e-3, `ô Thế giới y gõ được: ${wy} → ${w1.toFixed(3)}`);
// vật có animation: ở T2 (shot khác / khung khác) nhân vật = tư thế director + phần lệch (2, 0.5, 0) — không đứng yên chỗ cũ
const q = await page.evaluate(async ({ T, T2, ten }) => {
  const r = window.__nv, at = async (t) => { const p = window.renderAt(t); if (p?.then) await p; return r.position.toArray(); };
  return { a: await at(T), b: await at(T2) };
}, { T, T2, ten: nv.ten });
const lech = (x, P) => x.map((v, i) => +(v - P[i]).toFixed(3));
const dA = lech(q.a, nv.P[T]), dB = lech(q.b, nv.P[T2]);
ok(Math.abs(dB[0] - dA[0]) < 1e-3 && Math.abs(dB[1] - dA[1]) < 1e-3 && Math.abs(dB[2] - dA[2]) < 1e-3 && Math.abs(dA[0] - 2) < 0.05,
  `nhân vật vẫn chạy theo shot: lệch ở ${T}s (${dA}) = lệch ở ${T2}s (${dB})`);
// Ctrl+Z hai lần → về đúng tư thế director
await page.evaluate(() => document.activeElement?.blur?.());
await page.keyboard.press('Control+z'); await page.keyboard.press('Control+z');
const z = await page.evaluate(async ({ T2, ten }) => { const p = window.renderAt(T2); if (p?.then) await p; return window.__nv.position.toArray(); }, { T2, ten: nv.ten });
ok(lech(z, nv.P[T2]).every((v) => Math.abs(v) < 1e-3), 'Ctrl+Z ×2: nhân vật về đúng chuyển động gốc');
await page.keyboard.press('Control+y'); await page.keyboard.press('Control+y');
// 📋 Copy điều chỉnh
await page.click('.c3s-col button[data-a=chep]'); await page.waitForTimeout(200);
const txt = await page.evaluate(() => window.__che3d.vanBan3d());
const nut = await page.evaluate(() => document.querySelector('.c3s-col button[data-a=chep]').textContent);
ok(/✥ SỬA/.test(txt) && txt.includes(nv.ten) && /có animation/.test(txt), `📋 Copy điều chỉnh: chữ có mục SỬA ${nv.ten} + "có animation" (nút: ${nut})`);
await page.screenshot({ path: `${out}/1_cot-so.png` });
// tắt 3D → Phim giống hệt
await page.evaluate(() => window.__che3d.tat());
await page.setViewportSize({ width: 1080, height: 1920 });
const m = await px(T);
ok(m <= 2, `tắt 3D: khung Phim ${m === 0 ? 'giống hệt' : 'lệch ' + m + ' mức'}`);
await page.evaluate(() => { window.__che3d.bat(); window.__che3d.sua.xoaHet(); window.__che3d.tat(); });
ok(!errs.length, 'không lỗi trang' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
await browser.close(); srv.close();
console.log(loi.length ? `\nLỖI ${loi.length}` : '\nĐẠT tất cả'); process.exit(loi.length ? 1 : 0);
