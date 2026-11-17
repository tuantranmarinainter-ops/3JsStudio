# ep6B → phim chạy trong Roblox Studio — handoff

## ĐIỂM DỪNG
- **ĐANG LÀM / CHỜ (17/11, vòng 6 — phim đầy đủ):** cả tập ep6B 96 shot (4218 khung, 140,6 s) chạy trong Studio; quay `output/roblox-phim/quay/roblox-full.mp4` + `so-sanh-full.mp4` (trái phim | phải Roblox, có tiếng phim `quay/tieng-full.m4a` = giọng + 3 lớp tiếng động). Gửi xong → chờ người dùng đánh giá.
- **Nhân vật đã duyệt:** 11 vai rig Roblox + thị trưởng ngủ `mayor_ngu_rb` (ThiTruongNguRoblox bật); Gà = .glb cũ áo sọc (người dùng chọn, GaRoblox tắt); 3 gấu .glb.
- **Dữ liệu cả tập:** `node tools/roblox-phim.mjs xuat episodes/ep6B/index.html --env all --out output/roblox-phim/data-full` (mỗi shot theo env của nó; mảnh nhân vật luôn ghi; env rỗng goc-trong → hộp quanh camera từng shot). Máy chủ: `phuc-vu --out output/roblox-phim/data-full` (cổng 8766). `liet-ke <trang>` = bảng shot/env.
- **Gốc bối cảnh Roblox (bộ phát ENV_X):** phòng −400, phố −800, tiệm −1100, nhà máy −1300, goc-trong −3000 (6 shot s073 s074 s083 s084 s086 s087: cảnh gốc của tập ghi như vật theo khung, không có Part bối cảnh riêng).
- **Bằng số (đạt):** 2544 điểm / 288 khung (đầu-giữa-cuối 96 shot) lệch ≤ 0,0016 stud. Ngoại lệ có lý do: 14 mục mũ phim của baker (s004) và mayorN (s067–071) — vai dùng rig Roblox, mũ phim thay bằng phụ kiện Roblox.
- **Quay:** Play, `TocDo` 0,25 (chậm 4 lần), gdigrab 652×1160 tại (1035,167) (khung nhìn 1569×1161 ở x 577–2145, y 167–1327), chớp tím = mốc 0, rồi tăng tốc ×4 → 30 fps. Đưa Studio lên trước: keybd_event Alt + SetForegroundWindow (KHÔNG ShowWindow).
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
