---
name: tieng-dong
description: Làm và sửa TIẾNG ĐỘNG (hiệu ứng âm thanh) cho tập phim theo 3 lớp — nền (gió, sóng, mưa theo bối cảnh), buoc-chan (tiếng "rầm" đúng khung chân nhà chạm đất), khoanh-khac (cửa, cá voi, giấy, sấm… theo khung hình) — tải âm thanh miễn phí CC0/CC BY dùng được trên YouTube, trộn thành track riêng từng lớp, kiểm mốc trên khung hình, ghi công. Dùng BẤT CỨ KHI NÀO người dùng nói "tiếng động", "hiệu ứng âm thanh", "SFX", "âm thanh nền", "tiếng bước chân", "tiếng rầm", "đổi tiếng…", "to/nhỏ quá", "lệch tiếng", "thêm tiếng…" — kể cả khi không nhắc tên skill.
---

# Tiếng động theo lớp

Dữ liệu ở `episodes/<ep>/sfx/`, track ra `episodes/<ep>/sfx_<lớp>.ogg`, trình phát có bật/tắt + âm lượng từng lớp (người xem chỉnh không cần dựng lại).

## Lớp và file
| Lớp | Sửa | Ghi chú |
|---|---|---|
| `nen` | `sfx/layers.json` → `nen.map` (bối cảnh → cụm từ), `night`, `boost`, `vol`, `fade` | bối cảnh lấy từ `env`/`light` trong `shots.js` |
| `buoc-chan` | `sfx/layers.json` → `buoc-chan` (`sound`, `near`, `offscreen`, `refDist`, `shift`) | mốc `sfx/steps.json` do `tools/sfx/steps.mjs` tính từ chuyển động chân (không sửa tay) |
| `khoanh-khac` | `sfx/cues_*.json`: `[{t, name, vol, dur?, offset?, align?, shot, why}]` (`align: "peak"` cho tiếng va chạm: đỉnh rơi đúng t; `offset` = bỏ giây đầu file) | `t` giây tuyệt đối, đặt đúng khung hình; `name` = cụm tiếng Anh CỤ THỂ 2–4 chữ ("wooden door creak", "big water splash"), không mơ hồ |
Dựng lại: `node tools/build.mjs ep001 nen|buoc-chan|khoanh-khac` (tự tải tiếng thiếu → trộn → gộp HTML). Cả 3: `tieng-dong`.

## Quy tắc âm thanh
- Chỉ **CC0 / CC BY** (`tools/sfx/fetch.py` tự lọc trên Openverse/Freesound). Mỗi lần thêm tiếng CC BY → `assets/sfx/CREDITS.md` tự cập nhật; nhắc người dùng dán vào mô tả YouTube.
- Tiếng động nằm DƯỚI giọng đọc: vol spot 0.4–0.6, chi tiết nhỏ 0.2–0.3; track mỗi lớp chuẩn hoá đỉnh −6 dBFS.
- Không đặt tiếng "rầm" chân nhà trong cues (lớp buoc-chan lo); không đặt tiếng nền liên tục trong cues (lớp nen lo).
- Whoosh chuyển cảnh chỉ ở vài chỗ đổi địa điểm lớn.
- Tiếng tải về kém (quá ngắn, sai loại) → đổi `name` cụ thể hơn, hoặc thêm vào `ALIAS` trong `tools/sfx/mix.py`, hoặc `python tools/sfx/fetch.py "<cụm mới>" --force`.

## Làm danh sách khoảnh khắc cho đoạn mới (nhiều agent song song)
Chia theo dải shot (~50 shot/agent, model sonnet), mỗi agent CHỈ ghi `sfx/cues_<sA>-<sB>.json`. Brief phải có: cốt truyện ngắn, định dạng cue, 3 quy tắc trên, và bắt buộc **soi mốc trên khung hình** bằng `node tools/sfx/cue-check.mjs <ep> --range a:b` (mở ảnh bằng Read) trước khi trả kết quả. Agent chính gộp, trộn, nghe kiểm.

## Kiểm
1. `node tools/sfx/cue-check.mjs ep001 --range a:b` (hoặc `--steps`) → bảng khung quanh từng mốc, khung đúng mốc viền đỏ.
2. `python tools/audio-check.py assets/sfx/*.mp3 episodes/ep001/sfx_*.ogg` → câm / quá ngắn / rè.
3. `episodes/ep001/sfx_layers.json` → mục `missing` từng lớp (tiếng chưa có).
4. Xuất thật: `node tools/export-test.mjs dist/ep001.html --range a:b --matrix "sfx=none,all,nen+khoanh-khac"`.
