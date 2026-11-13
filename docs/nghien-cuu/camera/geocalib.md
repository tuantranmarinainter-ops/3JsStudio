# GeoCalib (cvg/GeoCalib, ECCV 2024) — nghiên cứu chỉ đọc, 2026-11-13
Nguồn: README https://raw.githubusercontent.com/cvg/GeoCalib/main/README.md ; mã trong `geocalib/` (extractor.py, camera.py, gravity.py, geocalib.py); issue #44, #36. Chưa cài, chưa chạy.

## 1. Đầu ra của model.calibrate(image)
- Từ geocalib/extractor.py: dict gồm `camera`, `gravity`, `covariance`, các trường chứa "field" (latitude_field, up_field), "confidence" (up_confidence, latitude_confidence), "uncertainty" (focal_uncertainty). README chỉ in `camera` và `gravity`, không ghi đơn vị.
- `camera` (camera.py): tensor (w, h, fx, fy, cx, cy, *méo). `.f` = (fx, fy) tính bằng PIXEL; `.vfov` = "Vertical field of view in radians" (tính từ fy và chiều cao ảnh); `.hfov` radian. Điểm chính (cx, cy) cố định ở tâm ảnh.
- `gravity` (gravity.py): vector 3D trong hệ camera; `.pitch` = asin(z), `.roll` suy từ x,y; from_rp dựng vec = (-sin r cos p, -cos r cos p, sin p). Đơn vị radian là SUY LUẬN từ torch.sin/asin (mã không ghi). Quy ước dấu: không có chú thích -> "không tìm thấy"; phải tự kiểm bằng ảnh có nghiêng biết trước.
- Độ bất định: có (`focal_uncertainty`, `covariance`, bản đồ confidence). Cách đọc/đơn vị focal_uncertainty: không tìm thấy tài liệu (extractor chỉ nhân lại theo tỉ lệ ảnh gốc). Paper nói bất định dùng để "flag failure cases".

## 2. Yêu cầu chạy
- Python >= 3.9. Phiên bản PyTorch: README không nêu. Cài: `pip install -e .` hoặc `pip install -e "git+https://github.com/cvg/GeoCalib#egg=geocalib"`.
- GPU không bắt buộc: README tự chọn `cuda if available else cpu`. Ảnh được resize về cạnh dài 320 (extractor.py) nên suy luận nhẹ; tốc độ CPU cụ thể: không tìm thấy số đo. (GPU 2x4090 chỉ để huấn luyện.)
- Trọng số: tự tải từ https://github.com/cvg/GeoCalib/releases/download/v1.0/geocalib-{pinhole|distorted}.tar về cache torch.hub (`torch.hub.get_dir()/geocalib`). Dung lượng: không tìm thấy.
- Windows: không thấy tài liệu nói rõ; không có lý do riêng (Python thuần + PyTorch) nhưng "không tìm thấy" bằng chứng.

## 3. Giấy phép
- Mã: Apache-2.0, Copyright 2024 ETH Zurich (LICENSE).
- Trọng số: CC BY 4.0 (README) -> dùng thương mại được, cần ghi công. Issue #44 (10/2026): collaborator veichta xác nhận CC BY 4.0 cho phép dùng thương mại/phân phối lại kèm ghi công; hứa thêm file LICENSE-WEIGHTS (chưa thấy đã thêm; issue còn mở). Đây là lời maintainer, không phải tư vấn pháp lý. Với video ta chỉ dùng số đo ra, rủi ro thấp.

