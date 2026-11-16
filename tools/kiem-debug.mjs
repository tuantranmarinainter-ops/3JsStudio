// Kiểm chế độ 🐞 Debug của trình phát (tools/export-ui.js + mốc trong tools/studio-loader.js, engine/prewarm.js), trong studio:
//   node tools/kiem-debug.mjs [ep003] [--in]      (--in: in khối chữ mà nút 📋 Chép sẽ chép)
// Đạt khi: có mốc mở tập (đọc gói, nạp engine, dựng sân khấu, vẽ khung đầu, module tập, trình phát) · bật Debug → có bảng + đo khung Phim và
// Song song · khung Phim khi bật Debug GIỐNG khi tắt · tắt Debug → renderAt trả về hàm gốc, bảng ẩn · không lỗi trang.
import { launchBrowser } from './browser.mjs';
import { pathToFileURL } from 'url';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const args = process.argv.slice(2);
const ep = args.find((a) => !a.startsWith('--')) || 'ep003';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const b = await launchBrowser(); const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto(`${pathToFileURL(resolve(root, 'dist/STUDIO RIENG/studio.html')).href}?goi=${ep}.3js&ui=1`);
await p.waitForFunction(() => window.__ready === true && window.__debug && document.getElementById('xmss'), null, { timeout: 240000 });
const r = await p.evaluate(async () => {
  const st = window.__stage, cv = st.renderer.domElement, wait = (ms) => new Promise((x) => setTimeout(x, ms));
  const grab = () => { const c = document.createElement('canvas'); c.width = cv.width; c.height = cv.height; c.getContext('2d').drawImage(cv, 0, 0); return c.getContext('2d').getImageData(0, 0, c.width, c.height).data; };
  const phim = async (t) => { let img = null; const o = st.draw; st.draw = (x) => { o(x); img = grab(); }; await window.renderAt(t); st.draw = o; return img; };
  const diff = (a, b2) => { if (!a || !b2 || a.length !== b2.length) return 999; let s = 0; for (let i = 0; i < a.length; i += 4) s += Math.abs(a[i] - b2[i]) + Math.abs(a[i + 1] - b2[i + 1]) + Math.abs(a[i + 2] - b2[i + 2]); return s / (a.length / 4) / 3; };
  const out = {};
  const marks = window.__dbg.marks; out.marks = marks.map((m) => m.name);
  const goc = window.renderAt;
  const ref = await phim(12);
  window.__debug.set(true); await wait(100);
  out.coBang = getComputedStyle(document.getElementById('xdbg')).display !== 'none';
  for (let i = 0; i < 10; i++) await window.renderAt(10 + i / 30);
  const voiDebug = await phim(12); out.phimLech = diff(voiDebug, ref);
  document.getElementById('xmss').click(); await wait(800);
  for (let i = 0; i < 10; i++) await window.renderAt(10 + i / 30);
  window.__che3d.tat(); await wait(300);
  out.text = window.__debug.text();
  window.__debug.set(false);
  out.traVeGoc = window.renderAt === goc; out.bangAn = getComputedStyle(document.getElementById('xdbg')).display === 'none';
  return out;
});
await b.close();
if (args.includes('--in')) console.log(r.text + '\n');
const kq = [];
const ok = (t, d) => { kq.push(`${d ? 'ĐẠT' : 'LỖI'}  ${t}`); if (!d) process.exitCode = 1; };
const can = ['đọc gói', 'nạp engine xong', 'dựng sân khấu', 'vẽ khung đầu', 'module tập chạy xong', 'trình phát sẵn sàng'];
ok(`mốc mở tập đủ (${r.marks.length} mốc)`, can.every((k) => r.marks.some((m) => m.includes(k))));
ok('bật Debug → hiện bảng', r.coBang);
ok('đo khung Phim + Song song có trong khối chép', /\n  Phim .* khung/.test(r.text) && /\n  Song song .* khung/.test(r.text));
ok('khối chép có SHADER/CẢNH + máy', /SHADER\/CẢNH: \d+ program/.test(r.text) && /máy: /.test(r.text));
ok(`khung Phim khi bật Debug = khi tắt (lệch ${r.phimLech.toFixed(2)})`, r.phimLech < 0.01);
ok('tắt Debug → renderAt về hàm gốc, bảng ẩn', r.traVeGoc && r.bangAn);
ok('không có lỗi trang', !errs.length);
console.log(kq.join('\n')); if (errs.length) console.log('lỗi trang:\n  ' + errs.slice(0, 5).join('\n  '));
