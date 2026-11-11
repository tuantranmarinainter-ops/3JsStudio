---
name: sua-theo-lop
description: Điểm vào khi người dùng muốn sửa / tinh chỉnh một phần của tập phim — xác định đúng LỚP (canh, hieu-ung-hinh, phu-de, giong, tieng-anh, nen, buoc-chan, khoanh-khac), chỉ sửa file của lớp đó, chạy đúng một lệnh dựng lại `node tools/build.mjs <ep> <lớp>` rồi kiểm nhanh bằng tool có sẵn. Dùng BẤT CỨ KHI NÀO người dùng nói "sửa lớp…", "chỉnh…", "đổi tiếng…", "to/nhỏ quá", "lệch", "thêm/bớt…", "vào lớp…", hoặc góp ý về một cảnh/âm thanh/hiệu ứng cụ thể — kể cả khi không nhắc chữ "lớp".
---

# Sửa theo lớp

Bản đồ đầy đủ: `episodes/<ep>/LAYERS.md` (đọc khi cần chi tiết). Quy tắc: **chỉ đụng file của lớp người dùng nhắc**, không "tiện tay" sửa lớp khác.

## 1. Xác định lớp từ lời người dùng
| Người dùng nói về… | Lớp | Sửa ở | Skill chi tiết |
|---|---|---|---|
| góc máy, cảnh, model, nhân vật, nhà, cắt cảnh, màu hải đăng | `canh` | `shots.js`, `episode.js`, `engine/*.js` | scene-env, ref-model, r6-anim, kiem-tra-khung |
| màu cảnh, toả sáng, mờ hậu cảnh, viền, mưa trên màn hình | `hieu-ung-hinh` | `engine/post.js` | hieu-ung-hinh |
| chữ phụ đề, phông, vị trí chữ | `phu-de` | `captions.js`, `#cap` trong `index.html` | — |
| giọng đọc, đổi giọng, thêm giọng | `giong` | `narration.txt`, `voices/` | giong-doc |
| câu tiếng Anh, nhấn chữ khi cắt cảnh | `tieng-anh` | `tools/en/en_<ep>.py` | giong-doc |
| gió, sóng, mưa, côn trùng nền | `nen` | `sfx/layers.json` → `nen` | tieng-dong |
| tiếng "rầm" chân nhà | `buoc-chan` | `sfx/layers.json` → `buoc-chan` | tieng-dong |
| tiếng cửa, cá voi, giấy, sấm, tiếng thở… | `khoanh-khac` | `sfx/cues_*.json` | tieng-dong |
Nhiều lớp cùng lúc → làm lần lượt từng lớp, báo rõ đã đụng lớp nào.

## 2. Sửa → dựng lại đúng lớp
```bash
node tools/build.mjs ep001 <lớp>          # tự tải/trộn/tính lại phần phụ thuộc và gộp dist/ep001.html
node tools/build.mjs ep001 <lớp> --no-bundle   # khi còn sửa tiếp, gộp một lần ở cuối
```
`canh` tự chạy lại bước chân + tiếng nền (cú cắt/bối cảnh có thể đổi). `giong` KHÔNG tạo lại giọng CapCut/Edge (chậm) — dùng skill giong-doc.

## 3. Kiểm nhanh (chọn đúng tool, đừng viết script mới)
- Hình: `node tools/look.mjs episodes/ep001/index.html --shots s054,s056` (A/B, tất định: skill kiem-tra-khung).
- Mốc tiếng động: `node tools/sfx/cue-check.mjs ep001 --range a:b` → mở ảnh bảng.
- File âm thanh: `python tools/audio-check.py <glob>` (câm, quá ngắn, rè, lặng đầu).
- Xuất thật qua nút: `node tools/export-test.mjs dist/ep001.html --range a:b --matrix "fx=none,all;sfx=all"`.
- Sức khoẻ repo: `node tools/doctor.mjs ep001`.
Sau cùng: báo lớp đã sửa, file đã đổi, kết quả kiểm, link `dist/<ep>.html`.
