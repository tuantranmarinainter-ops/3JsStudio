---
name: nhap-kich-ban
description: Biến storyboard của người dùng (khung hình shot_001.png… + mô tả từng shot dạng Markdown/CSV/JSON) thành một tập phim mới dựng được ngay — episode.js, shots.js theo loại shot (establish, closeup, dialogue…), narration.txt có mốc @at, phụ đề ước lượng, tiếng động theo shot, index.html từ tập mẫu, thị trấn Kenney theo seed — rồi chụp bảng so khung storyboard | bản dựng. Dùng BẤT CỨ KHI NÀO người dùng nói "kịch bản", "storyboard", "tập mới", "nhập khung ảnh", "khung hình phân cảnh", "làm tập từ mô tả này", hoặc gửi một thư mục ảnh phân cảnh kèm mô tả — kể cả khi không nhắc tên skill.
---

# Nhập kịch bản (storyboard → tập mới)

Khung + mô tả là tài sản của người dùng: dùng thẳng, không hỏi nguồn. Định dạng vào: `docs/kich-ban-vao.md`.

## Quy trình
1. **Chuẩn bị thư mục**: ảnh `shot_001.png…` + `storyboard.md` (dòng `khoá: giá trị` cho tập + bảng 1 hàng/shot).
   Người dùng gửi dạng khác (Word, ảnh có chữ, danh sách) → tự chép thành `storyboard.md` theo docs, giữ nguyên lời kể.
   Thiếu luật / điểm yếu / twist / lời giải → hỏi 1 lần (CLAUDE.md: mỗi thứ 1 câu).
2. **Nhập**: `python tools/storyboard.py <thư mục> epNNN --sheet` (đã có tập → `--force`, chỉ ghi đè file nó sinh).
   Đọc các dòng `!` (loại không rõ, câu dài hơn shot…) và sửa trong bảng rồi chạy lại.
3. **Xem bảng so** `output/storyboard/epNNN/compare.jpg` (trái storyboard, phải bản dựng) — MỞ ẢNH RA XEM.
   Lệch bố cục → sửa dòng trong `episodes/epNNN/shots.js`: đổi `type`/`at`/`move`/`side`, hoặc ghi đè `cam: { dist, yaw, h, fov, look }`,
   `cast: { hero: { at, ry, anim } }`. Địa điểm `'town:center'` trong `episode.js` = chưa đặt → gán `'town:home'` hoặc `{ pos, ry }`.
   Xem lại: `node tools/look.mjs episodes/epNNN/storyboard/index.html --ab episodes/epNNN/index.html --shots s003,s004`.
4. **Giọng**: `narration.txt` đã có `@at` theo shot → skill `giong-doc` / `tools/tts.py`; xong thì chỉnh `dur` theo `narration.json`
   và tạo lại phụ đề. **Tiếng động**: `node tools/build.mjs epNNN khoanh-khac` (skill `tieng-dong`).
5. **Kiểm** (skill `kiem-tra-khung`, có `--det`) → **xuất** (skill `xuat-phim`).

## Tham chiếu nhanh
- Loại shot + tham số: đầu file `engine/shottypes.js` (`SHOT_TYPES[…].doc`). Tập mẫu đủ 11 loại: `episodes/_template/`.
- Địa điểm thị trấn (`engine/town.js`, theo `seed`): square, home, yard, shop, street, crossroad, park, center, house1…
- Diễn viên: `episode.actors` (tuỳ chọn `createR15`), `crowd: { count }` → crowd1…N (`engine/cast.js`).
- Mẫu chạy được: `python tools/storyboard.py episodes/_template/storyboard-example _demo_import --force --sheet`.
- Không sửa `engine/` khi chỉ nhập tập; loại shot mới chỉ thêm khi thật cần (thêm 1 mục vào `SHOT_TYPES`).
