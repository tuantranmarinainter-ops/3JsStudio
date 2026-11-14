# python tools/tong-ket-trang.py  — trang TỔNG KẾT gộp: token + thời gian + việc sửa theo tập, ưu/nhược từng phương pháp, đánh giá và khuyến nghị.
# Nguồn số: output/artifact/token/du-lieu.json (tools/thong-ke-token.py) + output/artifact/sua/du-lieu.json (agent lập từ git/handoff).
# Phần ưu/nhược, đánh giá, khuyến nghị là nhận định của Claude (phiên điều phối, 2026-11-14) — sửa trực tiếp trong file này.
import json, os, html
R = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
TK = json.load(open(R + '/output/artifact/token/du-lieu.json', encoding='utf-8'))['tap']
SU = json.load(open(R + '/output/artifact/sua/du-lieu.json', encoding='utf-8'))
e = lambda s: html.escape(str(s if s is not None else ''))
NH = SU['nhom']
PP = [
 dict(k='rb', ten='Tập 1', phim='Nhà có chân — bản Roblox Studio', pp='Dựng thẳng trong Roblox Studio', vao='Ý tưởng + video tham chiếu', shot=141,
      kq='Đã dừng, chuyển sang three.js', thieu='Số token, giờ máy và việc sửa của Tập 1 KHÔNG đầy đủ: phần lớn công việc làm bằng một tài khoản Claude khác, nhật ký không nằm trên máy này. Các số ở đây chỉ là phần thấy được, không dùng để so với ba tập còn lại.',
      uu=['Hình ảnh đúng chất Roblox thật: ánh sáng, vật liệu, thân R6 và kho tài sản có sẵn', 'Không phải tự viết engine'],
      nhuoc=['Claude không tự chạy, tự chụp, tự xuất video trong Studio được: mỗi vòng thử cần người thao tác', 'Không tua tới lui cho ra cùng một hình, nên khó kiểm bằng số', 'Không có lịch sử từng lần sửa (không git), khó quay lại', 'Dừng giữa chừng: 6 việc còn tồn, không ra video']),
 dict(k='ep1', ten='Tập 2', phim='Ngôi nhà biết đi', pp='three.js, dựng theo video tham chiếu cắt thành 145 shot', vao='Video mẫu → 5.132 khung hình + danh sách cắt + lời kể', shot=145,
      kq='Hoàn chỉnh nhất: có bản xuất MP4, còn 3 việc tồn',
      uu=['Mỗi shot có khung hình chuẩn để so, nên "đúng hay sai" rõ ràng', 'Cho ra kết quả tốt nhất và là chuẩn chất lượng cho các tập sau', 'Để lại tài sản dùng lại: engine, trình phát/studio, hệ vật liệu, bầu trời, âm thanh nhiều lớp'],
      nhuoc=['Đắt nhất: 64 triệu token mới và 98 giờ máy (gồm cả công dựng nền)', 'Bối cảnh và đạo cụ dựng tay bằng code: 29 trên 52 việc sửa rơi vào hai nhóm này', 'Phụ thuộc một video mẫu có sẵn, không dùng được cho câu chuyện tự nghĩ', 'Góp ý bằng mắt qua nhiều đợt (40 ghi chú trong một đợt)']),
 dict(k='ep2', ten='Tập 3', phim='Món đồ biến mất trong phòng khóa kín', pp='three.js, từ kịch bản chữ + file giọng mẫu qua dây chuyền tự động', vao='Kịch bản chữ + giọng đọc', shot=104,
      kq='Tạm gác ở bản xem thử, còn 15 việc tồn',
      uu=['Đầu vào rẻ và nhanh nhất: chỉ cần chữ và giọng', 'Khớp giọng bằng số, không cần người canh (lệch tối đa 0,14 giây)', 'Dùng lại được engine, nên rẻ hơn Tập 2 khoảng bốn lần'],
      nhuoc=['Không có chuẩn hình: máy tự đoán bố cục, bản đầu "rất không ổn" (đạo cụ khối, 3 bối cảnh, 81/114 shot đêm)', 'Sửa theo từng góp ý lẻ: 12 việc về shot, 14 về đạo cụ, nhiều việc phải đoán ý người dùng', 'Tập mẫu thiếu nhiều thứ của lõi chung (trời, đèn đêm, phụ đề từng chữ), phải vá tay', 'Lỗi chỉ lộ khi người dùng xem: âm nền sai, màn hình đen 51 giây cuối phim']),
 dict(k='ep3', ten='Tập 4', phim='Gà và Bắp — theo storyboard 104 khung', pp='three.js, theo storyboard ảnh + bộ thiết kế + số đo camera của Codex', vao='104 khung storyboard + ảnh nhân vật, bối cảnh, 37 biểu cảm + giọng', shot=104,
      kq='Đang dựng: phần lớn shot chưa khớp khung gốc, 12 việc tồn',
      uu=['Có chuẩn hình cho từng shot và thiết kế nhân vật, bối cảnh, biểu cảm sẵn', 'Chấm được từng shot đạt / lệch / hỏng so với ảnh gốc', 'Câu chuyện tự nghĩ, không phụ thuộc video mẫu'],
      nhuoc=['Ảnh 2D không có toạ độ: lần soi độc lập đầu chỉ 1/104 shot đạt, 45 hỏng', 'Phụ thuộc Codex đo: 4 lượt chạy vẫn chỉ giải được 2/104 vị trí máy, dữ liệu còn bị hỏng dấu tiếng Việt', 'Vòng sửa dài mà tiến chậm: dựng lại phòng Gà chỉ nâng từ 1 lên 2 shot đạt trong 35', 'Trang nặng: 132 shader, mở mất 19 giây vì dựng cả thị trấn không dùng tới']),
]
SU_BY = {t['ten']: t for t in SU['tap']}
for p in PP:
    c = TK.get(p['k'], {}); s = SU_BY.get(p['ten'], {'muc': []})
    p.update(tong=c.get('tong', 0), moi=c.get('moi', 0), gio=c.get('gio', 0), luot=c.get('luot', 0), tu=c.get('tu', ''), den=c.get('den', ''),
             muc=s['muc'], sua=len(s['muc']), ton=sum(1 for m in s['muc'] if m.get('con_ton')), vong=s.get('so_vong_gop_y'), shot_sua=s.get('so_shot_bi_sua'))
