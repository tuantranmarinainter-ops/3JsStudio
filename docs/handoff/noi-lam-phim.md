# Cho lam-phim nhận kit — handoff

<!-- ĐIỂM DỪNG: tối đa 25 dòng. GHI ĐÈ cả khối mỗi lần cập nhật, không nối thêm. -->
## ĐIỂM DỪNG
- **Cập nhật:** 2026-11-15
- **Nhánh:** `claude/noi-lam-phim-1705ab` (đã gộp `ep1-v2` vào vì worktree xuất phát từ `main` cũ; xung đột `assets/manifest.json`, `engine/skies.js` lấy bản ep1-v2)
- **Đang làm:** xong — nhánh kit của `tools/lam-phim.mjs` + SKILL + test
- **Bước kế tiếp:** chạy thật trên tập kit có episode.js: `node tools/lam-phim.mjs <ep> tiep` rồi `--duyet-kit`
- **Đang chờ:** người dùng quyết định merge nhánh vào ep1-v2 (không push/merge)
- **File đang dở (chưa commit):** không
- **Đang chạy nền:** không
- **Đạt khi:** lam-phim nhận bản sao kit, test mới + cũ pass — ĐÃ ĐẠT (7 test kit + 21 test cũ)
- **Câu hỏi còn mở:** merge: nhánh có commit gộp ep1-v2; nên merge vào ep1-v2 hay cherry-pick 1 commit tính năng?
<!-- /ĐIỂM DỪNG -->

## Ghi chép
- `tools/lam-phim.mjs`: `kitDir()` (dòng 64) nhận kit; `HK['kich-ban'|asset|'mau-duyet'|shot]` (354–405) thay H khi có kit; `buocXuLy` (407); lời kể từ `bang-shot.thoai` (410, 441); `chay(..., {that})` chạy kiem-kit/kit-shots THẬT cả ở LAM_PHIM_GIA (149); cờ `--kit`, `--cu`, `--duyet-kit` (main, ~600–620).
- Quyết định: bước `shot` kit chỉ băm theo kit (không theo narration.json) để khỏi ghi đè chỗ "CẦN SỬA TAY" khi giọng xong; kit đổi → sao lưu shots.js cũ. `mau-duyet` kit = MỐC duyệt kit (trạm 10), `duyet-kit.json` kèm hash kit. episode.js/index.html KHÔNG tự sinh (canAgent).
- Test: `tools/tests/lam-phim-kit.test.mjs` (bản sao JSON kit ở `output/_tmp/noi-lam-phim/`, env goc.json đổi sang `town`); nguồn kit: `LAM_PHIM_KIT_NGUON` > `kich-ban/ep004` > fixtures/dau-vao-mau. Cũng pass với bản sao ep004 thật.
- Chưa kiểm: chạy thật (không giả) tts/ra-loi/am-thanh/gop trên tập kit; ep004 chưa có env `e4-nha-may` trong `engine/envs.js` của nhánh này (ở checkout chính chưa commit) nên asset sẽ báo canAgent nếu không đổi goc.json.
- Cập nhật kèm: SKILL.md lam-phim (mục "Hai đầu vào"), docs/quy-trinh-kich-ban-tinh.md (bỏ ⚠ lam-phim chưa nhận kit).
