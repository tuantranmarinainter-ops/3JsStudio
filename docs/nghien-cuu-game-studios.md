# Nghiên cứu repo "Claude Code Game Studios" để cải tiến 3JS Studio

Ngày viết: 2026-11-14. Đây là báo cáo NGHIÊN CỨU: chưa sửa gì trong xưởng. Bạn chọn dòng nào trong bảng "nên áp dụng" thì mới làm.

Nguồn: https://github.com/donchitos/claude-code-game-studios (bản 1.3.0, tải về đọc, không chạy bất cứ thứ gì của nó).
Mọi đường dẫn viết kiểu `.claude/...` ở cột "lấy ý từ đâu" là đường dẫn TRONG repo đó.

## 1. Repo kia là gì

Một bộ khung (template) biến Claude Code thành "xưởng làm game": 49 vai agent (giám đốc sáng tạo, giám đốc kỹ thuật, nhà sản xuất,
trưởng nhóm, chuyên viên Godot/Unity/Unreal…), 72 skill dạng lệnh (`/start`, `/gate-check`, `/story-done`, `/next-step`…), 18 hook,
54 script bash, 14 file quy tắc theo đường dẫn, khoảng 60 mẫu tài liệu. Nó không chứa game nào; người dùng chép về rồi làm game của mình.

Độ tin cậy:

| Chỉ số | Giá trị (lấy ngày 2026-11-14) |
|---|---|
| Sao / fork | 39.023 / 5.074 |
| Issue + PR đang mở | 95 |
| Tạo repo / lần đẩy gần nhất | 2026-02-12 / 2026-11-09 (bản 1.3.0) |
| Giấy phép | MIT |
| Nhịp phát hành | 5 bản trong 7 tuần gần nhất (1.1.1 → 1.3.0) |

Nhiều sao cho biết nó nổi tiếng, không cho biết nó tiết kiệm. Bằng chứng tốt hơn là `CHANGELOG.md`: các bản sửa lỗi rất cụ thể
(skill dài bị mất bước sau khi compact, hook hỏng âm thầm trên Windows, 66/74 skill hỏng ở bản 1.1.0), tức là có người dùng thật và tác giả có sửa.

### Điểm mạnh thật (có cơ chế chạy được, đã mở file kiểm)

| Điểm mạnh | Bằng chứng |
|---|---|
| File trạng thái phiên chia 2 vùng: "điểm dừng" ≤ 25 dòng luôn GHI ĐÈ, và phần kể dài bên dưới; hook mở phiên tự in vùng điểm dừng, cảnh báo nếu sai nhánh git | `.claude/docs/templates/session-state.md`, `.claude/hooks/session-start.sh`, `.claude/scripts/rotate-session-state.sh` (ghi rõ file cũ từng phình tới 712 dòng / 44 KB) |
| Kết quả kiểm có thêm giá trị "CHƯA KIỂM ĐƯỢC" (NOT ASSESSED), xếp trên "đạt", dưới "lỗi": không kiểm được thì không được coi là đạt | `.claude/rules/skill-authoring.md`, `.claude/skills/gate-check/references/5-verdict.md` dòng 38–62 |
| Hợp đồng trả kết quả cho agent phụ: ghi đầy đủ ra file, chỉ trả về đường dẫn + tối đa 5 gạch đầu dòng; agent chính kiểm file có trên đĩa trước khi tin báo cáo | `.claude/skills/team-polish/SKILL.md` dòng 92, `.claude/docs/error-recovery-protocol.md` dòng 9–14 ("Trigger 0") |
| Hook chặn đọc trọn file tài liệu > 40 KB, trả lại mục lục kèm số dòng để đọc đúng đoạn | `.claude/hooks/validate-read.sh` dòng 95–109 |
| Skill dài tách thành file theo bước, mỗi bước ghi "đọc lại file này nếu vừa compact" | `.claude/skills/gate-check/SKILL.md` dòng 117–129; lý do ở `CHANGELOG.md` dòng 574 (Claude Code chỉ gắn lại phần đầu skill sau compact) |
| Một núm "mức kỹ" (`modes.rigor`: minimal / standard / full) quyết định 6 thứ cùng lúc: số cổng duyệt, độ dài tài liệu, mức kiểm thử…; mặc định là mức nhẹ nhất | `.claude/docs/config-resolution.md` dòng 167–190, `.claude/docs/director-gates.md` |
| Script tất định thay cho việc để AI đọc file rồi phán ("script chỉ quan sát, không kết luận") | `.claude/scripts/artifact-check.sh`, `.claude/scripts/review-receipts.sh` (bỏ qua duyệt lại file có mã băm không đổi) |
| Danh sách cấm lệnh nguy hiểm (xoá đệ quy, `git reset --hard`, `git push --force`, `git clean`, đọc `.env`) | `.claude/settings.json` từ dòng 45 |
| Quy tắc chỉ nạp khi đụng đúng loại file (frontmatter `paths:`) | `.claude/rules/*.md` |
| CLAUDE.md gốc rất nhỏ (3,4 KB), tài liệu lớn chỉ đọc khi cần | `CLAUDE.md` mục "Context Management" |

