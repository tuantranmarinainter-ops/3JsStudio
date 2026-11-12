# HANDOFF — quy trình "một câu luật → phim HTML" (cập nhật 2026-11-12 đêm, cuối phiên 3 lượt 1)

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

## Đã xong, đã rà sạch, đã commit (nhánh `ep1-v2`, CHƯA push; HEAD lúc viết `7d6f424` + commit file này)
Task 1–12, 13a, 13b, 18 · **Task 14** (`0f9e3de` + `f23a6b8`) · **Task 16** (`c08b97c` + `d9f6e9c`).
Ảnh duyệt Task 10: `output/ep001/duyet/task10-truoc-sau.jpg`.

## Đã commit nhưng CHƯA xong vòng rà
- 13c `53d8222`, 13d `bed0b9c`: đã rà → Spec ❌ vì tầng xa chỉ "đủ số đếm" (bbox gộp của group bao cả camera). Ruling: sửa ở gốc bằng 13f.
- 13e `aebdb19`: CHƯA rà (báo cáo `task-13e-report.md`, ảnh `output/look/t13e-env/`).
- **13f `7d6f424`** (measure.js đếm theo từng mesh + `engine/envs/goc-mau.js` 2 góc chuẩn/env + test, 17 env vào `DA_GAN`): CHƯA rà. Cả bộ 209 pass/0 fail/0 skip.
  Báo cáo `task-13f-report.md`, ảnh `output/look/t13f/sheet.jpg`, diff: `git diff 5a94bd5 7d6f424`.

## Còn lại (theo thứ tự)
1. Rà 13f và 13e (2 reviewer Sonnet song song). Reviewer 13f phán luôn I1/I2 của 13c + 13d (tầng sau có THẤY ở 2 góc mẫu không — xem ảnh t13f) → ghi
   `Task 13c/13d/13e/13f: complete` hoặc vòng sửa env (≤ 4 env/agent). Song song: giao **Task 15** (`tools/mau-duyet.mjs`, brief `task-15-brief.md`; dùng `GOC_MAU`).
2. Kết giai đoạn 3: ghi `"L8": {"vatMoiTangMin": 0}` vào `episodes/ep001/quy-trinh.json` (ruling: thước mới làm ep001 đỏ L8 94 shot vì tangXa tắt);
   `node --test tools/tests/*.test.mjs` xanh; chạy lại `kiem-luat` ep001; chụp chuẩn `refs/sau-gd3` (`look.mjs --shots all --pose`); `npm run bundle:ep001`; link `dist/ep001.html`.
3. Đợt 7: Task 17 (ra-loi + sua.mjs; ruling L12 không tự sửa, cờ `--thu`, không ghi lên ep001) → Task 19 (lam-phim + skill + danh sách giọng).
4. Task 20 a–d (thay lõi từng cái, A/B, ô FX mặc định TẮT). 5. Rà cả nhánh (Opus) + gộp mọi dòng "minor (deferred)" trong sổ. 6. Mục 11b.3 spec: cập nhật `CLAUDE.md`.
7. Task 21: báo cáo tổng + commit, rồi ep002 theo kịch bản người dùng (xem mục Quyền).

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
