# Giảm tải CPU do Chrome ẩn + test song song — kế hoạch

<!-- ĐIỂM DỪNG: GHI ĐÈ khi cập nhật. -->
## ĐIỂM DỪNG
- **Cập nhật:** 2026-11-15
- **Nhánh:** `ep1-v2` (chỉ thêm file này; chưa sửa code)
- **Đang làm:** xong KẾ HOẠCH 4 mục; chưa viết code.
- **Bước kế tiếp:** người dùng duyệt N (xem "Câu hỏi") → giao 1 phiên con Sonnet làm theo thứ tự M1 → M4 → M2 → M3 (mục 3 là chữ, làm cuối).
- **Đang chờ:** người dùng duyệt kế hoạch + chọn N.
- **File đang dở (chưa commit):** không (các file khác trong cây là của phiên khác).
- **Đang chạy nền:** không.
- **Đạt khi (cả việc):** chạy 3 `npm test` song song → số Chrome ẩn gốc ≤ N, CPU không kẹt 100% kéo dài, tổng thời gian không tệ hơn quá 20%; không còn Chrome ẩn mồ côi sau test.
- **Câu hỏi còn mở:** N = 2 hay 3 (khuyến nghị 2); có bật sẵn `PROFILE=1` không (khuyến nghị: chưa).
<!-- /ĐIỂM DỪNG -->

## Số đo hiện trạng (2026-11-15, máy 20 luồng)
- 7 Chrome ẩn gốc (`--remote-debugging-pipe`, profile `%TEMP%\playwright_chromiumdev_profile-*`, cha = `node`) + 76 tiến trình con `--type=`; 1/7 **mồ côi** (cha đã chết, PID 45528).
- Chrome thường của người dùng KHÔNG có `--remote-debugging-pipe` và không có profile `playwright_*` → phân biệt được.

## Danh sách ĐẦY ĐỦ chỗ mở Chrome

**Cổng duy nhất:** `tools/browser.mjs:76` `launchBrowser()` (playwright-core; `:87` `chromium.launch`, `:44`/`:50` nhánh PROFILE=1). Gọi từ 28 công cụ + 6 test (không ai gọi `puppeteer`; thực tế là playwright):

| Nhóm | File:dòng gọi `launchBrowser()` |
|---|---|
| Công cụ chính | `look.mjs:89`, `shaders.mjs:51`, `kiem-luat.mjs:229`, `ghi-cong.mjs:262`, `bundle.mjs:48`, `export-test.mjs:62`, `render-local.mjs:43`, `goi-tap.mjs:45`, `mau-duyet.mjs:246`, `ra-loi.mjs:100` (lazy) |
| Kiểm | `kiem-chuyen-dong.mjs:207`, `kiem-cap-nhat.mjs:34`, `kiem-che-do-3d.mjs:31`, `kiem-song-song.mjs:14`, `kiem-studio.mjs:16`, `kiem-studio-chan.mjs:13`, `khung-kiem.mjs:12`, `khoi-xam.mjs:87`, `mat-inventory.mjs:23`, `thu-vien-nguon.mjs:108` |
| Mẫu/nhân vật | `face-pack-mau.mjs:27`, `face-pack-so-phim.mjs:21`, `ga-shoot.mjs:25`, `r6-mau.mjs:16` |
| `kb/`, `sfx/` | `kb/do-nhan-vat.mjs:14`, `kb/kit2-xem.mjs:23`, `kb/xuat-khoi-env.mjs:13`, `sfx/cue-check.mjs:92`, `sfx/steps.mjs:25` |
| **Ngoài cổng** | `fbx2glb.js:32` — `chromium.launch()` thẳng, không qua `launchBrowser` → phải đổi sang cổng |
| Test gọi trực tiếp | `boi-canh.test.mjs:184`, `mat-song.test.mjs:35`, `measure.test.mjs:25`, `props-kb-e2e.test.mjs:51`, `shottypes.test.mjs:183`, `vat-lieu.test.mjs:96` |
| Test gọi gián tiếp (spawn công cụ có Chrome) | `kiem-luat.test.mjs:16`, `ghi-cong.test.mjs:59`, `shottypes.test.mjs:147` (kiem-luat), `mau-duyet.test.mjs`, `lam-phim-kit.test.mjs` (gọi mau-duyet — **cần dò thêm** có thật sự mở Chrome không) |
| Test KHÔNG mở Chrome | `lam-phim.test.mjs` (đặt `LAM_PHIM_GIA=1` → lệnh giả, `lam-phim.mjs:23`) và phần còn lại |
| Tự nhân đôi tải | `kiem-luat.mjs:45` `--jobs` mặc định **4** tab; `look.mjs:245` mặc định 4 tab khi >8 mốc; `ra-loi.mjs:92` spawn kiem-luat `--jobs 2`; `doctor.mjs:341,360` spawn shaders/look |

