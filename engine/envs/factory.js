// Bối cảnh 'factory' — nhà máy gấu bông cuối phố, ban đêm (ep002 shot 55–75, 85–106). Preset ánh sáng mặc định: night.
// Sửa bối cảnh này CHỈ trong file này. Được engine/envs.js gọi: build(g, e, H).
// NGOÀI + TRONG cùng một env: camera ngoài sân nhìn qua cửa kính lớn vào xưởng; camera trong xưởng nhìn ra kính.
// Gốc (0,0,0) = giữa xưởng; mặt nhìn chính về −Z (kệ gấu ở tường −Z); cửa kính ở tường +Z; sân ngoài ở z > 15.
//
// ĐIỂM CÓ TÊN (đơn vị stud, [x,y,z]; y = mặt đứng/mặt đặt). Cũng nằm ở e.diem và export FACTORY_DIEM:
//   trong_giua       [0,0,3]       giữa khoảng diễn trong xưởng (trống x −8..8, z −2..8 = 16×10)
//   bang_chuyen_dau  [-10,3,-6]    đầu băng chuyền (băng chạy +X, mặt băng y=3)
//   bang_chuyen_cuoi [0,3,-6]      cuối băng chuyền
//   cho_gom          [1.8,0,-6]    chỗ đứng gom đồ (tấm lót cao su), thùng gom ở [4.6,0,-6]
//   ke_gau           [-8.5,0,-14.5] kệ gấu dài x −22..5, sát tường −Z, 3 tầng kệ (mặt kệ y 3.2 / 7.8 / 12.4)
//   ban_do_tuong     [14,8.5,-15.9] tâm ô tường phẳng 4×3 (x 12..16, y 7..10) để treo bản đồ, mặt nhìn +Z
//   thung_dan        [19,0,-7]     cụm thùng các-tông lộn xộn "đồ dân mất"
//   thung_bach       [-17,0,6]     cụm thùng xếp ngay ngắn (hàng ông Bách)
//   ban_chuong       [10,3.2,-9]   mặt bàn nhỏ đặt chuông
//   cua_kinh_trong   [0,0,12.5]    đứng trong xưởng sát cửa kính (kính rộng x −8..8, y 2..13, ở z=14.5)
//   cua_kinh_ngoai   [0,0,17]      đứng ngoài sân trước cửa kính
//   thung_go_ngoai   [0,2.6,16.6]  MẶT TRÊN thùng gỗ ngoài (Gà đứng, mặt hướng −Z, mắt ngang kính)
//   hang_rao         [-1.2,0,34]   khe hở hàng rào cho gấu chui (rộng ~2,2); rào chữ U: z=34, x=±30
//   cua_kho          [17,0,16.5]   cửa kho trượt bằng tôn x 12..22 ngoài tường +Z; e.cuaKho = Group cửa (đổi position.x để mở)
//   san_ngoai        [0,0,24]      giữa sân (trống x −16..16, z 17..32)
export const LIGHT = 'night';   // khoá ánh sáng mặc định (envs.define(tên, m.LIGHT, m.default))
export const FACTORY_DIEM = {
  trong_giua: [0, 0, 3], bang_chuyen_dau: [-10, 3, -6], bang_chuyen_cuoi: [0, 3, -6], cho_gom: [1.8, 0, -6],
  ke_gau: [-8.5, 0, -14.5], ban_do_tuong: [14, 8.5, -15.9], thung_dan: [19, 0, -7], thung_bach: [-17, 0, 6], ban_chuong: [10, 3.2, -9],
  cua_kinh_trong: [0, 0, 12.5], cua_kinh_ngoai: [0, 0, 17], thung_go_ngoai: [0, 2.6, 16.6], hang_rao: [-1.2, 0, 34], cua_kho: [17, 0, 16.5], san_ngoai: [0, 0, 24],
};

