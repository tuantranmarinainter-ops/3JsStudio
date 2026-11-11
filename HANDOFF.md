# HANDOFF — bàn giao cho phiên Claude cloud mới

Đọc `CLAUDE.md` trước (luật dự án), rồi file này (trạng thái + việc tiếp theo). Người dùng nói tiếng Việt.

## Trạng thái (2026-11-10)

### Đã xong và đã kiểm chứng
| Phần | File | Ghi chú |
|---|---|---|
| Nhân vật R6 | `engine/r6.js`, `engine/r6-preview.html` | 15 animation, 8 biểu cảm, `randomLook(seed)`. Preview đã xem được trên điện thoại. `r6-preview.html` = trang mẫu + r6.js nhúng sẵn (tạo lại nếu sửa r6.js). |
| Giọng đọc Edge | `tools/tts.py` + workflow `tts-narration` | Chạy thật trên GitHub Actions (~40s / 5 câu). |
| Giọng đọc CapCut | `tools/voice_studio/` (engine Voice Studio của người dùng + SDK `vendor/capcut-tts-api`) | Chạy thật trên Actions, không cần secret. ~4–5 phút / 5 câu. Tập mẫu `episodes/_template/narration.*` đang dùng CapCut. |
| Tool phân tích video tham khảo | `tools/ref.py`, `tools/ref_remote.sh`, workflow `ref-analyze` | Đường ống chạy được, nhưng **YouTube chặn bot** → xem "Chờ người dùng". |

| HyperFrames | `package.json` (ghim `hyperframes@0.9.30`), `hyperframes.json`, `vendor/three` (r187), `vendor/gsap` (3.15.0) | Workspace gốc là project HyperFrames. npm chạy được ngay trong cloud (có Chrome + FFmpeg). |
| Sân khấu | `engine/stage.js` | Renderer 1080×1920, camera (`setCamera`, `orbit`), mặt trời đổ bóng theo điểm nhìn, `onFrame(t)` + `hf-seek`. |
| Mốc kiểm chứng | `episodes/_test_walk/index.html` | `npm run test:walk` → `output/test_walk.mp4` 1080×1920, 30 fps, 150 frame, ~35 s render. |

| ep001 "Ngôi nhà biết đi" | `episodes/ep001/` (README), `engine/house.js`, `envs.js`, `props.js`, `postcards.js`, `fx.js`, `shots.js`, `timeline.js` | Dựng theo tài liệu bàn giao của người dùng: 145 shot, 5132 frame, giọng CapCut từ SRT, phụ đề cụm chữ. `npm run render:ep001`. Sai lệch ghi trong README tập. |
| Skill hỗ trợ | `.claude/skills/{r6-anim,ref-model,scene-env,vfx3d}`, gói gốc `skills/fwjelaa/` | Phương pháp fwjelaa (Roblox/Blender) chuyển sang three.js. |

### Xuất video trên máy người dùng (2026-11-11 — người dùng chốt: KHÔNG render qua cloud)
- `npm run bundle:ep001` → `dist/<ep>.html` một file tự chứa (tools/bundle.mjs) + trình phát và nút **Xuất MP4**
  2K/1080p/4K (tools/export-ui.js: WebCodecs H.264 + AAC, mp4-muxer) chạy trong Chrome/Edge của người dùng.
- index.html của tập phải đặt `window.__stage = stage` (nút xuất đổi pixel ratio renderer) và `window.renderAt`.
- Trình phát có chọn **Tiếng Việt / English (Edge Andrew)**, bật/tắt **phụ đề** và **giọng đọc** (index.html: `setOptions`,
  `getOptions`; `engine/postcards.js#setPostcardLang` vẽ lại chữ bưu thiếp). Bản Anh: `tools/en/` (xem README tập).
- Cá voi/nước văng: asset + `engine/splash.js` lấy từ nhánh `ccr-c8a35e66-l14aqp` (phiên trước, chưa từng gộp vào ep001).
- Hiệu ứng hình bật/tắt: `engine/post.js` (vendor thêm `vendor/three/addons/postprocessing` + `shaders` bản r187);
  `stage.draw` móc vào renderAt, `envs.last` cho biết light/env/flash, `stage.target` cho mờ hậu cảnh.
- Nhiều giọng đọc: `tools/voices_build.py` (en / vi / sample / index). Đoạn nghe thử 69 giọng ở `output/nghe-thu/`.
  `voices/index.json` CHỈ tạo sau khi người dùng chốt danh sách giọng (bản chưa duyệt: `index.chua-duyet.json`).
