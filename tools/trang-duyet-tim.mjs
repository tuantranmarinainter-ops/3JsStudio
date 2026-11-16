#!/usr/bin/env node
// Trang duyệt ỨNG VIÊN có TÌM KIẾM (quy tắc người dùng 16/11: mọi trang duyệt luôn có thanh tìm kiếm + ô tìm thêm nguồn).
//   node tools/trang-duyet-tim.mjs <ung-vien.json> --out dist/<tên>.html --loai <mã-kết-quả> --tieu-de "<tiêu đề>" [--chon ketqua.json] [--tu "<từ khoá gợi ý>"]
// ung-vien.json: mảng { nguon, id, ten, tacGia, giayPhep, face, link, anh(đường dẫn từ gốc repo), kieu, ghiChu }.
// Trang (một file, ảnh nhúng base64, thu nhỏ ≤ 480 px nếu có python+PIL):
//   • thanh tìm kiếm lọc thẻ theo tên / id / nguồn / tác giả / ghi chú, nút lọc theo nguồn và theo kiểu, "chỉ thẻ đã chọn"
//   • ô TÌM THÊM: gõ từ khoá → nút mở trang tìm của Roblox (mẫu, ảnh decal), Sketchfab (tải được), Poly Pizza, Poly Haven, OpenGameArt, ảnh PNG nền trong
//   • ô dán link / ID tự tìm được (mỗi dòng 1 cái) → đi kèm kết quả · ghi chú · Chép lựa chọn · Gửi tới Claude (tải file JSON)
//   • --chon: tích sẵn lựa chọn cũ (file kết quả trước đó); lựa chọn đang làm nhớ trong trình duyệt (localStorage, mất cũng không sao)
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const src = argv.find((a, i) => !a.startsWith('--') && !(i && argv[i - 1].startsWith('--')));
if (!src) { console.log('Dùng: node tools/trang-duyet-tim.mjs <ung-vien.json> --out dist/x.html --loai <mã> --tieu-de "<tiêu đề>" [--chon kq.json] [--tu "<từ khoá>"]'); process.exit(2); }
const out = path.resolve(GOC, opt('out', 'dist/duyet-tim.html'));
const loai = opt('loai', path.basename(out, '.html'));
const tieuDe = opt('tieu-de', 'Duyệt ứng viên');
const tuGoiY = opt('tu', '');
const list = JSON.parse(fs.readFileSync(path.resolve(GOC, src), 'utf8').replace(/^﻿/, ''));
const chonCu = new Set();
if (opt('chon')) { const k = JSON.parse(fs.readFileSync(path.resolve(GOC, opt('chon')), 'utf8')); for (const c of k.chon || []) chonCu.add(c.id); }

