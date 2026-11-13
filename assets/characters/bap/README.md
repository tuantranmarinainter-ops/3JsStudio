# Gấu Bắp (Mister Bear đã chuẩn hoá) — tập 2

Nguồn: "Mister Bear" by cheb_max, https://sketchfab.com/3d-models/mister-bear-47e7ee6daff54b018dcd55caaec755f0, **CC BY 4.0**
(ghi công bắt buộc khi đăng video; đã có trong `assets/characters/CREDITS.md`). Bản sửa đổi: bỏ mũ (GIỮ khăn cổ + cà vạt gốc, đổi màu — người dùng chê nơ tự dựng 2026-11-13), bỏ shape key, đặt lại rest pose, đổi màu lông.

## Tệp
| Tệp | Màu lông | Nơ | Tam giác | Ghi chú |
|---|---|---|---|---|
| `bap.glb` | nâu mật #a8692a | xanh #2e86de | 4342 | Bắp |
| `bap2.glb` | kem #ecd9b0 | đỏ #d63031 | 4342 | gấu đi trộm 1 |
| `bap3.glb` | nâu sẫm #5a3a24 | vàng #f1c40f | 4342 | gấu đi trộm 2 |
| `bap_co_mu_khan.glb` | như bap | xanh | 4708 | còn mũ chóp + khăn đỏ (tuỳ chọn) |
Mỗi tệp ~1.2 MB (lưới chưa hàn đỉnh: 12.7k đỉnh), 1 ảnh màu 512 px, 2 vật liệu (lông, nơ). Cao 2.6 stud, chân y=0, mặt nhìn +Z, tâm x/z ở giữa hộp bao.

## Xương (20, đã đổi tên bởi three: dấu `.` bị bỏ)
`_rootJoint > root_00 > base_01` (thân) → `head_02` (đầu; con: `eye-r_03`, `eye-l_04`, mỗi mắt có `*_end`),
`arm-r_09 > arm-r001_010` (vai, cẳng tay phải; phải ở -X), `arm-l_011 > arm-l001_012`, `leg-r_05 > leg-r001_06`, `leg-l_07 > leg-l001_08` (+ các xương `*_end_*` cụt).
Không có xương cổ riêng → nơ gắn `head_02`; không có xương tai (tai theo đầu); không có xương đuôi, không có xương ngón.

## Animation (24 fps, tên giữ nguyên)
`idly` (tư thế đứng tĩnh, 1 khung), `sleep` (cũng tĩnh = idly vì bản gốc chỉ dùng shape key đã bỏ), `run` 0.833 s, `bear_slide` 0.833 s, `die` 0.833 s, `start_dance` 0.833 s.

## Cách tạo lại
```
node tools/nhap-model.mjs tai sketchfab:47e7ee6daff54b018dcd55caaec755f0        # → .cache/nhap-model/sketchfab-47e7…/model.glb
"<Blender 5.1.2>" -b --factory-startup -t 4 -P tools/blender/nhap_rig.py -- <model.glb> --ra assets/characters/bap/bap.glb --cao 2.6 --cat-mu 1 --mau-pk "#2e86de" --long "#a8692a"
```
`--cat-mu 1` = trong mesh "1" xoá các mảnh rời ở cao hơn 72% (mũ), giữ khăn cổ; `--mau-pk` = màu khăn. KHÔNG dùng `--no` (nơ tự dựng, đè lên cằm). `--bo 1` = bỏ mesh "1" (mũ + khăn, 366 tam giác, 1 vật liệu đỏ); bỏ `--bo` để giữ. bap2: `--long "#ecd9b0" --no "#d63031"`, bap3: `--long "#5a3a24" --no "#f1c40f"`.

## Bẫy đã gặp (vì sao nhap_rig.py làm thêm các bước)
- Model gốc có shape key `target_0` lệch tới ~50 đơn vị và animation nội suy 0→1 → lưới "nổ" sau vài khung. Đã bỏ shape key.
- Rest pose của xương KHÔNG khớp lưới (chỉ đúng khi một action chạy). `nhap_rig.py` nướng tư thế `idly` khung 0 làm rest rồi lấy mẫu lại mọi action.
- Armature gốc scale 1.288 (FBX) → key vị trí được nhân đúng hệ số thật, không phải hệ số `--cao`.
- Chưa xoay animation khi dùng `--xoay` (gấu gốc đã nhìn +Z nên không cần).
