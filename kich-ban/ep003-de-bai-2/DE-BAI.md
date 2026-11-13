# Đề bài cho Codex (lần 2): vẽ lại 104 ảnh shot theo ĐÚNG nhân vật và hệ quy chiếu của engine, kèm bộ kit có số camera đầy đủ

Tập: ep003 "Ở thị trấn này — Món đồ biến mất trong phòng khóa kín". Truyện, lời kể, danh sách 104 shot, diễn viên và biểu cảm từng shot **giữ nguyên** như `kich-ban/ep003-goi2/Shotlist_104.json`. Lần này chỉ làm lại **hình** và **số đo**.

## Vì sao phải làm lại
Bản dựng three.js so với 104 ảnh cũ: đạt 3, lệch 55, hỏng 46 (`docs/handoff/ep003-so-toan-phim.md`). Ba nguyên nhân chính:
1. Ảnh cũ vẽ nhân vật theo tỉ lệ khác nhân vật thật của engine (thân R6), nên "đầu chiếm N % khung" đo trên ảnh không dựng lại được.
2. Số camera cũ đo ngược từ ảnh (không có vị trí máy, không có ống kính thật). Khi đặt vào bối cảnh thật, máy chui vào tường, mái hiên, cột.
3. Bối cảnh tính theo "G" phỏng đoán, không theo một hệ trục chung, nên cảnh hai ba người và đạo cụ không khớp chỗ.

Cách làm lần này đảo thứ tự: **chốt số trước, vẽ sau**. Mỗi shot có bố cục 3D bằng số (bối cảnh dạng khối, vị trí nhân vật, máy quay) → dựng khung khối bằng công cụ có sẵn với nhân vật thật → ảnh cuối vẽ đè theo đúng khung khối đó.

## 1. Hệ quy chiếu (bắt buộc dùng đúng)
- Đơn vị: **stud**. Trục: **+X = đông, +Y = lên, +Z = nam** (bắc = −Z). Hệ tay phải, như three.js.
- Nhân vật: gốc toạ độ = **điểm giữa hai đế giày** trên mặt đứng. Mặt nhìn về **+Z** khi `ry_do = 0`. Tay phải ở phía **−X**.
- `ry_do` = góc quay quanh trục Y, tính bằng độ: 0 = nhìn về nam (+Z), 90 = nhìn về đông (+X), 180 = nhìn về bắc, −90 = nhìn về tây.
- Ngồi (`tu_the: "sit"`): gốc = mặt ngồi; hai chân duỗi thẳng ra trước 2 stud (R6 không gập gối). Nằm (`nam: true`): nằm ngửa, gốc = gót chân, đầu chỉ về hướng lưng lúc đứng; cộng 0,5 stud vào Y để lưng chạm mặt nệm.
- Máy quay: `p` = vị trí máy, `l` = điểm máy nhìn tới, `fov` = **góc nhìn DỌC** của khung 9:16 (độ), `nghieng` = nghiêng đường chân trời (độ, thường 0).
- Quy đổi ống kính: `fov = 2·atan(18 / mm)`. 24 mm → 73,7°; 35 mm → 54,4°; 50 mm → 39,6°; 65 mm → 31,0°; 85 mm → 23,9°; 100 mm → 20,4°.
- Cỡ đầu trên khung: `dau_cao_pct = 100 · h / (2 · d · tan(fov / 2))`, với `h` = chiều cao khối đầu (bảng dưới), `d` = khoảng cách máy tới đầu. Bề ngang khung ở khoảng cách `d` = `2 · d · tan(fov / 2) · 9 / 16` stud (khung dọc rất hẹp: 50 mm ở cách 20 stud chỉ rộng 8,1 stud).
- Mỗi bối cảnh một hệ trục riêng, gốc đặt ở **tâm sàn** (ghi rõ trong kit). Các shot cùng bối cảnh dùng chung một bộ khối, không đổi chỗ đồ giữa các shot.

## 2. Nhân vật thật của engine (đã đo, `nhan-vat.json`)
Mọi người là **thân R6**: 6 khối cứng (đầu, thân, 2 tay, 2 chân), **không cổ, không khuỷu, không gối, không ngón tay**; bàn tay là đầu dưới của khối tay. Mặt là hình dán 2D. Gấu là gấu bông nhỏ.

