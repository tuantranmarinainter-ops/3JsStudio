# Thiết kế: quy trình "một câu luật → phim HTML" (ít phải sửa nhất)

Ngày: 2026-11-12. Người quyết định: người dùng (chủ kênh). Người viết: Claude (phiên điều phối).
Trạng thái: ĐÃ DUYỆT (người dùng, 2026-11-12). Sau khi duyệt → viết kế hoạch triển khai (superpowers:writing-plans), chia cho agent phụ.

## 1. Ý định và lý do

ep001 "Ngôi nhà biết đi" dựng bản thô rất nhanh, nhưng sau đó phải sửa **143/145 shot** (so bản v1 với bản cuối,
`output/look/v1_vs_final/bao-cao.md`). Phần lớn lỗi không phải lỗi của một shot mà là lỗi **một lần lan ra cả phim**
(nhân vật giả nhựa 27 shot, bối cảnh trống 27, vật liệu phẳng >60, bưu thiếp/chữ 20, hiệu ứng thiếu 16) cộng với lỗi
**bắt được bằng số** (camera 16, bố cục 8, mô hình sai tư thế 9). Người dùng là người kiểm duy nhất → mệt và chậm.

Mục tiêu: từ **một câu luật** của người dùng → **5 kịch bản mẫu** → người dùng chốt 1 → kịch bản đầy đủ có mô tả hình
→ người dùng duyệt → **bấm chạy** → `dist/<ep>.html` (trình phát + Xuất MP4) trong **2–3 giờ**, số lần người dùng phải
sửa tay giảm từ ~140 xuống dưới ~10. Chất lượng ≥ ep001 bản cuối.

## 2. Mục tiêu, không mục tiêu, phản mục tiêu

**Mục tiêu**
- Hai sản phẩm nối nhau: (A) skill `viet-kich-ban`; (B) quy trình `lam-phim` một lệnh + agent rà lỗi tự chạy.
- Lỗi đã sửa một lần phải thành **quy tắc kiểm** hoặc **mặc định của thư viện**, không bao giờ sửa tay lần hai.
- Người dùng chỉ có mặt ở **2 mốc duyệt** (chốt kịch bản; duyệt bảng mẫu hình) + khi agent rà lỗi gọi.
- Người dùng có **thư mục ảnh** để tự rà từng frame bất cứ lúc nào, mỗi ảnh ghi rõ số shot/frame/kết quả kiểm.
- Vật liệu và shader đúng theo loại đồ vật; biểu cảm khuôn mặt sống (chuyển mềm, mắt sống, theo lời kể).
- Thế giới tự dựng đầy đủ theo tầng, sống động, đổi được giờ/thời tiết bằng dữ liệu, sinh được từ mô tả.
- Chọn thư viện core **một lần** (miễn phí, CC0/CC BY/MIT/zlib), ghi công bằng **ảnh cuối phim + mô tả YouTube**.

**Không mục tiêu**
- Không dựng lại ep001. Thử nghiệm đầu tiên là **ep002 từ một câu luật**.
- Không render trên cloud; không TTS mới ngoài CapCut/Edge đã có.
- Không viết lại engine từ đầu: nối vào `engine/` hiện có, thay dần từng lõi.

**Phản mục tiêu** (thành công kỹ thuật nhưng vẫn là thất bại)
- Chép cốt truyện/lời kể của kênh khác. 96 file `.srt` GreenBroRants (`kich-ban/_vao/greenbro/`) CHỈ để học nhịp.
- Phim "đúng luật kiểm" nhưng shot quá ngắn, người xem không kịp hiểu chuyện gì xảy ra.
- Quy trình nhanh nhưng người dùng vẫn phải chỉ từng thứ "thêm nhà, thêm dừa, xoá cục đá".

## 3. Ràng buộc đã chốt (lời người dùng)

- Nhân vật **R15 cho tất cả**, không dùng R6 nữa (cập nhật CLAUDE.md).
- Phim 2–3 phút, ~140 shot, 1080×1920, 30 fps. Mỗi shot **không được quá ngắn** để người xem nhận diện kịp.
- Duyệt kịch bản TRƯỚC khi dựng. Từ 1 câu luật → đúng **5 kịch bản mẫu** (luật + điểm yếu + twist + kết, mỗi cái ≤ 8 dòng),
  **chưa làm gì khác** cho tới khi người dùng chọn 1.
