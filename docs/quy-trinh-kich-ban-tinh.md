# Quy trình chuẩn: kịch bản → phim HTML (dây chuyền Codex/kit)

Ngày: 2026-11-15. Lý do có quy trình này: `docs/nghien-cuu-prompt-chuan.md`. Đặc tả file: `docs/quy-trinh-dau-vao.md`.
Mọi file của một tập nằm ở `kich-ban/<ep>/` cho tới bước 11 (khi đó mới sinh `episodes/<ep>/`).
Ký hiệu: **STOP** = dừng chờ bạn duyệt. ⚠ = mắt xích chưa nối, hiện làm tay.

## Ba luật xuyên suốt
1. **Số đo stud chỉ có 2 nguồn:** bảng chuẩn theo người (Gà = 5,48 stud, bước 4) và kích thước model thật (bước 6). Không bao giờ đo trên ảnh AI.
2. **Hình khối khoá trước, ảnh AI vẽ sau:** Codex chỉ vẽ không khí/màu chồng lên ảnh khối xám, không được tự đổi hình khối.
3. **Sửa ở bước nào thì làm lại từ bước đó trở xuống**, không làm lại các bước trên.

## Sơ đồ
```
Lối 1: câu luật ─► [0a viet-kich-ban] ─┐
Lối 2: kịch bản thô của bạn ──[0b]─────┤
Lối 3: video tham khảo ─► [0c video-sang-kich-ban] ⚠ (chỉ lấy format, không chép truyện)
                                       ▼
 [1–2 chấm + hỏi] ─► [3 chuyện tinh + bảng shot] ─► [4 bối cảnh tinh]   ← skill xu-ly-kich-ban
        ─► [5 tờ mẫu nhân vật] ─► [6 duyệt tài nguyên] ─► [7 khối xám]
        ─► [8 ảnh tham chiếu bối cảnh] ─► [9 ảnh shot] ─► [10 kit] ─► [11 dựng app] ─► [12 giọng, tiếng, xuất HTML]
```

---

## Bước 0 — Đưa kịch bản vào (chọn 1 trong 3 lối)
| Lối | Skill | Đầu vào | Xử lý | Đầu ra |
|---|---|---|---|---|
| 0a | `viet-kich-ban` (nhánh Codex/kit) | Một câu luật "Ở thị trấn này…" | Viết 5 mẫu (mỗi mẫu một kiểu twist) → **STOP** bạn chọn số → viết kịch bản chữ: luật, điểm yếu, twist, lời giải, nhân vật, bối cảnh, lời kể theo 4 phần (chưa chia shot) | `kich-ban/<ep>/kich-ban.md` |
| 0b | — | Kịch bản thô của bạn (chuyện, thoại, mô tả nhân vật) | Lưu nguyên văn, không sửa | `kich-ban/<ep>/kich-ban.md` |
| 0c ⚠ | `video-sang-kich-ban` | File/link video | Cắt shot, nhận dạng lời, lấy khung → phân tích nhịp/camera | `kich-ban/<tên>/phan-tich.md` (hiện ra `storyboard.md` kiểu cũ; chưa có lựa chọn ra kịch bản chữ) |

## Bước 1–2 — Chấm điểm và hỏi bổ sung · skill `xu-ly-kich-ban`
- **Đầu vào:** `kich-ban/<ep>/kich-ban.md`.
- **Xử lý:**
  1. Chấm từng tiêu chí trong `.claude/skills/xu-ly-kich-ban/tieu-chi.md`: nhóm A (chuyện: luật 1 câu, điểm yếu, bí mật người lớn, gieo → trả, kiểu twist, kết…), nhóm B (dựng được: nhân vật đủ 6 ý, hành động có đồ vật cụ thể, bối cảnh đủ giờ/thời tiết/nguồn sáng, đủ vật lấp khung 9:16, vị trí nhất quán…). Mỗi dòng: đạt / yếu / thiếu + câu bằng chứng.
  2. Chọn quy mô: `doan` (đoạn thử) hoặc `tap` (2–3 phút, ~140 shot).
  3. Chỗ yếu/thiếu: Claude tự điền thứ nhỏ (đồ lấp đầy, màu phụ, chia shot); thứ thuộc quyền bạn (luật, twist, kết, nhân vật có tên, bí mật) thì hỏi — tối đa 10 câu, câu nào cũng có đề xuất mặc định (`cau-hoi.md`).