Khối chuẩn ở tỉ lệ 1 (Gà): chân 1 × 2 × 1 mỗi bên (y 0 → 2), thân 2 × 2 × 1 (y 2 → 4), tay 1 × 2 × 1 mỗi bên treo cạnh thân (y 2 → 4), khối đầu rộng 1,6 × cao 1,46 (y 4,02 → 5,48). Thân người cao **3,76 đầu**. Bề ngang kể cả hai tay 3,98 stud.

**G = 5,48 stud** = sàn → đỉnh khối đầu của Gà (không tính tóc, chỏm). Số cũ G = 5,2 bỏ.

| Mã kịch bản | Diễn viên engine | Đỉnh khối đầu (stud) | = G | Cao nhất kể tóc/mũ | Khối đầu cao | Cằm (y) | Tâm mặt (y) | Bề ngang kể tay | Thân rộng | Bề sâu |
|---|---|---|---|---|---|---|---|---|---|---|
| GA | `hero` | 5,48 | 1,00 | 5,85 | 1,46 | 4,02 | 4,75 | 3,98 | 2,00 | 1,74 |
| BACH | `bach` | 5,75 | 1,05 | 6,06 | 1,53 | 4,22 | 4,99 | 4,18 | 2,10 | 1,76 |
| MAYOR (ngày) | `mayor` | 6,14 | 1,12 | 6,47 | 1,63 | 4,50 | 5,32 | 4,91 | 2,69 | 2,08 |
| MAYOR (áo ngủ) | `mayor_ngu` | 6,14 | 1,12 | 6,46 | 1,63 | 4,50 | 5,32 | 4,91 | 2,69 | 2,10 |
| GUARD_A | `linh_a` | 6,14 | 1,12 | 6,46 | 1,63 | 4,50 | 5,32 | 4,46 | 2,24 | 2,52 |
| GUARD_B | `linh_b` | 6,14 | 1,12 | 6,84 | 1,63 | 4,50 | 5,32 | 4,46 | 2,24 | 2,36 |
| BAKER | `banh` | 5,48 | 1,00 | 6,51 | 1,46 | 4,02 | 4,75 | 3,98 | 2,00 | 2,37 |
| TAILOR | `may` | 5,48 | 1,00 | 5,54 | 1,46 | 4,02 | 4,75 | 3,98 | 2,00 | 2,01 |
| CHILD_A | `be_vang` | 4,60 | 0,84 | 4,84 | 1,22 | 3,38 | 3,99 | 3,34 | 1,68 | 1,59 |
| CHILD_B | `be_ngoc` | 4,60 | 0,84 | 5,01 | 1,22 | 3,38 | 3,99 | 3,34 | 1,68 | 1,77 |
| TOWN_A | `dan_a` | 5,48 | 1,00 | 5,77 | 1,46 | 4,02 | 4,75 | 3,98 | 2,00 | 1,81 |
| TOWN_B | `dan_b` | 5,48 | 1,00 | 5,83 | 1,46 | 4,02 | 4,75 | 3,98 | 2,00 | 1,94 |
| TOWN_C | `dan_c` | 5,48 | 1,00 | 5,54 | 1,46 | 4,02 | 4,75 | 3,98 | 2,00 | 1,69 |
| BAP | `bap` | 2,20 | 0,40 | 2,20 | ≈ 0,80 | — | 1,67 | 1,11 | 1,11 | 0,89 |
| BEAR_WALLET | `gau_vi` | 2,20 | 0,40 | 2,20 | ≈ 0,80 | — | 1,67 | 1,11 | 1,11 | 0,89 |
| BEAR_BAG | `gau_tui` | 2,20 | 0,40 | 2,20 | ≈ 0,80 | — | 1,67 | 1,11 | 1,11 | 0,89 |

Ảnh chuẩn hình dáng (hình chiếu thẳng, lưới 1 stud, cùng một tỉ lệ cho mọi nhân vật):
- `nhan-vat/bang-chieu-cao.jpg`: 16 nhân vật đứng chung vạch đất.
- `nhan-vat/<diễn viên>.jpg`: trước | ngang | sau của từng người, có vạch đỉnh khối đầu, cằm, tâm mặt.

Khi vẽ ảnh cuối, nhân vật phải **giống các ảnh này** về tỉ lệ khối, màu áo, tóc, mũ. Không vẽ lại theo dáng R15 hay dáng người thật.

