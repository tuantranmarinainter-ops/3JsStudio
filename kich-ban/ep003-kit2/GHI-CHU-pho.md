# Ghi chu lop pho

| shot | trang thai | khung engine dang thay gi | con lech gi |
|---|---|---|---|
| S003 | tam | Pho va bien gau ro. | Thieu canh cua mo va tay nam tien canh. |
| S004 | tam | Tho banh va gio banh tren quay. | Quay con che than; ke banh chua ro. |
| S005 | hong | Goc thay khoang trong duoi quay va mot phan tay. | Hoc xuyen suot, thieu lung va vet bot. |
| S006 | tam | Tho may va hop mo ro tren ban, khong bi cuon chi che. | Hop nho, thieu cua so va ma no canh. |
| S007 | tam | Hop mo o gan giua khung nhin tu tren. | Thieu ranh nhan, cuon chi tim va vai o mep khung. |
| S008 | tam | Bach, hai be va gau tai quay. | Bach bi quay che; gau chua gan tay, bien gau bi cat. |
| S009 | tam | Hai be va gau truoc nguc, mot phan vai Bach. | Gau nho, Bach thieu dau, toc che mat be vang. |
| S010 | hong | Bach va nguoi ao xanh deu thay mat. | Khong doc duoc to danh sach tren tay. |
| S011 | tam | Bach va xap giay tren quay. | Nguoi nhan gan nhu ngoai khung; mai hien che dau Bach. |
| S012 | hong | Ba nguoi noi nhau tren via he. | Giay cam thanh khoi toi, hai nguoi sau bi che. |
| S013 | tam | Ba nhom tren pho nhin tu tren. | Khong co khung cua so; giay qua lon va nguoc. |
| S014 | tam | Can truc dien Ga, mat khong bi che. | Tay chua cham nguc; cot den chiem mep tren trai. |
| S015 | tam | Sau lung Ga, nha Ga va bien tiem gau. | Cot den van giua khung, Ga lech phai. |
| S036 | tam | Pho dem, nha doi dien va mot phan mat trang. | Thieu cua so mo va den duong, pho it chieu sau. |
| S039 | tam | Ga ngoi tren ban cong, mat nhin duoc. | Khong thay cua mo va den tuong, khong thay cot tien canh. |
| S042 | tam | Sau lung Ga, Bap nho tren mai doi dien. | Dau Ga lon; nha may va ong khoi bi day nha che. |
| S043 | hong | Can Bap ngoi tren mai. | Nhan tach khoi tay va khoi khung; mep mai chua ro. |

| S044 | tam | Ga chay du than, mat ro ben pho. | Khong thay bac cuoi va mai doi dien; chan tay R6 cung. |
| S045 | tam | Ba gau tach nhau, Ga phia sau, tui tien ben gau nau. | Vi va nhan khong doc duoc; nha may khong thay. |
| S046 | tam | Goc cao thay ba gau dang chu Y va Ga phia sau. | Gau nho, vi va nhan khong doc duoc; thieu cong nha may. |
| S047 | tam | Gau xam thay ro tu dau den chan. | Vi khong hien ro; vat lon mau toi lo tren trai. |
| S048 | dat | Gau nau va tui tien du khung, goc may thap. | Tui mau vang, dang khac bao vai; tay gau khong nam day. |
| S067 | tam | Ga duoi bac, thi truong dung cao trong cua. | Thay lung Ga thay vi mat nghieng; cot che mot phan chan. |
| S068 | tam | Mat Ga ro, vai thi truong o mep phai. | Chan Ga bi cat; tay R6 cung, mat dan. |
| S069 | tam | Can thi truong trong cua. | Thieu dau va vai Ga tien canh; toc che mot phan mat. |
| S070 | dat | Can thi truong nhin cheo tu ngoai cua. | Toc che mot phan mat; tay R6 cung, mat dan. |