## 4. Dữ liệu huấn luyện và thất bại đã biết
- OpenPano: ~2,8k ảnh toàn cảnh thật (HDRMAPS, PolyHaven, Laval Indoor HDR), cân bằng trong nhà/ngoài trời; sinh ~37k ảnh phối cảnh. Benchmark: LaMAR, MegaDepth, TartanAir (TartanAir là mô phỏng/render, nhưng là cảnh thật-giả cả cảnh, không phải hoạt hình), Stanford2D3D.
- Ảnh hoạt hình / đồ chơi khối / cận cảnh nhân vật / không đường chân trời: KHÔNG tìm thấy bằng chứng nào trong README, paper (abstract), 24 issue đầu đã đọc. Không có mục "limitations" nào nêu loại này.
- Khoảng vfov huấn luyện 20°–105° (issue #36, người dùng hỏi, maintainer chưa trả lời; người hỏi nói thử ống 28–200mm cho kết quả đáng ngờ, chỉ có ảnh). Ngoài khoảng này có thể sai. Camera.update_focal kẹp vfov trong 5°–150°.
- Issue #32 "Cholesky decomposition failed", #42 "Reached maximum number of steps without convergence": có thể gặp khi ảnh khó (chưa đọc nội dung). Phần 2 của danh sách issue (>24 trang) chưa đọc hết.

## 5. Ảnh dọc 9:16 và ảnh crop
- Mô hình giả định điểm chính ở tâm ảnh, không tối ưu (README). Ảnh crop lệch tâm sẽ gây sai số focal; không có tài liệu đo mức ảnh hưởng. Ảnh dọc không bị cấm: calibrate nhận (C,H,W) tuỳ kích thước, resize cạnh dài 320, cạnh chia hết 32. vfov tính theo fy và chiều cao ảnh nên với ảnh dọc vfov là góc dọc (đúng thứ ta cần), nhưng độ chính xác trên ảnh dọc chưa có số liệu.

## 6. Prior
- Có: `model.calibrate(image, priors={"focal": t})`, `priors={"gravity": t}`. Focal prior tính bằng PIXEL của ảnh gốc (extractor nhân với scale). Ta phải đổi: fy_px = (H/2)/tan(vfov/2); vfov từ mm: cần cỡ cảm biến ảnh (ví dụ full-frame 36x24 mm; ảnh dọc -> dùng cạnh 36). Gravity prior: định dạng không được ghi (có vẻ vector 3D); không tìm thấy. Cũng có `camera_model` (pinhole, simple_radial, radial, simple_divisional) và chế độ nhiều ảnh `shared_intrinsics=True`.

## 7. Đoạn Python (CHƯA chạy thử, dựa API README)
```python
import torch, math, pathlib
from geocalib import GeoCalib
dev = "cuda" if torch.cuda.is_available() else "cpu"
model = GeoCalib().to(dev)
for p in sorted(pathlib.Path(r"S:\3JS Studio\kich-ban\ep003-goi\shots").glob("*.jpg")):
    img = model.load_image(p).to(dev)            # [C,H,W] trong [0,1]
    r = model.calibrate(img)                       # priors={"focal": ...} nếu biết mm
    cam, g = r["camera"], r["gravity"]
    vfov = math.degrees(cam.vfov.item())
    pitch = math.degrees(g.pitch.item()); roll = math.degrees(g.roll.item())
    print(p.name, f"vfov={vfov:.1f} pitch={pitch:.1f} roll={roll:.1f}")
```
(`.item()` giả định batch 1; dấu pitch/roll phải hiệu chỉnh trước khi tin.)

## 8. Phương án thay thế (README chỉ so sánh, ta chưa đọc kỹ)
- DeepCalib: CNN hồi quy trực tiếp focal+méo, kém GeoCalib trong bảng README.
- ParamNet / ParamNet (OpenPano): hồi quy thông số camera, kém hơn trong mọi bảng README.
- UVP (VP-Estimation-with-Prior-Gravity): cần đường thẳng/điểm triệt tiêu, vfov AUC LaMAR 15.6/30.6/43.5 vs GeoCalib 19.1/41.5/60.0 (@1/5/10°).
- Perspective Fields: dự đoán trường vĩ độ + trường "up" (nền của GeoCalib), xuất pitch/roll/vfov; README so sánh với bản huấn luyện lại. MSCC: không có trong README/issue đã đọc (không tìm thấy).

## Nhận định: DÙNG ĐƯỢC CÓ ĐIỀU KIỆN
Giấy phép ổn (Apache-2.0 + CC BY 4.0), chạy được trên CPU, có sẵn prior focal và độ bất định để lọc. Nhưng không có bằng chứng nào về ảnh đồ chơi khối/render; vì vậy phải thử trên ~10 khung (S014, S020, S044…) có đáp án biết trước (kịch bản ghi mm) rồi mới chạy cả 104.
Rủi ro lớn nhất: ảnh cận cảnh/không đường chân trời/ít đường thẳng đứng làm pitch và vfov sai âm thầm (mô hình học từ ảnh thật), cộng ảnh crop làm lệch tâm quang học; dấu pitch/roll không được tài liệu hoá nên phải tự hiệu chỉnh. Khi bất định cao hoặc vfov ngoài 20°–105° thì nên dùng tiêu cự trong kịch bản làm prior hoặc bỏ kết quả.
