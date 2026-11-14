#!/usr/bin/env node
// kit-trang.mjs — dựng trang xem kit (Cổng duyệt 2) cho kit định dạng A (docs/quy-trinh-dau-vao.md).
// Dùng: node tools/kit-trang.mjs kich-ban/<ep>   → kich-ban/<ep>/KIT.html
// Mỗi shot: khung storyboard (hinh/shot_<id>_*.png) | sơ đồ nhìn từ trên (máy, hướng nhìn, nhân vật) | số máy | ghi chú; có ô duyệt/sửa.
// Bấm "Tải kết quả duyệt" → file ket-qua_<ep>_cong-2.json (không cần máy chủ).
import fs from 'node:fs';
import path from 'node:path';

const thuMuc = path.resolve(process.argv[2] || '');
const doc = (f) => JSON.parse(fs.readFileSync(path.join(thuMuc, f), 'utf8').replace(/^﻿/, ''));
if (!process.argv[2] || !fs.existsSync(path.join(thuMuc, 'kit.json'))) { console.error('Dùng: node tools/kit-trang.mjs kich-ban/<ep> (cần kit.json, bang-shot.json)'); process.exit(2); }
const kit = doc('kit.json'), bs = doc('bang-shot.json');
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const so = (v) => Array.isArray(v) ? v.map((x) => (+x).toFixed(1).replace(/\.0$/, '')).join(', ') : esc(v);
const MAU = ['#e0a020', '#3b82f6', '#22a06b', '#d1495b', '#8b5cf6'];
const mauNv = Object.fromEntries((kit.nhanVat || []).map((n, i) => [n.id, MAU[i % MAU.length]]));
const tenNv = Object.fromEntries((bs.nhanVat || []).map((n) => [n.id, n.ten || n.id]));

function soDo(shot, bc) {
  // nhìn từ trên: x sang phải, z xuống dưới (z dương = gần người xem)
  const W = 260, H = Math.round(W * bc.sau / bc.rong), kx = W / bc.rong, kz = H / bc.sau;
  const X = (x) => (x + bc.rong / 2) * kx, Z = (z) => (z + bc.sau / 2) * kz;
  let g = `<rect x="0" y="0" width="${W}" height="${H}" fill="none" stroke="currentColor" stroke-opacity=".35"/>`;
  for (const [ten, p] of Object.entries(bc.diemDung || {})) g += `<circle cx="${X(p[0])}" cy="${Z(p[2])}" r="2.5" fill="currentColor" fill-opacity=".45"><title>${esc(ten)}</title></circle>`;
  const moc = [['dau', 'Đ'], ['giua', 'G'], ['cuoi', 'C']].filter(([k]) => shot.may?.[k]);
  moc.forEach(([k, chu], i) => {
    const m = shot.may[k], x = X(m.p[0]), z = Z(m.p[2]), nx = X(m.nhin[0]), nz = Z(m.nhin[2]);
    const op = k === 'cuoi' ? 1 : .55;
    g += `<line x1="${x}" y1="${z}" x2="${nx}" y2="${nz}" stroke="#a855f7" stroke-opacity="${op}" stroke-dasharray="3 3"/><rect x="${x - 5}" y="${z - 5}" width="10" height="10" fill="#a855f7" fill-opacity="${op}"/><text x="${x + 7}" y="${z + 4}" font-size="10" fill="#a855f7">${chu}</text>`;
    if (i > 0) { const t = shot.may[moc[i - 1][0]]; g += `<line x1="${X(t.p[0])}" y1="${Z(t.p[2])}" x2="${x}" y2="${z}" stroke="#a855f7" stroke-width="1.5"/>`; }
  });
  for (const n of shot.nhanVat || []) {
    const c = mauNv[n.id] || '#888', d = n.dau, e = n.cuoi || n.dau;
    g += `<line x1="${X(d[0])}" y1="${Z(d[2])}" x2="${X(e[0])}" y2="${Z(e[2])}" stroke="${c}" stroke-width="2"/><circle cx="${X(d[0])}" cy="${Z(d[2])}" r="4" fill="none" stroke="${c}" stroke-width="2"/><circle cx="${X(e[0])}" cy="${Z(e[2])}" r="4" fill="${c}"><title>${esc(tenNv[n.id] || n.id)}</title></circle>`;
  }
  return `<svg viewBox="-4 -4 ${W + 8} ${H + 8}" width="${W}" role="img" aria-label="Sơ đồ nhìn từ trên shot ${esc(shot.id)}">${g}</svg>`;
}

