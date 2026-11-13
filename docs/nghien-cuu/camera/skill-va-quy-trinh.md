# Nghiên cứu: skill camera, từ vựng shot và quy trình kiểm hình

Ngày: 2026-11-13. Chỉ đọc qua WebFetch, không cài đặt, không tải mã về chạy.
Lưu ý: nội dung lấy qua WebFetch là bản tóm tắt do mô hình xử lý, không phải chép nguyên văn. Các trích dẫn ngắn dưới đây cần đối chiếu lại trên nguồn trước khi dùng làm tài liệu chính thức.

## (a) scottstts/Threejs-Awesome-Graphics-Agent-Skills

- Đã đọc: `skills/threejs-camera-direction/SKILL.md` và `references/camera-rig-and-cinematic-systems.md`.
- Đã đọc: `skills/threejs-visual-validation/SKILL.md` (có file tham chiếu `references/graphics-validation-protocol.md`, chưa đọc).
- Tính offset camera từ kích thước chủ thể (L = chiều dài tàu), không dùng khoảng cách cố định.
- Chase mount: vị trí (0, 0.5L, -1.3L), điểm nhìn forward 0.35L (giá trị riêng của dự án đó).
- Side/orbit: độ cao tối thiểu 0.42L khi đậu, 0.20L ở chế độ khác.
- Chuyển cảnh: lưu vị trí và quaternion lúc bắt đầu, easing 1 − (1 − t)^1.8, lerp vị trí và slerp hướng.
- Trích: "Interpolate position with lerp and orientation with slerp." (không chắc từng chữ, cần kiểm)
- Trong lúc chuyển cảnh chỉ dùng một giai đoạn nội suy, không chồng bộ làm mượt theo dõi.
- Khi dispose cảnh: khôi phục FOV/near/far đã lưu. Kiểm tra quay lại đúng pose, không trôi nhỏ.
- Kiểm hình (visual-validation): khóa camera và seed, chụp ảnh cuối và ảnh không hậu xử lý, chụp ở góc gần / thiết kế / xa.
- Kiểm hình: quét seed đại diện, kiểm thời gian khi chuyển động, đo ngân sách frame/GPU, giữ bộ hồi quy nhỏ.
- Không có ngưỡng số, không đo bbox, không chấm điểm bằng mô hình, không có số vòng sửa trong phần đã đọc.

## (b) linegel/threejs-complete-set-of-skill

- Đã đọc: `skills/threejs-camera-controls-and-rigs/SKILL.md` (đường dẫn đúng; đường dẫn `threejs-camera-controls-and-rigs/SKILL.md` ở gốc trả 404).
- Phân quyền ghi: mỗi kênh (pose, projection, jitter, gốc tọa độ, lifecycle) chỉ có đúng một bên ghi.
- Trích: "Assign one writer to each channel." (tóm tắt, cần kiểm)
- Khai báo không gian: đơn vị, hệ thuận/nghịch, trục up; quy ước camera nhìn theo -Z (camera three.js).
- Chọn nhánh framing theo mục đích: tài sản dùng fit theo bounds; kiến trúc dùng neo mắt/mặt cắt và lens shift; điện ảnh dùng pose có điểm cut và blend rõ.
- Chọn projection: orthographic khi kích thước trên màn hình không phụ thuộc độ sâu, perspective khi co ngắn có nghĩa thị giác.
- Kiểm hợp lệ: basis trực giao, clip hữu hạn, w > 0; mọi điểm then chốt nằm trong safe frame và trong near/far; kiểm lại sau khi chỉnh camera nếu có vật cản.
- Handoff: lấy điểm đầu một lần, lerp vị trí và quaternion đường ngắn nhất, chép đúng giá trị đích khi kết thúc; thời lượng âm hoặc không hữu hạn bị từ chối.
- Cut, teleport, đổi projection hoặc đổi kích thước phải reset lịch sử temporal.
- Không định nghĩa shot size, góc máy, độ cao máy (close-up, wide, góc cao/thấp).

