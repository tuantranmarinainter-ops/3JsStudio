---
name: viet-kich-ban
description: Từ MỘT câu luật của người dùng viết ra 5 kịch bản mẫu (mỗi mẫu một kiểu twist), rồi sau khi người dùng chọn thì viết kịch bản đầy đủ episodes/<ep>/kich-ban.md (~140 shot, 60–80 câu lời kể) qua lint 0 lỗi. Dùng BẤT CỨ KHI NÀO người dùng nói "luật: …", "viết kịch bản", "5 kịch bản mẫu", "tôi chọn kịch bản số N", đưa một câu luật kiểu "Ở thị trấn này, …" và muốn làm phim — kể cả khi không nhắc tên skill.
---

# Viết kịch bản: một câu luật → 5 mẫu → kịch bản đầy đủ

Chuẩn kênh: `CLAUDE.md` (mục "Format Ở thị trấn này", "Cấu trúc phim", "Luật camera dồn dập"). Định dạng file + header: `docs/kich-ban-vao.md`. Ví dụ 10 hàng: `vi-du-kich-ban.md` (học kiểu điền, không chép nội dung). Khuôn bước 1: `mau-5-kich-ban.md`.

## Hai dây chuyền sau Bước 1 (hỏi người dùng nếu chưa rõ)
- **Dây chuyền Codex/kit (mặc định cho tập mới, từ 2026-11-15):** sau khi người dùng chọn mẫu N, chỉ viết **kịch bản chữ**
  `kich-ban/<ep>/kich-ban.md` (luật, điểm yếu, twist, lời giải, nhân vật, bối cảnh, lời kể theo 4 phần — chưa chia shot), rồi
  chuyển sang skill **`xu-ly-kich-ban`** (chấm điểm, hỏi bổ sung, chuyện tinh, `bang-shot.json`, bối cảnh tinh). KHÔNG làm Bước 2–3 dưới đây.
- **Dây chuyền engine cũ (`storyboard.py` / `lam-phim`):** giữ nguyên Bước 2–3 (bảng 19 cột ở `episodes/<ep>/kich-ban.md`).

## Cấm (mọi bước)
- Không chép cốt truyện/lời của kênh khác; mọi ý tự nghĩ.
- KHÔNG mở file `.srt` nào (kể cả trong `kich-ban/_vao/`). Số liệu nhịp chỉ đọc từ `docs/nhip-kich-ban.json`.
- Nhân vật R15. Không dùng logo/tên/asset Roblox.

## Bước 1 — 5 kịch bản mẫu (CHƯA tạo file, CHƯA dựng gì)
1. Luật phải giống **cơ chế game** (thanh máu, %, con số, đếm ngược…), nói được trong **1 câu**. Được phép bổ sung vào câu luật 2 chi tiết để dựng được: "tụt/đổi do gì" và "về 0 thì sao"; đã bổ sung thì báo người dùng bản luật rút gọn. Câu luật quá mơ hồ/không phải cơ chế game → đề xuất 1 bản luật chỉnh, nêu rõ ở đầu câu trả lời, và vẫn ra 5 mẫu trên bản đó.
2. Luật GIỮ NGUYÊN giữa 5 mẫu; chỉ điểm yếu / twist / lời giải khác nhau.
3. Viết đúng **5 mẫu** theo `mau-5-kich-ban.md`; mỗi mẫu ≤ 8 dòng, **tính cả dòng tiêu đề**.
4. 5 kiểu twist KHÁC NHAU, mỗi mẫu một kiểu. Twist là bí mật/kẽ hở/nguyên nhân nằm SẴN trong luật, không phải sự kiện ngoài ập tới (quái vật, bão, cúp điện).
   - **bí mật người lớn**: người lớn biết rõ luật và giấu đứa trẻ.
   - **kẽ hở luật**: câu chữ của luật cho phép một điều không ai nghĩ tới.
   - **nguyên nhân ẩn**: luật tồn tại vì một lý do bị che giấu.
   - **điểm yếu thành lời giải**: CHÍNH twist là phát hiện điểm yếu thật ra là năng lực (các kiểu khác vẫn kết bằng điểm yếu giúp giải, nhưng twist nằm chỗ khác).
   - **đảo vai**: người tưởng mạnh/được bảo vệ hoá ra là người cần cứu, hoặc ngược lại.
