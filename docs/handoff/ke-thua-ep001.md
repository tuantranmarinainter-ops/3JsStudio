# Kế thừa ep001 → hệ thống dùng chung — rà soát + kế hoạch

<!-- ĐIỂM DỪNG: tối đa 25 dòng. GHI ĐÈ cả khối mỗi lần cập nhật, không nối thêm. -->
## ĐIỂM DỪNG
- **Cập nhật:** 2026-11-15 (Bước 0–5 xong)
- **Nhánh:** `ep1-v2`
- **Đang làm:** đã xong Bước 0–5. Cụ thể:
  - B1: `K.bed` có vải mềm, ô `vaiGiuong`.
  - B2: da R6 đặt `daNhanVat` (`r6-rig.js:108`).
  - B3: helper nền xa `engine/nen-xa.js` (`createNenXa`), dùng ở `envs/town.js` và kenneyTown.
  - B4: `engine/prewarm.js` (`createPrewarm`), dùng ở ep002, ep003, `_template`, ô `dichTruoc`.
  - B5: tay nắm chrome trong `K.fridge` (ô `fridgeChrome`); buồm vải `K.clothSails` (ô `buomVai`); cửa sổ thật thành helper `createRealWindow` trong `engine/realwindow.js`.
  - B7: doctor mục 12 (`tools/ke-thua.mjs` + miễn trừ `tools/ke-thua.json` + test `tools/tests/ke-thua.test.mjs`). Hiện báo 12 chỗ, toàn ở env tập 2/3: e3-* matKind none ×3, shop-in, cửa sổ tự dựng ×5, giường e3-phong, ghi đè ×2.
- **Bước kế tiếp:** Bước 1b + Bước 6 cùng phiên ep003. Bước 1b: chăn `createBedSoft` cho `e3-phong.js:193-209`. Bước 6: thay `matKind='none'` của e3-* bằng vật liệu thật, A/B, gộp `dist/ep003_xem-thu.html` rồi gửi người dùng duyệt.
- **Đang chờ:** người dùng tự xác nhận dòng quy tắc CLAUDE.md ở mục 5 (chưa ghi vào CLAUDE.md, vì yêu cầu chỉ đến qua phiên khác).
- **File đang dở (chưa commit):** không.
- **Đang chạy nền:** không.
- **Đạt khi:** mỗi món "bị nhốt" có chỗ gốc dùng chung + cờ FX mặc định bật. Tắt cờ thì về như cũ. ep001 A/B y nguyên khung (PSNR ∞ / pose-ref OK). doctor cảnh báo được kiểu "env gỡ object chung".
- **Câu hỏi còn mở:** không. Người dùng đã chốt ngày 15/11 ("Duyệt, theo đề xuất"):
  (1) Giữ danh sách ô tập 3 đã tắt ở `episodes/ep003/episode.js:23-26`. Chỉ món MỚI chưa có trong danh sách đó mới tự bật.
  (2) Được thay `matKind='none'` của e3-* bằng vật liệu thật (Bước 6). Phải A/B và gửi người dùng duyệt lại. Bước 1b và Bước 6 làm cùng phiên ep003.
<!-- /ĐIỂM DỪNG -->

