# Kế thừa hệ thống CAMERA của App 2 (Scene) — đặc tả đầy đủ

> Nguồn: repo `tuantranmarinainter-ops/3appclaude`, thư mục `three-workspace-app/editor/` (Scene3D by Topview,
> **Apache 2.0** — được chép/chuyển mã, giữ ghi công "Scene3D by Topview" + file LICENSE/NOTICE).
> Phạm vi tài liệu: **chỉ camera**. Không gồm nhân vật, retarget, VFX, timeline UI.
> Mục tiêu: một app khác (vd. engine three.js của 3JsStudio) dựng lại được camera **cho ra cùng số** với App 2.

Mọi đường dẫn dưới đây tính từ `three-workspace-app/editor/packages/builder/src/` trừ khi ghi khác.

---

## 0. Bản đồ file camera

| File | Vai trò | Mức cần chép |
|---|---|---|
| `contract/types.ts` (phần `camera`, `CameraMotionClip`, `BakedCurve`, `EditSequence`) | Hợp đồng dữ liệu | **Bắt buộc** |
| `evaluate/camera/CameraRig.ts` | Đánh giá clip chuyển động → pose (position/lookAt/fov) | **Bắt buộc** |
| `evaluate/curves/BakedCurve.ts` | Lấy mẫu đường cong nướng | **Bắt buộc** |
| `evaluate/camera/bakeMotion.ts` | "Nướng" preset chuyển động → clip (dolly, pan, orbit, follow…) | **Bắt buộc** |
| `data/cameraLibrary.ts` | 15 preset vị trí máy + 29 preset chuyển động | **Bắt buộc** |
| `evaluate/camera/subjectBinding.ts` | Gắn camera theo nhân vật | **Bắt buộc** |
| `evaluate/camera/cameraAim.ts` | Euler ↔ lookAt | **Bắt buộc** |
| `evaluate/evaluateSteps.ts` → `evaluateCameras()` (dòng ~280–470) | Thứ tự ưu tiên các lớp | **Bắt buộc** |
| `evaluate/curves/KeyframeTrack.ts` | Keyframe tay (userKeys), Euler liên tục | **Bắt buộc** |
| `engine/objects/cameraTransform.ts` | Áp pose lên `THREE.PerspectiveCamera` | **Bắt buộc** |
| `evaluate/camera/focalLength.ts` | FOV dọc ↔ tiêu cự mm | Nên có |
| `contract/cameraAspect.ts` | Tỉ lệ khung theo máy | Nên có |
| `evaluate/camera/rebaseCameraMotion.ts` | Dời/xoay máy thì dời cả chuyển động | Nên có (editor) |
| `evaluate/camera/cameraMotionExclusive.ts`, `cameraMotionRange.ts` | Quy tắc khoá keyframe, khung kết thúc xuất | Nên có |
| `headless/sampleCameraSequence.ts` | Lấy mẫu camera theo chuỗi shot (cắt cảnh) | Cần nếu xuất |
| `apps/studio/src/filmCamera.ts`, `filmWorldAnchor.ts` | Đổi sang BBS FS (Minecraft) | Chỉ khi xuất BBS |
| `engine/interact/camera/*` | Camera điều hướng của **editor** (không phải camera phim) | Tuỳ chọn |
| `engine/gizmo/CameraGizmo.ts`, `engine/objects/CameraMotionGuide.ts` | Hình máy quay + vệt quỹ đạo trong viewport | Tuỳ chọn |

---

## 1. Quy ước toạ độ & đơn vị

- **Y hướng lên**, đơn vị **mét**; góc lưu bằng **độ**; thời gian timeline bằng **frame** (fps của tài liệu, thường 30),
  đường cong nướng bằng **mili-giây**.
- Camera three.js nhìn theo **−Z cục bộ**. Nhân vật nhìn theo **+Z cục bộ**.
- **Hướng camera được định nghĩa bằng `lookAt` (điểm nhìn)**, không phải bằng rotation. Rotation chỉ là dẫn xuất;
  "đổi rotation = đổi lookAt" (`lookAtFromEulerDeg`). Ngoại lệ: khi có keyframe rotation / roll thì đặt Euler trực tiếp
  (`useEuler = true`) để không bị `lookAt()` vặn mất roll.
- `fov` = **FOV dọc** (độ), giới hạn UI 12°–120°. Khi nướng chuyển động, fov bị kẹp **18°–85°**.
- Tiêu cự hiển thị: cảm biến **cao 24 mm** → `focal = 12 / tan(fov/2)`; `fov = 2·atan(12/focal)`.
  Ví dụ 50 mm ↔ 26.99°, 35 mm ↔ 37.85° (FOV dọc).