## (c) HITsz-TMG/FilmAgent (chuyển hướng sang HITsz-TMG/VideoClaw)

- Link FilmAgent trả về nội dung README của VideoClaw. Không thấy mô tả vai trò agent (Director, Screenwriter, Cinematographer, Critic...) trong trang đã đọc.
- VideoClaw: hệ thống "AI đạo diễn" với các giai đoạn kịch bản, nhân vật/cảnh, phân cảnh, ảnh tham chiếu, sinh video, hậu kỳ.
- Không có từ vựng shot size/angle, không có cách chọn camera chi tiết, không có tiêu chí đánh giá.
- Liên kết paper: FilmAgent (SIGGRAPH Asia 2024, doi 10.1145/3681758.3698014); Anim-Director (SIGGRAPH Asia 2024, doi 10.1145/3680528.3687688). Chưa đọc hai bài này.
- Không tìm thấy: vai trò agent và cách chọn shot trong nguồn (c). Muốn có phải đọc mã trong thư mục backend hoặc paper.

## (d) Bài báo

FilmFlow (arXiv 2610.30753, nộp 22/10/2026):
- Hệ thống chuyển ý định quay phim (ngôn ngữ tự nhiên hoặc video mẫu) thành quỹ đạo camera trong cảnh 3D động.
- Vai trò: Interpreter (trích ý định điện ảnh), Scout (chọn góc ban đầu), Director (lập kế hoạch từ thao tác nguyên tử), Critic (đánh giá render, phản hồi thị giác để lặp lại).
- Không có "22 atomic camera operations", không có bộ shot size/angle/composition như danh mục.
- Kiểm: Critic đánh giá bằng render và phản hồi thị giác; thử trên CinemaBench (150 cảnh Blender, 750 tác vụ, 60 video mẫu). Không nêu rõ dùng VLM hay chỉ số số học.
- Không có link mã nguồn công khai trong trang arXiv.

Auteur (arXiv 2606.01900, NeurIPS 2026, v1 1/6/2026, v4 24/9/2026):
- Một MLLM đóng vai "đạo diễn ảo": nhận mô tả và chuyển động người, xuất keyframe thưa theo DSL, nội suy thành quỹ đạo camera.
- Ba khía cạnh DSL: cỡ khung hình (shot size), góc máy (camera angle), bố cục (composition). Định nghĩa theo tư thế người. Quy đổi được sang 6-DoF.
- Không liệt kê chi tiết thuật ngữ DSL trong trang tóm tắt. Không có "22 atomic operations" trong phần đã đọc.
- Dữ liệu khoảng 34K mẫu (text, chuyển động người, quỹ đạo camera có chú thích DSL) từ dữ liệu thủ tục và CondensedMovies. Đề xuất chỉ số đánh giá framing mới; không rõ có dùng VLM làm bộ chấm.
- Mã nguồn: không có link trực tiếp. Trang dự án: cyberiada.github.io/Auteur (chưa đọc).

## 1. Bộ từ vựng (chỉ những gì nguồn thực sự định nghĩa)

| Thuật ngữ | Nghĩa trong nguồn | Nguồn |
|---|---|---|
| shot size (cỡ khung hình) | cỡ khung theo tư thế người | Auteur |
| camera angle (góc máy) | góc máy theo tư thế người | Auteur |
| composition (bố cục) | bố cục khung theo người | Auteur |
| framing / safe frame | mọi điểm chính nằm trong khung an toàn | (b) |
| lens / FOV / near / far | tham số ống kính, projection | (a), (b) |
| perspective vs orthographic | chọn theo co ngắn có ý nghĩa hay không | (b) |
| side / orbit / chase | chế độ camera theo chủ thể | (a) |
| camera height | 0.42L (đậu), 0.20L (chế độ khác) | (a), giá trị dự án đó |
| transition / cut / blend | chuyển cảnh lerp + slerp, easing | (a), (b) |
| lens shift | dịch khung không đổi hướng máy | (b) |

