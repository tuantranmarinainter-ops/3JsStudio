// crabs.js — Sự sống bãi biển, tất định theo t (hàm thuần, không Math.random / giờ thực):
//   createCrabs(THREE, list)      cua khối nhỏ chạy ngang qua lại trên cát (dừng – chạy – dừng), chân/càng động theo t
//   createBeachGrass(THREE, o)    hàng cỏ bãi biển + cây bụi lá to (InstancedMesh, lay nhẹ theo gió)
import { hash } from './cliff.js';
const sm = (k) => k * k * (3 - 2 * k);
const clamp01 = (v) => Math.min(1, Math.max(0, v));

// Cua khối: thân nhìn +Z, chạy ngang theo trục X cục bộ.
function crabModel(THREE, color = '#e2552f', s = 1) {
  const g = new THREE.Group(); g.name = 'crab';
  const body = new THREE.Group(); body.name = 'crab_body'; g.add(body);
  const shell = new THREE.MeshStandardMaterial({ color, roughness: 0.6, flatShading: true });
  const dark = new THREE.MeshStandardMaterial({ color: new THREE.Color(color).offsetHSL(0, 0, -0.14), roughness: 0.7, flatShading: true });
  const white = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.4 }), black = new THREE.MeshStandardMaterial({ color: '#111111', roughness: 0.4 });
  const B = (w, h, d, m, x, y, z, name, parent = body) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.castShadow = true; o.name = name; parent.add(o); return o; };
  B(1.0, 0.36, 0.72, shell, 0, 0.42, 0, 'crab_shell');
  B(0.8, 0.14, 0.56, dark, 0, 0.66, -0.02, 'crab_top');
  for (const sx of [-1, 1]) {   // mắt trên cuống
    B(0.07, 0.24, 0.07, dark, sx * 0.18, 0.72, 0.3, 'crab_stalk');
    B(0.16, 0.16, 0.16, white, sx * 0.18, 0.88, 0.32, 'crab_eye');
    B(0.08, 0.08, 0.04, black, sx * 0.18, 0.89, 0.41, 'crab_pupil');
  }
  const legs = [], claws = [];
  for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) {   // 3 chân mỗi bên (khớp ở mép thân)
    const pv = new THREE.Group(); pv.position.set(sx * 0.48, 0.4, 0.2 - i * 0.24); pv.name = 'crab_leg'; body.add(pv);
    const up = B(0.38, 0.08, 0.08, dark, sx * 0.17, 0.06, 0, 'leg_upper', pv); up.rotation.z = sx * 0.5;
    const lo = B(0.08, 0.38, 0.08, dark, sx * 0.36, -0.12, 0, 'leg_lower', pv);
    legs.push({ pv, sx, i });
  }
  for (const sx of [-1, 1]) {   // 2 càng phía trước
    const pv = new THREE.Group(); pv.position.set(sx * 0.32, 0.45, 0.36); pv.name = 'crab_claw'; body.add(pv);
    B(0.1, 0.1, 0.34, shell, 0, 0, 0.16, 'claw_arm', pv);
    const palm = B(0.26, 0.22, 0.28, shell, sx * 0.04, 0.06, 0.42, 'claw_palm', pv);
    const pin = new THREE.Group(); pin.position.set(sx * 0.04, 0.14, 0.52); pv.add(pin);
    B(0.12, 0.08, 0.22, shell, 0, 0, 0.08, 'claw_pincer', pin);
    claws.push({ pv, pin, sx });
  }
  g.scale.setScalar(s);
  return { g, body, legs, claws };
}

