# HANDOFF — bàn giao cho phiên Claude cloud mới

Đọc `CLAUDE.md` trước (luật dự án), rồi file này (trạng thái + việc tiếp theo). Người dùng nói tiếng Việt.

## Trạng thái (2026-11-10)

### Đã xong và đã kiểm chứng
| Phần | File | Ghi chú |
|---|---|---|
| Nhân vật R6 | `engine/r6.js`, `engine/r6-preview.html` | 15 animation, 8 biểu cảm, `randomLook(seed)`. Preview đã xem được trên điện thoại. `r6-preview.html` = trang mẫu + r6.js nhúng sẵn (tạo lại nếu sửa r6.js). |
| Giọng đọc Edge | `tools/tts.py` + workflow `tts-narration` | Chạy thật trên GitHub Actions (~40s / 5 câu). |
| Giọng đọc CapCut | `tools/voice_studio/` (engine Voice Studio của người dùng + SDK `vendor/capcut-tts-api`) | Chạy thật trên Actions, không cần secret. ~4–5 phút / 5 câu. Tập mẫu `episodes/_template/narration.*` đang dùng CapCut. |
| Hiệu ứng mùa đông | `engine/winter.js`, `engine/winter-demo.html` | Trời Sky.js + IBL, mây khối, tuyết rơi (particle có seed), tuyết phủ (shader theo normal, dùng được cho mọi material), núi low-poly theo seed, hồ Water.js (normal map sinh bằng code). Demo 9s, 3 shot; đã kiểm chứng tất định (tua lui/tới ra cùng frame). Chi tiết: mục **Hiệu ứng môi trường** bên dưới. |
| Shader + bầu trời | `engine/shaders.js`, `engine/skies.js`, `engine/roblox-look.js`, `engine/shader-demo.html` | 10 kiểu: standard, roblox, anime (toon 3 bậc + viền inverted-hull + rim), anime2, flat, rim, hologram, dissolve, wobble, outline. 5 trời: day/sunset (Sky.js), cartoon/night/overcast (gradient shader + sao/trăng). Đã chụp thử mọi kiểu bằng swiftshader, không lỗi shader. Lưu ý: style tạo material MỚI (copy màu/texture) → `setColors()` của R6 sau khi áp style không đổi màu, cần `restore()` rồi áp lại. Hologram/dissolve tắt castShadow. |
| Chụp frame không cần HyperFrames | `tools/snap.js` | Playwright + swiftshader; phục vụ three từ node_modules vì cloud chặn jsdelivr. Đã chạy được. |
| Tool phân tích video tham khảo | `tools/ref.py`, `tools/ref_remote.sh`, workflow `ref-analyze` | Đường ống chạy được, nhưng **YouTube chặn bot** → xem "Chờ người dùng". |

### Chưa làm (theo thứ tự ưu tiên)
1. **Khởi tạo HyperFrames**: `npx hyperframes init` + `package.json` ghim phiên bản; thử ngay khung dọc 1080×1920
   (`data-width="1080" data-height="1920" data-fps="30"`).
2. **`engine/stage.js`**: renderer + camera + ánh sáng; `window.THREE = THREE`; nghe `hf-seek` → `render(t)`.
   Mốc kiểm chứng: render 5 giây R6 đi bộ ra MP4 dọc.
3. **`engine/town.js`**: thị trấn từ Kenney City Kit (Roads/Commercial/Suburban, CC0) theo seed; ghi `assets/manifest.json`.
4. **`engine/timeline.js` + `engine/shots.js`**: đọc `episode.js`, `shots.js`, `narration.json` (start/end từng câu);
   ~11 loại shot (xem CLAUDE.md).
5. **`episodes/_template/`**: `episode.js`, `shots.js`, `index.html` (hook chữ + phụ đề từ `narration.srt`).
6. **ep001** hoàn chỉnh (~140 shot, 2–3 phút) → contact sheet → render theo đoạn → ghép.
7. (Tuỳ chọn) trang duyệt asset GLB bằng `<model-viewer>` để người dùng xem trên điện thoại.

