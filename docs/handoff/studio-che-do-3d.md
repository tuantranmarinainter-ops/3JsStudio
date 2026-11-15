# Studio — chế độ 3D (giai đoạn 1: Xem) — handoff

<!-- ĐIỂM DỪNG: tối đa 25 dòng. GHI ĐÈ cả khối mỗi lần cập nhật, không nối thêm. -->
## ĐIỂM DỪNG
- **Cập nhật:** 2026-11-15 (thêm 🔒 Giữ góc)
- **Nhánh:** `ep1-v2`
- **Đang làm:** giai đoạn 1 (Xem) XONG và đã commit. Giai đoạn 2 (Kiểm) chờ người dùng quyết.
- **Bước kế tiếp:** người dùng dùng thử `dist/ep003.html` → góp ý; giai đoạn 2 theo `docs/dinh-huong-studio.md`.
- **Đang chờ:** người dùng dùng thử + quyết giai đoạn 2.
- **File đang dở (chưa commit):** không
- **Đang chạy nền:** không
- **Đạt khi:** đã đạt: `node tools/kiem-che-do-3d.mjs` ĐẠT (bật/tắt 3D → khung Phim giống hệt 0 mức ở t=5,40,90,120;
  3D theo t, đường đi 17 điểm, WASD/QE + chuột phải chạy); `look.mjs --det` OK; `shaders.mjs` 139 program có/không module như nhau.
- **Đã chốt:** khung 3D RỘNG (người dùng chọn); 🔒 Giữ góc mặc định bật (qua shot camera bay đứng yên, test lệch 0); điều khiển bay kiểu Unreal; OrbitControls lấy nguyên bản three 0.187.0.
- **Câu hỏi còn mở:** không
- **Biết trước:** chỉ thấy env của shot đang xem; nhìn trên xuống cảnh trong nhà khá tối (thấy mái/ngoài hộp phòng).
<!-- /ĐIỂM DỪNG -->

## Kế hoạch giai đoạn 1
Nguyên tắc: chỉ xem, không sửa cảnh. Chế độ Phim không đổi một pixel; khi chưa bấm 3D module không tạo gì (0 shader, 0 object).

**Cách chạy (không đụng post.js / stage.js / shots):**
- `stage.renderAt(t)` vẫn chạy các `onFrame` như cũ (director đặt camera shot) → ở chế độ 3D, `stage.draw` được bọc tạm:
  chụp vị trí/hướng/fov của `stage.camera` (= camera shot) rồi vẽ `scene` bằng **camera tự do** riêng, `renderer.render` thẳng
  (bỏ hậu kỳ), lớp phụ (chóp, đường đi, lưới) nằm trong **scene phụ riêng** vẽ chồng (không thêm vật vào scene phim).
- Về Phim: trả lại `stage.draw` gốc, ẩn nhãn, `renderAt(t)` → đúng khung cũ.
- Xoay/zoom camera tự do chỉ vẽ lại (không chạy lại `onFrame`) → vòng rAF chỉ khi đang kéo chuột, không dính thời gian phim.

**Đã làm (khác kế hoạch):** khung rộng (canvas chuyển sang lớp phủ, đổi cỡ bộ đệm vẽ, trả lại 1080×1920 khi tắt); chế độ bay Unreal: giữ chuột phải nhìn, WASD đi, Q/E xuống/lên, Shift ×3, lăn khi giữ chuột phải = tốc độ; nhãn tự bỏ bớt khi chồng; OrbitControls chép từ three 0.187.0 vào `vendor/three/addons/controls/` (người dùng đồng ý dùng code có sẵn). Kiểm: `node tools/kiem-che-do-3d.mjs [trang] [--t …]` (ảnh ở `output/che-do-3d/`). Review Sonnet: `output/che-do-3d/review.md` (L1–L6 đã sửa).

**Tính năng:**
1. Nút **Phim | 3D** trên khung hình (trình phát: góc khung `#xview`; trang dev: chỉ hiện khi `?che3d=1`).
2. **Camera tự do** tự viết (~100 dòng, không có OrbitControls trong `vendor/`): chuột trái xoay, phải/Shift kéo, lăn zoom;
   điện thoại: 1 ngón xoay, 2 ngón chụm zoom + kéo.
3. **Chóp camera shot** (khung dây tỉ lệ 9:16, fov thật) tại t hiện tại + **đường đi camera** cả shot: lấy mẫu ~16 điểm bằng
   `renderAt(ti)` với `draw` tắt, rồi trả lại t; cache theo id shot.
4. **Nhãn** DOM chiếu lên khung: nhân vật (`actors`), đạo cụ (`__props`), địa điểm (`places`); bật/tắt từng nhóm. Lưới sàn.
5. **Góc nhìn nhanh:** Trên xuống (bản đồ) · Trước · Theo camera shot. Ô "Bám shot": đổi shot thì camera tự do bay tới chỗ shot diễn.
6. Rê timeline / chọn shot / ▶ Xem → cảnh 3D chạy theo (dùng đúng `window.renderAt`).
- Giới hạn biết trước: chỉ thấy bối cảnh (env) của shot đang xem (director bật/tắt env theo shot); bóng chỉ quanh chỗ shot nhìn.

**File sửa:**
- MỚI `engine/che-do-3d.js` — `installChe3D({ THREE, stage, tl, actors, props, places })` → `window.__che3d = { bat, tat, goc, … }`.
- `episodes/ep003/index.html` — 1 dòng gọi install sau `window.__ready` chuẩn bị (không đụng ep001).
- `episodes/_template/index.html` — cùng 1 dòng để tập mới có sẵn.
- `tools/export-ui.js` — nút Phim|3D + thanh góc nhìn trong `#xview`; tắt 3D trước khi Xuất MP4 / Marker; nhớ trạng thái bật nút.
- MỚI `tools/tests/che-do-3d.test.mjs` — bật 3D rồi tắt, so pixel canvas trước/sau = giống hệt.

**Cách kiểm:**
- `node tools/look.mjs episodes/ep003/index.html --shots all --det` (Phim tất định) + `--ab` trước/sau thay đổi.
- Test mới: bật/tắt 3D → khung Phim giống hệt. Ảnh 3D chụp ra `output/che-do-3d/`, agent phụ xem và báo bằng chữ.
- `node tools/shaders.mjs episodes/ep003/index.html` trước/sau: số program + thời gian mở trang không tăng.
- `npm run bundle:ep003` (hoặc tương đương) → bản gộp có nút 3D, Xuất MP4 không đổi (`export-test.mjs` 1 đoạn ngắn).

## Ghi chép
- Đã đọc: `docs/dinh-huong-studio.md` mục "Đề xuất của Claude cho chế độ 3D"; chỗ gắn: `episodes/ep003/index.html:203-231`
  (`stage.onFrame`, `window.renderAt`, `__places`, `__props`), `engine/stage.js:134` (`renderAt` → `api.draw`),
  `tools/export-ui.js:362` (`show(t)` gọi `renderAt`), `#xview` dòng 205.
