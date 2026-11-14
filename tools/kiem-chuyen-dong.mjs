// kiem-chuyen-dong.mjs — kiểm CHUYỂN ĐỘNG bằng số: camera + nhân vật ở đầu / giữa / cuối từng shot.
// Bắt "hình tĩnh đúng nhưng phim đứng": shot camera đứng im, shot đứng im hoàn toàn, lệch so với kit.
//
//   node tools/kiem-chuyen-dong.mjs <trang index.html> [--kit kich-ban/<ep>] [--goc goc.json] [--shots s001,s002|all] [--json out.json]
//
//   --kit   thư mục có kit.json (và bang-shot.json nếu có): so camera/nhân vật đầu-cuối với kit, loại camera với bảng shot.
//   --goc   {"<boiCanh>": {"goc":[x,y,z],"xoay":độ}} đổi toạ độ kit (gốc tâm sàn bối cảnh) sang toạ độ thế giới của tập. Mặc định 0.
//   Mã thoát: 0 không lỗi · 1 có lỗi.
//
// Mẫu đo (mau) của một shot: { id, dau, giua, cuoi, nvLayDuoc }, mỗi mốc = { cam:{p:[x,y,z], d:[x,y,z] đơn vị, fov}, nv:{ <tên>:{p:[x,y,z], yaw:độ} } }.
// Quy ước xoay quanh trục Y (như three.js): x' = x·cosθ + z·sinθ ; z' = −x·sinθ + z·cosθ ; rồi cộng `goc`.
import { createServer } from 'http';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { extname, join, resolve, relative, isAbsolute, dirname } from 'path';
import { pathToFileURL, fileURLToPath } from 'url';

// ---- NGƯỠNG ----
export const NGUONG = {
  camDichStud: 0.05,      // camera dịch dưới ngưỡng này (và hướng/fov đổi dưới ngưỡng) = đứng im
  camHuongDo: 0.3,
  camFovDo: 0.2,
  nvDichStud: 0.05,       // nhân vật dịch quá / quay quá = có chuyển động
  nvQuayDo: 2,
  khongThang: 0.15,       // mẫu giữa lệch khỏi đường đầu–cuối quá 15% quãng đường
  zoomVao: 0.85,          // hệ số khung hình cuối/đầu < ngưỡng = zoomIn; > 1/ngưỡng = zoomOut
  theoStud: 0.5,          // nhân vật và camera cùng dịch quá ngưỡng này, cùng chiều = theo
  kitViTriStud: 1.0,
  kitHuongDo: 8,
  kitFovDo: 5,
  kitNvStud: 1.0,
};

// ---- vector ----
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a) => Math.hypot(a[0], a[1], a[2]);
const norm = (a) => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const RAD = Math.PI / 180;
const gocGiua = (a, b) => Math.acos(Math.max(-1, Math.min(1, dot(norm(a), norm(b))))) / RAD;
const lechYaw = (a, b) => Math.abs(((a - b + 540) % 360) - 180);
const tb = (arr) => arr.reduce((s, v) => add(s, v), [0, 0, 0]).map((x) => x / arr.length);

// khoảng cách từ điểm m tới đường thẳng a→b chia chiều dài a→b
function lechDuong(a, b, m) {
  const ab = sub(b, a), l = len(ab);
  if (l < 1e-9) return 0;
  return len(cross(sub(m, a), ab)) / l / l;
}

/** Đổi điểm p (toạ độ bối cảnh của kit) sang toạ độ thế giới theo {goc:[x,y,z], xoay:độ}. */
export function doiToaDo(p, goc) {
  const g = goc && goc.goc ? goc.goc : [0, 0, 0];
  const th = ((goc && goc.xoay) || 0) * RAD, c = Math.cos(th), s = Math.sin(th);
  return [p[0] * c + p[2] * s + g[0], p[1] + g[1], -p[0] * s + p[2] * c + g[2]];
}

// điểm nhìn ước lượng: giao gần nhất của tia đầu và tia cuối (hoặc 10 stud trước camera đầu nếu song song)
function diemNhin(c0, c1) {
  const o1 = c0.p, d1 = norm(c0.d), o2 = c1.p, d2 = norm(c1.d);
  const w = sub(o1, o2), b = dot(d1, d2), d = dot(d1, w), e = dot(d2, w), den = 1 - b * b;
  if (den > 1e-6) {
    const s = (b * e - d) / den, u = (e - b * d) / den;
    if (s > 0.5 && u > 0.5 && s < 300 && u < 300) return mul(add(add(o1, mul(d1, s)), add(o2, mul(d2, u))), 0.5);
  }
  return add(o1, mul(d1, 10));
}

