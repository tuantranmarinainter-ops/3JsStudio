// Bối cảnh 'e3-nha-may' — NHÀ MÁY GẤU BÔNG của tập 3 (3 khu liền một khối: factory-exterior / factory-interior / factory-storage).
// Sửa bối cảnh này CHỈ trong file này. Được episodes/<ep>/index.html nạp động khi shot ghi `env: "e3-nha-may"` → build(g, e, H).
// ĐÊM (mặc định, LIGHT = 'night'): ngoài xanh lam, trong hổ phách. NGÀY: shot ghi `light: 'day'` — cùng bố trí, nắng qua kính.
// Hướng: BẮC = −Z, ĐÔNG = +X, NAM = +Z. Gốc (0,0,0) = giữa sàn xưởng. 1 đơn vị = 1 stud, "G" = cao Gà ≈ 5,3.
//
//   sơ đồ nhìn từ trên (bắc ở trên):                 x: −46 ─ −30 ───────── 30 ─ 54
//     z −20 ┌───────────────────────────────┐          xưởng  : x −30..30, z −20..20, tường cao 18, mái răng cưa (3 gian) tới y 24
//           │ kệ gấu×2 (x −14..11)  bản đồ  │          kho    : x 30..54,  z −15..15, cao 16 (cửa kho 2 cánh ở tường x=30, rộng 12 cao 11,5)
//      kính │   băng chuyền z=−8 (x −21..3) │ ┌─kho───┐  sân    : tây x −46..−30, nam z 20..32 (rào thép + cổng 2 cánh ở nam)
//     tây   │  bàn máy may    két dưới băng │cửa│ thùng│  vỉa hè : z 32..38 (nam), x −52..−46 (tây); đường z 38..60
//     (x=−30)│                              │kho│ carton│ cửa kính tây : z −15..15, y 5..16 (6×3 ô); thùng gỗ kê ở x −35,2..−30,8
//     z  20 └───────────────────────────────┘ └───────┘
//                       cổng ▲ (x −20..−8, z=32)
//
// ĐIỂM CÓ TÊN (toạ độ env, [x,y,z]; y = mặt đứng/mặt đặt). Cũng nằm ở e.diem và export DIEM:
//   cong [-14,0,36]  trước cổng rào (vỉa hè phía nam)        rao_ngoai [-49,0,2]  ngoài rào tây, nhìn vào cửa kính
//   thung_ngoai [-33,2.0,2.5]  ĐỈNH thùng gỗ dưới kính (Gà đứng, mặt nhìn +X, mắt ≈ mép dưới kính)
//   ngoai_kinh [-33,0,-7.5]  đứng dưới đất cạnh cửa kính, phía tây
//   bang_tay [-23.2,0,-8]  đầu tây băng (Bắp)    bang_dong [4.8,0,-8]  đầu đông băng (Bách)
//   truoc_ke [-1.5,0,-15]  trước 2 kệ gấu         truoc_ban_do [21,0,-14.8]  trước bản đồ
//   xuong_giua [-2,0,6]  giữa xưởng               cua_kho_ngoai [25,0,0]  trong xưởng trước cửa kho
//   kho_giua [42,0,0]  giữa kho                   truoc_chong_thung [43,0,7.5]  trước chồng thùng carton
// Mở cửa kho: e.setDoor(k) (k 0 đóng … 1 mở ~100°); shot truyền ctx.cuaKho (mặc định 1 = mở). Cổng rào: e.setGate(k) / ctx.congRao (mặc định 0 = đóng).
// Đêm/ngày: theo ctx.light của shot ('night' | 'day'): đèn trong, lớp phát sáng, kính mái đổi theo — hàm thuần của (t, ctx).
export const LIGHT = 'night';
export const ASSETS = ['nhap/ket-sat-xam', 'nhap/may-khau'];
export const DIEM = {
  cong: [-14, 0, 36], rao_ngoai: [-49, 0, 2], thung_ngoai: [-33, 2.0, 2.5], ngoai_kinh: [-33, 0, -7.5],
  bang_tay: [-23.2, 0, -8], bang_dong: [4.8, 0, -8], truoc_ke: [-1.5, 0, -15], truoc_ban_do: [21, 0, -14.8],
  xuong_giua: [-2, 0, 6], cua_kho_ngoai: [25, 0, 0], kho_giua: [42, 0, 0], truoc_chong_thung: [43, 0, 7.5],
};
// slot đạo cụ (index.html gộp vào PROP_SLOTS); đồ nhỏ do hệ đạo cụ đặt. coSan = env đã dựng sẵn (két, thùng gỗ ngoài kính, chồng thùng, băng chuyền, kệ gấu).
export const PROP_SLOTS = {
  byName: {
    bang_dau_tay: [-20, 3.72, -8, 0], bang_dau_dong: [1.6, 3.72, -8, 0], duoi_bang: [-12.8, 0, -7.4, 0], thung_kho: [47, 8.8, 9.4, 0],
    ket_tiem_banh: [-9, 3.2, -8, 0], thung_go_ngoai: [-33, 2.0, 2.5, 0], chong_thung_kho: [47, 8.8, 9.4, 0],
  },
  coSan: ['ket_tiem_banh', 'thung_go_ngoai', 'chong_thung_kho', 'bang_chuyen', 'ke_gau', 'hang_rao', 'ban_do'],
  floor: [[-2, 0, 6, 0], [42, 0, 0, 0]], wall: [[21, 6, -19.4, 0]],
  camMax: 30,
};

const BRICK = '#8A3A2C', STEEL = '#1F4A4A', STEEL2 = '#2A5A5A', WOOD = '#7A5A38', CARTON = '#C9A06A';

