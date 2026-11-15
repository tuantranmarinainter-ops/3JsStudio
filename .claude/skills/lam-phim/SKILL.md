---
name: lam-phim
description: Điều phối cả dây chuyền "một câu luật → phim HTML" sau khi người dùng đã duyệt kịch bản đầy đủ (MỐC 1b) — chạy node tools/lam-phim.mjs <ep>, giao việc cho tối đa 3 agent Sonnet khi tool báo canAgent, dừng ở MỐC DUYỆT 2 (bảng mẫu 00_mau.jpg), chạy giọng CapCut nền, dựng shot, vòng rà lỗi, tiếng động/nhạc/phụ đề/ghi công, gộp dist/<ep>.html. Dùng BẤT CỨ KHI NÀO người dùng nói "làm phim", "chạy lam-phim", "dựng cả tập từ kịch bản", "tiếp tục làm tập epNNN", "bước tiếp theo của dây chuyền", "đến đâu rồi" — kể cả khi không nhắc tên skill.
---

# Làm phim — điều phối dây chuyền 8 bước

Đầu vào: `episodes/<ep>/kich-ban.md` đã qua `python tools/kb/lint.py` 0 lỗi và người dùng đã duyệt (MỐC 1b, skill `viet-kich-ban`).
Đầu ra: `dist/<ep>_xem-thu.html` (bản nháp khi giọng thật chưa xong) rồi `dist/<ep>.html` + `dist/<ep>_theo-doi.html`.
Spec: `docs/superpowers/specs/2026-11-12-quy-trinh-mot-cau-luat-ra-phim-design.md` (mục 4, 6.2, 7.2, 8, 9).

## Hai đầu vào (tool tự nhận)
| Đầu vào | Khi nào | Dây chuyền |
|---|---|---|
| **1. Bảng 19 cột** `episodes/<ep>/kich-ban.md` | không có kit | đường CŨ (mọi mục bên dưới, ep001–ep003) |
| **2. Kit** `kich-ban/<ep>/kit.json` + `bang-shot.json` (+ `goc.json`, `hinh/`) | có đủ 2 file đó, hoặc `--kit <thư mục>` | đường MỚI (trạm 10–12 của `docs/quy-trinh-kich-ban-tinh.md`); JSON trả về có `kit:"<thư mục>"` |

`--cu` ép đường cũ dù có kit. Vẫn 8 bước, vẫn bước nào chỉ chạy lại khi đầu vào đổi; khác ở cách làm từng bước:

| Bước | Trạm | Nhánh kit làm gì |
|---|---|---|
| `kich-ban` | 10 | `kiem-kit.mjs <kit>` (`--khong-hinh` nếu chưa có `hinh/`); lỗi → `canAgent` sửa `kit.json` |
| `giong` | 12 | như cũ, nhưng lời kể suy từ `bang-shot.shots[].thoai` (`@at` = tổng `dur` các shot trước); chỉ tạo khi chưa có `narration.txt`, không đè bản đã chỉnh tay |
| `asset` | 7 | mỗi bối cảnh kit: env trong `goc.json` (mặc định = id bối cảnh) phải có `def('<env>'` trong `engine/envs.js`; thiếu → `canAgent` scene-env. Đạo cụ/animation kit không liệt kê nên KHÔNG kiểm tự động |
| `mau-duyet` | 10 **STOP** | **MỐC DUYỆT KIT**: chưa duyệt → `canNguoiDung` (mã 1). Người dùng xem `kich-ban/<ep>/KIT.html` rồi bạn chạy `node tools/lam-phim.mjs <ep> --duyet-kit` (ghi `duyet-kit.json` kèm hash kit; kit đổi là phải duyệt lại). KHÔNG sinh shot khi chưa duyệt |
| `shot` | 11 | `kit-shots.mjs <kit> --ra episodes/<ep>/shots.js [--goc goc.json]`. Chỉ sinh khi kit đổi (sao lưu `shots.js` cũ vào `output/<ep>/kiem/sao-luu/`), KHÔNG sinh lại khi giọng xong → giữ chỗ "CẦN SỬA TAY". Thiếu `episode.js`/`index.html` → `canAgent` khai (lấy từ `_template`/`_mau-kit`) |
| `ra-loi` | 11 **STOP** | như cũ (kiem-luat + ra-loi). Sau đó chụp kiểm bằng skill `kiem-tra-khung` (`look.mjs --shots … --gates`, so với ảnh shot bước 9) → **duyệt bảng khung** là mốc người dùng của trạm 11 |
| `am-thanh`, `gop` | 12 **STOP** | như cũ; người dùng xem phim `dist/<ep>_xem-thu.html` / `dist/<ep>.html` |

