---
name: vfx3d_RO
description: Bản thử phong cách học từ 37 video (sổ tay phong cách), chạy độc lập với vfx3d — danh mục VFX 5 lớp (hạt 3D, ánh sáng, hiệu ứng màn hình, đồ hoạ trên khung, chuyển cảnh) kèm tần suất đã hiệu chỉnh và trạng thái ĐÃ CÓ / GẦN CÓ / THIẾU so với engine. CHỈ dùng khi người dùng gọi đích danh "vfx3d_RO" hoặc "bản RO"; không tự kích hoạt cho việc VFX thông thường (việc đó là của skill vfx3d).
---

# VFX tất định (three.js) — phương pháp fwjelaa

Gốc: `skills/fwjelaa/vfx_method.md` (Roblox ParticleEmitter/Beam/Trail). Chuyển sang three.js: Points/InstancedMesh/
sprite + texture canvas; Method by fwjelaa (FWJ STUDIOS).

- **Tất định**: vị trí mỗi hạt = hàm thuần của (seed, chỉ số, t − t_phát). Không mô phỏng cộng dồn theo frame; không `Math.random()`.
  Hạt "phát liên tục" = tập hạt cố định, mỗi hạt có pha riêng `((t + phase_i) mod life)`.
- **Lớp**: mỗi hiệu ứng ≥ 2 lớp (lõi sáng + khói/mảnh + tia nhỏ). Kích thước/độ trong suốt theo đường cong (lớn nhanh, mờ dần).
- **Timing**: bùng 0.05–0.15 s, giữ ngắn, tan 0.3–1 s. Gắn với nhịp hành động (chân chạm đất → bụi đúng frame chạm).
- **Cường độ**: chọn mức (tinh tế / vừa / điện ảnh) theo shot; cảnh xa giảm số hạt.
- **Ánh sáng**: tia chớp = nháy độ sáng sun/hemi + nền trong 2–4 frame; không để NaN (clamp).
- Kiểm: snapshot frame trước/giữa/sau hiệu ứng, seek nhảy cóc phải ra cùng ảnh.

---

# PHẦN RO — Danh mục VFX học từ 37 video (thử nghiệm, độc lập với `vfx3d`)

Nguồn: sổ tay mục 5, 9, 10 (37 video / 9 mẫu) và `output/hoc-phong-cach/kiem-bo-sot.md` nhóm "VFX". Đối chiếu engine ngày 19/11/2026.
**Luật chung: mọi hiệu ứng THIẾU = "cần code, bật/tắt được, mặc định tắt"** (CLAUDE.md: tính năng mới phải tắt được; ô FX ở `engine/post.js:38`). Không sửa `engine/` khi chỉ dùng skill này để lập kế hoạch; muốn code thì hỏi người dùng.

## Tần suất đã HIỆU CHỈNH (ngân sách mỗi phút)
| Hiệu ứng | /phút | Dải | Nguồn |
|---|---|---|---|
| Chớp (độ sáng vọt rồi quay lại ≤ 8 khung) | **0.2** | 0.0–1.6 | (sổ tay mục 5, 37 video / 9 mẫu) |
| Đổi màu cả khung | **0.7** | 0.0–4.2 | (sổ tay mục 5, 37 video / 9 mẫu) |
| Zoom giật | **1.2** | 0.0–4.3 | (sổ tay mục 5, 37 video / 9 mẫu) |
| Rung khung | 0.1 | 0.0–1.1 | (sổ tay mục 5, 37 video / 9 mẫu) |

- Máy dò CŨ chấm sai nhiều (đúng: chớp 12/26, đổi màu 29/71, zoom giật 24/57, rung 5/6); số ở bảng là của bản máy HIỆN HÀNH đã loại cú cắt sót (sổ tay mục 10, 37 video / 9 mẫu). Đừng dùng làm ngưỡng cứng.
- Video dày nhất: Tảng đá (chớp 1.6/ph, đổi màu 4.2/ph), Thích ai là bay lên (zoom giật 4.3/ph), Ngôi nhà biết đi (rung 1.1/ph) (sổ tay mục 5, 37 video / 9 mẫu). Mặc định phim ta: bám số trung bình, chỉ vọt khi thể loại cần.
- Tiếng kèm: chỉ 7/32 hiệu ứng có tiếng rõ, còn lại "không rõ" (sổ tay mục 10, 37 video / 9 mẫu) → chớp trắng, rung, mưa nên đi kèm tiếng (skill `tieng-dong`).
- 72 hiệu ứng ghi nhận: màn hình 24, đồ hoạ 17, hạt 3D 15, ánh sáng 11, chuyển cảnh 5 (sổ tay mục 10, 37 video / 9 mẫu).

