# CLAUDE.md — Workspace Short "Ở thị trấn này…" (phong cách khối vuông)

## Mục tiêu
Sản xuất video short dọc 1080×1920 theo format "Ở thị trấn này…".
Một phim hoàn chỉnh ghép từ **~140 cảnh nhỏ (shot)** → mọi thứ thiết kế theo đơn vị shot.
Độ dài phim: **2–3 phút** (chuẩn của format) → ~1 giây/shot.

## Format "Ở thị trấn này" (= "In This Town" Roblox story)
- Hoạt hình kể chuyện (không phải gameplay): một **luật lạ** chi phối cả thị trấn, kể **ngôi thứ nhất** bởi một
  đứa trẻ, có **giọng đọc** dẫn truyện, nhạc + hiệu ứng âm thanh riêng.
- Luật nên giống **cơ chế game** (thanh máu, chỉ số, % pin, con số trên đầu, "sàn là dung nham", đếm ngược…),
  nói được trong **1 câu**.
- Nhân vật chính có **điểm yếu** do luật gây ra (pin 1%, may mắn = 0…). Người lớn (mẹ, bà) thường giữ **bí mật**.
- Twist = **nguyên nhân ẩn / bí mật người lớn / kẽ hở của luật** — KHÔNG phải chỉ là quái vật xuất hiện.
- Kết: **điểm yếu của nhân vật trở thành lời giải**.
- Chỉ dùng ý tưởng TỰ NGHĨ; không chép cốt truyện của kênh khác.
Cảnh 3D dựng bằng three.js, render ra MP4 bằng **HyperFrames**. Claude điều khiển qua skill + CLI + Polyfork MCP.

## Stack (chỉ 3 thành phần)
| Lớp | Công cụ | Vai trò |
|---|---|---|
| Render video | **HyperFrames** (heygen-com/hyperframes, Apache 2.0) | HTML → MP4 tất định; chữ, phụ đề, chuyển cảnh, âm thanh; Studio để xem trước |
| Cảnh 3D | **three.js** + engine tự viết (`engine/`) | Nhân vật R6, thị trấn, camera |
| Asset | **Kenney** (gốc) + **Polyfork** (bổ sung, có MCP) | Nhà, đường, đạo cụ |

Cài đặt: `npx hyperframes init` (workspace là một project HyperFrames, Node ≥ 22),
`npx skills add heygen-com/hyperframes` (thêm /hyperframes, /hyperframes-cli, /gsap + skill three).
Ghim phiên bản HyperFrames trong package.json (frame adapter còn là bản thử nghiệm v0).

## Cấu trúc thư mục
```
CLAUDE.md
engine/
  r6.js        nhân vật R6 (6 khối, 15 animation, 8 biểu cảm, randomLook)
  stage.js     renderer 1080×1920, camera, ánh sáng, nghe sự kiện hf-seek
  town.js      dựng thị trấn từ asset Kenney/Polyfork theo seed
  shots.js     thư viện LOẠI SHOT (camera + bố trí mặc định), dùng lại cho mọi tập
  timeline.js  t toàn cục → shot đang chạy + t cục bộ; nối trạng thái nhân vật giữa các shot
assets/
  kenney/      GLB CC0 (City Kit Roads/Commercial/Suburban)
  polyfork/    asset tải từ Polyfork — nằm trong .gitignore (không được phân phối lại .mjs/HD)
  special/     GLB riêng cho twist (quái vật, vật thể lạ)
  manifest.json  id, nguồn, giấy phép, scale chuẩn hoá, node, clip
episodes/
  _template/             tập mẫu
  ep001/
    episode.js   cấu hình tập (seed, diễn viên, luật, twist)
    shots.js     danh sách ~140 shot (dữ liệu thuần, mỗi shot 1 dòng)
    index.html   composition HyperFrames tổng (đọc 2 file trên)
output/        MP4, ảnh preview
```

## Hệ thống shot (~140 shot / phim)
**Nguyên tắc:** shot là DỮ LIỆU, không phải code. Không viết tay 140 cảnh — chọn LOẠI SHOT có sẵn rồi điền tham số.

`episodes/epNNN/episode.js` — cấu hình chung, khai báo 1 lần:
```js
export const EPISODE = {
  seed: 7,                                   // thị trấn + dân giống hệt mỗi lần render
  rule: 'Ai đi bộ cũng phải nhảy',
  twist: 'special/monster.glb',
  actors: { hero: { shirt: '#e74c3c', face: 'smile' }, mom: { shirt: '#8e44ad' }, crowd: { count: 12 } },
  places: { square: [0, 0, 0], shop: [20, 0, -8], home: [-15, 0, 10] },
};
```

