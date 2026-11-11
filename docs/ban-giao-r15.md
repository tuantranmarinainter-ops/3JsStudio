# Bàn giao: nhân vật khối R15 + biểu cảm (three.js) — prompt cho agent khác

> Cách dùng: chép NGUYÊN khối "PROMPT" dưới đây cho agent của repo đích (Claude Code, Codex…). Agent đó cần đọc được repo
> nguồn `tuantranmarinainter-ops/3JsStudio` (clone, hoặc người dùng chép sẵn các file được liệt kê vào máy).

---

## PROMPT

Bạn nhận bàn giao **nhân vật khối bo tròn kiểu R15** (15 khối, có khuỷu tay/đầu gối) kèm **16 biểu cảm mặt vẽ bằng code**
và **24 animation** từ repo nguồn `3JsStudio`. Nhiệm vụ: đưa nhân vật này vào repo hiện tại, chạy được, rồi báo lại.

### 1. Chép gì
Bắt buộc (1 file, tự chứa — chỉ phụ thuộc three.js ≥ r150 và 2 addon của three):
| Nguồn (repo 3JsStudio) | Đích gợi ý | Ghi chú |
|---|---|---|
| `engine/r15.js` | `src/characters/r15.js` | ~1.550 dòng: khung xương, vẽ quần áo/mặt bằng canvas, mũ/tóc/râu/khăn/váy/áo hoodie, pose + animation |

Tuỳ chọn (không có vẫn chạy — thiếu thì tự dùng khối bo tròn + texture vẽ bằng code):
| Nguồn | Để làm gì | Bắt buộc kèm |
|---|---|---|
| `assets/characters/r15_body.glb` | thân/tay/chân mềm hơn từ mô hình tham chiếu | **Ghi công CC BY 4.0**: "ROBLOX R15 Model" by ShiroTheDream (xem `assets/characters/CREDITS.md`). Tên mô hình có chữ Roblox → nếu dự án đích cấm mọi thứ dính thương hiệu Roblox thì BỎ file này, dùng khối code. |
| `assets/textures/characters/outfit_layout.json`, `outfit_template.png` | khuôn UV để vẽ áo quần bằng ảnh PNG riêng | — |
| `assets/textures/faces/face_layout.json`, `face_template.png` | khuôn ô sprite mặt (256×128) để vẽ mặt bằng ảnh | — |
| `assets/textures/index.json` | danh sách texture được phép tải (tránh 404) | sửa `files` theo texture thật có |
| `tools/texture_templates.py` | sinh lại 2 khuôn trên khi đổi kích thước | Python + Pillow |

KHÔNG chép: `engine/r6.js` (nhân vật cũ 6 khối), `engine/cast.js`/`shots.js`/`timeline.js` (đạo diễn riêng của repo nguồn).

### 2. Nối import
`r15.js` import:
```js
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
```
- Dùng bundler (Vite/webpack) với gói `three`: đổi `three/addons/` → `three/examples/jsm/` nếu bản three cũ không có alias `addons`.
- Trang thuần: importmap `{ "three": ".../three.module.js", "three/addons/": ".../addons/" }`.
- Hàm nhận `THREE` làm tham số (không import `three` trực tiếp) → truyền chính instance three của repo đích.
- Đường dẫn mặc định: `loadR15Body(THREE, url='/assets/characters/r15_body.glb')`,
  `loadCharacterTextures(THREE, name, { base: '/assets/textures' })` → đổi tham số nếu thư mục khác.

