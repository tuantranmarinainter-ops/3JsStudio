# Roblox — làm tài sản từ Creator Store (đọc file này là đủ để bắt đầu)

Phiên Roblox nên chạy trên **Sonnet** (việc theo quy trình, không cần Opus). Mọi lệnh chạy ở gốc repo `S:\3JS Studio`.

## 1. Cần có trước khi chạy
- `.env.local` (gitignore, KHÔNG in/ghi/dán khoá): `ROBLOX_API_KEY` (Open Cloud, chỉ gửi qua header `x-api-key`; có thể đặt cùng tên trong biến môi trường), `BLENDER` (đường dẫn exe Blender 5.1.x; thiếu hoặc sai → "không thấy Blender"). Poly Haven/Poly Pizza không cần khoá.
- `tools/sky-extract/bin/sky-extract.exe` (không vào git). Python + PIL (trang duyệt thu nhỏ ảnh).
- Hạn mức: tối đa 40 request Open Cloud mỗi lần tải (`--toi-da-request N`). Ước lượng: 1 model + 1/mesh + 1/ảnh vân + 1/Union. Dùng `xem` trước (1 request).

## 2. Bảng lệnh
| Việc | Lệnh mẫu |
|---|---|
| Tìm mẫu miễn phí | `node tools/roblox.mjs tim "teddy bear" --so 15 --json` (lọc: `--tam-giac-max N`, `--co-script`) |
| Tìm + file ứng viên cho trang duyệt | `node tools/nhap-model.mjs tim "teddy bear" --nguon roblox --loai nho --toi-da 10 --ung-vien output/roblox/ung-vien-gau.json --khe gau-bong` |
| Xem cấu trúc (part/mesh/ảnh/Union; nhân vật: rig, áo quần) | `node tools/roblox.mjs xem 8541228386` |
| Tải thô thành GLB để xem | `node tools/roblox.mjs tai <id> [--ra f.glb] [--tach] [--nhan-vat "<path>"] [--song-song 6]` |
| Ảnh áo/quần/mặt giữ alpha | `node tools/roblox.mjs anh <id>` → `output/roblox/anh/` |
| Nhập kho + manifest + CREDITS | `node tools/nhap-model.mjs nhap roblox:<id> --ten gau-bong --loai nho [--cao 1.2] [--xoay 180]` |
| Kiểm kho | `node tools/nhap-model.mjs kiem` (thoát 1 nếu thiếu manifest/ghi công) |
| NPC R6 từ Roblox | sửa `assets/characters/rb/nguon.json` → `node tools/npc-roblox.mjs dung bach mayor` · `ke` · `manifest` (in dòng cần chèn) |
| Gấu kệ | `node tools/gau-ke.mjs dung` → `assets/characters/rb/gau_ke/gau.glb` |
| Bộ mặt (face pack) | `node tools/face-pack.mjs tai [id]` · `ke [id]` · `ghep --chi-mat [--map f --ra dir]` |
| Trang duyệt bộ mặt | `node tools/face-pack-mau.mjs [--bo altiwyre]` → `dist/face-pack_mau.html` |
| Chụp bảng mẫu R6 | `node tools/r6-mau.mjs output/ep003/mau-r6 "truoc-sau=view=fb"` |
| Trang duyệt: nạp ứng viên | `node tools/duyet.mjs ep003 moi "<tiêu đề>"` → `... them-ung-vien <số đợt> <file.json> [--bo-trung]` → `... dung` → `dist/ep003_duyet.html` |
| Nhận kết quả duyệt | `node tools/duyet.mjs ep003 mo --mot-lan` (nền, chờ dòng `DA-NHAN dot=N file=…`) hoặc `... nhan <file.json>`; `tong-hop` in quyết định hiện hành |
| Tắt Roblox, về bản khối | thêm `?rb=0` vào URL tập/trang thử (cast.js; env nhà dùng helper `rb()` ở `engine/envs/e3-tiem.js`, `e3-pho.js`). Gấu kệ: `?gauKe=1` bật (mặc định tắt) |
| Animation Roblox thật (nguồn B) | `node tools/roblox.mjs anim <id> [--liet-ke] [--chon "Tên"] [--ten file]` · hàng loạt: `anim --bo <thư mục manifest/anims của nocodehack> [--chon wave,agree]` → `assets/nhap/anims/<ten>.json` + `index.json` + manifest `anim/<ten>` + CREDITS. Phát: `engine/anim-rbx.js` (`rbxPose(t, clip)`), xem: `engine/anim-lab.html?src=B&grid=1`. Asset animation tải được bằng Open Cloud thường (không 403); gói 110796770261450 có 85 KeyframeSequence (chọn bằng `--chon`). Test: `node --test tools/tests/anim-rbx.test.mjs` |
Cấu trúc NPC: `engine/r6-roblox.js` (`loadRbLooks`, `applyRbLook`), trang thử `engine/r6-roblox-lab.html?ten=…&anim=walk&rb=0|1`. Test: `node --test tools/tests/npc-roblox.test.mjs tools/tests/face-pack.test.mjs tools/tests/duyet.test.mjs`.

