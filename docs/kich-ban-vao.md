# Kịch bản vào — định dạng storyboard cho `tools/storyboard.py`

Người dùng đưa **khung hình + mô tả từng shot** → một lệnh tạo tập mới dựng được ngay:

```bash
python tools/storyboard.py <thư mục storyboard> ep002 [--sheet] [--force] [--title "…"]
node tools/look.mjs episodes/ep002/index.html --shots all          # xem bản dựng
```
`--sheet` chụp thêm bảng so sánh **khung storyboard | bản dựng đầu tiên** → `output/storyboard/ep002/compare.jpg`.
Mẫu chạy được: `episodes/_template/storyboard-example/` (5 shot) → `python tools/storyboard.py episodes/_template/storyboard-example _demo_import --force --sheet`.

## Thư mục vào
```
storyboard.md   (hoặc storyboard.csv + episode.json, hoặc storyboard.json)
shot_001.png    khung shot 1 (png/jpg/webp; số trong tên file = số thứ tự shot; cột "khung" ghi tên khác cũng được)
shot_002.png …
```

## storyboard.md
Phần đầu: dòng `khoá: giá trị` (thông tin tập). Sau đó **một bảng Markdown**, mỗi hàng 1 shot.

```markdown
title: Ai đi bộ cũng phải nhảy
seed: 7
rule: Ở thị trấn này, ai đi bộ cũng phải nhảy.
weakness: Tôi không nhảy được.
twist: …
solution: …
actor hero: shirt=#e74c3c pants=#2c3e50 hat=cap hatColor=#2d6cdf
actor mom: shirt=#8e44ad skirt=#5d4037 hair=braids lashes=true
crowd: 8
place bakery: 40, -20, 0        (x, z, hướng ry — tuỳ chọn; không ghi thì dùng địa điểm thị trấn)

| id | khung | giây | lời kể | loại | ai | cùng | ở đâu | hành động | mặt | máy quay | chữ | tiếng động |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | shot_001.png | 2 | Ở thị trấn này, ai đi bộ cũng phải nhảy. | toàn cảnh | | | quảng trường | | | lia chậm | Ai đi bộ cũng phải nhảy | town ambience day birds@0*0.3 |
| 2 | | | ^ | đám đông | | | quảng trường | mọi người nhảy | vui | | | cartoon boing@0.3 |
```

Khoá thông tin tập: `title, seed, rule, weakness, twist, solution, env, light, narrator, voice_source` (+ `actor <tên>: k=v …`,
`crowd: <số>`, `place <tên>: x, z[, ry]`). `actor` nhận mọi tuỳ chọn `createR15` của `engine/r15.js`
(skin, shirt, sleeves, pants, skirt, hat, hatColor, hair, hairColor, scarf, beard, lashes…).

