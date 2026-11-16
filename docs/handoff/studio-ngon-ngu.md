# Studio — chọn ngôn ngữ/nền tảng + tăng tốc mở — handoff

<!-- ĐIỂM DỪNG: tối đa 25 dòng. GHI ĐÈ cả khối mỗi lần cập nhật, không nối thêm. Phiên mới chỉ cần đọc khối này là làm tiếp được.
     Chi tiết, lịch sử, số đo để ở phần "Ghi chép" bên dưới. Mục nào không có thì ghi "không". -->
## ĐIỂM DỪNG
- **Cập nhật:** 2026-11-16
- **Nhánh:** `ep1-v2`
- **Đang làm:** xong mục 6 (Song song nhẹ) + 🐞 Debug (bánh răng ⚙ → Gỡ lỗi; mốc mở tập, tải file, ms/khung, xuất MP4, nút 📋 Chép). Còn mục 2–5.
- **Bước kế tiếp:** mục 3 — vẽ khung đầu t=0 mất 16,5 s ở ep003 (dịch ~70 shader còn thiếu + đưa ảnh lên GPU): dịch trước bằng compileAsync có tiến độ, rồi mục 4 giảm program.
- **Đang chờ:** người dùng bật Debug trên máy thật, bấm 📋 Chép gửi số; phiên troi-vong-nen còn phần chưa commit trong `engine/che-do-3d.js`.
- **File đang dở (chưa commit):** không (phần Trời/Vòng bao/Nền trong che-do-3d.js là của phiên troi-vong-nen)
- **Đang chạy nền:** không
- **Đạt khi:** (a) nút "📂 Tập khác" đổi tập không tải lại trang, ≤ 1/3 thời gian mở lần đầu; (b) mở lần đầu giảm rõ (có số trước/sau);
  (c) Phim giống hệt (look --ab), Xuất MP4 chạy; (d) mọi thứ bật/tắt được.
- **Câu hỏi còn mở:** không
<!-- /ĐIỂM DỪNG -->

## Quyết định đã chốt (2026-11-16, người dùng)
- **Giữ web/JS + three.js** cho studio. Không viết lại bằng Rust/Go/Unity/Godot/Unreal.
  Lý do: chậm khi mở là do **dịch shader** (giữ cache shader: 28 s → 6 s), không phải do JS; Rust vẫn phải dịch shader,
  mà cái giá là viết lại ~24k dòng `engine/`, ~77 `tools/*.mjs`, Xuất MP4, luật "hàm thuần của t". Go không có hệ sinh thái 3D.
- Xuất MP4 bằng WebCodecs (đang dùng) đã nhanh (vẽ thời gian thực + nén phần cứng): ep003 ~20–25 s, ep002 ~10–14 s. Giữ nguyên.
- **Bọc Tauri** chỉ làm SAU khi đã tăng tốc, nếu người dùng muốn cài như phần mềm (lợi: cache shader bền, đọc gói thẳng từ đĩa; lần mở đầu không nhanh hơn).
- **Nút đổi tập trong studio** (người dùng yêu cầu): cạnh ⬇ Xuất MP4 có nút gọi tập khác; hiện phải thoát studio rồi vào lại → rất chậm.

## Việc còn lại (theo thứ tự)
1. **Đo** thời gian mở studio + ep001/ep003, chia từng chặng; ghi số vào đây. Không sửa code.
2. **Nút "📂 Tập khác"** cạnh ⬇ Xuất MP4 (`tools/export-ui.js`): danh sách gói *.3js trong thư mục studio đã nhớ (`tools/studio-loader.js`)
   → đổi tập trong cùng trang: giữ `renderer` (giữ cache program three.js đã dịch) + kho IndexedDB + phông; dỡ scene/nhân vật/âm thanh tập cũ
   (dispose geometry/texture riêng, KHÔNG dispose program dùng chung), nạp tập mới. Hiện engine coi một trang = một tập → cần hàm `dong()`/`mo(goi)` sạch.
   Có ô tắt (về cách cũ: tải lại trang).
3. **Dịch shader ngầm**: `renderer.compileAsync(scene, camera)` sau khi dựng scene, trong lúc hiện màn chờ; có thể dịch trước bối cảnh của tập kế tiếp.
4. **Giảm số shader**: gom vật liệu giống nhau dùng chung (đếm bằng `tools/shaders.mjs`, ngưỡng ⚠ > 80 program).
5. **Nạp bối cảnh theo shot** (chỉ dựng env của các shot sắp phát) — chỉ làm nếu số đo việc 1 cho thấy dựng scene/GLB tốn nhiều.
6. **Song song chậm** (người dùng báo 16/11): mỗi khung `engine/che-do-3d.js` vẽ Phim đủ hậu kỳ + `drawImage` cả canvas (dòng 301)
   RỒI vẽ cảnh lần 2 cho 3D + `drawImage` lần nữa (dòng 288–293) → ~2 lần vẽ + 2 lần chép. Hướng sửa: đo fps trước; khung 3D vẽ ở độ phân
   giải thấp hơn + chỉ vẽ lại khi camera/t đổi; khung Phim khi xem trước dùng độ phân giải xem (không phải 1080×1920 đầy đủ). Không đụng Xuất MP4.
7. (Tuỳ chọn, sau cùng) bọc Tauri.

