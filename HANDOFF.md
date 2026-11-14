# HANDOFF phiên điều phối

<!-- ĐIỂM DỪNG: tối đa 25 dòng, GHI ĐÈ cả khối mỗi lần cập nhật (mẫu: docs/handoff/_mau.md). Phần dưới khối là ghi chép, chỉ đọc khi cần. -->
## ĐIỂM DỪNG
- **Cập nhật:** 2026-11-14 (phiên điều phối đã xác nhận)
- **Nhánh:** `ep1-v2`; người dùng cho push 1 lần ngày 14/11 (tới `dc161c0`, lên `origin/claude/ep1-v2`). Các lần sau vẫn KHÔNG push khi chưa được bảo; `main` chưa đụng
- **Đang làm:** điều phối, KHÔNG code tại đây (việc code/dựng mở phiên con). Tập 2 (ep002) tạm gác: `docs/handoff/ep002-tam-gac.md`
- **Phiên con đang mở:** ep003 (Tập 4, duyệt lại asset theo Roblox + gắn NPC) · ep003-roblox đợt 4 (nhà) · npc-roblox · face-pack-altiwyre ·
  roblox (công cụ tải) · engine-diem-giua (xong) · nghien-cuu-game-studios (cải tiến 1–3 xong)
- **Quy trình mới** (kịch bản chữ → video): sơ đồ `docs/quy-trinh-so-do.html`, đặc tả `docs/quy-trinh-dau-vao.md`, đề bài Codex `docs/de-bai-codex-mau.md`.
  Đợt 1–3 công cụ đã code + test; CHƯA chạy trọn trên một kịch bản thật
- **Bước kế tiếp:** (1) người dùng duyệt các trang đang chờ; (2) cải tiến 5 rồi 4 trong `docs/nghien-cuu-game-studios.md` nếu người dùng đồng ý;
  (3) chạy thử trọn quy trình mới trên một kịch bản ngắn 20–30 shot
- **Đang chờ người dùng:** duyệt `dist/ep003_duyet.html` (asset, nhà), `dist/face-pack_mau.html` (bộ mặt); gấu Tập 4 chưa chốt nguồn
- **File đang dở (chưa commit):** của phiên khác, có file đã `git add` sẵn → luôn `git commit <file…> -m …`; nhiều phiên chung một checkout
- **Đang chạy nền:** không có ở phiên điều phối. Máy nhận bật khi cần: tiến độ 8793, góp ý 8792, duyệt 8791, duyệt bảng shot 8794
- **Mỗi lần phiên con báo:** `node tools/tien-do.mjs` rồi đăng lại `output/artifact/tien-do.html` lên artifact tiến độ
<!-- /ĐIỂM DỪNG -->

## Ghi chép

**Tập 2 tạm gác** — trạng thái đầy đủ: `docs/handoff/ep002-tam-gac.md`. **Tập 3** làm ở phiên con riêng.
Máy nhận (bật lại khi cần): `node tools/tien-do.mjs nhan --mot-lan` (8793), `node tools/gop-y-nhan.mjs --mot-lan` (8792), `node tools/duyet.mjs ep002 mo --mot-lan --khong-mo` (8791).
Lưu ý git: phiên khác có file đã `git add` sẵn (vd `assets/faces/emote37/`) → khi commit luôn ghi rõ đường dẫn: `git commit <file…> -m …`.


Nguồn sự thật về tiến độ: `docs/tien-do.json` (dựng: `node tools/tien-do.mjs` + `node tools/tien-do-artifact.mjs`, đăng lại artifact
https://claude.ai/artifact/HZXy4g9aPUZYGUDdiYmRiW). Định hướng: `docs/dinh-huong-studio.md`. Mọi câu trả lời phải kèm link tiến độ.

## Việc kế tiếp của Tập 2 khi quay lại (ghi cũ 13/11, xem thêm `docs/handoff/ep002-tam-gac.md`)
1. Khi agent trên xong: kiểm, commit, gộp `npm run bundle:ep002` → `cp dist/ep002.html dist/ep002_xem-thu.html`, chụp cả phim 1 lần + `--det`.
2. s006: hộp CÓ nhẫn (`hop-nhan-co-nhan`) → zoom vào → nhẫn nhấp nháy rồi biến mất (shots.js + props-glb).
3. Tiệm gấu: thêm gấu bông (bap/bap2/bap3) trên giá trong cửa hàng.
4. Hai cụm thùng dấu gấu chưa có shot nào đưa vào khung; bảng hiệu là bảng đứng trên trụ sau mỗi địa điểm (không gắn mặt tiền).
5. Lời theo shot cho danh sách shot của studio (ep002 thiếu `__captions`); s069 luma 193 (bản đồ cháy), s077 78, s006 91.
6. Sau ep002: dây chuyền kịch bản → video với Gà (rút bài học ep002 vào lam-phim + tập mẫu) → chế độ 3D giai đoạn 1 (xem + kiểm).
7. Để sau theo ý người dùng: tiếng Anh Andrew, khoá Roblox, khoá Poly Pizza trong .env.local, Gà cho ep001 (chưa bật).

## Quyết định mới nhất (đã ghi vào tien-do.json mục daChot + CLAUDE.md + bộ nhớ)
- Model giấy phép bất kỳ, vẫn ghi nguồn; mỗi món đề xuất nhiều ứng viên.
- Người dùng hay xem bằng điện thoại → cập nhật artifact tiến độ mỗi lần.
- Hạn mức 5 giờ đã chạm 1 lần (13:30): tối đa 2 agent Sonnet cùng lúc, đề bài hẹp.
