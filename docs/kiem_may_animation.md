# Kiểm máy animation R6 — quy trình tái sử dụng

Ghi lại quá trình kiểm + sửa bộ **84 động tác BBS** cho Gà R6 cứng (18–19/11/2026) để làm lại cho bộ mới (vd **65 động tác**).
Chi tiết kỹ thuật bộ hiện có: `assets/r6-bobj/README.md`. Lệnh gói: `tools/r6-may-kiem.mjs`.

## 0. Tóm tắt 1 vòng
```
nguồn (.bobj, có Steve/xương gốc) → retarget R6 → r6-cung.mts (tay/chân cứng, gối, chống xoắn, đẩy tay) → trang thử
→ node tools/r6-may-kiem.mjs (đo số + 4 khung/động tác) → 3 agent Sonnet soi ảnh → --chi-gop → trang tổng hợp
→ sửa r6-cung.mts → sinh lại → đo lại (--khong-anh, so số) → soi mắt lại nhóm đã sửa → commit
```
Mỗi vòng: đo số trước (vài giây), chỉ chụp + soi mắt khi số đã ổn. Ảnh không mở trong phiên chính, giao agent.

## 1. File và nơi ở
| Việc | File |
|---|---|
| Bộ chuyển R6 cứng (ngoài repo) | `S:/3appclaude/tools-local/r6-cung.mts` (bản lưu: `r6-cung.bak*.mts`) |
| Retarget nguồn → R6 | `S:/3appclaude/tools-local/retarget-r6.mts bbs\|quaternius [tên,…]` |
| Trang thử (ngoài repo) | nguồn `S:/3appclaude/tools-local/xem/page.html`, dựng bằng `xem/build.mjs <dist> <artifact>` |
| Máy kiểm | `tools/r6-may-kiem.mjs` (điều phối) · `tools/r6-may-kiem/do.mjs` (đo + chụp) · `tools/r6-may-kiem/gop.mjs` (gộp mắt) |
| Kết quả | `output/r6-bobj/<thư-mục>/` : `so.json`, `<tên>.jpg`, `mat-1..3.json`, `mat-tay.json`, `may-kiem.json`, `de-bai-mat.md` |
| Trang | `dist/r6-bobj-test.html` (artifact `17qceasXPUWM7pqJA1vQ3i`) · `dist/r6-may-kiem.html` (artifact `7gdgkkCbwCo7b6a2skaCpH`) |

Chạy TS: `node --import file:///S:/3appclaude/three-workspace-app/editor/packages/builder/node_modules/tsx/dist/loader.mjs <file.mts> …`
(gọi tắt là `$T` bên dưới). Trình duyệt ẩn: `launchBrowser` từ `tools/browser.mjs` (không import playwright trực tiếp).

## 2. Đổi sang bộ 65 động tác — danh sách việc
1. **Nguồn**: có file actions `.bobj` của bộ mới + mô hình chuẩn để so (Steve hoặc nhân vật gốc có khuỷu/gối) + catalog tên Việt/nhóm (`{actions:[{name,vi,nhom}]}`).
2. **Retarget** sang R6: `$T retarget-r6.mts <bộ>` → `assets/r6-bobj/<bộ>/<bộ>-r6-actions.bobj` (+ `kiem-so.json`).
3. **R6 cứng**: `$T r6-cung.mts --eo <vào> <bộ>-r6-eo-actions.bobj` và không `--eo` cho bản thân liền (`-cung-`).
   Dòng in cuối: lệch hướng tối đa, khối chi xoay nhanh nhất (°/tick), số tick đẩy tay, "còn lún".
4. **Trang thử**: sửa `xem/build.mjs` dòng `data = {…}`: `src` (nguồn Steve), `dst`/`dstCung`/`dstEo` (3 bản R6), `catalog`, `kiem`.
   Đổi đường dẫn `may-kiem.json` nếu dùng thư mục kết quả khác. Trang tự lấy danh sách động tác từ file.
5. **Máy kiểm**: `do.mjs` đọc `DSTE` (Gà eo) + `SRC` (Steve) từ trang → không phải sửa nếu trang đã nạp bộ mới.
   Cần sửa nếu nhân vật khác Gà/Steve: hộp nghỉ lấy tự động từ lưới (`hop()`), nhưng `DG`/`DS` (cỡ thân để đo xuyên đầu mút) và
   `K = 0.6/0.375` (tỉ lệ Gà/Steve) là số cứng; tên xương tay/chân (`left_arm`, `low_left_arm.end`, `low_leg_right`…) phải khớp.
6. Chạy `node tools/r6-may-kiem.mjs --out output/r6-bobj/<bộ>-kiem` → giao 3 agent theo `de-bai-mat.md` (lệnh tự ghi) → `--chi-gop --out …`.
   ⚠ `--out` khác thư mục chính thì lệnh chép `may-kiem.json` đè vào `output/r6-bobj/kiem/` (trang thử đọc từ đó).
7. Mắt cũ phải đi cùng số đo: chép `mat-*.json` sang thư mục mới chỉ khi số chưa đổi nhiều; lệnh cảnh báo khi mắt cũ hơn số.