## 1. Kết luận rà soát (vì sao tập sau "không kế thừa")
Phần lớn cờ FX đã dùng chung và mặc định BẬT (`engine/post.js:38` FX_DEFAULTS). Cả 3 index.html gọi giống hệt nhau (ep001 `:126-128`, ep002 `:153-155`, ep003 `:159-163`). Chỗ hở nằm ở ba nơi:
1. **Cải tiến vá trong file env của ep001**, không nằm trong builder chung. Ví dụ: giường (`envs/bedroom.js:67-70`), tủ lạnh (`envs/kitchen.js:48-56`), nền xa (`envs/town.js:168-182`, `envs/island.js:29-49`). Tập nào dùng lại đúng env đó thì nhận: ep002 dùng `bedroom` nên có chăn mềm. Tập nào tự dựng env mới thì mất.
2. **Env ep003 (`e3-*`, Codex dựng tay) không gọi builder chung.** Giường dựng bằng `box()` (`envs/e3-phong.js:193-209`), cửa sổ tự dựng (`e3-phong.js:25,144`). Mọi mesh bị gắn `matKind='none'` nên bỏ qua ảnh vân và grunge (`e3-pho.js:82,573`, `e3-nha-may.js:71`, `e3-tiem.js:235`, `e3-phong.js:68-71`).
3. **Bản chép thay vì gọi chung.** `registerTownEnv` (`engine/town.js:363-399`) chép lại khối rừng xa / núi xa của `envs/town.js:168-182`. Vòng biên dịch shader theo env chỉ có ở `episodes/ep001/index.html:157-188`, còn ep002 `:191` và ep003 `:210` chỉ gọi `renderer.compile` một lần.

## 2. Bảng rà soát (đường dẫn tính từ `engine/` nếu không ghi khác)
Cột ep002/ep003: ✔ nhận · ✘ không · ◐ một phần · — không áp dụng.