- Điểm nhìn mặc định nếu thiếu: `(0, 1.2, 0)`; fov mặc định 50.
- **1.2 m = "ngực nhân vật"**: điểm nhìn mặc định khi nhìn vào người (`CHARACTER_LOOK_AT_HEIGHT`).
  Lưu ý 3JsStudio dùng stud (R6 cao ~5.2) → nhân hệ số tỉ lệ (vd. 1 m ≈ 1 stud·k; xem §11).

---

## 2. Hợp đồng dữ liệu

### 2.1 Nút camera (`DraftNode` với `type: 'camera'`)
```ts
{
  id, name, visible, locked,
  transform: { position: Vec3, rotation: Vec3 /*độ, Euler XYZ*/, scale },
  camera: {
    projection: 'perspective',
    fov: number,            // FOV dọc, độ
    fovAxis: string,        // 'vertical'
    aspectRatio?: string,   // '9:16', '16:9'… thiếu → dùng content.aspectRatio của tài liệu
    near: number, far: number,  // far bị kẹp tối đa 2000 khi dựng PerspectiveCamera
    isPrimary: boolean,     // máy đang "quay"; không có → máy đầu tiên
    lookAt: Vec3,           // điểm nhìn tĩnh
    lookAtTarget?: { nodeId, offset?: Vec3 },  // nhìn theo nhân vật (offset thiếu → +1.2 Y)
    subject?: {             // gắn vị trí máy theo nhân vật
      nodeId, distance,
      offset: Vec3,         // vị trí máy trong hệ cục bộ nhân vật
      lookAtOffset: Vec3,   // điểm nhìn trong hệ cục bộ nhân vật
      follow: boolean,      // true = bám theo mỗi frame; false = chỉ đặt 1 lần
      followRotation: boolean, // xoay theo hướng nhân vật
      overridesMotion?: boolean // "đặt sau thắng": thiếu = true
    }
  }
}
```

### 2.2 Clip chuyển động camera (`timeline.animation.cameraMotionClips[]`)
```ts
{
  id, target: { type: 'node', nodeId /* id camera */ },
  focusTarget?: { type: 'center' },
  frameStart, frameEnd,          // frame timeline, ĐÓNG cả hai đầu
  trimStartMs, trimEndMs,        // cắt trong miền ms của motion
  playback: { version: 1, speed: 1, loop: false, loopMode: 'ping-pong', baseDurationFrames },
  motion: {
    id, version: 1, presetId, label, timeUnit: 'millisecond', durationMs,
    metadata?: { generatedAt, cameraNodeId, targetNodeId, config /* tham số đã trộn để nướng lại */ },
    source?: {...},              // mô tả thủ tục (orbit / path / target-tracking) — xem §4.4
    warnings?: string[],         // 'advanced-motion-approximated', 'fov-clamped'; KHÔNG có thì bỏ hẳn trường
    curves: BakedCurve[]         // 7 đường (+1 roll nếu có)
  }
}
```

### 2.3 Đường cong nướng (`BakedCurve`)
```ts
{ id: '<presetId>:position-x', group: 'position'|'lookAt'|'lens'|'rotation',
  dataPath: 'camera.position'|'camera.lookAt'|'camera.lens.fov'|'camera.rollDeg',
  arrayIndex: 0|1|2, extrapolation: 'constant',
  keyframes: [{ id: '<curveId>:<i>', time /*ms*/, value, interpolation: 'linear'|'bezier' }] }
```
Bộ chuẩn: `position-x/y/z`, `look-at-x/y/z`, `fov` (+ `roll` nếu có roll ≠ 0).

### 2.4 Keyframe tay (`userKeys[nodeId]`)
```ts
{ position?: Keyframe[], rotation?: Keyframe[], lookAt?: Keyframe[], fov?: Keyframe[] }
Keyframe = { id, frame, value: number[] /*[x,y,z] hoặc [v]*/, interpolation:
             'linear'|'smooth'|'ease-in-out'|'ease-in'|'ease-out' }
```
Ngoài ra còn fcurves kiểu Blender (`transform.position`, `transform.rotation`, `camera.lookAt`, `camera.fov`).

