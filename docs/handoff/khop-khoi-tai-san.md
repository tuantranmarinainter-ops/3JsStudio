# Khớp tài sản vào khối (KHỐI THẮNG) — kế hoạch

<!-- ĐIỂM DỪNG: tối đa 25 dòng. GHI ĐÈ cả khối mỗi lần cập nhật, không nối thêm. -->
## ĐIỂM DỪNG
- **Cập nhật:** 2026-11-16
- **Nhánh:** `ep1-v2` (không push/merge)
- **Đang làm:** KẾ HOẠCH đã viết, CHƯA code. Chờ người dùng duyệt qua phiên điều phối.
- **Bước kế tiếp:** sau khi duyệt → Bước 1 (`engine/khop-tai-san.js` + test). Đề bài mẫu: "Đọc docs/handoff/khop-khoi-tai-san.md rồi làm Bước 1. Đạt khi … Dừng khi …".
- **Đang chờ:** người dùng duyệt kế hoạch + trả lời 3 câu hỏi mở (cuối file).
- **File đang dở (chưa commit):** không (chỉ file này).
- **Đang chạy nền:** không.
- **Đạt khi (cả việc):** ở ep005t, thay khối bằng tài sản thì vị trí/chân đế/hướng/góc camera không đổi; mỗi món báo % lệch từng chiều; lệch > 20% được cảnh báo ngay ở trang duyệt và sau khi thay; `?rb=0` vẫn về khối.
- **Câu hỏi còn mở:** 3 câu ở mục 9.
<!-- /ĐIỂM DỪNG -->

## Việc còn lại (theo thứ tự)
Bước 1 → 6 ở mục 6. Mỗi bước một phiên Sonnet, một nhóm tại một lần (đúng luật `docs/roblox.md` mục 7).

## 1. Hiện trạng — khối → tài sản đang nằm ở đâu
Luồng thật (ep005t): Codex vẽ ảnh khối xám → `xu-ly-kich-ban` viết `kich-ban/ep005t/boi-canh/<id>.json` (danh sách MỐC) → `tools/ep5t-boi-canh.mjs` sinh `engine/envs/ep5t-<id>.js` → `engine/envs/ep5t-chung.js` dựng hộp (hoặc model).
- **"Khối" = mốc trong `boi-canh/<id>.json`**: mỗi mốc có `id, ten, vaiTro, bat, vung ("x a..b, y a..b, z a..b"), mau, vatLieu`. KHÔNG có: loại vật, hướng mặt trước, điểm neo, điểm chạm. (Chỉ 1 mốc có `ghiChu`.) Quy ước trục: gốc = tâm sàn, y=0 mặt đất, +Z về camera chính (`heQuyChieu` trong json).
- **Bảng model đã chốt cho mốc** nằm TRONG code tool, không trong dữ liệu khối: `tools/ep5t-boi-canh.mjs:15-45` (`NHA`, `DUNG`, `THEM`; cờ `ry`, `deu`, `he`, `mong`, `vung`, `bo`, `giuKhoi`). Hướng mặt trước = `ry: Math.PI` gõ tay từng món.
- **Chỗ co/đặt tài sản vào vùng**: `engine/envs/ep5t-chung.js:42-62` (`datModel`):
  - `deu`: co đồng dạng = min(vùng/model) trên các trục dày > 0,5 stud, nhân `he` (`:46-52`).
  - không `deu`: `o.scale.set(sx, 1, mong ? min(sx,1) : sz)` với `sx = dx/model.x`, `sz = dz/model.z`, chiều cao ép bằng `fit(id, dy)` (`:44`) → **kéo méo X và Z độc lập, không có trần**: 1 nhà cao 12 vùng rộng 20 sâu 6 sẽ bị ép dẹt thoải mái, không ai biết.
  - đặt: đáy chạm `v.y[0]`, giữa x/z (`:50,59`), xoay `ry`.
  - Vòng lặp mốc `:65-77`; không có model/`?rb=0` → hộp đúng `vung` (`:71-76`). Không hề đo/ghi độ lệch.
