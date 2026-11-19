---
name: viet-kich-ban_RO
description: Bản thử phong cách học từ 37 video 'Ở thị trấn này' (sổ tay phong cách), chạy độc lập với viet-kich-ban — một câu luật → 5 mẫu (chọn mô típ theo bảng tần suất + tổ hợp chưa ai làm) → kịch bản đầy đủ theo khung 11 nhịp, lint bằng lint_RO.py. CHỈ chạy khi người dùng gọi đúng tên "viet-kich-ban_RO"; KHÔNG tự kích hoạt cho "luật: …", "viết kịch bản", "5 kịch bản mẫu" thông thường (các câu đó thuộc skill viet-kich-ban gốc).
---

# viet-kich-ban_RO — thử nghiệm: một câu luật → 5 mẫu → kịch bản đầy đủ, theo sổ tay phong cách

Bản thử độc lập. KHÔNG sửa `viet-kich-ban` gốc, `tools/kb/lint.py`. Nguồn số liệu: `docs/so-tay-phong-cach.md` (mục 1–15; **37 video** + **9 video mẫu** xem ảnh), bảng bỏ sót `output/hoc-phong-cach/kiem-bo-sot.md`, mô típ `output/hoc-phong-cach/h-mo-tip.json`. Học NHỊP và MÔ TÍP, **không chép cốt truyện/lời** của video nào. Mỗi con số có nguồn trong ngoặc: "(sổ tay mục N, 37 video)" hoặc "(9 mẫu)".

Chuẩn kênh: `CLAUDE.md`. Định dạng file + header: `docs/kich-ban-vao.md`. Ví dụ: `vi-du-kich-ban.md`. Khuôn bước 1: `mau-5-kich-ban.md`. Skill khác gọi theo tên _RO: `lam-phim_RO`, `phu-de_RO`, `vfx3d_RO`, `r6-anim_RO`; công cụ lint: `tools/kb/lint_RO.py`. (`xu-ly-kich-ban` chưa có bản _RO: giữ tên gốc.)

## Xung đột với thang gốc (dùng giá trị sổ tay cho _RO; nêu cho người dùng nếu lệch)
| Mục | Thang gốc `viet-kich-ban` | Sổ tay (dùng cho _RO) |
|---|---|---|
| Số shot | ~140 | **~96** (60–133), ~36 shot/phút, shot tb 1,68 s (sổ tay mục 1, 37 video) |
| Thời lượng | 150–165 s | **~158 s** (100–179) (mục 1, 37 video) — lint vẫn bắt buộc 120–180 s |
| Nhịp đọc | ~14 ký tự/giây, câu ≤ 35 ký tự | **~290 từ/phút** (260–315), câu tb **14 từ** (mục 2, 37 video). Đơn vị "từ" của sổ tay = tiếng (tách theo khoảng trắng) |
| Số câu lời kể | 60–80 | **~57 câu** (36–83) (mục 2, 37 video) |
| Luật nói ra | trong 3 s đầu | **≤ 5 s, ưu tiên câu 1** (mục 2: tb 3,0 s, 0–6,9 s, luôn ở câu 1; 37 video). Ghi đè con số "10–20 s" ở mục 15 của sổ tay |
| Twist | 55–80% (lint 40–85%) | **65–72%** (mục 14: agent đọc trung vị 68%, 52–93%, n=37; khung nhịp chuẩn 62–72%). Lint_RO thêm cảnh báo ngoài 65–72% |
| Nhân vật | R15 | **R6** (luật `CLAUDE.md` 2026-11-16) |
Số shot theo phần: hook ~10, leo thang ~39, twist ~25, giải quyết ~22 (mục 1, 37 video).

## Cấm (mọi bước)
- Không chép cốt truyện/lời của kênh khác; mọi ý tự nghĩ. Câu cửa miệng chỉ mượn **đoạn ngắn** (xem "Giọng kể"), không chép câu dài.
- KHÔNG mở file `.srt`. Số liệu nhịp đọc từ sổ tay trên và `docs/nhip-kich-ban.json`.
- Không dùng logo/tên/asset Roblox cho tên nhân vật/thương hiệu (asset để dựng thì theo `CLAUDE.md`).

