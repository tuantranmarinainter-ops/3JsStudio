# Đề bài cho Codex — "SỔ TAY SẢN XUẤT TẬP 3" (bộ kit dựng phim chính xác tới từng stud)

Bạn là **giám đốc mỹ thuật + đạo diễn hình ảnh** của một phim hoạt hình short dọc 1080×1920 phong cách Roblox, tập 3 của loạt "Ở thị trấn này…". Một hệ thống khác (Claude) đang dựng phim bằng three.js từ kịch bản của bạn nhưng dựng SAI rất nhiều: soi 104 shot thì 1 đạt, 58 lệch, 45 hỏng — vì kịch bản chỉ là ảnh + chữ, thiếu số đo. Việc của bạn: biến bộ ảnh storyboard thành một **bộ kit có số đo chính xác, máy đọc được và người xem thấy "wow"**, để dựng lại đúng ngay lần sau.

Viết mọi nội dung cho người đọc bằng **tiếng Việt có dấu**. Tên khoá JSON không dấu, snake_case.

## 1. Đầu vào (CHỈ ĐỌC — phải mở và nhìn TỪNG ảnh, không suy từ tên file)
Thư mục `kich-ban/ep003-goi2/` (bản mới nhất) và `kich-ban/ep003-goi/`:
- `shots/shot_001.jpg … shot_104.jpg` hoặc `kich-ban/ep003-sb/shot_NNN.jpg` — 104 khung storyboard = **CHUẨN HÌNH DUY NHẤT**.
- `Shotlist_104.json`, `Prompt_va_dac_ta_104_shot.md`, `Thiet_ke_chung.md` — lời kể, mô tả, thiết kế chung.
- `boi-canh/Boi_canh_01..03.jpg`, `nhan-vat/*.png|jpg` (Gà trước/sau, bears, leads, neighbors, town), `emote/*.png` (37 mặt biểu cảm).
- `Camera_104.json`, `Bo_canh_kich_thuoc.json`, `Cach_doc_camera.md` — số đo camera lần trước (dùng lại, sửa chỗ sai, BỔ SUNG góc nhìn dọc còn thiếu).
- `kich-ban/ep003-sb/moc.json` — mốc thời gian từng shot theo giọng đọc 2:20.
Đọc thêm để kit khớp engine (chỉ đọc): `CLAUDE.md` (mục Luật camera, Quy tắc kỹ thuật), `episodes/ep003/episode.js` (actors, places, props, env đang khai), `episodes/ep003/khung.js`, `docs/handoff/ep003.md`, `engine/shottypes.js` (tham số camera: `dist`, `h`, `yaw`, `fov`, `look`, `p`→`p2`), `engine/envs/shop-in.js`, `engine/envs/factory.js`, `engine/envs/bedroom*.js`, `engine/town.js` (kích thước, toạ độ thật của bối cảnh đang có), `engine/props-glb.js` (`GLB_KIT`: đạo cụ có sẵn + `dims`), `engine/ga-dims.js` (số đo Gà), `engine/r6.js` (thân R6 cho dân làng), `engine/bear-glb.js`.

## 2. Quy ước bắt buộc
- Đơn vị: **stud** (1 đơn vị three.js = 1 stud). Trục: X phải, Y lên, **Z về phía mặt nhân vật (+Z)**. Góc bằng độ; `yaw` 0° = nhìn về −Z từ phía +Z… — hãy ĐỌC `engine/shottypes.js` để ghi đúng quy ước yaw/pitch của engine và ghi rõ quy ước đó trong kit.
- Thước chuẩn: chiều cao **Gà** (lấy số thật trong `engine/ga-dims.js`). Mọi tỉ lệ đồ vật ghi cả stud lẫn "bằng bao nhiêu lần Gà".
- Mỗi số đo kèm `tin_cay`: `cao` (đo trực tiếp trên ảnh/đối chiếu nhiều shot), `vua` (suy từ 1 ảnh), `thap` (đoán) và `cach_do` 1 câu. KHÔNG bịa số rồi ghi `cao`.
- Một bối cảnh = MỘT hệ toạ độ dùng xuyên suốt mọi shot diễn ra ở đó (tính liên tục: đồ vật, cửa, cửa sổ không được "nhảy chỗ" giữa các shot; nếu storyboard tự mâu thuẫn thì chọn một phương án, ghi vào `mau_thuan[]`).

