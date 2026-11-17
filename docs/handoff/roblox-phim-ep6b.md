# ep6B → phim chạy trong Roblox Studio — handoff

## ĐIỂM DỪNG
- **Cập nhật:** 2026-11-17 (phiên con "roblox-phim làm thử") — DỪNG theo luật 3 lần, chờ người dùng duyệt / quyết hướng
- **Đã xong:** đoạn thử 19,9 s = 15 shot phòng Gà s017–s022 + s024–s032 (bỏ s023, không thuộc phòng) phát được trong Studio (Play): R6 Gà + gấu Bắp + 33 đạo cụ dựng bằng Part, camera Scriptable, mặt AltiWyre (decal), phụ đề + chữ nổi (ScreenGui), ánh sáng ngày/đêm. Place đã lưu.
- **Bằng số (đạt):** 45 khung (đầu/giữa/cuối × 15 shot), 504 điểm (camera vị trí + điểm nhìn + fov, tâm đầu/thân/2 tay/2 chân Gà và Bắp) → lệch lớn nhất **0,0014 stud**. Shot gương s027/s029/s030 (camera ảo phản chiếu): phản chiếu ngược ↔ camera phim lệch 0,0009 stud.
- **Chưa đạt (bằng mắt, 3 lần chụp agent Haiku, `output/roblox-phim/bao-cao-mat.md`):** hình Studio vẫn khác phim ở 4/6 mốc — thấy trời/nhà ngoài phòng, thiếu cờ/tranh/rèm, vật lệch trái-phải ở s032, shot gương thấy khối gỗ thay vì Bắp.
- **Nghi nguyên nhân (chưa xác minh):** (1) luật "tường một mặt" của bộ phát ẩn quá tay (mảnh tường quanh cửa sổ/đồ treo tường bị ẩn theo); (2) `screen_capture` ở chế độ Edit có thể không dùng đúng camera/khung dọc; (3) bối cảnh Roblox còn thiếu vật (cờ, rèm…). Đã đo: phim cũng bị khung giấy khen che đầu Gà ở s017 (1,17 vs 1,21 stud) → chỗ đó đúng.
- **Bước kế tiếp đề xuất:** người dùng bấm Play xem trực tiếp; nếu sai thì tắt công tắc `TuongMotMat` để so; kiểm bằng số tầm nhìn (raycast camera→vật) cho cả đạo cụ, không chỉ nhân vật; chụp ở chế độ Play.
- **Đã sửa bối cảnh:** `e3-phong.phong_goi` (gối) từ khối 2×2×2 → elip 2,70×0,79×1,70 như phim (thuộc tính `SuaTay`). Lỗi gốc ở `tools/roblox-boi-canh.lua`: cầu co giãn không đều bị dựng thành khối mặc định — chưa sửa công cụ.
- **File:** `tools/roblox-phim.mjs` (xuat/kiem/so/phuc-vu), `tools/roblox-phim.lua` (bộ phát), `tools/roblox-phim-nap.lua` (nạp vào place); dữ liệu `output/roblox-phim/data/`.
- **Đang chạy nền:** `node tools/roblox-phim.mjs phuc-vu` (cổng 8766) — chỉ cần khi nạp lại dữ liệu.
- **Câu hỏi còn mở:** shot gương: Roblox không có gương thật → camera ảo sau gương (hình lật trái-phải). Chấp nhận, hay muốn cách khác?
<!-- /ĐIỂM DỪNG -->

## Việc còn lại (theo thứ tự)
1. Công cụ xuất (gợi ý `tools/roblox-phim.mjs xuat <trang> --shots a:b`): mở `episodes/ep6B/index.html` bằng Chrome ẩn (học cách mở + máy chủ tĩnh ở `tools/roblox-boi-canh.mjs`, `tools/look.mjs`), `window.renderAt(t)` từng khung 30 fps, ghi:
   - camera: vị trí, quaternion, fov;
   - mỗi nhân vật hiện trong khung: CFrame thế giới của đầu, thân, 2 tay, 2 chân (tâm bbox từng bộ phận + hướng), mặt đang dùng;
   - đạo cụ của cảnh (không thuộc `env_*`) đang hiện: id/tên + CFrame + cỡ;
   - tất cả quy về TOẠ ĐỘ GỐC ENV (nhân ma trận nghịch của nhóm `env_<tên>`), kèm tên env của shot.
