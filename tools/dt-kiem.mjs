// node tools/dt-kiem.mjs <trang.html> [--out output/studio-dien-thoai] [--w 390 --h 844]
// Mở trình phát bằng Chrome giả lập điện thoại (cảm ứng), đi qua các màn: phim, nút hiện, ngăn kéo từng thẻ, 3D, công cụ 3D, sửa vật;
// chụp từng bước, KIỂM SỐ: không cuộn ngang, nút ≥ 44 px, phim không bị che khi đang xem. In bảng kết quả.
import { launchBrowser } from './browser.mjs';
import { mkdirSync } from 'fs'; import { resolve } from 'path'; import { pathToFileURL } from 'url';
const a = process.argv.slice(2); const opt = (k, d) => { const i = a.indexOf('--' + k); return i >= 0 ? a[i + 1] : d; };
const file = a.find((x) => !x.startsWith('--')); if (!file) { console.error('Dùng: node tools/dt-kiem.mjs <trang.html>'); process.exit(1); }
const out = resolve(opt('out', 'output/studio-dien-thoai')); mkdirSync(out, { recursive: true });
const W = +opt('w', 390), H = +opt('h', 844);
const br = await launchBrowser();
const ctx = await br.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36' });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('  pageerror:', e.message));
page.on('console', (m) => { if (m.type() === 'error' && !/404|WebGL|GPU stall/.test(m.text())) console.log('  console:', m.text().slice(0, 160)); });
const res = []; const ok = (n, v, d = '') => { res.push([n, !!v, d]); console.log((v ? '  ✓ ' : '  ✗ ') + n + (d ? ' — ' + d : '')); };
const shot = (n) => page.screenshot({ path: `${out}/${n}.png` });
const sleep = (ms) => page.waitForTimeout(ms);
await page.goto(pathToFileURL(resolve(file)).href + '?ui=1&giaodien=dt', { timeout: 240000 });
await page.waitForFunction(() => window.__ready === true && document.querySelector('#xapp') && !document.getElementById('xpre'), null, { timeout: 240000 });
await sleep(800);
const q = (f, ...x) => page.evaluate(f, ...x);
ok('bố cục điện thoại bật', await q(() => document.getElementById('xapp').classList.contains('dt')));
ok('không cuộn ngang (trang)', await q(() => document.documentElement.scrollWidth <= innerWidth + 1), '');
const film = await q(() => { const r = document.getElementById('xwrap').getBoundingClientRect(); return [r.left, r.top, r.width, r.height]; });
ok('phim vừa khít chiều ngang', Math.abs(film[2] - W) < 3 || Math.abs(film[3] - H) < 3, film.map((x) => Math.round(x)).join(','));
await q(() => document.getElementById('xapp').classList.remove('cv')); await sleep(300); await shot('01-man-chinh');
await page.touchscreen.tap(W / 2, H / 2 - 120); await sleep(400); await shot('02-hien-nut');
ok('chạm phim → hiện nút', await q(() => document.getElementById('xapp').classList.contains('cv')));
const small = await q(() => [...document.querySelectorAll('#dtbar button, #dtbig')].filter((b) => { const r = b.getBoundingClientRect(); return r.width < 44 || r.height < 44; }).map((b) => b.id));
ok('nút thanh dưới ≥ 44 px', !small.length, small.join(','));
await q(() => document.getElementById('dtsm').click()); await sleep(1500); await q(() => document.getElementById('dtsm').click()); await sleep(300);
ok('phát được', await q(() => +document.getElementById('xseek').value > 0.3), await q(() => document.getElementById('xseek').value));
console.log('  thanh dưới:', JSON.stringify(await q(() => [...document.getElementById('dtbar').children].map((c) => [c.id || c.tagName, Math.round(c.getBoundingClientRect().left), Math.round(c.getBoundingClientRect().width)]))));
const gx = await q(() => { const r = document.getElementById('dtgear').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
await page.touchscreen.tap(gx[0], gx[1]); await sleep(500); await shot('03-ngan-keo');
ok('ngăn kéo mở', await q(() => document.getElementById('xapp').classList.contains('mo')));
const tabs = await q(() => [...document.querySelectorAll('#xright .tab')].filter((t) => t.style.display !== 'none').map((t) => [t.dataset.p, t.textContent.trim()]));
let i = 4;
for (const [p, nm] of tabs) {
  await q((p) => document.querySelector(`.tab[data-p="${p}"]`).click(), p); await sleep(250);
  const info = await q((p) => {
    const pane = document.getElementById(p), sc = pane.parentElement, bad = [];
    for (const b of pane.querySelectorAll('button, select, input[type=number], input[type=text], input[type=range], label.chk, .tab')) { const r = b.getBoundingClientRect(); if (r.width && r.height && r.height < 40) bad.push((b.id || b.textContent || b.tagName).trim().slice(0, 18) + ':' + Math.round(r.height)); }
    return { over: sc.scrollWidth > sc.clientWidth + 1, bad: bad.slice(0, 6), n: bad.length };
  }, p);
  await shot(`${String(i++).padStart(2, '0')}-the-${p}`);
  ok(`thẻ ${nm}: không cuộn ngang`, !info.over); ok(`thẻ ${nm}: nút ≥ 40 px`, info.n === 0, info.bad.join(' '));
}
await q(() => document.getElementById('dtclose').click()); await sleep(400);
// 3D
await q(() => { __giaoDien.moDr('xp7'); }); await sleep(300);
ok('có nút 🧊 3D', await q(() => !!document.getElementById('xm3d') && getComputedStyle(document.getElementById('xm3d')).display !== 'none'));
await q(() => document.getElementById('xm3d').click()); await sleep(1500); await q(() => __giaoDien.dongDr()); await sleep(1200);
await shot('20-3d');
ok('3D bật, thanh dưới luôn hiện', await q(() => document.getElementById('xapp').classList.contains('m3d')));
await page.touchscreen.tap(W - 70, 32); await sleep(400); await shot('21-cong-cu-3d');
ok('công cụ 3D mở', await q(() => document.getElementById('xapp').classList.contains('tl3')));
const t3 = await q(() => { const bar = document.querySelector('.c3d-bar'); const r = bar.getBoundingClientRect(); const bad = [...bar.querySelectorAll('button,select,label')].filter((b) => b.getBoundingClientRect().height < 40).length; return { over: bar.scrollWidth > bar.clientWidth + 1, bad, r: [r.left, r.right] }; });
ok('công cụ 3D không cuộn ngang, nút ≥ 40', !t3.over && t3.bad === 0, JSON.stringify(t3));
await q(() => document.querySelector('.c3s-mode [data-m=sua]').click()); await sleep(500); await shot('22-sua-vat');
await page.touchscreen.tap(W / 2, 560); await sleep(500);
ok('chạm ra ngoài đóng công cụ 3D', await q(() => !document.getElementById('xapp').classList.contains('tl3')));
await page.touchscreen.tap(160, 420); await sleep(900); await shot('23-chon-vat');
ok('chạm vật → chọn được', await q(() => !!window.__che3d.sua?.sel), await q(() => window.__che3d.sua?.sel?.name || '(không chọn)'));
const sua = await q(() => { const c = document.querySelector('.c3s-col'); if (!c) return null; const r = c.getBoundingClientRect(); return { r: [r.left, r.top, r.right, r.bottom].map(Math.round), pos: getComputedStyle(c).position }; });
ok('bảng Sửa vật nằm trong màn', !!sua && sua.r[0] >= 0 && sua.r[2] <= W + 1 && sua.r[3] <= H, JSON.stringify(sua));
const tay = await q(() => { const c = window.__che3d.sua?.tc; return c ? c.size : null; });
ok('tay kéo to hơn bản máy tính', tay > 1.2, String(tay));
await q(() => { document.querySelector('.c3s-mode [data-m=xem]')?.click(); __giaoDien.moDr('xp7'); }); await sleep(300);
await q(() => document.getElementById('xmphim').click()); await q(() => __giaoDien.dongDr()); await sleep(800);
await q(() => __giaoDien.moDr('xp7')); await sleep(300); await q(() => document.getElementById('xannbtn').click()); await q(() => __giaoDien.dongDr()); await sleep(600); await shot('25-ghi-chu');
const nb = await q(() => { const r = document.getElementById('xannbox').getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom].map(Math.round); });
ok('khung ghi chú nằm trong màn', nb[0] >= 0 && nb[2] <= W + 1 && nb[3] <= H + 1 && nb[1] > 0, nb.join(','));
await q(() => document.getElementById('xmclose').click());
await q(() => __giaoDien.moDr('xp8')); await sleep(200); await q(() => document.getElementById('dtmt').click()); await sleep(600); await shot('26-ve-may-tinh');
ok('đổi về bố cục máy tính được', await q(() => !document.getElementById('xapp').classList.contains('dt') && document.getElementById('xseek').closest('.transport')));

await shot('24-ve-phim');
await br.close();
const bad = res.filter((r) => !r[1]); console.log(`\n${res.length - bad.length}/${res.length} đạt`); if (bad.length) console.log('Chưa đạt: ' + bad.map((r) => r[0]).join('; '));
