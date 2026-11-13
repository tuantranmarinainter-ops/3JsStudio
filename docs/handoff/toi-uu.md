# HANDOFF — tối ưu repo (phiên "bàn tối ưu", 2026-11-13)

Bản đồ đầy đủ (số đo, tần suất dùng, đề xuất, nguồn tham khảo): https://claude.ai/artifact/9ACpduwUUubESxgLJ7WKRn
(bản trên máy: `output/toi-uu/ban-do-repo.html`).

## Mục tiêu
Làm repo nhẹ hơn, công cụ chạy nhanh hơn, ít token hơn — theo 8 đề xuất người dùng đã duyệt "làm hết", sau đó nâng cấp theo repo tham khảo.

## Đã xong
1. Dọn `output/`: xoá 5,66 GB ảnh/video kiểm tra cũ. Lệnh mới `node tools/don.mjs [--xoa]`.
2. `CLAUDE.md` 278 → 114 dòng; chi tiết cũ ở `docs/chi-tiet-tu-claude-md.md`.
3. Tắt gói skill HyperFrames cho dự án (`.claude/settings.json`); gỡ lệnh npm HyperFrames. Nguyên tắc "hàm của t" giữ nguyên.
4. `tools/browser.mjs`: chế độ `PROFILE=1` giữ hồ sơ Chrome ở `.cache/chrome-profile/` → mở trang 28 s → 6 s, `look.mjs` 3 khung 94 s → 9 s,
   gộp ep002 32 s → 8 s, ảnh giống hệt. **Mặc định TẮT** (phải đặt `PROFILE=1`): khi chạy cả bộ test song song lúc máy đang tải nặng,
   1 test (`measure.test.mjs` "mask khôi phục") hết giờ chụp; chạy riêng thì đậu ở cả hai chế độ (70 s so với 156 s).
   Việc tiếp: chạy lại cả bộ test với `PROFILE=1` lúc máy rảnh; đậu như kiểu cũ thì đổi thành mặc định bật.
7. Xoá `tools/peek.mjs`, `tools/snap.js` (đã hỏng); 3 skill chuyển sang `look.mjs`.
8. Quy ước handoff → `docs/handoff/`, ảnh kiểm tra → `output/`; `git config core.safecrlf false` (cục bộ) để hết cảnh báo LF/CRLF.

## Còn lại (theo thứ tự nên làm)
1. **Mục 6a — nén model + ảnh vân** (tham khảo `donmccurdy/glTF-Transform`, `zeux/meshoptimizer`): thêm bước nén vào `tools/nhap-model.mjs`
   (dedup, meshopt/quantize, ảnh vân WebP ≤ 1k). Bắt đầu với 3 file nặng nhất dùng ở cả hai tập: `assets/polyhaven/potted_plant_01` (5,1 MB),
   `assets/polyfork/herring-gull-55c3da.glb` (3,4 MB), `assets/polyhaven/book_encyclopedia_set_01` (2,4 MB). Kiểm bằng `look.mjs --ref`.
   Hiện model 22 MB + ảnh vân 16 MB = 60% bản gộp ep002 (63 MB). Lưu ý `tools/nhap-model.mjs` đang có thay đổi dở của phiên khác.
2. **Mục 6b — gộp không cần mở trang**: `tools/bundle.mjs` lưu danh sách file đã ghi (kèm mtime của shots.js/episode.js/manifest) để lần sau bỏ
   bước mở trình duyệt. Với `PROFILE=1` bước này đã ngắn hẳn — đo lại trước khi quyết có đáng làm không.
3. **Mục 4b — giảm số shader ở gốc** (`docs/shaders.md`): ep002 có 105 program, 73 cái không có khoá dùng chung; 1 shader bóng mất 9 s;
   shader vật liệu `mats+grunge+shadow` dài ~100.000 ký tự. Tham khảo `renderer.compileAsync()` và `customProgramCacheKey` của three.js.
   Lợi cho người dùng khi mở `dist/<ep>.html` lần đầu (hồ sơ Chrome của họ không có cache của công cụ).
4. **Mục 5 — một trang phát chung cho mọi tập** (tham khảo cách chia của `remotion-dev/remotion`, `motion-canvas/motion-canvas`; giao diện dòng
   thời gian: `theatre-js/theatre`). ep001 lệch mẫu 309 dòng, ep002 lệch 29 dòng. CHỜ: người dùng chốt thiết kế giao diện PC; phiên sửa ep001 xong.
5. **Mục 8 phần còn lại**: khi các phiên khác commit xong → chuyển `HANDOFF-*.md`, `BAO-CAO-quy-trinh.md` vào `docs/handoff/`; thêm `.gitattributes`
   (`* text=auto eol=lf`) rồi `git add --renormalize .` trong một commit riêng.
6. **Mục 1 phần còn lại**: 11 bản `dist/` cũ (0,9 GB) — hỏi người dùng giữ bản nào ngoài `ep001.html`, `ep001_xem-thu.html`, `ep1_v13.html`.
7. Tuỳ chọn, chỉ khi gặp giới hạn: `Vanilagy/mediabunny` thay `mp4-muxer`; `pmndrs/postprocessing` cho `engine/post.js`.

## Quyết định đã chốt
- HyperFrames: giữ nguyên tắc, gỡ công cụ, tắt gói skill; bật lại khi cần lấy khối dựng sẵn (người dùng chốt 2026-11-13).
- Dọn file: xoá hẳn được sau khi người dùng duyệt danh sách; không tự xoá `dist/`, `refs/`, `feedback/`.
- Không đổi `tools/browser.mjs` kiểu làm thay đổi kích thước ảnh chụp: mọi thay đổi phải qua `look.mjs --ref` với ảnh chụp kiểu cũ.

## Ghi nhận, chưa sửa
- 5 test hỏng trước khi phiên này bắt đầu: 3 test `asset-plan` (do `engine/r15.js` sửa dở), 1 test `ghi-cong`, 1 test `shottypes`
  (HOUSE.hd = 36 lệch bbox thật 23,36).
- `episodes/ep001/README.md` còn nhắc `tools/peek.mjs` (file của phiên khác, chưa sửa).
- Agent phụ: 358/390 chạy Sonnet, 10 chạy Haiku — nên dùng Haiku cho việc tìm/đọc.

## File quan trọng
`CLAUDE.md` · `tools/browser.mjs` · `tools/don.mjs` · `tools/bundle.mjs` · `tools/shaders.mjs` · `docs/shaders.md` · `docs/chi-tiet-tu-claude-md.md`