- Thiếu bối cảnh/đạo cụ → agent **tự dựng** rồi đưa vào bảng mẫu để duyệt chung.
- Agent rà lỗi được tự sửa: camera & bố cục, đạo cụ & bối cảnh, thời lượng shot, **cả lời kể** (để khớp hình).
  Phải gọi người dùng khi: (a) còn > N shot lỗi sau 2 vòng tự sửa (N mặc định 10, mục 8), (b) gặp **loại** lỗi không
  có cách tự sửa: thiếu mô hình/animation, kịch bản mâu thuẫn, vật liệu chưa duyệt, kiểm bóng dáng (silhouette) không đạt.
- Giọng: Việt mặc định `BV075_streaming` "Thanh Niên Tự Tin"; **bỏ** "Bản Tin nữ" (multi_female_sisi), "Review Phim 3"
  (multi_female_daqi), "Sunny Idol" (multi_female_kiwi). Anh: giữ Andrew (Multilingual + Neural); Claude chọn thêm 6 giọng
  Anh hay, có nam và nữ (đề xuất giữ: Ava Multilingual, Emma, Brian, Steffan, Sonia GB, William AU). **Trang nghe thử chỉ
  dùng Thanh Niên Tự Tin + Andrew.** Tiếng động, nhạc: tự động như ep001 (lớp nen/buoc-chan/khoanh-khac/nhac).
- Bảng theo dõi = **file HTML trong `dist/`** (`dist/<ep>_theo-doi.html`), offline, có ảnh frame.
- Ghi công: ảnh cuối phim tự sinh từ các file CREDITS + cùng nội dung xuất ra `episodes/<ep>/ghi-cong.txt` để dán mô tả.
- Giữ mọi quy tắc người dùng trong `CLAUDE.md` (render trên máy, mọi tính năng bật/tắt, luôn đưa link HTML, không push
  nếu chưa bảo, agent phụ ≤ 3 cùng lúc/model rẻ/giao việc rõ).

## 3b. Bổ sung sau vòng kiểm của người xây dựng (2026-11-12)

**Người dùng chốt thêm**
- **"Bấm chạy" = một câu nói trong phiên Claude**: sau khi chọn kịch bản, người dùng nói "tôi chọn kịch bản số N, tiến hành".
  Claude điều phối toàn bộ: gọi script Node cho bước tất định, gọi agent phụ (≤ 3) cho bước cần suy nghĩ. Không cần khoá
  API riêng, không có script tự gọi LLM. `tools/lam-phim.mjs` vì vậy là script nối các bước tất định + đọc/ghi trạng thái;
  skill `lam-phim` là "kịch bản điều phối" mà Claude làm theo.
- **CapCut lỗi hoặc quá chậm giữa chừng → DỪNG và gọi người dùng**, không tự đổi sang Edge.

**Đã có sẵn trong dự án (không cần hỏi)**
- ep001 đã dùng R15 (`engine/r15.js`, `cast.js`, `docs/ban-giao-r15.md`); bộ kiểm thử "v1 đỏ, cuối xanh" đo trên R15.
- Bản v1 chạy được: `dist/ep001_v1.html` (bản gộp); bản cuối: `dist/ep001_final.html`.
- 96 file `.srt` có mốc thời gian từng câu → tính được vị trí twist theo % và mật độ câu.

**Claude tự chốt (kiểm lại khi đọc)**
- Mọi ngưỡng số ở mục 7.1 và 8 là **mặc định phỏng đoán**, hiệu chỉnh ở bước 2 (mục 10) trên ep001; ghi trong
  `episodes/<ep>/quy-trinh.json`, không cứng trong code.
- Cách đo: engine mở `window.__measure(t)` trả bbox màn hình của nhà/nhân vật/vật cần đọc, kết quả raycast che khuất,
  góc nghiêng/độ chìm, số hạt; các luật độ tối, mảng trống, silhouette đo bằng **ảnh** (nên chạy được cả trên bản v1 cũ).
  Luật cần `__measure` chỉ chạy trên trang có API (bản mới); bản v1 chỉ kiểm được luật ảnh.
