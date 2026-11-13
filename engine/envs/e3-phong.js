// Bối cảnh 'e3-phong' — PHÒNG CỦA GÀ (tập 3, set `bedroom`; cả đêm lẫn sáng). Nội thất kín 34×30×13 stud, dựng bằng khối + canvas (không GLB).
// Sửa bối cảnh này CHỈ trong file này. Được episodes/<ep>/index.html nạp động khi shot ghi `env: "e3-phong"` → build(g, e, H).
// Thiết kế: kich-ban/ep003-goi/Thiet_ke_chung.md (bedroom) + episodes/ep003/nguon/thiet-ke-hinh.md §3 + kich-ban/ep003-goi/boi-canh/Boi_canh_02.jpg.
//
// QUY ƯỚC HƯỚNG: BẮC = −Z, ĐÔNG = +X, +Y lên; 1 stud; Gà cao ≈ 5,3. Phòng x −17..17, z −15..15, trần y=13. Tâm phòng = gốc (0,0,0).
//   (bắc)  z=−15   ┌───────────────────────────────────────┐
//          nightstand+đèn (−15.6,−13.9)  cửa sổ 3×2 ô (x −3.5)   kệ gỗ 2 ngăn (x 5.5)   cửa ban công (z −10) ┐
//   (tây)  giường đơn sát tường tây, đầu bắc, Bắp ở chân giường (z −6)                                    ĐÔNG x=17
//          thảm kem giữa phòng (1, 1)                                         gương đứng (13.9, 4.5) xoay về đầu giường
//          két teal (−15.6, 12.8) ── cửa phòng gỗ + chốt đồng (x −8.5) ──
//   (nam)  z=+15   └───────────────────────────────────────┘     camera "từ cửa vào" đứng ở khoảng (−8.5, 6, 13) nhìn về bắc.
//
// ĐIỂM CÓ TÊN (toạ độ env; y = mặt đứng/mặt đặt) — export PHONG_DIEM:
//   phong_giua [0,0,2]  giuong_nam [-15,2.95,-11] (Gà nằm, đầu trên gối, mặt chăn)  giuong_chan [-15,2.95,-6] (Bắp ngồi mép chân giường)
//   truoc_ke [5.5,0,-11]  truoc_cua_so [-3.5,0,-12]  truoc_guong [10.7,0,3]  cua_phong [-8.5,0,12.8]  truoc_ket [-12,0,12.8]
//   cua_ban_cong [14.5,0,-10]
// SLOT ĐẠO CỤ (PROP_SLOTS.byName; [x,y,z,ry]): ke_phong = mặt trên kệ [5.5,3.6,-13.9]; ket_ga = két teal ĐÃ DỰNG SẴN (coSan) [-15.6,0,12.8].
// ĐÊM / SÁNG: env tự đọc ánh sáng của shot (ctx.light; shot ghi time:'dem' → 'bedNight', còn lại → 'interior'): đêm = đèn bàn hổ phách + trăng xanh
//   lạnh qua cửa sổ; sáng = nắng vàng qua cửa sổ, đèn tắt. Không cần tham số riêng. Cửa phòng mở/đóng: e.setCuaPhong(0..1) (mặc định 0 = đóng).
export const LIGHT = 'bedNight';
export const ASSETS = [];
export const PHONG_DIEM = {
  phong_giua: [0, 0, 2], giuong_nam: [-15, 2.95, -11], giuong_chan: [-15, 2.95, -6], truoc_ke: [5.5, 0, -11], truoc_cua_so: [-3.5, 0, -12],
  truoc_guong: [10.7, 0, 3], cua_phong: [-8.5, 0, 12.8], truoc_ket: [-12, 0, 12.8], cua_ban_cong: [14.5, 0, -10],
};
export const PROP_SLOTS = {
  byName: { ke_phong: [5.5, 3.6, -13.9, 0], ket_ga: [-15.6, 0, 12.8, Math.PI / 2] },
  coSan: ['ket_ga'],
  floor: [[0, 0.05, 3, 0], [8, 0.05, 6, 0], [-6, 0.05, 4, 0]], wall: [[11, 7.5, -14.9, 0], [-9, 7.5, -14.9, 0]],
  camMax: 26,
};

import { createPuffy } from '../cloth.js';

