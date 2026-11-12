# Lõi engine (core) — dùng lại cho mọi tập

Tập mới (`episodes/epNNN`) chỉ **chọn env + loại shot + điền dữ liệu**. Không viết env mới cho biển, không viết code nổi.
Mọi thứ là hàm thuần của `t`: không `Math.random`, không rAF, không đồng hồ thật, không dùng khung trước.

## Đơn vị và thời gian

| Thứ | Quy ước |
|---|---|
| Độ dài | **stud** (1 đv three.js). Người R6/R15 cao ≈ 5.2 stud. `M2STUD = 2.9` (1 m ≈ 2.9 stud; `engine/scans.js`, `M2S` trong `envs.js`). Polyfork/Poly Haven là mét → nhân 2.9. |
| `t` toàn cục | giây của phim (từ `hf-seek` / `window.renderAt(t)`). Env nhận `update(t, ctx)`. |
| `local`, `k` | giây trong shot / tiến độ shot 0..1 (`engine/shots.js`). `shot.t0`, `shot.dur`. |
| thời gian biển | `sea.clock(t).t` = `t · rate` (bão: 1.6). Shader, `sample()`, vật nổi, sự kiện mặt nước cùng dùng đồng hồ này. |
| Bật/tắt | ô FX trong trình phát → `globalThis.__autoFx.<tên>` (`engine/post.js FX_DEFAULTS`). |

## water — `engine/water.js`
Mặt biển shader: sóng Gerstner, Fresnel, bọt đỉnh sóng/bờ, sự kiện mặt nước, bọt quanh thân nổi. Bản CPU `sample()` khớp vertex shader.
```js
const w = createWater(THREE, { preset: 'deep', size: 1600, y: 0, amp: 1, shore: { circle: [0, 0, 70, 5] } });
scene.add(w.mesh); w.update(tBien, camera, light, amp);
w.sample(x, z, { t: tBien, amp }) // → { y, vy }
w.setLook({ deep: '#06557f', foamLo: 0.4 }); w.setWind({ dir: 0.3, paw: 1.2, steep: 1.1 });
```
Preset sóng: `tropical, shallow, deep, storm, night`. Toggle **sea2** (đánh bóng, sự kiện, bọt thân). Gió mặc định `(dir 0, paw 1, steep 1)` thì giữ nguyên hình cũ.

## sea — `engine/sea.js` (env dùng qua `makeSea`)
Bọc water thành hàm `sea(t, amp)` có đồng hồ riêng, gộp sự kiện env + shot, trả lại nhìn mỗi khung.
```js
e.sea = makeSea(g, { preset: 'storm', y: 2, amp: 2.4, size: 1600, rate: 1.6 });   // trong build của env
return { update(t) { e.sea(t); } };                                               // t TOÀN CỤC, rate tự nhân
e.sea.clock(t) // → { t: tBien, amp }   ·   e.sea.setEvents(list)  // t0 theo t toàn cục
e.seaEvents = (t) => [...]   // (tuỳ chọn) sự kiện thuần của env → vật nổi thấy ngay khung này
```
Env có `e.sea` thì **vật nổi, seaEvents, seaWeather chạy không cần thêm code**. `e.seaClock` cũ vẫn được dùng (tương thích).
Env cũ tự nhân `sea(t*1.6, 2.4)` mà không khai `rate`: `sea` nhớ tỉ lệ + amp của lần gọi trước. Env mới nên khai `rate`.

## floating — `engine/floating.js`
Vật nổi cưỡi đúng sóng shader. Quán tính = trung bình nhiều nhịp trễ của trường sóng, nên vẫn là hàm thuần của `t`. Có thêm vệt ướt trên thân.
```js
const F = floatPose(e.sea, { x, z, yaw, hx: 4, hz: 8, t, draft: 0.4 });   // hx/hz = nửa dài thân (stud)
obj.position.y = yLang + F.dy;  obj.quaternion.premultiply(floatTilt(THREE, F, yaw));
const wl = wetline(THREE, obj); wl.set({ x, z, y: F.y, ...worldGrad(F.sx, F.sz, yaw), t });
```
Toggle **sea2** (tắt thì nhà `boat` quay về lắc sin cũ, các vật `float` đứng yên).