5. Mọi mẫu: nhân vật chính có điểm yếu do luật gây ra; kết = điểm yếu thành lời giải; cảnh cuối gợi lại cảnh đầu.
6. **DỪNG**, hỏi đúng 1 câu chọn số. Không tạo file, không chạy tool.

## Bước 2 — kịch bản đầy đủ (sau khi người dùng chọn số N, có thể kèm chỉnh)
1. Chọn `epNNN` kế tiếp: liệt kê `episodes/`, bỏ MỌI thư mục bắt đầu bằng `_`, lấy số lớn nhất + 1. `<ep>` phải chưa tồn tại. Tạo `episodes/<ep>/kich-ban.md`.
2. Giá trị hợp lệ: chạy `python tools/kb/kichban.py --danh-sach` (loại, hành động, mặt, giờ, thời tiết, tư thế). Không chép cứng, không đoán. Cần tên ngoài danh sách → ghi vào `## Cần dựng` (`- anim: …`).
3. Header (cú pháp: `docs/kich-ban-vao.md`): `title`, `seed`, `rule`, `weakness`, `twist`, `solution`, `ep: <ep>`, `luat_goc: <câu người dùng>`. Diễn viên mặc định có sẵn: `hero`, `mom` (+ `crowd: n`); vai khác phải khai `actor <tên>: k=v …`. `ở đâu` phải là địa điểm có sẵn của thị trấn — `square, home, yard, shop, street, crossroad, park, center, house1…` (kiểm lại trong `engine/town.js` nếu nghi ngờ) — hoặc `place <tên>: x, z` khai ở header. Cột `env` (nếu dùng) nhận env có sẵn (xem tên file: `ls engine/envs/*.js`, không chép cứng) hoặc env mới ghi vào `## Cần dựng`. Dùng `crowd1`… thì header phải có `crowd: n`. Bảng 19 cột đúng thứ tự như `vi-du-kich-ban.md`, cột `khung` trống.
   - `tư thế` (standing/flying/sitting/swimming): CHỈ cho mô hình không phải người (chim, cá…); người để trống.
   - `tối thiểu`: ghi đè mức tối thiểu của loại shot (vd closeup cần 2 s thì ghi 2); trống = theo loại.
4. Cột `máy quay` và `tiếng động` là văn bản tự do ngắn (gợi ý), để trống được. `máy quay` dùng từ khoá trong docs (đẩy vào, kéo ra, lia, xoay quanh, rung…). `tiếng động` nếu ghi: `tên tiếng Anh@giây*âm lượng`.
5. **Quy mô**: **60–80 câu** lời kể, mỗi câu **1–3 shot** (hàng nối ghi `^`), tổng ~**140 shot**, tổng giây **120–180**, nhắm ~**150–165 s** (đừng đặt `kiem_tong: off`).
6. **Độ dài câu**: lời kể tiếng Việt mỗi câu ≤ ~35 ký tự (nhịp đọc ~14 ký tự/giây). Số "ký tự mỗi câu" trong `nhip-kich-ban.json` là của tiếng Anh, KHÔNG áp dụng.
7. **Nhịp** — đọc `docs/nhip-kich-ban.json`, mục `chi_tieu` và `canh_bao`:
   - Số câu hook, leo thang, twist: trong p25–p75 của `cau_moi_phan.hook` / `leo_thang` / `twist`.
   - Câu twist đầu tiên ở **65–72%** thời lượng (sổ tay phong cách mục 14, 37 video; trước đây 55–80% → thu hẹp; `vi_tri_twist_pct`; lint chỉ bắt buộc 40–85%). Đánh dấu bằng chữ `twist` trong cột `ghi chú` của shot ĐẦU của câu twist.
   - Phần giải quyết KHÔNG theo số liệu: dùng khung dự án, ~25% phim, điểm yếu thành lời giải, cảnh cuối gợi lại cảnh đầu.
   - Câu đầu phim bắt đầu bằng "Ở thị trấn này"; 3 giây đầu có hình minh hoạ luật; **nói ra luật trong ≤ 5 giây đầu, ưu tiên ngay câu 1** (sổ tay phong cách mục 2, 37 video).