### Điểm chỉ là hình thức

| Hình thức | Bằng chứng |
|---|---|
| 49 agent phần lớn là văn mô tả chức danh; các khối "Collaboration Protocol", "Collaborative Mindset" bị chép lại trong 30–49 file; tổng 458 KB | `.claude/agents/*.md` |
| "Phân cấp 3 tầng, không được giao việc vượt cấp" chỉ là lời văn, không có gì chặn | `.claude/docs/coordination-rules.md` quy tắc 1–5 |
| "Chia tầng model" yếu: 30/49 agent để `inherit` (dùng model của phiên), chỉ 3 agent ghi `opus`; chính tài liệu thừa nhận ghi `haiku` cho skill không tiết kiệm gì ở chế độ auto | `.claude/docs/model-tiers.md` dòng 13–24 |
| Đa số hook chỉ in lời khuyên; chỉ 2 hook thật sự chặn (đọc file lớn, commit JSON hỏng) | `.claude/hooks/validate-push.sh`, `validate-write.sh`, `validate-agent-artifact.sh` |
| "Bộ test" 130 file là văn bản để chính AI đọc và tự chấm; không có CI; skill kiểm thử tự ghi "không cái nào chạy skill thật" | `studio-tests/`, `.github/` (không có `workflows/`), `.claude/skills/skill-test/SKILL.md` dòng 30–38 |
| Cảnh báo ngân sách token được mô tả nhưng chưa làm | `.claude/docs/effects-map.md` dòng 2194–2196 ("RESERVED - NOT IMPLEMENTED") |
| Rất nặng chữ: mọi `SKILL.md` cộng lại 1,07 MB, hướng dẫn quy trình 1.891 dòng | `.claude/skills/`, `docs/WORKFLOW-GUIDE.md` |
| Không có quy ước cho nhiều phiên cùng một thư mục làm việc (chỉ có cảnh báo sai nhánh) | `.claude/docs/coordination-rules.md`, `.claude/docs/agent-teams.md` |

## 2. So sánh theo từng khía cạnh

