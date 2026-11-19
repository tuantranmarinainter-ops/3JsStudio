"""hoc_phong_cach_agent.py — các mục sổ tay lấy từ phần agent xem ảnh (xem.json) + h-mo-tip.json. Dùng bởi hoc_phong_cach.py so-tay."""
import json, re, statistics as st
from collections import Counter
from pathlib import Path

GOC = Path(__file__).resolve().parent.parent / 'output' / 'hoc-phong-cach'

LY_DO = {'tang-da-ban-suc-manh': 'VFX nhiều nhất (chớp, mưa, đổi màu) + ngắn nhất', 'may-ban-hang': 'đã có dữ liệu map (112 shot)',
         'vat-ky-sinh': 'cắt nhanh nhất (47 shot/phút)', 'tieng-me-goi': 'cắt chậm nhất (27,6 shot/phút) + tối nhất',
         'muc-tang-hinh': 'zoom-in cao nhất (79% shot)', 'chin-mang-song': 'zoom-in thấp nhất (7%)',
         'cai-ho-tren-bau-troi': 'VFX nhiều (42 sự kiện máy dò bản đầu)', 'thi-tran-quen-sach-luc-nua-dem': 'shot lặp nhiều nhất (10%)',
         'ket-qua-tuong-xung': 'sáng nhất (độ sáng 156)'}
MAT_R6 = {'vui': 'smile/happy', 'buon': 'sad', 'gian': 'angry', 'tuc-gian': 'angry', 'ngac-nhien': 'surprised', 'so': 'scared', 'hoảng': 'scared',
          'ngu': 'sleepy', 'vo-cam': 'neutral'}
CLIP_R6 = {'đứng-thở': 'idle', 'đi': 'walk', 'giật-mình': 'scared', 'giật mình': 'scared', 'vẫy': 'wave', 'ngã': 'tumble/faint', 'leo': '(thiếu)',
           'nhảy': 'jump', 'chạy': 'run', 'ngồi': 'sit', 'ôm': 'hug', 'ngồi-viết': 'write', 'bám': '(thiếu)', 'đứng-dậy': '(thiếu)', 'bắt-tay': '(thiếu)',
           'nằm': 'lie', 'đào': '(thiếu)', 'cúi-chào': '(thiếu)'}
LAP_KW = [('zoom-in cận mặt', r'cận mặt|zoom.?in'), ('phố/đường/thị trấn làm nền', r'phố|đường|thị trấn|vỉa hè'), ('cửa mở/đóng', r'cửa'),
          ('đồng hồ / mốc giờ', r'đồng hồ|giờ'), ('mưa/bão', r'mưa|bão|sấm'), ('đám đông', r'đám đông|dân|nhiều người'), ('vật/tay trao – giơ', r'tay|trao|giơ|cầm'),
          ('con số/đếm/biểu tượng luật', r'đếm|hạt|thanh|chấm'), ('chữ/thư/sổ/biển', r'thư|sổ|biển|chữ|tranh|báo'), ('nhà/phòng/giường', r'nhà|phòng|giường|bếp'),
          ('hào quang/hạt sáng', r'hào quang|lấp lánh|sao'), ('đổi màu/tối sầm chuyển cảnh', r'đổi màu|tối|mờ-đen|chuyển'), ('cận mặt buồn/giận khi thoại', r'buồn|giận|thị trưởng|khóc'),
          ('mẹ/ba/bà/ông nói chuyện', r'mẹ|ba |bà|ông|bố'), ('nước/biển/hồ', r'nước|biển|hồ|bơi'), ('rung máy/rung vật', r'rung'), ('khói/bụi', r'khói|bụi'),
          ('chạy/rượt/rơi', r'chạy|rượt|rơi|ngã'), ('ăn/đồ ăn/bánh', r'bánh|ăn|khoai|kẹo'), ('xe/tàu/thuyền', r'xe|tàu|thuyền|xuồng')]