8. **Giây** = max(tối thiểu theo loại, số ký tự câu / 14 / số shot của câu). Tối thiểu: insertRead **1,5**; closeup **0,8**; chase/fall/hug/walkBy/follow/sinkTilt **1,0**; establish **1,2**; còn lại 0,8.
9. Camera theo `CLAUDE.md`: 1 người → đẩy vào; ≥ 2 người/vật lớn → kéo ra; nhà có chân → lùi/lia thấy 4 chân. Chữ trên thiếp/biển: `insertRead` + cột `vật cần đọc` (loại khác để trống).
10. Điền `## Cần dựng` cuối file: mọi env/prop/anim chưa có sẵn, mỗi dòng một thứ.

## Bước 3 — tự kiểm, lint, giao (MỐC DUYỆT 1b)
1. Tự kiểm nội dung (sửa nếu trượt): (a) luật hiện hình trong 3 giây đầu; (b) điểm yếu xuất hiện ở hook; (c) twist được cài trước ≥ 2 lần ở phần leo thang; (d) lời giải dùng đúng điểm yếu; (e) cảnh cuối gợi lại cảnh đầu.
2. `python tools/kb/lint.py episodes/<ep>/kich-ban.md` → sửa đúng dòng báo (Kxx) → chạy lại tới **0 lỗi**. Kẹt cùng một lỗi sau 3 lần → dừng, báo người dùng.
3. `python tools/kb/kichban.py episodes/<ep>/kich-ban.md --tom-tat` (không đếm tay): in số câu/shot/giây, mục cần dựng, shot dài/ngắn nhất, vị trí twist, số câu mỗi phần.
4. Trả lời: đường dẫn file + bảng tóm tắt từ đầu ra trên (số câu, số shot, tổng giây, số mục cần dựng, vị trí twist %, số câu mỗi phần). Hỏi duyệt rồi DỪNG; chưa chạy `storyboard.py`, chưa dựng.

## Biến thể format (tham khảo ở bước 1)
Trước khi viết 5 mẫu, xem `docs/format-kich-ban.md`: 4 biến thể (luật chuẩn, theo giờ, hai nhà đối chiếu, lời thú nhận) và mốc từng phần. Lint thêm cảnh báo W03–W09 cho `kich-ban.md` và `python tools/kb/lint.py --loi-ke narration.txt` cho lời kể; cảnh báo không chặn nhưng đọc từng dòng.

## Chuẩn nhịp lời từ sổ tay phong cách (người dùng duyệt 2026-11-19; nguồn: `docs/so-tay-phong-cach.md`)
Học từ 37 video cùng thể loại — là hướng dẫn nhịp, KHÔNG chép cốt truyện. Không thay quy mô ở Bước 2 (60–80 câu, ~140 shot, 150–165 s) nếu hai bên lệch: nêu độ lệch cho người dùng.
- Lời kể ~**290 từ/phút** (260–315); câu trung bình **14 từ**, câu hook ~**18 từ** (sổ tay phong cách mục 2, 37 video). Lưu ý: quy ước ~14 ký tự/giây ở Bước 2 chậm hơn mức này — ghi rõ khi lệch.
- Luật nói ra trong **≤ 5 giây đầu** (ưu tiên câu 1) (mục 2, 37 video).
- Móc giữ chân (**"nhưng" / "cho đến khi" / câu hỏi**) khoảng **25 giây một lần** (mục 2, 37 video).
- Twist ở **65–72%** thời lượng (mục 14, 37 video).
- **Không có lời kêu gọi đăng ký/theo dõi trong lời kể**; kết **ấm** hoặc **hài lật ngược** (mục 2 và 14, 37 video).

## Chữ ký riêng (ý định cố ý làm khác; sổ tay phong cách mục 15)
- Bố cục **3 lớp** (tiền – trung – hậu cảnh) với **tiền cảnh mờ có chủ ý** — hầu hết khung video tham khảo chỉ 2 lớp (mục 11, 9 video mẫu).
- **Biểu tượng luật** (thanh, bộ đếm…) **cố định một vị trí trên khung suốt tập** để người xem "đọc" được luật (mục 15). Ghi vị trí đó vào `kich-ban.md` (mục `rule`).