// list: [{ a:[x,z], b:[x,z], y=0, speed (stud/s), pause (s), phase (s), color, s }]
export function createCrabs(THREE, list = []) {
  const group = new THREE.Group(); group.name = 'crabs';
  const crabs = list.map((c, i) => {
    const m = crabModel(THREE, c.color || ['#e2552f', '#f07a3a', '#d8433a'][i % 3], c.s || 1);
    const dx = c.b[0] - c.a[0], dz = c.b[1] - c.a[1], len = Math.hypot(dx, dz);
    m.g.rotation.y = Math.atan2(-dz, dx);   // trục X cục bộ trùng hướng chạy (cua chạy ngang)
    group.add(m.g);
    return { ...m, c, len, run: len / (c.speed || 4), pause: c.pause ?? 0.6 + hash(i, 4) * 0.8 };
  });
  function update(t) {
    for (const k of crabs) {
      const { c, run, pause } = k, T = 2 * (run + pause);
      let u = ((t + (c.phase || 0)) % T + T) % T, pos, moving;
      // a → (dừng) → b → (dừng) → a
      if (u < run) { pos = sm(u / run); moving = 1; }
      else if (u < run + pause) { pos = 1; moving = 0; }
      else if (u < 2 * run + pause) { pos = 1 - sm((u - run - pause) / run); moving = 1; }
      else { pos = 0; moving = 0; }
      const ramp = moving ? Math.sin(Math.PI * clamp01(u < run ? u / run : (u - run - pause) / run)) : 0;   // tốc độ chân theo tốc độ thân
      const x = c.a[0] + (c.b[0] - c.a[0]) * pos, z = c.a[1] + (c.b[1] - c.a[1]) * pos;
      k.g.position.set(x, c.y || 0, z);
      const tt = t + (c.phase || 0);
      k.body.position.y = Math.abs(Math.sin(tt * 22)) * 0.05 * ramp;
      for (const L of k.legs) { const ph = tt * 22 + L.i * 2.1 + (L.sx > 0 ? Math.PI : 0); L.pv.rotation.z = Math.sin(ph) * 0.45 * ramp; L.pv.rotation.x = Math.cos(ph) * 0.25 * ramp; }
      for (const C of k.claws) { const snap = (1 - ramp) * Math.max(0, Math.sin(tt * 7 + C.sx)); C.pv.rotation.x = -0.35 - 0.35 * (1 - ramp) + Math.sin(tt * 3 + C.sx) * 0.1; C.pin.rotation.x = -snap * 0.5; }
    }
  }
  update(0);
  return { group, update };
}

