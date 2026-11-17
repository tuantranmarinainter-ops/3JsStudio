# So sánh ưu / nhược: skill "In This Town" (blocky-shorts) ↔ repo 3JS Studio — bản 17/11

Ngày: 2026-11-17. Báo cáo NGHIÊN CỨU, chưa sửa mã. Nối tiếp `docs/nghien-cuu-skill-in-this-town.md` (14/11) — bản đó có bảng
12 đề xuất; bản này (1) chấm lại xem 3 ngày qua đã học được gì, (2) so ưu/nhược chi tiết theo 15 khía cạnh, (3) đề xuất mới.
Nguồn: `_ In This Town _ Skill Files.rar` (giải nén ra scratchpad, chỉ đọc, không chạy). `B/` = `blocky-shorts/` trong rar.
Repo: https://github.com/tuantranmarinainter-ops/3JsStudio (nhánh `ep1-v2`, bản trên máy).

## 0. Tóm tắt 6 dòng
- Bộ kia = **một skill gọn** làm short hài 20–35 s: 1 file `SKILL.md` 94 dòng + 5 file tham khảo + engine 8 file + 1 `story.json`. Mạnh ở **ngôn ngữ khai báo** (cỡ cảnh, động tác chồng lớp, đồ hoạ bật) và **tự động hoá** (tiếng động sinh từ hình).
- Repo mình = **một xưởng**: 17 skill, ~140 tool, 68 file test, 39 bối cảnh, 3.400 file. Mạnh ở **kiểm bằng máy, quy mô 2–3 phút, sản phẩm HTML xuất MP4 bằng GPU, làm theo lớp**.
- Đã học được ~**5/12** đề xuất cũ (idle sống, cỡ cảnh, chồng lớp, máy blocky, khối xám). Còn **chưa làm 4** (mốc theo chữ, gieo/trả, danh mục tên, tỉ lệ máy cả tập) và **làm dở 3**.
- **Rủi ro lớn nhất hiện giờ:** máy blocky, đồ hoạ bật, phụ đề blocky, tiếng blocky (`engine/blocky/may.js`, `lop-phu.js`, `overlays.js`, `tools/blocky-*.mjs`) **chưa commit** — mất máy là mất; và repo đang có **2 hệ camera song song** (`shottypes` và `cam.bk`).
- Bộ kia **nhẹ token** hơn hẳn: skill chỉ nạp khi dùng. Repo mình nạp `CLAUDE.md` 17 KB (~5–6 nghìn token) ở MỌI lượt.
- Đề xuất ưu tiên: **commit + gộp 2 hệ camera → danh mục tên + lệnh check → máy blocky biết tường → mốc theo chữ → tách CLAUDE.md**.

## 1. Đã học được gì từ báo cáo 14/11

