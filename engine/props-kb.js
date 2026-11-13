// props-kb.js — ĐẠO CỤ THEO KỊCH BẢN (sổ đạo cụ dùng chung mọi tập dựng từ kich-ban.md) + quy tắc ĐẶT đạo cụ vào cảnh.
//
// Đường dữ liệu: kich-ban.md (`obj:<tên>` ở cột ghi chú, cột `vật cần đọc`, vật được cầm/ôm) → tools/storyboard.py ghi
//   EPISODE.props = { <tên>: { kit, at: <địa điểm|env>, on?, hold?, pos?, ry? } } → index.html (episodes/_template):
//     const dat   = datDaoCu(EPISODE.props, places, { townEnv, envs })      vị trí/hướng/cha của từng đạo cụ (hàm thuần)
//     const props = buildPropsKB(THREE, EPISODE.props, { K, dat })         Object3D tên = tên đạo cụ → createDirector({ props })
//     SHOTS2 = ganDaoCu(SHOTS, { props, dat, actors, townEnv, envs })       shot.props (hiện ở đâu), camera insert/insertRead nhắm vật
//     shots  = noiNhom(expandShots(SHOTS2, …))                              nhóm diễn viên (bears) chạy cùng, stance, camera trong phòng
//
// Mỗi khoá của bảng sổ đạo cụ = một hàm (THREE) => Object3D: gốc ở ĐÁY GIỮA, mặt trước +Z, 1 đơn vị = 1 stud (người R15 cao ~5.2).
// Kích thước khai trong PROP_INFO[tên].size = [rộng, cao, sâu] — test tools/tests/props-kb.test.mjs đo lại bbox (lệch > 30% là đỏ).
// LÀM ĐẸP một đạo cụ: sửa hàm của nó, GIỮ tên khoá + kích thước (+ surfaces nếu có). tools/kb/asset-plan.mjs đọc khoá của bảng.
// Chữ trên vật: canvas (Be Vietnam Pro / Patrick Hand — index.html nạp phông trước khi dựng); không có document (Node) → bỏ chữ.

import { glbPreload, glbWrap, glbOn, GLB_INFO } from './props-glb.js';
// GLB low-poly thay khối code (engine/props-glb.js): tải xong trước __ready (top-level await, chỉ trình duyệt; ?propsGlb=0 → không tải).
await glbPreload();

const PI = Math.PI;
export const ASPECT = 9 / 16;
export const STAND_H = 2.6;      // bàn bày (đồ nhỏ ở thị trấn) cao ngang quầy
export const EASEL_H = 2.2;      // giá đỡ cho đồ treo tường khi đứng ngoài trời

