# ep003 — Duyệt lại asset theo Roblox (handoff 14/11)

<!-- ĐIỂM DỪNG: tối đa 25 dòng. GHI ĐÈ cả khối mỗi lần cập nhật, không nối thêm. -->
## ĐIỂM DỪNG
- **Cập nhật:** 2026-11-17
- **Nhánh:** `ep1-v2`
- **Đang làm:** không — nhóm A (phố) + góp ý 3D 16/11 + nhóm B (tiệm) + nhóm C (phòng Gà) + nhóm D (kho nhà máy) đã xong: hết danh sách góp ý "lấy thêm asset tập 3".
- **Đã thay:** cây Roblox 3287226226 (`nhap/pho-cay`) thay mọi cây khối; 6 trụ cứu hoả 8220444536 (`nhap/pho-tru-cuu-hoa`); 6 gấu kệ nhà máy trên 2 tầng kệ sau kính tiệm gấu (dựng lười ở update); trời ngày anime-day (`?troiPho=sky-7` về cũ), đêm sky-9; vòng bao rừng thông. `?rb=0` về bản khối.
- **Góp ý 3D 16/11 19:32 (đã làm):** tủ gấu 2 tầng × 3 gấu to theo vị trí người dùng kéo (`?gauKinhCu=1` về cũ), nền kệ kéo ra trước tấm kính đen của model (hết đen); rừng thông đêm bỏ sương (`suongDem:false` trong `engine/vong-bao.js`, `?suongRungDem=1` về cũ) — hết dải xanh phẳng; s015 `skyScale 3.5` (mới thấy chút mây góc phải); tiệm: 2 giá bánh dời (`?keBanhCu=1`), +2 ma-nơ-canh (`?themManoCanh=0`); phòng Gà: gương dời/xoay (GUONG), chăn phủ nâng 0,57 (`?chanPhuCu=1`), vết dây ẩn khi tập đặt `globalThis.__vetDay=false` (ep003b); ep003b BAP_G y 2,86.
- **Chưa kiểm được bằng ảnh:** ma-nơ-canh/giá bánh (h05, h08 không lọt khung), vị trí gương h31.
- **Nhóm B 17/11 (b3488d4):** s004 vân gỗ thư viện cho quầy (mesh `tiem_quay_mat_go`), tủ quầy GLB mau_1/mau_3, khung kệ mau_1 bỏ ảnh → nâu; tường be `#f7e4c6` (`?vanTiem=0`). s005 máy hạ ngang hốc (kit-pho.json S005; `?camCu=1` máy cũ), bột = ảnh canvas có ô sạch khoét + vệt kéo (`?botCu=1`), vách sau hốc (`?hocSau=0`), bỏ tay giơ của chú bánh. s006 ma-nơ-canh vải lanh có đường may `tiem_ma_no_canh_vai` sau-trái thợ may (`?manoS006=0`).
- **Còn lại (chưa làm):** s004 dải vàng đáy quầy + tường hơi ô-liu; s005 mép dưới tấm bột loang hơi giả, ô sạch chưa có bóng hõm; s006 bàn may chưa vân, hộp nhẫn khối thô, đầu thợ may bị cắt 25% (cổng kiểm, có từ trước).
- **Nhóm C 17/11:** cửa sổ + kính ban công = ẢNH chụp phố e3-pho thật (`assets/textures/env/e3-phong-cua-so-{ngay,dem}.jpg`, chụp bằng `output/_tmp/chup-cua-so.mjs` máy (−8,5; 11,5; 22)→(3; 8,5; −40) fov 90; `?anhPho=0` về tranh vẽ). Lớp chi tiết `phong_chi_tiet` (`?chiTietPhong=0`): khung ảnh thị trấn + tranh sáp + giấy khen + dây cờ (tường tây), ảnh gia đình + bảng ghim + rèm thắt eo (tường bắc), áp phích "BAY LÊN!" (đông), chậu cây + giá áo Kenney.
- **Nhóm D 17/11:** `kho_dong_do_an_cap` (`?dongDo=0`): thùng carton đầu gấu đổ miệng về cửa ở (43,2; −2,9), bao vải 2 lớp, 15 món GLB ×1,9 (đồng hồ, sách, ví, túi tiền, dép, chuông, khung ảnh, hộp nhẫn, dây chuyền, đèn bàn) + cuộn thảm, bóng; vệt rơi vãi z −0,8…0,8 ra cửa (hành lang thấy giữa người ở s083). Ngoài vòng quét cánh cửa và lối đi ông Bách s090.
- **Bước kế tiếp:** người dùng xem bản xem thử; còn lại các mục nhỏ ở dòng "Còn lại". s094: đống đồ bị nhân vật che (chỉ cột z 3 trống) — muốn thấy rõ phải đổi máy s094.
- **Đang chờ:** đợt 2 (biển tiệm bánh) vẫn chờ duyệt.
- **File đang dở (chưa commit):** không.
- **Đang chạy nền:** không
- **Đạt khi:** mọi đợt 1–8 đã chốt + thay vào bối cảnh, `?rb=0` vẫn về bản khối.
<!-- /ĐIỂM DỪNG -->

