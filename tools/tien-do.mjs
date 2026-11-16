// node tools/tien-do.mjs            — dựng trang tiến độ từ docs/tien-do.json → dist/tien-do.html (máy tính) + output/artifact/tien-do.html (đăng Artifact)
// node tools/tien-do.mjs nhan [--mot-lan] — máy nhận ô "Trả lời Claude" (cổng 8793) → nối vào docs/tien-do-tra-loi.md
// Việc: { ten, tt: xong|dang|do|chua|cho, ghiChu, pt: 0..100 (phần trăm, Claude ước lượng), tok: nghìn token agent đã dùng }
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
if (process.argv[2] === 'nhan') {
  const http = await import('node:http'); const once = process.argv.includes('--mot-lan');
  const H = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Private-Network': 'true' };
  http.createServer((q, r) => {
    if (q.method === 'OPTIONS') { r.writeHead(204, H); return r.end(); }
    if (q.url === '/ping') { r.writeHead(200, H); return r.end('ok'); }
    if (q.method === 'POST' && q.url === '/tra-loi') { let b = ''; q.on('data', (c) => { b += c; if (b.length > 2e5) q.destroy(); }); q.on('end', () => {
      let t = ''; try { t = String(JSON.parse(b).text || '').trim(); } catch {}
      if (!t) { r.writeHead(400, H); return r.end('rong'); }
      const f = path.join(ROOT, 'docs/tien-do-tra-loi.md'); fs.appendFileSync(f, `\n## ${new Date().toISOString()}\n${t}\n`);
      r.writeHead(200, H); r.end('ok'); console.log('DA-NHAN ' + f + '\n' + t); if (once) setTimeout(() => process.exit(0), 200); }); return; }
    r.writeHead(404, H); r.end();
  }).listen(8793, '127.0.0.1', () => console.log('MO http://127.0.0.1:8793 (chờ trả lời từ trang tiến độ)'));
  await new Promise(() => {});
}

const OUT = process.env.TIEN_DO_RA || ROOT;   // chỉ để test: thư mục gốc ghi dist/ + output/artifact/ (mặc định = repo)
const d = JSON.parse(fs.readFileSync(process.env.TIEN_DO_JSON || path.join(ROOT, 'docs/tien-do.json'), 'utf8'));
const TT = { dang: ['Đang làm', 'run'], do: ['Làm dở', 'part'], chua: ['Chưa làm', 'todo'], cho: ['Đang chờ', 'wait'], xong: ['Xong', 'ok'] };
const e = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const all = d.nhom.flatMap((n) => n.viec.map((v) => ({ ...v, nhom: n.ten, tap: n.tap || '' })));
const ptOf = (v) => v.tt === 'xong' ? 100 : Math.max(0, Math.min(99, v.pt ?? ({ dang: 40, do: 70, chua: 0, cho: 0 }[v.tt] ?? 0)));
const dem = (k) => all.filter((v) => v.tt === k).length;
const tongPt = Math.round(all.reduce((s, v) => s + ptOf(v), 0) / Math.max(1, all.length));
const tongTok = all.reduce((s, v) => s + (v.tok || 0), 0);
const fTok = (k) => k >= 1000 ? (k / 1000).toFixed(1).replace('.', ',') + ' triệu' : Math.round(k) + ' nghìn';
let id = 0; const o = (nhan) => `<input class="o" id="o${++id}" data-k="${e(nhan)}" placeholder="trả lời / đổi ý…" aria-label="Trả lời: ${e(nhan)}">`;
const dong = (v) => { const [t, c] = TT[v.tt] || TT.chua, p = ptOf(v); return `<div class="v" data-tt="${v.tt}" data-tap="${e(v.tap)}"><div class="hd"><span class="tag ${c}">${t}</span><span class="k">${e(v.nhom)}</span></div><div>${e(v.ten)}${v.ghiChu ? `<small>${e(v.ghiChu)}</small>` : ''}</div>` +
  (v.tt === 'dang' || v.tt === 'do' ? `<div class="pr"><div class="bar ${c}"><i style="width:${p}%"></i></div><span class="num">${p}%</span>${v.tok ? `<span class="num mu">· ${fTok(v.tok)} token</span>` : ''}</div>` : (v.tok ? `<div class="mu num">${fTok(v.tok)} token</div>` : '')) + o('VIỆC: ' + v.ten) + '</div>'; };