### 2.5 Chuỗi shot (dựng phim) — `content.editorial`
```ts
{ version: 1, activeSequenceId,
  sequences: [{ id, name?, clips: [{ id, cameraNodeId, sourceFrameStart, sourceFrameEnd }] }] }
```
- Thứ tự mảng = thứ tự phim. Độ dài shot = `sourceFrameEnd − sourceFrameStart + 1`.
- Cùng một thời gian nguồn có thể cắt sang nhiều máy khác nhau (multi-cam). **Không** dùng chung với `cameraMotionClips`.

---

## 3. Đánh giá camera tại frame `f` — THỨ TỰ LỚP (quan trọng nhất)

Hàm `evaluateCameras(scene, frame, out)` chạy cho **mỗi** camera, theo đúng thứ tự sau; lớp sau ghi đè lớp trước:

1. **Clip chuyển động / tư thế tĩnh** — `evaluateCameraPoseInto` (§4). Có clip phủ `f` → pose từ clip
   (`clipId ≠ null`); không → pose tĩnh (`transform.position`, `camera.lookAt`, `camera.fov`).
2. **Keyframe (fcurves + userKeys)** — chỉ áp khi máy này **không có bất kỳ clip chuyển động nào**
   (`motionOwnsKeyframes`). Có ít nhất 1 clip → toàn bộ keyframe **bị treo** (dữ liệu giữ, UI làm xám); xoá hết clip thì
   keyframe tự sống lại.
   - Key `position` không có key `lookAt` cùng trục → lookAt **dời theo cùng lượng** (dịch chuyển cứng, giữ hướng).
   - Key `rotation` → lookAt = `lookAtFromEulerDeg(pos, rot, khoảngNhìnHiệnTại)`, bật `useEuler`.
     Rotation key lấy mẫu qua `alignEulerDeg` (chọn nhánh Euler gần nhất, trục không đổi thì ghim) để đổi 1 trục không kéo 2 trục kia.
   - Key `fov` ghi thẳng.
3. **Đi theo đường (pathMotionClips nhắm vào camera)** — chỉ khi `f` **không** nằm trong clip chuyển động.
   `facing: 'path-tangent'` → lookAt đặt phía trước theo tiếp tuyến, giữ khoảng nhìn cũ; ngược lại chỉ dời vị trí, giữ hướng.
   Đường "derived-from-keyframes" bị bỏ nếu keyframe đang bị treo hoặc đã có track position.
4. **Gắn nhân vật (`subject`, chỉ khi `follow = true`)** — dùng transform nhân vật **đã đánh giá ở frame này**.
   Thắng khi: không có clip ở `f`, **hoặc** `overridesMotion !== false`. Ghi position + lookAt (`resolveSubjectCameraPose`).
5. **Nhìn theo nhân vật (`lookAtTarget`)** — trừ khi clip chuyển động đang nắm lookAt (clip có mặt và subject không thắng).
   lookAt = vị trí nhân vật + offset (thiếu offset → +1.2 Y).
6. **Máy hoạt động**: máy có `isPrimary` (máy cuối cùng có cờ), không có → máy đầu tiên. Ghi vào `out.camera`.

Quy tắc "đặt sau thắng": bấm gắn nhân vật sau khi đã có clip → `overridesMotion = true`; thêm clip chuyển động sau khi gắn
→ đặt lại `false` để clip nắm khoảng frame của nó.

Nhân vật phải được đánh giá **trước** camera trong cùng frame (camera đọc `out.transforms`).

---

## 4. CameraRig — đánh giá clip

### 4.1 Tìm clip ở frame
`cameraMotionClipAt(clips, nodeId, f)`: clip đầu tiên có `frameStart ≤ f ≤ frameEnd` (đóng hai đầu).
Khi xuất cắt cảnh có biên (`boundary`):
- `'left'` (mẫu kết thúc shot): sở hữu `frameStart < f ≤ frameEnd + 1`;
- `'right'` (mẫu bắt đầu): sở hữu `frameStart ≤ f < frameEnd + 1`;
- nhiều clip cùng khớp → chọn clip có `frameStart` lớn nhất.

### 4.2 Frame → ms (KHÔNG dùng fps)
```
p  = (f − frameStart) / (frameEnd − frameStart)        // span 0 → p = 0
ms = trimStartMs + p · (trimEndMs − trimStartMs) · speed
loop: ms = trimStart + ((ms − trimStart) mod trimSpan)  // left boundary tại đúng biên → trimSpan
ms = clamp(ms, trimStartMs, trimEndMs)
```
Kéo dài/thu ngắn clip trên timeline = co giãn chuyển động, không cắt.

