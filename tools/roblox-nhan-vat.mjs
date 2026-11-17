// tools/roblox-nhan-vat.mjs — xuất NGUYÊN mesh nhân vật gốc của tập (goc/characters.js: Gà, Bắp, ông Bách…) ra .glb cho Roblox Studio (3D Importer).
//   node tools/roblox-nhan-vat.mjs [trang] [--out output/roblox-phim/nhan-vat] [--chi 0,1]
// Mỗi mesh của nhân vật = 1 node (→ 1 MeshPart khi nhập), tên = tên mảnh của tools/roblox-phim.mjs (nv<NN>_<vai>__<chỉ số con>),
// gốc node = TÂM hộp của mesh, trục = trục của mesh, cỡ thật đã nướng vào lưới → bộ phát (tools/roblox-phim.lua) đặt CFrame/cỡ từng khung thẳng lên MeshPart.
// Giữ màu, vân (ảnh canvas: hoodie sọc, lông gấu…). Mặt dán (c.face) KHÔNG xuất: bộ phát vẫn dùng tấm Decal mặt (đổi biểu cảm theo khung).
// Cần GLTFExporter r187 ở output/roblox-phim/lib/GLTFExporter.js (cùng bản vendor/three).
import { createServer } from 'http'; import { readFile, writeFile, mkdir } from 'fs/promises'; import { extname, join, resolve, relative } from 'path';
import { launchBrowser } from './browser.mjs';
const root = process.cwd(); const args = process.argv.slice(2);
const flag = (k, d) => { const i = args.indexOf(k); if (i < 0) return d; const v = args[i + 1]; args.splice(i, 2); return v; };
const OUT = flag('--out', 'output/roblox-phim/nhan-vat'); const CHI = flag('--chi', null);
const page0 = args[0] || 'episodes/ep6B/index.html';
const T = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.ttf': 'font/ttf', '.webp': 'image/webp' };
const srv = createServer(async (q, r) => { try { const p = resolve(join(root, decodeURIComponent(q.url.split('?')[0]))); if (relative(root, p).startsWith('..')) throw 0; const b = await readFile(p); r.writeHead(200, { 'content-type': T[extname(p).toLowerCase()] || 'application/octet-stream' }); r.end(b); } catch { r.writeHead(404); r.end(); } }).listen(0);
await new Promise((r) => srv.once('listening', r));
const br = await launchBrowser(); const pg = await br.newPage({ viewport: { width: 270, height: 480 } });
pg.on('pageerror', (e) => console.log('pageerror', e.message));
await pg.goto(`http://localhost:${srv.address().port}/${page0}`);
await pg.waitForFunction(() => window.__ready === true, null, { timeout: 300000 });
await mkdir(OUT, { recursive: true });
const res = await pg.evaluate(async ({ chi }) => {
  const THREE = window.THREE, goc = window.__goc, K = goc.KIT, CA = goc.CAST;
  const { GLTFExporter } = await import('/output/roblox-phim/lib/GLTFExporter.js');
  const VAI = ['ga', 'bap', 'bach', 'kid2', 'baker', 'tailor', 'folk1', 'folk2', 'folk3', 'bachF', 'mayorN', 'mayorD', 'guardA', 'guardB', 'bearR', 'bearY'];
  const out = [];
  for (let i = 0; i < CA.length; i++) {
    if (chi && !chi.includes(i)) continue;
    const c = CA[i], top = 'nv' + String(i).padStart(2, '0') + '_' + (VAI[i] || c.name);
    // tư thế nghỉ, đứng ở gốc, không xoay
    const sv = { p: c.root.position.clone(), q: c.root.quaternion.clone(), s: c.root.scale.clone(), v: c.root.visible };
    K.applyPose(c, K.REST(c)); c.root.position.set(0, 0, 0); c.root.quaternion.identity(); c.root.visible = true;
    c.root.updateMatrixWorld(true);
    const inv = c.root.matrixWorld.clone().invert();
    const sc = new THREE.Scene(), grp = new THREE.Group(); grp.name = top; sc.add(grp);
    let n = 0;
    c.root.traverse((m) => {
      if (!m.isMesh || !m.geometry || m === c.face) return;
      const ix = []; for (let x = m; x && x !== c.root; x = x.parent) ix.unshift(x.parent.children.indexOf(x));
      const M = new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld), P = new THREE.Vector3(), Q = new THREE.Quaternion(), S = new THREE.Vector3(); M.decompose(P, Q, S);
      const g = m.geometry.clone(); g.scale(S.x, S.y, S.z); g.computeBoundingBox(); const cb = g.boundingBox.getCenter(new THREE.Vector3()); g.translate(-cb.x, -cb.y, -cb.z);
      const mat = (Array.isArray(m.material) ? m.material : [m.material]).map((x) => { const y = x.clone(); y.side = THREE.FrontSide; return y; });
      const node = new THREE.Mesh(g, mat.length > 1 ? mat : mat[0]); node.name = top + '__' + ix.join('_');
      node.position.copy(cb.clone().applyQuaternion(Q).add(P)); node.quaternion.copy(Q); node.visible = true;
      grp.add(node); n++;
    });
    const glb = await new Promise((ok, no) => new GLTFExporter().parse(sc, ok, no, { binary: true, onlyVisible: false }));
    c.root.position.copy(sv.p); c.root.quaternion.copy(sv.q); c.root.scale.copy(sv.s); c.root.visible = sv.v;
    let s = ''; const u8 = new Uint8Array(glb); for (let k = 0; k < u8.length; k += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(k, k + 0x8000));
    out.push({ i, top, n, b64: btoa(s) });
  }
  return out;
}, { chi: CHI ? CHI.split(',').map(Number) : null });
for (const r of res) { const f = `${OUT}/${r.top}.glb`; const b = Buffer.from(r.b64, 'base64'); await writeFile(f, b); console.log(`${f}  ${r.n} mảnh  ${(b.length / 1024).toFixed(0)} KB`); }
await br.close(); srv.close();
