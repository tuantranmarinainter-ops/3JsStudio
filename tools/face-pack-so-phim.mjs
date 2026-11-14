#!/usr/bin/env node
// face-pack-so-phim.mjs — đối chiếu MẶT MẪU (trang duyệt) với MẶT TRONG PHIM của một tập.
//   node tools/face-pack-so-phim.mjs <ep> [--out output/face-pack]
// Với mỗi biểu cảm được shot dùng: chọn shot mà đầu nhân vật to + quay về máy nhất, dựng khung thật (renderAt), cắt cận đầu;
// so bằng số canvas mặt engine đang vẽ với ảnh assets/faces/<bộ>/NN_tên.png vẽ theo đúng khung của bộ (0% = giống hệt mẫu).
// Ra: <out>/so-mau-phim.jpg (mẫu | phim, mỗi hàng một biểu cảm) + <out>/so-mau-phim.json. Cần `node tools/face-pack-mau.mjs` chạy trước (ảnh mẫu r6-altiwyre.png).
import fs from 'node:fs';
import path from 'node:path';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { launchBrowser } from './browser.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ep = process.argv[2] || 'ep003';
const oi = process.argv.indexOf('--out'), out = path.resolve(ROOT, oi > 0 ? process.argv[oi + 1] : 'output/face-pack');
fs.mkdirSync(out, { recursive: true });
const T = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.mp3': 'audio/mpeg', '.ttf': 'font/ttf', '.wasm': 'application/wasm' };
const srv = createServer((q, r) => { try { const u = decodeURIComponent(q.url.split('?')[0]); const b = fs.readFileSync(path.join(ROOT, u)); r.writeHead(200, { 'content-type': T[path.extname(u)] || 'application/octet-stream' }); r.end(b); } catch { r.writeHead(404); r.end(); } }).listen(0);
await new Promise((r) => srv.once('listening', r));
const br = await launchBrowser(), page = await br.newPage({ viewport: { width: 540, height: 960 } });
const errs = []; page.on('pageerror', (e) => errs.push(e.message));
await page.goto(`http://localhost:${srv.address().port}/episodes/${ep}/index.html`);
await page.waitForFunction('window.__ready === true', { timeout: 240000 });

// tên ảnh NN_tên của từng biểu cảm (GA_FACES) + bí danh phim
const R15 = await page.evaluate(async () => { const m = await import('/engine/r15.js'); const fp = await import('/engine/face-pack.js'); return { F: m.GA_FACES, M: m.GA_FACE_MAP, P: fp.FACE_PACKS, pack: fp.activeFaceSet().__name || globalThis.__facePack || null, fx: globalThis.__autoFx?.matAlti }; });
const fileOf = (k) => { k = R15.M[k] || k; const f = R15.F.find(([, n]) => n === k); return f ? String(f[0]).padStart(2, '0') + '_' + f[1] : null; };
const list = await page.evaluate(() => window.__shots.list.map((s) => ({ id: s.id, t0: s.t0, t1: s.t1, cast: Object.fromEntries(Object.entries(s.cast || {}).map(([n, c]) => [n, c.face || null])) })));
const dung = {};                                         // biểu cảm → [{id, t, vai}]
for (const s of list) for (const [vai, f] of Object.entries(s.cast)) if (f) (dung[f] ||= []).push({ id: s.id, t: s.t0 + (s.t1 - s.t0) * 0.6, vai });