const the = [['can', `Cần bạn`, (d.canBan || []).length], ...Object.entries(TT).map(([k, [t]]) => [k, t, dem(k)]), ['chot', 'Đã chốt', (d.daChot || []).length], ['tatca', 'Tất cả', all.length],
  ...[...new Set(d.nhom.map((n) => n.tap).filter(Boolean))].map((t) => ['tap:' + t, t, all.filter((v) => v.tap === t).length])];   // mỗi tập một thẻ riêng (khoá `tap` của nhóm)
const macDinh = dem('dang') ? 'dang' : 'can';

// ---- Bảng trạng thái từng shot (tuỳ chọn): khoá `shotTheoTap` trong tien-do.json; thiếu khoá/thiếu file → bỏ qua lặng lẽ ----
const docJson = (f) => { try { return JSON.parse(fs.readFileSync(path.resolve(ROOT, f), 'utf8')); } catch { return null; } };
const mangHoa = (x) => Array.isArray(x) ? x : (x && typeof x === 'object' ? Object.entries(x).map(([k, v]) => ({ id: k, ...(v && typeof v === 'object' ? v : {}) })) : []);
const dsLoi = (x) => Array.isArray(x) ? x.map(String) : (x ? [String(x)] : []);
const gomShot = (m) => {
  const kj = m.khop ? docJson(m.khop) : null, cj = m.chuyenDong ? docJson(m.chuyenDong) : null;
  if (!kj && !cj) return null;
  const kh = kj && kj.shots && typeof kj.shots === 'object' && !Array.isArray(kj.shots) ? kj.shots : {};
  const cd = new Map(mangHoa(cj && cj.shots !== undefined ? cj.shots : cj).filter((x) => x && x.id != null).map((x) => [String(x.id), x]));
  const ids = [...new Set([...Object.keys(kh), ...cd.keys()])].sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
  return ids.map((sid) => {
    const k = kh[sid], c = cd.get(sid), loi = c ? dsLoi(c.loi) : [], cb = c ? dsLoi(c.canhBao) : [];
    const ktt = k && ['dat', 'lech', 'hong'].includes(k.tt) ? k.tt : null;
    const tt = (ktt === 'hong' || loi.length) ? 'hong' : (ktt === 'lech' || cb.length) ? 'lech' : (ktt || c) ? 'dat' : 'thieu';
    const ghi = [];
    if (k) { if (k.diem != null) ghi.push('điểm khớp ' + k.diem); if (k.nguocHuong) ghi.push('ngược hướng'); if (k.ghiChu) ghi.push(String(k.ghiChu)); }
    if (loi.length) ghi.push('lỗi chuyển động: ' + loi.join('; '));
    if (cb.length) ghi.push('cảnh báo chuyển động: ' + cb.join('; '));
    if (c && c.camDungIm) ghi.push('camera đứng im');
    if (c && c.nvDungIm) ghi.push('nhân vật đứng im');
    return { id: sid, tt, ghi: ghi.join(' · ') || (tt === 'thieu' ? 'chưa có dữ liệu' : 'không có ghi chú') };
  });
};
const SHOT_TT = { dat: ['✔', 'Đạt'], lech: ['▲', 'Lệch'], hong: ['✖', 'Hỏng'], thieu: ['?', 'Thiếu'] };
const shotTap = (Array.isArray(d.shotTheoTap) ? d.shotTheoTap : []).map((m) => ({ tap: String(m.tap || ''), ds: gomShot(m) })).filter((x) => x.tap && x.ds);
if (shotTap.length) the.push(...shotTap.map((x) => ['shot:' + x.tap, 'Shot · ' + x.tap, x.ds.length]));
const bangShot = (x) => {
  const n = Object.fromEntries(Object.keys(SHOT_TT).map((k) => [k, x.ds.filter((s) => s.tt === k).length])), tong = Math.max(1, x.ds.length);
  return `<div class="shotp" data-k="shot:${e(x.tap)}" hidden><div class="sdem num">${Object.entries(SHOT_TT).map(([k, [ky, t]]) => `<span class="st-${k}">${ky} ${t} ${n[k]}</span>`).join(' · ')} · tổng ${x.ds.length}</div>` +
    `<div class="sbar" role="img" aria-label="Tỉ lệ trạng thái shot">${Object.keys(SHOT_TT).map((k) => n[k] ? `<i class="sb-${k}" style="width:${(n[k] / tong * 100).toFixed(2)}%" title="${SHOT_TT[k][1]} ${n[k]}"></i>` : '').join('')}</div>` +
    `<div class="sgrid">${x.ds.map((s) => `<button type="button" class="sc sc-${s.tt}" data-note="${e(s.id + ' — ' + SHOT_TT[s.tt][1] + ': ' + s.ghi)}"><b>${e(s.id)}</b><span>${SHOT_TT[s.tt][0]} ${SHOT_TT[s.tt][1]}</span></button>`).join('')}</div>` +
    `<div class="snote mu" role="status" aria-live="polite">Bấm một ô để xem điểm khớp và lỗi chuyển động.</div></div>`;
};
const shotHtml = shotTap.map(bangShot).join('');
const shotCss = shotTap.length ? `
:root { --bad:#b3261e; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --bad:#ff7b72 } }
:root[data-theme="dark"] { --bad:#ff7b72 }
.shotp { display: flex; flex-direction: column; gap: 8px; } .sdem { font-size: 13px; font-weight: 600; }
.st-dat { color: var(--ok); } .st-lech { color: var(--part); } .st-hong { color: var(--bad); } .st-thieu { color: var(--todo); }
.sbar { display: flex; height: 10px; border-radius: 5px; overflow: hidden; background: var(--line); }
.sb-dat { background: var(--ok); } .sb-lech { background: var(--part); } .sb-hong { background: var(--bad); } .sb-thieu { background: var(--todo); }
.sgrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(88px, 1fr)); gap: 6px; }
.sc { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; background: var(--panel); color: var(--fg); border: 1px solid var(--line); border-left-width: 4px; border-radius: 6px; padding: 5px 7px; font: inherit; font-size: 12px; cursor: pointer; min-width: 0; text-align: left; }
.sc b { font-size: 13px; overflow-wrap: anywhere; } .sc[aria-pressed="true"] { outline: 2px solid var(--acc); outline-offset: 1px; }
.sc-dat { border-left-color: var(--ok); } .sc-dat span { color: var(--ok); } .sc-lech { border-left-color: var(--part); } .sc-lech span { color: var(--part); }
.sc-hong { border-left-color: var(--bad); } .sc-hong span { color: var(--bad); } .sc-thieu { border-left-color: var(--todo); border-left-style: dashed; } .sc-thieu span { color: var(--todo); }
.snote { background: var(--panel); border: 1px solid var(--line); border-radius: 8px; padding: 8px 10px; overflow-wrap: anywhere; }` : '';
const shotJs = shotTap.length ? `document.querySelectorAll('#ds .shotp').forEach((p) => { p.hidden = p.dataset.k !== k; }); if (k.startsWith('shot:')) document.getElementById('trong').hidden = true; ` : '';
const shotJs2 = shotTap.length ? `
document.querySelectorAll('.shotp').forEach((p) => { const nt = p.querySelector('.snote'); p.querySelectorAll('.sc').forEach((b) => { b.onclick = () => { p.querySelectorAll('.sc').forEach((x) => x.setAttribute('aria-pressed', x === b)); nt.textContent = b.dataset.note; }; }); });` : '';

