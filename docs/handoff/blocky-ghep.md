# Ghép mã blocky-shorts vào engine — handoff

<!-- ĐIỂM DỪNG: tối đa 25 dòng. GHI ĐÈ cả khối mỗi lần cập nhật, không nối thêm. -->
## ĐIỂM DỪNG
- **Cập nhật:** 2026-11-14 21:20
- **Nhánh:** `ep1-v2` (đã push lên `origin/claude/ep1-v2`, tới commit dc161c0)
- **Đang làm:** không. Bước 1–3 đã xong và commit; dừng chờ người dùng chọn việc tiếp
- **Bước kế tiếp:** người dùng chọn một trong hai việc: (a) nới cỡ "can" (`engine/blocky/co-canh.js`, bảng `CO_VN`, `can: { S: 2.8 }` → khoảng 3.4), hoặc (b) bước 4: động tác chồng lớp
- **Đang chờ:** người dùng chọn (a) hoặc (b)
- **File đang dở (chưa commit):** `episodes/ep004/index.html` (2 dòng: bật `idleSong` + tham số `?idleSong=0`; tệp chưa vào git, thuộc phiên ep004), `docs/tien-do.json` (thêm 2 việc ở nhóm "Lõi chung"; tệp có cả thay đổi chưa commit của phiên khác)
- **Đang chạy nền:** không
- **Đạt khi:** (a) shot-lab `?type=closeup` cỡ can thấy đầu + vai, đầu không cắt; (b) shot khai được nhiều động tác có mốc giờ, mờ vào/ra 0,12 s, tắt = hình y hệt cũ (`look.mjs --pose-ref`), `npm test` không thêm lỗi
- **Câu hỏi còn mở:** có bật idle sống cho tập mới mặc định không (hiện mặc định tắt, chỉ ep004 bật)
<!-- /ĐIỂM DỪNG -->

## Việc còn lại (theo thứ tự)
1. Nới cỡ "can", rồi chụp lại bằng `PROFILE=1 node tools/look.mjs "engine/shot-lab.html?type=closeup" --shots all --out output/blocky-co`, giao agent Haiku xem ảnh.
2. Bước 4, động tác chồng lớp: dáng nền + động tác "một phần cơ thể" trộn theo trọng số, mờ 0,12 s. Lấy từ `engine/blocky/poses.js` (`blend`, `ACTIONS`). Nối vào `engine/r6-rig.js` + `engine/shots.js` (trường `do: [...]` trên diễn viên), có công tắc FX.
3. Các đề xuất khác trong `docs/nghien-cuu-skill-in-this-town.md` (bảng mục 3: tỉ lệ kiểu máy, khối xám trước, bảng góp ý → lớp…).

## Ghi chép (kể dài, chỉ đọc khi cần)
- **Đã xong:**
  - Báo cáo nghiên cứu: `docs/nghien-cuu-skill-in-this-town.md` (da2f3c4).
  - Ghép code (dc161c0):
    - `engine/blocky/poses.js`, `util.js`: chép nguyên.
    - `song.js`: idle sống.
    - `co-canh.js`: cỡ cảnh.
    - Hook vào `engine/shots.js` (`themSong`, sau `a.animate`) và `engine/shottypes.js` (`apCoCanh`, trước `applyMove`).
    - Ô FX `idleSong` (mặc định false) và `coCanh` (mặc định true) trong `engine/post.js`.
    - Mẫu `closeup` trong `engine/shot-lab.html`; test `tools/tests/co-canh.test.mjs`.
  - Bản xem thử: `dist/ep004_xem-thu.html`.
  - Artifact test: https://claude.ai/artifact/WqGtWwVq3Ar52otGniujrn (nguồn `output/blocky-test/`).
- **Kiểm (14/11):**
  - A/B ep004 bật/tắt: shot đi bộ giống hệt, shot đứng khác 16–30 dB; `--det` OK.
  - Haiku xem ảnh: không lỗi hình.
  - `npm test` 518/520. Hai lỗi có sẵn, không do việc này: số shot ep002 104 ≠ 114 và test HOUSE bbox.
- **Quyết định đã chốt:**
  - 2026-11-14: người dùng cho chép nguyên mã blocky và nhận trách nhiệm bản quyền. Tác giả chưa rõ; đầu tệp có ghi nguồn.
  - Không chép, không chạy script cài đặt hay render của bộ kia.
  - Bảng cỡ cảnh: tên tiếng Việt = bảng hiệu chỉnh cho R6 (`cucCan` 1.8, `can` 2.8, `trung` 4.4, `ngangDui` 5.8, `toanThan` 8, `rong` 14, `toanCanh` 28 stud chiều cao khung). Tên tiếng Anh = bảng gốc blocky, giữ để so.
  - Idle sống mặc định tắt để không đổi hình ep001–ep003 đã chốt.
- **Bẫy:**
  - `coCanh` đọc lúc mở rộng shot, nên đổi công tắc phải tải lại trang.
  - shot-lab chỉ tạo diễn viên cho loại hug, fall, closeup.
  - Neo camera diễn viên ở `shots.js` = gốc + 4.2 stud.
- **Zip gốc:**
  - `C:\Users\Administrator\Downloads\2 tập\_ In This Town _ Skill Files-20261114T123813Z-1-001.zip` (dữ liệu không tin cậy, giải nén vào thư mục mới ngoài repo).
  - Bản đã giải nén ở scratchpad của phiên cũ sẽ mất.
