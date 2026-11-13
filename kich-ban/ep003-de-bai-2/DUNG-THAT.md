# Dựng thật: đặt 104 shot trong chính engine (thay cho bước "dựng khối" của DE-BAI.md)

Đợt 1 cho thấy công cụ dựng khối không đủ: không có gương phản chiếu, két mở/nhấc, đạo cụ cầm tay. Từ giờ **xem thử bằng engine thật**. Khung engine chụp ra chính là khung phim, nên việc của bạn là: đặt nhân vật và máy quay sao cho khung engine **kể đúng điều mà ảnh kịch bản cũ kể** (ai, làm gì, cỡ cảnh, góc nhìn, vật then chốt), với nhân vật thật của engine. KHÔNG vẽ ảnh trong đợt này.

Hệ quy chiếu, bảng số đo nhân vật, công thức ống kính: như `DE-BAI.md` mục 1–2 (stud; +X đông, +Y lên, +Z nam; `ry_do` 0 = nhìn về +Z; `fov` = góc nhìn dọc).

## Một lệnh duy nhất
```
node tools/kb/kit2-xem.mjs ep003 kich-ban/ep003-kit2/kit-<lớp>.json S018,S019,S020
```
- `<lớp>` = `phong` | `pho` | `nha-may` (mỗi người một file, không sửa file của lớp khác).
- Lệnh tự chuyển kit thành dữ liệu shot, mở engine, chụp mỗi shot 3 khung (đầu, giữa, cuối) và ghép `kich-ban/ep003-kit2/xem/<ID>.jpg` = [ảnh kịch bản cũ | engine đầu | engine giữa | engine cuối]. **Mở ảnh ghép ra xem** sau mỗi lần chạy.
- In số đo khung giữa cho từng diễn viên: tâm đầu ở đâu (% khung), thân trong khung bao nhiêu, thân/mặt bị vật khác che bao nhiêu. ⚠ = đầu ngoài khung hoặc bị che nhiều mà không ghi `thay_tu`.
- Mỗi lần chạy mất 40–90 giây: gom nhiều shot vào một lần. Nếu báo "LỖI TRANG" thì chạy lại một lần (có thể người khác vừa ghi file lớp của họ).

## Mẫu kit (mỗi shot một phần tử của `shots`)
```json
{ "phien_ban": "2.1", "don_vi": "stud", "shots": [
  { "id": "S020",
    "cam":  { "p": [-0.8, 4.5, 7.8], "l": [1.0, 3.0, -5.8], "fov": 54.4 },
    "cam2": { "p": [-0.7, 4.5, 7.2], "l": [1.0, 3.0, -5.8], "fov": 54.4 },
    "dien_vien": [
      { "ai": "GA", "pos": [0.9, 0, -0.6], "pos2": [1.5, 0, -1.3], "ry_do": 170, "tu_the": "walk", "giu": "dong_ho", "thay_tu": null }
    ],
    "them": { "envArg": { "cuaPhong": 1 }, "props": { "sach_reu": { "at": [4.9, 3.22, -8.1], "ry": 0.25 } } },
    "trang_thai": "dat", "ghi_chu": "" } ] }
```
- `cam` = khung đầu, `cam2` = khung cuối. Máy gần như luôn chuyển động nhẹ: một người thì đẩy vào (hoặc thu `fov`), hai người trở lên hoặc vật lớn thì kéo ra. `cam2: null` chỉ cho shot tĩnh thật sự.
- `dien_vien`: CHỈ những ai có trong kit mới hiện; ai không ghi thì bị ẩn. `pos` = giữa hai đế giày (ngồi: mặt ngồi; `nam: true`: gót chân, cộng 0,5 vào Y). `pos2` = đi tới đâu trong shot (dùng với `walk`/`run`). `thay_tu` = ghi khi cố ý chỉ thấy một phần ("hai tay", "sau đầu và vai", "trong gương").
- `tu_the`: `idle walk run jump fall wave point sit scared cheer dance lookAround faint cower lie shiver hold panic hug sitHold write lookUp tumble`.
- `giu` = tên đạo cụ engine cầm ở tay phải (hoặc `null` để bỏ cầm). `pose` = pose thô (rad), ví dụ `{ "head": { "x": 0.3 }, "rightArm": { "x": -1.25, "z": 0.3 }, "leftArm": { "x": -1.25, "z": -0.3 } }` (tay `x` âm = đưa ra trước).
- Mặt, `giu`, `pose` của shot cũ được GIỮ nếu kit không ghi đè. Vị trí, hướng, tư thế của shot cũ thì bị thay bằng kit.
- `them` = trường engine thô gộp vào shot: `envArg` (trạng thái bối cảnh), `props` (`"<tên đạo cụ>": { "at": [x,y,z], "ry": rad }` để đặt, `null` để ẩn), `lightOverride` (`{ "exposure": 1.4 }`).
- `trang_thai`: `dat` (đạt) | `tam` (xem được nhưng còn lệch, ghi lệch gì) | `hong` (chưa dựng được, ghi vì sao).

