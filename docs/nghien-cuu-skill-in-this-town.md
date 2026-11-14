# Nghiên cứu bộ "In This Town – Skill Files" để cải tiến 3JS Studio

Ngày viết: 2026-11-14. Đây là báo cáo NGHIÊN CỨU: chưa sửa gì trong xưởng. Bạn chọn dòng nào trong bảng "nên học" thì mới làm.

Nguồn: file `_ In This Town _ Skill Files-20261114T123813Z-1-001.zip` bạn gửi (giải nén ra thư mục tạm ngoài repo, chỉ đọc,
không chạy bất cứ thứ gì trong đó). Mọi đường dẫn ở cột "lấy từ file nào" là đường dẫn TRONG zip; `B/` = `blocky-shorts/`.

## 1. Bộ này là gì, của ai

Zip gồm 3 thứ:

| Tệp | Dung lượng | Là gì |
|---|---|---|
| `Claude Skill Guide.docx` | 361 KB | Hướng dẫn sử dụng skill `blocky-shorts` cho người dùng (cài, làm video đầu, cách góp ý, bảng "nghĩ gì → nói gì") |
| `If You Want to create with roblox studio then read this.docx` | 18 KB | MỘT đề bài dài (prompt) dán vào Claude Code khi mở Roblox Studio (qua Studio MCP): 8 bước từ truyện → dựng khối xám → thị trấn → ánh sáng → diễn viên → bảng shot → script quay → kiểm. Có số đo nhịp cắt và camera lấy từ một video "In This Town" thật (133 shot / 134 giây) |
| `_ In This Town _ Claude Skill File.zip` → `blocky-shorts/` | 1,9 MB, 64 tệp | Một skill Claude hoàn chỉnh: engine three.js + script render + 5 file hướng dẫn + 1 tập mẫu |

Bên trong `blocky-shorts/`:

| Phần | Tệp | Ghi chú |
|---|---|---|
| Hướng dẫn chính | `SKILL.md` (8 KB, 94 dòng) | Quy trình 7 bước, mỗi bước trỏ sang đúng một file tham khảo |
| Tham khảo | `references/story-formula.md`, `storyboard.md`, `library.md`, `audio.md`, `qa-and-iteration.md` (4,6–12,5 KB mỗi file) | Công thức truyện, định dạng `story.json`, danh mục mọi tên dùng được, giọng/tiếng/nhạc, kiểm và sửa |
| Engine | `engine/js/engine.js` (47 KB), `sets.js`, `characters.js`, `overlays.js`, `props.js`, `faces.js`, `poses.js`, `util.js` | three.js chạy trong Chrome không cửa sổ; mỗi khung là hàm của `t = i/fps`, không dùng giờ thực, ngẫu nhiên có seed |
| Script | `scripts/render.mjs`, `bs.py`, `elevenlabs.py`, `sfx_synth.py`, `setup.sh` | Kiểm, chụp bảng xem thử, render khung, căn giọng, trộn tiếng, mã hoá. **Không chạy.** |
| Tập mẫu | `examples/clap-town/story.json` | 9 shot, dùng gần hết tính năng |
| Nhị phân | 27 file `assets/sfx/*.wav` (4–231 KB), 2 phông Inter `.otf` (~620 KB mỗi cái), `engine/vendor/three.module.js` + addon | Chỉ liệt kê, không mở. Không có `.exe`, `.rbxm`, video |

- **Tác giả:** không có tên trong bất kỳ tệp nào. Thuộc tính hai file Word ghi người tạo là "Claude" và "In This Town", ngày tạo 2026-11-14;
  file Roblox viết "đây là đề bài trong video của tôi" → một người làm video (YouTube) chia sẻ, chưa rõ tên kênh. Không có file giấy phép cho phần engine
  (chỉ có giấy phép của three.js và phông Inter).
- **Dành cho công cụ gì:** `blocky-shorts` = Claude + three.js + Chrome + ffmpeg (rất gần xưởng mình). File Word thứ hai = Claude Code + Roblox Studio.
- **Có trùng `skills/fwjelaa/` không:** KHÔNG. Không trùng tên file nào, không nhắc fwjelaa. fwjelaa là bộ animation/map cho Roblox + Blender
  (Python, Luau); bộ này là engine three.js làm trọn video. Đây là nguồn mới, khác tác giả.
