// kiem-gop-y-3d.mjs — kiểm GÓP Ý TRONG KHUNG 3D (engine/che-do-3d-sua.js): sửa vật + ghim → dữ liệu góp ý; tắt 3D thì Phim như cũ.
//   node tools/kiem-gop-y-3d.mjs [episodes/ep003/index.html] [--t 40] [--out output/che-do-3d/gop-y]
// Đạt khi: bấm chuột ở chế độ ✥ Sửa vật chọn được vật · kéo (giả lập sự kiện tay kéo) ghi số trước/sau · vật giữ chỗ khi tua t ·
//   bấm ở chế độ 📍 Ghim mở ô mô tả → Lưu → có ghim + ảnh · ghiChu3d() đủ trường · tắt 3D → vật về chỗ cũ, khung Phim giống hệt.
import { createServer } from 'http';
import { readFile, mkdir, writeFile } from 'fs/promises';
import { join, resolve, relative, extname } from 'path';
import { launchBrowser } from './browser.mjs';

const args = process.argv.slice(2), opt = {}, pos = [];
for (let i = 0; i < args.length; i++) { if (args[i].startsWith('--')) opt[args[i].slice(2)] = args[++i]; else pos.push(args[i]); }
const pagePath = (pos[0] || 'episodes/ep003/index.html').replace(/\\/g, '/');
const T = +(opt.t || 40), out = opt.out || 'output/che-do-3d/gop-y';
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
await page.evaluate(async (T) => { const c = window.__che3d; c.bat(); const p = window.renderAt(T); if (p?.then) await p; c.goc('shot'); await new Promise((r) => setTimeout(r, 500)); }, T);
ok(await page.evaluate(() => !!window.__che3d.sua), 'module sửa/ghim đã gắn');

// (1) ✥ Sửa vật: bấm giữa khung → chọn được vật
await page.click('.c3s-mode button[data-m=sua]');
await page.mouse.click(800, 520);
let s1 = await page.evaluate(() => { const s = window.__che3d.sua.sel; return s ? { name: s.name, info: document.querySelector('.c3s-col .ten')?.textContent } : null; });
if (!s1) {   // trượt (bầu trời / chỗ trống) → chọn vật đầu tiên của bối cảnh đang hiện
  s1 = await page.evaluate(() => { const env = window.__stage.scene.children.find((o) => o.name.startsWith('env_') && o.visible); const m = env && env.children.find((c) => { let n = 0; c.traverse((x) => { if (x.isMesh) n++; }); return n; });
    if (m) window.__che3d.sua.chon(m); const s = window.__che3d.sua.sel; return s ? { name: s.name, info: document.querySelector('.c3s-info.on .ten')?.textContent, gia: true } : null; });
}
ok(!!s1, `chọn vật: ${s1 ? s1.name + (s1.gia ? ' (bấm trượt — chọn qua API)' : ' (bằng cú bấm)') : 'không chọn được'}`);
ok(s1 && !/^env_|_room$/.test(s1.name), 'cú bấm chọn MỘT asset, không chọn cả bối cảnh/phòng');
// cột sửa vật bên phải + danh sách asset
const bc = await page.evaluate(() => { const col = document.querySelector('.c3s-col'), w = document.querySelector('.c3d-wrap'); const A = window.__che3d.sua.assets();
  return { col: !!col && col.getBoundingClientRect().width > 100, hep: w.classList.contains('c3s-hep'), wr: Math.round(w.getBoundingClientRect().right), cl: col ? Math.round(col.getBoundingClientRect().left) : 0, n: A.length, guong: A.findIndex((a) => a.ten === 'phong_guong'), lop: [...new Set(A.map((a) => a.lop))] }; });
ok(bc.col && bc.hep && bc.wr <= bc.cl, `cột Sửa vật bên phải khung 3D (khung tới ${bc.wr}px, cột từ ${bc.cl}px)`);
ok(bc.n > 5 && bc.guong >= 0, `danh sách asset: ${bc.n} asset, lớp ${bc.lop.join(' / ')}, có phong_guong: ${bc.guong >= 0}`);
// chọn cái GƯƠNG bằng cú bấm: nhìn tới gương, bấm vào giữa mặt kính
if (bc.guong >= 0) {
  const xy = await page.evaluate((i) => { const S = window.__che3d.sua, g = S.assetObj(i); S.nhin(g); S.chon(null);
    const k = g.getObjectByName('phong_guong_kinh') || g, b = new window.THREE.Box3().setFromObject(k), c = b.getCenter(new window.THREE.Vector3()).project(window.__che3d.camera);
    const r = document.querySelector('.c3d-wrap').getBoundingClientRect(); return [r.left + (c.x + 1) / 2 * r.width, r.top + (1 - c.y) / 2 * r.height]; }, bc.guong);
  await page.mouse.click(xy[0], xy[1]);
  const g1 = await page.evaluate(() => window.__che3d.sua.sel?.name);
  ok(g1 === 'phong_guong', `bấm vào gương → chọn ${g1}`);
  await page.mouse.click(xy[0], xy[1]);
  const g2 = await page.evaluate(() => ({ s: window.__che3d.sua.sel?.name, a: window.__che3d.sua.selAsset?.name }));
  ok(g2.a === 'phong_guong' && g2.s !== 'phong_guong', `bấm lại → bộ phận "${g2.s || '(không tên)'}" của ${g2.a}`);
  await page.screenshot({ path: join(out, '1b_guong.png') });
  await page.evaluate(() => window.__che3d.sua.chon(null));
  await page.mouse.click(800, 520);
  await page.evaluate(() => { const S = window.__che3d.sua; if (!S.sel) S.chon(S.assetObj(0)); });
}
await page.screenshot({ path: join(out, '1_chon.png') });