Đường kit: bỏ qua `lint.py`, `asset-plan`, `mau-duyet.mjs`, `shot-gen`, `storyboard.py`. `kiem-kit` và `kit-shots` là công cụ thuần nên chạy THẬT kể cả khi `LAM_PHIM_GIA=1`. Tập kit dựng thử người khác đang chạy (ví dụ ep004): chỉ ĐỌC kit gốc, thử trên bản sao (`--kit output/_tmp/...`) với tên tập giả.

## Công cụ duy nhất bạn gọi
```
node tools/lam-phim.mjs <ep> tiep          # chạy các bước cần chạy cho tới khi gặp việc cần agent / người dùng
node tools/lam-phim.mjs <ep> trang-thai    # chỉ đọc: 8 bước, bước kế tiếp
node tools/lam-phim.mjs <ep> <buoc> [--force]   # đúng 1 bước (kich-ban asset giong mau-duyet shot ra-loi am-thanh gop)
node tools/lam-phim.mjs <ep> tiep --kit <thư mục kit>   # ép nhánh kit từ thư mục bất kỳ (bình thường tự nhận khi có kich-ban/<ep>/kit.json); --cu = ép đường cũ
node tools/lam-phim.mjs <ep> --duyet-kit   # ghi duyệt kit (MỐC trạm 10) rồi chạy tiếp
node tools/lam-phim.mjs <ep> tiep --nhap   # ra-loi: CHẤP NHẬN lỗi còn lại cho bản nháp (ghi duyet/02_loi/chap-nhan-nhap.json + canhBao), đi tiếp am-thanh/gop ra dist/<ep>_xem-thu.html
node tools/lam-phim.mjs <ep> tiep --cho-phep-troi   # ghi quy-trinh.json ghiCong.choPhepTroi=true (trời "người dùng chịu trách nhiệm" được qua ở bản CUỐI)
```
Tool KHÔNG gọi LLM, không commit, không push. Stdout là một khối JSON; log ở stderr. Mã thoát: `0` chạy được (kể cả chờ agent / giọng nền), `1` cần người dùng, `2` lỗi môi trường.
```
{ ep, buocTiep, canAgent:[{viec,file,model}], canNguoiDung:null|{lyDo,anh}, daChay[], daBo[], dangChayNen[], canhBao[], lien, toiDaSongSong:3 }
```
Mỗi bước chạy lại CHỈ khi đầu vào đổi (hash): sửa kịch bản → chạy lại từ đầu (giọng chỉ tạo lại nếu lời kể đổi); sửa `narration.json` (giọng thật xong) → chỉ `shot`, `ra-loi`, `am-thanh`, `gop`.

## Vòng điều phối (3a–3f)
0. Nhánh riêng: `git switch -c <ep>` (nếu chưa có). **Sau mỗi bước đạt → commit** với thông điệp rõ (implementer/agent KHÔNG commit; chỉ agent chính commit). Không push, không merge khi chưa được bảo.
1. Chạy `tiep`, đọc JSON:
   - `canAgent` khác rỗng → giao việc (xem "Quy tắc agent"), đợi xong, kiểm lại (diff, chạy lại `tiep`), không tin báo cáo agent chưa kiểm.
   - `canNguoiDung` khác null → DỪNG, báo người dùng đúng `lyDo` + đường dẫn `anh`; không tự quyết thay (mục 8 bên dưới).
   - `dangChayNen` có `giong` → bình thường, dựng hình không chờ (đã chạy `--dry` để có nhịp).
   - Mỗi bước đạt → đẩy `node tools/theo-doi.mjs <ep> --json` lên artifact "Bảng sản xuất phim" (ArtifactData, ghi vào dataset `tap/buoc/loi/token`) để người dùng xem từ xa; chỉ đẩy ảnh nhỏ (bảng mẫu, lưới lỗi).