def phan_agent(V):
    X = {r['slug']: json.loads((GOC / r['slug'] / 'xem.json').read_text(encoding='utf-8')) for r in V if (GOC / r['slug'] / 'xem.json').exists()}
    if not X: return ['## Phần agent: chưa có xem.json', '']
    n = len(X); allsh = [a for x in X.values() for a in x['shots']]; N = len(allsh)
    pct = lambda ctr: ', '.join(f'{k} {round(v * 100 / N)}%' for k, v in ctr.most_common())
    ten = {r['slug']: r['ten'] for r in V}
    tbm = lambda xs, nd=1: round(st.mean(xs), nd) if xs else '—'
    nluat = sum(1 for a in allsh if a.get('luat'))
    md = ['## 7. Bước 2 — video mẫu và cách xem', '',
          f'{n} video mẫu, đọc đủ {N} shot qua dải 10 frame/shot; agent Haiku ghi `xem.json`. **Nhãn là ước lượng bằng mắt từ ảnh nhỏ (±1 ô lưới), không đo pixel.**', '',
          '| Video | Lý do chọn |', '|---|---|'] + [f'| {ten.get(s, s)} | {LY_DO.get(s, "")} |' for s in X] + ['']
    md += ['## 8. B (nhìn ảnh): cỡ cảnh, góc máy, chữ nổi, cách vẽ luật', '',
           f'- **Cỡ cảnh (số shot):** {pct(Counter(a.get("co") for a in allsh))} (toàn+rộng = bối cảnh; trung = nửa người; cận = mặt).',
           f'- **Góc máy:** {pct(Counter(a.get("goc") for a in allsh))} — ngang tầm mắt là mặc định.',
           f'- **Chuyển động máy (agent):** {pct(Counter(a.get("cd") for a in allsh))}. ⚠ phần lớn nhãn này agent chép từ cột máy đo trong `shots-loi.txt` → KHÔNG độc lập, không dùng để hiệu chỉnh ngưỡng zoom.',
           f'- **Shot có vẽ luật/con số/biểu tượng trên màn hình:** {nluat}/{N} ({round(100 * nluat / N)}%).', '',
           '**Phụ đề / chữ nổi (mỗi video):**', '', '| Video | Phông | Màu | Viền | Vị trí | Kiểu |', '|---|---|---|---|---|---|']
    for s, x in X.items():
        p = x.get('phu_de', {})
        md.append(f'| {ten.get(s, s)} | {p.get("phong", "")} | {p.get("mau", "")} | {p.get("vien", "")} | {p.get("vi_tri", "")} | {p.get("kieu", "")} |')
    ex = list(dict.fromkeys(a['luat'][:50] for a in allsh if a.get('luat')))[:8]
    md += ['', '**Ví dụ cách vẽ luật trên màn hình:** ' + '; '.join(ex), '']
    md += ['## 9. C/E/I phần nhìn ảnh', '',
           '- **C:** số đo ở mục 3 (máy). Phần "hình minh hoạ đúng lời" không có số: agent ghi nhận cả 9 video mẫu cắt hình theo cụm lời, phụ đề 1–3 chữ chạy trong shot.', '']
    cnt = Counter()
    for x in X.values():
        txt = ' | '.join(x.get('lap_lai', [])).lower()
        for nm, rx in LAP_KW:
            if re.search(rx, txt): cnt[nm] += 1
    md += [f'**Top 20 thứ lặp lại** (số video trong {n} mẫu có nhắc; agent ghi tay + gom từ khoá nên là xấp xỉ):', '', '| # | Thứ lặp | Số video |', '|---|---|---|']
    md += [f'| {i} | {k} | {v} |' for i, (k, v) in enumerate(cnt.most_common(20), 1)] + ['']
    vf = [e for x in X.values() for e in x.get('vfx', [])]
    md += ['## 10. I: danh mục VFX (agent gọi tên, đối chiếu engine)', '', f'Số hiệu ứng ghi nhận: {len(vf)} — theo lớp: ' + ', '.join(f'{k} {v}' for k, v in Counter(e.get('lop') for e in vf).most_common()), '',
           '| Hiệu ứng (video mẫu) | Lớp | Màu | Mạnh | Cảm xúc | 3D/2D | Giây | Tiếng kèm |', '|---|---|---|---|---|---|---|---|']
    seen = set()
    for s, x in X.items():
        for e in x.get('vfx', [])[:4]:
            k = (e.get('ten') or '')[:28]
            if k in seen: continue
            seen.add(k)
            md.append(f'| {ten.get(s, s)}: {e.get("ten", "")} | {e.get("lop")} | {e.get("mau", "")} | {e.get("manh", "")} | {e.get("cam_xuc", "")} | {e.get("loai", "")} | {",".join(str(g) for g in (e.get("giay") or [])[:3])} | {e.get("tieng_dong_kem", "")} |')
    md += ['', '**Đối chiếu `engine/fx.js` / `post.js` / `fx-danh.js`:**', '', '| Có sẵn | Thiếu / cần thêm (đề xuất; mọi cái mới phải bật/tắt được) |', '|---|---|',
           '| `fxRain`, `fxSnow`, `fxDust`, `fxBolt`/`lightning`, `fxPuffs`, vfxAura/Beam/HitSpark/SpeedLines/Shake, `post.js`: grade, bloom, vignette, grain, storm, faceLive | đổi màu cả khung theo khoảnh khắc (grade theo shot) · tối sầm/mờ-đen chuyển cảnh · zoom giật (fov bật nhanh) · chữ nhấn đỏ từ khoá · biểu tượng luật trên màn (chấm đếm, thanh) · hạt vàng ấm · bọt/nước 3D · rung vật theo nhịp |', '']
    tong = {}
    for k in ('may_chop', 'may_rung', 'may_doi_mau', 'may_zoom_giat'):
        tong[k] = (sum(1 for x in X.values() for e in x['hieu_chinh'].get(k, []) if e.get('that')), sum(len(x['hieu_chinh'].get(k, [])) for x in X.values()))
    md += ['**Hiệu chỉnh máy dò (agent chấm trên bản máy dò CŨ):**', '', '| Loại | Thật / đã chấm |', '|---|---|'] + [f'| {k} | {y}/{t} |' for k, (y, t) in tong.items()]
    md += ['', 'Hạn chế: 10 frame cách nhau 0,4–1,5 s nên sự kiện ngắn "không thấy" ≠ giả. Nên ngưỡng được chỉnh thêm bằng cách **tự xem khung ±0,3 s quanh sự kiện** '
           '(`output/hoc-phong-cach/_kiem-sk.jpg`, video Tảng đá): chớp thật chỉ khi độ sáng vọt rồi trở lại; vật tiền cảnh lướt qua và cú cắt sót gây chớp/đổi màu/zoom giật giả. '
           'Bản máy hiện hành: loại cú cắt sót (|Δkhung| > 40), chớp = xung quay lại ≤ 8 khung, đổi màu/zoom giật chỉ tính khi cấu trúc khung gần giữ nguyên; zoom/pan giữ ngưỡng ±0,10 (chưa có nhãn độc lập để chỉnh).', '']
    bc = [b for x in X.values() for b in x.get('bo_cuc', [])]
    g = lambda k: [b[k] for b in bc if isinstance(b.get(k), (int, float))]
    lops = Counter(b.get('so_lop') for b in bc); cach = Counter(b.get('cach') for b in bc); cp = Counter(b.get('chua_phu_de') for b in bc)
    md += [f'## 11. D: bố cục + tiền/trung/hậu cảnh (lưới 10×10, {len(bc)} khung mẫu)', '', '| Chỉ số | Giá trị |', '|---|---|',
           f'| Hàng của mắt/mặt (1 = trên) | tb {tbm(g("mat_hang"))} (khoảng {min(g("mat_hang"))}–{max(g("mat_hang"))}) |',
           f'| Cột của mắt | tb {tbm(g("mat_cot"))} |', f'| Chiều cao nhân vật / khung | tb {tbm(g("nv_cao_pct"), 0)}% (khoảng {min(g("nv_cao_pct"))}–{max(g("nv_cao_pct"))}%) |',
           '| Số lớp | ' + ', '.join(f'{k}: {round(v * 100 / len(bc))}%' for k, v in sorted(lops.items(), key=lambda t: str(t[0]))) + ' |',
           f'| Có vật tiền cảnh | {round(100 * sum(1 for b in bc if b.get("tien")) / len(bc))}% khung, chiếm tb {tbm([b["tien_pct"] for b in bc if b.get("tien") and isinstance(b.get("tien_pct"), (int, float))], 0)}% |',
           f'| Hậu cảnh rõ / mờ | {round(100 * sum(1 for b in bc if b.get("hau") == "ro") / len(bc))}% / {round(100 * sum(1 for b in bc if b.get("hau") == "mo") / len(bc))}% |',
           f'| Hậu cảnh có kể chuyện | {round(100 * sum(1 for b in bc if b.get("hau_ke_chuyen")) / len(bc))}% |',
           '| Vị trí ngang | ' + ', '.join(f'{k} {round(v * 100 / len(bc))}%' for k, v in cach.most_common()) + ' |',
           '| Chừa chỗ phụ đề | ' + ', '.join(f'{k} {round(v * 100 / len(bc))}%' for k, v in cp.most_common()) + ' |', '']
    md += ['## 12. F: thẻ tổng (video mẫu)', '', '| Video | Số bối cảnh (trong/ngoài) | Quay lại | Số nhân vật khác nhau | Nhiều shot nhất | Asset (loại / tổng món, ước lượng) | Nhóm lớn nhất |', '|---|---|---|---|---|---|---|']
    for s, x in X.items():
        bcn = x.get('boi_canh', []); nv = x.get('nhan_vat', []); a = x.get('asset', {}); nh = a.get('theo_nhom', {})
        top = max(nv, key=lambda q: q.get('so_shot') or 0) if nv else {}
        tn = sum(1 for b in bcn if b.get('trong_ngoai') == 'trong'); ng = len(bcn) - tn
        md.append(f'| {ten.get(s, s)} | {len(bcn)} ({tn}/{ng}) | {sum(1 for b in bcn if b.get("quay_lai"))} | {len(nv)} | {str(top.get("nhan", ""))[:40]} ({top.get("so_shot", "")}) | {a.get("so_loai_uoc_tinh", "")} / {a.get("tong_mon_uoc_tinh", "")} | {max(nh, key=nh.get) if nh else ""} |')
    md += ['']
    mm = Counter(a.get('mat') for a in allsh if a.get('mat')); nm = sum(mm.values())
    md += ['## 13. G: cảm xúc mặt + hành động', '', f'Nhãn mặt đọc được ở {nm}/{N} shot (còn lại mặt quay đi/nhỏ/khuất): ' + ', '.join(f'{k} {v}' for k, v in mm.most_common(12)), '',
           '| Cảm xúc thấy | Mặt `R6_FACES` tương ứng | Ghi chú |', '|---|---|---|']
    for k, v in mm.most_common(12):
        md.append(f'| {k} ({v}) | {MAT_R6.get(k, "**(thiếu)**")} | {"có sẵn" if k in MAT_R6 else "chưa có trong `R6_FACES` (smile, happy, neutral, sad, scared, surprised, angry, sleepy)"} |')
    cl = Counter(a.get('clip') for x in X.values() for a in x.get('mat_hanh_dong', []) if a.get('clip'))
    md += ['', '**Clip hành động thấy → `R6_ANIMATIONS`:**', '', '| Clip (số lần) | Có trong r6.js | Dài | Lặp |', '|---|---|---|---|']
    for k, v in cl.most_common(14):
        rows = [a for x in X.values() for a in x.get('mat_hanh_dong', []) if a.get('clip') == k]
        md.append(f'| {k} ({v}) | {CLIP_R6.get(k, "?")} | {Counter(a.get("do_dai") for a in rows).most_common(1)[0][0]} | {"lặp" if sum(1 for a in rows if a.get("lap")) * 2 > len(rows) else "một lần"} |')
    md += ['', '**Cảm xúc theo phần (agent tóm, 9 video):** Hook = tò mò/bình thản · Leo thang = bực, sợ, hoảng · Twist = buồn, đau, im lặng · Giải quyết = dịu, ấm, nhẹ nhõm.',
           '', 'Chưa có bảng ảnh mặt cắt riêng (agent đọc từ dải 10 frame, mặt chỉ ~10 px): cần bước riêng nếu muốn mẫu mặt cho `r6-anim`.', '']
    hp = GOC / 'h-mo-tip.json'
    if hp.exists():
        H = json.loads(hp.read_text(encoding='utf-8'))
        md += ['## 14. H: mô típ truyện (37 video; agent Sonnet đọc tóm tắt .srt; mã không dấu)', '']
        for k, nmx in (('kieu_luat', 'Kiểu luật'), ('quan_he', 'Quan hệ'), ('kieu_twist', 'Kiểu twist'), ('kieu_ket', 'Kiểu kết')):
            md += [f'**{nmx}:** ' + ', '.join(f'{a} {b}' for a, b in sorted(H['tan_suat'][k].items(), key=lambda t: -t[1])[:12]), '']
        md += ['**Tổ hợp hay gặp (twist × kết):**', ''] + [f'- {c["to_hop"]} — {c["so_video"]} video' for c in H['ket_hop'][:6]]
        md += ['', '**Tổ hợp CHƯA ai làm (gợi ý):**', ''] + [f'- {c}' for c in H['chua_ai_lam']]
        md += ['', '**Khung nhịp chuẩn (cho `viet-kich-ban`):**', '', '| # | Cảnh | Mốc % | Ghi chú |', '|---|---|---|---|'] + [f'| {r["thu_tu"]} | {r["canh"]} | {r["moc_phan_tram"]} | {r["ghi_chu"]} |' for r in H['khung_nhip_chuan']]
        tp = [t['twist_p'] for t in H['the'] if isinstance(t.get('twist_p'), (int, float))]
        md += ['', f'Twist (agent đọc) rơi trung vị {st.median(tp)}% video (khoảng {min(tp)}–{max(tp)}%, n={len(tp)}).', '',
               '**Kiểm tay phần A:** ' + H['kiem_A']['nhan_xet'], '',
               '→ Dòng "Twist (từ khoá) ở % video" ở mục 2 chỉ để tham khảo (máy bắt được ~11/37 video, đúng 4): dùng số của agent ở trên. Luật máy đúng ~34/37.', '']
    md += ['## 15. ĐỀ XUẤT (chưa sửa skill/gates)', '',
           '**Cho `viet-kich-ban` / `lam-phim`:** ~290 từ/phút lời (260–315); câu tb 14 từ (hook dài hơn, ~18); luật nói ra trong ~10–20 giây đầu, câu mở "Ở thị trấn này/thế giới này…"; móc giữ chân (câu hỏi, "nhưng", "cho đến khi") mỗi ~25 s; twist ở ~65–72% video; ngôi thứ nhất ~0,5 lần/câu; kết ấm/hài lật ngược phổ biến nhất; lời kể không có CTA.',
           '**Nhịp hình:** ~36 shot/phút (shot tb 1,7 s, khoảng 1,3–2,2); phần Giải quyết shot dài hơn (~1,9 s); ~87% câu có cú cắt trong ±0,3 s cuối câu; ~2 shot/câu; phụ đề trắng viền đen giữa-dưới, từng cụm 1–3 chữ, từ khoá luật tô đỏ.',
           '**Cho `tools/gates.json`:** giữ `zoomTi` 0,04; thêm cảnh báo tỉ lệ shot đứng yên > 55% (mẫu 43%, 12–78%); cỡ cảnh ≈ mục 8; mắt nhân vật ở hàng theo mục 11; chừa ~20% khung dưới cho phụ đề.',
           '**Chữ ký riêng (ĐỀ XUẤT, 2–3 điểm cố ý khác):** (1) khối vuông R6 + hậu kỳ sơn/vẽ tay thay vì Roblox thật; (2) bố cục 3 lớp rõ hơn với tiền cảnh mờ có chủ ý (khung mẫu phần lớn chỉ 2 lớp); (3) biểu tượng luật (thanh/đếm) cố định một vị trí trên khung, nhất quán suốt tập.', '']
    return md
