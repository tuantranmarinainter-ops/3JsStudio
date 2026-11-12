# Bảng vật liệu (sinh ra từ `engine/materials.js` — đừng sửa tay)

Sinh lại: `node tools/vat-lieu-doc.mjs`. Đạo cụ **khai báo** loại vật liệu của nó (xem dưới) thay vì để `classifyMaterial` đoán từ màu/tên.
Bộ kiểm luật L9 chỉ đo vật có vai gần nhất là `vat-chinh` / `nha` / `chan-nha` / `doc` và đòi `nguon = khai-bao`; loại ở cột "grunge" = *không* thì lớp bụi/cũ (`engine/grunge.js`) không phủ lên.

| kind | tên | họ shader | grunge | trạng thái |
|---|---|---|---|---|
| `wood` | Gỗ mộc | all | được | da-duyet |
| `woodpaint` | Gỗ sơn | all | được | da-duyet |
| `bark` | Vỏ cây | all | được | da-duyet |
| `paper` | Giấy | all | được | da-duyet |
| `fabric` | Vải | all | được | da-duyet |
| `knit` | Len đan | all | được | da-duyet |
| `hair` | Tóc | all | được | da-duyet |
| `skin` | Da | all | không | da-duyet |
| `carpaint` | Sơn xe bóng | all | không | da-duyet |
| `chrome` | Kim loại mạ | all | không | da-duyet |
| `metalpaint` | Sắt sơn (tróc, gỉ) | all | không | da-duyet |
| `iron` | Sắt trần | all | không | da-duyet |
| `plastic` | Nhựa thật (nam châm, đồ chơi) | all | được | da-duyet |
| `rubber` | Cao su | all | được | da-duyet |
| `glass` | Kính | all | không | da-duyet |
| `enamel` | Men / sứ | all | không | da-duyet |
| `tile` | Gạch men | all | được | da-duyet |
| `fruit` | Vỏ trái cây | all | được | chua-duyet |
| `coconut` | Xơ dừa | all | được | da-duyet |
| `shingle` | Ngói / tấm lợp | all | được | da-duyet |
| `brick` | Gạch | all | được | da-duyet |
| `plaster` | Tường vữa | all | được | da-duyet |
| `concrete` | Bê tông | all | được | da-duyet |
| `asphalt` | Nhựa đường | all | được | da-duyet |
| `roadpaint` | Sơn kẻ đường | all | được | da-duyet |
| `stone` | Đá | all | được | da-duyet |
| `sand` | Cát | all | được | da-duyet |
| `soil` | Đất | all | được | da-duyet |
| `grassground` | Cỏ (nền) | all | được | da-duyet |
| `foliage` | Lá | all | được | da-duyet |
| `cactus` | Xương rồng (sáp) | all | được | da-duyet |
| `snow` | Tuyết | all | được | da-duyet |
| `ice` | Băng | all | được | da-duyet |
| `coral` | San hô | all | được | da-duyet |
| `shell` | Vỏ cứng (cua, sò) | all | được | da-duyet |
| `feather` | Lông vũ | all | được | da-duyet |
| `fur` | Lông thú | all | được | da-duyet |
| `whale` | Da ướt (cá voi) | all | được | chua-duyet |
| `organic` | Hữu cơ (nấm) | all | được | da-duyet |
| `matte` | Mờ chung (mặc định) | all | được | da-duyet |
| `leather` | Da thuộc (găng, ủng) | all | được | da-duyet |

## Cách khai báo

- Theo vật liệu: `M(color, { kind: 'chrome' })` (engine/props.js, engine/house.js) hoặc `khaiBaoMat(material, kind)` — đặt `userData.matDecl` + `matNguon = 'khai-bao'`.
- Theo mesh: `khaiBao(root, [[/regex tên mesh/, kind], …])` — đặt `userData.matKind` + `matNguon` trên mesh, trả về danh sách mesh chưa khai báo.
- `kind = 'none'` nghĩa là giữ nguyên vật liệu gốc (không vân, không nhám/kim loại chồng lên); vẫn tính là khai báo.
- `KHONG_GRUNGE` (materials.js) là nguồn duy nhất của danh sách cấm grunge; `tools/kiem/mac-dinh.json` `L9.camGrunge` phải khớp (có test).
- Ưu tiên khi phân loại: tag trên mesh > khai báo trên vật liệu > luật đoán `MAT_RULES` (`matNguon = 'doan'`).