export default function build(g, e, H) {
  const { ganTang, THREE, K, mat, plane, hash } = H;
  const R = e.room = new THREE.Group(); R.name = 'factory_room'; g.add(R);
  e.diem = FACTORY_DIEM;
  const grp = (name, tang) => { const o = new THREE.Group(); o.name = name; R.add(tang ? ganTang(o, tang) : o); return o; };

  // ---- công cụ: InstancedMesh từ danh sách {p, s, r, c} (1 draw call, tất định) ----
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _eu = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();
  const inst = (parent, name, geo, material, items, shadow = true) => {
    const im = new THREE.InstancedMesh(geo, material, items.length); im.name = name;
    items.forEach((it, i) => {
      _eu.set(it.r?.[0] || 0, it.r?.[1] || 0, it.r?.[2] || 0); _q.setFromEuler(_eu); _p.set(...it.p); _s.set(...(it.s || [1, 1, 1]));
      im.setMatrixAt(i, _m.compose(_p, _q, _s)); if (it.c) im.setColorAt(i, _c.set(it.c));
    });
    im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
    im.castShadow = shadow; im.receiveShadow = true; im.computeBoundingBox?.(); im.computeBoundingSphere?.(); parent.add(im); return im;
  };
  const BOX = new THREE.BoxGeometry(1, 1, 1), SPH = new THREE.SphereGeometry(1, 14, 10);
  const white = mat('#ffffff', { roughness: 0.85, emissive: new THREE.Color('#5c4630'), emissiveIntensity: 1 });   // nền tự sáng ấm nhẹ: đồ trong xưởng đọc được dưới hemi xanh đêm
  const glow = (c, i = 0.55) => mat(c, { emissive: new THREE.Color(c), emissiveIntensity: i });
  const gradTex = (draw) => { const cv = document.createElement('canvas'); cv.width = cv.height = 128; draw(cv.getContext('2d')); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t; };

  // ======================= VỎ NHÀ XƯỞNG (tầng sau) =======================
  const shell = grp('factory_shell', 'back');
  const brick = mat('#a4573f', { roughness: 0.95 });
  const wall = (w, h, d, x, y, z) => K.box(w, h, d, brick, x, y, z, 'wall_chimney_brick', shell);
  wall(50, 16, 1, 0, 8, -16.5);                                   // tường sau (−Z)
  wall(1, 16, 31, -24.5, 8, -1); wall(1, 16, 31, 24.5, 8, -1);    // hai tường bên
  wall(17, 16, 1, -16.5, 8, 14.5);                                // tường trước (+Z): trái kính
  wall(16, 2, 1, 0, 1, 14.5); wall(16, 3, 1, 0, 14.5, 14.5);      // bệ cửa kính (y 0–2) và dầm trên (y 13–16)
  wall(4, 16, 1, 10, 8, 14.5);                                    // mảng giữa kính và cửa kho
  wall(10, 6, 1, 17, 13, 14.5);                                   // dầm trên cửa kho (y 10–16)
  wall(3, 16, 1, 23.5, 8, 14.5);                                  // mép phải
  K.box(51, 0.8, 33, '#55556a', 0, 16.4, -1, 'roof_deck', shell);  // mái
  K.cyl(1.8, 2.1, 13, brick, -17, 22.3, -10, 'wall_chimney_brick', shell, 14);   // ống khói
  K.cyl(2.5, 2.5, 0.8, '#2c2c34', -17, 29, -10, 'chimney_cap', shell, 14);
  // lót tường trong (vữa kem, hơi tự sáng để xưởng đọc được)
  const lining = mat('#e8d8b4', { roughness: 0.9, emissive: new THREE.Color('#e8d8b4'), emissiveIntensity: 0.4 });
  const lin = (w, h, x, y, z, ry, nm) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), lining); m.position.set(x, y, z); m.rotation.y = ry; m.name = nm; m.receiveShadow = true; shell.add(m); };
  lin(48, 16, 0, 8, -15.99, 0, 'wall_back');
  lin(30, 16, -23.99, 8, -1, Math.PI / 2, 'wall_back_side'); lin(30, 16, 23.99, 8, -1, -Math.PI / 2, 'wall_back_side');
  // dầm mái (nhìn từ dưới)
  inst(shell, 'roof_beam', BOX, white, [-18, -9, 0, 9, 18].map((x) => ({ p: [x, 15.6, -1], s: [1, 0.9, 30], c: '#5b4030' })));
  // sàn xưởng + sân + nền xa
  const floor = plane(48, 30, mat('#9a9486', { roughness: 0.9, emissive: new THREE.Color('#9a9486'), emissiveIntensity: 0.18 }), 0.03, 'sidewalk_floor'); floor.position.set(0, 0.03, -1); R.add(floor);
  const yard = plane(90, 42, mat('#6a7384', { roughness: 0.95 }), 0.0, 'sidewalk_yard'); yard.position.set(0, 0, 36); R.add(yard);
  const far = plane(900, 900, mat('#1d2840', { roughness: 1 }), -0.12, 'dirt_far'); R.add(far);
  inst(R, 'roadpaint_stripe', new THREE.PlaneGeometry(1, 1), mat('#e0b020', { roughness: 0.8 }), [-3.4, -8.6].map((z) => ({ p: [-3, 0.06, z], s: [18, 0.35, 1], r: [-Math.PI / 2, 0, 0] })), false);

  // ======================= CỬA KÍNH + CỬA KHO (tầng giữa) =======================
  const facade = grp('factory_facade', 'mid');
  const glassTex = gradTex((c) => { const gr = c.createLinearGradient(0, 0, 128, 128); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.3, 'rgba(210,225,255,0.55)'); gr.addColorStop(0.38, 'rgba(255,255,255,0)'); gr.addColorStop(0.62, 'rgba(210,225,255,0.3)'); gr.addColorStop(0.68, 'rgba(255,255,255,0)'); c.fillStyle = gr; c.fillRect(0, 0, 128, 128); });
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(16, 11), new THREE.MeshBasicMaterial({ map: glassTex, color: '#bcd0ff', transparent: true, opacity: 0.35, depthWrite: false }));
  glass.name = 'window_front_glass'; glass.position.set(0, 7.5, 14.5); facade.add(glass);
  inst(facade, 'window_frame', BOX, white, [
    ...[-8, -2.7, 2.7, 8].map((x) => ({ p: [x, 7.5, 14.6], s: [0.4, 11.2, 0.5], c: '#2f3a44' })),
    ...[2, 9.9, 13].map((y) => ({ p: [0, y, 14.6], s: [16.4, 0.4, 0.5], c: '#2f3a44' })),
  ]);
  e.cuaKho = new THREE.Group(); e.cuaKho.name = 'cua_kho'; e.cuaKho.position.set(17, 0, 15.5); facade.add(e.cuaKho);
  K.box(10.4, 10, 0.3, '#78909c', 0, 5, 0, 'kho_box_rib_door', e.cuaKho);
  inst(e.cuaKho, 'kho_box_rib', BOX, white, Array.from({ length: 21 }, (_, i) => ({ p: [-4.9 + i * 0.49, 5, 0.22], s: [0.2, 9.8, 0.16], c: i % 2 ? '#6b8290' : '#8aa2b0' })));
  K.box(14, 0.45, 0.6, '#2c3238', 17, 10.5, 15.5, 'kho_rail', facade);
  K.box(0.5, 1.2, 0.3, '#2c3238', 17 - 4.2, 3, 15.8, 'kho_handle', e.cuaKho);
  // đèn tường hai bên kính (vàng)
  const wl = grp('factory_wall_lamps', 'mid');
  inst(wl, 'lamp', new THREE.CylinderGeometry(0.3, 1.0, 0.9, 12, 1, true), new THREE.MeshStandardMaterial({ color: '#33302c', emissive: new THREE.Color('#ffb54a'), emissiveIntensity: 0.9, side: THREE.DoubleSide }), [-10.6, 10.6].map((x) => ({ p: [x, 12.2, 15.8] })), false);
  inst(wl, 'lamp', SPH, new THREE.MeshBasicMaterial({ color: '#fff2c8' }), [-10.6, 10.6].map((x) => ({ p: [x, 11.8, 15.8], s: [0.4, 0.4, 0.4] })), false);
  inst(wl, 'lamp_arm', BOX, white, [-10.6, 10.6].map((x) => ({ p: [x, 12.7, 15.35], s: [0.25, 0.25, 1.0], c: '#2c3238' })));
  // vệt sáng hắt từ cửa kính ra sân + sương thấp
  const spillTex = gradTex((c) => { const gr = c.createRadialGradient(64, 0, 4, 64, 0, 124); gr.addColorStop(0, 'rgba(255,214,140,0.95)'); gr.addColorStop(0.45, 'rgba(255,200,120,0.4)'); gr.addColorStop(1, 'rgba(255,190,100,0)'); c.fillStyle = gr; c.fillRect(0, 0, 128, 128); });
  const addGlow = (tex, op) => new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  const spill = new THREE.Mesh(new THREE.PlaneGeometry(26, 20), addGlow(spillTex, 0.55)); spill.rotation.x = -Math.PI / 2; spill.position.set(0, 0.09, 25.2); spill.name = 'fx_spill'; R.add(spill);
  const mistTex = gradTex((c) => { const gr = c.createRadialGradient(64, 64, 4, 64, 64, 64); gr.addColorStop(0, 'rgba(170,190,230,0.55)'); gr.addColorStop(1, 'rgba(170,190,230,0)'); c.fillStyle = gr; c.fillRect(0, 0, 128, 128); });
  const mist = [[-14, 24, 30], [16, 30, 34]].map(([x, z, s], i) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(s, s * 0.6), new THREE.MeshBasicMaterial({ map: mistTex, transparent: true, opacity: 0.16, depthWrite: false, fog: false })); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.7 + i * 0.5, z); m.name = 'fx_mist'; R.add(m); return m; });

  // ======================= SÂN NGOÀI (tầng trước) =======================
  const yardF = grp('factory_yard', 'front');
  { // hàng rào gỗ chữ U, có khe cho gấu chui ở x −2,2…−0,2
    const items = [];
    for (let x = -30; x <= 30.01; x += 1.1) { if (x > -2.3 && x < -0.1) continue; const h = 5 + hash(Math.round(x * 3), 7) * 0.5; items.push({ p: [x, h / 2, 34], s: [0.8, h, 0.25], c: hash(Math.round(x * 3), 9) > 0.5 ? '#9b7d5a' : '#8a6c4b' }); }
    for (const sx of [-30, 30]) for (let z = 15.6; z <= 33.2; z += 1.1) { const h = 5 + hash(Math.round(z * 3), 11) * 0.5; items.push({ p: [sx, h / 2, z], s: [0.25, h, 0.8], c: '#8f7150' }); }
    for (const y of [1.4, 3.7]) { items.push({ p: [-31.2, y, 34], s: [0.3, 0.35, 0.4], c: '#7a5e3f' }); items.push({ p: [-15.15, y, 34.3], s: [29.7, 0.35, 0.25], c: '#6e5538' }); items.push({ p: [15.15, y, 34.3], s: [29.7, 0.35, 0.25], c: '#6e5538' });
      for (const sx of [-30.3, 30.3]) items.push({ p: [sx, y, 24.4], s: [0.25, 0.35, 18.4], c: '#6e5538' }); }
    inst(yardF, 'fence_picket', BOX, white, items);
  }
  { // thùng gỗ để đứng (+ 2 thùng phụ)
    const items = [];
    const crate = (cx, cz, s) => { items.push({ p: [cx, s * 0.5, cz], s: [s * 0.94, s, s * 0.94], c: '#b8864f' }, { p: [cx, s + 0.1, cz], s: [s * 1.04, 0.2, s * 1.04], c: '#8f6a3c' });
      for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) items.push({ p: [cx + dx * s * 0.48, s * 0.5, cz + dz * s * 0.48], s: [0.3, s, 0.3], c: '#7a5630' });
      items.push({ p: [cx, s * 0.5, cz + s * 0.48], s: [s * 0.94, 0.28, 0.12], c: '#8f6a3c' }, { p: [cx, s * 0.25, cz + s * 0.48], s: [s * 0.94, 0.28, 0.12], c: '#8f6a3c' }, { p: [cx, s * 0.75, cz + s * 0.48], s: [s * 0.94, 0.28, 0.12], c: '#8f6a3c' }); };
    crate(0, 16.6, 2.5); crate(-7.5, 17.6, 2.1); crate(-10, 17.2, 1.7);
    inst(yardF, 'crate_beam', BOX, white, items);
  }

  // ======================= TRONG XƯỞNG =======================
  // --- băng chuyền (tầng trước) ---
  const belt = grp('factory_conveyor', 'front');
  const beltTex = (() => { const t = gradTex((c) => { c.fillStyle = '#4a4f5a'; c.fillRect(0, 0, 128, 128); c.fillStyle = '#6a717e'; c.fillRect(0, 0, 14, 128); c.fillStyle = '#2a2d34'; c.fillRect(14, 0, 4, 128); });
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(10, 1); return t; })();
  const beltM = new THREE.Mesh(new THREE.PlaneGeometry(10, 2.1), new THREE.MeshStandardMaterial({ map: beltTex, roughness: 0.7, emissive: new THREE.Color('#2a2e36'), emissiveIntensity: 0.35 }));
  beltM.rotation.x = -Math.PI / 2; beltM.position.set(-5, 3.02, -6); beltM.name = 'conveyor_belt'; belt.add(beltM);
  const rollerGeo = new THREE.CylinderGeometry(0.28, 0.28, 2.8, 10); rollerGeo.rotateX(Math.PI / 2);
  inst(belt, 'roller_rod', rollerGeo, mat('#a8b2ba', { roughness: 0.4, metalness: 0.5 }), Array.from({ length: 20 }, (_, i) => ({ p: [-9.75 + i * 0.5, 2.7, -6] })));
  const frameItems = [];
  for (const z of [-7.5, -4.5]) frameItems.push({ p: [-5, 2.55, z], s: [10.6, 0.55, 0.4], c: '#3f6e8c' }, { p: [-5, 3.15, z], s: [10.6, 0.15, 0.5], c: '#d8a020' });
  for (const x of [-9.5, -5, -0.5]) for (const z of [-7.5, -4.5]) frameItems.push({ p: [x, 1.2, z], s: [0.4, 2.4, 0.4], c: '#2f3b45' });
  for (const x of [-9.5, -5, -0.5]) frameItems.push({ p: [x, 0.35, -6], s: [0.3, 0.3, 3.2], c: '#2f3b45' });
  inst(belt, 'conveyor_leg', BOX, white, frameItems);
  // chỗ đứng gom đồ (tấm lót) + thùng gom (tầng giữa)
  const gom = grp('factory_collect', 'mid');
  const pad = plane(4.2, 4, mat('#383b44', { roughness: 0.95 }), 0.05, 'rubber_mat_pad'); pad.position.set(2.2, 0.06, -6); gom.add(pad);
  { const items = [{ p: [4.9, 0.1, -6], s: [2.4, 0.2, 2.4], c: '#7a5a38' }];
    for (const [dx, dz, sx, sz] of [[-1.1, 0, 0.2, 2.4], [1.1, 0, 0.2, 2.4], [0, -1.1, 2.4, 0.2], [0, 1.1, 2.4, 0.2]]) items.push({ p: [4.9 + dx, 0.95, -6 + dz], s: [sx, 1.7, sz], c: '#9b7448' });
    inst(gom, 'crate_beam', BOX, white, items); }
  // --- kệ gấu (tầng sau) ---
  const shelf = grp('factory_shelf', 'back');
  const SY = [3.2, 7.8, 12.4], BX = Array.from({ length: 10 }, (_, k) => -20.5 + k * 2.7);
  { const items = SY.map((y) => ({ p: [-8.5, y - 0.2, -14.5], s: [27, 0.4, 3], c: '#a97c50' }));
    for (const x of [-22, -16.45, -8.35, -0.25, 5.2]) items.push({ p: [x, 6.7, -14.5], s: [0.4, 13.4, 3], c: '#8a6038' });
    for (let i = 0; i < 8; i++) items.push({ p: [-20.5 + i * 3.3, 1.35, -14.4], s: [2.6, 2.3, 2.5], c: i % 2 ? '#c89b5c' : '#b98a4c' });
    inst(shelf, 'shelf_unit', BOX, white, items); }
  { const sph = [], bow = [], BODY = ['#d9a066', '#b8804e', '#e8c99a'], BOW = ['#3f7fe0', '#e0453f', '#f2c230'];
    SY.forEach((y, lv) => BX.forEach((x, k) => {
      const c = BODY[Math.floor(hash(lv * 20 + k, 3) * 3) % 3], b = BOW[(k + lv) % 3], z = -14.2, j = (hash(lv * 20 + k, 5) - 0.5) * 0.25;
      sph.push({ p: [x, y + 1.15, z], s: [1, 1.15, 0.9], c }, { p: [x, y + 2.45, z + 0.1], s: [0.8, 0.8, 0.78], c },
        { p: [x - 0.6, y + 3.05, z], s: [0.28, 0.28, 0.2], c }, { p: [x + 0.6, y + 3.05, z], s: [0.28, 0.28, 0.2], c },
        { p: [x, y + 2.3, z + 0.78], s: [0.34, 0.26, 0.24], c: '#f3dfb8' },
        { p: [x - 0.3, y + 2.62, z + 0.72], s: [0.1, 0.1, 0.08], c: '#241a14' }, { p: [x + 0.3, y + 2.62, z + 0.72], s: [0.1, 0.1, 0.08], c: '#241a14' },
        { p: [x - 0.5, y + 0.15, z + 0.55], s: [0.34, 0.3, 0.5], c }, { p: [x + 0.5, y + 0.15, z + 0.55], s: [0.34, 0.3, 0.5], c });
      bow.push({ p: [x - 0.36, y + 1.8, z + 0.78], s: [0.55, 0.4, 0.16], r: [0, 0, 0.3 + j], c: b }, { p: [x + 0.36, y + 1.8, z + 0.78], s: [0.55, 0.4, 0.16], r: [0, 0, -0.3 - j], c: b }, { p: [x, y + 1.8, z + 0.82], s: [0.26, 0.26, 0.2], c: b });
    }));
    inst(shelf, 'bear_plush', SPH, white, sph); inst(shelf, 'ribbon_bow', BOX, white, bow); }

  // --- cụm thùng, bàn chuông (tầng giữa) ---
  const mid = grp('factory_midstuff', 'mid');
  { const items = [], TAN = ['#c89b5c', '#b98a4c', '#d2a76a', '#a97c44'];
    [[18, -5.6, 0.2], [20.4, -6.2, -0.15], [17.2, -8.4, 0.5], [19.6, -8.6, 0.1], [22, -8.2, -0.3], [18.8, -10.4, 0.35]].forEach(([x, z, ry], i) => items.push({ p: [x, 1.1, z], s: [2.5, 2.2, 2.3], r: [0, ry, 0], c: TAN[i % 4] }));
    [[18.6, -6.9, 0.3], [20.8, -8.2, -0.2]].forEach(([x, z, ry], i) => items.push({ p: [x, 3.3, z], s: [2.2, 2, 2.1], r: [0, ry, 0], c: TAN[(i + 2) % 4] }));
    items.push({ p: [15.8, 1.0, -4.2], s: [2.3, 2, 2.1], r: [0.05, 0.8, 1.35], c: '#b98a4c' });   // một thùng đổ nghiêng
    const OBJ = ['#e0453f', '#3f7fe0', '#f2c230', '#5fae7a', '#c06ad8', '#ff8a4c', '#e0453f', '#3f7fe0', '#f2c230', '#5fae7a'];   // đồ rơi ra: dép, mũ, hộp nhỏ…
    OBJ.forEach((c, i) => items.push({ p: [15 + hash(i, 21) * 4.4, 0.25, -2.2 - hash(i, 22) * 4.2], s: [0.9, 0.45, 0.4], r: [0, hash(i, 23) * 3.1, 0], c }));
    inst(mid, 'carton_pile', BOX, white, items); }
  { const items = [];   // cụm thùng ngay ngắn: 3 cột × 2 hàng × 2 tầng
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) for (let l = 0; l < 2; l++) items.push({ p: [-17 + (i - 1) * 2.75, 1.05 + l * 2.1, 6 + (j - 0.5) * 2.4], s: [2.65, 2.0, 2.3], c: l ? '#c89b5c' : '#b98a4c' });
    items.push({ p: [-17, 4.22, 6], s: [8.4, 0.08, 4.8], c: '#e8e2d4' });
    inst(mid, 'carton_neat', BOX, white, items); }
  { const items = [{ p: [10, 3.0, -9], s: [3.8, 0.4, 2.6], c: '#8a5a36' }];
    for (const [dx, dz] of [[-1.6, -1], [1.6, -1], [-1.6, 1], [1.6, 1]]) items.push({ p: [10 + dx, 1.4, -9 + dz], s: [0.35, 2.8, 0.35], c: '#6e4528' });
    inst(mid, 'table_leg', BOX, white, items); }
  // --- đèn treo chụp nón (tầng giữa) ---
  const lamps = grp('factory_hanging_lamps', 'mid');
  const LX = [-9, 0, 9];
  inst(lamps, 'lamp_cord', BOX, white, LX.map((x) => ({ p: [x, 14.3, 2], s: [0.12, 3.6, 0.12], c: '#222' })), false);
  inst(lamps, 'lamp', new THREE.CylinderGeometry(0.5, 2.2, 1.6, 16, 1, true), new THREE.MeshStandardMaterial({ color: '#3b3733', emissive: new THREE.Color('#ffb040'), emissiveIntensity: 0.75, side: THREE.DoubleSide }), LX.map((x) => ({ p: [x, 12.2, 2] })), false);
  inst(lamps, 'lamp', SPH, new THREE.MeshBasicMaterial({ color: '#fff3cc' }), LX.map((x) => ({ p: [x, 11.7, 2], s: [0.5, 0.5, 0.5] })), false);
  const poolTex = gradTex((c) => { const gr = c.createRadialGradient(64, 64, 2, 64, 64, 64); gr.addColorStop(0, 'rgba(255,205,120,0.8)'); gr.addColorStop(0.5, 'rgba(255,190,100,0.28)'); gr.addColorStop(1, 'rgba(255,180,90,0)'); c.fillStyle = gr; c.fillRect(0, 0, 128, 128); });
  inst(R, 'fx_pool', new THREE.PlaneGeometry(1, 1), addGlow(poolTex, 0.5), LX.map((x) => ({ p: [x, 0.08, 2], s: [20, 20, 1], r: [-Math.PI / 2, 0, 0] })), false);

  e.pointSpec = { color: '#ffd9a0', intensity: 14, distance: 80, decay: 1.2, pos: [0, 12, 3] };   // đèn điểm dùng chung (engine/envs.js 'interior_point'); không tạo PointLight riêng
  return {
    suSong: [],
    update(t) {
      beltTex.offset.x = -((t * 1.2) % 1);   // mặt băng trôi theo +X, hàm thuần của t
      mist.forEach((m, i) => { m.position.x = (i ? 16 : -14) + Math.sin(t * 0.15 + i * 2) * 3; });
    },
  };
}