// ---- bộ dựng nhỏ ----
function bo(THREE, ten) {
  const g = new THREE.Group(); g.name = ten + '_goc';
  const mats = new Map();
  const M = (c, o = {}) => { const k = c + JSON.stringify(o); if (!mats.has(k)) mats.set(k, new THREE.MeshStandardMaterial({ color: c, roughness: 0.75, ...o })); return mats.get(k); };
  const add = (geo, c, x, y, z, nm, p, o) => {
    const m = new THREE.Mesh(geo, typeof c === 'string' ? M(c, o) : c);
    m.position.set(x, y, z); m.name = ten + '_' + nm; m.castShadow = true; m.receiveShadow = true; (p || g).add(m); return m;
  };
  return {
    g, M,
    box: (w, h, d, c, x, y, z, nm = 'hop', p, o) => add(new THREE.BoxGeometry(w, h, d), c, x, y, z, nm, p, o),
    cyl: (rt, rb, h, c, x, y, z, nm = 'tru', p, o) => add(new THREE.CylinderGeometry(rt, rb, h, 20), c, x, y, z, nm, p, o),
    sph: (r, c, x, y, z, nm = 'cau', p, o) => add(new THREE.SphereGeometry(r, 18, 12), c, x, y, z, nm, p, o),
    tor: (r, t, c, x, y, z, nm = 'vong', p, o) => add(new THREE.TorusGeometry(r, t, 10, 28), c, x, y, z, nm, p, o),
    pla: (w, h, c, x, y, z, nm = 'mat', p) => add(new THREE.PlaneGeometry(w, h), c, x, y, z, nm, p),
    sub: (nm, x = 0, y = 0, z = 0, p) => { const s = new THREE.Group(); s.name = ten + '_' + nm; s.position.set(x, y, z); (p || g).add(s); return s; },
  };
}
// vật CẦN ĐỌC cho luật L2 (engine/measure.js): nhóm con mang userData.vai='doc'; vật liệu khai báo 'none' (giữ nguyên, không vân/grunge đè chữ)
const lamDoc = (g) => { g.userData.vai = 'doc'; g.traverse((m) => { if (m.isMesh) { m.userData.matKind = 'none'; m.userData.matNguon = 'khai-bao'; } }); return g; };
const hash = (i, s) => { let x = Math.imul(i ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(s + 1, 0xc2b2ae35); x ^= x >>> 13; x = Math.imul(x, 0x27d4eb2f); x ^= x >>> 16; return (x >>> 0) / 4294967296; };
const CHU = "'Be Vietnam Pro', sans-serif", TAY = "'Patrick Hand', 'Be Vietnam Pro', sans-serif";
// vật liệu có chữ vẽ bằng canvas; không có document → null (người gọi dùng màu nền)
function matChu(THREE, w, h, ve, px = 512) {
  if (typeof document === 'undefined') return null;
  const cv = document.createElement('canvas'); cv.width = px; cv.height = Math.max(16, Math.round((px * h) / w));
  ve(cv.getContext('2d'), cv.width, cv.height);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return new THREE.MeshStandardMaterial({ map: t, roughness: 0.85 });
}
const chuGiua = (g, txt, x, y, size, font, color, maxW) => {
  g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle'; let s = size;
  do { g.font = `900 ${s}px ${font}`; s -= 2; } while (maxW && g.measureText(txt).width > maxW && s > 8);
  g.fillText(txt, x, y);
};
// đầu gấu in phẳng (in lên thùng): 3 hình tròn + mõm, mặt phẳng hướng +Z tại (x, y, z)
function dauGau(K, p, x, y, z, r, mau = '#5d4037', mom = '#d7b899') {
  const tron = (rr, c, dx, dy, dz, nm) => { const m = K.cyl(rr, rr, 0.02, c, x + dx, y + dy, z + dz, nm, p); m.rotation.x = PI / 2; return m; };
  tron(r, mau, 0, 0, 0, 'gau_dau'); tron(r * 0.42, mau, -r * 0.8, r * 0.85, -0.005, 'gau_tai'); tron(r * 0.42, mau, r * 0.8, r * 0.85, -0.005, 'gau_tai2');
  tron(r * 0.45, mom, 0, -r * 0.3, 0.012, 'gau_mom');
}
// gấu bông nhỏ ngồi (kệ gấu mới may) — thân + đầu + tai + mõm + nơ
function gauNho(K, p, x, y, z, no) {
  K.sph(0.38, '#c68642', x, y + 0.38, z, 'gau_than', p); K.sph(0.3, '#c68642', x, y + 0.95, z, 'gau_dau', p);
  K.sph(0.11, '#a0522d', x - 0.22, y + 1.18, z, 'gau_tai', p); K.sph(0.11, '#a0522d', x + 0.22, y + 1.18, z, 'gau_tai2', p);
  K.sph(0.12, '#e8c39e', x, y + 0.88, z + 0.24, 'gau_mom', p); K.box(0.32, 0.12, 0.1, no, x, y + 0.68, z + 0.3, 'gau_no', p);
}
const ke = (K, w, h, d, go, lung, tang) => {   // kệ: 2 vách + lưng + các tầng (y đáy từng tầng)
  K.box(0.2, h, d, go, -w / 2 + 0.1, h / 2, 0, 'vach'); K.box(0.2, h, d, go, w / 2 - 0.1, h / 2, 0, 'vach2');
  K.box(w, h, 0.1, lung, 0, h / 2, -d / 2 + 0.05, 'lung');
  for (const [i, y] of tang.entries()) K.box(w - 0.4, 0.15, d - 0.1, go, 0, y + 0.075, 0.05, 'tang' + i);
};

// ảnh trong gương (canvas w×h ≈ 0.42): tường xanh nhạt, sàn gỗ, kệ trắng viền xanh 2 tầng có sách, đồng hồ đỏ 2 chuông trên tầng giữa, mép giường tím, vệt sáng chéo
function ve_guong(g, w, h) {
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#c9dcf3'); gr.addColorStop(1, '#e6eef8'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.fillStyle = '#a98a70'; g.fillRect(0, h * 0.86, w, h * 0.14); g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(0, h * 0.86, w, h * 0.012);
  const kx = w * 0.12, kw = w * 0.76, kt = h * 0.2, kb = h * 0.86;
  g.fillStyle = '#5c8ddb'; g.fillRect(kx - w * 0.03, kt, w * 0.03, kb - kt); g.fillRect(kx + kw, kt, w * 0.03, kb - kt);
  g.fillStyle = '#eceff1'; g.fillRect(kx, kt, kw, kb - kt); g.fillStyle = '#cfd8dc'; g.fillRect(kx + w * 0.02, kt + h * 0.02, kw - w * 0.04, kb - kt - h * 0.02);
  const tang = [0.86, 0.69, 0.52, 0.35].map((f) => h * f);
  g.fillStyle = '#eceff1'; for (const y of tang) g.fillRect(kx, y - h * 0.012, kw, h * 0.02);
  const sach = ['#e57373', '#64b5f6', '#81c784', '#ffd54f']; for (let i = 0; i < 7; i++) { g.fillStyle = sach[i % 4]; g.fillRect(kx + w * (0.04 + i * 0.05), tang[0] - h * (0.08 + (i % 3) * 0.01), w * 0.04, h * (0.08 + (i % 3) * 0.01)); }
  const cx = w * 0.5, cy = tang[1] - h * 0.07, r = w * 0.1;   // đồng hồ báo thức đỏ (tầng 2)
  g.fillStyle = '#ffd54f'; for (const dx of [-0.7, 0.7]) { g.beginPath(); g.arc(cx + dx * r, cy - r * 1.05, r * 0.38, 0, 7); g.fill(); }
  g.fillStyle = '#e53935'; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill(); g.fillStyle = '#fffde7'; g.beginPath(); g.arc(cx, cy, r * 0.78, 0, 7); g.fill();
  g.strokeStyle = '#212121'; g.lineWidth = r * 0.12; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx, cy - r * 0.55); g.moveTo(cx, cy); g.lineTo(cx + r * 0.38, cy + r * 0.12); g.stroke();
  g.fillStyle = '#7e57c2'; g.fillRect(0, h * 0.74, w * 0.1, h * 0.12);   // mép giường lọt vào mép gương
  g.fillStyle = 'rgba(255,255,255,0.14)'; g.beginPath(); g.moveTo(w * 0.55, 0); g.lineTo(w * 0.82, 0); g.lineTo(w * 0.2, h); g.lineTo(0, h); g.lineTo(0, h * 0.86); g.closePath(); g.fill();
}
// bậc thềm: bậc dưới thấp, bậc trên cao sát cửa (x −3.5..1.5), thảm chùi chân nâu
function bacThem(K) {
  K.box(5, 0.5, 3, '#b3aca1', -1, 0.25, 0.5, 'bac1'); K.box(5, 1.0, 2, '#9b948a', -1, 0.5, -0.5, 'bac2');
  K.box(5.04, 0.04, 0.04, '#d6d0c6', -1, 0.5, 2.0, 'mep1'); K.box(5.04, 0.04, 0.04, '#d6d0c6', -1, 1.0, 0.5, 'mep2');
  K.box(2.2, 0.04, 1.2, '#6d4c41', -1, 0.52, 0.9, 'tham_chui_chan');
}
// đôi dép lê xanh đặt trên nền tại (x, z)
function dep(K, x, z) {
  for (const [i, dx] of [-0.35, 0.35].entries()) {
    K.box(0.55, 0.12, 1.15, '#90caf9', x + dx, 0.06, z, 'dep_de' + i); K.box(0.55, 0.2, 0.35, '#1e88e5', x + dx, 0.2, z + 0.15, 'dep_quai' + i);
    K.sph(0.08, '#ffffff', x + dx, 0.3, z + 0.22, 'dep_bong' + i);
  }
}
export const PROPS_KB = {
  ke_trong: (THREE) => {   // kệ trống, vết bụi có chỗ sạch hình món đồ vừa mất
    const K = bo(THREE, 'ke_trong'); ke(K, 4, 5, 1.4, '#9c6b3e', '#7a5230', [0, 1.6, 3.25, 4.85]);
    K.box(3.4, 0.02, 1.1, '#c9b79c', 0, 1.76, 0.1, 'bui'); K.box(0.9, 0.025, 0.6, '#8a5a33', 0.6, 1.765, 0.15, 'cho_sach');
    return K.g;
  },
  o_khoa: (THREE) => {     // cửa gỗ + ổ khoá còn nguyên
    const K = bo(THREE, 'o_khoa');
    K.box(0.3, 6.8, 0.4, '#5d4037', -1.45, 3.4, 0, 'khung'); K.box(0.3, 6.8, 0.4, '#5d4037', 1.45, 3.4, 0, 'khung2'); K.box(3.2, 0.3, 0.4, '#5d4037', 0, 6.65, 0, 'mi');
    K.box(2.6, 6.5, 0.2, '#a1887f', 0, 3.25, 0, 'canh');
    K.box(2.0, 2.4, 0.05, '#8d6e63', 0, 4.7, 0.11, 'o_tren'); K.box(2.0, 2.0, 0.05, '#8d6e63', 0, 1.6, 0.11, 'o_duoi');
    K.box(0.36, 0.75, 0.06, '#cfd8dc', 0.9, 3.65, 0.13, 'mat_khoa', null, { metalness: 0.7, roughness: 0.3 });
    K.box(0.07, 0.2, 0.02, '#212121', 0.9, 3.75, 0.17, 'lo_khoa'); K.sph(0.14, '#ffca28', 0.9, 3.2, 0.2, 'nam', null, { metalness: 0.8, roughness: 0.25 });
    return K.g;
  },
  hoc_quay: (THREE) => {   // quầy tiệm bánh, hốc trống dưới quầy, bảng hình bánh mì
    const K = bo(THREE, 'hoc_quay');
    K.box(5, 2.4, 2, '#d7a86e', 0, 1.2, 0, 'than'); K.box(5, 0.2, 2, '#8d5a2b', 0, 2.5, 0, 'mat');
    K.box(2.0, 1.4, 0.06, '#5d4037', 0, 1.1, 0.99, 'vien_hoc'); K.box(1.8, 1.2, 0.06, '#1b1310', 0, 1.1, 1.0, 'hoc');
    const bang = matChu(THREE, 2.2, 0.9, (g, w, h) => { g.fillStyle = '#fff3e0'; g.fillRect(0, 0, w, h); g.fillStyle = '#e0a050'; g.beginPath(); g.ellipse(w * 0.22, h * 0.5, w * 0.13, h * 0.26, 0, 0, 2 * PI); g.fill(); chuGiua(g, 'BÁNH MÌ', w * 0.64, h * 0.52, h * 0.42, CHU, '#6d3b12', w * 0.6); });
    K.box(2.2, 0.9, 0.12, bang || '#fff3e0', 0, 3.05, -0.8, 'bang');
    if (!bang) { const b = K.sph(0.3, '#e0a050', 0, 3.05, -0.72, 'banh'); b.scale.set(1.8, 0.8, 0.3); }
    return K.g;
  },
  hop_nhan: (THREE) => {   // hộp nhẫn mở trống + cuộn chỉ
    const K = bo(THREE, 'hop_nhan');
    K.box(0.55, 0.25, 0.5, '#b71c1c', -0.15, 0.125, 0.05, 'hop'); K.box(0.42, 0.03, 0.36, '#f5f5f5', -0.15, 0.26, 0.05, 'nem'); K.box(0.26, 0.02, 0.05, '#212121', -0.15, 0.28, 0.05, 'khe');
    const nap = K.box(0.55, 0.3, 0.06, '#b71c1c', -0.15, 0.4, -0.22, 'nap'); nap.rotation.x = -0.3;
    K.cyl(0.11, 0.11, 0.3, '#1e88e5', 0.3, 0.17, 0.05, 'chi'); K.cyl(0.15, 0.15, 0.04, '#d7ccc8', 0.3, 0.02, 0.05, 'chi_day'); K.cyl(0.15, 0.15, 0.04, '#d7ccc8', 0.3, 0.32, 0.05, 'chi_nap');
    return K.g;
  },
  thung_dau_gau: (THREE) => {   // thùng in dấu đầu gấu (manh mối)
    const K = bo(THREE, 'thung_dau_gau');
    K.box(2.4, 2, 2.4, '#c8a165', 0, 1, 0, 'thung'); K.box(2.42, 0.12, 0.5, '#e8d09a', 0, 2.0, 0, 'bang_keo');
    dauGau(K, null, 0, 1.0, 1.21, 0.7);
    const hong = K.sub('in_hong', 1.2, 0, 0); hong.rotation.y = PI / 2; dauGau(K, hong, 0, 1.0, 0.011, 0.7);   // dấu đầu gấu to cả mặt trước lẫn mặt hông
    K.box(0.06, 2.02, 2.42, '#a9814a', 0, 1.0, 0, 'mep_keo');
    return K.g;
  },
  ke_phong_ga: (THREE) => {   // kệ phòng Gà (cạnh cửa sổ) — 2 tầng giữa là chỗ bày đồ
    const K = bo(THREE, 'ke_phong_ga'); ke(K, 4, 6, 1.4, '#eceff1', '#cfd8dc', [0, 1.95, 3.9, 5.85]);
    K.box(0.12, 6, 0.12, '#5c8ddb', -1.94, 3, 0.66, 'vien'); K.box(0.12, 6, 0.12, '#5c8ddb', 1.94, 3, 0.66, 'vien2');
    K.box(0.3, 1.1, 0.9, '#e57373', -1.6, 0.7, 0.05, 'sach_a'); K.box(0.3, 1.0, 0.9, '#64b5f6', -1.28, 0.65, 0.05, 'sach_b');
    return K.g;
  },
  anh_ba: (THREE) => {     // ảnh bà đeo dây chuyền (khung đứng)
    const K = bo(THREE, 'anh_ba');
    const f = K.sub('khung', 0, 0.75, 0); f.rotation.x = -0.12;
    K.box(1.2, 1.5, 0.1, '#b8860b', 0, 0, 0, 'vien', f); K.box(0.95, 1.2, 0.02, '#f3e5ab', 0, 0, 0.06, 'nen', f);
    const tron = (r, c, x, y, z, nm) => { const m = K.cyl(r, r, 0.02, c, x, y, z, nm, f); m.rotation.x = PI / 2; };
    tron(0.3, '#bdbdbd', 0, 0.2, 0.07, 'toc'); tron(0.22, '#f0c89a', 0, 0.12, 0.08, 'mat');
    K.box(0.7, 0.36, 0.02, '#7e57c2', 0, -0.38, 0.075, 'ao', f); K.tor(0.13, 0.022, '#ffd54f', 0, -0.2, 0.09, 'day_chuyen', f, { metalness: 0.8, roughness: 0.3 });
    const chan = K.box(0.08, 1.3, 0.08, '#8d6e63', 0, 0.64, -0.2, 'chan'); chan.rotation.x = 0.3;
    return K.g;
  },
  dong_ho: (THREE) => {    // đồng hồ báo thức đỏ 2 chuông
    const K = bo(THREE, 'dong_ho');
    const than = K.cyl(0.38, 0.38, 0.35, '#e53935', 0, 0.5, 0, 'than'); than.rotation.x = PI / 2;
    const mat = K.cyl(0.31, 0.31, 0.02, '#fffde7', 0, 0.5, 0.18, 'mat'); mat.rotation.x = PI / 2;
    K.box(0.04, 0.22, 0.02, '#212121', 0, 0.58, 0.2, 'kim'); const k2 = K.box(0.04, 0.16, 0.02, '#212121', 0.05, 0.49, 0.2, 'kim2'); k2.rotation.z = 1.2;
    K.sph(0.15, '#ffd54f', -0.25, 0.88, 0, 'chuong', null, { metalness: 0.6, roughness: 0.3 }); K.sph(0.15, '#ffd54f', 0.25, 0.88, 0, 'chuong2', null, { metalness: 0.6, roughness: 0.3 });
    K.cyl(0.05, 0.05, 0.14, '#424242', -0.2, 0.07, 0, 'chan'); K.cyl(0.05, 0.05, 0.14, '#424242', 0.2, 0.07, 0, 'chan2');
    const vien = K.tor(0.345, 0.035, '#bdbdbd', 0, 0.5, 0.17, 'vien', null, { metalness: 0.7, roughness: 0.3 });   // viền bạc quanh mặt
    for (const [dx, dy] of [[0, 0.26], [0.26, 0], [0, -0.26], [-0.26, 0]]) K.box(dx ? 0.05 : 0.03, dx ? 0.03 : 0.05, 0.01, '#212121', dx, 0.5 + dy, 0.195, 'vach');   // vạch 12-3-6-9
    K.box(0.04, 0.1, 0.04, '#424242', 0, 0.94, 0, 'bua'); const b = K.box(0.34, 0.03, 0.03, '#424242', 0, 0.9, 0, 'bua_ngang');
    return K.g;
  },
  guong: (THREE) => {      // gương đứng đối diện giường
    const K = bo(THREE, 'guong');
    K.box(3, 0.3, 0.4, '#6d4c41', 0, 0.15, 0, 'de'); K.box(0.25, 6.7, 0.25, '#8d6e63', -1.375, 3.65, 0, 'tru'); K.box(0.25, 6.7, 0.25, '#8d6e63', 1.375, 3.65, 0, 'tru2');
    K.box(3, 0.25, 0.25, '#8d6e63', 0, 6.875, 0, 'dinh'); K.box(2.5, 0.2, 0.2, '#8d6e63', 0, 1.0, 0, 'day');
    K.box(2.4, 5.6, 0.06, '#bcd6f2', 0, 3.9, 0.02, 'kinh', null, { metalness: 0.1, roughness: 0.3 });
    // ảnh phản chiếu GIẢ (tĩnh, tất định): kệ phòng Gà + đồng hồ báo thức đỏ + mép giường, vẽ canvas lật gương, sáng đều (MeshBasic) → mặt gương không đen
    const anh = matChu(THREE, 2.3, 5.5, ve_guong, 384);
    const ph = K.pla(2.3, 5.5, anh ? new THREE.MeshBasicMaterial({ map: anh.map, color: '#8d98a8', toneMapped: false }) : new THREE.MeshBasicMaterial({ color: '#d4e4f6' }), 0, 3.9, 0.056, 'phan_chieu');
    ph.userData.matKind = 'none'; ph.userData.matNguon = 'khai-bao';
    return K.g;
  },
  cuon_sach: (THREE) => {  // cuốn sách dựng đứng
    const K = bo(THREE, 'cuon_sach');
    K.box(0.35, 1.3, 1.0, '#2e7d32', 0, 0.65, 0, 'bia'); K.box(0.29, 1.2, 0.04, '#fff8e1', 0, 0.65, 0.5, 'giay');
    K.box(0.36, 0.08, 1.01, '#ffd54f', 0, 1.0, 0, 'gay'); K.box(0.36, 0.08, 1.01, '#ffd54f', 0, 0.3, 0, 'gay2');
    return K.g;
  },
  nhan_moi: (THREE) => {   // chiếc nhẫn trên gối nhung
    const K = bo(THREE, 'nhan_moi');
    K.box(0.6, 0.18, 0.6, '#7b1fa2', 0, 0.09, 0, 'goi'); K.tor(0.14, 0.035, '#ffca28', 0, 0.355, 0, 'nhan', null, { metalness: 0.85, roughness: 0.2 });
    K.sph(0.07, '#e1f5fe', 0, 0.53, 0, 'da', null, { metalness: 0.2, roughness: 0.05 });
    return K.g;
  },
  bang_chuyen: (THREE) => {   // băng chuyền ngắn trong nhà máy
    const K = bo(THREE, 'bang_chuyen');
    for (const [i, [x, z]] of [[-4.5, -0.9], [-4.5, 0.9], [4.5, -0.9], [4.5, 0.9]].entries()) K.box(0.3, 2.3, 0.3, '#455a64', x, 1.15, z, 'chan' + i);
    K.box(10, 0.35, 0.2, '#fbc02d', 0, 2.45, 1.1, 'ray'); K.box(10, 0.35, 0.2, '#fbc02d', 0, 2.45, -1.1, 'ray2');
    K.box(9.6, 0.1, 2.0, '#263238', 0, 2.55, 0, 'bang');
    for (const x of [-4.8, 4.8]) { const r = K.cyl(0.3, 0.3, 2.0, '#90a4ae', x, 2.45, 0, 'truc'); r.rotation.x = PI / 2; }
    K.box(0.6, 0.5, 0.4, '#e53935', 4.4, 2.75, 1.1, 'hop_dieu_khien');
    return K.g;
  },
  ke_gau: (THREE) => {     // kệ gấu mới may: 3 tầng × 4 gấu, nơ xanh/đỏ/vàng
    const K = bo(THREE, 'ke_gau'); ke(K, 8, 6, 1.6, '#a1887f', '#8d6e63', [0, 1.95, 3.9, 5.85]);
    const NO = ['#2e86de', '#e74c3c', '#f1c40f'];
    [0.15, 2.1, 4.05].forEach((y, t) => [-2.7, -0.9, 0.9, 2.7].forEach((x, i) => gauNho(K, null, x, y, 0.05, NO[(i + t) % 3])));
    return K.g;
  },
  ban_do: (THREE) => {     // bản đồ thị trấn treo tường, nhà có gấu đánh dấu đỏ (gốc = đáy sau, áp tường)
    const K = bo(THREE, 'ban_do'); const D = K.sub('doc');
    K.box(5, 3.5, 0.1, '#5d4037', 0, 1.75, 0.05, 'khung', D);
    const giay = matChu(THREE, 4.7, 3.2, (g, w, h) => {
      g.fillStyle = '#f5e6c8'; g.fillRect(0, 0, w, h); chuGiua(g, 'BẢN ĐỒ THỊ TRẤN', w / 2, h * 0.1, h * 0.13, CHU, '#3e2723', w * 0.94);
      g.fillStyle = '#bcaaa4'; g.fillRect(0, h * 0.5, w, h * 0.05); g.fillRect(w * 0.45, h * 0.18, w * 0.05, h * 0.82);
      for (let i = 0; i < 12; i++) { g.fillStyle = '#8d6e63'; g.fillRect(w * (0.06 + (i % 6) * 0.15), h * (i < 6 ? 0.28 : 0.66), w * 0.07, h * 0.1); }
    });
    K.pla(4.7, 3.2, giay || '#f5e6c8', 0, 1.75, 0.11, 'giay', D);
    if (!giay) { K.box(4.6, 0.12, 0.01, '#bcaaa4', 0, 1.75, 0.115, 'duong', D); K.box(0.12, 3.0, 0.01, '#bcaaa4', 0.1, 1.75, 0.115, 'duong2', D); }
    for (const [i, [x, y]] of [[-1.7, 2.4], [-0.6, 2.4], [1.2, 2.4], [-1.2, 1.0], [1.8, 1.0]].entries()) {
      for (const r of [0.7, -0.7]) { const b = K.box(0.42, 0.08, 0.02, '#d32f2f', x, y, 0.13, 'dau_x' + i, D); b.rotation.z = r; }
    }
    lamDoc(D);
    return K.g;
  },
  ket_tien: (THREE) => {   // két tiền của chú bán bánh
    const K = bo(THREE, 'ket_tien');
    K.box(2.2, 2.2, 2, '#33691e', 0, 1.1, 0, 'than', null, { metalness: 0.4, roughness: 0.5 }); K.box(1.8, 1.8, 0.05, '#558b2f', 0, 1.1, 1.02, 'cua');
    const num = K.cyl(0.3, 0.3, 0.08, '#cfd8dc', 0.3, 1.3, 1.07, 'num', null, { metalness: 0.8, roughness: 0.3 }); num.rotation.x = PI / 2;
    K.box(0.6, 0.1, 0.1, '#bdbdbd', -0.3, 0.8, 1.08, 'tay_nam'); K.box(0.5, 0.25, 0.02, '#fff3e0', -0.4, 1.7, 1.05, 'nhan_dan');
    const vong = K.tor(0.42, 0.04, '#eceff1', 0.3, 1.3, 1.07, 'vong_so', null, { metalness: 0.8, roughness: 0.3 });   // vòng vạch số quanh núm xoay
    for (let i = 0; i < 8; i++) { const a = i * PI / 4; K.box(0.05, 0.1, 0.02, '#212121', 0.3 + Math.cos(a) * 0.55, 1.3 + Math.sin(a) * 0.55, 1.07, 'vach' + i); }
    K.box(0.06, 0.4, 0.06, '#ffffff', 0.3, 1.5, 1.12, 'kim_chi');
    return K.g;
  },
  day_chuyen: (THREE) => {  // sợi dây chuyền của bà (nằm phẳng): dây vàng + mặt dây tròn có đá đỏ + tia lấp lánh
    const K = bo(THREE, 'day_chuyen'); const VANG = { metalness: 0.85, roughness: 0.2, emissive: '#b8860b', emissiveIntensity: 0.45 };
    const d = K.tor(0.3, 0.032, '#ffd54f', 0, 0.032, 0, 'day', null, VANG); d.rotation.x = -PI / 2; d.scale.set(1.2, 0.8, 1);
    K.cyl(0.055, 0.055, 0.035, '#ffd54f', 0, 0.035, 0.24, 'moc', null, VANG);
    K.cyl(0.1, 0.1, 0.04, '#ffd54f', 0, 0.04, 0.3, 'mat_day', null, VANG); K.sph(0.06, '#e53935', 0, 0.075, 0.3, 'mat_da', null, { roughness: 0.1, emissive: '#b71c1c', emissiveIntensity: 0.5 });
    for (const [i, r] of [0, PI / 4, PI / 2, -PI / 4].entries()) { const t = K.box(0.26, 0.005, 0.012, '#ffffff', 0, 0.11, 0.3, 'lap_lanh' + i, null, { emissive: '#ffffff', emissiveIntensity: 1 }); t.rotation.y = r; }
    return K.g;
  },
  chuong: (THREE) => {     // chuông tay
    const K = bo(THREE, 'chuong');
    K.cyl(0.1, 0.3, 0.5, '#ffb300', 0, 0.27, 0, 'than', null, { metalness: 0.75, roughness: 0.3 });
    const vanh = K.tor(0.29, 0.03, '#ffb300', 0, 0.03, 0, 'vanh', null, { metalness: 0.75, roughness: 0.3 }); vanh.rotation.x = PI / 2;
    K.cyl(0.05, 0.05, 0.35, '#6d4c41', 0, 0.68, 0, 'can'); K.sph(0.07, '#6d4c41', 0, 0.86, 0, 'nut');
    return K.g;
  },
  chan_tran: (THREE) => {  // hai bàn chân trần (da) lộ ra dưới gấu quần ngủ xanh nhạt; nhìn từ trên xuống đọc được ngay: 2 bàn chân có ngón + 2 ống quần
    const K = bo(THREE, 'chan_tran'); const DA = '#f0c89a', NGON = '#e8b98a', QUAN = '#9fc5e8';
    for (const [i, x] of [-0.45, 0.45].entries()) {
      const s2 = x < 0 ? 1 : -1;   // ngón cái nằm phía trong
      const ban = K.sph(1, DA, x, 0.13, 0, 'ban_chan' + i); ban.scale.set(0.27, 0.13, 0.5);
      for (let k = 0; k < 5; k++) K.sph(0.078 - k * 0.009, NGON, x + s2 * (0.17 - k * 0.085), 0.075, 0.47 - Math.abs(k - 1) * 0.02 + (k === 0 ? 0.04 : 0), 'ngon' + i + k);
      K.cyl(0.18, 0.2, 0.7, DA, x, 0.35, -0.35, 'co_chan' + i);
      K.cyl(0.29, 0.34, 0.42, QUAN, x, 0.31, -0.35, 'ong_quan' + i);
      const mep = K.tor(0.31, 0.04, '#7fa8d4', x, 0.52, -0.35, 'gau_quan' + i); mep.rotation.x = PI / 2;
    }
    return K.g;
  },
  ket_ga: (THREE) => {     // két góc phòng Gà
    const K = bo(THREE, 'ket_ga');
    K.box(2, 2, 1.8, '#546e7a', 0, 1, 0, 'than', null, { metalness: 0.4, roughness: 0.5 }); K.box(1.6, 1.6, 0.05, '#78909c', 0, 1, 0.92, 'cua');
    const num = K.cyl(0.25, 0.25, 0.08, '#eceff1', 0.25, 1.15, 0.97, 'num', null, { metalness: 0.8, roughness: 0.3 }); num.rotation.x = PI / 2;
    K.box(0.5, 0.1, 0.1, '#cfd8dc', -0.3, 0.75, 0.98, 'tay_nam'); K.sph(0.12, '#ffd54f', -0.5, 1.5, 0.95, 'sao');
    K.tor(0.36, 0.035, '#eceff1', 0.25, 1.15, 0.97, 'vong_so', null, { metalness: 0.8, roughness: 0.3 });
    for (let i = 0; i < 8; i++) { const a = i * PI / 4; K.box(0.04, 0.09, 0.02, '#212121', 0.25 + Math.cos(a) * 0.47, 1.15 + Math.sin(a) * 0.47, 0.97, 'vach' + i); }
    K.box(0.05, 0.3, 0.05, '#ffffff', 0.25, 1.32, 1.01, 'kim_chi');
    return K.g;
  },
  bang_tin: (THREE) => {   // bảng tin thị trấn dán kín giấy báo mất
    const K = bo(THREE, 'bang_tin'); const D = K.sub('doc');
    K.box(0.3, 6, 0.45, '#6d4c41', -2.35, 3, 0, 'cot'); K.box(0.3, 6, 0.45, '#6d4c41', 2.35, 3, 0, 'cot2');
    K.box(4.4, 3.2, 0.15, '#c19a6b', 0, 4.1, 0, 'bang', D);
    const dau = matChu(THREE, 4.4, 0.5, (g, w, h) => { g.fillStyle = '#1565c0'; g.fillRect(0, 0, w, h); chuGiua(g, 'BẢNG TIN', w / 2, h / 2, h * 0.8, CHU, '#ffffff', w * 0.92); });
    K.box(4.4, 0.5, 0.16, dau || '#1565c0', 0, 5.75, 0, 'dau', D);
    const giay = [0, 1].map((k) => matChu(THREE, 0.8, 0.9, (g, w, h) => { g.fillStyle = k ? '#fff59d' : '#fffde7'; g.fillRect(0, 0, w, h); chuGiua(g, 'MẤT ĐỒ!', w / 2, h * 0.28, h * 0.27, TAY, '#b71c1c', w * 0.94); g.fillStyle = '#9e9e9e'; for (let i = 0; i < 4; i++) g.fillRect(w * 0.12, h * (0.5 + i * 0.11), w * (0.76 - (i % 2) * 0.2), h * 0.03); }, 128));
    for (let i = 0; i < 12; i++) {
      const x = -1.75 + (i % 5) * 0.875 + (hash(i, 1) - 0.5) * 0.2, y = 3.0 + Math.floor(i / 5) * 1.0 + (hash(i, 2) - 0.5) * 0.2;
      const p = K.pla(0.8, 0.9, giay[i % 2] || (i % 2 ? '#fff59d' : '#fffde7'), x, y, 0.085 + i * 0.001, 'giay' + i, D); p.rotation.z = (hash(i, 3) - 0.5) * 0.3;
      if (!giay[0]) K.box(0.5, 0.08, 0.005, '#c62828', x, y + 0.2, 0.09 + i * 0.001, 'chu' + i, D);
    }
    lamDoc(D);
    return K.g;
  },
  thung_tiem_bach: (THREE) => {   // chồng thùng in "Tiệm gấu Bách" + dấu đầu gấu (hàng ông Bách tự giấu)
    const K = bo(THREE, 'thung_tiem_bach'); const D = K.sub('doc');
    const nhan = matChu(THREE, 1.3, 0.6, (g, w, h) => { g.fillStyle = '#fffaf0'; g.fillRect(0, 0, w, h); chuGiua(g, 'Tiệm gấu Bách', w / 2, h / 2, h * 0.5, TAY, '#3e2723', w * 0.94); }, 256);
    const ch = [[-1.7, 0.75], [0, 0.75], [1.7, 0.75], [-0.85, 2.25], [0.85, 2.25], [0, 3.75]];
    ch.forEach(([x, y], i) => {
      K.box(1.6, 1.5, 2.2, i % 2 ? '#d4a373' : '#c99a66', x, y, 0, 'thung' + i);
      K.box(1.3, 0.6, 0.02, nhan || '#6d4c41', x, y + 0.3, 1.11, 'nhan' + i, D);
      dauGau(K, null, x, y - 0.35, 1.11, 0.22);
    });
    lamDoc(D);
    return K.g;
  },
  vi: (THREE) => {         // cái ví
    const K = bo(THREE, 'vi');
    K.box(0.8, 0.12, 0.6, '#6d4c41', 0, 0.06, 0, 'vi'); K.box(0.82, 0.02, 0.1, '#a1887f', 0, 0.06, 0.26, 'chi_may');
    K.box(0.45, 0.02, 0.3, '#42a5f5', 0.1, 0.13, -0.08, 'the');
    return K.g;
  },
  tui_tien: (THREE) => {   // túi tiền buộc dây, đồng xu vàng
    const K = bo(THREE, 'tui_tien');
    const t = K.sph(0.6, '#d7b98e', 0, 0.51, 0, 'tui'); t.scale.y = 0.85;
    K.cyl(0.18, 0.22, 0.25, '#c8a165', 0, 1.1, 0, 'co'); const d = K.tor(0.2, 0.05, '#8d6e63', 0, 1.05, 0, 'day'); d.rotation.x = PI / 2;
    K.cyl(0.05, 0.25, 0.2, '#c8a165', 0, 1.3, 0, 'tua');
    const xu = K.cyl(0.2, 0.2, 0.05, '#ffd54f', 0, 0.55, 0.58, 'xu', null, { metalness: 0.8, roughness: 0.3 }); xu.rotation.x = PI / 2;
    return K.g;
  },
  doi_dep: (THREE) => {    // đôi dép của thị trưởng
    const K = bo(THREE, 'doi_dep');
    for (const [i, x] of [-0.35, 0.35].entries()) {
      K.box(0.55, 0.12, 1.15, '#90caf9', x, 0.06, 0, 'de' + i); K.box(0.55, 0.2, 0.35, '#1e88e5', x, 0.2, 0.15, 'quai' + i);
      K.sph(0.08, '#ffffff', x, 0.3, 0.22, 'bong' + i);
    }
    return K.g;
  },
  bac_them_dep: (THREE) => {   // bậc thềm 2 bậc trước cửa nhà thị trưởng + đôi dép lê xanh để cạnh (mặt trước +Z)
    const K = bo(THREE, 'bac_them_dep'); bacThem(K); dep(K, 2.9, 0.3);
    return K.g;
  },
  bac_them_trong: (THREE) => {   // bậc thềm 2 bậc, KHÔNG có dép (dép đã biến mất)
    const K = bo(THREE, 'bac_them_trong'); bacThem(K);
    return K.g;
  },
  thung_go: (THREE) => {   // thùng gỗ để đứng lên
    const K = bo(THREE, 'thung_go');
    K.box(2.4, 2, 2.4, '#a0703c', 0, 1, 0, 'thung');
    for (const y of [0.5, 1.0, 1.5]) K.box(2.42, 0.06, 2.42, '#7b5230', 0, y, 0, 'van');
    const c = K.box(2.6, 0.18, 0.04, '#8d5a2b', 0, 1, 1.22, 'cheo'); c.rotation.z = 0.68;
    return K.g;
  },
  hang_rao: (THREE) => {   // hàng rào lưới nhà máy
    const K = bo(THREE, 'hang_rao');
    for (const [i, x] of [-3.9, -1.3, 1.3, 3.9].entries()) K.cyl(0.12, 0.12, 3.5, '#78909c', x, 1.75, 0, 'cot' + i, null, { metalness: 0.6, roughness: 0.4 });
    const ray = K.cyl(0.08, 0.08, 8, '#78909c', 0, 3.4, 0, 'ray', null, { metalness: 0.6, roughness: 0.4 }); ray.rotation.z = PI / 2;
    for (let i = 0; i < 20; i++) K.box(0.03, 3.2, 0.03, '#b0bec5', -3.8 + i * 0.4, 1.7, 0, 'luoi' + i);
    for (let j = 0; j < 7; j++) K.box(7.8, 0.03, 0.03, '#b0bec5', 0, 0.3 + j * 0.5, 0, 'luoi_ngang' + j);
    return K.g;
  },
  ban_bay: (THREE) => {    // bàn bày (đỡ đồ nhỏ ở ngoài trời, cao ngang quầy)
    const K = bo(THREE, 'ban_bay');
    K.box(3, 0.2, 2, '#8d6e63', 0, 2.5, 0, 'mat');
    for (const [i, [x, z]] of [[-1.3, -0.8], [1.3, -0.8], [-1.3, 0.8], [1.3, 0.8]].entries()) K.box(0.2, 2.4, 0.2, '#5d4037', x, 1.2, z, 'chan' + i);
    K.box(3, 0.6, 0.02, '#e57373', 0, 2.2, 1.01, 'khan');
    return K.g;
  },
};

