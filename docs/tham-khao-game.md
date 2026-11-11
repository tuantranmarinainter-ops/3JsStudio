# Tham khảo 2 game mẫu → lõi engine

Danh mục **mọi kỹ thuật** học được từ hai game một file do Claude Fable 5.2 viết, kèm module lõi đang (hoặc sẽ) chứa nó.
Nguyên tắc của người dùng: *cái gì học được cũng phải thành code LÕI (module dùng lại cho mọi tập), không sửa lẻ cho một tập.*

- **Tidewright** (`scratchpad/games/tidewright.html`): game chèo thuyền trong bão, ban đêm → bình minh. Các module: 00-core (dòng 36),
  10-env (495), 20-sky (872), 21-ocean (1161), 30-world (1983), 40-boat (3635), 41-fx (4645), 50-post (5570), 60-audio (6222),
  70-game (7335), 71-ui (8706), 90-main (10024).
- **Saltline** (`scratchpad/games/src-salt/index.html`, 6193 dòng, gần như đã minify): FPS ở bến cảng mưa. Dòng rất dài, nên số dòng
  dưới đây chỉ là chỗ bắt đầu.

Trạng thái: ✅ đã có (ghi module) · 🟡 mới có một phần · ⬜ chưa làm (kèm kế hoạch ngắn).
Bắt buộc với mọi mục: chỉ là hàm thuần của `t`, rng có seed, không rAF/đồng hồ/lịch sử khung, có ô bật/tắt trong `engine/post.js`
(`FX_DEFAULTS`/`FX_LABELS`), và **tắt ô đi thì hình phải y hệt lúc chưa có tính năng**.

## 1. Biển: sóng và chuyển động

| Kỹ thuật | Là gì | Nguồn | Lõi | TT |
|---|---|---|---|---|
| Sóng Gerstner chạy song song CPU/GPU | Một tổng sóng duy nhất: shader đẩy đỉnh, CPU tính lại đúng độ cao đó để vật nổi khớp sóng | TW 10-env 495–870 (`twWave`, 569 displacement, 596 tìm độ cao bằng cách đảo dịch ngang) | `engine/water.js` (`sample`), `engine/sea.js` (`clock`) | ✅ |
| Lọc sóng ngắn theo đáy thân | Lấy trung bình sóng trên cả đáy thân (sinc·sinc), nên sóng nhỏ không làm thân to giật | TW 40-boat (cách cưỡi sóng) | `water.js` `sample(...,{box})` | ✅ |
| Thân cưỡi sóng | Nhấp nhô, chúi, lắc lấy từ trung bình các "nhịp trễ" của trường sóng, không dùng lò xo theo khung | TW 40-boat `update` 4548; Saltline bob ~5463 | `engine/floating.js` `floatHull`/`floatPose`/`floatTilt` | ✅ |
| Bóng tiếp xúc + bọt quanh thân | Mặt nước tối và có bọt ôm quanh thân, nên thuyền trông như "ngồi" trong nước | TW 21-ocean 1174 | `water.js` `setHull` | ✅ |
| Vệt ướt trên thân | Thân tối và bóng hơn dưới đường nước + 0.4 | Saltline (thân ướt) | `floating.js` `wetline` | ✅ |
| Sự kiện mặt nước | Sóng vòng lan ra + hố lõm + bọt khi có vật rơi hoặc nhảy, ≤ 8 sự kiện | TW 21-ocean (Maw), 41-fx splash | `water.js` `setEvents`, `whales.js` `breachEvents`/`wakeEvents` | ✅ |
| Thang thời tiết biển | Các preset lặng → giông → bão, nội suy được trong một shot (màu, bọt, mưa, chớp, gió) | TW `state.storm` 521, `uWeather` 740 | `engine/seaweather.js` | ✅ |
| Nước văng | Vương miện nước + giọt + sương khi vật xuyên mặt nước | TW 41-fx spray/splash (4756) | `engine/splash.js`, `engine/whales.js` (agent C) | ✅ |
| **Lưới biển vòng lồng nhau bám camera** | 9–10 vòng vuông, mỗi vòng thô gấp đôi vòng trong, snap theo lưới thế giới (`floor(cam/2c)·2c`), vẽ 1 lần: gần mịn, xa rẻ, không bơi lưới | TW 21-ocean 1164, 1183, 1244 | (đề xuất) `engine/seamesh.js` | ⬜ Dựng `createRingSea(THREE,{levels,cell})` thay `PlaneGeometry`; vertex shader nhận `uCamPos`, ghép mép vòng (morph) tránh nứt; `water.js` chọn lưới qua tuỳ chọn `mesh:'rings'` |
| **Texture sóng vụn nướng sẵn, lát liền** | 2 texture có mipmap (độ dốc / độ cao / đỉnh) nướng 1 lần lúc init, lấy mẫu ở 4 tỉ lệ xoay theo gió, thay noise tính trong shader | TW 21-ocean 1167, 1189 `SLOPE_S`, 1238 `chopH` | (đề xuất) `engine/chop.js` | ⬜ Nướng bằng FFT/tổng sin có seed vào `DataTexture` RGBA16F; `water.js` dùng nó cho pháp tuyến chi tiết khi ô `chop` bật; gần camera 2 lớp thô cũng nâng hình học (1252) |
| **Vệt sau thuyền giải tích** | TW dùng texture mô phỏng (cuộn, phân rã, khuếch tán, có lịch sử khung → không dùng được ở ta) | TW 21-ocean 1185–1198, 1799–1830 | (đề xuất) `water.js` + `floating.js` | 🟡 Hiện có `whales.js wakeEvents` (chuỗi sự kiện vòng). Kế hoạch: vệt chữ V Kelvin giải tích từ đường đi `pathAt(t)` (lấy mẫu N điểm quá khứ, mỗi điểm = 2 vạch bọt mảnh ở góc 19.5° + dải sục khí sau lái, tuổi = t − tᵢ) → hàm thuần của t |
| Sóng vỡ vào bờ | Bọt sóng bờ theo khoảng cách tới bờ + pha sóng, chạy dọc bãi | TW 21-ocean 1423 (`shore = wm.g`), 1577 | `water.js` (bọt bờ: đường thẳng / vòng tròn) | 🟡 Đã có dải bọt bờ tĩnh. Kế hoạch: vạch sóng chạy vào bờ theo `fract(dist/λ − t·c)`, bọt nhiều khi nước nông, nước tràn mỏng lên cát |