| S071 | tam | Ga quay lung, thi truong lo ben cua. | Cua mo rong, khong co khe va vet sang hep. |
| S072 | tam | Thi truong chay toi Ga, hai mat nghieng. | Cot che mot phan, cua va bac chua ro. |
| S073 | tam | Ga va thi truong dung gan doi mat. | Mat gan cham nhau; cot che, cua chua ro. |
| S074 | hong | Ao, tay va dong ho truoc nguc. | Dong ho nam ngang, tach tay, thieu xich; canh chua du can. |
| S075 | hong | Can than ao va mot phan tay thi truong. | Thieu mieng tui mo, tay chua ven tui va con lo cam. |
| S076 | hong | Thi truong quay lung, Ga o ria trai va hai linh tren pho. | Ga bi cat, mot linh bi che, nha may khong thay. |
| S077 | hong | Nhom di tren pho nhin tu sau. | Ga bi linh che, nha may khong thay, hai linh bi cat mep. |
| S092 | tam | Bach va thi truong doi dien o cua. | Bach sat mep, mat nghieng kho doc, than bi cat. |
| S093 | tam | Can Bach nhin sang phai, tay dua truoc nguc. | Toc va kinh che mat, tay chua cham nguc. |

## Moc da chot

- Pho: +X dong, +Z nam; duong x=0, via he y=0.4. Quay tiem gau tam [-12.3,3.15,1.4]; Bach [-14.4,0.4,1.4], khach phia dong x gan -10.
- S010 to_khai [-12.3,0.4,2.8], S011 xap_to_khai [-12.3,0.4,1.4]: goc props kem be, khong phai mat giay.
- S012 ba dan o [-10,0.4,12], [-10,0.4,1], [-10,0.4,-11.2]. S013 cac nhom tu z=14 den z=-2; can noi canh.
- S014 Ga [-11.2,0.4,29]; S015 Ga [0,0.4,23], nhin ve nha Ga.
- Tiem banh: mat quay y=3.15, tam z=-5.5, hoc x=3..6.6; nguoi ban [1.4,0,-7.9], gio banh tren quay [-1.2,3.15,-4.9].
- Tiem may: tho may [102.8,0,-9.4], hop nhan [104.5,2.8,-7]; S006 va S007 chung moc.
- Ban cong san y=9.5; S039 Ga [-12.4,9.5,34.3], ngoi. S042 Ga [-11.5,9.5,36.2]; S042 va S043 Bap [9.8,9.2,27] tren mai doi dien.
- Luot sua S004, S005, S015, S036, S039, S042, S043: chay va mo anh ghep bon vong; anh trong xem la vong cuoi.

- S044 Ga chay tu [-8,0.4,27] den [-8,0.4,23]. S045-S046 o nga ba z=-91; S047-S048 o nhanh dong x=23..24.
- S067-S070: thi truong gan [-15.2,2.8,-68], Ga gan [-10.6,0.4,-67]; S068 va S069 co dich tien canh de thu khung.
- S044-S048, S067-S070: da chay va mo anh ghep bon vong; anh xem la vong cuoi.

CAN ENGINE: S005 can lung hoc go va vet vuong sach giua lop bot; hoc hien tai xuyen suot.
CAN ENGINE: S007 can long hop co ranh cam nhan va vai may o tren ban.
CAN ENGINE: S003, S013, S036, S039 can cua va khung cua so mo, nhin tu trong ra pho ma khong bi tuong dac chan.
CAN ENGINE: S042 can bo cuc nha may va ong khoi doc duoc tu ban cong; nha may hien o [112..152,-112..-72], bi cac nha pho che.
CAN ENGINE: S043 can gan nhan vao tay gau o truoc bung; tu the sit hien lam nhan tach tay.
CAN ENGINE: To khai va xap to khai can bo be hong, gan duoc vao tay va co dau gau de S010-S013 doc ro.
CAN ENGINE: Ho tro gan gau vao tay cho dong tac trao, nhan va om trong S008-S009.
CAN ENGINE: Can tu the tay cham nguc cho S014.

