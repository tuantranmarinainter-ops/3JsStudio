# HANDOFF – sky-extract / Sky Extract Studio

## Mục tiêu
Tool Rust (Windows) trích xuất tài nguyên Roblox: skybox, mesh (OBJ/GLB), sắp tới là ảnh/texture (mặt nhân vật).

## Đã xong (đã kiểm chứng)
- `src/lib.rs`: đọc .rbxm/.rbxl/.rbxmx/.rbxlx (rbx_binary/rbx_xml/rbx_dom_weak 4.2), tìm `Sky`, lấy 6 ID + Sun/Moon.
  rbx_dom đổi tên thuộc tính cũ khi đọc (SkyboxBk → SkyboxBackContent) → dùng danh sách alias.
- `src/mesh.rs`: decode mesh v1–v5 (rbx_mesh, chỉ feature mesh+mesh-v1), v6/v7 chunk (COREMESH v1 thô, v2 = DRACO qua draco-core 2.3.3),
  chỉ giữ LOD0 (LODS: u16 type, u8 hq, u32 n, n×u32 offset; đã khớp 40/40 với tổng số mặt), `to_obj`, `to_glb` (tự viết, đã kiểm hợp lệ),
  `scan_studio_cache` (chỉ đọc %LOCALAPPDATA%\Roblox\rbx-storage), `extract_mesh_refs` (MeshPart/SpecialMesh), `download_asset` (Open Cloud).
- `src/main.rs`: CLI `sky-extract <file>` và `sky-extract mesh <in> <out.obj|.glb>`.
- `src/bin/sky-studio.rs`: GUI egui/eframe 0.37, tab Skybox | Mesh, kéo thả, ảnh xem trước từ thumbnails.roblox.com, lưu ảnh, xuất OBJ/GLB.
- Test: 12 pass + 1 ignored (decode 466/466 mesh trong cache). `bin/` đã có exe mới nhất.
- `examples/draco_probe.rs`: mẫu giải nén DRACO.
- Tab Skybox: ô chọn từng Sky + "Chọn tất cả", nút "Lưu hàng loạt (k Sky)…" (luồng nền `run_batch`, mỗi Sky một thư mục con
  kèm ids.txt, thanh tiến độ), nút "Mở thư mục vừa tải". Build/test OK, chưa bấm thử bằng tay.

## Chưa kiểm chứng
- Tab Mesh chưa ai bấm thử bằng tay.
- Tải bằng Open Cloud key (`apis.roblox.com/asset-delivery-api/v1/assetId/{id}`, header x-api-key) chưa thử – chưa có key.
- COREMESH v1 (không nén) chỉ test bằng dữ liệu tự tạo.

## Việc còn lại
1. **Dán link → tự tải ảnh gốc** (tab Skybox):
   - Ô "Dán link hoặc ID": tự tách ID từ create.roblox.com/store/asset/ID/..., roblox.com/library/ID, rbxassetid://ID, asset/?id=ID, số trần.
   - `assetdelivery.roblox.com/v1/asset/?id=` trả **401 khi không đăng nhập** (đã thử) → tải qua Open Cloud key (`mesh::download_asset`,
     dùng chung ô key với tab Mesh). Không dùng cookie đăng nhập.
   - Xử lý nội dung tải về: ảnh → lưu; XML Decal → lấy id trong `<url>...?id=XXXX</url>` → tải lại; model (.rbxm, `<roblox!`) → đọc Sky
     bên trong (`lib.rs`) → tải đủ 6 ảnh + Sun/Moon, lưu vào thư mục con như "Lưu hàng loạt".
2. **Tab "Ảnh / Texture"** trong sky-studio:
   - Đọc .rbxm, liệt kê Decal, Texture, SurfaceAppearance (ColorMap/NormalMap/RoughnessMap/MetalnessMap – tìm tên thuộc tính thật bằng
     test round-trip như `round_trip_rbxm`, rbx_dom có thể đổi tên sang *Content), TextureID của MeshPart; xem trước qua thumbnails.
   - Nút "Quét ảnh trong cache": cache có ~74 PNG (file bọc header "RBXH", tìm chữ ký PNG `\x89PNG` để cắt ra).
   - Lưu ảnh: ưu tiên ảnh gốc (cache / API key), fallback thumbnail 420×420.
3. (Tuỳ chọn) GLB gắn texture màu (material + image trong GLB).
4. (Tuỳ chọn) Nút xuất luôn hiện (mờ) khi chưa mở file; ghi `HUONG-DAN.md`.

## Quyết định đã chốt
- Rust, GUI egui; hai exe: `sky-studio` (giao diện, windows_subsystem) và `sky-extract` (CLI).
- Không lưu API key xuống đĩa; không ghi vào thư mục Roblox.
- Không tra được cache theo asset ID (khóa là hash chưa rõ; đã thử md5/sha của ID, URL – không khớp) → duyệt cache theo thời gian.
- Tài nguyên Creator Store chỉ cấp phép dùng trong Roblox – app có ghi chú.

## Lưu ý kỹ thuật
- Dự án nằm ở `S:\SKY MESH ROBLOX STUDIO\sky-extract`; build bình thường (`target\` trong dự án) chạy tốt trên ổ S:.
- egui 0.37: `App::ui(&mut self, ui, frame)`, `egui::Panel::top/left/bottom`, `Frame::NONE`, `CornerRadius` u8, `StrokeKind`,
  `Id::unique`, dropped file `f.path()`. Gặp API lạ → grep source trong `~/.cargo/registry/src`.
- Chép exe vào `bin/` cần đóng app đang chạy trước.
