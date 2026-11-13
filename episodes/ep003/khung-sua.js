// ep003 — ĐẶC TẢ KHUNG GHI ĐÈ (tay) lên episodes/ep003/khung.js (file đó do tools/kb/camera-sang-khung.mjs sinh từ số Codex, đừng sửa tay).
// Mỗi mục ghi đè TỪNG TRƯỜNG theo id shot; `null` = bỏ đặc tả khung của shot đó (shot tự ghi cam p/l — vd nhìn qua gương).
// Shot nhắm VẬT CỦA BỐI CẢNH (chốt cửa, vết dây trên kệ…) thì `nham` là điểm [x, y, z] + `caoDoan` (chiều cao đoạn đo, stud) + `tuyetDoi: true`
// (khi đó `ngang` = phương vị của MÁY nhìn từ điểm nhắm: 0 = máy ở phía NAM (+Z), 90 = ĐÔNG, 180 = BẮC, −90 = TÂY).
import { PHONG_DIEM as D } from '../../engine/envs/e3-phong.js';
const VET = [D.ke_vet_day[0], D.ke_vet_day[1] + 0.02, D.ke_vet_day[2]];
const BAP_LEO = { nham: [D.ke_mat[0] - 3.0, 3.85, D.ke_mat[2] + 0.95], caoDoan: 0.85, pct: 22.6, pct2: 22.6, x: 36.9, y: 47.2, ngang: 66, cao: 0, mm: 70, tuyetDoi: true };   // s040 = s041 (khoá máy cho cú cắt)
export const KHUNG_SUA = {
  // ---- phòng Gà (bản dựng lại 13/11) ----
  s001: { nham: D.chot_cua, caoDoan: 0.62, pct: 21, x: 52, y: 48, ngang: -155, cao: 0, mm: 85, tuyetDoi: true, pct2: 34 },   // MVP20: đẩy vào rõ (21 → 34 %)
  s002: { nham: VET, caoDoan: 0.6, pct: 9, x: 44, y: 56, ngang: 30, cao: 34, mm: 50, tuyetDoi: true },
  s017: { nham: VET, caoDoan: 0.45, pct: 18, x: 39, y: 61, ngang: 80, cao: 22, mm: 65, tuyetDoi: true },
  s021: { ngang: 20, cao: 30, tuyetDoi: true },                  // máy chếch đông-nam trên cao; Gà đứng phía tây đồng hồ, tay vào khung từ trái (không xuyên gáy)
  s022: { ngang: 15, tuyetDoi: true },                           // Gà nằm: không có hướng mặt ngang → ghi phương vị máy
  s023: null, s024: null, s026: null,                            // nhìn QUA GƯƠNG: shot tự ghi cam (phongPhanChieu)
  s025: { ngang: 80, cao: 10, tuyetDoi: true },
  s033: { ngang: 180 },                                          // qua vai từ SAU lưng Gà
  s037: { nham: 'nhan_bac', ngang: 30, mm: 40, tuyetDoi: true },       // máy phía đông-nam (Gà đứng phía tây nhẫn)
  s038: { mm: 28 },
  s040: BAP_LEO, s041: BAP_LEO,
  s095: { nham: 'day_chuyen_bac', ngang: 10, cao: 35, tuyetDoi: true },
  s097: { nham: 'day_chuyen_bac', ngang: 160, pct: 22, pct2: 23, mm: 35, tuyetDoi: true },   // ống rộng hơn số Codex: máy đứng trước két (không lùi vào giường), thấy thân két + cánh mở
  s100: { nham: 'hero', bo: 'dau', pct: 55, x: 50, y: 45, ngang: 18, cao: -3, mm: 80 },
  s102: { x: 70 },                                              // chừa bên trái cho Gà (đứng phía đông Bắp)
  s103: { nham: 'bap', bo: 'dau', pct: 48, x: 46, y: 55, ngang: -6, cao: 0, mm: 75 },
};
// HỆ SỐ CỠ: đầu nhân vật khối của ta nhỏ hơn so với thân (Gà trong tranh đầu to hơn) và đầu gấu ước lượng → cùng % đầu thì thân tràn khung.
// Nhân pct với hệ số dưới đây (theo góp ý soi ảnh 13/11) để cỡ cảnh khớp tranh.
const HE_SO = { s016: 0.85, s018: 0.82, s019: 0.82, s022: 0.9, s025: 0.8, s028: 0.85, s032: 0.8, s033: 0.9, s096: 0.82, s098: 0.8, s099: 0.8, s101: 0.8, s102: 0.8 };
// gộp: khung sinh từ số Codex + ghi đè tay
export function gopKhung(SINH) {
  const o = { ...SINH };
  for (const [id, v] of Object.entries(KHUNG_SUA)) { if (v === null) delete o[id]; else o[id] = { ...(o[id] || {}), ...v }; }
  for (const [id, k] of Object.entries(HE_SO)) if (o[id]) o[id] = { ...o[id], pct: +(o[id].pct * k).toFixed(2), ...(o[id].pct2 !== undefined ? { pct2: +(o[id].pct2 * k).toFixed(2) } : {}) };
  return o;
}