- **Đầu ra:** `kich-ban/<ep>/xu-ly/cham-diem.md`.
- **STOP:** bạn trả lời (chỉ cần "ok hết" hoặc sửa số câu).

## Bước 3 — Chuyện tinh và bảng shot · skill `xu-ly-kich-ban`
- **Đầu vào:** bản thô + câu trả lời bước 2.
- **Xử lý:**
  1. Viết `kich-ban-tinh.md` theo `khuon-kich-ban-tinh.md`: lõi (luật, điểm yếu, twist, lời giải, câu đặt cược, các cặp gieo → trả), bảng nhân vật (vai, dáng khối R6, trang phục + màu hex, đạo cụ cầm, biểu cảm cần), bảng bối cảnh tóm tắt, 4 nhịp với lời kể từng câu (≤ ~35 ký tự), mục "Đã tự điền", mục "Cần dựng".
  2. Viết `bang-shot.json`: mỗi shot có bối cảnh, nhân vật, `dur`, thoại, camera (`loai`, `gocMay`, `coKhung`), số hình 1/2/3, mô tả khung đầu/giữa/cuối, hành động.
  3. Kiểm: `node tools/kiem-bang-shot.mjs kich-ban/<ep>` tới 0 lỗi; tự chấm lại nhóm A, B trên bản tinh.
- **Đầu ra:** `kich-ban-tinh.md`, `bang-shot.json`.
- **STOP:** duyệt chuyện và bảng shot (có trang duyệt: `node tools/duyet-bang-shot.mjs kich-ban/<ep> mo` → `duyet-1.json`).

## Bước 4 — Bối cảnh tinh (danh sách mốc) · skill `xu-ly-kich-ban`
- **Đầu vào:** `bang-shot.json` + bảng chuẩn theo người (`khuon-boi-canh.md`); env có sẵn trong `engine/envs/` nếu dùng lại.
- **Xử lý:** mỗi bối cảnh viết đủ 6 phần:
  1. Hình khối lớn: rộng × sâu × cao, trong/ngoài, ranh giới.
  2. Một phong cách + bảng 4–6 màu hex.
  3. Vật đo cỡ: hình nộm xám 5,48 stud đặt đúng chỗ nhân vật đứng, khối 1×1×1.
  4. Hệ toạ độ + từng mốc: tên, **vai trò trong chuyện** (trèo lên, nấp sau…), vùng x/y/z, kích thước, màu, vật liệu. Mọi vật mà shot nào nhắc tới đều phải có.
  5. Đồ lấp đầy theo cụm (trái/phải/tiền cảnh/hậu cảnh) có số lượng; luôn có trời/hậu cảnh xa, mặt đất.
  6. Vùng chừa trống (đường đi nhân vật, đường camera) + điều cấm kiểm được (giữ đúng số ô kính, không thêm cửa…).
  Kèm ánh sáng và "shot nào nhìn từ hướng nào". Số ghi `nguonSo: "uoc"` (hoặc `"env"` nếu lấy từ env có sẵn).
- **Đầu ra:** `kich-ban/<ep>/boi-canh/<id>.json` (mẫu: `tools/tests/fixtures/boi-canh-mau/moc-nha-may-ngoai.json`).
- **STOP:** duyệt danh sách mốc.

## Bước 5 — Tờ mẫu nhân vật · Codex qua `tools/codex-ve.mjs`
- **Đầu vào:** bảng nhân vật trong `kich-ban-tinh.md`; ảnh nhân vật dùng lại từ tập cũ (nếu có).
- **Xử lý:** `node tools/codex-ve.mjs tham-chieu kich-ban/<ep>` soạn đề bài theo cụm, chạy Codex (`gpt-6-luna`, mức low, song song) vẽ mỗi nhân vật một tờ: trước, nghiêng, sau, 4 biểu cảm, các dáng đặc biệt; nền trơn, dáng khối.
- **Đầu ra:** `tham-chieu/nv_<id>.png`, `codex/tien-do-<cụm>.txt`.
- **Kiểm:** đủ file trên đĩa (không tin lời báo); agent phụ soi màu/tỉ lệ so với mô tả. **STOP:** duyệt nhân vật.

