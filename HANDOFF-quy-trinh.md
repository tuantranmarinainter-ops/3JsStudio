# HANDOFF — quy trình "một câu luật → phim HTML" (cập nhật 2026-11-12, phiên 2)

Đọc `CLAUDE.md` trước. `HANDOFF.md`, `HANDOFF-canh.md`, `HANDOFF-gop-y.md` là của việc ep001 khác — không đụng.

## Mục tiêu
Dây chuyền: câu luật → 5 kịch bản mẫu → kịch bản đầy đủ → "tiến hành" → `dist/<ep>.html`, sửa tay < 10 lần.
- Thiết kế: `docs/superpowers/specs/2026-11-12-quy-trinh-mot-cau-luat-ra-phim-design.md`
- Kế hoạch 21 task: `docs/superpowers/plans/2026-11-12-quy-trinh-mot-cau-luat-ra-phim.md`
- **Sổ tiến độ (đọc đầu tiên, phần từ "PHIÊN MỚI 2026-11-12" trở xuống):**
  `.superpowers/sdd/2026-11-12-quy-trinh-mot-cau-luat-ra-phim/progress.md` (gitignore; cùng thư mục có brief/report/diff từng task).

## Quyền người dùng đã cho (2026-11-12)
- **Tự ghi handoff + tự mở phiên mới khi phiên dài, không hỏi** — để chạy xuyên đêm cho xong mọi task. Khi phiên dài: cập nhật
  file này + sổ, commit, `start_session` (user_asked, fresh) với câu ở cuối file. Giữ nguyên mục này cho phiên sau.
- KHÔNG gồm: push, merge, câu luật ep002, ngưỡng L1, skybox chưa rõ giấy phép — các việc đó chờ người dùng.
- Không dùng Haiku; Sonnet cho code + rà soát; Opus chỉ thiết kế khó; ≤ 3 agent cùng lúc, mỗi agent file riêng.

## Đã xong (nhánh `ep1-v2`, CHƯA push)
Task 1–9, 11, 18 · Task 13a (lõi tầng/giờ-thời tiết/công thức) — đều đã rà sạch. Task 8 vòng sửa 1 xong (`7868264`).
Task 12 (mặt R15 sống): đã commit, **CHƯA rà soát** (`review-task12.diff`, `task-12-report.md`; cần thêm 1 agent Sonnet xem
`output/look/t12-mat/sheet.jpg` và xác nhận bằng chữ 3 chuyển biểu cảm).
Task 13b (4 env biển sea/ocean/storm/shipStorm): đã commit `61a0835`, rà soát trả **Changes requested** (I1, I2 + ruling ở cuối sổ).
Task 10 (vật liệu khai báo): xem dòng cuối sổ — nếu chưa có dòng "Task 10: … commit" thì sửa dở còn trong working tree
(`engine/{materials,props,grunge,house,postcards,measure}.js`, `tools/vat-lieu-doc.mjs`, `docs/vat-lieu.md`, `tools/tests/vat-lieu.test.mjs`,
`episodes/ep001/quy-trinh.json`) + `task-10-report.md`.

## Còn lại (theo thứ tự)
1. **Task 10:** commit (nếu chưa) → rà soát → vòng sửa. Xong mới sửa `engine/measure.js` cho I1 của 13b.
2. **Task 12:** rà soát + xem bảng ảnh; lo ngại: trang tự tạo director phải `director.setTimeline(tl)`.
3. **Task 13b vòng sửa 1** (implementer Sonnet mới): theo ruling trong sổ (measure chỉ đếm tầng trong frustum + far; storm/shipStorm có
   tầng back thấy được sau cờ FX tắt cho ep001; `seaDecor` vào `FX_DEFAULTS`).
4. **Task 13c/d/e** (12 env, 4 env/agent, đọc `docs/boi-canh-tang.md`): biển-B `iceSea reef island hawaii`; đất liền `forest brazil sahara
   mountain`; nội thất+tuyết `kitchen bedroom antarctica snowNight`. Agent env KHÔNG sửa `CHUA_GAN`; controller thêm tên vào `DA_GAN`
   trong `tools/tests/boi-canh.test.mjs` sau mỗi nhóm.
5. **Test đỏ cần xử lý:** `shottypes.test.mjs` houseFull lề 0,02 < 0,05 — nghi `engine/house.js` đổi (phiên góp ý `bc0076e` cầu thang chạm
   đất, hoặc Task 10). Tìm nguyên nhân rồi sửa `HOUSE`/`houseDist` trong `engine/shottypes.js`.
6. Kết giai đoạn 3: cả bộ test xanh; chạy lại `kiem-luat` ep001 (L9 đã bật lại); chụp chuẩn mới `refs/sau-gd3`; `npm run bundle:ep001`; đưa link HTML.
7. **Đợt 6:** Task 14 asset-plan, 15 mau-duyet, 16 shot-gen → **Đợt 7:** Task 17 ra-loi → Task 19 lam-phim + skill.
8. Task 20 thay lõi từng cái (A/B, mặc định tắt; người dùng xem sau). 9. Rà cả nhánh (Opus) + gộp các "minor (deferred)" trong sổ.
10. Task 21 ep002 — cần người dùng đưa câu luật. 11. Mục 11b.3 spec: cập nhật `CLAUDE.md`.

## Cảnh báo quan trọng
- **Phiên khác (sửa góp ý ep001, xem `HANDOFF-gop-y.md`) commit vào CÙNG checkout** (`bc0076e`, `2fbfd47`): đổi hình ep001 có chủ đích và
  sửa `engine/envs/{bedroom,brazil,island,kitchen,reef,town}.js`, `house.js`, `post.js`, `cast.js`… → `refs/truoc-gd3` không còn là chuẩn
  0-lệch. Kiểm "không đổi hình" bằng A/B trên cùng cây mã (file của task lấy từ `git show HEAD:<file>` làm bản "trước"), như Task 12 đã làm.
  Trước khi giao agent env: `git status` + `git log -3`; file đang bị phiên kia sửa dở thì hoãn.
- Implementer KHÔNG commit; controller commit đúng file từng task. Mỗi agent thư mục tạm riêng. Dặn agent không dùng Monitor chờ nền.
- `node --test tools/tests/*.test.mjs` (dạng thư mục lỗi trên Node 24). Lần xanh gần nhất: 144 test, 128 đạt, 16 skip (tại `f9f8afe`).
- Xương đuôi cá voi `env_ocean` lệch pose 2–5° giữa các lần chụp (điểm ảnh 0%) — nghi không tất định sẵn có; `whales.js:130-138` là hàm thuần, chưa rõ nguyên nhân.

## Chờ người dùng quyết (không tự làm)
- Bộ luật chỉ bắt ~9% lỗi thật của v1; sau vòng sửa Task 8 bản cuối ep001 có 18 shot đỏ (L1 thêm s001 s014 s039 s041 s047 s080 s114 s130).
- L1 lề 5% mặc định không khớp phim đã duyệt · ep001 có 37 shot < 0,8 s · skybox `sky-7`/`sky-9` chưa rõ giấy phép.

Câu dán vào phiên mới: **"Đọc HANDOFF-quy-trinh.md rồi làm tiếp mục còn lại số 1. Chạy liền, không hỏi lại."**
