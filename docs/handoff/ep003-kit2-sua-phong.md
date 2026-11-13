# ep003 kit2 — sửa lớp `phong` (11 shot)

File sửa: `kich-ban/ep003-kit2/kit-phong.json` (chỉ 11 shot được giao; 24 shot còn lại giữ nguyên, đã đối chiếu với bản sao lưu). Ảnh xem thử: `kich-ban/ep003-kit2/xem/<ID>.jpg`. Trước: người chấm cho cả 11 là "lệch". Sau (tự chấm bằng ảnh ghép): đạt 2 · lệch 9 · hỏng 0.

| shot | trước | sau | khung engine giờ thấy gì | còn lệch gì |
|---|---|---|---|---|
| S001 | lệch | tam | cận chốt, máy lia nhẹ, fov 32; núm cửa chỉ còn ló ở đáy | cửa nâu không xanh; chốt bị cắt bề ngang (khung dọc hẹp) |
| S021 | lệch | tam | máy đông-nam nhìn xuống: đồng hồ + sách rõ, tay áo Gà vào từ trái-dưới | bàn tay chưa ôm hai bên đồng hồ; đầu Gà lấp góc trái |
| S022 | lệch | tam | máy cao phía đông-nam; Bắp NẰM ở cuối giường thấy rõ, Gà đầu trên gối | mặt Gà bị tay che; bố cục lật trái-phải so với ảnh; không thấy cửa sổ |
| S023 | lệch | tam | máy sau đầu Gà, nhìn xuyên phòng vào gương: khung gương + kệ + đồng hồ + sách trong gương | Gà chỉ lộ nửa mặt ở đáy khung (không phải băng trán mờ); không có cửa sổ trong gương |
| S024 | lệch | **dat** | từ gối nhìn gương: khung gương bên phải, kệ + đồng hồ (~20% cao khung) cạnh sách, sáng rõ | đồng hồ/sách dời sang x 2,0/0,95 riêng shot; thấy cửa sổ ở nền gương |
| S025 | lệch | **dat** | cận mặt Gà nằm gối, mặt hướng máy, dựng đứng, băng trán thấy | không có góc gương |
| S026 | lệch | tam | gương xoay −2,288; Bắp ngồi chân giường thấy trong gương, mép khung trái | Bắp nhỏ (~15% cao); nền gương là tường tây, không phải cửa sổ + kệ (hình học gương) |
| S031 | lệch | tam | Bắp đứng trên mặt kệ ôm đồng hồ, sách bên phải, máy cao ~55° | tay chưa chạm sách; cửa sổ ngoài khung |
| S037 | lệch | tam | máy cao nhìn xuống kệ: nhẫn sát gáy sách, tay áo Gà đến sát nhẫn | không thấy bàn tay kéo nhẫn rõ; sách che nhiều bên phải |
| S095 | lệch | tam | hai tay Gà (z ±0,5) khép vào, dây chuyền thả giữa | còn thấy thân/chân Gà, chưa cận hai bàn tay như ảnh |
| S102 | lệch | tam | Gà cúi tay phải trước Bắp, Bắp ngước, két sau chân Gà | Bắp thấp-trái, tay Gà chưa dừng đúng trên đầu Bắp; cỡ rộng hơn ảnh |

## Số đã chốt dùng chung
- Nhân vật nằm: Gà `pos [-4,81, 3,14, -0,9]`, đầu ~(-4,8, 3,5, -5,4).
- Dấu pose tay: `rightArm.z` dương + `leftArm.z` âm = khép TAY VÀO GIỮA (đã thử ở S095; z 0,8 thì hai bàn tay chồng nhau).
- Xem qua gương: dùng điểm gương `phongGuong()` giao tia máy → ảnh đối xứng của vật; muốn thấy vật cạnh nhau trong gương thì vật hiện ở phía ĐỐI so với trực tiếp (sách đông của đồng hồ thành phía tây trong gương), nên S024 dời sách riêng shot.
- Giữ bản sao lưu số cũ: `output/_kit-phong.bak.json` (và thư mục tạm `output/_tmp/` có script proj/lm).

## CẦN ENGINE
- CẦN ENGINE: bối cảnh phòng không có cách ẩn núm cửa tròn dưới chốt (S001); cửa nâu thay vì xanh xám.
- CẦN ENGINE: gương cố định ở góc đông-nam nên cảnh trong gương luôn là tường tây-bắc; muốn "cửa sổ + kệ + Bắp trên giường" cùng khung như ảnh S026 cần cho phép đặt Bắp/giường ảnh riêng shot hoặc dời gương.
- CẦN ENGINE: không có tư thế "hai tay ôm vật" khép bàn tay (S021/S095); tay R6 chỉ xoay quanh vai.