- Giọng đã chốt và ghép (2026-11-11): 10 Việt + 11 Anh (`output/giong-da-chot.txt`, `voices/index.json`); giọng chậm đã bỏ,
  3 giọng bigtts ranh giới được canh bằng `tools/fit_voice.py`. Bảng repo 3D/WebGL: `docs/thu-vien-3d-webgl.md`.
- **Làm việc theo lớp**: `episodes/ep001/LAYERS.md` + `node tools/build.mjs ep001 <lớp>`. Tiếng động 3 lớp (nen, buoc-chan,
  khoanh-khac) → `sfx_<lớp>.ogg`, cấu hình `sfx/layers.json`, trộn `tools/sfx/mix.py`, tải `tools/sfx/fetch.py` (CC0/CC BY,
  ghi công `assets/sfx/CREDITS.md`), mốc chân nhà `tools/sfx/steps.mjs`.
- **Người dùng đã BỎ Three.js Water Pro (2026-11-11)** — không tích hợp, không nhắc lại. Đại dương dùng mặt nước hiện có
  (`engine/water.js` / envs ocean) + lớp `splash.js` chồng lên.
- Đã kiểm: cả tập 2K 5132 frame / 171,07 s, khung 13,5 / 60 / 120 s khớp trang gốc. Repo trên máy người dùng: `S:\3JS Studio`.
- Công cụ + skill mới (2026-11-11): `tools/doctor.mjs`, `tools/branches.sh`, `tools/look.mjs`, `tools/export-test.mjs`;
  skill `xuat-phim`, `giong-doc`, `kiem-tra-khung` (xem bảng "Công cụ" trong CLAUDE.md).

### Lưu ý kỹ thuật mới
- Composition render qua `-c episodes/<ep>/index.html` được phục vụ như ở gốc repo → **import trong index.html dùng
  đường dẫn tuyệt đối** (`/engine/...`, `/episodes/ep001/...`), không dùng `./`.
- Xem nhanh không qua HyperFrames: `tools/peek.mjs` (Playwright, `NODE_PATH=/opt/node-tools/node_modules`);
  so với gốc: `tools/sheet_ep.sh`.

### Chưa làm (theo thứ tự ưu tiên)
3. **`engine/town.js`**: thị trấn từ Kenney City Kit (Roads/Commercial/Suburban, CC0) theo seed; ghi `assets/manifest.json`.
4. **`engine/timeline.js` + `engine/shots.js`**: đọc `episode.js`, `shots.js`, `narration.json` (start/end từng câu);
   ~11 loại shot (xem CLAUDE.md).
5. **`episodes/_template/`**: `episode.js`, `shots.js`, `index.html` (hook chữ + phụ đề từ `narration.srt`).
6. **ep001** hoàn chỉnh (~140 shot, 2–3 phút) → contact sheet → render theo đoạn → ghép.
7. (Tuỳ chọn) trang duyệt asset GLB bằng `<model-viewer>` để người dùng xem trên điện thoại.

## Chờ người dùng
- **Secret `YT_COOKIES`** (cookies.txt từ tài khoản Google phụ) để `ref-analyze` tải được YouTube.
  Sau khi có: `tools/ref_remote.sh "ytsearch6:In This Town roblox story"` → đọc `refs/summary.md`, `refs/<id>/report.md`, sheets.
- Chưa chốt **ý tưởng tập 1** (luật / điểm yếu / twist / lời giải). Hỏi người dùng trước khi viết kịch bản dài.

## Lưu ý vận hành
- Remote đúng: `https://github.com/tuantranmarinainter-ops/3JsStudio` (tên cũ `3jsstudio` vẫn chuyển hướng).
- Mọi workflow tự commit kết quả → luôn `git pull --rebase origin main` trước khi push.
- Nếu phiên không ra mạng ngoài (YouTube, dịch vụ TTS…), dùng GitHub Actions như các workflow sẵn có.
- Cache TTS `.cache/tts/` không commit; Actions giữ bằng `actions/cache`.
- Không sửa logic trong `tools/voice_studio/*.py` (tool của người dùng) — bọc ngoài trong `tools/tts.py`.
- Không dùng logo/tên/mặt/asset chính thức của Roblox. Repo để **private** (SDK CapCut, cookie).
- Thử nhanh không cần mạng: `python tools/tts.py episodes/_template/narration.txt --dry`.