// Cỏ bãi biển theo hàng. rows: [{ a:[x,z], b:[x,z], n, jitter }] hoặc arcs: [{ c:[x,z], r, a0, a1, n, jitter }]
// skip(x,z) → true để bỏ chỗ (lối đi, nhà, mỏm đá). plants = số cây bụi lá to rải xen giữa các hàng.
export function createBeachGrass(THREE, { rows = [], arcs = [], skip = () => false, seed = 5, plantEvery = 5, y = 0 } = {}) {
  const group = new THREE.Group(); group.name = 'beach_grass';
  const spots = [];
  const push = (x, z, i) => { if (!skip(x, z)) spots.push([x, z, i]); };
  let idx = 0;
  for (const r of rows) for (let i = 0; i < r.n; i++) { const k = (i + 0.5) / r.n, j = r.jitter ?? 1.2; push(r.a[0] + (r.b[0] - r.a[0]) * k + (hash(idx, seed) - 0.5) * j, r.a[1] + (r.b[1] - r.a[1]) * k + (hash(idx, seed + 1) - 0.5) * j, idx++); }
  for (const r of arcs) for (let i = 0; i < r.n; i++) { const a = r.a0 + (r.a1 - r.a0) * (i + 0.5) / r.n, j = r.jitter ?? 1.5, rr = r.r + (hash(idx, seed + 2) - 0.5) * j; push(r.c[0] + Math.cos(a) * rr, r.c[1] + Math.sin(a) * rr, idx++); }
  // một búi cỏ: 9 lá mảnh cong (2 đoạn), gốc đậm ngọn nhạt
  const pos = [], col = [], cBase = new THREE.Color('#5d8a3a'), cTip = new THREE.Color('#c9d77a');
  for (let b = 0; b < 9; b++) {
    const a = (b / 9) * Math.PI * 2 + hash(b, 77) * 0.6, lean = 0.25 + hash(b, 78) * 0.45, h = 1.1 + hash(b, 79) * 0.9, w = 0.11;
    const dx = Math.cos(a), dz = Math.sin(a), px = -dz * w, pz = dx * w;
    const p0 = [0, 0, 0], p1 = [dx * lean * 0.35 * h, h * 0.55, dz * lean * 0.35 * h], p2 = [dx * lean * h, h, dz * lean * h];
    const quad = (A, B, wa, wb, ca, cb) => {
      const a1 = [A[0] - px * wa, A[1], A[2] - pz * wa], a2 = [A[0] + px * wa, A[1], A[2] + pz * wa], b1 = [B[0] - px * wb, B[1], B[2] - pz * wb], b2 = [B[0] + px * wb, B[1], B[2] + pz * wb];
      pos.push(...a1, ...a2, ...b2, ...a1, ...b2, ...b1);
      for (const cc of [ca, ca, cb, ca, cb, cb]) col.push(cc.r, cc.g, cc.b);
    };
    const cm = cBase.clone().lerp(cTip, 0.5);
    quad(p0, p1, 1, 0.7, cBase, cm); quad(p1, p2, 0.7, 0.05, cm, cTip);
  }
  const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); tg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); tg.computeVertexNormals();
  const gm = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, side: THREE.DoubleSide });
  const grass = new THREE.InstancedMesh(tg, gm, Math.max(1, spots.length)); grass.name = 'grass_tufts'; grass.castShadow = true; grass.receiveShadow = true;
  // cây bụi lá to (kiểu rau muống biển / cỏ lá dứa): 7 lá rộng xoè quanh gốc
  const lp = [], lc = [], leafC = new THREE.Color('#3f8a3c'), leafT = new THREE.Color('#79b84f');
  for (let b = 0; b < 7; b++) {
    const a = (b / 7) * Math.PI * 2, dx = Math.cos(a), dz = Math.sin(a), L = 1.5 + hash(b, 81) * 0.5, up = 0.5 + hash(b, 82) * 0.5, w = 0.42;
    const tip = [dx * L, up, dz * L], mid = [dx * L * 0.5, up * 0.75, dz * L * 0.5], sx = -dz * w, sz = dx * w;
    const l1 = [mid[0] - sx, mid[1], mid[2] - sz], l2 = [mid[0] + sx, mid[1], mid[2] + sz];
    lp.push(0, 0.05, 0, ...l1, ...tip, 0, 0.05, 0, ...tip, ...l2);
    for (const cc of [leafC, leafT, leafT, leafC, leafT, leafT]) lc.push(cc.r, cc.g, cc.b);
  }
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3)); pg.setAttribute('color', new THREE.Float32BufferAttribute(lc, 3)); pg.computeVertexNormals();
  const pSpots = spots.filter((s) => s[2] % plantEvery === 2);
  const plants = new THREE.InstancedMesh(pg, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, side: THREE.DoubleSide, flatShading: true }), Math.max(1, pSpots.length));
  plants.name = 'beach_plants'; plants.castShadow = true; plants.receiveShadow = true;
  const tSpots = spots.filter((s) => s[2] % plantEvery !== 2);
  grass.count = tSpots.length; plants.count = pSpots.length;
  const o = new THREE.Object3D(), c = new THREE.Color();
  tSpots.forEach(([x, z, i], k) => { c.setHSL(0.2 + hash(i, seed + 5) * 0.06, 0.45, 0.42 + hash(i, seed + 6) * 0.14); grass.setColorAt(k, c); });
  pSpots.forEach(([x, z, i], k) => { o.position.set(x, y, z); o.rotation.set(0, hash(i, seed + 7) * 6.28, 0); o.scale.setScalar(0.8 + hash(i, seed + 8) * 0.6); o.updateMatrix(); plants.setMatrixAt(k, o.matrix); });
  plants.instanceMatrix.needsUpdate = true;
  group.add(grass, plants);
  function update(t) {   // gió lay ngọn cỏ (nghiêng cả búi quanh gốc, theo vị trí → sóng gió chạy qua)
    tSpots.forEach(([x, z, i], k) => {
      const sw = Math.sin(t * 1.7 + x * 0.21 + z * 0.13) * 0.07 + Math.sin(t * 3.1 + i) * 0.025;
      o.position.set(x, y, z); o.rotation.set(sw * 0.6, hash(i, seed + 3) * 6.28, sw); o.scale.setScalar(0.75 + hash(i, seed + 4) * 0.7); o.updateMatrix(); grass.setMatrixAt(k, o.matrix);
    });
    grass.instanceMatrix.needsUpdate = true;
  }
  update(0);
  return { group, update, count: spots.length };
}
