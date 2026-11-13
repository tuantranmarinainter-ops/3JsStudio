# Ghi chu lop pho

| shot | trang thai | khung engine dang thay gi | con lech gi |
|---|---|---|---|
| S003 | tam | Pho va mot phan bien gau. | Cot den che giua; thieu cua mo va tay nam. |
| S004 | tam | Tho banh cui ben gio banh. | Quay che than, bien banh bi cat. |
| S005 | hong | Hoc trong chinh dien va mot phan tay. | Hoc xuyen suot, thieu lung va vet bot; tay duoi mat quay. |
| S006 | dat | Tho may cui nhin ve hop nhan mo. | Tay cung va mat dan theo gioi han engine. |
| S007 | tam | Hop nhan mo lon o giua ban. | Thieu ranh nhan trong long hop va vai o goc. |
| S008 | tam | Bach, hai be va gau o quay. | Bach va be ngoc bi che; thieu bien gau; quay va hien lon. |
| S009 | tam | Hai be va gau qua tay Bach. | Dau Bach ngoai khung; quay che be vang va gau. |
| S010 | tam | Bach, dan ao lam va to khai tren quay. | Giay chua cam; quay va hien lon, thieu bien gau. |
| S011 | tam | Bach, xap giay va than nguoi nhan tien canh. | Dau nguoi nhan ngoai khung, xap giay nho va thieu dau gau. |
| S012 | tam | Ba dan va ba to khai doc pho. | Be hong lo ro, nguoi nho, chua thay ba bac cua rieng. |
| S013 | tam | Goc cao gan nha Ga, nam nguoi thanh nhom theo chieu sau. | Thieu phieu va bau cua; bien gau bi cat. |
| S014 | tam | Can truc dien Ga, mat khong bi che. | Tay chua cham nguc; cot den chiem mep tren trai. |
| S015 | tam | Sau dau Ga va mat tien nha. | Cot den che cua, ban cong va tiem gau chua ro. |
| S036 | tam | Pho dem, nha doi dien va mot phan mat trang. | Thieu cua so mo va den duong, pho it chieu sau. |
| S039 | tam | Ga ngoi, thay mat va chan ben cua so sang. | Khong thay cua mo va den; chan thang theo rig. |
| S042 | tam | Qua vai Ga thay Bap tren mai doi dien. | Pho hep, nha may va ong khoi khong ro. |
| S043 | tam | Bap ngoi tren mai, pho dem phia sau. | Nhan tach tay, mot phan chan cham mai. |

| S044 | tam | Ga chay du than, mat ro ben pho. | Khong thay bac cuoi va mai doi dien; chan tay R6 cung. |
| S045 | tam | Ba gau tach nhau, Ga phia sau, tui tien ben gau nau. | Vi va nhan khong doc duoc; nha may khong thay. |
| S046 | tam | Goc cao thay ba gau dang chu Y va Ga phia sau. | Gau nho, vi va nhan khong doc duoc; thieu cong nha may. |
| S047 | tam | Gau xam thay ro tu dau den chan. | Vi khong hien ro; vat lon mau toi lo tren trai. |
| S048 | dat | Gau nau va tui tien du khung, goc may thap. | Tui mau vang, dang khac bao vai; tay gau khong nam day. |
| S067 | tam | Ga duoi bac, thi truong dung cao trong cua. | Thay lung Ga thay vi mat nghieng; cot che mot phan chan. |
| S068 | tam | Mat Ga ro, vai thi truong o mep phai. | Chan Ga bi cat; tay R6 cung, mat dan. |
| S069 | tam | Can thi truong trong cua. | Thieu dau va vai Ga tien canh; toc che mot phan mat. |
| S070 | dat | Can thi truong nhin cheo tu ngoai cua. | Toc che mot phan mat; tay R6 cung, mat dan. |

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
