title: Món đồ biến mất trong phòng khóa kín
ep: ep002
seed: 21
luat_goc: Ở thị trấn này, đồ đạc liên tục biến mất, dù căn phòng đã được khóa kín.
rule: Ở thị trấn này, đồ đạc liên tục biến mất dù phòng đã khóa kín.
weakness: Tôi mất sợi dây chuyền bà để lại — món tôi quý nhất.
twist: Gấu bông ông Bách phát miễn phí là kẻ trộm; ông còn tự giấu hàng mình rồi báo mất để không ai nghi.
solution: Tôi dẫn thị trưởng cùng lính gác tới nhà máy; kho hàng giấu của ông Bách lộ ra, tôi lấy lại dây chuyền, Bắp ôm luôn cái két nhưng chịu đặt xuống.
actor hero: ga=1
actor bach: shirt=#f2e3c6 pants=#6d4c41 hair=short hairColor=#9e9e9e beard=true
actor bach_xuong: shirt=#8fb0c9 sleeves=#f2e3c6 pants=#6d4c41 hair=short hairColor=#9e9e9e beard=true
actor mayor: shirt=#37474f pants=#263238 hat=tophat hatColor=#111111 hair=short hairColor=#3e2723 skin=#f0c89a
actor mayor_ngu: shirt=#90caf9 shirtPattern=stripes shirtPattern2=#ffffff pants=#90caf9 hat=beanie hatColor=#e3f2fd hair=short hairColor=#3e2723 skin=#f0c89a
actor guard1: shirt=#1f3a68 pants=#1f3a68 hat=cap hatColor=#c0392b shoes=#111111
actor guard2: shirt=#2e5a3a pants=#2e5a3a hat=cap hatColor=#f1c40f shoes=#111111 beard=#3e2723
actor baker: shirt=#ffffff pants=#795548 hat=tophat hatColor=#ffffff
actor tailor: shirt=#e91e63 skirt=#4a148c hair=braids lashes=true
actor kid1: shirt=#4caf50 pants=#1565c0
actor bap: bear=1 bow=#2e86de
actor bear2: bear=1 bow=#e74c3c
actor bear3: bear=1 bow=#f1c40f
vat thung_tiem_bach: chồng thùng in tên tiệm
co_san: mu_ga
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
| 1 |  | 1,3 | Ở thị trấn này, đồ đạc liên tục biến mất, dù căn phòng đã được khóa kín. | establish |  |  | street |  |  | lia chậm, kéo ra | Đồ đạc liên tục biến mất | town ambience day birds@0*0.3 | sang | nang |  |  |  |  |
| 2 |  | 1,2 | ^ | insert |  |  | home |  |  | đẩy vào |  |  | sang | nang |  |  |  | obj:ke_trong — kệ trống, vết bụi hình món đồ |
| 3 |  | 1,2 | ^ | insert |  |  | home |  |  | đẩy vào |  | door lock click@0.2*0.6 | sang | nang |  |  |  | obj:o_khoa — ổ khoá cửa còn nguyên |
| 4 |  | 0,9 | Ban đầu là két tiền của chú bán bánh. | insert |  |  | bakery |  |  | đẩy vào |  |  | sang | nang |  |  |  | obj:hoc_quay — hốc trống dưới quầy, bảng hình bánh mì |
| 5 |  | 0,9 | ^ | reaction | baker |  | bakery | scared | surprised | đẩy vào |  |  | sang | nang |  |  |  |  |
| 6 |  | 0,9 | Rồi tới nhẫn cưới của cô thợ may. | insert |  |  | tailor |  |  | đẩy vào |  |  | sang | nang |  |  |  | obj:hop_nhan — hộp nhẫn mở trống, cuộn chỉ |
| 7 |  | 0,9 | ^ | closeup | tailor |  | tailor | idle | sad | đẩy vào |  |  | sang | nang |  |  |  |  |
| 8 |  | 1,8 | Ngay cả ông Bách, người hàng xóm thân thiện hay phát gấu bông miễn phí cho cả thị trấn, cũng báo mất đồ. | dialogue | bach | kid1 | bearshop | wave | happy | kéo ra |  |  | sang | nang |  |  |  | ông Bách phát gấu bông cho 2 đứa nhỏ ở quầy ngoài hiên tiệm gấu |
| 10 |  | 1,4 | ^ | insert |  |  | bearshop |  |  | đẩy vào |  |  | sang | nang |  |  |  | obj:thung_dau_gau — thùng in dấu đầu gấu (cài manh mối 1) |
| 11 |  | 1,6 | ^ | closeup | bach |  | bearshop | idle | sad | đẩy vào |  |  | sang | nang |  |  |  | ông than mất đồ, mặt buồn |
| 12 |  | 1,5 | Nhà ông còn báo mất nhiều nhất. | reaction | bach |  | bearshop | point | worried | đẩy vào |  |  | sang | nang |  |  |  | chỉ vào chỗ thùng trống (cài manh mối 2: nhà ông mất nhiều nhất) |
| 13 |  | 1,5 | Chỉ trong một tuần, cả thị trấn đã có hàng chục nhà báo mất đồ. | insertRead |  |  | square |  |  | đẩy vào | 7 ngày |  | trua | nang | bảng tin thị trấn |  |  | bảng tin dán kín giấy báo mất |
| 14 |  | 1,6 | ^ | crowd |  |  | square | panic | worried | kéo ra |  |  | trua | nang |  |  |  | dân xúm lại bảng tin |
| 14a |  | 1,0 | Còn tôi là Gà. | closeup | hero |  | home | idle | smile | đẩy vào |  |  | trua | nang |  |  |  | giới thiệu Gà (Gà nhìn máy quay) |
| 14b |  | 1,3 | Nhà tôi sát tiệm ông Bách. | establish |  |  | street |  |  | kéo ra, cẩu lên |  |  | chieu | nang |  |  |  | nhà Gà sát tiệm gấu ông Bách |
| 16 |  | 1,3 | Rồi một sáng, chiếc dây chuyền bà để lại cũng biến mất. | insert |  |  | bedroom |  |  | đẩy vào |  |  | chieu | nang |  |  |  | obj:ke_phong_ga — kệ trống chỗ dây chuyền |
| 17 |  | 1,3 | ^ | closeup | hero |  | home | idle | sad | đẩy vào |  |  | chieu | nang |  |  |  |  |
| 18 |  | 1,2 | Đó là món tôi quý nhất. | insert |  |  | bedroom |  |  | đẩy vào |  |  | chieu | nang |  |  |  | obj:anh_ba — ảnh bà đeo dây chuyền |
| 20 |  | 1,8 | Tôi quyết điều tra vụ mất cắp này. | closeup | hero |  | bedroom | point | angry | đẩy vào nhanh | Điều tra! |  | chieu | nang |  |  |  |  |
| 21 |  | 1,1 | Tối đó, tôi đặt cái đồng hồ lên chỗ sợi dây chuyền rồi giả vờ ngủ. | closeup | hero |  | bedroom | hold | neutral | đẩy vào |  |  | dem | may |  |  |  | Gà cầm đồng hồ báo thức |
| 22 |  | 1,1 | ^ | insert |  |  | bedroom |  |  | đẩy vào |  |  | dem | may |  |  |  | obj:dong_ho trên kệ |
| 23 |  | 1,15 | ^ | closeup | hero |  | bedroom | lie | sleep | đẩy vào |  |  | dem | may |  |  |  |  |
| 24 |  | 1,3 | Qua tấm gương đối diện giường, tôi vẫn thấy rõ cái kệ. | overShoulder | hero |  | bedroom | lie | sleepy | đẩy vào |  |  | dem | may |  |  |  | qua vai Gà nằm nhìn gương |
| 25 |  | 1,34 | ^ | insert |  |  | bedroom |  |  | đẩy vào |  |  | dem | may |  |  |  | obj:guong — trong gương thấy kệ + đồng hồ |
| 26 |  | 1,2 | Đợi tới lúc tôi sắp ngủ thật, trong gương có thứ gì đó ngồi dậy. | closeup | hero |  | bedroom | lie | sleepy | đẩy vào chậm |  |  | dem | may |  |  |  |  |
| 27 |  | 0,9 | ^ | insert | bap |  | bedroom | sitUp |  | đẩy vào |  |  | dem | may |  | sitting |  | obj:guong — bóng Bắp ngồi dậy trong gương |
| 29 |  | 0,56 | Là Bắp. | closeup | bap |  | bedroom | idle |  | đẩy vào | Bắp |  | dem | may |  | sitting | 0,5 | Bắp ngồi ở chân giường |
| 30 |  | 1,88 | Con gấu bông vẫn nằm ở cuối giường tôi. | insert | bap |  | bedroom | idle |  | kéo ra |  |  | chieu | nang |  | sitting |  | hồi tưởng ban ngày: Bắp ngồi ở chân giường |
| 32 |  | 1,2 | Nó trèo lên kệ, ôm cái đồng hồ rồi kéo cuốn sách che đúng chỗ vừa lấy đồ. | follow | bap |  | bedroom | climb |  | bám theo, cẩu lên |  |  | dem | may |  | standing |  |  |
| 33 |  | 1,2 | ^ | insert | bap |  | bedroom | hug |  | đẩy vào |  |  | dem | may |  | standing |  | Bắp ôm đồng hồ |
| 34 |  | 1,34 | ^ | insert | bap |  | bedroom | drag |  | đẩy vào |  | book slide@0.3*0.5 | dem | may |  | standing |  | obj:cuon_sach che đúng chỗ vừa lấy đồ |
| 36 |  | 0,72 | Tôi bật dậy. | reaction | hero |  | bedroom | sitUp | surprised | rung, kéo ra |  |  | dem | may |  |  | 0,5 |  |
| 37 |  | 1,29 | Bắp biến mất ngay trước mắt. | insert | bap |  | bedroom | vanish |  | đẩy vào |  | magic poof@0.4*0.6 | dem | may |  | standing |  |  |
| 39 |  | 1,2 | Tới lúc tôi mở được cửa sổ, ngoài đường chẳng còn thấy bóng nó đâu. | follow | hero |  | bedroom | run | worried | bám theo |  | window open@0.6*0.5 | dem | may |  |  |  |  |
| 40 |  | 1,2 | ^ | establish |  |  | street |  |  | kéo ra |  |  | dem | may |  |  |  |  |
| 41 |  | 0,98 | ^ | closeup | hero |  | home | lookAround | worried | đẩy vào |  |  | dem | may |  |  |  | Gà nhoài ra cửa sổ |
| 42 |  | 1,1 | Tối hôm sau, tôi đặt một chiếc nhẫn lên kệ. | insert |  |  | bedroom |  |  | đẩy vào |  |  | dem | nang |  |  |  | obj:nhan_moi trên kệ |
| 43 |  | 1,13 | ^ | closeup | hero |  | bedroom | hold | grin | đẩy vào |  |  | dem | nang |  |  |  |  |
| 44 |  | 2,07 | Lần này, tôi nấp sẵn ngoài ban công. | closeup | hero |  | balcony | cower | worried | đẩy vào |  |  | dem | nang |  |  |  | ban công nhà Gà, nấp nhìn qua cửa kính vào kệ |
| 45 |  | 0,72 | Bắp chộp chiếc nhẫn rồi biến mất. | insert | bap |  | bedroom | hold |  | đẩy vào |  |  | dem | nang |  | standing | 0,5 | Bắp chộp nhẫn |
| 46 |  | 0,72 | ^ | insert | bap |  | bedroom | vanish |  | đẩy vào |  | magic poof@0.3*0.6 | dem | nang |  | standing | 0,5 |  |
| 47 |  | 1,5 | Từ ban công, tôi thấy nó xuất hiện trên mái hiên nhà đối diện. | overShoulder | hero |  | balcony | point | surprised | đẩy vào |  |  | dem | nang |  |  |  |  |
| 48 |  | 1,43 | ^ | establish | bap |  | roof | idle |  | kéo ra |  |  | dem | nang |  | standing |  | mái thấp đối diện, nơ xanh nổi trong đêm |
| 49 |  | 1,4 | Tôi chạy xuống đường bám theo. | follow | hero |  | street | run | angry | bám theo |  | footsteps run@0*0.5 | dem | nang |  |  |  |  |
| 51 |  | 1,1 | Qua ngã ba, hai con gấu khác nhập vào. | walkBy | bears |  | crossroad | run |  | lia |  |  | dem | nang |  | standing |  | Bắp + gấu2 + gấu3 gặp nhau ở ngã ba |
| 52 |  | 1,04 | ^ | reaction | hero |  | crossroad | cower | surprised | đẩy vào |  |  | dem | nang |  |  |  |  |
| 53 |  | 1,0 | Một con ôm ví, một con kéo theo túi tiền. | insert | bear2 |  | crossroad | hug |  | đẩy vào |  |  | dem | nang |  | standing |  | gấu nơ đỏ ôm ví |
| 54 |  | 1,37 | ^ | insert | bear3 |  | crossroad | drag |  | đẩy vào |  |  | dem | nang |  | standing |  | gấu nơ vàng kéo túi tiền |
| 55 |  | 1,4 | Cả ba biến mất sau hàng rào của một nhà máy cuối phố. | follow | bears |  | factory | run |  | bám theo |  |  | dem | nang |  | standing |  | chui qua hàng rào |
| 56 |  | 1,43 | ^ | reveal | hero |  | factory | idle | scared | cẩu lên, kéo ra |  |  | dem | suong |  |  |  |  |
| 57 |  | 1,2 | Tôi đứng lên thùng gỗ, ghé mắt qua cửa kính. | closeup | hero |  | factory | climb | worried | đẩy vào |  |  | dem | suong |  |  |  | Gà trèo lên thùng gỗ |
| 58 |  | 1,19 | ^ | closeup | hero |  | factory | peek | worried | đẩy vào |  |  | dem | suong |  |  |  | mặt Gà sau kính |
| 60 |  | 1,61 | Bắp thả chiếc nhẫn xuống băng chuyền. | insert | bap |  | factory | putDown |  | đẩy vào |  | conveyor hum@0*0.4 | dem | nang |  | standing |  | obj:bang_chuyen — Bắp thả nhẫn xuống băng chuyền |
| 61 |  | 1,6 | Đứng cuối băng, gom đồ vào thùng, là ông Bách. | reveal | bach_xuong |  | factory | hold |  | từ sau lưng, kéo ra |  |  | dem | nang |  |  |  | twist — bóng người gom đồ cuối băng, chưa thấy mặt |
| 62 |  | 1,01 | ^ | closeup | bach_xuong |  | factory | hold | grin | đẩy vào nhanh |  | dramatic sting@0*0.7 | dem | nang |  |  |  |  |
| 64 |  | 1,27 | Sau lưng ông là cả một dãy gấu mới may xong. | establish |  |  | factory |  |  | kéo ra |  |  | dem | nang |  |  |  | dãy gấu mới may trên kệ, pose tĩnh |
| 65 |  | 1,0 | ^ | insert |  |  | factory |  |  | lia |  |  | dem | nang |  |  |  | obj:ke_gau — gấu 3 biến thể màu nơ |
| 66 |  | 1,7 | Ông chỉ vào tấm bản đồ trên tường. | reaction | bach_xuong |  | factory | point | grin | đẩy vào |  |  | dem | nang |  |  |  | Bách chỉ tấm bản đồ |
| 68 |  | 0,9 | Nhà nào có gấu rồi thì đánh dấu. | closeup | bach_xuong |  | factory | point | grin | đẩy vào |  |  | dem | nang |  |  |  |  |
| 69 |  | 0,85 | ^ | insert |  |  | factory |  |  | đẩy vào |  | marker squeak@0.3*0.5 | dem | nang |  |  |  | obj:ban_do — dấu X đỏ mới |
| 70 |  | 1,5 | Mai phát tiếp mấy nhà còn lại. | dialogue | bach_xuong | bap | factory | wave | laugh | kéo ra |  |  | dem | nang |  |  |  |  |
| 71 |  | 1,04 | Dưới băng chuyền là két tiền của chú bán bánh. | insert |  |  | factory |  |  | đẩy vào |  |  | dem | nang |  |  |  | obj:ket_tien — két của chú bán bánh dưới băng chuyền |
| 72 |  | 1,0 | ^ | closeup | hero |  | factory | peek | surprised | đẩy vào |  |  | dem | nang |  |  |  |  |
| 74 |  | 1,5 | Trên nắp két, tôi thấy sợi dây chuyền của bà. | insert |  |  | factory |  |  | đẩy vào |  |  | dem | nang |  |  |  | obj:day_chuyen trên nắp két |
| 75 |  | 0,81 | ^ | closeup | hero |  | factory | peek | moved | đẩy vào |  |  | dem | nang |  |  |  |  |
| 76 |  | 1,74 | Tôi chạy thẳng tới nhà thị trưởng. | follow | hero |  | street | run | angry | bám theo |  | footsteps run@0*0.5 | dem | nang |  |  |  |  |
| 77 |  | 1,2 | Tôi bảo thị trưởng: Chú qua nhìn một lần thôi! | dialogue | hero | mayor_ngu | mayor | point | worried | kéo ra |  | door knock@0*0.6; door creak@0.6*0.5 | dem | nang |  |  |  | Gà gõ cửa; thị trưởng mặc đồ ngủ, mũ ngủ, mắt lờ đờ |
| 78 |  | 1,21 | ^ | closeup | hero |  | mayor | point | worried | đẩy vào |  |  | dem | nang |  |  |  |  |
| 79 |  | 0,83 | Chú lắc đầu. | closeup | mayor_ngu |  | mayor | sleepy | neutral | đẩy vào |  |  | dem | nang |  |  |  | thị trưởng lắc đầu |
| 80 |  | 1,04 | Báo đời báo đốm. | closeup | mayor_ngu |  | mayor | sleepy | angry | đẩy vào |  |  | dem | nang |  |  |  |  |
| 81 |  | 0,87 | Về ngủ đi! | closeup | mayor_ngu |  | mayor | point | angry | đẩy vào |  | door slam@0.6*0.6 | dem | nang |  |  |  |  |
| 82 |  | 1,2 | Sáng hôm sau, chính chú chạy qua tìm tôi. | establish |  |  | home |  |  | kéo ra |  |  | sang | nang |  |  |  | sáng hôm sau, trước nhà Gà |
| 83 |  | 1,15 | ^ | follow | mayor |  | street | run | worried | bám theo |  | footsteps run@0*0.5 | sang | nang |  |  |  | thị trưởng đồ thường, mũ cao, chạy tìm Gà |
| 84 |  | 1,2 | Chiếc đồng hồ quả quýt cha để lại cho chú đã biến mất. | insert |  |  | mayor |  |  | đẩy vào |  |  | sang | nang |  |  |  | obj:dong_ho_quyt_thi — đồng hồ quả quýt nắp vàng + dây xích (khác đồng hồ của Gà) |
| 85 |  | 1,24 | ^ | closeup | mayor |  | street | lookAround | worried | đẩy vào |  |  | sang | nang |  |  |  | thị trưởng sờ túi áo, túi trống |
| 86 |  | 1,2 | Lần này, chú gọi hai lính gác đi cùng tôi. | dialogue | mayor | guard1 | street | point | angry | kéo ra |  |  | sang | nang |  |  |  | thị trưởng gọi lính gác |
| 87 |  | 1,17 | ^ | walkBy | mayor | guard1 | street | walk | worried | lia, kéo ra |  |  | sang | nang |  |  |  | cả nhóm đi cùng nhau: Gà + thị trưởng + 2 lính gác |
| 88 |  | 1,2 | Qua cửa kính nhà máy, chú thấy ông Bách nhặt chiếc đồng hồ của mình khỏi băng chuyền. | overShoulder | bach_xuong | mayor | factory | idle |  | đẩy vào |  |  | sang | nang |  |  |  | nhìn qua cửa kính nhà máy ban ngày |
| 89 |  | 1,3 | ^ | insert |  |  | factory |  |  | đẩy vào |  |  | sang | nang |  |  |  | obj:dong_ho_quyt trên băng chuyền |
| 90 |  | 1,18 | ^ | closeup | bach_xuong |  | factory | hold | neutral | đẩy vào |  |  | sang | nang |  |  |  | Bách nhặt đồng hồ khỏi băng chuyền |
| 91 |  | 1,37 | Chú quay sang hai lính gác. | dialogue | mayor | guard1 | factory | point | angry | kéo ra |  |  | sang | nang |  |  |  | thị trưởng quay sang 2 lính gác |
| 92 |  | 1,19 | Mở cửa kho. | closeup | mayor |  | factory | point | angry | đẩy vào nhanh |  |  | sang | nang |  |  |  |  |
| 93 |  | 1,32 | Lính gác mở cửa kho. | reaction | guard1 | guard2 | factory | hold | angry | kéo ra |  | metal door slide@0.2*0.7 | sang | nang |  |  |  | 2 lính gác kéo cửa kho |
| 94 |  | 0,66 | Thị trưởng nhìn sang chồng thùng in tên tiệm ông Bách. | closeup | mayor |  | factory | lookAround | surprised | đẩy vào |  |  | sang | nang |  |  | 0,5 |  |
| 95 |  | 1,5 | ^ | insertRead |  |  | factory |  |  | đẩy vào | Tiệm gấu Bách |  | sang | nang | chồng thùng in tên tiệm |  |  | cụm thùng hàng ông Bách tự giấu |
| 96 |  | 1,2 | Ủa, đây là mấy thùng sáng nay ông báo mất mà? | dialogue | mayor | bach_xuong | factory | point | surprised | kéo ra |  |  | sang | nang |  |  |  |  |
| 97 |  | 1,22 | ^ | closeup | mayor |  | factory | point | angry | đẩy vào |  |  | sang | nang |  |  |  |  |
| 98 |  | 0,99 | Ông Bách im luôn. | closeup | bach_xuong |  | factory | idle | worried | đứng yên |  | cricket@0*0.4 | sang | nang |  |  | 0,9 | ông Bách đứng cứng, im lặng |
| 99 |  | 0,75 | Tôi mới hiểu. | closeup | hero |  | factory | idle | surprised | đẩy vào |  |  | sang | nang |  |  | 0,5 |  |
| 100 |  | 1,3 | Cứ mỗi lần cả thị trấn mất đồ, ông lại giấu thêm vài thùng hàng của mình rồi đi báo mất. | crowd |  |  | square | panic | worried | kéo ra |  |  | sang | nang |  |  |  | hồi tưởng: dân báo mất đồ |
| 101 |  | 1,4 | ^ | walkBy | bach |  | bearshop | walk |  | lia |  |  | sang | nang |  |  |  | hồi tưởng: Bách khiêng thùng ra cửa sau |
| 102 |  | 1,28 | ^ | dialogue | bach | mayor | bearshop | panic | sad | kéo ra |  |  | sang | nang |  |  |  | hồi tưởng: Bách than với thị trưởng |
| 103 |  | 0,9 | Ai mà nghi người than mất nhiều nhất chứ? | closeup | bach_xuong |  | factory | idle | grin | đẩy vào |  |  | sang | nang |  |  |  | mặt Bách đắc ý |
| 104 |  | 0,87 | ^ | closeup | hero |  | factory | idle | neutral | đẩy vào |  |  | sang | nang |  |  |  |  |
| 105 |  | 1,25 | Sáng hôm sau, tôi lấy lại sợi dây chuyền. | establish |  |  | street |  |  | kéo ra |  | town ambience day birds@0*0.3 | sang | nang |  |  |  |  |
| 106 |  | 1,0 | ^ | closeup | hero |  | home | hold | moved | đẩy vào |  |  | sang | nang |  |  |  | Gà cầm lại dây chuyền |
| 107 |  | 1,24 | Tôi cất dây chuyền vào két. | insert |  |  | bedroom |  |  | đẩy vào |  | safe door close@0.6*0.6 | sang | nang |  |  |  | obj:ket_ga — két góc phòng, cùng bố cục cảnh đầu |
| 108 |  | 1,0 | Vừa quay lưng, Bắp đã ôm nguyên cái két. | walkBy | hero |  | bedroom | walk | happy | lia |  |  | sang | nang |  |  |  |  |
| 109 |  | 1,15 | ^ | reveal | bap |  | bedroom | hug |  | kéo ra |  |  | sang | nang |  | standing |  | Bắp ôm nguyên cái két |
| 110 |  | 0,5 | Bắp. | closeup | hero |  | bedroom | idle | angry | đẩy vào | Bắp. |  | sang | nang |  |  | 0,5 |  |
| 111 |  | 1,06 | Nó đặt xuống liền. | insert | bap |  | bedroom | putDown |  | kéo ra |  | thud soft@0.4*0.5 | sang | nang |  | standing |  |  |
| 112 |  | 1,0 | Tôi gõ nhẹ lên đầu Bắp một cái. | overShoulder | hero | bap | bedroom | point | neutral | đẩy vào |  |  | sang | nang |  |  |  | Gà giơ tay gõ đầu Bắp |
| 113 |  | 0,79 | ^ | closeup | bap |  | bedroom | idle |  | đẩy vào nhanh |  | cartoon boing@0.5*0.9 | sang | nang |  | sitting | 0,5 | Boang! — đầu Bắp bật lên |
| 114 |  | 1,2 | ^ | establish |  |  | street |  |  | đứng yên |  |  | dem | nang |  |  |  | CẮT ĐEN sau Boang (123,29 s): máy nhìn thẳng lên trời đêm = màn đen, giữ ~1,2 s (camera ghi tay trong shots.js) |