- **Khác thể loại với mình:** `blocky-shorts` làm short HÀI 20–35 giây, 60–110 từ, kể ngôi thứ ba (luật lạ → kẻ lợi dụng → hỗn loạn → lệnh cấm → câu chốt tỉnh bơ).
  Xưởng mình làm truyện ngôi thứ nhất 2–3 phút, ~140 shot. File Word Roblox mới là thứ đúng thể loại của mình.

### Skill được viết thế nào (đáng để ý)

- `SKILL.md` ngắn (94 dòng), chỉ là bản đồ: mỗi bước ghi "đọc file X" rồi mới làm. Chi tiết nằm ở 5 file tham khảo, đọc khi tới bước.
- Có một file **danh mục** (`library.md`): mọi tên set, điểm đứng, biểu cảm, động tác, đạo cụ, kiểu máy, hiệu ứng. Kèm luật "không bịa tên":
  tên lạ thì lệnh `check` cảnh báo.
- Thứ tự duyệt theo chi phí: chữ (rẻ) → bảng khung xem thử (vài giây) → render đủ (đắt). Một câu trong `SKILL.md`: "The first result is a draft."
- Có bảng dịch lời người dùng sang chỗ cần sửa (`qa-and-iteration.md`), và mục "skill tự lớn lên": thiếu gì thì mở rộng engine rồi cập nhật skill.

## 2. So sánh theo ba chỗ xưởng đang yếu

| Khía cạnh | Bộ kia | 3JS Studio hiện giờ | Ai hơn |
|---|---|---|---|
| Động tác thân | 6 dáng nền (đứng, đi, chạy, ngồi, nằm, lơ lửng) + 37 động tác chỉ ghi "một phần cơ thể", **chồng lên nhau theo trọng số, mờ vào/ra 0,12 s**; nhiều động tác trong một shot, mỗi cái có mốc giờ (`B/engine/js/poses.js:10-73`, `engine.js:248-260`) | Mỗi shot một clip trọn thân; muốn chuyển mềm phải tự ghi `from` (`engine/shots.js:267`); 21–23 clip | Kia (chồng lớp, tự chuyển). Mình hơn về bảng số nghề trong skill `r6-anim` (lấy đà, overshoot, trễ tay) |
| Đứng yên | Luôn thở, lắc đầu nhẹ, mỗi người lệch pha theo tên, chớp mắt 0,1 s mỗi 2,6–3,9 s (`poses.js:21`, `engine.js:161,271`) | Idle của `engine/r6.js:371` chỉ lắc đầu/tay; chớp mắt chỉ khi bật `faceLive` (ep001 tắt) | Kia |
| Mặt | 29 biểu cảm ghép từ mắt + mày + miệng, đổi theo mốc giờ trong shot; **động tác tự kéo theo mặt** (ngáp → mặt ngáp, ngã → mặt choáng) (`faces.js:8-38`, `poses.js:47,60,71`) | 37 mặt ảnh + bộ AltiWyre, trộn mềm 0,25 s, đảo mắt, đồng tử; nhép miệng theo giọng thật | Mình về chất lượng mặt; kia về việc gắn mặt với động tác |
| Camera | Khai bằng 4 chữ: nhắm ai, **cỡ cảnh** (7 cỡ = chiều cao khung tính bằng đơn vị), góc, phía; máy tự tính khoảng cách và tự lùi khi có nhiều người; 12 kiểu di chuyển + punch-in, rung, whip, crash có nhoè chuyển động (`engine.js:298-377,455`; `references/library.md` mục 5) | 16 loại shot với `dist/h/fov` cố định cho từng loại (`engine/shottypes.js`); có bộ đặt máy theo % khung (`engine/dat-may.js`) nhưng chưa skill nào dùng; chưa có punch/whip/crash/nghiêng máy | Kia về ngôn ngữ khai máy và gia vị; mình có luật kiểm (L1–L12) |
| Tỉ lệ bối cảnh | Người 5,2 đơn vị; mỗi set có **điểm đứng có tên** kèm hướng, độ cao ghế/giường → shot chỉ ghi `spot: "sofa"` là tự ngồi đúng chỗ (`sets.js:3`, `engine.js:158-161`). Nhưng đồ vật kiểu "chibi": cửa cao 2,6, thấp hơn nửa người (`sets.js:58`) | Người 5,2 stud; có `places {pos, ry}` ở thị trấn, env trong nhà tự đặt; không có bảng chuẩn cửa/bàn/ghế; so storyboard bằng mắt | Kia về điểm đứng; không ai có chuẩn tỉ lệ tốt |
| Dựng từ ý tưởng | File Roblox: **dựng khối xám trước** (5 phút), chụp 1 ảnh trên cao + 1 ảnh ngang mắt, DỪNG cho người sửa bố cục rồi mới đổ chi tiết | Cổng duyệt 2 có sơ đồ nhìn từ trên (`tools/kit-trang.mjs`) nhưng bối cảnh dựng thẳng bản chi tiết | Kia |
| Vòng sửa–duyệt | 3 cổng theo giá tiền; bảng 3 khung/shot có vạch đỏ ở cú cắt; bảng "người dùng nói → sửa gì"; chỉ render lại khung đổi | Nhiều cổng hơn, góp ý vẽ trên khung, kiểm bằng số, kiểm tất định, so pixel | Mình về công cụ; kia gọn hơn và có bảng dịch lời góp ý |
| Âm thanh | Tiếng động **tự sinh từ dữ liệu shot** (vỗ tay theo nhịp tay, "thịch" ở 62% cú ngã, rung máy → tiếng va) (`engine.js:495-530`); trộn −14 LUFS, nhạc tự hạ dưới giọng | 3 lớp tiếng, đặt cue bằng tay/agent, kiểm bằng `cue-check` | Kia về tự động; mình về chất lượng nguồn tiếng |

