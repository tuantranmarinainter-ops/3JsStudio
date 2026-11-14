# ep003 — Duyệt lại asset theo Roblox (handoff 14/11)

Yêu cầu người dùng: duyệt lại TOÀN BỘ asset ep003 theo vibe Roblox, chỉ lấy từ Roblox Creator Store, mỗi món **10 ứng viên**;
món nhiều biến thể (cây, đất đá, nhà nền…) đánh dấu `chonNhieu: true` trên khe (trang duyệt có nút "Chọn hết", kết quả `chon[mon]` = mảng).
Chốt đợt nào → nhập + thay vào bối cảnh đó → `look.mjs` + `shaders.mjs` → gộp `dist/ep003_xem-thu.html`.

## Các đợt
| Đợt | Nội dung | Trạng thái |
|---|---|---|
| 1 | tiệm bánh + tiệm may, 14 món × 5 ứng viên | ĐÃ CHỐT 13 món, đã thay vào `engine/envs/e3-tiem.js` (biển bị loại) |
| 2 | biển tiệm bánh, 10 ứng viên mới | CHỜ DUYỆT |
| 3 | SKY 6 mặt cho từng thời điểm (ngày, hoàng hôn, đêm) — `tools/sky-extract/`, `tools/sky-import.mjs`, `engine/sky-lab.html?sky=` | chưa |
| 4 | NHÀ ngoại thất: nhà Gà, tiệm gấu, tiệm bánh, tiệm may, nhà thị trưởng, nhà ngã ba, nhà máy, nhà nền (chọn nhiều) | chưa |
| 5 | PHỐ: đèn đường, trụ chặn, cây (chọn nhiều), ghế, hộp hoa, chậu cây (chọn nhiều), biển treo, bàn trưng, cổng rào, tháp chuông, đường/vỉa hè/biển báo | chưa |
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
- `assets/manifest.json` có dòng `faces/emote37` do phiên khác `git add` sẵn → commit manifest theo đường dẫn sẽ kéo theo dòng đó; báo phiên điều phối.
