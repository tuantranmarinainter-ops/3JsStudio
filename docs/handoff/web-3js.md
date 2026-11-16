# Web 3js.tuanchau.io.vn — handoff

<!-- ĐIỂM DỪNG -->
- **Cập nhật:** 2026-11-16
- **Nhánh:** `ep1-v2`
- **Đang làm:** Đã xong code + đăng `https://3js-tuanchau.pages.dev` (dự án Pages tên `3js-studio`; Pages + Function + KV HANG_DOI). Test KV thật OK (gửi khi máy tắt → bật kéo đủ). CHƯA có Access → trang đang mở công khai (URL khó đoán).
- **Bước kế tiếp:** người dùng bật Access (dash.cloudflare.com → Zero Trust → Access → Applications → Self-hosted, domain `3js-tuanchau.pages.dev` và sau là `3js.tuanchau.io.vn`, policy Allow email; thêm app thứ 2 path `/api/may/*` policy Bypass). Rồi gắn domain (Pages → Custom domains) khi zone Active; cài `cloudflared` cho đẩy tức thì (đặt MAY_URL + chạy `node tools/web-nhan.mjs`).
- **Đang chờ:** email Access (người dùng chưa gõ email; gợi ý tuantran.marinainter@gmail.com chưa xác nhận), zone Active, cài cloudflared.
- **File đang dở (chưa commit):** không (docs/handoff/web-3js.md vừa sửa)
- **Đang chạy nền:** không
- **Đạt khi:** mở được trên điện thoại sau Access; bấm duyệt ep003 → máy nhận; tắt máy nhận, bấm, bật lại vẫn đủ; có test hàng đợi.
- **Câu hỏi còn mở:** email Access là gì? Tên miền đã Active chưa (kiểm ở dash.cloudflare.com)?
<!-- /ĐIỂM DỪNG -->

## Kiểm điều kiện (2026-11-16)
- `node` có. **`wrangler` chưa cài, `cloudflared` chưa cài, chưa đăng nhập Cloudflare** (không có `~/.cloudflared/cert.pem`). `.env.local` không đọc được từ phiên này nên chưa biết có token chưa.

## Kế hoạch (chờ duyệt)
1. **Trang tĩnh** `web/` → Cloudflare Pages: `index.html` (dashboard Đang làm / Chờ bạn / Xong, đọc `docs/tien-do.json`, tái dùng CSS của `tools/tien-do.mjs`) + `duyet/ep003.html` (dựng từ chính bộ dựng trang của `tools/duyet.mjs`, ảnh ứng viên chép vào `web/`). Chỉ ep003; ep004/ep005 bị chặn bằng danh sách cho phép trong `dang-web.mjs`.
2. **Worker `3js-hang-doi`** (route `3js.tuanchau.io.vn/api/*`): `POST /api/gui` kiểm `tap`/`dot` (cùng luật `moMayChu`, ≤ 2 MB) → ghi KV `q:<thời-gian>:<id>`; cố đẩy ngay tới máy qua Tunnel, được thì xoá, không được thì để KV. `GET /api/lay` + `POST /api/xoa` cho máy kéo phần đang đợi (xác thực bằng khoá chung HMAC trong `.env.local` / secret Worker).
3. **Máy nhận** `tools/web-nhan.mjs` (cổng 8792, cloudflared đưa `nhan.tuanchau.io.vn` về đây): nhận đẩy HOẶC khi khởi động kéo `/api/lay`, ghi bằng `luuKetQua()` của `duyet.mjs` (đúng `duyet/<ep>/dot-NN.ketqua.json` + `hop-thu.jsonl`), idempotent theo id, rồi xoá khỏi KV. Cờ `WEB_NHAN=0` tắt.
4. **Cloudflare Access**: ứng dụng tự lưu trữ cho `3js.tuanchau.io.vn`, chính sách chỉ email của bạn, mã gửi qua email; `nhan.` dùng service token riêng, không mở cho người.
5. **`tools/dang-web.mjs`**: dựng `web/`, `wrangler pages deploy` (+ `wrangler deploy` Worker khi `--worker`); `tien-do.mjs --dang` gọi nó. Khoá chỉ ở `.env.local`.
6. **Test** `tools/tests/web-hang-doi.test.mjs` (KV giả): xếp hàng, đẩy lỗi → còn trong KV, kéo lại đủ, không ghi trùng, từ chối ep lạ/ep004.
7. **Triển khai**: `*.pages.dev` trước; gắn `3js.tuanchau.io.vn` khi zone Active. Dừng khi chạy được với ep003; commit theo đường dẫn, không push.

## Ghi chép
- Quyết định đã chốt (người dùng): điện thoại → Cloudflare → máy; Pages + Worker + KV + Tunnel + Access.
- Gợi ý đơn giản hoá (không bắt buộc): chỉ cần "máy kéo" (bước 3 kéo mỗi ~10 s) thì bỏ được Tunnel; giữ Tunnel nếu muốn nhận tức thì.

## Thiết kế lại web (2026-11-16, phiên điều phối giao)
- Đã chốt: tối giản trắng xám, 1 màu nhấn; điện thoại 4 nút đáy → cột trái trên máy tính; Be Vietnam Pro; sáng/tối; 4 tab: Hôm nay · Đầu việc · Duyệt · Tập phim (Studio).
- **Bản phác (bước 1):** `web/phac/index.html` → `https://3js-tuanchau.pages.dev/phac/` (dữ liệu mẫu, chưa nối gì; `dang-web.mjs` tự chép `web/phac/` vào bản đăng). Chờ người dùng xem trên điện thoại, sửa 1–2 vòng.

### Đề xuất đưa studio lên (CHƯA làm — tạo R2 phải hỏi người dùng)
- Bản gộp hiện tại: ep001 82,5 MB · ep002 58,4 MB · ep003 68,7 MB (tổng ~210 MB). Pages giới hạn 25 MiB/file → không đăng thẳng được.
- **Phương án A (khuyến nghị): R2.** Tạo bucket `3js-studio-phim`, tải 3 file lên (`wrangler r2 object put`), thêm Pages Function `/phim/<ep>.html` đọc từ R2 (binding `PHIM`), có `Range` + `Cache-Control`; chạy sau Access cùng tên miền. Chi phí: gói Free của R2 có 10 GB lưu trữ, 1 triệu thao tác ghi/tháng, 10 triệu đọc/tháng, **không tính phí băng thông ra** → ~210 MB ≈ 0 đồng (kiểm bảng giá hiện hành trước khi mua). Việc thêm: 0,5 buổi, không sửa bản gộp.
- Phương án B: tách asset (GLB, vân, giọng) thành file < 25 MiB trong Pages. Nhẹ hơn khi tải lại nhờ cache nhưng phải sửa `tools/bundle` + loader của trình phát: 1–2 buổi, dễ vỡ.
- Ràng buộc: chỉ ep001–003, không bao giờ ep004/ep005 (allow-list trong `dang-web.mjs` + Function). Nút Xuất MP4 vẫn dùng GPU máy người xem.
- **Điều kiện trước khi đưa studio lên:** Access phải bật (cần zone `tuanchau.io.vn` Active; bản pages.dev không che được). Email Access cần người dùng xác nhận.
