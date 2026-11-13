// dat-may.js — BỘ ĐẶT MÁY THEO KHUNG HÌNH: từ đặc tả khung (nhắm ai/bộ phận nào, chiếm bao nhiêu % khung, nằm ở đâu trên khung,
// máy lệch bao nhiêu độ so với hướng mặt, cao/thấp, tiêu cự) → vị trí máy, điểm nhìn, góc nhìn. Công thức ĐÓNG, hàm thuần (không lặp, không ngẫu nhiên).
//
// Shot ghi:  cam: { khung: { nham: 'hero', bo: 'mat', pct: 30, x: 50, y: 40, ngang: -10, cao: 0, mm: 50 } }
//   nham   tên diễn viên (episode.actors) | tên đạo cụ (episode.props) | [x, y, z] điểm thế giới
//   bo     bộ phận làm ĐIỂM ĐẶT: mat | dau | than | toan_than | tay_phai | tay_trai | hai_tay | chan   (đạo cụ: bỏ trống = tâm vật)
//   pct    đoạn đo (mặc định chính `bo`; đổi bằng `do: 'dau'`) chiếm bao nhiêu % CHIỀU CAO khung. mat/dau = chiều cao đầu (cằm → đỉnh đầu).
//   x, y   điểm đặt nằm ở đâu trên khung, % từ mép TRÁI và mép TRÊN (mặc định 50, 50)
//   ngang  độ; 0 = máy chính diện, 90 = ngang, 180 = sau lưng; DƯƠNG = máy ở phía tay TRÁI của nhân vật (trên khung nhân vật quay mặt về bên TRÁI)
//          `tuyetDoi: true` → đo từ hướng +Z thế giới thay vì hướng mặt
//   cao    độ; 0 = trục máy nằm ngang; DƯƠNG = máy cao hơn, chúc xuống; ÂM = máy thấp, ngước lên
//   mm     tiêu cự full-frame (khung DỌC: cạnh dài cảm biến 36 mm nằm theo chiều cao → fov dọc = 2·atan(18/mm)); hoặc ghi thẳng `fov` (độ)
//   nghieng độ nghiêng đường chân trời
//   Chuyển động trong shot: thêm hậu tố 2 cho giá trị cuối (pct2, x2, y2, ngang2, cao2, mm2) — nội suy theo k của shot.
// Trục máy luôn giữ đúng góc `ngang`/`cao` (phối cảnh hậu cảnh đúng như đặc tả); muốn chủ thể lệch tâm thì máy TỊNH TIẾN ngang/dọc, không xoay.
export const CAM_BIEN_MM = 36;
export const fovTuMm = (mm, canh = CAM_BIEN_MM) => (2 * Math.atan(canh / 2 / mm) * 180) / Math.PI;
const RAD = Math.PI / 180;
const lerp = (a, b, k) => (b === undefined ? a : a + (b - a) * k);

// ---- lõi toán (không cần three.js): T = điểm đặt, H = chiều cao đoạn đo (đơn vị cảnh), F = hướng mặt [x, z] đã chuẩn hoá ----
export function tinhMay({ T, H, F = [0, 1], pct, x = 50, y = 50, ngang = 0, cao = 0, fov = 40, aspect = 9 / 16 }) {
  const a = ngang * RAD, e = cao * RAD, tv = Math.tan((fov * RAD) / 2), th = tv * aspect;
  // hướng từ chủ thể về phía máy (trục máy ngược lại): quay F quanh Y một góc `ngang`, rồi nâng `cao`
  const hx = F[0] * Math.cos(a) + F[1] * Math.sin(a), hz = -F[0] * Math.sin(a) + F[1] * Math.cos(a);
  const dir = [hx * Math.cos(e), Math.sin(e), hz * Math.cos(e)];
  const d = H / (2 * tv * Math.max(pct, 0.5) / 100);            // khoảng cách theo trục máy để đoạn H chiếm pct% chiều cao khung
  // cơ sở máy: f = −dir (nhìn về chủ thể), r = f × Y, u = r × f
  const f = [-dir[0], -dir[1], -dir[2]];
  let r = [f[1] * 0 - f[2] * 1, f[2] * 0 - f[0] * 0, f[0] * 1 - f[1] * 0];   // f × (0,1,0) = (−f.z, 0, f.x)
  r = [-f[2], 0, f[0]]; const rl = Math.hypot(r[0], r[2]) || 1; r = [r[0] / rl, 0, r[2] / rl];
  const u = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]];
  const nx = x / 50 - 1, ny = 1 - y / 50;                          // NDC mong muốn của điểm đặt
  const ox = nx * th * d, oy = ny * tv * d;                          // điểm đặt lệch tâm → máy tịnh tiến ngược lại
  const p = [T[0] + dir[0] * d - r[0] * ox - u[0] * oy, T[1] + dir[1] * d - r[1] * ox - u[1] * oy, T[2] + dir[2] * d - r[2] * ox - u[2] * oy];
  const l = [p[0] + f[0] * d, p[1] + f[1] * d, p[2] + f[2] * d];
  return { p, l, fov, d };
}
// chiếu một điểm thế giới lên khung (%, từ trái/trên) với máy (p, l, fov) — dùng để KIỂM bằng số
export function chieu(P, { p, l, fov, aspect = 9 / 16 }) {
  let f = [l[0] - p[0], l[1] - p[1], l[2] - p[2]]; const fl = Math.hypot(...f) || 1; f = f.map((v) => v / fl);
  let r = [-f[2], 0, f[0]]; const rl = Math.hypot(r[0], r[2]) || 1; r = [r[0] / rl, 0, r[2] / rl];
  const u = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]];
  const v = [P[0] - p[0], P[1] - p[1], P[2] - p[2]], zc = v[0] * f[0] + v[1] * f[1] + v[2] * f[2];
  const tv = Math.tan((fov * RAD) / 2), xc = v[0] * r[0] + v[2] * r[2], yc = v[0] * u[0] + v[1] * u[1] + v[2] * u[2];
  return { x: (xc / (zc * tv * aspect) + 1) * 50, y: (1 - yc / (zc * tv)) * 50, sau: zc };
}

