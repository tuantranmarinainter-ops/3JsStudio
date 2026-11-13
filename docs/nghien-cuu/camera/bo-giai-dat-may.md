# Bộ giải đặt máy: nghiên cứu nguồn mở (chỉ đọc, 2026-11-13)

Quy ước: "[đọc]" = lấy từ mã/trang đã đọc qua WebFetch (WebFetch tóm tắt, không có số dòng gốc nên dẫn theo tên lớp/hàm);
"[tự suy]" = tôi tự suy từ hình học, chưa có nguồn nào xác nhận; "không tìm thấy" = không truy cập được.
Bài báo Toric (cinematography.inria.fr/.../toric-space-tog-final.pdf, hal.science) bị chặn bot / quá thời gian: CHƯA đọc được bản gốc.

## 1. Unity-ViewpointComputation (github.com/robertoranon, Apache-2.0)
Tệp: Assets/Scripts/ViewpointComputation/{CLProperty,CLSolver,CLTarget,CLViewpoint,CLCameraMan,CLUtils}.cs [đọc 4 tệp đầu].
Mỗi thuộc tính: value (đo) -> spline tuyến tính từng khúc (CLLinearSplineSatFunction) -> [0,1], nhân inScreenRatio (phần chủ thể còn trong khung).
Gộp: CLTradeOffSatisfaction = tổng có trọng số (chuẩn hoá tổng = 1), cắt sớm khi không thể đạt ngưỡng.
| Lớp (CLProperty.cs) | Đo cái gì |
|---|---|
| CLSizeProperty | AREA / WIDTH / HEIGHT của AABB chiếu lên màn hình (0..1); 2 chủ thể thì tỉ số hai cỡ |
| CLOcclusionProperty (cost 20) | tỉ lệ tia bị chặn (xem mục 6) |
| CLOrientationProperty | góc nhìn: HORIZONTAL (góc quanh trục lên của chủ thể so với mặt trước), VERTICAL, VERTICAL_WORLD; v = norm(cam - tâm) |
| CLTargetPositionProperty | khoảng cách tâm chiếu tới điểm viewport mong muốn |
| CLFramingProperty | phần chủ thể nằm trong một hình chữ nhật |
| CLRelativePositionProperty | LEFT/RIGHT/ABOVE/BELOW: phần chủ thể A nằm bên trái/phải/... AABB màn hình của B (đúng cho "qua vai") |
| CLCameraFOVProperty, ...DistanceProperty, ...AbovePlaneProperty, ...OrientationProperty, ...SeesPointProperty | ràng buộc trực tiếp lên máy (fov, khoảng cách, trên mặt phẳng, góc quay, thấy 1 điểm) |
Cỡ chiếu: chiếu 1-7 đỉnh nhìn thấy của AABB 3D (CLTarget.Render, bảng tra theo vị trí máy so với 6 mặt hộp), cắt theo viewport, screenArea = diện tích đa giác.
Bộ giải (CLSolver.cs, PSOSolver): ứng viên 8 chiều (vị trí 3, điểm nhìn 3, roll, fov). Bộ nhớ cấp 300 ứng viên (số thật do SetSolverParameters);
tối đa 3000 vòng hoặc hết thời gian hoặc đạt ngưỡng; khởi tạo: randomPart=0.3 ngẫu nhiên, 70% còn lại "thông minh" theo từng chủ thể
(CLSizeProperty.GenerateRandomSatisfyingPosition: chọn khoảng cách từ spline cỡ, hướng ngẫu nhiên, thử tối đa 30 lần);
cập nhật v = w*v + c1*r1*(pbest-x) + c2*r2*(gbest-x); ngoài không gian tìm kiếm bị phạt -2. c1, c2, w: không tìm thấy giá trị mặc định trong CLSolver.cs (nằm ở VCTesting.cs, chưa đọc).
KHÔNG tất định: `new System.Random()` không hạt giống; còn kết thúc theo đồng hồ thực.
Giá trị: đáng mượn = ý "đặc tả thuộc tính -> điểm [0,1]" cho bước CHẤM/KIỂM (cỡ, vị trí khung, che khuất, còn trong khung) và công thức chiếu AABB.
Thừa: PSO, spline, đồng hồ, quần thể ngẫu nhiên (ta cần nghiệm đóng, tất định).

