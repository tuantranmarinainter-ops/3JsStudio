// Trạm 7: dựng KHỐI XÁM thẳng từ danh sách mốc bối cảnh, chụp 8 hướng cố định để người dùng duyệt bố cục.
//   node tools/khoi-xam.mjs <boi-canh.json> --out <thư mục> [--w 540] [--h 960] [--huong truoc,sau]
//   Ghi <out>/<id>_<hướng>.png (9:16) cho 8 hướng: truoc, sau, trai, phai, tren-xuong, duoi-len, thang-mat, ngang-hong
//   (tools/huong-boi-canh.mjs), in số hộp + danh sách mốc KHÔNG đọc được số.
//   Chỉ dùng số trong file (xem tools/kiem/khoi-xam-doc.mjs); mốc thiếu số không bị đoán, chỉ được liệt kê.
//   Hạ tầng: launchBrowser (tools/browser.mjs) + three trong vendor/. Không có engine mới.
import { createServer } from 'http';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { extname, join, resolve, relative, basename } from 'path';
import { launchBrowser } from './browser.mjs';
import { docBoiCanh } from './kiem/khoi-xam-doc.mjs';
import { locHuong } from './huong-boi-canh.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json' };

const TRANG = `<!doctype html><meta charset="utf-8"><body style="margin:0;background:#000">
<script type="importmap">{"imports":{"three":"/vendor/three/three.module.js"}}</script>
<script type="module">
import * as THREE from 'three';
const mau = (c) => new THREE.MeshLambertMaterial({ color: c });
const vien = (m) => m.add(new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry), new THREE.LineBasicMaterial({ color: '#15181c' })));
window.dung = (d, W, H, ids) => {
  const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  r.setPixelRatio(1); r.setSize(W, H); document.body.appendChild(r.domElement);
  const sc = new THREE.Scene(); sc.background = new THREE.Color('#1c2026');
  sc.add(new THREE.HemisphereLight('#ffffff', '#555a60', 1.6));
  const sun = new THREE.DirectionalLight('#ffffff', 1.6); sun.position.set(-20, 40, 30); sc.add(sun);
  const bb = new THREE.Box3();
  const them = (m) => { sc.add(m); bb.expandByObject(m); };
  if (d.san) { const f = new THREE.Mesh(new THREE.BoxGeometry(d.san.rong, 0.1, d.san.sau), mau('#3a3f45')); f.position.y = -0.35; sc.add(f); bb.expandByObject(f); }
  d.hop.forEach((h, i) => {
    const s = [h.max[0] - h.min[0], h.max[1] - h.min[1], h.max[2] - h.min[2]];
    const m = new THREE.Mesh(new THREE.BoxGeometry(s[0], s[1], s[2]), h.mong ? new THREE.MeshBasicMaterial({ color: '#e8c872', transparent: true, opacity: 0.8, depthTest: false }) : mau(i % 2 ? '#a9aeb3' : '#7c8288'));
    if (h.mong) m.renderOrder = 5; // mặt phẳng mỏng (mốc chỉ có 1 số trên một trục, vd mặt kính) hay nằm lọt trong tường → luôn vẽ lên trên
    m.position.set(h.min[0] + s[0] / 2, h.min[1] + s[1] / 2, h.min[2] + s[2] / 2); m.name = h.id;
    vien(m); them(m);
  });
  const nom = (o) => { // R6 khối: chân + thân mỗi phần 2/5.48 chiều cao, đầu là phần còn lại
    const g = new THREE.Group(), c = o.cao, ch = c * 2 / 5.48, th = ch, dau = c - ch - th, m = mau('#d8dbde');
    const b = (w, hh, dd, x, y) => { const k = new THREE.Mesh(new THREE.BoxGeometry(w, hh, dd), m); k.position.set(x, y + hh / 2, 0); g.add(k); vien(k); };
    b(1, ch, 1, -0.5, 0); b(1, ch, 1, 0.5, 0); b(2, th, 1, 0, ch); b(1, th, 1, -1.5, ch); b(1, th, 1, 1.5, ch); b(dau, dau, dau, 0, ch + th);
    g.position.set(o.dat[0], o.dat[1], o.dat[2]); g.name = o.ten; return g;
  };
  d.nom.forEach((o) => them(nom(o)));
  d.khoi.forEach((o) => { const k = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mau('#e0b34a')); k.position.set(o.dat[0], o.dat[1] + 0.5, o.dat[2]); vien(k); them(k); });
  const c = bb.getCenter(new THREE.Vector3()), sz = bb.getSize(new THREE.Vector3());
  const asp = W / H;
  // vùng chính: sàn nếu có (tường rộng 48 sẽ làm khung dọc quá xa), không thì cả bbox
  const rongChinh = d.san ? d.san.rong : sz.x, sauChinh = d.san ? d.san.sau : sz.z;
  { // DẤU NHẬN HƯỚNG (giống nhau ở mọi ảnh): dải đỏ nằm dọc mép TRƯỚC (+Z), cột xanh dương ở góc trước-phải (+X,+Z)
    const x0 = c.x - rongChinh / 2, x1 = c.x + rongChinh / 2, zT = c.z + sauChinh / 2;
    const dai = new THREE.Mesh(new THREE.BoxGeometry(rongChinh, 0.06, 0.5), new THREE.MeshBasicMaterial({ color: '#d0342c' })); dai.position.set(c.x, -0.27, zT - 0.25); sc.add(dai);
    const cot = new THREE.Mesh(new THREE.BoxGeometry(0.5, 3, 0.5), new THREE.MeshBasicMaterial({ color: '#2b6fd6' })); cot.position.set(x1 - 0.25, 1.2, zT - 0.25); sc.add(cot);
  }
  const NHAN = { truoc: 'TRƯỚC · nhìn từ +Z', sau: 'SAU · nhìn từ −Z', trai: 'TRÁI · nhìn từ −X', phai: 'PHẢI · nhìn từ +X', 'tren-xuong': 'TỪ TRÊN XUỐNG', 'duoi-len': 'TỪ DƯỚI LÊN', 'thang-mat': 'THẲNG MẶT · ngang mắt từ +Z', 'ngang-hong': 'NGANG HÔNG · ngang mắt từ +X' };
  const chup = (cam, id) => { r.render(sc, cam);   // in nhãn hướng ở góc trên-trái ảnh
    const cv2 = document.createElement('canvas'); cv2.width = W; cv2.height = H; const g = cv2.getContext('2d'); g.drawImage(r.domElement, 0, 0);
    if (id && NHAN[id]) { g.font = 'bold 22px sans-serif'; const tw = g.measureText(NHAN[id]).width; g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(8, 8, tw + 16, 32); g.fillStyle = '#fff'; g.fillText(NHAN[id], 16, 32); }
    return cv2.toDataURL('image/png'); };
  const out = {};
  const lam = {
    'tren-xuong': () => { // nhìn thẳng xuống, +X phải, +Z (về camera chính) xuống đáy ảnh
      const fov = 40, cam = new THREE.PerspectiveCamera(fov, asp, 0.5, 600);
      const t = Math.tan(fov * Math.PI / 360);
      const dist = Math.max((rongChinh * 1.1) / (2 * t * asp), (sauChinh * 1.1) / (2 * t));
      cam.position.set(c.x, dist, c.z); cam.up.set(0, 0, -1); cam.lookAt(c.x, 0, c.z);
      return cam;
    },
    'thang-mat': () => { // ngang tầm mắt: mắt ~4.75 (tâm mặt Gà), đứng ở rìa +Z, nhìn vào giữa vùng
      const fov = 55, cam = new THREE.PerspectiveCamera(fov, asp, 0.5, 600);
      const t = Math.tan(fov * Math.PI / 360);
      const dist = (rongChinh * 0.55) / (2 * t * asp);
      cam.position.set(c.x, 4.75, Math.max(c.z + dist, bb.max.z + 1)); cam.lookAt(c.x, Math.min(sz.y / 3, 7), c.z);
      return cam;
    },
  };
  // 6 hướng còn lại: máy đặt trên vòng quanh tâm c, nhìn vào c. Khoảng cách đủ thấy trọn bề ngang mặt đối diện.
  const vong = (dx, dz, rongMat, yMay, yNhin, fov) => () => {
    const cam = new THREE.PerspectiveCamera(fov, asp, 0.5, 600), t = Math.tan(fov * Math.PI / 360);
    const dist = Math.max((rongMat * 0.8) / (2 * t * asp), sz.y * 1.35 / (2 * t)) + (dx ? rongChinh : sauChinh) * 0.25;
    cam.position.set(c.x + dx * dist, typeof yMay === 'function' ? yMay(dist) : yMay, c.z + dz * dist); cam.lookAt(c.x, yNhin, c.z);
    return cam;
  };
  const nghieng = (dist) => 4.75 + dist * Math.tan(30 * Math.PI / 180); // chếch xuống ~30° so với tâm
  lam.truoc = vong(0, 1, rongChinh, nghieng, Math.min(sz.y / 2, 8), 50);
  lam.sau = vong(0, -1, rongChinh, nghieng, Math.min(sz.y / 2, 8), 50);
  lam.trai = vong(-1, 0, sauChinh, nghieng, Math.min(sz.y / 2, 8), 50);
  lam.phai = vong(1, 0, sauChinh, nghieng, Math.min(sz.y / 2, 8), 50);
  lam['duoi-len'] = () => { // sát đất ~1 stud ở phía trước, ngước nhìn lên
    const fov = 60, cam = new THREE.PerspectiveCamera(fov, asp, 0.5, 600), t = Math.tan(fov * Math.PI / 360);
    const dist = (rongChinh * 0.45) / (2 * t * asp) + sauChinh * 0.15;
    cam.position.set(c.x, 0.8, c.z + dist); cam.lookAt(c.x, Math.max(sz.y * 0.8, 9), c.z);   // ngước ~35° trở lên
    return cam;
  };
  lam['ngang-hong'] = () => { // ngang tầm mắt 4.75 từ +X, nhìn thẳng ngang
    const fov = 55, cam = new THREE.PerspectiveCamera(fov, asp, 0.5, 600), t = Math.tan(fov * Math.PI / 360);
    const dist = (sauChinh * 0.55) / (2 * t * asp);
    cam.position.set(Math.max(c.x + dist, bb.max.x + 1), 4.75, c.z); cam.lookAt(c.x, 4.75, c.z);
    return cam;
  };
  for (const id of ids) out[id] = chup(lam[id](), id);
  r.dispose();
  return out;
};
window.__ready = true;
</script>`;

