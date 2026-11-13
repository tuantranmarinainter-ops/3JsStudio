// props-glb.js — MODEL GLB low-poly (assets/nhap/*.glb, đã duyệt: duyet/ep002/kit-sang-glb.json) thay khối code của kit trong engine/props-kb.js.
//
// Cách làm: buildPropsKB dựng kit bằng code như cũ, rồi (nếu bật + kit có model) glbWrap() thay thân bằng GLB, ĐÚNG hộp bao mà kit cũ chiếm
// (đáy chạm y=0, tâm xz trùng; co không đều theo `dims` khi ghi chú duyệt nói lệch bề ngang), GIỮ các phần "lớp phủ đồ hoạ" của kit
// (vết bụi, nhãn, dấu gấu, ảnh trong khung, ổ khoá…) liệt kê ở `keep`; `drop` bỏ phần lồng bên trong nhóm giữ lại.
//
// Nạp: GLB tải xong TRƯỚC __ready bằng `await glbPreload()` ở đầu engine/props-kb.js (top-level await, chỉ trong trình duyệt) — không fetch lúc seek.
// Bundle (tools/bundle.mjs) ghi lại file tải lúc init nên GLB được nhúng như asset khác.
//
// Bật/tắt: ?propsGlb=0|1 (thắng) → globalThis.__propsGlb (episode.js: EPISODE.propsGlb = false) → mặc định BẬT.
// Tắt (?propsGlb=0) còn không tải GLB nào → hình giống hệt khối code cũ.
//
// Vật liệu: mọi mesh GLB đánh dấu userData.matKind/grungeKind = 'none' (như engine/scans.js) → applyMaterials/applyGrunge không vá lên màu đã duyệt.
// Đổ bóng: castShadow/receiveShadow = true; MeshStandardMaterial gốc, không emissive.