2. **3a asset** — `thieu.json` còn gì thì `canAgent` liệt kê (bối cảnh = skill `scene-env`, đạo cụ = `ref-model`, animation R15 = `r6-anim`); mỗi bối cảnh một file `engine/envs/<tên>.js`. Chạy lại `tiep` đến khi thiếu = 0.
3. **3b giọng CapCut** khởi chạy NỀN ngay sau khi `kich-ban` đạt (thứ tự chạy: kich-ban, giong, asset, mau-duyet, …; giọng chạy song song trong lúc agent dựng asset, JSON có `giongNen:{pid,batDau,log}`; python CapCut chỉnh bằng biến `LAM_PHIM_PY_CAPCUT`): `--dry` trước rồi `python tools/tts.py` (giọng mặc định tiếng Việt `BV075_streaming` Thanh Niên Tự Tin). CapCut lỗi hoặc log không đổi 30 phút → `canNguoiDung`; **KHÔNG tự đổi sang Edge**. Danh sách giọng dùng: `python tools/voices_build.py <ep> list`.
4. **3c mau-duyet** → `output/<ep>/duyet/00_mau.jpg` = **MỐC DUYỆT 2**. Chưa duyệt thì tool dừng với `canNguoiDung`; KHÔNG dựng shot khi chưa duyệt. Người dùng duyệt: `node tools/mau-duyet.mjs <ep> --duyet tat-ca` (hoặc `--tu-choi <muc,…>` → chỉ chụp lại mẫu đó). Duyệt trước rồi mới ghép.
5. **3d shot** — `shot-gen.mjs` (luật camera dồn dập, `--khop-giong` khi đã có `narration.json`).
6. **3e ra-loi** (vòng rà lỗi) — `kiem-luat` → `ra-loi` tự sửa tối đa `goi.vongMax` vòng/nhóm. Lỗi dưới ngưỡng còn lại → `canAgent` rà tay (≤ 3 agent, mỗi agent một nhóm luật, chỉ Edit đúng dòng shot của mình). **Vòng rà lỗi cuối phải chạy SAU khi có giọng thật**: khi `giong` xong, `narration.json` đổi → `tiep` tự chạy lại shot→ra-loi→am-thanh→gop; đừng chốt phim bằng kết quả của giọng `--dry`.
7. **3f am-thanh** (tiếng động nền/bước chân/khoảnh khắc + nhạc + phụ đề + ghi công `ghi-cong.mjs`) → **gop** (chỉ `bundle.mjs` — bản nháp `--out dist/<ep>_xem-thu.html`; KHÔNG `build.mjs all`, lớp `tieng-anh` không chạy trong dây chuyền, lớp `nhac` chỉ khi có `music/plan.json`; rồi `theo-doi.mjs`). Ghi công `ghi-cong.mjs` mã 3 (trời chưa rõ): bản nháp chỉ cảnh báo, bản cuối chặn trừ khi `--cho-phep-troi`.
8. Cuối: đưa link (xem "Giao sản phẩm").

## Chuẩn ep001 — mọi tập mới PHẢI có (người dùng chốt 2026-11-13)
ep002 bản đầu xấu vì bỏ qua chồng tính năng đã tinh chỉnh cho ep001 (xem `docs/so-sanh-ep001-ep002.md`). Trước MỐC DUYỆT 2 và trước khi gộp, kiểm đủ bảng này; thiếu mục nào thì sửa `episodes/_template/index.html` (để tập sau thừa hưởng) chứ không vá riêng một tập. Mọi mục đều có công tắc trong trình phát.

