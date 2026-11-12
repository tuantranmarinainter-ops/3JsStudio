// snowpeaks.js — dãy núi tuyết/băng low-poly nhiều lớp (tĩnh, tất định theo seed). Không phụ thuộc thời gian.
//   g.add(snowRange(THREE, { seed, z: -260, width: 900, depth: 160, height: 110 }))
// Địa hình = ridged fbm * đường bao (nhiều khối núi dọc trục X, về 0 ở mép để hoà vào mặt tuyết).
// Màu theo độ cao + độ dốc: tuyết trên đỉnh/mặt thoải, đá xanh xám ở sườn dốc, băng xanh ở chân.
import { makeNoise2D, fbm } from './winter.js';

export function snowRange(THREE, o = {}) {
  const c = {
    seed: 3, z: -260, x: 0, width: 900, depth: 160, height: 110, segX: 90, segZ: 22, freq: 1,
    snow: '#f4f8fc', rock: '#6f7b92', ice: '#a9c6dd', shade: 0.0, name: 'snow_range', natural: false, ...o,
  };
  const noise = makeNoise2D(c.seed), n2 = makeNoise2D(c.seed + 17);
  const geo = new THREE.PlaneGeometry(c.width, c.depth, c.natural ? c.segX * 2 : c.segX, c.natural ? c.segZ * 2 : c.segZ);
  geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position;
  const ss = THREE.MathUtils.smoothstep;
  const H = (x, z) => {
    const u = z / c.depth + 0.5;                       // 0..1 theo chiều sâu
    const env = Math.pow(Math.sin(Math.min(1, Math.max(0, u)) * Math.PI), 0.9);
    const massif = ss(noise(x / (230 / c.freq) + 3, 0.5) * 0.5 + 0.5, 0.25, 0.8);   // các khối núi + đèo
    const ridge = fbm(noise, x / (95 / c.freq), z / (60 / c.freq) + 9, 5, true);
    const detail = fbm(n2, x / 22, z / 22, 3) * 0.5 + 0.5;
    if (c.natural) {   // núi tự nhiên: sống núi gồ ghề mềm, đỉnh tròn, sườn có bậc (không nhọn như dao)
      const rd = fbm(noise, x / (130 / c.freq), z / (80 / c.freq) + 9, 4, true), sm = fbm(n2, x / (70 / c.freq) + 5, z / (60 / c.freq), 4) * 0.5 + 0.5;
      let r = 0.5 * rd + 0.5 * sm;
      let hh = c.height * (0.2 + 0.8 * massif) * (0.3 + 0.9 * r);
      const cap = c.height * 1.0; hh = cap * Math.tanh(hh / cap * 1.5);       // nén đỉnh → tròn
      const ter = hh / (c.height * 0.12), fr = ter - Math.floor(ter);         // bậc thoải theo độ cao
      hh += (ss(fr, 0.55, 1) - 0.5) * c.height * 0.035 + (fbm(n2, x / 14, z / 14, 3) * 0.5) * c.height * 0.04;
      return env * hh - 3;
    }
    return env * (c.height * (0.18 + 0.82 * massif) * (0.35 + 0.9 * ridge) + detail * c.height * 0.05) - 3;
  };
  for (let i = 0; i < p.count; i++) p.setY(i, H(p.getX(i), p.getZ(i)));
  const ng = c.natural ? geo : geo.toNonIndexed(); ng.computeVertexNormals();
  const q = ng.attributes.position, nm = ng.attributes.normal, col = new Float32Array(q.count * 3);
  const C = { snow: new THREE.Color(c.snow), rock: new THREE.Color(c.rock), ice: new THREE.Color(c.ice) }, tmp = new THREE.Color();
  if (c.natural) {
    for (let i = 0; i < q.count; i++) {
      const h = q.getY(i), cx = q.getX(i), cz = q.getZ(i), slope = 1 - Math.abs(nm.getY(i)), hn = h / c.height;
      const rockK = ss(slope, 0.22, 0.55) * ss(hn, 0.04, 0.25);
      const snowK = ss(hn + noise(cx / 26, cz / 26) * 0.12, 0.1, 0.3) * (1 - ss(slope, 0.42, 0.7));
      tmp.copy(C.ice).lerp(C.rock, rockK).lerp(C.snow, Math.max(snowK, ss(hn, 0.6, 0.85) * (1 - rockK * 0.4)));
      tmp.offsetHSL(0, 0, noise(cx / 9, cz / 9) * 0.03 - c.shade); col.set([tmp.r, tmp.g, tmp.b], i * 3);
    }
  } else for (let f = 0; f < q.count; f += 3) {
    const h = (q.getY(f) + q.getY(f + 1) + q.getY(f + 2)) / 3;
    const cx = (q.getX(f) + q.getX(f + 1) + q.getX(f + 2)) / 3, cz = (q.getZ(f) + q.getZ(f + 1) + q.getZ(f + 2)) / 3;
    const slope = 1 - Math.abs(nm.getY(f));
    const hn = h / c.height;
    const rockK = ss(slope, 0.18, 0.5) * ss(hn, 0.05, 0.3);
    const snowK = ss(hn + noise(cx / 30, cz / 30) * 0.1, 0.12, 0.35) * (1 - ss(slope, 0.38, 0.62));
    tmp.copy(C.ice).lerp(C.rock, rockK).lerp(C.snow, Math.max(snowK, ss(hn, 0.55, 0.8) * (1 - rockK * 0.5)));
    tmp.offsetHSL(0, 0, noise(cx / 9, cz / 9) * 0.035 - c.shade);
    for (let k = 0; k < 3; k++) col.set([tmp.r, tmp.g, tmp.b], (f + k) * 3);
  }
  ng.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const m = new THREE.Mesh(ng, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: !c.natural, roughness: 0.9 }));
  m.position.set(c.x, 0, c.z); m.name = c.name; m.receiveShadow = true; return m;
}

// 3 lớp xa → gần
export function snowRanges(THREE, { day = true, seed = 3, natural = false } = {}) {
  const grp = new THREE.Group(); grp.name = 'snow_ranges';
  const pal = day
    ? { snow: '#f6fafd', rock: '#7b8aa3', ice: '#b6d2e6' }
    : { snow: '#b9c5e2', rock: '#46557f', ice: '#7f93c4' };
  grp.add(snowRange(THREE, { seed, z: -520, width: 1500, depth: 220, height: 190, freq: 0.8, ...pal, natural, name: 'range_far' }));
  grp.add(snowRange(THREE, { seed: seed + 1, z: -390, width: 1200, depth: 170, height: 130, ...pal, natural, name: 'range_mid' }));
  grp.add(snowRange(THREE, { seed: seed + 2, z: -270, width: 900, depth: 120, height: 85, freq: 1.3, ...pal, natural, name: 'range_near' }));
  return grp;
}