## 3. Đầu ra — ghi TẤT CẢ vào `kich-ban/ep003-kit/` (không sửa bất kỳ file nào ngoài thư mục này)

### 3.1 `kit.json` — nguồn sự thật máy đọc
```
{
 "phien_ban", "quy_uoc": {don_vi, truc, yaw_pitch, thuoc_chuan_ga_stud, khung_hinh:"1080x1920"},
 "bang_mau": [{id, ten, hex, dung_cho}],                       // bảng màu chủ đạo của cả tập + từng bối cảnh
 "nhan_vat": [{ id, ten, vai, loai_than: "ga"|"r6"|"gau", cao_stud, ti_le: {dau, than, tay, chan}, mau: {da, toc, ao, quan, phu_kien…(hex)},
                trang_phuc, phu_kien: [{ten, vi_tri_gan, kich_thuoc_stud, mau, vat_lieu}], dac_diem_nhan_dang, dang_di_dung, 
                bieu_cam_hay_dung: [{emote_file, khi_nao}], anh_tham_chieu: [..], shot_xuat_hien: [..], tin_cay }],
 "boi_canh": [{ id, ten, loai: "noi_that"|"ngoai_troi", env_engine_gan_nhat, kich_thuoc: {rong_x, sau_z, cao_y}, goc_toa_do,
                tuong: [{tu:[x,z], den:[x,z], cao, mau_hex, vat_lieu}], san: {mau, vat_lieu}, tran,
                cua: [{id, tam:[x,y,z], rong, cao, huong, mo_ra}], cua_so: [{…, nhin_ra}],
                vat_co_dinh: [{do_vat_id, tam:[x,y,z], xoay_y, ghi_chu}],
                diem_dung: [{id, ten, pos:[x,0,z], mo_ta}],       // các "mark" diễn viên dùng lại giữa các shot
                bien_the_thoi_gian: ["sang","trua","chieu","dem"], anh_tham_chieu, shot_dung: [..] }],
 "do_vat": [{ id, ten, kich_thuoc: {rong, cao, sau}, bang_lan_ga, hinh_khoi (mô tả dựng bằng khối/low poly), 
              vat_lieu: {loai (gỗ/kim loại/vải/nhựa/giấy/kính…), mau_nen_hex, mau_phu_hex[], do_nham 0..1, kim_loai 0..1, do_bong, hoa_van, do_cu_bui 0..1, phat_sang?: {hex, cuong_do}},
              chi_tiet_bat_buoc: [..], co_san_trong_engine: "<khoá GLB_KIT hoặc model assets/nhap/…>"|null, goi_y_tim_model (từ khoá tiếng Anh), shot_dung: [..], quan_trong: "then_chot"|"phu"|"nen" }],
 "anh_sang": [{ id, ten, cho: [boi_canh_id], thoi_gian, 
                key: {phuong_vi_do, do_cao_do, mau_hex, nhiet_do_K, cuong_do 0..1, bong_do: "cung"|"mem"}, fill: {…}, rim: {…}, moi_truong: {mau_tren_hex, mau_duoi_hex, cuong_do},
                den_thuc_te: [{ten, pos:[x,y,z], mau_hex, cuong_do, ban_kinh}], suong: {mau_hex, mat_do}, 
                do_sang_dich_luma: [min,max] (0–255, ngày 100–150, đêm 85–130), tuong_phan, tam_trang, shot_dung: [..] }],
 "shots": [{ id:"s001"…"s104", so, t0, t1, dur, loi_ke, y_do (shot này phải KỂ điều gì trong ≤12 chữ), 
             boi_canh_id, thoi_gian, anh_sang_id,
             nhan_vat: [{id, pos:[x,0,z], huong_mat_yaw, tu_the/hanh_dong (đầu→cuối shot), emote_file, nhin_ve, cam_gi (do_vat_id, tay nào)}],
             do_vat_trong_khung: [{id, pos:[x,y,z], xoay_y, trang_thai (mở/đóng/trống/đang biến mất…)}],
             camera: { dau: {pos:[x,y,z], nhin_vao:[x,y,z], fov_doc_do, tieu_cu_mm_tuong_duong}, cuoi: {…}, chuyen_dong: "zoom_in"|"zoom_out"|"lia"|"cau"|"tinh"…, 
                       tham_so_engine_goi_y: {loai_shot, dist, dist2, h, h2, yaw, fov, fov2, look},   // theo engine/shottypes.js
                       khung: {chu_the, tam_chu_the_pct:[x,y], cao_chu_the_pct, co_canh: "toan"|"trung"|"can"|"dac_ta", goc: "ngang_mat"|"thap"|"cao"|"qua_vai"|"tren_xuong"} },
             phai_thay: [..], khong_duoc: [.. vd "kệ che mặt Gà", "cắt nửa người"], lien_tuc_voi_shot_truoc, hieu_ung (poof, lấp lánh, rung…), am_thanh_goi_y,
             khac_storyboard?: "lý do nếu buộc phải lệch ảnh gốc", tin_cay }],
 "mau_thuan": [{shot, van_de, cach_chon}], "thieu_trong_engine": [{thu_gi, vi_sao_can, do_uu_tien}]
}
```
Đủ 104 shot; không shot nào thiếu `camera`, `boi_canh_id`, `anh_sang_id`. `t0/t1` lấy đúng từ `moc.json`.

