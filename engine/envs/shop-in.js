// Bối cảnh 'shop-in' — NỘI THẤT tối giản dùng lại được (ep002: tiệm bánh, nhà Gà, nhà thị trưởng). Preset ánh sáng: interior.
// Sửa bối cảnh này CHỈ trong file này. Được episodes/<ep>/index.html nạp động khi shot ghi `env: "shop-in"` → build(g, e, H).
//
// Mỗi VAI = một gian kín 36×32×13 stud (x −18..18, z −16..16, mặt chính = tường sau z=−16, camera đứng phía +Z), đặt cách nhau 100 stud
// theo trục X (nằm ngoài tầm nhìn của nhau). Tham số theo vai ở PRESET: màu tường/sàn, bảng hiệu, cửa, cửa sổ, đồ bày.
//   bakery  gốc x=0    tiệm bánh: quầy (hoc_quay) giữa tường sau, bảng "TIỆM BÁNH MÌ" lớn, kệ bánh mì, két sắt, bàn bày bánh
//   home    gốc x=100  nhà Gà: cửa vàng + cửa sổ ở tường sau, kệ (ke_trong) giữa hai thứ đó, sofa, thảm
//   mayor   gốc x=200  nhà thị trưởng: bàn giấy gỗ tối (đặt đồng hồ quả quýt), bảng "THỊ TRƯỞNG", cờ, tủ sách, đèn bàn
// Thêm vai mới = thêm 1 mục PRESET + 1 mục SHOP_DIEM + slot trong PROP_SLOTS (không đụng engine).
//
// ĐIỂM CÓ TÊN (toạ độ env; y = mặt đứng/mặt đặt):
//   bakery_giua [0,0,2]  home_giua [100,0,2]  mayor_giua [200,0,2]   chỗ diễn viên đứng giữa gian
//   quay_banh [0,0,-9]  ke_nha [99,0,-15.3]  ban_thi_truong [200,3.25,-9]
export const LIGHT = 'interior';
export const ASSETS = [
  'nhap/ket-sat', 'furniture-kit/loungeSofa', 'furniture-kit/pottedPlant', 'furniture-kit/lampRoundFloor', 'furniture-kit/bookcaseClosedWide',
  'furniture-kit/chairDesk', 'furniture-kit/rugRectangle', 'furniture-kit/table', 'furniture-kit/chair',
];
export const SHOP_DIEM = {
  bakery_giua: [0, 0, 2], home_giua: [100, 0, 2], mayor_giua: [200, 0, 2],
  quay_banh: [0, 0, -9], ke_nha: [99, 0, -15.3], ban_thi_truong: [200, 3.25, -9],
};
// slot đạo cụ theo tên (index.html gộp vào PROP_SLOTS; ry 0 = mặt nhìn +Z, về phía camera). camMax: camera insert không lùi quá 20 stud (gian sâu 32).
export const PROP_SLOTS = {
  byName: { hoc_quay: [0, 0, -9, 0], ke_trong: [99, 0, -15.3, 0], dong_ho_quyt_thi: [200, 3.25, -9, 0] },
  floor: [[-8, 0, 4, 0]], wall: [[0, 6, -15.9, 0]],
  camMax: 20,
};

const PRESET = {
  bakery: {
    ox: 0, wall: '#f8e6c8', band: '#e8a29a', floor: 'checker', ceil: '#fff3dc', trim: '#a8603a',
    sign: { text: 'TIỆM BÁNH MÌ', bg: '#b3402f', fg: '#ffe9b8', w: 10, h: 2.3, y: 10.4, bread: true },
    windows: [{ wall: 'left', c: 2, y0: 3.2, y1: 9.6, hw: 4.2 }, { wall: 'front', c: 0, y0: 3, y1: 9.5, hw: 7 }],
    door: { wall: 'right', c: 6, color: '#6b4a2e' },
  },
  home: {
    ox: 100, wall: '#d9d0ee', band: '#b8a9d9', floor: '#8c6446', ceil: '#f4efe6', trim: '#6a4a38',
    windows: [{ wall: 'back', c: 9, y0: 3.4, y1: 9.6, hw: 3.4 }, { wall: 'left', c: 0, y0: 3.2, y1: 9.6, hw: 4.2 }],
    door: { wall: 'back', c: -9, color: '#f2b33d', handle: true },
  },
  mayor: {
    ox: 200, wall: '#ecdcc0', band: '#7a3f2e', floor: '#6a4630', ceil: '#f6ead2', trim: '#3d2a1e',
    sign: { text: 'THỊ TRƯỞNG', bg: '#d9674f', fg: '#fff1d8', w: 6.2, h: 1.7, y: 9.8, bread: false },
    windows: [{ wall: 'left', c: -3, y0: 3.4, y1: 9.8, hw: 4 }],
    door: { wall: 'right', c: 5, color: '#5a3a24' },
  },
};

