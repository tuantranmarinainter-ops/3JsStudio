# Quy trình "một câu luật → phim HTML" — Kế hoạch triển khai

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Từ một câu luật → 5 kịch bản mẫu → kịch bản đầy đủ → một câu "tiến hành" → `dist/<ep>.html` trong 2–3 giờ, người dùng sửa tay < 10 lần.

**Architecture:** Hai sản phẩm nối nhau. (A) skill `viet-kich-ban` + `tools/kb/*` (Python, chỉ xử lý chữ). (B) chuỗi tool Node tất định `tools/kiem/*`, `tools/*.mjs` đo phim **bằng số** qua `window.__measure` + ảnh chụp, ghi trạng thái ra `output/<ep>/`, do skill `lam-phim` điều phối (Claude gọi script + agent phụ; không script nào tự gọi LLM).

**Tech Stack:** Node ≥ 22 (`"type": "module"`, `node --test`), Python 3.12 (`unittest` có sẵn, không thêm pytest), `playwright-core` qua `tools/browser.mjs`, three 0.187 (vendor), không thêm dependency ở giai đoạn 1–4.

**Spec:** `docs/superpowers/specs/2026-11-12-quy-trinh-mot-cau-luat-ra-phim-design.md` (đọc cùng kế hoạch này; "mục N" bên dưới là mục của spec).

## Global Constraints

- Render trên máy người dùng; không cloud/Actions; không push, không merge; test đạt thì tự commit.
- Mọi tính năng mới bật/tắt được trong trình phát (`FX_DEFAULTS` / `getOptions`/`setOptions`).
- Tất định: mọi thứ là hàm thuần của `t`; cấm `Math.random()` không seed, giờ thực, `requestAnimationFrame` cho chuyển động.
- Nhân vật **R15 cho tất cả** (`engine/r15.js`); không dùng R6.
- Phim 2–3 phút, ~140 shot, 1080×1920, 30 fps. Thời lượng tối thiểu: insertRead 1,5 s; closeup 0,8 s; hành động 1,0 s; establish 1,2 s.
- Agent phụ ≤ 3 cùng lúc; mỗi agent file riêng; Sonnet mặc định, Haiku cho tool chỉ đếm/đọc; Opus chỉ khi ghi rõ.
- Ảnh ghi ra đĩa (`output/<ep>/…`), chat chỉ nhận bảng số. Ảnh kiểm 540×960.
- Ngưỡng số không cứng trong code: mặc định ở `tools/kiem/mac-dinh.json`, ghi đè bằng `episodes/<ep>/quy-trinh.json`.
- Giấy phép asset/thư viện: chỉ CC0 / CC BY / MIT / zlib; thiếu giấy phép rõ → không dùng. Asset tải về vào thư mục riêng, không chạy script từ đó.
- 96 file `.srt` ở `kich-ban/_vao/greenbro/` CHỈ để lấy số liệu nhịp; không file nào do kế hoạch này tạo ra được chứa lời gốc.
- CapCut lỗi/quá chậm → DỪNG gọi người dùng, không tự đổi sang Edge.
- Không sửa logic `tools/voice_studio/`. Hạn chế sửa `engine/`; task nào sửa engine thì ghi rõ file.
- Sau mỗi thay đổi có ảnh hưởng `dist/`: đưa link `S:\3JS Studio\dist\<file>.html` + `file:///S:/3JS%20Studio/dist/<file>.html`.

## Quy ước chung (mọi task dùng)

- Test Node: `tools/tests/<tên>.test.mjs`, chạy `node --test tools/tests/`. Test Python: `tools/kb/tests/test_<tên>.py`, chạy `python -m unittest discover -s tools/kb/tests -v`. Task 2 thêm script `"test": "node --test tools/tests/ && python -m unittest discover -s tools/kb/tests"` vào `package.json`.
- Mở trang: dùng `launchBrowser` từ `tools/browser.mjs`; chờ `window.__ready === true`; tua bằng `window.renderAt(t)`; danh sách shot ở `window.__shots.list` / `.total`. `tools/look.mjs` là CLI-only (không import được) — đọc nó để chép cách phục vụ trang và viewport 1080×1920, không sửa nó.
- Mã thoát của mọi tool mới: `0` đạt, `1` có vi phạm/lỗi dữ liệu, `2` lỗi môi trường (trang không sẵn sàng, thiếu file).
- **8 bước** của bảng theo dõi (Claude tự chốt, spec không liệt kê): `kich-ban`, `asset`, `giong`, `mau-duyet`, `shot`, `ra-loi`, `am-thanh` (tiếng động + nhạc + phụ đề + ghi công), `gop`.
- File trạng thái (mọi tool ghi qua `tools/kiem/trang-thai.mjs`, Task 7):
  - `output/<ep>/kiem/trang-thai.json`: `{ "ep": "ep002", "buoc": { "<tên bước>": { "hash": "<sha1 đầu vào>", "xong": true, "luc": "<ISO>", "phut": 12.5, "goi": 0 } } }`
  - `output/<ep>/kiem/nhat-ky.jsonl`: mỗi dòng `{ "ts": "<ISO>", "ep", "buoc", "shot"?, "luat"?, "hanh_dong", "truoc"?, "sau"?, "anh"? }`
  - `output/<ep>/kiem/luat.json`: xem Task 6.
- Mã luật: `L1`…`L10` đúng thứ tự mục 7.1, `L11` = thời lượng tối thiểu.

## Review Focus

1. **Trang không có `__measure` hoặc không gắn vai** (bản gộp v1 cũ): luật cần đo phải ghi `skip: "khong-co-measure"`, không tính là lỗi, không làm tool chết → Task 6.
2. **Trang không bao giờ `__ready`** (lỗi JS, thiếu asset): tool dừng sau 120 s, in lỗi console của trang, mã thoát 2 — không treo → Task 6.
3. **Kịch bản gõ tay lệch chuẩn**: tên cột không dấu/khác hoa thường, thiếu cột tuỳ chọn, ô trống, `giây` dùng dấu phẩy thập phân (`1,5`) → lint báo theo dòng thay vì ném exception → Task 2.
4. **`.srt` bẩn**: BOM, CRLF, tên file có emoji, khối không có số thứ tự, dòng lặp của phụ đề tự động → `nhip.py` bỏ qua khối hỏng và đếm số file dùng được → Task 1.
5. **Chạy lại giữa chừng**: `trang-thai.json` thiếu/hỏng, dòng cuối `nhat-ky.jsonl` bị cắt dở → coi như bước chưa xong, bỏ dòng hỏng, không ghi đè nhật ký cũ → Task 7.

## Bản đồ file