## Cần dựng
- env: bedroom: phòng Gà — giường, Bắp ở chân giường, kệ cạnh cửa sổ, sách, gương đối diện giường (kệ nằm trong góc phản chiếu khi Gà nằm), cửa ra ban công, két góc phòng (giữ bố cục cho cảnh kết)
- env: bakery: góc cận tiệm bánh — quầy có hốc trống, bảng hình bánh mì
- env: tailor: góc cận tiệm may — bàn, hộp nhẫn mở, cuộn chỉ
- env: bearshop: tiệm gấu ông Bách — cửa tiệm, quầy ngoài hiên, thùng in dấu đầu gấu
- env: factory: nhà máy cuối phố — hàng rào, cửa kính, thùng gỗ để đứng, cửa kho, băng chuyền ngắn, kệ gấu mới, bản đồ thị trấn, 2 cụm thùng (đồ dân mất / hàng ông Bách tự giấu)
- env: mayor: nhà thị trưởng — dùng lại mặt nhà phố, bảng hiệu mới, đèn cửa
- env: street: phố chính dọc — nhà Gà (có ban công), tiệm gấu sát vách, tiệm bánh, tiệm may, nhà thị trưởng; ngã ba; 2 mái thấp đối diện; chung khung nhà, đổi bảng hiệu + màu cửa
- prop: bap: gấu bông Bắp stylized, đầu to, thân bo, nơ xanh; rig riêng đầu/2 tay/2 chân (tai theo đầu)
- prop: bear2: gấu biến thể nơ đỏ (nhân bản Bắp)
- prop: bear3: gấu biến thể nơ vàng (nhân bản Bắp)
- prop: dây chuyền, đồng hồ, nhẫn, ví, túi tiền, két tiền tiệm bánh, két Gà, hộp nhẫn, cuốn sách, gương
- prop: dong_ho_quyt: đồng hồ quả quýt nắp vàng + dây xích ngắn (của thị trưởng; khác đồng hồ báo thức của Gà) — kit mới trong engine/props-kb.js
- prop: bảng tin thị trấn: giấy báo mất dán kín
- prop: bản đồ thị trấn: bản đồ trên tường, nhà có gấu đánh dấu đỏ
- prop: chồng thùng in tên tiệm: thùng in chữ "Tiệm gấu Bách" + dấu đầu gấu
- anim: sitUp: bật dậy khỏi giường / gấu ngồi dậy
- anim: climb: trèo (gấu lên kệ, Gà lên thùng gỗ)
- anim: drag: kéo vật (sách, túi tiền)
- anim: vanish: biến mất (thu nhỏ + bụi lấp lánh, VFX)
- anim: peek: ghé mắt nhìn qua kính
- anim: putDown: đặt đồ xuống
- anim: sleepy: ngáp, dụi mắt (thị trưởng mới dậy)
- prop: mu_ga: hero = Gà (engine/ga-rig.js, đã có; bật bằng ga=1) — chỉ Bắp là chưa có