def tr(v): return ('%.0f' % (v / 1e6)) + ' triệu' if v >= 1e7 else ('%.1f' % (v / 1e6)).replace('.', ',') + ' triệu'
def gio(v): return ('%.1f' % v).replace('.', ',') + ' giờ'
def chart(tieu_de, chu, key, fmt):
    mx = max(p[key] for p in PP) or 1
    return (f'<figure class="ch"><figcaption><b>{e(tieu_de)}</b><span class="mu">{e(chu)}</span></figcaption><div class="bars">' + ''.join(
        f'<div class="row{" thieu" if p.get("thieu") else ""}" tabindex="0" data-tip="{e(p["ten"])}: {"ít nhất " if p.get("thieu") else ""}{e(fmt(p[key]))}{" (thiếu dữ liệu)" if p.get("thieu") else ""}"><span class="lb">{e(p["ten"])}</span><span class="tr"><i style="width:{p[key] / mx * 100:.1f}%"></i></span><span class="vl num">{"≥ " if p.get("thieu") else ""}{e(fmt(p[key]))}</span></div>' for p in PP) + '</div><p class="mu">Tập 1: thiếu dữ liệu (làm phần lớn bằng tài khoản khác), số thật lớn hơn; thanh vẽ nhạt.</p></figure>')
dem = lambda p, n: sum(1 for m in p['muc'] if m.get('nhom') == n)
mxn = max([dem(p, n) for p in PP for n in NH] + [1])