## Hiệu ứng môi trường (`engine/winter.js`) — người dùng đã chốt hướng này
Hướng đã chốt với người dùng: **giữ phong cách khối (R6 + Kenney), làm "thật" bằng trời / ánh sáng / khí quyển**
(hybrid), KHÔNG chuyển sang asset realistic toàn bộ. Asset realistic chỉ cân nhắc cho vật thể twist (`assets/special/`).

API (mọi hàm nhận `THREE` làm tham số giống `r6.js`; addon truyền vào để module không phụ thuộc đường import):
| Hàm | Trả về | Ghi chú |
|---|---|---|
| `createSky(THREE, Sky, {elevation, azimuth, turbidity, rayleigh})` | `{object, sunDir, setSun, bakeEnvironment(renderer)}` | `elevation` độ: 2–8 hoàng hôn, 10–20 chiều đông, 60 trưa. `scene.environment = sky.bakeEnvironment(renderer)` → IBL. Đặt `DirectionalLight` theo `sky.sunDir`. |
| `createClouds(THREE, {seed, count, area, height, speed})` | `{object, update(t)}` | Mây khối icosahedron, trôi theo x, vòng lặp theo `area`. |
| `createSnowfall(THREE, {seed, count, area, center, size, speed, sway, opacity})` | `{object, material, update(t)}` | Points + shader; vị trí = f(seed, t). Lớp gần camera: đặt `material.uniforms.uCenter` theo camera mỗi frame. |
| `applySnowCover(THREE, material, {amount, min, max, color})` | uniforms (`uSnowAmount`…) | Gắn vào material có sẵn (Kenney/GLB) qua `onBeforeCompile`. Đổi `uSnowAmount.value` theo t → tuyết dày dần. Gọi TRƯỚC lần render đầu. |
| `createMountains(THREE, {seed, size, flat, rise, peak, snowLine})` | `{object, heightAt(x,z)}` | Terrain low-poly; bán kính `flat` phẳng (y=0) cho thị trấn, nên nó cũng là mặt đất tuyết. `heightAt` để đặt vật lên núi. |
| `createWater(THREE, Water, {radius / geometry, sunDir, color, distortion, speed})` | `{object, update(t)}` | Water.js; normal map sinh bằng code (`makeWaterNormals`) → không tải file. |
| `createHouse`, `createPine` | `{object, materials}` | Đạo cụ TẠM; thay bằng Kenney khi có `town.js`. |
| `rng(seed)`, `makeNoise2D(seed)`, `fbm(noise, x, y, oct, ridged)` | | Ngẫu nhiên/noise có seed — dùng chung cho cả engine. |

Thông số demo đã chỉnh qua contact sheet (dùng làm mặc định khi dựng tập mùa đông):
tone mapping ACES exposure 0.6, `FogExp2('#b9c7da', 0.0011)`, mặt trời elevation 9 / azimuth 205, núi `flat 240 / rise 460 / peak 170`
(peak cao hơn → núi che hết trời trong khung dọc), FOV 50, camera far 30000 (Sky scale 10000).

Hiệu năng (cloud không GPU, swiftshader): ~0.6–1 s/frame 1080×1920. Tốn nhất: Water (render phản chiếu thêm 1 lần)
và ~9600 hạt tuyết. Shot không thấy hồ → `water.object.visible = false`.

Chưa làm: ghép vào `stage.js`/HyperFrames (demo hiện tự có renderer); Kenney + tuyết phủ; dấu chân trên tuyết; hơi thở/khói ống khói.

## Xem/kiểm tra cảnh 3D trong cloud
- `cdn.jsdelivr.net` bị proxy chặn (403) trong cloud → trang dùng importmap CDN (để người dùng mở trên điện thoại),
  còn khi chụp thì `tools/snap.js` chặn request CDN và phục vụ `three` từ node_modules cục bộ:
  `npm i --prefix <scratch>/deps three@0.160.0` rồi
  `node tools/snap.js engine/winter-demo.html <scratch>/out 0.5 4.5 8 --three <scratch>/deps/node_modules/three`.
- Quy ước trang demo: `window.renderAt(t)`, `window.__ready = true`, `?capture=1` ẩn UI, nghe `hf-seek`.
- Kiểm tra tất định: chụp cùng một t sau khi đã tua đi chỗ khác → ảnh phải giống hệt (winter-demo: sai khác 0).

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
