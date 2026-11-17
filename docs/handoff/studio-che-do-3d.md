# Studio — chế độ 3D (giai đoạn 1: Xem) — handoff

<!-- ĐIỂM DỪNG: tối đa 25 dòng. GHI ĐÈ cả khối mỗi lần cập nhật, không nối thêm. -->
## ĐIỂM DỪNG
- **Cập nhật:** 2026-11-16 (🎥 Sửa camera: `engine/che-do-3d-cam.js`; trước đó phím Blender trong ✥ Sửa vật)
- **Nhánh:** `ep1-v2`
- **Đang làm:** xong: 3D giai đoạn 1 + 🔒 Giữ góc + 🎥 Bám camera shot (mỗi khung camera bay = camera shot: vị trí/hướng/fov;
  kéo chuột/lăn/WASD → thoát bám; `__che3d.bam`, `setBam`) + 🏞 ô Bối cảnh (chỉ khung 3D vẽ env được chọn, trả visible ngay sau khi vẽ; `setEnv`, `envList`) + có trên ep001–ep004 (dùng chung qua `engine/stage.js`). Giai đoạn 2 chờ người dùng.
- **Bước kế tiếp:** người dùng bấm thử dist/ep00{1..4}.html; nếu muốn nhãn đủ cho ep001 → sửa 1 dòng trong episodes/ep001/index.html (dưới).
- **Đang chờ:** người dùng dùng thử + quyết giai đoạn 2; phiên ep001-sky-storm đang giữ episodes/ep001/*.
- **File đang dở (chưa commit):** không
- **Đang chạy nền:** không
- **Cách gắn:** `stage.start()` nạp động `engine/che-do-3d.js` (tắt: `?che3d=0`); nguồn tự lấy `window.__shots/__places/__props/__actors`,
  nhân vật chưa khai thì dò trong scene (nút cao nhất chứa đúng 1 "Head", bỏ walker/villager). ep003/_template vẫn gọi installChe3D rõ ràng.
- **Đã kiểm:** `kiem-che-do-3d.mjs` ĐẠT cả 4 tập (Giữ góc lệch 0; bật/tắt 3D → Phim giống hệt, ≤ 2 mức nhiễu GPU);
  `look.mjs --ab` mặc định vs `?che3d=0`: ep002/ep003 giống hệt, ep001/ep004 PSNR ≥ 88 dB; bản gộp 4 tập bấm 3D + D + về Phim OK.
- **Biết trước:** ep001 gần như không có nhãn (trang không công khai actors/props/places). Cần thêm sau `window.__stage = stage;`
  (episodes/ep001/index.html:213): `window.__actors = actors; window.__props = props;` — chưa sửa vì phiên ep001-sky-storm giữ file.
  ep001 nặng: trong bản gộp lần bay đầu chậm (dt giới hạn 0.1 s/khung).
- **Góp ý 3D:** `engine/che-do-3d-sua.js` (TransformControls chép từ three 0.187.0). Chỉ THỬ: tắt 3D trả vật về chỗ cũ; lưu tạm localStorage.
  `tools/export-ui.js` feedbackData v2 thêm `ghiChu3d {ghim, vat}`; `tools/feedback.mjs` in phần 3D + ảnh. Kiểm: `node tools/kiem-gop-y-3d.mjs` 29/29, `node tools/kiem-the-asset.mjs <ep>` (bản gộp).
  Asset = con của nhóm chứa (env, userData.tang, nhóm chứa tầng, nhóm duy nhất của env); bấm lại = bộ phận. Song song: thanh nút hẹp xếp nhiều hàng.
- **🎥 Sửa camera:** `engine/che-do-3d-cam.js` (nút 🎥 Camera trong nhóm chế độ). Mỗi shot 1 chuyển động p,l,fov → p2,l2,fov2 + ease + `win` (đoạn chạy).
  Gốc lấy mẫu đầu/cuối shot (`mauCam` trong che-do-3d.js, cờ sampling). Đè camera bằng `stage.setCamera` trong drawSS/draw3d (chỉ khi bật 3D).
  `engine/shots.js` placeCamera hiểu `cam.win` (không có win = như cũ). Góp ý `ghiChu3d.cam[]` có `dong` dán thẳng shots.js. Kiểm: `node tools/kiem-cam-3d.mjs` 15/15.
- **Sửa vật 17/11:** sửa = PHẦN LỆCH d (vị trí cộng, góc nhân, cỡ nhân) trên gốc base; vật có animation: thành phần director đặt lại → base mới
  (vẫn chạy theo shot). Thẻ Asset có nhóm Nhân vật; ô số Vị trí/Xoay/Cỡ/Thế giới gõ được; 📋 Copy điều chỉnh (`engine/chep-gop-y.js`, cột + trình phát `#xchep`).
  Bám camera chỉ thoát khi kéo/xoay/lăn thật. Kiểm: `node tools/kiem-sua-them.mjs` 8/8.
- **Câu hỏi còn mở:** không
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