Chú giải: **ĐÃ CÓ** dùng được ngay · **GẦN CÓ** có món gần giống, cần chỉnh/ghép · **THIẾU** chưa có.
"Mốc giây" là giây trong video mẫu (sổ tay mục 10). "chưa đo" = sổ tay không ghi; không bịa. Cột "Cỡ" lấy mức Mạnh của agent (nhẹ/vừa/mạnh).

## Lớp 1 — Hạt 3D
| Hiệu ứng | Màu | Cỡ | Thời lượng / mốc | Thời điểm | Cảm xúc | Tần suất | Tiếng | Trạng thái |
|---|---|---|---|---|---|---|---|---|
| Hạt mưa | xám-trắng | vừa | 50.1/52.4/55.4 s | leo thang | nặng nề | mưa/bão 1/9 video mẫu (sổ tay mục 9, 37 video / 9 mẫu) | CÓ | **ĐÃ CÓ** `fxRain` engine/fx.js:117 (+ mưa trên màn `uRain` post.js:122) |
| Tuyết / bão tuyết | trắng | chưa đo | chưa đo | chưa đo | lạnh | chưa đo | chưa đo | **ĐÃ CÓ** `fxSnow` fx.js:14, `fxBlizzard` fx.js:57 |
| Bụi nước dột | xanh-tím | nhẹ | 41.0/43.0 s | twist | buồn | chưa đo | không rõ | **GẦN CÓ** `fxDust` fx.js:156 / `fxPuffs` fx.js:287 (đổi màu, rơi xuống) |
| Vật rơi hàng loạt | nhiều màu | mạnh | 3.9/4.8/5.5 s | hook | hỗn loạn | chưa đo | không rõ | **GẦN CÓ** `fxCards` fx.js:208 (bưu thiếp rơi; thêm kiểu vật) |
| Hạt bay (diều, mũ) | đỏ-vàng-xanh | vừa | 62.4/65.8/66.9 s | cao trào | kỳ diệu | chưa đo | không rõ | **GẦN CÓ** `fxCards` fx.js:208 (đổi hình hạt) |
| Hạt vàng ấm bay quanh | vàng | nhẹ | 18.1/76.0/146.5 s | hook, giải quyết | ấm áp, vui | chưa đo | không rõ | **THIẾU** — cần code, bật/tắt được, mặc định tắt |
| Bọt / nước 3D (bong bóng, gợn hồ) | xanh nhạt | vừa | 4.7 s | hook | sốc | chưa đo | CÓ | **THIẾU** — cần code, bật/tắt được, mặc định tắt (`engine/sea.js` là mặt biển, không phải bọt hạt) |
| Rung vật theo nhịp (máy bán hàng) | trung tính | vừa | 61.1/97.4 s | leo thang | sợ | chưa đo (rung khung 0.1/ph) | không rõ | **THIẾU** — cần code, bật/tắt được, mặc định tắt (camera rung đã có; vật rung chưa) |
| Hào quang / tia năng lượng / tia lửa va chạm / vệt tốc độ | vàng, xanh, cyan | mạnh | 17–41 s (Vật ký sinh) | hành động | kinh ngạc | chưa đo | không rõ | **ĐÃ CÓ** `createVfxDanh` engine/fx-danh.js:41, ô `vfxAura/Beam/HitSpark/SpeedLines` (fx-danh.js:21, post.js:38; mặc định tắt) |
| Xe móp biến dạng | đỏ, trắng | mạnh | 17.3/18.3 s | hành động | bạo lực | chưa đo | không rõ | **THIẾU** — cần code, bật/tắt được, mặc định tắt |

## Lớp 2 — Ánh sáng
| Hiệu ứng | Màu | Cỡ | Thời lượng / mốc | Thời điểm | Cảm xúc | Tần suất | Tiếng | Trạng thái |
|---|---|---|---|---|---|---|---|---|
| Chớp bão mượt | trắng | mạnh | ~0.35 s tắt dần (≈10 khung) (flash.js:3) | bão | sợ, sốc | chớp 0.2/ph | CÓ | **ĐÃ CÓ** `smoothFlash` engine/flash.js:6, `lightning` fx.js:262, `fxBolt` fx.js:269, `uFlash` post.js:260 |
| Đèn nhấp nháy | vàng-đỏ | nhẹ | 60.5/95.2/143.2 s | leo thang | kỳ bí | chưa đo | không rõ | **ĐÃ CÓ** `lightCues` engine/den-moc.js:7 (cờ `fade`, `flick`; ô post.js:38,90; mặc định tắt) |
| Đèn UV tím hiện chữ | tím | mạnh | 57.0/62.9/122.6 s | twist | bất ngờ | chưa đo | không rõ | **GẦN CÓ** `lightCues` đổi màu đèn (den-moc.js); chữ chỉ hiện dưới UV cần vật liệu riêng |
| Tối dần (darkening) | xanh đen | vừa | 122.8/123.4 s | twist | hồi hộp | chưa đo | không rõ | **THIẾU** — cần code, bật/tắt được, mặc định tắt (tạm: `lightCues` hạ cường độ có `fade`; chưa có hệ số tối cả khung) |
| Đổi màu đèn xanh→vàng | xanh sang vàng | nhẹ | 39.0/40.0 s | hook→leo thang | tò mò | thuộc "đổi màu" 0.7/ph | không rõ | **GẦN CÓ** `lightCues` đổi màu đèn (den-moc.js) |
| Tia sét vàng-xanh | vàng, xanh | mạnh | 38.9/40.9 s | hành động | kinh ngạc | chưa đo | không rõ | **GẦN CÓ** `fxBolt` fx.js:269 (đổi màu) |