// dims: hộp đích [rộng, cao, sâu] của kit (không có → giữ cỡ gốc của model); at: [x, z] tâm hộp đích (mặc định 0,0);
// basis: 3 cột (ảnh của trục x,y,z của model) — xoay dựng/nằm; keep/drop: xem đầu file; ext: hàm tuỳ biến thêm
export const GLB_KIT = {
  ke_trong: { id: 'nhap/ke-trong', dims: [4, 5, 1.4], keep: ['bui', 'cho_sach'], dyKeep: -0.09 },   // mặt ván tầng 2 của model = 1.66 (kit cũ 1.75)
  ke_phong_ga: { id: 'nhap/ke-sach-xam', dims: [4, 6, 1.4], keep: [], sang: 0.3,
    cat: [0.90, 2.31, 3.02, 4.44].map((t) => ({ min: [-1.69, t - 0.1, -9], max: [1.69, t + 0.03, 9] })) },   // bỏ 4/8 ván: ván cách nhau 0.7 không đủ chỗ cho đồng hồ/ảnh/sách (còn ván ở 0.15, 1.60, 3.73, 5.15)
  ke_gau: { id: 'nhap/ke-kho', dims: [8, 6, 1.6], keep: [] },
  o_khoa: { id: 'nhap/cua-go', dims: [3.2, 6.8, 0.6], keep: ['mat_khoa', 'lo_khoa', 'nam'] },
  hoc_quay: { id: 'nhap/sap-cho', basis: [[0, 0, -1], [0, 1, 0], [1, 0, 0]], dims: [7.1, 6.3, 5.7], keep: ['bang', 'banh'], ext: 'hocQuay' },
  thung_dau_gau: { id: 'nhap/dong-thung', tach: { min: [-0.8, -0.05, -0.55], max: [0.5, 1.75, 0.8] }, dims: [2, 2, 2], keep: ['gau_', 'in_hong'], ext: 'thungGau' },
  thung_tiem_bach: { id: 'nhap/dong-thung', keep: [], ext: 'nhanThung' },
  bang_tin: { id: 'nhap/bang-tin-go', keep: ['doc'], drop: ['bang_tin_bang'] },
  anh_ba: { id: 'nhap/khung-anh', keep: ['khung'], drop: ['anh_ba_vien'], ext: 'anhBa' },
  dong_ho: { id: 'nhap/dong-ho-bao-thuc', dims: [0.8, 1.0, 0.43], keep: [] },
  guong: { id: 'nhap/guong-khung', keep: ['phan_chieu'], ext: 'guong' },
  cuon_sach: { id: 'nhap/cuon-sach', basis: [[0, 0, 1], [1, 0, 0], [0, 1, 0]], keep: [] },
  nhan_moi: { id: 'nhap/nhan-kim-cuong', keep: [] },
  vi: { id: 'nhap/vi-da', keep: [] },
  tui_tien: { id: 'nhap/tui-tien', dims: [1.2, 1.4, 1.2], keep: [] },
  bang_chuyen: { id: 'nhap/bang-chuyen-xam', dims: [10, 3, 3.656], keep: [] },
  ket_tien: { id: 'nhap/ket-xanh-xam', keep: [], sang: 0.4 },
  ket_ga: { id: 'nhap/ket-sat-xam', keep: [] },
  day_chuyen: { id: 'nhap/day-chuyen-vang', basis: [[1, 0, 0], [0, 0, -1], [0, 1, 0]], keep: [] },   // Rx(−90°): dây dựng đứng → nằm phẳng, mặt dây hướng +Z
  chuong: { id: 'nhap/chuong-tay', keep: [] },
  doi_dep: { id: 'nhap/dep-xo-ngon', dims: [1.3, 0.3, 1.3], keep: [] },
  // ---- Đợt 4 (duyet/ep002/da-nhap-dot4.json) ----
  // đồng hồ quả quýt: kit cũ NẰM mặt số ngửa (xích về −Z) → xoay Rx(−90°); cỡ co đều ×1.33 cho khớp thân tròn 0.84 của kit cũ (model 0.63)
  dong_ho_quyt: { id: 'nhap/dong-ho-qua-quyt', basis: [[1, 0, 0], [0, 0, -1], [0, 1, 0]], dims: [0.84, 0.177, 1.2], keep: [] },
  dong_ho_quyt_thi: { id: 'nhap/dong-ho-qua-quyt', basis: [[1, 0, 0], [0, 0, -1], [0, 1, 0]], dims: [0.84, 0.177, 1.2], keep: [] },
  // hộp nhẫn MỞ TRỐNG (kịch bản s006: "hộp nhẫn mở trống, cuộn chỉ") → bản hop-nhan-sang (rỗng); cuộn chỉ = model cuon-chi đặt bên phải như kit cũ
  hop_nhan: { id: 'nhap/hop-nhan-sang', at: [-0.15, 0.05], keep: [], extra: ['nhap/cuon-chi'], ext: 'hopNhan' },
  thung_go: { id: 'nhap/thung-go-dung', dims: [2.4, 2, 2.4], keep: [] },   // (factory: env tự dựng sẵn — coSan — nên chưa có tác dụng ở ep002)
  hang_rao: { id: 'nhap/hang-rao', dims: [8, 3.5, 0.3], keep: [] },        // (factory: coSan, như trên). Cổng 3.6 rộng bị kéo ngang ×2.2 — dùng khi env không dựng sẵn
  chan_tran: { id: 'nhap/ban-chan', keep: [], haiBan: 0.45, da: '#f0c89a' },
  bac_them_dep: { id: 'nhap/bac-them', dims: [5, 1, 3.5], at: [-1, 0.25], keep: ['dep_', 'tham_chui_chan'] },
  bac_them_trong: { id: 'nhap/bac-them', dims: [5, 1, 3.5], at: [-1, 0.25], keep: ['tham_chui_chan'] },
  // ---- Đợt đạo cụ riêng (duyet/ep002/da-nhap-dot4.json) ----
  ban_tiem_may: { id: 'nhap/ban-tiem-may', keep: [] },
  den_cua: { id: 'nhap/den-cua', dims: [0.545, 1.2, 0.545], at: [0.55, 0], keep: ['chan_de', 'cot', 'dinh_cot', 'tay'], ext: 'denCua' },
  bang_hieu_treo: { id: 'nhap/bang-hieu-treo', dims: [4.18, 5.6, 0.94], keep: [], ext: 'bangTreo' },
  thung_dan_mat: { id: 'nhap/thung-go-dung', dims: [2.2, 2.2, 2.2], keep: ['doc', 'do_'], ext: 'cumThung' },
  thung_bach_giau: { id: 'nhap/thung-go-dung', dims: [2.2, 2.2, 2.2], keep: ['doc'], ext: 'cumThung' },
};
// kích thước/mặt đỡ KHÁC của kit khi dùng GLB (datDaoCu/ganDaoCu dùng để đặt, lùi camera, đặt đồ lên mặt đỡ) — chỉ khi GLB đang bật
export const GLB_INFO = {
  ke_trong: { surfaces: [[-1, 1.66, 0.1], [1, 1.66, 0.1], [-1, 3.6, 0.1], [1, 3.6, 0.1]] },
  ke_phong_ga: { surfaces: [[-0.9, 1.6, 0.1], [0.9, 1.6, 0.1], [-0.9, 3.73, 0.1], [0.9, 3.73, 0.1]] },
  hoc_quay: { size: [7.1, 6.3, 5.7], surfaces: [[-2.2, 1.47, 0], [2.2, 1.47, 0]] },
  ket_tien: { size: [3.03, 2.2, 2.2], surfaces: [[0.43, 2.2, 0]] },
  ket_ga: { size: [2.44, 2, 3.54] },
  guong: { size: [4.35, 7, 0.48] },
  bang_tin: { size: [6.06, 6, 1.04] },
  thung_tiem_bach: { size: [5.1, 2.6, 6.4] },
  bang_hieu_treo: { size: [4.18, 5.6, 0.94] },
};