Chrome ngoài repo (không đụng): `claude-in-chrome`, `mcp__puppeteer`, Chrome thường.

## M1. Giới hạn test
**Hiện trạng:** `package.json:19` `"test": "python -m unittest discover -s tools/kb/tests && node --test tools/tests/*.test.mjs"`. Node 24 chạy các file song song = số luồng − 1 (~19) → file nào mở Chrome thì mở cùng lúc.

**Đổi:**
1. `test`: `… node --test --test-concurrency=2 tools/tests/*.test.mjs` (chạy cả 2 nhóm, giữ nghĩa cũ).
2. Thêm `tools/tests/chrome.list` (mỗi dòng 1 file) và `tools/chay-test.mjs` (≈30 dòng): đọc list rồi chạy `node --test --test-concurrency=N <files>`.
   - `test:chrome` = chỉ file trong list (6 trực tiếp + `kiem-luat`, `ghi-cong`, `mau-duyet`, `lam-phim-kit` nếu xác nhận).
   - `test:nhanh` = python + mọi file **trừ** list, `--test-concurrency=4`.
   - `test` = `test:nhanh` rồi `test:chrome` (tuần tự, không chồng).
   - Dùng script Node thay vì glob phủ định vì `node --test` không có loại trừ và cần chạy được trên Windows/PowerShell.
3. `tools/tests/` thêm test nhỏ: mọi file có `launchBrowser`/spawn công cụ-Chrome phải nằm trong `chrome.list` (để file test mới không lọt khỏi nhóm).

**Rủi ro:** test viết kiểu phụ thuộc thứ tự/cổng cố định có thể lộ lỗi khi đổi thứ tự → chạy 2 lần liền xem. Concurrency=2 làm `test:nhanh` chậm hơn một chút (chấp nhận).

**Kiểm:** đo trước/sau `time npm test` (một mình trên máy rảnh) và đếm Chrome gốc cực đại (vòng lặp PowerShell `Get-CimInstance Win32_Process` mỗi 1 s, lọc `remote-debugging-pipe` và không có `--type=`). Đạt: Chrome gốc ≤ N; thời gian ≤ 1,2× trước.

## M2. Khoá Chrome dùng chung cả máy
**Hiện trạng:** `tools/lock.mjs` KHÔNG liên quan — nó khoá sha256 file âm thanh của tập (`lock.mjs:1-10`). Cái gần nhất là `browser.mjs:22-39` `takeSlot` (ô hồ sơ PROFILE=1, 8 ô, file `.lock` ghi pid, gỡ khoá mồ côi qua `alive(pid)`) — chỉ lo hồ sơ, KHÔNG giới hạn số Chrome.