## Bước 6 — Duyệt tài nguyên (model) · `tools/roblox.mjs`, `tools/nhap-model.mjs`, trang duyệt asset
- **Đầu vào:** danh sách mốc + đồ lấp đầy (bước 4).
- **Xử lý:**
  1. Mỗi món tìm 10 ứng viên (kho sẵn có → Kenney → Roblox Creator Store → Poly Haven/Sketchfab/Poly Pizza), ưu tiên low poly.
  2. Bạn chọn trên trang duyệt (cây/đá cho chọn nhiều mẫu).
  3. Nhập món đã chốt: `node tools/nhap-model.mjs nhap …` (hoặc `nhap roblox:<id>`), nén bằng `tools/nen-model.mjs`, ghi nguồn vào `assets/manifest.json`.
  4. Ghi **kích thước thật** của model vào `boi-canh/<id>.json`, đổi `nguonSo` thành `"model"`. Kho thiếu món nào thì sửa lại bước 3–4 cho khớp (vd đổi thùng thành phuy).
- **Đầu ra:** model trong `assets/`, danh sách mốc có số chốt.
- **STOP:** chọn model.

## Bước 7 — Khối xám trong engine · skill `scene-env` + `tools/look.mjs`
- **Đầu vào:** `boi-canh/<id>.json` (số chốt) + model đã nhập.
- **Xử lý:** dựng `engine/envs/<tên>.js` theo đúng số: hộp xám (hoặc model thật để thô), hình nộm xám ở chỗ nhân vật đứng, gắn tầng trước/giữa/sau. Chụp 2 góc cố định: trên cao nhìn xuống và ngang tầm mắt (`node tools/look.mjs … --out output/<ep>-khoi-xam`).
- ⚠ `scene-env` chưa đọc thẳng file mốc: hiện phải chép số tay vào env.
- **Đầu ra:** env mới + 2 ảnh khối xám.
- **STOP:** duyệt bố cục (sai chỗ nào sửa số trong danh sách mốc rồi dựng lại).

## Bước 8 — Ảnh tham chiếu bối cảnh · Codex qua `tools/codex-ve.mjs`
- **Đầu vào:** 2 ảnh khối xám + ảnh các model đã chốt + danh sách mốc.
- **Xử lý:** đề bài bắt Codex vẽ CHỒNG lên ảnh khối xám (đính kèm `-i`): thêm ánh sáng, vật liệu, không khí; cấm đổi hình khối, cấm thêm/bớt mốc, không vẽ nhân vật.
- ⚠ `codex-ve.mjs` hiện soạn đề bài từ một câu `moTa`: cần sửa để đọc `boi-canh/<id>.json` và đính kèm ảnh khối xám.
- **Đầu ra:** `tham-chieu/bc_<id>.png` (toàn cảnh 9:16, có thể thêm góc ngược).
- **Kiểm:** agent phụ đối chiếu ảnh với danh sách mốc (có / thiếu / sai màu / sai số lượng). **STOP:** duyệt ảnh.

## Bước 9 — Ảnh shot (storyboard) · Codex qua `tools/codex-ve.mjs shot`
- **Đầu vào:** `bang-shot.json` + ảnh tham chiếu nhân vật và bối cảnh đã duyệt (đính kèm mỗi cụm).
- **Xử lý:** vẽ đúng số hình mỗi shot (`shot_<id>_dau|giua|cuoi.png`), giữ nguyên bối cảnh, đạo cụ, cỡ nhân vật giữa các hình của cùng một shot. Chạy song song theo cụm bối cảnh.
- **Đầu ra:** `hinh/shot_*.png`.
- **Kiểm:** đủ file, đúng 9:16 (`node tools/kiem-kit.mjs`); agent phụ soi tính nhất quán. **STOP:** duyệt khung.