tong_quan = ('<section data-p="tq"><div class="eps">' + ''.join(
    f'<article class="ep"><div class="hd"><span class="so">{e(p["ten"])}</span><b>{e(p["phim"])}</b></div><p class="mu">{e(p["pp"])}</p><p><span class="k">Đầu vào</span> {e(p["vao"])}</p><p><span class="k">Kết quả</span> {e(p["kq"])}</p>'
    + (f'<p class=\"thieu-note\">{e(p["thieu"])}</p>' if p.get("thieu") else '') + f'<p class="num mu">{"ít nhất " if p.get("thieu") else ""}{tr(p["moi"])} token mới · {gio(p["gio"])} máy · {p["sua"]} việc sửa, {p["ton"]} tồn</p></article>' for p in PP) + '</div>'
    + chart('Token mới', 'Token chưa có trong bộ nhớ đệm + token viết ra: sát với chi phí thật. Tập 2 gồm cả công dựng engine và studio.', 'moi', tr)
    + chart('Giờ máy làm việc', 'Cộng dồn phiên chính và mọi agent phụ, nên lớn hơn giờ đồng hồ', 'gio', gio)
    + chart('Số việc phải sửa riêng cho tập', 'Không tính viết chức năng, công cụ, lõi dùng chung', 'sua', lambda v: str(v))
    + chart('Việc còn tồn', 'Chưa sửa xong tính đến lúc lập trang', 'ton', lambda v: str(v))
    + '<div class="tw"><table><thead><tr><th>Tập</th><th>Số shot</th><th>Tổng token</th><th>Token mới</th><th>Giờ máy</th><th>Lượt gọi mô hình</th><th>Việc sửa</th><th>Còn tồn</th><th>Vòng góp ý</th><th>Thời gian</th></tr></thead><tbody>'
    + ''.join(f'<tr><th scope="row">{e(p["ten"])}{" *" if p.get("thieu") else ""}</th><td class="num">{p["shot"]}</td><td class="num">{tr(p["tong"])}</td><td class="num">{tr(p["moi"])}</td><td class="num">{gio(p["gio"])}</td><td class="num">' + f'{p["luot"]:,}'.replace(',', '.') + f'</td><td class="num">{p["sua"]}</td><td class="num">{p["ton"]}</td><td class="num">{e(p["vong"] if p["vong"] is not None else "—")}</td><td class="num">{e(p["tu"][5:])} → {e(p["den"][5:])}</td></tr>' for p in PP)
    + '</tbody></table></div><p class="mu">* Tập 1 thiếu dữ liệu: chỉ là phần nhật ký có trên máy này.</p></section>')

def tap_sec(i, p):
    bars = ''.join(f'<div class="row r2" tabindex="0" data-tip="{e(n)}: {dem(p, n)} việc"><span class="lb">{e(n)}</span><span class="tr"><i style="width:{dem(p, n) / mxn * 100:.1f}%"></i></span><span class="vl num">{dem(p, n)}</span></div>' for n in NH)
    ds = ''
    for n in NH:
        ms = [m for m in p['muc'] if m.get('nhom') == n]
        if ms: ds += f'<h3>{e(n)} <span class="num mu">{len(ms)}</span></h3><ul class="ds">' + ''.join(f'<li class="{"ton" if m.get("con_ton") else ""}" data-ton="{1 if m.get("con_ton") else 0}"><span>{e(m.get("mo_ta"))}</span><span class="mt num">' + (f'{e(m["so_shot"])} shot · ' if m.get('so_shot') else '') + e(m.get('dot') or '') + (' · <b>còn tồn</b>' if m.get('con_ton') else '') + '</span></li>' for m in ms) + '</ul>'
    return (f'<section data-p="t{i}" hidden><div class="ep"><div class="hd"><span class="so">{e(p["ten"])}</span><b>{e(p["phim"])}</b></div><p class="mu">{e(p["pp"])}</p><p><span class="k">Đầu vào</span> {e(p["vao"])}</p><p><span class="k">Kết quả</span> {e(p["kq"])}</p>' + (f'<p class="thieu-note">{e(p["thieu"])}</p>' if p.get("thieu") else '') + '</div>'
            f'<div class="hero"><div><b class="num">{tr(p["moi"])}</b><span class="mu">token mới</span></div><div><b class="num">{gio(p["gio"])}</b><span class="mu">giờ máy</span></div><div><b class="num">{p["sua"]}</b><span class="mu">việc sửa</span></div><div><b class="num">{p["ton"]}</b><span class="mu">còn tồn</span></div></div>'
            f'<div class="uc"><div class="box uu"><h3>Ưu điểm của cách làm</h3><ul>{"".join(f"<li>{e(x)}</li>" for x in p["uu"])}</ul></div><div class="box nh"><h3>Nhược điểm</h3><ul>{"".join(f"<li>{e(x)}</li>" for x in p["nhuoc"])}</ul></div></div>'
            f'<figure class="ch"><figcaption><b>Việc sửa theo loại</b><span class="mu">Cùng một thang đo cho cả bốn tập</span></figcaption><div class="bars">{bars}</div></figure>'
            + (f'<label class="chk"><input type="checkbox" class="lt" id="lt{i}"> Chỉ hiện việc còn tồn</label>' if p['ton'] else '') + (ds or '<p class="mu">Không có lịch sử sửa được ghi lại.</p>') + '</section>')