| Khía cạnh | Repo kia | 3JS Studio hiện giờ | Ai hơn |
|---|---|---|---|
| Vai / agent | 49 vai có tên, 3 tầng, lời văn dài | Không đặt vai; phiên điều phối + phiên con + agent phụ, chia theo FILE sở hữu (`CLAUDE.md` mục "Agent phụ") | 3JS (nhẹ, đúng việc) |
| Skill và lệnh | 72 skill, nhiều skill 20–30 KB, có tách file theo bước | 15 skill, 1,5–13 KB, gọi công cụ thật trong `tools/` | 3JS về độ gọn; kia hơn ở tách bước cho skill dài |
| Hook, hàng rào | 15 hook nối vào 8 loại sự kiện; 2 cái chặn thật; danh sách cấm ~130 dòng | 1 hook (`session_guard.py`) đo token thật và nhắc; không có danh sách cấm, không hook mở phiên | Kia hơn về số hàng rào; 3JS hơn về đo token |
| Quy tắc theo đường dẫn | 14 file `paths:` | Không có; mọi luật nằm trong `CLAUDE.md` 13 KB, nạp cho mọi phiên và mọi agent phụ | Kia |
| Mẫu tài liệu | ~60 mẫu (đa số riêng cho game); mẫu trạng thái phiên rất chặt | Mẫu đề bài Codex, đặc tả `bang-shot.json` / `kit.json` có bộ kiểm; handoff viết tự do, không có mẫu | Hoà: kia hơn ở mẫu trạng thái, 3JS hơn ở mẫu có máy kiểm |
| Cổng duyệt | Hỏi trước MỖI lần ghi file ("May I write…"), tối đa 28 cổng giám đốc; giảm bằng núm mức kỹ | Ít cổng, đặt đúng chỗ đắt (MỐC 1b, MỐC 2, trang duyệt asset chọn nhiều một lần); có `--nhap` | 3JS; kia có ý hay là MỘT núm chỉnh |
| Trạng thái / tiến độ | `active.md` + hook tự nạp; không có trang cho người xem | `docs/tien-do.json` → trang HTML + artifact xem trên điện thoại; `lam-phim.mjs trang-thai`; nhưng `HANDOFF.md` viết tay dễ cũ | 3JS về tiến độ; kia về điểm dừng phiên |
| Kiểm thử | Văn bản để AI tự chấm, không CI | 51 file test chạy bằng máy (`npm test`), `look.mjs` so bằng số, `kiem-luat`, `--det` | 3JS rõ ràng |
| Tiết kiệm token | Chặn đọc file lớn, đọc khi cần, hợp đồng trả kết quả ngắn; không đo | Đo thật (ngữ cảnh, token agent phụ), trần 3 agent, Haiku cho việc đọc, ảnh không vào phiên | 3JS về đo và kỷ luật; kia có 2 cơ chế đáng lấy |
| Nhiều phiên một checkout | Gần như không có | Quy ước sở hữu file, `git commit <file>`; vẫn hay đụng nhau (vd file đã `git add` của phiên khác) | Cả hai đều yếu |

## 3. Nên áp dụng (xếp theo lợi ích / công; ★ = nên làm trước)

