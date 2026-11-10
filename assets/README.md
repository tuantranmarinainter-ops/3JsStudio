# Asset (GLB)

## Yêu cầu asset mới (Kenney)
1. Sửa `assets/queue.txt`: mỗi dòng 1 slug trang asset, ví dụ `city-kit-suburban` (từ `https://kenney.nl/assets/<slug>`).
2. `git push` -> workflow **assets** (GitHub Actions) tải zip từ kenney.nl, lấy GLB (ưu tiên `Models/GLB format`;
   nếu chỉ có GLTF thì tự chuyển sang GLB) + `License.txt` vào `assets/kenney/<slug>/`, rồi cập nhật `assets/manifest.json`.
3. `git pull` để lấy asset về. Bộ nào có GLB tổng quá 40 MB sẽ bị bỏ qua (xem log của workflow).
Cloud của Claude không vào được kenney.nl / polyfork.dev, nên việc tải luôn chạy trên Actions.
Chạy tay: tab Actions -> assets -> Run workflow.

## manifest.json
Mảng các entry; entry không phải Kenney được giữ nguyên khi workflow tạo lại:
```json
{ "id": "city-kit-suburban/building-type-a", "src": "assets/kenney/city-kit-suburban/building-type-a.glb",
  "source": "kenney.nl/assets/city-kit-suburban", "license": "CC0", "scale": 1.0,
  "bbox": [x, y, z], "nodes": ["tên node…"] }
```
- `id` = `<slug>/<tên file không đuôi>`; `scale` chuẩn hoá về chuẩn Kenney (giữ giá trị chỉnh tay khi tạo lại).
- `bbox` = kích thước hộp bao (đơn vị model), `nodes` = tên node — dùng làm "tay cầm" khi điều khiển.

## Dùng trong engine
`engine/assets.js`: `loadManifest()`, `createAssetLib(THREE, manifest)` -> `load(ids)` (gọi lúc INIT, trước khi seek),
`instance(id, {scale})`, `scatter(id, count, area, seed, {minDist, exclude, yJitter, scale})`.
Id thiếu chỉ cảnh báo và trả Group rỗng, phim vẫn render được.

## Giấy phép
- **Kenney**: CC0, dùng thương mại tự do, không bắt buộc ghi công (nên giữ `License.txt`).
- **Polyfork**: cần người dùng thêm connector Polyfork MCP (`https://polyfork.dev/mcp`) vào Claude. File tải về nằm ở
  `assets/polyfork/` và bị `.gitignore` (không được phân phối lại `.mjs`/HD); dùng thương mại OK. Vẫn phải có dòng trong manifest.
- **GLB riêng** (`assets/special/`): kiểm tra giấy phép từng file (vd Quaternius) trước khi dùng.
