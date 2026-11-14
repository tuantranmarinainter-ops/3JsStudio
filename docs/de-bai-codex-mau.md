# Mẫu đề bài giao Codex tạo hình storyboard (Claude soạn, Codex vẽ)

Trạng thái: **mẫu đề xuất, chưa thử trên tập nào.**

## 0. Quy định chạy (người dùng chốt 2026-11-14)

- **Model: `gpt-6-luna`, mức suy luận `low`.** Claude đã viết sẵn mô tả từng hình nên Codex chỉ cần gọi công cụ tạo hình.
  Chỉ lùi lên `gpt-6.1-sol` mức `low` nếu luna bỏ sót shot hoặc không gọi được công cụ tạo hình.
- **Chạy song song tối đa:** chia đề bài theo cụm bối cảnh, mỗi cụm một tiến trình `codex exec` riêng, chạy tất cả cùng lúc
  (trần 6 tiến trình). Cụm nào hơn khoảng 25 shot thì tách đôi. Mỗi tiến trình chỉ ghi file shot của cụm mình và
  `tien-do-<cụm>.txt` riêng, không tiến trình nào ghi chung file.
- Gặp lỗi hạn mức (429, "rate limit") thì giảm một nửa số tiến trình rồi chạy lại phần còn thiếu; không chạy lại shot đã có hình.
- Lệnh cho mỗi cụm (chạy nền):
  `codex exec -C <thư mục gói> -s workspace-write --skip-git-repo-check -m gpt-6-luna -c model_reasoning_effort="low" -i <ảnh nhân vật…> -o <cụm>.log - < de-bai-<cụm>.md`

## 1. Claude quyết số hình cho từng shot (trước khi giao)

| Mức | Số hình | Dùng khi | Ví dụ |
|---|---|---|---|
| `1` | 1 (giữa shot) | Camera và nhân vật gần như đứng yên; chèn cận đồ vật, chữ | bưu thiếp, cận hộp nhẫn |
| `2` | 2 (đầu, cuối) | Chuyển động đi thẳng một hướng: zoom vào, lùi ra, lia, đi từ A sang B, thoại | mặc định cho shot thường |
| `3` | 3 (đầu, giữa, cuối) | Chuyển động đổi hướng hoặc có sự kiện giữa shot: nhảy, ngã, quay người, vật xuất hiện, cửa mở, biểu cảm đổi, camera đổi hướng | Gà nhảy lên bắt gấu |

Cách chọn: đọc mô tả shot, hỏi "khung giữa có nằm trên đường nối khung đầu và khung cuối không?". Có → `2`. Không → `3`.
Không có chuyển động đáng kể → `1`. Phân vân giữa `2` và `3` thì chọn `2` và ghi rõ hành động bằng chữ.
Mục tiêu: mức `3` không quá khoảng 20% số shot.

## 2. Dòng dữ liệu cho mỗi shot (Claude viết)

```
s012 | hinh: 2 | boi-canh: tiem-banh | camera: zoom vào, ngang tầm mắt | co-khung: trung → cận
     | dau: Gà đứng ở cửa, nhìn vào quầy | cuoi: Gà sát quầy, mắt mở to
     | hanh-dong: Gà bước 3 bước tới quầy rồi dừng
```
Mức `3` thêm `giua: …`. Mức `1` chỉ có `dau: …`.

## 3. Quy tắc cho Codex (chép nguyên vào đề bài)

- Chỉ vẽ đúng số hình ghi ở `hinh:`. Tên file: `shot_012_dau.png`, `shot_012_giua.png`, `shot_012_cuoi.png`.
- Khổ dọc 9:16. Các hình của cùng một shot phải giữ nguyên: bối cảnh, đạo cụ, trang phục, cỡ nhân vật so với đồ vật;
  chỉ thay đổi thứ được ghi ở `camera` và `hanh-dong`.
- Nhân vật vẽ theo ảnh tham chiếu đính kèm, không tự đổi tỉ lệ hay màu.
- Làm theo từng cụm bối cảnh; xong thì ghi `tien-do-<cụm>.txt` (shot nào xong, shot nào không vẽ được và vì sao).
- Không sửa mô tả shot. Thấy mô tả mâu thuẫn thì ghi vào `tien-do-<cụm>.txt`, không tự đoán.

## 4. Kiểm trước khi Claude nhận

- Đủ file theo `hinh:` của từng shot, đúng tên, đúng tỉ lệ 9:16.
- Agent phụ soi nhanh từng shot nhiều hình: bối cảnh và cỡ nhân vật có nhất quán giữa các hình không; lệch thì trả Codex đúng một vòng.
