// tools/roblox-nhan-vat-node.mjs — đọc các .glb nhân vật (tools/roblox-nhan-vat.mjs) → <out>/nhan-vat.json: mỗi node {q (xoay lúc nghỉ), s (cỡ hộp lưới)}
// để bộ phát hiệu chỉnh MeshPart Studio tách ra (một node nhiều chất liệu → nhiều MeshPart).
import { readFileSync, readdirSync, writeFileSync } from 'fs';
const dir = process.argv[2] || 'output/roblox-phim/nhan-vat', out = process.argv[3] || 'output/roblox-phim/data/nhan-vat.json';
const R = {};
// GLTFExporter ghi node bằng 'matrix' (cột trước) khi không có TRS → tách vị trí + quaternion (cỡ đã nướng vào lưới nên bỏ scale)
const lin2s = (v) => (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055);   // glTF lưu màu tuyến tính → sRGB
const hex = (c) => c.slice(0, 3).map((v) => Math.round(Math.min(1, Math.max(0, lin2s(v))) * 255).toString(16).padStart(2, '0')).join('');
function rotCentre(j, bin, n, q) {
  const [x, y, z, w] = q; const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
  // n.prims: chỉ tính các primitive này (pc = tâm hộp từng primitive = từng MeshPart con, sau khi xoay Q, gốc = gốc node)
  for (const p of n.prims || j.meshes[n.mesh].primitives) { const a = j.accessors[p.attributes.POSITION], bv = j.bufferViews[a.bufferView];
    const st = bv.byteStride || 12, off = (bv.byteOffset || 0) + (a.byteOffset || 0);
    let idx = null; if (n.prims && p.indices != null) { const ia = j.accessors[p.indices], ib = j.bufferViews[ia.bufferView], io = (ib.byteOffset || 0) + (ia.byteOffset || 0), sz = ia.componentType === 5125 ? 4 : ia.componentType === 5123 ? 2 : 1;
      idx = new Set(); for (let t = 0; t < ia.count; t++) idx.add(sz === 4 ? bin.readUInt32LE(io + t * 4) : sz === 2 ? bin.readUInt16LE(io + t * 2) : bin[io + t]); }   // primitive dùng chung POSITION → chỉ lấy đỉnh có trong chỉ số
    for (let i = 0; i < a.count; i++) { if (idx && !idx.has(i)) continue; const k = off + i * st, vx = bin.readFloatLE(k), vy = bin.readFloatLE(k + 4), vz = bin.readFloatLE(k + 8);
      // v' = q v q*
      const ix = w * vx + y * vz - z * vy, iy = w * vy + z * vx - x * vz, iz = w * vz + x * vy - y * vx, iw = -x * vx - y * vy - z * vz;
      const r = [ix * w + iw * -x + iy * -z - iz * -y, iy * w + iw * -y + iz * -x - ix * -z, iz * w + iw * -z + ix * -y - iy * -x];
      for (let c = 0; c < 3; c++) { mn[c] = Math.min(mn[c], r[c]); mx[c] = Math.max(mx[c], r[c]); } } }
  return mn.map((v, c) => +((v + mx[c]) / 2).toFixed(5));
}
function fromM(m) {
  const sx = Math.hypot(m[0], m[1], m[2]), sy = Math.hypot(m[4], m[5], m[6]), sz = Math.hypot(m[8], m[9], m[10]);
  const a = m[0] / sx, b = m[4] / sy, c = m[8] / sz, d = m[1] / sx, e = m[5] / sy, f = m[9] / sz, g = m[2] / sx, h = m[6] / sy, k = m[10] / sz; // hàng i, cột j
  let x, y, z, w; const tr = a + e + k;
  if (tr > 0) { const s = 0.5 / Math.sqrt(tr + 1); w = 0.25 / s; x = (h - f) * s; y = (c - g) * s; z = (d - b) * s; }
  else if (a > e && a > k) { const s = 2 * Math.sqrt(1 + a - e - k); w = (h - f) / s; x = 0.25 * s; y = (b + d) / s; z = (c + g) / s; }
  else if (e > k) { const s = 2 * Math.sqrt(1 + e - a - k); w = (c - g) / s; x = (b + d) / s; y = 0.25 * s; z = (f + h) / s; }
  else { const s = 2 * Math.sqrt(1 + k - a - e); w = (d - b) / s; x = (c + g) / s; y = (f + h) / s; z = 0.25 * s; }
  return [[m[12], m[13], m[14]], [x, y, z, w]];
}
for (const f of readdirSync(dir).filter((x) => x.endsWith('.glb'))) {
  const b = readFileSync(`${dir}/${f}`), L = b.readUInt32LE(12), j = JSON.parse(b.toString('utf8', 20, 20 + L));
  const bin = b.subarray(20 + L + 8);   // khối BIN ngay sau khối JSON
  for (const n of j.nodes) { if (n.mesh == null) continue; const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
    for (const p of j.meshes[n.mesh].primitives) { const a = j.accessors[p.attributes.POSITION]; for (let i = 0; i < 3; i++) { mn[i] = Math.min(mn[i], a.min[i]); mx[i] = Math.max(mx[i], a.max[i]); } }
    const [t, q] = n.matrix ? fromM(n.matrix) : [n.translation || [0, 0, 0], n.rotation || [0, 0, 0, 1]];
    // màu từng chất liệu theo thứ tự primitive (= thứ tự MeshPart <node>, <node>2…); null = có ảnh vân (Studio giữ TextureID). Importer bỏ màu phẳng → bộ phát tô lại.
    const col = j.meshes[n.mesh].primitives.map((p) => { const m = j.materials[p.material]?.pbrMetallicRoughness || {}; if (m.baseColorTexture) return null; return hex(m.baseColorFactor || [1, 1, 1, 1]); });
    // o = tâm hộp của lưới SAU khi xoay Q (Importer nướng Q vào lưới rồi đặt MeshPart ở tâm hộp mới) → gốc node trong khung MeshPart = −Rπ·o
    const o = rotCentre(j, bin, n, q), pc = j.meshes[n.mesh].primitives.map((p) => rotCentre(j, bin, { mesh: n.mesh, prims: [p] }, q));
    R[n.name] = { col, o, pc, t: t.map((v) => +v.toFixed(4)), q, s: mx.map((v, i) => +(v - mn[i]).toFixed(4)), c: mx.map((v, i) => +((v + mn[i]) / 2).toFixed(4)) }; }
}
// an = phim ẩn mảnh này lúc nghỉ (tóc dưới mũ…): danh sách từ `node tools/roblox-nhan-vat.mjs --an`
try { for (const k of JSON.parse(readFileSync('output/roblox-phim/data/nhan-vat-an.json', 'utf8'))) if (R[k]) R[k].an = true; } catch {}
writeFileSync(out, JSON.stringify(R)); console.log(Object.keys(R).length, 'node →', out);
