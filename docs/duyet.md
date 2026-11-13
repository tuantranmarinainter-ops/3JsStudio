# Trang duyệt nhiều đợt (`tools/duyet.mjs`)

Mỗi lần người dùng duyệt là một ĐỢT. Trang `dist/<ep>_duyet.html` (một file, ảnh nhúng base64) có hàng nút "Đợt N",
chi phí token từng đợt và bảng "Lịch sử các đợt" (ngày, số mục, duyệt / cần sửa, token).

## Dữ liệu
- `duyet/<ep>/dot-NN.json`: `{ so, ngay, tieuDe, tomTat, token:{tong,chiTiet:[{viec,token,model}],ghiChu}, nhom:[…], lienKet?:[{ten,href}] }`
- Nhóm: `{ id, ten, mota, kieu?:'chon'|'cap'|'ung-vien', anh?:[bảng tổng, mặc định thu gọn "Xem bảng tổng"], nhan?, hienTai?, muc:[…] }`
- Mục (mỗi mục = MỘT THẺ có hình riêng, nút Duyệt/Cần sửa + ghi chú ngay dưới hình): dạng cũ `[id, ten, phu]` vẫn đọc được, hoặc
  `{ id, ten, phu, anh:'đường/dẫn' | [tối đa 4 ảnh], link, linkTen, links:[{ten,href}], nguon, tacGia, giayPhep, tamGiac }`.
  Đường dẫn ảnh/`link` không có scheme là đường dẫn từ gốc repo (trang tự thêm `../` vì nằm trong `dist/`); `http(s)://` giữ nguyên.
  Không ghi `link` mà có `anh` thì link mặc định = ảnh gốc cỡ lớn ("ảnh lớn"). Mở tab mới (`target=_blank`).
- `kieu:'chon'`: chọn 1 (thẻ chọn xanh, thẻ khác mờ); `hienTai:{ten,phu,anh}` là thẻ nét đứt để so. Kết quả: `gau:{id,ten}`.
- `kieu:'cap'`: mục có `anhTruoc`/`anhSau` thì thẻ là cặp ảnh trước | sau; không có thì dùng `anh` chung của nhóm + `nhan`.
- `kieu:'ung-vien'`: `muc` (hoặc `khe`) = các KHE: `{ id, ten, phu, anhHienTai, ungVien:[{ id, ten, anh, link, nguon, tacGia, giayPhep, tamGiac, phu }] }`;
  chọn 1 ứng viên hoặc "Không cái nào" mỗi khe + ghi chú. Kết quả: `chon:{ <khe>: <id ứng viên> | null }` (khe chưa quyết nằm trong `chuaChon`).
- Ảnh được thu nhỏ khi dựng (cạnh dài ≤ 640 px, bảng tổng ≤ 1400 px, JPG q82, cache `.cache/duyet/`, cần python + PIL); bản lớn mở qua link.
- `duyet/<ep>/dot-NN.ketqua.json`: kết quả người dùng đã chốt (đợt có file này hiện "đã chốt", chỉ đọc).

## Lệnh
| Lệnh | Việc |
|---|---|
| `node tools/duyet.mjs ep002 moi "<tiêu đề>"` | tạo khung đợt kế tiếp |
| `node tools/duyet.mjs ep002 token <số> "<việc>" <token> [model]` | cộng một dòng chi phí, cập nhật tổng |
| `node tools/duyet.mjs ep002 dung` | dựng `dist/ep002_duyet.html` (báo ảnh thiếu; cảnh báo nếu ảnh > 25 MB) |
| `node tools/duyet.mjs ep002 them-ung-vien <số> <file.json>` | nạp nhóm `ung-vien` (file `{ nhomId, ten, mota, khe:[…] }`) vào đợt `<số>`, tạo đợt nếu chưa có, thay nhóm cùng `nhomId` |
| `node tools/duyet.mjs ep002 nhan <file.json>` | nhập file "Lưu kết quả" của người dùng → `dot-NN.ketqua.json` |
| `node tools/duyet.mjs ep002 mo [--cong 8791] [--khong-mo] [--mot-lan] [--het-gio 240] [--thu-muc dir]` | dựng lại trang + máy chủ `127.0.0.1` (tự đổi cổng nếu bận, mở trình duyệt); nút "Gửi tới Claude" POST `/gui` → `dot-NN.ketqua.json` + dòng trong `hop-thu.jsonl`, in `DA-NHAN dot=<N> file=<đường dẫn>` |

## Quy trình
1. `moi` → điền `nhom`/`anh` → `token` mỗi khi có việc tốn token → `dung` → đưa link HTML.
2. Người dùng duyệt, bấm "Lưu kết quả" (file `ep002_duyet_dotNN.json`, có trường `dot`) → `nhan` → `dung` lại.
3. localStorage tách theo đợt: `<ep>_duyet_dotNN`. Nút Lưu/Sao chép chỉ xuất đợt đang mở.

## Gửi thẳng tới Claude
- Người dùng bấm đúp `tools/duyet-mo.bat [ep]` (mặc định ep002) → trang mở ở `http://127.0.0.1:<cổng>/` → duyệt xong bấm **Gửi tới Claude**
  (hỏi xác nhận nếu còn mục chưa chọn). Mở trang bằng `file://` thì nút mờ; vẫn có Lưu / Sao chép kết quả.
- Máy chủ chỉ nghe `127.0.0.1`, kiểm Host/Origin, giới hạn 2 MB, `tap` phải đúng `<ep>`, `dot` phải là đợt đang có; chỉ phục vụ ảnh/HTML trong gốc repo.
- **Cho Claude:** chạy `node tools/duyet.mjs <ep> mo --mot-lan` ở chế độ nền (có thể thêm `--khong-mo` nếu trình duyệt đã mở sẵn).
  Khi tiến trình thoát mã 0, đọc dòng `DA-NHAN dot=<N> file=…` rồi xử lý `duyet/<ep>/dot-NN.ketqua.json`, sau đó `dung` lại.
  Mã thoát 3 = hết giờ (`--het-gio`, mặc định 240 phút) không ai gửi.

Test: `node --test tools/tests/duyet.test.mjs`