## Bước 10 — Kit (số đo cho từng shot) · Codex/Claude theo đề bài kit
- **Đầu vào:** `bang-shot.json` + `boi-canh/<id>.json` + `hinh/` + `docs/kit.mau.json`.
- **Xử lý:** **toạ độ bối cảnh và chỗ đứng lấy thẳng từ danh sách mốc**. Chỉ camera (`p`, `nhin`, `fov`) và tư thế nhân vật là đo trên ảnh shot, rồi kiểm cỡ đầu theo công thức. Ghi `tinCay` trung thực.
- **Đầu ra:** `kit.json` + báo cáo đo theo bối cảnh. Đổi toạ độ bối cảnh → thế giới: `goc.json` (`tools/kit-toa-do.mjs`).
- **Kiểm:** `node tools/kiem-kit.mjs kich-ban/<ep>` mã thoát 0; xem bằng `tools/kit-trang.mjs`. **STOP:** duyệt kit.

## Bước 11 — Dựng vào app · `tools/kit-shots.mjs` + skill `kiem-tra-khung`
- **Đầu vào:** `kit.json`, `bang-shot.json`, `goc.json`, env bước 7.
- **Xử lý:** `node tools/kit-shots.mjs kich-ban/<ep> --goc kich-ban/<ep>/goc.json` sinh `episodes/<ep>/shots.js` có chuyển động; khai `episode.js` (diễn viên, env); chụp kiểm từng shot: `node tools/look.mjs episodes/<ep>/index.html --shots … --gates`, so với ảnh shot bước 9.
- `lam-phim` nhận kit: `node tools/lam-phim.mjs <ep> tiep` (tự nhận `kich-ban/<ep>/kit.json`, hoặc `--kit <thư mục>`); mốc duyệt kit: `--duyet-kit`. Chi tiết ở skill `lam-phim`.
- **Đầu ra:** `episodes/<ep>/` dựng được.
- **STOP:** duyệt bảng khung.

## Bước 12 — Giọng, tiếng, phụ đề, xuất · skill `giong-doc`, `tieng-dong`, `hieu-ung-hinh`, `xuat-phim`
- **Đầu vào:** `episodes/<ep>/` + lời kể từ `kich-ban-tinh.md`.
- **Xử lý:** giọng Việt CapCut / Anh Edge (trang nghe thử → bạn chốt), 3 lớp tiếng động, hiệu ứng hình, gộp HTML có nút Xuất MP4 (`npm run bundle:<ep>` hoặc `node tools/build.mjs <ep> <lớp>`), xuất thử bằng `node tools/xuat.mjs <ep>`; kiểm cả phim một lần `look.mjs --shots all --det`.
- **Đầu ra:** `dist/<ep>.html` (+ video xem thử trong `output/xuat/`).
- **STOP:** bạn xem phim. Góp ý sau đó đi qua skill `gop-y` / `sua-theo-lop`.

---

## Dây chuyền cũ (chỉ cho ep001–ep003)
`viet-kich-ban` bước 2–3 → bảng 19 cột `episodes/<ep>/kich-ban.md` → `tools/storyboard.py` → skill `lam-phim`. Không có ảnh Codex, không có kit.
`nhap-kich-ban` dùng khi bạn đưa sẵn storyboard có ảnh. Tập mới không dùng đường này.

## Skill chồng chéo và mắt xích còn thiếu
| Cặp | Chồng ở đâu | Việc cần làm |
|---|---|---|
| `viet-kich-ban` bước 2–3 ↔ `xu-ly-kich-ban` bước 3 | Hai định dạng bảng shot | Đã chia nhánh; bỏ bước 2–3 khi dây chuyền mới chạy ổn |
| `nhap-kich-ban` ↔ bước 9–11 | Hai đường từ ảnh vào app | Giữ `nhap-kich-ban` cho storyboard có sẵn ảnh của bạn |
| `lam-phim` ↔ bước 11–12 | Hai đầu vào (bảng 19 cột / kit) | Đã nối: `lam-phim` tự nhận kit |
| `video-sang-kich-ban` ↔ Lối 3 | Ra định dạng cũ | ⚠ Thêm lựa chọn ra kịch bản chữ |
| `scene-env` ↔ bước 7 | Không chồng | ⚠ Đọc `boi-canh/<id>.json` |
| `codex-ve.mjs` ↔ bước 8 | Không chồng | ⚠ Đọc danh sách mốc + đính kèm ảnh khối xám |
