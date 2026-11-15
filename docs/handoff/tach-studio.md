# Tách studio khỏi từng tập + nút "Cập nhật mới nhất" — handoff

<!-- ĐIỂM DỪNG: tối đa 25 dòng. GHI ĐÈ cả khối mỗi lần cập nhật, không nối thêm. -->
## ĐIỂM DỪNG
- **Cập nhật:** 2026-11-15 (GĐ3 xong + đã phát hành bản đầu; + song song Phim | 3D) · **Nhánh:** `ep1-v2` · nguồn = GitHub Release công khai.
- **Đã có (GĐ1+2):** `node tools/bundle-studio.mjs` → `dist/studio.html` 2,1 MB · `node tools/goi-tap.mjs <ep> [--tu-chua]` → `dist/<ep>.3js`
  · `node tools/kho-chung.mjs [ep…]` → `dist/kho-chung.3js` 48,7 MB (asset dùng chung của mọi gói, trùng sha256 lưu 1 lần).
- **Dung lượng gói (cũ → mới):** ep001 86 → 25,1 MB · ep002 61 → 5,7 · ep003 72 → 5,4 · ep004 55 → 0,9 (+ kho chung 1 lần; riêng = episodes/<ep>/).
- **Cách dùng:** mở studio.html → kéo gói tập (lần đầu kéo cả kho-chung.3js; thiếu kho thì studio nhắc và tự mở tập sau khi nạp).
  Kho lưu IndexedDB '3js-studio' (blob theo sha256, path→sha); nút Xoá kho. Tự động: `?goi=<ep>.3js[&kho=…]` (mặc định thử kho-chung.3js cạnh studio).
- **Đã kiểm:** look --ab với dist/<ep>.html: ep002/ep003 giống hệt, ep004 ≥ 104 dB; ep001 so trang dev cùng lúc 87,6 dB (nhiễu GPU —
  dist/ep001.html cũ hơn mã vì phiên khác đang sửa engine/ep001). `node tools/kiem-studio.mjs <ep>` ĐẠT ep003/ep004 (thiếu kho → nhắc;
  nạp kho → tự mở; mở lại không cần file kho). Xuất MP4: ep003 20–25 s, ep002 10–14 s OK. Ảnh: `output/tach-studio/`.
- **Khác kế hoạch:** định dạng "3JS1" thay zip; tập chạy cùng trang thay iframe. **Lưu ý:** mã tập/engine đổi → dựng lại studio + gói + kho cùng lúc.
- **GĐ3:** trình khởi động `tools/studio-loader.js` (nhúng vào studio.html): nhớ thư mục studio (File System Access, chọn 1 lần) → tự quét *.3js,
  nút Mở file mở đúng thư mục đó, báo khi kho-chung.3js trong thư mục mới hơn kho trong máy (nút Cập nhật kho), Xem kho theo nhóm.
  Cập nhật: tệp đính kèm Release KHÔNG tải được từ trình duyệt (thiếu CORS, đã thử) → API releases/latest + raw.githubusercontent tại thẻ
  `studio-v<ver>` trên nhánh mồ côi `studio-ban`. Lõi: bản gốc + 2 bản tải (sha256), bản mới chạy thử lần mở tập tới, lỗi/180 s → tự quay lại.
  Kiểm: `node tools/kiem-cap-nhat.mjs` (giả lập GitHub) 5/5 ĐẠT. Phát hành: `node tools/phat-hanh-studio.mjs [--day]` (mặc định chạy thử).
- **Song song Phim | 3D:** nút ◧ Song song (engine/che-do-3d.js `bat(el, { songSong })`, tools/export-ui.js). Một renderer: Phim → canvas 2D
  đè dưới phụ đề; 3D vẽ vào ô góc bộ đệm → canvas 2D bên phải. `node tools/kiem-song-song.mjs` 8/8 ĐẠT; kiem-che-do-3d ep003 vẫn ĐẠT.
  Chỉ có trong studio.html; các dist/<ep>.html cũ chưa gộp lại.
- **Đã phát hành 15/11:** thẻ `studio-v2026.11.15-1252` + nhánh `studio-ban` (đã push, người dùng cho phép). Máy CHƯA có `gh` → chưa có
  GitHub Release; studio tự lấy từ nhánh studio-ban khi không có Release (kiểm thật: tải được, sha khớp). Bước kế tiếp: GĐ4 xuat.mjs/doctor hiểu gói.
- **15/11 chiều:** mọi đầu ra studio/gói/kho ghi vào `dist/STUDIO RIENG/` (người dùng chọn). Sửa treo "Đang lấy asset…": tab studio GĐ2 cũ giữ
  IndexedDB v1 chặn nâng lên v2 → nay báo "đóng tab khác" + nhường khi tab mới hơn mở (`node tools/kiem-studio-chan.mjs` ĐẠT). Chờ người dùng thử lại.
- **File đang dở (chưa commit):** không · **Đang chạy nền:** không · tách file KHÔNG giảm số shader/thời gian dịch shader.
- **Đạt khi (cả dự án):** như trên + bản đầu đã lên Release và studio tải được; công cụ (xuat.mjs, doctor) hiểu gói. **Câu hỏi còn mở:** không
<!-- /ĐIỂM DỪNG -->