| # | Cải tiến cho 3JS Studio | Lấy ý từ đâu | Sửa file nào bên mình | Công | Lợi ích kỳ vọng | Rủi ro |
|---|---|---|---|---|---|---|
| 1 ★ | **Hợp đồng trả kết quả cho agent phụ và Codex**: mỗi đề bài kết bằng "ghi đầy đủ vào `output/<việc>/bao-cao.md`; chỉ trả về đường dẫn + tối đa 5 gạch đầu dòng + mục bị chặn". Agent chính kiểm file có trên đĩa TRƯỚC khi đọc báo cáo | `.claude/skills/team-polish/SKILL.md:92`, `.claude/docs/error-recovery-protocol.md:9` | `CLAUDE.md` mục "Agent phụ"; `.claude/skills/lam-phim/SKILL.md` mục "Quy tắc agent"; `docs/de-bai-codex-mau.md` mục 3 | Nhỏ | Token: báo cáo agent về phiên chính ngắn hẳn (trong lần nghiên cứu này mỗi báo cáo ~1.000 chữ). Ít lỗi: không tin báo cáo khi file không có | Báo cáo quá ngắn làm mất chi tiết → phải mở file; thêm file trong `output/` (đã có `tools/don.mjs` dọn) |
| 2 ★ | **Khối "điểm dừng" cố định ở đầu `HANDOFF.md`** (≤ 25 dòng, luôn ghi đè): cập nhật lúc nào, nhánh, đang làm gì, bước kế tiếp, đang chờ ai, file đang dở, agent/tiến trình nền đang chạy. Phần kể dài để bên dưới hoặc trong `docs/handoff/`. Thêm mẫu chung cho phiên con | `.claude/docs/templates/session-state.md` | `HANDOFF.md`; file mới `docs/handoff/_mau.md`; một dòng trong `CLAUDE.md` mục "Cấu trúc thư mục" | Nhỏ | Ít lỗi + token: `HANDOFF.md` hiện có 2 chỗ nói ngược nhau (dòng 3 "Không còn agent nào chạy", mục "Đang chạy" vẫn ghi một agent Sonnet). Phiên mới đọc 25 dòng là làm tiếp được | Thêm kỷ luật ghi; nếu không có hook (dòng 5) thì vẫn có thể quên cập nhật |
| 3 ★ | **Danh sách cấm lệnh phá checkout dùng chung**: `git stash`, `git reset --hard`, `git checkout -- .`, `git clean`, `git push --force`, đổi nhánh, xoá đệ quy, đọc `.env.local` | `.claude/settings.json` (khối `deny`) | `.claude/settings.json` của repo (khối `permissions.deny`) | Nhỏ | Ít lỗi: nhiều phiên con cùng `S:\3JS Studio`, một lệnh stash/reset của phiên này xoá việc dở của phiên khác. Hiện chỉ cấm bằng lời | Chặn nhầm lúc bạn thật sự cần (khi đó tự gõ tay trong terminal); phải thử cú pháp mẫu lệnh trên Windows |
| 4 ★ | **Kết quả "CHƯA KIỂM ĐƯỢC" trong các bộ kiểm**: tách "đã kiểm, đạt" khỏi "không kiểm được" (thiếu ảnh chuẩn, trang không mở, thiếu file hình, bỏ qua bước). Không kiểm được thì KHÔNG in "OK", và phải ghi tên thứ bị bỏ qua | `.claude/rules/skill-authoring.md` (5 nghĩa vụ), `.claude/skills/gate-check/references/5-verdict.md:38-62` | `tools/look.mjs` (`--pose-ref`, `--ref`), `tools/kiem-luat.mjs`, `tools/kiem-kit.mjs`, `tools/doctor.mjs`, `tools/lam-phim.mjs` (thêm trường `chuaKiem[]` vào JSON); skill `kiem-tra-khung` | Vừa (trước hết cần rà từng công cụ xem chỗ nào đang im lặng bỏ qua — chưa rà) | Chất lượng + rút ngắn vòng sửa–duyệt: lỗi kiểu "số báo OK nhưng thật ra không so được" không lọt tới bạn | Thêm trạng thái thứ ba làm báo cáo dài hơn; có thể dừng dây chuyền nhiều hơn lúc đầu |
| 5 ★ | **Hook mở phiên tự nạp khối điểm dừng** (sau `/compact`, `/clear`, mở lại): in khối ở dòng 2, cảnh báo nếu nhánh git khác nhánh ghi trong khối. Làm bằng Python như `session_guard.py`, không dùng bash | `.claude/hooks/session-start.sh`, `.claude/settings.json` (sự kiện `SessionStart`) | File mới `tools/hooks/mo-phien.py`; `.claude/settings.json` của repo | Nhỏ–vừa (cần làm dòng 2 trước) | Token + ít lỗi: phiên điều phối chỉ dùng `/compact`; sau compact có ngay việc đang dở mà không phải đọc lại nhiều file | Tốn ~300 token mỗi lần mở phiên, kể cả phiên con (có thể chỉ in khi là phiên ở gốc repo); hook lỗi phải im lặng thoát 0 |
| 6 | **Tách skill dài thành file theo bước** + câu "đọc lại nếu vừa compact". Bảng "Chuẩn ep001" chỉ đọc khi tới bước mẫu duyệt / gộp | `.claude/skills/gate-check/SKILL.md:117-129`, `CHANGELOG.md:574` | `.claude/skills/lam-phim/SKILL.md` (12,9 KB) → `references/`; `.claude/skills/viet-kich-ban/SKILL.md` (7,7 KB) | Nhỏ–vừa | Ít lỗi: sau compact giữa dây chuyền không mất các bước cuối (rà lỗi sau giọng thật, giao sản phẩm). Token: không nạp cả 13 KB khi chỉ hỏi "đến đâu rồi" | Thêm một lượt đọc file mỗi bước; skill của mình còn ngắn nên lợi ích nhỏ hơn bên kia |
| 7 | **Hook chặn đọc trọn file lớn**: `dist/*.html`, `docs/tien-do.json` (30 KB), file JSON lớn trong `output/` và `kich-ban/`; trả lại gợi ý (dùng Grep, đọc theo đoạn, hoặc chạy tool tóm tắt) | `.claude/hooks/validate-read.sh:95-109` | File mới `tools/hooks/chan-doc.py`; `.claude/settings.json` (sự kiện `PreToolUse`, công cụ `Read`) | Vừa | Token: chặn đúng loại tai nạn đắt nhất (đọc nhầm một bản gộp HTML vài MB) cho cả phiên con và agent phụ | Chặn nhầm khi cần đọc thật; cần danh sách đường dẫn + ngưỡng chỉnh được và có cách tắt |
| 8 | **Quy tắc theo đường dẫn**: chuyển khỏi `CLAUDE.md` những phần chỉ cần khi sửa đúng loại file: luật camera + hệ thống shot → áp cho `episodes/*/shots.js`; quy tắc kỹ thuật (hàm thuần của `t`) → `engine/**`; asset → `assets/**`, `tools/nhap-model.mjs` | `.claude/rules/*.md` (frontmatter `paths:`) | `CLAUDE.md` (rút gọn); thư mục mới `.claude/rules/` (`shot.md`, `engine.md`, `asset.md`) | Vừa | Token: `CLAUDE.md` 13 KB được nạp cho mọi phiên và mọi agent phụ, kể cả việc không đụng shot (như lần nghiên cứu này); ước giảm 30–40% | Quy tắc chỉ nạp khi agent ĐỌC file khớp: lúc lên kế hoạch shot mà chưa mở `shots.js` sẽ không thấy luật camera → giữ một dòng tóm tắt trong `CLAUDE.md` |
| 9 | **Lệnh "việc kế tiếp" bằng script**: một lệnh gom `docs/tien-do.json`, `lam-phim.mjs trang-thai`, khối điểm dừng, `git status` theo phiên → in "Đã xong / Kế tiếp / Đang chờ bạn" trong ~20 dòng | `.claude/skills/next-step/`, `.claude/scripts/artifact-check.sh`, `.claude/skills/help/SKILL.md` (chỉ 710 byte vì gọi script) | File mới `tools/tiep-theo.mjs`; một dòng trong bảng công cụ của `CLAUDE.md` | Vừa | Token + tốc độ: câu "đến đâu rồi / làm gì tiếp" của phiên điều phối trả lời bằng 1 lệnh thay vì đọc 3–4 file | Trùng một phần với trang tiến độ; thêm một nguồn phải giữ khớp |
| 10 | **Một núm "mức kỹ" cho mỗi tập** (`nhap` / `thuong` / `ky`) quyết định cùng lúc: số vòng rà lỗi, có giao agent soi ảnh không, cổng nào bắt buộc | `.claude/docs/config-resolution.md:167-190`, `.claude/docs/director-gates.md` | `tools/kiem/mac-dinh.json`, `episodes/<ep>/quy-trinh.json`, `tools/lam-phim.mjs`, skill `lam-phim` | Vừa–lớn | Tốc độ: bản xem thử đi nhanh, ít cổng; bản chốt mới kiểm đủ. Thay cho các cờ rời (`--nhap`, `chapNhanNhap`, `vongMax`) | Sửa lõi `lam-phim.mjs` đang chạy ổn; mức `nhap` dễ bị dùng luôn cho bản chốt |
| 11 | **Biên nhận kiểm theo từng shot**: lưu mã băm dòng shot + file bối cảnh liên quan; lần sau chỉ chụp / soi lại shot có mã băm đổi | `.claude/scripts/review-receipts.sh` | `tools/ra-loi.mjs`, `tools/kiem-luat.mjs`, `tools/look.mjs` (hiện nhớ theo mã băm cả file `shots.js`) | Vừa | Tốc độ + token: sửa 3 shot không phải kiểm lại 140 shot | Shot phụ thuộc nhau qua `timeline.js` (vị trí nối tiếp) → băm riêng từng dòng có thể bỏ sót; cần băm cả shot đứng trước |
| 12 | **Worktree cho phiên con chỉ sửa code / công cụ** + file `.worktreeinclude` để chép `.env.local` sang | `.worktreeinclude`, `.claude/agents/prototyper.md` (`isolation: worktree`) | File mới `.worktreeinclude`; ghi chú trong bộ nhớ "điều phối giao phiên con" | Vừa | Ít lỗi: hết cảnh hai phiên sửa chung `assets/manifest.json`, `engine/cast.js` | Worktree không có `node_modules/`, `.cache/`, `dist/`, `output/` và asset ngoài git → phiên dựng hình không chạy được ở đó; phải gộp nhánh về sau |