## Hai dây chuyền sau Bước 1 (hỏi người dùng nếu chưa rõ)
- **Codex/kit (mặc định cho tập mới):** sau khi chọn mẫu N chỉ viết **kịch bản chữ** `kich-ban/<ep>/kich-ban.md` (luật, điểm yếu, twist, lời giải, nhân vật, bối cảnh, lời kể theo khung 11 nhịp, chưa chia shot) rồi chuyển `xu-ly-kich-ban`. KHÔNG làm Bước 2–3.
- **Engine cũ (`storyboard.py` / `lam-phim_RO`):** làm Bước 2–3 (bảng 19 cột ở `episodes/<ep>/kich-ban.md`).

## Bước 1 — 5 kịch bản mẫu (CHƯA tạo file, CHƯA dựng gì)
1. Luật giống **cơ chế game** (thanh máu, %, số, đếm ngược…), nói được trong **1 câu**. Được thêm 2 chi tiết ("tụt/đổi do gì", "về 0 thì sao"), báo người dùng bản rút gọn. Luật mơ hồ → đề xuất 1 bản chỉnh nêu rõ ở đầu câu trả lời, vẫn ra 5 mẫu.
2. Luật GIỮ NGUYÊN giữa 5 mẫu; khác nhau ở điểm yếu / twist / kết / quan hệ.
3. Đúng **5 mẫu** theo `mau-5-kich-ban.md`, mỗi mẫu ≤ 8 dòng **tính cả dòng tiêu đề** (dòng cuối mỗi mẫu là dòng "Mô típ").
4. **Xếp luật vào 1 trong 12 kiểu** (tần suất trên 37 video, sổ tay mục 14): cấm điều 3 · hiện tượng chu kỳ 3 · quái săn mồi 3 · biến đổi thân thể 2 · tan biến mất dần 2 · giới hạn tài nguyên 2 · cảm xúc thành vật lý 2 · cảm xúc đổi tiền tệ 2 · vật phẩm kỳ lạ 2 · quái bắt chước 2 · nhân quả phản hồi 2 · năng lực bẩm sinh 2 (cũng gặp: nghi thức tập thể, mất trí nhớ, thần chú kích hoạt). Nêu kiểu đã chọn ở đầu câu trả lời.
5. **5 kiểu twist KHÁC NHAU** chọn trong 12 kiểu (mục 14, 37 video; tần suất): kẽ hở luật 6 · bí mật người lớn 6 · điểm yếu thành lời giải 5 · đảo ngược luật 4 · nguồn gốc luật 3 · đổi vai quỷ vật 2 · người thân là mắt xích 2 · người thân bị thay thế 1 · người kể là quái 1 · hy sinh tinh thần 1 · người kể bị lệch nhận thức 1 · vòng thời gian 1. Twist là bí mật/kẽ hở/nguyên nhân nằm SẴN trong luật, không phải sự kiện ngoài ập tới (quái, bão, cúp điện). Định nghĩa 5 kiểu gốc giữ nguyên: bí mật người lớn (người lớn biết rõ và giấu), kẽ hở luật (câu chữ cho phép điều không ai nghĩ), nguyên nhân ẩn ≈ nguồn gốc luật, điểm yếu thành lời giải (chính twist là phát hiện điểm yếu thật ra là năng lực), đảo vai ≈ đổi vai/đảo ngược luật.
6. **7 kiểu kết** (mục 14, 37 video): ấm áp hoà giải 14 · hài lật ngược 8 · đắng chát xót 7 · chiến thắng 4 · kinh dị mở 2 · kết treo 1 · mỉa mai 1. Chỉ dùng 4 kiểu đầu cho 5 mẫu (kinh dị mở/kết treo/mỉa mai chỉ khi người dùng muốn). Kết luôn **ấm hoặc hài lật ngược** là chính; **KHÔNG kêu gọi đăng ký/theo dõi/like** (0/37 video có CTA, mục 2).
7. **Quan hệ** (mục 14, 37 video): bạn bè 13 · mẹ-con 11 · cả thị trấn 6 · ông-cháu 5 · anh em 3 · bố-con 3 · hàng xóm 3. Đa dạng hoá: trong 5 mẫu có ≥ 3 quan hệ khác nhau, ít nhất 1 mẫu không phải mẹ-con.
8. **Tổ hợp twist × kết** (mục 14, 37 video). Đã quen, tránh lặp cả 5 mẫu: bí mật người lớn × đắng chát xót 3 · bí mật người lớn × ấm áp hoà giải 3 · điểm yếu thành lời giải × chiến thắng 3 · kẽ hở luật × ấm áp hoà giải 3 · đổi vai quỷ vật × hài lật ngược 2 · nguồn gốc luật × hài lật ngược 2. **8 tổ hợp chưa ai làm** (mục 14, 37 video; khó gợi ý — chọn ≥ 1–2 trong 5 mẫu nếu khớp luật, vẫn phải khả thi, báo "chưa ai làm" trong dòng Mô típ):
   - thần chú kích hoạt × đảo ngược luật × chiến thắng (hết giờ luật quay lại kẻ ác)
   - cảm xúc thành vật lý × nguồn gốc luật × ấm áp hoà giải (hiện tượng do một lời hứa cũ)
   - mất trí nhớ × bí mật người lớn × ấm áp hoà giải (bà giấu thư cho cháu)
   - vật phẩm kỳ lạ × người kể là quái × kinh dị mở
   - nghi thức tập thể × kẽ hở luật × chiến thắng (cả thị trấn cùng lách luật)
   - năng lực bẩm sinh × bí mật người lớn × đắng chát xót (sức mạnh do người lớn hy sinh)
   - giới hạn tài nguyên × người thân là mắt xích × ấm áp hoà giải (bố mẹ tiêu hết cho con)
   - nhân quả phản hồi × người kể là quái × kinh dị mở
