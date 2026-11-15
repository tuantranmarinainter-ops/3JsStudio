// Kiểm luồng studio + kho chung (docs/handoff/tach-studio.md, GĐ2) trên trình duyệt sạch (IndexedDB trống):
//   1. mở dist/studio.html?goi=<ep>.3js khi CHƯA có kho → phải hiện lời nhắc kéo kho-chung.3js, chưa mở tập
//   2. nạp dist/kho-chung.3js (như kéo thả) → tập tự mở tới window.__ready
//   3. tải lại trang (cùng hồ sơ trình duyệt, vẫn không có file kho) → tập mở được nhờ kho đã lưu trong IndexedDB
//   node tools/kiem-studio.mjs ep004
import { launchBrowser } from './browser.mjs';
import { pathToFileURL } from 'url';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const ep = process.argv[2] || 'ep004';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const base = pathToFileURL(resolve(root, 'dist/studio.html')).href;
const url = `${base}?goi=${ep}.3js&kho=__khong-co__.3js`;   // chặn đường tự lấy kho cạnh studio
const b = await launchBrowser(); const ctx = await b.newContext(); const p = await ctx.newPage();
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
const kq = [];
const ok = (ten, d) => { kq.push(`${d ? 'ĐẠT' : 'LỖI'}  ${ten}`); if (!d) process.exitCode = 1; };

await p.goto(url);
await p.waitForFunction(() => /kho-chung/.test(document.getElementById('smsg')?.textContent || ''), null, { timeout: 60000 }).catch(() => {});
ok('1. chưa có kho → nhắc kéo kho-chung.3js', await p.evaluate(() => /kho-chung/.test(document.getElementById('smsg')?.textContent || '') && !window.__ready));
const t0 = Date.now();
await p.evaluate(async () => { const r = await fetch('kho-chung.3js'); await window.__studioOpen(await r.arrayBuffer(), 'kho-chung.3js'); });
ok('2. nạp kho → tập tự mở', await p.waitForFunction(() => window.__ready === true, null, { timeout: 180000 }).then(() => true, () => false));
kq.push(`      (${((Date.now() - t0) / 1000).toFixed(1)} s gồm lưu kho + mở tập)`);
await p.goto(url);
const t1 = Date.now();
ok('3. mở lại không cần file kho (IndexedDB)', await p.waitForFunction(() => window.__ready === true, null, { timeout: 180000 }).then(() => true, () => false));
kq.push(`      (${((Date.now() - t1) / 1000).toFixed(1)} s)`);
ok('không có lỗi trang', !errs.length);
await b.close();
console.log(kq.join('\n')); if (errs.length) console.log('lỗi trang:\n  ' + errs.slice(0, 5).join('\n  '));