## 3. Pipeline (một đợt)
1. **Tìm ứng viên** cho từng khe (món): 10 ứng viên/món; khe nhiều biến thể (cây, nhà nền) đặt `chonNhieu: true` (kết quả là mảng). Bỏ mẫu cần >40 request, mẫu mesh riêng tư, mẫu `xem` lỗi.
2. **Trang duyệt**: `duyet.mjs … them-ung-vien` + `dung`; tải thử GLB, chụp 2 góc, agent phụ soi GLB với ảnh Roblox rồi mới đưa người dùng (ảnh không để trong phiên chính).
3. **Người dùng chốt** (nút "Gửi tới Claude" hoặc file kết quả) → `nhan`/`tong-hop`. Chốt "Không cái nào" / Cần sửa = chưa quyết.
4. **Tải/ghép GLB**: `nhap roblox:<id>` (roblox.mjs ghép mảnh → `chuan_hoa.py` → `assets/nhap/<ten>.glb`). Mặt trước Roblox là −Z, thường cần `--xoay 180`; đặt cỡ bằng `kich`/`cao`, không tin scale gốc.
5. **Nhập kho + manifest**: do `nhap` ghi dòng `nhap/<ten>` (source, author, license `Roblox Creator Store`) + `assets/nhap/CREDITS.md`; không chép tay. Dán CREDITS vào mô tả video.
6. **Nối vào tập**: `rb(id, parent, name, {p, ry, kich|cao})` trong env, hoặc `actors` có `rb:` trong `episodes/<ep>/episode.js`; kiểm `look.mjs` + `shaders.mjs`, rồi gộp `dist/<ep>_xem-thu.html`.

## 4. Lỗi đã gặp và cách xử lý
- **403 asset riêng tư/chưa duyệt/archived** (vd 93030342204194; áo quần bach bị 403): Open Cloud không tải được → chọn mẫu khác (commit 4881d44 báo rõ lỗi này).
- **429/5xx/lỗi mạng**: tự thử lại 3 lần (0,5 · 1,5 · 4 s), 429 tự giảm song song; hết lượt mới báo lỗi kèm id (commit 59488ed).
- **Vệt tối sau gáy đầu R6**: `tools/blender/roblox_ghep.py` đã sửa, nửa sau lấy cột mép ảnh mặt cùng phía (commit 8c993bc).
- **manifest lẫn CRLF/LF, không thay được dòng cũ**: `ghiManifest` giờ giữ kiểu xuống dòng của manifest (commit 5d7df4c).
- **`xem/tai` hỏng** với mẫu cũ (`Unexpected XML event StartElement(binary…)`, `Invalid character U+0000`): ví dụ 3459094, 23692279, 89288354, 98709097, 851937200 → bỏ mẫu. Sửa `src/dump.rs` thì phải `cargo build --release --bin sky-extract` rồi chép exe sang `bin/`.
- **Áo quần NPC trơn màu trên bản gộp `dist/*.html`**: bản gộp chỉ chặn `fetch`; `r6-roblox.js` đã đổi sang `fetch` + `createImageBitmap` (commit 6a76c90).
- **Phụ kiện bị đầu đâm xuyên**: đầu engine 0,68 > đầu Roblox 0,625 → phụ kiện nở ngang 1,11, dọc 1,06 (commit 7bd4be9).
- **Mảnh khổng lồ làm hộp bao phình (nhà 127340966876926: 146,8 × 154,5 stud thay vì 24,6 × 50,7)**: nguyên nhân là `Part` hình **Ball** có `Size` lệch trục (0,29 × 146,8 × 134,8); Roblox vẽ Ball là hình cầu đường kính = cạnh NHỎ NHẤT, còn `roblox_ghep.py` cũ co giãn thành elip khổng lồ. Đã sửa: Ball lệch trục → cầu đường kính min(Size), ghi dòng vào `xapXi`. Chốt chặn mới: mảnh có hộp bao > 2× phần còn lại của model **ở ≥ 2 trục** thì in `⚠ mảnh lớn bất thường` (giữ nguyên); thêm `--bo-manh-lon` để bỏ (có ghi vào `xapXi`). Cảnh báo có thể là báo nhầm với thân thô + tán lá rộng (cây).
- **Hướng trục (đã đo bằng số, không đổi gì)**: GLB giữ nguyên trục Roblox (Y lên, phải-tay, 1 stud = 1 đơn vị, chỉ tịnh tiến về tâm XZ / đáy y = 0). So CFrame từng mảnh giữa Studio và `dump.json` của 10 mẫu: trùng khớp, không xoay, không lật. Mặt trước là mặt tác giả chọn (thường −Z) nên `nhap … --xoay 180` cũ vẫn đúng — không đổi mặc định. Bẫy khi so với Studio: công cụ MCP `insert_asset` chèn model **xoay quanh Y (ví dụ −69,3°)**; phải `PivotTo(CFrame.new(pivot.Position))` để về hướng gốc rồi mới chụp so.
- **Neon / Glass (chất liệu Roblox)**: từ nay Neon → `emissive` theo màu mảnh (bloom của engine bắt được); Glass → trong suốt (alpha ≤ 0,4), độ nhám 0,05, phản chiếu nhẹ. **Vân vật liệu (giai đoạn 2, 16/11)**: Brick, Wood, WoodPlanks, Marble, Slate, Concrete, Metal, Grass, Sand, Fabric, Snow, CeramicTiles, RoofShingles, Plaster có vân Poly Haven CC0 (`assets/polyhaven/vat-lieu/`, bảng `VAN_PH` trong `roblox_ghep.py`): vân xám × màu mảnh, UV chiếu theo mặt (stud ÷ số stud mỗi ô). Plastic/SmoothPlastic/Neon/Glass giữ màu phẳng. Tắt bằng `node tools/roblox.mjs tai <id> --khong-van`. Màu nhập đã đo: baseColorFactor GLB = Color3 part (khớp từng giá trị), nên lệch màu so với Studio là do ánh sáng (giai đoạn 3), không phải lỗi nhập.
- **Giới hạn ghép**: Union không có CSG → hộp bao (ghi `xapXi`); GLB nhân vật không có áo quần; Decal trên cầu/trụ/nêm bị bỏ. Chi tiết: `docs/nhap-model.md`.
- Trước khi thêm vào `assets/manifest.json` kiểm `git status`: file hay có thay đổi chưa commit của phiên khác; commit theo đường dẫn sẽ kéo theo dòng đó.

