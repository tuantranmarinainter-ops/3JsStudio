# Trạm nhập model (`tools/nhap-model.mjs`)

Tìm model miễn phí trên mạng (chỉ **CC0** và **CC BY**), tải, chuẩn hoá bằng Blender 5.1 headless, ghi vào `assets/nhap/`.
Khoá đọc từ `.env.local` (đã gitignore): `SKETCHFAB_API_TOKEN`, `POLY_PIZZA_API_KEY` (rỗng → bỏ qua êm), `BLENDER`. Poly Haven không cần khoá.

## Lệnh
```
node tools/nhap-model.mjs tim "sewing machine" --loai vua [--ca-nang] [--nguon sketchfab|polyhaven|polypizza] [--toi-da 10]
node tools/nhap-model.mjs nhap sketchfab:<uid> --ten may-khau --loai vua --cao 1.6 [--cho-phep-nang "<lý do>"] [--tam-giac-toi-da N] [--ao] [--mau-dinh] [--xoay 90] [--tex 512]
node tools/nhap-model.mjs kiem          # thiếu manifest/ghi công/giấy phép/loai, vượt ngưỡng không duyệt → mã thoát 1; phong cách vượt → chỉ cảnh báo
node output/nhap-model/chup.mjs [ten1,ten2…] [ra.png]   # lưới ảnh kiểm chiều/cỡ/màu (nhân vật cam cao 5.2 stud để so)
```
`nguon:id` lấy từ cột đầu của bảng `tim` (`sketchfab:<uid>`, `polyhaven:<slug>`, `polypizza:<id>`).

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

## Dùng trong engine
`createAssetLib(...).load(['nhap/den-duong'])` rồi `instance('nhap/den-duong')` — đơn vị đã là stud, `scale: 1`; `bbox` = [x, cao, sâu].

## Giới hạn
- Hướng "mặt trước" không tự nhận được: xem lưới ảnh, sai thì nhập lại với `--xoay`.
- Model nhiều phần rời / có đế trưng bày / nhiều bản trong một file sẽ bị gộp nguyên: chọn model khác hoặc thêm bước cắt tay.
- Bỏ xương/animation (chỉ tĩnh). Vật liệu trong suốt giữ alpha nhưng chưa kiểm kỹ.
- Hạn mức Sketchfab Download API có giới hạn; lỗi in nguyên văn (đã che khoá).
