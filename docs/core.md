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

## grunge — `engine/grunge.js`
Lớp bụi/cũ kiểu Roblox: nếp vải và bẩn trên nhân vật (`char`); ố, rêu, sơn tróc trên nhà (`build`, `aged`).
```js
applyGrunge(THREE, actorRoot, 'char'); applyGrunge(THREE, envGroup, 'build');
obj.userData.grungeKind = 'none';  GRUNGE.char.value = 0..1;
```
Toggle **worn** (char), **grime** (build), **aged**.

## scans — `engine/scans.js`
Mô hình quét Poly Haven (CC0), giữ nguyên vật liệu quét. Không vá materials/grunge lên chúng.
```js
scanPut(H, 'polyhaven/wooden_table_02', room, { at: [x, 0, z], ry, h: 4.2 });   // h = cao (stud)
scanPut(H, 'polyhaven/potted_plant_01', room, { fit: oldPlant });               // khít hộp vật cũ
scanToggle(e, on);
```
Toggle **scans**. Tải: thêm `polyhaven:<id>` vào `assets/queue.txt`.

## splash / whales — `engine/splash.js`, `engine/whales.js`
API do agent C ghi ở đầu file.

## post toggles — `engine/post.js`
`FX_DEFAULTS` và `FX_LABELS` là danh sách ô bật/tắt trong trình phát:
- hậu kỳ: grade, bloom, dof, vignette, outline, storm
- vật liệu: worn, grime, aged, mats, ibl, scans, folds, hair2
- hiệu ứng tự động: foot, prints, wind, breath
- biển: sea2, seaWx

Engine đọc qua `globalThis.__autoFx.<tên>` (mặc định `?? true`). Mỗi khung nên kiểm lại toggle, để bật/tắt có tác dụng ngay mà không cần dựng lại.
```js
post.set({ bloom: false, sea2: true });        // index.html: ?fx=grade,bloom,sea2 = chỉ bật các ô này
const on = globalThis.__autoFx?.sea2 ?? true;
```
Tính năng mới phải có ô riêng, và tắt ô đi thì hình phải y hệt như trước khi có tính năng.

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
