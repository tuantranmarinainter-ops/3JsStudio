# Ví dụ 10 hàng (cốt truyện tự nghĩ: thị trấn đếm thanh pin)
Chỉ để học KIỂU điền; đây là phần đầu của một phim, không phải nội dung để chép.
`kiem_tong: off` chỉ vì ví dụ ngắn (10 hàng); kịch bản thật KHÔNG đặt dòng này.
`giây` = max(tối thiểu của loại, ký tự câu / 14 / số shot của câu), làm tròn 0,1 lên. Hàng 4 có `tối thiểu` = 2 (ghi đè mức của loại). Hàng 8 có `tư thế` flying (mô hình không phải người). Hàng 9 có `twist` ở ghi chú (đánh dấu shot đầu của câu twist).

ep: ep998
luat_goc: Ở thị trấn này, ai cũng có một thanh pin trên đầu.
kiem_tong: off
crowd: 2

| id | khung | giây | lời kể | loại | ai | cùng | ở đâu | hành động | mặt | máy quay | chữ | tiếng động | giờ | thời tiết | vật cần đọc | tư thế | tối thiểu | ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 |  | 1,2 | Ở thị trấn này, ai cũng có pin. | establish |  |  | square |  |  | lia chậm | Ai cũng có pin | town ambience day birds@0*0.3 | sang | nang |  |  |  |  |
| 2 |  | 1,2 | ^ | crowd |  |  | square | cheer | happy | kéo ra |  |  | sang | nang |  |  |  |  |
| 3 |  | 2,1 | Pin cạn là đứng im như tượng. | crowd |  |  | street | idle | neutral | kéo ra |  |  | sang | nang |  |  |  |  |
| 4 |  | 2,0 | Còn pin tôi chỉ có một phần trăm. | closeup | hero |  | street | idle | worried | đẩy vào | 1% |  | sang | may |  |  | 2 |  |
| 5 |  | 1,2 | ^ | follow | hero |  | street | walk | sleepy | đẩy vào |  |  | sang | may |  |  |  |  |
| 6 |  | 2,3 | Mẹ dặn tôi đừng chạy, đừng cười. | dialogue | hero | mom | home | wave | smile | kéo ra |  |  | chieu | may |  |  |  |  |
| 7 |  | 2,5 | Mẹ nhét thiếp vào cặp tôi mỗi sáng. | insertRead | hero |  | home | hold |  | đẩy vào | Đừng mở | paper rustle@0.2*0.5 | chieu | may | tấm thiếp |  |  |  |
| 8 |  | 1,9 | Một con chim bay theo tôi. | follow | chim |  | street |  |  | xoay quanh |  |  | hoang-hon | suong |  | flying |  |  |
| 9 |  | 2,0 | Tôi nghe bước chân sau lưng. | chase | hero | crowd1 | street | run | scared | rung |  |  | hoang-hon | suong |  |  |  | twist |
| 10 |  | 2,0 | Pin tôi tụt xuống còn không. | closeup | hero |  | street | cower | scared | đẩy vào | 0% |  | dem | suong |  |  |  |  |

## Cần dựng
- env: kitchen: bếp nhà tôi, có bàn ăn
- prop: tấm thiếp: thiếp giấy có dòng chữ
- anim: kneel: quỳ xuống
