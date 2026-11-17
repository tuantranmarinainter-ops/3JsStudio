// Loại khớp của từng mốc có model (nhóm NHÀ ep005t) — dữ liệu cho engine/khop-tai-san.js. Khoá: '<bối cảnh>/<mốc>'.
// nha = vừa chân, tam = tấm (vách, cửa, cửa sổ, sàn mỏng), hop, dai, do-vat, cay. Thiếu khoá → env dùng cách co cũ.
// Kế hoạch: docs/handoff/khop-khoi-tai-san.md (mục 3a, 4). Sửa tay được; mỗi mốc ghi đè luật bằng `opt` nếu cần.
export const LOAI_MOC = {
  'choi/vach': 'tam', 'choi/cua': 'tam', 'choi/cua-so': 'tam',
  'hang-rao/tuong-sau-nha': 'nha',
  'pho-chinh/nha-cindy': 'nha', 'pho-chinh/nha-nam-dong': 'nha',
  'pho-chinh/cua-ga': 'tam', 'pho-chinh/cua-cindy': 'tam', 'pho-chinh/cuaso-ga': 'tam', 'pho-chinh/cuaso-cindy': 'tam',
  'quang-truong/day-nha-nam': 'nha', 'quang-truong/chan-thap': 'nha',
  'thap-nuoc/chan-sat': 'nha',
  'tiem-banh/mat-tien': 'tam', 'tiem-banh/hien': 'tam',
};