## 3. Bối cảnh và nhà cửa tính theo nhân vật
Mọi kích thước bối cảnh ghi bằng stud và phải hợp với thân người ở bảng trên. Mốc gợi ý (được chỉnh, nhưng phải ghi số chốt vào kit):

| Vật | Kích thước (stud) | Lý do |
|---|---|---|
| Ô cửa đi | cao 7,5–8, rộng 4,5–5 | người cao nhất kể mũ 6,84; bề ngang kể tay 4,91 |
| Tay nắm, chốt cửa | y ≈ 3 | ngang giữa thân |
| Trần phòng trong nhà | ≥ 9,4 | phòng Gà hiện dựng 14,6 × 17,7 × 9,4 |
| Mặt bàn, quầy, mặt kệ thấp | y ≈ 3,0–3,3 | bàn tay buông ở y 2; tay đưa ngang chạm y 3–4 |
| Mặt giường, mặt ghế | y ≈ 2,0–3,0 | chân dài 2 |
| Bệ cửa sổ | y ≈ 3,5–4, mép trên ≈ 7,5 | tâm mặt Gà 4,75 nhìn ra được |
| Bậc thềm | cao 0,4–0,8 mỗi bậc | |
| Mái hiên, ban công tầng 2 | mặt sàn y ≥ 9,5; mép dưới mái hiên ≥ 8 | không chạm đầu người, không chắn máy |
| Gấu bông | cao 2,2 | 0,40 G |
| Lòng đường phố | rộng ≥ 16 | hai người đi ngược chiều + máy đứng giữa phố |

Đạo cụ then chốt phải có kích thước và vị trí bằng số: két Gà, két tiệm bánh, hộp nhẫn, bao tiền, bản đồ + ghim, đồng hồ quả quýt, thùng in đầu gấu, dây chuyền bạc, nhẫn bạc, sách xanh rêu, đồng hồ báo thức, gương.

## 4. Thứ tự làm cho MỖI shot
1. Chọn bối cảnh; đặt nhân vật (`pos`, `ry_do`, `tu_the`) và đạo cụ theo `action` của shot trong `Shotlist_104.json`.
2. Đặt máy (`p`, `l`, `fov`) để ra cỡ cảnh và góc mà shot cần (ý đồ cỡ cảnh, góc ngang, góc cao lấy từ `Camera_104.json` cũ; con số cũ chỉ để tham khảo).
3. Dựng khung khối và đọc số:
   ```
   node tools/kb/do-nhan-vat.mjs dung ep003 kich-ban/ep003-kit2/kit.json kich-ban/ep003-kit2/khoi S018,S019
   ```
   Ra `khoi/S018.png` (450 × 800, nhân vật thật của engine đứng giữa các khối) và `khoi/dung.json` (từng nhân vật: `dau_cao_pct`, `tam_dau_pct`, `trong_khung`, `bi_che_boi`, `cach_may`; cả shot: `may_trong_khoi`). Bỏ danh sách id để dựng tất cả.
4. Sửa số tới khi: mọi nhân vật trong `cast` của shot có `trong_khung = true` (trừ khi shot cố ý chỉ thấy tay, lưng: ghi `thay_tu`), `bi_che_boi = null` với nhân vật chính, `may_trong_khoi` rỗng, máy cách mọi khối ≥ 0,5 stud.
5. Vẽ ảnh cuối 9:16 **đè theo khung khối**: giữ nguyên vị trí, cỡ, hướng của từng nhân vật và đường chân tường; chỉ thêm chất liệu, ánh sáng, chi tiết. Dùng `khoi/<id>.png` làm ảnh bố cục và `nhan-vat/*.jpg` làm ảnh nhận dạng nhân vật.
6. Đo lại trên ảnh cuối: cỡ khối đầu và tâm đầu của nhân vật chính. Sai lệch cho phép so với `dung.json`: tâm đầu ±2 điểm %, cỡ đầu ±10 %. Vượt thì vẽ lại ảnh (không sửa số để chiều ảnh).

Nếu môi trường của Codex không mở được trình duyệt để chạy công cụ ở bước 3: tính bằng công thức ở mục 1, ghi `"da_dung_khoi": false`; phía engine sẽ dựng khung khối sau.

