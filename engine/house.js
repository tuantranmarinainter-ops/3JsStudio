// house.js — Ngôi nhà biết đi: thân nhà dựng bằng code + 4 chân gỗ (IK 2 đoạn, dáng đi chéo, chân neo đất).
//
//   const house = createHouse(THREE, { style: 'family' });   // 'family' (đỏ, mái ngọc) | 'illustration' (sáng, mái xanh)
//   scene.add(house.root);
//   house.root.position.set(x, 0, z); house.root.rotation.y = heading;   // vị trí do shot quyết định
//   house.pose({ legsOut: 1, lift: 1, walk: d, shake: 0, pitch: 0, roll: 0 });
//   house.setNight(1);   // cửa sổ sáng đèn
//
// Mặt trước nhà nhìn +Z (giống R6). Đơn vị stud (người cao 5.2). Mọi tham số là hàm thuần của t do shot tính.
//   legsOut 0→1 : chân chui ra từ tầng hầm và vươn dài
//   lift    0→1 : thân từ ngồi trên đất (tầng hầm chạm đất) → đứng cao
//   walk    d   : quãng đường đã đi (stud) → pha bước; root phải được dời đúng d dọc hướng +Z cục bộ
//   kneel   0→1 : khuỵu chân hạ hiên xuống (thân hạ thấp, đầu gối gập cao)

export const HOUSE_STYLES = {
  family: {
    wall: '#b23a32', plank: '#8f2a25', trim: '#f4f1ea', roof: '#2bb3a3', roofDark: '#1f8d80',
    door: '#7a4424', doorTrim: '#f4f1ea', accent: '#f2c14e', base: '#8c8c94', glass: '#2b3b55',
    porch: '#c9b79c', chimney: '#8f4a3a',
  },
  illustration: {
    wall: '#cdeee6', plank: '#a9d8cd', trim: '#ffffff', roof: '#2e3d63', roofDark: '#222d4a',
    door: '#8a4b2a', doorTrim: '#ffffff', accent: '#f2c14e', base: '#9aa0a8', glass: '#2b3b55',
    porch: '#e8e2d6', chimney: '#7d7d86',
  },
};

const W = 28, D = 20, WALL = 11, BASE = 3, PORCH = 6;
const L1 = 17, L2 = 19;                         // đùi, ống chân
const STAND = 19;                               // cao độ sàn khi đứng
const STRIDE = 7;                               // nửa chu kỳ bước
const HIPS = [                                  // [x, z] cục bộ thân; thứ tự FL, FR, BL, BR (trái = +X)
  [W / 2 - 2.5, D / 2 - 2.5], [-(W / 2 - 2.5), D / 2 - 2.5],
  [W / 2 - 2.5, -(D / 2 - 2.5)], [-(W / 2 - 2.5), -(D / 2 - 2.5)],
];
const PHASE = [0, 0.5, 0.5, 0];                 // cặp chéo FL+BR, FR+BL

