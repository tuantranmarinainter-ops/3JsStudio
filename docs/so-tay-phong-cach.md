# Sổ tay phong cách (A–I, 37 video + 9 video mẫu)

Sinh bởi `tools/hoc_phong_cach.py so-tay` · dữ liệu `output/hoc-phong-cach/` · **37 video**. Ô số = trung bình (nhỏ nhất–lớn nhất).
Số liệu máy là **heuristic**: luật/twist/móc tìm theo từ khoá; zoom/pan đo bằng optical flow toàn khung (nhân vật chuyển động có thể nhiễu).
Phần nhìn ảnh (mục 7–15) lấy từ 9 video mẫu, nhãn ước lượng bằng mắt.

## 1. Nhịp cắt (B máy)

| Chỉ số | Trung bình (min–max) |
|---|---|
| Thời lượng video (s) | 158.2 (100.4–179.3) |
| Số shot | 96.0 (60–133) |
| Shot/phút | 36.4 (27.6–47.1) |
| Độ dài shot trung bình (s) | 1.68 (1.27–2.18) |
| Độ dài shot trung vị (s) | 1.53 (1.2–2.0) |

**Theo phần** (tb qua 37 video):

| Phần | Shot | Dài shot (s) | Sáng 0–255 | Bão hoà | Ấm (R−B) | Zoom-in | Zoom-out | Pan | Đứng |
|---|---|---|---|---|---|---|---|---|---|
| Hook | 10.0 (2–15) | 1.71 (1.05–6.13) | 111.6 (59.7–143.2) | 101.4 (57.3–141.9) | 0.027 (-0.119–0.184) | 37.0 (0–73.0)% | 15.0 (0–38.0)% | 14.0 (0–44.0)% | 34.0 (0–91.0)% |
| Leo thang | 39.0 (27–52) | 1.63 (1.25–2.2) | 110.7 (52.2–162.0) | 110.7 (56.2–146.9) | 0.065 (-0.115–0.247) | 37.0 (5.0–72.0)% | 8.0 (0–26.0)% | 11.0 (0–31.0)% | 43.0 (11.0–83.0)% |
| Twist | 25.0 (13–36) | 1.67 (1.15–2.31) | 105.0 (44.1–166.0) | 112.4 (33.6–167.0) | 0.044 (-0.277–0.228) | 38.0 (5.0–92.0)% | 8.0 (0–26.0)% | 9.0 (0–31.0)% | 45.0 (8.0–90.0)% |
| Giải quyết | 22.0 (12–37) | 1.89 (1.15–3.18) | 104.6 (35.8–173.0) | 111.0 (30.7–145.9) | 0.058 (-0.24–0.29) | 34.0 (0–80.0)% | 9.0 (0–23.0)% | 10.0 (0–29.0)% | 46.0 (10.0–95.0)% |

Cả video: zoom-in 37.0 (7.0–79.0)% · zoom-out 9.0 (2.0–19.0)% · pan 11.0 (0–28.0)% · đứng 43.0 (12.0–78.0)% (tỉ lệ shot).

## 2. Kịch bản (A, từ .srt)

| Chỉ số | Trung bình (min–max) |
|---|---|
| Từ/phút | 293.7 (263.7–314.1) |
| Số câu | 57.0 (36–83) |
| Độ dài câu (từ) | 14.0 (9.7–18.5) |
| Giây nói ra luật | 3.0 (0.0–6.9) |
| Luật nằm ở câu số | 1 (1–1) |
| Twist (từ khoá, chỉ ~11/37 video bắt được — xem mục 14) ở % video | 72.0 (54.0–96.0) |
| Khoảng gài bí mật → twist (s) | 77.0 (56.0–102.0) |
| Móc giữ chân cách nhau (s) | 26.1 (8.7–135.6) |
| Ngôi thứ nhất / câu | 0.51 (0.05–0.86) |
| Câu chốt có CTA | 0/37 video |

**Nhịp lời theo phần** (từ/phút):

| Phần | Từ/phút | Độ dài câu |
|---|---|---|
| Hook | 342.1 (288.0–421.0) | 17.8 (10.4–29.3) |
| Leo thang | 297.1 (269.9–326.1) | 14.2 (8.6–22.1) |
| Twist | 301.2 (262.3–391.8) | 13.2 (8.7–20.1) |
| Giải quyết | 261.6 (136.6–288.6) | 14.4 (8.2–22.9) |

**Xưng hô (tổng lần xuất hiện):** tôi 883, mẹ 305, ông 294, con 190, cậu 173, bạn 124, mình 112, ba 112, chúng tôi 71, bố 59

**Từ nối hay dùng:** và 364, rồi 261, thì 122, nhưng 122, vì 59, nên 57, thế là 24, lúc đó 12, cho đến khi 11, sau đó 11

**Cụm 4 từ lặp ở ≥ 4 video (câu cửa miệng của loạt):**

- "ở thế giới này" — 15 video, 15 lần
- "ở thị trấn này" — 14 video, 15 lần
- "và lần đầu tiên" — 7 video, 7 lần
- "tất cả mọi người" — 6 video, 9 lần
- "nhìn chằm chằm vào" — 6 video, 8 lần
- "thế giới này ai" — 6 video, 6 lần
- "lần đầu tiên trong" — 5 video, 5 lần
- "tôi chưa bao giờ" — 5 video, 5 lần
- "đi bộ về nhà" — 4 video, 5 lần
- "bất cứ thứ gì" — 4 video, 4 lần
- "thị trấn của chúng" — 4 video, 4 lần
- "trấn của chúng tôi" — 4 video, 4 lần
- "có chuyện gì xảy" — 4 video, 4 lần
- "chuyện gì xảy ra" — 4 video, 4 lần
- "là người đàn ông" — 4 video, 4 lần

### Hook + luật từng video