## Kiến trúc đề xuất (3 mảnh)

### 1. `dist/studio.html` — một file, ~3–5 MB
- Gồm: lõi khởi động (nhỏ, KHÔNG tự cập nhật), engine (`engine/` + `vendor/three` + troika + gsap) gộp esbuild, trình phát
  `tools/export-ui.js` (khung studio, ghi chú lỗi, 🎬 Phim | 🧊 3D, ⬇ Xuất MP4 WebCodecs), phông.
- Phần engine + trình phát đóng thành **`studio-core.js` có số phiên bản** (vd `2026.11.15-1`) — đây là phần "Cập nhật mới nhất" thay được.
- Không có asset tập. Mở lên thấy màn hình "Mở tập…".

### 2. Gói tập `dist/<ep>.3js` (zip không nén lại, đuôi riêng) — chỉ DỮ LIỆU
```
manifest.json   { ep, title, coreMin: "2026.11.15", fps, duration, assets: [{path, sha256, bytes, shared:true|false}] }
episode.js  shots.js  captions.js  captions_en.json   (module dữ liệu, như hiện nay)
boot.js         (chỉ tập có trang riêng — xem dưới)
audio/          narration.mp3/ogg, sfx_*.ogg, music_nhac.ogg, voices/*, *.levels.json
assets/         CHỈ asset riêng của tập (episodes/<ep>/*, assets/nhap/ep4-*…), file nhị phân gốc (không base64)
ghi-cong.png
```
- Asset **dùng chung** (polyhaven, kenney, polyfork, characters, sky, fonts, materials) chỉ ghi tên + sha256 trong manifest.
  Studio lấy từ **kho chung đã lưu trong máy** (IndexedDB/Cache Storage, khoá = sha256). Thiếu → lấy từ **gói kho chung**
  `dist/kho-chung-<phiên bản>.3js` (~30 MB, tải/kéo vào 1 lần) hoặc từ Release (nếu người dùng bật tải mạng).
- Tuỳ chọn `--tu-chua`: nhét luôn asset dùng chung vào gói (gửi cho máy khác chưa có kho) — vẫn nhẹ hơn bản cũ vì không base64.
- Ước tính: ep003 ~ 12–18 MB, ep004 ~ 6–10 MB, ep001 ~ 30 MB (giọng + asset riêng nhiều).

### 3. Trang khởi động chung trong engine (`engine/tap.js`)
- Hiện mỗi `episodes/<ep>/index.html` có ~200 dòng khởi động gần giống nhau (ep002/ep004 lệch ep003 chỉ 34–43 dòng, ep001 riêng).
- Gom phần chung của `episodes/_template/index.html` thành `bootEpisode({ EPISODE, SHOTS, CAPTIONS, files })` trong engine.
  Tập theo mẫu → gói KHÔNG có code. Tập lệch mẫu (ep001, có thể ep004) → gói kèm `boot.js` riêng (vẫn chỉ vài chục KB).
- `episodes/<ep>/index.html` dev vẫn giữ nguyên để `look.mjs`/dev chạy như cũ; bước sau mới đổi chúng sang gọi `bootEpisode`.

## Studio mở tập thế nào
- **Nút "Mở tập…"** (chọn file `.3js`), **kéo thả** file vào cửa sổ, hoặc **"Mở thư mục…"** (File System Access API trên Chrome/Edge:
  chọn `dist/` → hiện danh sách ep001…ep004; nhớ quyền thư mục cho lần sau).
- Tập đã mở được lưu vào IndexedDB (tuỳ chọn, bật/tắt "Nhớ tập đã mở") → danh sách "Gần đây".
- Đọc zip bằng thư viện nhỏ (fflate, ~8 KB, vendor sẵn). Đường dẫn trong gói map vào lớp chặn fetch/`setURLModifier` sẵn có
  (`EMBED_SHIM` của `tools/bundle.mjs`) — chỉ đổi nguồn từ base64 sang Blob trong gói/kho chung. Engine không phải sửa.
- Đổi tập: tải lại trang con (iframe sạch) để không rò WebGL/shader giữa hai tập. Studio = khung ngoài, tập chạy trong iframe
  `srcdoc` (cùng origin) → trình phát gọi `renderAt`, `getOptions/setOptions` như hiện nay.

## Cơ chế "Cập nhật mới nhất"
- **Nguồn (đề xuất):** GitHub **Release công khai** của repo, tệp `studio-core-<v>.js` + `studio-core.json`
  `{ version, sha256, coreApi, notes, minBoot }`. Đọc qua `https://github.com/<repo>/releases/latest/download/studio-core.json`
  (không cần token). Không lấy thẳng từ nhánh đang code (`ep1-v2`) — dễ dính bản dở.
  Phương án khác: GitHub Pages (`<user>.github.io/3JsStudio/studio-core.json`) — cũng công khai, cần bật Pages.
  Repo riêng tư → KHÔNG dùng được (cần token; Claude không nhập token hộ). Khi đó phải có kho công khai riêng chỉ chứa bản studio.
