# ep003b — Tập 3 làm lại theo phong cách blocky-shorts (phiên test độc lập)

<!-- ĐIỂM DỪNG: tối đa 25 dòng. GHI ĐÈ cả khối mỗi lần cập nhật, không nối thêm. -->
## ĐIỂM DỪNG
- **Cập nhật:** 2026-11-16 19:15
- **Nhánh:** `ep1-v2` — **KHÔNG commit** (người dùng chọn). `episodes/ep003b/` đã vào `.gitignore`; file engine/tools mới cũng chưa commit
- **Đang làm:** không. **CẢ PHIM đã làm lại kiểu blocky** (0–140 s, 158 shot, không còn shot gốc), chờ người dùng duyệt `dist/ep003b.html` / `dist/ep003b_xem-thu.html`
- **Cấu trúc shot:** `shots-hook.js` (h01–h17) · `shots-doan2.js` (h18–h25) · `shots-doan3.js` (h26–h55, phòng đêm) · `shots-doan4.js` (d4_*, ban công/phố) · `shots-doan5.js` (d5_*, nhà máy) · `shots-doan6.js` (d6_*, thị trưởng) · `shots-doan7.js` (d7_*, mở kho/twist/kết). GĐ 3–7 tự khai `THAY` + `SHOTS`; `shots.js` tự ghép (không cần sửa khi đổi một GĐ). `?blocky=0` = bản gốc
- **Phụ đề:** `phu-de-cum.txt` đủ mọi câu → `node tools/blocky-phu-de.mjs episodes/ep003/captions.js episodes/ep003b/captions.js episodes/ep003b/phu-de-cum.txt` (237 cụm)
- **Kiểm:** tổng 140.000 s; `look.mjs --shots all --det` TẤT ĐỊNH OK (`output/ep003b-ca-phim/`); `may-blocky.test.mjs` 6/6; tiếng blocky 200 sự kiện. Báo cáo từng GĐ: `output/ep003b-doan{2..7}/bao-cao*.md`
- **Dùng lại máy gốc (cam.bk bị chắn):** h54, d4_10, d4_11, d7_07, d7_11, d7_12, d7_19, d7_20 (vẫn cắt nhịp mới)
- **Lỗi nhẹ còn lại:** h24 tay chạm mép; h30/h35 cắt đỉnh đầu; h31 đầu che đáy gương; h46/h47 sách to hơn Bắp; d4_05 tay che nửa mặt; d4_06 lan can che nửa đầu; d5_16–d5_21 ông Bách quay lưng (sát tường bản đồ); d5_25/27 nắp két bị băng chuyền che; d6_12 đồng hồ nhìn cạnh; d7_02/d7_15 cắt đầu/mặt cuối shot; d7_32–34 Gà/Bắp dời x để tránh giường. Khung tối đã nâng exposure: d5_16/18/21, d6_12 (2.4)
- **Bối cảnh phố đổi cùng lúc** (phiên khác, đợt 5 nhóm A): cây + trụ cứu hoả Roblox, trời anime-day, vòng rừng thông, gấu kệ sau kính → ep003b cũng nhận
- **Còn lại:** người dùng duyệt cả phim → sửa theo góp ý (theo shot id)
- **Câu hỏi còn mở:** không
<!-- /ĐIỂM DỪNG -->

## Đã làm
- `engine/blocky/may.js` — máy kiểu blocky: shot ghi `cam: { bk: { on, co, goc, from|yaw, side, move, amount, fov, S, look, offset, whip, crash } }`; punch/shake trong `shot.bfx`. Móc vào `engine/shots.js` `placeCamera` (chỉ khi có `cam.bk`).
- `engine/blocky/lop-phu.js` + `overlays.js` (chép từ skill, đổi phông Be Vietnam Pro) — đồ hoạ `bfx` (sign, stamp, icon, bulb, sparkle, glint, burst, say, title, flash) + phụ đề kiểu blocky (bật từng chữ, cụm `EPISODE.nhan` tô vàng). `tools/export-ui.js` dán `window.__lopPhu.canvas` vào khung xuất.
- `engine/shots.js`: `cast.<ai>.mat: [[giây, mặt]]` = đổi mặt giữa shot. `engine/blocky/chong.js`: nảy người `hipDY` (hệ số `nay`).
- Ô FX mới (`engine/post.js`, mặc định bật, chỉ tác dụng khi shot có dữ liệu blocky): `mayBlocky`, `punchRung`, `lopPhu`, `phuDeBlocky`. URL `?blocky=0` = bản gốc ep003.
- `tools/blocky-tieng.mjs <ep>` — sự kiện → `sfx_blocky.ogg` (27 tiếng của skill ở `episodes/ep003b/sfx/blocky/`), lớp tiếng thứ 5 trong trình phát.

## Bài học khi đặt máy blocky trên bối cảnh thật
- Máy blocky KHÔNG biết tường. Luôn đặt `yaw` theo phía mở của bối cảnh (lấy hướng từ máy đã kiểm của ep003 / kit2). Phố e3-pho: tâm phố x = 0, dãy nhà phía tây x < −10 (máy ở x ≈ −10 là nằm trong mặt tiền); quầy tiệm gấu mở về phía NAM (+Z).
- Cận sau quầy (tiệm bánh): `fov: 30` + `offset: [0, 1.4, 0]` để máy lùi ra và cao qua mặt quầy.
- Nhiều người: cỡ tự nới theo khoảng cách → `track`/`pull` đi rất xa; giảm `amount` (≈ .1) hoặc ghi `S`.
- Phòng Gà e3-phong: máy ở phía NAM (+Z) nhìn lên kệ/cửa sổ; `from: 'front-right'` + orbit dễ quét qua giường (khối kem che nửa khung) → dùng `from: 'front'` + `side` nhỏ. Dấu đóng `stamp` ở cảnh toàn thân đặt `y: .6` (mặc định .43 đè mặt).
- Cảnh hai nhà liền nhau (nhà Gà ↔ tiệm gấu): lia `track` làm rơi chủ thể; dùng điểm giữa + `S` cố định đủ rộng + `zoom-out` amount ≤ .2.
- Động tác tay giơ cao (scared, cheer) cần cỡ `cowboy` trở lên, không thì tay ra ngoài khung. Đo tư thế: `window.__actors` (đã mở trong trang ep003b).
