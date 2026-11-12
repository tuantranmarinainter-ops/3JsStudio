---
name: viet-kich-ban
description: Từ MỘT câu luật của người dùng viết ra 5 kịch bản mẫu (mỗi mẫu một kiểu twist), rồi sau khi người dùng chọn thì viết kịch bản đầy đủ episodes/<ep>/kich-ban.md (~140 shot, 60–80 câu lời kể) qua lint 0 lỗi. Dùng BẤT CỨ KHI NÀO người dùng nói "luật: …", "viết kịch bản", "5 kịch bản mẫu", "tôi chọn kịch bản số N", đưa một câu luật kiểu "Ở thị trấn này, …" và muốn làm phim — kể cả khi không nhắc tên skill.
---

# Viết kịch bản: một câu luật → 5 mẫu → kịch bản đầy đủ

Chuẩn kênh: `CLAUDE.md` (mục "Format Ở thị trấn này", "Cấu trúc phim", "Luật camera dồn dập"). Định dạng file + header: `docs/kich-ban-vao.md`. Ví dụ 10 hàng: `vi-du-kich-ban.md` (học kiểu điền, không chép nội dung). Khuôn bước 1: `mau-5-kich-ban.md`.

## Cấm (mọi bước)
- Không chép cốt truyện/lời của kênh khác; mọi ý tự nghĩ.
- KHÔNG mở file `.srt` nào (kể cả trong `kich-ban/_vao/`). Số liệu nhịp chỉ đọc từ `docs/nhip-kich-ban.json`.
- Nhân vật R15. Không dùng logo/tên/asset Roblox.

## Bước 1 — 5 kịch bản mẫu (CHƯA tạo file, CHƯA dựng gì)
1. Luật phải giống **cơ chế game** (thanh máu, %, con số, đếm ngược…), nói được trong **1 câu**. Được phép bổ sung vào câu luật 2 chi tiết để dựng được: "tụt/đổi do gì" và "về 0 thì sao". Đã bổ sung thì báo người dùng bản luật rút gọn.
2. Luật GIỮ NGUYÊN giữa 5 mẫu; chỉ điểm yếu / twist / lời giải khác nhau.
3. Viết đúng **5 mẫu** theo `mau-5-kich-ban.md`; mỗi mẫu ≤ 8 dòng, **tính cả dòng tiêu đề**.
4. 5 kiểu twist KHÁC NHAU, mỗi mẫu một kiểu: **bí mật người lớn**, **kẽ hở luật**, **nguyên nhân ẩn**, **điểm yếu thành lời giải**, **đảo vai**. Twist là bí mật/kẽ hở/nguyên nhân nằm SẴN trong luật, không phải sự kiện ngoài ập tới (quái vật, bão, cúp điện).
5. Mọi mẫu: nhân vật chính có điểm yếu do luật gây ra; kết = điểm yếu thành lời giải; cảnh cuối gợi lại cảnh đầu.
6. **DỪNG**, hỏi đúng 1 câu chọn số. Không tạo file, không chạy tool.

## Bước 2 — kịch bản đầy đủ (sau khi người dùng chọn số N, có thể kèm chỉnh)
1. Chọn `epNNN` kế tiếp: liệt kê `episodes/` (bỏ `_template`, `_demo*`), số lớn nhất + 1. Tạo `episodes/<ep>/kich-ban.md`.
2. Giá trị hợp lệ: chạy `python tools/kb/kichban.py --danh-sach` (loại, hành động, mặt, giờ, thời tiết, tư thế). Không chép cứng, không đoán. Cần tên ngoài danh sách → ghi vào `## Cần dựng` (`- anim: …`).
3. Header (cú pháp: `docs/kich-ban-vao.md`): `title`, `seed`, `rule`, `weakness`, `twist`, `solution`, `ep: <ep>`, `luat_goc: <câu người dùng>`. Diễn viên mặc định có sẵn: `hero`, `mom` (+ `crowd: n`); vai khác phải khai `actor <tên>: k=v …`. `ở đâu` phải là địa điểm có sẵn của thị trấn — `square, home, yard, shop, street, crossroad, park, center, house1…` (kiểm lại trong `engine/town.js` nếu nghi ngờ) — hoặc `place <tên>: x, z` khai ở header. Bảng 18 cột đúng thứ tự như `vi-du-kich-ban.md`, cột `khung` trống.
4. Cột `máy quay` và `tiếng động` là văn bản tự do ngắn (gợi ý), để trống được. `máy quay` dùng từ khoá trong docs (đẩy vào, kéo ra, lia, xoay quanh, rung…). `tiếng động` nếu ghi: `tên tiếng Anh@giây*âm lượng`.
5. **Quy mô**: **60–80 câu** lời kể, mỗi câu **1–3 shot** (hàng nối ghi `^`), tổng ~**140 shot**, tổng giây **120–180**, nhắm ~**150–165 s** (đừng đặt `kiem_tong: off`).
6. **Độ dài câu**: lời kể tiếng Việt mỗi câu ≤ ~35 ký tự (nhịp đọc ~14 ký tự/giây). Số "ký tự mỗi câu" trong `nhip-kich-ban.json` là của tiếng Anh, KHÔNG áp dụng.
7. **Nhịp** — đọc `docs/nhip-kich-ban.json`, mục `chi_tieu` và `canh_bao`:
   - Số câu hook và leo thang: trong p25–p75 của `cau_moi_phan.hook` / `leo_thang`.
   - Câu twist đầu tiên ở 55–80% thời lượng (`vi_tri_twist_pct`).
   - Phần giải quyết KHÔNG theo số liệu: dùng khung dự án, ~25% phim, điểm yếu thành lời giải, cảnh cuối gợi lại cảnh đầu.
   - Câu đầu phim bắt đầu bằng "Ở thị trấn này"; 3 giây đầu có hình minh hoạ luật.
8. **Giây** = max(tối thiểu theo loại, số ký tự câu / 14 / số shot của câu). Tối thiểu: insertRead **1,5**; closeup **0,8**; chase/fall/hug/walkBy/follow/sinkTilt **1,0**; establish **1,2**; còn lại 0,8.
9. Camera theo `CLAUDE.md`: 1 người → đẩy vào; ≥ 2 người/vật lớn → kéo ra; nhà có chân → lùi/lia thấy 4 chân. Chữ trên thiếp/biển: `insertRead` + cột `vật cần đọc` (loại khác để trống).
10. Điền `## Cần dựng` cuối file: mọi env/prop/anim chưa có sẵn, mỗi dòng một thứ.

## Bước 3 — tự kiểm, lint, giao (MỐC DUYỆT 1b)
1. Tự kiểm nội dung (sửa nếu trượt): (a) luật hiện hình trong 3 giây đầu; (b) điểm yếu xuất hiện ở hook; (c) twist được cài trước ≥ 2 lần ở phần leo thang; (d) lời giải dùng đúng điểm yếu; (e) cảnh cuối gợi lại cảnh đầu.
2. `python tools/kb/lint.py episodes/<ep>/kich-ban.md` → sửa đúng dòng báo (Kxx) → chạy lại tới **0 lỗi**. Kẹt cùng một lỗi sau 3 lần → dừng, báo người dùng.
3. `python tools/kb/kichban.py episodes/<ep>/kich-ban.md --tom-tat` (không đếm tay).
4. Trả lời: đường dẫn file + bảng tóm tắt (số câu, số shot, tổng giây, số mục cần dựng, vị trí twist %). Hỏi duyệt rồi DỪNG; chưa chạy `storyboard.py`, chưa dựng.