9. Mọi mẫu: nhân vật chính có điểm yếu do luật gây ra; kết = điểm yếu thành lời giải; cảnh cuối gợi lại cảnh đầu; hook có luật ≤ 5 s.
10. **DỪNG**, hỏi đúng 1 câu chọn số. Không tạo file, không chạy tool.

## Khung 11 nhịp chuẩn (dàn ý Bước 2; sổ tay mục 14, 37 video, agent đọc)
| # | Nhịp | Mốc % |
|---|---|---|
| 1 | Hook: nêu luật 1 câu kèm cơ chế game, câu đầu "Ở thị trấn này…" | 0–5 |
| 2 | Cái giá của luật + đời thường bị chi phối | 3–10 |
| 3 | Giới thiệu điểm yếu của nhân vật; nêu quan hệ chính (mẹ/ông/bạn) | 10–25 |
| 4 | Thử nghiệm đầu: kẽ hở / cố gắng đầu, thất bại nhẹ | 25–35 |
| 5 | Leo thang: việc lớn hơn, đồng hồ/đếm ngược, người lớn giấu | 35–50 |
| 6 | Đáy: khủng hoảng, thường có cảnh khóc/mất mát | 50–60 |
| 7 | **Manh mối**: nhận ra bí mật/kẽ hở (dọn đường cho twist) | **58–66** |
| 8 | **TWIST** (điểm rơi trung vị ~66–68%) | **65–72** (khung gốc 62–72) |
| 9 | Hành động giải quyết dùng điểm yếu | 70–85 |
| 10 | **Cao trào cảm xúc**: người lớn hy sinh/tỏ lòng; nhạc dâng, ôm | **80–90** |
| 11 | Kết: trật tự mới, cái giá còn lại; câu cuối lặp lại luật hoặc lật nghĩa; ấm hoặc hài | 90–100 |
Đáy ở 50–60% có thể chồng manh mối ở 58–66%: đáy xảy ra trước, manh mối ngay sau. Khoảng cài bí mật → twist ~**77 s** (56–102 s) (mục 2, 37 video, từ khoá yếu): cài manh mối ≥ 2 lần ở leo thang, ít nhất 1 lần ≥ 55 s trước twist.
Cảm xúc theo phần (9 mẫu, mục 13): hook tò mò/bình thản · leo thang bực–sợ–hoảng · twist buồn–đau–im lặng · giải quyết dịu–ấm–nhẹ nhõm. Ghi cảm xúc chủ đạo của mỗi nhịp vào kịch bản để `r6-anim_RO` đọc.

