# HANDOFF — sửa góp ý ep001 (2026-11-12, nhánh `ep1-v2`, CHƯA push)

Đọc `CLAUDE.md` trước. Người dùng nói tiếng Việt. Mỗi tính năng mới phải có ô bật/tắt; xong việc luôn đưa link `dist/*.html`;
duyệt trước rồi mới gộp; test pass thì tự commit, không push.

## Mục tiêu
Sửa hết góp ý ep001 từ trình phát (`feedback/`), giữ phim tất định và mở nhanh.

## Đã xong
- Góp ý 11/11 17:33 (14 ghi chú): xong hết, commit `ca83c48`.
- Góp ý 12/11 14:49 (40 ghi chú, kế hoạch `feedback/gop-y_ep001_2026-11-12_14-49/KE-HOACH.md`; file .json đã mất, chỉ còn ảnh `NN_fFRAME.png`):
  - Đợt A + B: `91d9ec8`, `5a0baee`, `f5f0045`.
  - Đợt C: `bc0076e`, bản xem thử `dist/ep1_v9.html`, chờ người dùng duyệt.
    - xe Kenney Car Kit + dân làng R15 phối đồ (s019): `engine/townlife.js`, `engine/cast.js` `villagerLook`
    - cây Painted Valley (s013): `engine/trees.js` → `engine/envs/brazil.js`
    - ảnh gia đình (s034): `engine/familyphoto.js` → kitchen.js
    - cửa sổ thật (s038): `engine/realwindow.js` → bedroom.js
    - cầu thang chạm đất (s048): `engine/stairs.js` → house.js (3 dòng)
    - bè gỗ (s105): `engine/raft.js` → island.js
    - tàu đứt đôi (s124): `engine/wreck.js` → reef.js
  - Ô bật/tắt mới (post.js): `traffic`, `villagers`, `pvTrees`, `familyPhoto`, `realWindow`, `houseStairs`, `raft`, `wreckSplit`.
  - Film thêm 1 program (cây). Tất định OK ở 7 shot.

## Việc còn lại (theo thứ tự)
- (13/11) Bản mới nhất `dist/ep1_v13.html`: cầu thang gấp ngang song song sàn (duyệt qua `dist/cau-thang-gap.html`, `eb3915c`), da trơn `daTron` (v12). Chờ người dùng duyệt v13. Tiếp theo: mục 4 (kiểm cả phim) rồi mục 5.
0. (13/11) Đã sửa theo duyệt v10: cầu thang gấp bản lề `engine/stairs.js` (ô `stairsFold`, `4bddf10`) + chỗ yếu s013/s019/s038/s105/s124 (`7da2a80`) → bản xem thử `dist/ep1_v11.html`, chờ duyệt. Mục 1 dưới đây đã làm; mục 3 (tắt ô mới) đã kiểm OK.
1. Hỏi người dùng đã duyệt `dist/ep1_v9.html` chưa; sửa theo ý họ. Chỗ yếu agent tự nhận (chỉ sửa khi người dùng muốn):
   - s013: lá hơi lime, gắt
   - s019: dân nhỏ trong khung
   - s034: hình trong ảnh nhỏ
   - s038: cảnh ngoài cửa sổ tối, bé che kính
   - s105: bè nhỏ ở góc
   - s124: gốc cột chưa dập nát, boong trống (s125 cùng env reef cũng thấy tàu đứt đôi)
2. ĐÃ SỬA (13/11, `7b1e230`, ô `daTron`, bản `dist/ep1_v12.html`): viền do lớp grime kiểu nhà phủ nhầm lên da R15 (tối mép khối đầu), không phải decal mặt. Cũ: #22 s061 (viền ảnh cảm xúc 2 nhân vật), #23 s064, #26 s074 (f2759 có viền, f2766 không).
   Ảnh: `feedback/gop-y_ep001_2026-11-12_14-49/22_f2185.png`, `23_f2266.png`, `26_f2766.png`.
3. Thử tắt từng ô mới → phải về như cũ (chưa kiểm).
4. Kiểm cả phim 1 lần: `node tools/look.mjs episodes/ep001/index.html --shots all --det`.
5. Việc cảnh khác: xem `HANDOFF-canh.md`.

## Lưu ý
- Phiên [ep001-sky-storm] cùng thư mục có thay đổi CHƯA commit ở house.js, post.js, materials.js, island.js, town.js, envs/*.
  Chỉ Edit đoạn nhỏ; commit chỉ phần của mình (stage bằng `git hash-object -w` + `git update-index --cacheinfo` khi file lẫn).
- Không commit `episodes/ep001/voices/vi/multi_female_yangguangnv_uranus_bigtts.ogg`, `Desktop.ini`.
- Gộp bản xem thử: `node tools/bundle.mjs ep001 --out dist/ep1_vN.html`.