### 3.2 `KIT.html` — MỘT file HTML tự chứa, đẹp, "wow", mở bằng `file://` (ảnh tham chiếu dùng đường dẫn tương đối tới `../ep003-goi2/…`, `../ep003-sb/…`; không CDN, không fetch)
Dữ liệu nhúng từ `kit.json`. Giao diện tối, tiếng Việt, có mục lục dính bên trái. Các phần:
1. **Bìa**: tên tập, một câu luật, bảng màu chủ đạo, dải timeline 104 shot tô theo bối cảnh + sáng/đêm (bấm để nhảy tới shot).
2. **Hồ sơ nhân vật**: thẻ từng nhân vật — ảnh tham chiếu, sơ đồ tỉ lệ vẽ bằng SVG đứng cạnh Gà trên thước stud, ô màu hex, phụ kiện, biểu cảm hay dùng (ảnh emote).
3. **Bản đồ bối cảnh**: mỗi bối cảnh một sơ đồ MẶT BẰNG SVG đúng tỉ lệ (lưới stud, tường, cửa, cửa sổ, đồ cố định có nhãn, điểm đứng). Thanh chọn shot → vẽ **hình nón camera** (vị trí, hướng, góc mở) và vị trí + hướng mặt từng nhân vật của shot đó; nút ◀ ▶ chạy lần lượt các shot ở bối cảnh. Thêm sơ đồ **mặt đứng** (cao độ camera so với nhân vật).
4. **Bảng tỉ lệ đồ vật**: mọi đồ vật vẽ SVG theo đúng tỉ lệ cạnh bóng Gà, kèm thẻ vật liệu (ô màu, thanh nhám/kim loại/bụi), đánh dấu cái nào engine đã có, cái nào thiếu.
5. **Sơ đồ ánh sáng**: mỗi bộ đèn một "đồng hồ mặt trời" SVG (hướng key/fill/rim nhìn từ trên + độ cao), ô màu, dải luma đích.
6. **104 thẻ shot**: ảnh storyboard bên trái; bên phải: ý đồ, lời kể, sơ đồ mặt bằng thu nhỏ có nón camera, thông số camera, "phải thấy / không được", tham số engine gợi ý (bấm để chép). Lọc theo bối cảnh, nhân vật, độ tin cậy; ô tìm.
7. **Danh sách việc cho người dựng**: `thieu_trong_engine` + `mau_thuan`, xếp theo ưu tiên.

