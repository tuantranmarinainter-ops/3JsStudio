# Danh mục tên hợp lệ

> **File sinh tự động, đừng sửa tay.** Sinh bởi `node tools/danh-muc.mjs` từ mã trong `engine/` (đổi mã → chạy lại lệnh).
> Kiểm một tập có dùng tên lạ không: `node tools/danh-muc.mjs kiem <ep>` (cũng nằm trong `node tools/doctor.mjs <ep>`, mục 13).
> Engine KHÔNG báo lỗi khi gặp tên lạ — nó lặng lẽ rơi về mặc định. Chỉ dùng tên có ở đây.

## A. Shot

### Loại shot (`type:`) — 16 tên

Nguồn: engine/shottypes.js · SHOT_TYPES

- `establish` — Toàn cảnh địa điểm (cao, xa), lia chậm. who (nếu có) đứng giữa.
- `crowd` — Đám đông (n người) quanh địa điểm cùng làm anim; who đứng hàng đầu.
- `walkBy` — who đi ngang khung (trái→phải; side:"left" đảo chiều), camera đứng yên ngang tầm.
- `follow` — Camera bám sau lưng who đang đi/chạy ra xa (vào sâu địa điểm).
- `closeup` — Cận mặt who (đẩy vào nhẹ). Không ghi at → đứng đúng chỗ shot trước.
- `reaction` — Trung cảnh phản ứng của who (ngang ngực, hơi chéo), mặc định mặt "surprised".
- `overShoulder` — Qua vai: with (tiền cảnh, quay lưng) nhìn who đang nói/diễn.
- `insert` — Cận đạo cụ: obj = tên object trong cảnh (vd "mailbox_home") hoặc điểm của địa điểm.
- `chase` — Rượt: who chạy ngang, with đuổi phía sau; camera bám ngang, rung nhẹ.
- `reveal` — Lộ twist: từ sau lưng who, camera cẩu lên + kéo ra thấy thứ phía trước (obj hoặc sâu trong địa điểm).
- `dialogue` — Thoại 2 người: who (trái màn hình, được ưu tiên mặt) và with (phải) quay vào nhau, hơi mở về camera; 2-shot.
- `insertRead` — Cận vật cần đọc: read = tên object (vd "postcard_island"). Vật ở giữa khung, camera gần tĩnh (zoom 2%), static:true. w = bề ngang vật (stud), fill = tỉ lệ bề ngang khung.
- `houseFull` — Toàn cảnh nhà + 4 chân: khoảng lùi tính từ kích thước nhà và fov (lề ≥ 5% mọi khung), lia ngang + lùi 25%. house (mặc định family tại địa điểm) ghi đè được.
- `hug` — Ôm: who + with quay vào nhau (anim hug), camera lùi dần cho thấy cả hai (zoom out).
- `fall` — Ngã: who ngã (anim tumble, hoặc fall); camera đẩy vào (1 người → zoom in) và hạ thấp theo xuống sát đất. Không ghi at → ngã tại chỗ đang đứng.
- `sinkTilt` — Nhà nghiêng (tilt, độ) và lún (sink, stud) dần trong shot; camera lùi 25% (zoom out), mọi khung đều thấy trọn nhà + chân. house ghi đè được.

### Chuyển động máy cấp shot (`move:` hoặc `cam.move`) — 8 tên

Nguồn: engine/shottypes.js · applyMove

`static` · `push` · `pull` · `pan` · `orbit` · `crane` · `drop` · `shake`

_ghép được: `push+pan`_

## B. Nhân vật (R6)

### Clip / động tác nền (`anim:`, `withAnim:`) — 82 tên

