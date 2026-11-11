// cliff.js — Đá tự nhiên dựng bằng code, tất định theo seed (không Math.random):
//   rockGeo(THREE, o)      lưới đá: cầu icosa méo theo noise 3D, phân lớp (strata) có gờ, mặt phẳng trên/dưới, màu theo lớp
//   createCliff(THREE, o)  mỏm đá ven biển nhiều khối, đỉnh phẳng (đặt hải đăng) phủ cỏ — thay cụm đá Kenney xám hình trụ
//   naturalRock(THREE, o)  một tảng đá đơn (đá ngồi, đá ven bờ)
//   coralRock(THREE, o)    tảng đá ngầm phủ san hô nhiều màu (san hô nhánh, san hô não, bọt biển ống, quạt biển)
export const hash = (i, s) => { let x = Math.imul(i ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(s + 1, 0xc2b2ae35); x ^= x >>> 13; x = Math.imul(x, 0x27d4eb2f); x ^= x >>> 16; return (x >>> 0) / 4294967296; };
const h3 = (x, y, z, s) => hash((Math.imul(x, 73856093) ^ Math.imul(y, 19349663) ^ Math.imul(z, 83492791)) | 0, s);
const sm = (k) => k * k * (3 - 2 * k);
function vnoise(x, y, z, s) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z), fx = sm(x - ix), fy = sm(y - iy), fz = sm(z - iz);
  const L = (a, b, k) => a + (b - a) * k;
  const c = (dx, dy, dz) => h3(ix + dx, iy + dy, iz + dz, s);
  return L(L(L(c(0, 0, 0), c(1, 0, 0), fx), L(c(0, 1, 0), c(1, 1, 0), fx), fy), L(L(c(0, 0, 1), c(1, 0, 1), fx), L(c(0, 1, 1), c(1, 1, 1), fx), fy), fz);
}
export const fbm = (x, y, z, s, oct = 4) => { let a = 0, w = 0.5, f = 1, n = 0; for (let i = 0; i < oct; i++) { a += w * vnoise(x * f, y * f, z * f, s + i * 17); n += w; w *= 0.5; f *= 2.03; } return a / n; };

// o: { seed, rx, ry, rz (bán kính), cy (tâm y), detail, rough, strata (độ dày lớp, 0 = không), ledge (độ nhô gờ),
//      top (cắt phẳng trên), bottom (cắt phẳng dưới), colors [...], cap (màu mặt trên, vd cỏ), capY (chỉ phủ từ y này) }
export function rockGeo(THREE, o = {}) {
  const { seed = 1, rx = 4, ry = 3, rz = rx, cy = 0, detail = 3, rough = 0.32, strata = 0, ledge = 0.1, top = Infinity, bottom = -Infinity,
    colors = ['#7d6e62', '#8c7b6b', '#6b5d52', '#9a8877', '#5e534b'], cap = null, capY = -Infinity, freq = 1.4 } = o;
  const geo = new THREE.IcosahedronGeometry(1, detail).toNonIndexed();
  const p = geo.attributes.position, n = p.count, layerOf = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const nn = fbm(x * freq + seed * 3.1, y * freq + 7.7, z * freq - seed, seed);
    let r = 1 + rough * (nn - 0.5) * 2;
    let wy = y * ry + cy;
    if (strata > 0) {   // phân lớp: bậc thang theo y + gờ nhô ở mép trên mỗi lớp, mỗi lớp lệch riêng
      const f = wy / strata, fi = Math.floor(f), fr = f - fi;
      wy = (fi + 0.15 + 0.7 * sm(Math.min(1, Math.max(0, (fr - 0.15) / 0.7)))) * strata;
      r *= 1 + ledge * (fr - 0.5) + (hash(fi + 500, seed) - 0.5) * ledge * 1.2;
      layerOf[i] = fi;
    } else layerOf[i] = Math.floor(wy / 1.6);
    let wx = x * rx * r, wz = z * rz * r;
    wy = Math.min(top + (nn - 0.5) * 0.35, Math.max(bottom, wy));
    p.setXYZ(i, wx, wy, wz);
  }
  geo.computeVertexNormals();
  const col = new Float32Array(n * 3), c = new THREE.Color(), cc = new THREE.Color(cap || '#000');
  const nm = geo.attributes.normal;
  for (let f = 0; f < n; f += 3) {   // màu theo mặt (flat): lớp đá + noise, mặt hướng lên ở cao → màu phủ (cỏ)
    const y = (p.getY(f) + p.getY(f + 1) + p.getY(f + 2)) / 3, ny = (nm.getY(f) + nm.getY(f + 1) + nm.getY(f + 2)) / 3;
    const L = layerOf[f];
    c.set(colors[Math.floor(hash(L + 900, seed) * colors.length) % colors.length]);
    c.offsetHSL(0, 0, (hash(f, seed + 3) - 0.5) * 0.05);
    if (cap && ny > 0.72 && y > capY) c.copy(cc).offsetHSL(0, 0, (hash(f, seed + 5) - 0.5) * 0.06);
    for (let k = 0; k < 3; k++) { col[(f + k) * 3] = c.r; col[(f + k) * 3 + 1] = c.g; col[(f + k) * 3 + 2] = c.b; }
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geo;
}
const rockMat = (THREE) => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0, flatShading: true });
const mesh = (THREE, geo, mat, name) => { const m = new THREE.Mesh(geo, mat); m.castShadow = m.receiveShadow = true; m.name = name; return m; };