DANH_GIA = [
 ('Chất lượng đi theo chuẩn hình, không đi theo số token', 'Nhận định dựa trên Tập 2, 3, 4 (Tập 1 thiếu dữ liệu nên không dùng để so). Tập 2 có khung hình chuẩn cho từng shot nên ra kết quả tốt nhất. Tập 3 chỉ có chữ nên bản đầu lệch xa mong đợi. Thiếu chuẩn hình thì mọi vòng sửa đều là đoán ý.'),
 ('Có ảnh chuẩn vẫn chưa đủ nếu thiếu bố trí 3D', 'Tập 4 có đủ 104 ảnh nhưng lần soi đầu chỉ 1 shot đạt. Ảnh cho biết khung hình trông ra sao, không cho biết nhân vật đứng đâu trong phòng và máy đặt ở đâu. Giao việc "đo 3D từ ảnh" cho Codex đã không thành: 4 lượt chạy giải được 2/104 máy.'),
 ('Lỗi được phát hiện quá muộn và bằng mắt người', 'Màn hình đen 51 giây, âm nền là tiếng ù thành phố, bảng hiệu sai nhà, shot trống: đều do bạn xem mới thấy. Các phép kiểm tự động hiện có (độ sáng, tất định, mốc giọng) không bắt được lỗi nội dung.'),
 ('Sửa theo từng shot thay vì theo nguyên nhân gốc', 'Bối cảnh và đạo cụ chiếm 29/52 việc sửa ở Tập 2 và 23/52 ở Tập 3. Phần lớn là hệ quả của việc dàn shot trước khi bối cảnh được duyệt, nên sửa xong shot này lại lộ shot khác.'),
 ('Lõi chung không tự lan sang tập mới', 'Tập 3 sinh từ tập mẫu nên thiếu trời thật, đèn đêm, phụ đề từng chữ, thời lượng đúng. Mỗi thứ phải phát hiện rồi vá tay, và sửa tập mẫu sau đó không cập nhật tập đã sinh.'),
 ('Chi phí bị đội lên vì cách tổ chức phiên', 'Trên 96% token là đọc lại ngữ cảnh. Phiên điều phối này đã vượt 600 nghìn token nên mỗi tin nhắn ngắn cũng đắt; agent phụ được giao đề bài rộng thường tốn 200–300 nghìn token mỗi lần.'),
]
KHUYEN = [
 ('Đầu vào', 'Chuẩn hoá "gói đầu vào" trước khi dựng', 'Mỗi tập phải có đủ: kịch bản + giọng, khung storyboard từng shot, và một BẢNG BỐ TRÍ điền theo mẫu chọn sẵn: mỗi bối cảnh có mặt bằng với các điểm đứng đặt tên; mỗi shot ghi ai đứng điểm nào, quay mặt hướng nào, cỡ cảnh và góc máy. Không yêu cầu ai đo toạ độ 3D: engine tự giải camera từ các lựa chọn đó.', 'Bỏ được khâu đoán bố cục (Tập 3) và khâu đo 3D từ ảnh (Tập 4).', 'cao'),
 ('Đầu vào', 'Kiểm gói đầu vào bằng máy trước khi chạy', 'Một lệnh kiểm: đủ shot, đủ trường, tên điểm đứng và đạo cụ tồn tại, mốc giọng khớp, chữ tiếng Việt không hỏng dấu. Gói chưa qua thì không bắt đầu dựng.', 'Tránh mất cả buổi rồi mới biết dữ liệu thiếu hoặc hỏng như bộ kit Codex.', 'cao'),
 ('Quy trình', 'Dựng và duyệt bối cảnh trước, dàn shot sau', 'Thứ tự cố định: dựng bối cảnh trống (kích thước, đồ cố định, vật liệu, ánh sáng ngày/đêm) → bạn duyệt bằng ảnh 4 góc → mới đặt nhân vật và máy. Làm theo cụm bối cảnh, xong cụm nào chốt cụm đó.', 'Cắt phần lớn việc sửa bối cảnh và đạo cụ, hiện chiếm khoảng một nửa.', 'cao'),
 ('Kiểm tra', 'Thước đo khớp khung tự động cho từng shot', 'So bản dựng với khung storyboard bằng số: vị trí và cỡ đầu chủ thể trong khung, ai có mặt, có bị vật che không. Ra điểm từng shot; shot dưới ngưỡng thì máy tự sửa tiếp, chưa gửi cho bạn.', 'Bạn chỉ xem những shot đã qua ngưỡng; hết cảnh "104 shot, 1 đạt".', 'cao'),
 ('Kiểm tra', 'Danh sách kiểm "chuẩn tập" chạy trước mỗi lần gộp', 'Một lệnh báo đỏ nếu: thời lượng trình phát khác tổng shot, thiếu trời hoặc đèn đêm, đạo cụ chưa có vật liệu, phụ đề từng chữ không chạy, thiếu lớp âm thanh, vượt 80 shader hoặc mở trang quá 10 giây.', 'Bắt các lỗi kiểu màn hình đen 51 giây trước khi tới tay bạn.', 'cao'),
 ('Sửa lỗi', 'Một vòng góp ý duy nhất, theo shot, trong studio', 'Bạn ghi chú theo shot bằng phím M rồi bấm Gửi tới Claude. Tôi gom ghi chú theo nguyên nhân gốc, sửa theo nhóm, chỉ chụp lại đúng shot đó và trả về ảnh trước–sau. Ghi chú mơ hồ thì hỏi lại một lần thay vì đoán.', 'Giảm số vòng và bỏ các lần sửa sai ý như s014b.', 'vừa'),
 ('Sửa lỗi', 'Trang nghe thử âm thanh trước khi ghép', 'Mỗi lớp âm (nền theo bối cảnh, tiếng theo shot, nhạc) có nút nghe riêng để bạn duyệt, giống trang duyệt đạo cụ.', 'Âm thanh là phần duy nhất máy không tự kiểm được.', 'vừa'),
 ('Tài sản', 'Thư viện dùng lại thay vì dựng mới', 'Gom những thứ đã duyệt thành thư viện mặc định: Gà, Bắp, dân làng R6 với bộ 37 biểu cảm, 44 đạo cụ, các gian nội thất, 11 bảng màu nhà. Tập mới chọn từ thư viện trước, chỉ tìm thêm cái thiếu.', 'Tập sau không lặp lại 14 việc sửa đạo cụ.', 'vừa'),
 ('Tài sản', 'Đồng bộ tập mẫu và các tập đã sinh', 'Phần khung của trang tập tách khỏi dữ liệu tập, để sửa lõi một lần là mọi tập đều có; kèm việc tách khung studio đã chốt.', 'Hết cảnh vá tay từng tập, file tập nhẹ hơn.', 'vừa'),
 ('Chi phí', 'Mỗi tập một phiên, phiên điều phối chỉ giữ tiến độ', 'Phiên điều phối compact sau mỗi mốc và không tự làm việc nặng. Agent phụ nhận đề bài theo đúng một file hoặc một cụm, tối đa 2 cùng lúc, bật chế độ mở trang nhanh.', 'Giảm phần đọc lại ngữ cảnh, vốn chiếm trên 96% token.', 'vừa'),
 ('Chi phí', 'Chỉ dựng những gì tập dùng', 'Trang tập không dựng thị trấn và dân làng khi tập không có cảnh đó; đặt ngân sách shader ngay từ lúc sinh tập.', 'Trang Tập 4 hiện mất 19 giây để mở.', 'thấp'),
]
dg = '<section data-p="dg" hidden><h2>Đánh giá</h2><div class="list">' + ''.join(f'<article class="box"><h3>{e(a)}</h3><p>{e(b)}</p></article>' for a, b in DANH_GIA) + '</div><h2>So sánh bốn cách làm</h2><div class="tw"><table class="pp"><thead><tr><th>Cách làm</th><th>Đầu vào</th><th>Mạnh nhất</th><th>Yếu nhất</th><th>Kết quả</th></tr></thead><tbody>' + ''.join(
    f'<tr><th scope="row">{e(p["ten"])}<small>{e(p["pp"])}</small></th><td>{e(p["vao"])}</td><td>{e(p["uu"][0])}</td><td>{e(p["nhuoc"][0])}</td><td>{e(p["kq"])}</td></tr>' for p in PP) + '</tbody></table></div></section>'
