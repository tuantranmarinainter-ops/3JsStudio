# HANDOFF phiên điều phối

<!-- ĐIỂM DỪNG: tối đa 25 dòng, GHI ĐÈ cả khối mỗi lần cập nhật (mẫu: docs/handoff/_mau.md). Phần dưới khối là ghi chép, chỉ đọc khi cần. -->
## ĐIỂM DỪNG
- **Cập nhật:** 2026-11-16 (trước /compact)
- **Nhánh:** `ep1-v2`, upstream thật là `origin/claude/ep1-v2` (đang đi trước nhiều commit). KHÔNG push khi chưa được bảo; `main` chưa đụng
- **Đang làm:** điều phối, KHÔNG code tại đây (việc code/dựng mở phiên con). Tập 2 tạm gác: `docs/handoff/ep002-tam-gac.md`
- **Xong gần đây:** 3D giữ góc + mọi tập (`docs/handoff/studio-che-do-3d.md`) · ánh sáng 2.5D lightCues (f767740) · dọn repo, ep004/ep005
  ra `.gitignore` (6ac8107, `docs/handoff/don-repo.md`) · kế thừa tập 1 B0–7 + luật CLAUDE.md (`docs/handoff/ke-thua-ep001.md`)
- **Phiên con đang chạy:** giam-tai-cpu (local_ca009255-2525-4090-8754-abb7aed8122a, `docs/handoff/giam-tai-cpu.md`): Chrome tối đa 3
  (`tools/chrome-sem.mjs`), đang đo lại sau khi nới thời hạn test. Đạt khi 3 `npm test` song song → Chrome ≤ 3; dừng khi commit + báo số trước/sau
- **Khi giam-tai-cpu báo:** kiểm `git show --stat`, số đo Chrome ≤ 3, luật agent đã vào CLAUDE.md → báo người dùng 1–2 dòng + link tiến độ
- **Đang chờ người dùng:** (1) chuyển 23 file chết/bị thay vào `archive/` (`output/code-thua/bao-cao.md`); (2) xử lý `engine/nv-*`
  và ogg ep001 chưa commit; (3) duyệt kế hoạch tach-studio (câu hỏi GitHub Release); (4) tên miền tuanchau.io.vn (eKYC Mắt Bão → NS Cloudflare);
  (5) trang chủ `tools/cong.mjs`; (6) idle khối vuông mặc định; (7) ep003 còn: nhà thị trưởng, cửa sổ sáng, biển tiệm bánh
- **Ràng buộc:** không đụng `engine/r15.js`, `episodes/ep001/*` (phiên ep001-sky-storm giữ); ep004/ep005 không vào repo; commit ghi rõ đường dẫn
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
