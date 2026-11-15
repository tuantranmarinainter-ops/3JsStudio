"""video2kb_chu.py — đường MỚI của video-sang-kich-ban: từ kết quả cắt shot (shots.json) ra
  phan-tich-format.md  CHỈ số liệu format (nhịp cắt, độ dài shot, tỉ lệ kiểu máy, 4 phần) — không lời, không tên, không chuyện
  kich-ban.md          khung kịch bản CHỮ (chưa chia shot) để viết truyện MỚI theo format, rồi chuyển sang skill xu-ly-kich-ban
Hàm thuần (không cần ffmpeg/PIL) → test được bằng dữ liệu mẫu. Luật kênh: chỉ học FORMAT, không chép truyện/nhân vật/lời.
"""
import statistics as st

PHAN = [('Hook', 0.10), ('Leo thang', 0.40), ('Twist', 0.25), ('Giải quyết', 0.25)]
BIN_DAI = [(0, 0.5, '< 0,5 s'), (0.5, 1.0, '0,5–1 s'), (1.0, 1.5, '1–1,5 s'), (1.5, 2.5, '1,5–2,5 s'), (2.5, 1e9, '≥ 2,5 s')]
DONG_NGUONG = (0.04, 0.12)   # trung bình |đầu − cuối| (0..1): dưới = máy tĩnh, giữa = nhẹ, trên = mạnh (số đo thô)
CHAR_PER_SEC = 14            # nhịp đọc tiếng Việt (CLAUDE.md)
LOAI_HOP_LE = ['toàn cảnh', 'đám đông', 'đi ngang', 'bám theo', 'cận mặt', 'phản ứng', 'qua vai', 'cận đồ', 'rượt', 'lộ diện',
               'đối thoại']


def fmt(t):
    return f'{int(t // 60)}:{t % 60:04.1f}'


def pc(x, n):
    return f'{x / n:.0%}' if n else '–'


def kieu_dong(d):
    return 'tĩnh' if d < DONG_NGUONG[0] else 'nhẹ' if d < DONG_NGUONG[1] else 'mạnh'


def so_lieu(shots, total, loi_lines=None):
    """Dict số liệu format. `loi_lines` (tuỳ chọn) chỉ dùng để ĐẾM câu/ký tự — không bao giờ ghi chữ ra."""
    n = len(shots)
    durs = [s['dur'] for s in shots]
    r = {'total': total, 'n': n, 'shot_phut': n / total * 60 if total else 0,
         'tb': st.mean(durs), 'tv': st.median(durs), 'min': min(durs), 'max': max(durs),
         'dau3s': sum(1 for s in shots if s['start'] < 3),
         'bin': [(lab, sum(1 for d in durs if lo <= d < hi)) for lo, hi, lab in BIN_DAI]}
    ph, a = [], 0.0
    for ten, f in PHAN:
        b = a + f * total
        ss = [s for s in shots if a <= s['start'] < b]
        ph.append({'ten': ten, 'a': a, 'b': b, 'n': len(ss), 'tb': st.mean(x['dur'] for x in ss) if ss else 0.0})
        a = b
    r['phan'] = ph
    cd = [s for s in shots if s.get('dong') is not None]
    r['dong'] = {k: sum(1 for s in cd if kieu_dong(s['dong']) == k) for k in ('tĩnh', 'nhẹ', 'mạnh')} if cd else None
    r['n_dong'] = len(cd)
    lo = [s for s in shots if s.get('loai')]
    r['loai'] = {}
    for s in lo:
        r['loai'][s['loai']] = r['loai'].get(s['loai'], 0) + 1
    r['n_loai'] = len(lo)
    if loi_lines:
        ky_tu = sum(len(l['text']) for l in loi_lines)
        r['loi'] = {'cau': len(loi_lines), 'ky_tu_cau': ky_tu / len(loi_lines), 'ky_tu_giay': ky_tu / total,
                    'cau_phan': [sum(1 for l in loi_lines if p['a'] <= l['start'] < p['b']) for p in ph]}
    else:
        r['loi'] = None
    return r


