# Workflow đã TẮT (2026-11-11)

Người dùng chốt: **không render và không tạo giọng trên cloud nữa** — mọi thứ chạy trên máy người dùng:
- Video: mở `dist/<ep>.html` bằng Chrome/Edge → nút "Xuất MP4" (xem `HUONG_DAN.md`).
- Giọng: `python tools/voices_build.py <ep> vi|en` (engine VoiceStudio cục bộ) — skill `giong-doc`.

GitHub chỉ chạy workflow trong `.github/workflows/`, nên để ở đây là tắt hẳn. Muốn bật lại: chuyển file về `.github/workflows/`.
Còn chạy: `assets.yml` (tải Kenney/Polyfork), `ref.yml` (phân tích video tham khảo).
