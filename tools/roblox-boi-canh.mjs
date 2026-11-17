// tools/roblox-boi-canh.mjs — đưa BỐI CẢNH three.js (engine/envs/<env>.js) sang Roblox Studio theo đúng toạ độ.
//   xuat: mở trang tập bằng Chrome ẩn, đọc mọi vật trong env_<env> → <out>/<env>.json (model trong manifest: id + vị trí/xoay/cỡ;
//         khối: hộp/mặt/trụ/cầu, tường có lỗ, lưới gộp tách lại thành hộp + tam giác; màu, loại vân, màu TB của ảnh).
//   phuc-vu: máy chủ cục bộ để Studio nạp xay.lua + JSON (tools/roblox-boi-canh.lua dựng thành Part, nhân bản model từ workspace.Tap3_NhomA).
import { createServer } from 'http'; import { readFile, writeFile, mkdir } from 'fs/promises'; import { extname, join, resolve, relative } from 'path';
import { launchBrowser } from './browser.mjs';
const root = process.cwd(); const args = process.argv.slice(2); const cmd = args.shift();
const flag = (k, d) => { const i = args.indexOf(k); if (i < 0) return d; const v = args[i + 1]; args.splice(i, 2); return v; };
const OUT = flag('--out', 'output/roblox-boi-canh');
if (cmd === 'phuc-vu') {
  // máy chủ cho Studio: /<env>.json từ OUT, /xay.lua = tools/roblox-boi-canh.lua (Studio: HttpService:GetAsync → loadstring)
  const port = +flag('--port', '8765');
  createServer(async (q, r) => { try { const u = decodeURIComponent(q.url.split('?')[0]); const p = u === '/xay.lua' ? resolve(root, 'tools/roblox-boi-canh.lua') : resolve(root, OUT, '.' + u);
    if (u !== '/xay.lua' && relative(resolve(root, OUT), p).startsWith('..')) throw 0; const b = await readFile(p); r.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' }); r.end(b); } catch { r.writeHead(404); r.end(); } })
    .listen(port, '127.0.0.1', () => console.log(`Studio đọc ở http://127.0.0.1:${port}/ (xay.lua + <env>.json từ ${OUT}). Ctrl+C để tắt.`));
} else if (cmd !== 'xuat' || args.length < 2) {
  console.log(['Dùng:', '  node tools/roblox-boi-canh.mjs xuat <trang tập> <env> [env2…] [--out dir]',
    '  node tools/roblox-boi-canh.mjs phuc-vu [--port 8765] [--out dir]', 'Xem docs/roblox.md mục 8.'].join('\n'));
  process.exit(cmd ? 1 : 0);
} else {
const [page0, ...envNames] = args;
const T = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.ogg': 'audio/ogg', '.ttf': 'font/ttf', '.webp': 'image/webp', '.mp3': 'audio/mpeg' };
const srv = createServer(async (q, r) => { try { const p = resolve(join(root, decodeURIComponent(q.url.split('?')[0]))); if (relative(root, p).startsWith('..')) throw 0; const b = await readFile(p); r.writeHead(200, { 'content-type': T[extname(p).toLowerCase()] || 'application/octet-stream' }); r.end(b); } catch { r.writeHead(404); r.end(); } }).listen(0);
await new Promise((r) => srv.once('listening', r));
const ids = JSON.parse(await readFile('assets/manifest.json', 'utf8')).map((a) => a.id);
const br = await launchBrowser(); const pg = await br.newPage({ viewport: { width: 540, height: 960 } });
pg.on('pageerror', (e) => console.log('pageerror', e.message));
await pg.goto(`http://localhost:${srv.address().port}/${page0}`);
await pg.waitForFunction(() => window.__ready === true, null, { timeout: 300000 });
for (const env of envNames) {
  const out = await pg.evaluate(({ env, ids }) => {
    const THREE = window.THREE, IDS = new Set(ids);
    const g = window.__stage.scene.getObjectByName('env_' + env); if (!g) return { err: 'không thấy env_' + env };
    g.updateMatrixWorld(true); const inv = g.matrixWorld.clone().invert();
    const P = new THREE.Vector3(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), M = new THREE.Matrix4(), box = new THREE.Box3(), e = new THREE.Euler();
    const vis = (o) => { for (let x = o; x && x !== g; x = x.parent) if (!x.visible) return false; return true; };
    const dec = (m) => { m.decompose(P, Q, S); e.setFromQuaternion(Q, 'YXZ'); return { p: P.toArray().map((v) => +v.toFixed(3)), q: Q.toArray().map((v) => +v.toFixed(4)), s: S.toArray().map((v) => +v.toFixed(4)) }; };
    const col = (m) => { const mt = Array.isArray(m) ? m[0] : m; return { c: mt?.color ? '#' + mt.color.getHexString() : null, op: mt?.transparent && typeof mt.opacity === "number" ? +mt.opacity.toFixed(2) : 1, map: !!mt?.map, avg: mt?.map ? avgOf(mt.map) : null, kind: mt?.userData?.matKind || mt?.userData?.matDecl || null, em: mt?.emissive && mt.emissiveIntensity > 0 && mt.emissive.getHex() ? '#' + mt.emissive.getHexString() : null }; };
    const glb = [], prim = [], skip = {};
    const LIN = THREE.LinearSRGBColorSpace, _cc = new THREE.Color();
    const hexLin = (r, g2, b) => '#' + _cc.setRGB(r, g2, b, LIN).getHexString();
    const decodeBatch = (o) => {
      const geo = o.geometry, I = geo.index.array, Pp = geo.attributes.position, Cc = geo.attributes.color; if (!Pp) return null;
      M.multiplyMatrices(inv, o.matrixWorld); const MW = M.clone();
      const V = (i) => new THREE.Vector3(Pp.getX(i), Pp.getY(i), Pp.getZ(i)).applyMatrix4(MW);
      const col = (i) => Cc ? hexLin(Cc.getX(i), Cc.getY(i), Cc.getZ(i)) : null;
      const boxes = [], tris = []; let k = 0, guard = 0;
      while (k < I.length) {
        if (++guard > 400000) return null;
        // hộp = 6 mặt tứ giác liên tiếp (a,a+1,a+2,a,a+2,a+3)
        let isBox = k + 36 <= I.length;
        if (isBox) for (let f = 0; f < 6; f++) { const j = k + f * 6, a = I[j]; if (!(I[j + 1] === a + 1 && I[j + 2] === a + 2 && I[j + 3] === a && I[j + 4] === a + 2 && I[j + 5] === a + 3 && a === I[k] + f * 4)) { isBox = false; break; } }
        if (isBox) {
          const a0 = I[k]; const pts = []; for (let v = 0; v < 24; v++) { const p = V(a0 + v); if (!pts.some((q) => q.distanceToSquared(p) < 1e-8)) pts.push(p); }
          if (pts.length !== 8) return null;
          const c0 = pts[0], others = pts.slice(1).sort((x, y) => x.distanceToSquared(c0) - y.distanceToSquared(c0));
          let e1 = others[0].clone().sub(c0), e2 = others[1].clone().sub(c0), e3 = others[2].clone().sub(c0);
          const ctr = pts.reduce((s2, p) => s2.add(p), new THREE.Vector3()).multiplyScalar(1 / 8);
          const sz = [e1.length(), e2.length(), e3.length()];
          const x = e1.normalize(), y = e2.normalize(); let z = new THREE.Vector3().crossVectors(x, y); if (z.dot(e3) < 0) { y.negate(); z = new THREE.Vector3().crossVectors(x, y); }
          const R = new THREE.Matrix4().makeBasis(x, y, z), q = new THREE.Quaternion().setFromRotationMatrix(R);
          boxes.push([...ctr.toArray(), ...q.toArray(), ...sz].map((v) => +v.toFixed(3)).concat([col(a0)]));
          k += 36; continue;
        }
        // tam giác hai mặt: (a,a+1,a+2),(a+3,a+4,a+5)
        const a = I[k]; const t3 = [V(I[k]), V(I[k + 1]), V(I[k + 2])].map((p) => p.toArray().map((v) => +v.toFixed(3)));
        tris.push([...t3[0], ...t3[1], ...t3[2], col(a)]);
        k += (I[k + 3] === a + 3) ? 6 : 3;
      }
      return { boxes, tris };
    }; const AV = new Map(); const cv = document.createElement('canvas'); cv.width = cv.height = 8; const cx = cv.getContext('2d', { willReadFrequently: true });
    const avgOf = (t) => { if (AV.has(t)) return AV.get(t); let r = null; try { const im = t.image; if (im) { cx.clearRect(0, 0, 8, 8); cx.drawImage(im, 0, 0, 8, 8); const px = cx.getImageData(0, 0, 8, 8).data; let a = [0, 0, 0], n = 0; for (let i = 0; i < px.length; i += 4) if (px[i + 3] > 20) { a[0] += px[i]; a[1] += px[i + 1]; a[2] += px[i + 2]; n++; } if (n) r = '#' + a.map((v) => Math.round(v / n).toString(16).padStart(2, '0')).join(''); } } catch (e) {} AV.set(t, r); return r; };
    const walk = (o) => {
      if (!vis(o)) return;
      if (o !== g && IDS.has(o.name)) {
        box.makeEmpty(); o.updateMatrixWorld(true);
        // bbox trong khung CỦA vật (để có cỡ đúng khi vật xoay)
        const invO = o.matrixWorld.clone().invert(), lb = new THREE.Box3(), v = new THREE.Vector3();
        o.traverse((m) => { if (m.isMesh && m.geometry) { m.geometry.computeBoundingBox(); const bb = m.geometry.boundingBox; const mm = new THREE.Matrix4().multiplyMatrices(invO, m.matrixWorld);
          for (let i = 0; i < 8; i++) { v.set(i & 1 ? bb.max.x : bb.min.x, i & 2 ? bb.max.y : bb.min.y, i & 4 ? bb.max.z : bb.min.z).applyMatrix4(mm); lb.expandByPoint(v); } } });
        const c = lb.getCenter(new THREE.Vector3()), sz = lb.getSize(new THREE.Vector3());
        M.multiplyMatrices(inv, o.matrixWorld); const d = dec(M);
        const cw = c.clone().applyMatrix4(M);
        glb.push({ id: o.name, holder: o.parent?.name, ...d, bboxLocal: sz.toArray().map((x) => +x.toFixed(3)), center: cw.toArray().map((x) => +x.toFixed(3)), sizeWorld: sz.clone().multiply(new THREE.Vector3(...d.s)).toArray().map((x) => +x.toFixed(3)) });
        return;
      }
      if (o.isMesh && o.geometry) {
        const t = o.geometry.type, pa = o.geometry.parameters || {};
        let ex = {}; if (t !== 'BoxGeometry') { o.geometry.computeBoundingBox(); const bb = o.geometry.boundingBox; ex.bb = [...bb.min.toArray(), ...bb.max.toArray()].map((v) => +v.toFixed(3)); }
        if (t === 'ShapeGeometry' || t === 'ExtrudeGeometry') { const sh = [].concat(pa.shapes || []); ex.sh = sh.map((x) => { const e = x.extractPoints(4); return { o: e.shape.map((v) => [+v.x.toFixed(3), +v.y.toFixed(3)]), h: e.holes.map((hh) => hh.map((v) => [+v.x.toFixed(3), +v.y.toFixed(3)])) }; }); }
        if (t === 'BufferGeometry' && o.geometry.index && !o.isInstancedMesh) { const decoded = decodeBatch(o); if (decoded) { ex.boxes = decoded.boxes; ex.tris = decoded.tris; } }
        const pa2 = (t === 'ShapeGeometry' || t === 'TubeGeometry' || t === 'ExtrudeGeometry') ? { depth: pa.options?.depth } : pa;
        const push = (mw) => { M.multiplyMatrices(inv, mw); prim.push({ n: o.name, t, pa: pa2, ...ex, ...dec(M), ...col(o.material) }); };
        if (o.isInstancedMesh) { const im = new THREE.Matrix4(); for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, im); push(new THREE.Matrix4().multiplyMatrices(o.matrixWorld, im)); } }
        else push(o.matrixWorld);
      }
      for (const c of o.children) walk(c);
    };
    walk(g);
    const types = {}; prim.forEach((p) => types[p.t] = (types[p.t] || 0) + 1);
    return { env, glb, prim, types };
  }, { env, ids });
  if (out.err) { console.log(env, out.err); continue; }
  await mkdir(OUT, { recursive: true }); await writeFile(`${OUT}/${env}.json`, JSON.stringify(out));
  const gi = {}; out.glb.forEach((x) => gi[x.id] = (gi[x.id] || 0) + 1);
  console.log(env, 'GLB', out.glb.length, JSON.stringify(gi), '\n  khối', out.prim.length, JSON.stringify(out.types));
}
await br.close(); srv.close();
}
