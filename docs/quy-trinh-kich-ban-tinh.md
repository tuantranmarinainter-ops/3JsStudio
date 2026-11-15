# Quy trình chuẩn: kịch bản → app (dây chuyền Codex/kit) · và các skill chồng chéo

Ngày: 2026-11-15. Lý do đổi: `docs/nghien-cuu-prompt-chuan.md`.

## 1. Thứ tự 11 bước
| # | Bước | Ra file | Skill / công cụ | STOP |
|---|---|---|---|---|
| 0a | (Lối 1) Một câu luật → 5 mẫu → kịch bản chữ | `kich-ban/<ep>/kich-ban.md` | `viet-kich-ban` (nhánh Codex/kit) | chọn mẫu |
| 0b | (Lối 2) Bạn đưa kịch bản thô | `kich-ban/<ep>/kich-ban.md` | — | |
| 1 | Chấm điểm + hỏi bổ sung một lượt | `xu-ly/cham-diem.md` | `xu-ly-kich-ban` bước 1–2 | trả lời câu hỏi |
| 2–3 | Chuyện tinh + bảng shot | `kich-ban-tinh.md`, `bang-shot.json` | `xu-ly-kich-ban` bước 3, `kiem-bang-shot.mjs` | duyệt |
| 4 | Bối cảnh tinh: danh sách mốc, số ước theo người | `boi-canh/<id>.json` | `xu-ly-kich-ban` bước 4 | duyệt |
| 5 | Tờ mẫu nhân vật | `tham-chieu/nv_*.png` | `codex-ve.mjs tham-chieu` | duyệt |
| 6 | Duyệt tài nguyên, ghi kích thước thật | `boi-canh/<id>.json` (`nguonSo: model`) | `roblox.mjs`, `nhap-model.mjs`, trang duyệt asset | chọn model |
| 7 | Khối xám trong engine, chụp 2 góc | `engine/envs/<tên>.js` | `scene-env`, `look.mjs` | duyệt bố cục |
| 8 | Ảnh tham chiếu bối cảnh (vẽ chồng lên khối xám) | `tham-chieu/bc_*.png` | `codex-ve.mjs tham-chieu` | duyệt |
| 9 | Ảnh shot | `hinh/shot_*` | `codex-ve.mjs shot` | duyệt |
| 10 | Kit (toạ độ từ danh sách mốc) | `kit.json` | `kiem-kit.mjs` | duyệt |
| 11 | Dựng vào app → HTML | `episodes/<ep>/shots.js`, `dist/<ep>.html` | `kit-shots.mjs`, `giong-doc`, `tieng-dong`, `xuat-phim` | như hiện nay |

Luật: số stud chỉ lấy từ bảng chuẩn theo người (bước 4) và model thật (bước 6), không đo trên ảnh AI. Sửa ở bước nào thì làm lại từ bước đó trở xuống.

## 2. Hai dây chuyền đang song song
| | Dây chuyền CŨ (ep001–ep003) | Dây chuyền MỚI (ep004 trở đi) |
|---|---|---|
| Kịch bản nằm ở | `episodes/<ep>/kich-ban.md`, bảng 19 cột | `kich-ban/<ep>/` + `bang-shot.json` |
| Có ảnh Codex, có kit? | Không | Có |
| Đổi thành shot bằng | `tools/storyboard.py` (đặt camera theo loại shot mặc định) | `tools/kit-shots.mjs` (toạ độ, camera đo theo stud) |
| Điều phối | skill `lam-phim` | chưa có skill điều phối (đang làm tay) |

## 3. Skill chồng chéo
| Cặp skill | Chồng ở đâu | Đề xuất |
|---|---|---|
| `viet-kich-ban` (bước 2–3) ↔ `xu-ly-kich-ban` (bước 3) | Cả hai đều làm bảng shot, nhưng ra 2 định dạng (19 cột / `bang-shot.json`) | Đã chia: nhánh Codex/kit dùng `xu-ly-kich-ban`. Khi dây chuyền mới chạy ổn: bỏ bước 2–3 của `viet-kich-ban` |
| `nhap-kich-ban` ↔ bước 9–11 | Hai đường từ ảnh vào app: `storyboard.py` (đoán camera) và kit (đo bằng stud) | Giữ `nhap-kich-ban` cho storyboard có sẵn ảnh của bạn; tập mới đi kit |
| `lam-phim` ↔ dây chuyền mới | `lam-phim` chỉ đọc bảng 19 cột → không chạy được cho tập đi kit | Việc sau: cho `lam-phim` nhận `kich-ban/<ep>/kit.json` (bước 11) |
| `video-sang-kich-ban` ↔ Lối 2 | Ra `storyboard.md` kiểu cũ cho `storyboard.py` | Việc sau: thêm lựa chọn ra kịch bản chữ để đưa vào `xu-ly-kich-ban` |
| `xu-ly-kich-ban` (bước 4) ↔ `scene-env` | Không chồng: danh sách mốc là đầu vào, `scene-env` dựng code | Việc sau: `scene-env` đọc `boi-canh/<id>.json` khi dựng khối xám |
| `codex-ve.mjs tham-chieu` ↔ bước 8 | Hiện soạn đề bài từ một câu `moTa` | Việc sau: đọc `boi-canh/<id>.json` + đính kèm ảnh khối xám |
