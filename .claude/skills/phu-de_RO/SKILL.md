---
name: phu-de_RO
description: Bản thử phong cách học từ 37 video (sổ tay phong cách) cho lớp phụ đề — cụm 1–3 chữ, trắng viền đen, giữa-dưới, từ khoá luật tô đỏ, chừa ~20% đáy khung. CHỈ dùng khi người dùng gọi đích danh "phu-de_RO" hoặc đang chạy bộ lam-phim_RO. Hiện là thiết kế, CHƯA có code; mặc định tắt.
---

# Phụ đề_RO — phụ đề cụm ngắn kiểu short (thiết kế, chưa code)

> **Trạng thái: cần code, bật/tắt được (ví dụ `?capstyle=mau`), mặc định tắt.** Skill này chỉ mô tả; KHÔNG viết code ở đây, không sửa lớp `phu-de` hiện hành (`node tools/build.mjs <ep> phu-de`), không sửa engine. Nguồn: `docs/so-tay-phong-cach.md` mục 8 (9 video mẫu, nhãn ước lượng bằng mắt) và mục 11.

## Kiểu phụ đề mẫu (9/9 video mẫu đều như vậy — sổ tay mục 8, 9 mẫu)
- **Cụm 1–3 chữ** mỗi lần hiện (một số video ghi 2–4 chữ; "Vật ký sinh" đổi cụm mỗi **0,3–0,5 s**). Chọn tối đa **3 chữ** cho _RO (sổ tay mục 8, 9 mẫu).
- **Chữ trắng, viền đen** (viền đậm hoặc mỏng tuỳ video; chọn viền **dày ≥ 3 px** ở 1080 px chiều rộng để đọc được trên nền sáng) (mục 8, 9 mẫu).
- **Vị trí giữa-dưới khung**, khoảng **70–80% chiều cao** tính từ trên xuống (mục 8, 9 mẫu).
- **Từ khoá của luật tô đỏ** (8/9 video có chữ nhấn đỏ) (mục 8, 9 mẫu). Chỉ vài từ chủ chốt của luật/twist, không tô cả câu.
- Phông: sans đậm, bo tròn (mẫu "Thị trấn quên sạch lúc nửa đêm", "Tiếng mẹ gọi" giống Be Vietnam Pro) — **dự án đã chốt Be Vietnam Pro** (phụ đề) và Patrick Hand (bưu thiếp); không đổi (mục 8 + CLAUDE.md).
- Chấm vàng đếm mạng ("Chín mạng sống") là đồ hoạ luật riêng, không thuộc phụ đề; xem D3 trong `lam-phim_RO` (mục 8, 9 mẫu).

## Chừa chỗ
Khung mẫu chừa chỗ cho phụ đề ở phía **dưới 98%** số khung (mục 11, 214 khung mẫu). Giữ **~20% đáy khung** trống: không đặt mặt, vật chính, biểu tượng luật ở dải này. `tools/gates.json` đã có vùng an toàn đáy `matAnToan[3]=0.22`; không sửa, chỉ tôn trọng.

## Cách dựng cụm từ mốc từng chữ (đã có sẵn ở lớp giọng)
Không cần đoán mốc: lớp giọng đã cho mốc từng chữ. Đọc `tools/kb/phu-de-tu-giong.py` (chỉ đọc):
1. Đầu vào là `episodes/<ep>/narration.mp3` + `moc.json` (mốc từng câu `t0`, `t1`, `text`).
2. `caps_whisper.whisper_words` lấy mốc từng chữ từ giọng thật; `align` ghép với chữ gốc của lời kể (chữ lấy từ lời kể, whisper chỉ cho mốc); `chunk` gom thành cụm.
3. Tham số cụm hiện tại: `cw.MAXW, cw.MAXCH = 4, 26` (tối đa 4 chữ, 26 ký tự). Kết quả ghi `episodes/<ep>/captions.js`: `CAPTIONS = [[start, end, text, [[ws, we], …]], …]`.
4. **Cho _RO**: dùng cùng dữ liệu nhưng chia cụm ngắn hơn — `MAXW = 3` (đúng 1–3 chữ), giữ `MAXCH` thấp để vừa một dòng ở khung dọc; không gộp qua dấu câu cuối câu; cụm cuối câu kết thúc đúng mốc chữ cuối (để cú cắt ±0,3 s cuối câu của `lam-phim_RO` trùng cụm).
5. Từ khoá đỏ: đánh dấu thêm trường trên cụm (ví dụ chữ nào đỏ) từ danh sách từ khoá luật của `kich-ban` (từ trong câu luật) — cần code, chưa có.
6. Mỗi cụm hiện từ `start` đến `end` của chữ đầu/cuối; hiện/ẩn bằng hàm thuần của `t` (không giờ thực, không `requestAnimationFrame`), để tua tới/lui ra cùng hình.

## Công tắc và phạm vi
- Bật/tắt trong trình phát cùng nhóm phụ đề (`subs`); **mặc định tắt** cho đến khi người dùng duyệt bản mẫu. Mọi tính năng mới phải tắt được (CLAUDE.md).
- Nếu tắt: phụ đề hiện hành của lớp `phu-de` chạy như cũ.
- Duyệt trước rồi mới ghép: làm đoạn mẫu 10–15 s để người dùng chốt kích thước/viền/vị trí đỏ.