`episodes/epNNN/shots.js` — mỗi shot 1 dòng, chỉ ghi phần KHÁC mặc định:
```js
export const SHOTS = [
  { id: 's001', dur: 1.5, type: 'establish', at: 'square', text: 'Ở thị trấn này…' },
  { id: 's002', dur: 1.0, type: 'crowd',     at: 'square', anim: 'jump' },
  { id: 's003', dur: 0.8, type: 'closeup',   who: 'hero',  face: 'surprised' },
  { id: 's004', dur: 1.2, type: 'walkBy',    who: 'hero',  at: 'square', anim: 'walk' },
  // … ~140 dòng
];
```

Loại shot trong `engine/shots.js` (thư viện dùng chung, ~10–12 loại, thêm khi thật cần):
establish (toàn cảnh), crowd (đám đông), walkBy (đi ngang), follow (bám theo), closeup (cận mặt),
reaction (phản ứng), overShoulder (qua vai), insert (cận đạo cụ), chase (rượt), reveal (lộ twist), dialogue (thoại 2 người).
Mỗi loại tự quyết camera + bố trí mặc định; shot chỉ ghi đè khi cần.

Quy tắc shot:
- `id` cố định (s001…), không đánh số lại khi chèn — chèn thì dùng `s012a`.
- `dur` tính bằng giây; tổng thời lượng = tổng `dur`, phải khớp độ dài mục tiêu.
- **Liên tục giữa các shot:** `timeline.js` giữ vị trí/hướng/trang phục nhân vật nối từ shot trước sang shot sau,
  trừ khi shot ghi rõ `at`/vị trí mới.
- Phụ đề lấy từ lời dẫn (theo câu), không gõ lại trong shot; trường `text` chỉ cho chữ nổi đặc biệt (tiêu đề luật, con số).
- Giọng đọc, nhạc: 1 track liền cho cả phim (không cắt theo shot). Hiệu ứng âm thanh gắn theo shot (`sfx`).

Render 140 shot:
- Preview: xem 1 frame giữa mỗi shot (contact sheet) để duyệt nhanh cả phim.
- Render theo **đoạn** (~10–20 shot/đoạn) để chạy song song và chỉ render lại đoạn có shot bị sửa; ghép bằng FFmpeg.
  (Kiểm tra HyperFrames CLI có render theo khoảng frame không; nếu không, mỗi đoạn là 1 composition riêng.)
- Claude chủ yếu sửa `shots.js`/`episode.js`, hạn chế sửa `engine/`.

## Quy tắc kỹ thuật (bắt buộc)
- Thời gian chỉ lấy từ HyperFrames: sự kiện `hf-seek` (`e.detail.time`) → đặt pose/camera → `renderer.render()` 1 lần.
- CẤM dùng giờ thực, `requestAnimationFrame`/`setAnimationLoop` cho chuyển động, `Math.random()` không seed.
- Tải xong mọi GLB/texture trước khi seek; không fetch trong lúc seek.
- Mọi animation là hàm thuần của `t`, tua tới/lui/nhảy cóc đều ra cùng kết quả.
- Đặt tên rõ cho object, bộ phận, clip — đó là "tay cầm" để Claude điều khiển.
- Sau mỗi thay đổi: xem preview vài frame (đầu, giữa mỗi shot, cuối) trước khi render cả video.
- Không dùng logo, tên, mặt/decal hay asset chính thức của Roblox.

## Nhân vật R6 (`engine/r6.js`)
- Dùng cho cả nhân vật chính lẫn dân thị trấn; dựng bằng code, không cần GLB hay Mixamo.
- 6 khối có tên: `torso`, `head`, `rightArm`, `leftArm`, `rightLeg`, `leftLeg` + `body` (nhún/nhảy/ngã) + `hat`.
- Pivot cổ/vai/hông. Mặt nhìn +Z; tay PHẢI ở -X. 1 đơn vị = 1 stud, cao ~5.2.
- API: `createR6(THREE, opts)` → `.animate(name, t, {from, mix})`, `.setFace()`, `.setColors()`, `.setHat()`.
- Animation: idle, walk, run, jump, fall, wave, point, sit, scared, cheer, dance, lookAround, faint, cower, tpose.
- Biểu cảm: smile, happy, neutral, sad, scared, surprised, angry, sleepy.
- Dân thị trấn: `randomLook(seed)`. Animation mới = thêm 1 hàm `(t) => pose` vào `R6_ANIMATIONS`.

## Asset
1. **Kenney** (kenney.nl, CC0, scale 1.0) — bộ gốc: City Kit Roads/Commercial/Suburban.
2. **Polyfork** (polyfork.dev) — chỉ khi Kenney thiếu. MCP `https://polyfork.dev/mcp` (search_assets,
   get_asset, get_variant, list_kits, get_kit). Đọc `https://polyfork.dev/prompt.txt` lần đầu.
   Tải về `assets/polyfork/` trước khi render. Dùng thương mại OK, không phân phối lại `.mjs`/HD.