### 4.3 Lấy mẫu đường cong (`sampleCurve`)
- Trước key đầu / sau key cuối: giữ hằng.
- Tìm đoạn bằng chia đôi; `t = (ms − a.time)/(b.time − a.time)`.
- `a.interpolation === 'bezier'` → **smoothstep** `t·t·(3−2t)` (không có tay cầm). `linear` → giữ `t`.
- Thiếu đường cho trục nào → dùng giá trị tĩnh của nút.

### 4.4 Orbit thủ tục (ưu tiên hơn đường cong)
Nếu `motion.source.type === 'orbit'` và có `startPosition`, `pivot` → tính trực tiếp (đường cong chỉ là ảnh chụp để xuất):
```
progress = clamp((trimStart + p·(trimEnd−trimStart)) / durationMs, 0, 1)
e = ease(source.easing, progress)    // easeInOutQuad: t<.5 ? 2t² : 1−2(1−t)²; ease-in t²; ease-out 1−(1−t)²
v = startPosition − pivot; tách thành par (dọc trục axis, mặc định Y) + perp
perp quay quanh axis góc yawDeg·e (Rodrigues); bán kính r0 → r0 + radiusDelta·e
pos = pivot + par + axis·heightDelta·e + perp'
lookAt = lerp(startLookAt, lookAtTarget ?? startLookAt, e);  fov = source.fov ?? node.fov
```
⚠ Hai bộ easing khác nhau: **CameraRig/userKeys dùng bậc 2**, **bakeMotion dùng bậc 3** (§5.2). Giữ đúng nơi dùng.

### 4.5 Chế độ nối (`chained`, thử nghiệm, mặc định TẮT)
Các clip của 1 máy xếp theo `frameStart`; clip thứ N cộng offset để đầu clip = cuối clip trước; giữa các clip giữ pose cuối.
Mặc định (`chained = false`): mỗi clip đánh giá tuyệt đối, ngoài clip → pose tĩnh.

---

## 5. Nướng chuyển động (`bakeMotion.ts`)

Luồng: `preset + config (defaultConfig ⊕ tham số người dùng) + context (camera, nhân vật mục tiêu, tài liệu)`
→ dãy pose `{timeMs, position, lookAt, fov, rollDeg?}` → 7(8) đường cong → bọc thành `CameraMotionClip`:
`frameStart = frame hiện tại`, `frameEnd = frameStart + max(1, round(durationMs·fps/1000))`, `trimStartMs = 0`, `trimEndMs = durationMs`.

### 5.1 Trạng thái & hằng
- Trạng thái đầu = pose tĩnh của máy; fov kẹp 18–85.
- **Thang cảnh = 4** (hằng, đã đối chiếu bản gốc): khoảng dịch = `distance × 4` (dolly 0.8 → 3.2 m), không phụ thuộc khoảng nhìn.
- Điểm mục tiêu: nhân vật được chọn → `pos + (0, 1.2, 0)`; không → lookAt của máy.
- Hệ cơ sở máy: `forward = norm(lookAt − pos)`, `right = norm(forward × Y)` (suy biến → (1,0,0)), `up = right × forward`.
  Cục bộ → thế giới: `right·x + up·y + forward·z` (**+Z cục bộ = phía trước**).
- `targetPolicy`: `required-look-at` / `required-focus-target` mà không có nhân vật → lỗi `missing-target`.

### 5.2 Easing khi nướng (bậc 3)
`linear: t` · `ease-in: t³` · `ease-out: 1−(1−t)³` · `ease-in-out (mặc định): t<.5 ? 4t³ : 1−(−2t+2)³/2`.

### 5.3 Công thức theo `recipe.type`
| type | Kết quả |
|---|---|
| `static` | 2 pose giống nhau |
| `pan-tilt` | Giữ vị trí; forward quay `yawDeg` quanh Y rồi `pitchDeg` quanh `right`; lookAt = pos + forward·khoảngNhìn |
| `translate` | `targetSpace:'world'` → hướng = `localOffset` thế giới; không → hướng cục bộ máy. Dịch `distance·4`. `lockTarget` → lookAt cuối = điểm mục tiêu; không → lookAt dịch cùng |
| `zoom` | fov cuối = kẹp(fov + fovDelta, 18, 85) |
| `orbit` | Quay quanh **lookAt** hiện tại `yawDeg` (quanh Y), `heightDelta·4`, `radiusDelta·4`; **96 mẫu**; ghi `source.type='orbit'` |
| `shake` | ≥8 key (mặc định 12); biên độ Q = `shakeAmplitude·4`; nhiễu `hashRand(seed=1,i,kênh)`; pos += (n1, n2·.5, n3·.35); lookAt += (n4·.4, −.3·n4·.4, 0); roll = rand·1.2° ; warning approximated |
| `focus-shift` | lookAt chuyển sang điểm mục tiêu; warning approximated |
| `path` + `follow/leading/profile` | Theo dõi mục tiêu, 96 mẫu (§5.4) |
| `path` + `fpv` | Bay dọc polyline đường đi của mục tiêu, nhìn trước `1/max(4·số điểm,12)`; không có đường → như push-through |
| `path` + `slider-reveal` | dịch cục bộ (1,0,0)·4, nhìn mục tiêu |
| `path` + `foreground-wipe` | (1,0,0)·3.2 |
| `path` + `push-through` | (0,0,1)·5.6 |
| `path` + `aerial` | (0.6,0.5,−0.25)·4, fov +6 |
| `path` + `dive` | (0,−0.7,0.8)·4 |
| `path` + `pull-away` | (0,0.7,−1)·4, fov +8 |