- **Lưu ở đâu:** IndexedDB `studio-core` giữ **2 bản**: `hien-tai` và `truoc-do` (+ bản gốc nhúng trong studio.html = bản an toàn cuối).
- **Quy trình bấm nút:** tải json → so phiên bản → hiện ghi chú thay đổi + dung lượng → người dùng bấm "Cài" → tải js → kiểm sha256
  → chạy thử khởi động trong iframe ẩn (mở tập mẫu nhỏ có trong bản gốc, `__ready` trong 30 s, không lỗi) → đạt mới đổi `hien-tai`.
- **Quay lại:** lần mở sau mà bản mới lỗi lúc khởi động (cờ "đang thử" chưa xoá) → tự dùng `truoc-do`, báo 1 dòng. Có nút
  "Về bản trước" và "Về bản gốc" trong ⚙. Gói tập ghi `coreMin`; core cũ hơn → nhắc cập nhật, không mở bừa.
- **An toàn:** chỉ tải từ đúng 1 địa chỉ ghi cứng trong lõi khởi động; kiểm sha256; lõi khởi động không bao giờ tự thay.
  Mặc định KHÔNG tự kiểm mạng khi mở (bật/tắt "Tự kiểm bản mới"); không mạng thì studio vẫn chạy bằng bản đã có.
- **Phát hành:** `node tools/phat-hanh-studio.mjs` dựng core + json; đẩy lên Release bằng `gh release create` — **chỉ khi người dùng bảo**.

## Bật/tắt tính năng
- Giữ nguyên: mọi công tắc nằm trong trình phát (`getOptions/setOptions`, `post.options`, ?query) — chạy trong iframe y như bây giờ.
- Thêm vào ⚙: Tự kiểm bản mới · Nhớ tập đã mở · Tải asset thiếu từ mạng · Kênh cập nhật (ổn định / thử nghiệm) · Về bản trước/gốc.
- Bản gộp 1 file cũ (`bundle.mjs`) VẪN giữ, thành lựa chọn "--mot-file" cho người cần gửi 1 file duy nhất.

## Render trên máy người dùng
- Không đổi: Xuất MP4 vẫn WebCodecs + GPU máy họ, trong studio. Cập nhật chỉ tải MÃ; không gửi gì lên mạng, không render cloud.

## Ảnh hưởng tới công cụ
- `look.mjs`, `shaders.mjs`, `kiem-che-do-3d.mjs`: chạy trên `episodes/<ep>/index.html` dev → **không đổi**. Thêm cờ
  `--goi dist/<ep>.3js` để chụp đúng bản người dùng mở (studio + gói) khi cần so.
- `export-test.mjs`, `xuat.mjs`: nhận thêm đầu vào `dist/studio.html?goi=<đường dẫn>` (studio đọc gói qua server tĩnh tạm khi có
  `?goi`); giữ đường cũ `dist/<ep>.html` cho tới khi bỏ hẳn.
- `bundle.mjs`: tách thành `bundle-studio.mjs` (core) + `goi-tap.mjs <ep>` (gói dữ liệu, dùng lại bước 1 ghi asset lúc init để biết
  file nào cần, phân loại chung/riêng theo `assets/manifest.json` + đường dẫn). `doctor.mjs`: kiểm gói lệch `coreMin`, sha256.
- Quy tắc CLAUDE.md "đưa link dist/<ep>.html" đổi thành "link studio.html + gói" — cập nhật khi người dùng chốt.

## Việc còn lại (theo thứ tự, mỗi giai đoạn dừng duyệt)
1. **GĐ1 — chứng minh** (1 phiên con Sonnet): `goi-tap.mjs ep003 --tu-chua` + `studio.html` bản thô mở được gói bằng chọn file;
   so `look.mjs --ab` với `dist/ep003.html`. Đạt: PSNR ≥ 88, Xuất MP4 5 s chạy. Dừng: báo dung lượng thật.
2. **GĐ2 — kho chung**: tách asset dùng chung, IndexedDB theo sha256, gói kho chung; ep002–ep004 theo mẫu; ep001 kèm `boot.js`.
3. **GĐ3 — cập nhật**: `studio-core.json`, nút Cập nhật, thử trong iframe ẩn, 2 bản + quay lại, `phat-hanh-studio.mjs`.
4. **GĐ4 — công cụ**: `--goi` cho look/xuat/export-test, doctor, sửa CLAUDE.md + skill `xuat-phim`.

## Rủi ro
- `file://` + iframe `srcdoc`: Chrome cho cùng origin "null" — cần thử sớm ở GĐ1 (dự phòng: chạy tập trong cùng trang, bỏ iframe).
- IndexedDB có thể bị xoá khi dọn trình duyệt → studio vẫn chạy bằng bản gốc nhúng, chỉ phải kéo lại kho chung.
- Code tải về chạy với quyền như trang: ai chiếm được repo/Release là đẩy được mã → giữ sha256 + chỉ 1 nguồn + người dùng bấm Cài.
- ep001 do phiên ep001-sky-storm giữ: không đụng cho tới GĐ2.
