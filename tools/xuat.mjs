// Xuất video để XEM bằng một lệnh: bấm "Xuất MP4" của dist/<ep>.html (qua export-test.mjs), rồi nén bản nhẹ.
//   node tools/xuat.mjs <ep|dist/x.html> [--res 1080p|2k|4k] [--range a:b] [--nhe 720] [--crf 30] [--chi-nen file.mp4]
// Kết quả trong output/xuat/<ep>_<ngày-giờ>/:  <ep>.mp4 (bản gốc) + <ep>_nhe.mp4 (bản nhẹ để xem/gửi).
// In ra đường dẫn + dung lượng + link file:/// của cả hai. Thoát mã 1 nếu xuất hỏng.
//   --chi-nen f.mp4   bỏ bước xuất, chỉ nén một MP4 có sẵn (vd bản 170 MB) thành bản nhẹ cạnh nó.
// Mặc định: 1080p, cả phim, bản nhẹ cao 1280 px (rộng 720), CRF 30, âm thanh AAC 96k.
import { spawnSync } from 'child_process';
import { existsSync, readdirSync, statSync, mkdirSync, renameSync } from 'fs';
import { resolve, join, basename, dirname } from 'path';
import { pathToFileURL } from 'url';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const first = args.find((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--')));
const mb = (f) => (statSync(f).size / 1048576).toFixed(1) + ' MB';
const show = (label, f) => console.log(`${label}: ${f}  (${mb(f)})\n  ${pathToFileURL(f).href}`);

function nen(src) {
  const h = Number(opt('nhe', 1280)), crf = String(opt('crf', 30));
  const dst = src.replace(/\.mp4$/i, '') + '_nhe.mp4';
  const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', src, '-vf', `scale=-2:${h}`, '-c:v', 'libx264', '-preset', 'veryfast',
    '-crf', crf, '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', dst], { stdio: 'inherit' });
  if (r.status !== 0 || !existsSync(dst)) { console.error('Nén hỏng (ffmpeg).'); process.exit(1); }
  return dst;
}

if (opt('chi-nen')) {
  const src = resolve(opt('chi-nen'));
  if (!existsSync(src)) { console.error('Không thấy file: ' + src); process.exit(1); }
  show('Bản gốc', src); show('Bản nhẹ', nen(src));
  process.exit(0);
}

if (!first) { console.error('Dùng: node tools/xuat.mjs <ep|dist/x.html> [--res 1080p] [--range a:b] [--nhe 1280] [--crf 30] | --chi-nen file.mp4'); process.exit(1); }
const html = resolve(first.endsWith('.html') ? first : join('dist', first + '.html'));
if (!existsSync(html)) { console.error('Không thấy ' + html + ' — gộp trước: npm run bundle:<ep>'); process.exit(1); }
const ep = basename(html, '.html');
const stamp = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16).replace('T', '_').replace(':', '-');
const out = resolve('output', 'xuat', `${ep}_${stamp}`);
mkdirSync(out, { recursive: true });

const ex = ['tools/export-test.mjs', html, '--res', opt('res', '1080p'), '--out', out];
if (opt('range')) ex.push('--range', opt('range'));
console.log('Đang xuất ' + ep + ' … (mở trang + render, vài phút)');
const r = spawnSync(process.execPath, ex, { stdio: ['ignore', 'ignore', 'inherit'] });
const mp4s = readdirSync(out).filter((f) => /\.mp4$/i.test(f)).map((f) => join(out, f));
if (!mp4s.length) { console.error('Không có MP4 nào được xuất. Xem ' + join(out, 'report.md')); process.exit(1); }
if (r.status !== 0) console.warn('⚠ export-test báo lỗi kiểm tra — xem ' + join(out, 'report.md') + ' (vẫn nén bản đã xuất).');
const src = join(out, ep + '.mp4');
if (mp4s[0] !== src) renameSync(mp4s[0], src);
show('Bản gốc', src);
show('Bản nhẹ', nen(src));
console.log('Thư mục: ' + pathToFileURL(dirname(src)).href);