// Mỏm đá ven biển: khối chính đỉnh phẳng ở y=top (bán kính ~topR) + các khối phụ thấp dần ra biển/bãi.
// toward = hướng (x,z) về phía bãi cát (khối phụ thấp đặt phía đó để dốc xuống tự nhiên).
export function createCliff(THREE, { seed = 3, top = 4.6, topR = 12, toward = [-0.77, 0.64], colors, cap = '#6aa84f' } = {}) {
  const g = new THREE.Group(); g.name = 'cliff_rock';
  const m = rockMat(THREE);
  const cols = colors || ['#8a7a6c', '#9b8a79', '#776858', '#a89580', '#6c5f53', '#857463'];
  // khối chính: đáy chìm dưới biển, đỉnh cắt phẳng có cỏ
  g.add(mesh(THREE, rockGeo(THREE, { seed, rx: topR + 4, rz: topR + 3, ry: 9, cy: top - 4, strata: 1.7, ledge: 0.16, top, bottom: -6, rough: 0.22, colors: cols, cap, capY: top - 0.8 }), m, 'cliff_main'));
  // khối phụ: vòng quanh, thấp dần (phía bãi cát thấp nhất → bậc đá tự nhiên)
  const ang0 = Math.atan2(toward[1], toward[0]);
  for (let i = 0; i < 9; i++) {
    const a = ang0 + (i - 4) * 0.62 + (hash(i, seed + 1) - 0.5) * 0.3;
    const facing = Math.cos(a - ang0);                      // 1 = phía bãi
    const d = topR + 2 + hash(i, seed + 2) * 5 + facing * 3;
    const r = 4 + hash(i, seed + 3) * 4;
    const hTop = top - 1.5 - (facing * 0.5 + 0.5) * (top + 0.5) * 0.8 + hash(i, seed + 4) * 1.5;
    const geo = rockGeo(THREE, { seed: seed * 31 + i, rx: r, rz: r * (0.7 + hash(i, seed + 5) * 0.5), ry: Math.max(2.5, hTop + 5), cy: hTop - Math.max(2.5, hTop + 5) * 0.75, strata: 1.4 + hash(i, seed + 6) * 0.6, ledge: 0.14, top: hTop, bottom: -5, rough: 0.28, colors: cols, cap: hTop > 1 ? cap : null, capY: hTop - 0.6 });
    const o = mesh(THREE, geo, m, 'cliff_block'); o.position.set(Math.cos(a) * d, 0, Math.sin(a) * d); o.rotation.y = hash(i, seed + 7) * 6.28; g.add(o);
  }
  // đá vụn chân vách
  for (let i = 0; i < 10; i++) {
    const a = ang0 + (hash(i, seed + 8) - 0.5) * 4.4, d = topR + 8 + hash(i, seed + 9) * 6, r = 1 + hash(i, seed + 10) * 1.6;
    const o = mesh(THREE, rockGeo(THREE, { seed: seed * 57 + i, rx: r, ry: r * 0.7, rz: r * 0.9, detail: 2, rough: 0.35, bottom: -0.4, colors: cols }), m, 'cliff_rubble');
    o.position.set(Math.cos(a) * d, 0, Math.sin(a) * d); o.rotation.y = hash(i, seed + 11) * 6.28; g.add(o);
  }
  return g;
}

// Một tảng đá đơn tự nhiên. top = cắt phẳng (đá ngồi), sink = phần chìm dưới đất.
export function naturalRock(THREE, { seed = 1, r = 2.5, h = 0.7, top = Infinity, strata = 0, colors, cap = null } = {}) {
  const cols = colors || ['#8a7a6c', '#9b8a79', '#776858', '#a89580', '#6c5f53'];
  const o = mesh(THREE, rockGeo(THREE, { seed, rx: r, ry: r * h, rz: r * (0.8 + hash(seed, 2) * 0.3), detail: 2, rough: 0.3, strata, ledge: 0.12, top, bottom: -r * h * 0.4, colors: cols, cap, capY: top - 0.5 }), rockMat(THREE), 'natural_rock');
  return o;
}

