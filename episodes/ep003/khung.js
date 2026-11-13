// ep003 — ĐẶC TẢ KHUNG HÌNH theo shot (engine/dat-may.js): máy tự đặt theo khung kịch bản. shots.js gộp vào cam.khung của shot cùng id.
// Nguồn số: hiện là số Claude đo tạm trên khung kịch bản cho 8 shot mẫu; khi có Camera_104.json của Codex (docs/nghien-cuu/camera/de-bai-camera-cho-codex.md)
// thì file này được sinh lại từ đó. nham = diễn viên/đạo cụ; pct = % chiều cao khung của ĐẦU; x, y = tâm đầu trên khung (%); ngang/cao = độ; mm = tiêu cự.
export const KHUNG = {
  s014: { nham: 'hero', bo: 'dau', pct: 27, pct2: 30, x: 50, y: 36, ngang: -8, cao: -3, mm: 50 },
  s016: { nham: 'hero', bo: 'dau', pct: 9, pct2: 10, x: 42, y: 40, ngang: -50, cao: 12, mm: 30 },
  s018: { nham: 'hero', bo: 'dau', pct: 33, pct2: 36, x: 50, y: 34, ngang: 15, cao: 3, mm: 65 },
  s019: { nham: 'hero', bo: 'dau', pct: 30, pct2: 33, x: 42, y: 36, ngang: -30, cao: -6, mm: 40 },
  s027: { nham: 'bap', bo: 'dau', pct: 36, x: 50, y: 38, ngang: 20, cao: 0, mm: 70 },
  s044: { nham: 'hero', bo: 'dau', pct: 16, pct2: 19, x: 55, y: 44, ngang: -15, cao: -10, mm: 28 },
  s055: { nham: 'bach', bo: 'dau', pct: 27, pct2: 30, x: 45, y: 30, ngang: -30, cao: 2, mm: 55 },
  s070: { nham: 'mayor_ngu', bo: 'dau', pct: 36, pct2: 39, x: 50, y: 34, ngang: 18, cao: -10, mm: 55 },
};
