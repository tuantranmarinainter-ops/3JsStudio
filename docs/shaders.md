# Danh mục shader — thư viện có sẵn trước, tự viết sau

Nơi chứa: `engine/shaders/<nhóm>/<họ>.js` theo quy ước `engine/shaders/registry.js`.
Mỗi tập chỉ nạp họ nó dùng (`episodes/<ep>/shaders.json` → bản gộp chỉ chứa họ đó).
Nguyên tắc (người dùng chốt 2026-11-12): **dùng repo có sẵn khi có; chỉ tự viết chỗ không có thư viện tốt.**
Điều kiện chọn thư viện: giấy phép cho thương mại (YouTube kiếm tiền), chạy three.js thuần (không React),
đặt được thời gian bằng tay (tất định theo t, ngẫu nhiên có seed), ít program/pass (Chrome/ANGLE Windows dịch 0,03–0,5 s mỗi program).
Nghiên cứu: 3 agent ngày 2026-11-12 (GitHub/npm). ⚠ = chưa chạy thử trong repo, phải thử tất định + đếm program trước khi dùng.

Ký hiệu nguồn: **có sẵn** = trong three/addons hoặc engine; **repo** = thư viện ngoài; **tự viết** = không có thư viện tốt.

## 1. Bề mặt / chất liệu (`be-mat`)
| Họ | Nguồn đề xuất | Dự phòng | Ghi chú |
|---|---|---|---|
| Đất, đá, cát, sỏi, gỗ, gạch, ngói, vải, kim loại gỉ | **repo asset**: ảnh vân CC0 Poly Haven / ambientCG (512–1K) + 1 material chung + triplanar (tự viết ~20 dòng) | engine `materials.js` gom họ (đang làm) / `bake.js` nướng vân | Ảnh thật = hình thật nhất, 1–3 program; đổi lại HTML nặng thêm (ước tính 10–40 MB, chưa đo) |
| Tuyết, tuyết phủ | có sẵn `winter.js applySnowCover` | `bake.js` | |
| Băng, đá băng, kính | **có sẵn** `MeshPhysicalMaterial` (transmission, ior, thickness) + ảnh vân băng/sương giá | | transmission vẽ thêm 1 lượt |
| Toon / cel | **có sẵn** `MeshToonMaterial` | | |
| Viền đen | **có sẵn** `OutlineEffect` (addons) / post.js outline | `postprocessing` Outline | |
| Mở rộng material gọn | **repo** `three-custom-shader-material` (MIT, vanilla) | `onBeforeCompile` | cùng shader → chung program |
| Hàm noise GLSL | **repo** `stegu/webgl-noise` (MIT, chép vào repo) | `glNoise` (MIT) | ❌ LYGIA cần mua license thương mại; ❌ `tsl-textures`/TSL cần WebGPURenderer |

## 2. Trời & thiên thể (`troi`)
| Họ | Nguồn | Dự phòng | Ghi chú |
|---|---|---|---|
| Trời ngày / hoàng hôn | **có sẵn** three `Sky` (addons) | | 1 shader, tất định |
| Trời đêm, sao, trăng, phối cảnh xa | **repo** `@takram/three-atmosphere` (MIT) ⚠ | Sky + sao tự viết | cần `postprocessing`; beta; precompute nhiều pass 1 lần |
| Mây thể tích | **repo** `@takram/three-clouds` (MIT) ⚠ | mây billboard tự viết | ⚠ dùng temporal upscale + jitter → có thể KHÔNG tất định; peer React |
| Mây khối / mây hoạt hình | có sẵn `clouds.js`, `winter.js createClouds` | | |
| Trời gradient hoạt hình, cực quang, cầu vồng | **tự viết** | | không có thư viện MIT tốt |

## 3. Không khí (`khong-khi`)
| Họ | Nguồn | Dự phòng | Ghi chú |
|---|---|---|---|
| Tia nắng (god rays) | **repo** `three-good-godrays` (zlib) ⚠ | `postprocessing` GodRaysEffect | cần shadow map; three <0.188 |
| Phối cảnh khí quyển | **repo** three-atmosphere `AerialPerspectiveEffect` ⚠ | tự viết theo depth | |
| Sương mù theo độ cao / sương thể tích / sóng nhiệt | **tự viết** (chunk nhỏ) | | |
| Bụi, khói, hơi nước | **repo** hệ hạt (mục 5) | `fx.js fxDust/fxPuffs` | |