Thứ tự gợi ý: 1 → 2 → 3 (ba việc nhỏ, làm trong một phiên con), rồi 5 (cần 2), rồi 4 (cần rà công cụ trước).

## 4. Không nên áp dụng

| Thứ của repo kia | Vì sao không |
|---|---|
| 49 agent có chức danh, phân cấp 3 tầng (`.claude/agents/`, `.claude/docs/agent-roster.md`) | Quá nặng cho xưởng một người; phần lớn là lời văn lặp lại, không có cơ chế ép; mỗi vai được gọi là thêm một lượt đọc ngữ cảnh. Cách chia theo file sở hữu của mình rẻ hơn |
| Hỏi "cho tôi ghi file này nhé?" trước mỗi lần ghi (`CLAUDE.md` mục "Collaboration Protocol") | Đi ngược mục tiêu "ít phải duyệt, ra video nhanh"; bạn đã chốt "bước nhỏ thì tự làm" |
| 28 cổng giám đốc duyệt (`.claude/docs/director-gates.md`) | Mỗi cổng là một agent Opus/Sonnet chạy thêm. Mình đã có cổng đúng chỗ đắt (MỐC 1b, MỐC 2, trang duyệt asset) |
| Bộ "test" bằng văn bản để AI tự chấm (`studio-tests/`, `/skill-test`) | Tốn token mà không chứng minh được gì; mình có test chạy bằng máy |
| Hệ epic / story / sprint / ADR (`/create-epics`, `/sprint-plan`, `/architecture-decision`…) | Dành cho dự án phần mềm nhiều tháng; một tập phim của mình là dữ liệu shot + dây chuyền 8 bước, `docs/tien-do.json` đã đủ |
| Hook viết bằng bash kèm `yaml-helper.sh` 105 KB, lệnh lai PowerShell/bash (`.claude/hooks/`, `.claude/settings.json:185`) | Phụ thuộc Git Bash, chính họ từng hỏng âm thầm trên Windows. Lấy Ý TƯỞNG, viết lại bằng Python / Node như `session_guard.py` |
| Thanh trạng thái hiện % ngữ cảnh (`.claude/statusline.sh`) | Là tính năng của bản dòng lệnh; bạn dùng ứng dụng desktop, và `session_guard.py` đã đo ngữ cảnh |
| Ghi nhật ký mỗi lần gọi agent phụ (`.claude/hooks/log-agent.sh`, `log-agent-stop.sh`) | Trùng: `session_guard.py` đã cộng TOKEN thật của agent phụ, chính xác hơn đếm số lần gọi |
| Không dùng Haiku cho agent (`.claude/docs/model-tiers.md`) | Mình dùng Haiku cho đọc / tìm là đúng và rẻ; chỉ dây chuyền `lam-phim` mới cấm Haiku |
| Tự kiểm bản mới trên GitHub mỗi lần mở phiên (`.claude/hooks/update-check.sh`) | Không liên quan; thêm một lệnh gọi mạng mỗi phiên |
| Chép cả bộ ~60 mẫu tài liệu (`.claude/docs/templates/`) | Gần hết là tài liệu game (GDD, kinh tế, màn chơi…); chỉ mẫu trạng thái phiên đáng lấy (dòng 2) |
| "Agent Teams" nhiều phiên chung danh sách việc (`.claude/docs/agent-teams.md`) | Chính họ ghi là thử nghiệm, tốn kém, chưa có kinh nghiệm dùng |