`hashRand(seed,i,ch) = frac(sin((seed+1)·12.9898 + (i+1)·78.233 + 37.719·ch))` (frac giữ dấu, `s − trunc(s)`).

Nội suy pose: `lerpPoses` tạo `keyframeCount` (mặc định 2) pose, **thời gian tuyến tính, giá trị đã easing**.
Nhóm `path` dạng thẳng (`bakeLinePath`) = **64 mẫu**.
Gán interpolation cho key: ≤ 8 pose → `bezier` (hoặc `linear` nếu easing linear); > 8 pose → `linear` (easing đã nướng vào giá trị).

### 5.4 Bám mục tiêu (follow / leading / profile)
```
m = max(|pos − target0|, distance·4);  h = pos.y − target0.y
offset = leading: (0,h, m) | profile: (m,h,0) | follow: (0,h,−m)
fwd    = (điểm cuối − điểm đầu) của đường đi mục tiêu, hoặc (target0 − pos), suy biến (0,0,−1)
basis  = cameraBasis(0, fwd)
lookOffsetLocal = (lookAt − target0) chiếu lên basis
mỗi mẫu u: s = ease(u); tp = vị trí mục tiêu trên đường đi tại frame (frameStart + s·span) + 1.2 Y
          pos = tp + basis·offset;  lookAt = tp + basis·lookOffsetLocal
```
`source.type = 'target-tracking'` (mode, offset, lookAtOffset, target, basisFallback, targetFallback).

### 5.5 Preset vị trí máy (15) — `CAMERA_PRESETS`
Thiết kế cho nhân vật ở gốc, nhìn +Z. (vị trí; lookAt; fov)
| id | position | lookAt | fov | rotation |
|---|---|---|---|---|
| current | (0,1.572,4.251) | (0,1.2,0) | 50 | (−5,0,0) |
| front-medium | (0,1.2,5) | (0,1.2,0) | 50 | 0 |
| front-close | (0,1.35,2.6) | (0,1.35,0) | 35 | 0 |
| front-wide | (0,1.1,7.5) | (0,1.1,0) | 70 | 0 |
| side-follow | (4.81,1.627,0.848) | (0,1.2,0) | 50 | (−5,80,0) |
| side-close | (3,1.25,0) | (0,1.25,0) | 42 | (0,90,0) |
| back-medium | (0,1.2,−5) | (0,1.2,0) | 50 | (0,180,0) |
| top-wide | (0,6.669,3.969) | (0,1,0) | 70 | (−55,0,0) |
| forty-five | (4.191,4.622,4.191) | (0,1.2,0) | 50 | (−30,45,0) |
| low-angle | (0,0.537,3.195) | (0,1.7,0) | 45 | (20,0,0) |
| low-wide | (0,0.565,2.844) | (0,1.6,0) | 90 | (20,0,0) |
| over-shoulder | (−1.507,1.641,2.724) | (0.4,1.35,0) | 45 | (−5,−35,0) |
| over-shoulder-right | (1.507,1.641,2.724) | (−0.4,1.35,0) | 45 | (−5,35,0) |
| bird-eye | (0,7.972,0.697) | (0,0,0) | 80 | (−85,0,0) |
| dutch | (2.898,1.642,4.139) | (0,1.2,0) | 50 | (−5,35,**10**) |

Áp preset:
- **Không chọn nhân vật** (`applyCameraPresetToNode`): ghi position/rotation/fov/lookAt, **xoá `subject`**.
- **Có chọn nhân vật** (`applyCameraPresetToSubject`): `offset = (pos.x − look.x, pos.y, pos.z − look.z)`,
  `lookAtOffset = (0, look.y, 0)`, `follow:false`, `followRotation:true`, `overridesMotion:true`;
  rotation.y += yaw nhân vật.

