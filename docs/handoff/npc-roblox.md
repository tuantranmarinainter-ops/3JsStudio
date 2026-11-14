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

## ĐANG CHỜ NGƯỜI DÙNG — đợt 2: `dist/ep003-npc_duyet.html` (`node tools/duyet.mjs ep003-npc dung`)
Khe: `npc_xacnhan` (6 vai đã chốt), `npc_dan2` (chọn trong 16 dân làng), `npc_bach2` (uv_bach_1 khuyên dùng), `npc_may2` (uv_may_2 khuyên dùng), `npc_gau2` (12 gấu; "Không cái nào" = giữ GLB gấu).

## Việc còn lại (theo thứ tự)
1. Nhận kết quả đợt 2 (`duyet.mjs ep003-npc nhan <file>`). Trong `nguon.json`: đổi `bach`, thêm `may` theo lựa chọn; xoá các `uv_*` không dùng + thư mục của chúng; bỏ dân làng không chọn. `node tools/npc-roblox.mjs dung`.
2. Nối `engine/cast.js` (báo phiên face-pack trước khi sửa; file đang sạch): actor `{ r6: 1, rb: '<tên>' }` → nạp `r6-roblox.js` một lần, `loadRbLooks` cho mọi tên `rb`,
   tạo rig bằng `rbRigOptions(res)` thay cho `R6_LOOKS[o.look]`, rồi `applyRbLook`. Phải bật/tắt được: `EPISODE.fx.rbNpc === false` hoặc `?rb=0` → dùng `look` cũ (giữ `look` trong actor).
3. `assets/manifest.json`: thêm các dòng in ra từ `node tools/npc-roblox.mjs manifest <tên…>` (file đang có thay đổi chưa commit của phiên khác → chỉ thêm dòng mình, commit riêng hunk).
4. Kiểm: `node tools/look.mjs engine/r6-roblox-lab.html?... --t …` với `anim=walk`, `talk`, `idle`; `--det`; `shaders.mjs`; `do-nang.mjs ep003 --trang …`.
5. Gấu: nếu người dùng chọn mẫu → khảo sát riêng (đa số là khối liền không xương). Mặc định giữ `engine/bear-glb.js`.
6. Nhắn phiên ep003 (KHÔNG tự sửa `episodes/ep003/*`). Dòng cần đổi trong `episodes/ep003/episode.js` → `actors` (giữ `look` làm dự phòng):
   ```
   bach: {"r6":1,"look":"bach","rb":"bach"},        mayor: {"r6":1,"look":"mayor","rb":"mayor"},
   mayor_ngu: {"r6":1,"look":"mayor_ngu","rb":"mayor_ngu"},
   linh_a: {"r6":1,"look":"linh_a","rb":"linh"},    linh_b: {"r6":1,"look":"linh_b","rb":"linh"},
   banh: {"r6":1,"look":"banh","rb":"banh"},        may: {"r6":1,"look":"may","rb":"may"},
   be_vang: {"r6":1,"look":"be_vang","rb":"be_vang"}, be_ngoc: {"r6":1,"look":"be_ngoc","rb":"be_ngoc"},
   dan_a/b/c: {"r6":1,"look":"dan_a","rb":"dan_NN"}   (NN theo người dùng chọn ở khe npc_dan2)
   ```
   Lưu ý cho ep003: `scale 0.84` của hai bé nằm trong `look.them`; `wide` luôn 1 (thị trưởng không còn rộng 1.2); mũ/tóc Roblox cao hơn tóc vẽ tay → soi lại khung cận mặt (bach 8 shot, mayor 4).

## Giới hạn đã biết
- Mặt = bộ mặt engine (không lấy mặt Roblox). Decal rời trên thân (kiểu mẫu 李爺) chưa hỗ trợ. Râu/tóc nhiều lớp alpha mỏng hơn gốc.
- `assets/characters/rb` ~11 MB cho 24 người (PNG gốc ~330 KB/ảnh) — chưa nén; cân nhắc WebP trước khi gộp `dist/`.
- Mẫu 851937200 làm `sky-extract dump` lỗi (Color3uint8). Kho Roblox rất ít nữ R6 khối vuông miễn phí.
- Đã dùng ~560 request Open Cloud (tìm 122, xem ~300, tải ~140).
