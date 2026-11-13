# CLAUDE.md — Workspace Short "Ở thị trấn này…" (phong cách khối vuông)

## Mục tiêu
Sản xuất video short dọc 1080×1920 theo format "Ở thị trấn này…", **2–3 phút**, ghép từ **~140 shot** (~1 giây/shot).
Cảnh 3D dựng bằng three.js + engine tự viết (`engine/`). Sản phẩm là **một file HTML** có nút Xuất MP4 chạy trên máy người dùng.

## Format "Ở thị trấn này" (= "In This Town" Roblox story)
- Hoạt hình kể chuyện: một **luật lạ** chi phối cả thị trấn, kể **ngôi thứ nhất** bởi một đứa trẻ, có giọng đọc, nhạc, tiếng động.
- Luật giống **cơ chế game** (thanh máu, % pin, con số trên đầu, đếm ngược…), nói được trong **1 câu**.
- Nhân vật chính có **điểm yếu** do luật gây ra. Người lớn (mẹ, bà) thường giữ **bí mật**.
- Twist = **nguyên nhân ẩn / bí mật người lớn / kẽ hở của luật** — KHÔNG phải chỉ là quái vật xuất hiện.
- Kết: **điểm yếu của nhân vật trở thành lời giải**. 4 phần: Hook ~10% · Leo thang ~40% · Twist ~25% · Giải quyết ~25%.
- Chỉ dùng ý tưởng TỰ NGHĨ; không chép cốt truyện của kênh khác.

## Quy tắc người dùng (ưu tiên cao nhất)
- **Render trên máy người dùng, KHÔNG qua cloud/Actions.** Sản phẩm = `dist/<ep>.html` một file (nút ⬇ Xuất MP4 2K/1080p/4K
  bằng GPU máy họ). Skill: `xuat-phim`.
- **Sau MỖI lần sửa xong (dù nhỏ) luôn gộp lại và đưa link file HTML** ở cuối câu trả lời: `S:\3JS Studio\dist\<file>.html` +
  `file:///S:/3JS%20Studio/dist/<file>.html` (bản xem thử khi chưa chốt: `dist/<ep>_xem-thu.html`).
- **Mọi tính năng mới phải bật/tắt được** trong trình phát (ngôn ngữ, giọng, phụ đề, tiếng, hiệu ứng hình…).
- Bộ kịch bản người dùng đưa (khung ảnh + mô tả) là **tài sản của họ** → làm luôn, không hỏi lại về nguồn.
- Duyệt trước rồi mới ghép: đoạn mẫu / trang nghe thử → người dùng chốt → mới gộp vào HTML.
- Giọng: Việt = CapCut qua VoiceStudio (mặc định `BV075_streaming`), Anh = Microsoft Edge đọc nhấn ở cú cắt. Chạy trên máy, có cache
  từng câu ở `.cache/tts/`. KHÔNG sửa logic `tools/voice_studio/`. Skill: `giong-doc`.
- **Phiên điều phối** (phiên chính ở `S:\3JS Studio`): không bỏ, không archive, **không `/clear`** — khi đầy chỉ dùng **`/compact`**.
  Claude không đề nghị "chuyển sang phiên mới" cho phiên này; nhắc `/compact` và đẩy việc nặng sang phiên con / agent phụ.
  Trước khi compact, ghi quyết định chưa có trong file vào `HANDOFF.md`/docs. **Phiên con thì clear thoải mái.**
- Tài sản Roblox (Creator Store, Marketplace) **được dùng để dựng phim**; tải bằng `tools/sky-extract/`, vẫn ghi nguồn vào manifest.
- Đã chốt: hải đăng màu xanh; bỏ Three.js Water Pro; phông Be Vietnam Pro (phụ đề) + Patrick Hand (bưu thiếp).

