// node tools/tien-do.mjs  — dựng dist/tien-do.html từ docs/tien-do.json (bảng tiến độ để người dùng tự xem, không phải hỏi).
// Trạng thái (tt): xong | dang (đang làm) | do (làm dở, còn bước) | chua | cho (chờ người dùng / chờ việc khác).
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const d = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/tien-do.json'), 'utf8'));
const TT = { xong: ['Xong', '#3ecf8e'], dang: ['Đang làm', '#4da3ff'], do: ['Làm dở', '#f5b84a'], chua: ['Chưa làm', '#8b96a8'], cho: ['Đang chờ', '#c48bff'] };
const e = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const all = d.nhom.flatMap((n) => n.viec); const dem = (k) => all.filter((v) => v.tt === k).length;
const html = `<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>Tiến độ 3JS Studio</title><meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{margin:0;background:#0e1116;color:#e8ecf2;font:14px/1.5 "Be Vietnam Pro","Segoe UI",system-ui,sans-serif}main{max-width:980px;margin:0 auto;padding:22px 16px 60px}
h1{font-size:20px;margin:0 0 4px}h2{font-size:13px;letter-spacing:.8px;text-transform:uppercase;color:#8b96a8;margin:26px 0 8px}.mu{color:#8b96a8}
.sum{display:flex;gap:8px;flex-wrap:wrap;margin:14px 0}.sum span,.tag{padding:3px 10px;border-radius:99px;border:1px solid;font-size:12px;font-weight:700;white-space:nowrap}
.bar{height:8px;border-radius:4px;background:#1d2430;overflow:hidden;display:flex}.bar i{display:block;height:100%}
.v{display:grid;grid-template-columns:96px 1fr;gap:12px;padding:9px 12px;background:#161b23;border:1px solid #2a3342;border-radius:8px;margin-bottom:6px;align-items:start}
.v small{display:block;color:#8b96a8}a{color:#4da3ff}.lk{display:flex;gap:14px;flex-wrap:wrap}</style></head><body><main>
<h1>Tiến độ 3JS Studio</h1><div class="mu">Cập nhật: ${e(d.capNhat)} · trang này chỉ mới khi Claude vừa xong một lượt làm việc (tải lại trang để xem bản mới)</div>
<div class="sum">${Object.entries(TT).map(([k, [t, c]]) => `<span style="color:${c};border-color:${c}55">${t}: ${dem(k)}</span>`).join('')}</div>
<div class="bar">${Object.entries(TT).map(([k, [, c]]) => `<i style="width:${dem(k) / all.length * 100}%;background:${c}"></i>`).join('')}</div>
${(d.canBan || []).length ? `<h2 style="color:#f5b84a">Cần bạn làm / trả lời</h2>` + d.canBan.map((x) => `<div class="v" style="grid-template-columns:1fr;border-color:#f5b84a55">${e(x)}</div>`).join('') : ''}
<h2>Mở nhanh</h2><div class="lk">${(d.link || []).map((l) => `<a href="${e(l.href)}">${e(l.ten)}</a>`).join('')}</div>
${d.nhom.map((n) => `<h2>${e(n.ten)}</h2>` + n.viec.map((v) => { const [t, c] = TT[v.tt] || TT.chua; return `<div class="v"><span class="tag" style="color:${c};border-color:${c}55;text-align:center">${t}</span><div>${e(v.ten)}${v.ghiChu ? `<small>${e(v.ghiChu)}</small>` : ''}</div></div>`; }).join('')).join('')}
</main></body></html>`;
fs.mkdirSync(path.join(ROOT, 'dist'), { recursive: true }); fs.writeFileSync(path.join(ROOT, 'dist/tien-do.html'), html);
console.log(`dist/tien-do.html: ${all.length} việc — ` + Object.entries(TT).map(([k, [t]]) => `${t} ${dem(k)}`).join(', '));
