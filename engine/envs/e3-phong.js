// Bối cảnh 'e3-phong' — PHÒNG CỦA GÀ (tập 3, set `bedroom`; đêm lẫn sáng). Bản 2 (13/11): dựng lại ĐÚNG TỈ LỆ theo số Codex đo trên khung kịch bản
// (kich-ban/ep003-goi2/Bo_canh_kich_thuoc.json, G = chiều cao Gà = 5,2 stud): phòng rộng 2,8G × sâu 3,4G × cao 1,8G = 14,56 × 17,68 × 9,36 stud.
// Sửa bối cảnh này CHỈ trong file này. Trang tập nạp động khi shot ghi `env: "e3-phong"` → build(g, e, H).
//
// QUY ƯỚC: BẮC = −Z, ĐÔNG = +X, +Y lên; gốc (0,0,0) = tâm sàn. Tường A = bắc, B = đông, C = nam, D = tây (ký hiệu của Codex).
//   A (bắc, z −8,84): tủ đèn sau đầu giường (góc tây) · cửa sổ khung kem (x −3,85…0,10, bậu y 3,38) · kệ gỗ thấp (x 0,72…5,87, mặt y 3,22)
//   B (đông, x 7,28): cửa kính ra ban công (z −8,42…−4,78) · gương đứng (gần góc đông–nam, xoay mặt về tây-bắc)
//   C (nam, z 8,84):  cửa phòng (x −2,60…0,94, bản lề phía tây, mở vào trong) · két teal ở góc tây–nam, mặt số quay bắc
//   D (tây, x −7,28): giường đơn dọc tường (x −6,86…−2,76; z −7,07…0,63; đầu giường phía bắc; mặt chăn y 2,24)
//
// ĐIỂM CÓ TÊN (PHONG_DIEM, toạ độ thế giới; y = mặt đứng / mặt đặt) — shot dùng trực tiếp, đừng gõ lại số:
//   giuong_nam (gốc Gà khi nằm: chân; đầu về bắc) · giuong_ngoi (Gà ngồi dậy giữa giường) · giuong_chan (Bắp ngồi ở chân giường)
//   truoc_ke · ke_mat (tâm mặt kệ) · ke_dong_ho · ke_sach · ke_vet_day (vết dây chuyền trên bụi) · truoc_cua_so · cua_phong (ngưỡng) · chot_cua (chốt đồng)
//   truoc_ket · ket (tâm đáy két) · ket_trong (lòng két) · truoc_guong · guong (tâm kính) · cua_ban_cong · phong_giua
// THAM SỐ THEO SHOT (shot.envArg, số hoặc [đầu, cuối]): cuaPhong 0..1 (mở cửa phòng) · cuaSo 0..1 (mở cánh trái cửa sổ ra ngoài)
//   ketMo 0..1 (mở cửa két) · ketY (nhấc két lên, stud) · guong 0 = tắt phản chiếu thật (về mặt kính giả) · guongRy (xoay gương riêng cho shot, rad)
//   guongSang (nhân độ sáng ảnh trong gương, mặc định 1) · chanPhu 1 = chăn phủ lên người đang nằm (Gà nằm trong chăn, chỉ lộ đầu trên gối).
// VẬT LIỆU: mọi khối khai loại ở userData.matKind (docs/vat-lieu.md) → engine/materials.js vá vân thật; lớp bụi (grunge) tắt cho nội thất.
// ĐÊM / SÁNG: đọc ánh sáng của shot (time:'dem' → bedNight; còn lại → interior): đêm = đèn bàn hổ phách + trăng lam qua cửa sổ; sáng = nắng qua cửa sổ.
export const LIGHT = 'bedNight';
export const ASSETS = ['furniture-kit/pottedPlant', 'furniture-kit/coatRack'];   // lớp chi tiết 17/11 (?chiTietPhong=0 tắt)
const G = 5.2, W = 14.56, D = 17.68, HH = 9.36, HX = W / 2, HZ = D / 2;
const BX = -4.81, BED_Z0 = -7.07, BED_Z1 = 0.63, BED_W = 4.1, BED_TOP = 2.24;          // giường
const KX = 3.3, KZ = -8.14, KW = 5.15, KD = 1.4, KH = 3.22;                            // kệ gỗ thấp
const WIN = { c: -1.875, hw: 1.975, y0: 3.38, y1: 8.11 };                              // cửa sổ (tường bắc)
const DOOR = { c: -0.83, hw: 1.77, h: 6.5 };                                           // cửa phòng (tường nam), toạ độ thế giới
const BAL = { c: -6.6, hw: 1.82, h: 6.66 };                                            // cửa kính ban công (tường đông), c = z
const KET = { x: -5.12, z: 7.23, w: 2.44, d: 1.98, h: 2.65 };                          // két teal
const GUONG = { x: 5.17, z: 6.72, ry: -2.49, w: 4.06, h: 6.6, nga: 0.1 };   // góp ý 3D 16/11 (h31): dời về tây 0,7 + xoay thêm 12° (cũ x 5,9 z 6,3 ry −2,70)
//                 // gương đứng; ry −2,70 = nằm trên gối nhìn vào thấy đồng hồ trên kệ
export const PHONG_DIEM = {
  phong_giua: [1.0, 0, 1.2], giuong_nam: [BX, BED_TOP + 0.9, -0.9], giuong_ngoi: [BX, BED_TOP, -3.6], giuong_chan: [BX, BED_TOP, -0.35],
  truoc_ke: [KX, 0, KZ + 2.3], ke_mat: [KX, KH, KZ], ke_dong_ho: [KX + 0.55, KH, KZ + 0.05], ke_sach: [KX + 1.75, KH, KZ - 0.05], ke_vet_day: [KX - 0.75, KH, KZ + 0.1],
  truoc_cua_so: [-1.1, 0, -7.4], cua_phong: [DOOR.c, 0, HZ - 0.6], chot_cua: [DOOR.c + DOOR.hw - 0.55, 3.9, HZ - 0.2],
  truoc_ket: [KET.x + 0.3, 0, KET.z - 3.0], ket: [KET.x, 0, KET.z], ket_trong: [KET.x, 1.0, KET.z], truoc_guong: [3.6, 0, 4.2], guong: [GUONG.x, 3.5, GUONG.z],
  cua_ban_cong: [HX - 1.4, 0, BAL.c],
};
export const PROP_SLOTS = {
  byName: { ke_phong: [KX, KH, KZ, 0], ket_ga: [KET.x, 0, KET.z, Math.PI] },
  coSan: ['ket_ga'],
  floor: [[1.0, 0.05, 1.2, 0], [3.2, 0.05, 3.5, 0]], wall: [[4.5, 6.6, -HZ + 0.1, 0]],
  camMax: 14,
};

// GƯƠNG cho shot: tâm kính + pháp tuyến (ry = góc xoay gương, mặc định như dựng) và ảnh đối xứng của một điểm qua mặt gương —
// shot nhìn vật QUA GƯƠNG thì đặt máy nhìn vào phongPhanChieu(điểm vật).
export function phongGuong(ry = GUONG.ry) {
  const c = Math.cos(GUONG.nga), s = Math.sin(GUONG.nga), y = 0.5 + GUONG.h / 2, zl = -y * s + 0.1 * c, yl = y * c + 0.1 * s;
  return { tam: [GUONG.x + zl * Math.sin(ry), yl, GUONG.z + zl * Math.cos(ry)], n: [c * Math.sin(ry), s, c * Math.cos(ry)], t: [Math.cos(ry), 0, -Math.sin(ry)] };   // t = chiều ngang của mặt gương
}
export function phongPhanChieu(P, ry) {
  const { tam, n } = phongGuong(ry), d = (P[0] - tam[0]) * n[0] + (P[1] - tam[1]) * n[1] + (P[2] - tam[2]) * n[2];
  return [P[0] - 2 * d * n[0], P[1] - 2 * d * n[1], P[2] - 2 * d * n[2]];
}

import { createPuffy, createBedSoft } from '../cloth.js';

