# Đầu vào quy trình: kịch bản chữ → bảng shot → ảnh tham chiếu → hình shot → kit

Đặc tả dùng chung cho các công cụ đợt 1. Sơ đồ: thẻ Quy trình của trang tổng kết; quy tắc 1/2/3 hình: `docs/de-bai-codex-mau.md`.

## Bố cục thư mục một tập

```
kich-ban/<ep>/
  kich-ban.md            người dùng đưa: mô tả bối cảnh, nhân vật, thoại (chỉ chữ)
  bang-shot.json         Claude viết (bước 1a)
  tham-chieu/nv_<id>.png Codex vẽ (bước 1b) — tờ mẫu nhân vật
  tham-chieu/bc_<id>.png Codex vẽ (bước 1b) — toàn cảnh bối cảnh
  boi-canh/<id>.json     danh sách mốc bối cảnh (khuôn: .claude/skills/xu-ly-kich-ban/khuon-boi-canh.md)
  boi-canh/<id>_tren-cao.png | <id>_ngang-mat.png   ảnh khối xám (tools/look.mjs); có thì codex-ve tự đính kèm -i
  duyet-1.json           người dùng chốt ở cổng duyệt 1 (trang duyệt ghi)
  hinh/shot_<id>_dau.png | _giua.png | _cuoi.png   Codex vẽ (bước 2)
  kit.json               Codex điền theo docs/kit.mau.json (bước 2)
  codex/                 đề bài từng cụm, log, tien-do-<cụm>.txt
```

**Quy ước bối cảnh (codex-ve `tham-chieu`):** nếu có `boi-canh/<id>.json` thì đề bài `bc_<id>` đọc file đó (phong cách, bảng màu, từng mốc, đồ lấp đầy, chừa trống, điều cấm, ánh sáng) và bắt buộc "vẽ chồng lên ảnh khối xám đính kèm, không đổi hình khối, không thêm/bớt mốc, không vẽ nhân vật". Ảnh khối xám đúng tên `boi-canh/<id>_tren-cao.png`, `boi-canh/<id>_ngang-mat.png`; file nào tồn tại thì vào `-i`. Không có file mốc → dùng `moTa` như cũ. File mốc hỏng → thoát 2.

## bang-shot.json

```json
{
  "ep": "ep004",
  "nhanVat": [{ "id": "ga", "ten": "Gà", "moTa": "gà con vàng, khối vuông, mắt to" }],
  "boiCanh": [{ "id": "tiem-banh", "ten": "Tiệm bánh", "moTa": "quầy gỗ, tủ kính, nắng sáng" }],
  "shots": [{
    "id": "s001", "boiCanh": "tiem-banh", "nhanVat": ["ga"], "dur": 1.2,
    "thoai": "Ở thị trấn này…",
    "camera": { "loai": "zoomIn", "gocMay": "ngang-mat", "coKhung": ["trung", "can"] },
    "hinh": 2,
    "dau": "Gà đứng ở cửa, nhìn vào quầy", "cuoi": "Gà sát quầy, mắt mở to",
    "hanhDong": "Gà bước 3 bước tới quầy rồi dừng"
  }]
}
```

Quy tắc (bộ kiểm phải bắt):
- `id` shot dạng `s001`, `s012a`; không trùng; `boiCanh` và mọi `nhanVat` phải có trong danh sách; `id` nhân vật/bối cảnh là chữ thường không dấu, gạch nối.
- `dur` số > 0. `thoai` có thể rỗng.
- `camera.loai` ∈ `zoomIn | zoomOut | lia | theo | dung | doiHuong`; `gocMay` ∈ `ngang-mat | tren-xuong | duoi-len | qua-vai`;
  `coKhung` là mảng 2 phần tử ∈ `toan | trung | can | dac-ta`.
- `hinh` ∈ 1, 2, 3. `hinh:1` cần `dau`; `hinh:2` cần `dau`, `cuoi`; `hinh:3` cần `dau`, `giua`, `cuoi`. `hanhDong` bắt buộc khi `hinh` ≥ 2.
- `camera.loai: "dung"` chỉ đi với `hinh: 1`; `doiHuong` chỉ đi với `hinh: 3`.
- Cảnh báo (không phải lỗi): shot `hinh:3` quá 20% tổng số shot; shot 1 nhân vật mà `loai` là `zoomOut`; shot ≥ 2 nhân vật mà `loai` là `zoomIn`.

## kit.json (theo docs/kit.mau.json)

```json
{
  "ep": "ep004", "donVi": "stud",
  "nhanVat": [{ "id": "ga", "cao": 2.6, "mau": ["#f5c542"] }],
  "boiCanh": [{ "id": "tiem-banh", "rong": 24, "sau": 18, "cao": 10, "anhSang": { "kieu": "ngay", "luma": 125 },
                "diemDung": { "cua": [0, 0, 8], "quay": [0, 0, -3] } }],
  "shots": [{
    "id": "s001",
    "may": { "dau": { "p": [0, 3, 12], "nhin": [0, 2.2, 0], "fov": 40 }, "cuoi": { "p": [0, 2.6, 5], "nhin": [0, 2.4, -2], "fov": 40 } },
    "nhanVat": [{ "id": "ga", "dau": [0, 0, 8], "cuoi": [0, 0, -2], "huong": 180 }],
    "tinCay": "cao"
  }]
}
```

Gốc toạ độ ở **tâm sàn bối cảnh** (|x| ≤ `rong`/2, |z| ≤ `sau`/2, y = 0 là sàn). Shot `hinh: 1` chỉ có file `_dau`.