CAN ENGINE: S045-S047 can gan nhan va vi dung ty le truoc nguc gau; vi thu dat hien thanh vat toi lon, khong doc duoc.
CAN ENGINE: S045-S046 can nhin thay cong va nha may tu nga ba; hien chi thay day nha.
CAN ENGINE: S048 can bao vai va day keo noi vao gau; tui hien la hinh vang ky hieu tien.
CAN ENGINE: S044 can bac thang xuong tu nha Ga va mai doi dien doc duoc trong cung khung.

- S071 Ga [-10.6,0.4,-68], thi truong ngu [-15.2,2.8,-70]; fn shot goc ep cua mo.
- S072-S073 Ga [-8.6,1.3,25], thi truong den [-7,0.4,26]; co dich khoi cua de tranh vat chan.
- S074-S075 thi truong [-8,0.4,32], dong ho [-7,3.6,32.6]; can noi lai truc va vi tri voi S073.
- S076 va S077 da chuyen ve khu nha Ga; vi tri moi o muc Luot sua pho 5.
- S092-S093 Bach [-11.5,2.8,-66.2], thi truong [-15.2,2.8,-69].
- Luot nay da chay va mo anh ca chin shot bon vong; anh xem la vong cuoi.

CAN ENGINE: S071 cho envArg cuaThiTruong uu tien hon fn setDoor cua shot va tao vet sang hep trong khe.
CAN ENGINE: S074 cho xoay dong ho qua quyt theo truc dung va gan xich tu tay toi dong ho; S075 can mieng tui ao mo doc duoc.
CAN ENGINE: S093 can chinh toc mai Bach khong che kinh va mat.
CAN ENGINE: S076 can nhin thay nha may tu pho gan nha Ga; nha may hien nam xa o nhanh dong.

## Luot sua pho 5

- Da xem anh ghep tat ca 18 shot: hai vong chung; S006, S075, S076, S009, S011 them vong thu ba.
- Tiem may: ban mat y=2.8, cuon tim tai [99.6,2.8,-5.7], [100.9,2.8,-5.4], [102.1,2.8,-5.8]; hop [104.5,2.8,-7].
- S076: Ga [-10.7,0.4,26], thi truong [-9,0.4,32], linh [-3,0.4,23] va [1.5,0.4,23]. S077 bat dau gan nha Ga va di ve bac, khong nhay toi cong.
- S010-S013 dung giu to_khai theo yeu cau; anh cho thay vat cam co be toi va khong doc duoc.

CAN ENGINE: S010-S013 sua diem gan va huong to_khai khi cam tay, bo be toi va lam dau gau doc duoc.
CAN ENGINE: S075 can mieng tui ao mo doc duoc.
CAN ENGINE: S076-S077 can thay nha may tu khu nha Ga; vi tri hien tai bi day nha pho che.

## Luot sua sau phe binh pho 5 v2

- Da chay va mo anh 17 shot hai vong; anh trong xem la vong hai.
- S006: may [105.9,3.9,-3.5], hop [104.5,2.8,-7]; ban mat y=2.8.
- S009: gau [-9.65,2.1,-0.8]; S010 dan xoay 35 do; S011 dan [-9,0.4,7].
- S076: Ga [-10.8,0.4,28], thi truong [-6,0.4,33]; S077 Ga [-2.8,0.4,21] den [-2.8,0.4,17]. Can noi lai nhom khi sua tiep.
- S039 thu goc sau lan can nhung bi chan kin; da tra goc thay mat. S003 thu lui vao canh cua nhung cot che pho; da tra goc pho.

CAN ENGINE: S003 va S013 can cua mo va khung cua so that de nhin tu trong ra ngoai.
CAN ENGINE: S005 can lung hoc va vet bot; S007 can long hop co ranh va bo cuc vai, cuon chi gan hop.
CAN ENGINE: S010-S013 can to khai dung ty le, huong va gan tay de thay mat giay.
CAN ENGINE: S075 can mieng tui ao mo; S042, S076-S077 can nha may va ong khoi nhin thay tu nha Ga.
CAN ENGINE: S043 can gan nhan truoc bung gau thay vi de tach ben hong.
