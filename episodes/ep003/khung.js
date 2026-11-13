// ep003 — ĐẶC TẢ KHUNG HÌNH theo shot cho bộ đặt máy (engine/dat-may.js). SINH TỰ ĐỘNG bởi tools/kb/camera-sang-khung.mjs từ Camera_104.json
// (số Codex đo trên chính khung kịch bản). Đừng sửa tay: sửa ở KHUNG_SUA cuối file (ghi đè từng trường theo id) rồi giữ nguyên phần sinh.
// nham = diễn viên/đạo cụ; bo = điểm đặt; pct = % chiều cao khung của đoạn đo (đầu); x, y = vị trí trên khung (%); ngang/cao = độ; mm = tiêu cự dự kiến.
const SINH = {
  s004: { nham: 'banh', bo: 'toan_than', pct: 74, x: 45, y: 56, ngang: -34, cao: 0, mm: 35, pct2: 79.9 },
  s006: { nham: 'may', bo: 'toan_than', pct: 72, x: 43.5, y: 48, ngang: -38, cao: 0, mm: 50, pct2: 74.2 },
  s007: { nham: 'hop_nhan', pct: 56, x: 52, y: 52, ngang: 0, cao: 60, mm: 85, pct2: 57.7, tuyetDoi: false },
  s008: { nham: 'bach', bo: 'dau', pct: 15, x: 21, y: 37, ngang: -35, cao: 0, mm: 28, pct2: 16.2 },
  s009: { nham: 'be_vang', bo: 'dau', pct: 21, x: 52, y: 40, ngang: 10, cao: 0, mm: 55, pct2: 21.6 },
  s010: { nham: 'bach', bo: 'dau', pct: 21, x: 25, y: 44, ngang: -31, cao: 0, mm: 50, pct2: 21.6 },
  s012: { nham: 'dan_a', bo: 'dau', pct: 10, x: 26, y: 55, ngang: -38, cao: 0, mm: 32, pct2: 10.3 },
  s013: { nham: 'dan_a', bo: 'dau', pct: 6, x: 24, y: 32, ngang: 0, cao: 44, mm: 28, pct2: 6.2 },
  s014: { nham: 'hero', bo: 'dau', pct: 36, x: 48, y: 35, ngang: 0, cao: 0, mm: 50, pct2: 37.1 },
  s016: { nham: 'hero', bo: 'dau', pct: 19, x: 41, y: 38, ngang: -60, cao: 0, mm: 30, pct2: 19.6 },
  s018: { nham: 'hero', bo: 'dau', pct: 44, x: 51, y: 41, ngang: -28, cao: 0, mm: 65, pct2: 47.5 },
  s019: { nham: 'hero', bo: 'dau', pct: 38, x: 54, y: 41, ngang: -9, cao: -5, mm: 40, pct2: 41 },
  s020: { nham: 'hero', bo: 'dau', pct: 10.5, x: 52.4, y: 41.4, ngang: -55, cao: 0, mm: 24, pct2: 11.3 },
  s021: { nham: 'dong_ho', pct: 36.2, x: 49.9, y: 43.6, ngang: 0, cao: 20, mm: 75, pct2: 37.3, tuyetDoi: false },
  s022: { nham: 'hero', bo: 'dau', pct: 14.4, x: 30.6, y: 51.8, ngang: -20, cao: 12, mm: 50, pct2: 14.8 },
  s023: { nham: 'dong_ho', pct: 7.4, x: 68, y: 48.1, ngang: 0, cao: 0, mm: 35, pct2: 8, tuyetDoi: false },
  s024: { nham: 'dong_ho', pct: 22.8, x: 38.4, y: 41.8, ngang: 0, cao: 0, mm: 55, pct2: 23.5, tuyetDoi: false },
  s025: { nham: 'hero', bo: 'dau', pct: 42.4, x: 39.1, y: 49.4, ngang: -10, cao: 0, mm: 85, pct2: 43.7 },
  s026: { nham: 'bap', bo: 'dau', pct: 11, x: 37.3, y: 54.5, ngang: -35, cao: 0, mm: 55, pct2: 11.3 },
  s027: { nham: 'bap', bo: 'dau', pct: 30.4, x: 53.8, y: 46.4, ngang: -10, cao: 0, mm: 70, pct2: 31.3 },
  s028: { nham: 'bap', bo: 'dau', pct: 15.1, x: 44.2, y: 60.8, ngang: -15, cao: 7, mm: 32, pct2: 16.3 },
  s029: { nham: 'bap', bo: 'dau', pct: 19, x: 33.7, y: 44.6, ngang: -40, cao: -25, mm: 35, pct2: 19.6 },
  s030: { nham: 'bap', bo: 'dau', pct: 22, x: 43.6, y: 35.5, ngang: -20, cao: 0, mm: 58, pct2: 22.7 },
  s031: { nham: 'bap', bo: 'dau', pct: 23.8, x: 38.4, y: 45.5, ngang: -25, cao: 0, mm: 55, pct2: 24.5 },
  s032: { nham: 'hero', bo: 'dau', pct: 23.5, x: 51, y: 42.8, ngang: -20, cao: 5, mm: 45, pct2: 24.2 },
  s033: { nham: 'hero', bo: 'dau', pct: 28.1, x: 23.7, y: 54.2, ngang: 0, cao: 0, mm: 45, pct2: 28.9 },
  s034: { nham: 'hero', bo: 'dau', pct: 11.1, x: 40.9, y: 35.9, ngang: 180, cao: 0, mm: 38, pct2: 11.4 },
  s035: { nham: 'hero', bo: 'dau', pct: 19.4, x: 39.9, y: 49.7, ngang: -30, cao: 0, mm: 55, pct2: 20 },
  s037: { nham: 'nhan_moi', pct: 11.8, x: 57.4, y: 56.8, ngang: 0, cao: 28, mm: 65, pct2: 12.2, tuyetDoi: false },
  s038: { nham: 'hero', bo: 'dau', pct: 15, x: 42.3, y: 41.6, ngang: -62, cao: 0, mm: 50, pct2: 15.5 },
  s039: { nham: 'hero', bo: 'toan_than', pct: 25.7, x: 49.4, y: 40.3, ngang: -29, cao: 0, mm: 50, pct2: 26.5 },
  s040: { nham: 'bap', bo: 'dau', pct: 22.6, x: 36.9, y: 47.2, ngang: -24, cao: 0, mm: 70, pct2: 23.3 },
  s042: { nham: 'bap', bo: 'dau', pct: 4.6, x: 89.7, y: 34.7, ngang: 27, cao: 12, mm: 50, pct2: 4.7 },
  s043: { nham: 'bap', bo: 'dau', pct: 18.9, x: 69.2, y: 37.2, ngang: 30, cao: -9, mm: 50, pct2: 20.4 },
  s044: { nham: 'hero', bo: 'dau', pct: 20, x: 52.9, y: 35.6, ngang: -37, cao: -11, mm: 50, pct2: 20.6 },
  s045: { nham: 'bap', bo: 'dau', pct: 7.8, x: 51.1, y: 53, ngang: 2, cao: -7, mm: 50, pct2: 8.4 },
  s046: { nham: 'bap', bo: 'dau', pct: 2.8, x: 52.8, y: 32.6, ngang: 180, cao: 43, mm: 50, pct2: 2.9 },
  s047: { nham: 'gau_vi', bo: 'dau', pct: 25.6, x: 51.4, y: 28.3, ngang: -43, cao: -5, mm: 50, pct2: 26.4 },
  s048: { nham: 'gau_tui', bo: 'dau', pct: 19.9, x: 53.7, y: 46.2, ngang: -71, cao: -4, mm: 35, pct2: 20.5 },
  s049: { nham: 'bap', bo: 'toan_than', pct: 26.1, x: 54.3, y: 64, ngang: 0, cao: -8, mm: 50, pct2: 26.9 },
  s050: { nham: 'hero', bo: 'dau', pct: 21.2, x: 22.2, y: 51.2, ngang: 0, cao: -7, mm: 50, pct2: 22.9 },
  s051: { nham: 'hero', bo: 'dau', pct: 14, x: 57, y: 39, ngang: -74, cao: -8, mm: 28, pct2: 15.1 },
  s053: { nham: 'nhan_moi', pct: 7, x: 49, y: 74, ngang: 0, cao: 0, mm: 85, pct2: 7.2, tuyetDoi: false },
  s054: { nham: 'nhan_moi', pct: 6, x: 46, y: 70, ngang: 0, cao: 9, mm: 35, pct2: 6.2, tuyetDoi: false },
  s055: { nham: 'bach', bo: 'dau', pct: 34, x: 37, y: 32, ngang: -23, cao: 0, mm: 55, pct2: 35 },
  s060: { nham: 'bach', bo: 'dau', pct: 21, x: 22, y: 41, ngang: -21, cao: 0, mm: 50, pct2: 21.6 },
  s064: { nham: 'day_chuyen', pct: 15, x: 42, y: 52, ngang: 0, cao: 28, mm: 90, pct2: 15.5, tuyetDoi: false },
  s065: { nham: 'hero', bo: 'dau', pct: 32.5, x: 50, y: 43, ngang: -18, cao: 0, mm: 85, pct2: 33.5 },
  s066: { nham: 'hero', bo: 'dau', pct: 8.5, x: 45, y: 52, ngang: 176, cao: 4, mm: 28, pct2: 8.8 },
  s067: { nham: 'hero', bo: 'dau', pct: 18.7, x: 31.2, y: 49.9, ngang: -70, cao: 0, mm: 32, pct2: 20.2 },
  s068: { nham: 'hero', bo: 'dau', pct: 24, x: 41.1, y: 41.9, ngang: -15, cao: 0, mm: 55, pct2: 24.7 },
  s069: { nham: 'mayor_ngu', bo: 'dau', pct: 44, x: 56.3, y: 30.1, ngang: 30, cao: 0, mm: 70, pct2: 45.3 },
  s070: { nham: 'mayor_ngu', bo: 'dau', pct: 35.3, x: 47.1, y: 32, ngang: 23, cao: 0, mm: 55, pct2: 36.4 },
  s071: { nham: 'hero', bo: 'dau', pct: 13, x: 45.6, y: 44, ngang: 180, cao: 0, mm: 35, pct2: 13.4 },
  s072: { nham: 'mayor', bo: 'dau', pct: 14.6, x: 66, y: 43.5, ngang: 105, cao: 0, mm: 35, pct2: 15 },
  s073: { nham: 'mayor', bo: 'dau', pct: 20.5, x: 71.8, y: 47.6, ngang: 55, cao: 0, mm: 50, pct2: 21.1 },
  s074: { nham: 'dong_ho_quyt', pct: 21.5, x: 41, y: 57.8, ngang: 0, cao: 0, mm: 85, pct2: 22.1, tuyetDoi: false },
  s076: { nham: 'mayor', bo: 'dau', pct: 15.7, x: 39.6, y: 42.6, ngang: 150, cao: 0, mm: 35, pct2: 16.2 },
  s077: { nham: 'hero', bo: 'dau', pct: 6, x: 64.5, y: 44.7, ngang: 180, cao: 0, mm: 32, pct2: 6.2 },
  s078: { nham: 'mayor', bo: 'dau', pct: 20.1, x: 59.6, y: 40.8, ngang: -65, cao: 0, mm: 35, pct2: 20.7 },
  s079: { nham: 'dong_ho_quyt', pct: 11.7, x: 32.5, y: 55.9, ngang: 0, cao: 0, mm: 50, pct2: 12.1, tuyetDoi: false },
  s080: { nham: 'mayor', bo: 'dau', pct: 32.3, x: 55.5, y: 48.2, ngang: -52, cao: 0, mm: 65, pct2: 33.3 },
  s081: { nham: 'mayor', bo: 'dau', pct: 14.2, x: 46.1, y: 41, ngang: -68, cao: 0, mm: 35, pct2: 14.6 },
  s082: { nham: 'mayor', bo: 'dau', pct: 21, x: 36, y: 26.2, ngang: 0, cao: 0, mm: 50, pct2: 21.6 },
  s083: { nham: 'hero', bo: 'dau', pct: 12, x: 28, y: 50, ngang: 0, cao: -4, mm: 27, pct2: 13 },
  s088: { nham: 'bach', bo: 'dau', pct: 45, x: 47.5, y: 30.5, ngang: -8, cao: 0, mm: 70, pct2: 46.4 },
  s089: { nham: 'hero', bo: 'dau', pct: 30, x: 70, y: 44, ngang: 18, cao: -7, mm: 70, pct2: 30.9 },
  s090: { nham: 'bach', bo: 'dau', pct: 16, x: 31.5, y: 38, ngang: -18, cao: -5, mm: 35, pct2: 16.5 },
  s093: { nham: 'bach', bo: 'dau', pct: 45, x: 45.5, y: 34.5, ngang: -28, cao: 0, mm: 60, pct2: 46.4 },
  s094: { nham: 'mayor', bo: 'dau', pct: 15, x: 41, y: 43.5, ngang: -35, cao: 0, mm: 50, pct2: 15.5 },
  s095: { nham: 'day_chuyen', pct: 30, x: 40.5, y: 44, ngang: 0, cao: 28, mm: 70, pct2: 30.9, tuyetDoi: false },
  s096: { nham: 'hero', bo: 'dau', pct: 33, x: 32, y: 41.5, ngang: -21, cao: 0, mm: 55, pct2: 34 },
  s097: { nham: 'day_chuyen', pct: 31, x: 44, y: 44.5, ngang: 0, cao: 6, mm: 65, pct2: 31.9, tuyetDoi: false },
  s098: { nham: 'bap', bo: 'dau', pct: 13, x: 26.5, y: 50.5, ngang: -38, cao: -8, mm: 35, pct2: 13.4 },
  s099: { nham: 'bap', bo: 'dau', pct: 17, x: 27, y: 46.5, ngang: -26, cao: -8, mm: 45, pct2: 17.5 },
  s101: { nham: 'bap', bo: 'dau', pct: 18, x: 29.5, y: 50, ngang: -33, cao: -10, mm: 45, pct2: 18.5 },
  s102: { nham: 'bap', bo: 'dau', pct: 19, x: 24, y: 52.5, ngang: -48, cao: -8, mm: 50, pct2: 19.6 },
};
// Chưa đặt được theo khung (dùng máy ghi tay trong file shot):
//   s001: nhắm vật "chốt cửa và ngàm" chưa có trong cảnh
//   s002: nhắm vật "vết dây cong trên bụi mặt kệ" chưa có trong cảnh
//   s003: nhắm vật "dãy mặt tiền nhà phố" chưa có trong cảnh
//   s005: nhắm vật "hốc trống dưới quầy" chưa có trong cảnh
//   s011: nhắm vật "xấp phiếu trình báo" chưa có trong cảnh
//   s015: nhắm vật "hai mặt tiền sát vách" chưa có trong cảnh
//   s017: nhắm vật "vết dây trên kệ" chưa có trong cảnh
//   s036: nhắm vật "đoạn phố trống bên dưới cửa sổ" chưa có trong cảnh
//   s041: nhắm vật "khoảng trống trên kệ cạnh gáy sách" chưa có trong cảnh
//   s052: thiếu số đo
//   s056: thiếu số đo
//   s057: thiếu số đo
//   s058: nhắm vật "bản đồ thị trấn" chưa có trong cảnh
//   s059: nhắm vật "ghim hình đầu gấu đang được đặt" chưa có trong cảnh
//   s061: nhắm vật "cụm nhà chưa có ghim trên bản đồ" chưa có trong cảnh
//   s062: nhắm vật "két tiền tiệm bánh" chưa có trong cảnh
//   s063: nhắm vật "két tiền tiệm bánh" chưa có trong cảnh
//   s075: nhắm vật "miệng túi áo trống" chưa có trong cảnh
//   s084: nhắm vật "chồng thùng dấu đầu gấu" chưa có trong cảnh
//   s085: nhắm vật "dấu hình đầu gấu trên thùng trước" chưa có trong cảnh
//   s086: thiếu số đo
//   s087: thiếu số đo
//   s091: nhắm vật "thùng carton phía trên" chưa có trong cảnh
//   s092: thiếu số đo
//   s100: thiếu số đo
//   s103: thiếu số đo
//   s104: thiếu số đo
export const KHUNG_SUA = {};
export const KHUNG = Object.fromEntries(Object.entries(SINH).map(([id, k]) => [id, { ...k, ...(KHUNG_SUA[id] || {}) }]));