| Lớp | Phải có | Ở đâu | Công tắc |
|---|---|---|---|
| Vật liệu | `applyMaterials` + `await MATS.ready` sau khi đạo cụ vào scene (~38 loại shader + 9 ảnh vân Poly Haven) | `engine/materials.js`, `docs/vat-lieu.md` | `mats`, `matTex` |
| Bụi/cũ | `applyGrunge` TRƯỚC `applyMaterials`; `EPISODE.wear` tuỳ chọn | `engine/grunge.js` | `worn`, `grime`, `aged` |
| IBL, trời, mô hình quét | tự có qua `engine/envs.js` — đừng tắt | `engine/ibl.js`, `skies.js`, `scans.js` | `ibl`, `skybox`, `scans` |
| Hậu kỳ | `createPost` + `post.set({faceLive, tangXa})` | `engine/post.js`, skill `hieu-ung-hinh` | `grade`, `bloom`, `dof`, `vignette`, `outline` |
| Đèn nhân vật | tự bật cho shot khai `time`/`weather` (đêm 1.0, nhà máy 1.5); mặt cận cảnh phải đọc được (luma vùng giữa ≥ 90) | `engine/lights.js` `denNhanVat`, `engine/envs/gio-thoi-tiet.js` | `denNhanVat` |
| Ánh sáng | đêm vẫn tách khối (trăng lạnh + đèn ấm); luma TB shot đêm ≥ 70, không shot nào > 170; `lint.py` W01 cảnh báo > 50% shot đêm, W02 một địa điểm > 30% shot → sửa KỊCH BẢN, đừng để 3/4 phim là đêm | `gio-thoi-tiet.js`, `tools/kb/lint.py` | — |
| Bối cảnh | dùng kho 16+ env (`engine/envs/*.js`, `cong-thuc.js`), đổi cảnh mỗi 3–8 shot; không dồn cả phim vào 2–3 căn phòng | `docs/boi-canh-tang.md` | — |
| Âm thanh | bản gộp phải chứa đủ track có file: `narration`, `sfx_nen`, `sfx_khoanh-khac`, `music_nhac` (+ `sfx_buoc-chan` nếu có tiếng). Sau `gop`: `grep -c sfx_nen dist/<ep>*.html` > 0 | tập mẫu `addAudioLayers()` | từng lớp trong trình phát |
| Tiếng động | ≥ 20 cue/phút, không khoảng trống > 10 s; nền đổi theo bối cảnh, thấp hơn lời ≥ 10 LU | skill `tieng-dong` | — |
| Giọng | NHẸ: Việt 1 giọng `BV075_streaming` (Thanh Niên Tự Tin), Anh 1 giọng `en-US-AndrewMultilingualNeural`; không vai phụ, không bộ nhiều giọng (bộ 25 giọng là riêng ep001). Câu không cắt giữa mệnh đề | skill `giong-doc` | `lang`, `voice`, `subs` |
| Nhân vật | mỗi vai phụ một dấu hiệu nhận ra từ xa (tóc/mũ/đồng phục/đạo cụ), không hai vai chỉ khác màu; không lệch phong cách khối | `episode.js` actors | — |
| Model | 1–3 vật "chủ đạo" mỗi tập; thiếu model → trạm nhập `node tools/nhap-model.mjs tim|nhap|kiem` (Blender **5.1.2**, chỉ CC0/CC BY, **ưu tiên low poly** theo ngưỡng trong `docs/nhap-model.md`; không có low poly → HỎI người dùng, không tự lấy model nặng) rồi mới tới dựng bằng code (`ref-model`) | `docs/nhap-model.md` | — |

Số kiểm nhanh sau khi gộp (ghi vào báo cáo): luma TB cả phim (ep001 = 119; < 95 là tối), `node tools/shaders.mjs <trang>` (vật liệu làm `__ready` chậm ~20 s — ep001 dùng `warmEnv` để dịch dần), số track trong bản gộp, số cue/phút.
Chưa vào tập mẫu (riêng ep001, làm tay khi cần): phụ đề từng chữ + `cap.y`, `warmEnv`, nhà có chân/bưu thiếp.

