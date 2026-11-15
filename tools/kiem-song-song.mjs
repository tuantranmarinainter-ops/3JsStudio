// Kiểm chế độ SONG SONG Phim | 3D (engine/che-do-3d.js + nút ◧ Song song của tools/export-ui.js) bằng số, trong studio:
//   node tools/kiem-song-song.mjs [ep004] [--t 10] [--anh]      (--anh: lưu ảnh khung trình phát vào output/tach-studio/song-song.png)
// Đạt khi: khung Phim trong song song GIỐNG khung Phim thường (cùng t) · khung 3D có hình · đổi góc 3D không đổi khung Phim ·
// rê thời gian thì cả hai đổi · tắt song song → khung Phim như trước khi bật.
import { launchBrowser } from './browser.mjs';
import { pathToFileURL } from 'url';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const args = process.argv.slice(2);
const ep = args.find((a) => !a.startsWith('--') && !/^\d/.test(a)) || 'ep004';
const T = +(args[args.indexOf('--t') + 1] || 10) || 10;
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const b = await launchBrowser(); const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto(`${pathToFileURL(resolve(root, 'dist/STUDIO RIENG/studio.html')).href}?goi=${ep}.3js&ui=1`);
await p.waitForFunction(() => window.__ready === true && window.__che3d && document.getElementById('xmss'), null, { timeout: 240000 });
const r = await p.evaluate(async (T) => {
  const st = window.__stage, cv = st.renderer.domElement, W = cv.width, H = cv.height;
  const grab = (src) => { const c = document.createElement('canvas'); c.width = src.width; c.height = src.height; c.getContext('2d').drawImage(src, 0, 0); return c.getContext('2d').getImageData(0, 0, c.width, c.height).data; };
  const phim = async (t) => {   // khung Phim chuẩn: chép canvas ngay sau lần vẽ (cùng tác vụ)
    let img = null; const o = st.draw; st.draw = (x) => { o(x); img = grab(cv); };
    await window.renderAt(t); st.draw = o; return img;
  };
  const diff = (a, b) => { if (!a || !b || a.length !== b.length) return 999; let s = 0; for (let i = 0; i < a.length; i += 4) s += Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]); return s / (a.length / 4) / 3; };
  const std = (a) => { let m = 0, n = a.length / 4; for (let i = 0; i < a.length; i += 4) m += a[i]; m /= n; let v = 0; for (let i = 0; i < a.length; i += 4) v += (a[i] - m) ** 2; return Math.sqrt(v / n); };
  const ref = await phim(T);
  document.getElementById('xmss').click();
  await new Promise((r) => setTimeout(r, 800));
  await window.renderAt(T);
  const film = document.querySelector('canvas.c3d-film'), view = document.querySelector('canvas.c3d-ssview');
  const out = { songSong: window.__che3d.songSong, coFilm: !!film, coView: !!view, view: view && [view.width, view.height], W, H };
  if (!film || !view) return out;
  out.filmVsPhim = diff(grab(film), ref);
  const v1 = grab(view); out.viewStd = std(v1);
  const f1 = grab(film);
  window.__che3d.goc('tren'); await new Promise((r) => setTimeout(r, 300));
  out.viewDoiGoc = diff(grab(view), v1); out.filmDoiGoc = diff(grab(film), f1);
  await window.renderAt(T + 3);
  out.filmRe = diff(grab(film), f1);
  const xv = document.getElementById('xview').getBoundingClientRect(), xw = document.getElementById('xwrap').getBoundingClientRect(), c3 = document.querySelector('.c3d-wrap').getBoundingClientRect();
  out.bocuc = { phimTrai: xw.right <= c3.left + 1, rong3d: Math.round(c3.width), rongPhim: Math.round(xw.width), trongKhung: c3.right <= xv.right + 1 };
  await window.renderAt(T);
  out.filmVe = diff(grab(film), ref);
  const tp = window.__che3d.tat(); if (tp && tp.then) await tp;
  out.sauTat = diff(await phim(T), ref);
  out.conCanvasPhu = !!document.querySelector('canvas.c3d-film');
  return out;
}, T);
if (args.includes('--anh')) {
  await p.evaluate(() => document.getElementById('xmss').click()); await p.waitForTimeout(1500);
  await p.screenshot({ path: resolve(root, 'output/tach-studio/song-song.png') });
}
await b.close();
const kq = [];
const ok = (t, d) => { kq.push(`${d ? 'ĐẠT' : 'LỖI'}  ${t}`); if (!d) process.exitCode = 1; };
ok(`bật song song (khung 3D ${r.view})`, r.songSong && r.coFilm && r.coView);
ok(`khung Phim trong song song = Phim thường (lệch ${r.filmVsPhim?.toFixed(2)} mức/255)`, r.filmVsPhim < 1);
ok(`khung 3D có hình (độ tương phản ${r.viewStd?.toFixed(1)})`, r.viewStd > 5);
ok(`đổi góc 3D: 3D đổi (${r.viewDoiGoc?.toFixed(1)}), Phim giữ nguyên (${r.filmDoiGoc?.toFixed(2)})`, r.viewDoiGoc > 1 && r.filmDoiGoc < 0.01);
ok(`rê thời gian: Phim đổi (${r.filmRe?.toFixed(1)}), quay lại t cũ khớp (${r.filmVe?.toFixed(2)})`, r.filmRe > 1 && r.filmVe < 1);
ok(`bố cục: Phim trái ${r.bocuc?.rongPhim}px | 3D phải ${r.bocuc?.rong3d}px`, r.bocuc?.phimTrai && r.bocuc?.trongKhung && r.bocuc?.rong3d > r.bocuc?.rongPhim);
ok(`tắt → Phim như trước (lệch ${r.sauTat?.toFixed(2)}), dọn canvas phụ`, r.sauTat < 1 && !r.conCanvasPhu);
ok('không có lỗi trang', !errs.length);
console.log(kq.join('\n')); if (errs.length) console.log('lỗi trang:\n  ' + errs.slice(0, 5).join('\n  '));