- **`fit()` chung** `engine/envs.js:81-89`: co theo MỘT trục (y hoặc xz) rồi đặt đáy y=0, giữa x/z. Dùng cho env cũ (ep001–003), không đụng.
- **Nhập tài sản**: `tools/nhap-model.mjs nhap` → `tools/blender/chuan_hoa.py:3-4,20,304` đã chuẩn hoá: gốc tâm đáy, Y lên, `--cao`, `--xoay` đưa mặt trước về +Z; ghi `bbox` (rộng, cao, sâu — stud) vào `assets/manifest.json` (vd `nhap/ep5t-ban-ghe-go` bbox 5 × 4,577 × 9,982). **Bước 2 (chuẩn hoá) phần lớn ĐÃ CÓ**; chỉ thiếu "mặt trước đã xác nhận" và kiểm tra bằng số.
- **Trang duyệt**: `tools/nhap-model.mjs:271-279` (`fileUngVien`) tạo ứng viên chỉ có `nguon, tacGia, giayPhep, tamGiac, ảnh`; `tools/duyet.mjs:513-516` (`veMeta`) chỉ in các trường đó. Chưa hề biết khối đích hay kích thước ứng viên. Roblox `roblox.mjs xem <id>` đã in `hopBao` (`tools/roblox.mjs:416-430`) nhưng tốn 1 request/mẫu.
- **Cổng kiểm**: `tools/gates.mjs` + `tools/gates.json` — chỉ có cổng nhân vật (chân, đầu, mặt, xuyên) và luật camera; KHÔNG có cổng "tài sản lệch khối".
- `ep5t-chung.js` đã chạy được `?rb=0`, vật nhỏ `deu`, vật "thêm" (`THEM`) → các luật mới chỉ cần thay phần ruột `datModel`, không đổi giao diện env.

## 2. Nguyên tắc
Khối THẮNG: `vung` (vị trí, chân đế = y đáy, hướng, vùng chiếm) cố định; camera không đổi vì mọi shot đã dựa vào hộp. Tài sản co/đệm/lặp để vừa; phần dư/hụt được BÁO bằng số. Không bao giờ dời mốc theo tài sản.

## 3. Thiết kế dữ liệu
### 3a. Khối (file mốc `boi-canh/<id>.json`, thêm trường TUỲ CHỌN — thiếu = suy ra, file cũ vẫn chạy)
| Trường | Ý nghĩa | Mặc định |
|---|---|---|
| `loai` | `do-vat` · `cay` · `nha` · `hop` · `dai` · `tam` · `noi-that` | suy từ kích thước vùng: trục dài/ngắn > 4 → `dai`; mỏng < 1 → `tam`; còn lại `do-vat` |
| `huong` | mặt trước nhìn về `+z` `-z` `+x` `-x` | `+z` (về camera chính) |
| `neo` | điểm neo | `day-giua` = (giữa x, `y0`, giữa z) — đúng cách `datModel` đặt hiện nay (`:50,59`) |
| `cham` | điểm chạm cần khớp (chỉ `noi-that`): `{ten:"mat-ghe", y:0.45}` hoặc `mat-ban`, `khung-cua`, `chan-nha` | không |
| `lech` | ngưỡng riêng của mốc (% cho phép) | theo bảng luật mục 4 |
Ai điền: `xu-ly-kich-ban` (Claude) khi viết danh sách mốc; người dùng sửa được ở trang duyệt (mục 5). Hiện `ry` gõ tay trong `tools/ep5t-boi-canh.mjs` sẽ chuyển thành `huong` đọc từ dữ liệu (tool vẫn cho ghi đè).

### 3b. Tài sản (đã có `bbox` trong manifest; thêm trường tuỳ chọn)
- `bbox` (có sẵn): [rộng, cao, sâu] sau chuẩn hoá. Gốc = tâm đáy, mặt trước = +Z (`chuan_hoa.py`).
- Thêm vào dòng manifest: `mat: "+z"` (xác nhận), `chan: [x,z]` (nếu chân đế lệch tâm), `cham: {"mat-ghe":0.45,...}` (tỉ lệ theo cao), `lap: {truc:"x", chuKy: <stud>}` (cho `dai`).
- Bổ sung bằng 1 lệnh đo: `node tools/nhap-model.mjs do <id|--tat-ca>` (dùng `@gltf-transform/core`, đã có trong `package.json`; không cần Blender) — đo lại bbox từ GLB thật, so với manifest, in lệch; `kiem` thêm kiểm: bbox có, đáy y≈0, tâm x/z≈0 (±5%).
- Ứng viên CHƯA nhập (giai đoạn duyệt): bbox lấy từ GLB tải thử đã có ở bước "tải thử GLB, chụp 2 góc" (`docs/roblox.md` mục 3.2) — đo bằng cùng hàm; Roblox có thể dùng `hopBao` của `xem`. Ghi vào file ứng viên: `ungVien[i].bbox`.

