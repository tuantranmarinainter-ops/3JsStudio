# Hiệu chỉnh bộ luật kiem-luat trên ep001 (task 8)

Mục tiêu: bản v1 cũ (`dist/ep001_v1.html`) ĐỎ, bản cuối (`episodes/ep001/index.html`) XANH. Đáp án đối chiếu: `output/look/v1_vs_final/bao-cao.md` (do người làm phim rà tay, nhóm lỗi theo shot).
Số liệu: `output/ep001/kiem/luat.json` (cuối), `output/ep001/kiem-v1/luat.json` (v1). Ảnh duyệt: `output/ep001/duyet/`, lưới `luoi-loi.jpg`.

## Kết quả cuối

| | shotLoi | goi.can | luật cao nhất |
|---|---|---|---|
| Bản cuối | **10** (ngưỡng ≤ 10) | false | L3 2,1%, L4 2,1%, L6 2,1% (ngưỡng 15%) |
| Bản v1 | 52 | **true** | L4 22,1% |

## Bảng theo luật (ngưỡng cuối, 145 shot)

Nhóm đối chiếu: L4 = nhóm "camera" (16 shot); L7 = shot báo cáo ghi "tối" (1 shot: s006); L8 = nhóm "bối cảnh" + mô tả "trống" (28); L10 = nhóm "bố cục" (8); L11 = báo cáo không có shot nào "quá ngắn"; L1/L2/L3 = camera + bố cục (24), chỉ đo được trên bản cuối.

| Luật | v1 trượt | cuối trượt | báo cáo ghi lỗi thật | v1 bắt đúng (giao) | báo nhầm trên bản cuối | bỏ sót | skip (v1/cuối) |
|---|---|---|---|---|---|---|---|
| L1 | 0 | 0 | 24 | 0 | 0 | không đo được trên v1 | 145 / 0 |
| L2 | 0 | 0 | 24 | 0 | 0 | không đo được trên v1 | 145 / 0 |
| L3 | 0 | 3 | 24 | 0 | 3 (xem dưới) | không đo được trên v1 | 145 / 0 |
| L4 | 32 | 3 | 16 | 6 (38%) | 3 | 10 | 4 / 4 |
| L5 | 0 | 0 | - | - | 0 | - | 145 / 0 |
| L6 | 0 | 3 | - | - | 3 | - | 145 / 0 |
| L7 | 12 | 1 | 1 | 1 (100%) | 1 | 0 | 0 / 0 |
| L8 | 15 | 2 | 28 | 6 (21%) | 2 | 22 | 0 / 0 |
| L9 | 0 | 0 | - | - | - | - | tắt (145 / 145) |
| L10 | 0 | 0 | 8 | 0 | 0 | không đo được trên v1 | 145 / 30 |
| L11 | 0 | 0 | 0 | - | 0 | - | 0 / 0 |

"Báo nhầm trên bản cuối" = shot cuối còn trượt luật đó (bản cuối đã được duyệt, trượt = nghi báo nhầm hoặc cần người xem).

## Luật CHƯA TIN ĐƯỢC (không đạt "bắt ≥ 60%", không hạ tiêu chí)

- **L4 (camera đứng yên): bắt 6/16 = 38% theo nhóm "camera".** Nguyên nhân là nhóm "camera" của báo cáo mô tả camera ĐỔI GÓC (nâng cao, lùi xa, nhìn chéo), không phải camera đứng yên: 10/16 shot đó ở v1 có camera đang chuyển động (PSNR đầu–cuối 9–17 dB, nên luật không được phép bắt). 6 shot còn lại thật sự đứng yên ở v1 (s012, s039, s048, s114, s115, s130: PSNR 32–54) thì bị bắt đủ 6/6. L4 vẫn bắt 32 shot v1 đứng yên (22%) so với 3 ở cuối. Cần người xác nhận cách ghép nhóm trước khi tin con số 38%.
- **L8 (khung không trống): bắt 6/28 = 21%.** Nhóm "bối cảnh" của báo cáo là v1 THIẾU chi tiết (thiếu cọ, cua, nhà xa…), không phải ô phẳng; v1 không có thẻ tầng nên nửa còn lại của luật (vật mỗi tầng) không chạy. Hạ `oPhangMax` xuống 0,1 chỉ lên 39% mà bản cuối trượt 12 shot. Muốn bắt kiểu lỗi này cần luật khác (đếm số vật/độ phức tạp ảnh), ngoài phạm vi task.
- **L7 (cảnh tối): 1/1** nhưng mẫu quá nhỏ (báo cáo chỉ nêu 1 shot "tối"), chưa đủ để tin.
- **L10, L1, L2, L3, L5, L6: chưa kiểm được với v1** (bản gộp cũ không có vật gắn vai/thẻ hạt). Chỉ biết bản cuối xanh.
- **L11**: báo cáo không có shot "quá ngắn" nên không có đáp án để chấm.

## Các lượt chỉnh (tối đa 3; đã dùng 2)

