# HANDOFF — cảnh nhẹ + môi trường kiểu Painted Valley (2026-11-12, nhánh `ep1-v2`, CHƯA push)

Đọc `CLAUDE.md` + `docs/core.md` (mục Gió chung… / Bóng mây / Rừng xa / Núi xa) trước. Người dùng nói tiếng Việt.
Mỗi tính năng mới phải có ô bật/tắt; xong việc luôn đưa link `dist/*.html`; duyệt trước rồi mới gộp; không push khi chưa bảo.

## Mục tiêu
Cảnh mở nhanh (ít program shader) và đẹp hơn, học cách làm của game Painted Valley (patch.gg/blendi/painted-valley, mã MIT):
mọi vật dùng chung 1 khối uniform gió/nắng/sương, noise làm sẵn thành texture, vật xa vẽ 1 lần, 1 program cho mỗi loại.

## Đã xong (commit)
- 270cd4b: mở trang 29 s → ~13 s (chất liệu 1 họ 150→31 program, grunge 1 khoá, biên dịch trước theo bối cảnh, đèn cố định, ô lite), `tools/shaders.mjs`.
- 21c7d48: `engine/wind.js` (gió chung, GLSL `gustAt` + bản CPU khớp GPU), `engine/grass.js` (cỏ theo hash ô, 3 vòng LOD, 1 program,
  `setPushers` cỏ rạp quanh chân, `lightFrom` trong onBeforeRender), `engine/sway.js` (cây dừa đung đưa trên CPU), gắn **island**.
- ecbaac9: `engine/cloudshade.js` + `cloudOpen` trong wind.js — bóng mây trôi trên cát/bãi cỏ island, đêm tự tắt.
- e901532: `engine/farwoods.js` — rừng xa thẻ ảnh vẽ quay camera (2600 cây, 1 program), gắn **town**.
- 3c9be25: `engine/backdrop.js` — núi xa vẽ 1 lần thành dải tranh 3 lớp, đổi ngày/đêm không vẽ lại, gắn **town**.
- Ô FX mới (engine/post.js): `grass`, `sway`, `cloudShade`, `farwoods`, `backdrop`.
- Trang thử (gộp 1 file mở bằng file://: `node tools/lab1file.mjs engine/<x>-lab.html dist/<x>-lab.html`):
  `grass-lab`, `sway-lab`, `farwoods-lab`, `backdrop-lab` (`?light=day|dusk|night`).
- Bản xem thử mới nhất: `dist/ep1_v6.html`.

## Việc còn lại (theo thứ tự)
1. **Chốt hướng chất liệu đất/đá/gỗ**: người dùng chưa trả lời. Trang so 3 cột `engine/mat-lab.html` (hiện tại | ảnh CC0 Poly Haven | nướng vân),
   ảnh `output/look/matlab/{near,far}/`. Đề xuất: ảnh CC0 512 WebP cho đá, đất, gỗ, ngói, cát (8 bộ ≈ 1,2 MB); giữ shader cho kim loại gỉ;
   thay bộ vải kẻ ô `fabric_pattern_05` bằng vải trơn. `assets/polyhaven-tex/`, manifest, CREDITS **chưa commit**.
2. Hoa trong cỏ (mở rộng grass.js, cùng hash ô + gió).
3. Gắn rừng xa / núi xa / cỏ cho bối cảnh khác (forest, brazil, mountain…) nếu người dùng muốn.
4. Dãy núi xa còn phẳng màu; vạch sáng mảnh ở chân trời (sương mặt đất).
5. Kiểm cả phim 1 lần: `node tools/look.mjs episodes/ep001/index.html --shots all --det`.
6. Tồn từ trước: Xuất MP4 chậm (5m27 so với 1m17); `tools/shaders.mjs` cho cả phim; tách `materials.js` thành `engine/shaders/<họ>.js`
   + `episodes/<ep>/shaders.json` để mỗi tập chỉ nạp họ nó dùng (`engine/shaders/registry.js`, `docs/shaders.md`).

## Lưu ý
- Phiên [ep001-sky-storm] cùng thư mục cũng sửa `engine/envs/island.js`, `town.js`, `post.js`, `fx.js` → chỉ Edit đoạn nhỏ, không ghi đè cả file;
  commit chỉ phần của mình (`git diff --word-diff=porcelain` để kiểm).
- Đèn của shot đặt SAU `env.update` → lấy ánh sáng/sương trong `mesh.onBeforeRender` (không dùng đèn khung trước).
- Không commit `episodes/ep001/voices/vi/multi_female_yangguangnv_uranus_bigtts.ogg`.
