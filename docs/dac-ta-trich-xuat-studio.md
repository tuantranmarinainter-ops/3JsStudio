# Đặc tả: Trích xuất place Roblox Studio → kho chung → .3js → khung 🧊 3D

Ngày: 2026-11-17 · Người duyệt: người dùng (phiên điều phối) · Mượn cách của nocodehack (Apache-2.0, ghi công ở NOTICE đã có).

## 1. Mục tiêu
Người dùng TỰ dựng thành phố và mọi bối cảnh trong Roblox Studio. Sau đó một lệnh rút cả place:
- mọi tài sản (model) → GLB → **kho chung** (`dist/STUDIO RIENG/kho-chung.3js`, theo sha256);
- bố cục từng bối cảnh → **file `.3js`** (`kind:'boi-canh'`);
- studio (`dist/studio.html`) mở `.3js` đó trong **khung 🧊 3D** để xem và sửa (dời/xoay/cỡ/xoá/nhân bản), rồi **lưu lại** `.3js`.

## 2. Quyết định đã chốt
- **Đơn vị tài sản = mỗi model một GLB** (nhà, cây, đèn…), không gộp cả bối cảnh thành 1 GLB. Model trùng (cùng nội dung) chỉ lưu 1 lần.
- Quy ước trong place: mỗi bối cảnh là một **Folder/Model con trực tiếp của `workspace.BoiCanh`** (vd `BoiCanh.Pho`, `BoiCanh.Phong`).
  Con trực tiếp của bối cảnh = 1 tài sản. Part rời (không nằm trong Model) gom theo bối cảnh thành tài sản `<boi-canh>__le`.
  Không có `workspace.BoiCanh` thì báo lỗi rõ và gợi ý cách đặt — không đoán.
- Đổi GLB **dùng lại luồng sẵn có** `tools/blender/roblox_ghep.py` (giữ trục Roblox, 1 stud = 1 đơn vị, vân Poly Haven theo vật liệu,
  Neon → emissive, Glass → trong suốt, `--khong-van`). KHÔNG viết bộ đổi lưới thứ hai.
- Lưới/ảnh: ưu tiên đường tải hiện có của `tools/roblox.mjs` (cache `.cache/roblox/`). Món bị từ chối (401/403) mới dùng **đường cache Studio**
  (mục 4 bước 2). Không đụng cookie đăng nhập.
- Không lưu/không publish place. Không sửa logic `tools/voice_studio/`. Mọi tính năng mới bật/tắt được.

## 3. Lệnh (tool mới `tools/trich-studio.mjs`)
| Lệnh | Việc |
|---|---|
| `node tools/trich-studio.mjs phuc-vu [--cong 8767]` | máy chủ cục bộ nhận dữ liệu Studio gửi về (POST) + phục vụ file Luau |
| (Claude, MCP `execute_luau`) `loadstring(HttpService:GetAsync(U.."quet.lua"))()(U, {lo=60})` | quét `workspace.BoiCanh`, gửi về từng lô |
| `node tools/trich-studio.mjs cache` | ghép lưới/ảnh bị từ chối từ cache Studio theo khung thời gian |
| `node tools/trich-studio.mjs glb [--chi pho,phong] [--khong-van]` | mỗi tài sản → `assets/nhap/rb-<place>/<boi-canh>/<ten>.glb` + dòng manifest + CREDITS |
| `node tools/trich-studio.mjs goi [--chi …]` | `scene.json` mỗi bối cảnh → `dist/STUDIO RIENG/<place>-<boi-canh>.3js`; gọi `kho-chung.mjs` gom GLB |
| `node tools/trich-studio.mjs tat-ca` | phuc-vu đã chạy → cache → glb → goi; in đường dẫn + link `file:///` |
| `node tools/trich-studio.mjs kiem <boi-canh>` | so bằng số vị trí từng tài sản: Studio vs `.3js` (mục 6) |