const DUONG = '/assets/manifest.json';
let LIB = null;
const urlFlag = () => { try { const v = new URLSearchParams(globalThis.location?.search || '').get('propsGlb'); return v === null ? null : v !== '0'; } catch (e) { return null; } };
export const glbOn = () => LIB !== null && (urlFlag() ?? (globalThis.__propsGlb !== false));
export const glbIds = () => [...new Set(Object.values(GLB_KIT).flatMap((k) => [k.id, ...(k.extra || [])]))];

// Chỉ trong trình duyệt (Node: test/công cụ → bỏ qua, kit code như cũ). ?propsGlb=0 → không tải gì.
export async function glbPreload() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  if (urlFlag() === false) return false;
  const THREE = await import('three');
  const { createAssetLib } = await import('./assets.js');
  const A = createAssetLib(THREE);
  await A.load(glbIds());
  LIB = { THREE, A };
  return true;
}

// ---- tách MỘT thùng từ khối gộp "đống thùng": giữ tam giác của các thành phần liền (hàn đỉnh theo toạ độ) có tâm hộp bao trong hộp `box` ----
function locTam(THREE, root, { box = null, cat = [] }) {
  const out = new THREE.Group(); out.name = 'thung_tach';
  root.updateMatrixWorld(true);
  root.traverse((m) => {
    if (!m.isMesh || !m.geometry?.attributes?.position) return;
    const g = m.geometry, P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv, I = g.index;
    const nv = P.count, par = new Int32Array(nv).map((_, i) => i);
    const find = (x) => { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; } return x; };
    const seen = new Map();
    for (let i = 0; i < nv; i++) { const k = `${Math.round(P.getX(i) * 1000)},${Math.round(P.getY(i) * 1000)},${Math.round(P.getZ(i) * 1000)}`; if (seen.has(k)) par[find(i)] = find(seen.get(k)); else seen.set(k, i); }
    const nt = (I ? I.count : nv) / 3, ix = (t, c) => (I ? I.getX(t * 3 + c) : t * 3 + c);
    for (let t = 0; t < nt; t++) { par[find(ix(t, 0))] = find(ix(t, 1)); par[find(ix(t, 1))] = find(ix(t, 2)); }
    const bb = new Map();
    for (let i = 0; i < nv; i++) {
      const r = find(i); let b = bb.get(r); if (!b) { b = [1e9, 1e9, 1e9, -1e9, -1e9, -1e9]; bb.set(r, b); }
      const v = [P.getX(i), P.getY(i), P.getZ(i)]; for (let a = 0; a < 3; a++) { b[a] = Math.min(b[a], v[a]); b[a + 3] = Math.max(b[a + 3], v[a]); }
    }
    const trong = (r) => { if (!box) return true; const b = bb.get(r); for (let a = 0; a < 3; a++) { const c = (b[a] + b[a + 3]) / 2; if (c < box.min[a] || c > box.max[a]) return false; } return true; };
    const bi = (t) => { if (!cat.length) return false; const c = [0, 0, 0]; for (let k = 0; k < 3; k++) { const i = ix(t, k); c[0] += P.getX(i) / 3; c[1] += P.getY(i) / 3; c[2] += P.getZ(i) / 3; } return cat.some((q) => c.every((v, a) => v >= q.min[a] && v <= q.max[a])); };
    const pos = [], nor = [], uv = [];
    for (let t = 0; t < nt; t++) {
      if (!trong(find(ix(t, 0))) || bi(t)) continue;
      for (let c = 0; c < 3; c++) { const i = ix(t, c); pos.push(P.getX(i), P.getY(i), P.getZ(i)); if (N) nor.push(N.getX(i), N.getY(i), N.getZ(i)); if (U) uv.push(U.getX(i), U.getY(i)); }
    }
    if (!pos.length) return;
    const ng = new THREE.BufferGeometry();
    ng.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    if (nor.length) ng.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    if (uv.length) ng.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    const nm = new THREE.Mesh(ng, m.material); nm.name = 'thung_tach_' + out.children.length; out.add(nm);
  });
  return out;
}