Quy tắc: mọi shot của bảng shot phải có trong kit; `may.dau` bắt buộc, `may.cuoi` bắt buộc khi `hinh` ≥ 2 (và `may.giua` khi `hinh: 3`);
mỗi nhân vật của shot có toạ độ `dau` (và `cuoi` khi `hinh` ≥ 2; `giua` tuỳ chọn khi `hinh: 3` — vị trí ở khung giữa, y > 0 = đang ở trên không); `cao` nhân vật trong 1–8 stud; `fov` 15–90; `p[1]` (độ cao máy) > 0 và < `cao` bối cảnh;
toạ độ nhân vật nằm trong `rong`×`sau` của bối cảnh; `luma` 85–150; `tinCay` ∈ `cao | vua | thap` (`thap` là cảnh báo; quá 20% shot `thap` là lỗi);
shot `hinh` ≥ 2 mà `may.dau` giống hệt `may.cuoi` và nhân vật không đổi chỗ → lỗi "không có chuyển động"; đủ file hình trong `hinh/` theo `hinh`;
chuỗi có ký tự `�` hoặc `?` nằm giữa chữ cái tiếng Việt → lỗi hỏng dấu.

## Công cụ (đợt 1)

| Lệnh | Việc | Mã thoát |
|---|---|---|
| `node tools/kiem-bang-shot.mjs kich-ban/<ep>` | kiểm bang-shot.json | 0 đạt · 1 có lỗi |
| `node tools/kiem-kit.mjs kich-ban/<ep>` | kiểm kit.json + file hình so với bảng shot | 0 đạt · 1 có lỗi |
| `node tools/codex-ve.mjs <tham-chieu\|shot> kich-ban/<ep> [--thu] [--tran 6]` | soạn đề bài theo cụm, chạy Codex song song | 0 đủ hình · 1 còn thiếu |
| `node tools/duyet-bang-shot.mjs kich-ban/<ep> [mo]` | trang duyệt cổng 1 → `duyet-1.json` | — |

Bộ mẫu để test: `tools/tests/fixtures/dau-vao-mau/` (bang-shot.json 6 shot = 12 hình, kit.json đạt). Test: `node --test tools/tests/kiem-bang-shot.test.mjs tools/tests/kiem-kit.test.mjs tools/tests/codex-ve.test.mjs tools/tests/duyet-bang-shot.test.mjs` (57 test, dùng Codex giả `tools/tests/fixtures/codex-gia.mjs`).

**Chưa kiểm thật:** gọi `codex` thật trên Windows (trích dẫn lệnh, `gpt-6-luna` có vẽ được hình không); trang duyệt chưa được xem bằng mắt.

## Shot 3 hình → điểm giữa của engine
`tools/kit-shots.mjs` đổi shot `hinh: 3` thành shot có ĐIỂM GIỮA (`docs/core.md` mục "Điểm giữa của shot"): `may.giua` → `cam.pm` / `cam.lm` / `cam.fovm`;
`nhanVat[].giua` → `cast.<tên>.atm` (nhân vật đứng tại chỗ mà có `giua`, vd. nhảy lên rồi rơi, được thêm `ease: 'linear'` để ra quỹ đạo ném).
Máy và nhân vật đi theo đường cong mượt đầu → giữa → cuối; `camera.loai: "doiHuong"` dùng chính điểm giữa này, không có loại shot riêng.
Không còn ghi chú `CẦN SỬA TAY: có khung giữa`; chỉ còn khi `hinh: 3` mà kit thiếu `may.giua`.
`tools/kiem-chuyen-dong.mjs --kit …` so thêm mẫu GIỮA shot với `may.giua` và `nhanVat[].giua` (ngưỡng như đầu/cuối) → lỗi `LỆCH KIT (giữa): …`.
Chưa có: hướng thân ở khung giữa trong kit (engine có `cast.<tên>.rym`, ghi tay), `tm` khác 0,5 trong kit, động tác (anim) riêng cho cú nhảy.

## Đổi toạ độ

Toạ độ trong kit tính theo **tâm sàn bối cảnh** của kit; shots.js và trang tập dùng toạ độ **thế giới** của bối cảnh engine. Hai công cụ `tools/kit-shots.mjs` (`--goc`) và `tools/kiem-chuyen-dong.mjs` (`--goc`) cùng dùng MỘT hàm đổi: `tools/kit-toa-do.mjs` (`doiDiem`, `doiHuongRad`, `chonGoc`).

File `goc.json`: `{ "<boiCanh của kit>": { "goc": [x,y,z], "xoay": độ, "env": "<tên env engine>" } }` (`env` chỉ kit-shots dùng, để ghi `env` của shot; mặc định = tên bối cảnh kit). Có thể ghi phẳng `{ "goc": …, "xoay": … }` để dùng chung mọi bối cảnh.

Quy ước: **xoay trước, dịch sau**. Xoay quanh trục Y, `xoay` dương = từ +Z quay về +X (cùng chiều engine: nhân vật quay θ thì mặt +Z thành (sinθ, cosθ)):
`x' = gx + x·cosθ + z·sinθ` · `y' = gy + y` · `z' = gz − x·sinθ + z·cosθ`. Hướng nhân vật: `ry = (huong + xoay)` độ → rad. Ví dụ `xoay: 90`: +Z kit → +X thế giới, +X kit → −Z thế giới.

Tập thử `episodes/_mau-kit/` (6 shot, `shop-in` + `e3-pho`, Gà + `ba-ban-banh`): `node tools/kit-shots.mjs tools/tests/fixtures/dau-vao-mau --goc episodes/_mau-kit/goc.json --ra episodes/_mau-kit/shots.js` rồi
`node tools/kiem-chuyen-dong.mjs episodes/_mau-kit/index.html --kit tools/tests/fixtures/dau-vao-mau --goc episodes/_mau-kit/goc.json`.
