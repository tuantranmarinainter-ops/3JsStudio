# Màu nhà thị trấn (engine/town-styles.js + engine/town.js)

Mỗi nhà Kenney một màu có chủ đích, tất định theo seed. **TẮT mặc định**: tập nào không khai thì hình không đổi một điểm ảnh.

## Bật
- `EPISODE.town = { blocks: 3, kieu: 'pastel' }` hoặc thử nhanh `?nha=pastel` (không cần sửa episode.js).
- Bảng: `pastel` (tươi vui) · `ven-bien` (trắng–xanh–cam đất) · `lang-go` (gỗ ấm) · `pho-cu` (gạch đỏ–xám) · `tuyet` (lạnh nhạt).
- Nhà có vai (tiệm, thị trưởng…): `vai: ['bakery','tailor','mayor','bearshop']` (hoặc `?vai=bakery,tailor`). Mặc định chỉ `home`, `shop`.
  Mỗi vai lấy 1 nhà: `home`/`shop` = nhà đó của town.js; vai khác = nhà gần `places.street` nhất chưa có vai;
  ép nhà bằng `nhaViTri: { bakery: 'house7' }`. Vai chưa khai màu → màu NHẤN riêng của bảng (không nằm trong bảng tường thường → nổi hẳn hàng xóm).
- Khai màu tay: `nha: { bakery: { tuong: '#f2b53d', mai: '#9a4a38', vien?, cua? } }` (thiếu trường nào bảng tự chọn).

## Cách đổi màu (không nhân bản ảnh)
GLB nhà = 1 mesh + 1 vật liệu `colormap` (ảnh 512², ô 64×128: nửa trái phẳng, nửa phải dốc sáng→tối). Mỗi loại GLB phân tích 1 lần
(`phanTichHinh`): tam giác → ô màu → vai trò TƯỜNG (ô trắng) / MÁI (ô xanh; cụm xám đá lớn không chạm đất = mái phẳng/tầng trên) /
VIỀN (cụm xám đá nhỏ = khung cửa sổ) / CỬA (ô xám tối). Đế, kính, bụi cây, lối đi giữ nguyên. Đỉnh vai trò được dời UV sang ô trắng
(giữ độ dốc sáng) + màu đỉnh = màu đích. Hình học dùng chung, mỗi nhà chỉ thêm 1 thuộc tính `color`; MỘT vật liệu `vertexColors` chung
→ thêm tối đa vài program. `applyGrunge`/`applyMaterials` vẫn chạy (tên vật liệu/mesh giữ nguyên). Hằng bù `BU` trong town.js
(tường tăng bão hoà ×1.3, mái ×1.45 sáng) vì grade + ánh sáng làm màu tối/nhạt.

## Quy tắc gán (`ganMau`)
- Băm số nguyên `bam(seed, idx, k)`, không Math.random; không dùng R() của town.js → bố cục không đổi.
- Hàng xóm (cách < 52 stud theo XZ) không trùng tường và không trùng cặp tường+mái; không tường nào > 28% số nhà (trọng số giảm theo số lần dùng).
- Cặp tường–mái: chênh sáng ≥ `tpMin`, không cùng tông sặc sỡ (lệch sắc < 28°), không nằm trong `cam`. Mỗi nhà lệch sáng ±5% (viền ±3%).
- Test: `node --test tools/tests/town-styles.test.mjs`. Thông tin gán: `globalThis.__nhaInfo` (trang) / `town.nha`.

## Chưa làm (đề xuất)
- Đèn cửa sổ ban đêm (~40% nhà theo seed): cần ô kính riêng có emissive (ô (5,1) đã tách được) + `setNight` của town.js đang rỗng.
- Đổi loại nhà theo seed hiện đã có (town.js `pick(HOUSES)`); chưa đụng để không phá camera.
