# Rà soát "lõi chung" ep001 / _template / ep002 (2026-11-13, chỉ đọc)
Ký hiệu: **[T]** = đã kiểm thực tế (mở `episodes/ep002/index.html` và `ep001` bằng Chrome GPU, `renderAt` giữa shot mỗi cặp env/giờ, đọc `getOptions()`, scene, `renderer.info`); **[C]** = chỉ suy từ code. Số dòng là của cây làm việc lúc rà (nhiều file đang được agent khác sửa: `town.js`, `shots.js`, `props-kb.js`).

## 1. Bảng tính năng
| Nhóm / tính năng | ep001 | _template | ep002 | Thiếu ở đâu / cách bật |
|---|---|---|---|---|
| **Hậu kỳ** grade, bloom, dof, vignette+hạt | bật | bật | bật [T] | đủ. `outline` TẮT cả hai (mặc định `FX_DEFAULTS`, post.js:38) |
| `faceLive`, `tangXa` | **tắt** (EPISODE, chốt hình) | mặc định bật | bật [T] | khác biệt có chủ ý, không phải lỗi |
| Công tắc trong trình phát | 53 ô | như ep001 | 53 ô, đủ nhãn [T] | `export-ui.js:344-348` đọc `getOptions().fx` + `fxLabels` (post.js) → mọi fx tự hiện. Nhãn `tangXa` = "Tầng bổ sung" mơ hồ (post.js:73) |
| `chuTungChu` (phụ đề từng chữ) | chạy | **không có mã** | ô bật nhưng **vô hiệu** | template `caption()` không có nhánh karaoke / `cap.y` / co chữ; `captions.js` ep002 chỉ `[t0,t1,chữ]`, không mốc từng chữ. Mã mẫu: `ep001/index.html:134-160` |
| Trời 6 ảnh + sương chân trời (ngày) | `town`: skybox_sky-7 [T] | — | **kenneyTown: chỉ gradient `sky`** [T] | `registerTownEnv` (town.js:260) dựng env tay → không có `e.skyMesh/skyMeshNight` (do `def()` envs.js:148-149 gán). Sửa engine |
| Trăng, sao đêm | iceSea/forest có [T] | — | **kenneyTown đêm: không trăng/sao** [T] (s053 = `sky` gradient) | cùng nguyên nhân. bedroom đêm chỉ có `out_sky`, factory đêm có skybox_sky-9 [T] |
| Mây / bóng mây / núi xa / rừng xa | `town` có (cloudShade, backdrop, farwoods) | — | kenneyTown **không có** [C: envs/town.js:168-182 chỉ ở env `town`] | ô fx có nhưng vô tác dụng với kenneyTown |
| Xe + dân đi bộ (`traffic`, `villagers`) | `town` qua `townLife` | — | kenneyTown không có [C: `townLife` chỉ import ở envs.js / envs/town.js] | chỉ còn 8 `crowd` đứng sẵn |
| Đèn đường / cửa sổ sáng đêm | không dùng đêm | — | **không sáng**: emissive 0, chỉ 1 PointLight (đèn nhân vật) [T]; `setNight(){}` rỗng (town.js:256) | dữ liệu không đủ, phải sửa engine |
| Thời tiết/giờ (`gioThoiTiet`) | không dùng | — | dùng đủ, `time` ở mọi shot [T]; weather chỉ nang/may/suong (0 mưa/giông) | đúng cơ chế; nội thất (kitchen/bedroom/shop-in) bỏ thời tiết (gio-thoi-tiet.js:16) |
| Đèn nhân vật | tự (có time) | — | bật [T] (pl=1 mỗi shot) | đủ |
| IBL (`scene.environment`), scans | bật | — | bật [T] | đủ |
| Vật liệu `applyMaterials`+`MATS.ready` | có | có | có [T]: 15404/16330 mesh có `matKind` | 926 mesh chưa gắn: env tĩnh không dùng (ocean 290, kitchen, hawaii…) + **đạo cụ ep002**: `thung_dan_mat` 18, `thung_bach_giau` 30, `bang_tin` 14, `env_shop-in` 184, `factory` 26 → khai `khaiBao()` trong props-kb.js / shop-in.js |
| Bụi/cũ `applyGrunge` (char, build) | có (+`aged` nhà) | có | có [T], `EPISODE.wear` được đọc | đủ |
| AUTO foot / prints / puffs | nhà có chân | — | **chết**: `footEvents` (shots.js:62) chỉ tính chân NHÀ (`houses:{}` ở ep002) | nhân vật đi/chạy không có bụi chân, dấu chân; `breath` chỉ khi tuyết (shots.js:96) |
| Bóng đổ nhân vật | có | có | có (stage) | đủ |
| Mặt sống (chớp, gaze, đồng tử, mix) | tắt | có | R15 có; **Gà không** (xem §3); gấu stub | §3 |
| Nhép miệng (`talk`) | có | có | bật nhưng **0 shot `talk`** [T] | dữ liệu; `talkFace` không hiểu Gà (luôn `binh_thuong`) |
| Ghi công | tắt | tắt/ảnh | tắt | đủ |
| Âm thanh: 4 lớp + lời | 5 track | khai báo `addAudioLayers` | **5 track** [T] (narration, nen, buoc-chan, khoanh-khac, nhac) | đã vá; **không có EN** (narration_en/captions_en), không `beats.json`, không `voices/` |
| Ducking, −14 LUFS | player | player | player | chung ở `export-ui.js` (xuất MP4); không phải việc của tập |
| Cue tiếng động | 122 (42/phút) | — | `cues_s001-s114.json` = 37 mục (~18/phút) [C] | dưới chuẩn ≥20/phút; tên file còn "s114" (tập nay 104 shot) |
| `index.html` khởi tạo | gốc | = ep002 [T diff] | = template, chỉ khác đường dẫn/thời lượng | xem §2 |
| Shader | 104 program [T] | — | **181 program** [T] (ngưỡng ⚠ 80) | không `warmEnv` → `__ready` chậm (chưa đo giây) |

