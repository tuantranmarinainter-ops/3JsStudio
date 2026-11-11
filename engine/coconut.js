// Cây dừa khối (low-poly, dựng bằng code): thân cao mảnh hơi cong có đốt vòng, tán lá dài cong xuống, chùm dừa xanh/nâu dưới tán.
// Tất định: cùng seed → cùng cây; không dùng Math.random. Hình học + vật liệu dùng chung giữa mọi cây.

const HASH = (i, s) => { let x = Math.imul(i ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(s + 1, 0xc2b2ae35); x ^= x >>> 13; x = Math.imul(x, 0x27d4eb2f); x ^= x >>> 16; return (x >>> 0) / 4294967296; };

let SHARED = null;
function shared(THREE) {
  if (SHARED && SHARED.THREE === THREE) return SHARED;
  const mk = (c, extra = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, metalness: 0, flatShading: true, ...extra });
  // lá: dải cong có răng cưa hai bên (dọc +X cục bộ, độ võng theo s²)
  const frond = () => {
    const N = 9, pos = [], idx = [];
    for (let k = 0; k <= N; k++) {
      const s = k / N, w = Math.sin(Math.PI * Math.min(1, s * 0.92 + 0.08)) * 0.2 * (k % 2 ? 0.62 : 1) + 0.012;
      const x = s, y = -0.55 * s * s * s - 0.12 * s * s;
      pos.push(x, y, -w, x, y + 0.01, w);   // [trái, phải]
      if (k < N) { const a = k * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    // gân giữa hơi nhô lên để lá có khối
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
  };
  SHARED = {
    THREE,
    frond: frond(),
    nut: new THREE.IcosahedronGeometry(1, 0),
    mats: {
      trunk: [mk('#a67a4b'), mk('#98703f')],
      leaf: [mk('#3f9f3a', { side: THREE.DoubleSide }), mk('#2f8a34', { side: THREE.DoubleSide }), mk('#58b043', { side: THREE.DoubleSide })],
      green: mk('#78a82e'), brown: mk('#6b4423'),
    },
  };
  return SHARED;
}

// h: chiều cao thân (stud), lean: độ nghiêng (0..0.4), seed: biến thể. Trả về Group (gốc ở mặt đất, +Y lên).
export function createCoconutPalm(THREE, { h = 16, lean = 0.2, seed = 0, leanDir = null } = {}) {
  const S = shared(THREE);
  const grp = new THREE.Group(); grp.name = 'coconut_palm';
  const yaw = leanDir ?? HASH(seed, 1) * Math.PI * 2;
  const pivot = new THREE.Group(); pivot.rotation.y = yaw; grp.add(pivot);
  // đường cong thân trong mặt phẳng XY: x = lean*h*t^1.6, y = h*t
  const P = (t) => new THREE.Vector3(lean * h * Math.pow(t, 1.7), h * t, 0);
  const SEG = 12, SIDES = 7, r0 = h * 0.034, r1 = h * 0.021;
  const pos = [], idx = [], col = [];
  const cA = new THREE.Color('#a67a4b'), cB = new THREE.Color('#8d6538');
  for (let k = 0; k < SEG; k++) {
    const t0 = k / SEG, t1 = (k + 1) / SEG, p0 = P(t0), p1 = P(t1);
    const tan = p1.clone().sub(p0).normalize(), nrm = new THREE.Vector3(-tan.y, tan.x, 0), bin = new THREE.Vector3(0, 0, 1);
    const flare = k === 0 ? 1.35 : 1;
    const ra = (r0 + (r1 - r0) * t0) * flare, rb = (r0 + (r1 - r0) * t1) * 0.84;   // đốt: cuối đốt thu lại, đốt kế phình ra
    const base = pos.length / 3, c = k % 2 ? cA : cB;
    for (const [p, r] of [[p0, ra], [p1, rb]]) for (let j = 0; j < SIDES; j++) {
      const a = j / SIDES * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
      pos.push(p.x + (nrm.x * ca + bin.x * sa) * r, p.y + (nrm.y * ca + bin.y * sa) * r, p.z + (nrm.z * ca + bin.z * sa) * r); col.push(c.r, c.g, c.b);
    }
    for (let j = 0; j < SIDES; j++) { const j2 = (j + 1) % SIDES; idx.push(base + j, base + SIDES + j, base + j2, base + j2, base + SIDES + j, base + SIDES + j2); }
  }
  const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); tg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); tg.setIndex(idx); tg.computeVertexNormals();
  const trunk = new THREE.Mesh(tg, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: true })); trunk.name = 'trunk'; trunk.castShadow = true; pivot.add(trunk);
  // tán lá
  const top = P(1), crown = new THREE.Group(); crown.position.copy(top); crown.name = 'crown'; pivot.add(crown);
  const L = h * 0.42, nF = 11;
  for (let i = 0; i < nF; i++) {
    const az = i / nF * Math.PI * 2 + HASH(seed, 20 + i) * 0.4, up = 0.55 - (i % 3) * 0.28 + HASH(seed, 40 + i) * 0.15;
    const piv = new THREE.Group(); piv.rotation.y = az; const tilt = new THREE.Group(); tilt.rotation.z = up; piv.add(tilt);
    const m = new THREE.Mesh(S.frond, S.mats.leaf[(i + seed) % 3]); m.scale.set(L * (0.85 + HASH(seed, 60 + i) * 0.3), L, L * 1.1); m.name = 'frond'; m.castShadow = true; tilt.add(m); crown.add(piv);
  }
  // 2 lá non dựng đứng giữa tán
  for (let i = 0; i < 2; i++) { const piv = new THREE.Group(); piv.rotation.y = i * 3.1 + seed; const tilt = new THREE.Group(); tilt.rotation.z = 1.25; piv.add(tilt); const m = new THREE.Mesh(S.frond, S.mats.leaf[2]); m.scale.set(L * 0.55, L * 0.6, L * 0.6); tilt.add(m); crown.add(piv); }
  // chùm dừa dưới tán
  const nutR = h * 0.026;
  for (let i = 0, n = 6 + Math.floor(HASH(seed, 3) * 3); i < n; i++) {
    const a = i / n * Math.PI * 2 + HASH(seed, 70 + i), rr = nutR * (1.2 + HASH(seed, 80 + i) * 0.9);
    const m = new THREE.Mesh(S.nut, HASH(seed, 90 + i) > 0.38 ? S.mats.green : S.mats.brown);
    m.scale.setScalar(nutR * (0.85 + HASH(seed, 100 + i) * 0.3)); m.position.set(Math.cos(a) * rr, -nutR * (1.0 + HASH(seed, 110 + i) * 1.4), Math.sin(a) * rr); m.name = 'coconut'; m.castShadow = true; crown.add(m);
  }
  return grp;
}

// chim mòng biển đậu: 'perches' = [{ x, y, z, ry, s }] → mỗi con đứng yên, chỉ quay đầu / nhún nhẹ theo t (hàm thuần của t)
export function gullIdle(gl, base, i, t) {
  const ph = i * 2.7, turn = Math.sin(t * 0.55 + ph) * 0.45 * (0.6 + 0.4 * Math.sin(t * 0.21 + ph * 1.3));
  const k = Math.max(0, Math.sin(t * 0.9 + ph * 3.1) - 0.93) / 0.07;   // thỉnh thoảng nhún nhỏ
  gl.position.set(base.x, base.y + k * 0.14, base.z);
  gl.rotation.set(0, base.ry + turn, 0); gl.rotation.z = Math.sin(t * 7 + ph) * 0.02 * k;
}