## Cột của bảng (tên Việt hoặc Anh, có dấu hay không đều được)
| Cột | Anh | Ý nghĩa |
|---|---|---|
| id | id | `1`, `s001`, `s012a`… (số → `s001`) |
| khung | frame | tên file khung; trống = `shot_<số thứ tự>.*` |
| giây | dur | thời lượng (giây). Trống → chia theo độ dài lời kể (~14 ký tự/giây); shot không lời = 1 s |
| lời kể | narration | câu dẫn chuyện MỚI (ngôi thứ nhất). `^` = vẫn câu của shot trước. Trống = shot không lời. `[me] …` = câu của vai `me` |
| loại | type | loại shot (bảng dưới) — tên Anh hoặc Việt: toàn cảnh, đám đông, đi ngang, bám theo, cận mặt, phản ứng, qua vai, cận đồ / chi tiết, rượt, lộ diện / twist, đối thoại |
| ai | who | diễn viên chính: `hero`, `mom`… hoặc tôi / mẹ / ba / bà nội / dân |
| cùng | with | diễn viên thứ 2 (đối thoại, qua vai, rượt) |
| ở đâu | at | địa điểm thị trấn: quảng trường (square), nhà (home), sân (yard), cửa hàng (shop), phố (street), ngã tư (crossroad), công viên (park), house1…; hoặc tên env của `engine/envs.js` (hawaii, forest, kitchen, bedroom, ocean, island…); trống = nối tiếp shot trước |
| hành động | action / anim | tả tự do → đoán animation (đi, chạy, nhảy, vẫy, chỉ tay, ngồi, sợ, cổ vũ, nhảy múa, nhìn quanh, ngã, nấp, ôm…) hoặc ghi thẳng tên R15 (`walk`, `cheer`…) |
| mặt | face | vui, cười, ngạc nhiên, sợ, buồn, lo, giận… hoặc tên (`surprised`, `worried`…) |
| máy quay | camera | ghi chú tự do; từ khoá: đẩy vào (push), kéo ra (pull), lia (pan), xoay quanh (orbit), cẩu lên (crane), hạ xuống (drop), rung (shake), đứng yên (static), "trái" = đảo chiều. Không có loại → đoán loại từ đây (toàn cảnh / cận…) |
| chữ | text | chữ nổi đặc biệt trên hình (tiêu đề luật, con số) — KHÔNG phải phụ đề |
| tiếng động | sfx | `tên tiếng Anh@giây_trong_shot*âm_lượng`, nhiều cái cách `;` (vd `door creak@0.2*0.5; gasp`) |
| hành động 2 / mặt 2 | withAnim / withFace | cho diễn viên thứ 2 |
| env, ánh sáng | env / light | bối cảnh / preset ánh sáng (`day`, `night`, `beach`…) |
| ghi chú | notes | ghi chú tự do (ghi `obj:mailbox_home` để shot insert nhắm vào object) |

## Loại shot (engine/shottypes.js)
| Loại | Mặc định |
|---|---|
| establish | toàn cảnh cao/xa địa điểm, lia chậm |
| crowd | đám đông quanh địa điểm cùng làm 1 động tác (lệch pha) |
| walkBy | `who` đi ngang khung trái→phải, camera đứng yên |
| follow | camera bám sau lưng `who` đi vào sâu |
| closeup | cận mặt, đẩy vào nhẹ; không ghi địa điểm → đứng đúng chỗ shot trước |
| reaction | trung cảnh ngang ngực, mặt `surprised` |
| overShoulder | qua vai `with` (tiền cảnh) nhìn `who` |
| insert | cận đạo cụ (`obj`) |
| chase | `who` chạy, `with` đuổi sau, camera bám ngang + rung |
| reveal | từ sau lưng `who`, cẩu lên + kéo ra lộ thứ phía trước |
| dialogue | 2 người quay vào nhau, 2-shot |

## Ra (episodes/<ep>/)
| File | Nội dung |
|---|---|
| `episode.js` | seed, luật/điểm yếu/twist/lời giải, diễn viên, địa điểm (`'town:center'` = chưa đặt, sửa tay) |
| `shots.js` | 1 dòng/shot theo loại; ghi chú máy quay + hành động ở cuối dòng. Ghi đè: `cam: { dist: 8 }`, `cast: { hero: {…} }` |
| `narration.txt` | `@at <giây> câu` — mốc = lúc shot đầu của câu bắt đầu → `tools/tts.py` canh giọng đúng cú cắt |
| `captions.js` | phụ đề **ước lượng** (cụm 3 chữ); có giọng thật thì tạo lại |
| `sfx/cues_*.json`, `sfx/layers.json` | tiếng động theo shot (lớp `khoanh-khac`), tiếng nền theo env |
| `index.html` | chép từ `episodes/_template/index.html` |
| `storyboard/` | khung gốc `s001.png…`, `storyboard.json` (đã chuẩn hoá), `index.html` (trang xem khung theo t, dùng cho `look.mjs --ab`) |

## Giới hạn
- Bố cục từ khung ảnh **không** được đọc tự động (chưa nhận dạng ảnh): camera/bố trí lấy từ loại shot + từ khoá. Khung chỉ để so trên bảng `--sheet`; chỉnh tay `cam`/`cast` trong `shots.js` cho khớp.
- Thời lượng ước lượng theo số ký tự; tạo giọng thật xong, chỉnh `dur` theo `narration.json`.
- Địa điểm/diễn viên lạ được thêm khung (`'town:center'`, màu áo mặc định) — cần sửa tay trong `episode.js`.
