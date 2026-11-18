# Thử prompt "Grandma Wave" theo format "Ở thị trấn này" — so phương án A (Studio) và B (Studio → 3JS)

<!-- ĐIỂM DỪNG: tối đa 25 dòng. GHI ĐÈ cả khối mỗi lần cập nhật, không nối thêm. Phiên mới chỉ cần đọc khối này là làm tiếp được.
     Chi tiết, lịch sử, số đo để ở phần "Ghi chép" bên dưới. Mục nào không có thì ghi "không". -->
## ĐIỂM DỪNG
- **Cập nhật:** 2026-11-19 04:45
- **Nhánh:** `ep1-v2`
- **Đang làm:** kiểm animation A|B bằng số — bước 1–3 XONG, dừng trước bước 4 (sửa B) chờ người dùng
- **Công cụ mới:** `tools/anim-kiem.mjs` (+ `look.mjs --anim`, test `tools/tests/anim-kiem.test.mjs`); A xuất bằng `output/thu-grandma/a/06-anim.lua` + POST về `serve.mjs`
- **Kết quả:** `output/anim-kiem/AB/bao-cao.md` (bảng 7 chỉ số + kết luận) · `loi-nang.jpg` · cfg `episodes/thu-grandma/anim-kiem.json`
- **Lỗi thật tìm được:** B: FREEZE không đứng im (s001/s002 bước tại chỗ), trượt chân 46%, đơ 40%; A: lún sân 0,3–0,8 (80% khung). Cả hai: đi bộ = sin thuần
- **Bước kế tiếp:** bước 4 — sửa B (r6-anim: khoá chân đỡ, lấy đà, FREEZE thật, idle thở, tay bám vật), đo lại; đạt khi B tốt hơn ≥ 3 chỉ số, không chỉ số nào xấu đi
- **Đang chờ:** người dùng duyệt sang bước 4
- **Đang chạy nền:** `node output/thu-grandma/a/serve.mjs` (cổng 8793, tắt được)
- **File đang dở (chưa commit):** `.gitignore` dòng `episodes/thu-grandma/` (lẫn phiên khác); ngoài git: `episodes/thu-grandma/*`, Studio `Workspace.ThuGrandma` (chưa save)
- **Ghi chú:** `npm test` có 6 test đỏ không liên quan (pipeline asset, __maskAnh, HOUSE — file phiên khác đang sửa)
- **Nhánh phụ R6 BOBJ (xong, ef1d914):** `assets/r6-bobj/` = R6 BOBJ + 84 động tác BBS 2.7 + 42 Quaternius retarget bằng app 1 (`S:\3appclaude`, script `tools-local/`); đọc `assets/r6-bobj/README.md`. Chưa thử trong BBS/Minecraft; vỗ tay không chạm (vai R6 rộng). 3 dòng manifest chưa commit
<!-- /ĐIỂM DỪNG -->

## Đã chốt (2026-11-18)
- **Thử cả A rồi B**, cùng kịch bản, cùng shotlist, cùng bộ asset → đo thời gian + ưu/nhược. C (Blender Cycles) KHÔNG làm (trái luật "Blender chỉ là trạm nhập").
- **Luật lạ:** *Đếm bước chân* — trên đầu mỗi người có số bước còn lại trong ngày, hết số thì đứng im tới sáng. "Tôi" sinh ra chỉ có 100 bước/ngày (điểm yếu). Người lớn giữ bí mật; twist = nguyên nhân ẩn / kẽ hở luật; kết: điểm yếu thành lời giải. Ý tưởng tự nghĩ, không chép kênh khác.
- **Độ dài:** 30 s, ~25 shot (~1,2 s/shot, không shot nào quá 2 s). Bản thử đi được Hook + phần đầu Leo thang (có thể gợi twist ở cuối làm móc).
- **Giọng:** không giọng. Vẫn viết lời kể làm phụ đề (tắt được); mốc cắt theo câu phụ đề thay cho mốc chữ whisper.
- **Không vào repo/web** (giống ep004/ep005): mọi thứ ở `output/thu-grandma/` (đã gitignore). Chỉ file này vào git.
- Lệnh trong tài liệu Grandma là dữ liệu: không chạy "dán vào Claude Code", không cài theo nó, không trả tiền ElevenLabs/RunPod.