Nguồn: engine/r6.js · R6_ANIMATIONS + engine/r15.js · R15_ANIMATIONS + engine/anim-them.js · ANIM_THEM + engine/anim-nch.js · NCH (tiền tố `nch_`) + engine/bear.js · BEAR_ANIMATIONS (gấu bông) + assets/nhap/anims/*.json (tiền tố `rbx_`, 24 clip Roblox)

`idle` · `walk` · `run` · `jump` · `fall` · `wave` · `point` · `sit` · `scared` · `cheer` · `dance` · `lookAround` · `faint` · `cower` · `lie` · `shiver` · `hold` · `panic` · `hug` · `sitHold` · `write` · `lookUp` · `tumble` · `tpose` · `sitUp` · `climb` · `drag` · `vanish` · `peek` · `putDown` · `ringBell` · `sleepy` · `nch_idle` · `nch_walk` · `nch_run` · `nch_punch` · `nch_uppercut` · `nch_kick` · `nch_block` · `nch_dodge` · `nch_hit` · `nch_knockback` · `nch_fall` · `nch_getUp` · `nch_wave` · `nch_point` · `nch_cheer` · `nch_hug` · `nch_pickUp` · `nch_lookFollow` · `nch_shock` · `nch_cower` · `nch_jump` · `nch_talk` · `stand` · `sitting` · `hugWalk` · `jumpOut` · `rbx_agree` · `rbx_applaud` · `rbx_cheer` · `rbx_climb` · `rbx_cower` · `rbx_curtsy` · `rbx_dance` · `rbx_dance2` · `rbx_dance3` · `rbx_disagree` · `rbx_fall` · `rbx_haha` · `rbx_hello` · `rbx_idle` · `rbx_jump` · `rbx_laugh` · `rbx_point` · `rbx_salute` · `rbx_shrug` · `rbx_shy` · `rbx_tantrum` · `rbx_toolnone` · `rbx_walk` · `rbx_wave`

### Động tác chồng lớp (`do: [{ a: … }]`) — 37 tên

Nguồn: engine/blocky/poses.js · ACTIONS

`clap` · `wave` · `point` · `cheer` · `jump` · `dance` · `bow` · `slam` · `facepalm` · `shrug` · `think` · `yawn` · `stretch` · `tremble` · `shake` · `scared` · `cry` · `laugh` · `nod` · `headshake` · `look` · `talk` · `hold` · `show` · `fall` · `faint` · `spin` · `panic` · `salute` · `flex` · `type` · `eat` · `sneak` · `kneel` · `hug` · `sleepstand` · `pose`

_tham số theo từng động tác (arm, dir, times, rate…) xem poses.js; `t: [bắt đầu, kết thúc]` giây từ đầu shot_

### Mặt / biểu cảm (`face:`, `withFace:`, `mat: [[t,tên]]`) — 94 tên

Nguồn: engine/r15.js · GA_FACES + GA_FACE_MAP, engine/cast.js · FACE_ALIAS, engine/r6.js · R6_FACES

`binh_thuong` · `o_tho` · `cuoi_rang_tho` · `cuoi_ra_nuoc_mat` · `phan_khich` · `nan_ni_moi_vien_den` · `buon_rung_rung` · `khoc_oa` · `que_do_mat` · `ren_do_mo_hoi` · `hoang_so` · `soc_ha_hoc` · `la_het` · `met_moi` · `nghien_rang_tuc_gian` · `quat` · `nghi_ngo` · `boi_roi` · `cuoi_dac_y` · `ghe_tom` · `cuoi_guong` · `kiet_suc` · `ngo_ngac` · `buon_ngu` · `quyet_tam` · `thac_mac` · `ngam_nghi` · `thiet_ha` · `a_ra_roi` · `hoi_loi` · `dao_mat` · `ban_tin_ban_nghi` · `nhin_cuoi` · `im_lang_kho_xu` · `thi_tham` · `tho_phao` · `nhay_mat` · `smile` · `happy` · `laugh` · `neutral` · `sad` · `worried` · `scared` · `panic` · `surprised` · `angry` · `sleepy` · `sleep` · `cold` · `moved` · `grin` · `shy` · `shocked` · `shock` · `amazed` · `cry` · `crying` · `tearful` · `upset` · `tired` · `exhausted` · `drowsy` · `excited` · `joy` · `glad` · `cheerful` · `confused` · `thinking` · `anxious` · `nervous` · `embarrassed` · `blush` · `laughing` · `lol` · `smirk` · `smug` · `proud` · `mad` · `furious` · `annoyed` · `afraid` · `fear` · `terrified` · `calm` · `flat` · `serious` · `touched` · `grateful` · `relieved` · `asleep` · `sleeping` · `freezing` · `smiling`

_có thể thêm hậu tố `~open` (miệng mở); ảnh mặt thật = 37 tên GA_FACES (bộ altiwyre / emote37 cùng tên)_

## C. Bối cảnh

### Bối cảnh (`env:`) — 37 tên

Nguồn: engine/envs.js · def(…) + engine/envs/*.js (nạp theo tên file)

`town` · `forest` · `hawaii` · `brazil` · `sahara` · `antarctica` · `ocean` · `mountain` · `snowNight` · `iceSea` · `storm` · `shipStorm` · `island` · `reef` · `kitchen` · `bedroom` · `factory` · `sea` · `e3-nha-may` · `e3-pho` · `e3-phong` · `e3-tiem` · `e4-nha-may` · `e5-pho-dem` · `ep5t-choi` · `ep5t-chung` · `ep5t-ham` · `ep5t-hang-rao` · `ep5t-nha-ga-trong` · `ep5t-pho-chinh` · `ep5t-quang-truong` · `ep5t-thap-nuoc` · `ep5t-tiem-banh-studio` · `ep5t-tiem-banh` · `openSea` · `shop-in` · `kenneyTown`

_`kenneyTown` = thị trấn Kenney theo `episode.town`; tên file engine/envs/<tên>.js nạp được bằng `envs.define`_

## D. Đồ hoạ shot (`bfx`, `fx` của shot)

### Hiệu ứng đồ hoạ shot (`bfx: [{ t, … }]`) — kiểu — 12 tên

Nguồn: engine/blocky/lop-phu.js (veHieuUng) + engine/blocky/may.js (punch, shake)

`sign` · `stamp` · `icon` · `bulb` · `sparkle` · `glint` · `burst` · `say` · `title` · `flash` · `punch` · `shake`

### Khoá phụ của một hiệu ứng bfx — 21 tên

Nguồn: engine/blocky/lop-phu.js · may.js

`t` · `sign` · `until` · `instant` · `stamp` · `dur` · `icon` · `on` · `size` · `bulb` · `sparkle` · `glint` · `burst` · `say` · `title` · `style` · `bg` · `color` · `flash` · `punch` · `shake`

### Biểu tượng nổi (`bfx: { icon: … }`, `sign.icon`) — 25 tên

Nguồn: engine/blocky/overlays.js · ICONS

`exclaim` · `question` · `interrobang` · `zzz` · `anger` · `heart` · `sweat` · `dots` · `note` · `dollar` · `star` · `skull` · `check` · `cross` · `fire` · `bulb` · `clap` · `sleep` · `yawn` · `sneeze` · `laugh` · `face` · `phone` · `clock` · `stop`

### Kiểu thẻ tiêu đề (`bfx: { title, style }`) — 2 tên

Nguồn: engine/blocky/lop-phu.js

`card` · `banner`

### Hiệu ứng của MỘT shot (`fx: { cards|dust: … }` trong shots*.js) — khác ô FX bật/tắt cả tập — 2 tên

Nguồn: engine/shots.js · shot.fx.<tên>

`cards` · `dust`

## E. Máy quay blocky (`cam.bk`)

### Khoá của `cam.bk` — 17 tên

Nguồn: engine/blocky/may.js · frameShot / applyMove / mayBlocky

`on` · `co` · `spread` · `S` · `fov` · `yaw` · `from` · `side` · `goc` · `look` · `offset` · `move` · `amount` · `ease` · `whip` · `crash` · `roll`

### Khoá con của `whip` / `crash` — 7 tên

Nguồn: engine/blocky/may.js · mayBlocky

`at` · `dur` · `to` · `on` · `move` · `co` · `from`

### `bk.move` — 12 tên

Nguồn: engine/blocky/may.js · AMT

`push` · `pull` · `static` · `zoom-in` · `zoom-out` · `crane-up` · `crane-down` · `track-left` · `track-right` · `orbit-left` · `orbit-right` · `handheld`

### `bk.co` và `co:` cấp shot (cỡ cảnh; một bảng dùng chung) — 14 tên

Nguồn: engine/blocky/may.js · CO + VN (co-canh.js dùng lại)

`extreme` · `close` · `medium` · `cowboy` · `full` · `wide` · `establishing` · `cucCan` · `can` · `trung` · `ngangDui` · `toanThan` · `rong` · `toanCanh`

### `bk.goc` (góc máy) — 5 tên

Nguồn: engine/blocky/may.js · frameShot

`eye` · `low` · `high` · `top` · `worm`

### `bk.from` (hướng nhìn; hoặc số độ) — 9 tên

Nguồn: engine/blocky/may.js · FROM

`front` · `front-left` · `front-right` · `left` · `right` · `behind` · `back` · `behind-left` · `behind-right`

### `bk.ease` — 4 tên

Nguồn: engine/blocky/may.js · E

`linear` · `in` · `out` · `inout`

## F. Ô FX (`fx:`) — bật/tắt trong trình phát

Nguồn: engine/post.js · FX_DEFAULTS + FX_LABELS

| Ô | Mặc định | Mô tả |
|---|---|---|
| `hatNhe` | tắt | Hạt phim nhẹ (da nhân vật phẳng, nét; chỉ giảm hạt, vẫn giữ tối viền) |
| `grade` | bật | Chỉnh màu theo cảnh |
| `bloom` | bật | Toả sáng (bloom) |
| `dof` | bật | Mờ hậu cảnh (cảnh cận) |
| `vignette` | bật | Tối viền + hạt phim |
| `outline` | tắt | Viền đen nhân vật |
| `storm` | bật | Mưa bão mạnh |
| `worn` | bật | Quần áo cũ, bụi (nhân vật) |
| `grime` | bật | Vân sần, bụi (nhà, đường, cảnh) |
| `foot` | bật | Bụi / tuyết bốc ở chân nhà |
| `prints` | bật | Dấu chân trên tuyết |
| `wind` | bật | Gió tuyết thổi vào mặt |
| `breath` | bật | Hơi thở trắng (cảnh lạnh) |
| `folds` | bật | Nếp vải vẽ sẵn trên áo quần (v2) |
| `hair2` | bật | Tóc cụm lởm chởm (v2) |
| `aged` | bật | Nhà cũ bán thực: sơn tróc, ố, rêu (v2) |
| `mats` | bật | Chất liệu thật: gỗ, giấy, sắt, vải, đá, cát… (v3) |
| `ibl` | bật | Ánh sáng môi trường: kim loại, men, kính phản chiếu thật (v4) |
| `scans` | bật | Đồ vật quét thật Poly Haven: bàn ghế gỗ, cây, gốm, sách (v4) |
| `sea2` | bật | Biển + thuyền nổi khớp sóng, bọt quanh thân, vệt ướt (v4, học Saltline) |
| `paint` | tắt | Tranh sơn dầu (Kuwahara) |
| `ao` | tắt | Che khuất môi trường: tối dịu góc tường, chân đồ vật (AO, tất định) |
| `smaa` | tắt | Khử răng cưa SMAA (cuối chuỗi, nên bật cùng sơn dầu / AO) |
| `lite` | tắt | Bóng đổ nhẹ (tắt bóng kính, vật phát sáng, hạt, vật nhỏ) — mở/xuất nhanh hơn |
| `seaWx` | bật | Thời tiết biển theo shot: lặng → nắng → mưa → giông → bão (seaWeather) |
| `cloth` | bật | Vải mềm: buồm + chăn (gió lay, xuyên sáng, vân dệt) |
| `mast` | bật | Gãy cột buồm trong bão (thử) |
| `skybox` | bật | Bầu trời xanh vẽ tay (6 ảnh) cho cảnh trời đẹp |
| `vongBao` | bật | Vòng cây/đồi/núi bao kín chân trời (env/tập khai vongBao) |
| `nen` | bật | Nền đất/cỏ/cát/đá lát vân lặp (env/tập khai nen) |
| `stormSky` | bật | Bầu trời bão nhiều lớp: mây cuộn, trăng viền bạc, chớp trong mây |
| `shotSky` | bật | Mặt trời/trăng đặt theo từng shot (skySun/skyMoon) |
| `skyCubic` | bật | Trời 6 ảnh lọc mượt (bicubic) — hết vỡ ô khi phóng to |
| `skyScale` | bật | Trời 6 ảnh thu nhỏ ×2 quanh hướng nhìn (đỡ vỡ nét) |
| `grass` | bật | Cỏ mọc + gió thổi (bãi cỏ đảo) |
| `sway` | bật | Cây dừa đung đưa theo gió |
| `cloudShade` | bật | Bóng mây trôi trên mặt đất |
| `farwoods` | bật | Rừng xa (ảnh vẽ, thị trấn) |
| `backdrop` | bật | Núi xa vẽ (thị trấn) |
| `matTex` | bật | Ảnh vân CC0: gỗ, ngói, đá, đất, cát, vải (tắt = vân toán) |
| `flowers` | bật | Hoa trong cỏ (bãi cỏ đảo) |
| `traffic` | bật | Xe Kenney chạy + đậu (thị trấn) |
| `villagers` | bật | Dân làng R15 phối đồ ngẫu nhiên |
| `pvTrees` | bật | Cây kiểu Painted Valley (brazil) |
| `familyPhoto` | bật | Ảnh gia đình trong bếp |
| `realWindow` | bật | Cửa sổ thật phòng ngủ (cảnh 3D ngoài) |
| `vaiGiuong` | bật | Giường vải mềm (gối phồng + nếp gấp ga thay hộp) |
| `fridgeChrome` | bật | Tay nắm tủ lạnh thép mạ (chrome) |
| `buomVai` | bật | Buồm vải mềm (tàu) thay buồm khối |
| `dichTruoc` | bật | Dịch shader trước theo từng bối cảnh (tua không giật) |
| `houseStairs` | bật | Cầu thang nhà chạm đất |
| `stairsFold` | bật | Cầu thang gấp bản lề (nâng nhà thì gấp, ngồi thì bung) |
| `daTron` | bật | Da nhân vật trơn (không phủ bụi kiểu nhà → hết viền 2 bên mặt) |
| `raft` | bật | Bè gỗ thay thuyền (đảo) |
| `wreckSplit` | bật | Xác tàu đứt đôi (rạn san hô) |
| `faceLive` | bật | Mặt sống: đổi biểu cảm mềm, chớp mắt, ánh nhìn, đồng tử theo ánh sáng |
| `idleSong` | tắt | Idle sống: thở + lắc đầu lệch pha theo từng người, cả khi cầm đồ / chỉ tay (mã blocky-shorts) |
| `chongLop` | tắt | Động tác chồng lớp: diễn viên ghi do:[{a:"wave",t:[0.3,1]}] → vẫy/chỉ/gật… trộn lên dáng nền, mờ 0,12 s (mã blocky-shorts) |
| `coCanh` | bật | Cỡ cảnh: shot ghi co (can, trung, toanThan…) tự tính khoảng máy (đổi cần tải lại) |
| `gioThoiTiet` | bật | Giờ + thời tiết theo shot (time / weather) |
| `denNhanVat` | bật | Đèn nhân vật bám camera (mặt luôn đọc được; chỉ tập dùng time/weather) |
| `lightCues` | tắt | Đèn theo mốc theo lời kể: shot.lightCues đổi cường độ/màu đèn sẵn có, có chớp bật đèn (engine/den-moc.js; mặc định tắt) |
| `tangXa` | bật | Tầng bổ sung |
| `seaDecor` | bật | Biển chung: phao, mõm đá, đảo xa (env sea) |
| `nhep` | bật | Nhép miệng theo giọng đọc (shot có talk) |
| `chuTungChu` | bật | Phụ đề từng chữ (chữ đang đọc sáng hơn) |
| `matEmote` | bật | Mặt emote 37 ảnh cho mọi nhân vật (tắt = mặt vẽ cũ) |
| `matAlti` | bật | Bộ mặt AltiWyre cho nhân vật R6 (tập có facePack: altiwyre; tắt = bộ 37 emote cũ) |
| `matNguyen` | bật | Mặt nguyên AltiWyre (bảng MISC FACES; tắt = mặt ghép từ mắt + mày + miệng) |
| `troikaText` | tắt | Chữ bưu thiếp sắc nét (troika SDF thay chữ canvas) |
| `vfxAura` | tắt | VFX đánh nhau: hào quang lửa quanh nhân vật (engine/fx-danh.js; mặc định tắt) |
| `vfxBeam` | tắt | VFX đánh nhau: tia năng lượng + loé nòng + tia lửa chỗ trúng |
| `vfxHitSpark` | tắt | VFX đánh nhau: tia lửa va chạm (loé sao + vòng + vệt bắn) |
| `vfxSpeedLines` | tắt | VFX đánh nhau: vệt tốc độ bám camera |
| `vfxShake` | tắt | VFX đánh nhau: rung camera theo mốc |
| `mayBlocky` | bật | Máy kiểu blocky: shot ghi cam.bk → đẩy/cẩu/lia/xoay/whip/crash theo cỡ cảnh; tắt = khung đứng yên (mã blocky-shorts) |
| `punchRung` | bật | Punch + rung máy kiểu blocky ở chữ chốt (shot.bfx punch/shake) |
| `lopPhu` | bật | Đồ hoạ bật kiểu blocky: biển cấm, dấu đóng, biểu tượng trên đầu, lấp lánh, tiêu đề, chớp trắng |
| `phuDeBlocky` | bật | Phụ đề kiểu blocky: chữ trắng viền đen, bật từng chữ, chữ nhấn tô vàng (tắt = phụ đề cũ) |