export function createHouse(THREE, opts = {}) {
  const style = opts.style || 'family';
  const c = { ...HOUSE_STYLES[style], ...(opts.colors || {}) };
  const root = new THREE.Group(); root.name = opts.name || `house_${style}`;
  const body = new THREE.Group(); body.name = 'house_body'; root.add(body);
  const shell = new THREE.Group(); shell.name = 'house_shell'; body.add(shell);

  const mats = {};
  const M = (key, color, extra = {}) => (mats[key] ||= new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...extra }));
  const add = (geo, mat, x, y, z, name, parent = shell) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.name = name;
    m.castShadow = m.receiveShadow = true; parent.add(m); return m;
  };
  const B = (w, h, d) => new THREE.BoxGeometry(w, h, d);

  // --- vật liệu ---
  const plankTex = (() => {
    const cv = document.createElement('canvas'); cv.width = 64; cv.height = 256;
    const g = cv.getContext('2d'); g.fillStyle = c.wall; g.fillRect(0, 0, 64, 256);
    g.fillStyle = c.plank; for (let y = 0; y < 256; y += 16) g.fillRect(0, y, 64, 3);
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(4, 2); return t;
  })();
  const wallMat = new THREE.MeshStandardMaterial({ map: plankTex, roughness: 0.85 });
  const trim = M('trim', c.trim), roof = M('roof', c.roof, { roughness: 0.6 }), roofDark = M('roofDark', c.roofDark);
  const accent = M('accent', c.accent, { roughness: 0.5, metalness: 0.2 });
  const glass = M('glass', c.glass, { emissive: new THREE.Color('#ffd27a'), emissiveIntensity: 0, roughness: 0.3 });
  const baseMat = M('base', c.base, { roughness: 1 }), porchMat = M('porch', c.porch);
  const doorMat = M('door', c.door, { roughness: 0.6 });

  // --- tầng hầm + tường ---
  add(B(W + 0.6, BASE, D + 0.6), baseMat, 0, -BASE / 2, 0, 'basement');
  add(B(W, WALL, D), wallMat, 0, WALL / 2, 0, 'walls');
  for (const [x, z] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) add(B(0.8, WALL, 0.8), trim, x * W / 2, WALL / 2, z * D / 2, 'corner_trim');
  add(B(W + 0.8, 0.6, D + 0.8), trim, 0, WALL + 0.3, 0, 'eave_trim');
  add(B(W + 0.8, 0.5, D + 0.8), trim, 0, 0.25, 0, 'sill_trim');

  // --- mái chính (lăng trụ tam giác, nóc chạy theo X) ---
  const prism = (w, d, h) => {
    const s = new THREE.Shape(); s.moveTo(-d / 2, 0); s.lineTo(d / 2, 0); s.lineTo(0, h); s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: w, bevelEnabled: false });
    g.translate(0, 0, -w / 2); g.rotateY(Math.PI / 2); return g;
  };
  add(prism(W + 3, D + 3.5, 8.5), roof, 0, WALL + 0.6, 0, 'roof_main');
  add(prism(W + 0.2, D + 0.2, 8.0), wallMat, 0, WALL + 0.6, 0, 'gable_fill');
  // mái hồi phía trước (ở giữa), có ô cửa tròn + hoạ tiết vàng
  const cg = add(prism(11, 1, 1), roof, 0, 0, 0, 'tmp'); shell.remove(cg);
  const crossRoof = new THREE.Mesh(prism(12, 14, 9.5), roof); crossRoof.rotation.y = Math.PI / 2;
  crossRoof.position.set(0, WALL + 0.6, D / 2 - 4); crossRoof.name = 'roof_cross'; crossRoof.castShadow = true; shell.add(crossRoof);
  const crossFill = new THREE.Mesh(prism(5, 11.6, 8.8), wallMat); crossFill.rotation.y = Math.PI / 2;
  crossFill.position.set(0, WALL + 0.6, D / 2 + 0.6); crossFill.name = 'gable_front'; shell.add(crossFill);
  add(new THREE.TorusGeometry(1.4, 0.3, 8, 24), trim, 0, WALL + 4.2, D / 2 + 3.2, 'gable_ring');
  add(new THREE.CircleGeometry(1.4, 24), glass, 0, WALL + 4.2, D / 2 + 3.15, 'gable_window');
  add(B(3.4, 0.5, 0.4), accent, 0, WALL + 7.4, D / 2 + 3.2, 'gable_ornament');
  add(new THREE.SphereGeometry(0.5, 12, 8), accent, 0, WALL + 10.4, D / 2 + 1, 'finial');
  // ống khói
  add(B(2.2, 6, 2.2), M('chimney', c.chimney), -W / 2 + 5, WALL + 7, -2, 'chimney');
  add(B(2.8, 0.6, 2.8), trim, -W / 2 + 5, WALL + 10.2, -2, 'chimney_cap');

  // --- cửa vòm đôi + cửa sổ ---
  const door = new THREE.Group(); door.name = 'door'; door.position.set(0, 0, D / 2 + 0.05); shell.add(door);
  const arch = new THREE.Shape(); arch.moveTo(-2.6, 0); arch.lineTo(2.6, 0); arch.lineTo(2.6, 5.6);
  arch.absarc(0, 5.6, 2.6, 0, Math.PI, false); arch.closePath();
  const archFrame = new THREE.Mesh(new THREE.ExtrudeGeometry(arch, { depth: 0.3, bevelEnabled: false }), trim);
  archFrame.scale.set(1.15, 1.08, 1); archFrame.position.z = 0; archFrame.name = 'door_frame'; door.add(archFrame);
  const leafShape = (side) => {
    const s = new THREE.Shape();
    if (side < 0) { s.moveTo(-2.5, 0); s.lineTo(0, 0); s.lineTo(0, 8.1); s.absarc(0, 5.6, 2.5, Math.PI / 2, Math.PI, false); }
    else { s.moveTo(0, 0); s.lineTo(2.5, 0); s.lineTo(2.5, 5.6); s.absarc(0, 5.6, 2.5, 0, Math.PI / 2, false); }
    s.closePath(); return new THREE.ExtrudeGeometry(s, { depth: 0.35, bevelEnabled: false });
  };
  const leaves = [];
  for (const side of [-1, 1]) {
    const hinge = new THREE.Group(); hinge.name = side < 0 ? 'door_left' : 'door_right';
    hinge.position.set(side * 2.5, 0, 0.32); door.add(hinge);
    const leaf = new THREE.Mesh(leafShape(side), doorMat); leaf.position.x = -side * 2.5; leaf.castShadow = true; hinge.add(leaf);
    const port = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.18, 8, 20), accent); port.position.set(-side * 1.25, 5.2, 0.4); hinge.add(port);
    const pg = new THREE.Mesh(new THREE.CircleGeometry(0.7, 20), glass); pg.position.set(-side * 1.25, 5.2, 0.37); hinge.add(pg);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), accent); knob.position.set(-side * 0.4, 3.6, 0.5); hinge.add(knob);
    leaves.push({ hinge, side });
  }
  const windowAt = (x, y, z, ry, name) => {
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; g.name = name; shell.add(g);
    const fr = new THREE.Mesh(B(4.4, 5.4, 0.4), trim); fr.castShadow = true; g.add(fr);
    const gl = new THREE.Mesh(B(3.6, 4.6, 0.45), glass); g.add(gl);
    const mx = new THREE.Mesh(B(0.25, 4.6, 0.5), trim); g.add(mx);
    const my = new THREE.Mesh(B(3.6, 0.25, 0.5), trim); g.add(my);
    const sill = new THREE.Mesh(B(5, 0.4, 0.9), trim); sill.position.set(0, -2.9, 0.3); g.add(sill);
    for (const s of [-1, 1]) { const sh = new THREE.Mesh(B(1.1, 5.2, 0.3), roofDark); sh.position.set(s * 2.9, 0, 0.1); g.add(sh); }
    return g;
  };
  for (const x of [-9, -4.8, 4.8, 9]) if (Math.abs(x) > 6) windowAt(x, 5.6, D / 2 + 0.1, 0, 'window_front');
  windowAt(W / 2 + 0.1, 5.6, 2, Math.PI / 2, 'window_side_left');
  windowAt(-W / 2 - 0.1, 5.6, 2, -Math.PI / 2, 'window_side_right');   // cửa sổ phòng ngủ
  windowAt(W / 2 + 0.1, 5.6, -5, Math.PI / 2, 'window_side_left2');
  windowAt(-W / 2 - 0.1, 5.6, -5, -Math.PI / 2, 'window_side_right2');
  windowAt(-7, 5.6, -D / 2 - 0.1, Math.PI, 'window_back');
  windowAt(7, 5.6, -D / 2 - 0.1, Math.PI, 'window_back2');

  // --- hiên: sàn, cột, lan can, mái hiên, cầu thang ---
  const pz = D / 2 + PORCH / 2;
  add(B(W + 1, 0.6, PORCH), porchMat, 0, -0.3, pz, 'porch_floor');
  add(B(W + 1, BASE - 0.6, PORCH - 0.4), baseMat, 0, -BASE / 2 - 0.3, pz, 'porch_base');
  for (const x of [-W / 2, -W / 4 - 1, -3.6, 3.6, W / 4 + 1, W / 2]) {
    add(new THREE.CylinderGeometry(0.4, 0.45, WALL - 1.2, 10), trim, x, (WALL - 1.2) / 2, D / 2 + PORCH - 0.5, 'porch_column');
    add(B(1.1, 0.5, 1.1), accent, x, WALL - 1.0, D / 2 + PORCH - 0.5, 'column_cap');
  }
  const porchRoof = add(B(W + 2, 0.5, PORCH + 1.4), roof, 0, WALL - 0.4, pz + 0.3, 'porch_roof');
  porchRoof.rotation.x = 0.12;
  add(B(W + 2.1, 0.7, 0.4), trim, 0, WALL - 0.95, D / 2 + PORCH + 0.9, 'porch_fascia');
  for (const side of [-1, 1]) {        // lan can 2 bên cầu thang
    const x0 = side * 3.6, x1 = side * W / 2, len = Math.abs(x1 - x0), cx = (x0 + x1) / 2;
    add(B(len, 0.35, 0.35), trim, cx, 2.6, D / 2 + PORCH - 0.5, 'rail_top');
    add(B(len, 0.25, 0.3), trim, cx, 0.4, D / 2 + PORCH - 0.5, 'rail_bottom');
    for (let i = 0; i <= len; i += 1.1) add(B(0.22, 2.2, 0.22), trim, x0 + side * i, 1.5, D / 2 + PORCH - 0.5, 'baluster');
  }
  for (let i = 0; i < 4; i++) {
    add(B(7, 0.6, 1.2), porchMat, 0, -0.6 - i * 0.75, D / 2 + PORCH + 0.6 + i * 1.2, 'stair');
    add(B(7, 0.3, 1.25), trim, 0, -0.35 - i * 0.75, D / 2 + PORCH + 0.6 + i * 1.2, 'stair_nose');
  }
  const stairRail = [-3.8, 3.8].map((x) => add(B(0.35, 0.35, 5.2), trim, x, 0.2, D / 2 + PORCH + 2.6, 'stair_rail'));
  stairRail.forEach((r) => { r.rotation.x = 0.55; });

  // --- 4 chân ---
  const wood = new THREE.MeshStandardMaterial({ color: '#6b4226', roughness: 0.9 });
  const woodDark = new THREE.MeshStandardMaterial({ color: '#4e2f1a', roughness: 0.9 });
  const gold = new THREE.MeshStandardMaterial({ color: '#d9a53a', roughness: 0.45, metalness: 0.35 });
  const legs = HIPS.map(([hx, hz], i) => {
    const g = new THREE.Group(); g.name = ['leg_FL', 'leg_FR', 'leg_BL', 'leg_BR'][i]; root.add(g);
    const seg = (r0, r1, mat, name) => {
      const holder = new THREE.Group(); holder.name = name; g.add(holder);
      const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, 1, 10), mat); m.position.y = 0.5;
      m.castShadow = true; holder.add(m);
      for (const f of [0.18, 0.82]) {          // bó vàng
        const band = new THREE.Mesh(new THREE.CylinderGeometry(r0 * 1.08 + (r1 - r0) * f, r0 * 1.08 + (r1 - r0) * f, 0.05, 10), gold);
        band.position.y = f; band.castShadow = true; holder.add(band);
      }
      return holder;
    };
    const thigh = seg(1.35, 1.0, wood, 'thigh'), shin = seg(1.0, 0.75, woodDark, 'shin');
    const hip = new THREE.Mesh(new THREE.SphereGeometry(1.6, 14, 10), gold); hip.name = 'hip'; hip.castShadow = true; g.add(hip);
    const knee = new THREE.Mesh(new THREE.SphereGeometry(1.35, 14, 10), gold); knee.name = 'knee'; knee.castShadow = true; g.add(knee);
    const foot = new THREE.Group(); foot.name = 'foot'; g.add(foot);
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 2.3, 0.8, 12), wood); pad.position.y = 0.4; pad.castShadow = true; foot.add(pad);
    const ank = new THREE.Mesh(new THREE.SphereGeometry(1.0, 10, 8), gold); ank.position.y = 1.0; foot.add(ank);
    for (const a of [-0.55, 0, 0.55]) {        // móng nhọn
      const claw = new THREE.Mesh(new THREE.ConeGeometry(0.55, 2.4, 8), woodDark);
      claw.rotation.x = Math.PI / 2; claw.position.set(Math.sin(a) * 2.4, 0.35, Math.cos(a) * 2.4); claw.rotation.z = -a;
      claw.rotation.order = 'YXZ'; claw.rotation.y = a; claw.castShadow = true; foot.add(claw);
    }
    return { g, thigh, shin, hip, knee, foot, hx, hz, i, side: Math.sign(hx), front: Math.sign(hz) };
  });

  // --- IK + dáng đi ---
  const v = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const H = v(), F = v(), K = v(), dir = v(), pole = v(), tmp = v(), UP = v(0, 1, 0);
  const orient = (holder, a, b) => {
    holder.position.copy(a); tmp.subVectors(b, a); const len = Math.max(0.001, tmp.length());
    holder.scale.set(1, len, 1); holder.quaternion.setFromUnitVectors(UP, tmp.normalize());
  };
  const state = { legsOut: 1, lift: 1, walk: 0, kneel: 0 };

  function pose(p = {}) {
    const legsOut = p.legsOut ?? 1, lift = p.lift ?? 1, d = p.walk ?? 0, kneel = p.kneel ?? 0;
    const shake = p.shake ?? 0, walking = p.walking ?? (d !== 0), t = p.t ?? 0;
    Object.assign(state, { legsOut, lift, walk: d, kneel });
    const cyc = d / (2 * STRIDE);
    // thân: cao độ, nhún theo bước, lắc khi rũ đất
    const standY = STAND * (1 - 0.55 * kneel);
    let y = BASE + (standY - BASE) * smooth(lift);
    const bob = walking ? Math.abs(Math.sin(cyc * Math.PI * 2)) : 0;
    y -= bob * 0.9 * lift;
    body.position.set(Math.sin(t * 31) * 0.25 * shake, y, 0);
    body.rotation.set((p.pitch ?? 0) + (walking ? Math.sin(cyc * Math.PI * 4) * 0.012 : 0),
                      0,
                      (p.roll ?? 0) + (walking ? Math.sin(cyc * Math.PI * 2) * 0.03 : 0) + Math.sin(t * 27) * 0.035 * shake);
    body.updateMatrix();
    const k = Math.max(0.0001, legsOut);
    const l1 = L1 * (0.12 + 0.88 * smooth(k)), l2 = L2 * (0.12 + 0.88 * smooth(k));
    for (const L of legs) {
      L.g.visible = legsOut > 0.001;
      H.set(L.hx, -BASE + 0.8, L.hz).applyMatrix4(body.matrix);
      // chỗ đặt chân trên đất (dang ra ngoài + ra trước/sau)
      const spread = 10 + 3 * kneel;
      let fx = L.hx + L.side * spread, fz = L.hz + L.front * 3.5, fy = 0;
      if (walking && lift > 0.5) {
        const ph = ((cyc + PHASE[L.i]) % 1 + 1) % 1;
        if (ph < 0.5) fz += STRIDE / 2 - (ph / 0.5) * STRIDE;                  // chịu tải: bàn chân đứng yên trên đất
        else { const s = (ph - 0.5) / 0.5; fz += -STRIDE / 2 + s * STRIDE; fy = Math.sin(s * Math.PI) * 4.5; }
      }
      // khi chân chưa ra hết: bàn chân thu sát dưới tầng hầm, rồi hạ dần xuống đất
      const out = smooth(Math.min(1, legsOut * 1.25));
      const tuckX = L.hx + L.side * 1.5, tuckY = H.y - 1.5, tuckZ = L.hz;
      F.set(tuckX + (fx - tuckX) * out, tuckY + (fy + (p.footLift?.[L.i] ?? 0) - tuckY) * out, tuckZ + (fz - tuckZ) * out);
      // IK 2 đoạn: đầu gối hướng ra ngoài + lên trên
      dir.subVectors(F, H); let dl = dir.length();
      const maxL = l1 + l2 - 0.01, minL = Math.abs(l1 - l2) + 0.01;
      if (dl > maxL) { dir.setLength(maxL); F.copy(H).add(dir); dl = maxL; }
      if (dl < minL) dl = minL;
      dir.normalize();
      const a = (l1 * l1 - l2 * l2 + dl * dl) / (2 * dl), h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
      pole.set(L.side, 1.1, L.front * 0.3).normalize();
      pole.addScaledVector(dir, -pole.dot(dir)).normalize();
      K.copy(H).addScaledVector(dir, a).addScaledVector(pole, h);
      orient(L.thigh, H, K); orient(L.shin, K, F);
      L.hip.position.copy(H); L.knee.position.copy(K); L.foot.position.copy(F);
      L.foot.position.y = Math.max(F.y, 0) ; L.foot.rotation.y = L.side * 0.5;
      L.foot.scale.setScalar(0.35 + 0.65 * smooth(k));
    }
  }

  function setNight(k = 1) { glass.emissiveIntensity = k * 1.6; }
  // mở cửa: 0 → 1 (cánh trái/phải xoay ra ngoài)
  function setDoor(k = 0) { for (const { hinge, side } of leaves) hinge.rotation.y = side * k * 1.6; }

  pose({ legsOut: 0, lift: 0 });
  return {
    root, body, shell, legs, mats, style, pose, setNight, setDoor, state,
    dims: { W, D, WALL, BASE, PORCH, STAND, STRIDE },
    // điểm hiên (trong toạ độ thân) để đặt nhân vật: trước cửa
    porchPoint: [0, 0, D / 2 + 2.5],
  };
}

const smooth = (v) => { v = Math.min(1, Math.max(0, v)); return v * v * (3 - 2 * v); };