2. Bộ phát trong Roblox (Script/ModuleScript trong place): đọc dữ liệu (chia nhiều ModuleScript, hoặc nạp qua máy chủ cục bộ như `tools/roblox-boi-canh.lua`), cộng gốc env, đặt CFrame bộ phận (part anchored) + camera Scriptable + đổi decal mặt theo khung; chạy theo thời gian (RunService) và có nút/biến nhảy tới giây bất kỳ (hàm thuần của t, giống luật engine).
3. Nhân vật: thân R6 Roblox. Có sẵn trong `workspace.Tap3_NhomA.NhanVat` (đặt tên `<vai>_<id>`): bach, banh (thợ bánh), may (thợ may), mayor (thị trưởng, cũng dùng cho tt_ngu), linh (lính), be_*, dan_*. Gà: tự dựng R6 vàng. Gấu Bắp: `Tap3_NhomA.NhomB.bap`; gấu đỏ/vàng: `NhomB.bear` hoặc `NhanVat.gau_ke_*`. Mặt: bộ AltiWyre (Roblox id 6557969904, `episode.js` facePack).
4. Hiệu ứng (mỗi món có công tắc): phụ đề tiếng Việt + chữ nổi bằng ScreenGui (lấy `episodes/ep6B/captions.js`), nhoè whip / sepia / tối viền bằng Lighting post-effect, bụi/lấp lánh bằng ParticleEmitter.
5. Kiểm bằng số rồi mới chụp; chụp nhìn bằng mắt giao agent phụ Haiku (chỉ trả chữ). Xong đoạn thử → báo người dùng, DỪNG chờ duyệt rồi mới làm ~120 s còn lại.

## Ghi chép
- Place: `S:/MINECRAFT MOD/YOUTUBE MC w BAO/ROBLOX/Sky.rbxl` (MCP Roblox_Studio, studio "Sky.rbxl"; lấy id bằng `list_roblox_studios`). Lưu bằng `save_place`.
- Bối cảnh đã dựng (theo toạ độ phim, gốc env cộng trên trục X): `workspace.BoiCanh_ep6B` — `e3-phong` X −400, `e3-pho` X −800, `e3-tiem` X −1100 (tiệm may gốc env +100), `e3-nha-may` X −1300. Toạ độ gốc env = toạ độ trong `engine/envs/<env>.js`.
- Cảnh không có env tập 3 (giữ bối cảnh gốc `goc/sets.js`): s001–003, s073–074, s086 — chưa có trong Roblox, để sau.
- Công cụ bối cảnh: `tools/roblox-boi-canh.mjs xuat|phuc-vu` + `tools/roblox-boi-canh.lua`, cách dùng `docs/roblox.md` mục 8.
- execute_luau chạy lâu dễ rớt kết nối: chia lô, `task.wait()` mỗi ~60 vật.
- Model Roblox miễn phí: script bên trong đã tắt hết (giữ nguyên như vậy).
- Xuất video: Studio không có MP4 → người dùng quay màn hình (nút ghi hình Roblox / OBS); âm thanh ghép ngoài theo cùng mốc thời gian.
- Tập ep6B đang có phiên khác sửa `episodes/ep6B/` (phiên "ep6B: shot phòng Gà trên e3-phong"): KHÔNG sửa file trong `episodes/ep6B/`, chỉ đọc.

## Cách dùng bộ phát (roblox-phim)
1. Xuất: `node tools/roblox-phim.mjs xuat episodes/ep6B/index.html --shots s017:s032 --bo s023` → `output/roblox-phim/data/` (mỗi shot 1 JSON, khung 30 fps; mỗi mesh không thuộc env_* trong hộp bối cảnh = 1 Part: khối/elip/trụ/tấm mặt).
2. Nạp: `node tools/roblox-phim.mjs phuc-vu` rồi trong Studio (Edit): `loadstring(game.HttpService:GetAsync("http://127.0.0.1:8766/nap.lua"))()("http://127.0.0.1:8766/")` → `ReplicatedStorage.PhimEp6B` (dữ liệu chia ModuleScript ≤ 190 000 ký tự, `PhatPhim`) + `StarterPlayerScripts.PhimEp6B_Chay`.
3. Phát: bấm Play. Công tắc = thuộc tính `workspace.PhimEp6B`: `Chay`, `BatDau` (giây phim, đổi = nhảy tới), `Lap`, `PhuDe`, `ChuNoi`, `Mat`, `GuongAo`, `AnhSang`, `TuongMotMat`; `ThoiGian` = giây đang phát. Edit: `require(PhatPhim).apply(giây)`.
4. Kiểm số: `node tools/roblox-phim.mjs kiem …` → `kiem-phim.json`; Studio `M.kiem(list)` POST về `/luu/kiem-roblox.json`; `node tools/roblox-phim.mjs so kiem-phim.json kiem-roblox.json`.
- Mặt: `goc/faces/face_NNN.png` = ảnh `fNN` của gói AltiWyre (so điểm ảnh 140/140) → id ảnh trong `.cache/roblox/6557969904/bo-phan.json`.
- Toạ độ: env-local phim = Roblox − (−400,0,0); CFrame dùng thẳng quaternion three.js (cùng hệ trục).
