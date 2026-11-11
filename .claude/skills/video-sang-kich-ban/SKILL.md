---
name: video-sang-kich-ban
description: Quăng một video (file hoặc link YouTube) vào → tự cắt thành từng shot, lấy khung đầu/giữa/cuối, nhận dạng lời kể (faster-whisper trên GPU), dò tiếng động + nhịp nhạc + cắt khớp nhịp, rồi Claude xem khung và điền bản kịch bản storyboard.md đúng định dạng docs/kich-ban-vao.md để dựng thành tập mới bằng tools/storyboard.py. Dùng BẤT CỨ KHI NÀO người dùng gửi/chỉ một video và nói "phân tích", "ra kịch bản", "bóc kịch bản", "cắt thành frame", "học theo video này", "làm lại video này", "mổ xẻ video" — kể cả khi không nhắc tên skill.
---

# Video → kịch bản

## 1. Chạy công cụ
```bash
python tools/video2kb.py <video.mp4 | URL> [--cua-toi] [--lang vi]
```
- `--cua-toi`: video của chính người dùng (dựng lại y nguyên). Không có cờ này = video kênh khác.
- Bật/tắt từng phần: `--loi off` (không lấy lời), `--no-am-thanh` (không dò tiếng động), `--loi vtt` (chỉ phụ đề tải kèm).
- Mô hình giọng: mặc định `large-v3` trên GPU (RTX 3060: ~20 s cho 1 phút video sau lần tải mô hình đầu ~3 GB), `small` khi chỉ có CPU;
  ép bằng `--model`. Vẫn sai vài chữ ("bư thiết" → bưu thiếp) → Claude sửa khi điền.
- Cắt thiếu cảnh → `--thr 0.15`; thừa → `--thr 0.35`.
- Ra `kich-ban/<tên>/`: `phan-tich.md` (đọc trước), `storyboard.md` (nháp), `sheets/` (bảng khung có nhãn), `frames/` (dải
  đầu|giữa|cuối mỗi shot), `shot_NNN.jpg` (khung storyboard), `loi.json/.srt`, `am-thanh.json`. `_nguon/` không commit.

## 2. Claude điền storyboard.md
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

## 3. Duyệt → dựng
1. Gửi người dùng: bảng khung (`sheets/sheet_01.jpg`…) + `storyboard.md` đã điền, tóm tắt luật/twist/số shot/độ dài.
2. Người dùng chốt → `python tools/storyboard.py kich-ban/<tên> epNNN --sheet` (skill `nhap-kich-ban`) → xem
   `output/storyboard/epNNN/compare.jpg` → giọng (`giong-doc`) → `xuat-phim`, giao link HTML.

## Ghi chú kỹ thuật
- Nhận dạng giọng chạy trên GPU nếu có thư viện CUDA (`pip install nvidia-cublas-cu12 nvidia-cudnn-cu12==9.*`), không thì CPU.
  Tự giải mã âm thanh bằng ffmpeg (không cần PyAV đúng phiên bản).
- Câu → shot nơi câu bắt đầu (câu bắt đầu < 0,25 s trước cú cắt được dời sang shot sau).
- Đã đo trên tiếng động thật của ep001 (60 s đầu): dò được 70% tiếng động, 56% số phát hiện là đúng (±0,12 s). Tiếng kéo dài
  (kẽo kẹt, rền) hay bị sót → xem hình mà bổ sung.