kn = ('<section data-p="kn" hidden><div class="box"><h3>Hướng đi tôi khuyên</h3><p>Giữ cách làm của Tập 4 (storyboard là chuẩn hình) nhưng thêm bảng bố trí vào đầu vào, dựng theo cụm bối cảnh có duyệt, và đặt một thước đo khớp khung tự động trước khi tới tay bạn. Đây là cách duy nhất trong bốn cách vừa dùng được cho câu chuyện tự nghĩ, vừa có chuẩn để máy tự kiểm.</p></div>'
      + '<div class="list">' + ''.join(f'<article class="box kn"><div class="hd"><span class="so">{e(n)}</span><span class="ut {e(u)}">ưu tiên {e(u)}</span></div><h3>{i + 1}. {e(t)}</h3><p>{e(m)}</p><p class="mu"><span class="k">Vì sao</span> {e(v)}</p></article>' for i, (n, t, m, v, u) in enumerate(KHUYEN))
      + '</div><div class="warn">Các khuyến nghị là nhận định của Claude từ số liệu trên trang này và từ những gì diễn ra trong các phiên làm việc; chưa có cái nào được thử nghiệm để chứng minh hiệu quả. Nên thử trọn bộ trên một cụm bối cảnh của Tập 4 (ví dụ nhà máy, 33 shot) rồi so số trước khi áp cho cả tập.</div></section>')