## Chuẩn nhịp lời (sổ tay mục 2 và 14, 37 video)
- Lời kể ~**290 từ/phút** (260–315; tb 293,7, min–max 263,7–314,1); theo phần (từ/phút): hook ~342 · leo thang ~297 · twist ~301 · giải quyết ~262 (mục 2, 37 video).
- Độ dài câu tb **14 từ** (9,7–18,5); hook ~**18 từ**; leo thang 14,2; twist 13,2; giải quyết 14,4 (mục 2, 37 video).
- **Luật nói ra trong ≤ 5 giây đầu**, ưu tiên câu 1 (xem bảng xung đột). Hook luật ngắn gọn có ví dụ "<1 s": "Chín mạng…", "Máy bán hàng…", "Ngủ dưới gầm giường…" (mục 2, 37 video; chỉ học độ gọn, không chép).
- **Móc giữ chân** — câu có "nhưng" / "cho đến khi" / một câu hỏi — cứ **~25 giây** một lần (tb 26,1 s, 8,7–135,6; mục 2, 37 video). Trong ~158 s ≈ 6 móc; không để khoảng trống > 45 s.
- Từ nối hay dùng (số lần trên 37 video, mục 2): và 364 · rồi 261 · thì 122 · nhưng 122 · vì 59 · nên 57 · thế là 24 · lúc đó 12 · cho đến khi 11 · sau đó 11. Ưu tiên "và / rồi / nhưng / thế là / cho đến khi"; bớt các từ nối văn viết.
- **Twist ở 65–72% thời lượng** (mục 14, 37 video). Đánh dấu `twist` ở cột ghi chú của shot đầu câu twist. Tín hiệu lời: "hóa ra / thật ra / thực ra / bí mật / không phải … mà / chỉ là / năm rồi", hoặc câu đổi giọng ("nhưng", "thế rồi") trong 50–75% (mục 14: kiểm tay); không dùng từ cảm xúc/cảm ơn làm tín hiệu twist.
- **KHÔNG CTA** trong lời kể (0/37, mục 2); **kết ấm hoặc hài lật ngược** (mục 14: 14 + 8 trên 37). Câu chốt: lặp lại luật hoặc lật nghĩa; vài video chốt cực ngắn (kiểu "Yeah.", "Mẹ ơi.", mục 2) — chỉ dùng hiếm.

## Giọng kể (mục 2, 37 video)
- **Ngôi thứ nhất** ~**0,51 lần/câu** (0,05–0,86): đa số câu có "tôi/mình".
- **Xưng hô** (tổng lần xuất hiện): tôi 883 · mẹ 305 · ông 294 · con 190 · cậu 173 · bạn 124 · mình 112 · ba 112 · chúng tôi 71 · bố 59. Quy ước: người kể "tôi"; gọi cha mẹ "mẹ" nhiều hơn "ba/bố"; "ông" cho người lớn tuổi; "con" khi nhân vật nói với người lớn; "cậu/bạn" cho bạn bè; "chúng tôi" cho thị trấn.
- **15 cụm cửa miệng** của loạt (≥ 4 video): "ở thế giới này" · "ở thị trấn này" · "và lần đầu tiên" · "tất cả mọi người" · "nhìn chằm chằm vào" · "thế giới này ai" · "lần đầu tiên trong" · "tôi chưa bao giờ" · "đi bộ về nhà" · "bất cứ thứ gì" · "thị trấn của chúng tôi" · "trấn của chúng tôi" · "có chuyện gì xảy ra" · "chuyện gì xảy" · "là người đàn ông". Dùng như **mảnh ngắn để mượn nhịp** (mỗi cụm ≤ 1–2 lần/tập; "Ở thị trấn này" mở phim); KHÔNG ghép thành câu dài giống video nào.

## Ngân sách mỗi tập (mục 12, 9 mẫu)
- **~9 bối cảnh** (6–12; trong/ngoài tb ~3/6), mỗi bối cảnh **quay lại 3–7 lần**.
- **6–9 nhân vật** khác nhau; nhân vật chính xuất hiện 34–80 shot; mỗi nhân vật chính có bộ nhận diện (áo màu + quần). Lưu ý `lam-phim_RO`: giữ dấu hiệu nhận ra nhân vật.
- Đạo cụ/asset 16–45 loại mỗi tập (ước lượng, 9 mẫu; nhóm lớn nhất: đồ vật 7/9, nhà 1/9). Bối cảnh lặp phổ biến: phố/thị trấn, nhà/phòng, nước/biển (4–5/9).
- Ghi vào header kịch bản: số bối cảnh, danh sách nhân vật; vượt ngân sách thì nêu lý do.

