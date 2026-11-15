---
name: video-sang-kich-ban
description: Quăng một video (file hoặc link YouTube) vào → tự cắt thành từng shot, lấy khung đầu/giữa/cuối, nhận dạng lời kể (faster-whisper trên GPU), dò tiếng động + nhịp nhạc + cắt khớp nhịp, rồi ra HAI kiểu đầu ra: (mới, mặc định cho tập mới) kịch bản chữ phan-tich-format.md + kich-ban.md chỉ học format để chuyển sang skill xu-ly-kich-ban; (cũ) storyboard.md đúng định dạng docs/kich-ban-vao.md để dựng bằng tools/storyboard.py. Dùng BẤT CỨ KHI NÀO người dùng gửi/chỉ một video và nói "phân tích", "ra kịch bản", "bóc kịch bản", "cắt thành frame", "học theo video này", "làm lại video này", "mổ xẻ video" — kể cả khi không nhắc tên skill.
---

# Video → kịch bản

## 0. Chọn đầu ra (hai đường, hỏi nếu chưa rõ)
| Đường | Cờ | Ra | Dùng khi |
|---|---|---|---|
| **MỚI — mặc định cho tập mới** (Lối 3 của `xu-ly-kich-ban`) | `--ra kich-ban-chu` | `phan-tich-format.md` (chỉ số liệu format) + `kich-ban.md` (khung kịch bản chữ) | học format của video để viết truyện MỚI → skill `xu-ly-kich-ban` |
| Cũ (engine `storyboard.py`) | `--ra storyboard` (mặc định của tool) | `phan-tich.md` + `storyboard.md` + khung | dựng lại y nguyên video của người dùng (`--cua-toi`), hoặc dây chuyền engine cũ |
| Cả hai | `--ra ca-hai` | cả hai bộ | cần đối chiếu |

**Luật kênh (đường mới):** chỉ học FORMAT (nhịp cắt, độ dài shot, kiểu máy, cấu trúc 4 phần). KHÔNG chép luật, nhân vật, twist,
lời kể, chữ trên hình của video nguồn; `phan-tich-format.md` chỉ chứa số liệu, lời nhận dạng chỉ được ĐẾM.

## 1. Chạy công cụ
```bash
python tools/video2kb.py <video.mp4 | URL> --ra kich-ban-chu [--lang vi]     # tập mới
python tools/video2kb.py <video.mp4 | URL> [--cua-toi] [--lang vi]           # đường cũ
python tools/video2kb.py --tu-shots kich-ban/<tên>/shots.json --ra kich-ban-chu [--force]   # dựng lại 2 file, không cần video
```
- `--cua-toi`: video của chính người dùng (dựng lại y nguyên). Không có cờ này = video kênh khác.
- Bật/tắt từng phần: `--loi off` (không lấy lời), `--no-am-thanh` (không dò tiếng động), `--loi vtt` (chỉ phụ đề tải kèm).
- Mô hình giọng: mặc định `large-v3` trên GPU (RTX 3060: ~20 s cho 1 phút video sau lần tải mô hình đầu ~3 GB), `small` khi chỉ có CPU;
  ép bằng `--model`. Vẫn sai vài chữ ("bư thiết" → bưu thiếp) → Claude sửa khi điền.
- Cắt thiếu cảnh → `--thr 0.15`; thừa → `--thr 0.35`.
- Ra `kich-ban/<tên>/`: `phan-tich.md` (đọc trước), `storyboard.md` (nháp), `sheets/` (bảng khung có nhãn), `frames/` (dải
  đầu|giữa|cuối mỗi shot), `shot_NNN.jpg` (khung storyboard), `loi.json/.srt`, `am-thanh.json`. `_nguon/` không commit.

