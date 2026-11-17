// tools/roblox-phim.mjs — đưa CHUYỂN ĐỘNG của một tập (camera + mọi mảnh nhân vật/đạo cụ trong bối cảnh) sang Roblox Studio theo từng khung.
//   xuat <trang> --shots s017:s032 [--bo s023] [--env e3-phong] [--out dir]
//        mở trang bằng Chrome ẩn, renderAt(f/30) từng khung của các shot, ghi <out>/<shot>.json + <out>/phim.json (mục lục, bảng mảnh, phụ đề).
//        Mỗi mảnh (mesh không thuộc env_*) nằm trong hộp bối cảnh → Part Roblox: dạng (khối / cầu-elip / trụ / tấm mặt), màu, CFrame + cỡ theo khung.
//        Toạ độ quy về GỐC ENV (nhân nghịch ma trận env_<tên>), như tools/roblox-boi-canh.mjs → cộng gốc bối cảnh Roblox là khớp.
//   kiem <trang> --out dir   đo LẠI (cách khác: Box3.setFromObject) camera + tâm 6 bộ phận nhân vật ở khung đầu/giữa/cuối mỗi shot → <out>/kiem-phim.json
//   so <out>/kiem-phim.json <out>/kiem-roblox.json   in phần lệch (> 0,1 stud thì báo LỆCH)
//   phuc-vu [--port 8766] [--out dir]   máy chủ cục bộ để Studio nạp phat.lua + JSON (tools/roblox-phim.lua)
import { createServer } from 'http'; import { readFile, writeFile, mkdir } from 'fs/promises'; import { extname, join, resolve, relative } from 'path';
const root = process.cwd(); const args = process.argv.slice(2); const cmd = args.shift();
const flag = (k, d) => { const i = args.indexOf(k); if (i < 0) return d; const v = args[i + 1]; args.splice(i, 2); return v; };
const OUT = flag('--out', 'output/roblox-phim/data');