| # | Video | Luật @s | Câu mở (rút gọn) | Câu chốt |
|---|---|---|---|---|
| 1 | Anh em sinh đôi | 2.1 | Ở thị trấn này, việc có anh em trai là điều bị cấm. Trận đại… | Ông ta hỏi: "Đứa nào trong hai đứa bây là Ro?" Chúng… |
| 2 | Biến thành nỗi sợ | 2.44 | Ở thế giới này, bạn sẽ biến thành bất cứ thứ gì mình sợ. Nỗi… | Mẹ kêu chít chít dù có là gấu hay không.… |
| 3 | Cả thế giới xếp chung một hàng | 4.39 | Ở thế giới này, mọi người đều phải chờ trong một hàng khổng lồ duy… | Vì vậy, chúng tôi cứ để ông ấy ngủ.… |
| 4 | Cái hố trên bầu trời | 4.95 | Ở thế giới này, cứ 10 năm, bầu trời lại mở ra một cái hố… | Không sao cả, tôi đã viết địa chỉ nhà vào bên trong… |
| 5 | Cần được gọi tên | 3.3 | Ở thị trấn này, nếu không ai gọi tên bạn suốt một năm, thì bạn… | Tôi định gọi tên ông ấy nhưng lại không thể nhớ ra… |
| 6 | Chín mạng sống | 0.12 | Ở thế giới này ai sinh ra cũng có chín mạng sống giống hệt như… | Tôi vẫn còn lại tám mạng sống.… |
| 7 | Dấu chéo trên cửa | 6.91 | Ở thế giới này, cứ mỗi thứ bảy, gã đồ tể lại sơn một dấu… | Nhưng lần này tôi không thể trở về nhà được nữa.… |
| 8 | Đôi chân nhớ nhà | 2.93 | Ở thị trấn này, hễ bạn nhớ nhà, là đôi chân sẽ tự dắt bạn… | Nhớ nhà chỉ dành cho con nít thôi, ông nói.… |
| 9 | Đổi tên mỗi năm | 6.55 | Ở thị trấn này, tất cả mọi người đều phải đổi tên vào ngày đầu… | Rồi tôi đóng sầm cửa lại.… |
| 10 | Đồng xu tiếng cười | 3.3 | Ở thế giới này, cứ mỗi lần chọc ai cười là bạn nhận được một… | Bố dán đồng xu mới ngay cạnh tấm ảnh rồi viết thêm,… |
| 11 | Gối thì thầm | 5.15 | Ở thế giới này, bất cứ điều gì bạn thì thầm vào chiếc gối của… | Còn mẹ thì nằm ngủ ngay sát bên cạnh ba.… |
| 12 | Hai lần chúc ngủ ngon | 0.1 | Ở thế giới này, đừng bao giờ khóa cửa phòng sau khi mẹ chúc bạn… | Nhưng ngay trước khi khuất bóng những hàng cây, thằng bé dừng… |
| 13 | Kẻ không phải người | 2.64 | Ở thị trấn này có một kẻ trong chúng tôi không phải là người. Đêm… | Ở thị trấn này có một kẻ trong chúng tôi không phải… |
| 14 | Kết quả tương xứng | 4.24 | Trong thế giới này, bất cứ điều gì bạn làm với ai đó đều sẽ… | Không phải để né luật nhân quả mà là để cảm nhận… |
| 15 | Lãnh địa | 2.02 | Ở thế giới này, ai cũng có một vùng lãnh địa riêng. Chỉ cần ra… | Ông ấy bảo thà bị đóng băng còn nhàn hơn.… |
| 16 | Máy bán hàng | 0.12 | Ở thị trấn này có một chiếc máy bán hàng tự động kỳ diệu chẳng… | Thứ đầu tiên chúng tôi trồng chính là bó hoa của Nguyệt.… |
| 17 | Mực tàng hình | 4.2 | Suốt 4 năm trời, đám con nhà giàu đã trả cho tôi 5 đô một… | Tôi dừng lại ngay trước mặt Phú rồi rút tờ 5 đô… |
| 18 | Năm phút nữa thôi | 4.11 | Ở thế giới này, khi bạn nói 5 phút nữa thôi thì cả thế giới… | Mẹ và tôi nhìn nhau, cả hai đồng thanh nói cùng lúc… |
| 19 | Ngôi nhà biết đi | 4.77 | Trong thế giới này, mỗi đêm có một ngôi nhà ngẫu nhiên trong thị trấn… | Giờ đây, đã có thêm hàng ngàn tấm bưu thiếp mới trên… |
| 20 | Ngủ dưới gầm giường | 0.12 | Ở thị trấn này, tất cả mọi người đều ngủ dưới gầm giường. Cứ đúng… | Yeah.… |
| 21 | Người biến mất dần | 0.12 | Ở thế giới này, hễ mọi người trong phòng đồng loạt ghét thứ gì đó… | Hóa ra đôi khi những điều ta từng ghét bỏ lại chính… |
| 22 | Nước mắt hoá vàng | 3.7 | Ở thị trấn này, mỗi khi bạn khóc 16 thì nước mắt sẽ hóa thành… | Ông là người duy nhất trong thị trấn hiểu âm thanh đó… |
| 23 | Quả bóng nằm sau hàng rào | 3.77 | Ở thị trấn này, bất cứ nào bay qua hàng rào nhà ông Gấu đều… | Sau đó ánh mắt ông dừng lại ở chỗ tôi và nói… |
| 24 | Sinh nhật hai nghìn lần | 0.1 | Tôi đã tròn 10 tuổi 2000 lần và điều đó đang giết dần mẹ tôi.… | Tôi đã 80 tuổi rồi và sáng nào con gái tôi cũng… |
| 25 | Tảng đá ban sức mạnh | 3.54 | Trong thế giới của tôi, vào ngày đầu tiên đi học, bạn sẽ nhận được… | Và giờ đây, mỗi khi trời mưa, Rex lại cùng tôi đi… |
| 26 | Tàu kéo tí hon | 2.64 | Ở thế giới này, ai cũng có thể biến thành một phương tiện giao thông.… | Còn ba tôi á, chiếc phao của ba đã trôi được nửa… |
| 27 | Tháp khối gỗ | 0.1 | Ở thế giới này, ai cũng sống trong một tòa tháp gỗ khổng lồ. Đêm… | Từ đó mỗi nửa đêm tôi giữ trần nhà cậu ấy, còn… |
| 28 | Thị trấn đào bới 60 năm tìm chìa khoá vàng | 2.81 | Ở thị trấn này có một tỷ phú đã giấu một chiếc chìa khóa vàng.… | Không ai khác còn nhớ, chỉ có mình tôi mà phải 50… |
| 29 | Thị trấn mỗi ngày chỉ được nói mười từ | 1.94 | Ở thị trấn này, bạn chỉ có 10 từ một ngày. Cứ mỗi sáng lúc… | Và cuối cùng, cậu Tâm cũng kể xong câu chuyện cười của… |
| 30 | Thị trấn quên sạch lúc nửa đêm | 6.48 | Ở thị trấn này, cứ đúng nửa đêm là ai cũng quên sạch mọi thứ,… | "Chào buổi sáng, ông không là ông của ai hết."… |
| 31 | Thích ai là bay lên | 0.04 | Trong thế giới này, cứ mỗi khi bạn phải lòng một ai đó thì trọng… | Yeah.… |
| 32 | Tiếng mẹ gọi | 3.47 | Ở trấn này không ai trả lời khi mẹ gọi, dù chỉ một lần, không… | "Về nhà thôi, Tùng."… |
| 33 | Tờ báo ngày mai | 3.11 | Ở thị trấn của tôi, tờ báo không đưa tin hôm qua mà đưa tin… | Tôi đã nhấn chìm cả thị trấn trong biển nước nhưng giờ… |
| 34 | Trở thành thứ mình nói | 3.67 | Ở thị trấn này, bất cứ lời ác ý nào bạn nói với người khác… | Tôi cúi người xuống, chúc một ngày tốt lành.… |
| 35 | Trồng cây | 3.5 | Ở thế giới của tôi, không khí ô nhiễm đến mức gần như không thể… | Và thật lòng mà nói thì điều đó còn đáng giá hơn… |
| 36 | Vật hộ mệnh | 0.1 | Ở thế giới này, ai sinh ra cũng có một vật hộ mệnh trên ngực… | Mẹ ơi.… |
| 37 | Vật ký sinh | 6.33 | Ở thế giới này, ai cũng sở hữu một vật ký sinh, nó sống bên… | Chúng có thể hấp thụ sức mạnh của tất cả các màu… |