| File | Trách nhiệm | Task |
|---|---|---|
| `tools/kb/nhip.py`, `docs/nhip-kich-ban.json/.md` | số liệu nhịp từ 96 .srt | 1 |
| `tools/kb/kichban.py` | đọc `kich-ban.md` → danh sách dòng (dùng chung lint, asset-plan qua JSON) | 2 |
| `tools/kb/lint.py`, `docs/kich-ban-vao.md` (thêm mục) | kiểm kịch bản | 2 |
| `.claude/skills/viet-kich-ban/SKILL.md` | câu luật → 5 mẫu → kịch bản đầy đủ | 3 |
| `engine/measure.js` | `window.__measure(t)`, `window.__mask(t)` | 4 |
| `tools/kiem/anh.mjs`, `tools/kiem/luat.mjs`, `tools/kiem/mac-dinh.json` | số đo ảnh + 11 luật (hàm thuần) | 5 |
| `tools/kiem-luat.mjs`, `tools/kiem/nhan.mjs` | CLI: chụp, đo, `luat.json`, thư mục `duyet/` | 6 |
| `tools/kiem/trang-thai.mjs`, `tools/theo-doi.mjs` | trạng thái/nhật ký, `dist/<ep>_theo-doi.html`, JSON cho artifact | 7 |
| `episodes/ep001/quy-trinh.json`, `docs/kiem-luat-hieu-chinh.md` | ngưỡng đã hiệu chỉnh | 8 |
| `engine/shottypes.js` | 5 loại shot mới | 9 |
| `engine/materials.js`, `engine/props.js`, `docs/vat-lieu.md` | vật liệu khai báo | 10 |
| `assets/manifest.json`, `tools/doctor.mjs` | `pose`/`anim` | 11 |
| `engine/r15.js`, `engine/shots.js`, `engine/face-lab.html` | mặt sống | 12 |
| `engine/envs.js`, `engine/envs/*.js`, `engine/envs/cong-thuc.js` | tầng, sự sống, giờ/thời tiết, sinh từ mô tả | 13 |
| `tools/kb/asset-plan.mjs` | thứ thiếu | 14 |
| `tools/mau-duyet.mjs` | bảng mẫu | 15 |
| `tools/shot-gen.mjs` | kịch bản → `shots.js` | 16 |
| `tools/ra-loi.mjs`, `tools/kiem/sua.mjs` | vòng tự sửa | 17 |
| `tools/ghi-cong.mjs` | ảnh cuối + `ghi-cong.txt` | 18 |
| `tools/lam-phim.mjs`, `.claude/skills/lam-phim/SKILL.md`, danh sách giọng | điều phối | 19 |
| `engine/post.js`, `engine/fx.js`, … | thay lõi từng cái | 20 |
| `episodes/ep002/` | chạy thật | 21 |

**Đợt chạy song song (≤ 3 agent):** Đợt 1: Task 1 (Haiku), 2, 5 → Đợt 2: 3, 4, 7 → Đợt 3: 6 → Task 8 (agent chính) → Đợt 4: 9, 10, 11 → Đợt 5: 12, 13, 18 → Đợt 6: 14, 15, 16 → Đợt 7: 17 → 19 → Task 20 (từng lõi một) → Task 21 (agent chính).
Giai đoạn 3–6 (Task 9–21) ghi giao diện + tiêu chí kiểm; ngưỡng số của chúng lấy từ kết quả Task 8, nên **trước Đợt 4 agent chính rà lại Task 9–17 theo `docs/kiem-luat-hieu-chinh.md`**.

---

# Giai đoạn 1 — Kịch bản (mục 10.1)

### Task 1: `tools/kb/nhip.py` — nhịp từ 96 truyện (Haiku)

**Files:** Create `tools/kb/nhip.py`, `tools/kb/tests/test_nhip.py`, `tools/kb/tests/data/mau_1.srt` (tự viết, 12 khối, lời bịa), `docs/nhip-kich-ban.json`, `docs/nhip-kich-ban.md`.

**Interfaces:**
- Produces: `python tools/kb/nhip.py [thư_mục=kich-ban/_vao/greenbro] [--out docs/nhip-kich-ban]`
- `parse_srt(text: str) -> list[dict]` — mỗi khối `{start: float, end: float, text: str}` (giây); gộp dòng lặp của phụ đề tự động.
- `cau(blocks) -> list[dict]` — ghép khối thành câu theo dấu `. ! ?` → `{start, end, text}`.
- `chi_so(sentences) -> dict` — 8 chỉ tiêu cho một truyện.
- `docs/nhip-kich-ban.json`: `{ "so_truyen": int, "bo_qua": int, "chi_tieu": { "so_cau": {tb, p25, p50, p75}, "thoi_luong_s": {...}, "ky_tu_moi_cau": {...}, "cau_moi_phan": {"hook": {...}, "leo_thang": {...}, "twist": {...}, "giai_quyet": {...}}, "vi_tri_twist_pct": {...}, "kieu_mo": {"in this town": 0.xx, "khac": 0.xx}, "ket_goi_lai_mo_pct": float, "tan_suat_1000_tu": {"i": x, "mom": x, "grandma": x}, "mat_do_doi_canh_moi_phut": {...} } }`
- Phần: hook = 10% đầu thời lượng, leo thang = tới câu twist, twist = câu twist → 75%, giải quyết = còn lại. Câu twist = câu đầu tiên sau 40% thời lượng chứa một trong: `but then`, `that's when`, `turns out`, `the truth`, `secret`, `realized`, `actually`; không có → 50%. Kết gợi lại mở = câu cuối chung ≥ 2 từ nội dung (≥ 5 ký tự) với câu đầu. Đổi cảnh ≈ khoảng lặng giữa hai câu ≥ 0,6 s.

- [ ] **Step 1: Viết test** `test_nhip.py`: `test_parse_bom_crlf` (file có BOM + CRLF + một khối thiếu số thứ tự → trả đúng số khối hợp lệ, không exception); `test_gop_dong_lap` (2 khối liên tiếp cùng text → 1 câu); `test_vi_tri_twist` (mẫu có "that's when" ở 60% → `vi_tri_twist_pct` trong 55–65); `test_khong_chua_loi_goc` (chạy `main` trên `data/`, đọc 2 file ra, assert không chuỗi ≥ 4 từ liên tiếp nào của `mau_1.srt` xuất hiện).
- [ ] **Step 2:** Chạy `python -m unittest discover -s tools/kb/tests -v` → FAIL (chưa có module).
- [ ] **Step 3:** Viết `nhip.py` (chỉ stdlib: `re`, `json`, `statistics`, `pathlib`; đọc `utf-8-sig`). `docs/nhip-kich-ban.md` = bảng 8 chỉ tiêu + 5 dòng "áp dụng cho tiếng Việt" (quy đổi số câu/thời lượng, không trích lời).
- [ ] **Step 4:** Test PASS. Chạy thật trên 96 file → `so_truyen + bo_qua == 96`, `so_truyen ≥ 90`.
- [ ] **Step 5:** Commit `kb: nhip.py — số liệu nhịp 96 truyện (không lưu lời gốc)`.

### Task 2: định dạng `kich-ban.md` mở rộng + `tools/kb/lint.py` (Sonnet)

**Files:** Create `tools/kb/kichban.py`, `tools/kb/lint.py`, `tools/kb/tests/test_lint.py`, `tools/kb/tests/data/kb_tot.md`, `tools/kb/tests/data/kb_loi.md`. Modify `docs/kich-ban-vao.md` (thêm mục "Kịch bản đầy đủ (kich-ban.md)"), `package.json` (script `test`).

**Định dạng (quyết định):** giữ nguyên header khoá-giá trị và bảng của `storyboard.md` (`| id | khung | giây | lời kể | loại | ai | cùng | ở đâu | hành động | mặt | máy quay | chữ | tiếng động |` + tuỳ chọn `hành động 2`, `mặt 2`, `env`, `ánh sáng`, `ghi chú`), **thêm 5 cột**: `giờ` (`sang|trua|chieu|hoang-hon|dem`), `thời tiết` (`nang|may|mua|giong|bao|tuyet|suong`), `vật cần đọc` (tên đạo cụ có chữ/số, trống nếu không), `tư thế` (`standing|flying|sitting|swimming`, cho mô hình không phải người), `tối thiểu` (giây, trống = theo loại). Cột `khung` được để trống (chưa có ảnh). Thêm 2 khối danh sách cuối file: `## Cần dựng` (`- env: <tên>: <mô tả>`, `- prop: …`, `- anim: …`) và header `ep: epNNN`, `luat_goc: <câu người dùng>`.