Dữ liệu trung gian: `output/trich-studio/<place>/` (quet/*.json, cache/, bao-cao.md). Không vào git.

## 4. Các bước kỹ thuật
1. **Quét (Luau, `tools/trich-studio-quet.lua`)**: mỗi tài sản ghi `{boiCanh, ten, duongDan, assetId?, pivot CFrame, size, parts:[…]}`.
   Mỗi part: ClassName, Shape, Size, CFrame, Color, Material, Transparency, Reflectance, MeshId, TextureID, SpecialMesh (MeshId, TextureId,
   Scale, Offset), Decal/Texture (mặt, ảnh, StudsPerTile), SurfaceAppearance (các map). Định dạng part **giống `parts` trong
   `.cache/roblox/<id>/dump.json`** để `roblox_ghep.py` ăn được nguyên. Gửi về bằng `HttpService:PostAsync`, lô ≤ 60 tài sản, `task.wait()`
   giữa lô (execute_luau chạy lâu dễ rớt kết nối). Union: thử đọc; không đọc được thì khối bao + cảnh báo (như nocodehack).
2. **Cache Studio (chỉ cho món bị từ chối)**: Luau `ContentProvider:PreloadAsync` từng MeshId/TextureId một, ghi `t0/t1`;
   Node đọc `%LOCALAPPDATA%/Roblox/rbx-storage` (+ `rbx-storage.db` nếu có), ghép file theo khung thời gian. Tham khảo cách làm:
   `output/_tmp/nocodehack/skills/roblox-engine/engine/tools/hair_studio.py`, `rbx_set_meshes.luau` (chỉ đọc, viết lại bằng Node).
3. **GLB**: mỗi tài sản dời về gốc riêng (tâm XZ, đáy y = 0), ghi pivot gốc vào scene.json. Nén bằng `tools/nen-model.mjs`.
   Trùng: băm nội dung GLB; trùng thì dùng lại file cũ. Manifest: `source: "Roblox Studio place <tên>"`, assetId gốc nếu có, ghi công tác giả nếu đọc được.
4. **Gói `.3js` bối cảnh**: định dạng như gói tập (`"3JS1"` + u32 + header JSON + dữ liệu), header
   `{ v:2, kind:'boi-canh', place, boiCanh, built, scene:{ items:[{id, ten, glb:'/assets/…', pos, quat, scale}] , troi?, anhSang? },
   refs:{ '/assets/…': [kiểu, sha256, độ dài] } }`. Asset nằm ở kho chung, gói chỉ chứa scene.
5. **Studio**: `tools/studio-loader.js` + `tools/bundle-studio.mjs` nhận `kind:'boi-canh'` → dựng một env tạm từ kho (IndexedDB) →
   bật khung 🧊 3D (`engine/che-do-3d.js` + `engine/che-do-3d-sua.js` đã có Dời/Xoay/Cỡ/Xoá/Nhân bản/Hoàn tác).
   **Thêm**: nút **💾 Lưu bối cảnh** ghi lại `scene.items` mới ra file `.3js` (tải xuống, cùng tên + `-sua`), ô bật/tắt "Bối cảnh Roblox".
   Với `kind:'boi-canh'` thay đổi được LƯU (khác chế độ góp ý của tập, nơi sửa chỉ là thử).

## 5. Thứ tự làm (mỗi bước có test, commit sau mỗi bước pass)
1. Định dạng `scene.json` + gói `.3js` boi-canh + test đọc/ghi (Node, không cần Studio).
2. Luau quét + máy chủ + test bằng place thật (`Sky.rbxl`, bối cảnh có sẵn `workspace.BoiCanh_ep6B` → tạm cho phép `--goc BoiCanh_ep6B`).
3. Đường GLB qua `roblox_ghep.py` + kho chung.
4. Đường cache Studio cho món bị từ chối.
5. Studio mở / sửa / lưu `.3js` boi-canh.
6. `docs/roblox.md` thêm mục 9 (cách dùng, lỗi đã gặp); `CLAUDE.md` thêm 1 dòng bảng công cụ.

## 6. Đạt khi
- `node --test tools/tests/trich-studio.test.mjs` pass (gói, scene, trùng, đổi toạ độ, gói đọc lại được).
- Trên `Sky.rbxl`: rút được **ít nhất 1 bối cảnh thật** (phố) → mọi tài sản có GLB trong kho chung; `kiem` báo lệch vị trí **≤ 0,01 stud**,
  góc ≤ 0,1° cho mọi tài sản (so pivot Studio vs scene.json sau khi dựng trong trang).
- Studio mở `.3js` đó, khung 🧊 3D hiện đúng; dời 1 tài sản → 💾 Lưu → mở lại file thấy vị trí mới (test tự động bằng Chrome ẩn).
- Chụp `look.mjs` (hoặc ảnh khung 3D) Studio vs three.js của bối cảnh đó; nhìn bằng mắt giao agent phụ Haiku, chỉ trả chữ.
- Cả bộ test liên quan pass; `npm test` không thêm lỗi mới so với trước (đã có 5 lỗi cũ: asset-plan ×3 do r15.js dở, measure, sfx-shot-list, shottypes).

## 7. Dừng khi
- Xong mục 5 bước 1–6 với bối cảnh mẫu, ghi `docs/handoff/trich-xuat-studio.md` (khối ĐIỂM DỪNG) + `output/trich-studio/bao-cao.md`, commit trên nhánh riêng, báo phiên điều phối.
- KHÔNG rút cả thành phố của người dùng khi chưa được duyệt. KHÔNG push, KHÔNG gộp vào ep1-v2.
- Bế tắc một bước sau 3 cách: dừng, ghi vào báo cáo, báo lại.

## 8. Tham khảo
- `docs/roblox.md` (đọc TRƯỚC), mục 4 (trục, Neon/Glass, vân), mục 8 (đưa bối cảnh three.js sang Studio, máy chủ cổng 8765).
- `tools/roblox.mjs` (dump.json, gọi `roblox_ghep.py`), `tools/roblox-boi-canh.mjs/.lua` (mẫu máy chủ + loadstring), `tools/tach-canh-roblox.mjs`.
- `tools/kho-chung.mjs`, `tools/goi-tap.mjs`, `tools/studio-loader.js`, `tools/bundle-studio.mjs`, `engine/che-do-3d*.js`, `docs/handoff/tach-studio.md`.
- nocodehack (chỉ đọc): `output/_tmp/nocodehack/skills/roblox-engine/engine/tools/` — `rbx_set_export.luau`, `rbx_set_meshes.luau`,
  `rbx_set_import.py`, `hair_studio.py`, `anim_sink.py`, `fetch_library.py`.