### 5.6 Preset chuyển động (29) — `CAMERA_MOTIONS`
Mọi preset: `durationMs` 400–6000 (bước 100), `strength` 0–1. Mặc định 2000 ms, `ease-in-out` trừ khi ghi khác.
| id | recipe | mặc định đáng chú ý | targetPolicy |
|---|---|---|---|
| static_shot | static | | none |
| tilt_up / tilt_down | pan-tilt pitch ±12 | | none |
| pan_left / pan_right | pan-tilt yaw +12 / −12 | | none |
| crane_up / crane_down | translate world (0,±1,0) | distance 0.8 | none |
| truck_left / truck_right | translate local (∓1,0,0)… (left = −1) | distance 0.8 | none |
| dolly_in / dolly_out | translate local (0,0,±1), lockTarget | distance 0.8 | optional |
| zoom_in / zoom_out | zoom ∓12 | | none |
| handheld_shot | shake amp .04 freq 3 | 12 key | optional |
| slider_reveal | path slider-reveal | distance 1 | optional |
| foreground_wipe | path foreground-wipe | | **required** |
| push_through | path push-through | 1200 ms, ease-in, distance 1.4 | optional |
| whip_pan | pan-tilt yaw −52 | 700 ms, ease-out | optional |
| rack_focus | focus-shift | | **required-focus** |
| crash_zoom | zoom −24 | 700 ms, ease-out | none |
| follow_tracking / leading_tracking / profile_tracking | path follow/leading/profile | 2400 ms, 8 key | **required** |
| orbit_180 | orbit yaw 180 | 2600 ms | optional |
| ascending_orbit / descending_orbit | orbit yaw 150, height ±0.7 | 2600 ms | optional |
| aerial_establishing | path aerial | 2600 ms, fov +6 | optional |
| fpv_flythrough | path fpv | 2600 ms, 12 key | **required** |
| drone_dive | path dive | 1800 ms | optional |
| pull_away | path pull-away | 2600 ms, fov +8 | optional |

(Bảng đầy đủ kèm tên/mô tả gốc tiếng Trung nằm trong `data/cameraLibrary.ts` — chép nguyên mảng JSON.)

---

## 6. Gắn nhân vật (`subjectBinding.ts`)

- **Yaw nhân vật** không đọc thẳng `rotation.y` (Euler XYZ có dạng tương đương như (−180, 29, −180)):
  `fwdX = sin(y)`, `fwdZ = cos(x)·cos(y)`, `yaw = atan2(fwdX, fwdZ)`.
- Cục bộ → thế giới (yaw quanh Y, +Z cục bộ = hướng mặt):
  `x = P.x + l.x·cos + l.z·sin;  y = P.y + l.y;  z = P.z − l.x·sin + l.z·cos`.
  (Viết sai dấu sin → máy bị lật sang phía bên kia nhân vật.)
- `resolveSubjectCameraPose(binding, pos, rot)`: yaw = `followRotation ? subjectYaw : 0`;
  position = toWorld(offset), lookAt = toWorld(lookAtOffset).

---

## 7. Áp lên three.js (`applyEvaluatedCamera`)

```js
camera.position.set(pos)
if (useEuler) camera.rotation.set(rad(rot.x), rad(rot.y), rad(rot.z))      // thứ tự XYZ mặc định
else {
  camera.lookAt(lookAt)
  // nếu rotation đã soạn (transform.rotation) cho cùng hướng nhìn → dùng nó để GIỮ ROLL (vd. preset dutch)
  if (authoredRotation && sameCameraAim(pos, lookAt, manualCameraLookAt(pos, authoredRotation, 1)))
    camera.rotation.set(rad(authored.x), rad(authored.y), rad(authored.z))
}
if (camera.fov !== fov) { camera.fov = fov; camera.updateProjectionMatrix() }
camera.updateMatrixWorld()
```
`manualCameraLookAt(pos, rot, d) = pos + d·(−sin y, sin x·cos y, −cos x·cos y)`.
`sameCameraAim` so 2 vector hướng đã chuẩn hoá, sai < 1e-6.
Aspect: `camera.aspectRatio` riêng của máy, không có → tỉ lệ của tài liệu.
Ghi chú: đường cong `camera.rollDeg` được nướng (shake) nhưng `CameraRig` hiện **không đọc** roll từ clip; roll hiệu lực
đến từ rotation soạn tay / keyframe rotation.