## Song song nhẹ — kết quả (16/11)
- Đo (headless, nhiễu do phiên khác chạy Chrome): chép hình chỉ ~2 ms; chỗ nặng = vẽ cảnh lần 2 cho 3D. Dùng lại bóng đổ: −3 ms (ep003), ~0 (ep001).
  Vẽ 3D cách khung lúc phát: ep001 song song 30,7 → 25,1 ms/khung (Phim 17); ep003 ~56 → ~49 (Phim ~34, máy đang tải nặng).
- Kiểm: `node tools/kiem-song-song.mjs ep001|ep003|ep004` 9/9 ĐẠT (thêm kiểm "dừng phát → 3D vẽ bù đúng t cuối"; bắt được lỗi curT, đã sửa);
  `kiem-che-do-3d.mjs episodes/ep003/index.html` ĐẠT. Script đo tạm: scratchpad do-fps.mjs / do-mo.mjs (không vào repo).

## 🐞 Debug — kết quả (16/11)
- Bật: ⚙ → Gỡ lỗi → 🐞 Chế độ Debug (nhớ trong cài đặt). Mốc luôn ghi nhẹ (`window.__dbg`: `tools/studio-loader.js`, `engine/stage.js`,
  `engine/prewarm.js`); đo ms/khung chỉ khi bật (bọc `window.renderAt`, tắt thì trả hàm gốc). `window.__debug.text()` = khối chép.
- Kiểm: `node tools/kiem-debug.mjs ep003|ep001 [--in]` 7/7 ĐẠT (Phim bật/tắt Debug lệch 0,00); kiem-song-song ep004 9/9.
- **Phát hiện (ep003, studio, máy đang tải):** engine nạp xong 0,74 s · renderer.compile 1,6 s (+117 program) · **vẽ khung đầu t=0 16,5 s**
  (shader còn thiếu + đẩy 200 texture lên GPU) · tải 686 file qua LoadingManager xong ở 25 s · __ready 25,2 s. Gói ep003 (15/11) chưa gọi prewarm.
- npm test: 6 test lỗi (kịch bản/ep001 shot/__maskAnh/HOUSE/vat-lieu) — không dính phần này (mốc chỉ chạy khi có `__dbg`, trang dev không có); chưa xét.

## Số Debug trên máy người dùng (16/11 09:47, RTX 3060, 2560x1440, ep003, Song song)
- 15,6 s → 23,2 s: nạp lại kho-chung 48,8 MB dù trùng bản (~7,5 s) → ĐÃ SỬA: cùng bản thì bỏ qua (chỉ đọc header), `kiem-studio` bước 4.
- renderer.compile 3,8 s (+117 program) · vẽ khung đầu 11,1 s · __ready 44,2 s (23 s trước khi tập chạy).
- Song song: tb 214 ms · 95% 95 ms · max 10,4 s (dịch shader bối cảnh mới khi 3D nhìn thấy; program 186 → 304). Chưa có số Phim để so.
- Debug đã sửa: mốc LoadingManager chốt trước __ready (bản cũ ghi 294 s sai); đếm khung > 1 s.

## Tra cứu cách làm (16/11)
- `compileAsync` + KHR_parallel_shader_compile (three.js PR #19752): dịch song song, KHÔNG rút tổng thời gian, chỉ hết đứng hình → hiện màn chờ có tiến độ.
- Giảm số biến thể shader là đòn chính: cùng loại vật liệu + cùng cờ (fog, map, shadow, onBeforeCompile cacheKey) thì dùng chung program; tránh `transmission` (≈ x2 thời gian dịch).
- Song song: một canvas chia `setScissor/setViewport`, vẽ thẳng lên canvas hiển thị, không render target/`drawImage` mỗi khung (khuyến nghị chung trên diễn đàn three.js, cách drei `View` làm).
- ep001 (1137 geometry): gộp hình tĩnh (`BatchedMesh`/mergeGeometries) → ít draw call; đo `renderer.info.render.calls` trước, gộp có thể phản tác dụng.
- WebGPURenderer: chưa có bằng chứng dịch nhanh hơn, có báo chậm hơn WebGL → chưa chuyển.

## Ghi chép
- **Số đo 16/11** (studio.html + gói, cùng một trình duyệt, GPU, script tạm trong scratchpad): tới lúc `document.write` trang tập < 1 s
  (kho/IndexedDB KHÔNG phải chỗ chậm). `__ready`: ep003 lần đầu 24,8 s → mở lại 15,9 → 10,5 s; ep001 lần đầu 32,3 s → lần 2 6,6 s.
  ⇒ chậm = dịch shader + dựng scene/GLB. Số program: ep003 **142** (⚠ > 80), ep001 37 (nhưng 1137 geometry, 176 texture).
- **Cơ chế hiện tại:** `tools/studio-loader.js:289 open()` ghi đè cả trang bằng `document.write(h.page)` → mỗi tập tạo renderer mới,
  three.js mất cache program. `window` được giữ qua document.write (vd `__studioRun`) → có thể giữ renderer qua lần đổi tập.
- `engine/prewarm.js:47` dùng `renderer.compile` (đồng bộ, chặn) trước `__ready`; `engine/bake.js:378` đã dùng `compileAsync`.
- Nguồn: `docs/handoff/tach-studio.md` (studio + gói .3js + kho-chung, cập nhật từ nhánh `studio-ban`), `docs/handoff/studio-che-do-3d.md`, `docs/dinh-huong-studio.md`.
- Lưu ý: tách gói KHÔNG giảm số shader/thời gian dịch (đã ghi ở tach-studio). Sửa engine/mã tập → dựng lại studio + gói + kho cùng lúc.