## 3. Nên học (★ = nên làm trước)

| # | Điều áp cho 3JS Studio | Lấy từ file nào trong zip | Sửa / thêm vào đâu bên mình | Công | Lợi ích kỳ vọng | Rủi ro |
|---|---|---|---|---|---|---|
| 1 ★ | **Động tác chồng lớp**: dáng nền (đứng/đi/ngồi) luôn chạy; động tác chỉ ghi phần cơ thể nó dùng (vẫy = một tay) và mờ vào/ra 0,12 s; một shot khai được nhiều động tác có mốc giờ. Hết cảnh "nhân vật bật cứng từ clip này sang clip kia" và "vẫy tay thì chân đứng đơ" | `B/engine/js/poses.js:10-73`, `B/engine/js/engine.js:248-260`, `B/references/library.md` mục 3 | `engine/r6-rig.js` + `engine/shots.js` (trường `do: [...]` cho diễn viên); thêm mục "động tác một phần" vào `.claude/skills/r6-anim/SKILL.md` | Vừa | Chuyển động hết thô ở chỗ nối; thêm động tác mới rẻ (chỉ ghi vài khớp) | Đụng lõi dựng pose đang chạy cho ep001–ep004 → phải có cờ bật/tắt và so `look.mjs --pose` với bản chuẩn |
| 2 ★ | **Không ai đứng im**: idle mặc định có thở (thân ±1°), lắc đầu chậm, tay đung đưa; mỗi nhân vật lệch pha theo tên để đám đông không đồng loạt; chớp mắt 0,1 s mỗi 2,6–3,9 s | `B/engine/js/poses.js:21`, `engine.js:161,271` | Clip `idle` trong `engine/r6-rig.js` / `engine/r15.js`; bật `faceLive` mặc định cho tập mới (`engine/shots.js:64`); một dòng trong `r6-anim` | Nhỏ | Chữa đúng lời phàn nàn "đứng im"; áp cho mọi shot mà không sửa từng shot | Khung chuẩn trong `refs/` lệch hàng loạt → phải lưu lại chuẩn; thở quá tay trông như run |
| 3 ★ | **Khai máy bằng cỡ cảnh thay vì `dist`**: 7 cỡ (cực cận 2,6 · cận 4 · trung 6,8 · ngang đùi 8,6 · toàn thân 10,5 · rộng 16 · toàn cảnh 28 đơn vị chiều cao khung), khoảng cách = (cỡ/2)/tan(fov/2), nhiều người thì tự nới. Storyboard nói "cận mặt" là ra đúng khung, không phải dò số | `B/engine/js/engine.js:298-335`, `B/references/library.md` mục 5 | `engine/shottypes.js` (thêm tham số `co:` dùng `engine/dat-may.js` có sẵn); `tools/storyboard.py` + `.claude/skills/nhap-kich-ban/SKILL.md` (điền cỡ cảnh thay `cam:{dist…}`) | Vừa | Bố cục dựng từ storyboard bớt lệch tỉ lệ; ít vòng "gần quá / xa quá" | Số cỡ cảnh của họ đo cho đầu tròn và khung 720×1280, phải hiệu chỉnh lại cho R6 và các shot nhà có chân |
| 4 ★ | **Tỉ lệ kiểu máy quay có số đo** cho cả tập: ~60% shot đẩy vào chậm (chủ thể lớn thêm 8–15%), 1/6 kéo ra, ~1/10 giật mạnh trong 1/3 giây đầu ở chữ quan trọng, 1/6 giữ gần yên trên mặt, nghiêng máy ~5° ở 1/7 shot (nhiều hơn khi có chuyện bất ổn), cả phim chỉ 1–2 cú xoay/whip. Kèm gia vị: punch-in rồi GIỮ (fov −20% trong 0,13 s), rung tắt dần 0,28 s, whip 0,26 s, crash 0,36 s | File Word Roblox, BƯỚC 6; `B/engine/js/engine.js:363-377` | `engine/shottypes.js` (`applyMove`: thêm `punch`, `snap`, `roll`, `whip`); luật camera trong `CLAUDE.md`; thêm luật thống kê cả tập vào `tools/kiem/luat.mjs` | Vừa | Camera hết đơn điệu "shot nào cũng đẩy giống nhau"; có thước đo máy kiểm được thay cho cảm giác | Lạm dụng rung/giật gây mệt mắt; luật "1 người zoom in, ≥ 2 người zoom out" của mình phải ghép với tỉ lệ này cho khỏi mâu thuẫn |
| 5 ★ | **Dựng khối xám trước, chi tiết sau**: bối cảnh mới dựng bằng hộp xám + người thế thân đúng chỗ đứng, chụp 1 ảnh trên cao + 1 ảnh ngang mắt, người dùng sửa bố cục xong mới đổ model/vật liệu | File Word Roblox, BƯỚC 2 | `.claude/skills/scene-env/SKILL.md` (thêm pha 0), `.claude/skills/lam-phim/SKILL.md` (gắn vào mốc duyệt bối cảnh), dùng lại sơ đồ của `tools/kit-trang.mjs` | Nhỏ–vừa | Sai tỉ lệ / sai bố cục bị bắt trong vài phút thay vì sau khi dựng xong; rút vòng sửa–duyệt | Thêm một lần dừng chờ duyệt; với bối cảnh đã có trong kho thì nên bỏ qua |
| 6 | **Bảng "người dùng nói → sửa gì"** + yêu cầu luôn hỏi lại số shot / mốc giây khi góp ý mơ hồ + gom mọi góp ý một vòng vào một lần | `B/references/qa-and-iteration.md` (bảng "Turning feedback into fixes"), `Claude Skill Guide.docx` mục 6 | `.claude/skills/gop-y/SKILL.md`, `.claude/skills/sua-theo-lop/SKILL.md` (bảng bằng tiếng Việt, cột thứ ba = LỚP và tham số cần sửa) | Nhỏ | Mỗi góp ý ra đúng một sửa nhỏ, ít đoán; phiên con Sonnet làm được | Bảng cứng có thể dẫn sai khi lỗi thật nằm ở lớp khác |
| 7 | **Điểm đứng có tên cho mọi bối cảnh**: mỗi env trả `spots {pos, hướng, ghế?, giường?}`; shot ghi tên điểm, nhân vật tự ngồi/nằm đúng độ cao; vùng cho người đi nền và khối đám đông khai sẵn | `B/engine/js/sets.js:3`, `engine.js:158-161,227-240`, `B/references/library.md` mục 1 | `engine/envs/<tên>.js` (hợp đồng trả về), `engine/shottypes.js` (`normPlace`), `.claude/skills/scene-env/SKILL.md` | Vừa | Hết nhân vật đứng xuyên bàn ghế, lơ lửng trên ghế; shot không cần toạ độ | Phải bổ sung cho ~16 env đã có; làm dần theo env đang dùng |
| 8 | **Mốc giờ theo chữ trong lời kể**: động tác / hiệu ứng / cú giật máy ghi "đúng lúc đọc chữ X, lệch ±0,1 s" thay vì số giây; đổi giọng thì mọi thứ tự chạy theo | `B/references/storyboard.md` mục "Time references", `engine.js:52-90` | `engine/timeline.js`, `episodes/<ep>/shots.js` (trường `at` nhận chữ), `tools/storyboard.py` | Vừa–lớn | Đổi giọng / sửa lời không làm lệch hành động; nhấn đúng chữ | Mình có 2 ngôn ngữ và nhiều giọng → mốc theo chữ phải ánh xạ qua số thứ tự câu, không qua chữ |
| 9 | **Động tác kéo theo mặt và tiếng**: mỗi clip tự khai mặt mặc định (ngã → choáng) và sự kiện tiếng (vỗ tay từng nhịp, "thịch" lúc chạm đất) | `B/engine/js/poses.js:47,60,71,77`, `engine.js:495-530` | `engine/r6-rig.js` (trường `face`, `sfx` trong clip), `.claude/skills/tieng-dong/SKILL.md` (lớp khoanh-khac lấy cue tự sinh làm nền, người chỉ sửa) | Vừa | Ít phải ghi tay mặt + cue cho từng shot; tiếng luôn khớp hình | Tiếng tự sinh dễ dày đặc, lặp; phải tắt được từng lớp (đúng quy tắc "mọi tính năng bật/tắt được") |
| 10 | **Luật khung hình kiểm được bằng máy**: cảnh rộng thì người gần nhất cao ≥ 1/4 khung; không quay gáy; cảnh hai người phải thấy cả hai mặt; không shot nào phần lớn là đất/tường/trời; biển có chữ nằm ở 1/3 trên; shot có người thì có thứ đang chuyển động; cỡ cảnh phải đổi, không 5 trung cảnh liền nhau | File Word Roblox, BƯỚC 6; `B/references/qa-and-iteration.md` (danh sách kiểm) | `tools/kiem/luat.mjs` (luật mới cạnh L1–L12, dùng `engine/measure.js`), `.claude/skills/kiem-tra-khung/SKILL.md` | Vừa | Bắt lỗi bố cục trước khi tới người dùng | Trùng một phần L3/L4/L8 → rà trước để khỏi báo trùng |
| 11 | **Mẹo viết truyện đúng thể loại của mình**: gieo sớm 3 câu nhỏ (một luật đứa trẻ phải nhắc lại, một điều lạ nó để ý, một câu nói của ông bà) và CẢ BA phải được trả; câu tự kiểm "người xem lần đầu nói được điều đang đặt cược trong một câu trước twist chưa"; kết bằng mối nguy kế tiếp, không rút ra bài học; nhân vật làm MỘT việc khéo bằng tay chân chứ không diễn thuyết | File Word Roblox, BƯỚC 1 | `.claude/skills/viet-kich-ban/SKILL.md` (mục tự kiểm) và `tools/kb/lint.py` (cột "gieo / trả") | Nhỏ | Twist chắc hơn, đúng tinh thần "điểm yếu thành lời giải" trong `CLAUDE.md` | Thành công thức lặp nếu tập nào cũng đúng 3 câu gieo |
| 12 | **Danh mục tên + cảnh báo tên lạ**: một file liệt kê mọi tên dùng được (loại shot, clip, mặt, điểm đứng, hiệu ứng); công cụ kiểm báo khi shot dùng tên không có thay vì lặng lẽ dùng mặc định | `B/references/library.md` (dòng đầu + mục 9), `B/engine/js/engine.js:86-87,127-130,188` | Sinh tự động `docs/danh-muc.md` từ engine (script trong `tools/`), thêm kiểm tên vào `tools/kiem/luat.mjs` hoặc `tools/doctor.mjs` | Vừa | Agent phụ không bịa tên clip/mặt; lỗi gõ sai lộ ngay | Danh mục viết tay sẽ cũ → chỉ làm nếu sinh tự động |

