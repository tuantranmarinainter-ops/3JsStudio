# Ghi chu lop pho

| shot | trang thai | khung engine dang thay gi | con lech gi |
|---|---|---|---|
| S003 | tam | Thay day pho va bien gau. | Thieu canh cua mo va tay nam. |
| S004 | tam | Tho banh sau quay, co gio banh va bien. | Quay va gio che mot phan nguoi; banh tren ke chua ro. |
| S005 | hong | Thay khoang rong xuyen duoi quay. | Thieu lung hoc, vet bot va tay tren mep quay. |
| S006 | tam | Tho may va hop mo ro, cuon chi khong che. | Thieu cua so va ma no canh trong nen. |
| S007 | tam | Can hop mo nhin gan tu tren. | Long hop khac mau, thieu ranh, cuon chi va vai ngoai khung. |
| S008 | tam | Bach, hai be va gau tai quay. | Quay che than Bach; gau chua gan tay, bien gau ngoai khung. |
| S009 | hong | Hai be o quay, mot phan vai Bach. | Gau bi che, thieu dau Bach, be bi toc che mat. |
| S010 | hong | Bach va dan ao xanh canh quay. | To khai cam tay thanh khoi toi, khong thay danh sach. |
| S011 | tam | Bach va xap giay tren quay, vai nguoi nhan. | Khong thay dau nguoi nhan; giay cam toi. |
| S012 | tam | Ba dan doc via he. | Giay cam toi va nguoi sau nho, chua dung bac cua. |
| S013 | tam | Ba nhom tach ra tren pho, goc cao. | Thieu khung cua so; giay cam qua lon va nguoc. |
| S014 | tam | Can truc dien Ga, mat khong bi che. | Tay chua cham nguc; cot den chiem mep tren trai. |
| S015 | tam | Sau lung Ga, thay nha va bien tiem gau. | Cot den van lon; bo cuc nha chua truc dien. |
| S036 | tam | Pho dem, nha doi dien va mot phan mat trang. | Thieu cua so mo va den duong, pho it chieu sau. |
| S039 | tam | Ga ngoi, mat nhin duoc. | Thieu cua mo, den va cot lan can tien canh. |
| S042 | tam | Sau lung Ga, gau tren mai doi dien. | Dau Ga lon; khong thay nha may va ong khoi. |
| S043 | tam | Gau can gan, nhan truoc nguc. | Nhan lon va khong nam trong hai tay, mat gau khac mau. |

| S044 | tam | Ga chay du than, mat ro ben pho. | Khong thay bac cuoi va mai doi dien; chan tay R6 cung. |
| S045 | tam | Ba gau tach nhau, Ga phia sau, tui tien ben gau nau. | Vi va nhan khong doc duoc; nha may khong thay. |
| S046 | tam | Goc cao thay ba gau dang chu Y va Ga phia sau. | Gau nho, vi va nhan khong doc duoc; thieu cong nha may. |
| S047 | tam | Gau xam thay ro tu dau den chan. | Vi khong hien ro; vat lon mau toi lo tren trai. |
| S048 | dat | Gau nau va tui tien du khung, goc may thap. | Tui mau vang, dang khac bao vai; tay gau khong nam day. |
| S067 | tam | Ga duoi bac, thi truong dung cao trong cua. | Thay lung Ga thay vi mat nghieng; cot che mot phan chan. |
| S068 | tam | Mat Ga ro, vai thi truong o mep phai. | Chan Ga bi cat; tay R6 cung, mat dan. |
| S069 | tam | Can thi truong trong cua. | Thieu dau va vai Ga tien canh; toc che mot phan mat. |
| S070 | dat | Can thi truong nhin cheo tu ngoai cua. | Toc che mot phan mat; tay R6 cung, mat dan. |