if (cmd === 'phuc-vu') {
  const port = +flag('--port', '8766');
  const LUA = { '/phat.lua': 'tools/roblox-phim.lua', '/nap.lua': 'tools/roblox-phim-nap.lua' };
  createServer(async (q, r) => { try { const u = decodeURIComponent(q.url.split('?')[0]);
    // Studio gửi kết quả đo về: POST /luu/<tên>.json → <OUT>/<tên>.json
    if (q.method === 'POST' && /^\/luu\/[\w-]+\.json$/.test(u)) { let b = ''; for await (const c of q) b += c; await writeFile(resolve(root, OUT, u.slice(5)), b); r.writeHead(200); r.end('ok'); return; }
    const p = LUA[u] ? resolve(root, LUA[u]) : resolve(root, OUT, '.' + u);
    if (!LUA[u] && relative(resolve(root, OUT), p).startsWith('..')) throw 0; const b = await readFile(p); r.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' }); r.end(b); } catch { r.writeHead(404); r.end(); } })
    .listen(port, '127.0.0.1', () => console.log(`Studio đọc ở http://127.0.0.1:${port}/ (phat.lua, nap.lua + JSON từ ${OUT}). Ctrl+C để tắt.`));
} else if (cmd === 'so') {
  const [fa, fb] = args; const A = JSON.parse(await readFile(fa, 'utf8')), B = JSON.parse(await readFile(fb, 'utf8'));
  const d3 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  let n = 0, bad = 0, worst = 0; const lines = [];
  for (const k of Object.keys(A)) {
    const a = A[k], b = B[k]; if (!b) { lines.push(`THIẾU bên Roblox: ${k}`); bad++; continue; }
    const items = [['cam', a.cam.p, b.cam?.p], ['camLook', a.cam.f, b.cam?.f]];
    for (const [nm, pa] of Object.entries(a.parts)) items.push([nm, pa, b.parts?.[nm]]);
    const dfov = Math.abs(a.cam.fov - (b.cam?.fov ?? 1e9));
    if (dfov > 0.05) { lines.push(`LỆCH ${k} fov ${a.cam.fov.toFixed(2)} ≠ ${b.cam?.fov}`); bad++; }
    for (const [nm, pa, pb] of items) { n++; if (!pb) { lines.push(`THIẾU ${k} ${nm}`); bad++; continue; } const d = d3(pa, pb); worst = Math.max(worst, d); if (d >= 0.1) { bad++; lines.push(`LỆCH ${k} ${nm} ${d.toFixed(3)} stud`); } }
  }
  console.log(lines.join('\n') || '(không có phần lệch)');
  console.log(`So ${n} điểm ở ${Object.keys(A).length} khung — lệch lớn nhất ${worst.toFixed(4)} stud — ${bad ? bad + ' mục LỆCH/THIẾU' : 'ĐẠT (< 0,1 stud)'}`);
  process.exit(bad ? 1 : 0);
} else if ((cmd !== 'xuat' && cmd !== 'kiem' && cmd !== 'liet-ke') || !args[0]) {
  console.log(['Dùng:', '  node tools/roblox-phim.mjs xuat <trang tập> --shots s017:s032 [--bo s023] [--env e3-phong] [--out dir]',
    '  node tools/roblox-phim.mjs kiem <trang tập> [--out dir]', '  node tools/roblox-phim.mjs so <kiem-phim.json> <kiem-roblox.json>',
    '  node tools/roblox-phim.mjs phuc-vu [--port 8766] [--out dir]', 'Xem docs/handoff/roblox-phim-ep6b.md.'].join('\n'));
  process.exit(cmd ? 1 : 0);
} else {
const { launchBrowser } = await import('./browser.mjs');
const page0 = args[0];
const T = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.ogg': 'audio/ogg', '.ttf': 'font/ttf', '.webp': 'image/webp', '.mp3': 'audio/mpeg', '.hdr': 'application/octet-stream' };
const srv = createServer(async (q, r) => { try { const p = resolve(join(root, decodeURIComponent(q.url.split('?')[0]))); if (relative(root, p).startsWith('..')) throw 0; const b = await readFile(p); r.writeHead(200, { 'content-type': T[extname(p).toLowerCase()] || 'application/octet-stream' }); r.end(b); } catch { r.writeHead(404); r.end(); } }).listen(0);
await new Promise((r) => srv.once('listening', r));
const br = await launchBrowser(); const pg = await br.newPage({ viewport: { width: 270, height: 480 } });
pg.on('pageerror', (e) => console.log('pageerror', e.message));
await pg.goto(`http://localhost:${srv.address().port}/${page0}`);
await pg.waitForFunction(() => window.__ready === true, null, { timeout: 300000 });
await mkdir(OUT, { recursive: true });

// ---- hàm dùng chung trong trang: tìm mảnh của bối cảnh, mô tả mảnh, camera ----
await pg.evaluate(() => {
  const THREE = window.THREE, st = window.__stage, sc = st.scene;
  const H = window.__RP = {};
  H.envOf = (name) => sc.getObjectByName('env_' + name);
  H.underEnv = (o) => { for (let x = o; x; x = x.parent) if (x.name && x.name.startsWith('env_')) return true; return false; };
  H.vis = (o) => { for (let x = o; x; x = x.parent) if (!x.visible) return false; return true; };
  const AV = new Map(), cv = document.createElement('canvas'); cv.width = cv.height = 8; const cx = cv.getContext('2d', { willReadFrequently: true });
  H.avg = (t) => { if (AV.has(t)) return AV.get(t); let r = null; try { const im = t.image; if (im) { cx.clearRect(0, 0, 8, 8); cx.drawImage(im, 0, 0, 8, 8); const px = cx.getImageData(0, 0, 8, 8).data; const a = [0, 0, 0]; let n = 0; for (let i = 0; i < px.length; i += 4) if (px[i + 3] > 20) { a[0] += px[i]; a[1] += px[i + 1]; a[2] += px[i + 2]; n++; } if (n) r = a.map((v) => v / n / 255); } } catch (e) {} AV.set(t, r); return r; };
  // mặt dán của nhân vật gốc (goc/characters.js): c.face (R6, Bắp)
  H.faces = new Map(); for (const c of window.__goc.CAST) if (c.face) H.faces.set(c.face, c);
  H.faceId = (m) => { const t = m.material?.map; const src = t?.image?.src || t?.source?.data?.src || ''; const k = src.match(/face_(\d{3})\.png/); return k ? +k[1] : null; };
  // tên mảnh DUY NHẤT, chỉ gồm [A-Za-z0-9_] (khớp tên node trong .glb của tools/roblox-nhan-vat.mjs): nv<chỉ số CAST>_<vai>__<chỉ số con…>
  H.VAI = ['ga', 'bap', 'bach', 'kid2', 'baker', 'tailor', 'folk1', 'folk2', 'folk3', 'bachF', 'mayorN', 'mayorD', 'guardA', 'guardB', 'bearR', 'bearY'];
  H.path = (m) => { const ix = []; let top = null; const CA = window.__goc.CAST;
    for (let x = m; x && x.parent; x = x.parent) { const ci = CA.findIndex((c) => c.root === x); if (ci >= 0) { top = 'nv' + String(ci).padStart(2, '0') + '_' + (H.VAI[ci] || CA[ci].name); break; } ix.unshift(x.parent.children.indexOf(x)); }
    return (top || 'canh') + '__' + ix.join('_'); };
  H.charOf = (o) => { const CA = window.__goc.CAST; for (let i = 0; i < CA.length; i++) { for (let x = o; x; x = x.parent) if (x === CA[i].root) return H.VAI[i] || CA[i].name; } return null; };
  // dạng Part: B = khối, E = cầu/elip (SpecialMesh Sphere), C = trụ (trục Y của three → trục X của Roblox), F = tấm mặt (decal)
  H.shape = (m) => {
    const g = m.geometry, t = g.type, pa = g.parameters || {};
    if (H.faces.has(m)) return 'F';
    if (t === 'CylinderGeometry') return (Math.abs(pa.radiusTop - pa.radiusBottom) < 1e-6 && (pa.thetaLength ?? 7) > 6.28) ? 'C' : 'E';
    if (/Sphere|Capsule|Cone|Torus|Icosa|Dodeca|Octa|Lathe/.test(t)) return 'E';
    if (t === 'BufferGeometry') { g.computeBoundingBox(); const s = g.boundingBox.getSize(new THREE.Vector3()); return Math.abs(s.x - s.z) < 0.02 * Math.max(s.x, 0.01) ? 'C' : 'B'; }
    return 'B';
  };
  H.style = (m) => { const mt = Array.isArray(m.material) ? m.material[0] : m.material; if (!mt) return { c: [0.8, 0.8, 0.8] };
    let c = mt.color ? [mt.color.r, mt.color.g, mt.color.b] : [1, 1, 1];
    // màu tuyến tính → sRGB (Color3 của Roblox là sRGB)
    const toS = (v) => v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055; c = c.map(toS);
    if (mt.map && !H.faces.has(m)) { const a = H.avg(mt.map); if (a) c = c.map((v, i) => v * a[i]); }
    return { c: c.map((v) => +Math.min(1, v).toFixed(3)), tr: mt.transparent && mt.opacity < 1 ? +(1 - mt.opacity).toFixed(2) : 0,
      neon: !!(mt.emissive && mt.emissiveIntensity > 0.5 && mt.emissive.getHex()), metal: (mt.metalness || 0) > 0.5 };
  };
  const P = new THREE.Vector3(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), M = new THREE.Matrix4(), C = new THREE.Vector3(), SZ = new THREE.Vector3();
  // một khung: camera + mảnh trong hộp bối cảnh, toạ độ gốc env
  H.frame = (t, envName, box, ids) => {
    window.renderAt(t);
    const g = H.envOf(envName); g.updateMatrixWorld(true); const inv = g.matrixWorld.clone().invert();
    sc.updateMatrixWorld(true);
    const cam = st.camera; M.multiplyMatrices(inv, cam.matrixWorld); M.decompose(P, Q, S);
    const out = { cam: [...P.toArray(), ...Q.toArray()].map((v) => +v.toFixed(4)).concat([+cam.fov.toFixed(3)]), parts: [] };
    sc.traverse((m) => {
      if (!m.isMesh || !m.geometry || m.isInstancedMesh) return;
      if (m.name === 'cut_den_sphere' || H.underEnv(m) || !H.vis(m)) return;
      const mt = Array.isArray(m.material) ? m.material[0] : m.material; if (mt && mt.visible === false) return;
      if (mt && mt.transparent && mt.opacity < 0.03) return;
      m.geometry.computeBoundingBox(); const bb = m.geometry.boundingBox; if (bb.isEmpty()) return;
      bb.getCenter(C); bb.getSize(SZ);
      M.multiplyMatrices(inv, m.matrixWorld); M.decompose(P, Q, S);
      const w = C.clone().applyMatrix4(M);
      if (!box.containsPoint(w) && !H.charOf(m)) return;   // mảnh nhân vật luôn ghi (đứng sát mép hộp bối cảnh vẫn đủ người)
      let id = ids.get(m); if (id == null) { id = ids.size; ids.set(m, id); }
      const sz = [SZ.x * Math.abs(S.x), SZ.y * Math.abs(S.y), SZ.z * Math.abs(S.z)];
      // gương lật (scale âm) → đổi dấu một trục trong quaternion không cần: Part đối xứng, giữ cỡ dương
      const row = [id, ...w.toArray().map((v) => +v.toFixed(3)), ...Q.toArray().map((v) => +v.toFixed(4)), ...sz.map((v) => +v.toFixed(3))];
      if (H.faces.has(m)) row.push(H.faceId(m) || 0);
      out.parts.push(row);
    });
    return out;
  };
});

if (cmd === 'liet-ke') {
  // liet-ke <trang>: mỗi shot 1 dòng id env dur ngày/đêm (để biết shot nào thuộc bối cảnh nào)
  const L = await pg.evaluate(() => { const envs = []; window.__stage.scene.traverse((o) => { if (o.name?.startsWith('env_')) envs.push(o.name); });
    return { envs, shots: window.__shots.list.map((s) => [s.id, s.env || '-', +s.dur.toFixed(3), +s.t0.toFixed(3), s.time || s.light || '', s.type || '']) }; });
  console.log('env trong cảnh:', L.envs.join(' '));
  for (const r of L.shots) console.log(r.join('\t'));
} else if (cmd === 'xuat') {
  // --env e3-phong (một bối cảnh) | --env all (mỗi shot theo bối cảnh của nó; toạ độ gốc env của shot, bộ phát cộng gốc Roblox theo env)
  const [a, b] = flag('--shots', 's001:s999').split(':'); const bo = new Set((flag('--bo', '') || '').split(',').filter(Boolean));
  const envArg = flag('--env', 'e3-phong');
  const sel = await pg.evaluate(({ a, b, bo, envArg }) => { const L = window.__shots.list;
    const i0 = Math.max(0, L.findIndex((s) => s.id === a)), i1x = L.findIndex((s) => s.id === b), i1 = i1x < 0 ? L.length - 1 : i1x;
    window.__RP.ids = new Map(); window.__RP.boxes = {};
    return L.slice(i0, i1 + 1).filter((s) => !bo.includes(s.id) && (envArg === 'all' || s.env === envArg)).map((s) => s.id); }, { a, b, bo: [...bo], envArg });
  const E3 = await import('../engine/envs/e3-phong.js').catch(() => null);
  const rot = (q, v) => { const [x, y, z, w] = q, ix = w * v[0] + y * v[2] - z * v[1], iy = w * v[1] + z * v[0] - x * v[2], iz = w * v[2] + x * v[1] - y * v[0], iw = -x * v[0] - y * v[1] - z * v[2];
    return [ix * w + iw * -x + iy * -z - iz * -y, iy * w + iw * -y + iz * -x - ix * -z, iz * w + iw * -z + ix * -y - iy * -x]; };
  const manifest = { env: null, envs: {}, shots: [] }; const used = new Set(); let nFr = 0;
  for (const id of sel) {
    const s = await pg.evaluate(async (id) => {
      const THREE = window.THREE, H = window.__RP, s = window.__shots.list.find((x) => x.id === id), envName = s.env;
      window.renderAt(s.t0 + 1e-4);
      const g = H.envOf(envName); g.updateMatrixWorld(true);
      if (!H.boxes[envName]) {
        // hộp bối cảnh (toạ độ gốc env) nới 1 stud; env rỗng (goc-trong: cảnh vẽ bằng bộ cảnh gốc ngoài env_*) → hộp rộng ±150 quanh gốc
        const box = new THREE.Box3(), inv = g.matrixWorld.clone().invert(); g.traverse((o) => { if (o.isMesh && o.geometry && H.vis(o) && !o.isInstancedMesh) { o.geometry.computeBoundingBox(); const bb = o.geometry.boundingBox.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld)); if (bb.getSize(new THREE.Vector3()).length() < 80) box.union(bb); } });
        if (box.isEmpty()) box.userData = { rong: true }; else box.expandByScalar(1);
        H.boxes[envName] = box;
      }
      // env rỗng (goc-trong: cảnh vẽ bằng bộ cảnh gốc ngoài env_*) → hộp = quanh camera của từng shot (±60 ngang, −10…+40 đứng), gộp dần
      if (H.boxes[envName].userData?.rong) { const c = window.__stage.camera.getWorldPosition(new THREE.Vector3()).applyMatrix4(g.matrixWorld.clone().invert());
        H.boxes[envName].union(new THREE.Box3(c.clone().add(new THREE.Vector3(-60, -10, -60)), c.clone().add(new THREE.Vector3(60, 40, 60)))); }
      const box = H.boxes[envName];
      const n = Math.round(s.dur * 30), fr = [];
      // vật của bối cảnh mà phim ẩn trong shot (chăn/két env thay bằng đồ cốt truyện…): tên mesh trong cây bị ẩn, trừ tên còn dùng ở mesh đang hiện
      const hidN = new Set(), visN = new Set();
      const walkE = (o, hid) => { hid = hid || !o.visible; if (o.isMesh && o.name) (hid ? hidN : visN).add(o.name); if (hid && o.name) hidN.add(o.name); o.children.forEach((c) => walkE(c, hid)); };
      walkE(g, false); const an = [...hidN].filter((x) => !visN.has(x));
      for (let f = 0; f < n; f++) { fr.push(H.frame(s.t0 + f / 30 + 1e-4, envName, box, H.ids)); if (f % 10 === 9) await new Promise((r) => setTimeout(r, 0)); }
      return { id: s.id, env: envName, goc: s.goc, t0: +s.t0.toFixed(4), t1: +s.t1.toFixed(4), n, dem: s.time === 'dem' || s.light === 'night', guong: envName === 'e3-phong' && [26, 27, 29, 30].includes(s.goc), ry: s.envArg?.guongRy, an, fr };
    }, id);
    // camera ảo qua gương: phản chiếu camera qua mặt gương (gương e3-phong, xoay theo envArg.guongRy của shot)
    if (s.guong && E3?.phongGuong) {
      const G = E3.phongGuong(s.ry ?? undefined), n = G.n, c = G.tam;
      const refl = (p) => { const d = (p[0] - c[0]) * n[0] + (p[1] - c[1]) * n[1] + (p[2] - c[2]) * n[2]; return [p[0] - 2 * d * n[0], p[1] - 2 * d * n[1], p[2] - 2 * d * n[2]]; };
      const reflV = (v) => { const d = v[0] * n[0] + v[1] * n[1] + v[2] * n[2]; return [v[0] - 2 * d * n[0], v[1] - 2 * d * n[1], v[2] - 2 * d * n[2]]; };
      s.guongMat = { tam: c, n };
      for (const f of s.fr) { const p = f.cam.slice(0, 3), q = f.cam.slice(3, 7); const fw = reflV(rot(q, [0, 0, -1])), up = reflV(rot(q, [0, 1, 0]));
        f.camG = [...refl(p), ...fw, ...up].map((v) => +v.toFixed(4)); }
    }
    delete s.ry;
    for (const f of s.fr) for (const r of f.parts) if (r.length > 11 && r[11]) used.add(r[11]);
    await writeFile(`${OUT}/${s.id}.json`, JSON.stringify(s)); nFr += s.n;
    manifest.env = manifest.env || s.env;
    manifest.shots.push({ id: s.id, env: s.env, goc: s.goc, t0: s.t0, t1: s.t1, n: s.n, guong: s.guong, dem: s.dem });
    process.stdout.write(`${s.id}(${s.env},${s.n}) `);
  }
  const res = await pg.evaluate(() => { const H = window.__RP, parts = []; for (const [m, id] of H.ids) parts[id] = { n: H.path(m), ch: H.charOf(m), k: H.shape(m), ...H.style(m) };
    const boxes = {}; for (const [k, b] of Object.entries(H.boxes)) boxes[k] = [...b.min.toArray(), ...b.max.toArray()].map((v) => +v.toFixed(2)); return { parts, boxes }; });
  manifest.parts = res.parts; manifest.envs = res.boxes; manifest.box = res.boxes[manifest.env];
  const capSrc = await readFile('episodes/ep6B/captions.js', 'utf8').catch(() => '');
  const m = capSrc.match(/CAPTIONS\s*=\s*(\[[\s\S]*?\]);/); manifest.captions = m ? JSON.parse(m[1]).map((c) => c.slice(0, 3)) : [];
  manifest.texts = await pg.evaluate(() => window.__shots.list.filter((s) => s.text).map((s) => [s.t0, s.t1, s.text]));
  // mặt: face_NNN.png của goc/ = ảnh fNN của gói AltiWyre 6557969904 (đã so điểm ảnh: 140/140 khớp) → id ảnh Roblox
  const bp = JSON.parse(await readFile('.cache/roblox/6557969904/bo-phan.json', 'utf8').catch(() => '[]'));
  manifest.faces = {}; for (const n of used) { const e = bp.find((x) => x.ma === 'f' + String(n).padStart(2, '0')); if (e) manifest.faces[n] = e.id; }
  await writeFile(`${OUT}/phim.json`, JSON.stringify(manifest));
  const cnt = {}; res.parts.forEach((p) => { cnt[p.ch || 'đạo cụ'] = (cnt[p.ch || 'đạo cụ'] || 0) + 1; });
  console.log(`\nĐã ghi ${manifest.shots.length} shot (${nFr} khung) + phim.json vào ${OUT}. Mảnh: ${JSON.stringify(cnt)}`);
} else {
  // kiem: đo lại ở khung đầu/giữa/cuối mỗi shot trong phim.json — tâm 6 bộ phận (Box3.setFromObject) + camera vị trí/điểm nhìn
  const man = JSON.parse(await readFile(`${OUT}/phim.json`, 'utf8'));
  const res = await pg.evaluate(({ man }) => {
    const THREE = window.THREE, st = window.__stage, out = {};
    for (const s of man.shots) for (const [lab, f] of [['dau', 0], ['giua', Math.floor(s.n / 2)], ['cuoi', s.n - 1]]) {
      const g = window.__RP.envOf(s.env || man.env);   // mỗi shot quy về gốc bối cảnh của nó
      window.renderAt(s.t0 + f / 30 + 1e-4); st.scene.updateMatrixWorld(true);
      const inv = g.matrixWorld.clone().invert(), toL = (v) => v.applyMatrix4(inv).toArray().map((x) => +x.toFixed(4));
      const cam = st.camera, p = cam.getWorldPosition(new THREE.Vector3()), fw = new THREE.Vector3(0, 0, -10).applyQuaternion(cam.getWorldQuaternion(new THREE.Quaternion())).add(p);
      const parts = {};
      for (const c of window.__goc.CAST) {
        if (!c.root.visible) continue;
        const ok = (o) => { for (let x = o; x; x = x.parent) if (!x.visible) return false; return true; };
        const P6 = { dau: c.neck, than: c.upper, tayT: c.armL, tayP: c.armR, chanT: c.legL, chanP: c.legR };
        for (const [k, grp] of Object.entries(P6)) { if (!grp || !ok(grp)) continue;
          // mesh chính của bộ phận = mesh con TRỰC TIẾP lớn nhất (không gồm nhóm con: cổ không tính vào thân…)
          let best = null, bm = null, bv = -1; for (const m of grp.children) { if (!m.isMesh || m === c.face || !m.visible) continue; const b = new THREE.Box3().setFromObject(m); const v = b.getSize(new THREE.Vector3()); const vol = v.x * v.y * v.z; if (vol > bv) { bv = vol; best = b; bm = m; } }
          if (best) parts[window.__RP.path(bm)] = toL(best.getCenter(new THREE.Vector3())); }
      }
      out[`${s.id}@${lab}`] = { t: s.t0 + f / 30, f, cam: { p: toL(p.clone()), f: toL(fw), fov: +cam.fov.toFixed(3) }, parts };
    }
    return out;
  }, { man });
  await writeFile(`${OUT}/kiem-phim.json`, JSON.stringify(res, null, 1));
  console.log(`Đã ghi ${Object.keys(res).length} khung kiểm → ${OUT}/kiem-phim.json`);
}
await br.close(); srv.close();
}
