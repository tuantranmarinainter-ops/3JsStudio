# ep003 kit2 lớp `nha-may`: báo cáo sửa 19 shot + S094

File sửa: `kich-ban/ep003-kit2/kit-nha-may.json`. Ảnh xem thử: `kich-ban/ep003-kit2/xem/<ID>.jpg`.
"Trước" = trạng thái người chấm (docs/handoff/ep003-ab-2.md, ab-3.md, cột B); S094 người chấm ghi đạt nhưng người dùng thấy chưa đạt. "Sau" = tự chấm sau tối đa 3 vòng.
Số cũ của mọi shot lưu ở `output/_tmp/` (kit-nm-v1.json, kit-nm-v2.json) và bản gốc ở thư mục scratchpad của phiên.

| shot | trước | sau | khung engine giờ thấy gì | còn lệch gì |
|---|---|---|---|---|
| S050 | lệch | đạt | sau lưng Gà, hàng rào bên trái, cửa sổ nhà máy bên phải, góc thùng gỗ | thùng chỉ lộ mép |
| S053 | lệch | lệch | gấu to trên đầu băng, nhẫn lơ lửng bên phải, mép băng + con lăn | gấu cắt nhẹ mép trái, chưa có động tác thả nhẫn |
| S054 | lệch | lệch | máy dọc băng, nhẫn tiền cảnh, Bách ở cuối băng | không có hộp nhận hàng; đầu Bách lộ (không cắt được) |
| S058 | lệch | lệch | qua vai Bách nhìn bản đồ, ghim đầu gấu rõ | Bách vẫn nghiêng lưng, tay R6 che bản đồ; giữ bản vòng 2 |
| S059 | lệch | lệch | bản đồ xiên, cánh tay Bách chạm ghim | thiếu bàn tay cầm ghim (R6) |
| S061 | lệch | lệch | Bách bên trái, tay chỉ cụm nhà chưa đánh dấu | mặt Bách không rõ |
| S062 | lệch | lệch | két dưới băng + dấu ổ bánh, khung băng phía trên | vô-lăng két to hơn ảnh; thiếu kệ gấu, bản đồ |
| S063 | lệch | đạt | mặt cửa két, dấu ổ bánh, vô-lăng giữa khung | thiếu bản lề bên phải |
| S064 | lệch | lệch | mặt dây xanh ngọc trên mép két, băng phía trên | két tối, dây treo lộ một phần |
| S065 | lệch | lệch | mặt Gà nhìn vào qua kính, hàng rào phía sau | không có khung cửa sổ ấm; đặt máy sát kính thì mặt tràn khung nên giữ bản xa |
| S066 | lệch | đạt | Gà chạy về nam nhìn từ sau lưng, tường nhà máy + cửa sổ + đèn bên trái, thùng tiền cảnh | hàng rào ngoài khung |
| S078 | lệch | đạt | thị trưởng áp sát kính, Gà chỉ, hai lính phía sau, thùng góc dưới | thị trưởng quay lưng nhiều |
| S079 | lệch | lệch | giữ số cũ: Bách cầm đồng hồ trước ngực, băng chuyền, kệ gấu | thiếu dây xích, tay nâng cao (thử nâng tay thì khối tay che hết) |
| S080 | lệch | đạt | cận đôi: mặt nghiêng thị trưởng lớn, Gà sau vai bên trái, tường gạch | tạm ổn |
| S082 | hỏng | lệch | lính A cận cảnh, thị trưởng và cửa thép phía sau | chốt cửa không lọt khung (tay R6 không với tới chốt) |
| S083 | lệch | lệch | Gà tiền cảnh, hai lính hai bên cửa kho, thị trưởng mép trái | kho mở bị Gà che, chỉ thấy thùng ở mép phải |
| S084 | lệch | lệch | thị trưởng mép trái, Gà bên phải, cửa kho + chồng thùng phía sau | Gà chiếm nhiều khung |
| S089 | lệch | đạt | Bách bên trái (đầu, vai), Gà bên phải nhìn sang | nền là thùng gỗ, không phải kệ carton |
| S091 | lệch | lệch | giữ số cũ: Bách + hai tay phía trước, thùng in đầu gấu | quá rộng, chỉ một thùng; thử đặt thùng lên chồng + máy gần thì đầu Bách che hết |
| S094 | đạt (người dùng: chưa) | đạt | đủ 3 người: Gà mép trái, thị trưởng giữa nhìn sang phải, Bách mép phải cắt; mép thùng carton tiền cảnh dưới, đèn treo trên | Gà hơi bị che; không thấy cửa kính cao bên trái |

Đếm (19 shot được giao + S094 = 20): trước đạt 0 · lệch 19 · hỏng 1 (S082) tính theo bảng chấm của người dùng cho S094 = lệch; sau đạt 7 (S050, S063, S066, S078, S080, S089, S094) · lệch 13 · hỏng 0.

## Mốc đã chốt (dùng cho shot kế tiếp)
- Gà ngoài rào đêm: (-44.5, 0, 17.8), ry 165. Bách ở bản đồ: pos y = 2 (bản đồ cao), đứng gần (19,2,-17.5).
- Cặp kho (S082–S094): cửa kho x = 30, chốt ở z = ±0,7, y 5,4; cụm 3 người S094: Gà (27,0,-0,9), thị trưởng (25,8,0,1,2), Bách (23,0,4,4) camera (18,5; 4,8; 3,4) nhìn +X.
- Thùng in đầu gấu (prop cố định 2,4 x 2 x 2,4) dùng làm mép tiền cảnh S094 ở (21,2; 1,9; 2,9).

CẦN ENGINE: hộp nhận hàng mở ở cuối băng chuyền (S054); prop thùng in đầu gấu cho phép đặt nhiều bản (S091); đồng hồ quả quýt dựng đứng có dây xích treo (S079); khung cửa sổ nhà máy nhìn từ trong ra có thanh chắn (S065).