| # | Đề xuất cũ | Trạng thái | Bằng chứng |
|---|---|---|---|
| 1 | Động tác chồng lớp `do:[…]` | ✅ xong, **mặc định tắt** | `engine/blocky/chong.js`, ô `chongLop:false` (`engine/post.js:38`), commit 89c0e03. Chỉ ep003b/ep3B_1 dùng; skill `r6-anim` chưa có mục `do:` |
| 2 | Không ai đứng im (idle sống) | ✅ xong, **mặc định tắt** | `engine/blocky/song.js`, ô `idleSong:false`; câu hỏi "bật mặc định cho tập mới?" vẫn treo (`docs/handoff/blocky-ghep.md`) |
| 3 | Khai máy bằng cỡ cảnh | ✅ xong (2 bản) | `co:` qua `engine/blocky/co-canh.js` (ô `coCanh:true`) **và** `cam.bk.co` qua `engine/blocky/may.js` — hai bảng số khác nhau (`can` 2.8→3.8) |
| 4 | Tỉ lệ kiểu máy cả tập + punch/whip/crash | 🟡 một nửa | Có punch/rung/whip/crash (`may.js`, ô `mayBlocky`, `punchRung`). **Chưa có** luật thống kê cả tập (60% đẩy vào, 1/6 kéo ra…) trong `tools/kiem/luat.mjs` |
| 5 | Khối xám trước | ✅ xong, mở rộng | `tools/khoi-xam.mjs`, Pha 0 trong `scene-env`, luật 8 hướng + chống Codex chép (d51434d, 3a8bfeb) — đã vượt bản gốc |
| 6 | Bảng "người dùng nói → sửa gì" | 🟡 một nửa | `sua-theo-lop/SKILL.md:11` có bảng → LỚP, nhưng chưa xuống tới **tham số** (bộ kia: "chán" → `move` lớn hơn + `punch`) |
| 7 | Điểm đứng có tên | ❌ chưa | 0/39 env trả `spots`; `shottypes.js` không có `spot` |
| 8 | Mốc giờ theo chữ lời kể | ❌ chưa | `engine/timeline.js` không có |
| 9 | Động tác kéo theo mặt + tiếng | 🟡 một nửa | `tools/blocky-tieng.mjs` sinh 200 sự kiện tiếng cho ep003b; mặt chưa tự kéo theo clip |
| 10 | Luật khung kiểm bằng máy | 🟡 một nửa | Có L1–L12 + cổng `tools/gates.json` (đầu cắt, mặt vùng an toàn, xuyên). Chưa có: "không quay gáy", "2 người thấy cả 2 mặt", "không 5 trung cảnh liền" |
| 11 | Gieo 3 câu – trả 3 câu (viết truyện) | ❌ chưa | không có trong `viet-kich-ban`, `tools/kb/lint.py` |
| 12 | Danh mục tên + cảnh báo tên lạ | ❌ chưa | không có `docs/danh-muc*`, không có kiểm tên trong `doctor.mjs` |

## 2. So sánh chi tiết theo 15 khía cạnh

Ký hiệu: **K** = skill kia hơn · **M** = repo mình hơn · **=** = ngang / khác mục đích.