| Nhóm | Cải tiến | Chỗ code | Dùng chung? | ep002 | ep003 |
|---|---|---|---|---|---|
| Sky | Trời 6 ảnh ngày/đêm, mặt trời/trăng, fog theo trời | `envs.js:142-153, 342-370`; `skies.js:14,16`; `skybox.js:20` | ✔ tự áp, trừ NO_SKY `envs.js:143` | ✔ kenneyTown, factory | ◐ e3-pho có; e3-phong/e3-tiem cố ý tắt (`e3-phong.js:59`, `e3-tiem.js:41`) |
| Sky | Mặt trời/trăng theo shot (`skySun/skyMoon/skyScale`) | `shots.js:364`; `envs.js:358-364` | ✔ cơ chế; dữ liệu ghi tay 8 shot ep001 | — | — |
| Sky | Giờ / thời tiết theo shot, đèn nhân vật | `envs/gio-thoi-tiet.js:1-12`; `shots.js:358-360`; `lights.js:53-59` | ✔ | ✔ | ◐ chỉ `time` |
| Sky | Trời bão nhiều lớp | `stormsky.js`; `envs.js:147-148, 345-353` | env tự khai `e.stormSky` | — | — (`ep003/episode.js:24` tắt) |
| Biển | sea.js + seaWeather 10 kiểu, đồ trang trí biển | `sea.js:25`; `seaweather.js:26,65,96-130`; `envs.js:162-168, 317-322` | ✔ cho env có `e.sea` | — | — |
| Biển/vải | Buồm vải `createSail` thay buồm hộp | `envs/shipStorm.js:34-41` (ẩn `old`, thêm buồm vải) | ✘ vá trong env | — | — |
| Nền | Núi xa vẽ `createBackdrop` | `backdrop.js:176`; gắn `envs/town.js:174-176`; bản chép `town.js:381-383` | ✘ mỗi env tự gắn | ✔ chỉ kenneyTown | ✘ e3-pho không gọi; cờ tắt `ep003/episode.js:25` |
| Nền | Rừng xa `createFarwoods` | `farwoods.js:187`; `envs/town.js:168-173`; bản chép `town.js:376-380` | ✘ | ✔ chỉ kenneyTown | ✘ |
| Nền | Bóng mây trôi `createCloudShade` | `cloudshade.js:13`; `envs/island.js:36-49`; `town.js:384-387` | ✘ | ✔ chỉ kenneyTown | ✘ |
| Nền | Gió chung `createWind` | `wind.js:73`; tạo riêng ở `envs/island.js:30`, `envs/town.js:169`, `envs/brazil.js:26`, `town.js:377,384` (2 bản cùng seed) | ✘ mỗi env tự tạo | ◐ kenneyTown | ✘ |
| Map | Cỏ + hoa + sway | `grass.js:130`; `sway.js`; `envs/island.js:29-32, 89-91` | ✘ chỉ island | ✘ | ✘ (cờ tắt) |
| Map | 3 tầng front/mid/back `ganTang` + vật tầng xa `tangXa` | `envs.js:154-159`; vật xa gắn riêng 11 env ep001, vd `envs/island.js:134` | ◐ khung chung, vật riêng | ◐ kenneyTown back | ◐ e3-pho có tầng, không có vật xa (`e3-pho.js:49-51`) |
| Map | Đèn theo mốc `lightCues` | `den-moc.js:23-42`; `envs.js:330-337` (mặc định TẮT `?? false`) | ✔ cơ chế, mặc định tắt | ✘ | ◐ bật, 1 shot (`shots-phong.js:59`) |
| Map | Xe + dân làng `townLife` | `townlife.js`; `envs/town.js:6,154` | ◐ env tự gọi | ✘ kenneyTown thiếu (`town.js`) | ✘ cờ tắt |
| Map | Thị trấn Kenney | `town.js:84-263, 363-399` | ✔ cho tập dùng kenneyTown | ✔ | ✘ không dùng (`ep003/episode.js:17`) |
| Vật liệu | Vật liệu thật theo họ shader `applyMaterials` | `materials.js:21,531`; mỗi index.html tự gọi (ep001 `:112-116`, ep002 `:139-141`, ep003 `:141-143`) | ◐ chép tay theo `_template` | ✔ | ◐ mesh `none` bị bỏ qua |
| Vật liệu | Ảnh vân CC0 `matTex` | `materials.js:81,90`; cờ `post.js:38` | ✔ | ✔ | ◐ e3-* gắn `matKind='none'` (dòng ở mục 1) |
| Vật liệu | Khai báo `matDecl` / `MAT_DE_XUAT` | `materials.js:24,41,52`; `mat-khai-bao.js:4` | ✔ | ✔ | ◐ gắn tay |
| Vật liệu | Grunge / bụi / nhà cũ | `grunge.js:13,154-161` | ◐ mỗi index tự gọi | ✔ | ◐ tắt `worn/aged` có chủ ý (`ep003/episode.js:23`) |
| Vật liệu | Da trơn `daTron` (hết 2 vệt tối cạnh mặt) | `grunge.js:14,140`; cờ chỉ đặt ở `r15.js:1000` | ◐ chỉ R15 | ✘ R6 `r6-rig.js:108` không đặt `daNhanVat` | ✘ toàn R6 |
| Vật liệu | Tay nắm tủ lạnh chrome | vá `envs/kitchen.js:48-56` (đổi hình + vật liệu); gốc `props.js:35-41` | ✘ vá trong env | ✘ | ✘ |
| Shader | IBL kim loại/kính | `ibl.js:48`; `envs.js:136,270,326-328` | ✔ | ✔ | ✔ |
| Shader | Gộp program theo họ (≈150 → 31) | `docs/core.md:107,114` | ✔ | chưa đo | chưa đo |
| Shader | Biên dịch trước theo từng env (không giật khi tua) | `episodes/ep001/index.html:157-188` | ✘ chỉ ep001 | ✘ `ep002/index.html:191` | ✘ `ep003/index.html:210` |
| Shader | AO, SMAA, sơn dầu `paint` | `ao.js`; `painterly.js`; `post.js:30-32,38` (mặc định tắt) | ✔ cờ | ✘ | ✔ ao+smaa (ep003 tự bật) |
| Hậu kỳ | Màu theo cảnh `grade` (khoá theo `light`) | `post.js:90-102, 245-247`; `envs.js:336` | ✔ | ✔ | ✔ |
| Hậu kỳ | Bloom, DOF, tối viền | `post.js:192-193, 232-244` (mặc định bật) | ✔ | ✔ | ✔ |
| Hậu kỳ | `hatNhe`, `outline`, mưa màn hình `storm` | `post.js:38,66,177-190,236-237` | ✔ cờ (2 cờ đầu mặc định tắt) | ✔ theo cờ | ✔ theo cờ |
| Đạo cụ | **Gối phồng + nếp chăn vải** | `cloth.js` (createPuffy/createFold); vá `envs/bedroom.js:67-70` (gỡ `pillow`, `blanket_cuff`) | ✘ vá trong env | ✔ vì dùng env bedroom (`ep002/shots.js:19-37`) | ◐ có gối phồng (`e3-phong.js:206`), chăn là hộp ca-rô cứng (`:199-205`) |
| Đạo cụ | Chăn mềm trùm người, thở `createBlanket` | `props.js:129` (trong `K.bed`) | ✔ trong builder | ✔ | ✘ e3-phong không dùng `K.bed` |
| Đạo cụ | Cửa sổ thật (lỗ tường + cảnh ngoài, ngày/đêm) | `realwindow.js:5`; dựng + bật tắt ở `envs/bedroom.js:18,46-61,79`; cờ `realWindow` | ✘ vá trong env | ✔ vì dùng env bedroom | ✘ e3-phong tự dựng (`:25,144`) |
| Đạo cụ | Ảnh gia đình | `familyphoto.js:48` (helper chung); gắn `envs/kitchen.js:66,73` (ẩn khung tranh cũ) | ◐ helper chung, chỉ kitchen gọi | ✘ | ✘ cờ tắt |
| Đạo cụ | Scans / furnish (Poly Haven) | `scans.js`; `furnish.js`; `envs/bedroom.js:77,79`; `envs/kitchen.js:73` | ◐ env tự gọi | ✔ bedroom | ✘ không env e3 nào gọi |
| Đạo cụ | Cầu thang gập bản lề | `stairs.js`; `house.js:176`; cờ `houseStairs/stairsFold` | ✔ trong builder nhà | chưa kiểm | — cờ tắt |
| Đạo cụ | Bè, xác tàu đứt đôi, cây Painted Valley | `envs/island.js:101`; `envs/reef.js:27`; `envs/brazil.js:42` | ✘ env riêng | — | — |
| Đạo cụ | props-glb / props-kb | `props-kb.js:15`; cờ `propsGlb` | ✔ (không phải món của ep001) | ✔ | ✔ |