const than = (artifact) => `
<main>
<h1>Tiến độ 3JS Studio</h1>
<div class="mu">Cập nhật ${e(d.capNhat)} · trang chỉ mới khi Claude vừa xong một lượt làm việc${artifact ? '' : ' (tải lại để xem bản mới)'}</div>
<section class="tong">
  <div class="pr"><b>Tổng</b><div class="bar ok"><i style="width:${tongPt}%"></i></div><span class="num">${tongPt}%</span></div>
  <div class="mu num">${dem('xong')}/${all.length} việc xong · ${dem('dang')} đang làm · agent phụ đã dùng khoảng ${fTok(tongTok)} token cho các việc có ghi số${d.tokenGhiChu ? ' · ' + e(d.tokenGhiChu) : ''}</div>
</section>
<nav class="tabs" role="tablist">${the.map(([k, t, n]) => `<button role="tab" data-tab="${k}" aria-selected="${k === macDinh}">${t} <span class="num">${n}</span></button>`).join('')}</nav>
<div class="list" id="ds">
${(d.canBan || []).map((x) => `<div class="v can" data-tt="can"><div>${e(x)}</div>${o('CẦN: ' + x)}</div>`).join('')}
${Object.keys(TT).map((k) => all.filter((v) => v.tt === k).map(dong).join('')).join('')}
${(d.daChot || []).map(([k, t]) => `<div class="v" data-tt="chot"><div class="hd"><span class="k">${e(k)}</span></div><div>${e(t)}</div>${o('ĐÃ CHỐT: ' + t)}</div>`).join('')}
<div class="v trong" id="trong" hidden>Không có mục nào trong thẻ này.</div>${shotHtml}
</div>
${(d.link || []).length && !artifact ? `<h2>Mở nhanh</h2><div class="lk">${d.link.map((l) => `<a href="${e(l.href)}">${e(l.ten)}</a>`).join('')}</div>` : ''}
<h2>Ghi chú chung</h2>
<textarea id="tl" placeholder="Quyết định mới hoặc việc muốn thêm…" aria-label="Ghi chú chung"></textarea>
<div class="send">${artifact ? '' : '<button id="gui">➤ Gửi tới Claude</button>'}<button id="chep" class="${artifact ? '' : 'phu'}">Chép tất cả câu trả lời</button><span id="st" class="mu">${artifact ? 'Chép xong thì dán vào chat với Claude' : ''}</span></div>
</main>`;