Yêu cầu người dùng: duyệt lại TOÀN BỘ asset ep003 theo vibe Roblox, chỉ lấy từ Roblox Creator Store, mỗi món **10 ứng viên**;
món nhiều biến thể (cây, đất đá, nhà nền…) đánh dấu `chonNhieu: true` trên khe (trang duyệt có nút "Chọn hết", kết quả `chon[mon]` = mảng).
Chốt đợt nào → nhập + thay vào bối cảnh đó → `look.mjs` + `shaders.mjs` → gộp `dist/ep003_xem-thu.html`.

## Các đợt
| Đợt | Nội dung | Trạng thái |
|---|---|---|
| 1 | tiệm bánh + tiệm may, 14 món × 5 ứng viên | ĐÃ CHỐT 13 món, đã thay vào `engine/envs/e3-tiem.js` (biển bị loại) |
| 2 | biển tiệm bánh, 10 ứng viên mới | CHỜ DUYỆT |
| 3 | SKY 6 mặt cho từng thời điểm (ngày, hoàng hôn, đêm) — `tools/sky-extract/`, `tools/sky-import.mjs`, `engine/sky-lab.html?sky=` | chưa |
| 4 | NHÀ ngoại thất: nhà Gà, tiệm gấu, tiệm bánh, tiệm may, nhà thị trưởng, nhà ngã ba, nhà máy xa, tháp chuông, nhà nền (chọn nhiều) — 9 món × 10 mẫu | ĐÃ CHỐT 14/11 (`duyet/ep003/dot-03.ketqua.json`: 8 món 1 mẫu, nhà nền 7 mẫu) → đã nhập 15 model `nhap/pho-*` và thay vào `engine/envs/e3-pho.js` (`?rb=0` = bản khối) |
| 5 | PHỐ: đèn đường, trụ chặn, cây (chọn nhiều), ghế, hộp hoa, chậu cây (chọn nhiều), biển treo, bàn trưng, cổng rào, mái hiên xanh lam, đường/vỉa hè/biển báo | nhóm A (cây, trụ cứu hoả, gấu sau kính, trời, vòng bao, vân nhà) ĐÃ CHỐT + ÁP 16/11 (`dot-04.ketqua.json`); vân nhà đã gắn (`?vanNha=0` tắt) |
| 6 | nhà máy nội thất (15 món) | chưa |
| 7 | phòng Gà (11 món) | chưa |
| 8 | đạo cụ nhỏ (10 món) | chưa |
(Người dùng nói "các mô hình nghề" = **mô hình nhà** → chính là đợt 4; ưu tiên làm sớm.)
NPC (gấu, dân làng, thị trưởng) do phiên `npc-roblox` lo.

