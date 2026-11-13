# ep003 — đề bài dựng shot theo khung (dùng chung cho các agent dựng shot)

Đọc trước: `CLAUDE.md` (luật camera "dồn dập", quy tắc kỹ thuật: hàm thuần của t), đầu file `engine/shottypes.js` (loại shot + tham số), `docs/chi-tiet-tu-claude-md.md` (ví dụ shot đầy đủ), skill `.claude/skills/kiem-tra-khung/SKILL.md`.

## Nguồn sự thật (gói kịch bản của người dùng)
- `kich-ban/ep003-goi/Shotlist_104.json` → `shots[]`: `id` (S001…), `title`, `set`, `camera` (cỡ cảnh, tiêu cự, góc, chuyển động), `action`, `cast` {MÃ: số emote}, `prompt`, `imageNote`. Đọc bằng `node -e` lọc đúng shot của mình, đừng đọc cả file 300 KB.
- Khung hình: `kich-ban/ep003-goi/shots/S0xx.jpg` (ảnh đích của từng shot). Xem bằng tool Read, mỗi shot 1 lần.
- `kich-ban/ep003-sb/moc.json`: mốc giây, ngày/đêm (`dem`), mặt từng nhân vật theo shot (tên emote đã đổi sẵn).
- Thiết kế: `kich-ban/ep003-goi/Thiet_ke_chung.md`, `episodes/ep003/nguon/thiet-ke-hinh.md`.

## Dữ liệu tập
- `episodes/ep003/episode.js` (KHÔNG sửa): diễn viên, `places` (điểm có tên của 4 env, toạ độ env; BẮC = −Z, ĐÔNG = +X), `props` chung.
- Diễn viên: hero (Gà), bach, mayor, mayor_ngu (thị trưởng đồ ngủ), linh_a, linh_b, banh, may, be_vang, be_ngoc, dan_a, dan_b, dan_c — đều thân R6 cao ~5,3–6 stud (bé ~4,5), mặt nhìn +Z khi ry=0; bap, gau_vi, gau_tui — gấu bông cao ~2,2.
- Mặt: ghi tên emote trong `face` (vd `face: "quyet_tam"`, hoặc trong `cast: { bach: { face: "cuoi_dac_y" } }`). 37 tên: xem `GA_FACES` trong `engine/r15.js`. Lấy đúng theo dòng chú thích phía trên mỗi shot.
- Animation: tên trong `R15_ANIMATIONS` (`engine/r15.js`) + `engine/anim-them.js` (sitUp, climb, drag, vanish, peek, putDown, ringBell, sleepy…). Thân R6 không gập khuỷu/gối: chọn động tác đọc được bằng vai/hông. Gấu: xem `engine/bear-glb.js` / `engine/bear.js` để biết animation gấu hỗ trợ.
- Shot ghi tường minh khi cần: `env`, `at` (tên place), `time: "dem" | "sang"`, `weather: "nang"`, `cam: { at | look, yaw, dist, dist2, h, fov, … }`, `cast: { <tên>: { at: [x,y,z] | "<place>", ry, anim, face, hold } }`, `props: { <tên>: { at: [x,y,z], ry } }` (đặt/hiện đạo cụ cho shot), `lightOverride: { exposure }`, `fn` (hàm thuần theo k/t khi cần điều khiển env, vd mở cửa). Đọc `engine/shottypes.js` + `engine/shots.js` + `engine/props-kb.js` (`ganDaoCu`: luật hiện/ẩn đạo cụ) để biết chính xác trường nào có.
- Đạo cụ có sẵn trong `engine/props-kb.js` (`PROPS_KB`): day_chuyen, dong_ho (báo thức), nhan_moi, cuon_sach, hop_nhan, dong_ho_quyt, vi, tui_tien, ket_ga, ket_tien, thung_go… Cần đạo cụ chưa khai trong episode.js → khai ở `PROPS_<CỤM>` đầu file shot của bạn (cùng định dạng `{ kit, at: "<place>", pos?, hold? }`).

## Yêu cầu mỗi shot
1. Bố cục khớp khung `S0xx.jpg`: cỡ cảnh, góc máy, ai ở đâu trong khung, vật chính ở đâu. Không cần giống từng điểm ảnh; cần đọc ra cùng một ý.
2. Đúng người, đúng mặt (emote), đúng hành động của `action`; đạo cụ đúng trạng thái câu chuyện (vd kệ trống sau khi mất đồ; đồng hồ thay dây chuyền; nhẫn bạc đêm 2).
3. Luật camera: mỗi shot có chuyển động rõ (`dist`→`dist2`, `fov`, lia) — 1 người thì đẩy vào, ≥ 2 người/vật lớn thì kéo ra; không cắt nửa người nhân vật chính; không để đồ che mặt. Shot < 0,7 s có thể gần tĩnh.
4. Liên tục: vị trí/hướng nhân vật và đạo cụ nối giữa các shot liền nhau cùng nơi; hướng chạy trái→phải như kịch bản.
5. Ánh sáng: `time` đúng ngày/đêm; độ sáng trung bình khung ngày 100–150, đêm ≥ 85 (cột "sáng" của look.mjs); mặt nhân vật cận cảnh đọc được.
6. KHÔNG đổi `id`, `dur`, `line`. Không sửa `engine/`, `episode.js`, file shot của cụm khác, `episodes/ep001`, `episodes/ep002`. Không chạy git.

## Kiểm
- Chụp shot của mình: `PROFILE=1 node tools/look.mjs episodes/ep003/index.html --shots s016,s017 --out output/ep003/<tên-agent>` (mở trang ~30–60 s; gom nhiều shot một lần, đừng chụp từng shot).
- So với khung gốc: `PROFILE=1 node tools/look.mjs episodes/ep003/storyboard/index.html --ab episodes/ep003/index.html --shots s016,s017 --out output/ep003/<tên-agent>/ab` → bảng cặp khung gốc | bản dựng. MỞ bảng ra xem (ảnh ≤ 1600 px), sửa, chụp lại. Tối đa 3 vòng mỗi nhóm shot; còn lệch thì ghi vào báo cáo.
- Lỗi cần sửa engine/env (thiếu vật, thiếu animation, cửa không mở…) → KHÔNG tự sửa; ghi vào báo cáo: shot nào, cần gì.

## Báo cáo (≤ 20 dòng, không dán code)
Số shot đạt / chưa đạt (liệt kê id + lý do 1 dòng), đạo cụ đã khai thêm, việc cần người điều phối làm (engine/env/episode.js), đường dẫn bảng so cuối cùng.