const css = `
:root { --bg:#f3f5f8; --panel:#ffffff; --line:#d5dbe5; --fg:#17202c; --mu:#5d6a7e; --acc:#1f6fd1; --ok:#14804a; --run:#1f6fd1; --part:#9a6200; --todo:#5d6a7e; --wait:#7a3fc4; --warn:#9a6200; --font:"Be Vietnam Pro","Segoe UI",system-ui,sans-serif; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --bg:#0e1116; --panel:#161b23; --line:#2a3342; --fg:#e8ecf2; --mu:#8b96a8; --acc:#4da3ff; --ok:#3ecf8e; --run:#4da3ff; --part:#f5b84a; --todo:#8b96a8; --wait:#c48bff; --warn:#f5b84a; color-scheme: dark } }
:root[data-theme="dark"] { --bg:#0e1116; --panel:#161b23; --line:#2a3342; --fg:#e8ecf2; --mu:#8b96a8; --acc:#4da3ff; --ok:#3ecf8e; --run:#4da3ff; --part:#f5b84a; --todo:#8b96a8; --wait:#c48bff; --warn:#f5b84a; color-scheme: dark }
body { background: var(--bg); color: var(--fg); font: 15px/1.5 var(--font); margin: 0; padding-block: 18px 48px; padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); }
main { max-width: 900px; margin: 0 auto; display: flex; flex-direction: column; gap: 10px; }
h1 { font-size: 21px; font-weight: 800; margin: 0; } h2 { font-size: 12px; letter-spacing: .08em; text-transform: uppercase; color: var(--mu); margin: 14px 0 0; font-weight: 600; }
.mu { color: var(--mu); font-size: 13px; } .num { font-variant-numeric: tabular-nums; }
.tong { background: var(--panel); border: 1px solid var(--line); border-radius: 10px; padding: 12px; display: flex; flex-direction: column; gap: 6px; }
.pr { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; } .pr .bar { flex: 1; min-width: 120px; }
.bar { height: 8px; border-radius: 4px; background: var(--line); overflow: hidden; } .bar i { display: block; height: 100%; background: currentColor; border-radius: 4px; }
.ok { color: var(--ok); } .run { color: var(--run); } .part { color: var(--part); } .todo { color: var(--todo); } .wait { color: var(--wait); }
.pr > .num, .pr > b { color: var(--fg); }
.tabs { display: flex; gap: 6px; flex-wrap: wrap; position: sticky; top: env(safe-area-inset-top, 0px); background: var(--bg); padding-block: 8px; z-index: 2; }
.tabs button { background: var(--panel); color: var(--fg); border: 1px solid var(--line); border-radius: 99px; padding: 6px 12px; font: inherit; font-weight: 600; cursor: pointer; }
.tabs button[aria-selected="true"] { background: var(--acc); border-color: var(--acc); color: #fff; }
.tabs button .num { opacity: .75; font-weight: 400; }
.list { display: flex; flex-direction: column; gap: 6px; }
.v { background: var(--panel); border: 1px solid var(--line); border-radius: 8px; padding: 10px 12px; display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.v.can { border-color: var(--warn); } .v.trong { color: var(--mu); text-align: center; }
.v .hd { display: flex; gap: 8px; align-items: baseline; flex-wrap: wrap; } .v small { display: block; color: var(--mu); font-size: 13px; }
.tag { padding: 2px 9px; border-radius: 99px; border: 1px solid currentColor; font-size: 12px; font-weight: 600; white-space: nowrap; }
.k { color: var(--mu); font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; }
.o, textarea { width: 100%; box-sizing: border-box; background: var(--bg); color: var(--fg); border: 1px solid var(--line); border-radius: 6px; padding: 8px 10px; font: inherit; }
.o:focus, textarea:focus, button:focus-visible { outline: 2px solid var(--acc); outline-offset: 1px; } .o.co { border-color: var(--warn); }
textarea { height: 100px; resize: vertical; }
.send { position: sticky; bottom: env(safe-area-inset-bottom, 0px); background: var(--bg); padding-block: 10px; display: flex; gap: 10px; align-items: center; flex-wrap: wrap; border-top: 1px solid var(--line); }
.send button { background: var(--acc); color: #fff; border: 0; border-radius: 8px; padding: 10px 16px; font: inherit; font-weight: 600; cursor: pointer; } .send button.phu { background: var(--panel); color: var(--fg); border: 1px solid var(--line); }
[hidden] { display: none !important; }
.lk { display: flex; gap: 14px; flex-wrap: wrap; } a { color: var(--acc); }${shotCss}`;

