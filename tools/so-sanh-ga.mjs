#!/usr/bin/env node
// so-sanh-ga.mjs — chụp 4 mẫu Gà tập 2–5 (engine/so-sanh-ga.html) ở 4 góc, đo chiều cao, gộp trang so sánh một file dist/so-sanh-ga.html.
//   node tools/so-sanh-ga.mjs        → output/mau-ga/*.png + cao.json, dist/so-sanh-ga.html
import { createServer } from 'http';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { extname, join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { launchBrowser } from './browser.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'output', 'mau-ga');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary' };
const GOC = [['front', 'Trước'], ['tq', '3/4'], ['side', 'Nghiêng'], ['back', 'Sau']];

export const MAU = [
  { k: 'A', ten: 'Gà v2 — rig riêng theo ảnh phác', tap: 'Tập 2 (ep002)', builder: '<code>engine/ga-rig.js</code> · <code>createGa</code> (vân atlas + mũ trùm GLB)',
    mota: 'Đầu trụ vàng bo tròn có mào, băng đô đỏ, mặt dán theo bộ mặt Gà riêng. Hoodie xanh lá có mũ trùm dựng bằng Blender, quần short nâu, giày đen. Khung xương riêng, KHÔNG phải R6; tỉ lệ đo từ ảnh phác <code>ga-dims.js</code> (đỉnh đầu 5,2 stud, mào ~5,37).',
    r6: false, nguonCao: 'ga-dims.js: đỉnh đầu 5,2 · mào 5,37' },
  { k: 'B', ten: 'Gà R6 — thân khối R6 + look "ga"', tap: 'Tập 3 (ep003)', builder: '<code>engine/r6-rig.js</code> · <code>createR6Rig</code> + <code>R6_LOOKS.ga</code>',
    mota: 'Thân 6 khối R6 chuẩn (đầu, thân, 2 tay, 2 chân), da vàng #ffe000. Hoodie len xanh #7da33c sọc vàng-xanh, quần nâu đỏ #6b2e1e, giày đen đế kem; phụ kiện băng đô đỏ, mào vàng, mũ trùm, dây rút. Mặt bộ 37 biểu cảm. <b>Mẫu duy nhất đúng luật R6 (16/11).</b>',
    r6: true, nguonCao: 'không có số trong code — đo bằng Box3' },
  { k: 'C', ten: 'Gà nv-js — hoodie xanh sọc', tap: 'Tập 4 (ep004)', builder: '<code>engine/nv-js.js</code> · <code>makeGa(THREE, {ao:"xanh"})</code>',
    mota: 'Nhân vật dựng bằng code theo ảnh mẫu <code>refs/ep004/ga-mau.webp</code>: đầu trụ vàng + túm tóc, băng đô đỏ, hoodie xanh lá sọc ngang (vải có nếp, đường may), short nâu, giày vải đen đế trắng. Mặt dán bộ emote37. Không truyền <code>cao</code> → cỡ tự nhiên của khối.',
    r6: false, nguonCao: 'không truyền cao — đo bằng Box3' },
  { k: 'D', ten: 'Gà nv-js — hoodie vàng cam', tap: 'Tập 5 (ep005)', builder: '<code>engine/nv-js.js</code> · <code>makeGa(THREE, {ao:"vang", cao:5.3})</code>',
    mota: 'Cùng khung với C nhưng hoodie vàng cam #e39a0e trơn, quần jeans tối dài #1d2a4d, giày trắng, băng đầu nâu #7a3b2a hai đuôi, tóc nâu. Ép cao 5,3 stud (<code>NV_JS_EP5</code>).',
    r6: false, nguonCao: 'ép cao: 5,3 (nv-cast ep005)' },
];