| # | Khía cạnh | Skill blocky-shorts | 3JS Studio | Hơn |
|---|---|---|---|---|
| 1 | **Cách viết skill** | 1 `SKILL.md` 94 dòng làm "bản đồ" 7 bước, mỗi bước trỏ đúng 1 file tham khảo, đọc khi tới bước (nạp dần) | 17 skill 17–106 dòng, chia theo việc; nhưng luật chung dồn vào `CLAUDE.md` 17 KB nạp mỗi lượt; nhiều skill trỏ chéo nhau | **K** về gọn/token; **M** về phủ việc |
| 2 | **Điểm vào cho người mới** | 1 sơ đồ 1 dòng `idea → script → story.json → VO → timing → preview → frames → mix → mp4`, mỗi mũi tên ghi lệnh | Có `lam-phim.mjs` + artifact quy trình, nhưng phải đọc nhiều file mới hiểu đường đi; nhiều di tích (HyperFrames, R15) phải ghi chú "đừng làm theo" | **K** |
| 3 | **Viết truyện** | Công thức hài: luật → kẻ lợi dụng → 3 lần → lệnh cấm → câu chốt; luật phải "vật lý, do việc thường ngày kích hoạt, lợi dụng được, lây được" | Format "Ở thị trấn này" ngôi thứ nhất, 4 phần %, twist = bí mật người lớn, điểm yếu thành lời giải; 3 skill (`viet-kich-ban`, `xu-ly-kich-ban`, `video-sang-kich-ban`) + chấm điểm | **M** về chiều sâu; **K** có tiêu chí chọn luật rất sắc (4 tính chất) |
| 4 | **Dữ liệu phân cảnh** | 1 `story.json` duy nhất: lời kể chia cụm 1–3 chữ có `*nhấn*`, shot gắn vào câu, mốc giờ theo chữ | `shots.js` mỗi shot 1 dòng theo loại shot, `narration.txt` có `@at`, chia lớp, nhiều file theo đoạn | **K** về liên kết lời ↔ hình; **M** về chia việc cho agent |
| 5 | **Animation thân** | 6 dáng nền + 37 động tác một phần, chồng theo trọng số, mờ 0,12 s; không có lấy đà, khoá chân | R6 + bảng nghề fwjelaa (lấy đà, overshoot, trễ tay); đã chép chồng lớp nhưng tắt mặc định | **=** (giờ mình có cả hai, nhưng chưa bật) |
| 6 | **Mặt** | 29 biểu cảm ghép, đổi tức thì, nhép sin giả; động tác tự kéo mặt | 37 mặt + AltiWyre, trộn 0,25 s, đảo mắt, nhép theo giọng thật, đổi mặt giữa shot `mat:[[t,mặt]]` | **M** (chỉ thiếu "động tác kéo mặt") |
| 7 | **Camera** | 4 chữ (ai, cỡ, góc, phía) + 12 kiểu chuyển + punch/shake/whip/crash; **không biết tường** | 16 loại shot + luật dồn dập + L1–L12; đã thêm `cam.bk` — nhưng giờ có **2 hệ** cùng tồn tại | **K** ngôn ngữ; **M** luật kiểm; cả hai cùng thiếu "né tường" |
| 8 | **Bối cảnh** | 9 set dựng hộp, điểm đứng có tên, đồ vật tỉ lệ "chibi" (cửa 2,6 / người 5,2) | 39 env, asset thật (Kenney/Roblox/Poly Haven), biển, thời tiết, vân, khối xám 8 hướng, kế thừa builder chung | **M** (rõ rệt); **K** chỉ hơn ở điểm đứng có tên |
| 9 | **Đồ hoạ / phụ đề** | biển cấm, dấu đóng, icon trên đầu, bóng đèn ý tưởng, tiêu đề, chớp; phụ đề bật từng chữ, chữ nhấn vàng | Đã chép (`lop-phu.js`, `overlays.js`, ô `lopPhu`, `phuDeBlocky`) — **chưa commit**, chỉ ep003b dùng | **=** sau khi chép |
| 10 | **Âm thanh** | Tiếng động **tự sinh** từ dữ liệu hình (vỗ tay theo nhịp, thịch ở 62% cú ngã); trộn −14 LUFS, nhạc tự hạ dưới giọng; 27 tiếng tổng hợp | 3–5 lớp tiếng thật CC0/CC BY có ghi công, đặt cue tay/agent, `cue-check`; giọng CapCut + Edge có cache | **K** tự động; **M** chất lượng + giấy phép |
| 11 | **Giọng** | ElevenLabs (trả phí, gửi khoá API), hoặc người dùng tự tải MP3 rồi căn | 22 giọng Việt + 47 giọng Anh, chạy trên máy, nhấn ở cú cắt, phụ đề theo mốc từng chữ, trang nghe thử | **M** |
| 12 | **Render / sản phẩm** | Chrome không cửa sổ, CPU SwiftShader ~1 khung/s, 720×1280 JPEG → ffmpeg; chạy lại được giữa chừng (`--budget`) | 1 file HTML, nút Xuất MP4 2K/1080p/4K bằng GPU máy người xem (WebCodecs), mọi lớp bật/tắt, 2 ngôn ngữ | **M** (rõ rệt); **K** chỉ hơn ở "render nối tiếp được" |
| 13 | **Kiểm tra (QA)** | `check` cảnh báo tên lạ; bảng 3 khung/shot có vạch đỏ ở cú cắt, **bắt AI tự mở ảnh** mỗi vòng | `look.mjs` (A/B, PSNR, `--det`, `--pose` so bằng số), L1–L12 + tự sửa, gates, `doctor.mjs`, `export-test.mjs`, 68 file test; ảnh không vào phiên chính | **M** (rõ rệt); **K** chỉ hơn ở "kiểm tên" |
| 14 | **Vòng góp ý** | Bảng lời người dùng → tham số; hỏi số shot khi mơ hồ; trả lời kèm "2–3 điều bạn có thể yêu cầu tiếp" | Góp ý vẽ trên khung (`gop-y`), sửa theo lớp, trang duyệt asset, trang tiến độ, trung tâm điều hành | **M** về công cụ; **K** về câu chữ hướng dẫn người dùng |
| 15 | **Bảo trì / an toàn** | Engine không giấy phép; `setup.sh` gọi `sudo apt`, `npx -y`; `render.mjs` máy chủ tệp không chặn `..`; "skill tự sửa engine rồi đóng zip" | git, nhánh, phiên con, test, luật kế thừa builder; nhưng nợ kỹ thuật lớn: di tích, 2 hệ camera, nhiều tập thử (ep003b, ep3B_1, ep005t…) | **M**, có nợ cần dọn |