## 4. Thời tiết (`thoi-tiet`)
| Họ | Nguồn | Ghi chú |
|---|---|---|
| Mưa, tuyết, sét, gió | có sẵn `fx.js` (fxRain, fxSnow, fxBolt, fxWind), `winter.js`, `seaweather.js` | |
| Mưa đá, lá bay | hệ hạt (mục 5) hoặc tự viết hạt GPU | không có thư viện vanilla đáng tin |
| Vũng nước, bề mặt ướt, giọt nước ống kính | **tự viết** | |

## 5. Ánh sáng, lửa, hạt (`anh-sang`)
| Họ | Nguồn | Dự phòng | Ghi chú |
|---|---|---|---|
| Hệ hạt (tàn lửa, bụi, phép thuật, đom đóm) | **repo** `three-nebula` (MIT) ⚠ — có `setSeed`, `update(dt)` | `three.quarks` (MIT, batch ít draw) ⚠ kiểm Math.random | tua tới t = mô phỏng lại từ 0 với bước cố định |
| Lửa, nến, đèn lồng | **repo** `@wolffo/three-fire` / `THREE.Fire` (MIT) ⚠ — `update(time)` | tự viết | |
| Đèn đường, cửa sổ sáng, neon | **có sẵn** vật liệu phát sáng + bloom (post.js) | | không thêm/bớt đèn theo t |
| Tia điện | có sẵn three `LightningStrike` (addons) ⚠ | tự viết polyline có seed | |

## 6. Nước & chất lỏng (`chat-long`)
| Họ | Nguồn | Dự phòng | Ghi chú |
|---|---|---|---|
| Biển | có sẵn `water.js`, `sea.js`, `seaweather.js` | | |
| Hồ, ao, sông | **có sẵn** three `Water.js` (addons) | `Water2` ⚠ đồng hồ trong | |
| Caustics | **tự viết** texture/uniform (tham khảo martinRenou BSD-3) | `@pmndrs/vanilla` Caustics (nặng) | |
| Dung nham, chất nhờn, bong bóng, thác, dưới nước | **tự viết** | | không có thư viện tốt |

## 7. Hiệu ứng vật thể (`vat-the`)
| Họ | Nguồn | Ghi chú |
|---|---|---|
| Hologram | **repo** `ektogamat/threejs-vanilla-holographic-material` (MIT) ⚠ | `update()` tự gọi |
| Tan biến, đóng băng, nhìn xuyên, cháy xém, chớp trúng đòn | **tự viết** trên CSM (20–40 dòng mỗi cái) | |

## 8. Giao diện trong cảnh — luật game (`giao-dien`)
| Họ | Nguồn | Dự phòng | Ghi chú |
|---|---|---|---|
| Chữ/số tiếng Việt 3D | **repo** `troika-three-text` (MIT) ⚠ — phông nhúng, `useWorker:false`, `preloadFont` | CanvasTexture | mặc định tải phông từ CDN → phải chặn |
| Thanh máu, pin, số trên đầu, đếm ngược | **tự viết** billboard + atlas chữ | | |

## 9. Hậu kỳ (`hau-ky`)
| Họ | Nguồn | Ghi chú |
|---|---|---|
| Quang sai, glitch, nhiễu, scanline, LUT, méo ống kính, tilt-shift, pixel, shock wave, god rays | **repo** `pmndrs/postprocessing` (zlib) — `EffectPass` gộp nhiều hiệu ứng thành 1 pass/1 program | three ≥0.168 <0.188 (r187 vừa); KHÔNG cắm chung composer addons → hoặc chuyển cả post.js, hoặc chép GLSL ra 1 ShaderPass |
| Chuyển cảnh | **repo** `gl-transitions` (MIT, vài file BSD) | `progress` là uniform → tất định |
| Vệt tốc độ anime, chớp trắng | **tự viết** | |
| Đã có | post.js: grade, bloom, dof, vignette, outline, storm, paint, ao, smaa | |
| Không dùng | realism-effects (nhiều pass, thử nghiệm) | |

## Việc phải thử trước khi dùng (spike)
1. three-nebula / three.quarks: tua tới–lui cùng hình, đếm program.
2. takram atmosphere/clouds: tất định khi tắt temporal; số program precompute.
3. postprocessing: chuyển post.js sang EffectComposer của pmndrs có giữ được hình + Kuwahara/AO không.
4. troika: chạy trong bản gộp 1 file, phông nhúng, chữ có dấu chồng (ặ ệ ữ).
5. Ảnh vân CC0: dung lượng thật 38 chất liệu ở 512/1K.
