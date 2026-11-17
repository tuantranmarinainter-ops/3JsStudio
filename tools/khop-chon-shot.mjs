#!/usr/bin/env node
// khop-chon-shot.mjs — với mỗi model trong bảng lệch (méo > --meo), tìm GIÂY mà model hiện rõ nhất trong khung (diện tích chiếu lên màn hình lớn nhất, ưu tiên nằm trọn trong khung).
// Dùng: node tools/khop-chon-shot.mjs [--trang episodes/ep003/index.html] [--bang output/khop/ep003-lech.md] [--meo 1.2] [--buoc 1] [--ra output/khop/duyet-ep003/chon-shot.json]
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './browser.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = process.argv.slice(2), opt = (k, d) => (arg.includes(k) ? arg[arg.indexOf(k) + 1] : d);
const TRANG = opt('--trang', 'episodes/ep003/index.html'), BUOC = parseFloat(opt('--buoc', '1')), MEO = parseFloat(opt('--meo', '1.2'));
const RA = path.resolve(ROOT, opt('--ra', 'output/khop/duyet-ep003/chon-shot.json'));
const mucTieu = fs.readFileSync(path.resolve(ROOT, opt('--bang', 'output/khop/ep003-lech.md')), 'utf8').split('\n').filter((l) => l.startsWith('| ') && !/^\| (Nhóm|---)/.test(l))
  .map((l) => l.split('|').map((x) => x.trim())).filter((c) => parseFloat(c[6]) > MEO).map((c) => ({ nhom: c[1], id: 'nhap/' + c[2], meo: parseFloat(c[6]) }));
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.css': 'text/css', '.mp3': 'audio/mpeg', '.webp': 'image/webp' };
const srv = http.createServer((req, res) => { try { const p = path.resolve(ROOT, '.' + decodeURIComponent(req.url.split('?')[0])); if (path.relative(ROOT, p).startsWith('..')) throw 0; const b = fs.readFileSync(p); res.writeHead(200, { 'content-type': TYPES[path.extname(p).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-store' }); res.end(b); } catch { res.writeHead(404); res.end(); } }).listen(0);
await new Promise((r) => srv.once('listening', r));
const browser = await launchBrowser(), tot = {};
try {
  const page = await browser.newPage({ viewport: { width: 540, height: 960 } });
  await page.goto(`http://localhost:${srv.address().port}/${TRANG}`);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 300000 });
  const T = await page.evaluate(() => window.__shots.total);
  for (let t = 0.2; t < T; t += BUOC) {
    const r = await page.evaluate(async ({ t, mt }) => {
      const x = window.renderAt(t); if (x && x.then) await x;
      const st = window.__stage, sc = st.scene, cam = st.camera || sc.getObjectByName('camera'), TH = window.THREE;
      sc.updateMatrixWorld(true); cam.updateMatrixWorld(true);
      const out = {}, v = new TH.Vector3();
      sc.traverse((o) => {
        const m = mt.find((q) => q.id === o.name); if (!m) return;
        let vis = true; for (let a = o; a; a = a.parent) if (a.visible === false) vis = false; if (!vis) return;
        let nhom = ''; for (let a = o.parent; a && !nhom; a = a.parent) if (a.name && !/^kn_/.test(a.name) && !/^nhap\//.test(a.name)) nhom = a.name;
        if (nhom.replace(/_-?[0-9]+$/, '') !== m.nhom.replace(/_-?[0-9]+$/, '')) return;
        const b = new TH.Box3().setFromObject(o); let x0 = 9, x1 = -9, y0 = 9, y1 = -9, truoc = 0, n = 0;
        for (const cx of [b.min.x, b.max.x]) for (const cy of [b.min.y, b.max.y]) for (const cz of [b.min.z, b.max.z]) {
          n++; const pc = v.set(cx, cy, cz).clone().applyMatrix4(cam.matrixWorldInverse); if (pc.z > -cam.near) continue;   // phía sau máy: bỏ góc này
          truoc++; v.project(cam); x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y);
        }
        if (!truoc) return;
        const sauMay = truoc < n;   // một phần ở sau máy: chỉ tính phần phía trước, đánh dấu không trọn
        const tong = (x1 - x0) * (y1 - y0), cx0 = Math.max(x0, -1), cx1 = Math.min(x1, 1), cy0 = Math.max(y0, -1), cy1 = Math.min(y1, 1);
        if (cx1 <= cx0 || cy1 <= cy0) return;
        const ro = (cx1 - cx0) * (cy1 - cy0), tron = sauMay ? 0.5 : ro / tong;
        const kk = m.id + '@' + m.nhom; if (!out[kk] || ro / 4 > out[kk].dienTich) out[kk] = { dienTich: ro / 4, tron, nhomThat: nhom };
      });
      return out;
    }, { t, mt: mucTieu });
    for (const [k, o] of Object.entries(r)) { const diem = o.dienTich * (o.tron > 0.95 ? 1 : o.tron * o.tron * 0.5); if (!tot[k] || diem > tot[k].diem) tot[k] = { ...o, diem, t: +t.toFixed(2) }; }
  }
  const dsShot = await page.evaluate(() => window.__shots.list.map((s) => ({ id: s.id, t0: s.t0, t1: s.t1 })));
  for (const m of mucTieu) { const o = tot[m.id + '@' + m.nhom]; if (o) o.shot = dsShot.find((s) => o.t >= s.t0 && o.t < s.t1)?.id; Object.assign(m, o || { khongThay: true }); }
  await page.close();
} finally { await browser.close(); srv.close(); }
fs.mkdirSync(path.dirname(RA), { recursive: true }); fs.writeFileSync(RA, JSON.stringify(mucTieu, null, 1), 'utf8');
for (const m of mucTieu) console.log(m.id, m.nhom, m.khongThay ? 'KHÔNG THẤY' : `t=${m.t} ${m.shot} chiếm ${(m.dienTich * 100).toFixed(0)}% khung, trọn ${(m.tron * 100).toFixed(0)}%`);
