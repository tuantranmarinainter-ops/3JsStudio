# ep001 — Ngôi nhà biết đi

Dựng lại bằng three.js + HyperFrames theo tài liệu bàn giao của người dùng (2 file HTML: 5.132 frame tham chiếu,
93 cue SRT, 16 chương). Nguồn tham chiếu đã trích ở `refs/ngoinha/` (frame JPEG nằm trong `.gitignore`).

| | |
|---|---|
| Khung | 1080×1920, 30 fps, **5.132 frame** (F0–F5131, 171,067 s) |
| Shot | 145 (`shots.js`, cut list `refs/ngoinha/cuts.json`) |
| Giọng | CapCut "Giọng Bé" `BV074_streaming_dsp` +20%, tạo từ SRT gốc, mỗi câu đặt đúng mốc `@at` (`narration.txt`) |
| Phụ đề | cụm 1–3 chữ theo SRT gốc (`captions.js`), font Nunito 900 viền đen |

## Chạy
```bash
npm run dev                      # HyperFrames Studio: play/pause/seek/từng frame → mở episodes/ep001/index.html
npm run render:ep001             # → output/ep001.mp4 (H.264 yuv420p + AAC), ~37 phút trên 4 CPU (hoặc workflow `render` trên Actions: 10 đoạn song song, ~5 phút/đoạn)
npm run png:ep001                # PNG sequence theo frame (kiểm chứng)
# render 1 đoạn (giây):   npx hyperframes render . -c episodes/ep001/index.html --start 40 --end 52 -o output/part.mp4
# xem nhanh vài khung:   node tools/peek.mjs "episodes/ep001/index.html?peek=1" 12.5,30 out.png
# so với gốc (shot 1–15): bash tools/sheet_ep.sh ep001 1 15 out.jpg   (hàng trên gốc, hàng dưới bản dựng)
```
Sửa lời kể: sửa `narration.txt` → push → workflow `tts-narration` tạo lại câu đã sửa.
Tạo lại phụ đề/lời kể từ SRT: `python tools/srt2narration.py refs/ngoinha/subtitles.json`.
Trích lại frame tham chiếu: `python tools/ref_frames.py refs/ngoinha <Phần_1.html> <Phần_2.html>`.

## Một file HTML có nút "Xuất MP4" (render trên máy người xem, không cần cloud)
```bash
npm install                 # lần đầu (esbuild, mp4-muxer, playwright-core)
npm run bundle:ep001        # → dist/ep001.html (~18 MB, tự chứa: JS + three + GLB + texture + giọng đọc)
```
Mở `dist/ep001.html` bằng **Chrome hoặc Edge** (bấm đúp, không cần server/mạng):
- **▶ Xem** / thanh tua: xem trước có tiếng (Space = phát/dừng).
- Chọn **2K 1440×2560** (mặc định), Full HD hoặc 4K; tuỳ chọn đoạn (giây) → **⬇ Xuất MP4** → chọn chỗ lưu.
  Trình duyệt render từng frame bằng card đồ hoạ của máy, phụ đề vẽ vào hình, H.264 High + AAC (WebCodecs + mp4-muxer).
- Đã đo trên máy người dùng: cả tập 2K (5132 frame) xuất trong ~42 s; mọi khung so với trang gốc đều khớp.
- **Ngôn ngữ** Tiếng Việt / English (giọng Andrew) — đổi cả phụ đề, giọng đọc và chữ trên bưu thiếp; ô **Phụ đề** và
  **Giọng đọc** bật/tắt độc lập (áp dụng cho cả xem trước lẫn file xuất; tên file có hậu tố `_EN/_VI`, `_nosub`, `_novoice`).
  Trang gốc cũng nhận `?lang=en&subs=0&voice=0` hoặc `window.setOptions({lang, subs, voice})`.
- **Hiệu ứng hình** (`engine/post.js`, mỗi ô bật/tắt riêng, áp dụng cả lúc xem và lúc xuất): chỉnh màu theo cảnh
  (theo preset ánh sáng), toả sáng (bloom), mờ hậu cảnh (tự bật ở cảnh cận), tối viền + hạt phim, viền đen nhân vật
  (mặc định tắt), mưa bão mạnh (vệt mưa + loé chớp ở cảnh `storm`/`shipStorm`). Trang gốc: `?fx=grade,bloom` hoặc `?fx=none`.
  Cảnh vẽ ra canvas như cũ rồi mới phủ hiệu ứng → tắt hết = giống hệt bản gốc. Tất định theo t.
Sửa engine/shot → chạy lại `npm run bundle:ep001` (file gộp không tự cập nhật).
Dự phòng không dùng giao diện: `node tools/render-local.mjs dist/ep001.html -o output/ep001.mp4` (Chrome headless + ffmpeg, 1080p).

