# model-test: đưa vật liệu/texture/bóng 3JS về giống Roblox Studio

## ĐIỂM DỪNG (ghi đè mỗi lần cập nhật)
- Mục tiêu người dùng: thứ nhìn thấy trong Roblox (màu, vân, bóng) phải thể hiện tương đương bên 3JS. Luật ưu tiên: **dùng texture** trong mọi model đã duyệt.
- Đã chốt (2026-11-16): vân Enum.Material lấy từ **Poly Haven CC0 (tileable)**, không chụp từ Studio.
- Đã xong: so sánh Studio/3JS 10 mẫu (`dist/model-test_so-sanh.html`, tool `tools/model-test-trang.mjs`); sửa khâu nhập: Ball lệch trục, chốt chặn mảnh lớn + `--bo-manh-lon`, Neon emissive, Glass trong suốt (commit d68bf31). Hướng trục GLB đã đo: trùng Roblox, không đổi.
- Đã xong 16/11: (1) đo màu: GLB khớp Color3 part, không lỗi nhập; lệch màu là ánh sáng. (2) bảng `VAN_PH` 14 enum → vân Poly Haven trong `roblox_ghep.py` (cờ `--khong-van`), manifest+CREDITS đã ghi; số trước/sau ở `output/model-test/bao-cao.md`.
- Đã xong 16/11 giai đoạn (3): ánh sáng trang test khớp Studio, sai số ảnh 17,77 → 13,44 (số + tham số chốt trong `output/model-test/bao-cao.md`, mục Giai đoạn 3; đề xuất cho `engine/stage.js` chưa áp). Dò bằng `output/_tmp/ls-opt.mjs` (không vào git), ảnh Studio chụp lại `output/model-test/studio-ls/`.
- Chưa làm (theo thứ tự, CHỜ DUYỆT; chỉ còn phần 4): (3) hiệu chỉnh mặt trời/ambient/tone mapping/bóng bằng thẻ xám so số với Studio (ClockTime 14,5); (4) sau đó: Decal chiếu lên mặt không phải hộp, Union lấy lưới thật, quầng Neon.
- Đạt khi (giai đoạn 1–2): chênh màu trung bình ảnh cận cảnh dưới ngưỡng, vân hiện đúng loại vật liệu trên 10 mẫu. Giai đoạn 1–3 ĐÃ XONG, chờ duyệt để làm 4 (và duyệt đề xuất stage.js).
- Cẩn thận: không đổi file nào trong `assets/nhap`; test `node --test tools/tests/roblox.test.mjs tools/tests/npc-roblox.test.mjs` phải pass; commit bằng pathspec, không push; vân Poly Haven phải ghi nguồn + giấy phép vào manifest/CREDITS.
- Studio (MCP Roblox_Studio): place riêng tư placeId 96550664764157, id phiên đổi mỗi lần kết nối (gọi `list_roblox_studios`). KHÔNG lưu place này: đã xoá 14 đối tượng Sky trong Lighting để thử sky anime (82390108122526 = engine sky-6).
- Ảnh kiểm: chỉ ở `output/model-test/`; chụp Studio bằng agent Haiku (copy ảnh ra đĩa, không đưa vào phiên chính); nhìn ảnh bằng agent Sonnet.

## File quan trọng
- `tools/blender/roblox_ghep.py` (ghép GLB, `CUR_MAT`, `vat_lieu()`), `tools/roblox.mjs`, `docs/roblox.md` mục 4.
- `episodes/_model-test/index.html` (+ `studio-bbox.json`, `glb/`): `node tools/look.mjs episodes/_model-test/index.html --shots all --full --out output/model-test/3js`.
- `output/model-test/`: `danh-sach.json`, `studio-bbox.json` (camera cận cảnh), `3js-info.json`, `nhan-xet.json`, `de-xuat.json`, `bao-cao.md`, `truoc/`, `studio/`, `3js/`; script đo tạm `output/_tmp/mt-info.mjs`.
- Dữ liệu part gốc: `.cache/roblox/<id>/dump.json` (màu, material enum, CFrame).
- Số: Studio Enum.Material: Plastic 256, SmoothPlastic 272, Neon 288, Wood 512, Slate 800, Concrete 816, Brick 848, Metal 1088, Grass 1280, Glass 1568.
