// Cách sửa shot cho vòng tự sửa (tools/ra-loi.mjs). Mỗi cách: (shotDong, ketQua, ng) -> { patch, moTa } | null.
//   shotDong = shot thô trong shots.js (+ trường tạm _dur, _type, _vong do ra-loi gắn; test có thể bỏ qua)
//   ketQua   = luat[Lx] trong luat.json ({ ok, val, nguong, ghiChu })      ng = ngưỡng cả tập (tools/kiem/luat.mjs nguong())
//   patch    = { khoá: giá trị }; giá trị là object thường thì GỘP nông vào object cũ (xem apPatch), còn lại thay hẳn.
// Trả null = cách này không sửa được (không ném lỗi): thiếu cam.dist, loại shot lạ, type null...
// L5, L9, L12, thiếu mô hình/animation, kịch bản mâu thuẫn, --det lỗi: KHÔNG có trong CACH_SUA -> gọi người dùng.

const num = (x) => typeof x === 'number' && Number.isFinite(x);
const r3 = (x) => Math.round(x * 1000) / 1000;
const camCua = (sd) => (sd && sd.cam && typeof sd.cam === 'object' && !Array.isArray(sd.cam) ? sd.cam : null);
const loaiCua = (sd) => sd._type ?? sd.type ?? sd.shotType ?? null;
const durCua = (sd) => (num(sd._dur) ? sd._dur : num(sd.dur) ? sd.dur : Array.isArray(sd.f) ? (sd.f[1] - sd.f[0] + 1) / 30 : 0);
const vongCua = (sd) => (num(sd._vong) ? sd._vong : 1);
const khongPhai = (kq) => !kq || kq.skip;

// gộp patch vào shot -> { khoá: giá trị đầy đủ mới } (chỉ các khoá có trong patch)
export function apPatch(sd, patch) {
  const out = {};
  for (const [k, v] of Object.entries(patch || {})) {
    const cu = sd[k];
    const thuong = (x) => x && typeof x === 'object' && !Array.isArray(x);
    out[k] = thuong(v) && thuong(cu) ? { ...cu, ...v } : v;
  }
  return out;
}
// gộp 2 patch (patch sau đè khoá của patch trước; object thường gộp nông)
export function gopPatch(a, b) {
  const out = { ...a };
  const thuong = (x) => x && typeof x === 'object' && !Array.isArray(x);
  for (const [k, v] of Object.entries(b || {})) out[k] = thuong(v) && thuong(out[k]) ? { ...out[k], ...v } : v;
  return out;
}

// ---- L1, L3, L10: lùi camera (giữ nguyên chiều zoom: nhân cả dist và dist2) ----
export function luiCamera(sd, kq) {
  if (khongPhai(kq)) return null;
  const c = camCua(sd);
  const k = 1.25;
  if (c && num(c.dist) && c.dist > 0) {
    const cam = { dist: r3(c.dist * k) };
    if (num(c.dist2)) cam.dist2 = r3(c.dist2 * k);
    return { patch: { cam }, moTa: `lui camera x${k}: dist ${c.dist} -> ${cam.dist}${cam.dist2 !== undefined ? `, dist2 ${c.dist2} -> ${cam.dist2}` : ''}` };
  }
  if (['houseFull', 'sinkTilt'].includes(loaiCua(sd)) && num(sd.fov) && sd.fov > 0 && sd.fov < 70) {
    const fov = r3(Math.min(80, sd.fov * 1.12));
    return { patch: { fov }, moTa: `mo fov ${sd.fov} -> ${fov} (loai ${loaiCua(sd)})` };
  }
  return null;
}

// ---- L1: nhà chạm lề trên/dưới -> dời điểm nhìn (cần cam.look dạng mảng) ----
export function canGiua(sd, kq) {
  if (khongPhai(kq)) return null;
  const c = camCua(sd);
  const canh = kq.val && kq.val.canh;
  if (!c || !Array.isArray(c.look) || c.look.length < 3 || !c.look.every(num)) return null;
  if (canh !== 'tren' && canh !== 'duoi') return null;
  const d = canh === 'tren' ? 3 : -3;
  const look = [c.look[0], r3(c.look[1] + d), c.look[2]];
  return { patch: { cam: { look } }, moTa: `can giua: nha cham le ${canh}, look.y ${c.look[1]} -> ${look[1]}` };
}

