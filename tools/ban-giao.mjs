#!/usr/bin/env node
// ban-giao.mjs — gom mọi file bàn giao của một tập vào MỘT thư mục tự chứa để gửi người ở máy khác xem và duyệt.
// Dùng: node tools/ban-giao.mjs <ep> [--dich <thư mục đồng bộ, vd. G:\My Drive\3JS>] [--zip]
// Ra: ban-giao/<ep>/index.html (mục lục) + bản chép các trang duyệt. Trang duyệt trong bản chép: bấm Gửi = TẢI file kết quả về máy.
// --dich: chép thêm cả thư mục sang nơi đồng bộ đám mây (Google Drive / OneDrive). --zip: nén thành ban-giao/<ep>.zip.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const a = process.argv.slice(2);
const co = (k) => a.includes(k);
const gt = (k) => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : null; };
const ep = a.find((x, i) => !x.startsWith('--') && a[i - 1] !== '--dich');
if (!ep) { console.error('Dùng: node tools/ban-giao.mjs <ep> [--dich <thư mục>] [--zip]'); process.exit(2); }

const RA = path.join(GOC, 'ban-giao', ep);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const co_ = (p) => fs.existsSync(path.join(GOC, p));

// Chèn vào trang duyệt: bấm Gửi (POST …/gui) thì tải file kết quả về máy; vẫn thử gửi về máy chủ nếu đang ở máy chủ.
const chen = (ten) => `<script>(function(){var F=window.fetch;window.fetch=function(u,o){try{if(o&&String(o.method).toUpperCase()==='POST'&&/\\/gui$/.test(String(u))){var d=new Date(),p=function(n){return String(n).padStart(2,'0')};var f='ket-qua_${ten}_'+d.getFullYear()+p(d.getMonth()+1)+p(d.getDate())+'-'+p(d.getHours())+p(d.getMinutes())+'.json';var b=new Blob([o.body],{type:'application/json'}),l=document.createElement('a');l.href=URL.createObjectURL(b);l.download=f;document.body.appendChild(l);l.click();l.remove();try{F.call(window,u,o).catch(function(){})}catch(e){}return Promise.resolve(new Response('{"ok":true}',{status:200,headers:{'content-type':'application/json'}}))}}catch(e){}return F.apply(window,arguments)};
document.addEventListener('DOMContentLoaded',function(){var b=document.createElement('div');b.style.cssText='position:sticky;top:0;z-index:9999;background:#fff6e0;color:#5b3d00;border-bottom:1px solid #c58a00;padding:8px 12px;font:14px system-ui,sans-serif';b.textContent='Bản bàn giao: duyệt xong bấm nút Gửi — máy sẽ TẢI VỀ một file ket-qua_….json. Gửi file đó lại cho người làm phim (hoặc bỏ vào thư mục "ket-qua" của thư mục chung).';document.body.insertBefore(b,document.body.firstChild)});})();</script>`;

function chepFile(tu, den) { fs.mkdirSync(path.dirname(den), { recursive: true }); fs.copyFileSync(tu, den); }
function chepThuMuc(tu, den) {
  if (!fs.existsSync(tu)) return 0;
  let n = 0;
  for (const e of fs.readdirSync(tu, { withFileTypes: true })) {
    const s = path.join(tu, e.name), d = path.join(den, e.name);
    if (e.isDirectory()) n += chepThuMuc(s, d); else { chepFile(s, d); n++; }
  }
  return n;
}
function chepTrang(tu, den, ten) {
  let h = fs.readFileSync(tu, 'utf8');
  const s = chen(ten);
  h = /<head[^>]*>/i.test(h) ? h.replace(/<head[^>]*>/i, (m) => m + s) : h.replace(/<meta charset[^>]*>/i, (m) => m + s);
  if (!h.includes(s)) h = s + h;
  fs.mkdirSync(path.dirname(den), { recursive: true });
  fs.writeFileSync(den, h, 'utf8');
}

// ---------- gom ----------
// xoá bản cũ nhưng giữ thư mục gốc (có thể đang mở) và thư mục ket-qua (file người duyệt gửi về)
for (const e of fs.existsSync(RA) ? fs.readdirSync(RA) : []) if (e !== 'ket-qua') fs.rmSync(path.join(RA, e), { recursive: true, force: true });
fs.mkdirSync(path.join(RA, 'ket-qua'), { recursive: true });
fs.writeFileSync(path.join(RA, 'ket-qua', 'DOC-TOI.txt'), 'Bỏ các file ket-qua_….json (tải về sau khi bấm Gửi trên trang duyệt) vào thư mục này.\r\n', 'utf8');

