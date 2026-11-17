# ep6B → phim chạy trong Roblox Studio — handoff

## ĐIỂM DỪNG
- **ĐANG CHỜ NGƯỜI DÙNG (17/11, vòng 5):** (1) duyệt `output/roblox-phim/duyet-nhan-vat/bang-rb-3.jpg` (Gà R6 Roblox + thị trưởng ngủ; cột Phim | .glb cũ | Roblox) và `bang-rb-1/2.jpg` (11 vai); (2) thu bảng dock dưới khung nhìn Studio (đang 1569×546) để quay roblox.mp4 + so-sanh.mp4.
- **Bảng vai → model (người dùng chốt):** bach, bachF→bach; kid2→be_vang; baker→banh; tailor→may; folk1/2/3→dan_01 (rig đầu trong gói Civilians)/dan_14/dan_15; mayorD→mayor; guardA/B→linh; mayorN→`mayor_ngu_rb_1` (bản sao mayor + Shirt/Pants pyjama của asset 123126413388497, công tắc `ThiTruongNguRoblox` bật); Gà→`ga_rb_1` (bản sao bach bỏ áo/tóc, màu `ga:` r6-looks, băng đỏ + mào là Part, KHÔNG tải ảnh lên; công tắc `GaRoblox` TẮT = .glb cũ cho tới khi duyệt); 3 gấu = .glb phim (bang-3.jpg).
- **Không dùng ShowWindow khi đưa Studio lên trước** (bỏ phóng to → khung nhìn 296×321); dùng keybd_event Alt + SetForegroundWindow.
- **Cách lái rig Roblox (`M.rbBuild`/`M.rbPose` trong `tools/roblox-phim.lua`):** bộ phận R6 = node phim · D (D = khớp R6 chuẩn, |D| ≤ 0,14 stud); phụ kiện theo bộ phận gần nhất; mặt = decal mặt phim. Model Tap3 + nvNN_* đặt ModelStreamingMode Persistent (Play có StreamingEnabled).
- **Bằng số (đạt):** 66 bộ phận rig + 119 node .glb khớp node phim (tâm 0,0000 stud); đoạn thử 354 điểm × 45 khung lệch ≤ 0,0014 stud.
- **Đang chạy nền:** `node tools/roblox-phim.mjs phuc-vu` (cổng 8766).
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