// ---- L2: vật cần đọc lệch tâm / quá rộng ----
export function canGiuaVatDoc(sd, kq, ng) {
  if (khongPhai(kq) || !kq.val) return null;
  const t = (ng && ng.L2) || kq.nguong || {};
  const c = camCua(sd);
  const patch = {}, mo = [];
  const lechTam = num(t.lechTam) ? t.lechTam : 0.10;
  if (num(kq.val.lech) && kq.val.lech >= lechTam && num(kq.val.dx) && num(kq.val.dy) && c && Array.isArray(c.look) && c.look.length >= 3 && c.look.every(num)) {
    const W = (num(sd.w) && sd.w > 0 ? sd.w : 2.6) / (num(sd.fill) && sd.fill > 0 ? sd.fill : 0.6);
    const yaw = num(c.yaw) ? c.yaw : 0;
    const look = [r3(c.look[0] + kq.val.dx * W * Math.cos(yaw)), r3(c.look[1] - kq.val.dy * W * 16 / 9), r3(c.look[2] - kq.val.dx * W * Math.sin(yaw))];
    patch.cam = { look };
    mo.push(`dich diem nhin ve tam vat doc (dx ${kq.val.dx}, dy ${kq.val.dy})`);
  }
  const rongMax = num(t.rongMax) ? t.rongMax : 0.90;
  if (num(kq.val.rong) && kq.val.rong > rongMax && loaiCua(sd) === 'insertRead') {
    patch.fill = r3((num(sd.fill) && sd.fill > 0 ? sd.fill : 0.6) * 0.8);
    mo.push(`giam fill -> ${patch.fill}`);
  }
  return mo.length ? { patch, moTa: mo.join('; ') } : null;
}

// ---- L2, L3: mặt/vật bị che -> xoay góc (vòng 1 sang một phía, vòng 2 sang phía kia) ----
export function doiGocTranhChe(sd, kq, ng) {
  if (khongPhai(kq) || !kq.val) return null;
  const c = camCua(sd);
  if (!c || !num(c.yaw)) return null;
  const t2 = (ng && ng.L2) || {}, t3 = (ng && ng.L3) || {};
  const che2 = num(kq.val.che) && kq.val.che >= (num(t2.cheMax) ? t2.cheMax : 0.05);
  const che3 = num(kq.val.cheMat) && kq.val.cheMat > (num(t3.cheMatMax) ? t3.cheMatMax : 0.2);
  if (!che2 && !che3) return null;
  const d = vongCua(sd) <= 1 ? 0.3 : -0.6;
  const cam = { yaw: r3(c.yaw + d) };
  if (num(c.yaw2)) cam.yaw2 = r3(c.yaw2 + d);
  return { patch: { cam }, moTa: `doi goc tranh che: yaw ${c.yaw} -> ${cam.yaw}` };
}

// ---- L2: dời vật chắn — cần biết vật nào chắn, luat.json không ghi -> chưa tự làm được ----
export function doiVatChan() { return null; }

// ---- L4: thêm zoom (1 người -> vào, từ 2 người hoặc vật lớn/nhà -> ra) ----
const LOAI_RA = new Set(['crowd', 'establish', 'houseFull', 'sinkTilt', 'dialogue', 'overShoulder', 'chase', 'reveal', 'walkBy', 'follow']);
export function themZoom(sd, kq) {
  if (khongPhai(kq) || sd.static === true) return null;
  const loai = loaiCua(sd);
  const ra = LOAI_RA.has(loai) || Boolean(sd.house) || Boolean(sd.with);
  const c = camCua(sd);
  if (c && num(c.dist) && c.dist > 0) {
    const huong = ra ? 1 : -1;
    const roi = num(c.dist2) && Math.abs(c.dist2 - c.dist) / c.dist >= 0.05;
    let dist2;
    if (roi) {
      if (Math.sign(c.dist2 - c.dist) !== huong) return null;      // đã zoom ngược luật: không tự đảo hướng
      dist2 = c.dist + (c.dist2 - c.dist) * 1.6;
    } else dist2 = c.dist * (ra ? 1.3 : 0.72);
    dist2 = r3(dist2);
    return { patch: { cam: { dist2 } }, moTa: `them zoom ${ra ? 'ra' : 'vao'}: dist2 ${c.dist2 ?? '-'} -> ${dist2}` };
  }
  if (!c && loai && !(typeof sd.move === 'string' && sd.move !== 'static')) {
    return { patch: { move: ra ? 'pull' : 'push' }, moTa: `them move ${ra ? 'pull' : 'push'} (loai ${loai})` };
  }
  return null;
}

