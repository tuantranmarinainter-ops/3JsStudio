# Thư viện JS/WebGL cho dựng 3D, shader, VFX — đánh giá cho pipeline "Ở thị trấn này"

Kiểm tra ngày **2026-11-11** qua GitHub API (giấy phép, sao, lần push cuối, archived) và npm registry. Số sao làm tròn. Pipeline: three.js r187 thuần + WebGL2, mọi animation là hàm thuần của `t`, xuất khung bằng WebCodecs trong trình duyệt, không build step bắt buộc (vendor/three).

Quy ước "Lưu ý tích hợp": **stateful** = có `update(delta)` giữ trạng thái, muốn tất định khi tua thì phải mô phỏng lại từ 0 hoặc dùng bước cố định.

## 1. Editor / engine

| Repo | Giấy phép | ★ | Cập nhật | Là gì | Dùng cho phim thế nào | Lưu ý tích hợp |
|---|---|---|---|---|---|---|
| [mrdoob/three.js](https://github.com/mrdoob/three.js) (thư mục `editor/`) | MIT | 118k | 2026-11-10 | Editor cảnh chính chủ chạy trên web (`editor/index.html`), import/export glTF | Bố trí nhà/đạo cụ bằng chuột, xuất JSON/GLB rồi nạp vào `town.js`; xem nhanh asset | Editor đứng riêng, không biết `hf-seek`; chỉ dùng làm công cụ soạn thảo, không nhúng vào player |
| [BabylonJS/Babylon.js](https://github.com/BabylonJS/Babylon.js) | Apache-2.0 | 26k | 2026-11-11 | Engine đầy đủ, có Node Material Editor, Node Geometry Editor, Node Render Graph, Inspector | Node Material Editor/NGE là "Shader Graph/Geometry Nodes" miễn phí chạy web — có thể xuất GLSL tham khảo | Engine khác three.js, không trộn được; chỉ dùng như sandbox thiết kế shader rồi viết lại sang GLSL/TSL |
| [BabylonJS/Editor](https://github.com/BabylonJS/Editor) | Apache-2.0 | 1.1k | 2026-11-06 | Editor kiểu Unity cho Babylon (Electron) | Tham khảo UX; không dùng được với three.js | Gắn chặt Babylon + Electron: **không áp dụng** |
| [playcanvas/engine](https://github.com/playcanvas/engine) | MIT | 17k | 2026-11-11 | Engine WebGL2/WebGPU, nhẹ, gaussian splat | Tham khảo kỹ thuật (post, particle GPU) | Engine khác, không trộn với three.js |
| [playcanvas/editor](https://github.com/playcanvas/editor) | MIT | 1.4k | 2026-11-10 | **Có**, editor đã mã nguồn mở (MIT); frontend, backend vẫn là dịch vụ PlayCanvas | Chỉ tham khảo UI | Cần backend/đám mây của PlayCanvas; gần như không tự host được, và là engine khác |
| [needle-tools/needle-engine-support](https://github.com/needle-tools/needle-engine-support) | Không có (docs); lõi `@needle-tools/engine` trên npm không ghi giấy phép OSS | 610 | 2026-11-07 | Repo tài liệu/hỗ trợ của Needle Engine (three.js + Unity/Blender workflow). Mã engine không mở trong repo này (mẫu ở `needle-engine-samples`) | Có luồng Unity→three.js, nhưng cần Unity | Giấy phép thương mại/không rõ, kéo Unity vào: **không phù hợp** |
| [polygonjs/polygonjs](https://github.com/polygonjs/polygonjs) | MIT | 830 | 2026-08-08 | Node-based 3D (kiểu Houdini) trên three.js, có editor | Dựng procedural (rải nhà, cây) bằng node graph | Editor + runtime riêng, build step, hệ sự kiện/tick riêng; muốn tất định phải bọc tay. Nặng cho nhu cầu hiện tại |
| [pmndrs/triplex](https://github.com/pmndrs/triplex) (đã chuyển từ `trytriplex/triplex`) | Không khai báo | 1.3k | 2026-06-11 | Editor trực quan cho React Three Fiber (VS Code/standalone) | Không | **Chỉ React/R3F**: loại |
| [Hubs-Foundation/Spoke](https://github.com/Hubs-Foundation/Spoke) (đã chuyển từ `mozilla/Spoke`) | NOASSERTION (MPL-2.0 theo dự án Hubs) | 680 | 2026-10-29 | Editor cảnh cho Hubs (đã chuyển thành cộng đồng) | Không | Gắn với hệ Hubs/A-Frame, React, định dạng riêng: loại |
| [theatre-js/theatre](https://github.com/theatre-js/theatre) | Apache-2.0 | 13k | **2024-08-14** | Studio keyframe/timeline cho three.js, đối tượng animatable | Dựng đường camera/keyframe trực quan | Hai năm không push (npm `@theatre/core` 0.7.2). Timeline của nó là hàm thuần của vị trí playhead (`sequence.position = t`) nên tất định, nhưng dự án gần như ngừng: chỉ nên thử nếu cần editor camera, đừng phụ thuộc lâu |

## 2. Dựng mô hình / hình học

| Repo | Giấy phép | ★ | Cập nhật | Là gì | Dùng cho phim thế nào | Lưu ý tích hợp |
|---|---|---|---|---|---|---|
| [JannisX11/blockbench](https://github.com/JannisX11/blockbench) | GPL-3.0 | 6.2k | 2026-11-05 | Editor mô hình khối vuông (low-poly/pixel), animation, xuất glTF; có plugin | Rất hợp phong cách Roblox: dựng đạo cụ/nhà khối, vẽ texture pixel, xuất GLB; có animation keyframe | Là ứng dụng riêng (GPL áp cho chính app, không lây sang file GLB bạn xuất). Cần tay: xuất GLB → `assets/special/` + manifest. Plugin glTF/R15 tùy chọn, cần kiểm tra từng cái |
| [stephomi/sculptgl](https://github.com/stephomi/sculptgl) | MIT | 1.5k | 2026-01-17 | Công cụ điêu khắc trên web | — | **Archived**: loại |
| [gkjohnson/three-bvh-csg](https://github.com/gkjohnson/three-bvh-csg) | MIT | 960 | 2026-09-27 | Boolean (cộng/trừ/giao) mesh bằng BVH, three.js thuần | Đục cửa sổ/cửa vào khối nhà, cắt đạo cụ lúc init (như hố, hang) | Hàm thuần (đầu vào → mesh), chạy lúc init rồi cache; không ảnh hưởng tất định. Cần three-mesh-bvh |
| [gkjohnson/three-mesh-bvh](https://github.com/gkjohnson/three-mesh-bvh) | MIT | 3.6k | 2026-11-10 | BVH cho raycast/truy vấn không gian nhanh | Đặt đồ lên mặt đất, né va chạm khi rải dân/cây theo seed, raycast camera | Tất định, thuần; thêm `computeBoundsTree` vào geometry. Rất nhẹ |
| [gkjohnson/three-gpu-pathtracer](https://github.com/gkjohnson/three-gpu-pathtracer) | MIT | 2k | 2026-11-10 | Path tracer GPU cho three.js | Khung "hero" / poster / bưu thiếp chất lượng cao | Hội tụ theo số mẫu, không real-time; nặng, khung dài ~hàng giây. Dùng cho ảnh tĩnh, không cho cả phim |
| [donmccurdy/glTF-Transform](https://github.com/donmccurdy/glTF-Transform) | MIT | 2.1k | 2026-10-20 | Thư viện/CLI chỉnh glTF: nén, dedup, gộp mesh, texture resize/KTX2 | Giảm dung lượng GLB Kenney/Polyfork, gộp vật liệu, giữ HTML cuối nhỏ | Công cụ Node ngoại tuyến (`npx @gltf-transform/cli optimize`), không đụng runtime. Rủi ro thấp |
| [kovacsv/Online3DViewer](https://github.com/kovacsv/Online3DViewer) | MIT | 3.8k | 2026-06-24 | Viewer web đọc nhiều định dạng (obj, fbx, step, 3ds…) | Chuyển đổi/xem nhanh định dạng lạ trước khi cho vào pipeline | Dùng như tiện ích ngoại tuyến; trùng một phần `tools/fbx2glb.js` và three.js loaders |
| [gkjohnson/three-edge-projection](https://github.com/gkjohnson/three-edge-projection) (thêm) | MIT | 360 | 2026-10-29 | Chiếu/làm phẳng cạnh nhìn thấy của mesh | Viền nét (line art) kiểu truyện tranh cho cảnh tĩnh | Không real-time cho cảnh động; ngách |

## 3. Shader / VFX / hậu kỳ

| Repo | Giấy phép | ★ | Cập nhật | Là gì | Dùng cho phim thế nào | Lưu ý tích hợp |
|---|---|---|---|---|---|---|
| [patriciogonzalezvivo/lygia](https://github.com/patriciogonzalezvivo/lygia) | NOASSERTION (Prosperity/Patron — miễn phí phi thương mại, thương mại cần giấy phép riêng) | 3.5k | 2026-10-24 | Thư viện hàm GLSL/WGSL (noise, SDF, màu, khử răng cưa, blur, toon) | Nguồn hàm shader: noise, ramp màu, SDF | **Giấy phép là điểm cần xem**: phim đăng YouTube kiếm tiền có thể là "thương mại". Kiểm tra LICENSE trước khi chép. Dùng `#include` cần bộ resolver (hoặc dán hàm vào) |
| [FarazzShaikh/THREE-CustomShaderMaterial](https://github.com/FarazzShaikh/THREE-CustomShaderMaterial) | MIT | 1.4k | 2025-10-12 | Mở rộng vật liệu có sẵn (Standard/Toon…) bằng GLSL hook mà vẫn giữ ánh sáng/bóng | Thêm gió lắc cỏ/thông, sóng biển, dissolve lên MeshStandardMaterial | Tất định nếu uniform `uTime` đặt từ `t`. Có bản vanilla (không cần React). Tương thích three mới cần thử với r187 (lần push cuối 1 năm trước) |
| [pmndrs/postprocessing](https://github.com/pmndrs/postprocessing) | Zlib | 3k | 2026-11-01 | Bộ hậu kỳ gộp pass hiệu quả: bloom, SMAA, SSAO, outline, DoF, LUT, vignette… | Bloom, DoF, LUT màu, viền Outline, chromatic aberration cho cảnh nặng cảm xúc | Vanilla three.js, thuần theo khung (không stateful, trừ TAA/motion blur). Đã có `engine/post.js`; so sánh trước khi thay. Phiên bản cần khớp three r187 |
| [Alchemist0823/three.quarks](https://github.com/Alchemist0823/three.quarks) | MIT | 1.2k | 2026-05-21 | Hệ hạt (particle) + editor VFX cho three.js | Khói, tuyết, bụi, tia lửa, nước bắn | **Stateful** (`update(delta)`): phải mô phỏng lại từ 0 với bước cố định và cache theo `t`, hoặc tự viết hàm thuần cho hạt (`engine/fx.js` hiện hợp lý hơn). Chỉ lấy ý tưởng/behaviors |
| [shader-park/shader-park-core](https://github.com/shader-park/shader-park-core) | MIT | 830 | 2026-10-05 | Viết SDF raymarch bằng JS-DSL, có sinh GLSL cho three.js | Hình khối "lạ" cho twist (cầu tan chảy, vật thể SDF) | Raymarch tốn GPU; uniform thời gian từ `t` là tất định. Ngách, dùng cho 1–2 shot |
| three.js TSL ([docs](https://threejs.org/docs/pages/TSL.html), nằm trong `three/tsl`) | MIT | (thuộc three.js) | 2026-11-10 | Ngôn ngữ shader node bằng JS, biên dịch ra WGSL/GLSL; `NodeMaterial`, `MeshToonNodeMaterial` | Viết shader một lần chạy cả WebGL2 (qua `WebGPURenderer` fallback) và WebGPU; có sẵn noise, toon, hậu kỳ node | Với **WebGL2 thuần** hiện tại cần `WebGPURenderer` ở chế độ WebGL backend — đổi renderer là việc lớn. Thử trước ở viewer tách riêng |
| three.js examples: toon/outline (`MeshToonMaterial`, `OutlineEffect`, `OutlinePass`) | MIT | (thuộc three.js) | 2026-11-10 | Vật liệu toon + viền trong `examples/jsm` | Nhân vật R15 có viền đen kiểu hoạt hình, ánh sáng bậc thang | Đã nằm trong vendor/three; `OutlineEffect` render lại mesh (tốn gấp đôi draw) nhưng thuần theo khung |
| [boytchev/tsl-textures](https://github.com/boytchev/tsl-textures) (thêm) | MIT | 270 | 2026-09-09 | Bộ texture thủ tục viết bằng TSL (gỗ, đá, mây, marble…) | Texture không cần ảnh cho tường/đất/nước | Cần TSL/WebGPURenderer (xem dòng TSL); kiểm tra đường WebGL |
| [N8python/n8ao](https://github.com/N8python/n8ao) (thêm) | CC0-1.0 | 500 | 2026-08-10 | SSAO chất lượng cao, ổn định theo thời gian, ra pass cho three/postprocessing | Bóng tiếp xúc ở khe nhà, gầm xe: khối vuông "chìm" đẹp hơn | Tạo hạt nhiễu theo khung; thuần nếu seed cố định. Tích hợp qua `EffectComposer` |
| [FarazzShaikh/glNoise](https://github.com/FarazzShaikh/glNoise) (thêm) | MIT | 255 | 2025-06-17 | Hàm noise GLSL (simplex, curl, fbm…) đóng gói cho three | Nguồn noise MIT thay lygia, tránh vướng giấy phép | Nhỏ, thuần; chỉ dán hàm vào `onBeforeCompile` |

## Đề xuất thử trước

**1. pmndrs/postprocessing (kèm N8AO)**
- Tích hợp: thêm `EffectComposer` vào `engine/stage.js` sau bước `renderer.render()` trong handler `hf-seek`; các pass: SMAA, Bloom nhẹ, Vignette, LUT màu theo env. Đọc `engine/post.js` hiện có để không trùng.
- Tất định: pass chỉ phụ thuộc khung hiện tại; tắt TAA/motion blur; nếu có noise dùng seed cố định (N8AO: cố định `frame`).
- Bật/tắt: cờ `?fx=0` hoặc nút "Hậu kỳ" ở player gọi `composer.enabled`/fallback `renderer.render`; ghi cờ vào `EPISODE.post`.

**2. THREE-CustomShaderMaterial (bản vanilla) + glNoise**
- Tích hợp: bọc `MeshStandardMaterial` của cỏ, thông tuyết, nước bằng `CustomShaderMaterial`; vertex hook lắc gió dùng simplex từ glNoise (chép hàm MIT).
- Tất định: uniform `uTime` chỉ ghi từ `e.detail.time` trong `hf-seek`; không dùng `clock`.
- Bật/tắt: `material.userData.wind = true`, player có toggle "Gió/sóng" gán `uAmp = 0`. Kiểm tra bản mới nhất chạy với r187 trước (push cuối 2025-10).

**3. glTF-Transform (ngoại tuyến) + three-mesh-bvh**
- Tích hợp: script `tools/optimize-glb.mjs` chạy `@gltf-transform/cli optimize` (dedup, weld, texture resize) cho `assets/kenney|polyfork|special`, ghi lại kích thước vào `assets/manifest.json`. `three-mesh-bvh` dùng trong `town.js` để raycast đặt vật lên mặt đất khi rải theo seed.
- Tất định: cả hai thuần (đầu vào → đầu ra); BVH lúc init, không có trạng thái theo thời gian.
- Bật/tắt: tách bước build (CLI) khỏi runtime; BVH là cờ `town.snapToGround`.

Ứng viên đáng thử sau: Blockbench (dựng đạo cụ/xuất GLB bằng tay), three-bvh-csg (đục cửa), TSL (viewer tách riêng để thử).

## Đã loại

- **sculptgl**: archived (đã kho lưu).
- **BabylonJS/Editor**, **Babylon.js**, **playcanvas/engine & editor**: engine/editor khác three.js; chỉ để tham khảo ý tưởng (Babylon NME dùng làm sandbox thiết kế shader).
- **needle-engine-support**: repo tài liệu, lõi không mở/giấy phép không rõ, đòi Unity. Tên đúng của mã mẫu: `needle-tools/needle-engine-samples`.
- **triplex** (đúng tên: `pmndrs/triplex`, `trytriplex/triplex` đã chuyển): chỉ React Three Fiber, không khai báo giấy phép.
- **Spoke** (đúng tên: `Hubs-Foundation/Spoke`, `mozilla/Spoke` đã chuyển): gắn hệ Hubs/A-Frame.
- **polygonjs**: không loại hẳn nhưng quá nặng (editor + runtime riêng) so với nhu cầu.
- **theatre-js/theatre**: 2 năm không cập nhật (push cuối 2024-08-14); chỉ dùng nếu thật sự cần editor timeline.
- **three-gpu-pathtracer**: chỉ hợp ảnh tĩnh, không dùng cho cả phim.
- **three.quarks**: giữ tham khảo nhưng không làm hạt chính vì stateful (xem lưu ý); ưu tiên hạt hàm thuần của `engine/fx.js`.
- **lygia**: giấy phép không phải OSS thuần (NOASSERTION, Prosperity); dùng glNoise MIT thay thế trừ khi đã kiểm tra điều khoản thương mại.