## 4. Luật khớp (một hàm thuần, không phụ thuộc three)
Mô-đun mới **`engine/khop-tai-san.js`**: `khop({bbox, vung, loai, huong, cham?, opt}) → { scale:[sx,sy,sz], lap:{n,buoc}|null, off:[x,y,z], rotY, lech:{x,y,z}, tong, canhBao:[…] }`. Tất định, test được bằng `node --test`, dùng chung cho runtime (`ep5t-chung.js`), trang duyệt và tool sinh env.
`lech.x|y|z = |kích thước tài sản sau khớp / kích thước vùng − 1|` (sau khi xoay theo `huong`; trục mỏng < 0,5 stud bỏ qua, như `:47` hiện nay).
| `loai` | Cách khớp | Cho phép |
|---|---|---|
| `do-vat`, `cay` | co ĐỀU theo chiều cao vùng, đáy chạm `y0`, đặt giữa; nếu x/z tràn vùng > 10% thì co thêm cho vừa (ưu tiên không tràn ra ngoài khối) | co đều, không méo |
| `nha` | co đều `s = min(rộng, cao, sâu của vùng ÷ của model)` (không tràn chân nhà, camera zoom-out thấy trọn chân), đáy chạm đất | co đều; thừa chiều cao còn lại báo `lech.y` |
| `hop` (kho, quầy, bàn lớn) | co đều rồi cho kéo lệch riêng từng trục ±15% (`s_i ∈ [0,85·s, 1,15·s]`) để lấp vùng | ±15%/trục |
| `dai` (hàng rào, tường, đường, dãy nhà) | không kéo: **lặp mẫu** theo trục dài, `n = round(L/chuKy)`, giãn nhẹ ≤ 8% cho vừa đủ L; tiết diện co đều theo chiều cao | n ≤ 40; > 40 → báo |
| `tam` (vách, cửa, sàn, bạt) | kéo 2 trục phẳng khớp vùng; độ dày giữ theo model (đúng `mong` hiện nay `:56-57`) | kéo phẳng, dày không đổi |
| `noi-that` có `cham` | co đều theo chiều cao, rồi tịnh tiến `y` sao cho điểm chạm tài sản (`cham.mat-ghe × cao`) trùng điểm chạm của khối; không có `cham` thì xử như `do-vat` | dịch y ≤ 15% cao |
Cả 6 luật đều giữ: neo = đáy-giữa của vùng; `rotY` theo `huong`; không bao giờ dời `vung`. Luật theo loại là mặc định; ghi đè từng món bằng `opt` trong bảng `tools/ep5t-boi-canh.mjs` (thay các cờ `deu/he/mong` rải rác, giữ tương thích: cờ cũ đọc được).
`canhBao`: lệch bất kỳ trục > 20% (hoặc ngưỡng `lech` của mốc); `lap.n` quá lớn; tràn khối > 10%; model quá mỏng/quá dài so với vùng (tỉ lệ dáng khác > 2×) → khuyên "chọn mẫu khác", không tự ép.

## 5. Thay đổi trang duyệt (`tools/duyet.mjs`, `tools/nhap-model.mjs`)
- `nhap-model.mjs tim … --khoi <ep>:<bốiCảnh>:<mốc>` (hoặc `--vung "x -5..5, y 0..3, z -4..4" --loai nha`): gắn khối đích vào file ứng viên (`khe.khoi = {vung, loai, huong}`), đo `bbox` từng ứng viên, chấm `khop()`.
- `duyet.mjs`: thẻ ứng viên thêm dòng **"Lệch so với khối: rộng ±x% · cao ±y% · sâu ±z% — khớp kiểu: co đều / lặp 4 / kéo ≤15%"**; thanh màu: xanh ≤10%, vàng 10–20%, đỏ > 20% (kèm huy hiệu ⚠ "lệch quá"). `veMeta` `tools/duyet.mjs:513` là chỗ chèn; thêm bộ lọc/xếp "ít lệch trước" (ô sắp xếp cạnh thanh tìm kiếm hiện có).
- Ảnh xem thử có **khung dây của khối** chồng lên model: dùng trang xem model có sẵn (`tools/xem-model.html`) thêm tham số `?khoi=…` vẽ hộp dây đúng vùng (không phải ảnh Roblox 2D; ảnh chụp do agent phụ làm, không để trong phiên chính). Mỗi ứng viên 1 ảnh nhỏ cạnh ảnh gốc.
- Khối có `loai` sai/thiếu: ô chọn loại nhỏ ngay trên thẻ khe, kết quả duyệt trả về cùng `chon` (người dùng sửa loại → `nhan` ghi vào mốc). Đây là phần tuỳ chọn của Bước 4.
- Tất cả BẬT/TẮT: `--khong-cham` trên lệnh tim (không đo/chấm), và ô "Hiện độ lệch" trong trang duyệt (nhớ bằng `localStorage`, mặc định bật).