## 3. Hình khớp lời (C máy)

| Chỉ số | Trung bình (min–max) |
|---|---|
| % câu có cú cắt ngay cuối câu (±0.3s) | 87.0 (64.0–98.0) |
| % cú cắt rơi cuối câu | 53.0 (35.0–73.0) |
| % cú cắt rơi đầu câu | 51.0 (32.0–73.0) |
| % cú cắt rơi giữa câu | 47.0 (27.0–65.0) |
| Số shot mỗi câu | 1.96 (1.51–2.47) |
| Shot dài sau câu hỏi (s) | 1.86 (0.77–9.27) |

Chưa đo máy được: "% câu có hình minh hoạ đúng lời", "shot phản ứng sau câu quan trọng" (cần xem ảnh — phần agent).

## 4. Lặp lại (E máy)

| Chỉ số | Trung bình (min–max) |
|---|---|
| % shot có bản "gần giống hệt" trong cùng video | 1.0 (0.0–10.0) |
| Số cặp chuỗi ≥2 shot lặp | 0.0 (0–1) |
| Shot giống hệt shot ở video khác (số cặp) | 0.0 (0–2) |

Top video lặp nhiều (tỉ lệ shot): Thị trấn quên sạch lúc nửa đêm 10%, Chín mạng sống 6%, Dấu chéo trên cửa 4%, Kết quả tương xứng 4%, Tàu kéo tí hon 4%, Hai lần chúc ngủ ngon 3%

*Top 20 thứ lặp (chuyển động máy, biểu cảm, bố cục…) cần agent xem ảnh — chưa làm.*

## 5. VFX máy dò (I máy, mỗi phút video)

| Hiệu ứng | /phút | Tổng | Video nhiều nhất |
|---|---|---|---|
| Chớp (độ sáng vọt) | 0.2 (0.0–1.6) | 20 | Tảng đá ban sức mạnh (1.6/ph) |
| Rung khung | 0.1 (0.0–1.1) | 9 | Ngôi nhà biết đi (1.1/ph) |
| Đổi màu cả khung | 0.7 (0.0–4.2) | 70 | Tảng đá ban sức mạnh (4.2/ph) |
| Zoom giật | 1.2 (0.0–4.3) | 120 | Thích ai là bay lên (4.3/ph) |

Sự kiện chi tiết (giây + shot): `output/hoc-phong-cach/<slug>/may.json` → `su-kien`. Agent gọi tên + đối chiếu engine: mục 10 (9 video mẫu).

## 6. Bảng từng video

| # | Video | s | Shot | Shot/ph | Dài tb | Từ/ph | Zoom-in% | Lặp% | Chớp | Rung | Đổi màu | Zoom giật |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Anh em sinh đôi | 146 | 95 | 39.0 | 1.54 | 292.3 | 38 | 0 | 0 | 0 | 0 | 0 |
| 2 | Biến thành nỗi sợ | 100 | 71 | 42.4 | 1.41 | 306.5 | 34 | 0 | 0 | 0 | 1 | 3 |
| 3 | Cả thế giới xếp chung một hàng | 173 | 131 | 45.5 | 1.32 | 279.6 | 35 | 0 | 2 | 0 | 1 | 1 |
| 4 | Cái hố trên bầu trời | 171 | 109 | 38.2 | 1.57 | 297.1 | 27 | 0 | 2 | 2 | 2 | 4 |
| 5 | Cần được gọi tên | 159 | 87 | 32.7 | 1.83 | 299.2 | 72 | 0 | 0 | 0 | 0 | 2 |
| 6 | Chín mạng sống | 166 | 87 | 31.4 | 1.91 | 302.8 | 7 | 6 | 0 | 0 | 2 | 2 |
| 7 | Dấu chéo trên cửa | 166 | 95 | 34.4 | 1.75 | 303.8 | 32 | 4 | 0 | 0 | 0 | 3 |
| 8 | Đôi chân nhớ nhà | 158 | 85 | 32.3 | 1.86 | 277.3 | 40 | 0 | 1 | 0 | 0 | 2 |
| 9 | Đổi tên mỗi năm | 143 | 89 | 37.3 | 1.61 | 296.5 | 54 | 2 | 1 | 0 | 1 | 2 |
| 10 | Đồng xu tiếng cười | 178 | 119 | 40.1 | 1.5 | 295.7 | 32 | 0 | 0 | 0 | 1 | 4 |
| 11 | Gối thì thầm | 167 | 99 | 35.5 | 1.69 | 304.3 | 38 | 0 | 2 | 0 | 5 | 5 |
| 12 | Hai lần chúc ngủ ngon | 126 | 73 | 34.7 | 1.73 | 304.2 | 19 | 3 | 2 | 0 | 2 | 7 |
| 13 | Kẻ không phải người | 177 | 116 | 39.4 | 1.52 | 278.2 | 69 | 0 | 0 | 0 | 0 | 1 |
| 14 | Kết quả tương xứng | 177 | 107 | 36.2 | 1.66 | 270.9 | 22 | 4 | 0 | 0 | 0 | 5 |
| 15 | Lãnh địa | 166 | 106 | 38.2 | 1.57 | 296.3 | 47 | 0 | 0 | 0 | 6 | 2 |
| 16 | Máy bán hàng | 175 | 112 | 38.4 | 1.56 | 303.9 | 40 | 0 | 2 | 3 | 7 | 3 |
| 17 | Mực tàng hình | 150 | 91 | 36.5 | 1.64 | 301.6 | 79 | 0 | 0 | 0 | 0 | 2 |
| 18 | Năm phút nữa thôi | 153 | 77 | 30.2 | 1.99 | 285.9 | 19 | 0 | 0 | 0 | 0 | 1 |
| 19 | Ngôi nhà biết đi | 171 | 133 | 46.6 | 1.29 | 285.7 | 44 | 0 | 2 | 3 | 2 | 4 |
| 20 | Ngủ dưới gầm giường | 141 | 86 | 36.5 | 1.64 | 301.8 | 38 | 0 | 0 | 0 | 2 | 4 |
| 21 | Người biến mất dần | 176 | 108 | 36.8 | 1.63 | 301.2 | 26 | 0 | 0 | 0 | 2 | 2 |
| 22 | Nước mắt hoá vàng | 170 | 100 | 35.3 | 1.7 | 291.4 | 26 | 0 | 1 | 0 | 2 | 6 |
| 23 | Quả bóng nằm sau hàng rào | 140 | 96 | 41.2 | 1.46 | 296.8 | 44 | 0 | 0 | 0 | 1 | 1 |
| 24 | Sinh nhật hai nghìn lần | 165 | 79 | 28.7 | 2.09 | 302.4 | 39 | 0 | 0 | 0 | 1 | 4 |
| 25 | Tảng đá ban sức mạnh | 116 | 60 | 31.1 | 1.93 | 285.1 | 35 | 0 | 3 | 1 | 8 | 3 |
| 26 | Tàu kéo tí hon | 179 | 92 | 30.8 | 1.95 | 281.4 | 10 | 4 | 0 | 0 | 2 | 2 |
| 27 | Tháp khối gỗ | 166 | 94 | 34.0 | 1.76 | 296.1 | 36 | 0 | 0 | 0 | 3 | 5 |
| 28 | Thị trấn đào bới 60 năm tìm chìa khoá vàng | 171 | 115 | 40.3 | 1.49 | 263.7 | 47 | 0 | 0 | 0 | 4 | 2 |
| 29 | Thị trấn mỗi ngày chỉ được nói mười từ | 160 | 78 | 29.2 | 2.05 | 279.5 | 36 | 0 | 0 | 0 | 5 | 8 |
| 30 | Thị trấn quên sạch lúc nửa đêm | 163 | 103 | 37.9 | 1.58 | 278.0 | 50 | 10 | 1 | 0 | 3 | 1 |
| 31 | Thích ai là bay lên | 154 | 101 | 39.4 | 1.52 | 304.8 | 33 | 0 | 0 | 0 | 1 | 11 |
| 32 | Tiếng mẹ gọi | 163 | 75 | 27.6 | 2.18 | 285.0 | 59 | 3 | 0 | 0 | 5 | 3 |
| 33 | Tờ báo ngày mai | 155 | 120 | 46.5 | 1.29 | 304.2 | 23 | 0 | 0 | 0 | 1 | 4 |
| 34 | Trở thành thứ mình nói | 142 | 83 | 35.2 | 1.71 | 305.0 | 41 | 0 | 1 | 0 | 0 | 6 |
| 35 | Trồng cây | 171 | 92 | 32.2 | 1.86 | 314.1 | 39 | 0 | 0 | 0 | 0 | 3 |
| 36 | Vật hộ mệnh | 166 | 79 | 28.5 | 2.11 | 293.4 | 13 | 0 | 0 | 0 | 0 | 2 |
| 37 | Vật ký sinh | 130 | 102 | 47.1 | 1.27 | 302.8 | 13 | 0 | 0 | 0 | 0 | 0 |
## 7. Bước 2 — video mẫu và cách xem

