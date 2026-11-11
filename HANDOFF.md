# HANDOFF — bàn giao cho phiên Claude cloud mới

Đọc `CLAUDE.md` trước (luật dự án), rồi file này (trạng thái + việc tiếp theo). Người dùng nói tiếng Việt.

## Phiên 2026-11-12 (v4 + CORE) — TẠM DỪNG theo yêu cầu người dùng, nhánh `claude/ep1-v2`
**Nguyên tắc người dùng chốt:** mọi thứ học từ nguồn tham khảo (2 game Fable 5.2 *Saltline*, *Tidewright*; repo
`thuann-vn/claude-3d-animated-shorts`) phải thành **code LÕI dùng lại cho mọi tập**, không sửa lẻ ep001. Tính năng mới luôn có ô bật/tắt.
Hướng dẫn lõi: **`docs/core.md`**. Danh mục kỹ thuật + trạng thái: **`docs/tham-khao-game.md`**.
Nguồn tham khảo (chỉ có trong cloud, mất khi hết phiên): `scratchpad/games/tidewright.html` (10220 dòng, mã đầy đủ, người dùng
lấy từ artifact LG3TnqwofP3VfPcShHy8iB), `scratchpad/games/src-salt/index.html` (git clone realcodebear/saltline-fable-5.2),
`scratchpad/ref/c3d` (git clone thuann-vn/claude-3d-animated-shorts). Phiên mới: clone lại 2 repo; Tidewright xin lại người dùng.

| Phần | File | Trạng thái |
|---|---|---|
| Ánh sáng môi trường (IBL) | `engine/ibl.js`, ô **ibl** | ✅ kiểm: bếp luma 129–136 (interior 0.3, hemi ×0.6) |
| Đồ quét Poly Haven | `engine/scans.js`, `assets/polyhaven/`, bếp/phòng ngủ, ô **scans** | ✅ (đã bỏ khung tranh lỗi) |
| Sóng CPU=GPU, vật nổi khớp sóng, bọt/bóng quanh thân, vệt ướt, sự kiện mặt nước | `engine/water.js` (sample/setHull/setEvents/setLook), `engine/floating.js` (floatHull/floatPose/wetline), ô **sea2** | ✅ kiểm tất định (diff 0); s095–s097 nhà nổi, s023 tàu + bố trên boong |
| Lõi biển: đồng hồ tự khớp, `float`/`seaEvents`/`seaWeather` trong shot | `engine/sea.js`, `engine/shots.js` (prepareSea), `engine/envs.js` makeSea, `engine/lights.js` | ✅ |
| Thang thời tiết biển 10 kiểu (lang, nang, gio-nhe, u-am, mua, giong, bao, dem-trang, dem-bao, bang) + env `'sea'` | `engine/seaweather.js`, `engine/envs/openSea.js`, ô **seaWx**, thử: `engine/sea-lab.html?wx=giong&wx2=bao&mix=0.5` | ✅ ảnh: `output/look/agentD/sealab/sheet.jpg` |
| Cá voi: kịch bản dạng dữ liệu, vòng sóng khi nhảy/rơi, da ướt | `engine/whales.js` (createOceanLife plan, seaEvents, applyWetSkin), `engine/splash.js`, dữ liệu `OCEAN_PLAN_EP001` trong `engine/envs/ocean.js` | 🟡 agent bị dừng giữa chừng: chạy được (ảnh `output/look/handoff/sheet.jpg`), CHƯA kiểm tất định + chưa chỉnh màu biển ban ngày (s054 tối hơn B: luma 98 — người dùng muốn **xanh trong**) |
| Tranh sơn dầu Kuwahara | `engine/painterly.js`, ô **paint** (mặc định TẮT) | 🟡 đã nối vào post.js, CHƯA chụp kiểm |
| Vỏ thuyền dựng bằng code (skiff/ship/raft) | `engine/hull.js`, `engine/hull-lab.html` | 🟡 đang viết dở, chưa kiểm; chưa nối vào tập |
| AO (học repo c3d) | `engine/ao.js` | ⬜ file dở, CHƯA nối post.js |
| Bày đồ theo dữ liệu `furnish()` + nội thất CC0 KayKit/Kenney (từ repo c3d) | `engine/furnish.js` (chưa có) | ⬜ chưa bắt đầu — kế hoạch: `furnish(H, parent, layout)` với `on:`/`fit:`/`wall:`, bếp/phòng ngủ chuyển sang mảng layout, thêm manifest + ghi công |
| Danh mục kỹ thuật 3 nguồn | `docs/tham-khao-game.md` | 🟡 có 2 game; còn thiếu phần repo c3d (SMAA, n8ao, viền cọ, IK, mặt vẽ, phụ đề từng chữ…) |

**Việc tiếp theo (thứ tự):** 1) chỉnh biển ban ngày s052–s056 xanh trong (preset `nang`/`water.setLook`), `--det` cảnh cá voi 65.2–68 s;
2) kiểm `paint` on/off (s054, s021); 3) hoàn tất `hull.js` + chụp `hull-lab.html`; 4) `furnish.js` + nội thất CC0; 5) nối `ao.js` (ô riêng, mặc định tắt);
6) bổ sung docs; 7) `npm run bundle:ep001` → `dist/ep1_v4.html`, giao link `S:\3JS Studio\dist\ep1_v4.html` + `file:///S:/3JS%20Studio/dist/ep1_v4.html`.
Lưu ý: s095 nhà chúi gần giới hạn `maxPitch` 0.2 cả shot — hỏi người dùng có giảm không. Floats đặt trước env update → env nên khai `e.seaEvents(t)` để vật nổi thấy sóng cá voi cùng khung.
Chạy kiểm: `BROWSER=chromium GL=swiftshader node tools/look.mjs episodes/ep001/index.html --t … --out output/look/<tên>` (`--det`, `--ab`, `--luma`).