**Trong shot** (`episodes/epNNN/shots.js`), không phải viết code:
```js
{ id: 's050', env: 'sea', seaWeather: 'gio-nhe',
  house: { at: [0, 0], boat: 1, y: -2 },                                   // nhà nổi như thuyền (0..1)
  cast:  { hero: { at: [6, -1.2, 4], float: { hx: 1.2, hz: 0.8, draft: 0.2, maxRoll: 0.3 } } },
  props: { crate: { at: [9, 0.4, 2], float: true } },                      // at[1] = độ cao khi biển lặng
  seaEvents: [{ at: [4, 6], t: 0.8, strength: 2, radius: 12 }] }           // t = giây trong shot → tự đổi sang thời gian biển
```
`float`: `true | { hx, hz, draft, pitchK, rollK, maxPitch, maxRoll, k (0..1 hoặc [a,b]), foam:false }`. Chỉ áp cho vật gắn thẳng vào scene, vật có `parent` thì bỏ qua.
Bọt quanh thân chỉ có 1 vùng: nhà được ưu tiên, sau đó tới vật to nhất. Tàu `shipStorm` dùng cùng `floatPose`, còn `e.carry` chở người đứng trên boong.

## seaweather — `engine/seaweather.js` (thang thời tiết biển)
Mỗi preset là dữ liệu thuần, gồm: sóng (amp, steep, speed), màu/bọt nước, ánh sáng (khoá `LIGHTS` + `sky`), sương, mưa, gió (hướng sóng, cat's-paw, mưa xiên), chớp (`smoothFlash`), sương muối, độ phản ứng vật nổi.

| id | nhìn | dùng khi | env cũ gần nhất |
|---|---|---|---|
| `lang` | bình minh lặng như gương, cam hồng | mở đầu êm, cảnh cuối ấm | — |
| `nang` | nắng nhiệt đới, xanh trong | biển đẹp mặc định | ocean, hawaii, island, reef |
| `gio-nhe` | gió nhẹ, bắt đầu có bọt trắng | đi thuyền, khởi hành | — |
| `u-am` | trời xám, nước xanh xám, sóng vụn | điềm báo, căng thẳng tăng | — |
| `mua` | mưa đều, xám | buồn, chờ đợi | — |
| `giong` | giông: tối, gió giật, mưa + thỉnh thoảng chớp | suýt thất bại | — |
| `bao` | bão lớn: sóng cao, mưa dày, chớp liên tục | cao trào | storm, shipStorm |
| `dem-trang` | đêm trăng lặng | bí mật, tâm sự | iceSea (mặt nước) |
| `dem-bao` | bão đêm | cao trào ban đêm | — |
| `bang` | biển băng lạnh, trời nhạt | vùng cực ban ngày | — |

```js
{ env: 'sea', seaWeather: 'giong' }                                         // env chung: biển + mưa + chớp chỉ từ preset
{ env: 'storm', seaWeather: { from: 'gio-nhe', to: 'giong', ease: 'inout', win: [0.2, 0.9] } }   // chuyển trong shot
{ seaWeather: { base: 'bao', rain: 0.4, amp: 1.8 } }                        // preset + ghi đè
resolveSeaWeather(spec, k) // → W ;  applySeaWeather(env, W, t, ctx)  (envs.use tự gọi)
```
Toggle **seaWx**: tắt thì shot bỏ qua `seaWeather` (env cũ giữ nguyên hình; env `sea` dùng `nang`).
Env cũ chỉ đổi theo preset khi shot có ghi `seaWeather`, nên ep001 không đổi.
- Khi trộn: số và màu nội suy theo `k`. Mưa và chớp mờ dần theo cường độ.
- Khoá ánh sáng (IBL, chỉnh màu hậu kỳ) đổi ở giữa đoạn trộn.
- Nhịp đồng hồ biển (`speed`) cố định trong 1 shot, bằng trung bình from/to.
- `sample()` và vật nổi theo đúng amp đã trộn, vì `shots.js` gọi `sea.setDrive` mỗi khung.
- Bộ sóng (bước sóng, hướng gốc) cố định theo mặt nước của env; preset chỉ xoay hướng, nhân biên độ và độ nhọn.

Thử riêng: `engine/sea-lab.html?wx=giong&wx2=bao&mix=0.5&t=4&events=1&float=1` (có chọn thời tiết, thanh trộn, thanh t, ô bật/tắt, xem được trên điện thoại).
`?sweep=1` + `look.mjs --t 0.5,1.5,…` cho ra bảng so mọi preset.

## ibl — `engine/ibl.js`
Ánh sáng môi trường tính sẵn cho mỗi preset `LIGHTS`, để kim loại, men và kính phản chiếu thật. `envs.use` tự đặt.
```js
const ibl = createIBL(THREE, renderer, LIGHTS);
scene.environment = ibl.get('ocean'); scene.environmentIntensity = ibl.intensity('ocean');
stage.hemi.intensity *= IBL_HEMI_SCALE;   // giữ tổng sáng như cũ
```
Toggle **ibl**. Preset ánh sáng nằm ở `engine/lights.js` (`envs.js` re-export `LIGHTS`).

## materials — `engine/materials.js`
Chất liệu thật theo tên mesh: gỗ, giấy, sắt, vải, đá, cát… (~35 loại, vân sinh bằng toán, toạ độ theo stud).
```js
applyGrunge(THREE, scene, 'build'); applyMaterials(THREE, stage.scene);   // gọi SAU grunge
obj.userData.matKind = 'wood' | 'none';  MATS.on.value = 0 | 1;
```
Toggle **mats**. Kiểm kê: `node tools/mat-inventory.mjs`.

**Shader theo HỌ, khác biệt qua uniform** (2026-11-12): trước đây mỗi loại 1 program (`|mat_<loại>` × biến thể three ≈ 150
program → Chrome/ANGLE dịch ~20 s). Nay khoá program là `|mat_<họ>`; r, m, tint, bump, spark, sheen, rmode, kiểu vân
(`uMtPat`) và tham số noise là uniform riêng từng vật liệu (giữ ở `material.userData.matU`, gắn trong onBeforeCompile).
- Phần nặng (fbm/noise/voronoi/hash) là "ô noise" chung tính 1 lần trước nhánh (`sF1 sF2`, `sN1..sN4`, `sV`, `sH`), fbm
  lặp 4 bậc với cận là uniform (`uMtOct`=4) để FXC không trải ra (voronoi giữ bản trải sẵn — bản vòng làm nứt đá lệch điểm ảnh); mỗi kiểu vân trong `PAT` chỉ còn phép trộn rẻ
  (khai báo ô: `f: [[s, o]]`, `n: [[nền, s, o]]`, `v: s`, `h: [nền, s, o]`; nền `p | U | W | WP`). Nhánh = `if (uMtPat == i)` độc lập (không else-if, không switch).
- Bảng họ: `MAT_FAMILIES` (hiện 1 họ `all` = 34 kiểu vân — đo xen kẽ trên máy: 1 họ 103 s, 5 họ 143 s, 8 họ 176 s,
  bản cũ 246 s tổng ms dịch khi máy bận; chia nhỏ họ = thêm program, mỗi program không rẻ hơn bao nhiêu).
- `FAMILIES[họ] = { kinds, pats, glsl, params }` — mỗi họ tự đủ GLSL + bảng tham số; `patch()` chỉ tra từ đây
  (chuẩn bị tách `engine/shaders/<họ>.js`, mỗi tập nạp họ nó dùng).
- Thêm kiểu vân: thêm vào `PAT` (khai báo ô + code trộn) và vào một họ trong `MAT_FAMILIES`. Đo: `node tools/shaders.mjs episodes/ep001/index.html --film`.

## grunge — `engine/grunge.js`
Lớp bụi/cũ kiểu Roblox: nếp vải và bẩn trên nhân vật (`char`); ố, rêu, sơn tróc trên nhà (`build`, `aged`).
```js
applyGrunge(THREE, actorRoot, 'char'); applyGrunge(THREE, envGroup, 'build');
obj.userData.grungeKind = 'none';  GRUNGE.char.value = 0..1;
```
Toggle **worn** (char), **grime** (build), **aged**.
**Một họ shader duy nhất** (tối ưu số program): mã GLSL cố định, `customProgramCacheKey` chỉ thêm `|grunge`. Kiểu (`char`/`build`), `aged` và `amount` đi qua uniform riêng từng vật liệu — `uGrKind` (1 = char), `uGrAgedOn`, `uGrAmt`, giữ ở `mat.userData.grU` — còn ô bật/tắt dùng uniform chung `uGrCh`/`uGrBu`/`uGrAged` (= `GRUNGE.*`). Nhánh chọn bằng `if (uGrKind > 0.5)` / `if (uGrAgedOn * uGrAged > 0.0)`. Đừng ghi hằng số theo kind/aged/amount vào chuỗi shader hay vào cache key (mỗi program mới ≈ 300–500 ms dịch trên Chrome/ANGLE). Tên `vGrP vGrN vGrB vGrSz` + vị trí chèn giữ nguyên để `materials.js` nối tiếp.

## scans — `engine/scans.js`
Mô hình quét Poly Haven (CC0), giữ nguyên vật liệu quét. Không vá materials/grunge lên chúng.
```js
scanPut(H, 'polyhaven/wooden_table_02', room, { at: [x, 0, z], ry, h: 4.2 });   // h = cao (stud)
scanPut(H, 'polyhaven/potted_plant_01', room, { fit: oldPlant });               // khít hộp vật cũ
scanToggle(e, on);
```
Toggle **scans**. Tải: thêm `polyhaven:<id>` vào `assets/queue.txt`.

## splash / whales — `engine/splash.js`, `engine/whales.js`
API ghi ở đầu file. Kịch bản sinh vật là dữ liệu (vd `OCEAN_PLAN_EP001` trong `engine/envs/ocean.js`, gồm cả `seaLook` = màu biển riêng tập). Env khai `e.seaEvents(t)` → vật nổi thấy sóng cá voi cùng khung.

## hull — `engine/hull.js` (vỏ thuyền dựng bằng code)
`createHull(THREE, {type|kind:'skiff'|'ship'|'raft', seed, length, beam, depth, colors:{top,bottom,trim}, name, sail, mast, funnel, …})` → Group, gốc = đường nước, +Z mũi. `userData.footprint` truyền thẳng vào `floatPose/floatHull`; `userData.animate(t,{wind,rudder})` buồm phồng theo gió (hàm thuần của t); `userData.setRudder(rad)` (pivot `rudderPivot`). Sàn phẳng cần `shadow.bias ≤ -0.0004`, `normalBias ≥ 0.02` (như stage.js) để không sọc. Thử: `engine/hull-lab.html?type=all`, `engine/sea-lab.html?boat=skiff&wx=giong`.

## post toggles — `engine/post.js`
`FX_DEFAULTS` và `FX_LABELS` là danh sách ô bật/tắt trong trình phát:
- hậu kỳ: grade, bloom, dof, vignette, outline, storm, paint (tranh sơn dầu Kuwahara, tắt), ao (che khuất môi trường, tắt), smaa (khử răng cưa, tắt)
- vật liệu: worn, grime, aged, mats, ibl, scans, folds, hair2
- hiệu ứng tự động: foot, prints, wind, breath
- biển: sea2, seaWx

Engine đọc qua `globalThis.__autoFx.<tên>` (mặc định `?? true`). Mỗi khung nên kiểm lại toggle, để bật/tắt có tác dụng ngay mà không cần dựng lại.
```js
post.set({ bloom: false, sea2: true });        // index.html: ?fx=grade,bloom,sea2 = chỉ bật các ô này
const on = globalThis.__autoFx?.sea2 ?? true;
```
Tính năng mới phải có ô riêng, và tắt ô đi thì hình phải y hệt như trước khi có tính năng.

Chuỗi pass: `copyIn → ao → outline → bokeh → paint → bloom → grade → smaa`.
- **ao** (`engine/ao.js`): prepass depth+normal sau khung chính, nhân mẫu cố định (tất định). `userData.noAO` = loại khỏi prepass (nước, bọt, tia nước); `userData.aoDepthOnly` = vẫn che vật khác nhưng chính nó không bị tối (cá voi, phần chìm dưới nước). Mesh ShaderMaterial không skinned hoặc tên `sea*/water*/ocean*` tự bị loại. Tham số: `post.ao.params {radius, intensity, bias, fade, color}`.
- **paint** (`engine/painterly.js`): `post.paintDepth = 'own'` (mặc định, depth riêng nửa độ phân giải, có cả mặt nước) | `'ao'` (dùng depth AO — KHÔNG dùng cho cảnh biển) | `'flat'`.
- **smaa**: bảng tra nạp qua DefaultLoadingManager, chỉ chạy khi `post.smaaReady`.
- Chụp kiểm với ô bật: `node tools/look.mjs <trang> --shots … --opts '{"fx":{"paint":true,"ao":true}}' --det`.

## look.mjs — `tools/look.mjs` (kiểm khung)
Chụp, ghép bảng có nhãn, so A/B (PSNR), kiểm tất định. Chạy được với mọi trang có `window.__ready` + `window.renderAt(t)`, kể cả sea-lab.
```bash
BROWSER=chromium GL=swiftshader node tools/look.mjs episodes/ep001/index.html --shots s095,s096 --out output/look/<agent> --det
node tools/look.mjs engine/sea-lab.html --t 0.5,1.5,2.5 --query "sweep=1&ui=0" --out output/look/sea-lab
node tools/look.mjs episodes/ep001/index.html --t 30 --ab "episodes/ep001/index.html?fx=none"
```
Mỗi lần chụp ≤ 12 khung, mỗi agent dùng `--out` riêng.

## Tập mới dùng lõi
1. `episode.js`: chọn `env`/`light` mặc định. Biển thì dùng env `sea` (hoặc ocean/storm…), không cần viết env.
2. `shots.js`: chọn `type` từ `engine/shottypes.js`, thêm `seaWeather`, `float`, `seaEvents`, `house.boat` khi cần (ví dụ có trong `episodes/_template/shots.js`).
3. Cần biển có đảo/bờ riêng: tạo `engine/envs/<tên>.js` gọi `makeSea(g, {…, rate})` + `update(t) { e.sea(t) }`. Phần nổi, sự kiện và thời tiết tự có.
4. Kiểm bằng `look.mjs --shots … --det` và `engine/sea-lab.html`.

## furnish — `engine/furnish.js` (bày đồ đạc bằng dữ liệu)
Mỗi phòng khai MỘT mảng layout (1 món = 1 dòng); không viết tay vị trí/kích thước. Nguồn nội thất CC0: KayKit Furniture Bits (`kaykit:`, 53 món, `assets/kaykit/furniture/`), Kenney Furniture Kit (`kenney:`, 140 món, `assets/kenney/furniture-kit/`), đồ quét Poly Haven (`scan:`). Đơn vị chuẩn hoá về stud: KayKit ×2.4, Kenney ×6.5, scan ×2.9 (`KITS` trong file). Danh sách tên món: `assets/manifest.json` (`kaykit/…`, `furniture-kit/…`, `polyhaven/…`).
```js
import { furnish, furnishIds } from '../furnish.js';
export const ROOM = [
  { id: 'kaykit:table_medium', name: 'table', at: [6, 2] },
  { id: 'kaykit:chair_A', at: [0, 2], rot: Math.PI / 2 },
  { id: 'kaykit:pillow_A', on: 'bed', at: [dx, dz] },                  // đặt lên MẶT THẬT của vật đỡ (bắn tia xuống), không lên đỉnh hộp bao
  { id: 'scan:potted_plant_01', wall: 'north', at: [-21], h: 6 },      // áp lưng vào tường, tự quay mặt ra phòng
  { id: 'scan:wooden_table_02', fit: 'oldTable' },                     // thế chỗ đồ cũ: vừa khít hộp bao, cùng hướng; đồ cũ ẩn khi bật
  { id: 'kenney:toaster', on: 'counter_top', at: [-2.4, 0.2], off: false },
];
const F = furnish(THREE, R, ROOM, { assets: A, walls: { north: -20, south: 24, west: -24, east: 24 }, refs: { oldTable: e.table, bed: e.bed } });
return { update() { F.update(globalThis.__autoFx?.scans ?? true); } };   // ô "scans" bật/tắt cả bộ
```
Khoá một món: `id` · `name` · `at [x,z]|[x,y,z]` (gốc = giữa đáy) · `y` · `rot` · `scale` · `h|w|d` (giữ tỉ lệ) · `size [w,h,d]` (kéo méo, null = giữ) · `on` · `wall` + `gap` · `fit` (+`keepRatio`) · `replace` · `mat:'none'` (bỏ materials.js/grunge.js; mặc định bật cho `scan:`) · `off:true`. Chi tiết đầu `engine/furnish.js`.
- `refs` = vật dựng tay cần thế chỗ/đặt lên (tên → Object3D); món trong layout tự đăng ký theo `name` nên `on:`/`fit:` trỏ được tới món khác.
- Trả về `{ group, items, get(name), set(name,on), update(on) }`; mỗi món là Group đặt tên rõ (`name`), tắt riêng qua `F.set(name,false)` hoặc `globalThis.__autoFx.furnishItems = { tên: false }`.
- Asset: `ENV_ASSETS` gồm `...furnishIds(LAYOUT)` (layout xuất `export const KITCHEN_FURNISH/BEDROOM_FURNISH` từ file env, `engine/envs.js` import). Asset thiếu → món bị bỏ, có cảnh báo, phim vẫn render.
- Phải đứng ở build của env (cha tại gốc toạ độ, chưa xoay) vì đo hộp bao theo toạ độ thế giới.
Ví dụ dùng thật: `engine/envs/kitchen.js` (`KITCHEN_FURNISH`), `engine/envs/bedroom.js` (`BEDROOM_FURNISH`).

## bake — `engine/bake.js` (nướng vân bề mặt thành texture; CHƯA tích hợp vào tập)
Vân của `materials.js` (35 kiểu `PAT`) tính bằng noise trong fragment cho từng điểm ảnh. `bake.js` vẽ mỗi bộ vân **một lần** vào texture (MRT albedo/orm/height + pass 2 normal, mipmap, anisotropy); fragment chỉ tra texture (triplanar theo `vGrP/vGrN`). Công thức chép từ `PAT` sang noise **tuần hoàn** (lặp texture không có đường nối; đã kiểm bằng `?edge=1`). Tất định theo `seed`.
```js
import { bakeSurface, bakeSurfaceAsync, triplanarChunk, bindBake, PAT_NAMES } from './bake.js';
const B = bakeSurface(THREE, renderer, { pat: 'WOOD', size: 1024, seed: 7, params: { tile: 8, bump: 0.9 } });
// B = { albedo, orm, normal, height, size, tile, pat, seed, dispose() }   (texture RepeatWrapping)
await bakeSurfaceAsync(THREE, renderer, opt)   // như trên nhưng dịch shader song song (không đứng hình)
bindBake(material.uniforms, B, { scale: K.sc }) // bkAlb/bkOrm/bkNrm/bkInvTile
triplanarChunk({ prefix: 'bk', oriented: kind === 'wood' })  // GLSL: BkOut o = bkTri(vGrP * sc, normalize(vGrN), vGrSz);
```
`params`: `tile` (cạnh ô lặp, stud, chẵn; mặc định 8, `FABRIC/FLAKE/HAIR/SCRATCH` 4, `ASPHALT` 16), `bump`, `aniso` (8), `shared` (xem dưới), `only` (nhóm kiểu).
**Kênh** (không phải ORM glTF): `albedo.rgb = A` màu tuyệt đối của vân (gamma 1/2,2), `albedo.a = B/1,5` hệ số nhân màu gốc → `màu = clamp((A + B·max(màuGốc, orm.a))·tint)`; `orm.r` = lấp lánh, `orm.g` = 0,5 + Δnhám/2, `orm.b` = 0,5 + Δkim-loại/2, `orm.a` = sàn độ sáng màu gốc (mạ 0,78; sắt 0,5); `normal.rgb` = pháp tuyến tiếp tuyến, `normal.a` = cao độ 8-bit; `height.rg` = cao độ 16-bit (`(r·255+g)/255·2,5−1`, không mipmap).
**Hiệu năng** (máy thử, Chrome/ANGLE D3D): nướng 1 bộ 1024² ≈ **1 ms** (34 kiểu ≈ 32 ms, sau khi dịch xong); RAM ≈ 21 MB/bộ ở 1024² (5 MB ở 512²). **Dịch shader** là khoản đắt: shader RIÊNG từng kiểu 0,03–0,34 s (cả 34 kiểu ≈ 4 s, tạo lười → cảnh dùng ~8 kiểu ≈ 1 s) — mặc định; `shared: true` = MỘT shader `uniform int uPat` cho cả 34 kiểu: chỉ 1 chương trình nhưng dịch ~**16 s** (lúc đầu 3D noise + `switch` > 100 s) → dùng `bakeSurfaceAsync`. `only: [...]` = shader chung cho nhóm 4–8 kiểu (2–5 s).
**Khác nhẹ so với bản trực tiếp**: tần số làm tròn về bội 1/tile, bậc fbm 2/4/8, noise lát cắt 2D, vân mịn bị làm mờ theo texel (10–30 chu kỳ/stud cần tile 4), `SHELL` thành sọc chéo, `METALPAINT` gỉ không phụ thuộc độ cao, cát lấy mặt (x,y). Lặp ô: ASPHALT/đá có thể lộ lặp ở tile 8–16 nếu nhìn xa trên diện rộng; cận cảnh > ×8 hơi mờ (texel 1024² / tile 8).
**Kế hoạch tích hợp** (sau khi `materials.js` gom họ xong): ô bật/tắt mới `matsBake` (mặc định TẮT; hình lệch nhẹ) trong `engine/post.js FX_DEFAULTS`; khi bật, `patch()` thay `K.pat` bằng chunk tra `bkTri` (cùng `rough/metal/bump/sheen/spark`): `diffuseColor = (A + B·max(base, floorB))·tint`, `roughness = r + dRough`, `metal = m + dMetal`, `emissive += spark`, normal = `o.nObj` đổi sang view; mỗi `(pat, seed)` nướng một lần lúc khởi động (`bakeSurfaceAsync` trong `waitUntil` của `hf-seek`), vật nhiều chất liệu chia sẻ texture theo `pat`; `dispose()` khi rời tập. Kiểm bằng `engine/bake-lab.html` (`?view=persp|all`, `?edge=1`, `?shared=1`, `?only=WOOD`, `window.__bench(size)`) và `look.mjs --ab`.

## Gió chung, cỏ, cây đung đưa (2026-11-12, học từ Painted Valley)
- `engine/wind.js` `createWind(THREE,{dir,speed,gust,seed,gustSize})`: 1 khối uniform dùng chung (uWind, uWindScroll = dir·speed·t, tWindNoise) + GLSL `gustAt` và bản CPU `wind.gustAt(x,z)` khớp GPU.
- `engine/grass.js` `createGrass(THREE,{wind, area:{center,size,round}, heightAt, cell, height, colors, seed, follow})`: cỏ instanced theo hash ô thế giới, 3 vòng LOD, **1 program**; `setPushers([[x,y,z,r]…])` cỏ rạp quanh chân; `lightFrom(sun, hemi)` gọi trong `onBeforeRender` (đèn shot đặt sau env.update).
- `engine/sway.js` `createSway(THREE, wind)` → `addPalm/addTree/update(t)/rest()`: xoay group trên CPU, không thêm shader.
- Đang dùng: `envs/island.js` (bãi cỏ + cây dừa); ô FX `grass`, `sway`. Trang thử: `engine/grass-lab.html`, `engine/sway-lab.html`; gộp 1 file mở bằng file://: `node tools/lab1file.mjs <lab> dist/<lab>.html`.

## Bóng mây trôi
- `engine/cloudshade.js` `createCloudShade(THREE, wind)` → `add(geo,{x,y,z})`, `lightFrom(sun)`: tấm phủ nhân màu (1 program) trên mặt đất phẳng; `wind.set({cloud:[độ tối, cỡ m, nhân tốc độ, che phủ]})` → GLSL `cloudOpen(xz)` trong wind.js (cỏ tự đọc). Đêm tự tắt. Ô FX `cloudShade`. Đang dùng: island (mặt cát + bãi cỏ).

## Rừng xa ảnh vẽ
- `engine/farwoods.js` `createFarwoods(THREE,{wind, seed, center, ring:[rIn,rOut], count, size, kinds, avoid, clumps})`: cây xa = thẻ ảnh vẽ quay về camera, 1 InstancedMesh + 1 program, atlas vẽ bằng code; `lightFrom`/`fogFrom` gọi trong onBeforeRender. Ô FX `farwoods`. Đang dùng: town (vành 150–400 m, chừa đường). Trang thử `engine/farwoods-lab.html`.

## Núi xa vẽ 1 lần
- `engine/backdrop.js` `createBackdrop(THREE,{seed, radius, base, height, ranges, snow, palette})`: 3 dãy núi (đồi có cây, dãy chính tuyết, dãy xa nhạt) vẽ 1 lần (~430 ms) vào dải tranh 4096×512 (R sáng, G tuyết/cây, B không khí, A mặt nạ); ống trụ ghim mặt phẳng xa theo camera, 1 program; `lightFrom`/`fogFrom` trong onBeforeRender → ngày/đêm không vẽ lại. Ô FX `backdrop`. Đang dùng: town. Trang thử `engine/backdrop-lab.html?light=day|dusk|night`.