## 2. Một chủ thể: công thức đóng [tự suy; hình học chuẩn, cùng dạng camera-controls mục 4]
Vào: T = điểm neo (ví dụ mặt), h = chiều cao đoạn thân cần vào khung, s = phần chiều cao khung đoạn đó chiếm (0..1),
yaw ψ (0 = nhìn thẳng mặt, + = sang phải chủ thể), pitch φ (+ = máy cao hơn), fovV, aspect = 9/16, (x,y) = vị trí T trên khung theo NDC (x phải, y lên, ∈[-1,1]; "30% từ trái" -> x = 2*0.30-1).
```
tV = tan(fovV/2);  tH = tV*aspect
Z  = h / (2*s*tV)                      // độ sâu dọc trục nhìn; nếu pitch lớn: Z = h*cos(φ)/(2*s*tV)
F  = hướng mặt (thế giới); R = norm(cross(up,F))   // R = bên phải CỦA chủ thể nhìn từ phía trước
dir = cos(φ)*(cos(ψ)*F + sin(ψ)*R) + sin(φ)*up
p   = T + dir * Z                       // (khác Z/cos(độ lệch) < 1% khi |x|,|y| < 0.5)
// dịch điểm nhìn để T lệch tâm khung: lặp 2 lần
L = T
repeat 2:
  c = norm(L - p);  r = norm(cross(c, up));  u = cross(r, c)
  zc = dot(T - p, c)                    // độ sâu thực của T theo trục nhìn
  L = T - zc*(x*tH*r + y*tV*u)          // điểm trên trục cách máy zc: T hiện đúng ở (x,y)
return {p, l: L, fov: fovV}
```
Kiểm: sau vòng 2 chiếu T ra NDC phải lệch < 1e-3. Pitch ±90° phá `cross(c,up)`: giới hạn |φ| < 80°.

## 3. Hai chủ thể
### 3a. Toric space (Lino & Christie, SIGGRAPH 2015)
Thấy được từ trang tác giả [đọc]: biểu diễn máy bằng (α, θ, φ); cặp chủ thể -> mặt "toric" (spindle torus) mà mọi điểm cho cùng góc α giữa hai chủ thể
nhìn từ máy; giảm 7 bậc tự do xuống 3 (hai chủ thể + vị trí màn hình cho trước). Công thức (3) của khảo sát arXiv 2506.00974 §2.3.3 [đọc]: C = A + (q_φ·q_θ·AB)·sin(α+θ/2) (bản trích có thể mất mẫu số).
Bài gốc không đọc được nên phần dưới là [tự suy], khớp dạng trên:
```
// A,B = vị trí thế giới (đã đặt điểm neo), (xA,yA),(xB,yB) = NDC mong muốn
vA = (xA*tH, yA*tV, -1);  vB = (xB*tH, yB*tV, -1)       // tia trong hệ máy
α  = acos(dot(vA,vB)/(|vA||vB|))                         // góc A-máy-B (inscribed angle)
AB = B - A;  d = |AB|;  r = d/(2*sin α)                  // bán kính vòng tròn qua A,B (cắt phẳng)
// θ: góc tại A giữa AB và AC (β = θ/2 trong bài gốc); φ: quay quanh trục AB
|AC| = d*sin(α+β)/sin α                                  // định lý sin trong tam giác A-C-B
hướng AC = quay(AB/d, trục = up, góc = β) rồi quay quanh AB một góc φ
p = A + hướng_AC * |AC|
// hướng máy: c0 = norm(mid(A,B) - p); lặp 2-3 lần: tính NDC thực của A,B, lấy TRUNG BÌNH sai lệch yaw/pitch,
// xoay c (bước giống Alg.1 §4.2 của arXiv 1712.04216 [đọc]); roll = 0
```
Lưu ý α chỉ ra khi fov biết: fov hẹp (85 mm) cho α nhỏ -> máy phải xa; kiểm 0 < α < π.
Cỡ chủ thể KHÔNG tự do: nó là hệ quả của (xA,xB,fov) và d. Muốn chủ thể to hơn: đổi vị trí màn hình hoặc fov, không đổi được riêng.
### 3b. Qua vai, cách đơn giản [tự suy] (đủ dùng, ~15 dòng)
A = người được nhìn, B = người có vai ở tiền cảnh.
```
dAB = norm(A - B);  side = cross(up, dAB)*dấu   // dấu chọn vai trái/phải
Z   = hA / (2*sA*tV)                            // sA = cỡ A mong muốn; Z ≈ |AB| + e
e   = max(Z - |AB|, 0.6)                        // máy lùi sau B bao xa
p   = B - dAB*e + side*(0.9..1.4) + up*(dyVaiCao)   // lệch ngang ~ nửa vai, cao ngang/hơi trên đầu B
rồi dùng mục 2 với T = A, (x,y) = (±0.25, +0.1), ψ,φ suy từ p  (L tính theo vòng lặp mục 2)
```
B tự hiện ở rìa khung vì ở gần máy; kiểm bằng mục 6.