### 3. API
```js
import { createR15, loadR15Body, loadCharacterTextures, R15_FACES, FACE_PRESETS, R15_ANIMATIONS, mixPose } from './r15.js';

const body = await loadR15Body(THREE).catch(() => null);          // tuỳ chọn
const textures = await loadCharacterTextures(THREE, 'hero');       // tuỳ chọn; thiếu file → các trường null
const hero = createR15(THREE, {
  name: 'hero', body, textures,
  skin: '#f2c94c', shirt: '#f2c230', pants: '#2c3e50', face: 'smile',
  hat: 'beanie', hatColor: '#c0392b',            // none | cap | tophat | beanie
  hair: 'none', hairColor: '#1b1b1b',            // none | short | braids
  // tuỳ chọn khác: sleeves, shirtPattern, pantsPattern, shoes, beard:'#ddd', scarf:'#c00', skirt:'#5d4037', hoodie:'#fff',
  // zipper, boots, lashes, browThickness, tired, freckles, blink:true, seed
});
scene.add(hero.root);

hero.animate('walk', t);                 // HÀM THUẦN của t (giây): tua tới/lui ra cùng hình; trả về pose
hero.animate('run', t, { from: 'walk', mix: 0.4 });   // trộn 2 animation
hero.setFace('surprised');               // đổi biểu cảm (giữ tới khi đổi tiếp; pose có .face sẽ ghi đè)
hero.setColors({ shirt: '#e74c3c' }); hero.setHat('cap', '#2d6cdf');
hero.attach('rightHand', mesh);          // cầm đồ tại hero.handGrip
hero.apply(pose);                        // đặt pose tự làm: { body:{x,y,z,rx,ry,rz}, hips, torso, head, rightArm, rightElbow, … }
```
- **Biểu cảm** (`R15_FACES` / `FACE_PRESETS`): smile, happy, laugh, grin, neutral, sad, worried, scared, panic, surprised,
  angry, sleepy, sleep, cold, moved, shy. Mặt ghép lớp lông mày → mắt → miệng → phụ (má hồng, nước mắt, mồ hôi, lấp lánh…),
  vẽ vào canvas 512², chỉ vẽ lại khi trạng thái đổi. Chớp mắt + đảo mắt **tất định** theo `t` và `seed`.
  Thêm biểu cảm = thêm 1 dòng vào `FACE_PRESETS` (chọn `brows/eyes/mouth/extras`, tinh chỉnh `eyesQ: { lid, ps, gaze }`).
- **Animation** (`R15_ANIMATIONS`): idle, walk, run, jump, fall, wave, point, sit, scared, cheer, dance, lookAround, faint,
  cower, lie, shiver, hold, panic, hug, sitHold, write, lookUp, tumble, tpose. Thêm = 1 hàm `(t, opt) => pose`.
- **Quy ước**: 1 đơn vị = 1 stud, cao ≈ 5,2, chân ở y=0, mặt nhìn +Z, tay PHẢI ở −X. Góc: tay/chân `.x<0` = ra trước,
  khuỷu `.x<0` gập ra trước, gối `.x>0` gập ra sau, `torso.x>0` cúi, `body.rx>0` ngã sấp.
- Bộ phận có tên (để điều khiển/gắn đồ): `hero.parts.{body, hips, torso, head, rightArm, rightElbow, rightHand, rightLeg,
  rightKnee, rightFoot, left…, hat}`; `hero.headCenter`, `hero.faceCenter` (neo máy quay cận mặt).
- Tóc bím, râu, khăn, dây áo, mũ len lắc lư tính **giải tích** từ pose(t) và pose(t−dt) — không lưu trạng thái, không dùng
  `requestAnimationFrame` hay giờ thực. Repo đích dùng vòng lặp thời gian thực thì chỉ cần gọi `hero.animate(name, clock.elapsedTime)`.

### 4. Kiểm tra (bắt buộc trước khi báo xong)
1. Trang thử: 1 nhân vật, ánh sáng hemisphere + directional, camera nhìn ngang ngực; nút/vòng lặp duyệt mọi `R15_FACES` và
   mọi `R15_ANIMATIONS`. Mẫu chạy được: `docs/ban-giao-r15-demo.html` trong repo nguồn (importmap three từ CDN, không cần
   texture/GLB) — chép sang rồi sửa đường dẫn `r15.js` (hoặc `?r15=<đường dẫn>`). Ảnh chuẩn để so: `docs/ban-giao-r15/bieu-cam.jpg`,
   `docs/ban-giao-r15/animation.jpg` (chụp từ chính trang thử này trong một thư mục trống chỉ có `r15.js`).
2. Chụp ảnh lưới các biểu cảm (cận mặt) + vài khung animation; xem bằng mắt: mặt đúng hướng +Z, không bị lật, tay phải ở −X.
3. Tất định: `animate('dance', 2.5)` sau khi tua qua lại phải cho cùng ảnh.
4. Console không lỗi / không request 404 (thiếu texture là bình thường: `loadCharacterTextures` trả null, không tải mò).

### 5. Giấy phép & giới hạn
- `r15.js`: mã của chủ repo 3JsStudio, phong cách đồ chơi khối nguyên bản — không logo, mặt mặc định, decal hay asset chính
  thức của Roblox. Giữ nguyên dòng chú thích đầu file. Hỏi chủ repo nếu định phân phối lại công khai.
- `r15_body.glb`: CC BY 4.0, PHẢI ghi công như mục 1.
- Không dùng tên/logo Roblox cho sản phẩm của bạn.

### 6. Báo lại
Liệt kê file đã chép + chỗ đặt, chỗ đã sửa import/đường dẫn, ảnh lưới biểu cảm/animation, kết quả kiểm tất định, và mọi chỗ
phải đổi trong `r15.js` (nếu có — cố gắng KHÔNG sửa logic, chỉ sửa đường dẫn).