export default function build(g, e, H) {
  const { ganTang, THREE, K, hash, LIGHTS, scene } = H;
  e.skybox = null; e.skyboxNight = null;   // nội thất: không dùng hộp trời
  e.diem = PHONG_DIEM;
  const R = e.room = new THREE.Group(); R.name = 'e3_phong_room'; g.add(R);
  const W = 34, D = 30, HH = 13, HX = W / 2, HZ = D / 2;
  const grp = (name, tang) => { const o = new THREE.Group(); o.name = name; R.add(ganTang(o, tang)); return o; };
  const F = grp('phong_vo', 'back'), mid = grp('phong_do_go', 'mid'), front = grp('phong_do_truoc', 'front');
  const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, ...o });
  const BOX = new THREE.BoxGeometry(1, 1, 1), SPH = new THREE.SphereGeometry(1, 14, 10), CYL = new THREE.CylinderGeometry(1, 1, 1, 14);
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _eu = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();
  const inst = (parent, name, geo, material, items, shadow = true) => {   // InstancedMesh tất định {p,s,r,c}
    const im = new THREE.InstancedMesh(geo, material, items.length); im.name = name;
    items.forEach((it, i) => { _eu.set(...(it.r || [0, 0, 0])); _q.setFromEuler(_eu); _p.set(...it.p); _s.set(...(it.s || [1, 1, 1])); im.setMatrixAt(i, _m.compose(_p, _q, _s)); if (it.c) im.setColorAt(i, _c.set(it.c)); });
    im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
    im.castShadow = shadow; im.receiveShadow = true; im.computeBoundingBox?.(); im.computeBoundingSphere?.(); parent.add(im); return im;
  };
  const white = std('#ffffff');
  const bb = (arr, w, h, d, x, yb, z, c, ry = 0) => arr.push({ p: [x, yb + h / 2, z], s: [w, h, d], r: [0, ry, 0], c });   // hộp theo ĐÁY
  const canvasTex = (w, h, draw) => { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
  const WOOD = '#7A4A28', WOOD2 = '#8A5A33', CREAM = '#E8D8C0', INDIGO = '#3A2E6A';

  // ---- chất liệu / texture ----
  const wallMat = std('#9a9ea8', { roughness: 0.92 });
  const floorTex = canvasTex(1024, 1024, (c, w, h) => {   // ván sàn chạy theo trục z (bắc–nam), mỗi ván một sắc
    const n = 17, pw = w / n; c.fillStyle = '#835428'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < n; i++) {
      let y = 0, k = 0;
      while (y < h) { const len = (0.35 + hash(i * 40 + k, 7) * 0.65) * h * 0.7; const sh = 0.9 + hash(i * 40 + k, 8) * 0.2; c.fillStyle = `rgb(${Math.round(132 * sh)},${Math.round(86 * sh)},${Math.round(50 * sh)})`; c.fillRect(i * pw + 1, y, pw - 2, len - 2); y += len; k++; }
    }
    c.strokeStyle = 'rgba(40,22,10,0.55)'; c.lineWidth = 2; for (let i = 0; i <= n; i++) { c.beginPath(); c.moveTo(i * pw, 0); c.lineTo(i * pw, h); c.stroke(); }
  });
  const rugTex = canvasTex(512, 384, (c, w, h) => {
    c.fillStyle = '#d2c0a4'; c.fillRect(0, 0, w, h); c.strokeStyle = '#eee2cc'; c.lineWidth = 7; c.strokeRect(20, 20, w - 40, h - 40); c.lineWidth = 3; c.strokeRect(38, 38, w - 76, h - 76);
    c.strokeStyle = 'rgba(120,96,64,0.10)'; c.lineWidth = 1; for (let i = 0; i < w; i += 16) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i, h); c.stroke(); } for (let i = 0; i < h; i += 16) { c.beginPath(); c.moveTo(0, i); c.lineTo(w, i); c.stroke(); }
  });
  const plaidTex = canvasTex(256, 256, (c, w, h) => {   // ca-rô nhạt trên chăn chàm (nền trong suốt)
    c.clearRect(0, 0, w, h); c.fillStyle = 'rgba(150,140,220,0.30)'; for (let i = 0; i < 6; i++) { c.fillRect(i * 43 + 6, 0, 10, h); c.fillRect(0, i * 43 + 6, w, 10); }
    c.fillStyle = 'rgba(10,8,40,0.18)'; for (let i = 0; i < 6; i++) { c.fillRect(i * 43 + 24, 0, 5, h); c.fillRect(0, i * 43 + 24, w, 5); }
  });
  const softTex = (rgb) => canvasTex(128, 128, (c, w, h) => { const gr = c.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2); gr.addColorStop(0, `rgba(${rgb},1)`); gr.addColorStop(0.5, `rgba(${rgb},0.45)`); gr.addColorStop(1, `rgba(${rgb},0)`); c.fillStyle = gr; c.fillRect(0, 0, w, h); });
  const viewTexOf = (night) => canvasTex(512, 512, (c, w, h) => {   // cảnh ngoài cửa: phố khối vuông
    const gr = c.createLinearGradient(0, 0, 0, h);
    if (night) { gr.addColorStop(0, '#080d2c'); gr.addColorStop(1, '#2c3b78'); } else { gr.addColorStop(0, '#76bdf0'); gr.addColorStop(1, '#e6f6ff'); }
    c.fillStyle = gr; c.fillRect(0, 0, w, h);
    if (night) {
      c.fillStyle = '#e8eeff'; for (let i = 0; i < 46; i++) c.fillRect(hash(i, 1) * w, hash(i, 2) * h * 0.5, 2 + (i % 3 === 0), 2);
      const mg = c.createRadialGradient(w * 0.72, h * 0.2, 6, w * 0.72, h * 0.2, 90); mg.addColorStop(0, 'rgba(207,224,255,0.9)'); mg.addColorStop(0.25, 'rgba(160,190,255,0.25)'); mg.addColorStop(1, 'rgba(160,190,255,0)'); c.fillStyle = mg; c.fillRect(0, 0, w, h);
      c.fillStyle = '#CFE0FF'; c.beginPath(); c.arc(w * 0.72, h * 0.2, 28, 0, 7); c.fill();
    } else {
      c.fillStyle = 'rgba(255,255,255,0.9)'; for (let i = 0; i < 5; i++) { const x = hash(i, 11) * w, y = 40 + hash(i, 12) * 160, r = 16 + hash(i, 13) * 16; for (let k = 0; k < 4; k++) { c.beginPath(); c.arc(x + k * r * 0.8, y + (k % 2) * -r * 0.3, r, 0, 7); c.fill(); } }
    }
    for (let i = 0; i < 9; i++) {   // khối nhà + cây phía xa
      const bw = 40 + hash(i, 21) * 50, bh = 90 + hash(i, 22) * 130, bx = i * 62 - 20 + hash(i, 23) * 20;
      c.fillStyle = night ? ['#0d1634', '#101c3e', '#0b1230'][i % 3] : ['#d7c3a6', '#c9d3e0', '#e3cfcf'][i % 3]; c.fillRect(bx, h - bh - 40, bw, bh + 40);
      for (let wy = 0; wy < 5; wy++) for (let wx = 0; wx < 2; wx++) { const lit = hash(i * 10 + wy * 3 + wx, 31) > 0.6; c.fillStyle = night ? (lit ? '#ffb347' : '#16224a') : '#9ec4e6'; c.fillRect(bx + 8 + wx * (bw / 2 - 4), h - bh - 28 + wy * 22, 11, 11); }
    }
    for (let i = 0; i < 6; i++) { const tx = 20 + i * 90 + hash(i, 41) * 30, th = 50 + hash(i, 42) * 40; c.fillStyle = night ? '#0a1a2a' : '#4E7A32'; c.fillRect(tx, h - th - 10, 46, th + 10); }
    c.fillStyle = night ? '#141a30' : '#8f8d96'; c.fillRect(0, h - 22, w, 22);
  });
  const viewNight = viewTexOf(true), viewDay = viewTexOf(false);
  const viewMats = [];   // vật liệu cảnh ngoài (đổi texture theo đêm/ngày)
  const viewMat = () => { const m = new THREE.MeshBasicMaterial({ map: viewNight, fog: false }); viewMats.push(m); return m; };

  // ---- tường = tấm phẳng có lỗ, mặt nhìn VÀO trong (FrontSide) → camera ngoài tường nhìn xuyên được. Cục bộ: x ngang, y cao, +z vào phòng ----
  const wallGeo = (len, holes) => {
    const sh = new THREE.Shape(); sh.moveTo(-len / 2 - 2, 0); sh.lineTo(len / 2 + 2, 0); sh.lineTo(len / 2 + 2, HH); sh.lineTo(-len / 2 - 2, HH); sh.closePath();
    for (const h of holes) { const p = new THREE.Path(); p.moveTo(h.c - h.hw, h.y0); p.lineTo(h.c - h.hw, h.y1); p.lineTo(h.c + h.hw, h.y1); p.lineTo(h.c + h.hw, h.y0); p.closePath(); sh.holes.push(p); }
    return new THREE.ShapeGeometry(sh);
  };
  // cục bộ → thế giới: bắc (ry 0, x→x) · nam (ry π, x→−x) · tây (ry π/2, x→−z) · đông (ry −π/2, x→+z)
  const WALLS = {
    north: { p: [0, -HZ], ry: 0, len: W, holes: [{ c: -3.5, hw: 3.3, y0: 4.8, y1: 10.6 }] },
    south: { p: [0, HZ], ry: Math.PI, len: W, holes: [{ c: 8.5, hw: 2.2, y0: 0, y1: 8.2 }] },
    west: { p: [-HX, 0], ry: Math.PI / 2, len: D, holes: [] },
    east: { p: [HX, 0], ry: -Math.PI / 2, len: D, holes: [{ c: -10, hw: 3, y0: 0, y1: 8.6 }] },
  };
  const WG = {};
  for (const [side, Wd] of Object.entries(WALLS)) {
    const gw = new THREE.Group(); gw.name = 'phong_tuong_' + side; gw.position.set(Wd.p[0], 0, Wd.p[1]); gw.rotation.y = Wd.ry; F.add(gw); WG[side] = gw;
    const wm = new THREE.Mesh(wallGeo(Wd.len, Wd.holes), wallMat); wm.name = 'phong_tuong'; wm.receiveShadow = true; gw.add(wm);
  }
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.7 })); fl.rotation.x = -Math.PI / 2; fl.position.y = 0.01; fl.name = 'phong_san'; fl.receiveShadow = true; F.add(fl);
  const ceMat = std('#dcb894', { emissive: new THREE.Color('#8a5a34'), emissiveIntensity: 0.3 }); const ce = new THREE.Mesh(new THREE.PlaneGeometry(W, D), ceMat); ce.rotation.x = Math.PI / 2; ce.position.y = HH; ce.name = 'phong_tran'; F.add(ce);

  // ---- ốp chân tường + phào trần (kem), chừa chỗ cửa ----
  const trim = [];
  const seg = (a, b, gaps) => { let cur = [[a, b]]; for (const [g0, g1] of gaps) cur = cur.flatMap(([x0, x1]) => { if (g1 <= x0 || g0 >= x1) return [[x0, x1]]; const o = []; if (g0 > x0) o.push([x0, g0]); if (g1 < x1) o.push([g1, x1]); return o; }); return cur; };
  for (const [x0, x1] of seg(-HX, HX, [])) { bb(trim, x1 - x0, 0.9, 0.3, (x0 + x1) / 2, 0, -HZ + 0.15, CREAM); bb(trim, x1 - x0, 0.7, 0.4, (x0 + x1) / 2, HH - 0.7, -HZ + 0.2, CREAM); }
  for (const [x0, x1] of seg(-HX, HX, [[-10.9, -6.1]])) { bb(trim, x1 - x0, 0.9, 0.3, (x0 + x1) / 2, 0, HZ - 0.15, CREAM); }
  bb(trim, W, 0.7, 0.4, 0, HH - 0.7, HZ - 0.2, CREAM);
  for (const [z0, z1] of seg(-HZ, HZ, [])) { bb(trim, 0.3, 0.9, z1 - z0, -HX + 0.15, 0, (z0 + z1) / 2, CREAM); bb(trim, 0.4, 0.7, z1 - z0, -HX + 0.2, HH - 0.7, (z0 + z1) / 2, CREAM); }
  for (const [z0, z1] of seg(-HZ, HZ, [[-13.2, -6.8]])) { bb(trim, 0.3, 0.9, z1 - z0, HX - 0.15, 0, (z0 + z1) / 2, CREAM); }
  bb(trim, 0.4, 0.7, D, HX - 0.2, HH - 0.7, 0, CREAM);
  inst(F, 'phong_phao_kem', BOX, white, trim, false);

  // ---- CỬA SỔ BẮC 3×2 ô (khung kem) + cảnh ngoài ----
  { const gw = WG.north, h = WALLS.north.holes[0], cx = h.c, wd = h.hw * 2, ht = h.y1 - h.y0, cy = (h.y0 + h.y1) / 2, it = [];
    bb(it, wd + 1.0, 0.45, 0.8, cx, h.y0 - 0.45, 0.35, CREAM); bb(it, wd + 0.8, 0.4, 0.5, cx, h.y1, 0.15, CREAM);                    // bậu + lanh tô
    bb(it, 0.5, ht + 0.4, 0.5, cx - h.hw - 0.2, h.y0 - 0.2, 0.15, CREAM); bb(it, 0.5, ht + 0.4, 0.5, cx + h.hw + 0.2, h.y0 - 0.2, 0.15, CREAM);
    bb(it, 0.22, ht, 0.3, cx - wd / 6, h.y0, 0.0, CREAM); bb(it, 0.22, ht, 0.3, cx + wd / 6, h.y0, 0.0, CREAM); bb(it, wd, 0.22, 0.3, cx, cy - 0.1, 0.0, CREAM);
    const im = inst(gw, 'phong_khung_cua_so', BOX, white, it, false);
    const out = new THREE.Mesh(new THREE.PlaneGeometry(wd + 10, ht + 10), viewMat()); out.position.set(cx, cy, -5); out.name = 'phong_canh_ngoai_cua_so'; gw.add(out);
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(wd, ht), new THREE.MeshBasicMaterial({ color: '#dff0ff', transparent: true, opacity: 0.1, depthWrite: false })); glass.position.set(cx, cy, 0.03); glass.name = 'phong_kinh_cua_so'; gw.add(glass);
  }
  // ---- CỬA KÍNH BAN CÔNG (tường đông, đoạn bắc; khung kem 2 ô) + ban công ngoài ----
  { const gw = WG.east, h = WALLS.east.holes[0], cx = h.c, wd = h.hw * 2, ht = h.y1 - h.y0, it = [], rail = [];
    bb(it, 0.5, ht + 0.4, 0.55, cx - h.hw - 0.2, 0, 0.15, CREAM); bb(it, 0.5, ht + 0.4, 0.55, cx + h.hw + 0.2, 0, 0.15, CREAM); bb(it, wd + 1, 0.45, 0.55, cx, h.y1, 0.15, CREAM);
    bb(it, 0.3, ht, 0.35, cx, 0, 0.0, CREAM); bb(it, wd, 0.3, 0.35, cx, 4.2, 0.0, CREAM); bb(it, wd, 0.3, 0.35, cx, 0.6, 0.0, CREAM);   // 2 ô ngang, 2 tầng kính
    inst(gw, 'phong_khung_cua_ban_cong', BOX, white, it, false);
    inst(gw, 'phong_tay_nam_cua_ban_cong', BOX, std('#3a3d44', { metalness: 0.5, roughness: 0.4 }), [{ p: [cx + 0.45, 4.2, 0.28], s: [0.18, 1.4, 0.2] }, { p: [cx - 0.45, 4.2, 0.28], s: [0.18, 1.4, 0.2] }], false);
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(wd, ht), new THREE.MeshBasicMaterial({ color: '#dff0ff', transparent: true, opacity: 0.1, depthWrite: false })); glass.position.set(cx, ht / 2, 0.03); glass.name = 'phong_kinh_ban_cong'; gw.add(glass);
    const bal = new THREE.Mesh(new THREE.PlaneGeometry(wd + 4, 5), std('#6E5A44')); bal.rotation.x = -Math.PI / 2; bal.position.set(cx, 0.0, -2.5); bal.name = 'phong_san_ban_cong'; gw.add(bal);
    const RC = '#2F5F4F';   // lan can xanh dầu khối dày
    bb(rail, wd + 4.4, 0.5, 0.5, cx, 3.0, -5.0, RC); bb(rail, 0.5, 0.5, 5, cx - h.hw - 2.2, 3.0, -2.5, RC); bb(rail, 0.5, 0.5, 5, cx + h.hw + 2.2, 3.0, -2.5, RC);
    for (let i = 0; i <= 8; i++) bb(rail, 0.3, 3.0, 0.3, cx - h.hw - 2.2 + i * ((wd + 4.4) / 8), 0, -5.0, RC);
    bb(rail, 0.4, 3.0, 0.4, cx - h.hw - 2.2, 0, -0.2, RC); bb(rail, 0.4, 3.0, 0.4, cx + h.hw + 2.2, 0, -0.2, RC);
    inst(gw, 'phong_lan_can', BOX, white, rail, false);
    const out = new THREE.Mesh(new THREE.PlaneGeometry(90, 40), viewMat()); out.position.set(cx, 14, -22); out.name = 'phong_canh_ngoai_ban_cong'; gw.add(out);
  }
  // ---- CỬA PHÒNG (tường nam) + chốt đồng nằm ngang + hành lang tối sau cửa ----
  const doorPivot = new THREE.Group(); doorPivot.name = 'phong_cua_phong';
  { const gw = WG.south, h = WALLS.south.holes[0], c = h.c, it = [];
    bb(it, 0.5, 8.5, 0.6, c - 2.45, 0, 0.1, CREAM); bb(it, 0.5, 8.5, 0.6, c + 2.45, 0, 0.1, CREAM); bb(it, 5.4, 0.5, 0.6, c, 8.2, 0.1, CREAM);
    inst(gw, 'phong_khung_cua_phong', BOX, white, it, false);
    const back = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 8.2), new THREE.MeshBasicMaterial({ color: '#3a2e28' })); back.position.set(c, 4.1, -0.9); back.name = 'phong_hanh_lang_toi'; gw.add(back);
    const slit = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 0.45), new THREE.MeshBasicMaterial({ color: '#ffd9a0' })); slit.position.set(c, 0.22, -0.7); slit.name = 'phong_khe_sang_duoi_cua'; gw.add(slit);
    // cánh cửa treo bản lề ở mép x = c + 2.1 (cục bộ); đóng: nằm trong lỗ (trong tường), mặt trong +z
    doorPivot.position.set(c + 2.1, 0, 0.0); gw.add(doorPivot);
    const leaf = new THREE.Group(); leaf.name = 'phong_canh_cua'; doorPivot.add(leaf);   // leaf cục bộ: x∈[−4.2,0]
    K.box(4.2, 7.95, 0.3, '#6A3F22', -2.1, 0.25 + 3.975, -0.05, 'phong_canh_cua_go', leaf);
    for (const y of [2.2, 5.8]) K.box(3.2, 2.7, 0.1, '#58331a', -2.1, y + 0.25, 0.12, 'phong_cua_o', leaf);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 8), std('#1b1b1e', { roughness: 0.4, metalness: 0.4 })); knob.position.set(-3.5, 4.0, 0.5); knob.name = 'phong_nam_cua'; leaf.add(knob);
    // CHỐT ĐỒNG nằm ngang (S001): đế + thanh trượt đang GÀI vào móc + núm kéo
    const brass = std('#C58B3C', { metalness: 0.75, roughness: 0.32 });
    const plate = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.9, 0.12), brass); plate.position.set(-2.0, 5.2, 0.2); plate.name = 'phong_chot_de'; leaf.add(plate);
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 2.4, 12), brass); rod.rotation.z = Math.PI / 2; rod.position.set(-2.4, 5.2, 0.36); rod.name = 'phong_chot_thanh'; leaf.add(rod);
    const nub = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 8), brass); nub.position.set(-1.35, 5.2, 0.5); nub.name = 'phong_chot_num'; leaf.add(nub);
    const keeper = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.7, 0.14), brass); keeper.position.set(-3.9, 5.2, 0.2); keeper.name = 'phong_chot_moc'; leaf.add(keeper);
    const slot = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.55, 0.12), std('#2a1a0e')); slot.position.set(-3.65, 5.2, 0.28); slot.name = 'phong_chot_ranh'; leaf.add(slot);
  }
  const setCuaPhong = (k) => { doorPivot.rotation.y = -k * Math.PI * 0.45; };   // mở vào trong phòng (+z cục bộ) khi k>0 — chỉ để đạo diễn dùng, mặc định 0
  e.setCuaPhong = setCuaPhong; e.cuaPhong = doorPivot;

  // ---- ĐỒ GỖ (một InstancedMesh khối + chi tiết riêng) ----
  const furn = [], front2 = [];
  // giường đơn sát tường tây, đầu bắc
  bb(furn, 3.8, 1.3, 7.6, -15, 0.45, -8.65, WOOD); for (const [lx, lz] of [[-16.7, -12.3], [-13.3, -12.3], [-16.7, -5.0], [-13.3, -5.0]]) bb(furn, 0.4, 0.5, 0.4, lx, 0, lz, '#5a3418');
  bb(furn, 3.5, 0.8, 7.2, -15, 1.75, -8.65, '#EDE3CF');                      // đệm (trắng kem), mặt đệm y 2.55
  bb(furn, 3.9, 3.5, 0.4, -15, 0.4, -12.65, WOOD); bb(furn, 3.9, 1.7, 0.35, -15, 0.4, -4.7, WOOD);   // đầu giường cao, chân giường thấp
  bb(furn, 3.7, 0.45, 5.6, -15, 2.5, -7.3, INDIGO); bb(furn, 0.14, 1.3, 5.6, -16.86, 1.65, -7.3, INDIGO); bb(furn, 0.14, 1.3, 5.6, -13.14, 1.65, -7.3, INDIGO); bb(furn, 3.7, 0.5, 0.35, -15, 2.5, -4.45, INDIGO);   // chăn chàm
  bb(furn, 3.7, 0.55, 0.8, -15, 2.5, -10.35, '#EDE3CF');                    // mép ga gấp gần gối
  // tủ nhỏ đầu giường (góc tây–bắc), ngăn kéo hướng đông
  bb(furn, 2.6, 2.8, 2.2, -15.6, 0, -13.9, WOOD2); bb(furn, 0.08, 0.95, 1.9, -14.27, 1.45, -13.9, '#6E4423'); bb(furn, 0.08, 0.95, 1.9, -14.27, 0.35, -13.9, '#6E4423'); bb(furn, 3.0, 0.2, 2.5, -15.5, 2.8, -13.85, WOOD2);
  // kệ gỗ thấp 2 ngăn bên phải cửa sổ (mặt trên y 3.6)
  const KX = 5.5, KZ = -13.9;
  bb(furn, 0.3, 3.6, 2.2, KX - 3.1, 0, KZ, WOOD2); bb(furn, 0.3, 3.6, 2.2, KX + 3.1, 0, KZ, WOOD2); bb(furn, 6.5, 0.3, 2.2, KX, 3.3, KZ, WOOD2);
  bb(furn, 6.0, 0.25, 2.0, KX, 1.65, KZ + 0.05, '#7d4f2b'); bb(furn, 6.0, 0.25, 2.0, KX, 0.15, KZ + 0.05, '#7d4f2b'); bb(furn, 6.0, 3.0, 0.12, KX, 0.3, -14.9, '#6e4423');
  // KÉT teal (coSan) góc tây–nam, mặt/núm quay hướng đông
  bb(furn, 2.6, 3.3, 3.0, -15.6, 0.25, 12.8, '#3a6a60'); bb(furn, 0.12, 2.8, 2.5, -14.27, 0.45, 12.8, '#315a51'); bb(furn, 0.14, 0.18, 0.18, -14.2, 0.2, 11.6, '#1b2e2a');
  for (const [lx, lz] of [[-16.6, 11.5], [-14.6, 11.5], [-16.6, 14.1], [-14.6, 14.1]]) bb(furn, 0.5, 0.25, 0.5, lx, 0, lz, '#1b2e2a');
  inst(mid, 'phong_khoi_go', BOX, white, furn);
  const brass2 = std('#C9A24A', { metalness: 0.7, roughness: 0.35 });
  { const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.22, 16), brass2); dial.rotation.z = Math.PI / 2; dial.position.set(-14.15, 2.1, 12.8); dial.name = 'ket_nup_xoay_dong'; mid.add(dial);
    const nb = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.9, 0.18), brass2); nb.position.set(-14.1, 2.1, 12.8); nb.name = 'ket_kim_chi'; mid.add(nb);
    const hd = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.9), brass2); hd.position.set(-14.1, 1.0, 13.5); hd.name = 'ket_tay_cam'; mid.add(hd);
    const knobD = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.28, 0.28), brass2); knobD.position.set(-14.1, 2.1, 11.7); knobD.name = 'ket_ban_le'; mid.add(knobD);
    for (const nm of ['nightstand_knob_a', 'nightstand_knob_b']) { const k = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), brass2); k.name = nm; k.position.set(-14.18, nm.endsWith('a') ? 1.45 : 0.35, -13.9); mid.add(k); }
  }
  // chăn ca-rô (tấm mỏng phủ mặt chăn) + gối bằng vải liền
  { const pl = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 5.5), new THREE.MeshStandardMaterial({ map: plaidTex, transparent: true, roughness: 0.95, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 })); pl.rotation.x = -Math.PI / 2; pl.position.set(-15, 2.96, -7.3); pl.name = 'phong_chan_ca_ro'; mid.add(pl);
    const pil = createPuffy(THREE, { a: 1.3, b: 0.42, c: 0.9, ex: 0.6, dent: 0.2, pinch: 0.5, seed: 3, name: 'phong_goi', color: '#EDE3CF' }); pil.position.set(-15, 3.0, -11.4); pil.rotation.y = 0.04; mid.add(pil);
    pil.traverse((o) => { if (o.isMesh && o.material) { o.material = o.material.clone(); o.material.color.set('#EDE3CF'); } });
  }
  // thảm kem giữa phòng
  { const rg = new THREE.Mesh(new THREE.PlaneGeometry(14, 9.5), new THREE.MeshStandardMaterial({ map: rugTex, roughness: 1 })); rg.rotation.x = -Math.PI / 2; rg.position.set(1, 0.045, 1); rg.name = 'phong_tham'; rg.receiveShadow = true; front.add(rg); }
  // đèn bàn hổ phách trên tủ đầu giường
  const shadeMat = new THREE.MeshStandardMaterial({ color: '#FFB347', emissive: new THREE.Color('#FFB347'), emissiveIntensity: 1.1, roughness: 0.6 });
  { const lb = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, 0.3, 14), std('#3b2a1c')); lb.position.set(-15.6, 3.05, -13.9); lb.name = 'den_ban_de'; front.add(lb);
    const ls = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.3, 8), std('#3b2a1c')); ls.position.set(-15.6, 3.8, -13.9); ls.name = 'den_ban_than'; front.add(ls);
    const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.95, 1.5, 4, 1, true), shadeMat); sh.rotation.y = Math.PI / 4; sh.position.set(-15.6, 5.0, -13.9); sh.name = 'den_ban_chup'; shadeMat.side = THREE.DoubleSide; front.add(sh);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 8), new THREE.MeshBasicMaterial({ color: '#fff0c8' })); bulb.position.set(-15.6, 4.9, -13.9); bulb.name = 'den_ban_bong'; front.add(bulb); e.bulb = bulb;
  }
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex('255,176,80'), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.55, fog: false })); glow.scale.set(7, 7, 1); glow.position.set(-15.2, 5.0, -13.4); glow.name = 'den_ban_quang'; front.add(glow);
  // GƯƠNG ĐỨNG khung gỗ, dựa tường đông (đoạn nam), xoay nghiêng về đầu giường. Kính = mặt sáng giả phản chiếu (không có đồ vật cố định trong gương).
  const mirror = new THREE.Group(); mirror.name = 'phong_guong'; mirror.position.set(13.9, 0, 4.5); mirror.rotation.y = -2.004; front.add(mirror);
  { const lean = new THREE.Group(); lean.rotation.x = -0.17; mirror.add(lean);
    const fr = []; const MH = 10.4, MW = 4.4; bb(fr, 0.42, MH, 0.5, -MW / 2 + 0.21, 0, 0, WOOD2); bb(fr, 0.42, MH, 0.5, MW / 2 - 0.21, 0, 0, WOOD2); bb(fr, MW, 0.42, 0.5, 0, 0, 0, WOOD2); bb(fr, MW, 0.42, 0.5, 0, MH - 0.42, 0, WOOD2); bb(fr, MW - 0.6, MH - 0.6, 0.12, 0, 0.3, -0.12, '#5a3a1e');
    inst(lean, 'phong_khung_guong', BOX, white, fr);
    const gtex = canvasTex(128, 256, (c, w, h) => { const gr = c.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#7c88a6'); gr.addColorStop(0.45, '#5f6a88'); gr.addColorStop(1, '#8a7c78'); c.fillStyle = gr; c.fillRect(0, 0, w, h); c.fillStyle = 'rgba(255,255,255,0.12)'; c.beginPath(); c.moveTo(w * 0.1, h); c.lineTo(w * 0.3, 0); c.lineTo(w * 0.45, 0); c.lineTo(w * 0.25, h); c.fill(); });
    const gl = new THREE.Mesh(new THREE.PlaneGeometry(MW - 0.8, MH - 0.8), new THREE.MeshStandardMaterial({ map: gtex, roughness: 0.45, metalness: 0.0, emissive: new THREE.Color('#aab4d4'), emissiveMap: gtex, emissiveIntensity: 0.45 })); gl.position.set(0, MH / 2, 0.27); gl.name = 'phong_guong_kinh'; lean.add(gl); }

  // ---- vệt sáng trăng / nắng trên sàn (cộng sáng) ----
  const patchMat = new THREE.MeshBasicMaterial({ map: softTex('255,255,255'), color: '#9fb8ff', transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const patches = [[-1.5, -7.5, 8, 6.5, 0], [11.5, -9.5, 7, 7.5, 0]].map(([x, z, w, d, ry], i) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), patchMat); m.rotation.x = -Math.PI / 2; m.rotation.z = ry; m.position.set(x, 0.06, z); m.name = 'phong_vet_sang_' + i; front.add(m); return m; });

  // mọi vật trong env: không để lớp vật liệu/bụi vá lên (màu theo bảng thiết kế); tường/trần không đổ bóng
  R.traverse((o) => { if (!o.isMesh) return; o.userData.matKind = 'none'; o.userData.grungeKind = 'none'; if (/^phong_(tuong|tran|san|canh_ngoai|kinh|hanh_lang|khe|vet_sang)/.test(o.name)) o.castShadow = false; });

  // ---- đêm / sáng ----
  e.pointSpec = { color: '#ffb25a', intensity: 4.0, distance: 55, decay: 1.2, pos: [-13.5, 5.6, -11.5] };
  const pool = scene.getObjectByName('interior_point');
  let nightNow = null;
  const setNight = (night) => {
    if (nightNow === night) return; nightNow = night;
    for (const m of viewMats) m.map = night ? viewNight : viewDay;
    shadeMat.emissiveIntensity = night ? 1.1 : 0.12; shadeMat.color.set(night ? '#FFB347' : '#d9a050'); e.bulb.material.color.set(night ? '#fff0c8' : '#d8c8a0'); glow.visible = night;
    wallMat.color.set(night ? '#9a9ea8' : '#b4b9cc'); patchMat.color.set(night ? '#9fb8ff' : '#fff0c0'); patchMat.opacity = night ? 0.22 : 0.4;
    e.pointSpec = night ? { color: '#ffb25a', intensity: 4.0, distance: 55, decay: 1.2, pos: [-13.5, 5.6, -11.5] } : { color: '#fff1d0', intensity: 1.1, distance: 60, decay: 1.2, pos: [-3.5, 9.5, -9] };
  };
  setNight(true);
  return { suSong: [], update(t, ctx) {
    const L = LIGHTS[(ctx && ctx.light) || e.light]; setNight(!!(L && L.night));
    if (pool && e.pointSpec) { const s = e.pointSpec; pool.color.set(s.color); pool.intensity = s.intensity; pool.distance = s.distance; pool.decay = s.decay; pool.position.set(...s.pos); }   // áp ngay trong khung này (applyPool chạy trước update)
  } };
}
