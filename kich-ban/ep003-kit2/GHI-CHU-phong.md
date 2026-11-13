# Ghi chu lop phong - ep003

| shot | trang thai | khung engine dang thay gi | con lech gi |
|---|---|---|---|
| S001 | dat | Can chot gai tren cua, thay ngam | Chot sang bac hon mau; num cua lot phia duoi. |
| S002 | tam | Can vet day, sach va canh cua so | Thieu vet nang cheo; vet day lon hon mau. |
| S016 | tam | Toan than Ga canh ke va cua so, tay dua ra | Dau tay gan ke nhung chua thay ro cham mat ke. |
| S017 | tam | Vet day ro, sach ben trai, tay ao ben phai | Thieu cua so; sach doi cho rieng shot. |
| S018 | tam | Mat buon, hai tay va cua so | Tay cung chua khep truoc nguc; cua so o trai thay vi ben phai. |
| S019 | tam | Can mat va than tren, cua so sau lung | Tay bi cat; dau shot mat buon roi moi quyet tam. |
| S020 | tam | Ga cam dong ho, giuong, cua so va den | Thieu guong; mat dong ho kho doc, khung con qua rong. |
| S021 | tam | Dong ho va sach ro, hai tay ben trai | Hai tay chua o hai ben dong ho. |
| S022 | tam | Giuong, Bap tren chan, den va cua so | Mat Ga bi che; Bap ngoi, dong ho ngoai khung, may con cao. |
| S023 | tam | Guong phan chieu ke, sach va dong ho | Thieu dau Ga o tien canh; cua so chua ro. |
| S024 | tam | Dong ho va sach trong guong, sach ben phai | Thieu khung guong va giuong tien canh; sach doi cho rieng shot. |
| S025 | tam | Can mat Ga tren goi | Ga nam ngua, thieu chan sat mat va goc guong. |
| S026 | tam | Bap ngoi trong guong | Thieu cua so, den, ke va dong ho; khung guong bi cat. |
| S033 | tam | Sau dau vai Ga, cua so va mot phan ke | Tay cung, ke con bi cat. |
| S095 | tam | Day chuyen o giua va hai tay hai ben | Day cung chua noi hai tay, canh chua du can. |
| S097 | tam | Long ket mo, dau day sat tay ao | Than ao che trai; chua thay ro canh cua ket, day cung. |
| S099 | tam | Bap canh ket dang nang, Ga phia sau | Hai nguoi chong nhau, sai vi tri cua va trai phai; Bap chua om ket. |

| S027 | dat | Can truc dien Bap, no xanh, den va cua so | Mau gau va mat dan khac anh mau. |
| S028 | tam | Bap o chan giuong, mat Ga va dong ho lo | Mat Ga sat mep khung; chan chua phu than, khung rong. |
| S029 | tam | Bap ben hong ke, dong ho tren mat ke thay ro | Tay chua bam mep, chan treo. |
| S030 | dat | Bap ngoi tren ke, dong ho truoc bung, sach ben phai | Tay gau chua om dong ho; model gau va mat dan khac mau. |
| S031 | tam | Bap dung san, dong ho truoc bung, sach o tang giua | Tay chua cham sach; sach doi vi tri rieng shot. |
| S032 | dat | Ga ngoi tren giuong, nhin sang phai | Ke ngoai khung; tay R6 cung. |
| S034 | dat | Sau lung Ga truoc cua so dang mo, co giuong | Tay R6 cung; dau giuong che mot phan than. |
| S035 | tam | May ngoai nha nhin cheo, Ga nho ra cua va nhin xuong | Thieu canh pho dem, thanh cua che mot phan mat. |
| S037 | tam | Nhan sat dau tay, canh sach; thay mot phan tay ao | Tiep xuc chua ro, goc may con doc, thieu mep cua so. |

## Moc da chot

