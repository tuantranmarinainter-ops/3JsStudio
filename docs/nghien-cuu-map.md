# Nghiên cứu map từ video tham khảo

Mục đích: xem video "Ở thị trấn này" (dựng bằng Roblox Studio) → ghi cách dựng bối cảnh + từng đạo cụ (màu, vật liệu, cỡ,
từ khoá Creator Store) → thư viện `dist/thu-vien-map.html`. Ưu tiên: tìm món tương tự trên Creator Store (`tools/roblox.mjs`).

## Lệnh
```
python tools/nghien_cuu_map.py cat "<thư mục video>" [--chi "<từ trong tên>"]   # chép tên không dấu + cắt shot, bỏ qua video đã cắt
python tools/nghien_cuu_map.py kiem [<slug>]                                     # trạng thái từng video: đã cắt / đã gộp / đã phân tích, lỗi JSON
python tools/thu_vien_map.py                                                     # gộp mọi phan-tich-*.json → dist/thu-vien-map.html
```
Dữ liệu mỗi video: `output/nghien-cuu-map/<slug>/` (shot_NNN.jpg, sheets/, frames/, dia-diem.json, phan-tich-*.json).

## Quy trình mỗi video (agent chính)
1. `cat` → 2. 1 agent Sonnet làm **ĐỀ BÀI GỘP** → `kiem` → 3. chia địa điểm (trừ can-mat/do-hoa) thành ≤ 3 nhóm cân số shot đại diện,
mỗi nhóm 1 agent Sonnet làm **ĐỀ BÀI PHÂN TÍCH** → `kiem` → 4. `thu_vien_map.py`.
Đề bài giao agent chỉ cần: `Đọc S:\3JS Studio\docs\nghien-cuu-map.md, làm ĐỀ BÀI <GỘP|PHÂN TÍCH>. Video: <slug>. [Địa điểm: a, b, c. File ra: phan-tich-<nhom>.json]`

---

## ĐỀ BÀI GỘP
Thư mục `S:\3JS Studio\output\nghien-cuu-map\<slug>\`. Gộp mọi shot theo ĐỊA ĐIỂM để mỗi địa điểm chỉ phân tích một lần.
- Xem `sheets/sheet_*.jpg` trước (bảng khung có nhãn id · giây · dài) — thường đủ. Chỉ mở `shot_NNN.jpg` / `frames/shot_NNN.jpg` khi ô khó nhận.
- Cùng phòng khác góc = 1 địa điểm. Cận mặt nền mờ → địa điểm hợp lý nhất hoặc nhóm `can-mat`. Màn chữ/đồ hoạ → `do-hoa`.
- Mỗi địa điểm chọn 2–4 shot ĐẠI DIỆN lộ rõ bối cảnh và đạo cụ nhất (góc rộng trước, thêm góc lộ đồ khác).
- Ghi `dia-diem.json`: `[{"id":"phong-ngu-be","ten":"Phòng ngủ của bé","loai":"noi-that|ngoai-canh|can-mat|do-hoa","shots":["s001",…],"dai_dien":["s003"],"ghi_chu":"1 câu"}]`
  (s001 ↔ shot_001.jpg). Mọi shot đúng 1 nhóm. Kiểm bằng `python tools/nghien_cuu_map.py kiem <slug>`.
- Không phân tích đạo cụ. Trả về: (1) đường dẫn, (2) bảng id · số shot · đại diện, (3) mục chưa chắc, mỗi mục 1 dòng.

## ĐỀ BÀI PHÂN TÍCH
Phân tích CÁCH DỰNG BỐI CẢNH và ĐẠO CỤ (bỏ qua nhân vật Roblox) cho các địa điểm được giao, trong thư mục
`S:\3JS Studio\output\nghien-cuu-map\<slug>\` (đọc `dia-diem.json` để biết shot đại diện).
- Mỗi địa điểm: xem shot đại diện; được mở thêm ≤ 3 shot cùng nhóm nếu lộ đồ mới. Không xem ngoài phạm vi.
- Ảnh gốc thường chỉ 480×854 → mờ: ghi "không rõ" thay vì đoán bừa.

Mỗi địa điểm ghi:
- `cach_dung`:
  - `ky_thuat`: Part khối / MeshPart mua sẵn / Terrain (cỏ, nước, đá) / Union — kèm dấu hiệu (cạnh sắc, vân Grass/WoodPlanks/Brick…)
  - `ti_le`: cỡ theo stud (nhân vật R15 cao ~5 stud); trong nhà ghi cỡ phòng, trần
  - `anh_sang`: giờ, Skybox, Atmosphere/sương, bóng, PointLight/Neon, hậu kỳ (ColorCorrection, Bloom, DepthOfField)
  - `camera`: góc máy thường dùng, độ mờ hậu cảnh
  - `meo`: mẹo tiết kiệm (chỉ dựng phần trong khung, phòng 3 vách, cửa sổ decal, hậu cảnh mờ…)
- `dao_cu`: mọi đồ vật thấy được, cùng loại lặp lại ghi 1 dòng + `so_luong`:
  `{"ten":"tiếng Việt","ten_en":"English","nhom":"nha-cua|noi-that|do-dung|cay-coi|canh-quan|duong-pho|xe-co|bien-hieu|khac","mau":["#hex tên màu"],"vat_lieu":"vật liệu Roblox (SmoothPlastic, Plastic, Wood, WoodPlanks, Brick, Concrete, Metal, Glass, Neon, Fabric, Grass, Marble, Slate…) + bề mặt","kich_thuoc_stud":"R×C×S","chi_tiet":"low-poly khối / mesh chi tiết / decal","tu_khoa_store":["2–4 cụm tiếng Anh, vd 'low poly vending machine'"],"shot":"s038","khung":[x,y,w,h]}`
  — `khung` = hộp bao đồ vật trong shot đó, tỉ lệ 0–1 (để cắt ảnh minh hoạ).

Ghi file được giao (`phan-tich-<nhom>.json`): `[{"dia_diem":"<id>","ten":"…","cach_dung":{…},"dao_cu":[…]}]`,
kiểm bằng `python tools/nghien_cuu_map.py kiem <slug>`.
Trả về: (1) đường dẫn, (2) ≤ 5 gạch kết luận cách dựng cảnh, (3) số đạo cụ + mục chưa nhận được, mỗi mục 1 dòng. Không chép nội dung file.
