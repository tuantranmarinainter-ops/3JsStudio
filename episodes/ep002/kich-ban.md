title: Món đồ biến mất trong phòng khóa kín
ep: ep002
seed: 21
luat_goc: Ở thị trấn này, đồ đạc liên tục biến mất, dù căn phòng đã được khóa kín.
rule: Ở thị trấn này, đồ đạc liên tục biến mất dù phòng đã khóa kín.
weakness: Tôi mất sợi dây chuyền bà để lại — món tôi quý nhất.
twist: Gấu bông ông Bách phát miễn phí là kẻ trộm; ông còn tự giấu hàng mình rồi báo mất để không ai nghi.
solution: Tôi theo Bắp tới nhà máy, dẫn thị trưởng tới tận nơi; gấu mang luôn dép thị trưởng tới trước mắt chú.
actor hero: ga=1
actor bach: shirt=#f2e3c6 pants=#6d4c41 hair=short hairColor=#9e9e9e beard=true
actor mayor: shirt=#9fc5e8 pants=#9fc5e8 hair=short hairColor=#3e2723
actor guard1: shirt=#1f3a68 pants=#1f3a68 hat=beanie hatColor=#c0392b
actor guard2: shirt=#1f3a68 pants=#1f3a68 hat=beanie hatColor=#f1c40f
actor baker: shirt=#ffffff pants=#795548
actor tailor: shirt=#e91e63 skirt=#4a148c hair=braids lashes=true
actor kid1: shirt=#4caf50 pants=#1565c0
actor bap: bear=1 bow=#2e86de
actor bear2: bear=1 bow=#e74c3c
actor bear3: bear=1 bow=#f1c40f
vat thung_tiem_bach: chồng thùng in tên tiệm
crowd: 8
place bakery: 18, -6
place tailor: 26, -6
place bearshop: -8, -6
place mayor: 34, -6
place balcony: 0, -4
place roof: 0, 8
place factory: 60, -20

