#!/usr/bin/env node
// Máy nhận góp ý: nút "➤ Gửi tới Claude" của trình phát (tools/export-ui.js) POST file góp ý JSON vào đây.
//   node tools/gop-y-nhan.mjs [--cong 8792] [--mot-lan] [--het-gio phút]
//   GET  /ping     → {"ung":"gop-y"}   (trình phát dò để hiện "Claude đang chờ nhận")
//   POST /gop-y    → ghi feedback/gop-y_<tập>_<giờ>.json (đúng tên mà tools/feedback.mjs tìm), in "DA-NHAN <đường dẫn>"
// Chỉ nghe 127.0.0.1. Trang mở từ file:// gửi Origin "null" → cho phép; web lạ bị chặn. Đọc rồi dùng: node tools/feedback.mjs --latest
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const CONG = +arg('--cong', 8792), MOT_LAN = process.argv.includes('--mot-lan'), HET_GIO = +arg('--het-gio', 240);
const MAX = 64 * 2 ** 20;
const dir = path.join(GOC, 'feedback');

const hostOk = (h) => !!h && new RegExp(`^(127\\.0\\.0\\.1|localhost):${CONG}$`).test(h);
// file:// → Origin "null" (hoặc "file://"); trang http cục bộ → http://127.0.0.1|localhost[:cổng]; các web khác không được
const originOk = (o) => o === undefined || o === 'null' || o === 'file://' || /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(o);
const z = (n) => String(n).padStart(2, '0');
const tenFile = (ep) => { const d = new Date(); return `gop-y_${String(ep || 'ep').replace(/[^\w-]/g, '').slice(0, 24) || 'ep'}_${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}_${z(d.getHours())}-${z(d.getMinutes())}-${z(d.getSeconds())}.json`; };

let xong = false;
const sv = http.createServer((req, res) => {
  const org = req.headers.origin;
  const cors = { 'Access-Control-Allow-Origin': org === undefined ? '*' : org, 'Vary': 'Origin', 'Access-Control-Allow-Private-Network': 'true' };
  const tra = (ma, nd, kieu = 'application/json') => { res.writeHead(ma, { 'Content-Type': kieu + '; charset=utf-8', 'Cache-Control': 'no-store', ...cors }); res.end(typeof nd === 'string' ? nd : JSON.stringify(nd)); };
  if (!hostOk(req.headers.host)) return tra(403, { ok: false, loi: 'host không hợp lệ' });
  if (org !== undefined && !originOk(org)) return tra(403, { ok: false, loi: 'origin không hợp lệ' });
  let u; try { u = new URL(req.url, 'http://x'); } catch { return tra(400, { ok: false, loi: 'url sai' }); }
  if (req.method === 'OPTIONS') {   // preflight (file:// → http://127.0.0.1)
    res.writeHead(204, { ...cors, 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '600', 'Cache-Control': 'no-store' });
    return res.end();
  }
  if (req.method === 'GET' && u.pathname === '/ping') return tra(200, { ung: 'gop-y' });
  if (req.method === 'POST' && u.pathname === '/gop-y') {
    const bufs = []; let n = 0, qua = false;
    req.on('data', (c) => { n += c.length; if (n > MAX) { if (!qua) { qua = true; tra(413, { ok: false, loi: 'quá 64 MB' }); } } else bufs.push(c); });
    req.on('end', () => {
      if (qua) return;
      let d; try { d = JSON.parse(Buffer.concat(bufs).toString('utf8')); } catch { return tra(400, { ok: false, loi: 'JSON sai' }); }
      if (!d || d.app !== 'gop-y' || !Array.isArray(d.notes)) return tra(422, { ok: false, loi: 'không phải file góp ý (app:"gop-y", notes:[…])' });
      fs.mkdirSync(dir, { recursive: true });
      const f = path.join(dir, tenFile(d.episode));
      try { fs.writeFileSync(f, JSON.stringify(d)); } catch (e) { return tra(500, { ok: false, loi: e.message }); }
      console.log(`DA-NHAN ${f}`);
      tra(200, { ok: true, file: path.relative(GOC, f).replaceAll('\\', '/'), notes: d.notes.length });
      if (MOT_LAN && !xong) { xong = true; res.on('finish', () => setTimeout(() => process.exit(0), 50)); }
    });
    return;
  }
  tra(404, { ok: false, loi: 'chỉ có GET /ping và POST /gop-y' });
});
sv.on('error', (e) => { console.error(e.code === 'EADDRINUSE' ? `Cổng ${CONG} đang bận (máy nhận khác đang chạy?)` : e.message); process.exit(1); });
sv.listen(CONG, '127.0.0.1', () => {
  console.log(`CHO-NHAN http://127.0.0.1:${CONG}  → ghi vào ${dir}${MOT_LAN ? '  (thoát sau lần nhận đầu)' : ''}`);
  if (HET_GIO > 0) setTimeout(() => { console.log('HET-GIO: không ai gửi'); process.exit(3); }, HET_GIO * 60000);
});