export default function build(g, e, H) {
  const { ganTang, THREE, hash, LIGHTS, scene } = H;
  e.skybox = null; e.skyboxNight = null;   // nội thất: không dùng hộp trời
  e.diem = PHONG_DIEM;
  const R = e.room = new THREE.Group(); R.name = 'e3_phong_room'; g.add(R);
  const grp = (name, tang) => { const o = new THREE.Group(); o.name = name; R.add(ganTang(o, tang)); return o; };
  const F = grp('phong_vo', 'back'), mid = grp('phong_do_go', 'mid'), front = grp('phong_do_truoc', 'front');
  const canvasTex = (w, h, draw) => { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
  // ---- khối có KHAI vật liệu: mỗi khối là một Mesh thường (InstancedMesh bị lớp vật liệu bỏ qua); vật liệu dùng chung theo (màu, loại) ----
  const MATS = new Map();
  const mat = (c, kind, o = {}) => { const k = c + '|' + kind + '|' + JSON.stringify(o); if (!MATS.has(k)) MATS.set(k, new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, ...o })); return MATS.get(k); };
  const tag = (m, kind, shadow = true) => { m.userData.matKind = kind; m.userData.grungeKind = 'none'; m.castShadow = shadow; m.receiveShadow = true; return m; };
  const box = (parent, name, w, h, d, x, yb, z, c, kind, o) => { const m = tag(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c, kind, o)), kind); m.name = name; m.position.set(x, yb + h / 2, z); parent.add(m); return m; };   // hộp đặt theo ĐÁY
  const cyl = (parent, name, r0, r1, h, x, yb, z, c, kind, o, seg = 16) => { const m = tag(new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, h, seg), mat(c, kind, o)), kind); m.name = name; m.position.set(x, yb + h / 2, z); parent.add(m); return m; };
  const none = (m) => { m.userData.matKind = 'none'; m.userData.grungeKind = 'none'; m.castShadow = false; return m; };   // mặt phát sáng / ảnh nền / kính trong
  const WOOD = '#8a5a33', WOOD_D = '#6e4423', CREAM = '#eadcc4', INDIGO = '#3b3470', TEAL = '#3a6a60', BRASS = '#c58b3c';

  // ---- ảnh vẽ ----
  const floorTex = canvasTex(1024, 1024, (c, w, h) => {   // ván sàn chạy bắc–nam
    const n = 16, pw = w / n; c.fillStyle = '#835428'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < n; i++) { let y = 0, k = 0; while (y < h) { const len = (0.35 + hash(i * 40 + k, 7) * 0.65) * h * 0.7, sh = 0.9 + hash(i * 40 + k, 8) * 0.2; c.fillStyle = `rgb(${Math.round(140 * sh)},${Math.round(92 * sh)},${Math.round(54 * sh)})`; c.fillRect(i * pw + 1, y, pw - 2, len - 2); y += len; k++; } }
    c.strokeStyle = 'rgba(40,22,10,0.5)'; c.lineWidth = 2; for (let i = 0; i <= n; i++) { c.beginPath(); c.moveTo(i * pw, 0); c.lineTo(i * pw, h); c.stroke(); }
  });
  const rugTex = canvasTex(512, 640, (c, w, h) => {
    c.fillStyle = '#cdbb9f'; c.fillRect(0, 0, w, h); c.strokeStyle = '#ece0ca'; c.lineWidth = 8; c.strokeRect(22, 22, w - 44, h - 44); c.lineWidth = 3; c.strokeRect(42, 42, w - 84, h - 84);
    c.strokeStyle = 'rgba(120,96,64,0.12)'; c.lineWidth = 1; for (let i = 0; i < w; i += 12) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i, h); c.stroke(); } for (let i = 0; i < h; i += 12) { c.beginPath(); c.moveTo(0, i); c.lineTo(w, i); c.stroke(); }
  });
  const plaidTex = canvasTex(256, 256, (c, w, h) => {   // chăn chàm ca-rô
    c.fillStyle = INDIGO; c.fillRect(0, 0, w, h); c.fillStyle = 'rgba(130,122,210,0.34)'; for (let i = 0; i < 4; i++) { c.fillRect(i * 64 + 8, 0, 14, h); c.fillRect(0, i * 64 + 8, w, 14); }
    c.fillStyle = 'rgba(14,10,46,0.28)'; for (let i = 0; i < 4; i++) { c.fillRect(i * 64 + 38, 0, 6, h); c.fillRect(0, i * 64 + 38, w, 6); }
  });
  plaidTex.wrapS = plaidTex.wrapT = THREE.RepeatWrapping;
  const softTex = (rgb) => canvasTex(128, 128, (c, w, h) => { const gr = c.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2); gr.addColorStop(0, `rgba(${rgb},1)`); gr.addColorStop(0.5, `rgba(${rgb},0.45)`); gr.addColorStop(1, `rgba(${rgb},0)`); c.fillStyle = gr; c.fillRect(0, 0, w, h); });
  const viewTexOf = (night) => canvasTex(512, 512, (c, w, h) => {   // cảnh ngoài cửa: phố khối vuông
    const gr = c.createLinearGradient(0, 0, 0, h);
    if (night) { gr.addColorStop(0, '#0a1034'); gr.addColorStop(1, '#2c3b78'); } else { gr.addColorStop(0, '#76bdf0'); gr.addColorStop(1, '#e6f6ff'); }
    c.fillStyle = gr; c.fillRect(0, 0, w, h);
    if (night) {
      c.fillStyle = '#e8eeff'; for (let i = 0; i < 46; i++) c.fillRect(hash(i, 1) * w, hash(i, 2) * h * 0.5, 2 + (i % 3 === 0), 2);
      const mg = c.createRadialGradient(w * 0.66, h * 0.2, 6, w * 0.66, h * 0.2, 90); mg.addColorStop(0, 'rgba(207,224,255,0.9)'); mg.addColorStop(0.25, 'rgba(160,190,255,0.25)'); mg.addColorStop(1, 'rgba(160,190,255,0)'); c.fillStyle = mg; c.fillRect(0, 0, w, h);
      c.fillStyle = '#CFE0FF'; c.beginPath(); c.arc(w * 0.66, h * 0.2, 26, 0, 7); c.fill();
    } else { c.fillStyle = 'rgba(255,255,255,0.9)'; for (let i = 0; i < 5; i++) { const x = hash(i, 11) * w, y = 40 + hash(i, 12) * 160, r = 16 + hash(i, 13) * 16; for (let k = 0; k < 4; k++) { c.beginPath(); c.arc(x + k * r * 0.8, y + (k % 2) * -r * 0.3, r, 0, 7); c.fill(); } } }
    for (let i = 0; i < 9; i++) {
      const bw = 40 + hash(i, 21) * 50, bh = 90 + hash(i, 22) * 130, bx = i * 62 - 20 + hash(i, 23) * 20;
      c.fillStyle = night ? ['#0d1634', '#101c3e', '#0b1230'][i % 3] : ['#d7c3a6', '#c9d3e0', '#e3cfcf'][i % 3]; c.fillRect(bx, h - bh - 40, bw, bh + 40);
      for (let wy = 0; wy < 5; wy++) for (let wx = 0; wx < 2; wx++) { const lit = hash(i * 10 + wy * 3 + wx, 31) > 0.6; c.fillStyle = night ? (lit ? '#ffb347' : '#16224a') : '#9ec4e6'; c.fillRect(bx + 8 + wx * (bw / 2 - 4), h - bh - 28 + wy * 22, 11, 11); }
    }
    for (let i = 0; i < 6; i++) { const tx = 20 + i * 90 + hash(i, 41) * 30, th = 50 + hash(i, 42) * 40; c.fillStyle = night ? '#0a1a2a' : '#4E7A32'; c.fillRect(tx, h - th - 10, 46, th + 10); }
    c.fillStyle = night ? '#141a30' : '#8f8d96'; c.fillRect(0, h - 22, w, 22);
  });
  let viewNight = viewTexOf(true), viewDay = viewTexOf(false);
  // 17/11 (góp ý "nhìn cửa sổ thấy ẢNH thị trấn"): ảnh chụp phố e3-pho thật từ trước nhà Gà, tầng 2 (assets/textures/env/e3-phong-cua-so-*.jpg, 1080×906).
  // ?anhPho=0 → về tranh vẽ canvas cũ. Mặt phẳng ban công (70×34) cắt dải giữa ảnh để không méo.
  const ANH_PHO = !/[?&]anhPho=0(&|$)/.test(globalThis.location?.search || '');
  const anhPho = {};
  if (ANH_PHO) {
    const TL = new THREE.TextureLoader(), ld = (f) => { const t = TL.load('/assets/textures/env/' + f); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
    anhPho.ngay = ld('e3-phong-cua-so-ngay.jpg'); anhPho.dem = ld('e3-phong-cua-so-dem.jpg');
    viewDay = anhPho.ngay; viewNight = anhPho.dem;
  }
  const viewMats = [];   // [vật liệu, kiểu]: kiểu 'bc' = mặt ban công (cắt dải giữa)
  const viewMat = (bc) => { const m = new THREE.MeshBasicMaterial({ map: viewNight, fog: false, toneMapped: !ANH_PHO }); m.userData.bc = !!bc; viewMats.push(m); return m; };
  const bcTex = ANH_PHO ? { ngay: anhPho.ngay.clone(), dem: anhPho.dem.clone() } : null;
  if (bcTex) for (const t of Object.values(bcTex)) { t.repeat.set(1, 1.19 / (70 / 34)); t.offset.set(0, (1 - t.repeat.y) * 0.45); t.needsUpdate = true; }
  const glassMat = new THREE.MeshBasicMaterial({ color: '#dff0ff', transparent: true, opacity: 0.1, depthWrite: false });

  // ---- VỎ PHÒNG: tường = tấm phẳng có lỗ, mặt nhìn VÀO trong → máy đứng ngoài tường vẫn nhìn xuyên vào được. Cục bộ: x ngang, y cao, +z vào phòng ----
  const wallMat = mat('#8b90a2', 'plaster', { roughness: 0.92 });
  const wallGeo = (len, holes) => {
    const sh = new THREE.Shape(); sh.moveTo(-len / 2, 0); sh.lineTo(len / 2, 0); sh.lineTo(len / 2, HH); sh.lineTo(-len / 2, HH); sh.closePath();
    for (const h of holes) { const p = new THREE.Path(); p.moveTo(h.c - h.hw, h.y0); p.lineTo(h.c - h.hw, h.y1); p.lineTo(h.c + h.hw, h.y1); p.lineTo(h.c + h.hw, h.y0); p.closePath(); sh.holes.push(p); }
    return new THREE.ShapeGeometry(sh);
  };
  // cục bộ → thế giới: bắc (ry 0: x→x) · nam (ry π: x→−x) · tây (ry π/2: x→−z) · đông (ry −π/2: x→+z)
  const WALLS = {
    north: { p: [0, -HZ], ry: 0, len: W, holes: [{ c: WIN.c, hw: WIN.hw, y0: WIN.y0, y1: WIN.y1 }] },
    south: { p: [0, HZ], ry: Math.PI, len: W, holes: [{ c: -DOOR.c, hw: DOOR.hw, y0: 0, y1: DOOR.h }] },
    west: { p: [-HX, 0], ry: Math.PI / 2, len: D, holes: [] },
    east: { p: [HX, 0], ry: -Math.PI / 2, len: D, holes: [{ c: BAL.c, hw: BAL.hw, y0: 0, y1: BAL.h }] },
  };
  const WG = {};
  for (const [side, Wd] of Object.entries(WALLS)) {
    const gw = new THREE.Group(); gw.name = 'phong_tuong_' + side; gw.position.set(Wd.p[0], 0, Wd.p[1]); gw.rotation.y = Wd.ry; F.add(gw); WG[side] = gw;
    const wm = tag(new THREE.Mesh(wallGeo(Wd.len, Wd.holes), wallMat), 'plaster', false); wm.name = 'phong_tuong'; gw.add(wm);
  }
  { // mặt NGOÀI tường bắc (ván xanh xô thơm của nhà Gà) — chỉ thấy khi máy đứng ngoài nhìn vào cửa sổ (s035)
    const om = tag(new THREE.Mesh(wallGeo(W + 8, WALLS.north.holes), mat('#8fa67a', 'woodpaint', { side: THREE.BackSide })), 'woodpaint', false); om.name = 'phong_tuong_ngoai_bac'; om.position.z = -0.3; WG.north.add(om);
  }
  const fl = tag(new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.7 })), 'wood', false); fl.rotation.x = -Math.PI / 2; fl.position.y = 0.01; fl.name = 'phong_san'; F.add(fl);
  const ce = tag(new THREE.Mesh(new THREE.PlaneGeometry(W, D), mat('#e2c39e', 'plaster', { emissive: new THREE.Color('#8a5a34'), emissiveIntensity: 0.25 })), 'plaster', false); ce.rotation.x = Math.PI / 2; ce.position.y = HH; ce.name = 'phong_tran'; F.add(ce);
  // ốp chân tường + phào trần (gỗ sơn kem), chừa chỗ cửa
  const dai = (name, x0, x1, z0, z1, yb, h) => box(F, name, Math.max(0.24, x1 - x0), h, Math.max(0.24, z1 - z0), (x0 + x1) / 2, yb, (z0 + z1) / 2, CREAM, 'woodpaint').castShadow = false;
  dai('phong_chan_tuong_bac', -HX, HX, -HZ, -HZ + 0.24, 0, 0.7); dai('phong_chan_tuong_tay', -HX, -HX + 0.24, -HZ, HZ, 0, 0.7);
  dai('phong_chan_tuong_nam_a', -HX, DOOR.c - DOOR.hw - 0.4, HZ - 0.24, HZ, 0, 0.7); dai('phong_chan_tuong_nam_b', DOOR.c + DOOR.hw + 0.4, HX, HZ - 0.24, HZ, 0, 0.7);
  dai('phong_chan_tuong_dong_a', HX - 0.24, HX, -HZ, BAL.c - BAL.hw - 0.4, 0, 0.7); dai('phong_chan_tuong_dong_b', HX - 0.24, HX, BAL.c + BAL.hw + 0.4, HZ, 0, 0.7);
  dai('phong_phao_bac', -HX, HX, -HZ, -HZ + 0.32, HH - 0.55, 0.55); dai('phong_phao_nam', -HX, HX, HZ - 0.32, HZ, HH - 0.55, 0.55);
  dai('phong_phao_tay', -HX, -HX + 0.32, -HZ, HZ, HH - 0.55, 0.55); dai('phong_phao_dong', HX - 0.32, HX, -HZ, HZ, HH - 0.55, 0.55);

  // ---- CỬA SỔ BẮC: khung kem, 2 cánh × 3 ô; cánh TRÁI (phía tây) mở ra ngoài theo ctx.cuaSo ----
  const winLeft = new THREE.Group(); winLeft.name = 'phong_canh_cua_so_trai';
  { const gw = WG.north, wd = WIN.hw * 2, ht = WIN.y1 - WIN.y0, cy = (WIN.y0 + WIN.y1) / 2;
    box(gw, 'phong_bau_cua_so', wd + 0.9, 0.36, 0.7, WIN.c, WIN.y0 - 0.36, 0.28, CREAM, 'woodpaint'); box(gw, 'phong_lanh_to_cua_so', wd + 0.7, 0.34, 0.4, WIN.c, WIN.y1, 0.12, CREAM, 'woodpaint');
    for (const sx of [-1, 1]) box(gw, 'phong_ne_cua_so', 0.36, ht + 0.3, 0.4, WIN.c + sx * (WIN.hw + 0.18), WIN.y0 - 0.15, 0.12, CREAM, 'woodpaint');
    const canh = (parent, x0) => {   // một cánh rộng wd/2, gốc cục bộ ở mép x0
      const cw = wd / 2;
      for (const x of [0.09, cw - 0.09]) box(parent, 'phong_cua_so_do_dung', 0.18, ht, 0.16, x0 + x, WIN.y0, 0, CREAM, 'woodpaint').castShadow = false;
      for (const y of [0, ht / 3, (2 * ht) / 3, ht - 0.16]) box(parent, 'phong_cua_so_do_ngang', cw, 0.16, 0.16, x0 + cw / 2, WIN.y0 + y, 0, CREAM, 'woodpaint').castShadow = false;
      const gl = none(new THREE.Mesh(new THREE.PlaneGeometry(cw, ht), glassMat)); gl.position.set(x0 + cw / 2, cy, 0); gl.name = 'phong_kinh_cua_so'; parent.add(gl);
    };
    winLeft.position.set(WIN.c - WIN.hw, 0, 0.02); gw.add(winLeft); canh(winLeft, 0);
    const right = new THREE.Group(); right.name = 'phong_canh_cua_so_phai'; right.position.set(WIN.c, 0, 0.02); gw.add(right); canh(right, 0);
    const out = none(new THREE.Mesh(new THREE.PlaneGeometry(wd + 16, ht + 12), viewMat())); out.position.set(WIN.c, cy + 0.5, -7); out.name = 'phong_canh_ngoai_cua_so'; gw.add(out);
  }
  // ---- CỬA KÍNH BAN CÔNG (tường đông, sát góc bắc) + ban công nhìn qua kính ----
  { const gw = WG.east, wd = BAL.hw * 2, c = BAL.c;
    for (const sx of [-1, 1]) box(gw, 'phong_ne_cua_ban_cong', 0.36, BAL.h + 0.3, 0.42, c + sx * (BAL.hw + 0.18), 0, 0.12, CREAM, 'woodpaint');
    box(gw, 'phong_lanh_to_cua_ban_cong', wd + 0.72, 0.36, 0.42, c, BAL.h, 0.12, CREAM, 'woodpaint');
    for (const x of [c - BAL.hw + 0.1, c - 0.1, c + 0.1, c + BAL.hw - 0.1]) box(gw, 'phong_cua_ban_cong_do_dung', 0.2, BAL.h, 0.18, x, 0, 0.02, CREAM, 'woodpaint').castShadow = false;
    for (const y of [0, 0.75, 3.5, BAL.h - 0.2]) box(gw, 'phong_cua_ban_cong_do_ngang', wd, 0.2, 0.18, c, y, 0.02, CREAM, 'woodpaint').castShadow = false;
    for (const sx of [-1, 1]) box(gw, 'phong_tay_nam_cua_ban_cong', 0.14, 0.9, 0.16, c + sx * 0.32, 3.0, 0.2, '#3a3d44', 'chrome', { metalness: 0.6, roughness: 0.4 });
    const gl = none(new THREE.Mesh(new THREE.PlaneGeometry(wd, BAL.h), glassMat)); gl.position.set(c, BAL.h / 2, 0.02); gl.name = 'phong_kinh_ban_cong'; gw.add(gl);
    box(gw, 'phong_san_ban_cong', 7.0, 0.3, 4.2, c + 0.6, -0.3, -2.1, '#6e5a44', 'tile').castShadow = false;
    const RC = '#39466a';   // lan can xanh lam sẫm, trụ dày
    box(gw, 'phong_lan_can_tay_vin', 7.2, 0.36, 0.4, c + 0.6, 3.07, -4.0, RC, 'woodpaint');
    for (let i = 0; i <= 8; i++) box(gw, 'phong_lan_can_song', i % 4 === 0 ? 0.42 : 0.2, 3.07, i % 4 === 0 ? 0.42 : 0.2, c + 0.6 - 3.5 + i * 0.875, 0, -4.0, RC, 'woodpaint').castShadow = false;
    const out = none(new THREE.Mesh(new THREE.PlaneGeometry(70, 34), viewMat(true))); out.position.set(c, 10, -20); out.name = 'phong_canh_ngoai_ban_cong'; gw.add(out);
  }
  // ---- CỬA PHÒNG (tường nam): cánh gỗ treo bản lề phía TÂY, mở vào trong; chốt đồng nằm ngang gài vào ngàm trên nẹp phía đông; hành lang tối sau cửa ----
  const doorPivot = new THREE.Group(); doorPivot.name = 'phong_cua_phong';
  { const x0 = DOOR.c - DOOR.hw, x1 = DOOR.c + DOOR.hw, dw = DOOR.hw * 2, z = HZ;
    box(F, 'phong_ne_cua_phong', 0.4, DOOR.h + 0.3, 0.5, x0 - 0.2, 0, z - 0.1, CREAM, 'woodpaint'); box(F, 'phong_ne_cua_phong', 0.4, DOOR.h + 0.3, 0.5, x1 + 0.2, 0, z - 0.1, CREAM, 'woodpaint');
    box(F, 'phong_lanh_to_cua_phong', dw + 0.8, 0.4, 0.5, DOOR.c, DOOR.h, z - 0.1, CREAM, 'woodpaint');
    const back = none(new THREE.Mesh(new THREE.PlaneGeometry(dw + 3, DOOR.h + 2), new THREE.MeshBasicMaterial({ color: '#3a2e28' }))); back.rotation.y = Math.PI; back.position.set(DOOR.c, DOOR.h / 2, z + 1.6); back.name = 'phong_hanh_lang_toi'; F.add(back);
    doorPivot.position.set(x0, 0, z - 0.05); F.add(doorPivot);   // cánh cục bộ: x ∈ [0, dw], mặt trong = −z
    box(doorPivot, 'phong_canh_cua_go', dw - 0.06, DOOR.h - 0.12, 0.26, dw / 2, 0.08, 0, '#6a3f22', 'wood');
    for (const y of [0.7, 3.6]) box(doorPivot, 'phong_cua_o', dw - 1.0, 2.4, 0.08, dw / 2, y, -0.15, '#58331a', 'wood').castShadow = false;
    const knob = tag(new THREE.Mesh(new THREE.SphereGeometry(0.3, 14, 10), mat('#1d1d20', 'chrome', { roughness: 0.4, metalness: 0.5 })), 'chrome'); knob.position.set(dw - 0.5, 3.05, -0.42); knob.name = 'phong_nam_cua'; doorPivot.add(knob);
    box(doorPivot, 'phong_nam_cua_de', 0.5, 0.9, 0.06, dw - 0.5, 2.6, -0.17, '#2a2a2e', 'chrome', { roughness: 0.45, metalness: 0.5 });
    // CHỐT ĐỒNG (S001): đế trên cánh + thanh trượt đang GÀI + núm kéo; ngàm nằm trên nẹp cửa phía đông
    const bm = { metalness: 0.6, roughness: 0.34, emissive: new THREE.Color('#5a3c12'), emissiveIntensity: 0.55 }, cy = PHONG_DIEM.chot_cua[1];   // đồng: giữ sắc vàng cả khi đêm lam
    box(doorPivot, 'phong_chot_de', 1.5, 0.62, 0.08, dw - 0.95, cy - 0.31, -0.17, BRASS, 'chrome', bm);
    const rod = cyl(doorPivot, 'phong_chot_thanh', 0.11, 0.11, 1.9, dw - 0.55, cy - 0.95, -0.27, BRASS, 'chrome', bm, 14); rod.rotation.z = Math.PI / 2; rod.position.y = cy;
    for (const x of [dw - 1.45, dw - 0.6]) box(doorPivot, 'phong_chot_dai', 0.2, 0.42, 0.22, x, cy - 0.21, -0.25, BRASS, 'chrome', bm);
    const nub = tag(new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 8), mat(BRASS, 'chrome', bm)), 'chrome'); nub.position.set(dw - 1.05, cy, -0.42); nub.name = 'phong_chot_num'; doorPivot.add(nub);
    box(F, 'phong_chot_ngam', 0.36, 0.56, 0.24, x1 + 0.2, cy - 0.28, z - 0.42, BRASS, 'chrome', bm);
    box(F, 'phong_chot_ngam_ranh', 0.1, 0.3, 0.2, x1 + 0.04, cy - 0.15, z - 0.42, '#2a1a0e', 'chrome', bm);
  }
  // ---- GIƯỜNG ĐƠN (dọc tường tây, đầu bắc): khung gỗ, đệm kem, chăn chàm ca-rô, gối ----
  { const zc = (BED_Z0 + BED_Z1) / 2, len = BED_Z1 - BED_Z0;
    box(mid, 'phong_giuong_khung', BED_W, 0.9, len, BX, 0.35, zc, WOOD, 'wood');
    for (const [lx, lz] of [[-1, BED_Z0 + 0.3], [1, BED_Z0 + 0.3], [-1, BED_Z1 - 0.3], [1, BED_Z1 - 0.3]]) box(mid, 'phong_giuong_chan', 0.4, 0.35, 0.4, BX + lx * (BED_W / 2 - 0.25), 0, lz, WOOD_D, 'wood');
    box(mid, 'phong_giuong_dau', BED_W, 3.5, 0.32, BX, 0, BED_Z0 + 0.16, WOOD, 'wood'); box(mid, 'phong_giuong_cuoi', BED_W, 1.75, 0.3, BX, 0, BED_Z1 - 0.15, WOOD, 'wood');
    box(mid, 'phong_dem', BED_W - 0.3, 0.75, len - 0.6, BX, 1.25, zc, '#ede3cf', 'fabric');
    const chanMat = () => { const t = plaidTex.clone(); t.needsUpdate = true; return new THREE.MeshStandardMaterial({ map: t, roughness: 0.95 }); };
    const cz0 = BED_Z0 + 2.5, cz1 = BED_Z1 - 0.32, cm = chanMat(); cm.map.repeat.set(2, 2.6);
    const ch = tag(new THREE.Mesh(new THREE.BoxGeometry(BED_W - 0.1, 0.26, cz1 - cz0), cm), 'fabric'); ch.name = 'phong_chan'; ch.position.set(BX, BED_TOP - 0.13, (cz0 + cz1) / 2); mid.add(ch);
    const cs = chanMat(); cs.map.repeat.set(2.6, 0.5);
    const hop = [ch];   // bản HỘP cũ của chăn (ô FX 'vaiGiuong' tắt thì hiện lại)
    for (const sx of [-1, 1]) { const m = tag(new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.0, cz1 - cz0), cs), 'fabric'); m.name = 'phong_chan_ru'; hop.push(m); m.position.set(BX + sx * (BED_W / 2 - 0.02), BED_TOP - 0.6, (cz0 + cz1) / 2); mid.add(m); }
    hop.push(box(mid, 'phong_ga_gap', BED_W - 0.2, 0.3, 0.7, BX, BED_TOP - 0.2, cz0 - 0.3, '#ede3cf', 'fabric'));
    const cp = chanMat(); cp.map.repeat.set(2, 2.4);   // chăn PHỦ NGƯỜI (ctx.chanPhu): gò chăn che thân Gà đang nằm
    const phu = tag(new THREE.Mesh(new THREE.BoxGeometry(BED_W - 0.5, 1.5, 3.5), cp), 'fabric'); phu.name = 'phong_chan_phu'; phu.position.set(BX, BED_TOP + 0.62, -2.5); phu.visible = false; mid.add(phu); e.chanPhu = phu;   // z −4,25…−0,75: phủ từ vai tới chân Gà, chừa góc chân giường cho Bắp
    const pil = createPuffy(THREE, { a: 1.35, b: 0.42, c: 0.85, ex: 0.6, dent: 0.2, pinch: 0.5, seed: 3, name: 'phong_goi', color: '#EDE3CF' }); pil.position.set(BX, BED_TOP + 0.12, BED_Z0 + 1.35); mid.add(pil);
    pil.traverse((o) => { if (o.isMesh && o.material) { o.material = o.material.clone(); o.material.color.set('#ede3cf'); tag(o, 'fabric'); } });
    // CHĂN VẢI MỀM (kế thừa ep001: engine/cloth.js createBedSoft — chăn rủ mềm + nếp gấp ga, thở theo t). Ô FX 'vaiGiuong' (mặc định bật).
    // Dựng CẢ HAI bản (hộp cũ + vải), update() chỉ đổi visible → tua tới/lui như nhau; tắt ô = hộp cũ y nguyên. Hai tấm vải: phẳng / gò theo người nằm (ctx.chanPhu).
    const sm = plaidTex.clone(); sm.needsUpdate = true; sm.repeat.set(0.5, 0.5);   // uv lưới vải tính bằng stud → 1 ô ca-rô = 2 stud như chăn hộp
    const vai = (name, lumps, w = BED_W - 0.3) => { const s = createBedSoft(THREE, { w, len, top: BED_TOP, edgeY: BED_TOP - 1.1, map: sm, foldColor: '#ede3cf', pillows: [], lumps, seed: 3 }); s.name = name; s.position.set(BX, 0, zc); s.visible = false; mid.add(s); return s; };
    e.chanVai = { hop, phang: vai('phong_chan_vai', []), phu: vai('phong_chan_vai_phu', [{ x: 0, z: -2.75 - zc, rx: 2.2, rz: 2.25, h: 1.6, p: 4 }], BED_W) };
    if (!/[?&]chanPhuCu=1(&|$)/.test(globalThis.location?.search || '')) { const q = e.chanVai.phu; q.position.x -= 0.13; q.position.y += 0.57; q.scale.x *= 1.28; }   // góp ý 3D 16/11 (h29): chăn phủ nâng 0,57 + rộng ×1,28 (cũ: ?chanPhuCu=1)   // gò hộp trùm thân Gà nằm (thân cao tới y 3,65; đo 15/11). Tay Gà dang rộng hơn đệm (x ±2,18, cao 3,95) nên vẫn ló ở hai mép như bản hộp cũ: gò rộng/cao hơn thì che mất đồng hồ trong gương ở s023
  }
  // ---- TỦ ĐÈN sau đầu giường (góc tây–bắc) + đèn bàn hổ phách ----
  const NX = -6.2, NZ = -HZ + 0.8, NH = 2.55;
  box(mid, 'phong_tu_den', 1.66, NH, 1.5, NX, 0, NZ, WOOD, 'wood'); box(mid, 'phong_tu_den_mat', 1.86, 0.16, 1.66, NX, NH, NZ, WOOD_D, 'wood');
  const shadeMat = new THREE.MeshStandardMaterial({ color: '#ffb347', emissive: new THREE.Color('#ffb347'), emissiveIntensity: 1.1, roughness: 0.6, side: THREE.DoubleSide });
  cyl(front, 'den_ban_de', 0.4, 0.5, 0.26, NX, NH + 0.16, NZ, '#3b2a1c', 'wood'); cyl(front, 'den_ban_than', 0.08, 0.08, 1.0, NX, NH + 0.42, NZ, '#3b2a1c', 'wood', {}, 8);
  { const sh = none(new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.78, 1.2, 4, 1, true), shadeMat)); sh.rotation.y = Math.PI / 4; sh.position.set(NX, NH + 1.9, NZ); sh.name = 'den_ban_chup'; front.add(sh);
    const bulb = none(new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), new THREE.MeshBasicMaterial({ color: '#fff0c8' }))); bulb.position.set(NX, NH + 1.8, NZ); bulb.name = 'den_ban_bong'; front.add(bulb); e.bulb = bulb; }
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex('255,176,80'), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.16, fog: false })); glow.scale.set(3.2, 3.2, 1); glow.position.set(NX + 0.2, NH + 1.9, NZ + 0.4); glow.name = 'den_ban_quang'; front.add(glow);
  // ---- KỆ GỖ THẤP 2 ngăn (bên phải cửa sổ) + lớp bụi có VẾT DÂY CHUYỀN (S002, S016–S019) ----
  { const x0 = KX - KW / 2, x1 = KX + KW / 2;
    for (const x of [x0 + 0.12, x1 - 0.12]) box(mid, 'phong_ke_hong', 0.24, KH - 0.22, KD, x, 0, KZ, WOOD, 'wood');
    box(mid, 'phong_ke_mat', KW + 0.16, 0.22, KD + 0.12, KX, KH - 0.22, KZ + 0.03, WOOD, 'wood');
    box(mid, 'phong_ke_tang_giua', KW - 0.4, 0.18, KD - 0.1, KX, 1.5, KZ, WOOD_D, 'wood'); box(mid, 'phong_ke_day', KW - 0.4, 0.2, KD - 0.1, KX, 0.12, KZ, WOOD_D, 'wood');
    box(mid, 'phong_ke_lung', KW - 0.3, KH - 0.4, 0.1, KX, 0.12, KZ - KD / 2 + 0.06, WOOD_D, 'wood').castShadow = false;
    const dust = canvasTex(512, 256, (c, w, h) => {   // bụi mỏng; vết sạch: vòng dây cong + giọt mặt dây
      c.clearRect(0, 0, w, h); c.fillStyle = 'rgba(214,202,180,0.5)'; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 260; i++) { c.fillStyle = `rgba(232,222,204,${0.1 + hash(i, 51) * 0.25})`; c.fillRect(hash(i, 52) * w, hash(i, 53) * h, 2 + hash(i, 54) * 3, 2); }
      c.globalCompositeOperation = 'destination-out'; c.lineCap = 'round'; c.lineWidth = 15; c.strokeStyle = 'rgba(0,0,0,0.95)';
      c.beginPath(); c.moveTo(w * 0.16, h * 0.34); c.bezierCurveTo(w * 0.3, h * 0.92, w * 0.5, h * 0.9, w * 0.62, h * 0.4); c.stroke();
      c.beginPath(); c.moveTo(w * 0.62, h * 0.4); c.bezierCurveTo(w * 0.66, h * 0.24, w * 0.56, h * 0.16, w * 0.48, h * 0.26); c.stroke();
      c.beginPath(); c.ellipse(w * 0.33, h * 0.66, 20, 27, 0.3, 0, 7); c.fill(); c.globalCompositeOperation = 'source-over';
    });
    const dm = none(new THREE.Mesh(new THREE.PlaneGeometry(2.3, 1.15), new THREE.MeshStandardMaterial({ map: dust, transparent: true, roughness: 1, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }))); dm.receiveShadow = true;
    dm.rotation.x = -Math.PI / 2; dm.position.set(PHONG_DIEM.ke_vet_day[0], KH + 0.012, PHONG_DIEM.ke_vet_day[2]); dm.name = 'phong_ke_vet_day'; mid.add(dm); e.vetDay = dm; dm.visible = globalThis.__vetDay !== false;   /* tập đặt globalThis.__vetDay = false để ẩn (ep003b: dây chuyền/đồng hồ nằm đúng chỗ này — góp ý 3D 16/11) */
  }
  // ---- KÉT TEAL (góc tây–nam, mặt số quay BẮC): thân rỗng + cửa bản lề phía TÂY + lòng két có đệm sẫm; nhấc/mở theo ctx ----
  const ket = new THREE.Group(); ket.name = 'phong_ket'; ket.position.set(KET.x, 0, KET.z); mid.add(ket);
  const ketDoor = new THREE.Group(); ketDoor.name = 'phong_ket_cua';
  { const { w, d, h } = KET, tm = { metalness: 0.2, roughness: 0.5 }, TD = '#2f574e', y0 = 0.2, t = 0.16;
    box(ket, 'ket_lung', w, h - y0, t, 0, y0, d / 2 - t / 2, TEAL, 'enamel', tm); box(ket, 'ket_noc', w, t, d, 0, h - t, 0, TEAL, 'enamel', tm); box(ket, 'ket_day', w, t, d, 0, y0, 0, TEAL, 'enamel', tm);
    for (const sx of [-1, 1]) box(ket, 'ket_hong', t, h - y0, d, sx * (w / 2 - t / 2), y0, 0, TEAL, 'enamel', tm);
    for (const [lx, lz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box(ket, 'ket_chan', 0.34, y0, 0.34, lx * (w / 2 - 0.3), 0, lz * (d / 2 - 0.3), '#1b2e2a', 'enamel', tm);
    box(ket, 'ket_long_dem', w - 0.4, 0.2, d - 0.4, 0, y0 + t, 0.02, '#2a1f2e', 'fabric').castShadow = false;
    const ins = none(new THREE.Mesh(new THREE.BoxGeometry(w - 0.34, h - y0 - 0.34, d - 0.34), new THREE.MeshBasicMaterial({ color: '#141a1c', side: THREE.BackSide }))); ins.position.set(0, (h + y0) / 2, 0); ins.name = 'ket_long_toi'; ket.add(ins);
    ketDoor.position.set(-w / 2 + 0.02, 0, -d / 2); ket.add(ketDoor);   // bản lề ở mép TÂY mặt trước (mặt trước = −z); cánh cục bộ x ∈ [0, w]
    box(ketDoor, 'ket_cua', w - 0.06, h - y0 - 0.06, 0.16, w / 2, y0 + 0.03, -0.06, TD, 'enamel', tm);
    const dial = cyl(ketDoor, 'ket_nup_xoay', 0.36, 0.36, 0.14, w * 0.6, 0, -0.2, '#c9a24a', 'enamel', { metalness: 0.3, roughness: 0.5 }, 20); dial.rotation.x = Math.PI / 2; dial.position.y = h * 0.6;
    box(ketDoor, 'ket_kim_chi', 0.07, 0.34, 0.05, w * 0.6, h * 0.6 - 0.05, -0.29, '#2a2014', 'chrome', { metalness: 0.6, roughness: 0.4 });
    box(ketDoor, 'ket_tay_cam', 0.7, 0.16, 0.2, w * 0.28, h * 0.34, -0.24, '#c9a24a', 'enamel', { metalness: 0.3, roughness: 0.5 });
    for (const y of [h * 0.3, h * 0.78]) box(ketDoor, 'ket_ban_le', 0.2, 0.36, 0.22, 0.05, y, -0.1, '#1b2e2a', 'enamel', tm);
  }
  // ---- THẢM KEM giữa phòng ----
  { const rg = tag(new THREE.Mesh(new THREE.PlaneGeometry(6.0, 7.8), new THREE.MeshStandardMaterial({ map: rugTex, roughness: 1 })), 'knit', false); rg.rotation.x = -Math.PI / 2; rg.position.set(1.0, 0.04, 1.2); rg.name = 'phong_tham'; front.add(rg); }
  // ---- GƯƠNG ĐỨNG khung gỗ (gần góc đông–nam, mặt quay về tây-bắc: nằm trên giường nhìn vào thấy kệ) — PHẢN CHIẾU THẬT ----
  const mirror = new THREE.Group(); mirror.name = 'phong_guong'; mirror.position.set(GUONG.x, 0, GUONG.z); mirror.rotation.y = GUONG.ry; front.add(mirror);
  const lean = new THREE.Group(); lean.rotation.x = -GUONG.nga; mirror.add(lean);
  const MW = GUONG.w, MH = GUONG.h, MY = 0.5;
  for (const sx of [-1, 1]) box(lean, 'phong_guong_khung', 0.34, MH, 0.36, sx * (MW / 2 - 0.17), MY, 0, WOOD, 'wood');
  box(lean, 'phong_guong_khung', MW, 0.34, 0.36, 0, MY, 0, WOOD, 'wood'); box(lean, 'phong_guong_khung', MW, 0.34, 0.36, 0, MY + MH - 0.34, 0, WOOD, 'wood');
  box(lean, 'phong_guong_lung', MW - 0.3, MH - 0.3, 0.1, 0, MY + 0.15, -0.14, WOOD_D, 'wood').castShadow = false;
  const gtex = canvasTex(128, 256, (c, w, h) => { const gr = c.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#7c88a6'); gr.addColorStop(0.45, '#5f6a88'); gr.addColorStop(1, '#8a7c78'); c.fillStyle = gr; c.fillRect(0, 0, w, h); c.fillStyle = 'rgba(255,255,255,0.12)'; c.beginPath(); c.moveTo(w * 0.1, h); c.lineTo(w * 0.3, 0); c.lineTo(w * 0.45, 0); c.lineTo(w * 0.25, h); c.fill(); });
  const fakeMat = new THREE.MeshStandardMaterial({ map: gtex, roughness: 0.45, emissive: new THREE.Color('#aab4d4'), emissiveMap: gtex, emissiveIntensity: 0.45 });
  // gương thật: vẽ cảnh từ máy đối xứng qua mặt gương vào ảnh trung gian rồi chiếu lên mặt kính (cùng cách với Reflector của three.js; hàm thuần của trạng thái cảnh)
  const rt = new THREE.WebGLRenderTarget(576, 936, { samples: 4, type: THREE.HalfFloatType });
  const texM = new THREE.Matrix4(), vcam = new THREE.PerspectiveCamera();
  const refMat = new THREE.ShaderMaterial({
    uniforms: { tDiffuse: { value: rt.texture }, textureMatrix: { value: texM }, tint: { value: new THREE.Color('#d3d9e6') } },
    vertexShader: 'uniform mat4 textureMatrix; varying vec4 vUv; void main() { vUv = textureMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform sampler2D tDiffuse; uniform vec3 tint; varying vec4 vUv;\nvoid main() { vec4 c = texture2DProj(tDiffuse, vUv); gl_FragColor = vec4(c.rgb * tint, 1.0);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}',
  });
  const glassM = none(new THREE.Mesh(new THREE.PlaneGeometry(MW - 0.66, MH - 0.66), refMat)); glassM.position.set(0, MY + MH / 2, 0.1); glassM.name = 'phong_guong_kinh'; lean.add(glassM);
  { const P = new THREE.Vector3(), N = new THREE.Vector3(), C = new THREE.Vector3(), V = new THREE.Vector3(), T = new THREE.Vector3(), rotM = new THREE.Matrix4(), plane = new THREE.Plane(), clip = new THREE.Vector4(), q = new THREE.Vector4();
    let busy = false;
    glassM.onBeforeRender = (renderer, sc, camera) => {
      if (busy || glassM.material !== refMat) return;
      P.setFromMatrixPosition(glassM.matrixWorld); C.setFromMatrixPosition(camera.matrixWorld); rotM.extractRotation(glassM.matrixWorld); N.set(0, 0, 1).applyMatrix4(rotM);
      V.subVectors(P, C); if (V.dot(N) > 0) return;   // máy ở sau gương
      V.reflect(N).negate().add(P);
      rotM.extractRotation(camera.matrixWorld); T.set(0, 0, -1).applyMatrix4(rotM).add(C); T.subVectors(P, T).reflect(N).negate().add(P);
      vcam.position.copy(V); vcam.up.set(0, 1, 0).applyMatrix4(rotM).reflect(N); vcam.lookAt(T); vcam.near = camera.near; vcam.far = camera.far; vcam.updateMatrixWorld(); vcam.projectionMatrix.copy(camera.projectionMatrix);
      texM.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1); texM.multiply(vcam.projectionMatrix); texM.multiply(vcam.matrixWorldInverse); texM.multiply(glassM.matrixWorld);
      plane.setFromNormalAndCoplanarPoint(N, P); plane.applyMatrix4(vcam.matrixWorldInverse); clip.set(plane.normal.x, plane.normal.y, plane.normal.z, plane.constant);   // cắt xiên: bỏ mọi thứ nằm SAU mặt gương
      const pm = vcam.projectionMatrix; q.x = (Math.sign(clip.x) + pm.elements[8]) / pm.elements[0]; q.y = (Math.sign(clip.y) + pm.elements[9]) / pm.elements[5]; q.z = -1; q.w = (1 + pm.elements[10]) / pm.elements[14];
      clip.multiplyScalar(2 / clip.dot(q)); pm.elements[2] = clip.x; pm.elements[6] = clip.y; pm.elements[10] = clip.z + 1 - 0.003; pm.elements[14] = clip.w;
      busy = true; mirror.visible = false;
      const prt = renderer.getRenderTarget(), pxr = renderer.xr.enabled, psh = renderer.shadowMap.autoUpdate;
      renderer.xr.enabled = false; renderer.shadowMap.autoUpdate = false; renderer.setRenderTarget(rt); renderer.state.buffers.depth.setMask(true); if (renderer.autoClear === false) renderer.clear(); renderer.render(sc, vcam);
      renderer.xr.enabled = pxr; renderer.shadowMap.autoUpdate = psh; renderer.setRenderTarget(prt); const vp = camera.viewport; if (vp !== undefined) renderer.state.viewport(vp);
      mirror.visible = true; busy = false;
    };
  }
  // ---- LỚP CHI TIẾT (góp ý 17/11 "đắp thêm 1 lớp chi tiết treo ảnh v.v"): khung ảnh treo tường, bảng ghim, rèm cửa sổ, dây cờ, chậu cây, giá treo áo.
  //      ?chiTietPhong=0 → tắt cả lớp (về phòng cũ). Mọi món tránh mặt kệ (đồ manh mối), gương, két, cửa.
  if (!/[?&]chiTietPhong=0(&|$)/.test(globalThis.location?.search || '')) {
    const CT = new THREE.Group(); CT.name = 'phong_chi_tiet'; mid.add(CT);
    const RY = { bac: 0, tay: Math.PI / 2, dong: -Math.PI / 2, nam: Math.PI };   // mặt tranh quay VÀO phòng
    const khung = (name, w, h, pos, huong, map, { vien = WOOD_D, rz = 0, day = 0.16, le = 0.14 } = {}) => {   // khung gỗ + tranh (tâm ở pos)
      const k = new THREE.Group(); k.name = name; k.position.set(...pos); k.rotation.set(0, RY[huong], rz, 'YXZ'); CT.add(k);
      box(k, name + '_vien', w, le, day, 0, h / 2 - le, 0, vien, 'wood'); box(k, name + '_vien', w, le, day, 0, -h / 2, 0, vien, 'wood');
      for (const sx of [-1, 1]) box(k, name + '_vien', le, h, day, sx * (w / 2 - le / 2), -h / 2, 0, vien, 'wood');
      const p = new THREE.Mesh(new THREE.PlaneGeometry(w - le * 2 + 0.02, h - le * 2 + 0.02), new THREE.MeshStandardMaterial({ map, roughness: 0.75 }));
      none(p); p.receiveShadow = true; p.position.z = 0.02; p.name = name + '_tranh'; k.add(p); return k;
    };
    const ve = (w, h, f) => canvasTex(w, h, f);
    // 1) ẢNH CHỤP THỊ TRẤN (cắt giữa ảnh phố) — treo trên đầu giường, tường tây
    let anhTT = viewTexOf(false); if (ANH_PHO) { anhTT = anhPho.ngay.clone(); anhTT.repeat.set(0.55, 0.62); anhTT.offset.set(0.24, 0.2); anhTT.needsUpdate = true; }
    khung('phong_anh_thi_tran', 2.5, 1.9, [-HX + 0.1, 6.1, -4.5], 'tay', anhTT, { vien: '#f1e6d2' });
    // 2) TRANH BÚT SÁP của Gà: Gà vàng + gấu Bắp nâu dưới mặt trời
    const tranhSap = ve(256, 320, (c, w, h) => {
      c.fillStyle = '#fbf6ea'; c.fillRect(0, 0, w, h); c.fillStyle = '#8fd16a'; c.fillRect(0, h * 0.78, w, h * 0.22);
      c.fillStyle = '#ffcf33'; c.beginPath(); c.arc(w * 0.82, h * 0.14, 26, 0, 7); c.fill(); c.strokeStyle = '#ffb000'; c.lineWidth = 5;
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; c.beginPath(); c.moveTo(w * 0.82 + Math.cos(a) * 34, h * 0.14 + Math.sin(a) * 34); c.lineTo(w * 0.82 + Math.cos(a) * 48, h * 0.14 + Math.sin(a) * 48); c.stroke(); }
      const nguoi = (x, y, s, mau, dau) => { c.fillStyle = mau; c.fillRect(x - 22 * s, y - 60 * s, 44 * s, 60 * s); c.fillStyle = dau; c.fillRect(x - 18 * s, y - 100 * s, 36 * s, 36 * s);
        c.fillStyle = '#222'; c.fillRect(x - 9 * s, y - 88 * s, 5 * s, 5 * s); c.fillRect(x + 4 * s, y - 88 * s, 5 * s, 5 * s); c.fillRect(x - 20 * s, y, 14 * s, 30 * s); c.fillRect(x + 6 * s, y, 14 * s, 30 * s); };
      nguoi(w * 0.33, h * 0.68, 1.15, '#3d7bd9', '#ffd84a');   // Gà: đầu vàng, áo xanh
      c.fillStyle = '#a9713a'; c.beginPath(); c.arc(w * 0.68, h * 0.6, 34, 0, 7); c.fill(); c.beginPath(); c.arc(w * 0.68, h * 0.42, 26, 0, 7); c.fill();   // Bắp
      c.beginPath(); c.arc(w * 0.68 - 20, h * 0.36, 9, 0, 7); c.fill(); c.beginPath(); c.arc(w * 0.68 + 20, h * 0.36, 9, 0, 7); c.fill();
      c.fillStyle = '#222'; c.fillRect(w * 0.68 - 10, h * 0.41, 5, 5); c.fillRect(w * 0.68 + 5, h * 0.41, 5, 5);
      c.strokeStyle = '#e8473f'; c.lineWidth = 4; c.beginPath(); c.moveTo(w * 0.46, h * 0.52); c.bezierCurveTo(w * 0.5, h * 0.44, w * 0.56, h * 0.48, w * 0.5, h * 0.56); c.bezierCurveTo(w * 0.44, h * 0.48, w * 0.5, h * 0.44, w * 0.46, h * 0.52); c.stroke();   // tim
    });
    khung('phong_tranh_sap', 1.55, 1.95, [-HX + 0.1, 5.75, -1.9], 'tay', tranhSap, { vien: '#c0392b', rz: 0.05, le: 0.1 });
    // 3) GIẤY KHEN
    const giayKhen = ve(256, 320, (c, w, h) => {
      c.fillStyle = '#fff4d6'; c.fillRect(0, 0, w, h); c.strokeStyle = '#c8962e'; c.lineWidth = 10; c.strokeRect(12, 12, w - 24, h - 24); c.lineWidth = 3; c.strokeRect(26, 26, w - 52, h - 52);
      c.fillStyle = '#b3261e'; c.font = 'bold 34px "Be Vietnam Pro", sans-serif'; c.textAlign = 'center'; c.fillText('GIẤY KHEN', w / 2, 82);
      c.fillStyle = '#6b5a3a'; for (let i = 0; i < 5; i++) c.fillRect(52, 118 + i * 26, w - 104, 5);
      c.fillStyle = '#d63b2f'; c.beginPath(); c.arc(w * 0.72, h * 0.82, 26, 0, 7); c.fill(); c.fillStyle = '#ffd86b'; c.beginPath(); c.arc(w * 0.72, h * 0.82, 14, 0, 7); c.fill();
    });
    khung('phong_giay_khen', 1.3, 1.65, [-HX + 0.1, 6.0, 0.2], 'tay', giayKhen, { vien: '#b8873b', le: 0.1 });
    // 4) ẢNH GIA ĐÌNH (mẹ + Gà) — tường bắc, bên trái cửa sổ, trên tủ đèn
    const anhNha = ve(256, 320, (c, w, h) => {
      const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#9ed2f2'); gr.addColorStop(1, '#e8f4fb'); c.fillStyle = gr; c.fillRect(0, 0, w, h);
      c.fillStyle = '#7cc26a'; c.fillRect(0, h * 0.8, w, h * 0.2);
      const r6 = (x, y, s, ao, dau) => { c.fillStyle = ao; c.fillRect(x - 26 * s, y - 70 * s, 52 * s, 70 * s); c.fillStyle = dau; c.fillRect(x - 20 * s, y - 112 * s, 40 * s, 40 * s); c.fillStyle = '#2b2b2b'; c.fillRect(x - 10 * s, y - 98 * s, 6 * s, 6 * s); c.fillRect(x + 4 * s, y - 98 * s, 6 * s, 6 * s); c.fillStyle = '#4a3a2a'; c.fillRect(x - 24 * s, y, 20 * s, 34 * s); c.fillRect(x + 4 * s, y, 20 * s, 34 * s); };
      r6(w * 0.36, h * 0.66, 1.25, '#d0637a', '#f2c9a0'); r6(w * 0.68, h * 0.74, 0.95, '#3d7bd9', '#ffd84a');
    });
    khung('phong_anh_gia_dinh', 1.3, 1.6, [-5.45, 6.95, -HZ + 0.1], 'bac', anhNha, { vien: '#f1e6d2', le: 0.12 });
    // 5) BẢNG GHIM BẦN trên kệ (tường bắc): giấy nhớ, ảnh nhỏ, đinh ghim — cao hơn đồ trên kệ
    const bangGhim = ve(384, 256, (c, w, h) => {
      c.fillStyle = '#c6955a'; c.fillRect(0, 0, w, h); for (let i = 0; i < 900; i++) { c.fillStyle = `rgba(${hash(i, 61) > 0.5 ? '90,56,24' : '236,200,150'},${0.15 + hash(i, 62) * 0.25})`; c.fillRect(hash(i, 63) * w, hash(i, 64) * h, 2, 2); }
      const giay = (x, y, gw, gh, mau, rz) => { c.save(); c.translate(x, y); c.rotate(rz); c.fillStyle = 'rgba(0,0,0,0.18)'; c.fillRect(-gw / 2 + 3, -gh / 2 + 4, gw, gh); c.fillStyle = mau; c.fillRect(-gw / 2, -gh / 2, gw, gh);
        c.fillStyle = 'rgba(60,60,80,0.55)'; for (let k = 0; k < 3; k++) c.fillRect(-gw / 2 + 8, -gh / 2 + 16 + k * 12, gw - 16 - (k === 2 ? 14 : 0), 3); c.fillStyle = '#e53935'; c.beginPath(); c.arc(0, -gh / 2 + 6, 5, 0, 7); c.fill(); c.restore(); };
      giay(64, 70, 76, 70, '#fff176', -0.12); giay(170, 60, 70, 66, '#80deea', 0.08); giay(300, 76, 90, 76, '#ffffff', -0.05); giay(96, 182, 80, 72, '#f48fb1', 0.1); giay(214, 176, 74, 70, '#a5d6a7', -0.08);
      c.save(); c.translate(312, 180); c.rotate(0.12); c.fillStyle = '#fff'; c.fillRect(-42, -38, 84, 76); const g2 = c.createLinearGradient(0, -30, 0, 26); g2.addColorStop(0, '#76bdf0'); g2.addColorStop(1, '#d7c3a6'); c.fillStyle = g2; c.fillRect(-36, -32, 72, 56); c.fillStyle = '#e53935'; c.beginPath(); c.arc(0, -34, 5, 0, 7); c.fill(); c.restore();
    });
    khung('phong_bang_ghim', 2.7, 1.8, [2.3, 6.15, -HZ + 0.1], 'bac', bangGhim, { vien: '#7a4e2c', le: 0.12, day: 0.2 });
    // 6) ÁP PHÍCH tên lửa — tường đông, giữa cửa ban công và gương
    const apPhich = ve(256, 360, (c, w, h) => {
      const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#1b2a5c'); gr.addColorStop(1, '#3b4fa0'); c.fillStyle = gr; c.fillRect(0, 0, w, h);
      c.fillStyle = '#fff'; for (let i = 0; i < 40; i++) c.fillRect(hash(i, 71) * w, hash(i, 72) * h * 0.8, 2 + (i % 4 === 0) * 2, 2 + (i % 4 === 0) * 2);
      c.fillStyle = '#f5f5f5'; c.beginPath(); c.moveTo(w / 2, 70); c.bezierCurveTo(w / 2 + 40, 110, w / 2 + 34, 210, w / 2 + 30, 250); c.lineTo(w / 2 - 30, 250); c.bezierCurveTo(w / 2 - 34, 210, w / 2 - 40, 110, w / 2, 70); c.fill();
      c.fillStyle = '#e53935'; c.beginPath(); c.moveTo(w / 2, 70); c.bezierCurveTo(w / 2 + 22, 86, w / 2 + 30, 104, w / 2 + 32, 116); c.lineTo(w / 2 - 32, 116); c.bezierCurveTo(w / 2 - 30, 104, w / 2 - 22, 86, w / 2, 70); c.fill();
      c.beginPath(); c.moveTo(w / 2 - 30, 210); c.lineTo(w / 2 - 58, 262); c.lineTo(w / 2 - 30, 250); c.fill(); c.beginPath(); c.moveTo(w / 2 + 30, 210); c.lineTo(w / 2 + 58, 262); c.lineTo(w / 2 + 30, 250); c.fill();
      c.fillStyle = '#4fc3f7'; c.beginPath(); c.arc(w / 2, 160, 15, 0, 7); c.fill(); c.fillStyle = '#ffb300'; c.beginPath(); c.moveTo(w / 2 - 22, 252); c.lineTo(w / 2, 318); c.lineTo(w / 2 + 22, 252); c.fill();
      c.fillStyle = '#ffd54f'; c.font = 'bold 30px "Be Vietnam Pro", sans-serif'; c.textAlign = 'center'; c.fillText('BAY LÊN!', w / 2, 46);
    });
    khung('phong_ap_phich', 2.0, 2.8, [HX - 0.1, 5.9, -1.4], 'dong', apPhich, { vien: '#2b2b33', le: 0.08, day: 0.08 });
    // 7) RÈM CỬA SỔ vàng kem hai bên + thanh treo gỗ (không che khung kính; bên phải hẹp để không che đầu tây của kệ)
    { const zR = -HZ + 0.62, yT = WIN.y1 + 0.55, rem = (name, x0, x1, nep) => {
        const w = x1 - x0, h = yT - 3.55, gm = new THREE.PlaneGeometry(w, h, 28, 6), P = gm.attributes.position;
        const yB = 4.9 - 3.55 - h / 2;   // độ cao dây buộc (cục bộ): rèm thắt eo ở đây (bó 60%), dải buộc vừa đúng chỗ thắt
        for (let i = 0; i < P.count; i++) { const x = P.getX(i), y = P.getY(i), dn = (y + h / 2) / h, b = 1 - 0.4 * Math.exp(-(((y - yB) / 1.1) ** 2)); P.setX(i, x * b); P.setZ(i, Math.sin((x / w) * Math.PI * nep * 2) * 0.13 * (0.55 + 0.45 * dn)); }
        gm.computeVertexNormals();
        const m = tag(new THREE.Mesh(gm, mat('#e7c873', 'fabric', { side: THREE.DoubleSide, roughness: 0.95 })), 'fabric'); m.name = name; m.position.set((x0 + x1) / 2, 3.55 + h / 2, zR); CT.add(m);
        box(CT, name + '_day_buoc', w * 0.62, 0.16, 0.34, (x0 + x1) / 2, 4.82, zR, '#b5552f', 'fabric'); };
      rem('phong_rem_trai', WIN.c - WIN.hw - 1.35, WIN.c - WIN.hw - 0.26, 3); rem('phong_rem_phai', WIN.c + WIN.hw + 0.26, WIN.c + WIN.hw + 0.9, 2);
      const tt = cyl(CT, 'phong_thanh_rem', 0.07, 0.07, WIN.hw * 2 + 3.1, WIN.c, yT, zR, WOOD_D, 'wood', {}, 10); tt.rotation.z = Math.PI / 2; tt.position.y = yT;
      for (const sx of [-1, 1]) { const q = tag(new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), mat(WOOD_D, 'wood')), 'wood'); q.position.set(WIN.c + sx * (WIN.hw + 1.6), yT, zR); q.name = 'phong_thanh_rem_nuom'; CT.add(q); } }
    // 8) DÂY CỜ ĐUÔI NHEO trên đầu giường (tường tây), võng xuống giữa
    { const n = 11, z0 = -6.7, z1 = 0.9, mauCo = ['#e53935', '#fdd835', '#43a047', '#1e88e5', '#fb8c00', '#8e24aa'], ys = (u) => 8.45 - Math.sin(u * Math.PI) * 0.55;
      const pts = []; for (let i = 0; i <= 20; i++) { const u = i / 20; pts.push(new THREE.Vector3(-HX + 0.14, ys(u), z0 + (z1 - z0) * u)); }
      const day = tag(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.025, 5), mat('#f5ecd8', 'fabric')), 'fabric', false); day.name = 'phong_day_co'; CT.add(day);
      for (let i = 0; i < n; i++) { const u = (i + 0.5) / n, zc = z0 + (z1 - z0) * u, s = new THREE.Shape(); s.moveTo(-0.27, 0); s.lineTo(0.27, 0); s.lineTo(0, -0.62); s.closePath();
        const co = tag(new THREE.Mesh(new THREE.ShapeGeometry(s), mat(mauCo[i % mauCo.length], 'fabric', { side: THREE.DoubleSide })), 'fabric', false); co.name = 'phong_co'; co.position.set(-HX + 0.16, ys(u), zc); co.rotation.set(0, Math.PI / 2, (hash(i, 81) - 0.5) * 0.12); CT.add(co); } }
    // 9) CHẬU CÂY (góc đông, dưới áp phích) + GIÁ TREO ÁO cạnh cửa phòng (model Kenney furniture-kit, CC0) — thiếu model thì bỏ qua
    if (H.fit) {
      const cay = H.fit('furniture-kit/pottedPlant', 3.0); if (cay) { cay.position.set(HX - 0.9, 0, 1.6); cay.name = 'phong_chau_cay'; CT.add(cay); }
      const gia = H.fit('furniture-kit/coatRack', 5.6); if (gia) { gia.position.set(2.5, 0, HZ - 0.9); gia.name = 'phong_gia_treo_ao'; CT.add(gia); }
    }
  }
  // ---- vệt sáng trăng / nắng trên sàn (cộng sáng) ----
  const patchMat = new THREE.MeshBasicMaterial({ map: softTex('255,255,255'), color: '#9fb8ff', transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  for (const [i, [x, z, w, d]] of [[-1.2, -4.6, 4.6, 5.2], [4.6, -6.4, 4.4, 4.2]].entries()) { const m = none(new THREE.Mesh(new THREE.PlaneGeometry(w, d), patchMat)); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.06, z); m.name = 'phong_vet_sang_' + i; front.add(m); }

  // ---- đêm / sáng + tham số theo shot ----
  const DEM = { color: '#ffb25a', intensity: 3.2, distance: 34, decay: 1.2, pos: [NX + 1.2, NH + 2.2, NZ + 1.6] }, SANG = { color: '#fff1d0', intensity: 1.0, distance: 40, decay: 1.2, pos: [WIN.c, 7.2, -4.5] };
  e.pointSpec = DEM;
  const pool = scene.getObjectByName('interior_point');
  let nightNow = null;
  const setNight = (night) => {
    if (nightNow === night) return; nightNow = night;
    for (const m of viewMats) m.map = m.userData.bc && bcTex ? (night ? bcTex.dem : bcTex.ngay) : (night ? viewNight : viewDay);
    shadeMat.emissiveIntensity = night ? 0.5 : 0.1; shadeMat.color.set(night ? '#ffb347' : '#d9a050'); e.bulb.material.color.set(night ? '#e8c890' : '#d8c8a0');   // đèn dịu: không cháy sáng khi vào khung glow.visible = night;
    wallMat.color.set(night ? '#8b90a2' : '#a9b0bb'); patchMat.color.set(night ? '#9fb8ff' : '#fff0c0'); patchMat.opacity = night ? 0.22 : 0.4;
    e.pointSpec = night ? DEM : SANG;
  };
  setNight(true);
  const num = (v, d) => (typeof v === 'number' ? v : d);
  return { suSong: [], update(t, ctx) {
    const c = ctx || {}, L = LIGHTS[c.light || e.light]; setNight(!!(L && L.night));
    doorPivot.rotation.y = num(c.cuaPhong, 0) * 1.75;                 // mở vào trong, cánh quay về phía bắc–tây
    winLeft.rotation.y = num(c.cuaSo, 0) * 1.9;                       // cánh trái mở ra ngoài
    ketDoor.rotation.y = num(c.ketMo, 0) * 1.9; ket.position.y = num(c.ketY, 0);
    glassM.material = c.guong === 0 ? fakeMat : refMat; mirror.rotation.y = num(c.guongRy, GUONG.ry); refMat.uniforms.tint.value.set('#d3d9e6').multiplyScalar(num(c.guongSang, 1));
    { const soft = globalThis.__autoFx?.vaiGiuong !== false, phu = !!c.chanPhu, V = e.chanVai;   // chăn: vải mềm (mặc định) hoặc hộp cũ
      for (const m of V.hop) m.visible = !soft; e.chanPhu.visible = phu && !soft; V.phang.visible = soft && !phu; V.phu.visible = soft && phu;
      if (soft) (phu ? V.phu : V.phang).userData.update(t); }
    if (pool && e.pointSpec) { const s = e.pointSpec; pool.color.set(s.color); pool.intensity = s.intensity; pool.distance = s.distance; pool.decay = s.decay; pool.position.set(...s.pos); }   // áp ngay trong khung này (applyPool chạy trước update)
  } };
}