9 video mẫu, đọc đủ 846 shot qua dải 10 frame/shot; agent Haiku ghi `xem.json`. **Nhãn là ước lượng bằng mắt từ ảnh nhỏ (±1 ô lưới), không đo pixel.**

| Video | Lý do chọn |
|---|---|
| Cái hố trên bầu trời | VFX nhiều (42 sự kiện máy dò bản đầu) |
| Chín mạng sống | zoom-in thấp nhất (7%) |
| Kết quả tương xứng | sáng nhất (độ sáng 156) |
| Máy bán hàng | đã có dữ liệu map (112 shot) |
| Mực tàng hình | zoom-in cao nhất (79% shot) |
| Tảng đá ban sức mạnh | VFX nhiều nhất (chớp, mưa, đổi màu) + ngắn nhất |
| Thị trấn quên sạch lúc nửa đêm | shot lặp nhiều nhất (10%) |
| Tiếng mẹ gọi | cắt chậm nhất (27,6 shot/phút) + tối nhất |
| Vật ký sinh | cắt nhanh nhất (47 shot/phút) |

## 8. B (nhìn ảnh): cỡ cảnh, góc máy, chữ nổi, cách vẽ luật

- **Cỡ cảnh (số shot):** trung 58%, can 23%, rong 10%, toan 8%, dac-ta 1% (toàn+rộng = bối cảnh; trung = nửa người; cận = mặt).
- **Góc máy:** ngang 92%, cao 5%, tu-tren-xuong 2%, thap 1% — ngang tầm mắt là mặc định.
- **Chuyển động máy (agent):** dung 45%, zoom-in 35%, pan 12%, zoom-out 7%. ⚠ phần lớn nhãn này agent chép từ cột máy đo trong `shots-loi.txt` → KHÔNG độc lập, không dùng để hiệu chỉnh ngưỡng zoom.
- **Shot có vẽ luật/con số/biểu tượng trên màn hình:** 177/846 (21%).

**Phụ đề / chữ nổi (mỗi video):**

| Video | Phông | Màu | Viền | Vị trí | Kiểu |
|---|---|---|---|---|---|
| Cái hố trên bầu trời | sans đậm, bo tròn | trắng, từ nhấn đỏ | đen | dưới giữa khung | từng cụm |
| Chín mạng sống | sans đậm, chữ thường | trắng; chữ nhấn đỏ; chấm vàng là đếm mạng | đen đậm | dưới giữa, khoảng 70% chiều cao | từng cụm 2-4 từ |
| Kết quả tương xứng | sans-serif đậm, bo tròn | trắng; cụm nhấn đỏ | viền đen mỏng | dưới khung, khoảng 75–80% chiều cao | từng cụm |
| Máy bán hàng | chữ trắng đậm bo tròn | trắng, từ khoá đỏ | viền đen mỏng | giữa dưới khung | từng cụm |
| Mực tàng hình | sans đậm bo tròn | trắng; từ nhấn đỏ | đen mỏng | giữa-dưới khung | từng cụm |
| Tảng đá ban sức mạnh | sans đậm kiểu Roblox | trắng | đen | giữa-dưới | từng cụm |
| Thị trấn quên sạch lúc nửa đêm | sans-serif tròn, đậm (kiểu Be Vietnam Pro) | trắng | đen mờ | dưới giữa khung | từng cụm 1-3 chữ |
| Tiếng mẹ gọi | sans đậm bo tròn (kiểu Be Vietnam Pro / Patrick Hand cho bưu thiếp) | trắng, nhấn đỏ | viền đen đậm | giữa-dưới | từng cụm |
| Vật ký sinh | sans dam kieu Roblox, khong chan | trang, tu khoa nhan do | vien den day | giua-duoi khung, khoang 70% chieu cao | tung cum 2-4 chu, doi nhanh moi 0.3-0.5 giay |

**Ví dụ cách vẽ luật trên màn hình:** nhẫn cưới; thẻ chó ghi 1998; chữ viết trên vành nón; chữ NHÌN LÊN trên giấy; biển NGÂN HÀNG trên mái; biển NGÂN HÀNG; biển nhỏ dưới đất; mặt đồng hồ tháp

## 9. C/E/I phần nhìn ảnh

