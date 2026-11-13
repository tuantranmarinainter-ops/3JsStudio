# So sánh ep001 và ep002 (2026-11-13)

Người dùng xem bản cuối ep002 (`dist/ep002.html`, commit `e73695a`) và đánh giá "rất không ổn".
Ba agent chụp + đo; số về track âm thanh, shot đêm, địa điểm đã được kiểm lại. Chưa ai nghe bằng tai.

| | ep001 | ep002 |
|---|---|---|
| Shot / thời lượng | 145 / 171 s | 114 / 176 s |
| Bối cảnh | 16 | 3 (factory_in 38, bedroom_in 35, kenneyTown 41) |
| Shot ban đêm | — | 81/114 |
| Độ sáng TB (0–255) | 119 | 82 |
| Khung gần như một mảng màu | 9 | 23 |
| Track âm thanh trong bản gộp | 5 | 2 (lời, khoảnh khắc) |
| Tiếng động | 122 cue (42/phút) | 21 cue (7/phút) |
| Lời kể | 65 câu, 1 khoảng lặng > 0,5 s | 83 mảnh, 35 khoảng lặng > 0,5 s |

## Mô hình / bối cảnh
- Không có vật "ngôi sao" (ep001: nhà có chân, hải đăng, tàu, cá voi); ep002 chỉ nhà Kenney + 26 đạo cụ khối (`engine/props-kb.js`). Điểm sáng: gấu bông.
- Bối cảnh lặp: nhà máy + phòng ngủ = 73 shot. Đêm là mảng xanh navy phẳng, không đèn cửa sổ/trăng. Phòng ngủ trống.
- Camera: gần như shot nào cũng động nhưng 76 shot cùng kiểu `push`.

## Nhân vật
- Mặt tối đen trong nhà máy (s062–s070, s093–s100): không có đèn riêng cho nhân vật.
- Người nhỏ / quay lưng: s044, s047, s056, s061, s079, s083.
- Nhân vật phụ khó phân biệt (2 lính gác chỉ khác màu mũ; thị trưởng áo quần một màu; ông Bách tóc râu che mặt).
- Gà (hero) khai `{"ga":1}` không tuỳ chọn, thô ở toàn thân. Gấu bông lệch phong cách với người khối.
- ep002 hơn: ~27 animation (ep001 ~16), 13 biểu cảm (7), ít shot đứng yên.

## Âm thanh
- `dist/ep002.html` không chứa `sfx_nen`, `sfx_buoc-chan`, `music_nhac` dù đã trộn ra đĩa: `episodes/ep002/index.html` (dựng từ `_template`) chỉ khai lời + khoảnh khắc.
- Tiếng động thưa, có đoạn ~50 s không cue. Nền chỉ 4 loại âm, −24,3 LUFS (to hơn ep001 5 LU).
- Lời bị cắt giữa mệnh đề theo mốc `@at`, 26 mảnh không có dấu kết câu.
- Thiếu: tiếng Anh, `voices/`, `narration.levels.json`, `beats.json`, `LAYERS.md`.

## Nguyên nhân gốc
Dây chuyền tự động chỉ chọn trong thứ có sẵn: không có bước dựng model riêng theo ảnh tham chiếu, không dùng 16 env sẵn có,
kịch bản đặt 3/4 phim vào đêm, không đèn nhân vật, tiếng động sinh một lần, tập mẫu thiếu khai báo track âm thanh.

Bảng khung: `output/look/so-mo-hinh/ep00{1,2}_sheet.jpg`, `output/look/so-nhan-vat/ep002/sheet.jpg`. Số đo âm thanh: `output/so-am-thanh/`.