## 5. Quyết định đã chốt
- Giấy phép: người dùng cho phép dùng tài sản Roblox/Creator Store để dựng phim, vẫn ghi nguồn + tác giả (CLAUDE.md mục Asset; `docs/nhap-model.md`).
- Cách A cho NPC: giữ thân R6 của engine, chỉ lấy màu thân, ảnh áo/quần, tóc/mũ (`docs/handoff/npc-roblox.md`; commit 6437cfa). 12 nhân vật phụ ep003 dùng `rb` (commit 21f775b). Bảng id đã chốt: `docs/handoff/npc-roblox.md` mục CHỐT.
- Gấu: **dùng Bắp cũ** (`engine/bear-glb.js`); gấu trên kệ nhà máy = **104566604295071** + nơ mượn từ 8820218869 (commit 6a76c90). Các mẫu 8648724784, 8541228386, 8820218869 (làm gấu thay thế) đã huỷ.
- Bộ mặt: **AltiWyre's Face Pack 6557969904** cho Tập 4 và mọi tập sau; ô FX `matAlti`, `matNguyen` (37 mặt nguyên, mặc định) — `docs/handoff/face-pack-altiwyre.md`; commits 5c8b6cb, 238dc91.
- Đợt 4 (nhà) đã chốt 14/11: 15 model `nhap/pho-*` thay vào `engine/envs/e3-pho.js` (commit e944cad). "Mô hình nghề" = mô hình nhà. Còn đợt 5–8 (phố, nhà máy, phòng Gà, đạo cụ) — `docs/handoff/ep003-roblox.md`.
- Low poly: không có model đạt ngưỡng thì DỪNG hỏi người dùng; chỉ `--cho-phep-nang "<lý do>"` sau khi người dùng duyệt (`tools/nhap-nguong.json`).

## 6. Đề bài mẫu cho phiên Roblox mới (chạy trên Sonnet)
```
Đọc docs/roblox.md rồi làm đợt 5 nhóm CÂY (chọn nhiều): tìm 10 mẫu, dựng trang duyệt đợt mới cho ep003.
Đạt khi: dist/ep003_duyet.html mở được, đủ 10 ứng viên có ảnh, không mẫu 403, token ghi vào đợt.
Dừng khi: trang duyệt xong và đưa link — chưa nhập model nào.
```
Sau khi người dùng chốt: "Đọc docs/roblox.md, nhập các mẫu đã chốt của nhóm CÂY vào kho và thay vào env. Đạt khi `nhap-model kiem` thoát 0 và `?rb=0` vẫn về bản khối. Dừng khi gộp xong dist/ep003_xem-thu.html."

## 7. Duyệt theo nhóm
Mỗi lần chạy CHỈ MỘT nhóm (vd NHÀ 9 món, rồi PHỐ, rồi NHÀ MÁY…), tuyệt đối không "tất cả". Lý do: mỗi nhóm tốn hàng trăm request (đợt 4: 90 mẫu ≈ 460 request tải + 131 `xem`) và một trang duyệt nặng; chốt xong nhóm này mới sang nhóm sau.