// size [rộng, cao, sâu] (stud); base: floor (đặt sàn) | surface (đặt lên mặt kệ/bàn) | wall (treo tường, gốc = đáy sau);
// fixed: đồ cố định → hiện ở MỌI shot cùng nơi; surfaces: chỗ bày đồ trên nó (toạ độ cục bộ, y = mặt đỡ)
export const PROP_INFO = {
  ke_trong: { size: [4, 5, 1.4], base: 'floor', fixed: true, surfaces: [[-1, 1.75, 0.1], [1, 1.75, 0.1], [-1, 3.4, 0.1], [1, 3.4, 0.1]] },
  o_khoa: { size: [3.2, 6.8, 0.5], base: 'floor', fixed: true },
  hoc_quay: { size: [5, 3.5, 2], base: 'floor', fixed: true, surfaces: [[-1.6, 2.6, 0.4], [1.6, 2.6, 0.4]] },
  hop_nhan: { size: [0.9, 0.6, 0.7], base: 'surface' },
  thung_dau_gau: { size: [2.4, 2, 2.4], base: 'floor', fixed: true, surfaces: [[0, 2, 0]] },
  ke_phong_ga: { size: [4, 6, 1.4], base: 'floor', fixed: true, surfaces: [[-0.9, 2.1, 0.1], [0.9, 2.1, 0.1], [-0.9, 4.05, 0.1], [0.9, 4.05, 0.1]] },
  anh_ba: { size: [1.2, 1.5, 0.45], base: 'surface', fixed: true },
  dong_ho: { size: [0.9, 1.0, 0.5], base: 'surface' },
  guong: { size: [3, 7, 0.4], base: 'floor', fixed: true },
  cuon_sach: { size: [0.35, 1.3, 1.0], base: 'surface' },
  nhan_moi: { size: [0.6, 0.55, 0.6], base: 'surface' },
  bang_chuyen: { size: [10, 3, 2.4], base: 'floor', fixed: true, surfaces: [[-3, 2.6, 0], [-1, 2.6, 0], [1, 2.6, 0], [3, 2.6, 0]] },
  ke_gau: { size: [8, 6, 1.6], base: 'floor', fixed: true },
  ban_do: { size: [5, 3.5, 0.15], base: 'wall', fixed: true },
  ket_tien: { size: [2.2, 2.2, 2.1], base: 'floor', fixed: true, surfaces: [[0, 2.2, 0]] },
  day_chuyen: { size: [0.8, 0.12, 0.65], base: 'surface' },
  chuong: { size: [0.6, 0.93, 0.6], base: 'surface' },
  chan_tran: { size: [1.6, 0.7, 1.2], base: 'floor' },
  ket_ga: { size: [2, 2, 1.8], base: 'floor', fixed: true, surfaces: [[0, 2, 0]] },
  bang_tin: { size: [5, 6, 0.45], base: 'floor', fixed: true },
  thung_tiem_bach: { size: [5, 4.5, 2.2], base: 'floor', fixed: true },
  vi: { size: [0.8, 0.15, 0.6], base: 'surface' },
  tui_tien: { size: [1.2, 1.4, 1.2], base: 'floor' },
  doi_dep: { size: [1.4, 0.35, 1.2], base: 'floor' },
  bac_them_dep: { size: [7, 1, 3.5], base: 'floor', fixed: true },
  bac_them_trong: { size: [5, 1, 3.5], base: 'floor', fixed: true },
  thung_go: { size: [2.4, 2, 2.4], base: 'floor', fixed: true, surfaces: [[0, 2, 0]] },
  hang_rao: { size: [8, 3.5, 0.3], base: 'floor', fixed: true },
  ban_bay: { size: [3, 2.6, 2], base: 'floor', fixed: true, surfaces: [[0, 2.6, 0]] },
};
const INFO_LA = { size: [1.2, 1.2, 1.2], base: 'floor' };   // kit lạ (propKit / chưa có): khung giả định
export const infoOf = (kit) => (glbOn() && GLB_INFO[kit] ? { ...PROP_INFO[kit], ...GLB_INFO[kit] } : PROP_INFO[kit] || INFO_LA);

