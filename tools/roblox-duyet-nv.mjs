// tools/roblox-duyet-nv.mjs — ảnh PHIM của từng nhân vật gốc (tư thế nghỉ, nền trơn, chính diện + nghiêng 3/4) cho bảng duyệt phim | Roblox,
// kèm duyet.json: chiều cao, tâm nhìn, camera (để chụp Roblox cùng khung) và tấm mặt (vị trí/cỡ/số mặt) cho từng vai.
import { createServer } from 'http'; import { readFile, writeFile, mkdir } from 'fs/promises'; import { extname, join, resolve, relative } from 'path';
import { launchBrowser } from './browser.mjs';
const root = process.cwd(); const OUT = process.argv[2] || 'output/roblox-phim/duyet-nhan-vat';
const T = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.ttf': 'font/ttf', '.webp': 'image/webp' };
const srv = createServer(async (q, r) => { try { const p = resolve(join(root, decodeURIComponent(q.url.split('?')[0]))); if (relative(root, p).startsWith('..')) throw 0; const b = await readFile(p); r.writeHead(200, { 'content-type': T[extname(p).toLowerCase()] || 'application/octet-stream' }); r.end(b); } catch { r.writeHead(404); r.end(); } }).listen(0);
await new Promise((r) => srv.once('listening', r));
const br = await launchBrowser(); const pg = await br.newPage({ viewport: { width: 400, height: 400 } });
await pg.goto(`http://localhost:${srv.address().port}/episodes/ep6B/index.html`);
await pg.waitForFunction(() => window.__ready === true, null, { timeout: 300000 });
await mkdir(`${OUT}/phim`, { recursive: true });
const res = await pg.evaluate(async () => {
  const THREE = window.THREE, goc = window.__goc, K = goc.KIT, CA = goc.CAST, VAI = ['ga', 'bap', 'bach', 'kid2', 'baker', 'tailor', 'folk1', 'folk2', 'folk3', 'bachF', 'mayorN', 'mayorD', 'guardA', 'guardB', 'bearR', 'bearY'];
  const S = 480, cv = document.createElement('canvas'); cv.width = cv.height = S;
  const R = new THREE.WebGLRenderer({ canvas: cv, antialias: true, preserveDrawingBuffer: true }); R.setSize(S, S, false); R.outputColorSpace = THREE.SRGBColorSpace;
  const sc = new THREE.Scene(); sc.background = new THREE.Color('#cfd3d8');
  sc.add(new THREE.HemisphereLight('#ffffff', '#8a8a8a', 1.6)); const dl = new THREE.DirectionalLight('#ffffff', 1.8); dl.position.set(4, 8, 6); sc.add(dl);
  const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 200), out = [];
  for (let i = 0; i < CA.length; i++) {
    const c = CA[i], vai = 'nv' + String(i).padStart(2, '0') + '_' + VAI[i], par = c.root.parent;
    const sv = { p: c.root.position.clone(), q: c.root.quaternion.clone(), v: c.root.visible };
    K.applyPose(c, K.REST(c)); c.root.position.set(0, 0, 0); c.root.quaternion.identity(); c.root.visible = true;
    if (c.setExpr) { try { c.setExpr(c.name === 'Bap' ? null : 'neutral'); } catch (e) {} }
    sc.add(c.root); c.root.updateMatrixWorld(true);
    const box = new THREE.Box3(); c.root.traverse((m) => { if (m.isMesh && m.visible) { let ok = true; for (let x = m; x && x !== c.root; x = x.parent) if (!x.visible) ok = false; if (ok) box.expandByObject(m); } });
    const H = box.max.y - Math.max(0, box.min.y), cy = (box.min.y + box.max.y) / 2, D = (H / 2) / Math.tan(THREE.MathUtils.degToRad(15)) * 1.25;
    const views = {}; for (const [k, a] of [['truoc', 0], ['34', Math.PI / 4]]) { cam.position.set(Math.sin(a) * D, cy, Math.cos(a) * D); cam.lookAt(0, cy, 0); R.render(sc, cam); views[k] = cv.toDataURL('image/png'); }
    let face = null; if (c.face && c.face.visible) { c.face.geometry.computeBoundingBox(); const bb = c.face.geometry.boundingBox, P = new THREE.Vector3(), Q = new THREE.Quaternion(), Sc = new THREE.Vector3();
      c.face.matrixWorld.decompose(P, Q, Sc); const ctr = bb.getCenter(new THREE.Vector3()).applyMatrix4(c.face.matrixWorld), sz = bb.getSize(new THREE.Vector3()).multiply(Sc);
      const src = c.face.material.map?.image?.src || ''; const m = src.match(/face_(\d{3})/); face = { p: ctr.toArray(), q: Q.toArray(), s: sz.toArray(), id: m ? +m[1] : null }; }
    out.push({ vai, ten: c.name, H, cy, D, face, views });
    (par || window.__stage.scene).add(c.root); c.root.position.copy(sv.p); c.root.quaternion.copy(sv.q); c.root.visible = sv.v;
  }
  return out;
});
const meta = [];
for (const r of res) { for (const [k, u] of Object.entries(r.views)) await writeFile(`${OUT}/phim/${r.vai}_${k}.png`, Buffer.from(u.split(',')[1], 'base64')); const { views, ...m } = r; meta.push(m); }
await writeFile(`${OUT}/duyet.json`, JSON.stringify(meta, null, 1)); console.log('ảnh phim', res.length * 2, '→', OUT);
await br.close(); srv.close();
