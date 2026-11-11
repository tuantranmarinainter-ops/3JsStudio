// peaks.js — Núi tuyết low-poly "thật": lưới dịch chuyển bằng noise có sống núi (ridged fbm),
// mặt đá dốc + tuyết phủ theo độ dốc/độ cao (màu theo đỉnh, flat shading), dãy núi nhiều lớp xa gần.
// Tất định: chỉ dùng noise có seed (winter.js). Không phụ thuộc thời gian.
//   const p = createPeak(THREE, { seed: 3, radius: 160, height: 220 });   scene.add(p.object)
//   const s = createSummit(THREE, { plateauR: 30, depth: 150 });          // đỉnh có mặt bằng cho nhà ở y=0
import { makeNoise2D, fbm } from './winter.js';

const ss = (x, a, b) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

const PALETTE = {
  snow: '#f4f8fd', snowShade: '#d3e1f0', rock: '#6e6670', rockDark: '#4d4852', rockWarm: '#857466',
};

// Tô màu theo mặt (lưới non-indexed): tuyết ở mặt thoải + cao, đá ở mặt dốc; thêm biến thiên nhỏ.
function paint(THREE, geo, { noise, snowLine, snowSoft = 30, slopeSnow = [0.42, 0.62], tint = null, tintK = 0, colors = {} }) {
  const P = { ...PALETTE, ...colors };
  const C = Object.fromEntries(Object.entries(P).map(([k, v]) => [k, new THREE.Color(v)]));
  const tc = tint ? new THREE.Color(tint) : null;
  const p = geo.attributes.position, col = new Float32Array(p.count * 3);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), n = new THREE.Vector3();
  const tmp = new THREE.Color(), rock = new THREE.Color(), snow = new THREE.Color();
  for (let f = 0; f < p.count; f += 3) {
    a.fromBufferAttribute(p, f); b.fromBufferAttribute(p, f + 1); c.fromBufferAttribute(p, f + 2);
    e1.subVectors(b, a); e2.subVectors(c, a); n.crossVectors(e1, e2).normalize(); if (n.y < 0) n.negate();
    const h = (a.y + b.y + c.y) / 3, cx = (a.x + b.x + c.x) / 3, cz = (a.z + b.z + c.z) / 3;
    const slope = 1 - n.y;                                     // 0 = phẳng, 1 = đứng
    const line = snowLine + noise(cx / 35, cz / 35) * snowSoft;
    // mặt càng cao càng giữ tuyết ở độ dốc lớn hơn
    const hk = ss(h, line, line + 80);
    const snowK = ss(h, line - 12, line + 12) * (1 - ss(slope, slopeSnow[0] + hk * 0.12, slopeSnow[1] + hk * 0.12));
    const v = noise(cx / 9 + 31, cz / 9) * 0.5 + 0.5;
    rock.copy(C.rock).lerp(C.rockDark, ss(slope, 0.55, 0.85) * 0.7).lerp(C.rockWarm, v * 0.35);
    // tuyết hướng xa mặt trời (−x −z) hơi xanh xám
    snow.copy(C.snow).lerp(C.snowShade, ss(-(n.x + n.z) * 0.7, -0.1, 0.6) * 0.6);
    tmp.copy(rock).lerp(snow, snowK);
    tmp.offsetHSL(0, 0, (noise(cx / 4.5, cz / 4.5)) * 0.025);
    if (tc) tmp.lerp(tc, tintK);
    for (let k = 0; k < 3; k++) col.set([tmp.r, tmp.g, tmp.b], (f + k) * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
}

// Lưới tròn (vòng × góc) → mép tròn, mật độ cao ở giữa nơi chi tiết cần nhất.
function radialGrid(THREE, R, rings, segs, heightAt, { jitter = 0.35, seed = 1 } = {}) {
  const jn = makeNoise2D(seed + 999);
  const pts = [];   // pts[ring][seg] = [x,y,z]
  for (let i = 0; i <= rings; i++) {
    const u = i / rings, r = R * Math.pow(u, 1.25), row = [];
    const n = i === 0 ? 1 : segs;
    for (let j = 0; j < n; j++) {
      const th = (j / segs) * Math.PI * 2 + (i % 2) * (Math.PI / segs);
      let x = Math.cos(th) * r, z = Math.sin(th) * r;
      if (i > 0 && i < rings) { const d = (R / rings) * jitter; x += jn(x * 0.11, z * 0.11) * d; z += jn(z * 0.11 + 7, x * 0.11) * d; }
      row.push([x, heightAt(x, z), z]);
    }
    pts.push(row);
  }
  const pos = [];
  const push = (q) => pos.push(q[0], q[1], q[2]);
  for (let j = 0; j < segs; j++) { push(pts[0][0]); push(pts[1][(j + 1) % segs]); push(pts[1][j]); }
  for (let i = 1; i < rings; i++) for (let j = 0; j < segs; j++) {
    const a = pts[i][j], b = pts[i][(j + 1) % segs], c = pts[i + 1][j], d = pts[i + 1][(j + 1) % segs];
    push(a); push(b); push(c); push(b); push(d); push(c);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.computeVertexNormals();
  return geo;
}

const peakMat = (THREE, fog = true) => new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.92, metalness: 0, fog });