// ĐIỂM BÀY theo env (toạ độ của env; env dựng tại gốc). byName: chỗ riêng cho tên đạo cụ [x, y, z, ry];
// floor / wall: chỗ chung lần lượt; camMax: khoảng lùi camera tối đa (phòng kín); coSan: đạo cụ env ĐÃ DỰNG SẴN (không dựng thêm —
// chỉ đặt một mốc rỗng cùng tên tại byName để camera insert/insertRead và mặt đỡ vẫn dùng được). Env có thể tự khai
// `export const PROP_SLOTS = {…}` trong engine/envs/<tên>.js — index.html gộp đè lên bảng này (agent dựng env khai đúng chỗ của env mình).
export const PROP_SLOTS = {
  factory: {   // theo FACTORY_DIEM của engine/envs/factory.js (gốc = giữa xưởng, mặt chính nhìn −Z)
    byName: {
      bang_chuyen: [-5, 0, -6, 0], ke_gau: [-8.5, 0, -14.5, 0], ban_do: [14, 6.75, -15.95, 0], chuong: [10, 3.2, -9, 0],
      ket_tien: [-6, 0, -4.4, 0], thung_tiem_bach: [-17, 0, 0.5, PI / 2], thung_go: [0, 0, 16.6, PI], hang_rao: [-1.2, 0, 34, 0],
    },
    coSan: ['bang_chuyen', 'ke_gau', 'thung_go', 'hang_rao'],
    floor: [[-5, 0, 1, 0], [5, 0, 1, 0], [-7, 0, 6, PI / 2], [7, 0, 6, -PI / 2], [0, 0, 8, PI]],
    wall: [[-14, 6, -15.95, 0]],
    camMax: 22,
  },
  bedroom: {
    byName: { ke_phong_ga: [17.6, 0, -11, -PI / 2], guong: [-10, 0, 15.5, PI], ket_ga: [-17, 0, 16.5, (3 * PI) / 4] },
    floor: [[10, 0, 12, PI], [-16, 0, 4, PI / 2], [12, 0, -8, -PI / 2], [0, 0, 14, PI], [-4, 0, 10, PI]],
    wall: [[-19.8, 8, 6, PI / 2], [19.8, 8, 8, -PI / 2]],
    camMax: 15,
  },
  _chung: {   // env chưa khai (vd. factory trước khi có engine/envs/factory.js khai PROP_SLOTS)
    byName: {},
    floor: [[-9, 0, -8, 0], [0, 0, -10, 0], [9, 0, -8, 0], [-12, 0, 2, PI / 2], [12, 0, 2, -PI / 2], [-6, 0, 8, PI], [6, 0, 8, PI], [0, 0, 12, PI]],
    wall: [[0, 5, -14, 0], [-8, 5, -14, 0], [8, 5, -14, 0]],
    camMax: null,
  },
};