## 6. Các bước triển khai
Mỗi bước: 1 phiên Sonnet, chỉ chạy test file mình sửa; commit theo đường dẫn.

**Bước 1 — Lõi `khop()` (thuần số, chưa đụng cảnh).**
Sửa/tạo: `engine/khop-tai-san.js` (mới), `tools/tests/khop-tai-san.test.mjs` (mới).
Đạt khi: `node --test tools/tests/khop-tai-san.test.mjs` pass: mỗi `loai` có ≥ 2 ca (vừa khít; lệch 25% → có `canhBao`); `hop` không vượt ±15%; `dai` ra đúng `n`; kết quả giống hệt khi gọi lại. Dừng khi: test pass + commit. Không đụng env.

**Bước 2 — Đo/chuẩn hoá tài sản.**
Sửa: `tools/nhap-model.mjs` (lệnh `do`, mở rộng `kiem` kiểm gốc đáy-giữa + có bbox), `tools/blender/chuan_hoa.py` (chỉ ghi thêm `mat` nếu `--xoay` được dùng; không đổi logic), `assets/manifest.json` (chỉ dòng `nhap/ep5t-*`, qua tool, không tay), `tools/tests/nhap-model.test.mjs`.
Đạt khi: `node tools/nhap-model.mjs do --tat-ca` in bảng bbox/lệch cho mọi `nhap/ep5t-*`; `nhap-model.mjs kiem` thoát 0; test pass. Dừng khi: có bảng đo ở `output/khop/do.json`; chưa sửa model nào.

**Bước 3 — Khối khai thêm trường + env dùng `khop()`.**
Sửa: `kich-ban/ep005t/boi-canh/<id>.json` (thêm `loai`/`huong`/`cham` cho mốc có model; đây là dữ liệu của người dùng nhưng không vào git — ghi vào `output/khop/loai-moc.json` rồi tool gộp khi sinh), `tools/ep5t-boi-canh.mjs:15-45` (đọc `loai`, `huong`; cờ cũ vẫn chạy), `engine/envs/ep5t-chung.js:42-62` (thay ruột `datModel` bằng `khop()`; thêm `e.khop = {mocId: lech}`; ô FX `khopTaiSan` mặc định BẬT, `?khop=0` về cách cũ để A/B), `engine/envs/ep5t-*.js` (sinh lại, không sửa tay), `engine/post.js` (chỉ thêm khai ô FX nếu cần).
Đạt khi: một nhóm (đề xuất NHÀ, 9 món) chạy: vị trí đáy/tâm/hướng mọi mốc trùng bản cũ (so số hộp bao); `?rb=0` về khối; `?khop=0` về bản cũ; `look.mjs … --pose` / bảng khung không đổi camera. Dừng khi: xong nhóm NHÀ, có `output/khop/nha-lech.md` (bảng % lệch từng món, danh sách > 20%).

**Bước 4 — Trang duyệt chấm độ lệch + khung dây.**
Sửa: `tools/nhap-model.mjs` (`fileUngVien` `:271-279` nhận `--khoi`), `tools/duyet.mjs` (`veMeta` + CSS thanh lệch + sắp xếp + ô bật/tắt), `tools/xem-model.html` (`?khoi=`), `tools/tests/duyet.test.mjs`.
Đạt khi: dựng trang duyệt mẫu cho 1 khe (ví dụ nhà tiệm bánh) thấy % lệch, màu, ⚠ khi > 20%; `node --test tools/tests/duyet.test.mjs` pass; trang cũ (không `--khoi`) không đổi. Dừng khi: link trang mẫu 1 khe + 1 ảnh khung dây do agent phụ xác nhận; chưa nạp đợt thật.

**Bước 5 — Cổng kiểm sau khi thay.**
Sửa: `tools/gates.mjs` (cổng mới `khop`: đọc `e.khop` của env qua `window.__stage`, FAIL khi lệch > `khopLech` [mặc định 0,20], chỉ CẢNH BÁO như các cổng khác), `tools/gates.json` (`khopLech`), `tools/doctor.mjs` (mục báo tài sản chưa đo/chưa có `loai`), `tools/tests/gates*.test.mjs` nếu có.
Đạt khi: `node tools/look.mjs <trang> --shots all --gates` in dòng `khop` cho món > 20%; `doctor.mjs` báo thiếu bbox; test file sửa pass. Dừng khi: chạy trên NHÀ ra báo cáo khớp bảng Bước 3.