- Git: mỗi tập một nhánh `epNNN`; sau mỗi bước đạt kiểm thì **tự commit** (kể cả sửa `engine/` do dựng bối cảnh mới),
  **không push**. Mỗi tập có thể dùng worktree riêng để không đụng tập khác.
- Chạy lại từng bước: mỗi bước ghi hash đầu vào vào `output/<ep>/kiem/trang-thai.json`; mẫu bị từ chối chỉ dựng lại mẫu
  đó và các bước phụ thuộc; không chạy lại cả 3c–3f.
- Giọng thật về muộn hơn bản hình: khớp lại thời lượng theo `narration.json`, câu lời kể bị agent sửa chỉ tạo lại câu đó
  (cache `.cache/tts/`), kiểm luật lại **chỉ các shot** của câu đó; vòng rà lỗi cuối cùng luôn chạy SAU khi có giọng thật.

## 4. Luồng chính (người dùng nhìn thấy gì)

```
[1] người dùng: "luật: <một câu>"          → skill viet-kich-ban
    ↳ 5 kịch bản mẫu (mỗi cái: luật, điểm yếu, twist, lời giải, kết; 1 dòng "vì sao hay")   ── MỐC DUYỆT 1a
[2] người dùng chọn 1 (có thể sửa ý)        → skill viết kịch bản ĐẦY ĐỦ: episodes/<ep>/kich-ban.md
    ↳ lời kể ~60–80 câu theo nhịp đã học + mỗi câu: bối cảnh, giờ/thời tiết, ai trong khung, hành động, biểu cảm,
      loại shot, vật cần đọc, tiếng động gợi ý; danh sách bối cảnh/đạo cụ/animation cần
    ↳ tools/kb/lint.py: kịch bản đủ trường, hành động/bối cảnh có trong thư viện hay cần dựng    ── MỐC DUYỆT 1b
[3] bấm: node tools/lam-phim.mjs <ep>
    a. asset-plan: thứ thiếu → agent dựng (scene-env / ref-model / r15-anim), ≤ 3 agent song song
    b. giọng CapCut chạy NỀN ngay (≈1 giờ), dựng hình không chờ (dùng --dry ước lượng nhịp, khớp lại khi giọng xong)
    c. mau-duyet: 1 khung mỗi nhân vật (mặt + 3 biểu cảm), mỗi bối cảnh (2 góc, 2 giờ), mỗi đạo cụ cần đọc, mỗi vật liệu
       → output/<ep>/duyet/00_mau.jpg                                                        ── MỐC DUYỆT 2
    d. shot-gen: kịch bản → shots.js (loại shot + luật camera dồn dập + liên tục nhân vật)
    e. VÒNG RÀ LỖI (agent rà lỗi, mục 7): kiem-luat → tự sửa → kiem-luat … tối đa 2 vòng/nhóm lỗi
    f. tiếng động + nhạc + phụ đề + ghi công → bundle → dist/<ep>.html + dist/<ep>_theo-doi.html
[4] người dùng xem thư mục output/<ep>/duyet/ bất cứ lúc nào (ảnh có nhãn), góp ý qua nút "Ghi chú lỗi" như cũ.
```

Thời gian mục tiêu: [1]+[2] ≤ 20 phút (chủ yếu người dùng đọc), [3] ≤ 2 giờ máy chạy (giọng song song), tổng ≤ 3 giờ.

## 5. Sản phẩm A — skill `viet-kich-ban`

- **Nhịp học từ 96 truyện** → `docs/nhip-kich-ban.json` do `tools/kb/nhip.py` tạo: số câu mỗi phần (hook/leo thang/twist/
  giải quyết), độ dài câu, vị trí câu twist (% thời lượng), kiểu câu mở ("Ở thị trấn này…"), kiểu kết (gợi lại mở đầu),
  tần suất "tôi"/"mẹ"/"bà", mật độ cảnh đổi. Chỉ số liệu, không lưu lời của họ vào skill.
- Đầu vào: một câu luật (+ tuỳ chọn: tên nhân vật, bối cảnh ưa thích, độ dài).
- Bước 1: 5 kịch bản mẫu, mỗi cái khác nhau rõ về twist (bí mật người lớn / kẽ hở luật / nguyên nhân ẩn / điểm yếu thành
  lời giải / đảo vai). KHÔNG dựng gì. Chờ người dùng chọn.
