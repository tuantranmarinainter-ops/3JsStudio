# Trạm nhập model (`tools/nhap-model.mjs`)

Tìm model miễn phí trên mạng (**CC0**, **CC BY**, và mẫu **Roblox Creator Store** — xem mục riêng bên dưới), tải, chuẩn hoá bằng Blender 5.1 headless, ghi vào `assets/nhap/`.
Khoá đọc từ `.env.local` (đã gitignore): `SKETCHFAB_API_TOKEN`, `POLY_PIZZA_API_KEY` (rỗng → bỏ qua êm), `BLENDER`. Poly Haven không cần khoá.

## Lệnh
```
node tools/nhap-model.mjs tim "sewing machine" --loai vua [--ca-nang] [--nguon sketchfab|polyhaven|polypizza|roblox] [--toi-da 10] [--ung-vien file.json [--khe id]]
node tools/nhap-model.mjs nhap sketchfab:<uid> --ten may-khau --loai vua --cao 1.6 [--cho-phep-nang "<lý do>"] [--tam-giac-toi-da N] [--ao] [--mau-dinh] [--sang 0.4] [--xam 1] [--xoay 90] [--tex 512]
node tools/nhap-model.mjs tai sketchfab:<uid>     # chỉ tải glTF gốc (giữ xương/animation) vào .cache/nhap-model/, in đường dẫn — dùng với tools/blender/nhap_rig.py
node tools/nhap-model.mjs kiem          # thiếu manifest/ghi công/giấy phép/loai, vượt ngưỡng không duyệt → mã thoát 1; phong cách vượt → chỉ cảnh báo
node output/nhap-model/chup.mjs [ten1,ten2…] [ra.png]   # lưới ảnh kiểm chiều/cỡ/màu (nhân vật cam cao 5.2 stud để so)
```
`nguon:id` lấy từ cột đầu của bảng `tim` (`sketchfab:<uid>`, `polyhaven:<slug>`, `polypizza:<id>`, `roblox:<id>`).

## Low poly (người dùng chốt 2026-11-13) — nguồn dữ liệu: `tools/nhap-nguong.json`
Phim phong cách khối kiểu Roblox → ưu tiên low poly. Ngưỡng tính theo tam giác của model GỐC (trước giảm lưới):

| `--loai` | lý tưởng | tối đa |
|---|---|---|
| `nho` đạo cụ nhỏ (cầm tay, đặt bàn) | 100–600 | 1500 |
| `phu-kien` mũ, tóc, túi | 200–800 | 2000 |
| `vua` nội thất, máy nhỏ (mặc định) | 300–1500 | 3000 |
| `lon` nhà, xe, băng chuyền, cây to | 500–3000 | 6000 |
| `chu-dao` vật chủ đạo của tập | 2000–6000 | 12000 |

Phong cách sau chuẩn hoá (chỉ cảnh báo trong `kiem`): ≤ 6 vật liệu, ảnh màu ≤ 512 px, ≤ 10 mảnh lưới, không vân ảnh chụp/quét.
- `tim`: xếp lý tưởng → thấp → chấp nhận → chưa rõ; model VƯỢT bị ẩn (`--ca-nang` để hiện). Không còn ứng viên đạt →
  in "KHÔNG CÓ LOW POLY — hỏi người dùng trước khi lấy model nặng" và thoát **mã 3**.
- **Quy tắc: không có low poly thì DỪNG và hỏi người dùng**, không tự lấy model nặng, không tự giảm lưới cho qua.
- `nhap`: vượt tối đa của loại → TỪ CHỐI (thoát ≠ 0, nêu số tam giác + ngưỡng). Chỉ khi người dùng đã duyệt mới thêm
  `--cho-phep-nang "<lý do>"` → manifest ghi `duyetNang`. Manifest luôn ghi `loai`, `tris_goc`. Trong ngưỡng thì KHÔNG giảm lưới
  (chỉ giảm nếu truyền `--tam-giac-toi-da N`).

## Việc `nhap` làm
1. Tra lại giấy phép + cờ AI ở trang model (từ chối nếu NC/ND/SA/Standard/AI). Tải ≤ 5 MB vào `.cache/nhap-model/<nguon>-<id>/` (zip giải nén có kiểm đường dẫn, chỉ giữ gltf/glb/bin/ảnh).
2. `tools/blender/chuan_hoa.py`: gộp 1 mesh, áp transform, Y lên, mặt nhìn +Z (theo gốc; lệch thì `--xoay`), gốc ở tâm đáy (chân y=0),
   scale để **cao = `--cao` stud** (1 m ≈ 2.9 stud; nhân vật 5.2; không có `--cao` thì giữ cỡ gốc, coi là mét), bỏ vật phụ nằm trong collection ẩn `glTF_not_exported`,
   vật liệu chỉ giữ màu gốc (bỏ normal/roughness/metal/emission map), ảnh màu thu ≤ 512 px (JPEG, PNG nếu có alpha), `--mau-dinh` thay ảnh bằng màu trung bình,
   `--ao` nướng AO vào màu đỉnh. Không dùng Draco (engine chưa nạp Draco).
