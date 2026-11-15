---
name: xu-ly-kich-ban
description: Cửa duy nhất biến kịch bản THÔ thành kịch bản TINH cho dây chuyền Codex/kit — chấm điểm theo bảng tiêu chí, hỏi bổ sung một lượt, làm giàu chuyện (lời kể, nhịp, vai nhân vật dáng khối), viết bang-shot.json, rồi mô tả bối cảnh chi tiết thành danh sách mốc có số đo stud. Nhận cả kịch bản người dùng tự viết lẫn kịch bản chữ do skill viet-kich-ban viết ra. Dùng BẤT CỨ KHI NÀO người dùng đưa kịch bản thô / kịch bản sơ sài / "xử lý kịch bản", "review kịch bản", "làm tinh kịch bản", "làm giàu bối cảnh", "mô tả bối cảnh chi tiết", "chuẩn bị cho Codex vẽ" — kể cả khi không nhắc tên skill.
---

# Xử lý kịch bản thô → kịch bản tinh

Ba lối vào, một cửa:
- Lối 1: một câu luật → `viet-kich-ban` (5 mẫu → chọn → kịch bản chữ) → skill này.
- Lối 2: kịch bản thô người dùng đưa (chữ: chuyện, thoại, mô tả nhân vật) → skill này.
- Lối 3: video tham khảo → `video-sang-kich-ban --ra kich-ban-chu` (chỉ lấy số liệu format, viết truyện MỚI vào khung `kich-ban.md`) → skill này.

Kịch bản người dùng đưa là tài sản của họ: làm luôn, không hỏi nguồn. Mọi ý thêm vào phải TỰ NGHĨ, không chép kênh khác.
Đây là phần đầu của thứ tự chuẩn 11 bước (`docs/nghien-cuu-prompt-chuan.md`): skill này lo bước 1–4, xong thì chuyển sang duyệt tài nguyên.

## Đầu ra (thư mục `kich-ban/<ep>/`, bố cục theo `docs/quy-trinh-dau-vao.md`)
| File | Bước | Ghi chú |
|---|---|---|
| `kich-ban.md` | vào | Bản thô. KHÔNG sửa; bản thô do viet-kich-ban viết cũng nằm ở đây |
| `xu-ly/cham-diem.md` | 1 | Bảng chấm + câu hỏi |
| `kich-ban-tinh.md` | 3 | Chuyện tinh cho người đọc, khuôn `khuon-kich-ban-tinh.md` |
| `bang-shot.json` | 3 | Phải qua `node tools/kiem-bang-shot.mjs kich-ban/<ep>` (mã thoát 0) |
| `boi-canh/<id>.json` | 4 | Danh sách mốc, khuôn `khuon-boi-canh.md`. Mẫu thật: `tools/tests/fixtures/boi-canh-mau/moc-nha-may-ngoai.json` |

## Bước 1 — Chấm điểm (chưa viết lại gì)
Đọc `tieu-chi.md`. Chấm từng tiêu chí: **đạt / yếu / thiếu**, mỗi dòng ghi bằng chứng (câu nào trong bản thô). Ghi `xu-ly/cham-diem.md`.
Với chỗ yếu/thiếu, Claude TỰ ĐỀ XUẤT 1–2 phương án cụ thể trước, chỉ hỏi khi đó là quyết định của người dùng (theo `cau-hoi.md`).

## Bước 2 — Hỏi bổ sung một lượt · **STOP**
Gửi người dùng: bảng chấm rút gọn (chỉ dòng yếu/thiếu) + tối đa 10 câu hỏi đánh số, mỗi câu kèm đề xuất mặc định
để họ chỉ cần trả "ok" hoặc sửa số câu. Chọn luôn mức quy mô (`doan` hay `tap`, xem `tieu-chi.md` mục C). Dừng chờ trả lời.

## Bước 3 — Chuyện tinh + bảng shot · **STOP**
1. Viết `kich-ban-tinh.md`: tóm tắt luật/điểm yếu/twist/lời giải, các nhịp theo 4 phần, vai từng nhân vật (dáng khối R6, trang phục, đạo cụ cầm tay, biểu cảm cần có), lời kể từng câu.
2. Viết `bang-shot.json` theo `docs/quy-trinh-dau-vao.md` (số hình 1/2/3 theo `docs/de-bai-codex-mau.md` mục 1). `moTa` của mỗi bối cảnh = một câu tóm tắt; chi tiết để bước 4.
3. Chạy `node tools/kiem-bang-shot.mjs kich-ban/<ep>` tới 0 lỗi; đọc cả cảnh báo. Kẹt cùng lỗi 3 lần → dừng, báo.
4. Tự kiểm lại các tiêu chí A, B của `tieu-chi.md` trên bản tinh. Gửi người dùng: đường dẫn + số shot/tổng giây + vị trí twist %. Dừng chờ duyệt.

## Bước 4 — Bối cảnh tinh (danh sách mốc) · **STOP**
Đọc `khuon-boi-canh.md`. Với MỖI bối cảnh trong `bang-shot.json`, viết `boi-canh/<id>.json` đủ 6 phần.
- Liệt kê mọi vật mà BẤT KỲ shot nào nhắc tới hoặc hành động cần (trèo lên cái gì, nấp sau cái gì): đây là mốc `bat: true` với vai trò ghi rõ.
- Kích thước ước theo bảng chuẩn người (Gà = 5,48 stud) trong `khuon-boi-canh.md`. Ghi `nguonSo: "uoc"` — số chốt chỉ có sau bước duyệt tài nguyên.
- Bối cảnh đã có env dựng sẵn (`engine/envs/<tên>.js`) thì lấy số từ env, ghi `nguonSo: "env"`, không bịa lại.
- Tự kiểm: mỗi mốc có vị trí + kích thước + màu; vùng chừa trống phủ đường đi nhân vật và camera của các shot; các điều cấm kiểm được.
Gửi người dùng bảng tóm tắt mỗi bối cảnh (số mốc, số đồ lấp đầy, chỗ còn đoán). Dừng chờ duyệt.

## Sau skill này (không làm trong skill)
Duyệt tài nguyên (10 ứng viên mỗi món, ghi kích thước thật vào `boi-canh/<id>.json`, `nguonSo: "model"`) → khối xám trong engine,
chụp 2 góc cố định → Codex vẽ ảnh tham chiếu CHỒNG lên ảnh khối xám (`codex-ve.mjs tham-chieu`) → hình shot → kit.
Số đo stud KHÔNG BAO GIỜ lấy từ ảnh AI vẽ.

## Cấm
- Không sửa `kich-ban.md` bản thô. Không đổi luật/twist người dùng đã viết mà không hỏi (đề xuất thì được).
- Không bịa tên env/model/clip đang có trong repo; cần thứ chưa có → ghi vào mục `## Cần dựng` của `kich-ban-tinh.md`.
- Không chạy Codex, không dựng engine trong skill này.