---

## 8. Sửa máy khi đã có chuyển động (editor)

- `rebaseCameraMotionsToPosition(doc, cam, worldPos, f)`: kéo máy ở frame `f` → cộng cùng delta vào **mọi** đường cong
  position/lookAt, mọi điểm trong `source` (startPosition, pivot, startLookAt, lookAtTarget, positionPath, lookAt.path,
  targetFallback.position, target.point) và pose tĩnh. Delta < 1e-4 → bỏ qua.
- `rotateCameraMotionsByAim(doc, cam, pivot, fromLook, toLook)`: quaternion từ hướng cũ → mới, xoay toàn bộ các điểm trên
  quanh vị trí máy. Roll không làm đổi quỹ đạo. fov/preset giữ nguyên.
- Nếu máy có `lookAtTarget`, lookAt tĩnh không bị dời/xoay.
- Có clip chuyển động → UI cấm sửa keyframe (`cameraMotionOwnsKeyframes`).
- Khung kết thúc xuất video mặc định = `frameEnd` lớn nhất trong các clip của máy đó (`defaultVideoExportEndFrame`).

---

## 9. Xuất: lấy mẫu chuỗi shot (`sampleCameraSequence`)

Cho mỗi shot trong sequence (theo thứ tự): `duration = (srcEnd − srcStart + 1)/fps` giây, `count = ceil(duration·sampleFps)`.
- Mẫu `i = 0..count−1`: `side = 'right'`, `sourceFrame = srcStart + (i/sampleFps)·fps`.
- Mẫu cuối `i = count`: `side = 'left'`, `sourceFrame = srcEnd + 1` (biên phải, **thuộc shot này**).
- Mỗi mẫu: `evaluateFrame(scene với exportSampleBoundary = side, sourceFrame)` → `applyEvaluatedCamera` →
  `{shotId, cameraNodeId, sourceFrame, shotTimeSeconds, sequenceTimeSeconds, side, position, quaternion, lookAt, verticalFov, aspect, near, far}`.
- Hai shot kề nhau có 2 pose cùng `sequenceTime` (cuối shot A + đầu shot B) → cắt cứng chính xác.
- Kiểm tra: camera phải `perspective`, aspect > 0, `0 < near < far`, mọi giá trị hữu hạn, 0 < fov < 180.
- Cảnh báo "camera đứng yên" (`filmCameraWarnings`): shot mà mọi mẫu có vị trí lệch ≤ 1e-5, fov lệch ≤ 1e-5, `1−|q·q0|` ≤ 1e-10.

## 10. (Tuỳ chọn) Xuất BBS FS / Minecraft (`apps/studio/src/filmCamera.ts`)
- Lấy mẫu **20 Hz**, thời gian phải đúng lưới tick (sai > 1e-8 → lỗi). Tối đa 3 shot, 256 mẫu/shot, shot liên tục từ tick 0.
- Từ quaternion: `d = forward(−Z)`, `u = up(+Y)`;
  `yaw = atan2(−dx, dz)`, `pitch = −atan2(dy, hypot(dx,dz))` (dương = nhìn xuống),
  `roll = atan2(−ux·cy − uz·sy, −ux·sy·sp + uy·cp + uz·cy·sp)`; **yaw += 180** (quy ước clip camera BBS).
- Unwrap góc theo mẫu trước; chọn nhánh tương đương `(yaw+180, 180−pitch, roll+180)` nếu gần hơn (tránh nhảy qua cực).
- Clip `bbs:keyframe`, 7 kênh tuyệt đối (x,y,z,yaw,pitch,roll,fov), `interp: linear`, `additive=false`,
  `envelope.enabled=false`, **không** có clip `bbs:idle` ở gốc. FOV = FOV dọc.
- Neo thế giới (`applyFilmWorldAnchor`): xoay XZ quanh `sourceOrigin` góc `yawDegrees`, dời tới `destination`,
  cộng `offset.y`, `yaw += yawDegrees`.
- Đã kiểm: 784 giá trị, sai vị trí 3e-14 m, góc 1.7e-6°, FOV 0 (xem `docs/CAMERA-BBS-SEMANTICS-2026-11-01.md`).

---

## 11. Chuyển sang 3JsStudio (HyperFrames) — hướng dẫn cụ thể