// ---- tuỳ biến theo kit ----
// pre: chạy trên model (toạ độ model, trước khi khớp); post: chạy trên nhóm kết quả g (toạ độ kit: đáy giữa, +Z là mặt trước)
const find = (g, rest, kit) => g.getObjectByName(kit + '_' + rest);
const EXT = {
  // nhãn "Tiệm gấu Bách" + dấu đầu gấu dán lên mặt hướng +Z của các thùng lớn nhất trong đống (đọc được ở s096 insertRead)
  nhanThung: {
    pre(THREE, model, code) {
      const kit = 'thung_tiem_bach', nhan = find(code, 'nhan0', kit) || code.getObjectByName(kit + '_doc')?.children.find((c) => c.name.startsWith(kit + '_nhan'));
      const gau = []; code.traverse((m) => { if (m.isMesh && /_gau_(dau|tai|tai2|mom)$/.test(m.name)) gau.push(m); });
      const D = new THREE.Group(); D.name = kit + '_doc'; D.userData.vai = 'doc';
      const comps = [];
      model.updateMatrixWorld(true);
      model.traverse((m) => {
        if (!m.isMesh) return;
        const g = m.geometry, P = g.attributes.position, I = g.index, nv = P.count, par = new Int32Array(nv).map((_, i) => i);
        const fd = (x) => { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; } return x; };
        const seen = new Map();
        for (let i = 0; i < nv; i++) { const k = `${Math.round(P.getX(i) * 1000)},${Math.round(P.getY(i) * 1000)},${Math.round(P.getZ(i) * 1000)}`; if (seen.has(k)) par[fd(i)] = fd(seen.get(k)); else seen.set(k, i); }
        const nt = (I ? I.count : nv) / 3, ix = (t, c) => (I ? I.getX(t * 3 + c) : t * 3 + c);
        for (let t = 0; t < nt; t++) { par[fd(ix(t, 0))] = fd(ix(t, 1)); par[fd(ix(t, 1))] = fd(ix(t, 2)); }
        const V = (i) => new THREE.Vector3(P.getX(i), P.getY(i), P.getZ(i));
        const by = new Map();
        for (let t = 0; t < nt; t++) {
          const a = V(ix(t, 0)), b = V(ix(t, 1)), c = V(ix(t, 2)), n = new THREE.Vector3().crossVectors(b.clone().sub(a), c.clone().sub(a)), ar = n.length() / 2;
          if (ar < 1e-6) continue; n.normalize(); if (n.z < 0.7) continue;
          const r = fd(ix(t, 0)); let e = by.get(r); if (!e) { e = { ar: 0, c: new THREE.Vector3(), n: new THREE.Vector3(), pts: [] }; by.set(r, e); }
          e.ar += ar; e.c.addScaledVector(a.clone().add(b).add(c).divideScalar(3), ar); e.n.addScaledVector(n, ar); e.pts.push(a, b, c);
        }
        for (const e of by.values()) { e.c.divideScalar(e.ar); e.n.normalize(); comps.push(e); }
      });
      comps.sort((a, b) => b.ar - a.ar);
      for (const e of comps.filter((q) => q.ar > 0.45).slice(0, 7)) {
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), e.n), inv = q.clone().invert();
        let w = 0; for (const p of e.pts) w = Math.max(w, Math.abs(p.clone().sub(e.c).applyQuaternion(inv).x));
        const W = Math.min(1.5, w * 1.5);   // bề ngang mặt thùng ≈ 2w
        const L = new THREE.Group(); L.name = kit + '_nhan_g'; L.position.copy(e.c).addScaledVector(e.n, 0.02); L.quaternion.copy(q);
        const pl = new THREE.Mesh(new THREE.PlaneGeometry(W * 0.86, W * 0.4), nhan ? nhan.material : new THREE.MeshStandardMaterial({ color: '#fffaf0' }));
        pl.position.set(0, W * 0.16, 0); pl.name = kit + '_nhan'; L.add(pl);
        if (gau.length) { const c0 = gau[0].position; for (const m of gau.slice(0, 4)) { const c = m.clone(); c.position.set(m.position.x - c0.x, m.position.y - c0.y - W * 0.2, 0.005 + (m.position.z - c0.z)); c.scale.setScalar((W * 0.2) / 0.22); L.add(c); } }
        D.add(L);
      }
      model.add(D);
    },
  },
  hopNhan: {
    post(THREE, g) {   // cuộn chỉ (cao 0.34, đáy y=0) cạnh hộp, đúng chỗ cuộn chỉ của kit cũ (0.3, 0, 0.05)
      const c = LIB.A.instance('nhap/cuon-chi', { name: 'hop_nhan_chi' });
      c.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; m.userData.matKind = 'none'; m.userData.grungeKind = 'none'; } });
      const h = new THREE.Group(); h.add(c); h.updateMatrixWorld(true);
      const b = new THREE.Box3().setFromObject(h), s = 0.34 / Math.max(b.max.y - b.min.y, 1e-3);
      h.scale.setScalar(s); h.updateMatrixWorld(true);
      const b2 = new THREE.Box3().setFromObject(h), ct = b2.getCenter(new THREE.Vector3());
      h.position.set(0.3 - ct.x, -b2.min.y, 0.05 - ct.z); h.name = 'hop_nhan_chi_glb';
      g.add(h);
    },
  },
  hocQuay: {
    post(THREE, g, code) {   // biển "BÁNH MÌ" lên trước, sát mái; hốc tối không còn (sạp đã có bàn riêng)
      for (const n of ['bang', 'banh']) { const m = find(g, n, 'hoc_quay'); if (m) { m.scale.multiplyScalar(1.9); m.position.set(m.position.x * 1.9, 4.9, 2.85 + (n === 'banh' ? 0.1 : 0.0)); } }
    },
  },
  thungGau: {
    post(THREE, g) {   // thùng đã tách 2×2×2 (kit cũ 2.4; mép nắp loe ra làm hộp bao rộng hơn thân): dấu gấu thu 0.8, kéo vào mặt thùng (hộp bao tính theo mặt đứng nên mặt thùng nằm đúng ±1)
      for (const c of g.children) {
        if (c.name.includes('_gau_')) { c.position.set(c.position.x * 0.8, (c.position.y - 1) * 0.8 + 1, c.position.z - 0.18); c.scale.multiplyScalar(0.8); }
        if (c.name.endsWith('in_hong')) { c.position.x -= 0.18; c.scale.multiplyScalar(0.8); }
      }
    },
  },
  // bảng treo trước tiệm gấu: mặt bảng (Light Wood, x −0.48..1.2, y 1.9..3.26, mặt trước z −0.09 hướng +Z) nhận decal chữ của kit code (tuỳ model trước khi khớp → co theo model)
  bangTreo: {
    pre(THREE, model, code) {
      const kit = 'bang_hieu_treo', src = code.getObjectByName(kit + '_doc')?.children[0]; if (!src) return;
      const D = new THREE.Group(); D.name = kit + '_doc'; D.userData.vai = 'doc';
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(1.64, 1.32), src.material); pl.position.set(0.36, 2.58, -0.075); pl.name = kit + '_mat'; pl.castShadow = pl.receiveShadow = true;
      pl.userData.matKind = 'none'; pl.userData.matNguon = 'khai-bao'; D.add(pl); model.add(D);
    },
  },
  // cụm thùng: model là MỘT thùng 2.2³ → nhân bản đúng vị trí/cỡ/góc từng thùng của kit code (userData.dims/tam của nhóm '<kit>_thung<i>')
  cumThung: {
    post(THREE, g, code) {
      const w = g.children[0], cr = code.children.filter((c) => /_thung\d+$/.test(c.name) && c.userData.dims);
      if (!w || !cr.length) return;
      const D0 = w.userData.dimsGoc || [2.2, 2.2, 2.2];
      cr.forEach((c, i) => {
        const [cw, ch, cd] = c.userData.dims, [x, y, z] = c.userData.tam, k = i ? w.clone(true) : w;
        k.scale.set(cw / D0[0], ch / D0[1], cd / D0[2]); k.position.set(x, y - ch / 2, z); k.rotation.y = c.rotation.y; k.name = 'glb_thung' + i;
        if (i) g.add(k);
      });
    },
  },
  denCua: {
    post(THREE, g) { const w = g.children[0]; w.position.y += 4.51; },   // đèn lồng (cao 1.2, đỉnh xích = đỉnh model) treo dưới đầu tay đỡ (đáy tay y 5.71)
  },
  anhBa: {
    post(THREE, g) {   // chân dung bà phủ lên ô ảnh của khung (mặt trước nghiêng ngả ra sau ~20°; tâm mặt (0, 0.76, 0.115))
      const f = find(g, 'khung', 'anh_ba'); if (!f) return;
      f.position.set(0, 0.76, 0.12); f.rotation.x = -0.34; f.scale.setScalar(0.82); f.translateZ(-0.03);
    },
  },
  guong: {
    post(THREE, g) {   // ảnh phản chiếu dán lên mặt kính của model (z=+0.09, 3.48×6.12, y 0.44..6.56)
      const m = find(g, 'phan_chieu', 'guong'); if (!m) return;
      m.position.set(0, 3.5, 0.1); m.scale.set(3.4 / 2.3, 6.0 / 5.5, 1);
    },
  },
};