- Bước 2: kịch bản đầy đủ `episodes/<ep>/kich-ban.md`, định dạng mở rộng từ `docs/kich-ban-vao.md`: thêm cột
  `giờ/thời tiết`, `biểu cảm`, `vật cần đọc` (bưu thiếp, biển hiệu, số), `tư thế mô hình` (chim: bay/đậu), `tối thiểu giây`.
  Mỗi câu lời kể = 1–3 shot. Tổng thời lượng ước bằng `--dry` (14 ký tự/giây).
- Lint (`tools/kb/lint.py`): mọi shot có bối cảnh + loại shot; vật cần đọc có `insert` riêng ở giữa khung; hành động có
  trong `R15_ANIMATIONS` hoặc đánh dấu "cần dựng"; không shot nào dưới ngưỡng giây tối thiểu; lời kể không chứa tên riêng
  của kênh khác; câu mở đúng format.

## 6. Sản phẩm B — quy trình `lam-phim` và thư viện chuẩn

### 6.1 Thư viện chuẩn (sửa một lần, dùng mọi tập)
- **Loại shot** (`engine/shottypes.js`): giữ 11 loại, bổ sung `insertRead` (vật cần đọc: tâm vật cách tâm khung < 10%,
  tĩnh hoặc zoom rất chậm, không vật che), `houseFull` (nhà có chân: bbox nhà+chân lọt khung với lề ≥ 5%), `hug`, `fall`,
  `sinkTilt` (hành động nhà: góc nghiêng/độ chìm đo được).
- **Bối cảnh**: mỗi env khai báo `layers: {front, mid, back}` bắt buộc không rỗng; `life` (dân, xe, chim, sóng, cỏ gió);
  `timeOfDay` + `weather` từ dữ liệu (dùng `seaweather.js`, `wind.js`, skybox/stormsky đã có); **sinh từ mô tả**: bảng
  từ khoá → công thức dựng (vd "bến cảng sương mù" = sea + dock + fog + beacon), thiếu công thức thì agent dựng và thêm vào bảng.
- **Vật liệu**: mỗi đạo cụ khai báo `mat` cho từng bộ phận khi tạo (không đoán theo tên). Bảng chất liệu đã duyệt
  (`engine/mat-lab.html` → `docs/vat-lieu.md`). Grunge/aged/bụi chỉ áp cho nhóm cho phép (vải, gỗ, tường, đất); kim loại
  bóng, kính, men, da nhân vật KHÔNG. Lint vật liệu chạy trong kiem-luat.
- **Mô hình + tư thế**: `assets/manifest.json` thêm `pose: standing|flying|sitting|swimming` và `anim: [...]`; shot ghi
  hành động → chỉ chọn mô hình có tư thế/animation khớp; không có → lỗi loại "thiếu mô hình" (gọi người dùng hoặc dựng).
- **Nhân vật R15** (`docs/ban-giao-r15.md`): biểu cảm **chuyển mềm** (nội suy 0,25 s giữa 16 biểu cảm), **mắt sống**
  (nhìn theo `lookAt` đối tượng của shot, chớp theo hash tất định 3–5 s, đồng tử theo ánh sáng), **theo lời kể** (kịch bản
  ghi cảm xúc mỗi câu → lông mày/miệng/đầu). Nhép miệng: để sau.
- **Core đề xuất chọn một lần** (giấy phép ghi kèm; người dùng chấp nhận CC0/CC BY/MIT/zlib):
  hậu kỳ `postprocessing` (pmndrs, zlib) thay dần pass tự viết; hạt `three.quarks` (MIT) cấp t tất định; chữ
  `troika-three-text` (MIT) cho bưu thiếp/biển hiệu tiếng Việt; raycast/che khuất `three-mesh-bvh` (MIT) cho kiem-luat;
  noise `FastNoiseLite` (MIT) cho địa hình; shader cỏ/mây/sparkles học từ `@react-three/drei` (MIT, bỏ React); asset
  Kenney/Poly Haven/Quaternius (CC0), Polyfork (CC BY). Mây thể tích vẫn tự viết (chưa có thư viện chuẩn).
  Việc thay lõi làm **từng cái, có A/B** bằng `look.mjs --ab`, không thay đồng loạt.