Thứ tự gợi ý: **2** (nhỏ, thấy ngay) → **5** và **6** (sửa skill, không đụng engine) → **3** → **4** → **1** (lớn nhất, làm sau khi có chuẩn so pose).

## 4. Không nên lấy

| Thứ của bộ kia | Vì sao không |
|---|---|
| Chép engine `blocky-shorts` vào repo (`B/engine/js/*`) | Không có giấy phép cho phần mã; nhân vật đầu tròn kiểu đồ chơi, không phải R6; engine mình đã có biển, thời tiết, hậu kỳ, xuất MP4. Chỉ học cách tổ chức |
| Chạy `scripts/setup.sh`, `render.mjs`, `bs.py` | `setup.sh` gọi `sudo apt-get`, `pip`, `npx -y` tải mã từ mạng; `render.mjs` mở Chrome `--no-sandbox` và có máy chủ tệp cục bộ không chặn `..`; đường dẫn viết cho Linux. Mình đã có `look.mjs`, `xuat.mjs` |
| Giọng ElevenLabs (`scripts/elevenlabs.py`, `references/audio.md` mục 2–3) | Mình đã chốt CapCut (Việt) + Edge (Anh), chạy trên máy. Script còn gửi khoá API tới địa chỉ đổi được bằng biến môi trường |
| Render mặc định bằng CPU (SwiftShader), ~1 khung/giây, 720×1280, JPEG | Mình render bằng GPU của người dùng trong HTML, 1080p–4K |
| Công thức truyện hài 20–35 giây (`references/story-formula.md`: luật → lợi dụng → ba lần → lệnh cấm → câu chốt) | Khác thể loại: mình kể ngôi thứ nhất 2–3 phút, twist là bí mật người lớn. Chỉ lấy vài mẹo câu chữ (dòng 11) |
| Nhép miệng bằng sóng sin giả (`B/engine/js/engine.js:272`) | Mình đã nhép theo giọng thật |
| Mặt đổi tức thì, không trộn | Mình có trộn 0,25 s; nhưng với shot < 1 giây có thể cân nhắc đổi tức thì (chưa thử) |
| Tỉ lệ đồ vật "chibi" (cửa 2,6 so với người 5,2 — `B/engine/js/sets.js:58`) | Chính là kiểu lệch tỉ lệ mình đang muốn tránh |
| Bộ 27 tiếng động tổng hợp (`assets/sfx/*.wav`, `scripts/sfx_synth.py`) | Tiếng "bíp bụp" hợp phim hài; mình dùng tiếng thật CC0/CC BY đã ghi công. Không rõ giấy phép tái dùng |
| Phần riêng Roblox Studio trong file Word: quay camera 90° rồi quay màn hình, `TweenService`, `FaceControls`, các ID áo/tóc/animation, script server/client | Chỉ có nghĩa trong Roblox Studio; mình dựng bằng three.js và xuất thẳng MP4 dọc |
| Bộ số ánh sáng Roblox (BƯỚC 4: `ClockTime 16.3`, `Brightness 3.5`, Bloom, Atmosphere…) | Là thông số của engine Roblox, không quy đổi thẳng sang three.js. Ý dùng được: nắng thấp 22–28° chiếu xiên để bóng đổ dài, núi xa xếp lớp nhạt dần — đã gần với các "family" ánh sáng trong `scene-env` |
| Mục "skill tự mở rộng engine rồi đóng zip lại" (`SKILL.md` mục cuối) | Mình quản bằng git, phiên con và test; để Claude tự sửa engine khi dựng tập là đi ngược quy tắc "hạn chế sửa `engine/`" |

