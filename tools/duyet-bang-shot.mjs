#!/usr/bin/env node
// Cổng duyệt 1: node tools/duyet-bang-shot.mjs <thư mục tập> [dung | nhan [--mot-lan] [--cong 8794] | doc]
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath, pathToFileURL } from 'node:url';

const CONG_MAC = 8794;
const docJson = f => JSON.parse(fs.readFileSync(f, 'utf8').replace(/^﻿/, ''));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const NHAN = { loai: { zoomIn: 'Zoom vào', zoomOut: 'Zoom ra', lia: 'Lia', theo: 'Bám theo', dung: 'Đứng yên', doiHuong: 'Đổi hướng' },
  khung: { toan: 'Toàn', trung: 'Trung', can: 'Cận', 'dac-ta': 'Đặc tả' },
  goc: { 'ngang-mat': 'Ngang mắt', 'tren-xuong': 'Trên xuống', 'duoi-len': 'Dưới lên', 'qua-vai': 'Qua vai' } };

// ---------- tóm tắt ----------
export function tomTat(duyet, bangShot) {
  const d = duyet || {};
  const muc = [];
  let nDuyet = 0, nSua = 0, nChua = 0;
  const nhom = [['nhanVat', 'nhanVat'], ['boiCanh', 'boiCanh'], ['shots', 'shots']];
  for (const [kd, kb] of nhom) {
    for (const it of bangShot[kb] || []) {
      const x = d[kd]?.[it.id];
      if (x?.tt === 'duyet') nDuyet++;
      else if (x?.tt === 'sua') { nSua++; muc.push({ loai: kd, id: it.id, ghiChu: x.ghiChu || '' }); }
      else nChua++;
    }
  }
  return { duyet: nDuyet, sua: nSua, chua: nChua, muc };
}
const inTomTat = (t, log = console.log) => {
  log(`Duyệt: ${t.duyet} · cần sửa: ${t.sua} · chưa duyệt: ${t.chua}`);
  for (const m of t.muc) log(`  SỬA ${m.loai}/${m.id}${m.ghiChu ? ': ' + m.ghiChu : ''}`);
};

// ---------- dựng trang ----------
const the = (loai, it, anh) => `<article class="the" data-k="${loai}" data-id="${esc(it.id)}">
<div class="anh">${anh ? `<img loading="lazy" src="tham-chieu/${loai === 'nhanVat' ? 'nv' : 'bc'}_${esc(it.id)}.png" alt="${esc(it.ten)}" onerror="this.parentNode.innerHTML='<span class=\\'chua\\'>chưa có ảnh</span>'">` : '<span class="chua">chưa có ảnh</span>'}</div>
<div class="nd"><h3>${esc(it.ten || it.id)} <small>${esc(it.id)}</small></h3><p>${esc(it.moTa)}</p>${nut()}</div></article>`;
const nut = () => `<div class="nut"><button class="b-duyet" data-tt="duyet">Duyệt</button><button class="b-sua" data-tt="sua">Sửa</button></div><textarea rows="1" placeholder="Ghi chú…"></textarea>`;

