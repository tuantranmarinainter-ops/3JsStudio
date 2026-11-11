---
name: hieu-ung-hinh
description: Chỉnh lớp HIỆU ỨNG HÌNH (hậu kỳ trên GPU) của tập phim — màu theo cảnh, toả sáng (bloom), mờ hậu cảnh ở cảnh cận, tối viền + hạt phim, viền đen nhân vật, mưa bão trên màn hình — trong engine/post.js, mỗi hiệu ứng bật/tắt riêng, so A/B và xuất thử. Dùng BẤT CỨ KHI NÀO người dùng nói "màu", "tối/sáng quá", "nhạt", "chói", "bloom", "mờ hậu cảnh", "viền nhân vật", "hạt phim", "tối góc", "mưa", "hiệu ứng hình", "chỉnh màu cảnh…" — kể cả khi không nhắc tên skill.
---

# Hiệu ứng hình (engine/post.js)

Cách vẽ: cảnh vẽ ra canvas như cũ → chép khung (`copyFramebufferToTexture`) → chuỗi hiệu ứng (outline → bokeh → bloom → grade). Tắt hết = giống hệt bản gốc. Mọi thứ tất định theo t (hạt phim theo khung, mưa/chớp theo t).

## Chỗ sửa
| Muốn | Sửa |
|---|---|
| màu một bối cảnh | `GRADES[<preset ánh sáng>]` (`sat`, `con`, `temp` ấm>0/lạnh<0, `gain`, `lift`); preset của shot = `light` trong shots.js hoặc `light` của env (`engine/envs.js` LIGHTS) |
| bật/tắt mặc định | `FX_DEFAULTS`; nhãn ô: `FX_LABELS` |
| bloom | `new UnrealBloomPass(…, strength, radius, threshold)` + `bloom.strength` trong `render()` (bão: + flash) |
| mờ hậu cảnh | trong `render()`: `k = (26 − dist)/16` (khoảng cách camera→điểm nhìn), `aperture`, `maxblur` |
| viền nhân vật | `edgeThickness` (+ trong `resize()`), `edgeStrength`, màu `visibleEdgeColor` |
| tối viền / hạt / mưa | `GradeShader.fragmentShader` (uVig, uGrain, `rainLayer`) |
Dựng lại: `node tools/build.mjs ep001 hieu-ung-hinh`.

## Bẫy đã gặp
- Đừng chuyển sang RenderPass + OutputPass: shader nước/trời tự xuất màu → bị đổi màu 2 lần, hình nhạt.
- OutlinePass gốc cộng sáng (viền phát sáng) → đã vá shader ngay lúc chạy (phủ đen, bỏ viền xuyên tường); nâng three thì kiểm cảnh báo `[post] không vá được shader viền`.
- Bloom ngưỡng thấp làm chân trời loé trắng → giữ threshold ≥ 0.9.
- Khi xuất 2K/4K, nút xuất gọi `window.__post.resize()`; thông số tính theo pixel phải nhân `pr()`.

## Kiểm
- A/B nhanh: `node tools/look.mjs episodes/ep001/index.html --t 27,64,117.3,129 --opts '{"fx":{"grade":false,"bloom":false,"dof":false,"vignette":false,"outline":false,"storm":false}}' --ab episodes/ep001/index.html`
- Tất định: `look.mjs … --det`.
- Xuất thật: `node tools/export-test.mjs dist/ep001.html --range 126:131 --matrix "fx=none,all,outline" --frames 128,130`.