## 2. Biển: shading

| Kỹ thuật | Là gì | Nguồn | Lõi | TT |
|---|---|---|---|---|
| Fresnel + phản chiếu trời + thân nước tối | Mặt sóng định hình bằng giá trị sáng tối: Schlick, phản chiếu trời trên pháp tuyến chi tiết, thân nước tối, che theo độ cao | TW 21-ocean 1169, 1702 | `water.js` | ✅ |
| Bọt Jacobian | Bọt ở chỗ mặt sóng gập (1 − J) + noise | TW 21-ocean 1172, 1555 | `water.js` (`foam:[lo,hi]`) | ✅ |
| **Bọt ren có tuổi (lịch sử Jacobian)** | Jacobian tính lại GIẢI TÍCH ở các pha trễ 1.2 s và 2.6 s (`uJac[8]` = cos/sin của độ lệch pha từng sóng): bọt mới đặc → ren → vệt gió mảnh, không cần lưu khung cũ | TW 21-ocean 1374, 1555–1570 | (đề xuất) `water.js` | ⬜ Thêm uniform `uJacLag` (cos, sin của ω·1.2 và ω·2.6 cho từng sóng); fragment tính J(t), J(t−1.2), J(t−2.6); cắt thành ren bằng texture bọt đã cân bằng histogram (`chop.js`) |
| **Độ rộng ánh lấp lánh theo phương sai dốc bị mất** | Một thùy chói cứng, chuẩn hoá năng lượng; độ nhọn `shin = 1/(σ² + 0.004)`, với σ² = phương sai dốc mà mip/kích thước điểm ảnh đã lọc mất → gần thì lấp lánh, xa thành vệt mềm, không nhiễu hạt | TW 21-ocean 1170, 1651–1660 | `water.js` (`glint`) | 🟡 Đang có chói theo `glint` cố định. Kế hoạch: tính σ² từ `fwidth` của pháp tuyến chi tiết (hoặc mip của `chop.js`), thay số mũ cố định bằng `shin` |
| **Đỉnh sóng ngọc bích ngược sáng** | `backlit(L,N,V)`: ánh trăng/mặt trời/chớp xuyên qua phần mỏng của đỉnh sóng, màu ngọc xám xanh theo độ mỏng | TW 21-ocean 1410, 1644–1648 | `water.js` (`sss`) | 🟡 Có SSS đỉnh sóng theo độ cao. Kế hoạch: thêm hàm `backlit` theo hướng đèn so với mắt + `thin` (độ cao đỉnh × độ dốc) và màu `jade` riêng |
| **Cột phản chiếu đèn** | `column(R,L,k,stretch)`: thùy phản chiếu của đèn (lồng đèn, hải đăng, trăng) bị kéo dọc thành cột về phía mắt như trên biển động; ánh lửa = cột vệt ấm mảnh | TW 21-ocean 1403–1404, 1661–1667 | (đề xuất) `water.js` + `uLamps[4]` | ⬜ Thêm tối đa 4 đèn điểm (vị trí, màu, cường độ) vào uniform của nước; env khai báo `lamps:[…]`; dùng pháp tuyến nửa chi tiết để cột thành vệt mềm |
| **Vòng mưa trên mặt nước** | Lớp vòng gợn nở ra theo ô lưới + hash có seed, trả về nhiễu loạn độ dốc; mức chất lượng 2 | TW 21-ocean 1382, 1919 | (đề xuất) `water.js` | ⬜ Hàm `rainRings(p, t)` (3 lớp ô, tuổi = fract(t·r + hash)) cộng vào pháp tuyến khi `seaweather.rain > 0`; ô bật/tắt `rainRings` |
| Sương muối sát mặt biển | Một dải sương ở 1–2° đầu trên chân trời nuốt mặt nước nhanh hơn không khí phía trên | TW 21-ocean 1731–1735, 20-sky 902 | `seaweather.js` (`spray`) | 🟡 Hiện chỉ kéo sương mù lại gần. Kế hoạch: thêm sương theo độ cao trong shader nước |