## 5. Những thứ 3JS Studio đang làm TỐT HƠN (đừng đổi nhầm)

- **Kiểm bằng máy**: `tools/look.mjs` (so bằng số, `--det`, `--ab`, so pixel với `refs/`), luật L1–L12 + tự sửa, `doctor.mjs`, `export-test.mjs`.
  Bộ kia chỉ có cảnh báo tên lạ và một bảng khung để AI tự nhìn.
- **Ảnh không vào phiên chính**: họ bắt Claude mở bảng khung mỗi vòng (tốn token); mình so bằng số trước, lệch mới mở ảnh.
- **Mặt**: 37 mặt + bộ ghép bộ phận, chuyển mềm, đảo mắt, đồng tử theo ánh sáng, nhép theo giọng thật.
- **Bảng số nghề cho animation** trong `r6-anim` (lấy đà : hồi, overshoot 8–15%, tay trễ 2 khung, không đứng yên quá 6–10 khung): engine kia KHÔNG có lấy đà,
  co giãn hay khoá chân. Vấn đề của mình là số đã có trong skill nhưng clip idle và cách nối clip chưa theo (dòng 1, 2).
- **Quy mô và thể loại**: ~140 shot, 2–3 phút, biển/bão/nhà có chân, 16+ bối cảnh, asset thật (Kenney, Roblox, Poly Haven) có ghi nguồn. Bộ kia: 9 set dựng bằng hộp.
- **Sản phẩm**: một file HTML có nút Xuất MP4 2K/4K bằng GPU, mọi lớp bật/tắt được, hai ngôn ngữ, nhiều giọng.
- **Vòng duyệt có công cụ**: góp ý vẽ trên khung hình, trang duyệt asset chọn nhiều, trang tiến độ, dây chuyền `lam-phim.mjs` chạy lại theo mã băm.
- **Làm việc theo LỚP** và chia file sở hữu cho agent: bộ kia là một `story.json` duy nhất.