## 2b. Bảng chấm điểm (thang 10)

Trọng số = mức quan trọng với mục tiêu của xưởng (phim 2–3 phút, ~140 shot, HTML xuất MP4): 3 = sống còn, 2 = quan trọng, 1 = phụ.
"Sau 1–4" = điểm repo dự kiến nếu làm 4 đề xuất ★ đầu ở mục 5 (ước lượng, chưa đo).

| # | Khía cạnh | Trọng số | Blocky | 3JS Studio | Sau 1–4 | Lý do chấm ngắn |
|---|---|:-:|:-:|:-:|:-:|---|
| 1 | Cách viết skill | 1 | **9** | 6 | 6 | Kia 94 dòng nạp dần; mình `CLAUDE.md` 17 KB mỗi lượt |
| 2 | Điểm vào / dễ hiểu | 1 | **9** | 5 | 6 | Kia có sơ đồ 1 dòng; mình nhiều di tích, phải đọc nhiều file |
| 3 | Viết truyện | 3 | 6 | **8** | 8 | Mình có twist, 4 phần, chấm điểm; kia chỉ công thức hài |
| 4 | Dữ liệu phân cảnh | 1 | **8** | 7 | 8 | Kia 1 file lời ↔ hình; mình chia lớp tốt nhưng lời và hình rời |
| 5 | Animation thân | 2 | 6 | **7** | 7 | Mình có cả bảng nghề lẫn chồng lớp, nhưng chồng lớp đang tắt |
| 6 | Mặt | 1 | 5 | **9** | 9 | Mình nhép theo giọng thật, trộn mềm |
| 7 | Camera | 2 | **8** | 7 | 9 | Kia ngôn ngữ gọn; mình 2 hệ song song; gộp + né tường thì vượt |
| 8 | Bối cảnh | 2 | 4 | **9** | 9 | 39 env, asset thật, biển, thời tiết vs 9 set hộp |
| 9 | Đồ hoạ / phụ đề | 1 | **8** | 7 | 8 | Đã chép nhưng chưa commit, chỉ ep003b dùng |
| 10 | Âm thanh | 1 | 7 | 7 | 7 | Kia tự sinh; mình tiếng thật có giấy phép |
| 11 | Giọng | 2 | 5 | **9** | 9 | 22 Việt + 47 Anh chạy trên máy vs ElevenLabs trả phí |
| 12 | Render / sản phẩm | 3 | 4 | **10** | 10 | HTML, GPU, 4K, bật/tắt lớp vs CPU 1 khung/s 720p |
| 13 | Kiểm tra (QA) | 2 | 4 | **10** | 10 | So bằng số, tất định, L1–L12 vs AI tự nhìn ảnh |
| 14 | Vòng góp ý | 1 | 7 | **8** | 8 | Mình có công cụ; kia có câu chữ hướng dẫn tốt hơn |
| 15 | Bảo trì / an toàn | 1 | 3 | **6** | 8 | Kia không giấy phép, `sudo`; mình có git/test nhưng nợ kỹ thuật |
| | **Tổng (không trọng số, /150)** | | 93 | **115** | 122 | |
| | **Điểm có trọng số (/10)** | 24 | 5,8 | **8,0** | 8,3 | |

Đọc bảng: repo hơn ở 9/15 mục, thua ở 5 mục (1, 2, 4, 7, 9) — cả 5 đều là chuyện **tổ chức và ngôn ngữ khai báo**, không phải năng lực engine.
Đề xuất 6 (tách `CLAUDE.md` + sơ đồ 1 dòng) và 5 (mốc theo chữ) là hai việc kéo được mục 1, 2, 4 lên ngang bộ kia.

## 3. Ưu và nhược — skill blocky-shorts