## 3. Trời, ánh sáng, thời tiết

| Kỹ thuật | Là gì | Nguồn | Lõi | TT |
|---|---|---|---|---|
| Ánh sáng môi trường (IBL) | Cầu trời gradient + đốm mặt trời / phòng studio dựng bằng code → kim loại, kính có cái để phản chiếu | TW 00-core `twSpec` 854; Saltline sky ~4232 | `engine/ibl.js` | ✅ |
| Vật liệu thật + bụi bẩn | Vật liệu theo loại (gỗ, sắt…), vân bụi | Saltline `Tn.*` 4957–5282 | `engine/materials.js`, `engine/grunge.js` | ✅ |
| Chớp mượt | Loé sáng 1 khung rồi tắt dần mũ, theo nhịp có seed | TW `state.flash` 523, 41-fx bolts | `engine/flash.js`, `seaweather.js` `lightningAt` | ✅ |
| Trời bão nhiều lớp | Tầng mây dày bị uốn miền (domain warp) + lớp mây vụn thấp trôi nhanh (thị sai), khe trăng viền bạc, chớp trong mây, màn mưa xiên, bình minh | TW 20-sky 872–1160 | `engine/winter.js` (Sky.js), `engine/clouds.js` | 🟡 Kế hoạch: `engine/stormsky.js` = shader cầu trời có 2 lớp mây + khe trăng + `twSky` hội tụ đúng màu sương ở chân trời; độ trôi mây = hàm của t (TW tích phân trên CPU, ta dùng tốc độ cố định × t) |
| **Đèn hải đăng quét** | Đèn biển với `lit`, màu và pha quay; tia sáng quét qua sương + chói trên mặt nước | TW 10-env 528, 697–705 (`beacons`, `beaconCol`) | (đề xuất) `engine/beacon.js` | ⬜ `createBeacon(THREE,{pos,color:'xanh',period})`: hình nón thể tích (additive, sương theo khoảng cách) quay theo `t/period`; truyền vào `uLamps` của nước để có cột phản chiếu. Đã chốt: hải đăng màu xanh |
| Tia sáng xuyên mây (god rays) | Mỗi điểm ảnh lấy 16 mẫu về phía đèn qua mức bloom thô; bóng của vật cắt tia | TW 50-post `FS_RAYS` ~5795 | (đề xuất) `engine/painterly.js` hoặc pass riêng | ⬜ Pass `rays` ¼ độ phân giải, đầu vào là vị trí đèn trên màn hình; mẫu lệch theo hash cố định (không rung theo khung) |
| Mưa | Vệt mưa xiên, bụi nước, giọt bắn | TW 41-fx 4648–4760; Saltline mưa ~4703–4733 | `post.js` (`storm`), `seaweather.js` (`rain`) | ✅ |

## 4. Hậu kỳ (post)