const r3 = (v) => Math.round(v * 1000) / 1000;
const rotY = ([x, y, z], ry) => [x * Math.cos(ry) + z * Math.sin(ry), y, -x * Math.sin(ry) + z * Math.cos(ry)];
const addv = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
// khoảng lùi để vật (rộng w, cao h) chiếm `fill` khung dọc (fov dọc, độ)
export function fitDist(w, h, fill = 0.5, fov = 30) {
  const t = Math.tan((fov * PI) / 360);
  return r3(Math.max(2, w / (fill * 2 * t * ASPECT), h / (fill * 2 * t)));
}

// ---- ĐẶT đạo cụ (hàm thuần) ----
//   epProps = EPISODE.props; places = resolvePlaces(…) (có '<env>_in'); envs = tên env đang có (env thắng place cùng tên)
//   → { <tên>: { pos:[x,y,z], ry, parent:'room'|undefined, loc, stand:'table'|'easel'|null, look:[0, y_tâm, 0], size } }
// Quy tắc: pos ghi tay thắng. Env: byName → (đồ để mặt phẳng) mặt kệ/bàn cố định cùng nơi (`on` chỉ định) → chỗ floor/wall lần lượt.
//   Thị trấn: lùi 1.5 về phía nhà so với điểm đứng của địa điểm, xếp lệch trái/phải không chồng (theo thứ tự dùng);
//   đồ nhỏ không có mặt đỡ → bàn bày cao ngang quầy (STAND_H); đồ treo tường → giá đỡ (EASEL_H).
export function datDaoCu(epProps = {}, places = {}, { townEnv = 'kenneyTown', envs = [], slots = PROP_SLOTS } = {}) {
  const envSet = new Set(envs);
  const isEnv = (loc) => loc !== townEnv && (envSet.has(loc) || !places[loc]);
  const out = {}, dung = new Map(), ben = new Map(), mat = new Map();
  const names = Object.keys(epProps);
  const info = (n) => infoOf(epProps[n].kit || n);
  const ghi = (n, pos, ry, extra = {}) => {
    const I = info(n), lift = extra.stand === 'table' ? STAND_H : extra.stand === 'easel' ? EASEL_H : 0;
    out[n] = { pos: pos.map(r3), ry: r3(ry), loc: epProps[n].at, stand: null, ...extra, look: [0, r3(lift + I.size[1] / 2), 0], size: I.size };
    if (isEnv(epProps[n].at)) { out[n].parent = 'room'; if ((slots[epProps[n].at] || {}).coSan?.includes(n)) out[n].coSan = true; }
  };
  const lay = (loc, kind) => { const S = slots[loc] || slots._chung, k = loc + '|' + kind, i = dung.get(k) || 0; dung.set(k, i + 1); const L = S[kind] || []; return L.length ? L[i % L.length] : [0, 0, 0, 0]; };
  const thiTran = (n, loc, I, stand) => {
    const P = places[loc] || { pos: [0, 0, 0], ry: 0 }, ry = P.ry || 0;
    const f = [Math.sin(ry), 0, Math.cos(ry)], s = [Math.cos(ry), 0, -Math.sin(ry)];
    const b = ben.get(loc) || { l: 2.2, r: 2.2, n: 0 }, phai = b.n % 2 === 0, w = stand === 'table' ? Math.max(I.size[0], 3) : I.size[0];
    const off = (phai ? b.r : b.l) + w / 2; if (phai) b.r += w + 1; else b.l += w + 1; b.n++; ben.set(loc, b);
    return addv(addv(P.pos, f, -1.5), s, phai ? off : -off).concat([ry]);
  };
  const host = (n) => {   // mặt đỡ cho đồ để mặt phẳng: đạo cụ cố định cùng nơi có surfaces (on chỉ định trước)
    const loc = epProps[n].at, on = epProps[n].on;
    const ok = (h) => h !== n && out[h] && epProps[h].at === loc && info(h).surfaces?.length;
    let h = on && (ok(on) ? on : names.find((k) => ok(k) && k.startsWith(on + '_')));
    if (!h && !on) h = names.find((k) => ok(k) && info(k).fixed && info(k).base === 'floor');
    return h || null;
  };
  // pha 1: đồ sàn/tường (+ pos ghi tay); pha 2: đồ để mặt phẳng (cần biết chỗ của kệ/bàn)
  for (const pha of [1, 2]) {
    for (const n of names) {
      const p = epProps[n], I = info(n), loc = p.at;
      if (Array.isArray(p.pos)) { if (pha === 1) ghi(n, p.pos, p.ry ?? 0); continue; }
      if ((I.base === 'surface') !== (pha === 2)) continue;
      const S = slots[loc] || slots._chung;
      if (isEnv(loc) && S.byName?.[n]) { const [x, y, z, ry] = S.byName[n]; ghi(n, [x, y, z], ry); continue; }
      if (pha === 2) {
        const h = host(n);
        if (h) {
          const H = out[h], L = info(h).surfaces, i = mat.get(h) || 0; mat.set(h, i + 1);
          const q = L[i % L.length], d = rotY(q, H.ry);
          ghi(n, [H.pos[0] + d[0], H.pos[1] + q[1] + 0.001 * Math.floor(i / L.length), H.pos[2] + d[2]], H.ry);
          continue;
        }
        if (isEnv(loc)) { const [x, y, z, ry] = lay(loc, 'floor'); ghi(n, [x, y, z], ry); continue; }
        const [x, y, z, ry] = thiTran(n, loc, I, 'table'); ghi(n, [x, y, z], ry, { stand: 'table' });
        continue;
      }
      if (isEnv(loc)) { const [x, y, z, ry] = lay(loc, I.base === 'wall' ? 'wall' : 'floor'); ghi(n, [x, y, z], ry); continue; }
      const st = I.base === 'wall' ? 'easel' : null, [x, y, z, ry] = thiTran(n, loc, I, st);
      ghi(n, [x, y, z], ry, st ? { stand: st } : {});
    }
  }
  return out;
}

