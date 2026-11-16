// Bối cảnh 'e3-pho' — KHU PHỐ NGOÀI TRỜI của tập 3, MỘT KHỐI LIỀN (camera lia/chạy dọc phố được). Có NGÀY (nắng ấm) và ĐÊM (xanh lam lạnh, cửa sổ + đèn đường hổ phách), cùng một bố trí.
// Sửa bối cảnh này CHỈ trong file này. Được episodes/<ep>/index.html nạp động khi shot ghi `env: "e3-pho"` → build(g, e, H).
// Thiết kế: kich-ban/ep003-goi/Thiet_ke_chung.md (street) + episodes/ep003/nguon/thiet-ke-hinh.md §3 + ảnh khảo sát Boi_canh_01.jpg. Mọi hình dựng bằng khối (không asset ngoài), 1 stud = 1 đơn vị, "G" = cao Gà ≈ 5,3.
// Các set (street, junction, bear-shop, balcony, opposite-awning, mayor-door) là các GÓC CAMERA của cùng một khối này — shot chọn set bằng toạ độ camera / điểm có tên.
//
// HƯỚNG: BẮC = −Z, ĐÔNG = +X, NAM = +Z. Phố chạy bắc–nam, trục đường x=0 (rộng 18: x −9..9), vỉa hè 5 mỗi bên (x ±9..±14, mặt y=0,4), phố dài z +120 … −100.
// SƠ ĐỒ (nhìn từ trên, bắc ở trên):
//                    nhà phía bắc ngã ba (mặt tiền quay NAM, z=−105)      ·········  nhà máy (x 112..152, z −110..−72, ống khói) ← hàng rào + cổng x=106
//   z −100..−82   ═════ ĐƯỜNG NGANG (rẽ ĐÔNG tới nhà máy; nhánh tây ngắn tới x −33) ════════════════════════════════►
//   DÃY TÂY (mặt tiền quay +X, x=−14)         đường x ±9            DÃY ĐÔNG (mặt tiền quay −X, x=+14)
//   z −81..−55  NHÀ THỊ TRƯỞNG (navy, 3 bậc đá, cửa mở được)        z −74..−50 nhà nền
//   z −54..−32  TIỆM MAY (tím)                                       z −50..−26 nhà nền
//   z −32..−8   TIỆM BÁNH (kem, mái đỏ gạch, hiên sọc đỏ)            z −26..−2  nhà nền
//   z −8..18    TIỆM GẤU (cam đất, cửa teal; thụt vào 1,6 → hiên rộng) z −2..22 nhà nền
//   z 18..42    NHÀ GÀ (sage, cửa vàng kem, BAN CÔNG tầng 2 z 28..40)   z 23..45 nhà MÁI HIÊN XANH LAM (đối diện ban công)
//   z 42 → +120 nhà nền hai bên
//   (THỨ TỰ nam→bắc là Gà, tiệm gấu, tiệm bánh, tiệm may, thị trưởng: theo ảnh khảo sát Boi_canh_01 + thiet-ke-hinh §3; khác thứ tự trong đề — xem báo cáo.)
//
// ĐIỂM CÓ TÊN (toạ độ env [x,y,z]; y = mặt đứng; "mặt" = hướng nhân vật quay) — export DIEM, cũng ở e.diem:
//   pho_nam [0,0.4,50] · pho_giua [0,0.4,-8] · pho_bac [0,0.4,-62]   giữa lòng đường, mặt về +X trục ngang hoặc theo shot
//   truoc_nha_ga [-11.2,0.4,27]  trước cửa nhà Gà, mặt −X→ quay vào cửa (mặt tiền hướng +X, đứng quay mặt −X)
//   truoc_tiem_gau [-14.4,0.4,1.4]  ông Bách đứng SAU bàn trưng, mặt +X      khach_tiem_gau [-10,0.4,1.4]  2 bé trước bàn (z 1.4±1.3), mặt −X
//   truoc_tiem_banh [-11,0.4,-11.2]   truoc_tiem_may [-11,0.4,-41]   (trước cửa, mặt −X)
//   ban_cong [-11.8,9.5,34]  trên sàn ban công nhà Gà (mặt +X nhìn sang hiên)   hien_doi_dien [11.8,9.9,34]  trên mái hiên xanh lam (gấu Bắp ngồi, mặt −X)
//   duoi_hien [11.6,0.4,34]  vỉa hè dưới mái hiên   nga_ba [0,0.4,-91]   nga_ba_dong [38,0.4,-91]  đoạn đường rẽ về nhà máy (quay mặt +X)
//   hien_thi_truong [-15.4,2.8,-68]  trong khung cửa thị trưởng (mặt +X)   bac_thi_truong [-9.8,0.4,-68]  dưới bậc, Gà đứng (mặt −X)
// MẶT TIỀN: tây quay +X, đông quay −X, dãy bắc ngã ba quay +Z (nam).
// SLOT ĐẠO CỤ (PROP_SLOTS.byName; [x,y,z,ry]): ban_gau = mặt bàn trưng ngoài hiên tiệm gấu [-12.3,3.15,1.4,π/2] (ry π/2 = mặt +X ra phố);
//   hien_doi_dien = mặt trên mái hiên xanh lam [11.8,9.9,34,−π/2]. Đạo cụ nhỏ (gấu, giấy, đồng hồ, nhẫn, ví) do hệ đạo cụ đặt — env không dựng.
// ĐÊM / NGÀY: env tự đọc ctx.light (shot time:'dem' → 'night'; còn lại → 'day'); shot cũng có thể gọi e.setNight(0..1). Cửa thị trưởng: ctx.cuaThiTruong 0..1 (mặc định 0 = đóng) hoặc e.setDoor(k).
export const LIGHT = 'day';
import { gauKeOn, gauKeStatic } from '../gau-ke.js';   // gấu kệ nhà máy (Roblox 104566604295071) đứng sau kính tiệm gấu; ?gauKe=0 / ?rb=0 → về ảnh phẳng
export const ASSETS = ['pho-nha-ga', 'pho-tiem-gau', 'pho-tiem-banh', 'pho-tiem-may', 'pho-nha-thi-truong', 'pho-nha-nga-ba', 'pho-nha-may', 'pho-thap-chuong', 'pho-nha-nen-1', 'pho-nha-nen-2', 'pho-nha-nen-3', 'pho-nha-nen-4', 'pho-nha-nen-5', 'pho-nha-nen-6', 'pho-nha-nen-7', 'pho-cay', 'pho-tru-cuu-hoa'].map((n) => 'nhap/' + n);   // nhà Roblox Creator Store (đợt nhà 14/11); thiếu model hoặc ?rb=0 → bản khối
export const DIEM = {
  pho_nam: [0, 0.4, 50], pho_giua: [0, 0.4, -8], pho_bac: [0, 0.4, -62],
  truoc_nha_ga: [-11.2, 0.4, 27], truoc_tiem_gau: [-14.4, 0.4, 1.4], khach_tiem_gau: [-10, 0.4, 1.4],
  truoc_tiem_banh: [-11, 0.4, -11.2], truoc_tiem_may: [-11, 0.4, -41], ban_cong: [-11.8, 9.5, 34], hien_doi_dien: [11.8, 9.9, 34],
  duoi_hien: [11.6, 0.4, 34], nga_ba: [0, 0.4, -91], nga_ba_dong: [38, 0.4, -91], hien_thi_truong: [-15.4, 2.8, -68], bac_thi_truong: [-9.8, 0.4, -68],
};
export const PROP_SLOTS = {
  byName: { ban_gau: [-12.3, 3.15, 1.4, Math.PI / 2], hien_doi_dien: [11.8, 9.9, 34, -Math.PI / 2] },
  floor: [[0, 0.4, 20, 0], [0, 0.4, -40, 0]], wall: [],
  camMax: 140,
};

