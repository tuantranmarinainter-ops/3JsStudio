# Dọn repo — handoff

<!-- ĐIỂM DỪNG -->
## ĐIỂM DỪNG
- **Cập nhật:** 2026-11-15
- **Nhánh:** `ep1-v2`
- **Đang làm:** xong — dọn repo, 3 commit (chưa push)
- **Bước kế tiếp:** người dùng quyết 3 mục "Câu hỏi còn mở"
- **Đang chờ:** người dùng quyết nv-*, ogg ep001, thư mục `_vao`
- **File đang dở (chưa commit):** 6 file phiên khác (r15.js, ep001/episode.js, props-kb.test.mjs, tien-do.json, duyet.md, quy-trinh-so-do.html) + nv-* + 1 ogg ep001
- **Đang chạy nền:** không
- **Đạt khi:** git status chỉ còn file phiên khác; `git ls-files engine/ga-rig.js` có — ĐẠT
- **Câu hỏi còn mở:**
  - `engine/nv-6khoi*.{js,html}`, `engine/nv-js*.{js,html}`: chỉ ep004/ep005 (đã ignore) import → để untracked, chưa commit. Commit / ignore / xoá?
  - `episodes/ep001/voices/vi/multi_female_yangguangnv_uranus_bigtts.ogg` untracked (ngoài phạm vi): thuộc phiên ep001?
  - `kich-ban/_vao/` (~100 file .srt greenbro, transcript kênh khác): đã ignore; ý định có phải để tham khảo cục bộ?
<!-- /ĐIỂM DỪNG -->

## Ghi chép
Commit: d30101f (bộ Gà + công cụ + HANDOFF-ga.md), d89fe32 (ep003 sfx_layers.json + 2 docs blocky), 6ac8107 (.gitignore).
- refs/: 25 file đã track giữ nguyên (ignore chỉ chặn file mới). kich-ban: chặn goi, goi2, sb, _vao, và phần chưa track của kit/kit2; ep003-de-bai-2 + file kit đã track giữ nguyên.
- Mục 2: thư mục `"kich-ban/_vao` KHÔNG tồn tại; đó chỉ là git trích dẫn tên file có emoji/Unicode (`"kich-ban/_vao/greenbro/…srt"`). Chỉ có `kich-ban/_vao` duy nhất.
- Gà: atlas.webp/json, dims.json, front/back.png, faces/, hood.glb và tools/blender/ga_hood.py đều đã track; `GA_FACE_MAP` có sẵn ở r15.js HEAD → không cần commit r15.js.
- HANDOFF-ga.md giữ ở gốc vì HANDOFF-quy-trinh.md tham chiếu đường dẫn đó.
- doctor ep001: không báo thiếu Gà; còn ✘ characters/bap* thiếu "pose" trong manifest và ⚠ no-gau thiếu ghi công (có từ trước, ngoài phạm vi).
