// KHO ASSET DÙNG CHUNG cho studio (docs/handoff/tach-studio.md, GĐ2): gom mọi asset dùng chung mà các gói tập tham chiếu
// (header.refs của dist/<ep>.3js do tools/goi-tap.mjs ghi) thành MỘT file dist/kho-chung.3js. Người dùng kéo vào studio
// MỘT lần → studio lưu từng file vào IndexedDB theo sha256; các gói tập sau chỉ còn phần riêng.
//   node tools/kho-chung.mjs                    → gom từ mọi dist/*.3js (trừ kho)
//   node tools/kho-chung.mjs ep002 ep003        → chỉ các gói này
//   node tools/kho-chung.mjs --out x.3js
// Định dạng giống gói tập: "3JS1" + u32 + header JSON { v:2, kind:'kho', built, files: { path: [kiểu, vị trí, độ dài, sha256] } } + dữ liệu.
// Trùng sha256 (cùng nội dung, khác đường dẫn) chỉ lưu 1 lần.
import { readFileSync, writeFileSync, readdirSync, existsSync, openSync, readSync, closeSync } from 'fs';
import { createHash } from 'crypto';
import { join, resolve, dirname, relative } from 'path';
import { fileURLToPath } from 'url';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(root, opt('out', 'dist/STUDIO RIENG/kho-chung.3js'));
const eps = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--')));

// --liet-ke: in nội dung kho hiện có theo nhóm thư mục (và tập nào dùng), không dựng lại
if (args.includes('--liet-ke')) {
  const h = readHeader(out);
  const use = {};   // path -> [ep]
  for (const f of readdirSync(join(root, 'dist', 'STUDIO RIENG')).filter((f) => f.endsWith('.3js') && !f.startsWith('kho-chung'))) {
    try { const t = readHeader(join(root, 'dist', 'STUDIO RIENG', f)); for (const p of Object.keys(t.refs || {})) (use[p] = use[p] || []).push(t.ep); } catch {}
  }
  const g = {};
  for (const [p, [, , len]] of Object.entries(h.files)) { const k = p.split('/').slice(1, 3).join('/'); (g[k] = g[k] || { n: 0, b: 0, eps: new Set(), ds: [] }); g[k].n++; g[k].b += len; (use[p] || []).forEach((e) => g[k].eps.add(e)); g[k].ds.push(p.split('/').slice(3).join('/')); }
  const tot = Object.values(g).reduce((s, x) => s + x.b, 0);
  console.log(`kho chung ${out.replace(root, '').replace(/\\/g, '/')} — dựng ${h.built}, ${Object.keys(h.files).length} file, ${(tot / 1048576).toFixed(1)} MB`);
  for (const [k, x] of Object.entries(g).sort((a, b) => b[1].b - a[1].b)) {
    console.log(`  ${k.padEnd(28)} ${String(x.n).padStart(4)} file ${(x.b / 1048576).toFixed(1).padStart(6)} MB  dùng bởi: ${[...x.eps].sort().join(', ') || '—'}`);
    if (args.includes('--chi-tiet')) console.log('      ' + x.ds.sort().join('\n      '));
  }
  process.exit(0);
}

export function readHeader(file) {   // chỉ đọc phần header (không nạp cả gói vào RAM)
  const fd = openSync(file, 'r'); const h8 = Buffer.alloc(8); readSync(fd, h8, 0, 8, 0);
  if (h8.toString('latin1', 0, 4) !== '3JS1') { closeSync(fd); throw new Error(file + ': không phải gói .3js'); }
  const n = h8.readUInt32LE(4); const hb = Buffer.alloc(n); readSync(fd, hb, 0, n, 8); closeSync(fd);
  return JSON.parse(hb.toString('utf8'));
}

const packs = (eps.length ? eps.map((e) => `dist/STUDIO RIENG/${e}.3js`) : readdirSync(join(root, 'dist', 'STUDIO RIENG')).filter((f) => f.endsWith('.3js') && !f.startsWith('kho-chung')).map((f) => `dist/STUDIO RIENG/${f}`))
  .map((f) => join(root, f)).filter((f) => resolve(f) !== out);
const want = new Map();   // path -> {type, sha, bytes, from}
for (const f of packs) {
  if (!existsSync(f)) { console.error('Không thấy ' + f); process.exit(1); }
  const h = readHeader(f);
  if (h.kind !== 'tap') continue;
  for (const [p, [type, sha, bytes]] of Object.entries(h.refs || {})) if (!want.has(p)) want.set(p, { type, sha, bytes, from: h.ep });
  console.log(`  ${relative(root, f).replace(/\\/g, '/')}: ${Object.keys(h.refs || {}).length} tham chiếu`);
}
const files = {}; const bufs = []; const bySha = new Map(); let off = 0, lech = 0;
for (const [p, w] of [...want].sort()) {
  const disk = join(root, p);
  if (!existsSync(disk)) { console.warn(`  ⚠ thiếu trên đĩa: ${p} (gói ${w.from} cần) — đóng gói lại tập đó`); lech++; continue; }
  const buf = readFileSync(disk); const sha = createHash('sha256').update(buf).digest('hex');
  if (sha !== w.sha) { console.warn(`  ⚠ ${p} đã đổi sau khi đóng gói ${w.from} — đóng gói lại tập đó (node tools/goi-tap.mjs ${w.from})`); lech++; }
  if (!bySha.has(sha)) { bySha.set(sha, off); bufs.push(buf); off += buf.length; }
  files[p] = [w.type, bySha.get(sha), buf.length, sha];
}
const header = Buffer.from(JSON.stringify({ v: 2, kind: 'kho', built: new Date().toISOString(), files }));
const len = Buffer.alloc(4); len.writeUInt32LE(header.length);
writeFileSync(out, Buffer.concat([Buffer.from('3JS1'), len, header, ...bufs]));
console.log(`kho chung: ${Object.keys(files).length} file (${bySha.size} nội dung khác nhau), ${(off / 1048576).toFixed(1)} MB → ${relative(root, out).replace(/\\/g, '/')}${lech ? ` — ${lech} cảnh báo` : ''}`);