### 6.2 Công cụ cần viết (mỗi dòng giao được cho 1 agent Sonnet; Haiku cho tool chỉ đếm/đọc)
| # | Tool | Vào → Ra | Xong khi |
|---|---|---|---|
| 1 | `tools/kb/nhip.py` | 96 .srt → `docs/nhip-kich-ban.json` + `docs/nhip-kich-ban.md` | số liệu 8 chỉ tiêu, không chứa lời gốc |
| 2 | skill `.claude/skills/viet-kich-ban/` | câu luật → 5 mẫu → kịch bản đầy đủ | chạy thử 1 câu luật ra 5 mẫu khác twist |
| 3 | `tools/kb/lint.py` | kich-ban.md → báo lỗi theo dòng | bắt được 6 lỗi mẫu cố ý |
| 4 | `tools/kb/asset-plan.mjs` | kich-ban.md + manifest + envs → `thieu.json` | liệt kê đúng thứ thiếu của ep001 nếu chạy ngược |
| 5 | `tools/mau-duyet.mjs` | ep → `output/<ep>/duyet/00_mau.jpg` + từng ảnh | có nhân vật×biểu cảm, env×góc×giờ, đạo cụ, vật liệu |
| 6 | `tools/shot-gen.mjs` | kich-ban.md → shots.js | mọi shot qua lint shot (id, dur ≥ tối thiểu, type có) |
| 7 | `tools/kiem-luat.mjs` | trang + shots → `output/<ep>/kiem/luat.json` + ảnh có nhãn | 10 luật mục 7.1 đo được bằng số, không nhìn ảnh |
| 8 | `tools/ra-loi.mjs` | luat.json → sửa tự động → chạy lại | dừng đúng ngưỡng mục 8, ghi nhật ký từng sửa |
| 9 | `tools/theo-doi.mjs` | nhật ký + kiem → `dist/<ep>_theo-doi.html` | mỗi shot 1 hàng × 8 bước, bấm ra ảnh |
| 10 | `tools/lam-phim.mjs` | ep → dist/<ep>.html | chạy liền 3a–3f, giọng song song, in link cuối |
| 11 | `tools/ghi-cong.mjs` | CREDITS.md các loại → ảnh cuối + `ghi-cong.txt` | ảnh 1080×1920 đọc được, đủ mọi nguồn CC BY |
| 12 | `manifest` thêm `pose/anim` + `tools/doctor` kiểm | — | doctor báo mô hình thiếu pose |
| 13 | R15 mặt sống (`engine/r15*.js`) | — | demo 3 chuyển biểu cảm mềm + mắt nhìn theo, tất định |
| 14 | thay lõi core từng cái (postprocessing, quarks, troika, bvh) | — | A/B PSNR + thời gian dịch shader không tệ hơn |

### 6.3 Thư mục ảnh cho người dùng tự rà
`output/<ep>/duyet/`: `00_mau.jpg` (bảng mẫu), `01_shots/sNNN_fFFFF.jpg` (đầu/giữa/cuối mỗi shot, 540×960, góc trên
ghi `sNNN f1234 t=41.13s` + dòng kết quả kiểm: ✅ hoặc tên luật vi phạm), `02_loi/` (chỉ shot còn lỗi), `03_truoc-sau/`
(A|B mỗi lần agent tự sửa). Ảnh ghi ra đĩa, không đưa vào chat; chat chỉ nhận bảng số.

## 7. Agent rà lỗi

### 7.1 Mười luật đo bằng số (kiem-luat.mjs, headless, dùng three-mesh-bvh + chiếu bbox)
1. Nhà có chân / vật lớn: bbox lọt khung, lề ≥ 5%, thấy đủ 4 chân (trừ shot cận có chủ đích `frame: 'close'`).
2. Vật cần đọc (`insertRead`): tâm cách tâm khung < 10%, che khuất < 5% (raycast lưới 9×9), chữ nằm trong 90% bề rộng.
3. Nhân vật chính không bị cắt nửa người; mặt không bị đạo cụ/cây che (raycast tới đầu).
4. Camera dồn dập: khung đầu ≠ khung cuối (PSNR < 30 dB) trừ shot `static: true`.
5. Hành động nhà (chìm, nghiêng, bước): đo góc/độ chìm ở khung giữa ≥ ngưỡng của loại shot.
6. Chân chạm đất → có hạt bụi/tuyết trong bán kính; cảnh tuyết/mưa có hạt rơi (đếm > 0).
7. Cảnh đêm: pixel < 10% độ sáng chiếm < 55%; ≥ 3 điểm sáng (cửa sổ, đèn, trăng).
8. Bối cảnh không trống: lưới 4×4, ô một màu phẳng < 30%; ba tầng front/mid/back đều có vật.
9. Vật liệu đúng loại: mọi mesh có `mat` khai báo; kim loại/kính/men không bị grunge; không `MeshStandard` trơn cho vật chính.
10. **Bóng dáng (silhouette test)**: render mặt nạ đen nhân vật chính + vật chính trên nền trắng; vùng chính ≥ 8% khung,
    không dính vào vật khác (số thành phần liên thông đúng), tư thế đọc được (bbox tay/chân tách khỏi thân ở shot hành động).