## 3. Năm món lớn nhất bị "nhốt" trong ep001
1. **Giường vải mềm** (gối phồng + nếp chăn): `envs/bedroom.js:67-70`. Builder `K.bed` (`props.js:130`) vẫn còn hộp `pillow` + `blanket_cuff`.
2. **Tầng nền xa** (núi xa + rừng xa + bóng mây + gió chung + cỏ/hoa): gắn tay ở `envs/town.js:168-182` và `envs/island.js:29-49`, chép lại ở `town.js:376-387`.
3. **Biên dịch shader theo từng env**: chỉ có ở `episodes/ep001/index.html:157-188`. Tập khác giật khi tua sang env mới.
4. **Cửa sổ thật**: `envs/bedroom.js:46-61,79`. `K.window` vẫn là tấm ảnh phẳng.
5. **Kim loại / vải thay khối**: tay nắm chrome (`envs/kitchen.js:48-56`) và buồm vải (`envs/shipStorm.js:34-41`) đều vá trong env. Kèm theo là **da trơn chỉ có ở R15** (`r15.js:1000`), trong khi dân làng giờ là R6.

## 4. Kế hoạch (theo thứ tự)
Nguyên tắc chung:
- **Gọi theo nhu cầu, không nạp hết (người dùng chốt 2026-11-15).** Kế thừa nghĩa là món đẹp của ep001 nằm sẵn trong builder chung. Tập sau chỉ nhận món nào mà bối cảnh/shot của nó thật sự dùng: có giường thì `K.bed` tự có vải mềm, ngoài trời thì mới gọi `H.nenXa`, có tủ lạnh thì `K.fridge` mới có chrome. Không có lớp "áp hết mọi cải tiến lên mọi tập". Module nào không được gọi thì không import, không dựng, không dịch shader. Bước 4 (`prewarmEnvs`) chỉ làm nóng những env mà shots của tập dùng.
- **Món dùng chung nằm trong Studio, không nằm trong tập (chốt 2026-11-15).** Builder, vật liệu, nền xa, cờ FX nằm ở `engine/`, được gộp vào `studio.html`. Gói tập (`episodes/<ep>/` → `<ep>.3js`) chỉ chứa DỮ LIỆU: dùng env nào, đạo cụ nào, shot nào, và ô nào muốn tắt. Ra bản Studio mới thì mọi tập tự đẹp lên. Chỉ món riêng của một câu chuyện (GLB twist, đạo cụ độc nhất) mới để trong tập. Sau mỗi bước phải dựng lại studio + gói + kho cùng lúc (xem `docs/handoff/tach-studio.md`).
- Mỗi món có **cờ FX mới trong `FX_DEFAULTS` (`post.js:38`), mặc định `true`**, kèm nhãn trong trình phát. Tắt cờ thì builder dựng đúng như cũ.
- File env cũ bỏ đoạn vá và gọi builder. Hình ep001 phải y nguyên.
- Không sửa `engine/r15.js`, `episodes/ep001/*` (đang do phiên ep001-sky-storm giữ). Bỏ qua ep004/ep005.