// ---- DỰNG đạo cụ: { tên: Object3D (tên = tên đạo cụ, gốc ở sàn) } ----
//   ten: mảng tên (kit = tên) | EPISODE.props. kit tra PROPS_KB trước, rồi K[kit] (propKit); không có → khối giữ chỗ có màu + warn.
export function buildPropsKB(THREE, ten = [], { K = null, dat = {}, warn = (m) => console.warn(m) } = {}) {
  const ds = Array.isArray(ten) ? Object.fromEntries(ten.map((n) => [n, { kit: n }])) : ten;
  const out = {};
  for (const [name, p] of Object.entries(ds)) {
    const kit = (p && p.kit) || name, root = new THREE.Group(); root.name = name;
    let o = null;
    if (dat[name]?.coSan) { o = new THREE.Group(); o.name = name + '_co_san'; root.add(o); root.userData.kit = kit; root.userData.coSan = true; out[name] = root; continue; }
    if (PROPS_KB[kit]) { o = PROPS_KB[kit](THREE); o = glbWrap(THREE, kit, o) || o; }
    else if (K && typeof K[kit] === 'function') { o = K[kit](); o.name = (o.name || kit) + '_goc'; }
    else {
      warn(`[props-kb] đạo cụ "${name}": kit "${kit}" chưa có trong PROPS_KB / propKit → khối giữ chỗ`);
      o = new THREE.Group(); o.name = name + '_giu_cho';
      const m = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), new THREE.MeshStandardMaterial({ color: '#ff4fa3', roughness: 0.6 }));
      m.position.y = 0.6; m.name = name + '_giu_cho_hop'; o.add(m);
      const n2 = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.2, 1.25), new THREE.MeshStandardMaterial({ color: '#ffe14f', roughness: 0.6 }));
      n2.position.y = 1.25; n2.name = name + '_giu_cho_nap'; o.add(n2);
    }
    const st = dat[name]?.stand;
    if (st === 'table') { const t = PROPS_KB.ban_bay(THREE); t.name = name + '_ban_bay'; root.add(t); o.position.y = STAND_H; }
    if (st === 'easel') {
      const e = new THREE.Group(); e.name = name + '_gia_do';
      for (const x of [-1.2, 1.2]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.18, EASEL_H + 1.2, 0.18), new THREE.MeshStandardMaterial({ color: '#5d4037', roughness: 0.8 })); l.position.set(x, (EASEL_H + 1.2) / 2, -0.12); l.name = name + '_chan_gia'; e.add(l); }
      root.add(e); o.position.y = EASEL_H;
    }
    o.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
    root.add(o); root.userData.kit = kit; out[name] = root;
  }
  return out;
}