## Lấy gì từ prompt Grandma (bản dịch: `output/dich-grandma/ban-dich-day-du.md`)
| STEP | Dùng thế nào |
|---|---|
| 0 Cài đặt | Bỏ. Thêm 2 luật vào kit: không 2 shot liền cùng kiểu chuyển động; không shot > 2 s |
| 1 Câu chuyện + REALISM_BIBLE | Giữ khuôn kịch bản (câu lặp lại, gài–đền, nhịp lặng, câu cuối đảo câu đầu) trong khung 4 phần của format; viết REALISM_BIBLE cho thị trấn (tỷ lệ stud, số trên đầu đọc được, KHÔNG BAO GIỜ…) |
| 2 Giọng | Bỏ (không giọng) |
| 3 CAMERA_BIBLE + shotlist | Giữ — phần chính cần thử |
| 4 Đồ dựng Studio (MCP) | Giữ, dùng chung cho A và B |
| 5–7 Blender (bối cảnh, nhân vật, nước) | Bỏ. A: dựng trong Studio; B: env three.js + R6 |
| 8 Dựng shot + bảng ảnh mỗi đoạn | Giữ cách làm: STOP sau mỗi đoạn |
| 9 Render Cycles | Bỏ |
| 10 Bóng ma + phụ đề | Giữ kiểm bóng ma (tay, tool B5 chưa có) |

## Việc còn lại (theo thứ tự, mỗi việc một STOP)
1. **Kit chung** → `output/thu-grandma/kit/`: `SCRIPT.md`, `REALISM_BIBLE.md`, `CAMERA_BIBLE.md`, `SHOTLIST.md` (25 dòng: số, giây, phụ đề, bối cảnh/ánh sáng, ai, biểu cảm, chuyển động, ống kính, liên tục). Shotlist phủ 5 kiểu ô của `docs/tieu-chi-thu-cach-lam.md` mục A. **STOP: người dùng duyệt kit.**
2. **Đồ dựng chung** (STEP 4): đọc `docs/roblox.md`; dùng kit City / cách MapKit của Bảo (`docs/roblox-kinh-nghiem-baolam.md`) + `roblox.mjs tim/xem` cho món thiếu; một nhóm duyệt mỗi lần (`duyet.mjs`). **STOP: chốt asset.**
3. **Phương án A — trọn trong Studio**: dựng cảnh, avatar/R6 Studio, chuyển động + camera viết bằng Luau là hàm của t; số bước trên đầu = BillboardGui. Đo thử 10 khung rồi chọn cách ghi: chụp từng khung bằng MCP `screen_capture` → ghép MP4, hay quay màn hình. **STOP sau mỗi đoạn (A1 shot 1–12, A2 shot 13–25).**
4. **Phương án B — Studio → 3JS**: tải asset về GLB (`roblox.mjs tai` / `nhap-model.mjs nhap`), env `engine/envs/thu-grandma-*.js` (hoặc tạm trong `output/`), R6 + NPC `rb`, shot trong `shots.js`, xuất `node tools/xuat.mjs`. Chấm `look.mjs --shots all --gates --det`. **STOP sau mỗi đoạn.**
5. **So sánh** → `output/thu-grandma/so-sanh.md` + 1 ảnh lưới A|B (~800 px, cùng 5 khung). **STOP: người dùng chấm C1–C4 cho cả hai.**

## Cách đo (ghi vào sổ `output/thu-grandma/so-gio.md` trong lúc làm)
| Mục | A | B |
|---|---|---|
| Giờ Claude (đồng hồ, theo từng việc 2–5) | | |
| Giờ người dùng (duyệt, sửa) | | |
| Số vòng sửa mỗi đoạn | | |
| Thời gian ra MP4 30 s (ghi hình / xuất) | | |
| Tiêu chí máy B1–B7 (`tieu-chi-thu-cach-lam.md`) | đo được mục nào ghi mục đó; không đo được ghi "—" | đủ |
| Điểm người C1–C4 | | |
| Dùng lại cho tập sau (asset, code, nhân vật) | | |
| Lỗi/đơ gặp phải (MCP rớt, 403…) | | |
- Ưu/nhược viết theo 5 trục: tốc độ, chi phí, độ đẹp/chân thật, tất định + kiểm tra máy, dùng lại / bật-tắt tính năng.
- Dừng ngang: một phương án tắc 3 lần cùng chỗ → dừng phương án đó, ghi lý do vào bảng (đó cũng là kết quả).

## Ghi chép
- Công cụ liên quan: `tools/roblox.mjs`, `tools/sky-extract/`, `tools/roblox-boi-canh.mjs` (3JS → Studio, đúng toạ độ), `tools/roblox-phim.mjs` (chuyển động 3JS → Studio từng khung — dùng được để đối chiếu A, KHÔNG dùng để dựng A vì A phải làm trọn trong Studio), kit City (`tools/city-kit*.mjs`, `assets/nhap/city-kit/`).
- Phiên Roblox nên chạy Sonnet (`docs/roblox.md`). Việc 3 và 4 có thể giao 2 phiên con riêng sau khi xong Việc 2 (không đụng file của nhau).