1. **Chép** (đổi TS → JS ES module, bỏ type) vào `engine/camera/`:
   `CameraRig.js`, `bakedCurve.js`, `bakeMotion.js`, `cameraLibrary.js`, `subjectBinding.js`, `cameraAim.js`,
   `keyframeTrack.js` (phần sample + alignEulerDeg), `focalLength.js`, `cameraTransform.js`, và hàm `evaluateCameras`
   rút gọn (§3). Ghi đầu mỗi file: `// Port từ Scene3D by Topview (Apache-2.0)`; thêm LICENSE/NOTICE gốc vào `engine/camera/`.
2. **Tất định** (luật CLAUDE.md): trong `bakeCameraMotionClip` thay `Date.now()` / `Math.random()` (id clip, `generatedAt`)
   bằng id từ shot (`${shot.id}:${presetId}`) và bỏ `generatedAt`. Nướng **một lần lúc dựng**, không nướng trong `hf-seek`.
3. **Thời gian**: `hf-seek` → `t` giây → `frame = t·30` (root `data-fps=30`) → `evaluateCameras` → `applyEvaluatedCamera`
   → `renderer.render()` một lần. Không dùng rAF / damping của `EditorCameraController` cho camera phim.
4. **Tỉ lệ**: Topview dùng mét, nhân vật ~1.8 m, ngực 1.2 m. R6 cao ~5.2 stud → hệ số `k ≈ 5.2/1.8 ≈ 2.9`.
   Nhân `k` cho: position/lookAt preset, hằng **thang cảnh 4**, `CHARACTER_LOOK_AT_HEIGHT` (1.2), biên độ shake,
   `heightDelta`, `distance`. Không nhân fov/góc. Đặt một hằng `SCALE = k` trong `cameraLibrary.js`.
5. **Ánh xạ loại shot** (`engine/shots.js`) → preset:
   | Loại shot | Preset máy | Preset chuyển động gợi ý |
   |---|---|---|
   | establish | top-wide / bird-eye | aerial_establishing, pull_away |
   | crowd | forty-five | pan_left/right, truck |
   | walkBy | side-close | profile_tracking |
   | follow | back-medium (gắn subject, follow=true) | follow_tracking |
   | closeup | front-close | dolly_in, crash_zoom |
   | reaction | front-close / dutch | zoom_in, handheld_shot |
   | overShoulder | over-shoulder(-right) | static_shot |
   | insert | front-close (lookAt đạo cụ) | rack_focus |
   | chase | low-wide | leading_tracking, handheld_shot |
   | reveal | low-angle | orbit_180, ascending_orbit, whip_pan |
   | dialogue | over-shoulder trái/phải xen kẽ | static_shot |
6. **Trường shot** đề xuất trong `shots.js`: `cam: 'front-close'`, `move: 'dolly_in'`, `moveCfg: { durationMs, distance… }`,
   `subject: 'hero'`, `follow: true`. Mỗi shot → 1 nút camera (hoặc 1 máy dùng chung + 1 clip chuyển động / shot);
   chuỗi shot = `editorial.sequences[0].clips` (§2.5). `durationMs` mặc định = `shot.dur·1000`.
7. **Kiểm thử bắt buộc khi port** (đối chiếu số với App 2): chạy test gốc trong
   `evaluate/__tests__/camera*.test.ts`, `headless/__tests__/cameraSequence.test.ts`,
   `engine/__tests__/cameraAimRoll.test.ts` — chuyển sang `node --test`; tối thiểu kiểm:
   dolly_in 0.8 → dời đúng 3.2·k; orbit_180 ở e = 1 về phía đối diện; preset `dutch` giữ roll 10°;
   tua tới/lui/nhảy cóc cùng `t` ra cùng pose.

---

## 12. Bẫy đã gặp (đừng lặp lại)
- Đọc `rotation.y` làm hướng nhân vật → sai tới 121°. Dùng `subjectYawDeg`.
- Dấu sin trong cục bộ→thế giới sai → máy lật sang phía kia.
- Dời vị trí mà ghim lookAt → camera xoay quanh điểm nhìn ("hướng trôi"). Dời phải kéo lookAt theo.
- Nội suy Euler từng thành phần không `alignEulerDeg` → đổi Y kéo theo X/Z quay 180°.
- `camera.lookAt()` làm mất roll → dùng rotation soạn tay khi cùng hướng nhìn.
- Frame → ms phải theo **tỉ lệ khung**, không theo `(Δframe/fps)·1000`.
- Xuất BBS: clip giữ chỗ `bbs:idle` ở (0,0,0) chồng lên camera thật → camera nhảy về gốc. Không tạo clip idle.
- Mất key camera khi tách/sao chép shot (B32/B44/B58) → sau mỗi thao tác, kiểm cảnh báo "camera đứng yên".
