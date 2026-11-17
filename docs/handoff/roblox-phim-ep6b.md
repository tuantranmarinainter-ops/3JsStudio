# ep6B → phim chạy trong Roblox Studio — handoff

## ĐIỂM DỪNG
- **ĐANG CHỜ NGƯỜI DÙNG (17/11, vòng 3):** duyệt bảng 13 vai người `output/roblox-phim/duyet-nhan-vat/bang-1.jpg`, `bang-2.jpg` (phim | Roblox, chính diện + 3/4). Gấu (nv01/nv14/nv15) làm lượt sau: người dùng chọn dùng .glb gấu xuất từ phim (bỏ phương án clone `Tap3_NhomA.NhomB.bap` — code clone vẫn còn trong `M.goc`, cần đổi khi làm gấu).
- **Lỗi 3D Importer đã đo + bù (bộ phát `tools/roblox-phim.lua`, công tắc `XoayNhap`, `MauGoc`):** (1) nướng xoay nghỉ Q của node vào lưới + đặt MeshPart quay 180° quanh trục đứng → khung node = MeshPart·Rπ·Q; vị trí từng MeshPart con lấy từ đỉnh .glb (`pc` trong nhan-vat.json), cỡ = MeshSize. (2) bỏ màu phẳng của chất liệu không vân → tô lại từ `col`. (3) `.glb` chứa cả mảnh phim ẩn (tóc dưới mũ…) → cờ `an` (`node tools/roblox-nhan-vat.mjs --an`).
- **Bằng số (đạt):** sân duyệt 257 mảnh/13 vai: tâm lệch 0,0000 stud, góc ≤ 0,0007 rad, không méo/lật/thiếu (`tools/roblox-kiem-nv.lua`). Bộ phát phim: 180 điểm Gà ngoài shot gương lệch ≤ 0,0008 stud.
- **Dữ liệu:** `node tools/roblox-nhan-vat-node.mjs` → `output/roblox-phim/data/nhan-vat.json` (t,q,s,col,pc,an). Sân duyệt: `tools/roblox-duyet-nv.mjs` (ảnh phim) + `roblox-duyet-nv.lua` (Studio, `_G.ChupDuyet(i, "truoc"|"34")`).
- **Sau duyệt:** gấu từ .glb phim → vật liệu bối cảnh → gương/ánh sáng → quay lại so-sanh.mp4.
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
