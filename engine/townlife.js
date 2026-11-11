// townlife.js — Cho thị trấn đông đúc hơn: xe khối vuông (đậu trước nhà + chạy trên đường ban ngày) và dân R6 đi bộ vỉa hè.
// Tất định theo t. Ban đêm: xe chạy và người đi bộ ẩn (cả thị trấn đi ngủ), xe đậu vẫn còn.
//   const life = townLife(THREE, K, { parked: [[x, z, ry], …] });  g.add(life.group);  life.update(t, isDay);
import { createR6, randomLook } from './r6.js';

const hash = (i, s) => { let x = Math.imul(i ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(s + 1, 0xc2b2ae35); x ^= x >>> 13; x = Math.imul(x, 0x27d4eb2f); x ^= x >>> 16; return (x >>> 0) / 4294967296; };
const CAR_COLORS = ['#c0392b', '#2d6cdf', '#f1c40f', '#ecf0f1', '#27ae60', '#e67e22', '#8e44ad', '#34495e', '#16a085', '#d35400'];

// Xe kiểu Roblox: thân hộp, cabin hộp, bánh trụ đen, đèn. Dài ~13 stud dọc trục +Z (đầu xe +Z).
export function blockCar(THREE, K, seed = 0, kind = null) {
  const g = new THREE.Group(); g.name = 'car';
  const col = CAR_COLORS[Math.floor(hash(seed, 1) * CAR_COLORS.length)];
  const type = kind || ['sedan', 'sedan', 'van', 'pickup'][Math.floor(hash(seed, 2) * 4)];
  const glass = K.M('#22303f', { roughness: 0.25, metalness: 0.1 });
  const W = 6.4, L = type === 'van' ? 13 : 12.5;
  K.box(W, 2.4, L, col, 0, 2.2, 0, 'car_body', g);
  K.box(W + 0.1, 0.5, L + 0.1, '#2b2b2b', 0, 1.15, 0, 'car_skirt', g);
  if (type === 'van') {
    K.box(W - 0.2, 3.0, L - 2.2, col, 0, 4.9, -0.9, 'car_cabin', g);
    K.box(W - 0.4, 1.6, 0.2, glass, 0, 5.2, L / 2 - 2.0, 'car_windshield', g);
    for (const s of [-1, 1]) K.box(0.2, 1.4, L - 4.5, glass, s * (W / 2 - 0.05), 5.3, -1.2, 'car_side_glass', g);
  } else {
    const cl = type === 'pickup' ? 4.6 : 6.4, cz = type === 'pickup' ? 1.6 : -0.6;
    K.box(W - 0.6, 2.2, cl, col, 0, 4.5, cz, 'car_cabin', g);
    K.box(W - 0.8, 1.5, 0.2, glass, 0, 4.6, cz + cl / 2 + 0.05, 'car_windshield', g);
    K.box(W - 0.8, 1.5, 0.2, glass, 0, 4.6, cz - cl / 2 - 0.05, 'car_rear_glass', g);
    for (const s of [-1, 1]) K.box(0.2, 1.4, cl - 1.0, glass, s * (W / 2 - 0.25), 4.6, cz, 'car_side_glass', g);
    if (type === 'pickup') { K.box(W, 1.2, 0.4, col, 0, 4.0, -L / 2 + 0.2, 'bed_tail', g); for (const s of [-1, 1]) K.box(0.4, 1.2, 5.6, col, s * (W / 2 - 0.2), 4.0, -3.4, 'bed_side', g); }
  }
  for (const s of [-1, 1]) { K.box(1.2, 0.7, 0.2, '#fff6c8', s * 2.2, 2.7, L / 2 + 0.05, 'car_headlight', g); K.box(1.2, 0.6, 0.2, '#b3261e', s * 2.2, 2.7, -L / 2 - 0.05, 'car_taillight', g); }
  K.box(W + 0.3, 0.5, 0.5, '#9a9a9a', 0, 1.5, L / 2 + 0.2, 'bumper', g); K.box(W + 0.3, 0.5, 0.5, '#9a9a9a', 0, 1.5, -L / 2 - 0.2, 'bumper', g);
  const wheels = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const w = K.cyl(1.25, 1.25, 0.9, '#1b1b1b', sx * (W / 2 - 0.2), 1.25, sz * (L / 2 - 2.6), 'car_wheel', g, 14);
    w.rotation.z = Math.PI / 2; wheels.push(w);
    K.cyl(0.6, 0.6, 0.95, '#bdbdbd', sx * (W / 2 - 0.15), 1.25, sz * (L / 2 - 2.6), 'car_hub', g, 10).rotation.z = Math.PI / 2;
  }
  g.userData.wheels = wheels;
  return g;
}

export function townLife(THREE, K, { parked = [], lanes = [{ z: 31.5, dir: 1 }, { z: 40.5, dir: -1 }], span = 640, walkZ = [25.5, 46.5] } = {}) {
  const group = new THREE.Group(); group.name = 'town_life';
  // xe đậu (luôn có)
  parked.forEach(([x, z, ry], i) => { const c = blockCar(THREE, K, i * 7 + 3); c.position.set(x, 0, z); c.rotation.y = ry; c.name = 'car_parked'; group.add(c); });
  // xe chạy (ban ngày)
  const traffic = new THREE.Group(); traffic.name = 'traffic'; group.add(traffic);
  const movers = [];
  lanes.forEach((ln, li) => { for (let i = 0; i < 4; i++) {
    const c = blockCar(THREE, K, 100 + li * 10 + i); c.rotation.y = ln.dir > 0 ? Math.PI / 2 : -Math.PI / 2; traffic.add(c);
    movers.push({ c, ln, off: (i / 4 + hash(i, li + 5) * 0.12) * span, v: 14 + hash(i, li + 9) * 6 });
  } });
  // người đi bộ (ban ngày)
  const crowd = new THREE.Group(); crowd.name = 'town_walkers'; crowd.userData.grungeKind = 'char'; group.add(crowd);
  const walkers = [];
  for (let i = 0; i < 16; i++) {
    const look = randomLook(1000 + i * 37);
    look.skin = ['#f5d0a9', '#e0ac69', '#c68642', '#f0c89a', '#8d5524', '#ffdbac'][Math.floor(hash(i, 11) * 6)];   // màu da người, không vàng khối
    const p = createR6(THREE, { name: `walker${i}`, ...look });
    const dir = hash(i, 3) < 0.5 ? 1 : -1, z = walkZ[i % walkZ.length] + (hash(i, 4) - 0.5) * 1.2;
    p.root.rotation.y = dir > 0 ? Math.PI / 2 : -Math.PI / 2; crowd.add(p.root);
    walkers.push({ p, dir, z, off: hash(i, 6) * span, v: 3.2 + hash(i, 7) * 1.6, ph: hash(i, 8) * 3, idle: hash(i, 9) < 0.25 });
  }
  const wrap = (x) => ((x % span) + span) % span - span / 2;
  return {
    group,
    update(t, day) {
      traffic.visible = crowd.visible = !!day;
      if (!day) return;
      for (const m of movers) {
        m.c.position.set(wrap(m.off + m.ln.dir * m.v * t), 0, m.ln.z);
        for (const w of m.c.userData.wheels) w.rotation.x = m.v * t / 1.25 * m.ln.dir;
      }
      for (const w of walkers) {
        if (w.idle) { w.p.root.position.set(wrap(w.off), 0, w.z); w.p.animate('idle', t + w.ph); continue; }
        w.p.root.position.set(wrap(w.off + w.dir * w.v * t), 0, w.z); w.p.animate('walk', t + w.ph);
      }
    },
  };
}