## Công cụ (dùng thay vì viết script tạm)
| Lệnh | Việc |
|---|---|
| `node tools/look.mjs <trang> --shots … / --t … / --frames … [--ab trang2] [--det] [--pose]` | **công cụ chụp duy nhất**: bảng khung có nhãn, so A/B, kiểm tất định, so bằng số (skill `kiem-tra-khung`) |
| `node tools/build.mjs <ep> <lớp>` / `npm run bundle:ep001` | dựng lại một lớp / gộp `dist/<ep>.html` |
| `node tools/export-test.mjs dist/<ep>.html --range a:b --matrix "…"` | bấm Xuất MP4 tự động mọi tổ hợp + báo cáo |
| `node tools/doctor.mjs <ep> [--fix-procs] [--shaders]` | khám cả repo: asset, phông, shot, giọng, bản gộp cũ, tiến trình treo, git |
| `node tools/shaders.mjs <trang>` | đo số shader + thời gian mở trang (⚠ khi > 80 program hoặc > 10 s) |
| `node tools/lam-phim.mjs <ep>` | điều phối dây chuyền "một câu luật → phim" (skill `lam-phim`) |
| `python tools/storyboard.py …` / `python tools/video2kb.py …` | kịch bản → tập mới / video → kịch bản (skill `nhap-kich-ban`, `video-sang-kich-ban`) |
| `python tools/voices_build.py <ep> sample|vi|en|index` | giọng nhiều giọng, trang nghe thử |
| `node tools/nhap-model.mjs tim|nhap|kiem` | nhập model qua Blender (`docs/nhap-model.md`) |
| `node tools/nen-model.mjs <file.glb|.gltf> … [--thu]` | nén model tại chỗ (bỏ trùng, lượng tử hoá lưới, ảnh vân WebP ≤ 1k); so bản gốc/bản nén bằng `tools/xem-model.html` + `look.mjs --ref` |
| `node tools/feedback.mjs --latest` | đọc góp ý từ trình phát (skill `gop-y`) |
| `PROFILE=1 node tools/look.mjs …` (cũng cho `shaders.mjs`, `bundle.mjs`, test) | **mở trang nhanh gấp ~4 lần** (28 s → 6 s) nhờ giữ shader đã dịch ở `.cache/chrome-profile/`; ảnh giống hệt. Mặc định tắt; không dùng cùng `GL=swiftshader` |
| `node tools/don.mjs [--xoa]` | liệt kê / dọn ảnh kiểm tra cũ hơn 24 giờ trong `output/` |

## Làm việc theo LỚP
Mỗi tập chia lớp độc lập: **canh**, **hieu-ung-hinh**, **phu-de**, **giong**, **tieng-anh**, **nen**, **buoc-chan**, **khoanh-khac**, **nhac**.
Bản đồ lớp → file → lệnh: `episodes/<ep>/LAYERS.md`. Người dùng nói "sửa lớp X" → chỉ sửa file của lớp đó →
`node tools/build.mjs <ep> <lớp>`. Không trộn nhiều lớp nếu người dùng chỉ nhắc một lớp. Skill: `sua-theo-lop`.

## Cấu trúc thư mục
```
engine/        lõi dựng cảnh dùng chung: stage.js (sân khấu), shots.js + shottypes.js + timeline.js (đạo diễn),
               r15.js + ga-rig.js + cast.js (nhân vật), envs.js + envs/<tên>.js (mỗi bối cảnh 1 file), post.js (hậu kỳ)
episodes/<ep>/ dữ liệu một tập: episode.js, shots.js (mỗi shot 1 dòng), narration.txt, index.html, LAYERS.md
assets/        kenney/ polyfork/ polyhaven/ nhap/ special/ + manifest.json (mọi asset phải có dòng ở đây)
tools/         công cụ dòng lệnh + tools/tests/ (npm test)
docs/          tài liệu; docs/handoff/ = handoff và báo cáo của các phiên
dist/          bản gộp HTML (không vào git)      output/  ảnh, video kiểm tra (không vào git, dọn bằng tools/don.mjs)
refs/          ảnh chuẩn so khung               .cache/  giọng, tiếng động đã tạo
```
- **Handoff / báo cáo mới** ghi vào `docs/handoff/<tên>.md`; ở gốc repo chỉ có `HANDOFF.md` của phiên điều phối.
- **Ảnh và video kiểm tra** chỉ ghi vào `output/<tên-việc>/`; file tạm của script ghi vào `output/_tmp/`. Không ghi vào gốc repo.

## Luật camera "dồn dập" (bắt buộc cho mọi shot)
- Camera **gần như không bao giờ đứng yên**: mỗi shot có zoom in hoặc zoom out rõ (đổi `dist`/`fov` hoặc `p`→`p2`).
- **1 người trong khung → zoom IN.** **2 người trở lên hoặc vật lớn (ngôi nhà) → zoom OUT.**
- **Nhà có chân**: zoom out hoặc lia ngang để **thấy trọn 4 chân**.
- Shot tĩnh chỉ dùng hiếm (bưu thiếp cận để đọc chữ).
- Không để đạo cụ/cây che mặt nhân vật hoặc mặt tiền nhà; không cắt nửa người nhân vật chính.

## Hệ thống shot
- Shot là DỮ LIỆU, không phải code: chọn LOẠI SHOT trong `engine/shottypes.js` rồi điền tham số, mỗi shot 1 dòng trong `shots.js`,
  chỉ ghi phần KHÁC mặc định. Loại có sẵn: establish, crowd, walkBy, follow, closeup, reaction, overShoulder, insert, chase, reveal, dialogue.
- `id` cố định (s001…), không đánh số lại khi chèn — chèn thì dùng `s012a`. `dur` tính bằng giây.
- `timeline.js` nối vị trí/hướng/trang phục nhân vật giữa các shot, trừ khi shot ghi rõ `at`/vị trí mới.
- Phụ đề lấy từ lời dẫn; trường `text` chỉ cho chữ nổi đặc biệt. Giọng, nhạc là 1 track liền; tiếng động gắn theo shot.
- Claude chủ yếu sửa `shots.js`/`episode.js`, hạn chế sửa `engine/`. Tập mới chỉ ghi dữ liệu (`env`, `seaWeather`, `float`…) — xem `docs/core.md`.
- Ví dụ `episode.js`/`shots.js` đầy đủ: `docs/chi-tiet-tu-claude-md.md`.