## Vẽ luật bằng vật có chữ (mục 8, 9 mẫu)
- Khoảng **21%** shot (177/846) vẽ luật/con số/biểu tượng trên màn hình hoặc trên vật có chữ. Mục tiêu ~**20% số shot** của tập hiện luật bằng vật thể có chữ trong cảnh: nhẫn khắc số, thẻ ghi năm, chữ trên vành nón/giấy ("NHÌN LÊN"), biển (kiểu "NGÂN HÀNG"), mặt đồng hồ. Loại shot `insertRead` + cột `vật cần đọc`. Tận dụng bfx sign/stamp/icon sẵn có (`docs/danh-muc.md`).
- Chữ nổi/phụ đề: phần `phu-de_RO` lo (cụm 1–3 chữ, từ khoá luật tô đỏ).

## Chữ ký riêng — cố ý làm khác (sổ tay mục 15)
- **D2 — bố cục 3 lớp** (tiền – trung – hậu cảnh) với **tiền cảnh mờ có chủ ý**: khung mẫu chỉ 2 lớp 69%, 3 lớp 22%, 1 lớp 9% (mục 11, 9 mẫu, 214 khung). Ghi lớp tiền cảnh mờ vào cột `máy quay`/ghi chú các shot quan trọng; không che mặt nhân vật.
- **D3 — biểu tượng luật** (thanh, bộ đếm, số…) **cố định một vị trí trên khung suốt cả tập** để người xem "đọc" được luật (mục 15, đề xuất đã duyệt). Ghi vị trí vào header `rule_icon: <vị trí>` (thêm dòng ghi chú trong `kich-ban.md`; nếu header không nhận khoá lạ thì ghi trong mục `rule`).
- (Không áp: D1 hậu kỳ sơn/vẽ tay — HOÃN.)

## Bước 2 — kịch bản đầy đủ (sau khi người dùng chọn số N, có thể kèm chỉnh)
1. Chọn `epNNN` kế tiếp: liệt kê `episodes/`, bỏ mọi thư mục bắt đầu bằng `_`, lấy số lớn nhất + 1; `<ep>` chưa tồn tại. Tạo `episodes/<ep>/kich-ban.md`.
2. Giá trị hợp lệ: `python tools/kb/kichban.py --danh-sach`. Không đoán; cần tên ngoài danh sách → `## Cần dựng` (`- anim: …`).
3. Header (`docs/kich-ban-vao.md`): `title`, `seed`, `rule`, `weakness`, `twist`, `solution`, `ep: <ep>`, `luat_goc`. Diễn viên mặc định `hero`, `mom` (+ `crowd: n`); vai khác khai `actor <tên>: k=v …`. `ở đâu` là địa điểm có sẵn (`square, home, yard, shop, street, crossroad, park, center, house1…`, kiểm `engine/town.js`) hoặc `place <tên>: x, z`. Cột `env` nhận env có sẵn (`ls engine/envs/*.js`) hoặc env mới ghi vào `## Cần dựng`. Bảng 19 cột đúng thứ tự như `vi-du-kich-ban.md`, cột `khung` trống.
   - `tư thế`: CHỈ cho mô hình không phải người; `tối thiểu`: ghi đè mức của loại shot.
4. Cột `máy quay`, `tiếng động` là văn bản ngắn (đẩy vào, kéo ra, lia, xoay quanh, rung…; `tên tiếng Anh@giây*âm lượng`).
5. **Quy mô _RO**: **~57 câu** lời kể (36–83), mỗi câu **1–3 shot** (~2 shot/câu, 1,96; mục 3; hàng nối ghi `^`), tổng **~96 shot** (60–133), tổng **~158 s** (100–179; lint bắt buộc 120–180; đừng đặt `kiem_tong: off`). **Xung đột**: thang gốc ~140 shot / 150–165 s / 60–80 câu → dùng số sổ tay; nếu người dùng muốn bản dài hơn thì nêu độ lệch.
6. **Độ dài câu**: tb **14 từ**, hook **~18 từ**; tổng lời **~290 từ/phút** (260–315). Đếm bằng lệnh/lint, không đếm tay. Quy ước "14 ký tự/giây" của bản gốc KHÔNG dùng.
7. **Nhịp**: 
   - Phân bổ theo 4 phần (mục 1, 37 video): hook ~10 shot, leo thang ~39, twist ~25, giải quyết ~22; shot giải quyết dài hơn (1,89 s so với ~1,65 s) (mục 1).
   - Câu twist đầu tiên ở **65–72%** (lint_RO cảnh báo ngoài khoảng này; K11 vẫn chỉ chặn ngoài 40–85%).
   - Luật nói ra trong **≤ 5 s đầu**, câu 1 bắt đầu "Ở thị trấn này" (lint K07); ~18 từ cho câu hook.
   - Móc giữ chân ~25 s/lần (xem trên).
   - Phần giải quyết ~25% phim: điểm yếu thành lời giải, cao trào cảm xúc 80–90%, cảnh cuối gợi lại cảnh đầu.
   - Cú cắt hình khớp lời: ~87% câu có cú cắt trong ±0,3 s cuối câu; cú cắt rơi cuối câu 53% / đầu câu 51% / giữa câu 47% (mục 3, 37 video) → không chỉ cắt ở cuối câu. Sau câu hỏi cho 1 shot dài hơn (~1,86 s, 0,77–9,27; mục 3). Chi tiết hình để `lam-phim_RO`.
