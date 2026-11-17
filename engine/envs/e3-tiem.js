// Bối cảnh 'e3-tiem' — HAI GIAN NỘI THẤT NHỎ của tập 3, đặt cách nhau 100 stud theo trục X (ngoài tầm nhìn của nhau):
//   TIỆM BÁNH (set `bakery`, gốc x=0) và TIỆM MAY (set `tailor`, gốc x=100). Mỗi gian kín 30×26×12 stud (x ±15, z ±13 quanh gốc, trần y=12), dựng bằng khối + canvas.
// Sửa bối cảnh này CHỈ trong file này. Được episodes/<ep>/index.html nạp động khi shot ghi `env: "e3-tiem"` → build(g, e, H).
// Thiết kế: episodes/ep003/nguon/thiet-ke-hinh.md §3 (bakery, tailor) + khung shot S004–S007. Quy ước: BẮC = −Z (tường sau), ĐÔNG = +X, camera/khách đứng phía +Z (nam).
//
//   TIỆM BÁNH (gốc 0)                                           TIỆM MAY (gốc 100)
//   tường bắc z=−13: kệ 3 tầng bánh (x −9.5) · biển ổ bánh (x −1)    tường bắc: kệ cao góc phải (x 109.5) có hộp mây/giấy
//   quầy gỗ x −8..9.5, z −5.5, mặt cao 3,15; HỐC dưới quầy x 3..6.6      bàn gỗ x 98.5..107.5, z −7 (mặt cao 2,8), 3 cuộn chỉ tím + 1 cuộn kem
//   bàn bày bánh (x −6, z −0.5) · cửa sổ tường đông (z −6)               ma-nơ-canh kem (x 110, z −10.5) · cửa sổ tường tây (z −5)
//   cửa + cửa kính mặt tiền tường nam                                    cửa gỗ tường nam (x 107)
//
// ĐIỂM CÓ TÊN (toạ độ env; y = mặt đứng/mặt đặt) — export TIEM_DIEM:
//   banh_quay [-1,0,-8.2]   chỗ chú bán bánh đứng sau quầy (mặt về +z)       banh_giua [0,0,2]   giữa gian phía khách
//   may_ban   [102,0,-9.9]  chỗ cô thợ may đứng sau bàn (mặt về +z)          may_giua  [100,0,2]  giữa gian phía khách
// SLOT ĐẠO CỤ (PROP_SLOTS.byName; [x,y,z,ry]): hoc_ket_banh = hốc trống dưới quầy [4.8,0,-5.5] (két đã mất; chỗ có vệt bột sạch);
//   hop_nhan = trên cánh dài bàn may [102.8,2.8,-6.6]. (Két tiền, hộp nhẫn do hệ đạo cụ đặt — env không dựng.)
// ĐÊM / SÁNG: env tự đọc ctx.light (shot time:'dem' → 'bedNight', còn lại → 'interior'): đêm = đèn treo hổ phách + cửa sổ xanh lam; sáng = nắng xanh lục qua cửa sổ.
//   Đèn điểm dùng chung bám theo gian mà camera đang đứng (camera x < 50 → tiệm bánh, ngược lại → tiệm may).
// ASSET ROBLOX (duyệt đợt 1, 14/11 — duyet/ep003/dot-01.ketqua.json; nguồn/tác giả trong assets/manifest.json): quầy, kệ bánh, tủ bày, giỏ bánh, thùng bánh dài, cửa kính,
//   bàn may, kệ hộp, giá cuộn, ma-nơ-canh, cuộn chỉ, đèn treo, cửa gỗ. ?rb=0 trên URL (hoặc thiếu model) → về bản dựng bằng khối cũ.
import { khop } from '../khop-tai-san.js';
export const LIGHT = 'interior';
export const ASSETS = ['tiem-banh-quay', 'tiem-banh-ke', 'tiem-banh-ban-bay', 'tiem-gio-banh', 'tiem-banh-dai', 'tiem-banh-cua', 'tiem-may-ban', 'tiem-may-ke', 'tiem-may-ke-vai', 'tiem-ma-no-canh', 'tiem-cuon-chi', 'tiem-den-treo', 'tiem-cua-may'].map((n) => 'nhap/' + n);
export const TIEM_DIEM = { banh_quay: [-1, 0, -8.2], banh_giua: [0, 0, 2], may_ban: [102, 0, -9.9], may_giua: [100, 0, 2] };
export const PROP_SLOTS = {
  byName: { hoc_ket_banh: [4.8, 0, -5.5, 0], hop_nhan: [102.8, 2.8, -6.6, 0] },
  floor: [[-8, 0.05, 3, 0], [108, 0.05, 3, 0]], wall: [[-6, 7, -12.9, 0], [106, 7, -12.9, 0]],
  camMax: 18,
};

