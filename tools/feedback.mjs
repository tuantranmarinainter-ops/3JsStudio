// Đọc file góp ý do nút "Gửi góp ý" trong trình phát tạo ra (feedback/gop-y_*.json).
//   node tools/feedback.mjs [file.json | --latest]    (mặc định = file mới nhất)
// In danh sách đánh số (frame, giây, shot, lời ghi chú) và ghi ảnh từng ghi chú ra feedback/<tên>/<nn>_f<frame>.png
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'feedback');
let arg = process.argv[2];
if (!arg || arg === '--latest') {
  const all = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => /^gop-y.*\.json$/i.test(f)) : [];
  if (!all.length) { console.error('Chưa có file góp ý nào trong ' + dir); process.exit(1); }
  all.sort((a, b) => fs.statSync(path.join(dir, b)).mtimeMs - fs.statSync(path.join(dir, a)).mtimeMs);
  arg = path.join(dir, all[0]);
} else if (!fs.existsSync(arg) && fs.existsSync(path.join(dir, arg))) arg = path.join(dir, arg);

const data = JSON.parse(fs.readFileSync(arg, 'utf8'));
const name = path.basename(arg).replace(/\.json$/i, '');
const out = path.join(dir, name);
fs.mkdirSync(out, { recursive: true });
const notes = data.notes || [];
console.log(`Góp ý: ${path.basename(arg)} · tập ${data.episode || '?'} · ${notes.length} ghi chú · ${data.created || ''}\n`);
notes.forEach((n, i) => {
  const nn = String(i + 1).padStart(2, '0');
  let file = '';
  const m = /^data:image\/png;base64,(.+)$/.exec(n.img || '');
  if (m) { file = path.join(out, `${nn}_f${n.frame}.png`); fs.writeFileSync(file, Buffer.from(m[1], 'base64')); }
  console.log(`${nn}. frame ${n.frame} · ${Number(n.t).toFixed(2)}s · shot ${n.shotId || '?'}`);
  console.log(`    ${n.text ? n.text.replace(/\n/g, '\n    ') : '(chỉ có nét vẽ, xem ảnh)'}`);
  if (file) console.log(`    ảnh: ${file}`);
});
// chỉ chụp lại phân cảnh liên quan (shot chứa từng frame: frame đó + đầu/giữa/cuối shot), không chụp cả phim
if (notes.length) console.log(`\nChụp lại đúng các phân cảnh bị góp ý:\n  node tools/look.mjs episodes/${data.episode || 'ep001'}/index.html --frames ${notes.map((n) => n.frame).join(',')} --out feedback/${path.basename(out)}/chup`);