Kiểm kê đủ 71 món (file, shot, cỡ stud): `output/ep003/roblox/kiem-ke.json` (không vào git; dựng lại bằng agent nếu mất).

## Cách làm một đợt (đã chạy được)
1. Tìm: `node tools/roblox.mjs tim "<en>" --so 15 --json` → `output/ep003/roblox/tim/<mon>.json`; ảnh cửa hàng: `node output/_tmp/rb-thumb.mjs output/ep003/roblox/tim <tiền tố>`;
   lưới có nhãn: `python output/_tmp/rb-luoi.py …` → agent Sonnet chọn 10 ứng viên → `chon-<nhom>.json`.
   (Phiên Roblox có lối tắt: `node tools/nhap-model.mjs tim "<từ>" --nguon roblox --toi-da 10 --ung-vien f.json --khe <id>`.)
2. Tải: `node output/_tmp/rb-tai.mjs chon-<nhom>.json` → `output/ep003/roblox/glb/`; chụp GLB 2 góc: `node output/_tmp/rb-chup.mjs output/ep003/roblox`;
   ghép [ảnh Roblox | GLB]: `python output/_tmp/rb-ghep.py output/ep003/roblox chon-<nhom>.json`; agent soi GLB với ảnh gốc → `soi-<nhom>.json`.
3. Trang: `node output/_tmp/rb-ungvien.mjs <nhom> "<tên>" "<mô tả>"` → `duyet/ep003/ung-vien-roblox-<nhom>.json` (thêm `chonNhieu: true` vào khe cần chọn nhiều)
   → `node tools/duyet.mjs ep003 moi "<tiêu đề>"` → `them-ung-vien <số> <file>` → `dung` → `dist/ep003_duyet.html`.
4. Sau khi chốt: `node tools/duyet.mjs ep003 nhan <kết quả.json>`; nhập bằng `node tools/nhap-model.mjs nhap roblox:<id> --ten <tên> --loai <loại> [--cho-phep-nang "người dùng chốt"]`
   (ghi manifest + CREDITS; KHÔNG chép tay vào assets). Chụp 4 hướng để biết mặt trước model: `node output/_tmp/rb-huong.mjs <dir>` + agent.
   Trong env: helper `rb(id, parent, name, { p, ry, kich | cao })` ở `e3-tiem.js` (về khối cũ khi `?rb=0` hoặc thiếu model) — chép sang env khác.

## Đã biết
- Mẫu có mesh riêng tư của tác giả → Open Cloud 403, không tải được (vd 93030342204194); chọn mẫu khác.
- Bàn may chữ L: đã dời bàn nam 2,6; thợ may [103.8,0,−8.9], hộp nhẫn [102.8,2.8,−6.6] (kit-pho S006/S007).
- s005 (nhìn vào hốc dưới quầy) khó đọc từ TRƯỚC khi thay đồ (bản `?rb=0` giống hệt) — lỗi máy quay, chưa sửa.
- s004: kệ bánh không vào khung (máy nhìn thợ bánh). s006: tay chưa chạm hộp, nhẫn nằm ngoài hộp (đạo cụ cũ).
- Shader ep003 ~139 program, mở 16 s — vượt ngưỡng từ trước (bản cũ 137); đồ Roblox chỉ thêm 2.
- `roblox.mjs xem/tai` hỏng với vài mẫu cũ: sky-extract dump báo `Unexpected XML event StartElement(binary…)` hoặc `Invalid character U+0000`
  (3459094, 23692279, 89288354, 98709097) → bỏ, chọn mẫu khác. Mẫu cần > 40 request (410340121, 6296379649) cũng bỏ.
- Tìm "toy store" ra toàn Toys R Us / hộp trống; "tailor shop" gần như không có → tiệm gấu và tiệm may lấy tiệm nhỏ có hiên, thêm biển riêng sau.
- `assets/manifest.json` có dòng `faces/emote37` do phiên khác `git add` sẵn → commit manifest theo đường dẫn sẽ kéo theo dòng đó; báo phiên điều phối.

