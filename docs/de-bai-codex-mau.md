# Mẫu đề bài giao Codex tạo hình storyboard (Claude soạn, Codex vẽ)

Trạng thái: **mẫu đề xuất, chưa thử trên tập nào.**

## Đầu vào (người dùng nhắc 2026-11-14)

Người dùng **chỉ đưa kịch bản chữ**: mô tả bối cảnh, mô tả nhân vật, lời thoại. Không có hình, không có bảng shot. Vì vậy:

1. Claude tự chia shot và viết dòng dữ liệu cho từng shot (mục 1, 2).
2. Song song, Codex vẽ **ảnh tham chiếu** từ mô tả: mỗi nhân vật một tờ mẫu (trước, nghiêng, sau, vài biểu cảm), mỗi bối cảnh một ảnh toàn cảnh → `tham-chieu/`.
3. Người dùng duyệt bảng shot + ảnh tham chiếu. **Chưa duyệt thì chưa vẽ hình shot.**
4. Mọi lần vẽ hình shot đều đính kèm (`-i`) ảnh tham chiếu đã duyệt của nhân vật và bối cảnh trong cụm đó.

## 0. Quy định chạy (người dùng chốt 2026-11-14)

- **LUẬT LƯỚI (người dùng chốt 2026-11-16): MỖI LẦN giao Codex vẽ, gộp nhiều hình vào MỘT ảnh lưới rồi cắt ra.**
  Công cụ tạo hình của Codex chỉ ra 1 ảnh mỗi lần gọi (~60–100 s) và không sinh nhiều ảnh/lần, nên gộp vào lưới là cách nhanh nhất.
  Đo ở ep005t: lưới 2×4 = 8 hướng một bối cảnh trong 105 s (1024×1536, mỗi ô ~490×360) thay vì 8 × ~60 s; các ô cùng bối cảnh khớp nhau hơn.
  Chất lượng ô nhỏ là CHẤP NHẬN (người dùng: "không cần ảnh quá chất lượng cao").
  - Bố cục: lưới tối đa 8–10 ô bằng nhau, viền trắng 8 px giữa ô, KHÔNG chữ/nhãn/số trong ảnh; đề bài liệt kê thứ tự ô (trái→phải, trên→dưới).
  - Gộp theo nhóm cần khớp nhau: 8 hướng của một bối cảnh; các hình (1/2/3) của các shot cùng bối cảnh; tờ mẫu nhân vật.
  - Đề bài phải dặn cách lưu: dùng đúng đường dẫn công cụ trả về / thư mục con của chính phiên; KHÔNG "file mới nhất" (16/11: 4 lưới song song → 3 cặp chép nhầm nhau). Sau khi nhận, Claude kiểm md5 trùng giữa các lưới.
  - Claude cắt lưới theo khe trắng (gần vị trí chia đều) rồi đặt tên từng ô; mẫu đề bài: `docs/mau-de-bai/luoi-8-huong.md`.
  - Chạy 4 lưới cùng lúc là an toàn; 7 tiến trình cùng lúc từng gặp 502 liên tục (16/11).
  - **Lệnh (đã tự động, `tools/codex-ve.mjs`): lưới là MẶC ĐỊNH** — `node tools/codex-ve.mjs <tham-chieu|shot> <thư mục tập> [--thu] [--tran 4] [--huong …] [--chi …]`.
    Gom nhóm: 8 hướng một bối cảnh = 1 lưới 2×4 (đúng thứ tự `HUONG_BOI_CANH`, cụm `<id>_huong`); tờ nhân vật ≤ 8 / lưới (`nv_<id đầu>`);
    shot: hình của các shot cùng bối cảnh ≤ 10 ô / lưới. Mỗi lưới = 1 tiến trình `codex exec`, ghi `slide/<cụm>.png`; đề bài ghi `- LUOI:` + thứ tự ô
    + câu lưu file ở trên. Sau khi chạy công cụ tự: kiểm md5 trùng giữa các lưới (trùng → xoá cả hai, tính thiếu), cắt ô theo khe trắng
    (±40 px quanh điểm chia đều) ra `tham-chieu/bc_<id>_<huong>.png` / `hinh/shot_<id>_<n>.png`, giữ lưới gốc ở `slide/`.
    Trần song song mặc định **4**. `--le` = vẽ từng ảnh (cách cũ); `--chong` ép `--le`. Chạy lại chỉ vẽ lại lưới còn ô thiếu (lưới thiếu = vẽ lại cả lưới).
  - Lùi về vẽ từng ảnh chỉ khi một hình cần độ nét cao (người dùng yêu cầu) hoặc lưới vẽ sai thứ tự ô 2 lần.

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
| `1` | 1 (file `_dau`) | Camera và nhân vật gần như đứng yên; chèn cận đồ vật, chữ | bưu thiếp, cận hộp nhẫn |
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
- Câu trả lời cuối chỉ gồm: đường dẫn `tien-do-<cụm>.txt`, số hình đã vẽ / số hình được giao, danh sách shot không vẽ được (mỗi shot 1 dòng).
  Không kể lại quá trình, không chép mô tả shot.

## 4. Kiểm trước khi Claude nhận

- Kiểm trên ĐĨA trước, không tin lời báo: đủ file theo `hinh:` của từng shot, đúng tên, đúng tỉ lệ 9:16 (`node tools/kiem-kit.mjs`).
  Claude chỉ đọc `tien-do-<cụm>.txt`, không đọc log `-o` của Codex trừ khi cụm đó thiếu hình.
- Agent phụ soi nhanh từng shot nhiều hình: bối cảnh và cỡ nhân vật có nhất quán giữa các hình không; lệch thì trả Codex đúng một vòng.
