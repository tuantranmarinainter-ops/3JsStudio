# Biến thể format cho "Ở thị trấn này"

Dùng ở bước 1 của skill `viet-kich-ban` (chọn kiểu trước khi viết 5 mẫu). Mọi biến thể **giữ nguyên bộ khung của kênh**: một luật lạ nói được trong 1 câu, kể ngôi thứ nhất bởi một đứa trẻ, điểm yếu do luật gây ra → thành lời giải, 4 phần Hook ~10% · Leo thang ~40% · Twist ~25% · Giải quyết ~25%, 120–180 s, ~140 shot. Biến thể chỉ đổi **cách luật hiện ra và cách leo thang**.

Cấu trúc "chọn từ một dòng → mốc theo phần trăm → lint báo thiếu gì" học từ cách nocodehack tổ chức 11 format; toàn bộ lời, ví dụ ở đây là của ta. Chi tiết đối chiếu: `output/lint-format/hoc-duoc.md`.

## Chọn biến thể từ một dòng

| Luật của bạn có dạng… | Biến thể | Ghi ở header |
|---|---|---|
| một con số/thanh gắn lên mọi người, giảm vì một việc cụ thể | **A. Luật chuẩn** (mặc định) | không cần |
| luật chạy theo đồng hồ / đếm ngược / giờ cố định trong ngày | **B. Luật theo giờ** | `kieu: gio` |
| hai nhà / hai đứa trẻ cùng bị luật nhưng xử lý ngược nhau | **C. Hai nhà đối chiếu** | `kieu: doi-chieu` |
| câu chuyện kể lại như một lời thú nhận, câu cuối đảo ai đúng ai sai | **D. Lời thú nhận** | `kieu: thu-nhan` |

`kieu:` hiện chỉ là ghi chú cho người đọc (lint không đọc); đặt để đồng đội biết kịch bản đi theo mốc nào.

## A. Luật chuẩn (format gốc)
- **Khi nào:** luật là cơ chế game (thanh máu, %, số trên đầu); nhân vật chính có điểm yếu rõ.
- **Mốc:** Hook 0–10% (luật hiện trong 3 giây đầu, điểm yếu lộ) · Leo thang 10–50% (3 lần luật gây hậu quả, mỗi lần nặng hơn, cài ≥ 2 manh mối cho twist) · Twist ~50–75% (bí mật người lớn / kẽ hở / nguyên nhân ẩn) · Giải quyết 75–100% (điểm yếu thành lời giải, cảnh cuối gợi lại cảnh đầu).
- **Lint chú ý:** K07 (câu đầu "Ở thị trấn này"), K11 + W06 (twist, và phần sau twist 20–50%), W07 (có ngôi "tôi"), W08 (cảnh cuối trở về địa điểm đầu).

## B. Luật theo giờ
- **Khi nào:** luật gắn thời gian ("mỗi tối 9 giờ…", đếm ngược tới chuông). Đồng hồ là xương sống nên mỗi phần của phim có một mốc giờ.
- **Mốc:** Hook cho thấy đồng hồ + luật · Leo thang đi qua 3–4 mốc giờ, mỗi mốc một hậu quả nặng hơn (đổi cột `giờ` của bảng shot cho khớp) · Twist: đúng lúc đồng hồ chạm 0 mà điều tưởng sẽ xảy ra không xảy ra / xảy ra theo cách khác · Giải quyết: đảo lại cách dùng khung giờ.
- **Lưu ý:** dễ rơi vào cả phim ban đêm → W01 (quá 50% shot là đêm) sẽ báo; xen cảnh trong nhà sáng.

## C. Hai nhà đối chiếu
- **Khi nào:** muốn lộ kẽ hở của luật bằng cách cho thấy hai cách sống với luật; kẽ hở là chỗ hai nhà khác nhau.
- **Mốc:** Hook luật + nhà của "tôi" · Leo thang xen kẽ nhà tôi / nhà bạn, **cùng khung camera** cho hai nhà để người xem tự so · Twist: nhà kia không tuân luật mà không bị gì — vì một lý do bị giấu · Giải quyết: điểm yếu của tôi chính là cách nhà kia đã làm.
- **Lưu ý:** hai nhà dùng cùng cách quay (cùng `type`/góc) nên W02 (địa điểm > 30%) cần chia cho nhiều địa điểm; đừng để cả phim ở 2 nhà.

## D. Lời thú nhận
- **Khi nào:** câu chuyện kể như thổ lộ một chuyện giấu lâu; câu mở là luật nhưng câu cuối lật lại ai đúng ai sai (thường người lớn).
- **Mốc:** Hook luật + một câu hứa "tới giờ tôi mới dám kể" · Leo thang là những lần đứa trẻ hiểu lầm · Twist: một insertRead / closeup nhấn đúng khoảnh khắc lật (không chỉ để lời kể gánh) · Giải quyết: đứa trẻ kể lại bằng đúng lời đầu phim nhưng nghĩa khác.
- **Lưu ý:** dễ thành một chuỗi hồi tưởng dài → K10 (1 câu ≤ 3 shot) và W05 (đọc không kịp) giữ câu ngắn.

## Chưa dùng (và lý do)
- Phim theo **camera POV** (người xem là nhân vật): ngôi thứ nhất của ta là giọng kể, camera vẫn dựng như `engine/shottypes.js`.
- Thẻ chữ chia đôi màn hình, bảng xếp hạng, tin nhắn điện thoại: không có trong engine hoặc không hợp 2–3 phút.
- Câu hỏi chọn A/B cho người xem: chỉ nên làm **câu kết** (bình luận), không làm khung cả phim.

## Kiểm bằng công cụ
```bash
python tools/kb/lint.py episodes/<ep>/kich-ban.md          # K00–K11 + W01–W09 (cảnh báo)
python tools/kb/lint.py --loi-ke episodes/<ep>/narration.txt  # N01–N02 + W10–W12
node tools/kiem-bang-shot.mjs kich-ban/<ep>                # bang-shot.json, thêm cảnh báo dur/thoại/camera/khai thừa
```
Bảng mã và ngưỡng: đầu `tools/kb/lint.py`. Cảnh báo không chặn; sửa theo từng dòng báo rồi chạy lại.