function chiSo(mau) {
  const { dau, cuoi } = mau;
  const c0 = dau.cam, c1 = cuoi.cam;
  const dich = len(sub(c1.p, c0.p)), huong = gocGiua(c0.d, c1.d), dFov = Math.abs(c1.fov - c0.fov);
  const camDungIm = dich < NGUONG.camDichStud && huong < NGUONG.camHuongDo && dFov < NGUONG.camFovDo;
  // nhân vật
  const ten = Object.keys(dau.nv || {}).filter((k) => cuoi.nv && cuoi.nv[k]);
  const nvDi = ten.map((k) => ({ k, dich: len(sub(cuoi.nv[k].p, dau.nv[k].p)), quay: lechYaw(cuoi.nv[k].yaw, dau.nv[k].yaw) }));
  const nvDungIm = !nvDi.some((n) => n.dich > NGUONG.nvDichStud || n.quay > NGUONG.nvQuayDo);
  // khongThang: mẫu giữa lệch đường nối đầu–cuối (vị trí nếu camera dịch, hướng nếu quay)
  let khongThang = false, lechMax = 0;
  if (mau.giua) {
    const m = mau.giua.cam;
    if (dich >= NGUONG.camDichStud) lechMax = Math.max(lechMax, lechDuong(c0.p, c1.p, m.p));
    if (len(sub(norm(c1.d), norm(c0.d))) > 0.005) lechMax = Math.max(lechMax, lechDuong(norm(c0.d), norm(c1.d), norm(m.d)));
    khongThang = lechMax > NGUONG.khongThang;
  }
  return { camDungIm, nvDungIm, nvDi, dich, huong, dFov, khongThang, lechMax };
}

function suyLoai(mau, cs) {
  if (cs.camDungIm) return 'dung';
  const c0 = mau.dau.cam, c1 = mau.cuoi.cam;
  const ten = Object.keys(mau.dau.nv || {}).filter((k) => mau.cuoi.nv && mau.cuoi.nv[k]);
  let r0, r1;
  if (ten.length) { r0 = tb(ten.map((k) => mau.dau.nv[k].p)); r1 = tb(ten.map((k) => mau.cuoi.nv[k].p)); }
  else { r0 = r1 = diemNhin(c0, c1); }
  const d0 = len(sub(r0, c0.p)) || 1e-6, d1 = len(sub(r1, c1.p));
  const tan = (f) => Math.tan(f * RAD / 2);
  const Z = (d1 * tan(c1.fov)) / (d0 * tan(c0.fov));
  if (ten.length) {
    const nvDich = sub(r1, r0), camDich = sub(c1.p, c0.p);
    if (len(nvDich) > NGUONG.theoStud && len(camDich) > NGUONG.theoStud && dot(norm(nvDich), norm(camDich)) > 0.5
      && Z > NGUONG.zoomVao && Z < 1 / NGUONG.zoomVao) return 'theo';
  }
  if (Z < NGUONG.zoomVao) return 'zoomIn';
  if (Z > 1 / NGUONG.zoomVao) return 'zoomOut';
  return 'lia';
}

const f1 = (x) => (Math.round(x * 10) / 10).toString();
const f2 = (x) => (Math.round(x * 100) / 100).toString();

