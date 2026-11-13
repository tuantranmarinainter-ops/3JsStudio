# Đề bài cho Codex: bổ sung ĐẶC TẢ CAMERA có cấu trúc cho 104 shot

Mục đích: bản dựng three.js cần đặt máy đúng như khung hình Codex đã tạo. Chữ `camera` hiện có ("Cận 65 mm ngang mặt, 3/4 từ phía kệ…") đọc được nhưng không đủ để tính vị trí máy. Hãy ĐO trên chính ảnh đã tạo (không tưởng tượng lại) và trả về một file `Camera_104.json`: mảng 104 phần tử, mỗi phần tử theo mẫu dưới. Mọi số đo theo KHUNG HÌNH (phần trăm khung) và theo NHÂN VẬT (góc so với hướng mặt), KHÔNG dùng toạ độ thế giới.

Đơn vị: `G` = chiều cao Gà (đỉnh đầu → đế giày, không tính chỏm). Phần trăm tính trên khung dọc 9:16: x từ mép TRÁI (0) sang PHẢI (100), y từ mép TRÊN (0) xuống DƯỚI (100).

```json
{
  "id": "S018",
  "nham": { "ai": "GA", "bo_phan": "mat" },
  "co_canh": "can",
  "dau_cao_pct": 34,
  "tam_dau_pct": [52, 38],
  "goc_ngang_do": 35,
  "mat_huong_ve": "trai",
  "goc_cao_do": 0,
  "nghieng_do": 0,
  "tieu_cu_mm": 65,
  "chuyen_dong": { "kieu": "day", "muc": "nhe", "dau_cao_pct_cuoi": 37 },
  "tien_canh": [{ "la": "mép kệ gỗ", "o": "dưới-phải", "chiem_pct": 8 }],
  "hau_canh": [{ "la": "cửa sổ khung kem", "o": "trên-trái" }, { "la": "đầu giường", "o": "phải" }],
  "bo_tri": [
    { "ai": "GA", "tu_the": "dung", "quay_mat_ve": "kệ", "cach_moc": { "moc": "kệ", "G": 0.4 }, "tam_dau_pct": [52, 38], "dau_cao_pct": 34, "thay_tu": "ngực trở lên" }
  ],
  "dao_cu": [{ "ten": "kệ gỗ thấp", "cao_G": 0.7, "trang_thai": "trống, có vết dây" }],
  "anh_sang": { "chinh": "cửa sổ, từ trái-trên, lam lạnh", "phu": "đèn bàn hổ phách từ phải" }
}
```

## Nghĩa từng trường
- `nham`: máy lấy nét/đặt trọng tâm vào gì. `ai` = mã nhân vật (GA, BAP, BACH, MAYOR, GUARD_A, GUARD_B, BAKER, TAILOR, CHILD_A, CHILD_B, BEAR_WALLET, BEAR_BAG, TOWN_A/B/C) + `bo_phan`: `mat | dau | tay_phai | tay_trai | hai_tay | than | toan_than | chan`; hoặc `{ "vat": "<tên vật>" }` cho shot không người.
- `co_canh`: `dac_ta | can | trung_can | trung | toan | toan_rong`.
- `dau_cao_pct`: chiều cao ĐẦU (cằm → đỉnh đầu, không tính chỏm/mũ) của nhân vật được nhắm, tính theo % chiều cao khung. Shot nhắm vật: thay bằng `vat_cao_pct`. Đây là số quan trọng nhất — đo trên ảnh.
- `tam_dau_pct`: [x, y] tâm đầu (hoặc tâm vật) trên khung.
- `goc_ngang_do`: góc giữa HƯỚNG MẶT nhân vật và hướng từ nhân vật tới máy, nhìn từ trên xuống. 0 = chính diện, 90 = ngang, 180 = sau lưng. DƯƠNG khi máy nằm về phía tay TRÁI của nhân vật (khi đó trên khung nhân vật quay mặt về bên TRÁI); ÂM khi máy ở phía tay PHẢI.
- `mat_huong_ve`: `trai | phai | may | quay_lung` — kiểm chéo cho `goc_ngang_do`.
- `goc_cao_do`: 0 = máy ngang tầm điểm nhắm; DƯƠNG = máy cao hơn, chúc xuống; ÂM = máy thấp, ngước lên.
- `nghieng_do`: nghiêng đường chân trời (0 nếu thẳng).
- `tieu_cu_mm`: tiêu cự quy đổi full-frame đã dùng khi tạo ảnh.
- `chuyen_dong.kieu`: `tinh | day | keo | lia_trai | lia_phai | cau_len | ha_xuong | theo | rung`; `muc`: `nhe | vua | manh`; nếu có đẩy/kéo ghi `dau_cao_pct_cuoi`.
- `tien_canh`: vật/người chắn phía trước (vai ai, mép gì), nằm góc nào, chiếm khoảng bao nhiêu % khung. Shot qua vai: ghi rõ vai của AI.
- `hau_canh`: những thứ PHẢI nhìn thấy sau chủ thể và nằm phía nào khung.
- `bo_tri`: MỌI nhân vật có trong khung: tư thế (`dung | ngoi | nam | chay | quy | leo`), quay mặt về đâu, cách vật mốc bao nhiêu G, tâm đầu, cỡ đầu, thấy từ đâu tới đâu ("ngực trở lên", "toàn thân").
- `dao_cu`: đạo cụ có trong khung, cao bao nhiêu G, trạng thái theo truyện.
- `anh_sang`: nguồn chính/phụ, từ hướng nào trên khung, màu.

## Kèm một file `Bo_canh_kich_thuoc.json` (mỗi bối cảnh một mục)
Kích thước theo G: phòng dài × rộng × cao; từng món đồ cố định (giường, kệ, gương, két, cửa sổ, cửa, băng chuyền, kệ gấu, bàn trưng, mái hiên, ban công, bậc thềm): cao, rộng, cách tường/cách nhau bao nhiêu G, nằm tường nào. Mục tiêu: dựng set đúng tỉ lệ để cùng một ống kính ra cùng hậu cảnh.

## Lưu ý
- Hai shot liền nhau cùng nơi phải nhất quán: nhân vật không đổi chỗ, đồ không đổi tường.
- Không chắc số nào thì ghi `"khong_chac": ["goc_cao_do"]` thay vì đoán.
