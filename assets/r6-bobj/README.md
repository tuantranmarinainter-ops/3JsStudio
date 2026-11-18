# R6 BOBJ — động tác cho BBS FS 2.7 (retarget bằng app 1)

Mô hình R6 (6 khối Roblox, có khuỷu/gối) dạng BOBJ cho BBS FS 2.7. Tên xương giữ kiểu Minecraft (`anchor, body, low_body, head, left_arm, low_left_arm…`) nên BBS và động tác Minecraft dùng được ngay; tỉ lệ là R6: 1 stud = 0,4 block, cao 5 stud = 2 block, vai ±1,5 stud.

| File | Nội dung |
|---|---|
| `r6.bobj` + `config.json` | mô hình R6 (xương + lưới khối, UV skin Steve) — chép vào `config/bbs/assets/models/r6/` |
| `ga/ga-r6.bobj` + `ga/ga.png` + `ga/config.json` | **Gà** (Anh Gà MC) trên thân R6: da 256×256 màu theo `engine/r6-looks.js` (đầu vàng, băng đô đỏ, hoodie ô-liu sọc, quần lửng nâu, giày đen), mặt Gà `assets/characters/ga/faces`, chỏm 3 múi. Sinh bằng `python tools/r6-bobj-ga.py [--mat <tên mặt>] [--khong-chom] [--khong-mat]`. Chép vào `config/bbs/assets/models/ga_r6/` |
| `r6-armature.bobj` | chỉ xương (đích retarget) |
| `bbs/bbs-r6-actions.bobj` | 84 động tác chuẩn BBS 2.7 (`actions.bobj` của jar 1.20.4, bỏ "Action" rỗng) đã retarget sang R6 |
| `quaternius/quaternius-r6-actions.bobj` | 42 động tác Quaternius UAL1 Standard (bỏ A_TPose) đã retarget sang R6 |
| `*/kiem-so.json` · `*/bao-cao.json` | số kiểm (hướng xương, chân chạm đất, trượt, hai tay) · báo cáo app 1 |
| `bbs/catalog-nguon.json` | danh mục 85 động tác nguồn (tên Việt, nhóm, độ dài) |

## Cách làm (chạy lại được)
App 1 = repo `3appclaude`, gói `@bbs/retarget` (V9.12), đặt ở `S:\3appclaude`; script ở `S:\3appclaude\tools-local\` (ngoài repo này):
1. `r6-model.mts` — dựng `r6.bobj` từ `steve_simple.bobj` của jar: giữ hướng nghỉ từng xương, đổi tâm/cỡ từng phần sang R6.
2. `retarget-r6.mts bbs|quaternius [tên,…]` — nguồn → Mixamo65 (`runNormalize`, khoá chân) → R6 (`exportMinecraft20` với `r6-armature.bobj`), 20 tick/giây, Euler XYZ, LINEAR.
3. `kiem-r6.mts` (BBS: so với nguồn) · `kiem-q.mts` (Quaternius: chân, trượt, nghiêng).
Chạy: `node --import <editor>/packages/builder/node_modules/tsx/dist/loader.mjs <script>`.

## Kết quả kiểm (2026-11-19)
- App 1: cả 2 bộ PASS, sai số đọc lại < 1e-3 block. 35 test retarget đạt.
- BBS → R6: hướng đoạn xương lệch trung vị 0,2°, lớn nhất TB 4,3° (orange_justice); chân thấp nhất R6 −0,06…+0,85 block (nguồn −0,18…+0,77); trượt tổng 153 so với nguồn 146 (đơn vị chiều dài chân).
- Hạn chế: vai R6 rộng hơn Steve nên **động tác chạm hai tay không còn chạm** (vỗ tay: khoảng hở hai bàn tay 0,04 → 0,33 bề rộng vai). Cần IK tay nếu muốn khít.
- Quaternius: động tác đi/chạy là loại tại chỗ (không root motion) nên chân đỡ "trượt" theo nhịp — đúng thiết kế; Swim_Idle hông dưới mặt đất (−0,7) theo nguồn.

## Giấy phép
- Động tác BBS: GPL-3.0-only — McHorse (Emoticons gốc), bay4lly (bản Minecraft 1.20); xem `bbs/LICENSE-GPL-3.0.txt`. Người dùng chốt chép vào repo (2026-11-19), tự chịu trách nhiệm.
- Quaternius UAL1: CC0 1.0 (Quaternius).
- Mô hình R6: suy từ `steve_simple.bobj` của BBS (GPL) theo tỉ lệ R6.
