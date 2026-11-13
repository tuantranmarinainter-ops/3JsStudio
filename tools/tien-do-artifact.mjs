// node tools/tien-do-artifact.mjs  — dựng bản trang tiến độ để đăng Artifact (xem trên điện thoại): output/artifact/tien-do.html
// Cùng dữ liệu docs/tien-do.json với tools/tien-do.mjs. Không gọi localhost (điện thoại không tới được) → trả lời bằng nút Chép rồi dán vào chat.
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const d = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/tien-do.json'), 'utf8'));
const TT = { xong: ['Xong', 'ok'], dang: ['Đang làm', 'run'], do: ['Làm dở', 'part'], chua: ['Chưa làm', 'todo'], cho: ['Đang chờ', 'wait'] };
const e = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const all = d.nhom.flatMap((n) => n.viec); const dem = (k) => all.filter((v) => v.tt === k).length;
let id = 0; const o = (nhan) => `<input class="o" id="o${++id}" data-k="${e(nhan)}" placeholder="trả lời / đổi ý…" aria-label="Trả lời cho: ${e(nhan)}">`;
const html = `<title>Tiến độ 3JS Studio</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;600;800&display=swap">
<style>
/* Bố cục: một cột đọc dọc cho điện thoại; mỗi dòng = nhãn trạng thái + nội dung + ô trả lời xếp dưới. */
:root { --bg:#f3f5f8; --panel:#ffffff; --line:#d5dbe5; --fg:#17202c; --mu:#5d6a7e; --acc:#1f6fd1;
  --ok:#14804a; --run:#1f6fd1; --part:#9a6200; --todo:#5d6a7e; --wait:#7a3fc4; --warn:#9a6200;
  --font: "Be Vietnam Pro", "Segoe UI", system-ui, sans-serif; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --bg:#0e1116; --panel:#161b23; --line:#2a3342; --fg:#e8ecf2; --mu:#8b96a8; --acc:#4da3ff;
  --ok:#3ecf8e; --run:#4da3ff; --part:#f5b84a; --todo:#8b96a8; --wait:#c48bff; --warn:#f5b84a; color-scheme: dark } }
:root[data-theme="dark"] { --bg:#0e1116; --panel:#161b23; --line:#2a3342; --fg:#e8ecf2; --mu:#8b96a8; --acc:#4da3ff;
  --ok:#3ecf8e; --run:#4da3ff; --part:#f5b84a; --todo:#8b96a8; --wait:#c48bff; --warn:#f5b84a; color-scheme: dark }
body { background: var(--bg); color: var(--fg); font: 15px/1.5 var(--font); padding-block: 18px 48px; padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); }
main { max-width: 860px; margin: 0 auto; display: flex; flex-direction: column; gap: 10px; }
h1 { font-size: 21px; font-weight: 800; margin: 0; text-wrap: balance; }
h2 { font-size: 12px; letter-spacing: .08em; text-transform: uppercase; color: var(--mu); margin: 16px 0 0; font-weight: 600; }
.mu { color: var(--mu); font-size: 13px; }
.sum { display: flex; gap: 6px; flex-wrap: wrap; }
.tag { padding: 2px 9px; border-radius: 99px; border: 1px solid currentColor; font-size: 12px; font-weight: 600; white-space: nowrap; font-variant-numeric: tabular-nums; }
.ok { color: var(--ok); } .run { color: var(--run); } .part { color: var(--part); } .todo { color: var(--todo); } .wait { color: var(--wait); }
.bar { height: 8px; border-radius: 4px; background: var(--line); overflow: hidden; display: flex; } .bar i { display: block; height: 100%; background: currentColor; }
.list { display: flex; flex-direction: column; gap: 6px; }
.v { background: var(--panel); border: 1px solid var(--line); border-radius: 8px; padding: 10px 12px; display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.v.can { border-color: var(--warn); }
.v .hd { display: flex; gap: 8px; align-items: baseline; flex-wrap: wrap; }
.v small { display: block; color: var(--mu); font-size: 13px; }
.k { color: var(--mu); font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; }
.o, textarea { width: 100%; background: var(--bg); color: var(--fg); border: 1px solid var(--line); border-radius: 6px; padding: 8px 10px; font: inherit; }
.o:focus, textarea:focus, button:focus-visible { outline: 2px solid var(--acc); outline-offset: 1px; }
.o.co { border-color: var(--warn); }
textarea { height: 110px; resize: vertical; }
button { background: var(--acc); color: #fff; border: 0; border-radius: 8px; padding: 10px 16px; font: inherit; font-weight: 600; cursor: pointer; }
.send { position: sticky; bottom: env(safe-area-inset-bottom, 0px); background: var(--bg); padding-block: 10px; display: flex; gap: 10px; align-items: center; flex-wrap: wrap; border-top: 1px solid var(--line); }
</style>
<main>
<h1>Tiến độ 3JS Studio</h1>
<div class="mu">Cập nhật ${e(d.capNhat)} · bản xem trên điện thoại; trang chỉ mới khi Claude đăng lại sau một lượt làm việc</div>
<div class="sum">${Object.entries(TT).map(([k, [t, c]]) => `<span class="tag ${c}">${t} ${dem(k)}</span>`).join('')}</div>
<div class="bar">${Object.entries(TT).map(([k, [, c]]) => `<i class="${c}" style="width:${dem(k) / all.length * 100}%"></i>`).join('')}</div>
${(d.canBan || []).length ? `<h2>Cần bạn làm / trả lời (${d.canBan.length})</h2><div class="list">${d.canBan.map((x) => `<div class="v can"><div>${e(x)}</div>${o('CẦN: ' + x)}</div>`).join('')}</div>` : ''}
<h2>Đã chốt (${(d.daChot || []).length})</h2><div class="list">${(d.daChot || []).map(([k, t]) => `<div class="v"><div class="hd"><span class="k">${e(k)}</span></div><div>${e(t)}</div>${o('ĐÃ CHỐT: ' + t)}</div>`).join('')}</div>
${d.nhom.map((n) => `<h2>${e(n.ten)}</h2><div class="list">` + n.viec.map((v) => { const [t, c] = TT[v.tt] || TT.chua; return `<div class="v"><div class="hd"><span class="tag ${c}">${t}</span></div><div>${e(v.ten)}${v.ghiChu ? `<small>${e(v.ghiChu)}</small>` : ''}</div>${o('VIỆC: ' + v.ten)}</div>`; }).join('') + '</div>').join('')}
<h2>Ghi chú chung</h2>
<textarea id="tl" placeholder="Quyết định mới hoặc việc muốn thêm…" aria-label="Ghi chú chung"></textarea>
<div class="send"><button id="chep">Chép tất cả câu trả lời</button><span id="st" class="mu">Chép xong thì dán vào chat với Claude</span></div>
</main>
<script>
const os = [...document.querySelectorAll('.o')], tl = document.getElementById('tl'), st = document.getElementById('st');
let luu = {}; try { luu = JSON.parse(localStorage.getItem('td') || '{}'); } catch {}
const ghi = () => { try { localStorage.setItem('td', JSON.stringify(luu)); } catch {} };
os.forEach((x) => { x.value = luu[x.dataset.k] || ''; x.classList.toggle('co', !!x.value); x.oninput = () => { luu[x.dataset.k] = x.value; x.classList.toggle('co', !!x.value); ghi(); }; });
tl.value = luu.__tl || ''; tl.oninput = () => { luu.__tl = tl.value; ghi(); };
const gom = () => [...os.filter((x) => x.value.trim()).map((x) => '- ' + x.dataset.k + ' → ' + x.value.trim()), tl.value.trim()].filter(Boolean).join('\\n');
document.getElementById('chep').onclick = async () => { const t = gom(); if (!t) { st.textContent = 'Chưa có ô nào được ghi'; return; }
  try { await navigator.clipboard.writeText(t); st.textContent = 'Đã chép ' + t.split('\\n').length + ' dòng — dán vào chat với Claude'; }
  catch { tl.value = t; tl.focus(); tl.select(); st.textContent = 'Không chép tự động được: đã gom vào ô ghi chú, hãy chọn và chép tay'; } };
</script>
`;
const out = path.join(ROOT, 'output/artifact'); fs.mkdirSync(out, { recursive: true }); fs.writeFileSync(path.join(out, 'tien-do.html'), html);
console.log('output/artifact/tien-do.html');
