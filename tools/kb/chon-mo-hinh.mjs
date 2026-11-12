// Chọn mô hình theo loài + tư thế từ dữ liệu manifest (pose/anim), tất định theo thứ tự manifest.
import { tuCua } from '../kiem/pose.mjs';
const bo = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
const dsPose = (e) => (Array.isArray(e.pose) ? e.pose : e.pose ? [e.pose] : []);

// tieuChi: { loai?: từ khoá (khớp theo TỪ trên id+title), pose?: nằm trong entry.pose, anim?: có trong entry.anim }
// Nhiều ứng viên: entry ít tư thế hơn (chuyên hơn) trước, hoà thì theo thứ tự manifest.
export function ungVien(manifest, { loai, pose, anim } = {}) {
  const k = loai ? tuCua(bo(loai)) : null;
  return manifest.map((e, i) => ({ e, i }))
    .filter(({ e }) => {
      if (k) {
        const w = tuCua(bo(`${e.id} ${e.title ?? ''}`));
        if (!k.every((x) => w.includes(x))) return false;
      }
      if (pose && !dsPose(e).includes(pose)) return false;
      if (anim && !(e.anim || []).includes(anim)) return false;
      return true;
    })
    .sort((a, b) => (dsPose(a.e).length || 99) - (dsPose(b.e).length || 99) || a.i - b.i)
    .map(({ e }) => e);
}

export function chonMoHinh(manifest, tieuChi) {
  return ungVien(manifest, tieuChi)[0] ?? null;
}

export function clipChoPose(entry, pose) {
  return entry?.animTheoPose?.[pose] ?? null;
}
