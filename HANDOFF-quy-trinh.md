# HANDOFF — quy trình "một câu luật → phim HTML" (cập nhật 2026-11-12, cuối phiên 2)

Đọc `CLAUDE.md` trước. `HANDOFF.md`, `HANDOFF-canh.md`, `HANDOFF-gop-y.md`, `HANDOFF-ga.md` là của việc khác — không đụng.

## Mục tiêu
Dây chuyền: câu luật → 5 kịch bản mẫu → kịch bản đầy đủ → "tiến hành" → `dist/<ep>.html`, sửa tay < 10 lần.
- Thiết kế: `docs/superpowers/specs/2026-11-12-quy-trinh-mot-cau-luat-ra-phim-design.md`
- Kế hoạch 21 task: `docs/superpowers/plans/2026-11-12-quy-trinh-mot-cau-luat-ra-phim.md`
- **Sổ tiến độ (đọc đầu tiên, từ dòng "PHIÊN MỚI 2026-11-12" trở xuống; mọi `Ruling:` nằm ở đó):**
  `.superpowers/sdd/2026-11-12-quy-trinh-mot-cau-luat-ra-phim/progress.md` (gitignore; cùng thư mục có brief/report/diff từng task).

## Quyền người dùng đã cho (2026-11-12)
- **Tự ghi handoff + chuyển phiên khi phiên dài, không hỏi**, để chạy xuyên đêm. LƯU Ý: app chỉ cho `start_session` trong lượt do
  NGƯỜI DÙNG nhắn; lượt do thông báo nền kích hoạt thì bị từ chối → khi đó cứ làm tiếp trong phiên, cập nhật file này ở mỗi mốc.
- KHÔNG gồm: push, merge, câu luật ep002, ngưỡng L1, skybox chưa rõ giấy phép, duyệt đổi hình ep001.
- Không dùng Haiku; Sonnet cho code + rà soát; Opus chỉ thiết kế khó; ≤ 3 agent cùng lúc (TÍNH CẢ agent phiên cũ còn chạy), mỗi agent file riêng.

## Đã xong, đã rà sạch, đã commit (nhánh `ep1-v2`, CHƯA push)
Task 1–12, 18 · Task 13a (lõi tầng / giờ-thời tiết / công thức) · Task 13b (sea, ocean, storm, shipStorm) · sửa test `houseFull`
(`HOUSE.hd` 21→36 do cầu thang của `bc0076e`; chưa có reviewer riêng → đưa vào rà cả nhánh).
Cả bộ test lần chạy gần nhất của controller: 183 test, 170 đạt, 12 skip, 1 lỗi (houseFull — đã sửa sau đó, chưa chạy lại cả bộ).

## Đang chạy lúc viết file này (agent của PHIÊN 2, báo cáo về phiên 2)
Task 13c (`iceSea reef island hawaii`), 13d (`forest brazil sahara mountain`), 13e (`kitchen bedroom antarctica snowNight`).
Phiên 2 sẽ CHỈ commit file của từng agent và ghi một dòng `Task 13x: implementer … commit <hash>, CHƯA review` vào sổ.
Báo cáo: `task-13c-report.md`, `task-13d-report.md`, `task-13e-report.md` (thư mục sổ).

## Còn lại (theo thứ tự)
1. Chờ sổ có đủ 3 dòng commit của 13c/13d/13e (trong lúc chờ KHÔNG giao implementer mới; làm việc 2 và 3 bên dưới).
   Rồi rà soát từng cái (diff theo commit), vòng sửa nếu cần, thêm tên env vào `DA_GAN` trong `tools/tests/boi-canh.test.mjs`.
   13e: nếu agent báo 2 góc mặc định không hợp nội thất → controller quyết góc riêng cho env nội thất.
2. Ghép ảnh lưới trước/sau cho người dùng duyệt Task 10 (s028, s030, s106, s049; nguồn `output/look/t10-truoc` vs `t10-sau`, ~800px, lưu `output/ep001/duyet/`).
3. Theo kế hoạch ("trước Đợt 4 agent chính rà lại Task 9–17 theo `docs/kiem-luat-hieu-chinh.md`"): đọc brief Task 14–17, ghi ruling nếu lệch thực tế
   (đã biết: loại shot nằm ở `shotType`; `pose` là mảng + `animTheoPose`; cột `lookAt` CHƯA có trong kịch bản; vai mới `vat-phu`; `time/weather` ở shot + `EPISODE`).
4. Kết giai đoạn 3: `node --test tools/tests/*.test.mjs` xanh; chạy lại `kiem-luat` ep001; chụp chuẩn mới `refs/sau-gd3`; `npm run bundle:ep001`; đưa link `dist/ep001.html`.
5. **Đợt 6:** Task 14 asset-plan, 15 mau-duyet, 16 shot-gen → **Đợt 7:** Task 17 ra-loi → Task 19 lam-phim + skill `lam-phim`.
6. Task 20 thay lõi từng cái (A/B, mặc định tắt). 7. Rà cả nhánh (Opus) + gộp "minor (deferred)" trong sổ (kể cả đổi nhãn ô `tangXa` → "Tầng bổ sung").
8. Task 21 ep002 — cần người dùng đưa câu luật. 9. Mục 11b.3 spec: cập nhật `CLAUDE.md`.

## Cảnh báo quan trọng
- **Nhiều phiên khác commit vào CÙNG checkout** (sửa góp ý ep001, ep001-sky-storm: L12 trong `tools/kiem/luat.mjs`, nhép miệng trong `engine/shots.js`,
  ô mới trong `post.js`; dựng nhân vật Gà). Trước mỗi lần giao agent/commit: `git status` + `git log -5`. Chỉ `git add` đúng file của task.
  `engine/r15.js` và `episodes/ep001/episode.js` đang có sửa dở KHÔNG rõ chủ — không commit hộ.
- "Không đổi hình ep001" kiểm bằng A/B: chụp trước khi sửa rồi so (theo shot dùng file đó), hoặc bản sao `engine/` (cách Task 10 vòng 2). `refs/truoc-gd3` đã cũ.
- Implementer KHÔNG commit; controller commit. Mỗi agent thư mục tạm riêng; dặn: không Monitor chờ nền, không `taskkill node.exe` của người khác,
  KHÔNG đặt chú thích `//` phía trước một lệnh trên cùng dòng (đã nuốt lệnh 3 lần).
- `node --test tools/tests/*.test.mjs` (dạng thư mục lỗi trên Node 24).
- Xương đuôi cá voi `env_ocean` lệch pose 2–5° giữa các lần chụp (điểm ảnh 0%) — có sẵn, chưa rõ nguyên nhân.

## Chờ người dùng quyết (không tự làm)
- Task 10 đổi hình 56 shot ep001 (kim loại/kính mất grunge; s028 13,6%) + bảng "Đề xuất đổi loại" trong `docs/vat-lieu.md`.
- Sau vòng sửa Task 8: ep001 đỏ thêm 8 shot L1 (s001 s014 s039 s041 s047 s080 s114 s130); kiem-luat ep001 tổng ~39 shot lỗi.
- Bộ luật chỉ bắt ~9% lỗi thật của v1 · L1 lề 5% không khớp phim đã duyệt · 37 shot < 0,8 s · skybox `sky-7`/`sky-9` chưa rõ giấy phép.
- `storm`/`shipStorm` chỉ đủ 3 tầng khi ô `tangXa` bật (ep001 tắt).

Câu dán vào phiên mới: **"Đọc HANDOFF-quy-trinh.md rồi làm tiếp mục còn lại số 1. Chạy liền, không hỏi lại."**
