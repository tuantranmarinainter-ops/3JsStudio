# Lớp ÂM THANH của tập ep002 (phim 124,49 s, 104 shot, cắt đen 123,29 s)

Sửa lớp nào → chỉ sửa file của lớp đó → chạy một lệnh dựng lại (`--no-bundle` để khỏi gộp HTML):

| Lớp | File dữ liệu | Lệnh | Ghi chú ep002 |
|---|---|---|---|
| **nen** — tiếng nền | `sfx/layers.json` → `nen` (map bối cảnh → tiếng, `night`, `minSeg`, `cutAt`) | `node tools/build.mjs ep002 nen` | thị trấn ngày = tiếng phố + chim; đêm (phòng Gà + phố) = dế; nhà máy = băng chuyền; phòng Gà ngày = room tone. `minSeg: 3` nhập cú cắt ngắn vào đoạn kề để nền không chớp. Im sau 123,29 s |
| **buoc-chan** — bước chân | `sfx/layers.json` → `buoc-chan`; mốc: `sfx/steps_extra.json` (sinh bởi `gen-cues.mjs`), `sfx/steps.json` (= `[]`, không có nhà biết đi) | `node tools/build.mjs ep002 buoc-chan` | bước chân nhân vật (Gà chạy, gấu, thị trưởng, ông Bách). KHÔNG chạy `build ep002 canh` (steps.mjs ghi đè steps.json — vô hại nhưng thừa) |
| **khoanh-khac** — tiếng theo khung | `sfx/cues_s001-s114.json` | `node episodes/ep002/sfx/gen-cues.mjs` rồi `node tools/build.mjs ep002 khoanh-khac` | `gen-cues.mjs` đặt mốc = bắt đầu shot THẬT (cộng dồn `dur`) + độ trễ trong shot; "Boang" 123,04 s lấy từ `nguon/giong-moi/nhip.json` (chảo rỗng tự tổng hợp `sfx/hollow_pan_bonk.wav` + `cartoon boing`). Đuôi tắt trong 0,25 s sau cắt đen |
| **nhac** — nhạc nền | `music/plan.json` (`duration` 124,49; 4 đoạn) | `node tools/build.mjs ep002 nhac` | Hook 0–13,6 `bidous_transit` · Leo thang 13,6–62,6 `wingspan` · Twist 62,6–93,6 `storm_adventure` · Giải quyết 93,6–123,29 `feeling_piano`, tắt đúng cắt đen |

Ghi công: `assets/sfx/CREDITS.md` (tiếng động), `assets/music/CREDITS.md` (nhạc CC BY: Blue Dot Sessions, Komiku, E. Erkut). "Hollow pan bonk" là tiếng tự tổng hợp (CC0).