- **C:** số đo ở mục 3 (máy). Phần "hình minh hoạ đúng lời" không có số: agent ghi nhận cả 9 video mẫu cắt hình theo cụm lời, phụ đề 1–3 chữ chạy trong shot.

**Top 20 thứ lặp lại** (số video trong 9 mẫu có nhắc; agent ghi tay + gom từ khoá nên là xấp xỉ):

| # | Thứ lặp | Số video |
|---|---|---|
| 1 | zoom-in cận mặt | 8 |
| 2 | chữ/thư/sổ/biển | 7 |
| 3 | mẹ/ba/bà/ông nói chuyện | 6 |
| 4 | nước/biển/hồ | 5 |
| 5 | phố/đường/thị trấn làm nền | 4 |
| 6 | nhà/phòng/giường | 4 |
| 7 | vật/tay trao – giơ | 3 |
| 8 | xe/tàu/thuyền | 3 |
| 9 | con số/đếm/biểu tượng luật | 3 |
| 10 | cửa mở/đóng | 3 |
| 11 | đồng hồ / mốc giờ | 3 |
| 12 | đổi màu/tối sầm chuyển cảnh | 3 |
| 13 | ăn/đồ ăn/bánh | 3 |
| 14 | đám đông | 2 |
| 15 | chạy/rượt/rơi | 2 |
| 16 | rung máy/rung vật | 1 |
| 17 | mưa/bão | 1 |
| 18 | cận mặt buồn/giận khi thoại | 1 |

## 10. I: danh mục VFX (agent gọi tên, đối chiếu engine)

Số hiệu ứng ghi nhận: 72 — theo lớp: man-hinh 24, do-hoa 17, hat3d 15, anh-sang 11, chuyen-canh 5

| Hiệu ứng (video mẫu) | Lớp | Màu | Mạnh | Cảm xúc | 3D/2D | Giây | Tiếng kèm |
|---|---|---|---|---|---|---|---|
| Cái hố trên bầu trời: hố xoáy tím | do-hoa | tím đen | manh | bí ẩn | 3D | 1.2,2.5,23.9 | khong-ro |
| Cái hố trên bầu trời: vật rơi hàng loạt | hat3d | nhiều màu | manh | hỗn loạn | 3D | 3.9,4.8,5.5 | khong-ro |
| Cái hố trên bầu trời: hạt bay (diều, mũ) | hat3d | đỏ vàng xanh | vua | kỳ diệu | 3D | 62.4,65.8,66.9 | khong-ro |
| Cái hố trên bầu trời: rung màn hình | man-hinh | None | nhe | sốc | 2D-chen | 53.63,84.27,140.9 | co |
| Chín mạng sống: chữ đỏ nhấn | do-hoa | đỏ | vua | nhấn mạnh tư tưởng | 2D-chen | 2.0,31.9,44.0 | khong-ro |
| Chín mạng sống: chấm vàng đếm mạng | do-hoa | vàng | vua | căng thẳng, đếm ngược | 2D-chen | 7.8,30.1,63.2 | khong-ro |
| Chín mạng sống: mờ-đen chuyển cảnh | chuyen-canh | đen | manh | khoảng lặng, sốc | 2D-chen | 27.7,111.7,113.5 | khong-ro |
| Chín mạng sống: đổi màu xanh dưới nước | anh-sang | xanh dương | vua | lạnh, nguy hiểm | 2D-chen | 83.0,101.4,111.7 | khong-ro |
| Kết quả tương xứng: chớp trắng khi đóng cửa | man-hinh | trắng | manh | sốc | 2D-chen | 100.97 | co |
| Kết quả tương xứng: đổi tông xanh lam cảnh cửa | man-hinh | xanh lam | vua | cô đơn, bị đẩy ra | 2D-chen | 109.3,114.9 | khong-ro |
| Kết quả tương xứng: hạt vàng bay quanh cảm giác ấm áp | hat3d | vàng | nhe | ấm áp, vui | 3D | 18.1,76.0,146.5 | khong-ro |
| Kết quả tương xứng: gợn nước hồ bơi | do-hoa | xanh nhạt | vua | sốc | 3D | 4.7 | co |
| Máy bán hàng: rung máy bán hàng | hat3d | trung tính | vua | sợ | 3D | 61.1,97.4 | khong-ro |
| Máy bán hàng: đèn nhấp nháy máy bán hàng | anh-sang | vàng-đỏ | nhe | kỳ bí | 3D | 60.5,95.2,143.2 | khong-ro |
| Máy bán hàng: tối sầm chuyển cảnh | man-hinh | đen | manh | sốc | 2D-chen | 69.7,78.8 | khong-ro |
| Máy bán hàng: hạt bụi nước dột | hat3d | xanh-tím | nhe | buồn | 3D | 41.0,43.0 | khong-ro |
| Mực tàng hình: ánh đèn tím UV hiện chữ | anh-sang | tím | manh | bất ngờ | 3D | 57.0,62.93,122.6 | khong-ro |
| Mực tàng hình: chớp sáng khi tên bừng lên | man-hinh | trắng-tím | vua | sững sờ | 2D-chen | 122.6 | khong-ro |
| Mực tàng hình: chuyển cảnh bằng vải trắng quét ngang | chuyen-canh | trắng | vua | đổi nhịp | 3D | 139.43 | khong-ro |
| Tảng đá ban sức mạnh: hạt mưa | hat3d | xám-trắng | vua | nặng nề | 3D | 50.1,52.4,55.4 | co |
| Tảng đá ban sức mạnh: chớp trắng | anh-sang | trắng | manh | sốc | 2D-chen | 37.7,52.47,57.3 | co |
| Tảng đá ban sức mạnh: đổi màu | man-hinh | đỏ-cam | vua | căng | 2D-chen | 52.47,54.1,57.3 | khong-ro |
| Tảng đá ban sức mạnh: zoom giật | chuyen-canh |  | vua | giật mình | 2D-chen | 29.83,59.5,65.73 | khong |
| Thị trấn quên sạch lúc nửa đêm: chớp-trắng | man-hinh | trắng | manh | sợ | 2D-chen | 122.7 | co |
| Thị trấn quên sạch lúc nửa đêm: tối-dần | anh-sang | xanh đen | vua | hồi hộp | 3D | 122.8,123.4 | khong-ro |
| Thị trấn quên sạch lúc nửa đêm: đổi-màu | anh-sang | xanh sang vàng | nhe | tò mò | 3D | 39.0,40.0 | khong-ro |
| Thị trấn quên sạch lúc nửa đêm: hạt | hat3d | trắng | nhe | ấm | 3D |  | khong |
| Tiếng mẹ gọi: đổi-màu+zoom-giật | man-hinh | chưa rõ | vua | sợ | 2D-chen | 30.3,30.53 | khong-ro |
| Vật ký sinh: tia-màu-rơi | hat3d | cyan, vàng, hồng | vua | nhấn mạnh sức mạnh | 2D-chen | 19.0,19.9 | khong-ro |
| Vật ký sinh: vệt-trắng | do-hoa | trắng | nhe | đe doạ | 2D-chen | 13.1,14.7 | khong-ro |
| Vật ký sinh: xe-móp-biến-dạng | do-hoa | đỏ, trắng | manh | bạo lực | 3D | 17.3,18.3 | khong-ro |
| Vật ký sinh: tia-sét-vàng-xanh | anh-sang | vàng, xanh | manh | kinh ngạc | 2D-chen | 38.9,40.9 | khong-ro |