3. **GLB riêng** (`assets/special/`) — chỉ cho twist. Nguồn gợi ý: Quaternius (quái vật; kiểm tra giấy phép QAL).
- Mỗi asset nhập vào phải có dòng trong `assets/manifest.json`. Chuẩn hoá scale về chuẩn Kenney.
- Không dùng Blender trừ khi không còn cách khác.

## Cấu trúc phim (~140 shot, 2–3 phút)
1. **Hook** ~10% (≈15 shot): 2–3 giây đầu phải có câu "Ở thị trấn này, …" + hình minh hoạ luật ngay.
   Sau đó giới thiệu "tôi" và điểm yếu của tôi theo luật.
2. **Leo thang** ~40% (≈55 shot): luật làm khổ nhân vật, rủi ro tăng dần, có ít nhất 1 lần suýt thất bại.
3. **Twist** ~25% (≈35 shot): lộ nguyên nhân ẩn / bí mật người lớn / kẽ hở của luật.
4. **Giải quyết** ~25% (≈35 shot): điểm yếu thành lời giải; kết ấm áp hoặc bất ngờ nhẹ, cảnh cuối gợi lại cảnh đầu.

## Quy trình làm một tập (giọng đọc dẫn nhịp)
1. Chốt **luật, điểm yếu, twist, lời giải** — mỗi thứ 1 câu.
2. Viết **lời dẫn** (ngôi thứ nhất, câu ngắn) theo 4 phần trên.
3. Tạo **giọng đọc** → lấy thời điểm từng câu → thời lượng shot bám theo câu thoại (1 câu ≈ 1–4 shot).
4. Bẻ từng câu thành shot trong `shots.js` (mỗi shot ghi `line` = số câu thoại nó minh hoạ).
5. Thiếu asset → Kenney trước, Polyfork sau; ghi manifest.
6. Xem contact sheet cả phim → sửa shot lỗi → render từng đoạn → ghép MP4 1080×1920.

## Sử dụng agent
- Claude ĐƯỢC PHÉP dùng agent nhỏ hơn (Haiku/Sonnet) để hỗ trợ, không cần hỏi lại.
- 3 vai:
  - **kịch bản**: luật, twist, lời dẫn; bẻ câu thoại thành shot — mỗi agent nhận 1 phần (~35–55 shot) chạy song song.
  - **asset**: tìm/tải/manifest.
  - **kiểm tra**: xem contact sheet, báo shot lỗi (bố cục, camera, chữ, liên tục nhân vật, thời lượng) theo `id`.
- Agent chính giữ `episode.js`, dàn ý và tính liên tục; ghép kết quả và quyết định cuối. Việc nhỏ thì tự làm.

## Nghiên cứu video tham khảo (`tools/ref.py`)
- Cần `yt-dlp` + `ffmpeg`. Lời thoại chỉ lấy từ phụ đề có sẵn (vi/en, kể cả tự động), không nhận dạng giọng. Chạy: `python tools/ref.py "ytsearch5:In This Town roblox story"`
  hoặc dán URL/file. Kết quả ở `refs/<id>/` (chỉ báo cáo + ảnh được commit; video nằm trong `.gitignore`).
- Claude đọc `report.md` (thống kê shot, nhịp 4 phần, lời thoại theo shot) + `sheets/*.jpg` (mỗi ô 1 shot).
- Nhiều video → `refs/summary.md` so sánh độ dài, số shot, shot/phút.
- Bắt thiếu cắt cảnh → giảm `--thr` (vd 0.15); bắt thừa → tăng (vd 0.35).
- Chỉ để học nhịp/cấu trúc; không chép cốt truyện, không đăng lại nội dung người khác.

### Chạy tự động trên GitHub Actions (Claude tự làm, không cần người dùng)
- Cloud của Claude không vào được YouTube → việc tải + phân tích chạy trên GitHub Actions (`.github/workflows/ref.yml`).
- Claude chạy: `tools/ref_remote.sh "ytsearch5:In This Town roblox story" "<url>"` trong repo
  → ghi vào `refs/queue.txt`, push → Actions tải, phân tích, commit `refs/<id>/` → script tự `git pull` và in tóm tắt.
- Sau đó Claude đọc `refs/summary.md`, `refs/<id>/report.md`, `refs/<id>/sheets/*.jpg`; lỗi xem `refs/errors.md`.
- Video bị xoá trên Actions, chỉ commit báo cáo + ảnh nhỏ. Repo nên để **private**.
- YouTube đòi "xác minh không phải bot" → người dùng thêm secret `YT_COOKIES` (nội dung cookies.txt) cho repo.