**Bước 6 (tuỳ chọn, sau khi dùng thật) — `dai` lặp mẫu + `noi-that` điểm chạm.**
Sửa: `engine/envs/ep5t-chung.js` (nhân bản mẫu, dùng `InstancedMesh` khi n > 8 để giữ số draw call), `engine/khop-tai-san.js`, manifest `lap`/`cham`.
Đạt khi: hàng rào/tường 1 mốc dài lặp đúng `n`, không hở giữa các mẫu; ghế/giường chạm đúng `cham`; số shader/program không tăng (`node tools/shaders.mjs <trang>`). Dừng khi: 1 món `dai` + 1 món `noi-that` chạy được.

## 7. Tính năng bật/tắt (luật dự án)
- Env: ô FX `khopTaiSan` (mặc định bật), URL `?khop=0` = cách co cũ, `?rb=0` = khối (giữ nguyên).
- Cổng kiểm: ngưỡng `khopLech` trong `tools/gates.json`; `--khong-cham` ở lệnh tim; ô "Hiện độ lệch" ở trang duyệt.
- Mỗi mốc ghi đè được luật qua `opt` / `lech` (không bắt buộc dùng luật tự suy).

## 8. Rủi ro
- **Model là cả dãy/cả cảnh** (vd 455202696: 33×63×476 stud) — khớp theo bbox cho kết quả méo/siêu nhỏ. Cách xử: `canhBao` tỉ lệ dáng > 2× → khuyên chọn mẫu khác hoặc `vung` con (`md.vung`, cơ chế có sẵn).
- Bbox bị mảnh phụ làm phình (tia đèn, tán cây quá rộng, xem mục "mảnh khổng lồ" `docs/roblox.md` mục 4). Dùng bbox "trừ mảnh lạ" (percentile 2–98 theo đỉnh) làm số đo chính, giữ bbox đầy đủ để kiểm tràn.
- Mặt trước đoán sai (Roblox −Z, `--xoay 180`) → hướng lật nhưng bbox vẫn khớp; không bắt được bằng số. Giữ bước người/agent xem ảnh (khung dây chồng giúp thấy cửa quay sai phía).
- Khối vẽ từ ảnh Codex vốn "ước" (`nguonSo: "uoc"`) nên `vung` không chính xác tuyệt đối: lệch 20% có thể là lỗi của khối. Báo cáo ghi rõ "lệch so với KHỐI", không gọi là lỗi tài sản.
- Đổi `datModel` có thể làm đổi hình tập đã chốt: Bước 3 chỉ áp cho ep005t, giữ `?khop=0`, so hộp bao trước/sau; không đụng `engine/r15.js`, `episodes/ep001/*`, env ep001–003.
- Máy dùng chung: không chạy `npm test` đầy đủ, Chrome tối đa 3; agent chụp chỉ `--shots` đúng cảnh.
- `kich-ban/ep005t` không vào git: dữ liệu khối bổ sung phải nằm ở nơi tool đọc được và có trong git (đề xuất `docs/` hoặc file `tools/…json`), không đè file của người dùng.

## 9. Câu hỏi còn mở
1. **Nhà**: ưu tiên vừa CHÂN (footprint, như đề xuất: không tràn chân, có thể thấp hơn khối vài %) hay vừa CAO (mái đúng độ cao khối, chân có thể tràn)? Kế hoạch mặc định "vừa chân".
2. **Ngưỡng**: giữ ±15% kéo `hop` và cảnh báo > 20% như đề xuất, hay muốn chặt hơn (ví dụ 10%) cho nhà/cây?
3. **Điểm chạm** cho ghế/giường/cửa (Bước 6): chỉ làm khi có việc thật, hay ghi tay `cham` cho một số món chính ngay từ đầu?

## Ghi chép
- Đã xong: đọc `docs/roblox.md`, `docs/de-bai-codex-mau.md`, `docs/nhap-model.md`, `docs/handoff/ep005t-nha-de-bai.md`, `tools/ep5t-boi-canh.mjs`, `engine/envs/ep5t-chung.js`, `engine/envs.js:81`, `tools/blender/chuan_hoa.py`, `tools/nhap-model.mjs:268-280`, `tools/duyet.mjs:513`, `tools/gates.mjs`.
- Quyết định đã chốt (2026-11-16, người dùng chọn a): KHỐI THẮNG — vị trí, chân đế, hướng, góc camera giữ theo khối; tài sản tự khớp.
- Khác với đề xuất ban đầu: bước "chuẩn hoá tài sản" gần như xong (đã có gốc tâm đáy, `--xoay`, `bbox` trong manifest) → chỉ thêm lệnh đo/kiểm; "dữ liệu khối thêm" là trường tuỳ chọn, không phá file cũ.
