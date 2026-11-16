---
name: trung-tam
description: Cập nhật trang artifact "Trung tâm điều hành" — bảng mọi phiên 3JS Studio chia 4 cột Đang làm / Chờ bạn / Tạm nghỉ / Đã xong, lời lẽ đơn giản cho người già và trẻ em đọc được. Dùng BẤT CỨ KHI NÀO người dùng nói "cập nhật trung tâm", "trung tâm điều hành", "bảng phiên", "phiên nào đang làm", "việc nào chờ tôi", hoặc sau khi mở/xong/dừng một phiên con — kể cả khi không nhắc tên skill.
---

# Cập nhật Trung tâm điều hành

Trang: https://claude.ai/artifact/JUGQ8iJHoj5AiD2boeppbT (nguồn trang: `tools/trung-tam.html`; bản đăng: `output/artifact/trung-tam/trung-tam.html`).
Dữ liệu gốc: `docs/trung-tam.json` (trong git). Trang đọc MỘT bản ghi db: `bang/hientai`.
Cập nhật dữ liệu KHÔNG cần đăng lại trang. Chỉ đăng lại khi sửa giao diện.
**Bản trên máy** `dist/trung-tam.html` (nút Xem phiên mở thẳng Claude Code, tự tải lại mỗi phút) do bước `dong-goi` dựng lại mỗi lần — luôn kèm link `file:///S:/3JS%20Studio/dist/trung-tam.html` khi báo người dùng.

## Các bước (khoảng 6 lệnh)
0. **Yêu cầu từ nút bấm trên trang** (mỗi thẻ có ô Ghi chú + nút Tạm dừng / Làm tiếp / Lưu trữ, ghi vào db `yeucau/<id>`):
   `ArtifactData list collection=yeucau out_dir=S:\3JS Studio\output\_tmp\trung-tam-yc`, rồi
   `node tools/trung-tam.mjs yeu-cau output/_tmp/trung-tam-yc`. Làm từng yêu cầu theo id phiên `local_…`:
   - `tam-dung` → `mcp__ccd_session_mgmt__stop_session`.
   - `lam-tiep` → `mcp__ccd_session_mgmt__send_message`, nội dung = ghi chú của người dùng (thiếu ghi chú thì gửi "Làm tiếp việc còn dở theo ĐIỂM DỪNG").
   - `luu-tru` → `mcp__ccd_session_mgmt__archive_session`, rồi đặt `trangThai: "luu-tru"` trong docs/trung-tam.json.
     KHÔNG BAO GIỜ lưu trữ phiên nhóm "Điều phối" (phiên điều phối không được bỏ); gặp thì báo lại người dùng.
   Làm xong thì ghi lại `yeucau/<id>` với `hanhDong: ""`, giữ nguyên `ghiChu` (dùng batch, có `if_version`).
   Ghi chú không kèm nút chỉ để người dùng nhớ: đọc, có việc rõ ràng thì báo người dùng, không tự làm.
1. `mcp__ccd_session_mgmt__list_sessions` với `limit: 40`. Chỉ giữ phiên có `cwd` bắt đầu bằng `S:\3JS Studio`.
2. `node tools/trung-tam.mjs diem-dung --ngay 2` in khối ĐIỂM DỪNG của các handoff mới sửa (gọn, ≤ 4 dòng/file).
   Không đọc transcript từng phiên, trừ khi một thẻ thật sự không rõ.
3. Sửa `docs/trung-tam.json` bằng Edit, chỉ những phiên thay đổi:
   - id = `name` của phiên (hoặc slug ngắn), `link` = trường `link` của list_sessions, `lanCuoi` = `lastActivityAt`.
   - Phiên mới → thêm. Phiên đã archive hoặc không còn trong danh sách → xoá.
4. `node tools/trung-tam.mjs dong-goi`: kiểm dữ liệu, đóng dấu giờ, ghi `output/trung-tam/bang.json`. Có LỖI thì sửa rồi chạy lại.
5. `ArtifactData` `get` bang/hientai để lấy `version`, rồi `set` collection `bang`, doc_id `hientai`,
   `file_path` = `S:\3JS Studio\output\trung-tam\bang.json`, `if_version` = version vừa đọc.
6. Báo người dùng 1–2 dòng: số việc mỗi cột, liệt kê ngắn các việc "Chờ bạn", kèm link trang.

## Cách xếp cột
- `dang-lam`: `isRunning: true`.
- `cho-ban`: ĐIỂM DỪNG ghi "Đang chờ: người dùng …" (duyệt, chọn, quyết, bấm thử). BẮT BUỘC có `banCan`.
- `xong`: ĐIỂM DỪNG ghi xong và không còn chờ gì.
- `tam-nghi`: còn lại (làm dở, chờ phiên khác, nhánh riêng chưa gộp).
- `luu-tru`: phiên đã archive (sau nút Lưu trữ). Trang ẩn cột này cho tới khi người dùng bấm ô "Lưu trữ".

## Lời lẽ (quan trọng nhất)
Người đọc có thể là người già hoặc học sinh lớp 5.
- Câu ngắn, không thuật ngữ: không viết commit, rig, worktree, merge, env, shot, GLB.
  Viết "lưu lại", "bộ nhân vật", "bản riêng chưa gộp", "cảnh", "mẫu 3D".
- `ten` ≤ 60 ký tự. `dangLam`, `tiepTheo`, `banCan` mỗi trường 1 câu.
- `banCan` bắt đầu bằng động từ: "Mở…", "Chọn…", "Duyệt…", "Trả lời…".
- Chỉ ghi điều đọc được từ danh sách phiên hoặc handoff. Không chắc thì để trống.

## Lỗi đã gặp
- Bản ghi đã có thì `set` thiếu `if_version` bị từ chối → luôn `get` trước.
- Dùng regex với chữ Việt thì không dùng `\b` sau chữ có dấu ("chờ", "làm"): JS không nhận ra ranh giới.