// ---- GẮN đạo cụ vào shot (trước expandShots; trả mảng shot MỚI, không sửa SHOTS) ----
const heldIn = (s) => { const r = new Map(); for (const [who, c] of Object.entries(s.cast || {})) for (const k of ['hold', 'holdL', 'holdR']) if (c && c[k]) r.set(typeof c[k] === 'string' ? c[k] : c[k].name, who); return r; };
function locsOf(SHOTS, townEnv) {
  let env = townEnv, at;
  return SHOTS.map((s) => { env = s.env || env; if (s.at !== undefined) at = s.at; return env !== townEnv ? env : (typeof at === 'string' ? at : null); });
}
export const tenNoi = (SHOTS, i, { townEnv = 'kenneyTown' } = {}) => locsOf(SHOTS.slice(0, i + 1), townEnv)[i];
// Hiện: shot dùng nó (obj/read/cầm) HOẶC cùng nơi và (đồ cố định | được dùng trong cùng KHỐI CẢNH = chuỗi shot liền nhau cùng nơi).
//   Vật chỉ được cầm (hold: true) chỉ hiện khi đang được cầm.
// Camera: insert có obj → nhắm tâm vật (look theo chiều cao, lùi theo kích thước, đẩy vào 28%); có ai (không cầm vật) → đứng cạnh vật;
//   ai là gấu → camera khung cả gấu + vật. insertRead → look tâm vật, w = bề ngang vật. `cam`/`w` ghi tay trong shot thắng.
export function ganDaoCu(SHOTS, { props = {}, dat = {}, actors = {}, townEnv = 'kenneyTown' } = {}) {
  const locs = locsOf(SHOTS, townEnv);
  const uses = SHOTS.map((s) => { const u = new Set(heldIn(s).keys()); if (s.obj) u.add(s.obj); if (s.read) u.add(s.read); return u; });
  const datRa = new Set(SHOTS.flatMap((s) => [s.obj, s.read]).filter(Boolean));
  const block = []; let b = 0;
  locs.forEach((L, i) => { if (i > 0 && L !== locs[i - 1]) b++; block.push(b); });
  const dungKhoi = new Map();
  uses.forEach((u, i) => { const S = dungKhoi.get(block[i]) || new Set(); for (const n of u) S.add(n); dungKhoi.set(block[i], S); });
  return SHOTS.map((s, i) => {
    const o = { ...s }, spec = {}, held = heldIn(s);
    for (const [name, d] of Object.entries(dat)) {
      const I = infoOf(props[name]?.kit || name);
      const cho = !props[name]?.hold || datRa.has(name);   // vật chỉ được cầm: không bày ra chỗ nào (đạo diễn gắn vào tay khi cầm)
      const hien = (uses[i].has(name) && !held.has(name)) || (cho && d.loc === locs[i] && (I.fixed || dungKhoi.get(block[i]).has(name)));
      if (hien) spec[name] = { at: d.pos, ry: d.ry, ...(d.parent ? { parent: d.parent } : {}) };
    }
    if (Object.keys(spec).length || s.props) o.props = { ...spec, ...(s.props || {}) };
    if (s.type === 'insert' && s.obj && dat[s.obj] && !held.has(s.obj)) {
      const d = dat[s.obj], [w, h] = d.size, yaw = d.ry + 0.3;
      const center = [d.pos[0], d.pos[1] + d.look[1], d.pos[2]];
      let dist = fitDist(w, h), cam = { at: 'obj:' + s.obj, look: d.look, yaw: r3(yaw), dist, dist2: r3(dist * 0.72), h: r3(dist * 0.12) };
      if (typeof s.who === 'string') {
        // vật hẹp (≤ 3 stud): đứng CẠNH vật; vật rộng (băng chuyền, kệ dài): đứng TRƯỚC vật, lệch 1 stud — khung phần vật sau lưng
        const sv = [Math.cos(d.ry), 0, -Math.sin(d.ry)], fv = [Math.sin(d.ry), 0, Math.cos(d.ry)], rong = w > 3, k = w / 2 + 1.3;
        const at = rong ? [r3(d.pos[0] + fv[0] * (d.size[2] / 2 + 1) + sv[0]), 0, r3(d.pos[2] + fv[2] * (d.size[2] / 2 + 1) + sv[2])]
          : [r3(d.pos[0] + sv[0] * k), 0, r3(d.pos[2] + sv[2] * k)];
        o.cast = { ...(s.cast || {}), [s.who]: { at, ry: r3(d.ry), ...((s.cast || {})[s.who] || {}) } };
        if (actors[s.who]?.bear) {
          const tg = rong ? [d.pos[0] + sv[0], center[1], d.pos[2] + sv[2]] : center;
          const mid = [r3((tg[0] + at[0]) / 2), r3((tg[1] + 1.3) / 2), r3((tg[2] + at[2]) / 2)];
          dist = fitDist(rong ? 4 : k + w / 2 + 1.2, Math.max(rong ? 2.6 : h, 2.6) + Math.abs(tg[1] - 1.3), 0.6);
          cam = { at: mid, look: [0, 0, 0], yaw: r3(yaw), dist, dist2: r3(dist * 0.72), h: r3(dist * 0.12) };
        }
      }
      o.cam = { ...cam, ...(s.cam || {}) };
    }
    if (s.type === 'insertRead' && s.read && dat[s.read]) {
      const d = dat[s.read];
      o.cam = { look: d.look, yaw: d.ry, ...(s.cam || {}) };
      if (s.w === undefined) o.w = d.size[0];
    }
    return o;
  });
}