**Đối chiếu `engine/fx.js` / `post.js` / `fx-danh.js`:**

| Có sẵn | Thiếu / cần thêm (đề xuất; mọi cái mới phải bật/tắt được) |
|---|---|
| `fxRain`, `fxSnow`, `fxDust`, `fxBolt`/`lightning`, `fxPuffs`, vfxAura/Beam/HitSpark/SpeedLines/Shake, `post.js`: grade, bloom, vignette, grain, storm, faceLive | đổi màu cả khung theo khoảnh khắc (grade theo shot) · tối sầm/mờ-đen chuyển cảnh · zoom giật (fov bật nhanh) · chữ nhấn đỏ từ khoá · biểu tượng luật trên màn (chấm đếm, thanh) · hạt vàng ấm · bọt/nước 3D · rung vật theo nhịp |

**Hiệu chỉnh máy dò (agent chấm trên bản máy dò CŨ):**

| Loại | Thật / đã chấm |
|---|---|
| may_chop | 12/26 |
| may_rung | 5/6 |
| may_doi_mau | 29/71 |
| may_zoom_giat | 24/57 |

Hạn chế: 10 frame cách nhau 0,4–1,5 s nên sự kiện ngắn "không thấy" ≠ giả. Nên ngưỡng được chỉnh thêm bằng cách **tự xem khung ±0,3 s quanh sự kiện** (`output/hoc-phong-cach/_kiem-sk.jpg`, video Tảng đá): chớp thật chỉ khi độ sáng vọt rồi trở lại; vật tiền cảnh lướt qua và cú cắt sót gây chớp/đổi màu/zoom giật giả. Bản máy hiện hành: loại cú cắt sót (|Δkhung| > 40), chớp = xung quay lại ≤ 8 khung, đổi màu/zoom giật chỉ tính khi cấu trúc khung gần giữ nguyên; zoom/pan giữ ngưỡng ±0,10 (chưa có nhãn độc lập để chỉnh).

## 11. D: bố cục + tiền/trung/hậu cảnh (lưới 10×10, 214 khung mẫu)

| Chỉ số | Giá trị |
|---|---|
| Hàng của mắt/mặt (1 = trên) | tb 4.1 (khoảng 2–9) |
| Cột của mắt | tb 4.8 |
| Chiều cao nhân vật / khung | tb 46.0% (khoảng 0–95%) |
| Số lớp | 1: 9%, 2: 69%, 3: 22% |
| Có vật tiền cảnh | 58% khung, chiếm tb 32.0% |
| Hậu cảnh rõ / mờ | 43% / 57% |
| Hậu cảnh có kể chuyện | 22% |
| Vị trí ngang | giua 62%, lech-trai 17%, lech-phai 13%, 1/3 9% |
| Chừa chỗ phụ đề | duoi 98%, khong 2% |

## 12. F: thẻ tổng (video mẫu)