**Bước 0: đo mốc (agent chính, không sửa code).**
- `PROFILE=1 node tools/look.mjs episodes/ep001/index.html --shots all --pose --out refs/ke-thua-ep001`, làm tương tự cho ep002 và ep003 (`refs/ke-thua-ep002`, `-ep003`).
- `node tools/shaders.mjs` cho cả 3 tập, ghi số program và thời gian mở trang.
- Đạt khi: 3 bộ `pose.json` + ảnh chuẩn có trên đĩa, có bảng số shader ghi vào mục Ghi chép.

**Bước 1: giường vải mềm vào builder (phiên con A, sở hữu `engine/props.js` + `engine/envs/bedroom.js` + `engine/cloth.js`).**
- `K.bed(opts)` tự tạo gối `createPuffy` + nếp `createFold`, theo đúng tham số đang có ở `bedroom.js:69-70`. Cờ `vaiGiuong` (tắt thì về hộp `pillow`/`blanket_cuff`).
- Thêm helper `createBedSoft(THREE, { w, len, top, color, map })` cho giường kích thước tuỳ ý, gồm chăn `createBlanket` + nếp + gối.
- Bỏ đoạn gỡ/thay ở `bedroom.js:67-70`.
- Đạt khi: ep001 các shot phòng ngủ (s010, s037, s038) `--ab` PSNR ∞ và `--pose-ref` OK. ep002 phòng ngủ y nguyên. Tắt `vaiGiuong` thì ra hộp cũ. `npm test` pass.

**Bước 1b: e3-phong dùng `createBedSoft` (phiên ep003 hoặc phiên con A sau Bước 1, sở hữu `engine/envs/e3-phong.js`).**
- Thay `phong_chan`, `phong_chan_ru`, `phong_chan_phu` (`:199-205`) bằng chăn vải, giữ vân ca-rô `plaidTex`. Giữ tên `e.chanPhu` để shot cũ chạy.
- Đạt khi: các shot nằm giường ep003 chụp `--shots` thấy chăn rủ mềm, người dùng duyệt ảnh lưới trước/sau. Tắt cờ thì về hộp cũ.

**Bước 2: da trơn cho R6 (phiên con B, sở hữu `engine/r6-rig.js`).**
- Đặt `skinMat.userData.daNhanVat = true` ở `r6-rig.js:108`.
- Đạt khi: cảnh cận R6 của ep003 hết vệt tối ở mép mặt (so A/B). Tắt `daTron` thì về như cũ. ep001 (R15) không đổi.

