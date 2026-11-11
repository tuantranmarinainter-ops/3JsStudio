---
name: gop-y
description: Đọc và xử lý file góp ý / ghi chú lỗi mà người dùng vẽ và ghi trực tiếp trên khung hình trong trình phát (nút "Ghi chú lỗi" → "Gửi góp ý"). Dùng BẤT CỨ KHI NÀO người dùng nói "đọc góp ý", "file góp ý", "ghi chú lỗi", "tôi đã gửi góp ý", "xem tôi khoanh chỗ nào", "feedback" — kể cả khi không nhắc tên skill.
---

# Đọc góp ý từ trình phát

Người dùng bấm **✎ Ghi chú lỗi** trong `dist/<ep>.html` (mở thêm `?ui` nếu cần), tạm dừng ở khung lỗi, vẽ bút/elip/mũi tên đỏ, gõ hoặc nói ghi chú,
rồi **Gửi góp ý** → file `gop-y_<ep>_<ngày>_<giờ>.json` lưu vào `S:\3JS Studio\feedback\`. Nét vẽ chỉ nằm trong ảnh góp ý, không vào MP4.

## Cách làm
1. `node tools/feedback.mjs --latest` (hoặc `node tools/feedback.mjs <file.json>`): in danh sách đánh số (frame, giây, shot, lời ghi chú)
   và ghi ảnh ra `feedback/<tên>/<nn>_f<frame>.png`.
2. **Mở từng ảnh bằng Read** (khung hình + phụ đề + nét vẽ đỏ chỉ đúng chỗ lỗi). Đọc kèm lời ghi chú.
3. Với mỗi ghi chú, xác định **shot** (`shotId`, tra trong `episodes/<ep>/shots.js`) và **lớp** bị lỗi
   (canh / hieu-ung-hinh / phu-de / giong / tieng-anh / nen / buoc-chan / khoanh-khac — xem `episodes/<ep>/LAYERS.md`, skill `sua-theo-lop`).
4. Gom các ghi chú cùng lớp, sửa đúng file của lớp đó, chạy `node tools/build.mjs <ep> <lớp>`.
5. Kiểm lại đúng frame đã góp ý: `node tools/look.mjs <trang> --t <giây>` (skill `kiem-tra-khung`), so với ảnh góp ý.
6. Báo người dùng theo số thứ tự ghi chú: đã sửa gì, ghi chú nào chưa rõ (hỏi lại thay vì đoán), kèm link `dist/<ep>.html`.

Ghi chú không rõ lớp/nguyên nhân thì nói thẳng và hỏi; không sửa lớp khác ngoài lớp được góp ý.

## Lỗi theo frame → chỉ chụp phân cảnh đó
`node tools/look.mjs episodes/<ep>/index.html --frames 676,1262` — tự tìm shot chứa từng frame, chụp frame đó + đầu/giữa/cuối shot. Không chụp cả phim để tìm lỗi; kiểm cả phim (`--shots all --det`) chỉ 1 lần ở cuối.