| Kỹ thuật | Là gì | Nguồn | Lõi | TT |
|---|---|---|---|---|
| **Kuwahara dị hướng (tranh sơn dầu)** | Tensor cấu trúc Sobel ở ½ độ phân giải → gauss → hướng + độ dị hướng → Kuwahara tổng quát 8 quạt, elip xoay theo nét | TW 50-post 5570–5760 | `engine/painterly.js` `createPainterlyPass`, ô **`paint`** "Tranh sơn dầu (Kuwahara)" (mặc định TẮT) | ✅ |
| Vải canvas + nổi sơn | Vân vải lệch 7°, lông cọ (LIC 5 tap theo hướng nét), vệt cọ, sơn đọng, cọ khô, hạt | TW 50-post composite 5880–5935 | `painterly.js` (`params.weave`) | ✅ |
| Giữ nét mảnh + đèn | Chi tiết mảnh (mưa, dây, sao) bị kéo về nền trước khi vẽ rồi trả lại sắc nét; đèn ấm không thành nét cọ | TW 50-post `FS_PRE` 5620, `show`/`warmBright` 5975 | `painterly.js` | ✅ |
| Nét cọ theo độ sâu | Gần thì nét chặt, biển xa rộng hơn, trời rộng nhất | TW 50-post `FS_TENSOR` 5645 | `painterly.js` `setDepth(tex, camera)` | 🟡 Đã có code; `post.js` chưa có depth texture nên đang dùng hằng `params.flat`. Kế hoạch: khi stage có `depthTexture` (render target của cảnh) thì gọi `post.paint.setDepth` |
| Bloom kiểu Karis 13 tap | Lấy mẫu xuống có trọng số theo độ sáng (không đốm sáng lẻ), kéo lên bằng lều 9 tap | TW 50-post 5760–5790 | `post.js` (UnrealBloomPass) | 🟡 Bloom đã có; đổi sang chuỗi Karis nếu thấy đốm sáng lẻ nhấp nháy |
| Tone map giữ màu + chỉnh màu tách tông | ACES pha ánh xạ theo kênh lớn nhất (cam lồng đèn không ngả vàng), vai cuộn về trắng ấm; bóng tối xanh chàm, sáng ấm, đường cong chữ S, sàn đen có màu | TW 50-post `tonemap`/`grade` 5850–5885 | `post.js` `GRADES` | 🟡 Có grade theo preset. Kế hoạch: thêm tách tông bóng/sáng (`sh`/`hi`) vào `GradeShader` |
| Khử dải màu (dither) | Dither tam giác 1 LSB để gradient đêm không bị dải | TW 50-post cuối composite | `post.js` (hạt phim của `vignette`) | 🟡 |

## 5. Thuyền và tàu

| Kỹ thuật | Là gì | Nguồn | Lõi | TT |
|---|---|---|---|---|
| Xuồng ván chồng mép đôi mũi | `sheerY/keelY/halfBeam/hullPt` → 8 ván chồng mép (lap 3 cm) + gờ tối dưới mép, ván trong, sườn, sống liền, sàn, băng ngồi, sàn mũi | TW 40-boat 3650–4030 | `engine/hull.js` `createHull({type:'skiff'})` (bí danh `kind`; đã chụp kiểm: `output/look/agentE2/`) | ✅ |
| Buồm lug + cột | 4 góc tack/clew/throat/peak, bụng buồm, yard + boom, dây chằng | TW 40-boat `CORNERS` 3865, mast 4005 | `hull.js` (`sail`, `sailAngle`, `camber`, `sailColor`) | ✅ (phồng theo gió: `userData.animate(t,{wind})`, hàm thuần của t) |
| Thân thép dựng theo trạm | Trạm dọc thân (dày ở 2 đầu) × hàng (dưới nước tuyệt đối, trên nước theo % mạn khô), mũi thon, đuôi vách lái, đáy phẳng + hông bo | Saltline `vb(` + `fn/ha/hs/Bo` (~5282) | `hull.js` `type:'ship'` | ✅ |
| Sơn hai màu + boot-top | Đỏ chống hà dưới đường nước, sọc đen, màu thân phía trên; loang, vệt chảy, rêu sát nước, gỉ (fbm 3D) | Saltline `hull_red`/`hull_paint` | `hull.js` `paintMaterial` (onBeforeCompile, nối tiếp được) | ✅ |
| Gân mối hàn, gờ chắn va, lỗ thoát nước + vệt gỉ, thang mớn nước, tên tàu | Chi tiết thân tàu bám mặt cong (miếng dán lấy mẫu trên mặt thân + đẩy theo pháp tuyến) | Saltline `vb` (`jt` mối hàn, `rust_run` decal 848470, `label("KITTIWAKE")`) | `hull.js` (`welds`, `fender`, `scuppers`, `rust`, `marks`, `nameL/nameR`) | ✅ |
| Bè gỗ | Thân gỗ tròn, xà ngang, dây buộc, buồm vuông | — (mở rộng) | `hull.js` `type:'raft'` | ✅ |
| Lồng đèn bão đung đưa | Lồng đèn trên móc sắt ở mũi, con lắc quanh điểm treo, quầng sáng | TW 40-boat 3852–3854, 4031; 41-fx halo | (đề xuất) `hull.js` `lantern:true` + `fx.js` | ⬜ Thêm bộ phận `lantern` (con lắc = hàm của độ chúi/lắc từ `floatHull`) + PointLight + quầng additive |
| Bánh lái / cần lái điều khiển được | Trục bản lề nghiêng, `rudder > 0` = rẽ phải | TW 40-boat 3857–3862 | `hull.js` (`rudderPivot`, `setRudder(rad)`) | ✅ |

