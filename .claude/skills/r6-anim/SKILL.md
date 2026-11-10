---
name: r6-anim
description: Làm/sửa animation nhân vật R6 trong engine/r6.js (hàm thuần của t) theo phương pháp fwjelaa (pose language, bảng timing, craft rules, quality bar), từ mô tả hoặc từ frame tham chiếu trong refs/. Dùng khi cần animation mới (đi, chạy, ôm, ngã, cầm thiếp, run rẩy…), sửa chuyển động bị cứng/trượt chân, hoặc khớp một động tác với video tham khảo.
---

# Animation R6 (three.js) — phương pháp fwjelaa, chuyển sang engine của repo

Tài liệu gốc (Roblox/Blender): `skills/fwjelaa/animations/CLAUDE.md` + `anims/R6_Walk.py`, `anims/R6_Run.py`,
`anims/_lib.py`, `research/03-animation-craft.md`. Cloud không có Blender/Studio → chỉ dùng **phương pháp**, viết
animation thẳng vào `R6_ANIMATIONS` trong `engine/r6.js`. Method by fwjelaa (FWJ STUDIOS) — nhắc người dùng 1 lần.

## Đổi quy ước góc (fwjelaa → r6.js, radian)
| fwjelaa (độ, trục phần cha) | r6.js |
|---|---|
| tay/chân `+x` = vung ra TRƯỚC | `.x < 0` = ra trước (đổi dấu) |
| torso `-x` = cúi trước | `torso.x > 0` = cúi trước |
| `+z` tay phải ra ngoài | `rightArm.z < 0` ra ngoài; `leftArm.z > 0` ra ngoài |
| root `py < 0` ngồi xuống | `body.y < 0` |
| 60 fps, frame | t giây (frame/60), phim chạy 30 fps |

## Quy trình
1. Có tham chiếu → lấy frame từ `refs/<id>/frames/` (hoặc `refs/<id>/sheets`), ghi pha: chuẩn bị, chạm, theo đà,
   hồi; mỗi pose chính bằng pose language; góc máy.
2. Lập timeline trước khi code (bảng dưới), rồi viết `(t, o) => pose` trong `R6_ANIMATIONS`. Hàm thuần của t, không
   trạng thái, không `Math.random()`.
3. Xem bằng `node tools/peek.mjs "episodes/_lab/index.html?view=chars&anim=<tên>" 0,0.1,0.2,… out.png` từ **2 góc**
   (3/4 trước và ngang). Sửa lỗi lớn nhất trước. 3–6 vòng.

## Timing (60 fps; snappy / weighty) → chia 60 ra giây
- Idle 90-150 / 180-300 f; nhún thân 0.06-0.12 stud; tay trễ 4-8 f.
- Walk chu kỳ 40-48 / 56-64 f (2 bước); chân ±25-35°, tay ±20-35° ngược pha; tay trễ chân ~3 f.
- Run 26-30 / 32-40 f; nghiêng trước 12-20°; chân ±50-70°; nhún 0.2-0.35.
- Nhảy: lấy đà 3-5 f, đỉnh ≈ f15, chạm đất 2-3, hồi 8-12.
- Phản ứng bị đánh/giật mình: không lấy đà, vào pose trong 1-3 f, lắng 8-14 f.
- Overshoot 8-15% của động tác, 2-3 f, lắng 4-8 f. Overlap: thân +1 f, tay +2, đầu +2-4.

## Craft rules (rút gọn)
- Tăng tốc vào điểm chạm, dừng gắt, chỉ ease ở đoạn ra. Lấy đà:hồi ≈ 1:3-4 (snappy), 1:2 (weighty).
- Không đứng yên quá 6 f (snappy) / 10 f (weighty): dùng "moving hold" (trôi nhẹ bằng sin biên độ nhỏ).
- Pose chính khác nhau ≥30° ở chi chính; chi cách thân 20-30° để silhouette đọc được.
- R6 không có gối/khuỷu: chân xoạc → thân hạ (bù `body.y`); nghiêng/xoay thân thì xoay chân ngược lại để chân không trượt.
- Đi tại chỗ là băng chuyền: chân chịu lực trượt lùi **đều tốc**; tốc độ dời root phải = sải chân (xem R6_Walk.py:
  2 stud / 22 f ≈ 5.45 stud/s). Đặt tốc độ di chuyển của shot khớp `speed` của walk.
- Đầu giữ mắt vào mục tiêu (không offset trễ đầu). Clip bắt đầu và kết thúc cùng một tư thế; loop không có mối nối.

## Quality bar
1. Đọc được trong 1 khung (sau lưng + 3/4 trước). 2. Timing đúng chỗ nhanh/chậm. 3. Có trọng lượng (xoay, cúi, lấy đà).
4. Chạm sạch: chân trên sàn, không xuyên thân, không giật. 5. Quỹ đạo cong (≥3 key qua một cú vung). 6. Nối được.
