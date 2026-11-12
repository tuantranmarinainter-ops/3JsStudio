# HANDOFF — quy trình "một câu luật → phim HTML" (2026-11-12)

Đọc `CLAUDE.md` trước. `HANDOFF.md` và `HANDOFF-canh.md` là của việc ep001 khác — không đụng.

## Mục tiêu
Xây dây chuyền: câu luật → 5 kịch bản mẫu → kịch bản đầy đủ → "tiến hành" → `dist/<ep>.html`, sửa tay < 10 lần.
- Thiết kế: `docs/superpowers/specs/2026-11-12-quy-trinh-mot-cau-luat-ra-phim-design.md`
- Kế hoạch 21 task: `docs/superpowers/plans/2026-11-12-quy-trinh-mot-cau-luat-ra-phim.md`
- **Sổ tiến độ (đọc đầu tiên):** `.superpowers/sdd/2026-11-12-quy-trinh-mot-cau-luat-ra-phim/progress.md`
  (gitignore, chỉ có trên máy này; cùng thư mục có brief/report từng task).

## Đã xong (nhánh `ep1-v2`, đã commit tới 4db5860, CHƯA push; 93/93 test `npm test`)
Task 1 nhịp · 2 lint kịch bản · 3 skill `viet-kich-ban` · 4 `engine/measure.js` · 5 luật `tools/kiem/` ·
6 `tools/kiem-luat.mjs` · 7 `tools/theo-doi.mjs` · 11 pose trong manifest · 18 `tools/ghi-cong.mjs` — đều đã rà soát xong.
Task 8 hiệu chỉnh ep001: đã commit, rà soát trả "Changes requested", CHƯA sửa.

## Còn lại (làm theo thứ tự)
1. **Task 8, vòng sửa 1** (các điểm I1–I5 ghi ở cuối sổ tiến độ): L1 miễn theo từng khung thay vì cả shot; `soChan` chỉ đếm
   chân trong khung; 4 shot `rieng` tắt L4 → `static: true` trong `episodes/ep001/shots.js`; sửa số liệu sai trong
   `docs/kiem-luat-hieu-chinh.md` và ghi rõ "xanh không phải bằng chứng". Rồi rà lại, ghi sổ "Task 8: complete".
2. **Đợt 4:** Task 9 (5 loại shot mới), Task 10 (vật liệu khai báo; xong thì bỏ `L9.tat`).
3. **Đợt 5:** Task 12 (mặt R15 sống; Opus cho thiết kế nội suy), Task 13 (tầng bối cảnh, giờ/thời tiết, sinh từ mô tả).
4. **Đợt 6:** Task 14 asset-plan, 15 mau-duyet, 16 shot-gen.  5. **Đợt 7:** Task 17 ra-loi → Task 19 lam-phim + skill.
6. Task 20 thay lõi từng cái (A/B, mặc định tắt).  7. Rà cả nhánh (Opus) + sửa gộp các "minor (deferred)" trong sổ.
8. Task 21 ep002 chạy thật — cần người dùng đưa câu luật.
9. Mục 11b.3 của spec: cập nhật `CLAUDE.md` (R15 cho tất cả, skill mới, `output/<ep>/duyet/`).

## Quyết định đã chốt
- Người dùng: chạy liền tới hết giai đoạn 5 rồi báo; **không dùng Haiku** — Sonnet cho code + rà soát, Opus chỉ thiết kế khó;
  ≤ 3 agent cùng lúc, mỗi agent file riêng.
- Cách làm: skill `superpowers:subagent-driven-development`; implementer KHÔNG commit, controller commit đúng file từng task
  (phiên khác đang sửa `engine/envs/*`, `engine/grass*`, `engine/post.js`, `engine/backdrop*` cùng checkout — không đụng).
- Mỗi agent dùng thư mục tạm riêng (đã có sự cố ghi đè `patch.py`). `node --test tools/tests/*.test.mjs` (dạng thư mục lỗi trên Node 24).
- Các "Ruling" của controller nằm trong sổ tiến độ (tìm chữ `Ruling:`): pose là mảng + `animTheoPose`; đánh dấu `twist` ở cột
  ghi chú + lint K11; `coVai` theo trang; tên ảnh theo khung đo; L6 chỉ đòi bụi chân vừa chạm; ghi-cong thoát mã 3 khi chưa rõ giấy phép.

## Sự thật quan trọng (đã báo người dùng, chờ họ quyết)
- **Bộ luật chỉ bắt đúng ~9% lỗi thật của v1** (13/143 shot; tối đa ~25% về nguyên tắc). ~75% (nhân vật, vật liệu, chữ, mô hình sai,
  camera sai góc, bối cảnh thiếu chi tiết) phải giải bằng giai đoạn 3 + bảng mẫu duyệt. "Cuối xanh" hiện do ngưỡng ep001 đặt sát số đo.
- L1 lề 5% mặc định: 30/30 shot áp luật của bản cuối đều trượt → người dùng quyết ngưỡng hay phim.
- ep001 có 37 shot < 0,8 s; đang ngoại lệ `L11.macDinh 0.13` riêng ep001. Người dùng xác nhận 0,8 s cho tập mới.
- ep001 dùng skybox `sky-7`/`sky-9` (từ Roblox Sky, không giấy phép ghi rõ; `engine/envs.js:134-143`). Không tự thay.
- 10 shot bản cuối còn báo lỗi cần người xem: `output/ep001/duyet/luoi-loi.jpg` (s009 s010 s033 s037 s049 s083 s094 s106 s135 s136).

## File quan trọng
`tools/kb/{nhip,kichban,lint}.py` · `.claude/skills/viet-kich-ban/` · `engine/measure.js` · `tools/kiem/{luat,anh,trang-thai,pose,env-loai}.mjs`,
`mac-dinh.json` · `tools/{kiem-luat,theo-doi,ghi-cong,manifest-pose}.mjs` · `episodes/ep001/quy-trinh.json` · `docs/kiem-luat-hieu-chinh.md`
· `docs/nhip-kich-ban.{json,md}` · `dist/ep001_theo-doi.html`.

Câu dán vào phiên mới: **"Đọc HANDOFF-quy-trinh.md rồi làm tiếp mục còn lại số 1."**