**Bước 3: helper "tầng nền xa" dùng chung (phiên con C, sở hữu `engine/envs.js` + `engine/town.js` + `engine/envs/town.js`).**
- `H.nenXa(g, { seed, ring, count, avoid, cloud, grass })` gồm rừng xa, núi xa, bóng mây và **một** gió chung cho mỗi env (hết 2 bản trùng seed ở `town.js:377,384`).
- `envs/town.js` và `registerTownEnv` gọi helper với đúng tham số cũ.
- Env mới (e3-pho…) gọi được bằng 1 dòng. Có bật cho ep003 hay không: chờ trả lời câu hỏi mở 1.
- Đạt khi: ep001 shot town + island PSNR ∞. ep002 shot kenneyTown PSNR ∞. Số program không tăng (shaders.mjs).

**Bước 4: biên dịch shader theo env thành hàm chung (phiên con D, sở hữu file mới `engine/prewarm.js` + `episodes/_template/index.html` + `episodes/ep002/index.html` + `episodes/ep003/index.html`).**
- Tách vòng `director.render + post.render` của `ep001/index.html:157-188` thành `prewarmEnvs(...)`.
- ep001 tạm giữ bản riêng cho tới khi phiên ep001-sky-storm nhả file.
- Đạt khi: ep002/ep003 mở trang không có program mới phát sinh khi tua (shaders.mjs đếm trước và sau khi tua). Thời gian tới `__ready` không vượt 10 s. Hình y nguyên.

**Bước 5: cửa sổ thật, tủ lạnh chrome, buồm vải vào builder (phiên con A tiếp, sau Bước 1, sở hữu `engine/props.js`, `engine/realwindow.js`, `engine/envs/kitchen.js`, `engine/envs/shipStorm.js`).**
- `K.fridge` có tay nắm chrome (cờ `fridgeChrome`).
- `K.window({ real: true, ... })` dựng lỗ tường + `createWindowOutside` (cờ `realWindow` có sẵn).
- Tàu dùng buồm vải ngay trong builder tàu.
- Bỏ đoạn vá ở `kitchen.js:48-56`, `bedroom.js:46-61`, `shipStorm.js:34-41`.
- Đạt khi: ep001 các shot bếp, phòng ngủ, bão tàu PSNR ∞. Tắt từng cờ thì về như cũ.

**Bước 6: vật liệu của env e3-\* (chờ câu hỏi mở 2, phiên ep003).**
- Thay `matKind='none'` toàn env bằng loại thật (gỗ/vải/sơn…), chỉ giữ `none` cho mặt phát sáng / kính / ảnh nền.
- Đạt khi: người dùng duyệt A/B 9 shot như đợt 14/11.

**Bước 7: chặn tắc (agent chính, sau khi Bước 1 xong để có ví dụ thật).** Xem mục 5.

**Bước cuối: kiểm cả phim ở ep001, ep002, ep003.** `node tools/look.mjs episodes/<ep>/index.html --shots all --det --pose-ref refs/ke-thua-<ep>/pose.json --ref refs/ke-thua-<ep>`. Sau đó gộp `dist/` và cập nhật `docs/tien-do.json`.

Chia việc: tối đa 3 phiên con cùng lúc (A, B, C), mỗi phiên sở hữu đúng các file đã ghi. D chạy sau C vì cùng đụng chuỗi env/shader. Bước 1b và Bước 6 đụng file của phiên ep003 nên giao cho chính phiên đó.

### Rủi ro
- **Shader program tăng.** Gối, nếp chăn, buồm vải đều là `MeshStandardMaterial` cùng họ, không thêm program. Helper nền xa giữ 1 program cho mỗi món (backdrop, farwoods, cloudshade). Kiểm bằng `node tools/shaders.mjs` trước và sau mỗi bước, ngưỡng ⚠ 80 program / 10 s.
- **ep001 lệch khung** do thứ tự tạo mesh đổi (seed, tên, thứ tự traverse của grunge/materials). Cách xử lý: builder giữ đúng thứ tự `add` và tham số cũ, so `--ab` + `--pose-ref`. Chỉ cần lệch là dừng lại sửa, không chấp nhận "gần đúng".
- **ep002 dùng env bedroom** nên mọi thay đổi ở Bước 1/5 cũng chạm ep002. Phải A/B cả ep002.
- **ep003 đã chốt hình 14/11.** Món mới tự bật có thể làm đổi hình. Theo câu hỏi mở 1: món nào ep003 đã tắt thì vẫn tắt.