const js = (artifact) => `
const os = [...document.querySelectorAll('.o')], tl = document.getElementById('tl'), st = document.getElementById('st');
let luu = {}; try { luu = JSON.parse(localStorage.getItem('td') || '{}'); } catch {}
const ghi = () => { try { localStorage.setItem('td', JSON.stringify(luu)); } catch {} };
os.forEach((x) => { x.value = luu[x.dataset.k] || ''; x.classList.toggle('co', !!x.value); x.oninput = () => { luu[x.dataset.k] = x.value; x.classList.toggle('co', !!x.value); ghi(); }; });
tl.value = luu.__tl || ''; tl.oninput = () => { luu.__tl = tl.value; ghi(); };
const chon = (k) => { let n = 0; document.querySelectorAll('#ds .v[data-tt]').forEach((v) => { const on = k.startsWith('tap:') ? v.dataset.tap === k.slice(4) : k === 'tatca' ? (v.dataset.tt !== 'chot' && v.dataset.tt !== 'can') : v.dataset.tt === k; v.hidden = !on; if (on) n++; });
  document.getElementById('trong').hidden = n > 0; document.querySelectorAll('.tabs button').forEach((b) => b.setAttribute('aria-selected', b.dataset.tab === k)); ${shotJs}luu.__tab = k; ghi(); };
document.querySelectorAll('.tabs button').forEach((b) => { b.onclick = () => chon(b.dataset.tab); });
chon(${JSON.stringify(macDinh)});${shotJs2}
const gom = () => [...os.filter((x) => x.value.trim()).map((x) => '- ' + x.dataset.k + ' → ' + x.value.trim()), tl.value.trim()].filter(Boolean).join('\\n');
const xoa = () => { os.forEach((x) => { x.value = ''; x.classList.remove('co'); }); tl.value = ''; luu = { __tab: luu.__tab }; ghi(); };
document.getElementById('chep').onclick = async () => { const t = gom(); if (!t) { st.textContent = 'Chưa có ô nào được ghi'; return; }
  try { await navigator.clipboard.writeText(t); st.textContent = 'Đã chép ' + t.split('\\n').length + ' dòng — dán vào chat với Claude'; } catch { tl.value = t; tl.focus(); tl.select(); st.textContent = 'Không chép tự động được: đã gom vào ô ghi chú, hãy chọn và chép tay'; } };
${artifact ? '' : `const U = 'http://127.0.0.1:8793';
fetch(U + '/ping').then(() => { st.textContent = 'Claude đang chờ nhận'; }).catch(() => { st.textContent = 'Máy nhận chưa bật → dùng nút Chép rồi dán vào chat'; });
document.getElementById('gui').onclick = async () => { const nd = gom(); if (!nd) { st.textContent = 'Chưa có ô nào được ghi'; return; }
  try { const r = await fetch(U + '/tra-loi', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: nd }) }); if (!r.ok) throw 0; st.textContent = 'Đã gửi tới Claude lúc ' + new Date().toLocaleTimeString('vi'); xoa(); }
  catch { st.textContent = 'Không gửi được (máy nhận chưa bật) → bấm Chép rồi dán vào chat'; } };`}`;