| id | khung | giây | lời kể | loại | ai | cùng | ở đâu | hành động | mặt | máy quay | chữ | tiếng động | giờ | thời tiết | vật cần đọc | tư thế | tối thiểu | ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 |  | 1,5 | Ở thị trấn này, đồ đạc liên tục biến mất, | establish |  |  | street |  |  | lia chậm, kéo ra | Đồ đạc liên tục biến mất | town ambience day birds@0*0.3 | sang | nang |  |  |  |  |
| 2 |  | 1,5 | ^ | insert |  |  | home |  |  | đẩy vào |  |  | sang | nang |  |  |  | obj:ke_trong — kệ trống, vết bụi hình món đồ |
| 3 |  | 2,2 | dù căn phòng đã được khóa kín. | insert |  |  | home |  |  | đẩy vào |  | door lock click@0.2*0.6 | sang | nang |  |  |  | obj:o_khoa — ổ khoá cửa còn nguyên |
| 4 |  | 1,4 | Ban đầu là két tiền của chú bán bánh. | insert |  |  | bakery |  |  | đẩy vào |  |  | sang | nang |  |  |  | obj:hoc_quay — hốc trống dưới quầy, bảng hình bánh mì |
| 5 |  | 1,4 | ^ | reaction | baker |  | bakery | scared | surprised | đẩy vào |  |  | sang | nang |  |  |  |  |
| 6 |  | 1,2 | Rồi tới nhẫn cưới của cô thợ may. | insert |  |  | tailor |  |  | đẩy vào |  |  | sang | nang |  |  |  | obj:hop_nhan — hộp nhẫn mở trống, cuộn chỉ |
| 7 |  | 1,2 | ^ | closeup | tailor |  | tailor | idle | sad | đẩy vào |  |  | sang | nang |  |  |  |  |
| 8 |  | 3,2 | Ngay cả ông Bách, người hàng xóm thân thiện, | dialogue | bach | kid1 | bearshop | wave | happy | kéo ra |  |  | sang | nang |  |  |  | quầy ngoài hiên tiệm gấu |
| 9 |  | 1,6 | hay phát gấu bông miễn phí cho cả thị trấn, | crowd | bach |  | bearshop | cheer | happy | kéo ra |  |  | sang | nang |  |  |  | ông Bách phát gấu cho 2 đứa nhỏ |
| 10 |  | 1,6 | ^ | insert |  |  | bearshop |  |  | đẩy vào |  |  | sang | nang |  |  |  | obj:thung_dau_gau — thùng in dấu đầu gấu (cài manh mối 1) |
| 11 |  | 1,2 | cũng báo mất đồ. | closeup | bach |  | bearshop | idle | sad | đẩy vào |  |  | sang | nang |  |  |  |  |
| 12 |  | 2,3 | Nhà ông còn báo mất nhiều nhất. | reaction | bach |  | bearshop | point | worried | đẩy vào |  |  | sang | nang |  |  |  | chỉ vào chỗ thùng trống (cài manh mối 2) |
| 13 |  | 1,5 | Chỉ trong một tuần, | insertRead |  |  | square |  |  | đẩy vào | 7 ngày |  | trua | nang | bảng tin thị trấn |  |  | bảng tin dán kín giấy báo mất |
| 14 |  | 1,6 | cả thị trấn đã có hàng chục nhà báo mất đồ. | crowd |  |  | square | panic | worried | kéo ra |  |  | trua | nang |  |  |  |  |
| 15 |  | 1,6 | ^ | establish |  |  | street |  |  | kéo ra, cẩu lên |  |  | trua | nang |  |  |  |  |
| 16 |  | 1,5 | Rồi tới lượt tôi mất | insert |  |  | bedroom |  |  | đẩy vào |  |  | chieu | nang |  |  |  | obj:ke_phong_ga — kệ trống chỗ dây chuyền |
| 17 |  | 2,0 | chiếc dây chuyền bà để lại. | closeup | hero |  | bedroom | idle | sad | đẩy vào |  |  | chieu | nang |  |  |  |  |
| 18 |  | 0,9 | Đó là món tôi quý nhất. | insert |  |  | bedroom |  |  | đẩy vào |  |  | chieu | nang |  |  |  | obj:anh_ba — ảnh bà đeo dây chuyền |
| 19 |  | 0,9 | ^ | closeup | hero |  | bedroom | idle | moved | đẩy vào |  |  | chieu | nang |  |  |  |  |
| 20 |  | 2,5 | Tôi quyết điều tra vụ mất cắp này. | closeup | hero |  | bedroom | point | angry | đẩy vào nhanh | Điều tra! |  | chieu | nang |  |  |  |  |
| 21 |  | 2,0 | Tối đó, tôi đặt cái đồng hồ | closeup | hero |  | bedroom | hold | neutral | đẩy vào |  |  | dem | may |  |  |  |  |
| 22 |  | 1,4 | lên chỗ sợi dây chuyền rồi giả vờ ngủ. | insert |  |  | bedroom |  |  | đẩy vào |  |  | dem | may |  |  |  | obj:dong_ho trên kệ |
| 23 |  | 1,4 | ^ | closeup | hero |  | bedroom | lie | sleep | đẩy vào |  |  | dem | may |  |  |  |  |
| 24 |  | 2,2 | Qua tấm gương đối diện giường, | overShoulder | hero |  | bedroom | lie | sleepy | đẩy vào |  |  | dem | may |  |  |  | qua vai Gà nằm nhìn gương |
| 25 |  | 1,7 | tôi vẫn thấy rõ cái kệ. | insert |  |  | bedroom |  |  | đẩy vào |  |  | dem | may |  |  |  | obj:guong — trong gương thấy kệ + đồng hồ |
| 26 |  | 2,1 | Đợi tới lúc tôi sắp ngủ thật, | closeup | hero |  | bedroom | lie | sleepy | đẩy vào chậm |  |  | dem | may |  |  |  |  |
| 27 |  | 1,3 | trong gương có thứ gì đó ngồi dậy. | insert | bap |  | bedroom | sitUp |  | đẩy vào |  |  | dem | may |  | sitting |  | obj:guong — bóng Bắp ngồi dậy trong gương |
| 28 |  | 1,3 | ^ | closeup | hero |  | bedroom | lie | surprised | đẩy vào nhanh |  |  | dem | may |  |  |  |  |
| 29 |  | 1,2 | Là Bắp. | closeup | bap |  | bedroom | idle |  | đẩy vào | Bắp |  | dem | may |  | sitting | 1,2 |  |
| 30 |  | 1,4 | Con gấu bông vẫn nằm ở cuối giường tôi. | insert | bap |  | bedroom | lie |  | kéo ra |  |  | chieu | nang |  | sitting |  | hồi tưởng ban ngày: Bắp ở chân giường |
| 31 |  | 1,4 | ^ | establish |  |  | bedroom |  |  | kéo ra |  |  | dem | may |  |  |  |  |
| 32 |  | 1,1 | Nó trèo lên kệ, ôm cái đồng hồ | follow | bap |  | bedroom | climb |  | bám theo, cẩu lên |  |  | dem | may |  | standing |  |  |
| 33 |  | 1,1 | ^ | insert | bap |  | bedroom | hug |  | đẩy vào |  |  | dem | may |  | standing |  | Bắp ôm đồng hồ |
| 34 |  | 1,5 | rồi kéo cuốn sách che đúng chỗ vừa lấy đồ. | insert | bap |  | bedroom | drag |  | đẩy vào |  | book slide@0.3*0.5 | dem | may |  | standing |  | obj:cuon_sach che chỗ trống |
| 35 |  | 1,5 | ^ | insert |  |  | bedroom |  |  | đẩy vào |  |  | dem | may |  |  |  | kệ trông như chưa từng mất gì |
| 36 |  | 0,9 | Tôi bật dậy. | reaction | hero |  | bedroom | sitUp | surprised | rung, kéo ra |  |  | dem | may |  |  |  |  |
| 37 |  | 1,0 | Bắp biến mất ngay trước mắt. | insert | bap |  | bedroom | vanish |  | đẩy vào |  | magic poof@0.4*0.6 | dem | may |  | standing |  |  |
| 38 |  | 1,0 | ^ | closeup | hero |  | bedroom | idle | surprised | đẩy vào |  |  | dem | may |  |  |  |  |
| 39 |  | 2,0 | Tới lúc tôi mở được cửa sổ, | follow | hero |  | bedroom | run | worried | bám theo |  | window open@0.6*0.5 | dem | may |  |  |  |  |
| 40 |  | 1,4 | ngoài đường chẳng còn thấy bóng nó đâu. | establish |  |  | street |  |  | kéo ra |  |  | dem | may |  |  |  |  |
| 41 |  | 1,4 | ^ | closeup | hero |  | home | lookAround | worried | đẩy vào |  |  | dem | may |  |  |  | Gà nhoài ra cửa sổ |
| 42 |  | 1,6 | Tối hôm sau, tôi đặt một chiếc nhẫn lên kệ. | insert |  |  | bedroom |  |  | đẩy vào |  |  | dem | nang |  |  |  | obj:nhan_moi trên kệ |
| 43 |  | 1,6 | ^ | closeup | hero |  | bedroom | hold | grin | đẩy vào |  |  | dem | nang |  |  |  |  |
| 44 |  | 2,6 | Lần này, tôi nấp sẵn ngoài ban công. | closeup | hero |  | balcony | cower | worried | đẩy vào |  |  | dem | nang |  |  |  | ban công nhà Gà, nhìn qua cửa kính vào kệ |
| 45 |  | 1,2 | Bắp chộp chiếc nhẫn rồi biến mất. | insert | bap |  | bedroom | hold |  | đẩy vào |  |  | dem | nang |  | standing |  |  |
| 46 |  | 1,2 | ^ | insert | bap |  | bedroom | vanish |  | đẩy vào |  | magic poof@0.3*0.6 | dem | nang |  | standing |  |  |
| 47 |  | 2,5 | Từ ban công, tôi thấy nó xuất hiện | overShoulder | hero |  | balcony | point | surprised | đẩy vào |  |  | dem | nang |  |  |  |  |
| 48 |  | 2,0 | trên mái hiên nhà đối diện. | establish | bap |  | roof | idle |  | kéo ra |  |  | dem | nang |  | standing |  | mái thấp đối diện, nơ xanh nổi trong đêm |
| 49 |  | 1,1 | Tôi chạy xuống đường bám theo. | follow | hero |  | street | run | angry | bám theo |  | footsteps run@0*0.5 | dem | nang |  |  |  |  |
| 50 |  | 1,1 | ^ | chase | hero | bap | street | run | angry | rung |  |  | dem | nang |  |  |  |  |
| 51 |  | 1,4 | Qua ngã ba, hai con gấu khác nhập vào. | walkBy | bears |  | crossroad | run |  | lia |  |  | dem | nang |  | standing |  | Bắp + gấu2 + gấu3 |
| 52 |  | 1,4 | ^ | reaction | hero |  | crossroad | cower | surprised | đẩy vào |  |  | dem | nang |  |  |  |  |
| 53 |  | 1,0 | Một con ôm ví, | insert | bear2 |  | crossroad | hug |  | đẩy vào |  |  | dem | nang |  | standing |  | gấu nơ đỏ ôm ví |
| 54 |  | 1,9 | một con kéo theo túi tiền. | insert | bear3 |  | crossroad | drag |  | đẩy vào |  |  | dem | nang |  | standing |  | gấu nơ vàng kéo túi tiền |
| 55 |  | 2,0 | Cả ba biến mất sau hàng rào | follow | bears |  | factory | run |  | bám theo |  |  | dem | nang |  | standing |  | chui qua hàng rào |
| 56 |  | 1,8 | của một nhà máy cuối phố. | reveal | hero |  | factory | idle | scared | cẩu lên, kéo ra |  |  | dem | suong |  |  |  |  |
| 57 |  | 1,6 | Tôi đứng lên thùng gỗ, | closeup | hero |  | factory | climb | worried | đẩy vào |  |  | dem | suong |  |  |  |  |
| 58 |  | 0,8 | ghé mắt qua cửa kính. | closeup | hero |  | factory | peek | worried | đẩy vào |  |  | dem | suong |  |  |  | mặt Gà sau kính |
| 59 |  | 0,8 | ^ | overShoulder | bap | hero | factory | idle |  | đẩy vào |  |  | dem | suong |  | standing |  |  |
| 60 |  | 2,7 | Bắp thả chiếc nhẫn xuống băng chuyền. | insert | bap |  | factory | putDown |  | đẩy vào |  | conveyor hum@0*0.4 | dem | nang |  | standing |  | obj:bang_chuyen |
| 61 |  | 2,4 | Đứng cuối băng, gom đồ vào thùng, | reveal | bach |  | factory | hold |  | từ sau lưng, kéo ra |  |  | dem | nang |  |  |  | twist — bóng người gom đồ, chưa thấy mặt |
| 62 |  | 0,8 | là ông Bách. | closeup | bach |  | factory | hold | grin | đẩy vào nhanh |  | dramatic sting@0*0.7 | dem | nang |  |  |  |  |
| 63 |  | 0,8 | ^ | closeup | hero |  | factory | peek | scared | đẩy vào |  |  | dem | nang |  |  |  |  |
| 64 |  | 2,2 | Sau lưng ông là cả một dãy gấu | establish |  |  | factory |  |  | kéo ra |  |  | dem | nang |  |  |  | kệ gấu mới may, pose tĩnh |
| 65 |  | 1,0 | mới may xong. | insert |  |  | factory |  |  | lia |  |  | dem | nang |  |  |  | obj:ke_gau — gấu 3 biến thể màu nơ |
| 66 |  | 1,3 | Ông chỉ vào tấm bản đồ trên tường. | reaction | bach |  | factory | point | grin | đẩy vào |  |  | dem | nang |  |  |  |  |
| 67 |  | 1,5 | ^ | insertRead |  |  | factory |  |  | đẩy vào |  |  | dem | nang | bản đồ thị trấn |  |  | nhà có gấu đánh dấu đỏ |
| 68 |  | 1,2 | [bach] Nhà nào có gấu rồi thì đánh dấu. | closeup | bach |  | factory | point | grin | đẩy vào |  |  | dem | nang |  |  |  |  |
| 69 |  | 1,2 | ^ | insert |  |  | factory |  |  | đẩy vào |  | marker squeak@0.3*0.5 | dem | nang |  |  |  | obj:ban_do — dấu X mới |
| 70 |  | 2,2 | [bach] Mai phát tiếp mấy nhà còn lại. | dialogue | bach | bap | factory | wave | laugh | kéo ra |  |  | dem | nang |  |  |  |  |
| 71 |  | 2,0 | Dưới băng chuyền là két tiền | insert |  |  | factory |  |  | đẩy vào |  |  | dem | nang |  |  |  | obj:ket_tien — két của chú bán bánh |
| 72 |  | 1,3 | của chú bán bánh. | closeup | hero |  | factory | peek | surprised | đẩy vào |  |  | dem | nang |  |  |  |  |
| 73 |  | 1,6 | Trên nắp két, tôi thấy | insert |  |  | factory |  |  | đẩy vào chậm |  |  | dem | nang |  |  |  |  |
| 74 |  | 0,8 | sợi dây chuyền của bà. | insert |  |  | factory |  |  | đẩy vào |  |  | dem | nang |  |  |  | obj:day_chuyen trên nắp két |
| 75 |  | 0,8 | ^ | closeup | hero |  | factory | peek | moved | đẩy vào |  |  | dem | nang |  |  |  |  |
| 76 |  | 1,3 | Tôi chạy thẳng tới nhà thị trưởng. | follow | hero |  | street | run | angry | bám theo |  | footsteps run@0*0.5 | dem | nang |  |  |  |  |
| 77 |  | 1,3 | ^ | walkBy | hero |  | street | run | angry | lia |  |  | dem | nang |  |  |  |  |
| 78 |  | 1,5 | Thị trưởng mở cửa, vẫn mặc nguyên đồ ngủ. | establish |  |  | mayor |  |  | kéo ra |  | door knock@0*0.6; door creak@0.6*0.5 | dem | nang |  |  |  | đèn cửa, dép cạnh bậc thềm |
| 79 |  | 1,5 | ^ | dialogue | mayor | hero | mayor | sleepy | sleepy | kéo ra |  |  | dem | nang |  |  |  |  |
| 80 |  | 2,5 | Nghe tới đoạn gấu bông đi ăn trộm, | closeup | hero |  | mayor | point | worried | đẩy vào |  |  | dem | nang |  |  |  |  |
| 81 |  | 1,9 | chú nhìn tôi mất mấy giây. | closeup | mayor |  | mayor | idle | neutral | đứng yên |  |  | dem | nang |  |  | 1,5 | dừng nhịp, im lặng |
| 82 |  | 1,5 | Tôi bảo: “Chú cứ qua nhìn một lần thôi.” | closeup | hero |  | mayor | hold | worried | đẩy vào |  |  | dem | nang |  |  |  |  |
| 83 |  | 1,5 | ^ | dialogue | hero | mayor | mayor | idle | worried | kéo ra |  |  | dem | nang |  |  |  |  |
| 84 |  | 2,1 | Chú gọi hai lính gác đi cùng. | walkBy | mayor | guard1 | street | walk | neutral | lia, kéo ra |  |  | dem | nang |  |  |  | mayor + guard1 + guard2 + Gà |
| 85 |  | 1,8 | Qua cửa kính, cả ba thấy | overShoulder | bach | mayor | factory | idle |  | đẩy vào |  |  | dem | nang |  |  |  |  |
| 86 |  | 1,5 | ông Bách rung chuông. | insert | bach |  | factory | ringBell |  | đẩy vào |  | small bell ring@0.2*0.7 | dem | nang |  |  |  | obj:chuong |
| 87 |  | 1,5 | Một con gấu biến mất. | insert | bap |  | factory | vanish |  | đẩy vào |  | magic poof@0.3*0.6 | dem | nang |  | standing |  |  |
| 88 |  | 1,5 | Vài giây sau, nó quay lại, ôm một đôi dép. | insert | bap |  | factory | hug |  | đẩy vào |  | magic poof@0*0.6 | dem | nang |  | standing |  | ôm đôi dép của thị trưởng |
| 89 |  | 1,5 | ^ | closeup | hero |  | factory | idle | surprised | đẩy vào |  |  | dem | nang |  |  |  |  |
| 90 |  | 1,4 | Thị trưởng cúi nhìn | closeup | mayor |  | factory | lookAround | surprised | đẩy vào |  |  | dem | nang |  |  |  |  |
| 91 |  | 2,0 | hai bàn chân trần của mình. | insert | mayor |  | factory |  |  | hạ xuống |  |  | dem | nang |  |  |  | obj:chan_tran — hai bàn chân trần |
| 92 |  | 1,6 | Chú đi vội quá, để nguyên dép trước cửa nhà. | insert |  |  | mayor |  |  | đẩy vào |  |  | dem | nang |  |  |  | hồi tưởng: chỗ để dép trước bậc thềm trống trơn |
| 93 |  | 1,6 | ^ | closeup | mayor |  | factory | idle | angry | đẩy vào |  |  | dem | nang |  |  |  |  |
| 94 |  | 1,5 | Lính gác mở cửa kho. | reaction | guard1 | guard2 | factory | hold | angry | kéo ra |  | metal door slide@0.2*0.7 | dem | nang |  |  |  |  |
| 95 |  | 2,3 | Thị trưởng nhìn sang chồng thùng | reaction | mayor |  | factory | lookAround | surprised | đẩy vào |  |  | dem | nang |  |  |  |  |
| 96 |  | 1,5 | in tên tiệm ông Bách. | insertRead |  |  | factory |  |  | đẩy vào | Tiệm gấu Bách |  | dem | nang | chồng thùng in tên tiệm |  |  | cụm thùng hàng ông Bách tự giấu |
| 97 |  | 1,5 | [mayor] Ủa, đây là mấy thùng | dialogue | mayor | bach | factory | point | surprised | kéo ra |  |  | dem | nang |  |  |  |  |
| 98 |  | 1,8 | [mayor] sáng nay ông báo mất mà? | closeup | mayor |  | factory | point | angry | đẩy vào |  |  | dem | nang |  |  |  |  |
| 99 |  | 1,5 | Ông Bách im luôn. | closeup | bach |  | factory | idle | worried | đứng yên |  | cricket@0*0.4 | dem | nang |  |  | 1,5 |  |
| 100 |  | 1,0 | Tôi mới hiểu. | closeup | hero |  | factory | idle | surprised | đẩy vào |  |  | dem | nang |  |  |  |  |
| 101 |  | 2,2 | Cứ mỗi lần cả thị trấn mất đồ, | crowd |  |  | square | panic | worried | kéo ra |  |  | sang | nang |  |  |  | hồi tưởng: dân báo mất đồ |
| 102 |  | 1,3 | ông lại giấu thêm | insert | bach |  | bearshop | hold |  | đẩy vào |  |  | sang | nang |  |  |  | hồi tưởng: Bách khiêng thùng ra cửa sau |
| 103 |  | 1,7 | vài thùng hàng của mình | insert |  |  | factory |  |  | đẩy vào |  |  | dem | nang |  |  |  | thùng đầu gấu chất vào kho |
| 104 |  | 1,1 | rồi đi báo mất. | dialogue | bach | mayor | bearshop | panic | sad | kéo ra |  |  | sang | nang |  |  |  | hồi tưởng: Bách than với thị trưởng |
| 105 |  | 1,5 | Ai mà nghi người than mất nhiều nhất chứ? | closeup | bach |  | bearshop | idle | sad | đẩy vào |  |  | sang | nang |  |  |  |  |
| 106 |  | 1,5 | ^ | closeup | bach |  | factory | idle | shy | đẩy vào |  |  | dem | nang |  |  |  |  |
| 107 |  | 1,5 | Sáng hôm sau, tôi lấy lại sợi dây chuyền. | establish |  |  | street |  |  | kéo ra |  | town ambience day birds@0*0.3 | sang | nang |  |  |  |  |
| 108 |  | 1,5 | ^ | closeup | hero |  | bedroom | hold | moved | đẩy vào |  |  | sang | nang |  |  |  |  |
| 109 |  | 2,0 | Tôi cất dây chuyền vào két. | insert |  |  | bedroom |  |  | đẩy vào |  | safe door close@0.6*0.6 | sang | nang |  |  |  | obj:ket_ga — két góc phòng, cùng bố cục cảnh đầu |
| 110 |  | 1,5 | Vừa quay lưng, Bắp đã ôm nguyên cái két. | walkBy | hero |  | bedroom | walk | happy | lia |  |  | sang | nang |  |  |  |  |
| 111 |  | 1,5 | ^ | reveal | bap |  | bedroom | hug |  | kéo ra |  |  | sang | nang |  | standing |  | Bắp ôm cả cái két |
| 112 |  | 1,2 | “Bắp.” | closeup | hero |  | bedroom | idle | angry | đẩy vào |  |  | sang | nang |  |  | 1,2 |  |
| 113 |  | 0,8 | Nó đặt xuống liền. | insert | bap |  | bedroom | putDown |  | kéo ra |  | thud soft@0.4*0.5 | sang | nang |  | standing |  |  |
| 114 |  | 1,5 | ^ | closeup | bap |  | bedroom | idle |  | đẩy vào |  |  | sang | nang |  | sitting | 1,5 | kết: Bắp ngồi ngoan như cảnh đầu |

