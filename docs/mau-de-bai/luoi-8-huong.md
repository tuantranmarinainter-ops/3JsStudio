# Đề bài: MỘT ảnh dạng slide, 8 ô — bối cảnh tiem-banh (tập test Ep5T)

Dùng công cụ tạo hình, tạo ĐÚNG MỘT ảnh PNG: `slide/tiem-banh_8huong.png` (tạo thư mục `slide/` nếu chưa có).
Vẽ ảnh MỚI hoàn toàn theo chữ; KHÔNG chép, cắt, lọc màu hay chỉnh ảnh có sẵn bằng script.
**Lưu file:** dùng ĐÚNG đường dẫn ảnh mà công cụ tạo hình trả về cho lần gọi của bạn. Nếu không có đường dẫn: chỉ tìm trong thư mục con của CHÍNH phiên này trong `%USERPROFILE%\.codex\generated_images\` (thư mục có tên trùng mã phiên của bạn), KHÔNG lấy file mới nhất của cả thư mục — nhiều phiên chạy song song, lấy nhầm ảnh phiên khác. Chép nguyên file sang đường dẫn đích; ghi đường dẫn nguồn vào file tiến độ.

## Bố cục ảnh
- Khổ ảnh dọc (2:3 hoặc 9:16). Lưới **2 cột × 4 hàng = 8 ô bằng nhau**, viền trắng mảnh 8 px giữa các ô, KHÔNG chữ, KHÔNG nhãn, KHÔNG số.
- Cả 8 ô là CÙNG một bối cảnh, cùng mốc, cùng màu, cùng số lượng đồ; chỉ đổi hướng nhìn. Không nhân vật.
- Thứ tự ô (đọc trái→phải, trên→dưới):
  1. Trước: nhìn từ phía trước (+Z), cao ngang đầu người chếch xuống ~25°
  2. Sau: nhìn từ phía sau (−Z), chếch xuống ~25°
  3. Trái: nhìn từ bên trái (−X), chếch xuống ~25°
  4. Phải: nhìn từ bên phải (+X), chếch xuống ~25°
  5. Từ trên xuống: mặt bằng nhìn thẳng từ trên cao, +X sang phải, phía trước (+Z) ở đáy ô
  6. Từ dưới lên: máy sát đất phía trước, ngước lên thấy biển hiệu, mái hiên, bầu trời
  7. Thẳng mặt: ngang tầm mắt người (4,75 stud) từ phía trước, nhìn thẳng, không chúi
  8. Ngang hông: ngang tầm mắt từ bên phải (+X), nhìn thẳng ngang

## Phong cách
KHỐI VUÔNG low poly kiểu Roblox: mọi vật dựng từ hộp chữ nhật, màu phẳng, cạnh sắc, không bo tròn, không vân tả thực; giữ đúng mã màu từng mốc.

## Nội dung bối cảnh
Đọc file `boi-canh/tiem-banh.json`: vẽ đủ mọi mốc trong "moc" (đúng vùng x/y/z, màu hex), đồ "lapDay" đúng số lượng, tôn trọng "cam" và "chuaTrong"; ánh sáng theo "anhSang" (chọn giờ đêm nếu có nhiều giờ). Không thêm đồ ngoài danh sách.

Xong ghi một dòng vào `codex/tien-do-slide.txt`: "xong slide/tiem-banh_8huong.png" hoặc lý do không vẽ được.
