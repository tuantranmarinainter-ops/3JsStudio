// NÉ TƯỜNG cho máy kiểu blocky (`cam.bk`, engine/blocky/may.js là hàm thuần không biết bối cảnh).
// Tia từ máy → tâm nhìn: chạm mặt lưới BỐI CẢNH quay về phía máy (tức vật che thấy được) → kéo máy vào, đặt trước mặt gần tâm nhìn nhất
// một khoảng `lui` (không bao giờ gần tâm nhìn hơn `min`). Mặt quay lưng về máy (tường cắt mặt cắt / culled) không tính là che.
// Không tính: nhân vật, đạo cụ (truyền vào `bo`), hạt (Points/Line/Sprite), trời/mây (tên), vật trong suốt (kính), vật ẩn, userData.khongChan.
// TẤT ĐỊNH: chỉ đọc hình học bối cảnh ở khung hiện tại (gọi sau envs.use + updateMatrixWorld) — không nhớ gì của khung trước.
// Không giật giữa shot: engine/shots.js lấy 9 mẫu máy dọc cả shot, kéo mọi khung theo CÙNG tỉ lệ nhỏ nhất (tiLeNe).
// Ô FX 'neTuong' (engine/post.js) MẶC ĐỊNH TẮT: bật trên ep003b đổi 9 shot đã duyệt (h06, h31–h36, d4_06, d5_14). Tắt = máy blocky y như cũ.
// Theo shot: bk.neTuong: false = bỏ qua; bk.neBan = bán kính vật sát chủ thể không né (mặc định 2.5 stud).

const BO_TEN = /sky|cloud|troi|horizon|vong_?bao|glass|(^|_)kinh($|_)/i;   // trời, chân trời, kính (gương/cửa kính nhìn xuyên)

/** Phần thuần (chạy trong node test; lui = cách mặt che, min = gần tâm nhất, ban = bán kính mặt chủ thể quanh tâm): D = khoảng máy↔tâm nhìn; tuMay = khoảng từ MÁY tới các mặt che thấy được (tia máy→tâm);
 *  tuTam = khoảng từ TÂM NHÌN tới các mặt quay về tâm (tia tâm→máy). Trả khoảng mới từ tâm nhìn tới máy, hoặc null = không bị che. */
export function khoangNe(D, tuMay, tuTam = [], { lui = 0.35, min = 0.6, ban = 2.5 } = {}) {
  const che = tuMay.filter((x) => x > 1e-4 && x < D - ban);   // mặt cách tâm < ban = chủ thể / vật sát chủ thể (mặt thùng, chăn trên giường, lan can ngay trước mặt) — một phần cảnh, không né
  if (!che.length) return null;
  let gan = D;   // mặt gần tâm nhìn nhất trên đoạn (của cả hai chiều: lấy luôn mặt trong của tường dày)
  for (const x of che) gan = Math.min(gan, D - x);
  for (const x of tuTam) if (x > ban && x < D) gan = Math.min(gan, x);
  const d = Math.max(Math.min(min, D), gan - lui);
  return d < D - 1e-4 ? d : null;
}

/** THREE = module three. Trả ne(pos, tam, root, bo) → { pos, D, d, che } | null (null = không bị che, giữ nguyên máy).
 *  tam = CHỦ THỂ (tâm nhìn trước khi lệch `bk.look`): máy kéo vào dọc đường máy→chủ thể, hướng nhìn giữ như cũ. */