// (2) "kéo" tay kéo: mouseDown → dời +3 x, xoay 30° → objectChange → mouseUp
const keo = await page.evaluate(() => {
  const S = window.__che3d.sua, o = S.sel, tc = S.tc; if (!o) return null; window.__vat = o;
  const p0 = o.position.toArray();
  tc.dispatchEvent({ type: 'mouseDown' }); o.position.x += 3; o.rotation.y += Math.PI / 6; o.updateMatrixWorld(true);
  tc.dispatchEvent({ type: 'objectChange' }); tc.dispatchEvent({ type: 'mouseUp' });
  return { p0, p1: o.position.toArray(), n: S.edits.size };
});
ok(keo && keo.n === 1 && Math.abs(keo.p1[0] - keo.p0[0] - 3) < 1e-6, 'kéo vật ghi vào danh sách sửa');
// vật giữ chỗ thử khi tua sang t khác rồi quay lại
const giu = await page.evaluate(async (T) => {
  const o = window.__che3d.sua.sel, r = async (t) => { const p = window.renderAt(t); if (p?.then) await p; };
  await r(T + 0.7); await r(T); return o.position.toArray();
}, T);
ok(keo && Math.abs(giu[0] - keo.p1[0]) < 1e-6, 'tua t: vật vẫn ở chỗ đã dời');
await page.fill('.c3s-col textarea', 'Dời sát tường bên phải'); await page.click('.c3s-col button[data-a=luu]');

// (3) 📍 Ghim: bấm → ô mô tả → Lưu
await page.click('.c3s-mode button[data-m=ghim]');
await page.mouse.click(700, 600);
const coO = await page.$('.c3s-pin textarea');
ok(!!coO, 'bấm ở chế độ Ghim mở ô mô tả');
if (coO) { await coO.fill('Thiếu cửa sổ ở đây'); await page.click('.c3s-pin button[data-p=luu]'); }
await page.waitForTimeout(200);
await page.screenshot({ path: join(out, '2_ghim.png') });

// (4) dữ liệu góp ý
const d = await page.evaluate(() => window.__che3d.ghiChu3d());
await writeFile(join(out, 'ghiChu3d.json'), JSON.stringify({ ...d, ghim: d.ghim.map((g) => ({ ...g, img: g.img.slice(0, 40) + '…' })), vat: d.vat.map((v) => ({ ...v, img: v.img.slice(0, 40) + '…' })) }, null, 1));
const g = d.ghim[0], v = d.vat[0];
ok(g && g.text === 'Thiếu cửa sổ ở đây' && g.pos.length === 3 && g.shotId && /^data:image\/jpeg/.test(g.img), `ghim: ${g ? `📍${g.so} shot ${g.shotId} (${g.pos.join(', ')}) ảnh ${Math.round(g.img.length / 1024)} KB` : 'không có'}`);
ok(v && v.text === 'Dời sát tường bên phải' && Math.abs(v.lech.pos[0] - 3) < 1e-3 && Math.abs(v.lech.rotDeg[1] - 30) < 0.2 && /^data:image\/jpeg/.test(v.img), `vật: ${v ? `${v.path} dời ${v.lech.pos.join(', ')} xoay ${v.lech.rotDeg.join(', ')}` : 'không có'}`);
const nhan = await page.evaluate(() => [...document.querySelectorAll('.c3d-lab div.gh')].filter((x) => x.style.display !== 'none').length);
ok(nhan >= 1, `nhãn ghim hiện trên khung (${nhan})`);

// (5) tắt 3D → vật về chỗ cũ, Phim giống hệt; bật lại → vật lại ở chỗ thử
await page.evaluate(() => window.__che3d.tat());
const ve = await page.evaluate(() => window.__vat?.position.toArray());
ok(keo && Math.abs(ve[0] - keo.p0[0]) < 1e-6, 'tắt 3D: vật về chỗ cũ');
await page.setViewportSize({ width: 1080, height: 1920 });
const m = await px(T);
ok(m <= 2, `tắt 3D: khung Phim ${m === 0 ? 'giống hệt' : 'lệch ' + m + ' mức'}`);
await page.setViewportSize({ width: 1600, height: 900 });
const lai = await page.evaluate(async (T) => { window.__che3d.bat(); const p = window.renderAt(T); if (p?.then) await p; return window.__vat?.position.toArray(); }, T);
ok(keo && Math.abs(lai[0] - keo.p1[0]) < 1e-6, 'bật lại 3D: vật lại ở chỗ thử');
// (6) tải lại trang: ghim + vật còn (localStorage)
await page.evaluate(() => window.__che3d.tat());
await page.reload(); await page.waitForFunction(() => window.__ready === true && !!window.__che3d, null, { timeout: 300000 });
const conLai = await page.evaluate(async () => { window.__che3d.bat(); await new Promise((r) => setTimeout(r, 300)); const d = window.__che3d.ghiChu3d(); return [d.ghim.length, d.vat.length]; });
ok(conLai[0] === 1 && conLai[1] === 1, `tải lại trang vẫn còn ${conLai[0]} ghim, ${conLai[1]} vật`);
await page.evaluate(() => { window.__che3d.sua.xoaHet(); window.__che3d.tat(); });
ok(!errs.length, 'không lỗi trang' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
await browser.close(); srv.close();
console.log(loi.length ? `\nLỖI ${loi.length}` : '\nĐẠT tất cả'); process.exit(loi.length ? 1 : 0);