## 4. mm -> fov dọc cho khung dọc (công thức fov = 2*atan(d/2f), d = cạnh cảm biến; Wikipedia "Angle of view": 50 mm full-frame 39.6°/27.0° ngang/dọc)
- Quy ước A (xoay máy dọc, cạnh 36 mm là chiều cao khung): fovV = 2*atan(18/f).
- Quy ước B (cắt khung dọc 9:16 từ khung ngang 36×24, giữ cạnh 24 mm làm chiều cao): fovV = 2*atan(12/f). Đây là quy ước hợp phim thường quay ngang rồi cắt.
| mm | fovV (A) | fovV (B) | fov ngang 9:16 (A) |
|---|---|---|---|
| 24 | 73.7° | 53.1° | 45.7° |
| 35 | 54.4° | 37.8° | 32.3° |
| 50 | 39.6° | 27.0° | 22.9° |
| 65 | 31.0° | 20.9° | 17.7° |
| 85 | 23.9° | 16.1° | 13.6° |
Khuyến nghị: lấy B làm mặc định (kịch bản ghi "35 mm" theo ngôn ngữ phim ngang), có cờ đổi sang A. Cần hỏi người dùng quy ước nào.

## 5. Cỡ cảnh (đoạn thân nằm trong khung)
Nguồn: Wikipedia "Shot (filmmaking)" [đọc] cho mốc cắt thân; cột "đoạn dọc" là ước lượng của tôi với người 7.5 đầu, H = 5.3 (cần chỉnh lại theo khối nhân vật thật).
| Cỡ | Mốc cắt (nguồn) | Chiều cao khung ≈ | h, s dùng cho mục 2 |
|---|---|---|---|
| Đặc tả (ECU) | cằm tới trán | 0.14 H | h=0.14H, s=1 |
| Cận (CU) | ngang vai | 0.28 H | h=0.28H |
| Trung cận (MCU) | ngực lên, thấy vai | 0.42 H | h=0.42H |
| Trung (MS) | quanh eo | 0.58 H | h=0.58H |
| Trung-toàn / cao bồi | quanh gối | 0.75 H | h=0.75H |
| Toàn (FS) | cả người | 1.15 H (chừa đầu/chân) | h=1.15H |
| Toàn rộng (LS) | cả người + môi trường | 2–4 H | h theo cảnh |
| Cực rộng (ELS) | toàn cảnh | ≥ 8 H | |
Dùng được: s=1 và h = "chiều cao khung" ở bảng. Khung dọc nên chấp nhận "trung" ở 0.65–0.7 H vì thân dọc lấp đầy.

