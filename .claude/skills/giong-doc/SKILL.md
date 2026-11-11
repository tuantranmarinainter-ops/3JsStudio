---
name: giong-doc
description: Tạo và quản lý giọng đọc nhiều giọng cho một tập — 22 giọng Việt CapCut (qua engine VoiceStudio của người dùng) và 47 giọng Anh Microsoft Edge đọc nhấn đúng cú cắt cảnh, kèm phụ đề tiếng Anh theo mốc từng chữ, trang nghe thử để người dùng chọn giọng, rồi ghép giọng đã chốt vào trình phát. Dùng BẤT CỨ KHI NÀO người dùng nói "giọng đọc", "lồng tiếng", "đổi giọng", "nghe thử giọng", "thêm tiếng Anh", "phụ đề tiếng Anh", "CapCut", "Edge TTS", "VoiceStudio", hoặc sửa lời kể / cú cắt làm lệch giọng — kể cả khi không nhắc tên skill.
---

# Giọng đọc nhiều giọng

## Nguồn giọng
- **Tiếng Việt — CapCut** (22 giọng, danh sách `tools/voice_studio/voices-capcut.txt`, cột `vi-VN`). Chạy bằng python của
  VoiceStudio: `S:\ChatGPT\MMO TOOL\TTS1\.venv\Scripts\python.exe` (có miniaudio/requests). **Chỉ đọc/gọi, KHÔNG ghi gì vào
  thư mục TTS1**; đặt `PYTHONDONTWRITEBYTECODE=1`. Engine giống hệt `tools/voice_studio/` (không sửa logic engine).
  ~2 s/câu, 2 câu song song. Lỗi "CapCut báo tác vụ thất bại" thường thoáng qua → chạy lại (câu xong nằm trong `.cache/tts/`).
  Giọng chậm được `tools/tts.py` tự tăng tốc ≤ ×1,4 để câu bắt đầu đúng `@at`.
- **Tiếng Anh — Microsoft Edge** (47 giọng `en-*`, python hệ thống có `edge-tts`). Mặc định `en-US-AndrewMultilingualNeural`.

## Tiếng Anh: đọc nhấn ở cú cắt
1. `python tools/en/beats.py ep001 --keep s055 > episodes/ep001/beats.json` — chia lời kể theo cú cắt (nhịp ≥ 1,15 s).
2. Lời Anh từng nhịp: `tools/en/en_ep001.py` (từ khoá đặt ĐẦU cụm; ~3 từ/giây; quá dài thì rút câu, đừng để tốc độ > +30%).
3. `python tools/en/tts_en.py ep001 [--voice <id>] [--out <tiền tố>] [--until 26.4]` — mỗi nhịp đặt tại cú cắt +0,04 s,
   tự tăng rate/atempo cho vừa khung; phụ đề cụm 1–3 chữ từ WordBoundary (khớp lại dấu câu).
   Đổi `shots.js` (cú cắt) → chạy lại bước 1 rồi 3; `node tools/doctor.mjs` báo khi nhịp lệch.

## Nhiều giọng: nghe thử → chốt → cả phim → ghép
- `python tools/voices_build.py ep001 sample` → đoạn ~26 s cho MỌI giọng + `output/nghe-thu/index.html` (nút ▶, ô "Giữ",
  "Chép danh sách"). Mở bằng Chrome cho người dùng duyệt. **Ưu tiên gửi trước mẫu giọng mặc định** (Giọng Bé + Andrew).
- Người dùng gửi "Giữ các giọng: id1, id2…" → `python tools/voices_build.py ep001 vi --only <id…>` và `… en --only <id…>`
  (cả phim) → `python tools/voices_build.py ep001 index` (nén .ogg Opus 32k + ghi `voices/index.json`).
- **Chỉ ghép vào HTML sau khi người dùng chốt** (bản chưa duyệt để tên `voices/index.chua-duyet.json`). Rồi chạy skill `xuat-phim`.
- Trình phát: ô Ngôn ngữ + ô Giọng (lọc theo ngôn ngữ) + Phụ đề/Giọng đọc bật tắt; tên file xuất có `_<voiceId>`.

## Giọng chậm: canh khớp phim hoặc loại
- Nhóm CapCut `*_uranus_bigtts` KHÔNG nhận tham số tốc độ và có ngừng dài → tts.py trễ dồn (bản cả phim dài 195–251 s).
- `python tools/fit_voice.py --auto episodes/ep001/voices/vi` (hoặc 1 file, `--max-tempo 1.3`): cắt lặng, rút ngừng,
  tăng tốc vừa đủ, mỗi câu đặt đúng `@at`; bản gốc giữ ở `<id>.raw.mp3/.json`.
- Người dùng chốt (2026-11-11): **giọng nhanh thì giữ, chậm quá thì bỏ**. Tiêu chí đã dùng: Việt < ~20 ký tự/giây hoặc bản gốc
  dài hơn phim > 1 s → bỏ; Anh: rate trung bình > ~+20% hoặc phải nén atempo ≥ ×1,2 ở nhiều nhịp → bỏ.
  Danh sách giữ: `output/giong-da-chot.txt` (dòng 1 Việt, dòng 2 Anh). Bước `index` chuẩn hoá âm lượng −18 LUFS.

## Ghi công
Edge/CapCut: ghi nguồn giọng trong README tập khi đăng. Âm thanh CC BY (tiếng động) ghi vào CREDITS.