// ---- L6: thiếu bụi ở chân nhà chạm đất ----
const CHAN = { F: 14, B: -14, R: 24, L: -24 };
export function batHat(sd, kq) {
  if (khongPhai(kq) || !kq.val || !Array.isArray(kq.val.thieu)) return null;
  const h = sd.house && typeof sd.house === 'object' ? (Array.isArray(sd.house.to) ? sd.house.to : sd.house.at) : null;
  const goc = Array.isArray(h) && h.length >= 2 && num(h[0]) && num(h[1]) ? [h[0], h[1]] : [0, 0];
  const t0 = r3(Math.max(0, durCua(sd) / 2 - 0.2));
  const moi = [];
  for (const ten of kq.val.thieu) {
    const m = /leg_([FB])([RL])/i.exec(String(ten));
    if (!m) continue;
    moi.push({ at: [r3(goc[0] + CHAN[m[2].toUpperCase()]), 0, r3(goc[1] + CHAN[m[1].toUpperCase()])], t0, tone: 0.5 });
  }
  if (!moi.length) return null;     // hat.tuyet / hat.mua / chân người: do env, không sửa bằng dữ liệu shot
  const cu = sd.fx && Array.isArray(sd.fx.dust) ? sd.fx.dust : [];
  const trung = (a, b) => a.at.every((v, i) => Math.abs(v - b.at[i]) < 0.01) && Math.abs(a.t0 - b.t0) < 0.01;
  const them = moi.filter((x) => !cu.some((c) => c && Array.isArray(c.at) && trung(x, c)));
  if (!them.length) return null;
  return { patch: { fx: { dust: [...cu, ...them] } }, moTa: `them ${them.length} dam bui o chan nha (t0 ${t0})` };
}

// ---- L7: cảnh đêm ----
export function themDiemSang(sd, kq, ng) {
  if (khongPhai(kq) || !kq.val || !num(kq.val.diemSang)) return null;
  const min = ng && ng.L7 && num(ng.L7.diemSangMin) ? ng.L7.diemSangMin : 3;
  if (kq.val.diemSang >= min) return null;
  const lo = sd.lightOverride && typeof sd.lightOverride === 'object' ? sd.lightOverride : {};
  const cu = Array.isArray(lo.sun) && num(lo.sun[1]) ? lo.sun : null;
  const sun = cu ? [cu[0], r3(cu[1] + 0.8)] : ['#ffe9b0', 2.6];
  return { patch: { lightOverride: { sun } }, moTa: `them diem sang: lightOverride.sun ${JSON.stringify(sun)}` };
}
export function nangPhoiSang(sd, kq, ng) {
  if (khongPhai(kq) || !kq.val || !num(kq.val.tyLeToi)) return null;
  const max = ng && ng.L7 && num(ng.L7.toiMax) ? ng.L7.toiMax : 0.55;
  if (kq.val.tyLeToi < max) return null;
  const lo = sd.lightOverride && typeof sd.lightOverride === 'object' ? sd.lightOverride : {};
  const cu = num(lo.exposure) ? lo.exposure : 1.05;
  const exposure = r3(Math.min(1.6, cu * 1.2));
  if (exposure <= cu) return null;
  return { patch: { lightOverride: { exposure } }, moTa: `nang phoi sang: exposure ${cu} -> ${exposure}` };
}

// ---- L8: thêm đồ phụ theo tầng — tầng do env gắn (engine/envs/<tên>.js), không có cách sửa bằng dữ liệu shot ----
export function themDoPhuTheoTang() { return null; }

// ---- L10: xoay góc cho bóng dáng rõ hơn ----
export function xoayGoc(sd, kq) {
  if (khongPhai(kq)) return null;
  const c = camCua(sd);
  if (!c || !num(c.yaw)) return null;
  const d = vongCua(sd) <= 1 ? 0.35 : -0.7;
  const cam = { yaw: r3(c.yaw + d) };
  if (num(c.yaw2)) cam.yaw2 = r3(c.yaw2 + d);
  return { patch: { cam }, moTa: `xoay goc: yaw ${c.yaw} -> ${cam.yaw}` };
}

// ---- L11: kéo dài shot tới ngưỡng. Shot khai bằng f:[a,b] (khung tuyệt đối, liền nhau) không kéo được ----
export function keoDaiShot(sd, kq) {
  if (khongPhai(kq) || !num(kq.nguong) || !num(sd.dur)) return null;
  if (sd.dur >= kq.nguong) return null;
  return { patch: { dur: r3(kq.nguong) }, moTa: `keo dai shot: dur ${sd.dur} -> ${r3(kq.nguong)} (tong thoi luong tang ${r3(kq.nguong - sd.dur)} s)` };
}

export const CACH_SUA = {
  L1: [luiCamera, canGiua],
  L2: [canGiuaVatDoc, doiGocTranhChe, doiVatChan],
  L3: [luiCamera, doiGocTranhChe],
  L4: [themZoom],
  L6: [batHat],
  L7: [themDiemSang, nangPhoiSang],
  L8: [themDoPhuTheoTang],
  L10: [luiCamera, xoayGoc],
  L11: [keoDaiShot],
};
