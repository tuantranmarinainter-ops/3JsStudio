---
name: vfx3d
description: Hiệu ứng (bụi, tuyết, mưa, sóng, tia chớp, bưu thiếp rơi, hơi lạnh, nước bắn…) cho three.js + HyperFrames, tất định theo t, theo phương pháp VFX của fwjelaa (lớp hiệu ứng, timing, mức cường độ). Dùng khi thêm/sửa engine/fx.js hoặc hiệu ứng trong shot.
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