## Lớp 3 — Hiệu ứng màn hình
| Hiệu ứng | Màu | Cỡ | Thời lượng / mốc | Thời điểm | Cảm xúc | Tần suất | Tiếng | Trạng thái |
|---|---|---|---|---|---|---|---|---|
| Chớp trắng (đóng cửa, tên bừng lên, đá) | trắng / trắng-tím | mạnh | mặc định 0.25 s (lop-phu.js:55); 100.97, 122.6, 37.7, 52.47, 57.3 s | sốc | sốc, sững sờ | **0.2/ph** | CÓ | **ĐÃ CÓ** `bfx { flash }` engine/blocky/lop-phu.js:55 + `flash()` overlays.js:143 |
| Rung màn hình | — | nhẹ (0.1 mặc định) | `dur` 0.28 s (may.js:109) | sốc | sốc | **0.1/ph** | CÓ | **ĐÃ CÓ** `bfx { shake }` engine/blocky/may.js:109,111; `vfxShake`/`applyShake` fx-danh.js:181 |
| **Zoom giật** | — | vừa (−20% fov) | ~0.13 s (may.js:110) | khoảnh khắc giật mình | giật mình | **1.2/ph** | không | **ĐÃ CÓ** `bfx { punch }`: ĐÚNG là cú đá fov (`fov *= 1 - punch * out((local-t0)/.13)`), engine/blocky/may.js:110; ô `punchRung` post.js:38 (bật sẵn) |
| Đổi màu cả khung THEO KHOẢNH KHẮC (đỏ-cam căng; xanh lam cô đơn/lạnh; xanh→vàng tò mò) | đỏ-cam / xanh lam / xanh đen | vừa | 52.47/54.1/57.3; 109.3/114.9; 83.0/101.4/111.7 s | leo thang, twist | căng, lạnh, cô đơn | **0.7/ph** | không rõ | **THIẾU** — cần code, bật/tắt được, mặc định tắt (`GRADES` post.js:99 chỉ theo preset ánh sáng của CẢNH, không theo mốc/shot) |
| Rung + đổi màu + zoom giật gộp (Tiếng mẹ gọi) | chưa rõ | vừa | 30.3/30.53 s | leo thang | sợ | chưa đo | không rõ | **GẦN CÓ** ghép `punch` + `shake` + (đổi màu còn THIẾU) |
| Tối viền | đen | 0.42 mặc định | cả shot | mọi | — | — | không | **ĐÃ CÓ** `uVig` post.js:117, `vignette()` overlays.js:142 |