## 6. Bến cảng và mặt đất ướt (Saltline)

| Kỹ thuật | Là gì | Nguồn | Lõi | TT |
|---|---|---|---|---|
| Texture vật liệu thủ tục | `Tn.hull`, `Tn.galv` (tôn mạ kẽm gợn), `Tn.water`… vẽ trên canvas có seed (vết, gỉ, đinh tán) | Saltline 4957–5282 | `materials.js` (một phần), `hull.js` (`woodTex/steelTex/sailTex/rustTex`) | 🟡 Kế hoạch: gom các hàm vẽ canvas vào một `engine/proctex.js` mới (repo chưa có) để mọi env dùng |
| **Nền ướt + vũng nước + phản chiếu phẳng** | Mặt bến ướt; vũng = gương sắc (`puddle = smoothstep(0,0.035,depth)`), nhựa đường ẩm chỉ có phản chiếu mờ kéo dọc, gợn mưa trong vũng | Saltline 5560–5650 (`Ib(`, `uWetG`, `uReflOn`, `uReflLod`) | (đề xuất) `engine/wetground.js` | ⬜ `createWetGround(THREE,{size,seed,puddles})`: mặt nạ vũng theo noise có seed; phản chiếu phẳng bằng camera gương render vào RT có mip (`uReflLod` = độ mờ theo độ ẩm); vòng mưa dùng chung hàm `rainRings`; ô `wet` |
| Hải âu | Bầy chim vẽ instanced, vỗ cánh trong vertex shader | Saltline ~5463 `saltline-gulls`; TW 41-fx gulls | (đề xuất) `engine/birds.js` | ⬜ Instanced, quỹ đạo vòng có seed, cánh = sin(t·f + pha) |
| Đèn nhấp nháy (blink) | Đèn tín hiệu đổi độ sáng theo thuộc tính đỉnh `blink` | Saltline 5449 `saltline-blink` | (đề xuất) `fx.js` | ⬜ |

## 7. Âm thanh thủ tục

| Kỹ thuật | Là gì | Nguồn | Lõi | TT |
|---|---|---|---|---|
| **Karplus–Strong** | Dây gảy (đàn hạc / tam thập lục) tổng hợp 1 lần cho mỗi cao độ rồi lưu lại | TW 60-audio 6497 | (đề xuất) `tools/sfx/` hoặc `engine/sfx.js` | ⬜ Viết `pluck(freq, seed)` bằng OfflineAudioContext → WAV (tất định) |
| Gió / biển / mưa / sấm tổng hợp | Nhiễu lọc + điều biến; sấm theo khoảng cách chớp; bus amb/sfx/mus → lọc 28 Hz → nén → cắt mềm; ducking nhạc | TW 60-audio 6222–6800 (`thunder` 6755) | `tools/sfx/*` (hiện là file có sẵn) | ⬜ Kế hoạch: `tools/sfx/synth.mjs` render từng lớp bằng OfflineAudioContext có seed (giống `TW.audio.selfTest`) → lớp **nen** / **khoanh-khac** |
| Nhạc thích nghi | Bản nhạc 6/8 D Dorian → D trưởng, hợp âm dẫn giọng bằng tay | TW 60-audio `CH` | — | ⬜ (chỉ học cấu trúc; lớp **nhac** vẫn dùng `music/plan.json`) |

## 8. Giao diện (UI)

| Kỹ thuật | Là gì | Nguồn | Lõi | TT |
|---|---|---|---|---|
| **Phong cách Tidewright** | "Đồng thau + giấy da": bảng màu CSS (`--tw-ink #0a1118`, `--tw-foam #e9efe6`, `--tw-ember #ffb45a`, `--tw-verdigris #6fb7a6`), chữ serif cổ (Iowan/Palatino), biểu tượng SVG nét mảnh trên lưới 24, lớp DOM phủ trên canvas, có `prefers-reduced-motion` | TW dòng 1–30 (CSS), 71-ui 8706+ | (đề xuất) `tools/export-ui.js` + skin trình phát | ⬜ Thêm skin tuỳ chọn cho trình phát (ô chọn giao diện) dùng biến CSS trên; giữ phông Be Vietnam Pro cho phụ đề (đã chốt) |
| Màn debug theo URL | `?uidemo=title|hud|…` dựng trạng thái giả để chụp từng màn hình | TW 71-ui 8713 | `tools/look.mjs --query` | ✅ (cùng ý: mọi lab có `?…` + `window.renderAt(t)`) |

## 9. Kiến trúc chung

