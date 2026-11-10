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
