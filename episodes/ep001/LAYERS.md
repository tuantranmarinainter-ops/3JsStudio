# Các lớp của tập ep001

Sửa lớp nào → chỉ sửa file của lớp đó → chạy **một lệnh** dựng lại lớp đó (tự gộp lại `dist/ep001.html`):

```bash
node tools/build.mjs ep001 <lớp>        # vd: node tools/build.mjs ep001 khoanh-khac
```

| Lớp (tên gọi khi nói với Claude) | Gồm | File dữ liệu cần sửa | Lệnh dựng lại | Bật/tắt trong trình phát |
|---|---|---|---|---|
| **canh** — cảnh & model | bối cảnh, model, nhân vật, nhà, camera, cắt cảnh; thị trấn: dãy nhà phía sau + xe đậu/xe chạy/người đi bộ (`engine/townlife.js`, trong env `town` của `engine/envs.js`) | `shots.js` (shot, camera, cú cắt), `episode.js` (diễn viên, màu da `SKIN`, nhà, đạo cụ), `engine/*.js`, `assets/` | `build.mjs ep001 canh` (tự tính lại bước chân + tiếng nền) | — |
| **hieu-ung-hinh** — hiệu ứng hình | màu theo cảnh, bloom, mờ hậu cảnh, tối viền, viền nhân vật, mưa bão, quần áo cũ/bụi, vân sần/bụi công trình | `engine/post.js` (`GRADES`, `FX_DEFAULTS`, thông số từng hiệu ứng); vân bụi: `engine/grunge.js` (`FRAG_COLOR.char` / `.build`) | `build.mjs ep001 hieu-ung-hinh` | 8 ô "Hiệu ứng hình" |
| **phu-de** — phụ đề | chữ phụ đề Việt / Anh, phông, vị trí | `captions.js` (Việt), phụ đề Anh sinh theo giọng; kiểu chữ: `#cap` trong `index.html` | `build.mjs ep001 phu-de` | ô "Phụ đề" |
| **giong** — giọng đọc | 22 giọng Việt CapCut + giọng Anh Microsoft | `narration.txt` (lời Việt), `voices/` (`tools/voices_build.py`) | tạo giọng: `python tools/voices_build.py ep001 vi\|en`; rồi `build.mjs ep001 giong` | ô "Ngôn ngữ", "Giọng", "Giọng đọc" |
| **tieng-anh** — lời kể tiếng Anh | câu tiếng Anh theo từng nhịp cắt cảnh | `tools/en/en_ep001.py` | `build.mjs ep001 tieng-anh` | ô "Ngôn ngữ: English" |
| **nen** — tiếng nền | gió, sóng, mưa, côn trùng, phòng bếp… theo bối cảnh | `sfx/layers.json` → `nen` (bối cảnh → âm thanh, âm lượng, mờ đầu/cuối) | `build.mjs ep001 nen` | lớp "Tiếng nền" + thanh âm lượng |
| **buoc-chan** — bước chân nhà | tiếng "rầm" lúc chân nhà chạm đất | `sfx/layers.json` → `buoc-chan` (âm thanh, độ lớn gần/xa); mốc: `sfx/steps.json` (tự tính) | `build.mjs ep001 buoc-chan` | lớp "Bước chân nhà" + thanh âm lượng |
| **khoanh-khac** — tiếng động theo cảnh | cửa, sóng vỗ, cá voi, giấy, sấm, tiếng thở… | `sfx/cues_s001-s050.json`, `cues_s051-s100.json`, `cues_s101-s145.json` (`t`, `name`, `vol`, `dur`, tuỳ chọn `offset` giây bỏ đầu file, `align: "peak"` đặt đỉnh tiếng đúng t) | `build.mjs ep001 khoanh-khac` | lớp "Tiếng động theo cảnh" + thanh âm lượng |
| **nhac** — nhạc nền | 4 bài CC BY (Blue Dot Sessions, Komiku, E. Erkut) ghép theo đoạn phim; tự hạ nhỏ khi có lời | `music/plan.json` (đoạn `from/to`, `track`, `offset`, `vol`, `fadeIn/fadeOut`); bài: `assets/music/` | `build.mjs ep001 nhac` | lớp "Nhạc nền" + thanh âm lượng; ô "Giảm nhạc khi có lời" |

- `tieng-dong` = nen + buoc-chan + khoanh-khac; `all` = mọi lớp.
- Âm lượng từng lớp tiếng động chỉnh ngay trong trình phát (0–150%), **không cần dựng lại**; muốn đổi mặc định thì sửa `gain` trong `sfx/layers.json`.
- Âm thanh tải từ Openverse/Freesound, chỉ **CC0 / CC BY** (`tools/sfx/fetch.py`, danh sách `assets/sfx/sfx_manifest.json`). **Ghi công khi đăng YouTube: `assets/sfx/CREDITS.md`** (+ `assets/CREDITS.md` cho model).
- Đổi một tiếng động cụ thể: sửa `name` của cue (cụm từ tiếng Anh cụ thể) → `build.mjs ep001 khoanh-khac` tự tải tiếng mới.
- Kiểm tra sau khi sửa: `node tools/look.mjs episodes/ep001/index.html --shots s054,s056` (hình), xuất thử đoạn ngắn trong trình phát (tiếng).