## 3. Máy đo gì (so với Steve, theo tick)
| key | Lỗi | Ngưỡng | Ghi chú |
|---|---|---|---|
| `lun` / `lo` | chân lún / lơ lửng | 0.06 / 0.08 block | đỉnh lưới thấp nhất Gà − Steve |
| `xuyen` | đầu mút tay/chân vào thân | 0.04 | |
| `tayDau` `tayThan` `tayChong` | **khối tay** lún vào đầu / thân / tay kia | 0.05 / 0.06 / 0.05 | lưới 3×3×7 điểm trong khối tay, hộp lõi đối xứng (bỏ mỏ/mào); trừ phần Steve cũng lún ×K |
| `lech` | hướng tay lệch Steve | 35° | chỉ tay (chân cố ý nghiêng về gối) |
| `than` | thân lệch | 25° | |
| `giat` | giật | 30°/tick | chỉ xương Gà cứng; so max(xương trên, xương dưới) của Steve |
| `cham` | hai tay không chạm khi Steve chạm | 0.08 | |
4 khung/động tác = khung tệ nhất của các lỗi nặng + bù đầu/giữa/cuối. **Hạn chế:** lỗi nhiều loại thì khung tệ nhất của vài lỗi không vào ảnh (lần 19/11: 24 key) → agent ghi "khong-ro".

## 4. Soi mắt (agent Sonnet, ≤ 3 cùng lúc)
- Đề chung: `de-bai-mat.md` (thang 0 giống · 1 nhẹ · 2 rõ · 3 hỏng; `may_dung`/`may_sai`/`khong_kiem_duoc`). Chia 3 nhóm `nhom-1..3.txt`.
- Lỗi mới (vd tay lún) → 1 agent riêng, danh sách `tay-ds.txt`, ghi `mat-tay.json` (`"sai"` thì gộp bỏ nhãn, `muc` nâng mức chung).
- Sau khi sửa: agent so **trước/sau** 2 thư mục ảnh, chấm `so_truoc: tot-hon|nhu-cu|te-hon`, và tìm lỗi mới do sửa gây ra.
- Phải nói rõ trong đề: điều gì là THIẾT KẾ (tay cứng chĩa chéo khi Steve co khuỷu; chân nghiêng về gối) để agent không chấm lỗi.
- Agent hay để cờ số chưa bác bỏ vào `may_dung` thay vì `may_sai` → nhãn vẫn hiện; ghi rõ trong đề.

## 5. Bài học khi sửa (đã thử — đừng thử lại)
- **Đầu mút Gà cứng** đo theo XƯƠNG TRÊN (`P(left_arm, tail(low_left_arm.end))`), không qua xương `low_*` (khối chỉ gắn xương trên) → trước đó báo nhầm hàng loạt.
- **Xoắn lật 100–130°/tick** do nguồn → chống xoắn: vận chuyển song song qT từ tick trước, cuối động tác kéo dần về xoắn gốc (`--khong-chong-xoan` tắt).
- **Gối**: chân cứng ngắn hơn hông→bàn chân thì nghiêng về gối. Bản gối nằm ngang → lật 178°/tick (bỏ). Bật cứng theo độ cao → giật; dùng smoothstep theo độ cao bàn chân 0.05–0.3 (`--khong-goi` tắt). Cưỡi/ngồi ghế: chân trên không giữ chĩa thẳng.
- **Đẩy tay khỏi đầu/thân** (`--khong-day`, biến `DAY_SAU=0.04` `DAY_MAX=30` `DAY_CHAM=0.6`):
  - Đẩy hết lún (0.005, không giới hạn góc) → `lech` 1→37 động tác. Giới hạn 30°, chỉ đẩy khi > 0.04.
  - Xoay tay quanh vai ra xa TÂM khối → tách hai tay đang vỗ (`cham` 10→15). Xoay theo mặt gần nhất → thân đẩy xuống, tay quay trong mặt phẳng trước, vẫn tách.
  - Cách đang dùng: **dời điểm bàn tay** theo hướng thoát (thân: ra trước/sau về phía bàn tay; đầu: mặt gần nhất) rồi chĩa tay tới đó; giữ đỉnh ±2 tick, mượt ±3 tick.
  - **Giới hạn hình học:** vai Gà ±0.6, tay dài 0.62, ngực tới z=0.25 → không thể vỗ tay trước ngực mà không lún. Hai bàn tay gốc gần nhau (< 0.6) thì không đẩy (áp cả sau làm mượt, nếu không độ mượt lan đẩy vào tick vỗ).
  - Kết quả: lún đầu 17→8, thân 31→18 động tác; 7 ca rõ còn 1 (crying — hai tay che mặt).
- Mỗi lần đổi tham số: sinh lại 1 bản (`--eo` bbs) + `r6-may-kiem.mjs --khong-anh --out …-thu` rồi so `so.json` hai thư mục bằng `node -e` (đếm số động tác mỗi key, điểm tổng). Mẫu: `bash tools/r6-may-kiem/day-thu.sh <DAY_SAU> <DAY_MAX>` (so với `kiem-tay`; sửa đường dẫn cho bộ mới).

## 6. Kết quả bộ 84 động tác (19/11)
20 ổn · 63 khác nhẹ · 1 lỗi rõ (emote_squat_kick). Còn khác nhẹ chủ yếu do tay cứng chĩa tới bàn tay khi Steve co khuỷu (giới hạn thiết kế).
Commit: `b23b725` (gối + chống xoắn) · `d0e387c` (gói lệnh) · `a7a10ce` (đo tay lún) · `5f80692` (đẩy tay).

## 7. Trang thử — tính năng (đều bật/tắt được)
Ô ghi chú lỗi mỗi động tác (lưu artifact db `ghi-chu`, dự phòng localStorage, nút "Chép mọi ghi chú") · nhãn "máy bắt" ·
"Tất cả dáng (xếp ngang)" Steve + 3 kiểu Gà · hàng thẻ động tác dính dưới khung 3D + nút ⏮ ⏭ (theo bộ lọc) · khung 3D cố định, phần dưới cuộn.
Đọc ghi chú người dùng: ArtifactData `list` collection `ghi-chu` trên artifact trang thử.
