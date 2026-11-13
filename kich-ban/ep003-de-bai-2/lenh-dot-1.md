Việc: đọc `kich-ban/ep003-de-bai-2/DE-BAI.md` rồi làm ĐÚNG ĐỢT 1 ở mục 7: bối cảnh `bedroom` + 8 shot S018, S020, S023, S026, S033, S095, S097, S099. Giao vào `kich-ban/ep003-kit2/`.

Ràng buộc:
- Chỉ tạo/sửa file trong `kich-ban/ep003-kit2/`. Không sửa file nào khác của repo. Không chạy git (không add, commit, stash, checkout, reset).
- `boi_canh.bedroom.khoi` = chép nguyên mảng `khoi` của `kich-ban/ep003-de-bai-2/khoi-e3-phong.json` (hình học thật của phòng đang dựng). Đọc tên khối để biết giường (tây), kệ + cửa sổ (bắc), gương + cửa ban công (đông), cửa phòng + két (nam / tây nam).
- Nội dung từng shot (hành động, ai có mặt, biểu cảm): `kich-ban/ep003-goi2/Shotlist_104.json`. Ý đồ máy: `kich-ban/ep003-goi2/Camera_104.json`. Ảnh cũ để hiểu ý: `kich-ban/ep003-goi2/shots/S018.jpg` … (chỉ tham khảo bố cục, KHÔNG theo tỉ lệ nhân vật của ảnh cũ).
- Nhân vật: xem `kich-ban/ep003-de-bai-2/nhan-vat/bang-chieu-cao.jpg`, `hero.jpg`, `bap.jpg` và số trong `nhan-vat.json`.
- Dựng khối: `node tools/kb/do-nhan-vat.mjs dung ep003 kich-ban/ep003-kit2/kit.json kich-ban/ep003-kit2/khoi` (mất khoảng 30–60 giây mỗi lần chạy, mở Chrome không giao diện). Mở xem `khoi/<id>.png` sau mỗi lần để tự kiểm bố cục, sửa số tới khi đạt bước 4 của mục 4.
- NẾU lệnh dựng khối không chạy được trong môi trường của bạn (không mở được Chrome, bị chặn mạng nội bộ): tính số bằng công thức ở mục 1, ghi `"da_dung_khoi": false`, viết xong `kit.json` + `BAO-CAO.md` rồi DỪNG, KHÔNG vẽ ảnh. Phía engine sẽ dựng khối rồi gọi bạn vẽ sau.
- Nếu dựng khối chạy được: vẽ 8 ảnh cuối bằng công cụ sinh ảnh của bạn, khổ dọc 9:16, bố cục đè theo `khoi/<id>.png` (đính kèm ảnh khối và ảnh nhân vật làm tham chiếu nếu công cụ nhận ảnh vào), lưu `kich-ban/ep003-kit2/shots/<id>.jpg`, rồi đo lại và ghi `do_tren_anh`.
- Mỗi shot phải có đủ `cam` và `cam2` (trừ shot tĩnh), mọi nhân vật trong `cast`, đạo cụ then chốt của shot có `tam` + `kich` hoặc `cam_boi`.

Kết thúc: in tóm tắt tối đa 15 dòng: shot nào đạt, shot nào còn cảnh báo và vì sao, có dựng khối được không, có vẽ ảnh được không.
