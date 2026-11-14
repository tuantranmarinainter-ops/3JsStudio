#!/usr/bin/env node
// face-pack-mau.mjs — dựng trang duyệt bộ mặt: dist/face-pack_mau.html (MỘT file, mở bằng file:///).
//   node tools/face-pack-mau.mjs [--look dan_a]
// Mỗi biểu cảm: mặt cũ (emote37) | mặt mới (altiwyre) trên đầu R6 (chụp từ engine/face-pack-lab.html) + bản ghép 2D sửa được;
// dải dưới liệt kê MỌI bộ phận của bộ mới — bấm để đổi mắt/mày/miệng/phụ thêm của biểu cảm đang chọn, rồi "Chép JSON".
import fs from 'node:fs';
import path from 'node:path';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { launchBrowser } from './browser.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const look = arg('look', 'tron'), CELL = 220, COLS = 8;   // 'tron' = đầu trơn không tóc (không che mặt)
const D = path.join(ROOT, 'assets', 'faces', 'altiwyre');
const map = JSON.parse(fs.readFileSync(arg('map') ? path.resolve(ROOT, arg('map')) : path.join(D, 'map.json'), 'utf8'));
const them = (arg('base') ? `&base=${encodeURIComponent('/' + arg('base').replace(/^[\/]+/, ''))}` : '') + (arg('phong') ? `&phong=${arg('phong')}&tam=${arg('tam', '0.53')}` : '');   // bản đề xuất ghép ở thư mục khác
const parts = JSON.parse(fs.readFileSync(path.join(D, 'parts.json'), 'utf8'));

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp' };
const srv = createServer((req, res) => {
  try { const p = path.resolve(path.join(ROOT, decodeURIComponent(req.url.split('?')[0]))); if (path.relative(ROOT, p).startsWith('..')) throw 0;
    const b = fs.readFileSync(p); res.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream', 'cache-control': 'no-store' }); res.end(b); } catch { res.writeHead(404); res.end(); }
}).listen(0);
await new Promise((r) => srv.once('listening', r));
const browser = await launchBrowser();
const out = path.join(ROOT, 'output', 'face-pack'); fs.mkdirSync(out, { recursive: true });
async function chup(pack) {
  const page = await browser.newPage({ viewport: { width: COLS * CELL, height: 5 * CELL } }); const errs = [];
  page.on("response", (r) => { if (r.status() >= 400 && /faces|face-pack/.test(r.url())) errs.push(r.status() + " " + r.url()); });
  page.on('pageerror', (e) => errs.push(String(e.message)));
  await page.goto(`http://localhost:${srv.address().port}/engine/face-pack-lab.html?pack=${pack}&look=${look}&cols=${COLS}&cell=${CELL}${pack === 'altiwyre' ? them : ''}`);
  await page.waitForFunction('window.__ready === true', { timeout: 90000 });
  if (errs.length) throw new Error(pack + ': ' + errs.join(' | '));
  const cells = await page.evaluate('window.__cells');
  const f = path.join(out, `r6-${pack}.png`); await page.locator('#c').screenshot({ path: f }); await page.close();
  const ra = {};
  for (const c of cells) ra[c.ten] = 'data:image/jpeg;base64,' + (await sharp(f).extract({ left: c.x, top: c.y, width: c.w, height: c.h }).jpeg({ quality: 82 }).toBuffer()).toString('base64');
  return ra;
}
const cu = await chup('emote37'), moi = await chup('altiwyre');
await browser.close(); srv.close();

const thumbs = {};
for (const p of parts) { const f = path.join(D, 'parts', p.ma + '.png'); if (fs.existsSync(f)) thumbs[p.ma] = 'data:image/webp;base64,' + (await sharp(f).resize(160, 160).webp({ quality: 80, alphaQuality: 90 }).toBuffer()).toString('base64'); }

const DATA = { ten: Object.keys(map.map), map: map.map, cu, moi, parts: parts.filter((p) => thumbs[p.ma]).map(({ ma, nhom, hang, cot }) => ({ ma, nhom, hang, cot })), thumbs };
const html = `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Bộ mặt AltiWyre — duyệt</title>
<style>
:root{--bg:#f4f5f7;--card:#fff;--ink:#1d2433;--mut:#6b7385;--acc:#2d6cdf;--line:#d9dde5;--skin:#f0c8a0}
@media (prefers-color-scheme:dark){:root{--bg:#14171d;--card:#1e232d;--ink:#e8ecf4;--mut:#98a1b3;--acc:#6b9bff;--line:#313847}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.45 system-ui,"Segoe UI",sans-serif;padding:16px 16px 340px}
h1{font-size:20px;margin:0 0 4px}p{margin:4px 0;color:var(--mut)}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(330px,1fr));gap:10px;margin-top:14px}
.card{background:var(--card);border:2px solid var(--line);border-radius:10px;padding:8px;cursor:pointer}
.card.on{border-color:var(--acc)}.card.sua{box-shadow:inset 0 0 0 2px #e6a23c55}
.card h3{margin:0 0 6px;font-size:13px;display:flex;gap:6px;align-items:center;justify-content:space-between}
.tag{font-size:11px;padding:1px 7px;border-radius:99px;color:#fff}.tot{background:#3a9d5d}.tam{background:#d08a1c}.khong{background:#c8483f}
.row{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px}.row figure{margin:0;text-align:center}.row img,.row canvas{width:100%;aspect-ratio:1;border-radius:6px;display:block;background:var(--skin)}
figcaption{font-size:11px;color:var(--mut)}.lop{font:11px ui-monospace,Consolas,monospace;color:var(--mut);margin-top:5px;word-break:break-word}
#bar{position:fixed;left:0;right:0;bottom:0;height:320px;background:var(--card);border-top:2px solid var(--line);display:flex;flex-direction:column}
#bar header{display:flex;gap:8px;align-items:center;padding:6px 12px;flex-wrap:wrap;border-bottom:1px solid var(--line)}
#bar button{border:1px solid var(--line);background:transparent;color:var(--ink);border-radius:99px;padding:4px 12px;font:inherit;cursor:pointer}
#bar button.on{background:var(--acc);border-color:var(--acc);color:#fff}
#parts{flex:1;overflow:auto;padding:8px 12px;display:grid;grid-template-columns:repeat(auto-fill,minmax(84px,1fr));gap:6px;align-content:start}
.pt{border:2px solid transparent;border-radius:8px;background:var(--skin);cursor:pointer;text-align:center;font:10px ui-monospace,Consolas,monospace;color:#222;padding-bottom:2px}
.pt img{width:100%;display:block}.pt.on{border-color:var(--acc)}
textarea{width:100%;height:110px;font:12px ui-monospace,Consolas,monospace;margin-top:10px;display:none}
</style></head><body>
<h1>Bộ mặt AltiWyre — duyệt 37 biểu cảm</h1>
<p>Mỗi ô: <b>mặt cũ</b> (emote37) · <b>mặt mới</b> trên đầu R6 (bản đề xuất) · <b>bản ghép</b> đang sửa. Bấm một ô để chọn, rồi bấm bộ phận ở dải dưới để đổi. Xong bấm <b>Chép JSON</b> và dán lại cho Claude (chỉ chép những ô đã sửa).</p>
<p>Nhãn: <span class="tag tot">khớp tốt</span> <span class="tag tam">tạm</span> <span class="tag khong">không có tương đương</span></p>
<div class="grid" id="grid"></div><textarea id="ta" readonly></textarea>
<div id="bar"><header><b id="dang">Chưa chọn ô</b><span id="nhom"></span>
<label><input type="checkbox" id="doi" checked> đổi cả hai mắt / hai mày</label>
<button id="xoa">Gỡ hết phụ thêm</button><button id="lai">Trả về đề xuất</button><button id="chep" class="on">Chép JSON</button></header><div id="parts"></div></div>
<script>
const D=${JSON.stringify(DATA)};
const NH={f:'Mặt nguyên (140)',e:'Mắt',b:'Lông mày',m:'Miệng',s:'Miệng khi nói',a:'Phụ thêm',p:'Con ngươi rời'};
const P=Object.fromEntries(D.parts.map(p=>[p.ma,p])),IM={};
const goc=JSON.parse(JSON.stringify(D.map));let chon=null,nhom='f';
const img=ma=>IM[ma]||(IM[ma]=Object.assign(new Image(),{src:D.thumbs[ma]}));
const khe=ma=>{const p=P[ma];if(!p)return ma;if(p.nhom==='e'||p.nhom==='b')return p.nhom+(p.cot%2?'R':'L');if(p.nhom==='m'||p.nhom==='s')return 'mouth';return ma};
const laF=ma=>P[ma]&&P[ma].nhom==='f';
const capDoi=ma=>{const p=P[ma];const q=D.parts.find(x=>x.nhom===p.nhom&&x.hang===p.hang&&x.cot===(p.cot^1));return q&&q.ma};
function ve(ten){const c=document.querySelector('[data-c="'+ten+'"]');if(!c)return;const g=c.getContext('2d');g.clearRect(0,0,c.width,c.height);
  Promise.all(D.map[ten].lop.map(ma=>{const i=img(ma);return i.complete?i:new Promise(r=>{i.onload=()=>r(i)})})).then(is=>{g.clearRect(0,0,c.width,c.height);is.forEach(i=>g.drawImage(i,0,0,c.width,c.height))});
  const el=c.closest('.card');el.querySelector('.lop').textContent=D.map[ten].lop.join(' + ');el.classList.toggle('sua',JSON.stringify(D.map[ten].lop)!==JSON.stringify(goc[ten].lop))}
const grid=document.getElementById('grid');
D.ten.forEach(ten=>{const m=D.map[ten],el=document.createElement('div');el.className='card';el.dataset.ten=ten;
  el.innerHTML='<h3><span>'+ten+'</span><span class="tag '+m.khop+'" title="'+(m.ghiChu||'').replace(/"/g,'&quot;')+'">'+({tot:'khớp tốt',tam:'tạm',khong:'không có'}[m.khop]||m.khop)+'</span></h3><div class="row"><figure><img src="'+D.cu[ten]+'"><figcaption>cũ</figcaption></figure><figure><img src="'+D.moi[ten]+'"><figcaption>mới (đề xuất)</figcaption></figure><figure><canvas width="200" height="200" data-c="'+ten+'"></canvas><figcaption>bản ghép đang sửa</figcaption></figure></div><div class="lop"></div>'+(m.ghiChu?'<div class="lop">'+m.ghiChu+'</div>':'');
  el.onclick=()=>{chon=ten;document.querySelectorAll('.card').forEach(x=>x.classList.toggle('on',x===el));document.getElementById('dang').textContent='Đang sửa: '+ten;veParts()};grid.appendChild(el);ve(ten)});
const nb=document.getElementById('nhom');Object.keys(NH).forEach(k=>{if(!D.parts.some(p=>p.nhom===k))return;const b=document.createElement('button');b.textContent=NH[k];b.onclick=()=>{nhom=k;veParts()};b.dataset.k=k;nb.appendChild(b)});
function veParts(){nb.querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.k===nhom));const box=document.getElementById('parts');box.innerHTML='';const cur=chon?D.map[chon].lop:[];
  D.parts.filter(p=>p.nhom===nhom).forEach(p=>{const d=document.createElement('div');d.className='pt'+(cur.includes(p.ma)?' on':'');d.innerHTML='<img loading="lazy" src="'+D.thumbs[p.ma]+'">'+p.ma;d.onclick=()=>dat(p.ma);box.appendChild(d)})}
function dat1(lop,ma){const k=khe(ma),i=lop.findIndex(x=>khe(x)===k);if(P[ma].nhom==='a'||P[ma].nhom==='p'){if(i>=0)lop.splice(i,1);else lop.push(ma)}else if(i>=0)lop[i]=ma;else lop.push(ma)}
function dat(ma){if(!chon){alert('Bấm chọn một ô biểu cảm trước.');return}if(laF(ma)){D.map[chon].lop=[ma];ve(chon);veParts();return}if(D.map[chon].lop.some(laF)&&'ebms'.includes(P[ma].nhom))D.map[chon].lop=[];const lop=D.map[chon].lop;dat1(lop,ma);
  if(document.getElementById('doi').checked&&(P[ma].nhom==='e'||P[ma].nhom==='b')){const d=capDoi(ma);if(d)dat1(lop,d)}ve(chon);veParts()}
document.getElementById('xoa').onclick=()=>{if(!chon)return;D.map[chon].lop=D.map[chon].lop.filter(x=>P[x]&&P[x].nhom!=='a'&&P[x].nhom!=='p');ve(chon);veParts()};
document.getElementById('lai').onclick=()=>{if(!chon)return;D.map[chon].lop=goc[chon].lop.slice();ve(chon);veParts()};
document.getElementById('chep').onclick=()=>{const o={};D.ten.forEach(t=>{if(JSON.stringify(D.map[t].lop)!==JSON.stringify(goc[t].lop))o[t]=D.map[t].lop});const s=JSON.stringify(o);const ta=document.getElementById('ta');ta.style.display='block';ta.value=s;ta.select();
  (navigator.clipboard?navigator.clipboard.writeText(s):Promise.reject()).then(()=>alert('Đã chép '+Object.keys(o).length+' ô đã sửa. Dán lại cho Claude.'),()=>alert('Không chép tự động được — hãy chép nội dung trong khung chữ phía trên dải bộ phận.'))};
veParts();
</script></body></html>`;
fs.mkdirSync(path.join(ROOT, 'dist'), { recursive: true });
const f = path.join(ROOT, 'dist', 'face-pack_mau.html'); fs.writeFileSync(f, html);
console.log(`${path.relative(ROOT, f)}: ${(fs.statSync(f).size / 1e6).toFixed(2)} MB · ${DATA.ten.length} biểu cảm · ${DATA.parts.length} bộ phận`);