## Đợt 4 — nhà (14/11)
- File làm việc (không vào git): `output/ep003/roblox/` — `tim/nha_<khoá>_<n>.json` (63 từ khoá), `tim/nhagop_<mon>.json` (gộp, số `#n` của lưới),
  `chon-nha.json` (10 chọn + dự phòng theo id), `xem-nha.json` (part/mesh/số request từng mẫu), `loai-nha.json` (mẫu bị loại + lý do),
  `soi-nha.json` (kết quả soi GLB), `glb/<id>.glb`, `duyet/<id>.jpg` (ảnh [Roblox | GLB] nhúng vào trang).
- Script thêm ở `output/_tmp/`: `rb-gop-nha.mjs` (gộp kết quả tìm), `rb-luoi2.py` (lưới 5×4 có phân trang), `rb-chon-nha.mjs` (số #n → id, bỏ trùng),
  `rb-xem-nha.mjs` (ước lượng request bằng `roblox.mjs xem`), `rb-chot-nha.mjs [--sau-tai]` (loại mẫu lỗi, đôn dự phòng),
  `rb-ghep2.py` (tấm soi 5 hàng/ảnh), `rb-ungvien-nha.mjs` (file ứng viên; khe `pho_nha_nen_dong` gộp dãy đông + hàng xa, `chonNhieu`).
- Số liệu: 90 mẫu cần ~460 request tải + 131 request `xem`; 3 luồng tải song song, hết ~3 phút, không gặp 429.
- Sau khi người dùng chốt: `duyet.mjs ep003 nhan <kết quả>` → `nhap-model.mjs nhap roblox:<id> --ten … --loai nha` → chép helper `rb()` sang `e3-pho.js`.
  Kích cỡ GLB rất khác nhau (có mẫu 1×1×1, có mẫu 260 stud) → luôn đặt bằng `kich`/`cao`, không dùng scale gốc. Nhiều mẫu có nội thất / nền đất kèm theo:
  cân nhắc `nen-model.mjs` hoặc cắt bớt trước khi nhân bản nhà nền (~32 căn).
- Chưa có trong đợt này: `pho_hien_xanh_lam` (mái hiên Bắp ngồi, s042–s043) — phụ thuộc mẫu nhà nền được chọn, để sang đợt 5.

## Đợt 4 — đã thay vào phố (14/11)
- Model: `assets/nhap/pho-{nha-ga,tiem-gau,tiem-banh,tiem-may,nha-thi-truong,nha-nga-ba,nha-may,thap-chuong,nha-nen-1..7}.glb` (2,4 MB, ~105k tam giác cả phố; 3 mẫu `--cho-phep-nang`).
- `e3-pho.js`: bảng `NHA` (mặt trước + phần hộp bao dùng làm mặt tiền/chân, đo bằng tia) + `nhaGlb(f, id, tên, { w, H | cao:[fy, y], D, lui, lat, kep })` co model vừa LÔ đất cũ
  (kit2 đặt máy + nhân vật theo toạ độ tuyệt đối nên nhà phải theo bố cục cũ, co KHÔNG đều). `nhaNen()` xoay vòng 7 mẫu nền theo `seed`; `NEN_CAO` = chiều cao từng mẫu.
- Phần giữ bằng khối vì là "chức năng": bàn trưng + biển tiệm gấu, kệ kính/biển 3 tiệm, SẢNH CỬA thị trưởng (hốc, cửa mở được, 3 bậc, hiên) đặt trước biệt thự lùi 9,8 + tường rào/giậu/cây sân,
  LAN CAN gỗ cao trên ban công nhà Gà (lan can model chỉ cao 1,6 ở tỉ lệ này), nhà mái hiên xanh lam (đợt 5), các dãy "hàng 2" phía xa.
- Số đo đã khớp bằng tia: sàn ban công y 9,50 (điểm `ban_cong`), mép lan can x −9,95, vỉa hè trước nhà Gà y 0,4. Bậc thềm model tại [-12.4, ·, 27] cao 1,36 (shot s072/s073 đặt Gà ở y 1,0 → chân chìm ~0,35, chưa sửa vì là lớp shot).
- Đêm: `setNight` nâng sáng vật liệu GLB như `litMats` (có trần cho màu rực), kính trong suốt + màu ô cửa trong `RB_KINH` (theo TỪNG model) phát sáng ấm. Đừng gộp màu kính chung: `#04afec` là mái nhà nền 4.
- Công cụ đo không cần mở ảnh (ở `output/_tmp/`, không vào git): `rb-do-nha.mjs` (bản vẽ 5 mặt có lưới 0..1), `rb-mat-tien.mjs <tên>:<±X|±Z>` (lưới độ sâu mặt tiền bằng tia),
  `rb-do-pho.mjs` (hộp bao thế giới từng nhà + dò độ cao mặt đứng), `rb-soi-diem.mjs <t> <x,y>…` (điểm ảnh này là vật gì; không điểm = liệt kê điểm kính), `rb-vat-lieu.mjs`, `rb-commit-nha.mjs` (commit riêng mục manifest của mình).
- Lưu ý: máy quay THẬT của shot phố khác số trong `shots-pho.js` (lớp kit2 ghi đè) → muốn biết máy nhìn gì thì dùng `rb-soi-diem.mjs`, đừng suy từ `cam:` của shot.
- Kiểm: 3 lượt agent soi 20 shot (không còn lỗi nặng); `shaders.mjs` 139 program (bằng trước khi thay); 404 `sfx_buoc-chan.ogg` + `captions_en.json` có từ trước, không liên quan.
- Còn hạn chế: nhà Roblox ít cửa sổ → phố đêm ít ô sáng; mái xanh lơ nhà nền 4 hơi sáng về đêm; chữ trên tường nhà máy bị ngược ngay trong GLB (việc của phiên công cụ Roblox);
  tiệm gấu: ô kính là tấm ảnh phẳng; nhà nền 6 (kiểu lego 13 stud phóng to) thô khi đứng gần — đã tránh đặt sau lưng gấu ở s047/s048.

## Đợt 5 nhóm A — phố (16/11, góp ý người dùng)
- Trang duyệt: 2 nhóm `p5-roblox` (cây chọn nhiều, trụ cứu hoả, gấu kệ kính chọn nhiều — 10 mẫu/món, xếp mẫu GLB khớp ảnh lên trước, mẫu lỗi hình ghi ⚠) và `p5-troi` (trời ngày 6, trời đêm 6, vòng bao 7, vân nhà có/không).
- Dữ liệu: `output/ep003/roblox/chon-p5id.json` (theo id), `soi-p5.json` (agent soi GLB vs ảnh), `troi/toan/` (toàn cảnh máy quay tự do), `van/van-nha.json`.
- Script (output/_tmp, không vào git): `rb-ungvien-p5.mjs` (→ ung-vien-p5-roblox.json), `rb-ungvien-troi.py` (→ ung-vien-p5-troi.json), `rb-chup-toan.mjs <out> "<ten>=<query>"…` (chụp toàn cảnh phố, máy quay tự do), `rb-chat-lieu.mjs` (đếm vật liệu Roblox theo id).
- **Vân nhà:** nhà Roblox gần như toàn Plastic/SmoothPlastic → nhập lại bằng VAN_PH không thêm vân. Cách làm: bảng `VAN_NHA` trong e3-pho.js gán vật liệu engine đã duyệt (woodpaint, plaster, brick, shingle, concrete…) theo **màu gốc** từng mảnh (`rb0`); mảnh đã khai vân thì bỏ cờ `matKind='none'` của `khongVan` (commit 711b2c5), grunge vẫn tắt. Tắt: `?vanNha=0` hoặc ô FX vật liệu.
- Trụ 9957285485 tải lỗi (Blender crash) → thay bằng 9609745243.