/** Chấm một shot. → { loi:[], canhBao:[], loaiCam, camDungIm, nvDungIm, khongThang }. bangShot/kit = mục của CHÍNH shot đó. */
export function chamShot(mau, { bangShot, kit, goc } = {}) {
  const loi = [], canhBao = [];
  const cs = chiSo(mau);
  const loaiCam = suyLoai(mau, cs);
  const dungHoanToan = cs.camDungIm && cs.nvDungIm;
  const loaiBang = bangShot && bangShot.camera && bangShot.camera.loai;
  const cacTen = Object.keys(mau.dau.nv || {});
  if (mau.nvCoCast && !mau.nvLayDuoc && !cacTen.length) canhBao.push('không lấy được vị trí nhân vật, chỉ đo camera');

  if (dungHoanToan) loi.push('ĐỨNG IM HOÀN TOÀN: camera và nhân vật không đổi từ đầu đến cuối shot');
  else if (cs.camDungIm) {
    const msg = `CAMERA ĐỨNG IM: dịch ${f2(cs.dich)} stud, hướng ${f2(cs.huong)}°, fov ${f2(cs.dFov)}° (luật: camera gần như không bao giờ đứng yên)`;
    if (loaiBang === 'dung') canhBao.push(msg + ' — bảng shot ghi loại dung');
    else loi.push(msg);
  }

  if (bangShot) {
    if (bangShot.hinh >= 2 && dungHoanToan) loi.push(`KHÔNG CÓ CHUYỂN ĐỘNG: bảng shot hinh=${bangShot.hinh} nhưng đo ra đứng im`);
    if (loaiBang) {
      const ok = loaiBang === loaiCam || (loaiBang === 'doiHuong' && (cs.khongThang || loaiCam !== 'dung'));
      if (!ok) loi.push(`SAI LOẠI: bảng shot ghi ${loaiBang}, đo ra ${loaiCam}`);
    }
  }

  if (kit && kit.may) {
    const g = goc && (goc.goc || goc.xoay !== undefined ? goc : (bangShot && goc[bangShot.boiCanh])) || null;
    for (const moc of ['dau', 'cuoi']) {
      const k = kit.may[moc], m = mau[moc] && mau[moc].cam;
      if (!k || !m) continue;
      const p = doiToaDo(k.p, g), d = norm(sub(doiToaDo(k.nhin, g), p));
      const dv = len(sub(m.p, p)), dh = gocGiua(m.d, d), df = Math.abs(m.fov - k.fov);
      const sai = [];
      if (dv > NGUONG.kitViTriStud) sai.push(`vị trí lệch ${f2(dv)} stud`);
      if (dh > NGUONG.kitHuongDo) sai.push(`hướng lệch ${f1(dh)}°`);
      if (df > NGUONG.kitFovDo) sai.push(`fov lệch ${f1(df)}°`);
      if (sai.length) loi.push(`LỆCH KIT: camera ${moc}: ${sai.join(', ')}`);
    }
    for (const nv of kit.nhanVat || []) {
      for (const moc of ['dau', 'cuoi']) {
        if (!nv[moc]) continue;
        const m = mau[moc] && mau[moc].nv && mau[moc].nv[nv.id];
        if (!m) { if (mau.nvLayDuoc) canhBao.push(`không thấy nhân vật "${nv.id}" ở mốc ${moc} để so với kit`); continue; }
        const dv = len(sub(m.p, doiToaDo(nv[moc], goc && (goc.goc || goc.xoay !== undefined ? goc : (bangShot && goc[bangShot.boiCanh])) || null)));
        if (dv > NGUONG.kitNvStud) loi.push(`NHÂN VẬT LỆCH: ${nv.id} ${moc} lệch ${f2(dv)} stud so với kit`);
      }
    }
  }
  return { loi, canhBao, loaiCam, camDungIm: cs.camDungIm, nvDungIm: cs.nvDungIm, khongThang: cs.khongThang };
}

// ================= phần chạy thật (trình duyệt) =================
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.ttf': 'font/ttf', '.otf': 'font/otf', '.woff': 'font/woff', '.woff2': 'font/woff2', '.css': 'text/css', '.svg': 'image/svg+xml', '.wasm': 'application/wasm' };