## 2. Diff `index.html` (đã bỏ khác biệt dữ liệu)
ep002 ≡ _template (chỉ đổi đường dẫn). ep001 có mà **template/ep002 thiếu**: (a) `caption()` karaoke + `cap.y` + co chữ + CSS `#cap .w` (`ep001:134-160`); (b) `warmEnv`/`warmShots`/`sig()` biên dịch shader theo env, dịch dần ở nền (`ep001:165-215`, đang dính `doSnap` bưu thiếp → phải tách); (c) chế độ `?peek=1`; (d) `postcardsTroika*`, `snapPostcards`, `setPostcardLang` (riêng ep001, không cần). Template có mà ep001 thiếu (tốt): `createDirector({episode})` (time/weather mặc định), `addAudioLayers` động, `addEnglish`, `propsKb`, `buildTown/registerTownEnv`, `ganDaoCu`, `noiNhom`. Khác nhỏ: ep001 `@font-face Patrick Hand font-weight 400`.

## 3. Biểu cảm: Gà vs R15 vs R6 vs gấu (đầu vào cho "áp mặt Gà cho vai phụ + dân làng R6")
- **Gà** (`ga-rig.js:223-276`, `r15.js:104-111 GA_FACES`): 37 ảnh decal 362² nét đen nền trong suốt (`assets/characters/ga/faces`) vẽ vào canvas 512² của miếng `face`, tự căn bbox. Tên: binh_thuong, o_tho, cuoi_rang_tho, cuoi_ra_nuoc_mat, phan_khich, nan_ni_moi_vien_den, buon_rung_rung, khoc_oa, que_do_mat, ren_do_mo_hoi, hoang_so, soc_ha_hoc, la_het, met_moi, nghien_rang_tuc_gian, quat, nghi_ngo, boi_roi, cuoi_dac_y, ghe_tom, cuoi_guong, kiet_suc, ngo_ngac, buon_ngu, quyet_tam, thac_mac, ngam_nghi, thiet_ha, a_ra_roi, hoi_loi, dao_mat, ban_tin_ban_nghi, nhin_cuoi, im_lang_kho_xu, thi_tham, tho_phao, nhay_mat. `GA_FACE_MAP` chỉ ánh xạ **16 tên phim** (smile…moved, grin, shy); **21 ảnh còn lại chỉ gọi bằng tên Việt** (`face:'quyet_tam'`). Chuyển mềm = crossfade 1/8 bước. **KHÔNG** chớp, gaze, đồng tử theo đêm, nhép (`faceAtGa` bỏ qua `live/gaze/pupil`).
- **R15** (`r15.js:898-960, 1082-1200`): 16 biểu cảm thủ tục `FACE_PRESETS` (+ extras blush/sweat/tears/shine/cold_cheeks) xếp lớp brows/eyes/mouth; `mixFace`; mặt sống = chớp 3–5 s, saccade, gaze theo `lookAt`, đồng tử theo đêm, nhép 'o'/'open'. **R15 đã hỗ trợ `faceSet`** (`r15.js:100,1052,1122`, đường Gà v1): chỉ cần truyền `faceSet` nhưng mất toàn bộ mặt sống.
- **R6** (`r6.js:15-38,131-134,162-350`): 8 mặt vẽ canvas 256² (classic|cartoon), chỉ `setFace`. **Không** có `faceAt/sampleFace/lastPose`; `shots.js:296` gọi `a.faceAt(...)` không guard ⇒ **ném TypeError khi `faceLive` bật**. `cast.js:31-37` chỉ có kind ga/bear/r15 (không có r6). Tên 24 animation R6 = R15 (khớp tên, chất lượng pose chưa kiểm). `townlife.js:5,91` dùng R6 cho dân đi bộ bản cũ.
- **Gấu**: `bear.js:321` `faceAt` trả stub; `bear-glb.js` không mặt biểu cảm [C].
- **Cách khả thi nhất** (vừa–lớn, không đổi hình ep001 vì mọi bước đều sau cờ): (1) *R6 cho đủ giao diện*: `faceAt/sampleFace` stub, `lastPose`, kind `r6` ở `cast.js` + `R6_KNOWN` (nhỏ). (2) *Thư viện mặt chung* `engine/face-lib.js`: tách `loadGaFaces`, `GA_FACE_MAP`, `gaDraw` (bbox tự căn, `ga-rig.js:247-262`) dùng cho ga/r15/r6; cờ diễn viên `faceSet:1` hoặc `EPISODE.faces:'ga37'`, `cast.js` tải bộ ảnh 1 lần (đã làm cho Gà ở `cast.js:67`). (3) *Tên*: mở rộng `FACE_ALIAS` (cast.js:43) + 21 ảnh còn lại thành tên Anh/Việt; `talkFace` map `x~o`→`o_tho`, `x~open`→`cuoi_rang_tho` cho decal. (4) *Chớp*: không có ảnh nhắm → dùng `nhay_mat` thưa, hoặc lớp mí màu da (cần đo vùng mắt) — để sau. Lưu ý: decal Gà vẽ cho mặt Gà; trên đầu R15/R6 phải xem bằng mắt (mũ/tóc che miếng mặt `GA_PATCH`, r15.js:353) — **chưa kiểm hình**. Dân làng nhiều (crowd 8 + 26 villagers): canvas 512²/người tốn bộ nhớ → dùng 6–8 mặt đại diện hoặc canvas 256².

