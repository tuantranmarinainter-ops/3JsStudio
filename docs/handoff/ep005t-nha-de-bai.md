# Đề bài: ep005t — dựng khung + bố cục bối cảnh, nhóm NHÀ (chạy trên Sonnet)

Dán vào phiên mới: "Đọc docs/handoff/ep005t-nha-de-bai.md rồi làm."

## Bối cảnh
- Repo `S:\3JS Studio`, nhánh `ep1-v2` (KHÔNG đổi nhánh). Tập test ep005t mới có `kich-ban/ep005t/` (ảnh Codex vẽ ở `tham-chieu/`, 8 file mốc `boi-canh/<id>.json`); CHƯA có `episodes/ep005t`.
- Người dùng đã DUYỆT XONG asset: `output/thu-vien-asset/ket-qua/ket-qua_2026-11-16T05-07-45-220Z.json` (54 món, 57 mẫu, đã `nhan`). KHÔNG tìm/duyệt lại, chỉ nhập.
- Người dùng chốt thứ tự: **dựng khung và bố cục trước; shot và camera làm sau.**

## Làm
Đọc `CLAUDE.md`, `docs/roblox.md` (mục 1, 4, 5, 7), `docs/nhap-model.md`. Chỉ nhóm NHÀ (muc="nha": water-tank, town-house, house, mai-hien, cua-hang-xanh, victorian-house, two-story-house, thap-nuoc, wooden-cabin, san-go, cua-ra-vao, cua-so). Không làm NỘI THẤT / ĐỒ DÙNG / TRỜI.

0. Kiểm điều kiện, thiếu thì DỪNG báo: `.env.local` có `ROBLOX_API_KEY`, `BLENDER` (5.1.2; không in/ghi khoá); `tools/sky-extract/bin/sky-extract.exe`; python + PIL. ≤ 40 request Open Cloud mỗi lần tải, `roblox.mjs xem <id>` trước. Model không đạt ngưỡng low poly thì DỪNG hỏi.
1. **Khung**: `episodes/ep005t` tối thiểu (`episode.js`, `index.html` từ tập mẫu, `envs` mỗi bối cảnh 1 file trong `engine/envs/`), chỉ đủ mở từng bối cảnh trong studio. **CHƯA tạo `shots.js` thật và camera**: để 1 shot trống/khung xem tự do mỗi bối cảnh.
2. **Bố cục**: đặt khối và model theo `boi-canh/<id>.json` (vùng x/y/z, màu); nhập mẫu nhóm NHÀ vào kho (`assets/nhap` + `manifest.json`: nguồn, tác giả, giấy phép), thay vào env bằng builder chung, ô FX bật/tắt (`?rb=0` vẫn về bản khối). Luật vân: vật thiếu vân thì báo, không tự chọn.
3. **Kiểm**: `node tools/nhap-model.mjs kiem` thoát 0; chụp A/B (khối | có model) cố định 8 hướng của `HUONG_BOI_CANH`, ghép lưới ~800 px vào `output/ep005t-nha/`. Không dán ảnh vào chat; xem bằng mắt giao agent phụ Haiku/Sonnet trả kết luận chữ. Chỉ chạy test của phần mình sửa.

Đạt khi: `nhap-model kiem` thoát 0, `?rb=0` về bản khối, có ảnh lưới A/B từng bối cảnh nhóm NHÀ.
Dừng khi: xong nhóm NHÀ (không shot, không camera, không nhóm khác).

Commit chỉ file mình sửa (không `kich-ban/ep005t`, `output/`, `dist/`, `.env.local`). Ghi báo cáo `docs/handoff/ep005t-nha.md` (mở bằng khối ĐIỂM DỪNG theo `docs/handoff/_mau.md`). Trả về: đường dẫn đã ghi, ≤ 5 gạch đầu dòng kết luận kèm file:dòng, mục bị chặn.