// --- San hô ---
const CORAL = ['#ff7a6b', '#ff9f43', '#f368e0', '#ffd166', '#b56cf0', '#4fd1c5', '#ff5e8a', '#ffa8d0'];
export function coralRock(THREE, { seed = 1, r = 4, h = 0.55, base = -2, colors } = {}) {
  const g = new THREE.Group(); g.name = 'coral_rock';
  const rockCols = colors || ['#c79a86', '#b8897a', '#d6ae96', '#a87d70', '#caa08a'];
  const rx = r, ry = r * h, rz = r * (0.75 + hash(seed, 1) * 0.4), cy = base + ry * 0.35;
  g.add(mesh(THREE, rockGeo(THREE, { seed, rx, ry, rz, cy, detail: 3, rough: 0.34, freq: 1.8, bottom: base - 1, colors: rockCols, cap: '#9bbf6a', capY: cy + ry * 0.55 }), rockMat(THREE), 'reef_rock'));
  const mats = new Map();
  const M = (c) => { if (!mats.has(c)) mats.set(c, new THREE.MeshStandardMaterial({ color: c, roughness: 0.75, flatShading: true, side: THREE.DoubleSide })); return mats.get(c); };
  // điểm trên mặt đá theo hướng (xấp xỉ: ellipsoid × noise giống rockGeo)
  const surf = (dx, dy, dz) => {
    const L = Math.hypot(dx, dy, dz); dx /= L; dy /= L; dz /= L;
    const nn = fbm(dx * 1.8 + seed * 3.1, dy * 1.8 + 7.7, dz * 1.8 - seed, seed);
    const k = 1 + 0.34 * (nn - 0.5) * 2;
    return [dx * rx * k, dy * ry * k * 0.97 + cy, dz * rz * k];
  };
  const cyl = new THREE.CylinderGeometry(1, 1, 1, 6), ball = new THREE.IcosahedronGeometry(1, 1), tube = new THREE.CylinderGeometry(1, 0.8, 1, 7, 1, true);
  const fanGeo = new THREE.CircleGeometry(1, 9, 0, Math.PI);
  const nPieces = Math.round(8 + r * 1.6);
  for (let i = 0; i < nPieces; i++) {
    const a = hash(i, seed + 20) * Math.PI * 2, el = 0.25 + hash(i, seed + 21) * 1.0;   // chỉ bán cầu trên
    const [px, py, pz] = surf(Math.cos(a) * Math.cos(el), Math.sin(el), Math.sin(a) * Math.cos(el));
    const kind = Math.floor(hash(i, seed + 22) * 4), col = CORAL[Math.floor(hash(i, seed + 23) * CORAL.length)];
    const sc = 0.7 + hash(i, seed + 24) * 0.8;
    const piece = new THREE.Group(); piece.position.set(px, py - 0.15, pz); piece.rotation.y = hash(i, seed + 25) * 6.28; piece.name = 'coral';
    if (kind === 0) {          // san hô nhánh (2 tầng nhánh)
      for (let b = 0; b < 5; b++) {
        const len = (1.0 + hash(b, seed + i) * 0.9) * sc, tilt = b === 0 ? 0 : 0.45 + hash(b, seed + i + 1) * 0.45, ya = b * 1.3;
        const pv = new THREE.Group(); pv.rotation.set(Math.cos(ya) * tilt, 0, Math.sin(ya) * tilt); piece.add(pv);
        const br = new THREE.Mesh(cyl, M(col)); br.scale.set(0.16 * sc, len, 0.16 * sc); br.position.y = len / 2; pv.add(br);
        const tip = new THREE.Mesh(ball, M(col)); tip.scale.setScalar(0.21 * sc); tip.position.y = len; pv.add(tip);
      }
    } else if (kind === 1) {   // san hô não (khối tròn sần)
      const bm = new THREE.Mesh(ball, M(col)); bm.scale.set(0.9 * sc, 0.6 * sc, 0.85 * sc); bm.position.y = 0.2 * sc; piece.add(bm);
    } else if (kind === 2) {   // bọt biển ống
      for (let b = 0; b < 3; b++) { const tb = new THREE.Mesh(tube, M(col)); const len = (0.8 + hash(b, seed + i + 4) * 0.9) * sc;
        tb.scale.set(0.28 * sc, len, 0.28 * sc); tb.position.set((b - 1) * 0.42 * sc, len / 2, (hash(b, seed + i + 5) - 0.5) * 0.4 * sc); tb.rotation.z = (b - 1) * 0.18; piece.add(tb); }
    } else {                   // quạt biển
      const fm = new THREE.Mesh(fanGeo, M(col)); fm.scale.setScalar(1.1 * sc); fm.position.y = 0.05; piece.add(fm);
      const st = new THREE.Mesh(cyl, M(col)); st.scale.set(0.08, 0.5 * sc, 0.08); st.position.y = 0; piece.add(st);
    }
    piece.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
    g.add(piece);
  }
  return g;
}