// ---- nối với cảnh three.js: lấy điểm đặt / kích thước / hướng mặt từ diễn viên, đạo cụ ----
export function createDatMay(THREE) {
  const _v = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _b = new THREE.Box3(), _b2 = new THREE.Box3();
  const wpos = (o, loc = [0, 0, 0]) => { _v.set(...loc); o.localToWorld(_v); return [_v.x, _v.y, _v.z]; };
  const wscale = (o) => { o.matrixWorld.decompose(_v, _q, _s); return _s.y; };
  // hộp bao phần ĐANG HIỆN của diễn viên (bỏ lưới ẩn: gấu khối nằm ẩn dưới gấu GLB…) — đo lại mỗi lần vì cỡ/tư thế đổi theo shot
  const hop = (a) => { _b.makeEmpty(); a.root.traverse((m) => { if (!m.isMesh) return; for (let p = m; p && p !== a.root.parent; p = p.parent) if (p.visible === false) return; if (m.isSkinnedMesh && m.skeleton) { for (const bn of m.skeleton.bones) { bn.getWorldPosition(_v); _b.expandByPoint(_v); } return; }   // lưới có xương: hộp bao hình học không theo tư thế → đo theo khớp xương
      _b2.setFromObject(m); if (!_b2.isEmpty()) _b.union(_b2); });
    if (!_b.isEmpty()) { const pad = (_b.max.y - _b.min.y) * 0.06; _b.min.y -= pad * 0.3; _b.max.y += pad; }
    if (_b.isEmpty()) _b.setFromObject(a.root); return { y0: _b.min.y, y1: _b.max.y, x: (_b.min.x + _b.max.x) / 2, z: (_b.min.z + _b.max.z) / 2 }; };
  const caoThan = (a) => { const h = hop(a); return Math.max(0.5, h.y1 - h.y0); };
  // điểm neo của diễn viên: { tam: [x,y,z] thế giới, cao: chiều cao đoạn }
  function neo(a, bo = 'mat') {
    a.root.updateWorldMatrix(true, true);
    const P = a.parts || {}, K = a.khung || {};
    if (K[bo]) { const o = P[K[bo].phan] || a.root; return { tam: wpos(o, K[bo].tam), cao: K[bo].cao * wscale(o) }; }
    const head = P.head || P.Head, H = caoThan(a), gau = !!a.root.userData?.bear || /bear|gau|bap/i.test(a.root.name || '');
    const tay = (k) => (P[k] ? wpos(P[k], a.handGrip || [0, -0.2, 0]) : null);
    if (bo === 'tay_phai' || bo === 'tay_trai') { const t = tay(bo === 'tay_phai' ? 'rightHand' : 'leftHand'); if (t) return { tam: t, cao: 0.19 * H }; }
    if (bo === 'hai_tay') { const A = tay('rightHand'), B = tay('leftHand'); if (A && B) return { tam: A.map((v, i) => (v + B[i]) / 2), cao: 0.19 * H }; }
    if (bo === 'toan_than') return { tam: wpos(a.root, [0, H / 2 / (wscale(a.root) || 1), 0]), cao: H };
    if (bo === 'than') { const o = P.torso || P.UpperTorso; if (o) return { tam: wpos(o, [0, 0.6, 0]), cao: 0.38 * H }; }
    if (bo === 'chan') return { tam: wpos(a.root, [0, 0.19 * H / (wscale(a.root) || 1), 0]), cao: 0.38 * H };
    // mat / dau
    const kDau = gau ? 0.33 : 0.25;   // ước lượng khi diễn viên không khai số đo (a.khung): đầu gấu ~1/3, người ~1/4 chiều cao
    if (gau || !(head && a.headCenter)) { const h = hop(a), Hh = Math.max(0.5, h.y1 - h.y0); return { tam: [h.x, h.y1 - (gau ? 0.26 : kDau / 2) * Hh, h.z], cao: kDau * Hh }; }   // gấu: tai nhô ~9 % phía trên đầu
    if (head && a.headCenter) return { tam: wpos(head, bo === 'mat' && a.faceCenter ? [0, a.faceCenter[1], 0] : a.headCenter), cao: kDau * H };
    return { tam: wpos(a.root, [0, (1 - kDau / 2) * H / (wscale(a.root) || 1), 0]), cao: kDau * H };
  }
  const huong = (o) => { o.getWorldQuaternion(_q); _v.set(0, 0, 1).applyQuaternion(_q); const l = Math.hypot(_v.x, _v.z); return l > 1e-3 ? [_v.x / l, _v.z / l] : [0, 1]; };

  // spec + trạng thái cảnh (diễn viên/đạo cụ ĐÃ đặt cho khung này) → { p, l, fov, roll, T, H }; không tìm thấy chủ thể → null
  function giai(spec, { actors = {}, props = {}, k = 0, aspect = 9 / 16 } = {}) {
    let T, H, F = [0, 1];
    const n = spec.nham;
    if (Array.isArray(n)) { T = n; H = spec.caoDoan ?? 1; }
    else if (actors[n]) { const a = actors[n], A = neo(a, spec.bo || 'mat'); T = A.tam; H = spec.do && spec.do !== spec.bo ? neo(a, spec.do).cao : A.cao; F = huong(a.root); }
    else if (props[n]) { const o = props[n]; o.updateWorldMatrix(true, true); _b.setFromObject(o); if (_b.isEmpty()) return null; T = [(_b.min.x + _b.max.x) / 2, (_b.min.y + _b.max.y) / 2, (_b.min.z + _b.max.z) / 2]; H = Math.max(0.05, _b.max.y - _b.min.y); F = huong(o); }
    else return null;
    if (spec.tuyetDoi) F = [0, 1];
    if (spec.dich) T = [T[0] + spec.dich[0], T[1] + spec.dich[1], T[2] + spec.dich[2]];
    const mm = lerp(spec.mm, spec.mm2, k), fov = spec.fov !== undefined ? lerp(spec.fov, spec.fov2, k) : fovTuMm(mm || 50);
    const r = tinhMay({ T, H, F, aspect, fov, pct: lerp(spec.pct ?? 30, spec.pct2, k), x: lerp(spec.x ?? 50, spec.x2, k), y: lerp(spec.y ?? 50, spec.y2, k),
      ngang: lerp(spec.ngang ?? 0, spec.ngang2, k), cao: lerp(spec.cao ?? 0, spec.cao2, k) });
    return { ...r, roll: (lerp(spec.nghieng ?? 0, spec.nghieng2, k)) * RAD, T, H };
  }
  // KIỂM bằng số (gọi khi cần, không gọi mỗi khung): điểm đặt ra đâu trên khung, đoạn đo chiếm bao nhiêu %, có vật chắn giữa máy và điểm đặt không
  function kiem(R, { scene, camera = null, aspect = 9 / 16, cuaAi = null } = {}) {
    const c = chieu(R.T, { ...R, aspect }), a = chieu([R.T[0], R.T[1] + R.H / 2, R.T[2]], { ...R, aspect }), b = chieu([R.T[0], R.T[1] - R.H / 2, R.T[2]], { ...R, aspect });
    const out = { x: +c.x.toFixed(1), y: +c.y.toFixed(1), pct: +Math.abs(b.y - a.y).toFixed(1), mayY: +R.p[1].toFixed(2), chan: null, chanCach: null };
    if (scene) {
      const o = new THREE.Vector3(...R.p), t = new THREE.Vector3(...R.T), dv = t.clone().sub(o), dist = dv.length();
      const rc = new THREE.Raycaster(o, dv.normalize(), 0.02, dist - 0.05); if (camera) rc.camera = camera;   // Sprite cần camera để bắn tia
      const hien = (m) => { for (let p = m; p; p = p.parent) if (p.visible === false) return false; return true; };   // bối cảnh khác đang ẩn không tính
      const thuoc = (m) => { for (let p = m; p; p = p.parent) if (p === cuaAi) return true; return false; };
      const hit = rc.intersectObjects(scene.children, true).find((h) => hien(h.object) && h.object.isMesh && !/sky|troi|cloud|may_/i.test(h.object.name) && !(cuaAi && thuoc(h.object)) && (h.object.material?.opacity ?? 1) > 0.3 && !h.object.material?.transparent);
      if (hit) { let nm = hit.object.name; for (let p = hit.object.parent; p && !nm; p = p.parent) nm = p.name; out.chan = nm || '(không tên)'; out.chanCach = +hit.distance.toFixed(2); }
    }
    return out;
  }
  return { giai, kiem, neo };
}