**Ưu**
1. **Gọn, nạp dần:** `SKILL.md` chỉ là bản đồ; chi tiết ở `references/` đọc đúng lúc → rẻ token, dễ cho model nhỏ làm theo.
2. **Một nguồn sự thật:** `story.json` giữ lời kể + shot + mốc giờ; cùng file luôn ra cùng video → góp ý = sửa đúng 1 chỗ.
3. **Ngôn ngữ khai báo tự nhiên:** "cận, góc thấp, phía trước-phải, đẩy vào" thay cho toạ độ — storyboard dịch thẳng sang dữ liệu.
4. **Danh mục + "không bịa tên":** `references/library.md` liệt kê mọi tên hợp lệ; `check` cảnh báo tên lạ → agent khó sai.
5. **Mốc theo chữ:** hành động gắn vào chữ trong lời kể, đổi giọng không lệch.
6. **Tự động hoá âm thanh:** tiếng động suy ra từ động tác/máy → luôn khớp hình, không cần đặt tay.
7. **Thứ tự duyệt theo giá:** chữ → bảng khung → render đủ; câu "kết quả đầu là bản nháp" đặt kỳ vọng đúng.
8. **"Style DNA" có số:** cắt mỗi 0,5–1,5 s, mọi shot đều chuyển động, punch ở chữ chốt, đổi cỡ cảnh xa → gần.
9. **Hướng dẫn người dùng tốt:** bảng "bạn nói → mình sửa gì", hỏi lại số shot, gợi ý 2–3 yêu cầu tiếp theo.

**Nhược**
1. Chỉ hợp **hài ngắn 20–35 s**, ngôi thứ ba; không có cấu trúc twist / bí mật người lớn như format mình.
2. Render **CPU ~1 khung/s**, 720p JPEG; người dùng phải có Chrome + ffmpeg + Python + Node 22.
3. Bối cảnh hộp, tỉ lệ chibi; không biển, không thời tiết, không asset thật.
4. **Máy không biết tường** (ep003b đã gặp: 8 shot phải quay về máy cũ vì `cam.bk` bị chắn).
5. QA dựa vào **AI tự nhìn ảnh** → tốn token, không có so bằng số, không kiểm tất định.
6. Giọng ElevenLabs trả phí; tiếng động tổng hợp "bíp bụp"; nhép miệng giả.
7. **Không giấy phép** cho engine + 27 tiếng; script cài đặt chạy `sudo` / tải mã từ mạng; máy chủ tệp lỏng.
8. Mục "skill tự sửa engine rồi đóng zip" → không có git, không có test, dễ trôi phiên bản.

## 4. Ưu và nhược — repo 3JS Studio

**Ưu**
1. **Kiểm bằng máy mạnh nhất trong hai bên:** `look.mjs` (số trước, ảnh sau), L1–L12 + tự sửa, gates, `doctor.mjs`, `export-test.mjs`, kiểm tất định.
2. **Sản phẩm tốt hơn hẳn:** HTML một file, Xuất MP4 tới 4K bằng GPU người xem, mọi tính năng bật/tắt, 2 ngôn ngữ, nhiều giọng.
3. **Quy mô thật:** ~140 shot, 2–3 phút, 39 bối cảnh, biển/bão/nhà có chân, asset thật có ghi nguồn.
4. **Làm theo LỚP + chia file cho agent**, hợp đồng trả kết quả ra file, khoá 3 Chrome, phiên điều phối / phiên con.
5. **Mặt và giọng** chất lượng cao (nhép theo giọng thật, trộn mặt mềm).
6. **Đã hấp thụ nhanh** cái hay của bộ kia (5/12 trong 3 ngày) và giữ được ô bật/tắt cho từng thứ.
7. Khối xám 8 hướng + chống Codex chép ảnh — đã **vượt** ý gốc.

