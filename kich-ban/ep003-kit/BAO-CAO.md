# Sổ tay tập 3 — báo cáo bản dở

**Chưa đủ điều kiện dựng lại.** Phiên 0.4 thêm sơ đồ mặt tiền phố theo engine, bảng màu và thông tin ngoại hình; camera cụm phố chưa giải.

## Cách làm và độ chắc chắn
- Đã mở 104 ảnh storyboard theo nhóm bối cảnh, 3 ảnh bối cảnh và ảnh trước/sau của các nhóm nhân vật.
- Gà cao 5,2 stud đến đỉnh đầu, không tính chỏm; đỉnh chỏm là 5,3673 stud theo `engine/ga-dims.js`.
- Mốc của 104 shot chép từ `moc.json`; số đo tỷ lệ khung, góc và bố cục được giữ lại từ `Camera_104.json`, không phải phép đo mới.
- Tiêu cự trong nguồn là dự kiến, không đo được từ ảnh tĩnh; FOV dọc tính theo cạnh cảm biến 36 mm của `engine/dat-may.js`.
- Kích thước set trong kit quy đổi từ phương án dự kiến của `Bo_canh_kich_thuoc.json`, không phải kích thước đã xác minh.
- Cả 104 shot được ghi độ tin cậy thấp vì nghiệm vị trí chưa đầy đủ hoặc chưa kiểm bằng render; `null` nghĩa là chưa đo.
- S002 là ngày và S020–S021 là đêm theo ảnh, khác cờ thời gian trong `moc.json`; S104 là khung đen.

## Mười phát hiện cần xử lý trước
Những lỗi thị giác dưới đây dựa trên ảnh storyboard, mã shot và báo cáo so hình trong `docs/handoff/ep003.md`; chưa tự render lại bản dựng.
1. S002 thiếu dấu dây trên bụi và sách/cửa sổ như ảnh; shot hiện chỉ đặt sách và dùng mặt kệ của env.
2. S017 tay áp kệ phải đọc được; bộ pose tay hiện dễ che điểm tiếp xúc.
3. S021 ảnh là cận hai tay cầm đồng hồ; camera hiện đặt sát thân Gà, có nguy cơ xuyên người.
4. S025 Gà nằm nghiêng: hướng thân đứng không còn đủ để suy hướng mặt khi đặt máy.
5. S026 là ảnh Bắp qua gương, cần phản chiếu đúng; đặt nhân vật tại mặt gương không thay thế được phản chiếu.
6. S054 chỉ thấy thân Bách, không lộ đầu; cần kiểm cắt khung và khoảng máy.
7. S063 két bánh phải màu xám, có dấu ổ bánh; model hiện thiếu dấu và núm đúng.
8. S064 là dây chuyền bạc, mặt giọt xanh ngọc, trên két; không được dùng nhẫn.
9. S073 phải thấy Gà và thị trưởng ở hiên; báo cáo cũ ghi chậu/cột có thể chắn máy.
10. S095/S097 cần thấy tay và dây chuyền, két ở cùng một vị trí; hiện két cố định của env khó mở/ẩn nhất quán.

## Ưu tiên tiếp tục
1. Dựng blockout phòng, kệ, gương, giường và két; đo lại S020, S023, S026, S095, S097 rồi khóa hệ tọa độ.
2. Dựng xưởng và kho chung hệ tọa độ; khóa cửa kính, băng chuyền, két, kệ, bản đồ và thùng.
3. Nối phố, ban công, mái hiên và nhà máy bằng mốc chung; sau đó xử lý các tiệm.
4. Giải 104 camera, đạo cụ, ánh sáng và chuyển động; chiếu lại, kiểm tắc nhìn và so từng ảnh.
5. Hoàn thiện trình kiểm hình học và giao diện mặt bằng/độ cao; sau đó render kiểm ít nhất 5 shot.

