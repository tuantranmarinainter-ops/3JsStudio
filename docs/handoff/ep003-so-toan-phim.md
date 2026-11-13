# ep003 — so cả phim với ảnh kịch bản (13/11, một vòng, KHÔNG sửa gì)

- Ảnh: `output/ep003/so-toan-phim-bang/so_01…18.jpg` (mỗi shot một cặp: kịch bản trái | khung giữa của bản dựng phải; 6 shot/ảnh).
  Bản xem trên điện thoại: `output/ep003/mp4/so-sanh/` (đang chia LAN cổng 8800).
- Chụp: `PROFILE=1 node tools/look.mjs episodes/ep003/index.html --shots all --out output/ep003/so-toan-phim` (độ sáng TB 101,3).
- Chấm: 3 agent Sonnet, chấm nghiêm (phân vân chọn mức nặng), mỗi agent một phần ba phim. Bảng từng shot:
  `ep003-so-toan-phim-a.md` (s001–s036), `-b.md` (s037–s072), `-c.md` (s073–s104).
- Giới hạn: chỉ so KHUNG GIỮA của mỗi shot (không so đầu/cuối, không so chuyển động); kết quả agent chưa được người xem lại.

## Tổng: đạt 3 · lệch 55 · hỏng 46 / 104

| cụm | số shot | đạt | lệch | hỏng | shot hỏng |
|---|---|---|---|---|---|
| phòng Gà (đã dựng lại) | 36 | 2 | 28 | 6 | s022 s025 s026 s033 s099 s102 |
| nhà máy (bản cũ) | 33 | 1 | 16 | 16 | s050 s053 s054 s059 s060 s061 s063 s064 s078 s080 s081 s082 s087 s089 s091 s094 |
| phố (bản cũ) | 31 | 0 | 11 | 20 | s008–s013 s015 s036 s039 s042 s046 s048 s067 s072–s077 s092 |
| tiệm bánh, tiệm may (bản cũ) | 4 | 0 | 0 | 4 | s004 s005 s006 s007 |

Đạt: s056, s100, s104.

## Nhóm lỗi (mỗi shot 1–2 nhóm)
góc máy 37 · đạo cụ 30 · vị trí nhân vật 29 · tư thế/tay 27 · cỡ cảnh 25 · lỗi hình 23 · bối cảnh 22 · ánh sáng 7 · biểu cảm 4.

## Ba kiểu hỏng lặp lại
1. **Máy bị vật che kín khung** (thấy mảng tường/mái/cột phẳng, không thấy chủ thể): s007, s012, s050, s053, s078, s082, s089, s091, s092, s094; mái hiên/cột che ở s008–s011, s015, s073, s075, s076, s080. Gặp ở cụm phố và nhà máy — bối cảnh cũ không đúng kích thước mà máy đặt theo số của kịch bản.
2. **Thiếu đạo cụ then chốt hoặc đạo cụ sai**: két (s005, s063, s064), hộp nhẫn (s006, s007), bao tiền (s048), bản đồ + ghim (s059–s061), đồng hồ quả quýt (s074), thùng đầu gấu (s089, s091).
3. **Cảnh hai, ba người chỉ còn một người hoặc sai chủ thể**: s067, s072, s076, s077, s081, s087, s102.

## Riêng phòng Gà (so với vòng 2: 2 / 27 / 6)
- Vẫn hỏng: s022 (Bắp chiếm khung, Gà chìm sau chăn), s026 (không thấy khung gương), s102 (mất Gà).
- Mới bị chấm hỏng: s025 (đầu Gà nằm ngang, mặt cắt nửa), s033 (Gà che kệ và sách), s099 (két có mảng thủng thấy trời, Bắp không ôm két).
- Không còn bị chấm hỏng: s029, s041, s103 (xuống lệch).
- Lưu ý: s026 và s022 đã sửa sau vòng 2 nhưng vòng này vẫn hỏng → cách sửa đó không đủ.