export function dungTrang(bs, { coAnh = true } = {}) {
  const co = typeof coAnh === 'function' ? coAnh : () => !!coAnh;
  const shots = bs.shots || [];
  const tenBc = Object.fromEntries((bs.boiCanh || []).map(b => [b.id, b.ten || b.id]));
  const tenNv = Object.fromEntries((bs.nhanVat || []).map(b => [b.id, b.ten || b.id]));
  const tong = shots.reduce((s, x) => s + (+x.dur || 0), 0);
  const theoHinh = { 1: 0, 2: 0, 3: 0 };
  for (const s of shots) if (theoHinh[s.hinh] !== undefined) theoHinh[s.hinh]++;
  const tongHinh = theoHinh[1] + 2 * theoHinh[2] + 3 * theoHinh[3];
  const thuTu = [...new Set(shots.map(s => s.boiCanh))];
  const dongShot = s => {
    const c = s.camera || {}, kh = c.coKhung || [];
    const mt = [['Đầu', s.dau], ['Giữa', s.giua], ['Cuối', s.cuoi]].filter(x => x[1]).map(x => `<li><b>${x[0]}:</b> ${esc(x[1])}</li>`).join('');
    return `<article class="shot" data-k="shots" data-id="${esc(s.id)}">
<div class="dau"><b>${esc(s.id)}</b><span>${esc(s.dur)}s</span><span class="hinh">${esc(s.hinh)} hình</span></div>
${s.thoai ? `<p class="thoai">“${esc(s.thoai)}”</p>` : '<p class="thoai mu">(không thoại)</p>'}
<p class="cam">${esc(NHAN.loai[c.loai] || c.loai)} · ${esc(NHAN.goc[c.gocMay] || c.gocMay)} · ${esc(NHAN.khung[kh[0]] || kh[0] || '')} → ${esc(NHAN.khung[kh[1]] || kh[1] || '')}</p>
<p class="mu">${(s.nhanVat || []).map(i => esc(tenNv[i] || i)).join(', ') || 'không nhân vật'}</p>
<ul>${mt}</ul>${s.hanhDong ? `<p class="hd"><b>Hành động:</b> ${esc(s.hanhDong)}</p>` : ''}${nut()}</article>`;
  };
  const nhomShot = thuTu.map(b => `<h3 class="bc">${esc(tenBc[b] || b)} <small>${shots.filter(s => s.boiCanh === b).length} shot</small></h3>${shots.filter(s => s.boiCanh === b).map(dongShot).join('')}`).join('');
  const du = { nhanVat: (bs.nhanVat || []).map(x => x.id), boiCanh: (bs.boiCanh || []).map(x => x.id), shots: shots.map(x => x.id) };
  const dl = JSON.stringify({ ep: bs.ep, cong: CONG_MAC, ...du }).replace(/</g, '\\u003c');
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Duyệt bảng shot — ${esc(bs.ep)}</title><style>
:root{--n:#fff;--c:#f3f4f6;--v:#d1d5db;--ch:#111827;--mu:#6b7280;--ok:#15803d;--okn:#dcfce7;--sua:#b45309;--suan:#fef3c7;--ac:#2563eb}
@media(prefers-color-scheme:dark){:root{--n:#111318;--c:#1b1e26;--v:#333845;--ch:#e5e7eb;--mu:#9ca3af;--ok:#4ade80;--okn:#14301f;--sua:#fbbf24;--suan:#3a2c0c;--ac:#60a5fa}}
*{box-sizing:border-box}body{margin:0;background:var(--n);color:var(--ch);font:15px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
main{max-width:900px;margin:0 auto;padding:0 16px 120px}h1{font-size:20px;margin:16px 0 4px}h2{font-size:17px;margin:28px 0 8px;border-bottom:1px solid var(--v);padding-bottom:4px}h3{font-size:15px;margin:0 0 4px}small,.mu{color:var(--mu);font-weight:400}
.tk{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}.tk span{background:var(--c);border-radius:8px;padding:3px 10px;font-size:13px}
.the,.shot{background:var(--c);border:2px solid transparent;border-radius:10px;padding:10px;margin:8px 0;overflow-wrap:anywhere}
.the{display:flex;gap:12px;flex-wrap:wrap}.anh{width:160px;max-width:100%;min-height:90px;background:var(--n);border-radius:8px;display:flex;align-items:center;justify-content:center}.anh img{max-width:100%;border-radius:8px}.chua{color:var(--mu);font-size:13px}
.nd{flex:1;min-width:200px}p{margin:2px 0}ul{margin:4px 0;padding-left:18px}
.dau{display:flex;gap:10px;align-items:center}.dau .hinh{background:var(--n);border-radius:6px;padding:0 6px;font-size:13px}.thoai{font-style:italic}.cam{color:var(--ac);font-size:13px}
.nut{display:flex;gap:8px;margin:8px 0 4px}button{font:inherit;border:1px solid var(--v);background:var(--n);color:var(--ch);border-radius:8px;padding:6px 14px;cursor:pointer;min-height:36px}
textarea{width:100%;font:inherit;background:var(--n);color:var(--ch);border:1px solid var(--v);border-radius:8px;padding:6px;resize:vertical}
[data-tt=duyet].on{background:var(--okn);border-color:var(--ok);color:var(--ok)}[data-tt=sua].on{background:var(--suan);border-color:var(--sua);color:var(--sua)}
.tt-duyet{border-color:var(--ok)}.tt-sua{border-color:var(--sua)}
.bar{position:fixed;left:0;right:0;bottom:0;background:var(--n);border-top:1px solid var(--v);padding:8px 16px;display:flex;gap:8px;flex-wrap:wrap;align-items:center}.bar .st{flex:1;min-width:140px;font-size:13px;color:var(--mu)}
.chinh{background:var(--ac);color:#fff;border-color:var(--ac)}
</style></head><body><main>
<h1>Duyệt bảng shot — ${esc(bs.ep)}</h1>
<div class="tk"><span>${shots.length} shot</span><span>${+tong.toFixed(2)} giây</span><span>1 hình: ${theoHinh[1]}</span><span>2 hình: ${theoHinh[2]}</span><span>3 hình: ${theoHinh[3]}</span><span>Sẽ vẽ ${tongHinh} hình</span></div>
<button id="tatca">Duyệt tất cả shot</button>
<h2>1. Nhân vật</h2>${(bs.nhanVat || []).map(x => the('nhanVat', x, co('nhanVat', x.id))).join('') || '<p class="mu">Không có.</p>'}
<h2>2. Bối cảnh</h2>${(bs.boiCanh || []).map(x => the('boiCanh', x, co('boiCanh', x.id))).join('') || '<p class="mu">Không có.</p>'}
<h2>3. Bảng shot</h2>${nhomShot}
</main><div class="bar"><button id="gui" class="chinh">Gửi</button><button id="chep">Chép</button><span class="st" id="st"></span></div>
<script>(function(){var D=${dl},KEY='duyet1-'+D.ep,S={nhanVat:{},boiCanh:{},shots:{}},st=document.getElementById('st');
try{S=Object.assign(S,JSON.parse(localStorage.getItem(KEY)||'{}'))}catch(e){}
function luu(){try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}}
function ve(el){var x=S[el.dataset.k][el.dataset.id]||{};el.classList.toggle('tt-duyet',x.tt==='duyet');el.classList.toggle('tt-sua',x.tt==='sua');
[].forEach.call(el.querySelectorAll('button[data-tt]'),function(b){b.classList.toggle('on',b.dataset.tt===x.tt)});var t=el.querySelector('textarea');if(t&&t.value!==(x.ghiChu||''))t.value=x.ghiChu||''}
function dat(k,id,f){var o=S[k][id]||(S[k][id]={});f(o)}
function tat(){return Object.keys(D).filter(function(k){return k!=='ep'&&k!=='cong'}).every(function(k){return D[k].every(function(id){return (S[k][id]||{}).tt==='duyet'})})}
function goi(){return JSON.stringify({luc:new Date().toISOString(),nhanVat:S.nhanVat,boiCanh:S.boiCanh,shots:S.shots,tatCaDuyet:tat()},null,1)}
var els=[].slice.call(document.querySelectorAll('[data-k]'));els.forEach(ve);
document.addEventListener('click',function(e){var b=e.target.closest('button[data-tt]');if(!b)return;var el=b.closest('[data-k]');dat(el.dataset.k,el.dataset.id,function(o){o.tt=o.tt===b.dataset.tt?undefined:b.dataset.tt});luu();ve(el)});
document.addEventListener('input',function(e){if(e.target.tagName!=='TEXTAREA')return;var el=e.target.closest('[data-k]');dat(el.dataset.k,el.dataset.id,function(o){o.ghiChu=e.target.value});luu()});
document.getElementById('tatca').onclick=function(){D.shots.forEach(function(id){dat('shots',id,function(o){o.tt='duyet'})});luu();els.forEach(ve)};
document.getElementById('chep').onclick=function(){var t=goi();(navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(function(){st.textContent='Đã chép — dán vào chat với Claude'},function(){var a=document.createElement('textarea');a.value=t;document.body.appendChild(a);a.select();try{document.execCommand('copy');st.textContent='Đã chép — dán vào chat với Claude'}catch(x){st.textContent='Không chép được'}a.remove()})};
document.getElementById('gui').onclick=function(){fetch('http://127.0.0.1:'+D.cong+'/gui',{method:'POST',headers:{'content-type':'application/json'},body:goi()}).then(function(r){if(!r.ok)throw 0;st.textContent='Đã gửi lúc '+new Date().toLocaleTimeString('vi')}).catch(function(){st.textContent='Không gửi được (máy nhận chưa bật) — bấm Chép rồi dán vào chat'})}})();</script></body></html>`;
}

// ---------- máy nhận ----------
export function moMay(thuMuc, { cong = CONG_MAC, motLan = false, log = console.log } = {}) {
  const bs = docJson(path.join(thuMuc, 'bang-shot.json'));
  let congThat = cong;
  const hostOk = h => !!h && new RegExp(`^(127\\.0\\.0\\.1|localhost):${congThat}$`).test(h);
  const originOk = o => o === undefined || o === 'null' || o === 'file://' || /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(o);
  const sv = http.createServer((req, res) => {
    const org = req.headers.origin;
    const h = { 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': org === undefined ? '*' : org, Vary: 'Origin' };
    const tra = (ma, nd, kieu = 'text/plain; charset=utf-8') => { res.writeHead(ma, { ...h, 'Content-Type': kieu }); res.end(nd); };
    if (!hostOk(req.headers.host)) return tra(403, 'host không hợp lệ');
    if (!originOk(org)) return tra(403, 'origin không hợp lệ');
    const pn = (req.url || '').split('?')[0];
    if (req.method === 'OPTIONS') {
      const hh = { ...h, 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '600' };
      if (req.headers['access-control-request-private-network']) hh['Access-Control-Allow-Private-Network'] = 'true';
      res.writeHead(204, hh); return res.end();
    }
    if (req.method === 'GET' && pn === '/ping') return tra(200, JSON.stringify({ ung: 'duyet-1', ep: bs.ep }), 'application/json');
    if (req.method !== 'POST' || pn !== '/gui') return tra(404, 'không có');
    const bufs = []; let n = 0, qua = false;
    req.on('data', c => { n += c.length; if (n > 2 ** 21) { if (!qua) { qua = true; tra(413, 'quá 2 MB'); } } else bufs.push(c); });
    req.on('end', () => {
      if (qua) return;
      let kq; try { kq = JSON.parse(Buffer.concat(bufs).toString('utf8')); } catch { return tra(400, 'JSON sai'); }
      if (!kq || typeof kq !== 'object') return tra(400, 'JSON sai');
      const sach = o => Object.fromEntries(Object.entries(o && typeof o === 'object' ? o : {}).map(([id, x]) => [id, { tt: x?.tt === 'duyet' || x?.tt === 'sua' ? x.tt : undefined, ghiChu: String(x?.ghiChu ?? '') }]).map(([id, x]) => [id, x.tt ? x : { ghiChu: x.ghiChu }]));
      const out = { luc: kq.luc || new Date().toISOString(), nhanVat: sach(kq.nhanVat), boiCanh: sach(kq.boiCanh), shots: sach(kq.shots), tatCaDuyet: false };
      const t = tomTat(out, bs);
      out.tatCaDuyet = t.sua === 0 && t.chua === 0;
      const f = path.join(thuMuc, 'duyet-1.json');
      fs.writeFileSync(f, JSON.stringify(out, null, 1) + '\n');
      log(`DA-NHAN ${f}`); inTomTat(t, log);
      tra(200, JSON.stringify({ ok: true, tatCaDuyet: out.tatCaDuyet }), 'application/json');
      if (motLan) res.on('finish', () => setTimeout(() => { sv.close(); sv.closeAllConnections?.(); }, 20));
    });
  });
  return new Promise((ok, loi) => {
    sv.once('error', loi);
    sv.listen(cong, '127.0.0.1', () => { congThat = sv.address().port; log(`NHAN http://127.0.0.1:${congThat}/gui  (ghi ${path.join(thuMuc, 'duyet-1.json')})`); ok({ server: sv, cong: congThat }); });
  });
}

// ---------- CLI ----------
export function dungFile(thuMuc) {
  const bs = docJson(path.join(thuMuc, 'bang-shot.json'));
  const html = dungTrang(bs, { coAnh: (loai, id) => fs.existsSync(path.join(thuMuc, 'tham-chieu', `${loai === 'nhanVat' ? 'nv' : 'bc'}_${id}.png`)) });
  const f = path.join(thuMuc, 'duyet-1.html');
  fs.writeFileSync(f, html);
  return f;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const a = process.argv.slice(2), pos = a.filter(x => !x.startsWith('--') && a[a.indexOf(x) - 1] !== '--cong');
  const thuMuc = path.resolve(pos[0] || ''), lenh = pos[1] || 'dung';
  if (!pos[0] || !fs.existsSync(path.join(thuMuc, 'bang-shot.json'))) { console.error('Dùng: node tools/duyet-bang-shot.mjs <thư mục tập> [dung|nhan [--mot-lan] [--cong N]|doc] (cần bang-shot.json)'); process.exit(2); }
  if (lenh === 'dung') { const f = dungFile(thuMuc); console.log(f); console.log(pathToFileURL(f).href); }
  else if (lenh === 'nhan') {
    const i = a.indexOf('--cong');
    await moMay(thuMuc, { cong: i >= 0 ? +a[i + 1] : CONG_MAC, motLan: a.includes('--mot-lan') });
  } else if (lenh === 'doc') {
    const f = path.join(thuMuc, 'duyet-1.json');
    if (!fs.existsSync(f)) { console.log('Chưa có duyet-1.json'); process.exit(1); }
    const d = docJson(f), t = tomTat(d, docJson(path.join(thuMuc, 'bang-shot.json')));
    inTomTat(t); process.exit(t.sua === 0 && t.chua === 0 && d.tatCaDuyet ? 0 : 1);
  } else { console.error('Lệnh lạ: ' + lenh); process.exit(2); }
}