const kb = `kich-ban/${ep}`;
if (co_(`${kb}/bang-shot.json`)) {
  try { execFileSync(process.execPath, [path.join(GOC, 'tools/duyet-bang-shot.mjs'), path.join(GOC, kb), 'dung'], { stdio: 'ignore' }); } catch { /* giữ trang cũ */ }
}
const muc = []; // { nhom, ten, href, moTa, nguon }
const them = (nhom, ten, href, moTa, nguon) => muc.push({ nhom, ten, href, moTa, mtime: fs.statSync(path.join(GOC, nguon)).mtime });

if (co_(`${kb}/duyet-1.html`)) {
  chepTrang(path.join(GOC, kb, 'duyet-1.html'), path.join(RA, 'cong-1', 'duyet-1.html'), `${ep}_cong-1`);
  chepThuMuc(path.join(GOC, kb, 'tham-chieu'), path.join(RA, 'cong-1', 'tham-chieu'));
  chepThuMuc(path.join(GOC, kb, 'hinh'), path.join(RA, 'cong-1', 'hinh'));
  them('Trang duyệt', 'Cổng duyệt 1 — bảng shot và ảnh tham chiếu', 'cong-1/duyet-1.html', 'Chốt nhân vật, bối cảnh và cách chia shot.', `${kb}/duyet-1.html`);
}
if (co_(`${kb}/KIT.html`)) {
  chepTrang(path.join(GOC, kb, 'KIT.html'), path.join(RA, 'cong-2', 'KIT.html'), `${ep}_cong-2`);
  chepThuMuc(path.join(GOC, kb, 'hinh'), path.join(RA, 'cong-2', 'hinh'));
  them('Trang duyệt', 'Cổng duyệt 2 — storyboard và bộ kit', 'cong-2/KIT.html', 'Số đo bối cảnh, camera, chuyển động từng shot.', `${kb}/KIT.html`);
}
if (co_(`dist/${ep}_duyet.html`)) {
  chepTrang(path.join(GOC, 'dist', `${ep}_duyet.html`), path.join(RA, 'cong-3', 'duyet-model.html'), `${ep}_cong-3`);
  them('Trang duyệt', 'Cổng duyệt 3 — chọn model, đạo cụ', 'cong-3/duyet-model.html', 'Mỗi món nhiều ứng viên, chọn rồi gửi.', `dist/${ep}_duyet.html`);
}
if (co_(`output/${ep}-tieng/nghe-thu.html`)) {
  const n = chepThuMuc(path.join(GOC, 'output', `${ep}-tieng`), path.join(RA, 'cong-4'));
  if (n) them('Trang duyệt', 'Cổng duyệt 4 — nghe thử giọng', 'cong-4/nghe-thu.html', 'Nghe giọng đọc, chốt giọng.', `output/${ep}-tieng/nghe-thu.html`);
}
for (const [f, ten, moTa] of [[`${ep}_xem-thu.html`, 'Bản xem thử phim', 'Xem trong khung studio, bấm M ghi chú từng shot.'], [`${ep}.html`, 'Bản chốt (có nút Xuất MP4)', 'File phim hoàn chỉnh.']]) {
  if (co_(`dist/${f}`)) { chepTrang(path.join(GOC, 'dist', f), path.join(RA, 'phim', f), f.replace('.html', '')); them('Phim', ten, `phim/${f}`, moTa, `dist/${f}`); }
}
for (const [f, ten, moTa] of [['kich-ban.md', 'Kịch bản chữ', 'Kịch bản và bảng shot gốc.'], ['bang-shot.json', 'Bảng shot (dữ liệu)', 'Mỗi shot một mục: thoại, camera, khung đầu/cuối.'], ['kit.json', 'Bộ kit (dữ liệu)', 'Số đo cho bản dựng 3D.']]) {
  if (co_(`${kb}/${f}`)) { chepFile(path.join(GOC, kb, f), path.join(RA, 'kich-ban', f)); them('Kịch bản và dữ liệu', ten, `kich-ban/${f}`, moTa, `${kb}/${f}`); }
}
if (co_(`${kb}/storyboard`)) {
  chepThuMuc(path.join(GOC, kb, 'storyboard'), path.join(RA, 'storyboard'));
  const anh = fs.readdirSync(path.join(RA, 'storyboard')).filter((f) => /\.(png|jpe?g|webp)$/i.test(f)).sort();
  fs.writeFileSync(path.join(RA, 'storyboard', 'index.html'), `<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Storyboard ${esc(ep)}</title><style>body{font:14px system-ui,sans-serif;background:#111;color:#eee;margin:0;padding:12px}div{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px}figure{margin:0}img{width:100%;border-radius:6px}figcaption{font-size:12px;color:#aaa}</style><h1>Storyboard ${esc(ep)}</h1><div>${anh.map((f) => `<figure><a href="${esc(f)}"><img loading="lazy" src="${esc(f)}"></a><figcaption>${esc(f)}</figcaption></figure>`).join('')}</div></html>`, 'utf8');
  them('Kịch bản và dữ liệu', `Storyboard (${anh.length} ảnh)`, 'storyboard/index.html', 'Khung hình gốc người dùng đưa.', `${kb}/storyboard`);
}
if (co_('dist/tien-do.html')) { chepFile(path.join(GOC, 'dist/tien-do.html'), path.join(RA, 'tien-do.html')); them('Tiến độ', 'Trang tiến độ cả dự án', 'tien-do.html', 'Việc nào xong, việc nào đang chờ.', 'dist/tien-do.html'); }

