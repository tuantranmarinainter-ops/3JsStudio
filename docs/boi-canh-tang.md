# Bối cảnh 3 tầng, sự sống, giờ/thời tiết, sinh từ mô tả (Task 13)

Tài liệu duy nhất cho agent sửa từng `engine/envs/<tên>.js`. Lõi: `engine/envs/tang.js`, `gio-thoi-tiet.js`, `cong-thuc.js`.

## 1. Hợp đồng env
Env (hàm `build(g, e, H)`) phải đảm bảo, sau `def()` trong `engine/envs.js`:
- `e.layers = { front, mid, back }`: mảng vật GỐC có `userData.tang`. **Không tự khai** — `def()` tự gom từ cây `g` mỗi lần đọc
  (vật gắn muộn vẫn có mặt). Chỉ cần gọi `ganTang`.
- `e.suSong: string[]`, tên nhóm sự sống đã bật: `dan, xe, chim, song, co-gio`. Env trả trong object `return { suSong: ['dan','xe'], … }`.
  **Lệch brief**: brief ghi `life`, nhưng `ocean.js` đã dùng `e.life` làm đối tượng cá voi (có `.update()`), nên trường tên là `suSong`.
- Tầng rỗng → `console.warn('[env <tên>] tầng rỗng: …')` (không ném lỗi). Tắt cảnh báo: `__autoFx.canhBaoTang = false`.

`ganTang(obj, 'front'|'mid'|'back')` (có sẵn trong `H`, hoặc `import { ganTang } from './tang.js'`) gắn `obj.userData.tang`, trả lại `obj`:
```js
ganTang(place(g, K.streetLamp(), x, 0, z), 'front');   // tầng trước: gần camera, vật nhỏ (đèn, bụi, hoa, phao, đá)
ganTang(woods.group, 'back');                          // tầng sau: xa (núi, rừng xa, mây, đường chân trời)
```
Tầng giữa = vật chính của cảnh (nhà, tàu, cây lớn, đồ nội thất). Gắn lên Group cha là đủ (con không đếm riêng).
Mỗi tầng ≥ 1 vật **đang hiện** (`measure.js` bỏ vật có tổ tiên `visible = false`). Mẫu chạy được: `engine/envs/town.js`.
Không gắn `userData.vai` vào vật tầng (vai dành cho nhân vật/nhà chính).

## 2. Giờ và thời tiết theo shot
Shot hoặc episode ghi `time` (`sang|trua|chieu|hoang-hon|dem`) và/hoặc `weather` (`nang|may|mua|giong|bao|tuyet|suong`);
đúng danh sách của `tools/kb/kichban.py` (test kiểm khớp). **Không ghi cả hai ⇒ hình y hệt cũ.**
- Cũng đặt được ở cấp tập: `EPISODE.time` / `EPISODE.weather` là mặc định cho mọi shot không ghi riêng (shot ghi thì thắng). Cần
  `createDirector({ …, episode: EPISODE })` trong `index.html` (tập mẫu đã có; ep001 chưa truyền nên chưa nhận). **`time/weather` của shot KHÔNG
  thừa kế sang shot sau**: muốn cả đoạn là đêm thì đặt ở episode hoặc ghi từng shot.
- `time` đè `light` của shot (kể cả `light` thừa kế): `trua` = ánh sáng ngày gốc của env; `dem` = `night`/`snowNight`/`bedNight`.
  Muốn tinh chỉnh thêm dùng `lightOverride` (ưu tiên cao hơn).
- `weather` với env KHÔNG có biển/mưa: kéo trời/sương về xám, giảm nắng, thêm mưa/tuyết (lớp phủ hạt `fx_thoitiet`, tạo lười lần đầu cần).
  Env có `e.sea`/`e.rain`: chuyển thành `seaWeather` (`nang→nang, may→u-am, mua→mua, giong→giong, bao→bao, tuyet→bang, suong→gio-nhe`; đêm → `dem-trang`/`dem-bao`).
  Env có `e.snow`/`e.rain` riêng không bị chồng hạt. Nội thất (kitchen, bedroom) bỏ qua `weather`.
