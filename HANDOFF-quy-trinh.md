# HANDOFF — quy trình "một câu luật → phim HTML" (cập nhật 2026-11-12 đêm, cuối phiên 3 lượt 2 (2026-11-13))

Đọc `CLAUDE.md` trước. `HANDOFF.md`, `HANDOFF-canh.md`, `HANDOFF-gop-y.md`, `HANDOFF-ga.md` là của việc khác — không đụng.

## Mục tiêu
Dây chuyền: câu luật → 5 kịch bản mẫu → kịch bản đầy đủ → "tiến hành" → `dist/<ep>.html`, sửa tay < 10 lần.
- Thiết kế: `docs/superpowers/specs/2026-11-12-quy-trinh-mot-cau-luat-ra-phim-design.md`
- Kế hoạch 21 task: `docs/superpowers/plans/2026-11-12-quy-trinh-mot-cau-luat-ra-phim.md`
- **Sổ tiến độ (nguồn sự thật; đọc từ dòng "PHIÊN 3 (controller mới" trở xuống, mọi `Ruling:` nằm trong sổ):**
  `.superpowers/sdd/2026-11-12-quy-trinh-mot-cau-luat-ra-phim/progress.md` (gitignore; cùng thư mục có brief/report/diff, và
  `quy-tac-implementer.md` = quy tắc chung đưa cho mọi implementer). Dùng skill `superpowers:subagent-driven-development`.

## Quyền người dùng đã cho
- Lời người dùng (đêm 2026-11-12): "Tôi đi ngủ đây, goal 21 task hoàn thành, tự động handoff và chuyển phiên, có thể lệnh clear, tự do chuyển giữa 2 phiên."
  Phiên dài ở mốc sạch (không agent chạy, đã commit): cập nhật file này + sổ, commit, `mcp__ccd_session_mgmt__clear_session` self, kết lượt bằng
  "ĐÃ XIN CLEAR — nhờ phiên 2 gửi lại lệnh" (bị từ chối thì làm tiếp, không thử quá 1 lần). Phiên 2 = `local_2b39d5b3-e6c3-42ff-81f9-2e54d5ae372a`.
- Lời người dùng: "Tới task 21 dung lại báo cáo đợi lệnh" → tới Task 21: cập nhật file này + sổ, commit, viết báo cáo tổng (việc xong, mọi `Ruling:` + giá nếu sai,
  việc chờ duyệt, link `dist/ep001.html`).
- Lời người dùng (đến sau, qua phiên Gà): "Sau khi hoàn thành skill tới bước 21 hãy dùng kịch bản này, ra bản nháp video cho tôi." → SAU báo cáo tổng, chạy ep002 bằng
  `episodes/ep002/kich-ban.md` (commit `5a94bd5`, 114 shot, mốc 2:20 → `--khop-giong`); hero = Gà (`engine/ga-rig.js` `createGa`, `HANDOFF-ga.md`); Bắp (gấu bông nơ xanh)
  + 2 gấu chưa có; "Cần dựng" 7 env/10 prop/8 anim. Ra `dist/ep002_xem-thu.html` + link + SendUserFile. KHÔNG tự nghĩ câu luật. Giọng CapCut; lỗi/chậm → dừng bước giọng, `--dry`.
- KHÔNG: push, merge, đổi ngưỡng L1, thay skybox chưa rõ giấy phép, duyệt đổi hình ep001, áp bảng "Đề xuất đổi loại" vật liệu.
- Không Haiku; Sonnet cho code + rà soát; Opus chỉ thiết kế khó / rà cả nhánh; ≤ 3 agent cùng lúc, mỗi agent file riêng. Phiên 3 là controller DUY NHẤT.

## Đã xong, đã rà sạch, đã commit (nhánh `ep1-v2`, CHƯA push; HEAD lúc viết `c0ae7da` + commit file này)
**Task 1–19 đều `complete` trong sổ** (13 gồm 13a–13f: thước đo tầng theo từng mesh + `engine/envs/goc-mau.js`; 14 asset-plan; 15 mau-duyet;
16 shot-gen; 17 ra-loi; 19 lam-phim + skill `lam-phim`). Cả bộ test 249/249 (`node --test tools/tests/*.test.mjs`).
Kết giai đoạn 3 xong: `episodes/ep001/quy-trinh.json` L8.vatMoiTangMin 0 (ruling), kiem-luat ep001 = 26 shot lỗi, chuẩn `refs/sau-gd3` (không commit),
`dist/ep001.html` đã gộp (dựng từ cây có `engine/r15.js` + `episodes/ep001/episode.js` sửa dở của phiên Gà). Ảnh duyệt: `output/ep001/duyet/task10-truoc-sau.jpg`, `task20a-troika.jpg`.