// bọc model thành Group gốc đáy-giữa: xoay theo basis → co theo dims → đáy y=0, tâm xz = at
function khop(THREE, model, cfg) {
  const holder = new THREE.Group(), inner = new THREE.Group();
  inner.add(model);
  if (cfg.basis) { const [bx, by, bz] = cfg.basis; inner.matrixAutoUpdate = false; inner.matrix.makeBasis(new THREE.Vector3(...bx), new THREE.Vector3(...by), new THREE.Vector3(...bz)); }
  holder.add(inner); holder.updateMatrixWorld(true);
  // thùng tách: hộp bao chỉ tính từ mặt ĐỨNG (|ny|<0.35) → nắp loe không làm thân thùng lệch/nhỏ đi
  const hop = (h) => {
    if (!cfg.tach) return new THREE.Box3().setFromObject(h);
    const b = new THREE.Box3(), v = new THREE.Vector3(), a = new THREE.Vector3(), c2 = new THREE.Vector3(), n = new THREE.Vector3();
    h.updateMatrixWorld(true);
    h.traverse((m) => { if (!m.isMesh) return; const P = m.geometry.attributes.position; for (let i = 0; i + 2 < P.count; i += 3) {
      const t = [0, 1, 2].map((k) => new THREE.Vector3().fromBufferAttribute(P, i + k).applyMatrix4(m.matrixWorld));
      n.crossVectors(a.subVectors(t[1], t[0]), c2.subVectors(t[2], t[0])); if (n.length() < 1e-9 || Math.abs(n.normalize().y) > 0.35) continue; for (const q of t) b.expandByPoint(v.copy(q)); } });
    return b;
  };
  const bb = hop(holder), sz = bb.getSize(new THREE.Vector3());
  if (cfg.dims) holder.scale.set(cfg.dims[0] / sz.x, cfg.dims[1] / sz.y, cfg.dims[2] / sz.z);
  holder.updateMatrixWorld(true);
  const b2 = hop(holder), c = b2.getCenter(new THREE.Vector3());
  const at = cfg.at || [0, 0];
  holder.position.set(at[0] - c.x, -b2.min.y, at[1] - c.z);
  const w = new THREE.Group(); w.name = 'glb_than'; w.add(holder);
  return w;
}

