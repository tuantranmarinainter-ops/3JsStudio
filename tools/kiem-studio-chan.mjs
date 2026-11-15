// Kiểm tình huống "tab studio cũ giữ kho": một tab đang mở IndexedDB '3js-studio' phiên bản 1 (studio GĐ2),
// studio mới (cần phiên bản 2) phải BÁO "đóng tab khác" thay vì treo im lặng, và tự chạy tiếp khi tab cũ đóng.
//   node tools/kiem-studio-chan.mjs [ep004]
import { launchBrowser } from './browser.mjs';
import { pathToFileURL } from 'url';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const ep = process.argv[2] || 'ep004';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dir = process.env.STUDIO_DIR || 'dist/STUDIO RIENG';
const base = pathToFileURL(resolve(root, dir, 'studio.html')).href;
const b = await launchBrowser(); const ctx = await b.newContext();
const kq = []; const ok = (ten, d) => { kq.push(`${d ? 'ĐẠT' : 'LỖI'}  ${ten}`); if (!d) process.exitCode = 1; };

const cu = await ctx.newPage();   // tab cũ: giữ kho ở phiên bản 1, không chịu đóng khi bị xin nâng cấp
await cu.goto(pathToFileURL(resolve(root, dir, 'kho-chung.3js')).href.replace(/kho-chung\.3js$/, ''));
await cu.evaluate(() => new Promise((res) => { const r = indexedDB.open('3js-studio', 1); r.onupgradeneeded = () => r.result.createObjectStore('blob'); r.onsuccess = () => { window.__giu = r.result; res(); }; }));

const p = await ctx.newPage();
await p.goto(`${base}?goi=${ep}.3js`);
const bao = await p.waitForFunction(() => /tab studio khác/.test((document.getElementById('smsg')?.textContent || '') + (document.getElementById('sban')?.textContent || '')), null, { timeout: 30000 }).then(() => true, () => false);
ok('1. tab cũ giữ kho → studio báo "đóng tab studio khác"', bao);
await cu.close();
const t0 = Date.now();
ok('2. đóng tab cũ → tập tự mở tiếp', await p.waitForFunction(() => window.__ready === true, null, { timeout: 180000 }).then(() => true, () => false));
kq.push(`      (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
await b.close();
console.log(kq.join('\n'));