## Tài liệu để đọc (đừng đoán toạ độ)
| Cần gì | Ở đâu |
|---|---|
| Shot kể gì, ai có mặt | `kich-ban/ep003-goi2/Shotlist_104.json` (`title`, `action`, `cast`, `camera`) + ảnh `kich-ban/ep003-goi2/shots/<ID>.jpg` |
| Dòng shot hiện tại (đạo cụ, cầm gì, trạng thái bối cảnh, mặt) | `episodes/ep003/shots-phong.js`, `shots-pho.js`, `shots-nha-may.js` (tìm `id: "s020"`) |
| Bản đồ nhanh từng bối cảnh (tên vật, tâm, kích thước) | `kich-ban/ep003-de-bai-2/khoi-e3-phong.json`, `khoi-e3-pho.json`, `khoi-e3-tiem.json`, `khoi-e3-nha-may.json` |
| Hình học chính xác, điểm có tên, tham số `envArg` | `engine/envs/e3-phong.js` (đầu file: `PHONG_DIEM`, danh sách `envArg`), `e3-pho.js`, `e3-tiem.js`, `e3-nha-may.js` |
| Điểm có tên của tập | `episodes/ep003/episode.js` → `places` |
| Đạo cụ có sẵn (tên engine) | `thung_dau_gau day_chuyen day_chuyen_bac nhan_bac sach_reu dong_ho nhan_moi cuon_sach hop_nhan ket_ga_om dong_ho_quyt vi tui_tien` + vật cố định của bối cảnh (két, kệ, bản đồ, băng chuyền… xem file env) |

Phòng Gà có gương phản chiếu thật trên tường đông: muốn thấy vật qua gương thì máy phải nhìn vào ảnh đối xứng của vật qua mặt gương (hàm `phongPhanChieu`, `phongGuong` trong `engine/envs/e3-phong.js`; tính ra số rồi ghi vào kit; `envArg.guongRy` xoay gương riêng cho shot).

## Cách làm từng shot
1. Đọc ảnh kịch bản cũ + `action` + dòng shot hiện tại. Ghi ra ý: chủ thể là ai/cái gì, cỡ cảnh, máy ở phía nào của chủ thể, vật nào bắt buộc thấy.
2. Đặt `dien_vien`, `them`, `cam`, `cam2`. Tính khoảng cách máy bằng công thức ở `DE-BAI.md` (đầu Gà cao 1,46 stud; khung dọc hẹp).
3. Chạy lệnh cho cả nhóm shot, mở từng `xem/<ID>.jpg`, so với ảnh kịch bản ở ô trái.
4. Sửa và chạy lại. Tối đa 4 vòng cho mỗi shot; hết 4 vòng mà chưa đạt thì ghi `tam`/`hong` kèm lý do rồi làm shot khác.

Đạt khi: (a) đủ người mà ảnh kịch bản cho thấy, mặt nhân vật chính không bị che (trừ khi cố ý); (b) cỡ cảnh và phía đặt máy giống ảnh kịch bản (không cần trùng từng điểm ảnh); (c) vật then chốt của shot thấy rõ; (d) không có tường, mái, cột, đồ đạc chắn kín khung; máy không chui vào vật; (e) hai shot liền nhau cùng nơi không nhảy chỗ nhân vật vô lý.

Giới hạn đã biết của engine (đừng cố vượt, ghi vào ghi chú): thân R6 không có bàn tay/ngón tay, không gập khuỷu/gối; gấu là mô hình có sẵn; biểu cảm là mặt dán.

## Ràng buộc
- Chỉ ghi file trong `kich-ban/ep003-kit2/`: `kit-<lớp>.json`, `GHI-CHU-<lớp>.md`. Lệnh xem thử tự ghi `episodes/ep003/kit2-<lớp>.js` và thư mục `xem/` (đó là việc của lệnh, không sửa tay).
- KHÔNG sửa `engine/`, `episodes/`, `tools/`. KHÔNG chạy git. Cần engine/bối cảnh/đạo cụ đổi gì thì ghi một dòng `CẦN ENGINE: …` trong `GHI-CHU-<lớp>.md`.
- `GHI-CHU-<lớp>.md`: bảng `| shot | trạng thái | khung engine đang thấy gì | còn lệch gì |`, cộng mục "Mốc đã chốt" (vị trí cố định của nhân vật/đồ dùng chung cho các shot sau). Lượt sau sẽ là một phiên mới đọc file này để làm tiếp, nên ghi đủ để người khác nối được.
- Giữ nguyên các shot đã có trong `kit-<lớp>.json` mà lượt này không được giao (chỉ thêm/sửa shot được giao).