**Interfaces:**
- `kichban.doc(path) -> {"meta": dict, "shots": list[dict], "can_dung": list[dict], "loi_doc": list[dict]}` — khoá shot dùng tên tiếng Anh của `storyboard.py` (`id, dur, narration, type, who, with, at, action, face, camera, text, sfx, env, light`) + `time, weather, read, pose, min`; mỗi shot có `_dong: int`. Dùng lại `fold`/`match` của `tools/storyboard.py` (import), không chép.
- `python tools/kb/kichban.py <kich-ban.md> --json` → in JSON trên (để tool Node đọc).
- `python tools/kb/lint.py <kich-ban.md> [--json]` → dòng `kich-ban.md:<dòng>: <MÃ> <thông báo>`; mã thoát 0/1.
- Mã lỗi: `K01` thiếu bối cảnh (`at`/`env`); `K02` `loại` không thuộc `SHOT_TYPE_NAMES` ∪ {`insertRead, houseFull, hug, fall, sinkTilt`}; `K03` có `vật cần đọc` nhưng loại ≠ `insertRead`; `K04` `hành động` không có trong `R15_ANIMATIONS` và không nằm trong `## Cần dựng`; `K05` `giây` < tối thiểu theo loại (Global Constraints); `K06` lời kể chứa tên kênh khác (danh sách trong `tools/kb/ten-cam.txt`, khởi đầu: `GreenBro`, `GreenBroRants`); `K07` câu lời kể đầu không bắt đầu bằng "Ở thị trấn này"; `K08` `mặt` không thuộc 16 khoá `FACE_PRESETS`; `K09` tổng `giây` ngoài 120–180; `K10` một câu lời kể trải > 3 shot; `K00` lỗi đọc (ô số sai, cột bắt buộc thiếu).
- Danh sách animation/loại shot/mặt: lint đọc bằng regex từ `engine/r15.js` (`R15_ANIMATIONS`, `FACE_PRESETS`) và `engine/shottypes.js` (`SHOT_TYPES`) lúc chạy — không chép cứng.

- [ ] **Step 1: Viết test.** `kb_tot.md` 8 shot hợp lệ (tổng giây giả bằng meta `kiem_tong: off`). `kb_loi.md` cố ý 6 lỗi: K01, K03, K04, K05, K06, K07. Test: `test_tot_khong_loi` (0 lỗi, exit 0); `test_bat_6_loi` (tập mã == {K01,K03,K04,K05,K06,K07}, mỗi mã đúng số dòng); `test_cot_khong_dau` (header `| id | giay | loi ke | loai | …` vẫn đọc được); `test_giay_dau_phay` (`1,5` → 1.5); `test_o_trong_khong_exception` (hàng thiếu ô cuối → K00 có số dòng, không traceback); `test_storyboard_py_tuong_thich` (`storyboard.read_board` đọc `kb_tot.md` không lỗi, số shot = 8 — cột lạ bị bỏ qua).
- [ ] **Step 2:** Chạy → FAIL.
- [ ] **Step 3:** Viết `kichban.py`, `lint.py`. Nếu `test_storyboard_py_tuong_thich` đỏ vì `storyboard.py` ném lỗi với cột lạ: sửa `storyboard.py` để bỏ qua cột không biết (chỉ chỗ đó).
- [ ] **Step 4:** Test PASS; `npm test` chạy được cả hai phía.
- [ ] **Step 5:** Viết mục mới trong `docs/kich-ban-vao.md` (bảng cột + giá trị cho phép + ví dụ 3 hàng). Commit `kb: định dạng kich-ban.md mở rộng + lint 10 mã lỗi`.

### Task 3: skill `viet-kich-ban` (Sonnet)

**Files:** Create `.claude/skills/viet-kich-ban/SKILL.md`, `.claude/skills/viet-kich-ban/mau-5-kich-ban.md` (khuôn trình bày), `.claude/skills/viet-kich-ban/vi-du-kich-ban.md` (10 hàng mẫu, cốt truyện tự nghĩ).

**Interfaces:** Consumes `docs/nhip-kich-ban.json` (Task 1), `tools/kb/lint.py` (Task 2). Produces `episodes/<ep>/kich-ban.md`.

Nội dung SKILL.md phải ghi (không thêm bớt):
- Trigger: "luật: …", "viết kịch bản", "5 kịch bản mẫu", "tôi chọn kịch bản số N".
- **Bước 1:** đúng 5 mẫu, mỗi mẫu ≤ 8 dòng: luật / điểm yếu / twist / lời giải / kết / "vì sao hay". 5 kiểu twist khác nhau, mỗi mẫu một kiểu: bí mật người lớn, kẽ hở luật, nguyên nhân ẩn, điểm yếu thành lời giải, đảo vai. KHÔNG tạo file, KHÔNG dựng gì. Dừng chờ người dùng chọn.
- **Bước 2** (sau khi chọn): chọn `epNNN` kế tiếp; viết `episodes/<ep>/kich-ban.md` theo định dạng Task 2: 60–80 câu lời kể, mỗi câu 1–3 shot, ~140 shot; số câu mỗi phần và vị trí twist lấy p25–p75 từ `docs/nhip-kich-ban.json`; `giây` = max(tối thiểu theo loại, ký tự câu / 14 / số shot của câu). Điền `## Cần dựng`.
- **Bước 3:** chạy `python tools/kb/lint.py episodes/<ep>/kich-ban.md` tới khi 0 lỗi → đưa người dùng đường dẫn file + bảng tóm tắt (số câu, số shot, tổng giây, số thứ cần dựng) — MỐC DUYỆT 1b.
- Cấm: chép cốt truyện/lời kênh khác; mở file `.srt` (chỉ đọc `nhip-kich-ban.json`).

- [ ] **Step 1:** Viết 3 file skill.
- [ ] **Step 2: Chạy thử** (agent Sonnet mới, không ngữ cảnh, chỉ nhận skill + câu luật "Ở thị trấn này, ai cũng có một thanh pin trên đầu"): ra đúng 5 mẫu, 5 kiểu twist khác nhau, không file nào được tạo. Rồi "chọn số 2" → `kich-ban.md` qua lint 0 lỗi. Kết quả thử ghi vào `output/thu-skill/viet-kich-ban/` (không commit).
- [ ] **Step 3:** Sửa skill theo chỗ agent thử làm sai; commit `skill viet-kich-ban: câu luật → 5 mẫu → kịch bản đầy đủ`.

---

# Giai đoạn 2 — Kiểm luật, thư mục duyệt, bảng theo dõi (mục 10.2)

### Task 4: `engine/measure.js` — `window.__measure(t)` (Sonnet; sửa engine có giới hạn)

**Files:** Create `engine/measure.js`, `tools/tests/measure.test.mjs`. Modify `engine/cast.js`, `engine/props.js`, file dựng nhà-có-chân (tìm bằng Grep `house`) — chỉ để gắn `userData.vai`; `episodes/_template/index.html`, `episodes/ep001/index.html` (1 dòng gọi `installMeasure`).

