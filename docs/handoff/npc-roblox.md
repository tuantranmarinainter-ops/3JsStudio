# NPC Roblox cho Tập 4 (`episodes/ep003`) — handoff (14/11)

## Mục tiêu
Thay mọi nhân vật ep003 (trừ Gà) bằng NPC Roblox Creator Store, có cổng duyệt. Người dùng đã chốt CÁCH A: giữ thân R6 của engine
(`engine/r6-rig.js`: xương, động tác, bộ mặt biểu cảm), chỉ lấy diện mạo Roblox (màu thân, ảnh áo/quần khuôn R6 585×559, tóc/mũ/kính GLB).

## Đã xong
- `tools/npc-roblox.mjs dung [tên…] | ke | manifest` — đọc `assets/characters/rb/nguon.json`, tải áo/quần (`roblox.mjs anh`), GLB nhân vật
  (`roblox.mjs tai --nhan-vat`), giữ mảnh quanh đầu (Accessory + mũ kiểu cũ là Part) → `assets/characters/rb/<tên>/{look.json, shirt.png, pants.png, acc.glb}`.
  Màu thân lấy theo màu PART (khớp ảnh xem trước), thiếu mới dùng BodyColors.
- `engine/r6-roblox.js`: `loadRbLooks(THREE, names)` (tải trước `__ready`), `rbRigOptions(res)`, `applyRbLook(THREE, char, res)` — thay vật liệu
  `torso_mesh / RightArm_mesh / LeftArm_mesh / RightLeg_mesh / LeftLeg_mesh`, đặt màu da, gắn nhóm `rb_acc` vào Head (scale đầu engine/1,25, quay 180°). KHÔNG sửa `r6-rig.js`.
- Trang thử `engine/r6-roblox-lab.html?ten=…&anim=idle|walk|…&yaw=…&rb=0|1` (`rb=0` = look vẽ tay cũ để so), có `window.renderAt(t)` cho `tools/look.mjs`.
- Test `tools/tests/npc-roblox.test.mjs` (5 qua). `shaders.mjs`: 5 program; mở trang 0,8 s.
- Duyệt đợt 1 (`duyet/ep003-npc/dot-01.ketqua.json`): bach 18541446276, mayor 83527751194934, mayor_ngu = đầu mayor + pyjama 123126413388497,
  linh 107895271287060 (một mẫu cho cả hai), banh 6270043601, be 135634323232287 + 119429811638939, dân: pack 84294762238979 (12 người) + 3706386033, 8598090797, 604065110, 12170843804.
  Chưa chọn: thợ may ("tìm thêm model người lớn R6 khối vuông"), gấu ("duyệt lại tìm từ khoá teddy bear").
- Agent soi ảnh bản dựng: mayor, mayor_ngu, linh, be_vang, be_ngoc, dan_13 ĐẠT; banh lỗi nhẹ (râu thưa, lệch); bach LỖI (áo quần của mẫu là Decal rời, 2 ảnh bị 403 "archived", tóc là hình vẽ).

## CHỐT (đợt 1 + 2 + 3, 14/11) — `assets/characters/rb/nguon.json`
| vai ep003 | `rb` | Roblox id | ghi chú |
|---|---|---|---|
| bach | `bach` | 126608988 | chốt đợt 3 (ông tóc bạc, gile nâu); mẫu gốc có CharacterMesh → dùng khối R6 |
| mayor | `mayor` | 83527751194934 | |
| mayor_ngu | `mayor_ngu` | đầu 83527751194934 + áo quần 123126413388497 | |
| linh_a, linh_b | `linh` | 107895271287060 | một mẫu cho cả hai |
| banh | `banh` | 6270043601 | |
| may | `may` | 118400431811478 | chốt đợt 3 (cô trẻ mũ bucket) |
| be_vang, be_ngoc | `be_vang`, `be_ngoc` | 135634323232287, 119429811638939 | `them.scale 0.84` |
| dan_a/b/c | chọn trong `dan_01, 04, 05, 09, 10, 12, 14, 15, 16` | pack 84294762238979 + 8598090797, 604065110, 12170843804 | gợi ý dan_a=`dan_04`, dan_b=`dan_09`, dan_c=`dan_15` |
| bap, gau_vi, gau_tui | — | người dùng chọn 8648724784 (gấu nâu nhạt nơ vàng, NGỒI, khối liền ~20 nghìn tam giác, KHÔNG xương) | CHƯA LÀM — chưa rõ dùng cho Bắp hay gấu trưng bày; phải hỏi + việc dựng xương riêng |

## Đã nối engine (commit sau 099a115)
- `engine/cast.js`: actor `{ r6: 1, look: '<dự phòng>', rb: '<tên>' }` → `loadRbLooks` một lần trước `__ready`, `rbRigOptions` đè lên look, `applyRbLook`.
  TẮT: `globalThis.__rbNpc = false` hoặc `?rb=0` → về `look` vẽ tay. (Tập muốn có ô bật/tắt trong trình phát: nối `EPISODE.fx.rbNpc` → `globalThis.__rbNpc` như `__bearGlb` — CHƯA làm, thuộc file của tập.)