## 5. Những thứ 3JS Studio đang làm TỐT HƠN (đừng đổi nhầm)

- **Kiểm bằng máy, không bằng lời**: `tools/look.mjs` so bằng số trước rồi mới mở ảnh, `--det` kiểm tất định, `kiem-luat`, 51 file test trong `tools/tests/`
  chạy không cần AI. Repo kia không có CI và tự nhận test của họ không chạy skill thật.
- **Đo token thật**: `session_guard.py` đọc transcript, cộng token agent phụ, nhắc phiên dài / câu ngắn / việc lặp lại. Bên kia cảnh báo ngân sách vẫn ghi "chưa làm".
- **Dây chuyền là công cụ, không phải lời dặn**: `tools/lam-phim.mjs` trả JSON (`canAgent`, `canNguoiDung`, mã thoát 0/1/2), chạy lại theo mã băm đầu vào,
  không gọi AI. Bên kia quy trình nằm trong hàng trăm KB văn bản skill mà AI phải đọc.
- **Trần chi phí rõ**: tối đa 3 agent, Haiku cho đọc, Sonnet cho viết, Opus chỉ cho việc khó; có quy tắc "tiêu chí đạt / điểm dừng". Bên kia không có trần.
- **Cổng duyệt bằng trang chọn**: trang duyệt asset (10 ứng viên, chọn nhiều một lần), bảng mẫu `00_mau.jpg`, góp ý vẽ trên khung hình. Bên kia là hỏi–đáp bằng chữ từng câu.
- **Trang tiến độ cho người xem** (`docs/tien-do.json` → HTML + artifact trên điện thoại). Bên kia chỉ có file trạng thái cho AI đọc.
- **Chia việc theo file sở hữu và theo LỚP** (`LAYERS.md`, `tools/build.mjs <ep> <lớp>`, `tools/lock.mjs` chứng minh lớp khác không đổi). Bên kia chỉ nói "không sửa ngoài thư mục của mình".
- **Ảnh không vào phiên chính** (quy tắc 7): bên kia không có gì tương tự.
- **Skill ngắn** (đa số 2–4 KB) so với 20–30 KB bên kia.
- **Giao Codex vẽ song song theo cụm, mỗi tiến trình một file riêng** (`docs/de-bai-codex-mau.md`): đã có quy ước chống ghi đè mà bên kia không có.