export function taoNeTuong(THREE) {
  const rc = new THREE.Raycaster();
  const o = new THREE.Vector3(), dir = new THREE.Vector3();
  const anHoacBo = (obj, bo) => {
    for (let p = obj; p; p = p.parent) { if (!p.visible || bo.has(p) || p.userData?.khongChan) return true; }
    return false;
  };
  const lay = (hit, bo) => {
    const ob = hit.object;
    if (!ob.isMesh || ob.isSprite || BO_TEN.test(ob.name || '')) return false;
    const m = Array.isArray(ob.material) ? ob.material[hit.face?.materialIndex ?? 0] : ob.material;
    if (!m || m.visible === false || m.colorWrite === false || (m.transparent && (m.opacity ?? 1) < 0.6) || m.transmission > 0.5) return false;
    return !anHoacBo(ob, bo);
  };
  // Raycaster của three xét mặt trước theo thứ tự đỉnh CỤC BỘ; vật lật gương (định thức ma trận < 0, vd. latX) thì khi vẽ mặt trước đảo ngược
  // → tự phân loại: mỗi hit trả { x: khoảng từ gốc tia, thay: mặt này máy NHÌN THẤY được (quay về máy khi vẽ) }.
  const _d = new THREE.Matrix4();
  function chieu(from, to, root, bo, D, tuMay) {
    o.set(from[0], from[1], from[2]); dir.set(to[0] - from[0], to[1] - from[1], to[2] - from[2]).normalize();
    rc.set(o, dir); rc.near = 0; rc.far = D;
    const H = rc.intersectObject(root, true).filter((h) => lay(h, bo));
    chieu.vat = null;
    return H.map((h) => {
      const m = Array.isArray(h.object.material) ? h.object.material[h.face?.materialIndex ?? 0] : h.object.material;
      const lat = h.object.matrixWorld.determinant() < 0;
      // tia trúng mặt có thứ tự đỉnh quay về gốc tia (FrontSide) hoặc ngược (BackSide); DoubleSide: luôn thấy
      const quayVeGoc = m.side === THREE.BackSide ? lat : !lat;   // mặt VẼ RA quay về gốc tia?
      const thay = m.side === THREE.DoubleSide || (tuMay ? quayVeGoc : !quayVeGoc);
      if (thay && !chieu.vat) chieu.vat = h.object;
      return { x: h.distance, thay };
    });
  }
  return function ne(pos, look, root, bo = new Set(), opt = {}) {
    if (!root) return null;
    rc.camera = opt.camera || null;   // Sprite.raycast cần camera (hit sprite vẫn bị loại ở lay)
    const D = Math.hypot(pos[0] - look[0], pos[1] - look[1], pos[2] - look[2]);
    if (D < 1e-3) return null;
    root.updateMatrixWorld(true);
    const A = chieu(pos, look, root, bo, D, true), vatA = chieu.vat;
    const B = chieu(look, pos, root, bo, D, false), vatB = chieu.vat;
    const tuMay = [...A.filter((h) => h.thay).map((h) => h.x), ...B.filter((h) => h.thay).map((h) => D - h.x)];   // mặt che máy thấy được (khoảng từ máy)
    if (!tuMay.length) return null;
    const vat = vatA || vatB;
    const d = khoangNe(D, tuMay, [...A.map((h) => D - h.x), ...B.map((h) => h.x)], opt);   // mọi mặt (cả hai phía) → mặt trong của tường dày
    if (d == null) return null;
    const k = d / D;
    const p = [look[0] + (pos[0] - look[0]) * k, look[1] + (pos[1] - look[1]) * k, look[2] + (pos[2] - look[2]) * k];
    const ten = []; for (let q = vat; q && ten.length < 3; q = q.parent) if (q.name) ten.push(q.name);
    const ban = opt.ban ?? 2.5;
    return { pos: p, D, d, che: chieu(p, look, root, bo, d, true).filter((h) => h.thay && h.x < d - ban).length + chieu(look, p, root, bo, d, false).filter((h) => h.thay && h.x > ban).length, vat: ten.join(' < ') };   // che = số mặt còn che sau khi kéo (phải = 0); vat = vật che gần máy nhất
  };
}

/** Tỉ lệ kéo theo thời gian, không giật: mau = máy ở n mốc ĐỀU dọc shot [{ pos, tam }]; u = tiến độ khung (0..1).
 *  r_i = tỉ lệ ở mốc i (1 = không che) → lấy min với hai mốc kề (kéo bắt đầu trước khi vật che vào khung) → nội suy tuyến tính theo u. */
export function tiLeNe(ne, mau, root, bo, opt, u = 0) {
  const r = mau.map((m) => { const N = ne(m.pos, m.tam, root, bo, opt); return N ? { r: N.d / N.D, vat: N.vat } : { r: 1, vat: '' }; });
  const rr = r.map((x, i) => Math.min(x.r, r[i - 1]?.r ?? 1, r[i + 1]?.r ?? 1));
  const n = rr.length - 1, f = Math.min(n, Math.max(0, u * n)), i0 = Math.floor(f), i1 = Math.min(n, i0 + 1);
  const ri = rr[i0] + (rr[i1] - rr[i0]) * (f - i0);
  let vat = ''; for (const x of r) if (x.r < 1 && !vat) vat = x.vat;
  return { r: ri, vat };
}