async function main() {
  const args = process.argv.slice(2), opt = {}, pos = [];
  for (let i = 0; i < args.length; i++) { if (args[i].startsWith('--')) opt[args[i].slice(2)] = args[++i]; else pos.push(args[i]); }
  if (!pos[0]) { console.error('Dùng: node tools/kiem-chuyen-dong.mjs <trang index.html> [--kit kich-ban/<ep>] [--goc goc.json] [--shots s001,s002|all] [--json out.json]'); process.exit(1); }
  const doc = async (f) => (existsSync(f) ? JSON.parse(await readFile(f, 'utf8')) : null);
  const kitDoc = opt.kit ? await doc(join(resolve(opt.kit), 'kit.json')) : null;
  const bangDoc = opt.kit ? await doc(join(resolve(opt.kit), 'bang-shot.json')) : null;
  if (opt.kit && !kitDoc) { console.error('Không thấy kit.json trong ' + opt.kit); process.exit(1); }
  const goc = opt.goc ? JSON.parse(await readFile(resolve(opt.goc), 'utf8')) : null;
  const kitBy = Object.fromEntries(((kitDoc && kitDoc.shots) || []).map((s) => [s.id, s]));
  const bangBy = Object.fromEntries(((bangDoc && bangDoc.shots) || []).map((s) => [s.id, s]));

  // trang: máy chủ tĩnh ở gốc repo (như look.mjs), bản dist/ mở bằng file://
  const root = process.cwd();
  let srv, url;
  const abs = resolve(pos[0].split('?')[0]);
  if (!existsSync(abs)) { console.error('Không thấy trang: ' + pos[0]); process.exit(1); }
  const rel = relative(root, abs).replace(/\\/g, '/');
  if (rel.startsWith('dist/') || rel.startsWith('..') || isAbsolute(rel)) url = pathToFileURL(abs).href;
  else {
    srv = createServer(async (req, res) => {
      try {
        const p = resolve(join(root, decodeURIComponent(req.url.split('?')[0])));
        if (relative(root, p).startsWith('..')) throw 0;
        const b = await readFile(p);
        res.writeHead(200, { 'content-type': TYPES[extname(p).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-store' });
        res.end(b);
      } catch { res.writeHead(404); res.end(); }
    }).listen(0);
    await new Promise((r) => srv.once('listening', r));
    url = `http://localhost:${srv.address().port}/${rel}`;
  }

  const t00 = Date.now();
  const { launchBrowser } = await import('./browser.mjs');
  const browser = await launchBrowser();
  const page = await browser.newPage({ viewport: { width: 540, height: 960 }, deviceScaleFactor: 0.5 });
  page.on('pageerror', (e) => console.log('  pageerror:', e.message));
  await page.goto(url);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 300000 });
  const info = await page.evaluate(() => ({ fps: window.__shots.fps, list: window.__shots.list.map((s) => ({ id: s.id, t0: s.t0, t1: s.t1, cast: Object.keys(s.cast || {}).filter((k) => s.cast[k]) })) }));
  const FPS = info.fps || 30;
  const want = !opt.shots || opt.shots === 'all' ? null : new Set(opt.shots.split(','));
  const shots = info.list.filter((s) => !want || want.has(s.id));
  if (!shots.length) { console.error('Không có shot nào khớp'); process.exit(1); }

  // lấy mẫu một thời điểm: camera + nhân vật (theo tên trong shot.cast)
  const lay = (arg) => page.evaluate(async ({ t, names }) => {
    const r = window.renderAt(t); if (r && r.then) await r;
    const st = window.__stage, cam = st.camera, sc = st.scene;
    sc.updateMatrixWorld(true); cam.updateMatrixWorld(true);
    const V = cam.position.constructor, Q = cam.quaternion.constructor;
    const d = cam.getWorldDirection(new V()), cp = cam.getWorldPosition(new V());
    const nv = {};
    for (const n of names) {
      const o = sc.children.find((c) => c.name === n) || sc.getObjectByName(n);
      if (!o || o.visible === false) continue;
      let vis = true; for (let q = o; q; q = q.parent) if (q.visible === false) { vis = false; break; }
      if (!vis) continue;
      const p = o.getWorldPosition(new V()), q = o.getWorldQuaternion(new Q());
      const f = new V(0, 0, 1).applyQuaternion(q);
      nv[n] = { p: [p.x, p.y, p.z], yaw: Math.atan2(f.x, f.z) * 180 / Math.PI };
    }
    return { cam: { p: [cp.x, cp.y, cp.z], d: [d.x, d.y, d.z], fov: cam.fov }, nv };
  }, arg);

  const ketQua = [];
  let nLoi = 0, nBao = 0, nCamIm = 0, nImHet = 0, coNv = 0;
  for (let i = 0; i < shots.length; i++) {
    const s = shots[i], e = 1 / FPS;
    const ts = { dau: s.t0 + e, giua: (s.t0 + s.t1) / 2, cuoi: s.t1 - e };
    const mau = { id: s.id };
    for (const k of ['dau', 'giua', 'cuoi']) mau[k] = await lay({ t: ts[k], names: s.cast });
    mau.nvLayDuoc = s.cast.length > 0 && Object.keys(mau.dau.nv).length > 0;
    mau.nvCoCast = s.cast.length > 0;
    if (mau.nvLayDuoc) coNv++;
    const kq = chamShot(mau, { bangShot: bangBy[s.id], kit: kitBy[s.id], goc });
    ketQua.push({ id: s.id, t0: s.t0, t1: s.t1, mau, ...kq });
    if (kq.camDungIm) nCamIm++;
    if (kq.camDungIm && kq.nvDungIm) nImHet++;
    for (const m of kq.loi) { console.log(`LỖI ${s.id}: ${m}`); nLoi++; }
    for (const m of kq.canhBao) { console.log(`CẢNH BÁO ${s.id}: ${m}`); nBao++; }
    process.stdout.write(`\r  đã đo ${i + 1}/${shots.length}   `);
  }
  process.stdout.write('\n');
  await browser.close(); if (srv) srv.close();
  const pc = (n) => (100 * n / shots.length).toFixed(1) + '%';
  const giay = ((Date.now() - t00) / 1000).toFixed(0);
  console.log(`TỔNG KẾT: ${shots.length} shot · camera đứng im ${nCamIm} (${pc(nCamIm)}) · đứng im hoàn toàn ${nImHet} (${pc(nImHet)}) · ` +
    `lấy được nhân vật ở ${coNv}/${shots.length} shot · ${nLoi} lỗi, ${nBao} cảnh báo · ${giay} s`);
  if (opt.json) {
    const f = resolve(opt.json); await mkdir(dirname(f), { recursive: true });
    await writeFile(f, JSON.stringify({ page: pos[0], kit: opt.kit || null, ngưỡng: NGUONG, tongShot: shots.length, camDungIm: nCamIm, dungImHoanToan: nImHet, shots: ketQua }, null, 1));
    console.log('Đã ghi ' + f);
  }
  process.exit(nLoi ? 1 : 0);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