## 5. Chặn tắc lần sau
**Kiểm mới trong `tools/doctor.mjs`: mục "12. Kế thừa" (chỉ cảnh báo, chạy nhanh, đọc tĩnh).** Quét `engine/envs/*.js`, trừ `e4-*`, `e5-*`:
- (a) Mẫu gỡ/ẩn bộ phận của builder chung, tức là `getObjectByName('<x>')` theo sau bởi `.parent.remove(` / `remove(` / `.visible = false`, khi `<x>` là tên do `engine/props.js` / `house.js` / `town.js` tạo ra. Ví dụ hiện có: `bedroom.js:68` (pillow, blanket_cuff), `bedroom.js:79` (window_view), `shipStorm.js:40` (sail-*), `kitchen.js:73` (khung tranh), `factory.js:192`, `e3-nha-may.js:366`.
- (b) Mẫu ghi đè vật liệu/hình học của builder chung sau khi tạo (`traverse` + `o.material =` / `o.geometry =` trên object từ `K.*`), vd `kitchen.js:49-55`.
- (c) Env gắn `matKind='none'` cho toàn bộ cây (`traverse(... matKind = 'none')`), vd `e3-pho.js:573`, `e3-nha-may.js:71`, `e3-tiem.js:235`, `shop-in.js:179`.
- (d) Env tự dựng lại món đã có builder: tên mesh khớp `giuong|bed|chan|blanket|goi|pillow|cua_so|window|tu_lanh|fridge` mà file không gọi `K.bed/createBedSoft/K.window/K.fridge`.
- Danh sách miễn trừ đặt ở `tools/ke-thua.json` (`{ "file:mẫu": "lý do" }`), để chỗ có chủ ý (vd khung tranh cũ của kitchen) không báo mãi.
- Đạt khi: chạy trên repo hiện tại báo đúng các chỗ đã liệt kê ở trên. Thêm test `tools/tests/doctor-ke-thua.test.mjs` với 2 file env giả (một có vá, một sạch).

**Một dòng thêm vào CLAUDE.md (mục "Hệ thống shot" hoặc "Quy tắc kỹ thuật"):**
> Sửa đẹp một món dùng chung (giường, cửa sổ, tủ lạnh, trời, nền xa, vật liệu…) thì sửa ở **builder chung** (`engine/props.js`, `engine/envs.js`, `engine/cloth.js`…), có cờ FX mặc định bật. KHÔNG gỡ/thay bộ phận của builder trong `engine/envs/<env>.js`, vì doctor mục 12 sẽ cảnh báo.

