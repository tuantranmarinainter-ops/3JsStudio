---
name: scene-env
description: Dựng môi trường/bối cảnh 3D (thị trấn, rừng, biển, sa mạc, tuyết, núi mây, đảo, nội thất) cho shot three.js theo phương pháp make-map của fwjelaa — kế hoạch 5 dòng, xây theo pha, ánh sáng/bầu trời theo "family" phong cách, QA bằng ảnh chụp các góc shot và ngân sách hiệu năng. Dùng khi tạo hoặc sửa env trong engine/envs/<tên>.js (mỗi bối cảnh 1 file) hay town.js.
---

# Môi trường (three.js) — phương pháp make-map của fwjelaa

Gốc: `skills/fwjelaa/maps/CLAUDE.md`, `styles/simulator.md` (phong cách khối sáng màu = gần nhất với phim),
`styles/nature.md`, `.claude/skills/make-map/qa.md` (trong gói). Không có Roblox Studio → dựng bằng three.js. Method by fwjelaa (FWJ STUDIOS).

0. **Pha 0 — khối xám từ danh sách mốc** (khi bối cảnh đã có `boi-canh/<id>.json` theo `.claude/skills/xu-ly-kich-ban/khuon-boi-canh.md`; bỏ qua nếu chưa có file mốc):
   - Chạy `node tools/khoi-xam.mjs boi-canh/<id>.json --out output/<ep>-khoi-xam` → ra 8 ảnh `<id>_<hướng>.png` (9:16; truoc, sau, trai, phai, tren-xuong, duoi-len, thang-mat, ngang-hong) và in danh sách mốc **không đọc được số** (thiếu trục x/y/z). Mốc nào bị liệt kê thì sửa `vung` trong file mốc cho đủ số (không đoán), rồi chạy lại.
   - Người dùng duyệt 2 ảnh (bố cục, tỉ lệ so với hình nộm 5,48). Xem ảnh bằng agent phụ khi chỉ cần kết luận. CHƯA được duyệt thì không dựng chi tiết.
   - Sau khi duyệt mới dựng `engine/envs/<tên>.js`. **Mọi số đo (vị trí, kích thước, số ô kính, chỗ chừa trống) lấy từ file mốc — không bịa, không "ước" lại.** Số nào file không có thì quay lại sửa file mốc rồi mới dựng. Ảnh khối xám này cũng là ảnh Codex vẽ chồng lên (trạm 8): cấm đổi hình khối sau khi duyệt.
1. **Kế hoạch 5 dòng**: chủ đề + giờ trong ngày; bố cục (vùng chính, lối đi, điểm nhìn); bảng màu hex; ánh sáng/bầu trời/sương;
   danh sách đạo cụ + mật độ rải (seed).
2. **Xây theo pha**: địa hình (mặt đất/nước) → khối lớn (nhà, núi) → đạo cụ vừa → rải chi tiết (cây, đá, cỏ — InstancedMesh, seed cố định) → ánh sáng + sương + bầu trời.
3. **QA**: chụp từ đúng các góc camera của shot dùng env đó (`tools/look.mjs <trang> --shots … / --t …`), chấm theo rubric qa.md: đọc được chủ thể,
   chiều sâu (tiền/trung/hậu cảnh), không khoảng trống/lỗ, đường chân trời, màu khớp tham chiếu. Ít nhất 2 vòng.
4. **Ngân sách**: < 300k tam giác hiển thị/khung, < 150 draw call, bóng đổ chỉ quanh điểm nhìn (stage.shadowFocus).