3. Xuất `assets/nhap/<ten>.glb`, thêm dòng `nhap/<ten>` vào `assets/manifest.json` (chỉ thêm; chạy lại cùng tên thì thay đúng dòng đó),
   ghi `assets/nhap/CREDITS.md` (tên, tác giả, URL, giấy phép). Nhớ dán CREDITS vào mô tả video khi dùng model CC BY.

## Tô màu theo mesh, bỏ mesh, ghép vật (`nhap`)
- `--mau "obj:<glob tên mesh>=#hex,mat:<tên|chỉ số vật liệu>=#hex"`: đổi sang màu PHẲNG (vd model voxel dùng 1 ảnh bảng màu → phải tô theo mesh: `obj:Object_5=#e0b030`). Tên mesh xem bằng Blender (`bpy.data.objects`) hoặc dòng `[chuan_hoa] mau …`.
- `--bo "Object_31,Object_33"`: bỏ mesh theo tên (glob) TRƯỚC khi gộp — vd bỏ cái nhẫn trong hộp nhẫn.
- `--ghep "duong.glb;kich;x,y,z;rx"` (+ `--ghep-nguon sketchfab:<uid>` để ghi công cả vật ghép): ghép một GLB đã chuẩn hoá vào model; `kich` = cạnh dài nhất (stud), `x,y,z` kiểu three (gốc = tâm đáy model chính) là tâm đáy vật ghép, `rx` xoay quanh X (độ) trước khi đặt. Ví dụ hộp nhẫn sang:
  `nhap sketchfab:4a80eed40ae84093bec69dbf6654c209 --ten hop-nhan-co-nhan --loai nho --cao 0.7 --bo "Object_31,Object_33,Object_35,Object_37" --mau "obj:Object_5=#e0b030,…,obj:Object_29=#172a5c" --ghep-nguon sketchfab:b2a6277f29d94226bbb2f38eb27ca9b9 --ghep "assets/nhap/nhan-dep.glb;0.2;0,0.16,0.05;-90"`.
  (`hop-nhan` = gốc, `hop-nhan-sang` = hộp rỗng, `hop-nhan-co-nhan` = có nhẫn Decorated Ring dựng đứng.)

## Model CÓ XƯƠNG: `tools/blender/nhap_rig.py`
`nhap` vẫn bỏ xương. Với nhân vật có rig dùng `tai` rồi `nhap_rig.py` (xem `assets/characters/bap/README.md`): giữ armature + skin + animation, xoá shape key, nướng rest pose theo `idly@0`, scale đúng cả xương lẫn key, `--bo` bỏ mũ/khăn, `--long` đổi màu lông, `--no` gắn nơ cổ. Chế độ `--chi-xem` in JSON xương/action/tam giác.