const font = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;600;800&display=swap">';
fs.mkdirSync(path.join(OUT, 'dist'), { recursive: true }); fs.mkdirSync(path.join(OUT, 'output/artifact'), { recursive: true });
fs.writeFileSync(path.join(OUT, 'dist/tien-do.html'), `<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>Tiến độ 3JS Studio</title><meta name="viewport" content="width=device-width,initial-scale=1">${font}<style>${css}</style></head><body>${than(false)}<script>${js(false)}</script></body></html>`);
fs.writeFileSync(path.join(OUT, 'output/artifact/tien-do.html'), `<title>Tiến độ 3JS Studio</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n${font}\n<style>${css}</style>${than(true)}<script>${js(true)}</script>\n`);
console.log(`tien-do: ${all.length} việc, tổng ${tongPt}% — ` + Object.entries(TT).map(([k, [t]]) => `${t} ${dem(k)}`).join(', ') + ` · token ${fTok(tongTok)}`);
// --dang: dựng + đăng web 3js.tuanchau.io.vn (tools/dang-web.mjs). Tắt bằng cách không truyền cờ.
if (process.argv.includes('--dang')) { const { dang } = await import('./dang-web.mjs'); try { dang(); } catch (x) { console.error('dang-web: ' + x.message); process.exitCode = 1; } }
