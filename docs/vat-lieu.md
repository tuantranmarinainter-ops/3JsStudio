# Bảng vật liệu (sinh ra từ `engine/materials.js` — đừng sửa tay)

Sinh lại: `node tools/vat-lieu-doc.mjs`. Đạo cụ **khai báo** loại vật liệu của nó (xem dưới) thay vì để `classifyMaterial` đoán từ màu/tên.
Bộ kiểm luật L9 chỉ đo vật có vai gần nhất là `vat-chinh` / `vat-phu` / `nha` / `chan-nha` / `doc` và đòi `nguon = khai-bao`; loại ở cột "grunge" = *không* thì lớp bụi/cũ (`engine/grunge.js`) không phủ lên.

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

## Đề xuất đổi loại (chờ người dùng duyệt)

Khai báo hiện giữ đúng loại luật đoán cũ để hình ep001 không đổi (chỉ kim loại/kính mất grunge). Các loại dưới đây hợp vật thật hơn nhưng làm đổi hình; chỉ đổi khi được duyệt. Nguồn: `MAT_DE_XUAT` trong `engine/materials.js`.

| vật | loại hiện tại | loại đề xuất | shot ảnh hưởng |
|---|---|---|---|
| mailbox: post, post_foot, post_arm, post_brace | `metalpaint` | `wood` | s028 s030 s047 s048 s081 s082 |
| mailbox: box_rib, door_handle, door_hinge, flag_pin | `metalpaint` | `chrome` | s028 s030 s047 s048 s081 s082 |
| mailbox: house_number | `metalpaint` | `enamel` | s028 s030 s047 s048 s081 s082 |
| hải đăng GLB: door-mesh | `metalpaint` | `wood` | s088 s104 s105 s106 s107 s108 s109 s110 s113 s116 s117 s126 s127 s128 |
| hải đăng props (K.lighthouse, không dùng trong ep001): door / window | `metalpaint` | `wood / matte` | (không có trong ep001) |
| tàu props (K.ship, không dùng trong ep001): hull, hull_stripe / cabin / mast, mast2 | `metalpaint / wood / matte` | `woodpaint / woodpaint / wood` | (không có trong ep001) |
| chồng thiếp: bow_loop, bow_tail, bow_knot (nơ) | `paper` | `fabric` | s107 s108 s110 s111 s112 s116 |
| nhà: cụm window_front (khung, thanh giữa, bậu, cánh chớp) | `glass` | `woodpaint` | s001 s003 s004 s005 s007 s008 s009 s011 s012 s013 s014 s015 s016 s017 s018 s019 s020 s028 s030 s035 s036 s039 s040 s041 s042 s043 s044 s045 s047 s048 s049 s050 s051 s053 s054 s055 s056 s058 s059 s080 s081 s082 s092 s093 s094 s095 s096 s097 s098 s099 s105 s114 s115 s119 s130 s131 s132 s133 s134 s135 s136 s137 |
| nhà: kính cửa sổ bên/sau + kính ô cửa tròn của cửa (đổi sang glass thì các kính này sẽ SÁNG đèn đêm; hiện luôn tối) | `woodpaint` | `glass` | s001 s003 s004 s005 s006 s007 s008 s009 s011 s012 s013 s014 s015 s016 s017 s018 s019 s020 s030 s035 s036 s039 s040 s041 s042 s043 s044 s045 s047 s048 s050 s051 s053 s054 s055 s056 s058 s059 s080 s081 s082 s092 s093 s094 s095 s096 s097 s098 s099 s105 s114 s115 s130 s131 s132 s133 s135 s137 |

## Cách khai báo

- Theo vật liệu: `M(color, { kind: 'chrome' })` (engine/props.js, engine/house.js) hoặc `khaiBaoMat(material, kind)` — đặt `userData.matDecl` + `matNguon = 'khai-bao'`.
- Theo mesh: `khaiBao(root, [[/regex tên mesh/, kind], …])` — đặt `userData.matKind` + `matNguon` trên mesh, trả về danh sách mesh chưa khai báo.
- `kind = 'none'` nghĩa là giữ nguyên vật liệu gốc (không vân, không nhám/kim loại chồng lên); vẫn tính là khai báo.
- `KHONG_GRUNGE` (materials.js) là nguồn duy nhất của danh sách cấm grunge; `tools/kiem/mac-dinh.json` `L9.camGrunge` phải khớp (có test).
- Mesh có vai nhưng vật liệu chưa vá (trong suốt, không phải MeshStandard) được `__measure().vatLieu` báo `nguon = chua-va`; L9 coi là lỗi.
- Ưu tiên khi phân loại: tag trên mesh > khai báo trên vật liệu > luật đoán `MAT_RULES` (`matNguon = 'doan'`).