### 3.3 `kiem-kit.mjs` — `node kich-ban/ep003-kit/kiem-kit.mjs` in báo cáo và thoát mã ≠ 0 nếu có lỗi
Kiểm: đủ 104 shot, id liên tục; mọi `boi_canh_id`/`anh_sang_id`/`nhan_vat.id`/`do_vat.id`/`emote_file` đều tồn tại; `t0<t1`, tổng thời lượng khớp `moc.json`; mọi vị trí nằm trong biên bối cảnh; camera không nằm trong tường/đồ vật (hộp bao); **tia từ camera tới đầu chủ thể không xuyên qua hộp bao đồ vật cố định** (báo shot có nguy cơ bị che); nhân vật không chồng nhau (< 1 stud); chủ thể nằm trong nón nhìn; luật camera: 1 người → zoom in, ≥2 người/vật lớn → zoom out, không shot tĩnh trừ khi ghi lý do; cùng một đồ vật cố định không đổi chỗ giữa các shot cùng bối cảnh. In bảng tổng kết + danh sách shot `tin_cay: thap`.

### 3.4 `xuat-khung.mjs` — đọc `kit.json`, in ra (stdout) khối dữ liệu camera theo đúng dạng `episodes/ep003/khung.js` đang dùng (đọc file đó để biết các trường), để Claude nạp thẳng. KHÔNG tự ghi vào `episodes/`.

### 3.5 `BAO-CAO.md` (≤ 60 dòng): cách đo, 10 phát hiện quan trọng nhất về lý do bản dựng hiện tại sai (so `episodes/ep003/shots*.js` với kit), thống kê tin cậy, điều chưa chắc, thứ tự dựng lại đề xuất theo cụm bối cảnh.

## 4. Cách làm (bắt buộc)
1. Lập trước danh mục bối cảnh / nhân vật / đồ vật / bộ đèn từ `Thiet_ke_chung.md` + ảnh bối cảnh + ảnh nhân vật.
2. Đi qua 104 ảnh theo từng CỤM BỐI CẢNH (không theo số thứ tự) để dựng mặt bằng nhất quán: ước lượng camera từ đường chân trời, điểm tụ, kích thước nhân vật trong khung (đã biết chiều cao thật), rồi đặt nhân vật và đồ vật vào mặt bằng sao cho chiếu lại ra đúng khung.
3. Chạy `kiem-kit.mjs`, sửa tới khi 0 lỗi cứng; cảnh báo còn lại ghi vào báo cáo.
4. Mở `KIT.html` kiểm không lỗi console (nếu có trình duyệt không đầu), kiểm 5 shot bất kỳ: nón camera trên mặt bằng khớp với ảnh storyboard.

## 5. Ràng buộc
- Chỉ ghi trong `kich-ban/ep003-kit/`. Không sửa `engine/`, `episodes/`, `tools/`, không chạy git commit/reset/stash/checkout, không cài gói, không gọi mạng.
- Không đọc file trong `dist/`, không đọc file `.env*`.
- Làm tới khi đủ 3.1–3.5. Nếu phải cắt bớt vì giới hạn, ưu tiên: `kit.json` đủ 104 shot > `kiem-kit.mjs` > `KIT.html` > phần còn lại, và ghi rõ trong `BAO-CAO.md` phần nào chưa xong.
- Dòng cuối cùng bạn in ra: `KIT XONG: <số shot> shot, <số lỗi cứng> lỗi, <số cảnh báo> cảnh báo` hoặc `KIT DỞ: <lý do>`.
