# Kho theo mã (sha256) — tải asset món nào cần món đó

<!-- ĐIỂM DỪNG: tối đa 25 dòng. GHI ĐÈ cả khối mỗi lần cập nhật, không nối thêm. -->
## ĐIỂM DỪNG
- **Cập nhật:** 2026-11-18 · **Trạng thái:** kế hoạch đã duyệt (phiên điều phối), CHƯA code
- **Chờ:** phiên Roblox (`claude/trich-studio-2-2a39bb`) xong việc "bối cảnh mở trong trình phát + giao diện điện thoại"
  vì cùng đụng `tools/studio-loader.js` / `tools/bundle-studio.mjs`. Sau đó giao 1 phiên con Sonnet.
- **Đã chốt:** không có mạng → TÍNH SAU (chưa làm nút "Tải sẵn cả dự án"); mọi tính năng mới bật/tắt được; chỉ ep001–003 lên web.
<!-- /ĐIỂM DỪNG -->

## Vấn đề
`kho-chung.3js` 57 MB, `kho-city.3js` 177 MB — mở map 0,4 MB vẫn phải tải cả kho; mỗi dự án mới làm kho phình thêm.
Studio đã lưu asset theo sha256 trong IndexedDB; cái nặng chỉ là cách GIAO (một cục).

## Thiết kế
1. **Kho trên R2 theo mã:** mỗi GLB/ảnh vân một object `kho/<2 ký tự đầu>/<sha256>.<đuôi>`, content-type đúng,
   `cache-control: immutable`. Trùng nội dung = 1 bản, dùng chung mọi dự án. Function `/r2/k/<sha>` (Range, chặn tên lạ).
2. **Gói `.3js` chỉ bố cục + `refs` {đường dẫn: [kiểu, sha, độ dài]}** (đã có ở gói bối cảnh / gói tập dùng kho chung).
3. **studio-loader:** thiếu ref nào trong IndexedDB → `fetch('/r2/k/'+sha)` song song (giới hạn ~8 luồng), kiểm sha, lưu IndexedDB.
   Thanh tiến độ "Đang tải 37/89 món · 4,2 MB". Ô `?kho=` cũ vẫn chạy (đường cũ, bật/tắt bằng `?khoMa=0`).
4. **Đẩy kho:** `tools/dang-r2.mjs kho` — đọc refs của mọi gói được phép, đẩy món chưa có (so danh sách đã đẩy ở `.cache/dang-r2.json`).
   `dang-r2.mjs map|studio` dùng luôn kho theo mã, bỏ đóng kho riêng.
5. **Làm nhẹ:** món mới vào kho qua `tools/nen-model.mjs` (lượng tử hoá, vân WebP ≤ 1k). Bản điện thoại (vân 512) — tính sau.

## Đạt khi
- Mở `city-moi-5x5` trên web (giả lập điện thoại): tải lần đầu ≈ dung lượng asset map dùng (~7 MB), lần 2 ≈ 0 (đo số byte mạng).
- ep003.3js mở được chỉ với kho theo mã (không tải kho-chung 57 MB); đường `?kho=` cũ vẫn chạy.
- Test thuần cho chọn món thiếu / kiểm sha / Function `/r2/k/`.

## Dừng khi
Đạt như trên với ep003 + city-moi-5x5; commit theo đường dẫn, không push. Bế tắc 3 cách → báo.