## 6. Che khuất, máy chui vào vật
- Unity-VC: CLTarget.nRays mặc định 8 [đọc]; mỗi tia Linecast máy -> điểm lấy mẫu (ON_MESH / UNIFORM_IN_BB 2–9 điểm / RANDOM), mỗi tia bị chặn cộng 1/n, tạm chuyển collider của chủ thể sang layer bị bỏ qua. Không có kiểm "máy ở trong vật".
- camera-controls: trong phần đọc (fitToBox/fitToSphere) không có kiểm che khuất; (có thể có colliderMeshes ở chỗ khác: không kiểm tra).
- Toric / ToricCam: không tìm thấy mô tả che khuất ở trang tác giả.
Rẻ nhất trong three.js (tất định, chạy lúc dựng/đầu shot, không mỗi khung): đặt sẵn mảng Box3 (AABB) của vật cố định trong env (không raycast triangle).
Che khuất: 3 tia từ p tới đầu / thân / tay, `ray.intersectBox` với các AABB (loại AABB chứa điểm đích); che nếu t < |p-đích|.
Chui vào vật: `box.distanceToPoint(p) < 0.5` hoặc `containsPoint(p)`; kiểm cả điểm giữa và điểm cuối của hành trình p->p2. Sửa: kéo máy tiến về T 10% mỗi bước, hoặc đổi ψ ±10°, tối đa 12 lần, vẫn lỗi thì báo cảnh báo (không đoán).

## 7. Giấy phép
- Unity-ViewpointComputation: Apache-2.0 [đọc]: được port, giữ ghi công + thông báo; yêu cầu trích Ranon & Urli, IEEE TVCG 2014 nếu công bố khoa học.
- ToricCam: GPL v3 [đọc SourceForge + trang tác giả]: KHÔNG sao chép mã (lây giấy phép sang HTML phát hành). Công thức/ý tưởng trong bài báo dùng được; tự viết lại; trích dẫn Lino & Christie 2012, 2015.
- camera-controls: MIT, © 2017 yomotsu [đọc LICENSE]: công thức fit chỉ 2 dòng, không cần giữ thông báo nếu tự viết; nếu chép nguyên mã thì kèm thông báo MIT.
- fitToBox/Sphere [đọc, tóm tắt]: getDistanceToFitBox = heightToFit*0.5/tan(fov*0.5) + depth*0.5 (heightToFit chọn theo so aspect hộp với aspect máy, cờ cover);
  getDistanceToFitSphere = radius / sin(fov*0.5) với fov = min(fov dọc, fov ngang). fitToBox còn làm tròn azimuth/polar về bội 90° và setFocalOffset(0,0,0) (không hỗ trợ lệch khỏi tâm).

## Nhận định
Viết lại (tự viết, tất định): (1) `mm->fovV` + cờ quy ước (~10 dòng); (2) mục 2 nghiệm đóng một chủ thể kèm lệch khung (~50 dòng); (3) qua vai mục 3b (~30 dòng); (4) bộ kiểm: chiếu NDC, cỡ s, tia che 3 điểm, AABB va chạm, vòng sửa (~60 dòng); (5) bảng cỡ cảnh + tên góc ("3/4" = ψ 35–45°) (~30 dòng).
Tổng ≈ 190–220 dòng, không cần ngoài three.js.
Bỏ: PSO, spline thoả mãn, 12 lớp thuộc tính, ngẫu nhiên, đồng hồ; không cần Toric đầy đủ cho đối thoại 2 người: chỉ làm khi cần "đúng vị trí màn hình cả hai" (~40 dòng thêm, phải đọc bài gốc để kiểm công thức mục 3a trước).
Việc còn mở: đọc bản PDF gốc (bị chặn) để xác nhận Eq.3 và cách tính hướng máy; hỏi quy ước mm A/B; đo H và điểm neo từ khối nhân vật thật.