| Kỹ thuật | Là gì | Nguồn | Lõi | TT |
|---|---|---|---|---|
| Texture nhiễu dùng chung | 256² lát liền: R fbm, G fbm2, B Worley F1, A trắng; gắn sẵn 1 đơn vị texture | TW 00-core 437–475 | `painterly.js` `makeNoiseTexture(THREE, seed)` | ✅ (dùng lại được cho nước / mặt đất) |
| Khối uniform "env" dùng chung | Mọi chương trình đọc cùng một khối: mặt trời, trăng, sương, thời tiết, đèn | TW 10-env 611–745 | `envs.js` + `lights.js` | 🟡 |
| Mức chất lượng cố định | q0/q1/q2 đổi biến thể shader, không tự đổi theo FPS | TW `qLevel` 50-post; 21-ocean 1919 | `painterly.params.quality` (0..2) | 🟡 Kế hoạch: một `engine/quality.js` chung (chưa có trong repo) |
| Tự kiểm offline | Render âm thanh bằng OfflineAudioContext rồi đo, vì không ai nghe được lúc phát triển | TW 60-audio đầu file | `tools/audio-check.py` | 🟡 |

## PHẦN 3 — Repo `thuann-vn/claude-3d-animated-shorts` (MIT)

Kỹ năng Claude làm short dọc 9:16 với nhân vật 3D thật (three.js), phong cách kênh RicksClips (đầu trắng, mặt lạnh, thân hình quả lê, tay mì).
Đã clone tạm ra ngoài repo để đọc mã (không chép asset; mã MIT, asset Kenney/KayKit CC0, Xbot/ngựa tải qua script).
Cấu trúc: `SKILL.md` (quy trình + giá trị nhìn đã duyệt) · `engine/stickrig.js` (405 dòng, dòng rất dài) · `engine/main.js` (750) ·
`engine/post.js` (47) · `engine/world.js` (347) · `tools/{captions,fit,sheet}.py`, `tools/tts.mjs` · `engine/render.cjs` · `upstream-2d/` (bản 2D gốc của mromidev).
Chỉ học kỹ thuật; không chép phong cách riêng của kênh (đầu trắng/mặt lạnh) hay nội dung. Ký hiệu: **SR** = `engine/stickrig.js`, **MN** = `engine/main.js`, **PP** = `engine/post.js` (số = dòng).

### 3.1 Hậu kỳ và ánh sáng

| Kỹ thuật | Là gì | Nguồn | Lõi | TT |
|---|---|---|---|---|
| **SMAA** (khử răng cưa hậu kỳ) | Chuỗi `postprocessing` (pmndrs): RenderPass → DoF → Bloom+Grade (một Effect tuỳ biến) → SMAA HIGH; buffer HalfFloat, tone map nằm trong grade (HDR trước đó) | PP 1–47 (`SMAAEffect`, `frameBufferType: HalfFloatType`) | `engine/post.js` (hiện chỉ MSAA của renderer, `stage.js` 46) | ⬜ Thêm `SMAAPass` (three/addons) cuối chuỗi, ô **`smaa`**; cần khi bật painterly/AO (RT không MSAA). Chủ file `post.js` làm |
| **n8ao** (AO màn hình) | `N8AOPostPass` chèn ngay sau RenderPass: aoRadius 0.9, falloff 0.8, intensity 2.6, màu nâu ấm `#3a2a22` → bóng dịu ở góc tường, dưới bàn ghế | PP `addAO` | `engine/ao.js` `createAO` (mẫu bán cầu mulberry32 + xoay theo toạ độ điểm ảnh → tất định; n8ao dùng nhiễu ngẫu nhiên) | ✅ (ô `ao`) |
| **Phòng studio RoomEnvironment** | `PMREMGenerator.fromScene(new RoomEnvironment(), 0.04)` làm `scene.environment`, cường độ 0.55 → PBR (kim loại, men) có gì để phản chiếu | MN 621 | `engine/ibl.js` (phòng studio dựng bằng code, 0.3–0.6) | ✅ (ô `ibl`) |
| Grade ACES + tách tông + vignette + hạt | Một Effect: ACES × exposure, tối xanh (`uShTint`), sáng ấm (`uWarm`), contrast/saturation, vignette bầu dục, hạt theo `uTime` | PP `frag` | `post.js` `GRADES` + `vignette` | ✅ (tách tông bóng/sáng = 🟡, xem mục 4) |
| Bloom mipmap | `BloomEffect` mipmapBlur, ngưỡng 0.9, mượt 0.25 | PP | `post.js` (UnrealBloom) | ✅ |
| DoF bokeh theo shot | `DepthOfFieldEffect`; API cũ `bokeh.focus/aperture` đặt riêng mỗi shot (cận: khẩu to) | PP `bokeh` adapter; MN từng shot | `post.js` (`BokehPass`, ô `dof`) | ✅ |
| **Tia nắng qua cửa sổ** | Nhân chéo từ cửa sổ xuống sàn, texture gradient cộng sáng (additive) + mảng sáng trên sàn nơi tia rơi; thêm `rays` hậu kỳ 40 mẫu theo `uSun` | MN 601–609; PP `rays` | chỉ có god rays hậu kỳ (đề xuất ở mục 3); env trong nhà chưa có | ⬜ `engine/fx.js` `sunShaft(THREE,{from,to,width})`: hộp mảnh additive gradient + mảng sáng sàn, tất định; ô `shafts` |
| **Kiểm độ sáng khung** | QA: luma TB ≈ 100–130 / 255, đầu nhân vật là thứ sáng nhất khung; đo trên 12 Short tham khảo | SKILL.md mục 3 + 6 | `tools/look.mjs` (cột "sáng", khoảng 100–150, ⚠ nếu lệch, `--luma a:b`) | ✅ |

