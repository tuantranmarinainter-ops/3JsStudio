---
name: r6-anim_RO
description: Bản thử phong cách học từ 37 video (sổ tay phong cách), chạy độc lập với r6-anim — danh mục mặt + tư thế + clip (nhãn cảm xúc, tần suất, độ dài, nhanh/chậm, lặp/một lần, đường cong cảm xúc theo phần) đối chiếu engine/r6.js: ĐÃ CÓ / THIẾU / KHÔNG CHẮC VẼ ĐƯỢC. CHỈ dùng khi người dùng gọi đích danh "r6-anim_RO" hoặc "bản RO"; không tự kích hoạt cho animation thông thường (việc đó là của skill r6-anim).
---

# Animation R6 (three.js) — phương pháp fwjelaa, chuyển sang engine của repo

Tài liệu gốc (Roblox/Blender): `skills/fwjelaa/animations/CLAUDE.md` + `anims/R6_Walk.py`, `anims/R6_Run.py`,
`anims/_lib.py`, `research/03-animation-craft.md`. Cloud không có Blender/Studio → chỉ dùng **phương pháp**, viết
animation thẳng vào `R6_ANIMATIONS` trong `engine/r6.js`. Method by fwjelaa (FWJ STUDIOS) — nhắc người dùng 1 lần.

## Đổi quy ước góc (fwjelaa → r6.js, radian)
| fwjelaa (độ, trục phần cha) | r6.js |
|---|---|
| tay/chân `+x` = vung ra TRƯỚC | `.x < 0` = ra trước (đổi dấu) |
| torso `-x` = cúi trước | `torso.x > 0` = cúi trước |
| `+z` tay phải ra ngoài | `rightArm.z < 0` ra ngoài; `leftArm.z > 0` ra ngoài |
| root `py < 0` ngồi xuống | `body.y < 0` |
| 60 fps, frame | t giây (frame/60), phim chạy 30 fps |

## Quy trình
1. Có tham chiếu → lấy frame từ `refs/<id>/frames/` (hoặc `refs/<id>/sheets`), ghi pha: chuẩn bị, chạm, theo đà,
   hồi; mỗi pose chính bằng pose language; góc máy.
2. Lập timeline trước khi code (bảng dưới), rồi viết `(t, o) => pose` trong `R6_ANIMATIONS`. Hàm thuần của t, không
   trạng thái, không `Math.random()`.
3. Xem bằng `node tools/look.mjs episodes/_lab/index.html --query "view=chars&anim=<tên>" --t 0,0.1,0.2,… --sheet output/look/<tên>/sheet.jpg` từ **2 góc**
   (3/4 trước và ngang). Sửa lỗi lớn nhất trước. 3–6 vòng.

## Timing (60 fps; snappy / weighty) → chia 60 ra giây
- Idle 90-150 / 180-300 f; nhún thân 0.06-0.12 stud; tay trễ 4-8 f.
- Walk chu kỳ 40-48 / 56-64 f (2 bước); chân ±25-35°, tay ±20-35° ngược pha; tay trễ chân ~3 f.
- Run 26-30 / 32-40 f; nghiêng trước 12-20°; chân ±50-70°; nhún 0.2-0.35.
- Nhảy: lấy đà 3-5 f, đỉnh ≈ f15, chạm đất 2-3, hồi 8-12.
- Phản ứng bị đánh/giật mình: không lấy đà, vào pose trong 1-3 f, lắng 8-14 f.
- Overshoot 8-15% của động tác, 2-3 f, lắng 4-8 f. Overlap: thân +1 f, tay +2, đầu +2-4.

## Craft rules (rút gọn)
- Tăng tốc vào điểm chạm, dừng gắt, chỉ ease ở đoạn ra. Lấy đà:hồi ≈ 1:3-4 (snappy), 1:2 (weighty).
- Không đứng yên quá 6 f (snappy) / 10 f (weighty): dùng "moving hold" (trôi nhẹ bằng sin biên độ nhỏ).
- Pose chính khác nhau ≥30° ở chi chính; chi cách thân 20-30° để silhouette đọc được.
- R6 không có gối/khuỷu: chân xoạc → thân hạ (bù `body.y`); nghiêng/xoay thân thì xoay chân ngược lại để chân không trượt.
- Đi tại chỗ là băng chuyền: chân chịu lực trượt lùi **đều tốc**; tốc độ dời root phải = sải chân (xem R6_Walk.py:
  2 stud / 22 f ≈ 5.45 stud/s). Đặt tốc độ di chuyển của shot khớp `speed` của walk.
- Đầu giữ mắt vào mục tiêu (không offset trễ đầu). Clip bắt đầu và kết thúc cùng một tư thế; loop không có mối nối.