| Video | Số bối cảnh (trong/ngoài) | Quay lại | Số nhân vật khác nhau | Nhiều shot nhất | Asset (loại / tổng món, ước lượng) | Nhóm lớn nhất |
|---|---|---|---|---|---|---|
| Cái hố trên bầu trời | 9 (0/9) | 7 | 6 | Rô: áo vàng, quần jean xanh, nón câu cá  (45) | 45 / 600 | do_vat |
| Chín mạng sống | 9 (1/8) | 5 | 7 | áo sọc đen trắng nâu, mũ bảo hiểm trắng, (60) | 45 / 260 | nha |
| Kết quả tương xứng | 12 (8/4) | 5 | 7 | áo vàng, quần đen, tóc cam, có vương miệ (80) | 40 / 150 | do_vat |
| Máy bán hàng | 6 (1/5) | 4 | 8 | áo sọc xanh-trắng, quần jean (60) | 35 / 160 | do_vat |
| Mực tàng hình | 9 (7/2) | 5 | 6 | Áo xanh lá sọc, quần đen, tóc đen (chính (60) | 25 / 120 | do_vat |
| Tảng đá ban sức mạnh | 9 (3/6) | 5 | 6 | áo hoodie vàng cam, quần xanh lá (40) | 25 / 80 | do_vat |
| Thị trấn quên sạch lúc nửa đêm | 10 (6/4) | 3 | 6 | áo cam hoodie, đầu vàng (40) | 25 / 180 | do_vat |
| Tiếng mẹ gọi | 7 (2/5) | 4 | 6 | Ro: áo khoác xanh lá chữ D, tóc đen (40) | 16 / 40 | do_vat |
| Vật ký sinh | 9 (3/6) | 7 | 9 | ao soc den trang/xam, quan jeans (nguoi  (34) | 38 / 150 | do_vat |

## 13. G: cảm xúc mặt + hành động

Nhãn mặt đọc được ở 331/846 shot (còn lại mặt quay đi/nhỏ/khuất): buon 69, vui 53, gian 51, ngac-nhien 35, so 31, tron 19, lo-lang 9, kho-chiu 7, hoảng 6, quyet-tam 5, gang-suc 3, tuc-gian 3

**Đối chiếu lại với engine (19/11/2026; bảng cũ "thiếu" đã lỗi thời).** `R6_FACES` (`engine/r6.js:38`) chỉ liệt kê 8 tên, nhưng mặt vẽ có hai kiểu (`faceStyle`, r6.js:24,130): `classic` (`drawFace` r6.js:169; tên lạ rơi về smile) và `cartoon` (`drawCartoonFace` r6.js:309) có thêm `worried`, `panic` (vẽ như scared), `cold`, `moved`, `sleep` (r6.js:331–346). Bí danh ở `engine/cast.js:43` (anxious/nervous → worried, serious → neutral, touched → moved…). Mặt tiếng Việt `quyet_tam`, `thac_mac`, `boi_roi`… chỉ thuộc mặt ảnh Gà/R15 (`docs/danh-muc.md`), không phải mặt vẽ R6.

| Cảm xúc thấy | Mặt R6 | Trạng thái |
|---|---|---|
| buon (69) | `sad` r6.js:190 | ĐÃ CÓ |
| vui (53) | `smile` r6.js:206 / `happy` r6.js:183 | ĐÃ CÓ |
| gian (51) | `angry` r6.js:200 | ĐÃ CÓ |
| ngac-nhien (35) | `surprised` r6.js:197 | ĐÃ CÓ |
| so (31) | `scared` r6.js:192 | ĐÃ CÓ |
| tron (19) | không có (`grin` chỉ là bí danh cast.js:46, r6.js không vẽ → rơi smile) | THIẾU; KHÔNG CHẮC nghĩa nhãn (bản không dấu, chưa giải nghĩa) |
| lo-lang (9) | `worried` r6.js:336 (chỉ kiểu cartoon; classic rơi smile) | ĐÃ CÓ (cartoon) |
| kho-chiu (7) | không có; gần `cold` r6.js:339 / `sad` | THIẾU (vẽ được) |
| hoảng (6) | `panic` r6.js:333 (cartoon, cùng nét với scared; clip `panic` r6.js:502 dùng nó) | ĐÃ CÓ (cartoon) |
| quyet-tam (5) | không có; gần `neutral`/`angry` (serious → neutral cast.js:47). `quyet_tam` chỉ là mặt Gà | THIẾU (vẽ được) |
| gang-suc (3) | không có; gần `cold`/`angry` | THIẾU (vẽ được, dễ gộp với kho-chiu) |
| tuc-gian (3) | `angry` | ĐÃ CÓ |

Tổng 12 nhãn: ĐÃ CÓ 8, THIẾU 4 (tron, kho-chiu, quyet-tam, gang-suc). Ngoài danh sách còn có `cold` (r6.js:339) và `moved` (r6.js:344, alias touched/grateful/relieved). Mọi mặt mới: cần code, bật/tắt được, mặc định tắt.

**Clip hành động thấy → clip trong engine:**

| Clip (số lần) | Tên trong engine | Dài | Lặp | Trạng thái |
|---|---|---|---|---|
| đứng-thở (32) | `idle` r6.js:371 | vừa | một lần | ĐÃ CÓ |
| đi (13) | `walk` r6.js:378 | vừa | một lần | ĐÃ CÓ |
| giật-mình (11) | `scared` r6.js:434 | ngắn | một lần | ĐÃ CÓ |
| vẫy (10) | `wave` r6.js:416 | ngắn | một lần | ĐÃ CÓ |
| ngã (8) | `tumble` r6.js:535 / `faint` r6.js:467 | ngắn | một lần | ĐÃ CÓ |
| leo (6) | `climb` engine/anim-them.js:34 (+ `rbx_climb`) | vừa | một lần | ĐÃ CÓ (bảng cũ ghi thiếu) |
| giật mình (6) | `scared` | ngắn | một lần | ĐÃ CÓ |
| nhảy (5) | `jump` r6.js:400 | ngắn | một lần | ĐÃ CÓ |
| chạy (5) | `run` r6.js:388 | ngắn | một lần | ĐÃ CÓ |
| ngồi (5) | `sit` r6.js:428 | dài | một lần | ĐÃ CÓ |
| ôm (4) | `hug` r6.js:510 | vừa | một lần | ĐÃ CÓ |
| ngồi-viết (2) | `write` r6.js:525 | dài | một lần | ĐÃ CÓ |
| bám (1) | không có (gần nhất `hold` r6.js:496) | ngắn | một lần | THIẾU |
| đứng-dậy (1) | `nch_getUp` engine/anim-nch.js:264 (+ `sitUp` anim-them.js:21) | ngắn | một lần | ĐÃ CÓ (bảng cũ ghi thiếu) |

Tổng 14 dòng: ĐÃ CÓ 13, THIẾU 1 (bám; "giật mình" xuất hiện hai dòng nên thật ra 12 clip khác nhau có sẵn + 1 thiếu).

**Cảm xúc theo phần (agent tóm, 9 video):** Hook = tò mò/bình thản · Leo thang = bực, sợ, hoảng · Twist = buồn, đau, im lặng · Giải quyết = dịu, ấm, nhẹ nhõm.

Chưa có bảng ảnh mặt cắt riêng (agent đọc từ dải 10 frame, mặt chỉ ~10 px): cần bước riêng nếu muốn mẫu mặt cho `r6-anim`. Chưa đo riêng độ trễ phản ứng sau câu then chốt và nhịp đứng khựng. Bản danh mục đầy đủ để dùng: `.claude/skills/r6-anim_RO/SKILL.md`.

## 14. H: mô típ truyện (37 video; agent Sonnet đọc tóm tắt .srt; mã không dấu)

**Kiểu luật:** cam-dieu 3, hien-tuong-chu-ky 3, quai-san-moi 3, bien-doi-than-the 2, tan-bien-mat-dan 2, gioi-han-tai-nguyen 2, cam-xuc-thanh-vat-ly 2, cam-xuc-doi-tien-te 2, vat-pham-ky-la 2, quai-bat-chuoc 2, nhan-qua-phan-hoi 2, nang-luc-ban-tang 2

**Quan hệ:** ban-be 13, me-con 11, ca-thi-tran 6, ong-chau 5, anh-em 3, bo-con 3, hang-xom 3, me 2, bo-me-con 1, ca-the-gioi 1, anh-chi-em 1, ba 1

**Kiểu twist:** ke-ho-luat 6, bi-mat-nguoi-lon 6, diem-yeu-thanh-loi-giai 5, dao-nguoc-luat 4, nguon-goc-luat 3, doi-vai-quy-vat 2, nguoi-than-la-mat-xich 2, nguoi-than-bi-thay-the 1, nguoi-ke-la-quai 1, hy-sinh-tinh-than 1, nguoi-ke-bi-lech-nhan-thuc 1, vong-thoi-gian 1

**Kiểu kết:** am-ap-hoa-giai 14, hai-huoc-lat-ngua 8, dang-chua-xot 7, chien-thang 4, kinh-di-mo 2, ket-treo 1, mia-mai 1

**Tổ hợp hay gặp (twist × kết):**

- (mọi luật) x bi-mat-nguoi-lon x dang-chua-xot — 3 video
- (mọi luật) x bi-mat-nguoi-lon x am-ap-hoa-giai — 3 video
- (mọi luật) x diem-yeu-thanh-loi-giai x chien-thang — 3 video
- (mọi luật) x ke-ho-luat x am-ap-hoa-giai — 3 video
- (mọi luật) x doi-vai-quy-vat x hai-huoc-lat-ngua — 2 video
- (mọi luật) x nguon-goc-luat x hai-huoc-lat-ngua — 2 video

**Tổ hợp CHƯA ai làm (gợi ý):**

- than-chu-kich-hoat x dao-nguoc-luat x chien-thang (hết giờ thì luật quay lại với kẻ ác)
- cam-xuc-thanh-vat-ly x nguon-goc-luat x am-ap-hoa-giai (hiện tượng do một lời hứa cũ)
- mat-tri-nho x bi-mat-nguoi-lon x am-ap-hoa-giai (bà giấu thư cho cháu)
- vat-pham-ky-la x nguoi-ke-la-quai x kinh-di-mo (vật biến người kể thành thứ đáng sợ)
- nghi-thuc-tap-the x ke-ho-luat x chien-thang (cả thị trấn cùng lách luật)
- nang-luc-ban-tang x bi-mat-nguoi-lon x dang-chua-xot (sức mạnh do người lớn hy sinh)
- gioi-han-tai-nguyen x nguoi-than-la-mat-xich x am-ap-hoa-giai (bố mẹ tiêu hết cho con)
- nhan-qua-phan-hoi x nguoi-ke-la-quai x kinh-di-mo

**Khung nhịp chuẩn (cho `viet-kich-ban`):**

| # | Cảnh | Mốc % | Ghi chú |
|---|---|---|---|
| 1 | Hook: nêu luật 1 câu kèm cơ chế game (số, thanh, đếm) | 0–5% | câu đầu 'Ở thị trấn này…'; luật ra trong vài giây đầu |
| 2 | Cái giá của luật + đời thường bị luật chi phối | 3–10% | cho thấy mất gì, ai chịu |
| 3 | Giới thiệu điểm yếu của nhân vật do luật gây ra | 10–25% | nêu mối quan hệ chính (mẹ/ông/bạn) |
| 4 | Thử nghiệm đầu: kẽ hở hoặc cố gắng đầu tiên | 25–35% | thất bại nhẹ, tăng căng thẳng |
| 5 | Leo thang: sự việc lớn hơn, thời gian ép | 35–50% | thêm đồng hồ/đếm ngược, người lớn giấu |
| 6 | Đáy: khủng hoảng, nguy hiểm tột độ | 50–60% | thường có cảnh khóc hoặc mất mát |
| 7 | Manh mối: nhận ra bí mật hoặc kẽ hở | 58–66% | dọn đường cho twist |
| 8 | TWIST: bí mật người lớn / nguồn gốc / đảo luật | 62–72% | không chỉ quái xuất hiện; điểm rơi trung vị ~0.66 |
| 9 | Hành động giải quyết dùng điểm yếu | 70–85% | điểm yếu thành lời giải |
| 10 | Cao trào cảm xúc: người lớn hy sinh hoặc tỏ lòng | 80–90% | nhạc dâng, ôm |
| 11 | Kết: trật tự mới, cái giá còn lại | 90–100% | câu cuối lặp lại luật hoặc lật nghĩa; hài hoặc xót |

Twist (agent đọc) rơi trung vị 68% video (khoảng 52–93%, n=37).

**Kiểm tay phần A:** Luật: máy đúng khoảng 34/37 (câu đầu thường là luật); sai ở muc-tang-hinh và trong-cay vì không có luật lạ, và có video luật lệch vài câu. Twist: máy chỉ có số cho 11/37 video, đúng 4 (nam-phut-nua-thoi, nguoi-bien-mat-dan, hai-lan-chuc-ngu-ngon, can-duoc-goi-ten); sai nặng ở muoi-tu (84% so với khoảng 65%) và thich-ai-la-bay-len (96% so với khoảng 70%) vì khớp từ khoá cảm xúc ở đoạn kết. Nên bỏ từ khoá cảm xúc/cảm ơn khỏi twist; thêm 'hóa ra', 'thật ra', 'bí mật', 'không phải', 'chỉ là', 'năm rồi'; và nhận twist ở câu đầu tiên đổi giọng ('nhưng', 'thế rồi') trong khoảng 50–75%.

→ Dòng "Twist (từ khoá) ở % video" ở mục 2 chỉ để tham khảo (máy bắt được ~11/37 video, đúng 4): dùng số của agent ở trên. Luật máy đúng ~34/37.

## 15. ĐỀ XUẤT → trạng thái áp (19/11/2026, người dùng duyệt)

| Mã | Điểm | Trạng thái |
|---|---|---|
| A1 | lời ~290 từ/phút, câu 14 từ, hook ~18 | **ĐÃ ÁP** (viet-kich-ban) |
| A2 | nói luật trong ≤ 5 giây đầu | **ĐÃ ÁP** (ghi 5 s, không lấy 10–20 s) |
| A3 | móc giữ chân ~25 s/lần | **ĐÃ ÁP** |
| A4 | twist 65–72% (thu hẹp từ 55–80%) | **ĐÃ ÁP** |
| A5 | không CTA; kết ấm/hài lật ngược | **ĐÃ ÁP** |
| B1 | ~36 shot/phút, shot ~1,7 s, giải quyết ~1,9 s | **ĐÃ ÁP** (lam-phim, ghi chú lệch ~52 shot/phút của CLAUDE.md) |
| B2 | cắt cuối câu ±0,3 s, ~2 shot/câu | **ĐÃ ÁP** (lam-phim) |
| B3 | phụ đề cụm 1–3 chữ, từ khoá đỏ | HOÃN |
| C1 | cảnh báo shot đứng yên > 55% trong gates.json | **BỎ** (xung đột luật camera dồn dập) |
| C2 | cỡ cảnh / vùng phụ đề trong gates | không sửa gates; chỉ hướng dẫn mềm nếu muốn |
| D1 | hậu kỳ sơn/vẽ tay | HOÃN |
| D2 | bố cục 3 lớp, tiền cảnh mờ cố ý | **ĐÃ ÁP** (mục "chữ ký riêng" skill) |
| D3 | biểu tượng luật cố định một vị trí | **ĐÃ ÁP** (mục "chữ ký riêng" skill) |

Nội dung đề xuất gốc (giữ để tham khảo):

**Cho `viet-kich-ban` / `lam-phim`:** ~290 từ/phút lời (260–315); câu tb 14 từ (hook dài hơn, ~18); luật nói ra trong ~10–20 giây đầu, câu mở "Ở thị trấn này/thế giới này…"; móc giữ chân (câu hỏi, "nhưng", "cho đến khi") mỗi ~25 s; twist ở ~65–72% video; ngôi thứ nhất ~0,5 lần/câu; kết ấm/hài lật ngược phổ biến nhất; lời kể không có CTA.
**Nhịp hình:** ~36 shot/phút (shot tb 1,7 s, khoảng 1,3–2,2); phần Giải quyết shot dài hơn (~1,9 s); ~87% câu có cú cắt trong ±0,3 s cuối câu; ~2 shot/câu; phụ đề trắng viền đen giữa-dưới, từng cụm 1–3 chữ, từ khoá luật tô đỏ.
**Cho `tools/gates.json`:** giữ `zoomTi` 0,04; thêm cảnh báo tỉ lệ shot đứng yên > 55% (mẫu 43%, 12–78%); cỡ cảnh ≈ mục 8; mắt nhân vật ở hàng theo mục 11; chừa ~20% khung dưới cho phụ đề.
**Chữ ký riêng (ĐỀ XUẤT, 2–3 điểm cố ý khác):** (1) khối vuông R6 + hậu kỳ sơn/vẽ tay thay vì Roblox thật; (2) bố cục 3 lớp rõ hơn với tiền cảnh mờ có chủ ý (khung mẫu phần lớn chỉ 2 lớp); (3) biểu tượng luật (thanh/đếm) cố định một vị trí trên khung, nhất quán suốt tập.