## Chưa hoàn thành
- `kit.json`: phòng đã có hình học engine, 12 đạo cụ và hai bộ đèn còn thiếu hướng/cường độ; 34 camera và các vị trí diễn viên phòng còn thiếu.
- `kiem-kit.mjs`: có phép chiếu, kiểm sơ bộ nón nhìn, hộp bao và khoảng cách nhân vật; chưa kiểm bề dày tường, gương phản xạ, mặt kệ rỗng, độ lớn chiếu, camera cuối và liên tục.
- `KIT.html`: có mặt bằng phòng, chọn shot, nón S001 và tỉ lệ đạo cụ; chưa có sơ đồ ánh sáng đầy đủ hay chép tham số.
- `xuat-khung.mjs`: chỉ xuất lại 77 khung cũ có trong dữ liệu, không phải 104 khung đã hiệu chỉnh.
- Chưa kiểm giao diện trong trình duyệt hoặc đối chiếu 5 nón camera. Chưa kiểm trực tiếp từng env/asset của engine.
- Lần kiểm hiện tại: nhà máy 114 lỗi, phòng Gà 71 lỗi, phố và tiệm 134 lỗi; 104 shot tin cậy thấp. Chưa chạy đủ các phép kiểm nên đây không phải tổng lỗi thực tế.
- S001 dùng chốt env cao 0,9 stud và tiêu cự dự kiến 85 mm: điểm chốt chiếu (52,06%, 48,03%), cao 20,84% so với đích (52%, 48%), 21%; chưa render so ảnh.
- Đề bài yêu cầu xử lý riêng S026 qua gương, S035 ngoài cửa sổ và két động S099; bộ kiểm hiện chưa hỗ trợ các trường hợp đó.

## Phiên 0.3 · nhà máy
- Đã mở 33 ảnh, đặt sân, xưởng và kho trong cùng tọa độ `e3-nha-may.js`; vị trí và kích thước này chưa được xác minh khớp storyboard.
- S063: hộp két dự phòng cao 3,1 stud, tiêu cự dự kiến 55 mm. Phép chiếu thử cho tâm (52,01%, 58,47%), cao 63,58%; ảnh đo (52%, 58,5%), cao 63,5%.
- S063 chưa kiểm GLB thật hay render; 32 shot khác chưa giải camera/diễn viên. Đèn key/fill/rim, phần lớn đạo cụ và các hộp chắn chi tiết còn thiếu.
- Hai kệ và các tấm hàng rào có lỗ; hộp bao đặc trong bộ kiểm có thể báo che giả. Chưa kiểm cửa, kính, chân băng, camera cuối và liên tục đồ cố định.
- KIT.html có sơ đồ mặt bằng và thẻ vật liệu nhà máy nháp; thử script bằng DOM giả thấy 33 lựa chọn và 104 thẻ, chưa kiểm trình duyệt thật. Topview không có sẵn, không cài theo ràng buộc.

## Phiên 0.4 · phố và tiệm
- Đã mở 36 ảnh; bổ sung mặt tiền và điểm đứng từ `e3-pho.js`, 14 màu engine, màu/phụ kiện của 16 nhân vật.
- Tiệm bánh và may dùng `e3-tiem.js` ở hai gốc riêng; chưa xác định phép biến đổi để ghép nội thất vào phố. Tỉ lệ, kích thước phụ kiện, phần lớn ánh sáng và đạo cụ còn thiếu.
- S007 nhìn gần từ trên xuống; góc engine cũ 60° cần xét lại theo ảnh. S104 là khung đen, không đặt camera vật lý giả.
- Chưa giải camera/diễn viên của cụm phố, chưa kiểm hình học cụm; lệnh xuất còn 77/104 khung cũ và trả mã lỗi 1 khi thiếu.
- Giao diện được kiểm bằng DOM giả: 36 lựa chọn phố, 104 thẻ và 14 màu; chưa kiểm trình duyệt thật.