## Nguồn Roblox Creator Store (`roblox:<id>`, `tools/roblox.mjs`)
Mẫu MIỄN PHÍ của Creator Store, tải qua Open Cloud (khoá `ROBLOX_API_KEY` trong `.env.local`, không cần Roblox Studio). Giấy phép ghi `Roblox Creator Store` (người dùng cho phép dùng để dựng phim; vẫn ghi nguồn + tác giả).
```
node tools/nhap-model.mjs tim "teddy bear" --nguon roblox --loai nho --ung-vien output/roblox/ung-vien-gau.json --khe gau-bong
node tools/duyet.mjs <ep> them-ung-vien <số đợt> output/roblox/ung-vien-gau.json     # lên trang duyệt: ảnh xem trước, tam giác, tác giả, link
node tools/nhap-model.mjs nhap roblox:<id> --ten gau-bong --loai nho [--cao 1.2] [--xoay 180]   # sau khi người dùng chốt
node tools/roblox.mjs xem <id>     # đếm part / mesh / ảnh vân / Union, chỉ 1 request     ·  tai <id>  → output/roblox/glb/roblox-<id>.glb (GLB thô để xem thử)
```
- `tim` không ghi `--nguon` cũng hỏi Roblox (khi có khoá). `--ung-vien` ghi file nhóm `ung-vien` cho `tools/duyet.mjs` (mọi nguồn; riêng Roblox có ảnh xem trước tải từ thumbnails.roblox.com vào `.cache/roblox/<id>/thumb.png`).
- `nhap roblox:<id>`: `roblox.mjs tai` ghép mọi mảnh thành GLB thô (đơn vị stud, `sky-extract dump` + `tools/blender/roblox_ghep.py`) → `chuan_hoa.py` như mọi nguồn → dòng `nhap/<ten>` trong manifest (`source`, `author`, `license: "Roblox Creator Store"`, `xapXi` nếu có mảnh dựng xấp xỉ) + `CREDITS.md`, lấy từ `.cache/roblox/<id>/nguon.json`.
- Mỗi lần tải dùng tối đa 40 request Open Cloud (`--toi-da-request N`): 1 model + 1 mỗi mesh + 1 mỗi ảnh vân + 1 mỗi Union.
- Đã dựng đúng (kiểm bằng mắt 14/11, ảnh ở `output/roblox/<id>/sheet.jpg`): Part hộp/cầu/trụ, WedgePart, CornerWedge (đỉnh ở góc +X −Z), MeshPart (có pháp tuyến gốc), ảnh vân `TextureID` / SurfaceAppearance `ColorMap` / SpecialMesh, **Decal** trên mặt hộp (tấm phẳng nhô 0,01 stud) và trên MeshPart (theo UV), **UnionOperation** (lưới thật: tải asset CSG ở thuộc tính `AssetId`, giải mã `MeshData` CSGMDL v2–v5, màu từng mảnh con theo màu đỉnh).
- Ảnh vân được trộn sẵn lên màu mảnh thành JPEG đục ≤ 512 px (`--anh-max`): vùng trong suốt của ảnh hiện màu mảnh, không xuất vật liệu trong suốt.
- GIỚI HẠN: chất liệu có sẵn của Roblox (Brick, Wood, Grass…) không phải ảnh nên chỉ còn MÀU phẳng; `Texture` lát theo `StudsPerTile` nhưng bỏ `OffsetStuds`; Decal trên cầu/trụ/nêm bị bỏ (có ghi trong danh sách "xấp xỉ"); SpecialMesh Head = trụ đứng, Torso/loại lạ = hộp; Union không kèm asset CSG hoặc `MeshData` phiên bản lạ → dựng HỘP BAO và ghi rõ trong đầu ra + `xapXi`; chỉ lấy ColorMap (bỏ normal/roughness/metal); bỏ script, âm thanh, hiệu ứng, xương. Mặt trước của Roblox là −Z → thường cần `--xoay 180`.
- `sky-extract.exe` nằm ở `tools/sky-extract/bin/` (không vào git): sửa `src/dump.rs` xong phải `cargo build --release --bin sky-extract` rồi chép từ `target/release/` sang `bin/`.

## Poly Pizza không cần khoá
`POLY_PIZZA_API_KEY` rỗng → `nhap polypizza:<id>` đọc trang công khai `poly.pizza/m/<id>` (JSON `__SERVER_APP_STATE__`: tên, tác giả, giấy phép, tam giác, `ResourceID`) và tải `static.poly.pizza/<ResourceID>.glb`. Vẫn lọc CC0/CC BY. `tim polypizza` vẫn cần khoá.

## Đổi màu
`--sang k` (0..1) trộn màu về trắng; `--xam k` (0..1) khử bão hoà giữ độ sáng (chạy trước `--sang`). Áp cho ảnh màu, màu nền, màu đỉnh. Vd két xám thép: `--xam 1 --sang 0.1`. Chuẩn hoá cũng bỏ ảnh/nhóm nút `glTF Settings` không nuôi màu nền (trước đây ảnh ORM 1024 px bị xuất theo).

## Dùng trong engine
`createAssetLib(...).load(['nhap/den-duong'])` rồi `instance('nhap/den-duong')` — đơn vị đã là stud, `scale: 1`; `bbox` = [x, cao, sâu].

## Giới hạn
- Hướng "mặt trước" không tự nhận được: xem lưới ảnh, sai thì nhập lại với `--xoay`.
- Model nhiều phần rời / có đế trưng bày / nhiều bản trong một file sẽ bị gộp nguyên: chọn model khác hoặc thêm bước cắt tay.
- `nhap` bỏ xương/animation (chỉ tĩnh); model có rig dùng `nhap_rig.py`. Vật liệu trong suốt giữ alpha nhưng chưa kiểm kỹ.
- Hạn mức Sketchfab Download API có giới hạn; lỗi in nguyên văn (đã che khoá).
