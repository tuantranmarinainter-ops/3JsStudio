# Nối codex-ve với danh sách mốc bối cảnh — handoff

<!-- ĐIỂM DỪNG: tối đa 25 dòng. GHI ĐÈ cả khối mỗi lần cập nhật, không nối thêm. -->
## ĐIỂM DỪNG
- **Cập nhật:** 2026-11-15
- **Nhánh:** `claude/noi-codex-ve-5d6aed` (tạo lại từ `ep1-v2` @ cadc0e5; nhánh cũ lệch `main`, không có file cần sửa)
- **Đang làm:** xong — `codex-ve.mjs tham-chieu` đọc `boi-canh/<id>.json` + tự đính kèm ảnh khối xám
- **Bước kế tiếp:** áp cho tập thật (chưa làm): tạo `boi-canh/<id>.json` + ảnh khối xám, chạy `node tools/codex-ve.mjs tham-chieu <tập> --thu` xem đề bài
- **Đang chờ:** không
- **File đang dở (chưa commit):** không
- **Đang chạy nền:** không
- **Đạt khi:** `--thu` trên bản sao có đủ mục; `-i` có khối xám khi file tồn tại; test pass; đường cũ không đổi — ĐẠT
- **Câu hỏi còn mở:** không
<!-- /ĐIỂM DỪNG -->

## Việc còn lại
1. Chưa kiểm với Codex thật: Codex có tôn trọng "vẽ chồng" và mốc không (chỉ test bằng Codex giả).
2. Nhiều bc_ trong một cụm → mọi ảnh khối xám của cụm đều vào `-i` (đề bài ghi rõ ảnh nào của bc nào); nếu Codex lẫn thì tách mỗi bc một cụm.

## Ghi chép
- `tools/codex-ve.mjs`: `duongKhoiXam/duongMoc/CAU_BAT_BUOC_KHOI_XAM` (xuất), `lapKeHoach(..., {docMoc})`, `moMocBoiCanh()`; `chay` đọc file mốc, JSON hỏng → thoát 2.
- Mốc có `bat:false` bị bỏ qua. Mục không có trong file (phongCach, lapDay, vaiTro…) thì bỏ dòng đó, không lỗi.
- Test mới: 4 ca cuối `tools/tests/codex-ve.test.mjs` (dùng `fixtures/boi-canh-mau/moc-nha-may-ngoai.json` + Codex giả). 42/42 pass cùng `kiem-bang-shot.test.mjs`.
- Quy ước đường dẫn ghi ở `docs/quy-trinh-dau-vao.md`. Mục bước 8 trong `docs/quy-trinh-kich-ban-tinh.md` còn dòng ⚠ "cần sửa" — chưa sửa (ngoài phạm vi).