/** dựng khung t, đo đầu của `vai`: bbox màn hình (0..1), độ quay về máy, mặt đang vẽ, % khác so với ảnh mẫu của bộ */
const do1 = (t, vai, file, pack) => page.evaluate(async ({ t, vai, file, pack }) => {
  window.renderAt(t);
  const { scene, camera, THREE } = window.__stage; let root = null;
  scene.traverse((o) => { if (!root && o.name === vai && o.isGroup) root = o; });
  if (!root) return { loi: 'không thấy nhân vật' };
  let face = null, head = null, vis = true;
  root.traverse((o) => { if (o.name === 'face' && o.isMesh) face = o; if (o.name === 'head_mesh') head = o; });
  if (!face || !head) return { loi: 'không phải thân R6' };
  for (let o = face; o; o = o.parent) if (!o.visible) vis = false;
  const bb = new THREE.Box3().setFromObject(head), c = bb.getCenter(new THREE.Vector3()), r = bb.getSize(new THREE.Vector3()).length() / 2;
  const pc = c.clone().project(camera), up = camera.up.clone().applyQuaternion(camera.quaternion).normalize();
  const pe = c.clone().addScaledVector(up, r).project(camera);
  const rad = Math.hypot((pe.x - pc.x) / 2, (pe.y - pc.y) / 2 * (camera.aspect ? 1 / camera.aspect : 1)) || 0;   // bán kính theo bề ngang khung (0..1)
  const q = head.getWorldQuaternion(new THREE.Quaternion()), nz = new THREE.Vector3(0, 0, 1).applyQuaternion(q);
  const huong = nz.dot(camera.getWorldPosition(new THREE.Vector3()).sub(c).normalize());
  // phụ kiện trên đầu (tóc / mũ / đồ Roblox)
  const phu = []; root.traverse((o) => { if (o.isMesh && /hair|hat|toc|mu|fringe|bang|acc|rb/i.test(o.name) && o.visible) phu.push(o.name); });
  // so canvas mặt với ảnh mẫu của bộ
  const cv = face.material.map?.image, P = (await import('/engine/face-pack.js')).FACE_PACKS[pack];
  let khac = null;
  if (cv && cv.getContext && file && P) {
    const img = await new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = `${P.base}/${file}.png`; });
    if (img && P.fit === 'full') {
      const W = cv.width, k = document.createElement('canvas'); k.width = k.height = W; const g = k.getContext('2d'), B = P.box;
      g.drawImage(img, B.x0 * W, B.y0 * W, (B.x1 - B.x0) * W, (B.y1 - B.y0) * W);
      const a = cv.getContext('2d').getImageData(0, 0, W, W).data, b = g.getImageData(0, 0, W, W).data; let n = 0, m = 0;
      for (let i = 3; i < a.length; i += 4) { if (a[i] > 24 || b[i] > 24) { m++; if (Math.abs(a[i] - b[i]) > 24 || Math.abs(a[i - 3] - b[i - 3]) + Math.abs(a[i - 2] - b[i - 2]) + Math.abs(a[i - 1] - b[i - 1]) > 48) n++; } }
      khac = m ? +(100 * n / m).toFixed(2) : 0;
    }
  }
  const skin = '#' + (head.material.color?.getHexString?.() || '');
  return { x: (pc.x + 1) / 2, y: (1 - pc.y) / 2, rad, sau: pc.z > 1, vis, huong: +huong.toFixed(2), ga: root.userData?.char?.lastFace?.ga ?? null, khac, phu: [...new Set(phu)].slice(0, 6), skin };
}, { t, vai, file, pack });

const pack = R15.pack || 'emote37', kq = [];
for (const [bc, ds] of Object.entries(dung).sort((a, b) => b[1].length - a[1].length)) {
  const file = fileOf(bc); let tot = null;
  for (const d of ds.slice(0, 6)) {
    const m = await do1(d.t, d.vai, file, pack);
    if (m.loi || !m.vis || m.sau || m.x < 0.05 || m.x > 0.95 || m.y < 0.03 || m.y > 0.97) continue;
    const diem = m.rad * Math.max(0, m.huong);
    if (!tot || diem > tot.diem) tot = { ...d, ...m, diem };
  }
  if (!tot) { kq.push({ bieuCam: bc, file, soLan: ds.length, loi: 'không shot nào thấy rõ đầu (trong 6 shot đầu)' }); continue; }
  await do1(tot.t, tot.vai, file, pack);                 // dựng lại đúng khung rồi chụp
  const f = path.join(out, `_phim-${bc}.png`); await page.locator('canvas').first().screenshot({ path: f });
  const md = await sharp(f).metadata(), S = Math.round(Math.max(60, tot.rad * md.width * 2.6));
  const L = Math.max(0, Math.min(md.width - S, Math.round(tot.x * md.width - S / 2))), Tp = Math.max(0, Math.min(md.height - S, Math.round(tot.y * md.height - S / 2)));
  tot.anh = await sharp(f).extract({ left: L, top: Tp, width: Math.min(S, md.width), height: Math.min(S, md.height) }).resize(300, 300).jpeg({ quality: 88 }).toBuffer();
  tot.pxDau = Math.round(tot.rad * md.width * 2 / 1.5); fs.unlinkSync(f);
  kq.push({ bieuCam: bc, file, soLan: ds.length, ...tot });
}
await br.close(); srv.close();