tabs = [('tq', 'Tổng quan')] + [(f't{i}', p['ten']) for i, p in enumerate(PP)] + [('dg', 'Đánh giá'), ('kn', 'Khuyến nghị')]
page = f'''<title>Tổng kết bốn tập</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;600;800&display=swap">
<style>
/* Bố cục: hàng thẻ dính trên cùng (Tổng quan · 4 tập · Đánh giá · Khuyến nghị); mỗi thẻ là một cột đọc dọc; biểu đồ cột ngang một chuỗi. */
:root{{--bg:#f3f5f8;--panel:#fff;--line:#d5dbe5;--fg:#17202c;--mu:#5d6a7e;--acc:#1f6fd1;--data:#2a6fc9;--track:#e6eaf1;--warn:#9a6200;--warnbg:#fff6e0;--good:#14804a;--goodbg:#e9f7ef;--badc:#b3261e;--badbg:#fdecea;--font:"Be Vietnam Pro","Segoe UI",system-ui,sans-serif}}
@media (prefers-color-scheme:dark){{:root:not([data-theme="light"]){{--bg:#0e1116;--panel:#161b23;--line:#2a3342;--fg:#e8ecf2;--mu:#8b96a8;--acc:#4da3ff;--data:#5aa2f5;--track:#222a37;--warn:#f5b84a;--warnbg:#2a2210;--good:#3ecf8e;--goodbg:#10261c;--badc:#ff8a80;--badbg:#2b1513;color-scheme:dark}}}}
:root[data-theme="dark"]{{--bg:#0e1116;--panel:#161b23;--line:#2a3342;--fg:#e8ecf2;--mu:#8b96a8;--acc:#4da3ff;--data:#5aa2f5;--track:#222a37;--warn:#f5b84a;--warnbg:#2a2210;--good:#3ecf8e;--goodbg:#10261c;--badc:#ff8a80;--badbg:#2b1513;color-scheme:dark}}
body{{background:var(--bg);color:var(--fg);font:15px/1.5 var(--font);padding-block:18px 48px;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px))}}
main{{max-width:900px;margin:0 auto;display:flex;flex-direction:column;gap:12px}}section{{display:flex;flex-direction:column;gap:12px}}
h1{{font-size:22px;font-weight:800;margin:0}}h2{{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--mu);margin:8px 0 0;font-weight:600}}h3{{font-size:15px;margin:0}}
p{{margin:0}}.mu{{color:var(--mu);font-size:13px}}.num{{font-variant-numeric:tabular-nums}}.k{{color:var(--mu);font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.05em}}
.tabs{{display:flex;gap:6px;flex-wrap:wrap;position:sticky;top:env(safe-area-inset-top,0px);background:var(--bg);padding-block:8px;z-index:2}}
.tabs button{{background:var(--panel);color:var(--fg);border:1px solid var(--line);border-radius:99px;padding:6px 12px;font:inherit;font-weight:600;cursor:pointer}}.tabs button[aria-selected="true"]{{background:var(--acc);border-color:var(--acc);color:#fff}}
button:focus-visible,input:focus-visible{{outline:2px solid var(--acc);outline-offset:1px}}
.eps{{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,400px),1fr));gap:10px}}.ep,.box{{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:12px;display:flex;flex-direction:column;gap:6px;min-width:0}}
.hd{{display:flex;gap:8px;align-items:baseline;flex-wrap:wrap}}.so{{font-size:12px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--mu);border:1px solid var(--line);border-radius:99px;padding:1px 9px}}
.hero{{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px}}.hero div{{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:10px 12px}}.hero b{{display:block;font-size:22px;font-weight:800}}
.ch{{margin:0;background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:12px}}.ch figcaption{{display:flex;flex-direction:column;margin-bottom:8px}}
.bars{{display:flex;flex-direction:column;gap:8px}}.row{{display:grid;grid-template-columns:52px 1fr auto;gap:10px;align-items:center;border-radius:6px}}.row.thieu .tr i{{opacity:.35}}.row.thieu .lb,.row.thieu .vl{{color:var(--mu)}}.row.r2{{grid-template-columns:minmax(120px,190px) 1fr 32px}}.row:focus-visible{{outline:2px solid var(--data);outline-offset:2px}}
.lb{{font-weight:600;font-size:14px}}.tr{{display:block;height:14px;background:var(--track);border-radius:0 4px 4px 0;overflow:hidden}}.tr i{{display:block;height:100%;background:var(--data);border-radius:0 4px 4px 0}}.vl{{min-width:32px;text-align:right}}
#tip{{position:fixed;pointer-events:none;background:var(--fg);color:var(--bg);padding:4px 8px;border-radius:6px;font-size:13px;z-index:5;transform:translate(-50%,-140%);white-space:nowrap}}
.uc{{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr));gap:10px}}.uc ul,.box ul{{margin:0;padding-left:18px}}.uc li{{margin:3px 0}}
.uu{{border-color:var(--good);background:var(--goodbg)}}.nh{{border-color:var(--badc);background:var(--badbg)}}
.chk{{display:flex;gap:8px;align-items:center;cursor:pointer}}input[type=checkbox]{{accent-color:var(--acc)}}
.ds{{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px}}.ds li{{background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:8px 10px;display:flex;flex-direction:column;gap:2px}}.ds li.ton{{border-color:var(--warn);background:var(--warnbg)}}.mt{{color:var(--mu);font-size:12px}}
.list{{display:flex;flex-direction:column;gap:8px}}.ut{{font-size:12px;font-weight:600;border-radius:99px;padding:1px 9px;border:1px solid var(--line);color:var(--mu)}}.ut.cao{{border-color:var(--badc);color:var(--badc)}}.ut.vừa{{border-color:var(--warn);color:var(--warn)}}
.tw{{overflow-x:auto;background:var(--panel);border:1px solid var(--line);border-radius:10px}}table{{border-collapse:collapse;width:100%;font-size:14px;min-width:720px}}
th,td{{padding:8px 10px;border-bottom:1px solid var(--line);text-align:right;vertical-align:top}}thead th{{font-size:12px;color:var(--mu);font-weight:600}}tbody th,th:first-child{{text-align:left;font-weight:600}}tbody tr:last-child th,tbody tr:last-child td{{border-bottom:0}}
table.pp td{{text-align:left}}table.pp th small{{display:block;font-weight:400;color:var(--mu);font-size:12px}}
.warn,.thieu-note{{background:var(--warnbg);border:1px solid var(--warn);border-radius:8px;padding:10px 12px;font-size:14px}}.thieu-note{{padding:6px 10px;font-size:13px}}
</style>
<main>
<header><h1>Tổng kết bốn tập</h1><p class="mu">3JS Studio · lập lúc {e(SU.get("lap_luc"))} · token, thời gian và việc sửa của từng tập; ưu nhược từng cách làm; đánh giá và khuyến nghị</p></header>
<nav class="tabs" role="tablist">{"".join(f'<button role="tab" data-tab="{k}" aria-selected="{"true" if k == "tq" else "false"}">{e(n)}</button>' for k, n in tabs)}</nav>
{tong_quan}
{"".join(tap_sec(i, p) for i, p in enumerate(PP))}
{dg}
{kn}
<div class="warn"><b>Tập 1 không so sánh được một cách khách quan</b>: phần lớn công việc của nó làm bằng một tài khoản Claude khác nên thiếu nhật ký. Ba tập còn lại: số token và giờ lấy từ nhật ký Claude Code trên máy này (không gồm Codex); việc gán cho từng tập là ước lượng. Tập 2 gồm cả công dựng engine và studio. Danh sách việc sửa do agent lập từ lịch sử commit và file bàn giao, chưa đối chiếu từng dòng. Tập 3 và Tập 4 chưa xong.</div>
</main>
<div id="tip" hidden></div>
<script>
const $$=(s)=>[...document.querySelectorAll(s)],tip=document.getElementById('tip');
$$('.tabs button').forEach((b)=>{{b.onclick=()=>{{$$('.tabs button').forEach((x)=>x.setAttribute('aria-selected',x===b));$$('section[data-p]').forEach((s)=>{{s.hidden=s.dataset.p!==b.dataset.tab;}});scrollTo(0,0);}};}});
$$('.lt').forEach((c)=>{{c.onchange=()=>{{c.closest('section').querySelectorAll('.ds li').forEach((li)=>{{li.hidden=c.checked&&li.dataset.ton!=='1';}});}};}});
$$('.row').forEach((r)=>{{const show=(x,y)=>{{tip.textContent=r.dataset.tip;tip.hidden=false;tip.style.left=x+'px';tip.style.top=y+'px';}};
r.addEventListener('pointermove',(ev)=>show(ev.clientX,ev.clientY));r.addEventListener('pointerleave',()=>{{tip.hidden=true;}});
r.addEventListener('focus',()=>{{const b=r.getBoundingClientRect();show(b.left+b.width/2,b.top);}});r.addEventListener('blur',()=>{{tip.hidden=true;}});}});
</script>
'''
os.makedirs(R + '/output/artifact/tong-ket', exist_ok=True)
open(R + '/output/artifact/tong-ket/index.html', 'w', encoding='utf-8').write(page)
print('trang', len(page) // 1024, 'KB ·', ' | '.join(f'{p["ten"]}: {tr(p["moi"])} mới, {gio(p["gio"])}, {p["sua"]} sửa/{p["ton"]} tồn' for p in PP))