export default function build(g, e, H) {
  const { ganTang, THREE, K, fit, hash, LIGHTS } = H;
  const R = e.room = new THREE.Group(); R.name = 'e3_nha_may_room'; g.add(R);
  e.diem = DIEM;
  const grp = (name, tang) => { const o = new THREE.Group(); o.name = name; R.add(ganTang(o, tang)); return o; };

  // ---------- công cụ ----------
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _eu = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();
  const inst = (parent, name, geo, material, items, shadow = false) => {   // InstancedMesh tất định: {p, s, r, c}
    const im = new THREE.InstancedMesh(geo, material, items.length); im.name = name;
    items.forEach((it, i) => {
      _eu.set(...(it.r || [0, 0, 0])); _q.setFromEuler(_eu); _p.set(...it.p); _s.set(...(it.s || [1, 1, 1]));
      im.setMatrixAt(i, _m.compose(_p, _q, _s)); if (it.c) im.setColorAt(i, _c.set(it.c));
    });
    im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
    im.castShadow = shadow; im.receiveShadow = false; im.frustumCulled = false; parent.add(im); return im;
  };
  const BOX = new THREE.BoxGeometry(1, 1, 1), SPH = new THREE.SphereGeometry(1, 8, 6), CYL = new THREE.CylinderGeometry(1, 1, 1, 12);
  const cvTex = (w, h, draw, rx = 1, ry = 1) => {
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = 4; return t;
  };
  const dn = [];   // [vật liệu, thuộc tính, giá trị đêm, giá trị ngày] — đổi theo ctx.light
  const reg = (m, prop, n, d) => { dn.push([m, prop, n, d]); return m; };
  const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, ...o });
  const noPatch = (root) => root.traverse((o) => { if (o.isMesh) { o.userData.matKind = 'none'; o.userData.grungeKind = 'none'; } });

  // ---------- vật liệu ----------
  // tường gạch: UV theo stud (texture lặp 8×8 stud) → mọi hộp gạch dùng chung 1 texture
  const brickTex = cvTex(256, 256, (c) => {
    c.fillStyle = '#4a2820'; c.fillRect(0, 0, 256, 256);
    for (let r = 0; r < 8; r++) for (let k = 0; k < 5; k++) {
      const x = k * 64 - (r % 2 ? 32 : 0), i = r * 5 + k, l = 0.9 + hash(i, 3) * 0.2;
      c.fillStyle = `rgb(${Math.round(138 * l)},${Math.round(58 * l)},${Math.round(44 * l)})`; c.fillRect(x + 2, r * 32 + 2, 60, 28);
      c.fillStyle = 'rgba(255,200,170,0.07)'; c.fillRect(x + 2, r * 32 + 2, 60, 5);
    }
  }, 1 / 8, 1 / 8);
  const extB = new THREE.MeshStandardMaterial({ map: brickTex, roughness: 0.95 });
  const intB = reg(new THREE.MeshStandardMaterial({ map: brickTex, roughness: 0.95, emissive: new THREE.Color('#ffb98a'), emissiveMap: brickTex, emissiveIntensity: 0.18 }), 'emissiveIntensity', 0.18, 0.06);
  const extW = std('#ffffff');
  const intW = reg(std('#ffffff', { emissive: new THREE.Color('#3a2a1c'), emissiveIntensity: 0.8 }), 'emissiveIntensity', 0.8, 0.3);
  const intS = reg(std('#ffffff', { emissive: new THREE.Color('#1a2a26'), emissiveIntensity: 0.7 }), 'emissiveIntensity', 0.7, 0.25);   // thép/đồ tối trong nhà: giữ màu xanh dầu
  const extS = std('#ffffff', { emissive: new THREE.Color('#0e3a3a'), emissiveIntensity: 0.55, roughness: 0.6 });                  // thép ngoài: hơi sáng để còn thấy xanh dầu dưới đêm
  const glow = (c, i = 0.9) => new THREE.MeshStandardMaterial({ color: '#2a2a30', emissive: new THREE.Color(c), emissiveIntensity: i, side: THREE.DoubleSide });
  const addMat = (tex, op) => new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  const radial = (stops) => cvTex(128, 128, (c) => { const gr = c.createRadialGradient(64, 64, 2, 64, 64, 64); stops.forEach(([o, col]) => gr.addColorStop(o, col)); c.fillStyle = gr; c.fillRect(0, 0, 128, 128); });

  // hộp gạch có lỗ: mặt hướng vào trong dùng vật liệu sáng ấm (intB), còn lại ngoài (extB). inward: '+x' '-x' '+z' '-z' 'x' (cả 2 mặt x)
  const brickBox = (parent, w, h, d, x, y, z, inward) => {
    const geo = new THREE.BoxGeometry(w, h, d), uv = geo.attributes.uv, dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
    for (let f = 0; f < 6; f++) for (let v = 0; v < 4; v++) { const i = f * 4 + v; uv.setXY(i, uv.getX(i) * dims[f][0] + x * 0.37, uv.getY(i) * dims[f][1] + y * 0.11); }
    const mats = [extB, extB, extB, extB, extB, extB], f = { '+x': [0], '-x': [1], '+z': [4], '-z': [5], x: [0, 1] }[inward] || [];
    f.forEach((i) => { mats[i] = intB; });
    const m = new THREE.Mesh(geo, mats); m.position.set(x, y, z); m.name = 'wall_brick'; parent.add(m); return m;
  };

  // ============================== VỎ NHÀ (tầng sau) ==============================
  const shell = grp('e3_shell', 'back');
  // -- nền: đất xa, sân bê tông, vỉa hè, đường ướt
  const flat = (w, d, mt, x, y, z, nm) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mt); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.name = nm; shell.add(m); return m; };
  flat(1200, 1200, std('#1c2230', { roughness: 1 }), 0, -0.2, 0, 'dirt_far');
  const yardTex = cvTex(256, 256, (c) => { c.fillStyle = '#6c6a70'; c.fillRect(0, 0, 256, 256); for (let i = 0; i < 400; i++) { c.fillStyle = `rgba(${hash(i, 1) > 0.5 ? 255 : 0},${hash(i, 1) > 0.5 ? 255 : 0},${hash(i, 1) > 0.5 ? 255 : 0},0.05)`; c.fillRect(hash(i, 2) * 256, hash(i, 3) * 256, 4, 4); } c.strokeStyle = '#4a484e'; c.lineWidth = 3; c.strokeRect(0, 0, 256, 256); }, 8, 8);
  flat(110, 52, std('#ffffff', { map: yardTex, roughness: 0.9 }), 8, 0.02, 4, 'yard_concrete');   // sân trong rào (x −47..63, z −22..30)
  const walkTex = cvTex(128, 64, (c) => { c.fillStyle = '#7C7A80'; c.fillRect(0, 0, 128, 64); c.strokeStyle = '#5a585e'; c.lineWidth = 3; c.strokeRect(0, 0, 128, 64); }, 1, 1);
  const walkS = flat(124, 6, std('#ffffff', { map: walkTex, roughness: 0.85 }), 5, 0.06, 35, 'sidewalk'); walkS.material.map = walkTex.clone(); walkS.material.map.repeat.set(26, 1); walkS.material.map.needsUpdate = true;
  const walkW = flat(6, 70, std('#ffffff', { map: walkTex.clone(), roughness: 0.85 }), -49, 0.06, 0, 'sidewalk'); walkW.material.map.repeat.set(1, 20);
  const road = flat(300, 24, std('#252a38', { roughness: 0.28, metalness: 0.15 }), 0, 0.03, 50, 'road_wet');
  inst(shell, 'road_curb', BOX, extW, [{ p: [5, 0.25, 38.2], s: [124, 0.5, 0.5], c: '#8a8890' }, { p: [-52.2, 0.25, 0], s: [0.5, 0.5, 70], c: '#8a8890' }]);
  inst(shell, 'road_paint', BOX, std('#d8b02a', { roughness: 0.7 }), Array.from({ length: 18 }, (_, i) => ({ p: [-60 + i * 9, 0.07, 50], s: [4.5, 0.05, 0.5] })));

  // -- sàn trong
  const concrete = (w, d, rx, ry, base) => cvTex(256, 256, (c) => { c.fillStyle = base; c.fillRect(0, 0, 256, 256); for (let i = 0; i < 500; i++) { const l = hash(i, 4); c.fillStyle = l > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)'; c.fillRect(hash(i, 5) * 256, hash(i, 6) * 256, 5, 5); } c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = 3; c.strokeRect(0, 0, 256, 256); }, rx, ry);
  const floorMat = (tex) => reg(new THREE.MeshStandardMaterial({ map: tex, roughness: 0.42, emissive: new THREE.Color('#e0b080'), emissiveMap: tex, emissiveIntensity: 0.3 }), 'emissiveIntensity', 0.3, 0.12);
  flat(59, 39, floorMat(concrete(0, 0, 6, 4, '#6E6B66')), 0, 0.04, 0, 'floor_concrete');
  flat(24, 30, floorMat(concrete(0, 0, 3, 3, '#8C8A86')), 42, 0.04, 0, 'floor_storage');
  const hazTex = cvTex(128, 128, (c) => { c.fillStyle = '#26262a'; c.fillRect(0, 0, 128, 128); c.fillStyle = '#C9A030'; for (let i = -4; i < 8; i++) { c.beginPath(); c.moveTo(i * 32, 0); c.lineTo(i * 32 + 16, 0); c.lineTo(i * 32 + 16 + 128, 128); c.lineTo(i * 32 + 128, 128); c.fill(); } }, 1, 6);
  flat(2.4, 14, new THREE.MeshStandardMaterial({ map: hazTex, roughness: 0.6, emissive: new THREE.Color('#ffffff'), emissiveMap: hazTex, emissiveIntensity: 0.25 }), 27.6, 0.07, 0, 'floor_hazard_stripe');

  // -- tường (dày 1)
  brickBox(shell, 1, 5.0, 40, -30, 2.5, 0, '+x'); brickBox(shell, 1, 2, 40, -30, 17, 0, '+x');   // tây: bệ dưới + dầm trên (kính ở giữa, y 5..16)
  brickBox(shell, 1, 11, 5, -30, 10.5, -17.5, '+x'); brickBox(shell, 1, 11, 5, -30, 10.5, 17.5, '+x');
  brickBox(shell, 60, 18, 1, 0, 9, -20, '+z');   // bắc
  brickBox(shell, 60, 18, 1, 0, 9, 20, '-z');    // nam
  brickBox(shell, 1, 18, 14, 30, 9, -13, 'x'); brickBox(shell, 1, 18, 14, 30, 9, 13, 'x'); brickBox(shell, 1, 6.5, 12, 30, 14.75, 0, 'x');   // đông xưởng = tường kho, trừ cửa kho (z −6..6, y 0..11,5)
  brickBox(shell, 24.5, 16, 1, 42.25, 8, -15, '+z'); brickBox(shell, 24.5, 16, 1, 42.25, 8, 15, '-z'); brickBox(shell, 1, 16, 31, 54, 8, 0, '-x');   // kho
  // mái kho phẳng + mái xưởng răng cưa: 3 gian, dốc cao ở tây (y 24) thấp ở đông (y 18), mặt kính đứng quay TÂY
  const roofDark = std('#4b505c', { roughness: 0.9 });
  const roofMats = [roofDark, roofDark, roofDark, intW, roofDark, roofDark];
  { const m = new THREE.Mesh(new THREE.BoxGeometry(24.5, 0.6, 31.5), roofMats); m.position.set(42.25, 16.3, 0); m.name = 'roof_storage'; shell.add(m); }
  const tilt = Math.atan2(6, 20), slopeLen = Math.hypot(20, 6);
  [0, 1, 2].forEach((b) => {
    const x0 = -30 + b * 20, x1 = x0 + 20;
    const m = new THREE.Mesh(new THREE.BoxGeometry(slopeLen + 0.4, 0.5, 41), roofMats); m.position.set((x0 + x1) / 2, 21, 0); m.rotation.z = -tilt; m.name = 'roof_slope'; shell.add(m);
    const sh = new THREE.Shape(); sh.moveTo(x0, 18); sh.lineTo(x0, 24); sh.lineTo(x1, 18); sh.closePath();   // đầu hồi gạch bắc/nam
    for (const z of [-20, 20]) { const gm = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 1, bevelEnabled: false }), [extB, extB]); gm.position.z = z - 0.5; gm.name = 'gable_brick'; shell.add(gm); }
  });
  // tường lót phía trong cho ống khói + ống khói gạch (đông bắc, sau kho)
  { const ch = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 3.4, 44, 4, 1), std(BRICK, { roughness: 0.95 })); ch.rotation.y = Math.PI / 4; ch.position.set(44, 22, -24); ch.name = 'chimney_brick'; shell.add(ch);
    inst(shell, 'chimney_band', BOX, extW, [{ p: [44, 42, -24], s: [5.6, 1.1, 5.6], c: '#4a2820' }, { p: [44, 40.6, -24], s: [5.2, 0.5, 5.2], c: '#2a1a16' }]); }

  // -- kèo thép + cột trong (xanh dầu): cột góc/cột giữa, dầm ngang, giằng X
  const steelBox = [];
  const sb = (w, h, d, x, y, z, r, c = STEEL) => steelBox.push({ p: [x, y, z], s: [w, h, d], r: r || [0, 0, 0], c });
  for (const x of [-30, -15.5, -1.5, 11.5, 28]) sb(1.3, 18, 1.2, x, 9, -19.2);   // cột trong tường bắc: né 2 kệ gấu (x −14..11) và bản đồ (x 15..27)
  for (let x = -30; x <= 30; x += 10) sb(1.3, 18, 1.2, x, 9, 19.2);   // cột trong tường bắc/nam
  for (const z of [-15, 15]) sb(1.2, 18, 1.3, -29, 9, z);                                          // cột tây (chỉ 2 góc: không chắn cửa kính)
  for (let z = -15; z <= 15; z += 10) sb(1.2, 18, 1.3, 29, 9, z);                                        // cột đông
  for (const z of [-19.2, 19.2]) sb(60, 1.2, 1.0, 0, 16.8, z);                                           // dầm trên tường bắc/nam
  sb(1.0, 1.2, 40, -29.1, 16.8, 0);
  for (let x = -30; x <= 30; x += 10) sb(1.0, 1.2, 40, x, 17.4, 0, null);                                 // xà ngang dọc nhà (nhìn từ dưới)
  for (const z of [-10, 0, 10]) sb(60, 0.8, 0.8, 0, 17.0, z);
  for (let x = -25; x <= 25; x += 10) for (const s of [-1, 1]) sb(0.5, 0.5, 15, x, 16.2, s * 7.5, [Math.atan2(1.6, 15) * s, 0, 0], STEEL2);   // giằng chéo trên kèo
  // khung cửa kho
  sb(1.6, 11.9, 0.9, 30, 5.95, -6.45); sb(1.6, 11.9, 0.9, 30, 5.95, 6.45); sb(1.6, 0.9, 13.8, 30, 11.95, 0);
  // giằng X tường đông kho (photo 4) + cột + dầm kho
  for (const z of [-15, 15]) { sb(1.0, 16, 1.0, 54 - 0.8, 8, z - Math.sign(z) * 0.5); }
  sb(1.0, 1.0, 30, 53.2, 15.4, 0);
  for (const s of [-1, 1]) sb(0.45, 0.45, 20, 53.4, 8, 8.5, [s * 0.9, 0, 0], STEEL2), sb(0.45, 0.45, 20, 53.4, 8, -8.5, [s * 0.9, 0, 0], STEEL2);
  for (const x of [34, 42, 50]) sb(1.0, 1.0, 30, x, 15.4, 0);
  inst(shell, 'steel_frame_in', BOX, intS, steelBox);
  // -- khung thép NGOÀI: cột vuông có đinh tán (tường nam, khung kính tây, tường kho), dầm
  const outFrame = [], rivets = [];
  const oc = (x, y, z, w, h, d) => { outFrame.push({ p: [x, y, z], s: [w, h, d], c: STEEL }); };
  for (let x = -30; x <= 30; x += 10) { oc(x, 9, 20.9, 1.6, 18, 0.9); for (let y = 1; y < 18; y += 2) rivets.push({ p: [x - 0.5, y, 21.4], s: [0.2, 0.2, 0.2] }, { p: [x + 0.5, y, 21.4], s: [0.2, 0.2, 0.2] }); }
  oc(0, 18, 20.9, 62, 1.2, 0.9); oc(0, 0.9, 20.9, 62, 1.4, 0.9);
  for (const z of [-15.3, 15.3]) { oc(-30.9, 9, z, 0.9, 18, 1.6); for (let y = 1; y < 18; y += 2) rivets.push({ p: [-31.4, y, z - 0.5], s: [0.2, 0.2, 0.2] }, { p: [-31.4, y, z + 0.5], s: [0.2, 0.2, 0.2] }); }
  oc(-30.9, 16.4, 0, 0.9, 1.0, 31.2); oc(-30.9, 4.6, 0, 0.9, 0.8, 31.2);          // dầm trên + bậu dưới cửa kính tây
  for (const z of [-20, 20]) oc(-30.9, 17.2, z * 0.5, 0.9, 1.0, 20);
  for (let z = -15; z <= 15; z += 15) { oc(54.9, 8, z, 0.9, 16, 1.6); for (let y = 1; y < 16; y += 2) rivets.push({ p: [55.4, y, z - 0.5], s: [0.2, 0.2, 0.2] }, { p: [55.4, y, z + 0.5], s: [0.2, 0.2, 0.2] }); }
  for (let x = 32; x <= 54; x += 11) { oc(x, 8, 15.9, 1.6, 16, 0.9); oc(x, 8, -15.9, 1.6, 16, 0.9); }
  oc(42, 16.2, 15.9, 24, 1.0, 0.9); oc(42, 16.2, -15.9, 24, 1.0, 0.9);
  for (let x = -30; x <= 30; x += 10) oc(x, 9, -20.9, 1.6, 18, 0.9);
  inst(shell, 'steel_frame_out', BOX, extS, outFrame);
  inst(shell, 'steel_rivet', SPH, std('#12302f', { roughness: 0.5, metalness: 0.4 }), rivets);

  // ============================== CỬA KÍNH TÂY + KÍNH MÁI (tầng giữa) ==============================
  const facade = grp('e3_facade', 'mid');
  const winGlass = new THREE.MeshBasicMaterial({ color: '#bcd4ff', transparent: true, opacity: 0.14, depthWrite: false, side: THREE.DoubleSide });
  { const m = new THREE.Mesh(new THREE.PlaneGeometry(31, 11), winGlass); m.rotation.y = -Math.PI / 2; m.position.set(-30.1, 10.5, 0); m.name = 'window_glass_west'; facade.add(m); }
  { const items = [];
    for (let k = 0; k <= 6; k++) items.push({ p: [-30.45, 10.5, -15 + k * 5], s: [0.45, 11, k % 6 === 0 ? 0.9 : 0.35], c: STEEL });
    for (let k = 0; k <= 3; k++) items.push({ p: [-30.45, k === 0 ? 4.75 : 5 + k * 11 / 3, 0], s: [0.45, k === 0 ? 0.5 : k === 3 ? 0.7 : 0.35, 30], c: STEEL });   // thanh dưới nằm DƯỚI mép kính (không chắn mắt Gà)
    inst(facade, 'window_frame_west', BOX, extW, items); }
  // kính mái răng cưa: mặt đứng quay tây (3 gian), lưới ô vuông thép; đêm = sáng hổ phách (đèn trong), ngày = xanh nhạt
  const skyGlass = new THREE.MeshBasicMaterial({ color: '#ffb55a', transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide, fog: false });
  { const items = [];
    [0, 1, 2].forEach((b) => {
      const x0 = -30 + b * 20, m = new THREE.Mesh(new THREE.PlaneGeometry(40, 6), skyGlass); m.rotation.y = -Math.PI / 2; m.position.set(x0 + 0.05, 21, 0); m.name = 'skylight_glass'; facade.add(m);
      for (let k = 0; k <= 8; k++) items.push({ p: [x0 - 0.1, 21, -20 + k * 5], s: [0.35, 6.1, 0.35], c: STEEL });
      for (let k = 0; k <= 3; k++) items.push({ p: [x0 - 0.1, 18 + k * 2, 0], s: [0.35, 0.35, 40.3], c: STEEL });
    });
    inst(facade, 'skylight_frame', BOX, extW, items); }

  // ============================== ĐÈN (tầng giữa) ==============================
  const lamps = grp('e3_lamps', 'mid');
  const LAMP = [[-14, 12.4, -6], [0, 12.4, -6], [14, 12.4, -6], [-12, 12.4, 10], [38, 11, 0], [48, 11, 0]];
  const shadeMat = reg(glow('#ffb347', 0.95), 'emissiveIntensity', 0.95, 0.6);
  inst(lamps, 'lamp_cord', BOX, extW, LAMP.map(([x, y, z]) => ({ p: [x, (y + 17.2) / 2 + 0.8, z], s: [0.14, 17.2 - y - 1.2, 0.14], c: '#16181c' })));
  inst(lamps, 'lamp_shade', new THREE.CylinderGeometry(0.6, 2.4, 1.7, 18, 1, true), shadeMat, LAMP.map(([x, y, z]) => ({ p: [x, y, z] })));
  inst(lamps, 'lamp_bulb', SPH, new THREE.MeshBasicMaterial({ color: '#fff0c8' }), LAMP.map(([x, y, z]) => ({ p: [x, y - 0.5, z], s: [0.55, 0.55, 0.55] })));
  const poolMat = reg(addMat(radial([[0, 'rgba(255,205,120,0.85)'], [0.5, 'rgba(255,190,100,0.3)'], [1, 'rgba(255,180,90,0)']]), 'opacity', 0.55, 0.12), 'opacity', 0.55, 0.12);
  inst(lamps, 'fx_pool', new THREE.PlaneGeometry(1, 1), poolMat, LAMP.map(([x, , z], i) => ({ p: [x, 0.1 + i * 0.002, z + 1], s: i > 3 ? [16, 16, 1] : [24, 24, 1], r: [-Math.PI / 2, 0, 0] })));

  // ============================== NGOÀI: sân, hàng rào, cổng, cột đèn, đèn tường (tầng trước) ==============================
  const yardF = grp('e3_yard', 'front');
  const fenceItems = [], tipItems = [], meshSegs = [], FSTEEL = '#1A3C3C';
  const run = (x0, z0, x1, z1, gap) => {
    const len = Math.hypot(x1 - x0, z1 - z0), n = Math.round(len / 1.3);
    for (let i = 0; i <= n; i++) { const k = i / n, x = x0 + (x1 - x0) * k, z = z0 + (z1 - z0) * k; if (gap && x > gap[0] && x < gap[1] && Math.abs(z - gap[2]) < 0.1) continue;
      fenceItems.push({ p: [x, 3.4, z], s: [0.32, 6.8, 0.32], c: FSTEEL }); tipItems.push({ p: [x, 7.25, z], s: [0.5, 0.9, 0.5] }); }
    const segs = gap ? [[x0, gap[0]], [gap[1], x1]] : [[x0, x1]];
    if (gap) segs.forEach(([a, b]) => meshSegs.push([a, z0, b, z0])); else meshSegs.push([x0, z0, x1, z1]);   // đoạn rào để căng lưới mắt cáo (fence_mesh)
    if (gap) for (const [a, b] of segs) for (const y of [1.2, 5.6]) fenceItems.push({ p: [(a + b) / 2, y, z0], s: [b - a, 0.3, 0.3], c: FSTEEL });
    else for (const y of [1.2, 5.6]) fenceItems.push({ p: [(x0 + x1) / 2, y, (z0 + z1) / 2], s: [Math.abs(x1 - x0) || 0.3, 0.3, Math.abs(z1 - z0) || 0.3], c: FSTEEL });
  };
  run(-46, 32, 62, 32, [-20.5, -7.5, 32]); run(-46, -26, -46, 32); run(62, -26, 62, 32);
  { const post = [[-46, 32], [-46, -26], [62, 32], [62, -26], [-20.5, 32], [-7.5, 32], [-46, 6], [-46, -10], [-20, 32 - 0], [30, 32], [10, 32]];
    post.forEach(([x, z]) => { fenceItems.push({ p: [x, 4.2, z], s: [1.0, 8.4, 1.0], c: x === -20.5 || x === -7.5 ? '#4a4a54' : STEEL }); fenceItems.push({ p: [x, 8.55, z], s: [1.3, 0.3, 1.3], c: '#16302f' }); }); }
  inst(yardF, 'fence_picket', BOX, extS, fenceItems);
  inst(yardF, 'fence_spear', new THREE.ConeGeometry(0.5, 1, 4), std(FSTEEL, { roughness: 0.6, metalness: 0.3 }), tipItems);
  // LƯỚI THÉP MẮT CÁO căng giữa các cọc (ảnh kịch bản S049/S050): mặt phẳng mỏng, vân kim cương trên nền trong suốt (alphaTest) — rào vẫn nhìn xuyên được
  const meshTex = cvTex(32, 32, (c, w, h) => { c.clearRect(0, 0, w, h); c.strokeStyle = '#9fb4bc'; c.lineWidth = 2.6; c.beginPath(); c.moveTo(-2, -2); c.lineTo(w + 2, h + 2); c.moveTo(-2, h + 2); c.lineTo(w + 2, -2); c.stroke(); });
  const meshMat = new THREE.MeshStandardMaterial({ map: meshTex, transparent: false, alphaTest: 0.35, side: THREE.DoubleSide, roughness: 0.55, metalness: 0.3, color: '#ffffff', emissive: new THREE.Color('#1b4a4a'), emissiveMap: meshTex, emissiveIntensity: 0.9 });
  const meshPlane = (parent, len, hgt, x, y, z, ry, name) => { const mt = meshMat.clone(); mt.map = meshTex.clone(); mt.map.needsUpdate = true; mt.map.repeat.set(len / 1.1, hgt / 1.1); mt.emissiveMap = mt.map;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(len, hgt), mt); m.position.set(x, y, z); m.rotation.y = ry; m.name = name; m.userData.matKind = 'none'; m.userData.grungeKind = 'none'; parent.add(m); return m; };
  meshSegs.forEach(([xa, za, xb, zb]) => { const len = Math.hypot(xb - xa, zb - za); if (len < 0.5) return; meshPlane(yardF, len, 4.4, (xa + xb) / 2, 3.4, (za + zb) / 2, Math.abs(xb - xa) > 0.01 ? 0 : Math.PI / 2, 'fence_mesh'); });
  // cổng 2 cánh (khung + thanh đứng lưới #1A3C3C + giằng X), bản lề ở hai trụ, mở vào trong (−Z)
  const gateGroups = [-1, 1].map((s) => {
    const G = new THREE.Group(); G.name = 'gate_leaf'; G.position.set(s < 0 ? -19.9 : -8.1, 0, 32); yardF.add(G);
    const sg = s < 0 ? 1 : -1, items = [];
    items.push({ p: [sg * 3, 0.9, 0], s: [6, 0.4, 0.4], c: FSTEEL }, { p: [sg * 3, 6.0, 0], s: [6, 0.4, 0.4], c: FSTEEL }, { p: [sg * 0.2, 3.5, 0], s: [0.4, 6.4, 0.4], c: FSTEEL }, { p: [sg * 5.8, 3.5, 0], s: [0.4, 6.4, 0.4], c: FSTEEL });
    for (let i = 1; i < 8; i++) items.push({ p: [sg * (0.2 + i * 0.7), 3.6, 0], s: [0.22, 6.4, 0.22], c: FSTEEL });
    const ang = Math.atan2(5.1, 5.4), ln = Math.hypot(5.4, 5.1);
    items.push({ p: [sg * 3, 3.5, 0.05], s: [ln, 0.35, 0.3], r: [0, 0, sg * ang], c: STEEL2 }, { p: [sg * 3, 3.5, 0.05], s: [ln, 0.35, 0.3], r: [0, 0, -sg * ang], c: STEEL2 });
    inst(G, 'gate_bars', BOX, extS, items); meshPlane(G, 5.6, 4.6, sg * 3, 3.5, -0.02, 0, 'fence_mesh_gate'); return G;
  });
  let doorK = -1, gateK = -1;
  const setGate = (k) => { k = Math.max(0, Math.min(1, k)); if (k === gateK) return; gateK = k; gateGroups[0].rotation.y = k * 1.5; gateGroups[1].rotation.y = -k * 1.5; };
  e.setGate = setGate; setGate(0);
  // cột đèn đường (trụ đá + đèn lồng hổ phách) hai bên cổng, đèn tường cong ở tường nam / tây
  const streetLamps = [[-21.5, 33.6], [-6.5, 33.6]];
  inst(yardF, 'lamp_post', BOX, extS, streetLamps.flatMap(([x, z]) => [{ p: [x, 1.6, z], s: [2.2, 3.2, 2.2], c: '#3a3a44' }, { p: [x, 8.5, z], s: [0.5, 11, 0.5], c: '#14282a' }, { p: [x, 3.4, z], s: [2.6, 0.5, 2.6], c: '#555560' }]));
  const lanternMat = reg(glow('#ffb347', 1.1), 'emissiveIntensity', 1.1, 0.5);
  inst(yardF, 'lamp_lantern', new THREE.CylinderGeometry(0.9, 0.65, 1.8, 6), lanternMat, streetLamps.map(([x, z]) => ({ p: [x, 14.3, z] })));
  inst(yardF, 'lamp_cap', new THREE.ConeGeometry(1.2, 0.9, 6), std('#14282a'), streetLamps.map(([x, z]) => ({ p: [x, 15.6, z] })));
  { const WL = [{ x: -5, z: 21.7, ry: 0 }, { x: 14, z: 21.7, ry: 0 }, { x: -31.7, z: -19, ry: -Math.PI / 2 }, { x: -31.7, z: 19, ry: -Math.PI / 2 }];
    WL.forEach((w, i) => {
      const o = new THREE.Group(); o.name = 'lamp_wall_' + i; o.position.set(w.x, 11.5, w.z); o.rotation.y = w.ry; yardF.add(o);
      K.box(0.3, 0.3, 1.9, '#14282a', 0, 0.9, 0.9, 'lamp_arm', o); const sh = new THREE.Mesh(new THREE.ConeGeometry(1.0, 0.9, 12, 1, true), lanternMat); sh.position.set(0, 0.2, 1.9); sh.rotation.x = Math.PI; sh.name = 'lamp_shade'; o.add(sh);
      const bu = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), new THREE.MeshBasicMaterial({ color: '#fff0c8' })); bu.position.set(0, 0.0, 1.9); o.add(bu);
    }); }
  // vệt sáng hắt từ cửa kính ra sân tây (đêm) + sương thấp
  const spillMat = reg(addMat(radial([[0, 'rgba(255,214,140,0.9)'], [0.5, 'rgba(255,200,120,0.35)'], [1, 'rgba(255,190,100,0)']]), 'opacity', 0.55, 0.0), 'opacity', 0.55, 0.0);
  { const sp = new THREE.Mesh(new THREE.PlaneGeometry(26, 40), spillMat); sp.rotation.x = -Math.PI / 2; sp.position.set(-38, 0.1, 0); sp.name = 'fx_spill'; yardF.add(sp); }

  // ---- thùng gỗ ngoài (Gà đứng lên) + chồng thùng gỗ trong kho ----
  const woodTex = cvTex(128, 128, (c) => {
    c.fillStyle = '#6a4c2c'; c.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 4; i++) { c.fillStyle = `rgb(${122 + (hash(i, 7) - 0.5) * 24},${90 + (hash(i, 8) - 0.5) * 20},${56})`; c.fillRect(6, 6 + i * 29, 116, 26); }
    c.strokeStyle = '#4a3220'; c.lineWidth = 7; c.strokeRect(3, 3, 122, 122);
    c.fillStyle = '#8a6a44'; c.beginPath(); c.moveTo(8, 8); c.lineTo(22, 8); c.lineTo(120, 120); c.lineTo(106, 120); c.fill();
    c.strokeStyle = '#4a3220'; c.lineWidth = 3; c.stroke();
  });
  const woodMat = new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.9 });
  const woodInt = reg(new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.9, emissive: new THREE.Color('#ffc890'), emissiveMap: woodTex, emissiveIntensity: 0.4 }), 'emissiveIntensity', 0.4, 0.15);
  inst(yardF, 'crate_wood_out', BOX, woodMat, [{ p: [-33, 1.0, 2.5], s: [4.4, 2.0, 6.2] }, { p: [-38.5, 1.1, 8], s: [2.2, 2.2, 2.2], r: [0, 0.3, 0] }, { p: [-37, 0.9, -8.5], s: [1.8, 1.8, 1.8], r: [0, -0.2, 0] }], true);

  // ============================== TRONG XƯỞNG (tầng giữa/trước) ==============================
  const mid = grp('e3_interior', 'mid'), front = grp('e3_interior_front', 'front');
  // -- băng chuyền: x −21..3, z −8 (rộng 3,6), mặt băng y 3,7; mặt băng trôi tây→đông bằng offset UV = hàm thuần của t
  const beltTex = cvTex(64, 64, (c) => { c.fillStyle = '#26262a'; c.fillRect(0, 0, 64, 64); c.fillStyle = '#3b3b42'; c.fillRect(0, 0, 6, 64); c.fillStyle = '#17171a'; c.fillRect(6, 0, 3, 64); }, 20, 1);
  const beltM = new THREE.Mesh(new THREE.PlaneGeometry(24, 3.0), reg(new THREE.MeshStandardMaterial({ map: beltTex, roughness: 0.55, emissive: new THREE.Color('#ffffff'), emissiveMap: beltTex, emissiveIntensity: 0.3 }), 'emissiveIntensity', 0.3, 0.12));
  beltM.rotation.x = -Math.PI / 2; beltM.position.set(-9, 3.72, -8); beltM.name = 'conveyor_belt'; front.add(beltM);
  { const items = [];
    items.push({ p: [-9, 3.5, -8], s: [24, 0.35, 3.0], c: '#202024' });                           // thân dưới mặt băng
    for (const z of [-9.8, -6.2]) items.push({ p: [-9, 3.4, z], s: [24.6, 0.9, 0.4], c: '#2A2A30' }, { p: [-9, 3.88, z], s: [24.6, 0.12, 0.55], c: '#6a6a72' });   // thành băng
    for (const x of [-21, -15, -9, -3, 3]) for (const z of [-9.8, -6.2]) items.push({ p: [x, 1.6, z], s: [0.5, 3.0, 0.5], c: '#2A2A30' });
    for (const x of [-21, -9, 3]) items.push({ p: [x, 0.6, -8], s: [0.4, 0.4, 3.8], c: '#2A2A30' });
    for (const x of [-18, -12, -6, 0]) items.push({ p: [x, 2.4, -8], s: [0.35, 0.35, 3.6], c: '#2A2A30' });
    inst(front, 'conveyor_frame', BOX, intS, items); }
  { const rl = [];   // con lăn ở hai đầu + núm tròn dọc thành băng
    for (const x of [-21, 3]) rl.push({ p: [x, 3.55, -8], s: [0.55, 3.2, 0.55], r: [Math.PI / 2, 0, 0], c: '#8A8A90' });
    inst(front, 'conveyor_roller', CYL, intW, rl);
    const kn = []; for (let x = -19.5; x <= 2; x += 3) for (const z of [-10.02, -5.98]) kn.push({ p: [x, 3.4, z], s: [0.5, 0.18, 0.5], r: [Math.PI / 2, 0, 0], c: '#8A8A90' });
    inst(front, 'conveyor_stud', CYL, intW, kn); }
  // -- KÉT xám chì to dưới băng (GLB nhap/ket-sat-xam, mặt cửa quay +Z); thiếu model → hộp
  { const ket = fit('nhap/ket-sat-xam', 3.1);
    if (ket) { ket.position.set(-9, 0, -8); ket.name = 'ket_tiem_banh'; ket.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); front.add(ket); e.ket = ket; }
    else K.box(4, 3.1, 3.2, '#7A7A82', -9, 1.55, -8, 'ket_tiem_banh', front);
    // DẤU Ổ BÁNH nổi trên cánh két (cánh mở lệch, pháp tuyến ≈ (−0.77,0,0.63) đo bằng raycast) — nhận ra két của tiệm bánh (ảnh S062)
    { const bread = cvTex(256, 112, (c, w, h) => { c.clearRect(0, 0, w, h);
        const loaf = (dx, dy, col) => { c.fillStyle = col; c.beginPath(); c.moveTo(18 + dx, 84 + dy); c.bezierCurveTo(2 + dx, 80 + dy, 8 + dx, 30 + dy, 70 + dx, 26 + dy); c.lineTo(190 + dx, 26 + dy); c.bezierCurveTo(250 + dx, 30 + dy, 254 + dx, 80 + dy, 238 + dx, 84 + dy); c.closePath(); c.fill(); };
        loaf(5, 6, 'rgba(0,0,0,0.65)'); loaf(0, 0, '#c98a45'); c.save(); c.clip(); c.fillStyle = '#e8c07a'; c.fillRect(0, 26, w, 30); c.restore();
        c.strokeStyle = '#7a4a20'; c.lineWidth = 9; c.lineCap = 'round'; for (let k = 0; k < 4; k++) { c.beginPath(); c.moveTo(62 + k * 36, 66); c.lineTo(86 + k * 36, 38); c.stroke(); } });
      bread.wrapS = bread.wrapT = THREE.ClampToEdgeWrapping;
      const em = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 0.5), new THREE.MeshStandardMaterial({ map: bread, transparent: true, alphaTest: 0.1, roughness: 0.6, emissive: new THREE.Color('#ffffff'), emissiveMap: bread, emissiveIntensity: 0.35, side: THREE.DoubleSide }));
      em.name = 'ket_dau_o_banh'; em.position.set(-10.24, 2.0, -6.98); em.rotation.y = Math.atan2(-0.77, 0.63); em.userData.matKind = 'none'; em.userData.grungeKind = 'none'; front.add(em); } }
  // -- thùng đồ của dân cạnh băng (phía nam băng, không chắn đường nhìn qua kính tới đầu đông)
  { const items = [], TAN = ['#c89b5c', '#b98a4c', '#d2a76a', '#a97c44'];
    [[-5, -2.6, 0.2, 2.6], [-2.2, -2.2, -0.15, 2.4], [-7.6, -1.9, 0.5, 2.2], [-3.6, -2.4, 0.1, 2.0, 2.4]].forEach(([x, z, ry, s, y], i) => items.push({ p: [x, (y ? 2.6 + 1 : s / 2), z], s: [s, y ? 2 : s * 0.9, s], r: [0, ry, 0], c: TAN[i % 4] }));
    items.push({ p: [-5, 3.4, -2.6], s: [2.2, 1.8, 2.1], r: [0, 0.4, 0], c: TAN[2] }, { p: [4, 1.1, -1.5], s: [2.4, 2.2, 2.2], r: [0, -0.25, 0], c: TAN[1] }, { p: [6.4, 0.9, -2.4], s: [2.0, 1.8, 2.0], r: [0, 0.3, 0], c: TAN[0] }, { p: [5.2, 2.9, -1.9], s: [1.8, 1.7, 1.8], r: [0, 0.1, 0], c: TAN[3] });
    const OBJ = ['#e0453f', '#3f7fe0', '#f2c230', '#5fae7a', '#c06ad8'];
    OBJ.forEach((c, i) => items.push({ p: [-10 + hash(i, 31) * 4, 0.3, -1.2 - hash(i, 32) * 1.2], s: [0.9, 0.5, 0.45], r: [0, hash(i, 33) * 3, 0], c }));
    inst(mid, 'carton_dan', BOX, intW, items); }
  // -- bàn máy may (tây): bàn gỗ #8A5A33, máy may trắng (GLB nhap/may-khau), cuộn chỉ, ghế đẩu tròn #5A3A22
  { const tb = [{ p: [-26.5, 3.0, 8], s: [5.6, 0.5, 3.4], c: '#8A5A33' }];
    for (const [dx, dz] of [[-2.5, -1.4], [2.5, -1.4], [-2.5, 1.4], [2.5, 1.4]]) tb.push({ p: [-26.5 + dx, 1.4, 8 + dz], s: [0.45, 2.8, 0.45], c: '#6a4326' });
    tb.push({ p: [-26.5, 0.9, 8 + 1.55], s: [5.2, 0.35, 0.3], c: '#6a4326' });
    inst(mid, 'table_wood', BOX, intW, tb);
    const may = fit('nhap/may-khau', 2.2);
    if (may) { may.position.set(-26.8, 3.25, 8); may.rotation.y = Math.PI / 2; may.name = 'sewing_machine'; const wm = std('#E8E4DC', { roughness: 0.5, emissive: new THREE.Color('#3a342c'), emissiveIntensity: 0.5 }); may.traverse((m) => { if (m.isMesh) m.material = wm; }); mid.add(may); } else K.box(1.8, 2.2, 1, '#E8E4DC', -26.8, 4.35, 8, 'sewing_machine', mid);
    const sp = [{ p: [-24.6, 3.65, 7.2], s: [0.28, 0.8, 0.28], c: '#e8d8b0' }, { p: [-24.2, 3.65, 8.4], s: [0.28, 0.8, 0.28], c: '#b8403a' }];
    inst(mid, 'spool_thread', CYL, intW, sp);
    inst(mid, 'stool_round', CYL, intW, [{ p: [-22.6, 2.3, 10.4], s: [1.05, 0.5, 1.05], c: '#5A3A22' }, { p: [-22.6, 1.1, 10.4], s: [0.28, 2.2, 0.28], c: '#4a2e1a' }]);
    inst(mid, 'stool_leg', BOX, intW, [[-0.7, -0.7], [0.7, -0.7], [-0.7, 0.7], [0.7, 0.7]].map(([dx, dz]) => ({ p: [-22.6 + dx, 1.0, 10.4 + dz], s: [0.22, 2.0, 0.22], c: '#4a2e1a' }))); }

  // ============================== TƯỜNG BẮC: 2 kệ gấu + bản đồ (tầng sau) ==============================
  const north = grp('e3_north_wall', 'back');
  const SY = [1.6, 5.0, 8.4], UX = [-8, 5];   // mặt ván 3 tầng; tâm 2 kệ (rộng 12)
  { const items = [];
    for (const cx of UX) {
      SY.forEach((y) => items.push({ p: [cx, y - 0.2, -18], s: [12.4, 0.4, 3], c: STEEL2 }));
      for (let k = 0; k <= 3; k++) items.push({ p: [cx - 6 + k * 4, 5.8, -18], s: [0.5, 11.6, 3.1], c: STEEL });
      items.push({ p: [cx, 11.4, -18], s: [12.4, 0.4, 3], c: STEEL2 }, { p: [cx, 5.8, -19.4], s: [12.4, 11.6, 0.2], c: '#17302f' });
    }
    inst(north, 'shelf_steel', BOX, intS, items); }
  // gấu bông caramel: 1 InstancedMesh (hình gộp từ khối cầu, màu đỉnh) — tất định, ~30 con (2 kệ × 3 tầng × 5)
  { const parts = [], P = (cx, cy, cz, sx, sy, sz, col, r = [0, 0, 0]) => { _eu.set(...r); _q.setFromEuler(_eu); parts.push({ geo: SPH, m: new THREE.Matrix4().compose(new THREE.Vector3(cx, cy, cz), _q.clone(), new THREE.Vector3(sx, sy, sz)), c: col }); };
    const CAR = '#C77A2F', CRM = '#F0D8A8', DK = '#2a1a12', BW = '#B8302C';
    P(0, 0.82, 0, 0.82, 0.82, 0.72, CAR); P(0, 1.62, 0.05, 0.62, 0.6, 0.58, CAR);   // thân, đầu
    P(-0.44, 2.1, 0, 0.23, 0.23, 0.14, CAR); P(0.44, 2.1, 0, 0.23, 0.23, 0.14, CAR);   // tai
    P(0, 1.48, 0.55, 0.28, 0.22, 0.26, CRM); P(0, 1.56, 0.8, 0.1, 0.08, 0.08, DK);       // mõm nhô + mũi
    P(-0.23, 1.74, 0.5, 0.07, 0.07, 0.06, DK); P(0.23, 1.74, 0.5, 0.07, 0.07, 0.06, DK);  // mắt
    P(-0.82, 0.95, 0.2, 0.2, 0.36, 0.22, CAR, [0, 0, 0.35]); P(0.82, 0.95, 0.2, 0.2, 0.36, 0.22, CAR, [0, 0, -0.35]);   // tay
    P(-0.5, 0.2, 0.5, 0.34, 0.28, 0.5, CAR); P(0.5, 0.2, 0.5, 0.34, 0.28, 0.5, CAR);       // chân
    P(-0.2, 1.12, 0.62, 0.2, 0.13, 0.1, BW, [0, 0, 0.3]); P(0.2, 1.12, 0.62, 0.2, 0.13, 0.1, BW, [0, 0, -0.3]); P(0, 1.12, 0.66, 0.1, 0.1, 0.1, BW);   // nơ
    const pos = [], nor = [], col = [], idx = []; let off = 0; const nm = new THREE.Matrix3(), v = new THREE.Vector3(), cc = new THREE.Color();
    for (const p of parts) {
      const gp = p.geo.attributes.position, gn = p.geo.attributes.normal; nm.getNormalMatrix(p.m); cc.set(p.c);
      for (let i = 0; i < gp.count; i++) { v.fromBufferAttribute(gp, i).applyMatrix4(p.m); pos.push(v.x, v.y, v.z); v.fromBufferAttribute(gn, i).applyMatrix3(nm).normalize(); nor.push(v.x, v.y, v.z); col.push(cc.r, cc.g, cc.b); }
      for (let i = 0; i < p.geo.index.count; i++) idx.push(p.geo.index.getX(i) + off); off += gp.count;
    }
    const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); bg.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); bg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); bg.setIndex(idx);
    const items = [];
    UX.forEach((cx, u) => SY.forEach((y, lv) => { for (let k = 0; k < 5; k++) { const i = u * 15 + lv * 5 + k; items.push({ p: [cx - 4.6 + k * 2.3 + (hash(i, 1) - 0.5) * 0.25, y, -17.6 + (hash(i, 2) - 0.5) * 0.3], s: [1, 1 + (hash(i, 3) - 0.5) * 0.08, 1], r: [0, (hash(i, 4) - 0.5) * 0.3, 0] }); } }));
    const bearMat = reg(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, emissive: new THREE.Color('#6a3e18'), emissiveIntensity: 0.45 }), 'emissiveIntensity', 0.45, 0.2);
    e.gauKe = inst(north, 'bear_plush', bg, bearMat, items, true); e.gauSoLuong = items.length;
    // NƠ CỔ nhiều màu (xanh lam, cam, đỏ gạch, vàng, xanh lá) — mỗi con 3 khối (2 cánh + nút), màu theo chỉ số con; nằm đè lên nơ đỏ cũ ở cổ
    const BOWC = ['#2f6fd0', '#ff5a10', '#a8452e', '#f2c230', '#4a9a4a', '#c0408a'], bows = [];
    items.forEach((it, i) => { const yaw = it.r[1], cs = Math.cos(yaw), sn = Math.sin(yaw), col = BOWC[Math.floor(hash(i, 9) * BOWC.length)];
      const at = (dx, dy, dz) => [it.p[0] + dx * cs + dz * sn, it.p[1] + dy, it.p[2] - dx * sn + dz * cs];
      bows.push({ p: at(-0.27, 1.1, 0.74), s: [0.3, 0.17, 0.11], r: [0, yaw, 0.3], c: col }, { p: at(0.27, 1.1, 0.74), s: [0.3, 0.17, 0.11], r: [0, yaw, -0.3], c: col }, { p: at(0, 1.1, 0.78), s: [0.13, 0.13, 0.12], r: [0, yaw, 0], c: col }); });
    inst(north, 'bear_bow', SPH, reg(new THREE.MeshStandardMaterial({ roughness: 0.8, emissive: new THREE.Color('#1c0c04'), emissiveIntensity: 0.4 }), 'emissiveIntensity', 0.4, 0.15), bows); }
  // bản đồ thị trấn (canvas): nhà (chấm đỏ = nhà có gấu), sông xanh, cây, nhà máy 3 ống khói; khung kim loại
  { const mapTex = cvTex(512, 330, (c, w, h) => {
      c.fillStyle = '#E3D0A8'; c.fillRect(0, 0, w, h); c.strokeStyle = '#8a7048'; c.lineWidth = 6; c.strokeRect(10, 10, w - 20, h - 20);
      c.strokeStyle = '#3f7fb0'; c.lineWidth = 22; c.lineCap = 'round'; c.beginPath(); c.moveTo(w * 0.62, 18); c.bezierCurveTo(w * 0.5, h * 0.3, w * 0.8, h * 0.55, w * 0.66, h - 18); c.stroke();
      c.strokeStyle = '#6aa8d0'; c.lineWidth = 8; c.stroke();
      const house = (x, y, s, red) => { c.fillStyle = '#c8a878'; c.fillRect(x - s, y - s * 0.6, s * 2, s * 1.3); c.fillStyle = '#9a4a3a'; c.beginPath(); c.moveTo(x - s * 1.2, y - s * 0.6); c.lineTo(x, y - s * 1.5); c.lineTo(x + s * 1.2, y - s * 0.6); c.fill(); c.strokeStyle = '#5a3a2a'; c.lineWidth = 2; c.strokeRect(x - s, y - s * 0.6, s * 2, s * 1.3); if (red) { c.fillStyle = '#d02020'; c.beginPath(); c.arc(x, y + s * 0.15, s * 0.32, 0, 7); c.fill(); } };
      [[90, 100, 16, 1], [150, 150, 14, 0], [70, 200, 15, 1], [135, 235, 16, 0], [215, 95, 14, 0], [230, 170, 16, 1], [200, 250, 14, 1], [110, 285, 13, 0], [300, 120, 14, 1], [330, 260, 15, 0]].forEach(([x, y, s, r]) => house(x, y, s, r));
      c.fillStyle = '#c8a070'; c.fillRect(255, 188, 50, 36); c.fillStyle = '#7a4a3a'; c.fillRect(268, 150, 24, 40); c.fillStyle = '#9a4a3a'; c.beginPath(); c.moveTo(262, 152); c.lineTo(280, 124); c.lineTo(298, 152); c.fill();
      [[375, 70], [420, 120], [455, 200], [390, 285], [310, 40], [470, 60], [440, 270]].forEach(([x, y]) => { c.fillStyle = '#3f7a3a'; c.beginPath(); c.moveTo(x - 14, y + 16); c.lineTo(x, y - 20); c.lineTo(x + 14, y + 16); c.fill(); c.fillStyle = '#6a4a2a'; c.fillRect(x - 2, y + 16, 4, 7); });
      c.fillStyle = '#7a5a4a'; c.fillRect(395, 190, 70, 38); c.fillStyle = '#5a3a2e'; for (let i = 0; i < 3; i++) c.fillRect(402 + i * 22, 156, 12, 36);
    });
    mapTex.wrapS = mapTex.wrapT = THREE.ClampToEdgeWrapping;
    const mp = new THREE.Mesh(new THREE.PlaneGeometry(11.7, 7.5), reg(new THREE.MeshStandardMaterial({ map: mapTex, roughness: 0.8, emissive: new THREE.Color('#ffffff'), emissiveMap: mapTex, emissiveIntensity: 0.4 }), 'emissiveIntensity', 0.4, 0.15));
    mp.position.set(21, 9.2, -19.4); mp.name = 'map_town'; north.add(mp);
    // GHIM ĐẦU GẤU cắm trên 5 nhà đã bị trộm (nhà chấm đỏ trên canvas); 5 nhà còn lại để trống (ảnh S060). Toạ độ canvas → bản đồ 11.7×7.5 tại (21, 9.2).
    { const pinMat = (c, i = 0.5) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.7, metalness: 0.1, emissive: new THREE.Color(c), emissiveIntensity: i });
      const mBase = pinMat('#6a4220', 0.35), mHead = pinMat('#C77A2F', 0.6), mCrm = pinMat('#F0D8A8', 0.6), mDk = pinMat('#2a1a12', 0.2), mRed = pinMat('#d03a2a', 0.5);
      const part = (par, geo, mt, x, y, z, sx, sy, sz) => { const m = new THREE.Mesh(geo, mt); m.position.set(x, y, z); m.scale.set(sx, sy, sz); par.add(m); return m; };
      [[90, 100], [70, 200], [230, 170], [200, 250], [300, 120]].forEach(([cx, cy], i) => {
        const pin = new THREE.Group(); pin.name = 'map_pin_bear'; pin.position.set(21 + (cx / 512 - 0.5) * 11.7, 9.2 - (cy / 330 - 0.5) * 7.5 - 0.08, -19.2); north.add(pin);
        part(pin, CYL, mBase, 0, 0, 0, 0.5, 0.2, 0.5).rotation.x = Math.PI / 2;                        // đế tròn (đinh ghim)
        part(pin, CYL, mHead, 0, 0, 0.11, 0.36, 0.06, 0.36).rotation.x = Math.PI / 2;                    // mặt gấu
        part(pin, SPH, mHead, -0.27, 0.27, 0.1, 0.14, 0.14, 0.07); part(pin, SPH, mHead, 0.27, 0.27, 0.1, 0.14, 0.14, 0.07);   // tai
        part(pin, SPH, mCrm, 0, -0.1, 0.16, 0.17, 0.13, 0.06);                                             // mõm
        part(pin, SPH, mDk, 0, -0.04, 0.2, 0.06, 0.045, 0.04);                                             // mũi
        part(pin, SPH, mDk, -0.13, 0.1, 0.17, 0.04, 0.04, 0.03); part(pin, SPH, mDk, 0.13, 0.1, 0.17, 0.04, 0.04, 0.03);       // mắt
        part(pin, SPH, mRed, 0, -0.33, 0.14, 0.09, 0.05, 0.04);                                            // nơ nhỏ dưới cằm
        noPatch(pin); });
    }
    inst(north, 'map_frame', BOX, intW, [{ p: [21, 13.05, -19.35], s: [12.3, 0.4, 0.3], c: '#4a4a52' }, { p: [21, 5.35, -19.35], s: [12.3, 0.4, 0.3], c: '#4a4a52' }, { p: [14.95, 9.2, -19.35], s: [0.4, 7.9, 0.3], c: '#4a4a52' }, { p: [27.05, 9.2, -19.35], s: [0.4, 7.9, 0.3], c: '#4a4a52' }]); }

  // ============================== KHO (tầng giữa/trước): cửa kho, chồng thùng carton in đầu gấu, chồng thùng gỗ ==============================
  const store = grp('e3_storage', 'mid'), storeF = grp('e3_storage_front', 'front');
  e.cuaKho = new THREE.Group(); e.cuaKho.name = 'cua_kho'; store.add(e.cuaKho);
  const leafGroups = [-1, 1].map((s) => {   // s=−1: cánh bắc, bản lề z=−6, vươn +z; s=+1: cánh nam, bản lề z=+6, vươn −z (mở vào phía kho +X)
    const L = new THREE.Group(); L.name = 'cua_kho_canh'; L.position.set(30.3, 0, s * 6); e.cuaKho.add(L);
    const d = -s, items = [{ p: [0, 5.75, d * 3], s: [0.4, 11.5, 6], c: STEEL }];
    for (let k = 0; k < 4; k++) items.push({ p: [-0.28, 1.6 + k * 2.9, d * 3], s: [0.2, 0.5, 5.6], c: STEEL2 });
    items.push({ p: [-0.28, 5.75, d * 3], s: [0.2, 11.5, 0.5], c: STEEL2 }, { p: [0.28, 5.75, d * 3], s: [0.2, 11.5, 0.5], c: STEEL2 });
    for (let k = 0; k < 8; k++) for (const x of [-0.42, 0.28]) items.push({ p: [x, 1.0 + k * 1.4, d * 0.5], s: [0.15, 0.2, 0.2], c: '#0f2a29' }, { p: [x, 1.0 + k * 1.4, d * 5.5], s: [0.15, 0.2, 0.2], c: '#0f2a29' });
    items.push({ p: [-0.55, 5.4, d * 5.3], s: [0.3, 1.6, 0.3], c: '#9a9aa2' }, { p: [0.55, 5.4, d * 5.3], s: [0.3, 1.6, 0.3], c: '#9a9aa2' });
    inst(L, 'cua_kho_thep', BOX, intS, items); return L;
  });
  const setDoor = (k) => { k = Math.max(0, Math.min(1, k)); if (k === doorK) return; doorK = k; leafGroups[0].rotation.y = k * 1.75; leafGroups[1].rotation.y = -k * 1.75; };
  e.setDoor = setDoor; setDoor(1);
  // thùng carton in đầu gấu xanh dầu (có MÕM nhô, tai tròn nhỏ, mắt, mũi) — canvas
  const cartonSide = cvTex(256, 256, (c) => {
    c.fillStyle = CARTON; c.fillRect(0, 0, 256, 256); for (let i = 0; i < 18; i++) { c.fillStyle = 'rgba(120,80,30,0.08)'; c.fillRect(0, i * 15, 256, 7); }
    c.fillStyle = '#d9b27a'; c.fillRect(0, 0, 256, 14); c.fillStyle = '#b08850'; c.fillRect(0, 14, 256, 3);
    const cx = 128, cy = 128; c.fillStyle = STEEL;
    c.beginPath(); c.arc(cx - 40, cy - 38, 17, 0, 7); c.fill(); c.beginPath(); c.arc(cx + 40, cy - 38, 17, 0, 7); c.fill();   // tai
    c.beginPath(); c.arc(cx, cy - 4, 52, 0, 7); c.fill();                                                                     // đầu
    c.beginPath(); c.ellipse(cx, cy + 40, 30, 24, 0, 0, 7); c.fill();                                                          // mõm nhô khỏi đầu
    c.fillStyle = CARTON; c.beginPath(); c.ellipse(cx, cy + 36, 21, 15, 0, 0, 7); c.fill();                                    // mặt mõm (khoét sáng)
    c.fillStyle = STEEL; c.beginPath(); c.ellipse(cx, cy + 30, 8, 5.5, 0, 0, 7); c.fill();                                      // mũi
    c.beginPath(); c.arc(cx - 20, cy - 12, 5.5, 0, 7); c.fill();                                                               // mắt (tối trên nền tối → khoét sáng)
    c.fillStyle = CARTON; c.beginPath(); c.arc(cx - 20, cy - 12, 5.5, 0, 7); c.fill(); c.beginPath(); c.arc(cx + 20, cy - 12, 5.5, 0, 7); c.fill();
    c.fillStyle = STEEL; c.beginPath(); c.arc(cx - 20, cy - 12, 2.5, 0, 7); c.fill(); c.beginPath(); c.arc(cx + 20, cy - 12, 2.5, 0, 7); c.fill();
  });
  const cartonTop = cvTex(64, 64, (c) => { c.fillStyle = '#d2aa72'; c.fillRect(0, 0, 64, 64); c.fillStyle = '#b08850'; c.fillRect(0, 29, 64, 6); });
  const mkCarton = (map) => reg(new THREE.MeshStandardMaterial({ map, roughness: 0.9, emissive: new THREE.Color('#ffc890'), emissiveMap: map, emissiveIntensity: 0.45 }), 'emissiveIntensity', 0.45, 0.16);
  const cartonMats = [mkCarton(cartonSide), mkCarton(cartonSide), mkCarton(cartonTop), mkCarton(cartonTop), mkCarton(cartonSide), mkCarton(cartonSide)];
  { const S = 4.4, items = [], put = (x, y, z, ry = 0) => items.push({ p: [x, y + S / 2, z], s: [S, S, S], r: [0, ry, 0] });
    put(49.2, 0, 11, 0.04); put(49.2, 0, 6.6, -0.03); put(44.8, 0, 11.2, 0.05); put(44.8, 0, 6.8, -0.04);   // đáy 2×2
    put(49.1, S, 10.6, 0.1); put(44.8, S, 8.8, -0.06); put(49.0, S, 6.8, 0.04);                              // tầng 2
    put(48.9, 2 * S, 9.0, 0.08);                                                                              // tầng 3
    put(38.5, 0, 12, 0.3); put(38, 0, -10.2, -0.2);                                                           // thùng lẻ
    inst(storeF, 'carton_bear_print', BOX, cartonMats, items, true); }
  { const items = [], put = (x, y, z, sx, sy, sz, ry = 0) => items.push({ p: [x, y + sy / 2, z], s: [sx, sy, sz], r: [0, ry, 0] });
    put(49.4, 0, -9.5, 4.6, 4.2, 4.6, 0.05); put(44.6, 0, -11, 4.2, 3.6, 4.2, -0.08); put(49.0, 4.2, -9.8, 4.0, 3.6, 4.0, 0.2); put(43.5, 0, -6.3, 3.2, 3.0, 3.2, 0.18); put(47.2, 0, -5.2, 3.0, 2.8, 3.0, -0.1);
    inst(storeF, 'crate_wood_stack', BOX, woodInt, items, true); }

  // ---------- tổng hợp ----------
  [shell, facade, lamps, yardF, mid, front, north, store, storeF].forEach((o) => noPatch(o));
  e.pointSpec = { color: '#ffd9a0', intensity: 14, distance: 90, decay: 1.2, pos: [0, 12, -2] };   // đèn điểm dùng chung (engine/envs.js 'interior_point')
  return {
    suSong: [],
    update(t, ctx = {}) {
      const lk = ctx.light || e.light, nt = (LIGHTS[lk] || LIGHTS.night).night ? 1 : 0;
      for (const [m, p, n, d] of dn) m[p] = nt ? n : d;
      skyGlass.color.set(nt ? '#ffb55a' : '#cfe6ff'); skyGlass.opacity = nt ? 0.5 : 0.22;
      winGlass.color.set(nt ? '#a8c0ff' : '#e0f0ff'); winGlass.opacity = nt ? 0.12 : 0.1;
      beltTex.offset.x = -((t * 0.9) % 1);
      setDoor(ctx.cuaKho ?? 1); setGate(ctx.congRao ?? 0);
    },
  };
}