**Thiết kế** (sửa duy nhất `tools/browser.mjs`, vì mọi công cụ đã qua `launchBrowser`):
1. Hàm `giuO()` trong `browser.mjs`: thư mục khoá **toàn máy** `%LOCALAPPDATA%\3jsstudio\chrome-sem\` (không để trong `.cache/` vì các worktree/phiên có `ROOT` khác nhau → mỗi nơi một semaphore = vô nghĩa). `o-0 … o-(N-1)`, mở `wx` ghi `{pid, ten: argv[1], t}`; ô có pid chết (`alive`) thì gỡ; thêm **nhịp tim** `utimes` mỗi 30 s (`setInterval().unref()`) và coi ô quá 5 phút không nhịp là chết → chống trùng PID Windows. Chờ ô: thăm dò 500 ms, in 1 dòng stderr mỗi 15 s "đang chờ ô Chrome (n/N đang dùng bởi …)"; quá `CHROME_CHO` (mặc định 20 phút) thì lỗi rõ ràng.
2. Giải phóng: bọc `close()` của đối tượng trả về + `process.once('exit'|'SIGINT'|'SIGTERM')`.
3. `launchBrowser` gọi `giuO()` trước `chromium.launch*`; trả về đối tượng có `close()` đã bọc (cả nhánh PROFILE=1 lẫn thường).
4. **Chống kẹt lồng nhau:** test/công cụ giữ ô rồi spawn công cụ con cũng cần ô (vd `ra-loi` → `kiem-luat`, `doctor` → `look`). Đặt `process.env.CHROME_O_CHA=<pid giữ ô>` khi giữ ô; tiến trình con thấy biến này và pid cha còn sống thì **dùng chung ô cha**, không xin thêm. Test: 2 tiến trình lồng nhau không kẹt.
5. Biến môi trường: `CHROME_TOI_DA` (mặc định N), `CHROME_KHOA=0` tắt (cho người dùng cần chạy tay không chờ).
6. Gom `fbx2glb.js:32` về `launchBrowser`.
7. **Giảm nhân tải trong ô:** khi khoá bật, `--jobs` mặc định của `kiem-luat.mjs:45` và `look.mjs:245` hạ từ 4 → 2 (ghi đè được bằng `--jobs`). N ô × 4 tab vẫn là 8 trang WebGL; đây là nguồn tải thật chứ không chỉ số tiến trình.

**Rủi ro:** (a) `PROFILE=1`: ô hồ sơ (`takeSlot`, 8 ô) và ô semaphore là hai thứ khác nhau — thứ tự lấy: semaphore trước, rồi hồ sơ; hai tiến trình không bao giờ chung hồ sơ vì `wx` + pid, nhưng vì N ≤ 2 thì chỉ cần 2 ô hồ sơ → có thể hạ `SLOTS` 8 → N+1. (b) Tiến trình bị `kill -9`/ngắt điện: ô mồ côi được gỡ bởi `alive`+nhịp tim. (c) Việc dài (xuất MP4 4K, `export-test`) chiếm ô hàng chục phút → test của agent khác phải chờ; chấp nhận hoặc cho `export-test`/`xuat.mjs` dùng ô riêng `CHROME_TOI_DA` +1. (d) Lệnh `GL=swiftshader` (CPU render) nặng hơn nhiều → tính 1 ô nhưng nên cho mặc định N=1 khi swiftshader. (e) `chromium.launch` thất bại sau khi giữ ô → phải thả ô trong `catch`.

**Kiểm:** thêm `tools/tests/chrome-sem.test.mjs` (không mở Chrome thật: nhúng `moPhongChrome` giả qua tham số): 5 tiến trình xin ô cùng lúc với N=2 → tối đa 2 giữ; giết 1 tiến trình giữ ô → ô được nhả trong ≤ 5 s; lồng nhau không kẹt. Kiểm thật: chạy 3 `npm run test:chrome` song song, giám sát số Chrome gốc cực đại ≤ N; ghi tổng thời gian 3 lượt so với chạy lần lượt.

## M3. Quy tắc agent (chữ — dán nguyên)
**`CLAUDE.md` (mục "Agent phụ", thêm 3 gạch cuối):**
```
- **Chrome/CPU dùng chung cả máy**: nhiều phiên và agent chạy cùng lúc nên máy hay kẹt 100%. Agent phụ CHỈ chạy file test phần mình sửa
  (`node --test tools/tests/<file>.test.mjs`) và chụp đúng shot mình sửa; KHÔNG chạy `npm test` / `npm run test:chrome`,
  KHÔNG chụp cả phim (`--shots all`), KHÔNG chạy `shaders.mjs`/`doctor.mjs --gates` trừ khi được giao đúng việc đó.