// code = nhóm kit dựng bằng code (bo(...).g). Trả nhóm MỚI cùng tên (GLB + lớp phủ giữ lại) hoặc null (tắt / kit không có model).
export function glbWrap(THREE, kit, code) {
  const cfg = GLB_KIT[kit];
  if (!cfg || !glbOn()) return null;
  let model = LIB.A.instance(cfg.id, { name: cfg.id.split('/')[1] });
  if (!model || !model.children.length) return null;
  if (cfg.tach || cfg.cat) model = locTam(THREE, model, { box: cfg.tach, cat: cfg.cat });
  if (cfg.tach) {   // thùng nằm xoay bừa trong đống → xoay cho mặt thùng song song trục (trung bình vòng của góc mặt đứng, chu kỳ 90°)
    let sc = 0, cc = 0;
    model.traverse((m) => { if (!m.isMesh) return; const P = m.geometry.attributes.position; for (let i = 0; i + 2 < P.count; i += 3) {
      const ax = P.getX(i + 1) - P.getX(i), ay = P.getY(i + 1) - P.getY(i), az = P.getZ(i + 1) - P.getZ(i), bx = P.getX(i + 2) - P.getX(i), by = P.getY(i + 2) - P.getY(i), bz = P.getZ(i + 2) - P.getZ(i);
      const nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx, ar = Math.hypot(nx, ny, nz);
      if (ar < 1e-9 || Math.abs(ny) / ar > 0.3) continue; const th = Math.atan2(nx, nz); sc += ar * Math.sin(4 * th); cc += ar * Math.cos(4 * th); } });
    model.rotation.y = -Math.atan2(sc, cc) / 4;
  }
  model.traverse((m) => {
    if (!m.isMesh) return;
    m.castShadow = true; m.receiveShadow = true; m.userData.matKind = 'none'; m.userData.grungeKind = 'none';
    if (cfg.sang) { m.material = m.material.clone(); if (m.material.map) m.material.color.setScalar(1 + cfg.sang * 6); else m.material.color.lerp(new THREE.Color(1, 1, 1), cfg.sang); }   // có ảnh màu: nhân sáng; màu phẳng: pha trắng
    if (cfg.da) { m.material = m.material.clone(); m.material.color.set(cfg.da); if (m.material.map) m.material.map = null; m.material.needsUpdate = true; }
  });
  const ex = EXT[cfg.ext];
  if (ex?.pre) ex.pre(THREE, model, code);
  const g = new THREE.Group(); g.name = code.name;
  const w = khop(THREE, model, cfg);
  g.add(w);
  if (cfg.haiBan) {   // một bàn chân → hai (gương theo x), cách nhau 2*haiBan
    const b = w.children[0]; b.position.x -= cfg.haiBan;
    const w2 = khop(THREE, model.clone(true), cfg); const h2 = w2.children[0]; h2.scale.x *= -1; h2.position.x = cfg.haiBan;
    w2.traverse((m) => { if (m.isMesh) { m.material = m.material.clone(); m.material.side = THREE.DoubleSide; } });
    g.add(w2);
  }
  const giu = (c) => { const r = c.name.startsWith(kit + '_') ? c.name.slice(kit.length + 1) : c.name; return cfg.keep.some((k) => r.startsWith(k)); };
  for (const c of [...code.children]) if (giu(c)) g.add(c);
  for (const n of cfg.drop || []) g.getObjectByName(n)?.removeFromParent();
  if (cfg.dyKeep) for (const c of g.children) if (c !== w) c.position.y += cfg.dyKeep;
  if (ex?.post) ex.post(THREE, g, code);
  g.userData.glb = cfg.id;
  return g;
}