## Đã commit nhưng CHƯA rà
- **Task 20a+20b `c0ae7da`**: troika-three-text cho chữ bưu thiếp sau ô `troikaText` (mặc định TẮT); three-mesh-bvh KHÔNG tích hợp (measure ≤ 0,29 s/khung).
  Báo cáo `task-20ab-report.md`, diff (không gồm vendor) `review-task20ab.diff` trong thư mục sổ.

## Còn lại (theo thứ tự)
1. Rà Task 20a+20b (1 reviewer Sonnet; brief `task-20-brief.md`) → vòng sửa nếu cần. Song song giao **Task 20c+20d** cho 1 implementer Sonnet:
   20c three.quarks (ruling: mặc định KHÔNG tích hợp vì stateful, trừ khi cấp `t` tất định mà `--det` đạt → ghi lý do `docs/core.md`);
   20d `postprocessing` (pmndrs) thay dần pass trong `engine/post.js` sau ô FX mặc định TẮT; tiêu chí như 20a (ô tắt 0 lệch, `--ab` PSNR, program không tệ hơn,
   `--det`, bản gộp 1 file); ảnh A/B `output/ep001/duyet/task20d-*.jpg`. Mỗi cái một commit.
2. Rà cả nhánh (Opus, `superpowers:requesting-code-review`, gói diff `git merge-base main HEAD`..HEAD) + chỉ cho nó mọi dòng "minor (deferred)" / "parked" trong sổ;
   MỘT lượt sửa + một lượt rà lại; đổi nhãn ô `tangXa` → "Tầng bổ sung".
3. Mục 11b.3 spec: cập nhật `CLAUDE.md` (bảng công cụ + skill mới; đây là việc trong spec người dùng đã duyệt).
4. Báo cáo tổng cho người dùng (việc xong, MỌI `Ruling:` trong sổ kèm giá nếu sai, việc chờ duyệt, link `dist/ep001.html`) + cập nhật file này + commit.
5. **Task 21**: ep002 theo kịch bản người dùng đã duyệt (xem mục Quyền) bằng skill `lam-phim` → `dist/ep002_xem-thu.html` + link + SendUserFile.
   Đã biết: nhân vật `bach` (beard=true) làm r15/cast ném `h.replace`; Gà chưa nối `engine/cast.js`; ep002 thiếu 7 env, 2+ đạo cụ, Bắp + 2 gấu.

## Cảnh báo
- Phiên khác commit vào CÙNG checkout (góp ý ep001, sky-storm, Gà). Trước mỗi lần giao/commit: `git status` + `git log -5`; chỉ `git add` đúng file của task.
  `engine/r15.js`, `episodes/ep001/episode.js` đang sửa dở của phiên Gà — không commit hộ.
- Implementer KHÔNG commit; controller commit. Vòng sửa: resume implementer bằng SendMessage (agentId trong sổ) — sau clear thì giao implementer mới đọc report.
- `node --test tools/tests/*.test.mjs` (dạng thư mục lỗi trên Node 24). "Không đổi hình ep001" kiểm bằng A/B chụp trước/sau; `refs/truoc-gd3` đã cũ.

## Chờ người dùng quyết (không tự làm)
- Task 10: 56 shot ep001 đổi hình (kim loại/kính mất grunge) — xem `output/ep001/duyet/task10-truoc-sau.jpg`; bảng "Đề xuất đổi loại" trong `docs/vat-lieu.md`.
- kiem-luat ep001: ~39 shot lỗi (8 shot L1 mới); L8 ep001 tắt nửa "vật mỗi tầng"; bộ luật bắt ~9% lỗi thật của v1; 37 shot < 0,8 s; skybox `sky-7`/`sky-9`.
- tangXa tắt (ep001) → brazil, storm, shipStorm, reef thiếu tầng. Gà v2 chưa duyệt chính thức.

Câu dán vào phiên mới: **"Đọc HANDOFF-quy-trinh.md rồi làm tiếp mục còn lại số 1. Chạy liền, không hỏi lại."**
