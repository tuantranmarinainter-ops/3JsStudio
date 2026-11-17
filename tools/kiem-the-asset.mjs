// kiem-the-asset.mjs — kiểm thẻ 📦 Asset + cột ✥ Sửa vật trong TRÌNH PHÁT (bản gộp dist/<ep>.html?ui=1).
//   node tools/kiem-the-asset.mjs [ep003] [--t 40]       ảnh: output/che-do-3d/gop-y/3_trinh-phat.png, 4_song-song.png
// Đạt khi: trình phát không lỗi trang · bấm 🧊 3D → ✥ Sửa vật tự mở thẻ Asset có danh sách · bấm mục → chọn đúng vật, cột Sửa vật hiện tên ·
//   dời vật → bộ đếm ghi chú có "+ N 3D", nút Gửi bật · ◧ Song song vẫn giữ cột Sửa vật.
import { launchBrowser } from './browser.mjs';
import { pathToFileURL } from 'url'; import { resolve } from 'path'; import { mkdirSync } from 'fs';

const args = process.argv.slice(2);
const ep = args.find((a) => /^ep\d+/.test(a)) || 'ep003', T = +(args[args.indexOf('--t') + 1] || 40) || 40;
const out = 'output/che-do-3d/gop-y'; mkdirSync(out, { recursive: true });
const b = await launchBrowser(); const p = await b.newPage({ viewport: { width: 1700, height: 950 } });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
const loi = [], ok = (c, m) => { console.log(`${c ? 'ĐẠT' : 'LỖI'}  ${m}`); if (!c) loi.push(m); };
await p.goto(pathToFileURL(resolve(`dist/${ep}.html`)).href + '?ui=1');
await p.waitForFunction(() => window.__ready === true && window.__che3d && document.getElementById('xtabA')?.style.display === '', null, { timeout: 300000 });
await p.evaluate(() => localStorage.clear());
await p.evaluate((T) => { const s = document.getElementById('xseek'); s.value = T; s.dispatchEvent(new Event('input')); }, T);
await p.click('#xm3d'); await p.waitForTimeout(800);
await p.click('.c3s-mode button[data-m=sua]'); await p.waitForTimeout(300);
const r1 = await p.evaluate(() => ({ tabOn: document.getElementById('xtabA').classList.contains('on'), n: document.querySelectorAll('#xasset .it').length, dau: document.querySelector('#xasset .dau')?.textContent, col: !!document.querySelector('.c3s-col') }));
ok(r1.tabOn && r1.n > 0 && r1.col, `✥ Sửa vật → thẻ Asset mở (${r1.dau}), cột Sửa vật hiện`);
const it = await p.$$('#xasset .it'); if (it[Math.min(3, it.length - 1)]) await it[Math.min(3, it.length - 1)].click(); await p.waitForTimeout(300);
const r2 = await p.evaluate(() => ({ sel: window.__che3d.sua.sel?.name, ten: document.querySelector('.c3s-col .ten')?.textContent, on: document.querySelector('#xasset .it.on .n')?.textContent }));
ok(r2.sel && r2.on === r2.sel, `bấm mục asset → chọn ${r2.sel}`);
await p.evaluate(() => { const S = window.__che3d.sua, o = S.sel, tc = S.tc; tc.dispatchEvent({ type: 'mouseDown' }); o.position.y += 1; tc.dispatchEvent({ type: 'objectChange' }); tc.dispatchEvent({ type: 'mouseUp' }); });
await p.waitForTimeout(200);
const r3 = await p.evaluate(() => ({ cnt: document.getElementById('xncnt').textContent, send: !document.getElementById('xsend').disabled }));
ok(/\+ 1 3D/.test(r3.cnt) && r3.send, `dời vật → ghi chú "${r3.cnt}", nút Gửi ${r3.send ? 'bật' : 'tắt'}`);
const ch = await p.evaluate(async () => { const t = await window.__che3d.chepDieuChinh(document.getElementById('xchep')); return { t: t || '', nut: document.getElementById('xchep').textContent }; });
ok(/✥ SỬA/.test(ch.t), `📋 Copy điều chỉnh trong trình phát: ${ch.nut}, ${ch.t.split(String.fromCharCode(10)).length} dòng`);
await p.screenshot({ path: `${out}/3_trinh-phat.png` });
await p.click('#xmss'); await p.waitForTimeout(800);
const r4 = await p.evaluate(() => { const c = document.querySelector('.c3s-col'); return { col: !!c && c.classList.contains('c3s-ssflex'), mode: window.__che3d.sua.mode }; });
ok(r4.col && r4.mode === 'sua', 'song song: cột Sửa vật vẫn hiện');
await p.screenshot({ path: `${out}/4_song-song.png` });
await p.evaluate(() => { window.__che3d.sua.xoaHet(); window.__che3d.tat(); });
ok(!errs.length, 'không lỗi trang' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
await b.close();
console.log(loi.length ? `\nLỖI ${loi.length}` : '\nĐẠT tất cả'); process.exit(loi.length ? 1 : 0);