**Interfaces:**
- `engine/measure.js` **không có câu `import`** (để `kiem-luat` tiêm được vào bản gộp cũ): `export function installMeasure({ THREE, stage, shots }) -> void` đặt `window.__measure` và `window.__mask`.
- Gắn vai: `userData.vai = 'hero' | 'nguoi' | 'nha' | 'chan-nha' | 'doc' | 'vat-chinh'`; tầng: `userData.tang = 'front' | 'mid' | 'back'`; hạt: `userData.hat = 'bui' | 'tuyet' | 'mua'` + `userData.soHat()` trả số hạt đang sống.
- `window.__measure(t) -> { t, shot, cam: {fov, pos:[x,y,z]}, vat: [ { ten, vai, bbox: [x0,y0,x1,y1] /* 0..1 màn hình, có thể ngoài khung */, trongKhung: 0..1, che: 0..1 /* tỷ lệ tia lưới 9×9 bị vật khác chặn */, mat?: {che: 0..1} /* chỉ hero: tia tới đầu */, nghieng?: độ, chim?: stud } ], chan: [ {ten, chamDat: bool, hatGan: int} ], hat: {bui, tuyet, mua}, tang: {front: int, mid: int, back: int}, vatLieu: [ {ten, kind, nguon: 'khai-bao'|'doan', grunge: bool} ] }` — gọi sau `renderAt(t)`; thuần đọc, không đổi cảnh.
- `window.__mask(t) -> void`: vẽ lại khung hiện tại với vật `vai ∈ {hero, vat-chinh, nha}` màu đen phẳng, còn lại ẩn, nền trắng, tắt hậu kỳ; `window.__mask(null)` khôi phục. Sau khôi phục, `renderAt(t)` phải cho đúng ảnh cũ.
- Che khuất dùng `THREE.Raycaster` (chưa cần `three-mesh-bvh`; nếu Task 8 đo > 1 s/khung thì thêm bvh ở Task 20).

- [ ] **Step 1: Test** (`node --test`, mở `episodes/ep001/index.html` bằng `launchBrowser`): `measure tất định` (gọi `renderAt(41)`→`__measure`, `renderAt(10)`, `renderAt(41)`→`__measure`: hai JSON bằng nhau); `mask khôi phục` (ảnh chụp trước `__mask(t)` và sau `__mask(null)`+`renderAt(t)` trùng từng byte); `có hero` (ở giữa shot `closeup` đầu tiên có `vat` với `vai === 'hero'` và `trongKhung > 0.5`); `nhà đủ chân` (ở một shot nhà đi: 1 `nha` + 4 `chan-nha`).
- [ ] **Step 2:** Chạy → FAIL (`__measure` undefined).
- [ ] **Step 3:** Viết `measure.js`; gắn `userData.vai/tang/hat` ở nơi tạo vật (không đổi hình). Kiểm hình không đổi: `node tools/look.mjs episodes/ep001/index.html --shots all --ref <chuẩn chụp trước khi sửa>` → 0% lệch.
- [ ] **Step 4:** Test PASS. Commit `engine: measure.js — __measure/__mask + gắn vai/tầng/hạt`.

### Task 5: số đo ảnh + 11 luật dạng hàm thuần (Sonnet)

**Files:** Create `tools/kiem/anh.mjs`, `tools/kiem/luat.mjs`, `tools/kiem/mac-dinh.json`, `tools/tests/anh.test.mjs`, `tools/tests/luat.test.mjs`.

**Interfaces:**
- Ảnh trong Node là `{ w, h, data: Uint8ClampedArray /* RGBA */ }` (Task 6 lấy từ trang bằng canvas; test tự dựng mảng).
- `anh.mjs`: `psnr(a, b) -> dB`; `tyLeToi(img, nguong=0.10) -> 0..1`; `diemSang(img, {nguong=0.8, dienTichMin=4}) -> int` (số cụm sáng liên thông); `oPhang(img, {luoi=4, doLech=6}) -> 0..1` (tỷ lệ ô có độ lệch chuẩn độ sáng < `doLech`/255); `thanhPhan(mask) -> [{dienTich /*0..1*/, bbox}]` (thành phần liên thông điểm đen, bỏ cụm < 0,1%).
- `luat.mjs`: `export const LUAT = { L1, …, L11 }`, mỗi luật `(ctx, ng) -> { ok: bool, val: number|object, nguong, skip?: string, ghiChu?: string }` với `ctx = { shot /* dòng shots.js đã expand: id,type,dur,static,frame,read… */, m: [mĐầu, mGiữa, mCuối] | null /* __measure */, anh: [đầu, giữa, cuối], mask: ảnh|null, env: {dem: bool, tuyet: bool, mua: bool} }`. `m === null` → luật L1,L2,L3,L5,L6,L8(tầng),L9 trả `skip: 'khong-co-measure'`; `mask === null` → L10 skip.
- `export function kiemShot(ctx, ng) -> { [mã]: kếtQuả }`; `export function nguong(epDir) -> object` (trộn `mac-dinh.json` với `episodes/<ep>/quy-trinh.json` nếu có).
- `mac-dinh.json` (giá trị spec, hiệu chỉnh ở Task 8):

```json
{
  "L1": { "le": 0.05, "soChan": 4 },
  "L2": { "lechTam": 0.10, "cheMax": 0.05, "rongMax": 0.90 },
  "L3": { "trongKhungMin": 0.5, "cheMatMax": 0.2 },
  "L4": { "psnrMax": 30 },
  "L5": { "nghiengMin": 5, "chimMin": 0.5 },
  "L6": { "hatMin": 1 },
  "L7": { "toiMax": 0.55, "diemSangMin": 3 },
  "L8": { "oPhangMax": 0.30, "vatMoiTangMin": 1 },
  "L9": { "camGrunge": ["chrome", "metalpaint", "iron", "glass", "enamel", "skin", "carpaint"] },
  "L10": { "dienTichMin": 0.08 },
  "L11": { "insertRead": 1.5, "closeup": 0.8, "hanhDong": 1.0, "establish": 1.2, "macDinh": 0.8 },
  "goi": { "shotLoiMax": 10, "tyLeLuatMax": 0.15, "phutKhongTien": 30, "vongMax": 2 }
}
```
- Miễn trừ theo shot: L1 bỏ khi `shot.frame === 'close'`; L4 bỏ khi `shot.static === true`; L5 chỉ áp cho `type === 'sinkTilt'`; L7 chỉ khi `env.dem`; L6 phần rơi chỉ khi `env.tuyet || env.mua`; L10 "bbox tay/chân tách thân" chỉ cho loại hành động (`chase, fall, hug, walkBy, follow`).

- [ ] **Step 1: Test `anh`** với ảnh tổng hợp 64×64: hai ảnh giống → `psnr === Infinity`; ảnh đen/trắng → `tyLeToi` 1/0; 3 chấm trắng rời → `diemSang === 3`; ảnh một màu → `oPhang === 1`, bàn cờ nhiễu → 0; mask 2 khối rời → `thanhPhan().length === 2`.
- [ ] **Step 2: Test `luat`** mỗi luật 3 ca (đạt / vi phạm / miễn trừ hoặc skip) với `ctx` dựng tay, ví dụ L1: bbox nhà `[0.1,0.1,0.9,0.9]` + 4 chân → ok; bbox `[0.02,…]` → !ok; `frame:'close'` → ok kèm `ghiChu`; `m:null` → `skip`. L11: `{type:'insertRead', dur:1.2}` → !ok, `val === 1.2`, `nguong === 1.5`.
- [ ] **Step 3:** Chạy → FAIL. Viết `anh.mjs`, `luat.mjs`. Chạy → PASS.
- [ ] **Step 4:** Commit `kiem: số đo ảnh + 11 luật dạng hàm thuần + ngưỡng mặc định`.