Cộng: thời lượng shot ≥ tối thiểu theo loại (mặc định: insertRead 1,5 s; closeup 0,8 s; hành động 1,0 s; establish 1,2 s).

### 7.2 Vòng sửa
`ra-loi.mjs` nhóm lỗi theo luật → áp cách sửa có sẵn (lùi/căn camera, đổi góc tránh che, dời/bớt vật chắn, thêm đồ phụ
theo tầng, kéo dài shot, đổi tư thế mô hình, sửa 1–3 từ lời kể để khớp hình và tạo lại câu giọng đó) → kiem-luat lại.
Mỗi nhóm tối đa 2 vòng. Mọi sửa ghi vào `output/<ep>/kiem/nhat-ky.jsonl` + ảnh trước/sau.

## 8. Khi nào gọi người dùng (ngưỡng mặc định, chỉnh trong `episodes/<ep>/quy-trinh.json`)
- Sau 2 vòng còn **> 10 shot** lỗi, hoặc 1 luật lỗi ở **> 15% số shot** → dừng, gửi bảng số + `02_loi/` + 1 ảnh lưới.
- Gặp lỗi loại **không tự sửa được** → gọi ngay dù 1 lần: thiếu mô hình/animation, kịch bản mâu thuẫn hình (lời nói A,
  hình bắt buộc B), vật liệu chưa có trong bảng duyệt, silhouette không đạt sau 2 vòng, tất định (`--det`) lỗi.
- Một bước quá **30 phút** không tiến (nhật ký không đổi) → gọi.
- Không bao giờ: push, xoá asset, đổi cốt truyện (twist/kết) khi tự sửa.

## 9. Bảng theo dõi — hai tầng (người dùng chốt 2026-11-12: làm 3 tập song song, cần theo dõi từ xa)

