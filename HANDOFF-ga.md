# HANDOFF — nhân vật chính Gà cho ep001 (2026-11-12, nhánh `ep1-v2`, CHƯA commit, CHƯA push)

Đọc `CLAUDE.md`. Người dùng nói tiếng Việt, hay xem trên ĐIỆN THOẠI → gửi file bằng SendUserFile (< 30 MB; phim 86 MB không gửi được).
Duyệt trước rồi mới gộp; mọi tính năng có ô bật/tắt; test pass tự commit, không push.

## Mục tiêu
Thay nhân vật `hero` (cậu bé kể chuyện) bằng **Gà** (tài sản người dùng). KHÔNG đổi lời thoại/phụ đề/giọng.

## Đã xong (chưa commit — commit khi người dùng duyệt)
- Tư liệu: `assets/characters/ga/front.png`, `back.png`, 37 mặt `faces/NN_*.png` (tên ASCII), `dims.json`, `atlas.webp/json`.
- v1 (khung R15 chung): tuỳ chọn trong `engine/r15.js` (shorts, headband, crest, sneakers, drawstrings, hstripes, faceSet,
  `loadGaFaces`, `GA_FACE_MAP`), `engine/ga.js` (`HERO_GA`).
- v2 (khung riêng theo đo ảnh): `engine/ga-rig.js` (`createGa`, cùng giao diện createR15), `engine/ga-dims.js`, `engine/ga-atlas.js`;
  tools `ga_measure.py`, `ga_atlas.py`, `ga_silhouette.py`, `ga-shoot.mjs`, `ga-lab-build.mjs`.
- `episodes/ep001/episode.js`: `heroGaOn()`; `?ga=1` = v2, `?ga=1&gav=1` = v1; mặc định TẮT.
- Lab: `engine/ga-lab.html` → `dist/ga-lab.html` (2,6 MB). Ảnh duyệt `output/look/ga2/`.
- Silhouette: IoU trước 0.924 / sau 0.940. Lệch > 5%: vòm đầu (−5.2/+6.0), cổ-vai sau (+7.1) do ảnh phác trước/sau không nhất quán.
  Giày dạng chưa khớp (IoU dải 0.71). Tất định OK (s010, s064, s119).
- Sửa theo người dùng: khép 2 chân sát (`LEG_CX`, `SHIN_W`, `SHOE_W` trong ga-rig.js) → IoU trước 0.929 / sau 0.945;
  màu tươi: nhân màu chất liệu `vivid` 1.3, da `vividSkin` 1.42 → sáng còn 0.85–1.0 so ảnh demo (đo vùng). Ảnh `output/look/ga3/`.
- Mặt: ô `DEC` 0.86, băng đô mỏng 60% (`bandK`), mỗi mặt tự căn theo bbox nét vào `FACE_BOX` {x .08–.92, y .23–.92}
  (nét từ 4.64 xuống 4.05 stud; băng đô dưới 4.73) + chỉnh riêng `faceFix[tên]={dx,dy,s}`. Bảng 37 mặt `output/look/ga6/37-mat.jpg`.
- Mũ trùm Blender: `tools/blender/ga_hood.py` (Blender 4.2 ở `C:\Program Files\Blender Foundation\blender.exe --factory-startup -b -P …`)
  → `assets/characters/ga/hood.glb` (5.5k tri, 122 KB), `loadGaHood` trong ga-rig.js, dự phòng `hoodGlb:false`. So sánh `output/look/ga4/so-sanh_mu.jpg`.
  Còn: túi hơi ngắn/nhọn đáy so phác, viền cổ dày như phao (chờ người dùng nhận xét).

## Việc còn lại
1. Chờ người dùng duyệt v2 (đã gửi lab + 4 ảnh); sửa theo ý họ (gợi ý: mũ trùm sau ít tương phản, khe ống quần 3/4, dạng giày).
2. Khi duyệt: thêm ô `heroGa` "Nhân vật chính Gà" vào `engine/post.js` (cờ đọc lúc dựng diễn viên → cần nạp lại/buildCast),
   chuyển mặc định BẬT, gộp `node tools/bundle.mjs ep001 --out dist/ep1_v11.html`, kiểm `look.mjs --shots all --det --query ga=1`, commit.
3. Còn lại góp ý ep001: xem `HANDOFF-gop-y.md` (phiên ep001-gop-y đang giữ).

## Lưu ý
- Phiên ep001-sky-storm có thay đổi chưa commit ở post.js, house.js, materials.js, envs/* → Edit đoạn nhỏ, commit chỉ phần mình
  (`git hash-object -w` + `git update-index --cacheinfo` khi file lẫn).
- Không commit `episodes/ep001/voices/vi/multi_female_yangguangnv_uranus_bigtts.ogg`, `Desktop.ini`.