## Lớp 4 — Đồ hoạ trên khung
| Hiệu ứng | Màu | Cỡ | Thời lượng / mốc | Thời điểm | Cảm xúc | Tần suất | Tiếng | Trạng thái |
|---|---|---|---|---|---|---|---|---|
| Chữ đỏ nhấn từ khoá luật | đỏ | vừa | 2.0/31.9/44.0 s | cả phim | nhấn mạnh tư tưởng | 8/9 video mẫu (sổ tay mục 9, 37 video / 9 mẫu) | không rõ | **GẦN CÓ** `bfx title/stamp/sign` overlays.js:75,98,127 (chữ nổi). Tô đỏ từ khoá trong phụ đề: **THIẾU** — cần code, bật/tắt được, mặc định tắt (lớp `phu-de`) |
| Chấm vàng đếm mạng / biểu tượng luật (thanh, số) | vàng | vừa | 7.8/30.1/63.2 s | cả phim, cố định 1 vị trí | căng thẳng | luật hiện trên màn/số ~21% shot (177/846; sổ tay mục 8, 37 video / 9 mẫu) | không rõ | **GẦN CÓ** `bfx icon/sign` (25 biểu tượng, overlays.js:43) + `progressBar` overlays.js:144. "Chấm đếm mạng" riêng: **THIẾU** — cần code, bật/tắt được, mặc định tắt |
| Sparkle / glint / burst | trắng-vàng | vừa | 0.6 / 0.35 / 0.2 s | hiện vật, nhận ra | kỳ diệu | chưa đo | không | **ĐÃ CÓ** lop-phu.js:50–52, overlays.js:110–112 |
| Vệt trắng đe doạ | trắng | nhẹ | 13.1/14.7 s | hành động | đe doạ | chưa đo | không rõ | **GẦN CÓ** `vfxSpeedLines` fx-danh.js |
| Gợn nước hồ bơi (đồ hoạ) | xanh nhạt | vừa | 4.7 s | hook | sốc | chưa đo | CÓ | **THIẾU** — cần code, bật/tắt được, mặc định tắt |
| Hố xoáy tím trên trời | tím đen | mạnh | 1.2/2.5/23.9 s | hook | bí ẩn | chưa đo | không rõ | **THIẾU** — cần code, bật/tắt được, mặc định tắt (đồ hoạ riêng của tập) |

## Lớp 5 — Chuyển cảnh
| Hiệu ứng | Màu | Cỡ | Thời lượng / mốc | Thời điểm | Cảm xúc | Tần suất | Tiếng | Trạng thái |
|---|---|---|---|---|---|---|---|---|
| **Mờ-đen / fade-to-black (tối sầm)** | đen | mạnh | 27.7/111.7/113.5; 69.7/78.8 s | twist, đổi nhịp | khoảng lặng, sốc | "đổi màu/tối sầm chuyển cảnh" 3/9 video mẫu (sổ tay mục 9, 37 video / 9 mẫu) | không rõ | **THIẾU** — cần code, bật/tắt được, mặc định tắt (gợi ý `engine/blocky/lop-phu.js`; `bfx` hiện chỉ 12 kiểu, không có fade) |
| Vải trắng quét ngang | trắng | vừa | 139.43 s | đổi nhịp | đổi nhịp | chưa đo | không rõ | **GẦN CÓ** `whip`/`crash` máy (may.js:7) — lia/đâm máy, chưa có tấm vải trắng che màn |
| Chớp trắng làm cú chuyển | trắng | mạnh | 0.25 s | sốc | sốc | 0.2/ph | CÓ | **ĐÃ CÓ** `bfx { flash }` lop-phu.js:55 |
| Zoom giật làm cú chuyển | — | vừa | 0.13 s | sốc | giật mình | 1.2/ph | không | **ĐÃ CÓ** `bfx { punch }` may.js:110 |
| Đổi màu theo khoảnh khắc làm cú chuyển | đỏ-cam / xanh | vừa | — | căng | căng | 0.7/ph | không rõ | **THIẾU** — cần code, bật/tắt được, mặc định tắt (xem lớp 3) |

## Hạng mục THIẾU chính (đã gom)
tối sầm / fade-to-black · tối dần (darkening) · hạt vàng ấm · bọt/nước 3D · rung vật theo nhịp · **grade theo khoảnh khắc** (hiện chỉ theo cảnh) · tô đỏ từ khoá phụ đề · chấm đếm mạng · gợn nước hồ · hố xoáy · xe móp. Tất cả: cần code, bật/tắt được, mặc định tắt.

## Cách dùng trong dây chuyền RO
- Đặt ngân sách mỗi phút (chớp 0.2, đổi màu 0.7, zoom giật 1.2, rung 0.1) vào bảng shot; dồn ở leo thang/twist, không rải đều.
- ĐÃ CÓ: ghi thẳng `bfx` trong `shots.js` (`flash`, `punch`, `shake`, `sign`, `icon`…), rồi `node tools/danh-muc.mjs kiem <ep>`.
- THIẾU: không tự code khi chạy bản thử; lập đề xuất, hỏi người dùng. Khi code: hàm thuần của `t`, có ô FX bật/tắt, mặc định tắt, thêm vào `docs/danh-muc.md`.

## Thống kê đối chiếu
33 dòng ở 5 lớp: **ĐÃ CÓ 12 · GẦN CÓ 11 · THIẾU 10** (chớp trắng và zoom giật xuất hiện 2 lần: một ở lớp màn hình, một ở lớp chuyển cảnh; tính theo hiệu ứng khác nhau là ĐÃ CÓ 10). Dòng "chữ đỏ" và "chấm đếm mạng" là GẦN CÓ ở phần đồ hoạ nhưng phần tô đỏ/chấm riêng vẫn THIẾU.