**Nhược**
1. **Nặng token ở gốc:** `CLAUDE.md` 17 KB nạp mỗi lượt; nhiều luật chỉ dùng cho 1 việc (Roblox, vân, Codex lưới) vẫn nằm ở đó.
2. **Đường đi khó thấy:** không có một sơ đồ 1 dòng kiểu bộ kia ngay đầu; người/agent mới phải đọc nhiều file.
3. **Hai hệ camera** (`shottypes` + `cam.bk`) và **hai bảng cỡ cảnh** (`co-canh.js` vs `may.js`) → dễ sửa chỗ này quên chỗ kia.
4. **Mã blocky chưa commit** (`may.js`, `lop-phu.js`, `overlays.js`, `tools/blocky-phu-de.mjs`, `tools/blocky-tieng.mjs`) dù engine dùng chung đã móc vào (`engine/shots.js:49,194`).
5. **Tính năng hay nhưng tắt:** `idleSong`, `chongLop` mặc định tắt → tập mới không tự hưởng.
6. **Không có danh mục tên / kiểm tên** → agent có thể bịa tên clip, mặt, env mà không ai báo.
7. **Lời ↔ hình rời nhau:** mốc giờ bằng giây; đổi giọng / sửa lời phải dò lại.
8. **Nợ kỹ thuật:** di tích HyperFrames/R15, nhiều tập thử (ep003b, ep3B_1, ep005t, ep005t-studio-thu, ep005map…), `npm test` còn 2 lỗi có sẵn (số shot ep002, HOUSE bbox).
9. Tiếng động vẫn đặt tay là chính; `blocky-tieng.mjs` chỉ chạy cho ep003b.

## 5. Đề xuất cải thiện (★ = nên làm trước)

| # | Việc | Vì sao (lấy từ đâu) | Sửa ở đâu | Công | Đạt khi |
|---|---|---|---|---|---|
| 1 ★ | **Chốt số phận mã blocky**: commit `engine/blocky/*` + `tools/blocky-*.mjs` + test (tập ep003b vẫn không commit) | Engine dùng chung đã import `may.js`; mất file = vỡ build | git | Rất nhỏ | `git status` sạch phần `engine/blocky`, `npm test` không thêm lỗi |
| 2 ★ | **Gộp 2 hệ camera**: loại shot cũ (`closeup`, `dialogue`…) dịch thành `cam.bk` mặc định; một bảng cỡ cảnh duy nhất | Bộ kia chỉ có 1 ngôn ngữ máy; mình có 2 → lệch số (`can` 2.8 vs 3.8) | `engine/shottypes.js`, `engine/blocky/co-canh.js`, `may.js` | Vừa | ep001–ep003 `look.mjs --pose-ref` không lệch; 1 bảng `CO` |
| 3 ★ | **Danh mục tên sinh tự động + lệnh check** (loại shot, clip R6, mặt, env, `bfx`, kiểu `move`) | `B/references/library.md` + `render.mjs check` | script mới `tools/danh-muc.mjs` → `docs/danh-muc.md`; kiểm tên trong `doctor.mjs` | Vừa | Shot dùng tên sai → cảnh báo có file:dòng |
| 4 ★ | **Máy blocky biết tường**: tia từ tâm nhìn tới máy, chạm khối bối cảnh thì kéo máy vào trước vật chắn (hoặc báo cổng) | Lỗi thật ở ep003b (8 shot phải lùi về máy cũ, d4_06 lan can che đầu, d5_25 băng chuyền che) | `engine/blocky/may.js` + luật mới trong `tools/gates.json` | Vừa | 8 shot ở mục "Dùng lại máy gốc" của `docs/handoff/ep003b-blocky.md` dùng được `cam.bk` |
| 5 | **Mốc theo chữ**: `t: '@chữ'` hoặc `@câu3.chữ2` cho `do`, `bfx`, `mat`, whip/crash | `B/references/storyboard.md` "Time references" | `engine/timeline.js` đọc mốc từng chữ của giọng (đã có cho phụ đề) | Vừa–lớn | Đổi giọng → punch vẫn rơi đúng chữ |
| 6 | **Tách `CLAUDE.md`** còn ~6 KB: giữ luật chung; chuyển Roblox, vân, Codex lưới, bảng tool sang `docs/` hoặc skill (nạp dần như bộ kia) + thêm sơ đồ 1 dòng quy trình ở đầu | `B/SKILL.md` chỉ 94 dòng | `CLAUDE.md`, `docs/` | Nhỏ | `CLAUDE.md` < 7 KB, không mất luật (đối chiếu từng dòng) |
| 7 | **Bật mặc định cho TẬP MỚI** `idleSong`, `chongLop` (tập cũ giữ tắt qua `episode.fx`) | Đề xuất 2 cũ; câu hỏi còn treo | `engine/post.js` hoặc `_template/episode.js` | Nhỏ | ep001–ep003 khung không đổi (`refs/`), tập mới có thở |
| 8 | **Bảng góp ý xuống tới tham số** ("chán" → `move` lớn hơn + `punch`; "xa quá" → cỡ nhỏ hơn 1 bậc…) + câu kết "2–3 điều bạn có thể yêu cầu tiếp" | `B/references/qa-and-iteration.md`, `B/SKILL.md` bước 6 | `.claude/skills/sua-theo-lop/SKILL.md`, `gop-y` | Nhỏ | Mỗi dòng bảng có cột "tham số cần đổi" |
| 9 | **Luật khung bổ sung**: không quay gáy nhân vật chính, 2 người thấy 2 mặt, không ≥ 4 shot liền cùng cỡ, thống kê kiểu máy cả tập | đề bài Roblox BƯỚC 6, `qa-and-iteration.md` | `tools/kiem/luat.mjs` (L13–L15) | Vừa | Chạy trên ep003b ra danh sách vi phạm có shot id |
| 10 | **Tiếng tự sinh làm nền cho lớp khoanh-khac** mọi tập (clip khai `sfx`), người chỉ sửa | `B/engine/js/engine.js:495-530`; mình đã có `blocky-tieng.mjs` | `tools/blocky-tieng.mjs` → tổng quát; skill `tieng-dong` | Vừa | ep001 sinh được cue nền, tắt được |
| 11 | **Gieo 3 – trả 3** + 4 tính chất chọn luật (vật lý, việc thường ngày, lợi dụng được, lây được) vào bảng chấm | `B/references/story-formula.md`, đề bài Roblox BƯỚC 1 | `viet-kich-ban`, `xu-ly-kich-ban`, `tools/kb/lint.py` | Nhỏ | lint báo câu gieo chưa trả |
| 12 | **Điểm đứng có tên** cho env đang dùng (e3-phong, e3-pho, e3-tiem, e3-nha-may trước) | `B/engine/js/sets.js:3` | `engine/envs/<env>.js` trả `spots`; `shottypes.js` nhận `spot:` | Vừa | Shot ghi `spot:'giuong'` → ngồi/nằm đúng độ cao |
| 13 | **Thay 27 tiếng blocky** bằng tiếng CC0 có ghi công trước khi đăng YouTube | Không rõ giấy phép (`B/assets/sfx`) | `episodes/ep003b/sfx/blocky/` | Nhỏ | Mọi tiếng trong ep003b có dòng CREDITS |