// ---------- mục lục ----------
const gio = (d) => d.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
const nhoms = [...new Set(muc.map((m) => m.nhom))];
const html = `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Bàn giao ${esc(ep)}</title>
<style>:root{--bg:#f3f5f8;--p:#fff;--l:#d5dbe5;--f:#17202c;--m:#5d6a7e;--a:#1f6fd1}@media(prefers-color-scheme:dark){:root{--bg:#0e1116;--p:#161b23;--l:#2a3342;--f:#e8ecf2;--m:#8b96a8;--a:#4da3ff}}
body{margin:0;background:var(--bg);color:var(--f);font:15px/1.5 system-ui,"Segoe UI",sans-serif;padding:18px 16px 48px}main{max-width:760px;margin:0 auto}h1{font-size:22px;margin:0 0 4px}h2{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--m);margin:20px 0 8px}
a.c{display:block;background:var(--p);border:1px solid var(--l);border-radius:10px;padding:12px 14px;margin-bottom:8px;color:inherit;text-decoration:none}a.c b{color:var(--a);font-size:16px}a.c span{display:block;color:var(--m);font-size:13px}p{color:var(--m);margin:0}</style></head>
<body><main><h1>Bàn giao ${esc(ep)}</h1><p>Cập nhật lúc ${esc(gio(new Date()))}. Mở từng mục bên dưới bằng trình duyệt. Ở trang duyệt: chọn xong bấm Gửi, máy tải về file <code>ket-qua_….json</code> — gửi lại file đó hoặc bỏ vào thư mục <code>ket-qua</code>.</p>
${nhoms.map((n) => `<h2>${esc(n)}</h2>${muc.filter((m) => m.nhom === n).map((m) => `<a class="c" href="${esc(m.href)}"><b>${esc(m.ten)}</b><span>${esc(m.moTa)} · bản lúc ${esc(gio(m.mtime))}</span></a>`).join('')}`).join('')}
</main></body></html>`;
fs.writeFileSync(path.join(RA, 'index.html'), html, 'utf8');

const dem = (d) => fs.readdirSync(d, { withFileTypes: true }).reduce((n, e) => n + (e.isDirectory() ? dem(path.join(d, e.name)) : 1), 0);
console.log(`ban-giao: ${muc.length} mục, ${dem(RA)} file → ${RA}`);
console.log('file:///' + path.join(RA, 'index.html').replace(/\\/g, '/').replace(/ /g, '%20'));

const dich = gt('--dich');
if (dich) {
  if (!fs.existsSync(dich)) { console.error(`Không thấy thư mục đích: ${dich}`); process.exit(1); }
  const den = path.join(dich, `ban-giao-${ep}`);
  for (const e of fs.existsSync(den) ? fs.readdirSync(den) : []) if (e !== 'ket-qua') fs.rmSync(path.join(den, e), { recursive: true, force: true });
  const n = chepThuMuc(RA, den);
  console.log(`đã chép ${n} file sang ${den} (giữ nguyên thư mục ket-qua ở đó)`);
}
if (co('--zip')) {
  const z = path.join(GOC, 'ban-giao', `${ep}.zip`);
  fs.rmSync(z, { force: true });
  const z7 = 'C:\\Program Files\\7-Zip\\7z.exe';
  if (fs.existsSync(z7)) execFileSync(z7, ['a', '-tzip', '-mx1', z, RA], { stdio: 'ignore' });
  else execFileSync(path.join(process.env.SystemRoot || 'C:\\Windows', 'System32\\WindowsPowerShell\\v1.0\\powershell.exe'), ['-NoProfile', '-Command', `Compress-Archive -Path '${RA.replace(/'/g, "''")}' -DestinationPath '${z.replace(/'/g, "''")}'`], { stdio: 'inherit' });
  console.log(`zip: ${z} (${(fs.statSync(z).size / 1048576).toFixed(1)} MB)`);
}
