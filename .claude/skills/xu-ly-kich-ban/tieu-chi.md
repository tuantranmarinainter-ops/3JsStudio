# Bảng tiêu chí chấm kịch bản

Mỗi dòng chấm **đạt / yếu / thiếu** + bằng chứng (trích câu bản thô, ≤ 15 chữ) + đề xuất nếu chưa đạt.

## A. Chuyện (format "Ở thị trấn này" — chuẩn ở `CLAUDE.md`)
| # | Tiêu chí | Cách kiểm |
|---|---|---|
| A1 | Luật lạ giống cơ chế game, nói được trong 1 câu | Viết lại luật thành 1 câu; không được thì "thiếu" |
| A2 | Luật hiện hình trong 3 giây đầu (con số, thanh, đếm ngược… nhìn thấy được) | Shot đầu có hình minh hoạ luật |
| A3 | Kể ngôi thứ nhất bởi một đứa trẻ, thì hiện tại, chữ thường ngày | Đọc lời kể |
| A4 | Nhân vật chính có điểm yếu DO LUẬT gây ra, lộ ở phần mở | Chỉ ra câu |
| A5 | Người lớn giữ bí mật (nếu có twist bí mật) | Chỉ ra ai, giấu gì |
| A6 | Gieo sớm ≥ 2 chi tiết nhỏ (câu luật phải nhắc lại, điều lạ đứa trẻ để ý, câu nói của ông bà…) và MỖI chi tiết đều được trả | Liệt kê cặp gieo → trả |
| A7 | Twist là nguyên nhân ẩn / bí mật người lớn / kẽ hở luật, KHÔNG phải sự kiện ngoài ập tới | Gọi tên kiểu twist |
| A8 | Đứa trẻ làm MỘT việc khéo bằng tay chân dùng cách thế giới vận hành (không diễn thuyết) | Chỉ ra hành động |
| A9 | Kết: điểm yếu thành lời giải; cảnh cuối gợi lại cảnh đầu; không rút bài học | Chỉ ra câu |
| A10 | Người xem lần đầu nói được "đang đặt cược điều gì" trong 1 câu trước twist | Viết câu đó ra |
| A11 | Tỉ lệ 4 phần: Hook ~10% · Leo thang ~40% · Twist ~25% · Giải quyết ~25% (mức `tap`) | Đếm theo giây |

## B. Dựng được (để Codex vẽ và app dựng không phải đoán)
| # | Tiêu chí | Cách kiểm |
|---|---|---|
| B1 | Mỗi nhân vật có: vai, tuổi, dáng khối R6, màu áo/quần/tóc, phụ kiện nhận diện, biểu cảm cần dùng | Đủ 6 ý |
| B2 | Mỗi hành động có đồ vật/chỗ đứng cụ thể (trèo lên GÌ, nấp sau GÌ, cầm GÌ) | Không còn động từ thiếu tân ngữ |
| B3 | Mỗi bối cảnh có: trong/ngoài, giờ, thời tiết, nguồn sáng chính | Đủ 4 ý |
| B4 | Mỗi bối cảnh có đủ vật để lấp khung 9:16 (không chỉ "một mảng tường") | Bước 4 sẽ bổ sung, ở đây chỉ đánh dấu |
| B5 | Vị trí tương đối giữa các vật trong cùng bối cảnh nhất quán giữa các shot | Kiểm chéo câu mô tả |
| B6 | Thời gian/không gian liền mạch giữa shot (ai ở đâu, mặc gì) | Lần theo nhân vật |
| B7 | Âm thanh then chốt gắn với khoảnh khắc (cót két, keng…) | Có ở shot nào |
| B8 | Không cần thứ engine chưa có mà chưa ghi vào `## Cần dựng` | Đối chiếu `ls engine/envs`, `python tools/kb/kichban.py --danh-sach` |

## C. Quy mô và nhịp
| Mức | Dùng khi | Chỉ tiêu |
|---|---|---|
| `doan` | Đoạn thử, cảnh lẻ (vd ep004 15 giây) | Shot 0,4–2,5 s; không áp A11 |
| `tap` | Tập đủ | 2–3 phút, ~140 shot, ~1 s/shot; 60–80 câu lời kể, mỗi câu ≤ ~35 ký tự (~14 ký tự/giây); số câu từng phần theo `docs/nhip-kich-ban.json` (`chi_tieu`); twist đầu ở 55–80% |

Nhịp máy chung (đo từ video thật, xem `docs/nghien-cuu-skill-in-this-town.md`): gần như mỗi cú cắt đổi chỗ hoặc đổi chủ thể;
1 người → đẩy vào, ≥ 2 người hoặc vật lớn → kéo ra (`CLAUDE.md`); không 5 shot cùng cỡ khung liền nhau.
