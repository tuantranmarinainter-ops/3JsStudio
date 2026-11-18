# Tiêu chí thử cách làm — biết một thay đổi là đúng hay sai

<!-- ĐIỂM DỪNG: tối đa 25 dòng. GHI ĐÈ cả khối mỗi lần cập nhật, không nối thêm. -->
## ĐIỂM DỪNG
- **Cập nhật:** 2026-11-18 · **Trạng thái:** BẢN NHÁP (phiên điều phối soạn), chờ người dùng duyệt
- **Dùng khi:** đổi prompt, đổi luật camera, đổi engine/hậu kỳ, thử cách làm mới (vd ý học từ prompt Grandma)
- **Chưa có tool:** mục B3 (nhịp camera), B5 (bóng ma) — đang chấm tay; đề xuất viết tool sau khi duyệt
<!-- /ĐIỂM DỪNG -->

## Nguyên tắc
1. **Ghi tiêu chí trước, thử sau.** Không chấm "trông được không".
2. **Thử trên bộ 5 shot (mục A), không chạy cả phim.** Đạt bộ thử rồi mới chạy cả tập.
3. **Mỗi lần đổi MỘT điều.** Ghi một dòng vào sổ (mục D).
4. **Có điểm chuẩn (lần 0)** chụp TRƯỚC khi đổi, để so A/B.
5. **3 lần sửa cùng một chỗ mà điểm không tăng → dừng**, báo lại (thường là thiếu tool, không phải thiếu chữ).

## A. Bộ 5 shot thử chuẩn (ep003)
Chọn để phủ đủ kiểu khung + 3 bối cảnh. Không đổi bộ này giữa các lần thử (đổi thì lập điểm chuẩn mới).

| Ô | Shot | Bối cảnh | Kiểu | Thử điều gì |
|---|---|---|---|---|
| 1 | `s003` | e3-pho | toàn cảnh, không người | bầu trời, ánh sáng, nền xa, zoom rõ |
| 2 | `s016` | e3-phong | 1 người → zoom IN | mặt trong vùng an toàn, không bị đạo cụ che |
| 3 | `s013` | e3-pho | 5 người → zoom OUT | đông người: xuyên nhau, chân chạm đất, không cắt nửa người |
| 4 | `s020` | e3-phong | cầm đạo cụ (hold) | tay–vật khớp, vật đọc được |
| 5 | `s051` | e3-nha-may | nội thất khác ánh sáng | vật liệu/vân, độ sáng, shader |

Lệnh chụp chung (lưu điểm chuẩn lần 0):
```
node tools/look.mjs episodes/ep003/index.html --shots s003,s016,s013,s020,s051 --gates --det --pose --out refs/thu-cach-lam/lan0
```
Sau khi đổi:
```
node tools/look.mjs episodes/ep003/index.html --shots s003,s016,s013,s020,s051 --gates --det --pose-ref refs/thu-cach-lam/lan0/pose.json --ref refs/thu-cach-lam/lan0 --out output/thu-cach-lam/lanN
```

## B. Tiêu chí MÁY chấm (đạt/trượt, không cần mở ảnh)
| # | Tiêu chí | Đạt khi | Công cụ |
|---|---|---|---|
| B1 | Cổng kiểm | 0 cảnh báo mới so với lần 0 (chân lơ/lún, đầu cắt, mặt ngoài vùng an toàn, xuyên) | `--gates`, ngưỡng `tools/gates.json` |
| B2 | Tất định | tua tới/lui ra cùng hình | `--det` |
| B3 | Nhịp camera | mọi shot có zoom rõ (luật dồn dập); 2 shot liền nhau KHÁC kiểu chuyển động (zoom in / zoom out / lia / đẩy) | dòng LOOK của `--gates`; luật "khác kiểu" ⚠ chưa có tool |
| B4 | Tên hợp lệ | 0 tên lạ | `node tools/danh-muc.mjs kiem ep003` |
| B5 | Bóng ma | MP4 xuất ra không có khung lạc (khác cả 2 khung bên cạnh) | ⚠ chưa có tool — xem tay đoạn xuất |
| B6 | Hiệu năng | ≤ 80 shader program, mở trang ≤ 10 s | `node tools/shaders.mjs episodes/ep003/index.html` |
| B7 | Thay đổi có chủ đích | chỉ các shot định sửa lệch so với lần 0; shot khác PSNR giữ nguyên | `--ref` (ảnh `*_diff.png`) |

**Trượt bất kỳ B1/B2/B4 = thay đổi bị loại**, không chấm tiếp phần C.

## C. Tiêu chí NGƯỜI chấm (thang 1–5, chỉ khi B đạt)
Người dùng xem MỘT ảnh lưới trước/sau (≈800 px), cho điểm:

| # | Tiêu chí | 1 = | 5 = |
|---|---|---|---|
| C1 | Đọc khung | không biết nhìn đâu | nhìn là hiểu ngay ai/cái gì |
| C2 | Đẹp/chân thật | phẳng, nhựa | ánh sáng có chiều sâu, vân rõ |
| C3 | Năng lượng | đứng, chán | dồn dập, muốn xem tiếp |
| C4 | Liên tục | trang phục/đạo cụ nhảy lung tung | khớp với shot trước/sau |

**Thay đổi được giữ khi:** B đạt hết + tổng C ≥ lần 0 (không ô nào giảm quá 1 điểm).

## D. Sổ thử (mỗi lần một dòng, mới nhất ở dưới)
| Lần | Ngày | Đổi điều gì (1 điều) | B trượt | C1 | C2 | C3 | C4 | Giữ? | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|
| 0 | | điểm chuẩn | | | | | | — | |

## E. Phân biệt "sai thật" với "lần chạy xui" (khi có bước Claude tự viết code)
- Chạy cùng thay đổi **2 lần**. Một đạt một trượt → đề bài còn mơ hồ ở chỗ trượt. Cả 2 trượt → sai thật.
- Trượt lặp lại ở cùng một bước → thêm MỘT luật cụ thể vào bước đó (hoặc một tiêu chí B mới), không viết lại cả đề bài.
- Bài học nào lặp lại ≥ 2 lần → chuyển thành tiêu chí máy chấm (thêm vào `gates.json`, `danh-muc kiem` hoặc tool mới).

## F. Đề xuất tool (chưa làm, chờ duyệt)
1. **B3 nhịp camera:** thêm vào `tools/gates.mjs` — phân loại chuyển động mỗi shot từ `p→p2`/`fov→fov2`, cảnh báo 2 shot liền nhau cùng kiểu.
2. **B5 bóng ma:** `tools/bong-ma.mjs <file.mp4>` — tách khung thu nhỏ, đánh dấu khung khác cả 2 khung kề (ra `ghosts.json`).