export default function build(g, e, H) {
  const { ganTang, THREE, hash, LIGHTS, fit } = H;
  e.diem = DIEM;
  e.skybox = new URLSearchParams(globalThis.location?.search || '').get('troiPho') === 'sky-7' ? 'sky-7' : 'anime-day';   // đợt 5: trời ngày = anime-day (người dùng chốt 16/11); đêm giữ sky-9. ?troiPho=sky-7 về trời cũ
  e.vongBao = { preset: 'rung-thong', r: 420, h: 110, suongDem: /[?&]suongRungDem=1(&|$)/.test(globalThis.location?.search || '') };   /* suongDem false = đêm rừng không bị sương phủ thành dải xanh phẳng (s045, s036); ?suongRungDem=1 về cũ */   // vòng bao rừng thông (ô FX vongBao tắt được; ?vongBao=tat)
  const SW = 0.4;   // mặt vỉa hè
  const tBack = new THREE.Group(), tMid = new THREE.Group(), tFront = new THREE.Group();
  tBack.name = 'pho_tang_sau'; tMid.name = 'pho_tang_giua'; tFront.name = 'pho_tang_truoc';
  g.add(ganTang(tBack, 'back'), ganTang(tMid, 'mid'), ganTang(tFront, 'front'));

  // ============ bộ gộp khối tô màu theo đỉnh (1 draw call / batch) ============
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _eu = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _n3 = new THREE.Matrix3(), _c = new THREE.Color(), _v = new THREE.Vector3();
  const FACES = [
    [[1, 0, 0], [[.5, -.5, .5], [.5, -.5, -.5], [.5, .5, -.5], [.5, .5, .5]]], [[-1, 0, 0], [[-.5, -.5, -.5], [-.5, -.5, .5], [-.5, .5, .5], [-.5, .5, -.5]]],
    [[0, 1, 0], [[-.5, .5, .5], [.5, .5, .5], [.5, .5, -.5], [-.5, .5, -.5]]], [[0, -1, 0], [[-.5, -.5, -.5], [.5, -.5, -.5], [.5, -.5, .5], [-.5, -.5, .5]]],
    [[0, 0, 1], [[-.5, -.5, .5], [.5, -.5, .5], [.5, .5, .5], [-.5, .5, .5]]], [[0, 0, -1], [[.5, -.5, -.5], [-.5, -.5, -.5], [-.5, .5, -.5], [.5, .5, -.5]]],
  ];
  // Loại vật liệu THẬT theo màu đỉnh (engine/materials.js): mỗi batch tách thành 1 mesh / loại, mỗi loại 1 vật liệu riêng (nằm trong litMats nên đêm vẫn nâng sáng).
  // b.k = 'loại' (đặt tạm quanh vài lời gọi box) thắng bảng màu; màu không có trong bảng → loại mặc định của batch (mid/back: tường vữa, front: mờ).
  const KIND_MAU = {};
  for (const [kind, cols] of Object.entries({
    metalpaint: '#1e2024 #2a2a30 #2a2830 #3a3842 #1a3c3c #2a5050 #4a4a52 #c8a24a #1e2230 #161a26',   // đèn, cột, trụ chặn, hàng rào sắt, nắm cửa, mái xưởng
    wood: '#8a5a33 #6a4325 #a05f35 #7a4f2c #7a5636',   // ghế dài, bàn trưng, hộp hoa, lan can gỗ, sàn hốc
    woodpaint: '#e8d8c0 #e8dcc0 #d6c8a8 #ead9b5 #f0e4cf #e3d3b0 #f5f0e0 #6a7fa8 #1f4a4a #2b7e80 #1d5859 #1f5560 #2a3548 #2a4a50 #2f3a5a #7a3a2a #e6cf8a #6b4528 #6e4423 #3d4b56 #7b8f68 #b03a2a #6a4a82 #5f4376',   // viền cửa, cánh cửa, ván ngang, chao hiên
    bark: '#5a3a22',
    foliage: '#4e7a32 #5d9040 #3f6a2a #6aa04a #5c8a3a #7fa037 #6a9030 #8fb040 #8b6fc0 #7a60b0',
    concrete: '#8a857f #9a958e #8f8a84 #635f62',   // chân tường, bậc đá, bó vỉa
    shingle: '#3a3a44',
    brick: '#7c5c46 #8a3a2c #7a3226 #6a2c20',
    tile: '#8a4a32 #5e3626',   // sàn ban công gạch đất nung
    matte: '#9a5a36 #7a4528',   // chậu đất nung
  })) for (const c of cols.split(' ')) KIND_MAU[c] = kind;
  let daoGau = null;   // dựng gấu sau kính tiệm gấu khi model gấu kệ đã nạp
  const litMats = [];   // vật liệu nhận sáng: đêm được nâng sáng + ám xanh lam (preset 'night' của engine tối quá cho phố)
  const kindStd = new Map();
  const stdOf = (kind) => { if (!kindStd.has(kind)) { const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0 }); kindStd.set(kind, m); litMats.push(m); } return kindStd.get(kind); };
  const batch = (defKind = 'plaster') => {   // defKind 'none' = batch phát sáng / kính (giữ nguyên 1 mesh, không vân)
    const bins = new Map(), st = { k: null }; let jit = 0;
    const bin = (kd) => { let b = bins.get(kd); if (!b) bins.set(kd, b = { P: [], N: [], C: [], I: [] }); return b; };
    const kindOf = (c) => defKind === 'none' ? 'none' : (st.k || KIND_MAU[String(c).toLowerCase()] || defKind);
    const col = (c, nj) => { _c.set(c); const k = nj ? 1 : 0.95 + hash(jit++, 7) * 0.1; return [_c.r * k, _c.g * k, _c.b * k]; };
    // hộp tâm (cx,cy,cz), kích thước (sx,sy,sz), xoay (rx,ry,rz) rad
    const box = (cx, cy, cz, sx, sy, sz, c, rx = 0, ry = 0, rz = 0, nj = false) => {
      const { P, N, C, I } = bin(kindOf(c));
      _eu.set(rx, ry, rz); _q.setFromEuler(_eu); _p.set(cx, cy, cz); _s.set(sx, sy, sz); _m.compose(_p, _q, _s); _n3.getNormalMatrix(_m);
      const [r, gg, b] = col(c, nj); let base = P.length / 3;
      for (const [n, vs] of FACES) {
        _v.set(...n).applyMatrix3(_n3).normalize();
        for (const v of vs) { _p.set(...v).applyMatrix4(_m); P.push(_p.x, _p.y, _p.z); N.push(_v.x, _v.y, _v.z); C.push(r, gg, b); }
        I.push(base, base + 1, base + 2, base, base + 2, base + 3); base += 4;
      }
    };
    const tri = (a, b, c, color, nj = false) => {   // tam giác hai mặt (đầu hồi mái)
      const { P, N, C, I } = bin(kindOf(color));
      const [r, gg, bb] = col(color, nj); const e1 = new THREE.Vector3(...b).sub(new THREE.Vector3(...a)), e2 = new THREE.Vector3(...c).sub(new THREE.Vector3(...a)); const n = e1.cross(e2).normalize();
      let base = P.length / 3;
      for (const [pts, sg] of [[[a, b, c], 1], [[a, c, b], -1]]) { for (const v of pts) { P.push(...v); N.push(n.x * sg, n.y * sg, n.z * sg); C.push(r, gg, bb); } I.push(base, base + 1, base + 2); base += 3; }
    };
    const one = ({ P, N, C, I }, material, name, shadow, kind) => {
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
      geo.setIndex(new THREE.BufferAttribute(new Uint32Array(I), 1)); geo.computeBoundingSphere(); geo.computeBoundingBox();
      const m = new THREE.Mesh(geo, material); m.name = name; m.castShadow = shadow; m.receiveShadow = true;
      m.userData.matKind = kind; if (kind !== 'none') m.userData.matNguon = 'khai-bao'; m.userData.grungeKind = 'none'; return m;
    };
    const mesh = (material, name, shadow = true) => {
      if (defKind === 'none') return one(bin('none'), material, name, shadow, 'none');
      const grp = new THREE.Group(); grp.name = name;
      for (const [kd, b] of bins) grp.add(one(b, stdOf(kd), name + '_' + kd, shadow, kd));
      return grp;
    };
    return { box, tri, mesh, get k() { return st.k; }, set k(v) { st.k = v; }, get n() { let s = 0; for (const b of bins.values()) s += b.P.length; return s / 3; } };
  };
  const mkBasic = (c) => new THREE.MeshBasicMaterial({ vertexColors: true, color: c });
  const matLit = mkBasic('#b5d6ea'), matDark = mkBasic('#7fa3bf'), matBulb = mkBasic('#ffe9b8'), matInner = mkBasic('#6b5640');
  const mid = batch('plaster'), glassL = batch('none'), glassD = batch('none'), bulbs = batch('none'), front = batch('matte'), back = batch('plaster'), inner = batch('none');

  // ============ canvas ============
  const canvasTex = (w, h, draw, srgb = true) => { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h); const t = new THREE.CanvasTexture(cv); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
  const rr = (c, x, y, w, h, r) => { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); };
  const cobbleTex = canvasTex(512, 512, (c, w, h) => {   // đá cuội xám tím #6E6B72: 12 cột × 12 hàng (tile 12 stud)
    const n = 12, s = w / n; c.fillStyle = '#4a474f'; c.fillRect(0, 0, w, h);
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const k = 0.86 + hash(j * 31 + i, 3) * 0.28, off = (j % 2) * s / 2; c.fillStyle = `rgb(${Math.round(110 * k)},${Math.round(107 * k)},${Math.round(114 * k)})`; rr(c, i * s + off + 2, j * s + 2, s - 4, s - 4, 7); c.fill(); if (i === 0) { rr(c, i * s + off + 2 - s, j * s + 2, s - 4, s - 4, 7); c.fill(); } }
  });
  const walkTex = canvasTex(256, 256, (c, w, h) => {   // vỉa hè vuông #BDB7B0, ô 2,5 stud (tile 5 stud = 2×2 ô)
    c.fillStyle = '#9b958e'; c.fillRect(0, 0, w, h);
    for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) { const k = 0.94 + hash(j * 5 + i, 9) * 0.1; c.fillStyle = `rgb(${Math.round(189 * k)},${Math.round(183 * k)},${Math.round(176 * k)})`; c.fillRect(i * 128 + 3, j * 128 + 3, 122, 122); }
  });
  const softTex = canvasTex(128, 128, (c, w, h) => { const gr = c.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.45, 'rgba(255,255,255,0.4)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gr; c.fillRect(0, 0, w, h); });
  for (const t of [cobbleTex, walkTex]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  const flat = (name, tex, x0, x1, z0, z1, y, tile, parent, o = {}) => {   // mặt phẳng nằm, UV theo stud/tile
    const w = x1 - x0, d = z1 - z0, geo = new THREE.PlaneGeometry(w, d); const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / tile, uv.getY(i) * d / tile);
    const m = new THREE.Mesh(geo, o.mat || new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95, color: o.color || '#ffffff' })); litMats.push(m.material); m.rotation.x = -Math.PI / 2; m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2); m.name = name; m.receiveShadow = true; m.userData.matKind = o.kind || 'none'; if (o.kind) m.userData.matNguon = 'khai-bao'; m.userData.grungeKind = 'none'; parent.add(m); return m;
  };
  const bearHead = (c, cx, cy, r, fur, dark, light) => {
    c.fillStyle = fur; for (const s of [-1, 1]) { c.beginPath(); c.arc(cx + s * r * 0.72, cy - r * 0.78, r * 0.36, 0, 7); c.fill(); }
    c.fillStyle = dark; for (const s of [-1, 1]) { c.beginPath(); c.arc(cx + s * r * 0.72, cy - r * 0.78, r * 0.2, 0, 7); c.fill(); }
    c.fillStyle = fur; c.beginPath(); c.arc(cx, cy, r, 0, 7); c.fill();
    c.fillStyle = light; c.beginPath(); c.ellipse(cx, cy + r * 0.3, r * 0.5, r * 0.4, 0, 0, 7); c.fill();
    c.fillStyle = '#2A1F1A'; for (const s of [-1, 1]) { c.beginPath(); c.arc(cx + s * r * 0.38, cy - r * 0.12, r * 0.1, 0, 7); c.fill(); } c.beginPath(); c.ellipse(cx, cy + r * 0.12, r * 0.15, r * 0.1, 0, 0, 7); c.fill();
    c.strokeStyle = '#2A1F1A'; c.lineWidth = r * 0.05; c.beginPath(); c.arc(cx - r * 0.1, cy + r * 0.28, r * 0.1, 0, Math.PI); c.arc(cx + r * 0.1, cy + r * 0.28, r * 0.1, 0, Math.PI); c.stroke();
  };
  const texPlaque = canvasTex(512, 512, (c, w, h) => { c.clearRect(0, 0, w, h); c.fillStyle = '#5a3a22'; c.beginPath(); c.arc(w / 2, h / 2, w * 0.49, 0, 7); c.fill(); c.fillStyle = '#A8703A'; c.beginPath(); c.arc(w / 2, h / 2, w * 0.45, 0, 7); c.fill(); bearHead(c, w / 2, h / 2 + 18, w * 0.27, '#D9A25E', '#8a5a2e', '#EBC98E'); });
  const texHang = canvasTex(512, 420, (c, w, h) => { c.clearRect(0, 0, w, h); c.fillStyle = '#5A3A22'; rr(c, 8, 8, w - 16, h - 16, 40); c.fill(); c.fillStyle = '#E6D3A8'; rr(c, 26, 26, w - 52, h - 52, 30); c.fill(); bearHead(c, w / 2, h / 2 + 10, h * 0.28, '#2B7E80', '#1d5859', '#7fb8b8'); });
  const texBread = canvasTex(768, 420, (c, w, h) => { c.clearRect(0, 0, w, h); c.fillStyle = '#5a321c'; rr(c, 6, 6, w - 12, h - 12, 60); c.fill(); c.fillStyle = '#7A4A2A'; rr(c, 24, 24, w - 48, h - 48, 46); c.fill();
    c.fillStyle = '#E0A030'; c.beginPath(); c.ellipse(w / 2, h / 2, w * 0.3, h * 0.27, -0.12, 0, 7); c.fill(); c.strokeStyle = '#8f5a1c'; c.lineWidth = 16; c.lineCap = 'round'; for (let k = -1; k <= 1; k++) { c.beginPath(); c.moveTo(w / 2 + k * 100 - 28, h / 2 - 55); c.lineTo(w / 2 + k * 100 + 24, h / 2 + 55); c.stroke(); } });
  const texSpool = canvasTex(400, 520, (c, w, h) => { c.clearRect(0, 0, w, h); c.fillStyle = '#4a2f60'; rr(c, 6, 6, w - 12, h - 12, 36); c.fill(); c.fillStyle = '#6A4A82'; rr(c, 22, 22, w - 44, h - 44, 26); c.fill();
    c.fillStyle = '#D9C9A8'; c.fillRect(w * 0.27, h * 0.16, w * 0.46, h * 0.07); c.fillRect(w * 0.27, h * 0.5, w * 0.46, h * 0.07); c.fillStyle = '#9A74B5'; c.fillRect(w * 0.31, h * 0.23, w * 0.38, h * 0.27); c.strokeStyle = '#7d5a99'; c.lineWidth = 6; for (let i = 1; i < 6; i++) { c.beginPath(); c.moveTo(w * 0.31, h * (0.23 + i * 0.045)); c.lineTo(w * 0.69, h * (0.23 + i * 0.045)); c.stroke(); }
    c.strokeStyle = '#D9C9A8'; c.lineWidth = 12; c.beginPath(); c.moveTo(w * 0.4, h * 0.6); c.lineTo(w * 0.6, h * 0.86); c.moveTo(w * 0.6, h * 0.6); c.lineTo(w * 0.4, h * 0.86); c.stroke(); c.lineWidth = 10; c.beginPath(); c.arc(w * 0.37, h * 0.9, 17, 0, 7); c.arc(w * 0.63, h * 0.9, 17, 0, 7); c.stroke(); });
  const dispTex = (kind, w, h) => canvasTex(w, h, (c) => {   // quầy kính (cảnh bên trong, ánh ấm)
    const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#d89a4a'); gr.addColorStop(1, '#7a4a22'); c.fillStyle = gr; c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(255,230,160,0.25)'; c.fillRect(0, 0, w, h * 0.12);
    const shelf = (y) => { c.fillStyle = '#5a3418'; c.fillRect(0, y, w, h * 0.04); };
    if (kind === 'gau') {
      shelf(h * 0.5); shelf(h * 0.96);
      const bear = (x, y, s, fur) => { c.fillStyle = fur; c.beginPath(); c.arc(x, y - s * 0.5, s * 0.55, 0, 7); c.fill(); c.beginPath(); c.arc(x, y - s * 1.35, s * 0.4, 0, 7); c.fill(); for (const k of [-1, 1]) { c.beginPath(); c.arc(x + k * s * 0.3, y - s * 1.7, s * 0.14, 0, 7); c.fill(); } c.fillStyle = '#2A1F1A'; for (const k of [-1, 1]) { c.beginPath(); c.arc(x + k * s * 0.15, y - s * 1.4, s * 0.04, 0, 7); c.fill(); } };
      for (let i = 0; i < 6; i++) bear(w * (0.1 + i * 0.16), h * 0.5, h * 0.2, ['#B8864A', '#C99660', '#a9763a'][i % 3]);
      for (let i = 0; i < 6; i++) bear(w * (0.18 + i * 0.16), h * 0.96, h * 0.2, ['#c99660', '#B8864A', '#d3a06a'][i % 3]);
    } else if (kind === 'banh') {
      shelf(h * 0.5); shelf(h * 0.96); c.fillStyle = '#b06a2a';
      for (let r = 0; r < 2; r++) for (let i = 0; i < 9; i++) { c.fillStyle = ['#d9964a', '#c47a35', '#e8b66a'][(i + r) % 3]; c.beginPath(); c.ellipse(w * (0.07 + i * 0.105), h * (0.46 + r * 0.46), w * 0.04, h * 0.07, 0, 0, 7); c.fill(); }
    } else if (kind === 'may') {
      c.fillStyle = '#e8d8c0'; c.beginPath(); c.moveTo(w * 0.42, h * 0.2); c.lineTo(w * 0.58, h * 0.2); c.lineTo(w * 0.63, h * 0.62); c.lineTo(w * 0.37, h * 0.62); c.fill(); c.fillStyle = '#6e4423'; c.fillRect(w * 0.48, h * 0.62, w * 0.04, h * 0.34); c.beginPath(); c.arc(w * 0.5, h * 0.16, w * 0.025, 0, 7); c.fill();
      c.fillStyle = '#9A74B5'; c.fillRect(w * 0.06, h * 0.55, w * 0.22, h * 0.4); c.fillStyle = '#d8a0b4'; c.fillRect(w * 0.7, h * 0.5, w * 0.24, h * 0.45);
    } else {
      shelf(h * 0.5); shelf(h * 0.96); const cs = ['#9A74B5', '#D9C9A8', '#d8a0b4', '#7fa0c4', '#e8d28a', '#8C70A8'];
      for (let r = 0; r < 2; r++) for (let i = 0; i < 4; i++) { c.fillStyle = cs[(i * 2 + r) % 6]; c.fillRect(w * (0.06 + i * 0.23), h * (0.28 + r * 0.46) - h * 0.04, w * 0.19, h * 0.22); c.fillStyle = 'rgba(255,255,255,0.25)'; c.fillRect(w * (0.06 + i * 0.23), h * (0.28 + r * 0.46) - h * 0.04, w * 0.19, h * 0.03); }
    }
    // vân khung chia ô
    c.strokeStyle = 'rgba(40,24,12,0.65)'; c.lineWidth = 6; for (let i = 1; i < 3; i++) { c.beginPath(); c.moveTo(w * i / 3, 0); c.lineTo(w * i / 3, h); c.stroke(); }
  });
  const signMats = [], dispMats = [];
  const signMat = (tex) => { const m = new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: 0.4, roughness: 0.85, emissive: new THREE.Color('#ffffff'), emissiveMap: tex, emissiveIntensity: 0.05, side: THREE.DoubleSide }); signMats.push(m); return m; };
  const dispMat = (tex) => { const m = new THREE.MeshBasicMaterial({ map: tex, color: '#c9c2b4' }); dispMats.push(m); return m; };

  // ============ mặt tiền: hệ toạ độ cục bộ (du dọc mặt tiền, dv ra phố, y tuyệt đối) ============
  // side: −1 tây (x=−14−set, ra +X) · +1 đông (x=14+set, ra −X) · 'B' dãy bắc ngã ba (z=−105−set, ra +Z; du theo +X)
  const face = (side, c, set = 0) => {
    const west = side === -1, east = side === 1, nth = side === 'B';
    const o = nth ? [c, -(105 + set)] : [side * (14 + set), c], n = nth ? [0, 1] : [-side, 0], u = nth ? [1, 0] : [0, 1];
    const W = (du, dv) => [o[0] + u[0] * du + n[0] * dv, o[1] + u[1] * du + n[1] * dv];
    const swap = !nth;   // n dọc x → sx = dv, sz = du
    const b = (du, dv, y0, wu, wv, h, col, bt = mid, nj = false) => { const [x, z] = W(du, dv); bt.box(x, y0 + h / 2, z, swap ? wv : wu, h, swap ? wu : wv, col, 0, 0, 0, nj); };
    const ry = nth ? 0 : west ? Math.PI / 2 : -Math.PI / 2;   // mặt phẳng nhìn ra phố
    const plane = (du, dv, yc, w, h, mat, name, parent = tMid) => { const [x, z] = W(du, dv); const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(x, yc, z); m.rotation.y = ry; m.name = name; m.userData.matKind = 'none'; parent.add(m); return m; };
    return { side, c, set, W, b, ry, plane, n, u, swap, nth };
  };
  const pools = [];   // vệt sáng đêm [x,z,bán kính,độ sáng]
  const lampsW = [];  // bóng đèn tường cho vệt sáng
  const win = (f, du, y0, w, h, frame, kind, o = {}) => {   // khung cửa sổ + kính + chấn song (+ hộp hoa)
    const [cols, rows] = [o.cols || 2, o.rows || 2], gb = kind === 'lit' ? glassL : glassD;
    if (kind !== 'none') f.b(du, 0.1, y0, w, 0.2, h, '#ffffff', gb);
    mid.k = 'woodpaint';
    f.b(du, 0.28, y0 - 0.5, w + 1.4, 1.1, 0.5, frame); f.b(du, 0.3, y0 + h, w + 0.9, 0.5, 0.55, frame);
    f.b(du - w / 2 - 0.2, 0.3, y0, 0.55, 0.5, h, frame); f.b(du + w / 2 + 0.2, 0.3, y0, 0.55, 0.5, h, frame);
    for (let i = 1; i < cols; i++) f.b(du - w / 2 + i * w / cols, 0.35, y0, 0.26, 0.3, h, frame);
    for (let i = 1; i < rows; i++) f.b(du, 0.35, y0 + i * h / rows - 0.13, w, 0.3, 0.26, frame);
    mid.k = null;
    if (o.flower) { f.b(du, 0.95, y0 - 1.3, w + 1.0, 1.1, 0.95, '#6A4325'); for (let i = 0; i < 4; i++) f.b(du - w / 2 + 0.5 + i * (w - 1) / 3, 0.95, y0 - 0.4, 1.1, 1.0, 0.8 + hash(i, 5) * 0.6, ['#4E7A32', '#5d9040', '#3f6a2a'][i % 3]); f.b(du + 0.4, 1.2, y0 + 0.3, 0.5, 0.5, 0.5, '#F5F0E0'); f.b(du - 1.2, 1.1, y0 + 0.2, 0.5, 0.5, 0.5, '#F5F0E0'); }
    if (kind === 'lit' && y0 < 6) { const [x, z] = f.W(du, 3.2); pools.push([x, z, 6.5, 0.55]); }
  };
  const door = (f, du, w, h, y0, leaf, frame, o = {}) => {   // cửa + khung + ô kính + nắm cửa
    mid.k = 'woodpaint';
    f.b(du - w / 2 - 0.35, 0.35, y0, 0.7, 0.7, h + 0.6, frame); f.b(du + w / 2 + 0.35, 0.35, y0, 0.7, 0.7, h + 0.6, frame); f.b(du, 0.35, y0 + h, w + 1.7, 0.7, 0.7, frame);
    f.b(du, 0.1, y0, w, 0.5, h, leaf);
    if (o.glass !== false) { const gh = h * 0.42, gy = y0 + h * 0.5; f.b(du, 0.4, gy, w * 0.62, 0.2, gh, '#ffffff', glassL); f.b(du, 0.5, gy + gh / 2 - 0.1, w * 0.62, 0.25, 0.2, leaf); f.b(du, 0.5, gy - 0.05, 0.2, 0.25, gh, leaf); }
    mid.k = null;
    f.b(du - w / 2 + 0.7, 0.55, y0 + h * 0.45, 0.45, 0.45, 0.45, '#C8A24A', mid, true);
    if (o.step) { f.b(du, 0.75, 0, w + 2, 1.5, y0, '#8A857F'); if (y0 > 1) f.b(du, 1.9, 0, w + 3, 1.0, y0 - 0.5, '#9a958e'); }
  };
  const lantern = (f, du, y, tall = 1.6) => {   // đèn lồng tường: tay sắt + chao + bóng
    f.b(du, 0.45, y + 0.9, 0.3, 0.9, 0.3, '#1E2024'); f.b(du, 0.9, y + 1.1, 0.4, 0.4, 0.5, '#1E2024');
    f.b(du, 1.5, y, 1.5, 1.5, 0.25, '#1E2024'); f.b(du, 1.5, y + tall + 0.25, 1.2, 1.2, 0.25, '#1E2024');
    f.b(du, 1.5, y + 0.25, 1.0, 1.0, tall, '#ffffff', bulbs, true);
    const [x, z] = f.W(du, 2.6); pools.push([x, z, 7, 0.4]);
  };
  // --- viết lại awn gọn (xoay theo hướng ra phố) ---
  const awning = (f, o) => {
    const { du0, du1, y, proj, drop, cols, stripe = 1.8, valance = 1.1, scallop = false, edge } = o, len = Math.hypot(proj, drop), ang = Math.atan2(drop, proj), nS = Math.max(1, Math.round((du1 - du0) / stripe)), sw = (du1 - du0) / nS;
    mid.k = 'fabric';
    for (let k = 0; k < nS; k++) {
      const du = du0 + (k + 0.5) * sw, c = cols[k % cols.length], [x, z] = f.W(du, proj / 2), ya = y - drop / 2 - 0.15;
      if (f.swap) mid.box(x, ya, z, len, 0.32, sw, c, 0, 0, f.n[0] > 0 ? -ang : ang); else mid.box(x, ya, z, sw, 0.32, len, c, f.n[1] > 0 ? ang : -ang, 0, 0);
      const [fx, fz] = f.W(du, proj + 0.1);
      if (scallop) { mid.box(fx, y - drop - valance * 0.45, fz, f.swap ? 0.3 : sw * 0.96, valance * 0.9, f.swap ? sw * 0.96 : 0.3, c); mid.box(fx, y - drop - valance * 0.9 - 0.25, fz, f.swap ? 0.3 : sw * 0.5, 0.5, f.swap ? sw * 0.5 : 0.3, c); }
      else mid.box(fx, y - drop - valance * 0.5, fz, f.swap ? 0.3 : sw, valance, f.swap ? sw : 0.3, c);
    }
    if (edge) { const [x, z] = f.W((du0 + du1) / 2, proj + 0.22); mid.box(x, y - drop - 0.12, z, f.swap ? 0.2 : du1 - du0, 0.28, f.swap ? du1 - du0 : 0.2, edge); }
    mid.k = null;
    for (const du of [du0 + 0.5, du1 - 0.5]) { const [x, z] = f.W(du, proj - 0.5); mid.box(x, (SW + y - drop - valance) / 2, z, 0.35, y - drop - valance - SW, 0.35, '#1E2024'); }   // cột đỡ mảnh
  };
  const roof = (x0, x1, z0, z1, yb, rise, ridge, col, wallCol, o = {}) => {   // mái dốc 2 mái + gờ + vạch ngói + đầu hồi
    const over = o.over ?? 1.3, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, half = ridge === 'z' ? (x1 - x0) / 2 : (z1 - z0) / 2, along = ridge === 'z' ? z1 - z0 : x1 - x0;
    const th = Math.atan2(rise, half), L = Math.hypot(half, rise) + over, T = 0.9, Lr = along + 1.8;
    mid.k = 'shingle';
    for (const s of [-1, 1]) {
      const u = L / 2, nrm = ridge === 'z' ? [s * Math.sin(th), Math.cos(th), 0] : [0, Math.cos(th), s * Math.sin(th)];
      const cen = (uu) => ridge === 'z' ? [cx + s * uu * Math.cos(th), yb + rise - uu * Math.sin(th), cz] : [cx, yb + rise - uu * Math.sin(th), cz + s * uu * Math.cos(th)];
      const [px, py, pz] = cen(u);
      const rx = ridge === 'z' ? 0 : s * th, rz = ridge === 'z' ? -s * th : 0;
      mid.box(px - nrm[0] * T / 2, py - nrm[1] * T / 2, pz - nrm[2] * T / 2, ridge === 'z' ? L : Lr, T, ridge === 'z' ? Lr : L, col, rx, 0, rz);
      if (o.lineCol) for (let uu = 1.6; uu < L - 0.4; uu += 1.7) { const [lx, ly, lz] = cen(uu); mid.box(lx + nrm[0] * 0.06, ly + nrm[1] * 0.06, lz + nrm[2] * 0.06, ridge === 'z' ? 0.22 : Lr, 0.14, ridge === 'z' ? Lr : 0.22, o.lineCol, rx, 0, rz); }
    }
    mid.box(cx, yb + rise + 0.25, cz, ridge === 'z' ? 1.3 : Lr, 0.7, ridge === 'z' ? Lr : 1.3, o.cap || col);
    mid.k = 'plaster';
    if (ridge === 'x') for (const xe of [x0, x1]) mid.tri([xe, yb, z0], [xe, yb, z1], [xe, yb + rise, cz], wallCol);
    else for (const ze of [z0, z1]) mid.tri([x0, yb, ze], [x1, yb, ze], [cx, yb + rise, ze], wallCol);
    mid.k = null;
  };
  const ext = (f, w, D) => { const a = f.W(-w / 2, 0), b = f.W(w / 2, -D); return [Math.min(a[0], b[0]), Math.max(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[1], b[1])]; };
  const worldRidge = (f, rel) => (f.nth ? (rel === 'par' ? 'x' : 'z') : (rel === 'par' ? 'z' : 'x'));

  // ---- thân nhà chung: thân + viền góc + chân đá + ván ngang ----
  const shellOf = (f, w, D, H, wall, trim, o = {}) => {
    f.b(0, -D / 2, 0, w, D, H, wall); f.b(0, 0.3, 0, w, 0.6, 1.5 + SW, '#8A857F');
    for (const s of [-1, 1]) f.b(s * (w / 2 - 0.4), 0.2, 0, 0.8, 0.4, H, trim);
    if (o.band !== false) f.b(0, 0.3, 8.9, w - 1.6, 0.6, 0.55, trim);
    if (o.boards) for (let y = 2.2; y < H - 0.5; y += 1.3) { const segs = o.gap && y > o.gap[0] && y < o.gap[1] ? [[-w / 2 + 0.8, o.gap[2]], [o.gap[3], w / 2 - 0.8]] : [[-w / 2 + 0.8, w / 2 - 0.8]]; for (const [a, b2] of segs) f.b((a + b2) / 2, 0.04, y, b2 - a, 0.1, 0.1, o.boards, mid, true); }
    f.b(0, 0.15, H - 0.5, w + 0.6, 0.9, 0.7, trim);   // gờ mái
  };
  const pot = (f, du, dv, y0, plant = '#4E7A32', flower = null, s = 1) => {   // chậu đất nung + bụi khối
    f.b(du, dv, y0, 1.5 * s, 1.5 * s, 1.4 * s, '#9a5a36'); f.b(du, dv, y0 + 1.4 * s, 1.8 * s, 1.8 * s, 0.25, '#7a4528');
    f.b(du, dv, y0 + 1.6 * s, 1.9 * s, 1.9 * s, 1.7 * s, plant); f.b(du + 0.2, dv - 0.2, y0 + 3.0 * s, 1.5 * s, 1.5 * s, 1.2 * s, '#5d9040');
    if (flower) { f.b(du + 0.6 * s, dv + 0.6 * s, y0 + 3.0 * s, 0.6, 0.6, 0.6, flower); f.b(du - 0.5 * s, dv + 0.4 * s, y0 + 2.4 * s, 0.6, 0.6, 0.6, flower); }
  };
  const planterBox = (f, du, dv, w, flower = '#F5F0E0') => {   // hộp gỗ dài + cây khối + hoa
    f.b(du, dv, SW, w, 1.9, 1.7, '#8A5A33'); f.b(du, dv, SW + 1.7, w + 0.2, 2.1, 0.25, '#6A4325');
    for (let i = 0; i < Math.floor(w / 1.3); i++) f.b(du - w / 2 + 0.9 + i * 1.3, dv, SW + 1.9, 1.2, 1.2, 0.9 + hash(i, 33) * 0.9, ['#4E7A32', '#5d9040', '#3f6a2a'][i % 3]);
    for (let i = 0; i < 4; i++) f.b(du - w / 2 + 1.2 + i * (w - 2) / 3, dv + 0.2, SW + 3.2, 0.5, 0.5, 0.5, flower);
  };
  const bench = (x, z, len, along = 'z') => {   // ghế dài gỗ #6A4325 quay ra phố: chạy theo z, mặt ghế quay ±x (phía −x = tây: quay +X)
    const dir = x < 0 ? 1 : -1;
    mid.box(x, SW + 1.7, z, 1.7, 0.4, len, '#8A5A33'); mid.box(x - dir * 0.8, SW + 3.2, z, 0.4, 2.0, len, '#6A4325'); mid.box(x - dir * 0.6, SW + 2.6, z, 0.3, 0.3, len, '#6A4325');
    for (const dz of [-len / 2 + 0.5, len / 2 - 0.5]) { mid.box(x, SW + 0.85, z + dz, 1.5, 1.7, 0.4, '#1E2024'); mid.box(x - dir * 0.8, SW + 2.2, z + dz, 0.4, 3.6, 0.4, '#1E2024'); }
  };

  // ============ NHÀ GLB ROBLOX (đợt nhà 14/11) — ?rb=0 trên URL hoặc thiếu model → mọi nhà về bản dựng bằng khối bên dưới ============
  // NHA = số đo từng model (bản vẽ output/ep003/roblox/do-nha, phần 0..1 của hộp bao): truoc = mặt tiền của MODEL; n = phạm vi mặt tiền theo trục ngang;
  // s = [mặt tường trước, mặt sau] theo trục sâu; y = [đáy dùng (mặt trên tấm nền kèm theo), đỉnh]; xoay = độ quanh Y để nắn model nằm chéo trong hộp bao.
  const RB = !/[?&]rb=0(&|$)/.test(globalThis.location?.search || '');
  // màu ô cửa sổ ĐỤC của từng model (đã dò bằng tia trên mặt tiền; kính trong suốt thì tự nhận). KHÔNG gộp chung: #04afec là MÁI của nhà nền 4, #1b2a35 là chân tường nhà nền 4
  const RB_KINH = { 'pho-tiem-may': ['80bbdb'], 'pho-nha-nga-ba': ['1b2a35'], 'pho-nha-nen-1': ['ffff00'], 'pho-nha-nen-4': ['ffff00', 'ffb000'] };
  // LUẬT VÂN (16/11): model Roblox màu phẳng (Plastic/SmoothPlastic) → khai báo chất liệu theo MÀU GỐC từng vật liệu (agent soi bản vẽ GLB, output/ep003/roblox/van/)
  // → engine/materials.js vẽ vân gạch/vữa/ngói/gỗ… (thư viện đã duyệt). Tắt riêng: ?vanNha=0 · tắt mọi vân: ô FX vật liệu.
  const VAN_NHA = !/[?&]vanNha=0(&|$)/.test(globalThis.location?.search || '') && {
    'pho-nha-ga': { 'a05f35': 'woodpaint', 'd7c59a': 'plaster', '6e99ca': 'glass', '635f62': 'concrete', 'c4281c': 'shingle' },
    'pho-tiem-gau': { 'a05f35': 'brick', '6a3909': 'woodpaint', 'f8f8f8': 'plaster', '5b5d69': 'stone', '8f4c2a': 'wood', '111111': 'glass' },
    'pho-tiem-banh': { '9fa1ac': 'concrete', 'f8f8f8': 'plaster', '635f62': 'glass', 'dfdfde': 'plaster', 'ff0000': 'fabric' },
    'pho-tiem-may': { 'a4bd47': 'fabric', '7b007b': 'plaster', '2c1703': 'woodpaint', '5b5d69': 'metalpaint', 'f8f8f8': 'plaster', '80bbdb': 'glass' },
    'pho-nha-thi-truong': { 'e5e4df': 'stone', '7c5c46': 'brick', '74869d': 'woodpaint', '635f62': 'shingle' },
    'pho-nha-nga-ba': { 'cdcdcd': 'concrete', 'f8f8f8': 'woodpaint', '1b2a35': 'glass', 'af9483': 'stone', 'a3a2a5': 'concrete', 'be6862': 'brick', '965555': 'brick', '111111': 'metalpaint', '5b5d69': 'metalpaint', '9fa1ac': 'concrete', 'cacbd1': 'concrete', '883e3e': 'brick' },
    'pho-nha-may': { 'a34b4b': 'brick', 'f8f8f8': 'plaster', '635f62': 'concrete', 'a3a2a5': 'concrete', '111111': 'glass' },
    'pho-thap-chuong': { '694028': 'wood', 'd3be96': 'plaster' },
    'pho-nha-nen-1': { '694028': 'woodpaint', '6a3909': 'wood', 'cc8e69': 'wood', 'a05f35': 'wood', 'aba89e': 'concrete', 'f8f8f8': 'plaster', '970000': 'shingle', '750000': 'shingle', 'ffff00': 'glass', '635f62': 'stone' },
    'pho-nha-nen-2': { 'a3a2a5': 'stone', 'a0844f': 'wood', 'bbb3b2': 'stone', 'da867a': 'shingle', 'bc9b5d': 'wood', 'ffffcc': 'plaster' },
    'pho-nha-nen-3': { 'd5733d': 'wood', 'aa5500': 'wood', 'da8541': 'wood', '564236': 'woodpaint', 'ccffcc': 'glass', 'ff5959': 'shingle', 'dfdfde': 'fabric', '5a4c42': 'woodpaint', '694028': 'woodpaint', 'c4281c': 'fabric', '562424': 'brick', '111111': 'glass', 'ff0000': 'fabric', 'a34b4b': 'brick' },
    'pho-nha-nen-4': { 'aa5500': 'woodpaint', '04afec': 'shingle', '635f62': 'stone', 'd3be96': 'plaster', '694028': 'woodpaint', 'ffff00': 'glass' },
    'pho-nha-nen-5': { '5b5d69': 'concrete', 'cacbd1': 'woodpaint', 'ff5959': 'brick', 'f8f8f8': 'plaster', '7c5c46': 'wood' },
    'pho-nha-nen-6': { 'd7c59a': 'plaster', 'c4281c': 'shingle', 'a05f35': 'woodpaint', '6e99ca': 'glass', '635f62': 'concrete' },
    'pho-nha-nen-7': { '6a3909': 'shingle', 'ffffcc': 'plaster' },
  };
  const rbMats = new Set();   // vật liệu của nhà GLB: đêm nâng sáng như litMats, kính/ô cửa phát sáng ấm (setNight)
  const khongVan = (q) => { q.userData.matKind = 'none'; q.userData.grungeKind = 'none'; };   // model Roblox có ảnh vân riêng
  const gomRb = (o, id) => o.traverse((q) => { if (q.isMesh) { khongVan(q); q.castShadow = true; q.receiveShadow = true; for (const mt of [].concat(q.material)) { if (!rbMats.has(mt)) { const u = mt.userData; u.rb0 = u.rb0 && u.rb0.isColor ? u.rb0 : mt.color.clone(); u.rbE = u.rbE && u.rbE.isColor ? u.rbE : mt.emissive.clone(); u.rbK = mt.transparent || mt.opacity < 1 || (RB_KINH[id] || []).includes(u.rb0.getHexString());
      const vk = VAN_NHA && (VAN_NHA[id] || {})[u.rb0.getHexString()]; if (vk && !mt.transparent) { u.matDecl = vk; u.matNguon = 'khai-bao'; } } rbMats.add(mt); }
      if ([].concat(q.material).some((mt) => mt.userData.matDecl)) { delete q.userData.matKind; q.userData.matNguon = 'khai-bao'; } } });   // mảnh đã khai vân theo màu (VAN_NHA) → bỏ cờ 'none' của khongVan để engine vẽ vân; grunge vẫn tắt
  const NHA = {
    'pho-nha-ga': { truoc: '-Z', n: [0.27, 0.95], s: [0.14, 0.94], y: [0.02, 1] },          // nhà chữ L: cánh fx < 0,27 lùi sau; ban công mặt −Z, sàn fy 0,33
    'pho-tiem-gau': { truoc: '+X', n: [0.01, 0.99], s: [0.8, 0], y: [0, 1] },               // mái hiên nhô fx 0,8..1; tường chắn mái fy 0,73..1
    'pho-tiem-banh': { truoc: '-Z', n: [0, 1], s: [0.12, 1], y: [0, 1] },
    'pho-tiem-may': { truoc: '+Z', n: [0.01, 0.99], s: [0.86, 0], y: [0.03, 1] },           // biển đứng trên mái fy 0,77..1
    'pho-nha-thi-truong': { truoc: '-Z', n: [0.02, 0.98], s: [0.19, 0.99], y: [0, 1] },     // hiên cột + dốc nhô tới fz 0,03
    'pho-nha-nga-ba': { truoc: '+Z', n: [0.01, 0.99], s: [0.99, 0.01], y: [0.03, 1] },      // góc vát (+X,+Z)
    'pho-nha-may': { truoc: '+Z', n: [0, 1], s: [1, 0], y: [0, 1] },                        // hai ống khói ở fx 0,79; thân cao fy 0,6
    'pho-nha-nen-1': { truoc: '-Z', n: [0.03, 0.97], s: [0.1, 0.97], y: [0, 1], xoay: -12.5 },
    'pho-nha-nen-2': { truoc: '+X', n: [0.13, 0.87], s: [0.95, 0.05], y: [0, 1] },
    'pho-nha-nen-3': { truoc: '-X', n: [0.07, 0.93], s: [0.15, 0.93], y: [0.05, 1] },
    'pho-nha-nen-4': { truoc: '-Z', n: [0.04, 0.95], s: [0.04, 0.96], y: [0, 1] },
    'pho-nha-nen-5': { truoc: '+Z', n: [0.02, 0.98], s: [0.94, 0.06], y: [0.02, 1] },
    'pho-nha-nen-6': { truoc: '+Z', n: [0.04, 0.96], s: [0.92, 0.02], y: [0, 1] },
    'pho-nha-nen-7': { truoc: '-Z', n: [0.04, 0.96], s: [0.26, 0.95], y: [0.15, 1] },       // bệ gỗ fy 0..0,15 chìm xuống đất
  };
  const RY0 = { '+Z': 0, '-Z': Math.PI, '+X': -Math.PI / 2, '-X': Math.PI / 2 }, _bx = new THREE.Box3(), _sz = new THREE.Vector3();
  // Đặt model vào lô của khung mặt tiền f (face(...) hoặc { W, ry }): du = tâm mặt tiền; w = bề ngang mặt tiền (stud);
  // H = cao từ đáy dùng tới đỉnh | cao = [fy, y] (điểm fy của model nằm ở cao độ y); D = sâu (mặc định co theo bề ngang); kep = [min, max] tỉ lệ ngang/dọc cho phép;
  // lui = lùi mặt tường trước vào trong; y0 = cao độ đáy; lat = lật gương trái–phải. Trả { g, du(f), y(f) } (đổi phần 0..1 của model → du / cao độ) hoặc null.
  const nhaGlb = (f, id, name, { du = 0, w, H: cao0, cao, D, kep, lui = 0, y0 = 0, lat = false, tang = tMid }) => {
    const m = NHA[id]; if (!RB || !fit || !m) return null; const o = fit('nhap/' + id, 1); if (!o) return null;
    const pre = new THREE.Group(); pre.add(o); pre.rotation.y = (m.xoay || 0) * Math.PI / 180; pre.updateMatrixWorld(true);
    _bx.setFromObject(pre, true); _bx.getSize(_sz);
    const N = m.truoc[1] === 'Z' ? 'x' : 'z', S = N === 'x' ? 'z' : 'x', tai = (ax, fr) => _bx.min[ax] + _sz[ax] * fr;
    pre.position[N] -= tai(N, (m.n[0] + m.n[1]) / 2); pre.position[S] -= tai(S, m.s[0]); pre.position.y -= tai('y', m.y[0]);
    const quay = new THREE.Group(); quay.add(pre); quay.rotation.y = RY0[m.truoc];   // mặt tiền của model → +Z cục bộ
    const ky = cao ? (cao[1] - y0) / ((cao[0] - m.y[0]) * _sz.y) : cao0 / ((m.y[1] - m.y[0]) * _sz.y);
    let kw = w / ((m.n[1] - m.n[0]) * _sz[N]); if (kep) kw = Math.min(Math.max(kw, ky * kep[0]), ky * kep[1]);
    const kd = D ? D / (Math.abs(m.s[1] - m.s[0]) * _sz[S]) : kw;
    const co = new THREE.Group(); co.add(quay); co.scale.set(lat ? -kw : kw, ky, kd);
    const g0 = new THREE.Group(); g0.name = name; g0.add(co); const [x, z] = f.W(du, -lui); g0.position.set(x, y0, z); g0.rotation.y = f.ry;
    gomRb(o, id); tang.add(g0);
    const sm = (m.truoc === '+Z' || m.truoc === '-X' ? 1 : -1) * (lat ? -1 : 1) * (f.side === -1 ? -1 : 1), wN = _sz[N] * kw, hY = _sz.y * ky, fc = (m.n[0] + m.n[1]) / 2;
    return { g: g0, kw, ky, kd, du: (fr) => du + sm * (fr - fc) * wN, y: (fr) => y0 + (fr - m.y[0]) * hY };
  };
  // nhà nền hai dãy + ngã ba: 7 mẫu người dùng chọn, xoay vòng theo seed (o.glb = ép một mẫu); cao theo số tầng của mẫu
  const NEN = [1, 2, 3, 4, 5, 6, 7].map((k) => 'pho-nha-nen-' + k);
  const NEN_CAO = { 'pho-nha-nen-1': 21, 'pho-nha-nen-2': 21, 'pho-nha-nen-3': 22, 'pho-nha-nen-4': 20, 'pho-nha-nen-5': 22, 'pho-nha-nen-6': 19, 'pho-nha-nen-7': 19, 'pho-nha-nga-ba': 24 };
  const nhaNen = (f, w, seed, o = {}) => { const id = o.glb || NEN[seed % NEN.length]; return nhaGlb(f, id, 'pho_nha_nen_' + seed, { w: w - 2, H: NEN_CAO[id], kep: [0.7, 1.35], lui: 0.4 }); };
  // ============ NHÀ TÂY ============
  const WEST = { ga: 30, gau: 5, banh: -20, may: -43, tt: -68 };
  // ---------- NHÀ GÀ ----------
  { const f = face(-1, WEST.ga), w = 24, D = 20, H = 17, wall = '#8FA67A', teal = '#1F4A4A', cream = '#EAD9B5';
    // GLB Roblox: sàn ban công của model (mặt sàn đo bằng tia = fy 0,346) đặt đúng y 9,5 = điểm ban_cong; mặt tiền (phần fx 0,27..0,95) phủ lô z 18..42, cánh sau thò về phía tiệm gấu
    if (nhaGlb(f, 'pho-nha-ga', 'pho_nha_ga', { w: 24, cao: [0.346, 9.5], D: 24.5, y0: 0.3 })) {
      // lan can gỗ cao ngang ngực (lan can của model chỉ cao 1,6 ở tỉ lệ này → không đọc ra ban công): mép trước x −9,95, hai đầu z 19,25 / 41,9 (đo bằng tia)
      const go = '#a05f35', rv = 4.05, a = -10.75, b = 11.9, n = 10;
      for (let k = 0; k <= n; k++) { const du = a + (b - a) * k / n; f.b(du, rv, 9.5, 0.5, 0.5, 3.1, go); if (k < n) for (let j = 1; j <= 2; j++) f.b(du + (b - a) / n * j / 3, rv, 11.1, 0.2, 0.2, 1.3, go); }
      f.b((a + b) / 2, rv, 12.4, b - a + 0.6, 0.6, 0.35, go);
      for (const du of [a, b]) { f.b(du, rv / 2 + 0.1, 12.4, 0.6, rv - 0.2, 0.35, go); f.b(du, 2.0, 9.5, 0.5, 0.5, 3.1, go); for (const v of [1.0, 3.0]) f.b(du, v, 11.1, 0.2, 0.2, 1.3, go); }
    } else {
    shellOf(f, w, D, H, wall, cream, { boards: '#7B8F68' });
    const [x0, x1, z0, z1] = ext(f, w, D); roof(x0, x1, z0, z1, H, 6.2, 'x', '#7A3A2A', wall, { lineCol: '#66301f', cap: '#5e2a1d' });
    win(f, 0, 19.2, 2.8, 2.6, teal, 'lit', { cols: 2, rows: 2 });   // cửa sổ đầu hồi
    door(f, -3, 4.2, 7.4, 1.3, '#E6CF8A', cream, { step: true });
    win(f, -9.2, 3.4, 3.8, 4.6, teal, 'lit'); win(f, 6.8, 3.4, 3.8, 4.6, teal, 'lit');
    win(f, -8, 11.4, 3.8, 4.8, teal, 'lit', { rows: 3 });
    // ban công tầng 2 (du 4 ± 6): sàn gạch đất nung, lan can xanh dầu #1F4A4A, cửa ra ban công
    const bd = 4, bw = 12, bdp = 4.2;
    f.b(bd, bdp / 2, 8.9, bw, bdp, 0.6, '#8A4A32'); f.b(bd, bdp / 2, 8.5, bw + 0.3, bdp + 0.3, 0.4, '#5e3626');
    for (const s of [-1, 1]) f.b(bd + s * 4.5, 1.3, 7.0, 0.7, 2.4, 1.8, teal);
    const rail = (du, dv, wu, wv) => f.b(du, dv, 12.4, wu, wv, 0.7, teal);
    for (let k = 0; k <= 5; k++) { const du = bd - bw / 2 + 0.4 + k * (bw - 0.8) / 5; f.b(du, bdp - 0.4, 9.5, 0.8, 0.8, 3.6, teal); if (k < 5) for (let j = 1; j <= 3; j++) f.b(du + j * (bw - 0.8) / 5 / 4, bdp - 0.4, 9.5, 0.3, 0.3, 3.0, teal); }
    rail(bd, bdp - 0.4, bw, 0.95); f.b(bd, bdp - 0.4, 9.7, bw, 0.55, 0.45, teal);
    for (const s of [-1, 1]) { const du = bd + s * (bw / 2 - 0.4); for (const dv of [0.4, bdp / 2, bdp - 0.4]) f.b(du, dv, 9.5, 0.8, 0.8, 3.6, teal); for (const dv of [1.0, 1.9, 2.8, 3.4].slice(0, 3)) f.b(du, dv * 1.0 + 0.1, 9.5, 0.3, 0.3, 3.0, teal); rail(du, bdp / 2, 0.95, bdp); }
    door(f, bd, 4.2, 6.2, 9.6, '#6B4528', teal);
    // dây leo khối #7FA037 leo từ góc nam ban công
    for (let i = 0; i < 12; i++) { const hh = 4.0 + hash(i, 61) * 5.4, su = bd + bw / 2 - 0.4 + (hash(i, 62) - 0.5) * 1.6; f.b(su, bdp - 0.4 + (hash(i, 63) - 0.5) * 1.6, 9.5 + i * 0.6, 1.2 + hash(i, 64) * 0.8, 1.2, 1.1 + hash(i, 65) * 0.8, ['#7FA037', '#6a9030', '#8fb040'][i % 3]); void hh; }
    pot(f, -7, 3.2, SW, '#4E7A32'); pot(f, 1.6, 3.2, SW, '#4E7A32');
    lantern(f, 0.2, 6.2);
    }
  }
  // ---------- TIỆM GẤU (thụt vào 1,6 → hiên rộng) ----------
  { const f = face(-1, WEST.gau, 1.6), w = 26, D = 20, H = 17, wall = '#C46A44', cream = '#EAD9B5', teal = '#2B7E80';
    const G = nhaGlb(f, 'pho-tiem-gau', 'pho_tiem_gau', { w: 26, H: 18, D: 20, lat: true });
    if (G) {   // GLB Roblox (lật gương để ô kính lớn nằm sau bàn trưng): kệ kính gấu đặt vào ô kính của model, biển đầu gấu trên tường chắn mái, biển treo hạ xuống dưới mái hiên
      // đợt 5 (16/11): 6 gấu kệ nhà máy (cao 1,5) trên 2 tầng kệ sau ô kính, thay tấm ảnh gấu phẳng; ?gauKe=0 / ?rb=0 → ảnh phẳng.
      // Model gấu nạp xong SAU khi env dựng (cast.js) → dựng gấu lười ở update() lần đầu gauKeOn() đúng, rồi ẩn ảnh phẳng.
      const poster = f.plane(G.du(0.69), 0.14, G.y(0.38), 10.2, 4.6, dispMat(dispTex('gau', 512, 256)), 'pho_ke_kinh_tiem_gau');
      daoGau = () => {
        const du0 = G.du(0.69), yc = G.y(0.38), nen = new THREE.MeshBasicMaterial({ color: '#9a6a38' }), kep = new THREE.MeshBasicMaterial({ color: '#6a4222' });   // Basic: nội thất tiệm bị bóng model che, vật liệu lit đen thui; đêm dịu bớt
        if (nightNow) { nen.color.multiplyScalar(0.55); kep.color.multiplyScalar(0.55); }
        if (poster) poster.visible = false;
        if (/[?&]gauKinhCu=1(&|$)/.test(globalThis.location?.search || '')) f.plane(du0, -1.5, yc, 10.2, 4.6, nen, 'pho_ke_gau_nen');
        else f.plane(du0, -0.86, 6.65, 10.2, 5.9, nen, 'pho_ke_gau_nen');   // tấm kính ĐEN đục của model nằm ở dv −0,89 (x −16,49, đo bằng tia) che mất nền ở −1,5 → kéo nền ra ngay trước nó, cao trọn ô kính y 3,7..9,6
        // góp ý 3D 16/11: 2 tầng kệ (dưới hạ 0,9 → mặt 3,73), mỗi tầng 3 gấu TO cao ~3,1, quay ra phố, hơi cúi; số = đúng chỗ người dùng kéo trong trình phát (toạ độ thế giới).
        //   ?gauKinhCu=1 → bản 6 gấu nhỏ cao 1,5 trước góp ý. Gấu 00: x −16,65 → −16,45 (sau tấm nền là bị che).
        const cu = /[?&]gauKinhCu=1(&|$)/.test(globalThis.location?.search || '');
        for (const [ti, yb] of [[0, cu ? yc - 2.2 : 3.731], [1, yc + 0.1]]) { const sh = new THREE.Mesh(new THREE.BoxGeometry(10.2, 0.14, 1.5), kep); sh.name = 'pho_ke_gau_van'; const [sx, sz] = f.W(du0, -0.85); sh.position.set(sx, yb - 0.07, sz); sh.rotation.y = f.ry; tMid.add(sh); }
        const D = Math.PI / 180, GAU = cu ? null : [   // [tên, biến thể, vị trí, xoay° XYZ, cỡ]
          ['10', 1, [-16.45, 6.94, -3.025], [76.9, 75.5, -79.3], [1.22, 0.946, 0.478]], ['11', 2, [-16.45, 6.94, 0.529], [72.6, 76.9, -77.3], [1.174, 1.045, 0.514]], ['12', 0, [-15.959, 6.94, 3.784], [40.6, 89, -48.2], [1.194, 0.954, 0.453]],
          ['00', 1, [-16.45, 3.785, -3.025], [76.9, 75.5, -79.3], [1.22, 0.946, 0.478]], ['01', 2, [-16.264, 3.557, 0.529], [72.6, 76.9, -77.3], [1.174, 1.045, 0.514]], ['02', 0, [-15.462, 3.811, 3.784], [40.6, 89, -48.2], [1.194, 0.954, 0.453]]];
        if (GAU) for (const [ten, v, p, r, sc] of GAU) { const k = gauKeStatic(THREE, v), m = new THREE.Mesh(k.geometry, k.materials); m.name = 'pho_ke_gau_kinh_' + ten; m.position.set(...p); m.rotation.set(r[0] * D, r[1] * D, r[2] * D); m.scale.set(...sc); m.castShadow = false; tMid.add(m); }
        else for (const [ti, yb] of [[0, yc - 2.2], [1, yc + 0.1]]) {
          for (let i = 0; i < 3; i++) { const v = (i + ti) % 3, k = gauKeStatic(THREE, v), du = du0 + (i - 1) * 3.3 + (ti ? 1.0 : -0.5) + (hash(i, 90 + ti) - 0.5) * 0.6, sc = (1.5 / k.size[1]) * (0.92 + hash(i, 91 + ti) * 0.16);
            const m = new THREE.Mesh(k.geometry, k.materials); m.name = 'pho_ke_gau_kinh_' + ti + i; m.scale.setScalar(sc); const [x, z] = f.W(du, -0.85); m.position.set(x, yb, z); m.rotation.y = f.ry + (hash(i, 92 + ti) - 0.5) * 0.5; m.castShadow = false; tMid.add(m); } }
      };
      f.plane(0, 0.3, G.y(1) + 2.9, 5.6, 5.6, signMat(texPlaque), 'pho_bien_dau_gau'); for (const s of [-1, 1]) f.b(s * 1.5, 0.1, G.y(1) - 0.3, 0.3, 0.3, 1.0, '#1E2024');
      f.plane(G.du(0.275) + (/[?&]gauKinhCu=1(&|$)/.test(globalThis.location?.search || '') ? 0 : 1.36), -2.6, (G.y(0.085) + G.y(0.585)) / 2, 13, 10.4, dispMat(dispTex('gau', 640, 512)), 'pho_gian_trong_tiem_gau');   // mặt tiền model để hở (fz 0,10..0,45): nhìn vào thấy kệ gấu thay vì hộp trắng rỗng
      { const du = 11.6, dy = -4.4; f.b(du, 1.8, 14.5 + dy, 0.35, 3.6, 0.35, '#1E2024'); f.b(du, 3.0, 11.3 + dy, 0.25, 0.25, 3.3, '#1E2024'); const [x, z] = f.W(du, 3.0); const m = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 3.0), signMat(texHang)); m.position.set(x, 11.8 + dy, z); m.rotation.y = 0; m.name = 'pho_bien_treo_gau'; tMid.add(m); }
      lantern(f, -11.6, 6.8);
    } else {
    shellOf(f, w, D, H, wall, cream);
    const [x0, x1, z0, z1] = ext(f, w, D); roof(x0, x1, z0, z1, H, 6.4, 'z', '#8C3A2A', wall, { lineCol: '#762f22', cap: '#6e2a1e' });
    door(f, 7.2, 4.2, 7.6, SW, '#1F5560', cream);
    win(f, -4, 2.8, 10.6, 4.8, '#5A3A22', 'none', { cols: 3, rows: 1 });
    f.plane(-4, 0.08, 5.2, 10.6, 4.8, dispMat(dispTex('gau', 512, 256)), 'pho_ke_kinh_tiem_gau');
    win(f, -8, 11.4, 3.8, 4.4, cream, 'lit', { flower: true }); win(f, 8, 11.4, 3.8, 4.4, cream, 'lit', { flower: true });
    awning(f, { du0: -11, du1: 11, y: 9.4, proj: 5.2, drop: 1.9, cols: [teal, '#EAD9B5'], stripe: 1.5, valance: 1.3, scallop: true, edge: '#1d5859' });
    f.plane(0, 0.16, 13.4, 7, 7, signMat(texPlaque), 'pho_bien_dau_gau');
    // biển treo vuông góc với tường trên tay sắt (S003)
    { const du = 11.6; f.b(du, 1.8, 14.5, 0.35, 3.6, 0.35, '#1E2024'); f.b(du, 3.0, 11.3, 0.25, 0.25, 3.3, '#1E2024'); const [x, z] = f.W(du, 3.0); const m = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 3.0), signMat(texHang)); m.position.set(x, 11.8, z); m.rotation.y = 0; m.name = 'pho_bien_treo_gau'; tMid.add(m); }
    planterBox(f, 3.4, 1.4, 3.0);
    lantern(f, 2.4, 6.8); lantern(f, -11.6, 6.8);
    }
    // bàn trưng ngoài hiên (mặt bàn y 3,15; dài 11 từ du −9.5..1.5)
    { const du = -4, dv = 3.7; f.b(du, dv, SW + 2.4, 11, 2.2, 0.35, '#8A5A33'); for (const [a, bb] of [[-5.1, 2.8], [5.1, 2.8], [-5.1, 4.6], [5.1, 4.6]]) f.b(du + a, bb, SW, 0.5, 0.5, 2.4, '#6A4325'); f.b(du, 4.7, SW + 0.9, 10.6, 0.2, 1.4, '#7a4f2c'); f.b(du, 2.7, SW + 0.9, 10.6, 0.2, 1.4, '#7a4f2c'); }
    pot(f, -11.6, 2.2, SW, '#4E7A32', '#F5F0E0', 0.9);
  }
  // ---------- TIỆM BÁNH ----------
  { const f = face(-1, WEST.banh), w = 24, D = 20, H = 14, wall = '#E3C9A0', cream = '#F0E4CF', wood = '#8A5A33';
    const G = nhaGlb(f, 'pho-tiem-banh', 'pho_tiem_banh', { w: 24, H: 16, D: 20 });
    if (G) {   // GLB Roblox: ô kính trưng bánh lớn bên trái cửa (che 2 cửa sổ nhỏ của model), biển ổ bánh dựng trên tường chắn mái
      win(f, -6.9, 2.8, 10, 4.8, wood, 'none', { cols: 4, rows: 1 });
      f.plane(-6.9, 0.08, 5.2, 10, 4.8, dispMat(dispTex('banh', 768, 256)), 'pho_ke_kinh_tiem_banh');
      f.plane(0, -0.3, G.y(1) + 2.6, 8.4, 4.6, signMat(texBread), 'pho_bien_o_banh');
      for (const s of [-1, 1]) f.b(s * 3.4, -0.5, G.y(1) - 0.4, 0.3, 0.3, 1.2, '#1E2024');
    } else {
    shellOf(f, w, D, H, wall, cream, { band: false });
    const [x0, x1, z0, z1] = ext(f, w, D); roof(x0, x1, z0, z1, H, 8.4, 'x', '#8C3A2A', wall, { lineCol: '#762f22', cap: '#6e2a1e' });
    f.plane(0, 0.22, 17.2, 8.4, 4.6, signMat(texBread), 'pho_bien_o_banh');
    f.b(-3.5, 0.3, SW, 12.4, 0.6, 2.4, wood);
    win(f, -3.5, 2.8, 12, 4.8, wood, 'none', { cols: 4, rows: 1 });
    f.plane(-3.5, 0.08, 5.2, 12, 4.8, dispMat(dispTex('banh', 768, 256)), 'pho_ke_kinh_tiem_banh');
    door(f, 8.8, 4.0, 7.4, SW, wood, wood);
    win(f, -7.5, 10.6, 3.6, 3.2, '#6e4423', 'lit'); win(f, 7.5, 10.6, 3.6, 3.2, '#6e4423', 'lit');
    awning(f, { du0: -11, du1: 11, y: 8.8, proj: 4.6, drop: 1.9, cols: ['#B03A2A', '#F0E4CF'], stripe: 1.6, valance: 1.2, scallop: true });
    lantern(f, -11.4, 7.2); lantern(f, 5.2, 7.2);
    }
    planterBox(f, 4.4, 2.8, 2.6);
    pot(f, 11.5, 2.2, SW, '#4E7A32');
    bench(-11.4, WEST.banh - 13.0, 7);   // tại ranh tiệm bánh / tiệm may, quay ra phố
  }
  // ---------- TIỆM MAY ----------
  { const f = face(-1, WEST.may), w = 22, D = 20, H = 16, wall = '#8C70A8', cream = '#E8D8C0', dark = '#4a2f60';
    const G = nhaGlb(f, 'pho-tiem-may', 'pho_tiem_may', { w: 22, H: 20, D: 20 });
    if (G) {   // GLB Roblox: hai kệ kính (ma-nơ-canh, vải) đặt trong ô kính lớn của model; biển cuộn chỉ che biển chữ trên mái
      f.plane(G.du(0.2), 0.14, G.y(0.31), 5.2, 4.8, dispMat(dispTex('may', 384, 288)), 'pho_ke_kinh_tiem_may');
      f.plane(G.du(0.45), 0.14, G.y(0.31), 4.4, 4.8, dispMat(dispTex('vai', 256, 256)), 'pho_ke_kinh_vai');
      f.plane(G.du(0.5), 0.3, G.y(0.885), 4.6, 4.6, signMat(texSpool), 'pho_bien_cuon_chi');
      lantern(f, G.du(0.6), 7.0);
    } else {
    shellOf(f, w, D, H, wall, cream, { band: false });
    const [x0, x1, z0, z1] = ext(f, w, D); roof(x0, x1, z0, z1, H, 5.6, 'z', '#6E3A36', wall, { lineCol: '#5a2e2b', cap: '#4e2825' });
    f.plane(0.4, 0.2, 13.1, 4.4, 5.4, signMat(texSpool), 'pho_bien_cuon_chi');
    win(f, -6.2, 2.8, 6.4, 4.8, cream, 'none', { cols: 2, rows: 1 });
    f.plane(-6.2, 0.08, 5.2, 6.4, 4.8, dispMat(dispTex('may', 384, 288)), 'pho_ke_kinh_tiem_may');
    win(f, 8, 2.8, 4.4, 4.8, cream, 'none', { cols: 2, rows: 1 });
    f.plane(8, 0.08, 5.2, 4.4, 4.8, dispMat(dispTex('vai', 256, 256)), 'pho_ke_kinh_vai');
    door(f, 1.6, 4.0, 7.4, SW, dark, cream);
    win(f, -7, 10.6, 3.4, 4.0, cream, 'lit'); win(f, 7.5, 10.6, 3.4, 4.0, cream, 'lit');
    awning(f, { du0: -9.6, du1: 9.6, y: 8.6, proj: 4.2, drop: 1.8, cols: ['#6A4A82', '#5f4376'], stripe: 1.6, valance: 1.1 });
    lantern(f, -1.6, 7.0); lantern(f, 5.6, 7.0);
    }
    pot(f, 10.2, 2.2, SW, '#4E7A32', '#8B6FC0', 0.9); pot(f, -10.4, 2.2, SW, '#4E7A32', '#8B6FC0', 0.9);
  }
  // ---------- NHÀ THỊ TRƯỞNG (hiên 3 bậc đá, cửa mở được) ----------
  let doorPivot = null, sanThiTruong = false;
  { const f = face(-1, WEST.tt), w = 26, D = 22, H = 17, wall = '#4A5A66', cream = '#E3D3B0', FL = 2.8, DW = 5.2, DH = 8.0;
    // GLB Roblox = THÂN biệt thự lùi sau 9,8 (hiên cột của model nằm khuất sau sảnh); phần chức năng giữ bằng khối: SẢNH CỬA nhô ra (hốc đại sảnh, cửa mở được, 3 bậc đá, hiên 2 cột) đúng vị trí cũ
    const TT = nhaGlb(f, 'pho-nha-thi-truong', 'pho_nha_thi_truong', { w: 26, H: 28, D: 18, lui: 9.8 });
    if (TT) { const br = '#7c5c46', sat = '#1E2024'; sanThiTruong = true;
      for (const s of [-1, 1]) f.b(s * 3.9, -5, 0, 2.6, 10, FL + DH + 2.6, br);   // hai má sảnh (du 2,6..5,2), sâu tới tường biệt thự
      f.b(0, -5, FL + DH, DW, 10, 2.6, br); f.b(0, -3, 0, DW, 6, FL, '#8A857F'); f.b(0, -8, 0, DW, 4, FL + DH, br);   // trán sảnh + nền + khối đặc sau hốc
      f.b(0, -5, FL + DH + 2.6, 11.2, 10.8, 0.7, cream); f.b(0, -5, FL + DH + 3.3, 9.8, 9.6, 0.6, '#635f62');   // gờ + mái sảnh
      for (const s of [-1, 1]) {   // sân trước hai bên sảnh: tường gạch thấp + hàng rào sắt + giậu xanh trên đường mặt tiền
        f.b(s * 9.1, -0.4, 0, 7.8, 0.8, 2.4, br); f.b(s * 9.1, -0.4, 2.4, 8.0, 1.0, 0.3, cream);
        for (let k = 0; k < 6; k++) f.b(s * (5.9 + k * 1.2), -0.4, 2.7, 0.22, 0.22, 2.3, sat); f.b(s * 9.1, -0.4, 4.7, 7.6, 0.2, 0.2, sat);
        f.b(s * 12.9, -0.4, 0, 0.9, 1.0, 5.6, br); f.b(s * 12.9, -0.4, 5.6, 1.2, 1.3, 0.35, cream);
        f.b(s * 9.0, -1.9, 0, 7.2, 1.6, 4.3, '#4E7A32'); f.b(s * 9.0, -1.9, 4.3, 6.6, 1.2, 0.5, '#5c8a3a');
      }
      f.b(-13.2, -4.9, 0, 0.8, 9.8, 5.6, br); f.b(-13.2, -4.9, 5.6, 1.1, 10.0, 0.35, cream);   // bịt đầu bắc sân (nhìn từ ngã ba không xuyên qua sân)
    }
    const hole = (y0, y1) => y0 < FL + DH && y1 > FL;
    // thân chia mảnh quanh khung cửa: tường ngoài dày 1 + hốc đại sảnh sâu 5 (hộp sơn kem) + thân đặc phía sau
    if (!TT) {
    f.b(0, -(D + 6) / 2 - 0.0, 0, w, D - 6, H, wall);   // phía sau hốc (dv −6 … −D)
    }
    if (!TT) {
    for (const s of [-1, 1]) f.b(s * ((w + DW) / 4), -3, 0, (w - DW) / 2, 6, H, wall);
    }
    if (!TT) {
    f.b(0, -3, FL + DH, DW, 6, H - FL - DH, wall); f.b(0, -3, 0, DW, 6, FL, '#8A857F');
    }
    // hốc: tường trong sơn kem + sàn gỗ
    f.b(0, -3, FL, DW, 6, 0.3, '#7a5636'); for (const s of [-1, 1]) f.b(s * (DW / 2 - 0.1), -3, FL + 0.3, 0.2, 5.9, DH - 0.3, '#cdbb98'); f.b(0, -3, FL + DH - 0.2, DW, 5.9, 0.2, '#cdbb98');
    f.b(0, -5.95, FL, DW, 0.1, DH, '#ffffff', inner);
    if (!TT) {
    f.b(0, 0.3, 0, w, 0.6, 1.5 + SW, '#8A857F');
    }
    if (!TT) {
    for (const s of [-1, 1]) f.b(s * (w / 2 - 0.4), 0.2, 0, 0.8, 0.4, H, cream);
    }
    if (!TT) {
    f.b(0, 0.15, H - 0.5, w + 0.6, 0.9, 0.7, cream);
    }
    if (!TT) {
    for (let y = 2.2; y < H - 0.5; y += 1.3) { for (const [a, b2] of [[-w / 2 + 0.8, -DW / 2 - 0.5], [DW / 2 + 0.5, w / 2 - 0.8]]) f.b((a + b2) / 2, 0.04, y, b2 - a, 0.1, 0.1, '#3d4b56', mid, true); if (!hole(y, y + 0.1)) f.b(0, 0.04, y, DW + 1, 0.1, 0.1, '#3d4b56', mid, true); }
    }
    f.b(0, 0.25, FL + DH + 0.9, DW + 1.4, 0.8, 0.9, cream); for (const s of [-1, 1]) f.b(s * (DW / 2 + 0.45), 0.4, FL, 0.8, 0.8, DH + 0.9, cream);
    if (!TT) {
    const [x0, x1, z0, z1] = ext(f, w, D); roof(x0, x1, z0, z1, H, 6.2, 'z', '#3A3A44', wall, { lineCol: '#2e2e36', cap: '#26262d' });
    }
    if (!TT) {
    win(f, -8, 5.4, 3.8, 4.4, cream, 'lit', { rows: 3 }); win(f, 8, 5.4, 3.8, 4.4, cream, 'lit', { rows: 3 }); win(f, -8, 11.8, 3.8, 4.4, cream, 'lit', { rows: 3 }); win(f, 8, 11.8, 3.8, 4.4, cream, 'dark', { rows: 3 });
    }
    // 3 bậc đá #8A857F (mặt bậc y 2,8 / 2,07 / 1,33) + sàn hiên
    f.b(0, 0.65, 0, 9.6, 1.3, FL - 0.03, '#8A857F'); f.b(0, 1.75, 0, 9.0, 1.1, FL - 0.76, '#9a958e'); f.b(0, 2.85, 0, 9.6, 1.1, FL - 1.5, '#8f8a84');
    for (const s of [-1, 1]) { f.b(s * 4.1, 1.7, 0, 0.7, 3.4, 3.4, '#8A857F'); }
    // hiên: 2 cột kem + mái nhỏ + đèn đồng
    for (const s of [-1, 1]) f.b(s * 4.2, 3.2, FL, 0.9, 0.9, 9.0, cream);
    f.b(0, 2.0, FL + 8.9, 10.4, 4.6, 0.8, cream); f.b(0, 1.6, FL + 9.7, 11, 3.8, 0.5, '#3A3A44');
    lantern(f, -DW / 2 - 2.3, 7.4);
    for (let i = 0; i < 2; i++) { const s = i ? 1 : -1; pot(f, s * 6.4, 2.6, SW, '#4E7A32', '#8B6FC0', 1.1); pot(f, s * 6.4 + s * 1.9, 2.4, SW, '#4E7A32', '#7a60b0', 0.9); }
    // CỬA: bản lề bên nam (+z), mở vào trong (−x). e.setDoor(k) 0..1 → xoay 0..100°
    const [hx, hz] = f.W(DW / 2 - 0.2, -0.3);
    doorPivot = new THREE.Group(); doorPivot.name = 'pho_cua_thi_truong'; doorPivot.position.set(hx, FL, hz); tMid.add(doorPivot);
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.45, DH - 0.2, DW - 0.4), new THREE.MeshStandardMaterial({ color: '#1E2230', roughness: 0.6 })); leaf.position.set(0, (DH - 0.2) / 2, -(DW - 0.4) / 2); leaf.name = 'pho_canh_cua'; leaf.castShadow = true; doorPivot.add(leaf);
    for (const yy of [0.28, 0.74]) { const pn = new THREE.Mesh(new THREE.BoxGeometry(0.5, 2.8, DW * 0.6), new THREE.MeshStandardMaterial({ color: '#161a26', roughness: 0.7 })); pn.position.set(0.04, (DH - 0.2) * yy + 0.2, -(DW - 0.4) / 2); pn.name = 'pho_o_cua'; doorPivot.add(pn); }
    const kn = new THREE.Mesh(new THREE.SphereGeometry(0.4, 10, 8), new THREE.MeshStandardMaterial({ color: '#B8903A', metalness: 0.6, roughness: 0.4 })); kn.position.set(0.5, 3.6, -(DW - 1.3)); kn.name = 'pho_nam_cua'; doorPivot.add(kn);
    const kn2 = kn.clone(); kn2.position.x = -0.5; doorPivot.add(kn2);
  }

  // ============ NHÀ ĐÔNG + nền ============
  const palettes = [['#D9B896', '#7A3A2A'], ['#A9C0A0', '#6a3a30'], ['#C7B2D6', '#4a3a50'], ['#E3C9A0', '#8C3A2A'], ['#9FB8C9', '#5a4a4a'], ['#E8DCC0', '#6E3A36'], ['#d9a98a', '#4e3a3a']];
  const plain = (side, c, w, wall, roofC, seed, o = {}) => {
    const f = face(side, c, o.set || 0), D = o.D || 20, H = o.H || 16, trim = o.trim || '#E8D8C0';
    if (nhaNen(f, w, seed, o)) return f;   // GLB Roblox; null → bản khối bên dưới
    shellOf(f, w, D, H, wall, trim, { band: o.band !== false });
    const [x0, x1, z0, z1] = ext(f, w, D); roof(x0, x1, z0, z1, H, o.rise || 5.8, worldRidge(f, o.ridge || (hash(seed, 3) < 0.4 ? 'perp' : 'par')), roofC, wall, {});
    const dd = (hash(seed, 4) - 0.5) * (w - 10);
    if (!o.noDoor) door(f, dd, 4, 7.4, SW, ['#6a4325', '#2a4a50', '#7a3a2a', '#2f3a5a'][seed % 4], trim);
    const gx = [-w / 2 + 3.6, w / 2 - 3.6, 0].filter((x) => Math.abs(x - dd) > 4.4);
    for (const x of gx) { win(f, x, 3.4, 3.4, 4.2, trim, hash(seed + x, 5) < 0.7 ? 'lit' : 'dark'); }
    if (!o.noUpper) for (const x of [-w / 2 + 3.6, 0, w / 2 - 3.6].slice(0, w < 21 ? 2 : 3)) win(f, w < 21 ? x * 0.9 : x, o.upperY || 10.6, 3.4, 4.0, trim, hash(seed + x, 6) < 0.6 ? 'lit' : 'dark', { flower: hash(seed + x, 8) < 0.3 });
    return f;
  };
  // nhà MÁI HIÊN XANH LAM (đối diện ban công nhà Gà, du=0 ↔ z=34)
  { const f = face(1, 34), w = 22, D = 20, H = 17, upper = '#E8DCC0', lower = '#55688a', slate = '#52648C';
    f.b(0, -D / 2, 0, w, D, 9.0, lower); f.b(0, -D / 2, 9.0, w, D, H - 9.0, upper); f.b(0, 0.3, 0, w, 0.6, 1.5 + SW, '#8A857F'); f.b(0, 0.2, 8.8, w + 0.5, 0.7, 0.5, '#6A7FA8');
    for (const s of [-1, 1]) f.b(s * (w / 2 - 0.4), 0.2, 0, 0.8, 0.4, H, '#d6c8a8'); f.b(0, 0.15, H - 0.5, w + 0.6, 0.9, 0.7, '#d6c8a8');
    const [x0, x1, z0, z1] = ext(f, w, D); roof(x0, x1, z0, z1, H, 6, 'z', '#6E3A36', upper, { lineCol: '#5a2e2b', cap: '#4e2825' });
    win(f, 5, 2.8, 8.4, 4.8, '#E8DCC0', 'lit', { cols: 3, rows: 2 }); door(f, -5, 4, 7.4, SW, '#2a3548', '#E8DCC0');
    win(f, -6.5, 11.6, 3.6, 4.2, '#6A7FA8', 'lit'); win(f, 6.5, 11.6, 3.6, 4.2, '#6A7FA8', 'lit');
    awning(f, { du0: -9.4, du1: 9.4, y: 10.0, proj: 5.2, drop: 0.9, cols: [slate], stripe: 2.7, valance: 1.2, scallop: true, edge: '#6A7FA8' });
    lantern(f, -1.6, 6.6);
    bench(11.4, 34 + 9.4, 7); planterBox(f, -9.9, 2.4, 2.4, '#F5F0E0'); pot(f, 10.2, 2.2, SW, '#4E7A32');
  }
  plain(1, 10, 24, '#D9B896', '#7A3A2A', 21); plain(1, -14, 24, '#A9C0A0', '#6a3a30', 22); plain(1, -38, 24, '#C7B2D6', '#4a3a50', 23); plain(1, -62, 24, '#E3C9A0', '#8C3A2A', 24);
  // nam của phố: hai dãy kéo dài tới z=+110 (nhà nền ít chi tiết hơn)
  for (let k = 0; k < 3; k++) { const [wc, rc] = palettes[(k + 1) % 7], [wc2, rc2] = palettes[(k + 4) % 7]; plain(-1, 54 + 24 * k, 24, wc, rc, 30 + k, { D: 18 }); plain(1, 58 + 24 * k, 22, wc2, rc2, 40 + k, { D: 18 }); }
  // ============ NGÃ BA: dãy bắc (mặt quay nam) + đường ngang ============
  { const xs = [-4, 20, 44, 68, 92]; xs.forEach((x, i) => { const [wc, rc] = palettes[(i + 2) % 7]; plain('B', x, 22, wc, rc, 60 + i, { D: 20, H: 16 + (i % 2) * 2, glb: i === 0 || i === 3 ? 'pho-nha-nga-ba' : i === 1 ? 'pho-nha-nen-4' : null }); });
    // nhà đông nam đường ngang (mặt quay bắc, z=−77): dựng bằng khối xoay — dùng face 'B' lật: tạo thủ công
    const south = (x, w, wall, roofC, seed) => { if (nhaNen({ W: (du, dv) => [x + du, -77 - dv], ry: Math.PI }, w, seed, { glb: seed === 71 ? 'pho-nha-nga-ba' : null })) return; const D = 20, H = 16, z1 = -77, z0 = z1 + D; mid.box(x, H / 2, (z0 + z1) / 2, w, H, D, wall); roof(x - w / 2, x + w / 2, z1, z0, H, 5.6, hash(seed, 3) < 0.5 ? 'x' : 'z', roofC, wall, {});
      for (const dx of [-w / 2 + 4, 0, w / 2 - 4]) { glassL.box(x + dx, 5.4, z1 - 0.1, 3.4, 4.2, 0.2, '#ffffff'); mid.box(x + dx, 5.4, z1 - 0.3, 4.4, 0.5, 0.6, '#E8D8C0'); mid.box(x + dx, 3.0, z1 - 0.3, 4.6, 0.5, 0.8, '#E8D8C0'); glassD.box(x + dx, 12.2, z1 - 0.1, 3.4, 4.0, 0.2, '#ffffff'); mid.box(x + dx, 14.4, z1 - 0.3, 4.4, 0.5, 0.6, '#E8D8C0'); }
      mid.box(x + w / 2 - 6, 3.8, z1 - 0.3, 4.4, 7.4, 0.6, '#E8D8C0'); mid.box(x + w / 2 - 6, 3.8, z1 - 0.15, 4, 7.4, 0.4, ['#6a4325', '#2a4a50'][seed % 2]); };
    south(50, 24, '#D9B896', '#7A3A2A', 71); south(75, 24, '#A9C0A0', '#6a3a30', 72);
    // nhánh tây ngắn: nhà chặn đầu (mặt quay +X, x=−35) + nhà góc tây
    plain(-1, -91, 22, '#9FB8C9', '#5a4a4a', 80, { set: 21, D: 18, glb: 'pho-nha-nga-ba' });
  }

  // ============ NHÀ MÁY (xa) ============
  { const x0 = 112, x1 = 152, z0 = -112, z1 = -72, H = 22, br = '#8A3A2C';
    // GLB Roblox (lật gương: hai ống khói về phía bắc như bản khối; mặt dài quay −X ra cổng). Thân cao 27, ống khói ~45
    if (!nhaGlb({ W: (du, dv) => [x0 - dv, -92 + du], ry: -Math.PI / 2 }, 'pho-nha-may', 'pho_nha_may', { w: 64, cao: [0.6, 27], D: 22, lat: true, tang: tBack })) {
    back.box((x0 + x1) / 2, H / 2, (z0 + z1) / 2, x1 - x0, H, z1 - z0, br);
    for (let z = z0 + 3; z < z1; z += 6) back.box(x0 - 0.3, H / 2, z, 0.8, H, 1.2, '#7a3226');
    for (let z = z0 + 6; z < z1 - 3; z += 7) for (let y = 6; y < H - 3; y += 6) { glassL.box(x0 - 0.15, y + 1.6, z, 0.3, 3.2, 2.8, '#ffffff'); back.box(x0 - 0.4, y + 1.6, z, 0.3, 3.8, 3.4, '#1F4A4A'); }
    back.box(x0 - 0.2, 2.2, -92, 0.6, 4.4, 8, '#1F4A4A');
    for (let i = 0; i < 4; i++) back.box(x0 + 10 + i * 9, H + 2.4, (z0 + z1) / 2 + 6, 8, 4.8, 36, '#4a4a52', 0, 0, 0.0);
    back.box(146, 34, -104, 5, 68, 5, '#7a3226'); back.box(146, 68.8, -104, 6.4, 1.6, 6.4, '#2a2a30'); back.box(146, 3, -104, 7, 6, 7, '#6a2c20');
    }
    // hàng rào sắt + cổng 2 cánh tại x=106
    const fenceC = '#1A3C3C';
    for (let z = -110; z <= -72; z += 2.4) { if (Math.abs(z + 91) < 4.6) continue; back.box(106, 4.5, z, 0.45, 9, 0.45, fenceC); back.box(106, 9.2, z, 0.8, 0.8, 0.8, fenceC); }
    back.box(106, 2.6, -91 + 0.0, 0.5, 0.5, 38, fenceC, 0, 0, 0); back.box(106, 8.0, (-110 - 72) / 2, 0.5, 0.5, 38, fenceC);
    for (const s of [-1, 1]) { back.box(106, 5.5, -91 + s * 4.6, 0.9, 11, 0.9, '#2a5050'); for (let k = 0; k < 7; k++) back.box(106, 4.5, -91 + s * (0.6 + k * 0.6), 0.3, 8.5, 0.3, fenceC); back.box(106, 4.5, -91 + s * 2.4, 0.3, 9.6, 0.3, fenceC, 0.0, 0, s * 0.0); back.box(106, 4.5, -91 + s * 2.4, 0.35, 0.35, 5.0, fenceC, 0.8 * s, 0, 0); }
    flat('pho_san_nha_may', null, 106, 156, -114, -70, 0.06, 1, tBack, { kind: 'concrete', mat: new THREE.MeshStandardMaterial({ color: '#7C7A80', roughness: 0.95 }) });
  }
  // tháp chuông xa
  { const th = RB && fit ? fit('nhap/pho-thap-chuong', 58) : null;   // GLB Roblox, cao 58
    if (th) { gomRb(th, 'pho-thap-chuong'); th.name = 'pho_thap_chuong'; th.position.set(-70, 0, -190); tBack.add(th); } else {
  back.box(-70, 20, -190, 10, 40, 10, '#d9c9a8'); back.box(-70, 44, -190, 7, 8, 7, '#cdbb98'); back.box(-70, 50, -190, 8, 1, 8, '#3A3A44'); for (const [ax, az, bx, bz] of [[-74.5, -194.5, -65.5, -194.5], [-65.5, -194.5, -65.5, -185.5], [-65.5, -185.5, -74.5, -185.5], [-74.5, -185.5, -74.5, -194.5]]) back.tri([ax, 50.5, az], [bx, 50.5, bz], [-70, 58, -190], '#3A3A44');
  glassL.box(-70, 44, -185.4, 3, 4, 0.3, '#ffffff');
    } }

  // ============ ĐƯỜNG + VỈA HÈ + MẶT ĐẤT ============
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1200, 1200), new THREE.MeshStandardMaterial({ color: '#7f8f5d', roughness: 1 })); ground.rotation.x = -Math.PI / 2; ground.position.y = -0.12; ground.name = 'pho_dat'; litMats.push(ground.material); ground.receiveShadow = true; ground.userData.matKind = 'grassground'; ground.userData.matNguon = 'khai-bao'; ground.userData.grungeKind = 'none'; tMid.add(ground);
  flat('pho_duong_chinh', cobbleTex, -9, 9, -100, 130, 0.0, 12, tMid); flat('pho_duong_ngang', cobbleTex, -33, 108, -100, -82, 0.0, 12, tMid);
  const walk = (name, x0, x1, z0, z1) => flat(name, walkTex, x0, x1, z0, z1, SW, 5, tMid);
  walk('pho_vha_he_tay', -14, -9, -82, 130); walk('pho_vha_he_dong', 9, 14, -82, 130); walk('pho_vha_he_tay_bac', -14, -9, -105, -100); walk('pho_vha_he_bac', -14, 108, -105, -100); walk('pho_vha_he_nam', 14, 108, -82, -77);
  // bó vỉa (mặt đứng #9a958e)
  const curb = (x, z, w, d) => mid.box(x, SW / 2, z, w, SW, d, '#9a958e', 0, 0, 0, true);
  curb(-9.15, 24, 0.3, 212); curb(9.15, 24, 0.3, 212); curb(40, -100.15, 148, 0.3); curb(61, -81.85, 94, 0.3);
  // dải đường đá nhấn: vạch viền nhạt
  // ============ ĐỒ ĐƯỜNG PHỐ: đèn, trụ chặn, cây ============
  const lampPost = (x, z, ry, h = 13) => {
    front.box(x, 0.7, z, 1.6, 1.4, 1.6, '#1E2024'); front.box(x, h / 2, z, 0.6, h, 0.6, '#1E2024'); front.box(x, h * 0.55, z, 1.1, 0.5, 1.1, '#2a2a30'); front.box(x, h + 0.2, z, 2.6, 0.4, 2.6, '#1E2024'); front.box(x, h + 1.5, z, 1.6, 2.4, 1.6, '#1E2024', 0, ry);
    bulbs.box(x, h + 1.5, z, 1.8, 2.2, 1.8, '#ffffff', 0, ry, 0, true); front.box(x, h + 3.0, z, 2.4, 0.4, 2.4, '#1E2024'); front.box(x, h + 3.5, z, 0.6, 0.6, 0.6, '#1E2024');
    pools.push([x, z, 17, 1.0]);
  };
  for (const z of [54, 26, -10, -38, -79, 108, 80]) lampPost(-10.2, z, 0.4);
  for (const z of [50, 14, -14, -42, 98, 74]) lampPost(10.2, z, 0.4);
  for (const x of [36, 64, 92]) lampPost(x, -101.6, 0.4); for (const x of [46, 78]) lampPost(x, -78.4, 0.4); lampPost(-11, -90, 0.4); lampPost(-11, -101.6, 0.4);
  lampPost(102.5, -100.5, 0.4); lampPost(102.5, -81.5, 0.4);
  const bol = (x, z) => { front.box(x, 1.4, z, 0.9, 2.4, 0.9, '#2A2830'); front.box(x, 2.7, z, 1.1, 0.3, 1.1, '#3a3842'); };
  for (let z = 120; z > -80; z -= 8) { bol(-9.5, z + 1.5); bol(9.5, z + 1.5); }
  for (let x = -26; x < 106; x += 8) { bol(x, -100.5); if (x > 18) bol(x, -81.5); }
  const tree = (x, z, h, seed) => {   // cây khối: thân + 4-6 khối tán xanh #4E7A32
    { const o = RB && fit ? fit('nhap/pho-cay', h * 0.92) : null;   // đợt 5: cây Roblox 'Low-Poly Tree.' (3287226226) thay cây khối; ?rb=0 → cây khối
      if (o) { gomRb(o, 'pho-cay'); o.name = 'pho_cay_rb_' + seed; o.position.set(x, SW, z); o.rotation.y = hash(seed, 5) * 6.283; tFront.add(o); return; } }
    const tw = Math.max(1.0, h * 0.07), th = h * 0.45; front.box(x, th / 2 + SW, z, tw, th, tw, '#5A3A22');
    const cs = ['#4E7A32', '#5d9040', '#3f6a2a', '#6aa04a'], R = h * 0.28;
    front.box(x, th + SW + R * 0.9, z, R * 2.0, R * 1.8, R * 2.0, cs[seed % 4]);
    for (let i = 0; i < 5; i++) { const a = hash(i, seed) * 6.283, d = R * 0.9, s = R * (0.9 + hash(i, seed + 1) * 0.5); front.box(x + Math.cos(a) * d, th + SW + R * (0.55 + hash(i, seed + 2) * 1.0), z + Math.sin(a) * d, s, s * 0.9, s, cs[(seed + i + 1) % 4]); }
    front.box(x, th + SW + R * 2.1, z, R * 1.2, R * 0.9, R * 1.2, cs[(seed + 2) % 4]);
  };
  // trụ cứu hoả Roblox (8220444536), 6 trụ dọc hai dãy vỉa hè, cao 2,8; ?rb=0 → không có (bản khối chưa có trụ)
  if (RB && fit) for (const [x, z, ry] of [[-10.0, 69, 0.3], [-10.0, 21, 3.4], [-10.0, -43, 0], [10.0, 93, 1.2], [10.0, 45, 4.4], [10.0, -3, 2.1]]) {
    const o = fit('nhap/pho-tru-cuu-hoa', 2.8); if (!o) break; gomRb(o, 'pho-tru-cuu-hoa'); o.name = 'pho_tru_cuu_hoa_' + z; o.position.set(x, SW, z); o.rotation.y = ry; tFront.add(o); }
  tree(11.8, 118, 26, 1); tree(-11.8, 122, 24, 2); tree(11.8, 78, 15, 3); tree(-11.8, 70, 14, 4);
  tree(-40, 30, 22, 6); tree(42, 60, 22, 7); tree(75, 10, 24, 8); tree(-70, -30, 20, 9); tree(-48, -75, 22, 10); tree(40, -30, 20, 11); tree(-26, -112, 22, 12);
  tree(12.4, -78.8, 12, 13); tree(-12.5, -80.5, 11, 14); tree(30, -100.8 + 3, 10, 15);
  if (sanThiTruong) { tree(-19, -58.8, 13, 16); tree(-19.3, -77.0, 12, 17); }   // cây trong sân trước biệt thự (che hông tiệm may khi máy nhìn dọc mặt tiền — s092)
  // nhà nền hàng 2 (xa phố): khối thấp có mái, rải theo seed
  for (let k = 0; k < 6; k++) { const [wc, rc] = palettes[k % 7]; const z = 100 - k * 26; for (const [x, s] of [[-52, -1], [58, 1]]) { const w = 18 + hash(k + s, 31) * 8, H = 12 + hash(k, 32 + s) * 6, D = 16; const cz = z + (hash(k, 33 + s) - 0.5) * 6; back.box(x, H / 2, cz, D, H, w, wc); const sd = k * 2 + (s > 0 ? 1 : 0); const rr0 = roofBack(x, cz, D, w, H, rc, sd); void rr0; for (const dz of [-w / 4, w / 4]) { (hash(k + dz, 8 + s) < 0.5 ? glassL : glassD).box(x - s * (D / 2 + 0.1), 6, cz + dz, 0.2, 3.4, 3.2, '#ffffff'); } } }
  function roofBack(x, cz, D, w, H, rc, sd) { const ri = 5; back.k = 'shingle'; try { if (hash(sd, 9) < 0.5) { for (const sg of [-1, 1]) back.box(x, H + ri / 2, cz + sg * w / 4, D + 1.6, 0.8, w / 2 / Math.cos(Math.atan2(ri, w / 2)), rc, sg * Math.atan2(ri, w / 2) * 1, 0, 0); back.tri([x - D / 2, H, cz - w / 2], [x - D / 2, H, cz + w / 2], [x - D / 2, H + ri, cz], rc); back.tri([x + D / 2, H, cz - w / 2], [x + D / 2, H, cz + w / 2], [x + D / 2, H + ri, cz], rc); } else back.box(x, H + 0.6, cz, D + 1.4, 1.2, w + 1.4, rc); } finally { back.k = null; } }

  // ============ gắn các mesh vào tầng ============
  tMid.add(mid.mesh(null, 'pho_nha_va_cua')); tFront.add(front.mesh(null, 'pho_do_duong')); tBack.add(back.mesh(null, 'pho_nen_xa'));
  const gl = glassL.mesh(matLit, 'pho_kinh_sang', false), gd = glassD.mesh(matDark, 'pho_kinh_toi', false), bu = bulbs.mesh(matBulb, 'pho_den', false), inn = inner.mesh(matInner, 'pho_trong_nha', false);
  tMid.add(gl, gd, bu, inn);
  // vệt sáng đêm (cộng sáng, 1 InstancedMesh)
  const poolMat = new THREE.MeshBasicMaterial({ map: softTex, color: '#ffb347', transparent: true, opacity: 0.42, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const poolMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), poolMat, pools.length); poolMesh.name = 'pho_vet_sang_dem';
  { const qq = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0)); pools.forEach(([x, z, r, k], i) => { poolMesh.setMatrixAt(i, _m.compose(_p.set(x, SW + 0.06, z), qq, _s.set(r * 2, r * 2, 1))); poolMesh.setColorAt(i, _c.set('#ffffff').multiplyScalar(k)); }); poolMesh.instanceMatrix.needsUpdate = true; poolMesh.instanceColor.needsUpdate = true; poolMesh.frustumCulled = false; poolMesh.visible = false; tFront.add(poolMesh); }
  // Khai báo loại vật liệu cho mesh còn lại (chưa có matKind): tên → loại; không khớp → 'matte'. Chỉ ghi userData, KHÔNG nhân bản vật liệu (litMats / signMats / dispMats sửa lúc chạy). Luôn grungeKind 'none' (tập chọn tông sạch).
  const BANG_KIND = [[/^pho_(bien|ke_|gian_|vet_)/, 'none'], [/^pho_(cua_|canh_cua|o_cua)/, 'woodpaint'], [/^pho_nam_cua/, 'metalpaint']];
  const vetMatte = [];
  g.traverse((o) => { if (!o.isMesh) return; o.userData.grungeKind = 'none'; if (o.userData.matKind) return; const hit = BANG_KIND.find(([re]) => re.test(o.name)); const kind = hit ? hit[1] : 'matte'; if (!hit) vetMatte.push(o.name); o.userData.matKind = kind; if (kind !== 'none') o.userData.matNguon = 'khai-bao'; });
  if (vetMatte.length) console.log('[pho-vet-matte]', vetMatte.join(','));

  // ============ ngày / đêm / cửa ============
  let nightNow = null;
  const setNight = (n) => {
    const night = n > 0.5; if (nightNow === night) return; nightNow = night;
    matLit.color.set(night ? '#ffb347' : '#b5d6ea'); matDark.color.set(night ? '#1b2a4a' : '#7fa3bf'); matBulb.color.set(night ? '#ffc060' : '#ffe9b8'); matInner.color.set(night ? '#e8aa5a' : '#6b5640');
    for (const m of litMats) { m.color.setScalar(night ? 4.2 : 1); m.emissive.set(night ? '#24325c' : '#1e160e'); m.emissiveIntensity = 1; }
    for (const m of rbMats) { const u = m.userData;
      m.color.copy(u.rb0).multiplyScalar(night && !u.rbK ? Math.min(4.2, 3.2 / Math.max(u.rb0.r, u.rb0.g, u.rb0.b, 0.01)) : 1);   /* màu sáng/rực (trắng, mái xanh lơ) nâng ít hơn để không loá */ if (night) m.emissive.set(u.rbK ? '#ffb347' : '#24325c'); else m.emissive.copy(u.rbE); m.emissiveIntensity = night && u.rbK ? 0.9 / Math.max(0.3, m.opacity) : 1; }
    poolMesh.visible = night; for (const m of signMats) m.emissiveIntensity = night ? 0.42 : 0.05; for (const m of dispMats) m.color.set(night ? '#ffffff' : '#c9c2b4');
  };
  setNight(0);
  let doorK = 0;
  const setDoor = (k) => { doorK = Math.min(1, Math.max(0, k)); if (doorPivot) doorPivot.rotation.y = doorK * 1.75; };
  e.setNight = setNight; e.setDoor = setDoor;
  return { suSong: [], setNight, setDoor, update(t, ctx) {
    if (daoGau && gauKeOn()) { const d = daoGau; daoGau = null; d(); }
    const L = LIGHTS[(ctx && ctx.light) || e.light]; setNight(L && L.night ? 1 : 0);
    setDoor(ctx && ctx.cuaThiTruong != null ? ctx.cuaThiTruong : doorK);
  } };
}