const hang = (kit.shots || []).map((s) => {
  const b = (bs.shots || []).find((x) => x.id === s.id) || {};
  const bc = (kit.boiCanh || []).find((x) => x.id === b.boiCanh) || kit.boiCanh[0];
  const anh = ['dau', 'giua', 'cuoi'].filter((v) => fs.existsSync(path.join(thuMuc, 'hinh', `shot_${s.id}_${v}.png`)));
  const may = ['dau', 'giua', 'cuoi'].filter((k) => s.may?.[k]).map((k) => `<tr><th>${{ dau: 'Đầu', giua: 'Giữa', cuoi: 'Cuối' }[k]}</th><td>${so(s.may[k].p)}</td><td>${so(s.may[k].nhin)}</td><td>${esc(s.may[k].fov)}°</td></tr>`).join('');
  const nv = (s.nhanVat || []).map((n) => `<tr><th><i style="background:${mauNv[n.id] || '#888'}"></i>${esc(tenNv[n.id] || n.id)}</th><td>${so(n.dau)}</td><td>${n.giua ? so(n.giua) : '—'}</td><td>${n.cuoi ? so(n.cuoi) : '—'}</td></tr>`).join('');
  return `<section class="shot" data-id="${esc(s.id)}"><h2>${esc(s.id)} <span class="tc ${esc(s.tinCay)}">tin cậy ${esc({ cao: 'cao', vua: 'vừa', thap: 'thấp' }[s.tinCay] || s.tinCay)}</span> <span class="mu">${esc(bc.id)} · ${esc(b.dur ?? '')} giây</span></h2>
<p class="mu">${esc(b.thoai ? `“${b.thoai}” — ` : '')}${esc(b.hanhDong || '')}</p>
<div class="luoi"><div class="anh">${anh.map((v) => `<figure><a href="hinh/shot_${esc(s.id)}_${v}.png"><img loading="lazy" src="hinh/shot_${esc(s.id)}_${v}.png" alt="Khung ${v} của ${esc(s.id)}"></a><figcaption>${{ dau: 'Đầu', giua: 'Giữa', cuoi: 'Cuối' }[v]}</figcaption></figure>`).join('')}</div>
<div class="so">${soDo(s, bc)}<p class="mu">Nhìn từ trên. Ô tím = máy (Đ đầu, G giữa, C cuối), nét đứt = hướng nhìn. Vòng rỗng = nhân vật lúc đầu, chấm đặc = lúc cuối. Chấm xám = điểm mốc.</p>
<table><thead><tr><th>Máy</th><th>Vị trí (x, y, z)</th><th>Nhìn vào</th><th>Góc dọc</th></tr></thead><tbody>${may}</tbody></table>
<table><thead><tr><th>Nhân vật</th><th>Đầu</th><th>Giữa</th><th>Cuối</th></tr></thead><tbody>${nv}</tbody></table></div></div>
<div class="duyet"><label><input type="radio" name="tt_${esc(s.id)}" value="duyet"> Duyệt</label><label><input type="radio" name="tt_${esc(s.id)}" value="sua"> Cần sửa</label><input type="text" placeholder="Ghi chú cho shot này (nếu cần sửa)" aria-label="Ghi chú ${esc(s.id)}"></div></section>`;
}).join('\n');

const bcBang = (kit.boiCanh || []).map((c) => `<tr><th>${esc(c.id)}</th><td>${esc(c.rong)} × ${esc(c.sau)} × ${esc(c.cao)}</td><td>${esc(c.anhSang?.kieu)} · độ sáng ${esc(c.anhSang?.luma)}</td><td>${Object.entries(c.diemDung || {}).map(([k, p]) => `${esc(k)} (${so(p)})`).join('<br>')}</td></tr>`).join('');
const nvBang = (kit.nhanVat || []).map((n) => `<tr><th><i style="background:${mauNv[n.id]}"></i>${esc(tenNv[n.id] || n.id)}</th><td>${esc(n.cao)} stud</td><td>${(n.mau || []).map((m) => `<i style="background:${esc(m)}" title="${esc(m)}"></i>`).join('')}</td></tr>`).join('');