## Quality bar
1. Đọc được trong 1 khung (sau lưng + 3/4 trước). 2. Timing đúng chỗ nhanh/chậm. 3. Có trọng lượng (xoay, cúi, lấy đà).
4. Chạm sạch: chân trên sàn, không xuyên thân, không giật. 5. Quỹ đạo cong (≥3 key qua một cú vung). 6. Nối được.

---

# PHẦN RO — Danh mục mặt + tư thế + clip học từ 37 video (thử nghiệm, độc lập với `r6-anim`)

Nguồn: sổ tay mục 13 (G: cảm xúc mặt + hành động) và `output/hoc-phong-cach/kiem-bo-sot.md` nhóm "Cảm xúc + animation" (E1–E7). Đối chiếu `engine/r6.js`, `engine/cast.js`, `engine/anim-them.js`, `engine/anim-nch.js`, `docs/danh-muc.md` ngày 19/11/2026. Không sửa `engine/` khi chỉ dùng skill này để lập kế hoạch.
Mọi mặt/clip THIẾU = "cần code, bật/tắt được, mặc định tắt" (CLAUDE.md: tính năng mới phải tắt được).

## Độ tin của số liệu
- Nhãn mặt do agent đọc từ dải 10 khung, mặt chỉ ~10 px (sổ tay mục 13, 9 mẫu): số lần chỉ là xấp xỉ, ±1 ô. Chưa có bảng ảnh mặt cắt riêng (E6, việc mở).
- Đọc được mặt ở 331/846 shot = 39% (sổ tay mục 13, 9 mẫu); 61% còn lại mặt quay đi/nhỏ/khuất → không cần mặt cầu kỳ cho các shot xa.
- Chưa đo riêng: độ trễ phản ứng sau câu then chốt, nhịp đứng khựng (freeze beat), thời lượng clip bằng giây. Chỉ có đại diện gián tiếp, ghi ở mục dưới.

## Quy ước R6 quan trọng (đã kiểm engine)
- `R6_FACES` (engine/r6.js:38) chỉ 8 tên: smile, happy, neutral, sad, scared, surprised, angry, sleepy. Nhưng mặt vẽ có **hai kiểu** (`faceStyle`, r6.js:24,130):
  - `classic` — `drawFace` r6.js:169, case happy/neutral/sad/scared/surprised/angry/sleepy/smile; **tên lạ rơi về smile** (default).
  - `cartoon` — `drawCartoonFace` r6.js:309 (mắt oval + lông mày), có thêm **worried, panic (vẽ như scared), cold, moved, sleep** (r6.js:333–346). Muốn đọc lo lắng/hoảng/lạnh/xúc động thì nhân vật phải dùng `faceStyle: 'cartoon'`; kiểu classic sẽ ra mặt cười.
- Bí danh `FACE_ALIAS` engine/cast.js:43: anxious/nervous/confused/thinking → worried; afraid/fear/terrified → scared; serious/calm/flat → neutral; touched/grateful/relieved → moved; freezing → cold; smirk/smug/proud → **grin (R6 chưa vẽ grin → smile)**; embarrassed/blush → **shy (R6 chưa vẽ shy → smile)**; laughing/lol → **laugh (R6 chưa vẽ → smile)**; cry/crying/tearful/upset → sad.
- Mặt tiếng Việt (`quyet_tam`, `thac_mac`, `boi_roi`, `nghi_ngo`…, docs/danh-muc.md) thuộc **mặt ảnh Gà/R15** (`GA_FACES`), không phải mặt vẽ R6.