## Trạng thái (2026-11-10)

### Đã xong và đã kiểm chứng
| Phần | File | Ghi chú |
|---|---|---|
| Chất liệu thật v3 (2026-11-11) | `engine/materials.js`, `tools/mat-inventory.mjs`, ô **mats** trong `engine/post.js` | 38 chất liệu (gỗ, gỗ sơn, vỏ cây, giấy, vải, len, tóc, da, sơn xe, kim loại mạ, sắt sơn tróc gỉ, sắt, cao su, nhựa, kính, men sứ, gạch men, trái cây, xơ dừa, ngói, gạch, vữa, bê tông, nhựa đường, sơn kẻ đường, đá, cát, đất, cỏ, lá, xương rồng, tuyết, băng, san hô, vỏ cứng, lông vũ, lông thú, da ướt, hữu cơ; mặc định 'mờ chung' chống bóng nhựa). Phân loại theo tên object/vật liệu (`MAT_RULES`), gán tay bằng `userData.matKind`. Mỗi chất liệu: vân sinh bằng toán + nhám/kim loại đúng vật lý + bump + sheen/lấp lánh; vân mịn tự tắt theo khoảng cách (`aa(f)`). Kiểm kê: `node tools/mat-inventory.mjs` → cột kind. Đã kiểm tất định. Kim loại để metalness ≤ 0,75 vì cảnh trong nhà ít ánh sáng môi trường (metal 1 → đen). |
| Chi tiết v2 (2026-11-11) | `engine/r15.js` (paintFolds, buildHairV2, setDetail), `engine/grunge.js` (aged), `engine/post.js` (3 ô bật/tắt), `episodes/ep001/index.html` | 3 ô mới trong "Hiệu ứng hình": **folds** nếp vải vẽ sẵn trên atlas áo quần; **hair2** tóc cụm low-poly lởm chởm (mẹ) + tóc lòi dưới mũ len (hero, bố); **aged** nhà cũ bán thực (sơn tróc chỉ trên tường đứng, sơn phai, ố dưới mái, rêu chân tường) — CHỈ áp cho nhà (`applyGrunge(house,'build',{aged:true})`). Tắt cả 3 = giống bản trước. Bản gộp: `dist/ep1_v2.html`. Lưu ý: s022 lệch tất định sẵn từ trước (không do v2). |
| Nhân vật R6 | `engine/r6.js`, `engine/r6-preview.html` | 15 animation, 8 biểu cảm, `randomLook(seed)`. Preview đã xem được trên điện thoại. `r6-preview.html` = trang mẫu + r6.js nhúng sẵn (tạo lại nếu sửa r6.js). |
| Giọng đọc Edge | `tools/tts.py` + workflow `tts-narration` | Chạy thật trên GitHub Actions (~40s / 5 câu). |
| Giọng đọc CapCut | `tools/voice_studio/` (engine Voice Studio của người dùng + SDK `vendor/capcut-tts-api`) | Chạy thật trên Actions, không cần secret. ~4–5 phút / 5 câu. Tập mẫu `episodes/_template/narration.*` đang dùng CapCut. |
| Hiệu ứng mùa đông | `engine/winter.js`, `engine/winter-demo.html` | Trời Sky.js + IBL, mây khối, tuyết rơi (particle có seed), tuyết phủ (shader theo normal, dùng được cho mọi material), núi low-poly theo seed, hồ Water.js (normal map sinh bằng code). Demo 9s, 3 shot; đã kiểm chứng tất định (tua lui/tới ra cùng frame). Chi tiết: mục **Hiệu ứng môi trường** bên dưới. |
| Chụp frame không cần HyperFrames | `tools/snap.js` | Playwright + swiftshader; phục vụ three từ node_modules vì cloud chặn jsdelivr. Đã chạy được. |
| Sinh vật biển (8 GLB) + nước văng | `assets/special/sea/`, `assets/manifest.json`, `assets/CREDITS.md`, `engine/asset-preview.html`, `tools/fbx2glb.js` | Quaternius Fish Pack (CC0, FBX→GLB): dolphin, shark, manta_ray, fish1–3; Sketchfab (CC-BY-4.0, **phải ghi credit**): killer_whale (1 clip), sperm_whale (13 clip: SWIM, FASTER, IDLE, TURNLEFT, SWIMRIGHT, BREATHE, JUMP, JUMPSPLASH, EAT, ATTACK, HURT, DEATH; mặt nước gốc `water_y_native` = 4.283). Người dùng đã BỎ cá voi lưng gù (humpback) — không thêm lại. Nước văng khi nhảy: `engine/splash.js`. Manifest có `scale_to_m`, `forward: +z`. Animation: `mixer.setTime(t)`. Xem: `node tools/snap.js engine/asset-preview.html <out> 0 0.4 --three …` (`?prefix=sea/&clip=Swim`). |
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

### Đại dương
- Người dùng đã BỎ Three.js Water Pro (2026-11-11). Mặt nước: `engine/water.js` (ocean env) + lớp `splash.js` chồng lên.

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