// ảnh mẫu: ô của trang duyệt (face-pack-mau.mjs → r6-<bộ>.png, lưới 8 cột ô 220)
const mauF = path.join(out, `r6-${pack.startsWith('altiwyre') ? 'altiwyre' : pack}.png`), coMau = fs.existsSync(mauF);
const H = 300, W = 1200, lop = [], chu = [];
for (const [i, k] of kq.entries()) {
  const y = i * (H + 8);
  const idx = k.file ? +k.file.slice(0, 2) : -1;
  if (coMau && idx >= 0) lop.push({ input: await sharp(mauF).extract({ left: (idx % 8) * 220, top: Math.floor(idx / 8) * 220, width: 220, height: 220 }).resize(H, H).toBuffer(), left: 300, top: y });
  if (k.anh) lop.push({ input: k.anh, left: 620, top: y });
  const e = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  chu.push(`<text x="10" y="${y + 40}" font-size="22" font-weight="bold">${e(k.file || k.bieuCam)}</text><text x="10" y="${y + 70}" font-size="17">dùng ${k.soLan} lần</text>`
    + (k.loi ? `<text x="620" y="${y + 150}" font-size="17" fill="#b00">${e(k.loi)}</text>`
      : `<text x="940" y="${y + 40}" font-size="20" font-weight="bold">${e(k.id)} · ${e(k.vai)}</text><text x="940" y="${y + 70}" font-size="17">t = ${k.t.toFixed(2)} s</text><text x="940" y="${y + 98}" font-size="17">đầu ≈ ${k.pxDau} px · quay về máy ${k.huong}</text><text x="940" y="${y + 126}" font-size="17">canvas mặt khác mẫu: ${k.khac ?? '?'}%</text><text x="940" y="${y + 154}" font-size="15">da ${e(k.skin)}</text><text x="940" y="${y + 180}" font-size="13">${e((k.phu || []).join(', ').slice(0, 34))}</text>`));
}
const TH = kq.length * (H + 8) + 40;
chu.push(`<text x="300" y="${TH - 12}" font-size="18" font-weight="bold">MẪU ĐÃ DUYỆT (đầu trơn)</text><text x="620" y="${TH - 12}" font-size="18" font-weight="bold">TRONG PHIM (${ep}, bộ ${pack})</text>`);
lop.push({ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${TH}" font-family="Arial" fill="#111">${chu.join('')}</svg>`), left: 0, top: 0 });
await sharp({ create: { width: W, height: TH, channels: 3, background: '#f2f3f5' } }).composite(lop).jpeg({ quality: 85 }).toFile(path.join(out, 'so-mau-phim.jpg'));
fs.writeFileSync(path.join(out, 'so-mau-phim.json'), JSON.stringify({ ep, pack, matAlti: R15.fx, loiTrang: errs, kq: kq.map(({ anh, diem, ...r }) => r) }, null, 1));
console.log(`bộ đang dùng: ${pack} (ô FX matAlti: ${R15.fx}) · ${kq.length} biểu cảm · lỗi trang: ${errs.length}`);
for (const k of kq) console.log(k.loi ? `${k.bieuCam}: ${k.loi}` : `${(k.file || k.bieuCam).padEnd(26)} ${k.id} ${k.vai.padEnd(10)} đầu ${String(k.pxDau).padStart(4)}px hướng ${k.huong} khác mẫu ${k.khac}% vẽ=${k.ga} da ${k.skin} [${(k.phu || []).join(',')}]`);