export default function build(g, e, H) {
  const { ganTang, THREE, K, A, fit, mat, plane, hash, checker, viewTex } = H;
  const R = e.room = new THREE.Group(); R.name = 'shop_in_room'; g.add(R);
  e.diem = SHOP_DIEM;
  const W = 36, D = 32, HH = 13, HX = W / 2, HZ = D / 2;
  const grp = (name, tang, parent = R) => { const o = new THREE.Group(); o.name = name; parent.add(ganTang(o, tang)); return o; };
  const std = (c, o = {}) => mat(c, { roughness: 0.85, ...o });
  const lit = (c, i = 0.9) => mat(c, { emissive: new THREE.Color(c), emissiveIntensity: i });
  const BOX = new THREE.BoxGeometry(1, 1, 1), SPH = new THREE.SphereGeometry(1, 12, 8), CYL = new THREE.CylinderGeometry(1, 1, 1, 10);
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _eu = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();
  const inst = (parent, name, geo, material, items, shadow = true) => {   // InstancedMesh tất định: {p, s, r, c}
    const im = new THREE.InstancedMesh(geo, material, items.length); im.name = name;
    items.forEach((it, i) => { _eu.set(...(it.r || [0, 0, 0])); _q.setFromEuler(_eu); _p.set(...it.p); _s.set(...(it.s || [1, 1, 1])); im.setMatrixAt(i, _m.compose(_p, _q, _s)); if (it.c) im.setColorAt(i, _c.set(it.c)); });
    im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
    im.castShadow = shadow; im.receiveShadow = true; im.computeBoundingBox?.(); im.computeBoundingSphere?.(); parent.add(im); return im;
  };
  const white = std('#ffffff');
  const canvasTex = (w, h, draw) => { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
  const signTex = (S) => canvasTex(1024, Math.round(1024 * S.h / S.w), (c, w, h) => {
    c.fillStyle = S.bg; c.fillRect(0, 0, w, h); c.strokeStyle = S.fg; c.lineWidth = 10; c.strokeRect(14, 14, w - 28, h - 28);
    c.fillStyle = S.fg; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `900 ${Math.round(h * 0.5)}px 'Be Vietnam Pro', sans-serif`;
    c.fillText(S.text, S.bread ? w * 0.56 : w / 2, h * 0.53);
    if (S.bread) { c.fillStyle = '#e0a04a'; c.beginPath(); c.ellipse(w * 0.1, h / 2, w * 0.05, h * 0.2, 0.5, 0, 7); c.fill(); c.strokeStyle = '#a8602a'; c.lineWidth = 6; for (const k of [-1, 0, 1]) { c.beginPath(); c.moveTo(w * 0.1 + k * 22 - 6, h * 0.4 + k * 12); c.lineTo(w * 0.1 + k * 22 + 10, h * 0.55 + k * 12); c.stroke(); } }
  });
  const viewDay = viewTex('day');

  // tường = tấm phẳng có lỗ (cửa sổ/cửa), mặt nhìn VÀO trong (FrontSide) → camera đứng ngoài tường vẫn nhìn xuyên được. Hệ cục bộ: x ngang, y cao, +z hướng vào phòng.
  const wallGeo = (holes) => {
    const sh = new THREE.Shape(); sh.moveTo(-D / 2 - 2, 0); sh.lineTo(D / 2 + 2, 0); sh.lineTo(D / 2 + 2, HH); sh.lineTo(-D / 2 - 2, HH); sh.closePath();
    for (const h of holes) { const p = new THREE.Path(); p.moveTo(h.c - h.hw, h.y0); p.lineTo(h.c - h.hw, h.y1); p.lineTo(h.c + h.hw, h.y1); p.lineTo(h.c + h.hw, h.y0); p.closePath(); sh.holes.push(p); }
    return new THREE.ShapeGeometry(sh);
  };
  const WALL = { back: { p: [0, -HZ], ry: 0, len: W }, front: { p: [0, HZ], ry: Math.PI, len: W }, left: { p: [-HX, 0], ry: Math.PI / 2, len: D }, right: { p: [HX, 0], ry: -Math.PI / 2, len: D } };

  const room = (P) => {
    const ox = P.ox, F = grp('shop_floor_' + P.ox, 'back');
    const fl = P.floor === 'checker' ? plane(W, D, mat('#ffffff', { map: checker, roughness: 0.8 }), 0.02, 'shop_floor') : plane(W, D, std(P.floor), 0.02, 'shop_floor');
    fl.position.set(ox, 0.02, 0); F.add(fl);
    const ce = plane(W, D, std(P.ceil), HH, 'shop_ceiling'); ce.rotation.x = Math.PI / 2; ce.position.set(ox, HH, 0); ce.receiveShadow = false; F.add(ce);
    // đường chân tường + dải ốp thấp (band) + đường trần
    for (const side of Object.keys(WALL)) {
      const Wd = WALL[side], gw = new THREE.Group(); gw.position.set(ox + Wd.p[0], 0, Wd.p[1]); gw.rotation.y = Wd.ry; F.add(gw); gw.name = 'shop_wall_' + side;
      const holes = [...(P.windows || []).filter((w) => w.wall === side), ...(P.door && P.door.wall === side ? [{ c: P.door.c, y0: 0, y1: 7, hw: 2 }] : [])];
      const wm = new THREE.Mesh(wallGeo(holes), std(P.wall)); wm.name = 'shop_wall'; wm.receiveShadow = true; gw.add(wm);
      // dải ốp thấp: 2 đoạn quanh cửa (hoặc nguyên tấm)
      const bandBox = (x0, x1, y0, y1, c, z = 0.08) => K.box(x1 - x0, y1 - y0, 0.16, c, (x0 + x1) / 2, (y0 + y1) / 2, z, 'shop_band', gw);
      const doorH = P.door && P.door.wall === side ? P.door : null;
      if (doorH) { bandBox(-D / 2, doorH.c - 2, 0, 3.2, P.band); bandBox(doorH.c + 2, D / 2, 0, 3.2, P.band); } else bandBox(-D / 2, D / 2, 0, 3.2, P.band);
      bandBox(-D / 2, D / 2, 3.2, 3.5, P.trim, 0.12); bandBox(-D / 2, D / 2, HH - 0.5, HH, P.trim, 0.12);
      for (const w of holes.filter((h) => h.y0 > 0)) {   // khung + bậu cửa sổ + cảnh ngoài sáng sau lỗ
        const cx = w.c, wd = w.hw * 2, ht = w.y1 - w.y0, cy = (w.y0 + w.y1) / 2;
        K.box(wd + 0.8, 0.4, 0.5, P.trim, cx, w.y0 - 0.1, 0.2, 'shop_sill', gw); K.box(wd + 0.6, 0.35, 0.4, P.trim, cx, w.y1 + 0.15, 0.1, 'shop_lintel', gw);
        K.box(0.4, ht, 0.4, P.trim, cx - w.hw - 0.1, cy, 0.1, 'shop_frame', gw); K.box(0.4, ht, 0.4, P.trim, cx + w.hw + 0.1, cy, 0.1, 'shop_frame', gw);
        K.box(wd, 0.25, 0.3, P.trim, cx, cy, 0.0, 'shop_mullion', gw); K.box(0.25, ht, 0.3, P.trim, cx, cy, 0.0, 'shop_mullion', gw);
        const out = new THREE.Mesh(new THREE.PlaneGeometry(wd + 6, ht + 6), new THREE.MeshBasicMaterial({ map: viewDay, fog: false })); out.position.set(cx, cy, -3); out.name = 'shop_window_view'; gw.add(out);
        const glass = new THREE.Mesh(new THREE.PlaneGeometry(wd, ht), new THREE.MeshBasicMaterial({ color: '#dff0ff', transparent: true, opacity: 0.12, depthWrite: false })); glass.position.set(cx, cy, 0.02); glass.name = 'shop_glass'; gw.add(glass);
      }
      if (doorH) {   // cánh cửa đóng + khung + tay nắm
        K.box(4.4, 0.4, 0.5, P.trim, doorH.c, 7.2, 0.15, 'shop_door_lintel', gw);
        K.box(0.4, 7.2, 0.5, P.trim, doorH.c - 2.2, 3.6, 0.15, 'shop_door_frame', gw); K.box(0.4, 7.2, 0.5, P.trim, doorH.c + 2.2, 3.6, 0.15, 'shop_door_frame', gw);
        K.box(4, 7, 0.35, doorH.color, doorH.c, 3.5, -0.15, 'shop_door', gw);
        const dk = '#' + new THREE.Color(doorH.color).multiplyScalar(0.8).getHexString(); K.box(2.8, 2.6, 0.12, dk, doorH.c, 5.1, 0.06, 'shop_door_panel', gw); K.box(2.8, 2.6, 0.12, dk, doorH.c, 1.9, 0.06, 'shop_door_panel', gw);
        K.box(0.5, 0.5, 0.5, '#2a2f38', doorH.c + 1.5, 3.4, 0.25, 'shop_door_knob', gw);
      }
      if (side === 'back' && P.sign) {   // bảng hiệu lớn trên tường sau
        const S = P.sign, sm = new THREE.Mesh(new THREE.PlaneGeometry(S.w, S.h), new THREE.MeshStandardMaterial({ map: signTex(S), roughness: 0.7, emissive: new THREE.Color('#ffffff'), emissiveMap: null, emissiveIntensity: 0 }));
        sm.position.set(0, S.y, 0.1); sm.name = 'shop_sign'; gw.add(sm);
        K.box(S.w + 0.7, S.h + 0.7, 0.2, P.trim, 0, S.y, 0.0, 'shop_sign_frame', gw);
      }
    }
    return F;
  };

  // ---- đồ bày ----
  const glb = (parent, id, h, x, z, ry = 0, y = 0, axis = 'y') => { const o = fit(id, h, { axis }); if (!o) return null; o.position.set(x, y, z); o.rotation.y = ry; o.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); parent.add(o); return o; };
  const lamp = (parent, x, z) => {   // đèn treo chụp nón (có phát sáng)
    inst(parent, 'shop_lamp_cord', BOX, white, [{ p: [x, 11.6, z], s: [0.12, 2.8, 0.12], c: '#222' }], false);
    inst(parent, 'shop_lamp', new THREE.CylinderGeometry(0.5, 1.8, 1.3, 14, 1, true), new THREE.MeshStandardMaterial({ color: '#3b3733', emissive: new THREE.Color('#ffd27a'), emissiveIntensity: 0.8, side: THREE.DoubleSide }), [{ p: [x, 9.7, z] }], false);
    inst(parent, 'shop_lamp_bulb', SPH, new THREE.MeshBasicMaterial({ color: '#fff3cc' }), [{ p: [x, 9.3, z], s: [0.45, 0.45, 0.45] }], false);
  };

  const F1 = room(PRESET.bakery), F2 = room(PRESET.home), F3 = room(PRESET.mayor);
  const mid = grp('shop_furniture', 'mid'), front = grp('shop_front_stuff', 'front');

  // ===== TIỆM BÁNH (gốc x=0) =====
  { const ox = 0, BR = ['#d9964a', '#c47a35', '#e8b66a', '#b86a2c'];
    // kệ tường sau: 3 tầng ván + bánh mì (ổ tròn + ổ dài)
    const SY = [4.6, 7.2], items = [], loaves = [], bag = [];
    SY.forEach((y) => items.push({ p: [ox, y - 0.2, -15.1], s: [28, 0.4, 1.8], c: '#a8603a' }));
    for (const x of [-14, -7, 0, 7, 14]) items.push({ p: [ox + x, 4.6, -15.1], s: [0.4, 5.4, 1.8], c: '#8a4c2c' });
    SY.forEach((y, lv) => { for (let k = 0; k < 13; k++) { const x = -13 + k * 2.17, r = hash(lv * 20 + k, 4);
      if (r > 0.45) loaves.push({ p: [ox + x, y + 0.45, -15.0], s: [0.95, 0.55, 0.65], r: [0, 0, 0], c: BR[Math.floor(hash(lv * 20 + k, 5) * 4) % 4] });
      else bag.push({ p: [ox + x, y + 0.55, -15.0], s: [0.32, 1.1, 0.32], r: [0, 0, Math.PI / 2 * 0 + (hash(k, lv + 9) - 0.5) * 0.5], c: BR[1 + (k % 3)] }); } });
    inst(mid, 'shop_shelf_unit', BOX, white, items); inst(mid, 'shop_bread_loaf', SPH, white, loaves); inst(mid, 'shop_bread_long', CYL, white, bag);
    // bàn bày bánh bên trái
    K.box(8, 0.5, 4.4, '#a8603a', ox - 11, 3.1, 4, 'shop_table_top', mid); for (const [dx, dz] of [[-3.4, -1.8], [3.4, -1.8], [-3.4, 1.8], [3.4, 1.8]]) K.box(0.5, 3, 0.5, '#7a4528', ox - 11 + dx, 1.5, 4 + dz, 'shop_table_leg', mid);
    K.box(8.4, 0.12, 4.8, '#f4ece0', ox - 11, 3.4, 4, 'shop_table_cloth', mid);
    inst(mid, 'shop_bread_loaf', SPH, white, [[-2.6, -1], [0, 0.4], [2.4, -0.6], [-1, 1.3], [1.4, 1.4]].map(([dx, dz], i) => ({ p: [ox - 11 + dx, 3.85, 4 + dz], s: [0.95, 0.5, 0.65], c: BR[i % 4] })));
    glb(mid, 'nhap/ket-sat', 3.6, ox + 5.6, -8.2, -0.25);   // két sắt đựng tiền
    glb(front, 'furniture-kit/pottedPlant', 4.2, ox + 15.5, 11);
    lamp(front, ox - 8, -2); lamp(front, ox + 8, -2);
  }
  // ===== NHÀ GÀ (gốc x=100) =====
  { const ox = 100;
    glb(mid, 'furniture-kit/loungeSofa', 4.2, ox - 13, 4, Math.PI / 2, 0, 'xz');
    glb(mid, 'furniture-kit/rugRectangle', 11, ox - 1, 5, 0, 0.03, 'xz');
    glb(front, 'furniture-kit/lampRoundFloor', 7, ox + 14, -11);
    glb(front, 'furniture-kit/pottedPlant', 4, ox - 15, -13);
    K.box(2.4, 3.2, 0.2, '#e9d8a8', ox - 17.9, 8.6, -6, 'shop_picture', mid).rotation.y = Math.PI / 2;
    lamp(front, ox, 2);
  }
  // ===== NHÀ THỊ TRƯỞNG (gốc x=200) =====
  { const ox = 200;
    K.box(10, 0.5, 4.6, '#4a2f1e', ox, 3.0, -9, 'shop_desk_top', mid);   // mặt bàn y 2.75..3.25 (đồng hồ đặt y 3.25)
    for (const [dx, dz] of [[-4.5, -2], [4.5, -2], [-4.5, 2], [4.5, 2]]) K.box(0.6, 2.8, 0.6, '#3a2417', ox + dx, 1.4, -9 + dz, 'shop_desk_leg', mid);
    K.box(9.4, 1.6, 0.3, '#3a2417', ox, 2.0, -11.1, 'shop_desk_back', mid);
    K.box(6, 0.06, 3, '#2f5a3c', ox + 0, 3.28, -9, 'shop_desk_pad', mid);   // tấm lót xanh trên mặt bàn
    K.box(3.2, 0.5, 3, '#2f5a3c', ox, 2.2, -13.2, 'shop_chair_seat', mid); K.box(3.2, 3.2, 0.5, '#3a2417', ox, 4.2, -14.6, 'shop_chair_back', mid); for (const [dx, dz] of [[-1.3, -12.0], [1.3, -12.0], [-1.3, -14.4], [1.3, -14.4]]) K.box(0.4, 2.1, 0.4, '#3a2417', ox + dx, 1.05, dz, 'shop_chair_leg', mid);
    glb(mid, 'furniture-kit/bookcaseClosedWide', 8, ox + 12, -14.8, 0, 0, 'xz');
    { const rug = plane(14, 8, std('#7a2a2a'), 0.04, 'shop_rug'); rug.position.set(ox, 0.04, -6); mid.add(rug); }
    // cờ thị trấn bên trái
    K.box(0.3, 9, 0.3, '#b08a4a', ox - 12, 4.5, -14.6, 'shop_flag_pole', mid); K.box(3.4, 2.4, 0.1, '#3f7fe0', ox - 13.7, 8, -14.6, 'shop_flag', mid);
    // đèn bàn
    K.cyl(0.8, 0.9, 0.3, '#b08a4a', ox + 4, 3.45, -10, 'shop_lamp_base', mid, 10); K.cyl(0.18, 0.18, 1.6, '#b08a4a', ox + 4, 4.3, -10, 'shop_lamp_stem', mid, 8);
    inst(mid, 'shop_desk_lamp', new THREE.CylinderGeometry(0.5, 1.1, 0.9, 12, 1, true), new THREE.MeshStandardMaterial({ color: '#3b6a4a', emissive: new THREE.Color('#ffd27a'), emissiveIntensity: 0.85, side: THREE.DoubleSide }), [{ p: [ox + 4, 5.4, -10] }], false);
    lamp(front, ox - 6, 2); lamp(front, ox + 6, 2);
  }

  // mọi vật trong env: không để lớp vật liệu/bụi vá lên (màu đã chọn theo bảng); tường/trần không đổ bóng (nắng xuyên vào như ánh sáng cửa sổ)
  R.traverse((o) => { if (!o.isMesh) return; o.userData.matKind = 'none'; o.userData.grungeKind = 'none'; if (/^shop_(wall|ceiling|floor|band|window_view|glass)/.test(o.name)) o.castShadow = false; });
  return { suSong: [], update() {} };
}