| Lượt | Thay đổi | cuối shotLoi | v1 shotLoi |
|---|---|---|---|
| 0 (ngưỡng mặc định + sửa A/B, chỉ L9 tắt, L11 = 0.13) | - | 72 (L1 41, L7 19, L3 15, L4 7, L6 6, L10 3, L8 2) | 58 (L4 36, L7 20, L8 9) |
| 1 | L7.toiMax 0,55 → 0,63 và diemSangMin 3 → 0; L8.oPhangMax 0,30 → 0,20; L10.dienTichMin 0,08 → 0,04; L3.trongKhungMin 0,5 → 0,35; L1.le 0,05 → −0,4 và leSat −1 → −0,6; sửa bảng env (`mountain` không có tuyết rơi) | 15 (phát lại offline) | 55 |
| 2 | L3.trongKhungMin 0,35 → 0,30; `rieng` tắt L4 cho 4 shot (xem dưới) | **10** (chạy thật) | **52** |
| 3 | không dùng | | |

Lý do từng số (ep001, ghi trong `episodes/ep001/quy-trinh.json`):
- **L7**: trong 37 shot đêm của bản cuối, 14 shot không có điểm sáng ≥ 0,8 nên `diemSangMin` không phân biệt được gì (hạ `nguongSang` về 0,4 vẫn trượt 3). Còn `tyLeToi`: bản cuối chỉ trượt s037 (0,82); ngưỡng 0,63 nằm giữa s006 cuối (0,587) và s006 v1 (0,672), v1 trượt 12 shot.
- **L8**: ngưỡng 0,20 giữ bản cuối ở 2 shot trượt mà v1 trượt 15 (ngưỡng 0,30 chỉ bắt 9).
- **L10**: 3 shot cuối có diện tích 0,045–0,078 (nhà/nhân vật nhỏ trong khung rộng) chỉ thấp hơn 0,08 chút.
- **L1**: toàn bộ 41 shot áp dụng đều trượt vì nhà + 4 chân rộng hơn khung (lề −0,0 … −0,97) trong khi phim đã được duyệt; v1 không đo được nên không có chứng cứ phân biệt. Nới `le` về −0,4 và coi nhà tràn quá 0,6 khung là cận cảnh. **Đây là chỗ yếu: L1 gần như chỉ còn bắt nhà ra khỏi khung hẳn; cần người xem xác nhận ngưỡng.**
- **L3**: 0,30 (hero chỉ cần 30% nằm trong khung); phần cận cảnh xử lý bằng mã (xem dưới).
- **L11 = 0,13**: ep001 không khai `type`, 37 shot < 0,8 s, ngắn nhất 0,133 s.
- **L9 tắt**: chưa có dữ liệu vật liệu khai báo (task sau).

`rieng` (4 shot, đều tắt L4): **s087, s089, s139, s142** — camera hoàn toàn không đổi (PSNR 52–54 dB); là bưu thiếp/tủ thiếp cận để đọc chữ (cap.y 260 hoặc "tủ kín thiếp"), luật camera cho phép shot tĩnh ở loại này. Chưa có `static: true` trong `shots.js` nên khai ở đây. Không dùng `rieng` cho luật khác.

## Sửa mã đi kèm (ngoài danh sách A/B của brief)

- `L1` đạt khi ÍT NHẤT MỘT trong 3 khung đạt lề + đủ chân (camera zoom out/lia để lộ chân); trước đó yêu cầu cả 3 khung.
- `L3` thêm `canCanhDienTich` (mặc định 2): hero có bbox lớn hơn 2 lần khung = cận cảnh, miễn phần `trongKhung` (zoom IN vào mặt là luật camera), vẫn xét che mặt. Trước đó cận cảnh mặt bị coi là "nhân vật ra khỏi khung" (6 shot trượt giả).
- `env-loai.mjs`: `mountain` (núi mây) bỏ khỏi `ENV_TUYET` vì không có hạt tuyết rơi (hết 3 trượt giả L6: s057–s059).
- `kiem-luat.mjs`: cờ `--luu-ctx <file>` đổ dữ liệu đo (m, ảnh xám, mặt nạ) để phát lại luật offline khi chỉnh ngưỡng.

## Danh sách shot cần người xem (còn trượt ở bản cuối; ảnh: `output/ep001/duyet/luoi-loi.jpg`, ảnh từng khung ở `02_loi/`)

| Shot | Luật | Số đo | Nghi |
|---|---|---|---|
| s010 | L3, L8 | cheMat 0,667; ô phẳng 0,375 | mặt bị chăn che (giường)? khung hơi trống? |
| s037 | L3, L7 | cheMat 0,84; tối 0,82 | giường tối, mặt bị che? |
| s136 | L3 | cheMat 0,358 | mặt bị che một phần |
| s033 | L8 | ô phẳng 0,438 | biển phẳng/ít vật |
| s009 | L6 | thiếu bụi chân `leg_FR` | chân phải không có bụi |
| s094, s135 | L6 | `hat.tuyet = 0` trong `iceSea` | không có tuyết rơi ở 2 shot này? |
| s049, s083, s106 | L4 | PSNR 32,9 / 31,9 / 35,5 | camera gần như đứng yên (ngưỡng 30) |
