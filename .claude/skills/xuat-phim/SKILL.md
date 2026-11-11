---
name: xuat-phim
description: Gộp một tập thành file HTML duy nhất có nút "Xuất MP4" (2K/1080p/4K, render bằng GPU máy người dùng), kiểm tra khung + xuất thử, rồi giao link file. Dùng BẤT CỨ KHI NÀO người dùng nói "xuất video", "ra file HTML", "gộp lại", "cho link", "render", "xuất MP4", "làm xong rồi gửi tôi", hoặc sau khi sửa shot/engine/giọng cần cập nhật bản HTML — kể cả khi họ không nhắc tên skill.
---

# Xuất phim — một file HTML, render trên máy người dùng

Người dùng đã chốt: **KHÔNG render qua cloud / GitHub Actions**. Sản phẩm là `dist/<ep>.html` tự chứa; họ mở bằng
Chrome/Edge, bấm **⬇ Xuất MP4**, GPU máy họ (12 GB VRAM) làm việc nặng (cả tập 2K ~45 s).
**Làm xong luôn phải đưa link file HTML** (đường dẫn Windows + `file:///…`) và mở sẵn bằng reveal.

## Quy trình
1. Kiểm repo: `node tools/doctor.mjs ep001` → sửa mọi ✘ (asset thiếu, shot hở frame, nhịp tiếng Anh lệch cú cắt,
   tiến trình treo `--fix-procs`). `bash tools/branches.sh --fetch` khi nghi phiên cloud đã push thứ gì chưa gộp.
2. Gộp: `npm run bundle:ep001` (= `node tools/bundle.mjs ep001`). Bộ gộp mở trang qua Chrome, ghi mọi file tải lúc init
   (GLB, texture, JSON) + nhúng phông `@font-face`, audio `<audio src>`, giọng trong `voices/index.json` → base64.
3. Kiểm khung (skill `kiem-tra-khung`): tối thiểu `node tools/look.mjs dist/ep001.html --t <các mốc vừa sửa> --ab episodes/ep001/index.html`.
4. Xuất thử: `node tools/export-test.mjs dist/ep001.html --range a:b --matrix "lang=vi,en;subs=1,0;voice=1,0"` → `report.md` phải 100% OK.
5. Giao: reveal `S:\3JS Studio\dist\ep001.html`, ghi link `file:///S:/3JS%20Studio/dist/ep001.html`, nói rõ đã kiểm gì / chưa kiểm gì.

## Hợp đồng trang tập (index.html) mà nút xuất cần
- `window.__ready`, `window.renderAt(t)` (thuần theo t), `window.__stage` (renderer để đổi pixel ratio), `#root[data-width|height|fps|duration]`.
- Tuỳ chọn người xem qua `window.getOptions()/setOptions({lang, vid, subs, voice, fx})`; `#cap` là phụ đề DOM (nút xuất vẽ lại lên canvas).
- `window.__post` (engine/post.js) có `resize()` — gọi sau khi đổi pixel ratio.
- **Mọi tính năng mới phải là tuỳ chọn bật/tắt** trong trình phát (tools/export-ui.js) và áp dụng cho cả xem lẫn xuất.

## Bẫy đã gặp
- Bộ gộp chỉ ghi file tải LÚC INIT; file chỉ tải khi người xem chọn (giọng) phải thêm thủ công (đã làm cho voices/index.json).
- `</script` trong JS nhúng phải escape; CSS `url()` không qua lớp chặn fetch → bộ gộp đổi thành data URI.
- Hàm/hằng khai báo dưới lời gọi `init()` trong module → lỗi TDZ sau khi minify ("x is not a function"): gọi init ở cuối file.
- Trình duyệt trong app không mở được `file://` → mở bằng Chrome: `cmd /c start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" "file:///…"`.
- `navigator.webdriver` (Playwright) ẩn giao diện; thêm `?ui=1` để test UI.