### 3.2 Nhân vật

| Kỹ thuật | Là gì | Nguồn | Lõi | TT |
|---|---|---|---|---|
| **Viền nét cọ quanh nhân vật** | Vỏ lật mặt (BackSide) đẩy đỉnh theo pháp tuyến `inkPx` điểm ảnh MÀN HÌNH (dày như nhau ở mọi zoom); bản `inkClean` nhấp nhô dày/mỏng như vẽ tay, dày hơn dưới cằm; màu nâu đậm `#2a1612`, không đen tuyền; thêm dải viền trong để dính sát mặt | SR 65–73 (`inkPx`, `inkClean`, `inkM`), 93–95 | `post.js` `outline` (OutlinePass đồng đều, mặc định TẮT) | 🟡 Có viền đồng đều. Kế hoạch: `engine/ink.js` `inkHull(mesh,{px,seed})` — vỏ BackSide, độ dày = hàm của pháp tuyến (`sin` chồng, tất định), bù theo khoảng cách để giữ độ dày màn hình; ô riêng |
| **Mặt vẽ trên canvas (decal)** | Mỗi tâm trạng = 1 hàm vẽ trong `FACES` (mắt oval + mí nặng, miệng nhỏ); `wobble()` làm nét run; texture 1024² dán decal lên mặt cầu, đính theo bề mặt (không nổi khi nhìn ngang) | SR 74–129 (`faceTex`, `wobble`, `decal`); MN 74–97 | `engine/r6.js` `setFace` (8 biểu cảm, `faceStyle:'cartoon'`) | 🟡 Có 8 biểu cảm; ⬜ nét run `wobble` + decal bám cong |
| **IK 2 xương** (tay/chân) | `ik2(a,c,l1,l2,hint)` giải tay 2 đốt (khuỷu theo hint), `aim`, `limb` đặt bàn tay lên chuột/ly; chụp tư thế idle 1 lần rồi khôi phục mỗi khung (không cộng dồn xoay) | SR 335–400 (`ik2`, `limb`, `pose`, `clipAt`) | `r6.js` chỉ có pose theo `t` (không IK) | ⬜ `engine/ik.js` `solveArm(THREE,{shoulder,target,l1,l2,hint})` hàm thuần; r6 gọi cho `point`/cầm vật (tránh tay trượt khỏi đạo cụ) |
| Tay mì + găng liền | `noodle:true`: mỗi tay/chân là MỘT ống cong mượt qua các khớp; `mitten` bàn tay có ngón cái | SR 388–398, 176 | — (R6 là khối vuông, khác phong cách) | ⬜ không cần (giữ R6) |
| Áo quần hoạ tiết | `pattern`: sọc, kẻ ô, chấm, zigzag, gile; hoodie, polo, cà vạt; vải hạt + ribTex | SR 36–62, 134 | `r6.js`/`r15.js` (màu phẳng + vài mẫu) | 🟡 Mẫu hoạ tiết áo ⬜ (canvas có seed trong `proctex.js` đề xuất ở mục 6) |
| Duyệt nhân vật OK / Cần sửa | `viewer.html?viewer=1`: OrbitControls quanh dàn nhân vật, chọn tâm trạng + dáng, nút OK / Cần sửa gửi ghi chú về máy chủ | MN 572–685 | `engine/r6-preview.html`, `engine/asset-preview.html`; góp ý khung = nút "Ghi chú lỗi" (skill `gop-y`) | 🟡 Có trang xem; ⬜ nút OK/Cần sửa lưu `episodes/<ep>/review.json` (tải JSON xuống, không cần máy chủ) |

### 3.3 Máy quay, phụ đề, giọng, QA

