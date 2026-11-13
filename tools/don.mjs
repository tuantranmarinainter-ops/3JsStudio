// Dọn ảnh / video kiểm tra cũ trong output/ (thư mục không vào git, tạo lại được).
//   node tools/don.mjs              chỉ liệt kê: file cũ hơn 24 giờ, gom theo thư mục cấp 1
//   node tools/don.mjs --xoa        xoá hẳn các file đó + thư mục rỗng
//   node tools/don.mjs --gio 48     đổi ngưỡng tuổi (giờ)
//   node tools/don.mjs --giu a,b    giữ nguyên các thư mục cấp 1 này (mặc định: toi-uu)
// KHÔNG đụng dist/, refs/, .cache/ — chỉ in dung lượng dist/ để người dùng tự quyết.
import { readdirSync, statSync, rmSync, rmdirSync, existsSync } from 'fs';
import { join, resolve, dirname, relative, sep } from 'path';
import { fileURLToPath } from 'url';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'output');
const hours = Number(opt('gio', 24));
const keep = new Set(String(opt('giu', 'toi-uu')).split(',').filter(Boolean));
const doDelete = args.includes('--xoa');
const cut = Date.now() - hours * 3600e3;
const MB = (b) => (b / 1048576).toFixed(0).padStart(6) + ' MB';

function walk(dir, files = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, files); else files.push(p);
  }
  return files;
}
function pruneEmpty(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) if (e.isDirectory()) pruneEmpty(join(dir, e.name));
  if (dir !== out && readdirSync(dir).length === 0) rmdirSync(dir);
}

if (!existsSync(out)) { console.log('Không có output/'); process.exit(0); }
const groups = new Map(); let total = 0, n = 0, keptB = 0, errs = 0;
for (const f of walk(out)) {
  const rel = relative(out, f); const top = rel.includes(sep) ? rel.split(sep)[0] : '(gốc output)';
  const st = statSync(f);
  if (keep.has(top) || st.mtimeMs >= cut) { keptB += st.size; continue; }
  const g = groups.get(top) || { b: 0, n: 0 }; g.b += st.size; g.n++; groups.set(top, g);
  total += st.size; n++;
  if (doDelete) { try { rmSync(f, { force: true }); } catch { errs++; } }
}
if (doDelete) pruneEmpty(out);

console.log(`${doDelete ? 'ĐÃ XOÁ' : 'Sẽ xoá (thêm --xoa để xoá)'}: file cũ hơn ${hours} giờ trong output/`);
for (const [k, g] of [...groups].sort((a, b) => b[1].b - a[1].b)) console.log(`${MB(g.b)} ${String(g.n).padStart(6)} file  ${k}`);
console.log(`${MB(total)} ${String(n).padStart(6)} file  TỔNG${errs ? `  (lỗi: ${errs})` : ''}`);
console.log(`${MB(keptB)}               giữ lại (mới hơn ${hours} giờ hoặc thuộc: ${[...keep].join(', ')})`);

const dist = join(root, 'dist');
if (existsSync(dist)) {
  const fs = readdirSync(dist).map((x) => ({ x, s: statSync(join(dist, x)) })).filter((o) => o.s.isFile());
  console.log(`\ndist/: ${fs.length} file, ${MB(fs.reduce((a, o) => a + o.s.size, 0)).trim()} — không tự xoá; bản cũ do người dùng quyết.`);
}
