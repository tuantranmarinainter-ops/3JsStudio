# Nối video-sang-kich-ban → xu-ly-kich-ban — handoff

<!-- ĐIỂM DỪNG -->
## ĐIỂM DỪNG
- **Cập nhật:** 2026-11-15
- **Nhánh:** `claude/noi-video-kb-9972ac` (đã đưa lên nền `ep1-v2` @ cadc0e5 vì nhánh gốc cắt từ main cũ, thiếu skill/xu-ly-kich-ban)
- **Đang làm:** xong, đã commit
- **Bước kế tiếp:** chạy thử với video thật: `python tools/video2kb.py <video> --ra kich-ban-chu`
- **Đang chờ:** người dùng duyệt/merge nhánh (chưa push, chưa merge)
- **File đang dở (chưa commit):** không
- **Đang chạy nền:** không
- **Đạt khi:** 2 file sinh được từ dữ liệu mẫu, skill cập nhật, test pass — ĐÃ ĐẠT
- **Câu hỏi còn mở:** ngưỡng độ chuyển động (0,04 / 0,12) là đoán, chưa hiệu chỉnh trên video thật
<!-- /ĐIỂM DỪNG -->

## Ghi chép
- Mới: `tools/video2kb_chu.py` (hàm thuần: số liệu format, `phan-tich-format.md`, khung `kich-ban.md`; không ghi lời nguồn, chỉ đếm câu/ký tự).
- `tools/video2kb.py`: cờ `--ra storyboard|kich-ban-chu|ca-hai` (mặc định `storyboard` = đường cũ nguyên vẹn), `--tu-shots shots.json` (không cần video), trường `dong` (độ chuyển động thô đầu↔cuối) ghi vào shots.json.
- `kich-ban.md` có sẵn thì không bị đè (cần `--force`).
- Skill `video-sang-kich-ban`: mục 0 chọn đầu ra, 2A đường mới, 2B đường cũ. Skill `xu-ly-kich-ban`: thêm Lối 3.
- Test: `tools/kb/tests/test_video2kb_chu.py` (6 ca) + dữ liệu `tools/tests/fixtures/video-cat-mau/`. `python -m unittest discover -s tools/kb/tests` → 64 OK.
- Tỉ lệ loại shot (11 loại) do Claude điền vào `shots.json` (`loai`) sau khi xem khung; tool chỉ đo chuyển động tự động.
- Chưa kiểm: chạy với video thật (cần ffmpeg/yt-dlp/GPU), độ chính xác của `dong`.
