Tiếp tục bộ kit tập 3 trong `kich-ban/ep003-kit/` theo đề bài `docs/handoff/ep003-de-bai-kit-cho-codex.md` (đọc lại nếu cần). Bản 0.1 mới là khung dữ liệu, chưa đo. LẦN NÀY chỉ làm MỘT CỤM và làm THẬT: mở từng ảnh storyboard của cụm, đo và giải toạ độ; không sinh dữ liệu hàng loạt bằng script từ số cũ.

Quy tắc chung:
1. Cập nhật trực tiếp `kit.json` (giữ nguyên các cụm khác), tăng `phien_ban`.
2. Với cụm này phải có:
   - `boi_canh` đầy đủ mặt bằng (`kich_thuoc`, `tuong`, `cua`, `cua_so`, `vat_co_dinh` có `tam` + `xoay_y`, `diem_dung`) trong MỘT hệ toạ độ stud. Ưu tiên khớp kích thước/toạ độ env thật của engine nếu env đã có (đọc file env tương ứng trong `engine/envs/` và `episodes/ep003/episode.js`); ghi rõ chỗ storyboard khác env.
   - `do_vat` của cụm: `kich_thuoc`, `bang_lan_ga`, `vat_lieu` đủ trường, `co_san_trong_engine`.
   - `anh_sang` của cụm: key/fill/rim/moi_truong, `den_thuc_te`, `do_sang_dich_luma`.
   - MỌI shot của cụm có: `nhan_vat[].pos` + `huong_mat_yaw` + `tu_the` + `emote_file`; `do_vat_trong_khung[].pos`; `camera.dau` và `camera.cuoi` (`pos`, `nhin_vao`, `fov_doc_do`) + `tham_so_engine_goi_y` + `khung` + `phai_thay` + `khong_duoc`; `tin_cay` trung thực (cao/vua/thap) kèm `cach_do`.
3. Cách giải camera: Gà cao 5,2 stud. Từ `cao_chu_the_pct` và FOV dọc suy khoảng cách; từ `tam_chu_the_pct`, đường chân trời và các cạnh song song (kệ, giường, sàn, tường) suy yaw/pitch/độ cao máy; đặt máy vào mặt bằng rồi TỰ CHIẾU NGƯỢC (viết hàm chiếu phối cảnh trong `kiem-kit.mjs`) để kiểm chủ thể rơi đúng vị trí % trong khung; sai lệch > 8% khung thì sửa.
4. Mở rộng `kiem-kit.mjs` cho cụm này: biên bối cảnh; camera không nằm trong tường/đồ vật; tia camera → đầu chủ thể không xuyên hộp bao `vat_co_dinh`; nhân vật không chồng nhau; chủ thể trong nón nhìn; sai số chiếu ngược; đồ cố định không đổi chỗ. Chạy tới khi cụm này 0 lỗi cứng (cụm chưa làm được phép còn lỗi thiếu dữ liệu, in tách riêng theo cụm).
5. Cập nhật `KIT.html` cho cụm này: sơ đồ mặt bằng SVG đúng tỉ lệ có nón camera theo shot được chọn + vị trí nhân vật; thẻ đồ vật có tỉ lệ cạnh Gà + vật liệu; sơ đồ ánh sáng.
6. Chỉ ghi trong `kich-ban/ep003-kit/`; không git, không mạng.

Dòng cuối in: `CUM XONG: <tên cụm>, <số shot>, <lỗi cứng của cụm>, tin cậy cao/vừa/thấp = a/b/c` — hoặc `CUM DỞ: <lý do>`.

CỤM LẦN NÀY:
