# Prompt cho Codex — bộ texture "Ngôi nhà biết đi" (ep001)

> Dán nguyên văn phần dưới đường kẻ vào Codex. Codex làm việc trong repo `tuantranmarinainter-ops/3JsStudio`
> (nhánh `ccr-55d10bc5-yxxalg`), tạo file đúng đường dẫn, rồi commit. Engine three.js đã đọc sẵn các đường dẫn này;
> file nào chưa có thì engine dùng texture vẽ bằng code (nên có thể giao từng phần).

---

Bạn là họa sĩ texture cho một phim hoạt hình 3D dọc 1080×1920 dựng bằng three.js. Phong cách: **nhân vật khối bo tròn
kiểu đồ chơi vinyl (blocky toy), màu bão hoà, viền rõ, sạch sẽ, dễ thương** — giống tinh thần game khối phổ biến nhưng
**hoàn toàn nguyên bản**: KHÔNG dùng logo, tên, khuôn mặt mặc định, decal hay bất kỳ asset chính thức nào của Roblox
hoặc game khác; KHÔNG chữ ký, watermark, thương hiệu. Bối cảnh dùng chất liệu **bán-realistic (stylized PBR)**: có chi
tiết bề mặt thật (vân gỗ, hạt cát, đá) nhưng màu tươi, không bẩn tối.

## Quy tắc chung (bắt buộc)
- PNG. Albedo/màu = sRGB. Normal map = **OpenGL (+Y lên)**, tuyến tính. Roughness = xám tuyến tính (trắng = nhám).
- Kích thước đúng như ghi; texture lặp (tileable) phải **liền mép hoàn hảo** (kiểm bằng cách ghép 2×2).
- Texture nhân vật/mặt: **giữ đúng toạ độ ô** trong file layout JSON; không di chuyển, không đổi cỡ ô.
  Ảnh template có nhãn chỉ để tham chiếu — bản giao KHÔNG còn chữ/khung template.
- Vẽ tràn mép mỗi ô thêm 4 px màu tương tự (bleed) để không lộ đường nối khi mipmap.
- Mọi file tự tạo (vẽ tay/thủ tục/AI) và cho phép dùng thương mại; ghi nguồn + công cụ vào `assets/textures/MANIFEST.md`.
- Tạo thêm `assets/textures/_preview.jpg`: lưới thu nhỏ của mọi file đã giao để kiểm nhanh.

## 1. Quần áo nhân vật (atlas 1024×1024, 128 px/stud)
Layout: `assets/textures/characters/outfit_layout.json` · Template: `assets/textures/characters/outfit_template.png`.
Mỗi bộ phận có 4 mặt bên nối ngang theo thứ tự **front | right | back | left** (nhìn từ ngoài vào, mép TRÊN ô = phía đầu),
cộng các ô top/bottom. "right" = bên phải của nhân vật (nhân vật nhìn về phía người xem khi xem mặt front).
Vẽ quần áo + phần da lộ ra (bàn tay = màu da, có thể thêm nếp đốt ngón nhẹ). Có nếp vải, đường may, viền gấu áo,
bóng đổ ambient occlusion nhẹ ở nách/đũng/cổ tay. Mỗi nhân vật giao 2 file: `<tên>_outfit.png` + `<tên>_outfit_normal.png`
(nếp vải, đường may, vân dệt).

| Tên file `<tên>` | Mô tả |
|---|---|
| `hero` | Cậu bé. Áo **hoodie vàng** `#F2C230` có túi kangaroo phía trước, **2 dây rút nâu** `#6B4226` thả từ cổ xuống ngực, mũ trùm (sau gáy, ở UpperTorso.back phần trên), bo tay áo; quần **jean xanh** `#3F6FB5` có đường may, túi; giày **đen viền đế trắng** ở Foot (front/sides/back), đế trắng ở Foot.bottom. Da `#F3D27A`. |
| `mom` | Mẹ. Áo **sọc dọc xanh mint** `#9FE0C0` / sọc nhạt `#D9F5E8`, cổ áo có **khăn/nơ đỏ** `#D6322B` (vẽ phần nơ trên UpperTorso.front, phần trên ngực); tay áo dài sọc mint; thân dưới **váy dài nâu** `#8A6A4A` phủ LowerTorso + UpperLeg + LowerLeg (vải mềm, gấu váy ở LowerLeg); Foot = giày búp bê nâu sẫm. Da `#F0C89A`. |
| `dad` | Cha (nhà thám hiểm). **Áo khoác navy** `#283A66` có khoá kéo giữa, 2 túi ngực, cổ bẻ, tay dài; quần **kaki sáng** `#D8CFB8`; ủng nâu `#3B2A1E` ở Foot + nửa dưới LowerLeg. Da `#F0C89A`. |
| `dadIsland` | Cha sau 3 năm trên đảo: cùng áo khoác navy nhưng **bạc màu, rách tả tơi** (mép rách răng cưa, lỗ thủng lộ da, miếng vá), quần **nâu** `#7A5A3A` rách gối, gấu sờn; chân trần hoặc ủng rách. Da hơi rám `#E8B985`. |

## 2. Biểu cảm khuôn mặt (atlas 1024×1024, ô 256×128, NỀN TRONG SUỐT)
Layout: `assets/textures/faces/face_layout.json` · Template: `assets/textures/faces/face_template.png` (32 ô, tên ở góc ô).
Engine xếp lớp lông mày → mắt → miệng → phụ (má hồng, nước mắt…) lên mặt trước của đầu (đầu tròn kiểu hình trụ bo),
nên mỗi ô chỉ chứa 1 thành phần, căn giữa ô. Nét **viền đen `#1B1B1B` dày ~6 px**, mắt **oval trắng có đồng tử đen lớn +
2 điểm sáng**, miệng có lưỡi/răng khi mở. Phong cách nhất quán giữa mọi ô; mắt các trạng thái cùng vị trí tâm để chuyển
cảnh mượt. Giao 4 file: `default_face.png` (cậu bé, dùng làm mặc định), `mom_face.png` (mắt có **mi cong**, môi mềm,
có thể vẽ kính tròn mảnh trong `extra.shine`), `dad_face.png` (lông mày dày, nét trưởng thành), `dadIsland_face.png`
(như dad nhưng mắt mệt có quầng, nếp nhăn đuôi mắt).

Các ô:
- `eyes.*`: open (thường), half (lim dim), closed (nhắm, cong xuống), happy (^ ^ cười híp), wide (mở to ngạc nhiên),
  squint (>< nhắm tịt vì lạnh/gió), sad (mắt rưng, mí trên chùng), look_up (đồng tử dịch lên trên).
- `brows.*`: neutral, raised (ngạc nhiên), worried (đầu trong nhướn lên), angry (đầu trong cụp xuống).
- `mouth.*`: smile, grin (cười lộ răng trên), open (há vừa), o (tròn "ồ"), frown, flat, wobble (run vì lạnh, lượn sóng),
  laugh (cười to há rộng, thấy lưỡi), smallsmile, scream (há to hoảng hốt), pout (bĩu môi), teeth_clench (nghiến răng).
- `extra.*`: blush (2 vệt má hồng mềm, alpha ~50%), tears (2 dòng nước mắt xanh nhạt), sweat (giọt mồ hôi), shine
  (điểm sáng phụ / kính), eyelashes (mi riêng cho mẹ), freckles (tàn nhang), nose (mũi nét nhỏ), cold_cheeks (má đỏ vì lạnh).

## 3. Phụ kiện (tileable 512×512, albedo + normal)
`assets/textures/env/knit_red.png` (+`_normal`): len đan gân dọc đỏ `#D6322B` cho mũ len (gân chạy theo chiều V).
`beard_grey.png` (+`_normal`): râu xám bạc `#CFCFD2` dạng sợi chảy theo chiều V, có alpha ở mép dưới để tạo ngọn râu.
`hair_black.png` (+`_normal`): tóc đen óng `#1B1B1B` sợi chạy theo V, highlight xanh nhạt.

## 4. Bối cảnh (tileable 1024×1024, mỗi loại 3 file: `<tên>.png`, `<tên>_normal.png`, `<tên>_rough.png`)
Thư mục `assets/textures/env/`:
`wood_siding_red` (ván ốp ngang đỏ `#B23A32`, mỗi ván cao 1/8 ảnh, vân gỗ + sơn), `wood_siding_mint` (như trên màu `#CDEEE6`),
`roof_shingles_teal` (ngói gỗ lợp so le xanh ngọc `#2BB3A3`), `roof_shingles_navy` (`#2E3D63`), `trim_paint_white`
(gỗ sơn trắng hơi bóng), `stone_basement` (đá xếp xám), `porch_planks` (ván sàn hiên be), `wood_dark_legs` (gỗ nâu
trụ chân nhà, vân dọc theo V), `brass` (đồng thau vàng khớp chân, có xước), `asphalt` (nhựa đường), `sidewalk` (gạch lát),
`grass` (cỏ ngắn), `sand` (cát vàng mịn), `sand_wet` (cát ướt bóng hơn), `snow` (tuyết lấp lánh nhẹ), `ice` (băng xanh nhạt
có vết nứt), `rock` (đá núi xám nâu), `dirt` (đất), `checker_floor` (gạch caro 8×8 ô kem `#F1E6CC` / nâu `#5A3524`),
`wallpaper_yellow` (giấy dán tường vàng nhạt có hoa văn rất mờ), `wallpaper_stars` (tường xanh tím `#4B4F9E` có sao vàng nhạt),
`fridge_metal_mint` (sơn kim loại mint `#9FE0C9` bóng), `ship_hull_wood` (gỗ thân tàu sơn đỏ sẫm).
Thêm 2 normal map nước tileable 1024: `water_normal_a.png` (sóng lăn tăn lớn), `water_normal_b.png` (gợn nhỏ) — kiểu
"dudv/normal ripple", không có hướng rõ để cuộn 2 lớp chéo nhau.

## 5. Bưu thiếp minh hoạ (1024×720, không trong suốt) — `assets/textures/postcards/`
Thiếp giấy kem có viền răng cưa, tem đỏ góc phải trên có dấu bưu điện, tranh minh hoạ vẽ tay màu nước/gouache ở 60%
trên, dòng chữ viết tay tiếng Việt (đúng dấu, đúng chính tả) ở dưới:
- `penguin.png`: đàn chim cánh cụt trên băng, núi băng sau lưng — chữ: **"Lời chào từ Nam Cực."**
- `whale.png`: cá voi xanh dưới chiếc thuyền buồm nhỏ giữa biển — chữ: **"Giữa Thái Bình Dương. Thấy một chú cá voi ngay dưới thuyền!"**
- `mountain.png`: đỉnh núi đá phủ tuyết nhô trên biển mây — chữ: **"Đỉnh của thế giới. Ước gì hai mẹ con ở đây."**
- `island.png`: đảo nhỏ có cây cọ và ngọn hải đăng sọc xanh lá–trắng, biển ngọc — chữ: **"Ước gì hai mẹ con ở đây."**
- `island_back.png`: mặt sau thiếp (đường kẻ địa chỉ bên phải, tem) — chữ bên trái, 4 dòng:
  **"Đã tìm thấy một thứ tuyệt vời. / Sẽ sớm về nhà thôi. / Yêu cả hai mẹ con."**
- `misc_01.png` … `misc_06.png`: thiếp du lịch khác KHÔNG chữ (bãi biển, rừng rậm, sa mạc, thành phố hoàng hôn, rừng thông, núi lửa).

## Kiểm tra trước khi giao
1. `python tools/texture_templates.py` không được đổi layout (chạy lại phải ra cùng JSON).
2. Mọi file đúng kích thước, đúng tên; texture lặp ghép 2×2 không thấy mối nối.
3. Chữ trên bưu thiếp đúng nguyên văn tiếng Việt.
4. Không có logo/thương hiệu/khuôn mặt mặc định của game nào.
5. Commit với message `textures: <phần đã làm>`; liệt kê file trong `assets/textures/MANIFEST.md`.
