# Tập 2 — tạm gác (2026-11-13)

Người dùng tạm gác tập 2 để làm tập 3. Trạng thái dưới đây đủ để quay lại làm tiếp.

## Sản phẩm hiện có
- Bản xem thử: `dist/ep002_xem-thu.html` (58 MB; gộp bằng `npm run bundle:ep002` rồi `cp dist/ep002.html dist/ep002_xem-thu.html`).
- 104 shot, 124,49 giây, khớp giọng Thanh Niên Tự Tin (lời theo `episodes/ep002/nguon/kich-ban-goc.md`, nhịp theo `nguon/voice-vi-goc.mp3`).
- Nhánh `ep1-v2`, mọi thứ đã commit, CHƯA push.

## Đã xong
- Kịch bản + shot theo giọng mới; 17 shot yếu; độ sáng cả phim; s061; hiệu ứng nhẫn s006.
- Gấu Bắp GLB có xương (`engine/bear-glb.js`, khoá `bearGlb`), 30 gấu bông trên kệ nhà máy, nơ Bow Tie (Peakz).
- Đạo cụ GLB Đợt 2–4 + 8 mục dựng riêng (`engine/props-glb.js`, `props-kb.js`, khoá `propsGlb`).
- Nội thất `engine/envs/shop-in.js` (tiệm bánh, nhà Gà, nhà thị trưởng); hàng rào sắt nhà máy; vành nhà `town.vanh`.
- Thị trấn Kenney dùng lõi chung: trời thật, đêm có cửa sổ sáng + đèn đường, núi/rừng xa, bóng mây. Bảng nhà pastel (+10 bảng khác).
- Âm thanh 4 lớp cho 124,5 s (nền thị trấn = tiếng chim sáng), "Boang" 123,04 s.
- 20 góp ý ngày 13/11 đã sửa (chờ người dùng kiểm).
- Studio: khung PC, bắt lỗi theo shot, marker M, Gửi tới Claude (`tools/gop-y-nhan.mjs`, cổng 8792).

## Còn tồn (khi quay lại)
1. Người dùng chưa kiểm 20 góp ý trên bản mới; s014b (biển tiệm gấu cạnh nhà Gà) và s107 (chỗ dây chuyền) là đoán ý.
2. Cháy sáng nội thất: s002 167, s004 162, s084 179; s044 tối 78; s014 152; s047 Gà lệch chỗ so với s044.
3. Gian tiệm may chưa có nội thất (s006 vẫn ngoài phố). Băng chuyền nhà máy chưa dùng model đã chọn.
4. Xe + dân đi bộ ở thị trấn Kenney chưa có (làn xe tập 1 không khớp lưới phố).
5. Phụ đề từng chữ chưa chạy (tập mẫu thiếu mã, `captions.js` thiếu mốc từng chữ); danh sách shot trong studio thiếu lời.
6. Bụi chân khi đi/chạy; ~100 đạo cụ/nội thất chưa khai chất liệu; shader lúc mở trang ~120 (cả phim ~181).
7. Tiếng Anh giọng Andrew (để sau cùng); tài sản Roblox (chờ khoá); người dùng chưa nghe lại âm nền mới.
8. Test đang hỏng có sẵn: `shottypes.test.mjs` "HOUSE đặt cứng khớp bbox" (do phiên ep001) + 4 test cũ khác.
9. Chưa chụp `--shots all --det` cả phim lần cuối, chưa xuất MP4 cả tập.

## Thay đổi lớn áp cho tập sau (chưa làm ở tập 2)
- Tạm bỏ R15: dân làng dùng R6 (`engine/r6.js` chưa nối vào `engine/cast.js`, R6 chưa có `faceAt`/mặt sống).
- Áp bộ biểu cảm của Gà (37 mặt, `assets/faces/emote37/`) cho mọi nhân vật phụ.
- Lõi chung phải áp cho mọi tập: xem `docs/handoff/ra-soat-loi-chung-ep002.md` (10 thiếu sót) — vá vào `episodes/_template/` + `lam-phim`.

## File cần biết
`episodes/ep002/` (shots.js, episode.js, sfx/, nguon/), `duyet/ep002/` (6 đợt duyệt), `docs/tien-do.json`, `docs/dinh-huong-studio.md`,
`docs/so-sanh-ep001-ep002.md`, `docs/nhap-model.md`, `feedback/gop-y_ep002_2026-11-13_14-17/`.