function serve() {
  return new Promise((ok) => {
    const s = createServer(async (req, res) => {
      try { const p = join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname)); const b = await readFile(p); res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream' }); res.end(b); }
      catch { res.writeHead(404); res.end(); }
    }).listen(0, () => ok(s));
  });
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
function trang(anh, cao) {
  const the = MAU.map((m) => { const c = cao[m.k] || {}; return `<article class="the${m.r6 ? ' r6' : ''}">
  <div class="dau"><span class="ma">${m.k}</span><div><h2>${esc(m.ten)}</h2><p class="tap">${m.tap}${m.r6 ? ' · <b class="dung">đúng luật R6</b>' : ''}</p></div></div>
  <table><tr><th>Cao (đỉnh)</th><td><b>${c.cao ?? '?'} stud</b></td></tr><tr><th>Rộng × sâu</th><td>${c.rong ?? '?'} × ${c.sau ?? '?'} stud</td></tr>
  <tr><th>So chuẩn 5,48</th><td>${c.cao ? ((c.cao / 5.48 - 1) * 100).toFixed(0).replace('-', '−') + '%' : '?'}</td></tr><tr><th>Nguồn số</th><td>${m.nguonCao}</td></tr><tr><th>Dựng bằng</th><td>${m.builder}</td></tr></table>
  <p>${m.mota}</p>
  <label class="chon"><input type="radio" name="chon" value="${m.k}"> Chọn mẫu ${m.k}</label></article>`; }).join('\n');
  const goc = GOC.map(([g, t], i) => `<button class="tab${i ? '' : ' on'}" data-g="${g}">${t}</button>`).join('');
  const imgs = GOC.map(([g], i) => `<img data-g="${g}" src="data:image/jpeg;base64,${anh[g]}" alt="4 mẫu Gà, góc ${g}"${i ? ' hidden' : ''}>`).join('');
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>So sánh mẫu Gà</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;600;800&display=swap">
<style>
:root{--bg:#f4f5f7;--s:#fff;--ink:#18212c;--mu:#5b6675;--line:#dfe3e9;--ac:#b8690a;--ok:#2d7a46;--oks:#e3f2e7;--red:#d0442c}
@media (prefers-color-scheme:dark){:root:not([data-theme=light]){--bg:#10151c;--s:#171e27;--ink:#e7ebf0;--mu:#9aa5b3;--line:#2a3440;--ac:#f0a540;--ok:#7ccf96;--oks:#173022}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.55 "Be Vietnam Pro",system-ui,sans-serif;padding:24px 16px 60px}
.wrap{max-width:1180px;margin:0 auto;display:flex;flex-direction:column;gap:20px}h1{margin:0;font-size:clamp(24px,4vw,34px)}h2{margin:0;font-size:17px}
.lead{color:var(--mu);margin:0;max-width:75ch}.khung{background:var(--s);border:1px solid var(--line);border-radius:12px;padding:12px}
.tabs{display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap}.tab{font:inherit;border:1px solid var(--line);background:var(--bg);color:var(--ink);border-radius:8px;padding:4px 14px;cursor:pointer}.tab.on{background:var(--ac);border-color:var(--ac);color:#fff}
.khung img{width:100%;height:auto;border-radius:8px;display:block}.chu{font-size:13px;color:var(--mu);margin-top:8px}.chu b.r{color:var(--red)}
.ds{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px}
.the{background:var(--s);border:1px solid var(--line);border-radius:12px;padding:14px;display:flex;flex-direction:column;gap:10px}.the.r6{border:2px solid var(--ok)}
.dau{display:flex;gap:10px;align-items:center}.ma{flex:0 0 auto;width:34px;height:34px;border-radius:50%;background:var(--ac);color:#fff;font-weight:800;display:grid;place-items:center}
.tap{margin:0;color:var(--mu);font-size:13px}.dung{color:var(--ok)}.the p{margin:0;font-size:14px}
table{border-collapse:collapse;font-size:13px;width:100%}th{text-align:left;color:var(--mu);font-weight:600;padding:3px 8px 3px 0;white-space:nowrap;vertical-align:top}td{padding:3px 0}
code{font-size:.85em;background:var(--bg);border:1px solid var(--line);border-radius:4px;padding:0 4px;word-break:break-word}
.chon{margin-top:auto;display:flex;gap:8px;align-items:center;font-weight:600;cursor:pointer;background:var(--bg);border-radius:8px;padding:6px 10px}
.kq{background:var(--s);border:1px solid var(--line);border-radius:12px;padding:12px 14px;display:flex;flex-wrap:wrap;gap:10px;align-items:center}
.kq textarea{flex:1 1 260px;font:inherit;font-size:14px;border:1px solid var(--line);border-radius:8px;padding:6px 8px;background:var(--bg);color:var(--ink);min-height:38px}
.kq button{font:inherit;font-weight:600;border:0;border-radius:8px;padding:8px 16px;background:var(--ac);color:#fff;cursor:pointer}#ok{font-size:13px;color:var(--ok)}
</style></head><body><div class="wrap">
<header><h1>So sánh mẫu Gà · tập 2–5</h1><p class="lead">Bốn mẫu Gà đã dùng hoặc thử ở tập 2–5, đứng cạnh nhau trên cùng thước stud (1 vạch = 1 stud), camera trực giao nên cao thấp so được bằng mắt. Từ 16/11 luật là <b>mọi nhân vật đều R6</b>: chỉ mẫu B đang là thân R6; chọn mẫu nào thì phần nhìn (màu, phụ kiện) của nó sẽ được làm lại trên thân R6.</p></header>
<section class="khung"><div class="tabs">${goc}</div>${imgs}
<p class="chu">Từ trái sang: A · B · C · D. Vạch xám đậm ở 0 và 5 stud. <b class="r">Vạch đỏ 5,48</b> = chiều cao Gà chuẩn mà khuôn bối cảnh (trạm 4) đang dùng.</p></section>
<section class="ds">${the}</section>
<section class="kq"><textarea id="gc" placeholder="Ghi chú: muốn giữ gì của mẫu khác (vd. màu áo của D, mặt của A)…"></textarea><button id="chep">Chép lựa chọn</button><span id="ok"></span></section>
<p class="lead" style="font-size:13px">Dựng lại: <code>node tools/so-sanh-ga.mjs</code> · trang dựng <code>engine/so-sanh-ga.html</code>. Ngoài phạm vi: Gà v1 R15 của tập 1 (<code>engine/ga.js</code>).</p>
</div><script>
document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>{document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('on',x===b));document.querySelectorAll('.khung img').forEach(i=>i.hidden=i.dataset.g!==b.dataset.g)});
document.getElementById('chep').onclick=async()=>{const c=document.querySelector('input[name=chon]:checked');const t='Chọn mẫu Gà: '+(c?c.value:'(chưa chọn)')+(document.getElementById('gc').value.trim()?' — ghi chú: '+document.getElementById('gc').value.trim():'');try{await navigator.clipboard.writeText(t);document.getElementById('ok').textContent='Đã chép: '+t}catch(e){document.getElementById('ok').textContent=t}};
</script></body></html>`;
}

const srv = await serve(); const port = srv.address().port;
await mkdir(OUT, { recursive: true });
const browser = await launchBrowser();
const anh = {}; let cao = {};
try {
  for (const [g] of GOC) {
    const page = await browser.newPage({ viewport: { width: 2200, height: 900 } });
    const loi = []; page.on('pageerror', (e) => loi.push(e.message));
    await page.goto(`http://localhost:${port}/engine/so-sanh-ga.html?goc=${g}`);
    try { await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 }); }
    catch (e) { throw new Error(`trang không sẵn sàng (${g}): ${loi.join(' | ') || e.message}`); }
    if (g === 'front') cao = await page.evaluate(() => window.__cao);
    const buf = await page.locator('#cv').screenshot({ type: 'jpeg', quality: 86 });
    await writeFile(join(OUT, g + '.jpg'), buf); anh[g] = buf.toString('base64');
    await page.close();
  }
} finally { await browser.close(); srv.close(); }
await writeFile(join(OUT, 'cao.json'), JSON.stringify(cao, null, 1));
const f = join(ROOT, 'dist', 'so-sanh-ga.html');
await writeFile(f, trang(anh, cao));
console.log(JSON.stringify(cao)); console.log('→ ' + f);
