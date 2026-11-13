# HANDOFF phiên điều phối (cập nhật 2026-11-13 19:40)

**Tập 2 tạm gác** — trạng thái đầy đủ: `docs/handoff/ep002-tam-gac.md`. **Tập 3** làm ở phiên con riêng. Không còn agent nào chạy.
Máy nhận (bật lại khi cần): `node tools/tien-do.mjs nhan --mot-lan` (8793), `node tools/gop-y-nhan.mjs --mot-lan` (8792), `node tools/duyet.mjs ep002 mo --mot-lan --khong-mo` (8791).
Lưu ý git: phiên khác có file đã `git add` sẵn (vd `assets/faces/emote37/`) → khi commit luôn ghi rõ đường dẫn: `git commit <file…> -m …`.


Nguồn sự thật về tiến độ: `docs/tien-do.json` (dựng: `node tools/tien-do.mjs` + `node tools/tien-do-artifact.mjs`, đăng lại artifact
https://claude.ai/artifact/HZXy4g9aPUZYGUDdiYmRiW). Định hướng: `docs/dinh-huong-studio.md`. Mọi câu trả lời phải kèm link tiến độ.

## Đang chạy
- Agent Sonnet a114a23b700e39cf1: (A) nguyên nhân gốc s061 nhà máy + s070 cắt người, (B) 6 bảng màu nhà mới + lưới `output/look/bang-nha/luoi.jpg`.
  Chưa commit phần của nó (`engine/town-styles.js`, docs, test, dòng s061/s070 trong shots.js, có thể shottypes/factory).
- Nền: `node tools/tien-do.mjs nhan --mot-lan` (cổng 8793), `node tools/gop-y-nhan.mjs --mot-lan` (cổng 8792) — tắt sau mỗi lần nhận, bật lại.

## Việc kế tiếp (theo thứ tự)
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