export async function khoiXam(file, outDir, { w = 540, h = 960, huong = null } = {}) {
  const ds = locHuong(huong);
  const bc = JSON.parse(await readFile(file, 'utf8'));
  const id = bc.boiCanh || basename(file, '.json');
  const d = docBoiCanh(bc);
  await mkdir(outDir, { recursive: true });
  const srv = createServer(async (req, res) => {
    try {
      const u = decodeURIComponent(req.url.split('?')[0]);
      if (u === '/__khoi-xam.html') { res.writeHead(200, { 'content-type': TYPES['.html'] }); return res.end(TRANG); }
      const p = resolve(join(ROOT, u));
      if (relative(ROOT, p).startsWith('..')) throw 0;
      const b = await readFile(p);
      res.writeHead(200, { 'content-type': TYPES[extname(p)] || 'application/octet-stream' }); res.end(b);
    } catch { res.writeHead(404); res.end(); }
  }).listen(0);
  await new Promise((r) => srv.once('listening', r));
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    const loi = []; page.on('pageerror', (e) => loi.push(e.message));
    await page.goto(`http://localhost:${srv.address().port}/__khoi-xam.html`);
    await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
    const o = await page.evaluate(([dd, W, H, ids]) => window.dung(dd, W, H, ids), [d, w, h, ds.map((x) => x.id)]);
    if (loi.length) throw new Error('trang lỗi: ' + loi[0]);
    const luu = async (ten, url) => { const f = join(outDir, `${id}_${ten}.png`); await writeFile(f, Buffer.from(url.split(',')[1], 'base64')); return f; };
    return { id, ...d, anh: await Promise.all(ds.map((x) => luu(x.id, o[x.id]))) };
  } finally { await browser.close(); srv.close(); }
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  const a = process.argv.slice(2), opt = {}, pos = [];
  for (let i = 0; i < a.length; i++) { if (a[i].startsWith('--')) opt[a[i].slice(2)] = a[++i]; else pos.push(a[i]); }
  if (!pos[0] || !opt.out) { console.error('Dùng: node tools/khoi-xam.mjs <boi-canh.json> --out <thư mục> [--w 540 --h 960] [--huong truoc,sau]'); process.exit(1); }
  const r = await khoiXam(pos[0], opt.out, { w: +opt.w || 540, h: +opt.h || 960, huong: opt.huong });
  console.log(`khối xám "${r.id}": ${r.hop.length} hộp, ${r.nom.length} hình nộm, ${r.khoi.length} khối 1×1×1, sàn ${r.san ? r.san.rong + '×' + r.san.sau : '(không có)'}`);
  for (const f of r.anh) console.log('  ảnh:', f);
  if (r.khongDoc.length) {
    console.log(`KHÔNG ĐỌC ĐƯỢC SỐ (${r.khongDoc.length}) — chưa dựng, cần bổ sung vùng trong file mốc:`);
    for (const k of r.khongDoc) console.log(`  - ${k.id}: ${k.lyDo}  [${k.vung}]`);
  }
}
