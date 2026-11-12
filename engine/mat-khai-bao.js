// mat-khai-bao.js — hằng dùng chung cho materials.js và grunge.js, KHÔNG import gì (tránh import vòng materials ↔ grunge).
// Danh sách loại vật liệu CẤM lớp bụi/cũ (grunge.js bỏ qua): nguồn duy nhất.
// tools/kiem/mac-dinh.json L9.camGrunge phải khớp (có test tools/tests/vat-lieu.test.mjs). materials.js xuất lại tên này.
export const KHONG_GRUNGE = ['chrome', 'metalpaint', 'iron', 'glass', 'enamel', 'skin', 'carpaint'];
