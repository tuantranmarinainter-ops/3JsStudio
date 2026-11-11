// env_desert.js — đồ dựng bằng code cho env 'sahara' (kim tự tháp, lạc đà khối) và 'brazil' (cây rừng khối).
// Mọi thứ là hàm thuần của t; không Math.random (dùng hash theo seed).
export const hash = (i, s) => { let x = Math.imul(i ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(s + 1, 0xc2b2ae35); x ^= x >>> 13; x = Math.imul(x, 0x27d4eb2f); x ^= x >>> 16; return (x >>> 0) / 4294967296; };

// Kim tự tháp bậc thang (khối vuông chồng nhỏ dần); size = cạnh đáy.
export function pyramid(THREE, size = 60, color = '#d8a965', steps = 12) {
  const g = new THREE.Group(); g.name = 'pyramid';
  const h = size * 0.62 / steps;
  for (let i = 0; i < steps; i++) {
    const s = size * (1 - i / steps);
    const m = new THREE.Mesh(new THREE.BoxGeometry(s, h, s), new THREE.MeshStandardMaterial({ color: new THREE.Color(color).offsetHSL(0, 0, (i % 2 ? 0.02 : -0.015)), roughness: 1, flatShading: true }));
    m.position.y = h * (i + 0.5); m.castShadow = true; m.receiveShadow = true; m.name = 'pyr_step'; g.add(m);
  }
  return g;
}

// Lạc đà khối Roblox, nhìn về +X. update(t) → chân bước theo t (bước = 0 thì đứng yên, chỉ nhún nhẹ).
export function camel(THREE, K, seed = 0, walk = 0) {
  const g = new THREE.Group(); g.name = 'camel';
  const fur = ['#c9954f', '#bd8741', '#d3a35f'][seed % 3], dark = '#7a5230', hump = new THREE.Color(fur).offsetHSL(0, 0, -0.05).getStyle();
  const body = new THREE.Group(); body.name = 'camel_body'; g.add(body);
  K.box(6, 2.6, 2.4, fur, 0, 5.2, 0, 'torso', body);
  K.box(1.8, 1.6, 1.8, hump, -0.9, 7, 0, 'hump1', body);
  K.box(1.8, 1.6, 1.8, hump, 1.3, 7, 0, 'hump2', body);
  const neck = K.box(1.1, 3.4, 1.1, fur, 3.3, 6.6, 0, 'neck', body); neck.rotation.z = -0.35;
  K.box(2.1, 1.1, 1.2, fur, 4.5, 8.3, 0, 'head', body);
  K.box(0.7, 0.7, 1.0, dark, 5.6, 8.1, 0, 'muzzle', body);
  K.box(0.35, 0.35, 0.35, '#1b1b1b', 5.1, 8.7, 0.62, 'eyeL', body); K.box(0.35, 0.35, 0.35, '#1b1b1b', 5.1, 8.7, -0.62, 'eyeR', body);
  K.box(0.4, 0.7, 0.4, fur, 4.0, 9.1, 0.4, 'earL', body); K.box(0.4, 0.7, 0.4, fur, 4.0, 9.1, -0.4, 'earR', body);
  const tail = K.box(0.4, 2.2, 0.4, dark, -3.2, 5.0, 0, 'tail', body); tail.rotation.z = 0.25;
  K.box(2.3, 0.4, 2.5, '#b8392f', 0.2, 6.5, 0, 'blanket', body);
  const legs = [];
  for (const [x, z, ph] of [[2.2, 0.8, 0], [2.2, -0.8, Math.PI], [-2.2, 0.8, Math.PI], [-2.2, -0.8, 0]]) {
    const piv = new THREE.Group(); piv.position.set(x, 3.9, z); piv.name = 'camel_leg'; g.add(piv);
    K.box(0.8, 2.4, 0.8, fur, 0, -1.2, 0, 'thigh', piv); K.box(0.7, 1.6, 0.7, dark, 0, -3.1, 0, 'shin', piv);
    piv.userData.ph = ph; legs.push(piv);
  }
  g.userData.update = (t) => {
    const a = t * 3.2 * (walk ? 1 : 0) + seed;
    legs.forEach((l) => { l.rotation.z = Math.sin(a + l.userData.ph) * 0.5 * (walk ? 1 : 0); });
    body.position.y = walk ? Math.abs(Math.sin(a)) * 0.15 : Math.sin(t * 1.3 + seed) * 0.05;
    neck.rotation.z = -0.35 + Math.sin(t * 0.9 + seed * 2) * 0.08;
  };
  return g;
}

// Cây rừng nhiệt đới khối: thân cao, vài tầng tán khối vuông, dây leo rủ, lá to dẹt.
export function jungleGiant(THREE, K, h = 40, seed = 0) {
  const g = new THREE.Group(); g.name = 'jungle_giant';
  const trunk = h * 0.06 + 1.2;
  const bark = ['#5b3b22', '#6b4a2a', '#4e3320'][seed % 3];
  K.box(trunk * 1.8, h, trunk * 1.8, bark, 0, h / 2, 0, 'trunk', g);
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + hash(seed, i) * 0.6; const r = K.box(trunk * 0.7, h * 0.12, trunk * 2.4, bark, Math.cos(a) * trunk, h * 0.06, Math.sin(a) * trunk, 'root', g); r.rotation.y = -a; r.rotation.z = 0; }
  const greens = ['#1f6b2e', '#2e8b3c', '#3c9a46', '#58b34a'];
  for (let k = 0; k < 7; k++) {
    const y = h * (0.7 + k * 0.05), rr = h * (0.16 + 0.08 * hash(seed, 10 + k)), a = hash(seed, 20 + k) * 6.28, d = k === 0 ? 0 : h * 0.14;
    const c = K.box(rr * 2, rr * 0.8, rr * 2, greens[(seed + k) % 4], Math.cos(a) * d, y, Math.sin(a) * d, 'canopy', g); c.rotation.y = hash(seed, 30 + k) * 1.5;
  }
  for (let k = 0; k < 5; k++) { const a = hash(seed, 40 + k) * 6.28, d = h * 0.2; const vh = h * (0.25 + hash(seed, 50 + k) * 0.3); K.box(0.35, vh, 0.35, '#2e7a35', Math.cos(a) * d, h * 0.72 - vh / 2, Math.sin(a) * d, 'vine', g); }
  return g;
}

// Lá to dẹt (kiểu monstera/chuối) toả ra từ gốc — bụi lá khối.
export function bigLeaves(THREE, K, s = 4, seed = 0, color = '#2f9a3f') {
  const g = new THREE.Group(); g.name = 'big_leaves';
  const n = 6 + (seed % 3);
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2 + hash(seed, i) * 0.5, tilt = 0.7 + hash(seed, i + 9) * 0.4, L = s * (0.9 + hash(seed, i + 3) * 0.5);
    const piv = new THREE.Group(); piv.rotation.y = a; g.add(piv);
    const lf = K.box(L, 0.18, L * 0.38, new THREE.Color(color).offsetHSL(0, 0, hash(seed, i + 5) * 0.12 - 0.05).getStyle(), L / 2, 0, 0, 'leaf', piv);
    lf.rotation.z = tilt; lf.position.set(Math.cos(tilt) * L / 2, Math.sin(tilt) * L / 2, 0);
  }
  return g;
}
