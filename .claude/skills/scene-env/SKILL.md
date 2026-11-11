---
name: scene-env
description: Dựng môi trường/bối cảnh 3D (thị trấn, rừng, biển, sa mạc, tuyết, núi mây, đảo, nội thất) cho shot three.js theo phương pháp make-map của fwjelaa — kế hoạch 5 dòng, xây theo pha, ánh sáng/bầu trời theo "family" phong cách, QA bằng ảnh chụp các góc shot và ngân sách hiệu năng. Dùng khi tạo hoặc sửa env trong engine/envs/<tên>.js (mỗi bối cảnh 1 file) hay town.js.
---

# Môi trường (three.js) — phương pháp make-map của fwjelaa

Gốc: `skills/fwjelaa/maps/CLAUDE.md`, `styles/simulator.md` (phong cách khối sáng màu = gần nhất với phim),
`styles/nature.md`, `.claude/skills/make-map/qa.md` (trong gói). Không có Roblox Studio → dựng bằng three.js. Method by fwjelaa (FWJ STUDIOS).

1. **Kế hoạch 5 dòng**: chủ đề + giờ trong ngày; bố cục (vùng chính, lối đi, điểm nhìn); bảng màu hex; ánh sáng/bầu trời/sương;
   danh sách đạo cụ + mật độ rải (seed).
2. **Xây theo pha**: địa hình (mặt đất/nước) → khối lớn (nhà, núi) → đạo cụ vừa → rải chi tiết (cây, đá, cỏ — InstancedMesh, seed cố định) → ánh sáng + sương + bầu trời.
3. **QA**: chụp từ đúng các góc camera của shot dùng env đó (`tools/peek.mjs`), chấm theo rubric qa.md: đọc được chủ thể,
   chiều sâu (tiền/trung/hậu cảnh), không khoảng trống/lỗ, đường chân trời, màu khớp tham chiếu. Ít nhất 2 vòng.
4. **Ngân sách**: < 300k tam giác hiển thị/khung, < 150 draw call, bóng đổ chỉ quanh điểm nhìn (stage.shadowFocus).