export default function build(g, e, H) {
  const { ganTang, THREE, K, hash, LIGHTS, scene, stage, fit } = H;
  const RB = !/[?&]rb=0(&|$)/.test(globalThis.location?.search || '');
  const KHOP = /[?&]khop=1(&|$)/.test(globalThis.location?.search || '');   // khớp tài sản vào khối (mặc định TẮT)
  const _bx = new THREE.Box3(), _sz = new THREE.Vector3();
  // đặt GLB Roblox: kich = [rộng x, cao, sâu z] đích theo trục của model (trước khi xoay ry; co giãn không đều) | cao = chỉ cao (giữ tỉ lệ). Trả null khi tắt/thiếu → dùng bản khối.
  // khai loại vật liệu cho mesh (không nhân bản vật liệu); GLB Roblox/mặt sáng/ảnh vẽ/kính → 'none'
  const khaiVan = (m, kind) => { m.userData.matKind = kind; m.userData.matNguon = 'khai-bao'; m.userData.grungeKind = 'none'; };
  const khongVan = (m) => khaiVan(m, 'none');
  // góp ý 17/11 (nhóm B, s004): mảnh GLB còn màu phẳng → khai vân thư viện theo TÊN vật liệu [loại, màu mới, bỏ ảnh vân Roblox?]. Tắt: ?vanTiem=0
  const VAN_TIEM_ON = !/[?&]vanTiem=0(&|$)/.test(globalThis.location?.search || '');
  const VAN_TIEM = VAN_TIEM_ON && {
    'tiem-banh-quay': { mau_1: ['wood', '#8a5a33'], mau_3: ['wood', '#8a5a33', true] },   // thân tủ quầy trắng #f8f8f8 + tấm ốp ảnh xám (mau_3, lộ ở vách hốc s005) → gỗ nâu (storyboard s004)
    'tiem-banh-ke': { mau_1: ['wood', '#7a4e2c', true] },           // khung thép xanh xám (ảnh vân) → gỗ nâu; mau_0 = ảnh bánh, giữ
  };
  const rb = (id, parent, name, { p, ry = 0, kich, cao }) => {
    if (!RB || !fit) return null; const o = fit('nhap/' + id, kich ? kich[1] : cao); if (!o) return null;
    if (kich) {
      _bx.setFromObject(o); _bx.getSize(_sz);
      if (KHOP) {   // ?khop=1 (mặc định TẮT): khớp theo luật loại (cửa = tấm, còn lại = hộp ±15%) thay vì kéo méo X/Z không trần — docs/handoff/khop-khoi-tai-san.md
        const k = khop({ bbox: [_sz.x, _sz.y, _sz.z], vung: { x: [-kich[0] / 2, kich[0] / 2], y: [0, kich[1]], z: [-kich[2] / 2, kich[2] / 2] }, loai: /cua/.test(id) ? 'tam' : 'hop' });
        o.scale.set(k.scale[0], k.scale[1], k.scale[2]);
      } else o.scale.set(kich[0] / _sz.x, 1, kich[2] / _sz.z);
    }
    const g0 = new THREE.Group(); g0.name = name; g0.add(o); g0.position.set(...p); g0.rotation.y = ry;
    const vt = VAN_TIEM && VAN_TIEM[id];
    o.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; khongVan(m);
      if (vt) { for (const mt of [].concat(m.material)) { const k = vt[mt.name]; if (k && !mt.userData.matDecl) { mt.color.set(k[1]); if (k[2]) { mt.map = null; mt.needsUpdate = true; } mt.userData.matDecl = k[0]; mt.userData.matNguon = 'khai-bao'; } }
        if ([].concat(m.material).some((mt) => mt.userData.matDecl)) { delete m.userData.matKind; m.userData.matNguon = 'khai-bao'; } } } }); parent.add(g0); return g0;
  };
  e.skybox = null; e.skyboxNight = null;
  e.diem = TIEM_DIEM;
  const R = e.room = new THREE.Group(); R.name = 'e3_tiem_room'; g.add(R);
  const W = 30, D = 26, HH = 12, HX = W / 2, HZ = D / 2;
  const grp = (name, tang) => { const o = new THREE.Group(); o.name = name; R.add(ganTang(o, tang)); return o; };
  const F = grp('tiem_vo', 'back'), mid = grp('tiem_do_go', 'mid'), front = grp('tiem_do_truoc', 'front');
  const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, ...o });
  const BOX = new THREE.BoxGeometry(1, 1, 1), SPH = new THREE.SphereGeometry(1, 12, 8), CYL = new THREE.CylinderGeometry(1, 1, 1, 14);
  const ARC = new THREE.TorusGeometry(0.5, 0.2, 6, 10, Math.PI);   // sừng bò (croissant)
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _eu = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();
  const inst = (parent, name, geo, material, items, shadow = true) => {
    const im = new THREE.InstancedMesh(geo, material, items.length); im.name = name;
    items.forEach((it, i) => { _eu.set(...(it.r || [0, 0, 0])); _q.setFromEuler(_eu); _p.set(...it.p); _s.set(...(it.s || [1, 1, 1])); im.setMatrixAt(i, _m.compose(_p, _q, _s)); if (it.c) im.setColorAt(i, _c.set(it.c)); });
    im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
    im.castShadow = shadow; im.receiveShadow = true; im.computeBoundingBox?.(); im.computeBoundingSphere?.(); parent.add(im); return im;
  };
  const white = std('#ffffff');
  const bb = (arr, w, h, d, x, yb, z, c, ry = 0) => arr.push({ p: [x, yb + h / 2, z], s: [w, h, d], r: [0, ry, 0], c });
  const cyl = (arr, r, h, x, yb, z, c, rot) => arr.push({ p: [x, yb + h / 2, z], s: [r, h, r], r: rot || [0, 0, 0], c });
  const canvasTex = (w, h, draw) => { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
  const WOOD = '#8A5A33', CREAM = '#E8D8C0';

  // ---- texture ----
  // tường: UV của ShapeGeometry = đơn vị stud (x, y) → mỗi ô lặp rộng 1,2 stud × cao 12 stud (canvas 128×1024; đáy canvas = chân tường)
  const wallTex = (draw) => { const t = canvasTex(128, 1024, draw); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1 / 1.2, 1 / HH); return t; };
  const sy = (c, y) => 1024 * (1 - y / HH);   // y stud → toạ độ canvas
  const bakeryWall = wallTex((c, w, h) => {
    c.fillStyle = '#E8D3AE'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#8A5A33'; c.fillRect(0, sy(c, 3.4), w, h - sy(c, 3.4)); c.fillStyle = '#6e4423'; c.fillRect(0, sy(c, 3.65), w, sy(c, 3.4) - sy(c, 3.65));
    c.strokeStyle = 'rgba(50,28,12,0.7)'; c.lineWidth = 3; c.beginPath(); c.moveTo(1, sy(c, 3.4)); c.lineTo(1, h); c.moveTo(w / 2, sy(c, 3.4)); c.lineTo(w / 2, h); c.stroke();
    c.fillStyle = '#c8a26e'; c.fillRect(0, 0, w, sy(c, 11.4)); c.fillStyle = '#d9bf90'; c.fillRect(0, sy(c, 11.4), w, 8);
  });
  const tailorWall = wallTex((c, w, h) => {
    c.fillStyle = '#46576C'; c.fillRect(0, 0, w, h); c.strokeStyle = '#34445a'; c.lineWidth = 4; c.beginPath(); c.moveTo(2, 0); c.lineTo(2, h); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.05)'; c.lineWidth = 3; c.beginPath(); c.moveTo(w / 2, 0); c.lineTo(w / 2, h); c.stroke();
    c.fillStyle = CREAM; c.fillRect(0, sy(c, 0.9), w, h - sy(c, 0.9)); c.fillStyle = '#cdbd9f'; c.fillRect(0, sy(c, 0.95), w, 6); c.fillStyle = CREAM; c.fillRect(0, 0, w, sy(c, 11.4));
  });
  const floorTex = (base, vary) => canvasTex(1024, 1024, (c, w, h) => {   // ván sàn chạy theo trục z
    const n = 15, pw = w / n; c.fillStyle = base; c.fillRect(0, 0, w, h);
    for (let i = 0; i < n; i++) { let y = 0, k = 0; while (y < h) { const len = (0.3 + hash(i * 37 + k, 17) * 0.7) * h * 0.7; const sh = 0.88 + hash(i * 37 + k, 18) * 0.24; const [r, gg, b] = vary; c.fillStyle = `rgb(${Math.round(r * sh)},${Math.round(gg * sh)},${Math.round(b * sh)})`; c.fillRect(i * pw + 1, y, pw - 2, len - 2); y += len; k++; } }
    c.strokeStyle = 'rgba(40,22,10,0.5)'; c.lineWidth = 2; for (let i = 0; i <= n; i++) { c.beginPath(); c.moveTo(i * pw, 0); c.lineTo(i * pw, h); c.stroke(); }
  });
  const softTex = (rgb) => canvasTex(128, 128, (c, w, h) => { const gr = c.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2); gr.addColorStop(0, `rgba(${rgb},1)`); gr.addColorStop(0.5, `rgba(${rgb},0.45)`); gr.addColorStop(1, `rgba(${rgb},0)`); c.fillStyle = gr; c.fillRect(0, 0, w, h); });
  const viewTexOf = (night) => canvasTex(512, 512, (c, w, h) => {   // cảnh ngoài cửa sổ: sân cây xanh (ngày) / phố xanh lam có cửa sổ ấm (đêm)
    const gr = c.createLinearGradient(0, 0, 0, h);
    if (night) { gr.addColorStop(0, '#0a1034'); gr.addColorStop(1, '#2c3b78'); } else { gr.addColorStop(0, '#8fd0f5'); gr.addColorStop(1, '#e8f6e0'); }
    c.fillStyle = gr; c.fillRect(0, 0, w, h);
    if (night) { c.fillStyle = '#e8eeff'; for (let i = 0; i < 40; i++) c.fillRect(hash(i, 3) * w, hash(i, 4) * h * 0.45, 2, 2); c.fillStyle = '#CFE0FF'; c.beginPath(); c.arc(w * 0.78, h * 0.18, 24, 0, 7); c.fill(); }
    for (let i = 0; i < 8; i++) { const bw = 50 + hash(i, 5) * 50, bh = 80 + hash(i, 6) * 120, bx = i * 70 - 20; c.fillStyle = night ? '#0d1634' : ['#d7c3a6', '#c9d3e0', '#e3cfcf'][i % 3]; c.fillRect(bx, h - bh - 50, bw, bh + 50);
      for (let wy = 0; wy < 4; wy++) { const lit = hash(i * 7 + wy, 8) > 0.55; c.fillStyle = night ? (lit ? '#ffb347' : '#16224a') : '#a8cbe8'; c.fillRect(bx + 10, h - bh - 38 + wy * 26, 12, 12); c.fillRect(bx + bw - 24, h - bh - 38 + wy * 26, 12, 12); } }
    for (let i = 0; i < 12; i++) { const tx = hash(i, 9) * w, tr = 28 + hash(i, 10) * 26, ty = h - 70 + hash(i, 11) * 40; c.fillStyle = night ? '#0a2218' : ['#4E7A32', '#5d9040', '#3f6a2a'][i % 3]; c.beginPath(); c.arc(tx, ty, tr, 0, 7); c.fill(); }
    c.fillStyle = night ? '#141a30' : '#6fa054'; c.fillRect(0, h - 30, w, 30);
  });
  const viewNight = viewTexOf(true), viewDay = viewTexOf(false), viewMats = [], lampMats = [], patchMats = [];
  const viewMat = () => { const m = new THREE.MeshBasicMaterial({ map: viewDay, fog: false }); viewMats.push(m); return m; };
  const patchMat = new THREE.MeshBasicMaterial({ map: softTex('255,255,255'), color: '#fff0c0', transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });

  // ---- vỏ gian: tường có lỗ, sàn, trần ----
  const wallGeo = (len, holes) => {
    const sh = new THREE.Shape(); sh.moveTo(-len / 2 - 2, 0); sh.lineTo(len / 2 + 2, 0); sh.lineTo(len / 2 + 2, HH); sh.lineTo(-len / 2 - 2, HH); sh.closePath();
    for (const h of holes) { const p = new THREE.Path(); p.moveTo(h.c - h.hw, h.y0); p.lineTo(h.c - h.hw, h.y1); p.lineTo(h.c + h.hw, h.y1); p.lineTo(h.c + h.hw, h.y0); p.closePath(); sh.holes.push(p); }
    return new THREE.ShapeGeometry(sh);
  };
  // cục bộ → thế giới: bắc (x→x) · nam (x→−x) · tây (x→−z) · đông (x→+z)
  const SIDE = { north: { p: [0, -HZ], ry: 0, len: W }, south: { p: [0, HZ], ry: Math.PI, len: W }, west: { p: [-HX, 0], ry: Math.PI / 2, len: D }, east: { p: [HX, 0], ry: -Math.PI / 2, len: D } };
  const winFrame = (gw, h, color, cols, rows, view) => {   // khung cửa sổ + chấn song + cảnh ngoài + kính
    const cx = h.c, wd = h.hw * 2, ht = h.y1 - h.y0, it = [];
    bb(it, wd + 1.0, 0.45, 0.8, cx, h.y0 - 0.45, 0.35, color); bb(it, wd + 0.8, 0.4, 0.5, cx, h.y1, 0.15, color);
    bb(it, 0.5, ht + 0.4, 0.5, cx - h.hw - 0.2, h.y0 - 0.2, 0.15, color); bb(it, 0.5, ht + 0.4, 0.5, cx + h.hw + 0.2, h.y0 - 0.2, 0.15, color);
    for (let i = 1; i < cols; i++) bb(it, 0.22, ht, 0.3, cx - h.hw + i * wd / cols, h.y0, 0.0, color);
    for (let i = 1; i < rows; i++) bb(it, wd, 0.22, 0.3, cx, h.y0 + i * ht / rows - 0.11, 0.0, color);
    inst(gw, 'tiem_khung_cua_so', BOX, white, it, false);
    const out = new THREE.Mesh(new THREE.PlaneGeometry(wd + 10, ht + 10), viewMat()); out.position.set(cx, (h.y0 + h.y1) / 2, -5); out.name = 'tiem_canh_ngoai'; gw.add(out);
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(wd, ht), new THREE.MeshBasicMaterial({ color: '#dff0ff', transparent: true, opacity: 0.1, depthWrite: false })); glass.position.set(cx, (h.y0 + h.y1) / 2, 0.03); glass.name = 'tiem_kinh'; gw.add(glass);
  };
  const doorFrame = (gw, h, frameC, leafC, glass, glb) => {
    const c = h.c, it = [];
    bb(it, 0.5, h.y1 + 0.5, 0.6, c - h.hw - 0.25, 0, 0.1, frameC); bb(it, 0.5, h.y1 + 0.5, 0.6, c + h.hw + 0.25, 0, 0.1, frameC); bb(it, h.hw * 2 + 1, 0.5, 0.6, c, h.y1, 0.1, frameC);
    inst(gw, 'tiem_khung_cua', BOX, white, it, false);
    if (glb && rb(glb, gw, 'tiem_canh_cua', { p: [c, 0, 0], kich: [h.hw * 2, h.y1, 0.4] })) return;   // cánh cửa GLB Roblox (mặt trước −Z cục bộ = phía ngoài phố)
    K.box(h.hw * 2, h.y1 - 0.25, 0.3, leafC, c, (h.y1 - 0.25) / 2 + 0.25, -0.05, 'tiem_canh_cua', gw);
    const dk = '#' + new THREE.Color(leafC).multiplyScalar(0.78).getHexString();
    if (glass) { K.box(h.hw * 1.4, h.y1 * 0.45, 0.1, '#b9d8ea', c, h.y1 * 0.64, 0.12, 'tiem_cua_kinh', gw); K.box(h.hw * 1.6, 2.0, 0.1, dk, c, 1.9, 0.12, 'tiem_cua_o', gw); }
    else { K.box(h.hw * 1.5, 2.6, 0.1, dk, c, 5.3, 0.12, 'tiem_cua_o', gw); K.box(h.hw * 1.5, 2.6, 0.1, dk, c, 2.0, 0.12, 'tiem_cua_o', gw); }
    K.box(0.4, 0.4, 0.4, '#2a2f38', c - h.hw + 0.7, 3.6, 0.35, 'tiem_nam_cua', gw);
  };
  const shell = (P) => {
    const ox = P.ox, S = grp('tiem_vo_' + P.name, 'back'); F.add(S);
    for (const [side, Wd] of Object.entries(SIDE)) {
      const gw = new THREE.Group(); gw.name = `tiem_tuong_${P.name}_${side}`; gw.position.set(ox + Wd.p[0], 0, Wd.p[1]); gw.rotation.y = Wd.ry; S.add(gw);
      const holes = P.holes[side] || [];
      const wm = new THREE.Mesh(wallGeo(Wd.len, holes), P.wallMat); wm.name = 'tiem_tuong'; wm.receiveShadow = true; gw.add(wm);
      for (const h of holes) (h.door ? doorFrame(gw, h, P.frameC, P.doorC, P.doorGlass, P.doorGlb) : winFrame(gw, h, P.winC, h.cols || 2, h.rows || 3));
      if (P.extra?.[side]) P.extra[side](gw);
    }
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ map: P.floorTex, roughness: 0.7 })); fl.rotation.x = -Math.PI / 2; fl.position.set(ox, 0.01, 0); fl.name = 'tiem_san'; fl.receiveShadow = true; S.add(fl);
    const ce = new THREE.Mesh(new THREE.PlaneGeometry(W, D), std(P.ceil, { emissive: new THREE.Color('#8a6a44'), emissiveIntensity: 0.5 })); ce.rotation.x = Math.PI / 2; ce.position.set(ox, HH, 0); ce.name = 'tiem_tran'; S.add(ce);
    for (const [wx, wz, w0, d0] of P.patches || []) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w0, d0), patchMat); m.rotation.x = -Math.PI / 2; m.position.set(ox + wx, 0.06, wz); m.name = 'tiem_vet_sang'; S.add(m); }
  };
  const lamp = (parent, x, z) => {   // đèn treo chụp nón hổ phách
    if (rb('tiem-den-treo', parent, 'tiem_den_treo', { p: [x, 8.6, z], cao: 3.4 })) {   // GLB Roblox: dây chiếm ~65 % chiều cao, chao ở đáy; giữ bóng sáng dưới chao
      inst(parent, 'tiem_den_bong', SPH, new THREE.MeshBasicMaterial({ color: '#fff3cc' }), [{ p: [x, 8.85, z], s: [0.35, 0.35, 0.35] }], false); return;
    }
    inst(parent, 'tiem_day_den', BOX, white, [{ p: [x, 11.0, z], s: [0.12, 2.0, 0.12], c: '#222' }], false);
    const lm = new THREE.MeshStandardMaterial({ color: '#3b3733', emissive: new THREE.Color('#ffd27a'), emissiveIntensity: 0.4, side: THREE.DoubleSide }); lampMats.push(lm);
    inst(parent, 'tiem_den_treo', new THREE.CylinderGeometry(0.5, 1.8, 1.3, 14, 1, true), lm, [{ p: [x, 9.4, z] }], false);
    inst(parent, 'tiem_den_bong', SPH, new THREE.MeshBasicMaterial({ color: '#fff3cc' }), [{ p: [x, 9.0, z], s: [0.45, 0.45, 0.45] }], false);
  };
  const BR = ['#d9964a', '#c47a35', '#e8b66a', '#b86a2c', '#C98038'];
  const breadAt = (loaves, x, y, z, i, s = 1) => loaves.push({ p: [x, y, z], s: [0.95 * s, 0.5 * s, 0.65 * s], r: [0, hash(i, 91) * 3, 0], c: BR[i % 5] });
  const basket = (boxes, x, yb, z, w = 2.2, d = 1.6) => { bb(boxes, w, 0.8, d, x, yb, z, '#B8864A'); bb(boxes, w + 0.2, 0.14, d + 0.2, x, yb + 0.8, z, '#a07038'); };

  // ================= TIỆM BÁNH (gốc x=0) =================
  { const ox = 0, boxes = [], loaves = [], arcs = [], longs = [];
    const P = { name: 'banh', ox, wallMat: std(VAN_TIEM_ON ? '#f7e4c6' : '#ffffff', { map: bakeryWall, roughness: 0.9 }) /* 17/11: vữa be ấm như storyboard s004 (?vanTiem=0 về cũ) */, floorTex: floorTex('#9a6c3e', [168, 122, 74]), ceil: '#f4e4c4', winC: WOOD, frameC: '#6e4423', doorC: '#8A5A33', doorGlass: true, doorGlb: 'tiem-banh-cua',
      holes: { east: [{ c: -6, hw: 3.6, y0: 3.4, y1: 9.4, cols: 2, rows: 4 }], south: [{ c: 8, hw: 2.2, y0: 0, y1: 7.6, door: true }, { c: -5, hw: 4.5, y0: 3.2, y1: 9, cols: 4, rows: 3 }] },
      patches: [[11.5, -6, 6, 8]],
      extra: { north: (gw) => {   // biển ổ bánh (x −1, y 8.8) + khung
        const tex = canvasTex(1024, 576, (c, w, h) => { c.clearRect(0, 0, w, h); const sc = (x, y, rx, ry) => { c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, 7); c.fill(); };
          c.fillStyle = '#7A4A2A'; sc(w / 2, h / 2, w * 0.43, h * 0.4); for (let i = 0; i < 10; i++) { const a = i / 10 * 6.283; sc(w / 2 + Math.cos(a) * w * 0.42, h / 2 + Math.sin(a) * h * 0.39, 62, 56); } c.fillRect(w * 0.1, h * 0.12, w * 0.8, h * 0.76);
          c.strokeStyle = '#a87040'; c.lineWidth = 8; c.strokeRect(w * 0.1 + 14, h * 0.12 + 14, w * 0.8 - 28, h * 0.76 - 28);
          c.fillStyle = '#E0A030'; c.beginPath(); c.ellipse(w / 2, h / 2, w * 0.27, h * 0.2, -0.35, 0, 7); c.fill(); c.strokeStyle = '#7A4A2A'; c.lineWidth = 12; for (let k = -1; k <= 1; k++) { c.beginPath(); c.moveTo(w / 2 + k * 80 - 30, h / 2 - 60 + k * 14); c.lineTo(w / 2 + k * 80 + 20, h / 2 + 50 + k * 14); c.stroke(); } });
        const pm = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 3.6), new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: 0.5, roughness: 0.8 })); pm.position.set(-1, 8.8, 0.1); pm.name = 'tiem_bien_o_banh'; gw.add(pm);
      } } };
    shell(P);
    // kệ 3 tầng bánh ở tường bắc (trái), baskets + ổ bánh + bánh sừng bò — GLB Roblox: 2 giá thép 4 tầng chất bánh, cạnh nhau
    const keGlb = (/[?&]keBanhCu=1(&|$)/.test(globalThis.location?.search || '') ? [-12.1, -6.7] : [-2.16, 4.53]).map((x, i) =>   /* góp ý 3D 16/11: dời 2 giá bánh về giữa tường bắc (cũ −12,1 / −6,7: ?keBanhCu=1) */ rb('tiem-banh-ke', mid, 'tiem_banh_ke_' + i, { p: [ox + x, 0, -11.55], cao: 8.6 }));
    if (!keGlb[0]) { bb(boxes, 0.4, 7.6, 1.8, ox - 13.6, 0.4, -12.1, '#8a5a33'); bb(boxes, 0.4, 7.6, 1.8, ox - 9.5, 0.4, -12.1, '#8a5a33'); bb(boxes, 0.4, 7.6, 1.8, ox - 5.4, 0.4, -12.1, '#8a5a33');
    [3.4, 6.0, 8.6].forEach((y, lv) => { bb(boxes, 8.6, 0.35, 1.9, ox - 9.5, y - 0.35, -12.1, '#a8703c');
      [-12.4, -7.4].forEach((bx, k) => { basket(boxes, ox + bx, y, -12.1, 3.0, 1.5); for (let j = 0; j < 3; j++) breadAt(loaves, ox + bx - 0.9 + j * 0.9, y + 1.15, -12.1, lv * 9 + k * 3 + j, 0.9); });
      for (let j = 0; j < 3; j++) breadAt(loaves, ox - 10.4 + j * 1.0, y + 0.22, -12.0, lv * 11 + j + 40); }); }
    // quầy: mặt gỗ cao 3,15; HỐC dưới quầy x 3..6.6 xuyên suốt (hoc_ket_banh). Thân quầy = 4 tủ kính GLB Roblox (chừa hốc), mặt gỗ liền phía trên
    if (VAN_TIEM_ON) { const mq = new THREE.Mesh(BOX, std('#9a6a3a', { roughness: 0.75 })); mq.scale.set(18, 0.4, 3.6); mq.position.set(ox + 0.75, 2.95, -5.5); mq.name = 'tiem_quay_mat_go'; mq.castShadow = mq.receiveShadow = true; mid.add(mq); }   // 17/11: mặt quầy = mesh thường để lớp vật liệu vẽ vân gỗ (InstancedMesh bị bỏ qua → cam phẳng)
    else bb(boxes, 18, 0.4, 3.6, ox + 0.75, 2.75, -5.5, '#9a6a3a');
    // vách sau hốc két (s005: nhìn thẳng vào thấy hốc gỗ kín, không nhìn xuyên ra sau quầy). Tắt: ?hocSau=0
    if (!/[?&]hocSau=0(&|$)/.test(globalThis.location?.search || '')) { const hs = new THREE.Mesh(BOX, std('#7a4e2c', { roughness: 0.8 })); hs.scale.set(3.7, 2.75, 0.12); hs.position.set(ox + 4.8, 1.375, -6.9); hs.name = 'tiem_quay_hoc_sau'; hs.receiveShadow = true; mid.add(hs); }
    const quay = [[-6.25, 4], [-2.25, 4], [1.375, 3.25], [8.175, 3.15]].map(([x, w], i) => rb('tiem-banh-quay', mid, 'tiem_banh_quay_' + i, { p: [ox + x, 0, -5.5], kich: [w, 2.75, 2.9] }));
    if (!quay[0]) { bb(boxes, 11, 2.75, 2.9, ox - 2.5, 0, -5.5, WOOD); bb(boxes, 2.9, 2.75, 2.9, ox + 8.05, 0, -5.5, WOOD); }
    // lớp bột mỏng trong hốc + ô vuông SẠCH ở giữa (chỗ két vừa mất, s005): 4 dải bột quanh ô 1,6 × 1,6, thêm vệt bột tràn ra trước hốc
    // 17/11 (s005 "thiếu thứ miêu tả bị mất"): bột = 1 tấm ảnh vẽ có hạt + vệt loang ra trước hốc; ô sạch KHOÉT TRỐNG (lộ ván sàn) có gờ bột dồn
    // quanh mép + 2 vệt kéo ra phía trước (két bị lôi ra). Bản khối cũ (dải phẳng + ô nâu sẫm): ?botCu=1
    if (/[?&]botCu=1(&|$)/.test(globalThis.location?.search || '')) {
      for (const [w, d, x, z] of [[1.0, 2.9, 3.5, -5.5], [1.0, 2.9, 6.1, -5.5], [1.6, 0.65, 4.8, -4.375], [1.6, 0.65, 4.8, -6.625], [2.6, 0.7, 4.8, -3.7]]) bb(boxes, w, 0.03, d, ox + x, 0.005, z, '#efe7d8');
      bb(boxes, 1.6, 0.012, 1.6, ox + 4.8, 0.004, -5.5, '#5a3a22');
    } else {
      const bt = canvasTex(512, 512, (c, w, h) => {   // vùng x 3,0..6,6 · z −6,85 (đỉnh ảnh) .. −3,3 (đáy ảnh); mặt trước quầy z −4,05 ≈ 79% chiều cao
        let s = 7; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
        c.clearRect(0, 0, w, h); c.fillStyle = '#efe8da'; c.fillRect(0, 0, w, h * 0.79);
        for (let i = 0; i < 70; i++) { c.beginPath(); c.ellipse(w * (0.12 + 0.76 * rnd()), h * (0.76 + 0.17 * rnd()), 10 + 34 * rnd(), 6 + 16 * rnd(), 0, 0, 7); c.fill(); }
        c.globalCompositeOperation = 'source-atop';
        for (let i = 0; i < 3000; i++) { c.fillStyle = rnd() < 0.5 ? 'rgba(170,150,120,0.35)' : 'rgba(255,255,250,0.7)'; const r = 1 + 3 * rnd(); c.fillRect(w * rnd(), h * rnd(), r, r); }
        for (let i = 0; i < 14; i++) { c.fillStyle = 'rgba(200,185,160,0.18)'; c.beginPath(); c.ellipse(w * rnd(), h * 0.8 * rnd(), 20 + 50 * rnd(), 12 + 30 * rnd(), rnd() * 3, 0, 7); c.fill(); }
        const x0 = 256 - 114, y0 = 194 - 115, sw = 228, sh = 231;
        c.globalCompositeOperation = 'destination-out'; c.fillStyle = '#000'; c.fillRect(x0, y0, sw, sh);
        c.strokeStyle = 'rgba(0,0,0,0.55)'; c.lineCap = 'round'; c.lineWidth = 20; for (const dx of [40, sw - 40]) { c.beginPath(); c.moveTo(x0 + dx, y0 + sh); c.lineTo(x0 + dx + (dx < 100 ? -8 : 8), y0 + sh + 115); c.stroke(); }
        c.globalCompositeOperation = 'source-over'; c.strokeStyle = 'rgba(255,253,246,0.95)'; c.lineWidth = 7; c.strokeRect(x0 - 3, y0 - 3, sw + 6, sh + 6);
      });
      const bm = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 3.55), new THREE.MeshStandardMaterial({ map: bt, emissiveMap: bt, emissive: '#5a554a', transparent: true, depthWrite: false, roughness: 1 }));
      bm.rotation.x = -Math.PI / 2; bm.position.set(ox + 4.8, 0.03, -5.075); bm.name = 'tiem_hoc_bot'; bm.receiveShadow = true; mid.add(bm);
    }
    if (!quay[0]) { bb(boxes, 11.2, 0.2, 0.15, ox - 2.5, 1.55, -4.0, '#6e4423'); bb(boxes, 11.2, 0.2, 0.15, ox - 2.5, 0.5, -4.0, '#6e4423'); bb(boxes, 2.9, 0.2, 0.15, ox + 8.05, 1.55, -4.0, '#6e4423'); }
    // trên quầy: giỏ + ổ bánh + sừng bò (GLB Roblox: giỏ đan đựng bánh)
    const gio = [[0.0, -4.6, 0.2], [2.9, -4.7, -0.5]].map(([x, z, ry], i) => rb('tiem-gio-banh', mid, 'tiem_gio_banh_' + i, { p: [ox + x, 3.15, z], ry, cao: 1.4 }));
    if (!gio[0]) { basket(boxes, ox - 5.5, 3.15, -5.5, 2.6, 1.8); for (let j = 0; j < 3; j++) breadAt(loaves, ox - 6.2 + j * 0.9, 4.3, -5.5, j + 60);
      basket(boxes, ox - 1.2, 3.15, -4.9, 2.6, 1.8); for (let j = 0; j < 3; j++) arcs.push({ p: [ox - 2.0 + j * 0.85, 4.45, -4.9], s: [1, 1, 1], r: [Math.PI / 2 * 0 - 0.4, 0.6 + j, 0], c: '#C98038' }); }
    // bàn bày bánh bên khách (x −6, z −0.5): GLB Roblox = tủ gỗ trưng bày 2 kệ (mặt trước −Z của model → xoay 180° cho quay ra khách/máy phía +Z)
    if (!rb('tiem-banh-ban-bay', mid, 'tiem_banh_ban_bay', { p: [ox - 6, 0, -0.5], ry: Math.PI, cao: 4.6 })) {
      bb(boxes, 7, 0.35, 2.6, ox - 6, 2.2, -0.5, '#a8703c'); bb(boxes, 7.3, 0.12, 2.9, ox - 6, 2.55, -0.5, '#f4ece0');
      for (const [dx, dz] of [[-3.1, -1], [3.1, -1], [-3.1, 1], [3.1, 1]]) bb(boxes, 0.4, 2.2, 0.4, ox - 6 + dx, 0, -0.5 + dz, '#7a4528');
      [[-8, 0.2], [-6, -0.8], [-4, 0.1]].forEach(([bx, dz], k) => { basket(boxes, ox + bx, 2.67, -0.5 + dz, 1.9, 1.5); for (let j = 0; j < 2; j++) breadAt(loaves, ox + bx - 0.45 + j * 0.9, 3.9, -0.5 + dz, 80 + k * 2 + j, 0.95); });
      arcs.push({ p: [ox - 6.5, 3.95, -0.6], s: [1, 1, 1], r: [-0.3, 0.2, 0], c: '#C98038' }, { p: [ox - 4.4, 3.95, 0], s: [1, 1, 1], r: [-0.3, 1.8, 0], c: '#d08a40' }); }
    // bánh mì dài dựng trong thùng gần cửa sổ (đối trọng bên phải) — thùng gỗ nan GLB Roblox
    const thung = rb('tiem-banh-dai', mid, 'tiem_banh_dai_thung', { p: [ox + 12.5, 0, 3.5], kich: [3.0, 1.2, 2.0] });
    if (!thung) bb(boxes, 3.0, 1.3, 2.0, ox + 12.5, 0, 3.5, '#B8864A');
    for (let j = 0; j < 4; j++) longs.push({ p: [ox + 11.7 + j * 0.55, thung ? 1.9 : 2.2, 3.5], s: [0.3, 1.9, 0.3], r: [0, 0, (j - 1.5) * 0.12], c: BR[1 + (j % 3)] });
    inst(mid, 'tiem_banh_khoi_go', BOX, white, boxes); if (loaves.length) inst(mid, 'tiem_banh_o', SPH, white, loaves); if (arcs.length) inst(mid, 'tiem_banh_sung_bo', ARC, white, arcs); inst(mid, 'tiem_banh_dai', CYL, white, longs);
    lamp(front, ox - 5, -2); lamp(front, ox + 5, -2);
  }

  // ================= TIỆM MAY (gốc x=100) =================
  { const ox = 100, boxes = [], spools = [];
    const P = { name: 'may', ox, wallMat: std('#ffffff', { map: tailorWall, roughness: 0.9 }), floorTex: floorTex('#7a5636', [120, 84, 52]), ceil: '#f4eadb', winC: CREAM, frameC: CREAM, doorC: '#7A4A28', doorGlass: false, doorGlb: 'tiem-cua-may',
      holes: { west: [{ c: 5, hw: 3.6, y0: 3.4, y1: 9.4, cols: 2, rows: 3 }], south: [{ c: -7, hw: 2.2, y0: 0, y1: 7.6, door: true }] },
      patches: [[-11, -5, 6, 8]] };
    shell(P);
    // bàn gỗ (x 98.5..107.5, z −7, mặt cao 2,8) + 3 cuộn chỉ tím + 1 cuộn kem — GLB Roblox: bàn may chữ L có 2 máy may (mặt bàn ~0,68 chiều cao → cao 4,12 cho mặt 2,8)
    const ban = rb('tiem-may-ban', mid, 'tiem_may_ban', { p: [ox + 3, 0, -3.6], cao: 4.12 });
    if (!ban) { bb(boxes, 9.4, 0.4, 4.0, ox + 3, 2.4, -7, '#8A5A33'); bb(boxes, 8.6, 0.8, 0.2, ox + 3, 1.6, -5.1, '#6e4423'); bb(boxes, 8.6, 0.8, 0.2, ox + 3, 1.6, -8.9, '#6e4423');
      for (const [dx, dz] of [[-1.7, -1.6], [7.7, -1.6], [-1.7, 1.6], [7.7, 1.6]]) bb(boxes, 0.55, 2.4, 0.55, ox + dx, 0, -7 + dz, '#6e4423');
      // tấm vải trải góc bàn + cuộn chỉ
      bb(boxes, 3.0, 0.06, 2.0, ox + 0.8, 2.8, -7.2, '#D9C9A8'); }
    const chi = [[-1.0, -4.4], [-0.3, -3.6], [-1.0, -2.0], [1.5, -6.4]].map(([dx, z], i) => rb('tiem-cuon-chi', mid, 'tiem_cuon_chi_' + i, { p: [ox + dx, 2.8, z], cao: 1.5 }));
    if (!chi[0]) { [[0.2, -5.7, '#9A74B5'], [1.5, -5.4, '#9A74B5'], [2.7, -5.8, '#9A74B5']].forEach(([dx, z, c]) => { cyl(spools, 0.6, 1.6, ox + dx - 0.6, 2.8, z, c); cyl(spools, 0.78, 0.14, ox + dx - 0.6, 2.8, z, '#D9C9A8'); cyl(spools, 0.78, 0.14, ox + dx - 0.6, 4.26, z, '#D9C9A8'); });
      cyl(spools, 0.5, 1.4, ox - 0.3, 2.8, -8.2, '#D9C9A8'); cyl(spools, 0.66, 0.12, ox - 0.3, 2.8, -8.2, '#c4b08a'); cyl(spools, 0.66, 0.12, ox - 0.3, 4.08, -8.2, '#c4b08a'); }
    // kệ gỗ cao góc phải tường bắc (x 105..114, y 8) + hộp mây / hộp giấy kem — GLB Roblox: kệ gỗ 2 tầng chất thùng, đứng sàn ở NỬA TÂY tường bắc (nửa đông có ma-nơ-canh)
    if (!rb('tiem-may-ke', mid, 'tiem_may_ke', { p: [ox - 5.5, 0, -11.6], cao: 8.8 })) {
      bb(boxes, 9.4, 0.4, 2.2, ox + 9.5, 7.8, -11.9, '#8A5A33'); bb(boxes, 0.3, 0.9, 1.6, ox + 6, 6.9, -12.1, '#6e4423'); bb(boxes, 0.3, 0.9, 1.6, ox + 13, 6.9, -12.1, '#6e4423');
      [[6.8, '#B8864A', 2.4, 1.5], [9.4, '#D9C9A8', 2.2, 1.7], [12.0, '#B8864A', 2.0, 1.4]].forEach(([dx, c, w, h]) => { bb(boxes, w, h, 1.7, ox + dx + 1, 8.2, -11.9, c); bb(boxes, w + 0.15, 0.2, 1.85, ox + dx + 1, 8.2 + h, -11.9, c === '#B8864A' ? '#a07038' : '#c8b898'); });
      bb(boxes, 1.8, 1.0, 1.4, ox + 7.5, 10.4, -11.9, '#D9C9A8'); bb(boxes, 2.0, 0.9, 1.5, ox + 11.2, 10.4, -11.9, '#B8864A'); }
    // cuộn vải pastel trên giá tường đông (x 114.4) — GLB Roblox: xe kệ đỏ có cuộn, xoay dọc tường
    if (!rb('tiem-may-ke-vai', mid, 'tiem_may_ke_vai', { p: [ox + 13.9, 0, -2], ry: Math.PI / 2, cao: 4.3 })) {
      bb(boxes, 0.5, 4.8, 5.4, ox + 14.6, 0, -2, '#8A5A33'); bb(boxes, 1.2, 0.2, 5.4, ox + 14.2, 2.4, -2, '#6e4423');
      [['#9A74B5', 3.4], ['#D9C9A8', 3.4], ['#d8a0b4', 3.4], ['#7fa0c4', 4.7], ['#e8d28a', 4.7]].forEach(([c, y], i) => cyl(spools, 0.55, 3.8, ox + 14.1, y - 0.6, -3.7 + i * 0.95 - (y > 4 ? 0.5 : 0), c, [Math.PI / 2, 0, 0])); }
    if (boxes.length) inst(mid, 'tiem_may_khoi_go', BOX, white, boxes); if (spools.length) inst(mid, 'tiem_may_cuon', CYL, white, spools);
    // ma-nơ-canh kem, chân gỗ (x 110, z −10.5) — GLB Roblox, cao 7,3
    if (!/[?&]themManoCanh=0(&|$)/.test(globalThis.location?.search || '')) for (const [k, dx] of [[2, -3.784], [3, -6.325]]) rb('tiem-ma-no-canh', mid, 'tiem_ma_no_canh_' + k, { p: [ox + 10 + dx, 0, -10.5], cao: 7.3 });   // góp ý 3D 16/11: thêm 2 ma-nơ-canh xếp hàng về phía tây (tắt: ?themManoCanh=0)
    if (!rb('tiem-ma-no-canh', mid, 'tiem_ma_no_canh', { p: [ox + 10, 0, -10.5], cao: 7.3 })) { const mq = new THREE.Group(); mq.name = 'tiem_ma_no_canh'; mq.position.set(ox + 10, 0, -10.5); mid.add(mq); const kr = std('#D9C9A8', { roughness: 0.9 }), wd = std('#6e4423');
      const b1 = new THREE.Mesh(CYL, wd); b1.scale.set(1.4, 0.3, 1.4); b1.position.y = 0.15; b1.name = 'ma_no_de'; mq.add(b1);
      const pl = new THREE.Mesh(CYL, wd); pl.scale.set(0.16, 3.4, 0.16); pl.position.y = 1.9; pl.name = 'ma_no_cot'; mq.add(pl);
      const tr = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.35, 3.0, 14), kr); tr.position.y = 4.9; tr.name = 'ma_no_than'; mq.add(tr);
      const sh = new THREE.Mesh(SPH, kr); sh.scale.set(1.15, 0.55, 0.8); sh.position.y = 6.3; sh.name = 'ma_no_vai'; mq.add(sh);
      const nk = new THREE.Mesh(CYL, wd); nk.scale.set(0.3, 0.6, 0.3); nk.position.y = 6.7; nk.name = 'ma_no_co'; mq.add(nk);
      const kn = new THREE.Mesh(SPH, wd); kn.scale.set(0.34, 0.34, 0.34); kn.position.y = 7.15; kn.name = 'ma_no_nut'; mq.add(kn);
      mq.traverse((o) => { if (o.isMesh) o.castShadow = true; }); }
    // góp ý 17/11 (nhóm B, s006 "chi tiết áo ma-nơ-canh"): ma-nơ-canh vải lanh như storyboard — thân bọc vải kem, đường may chỉ nâu chạy dọc
    // (giữa trước, 2 đường chiết, 2 sườn, giữa sau) + vòng eo, cổ gỗ có núm, chân 3 càng gỗ. Đứng sau-TRÁI cô thợ may (bên phải bị tóc và vai cô che) để lọt khung s006. Tắt: ?manoS006=0
    if (!/[?&]manoS006=0(&|$)/.test(globalThis.location?.search || '')) {
      const mq = new THREE.Group(); mq.name = 'tiem_ma_no_canh_vai'; mq.position.set(ox + 1.4, 0, -11.85); mq.rotation.y = 0.2; mid.add(mq);
      const vai = std('#e9dcc2', { roughness: 0.95 }), go = std('#6e4423', { roughness: 0.7 }), chi = std('#6b4528', { roughness: 0.9 });
      const PR = [[0, 3.5], [0.9, 3.55], [1.12, 3.85], [1.08, 4.3], [0.86, 4.85], [0.84, 5.0], [0.98, 5.45], [1.1, 5.8], [1.04, 6.1], [0.78, 6.35], [0.34, 6.52], [0.001, 6.56]];
      const SX = 1.12, SZ = 0.74;
      const than = new THREE.Mesh(new THREE.LatheGeometry(PR.map(([r, y]) => new THREE.Vector2(r, y)), 28), vai); than.scale.set(SX, 1, SZ); than.name = 'ma_no_than'; mq.add(than);
      const rAt = (y) => { for (let i = 1; i < PR.length; i++) if (y <= PR[i][1]) { const [r0, y0] = PR[i - 1], [r1, y1] = PR[i]; return r0 + (r1 - r0) * (y - y0) / (y1 - y0); } return 0; };
      for (const a of [0, 0.55, -0.55, Math.PI / 2, -Math.PI / 2, Math.PI]) {
        const pts = []; for (let y = 3.6; y <= 6.31; y += 0.15) { const r = rAt(y) * 1.015; pts.push(new THREE.Vector3(Math.sin(a) * r * SX, y, Math.cos(a) * r * SZ)); }
        const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.03, 4), chi); m.name = 'ma_no_duong_may'; mq.add(m); }
      const re = rAt(4.95) * 1.015, eo = new THREE.Mesh(new THREE.TorusGeometry(1, 0.03, 4, 40), chi); eo.rotation.x = Math.PI / 2; eo.scale.set(re * SX, re * SZ, 1); eo.position.y = 4.95; eo.name = 'ma_no_duong_may_eo'; mq.add(eo);
      const part = (geo, mat, name, s, p, ry = 0) => { const m = new THREE.Mesh(geo, mat); m.scale.set(...s); m.position.set(...p); m.rotation.y = ry; m.name = name; mq.add(m); return m; };
      part(CYL, go, 'ma_no_co', [0.3, 0.5, 0.3], [0, 6.7, 0]); part(SPH, go, 'ma_no_nut', [0.32, 0.3, 0.32], [0, 7.05, 0]);
      part(CYL, go, 'ma_no_cot', [0.12, 3.1, 0.12], [0, 1.95, 0]); part(CYL, go, 'ma_no_de', [0.22, 0.5, 0.22], [0, 0.3, 0]);
      for (let i = 0; i < 3; i++) { const a = i * 2.094 + 0.5; part(BOX, go, 'ma_no_de_cang', [0.18, 0.14, 1.0], [Math.sin(a) * 0.5, 0.07, Math.cos(a) * 0.5], a); }
      mq.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    }
    lamp(front, ox - 3, -3); lamp(front, ox + 5, -3);
  }

  // bảng tên mesh → loại vật liệu thật (mesh đã khai từ trước, vd GLB Roblox, giữ nguyên). InstancedMesh bị lớp vật liệu bỏ qua nên chỉ khai cho đủ.
  const BANG_VAN = [
    [/^tiem_(canh_ngoai|kinh|vet_sang|bien_o_banh|cua_kinh|den_bong|hoc_bot)/, 'none'],   // sáng / ảnh vẽ / kính
    [/^tiem_tuong/, 'plaster'], [/^tiem_tran/, 'plaster'], [/^tiem_san/, 'wood'],
    [/^tiem_(canh_cua|cua_o)/, 'wood'], [/^tiem_nam_cua/, 'metalpaint'],
    [/^ma_no_(de|cot|co|nut)/, 'wood'], [/^ma_no_(than|vai)/, 'fabric'],
    [/^tiem_(khung|banh_khoi_go|may_khoi_go|quay_mat_go|quay_hoc_sau)/, 'wood'], [/^tiem_(may_cuon|day_den|den_treo)/, 'matte'],
    [/^tiem_banh_(o|sung_bo|dai)$/, 'matte'],
    [/./, 'matte'],   // luật vét
  ];
  R.traverse((o) => {
    if (!o.isMesh) return;
    if (/^tiem_(tuong|tran|san|canh_ngoai|kinh|vet_sang)/.test(o.name)) o.castShadow = false;
    if (o.userData.matKind) return;
    khaiVan(o, BANG_VAN.find(([re]) => re.test(o.name))[1]);
  });

  // ---- đêm / sáng + đèn điểm bám theo gian camera đang đứng ----
  const SPEC = { day: { color: '#ffe2b0', intensity: 1.3, distance: 60, decay: 1.2 }, night: { color: '#ffb25a', intensity: 3.2, distance: 55, decay: 1.2 } };
  const pool = scene.getObjectByName('interior_point');
  let nightNow = null;
  const setNight = (night) => {
    if (nightNow === night) return; nightNow = night;
    for (const m of viewMats) m.map = night ? viewNight : viewDay;
    for (const m of lampMats) m.emissiveIntensity = night ? 1.0 : 0.4;
    patchMat.color.set(night ? '#9fb8ff' : '#fff0c0'); patchMat.opacity = night ? 0.2 : 0.4;
  };
  setNight(true);
  e.pointSpec = { ...SPEC.day, pos: [0, 9.5, -3] };
  return { suSong: [], update(t, ctx) {
    const L = LIGHTS[(ctx && ctx.light) || e.light]; const night = !!(L && L.night); setNight(night);
    const ox = stage.camera.position.x < 50 ? 0 : 100;
    e.pointSpec = { ...(night ? SPEC.night : SPEC.day), pos: [ox, 9.5, -3] };
    if (pool) { const s = e.pointSpec; pool.color.set(s.color); pool.intensity = s.intensity; pool.distance = s.distance; pool.decay = s.decay; pool.position.set(...s.pos); }
  } };
}