## 4. Dây chuyền
`storyboard.py:526-533` **sao chép** `_template/index.html` một lần lúc sinh tập → sửa template sau đó không lan sang ep002 (phải vá tay như đã làm). `storyboard.py:446-474` sinh `episode.js` không có `credits/wear/propsGlb/bearGlb/faceLive/tangXa/time/weather mặc định`, và `town` không có bảng màu. `lam-phim.mjs` 8 bước (kich-ban, giong, asset, mau-duyet, shot, ra-loi, am-thanh, gop) **không có bước** kiểm skybox/đèn đêm/EN/beats/karaoke; bảng "Chuẩn ep001" trong SKILL.md là kiểm tay. Skill tự ghi "Chưa vào tập mẫu": phụ đề từng chữ + `cap.y`, `warmEnv`.

## 5. THIẾU Ở EP002 (xếp theo mức nhìn/nghe thấy)
**CAO**
1. Thị trấn không có trời/trăng/sao/mây thật (gradient phẳng; đêm 17 shot kenneyTown). `engine/town.js:260` — cho `registerTownEnv` đi qua `envs.define(name, light, (g,e)=>{ g.add(town.group); return {update, setNight, places}; })` để `def()` gán skybox ngày/đêm + trăng (hoặc xuất `skyboxFor(e)` từ envs.js). **Vừa**; ep001 không đổi (dùng env `town`); phối hợp agent đang sửa `town.js`.
2. Đêm thị trấn tối đen, không đèn đường/cửa sổ ấm: `town.js:256 setNight(){}`; viết `setNight(k)` bật emissive vật liệu cửa sổ/đèn Kenney (+ vài sprite glow), gọi từ `envs.use` khi `L.night`. **Vừa**; ep001 không đổi.
3. Biểu cảm vai phụ/dân làng nghèo (R15: 16 thủ tục; gấu: 0) so với Gà 37 → §3 bước 2–3. **Lớn**.
4. R6 chưa nối (`cast.js` không kind r6, `r6.js` thiếu `faceAt`, TypeError với `faceLive`) → §3 bước 1. **Nhỏ**, bắt buộc trước khi chuyển dân làng.
5. Phụ đề từng chữ không chạy (ô bật mà không đổi gì): port `caption()` từ `ep001/index.html:134-160` vào `_template/index.html` + `tools/caps_vi.py --whisper` ra `captions.js` có mốc từng chữ. **Vừa**, không rủi ro ep001.
**VỪA**
6. Không mây/núi xa/rừng xa/xe/dân đi bộ ở kenneyTown (fx có nhưng vô dụng): gắn `createBackdrop/createFarwoods/townLife` như `envs/town.js:154-182` vào `registerTownEnv`. **Vừa**.
7. Nhân vật đi/chạy không bụi chân/dấu chân (`shots.js:62-96` chỉ nhà có chân): thêm `footEventsActor` theo pha `walk/run`, cờ `AUTO.charFoot` mặc định **tắt** (ep001 không đổi), ep002 bật qua `EPISODE`. **Vừa–lớn**.
8. `__ready` chậm: 181 program, không `warmEnv`. Port `warmEnv` vào template, tách `doSnap`; hoặc giảm số program (`node tools/shaders.mjs episodes/ep002/index.html`). **Vừa**.
9. Tiếng động: 37 cue (~18/phút) < 20/phút; đổi tên `cues_s001-s114.json`; không `beats.json`; không EN. Chạy `gen-cues.mjs`+`tieng-dong`; EN theo `giong-doc`. **Vừa**.
10. ~100 mesh đạo cụ ep002 chưa khai chất liệu (`thung_*`, `bang_tin`, `env_shop-in` 184, factory 26): `khaiBao` trong `props-kb.js`/`shop-in.js` (hai file đang bị agent khác sửa). **Nhỏ**.
**THẤP**
11. Nhãn FX `tangXa` mơ hồ (post.js:73) — **nhỏ**. 12. `talkFace` Gà luôn 'binh_thuong' (ep002 chưa có shot `talk`) — **nhỏ**. 13. ep002 không dùng weather mưa/giông (kịch bản) — dữ liệu. 14. `?peek=1`, `Patrick Hand` weight chưa có ở template — **nhỏ**. 15. Factory (không trong NOI_THAT) vẫn hiện skybox ngoài trời [T]: cần xem khung xem có lộ qua cửa không — **nhỏ**.