## 2A. Đường mới — kịch bản chữ → `xu-ly-kich-ban`
1. Xem `sheets/*.jpg` + `frames/` (độ chuyển động đã đo thô trong `shots.json`, trường `dong`). Thêm trường `loai` cho từng shot trong
   `shots.json` (một trong 11 loại ở mục 2B) rồi chạy lại `--tu-shots … --force` → bảng tỉ lệ kiểu máy trong `phan-tich-format.md` đầy đủ.
2. Người dùng/Claude viết truyện MỚI vào khung `kich-ban.md` (luật, điểm yếu, twist, lời giải, nhân vật, bối cảnh, lời kể 4 phần) theo
   mục tiêu nhịp ở đầu file; ý hoàn toàn tự nghĩ (kịch bản người dùng đưa là tài sản của họ).
3. Chuyển sang skill **`xu-ly-kich-ban`** (chấm tiêu chí → hỏi bổ sung → chuyện tinh + `bang-shot.json` → bối cảnh tinh). Không chạy `storyboard.py`.

## 2B. Đường cũ — Claude điền storyboard.md
Đọc `phan-tich.md` rồi xem `sheets/*.jpg` theo thứ tự (mỗi tờ 24 shot; mở `frames/shot_NNN.jpg` khi cần biết chuyển động / máy quay).
Với mỗi hàng, điền theo bảng cột trong `docs/kich-ban-vao.md`:
- **loại**: toàn cảnh / đám đông / đi ngang / bám theo / cận mặt / phản ứng / qua vai / cận đồ / rượt / lộ diện / đối thoại.
- **ai / cùng / ở đâu / hành động / mặt / máy quay / chữ** — ngắn, dùng từ khoá có trong tài liệu (đẩy vào, lia, xoay quanh…).
- **lời kể**: sửa lỗi chính tả do nhận dạng giọng; giữ `^` (câu còn tiếp). Giữ nguyên cột **giây** (đúng nhịp cắt gốc).
- **tiếng động**: đã có gợi ý `impact thud@0.40`… (đoán thô, bắt được ~70% tiếng động, ~1/2 là đúng) → sửa thành tên tiếng
  Anh cụ thể theo hình (door slam, whale splash…), bỏ cái vô lý.
- Đầu file: `rule / weakness / twist / solution`, `actor <tên>: …` (màu áo nhìn từ khung), `crowd`, `env`.
- Gom nhiều shot giống nhau thì vẫn giữ từng hàng (1 hàng = 1 cú cắt).

**Video kênh khác** (không có `--cua-toi`): chỉ giữ NHỊP (giây, loại shot, máy quay, chỗ đặt tiếng động). Luật, nhân vật,
twist, lời kể, chữ trên hình phải thay bằng ý mới của mình (CLAUDE.md: không chép cốt truyện). Ghi `ghi chú: học nhịp từ <nguồn>`.

## 3. Duyệt → dựng (đường cũ)
1. Gửi người dùng: bảng khung (`sheets/sheet_01.jpg`…) + `storyboard.md` đã điền, tóm tắt luật/twist/số shot/độ dài.
2. Người dùng chốt → `python tools/storyboard.py kich-ban/<tên> epNNN --sheet` (skill `nhap-kich-ban`) → xem
   `output/storyboard/epNNN/compare.jpg` → giọng (`giong-doc`) → `xuat-phim`, giao link HTML.

## Ghi chú kỹ thuật
- Nhận dạng giọng chạy trên GPU nếu có thư viện CUDA (`pip install nvidia-cublas-cu12 nvidia-cudnn-cu12==9.*`), không thì CPU.
  Tự giải mã âm thanh bằng ffmpeg (không cần PyAV đúng phiên bản).
- Câu → shot nơi câu bắt đầu (câu bắt đầu < 0,25 s trước cú cắt được dời sang shot sau).
- Đã đo trên tiếng động thật của ep001 (60 s đầu): dò được 70% tiếng động, 56% số phát hiện là đúng (±0,12 s). Tiếng kéo dài
  (kẽo kẹt, rền) hay bị sót → xem hình mà bổ sung.