- Phong goc tai tam san; +X dong, +Y len, +Z nam. Giuong x=-4.81, mat y=2.24; ke mat y=3.22, z=-8.14; ket tam day [-5.12,0,7.23].
- Dong ho tren ke [3.85,3.22,-8.09], sach [5.05,3.22,-8.19], vet day [2.55,3.22,-8.04]. Ga nam goc [-4.81,3.14,-0.9]; Bap ngoi [-3.5,2.24,-0.2].
- S023 dung guong mac dinh; S026 dung guongRy=-2.288, guongSang=2.4. S097 ketMo=1; S099 ketY tu 0.05 den 0.55.
- S016-S017 Ga gan phia tay ke; S018-S019 Ga quanh [1.3,0,-5.5]. S022-S025 giu moc giuong; S024 chi lay phan chieu.
- S099 hien dat Ga [-6.1,0,7.5] de thu bo cuc, nhung bi ket che va xa cua; can sua tiep.
- Cac dong ngoai tam shot duoc giao phuc hoi tu ghi chu cu bi hong; trang thai cu giu nguyen, chua kiem tra lai.
- Luot sua S002, S016, S017, S019, S021, S022, S024, S025: da chay 4 vong va mo ca 8 anh vong cuoi. Cac shot nay deu con lech, giu tam.
- S024 dat sach rieng tai [2.8,3.22,-8.19] de anh guong hien sach ben phai dong ho; khong khop moc sach cac shot khac.

## Can engine

CAN ENGINE: S022 can chan phu than Ga dang nam va tu the Bap nam o chan giuong.
CAN ENGINE: Day chuyen mem noi tay va roi xuong dem ket cho S095-S097; model hien tai la vong cung va mat tron.
CAN ENGINE: S026 can giai phap phan chieu dong thoi Bap va ke co dong ho, sach tu goi; goc guong da thu chi thay Bap va tuong.
CAN ENGINE: S099 can tu the Bap ghi thuc su vao ket dang nang va bieu cam gau sat mau.

CAN ENGINE: S002 can vet nang chieu len mat ke gan vet day.
CAN ENGINE: S022 can chan phu dung than Ga ma van de lo mat; chanPhu hien khong che duoc than o moc nam hien tai.

- Luot nay chay 3 lan co anh va 1 lan loi timeout, da mo xem ca 6 anh sau moi lan co anh. Ca 6 shot con tam.
- S017 dat sach tai [1.2,3.22,-8.44] rieng shot de lo vet day; chua khop moc sach chung.
- S022 Bap dat tren chan tai [-3.2,3.65,-0.5], tu the ngoi; chua khop tu the nam va moc cac shot sau.

- Luot S027-S032, S034-S035, S037: da chay 4 vong va mo du 9 anh moi vong; vong cuoi co canh bao che mat S035.
- S027 Bap [-3.5,2.24,-0.2]; S028 Bap [-3.5,2.24,-0.2], Ga nam [-5.3,3.14,-1.1]. S029 Bap [0.65,1.15,-7.45], dong ho [2.5,3.22,-7.95] rieng shot.
- S030 Bap [3.45,3.22,-8.04], dong ho [3.45,3.35,-7.55]; S031 Bap [3.3,0,-6.95], dong ho [3.15,0.55,-6.48], sach [4.55,1.68,-7.65] rieng shot.
- S032 Ga ngoi [-4.81,2.24,-3.6], ry 35; S034 Ga [-2.4,0,-7.6]; S035 Ga [-2.8,0.4,-8.55]. S037 nhan [4.25,3.22,-7.8], Ga [2.9,0,-6.65].

CAN ENGINE: S028 can chan phu than Ga khi nam nhung de lo mat tren goi.
CAN ENGINE: S035 can canh pho dem ngoai cua so nhin tu mat tien.

- Luot sua S028, S029, S031, S032, S035, S037: da chay 4 vong va mo du 6 anh moi vong; S032 dat, 5 shot con tam.
CAN ENGINE: S029 can pose gau bam mep ke bang hai tay; pose thu tren model gau chua dua tay toi mep.

- Luot sua S029, S031, S035, S037: 4 lan chay, 3 lan co anh da mo du 4 anh, lan thu 3 timeout. Ca 4 con tam.
CAN ENGINE: S031 can pose Bap vua om dong ho vua dua tay cham sach; pose thu chua hien duoc dong tac.