## 6. Gói sửa đề xuất (thứ tự) và phần đưa vào _template / lam-phim
- **Gói A – thị trấn (engine, mọi tập hưởng)**: #1, #2, #6 trong `registerTownEnv`/`setNight`. Chụp A/B ep001 (`look.mjs --ab`) chứng minh không đổi hình.
- **Gói B – template**: #5 (karaoke+`cap.y`), #8 (`warmEnv`), `?peek`; làm `tools/sync-template.mjs` (so `index.html` tập với template, vá phần chung, giữ đường dẫn/dữ liệu) để tập đã sinh nhận bản sửa; `storyboard.py` sinh `episode.js` kèm `credits:false, wear:{}, propsGlb, bearGlb`.
- **Gói C – nhân vật**: #4 → #3 (R6 giao diện → face-lib → alias/nhép) rồi chuyển dân làng sang R6, kiểm từng shot bằng `look.mjs --pose`.
- **Gói D – chân**: #7. **Gói E – âm**: #9, #10.
- **Vào lam-phim**: bước kiểm tự động "chuẩn ep001" (`tools/kiem/chuan-ep001.mjs`) mở trang, đọc `getOptions()` + `renderer.info`: có skybox ở shot ngoài trời, đèn nhân vật, ≥4 track, số program, ô karaoke có mốc từng chữ, cue/phút; in bảng đạt/không trước MỐC DUYỆT 2. Mục "Chưa vào tập mẫu" của SKILL.md chuyển thành đã có sau Gói B.
- Chưa kiểm: mắt nhìn các khung (không mở ảnh), giây `__ready`, LUFS các lớp sau khi dựng lại, hình decal Gà trên đầu R15/R6.