## Ghi chép
- **Bước 2–5 (15/11) kiểm.** Làm bằng 3 agent Sonnet song song; báo cáo ở `output/ke-thua-ep001/{nen-xa,dich-truoc,builder-chung}/bao-cao.md`.
  - **So ảnh với mốc, lệch 0,000%:** ep001 town (22 shot), kitchen, bedroom, shipStorm; ep002 kenneyTown (11 shot), bedroom (29 shot), --shots all; ep003 8 shot sau Bước 2 + 4.
  - **ep001 s140 lệch 0,063%:** ổn định qua nhiều lần chạy. Đưa 9 file về HEAD vẫn lệch đúng 0,063%, nên đó là lệch theo thứ tự tua có sẵn (chấm hải đăng trong ảnh bưu thiếp), không do Bước 2–5.
  - **Tắt từng ô thì về bản cũ:** fridgeChrome s144 40 dB, buomVai s023 21 dB, realWindow s038 12 dB, farwoods+backdrop s001 50 dB.
  - **`cloudShade` ở kenneyTown:** tắt gần như không đổi hình (≥ 89 dB), bản HEAD cũng vậy. Đây là tình trạng có sẵn, bóng mây thị trấn rất mờ; chưa sửa.
  - **Bước 4 đổi hướng:** trước `__ready` vẫn compile một lần như cũ; sau `__ready` mới làm nóng nền mọi env của tập, cộng `ensure` khi tua tới env chưa nóng. Làm nóng env đầu trước `__ready` thì ready chậm gấp ~3 lần nên đã bỏ cách đó.
  - **Lợi ích Bước 4 chưa đo được:** đo lúc máy tải nặng, và `shaders.mjs --film` tua ngay sau ready nên không tách được phần làm nóng nền. Lợi ích chỉ thấy khi người xem chờ vài giây rồi mới tua. Việc còn mở: thêm `--cho <giây>` cho shaders.mjs rồi đo lại lúc máy rảnh.
  - **Tên mesh tay nắm chrome:** `chrome_handle_*_handle_top` hơi gượng, đặt vậy để luật đoán vật liệu cũ vẫn ra chrome và test không hỏng.
  - **`npm test`:** 608/614 đạt. 5 test hỏng sẵn như trước. `mask khôi phục` hết giờ khi chạy cả bộ, chạy riêng thì pass.
- **Bước 0 (15/11), số shader** (`PROFILE=1 node tools/shaders.mjs … --film --step 2`, file `output/ke-thua-ep001/shaders-*.json`):
  - ep001: `__ready` 5,4 s · 37 program lúc ready → 103 sau khi tua (dịch 1,1 s).
  - ep002: 7,0 s · 120 → 205 (**dịch 9,4 s trong lúc tua**, chính là chỗ Bước 4 cần sửa).
  - ep003: 6,5 s · 139 → 215 (0,7 s).
  - Cả 3 tập vượt ngưỡng ⚠ 80 program. Mốc ảnh và tư thế ở `refs/ke-thua-ep00{1,2,3}/` (--shots all --pose).
- **Bước 1 (15/11) kiểm:**
  - ep001 s010/s037/s038 so `--ref`: giống hệt hoặc 110 dB, lệch 0,000%.
  - ep002, 29 shot phòng ngủ: tất cả giống hệt hoặc ≥ 101 dB, lệch 0,000%.
  - Tư thế: mọi xương trong cảnh đang hiện khớp. Lệch chỉ ở env ẩn (`env_antarctica/ocean/island` ep001, gấu đang ẩn ep002), do thứ tự tua, ảnh không đổi.
  - Bật đủ các ô khác, chỉ tắt `vaiGiuong`: ra gối hộp + cuộn trụ cũ, ngoài giường không khác (agent Haiku xem `output/ke-thua-ep001/b1-tat/sheet.jpg`).
  - `npm test`: 609/614 đạt. 5 test hỏng không liên quan: 3 test asset-plan đọc `r15.js` đang bị phiên khác sửa dở, `sfx-shot-list` vì số shot ep001 đổi, HOUSE bbox shot-lab.
- Nguồn: 3 agent phụ Sonnet chỉ đọc (A sky/nền/map → `output/ke-thua-ep001/A-sky-nen-map.md`; B vật liệu/shader/hậu kỳ; C đạo cụ/nội thất). Agent chính đã kiểm lại các dòng chính: `bedroom.js:66-70`, `props.js:123-133`, `e3-phong.js:192-209`, `post.js:38`, `ep003/episode.js:21-26`, `town.js:380-387`, `envs/town.js:165-183`, `kitchen.js:45-56`, `shipStorm.js:34-41`, `r6-rig.js:108`, `r15.js:1000`.
- Ví dụ kế thừa ĐÚNG đã có: commit 886f744 làm phòng ngủ theo giờ cho ep002 ngay trong env dùng chung, ep001 lệch 0.
- Chưa kiểm: kenneyTown có dùng `house.js`/`stairs.js` không; số shader thật của ep002/ep003 (để Bước 0 đo); vệt mặt R6 mới chỉ suy ra từ code, chưa chụp.