### Task 6: `tools/kiem-luat.mjs` + thư mục `output/<ep>/duyet/` (Sonnet)

**Files:** Create `tools/kiem-luat.mjs`, `tools/kiem/nhan.mjs`, `tools/tests/kiem-luat.test.mjs`, `tools/tests/data/trang-treo.html` (không bao giờ `__ready`), `tools/tests/data/trang-toi-thieu.html` (3 shot giả, có `renderAt`, `__shots`, `__ready`, không `__measure`, không `__stage`). Modify `package.json` (script `kiem-luat`).

**Interfaces:**
- Consumes: Task 4 (`__measure`, `__mask`), Task 5 (`kiemShot`, `nguong`), Task 7 (`ghiNhatKy`, `datBuoc`) — nếu Task 7 chưa gộp, gọi qua `try { await import() }` và bỏ qua.
- CLI: `node tools/kiem-luat.mjs <trang> [--ep ep001] [--shots s001,s002|all] [--out output/<ep>/kiem] [--duyet output/<ep>/duyet] [--jobs 4] [--khong-anh]`. `--ep` mặc định suy từ đường dẫn trang (`episodes/<ep>/…` hoặc `dist/<ep>*.html`).
- Mỗi shot đo 3 khung: đầu (`start + 1/30`), giữa, cuối (`end − 1/30`). Trang thiếu `__measure` nhưng có `__stage` và `window.THREE` → tiêm `engine/measure.js` (đọc file, bỏ chữ `export`, `page.addScriptTag`) rồi gọi `installMeasure`; vẫn không có → `m = null`.
- Ảnh → Node: chụp PNG 540×960, nạp vào `<canvas>` trong một tab trống, `getImageData` giảm còn 135×240 để tính luật; file JPG lưu ở cỡ 540×960.
- `luat.json`: `{ "ep", "trang", "luc", "coMeasure": bool, "shots": { "s001": { "type", "dur", "khung": [f0, fm, f1], "luat": { "L1": {ok, val, nguong, skip?}, … }, "loi": ["L4"] } }, "tong": { "soShot": n, "shotLoi": n, "theoLuat": { "L1": { "loi": n, "tyLe": 0.xx, "skip": n } } }, "goi": { "can": bool, "lyDo": [..] } }`. `goi.can` theo `ng.goi` (shot lỗi > 10 hoặc một luật > 15%).
- Thư mục duyệt (`nhan.mjs`: `ganNhan(page, pngBuffer, dong1, dong2) -> jpgBuffer`, vẽ dải nhãn bằng canvas trong trang, phông Be Vietnam Pro nếu có): `01_shots/s001_f0000.jpg` (đầu/giữa/cuối; góc trên `s001 f1234 t=41.13s`, dòng 2 `✅` hoặc mã + tên luật vi phạm), `02_loi/` (xoá rồi ghi lại mỗi lần: chỉ shot còn lỗi), `luoi-loi.jpg` (lưới ≤ 12 khung lỗi, rộng ~800 px).
- stdout: chỉ bảng số (một dòng mỗi luật: lỗi / skip / tỷ lệ) + 10 shot lỗi đầu + đường dẫn. Mã thoát 0 không lỗi, 1 có lỗi, 2 môi trường.

- [ ] **Step 1: Test.** `trang treo → mã 2 trong ≤ 130 s, stderr có "__ready"` (test đặt `--cho 3` để rút còn 3 s; thêm cờ `--cho <giây>` mặc định 120); `trang tối thiểu → mã 0/1, coMeasure false, mọi luật cần measure có skip, L4/L8/L11 có số`; `luat.json đúng khoá` (kiểm các khoá trên); `nhãn` (file `01_shots/s001_f0000.jpg` tồn tại, kích thước 540×960); `chạy 2 lần cùng trang → luat.json giống nhau trừ khoá luc`.
- [ ] **Step 2:** Chạy → FAIL. Viết tool. Chạy → PASS.
- [ ] **Step 3: Chạy thật:** `node tools/kiem-luat.mjs episodes/ep001/index.html --shots all` — xong trong ≤ 6 phút, in bảng. Chưa cần xanh (Task 8 hiệu chỉnh).
- [ ] **Step 4:** Commit `kiem-luat: đo 11 luật bằng số, luat.json, thư mục duyệt có nhãn`.

### Task 7: trạng thái, nhật ký, bảng theo dõi (Sonnet)

**Files:** Create `tools/kiem/trang-thai.mjs`, `tools/theo-doi.mjs`, `tools/theo-doi/khuon.html`, `tools/tests/trang-thai.test.mjs`, `tools/tests/theo-doi.test.mjs`.

**Interfaces:**
- `trang-thai.mjs`: `BUOC = ['kich-ban','asset','giong','mau-duyet','shot','ra-loi','am-thanh','gop']`; `docTrangThai(ep) -> object` (file thiếu/hỏng → `{ep, buoc: {}}`, đổi tên file hỏng thành `.hong-<ts>`); `hashVao(paths: string[]) -> sha1`; `canChay(ep, buoc, hash) -> bool`; `batDau(ep, buoc) / datBuoc(ep, buoc, {hash, xong, goi?})` (tự tính `phut`); `ghiNhatKy(ep, dong) -> void` (append, một dòng JSON); `docNhatKy(ep) -> dong[]` (bỏ dòng không parse được, không sửa file).
- `node tools/theo-doi.mjs <ep> [--json] [--transcript <thư mục phiên>]`:
  - mặc định ghi `dist/<ep>_theo-doi.html` **một file offline**: đầu trang (phút từng bước, số lần gọi, lỗi còn theo luật); bảng hàng = shot (id, câu lời kể, loại, giây), cột = 8 bước; ô của bước `shot`/`ra-loi` bấm mở ảnh `../output/<ep>/duyet/01_shots/…` và `03_truoc-sau/…` (đường dẫn tương đối, không nhúng base64).
  - `--json` in `{ "tap": {...}, "buoc": [...], "loi": [...], "token": [...] }` đúng 4 dataset của artifact "Bảng sản xuất phim" (mục 9) để phiên điều phối đẩy bằng `ArtifactData`.
  - Token: đọc các `*.jsonl` trong `--transcript` (và `subagents/*.jsonl`), cộng `input_tokens`, `output_tokens`, `cache_read_input_tokens`, `cache_creation_input_tokens` theo giờ — cùng cách hook `session_guard.py` làm; không có `--transcript` → `token: []`.
- Trước khi viết `--json`: đọc artifact https://claude.ai/artifact/2VXWaFbnB5HHk8EvuzDUdL (Artifact `read`) để lấy **đúng tên trường** từng dataset; ghi các tên đó vào đầu `theo-doi.mjs`. Việc đẩy dữ liệu lên artifact do phiên điều phối làm, không nằm trong tool.

