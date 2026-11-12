// Chọn mô hình theo loài + tư thế từ dữ liệu manifest (pose/anim), tất định theo thứ tự manifest.
const chuan = (s) => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();

// tieuChi: { loai?: từ khoá khớp id+title, pose?: đúng entry.pose, anim?: có trong entry.anim }
export function ungVien(manifest, { loai, pose, anim } = {}) {
  const k = loai ? chuan(loai) : null;
  return manifest.filter((e) => {
    if (k && !chuan(`${e.id} ${e.title ?? ''}`).includes(k)) return false;
    if (pose && e.pose !== pose) return false;
    if (anim && !(e.anim || []).includes(anim)) return false;
    return true;
  });
}

export function chonMoHinh(manifest, tieuChi) {
  return ungVien(manifest, tieuChi)[0] ?? null;
}
