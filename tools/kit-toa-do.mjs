// kit-toa-do.mjs — MỘT quy ước đổi toạ độ kit (gốc = tâm sàn bối cảnh) → toạ độ thế giới. kit-shots và kiem-chuyen-dong cùng import.
// Quy ước (khớp engine: nhân vật quay θ thì +Z → (sinθ, cosθ)): xoay quanh trục Y góc `xoay` độ (dương = từ +Z quay về +X,
// tức x' = x·cosθ + z·sinθ ; z' = −x·sinθ + z·cosθ ; y giữ nguyên), SAU ĐÓ dịch cộng `goc`. Hướng nhân vật: ry = (huong + xoay) độ → rad.
export const RAD = Math.PI / 180;

/** Chọn mục đổi toạ độ: `goc` là {goc,xoay} (dùng chung mọi bối cảnh) hoặc { "<boiCanh>": {goc,xoay} }. */
export function chonGoc(goc, boiCanh) {
  if (!goc) return null;
  if (Array.isArray(goc.goc) || typeof goc.xoay === 'number') return goc;
  return (boiCanh && goc[boiCanh]) || null;
}

/** Đổi điểm [x,y,z] của kit sang thế giới. Không làm tròn. */
export function doiDiem(p, g) {
  const o = (g && g.goc) || [0, 0, 0], th = ((g && g.xoay) || 0) * RAD, c = Math.cos(th), s = Math.sin(th);
  return [o[0] + p[0] * c + p[2] * s, o[1] + p[1], o[2] - p[0] * s + p[2] * c];
}

/** Đổi hướng nhân vật (độ, 0 = mặt +Z) → radian thế giới. */
export function doiHuongRad(huongDo, g) { return ((huongDo || 0) + ((g && g.xoay) || 0)) * RAD; }
