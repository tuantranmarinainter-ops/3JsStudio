// tools/r6-bobj-ga.mjs — xuất ĐÚNG nhân vật Gà của tập 3 (engine/r6-rig.js + R6_LOOKS.ga, actor "hero") ra BOBJ R6 cho BBS.
//   node tools/r6-bobj-ga.mjs [--trang episodes/ep003/index.html] [--actor hero] [--out assets/r6-bobj/ga] [--khong-mat] [--khong-phu-kien]
// Xương: dùng nguyên assets/r6-bobj/r6-armature.bobj (tên Minecraft, tỉ lệ R6 1 stud = 0.4 block) → chạy được bộ động tác đã retarget.
// R6 = 6 khối cứng: tay/chân mỗi bên 1 khối gắn 1 xương (left_arm, right_arm, left_leg, right_leg), không gập khuỷu/gối.
// Thân → low_body, đầu + mặt + mào + băng đô → head. Màu + vân (canvas sọc len, mặt) nướng vào 1 ảnh atlas (ga.png).
import { createServer } from 'http'; import { readFile, writeFile, mkdir } from 'fs/promises'; import { extname, join, resolve, relative } from 'path';
import { readFileSync } from 'fs';
import { launchBrowser } from './browser.mjs';
const root = process.cwd(), args = process.argv.slice(2);
const flag = (k, d) => { const i = args.indexOf(k); return i < 0 ? d : args[i + 1]; };
const PAGE = flag('--trang', 'episodes/ep003/index.html'), ACTOR = flag('--actor', 'hero'), OUT = flag('--out', 'assets/r6-bobj/ga');
const KHONG_MAT = args.includes('--khong-mat'), KHONG_PK = args.includes('--khong-phu-kien');
const T = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.ttf': 'font/ttf', '.webp': 'image/webp', '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg' };
const srv = createServer(async (q, r) => { try { const p = resolve(join(root, decodeURIComponent(q.url.split('?')[0]))); if (relative(root, p).startsWith('..')) throw 0; const b = await readFile(p); r.writeHead(200, { 'content-type': T[extname(p).toLowerCase()] || 'application/octet-stream' }); r.end(b); } catch { r.writeHead(404); r.end(); } }).listen(0);
await new Promise((r) => srv.once('listening', r));
const br = await launchBrowser(); const pg = await br.newPage({ viewport: { width: 270, height: 480 } });
pg.on('pageerror', (e) => console.log('pageerror', e.message));
await pg.goto(`http://localhost:${srv.address().port}/${PAGE}`);
await pg.waitForFunction(() => window.__ready === true, null, { timeout: 300000 });
const res = await pg.evaluate(async ({ ACTOR, KHONG_MAT, KHONG_PK }) => {
  const THREE = window.THREE; let h = null; window.__stage.scene.traverse((o) => { if (!h && o.name === ACTOR) h = o; });
  if (!h) return { err: 'không thấy actor ' + ACTOR };
  // Về tư thế nghỉ: bỏ xoay mọi khớp, body về 0
  const JOINTS = ['body', 'LowerTorso', 'UpperTorso', 'Head', 'RightUpperArm', 'RightLowerArm', 'RightHand', 'LeftUpperArm', 'LeftLowerArm', 'LeftHand', 'RightUpperLeg', 'RightLowerLeg', 'RightFoot', 'LeftUpperLeg', 'LeftLowerLeg', 'LeftFoot'];
  h.traverse((o) => { if (JOINTS.includes(o.name)) o.rotation.set(0, 0, 0); if (o.name === 'body') o.position.set(0, 0, 0); });
  h.updateMatrixWorld(true);
  const inv = h.matrixWorld.clone().invert(), S = 0.4;
  const BONE = { Head: 'head', RightUpperArm: 'right_arm', LeftUpperArm: 'left_arm', RightUpperLeg: 'right_leg', LeftUpperLeg: 'left_leg', UpperTorso: 'low_body', LowerTorso: 'low_body' };
  const boneOf = (o) => { for (let p = o; p && p !== h; p = p.parent) if (BONE[p.name]) return BONE[p.name]; return 'low_body'; };
  const visible = (o) => { for (let p = o; p && p !== h; p = p.parent) if (!p.visible) return false; return true; };
  const BASE = ['head_mesh', 'torso_mesh', 'RightArm_mesh', 'LeftArm_mesh', 'RightLeg_mesh', 'LeftLeg_mesh'];
  const parts = [], mats = new Map(), log = [];
  h.traverse((m) => {
    if (!m.isMesh || !visible(m)) return;
    if (KHONG_MAT && m.name === 'face') return;
    if (KHONG_PK && !BASE.includes(m.name) && m.name !== 'face') return;
    const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry;
    const P = g.attributes.position, Nn = g.attributes.normal, U = g.attributes.uv;
    const M = inv.clone().multiply(m.matrixWorld), NM = new THREE.Matrix3().getNormalMatrix(M);
    const groups = g.groups.length ? g.groups : [{ start: 0, count: P.count, materialIndex: 0 }];
    for (const gr of groups) {
      const mat = Array.isArray(m.material) ? m.material[gr.materialIndex] : m.material;
      if (!mat || mat.visible === false) continue;
      const map = mat.map || null, um = map ? (map.updateMatrix(), map.matrix) : null;
      const pos = [], nor = [], uv = [];
      for (let i = gr.start; i < gr.start + gr.count && i < P.count; i++) {
        const v = new THREE.Vector3().fromBufferAttribute(P, i).applyMatrix4(M).multiplyScalar(S); pos.push(v.x, v.y, v.z);
        const n = Nn ? new THREE.Vector3().fromBufferAttribute(Nn, i).applyMatrix3(NM).normalize() : new THREE.Vector3(0, 1, 0); nor.push(n.x, n.y, n.z);
        let u = U ? new THREE.Vector2().fromBufferAttribute(U, i) : new THREE.Vector2(0.5, 0.5); if (um) u.applyMatrix3(um); uv.push(u.x, u.y);
      }
      // det < 0 (soi gương) → đảo thứ tự tam giác
      const flip = M.determinant() < 0;
      if (!mats.has(mat)) mats.set(mat, { id: mats.size, color: '#' + mat.color.getHexString(), map, flipY: map ? map.flipY : true, opacity: mat.opacity, name: mat.name || m.name, uv: [] });
      const e = mats.get(mat); e.uv.push(...uv);
      parts.push({ mesh: m.name, bone: boneOf(m), mat: e.id, pos, nor, uv, flip });
      log.push(`${m.name} → ${boneOf(m)} · ${pos.length / 9} tam giác · màu ${e.color}${map ? ' · vân ' + (map.image?.width || '?') + 'x' + (map.image?.height || '?') : ''}`);
    }
  });
  // Atlas 2048: mỗi chất liệu 1 ô; chất liệu có vân → ô chứa vân lát theo khoảng uv đã dùng
  const A = 2048, cv = document.createElement('canvas'); cv.width = cv.height = A; const cx = cv.getContext('2d');
  let x = 0, y = 0, rowH = 0; const reg = [];
  for (const e of mats.values()) {
    let rw = 8, rh = 8, u0 = 0, u1 = 1, v0 = 0, v1 = 1;
    if (e.map && e.map.image) {
      u0 = Infinity; u1 = -Infinity; v0 = Infinity; v1 = -Infinity;
      for (let i = 0; i < e.uv.length; i += 2) { u0 = Math.min(u0, e.uv[i]); u1 = Math.max(u1, e.uv[i]); v0 = Math.min(v0, e.uv[i + 1]); v1 = Math.max(v1, e.uv[i + 1]); }
      if (u1 - u0 < 1e-4) u1 = u0 + 1e-3; if (v1 - v0 < 1e-4) v1 = v0 + 1e-3;
      const iw = e.map.image.width, ih = e.map.image.height;
      rw = Math.max(8, Math.min(512, Math.ceil(iw * (u1 - u0)))); rh = Math.max(8, Math.min(512, Math.ceil(ih * (v1 - v0))));
    }
    if (x + rw + 2 > A) { x = 0; y += rowH + 2; rowH = 0; }
    const r = { x0: x + 1, y0: y + 1, rw, rh, u0, u1, v0, v1 }; reg[e.id] = r; x += rw + 2; rowH = Math.max(rowH, rh);
    if (e.map && e.map.image) {
      const iw = e.map.image.width, ih = e.map.image.height, du = u1 - u0, dv = v1 - v0;
      const tmp = document.createElement('canvas'); tmp.width = rw; tmp.height = rh; const tc = tmp.getContext('2d');
      const pat = tc.createPattern(e.map.image, 'repeat');
      const a = rw / (du * iw), ex = -u0 * rw / du;
      pat.setTransform(e.flipY ? new DOMMatrix([a, 0, 0, rh / (dv * ih), ex, (v1 - 1) * rh / dv]) : new DOMMatrix([a, 0, 0, -rh / (dv * ih), ex, v1 * rh / dv]));
      tc.fillStyle = pat; tc.fillRect(0, 0, rw, rh);
      if (e.color !== '#ffffff') { tc.globalCompositeOperation = 'multiply'; tc.fillStyle = e.color; tc.fillRect(0, 0, rw, rh); tc.globalCompositeOperation = 'destination-in'; tc.fillStyle = pat; tc.fillRect(0, 0, rw, rh); }
      cx.drawImage(tmp, r.x0, r.y0);
    } else { cx.fillStyle = e.color; cx.fillRect(r.x0 - 1, r.y0 - 1, rw + 2, rh + 2); }
  }
  const usedH = y + rowH + 2; let H = 64; while (H < usedH) H *= 2;
  const out = document.createElement('canvas'); out.width = A; out.height = H; out.getContext('2d').drawImage(cv, 0, 0);
  const toAt = (e, u, v) => { const r = reg[e]; return [(r.x0 + (u - r.u0) / (r.u1 - r.u0) * r.rw) / A, 1 - (r.y0 + (r.v1 - v) / (r.v1 - r.v0) * r.rh) / H]; };
  // plain: uv = tâm ô
  const plainUV = (e) => { const r = reg[e]; return [(r.x0 + r.rw / 2) / A, 1 - (r.y0 + r.rh / 2) / H]; };
  const isMap = [...mats.values()].map((e) => !!(e.map && e.map.image));
  const P2 = parts.map((p) => ({ ...p, uv: p.uv.map((_, i, arr) => i % 2 ? null : (isMap[p.mat] ? toAt(p.mat, arr[i], arr[i + 1]) : plainUV(p.mat))).filter(Boolean) }));
  return { parts: P2, png: out.toDataURL('image/png'), size: [A, H], log };
}, { ACTOR, KHONG_MAT, KHONG_PK });
await br.close(); srv.close();
if (res.err) { console.error(res.err); process.exit(1); }
// Ghi BOBJ: đầu file + xương lấy từ r6-armature.bobj, gộp đỉnh/uv/normal trùng
const arm = readFileSync('assets/r6-bobj/r6-armature.bobj', 'utf8').split(/\r?\n/).filter((l) => l.startsWith('arm_'));
const V = [], VT = [], VN = [], F = [], kv = new Map(), kt = new Map(), kn = new Map();
const idx = (map, arr, key, line) => { let i = map.get(key); if (i === undefined) { i = arr.length + 1; map.set(key, i); arr.push(line); } return i; };
const f6 = (n) => n.toFixed(6), f4 = (n) => n.toFixed(5);
for (const p of res.parts) {
  const n = p.pos.length / 3;
  for (let t = 0; t + 2 < n; t += 3) {
    const tri = p.flip ? [t, t + 2, t + 1] : [t, t + 1, t + 2];
    F.push('f ' + tri.map((i) => {
      const vs = `${f6(p.pos[i * 3])} ${f6(p.pos[i * 3 + 1])} ${f6(p.pos[i * 3 + 2])}`;
      const vi = idx(kv, V, vs + '|' + p.bone, `v ${vs}\nvw ${p.bone} 1.000000`);
      const ts = `${f4(p.uv[i][0])} ${f4(p.uv[i][1])}`, ti = idx(kt, VT, ts, `vt ${ts}`);
      const ns = `${f4(p.nor[i * 3])} ${f4(p.nor[i * 3 + 1])} ${f4(p.nor[i * 3 + 2])}`, ni = idx(kn, VN, ns, `vn ${ns}`);
      return `${vi}/${ti}/${ni}`;
    }).join(' '));
  }
}
const txt = ['# Anh Ga R6 (tap 3: engine/r6-rig.js + R6_LOOKS.ga) — BOBJ cho BBS 2.7, 1 stud = 0.4 block. Sinh boi tools/r6-bobj-ga.mjs', '# Armature data', 'arm_name Armature', ...arm.filter((l) => !l.startsWith('arm_name')),
  '# Mesh data', 'o body', 'o_arm Armature', ...V, ...VT, ...VN, ...F, '# Animation data', ''].join('\n');
await mkdir(OUT, { recursive: true });
await writeFile(join(OUT, 'ga-r6.bobj'), txt);
await writeFile(join(OUT, 'ga.png'), Buffer.from(res.png.split(',')[1], 'base64'));
console.log(res.log.join('\n'));
console.log(`→ ${OUT}/ga-r6.bobj: ${V.length} đỉnh, ${F.length} tam giác · ga.png ${res.size.join('x')}`);