Thứ tự gợi ý: **1 → 2 → 3 → 4** (gốc rễ, giảm lỗi cho mọi tập sau), rồi **6, 7, 8** (rẻ, sửa chữ), rồi **5, 9, 10, 11, 12**.

## 6. Không nên lấy (giữ nguyên kết luận 14/11)
Render CPU, ElevenLabs, `setup.sh`/`render.mjs`/`bs.py`, công thức truyện hài, nhép sin, tỉ lệ chibi, số ánh sáng Roblox, "skill tự sửa engine rồi đóng zip" — lý do chi tiết ở mục 4 của `docs/nghien-cuu-skill-in-this-town.md`.

## 7. Chưa kiểm
- Chưa chạy bất kỳ thứ gì của bộ kia; mọi so sánh là đọc mã + tài liệu. Bản rar 17/11 cùng nội dung bản zip 14/11 (cùng 64 tệp trong `blocky-shorts/`, cùng cỡ `SKILL.md` 7.982 byte) — chưa so từng byte các file còn lại.
- Trạng thái mục 1 dựa trên grep + git log + handoff; chưa chạy `npm test` hay mở `dist/ep003b.html`. Người dùng đã duyệt ep003b hay chưa: chưa rõ.
- Số token của `CLAUDE.md` là ước lượng từ 17 KB.
- Đề xuất 4 (né tường) mới là ý; chưa đo bối cảnh nào có lưới va chạm dùng được.