- Thêm giờ/thời tiết mới: sửa `GIO_MAU` / `THOI_TIET_BANG` (hàm thuần, không THREE) và `kichban.py`.
- Tắt: `globalThis.__autoFx.gioThoiTiet = false`. Chưa có ô trong `post.js` (`FX_DEFAULTS`/`FX_LABELS`): chủ file post.js thêm một dòng.

## 3. Sinh bối cảnh từ mô tả
`tuMoTa('bến cảng sương mù')` → `{ env:'sea', them:[…], time:'sang', weather:'suong' }` hoặc `null`. Khớp từ khoá đã fold, cụm dài nhất thắng.
Thêm công thức = thêm 1 dòng vào `CONG_THUC` (khoá viết thường, không dấu).

## 4. Kiểm một env bằng số
```
node --test tools/tests/boi-canh.test.mjs                       # xoá tên env khỏi CHUA_GAN trong file test trước
node tools/look.mjs episodes/ep001/index.html --shots <id shot của env> --out output/look/<tên-agent>
node tools/kiem-luat.mjs episodes/ep001/index.html --shots <ids> --out output/<ep>/kiem   # xem L8: oPhang + tang
```
Test `env <tên>: __measure().tang có cả 3 tầng` chạy khi tên env không còn trong `CHUA_GAN` (đầu `tools/tests/boi-canh.test.mjs`).

Đoạn mã kiểm 1 env trong test (đổi `env` của một shot town rồi đo; khôi phục sau đó) — xem vòng `for (const env of ENV17)` trong
`tools/tests/boi-canh.test.mjs`:
```js
const s = window.__shots.list.find((x) => x.env === 'town'); s.env = 'forest'; await window.renderAt(t);
window.__measure(t).tang   // { front, mid, back } mỗi số >= 1
```
Vật gắn tầng PHẢI nằm dưới `g` của env (`layersOf(g)` chỉ duyệt cây `g`; vật add thẳng vào `scene` không được tính).
Gợi ý phân loại: biển = front (phao, đá, bọt, thuyền nhỏ) / mid (tàu, nhà, đảo) / back (đường chân trời, núi xa, mây);
đất liền = front (bụi, hoa, hàng rào) / mid (nhà, cây lớn) / back (rừng xa, núi); nội thất = front (bàn, đồ nhỏ) / mid (tủ, giường)
/ back (tường, cửa sổ); tuyết = front (đá, cọc, tuyết đóng) / mid (lều, cây, tàu) / back (dãy núi tuyết, mây).

## 5. Tiêu chí L8 "ở 2 góc mặc định"
L8 (`tools/kiem/luat.mjs`, ngưỡng `tools/kiem/mac-dinh.json`): `oPhang < 0.30` (lưới 4×4, độ lệch 6) và mỗi tầng `>= 1` vật.
Hai góc mặc định để kiểm env: (a) `establish` (toàn cảnh) và (b) `closeup` hero tại địa điểm đầu của env. Cả hai khung phải đạt
**và** `__measure().tang` cả 3 tầng ≥ 1 ở khung giữa. Không sửa ngưỡng để cho qua; thêm vật vào tầng còn trống.

## 6. Ràng buộc
`suSong` hiện chỉ là nhãn khai báo (def() cảnh báo nếu tên ngoài danh sách), chưa điều khiển gì. KHÔNG đổi `e.life` của ocean.js.
Xong env nào thì gỡ tên env đó khỏi `CHUA_GAN` trong `tools/tests/boi-canh.test.mjs` (test báo lỗi nếu env đủ 3 tầng mà còn nằm trong danh sách).
Tất định: vị trí = hàm thuần của `t` và seed (`hash`); cấm `Math.random()`, giờ thực, rAF. Mỗi agent chỉ sửa file env của mình;
không đụng `engine/envs.js`, `shots.js`, `cong-thuc.js`, `gio-thoi-tiet.js`. Vật thêm phải đi kèm `ganTang`; không đổi hình ep001 ở shot env đó ngoài vật mới.
