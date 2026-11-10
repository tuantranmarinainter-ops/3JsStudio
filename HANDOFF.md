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
| Chụp frame không cần HyperFrames | `tools/snap.js` | Playwright + swiftshader; phục vụ three từ node_modules vì cloud chặn jsdelivr. Đã chạy được. |
| Sinh vật biển (8 GLB) + nước văng | `assets/special/sea/`, `assets/manifest.json`, `assets/CREDITS.md`, `engine/asset-preview.html`, `tools/fbx2glb.js` | Quaternius Fish Pack (CC0, FBX→GLB): dolphin, shark, manta_ray, fish1–3; Sketchfab (CC-BY-4.0, **phải ghi credit**): killer_whale (1 clip), sperm_whale (13 clip: SWIM, FASTER, IDLE, TURNLEFT, SWIMRIGHT, BREATHE, JUMP, JUMPSPLASH, EAT, ATTACK, HURT, DEATH; mặt nước gốc `water_y_native` = 4.283). Người dùng đã BỎ cá voi lưng gù (humpback) — không thêm lại. Nước văng khi nhảy: `engine/splash.js`. Manifest có `scale_to_m`, `forward: +z`. Animation: `mixer.setTime(t)`. Xem: `node tools/snap.js engine/asset-preview.html <out> 0 0.4 --three …` (`?prefix=sea/&clip=Swim`). |
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

### Nước văng (`engine/splash.js`, demo `engine/splash-demo.html`)
- `findSurfaceCrossings(THREE, root, mixer, clip, waterY)` lấy mẫu clip, tìm lúc tâm khung xương cắt mặt nước → `[{time, x, y, z, dir:'up'|'down', speed}]`. Gọi 1 lần sau khi tải (không trong lúc seek).
- `createSplash(THREE, {seed, scale})` (scale ≈ chiều dài con vật, m) → `setEvents(events)`, `update(tClip, loopDuration, pxScale)`: giọt nước (đạn đạo + cản), sương, vòng bọt + bọt loang, **gợn sóng tròn tính bằng công thức** (mesh `splash_ripples`, đặt chồng lên mọi mặt biển), **tia nước flipbook** 16 khung vẽ bằng canvas có seed (sprite `splash_sheet_i`, không cần file ảnh). Tối đa 6 lần cắt / clip. Hàm thuần của t.
- Cá nhà táng: đặt `root.position.y = -water_y_native * scale_to_m` → mặt nước tại y = 0. JUMP: lên 0.27 s / xuống 0.93 s; JUMPSPLASH: 0.27 s / 1.47 s. Demo chạy chậm `?speed=0.55` cho giống cá voi thật.
- Trang xem trên điện thoại (artifact riêng tư của người dùng): https://claude.ai/artifact/7qsQGfmu9hpi2phj2jhHud — GLB đóng gói thành `.js` base64 vì artifact không phục vụ `.glb`.

### Đại dương: Three.js Water Pro (người dùng đã CHỐT dùng làm đại dương)
- Sản phẩm TRẢ PHÍ, chỉ chạy **WebGPU** (V3: sóng GPU, bọt nhiều lớp, buoyancy, caustics). Chưa có trong repo — chờ người dùng mua và gửi file.
  Cloud chặn 80.lv nên chưa đọc được trang sản phẩm/giấy phép; khi có file: đọc LICENSE (được dùng trong video thương mại? được commit vào repo private?).
- Đã kiểm chứng: Chromium headless trong cloud CÓ WebGPU (`--enable-unsafe-webgpu`, adapter swiftshader, chậm). Cần kiểm tra HyperFrames truyền được cờ này cho trình duyệt render.
- Khi tích hợp: (1) thời gian sóng phải lấy từ t của hf-seek (tìm uniform/tham số time, không để nó tự chạy theo đồng hồ);
  (2) renderer WebGPU (`three/webgpu`) → kiểm tra adapter three của HyperFrames + `renderer.render` đồng bộ sau seek;
  (3) `splash.js` dùng ShaderMaterial GLSL → với WebGPURenderer cần viết lại bằng TSL/NodeMaterial hoặc render lớp nước văng bằng WebGL chồng lên.
- Đến lúc đó `winter.js#createWater` (Water.js) vẫn là mặt nước mặc định.

## Xem/kiểm tra cảnh 3D trong cloud
- Cloud chặn cả `sketchfab.com`, `api.sketchfab.com`, `*.itch.io` → asset ngoài: người dùng tải tay rồi gửi file (uploads), Claude chuyển đổi + ghi manifest.
- FBX → GLB: `node tools/fbx2glb.js in.fbx out.glb --three <deps>/node_modules/three` (giữ animation, không cần Blender). glTF → GLB / sửa GLB: `npx @gltf-transform/cli` (npm được phép).
- Chưa có quy ước UNITS_PER_M toàn cục (R6 cao 5.2 đơn vị ≈ trẻ 1.3 m → ~4 đơn vị/m; Kenney scale 1.0). Chốt khi làm `stage.js`/`town.js`.
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