**Tầng 1 — artifact "Bảng sản xuất phim"** (xem trên điện thoại; bản mẫu dữ liệu giả: https://claude.ai/artifact/2VXWaFbnB5HHk8EvuzDUdL — **người dùng đã duyệt bố cục 2026-11-12**; khi chạy thật ghi đè dữ liệu mẫu bằng dữ liệu thật trên cùng artifact này):
- Mỗi tập một thẻ: tên, câu luật, bước N/8, thanh 8 bước, shot qua kiểm, lỗi còn, số lần gọi, **token (phiên chính + agent phụ)
  và chi phí ước tính**, giờ cập nhật gần nhất; thẻ nổi bật khi "đang chờ bạn" kèm việc cần duyệt.
- Biểu đồ token cộng dồn theo giờ của từng tập; bảng lỗi còn lại theo luật; bảng phút từng bước.
- Dữ liệu ở kho của artifact (các dataset `tap`, `buoc`, `loi`, `token`). Mỗi khi một bước xong, Claude điều phối ghi vào kho
  bằng `ArtifactData` (tool `tools/theo-doi.mjs` xuất JSON, Claude đẩy lên). Token đọc từ transcript trên máy như hook
  `session-guard`; cộng theo phiên con làm tập đó. Chỉ đẩy lên **ảnh nhỏ**: bảng mẫu duyệt và ảnh lưới lỗi.
- Hạn chế: cần mạng; chỉ cập nhật khi phiên Claude đang chạy bước đó → luôn hiện giờ cập nhật gần nhất.

**Tầng 2 — `dist/<ep>_theo-doi.html`** (offline, đầy đủ): hàng = shot (id, câu lời kể, loại, giây); cột = 8 bước; ô bấm mở ảnh
trong `output/<ep>/duyet/`; đầu trang: thời gian từng bước, số lần gọi, lỗi còn lại. Tự cập nhật từ `nhat-ky.jsonl`.

**Asset từ nguồn ngoài** (người dùng xác nhận là khâu chưa ổn): tool 4 `asset-plan` phải (a) tra `manifest.json` theo loại +
tư thế, (b) tra danh mục ngoài theo thứ tự Kenney → Poly Haven → Quaternius → Polyfork (catalog.json công khai) và ghi
sẵn dòng manifest + ghi công, (c) chỉ khi không có mới giao agent dựng bằng code. Mọi asset tải về vào thư mục riêng, không chạy
script từ đó; thiếu giấy phép rõ → không dùng.

## 10. Thứ tự làm (đề xuất, chốt ở bước lập kế hoạch)
1. Nhịp kịch bản (tool 1) + skill viết kịch bản (2) + lint (3) → thử ngay với 1 câu luật của người dùng.
2. Kiểm luật (7) + thư mục duyệt (6.3) + bảng theo dõi (9) → chạy trên ep001 hiện có để hiệu chỉnh ngưỡng (ep001 là bộ
   kiểm thử: bản v1 phải "đỏ", bản cuối phải "xanh").
3. Thư viện chuẩn: loại shot mới, khai báo vật liệu, pose trong manifest, R15 mặt sống (13).
4. shot-gen (6), mau-duyet (5), asset-plan (4), ra-loi (8), lam-phim (10), ghi-cong (11).
5. Thay lõi core từng cái (14), mỗi cái một A/B.
6. Chạy thật ep002 từ một câu luật, đo thời gian và số lần gọi người dùng; sửa ngưỡng.

## 11. Để lại cho người xây dựng
- Định dạng chính xác `kich-ban.md` mở rộng (giữ tương thích `storyboard.py`).
- Cách nội suy biểu cảm R15 (morph/blend giữa bộ mặt vẽ) và nguồn `lookAt` theo shot.
- Chi tiết công thức "sinh từ mô tả" và cách lưu bảng từ khoá.
- Ảnh ghi công: bố cục, phông (Be Vietnam Pro), thời lượng hiện (đề xuất 3 s cuối, có thể tắt trong trình phát).
- Số lượng/thứ tự agent trong lam-phim (tôn trọng ≤ 3 cùng lúc).

## 11b. Bước kế tiếp (bàn giao cho phiên mới)
Phiên thiết kế đã dài. Phiên mới bắt đầu bằng: "Đọc docs/superpowers/specs/2026-11-12-quy-trinh-mot-cau-luat-ra-phim-design.md
rồi làm tiếp mục còn lại số 1." Mục còn lại:
1. Người dùng duyệt bản thiết kế này (sửa trực tiếp hoặc nói miệng) → cập nhật file.
2. Viết kế hoạch triển khai (skill superpowers:writing-plans) theo thứ tự mục 10; mỗi tool ở 6.2 là một việc giao agent
   Sonnet (Haiku cho tool chỉ đếm), ≤ 3 agent cùng lúc, mỗi agent file riêng.
3. Cập nhật `CLAUDE.md`: R15 cho tất cả; thêm skill `viet-kich-ban`, `lam-phim`; thư mục `output/<ep>/duyet/`.
4. Việc ep001 đang chạy ở phiên con `ep001-sky-storm` (trời, bão, góp ý 3 đợt) và phiên fork (gió, cỏ) — không trộn vào đây.

## 12. Quyết định do Claude tự chốt (người dùng kiểm lại khi đọc)
- N = 10 shot lỗi; 15%/luật; 30 phút/bước; ngưỡng giây tối thiểu theo loại shot (mục 7.1).
- 6 giọng Anh thêm: Ava Multilingual, Emma, Brian, Steffan, Sonia (GB), William (AU).
- Nhép miệng để giai đoạn sau; ba yêu cầu mặt (mềm, mắt, theo lời) làm trước.
- ep001 dùng làm bộ kiểm thử cho kiem-luat (v1 đỏ, cuối xanh), không dựng lại.
- Thư viện core thay từng cái có A/B; không "đại tu" một lần.
