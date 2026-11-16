// Codex giả cho test: KHÔNG gọi Codex thật.
// Đọc đề bài từ stdin, tạo file 1 byte cho mỗi dòng "- FILE: <đường dẫn>.png" (trong thư mục -C).
// Biến môi trường:
//   CODEX_GIA_DIR  thư mục trạng thái (bắt buộc cho các tính năng dưới)
//   CODEX_GIA_SOT  danh sách chuỗi (phẩy), file có tên chứa chuỗi sẽ bị bỏ sót
//   CODEX_GIA_429  "1": lần chạy đầu tiên (toàn cục) in lỗi rate limit, thoát 1, không tạo file
//   CODEX_GIA_NGU  ms ngủ để đo song song (mặc định 0)
// Ghi: peak.log (số tiến trình đang chạy mỗi lần bắt đầu), calls.jsonl (cwd + ảnh kèm).
import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const val = (c) => { const i = argv.indexOf(c); return i >= 0 ? argv[i + 1] : null; };
const cwd = val('-C');
const outLog = val('-o');
const images = [];
const iIdx = argv.indexOf('-i');
if (iIdx >= 0) for (let k = iIdx + 1; k < argv.length && !argv[k].startsWith('-'); k++) images.push(argv[k]);

const dir = process.env.CODEX_GIA_DIR;
const ngu = parseInt(process.env.CODEX_GIA_NGU || '0', 10);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let stdin = '';
process.stdin.setEncoding('utf8');
for await (const c of process.stdin) stdin += c;

let marker = null;
if (dir) {
  fs.mkdirSync(dir, { recursive: true });
  marker = path.join(dir, `act-${process.pid}`);
  fs.writeFileSync(marker, '1');
  const dang = fs.readdirSync(dir).filter((f) => f.startsWith('act-')).length;
  fs.appendFileSync(path.join(dir, 'peak.log'), `${dang}\n`);
  fs.appendFileSync(path.join(dir, 'calls.jsonl'), JSON.stringify({ cwd, images, args: argv.filter((a) => a.startsWith('-')) }) + '\n');
}
const xong = (ma) => { if (marker) try { fs.unlinkSync(marker); } catch { /* bỏ */ } process.exit(ma); };

if (ngu) await sleep(ngu);

if (process.env.CODEX_GIA_429 === '1' && dir) {
  let dau = false;
  try { fs.writeFileSync(path.join(dir, '429.done'), '1', { flag: 'wx' }); dau = true; } catch { /* đã có */ }
  if (dau) { console.error('ERROR: 429 Too Many Requests - rate limit exceeded'); xong(1); }
}

const sot = (process.env.CODEX_GIA_SOT || '').split(',').filter(Boolean);
const files = [...stdin.matchAll(/^- FILE: (\S+\.png)/gm)].map((m) => m[1]);
for (const f of files) {
  if (sot.some((s) => f.includes(s))) continue;
  const p = path.join(cwd, f);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, 'x:' + p);   // nội dung riêng từng file (codex-ve kiểm ảnh trùng md5)
}
const td = stdin.match(/^- TIEN-DO: (\S+)/m);
if (td) {
  const p = path.join(cwd, td[1]);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, files.map((f) => `xong ${f}`).join('\n'));
}
if (outLog) { fs.mkdirSync(path.dirname(outLog), { recursive: true }); fs.writeFileSync(outLog, 'xong'); }
console.log('codex giả: xong');
xong(0);
