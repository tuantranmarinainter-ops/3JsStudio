#!/usr/bin/env node
// khop-bao-cao-ep003.mjs — CHỈ ĐO, không đổi cách đặt: bảng lệch của các model nhap/* ep003 đang được co vào vùng khối (e3-tiem.js rb(), e3-pho.js nhaGlb(), …).
// Mở trang tập thật (episodes/ep003/index.html), tua mỗi --buoc giây, thu mọi node tên 'nhap/<id>' (gốc GLB do assets.instance đặt tên = id),
// lấy hệ số co THỰC từng trục (matrixWorld) × bbox GLB đo (doBbox) = kích thước đang đặt = "vùng khối" hiện tại; rồi hỏi khop(): nếu co ĐỀU theo luật loại thì lệch bao nhiêu.
// Dùng: node tools/khop-bao-cao-ep003.mjs [--ra output/khop/ep003-lech.md] [--buoc 8] [--nguong 0.2] [--trang episodes/ep003/index.html]
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './browser.mjs';
import { doBbox } from './nhap-model.mjs';
import { khop } from '../engine/khop-tai-san.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = process.argv.slice(2), opt = (k, d) => (arg.includes(k) ? arg[arg.indexOf(k) + 1] : d);
const RA = path.resolve(ROOT, opt('--ra', 'output/khop/ep003-lech.md')), BUOC = parseFloat(opt('--buoc', '8')), NG = parseFloat(opt('--nguong', '0.2'));
const TRANG = opt('--trang', 'episodes/ep003/index.html');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.css': 'text/css', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.webp': 'image/webp' };
const srv = http.createServer((req, res) => {
  try { const p = path.resolve(ROOT, '.' + decodeURIComponent(req.url.split('?')[0])); if (path.relative(ROOT, p).startsWith('..')) throw 0; const b = fs.readFileSync(p); res.writeHead(200, { 'content-type': TYPES[path.extname(p).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-store' }); res.end(b); } catch { res.writeHead(404); res.end(); }
}).listen(0);
await new Promise((r) => srv.once('listening', r));
const browser = await launchBrowser();
const thu = new Map();   // khoá = id + '@' + tên nhóm cha → { id, nhom, s:[sx,sy,sz] }
try {
  const page = await browser.newPage({ viewport: { width: 540, height: 960 } });
  page.on('pageerror', (e) => console.log('  pageerror:', e.message));
  await page.goto(`http://localhost:${srv.address().port}/${TRANG}`);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 300000 });
  const tong = await page.evaluate(() => +document.getElementById('root')?.dataset.duration || 140);
  for (let t = 0.1; t < tong; t += BUOC) {
    const r = await page.evaluate(async (t) => {
      const x = window.renderAt(t); if (x && x.then) await x;
      const sc = window.__stage.scene, out = [], M = (window.THREE || {}), v = new M.Vector3(), q = new M.Quaternion(), s = new M.Vector3();
      sc.updateMatrixWorld(true);
      sc.traverse((o) => {
        if (!/^nhap\//.test(o.name) || !o.parent) return;
        let vis = true; for (let a = o; a; a = a.parent) if (a.visible === false) vis = false;
        if (!vis) return;
        let nhom = ''; for (let a = o.parent; a && !nhom; a = a.parent) if (a.name && !/^kn_/.test(a.name) && !/^nhap\//.test(a.name)) nhom = a.name;
        o.matrixWorld.decompose(v, q, s); out.push({ id: o.name, nhom, s: [s.x, s.y, s.z].map((k) => Math.abs(k)) });
      });
      return out;
    }, t);
    for (const o of r) { const k = o.id + '@' + o.nhom.replace(/_\d+$/, ''); if (!thu.has(k)) thu.set(k, o); }
  }
  await page.close();
} finally { await browser.close(); srv.close(); }

const man = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets', 'manifest.json'), 'utf8')), cache = {};
const loaiCua = (id) => (/cua|cuaso|door|window/.test(id) ? 'tam' : /^nhap\/pho-(nha|tiem|thap)/.test(id) ? 'nha' : 'do-vat');
const rows = [];
for (const o of thu.values()) {
  const e = man.find((x) => x.id === o.id); if (!e?.src) continue;
  try { cache[o.id] ||= await doBbox(path.join(ROOT, e.src)); } catch { continue; }
  const B = cache[o.id].bbox, s = o.s, P = B.map((b, i) => b * s[i]);
  const V = { x: [-P[0] / 2, P[0] / 2], y: [0, P[1]], z: [-P[2] / 2, P[2] / 2] };
  const loai = loaiCua(o.id), k = khop({ bbox: B, vung: V, loai });
  rows.push({ ...o, B, P, meo: Math.max(...s) / Math.min(...s), loai, k });
}
rows.sort((a, b) => b.meo - a.meo);
const f = (x) => (x == null ? '—' : (x * 100).toFixed(0) + '%'), d3 = (a) => a.map((x) => x.toFixed(2)).join(' × ');
const nhieu = rows.filter((r) => r.k.tong > NG);
const L = ['# Bảng lệch tài sản so với khối — ep003 (CHỈ ĐO, chưa đổi cách đặt)', '',
  `Sinh bởi \`node tools/khop-bao-cao-ep003.mjs\` trên ${TRANG} (tua mỗi ${BUOC}s). "Vùng khối" = kích thước model đang được đặt (bbox GLB × hệ số co thực từng trục). **Méo** = co lớn nhất ÷ nhỏ nhất giữa 3 trục (1,00 = co đều). **Lệch (nếu khớp đều)** = \`khop()\` theo luật loại suy từ tên (nhà → \`nha\`, cửa → \`tam\`, còn lại \`do-vat\`) so với vùng đang đặt: số cho biết hình sẽ ĐỔI bao nhiêu nếu bật khop.`, '',
  `- Model đã thay (khác nhóm): **${rows.length}** · méo > 20%: **${rows.filter((r) => r.meo > 1.2).length}** · lệch > ${(NG * 100).toFixed(0)}% nếu khớp đều: **${nhieu.length}**`, '',
  '| Nhóm đặt | Model | Bbox gốc (x×y×z) | Đang đặt | Co từng trục | Méo | Loại | Lệch X | Lệch Y | Lệch Z | Cảnh báo |', '|---|---|---|---|---|---|---|---|---|---|---|'];
for (const r of rows) L.push(`| ${r.nhom || '—'} | ${r.id.replace(/^nhap\//, '')} | ${d3(r.B)} | ${d3(r.P)} | ${d3(r.s)} | ${r.meo.toFixed(2)} | ${r.loai} | ${f(r.k.lech.x)} | ${f(r.k.lech.y)} | ${f(r.k.lech.z)} | ${r.k.canhBao.join('; ') || '—'} |`);
L.push('', 'Ghi chú: nhà trong `e3-pho.js` (`nhaGlb`) chỉ phủ phần mặt tiền của model (n/s/y trong bảng `NHA`) nên bbox đầy đủ lớn hơn lô; hệ số co lấy từ ma trận thế giới (xoay lệch ±12,5° ở nha-nen-1 sinh cắt xiên nhẹ).', '');
fs.mkdirSync(path.dirname(RA), { recursive: true }); fs.writeFileSync(RA, L.join('\n'), 'utf8');
console.log(`${rows.length} model · méo>20% ${rows.filter((r) => r.meo > 1.2).length} · lệch>${NG * 100}% ${nhieu.length} → ${path.relative(ROOT, RA)}`);
