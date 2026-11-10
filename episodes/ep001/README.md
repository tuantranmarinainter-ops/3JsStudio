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
npm run render:ep001             # → output/ep001.mp4 (H.264 yuv420p + AAC), ~25 phút trên 4 CPU
npm run png:ep001                # PNG sequence theo frame (kiểm chứng)
# render 1 đoạn (giây):   npx hyperframes render . -c episodes/ep001/index.html --start 40 --end 52 -o output/part.mp4
# xem nhanh vài khung:   node tools/peek.mjs "episodes/ep001/index.html?peek=1" 12.5,30 out.png
# so với gốc (shot 1–15): bash tools/sheet_ep.sh ep001 1 15 out.jpg   (hàng trên gốc, hàng dưới bản dựng)
```
Sửa lời kể: sửa `narration.txt` → push → workflow `tts-narration` tạo lại câu đã sửa.
Tạo lại phụ đề/lời kể từ SRT: `python tools/srt2narration.py refs/ngoinha/subtitles.json`.
Trích lại frame tham chiếu: `python tools/ref_frames.py refs/ngoinha <Phần_1.html> <Phần_2.html>`.

## Cấu trúc
- `episode.js`: diễn viên (cậu bé mũ len đỏ áo hoodie vàng; mẹ tóc bím áo sọc mint khăn đỏ váy nâu; cha mũ đỏ áo
  khoác navy; cha trên đảo có râu, áo/quần rách), 2 nhà (gia đình đỏ mái ngọc / nhà minh hoạ sáng mái xanh), đạo cụ.
- `shots.js`: 1 dòng/shot, dữ liệu thuần, `f: [f0, f1]` khớp frame gốc.
- Engine: `engine/house.js` (nhà + 4 chân IK 2 đoạn, dáng đi chéo, chân neo đất, chui ra/đứng/rũ/khuỵu),
  `engine/envs.js` (15 bối cảnh + preset ánh sáng), `engine/props.js`, `engine/postcards.js` (thiếp canvas, chữ
  nguyên văn lời kể), `engine/fx.js` (tuyết, mưa, bụi, thiếp rơi, chớp — tất định), `engine/shots.js` (đạo diễn),
  `engine/timeline.js`.

## Đã kiểm
- Đủ 5.132 frame, 30 fps, 1080×1920; audio AAC đồng bộ từ 0 s.
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
