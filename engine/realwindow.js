// realwindow.js — Cảnh THẬT ngoài cửa sổ phòng ngủ (góp ý #14): vài lớp cảnh 3D nhẹ nằm sau tường (bầu trời đêm + trăng, đồi xa,
// đường + bãi cỏ, hàng nhà xóm sáng đèn, cây, cột đèn). Camera đi đâu cửa sổ có chiều sâu/thị sai thật. Tất định (hash theo seed, không Math.random).
//   const out = createWindowOutside(THREE, { hash, nbHouse }); R.add(out.group);   // toạ độ phòng: nhìn về +X, tường ở x=20
// Tắt/bật: bedroom.js đọc globalThis.__autoFx.realWindow (false → ảnh phẳng cũ).
export function createWindowOutside(THREE, { hash, nbHouse, groundY = -3 }) {
  const group = new THREE.Group(); group.name = 'bed_outside';
  const tag = (o) => { o.traverse((m) => { if (m.isMesh) { m.castShadow = false; m.receiveShadow = false; m.userData.grungeKind = 'none'; m.userData.matKind = m.userData.matKind || 'matte'; } }); return o; };
  const mix = (c, to, k) => new THREE.Color(c).lerp(new THREE.Color(to), k);
  const FOG = '#7f93c8';                                                   // màu "sương đêm": vật càng xa càng ngả về màu này
  const std = (c, extra = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.95, metalness: 0, ...extra });
  const add = (geo, mat, x, y, z, name, parent = group) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.name = name; parent.add(m); return m; };

  // --- trời đêm: gradient + sao + trăng, vẽ canvas (MeshBasic, không phụ thuộc đèn) ---
  const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 512; const g = cv.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, '#3a58b0'); gr.addColorStop(0.55, '#7f9ee0'); gr.addColorStop(1, '#d8e4ff'); g.fillStyle = gr; g.fillRect(0, 0, 1024, 512);
  for (let i = 0; i < 160; i++) { const s = hash(i, 11); g.fillStyle = `rgba(255,255,240,${0.35 + 0.6 * hash(i, 12)})`; const r = 0.7 + 1.6 * s * s; g.beginPath(); g.arc(hash(i, 13) * 1024, hash(i, 14) * 340, r, 0, 7); g.fill(); }
  const mx = 700, my = 150; const mg = g.createRadialGradient(mx, my, 10, mx, my, 120); mg.addColorStop(0, 'rgba(255,248,215,0.55)'); mg.addColorStop(1, 'rgba(255,248,215,0)'); g.fillStyle = mg; g.fillRect(mx - 130, my - 130, 260, 260);
  g.fillStyle = '#fff6d8'; g.beginPath(); g.arc(mx, my, 34, 0, 7); g.fill(); g.fillStyle = 'rgba(190,180,150,0.45)'; for (const [dx, dy, r] of [[-10, -6, 8], [9, 10, 6], [4, -14, 5]]) { g.beginPath(); g.arc(mx + dx, my + dy, r, 0, 7); g.fill(); }
  const skyTex = new THREE.CanvasTexture(cv); skyTex.colorSpace = THREE.SRGBColorSpace;
  const sky = add(new THREE.PlaneGeometry(900, 450), new THREE.MeshBasicMaterial({ map: skyTex, fog: false }), 420, 140, 0, 'out_sky'); sky.rotation.y = -Math.PI / 2;

  // --- đồi xa (2 lớp bóng đổ) ---
  for (const [x, c, hh, k] of [[330, '#6f84c4', 55, 1], [250, '#5f78b8', 36, 2]]) {
    const sh = new THREE.Shape(); sh.moveTo(-420, 0);
    for (let i = 0; i <= 30; i++) { const z = -420 + i * 28; sh.lineTo(z, hh * (0.45 + 0.55 * Math.abs(Math.sin(i * 0.7 + k * 2) * 0.6 + Math.sin(i * 0.23 + k) * 0.4))); }
    sh.lineTo(420, 0); sh.closePath();
    const hill = add(new THREE.ShapeGeometry(sh), new THREE.MeshBasicMaterial({ color: c, fog: false }), x, groundY - 2, 0, 'out_hills'); hill.rotation.y = -Math.PI / 2;
  }
  // --- mặt đất: bãi cỏ + đường nhựa dọc theo Z ---
  const lawn = add(new THREE.PlaneGeometry(380, 600), std(mix('#2a4a36', FOG, 0.25)), 20 + 190, groundY, 0, 'out_lawn'); lawn.rotation.x = -Math.PI / 2;
  const road = add(new THREE.PlaneGeometry(14, 600), std('#34384e'), 62, groundY + 0.05, 0, 'out_road'); road.rotation.x = -Math.PI / 2;
  const dash = std('#c9c8b0', { emissive: new THREE.Color('#3a3a30') });
  for (let z = -280; z < 280; z += 12) add(new THREE.BoxGeometry(0.5, 0.05, 5), dash, 62, groundY + 0.1, z, 'out_roadline');
  const walk = add(new THREE.PlaneGeometry(4, 600), std('#59607e'), 53, groundY + 0.07, 0, 'out_sidewalk'); walk.rotation.x = -Math.PI / 2;

  // --- nhà xóm (nbHouse của envs.js): 2 hàng, mặt quay ra đường; cửa sổ sáng đèn ---
  const wallC = ['#7d86b8', '#a590b5', '#b79b86', '#7fa3a8', '#9a8fb8'], roofC = ['#8a2a3a', '#2a3a6a', '#6a3a2a'];
  const houses = [[-52, 0, 80], [-24, 1, 76], [8, 2, 82], [38, 3, 78], [70, 4, 80], [-70, 0, 128], [-28, 3, 132], [16, 1, 126], [56, 2, 134], [96, 4, 130]];
  houses.forEach(([z, ci, x], i) => {
    const far = Math.min(1, (x - 70) / 90);
    const hh = nbHouse(mix(wallC[ci], FOG, 0.12 + far * 0.45).getStyle(), mix(roofC[i % 3], FOG, 0.1 + far * 0.45).getStyle(), 7 + i);
    hh.position.set(x, groundY, z); hh.rotation.y = -Math.PI / 2 + (hash(i, 31) - 0.5) * 0.08; hh.name = 'out_house'; hh.scale.setScalar(0.85);
    if (hh.userData.win) { hh.userData.win.emissiveIntensity = hash(i, 32) > 0.25 ? 1.5 : 0.1; }
    group.add(tag(hh));
  });
  // --- cây tròn khối + cột đèn đường (bóng đèn sáng, quầng mờ) ---
  const trunk = std('#3a2a22'), leaf = [std(mix('#2f6a45', FOG, 0.2)), std(mix('#3a7a4f', FOG, 0.3))];
  const tgeo = new THREE.CylinderGeometry(0.7, 0.9, 6, 8), lgeo = new THREE.IcosahedronGeometry(4.2, 0);
  [[34, 17], [30, 38], [33, -27], [46, -44], [47, 30], [49, -62], [100, -45], [104, 22], [86, -12]].forEach(([x, z], i) => {
    const t = new THREE.Group(); t.name = 'out_tree'; add(tgeo, trunk, 0, 3, 0, 'trunk', t); const s = 0.8 + hash(i, 41) * 0.5;
    const cr = add(lgeo, leaf[i % 2], 0, 8.4 * s, 0, 'crown', t); cr.rotation.y = hash(i, 42) * 6;
    t.position.set(x, groundY, z); t.scale.setScalar(s); group.add(tag(t));
  });
  const post = std('#25283a'), bulb = new THREE.MeshBasicMaterial({ color: '#ffe3a0', fog: false });
  const halo = new THREE.MeshBasicMaterial({ color: '#ffe3a0', transparent: true, opacity: 0.16, depthWrite: false, fog: false });
  [[54, -20], [54, 8], [54, 36], [54, -48], [54, 64]].forEach(([x, z]) => {
    const l = new THREE.Group(); l.name = 'out_lamp'; add(new THREE.CylinderGeometry(0.22, 0.3, 11, 6), post, 0, 5.5, 0, 'pole', l);
    add(new THREE.BoxGeometry(2.4, 0.3, 0.3), post, 1.0, 11, 0, 'arm', l); add(new THREE.SphereGeometry(0.7, 8, 6), bulb, 2.0, 10.6, 0, 'bulb', l); add(new THREE.SphereGeometry(2.6, 10, 8), halo, 2.0, 10.6, 0, 'halo', l);
    l.position.set(x, groundY, z); group.add(tag(l));
  });
  // ngoài trời đêm vẫn đọc được: vật liệu tự phát sáng nhẹ theo màu của nó (không phụ thuộc đèn phòng)
  group.traverse((m) => { if (m.isMesh && m.material.isMeshStandardMaterial && m.material.emissive.getHex() === 0) { m.material.emissive.copy(m.material.color).multiplyScalar(0.95); m.material.emissiveIntensity = 1; } });
  tag(group); sky.userData.matKind = 'none';
  return { group };
}