- `npm test` đầy đủ chỉ **agent chính** chạy, **1 lần ở cuối**, khi không còn agent nào đang chạy. Phiên con Roblox/ep chạy phần mình, báo "chưa chạy full test" thay vì tự chạy.
- Chờ ô Chrome (thấy dòng "đang chờ ô Chrome") là bình thường: đợi, đừng chạy thêm công cụ khác song song và đừng tự giết tiến trình của phiên khác.
```
**`.claude/skills/lam-phim/SKILL.md` ("Quy tắc agent", sau dòng 97):**
```
- **Test/chụp**: agent chỉ chạy test của file mình sửa và `look.mjs --shots <id mình sửa>` / `kiem-luat.mjs --shots <nhóm mình>` (tối đa 2 tab); `npm test` đầy đủ và `--shots all` chỉ agent chính chạy ở bước `gop`, một lần, khi mọi agent đã xong. Máy dùng chung — tối đa N Chrome ẩn cả máy (xem docs/handoff/giam-tai-cpu.md).
```
Cập nhật thêm 1 dòng ở skill `kiem-tra-khung` (nhắc `--jobs 2` + không `--shots all` khi có agent khác chạy). **Rủi ro:** chỉ là quy tắc chữ → agent quên; M2 là lưới an toàn thật.
**Kiểm:** đọc lại CLAUDE.md mục "Agent phụ" còn ≤ 3 dòng thêm; mỗi đề bài giao agent kế tiếp có câu "chỉ chạy `<file>.test.mjs`".

## M4. Dọn mồ côi
**Hiện trạng:** `tools/doctor.mjs:294-318` (mục 7). `PAT` (`:300`) = `render-local|tts_en.py|tools/tts.py|voices_build|image2pipe` → **không khớp Chrome playwright** (cmdline Chrome chẳng chứa các chữ đó), nên `--fix-procs` hiện không dọn được Chrome mồ côi. Dừng bằng `Stop-Process -Force` (`:312`) theo PID, không kiểm cha.

**Đổi (thêm nhánh riêng, không động `PAT` cũ):**
1. Hàm `chromeMoCoi()` trong doctor (hoặc `tools/don-chrome.mjs` để test/hook gọi lại): liệt kê `chrome.exe`/`msedge.exe` **gốc** thoả CẢ HAI: cmdline có `--remote-debugging-pipe` **và** (`--user-data-dir` chứa `playwright_chromiumdev_profile` **hoặc** đường dẫn `.cache\chrome-profile`); không có `--type=`. Mồ côi = `ParentProcessId` không còn tiến trình **hoặc** tiến trình đó không phải `node`. Chỉ tắt cây của gốc đó (`taskkill /T /PID`), rồi xoá thư mục profile `playwright_*` tương ứng nếu nằm trong `%TEMP%`.
2. **Không bao giờ** tắt Chrome không có `--remote-debugging-pipe`/không có profile nêu trên (Chrome thường, claude-in-chrome). Kèm test dùng danh sách giả (JSON cmdline) kiểm 3 ca: Chrome thường (giữ), Chrome playwright cha sống (giữ), Chrome playwright cha chết (dọn).
3. Dọn thêm `.cache/chrome-profile/*.lock` có pid chết (đã có logic ở `browser.mjs:32-34`, chỉ cần gọi khi doctor chạy) và ô semaphore M2 chết.
4. Móc: `chay-test.mjs` (M1) gọi `don-chrome` **sau** khi chạy xong (cả khi test lỗi, `finally`) và trước khi bắt đầu; `doctor.mjs --fix-procs` gọi cùng hàm. Mặc định in danh sách, `--xoa`/`--fix-procs` mới tắt (như `don.mjs`).
5. Chạy sau test chỉ dọn mồ côi (cha chết), không dọn Chrome của agent khác đang sống.

**Rủi ro:** cha chết nhưng người dùng đang xem cửa sổ headful (`headless:false`)? — công cụ chỉ dùng headless mặc định; loại cmdline có `--headless=` thiếu thì không tắt. Dọn nhầm khi PID cha bị tái dùng bởi `node` khác: so thêm thời gian tạo (`CreationDate` cha < con).
**Kiểm:** tạo giả mồ côi (spawn node mở `chromium.launch` rồi `taskkill /F` riêng node cha) → `don-chrome` in đúng 1 gốc, `--xoa` tắt hết cây, Chrome thường còn nguyên; đếm Chrome trước/sau.

## Thứ tự làm & ước lượng
M1 (nhỏ, hiệu quả ngay) → M4 (an toàn, độc lập) → M2 (lớn nhất, có test) → M3 (chữ, dán sau khi M2 xong để câu chữ khớp). Mỗi mục 1 commit; đo số liệu trước (baseline) trước khi sửa. Một phiên con Sonnet, không agent phụ (tất cả chạm `browser.mjs`/`package.json`/`doctor.mjs`).

## Ghi chép
- Dò ngày 2026-11-15: không có `puppeteer` trong repo; mọi Chrome qua `playwright-core` (`browser.mjs:12`).
- Chưa kiểm: `lam-phim-kit.test.mjs`/`mau-duyet.test.mjs` có mở Chrome thật không (mau-duyet.mjs:246 có `launchBrowser`).
