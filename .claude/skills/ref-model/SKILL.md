---
name: ref-model
description: Dựng model/đạo cụ bằng code three.js (engine/*.js) từ ảnh/frame tham chiếu theo phương pháp picture-to-model của fwjelaa — đo silhouette, tỷ lệ, bảng màu hex, so cạnh nhau và lặp tới khi khớp. Dùng khi cần nhà, nhân vật, đạo cụ (tủ lạnh, hải đăng, tàu, cánh cụt, cá voi…) giống một hình tham chiếu.
---

# Model từ ảnh (three.js) — phương pháp fwjelaa

Gốc: `skills/fwjelaa/picture-to-model/CLAUDE.md` (Blender, metaball, bake). Ở đây không có Blender → dựng bằng
primitive three.js (Box/Cylinder/Extrude/Lathe + texture canvas), giữ phong cách khối. Method by fwjelaa (FWJ STUDIOS).

1. **Lấy ảnh**: frame tham chiếu ở `refs/<id>/frames/Fxxxx.jpg` (chọn frame thấy rõ chủ thể, chính diện và 3/4).
2. **Nghiên cứu trước khi code** — ghi ra: silhouette + tỷ lệ (đo bằng pixel trên ảnh: cao/rộng từng khối), mọi màu
   dạng hex (lấy mẫu bằng PIL), chi tiết nhận diện (mũ, khăn, cửa vòm…), mặt sau có thể trông thế nào.
3. **Viết builder** trong `engine/<asset>.js`, tên rõ cho từng bộ phận (`door_left`, `leg_FL`…), đơn vị stud
   (người R6 cao 5.2), mặt trước nhìn +Z.
4. **Lặp tới khi khớp**: chụp cùng góc với ảnh (`tools/peek.mjs` + `&cam=…&look=…&fov=…`), ghép cạnh ảnh gốc
   (`tools/compare.py`), sửa khác biệt lớn nhất trước: silhouette > tỷ lệ > màu > chi tiết. 5–10 vòng; đừng dừng ở "gần giống".
5. Ngân sách: ≤ 20k tam giác / model; dùng InstancedMesh cho vật lặp.
6. Ghi asset vào `assets/manifest.json` nếu là file ngoài; asset dựng bằng code ghi chú trong README tập.
- Texture nhân vật tuỳ chọn: chỉ file có trong assets/textures/index.json ("files") mới được tải; thêm PNG rồi thêm tên vào index.json (engine/r15.js loadCharacterTextures).
