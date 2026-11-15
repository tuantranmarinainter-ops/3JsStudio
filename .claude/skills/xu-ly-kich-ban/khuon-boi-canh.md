# Khuôn bối cảnh tinh — danh sách mốc `boi-canh/<id>.json`

Danh sách mốc là NGUỒN SỰ THẬT cho mọi bước sau: duyệt tài nguyên, khối xám, đề bài Codex, kiểm ảnh, kit.
Ảnh chỉ cho không khí/màu; số đo luôn lấy từ file này.

## 6 phần bắt buộc
| Phần | Viết gì | Sai thường gặp |
|---|---|---|
| 1. Hình khối lớn | Không gian là gì, rộng × sâu × cao (stud), trong/ngoài, ranh giới (tường, vách, mép nước) | Chỉ tả "một mảng tường" → khung 9:16 lộ trống hai bên |
| 2. Một phong cách | Một dòng: khối vuông Roblox, vật liệu chủ đạo, bảng 4–6 màu hex | Mỗi vật một kiểu |
| 3. Thử tỉ lệ | Vật đo cỡ: hình nộm xám 5,48 stud đặt ở chỗ nhân vật đứng thật; một khối 1×1×1 | Không có gì để so → đo sai ±30% |
| 4. Trục chính + mốc | Hệ quy chiếu (gốc = tâm sàn, +Z về phía camera chính); mỗi mốc: id, tên, **vai trò trong chuyện**, vùng (x, y, z), kích thước, màu, vật liệu | Không ghi vai trò → vẽ thùng thấp hơn bậu sai yêu cầu |
| 5. Đồ lấp đầy có SỐ | Theo cụm (trái / phải / tiền cảnh / hậu cảnh), mỗi món có số lượng; luôn có trời/hậu cảnh xa và mặt đất | "Thêm vài đồ vật" (không số, không chỗ) |
| 6. Chừa trống + điều cấm | Vùng phải trống (đường đi nhân vật, đường camera, vật không được che); điều cấm KIỂM ĐƯỢC (không vật lơ lửng, không xếp thành hàng, không thêm cửa/cửa sổ khác, giữ đúng số ô kính…) | Cấm mơ hồ kiểu "đẹp, hài hoà" |

Thêm: `anhSang` (giờ, nguồn sáng chính và màu, nguồn phụ, độ sáng) và `nhinTuShot` (shot nào thấy bối cảnh từ hướng nào) để bước khối xám chọn 2 góc chụp.

## Bảng chuẩn theo người (Gà = 5,48 stud tới đỉnh khối đầu; kể tóc ~5,85)
| Vật | Kích thước (stud) | Lý do |
|---|---|---|
| Ô cửa đi | cao 7,5–8, rộng 4,5–5 | người cao nhất kể mũ ~6,8; ngang kể tay ~4,9 |
| Tay nắm cửa | y ≈ 3 | ngang giữa thân |
| Trần trong nhà | ≥ 9,4 | |
| Mặt bàn, quầy, kệ thấp | y ≈ 3,0–3,3 | tay buông ở y 2 |
| Mặt ghế, giường | y ≈ 2,0–3,0 | chân dài 2 |
| Bậu cửa sổ nhìn ra được | y ≈ 3,5–4, mép trên ≈ 7,5 | tâm mặt 4,75 |
| Bậu phải trèo mới nhìn qua | y > 5,85 (cao hơn tóc) | đứng dưới thì nấp hẳn |
| Bậc thềm | 0,4–0,8 mỗi bậc | |
| Mái hiên, ban công | mép dưới ≥ 8, sàn tầng 2 ≥ 9,5 | không chắn đầu/máy |
| Gấu bông | cao 2,2 | 0,4 Gà |
| Lòng đường | rộng ≥ 16 | hai người + máy đứng giữa |
| Khung 9:16 ở cách d stud, fov dọc f | rộng = 2·d·tan(f/2)·9/16 | khung dọc rất hẹp: cần hai bên có đồ |
Nguồn đầy đủ: `kich-ban/ep003-de-bai-2/DE-BAI.md` mục 2–3.

## Khuôn JSON
```json
{
  "boiCanh": "<id>", "donVi": "stud", "nguonSo": "uoc | env | model",
  "heQuyChieu": "Gốc = tâm sàn, y=0 mặt sàn, +X sang phải nhìn từ camera chính, +Z về phía camera chính",
  "kichThuoc": { "rong": 32, "sau": 24, "cao": 18 },
  "phongCach": "khối vuông Roblox; gạch block xanh xám, gỗ ván, thép tối", "bangMau": ["#5f7480", "#8a6a44", "#1d2630", "#ffd9a0"],
  "vatDoCo": [{ "ten": "hình nộm xám 5,48", "dat": [-1.9, 0, -10.5], "ghiChu": "chỗ Gà nấp" }],
  "moc": [{ "id": "thung", "ten": "Thùng gỗ", "vaiTro": "Gà trèo lên để nhìn qua kính", "bat": true,
            "vung": "x -0.5..2.1, y 0..1.4, z -11.25..-8.85", "mau": ["#8a6a44"], "vatLieu": "ván gỗ, viền tối" }],
  "lapDay": [{ "cum": "trai", "mon": [{ "ten": "thùng phuy xanh", "soLuong": 2 }] }],
  "chuaTrong": ["sân x -4..4, z -11..2"], "cam": ["không thêm cửa sổ thứ hai"],
  "anhSang": "đêm, ngoài xanh lạnh, trong vàng ấm hắt qua kính",
  "nhinTuShot": { "s001": "từ sân nhìn vào tường, hơi cao" }
}
```
