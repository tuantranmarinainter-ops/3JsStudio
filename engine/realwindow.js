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

// createRealWindow — cửa sổ THẬT trọn gói cho phòng (trước chỉ vá trong envs/bedroom.js; kế thừa ep001, ô FX 'realWindow', mặc định bật):
//   tường có lỗ khoét đúng cửa sổ + cảnh 3D ngoài (createWindowOutside) + bản NGÀY (trời xanh/mây/nắng khi shot ban ngày) + kính mờ.
//   Gọi 1 dòng ở env:  const rw = createRealWindow(THREE, { hash, nbHouse, parent: R, wall: eastWall, hole: { cx: -6, hw: 3.45, hh: 3.95 }, glass: { w: 6.6, h: 7.6 }, ganTang });
//     … sau khi dựng K.window: glass đặt/ thêm tay: glass.position.set(…); R.add(rw.glass)
//     update(t, ctx) của env:  rw.update(ctx, { LIGHTS, window: e.window })   // ẩn/hiện theo ô, đổi ngày/đêm
//   wall = mesh tường phẳng (PlaneGeometry size[0]×size[1], vật liệu dùng lại cho tường có lỗ); hole = lỗ trong toạ độ cục bộ của tường.
//   Tắt ô: tường phẳng + ảnh phẳng 'window_view' của K.window như cũ. Thứ tự tạo đối tượng giữ như bản vá cũ (tường lỗ → cảnh ngoài → bản ngày → kính).
export function createRealWindow(THREE, { hash, nbHouse, parent, wall, hole, glass: gl = { w: 6.6, h: 7.6 }, size = [50, 22], ganTang = (o) => o }) {
  const wallMat = wall.material;
  const holeWall = (() => { const [W, Hh] = size, sh = new THREE.Shape(); sh.moveTo(-W / 2, -Hh / 2); sh.lineTo(W / 2, -Hh / 2); sh.lineTo(W / 2, Hh / 2); sh.lineTo(-W / 2, Hh / 2); sh.closePath();
    const hp = new THREE.Path(); const { cx, hw, hh } = hole; hp.moveTo(cx - hw, -hh); hp.lineTo(cx - hw, hh); hp.lineTo(cx + hw, hh); hp.lineTo(cx + hw, -hh); hp.closePath(); sh.holes.push(hp);
    const geo = new THREE.ShapeGeometry(sh); const uv = geo.attributes.uv, pos = geo.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / W + 0.5, pos.getY(i) / Hh + 0.5);
    const m = new THREE.Mesh(geo, wallMat); m.position.copy(wall.position); m.rotation.copy(wall.rotation); m.receiveShadow = true; m.name = 'wall_east_window'; parent.add(m); return m; })();
  const outside = createWindowOutside(THREE, { hash, nbHouse }); parent.add(ganTang(outside.group, 'back'));
  // BAN NGÀY (chỉ khi shot có `time` ban ngày → ctx.thoiTiet + ánh sáng không phải đêm; ep001 không ghi time nên không bao giờ vào đây): trời xanh + mây + nắng thay trời đêm, đồi/cỏ/đường sáng màu
  const dayK = (() => { const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 512; const c = cv.getContext('2d');
    const gr = c.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, '#4f9be8'); gr.addColorStop(0.6, '#9fd0f5'); gr.addColorStop(1, '#e4f2fb'); c.fillStyle = gr; c.fillRect(0, 0, 1024, 512);
    const sg = c.createRadialGradient(700, 130, 8, 700, 130, 150); sg.addColorStop(0, 'rgba(255,250,210,1)'); sg.addColorStop(0.2, 'rgba(255,244,190,0.7)'); sg.addColorStop(1, 'rgba(255,244,190,0)'); c.fillStyle = sg; c.fillRect(540, 0, 320, 300);
    c.fillStyle = 'rgba(255,255,255,0.92)'; for (let i = 0; i < 9; i++) { const x = hash(i, 51) * 1024, y = 120 + hash(i, 52) * 230, r = 22 + hash(i, 53) * 22; for (let k = 0; k < 4; k++) { c.beginPath(); c.arc(x + k * r * 0.8, y + (k % 2) * -r * 0.3, r * (1 - Math.abs(k - 1.5) * 0.15), 0, 7); c.fill(); } }
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
    const sky = new THREE.Mesh(new THREE.PlaneGeometry(900, 450), new THREE.MeshBasicMaterial({ map: t, fog: false })); sky.position.set(420, 140, 0); sky.rotation.y = -Math.PI / 2; sky.name = 'out_sky_day'; sky.userData.matKind = 'none'; sky.visible = false; outside.group.add(sky);
    const dm = new Map(); outside.group.traverse((o) => { if (!o.isMesh) return; const nm = o.name; const to = nm === 'out_hills' ? '#7fae8a' : nm === 'out_lawn' ? '#6fb35a' : nm === 'out_road' ? '#8a8d99' : nm === 'out_sidewalk' ? '#c8c6bd' : null; if (to) dm.set(o, { o: o.material.color.clone(), d: new THREE.Color(to) }); });
    return { sky, dm, nightSky: outside.group.getObjectByName('out_sky') }; })();
  const setDay = (on) => { if (dayK.on === on) return; dayK.on = on; dayK.sky.visible = on; dayK.nightSky.visible = !on; for (const [o, v] of dayK.dm) o.material.color.copy(on ? v.d : v.o); outside.group.traverse((o) => { if (o.name === 'halo') o.visible = !on; }); };
  const glassTex = (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 128; const c = cv.getContext('2d'); c.clearRect(0, 0, 128, 128);
    const g = c.createLinearGradient(0, 0, 128, 128); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.3, 'rgba(210,225,255,0.5)'); g.addColorStop(0.38, 'rgba(255,255,255,0)'); g.addColorStop(0.6, 'rgba(210,225,255,0.3)'); g.addColorStop(0.66, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(gl.w, gl.h), new THREE.MeshBasicMaterial({ map: glassTex, color: '#9fb4ff', transparent: true, opacity: 0.22, depthWrite: false })); glass.name = 'window_glass'; glass.userData.matKind = 'none'; glass.userData.grungeKind = 'none';
  // gọi mỗi khung từ update() của env. ctx = ngữ cảnh shot; LIGHTS = bảng ánh sáng (đêm/ngày); window = nhóm K.window (ảnh phẳng 'window_view' hiện khi ô tắt)
  const update = (ctx, { LIGHTS, window: win } = {}) => {
    setDay(!!(ctx && ctx.thoiTiet && ctx.light && !LIGHTS?.[ctx.light]?.night));
    const rw = globalThis.__autoFx?.realWindow !== false;
    wall.visible = !rw; holeWall.visible = rw; outside.group.visible = rw; glass.visible = rw;
    const v = win?.getObjectByName('window_view'); if (v) v.visible = !rw;
  };
  return { holeWall, outside, glass, setDay, update };
}