## Bảng mặt (nhãn thấy → R6)
Nguồn số lần: (sổ tay mục 13, 9 mẫu) trừ khi ghi khác. "Phần video": theo đường cong cảm xúc ở mục dưới (sổ tay không tách nhãn × phần).
| Nhãn (số shot) | Tên engine R6 | Trạng thái | Ghi chú / phần video |
|---|---|---|---|
| buồn (69) | `sad` | **ĐÃ CÓ** r6.js:190 (classic), r6.js:336 (cartoon) | twist; cận mặt buồn khi thoại chỉ 1/9 video (sổ tay mục 9, 37 video / 9 mẫu) |
| vui (53) | `smile`, `happy` | **ĐÃ CÓ** r6.js:206 / r6.js:183 | giải quyết, hook |
| giận (51) | `angry` | **ĐÃ CÓ** r6.js:200 (classic), r6.js:350 (cartoon) | leo thang |
| ngạc nhiên (35) | `surprised` | **ĐÃ CÓ** r6.js:197 / r6.js:331 | hook, twist |
| sợ (31) | `scared` | **ĐÃ CÓ** r6.js:192 / r6.js:333 | leo thang |
| hoảng (6) | `panic` | **ĐÃ CÓ** tên ở cartoon r6.js:333 (cùng nét với scared); classic rơi về smile. Clip `panic` đặt mặt `panic` (r6.js:506) | leo thang; chưa tách khác `scared` |
| lo lắng (9) | `worried` | **ĐÃ CÓ** chỉ ở cartoon r6.js:336 (vẽ chung nét với sad); classic rơi về smile | alias anxious/nervous → worried (cast.js:45) |
| tức giận (3) | `angry` | **ĐÃ CÓ** (gộp với giận) | |
| "tron" (19) | không có (`grin` chỉ là bí danh cast.js:46, r6.js không vẽ) | **THIẾU** — **KHÔNG CHẮC** nghĩa nhãn (sổ tay mục 13 chỉ ghi "tron", không giải nghĩa; bản không dấu). Nếu là tinh nghịch/ranh mãnh thì vẽ được (miệng lệch + một mày nhướng) | cần hỏi người dùng nhãn nghĩa gì trước khi code |
| khó chịu (7) — "kho-chiu" | không có; gần nhất `cold` (nhắm tịt ><, r6.js:339) hoặc `sad` | **THIẾU** — vẽ được (mày chau, miệng méo, mắt hơi nheo) | cần code, bật/tắt được, mặc định tắt |
| quyết tâm / determined (5) | không có; gần nhất `neutral`/`angry` (alias serious → neutral, cast.js:47) | **THIẾU** — vẽ được (mày chéo xuống, miệng thẳng, mắt hơi hẹp) | cần code, bật/tắt được, mặc định tắt; `quyet_tam` hiện chỉ là mặt Gà |
| gắng sức (3) — "strained" | không có; gần `cold`/`angry` | **THIẾU** — vẽ được (mắt >< + răng nghiến) nhưng dễ lẫn với khó chịu | gộp chung 1 mặt với "khó chịu" nếu muốn tiết kiệm |
| lạnh (không đếm riêng) | `cold` | **ĐÃ CÓ** cartoon r6.js:339 (nhắm tịt >< + miệng run); clip `shiver` r6.js:488 đặt mặt `cold` | cảnh lạnh/dưới nước |
| xúc động (không đếm riêng) | `moved` | **ĐÃ CÓ** cartoon r6.js:344 (mắt long lanh + giọt nước + môi mím) | twist→giải quyết; alias touched/grateful/relieved |

Tổng đối chiếu 12 nhãn của sổ tay: **ĐÃ CÓ 8** (buồn, vui, giận, ngạc nhiên, sợ, hoảng, lo lắng, tức giận), **THIẾU 4** (trơn "tron" — kèm KHÔNG CHẮC nghĩa nhãn, khó chịu, quyết tâm, gắng sức); ngoài danh sách có sẵn thêm `cold`, `moved`, `sleep/sleepy`, `neutral`. Cả 4 nhãn THIẾU đều vẽ được trên mặt canvas R6 (mắt + mày + miệng) trừ "tron" chưa rõ nghĩa → KHÔNG CHẮC. Số liệu 12 nhãn: (sổ tay mục 13, 9 mẫu).

## Bảng clip (hành động thấy → R6)
Cột "Dài" là mức do agent ghi (ngắn / vừa / dài), sổ tay không có giây; "Lặp" của sổ tay: mọi clip đều **một lần** trong shot (sổ tay mục 13, 9 mẫu). Engine: idle/walk/run là vòng lặp, các clip khác chạy theo `t` của shot.
| Clip (số lần) | Tên engine | Dài | Lặp | Trạng thái |
|---|---|---|---|---|
| đứng thở (32) | `idle` r6.js:371 | vừa | một lần (engine: vòng) | **ĐÃ CÓ** |
| đi (13) | `walk` r6.js:378 | vừa | một lần (engine: vòng) | **ĐÃ CÓ** |
| giật mình (11 + 6) | `scared` r6.js:434 (+ `nch_shock`, `cower` r6.js:477) | ngắn | một lần | **ĐÃ CÓ** (hai dòng "giật mình" của sổ tay là cùng một clip) |
| vẫy (10) | `wave` r6.js:416 | ngắn | một lần | **ĐÃ CÓ** |
| ngã (8) | `tumble` r6.js:535 / `faint` r6.js:467 / `fall` r6.js:410 | ngắn | một lần | **ĐÃ CÓ** |
| leo (6) | `climb` engine/anim-them.js:34 (+ `rbx_climb`) | vừa | một lần | **ĐÃ CÓ** (sổ tay ghi "thiếu" là lỗi thời) |
| nhảy (5) | `jump` r6.js:400 | ngắn | một lần | **ĐÃ CÓ** |
| chạy (5) | `run` r6.js:388 | ngắn | một lần | **ĐÃ CÓ** |
| ngồi (5) | `sit` r6.js:428 | dài | một lần | **ĐÃ CÓ** |
| ôm (4) | `hug` r6.js:510 | vừa | một lần | **ĐÃ CÓ** |
| ngồi viết (2) | `write` r6.js:525 | dài | một lần | **ĐÃ CÓ** |
| đứng dậy (1) | `nch_getUp` engine/anim-nch.js:264 (+ `sitUp` anim-them.js:21) | ngắn | một lần | **ĐÃ CÓ** (sổ tay ghi "thiếu" là lỗi thời) |
| bám (1) | không có (gần nhất `climb` giữ pose, `hold` r6.js:496) | ngắn | một lần | **THIẾU** — cần code, bật/tắt được, mặc định tắt; tư thế treo/bám là chân co + hai tay nắm, vẽ được trên R6 |