| Kỹ thuật | Là gì | Nguồn | Lõi | TT |
|---|---|---|---|---|
| **Kế hoạch đạo diễn** | Mỗi shot đủ cỡ + góc + chuyển động có lý do: establish (cẩu xuống) → hero thấp đẩy vào → OTS insert → ECU snap-zoom lúc bấm → **whip pan** (giữ, quét 0.28 s có nghiêng nhẹ, giữ) → **dolly-zoom** (vertigo) + nghiêng dutch ở câu "ôi không" | SKILL.md mục 4; MN 735–744 (`look(camPos,target,fov)`) | `engine/shottypes.js` (luật camera dồn dập: zoom in/out) | ⬜ Thêm 3 loại shot: `whip` (xoay nhanh giữa 2 phản ứng, có `roll`), `snap` (zoom giật 0.12 s), `vertigo` (`fov = 2·atan(h/2dz)` khi `dz` đổi để mặt giữ cỡ) |
| **Phụ đề từng chữ + thẻ chữ nổi** | Lớp phủ trong suốt: mỗi chữ hiện đúng mốc `t` của giọng (ElevenLabs word timing), 122 px viền đen dày `size/10`, tự co khi dài, thẻ vàng `cards.json` ở y=0.16; dòng cuối cắt giữa câu để lặp vòng | `tools/captions.py` (35 dòng); `tools/tts.mjs` | `episodes/ep001/captions_en.js` (cụm 1–3 chữ từ `narration_en.json`); chữ nổi = trường `text` của shot | ✅ tiếng Anh · 🟡 tiếng Việt chưa theo từng chữ (cần mốc từng chữ từ CapCut; hiện theo câu) |
| Khớp nhịp giọng ↔ độ dài | `fit.py`: tăng tốc giọng tới mục tiêu (≤ ×1.3, quá thì CẮT chữ chứ không tăng tốc) + chèn 1.2 s lặng trước câu cuối để shot kết chạy xong | `tools/fit.py` | `tools/fit_voice.py` | ✅ (kiểm lại ngưỡng ×1.3) |
| Bảng khung (contact sheet) | `sheet.py` ghép `still-<t>.jpg` thành bảng 216×384 | `tools/sheet.py`; `render.cjs` (stills) | `tools/look.mjs --sheet/--cols/--tile` | ✅ |
| Dựng từng khung rồi ghép | `render.cjs`: puppeteer gọi `window.frame(t)` → ffmpeg `image2pipe` | `engine/render.cjs` | HTML tự xuất bằng WebCodecs (`tools/export-ui.js`) | ✅ |
| Công thức câu chuyện | Hành vi lạ nêu như sự thật ở câu 1 → hệ quả trong 3 s → người hoài nghi chế giễu → khoa học một câu + một so sánh → cắt giữa câu để lặp vòng | SKILL.md mục 1 | (quy trình; gần với format "Ở thị trấn này") | ✅ chỉ tham khảo |
| Bộ đạo cụ nội thất | Kenney Furniture Kit + KayKit Furniture Bits (CC0) đặt qua `put(kit,name,x,z,ry,{k,y})`, một tỉ lệ cho mỗi bộ | MN 590+; `engine/assets/props/` | `assets/kenney`, `scans.js` (Poly Haven) | 🟡 KayKit chưa nhập; cần cho cảnh trong nhà |

Việc nên làm tiếp từ phần này (theo độ lợi/giá): `smaa` (rẻ) → `shafts` → `whip/snap/vertigo` → `ink.js` → `ik.js` → review OK/Cần sửa.

## Dùng nhanh các module mới

```js
// tranh sơn dầu: ô 'paint' trong trình phát, hoặc
post.set({ paint: true });
post.paint.params.strength = 0.8;   // 0..1
post.paint.params.radius = 30;      // px ở khung cao 1920
post.paint.params.weave = 1;        // vân vải + nổi sơn
post.paint.params.flat = 0.4;       // độ rộng nét khi không có depth

// thân tàu
import { createHull } from '/engine/hull.js';
const boat = createHull(THREE, { type: 'ship' /* hoặc kind: skiff | ship | raft */, length: 60, beam: 12, depth: 8, name: 'Hải Âu', seed: 4,
  colors: { top: '#3f6f9e', bottom: '#a8362a', trim: '#ece8dc' } });
boat.position.y = seaY;                        // gốc = đường nước
const F = floatHull(sea.sample, { ...boat.userData.footprint, x, z, yaw, t, clock: sea.clock });
```
Thử: `engine/hull-lab.html?type=all|skiff|ship|raft&ang=35&el=16`.
So A/B ô paint: `node tools/look.mjs episodes/ep001/index.html --shots s054 --ab "episodes/ep001/index.html?fx=<các ô mặc định>,paint"`.