8. **Giây** của shot = max(tối thiểu theo loại, số từ của câu / 4,83 / số shot của câu) (4,83 từ/giây = 290 từ/phút). Tối thiểu: insertRead **1,5**; closeup **0,8**; chase/fall/hug/walkBy/follow/sinkTilt **1,0**; establish **1,2**; còn lại 0,8. Giữ tối thiểu theo loại nên tổng ~158 s mà không đủ ép nhanh thì rút câu, đừng kéo giây.
9. Camera theo `CLAUDE.md` (luật dồn dập): 1 người → đẩy vào; ≥ 2 người/vật lớn → kéo ra; nhà có chân → thấy 4 chân. Mẫu 9 video có 43% đứng yên, ta cố ý khác (`CLAUDE.md` thắng; mục 15 C1 BỎ). Chữ trên thiếp/biển: `insertRead` + `vật cần đọc`.
10. Điền `## Cần dựng`: mọi env/prop/anim chưa có, mỗi dòng một thứ.

## Bước 3 — tự kiểm, lint, giao (MỐC DUYỆT 1b)
1. Tự kiểm nội dung: (a) luật hiện hình + nói ra ≤ 5 s; (b) điểm yếu có ở hook; (c) manh mối twist cài ≥ 2 lần ở leo thang; (d) lời giải dùng đúng điểm yếu; (e) cảnh cuối gợi lại cảnh đầu; (f) không CTA; kết ấm/hài; (g) có biểu tượng luật cố định D3 và tiền cảnh mờ D2 ở shot chủ chốt.
2. `python tools/kb/lint_RO.py episodes/<ep>/kich-ban.md` → sửa lỗi (Kxx) tới **0 lỗi**; đọc cảnh báo W (W13 luật ≤ 5 s, W14 twist 65–72%, W15 khoảng cách móc, W16 từ/phút, W17 CTA, W18 độ dài câu). Kẹt cùng một lỗi sau 3 lần → dừng, báo người dùng. Lời kể rời: `python tools/kb/lint_RO.py --loi-ke narration.txt`.
3. `python tools/kb/kichban.py episodes/<ep>/kich-ban.md --tom-tat` (không đếm tay).
4. Trả lời: đường dẫn + bảng tóm tắt (số câu, shot, tổng giây, mục cần dựng, % twist, số câu mỗi phần, từ/phút, giây nói ra luật). Hỏi duyệt rồi DỪNG; chưa chạy `storyboard.py`, chưa dựng.

## Biến thể format
Trước khi viết 5 mẫu, xem `docs/format-kich-ban.md` (4 biến thể: luật chuẩn, theo giờ, hai nhà đối chiếu, lời thú nhận). Bảng 12 kiểu luật ở trên là phân loại **bổ sung**, không thay 4 biến thể.

## Việc chưa áp được ở skill này (để skill khác, ghi lại)
Nhịp hình/camera (H*, B2–B5), mặt/clip (E*), VFX (V*), phụ đề (T*) thuộc `lam-phim_RO`, `r6-anim_RO`, `vfx3d_RO`, `phu-de_RO`; skill này chỉ đưa vào kịch bản các điểm có thể quyết ở khâu viết (cảm xúc theo nhịp, vật có chữ vẽ luật, ngân sách, D2/D3).