## 6. Chưa kiểm

- Mọi nhận định về lợi ích (token, tốc độ, ít lỗi) là **suy luận từ đọc tài liệu và mã**, chưa thử trên xưởng. Các con số "30–40%", "~300 token" là ước lượng.
- **Chưa chạy** hook, script hay skill nào của repo kia; chỉ đọc. Chưa đo token thật khi dùng bộ khung đó.
- Hai agent Sonnet đọc phần lớn repo kia; tôi đã mở lại file để kiểm các điểm dùng trong bảng (số model của agent, ngưỡng 40 KB, mẫu trạng thái phiên,
  "Trigger 0", NOT ASSESSED, câu hợp đồng trả kết quả, câu "đọc lại nếu compact", mặc định mức `minimal`, cảnh báo token chưa làm, không có CI).
  Chưa tự kiểm: số agent có `memory: project`, chi tiết 54 script, nội dung đầy đủ `session-start.sh`.
- Dòng 4 (CHƯA KIỂM ĐƯỢC): **chưa rà** từng công cụ của mình xem chỗ nào đang im lặng bỏ qua; có thể một số đã làm đúng.
- Dòng 3, 5, 7, 8: chưa thử cú pháp `permissions.deny`, hook `SessionStart` / `PreToolUse`, và `.claude/rules/` với `paths:` trên ứng dụng desktop Windows của bạn.
- Dòng 12: chưa thử worktree với repo này (asset lớn, thư mục ngoài git).
- Con số "95 issue" của GitHub gộp cả issue và PR đang mở; chưa đọc nội dung các issue.
- Chưa cập nhật `docs/tien-do.json` vì phiên này chỉ được tạo đúng một file.
