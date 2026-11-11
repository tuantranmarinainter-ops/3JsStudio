# Hướng dẫn dùng file phim (cho người dùng)

## 1. Mở phim
- File: **`S:\3JS Studio\dist\ep001.html`**. Mở bằng **Chrome** hoặc **Edge** (bấm đúp, hoặc chuột phải → Open with → Chrome),
  hoặc dán vào thanh địa chỉ: `file:///S:/3JS%20Studio/dist/ep001.html`.
- Không cần mạng, không cần cài gì. Lần đầu mở mất vài giây để nạp cảnh.

## 2. Các nút bên phải
| Nút | Tác dụng |
|---|---|
| **Ngôn ngữ** | Tiếng Việt / English — đổi cả phụ đề, giọng đọc và chữ trên bưu thiếp |
| **Giọng** | chọn giọng đọc của ngôn ngữ đang chọn |
| **Phụ đề** / **Giọng đọc** | bật/tắt phụ đề, bật/tắt giọng đọc |
| **Hiệu ứng hình** | 6 ô bật/tắt: chỉnh màu theo cảnh, toả sáng, mờ hậu cảnh, tối viền + hạt phim, viền đen nhân vật, mưa bão |
| **Tiếng động** | từng lớp (tiếng nền, bước chân nhà, tiếng động theo cảnh…): ô bật/tắt + thanh âm lượng 0–150% |
| **▶ Xem** + thanh tua | xem trước có tiếng (phím **Space** = phát/dừng) |

Chỉnh gì ở trên thì **file MP4 xuất ra đúng như vậy**.

## 3. Xuất MP4
1. Chọn độ phân giải: **2K 1440×2560** (mặc định, hợp YouTube Shorts), Full HD hoặc 4K.
2. Muốn xuất một đoạn: điền giây bắt đầu – kết thúc. Để nguyên = cả phim.
3. Bấm **⬇ Xuất MP4** → Chrome/Edge hỏi chỗ lưu → chờ thanh tiến độ (cả phim 2K khoảng 1 phút với card đồ hoạ rời).
4. Giữ tab mở trong lúc xuất. Bấm **Dừng** để huỷ.
Tên file tự ghi tuỳ chọn: `…_VI_<giọng>_1440x2560.mp4`, thêm `_nosub`, `_novoice`, `_nosfx` khi tắt.

## 4. Khi đăng YouTube
- Dán phần ghi công vào mô tả video: **`assets/sfx/CREDITS.md`** (tiếng động CC BY) và **`assets/CREDITS.md`** (model 3D CC BY).

## 5. Muốn sửa
Nói với Claude theo **lớp**: "sửa lớp tiếng nền…", "lớp hiệu ứng hình: cảnh đảo ấm hơn", "lớp khoảnh khắc: tiếng cửa to hơn"…
Bảng các lớp: `episodes/ep001/LAYERS.md`. Claude sửa xong sẽ gửi lại link file HTML mới.