- [ ] **Step 1: Test `trang-thai`:** file JSON hỏng → trả rỗng + file `.hong-*` tồn tại; `nhat-ky.jsonl` có dòng cuối cắt dở → `docNhatKy` trả các dòng trước, `ghiNhatKy` tiếp theo vẫn append đúng (file kết thúc bằng `\n`); `canChay` false khi hash trùng và `xong`, true khi hash khác.
- [ ] **Step 2: Test `theo-doi`:** với `luat.json` + nhật ký giả 3 shot → HTML có 3 hàng × 8 cột, không chứa `http` (offline), có `s002` và đường dẫn ảnh tương đối; `--json` có đủ 4 khoá; thiếu `luat.json` → vẫn ra trang với ô trống, mã 0.
- [ ] **Step 3:** FAIL → viết → PASS. Chạy `node tools/theo-doi.mjs ep001` → đưa link `dist/ep001_theo-doi.html`.
- [ ] **Step 4:** Commit `theo-doi: trạng thái + nhật ký + bảng theo dõi offline + JSON cho artifact`.

### Task 8: hiệu chỉnh ngưỡng trên ep001 — "v1 đỏ, cuối xanh" (agent chính, không giao)

**Files:** Create `episodes/ep001/quy-trinh.json`, `docs/kiem-luat-hieu-chinh.md`. Modify `tools/kiem/mac-dinh.json` (nếu ngưỡng chung sai).

- [ ] **Step 1:** `node tools/kiem-luat.mjs dist/ep001_v1.html --ep ep001 --out output/ep001/kiem-v1 --duyet output/ep001/duyet-v1` và `node tools/kiem-luat.mjs episodes/ep001/index.html --ep ep001`.
- [ ] **Step 2:** So với `output/look/v1_vs_final/bao-cao.md` (nhóm lỗi thật theo shot). Với mỗi luật ghi vào `docs/kiem-luat-hieu-chinh.md`: số shot v1 lỗi / cuối lỗi / số shot báo cáo nói lỗi thật / báo nhầm / bỏ sót.
- [ ] **Step 3:** Chỉnh ngưỡng. **Đạt khi:** bản cuối `shotLoi ≤ 10` và không luật nào > 15%; bản v1 `goi.can === true` với các luật chạy được; mỗi luật đo-ảnh (L4, L7, L8, L10, L11) bắt ≥ 60% shot mà báo cáo ghi lỗi thuộc nhóm đó. Luật nào không đạt sau 3 lần chỉnh → ghi "chưa tin được" trong doc và **dừng báo người dùng** (không tự hạ tiêu chí).
- [ ] **Step 4:** Mở ảnh chỉ khi số nói lệch: giao 1 agent Haiku xem `luoi-loi.jpg` và trả lời bằng chữ "báo đúng / báo nhầm" cho ≤ 12 khung.
- [ ] **Step 5:** `node tools/theo-doi.mjs ep001`; commit `ep001: hiệu chỉnh ngưỡng kiem-luat (v1 đỏ, cuối xanh)`; báo người dùng bảng số + 2 link.

---

# Giai đoạn 3 — Thư viện chuẩn (mục 10.3)

Mỗi task dưới đây: trước khi sửa chụp chuẩn `node tools/look.mjs episodes/ep001/index.html --shots all --pose --out refs/truoc-<task>`; sau khi sửa `--pose-ref … --ref …` phải 0 lệch trên ep001 (tính năng mới mặc định không đổi hình cũ).

### Task 9: 5 loại shot mới (`engine/shottypes.js`) (Sonnet)

**Interfaces:** thêm vào `SHOT_TYPES` cùng chữ ký `{doc, move, make({P, ry, who, sh, f, s, crowd}) -> {cam, cast}}`: `insertRead` (`move:'static'`; tham số shot `read: <tên đạo cụ>`; tâm vật cách tâm khung < 10%, zoom ≤ 3% cả shot, đặt `static: true`), `houseFull` (`move:'pan'`; lùi tới khi bbox nhà+4 chân có lề ≥ 5% — tính khoảng cách từ kích thước nhà và `fov`), `hug` (2 người, zoom out, anim `hug`), `fall` (1 người, anim `fall`/`tumble`, camera hạ theo), `sinkTilt` (nhà; tham số `tilt` độ, `sink` stud; camera zoom out).
**Test** `tools/tests/shottypes.test.mjs`: `SHOT_TYPE_NAMES.length === 16`; `expandShot` cho mỗi loại mới trả `cam` có số hữu hạn và khung đầu ≠ khung cuối trừ `insertRead`; trang thử `engine/shot-lab.html?type=houseFull` qua `kiemShot` đạt L1, `insertRead` đạt L2.
**Xong khi:** test PASS, ep001 0 lệch. Commit.

### Task 10: vật liệu khai báo + `docs/vat-lieu.md` (Sonnet)

**Interfaces:** `engine/props.js` — helper tạo bộ phận nhận `mat` là **tên kind** trong `MAT_KINDS` (ngoài màu): `M(color, { kind: 'chrome' })` đặt `userData.matKind` + `userData.matNguon = 'khai-bao'`; `applyMaterials` đặt `matNguon = 'doan'` khi phải `classifyMaterial`. `engine/grunge.js`: `applyGrunge` bỏ qua mesh có `matKind` thuộc `L9.camGrunge` (xuất hằng `KHONG_GRUNGE` từ `materials.js`, `mac-dinh.json` trỏ cùng danh sách). `tools/vat-lieu-doc.mjs` sinh `docs/vat-lieu.md` từ `MAT_KINDS` (bảng: kind, họ, grunge được/không, trạng thái `da-duyet|chua-duyet` — khởi đầu `da-duyet` cho kind đang dùng trong ep001).
**Test:** mesh `chrome` sau `applyGrunge` không đổi material; `__measure().vatLieu` của đạo cụ khai báo có `nguon: 'khai-bao'`; L9 đỏ với mesh `MeshStandardMaterial` trơn gắn `vai: 'vat-chinh'`.
**Xong khi:** đạo cụ chính của ep001 (nhà, tủ lạnh, bưu thiếp, hải đăng) chuyển sang khai báo; ep001 lệch hình < ngưỡng `--ref-tol` mặc định (grunge trên kim loại biến mất là thay đổi có chủ đích → liệt kê shot đổi cho người dùng). Commit.

### Task 11: `pose`/`anim` trong manifest + doctor (Sonnet)

**Interfaces:** entry manifest thêm tuỳ chọn `pose: 'standing'|'flying'|'sitting'|'swimming'`, `anim: string[]` (tên clip trong GLB). `tools/manifest-pose.mjs` liệt kê clip của GLB có skeleton/animation và đề xuất `pose` (in bảng, `--write` mới ghi). `tools/doctor.mjs`: khối `section('10. Tư thế mô hình')` — `bad` khi GLB có animation/skeleton mà entry thiếu `pose`; `warn` khi `anim` khai báo không có trong file. Xuất `export function chonMoHinh(manifest, {loai, pose, anim}) -> entry|null` trong `tools/kb/chon-mo-hinh.mjs` (Task 14, 16 dùng).
**Test:** manifest giả 3 entry → `chonMoHinh({loai:'bird', pose:'flying'})` trả entry bay, không có → `null`; doctor trên manifest giả báo đúng 1 `bad`.
**Xong khi:** `node tools/doctor.mjs ep001` khối 10 không còn `bad`. Commit.

### Task 12: R15 mặt sống (Opus cho thiết kế nội suy, Sonnet viết) — mục 6.1, 11