def viet_phan_tich(r, ten_nguon, au=None):
    L = [f'# Phân tích FORMAT — {ten_nguon}', '',
         '> Chỉ số liệu format (nhịp, độ dài, kiểu máy, cấu trúc). KHÔNG chứa lời, tên, cốt truyện của video nguồn.',
         '> Đây là tham số để viết truyện MỚI; không phải khuôn để chép lại chuyện.', '',
         '## Nhịp cắt',
         f"- Tổng {fmt(r['total'])} ({r['total']:.1f} s) · **{r['n']} shot** · {r['shot_phut']:.0f} shot/phút",
         f"- Độ dài shot: TB {r['tb']:.2f} s · trung vị {r['tv']:.2f} s · ngắn nhất {r['min']:.2f} s · dài nhất {r['max']:.2f} s",
         f"- 3 giây đầu có {r['dau3s']} shot (hook cần hình minh hoạ luật ngay trong khoảng này)", '',
         '| Độ dài shot | Số shot | Tỉ lệ |', '|---|---|---|']
    L += [f"| {lab} | {c} | {pc(c, r['n'])} |" for lab, c in r['bin']]
    L += ['', '## Cấu trúc 4 phần (theo % thời lượng)', '| Phần | Khoảng | Số shot | Tỉ lệ shot | Shot TB |', '|---|---|---|---|---|']
    L += [f"| {p['ten']} | {fmt(p['a'])}–{fmt(p['b'])} | {p['n']} | {pc(p['n'], r['n'])} | {p['tb']:.2f} s |" for p in r['phan']]
    L += ['', '## Kiểu máy']
    if r['dong']:
        L += [f"- Độ chuyển động (so khung đầu với khung cuối của shot; số đo thô, {r['n_dong']}/{r['n']} shot):",
              *[f"  - máy {k}: {c} shot ({pc(c, r['n_dong'])})" for k, c in r['dong'].items()]]
    else:
        L += ['- Chưa có độ chuyển động (shots.json không có trường `dong`).']
    if r['n_loai'] >= r['n'] / 2:
        L += [f"- Tỉ lệ loại shot (Claude điền sau khi xem khung, {r['n_loai']}/{r['n']} shot):",
              *[f"  - {k}: {c} ({pc(c, r['n_loai'])})" for k, c in sorted(r['loai'].items(), key=lambda kv: -kv[1])]]
    else:
        L += ['- Tỉ lệ loại shot: **chưa điền**. Xem `frames/` rồi thêm trường `loai` (một trong: ' + ', '.join(LOAI_HOP_LE)
              + ') vào từng shot trong `shots.json`, chạy lại với `--tu-shots` để cập nhật bảng này.']
    if r['loi']:
        lo = r['loi']
        L += ['', '## Nhịp lời kể (chỉ đếm, không ghi chữ)',
              f"- {lo['cau']} câu · TB {lo['ky_tu_cau']:.0f} ký tự/câu · {lo['ky_tu_giay']:.1f} ký tự/giây của cả phim",
              '- Câu theo phần: ' + ' · '.join(f"{p['ten']} {c}" for p, c in zip(r['phan'], lo['cau_phan']))]
    if au:
        L += ['', '## Âm thanh (chỉ đếm)', f"- Tiếng động dò được: {len(au.get('events', []))} · nhịp nhạc: "
              + (f"{au['bpm']} BPM" if au.get('bpm') else 'không rõ')
              + (f" · cắt khớp nhịp {au['cat_khop_nhip']:.0%}" if au.get('cat_khop_nhip') is not None else '')]
    L += ['', '## Dùng thế nào',
          '- Số liệu trên là MỤC TIÊU nhịp cho truyện mới: số shot, độ dài shot, tỉ lệ 4 phần, số câu mỗi phần.',
          '- Viết truyện mới (luật, nhân vật, twist, lời kể) từ ý của mình theo `kich-ban.md` cùng thư mục, '
          'rồi chuyển sang `xu-ly-kich-ban`.']
    return '\n'.join(L) + '\n'


def viet_khung(r, ten_nguon):
    n_cau = max(1, round(r['n'] / 2))   # 1 câu ≈ 1–3 shot (CLAUDE.md)
    pt = r['phan']
    L = ['# <Tên truyện MỚI> — kịch bản chữ (khung theo format)', '',
         f'<!-- Khung sinh tự động từ số liệu format của "{ten_nguon}" (phan-tich-format.md).',
         '     Điền bằng ý TỰ NGHĨ. Không chép luật, nhân vật, twist, lời kể của video nguồn. Xoá comment này khi xong. -->', '',
         '## Mục tiêu nhịp (từ phan-tich-format.md)',
         f"- Độ dài ~{r['total']:.0f} s · ~{r['n']} shot · shot TB {r['tb']:.1f} s · ~{n_cau} câu lời kể "
         f"(≤ ~35 ký tự/câu, ~{CHAR_PER_SEC} ký tự/giây)",
         '- Phần: ' + ' · '.join(f"{p['ten']} {fmt(p['a'])}–{fmt(p['b'])} (~{p['n']} shot)" for p in pt),
         '- 3 giây đầu: câu "Ở thị trấn này, …" + hình minh hoạ luật', '',
         '## Lõi',
         '- Luật (1 câu, giống cơ chế game): <điền>',
         '- Điểm yếu của "tôi" (do luật): <điền>',
         '- Twist (bí mật người lớn | kẽ hở luật | nguyên nhân ẩn): <điền>',
         '- Lời giải (điểm yếu thành lời giải): <điền>', '',
         '## Nhân vật',
         '- Tôi (người kể, đứa trẻ): <điền>', '- <vai khác>: <điền>', '',
         '## Bối cảnh',
         '- <địa điểm chính>: <điền>', '']
    for p in pt:
        L += [f"## {p['ten']} ({fmt(p['a'])}–{fmt(p['b'])}, ~{p['n']} shot, ~{max(1, round(p['n'] / 2))} câu)",
              '<lời kể từng câu, mỗi dòng 1 câu>', '']
    L += ['## Cần dựng', '- <env / prop / anim còn thiếu, mỗi dòng một thứ>', '',
          '## Bước tiếp',
          'Xong khung → skill `xu-ly-kich-ban` (chấm tiêu chí, hỏi bổ sung, chuyện tinh, bang-shot.json, bối cảnh tinh).']
    return '\n'.join(L) + '\n'


def ra_kich_ban_chu(out, meta, shots, loi_lines=None, au=None, force=False):
    """Ghi 2 file vào thư mục `out` (pathlib.Path). Trả (đường phan-tich-format.md, đường kich-ban.md)."""
    ten = meta.get('title') or 'video tham khảo'
    r = so_lieu(shots, meta['dur'], loi_lines)
    out.mkdir(parents=True, exist_ok=True)
    a, b = out / 'phan-tich-format.md', out / 'kich-ban.md'
    if b.exists() and not force:   # kich-ban.md có thể đã được viết tay → không đè
        raise FileExistsError(f'{b} đã có; thêm --force để ghi đè')
    a.write_text(viet_phan_tich(r, ten, au), encoding='utf8')
    b.write_text(viet_khung(r, ten), encoding='utf8')
    return a, b
