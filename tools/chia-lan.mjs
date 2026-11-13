// Chia một thư mục qua mạng LAN để tải/xem trên điện thoại (cùng Wi-Fi): node tools/chia-lan.mjs <thư mục> [cổng=8800]
// Chỉ ĐỌC, chỉ trong thư mục đã cho; có hỗ trợ Range (điện thoại tua/xem MP4 trực tiếp được). Dừng: Ctrl+C.
import { createServer } from 'http';
import { createReadStream, statSync, readdirSync } from 'fs';
import { resolve, join, extname, sep } from 'path';
import { networkInterfaces } from 'os';

const root = resolve(process.argv[2] || '.'), port = +(process.argv[3] || 8800);
const TYPES = { '.mp4': 'video/mp4', '.jpg': 'image/jpeg', '.png': 'image/png', '.html': 'text/html; charset=utf-8', '.md': 'text/plain; charset=utf-8', '.json': 'application/json' };
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const lietKe = (dir, rel) => {   // trang danh sách: thư mục con + file (MP4 lên đầu), chữ to cho điện thoại
  const items = readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
  const rows = items.map((d) => {
    const href = encodeURIComponent(d.name) + (d.isDirectory() ? '/' : ''), size = d.isDirectory() ? '' : ' · ' + (statSync(join(dir, d.name)).size / 1048576).toFixed(1) + ' MB';
    return `<li><a href="${href}">${d.isDirectory() ? '📁 ' : ''}${esc(d.name)}</a><small>${size}</small></li>`;
  }).join('');
  return `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(rel || '/')}</title>
<style>body{font:18px system-ui;margin:16px;background:#111;color:#eee}a{color:#8cf;text-decoration:none}li{margin:14px 0;list-style:none}small{color:#999}</style>
<h3>${esc(rel || '/')}</h3><ul>${rel ? '<li><a href="../">⬆ lên trên</a></li>' : ''}${rows}</ul>`;
};
createServer((req, res) => {
  try {
    const rel = decodeURIComponent(req.url.split('?')[0]), p = resolve(join(root, rel));
    if (p !== root && !p.startsWith(root + sep)) { res.writeHead(403); return res.end(); }
    const st = statSync(p);
    if (st.isDirectory()) { if (!rel.endsWith('/')) { res.writeHead(302, { location: rel + '/' }); return res.end(); } res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); return res.end(lietKe(p, rel === '/' ? '' : rel)); }
    const type = TYPES[extname(p).toLowerCase()] || 'application/octet-stream', m = /bytes=(\d*)-(\d*)/.exec(req.headers.range || '');
    if (m) {
      const a = m[1] ? +m[1] : 0, b = m[2] ? Math.min(+m[2], st.size - 1) : st.size - 1;
      res.writeHead(206, { 'content-type': type, 'accept-ranges': 'bytes', 'content-range': `bytes ${a}-${b}/${st.size}`, 'content-length': b - a + 1 });
      return createReadStream(p, { start: a, end: b }).pipe(res);
    }
    res.writeHead(200, { 'content-type': type, 'accept-ranges': 'bytes', 'content-length': st.size });
    createReadStream(p).pipe(res);
  } catch { res.writeHead(404); res.end('không thấy'); }
}).listen(port, '0.0.0.0', () => {
  const ips = Object.values(networkInterfaces()).flat().filter((i) => i && i.family === 'IPv4' && !i.internal).map((i) => i.address);
  console.log('Đang chia:', root);
  for (const ip of ips) console.log(`  mở trên điện thoại: http://${ip}:${port}/`);
});