**Interfaces** (`engine/r15.js`, giữ tương thích): `mixFace(a: tênMặt, b: tênMặt, k: 0..1) -> tham số mặt` nội suy tham số của `FACE_PRESETS` (lông mày, mí, miệng; phần không nội suy được thì đổi tại k = 0,5); pose nhận `faceFrom`, `faceMix`. `engine/shots.js` (director): mặt tại `t` = `mixFace(mặt shot trước của cùng nhân vật, mặt shot này, smoothstep(tCụcBộ / 0.25))`; `gaze` = hướng tới `shot.lookAt` (tên diễn viên/đạo cụ/`'cam'`) chiếu về hệ đầu, kẹp biên, nếu shot đã có `look`/`gaze` thì giữ nguyên nghĩa cũ (đọc cách dùng khoá `look` hiện có trước khi thêm). Chớp mắt: chu kỳ 3–5 s từ hash(`seed`, số thứ tự chớp) — kiểm lại `blink`/`seed` sẵn có, chỉ sửa nếu chưa đúng khoảng. Đồng tử: tỷ lệ theo `env.light` (đêm to hơn). Kịch bản → `face` mỗi shot (cột `mặt`). Bật/tắt: ô FX `faceLive` trong `FX_DEFAULTS` (mặc định bật cho tập mới, **tắt cho ep001**).
**Test** `tools/tests/mat-song.test.mjs` trên `engine/face-lab.html?a=smile&b=scared&c=sad`: tất định (tua tới/lui cùng pose JSON); tại ranh shot ±0,05 s tham số miệng thay đổi < 50% biên độ (mềm); hai lần chớp liên tiếp cách 3–5 s; `gaze` đổi dấu khi `lookAt` đổi bên.
**Xong khi:** test PASS; ep001 (faceLive tắt) 0 lệch; 1 agent Haiku xem bảng 3 chuyển biểu cảm và xác nhận bằng chữ. Commit.

### Task 13: bối cảnh có tầng, sự sống, giờ/thời tiết, sinh từ mô tả (Sonnet; ≤ 3–4 env mỗi agent)

**Interfaces:** env trả thêm `layers: {front: Object3D[], mid: [], back: []}` (gắn `userData.tang`), `life: string[]` (tên nhóm đã bật: `dan, xe, chim, song, co-gio`); `def()` trong `engine/envs.js` cảnh báo console khi tầng rỗng. Shot/episode nhận `time` (`sang|trua|chieu|hoang-hon|dem`) và `weather` (7 giá trị Task 2) → ánh sáng + trời + hạt qua `seaweather.js`, `wind.js`, skybox/stormsky sẵn có (bảng ánh xạ ở `engine/envs/gio-thoi-tiet.js`). `engine/envs/cong-thuc.js`: `export const CONG_THUC = { '<từ khoá đã fold>': { env, them: [...], time?, weather? } }`, `export function tuMoTa(moTa: string) -> {env, them, time, weather} | null` (khớp từ khoá dài nhất); khởi đầu ≥ 12 công thức phủ 17 env hiện có + "bến cảng sương mù".
**Test:** `tuMoTa('bến cảng sương mù')` trả đúng công thức; mô tả lạ → `null`; mỗi env qua `__measure().tang` có cả 3 tầng ≥ 1; đổi `time` sang `dem` → `tyLeToi` tăng.
**Xong khi:** 17 env đạt L8 ở 2 góc mặc định; ep001 0 lệch khi không ghi `time/weather`. Chia 3 agent theo nhóm env (biển / đất liền / nội thất + tuyết), mỗi agent file env riêng; `envs.js` + `cong-thuc.js` do agent chính sửa trước.

---

# Giai đoạn 4 — Dây chuyền (mục 10.4)

### Task 14: `tools/kb/asset-plan.mjs` (Sonnet)
`node tools/kb/asset-plan.mjs <ep>` → `output/<ep>/kiem/thieu.json`: `{ "env": [{ten, moTa, congThuc|null}], "prop": [{ten, tuThe, ungVien: [{nguon, id, giayPhep, dongManifest, ghiCong}]}], "anim": [ten], "tuDung": [..] }`. Đọc kịch bản qua `python tools/kb/kichban.py --json`; tra theo thứ tự: manifest (`chonMoHinh`) → danh mục cục bộ Kenney / Poly Haven / Quaternius → `catalog.json` Polyfork (đường dẫn file cục bộ, tool **không** tự tải mạng; thiếu danh mục → ghi `nguon: 'chua-co-danh-muc'`) → `tuDung`. **Test:** kịch bản giả cần "chim bay" khi manifest chỉ có chim đậu → nằm trong `prop` với `ungVien` rỗng hoặc `tuDung`. **Xong khi:** chạy ngược trên ep001 (kịch bản dựng lại từ `shots.js` bằng script tạm) liệt kê đúng các thứ ep001 từng phải dựng tay (đối chiếu `bao-cao.md`).

### Task 15: `tools/mau-duyet.mjs` (Sonnet)
`node tools/mau-duyet.mjs <ep>` → `output/<ep>/duyet/mau/*.jpg` + `00_mau.jpg` (lưới, rộng ~1600 px, nhãn từng ô): mỗi nhân vật × (mặt thường + 3 biểu cảm dùng nhiều nhất trong kịch bản); mỗi env × 2 góc × 2 giờ; mỗi đạo cụ `vật cần đọc`; mỗi vật liệu `chua-duyet`. Dùng trang `engine/mau-lab.html?ep=…&muc=…` (tạo mới) + `tools/kiem/nhan.mjs`. Ghi `output/<ep>/kiem/mau.json` `{muc: {hash, duyet: null|true|false}}`; mẫu bị từ chối chỉ chụp lại mẫu đó. **Test:** ep giả 1 nhân vật 1 env → đúng 4 + 4 ô; chạy lại không đổi đầu vào → không chụp lại (đếm file mtime).

### Task 16: `tools/shot-gen.mjs` (Sonnet)
`node tools/shot-gen.mjs <ep> [--force]`: gọi `python tools/storyboard.py episodes/<ep>/kich-ban.md <ep>` cho phần dựng cơ bản, rồi hậu xử lý `shots.js`: áp luật camera dồn dập (1 người → zoom in; ≥ 2 người hoặc nhà → zoom out; nhà có chân → `houseFull`), `vật cần đọc` → `insertRead` + `read`, `time/weather/lookAt/face`, `dur ≥` tối thiểu (L11), giữ `id` của kịch bản. Khi có `narration.json` thật: `--khop-giong` co giãn `dur` theo `start/end` từng câu, không dưới tối thiểu. **Test:** `kb_tot.md` → mọi shot có `id`, `type ∈ SHOT_TYPE_NAMES`, `dur ≥` tối thiểu; shot 1 người có `dist` cuối < đầu; shot 2 người ngược lại; `--khop-giong` với narration giả giữ tổng thời lượng = `total` ± 0,1 s.