Không nguồn nào cho danh mục shot size/angle đóng (kiểu ECU, CU, MS, LS, eye-level, low, high...). Phải tự lập danh mục từ tiêu chí đo được.

## 2. Quy trình kiểm

- (a) và (b) kiểm bằng chụp ảnh tại nhiều khoảng cách camera, cố định seed, kiểm pose và projection sau khi chuyển cảnh. Không có ngưỡng số.
- Không nguồn nào dùng đo bbox trên màn hình như tiêu chí chính.
- Không nguồn nào trong phần đã đọc dùng số vòng sửa cố định.
- FilmFlow: Critic (mô hình nhìn kết quả render) phản hồi để lặp. Không rõ tiêu chí.
- Auteur: đề xuất chỉ số framing mới, chi tiết chưa đọc.

## 3. Giấy phép và mức sẵn sàng

- (a) scottstts: chưa thấy file LICENSE trong phần đã đọc. Cần kiểm trước khi dùng mã.
- (b) linegel: repo có 27 skill. Trang README không nêu giấy phép chung; chỉ `threejs-object-sculptor` có MIT. Không có ngày cập nhật.
- (c) VideoClaw: MIT, mục tin mới nhất 11/6/2026. FilmAgent: paper, không có vai trò agent trong README đã đọc.
- (d) FilmFlow, Auteur: bài báo, không có mã công khai trong trang arXiv.
- Tóm lại: chỉ dùng ý tưởng, không sao chép mã khi chưa kiểm giấy phép.

## 4. Áp dụng ngay cho dự án

- Tính vị trí camera từ bounds của nhân vật/nhà (chiều cao, bề rộng), không dùng khoảng cách cố định. Hợp với luật "1 người zoom IN, 2+ hoặc nhà zoom OUT".
- Tiêu chí số tự đặt, đo qua projection: tỷ lệ chiều cao nhân vật trên khung, bbox nhà có nằm trọn 4 chân trong khung không (tính từ đỉnh và đáy bbox chiếu lên clip).
- Chuyển cảnh/cut: lerp vị trí và slerp quaternion, một giai đoạn nội suy. Vì animation là hàm thuần của t nên camera phải tính lại từ t, không tích lũy trạng thái.
- Kiểm bằng số trước: chụp cố định seed, chụp góc gần/thiết kế/xa, kiểm mọi điểm then chốt có trong safe frame.
- Phân quyền ghi: mỗi shot/agent chỉ ghi một kênh (pose hoặc projection), khớp luật "mỗi agent sở hữu file riêng".
- Vòng chấm–sửa: render → đo số → sửa một tham số → đo lại, tối đa 3 vòng, rồi báo người dùng. Kiểu Critic của FilmFlow nhưng dùng số, không dùng mô hình nhìn ảnh.

## 5. Không liên quan

- Camera hành tinh, gốc nổi (floating origin), pointer lock, va chạm camera với địa hình, thrust-lag (a, b).
- Bloom, water optics, bầu trời, mây, đại dương (b).
- Điều khiển camera trong cảnh tạo video AI (Auteur, VideoClaw) khi dự án dựng bằng three.js và không sinh video.

## 6. Không truy cập được hoặc chưa đọc đầy đủ

- Không tìm thấy ở (b): đường dẫn gốc `threejs-camera-controls-and-rigs/SKILL.md` trả 404; đúng là `skills/.../SKILL.md`.
- Chưa đọc: `references/graphics-validation-protocol.md` (a), mã backend VideoClaw, paper FilmAgent và Anim-Director, trang dự án Auteur.
- Không tìm thấy trong (c): mô tả vai trò agent và từ vựng shot trong README của FilmAgent/VideoClaw.
- Không tìm thấy trong (d): danh mục "22 atomic camera operations".