const cache = path.join(GOC, '.cache', 'duyet-tim'); fs.mkdirSync(cache, { recursive: true });
function anhNho(f) {   // thu nhỏ để trang nhẹ; không có PIL thì nhúng nguyên ảnh
  if (!f) return '';
  const p = path.resolve(GOC, f); if (!fs.existsSync(p)) return '';
  const st = fs.statSync(p), key = Buffer.from(p + st.mtimeMs).toString('base64url').slice(-40) + '.png', dst = path.join(cache, key);
  if (!fs.existsSync(dst)) {
    try { execFileSync('python', ['-I', '-c', 'import sys;from PIL import Image;im=Image.open(sys.argv[1]);im.thumbnail((480,480));im.save(sys.argv[2])', p, dst], { stdio: 'ignore' }); } catch { fs.copyFileSync(p, dst); }
  }
  return 'data:image/png;base64,' + fs.readFileSync(dst).toString('base64');
}
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const TEN_NGUON = { roblox: 'Roblox', sketchfab: 'Sketchfab', polypizza: 'Poly Pizza', polyhaven: 'Poly Haven' };
const nguons = [...new Set(list.map((a) => a.nguon))], kieus = [...new Set(list.map((a) => a.kieu).filter(Boolean))];
const card = (a) => {
  const k = `${a.nguon}:${a.id}`, tim = [a.ten, a.id, a.nguon, a.tacGia, a.ghiChu, a.kieu].join(' ').toLowerCase();
  return `<label class="the" data-nguon="${esc(a.nguon)}" data-kieu="${esc(a.kieu || '')}" data-tim="${esc(tim)}"><input type="checkbox" data-k="${esc(k)}" data-t="${esc(a.ten)}"${chonCu.has(k) ? ' checked' : ''}>`
    + `<div class="im">${a.anh ? `<img loading="lazy" src="${anhNho(a.anh)}" alt="">` : '<span class="ph">(không có ảnh)</span>'}</div>`
    + `<div class="tt"><b>${esc(a.ten)}</b>${a.kieu ? `<span class="tag">${esc(a.kieu)}</span>` : ''}</div>`
    + `<div class="ph">${esc(a.tacGia)} · ${esc(a.giayPhep)}${a.face != null ? ` · ${a.face} mặt` : ''}</div>${a.ghiChu ? `<div class="ph">${esc(a.ghiChu)}</div>` : ''}`
    + `<a href="${esc(a.link)}" target="_blank" rel="noopener" onclick="event.stopPropagation()">${esc(TEN_NGUON[a.nguon] || a.nguon)} ↗ ${esc(a.id)}</a></label>`;
};
const html = `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(tieuDe)}</title><style>
:root{--bg:#1c1f24;--card:#272b33;--top:#111418;--line:#333a44;--tx:#e8eaed;--mu:#9aa0a6;--ac:#2d7ff9;--ok:#3ddc84}
body{margin:0;font:14px system-ui,sans-serif;background:var(--bg);color:var(--tx)}
header{position:sticky;top:0;z-index:5;background:var(--top);padding:10px 16px;border-bottom:1px solid var(--line);display:flex;flex-direction:column;gap:8px}
.r{display:flex;gap:8px;align-items:center;flex-wrap:wrap}h1{font-size:16px;margin:0;flex:1}
button,.nut{background:var(--ac);color:#fff;border:0;border-radius:6px;padding:7px 12px;cursor:pointer;font-size:13px;text-decoration:none}
button.phu{background:#3a4150}button.on{background:var(--ok);color:#111}
input[type=search],input[type=text]{flex:1;min-width:200px;background:#0b0d10;color:var(--tx);border:1px solid var(--line);border-radius:6px;padding:8px 10px;font-size:14px}
.g{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;padding:12px 16px}
.the{background:var(--card);border:2px solid transparent;border-radius:8px;padding:8px;display:flex;flex-direction:column;gap:4px;cursor:pointer;position:relative}
.the:has(input:checked){border-color:var(--ok)}.the input{position:absolute;top:12px;left:12px;width:20px;height:20px;z-index:2}.the.an{display:none}
.im{height:190px;background:repeating-conic-gradient(#3a3f48 0 25%,#2c3038 0 50%) 0 0/16px 16px;display:flex;align-items:center;justify-content:center;border-radius:4px;overflow:hidden}.im img{max-width:100%;max-height:100%;object-fit:contain}
.tt{display:flex;gap:6px;justify-content:space-between;align-items:flex-start}.ph{font-size:12px;color:var(--mu)}.tag{font-size:11px;padding:2px 6px;border-radius:9px;background:#3a4a6a;white-space:nowrap}a{color:#8ab4f8;font-size:12px}
.hop{margin:4px 16px 16px;background:var(--card);border-radius:8px;padding:10px}.hop h3{margin:0 0 6px;font-size:14px}
textarea{width:100%;box-sizing:border-box;height:80px;background:#0b0d10;color:var(--tx);border:1px solid var(--line);border-radius:6px;padding:6px;font:13px ui-monospace,Consolas,monospace}
@media (max-width:600px){.g{grid-template-columns:repeat(auto-fill,minmax(150px,1fr));padding:8px}.im{height:140px}}
</style></head><body>
<header>
 <div class="r"><h1>${esc(tieuDe)} — <span id="n">0</span> đã chọn / <span id="hien">${list.length}</span> đang hiện</h1><button id="chep">📋 Chép lựa chọn</button><button id="gui">Gửi tới Claude (tải file)</button></div>
 <div class="r"><input type="search" id="q" placeholder="🔎 Tìm trong ${list.length} ứng viên: tên, id, nguồn, tác giả, ghi chú…">
  ${nguons.map((n) => `<button class="phu loc" data-nguon="${esc(n)}">${esc(TEN_NGUON[n] || n)}</button>`).join('')}
  ${kieus.map((k) => `<button class="phu loc" data-kieu="${esc(k)}">${esc(k)}</button>`).join('')}
  <button class="phu" id="chiChon">Chỉ đã chọn</button></div>
 <div class="r"><input type="text" id="tu" value="${esc(tuGoiY)}" placeholder="🌐 Tìm thêm ở nguồn khác: gõ từ khoá (tiếng Anh) rồi bấm nguồn">
  <button class="phu tim" data-u="https://create.roblox.com/store/models?keyword=">Roblox mẫu</button>
  <button class="phu tim" data-u="https://create.roblox.com/store/decals?keyword=">Roblox ảnh</button>
  <button class="phu tim" data-u="https://sketchfab.com/search?features=downloadable&type=models&q=">Sketchfab</button>
  <button class="phu tim" data-u="https://poly.pizza/search/">Poly Pizza</button>
  <button class="phu tim" data-u="https://polyhaven.com/models?s=">Poly Haven</button>
  <button class="phu tim" data-u="https://opengameart.org/art-search?keys=">OpenGameArt</button>
  <button class="phu tim" data-u="https://www.google.com/search?tbm=isch&tbs=ic:trans&q=">Ảnh PNG nền trong</button></div>
</header>
${nguons.map((n) => `<h2 style="margin:16px 16px 0">${esc(TEN_NGUON[n] || n)} (${list.filter((a) => a.nguon === n).length})</h2><div class="g">${list.filter((a) => a.nguon === n).map(card).join('')}</div>`).join('')}
<div class="hop"><h3>➕ Link / ID bạn tự tìm thêm (mỗi dòng một cái — Claude sẽ tải và đưa vào đợt duyệt sau)</h3><textarea id="them" placeholder="https://create.roblox.com/store/asset/123…&#10;https://sketchfab.com/3d-models/…"></textarea></div>
<div class="hop"><h3>Ghi chú cho Claude</h3><textarea id="gc" placeholder="(tuỳ chọn)"></textarea></div>
<script>
const LOAI=${JSON.stringify(loai)},LS='duyet-tim:'+LOAI,$=(i)=>document.getElementById(i),q=(s)=>[...document.querySelectorAll(s)];
let locN=null,locK=null,chiChon=false;
function luu(){try{localStorage.setItem(LS,JSON.stringify({chon:q('.the input:checked').map(i=>i.dataset.k),them:$('them').value,gc:$('gc').value}))}catch(e){}}
try{const s=JSON.parse(localStorage.getItem(LS)||'null');if(s){const c=new Set(s.chon||[]);if(c.size)q('.the input').forEach(i=>i.checked=c.has(i.dataset.k));$('them').value=s.them||'';$('gc').value=s.gc||''}}catch(e){}
function loc(){const t=$('q').value.trim().toLowerCase().split(/\\s+/).filter(Boolean);let h=0;
 q('.the').forEach(el=>{const ok=t.every(w=>el.dataset.tim.includes(w))&&(!locN||el.dataset.nguon===locN)&&(!locK||el.dataset.kieu===locK)&&(!chiChon||el.querySelector('input').checked);el.classList.toggle('an',!ok);if(ok)h++});
 $('hien').textContent=h;$('n').textContent=q('.the input:checked').length}
$('q').oninput=loc;document.addEventListener('change',()=>{loc();luu()});$('them').oninput=luu;$('gc').oninput=luu;
q('.loc').forEach(b=>b.onclick=()=>{const isN='nguon'in b.dataset,v=isN?b.dataset.nguon:b.dataset.kieu;if(isN)locN=locN===v?null:v;else locK=locK===v?null:v;
 q('.loc').forEach(x=>x.classList.toggle('on',('nguon'in x.dataset?locN===x.dataset.nguon:locK===x.dataset.kieu)));loc()});
$('chiChon').onclick=()=>{chiChon=!chiChon;$('chiChon').classList.toggle('on',chiChon);loc()};
q('.tim').forEach(b=>b.onclick=()=>{const t=$('tu').value.trim()||$('q').value.trim();if(!t){$('tu').focus();return}window.open(b.dataset.u+encodeURIComponent(t),'_blank','noopener')});
function kq(){return JSON.stringify({loai:LOAI,chon:q('.the input:checked').map(i=>({id:i.dataset.k,ten:i.dataset.t})),themLink:$('them').value.split(/\\n+/).map(s=>s.trim()).filter(Boolean),ghiChu:$('gc').value},null,1)}
$('chep').onclick=async()=>{try{await navigator.clipboard.writeText(kq());$('chep').textContent='✓ Đã chép'}catch(e){prompt('Chép:',kq())}setTimeout(()=>$('chep').textContent='📋 Chép lựa chọn',1500)};
$('gui').onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([kq()],{type:'application/json'}));a.download=LOAI+'-ketqua.json';a.click()};
loc();
</script></body></html>`;
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);
console.log(`${list.length} ứng viên (${chonCu.size} tích sẵn) → ${path.relative(GOC, out).replace(/\\/g, '/')} (${(html.length / 1048576).toFixed(1)} MB)`);