### Task 17: `tools/ra-loi.mjs` + `tools/kiem/sua.mjs` (Sonnet; Opus nếu cách sửa camera không hội tụ)
`sua.mjs`: `export const CACH_SUA = { L1: [luiCamera, canGiua], L2: [canGiuaVatDoc, doiGocTranhChe, doiVatChan], L3: [luiCamera, doiGocTranhChe], L4: [themZoom], L6: [batHat], L7: [themDiemSang, nangPhoiSang], L8: [themDoPhuTheoTang], L10: [luiCamera, xoayGoc], L11: [keoDaiShot] }`, mỗi cách `(shotDong, ketQua, ng) -> {patch: object, moTa: string} | null`. L5, L9 và "thiếu mô hình/animation", "kịch bản mâu thuẫn", `--det` lỗi = **không tự sửa** → gọi người dùng ngay. `ra-loi.mjs <ep>`: đọc `luat.json` → nhóm theo luật → áp patch vào đúng dòng shot trong `shots.js` (sửa theo dòng, không ghi lại cả file) → `kiem-luat --shots <shot đã sửa>` → tối đa `vongMax` = 2 vòng mỗi nhóm → ghi nhật ký + ảnh `03_truoc-sau/sNNN_Lx_v1.jpg` (A|B). Sửa lời kể (1–3 từ) **không** nằm trong script: script in danh sách `{shot, cau, lyDo}` để skill `lam-phim` giao agent rồi tạo lại đúng câu giọng đó. Dừng với mã 1 + `goi.lyDo` khi vượt ngưỡng mục 8; không bao giờ đổi `twist`/kết, xoá asset, push. **Test:** shots giả vi phạm L11 → sau 1 vòng `dur` = ngưỡng, nhật ký có 1 dòng; vi phạm L9 → không patch, `goi.can`; 12 shot lỗi không sửa được → dừng sau 2 vòng, mã 1.

### Task 18: `tools/ghi-cong.mjs` (Haiku viết gom, Sonnet phần ảnh)
`node tools/ghi-cong.mjs <ep>` → `episodes/<ep>/ghi-cong.txt` (dán mô tả YouTube) + `episodes/<ep>/ghi-cong.png` 1080×1920 (Be Vietnam Pro, vẽ bằng trang HTML chụp qua `launchBrowser`). Nguồn: 7 file `CREDITS.md` (`assets/`, `assets/characters|music|polyfork|polyhaven|sfx|sky/`) lọc theo asset **tập đó dùng** (từ `shots.js`, `sfx/layers.json`, `music/plan.json`) + fwjelaa (FWJ STUDIOS) + thư viện MIT/zlib đang nạp. Trình phát: 3 s cuối, tắt được (tuỳ chọn `credits` trong `getOptions/setOptions`). **Test:** mọi dòng CC BY của asset được dùng có trong `.txt`; asset không dùng không có; ảnh đúng 1080×1920; cỡ chữ nhỏ nhất ≥ 28 px.

### Task 19: `tools/lam-phim.mjs` + skill `lam-phim` + danh sách giọng (Sonnet)
- `node tools/lam-phim.mjs <ep> <buoc|tiep|trang-thai>`: chạy **phần tất định** của một bước (qua `canChay`/`datBuoc`), in việc kế tiếp dạng JSON `{ "buocTiep", "canAgent": [{viec, file, model}], "canNguoiDung": null|{lyDo, anh} }`. Không gọi LLM. Bước `giong`: khởi chạy `python tools/tts.py` nền, `--dry` trước để có nhịp; CapCut lỗi hoặc không tiến 30 phút → `canNguoiDung`. Bước `gop`: `node tools/build.mjs <ep> all` → `node tools/theo-doi.mjs <ep>` → in 2 link `dist/`.
- `.claude/skills/lam-phim/SKILL.md`: kịch bản điều phối 3a–3f mục 4 (nhánh `epNNN`, commit sau mỗi bước đạt, ≤ 3 agent, MỐC DUYỆT 2 ở `00_mau.jpg`, vòng rà lỗi cuối chạy SAU khi có giọng thật, đẩy `theo-doi --json` lên artifact sau mỗi bước, khi nào gọi người dùng theo mục 8).
- Giọng: bỏ `multi_female_sisi`, `multi_female_daqi`, `multi_female_kiwi` khỏi danh sách dùng của `tools/voices_build.py`; giọng Anh giữ Andrew (Multilingual + Neural) + thêm Ava Multilingual, Emma, Brian, Steffan, Sonia (GB), William (AU); trang nghe thử chỉ Thanh Niên Tự Tin + Andrew. Không sửa `tools/voice_studio/`.
- **Test:** ep giả với mọi tool con thay bằng lệnh giả (biến môi trường `LAM_PHIM_GIA=1`) → `tiep` đi đủ 8 bước đúng thứ tự; chạy lại → không bước nào chạy lại; đổi 1 file đầu vào của bước `shot` → chỉ `shot`, `ra-loi`, `am-thanh`, `gop` chạy lại.

---

# Giai đoạn 5 — Thay lõi core, từng cái một (mục 10.5)

### Task 20 (a–d, tuần tự, mỗi cái một commit + một lần người dùng xem)
Thứ tự: (a) `troika-three-text` cho bưu thiếp/biển hiệu tiếng Việt → (b) `three-mesh-bvh` cho raycast của `measure.js` (chỉ nếu Task 8 đo > 1 s/khung) → (c) `three.quarks` cho hạt (cấp `t` tất định) → (d) `postprocessing` (pmndrs) thay dần pass trong `engine/post.js`. Mỗi cái: vendor vào `vendor/` (ghi giấy phép vào `assets/CREDITS.md`), sau **ô FX bật/tắt riêng mặc định tắt**, `node tools/look.mjs … --ab` in PSNR, `node tools/shaders.mjs` số program + giờ dịch **không tệ hơn**, `--det` đạt, bản gộp vẫn một file. Không đạt bất kỳ điều nào → giữ lõi cũ, ghi lý do vào `docs/core.md`. Mặc định bật chỉ sau khi người dùng xem A/B.

# Giai đoạn 6 — Chạy thật (mục 10.6)

### Task 21: ep002 từ một câu luật (agent chính + người dùng)
Người dùng đưa câu luật → skill `viet-kich-ban` → chọn → skill `lam-phim`. Đo và ghi vào `docs/kiem-luat-hieu-chinh.md`: phút từng bước, số lần gọi người dùng, số góp ý tay sau khi giao. **Đạt khi:** tổng ≤ 3 giờ, góp ý tay < 10, `doctor` + `look --shots all --det` xanh. Mỗi góp ý tay → một luật mới hoặc mặc định thư viện mới (mục 2), không sửa tay lần hai.

---

## Ngoài kế hoạch này
- Mục 11b.3 (cập nhật `CLAUDE.md`: R15 cho tất cả, skill mới, `output/<ep>/duyet/`) — làm sau Task 3 và Task 19, khi skill đã tồn tại.
- Nhép miệng; việc ep001 ở các phiên khác (trời, bão, gió, cỏ).

## Quyết định do Claude tự chốt trong kế hoạch (người dùng kiểm khi đọc)
1. Tên 8 bước của bảng theo dõi (mục "Quy ước chung").
2. `kich-ban.md` = `storyboard.md` + 5 cột (`giờ`, `thời tiết`, `vật cần đọc`, `tư thế`, `tối thiểu`); biểu cảm dùng cột `mặt` sẵn có.
3. `__measure` nằm trong file không-import để tiêm được vào bản gộp cũ; che khuất dùng Raycaster thường trước, `three-mesh-bvh` chỉ thêm nếu chậm.
4. Test: `node --test` + `unittest`, không thêm dependency.
5. Sửa lời kể do agent làm (qua skill), không do script `ra-loi.mjs`.
6. Tiêu chí "xanh/đỏ" của Task 8 (≤ 10 shot, ≤ 15%/luật, bắt ≥ 60% lỗi thật mỗi nhóm).
7. Giai đoạn 5 để sau dây chuyền (đúng mục 10), mọi lõi mới mặc định tắt.