| S071 | tam | Ga quay lung, thi truong lo mot phan trong cua. | Cua chua co khe sang hep, thi truong lo nhieu. |
| S072 | hong | Thi truong chay den truoc nha. | Thi truong che mat Ga, quay lung may; chua thay dung bac cua. |
| S073 | hong | Hai nguoi dung gan nhau truoc day nha. | Thi truong che mat Ga, thu tu va goc nhin chua dung. |
| S074 | hong | Dong ho nam ngang truoc ao vest. | Thieu tay va xich, dong ho khong treo doc. |
| S075 | hong | Can nguc thi truong va tay dua len. | Tay khong cham tui; khong co mieng tui mo. |
| S076 | tam | Ga, thi truong va hai linh tren pho. | Ga bi vat chan mot phan; nha may va ong khoi khong thay. |
| S077 | tam | Hai linh theo sau Ga va thi truong. | Thieu nha may, ong khoi va hang rao. |
| S092 | hong | Bach o truoc cua huong ve thi truong. | Cot che gan het thi truong, hai mat chua cung ro. |
| S093 | tam | Can Bach quay nghieng, dua tay truoc nguc. | Toc che mot phan kinh va mat. |

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

## Luot kiem tra S071-S077, S092-S093

- Da chay va mo tung anh ghep ba vong; anh xem la vong cuoi.
- S072-S073: Ga [-8.6,1.3,25]; thi truong chay tu [-4.5,0.4,30] den [-6.5,0.4,28] va dung tai do.
- S074-S075: thi truong [-8,0.4,32]; dong ho S074 [-7,3.6,32.6]. Can noi lai vi tri voi S073.
- S076: Ga [-9.5,0.4,27], thi truong [-6,0.4,33], hai linh [-1.5,0.4,23] va [3,0.4,23].
- S077: Ga [-3.4,0.4,21] di den [-3.4,0.4,17]; thi truong [-6,0.4,27], linh [-9,0.4,33] va [0,0.4,33].
- S092-S093 giu Bach [-11.5,2.8,-66.2], thi truong [-15.2,2.8,-69].

CAN ENGINE: S071 cua can khep hep theo shot va co vet sang am.
CAN ENGINE: S074 can mat dong ho dung doc, gan voi tay va co xich; S075 can mieng tui ao mo.
CAN ENGINE: S076-S077 can thay nha may va hang rao tu khu nha Ga.
CAN ENGINE: S093 can sua toc khong che mat va kinh Bach.

## Luot sua sau phe binh pho 4 v1

- Da chay dung lenh va mo tung anh ghep bon vong; anh xem la vong bon.
- Cua nha Ga tam [-14,1.3,27], cot den [-10.2,26]. S072-S073 Ga [-12.5,1.3,28.5], thi truong den [-7.5,0.4,32]; S074-S075 giu moc nay.
- S076 Ga [-12,1.3,30], thi truong [-2,0.4,34], linh [-5,0.4,24] va [-0.5,0.4,24]. S077 Ga [-5,0.4,23] den [-5,0.4,19], thi truong [-8,0.4,28] den [-8,0.4,24].
- S092 Bach [-11,2.8,-64.7], thi truong [-15.2,2.8,-69.5]; goc vong bon bi cot va Bach che, can dung lai.

CAN ENGINE: S071 cho phep kit dieu khien cua hep thay fn setDoor cua shot, va tao vet sang am trong khe.
CAN ENGINE: S074 dong ho can xoay dung va noi xich tu tay; S075 can mieng tui ao mo.
CAN ENGINE: S076-S077 can nha may, ong khoi va hang rao nhin duoc tu khu nha Ga; nha may hien o nhanh dong x=112..152, z=-110..-72.

## Luot sua sau phe binh pho 4 v2

- Da chay va mo tung anh ghep bon vong; anh xem la vong bon.
- S072-S073: Ga [-11,0.4,21], thi truong chay tu [-3,0.4,26] den [-7.5,0.4,24]; can dung lai de tranh che mat va noi voi cua nha Ga.
- S074-S075: thi truong [-7.5,0.4,24], dong ho [-6.5,3.4,24.7].
- S076: Ga [-11,0.4,21], thi truong [-7.5,0.4,30], linh [-3,0.4,24] va [0,0.4,23]; S077 di ve bac tu khu nha Ga.
- S092: Bach [-12,2.8,-66], thi truong [-15.2,2.8,-69.2]; goc cuoi bi cot che, can dung lai.