Tổng 14 dòng của sổ tay (13 clip khác nhau vì "giật mình" xuất hiện hai dòng): **ĐÃ CÓ 13 dòng (12 clip khác nhau), THIẾU 1 (bám)**. Tên có sẵn khác hữu ích: `cower`, `shiver`, `panic`, `lookUp`, `lookAround`, `peek`, `sleepy`, `vanish`; động tác chồng lớp (`do:`) `tremble`, `cry`, `think`, `facepalm`, `shrug`, `nod`, `headshake` (engine/blocky/poses.js:48–54; danh sách ở docs/danh-muc.md).

## Tần suất, độ dài, nhanh/chậm, lặp/một lần
- Tần suất thấy: đứng thở 32 ≫ đi 13 > giật mình 17 > vẫy 10 > ngã 8 > nhảy 5 = chạy 5 = ngồi 5 > ôm 4 (sổ tay mục 13, 9 mẫu) → **idle là clip chủ lực**, đầu tư idle sống động (moving hold) hơn là clip lạ.
- Nhanh: giật mình, vẫy, ngã, nhảy, chạy, đứng dậy, bám (ngắn). Chậm: đứng thở, đi, leo, ôm (vừa), ngồi, ngồi viết (dài) (sổ tay mục 13, 9 mẫu).
- Quy tắc timing chung của r6-anim gốc vẫn dùng (phản ứng giật mình vào pose trong 1–3 khung, lắng 8–14 khung; không đứng yên quá 6/10 khung).

## Độ trễ phản ứng sau câu then chốt, nhịp đứng khựng (freeze beat)
- Sổ tay **chưa đo riêng** độ trễ phản ứng và freeze beat (kiểm bỏ sót K17: chưa đo).
- Đại diện gián tiếp: shot dài sau câu hỏi trung vị **1.86 s** (0.77–9.27) (sổ tay mục 3, 37 video / 9 mẫu) → dùng 1.8–2.0 s làm điểm bắt đầu cho nhịp "nghe xong rồi mới phản ứng"; 87% câu có cú cắt trong ±0.3 s ở cuối câu (sổ tay mục 3, 37 video / 9 mẫu) → khung phản ứng đặt ngay sau cuối câu, không trễ quá 0.3 s trừ khi muốn nhịp im lặng ở twist.
- Nhịp khựng = moving hold của r6-anim (sin biên độ nhỏ), không đóng băng hẳn.

## Đường cong cảm xúc theo phần
Hook = tò mò / bình thản · Leo thang = bực, sợ, hoảng · Twist = buồn, đau, im lặng · Giải quyết = dịu, ấm, nhẹ nhõm (sổ tay mục 13, 9 mẫu).
Gợi ý ghép với engine: hook `neutral`/`smile` + `idle`/`lookAround`; leo thang `angry` → `scared` → `panic` + `scared`/`run`/`cower`; twist `sad`/`moved` + `idle` chậm, im; giải quyết `smile`/`happy`/`moved` + `hug`/`wave`/`cheer`.

## Cảnh báo công việc còn thiếu
- 4 mặt THIẾU (tron, khó chịu, quyết tâm, gắng sức) + clip `bám`: cần code, bật/tắt được, mặc định tắt; hỏi người dùng trước (đặc biệt nghĩa nhãn "tron").
- `faceStyle: 'cartoon'` mới có worried/panic/cold/moved: nên kiểm xem nhân vật chính tập mới đang dùng kiểu nào (classic sẽ ra mặt cười) trước khi viết `mat:` có các tên này.
- Hiếm trong 9 mẫu: rung 1/9, mưa 1/9, cận mặt buồn/giận khi thoại 1/9 (sổ tay mục 9, 37 video / 9 mẫu).