## Cần dựng
- env: bedroom: phòng Gà — giường, Bắp ở chân giường, kệ cạnh cửa sổ, sách, gương đối diện giường (kệ nằm trong góc phản chiếu khi Gà nằm), cửa ra ban công, két góc phòng (giữ bố cục cho cảnh kết)
- env: bakery: góc cận tiệm bánh — quầy có hốc trống, bảng hình bánh mì
- env: tailor: góc cận tiệm may — bàn, hộp nhẫn mở, cuộn chỉ
- env: bearshop: tiệm gấu ông Bách — cửa tiệm, quầy ngoài hiên, thùng in dấu đầu gấu
- env: factory: nhà máy cuối phố — hàng rào, cửa kính, thùng gỗ để đứng, cửa kho, băng chuyền ngắn, kệ gấu mới, bản đồ thị trấn, 2 cụm thùng (đồ dân mất / hàng ông Bách tự giấu), chuông
- env: mayor: nhà thị trưởng — dùng lại mặt nhà phố, bảng hiệu mới, đèn cửa, đôi dép cạnh bậc thềm
- env: street: phố chính dọc — nhà Gà (có ban công), tiệm gấu sát vách, tiệm bánh, tiệm may, nhà thị trưởng; ngã ba; 2 mái thấp đối diện; chung khung nhà, đổi bảng hiệu + màu cửa
- prop: bap: gấu bông Bắp stylized, đầu to, thân bo, nơ xanh; rig riêng đầu/2 tay/2 chân (tai theo đầu)
- prop: bear2: gấu biến thể nơ đỏ (nhân bản Bắp)
- prop: bear3: gấu biến thể nơ vàng (nhân bản Bắp)
- prop: dây chuyền, đồng hồ, nhẫn, ví, túi tiền, két tiền tiệm bánh, két Gà, đôi dép, hộp nhẫn, cuốn sách, gương
- prop: bảng tin thị trấn: giấy báo mất dán kín
- prop: bản đồ thị trấn: bản đồ trên tường, nhà có gấu đánh dấu đỏ
- prop: chồng thùng in tên tiệm: thùng in chữ "Tiệm gấu Bách" + dấu đầu gấu
- anim: sitUp: bật dậy khỏi giường / gấu ngồi dậy
- anim: climb: trèo (gấu lên kệ, Gà lên thùng gỗ)
- anim: drag: kéo vật (sách, túi tiền)
- anim: vanish: biến mất (thu nhỏ + bụi lấp lánh, VFX)
- anim: peek: ghé mắt nhìn qua kính
- anim: putDown: đặt đồ xuống
- anim: ringBell: rung chuông tay
- anim: sleepy: ngáp, dụi mắt (thị trưởng mới dậy)
- prop: mu_ga: hero = Gà (engine/ga-rig.js, đã có; bật bằng ga=1) — chỉ Bắp là chưa có
- prop: mũ lính gác: mũ kê-pi thay beanie tạm
- prop: mũ đầu bếp: cho chú bán bánh