CAN ENGINE: S071 can cho kit dieu khien cua khep hep va tao vet sang am.
CAN ENGINE: S074 can xoay dong ho dung doc va noi xich vao tay; S075 can mieng tui ao mo.
CAN ENGINE: S076-S077 can nha may, ong khoi va hang rao nhin duoc tu khu nha Ga.
CAN ENGINE: S093 can sua toc mai de khong che kinh va mat Bach.

## Luot sua sau phe binh pho 5 v1

- Da chay va mo anh ghep 18 shot hai vong; S007, S043 ba vong; S009, S011, S075, S076, S077 bon vong. Lenh tra ma 1 sau khi xuat anh va canh bao che khuat; anh da mo xem.
- Tiem may: cuon chi [99.6,2.8,-5.7], [100.9,2.8,-5.4], [102.1,2.8,-5.8]; hop nhan [104.5,2.8,-7]. S006 may sau cuon chi, con che va hop nho.
- Quay gau [-12.3,3.15,1.4], Bach [-14.4,0.4,1.4]; S011 xap giay dat tren quay qua goc prop [-12.3,0.4,1.4].
- S076 Ga [-10.5,0.4,27], thi truong [-5.7,0.4,33], linh [-3,0.4,23] va [-0.3,0.4,22]. S077 Ga [-2,0.4,20] den [-2,0.4,16], thi truong [-6,0.4,26] den [-6,0.4,22], hai linh tu z=32 den z=28.
- S042 Bap [9.8,9.2,27], S043 giu cung moc; nhan [9.3,9.5,27.7] o truoc bung nhung qua lon.

CAN ENGINE: S003 va S013 can cua hoac khung cua so mo de may nhin ra pho.
CAN ENGINE: S005 can lung hoc va vet bot; S007 can ranh trong long hop va dua cuon chi, vai vao gan hop.
CAN ENGINE: S010-S013 can sua diem gan, huong va ti le to khai cam tay de thay mat giay.
CAN ENGINE: S075 can mieng tui ao mo doc duoc; S042, S076-S077 can nha may va ong khoi nhin thay tu nha Ga.
CAN ENGINE: S043 can nhan nho hon va diem gan truoc bung gau.

## Luot sua sau phe binh pho 5 v2 - tiep

- Da chay 17 shot mot vong, 10 shot vong hai, S075 S009 S011 vong ba; da mo tat ca anh sau moi lan chay. Lenh tra ma 1 vi canh bao che khuat, anh van duoc xuat.
- S006: may [105.7,4.3,-3.8], tho [102.8,0,-9.4], hop [104.5,2.8,-7]; mat ban y=2.8.
- S004: gio banh [-1.2,3.15,-4.9], quay y=3.15; S005 hoc x=3..6.6 xuyen qua quay.
- S076: Ga [-10,0.4,29], thi truong [-5,0.4,34], linh [-4,0.4,22] va [1,0.4,22]. S077 Ga [-2,0.4,23] den [-2,0.4,19], thi truong [-6,0.4,27] den [-6,0.4,23].
- S042 va S043 Bap [9.8,9.2,27]; nhan S043 [9.6,9.8,27.6]. S039 da thu may phia ngoai lan can nhung bi che kin, tra ve goc thay mat.

CAN ENGINE: S003 va S013 can cua mo hoac khung cua so nhin ra pho; S039 can cua ban cong mo va den gan cua.
CAN ENGINE: S005 can lung hoc va vet bot hinh chu nhat; S007 can long hop co ranh va cuon chi, vai gan hop.
CAN ENGINE: S010-S013 can to khai dung ti le, huong va diem gan tay; S009 can gan gau vao tay de tranh che.
CAN ENGINE: S075 can mieng tui ao mo; S042 S076 S077 can nha may va ong khoi thay duoc tu khu nha Ga.
CAN ENGINE: S043 can nhan nho hon va gan giua hai tay gau.
