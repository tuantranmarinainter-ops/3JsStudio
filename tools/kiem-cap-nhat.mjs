// Kiểm nút "Cập nhật mới nhất" của studio (docs/handoff/tach-studio.md, GĐ3) KHÔNG cần mạng: giả lập GitHub bằng server trong máy
// (?nguon=http://localhost:<cổng>/ → latest.json + <thẻ>/studio-core.{json,js}).
//   1. bản tốt (2099.01.01) → Kiểm → Cài → mở ep004 bằng bản đó → tới __ready, hết "đang thử"
//   2. bản hỏng (2099.01.02, lỗi khi nạp) → Cài → mở tập → tự quay về 2099.01.01, tải lại, tập vẫn mở
//   node tools/kiem-cap-nhat.mjs [ep004]
import { createServer } from 'http';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { createHash } from 'crypto';
import { execFileSync } from 'child_process';
import { join, resolve, dirname } from 'path';
import { pathToFileURL, fileURLToPath } from 'url';
import { launchBrowser } from './browser.mjs';

const ep = process.argv[2] || 'ep004';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const tmp = join(root, 'output', '_tmp', 'kiem-cap-nhat');
mkdirSync(tmp, { recursive: true });
console.log('dựng lõi giả "bản mới" 2099.01.01…');
execFileSync(process.execPath, [join(root, 'tools', 'bundle-studio.mjs'), '--version', '2099.01.01-0000', '--out', join(tmp, 's.html'), '--ghi-chu', 'Bản thử tốt'], { stdio: 'ignore' });
const good = { js: readFileSync(join(tmp, 'studio-ban', 'studio-core.js'), 'utf8'), json: JSON.parse(readFileSync(join(tmp, 'studio-ban', 'studio-core.json'), 'utf8')) };
const badJs = 'globalThis.__studioCore = {"version":"2099.01.02-0000"};\nthrow new Error("lõi hỏng (thử)");\n';
const bad = { js: badJs, json: { ...good.json, version: '2099.01.02-0000', sha256: createHash('sha256').update(badJs).digest('hex'), size: badJs.length, notes: 'Bản thử hỏng' } };
let tag = 't1';
const srv = createServer((req, res) => {
  const u = req.url.split('?')[0]; const B = u.startsWith('/t2/') ? bad : good;
  res.setHeader('access-control-allow-origin', '*');
  if (u === '/latest.json') return res.end(JSON.stringify({ tag_name: tag, body: tag === 't1' ? 'Bản thử tốt' : 'Bản thử hỏng' }));
  if (u.endsWith('/studio-core.json')) return res.end(JSON.stringify(B.json));
  if (u.endsWith('/studio-core.js')) return res.end(B.js);
  res.writeHead(404); res.end();
}).listen(0);
const nguon = `http://localhost:${srv.address().port}/`;
const base = pathToFileURL(resolve(root, 'dist/studio.html')).href;
const b = await launchBrowser(); const ctx = await b.newContext(); const p = await ctx.newPage();
const kq = []; const ok = (t, d) => { kq.push(`${d ? 'ĐẠT' : 'LỖI'}  ${t}`); if (!d) process.exitCode = 1; };
const caiBan = async () => {
  await p.goto(`${base}?nguon=${encodeURIComponent(nguon)}`);
  await p.waitForFunction(() => window.__studioSan, null, { timeout: 30000 });
  await p.evaluate(() => window.__studio.kiemBanMoi(false));
  await p.waitForSelector('#scai', { timeout: 30000 }); await p.click('#scai');
  await p.waitForFunction(() => /Đã cài|thất bại/.test(document.getElementById('supdinfo').textContent), null, { timeout: 60000 });
  return p.evaluate(() => window.__studio.active());
};
const moTap = async () => {
  await p.goto(`${base}?goi=${ep}.3js&nguon=${encodeURIComponent(nguon)}`);
  const ready = await p.waitForFunction(() => window.__ready === true && window.__studioMoXong, null, { timeout: 240000 }).then(() => true, () => false);
  return { ready, core: await p.evaluate(() => window.__pack && window.__pack.core).catch(() => null) };
};
try {
  let a = await caiBan();
  ok(`1a. cài bản tốt → đang dùng ${a.version}, chạy thử`, a.version === '2099.01.01-0000' && a.dangThu);
  let r = await moTap();
  ok(`1b. mở ${ep} bằng bản mới (lõi ${r.core})`, r.ready && r.core === '2099.01.01-0000');
  await p.waitForTimeout(500);
  await p.goto(`${base}?nguon=${encodeURIComponent(nguon)}`); await p.waitForFunction(() => window.__studioSan);
  a = await p.evaluate(() => window.__studio.active());
  kq.push('      ' + JSON.stringify(a) + ' moXong=' + r.ready); ok('1c. hết "đang thử" sau khi mở tập thành công', a.version === '2099.01.01-0000' && !a.dangThu);
  tag = 't2';
  a = await caiBan();
  ok(`2a. cài bản hỏng → đang dùng ${a.version}`, a.version === '2099.01.02-0000');
  r = await moTap();   // lỗi → quayLai → location.reload → mở lại bằng bản trước
  ok(`2b. bản hỏng tự quay về bản trước, tập vẫn mở (lõi ${r.core})`, r.ready && r.core === '2099.01.01-0000');
} catch (e) { ok('lỗi kịch bản: ' + e.message, false); }
await b.close(); srv.close();
console.log(kq.join('\n'));