## 5. Thứ giao lại: `kich-ban/ep003-kit2/`
```
kit.json          bộ số (mẫu dưới)
shots/S001.jpg …  104 ảnh mới 9:16 (tối thiểu 720 × 1280)
khoi/S001.png …   104 khung khối + dung.json
BAO-CAO.md        làm được gì, shot nào chưa đạt và vì sao
```
`kit.json`:
```json
{
  "phien_ban": "2.0", "don_vi": "stud", "G": 5.478,
  "boi_canh": {
    "bedroom": {
      "goc": "tâm sàn phòng; +X đông, +Z nam",
      "kich_thuoc": [14.6, 9.4, 17.7],
      "khoi": [
        { "ten": "tuong_bac", "tam": [0, 4.7, -8.85], "kich": [14.6, 9.4, 0.4], "mau": "#9fb0a8", "vat_lieu": "vữa sơn" },
        { "ten": "ke_go", "tam": [3.5, 1.6, -8.0], "kich": [4.0, 3.2, 1.2], "ry_do": 0, "mau": "#a9774a", "vat_lieu": "gỗ" }
      ],
      "den": [ { "ten": "cua_so", "loai": "huong", "tu": [-3, 7, -9], "mau": "#9fc4ff", "manh": 1.0 } ]
    }
  },
  "shots": [
    {
      "id": "S018", "boi_canh": "bedroom", "thoi_gian": "dem",
      "cam":  { "p": [3.2, 4.6, 0.5], "l": [0.4, 4.5, -7.2], "fov": 31, "nghieng": 0 },
      "cam2": { "p": [3.0, 4.6, -0.3], "l": [0.4, 4.5, -7.2], "fov": 31, "nghieng": 0 },
      "dien_vien": [ { "ai": "GA", "pos": [0.4, 0, -6.6], "ry_do": 20, "tu_the": "idle", "nam": false, "mat": "10", "thay_tu": "ngực trở lên" } ],
      "dao_cu": [ { "ten": "day_chuyen_bac", "tam": [2.6, 3.25, -8.0], "kich": [0.5, 0.05, 0.3], "ry_do": 0, "cam_boi": null } ],
      "anh": "shots/S018.jpg", "khoi_anh": "khoi/S018.png", "da_dung_khoi": true,
      "do": { "GA": { "dau_cao_pct": 34.4, "tam_dau_pct": [41.4, 44.1] } },
      "do_tren_anh": { "GA": { "dau_cao_pct": 35.0, "tam_dau_pct": [42.0, 44.5] } },
      "tin_cay": "cao", "ghi_chu": ""
    }
  ]
}
```
- `cam` = khung đầu shot, `cam2` = khung cuối shot (máy gần như luôn chuyển động: một người thì đẩy vào, hai người trở lên hoặc vật lớn thì kéo ra). Shot tĩnh thật sự thì `cam2: null`.
- `ai` dùng mã kịch bản hoặc tên diễn viên engine đều được. `tu_the` lấy trong: `idle walk run jump fall wave point sit scared cheer dance lookAround faint cower lie shiver hold panic hug sitHold write lookUp tumble`. Tư thế chưa có thì ghi gần nhất và mô tả ở `ghi_chu`.
- `mat` = mã biểu cảm 00–36 như gói cũ. `cam_boi` = `"GA.tay_phai"` khi nhân vật cầm đạo cụ (khi đó bỏ `tam`).
- S104 là khung đen: `cam: null`.
- File mẫu chạy được ngay: `kich-ban/ep003-de-bai-2/bo-cuc-mau.json`, kết quả mẫu ở `kich-ban/ep003-de-bai-2/khoi-mau/`.

## 6. Luật hình (như các lần trước, nhắc lại)
- Không để tường, mái hiên, cột, cây che mặt nhân vật; không cắt nửa người nhân vật chính; cảnh hai ba người phải thấy đủ người có trong `cast`.
- Hai shot liền nhau cùng nơi: nhân vật không nhảy chỗ, đồ không đổi tường, ánh sáng không đổi hướng.
- Không chữ chèn, không logo thật, không mỏ chim. Dây chuyền ở S064 là dây chuyền bạc mặt giọt xanh ngọc, không phải nhẫn.
- Số nào không chắc thì ghi `"khong_chac": ["…"]`, không đoán.

## 7. Làm theo đợt
Đợt 1 (làm trước, dừng lại báo cáo): bối cảnh `bedroom` + 8 shot S018, S020, S023, S026, S033, S095, S097, S099. Đạt khi 8 khung khối không còn cảnh báo và 8 ảnh cuối nằm trong sai lệch cho phép. Sau khi được duyệt mới làm tiếp phố, tiệm, nhà máy.