// ---- sau expandShots: nhóm diễn viên chạy cùng (lệch sau/ngang + lệch pha), stance vào cast, camera trong phòng ≤ camMax ----
export function noiNhom(shots, { slots = PROP_SLOTS } = {}) {
  return shots.map((s) => {
    let o = s;
    const cast = s.cast ? { ...s.cast } : null;
    if (s.group && cast && cast[s.who]) {
      const L = cast[s.who], mem = Array.isArray(s.with) ? s.with : s.with ? [s.with] : [];
      let dir = L.to && L.at ? [L.to[0] - L.at[0], 0, L.to[2] - L.at[2]] : [Math.sin(L.ry || 0), 0, Math.cos(L.ry || 0)];
      const n = Math.hypot(dir[0], dir[2]) || 1; dir = [dir[0] / n, 0, dir[2] / n];
      const lat = [dir[2], 0, -dir[0]];
      mem.forEach((m, i) => {
        const off = addv(addv([0, 0, 0], dir, -2.4 * (i + 1)), lat, (i % 2 ? -1 : 1) * 1.5);
        const giu = {}; for (const k of ['hold', 'holdL', 'holdR', 'face', 'stance']) if (cast[m]?.[k] !== undefined) giu[k] = cast[m][k];
        const sp = { ...L, at: addv(L.at, off).map(r3), tOff: r3((L.tOff || 0) + 0.17 * (i + 1)), ...giu };
        if (L.to) sp.to = addv(L.to, off).map(r3);
        delete sp.face; if (giu.face) sp.face = giu.face;
        for (const k of ['hold', 'holdL', 'holdR']) if (!giu[k]) delete sp[k];
        cast[m] = sp;
      });
    }
    if (s.stance && cast) for (const m of [s.who, ...(s.group ? [].concat(s.with || []) : [])]) if (cast[m]) cast[m] = { ...cast[m], stance: s.stance };
    if (cast) o = { ...o, cast };
    const lim = (slots[s.env] || {}).camMax;
    const c = o.cam;
    if (lim && c && typeof c.dist === 'number' && !c.p) {
      const m = Math.max(c.dist, c.dist2 ?? 0);
      if (m > lim) {
        const k = lim / m, c2 = { ...c, dist: r3(c.dist * k) };
        if (typeof c.dist2 === 'number') c2.dist2 = r3(c.dist2 * k);
        if (typeof c.h === 'number') c2.h = r3(c.h * k);
        if (typeof c.h2 === 'number') c2.h2 = r3(c.h2 * k);
        o = { ...o, cam: c2 };
      }
    }
    return o;
  });
}
