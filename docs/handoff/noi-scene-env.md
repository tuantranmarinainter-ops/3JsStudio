# Nối scene-env với danh sách mốc (khối xám) — handoff

<!-- ĐIỂM DỪNG -->
## ĐIỂM DỪNG
- **Cập nhật:** 2026-11-15
- **Nhánh:** `claude/noi-scene-env-13ebfc` (đã đưa lên đầu `ep1-v2` = cadc0e5 rồi thêm commit của việc này)
- **Đang làm:** xong phần việc được giao (công cụ + skill + test)
- **Bước kế tiếp:** người dùng duyệt 2 ảnh `output/_tmp/khoi-xam/nha-may-ngoai_*.png`; bổ sung `vung` đủ x/y/z cho 18 mốc bị liệt kê trong file mốc
- **Đang chờ:** người dùng duyệt ảnh; phiên điều phối quyết định merge
- **File đang dở (chưa commit):** không
- **Đang chạy nền:** không
- **Đạt khi:** chạy trên fixture ra 2 ảnh, test pass, skill có Pha 0 (đạt)
- **Câu hỏi còn mở:** mốc ghi "cao N" / "tâm [x,y]" có nên được đọc thành vùng không (hiện KHÔNG, để khỏi đoán)
<!-- /ĐIỂM DỪNG -->

## Việc còn lại
1. Duyệt ảnh; 2. sửa `vung` các mốc thiếu số; 3. (tuỳ chọn) khuôn mốc thêm trường `vung` có cấu trúc `{x:[a,b],y:[..],z:[..]}` thay chuỗi.

## Ghi chép
- Dùng: `node tools/khoi-xam.mjs <boi-canh.json> --out <thư mục> [--w 540 --h 960]`.
- Đọc vùng (`tools/kiem/khoi-xam-doc.mjs`, thuần): "x a..b" khoảng; "x a" mặt mỏng dày 0,2; "x ±a"; lần đầu của mỗi trục thắng; thiếu y mà x,z là khoảng → tấm nằm trên đất. Thiếu trục khác → không dựng, liệt kê.
- Trên fixture ep004: 6 hộp (tuong, kinh, bau, thung, san, phong-trong), 2 hình nộm cao 5,48, 1 khối 1×1×1, sàn 32×24; 18 mốc không đọc được số (anh-hat, ong, day-dien, hop-cau-dao, binh-cuu-hoa, thang, ke-gia, xich-treo, thung-chong, pallet, phuy, bao-tai, xe-day, bien-canh-bao, den-do, den-tuong, rao-non, hau-canh).
- Lưu ý: `phong-trong` (chỉ có x, z) bị dựng thành tấm trên đất vì không có y; đó là hệ quả quy tắc, không phải số thật (sàn nâng 3,4).
- Camera: trên cao fov 40 nhìn thẳng xuống (+X phải, +Z xuống đáy ảnh); ngang mắt fov 55 ở y 4,75, rìa +Z, nhìn vào giữa. Khung theo sàn `kichThuoc.san`, không theo tường 48.
- Hạ tầng: `tools/browser.mjs` + `vendor/three`; trang dựng nằm trong chuỗi của `tools/khoi-xam.mjs` (không file engine mới).
- Sự cố nhánh: worktree ban đầu ở `main` cũ, thiếu docs/tools mới → `git reset --keep ep1-v2`.
- File: `tools/khoi-xam.mjs`, `tools/kiem/khoi-xam-doc.mjs`, `tools/tests/khoi-xam.test.mjs`, `.claude/skills/scene-env/SKILL.md` (Pha 0), `docs/quy-trinh-kich-ban-tinh.md` (bước 7).