const html = `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Bộ kit ${esc(kit.ep)}</title>
<style>:root{--bg:#f3f5f8;--p:#fff;--l:#d5dbe5;--f:#17202c;--m:#5d6a7e;--a:#1f6fd1}@media(prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#0e1116;--p:#161b23;--l:#2a3342;--f:#e8ecf2;--m:#8b96a8;--a:#4da3ff}}:root[data-theme="dark"]{--bg:#0e1116;--p:#161b23;--l:#2a3342;--f:#e8ecf2;--m:#8b96a8;--a:#4da3ff}
body{margin:0;background:var(--bg);color:var(--f);font:14px/1.5 system-ui,"Segoe UI",sans-serif;padding:16px 16px 90px}main{max-width:1000px;margin:0 auto}h1{font-size:22px;margin:0}h2{font-size:17px;margin:0 0 4px}.mu{color:var(--m);font-size:13px;margin:2px 0}
.shot,.khoi{background:var(--p);border:1px solid var(--l);border-radius:10px;padding:12px;margin-top:12px}.luoi{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1fr);gap:14px;margin-top:8px}@media(max-width:760px){.luoi{grid-template-columns:1fr}}
.anh{display:flex;gap:8px}.anh figure{margin:0;flex:1;min-width:0}.anh img{width:100%;border-radius:6px;display:block}figcaption{font-size:12px;color:var(--m);text-align:center}
table{border-collapse:collapse;width:100%;font-size:13px;margin-top:8px;font-variant-numeric:tabular-nums}th,td{padding:4px 6px;border-bottom:1px solid var(--l);text-align:left;vertical-align:top}thead th{color:var(--m);font-weight:600;font-size:12px}
i{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:5px;border:1px solid var(--l)}svg{max-width:100%;height:auto;color:var(--f)}
.tc{font-size:12px;font-weight:600;border:1px solid var(--l);border-radius:99px;padding:1px 8px}.tc.thap{border-color:#c2410c;color:#c2410c}.tc.vua{border-color:#9a6200;color:#9a6200}.tc.cao{border-color:#14804a;color:#14804a}
.duyet{display:flex;gap:12px;flex-wrap:wrap;align-items:center;margin-top:10px;border-top:1px solid var(--l);padding-top:8px}.duyet input[type=text]{flex:1;min-width:200px;font:inherit;padding:6px 8px;border:1px solid var(--l);border-radius:6px;background:var(--bg);color:var(--f)}
.thanh{position:fixed;left:0;right:0;bottom:0;background:var(--p);border-top:1px solid var(--l);padding:10px 16px;display:flex;gap:12px;align-items:center;justify-content:center;flex-wrap:wrap}button{font:inherit;font-weight:600;padding:8px 16px;border-radius:8px;border:1px solid var(--a);background:var(--a);color:#fff;cursor:pointer}button.phu{background:transparent;color:var(--a)}</style></head>
<body><main><h1>Bộ kit ${esc(kit.ep)} — Cổng duyệt 2</h1><p class="mu">Số đo Codex suy ra từ storyboard: kích thước bối cảnh, vị trí và chuyển động máy quay, chỗ đứng nhân vật. Đơn vị: stud. Gốc toạ độ ở tâm sàn mỗi bối cảnh. Dựng lúc ${esc(new Date().toLocaleString('vi-VN'))}.</p>
<div class="khoi"><h2>Nhân vật</h2><table><thead><tr><th>Tên</th><th>Cao</th><th>Màu</th></tr></thead><tbody>${nvBang}</tbody></table></div>
<div class="khoi"><h2>Bối cảnh</h2><table><thead><tr><th>Tên</th><th>Rộng × sâu × cao</th><th>Ánh sáng</th><th>Điểm mốc (x, y, z)</th></tr></thead><tbody>${bcBang}</tbody></table></div>
${hang}</main>
<div class="thanh"><button class="phu" id="het">Duyệt tất cả</button><button id="tai">Tải kết quả duyệt</button><span class="mu" id="st"></span></div>
<script>(function(){var KEY='kit-duyet-${esc(kit.ep)}',S={};try{S=JSON.parse(localStorage.getItem(KEY)||'{}')}catch(e){}
var ss=[].slice.call(document.querySelectorAll('.shot'));function luu(){try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}}
ss.forEach(function(el){var id=el.dataset.id,x=S[id]||{};el.querySelectorAll('input[type=radio]').forEach(function(r){if(r.value===x.tt)r.checked=true;r.onchange=function(){S[id]=Object.assign(S[id]||{},{tt:r.value});luu()}});var t=el.querySelector('input[type=text]');t.value=x.ghiChu||'';t.oninput=function(){S[id]=Object.assign(S[id]||{},{ghiChu:t.value});luu()}});
document.getElementById('het').onclick=function(){ss.forEach(function(el){var id=el.dataset.id;S[id]=Object.assign(S[id]||{},{tt:'duyet'});el.querySelector('input[value=duyet]').checked=true});luu()};
document.getElementById('tai').onclick=function(){var chua=ss.filter(function(el){return !(S[el.dataset.id]||{}).tt}).length;var o={ep:'${esc(kit.ep)}',cong:2,luc:new Date().toISOString(),shots:S,tatCaDuyet:ss.every(function(el){return (S[el.dataset.id]||{}).tt==='duyet'})};var b=new Blob([JSON.stringify(o,null,2)],{type:'application/json'}),l=document.createElement('a');l.href=URL.createObjectURL(b);l.download='ket-qua_${esc(kit.ep)}_cong-2.json';document.body.appendChild(l);l.click();l.remove();document.getElementById('st').textContent='Đã tải file ket-qua_${esc(kit.ep)}_cong-2.json'+(chua?' — còn '+chua+' shot chưa chọn':'')}})();</script></body></html>`;
const f = path.join(thuMuc, 'KIT.html');
fs.writeFileSync(f, html, 'utf8');
console.log(f);
console.log('file:///' + f.replace(/\\/g, '/').replace(/ /g, '%20'));