## Quy tắc kỹ thuật (bắt buộc)
- Mọi animation là **hàm thuần của `t`**: tua tới/lui/nhảy cóc đều ra cùng kết quả. Trang phát đặt pose/camera theo `t` rồi vẽ 1 lần.
- CẤM dùng giờ thực, `requestAnimationFrame`/`setAnimationLoop` cho chuyển động, `Math.random()` không seed.
- Tải xong mọi GLB/texture trước khi tua (`window.__ready`); không fetch trong lúc tua. Gán `window.THREE = THREE`.
- Đặt tên rõ cho object, bộ phận, clip — đó là "tay cầm" để Claude điều khiển.
- Nhân vật: **R15** (`engine/r15.js`, `createR15`) và Gà (`engine/ga-rig.js`), khai báo trong `episode.actors` qua `cast.js`.
  Mặt nhìn +Z; 1 đơn vị = 1 stud. Animation mới = thêm 1 hàm `(t) => pose`.
- Chụp và render mặc định bằng GPU; chỉ đặt `GL=swiftshader` khi so khung tất định (`docs/core.md`).
- Sau mỗi thay đổi: kiểm vài khung (đầu, giữa, cuối shot) trước khi gộp.

## Asset
1. **Kenney** (CC0, scale 1.0) — bộ gốc. 2. **Polyfork / Poly Haven / Sketchfab / Poly Pizza** — khi Kenney thiếu, nhập bằng
   `tools/nhap-model.mjs` qua **Blender 5.1.2** (biến `BLENDER` trong `.env.local`). 3. **GLB riêng** (`assets/special/`) — chỉ cho twist.
- Chỉ CC0 và CC BY; mỗi asset có dòng trong `assets/manifest.json` + ghi công. KHÔNG commit `.mjs`/bản HD của Polyfork.
- **Ưu tiên low poly** theo ngưỡng `docs/nhap-model.md`; không có low poly → hỏi người dùng trước.
- Blender chỉ là trạm nhập model; KHÔNG dùng cho animation, bố trí cảnh, ánh sáng hay render.

## Agent phụ
- Tuân theo quy tắc agent trong CLAUDE.md chung của người dùng (model rẻ, tối đa 3 cùng lúc, giao việc rõ, kiểm lại kết quả).
  Riêng dây chuyền `lam-phim` thì theo "Quy tắc agent" trong skill đó.
- **Mỗi agent sở hữu file riêng**: bối cảnh = `engine/envs/<tên>.js`; shot = dải dòng trong `shots.js` (sửa từng dòng bằng Edit).
  Không giao 2 agent cùng một file; không sửa engine dùng chung nếu không được giao. Chia đều, ≤ 3–4 lỗi mỗi agent.
- **Chụp kiểm nhanh**: agent chỉ chụp đúng shot mình sửa (`look.mjs --shots …`), mỗi agent `--out output/look/<tên-agent>` riêng.
- **Người dùng báo lỗi theo frame** → `look.mjs --frames 676,1262` (chỉ chụp phân cảnh chứa frame đó). Không chụp cả phim để tìm lỗi.
- **Kiểm bằng số trước, mở ảnh sau**: lưu chuẩn `look.mjs … --pose --out refs/<tên>`; sau khi sửa chạy
  `--pose-ref refs/<tên>/pose.json --ref refs/<tên>`. Số báo OK thì KHÔNG mở ảnh; lệch thì chỉ mở `*_diff.png` được nêu.
- **Kiểm cả phim 1 lần ở cuối** (agent chính): `node tools/look.mjs episodes/<ep>/index.html --shots all --det`.
- Agent chính giữ `episode.js`, dàn ý và tính liên tục; gộp kết quả, chạy kiểm tra và commit.

## Đọc thêm khi cần (không nạp sẵn)
- `docs/core.md` — lõi engine: biển, thời tiết, vật liệu, hậu kỳ, look.mjs. `docs/shaders.md`, `docs/vat-lieu.md`, `docs/nhap-model.md`, `docs/kich-ban-vao.md`.
- `docs/chi-tiet-tu-claude-md.md` — ví dụ shot đầy đủ, quy trình viết tập, `tools/ref.py` (nghiên cứu video tham khảo), cú pháp
  `narration.txt` và giọng, R6, luồng HyperFrames cũ (chỉ còn dự phòng: `tools/render-local.mjs`).
- `skills/fwjelaa/` — phương pháp gốc của fwjelaa (FWJ STUDIOS) cho skill `r6-anim`, `ref-model`, `scene-env`, `vfx3d`; ghi công khi chia sẻ.
