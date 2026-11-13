// Chia một thư mục qua mạng LAN để tải/xem trên điện thoại (cùng Wi-Fi): node tools/chia-lan.mjs <thư mục> [cổng=8800]
// Chỉ ĐỌC, chỉ trong thư mục đã cho; có hỗ trợ Range (điện thoại tua/xem MP4 trực tiếp được). Dừng: Ctrl+C.
// Mỗi file có nút "⬇ tải về" (?tai=1): ép trình duyệt TẢI TRỌN FILE — bấm vào tên file thì trình phát video của điện thoại chỉ lấy từng khúc,
// lưu từ trình phát dễ ra file cụt. Mỗi yêu cầu được in ra màn hình (giờ, đường dẫn, khúc xin) để dò khi tải lỗi.
import { createServer } from 'http';
import { createReadStream, statSync, readdirSync } from 'fs';
import { resolve, join, extname, sep, basename } from 'path';
import { networkInterfaces } from 'os';

const root = resolve(process.argv[2] || '.'), port = +(process.argv[3] || 8800);
const TYPES = { '.mp4': 'video/mp4', '.jpg': 'image/jpeg', '.png': 'image/png', '.html': 'text/html; charset=utf-8', '.md': 'text/plain; charset=utf-8', '.json': 'application/json' };
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const lietKe = (dir, rel) => {   // trang danh sách: thư mục con + file, chữ to cho điện thoại
  const items = readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
  const rows = items.map((d) => {
    const href = encodeURIComponent(d.name) + (d.isDirectory() ? '/' : '');
    if (d.isDirectory()) return `<li><a href="${href}">📁 ${esc(d.name)}</a></li>`;
    const mb = (statSync(join(dir, d.name)).size / 1048576).toFixed(1);
    return `<li><a href="${href}">${esc(d.name)}</a><small> · ${mb} MB</small> &nbsp; <a class="tai" href="${href}?tai=1">⬇ tải về</a></li>`;
  }).join('');
  return `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(rel || '/')}</title>
<style>body{font:18px system-ui;margin:16px;background:#111;color:#eee}a{color:#8cf;text-decoration:none}li{margin:18px 0;list-style:none}small{color:#999}
.tai{background:#2a6;color:#fff;padding:5px 11px;border-radius:8px;font-size:15px;white-space:nowrap}</style>
<h3>${esc(rel || '/')}</h3><p><small>Bấm tên file để xem ngay · bấm "⬇ tải về" để lưu trọn file vào máy.</small></p><ul>${rel ? '<li><a href="../">⬆ lên trên</a></li>' : ''}${rows}</ul>`;
};
createServer((req, res) => {
  try {
    const rel = decodeURIComponent(req.url.split('?')[0]), p = resolve(join(root, rel));
    if (p !== root && !p.startsWith(root + sep)) { res.writeHead(403); return res.end(); }
    const st = statSync(p);
    if (st.isDirectory()) { if (!rel.endsWith('/')) { res.writeHead(302, { location: rel + '/' }); return res.end(); } res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-cache' }); return res.end(lietKe(p, rel === '/' ? '' : rel)); }
    const tai = /[?&]tai=1/.test(req.url), etag = `"${st.size}-${Math.round(st.mtimeMs)}"`;
    const type = tai ? 'application/octet-stream' : TYPES[extname(p).toLowerCase()] || 'application/octet-stream';
    const chung = { 'content-type': type, 'accept-ranges': 'bytes', etag, 'last-modified': st.mtime.toUTCString(), 'cache-control': 'no-cache', ...(tai ? { 'content-disposition': `attachment; filename="${basename(p)}"` } : {}) };
    const ifr = req.headers['if-range'], m = !ifr || ifr === etag ? /bytes=(\d*)-(\d*)/.exec(req.headers.range || '') : null;   // If-Range lệch → gửi lại cả file
    console.log(new Date().toTimeString().slice(0, 8), req.method, rel, req.headers.range || '(cả file)', tai ? '[tải về]' : '');
    if (req.method === 'HEAD') { res.writeHead(200, { ...chung, 'content-length': st.size }); return res.end(); }
    if (m && (m[1] || m[2])) {
      const a = m[1] ? +m[1] : Math.max(0, st.size - +m[2]), b = m[1] && m[2] ? Math.min(+m[2], st.size - 1) : st.size - 1;   // "a-b", "a-", "-n" (n byte cuối)
      if (a > b || a >= st.size) { res.writeHead(416, { 'content-range': `bytes */${st.size}` }); return res.end(); }
      res.writeHead(206, { ...chung, 'content-range': `bytes ${a}-${b}/${st.size}`, 'content-length': b - a + 1 });
      return createReadStream(p, { start: a, end: b }).pipe(res);
    }
    res.writeHead(200, { ...chung, 'content-length': st.size });
    createReadStream(p).pipe(res);
  } catch { res.writeHead(404); res.end('không thấy'); }
}).listen(port, '0.0.0.0', () => {
  const ips = Object.values(networkInterfaces()).flat().filter((i) => i && i.family === 'IPv4' && !i.internal).map((i) => i.address);
  console.log('Đang chia:', root);
  for (const ip of ips) console.log(`  mở trên điện thoại: http://${ip}:${port}/`);
});