- Kiểm qua đường cast (`engine/r6-roblox-lab.html?…&cast=1`): tất định OK (`look.mjs --det`), đi (`anim=walk`) chụp được, `rb=0` ra look cũ (35% điểm ảnh khác), 5 test qua.
  CHƯA kiểm: nói (không có anim tên `talk`; miệng nói là việc của bộ mặt), trong tập thật, bản gộp `dist/`.
- Lỗi đã sửa theo góp ý người dùng: (1) ảnh trang duyệt cắt sai → đen/lẫn người; (2) "râu tóc xoay sai" = đầu engine (bán kính 0,68) to hơn đầu Roblox (0,625) nên đâm xuyên phụ kiện → phụ kiện nở ngang 1,11, dọc 1,06.
- `assets/manifest.json`: đã CHÈN 17 dòng `characters/rb/*` (sau `characters/bap2`) vào bản làm việc nhưng CHƯA commit — file đang có thay đổi chưa commit của phiên khác; dòng của tôi sẽ đi cùng lần commit manifest kế tiếp.

## Việc còn lại
1. Phiên ep003 đổi `episodes/ep003/episode.js` → `actors` (giữ `look` làm dự phòng), rồi soi lại khung cận mặt (bach 8 shot, mayor 4; tóc/mũ Roblox cao hơn tóc vẽ tay, `wide` luôn 1):
   ```
   bach: {"r6":1,"look":"bach","rb":"bach"},          mayor: {"r6":1,"look":"mayor","rb":"mayor"},
   mayor_ngu: {"r6":1,"look":"mayor_ngu","rb":"mayor_ngu"},
   linh_a: {"r6":1,"look":"linh_a","rb":"linh"},      linh_b: {"r6":1,"look":"linh_b","rb":"linh"},
   banh: {"r6":1,"look":"banh","rb":"banh"},          may: {"r6":1,"look":"may","rb":"may"},
   be_vang: {"r6":1,"look":"be_vang","rb":"be_vang"}, be_ngoc: {"r6":1,"look":"be_ngoc","rb":"be_ngoc"},
   dan_a: {"r6":1,"look":"dan_a","rb":"dan_04"},      dan_b: {"r6":1,"look":"dan_b","rb":"dan_09"},      dan_c: {"r6":1,"look":"dan_c","rb":"dan_15"},
   ```
2. Gấu — NGƯỜI DÙNG QUYẾT 14/11: "Thay cả Bắp" bằng mẫu Roblox 8648724784 (gấu nâu nhạt nơ vàng, NGỒI, khối liền ~20 nghìn tam giác, KHÔNG xương). Việc riêng, chưa bắt đầu:
   - `node tools/roblox.mjs xem 8648724784` / `tai` → xem mẫu là mấy mảnh (đầu/thân/tay/chân tách hay một lưới), có vượt ngưỡng low poly `chu-dao` 12 000 không (vượt → hỏi người dùng hoặc giảm lưới).
   - Bắp hiện tại: GLB có xương `assets/characters/bap/*.glb`, lái bởi `engine/bear-glb.js` (bật bằng `EPISODE.bearGlb`), 3 con đổi màu lông/nơ (bap, gau_vi, gau_tui). Động tác đang dùng trong ep003: sit 7, idle 6, walk 7, hug 4, hugWalk 1, hold 2, climb 1, drag 1, stand 2.
   - Hướng làm đề xuất: tách khối theo mảnh (nếu mẫu nhiều mảnh) thành rig khối kiểu R6 lái bằng pose có sẵn, HOẶC dựng xương trong Blender (`tools/blender/nhap_rig.py`, xem `assets/characters/bap/README.md`). Mẫu đang NGỒI → phải có tư thế đứng. Duyệt mẫu (ảnh đứng/đi/ngồi/ôm) trước khi thay; phải bật/tắt được về gấu cũ.
3. Nén `assets/characters/rb` (8,6 MB, PNG 585×559 ~330 KB/ảnh) trước khi gộp `dist/`; công cụ gộp phải nhúng được `look.json`/PNG/`acc.glb` (chưa kiểm `tools/bundle`).
4. Commit `assets/manifest.json` khi file hết thay đổi của phiên khác.

## Giới hạn đã biết
- Mặt = bộ mặt engine (không lấy mặt Roblox). Decal rời trên thân (kiểu mẫu 李爺) chưa hỗ trợ. Râu/tóc nhiều lớp alpha mỏng hơn gốc.
- `assets/characters/rb` ~11 MB cho 24 người (PNG gốc ~330 KB/ảnh) — chưa nén; cân nhắc WebP trước khi gộp `dist/`.
- Mẫu 851937200 làm `sky-extract dump` lỗi (Color3uint8). Kho Roblox rất ít nữ R6 khối vuông miễn phí.
- Đã dùng ~560 request Open Cloud (tìm 122, xem ~300, tải ~140).