## Khi nào gọi người dùng (mục 8; ngưỡng ở `episodes/<ep>/quy-trinh.json`, mặc định `tools/kiem/mac-dinh.json`)
- Sau 2 vòng còn > 10 shot lỗi, hoặc 1 luật lỗi ở > 15% số shot → gửi bảng số + `output/<ep>/duyet/02_loi/` + `luoi-loi.jpg`.
- Lỗi không tự sửa: thiếu mô hình/animation, kịch bản mâu thuẫn hình, vật liệu chưa duyệt, silhouette (L10) không đạt sau 2 vòng, tất định (`--det`) lỗi, L5/L9/L12.
- `ra-loi` báo `goi.can` mà bạn chấp nhận cho bản nháp → `--nhap` (hoặc `goi.chapNhanNhap: true` trong `quy-trinh.json`); kết quả kiểm được nhớ theo hash `shots.js` nên không kiểm lại cả phim khi đầu vào không đổi.
- Một bước quá 30 phút không tiến (`goi.phutKhongTien`) → tool tự báo.
- Không bao giờ: push, xoá asset, đổi cốt truyện (twist/kết) khi tự sửa.

## Quy tắc agent (người dùng chốt)
- **Tối đa 3 agent cùng lúc.** Muốn nhiều hơn thì hỏi trước + ước lượng chi phí. Mỗi lần giao nói ngắn: mấy agent, model nào, việc gì.
- **KHÔNG dùng Haiku** cho dây chuyền này. Sonnet cho viết code/dựng asset/rà soát; Opus chỉ cho thiết kế khó (kiến trúc engine, rig, lỗi khó tìm).
- **Mỗi agent sở hữu file riêng** (đúng cột `file` của `canAgent`); không hai agent cùng một file. Không sửa `engine/` dùng chung nếu không được giao.
- Giao việc rõ: mục tiêu, phạm vi file, đã loại trừ gì, "xong khi nào" (tool nào chạy sạch). Không giao cùng một việc cho hai agent, không tự làm lại việc đã giao.
- **Hợp đồng trả kết quả**: kết mỗi đề bài bằng "Ghi đầy đủ vào `output/<ep>/agent/<việc>.md`. Chỉ trả về: đường dẫn đã ghi, tối đa 5 gạch đầu dòng kết luận kèm file:dòng, mục bị chặn / chưa kiểm được. Không chép lại nội dung đã đọc." Trước khi dùng báo cáo: kiểm file báo cáo và file ở cột `file` của `canAgent` có trên đĩa và có đổi (`git diff --stat`); thiếu = việc chưa xong, nhắn lại đúng agent đó.
- **Implementer/agent không commit.** Agent chính kiểm diff + chạy test/tool rồi mới commit.
- Kiểm hình bằng số trước (`look.mjs --pose`, `kiem-luat`), chỉ mở ảnh khi số báo lệch; ảnh nằm trên đĩa, không dán vào chat.

## Giao sản phẩm
Sau MỖI lần sửa xong (kể cả nhỏ) luôn gộp lại và đưa link ở cuối câu trả lời: đường dẫn `S:\3JS Studio\dist\<ep>_xem-thu.html` (bản nháp / chưa chốt) hoặc `S:\3JS Studio\dist\<ep>.html` (bản cuối), kèm `file:///S:/3JS%20Studio/dist/<ep>.html`. Mọi tính năng mới bật/tắt được trong trình phát. Render MP4 chạy trên máy người dùng (nút ⬇ Xuất MP4), không cloud.

## Ghi chú
- Nhân vật chính có thể là **Gà** (`engine/ga-rig.js`, xem `HANDOFF-ga.md`) — CHƯA nối vào `engine/cast.js`; nối là việc của lúc chạy tập (mau-duyet hiện chụp `ga` bằng R15 mặc định).
- Tập làm tay (ep001): các bước ghi vào `episodes/<ep>/` (`shot`, `ra-loi`, `am-thanh`) TỪ CHỐI (mã 1) khi `shots.js`/`episode.js` đã có mà lam-phim chưa từng sinh (dấu `shotSinh` trong `output/<ep>/kiem/lam-phim.json`). Vẫn đừng chạy `tiep` trên chúng; `trang-thai` là đọc an toàn. Chạy lại `shot` sau khi giọng xong chỉ co giãn `dur` (`shot-gen --chi-khop-giong`); chỉ khi kịch bản đổi mới sinh lại, có sao lưu vào `output/<ep>/kiem/sao-luu/<ISO>/`.
- Test tool: `LAM_PHIM_GIA=1 node tools/lam-phim.mjs _test_lamphimX tiep` (lệnh con giả, log ở `output/<ep>/kiem/gia.log`); `node --test tools/tests/lam-phim.test.mjs`.