## Bản tiếng Anh (bám cú cắt)
- `tools/en/beats.py ep001 --keep s055 > episodes/ep001/beats.json`: chia lời kể theo cú cắt (nhịp ≥ 1,15 s, gộp shot không lời).
- `tools/en/en_ep001.py`: lời kể tiếng Anh, MỖI NHỊP 1 CỤM bắt đầu đúng cú cắt, từ khoá đặt đầu cụm (đọc nhấn khi chuyển khung).
- `python tools/en/tts_en.py ep001`: Edge TTS `en-US-AndrewMultilingualNeural`, mỗi nhịp đặt tại cú cắt +0,04 s; dài quá khung
  thì tự tăng tốc (≤ +45%, rồi atempo ≤ 1,25) → `narration_en.mp3`, `captions_en.js` (cụm 1–3 chữ theo mốc từng chữ),
  `narration_en.json` (báo cáo tốc độ từng nhịp). Cache `.cache/tts_en/`. Sửa câu ở `en_ep001.py` rồi chạy lại.
- Sửa `shots.js` làm đổi cú cắt → chạy lại `beats.py` (id nhịp có thể dịch, kiểm `en_ep001.py`) rồi `tts_en.py`.

## Cấu trúc
- `episode.js`: diễn viên (cậu bé mũ len đỏ áo hoodie vàng; mẹ tóc bím áo sọc mint khăn đỏ váy nâu; cha mũ đỏ áo
  khoác navy; cha trên đảo có râu, áo/quần rách), 2 nhà (gia đình đỏ mái ngọc / nhà minh hoạ sáng mái xanh), đạo cụ.
- `shots.js`: 1 dòng/shot, dữ liệu thuần, `f: [f0, f1]` khớp frame gốc.
- Engine: `engine/house.js` (nhà + 4 chân IK 2 đoạn, dáng đi chéo, chân neo đất, chui ra/đứng/rũ/khuỵu),
  `engine/envs.js` (15 bối cảnh + preset ánh sáng), `engine/props.js`, `engine/postcards.js` (thiếp canvas, chữ
  nguyên văn lời kể), `engine/fx.js` (tuyết, mưa, bụi, thiếp rơi, chớp — tất định), `engine/shots.js` (đạo diễn),
  `engine/timeline.js`.

## Đã kiểm
- `output/ep001.mp4`: ffprobe đếm đúng **5.132 frame**, 30/1 fps, 1080×1920, H.264 yuv420p, AAC, 171,067 s, 91 MB.
- Seek trực tiếp tại F0, 190, 258, 996, 1271, 1671, 3267, 4479, 4750, 5055, 5131: **giống từng pixel** dù render
  xuôi hay ngược (mọi chuyển động là hàm thuần của t; hạt có seed).
- Cut list: dò tự động (chênh lệch pixel + histogram), 145 shot; khớp đúng mọi mốc cắt tài liệu nêu
  (F51, F94, F117, F190, F258, F330, F996, F1271, F1671, F4750, F5055, F5095). Các cut khác **chưa rà từng frame**.
- So giữa mỗi shot (gốc | dựng): `refs/ngoinha/compare/*.jpg`.

## Sai lệch còn lại / asset chưa đạt
- Asset dựng bằng code, phong cách khối đơn giản hơn bản gốc (bản gốc nhiều texture, chi tiết trang trí, ánh sáng phong phú hơn).
  Camera/tiêu cự hiệu chỉnh bằng mắt theo frame giữa shot, chưa overlay silhouette từng frame.
- Âm thanh: **không phải audio gốc** (MP4 gốc chưa có trong workspace) — giọng TTS từ SRT; 2 câu bắt đầu trễ 0,13 s và
  0,2 s; chưa có nhạc nền và SFX (bước chân "rầm", gió, sóng).
- Khung: nguồn 480×854 (tỷ lệ 0,5621) so với 9:16 (0,5625), chênh 0,07 % → dựng thẳng 1080×1920, không crop/padding.
- Shot đơn giản hoá so với gốc: s006 (góc sát cỏ nhìn chân), s010 (gia đình ngủ dùng 3 nhân vật chính), s015 (người
  khám phá trên hiên), s038–s039 (nhìn qua cửa sổ), s056 (chân ngập nước), s081 (dấu chân trên tuyết chưa có),
  s101 (bàn chân trên cát), s126 (vạch đếm ngày trên thân cọ chưa có), s136 (hộp hoa cửa sổ chưa có).
- Nội thất bếp/phòng ngủ là bối cảnh riêng (không gắn cứng vào thân nhà); độ nghiêng sàn mô phỏng bằng xoay cả phòng.