// Một ngọn núi: đỉnh nhọn có sống núi toả ra, sườn lởm chởm. Đáy ở y = base (nên chìm dưới biển mây).
export function createPeak(THREE, o = {}) {
  const { seed = 1, radius = 150, height = 200, base = -60, rings = 22, segs = 48, sharp = 1.5, snowLine = null,
    tint = null, tintK = 0, name = 'peak', fog = true } = o;
  const noise = makeNoise2D(seed);
  const heightAt = (x, z) => {
    const th = Math.atan2(z, x);
    // bán kính bị bóp méo theo góc → chân núi không tròn
    const warp = 1 + 0.28 * noise(Math.cos(th) * 1.3 + seed, Math.sin(th) * 1.3);
    const d = Math.hypot(x, z) / (radius * warp);
    const prof = Math.pow(Math.max(0, 1 - d), sharp);
    // sống núi toả ra từ đỉnh: ridged noise theo góc, mạnh dần ra giữa sườn
    const ridge = fbm(noise, x / (radius * 0.35), z / (radius * 0.35), 4, true);
    const det = fbm(noise, x / (radius * 0.12) + 40, z / (radius * 0.12), 3);
    const hgt = height * (prof * (0.78 + 0.42 * ridge) + det * 0.05 * (1 - d * 0.5));
    return base + Math.max(0, hgt) - (d > 1 ? 10 : 0);
  };
  const geo = radialGrid(THREE, radius * 1.15, rings, segs, (x, z) => heightAt(x, z), { seed });
  paint(THREE, geo, { noise, snowLine: snowLine ?? base + height * 0.5, slopeSnow: [0.3, 0.48], tint, tintK });
  const mesh = new THREE.Mesh(geo, peakMat(THREE, fog)); mesh.name = name;
  return { object: mesh, heightAt };
}

// Đỉnh chính có mặt bằng tuyết bán kính plateauR ở y = 0 (nhà đứng), sườn đá dốc xuống y = -depth.
export function createSummit(THREE, o = {}) {
  const { seed = 11, plateauR = 30, radius = 170, depth = 170, rings = 34, segs = 72, keepClear = null } = o;
  const noise = makeNoise2D(seed);
  const heightAt = (x, z) => {
    const r = Math.hypot(x, z), th = Math.atan2(z, x);
    const edge = plateauR * (1 + 0.12 * noise(Math.cos(th) * 2 + 3, Math.sin(th) * 2));
    if (r < edge) {   // mặt bằng: phẳng dưới nhà, gợn tuyết nhẹ ra mép
      const k = ss(r, edge * 0.72, edge);
      return k * (0.8 + noise(x / 6, z / 6) * 0.9) + (1 - k) * 0 - ss(r, edge * 0.9, edge) * 1.2;
    }
    const u = (r - edge) / (radius - edge);                       // 0 mép → 1 chân
    // vách dốc gần mép rồi thoải dần (đường cong lõm) + sống núi + mỏm đá
    const fall = depth * (1 - Math.pow(1 - Math.min(1, u), 2.3));
    const ridge = fbm(noise, x / 55, z / 55, 4, true);
    const crag = fbm(noise, x / 16 + 9, z / 16, 3);
    const lip = Math.exp(-u * 14) * 3.5 * (0.5 + 0.5 * noise(th * 3, 1.7));   // gờ đá quanh mép
    return -1.2 - fall + ridge * 26 * ss(u, 0, 0.25) * (1 - u * 0.4) + crag * 7 * ss(u, 0.02, 0.15) + lip;
  };
  const geo = radialGrid(THREE, radius, rings, segs, heightAt, { seed, jitter: 0.3 });
  // mặt bằng giữ tuyết hoàn toàn; sườn: tuyết theo độ dốc
  paint(THREE, geo, { noise, snowLine: -70, snowSoft: 25, slopeSnow: [0.3, 0.5] });
  const mesh = new THREE.Mesh(geo, peakMat(THREE)); mesh.name = 'summit'; mesh.receiveShadow = true;
  return { object: mesh, heightAt };
}

// Dãy núi quanh tâm: các ngọn ở nhiều khoảng cách, càng xa càng nhạt màu trời.
export function createRange(THREE, o = {}) {
  const { seed = 21, count = 9, rMin = 320, rMax = 820, base = -60, fade = '#cfe2f3', hMin = 150, hMax = 240, hFar = 90 } = o;
  const g = new THREE.Group(); g.name = 'peak_range';
  const h = (i, s) => { let x = Math.imul(i ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(s + seed, 0xc2b2ae35); x ^= x >>> 13; x = Math.imul(x, 0x27d4eb2f); x ^= x >>> 16; return (x >>> 0) / 4294967296; };
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + (h(i, 1) - 0.5) * 0.5;
    const r = rMin + h(i, 2) * (rMax - rMin), far = (r - rMin) / (rMax - rMin);
    const height = hMin + h(i, 3) * (hMax - hMin) + far * hFar;
    const p = createPeak(THREE, { seed: seed + i * 7, radius: height * (0.75 + h(i, 4) * 0.4), height, base, sharp: 1.25 + h(i, 5) * 0.6,
      rings: 18, segs: 40, tint: fade, tintK: 0.18 + far * 0.32, name: 'range_peak', fog: false });
    p.object.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
    p.object.rotation.y = h(i, 6) * 6.28;
    g.add(p.object);
  }
  return { object: g };
}
