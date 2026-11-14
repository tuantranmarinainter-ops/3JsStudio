# Ghép mã blocky-shorts vào engine — handoff

<!-- ĐIỂM DỪNG: tối đa 25 dòng. GHI ĐÈ cả khối mỗi lần cập nhật, không nối thêm. -->
## ĐIỂM DỪNG
- **Cập nhật:** 2026-11-14 22:00
- **Nhánh:** `ep1-v2` (chưa push phần mới; push cũ tới dc161c0)
- **Đang làm:** không. Việc (a) và (b) đã xong, đã commit; dừng chờ người dùng
- **Đã xong:** (a) cỡ `can` nới `S` 2.8 → 3.8, `y` 4.3 (`engine/blocky/co-canh.js`); Haiku xem ảnh `output/blocky-can/`: đầu không cắt ở đầu/giữa/cuối shot, vai thấy rõ lúc đầu, cuối shot thân đỏ chạm hai mép khung. (b) động tác chồng lớp: `engine/blocky/chong.js` + hook `placeCast` trong `engine/shots.js` + ô FX `chongLop` (mặc định tắt) trong `engine/post.js`
- **Cách dùng (b):** diễn viên ghi `cast: { hero: { do: [{ a: 'wave', arm: 'R', t: [0.3, 1.5] }, { a: 'nod', t: [1.8, 2.6] }] } }`; `t` = giây từ đầu shot, thiếu = cả shot; mờ vào/ra 0,12 s; `a` = tên trong `ACTIONS` (`engine/blocky/poses.js`). Ví dụ: `engine/shot-lab.html?type=chong` (`&chong=0` tắt)
- **Kiểm:** bật/tắt: khung trước mốc giờ giống hệt, khung trong mốc khác; `look.mjs --det` OK; test mới `tools/tests/chong-lop.test.mjs`, `co-canh.test.mjs`; `npm test` chỉ hỏng các test có sẵn (shot ep002, HOUSE bbox) + `ghi-cong` flaky (chạy lại pass)
- **Chưa làm:** `--pose-ref` không dùng được trên shot-lab (trang không có xương); chưa bật `do` ở tập thật; chưa thêm mục "động tác một phần" vào skill `r6-anim`
- **File đang dở (chưa commit):** `episodes/ep004/index.html` (của phiên Tập 5), `docs/tien-do.json` (có thay đổi của phiên khác)
- **Câu hỏi còn mở:** có bật idle sống mặc định cho tập mới không (hiện chỉ ep004 bật)
<!-- /ĐIỂM DỪNG -->

## Việc còn lại (theo thứ tự)
1. (xong) cỡ `can`.
2. (xong) động tác chồng lớp — còn: mục `do` trong skill `r6-anim`, thử trên một shot tập thật.
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