## 6. Chưa kiểm

- Mọi nhận định về hiệu quả (hết thô, bớt lệch tỉ lệ, rút vòng duyệt) là **suy luận từ đọc tài liệu và mã**, chưa thử trên xưởng. Chưa xem video nào do bộ kia làm ra
  (ảnh trong file Word không mở).
- **Không chạy** engine, script hay lệnh cài đặt nào của bộ kia. Các con số (0,12 s, 2,6–3,9 s, bảng cỡ cảnh, punch 0,13 s…) đọc từ mã, chưa đo trên hình.
- Phần mã engine và script do một agent Sonnet đọc; tôi tự đọc `SKILL.md`, 5 file tham khảo, `story.json` mẫu, hai file Word, và mở lại `engine.js`
  để xác nhận bảng cỡ cảnh (dòng 298), chu kỳ chớp mắt (271), mờ 0,12 s (238), nhoè chuyển động 10 mẫu (455). Chưa tự kiểm: chi tiết `bs.py`, `sfx_synth.py`,
  `overlays.js`; chưa xác nhận `vendor/three.module.js` là bản nguyên gốc.
- Phần tóm tắt skill và engine bên mình do một agent Sonnet đọc; tôi kiểm lại `engine/shots.js:64,267,282` và sự tồn tại của `engine/dat-may.js`,
  `engine/measure.js`, `engine/r6-rig.js`. Chưa tự kiểm: clip idle đang dùng thật cho R6 là của `r6-rig.js` (mượn R15) hay `r6.js`; `shots.js` của tập hiện có
  đã cho nhiều động tác trong một shot ở mức nào; L1–L12 đã phủ những luật nào của dòng 10.
- Các con số "133 shot / 134 giây", "60% đẩy vào"… là số tác giả tự đo trên một video, không rõ video nào; chưa đối chiếu với ep001 của mình.
- Tên tác giả: không tìm thấy trong tệp. Nếu bạn biết kênh nào chia sẻ bộ này, nên bổ sung vào mục 7.
- Chưa cập nhật `docs/tien-do.json` vì phiên này chỉ được tạo đúng một file.

## 7. Ghi công và bản quyền

- Nguồn: bộ "In This Town – Skill Files" (skill `blocky-shorts` + đề bài Roblox Studio), tác giả chưa rõ tên, tạo ngày 2026-11-14, do bạn tải về.
  Khi áp dụng dòng nào ở mục 3, ghi trong commit / skill: "ý tưởng từ bộ skill blocky-shorts (In This Town Skill Files)".
- Báo cáo này chỉ học **ý tưởng và phương pháp**; không chép mã, không chép nguyên văn (ngoài một câu ngắn có trích nguồn ở mục 1). Không tệp nào của bộ kia được đưa vào repo.
- three.js (MIT) và phông Inter (OFL) trong zip là của tác giả gốc tương ứng; mình không dùng bản trong zip.
