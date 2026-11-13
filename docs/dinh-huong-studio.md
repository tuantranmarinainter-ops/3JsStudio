# Định hướng 3JS Studio (người dùng nêu 2026-11-13)

## Ý của người dùng (ghi nguyên ý)
- Studio phát triển thành **công cụ chuyên nghiệp**, không chỉ là trình phát.
- **Ưu tiên số 1 hiện giờ: ra video nhanh.** Đầu vào chỉ là **kịch bản**; kết hợp **nhân vật chủ đạo là Gà**; ra toàn bộ video mà người dùng **ít phải chỉnh sửa nhất**.
- Thêm **chế độ 3D** bên cạnh chế độ Phim: như một phần mềm 3D, xem được thành phố bố trí ra sao, nhân vật đứng đâu; với từng shot thì thấy camera, địa điểm, phối cảnh.
- Bắt lỗi theo **shot** là chính, theo frame khi cần chi tiết (đã làm, commit 716eb58).
- Khung studio PC: viền kéo co giãn, cột thẻ dọc, timeline rê theo frame, marker phím M, bánh răng cài đặt, Gửi tới Claude (bản mẫu v2 đã duyệt; đang đưa vào trình phát thật).
- Tách khung studio khỏi nội dung tập để mỗi tập nhẹ hơn (chưa làm).

## Đề xuất của Claude cho chế độ 3D (chưa được duyệt — chưa code)
Nguyên tắc: chế độ 3D **chỉ để xem và kiểm**, không sửa cảnh bằng tay. Lý do: shot là dữ liệu (`shots.js`), mọi thứ là hàm của `t`; cho kéo thả sẽ thành hai nguồn sự thật và làm chậm mục tiêu "kịch bản → video".

Giai đoạn 1 — Xem (rẻ, dùng lại cảnh đang có):
- Nút chuyển **Phim | 3D** trên khung hình. 3D = cùng scene tại cùng `t`, nhưng nhìn qua **camera tự do** (xoay/zoom/pan bằng chuột), tắt hậu kỳ nặng.
- Vẽ **camera của shot**: khối chóp tầm nhìn tại vị trí camera thật + **đường đi camera** trong shot (lấy mẫu `renderAt` theo t).
- **Nhãn** nhân vật, đạo cụ, địa điểm (`places`); lưới sàn; nút góc nhìn nhanh: Trên xuống (bản đồ thị trấn), Trước, Theo camera shot.
- Rê timeline thì cảnh 3D chạy theo; chọn shot thì bay tới chỗ shot đó diễn ra.

Giai đoạn 2 — Kiểm:
- Bấm vào vật để xem tên, kit/model, vị trí, shot nào dùng; ghi **marker gắn vào vật** ("cái kệ này che mặt Gà") để Claude sửa đúng thứ.
- Lớp phủ kiểm luật camera: vùng khung an toàn, vật che mặt nhân vật, nhân vật ngoài khung.
- Bản đồ thị trấn 2D nhỏ: nhà nào vai gì (tiệm bánh, thị trưởng…), đường đi của nhân vật qua các shot.

Giai đoạn 3 — Chỉnh nhẹ (chỉ khi thật cần):
- Kéo một vật/nhân vật/camera → studio KHÔNG tự sửa file, mà sinh **đề nghị sửa** (vd `s040: cam.dist 12 → 9`) gửi tới Claude như một marker. Vẫn một nguồn sự thật.

Chi phí/rủi ro: giai đoạn 1 chủ yếu thêm vào `tools/export-ui.js` + một module nhỏ `engine/debug3d.js`; không đụng shot. Rủi ro chính là hiệu năng khi tắt/bật hậu kỳ và việc camera tự do không được ảnh hưởng tới xuất MP4.

## Đề xuất thứ tự ưu tiên (theo "ra video nhanh")
1. Xong ep002 (gấu, đạo cụ, âm thanh, shot yếu) — đang chạy.
2. **Dây chuyền kịch bản → video với Gà**: đo xem ep002 đã phải sửa tay những gì (đạo cụ khối, 3 bối cảnh, shot trống, đêm quá nhiều, gấu) rồi vá vào `lam-phim`/tập mẫu để tập 3 không lặp lại; bộ đạo cụ + nhà + nhân vật đã duyệt thành thư viện mặc định.
3. Khung studio thật + Gửi tới Claude (đang chạy) → vòng sửa nhanh hơn.
4. Chế độ 3D giai đoạn 1.
5. Tách khung studio khỏi nội dung tập; chế độ 3D giai đoạn 2–3.
