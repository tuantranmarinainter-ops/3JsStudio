---
name: kiem-tra-khung
description: Kiểm tra khung hình của tập phim three.js trước khi báo người dùng — chụp các mốc / giữa mọi shot thành bảng có nhãn shot+giây, so trước/sau (A/B, PSNR), kiểm tất định (tua tới/lui ra cùng hình), soi chữ tiếng Việt và phụ đề đè hình. Dùng BẤT CỨ KHI NÀO vừa sửa shot/camera/env/hiệu ứng/phông/giọng, trước khi gửi ảnh/video/HTML cho người dùng, hoặc khi người dùng nói "xem thử", "chụp", "so sánh", "đã đẹp chưa", "có bị lệch không" — kể cả khi không nhắc tên skill.
---

# Kiểm tra khung

Luôn MỞ ẢNH RA XEM (Read) trước khi kết luận; báo trung thực cái đã kiểm và chưa kiểm.

## Lệnh
- Bảng khung: `node tools/look.mjs episodes/ep001/index.html --shots s054,s056` | `--t 12.5,30` | `--range 61:67:0.4` | `--shots all`
  (nhãn shot id + t; PNG 540×960, `--full` = 1080×1920; `--query "lang=en&fx=none"`, `--opts '{"lang":"en"}'`).
- Trước/sau: `--ab <trang khác>` → bảng A|B + PSNR (∞ = giống hệt; > 35 dB = chỉ khác nén/nhiễu).
- Tất định: `--det` → sai khác lớn nhất 0–255 mỗi t (≤ 2 là nhiễu GPU bình thường; lớn hơn → có thứ phụ thuộc giờ thực/thứ tự seek).
- Xuất thật: `node tools/export-test.mjs dist/ep001.html --range a:b --matrix "lang=vi,en;subs=1,0;voice=1,0"`.
- Toàn repo: `node tools/doctor.mjs ep001`.

## Nhìn gì trong ảnh
- Chủ thể đọc được trong khung dọc 9:16; nhà/nhân vật không bị cắt đầu; camera đúng ý shot.
- Phụ đề (Be Vietnam Pro Black) không đè lên chữ trong cảnh (bưu thiếp — lỗi đã biết ở cảnh thiếp núi), dấu tiếng Việt đúng.
- Chữ viết tay bưu thiếp (Patrick Hand) đọc được, đúng ngôn ngữ đang chọn.
- Asset không thiếu (khối xám = GLB không tải), hải đăng màu xanh (đã chốt), cá voi/nước văng ở s054–s056.
- Bật/tắt từng hiệu ứng hình (`?fx=none` vs mặc định) phải khác đúng chỗ, tắt hết phải giống bản gốc.
- Lỗi `net::ERR_FILE_NOT_FOUND` khi mở bản gộp: 14 texture nhân vật Codex chưa có trong repo — engine tự dùng bản dự phòng, không phải lỗi mới.
