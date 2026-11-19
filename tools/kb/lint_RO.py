"""lint_RO.py — BẢN THỬ (độc lập với tools/kb/lint.py) theo sổ tay phong cách 37 video (docs/so-tay-phong-cach.md).
Kiểm kich-ban.md (lỗi K00–K11 + cảnh báo W01–W09 như bản gốc, thêm W13–W18 của _RO, không đổi mã thoát) và narration.txt (N01–N02 lỗi, W10–W12 + W13, W16, W17).
W13 luật nói ra ≤ 5 s · W14 twist 65–72% · W15 móc giữ chân ~25 s · W16 từ/phút 260–315 · W17 CTA · W18 độ dài câu.

  python tools/kb/lint_RO.py <kich-ban.md> [--json]     in `kich-ban.md:<dòng>: <MÃ> <thông báo>`; thoát 0 = sạch, 1 = có lỗi.
  python tools/kb/lint_RO.py --loi-ke <narration.txt>   kiểm file lời kể `@at <giây> câu` (docs/format-kich-ban.md)

Tên animation / mặt / loại shot đọc bằng regex từ engine/r15.js và engine/shottypes.js lúc chạy.
"""
import json, re, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
sys.path.insert(0, str(HERE))
import kichban  # noqa: E402
from kichban import fold, CONT, vocab, hint  # noqa: E402

ACTION_TYPES = {'chase', 'fall', 'hug', 'walkBy', 'follow', 'sinkTilt'}
TOTAL_RANGE = (120, 180)
TWIST_RANGE = (40, 85)
MAX_SHOTS_PER_LINE = 3
MAX_DEM = 0.5            # CẢNH BÁO W01: quá nửa số shot là đêm → phim tối, khó đọc mặt
MAX_DIA_DIEM = 0.3       # CẢNH BÁO W02: một địa điểm chiếm quá 30% số shot → đơn điệu
KY_TU_GIAY = 14.0        # nhịp đọc tiếng Việt ~14 ký tự/giây (skill viet-kich-ban; _RO dùng TU_GIAY cho W13–W16)
KY_TU_GIAY_GIONG = 19.0  # giọng CapCut thật (trung vị ep003: 18,9 ký tự/giây) — dùng cho narration.txt đã có mốc
DOC_DU_SUC = 1.25        # W05/W10: cần > 125% thời lượng có sẵn → đọc không kịp
LUAT_TOI_DA_KY_TU = 140  # W04: câu luật "nói được trong 1 câu"
GIAI_QUYET_RANGE = (0.20, 0.50)   # W06: phần từ twist tới hết / tổng thời lượng
MAX_CROWD = 24           # W09: quá đông -> nặng dựng, khó đọc
TONG_LOI_KE = (120, 180)
NGOI_THU_NHAT = ('toi', 'minh', 'em', 'con', 'tao')
HEADER_CAN = ('rule', 'weakness', 'twist', 'solution')

# ---- _RO: số liệu sổ tay phong cách (37 video) ----
TU_GIAY = 290 / 60.0            # ~290 từ/phút (sổ tay mục 2)
LUAT_TOI_DA_GIAY = 5.0          # W13: luật nói ra ≤ 5 s (mục 2; ghi đè "10–20 s" của mục 15)
TWIST_RO = (65, 72)             # W14: twist ở 65–72% (mục 14)
MOC_GIAY = 25.0                 # W15: móc giữ chân ~25 s/lần (mục 2: tb 26,1; 8,7–135,6)
MOC_TB_RANGE = (15.0, 35.0)
MOC_GAP_MAX = 45.0
WPM_RANGE = (260, 315)          # W16
CAU_TB_RANGE = (10, 18)         # W18: câu tb 14 từ (9,7–18,5)
# từ khoá twist đã sửa theo sổ tay mục 14 ("kiểm tay phần A"): BỎ từ khoá cảm xúc/cảm ơn (tôi hiểu, chợt hiểu, cảm ơn…),
# THÊM 'hóa ra','thật ra','bí mật','không phải','chỉ là','năm rồi'. Viết dạng đã bỏ dấu (fold) để so khớp.
TWIST_KW = ('hoa ra', 'that ra', 'thuc ra', 'thi ra', 'su that', 'thuc chat', 'moi hieu', 'moi biet',
            'bi mat', 'khong phai', 'chi la', 'nam roi', 'bi mat la', 'that su la')
TWIST_DOI_GIONG = ('nhung', 'the roi', 'thi ra')   # câu đầu tiên đổi giọng trong 50–75% (mục 14)
MOC_KW = ('nhung', 'cho den khi')                  # + mọi câu hỏi (dấu ?)
CTA_KW = ('dang ky', 'theo doi', 'subscribe', 'like va', 'nhan chuong', 'nho bam', 'ung ho kenh', 'chia se video')


def min_dur(shot):
    if 'min' in shot: return shot['min']
    t = shot.get('type')
    if t == 'insertRead': return 1.5
    if t == 'closeup': return 0.8
    if t in ACTION_TYPES: return 1.0
    if t == 'establish': return 1.2
    return 0.8


def banned_names():
    f = HERE / 'ten-cam.txt'
    if not f.exists(): return []
    return [l.strip() for l in f.read_text(encoding='utf-8-sig').splitlines() if l.strip() and not l.startswith('#')]


def lint(path):
    d = kichban.doc(path)
    v = vocab()
    anims = v['anims'] | {c['name'] for c in d['can_dung'] if c['kind'] == 'anim'}
    faces, types = v['faces'], v['types']
    banned = [(b, fold(b)) for b in banned_names()]
    errs = [(e['dong'], e['ma'], e['msg']) for e in d['loi_doc']]
    add = lambda n, c, m: errs.append((n, c, m))

    total, known = 0.0, False
    first_nar_checked = False
    group = None            # [dòng bắt đầu, số shot] của câu lời kể đang chạy
    for s in d['shots']:
        n = s['_dong']
        sid = s.get('id', '?')
        if not (s.get('at_hd') or s.get('env_hd')): add(n, 'K01', f'shot {sid}: thiếu bối cảnh (cột "ở đâu"/"env" trống; shot trước và header cũng không có)')
        t = s.get('type')
        if t not in types: add(n, 'K02', f'shot {sid}: loại "{t or ""}" không có (cho phép: {", ".join(sorted(types))}){hint(s.get("_goi_y_type"))}')
        if s.get('read') and t != 'insertRead': add(n, 'K03', f'shot {sid}: có "vật cần đọc" nhưng loại là "{t}", phải là insertRead')
        for key in ('action', 'withAnim'):
            a = s.get(key)
            if a and a not in anims:
                add(n, 'K04', f'shot {sid}: animation "{a}" không có trong R15_ANIMATIONS và không nằm trong "Cần dựng"{hint(s.get("_goi_y_" + key))}')
        for key in ('face', 'withFace'):
            f = s.get(key)
            if f and f not in faces: add(n, 'K08', f'shot {sid}: mặt "{f}" không thuộc FACE_PRESETS{hint(s.get("_goi_y_" + key))}')
        if 'dur' in s:
            total += s['dur']; known = True
            if s['dur'] < min_dur(s): add(n, 'K05', f'shot {sid}: {s["dur"]} s < tối thiểu {min_dur(s)} s cho loại "{t}"')
        nar = s.get('narration', '')
        for b, fb in banned:
            if fb and fb in fold(nar): add(n, 'K06', f'shot {sid}: lời kể chứa tên kênh khác "{b}"')
        if nar in CONT:
            if group: group[1] += 1
        else:
            if group and group[1] > MAX_SHOTS_PER_LINE:
                add(group[0], 'K10', f'một câu lời kể trải {group[1]} shot (> {MAX_SHOTS_PER_LINE})')
            group = [n, 1] if nar else None
            if nar and not first_nar_checked:
                first_nar_checked = True
                if not fold(nar).startswith('o thi tran nay'):
                    add(n, 'K07', 'câu lời kể đầu phải bắt đầu bằng "Ở thị trấn này"')
    if group and group[1] > MAX_SHOTS_PER_LINE:
        add(group[0], 'K10', f'một câu lời kể trải {group[1]} shot (> {MAX_SHOTS_PER_LINE})')
    if known and str(d['meta'].get('kiem_tong', '')).lower() != 'off' and not TOTAL_RANGE[0] <= total <= TOTAL_RANGE[1]:
        add(1, 'K09', f'tổng {total:.1f} s ngoài {TOTAL_RANGE[0]}–{TOTAL_RANGE[1]} s')
    if str(d['meta'].get('kiem_tong', '')).lower() != 'off' and known:
        tw = kichban.twist_info(d)
        if not tw: add(1, 'K11', 'chưa đánh dấu twist (ghi "twist" vào cột ghi chú của shot đầu câu twist)')
        elif not TWIST_RANGE[0] <= tw['rel'] * 100 <= TWIST_RANGE[1]:
            add(tw['dong'], 'K11', f'twist ở {tw["rel"] * 100:.0f}% thời lượng, ngoài {TWIST_RANGE[0]}–{TWIST_RANGE[1]}%')
    errs.sort(key=lambda e: (e[0], e[1]))
    return errs


def canh_bao(path):
    """CẢNH BÁO (không phải lỗi, không đổi mã thoát): W01 > 50% shot là đêm; W02 một địa điểm > 30% số shot."""
    d = kichban.doc(path)
    sh = d['shots']; n = len(sh); out = []
    if n < 5: return out
    mac_dinh = str(d['meta'].get('time') or d['meta'].get('gio') or '').strip()
    dem = [x for x in sh if (x.get('time') or mac_dinh) == 'dem']
    if len(dem) / n > MAX_DEM:
        out.append((1, 'W01', f'{len(dem)}/{n} shot ({len(dem) * 100 // n}%) là đêm (> {int(MAX_DEM * 100)}%): phim sẽ tối, xen thêm cảnh ngày/trong nhà sáng'))
    dd = {}
    for x in sh:
        k = x.get('at_hd') or x.get('env_hd')
        if k: dd.setdefault(k, []).append(x)
    for k, v in sorted(dd.items(), key=lambda kv: -len(kv[1])):
        if len(v) / n > MAX_DIA_DIEM:
            out.append((v[0]['_dong'], 'W02', f'địa điểm "{k}" chiếm {len(v)}/{n} shot ({len(v) * 100 // n}%, > {int(MAX_DIA_DIEM * 100)}%): đổi cảnh/góc cho đỡ đơn điệu'))
    return out


def _co_ngoi_thu_nhat(text):
    f = ' ' + re.sub(r'[^a-z0-9]+', ' ', fold(text)) + ' '
    return any(f' {w} ' in f for w in NGOI_THU_NHAT)


def cau_chi_tiet(d):
    """mỗi câu lời kể: {"dong", "text", "dur" (tổng dur các shot của câu), "n" (số shot)} — gom như K10."""
    out = []
    for s in d['shots']:
        nar = s.get('narration', '')
        if nar in CONT:
            if out: out[-1]['dur'] += s.get('dur', 0.0); out[-1]['n'] += 1
        elif nar:
            out.append({'dong': s['_dong'], 'text': nar, 'dur': s.get('dur', 0.0), 'n': 1})
    return out


def canh_bao_kich_ban(path):
    """CẢNH BÁO học từ lint/format của nocodehack, đổi cho "Ở thị trấn này": W03–W09. Không đổi mã thoát."""
    d = kichban.doc(path)
    sh = d['shots']; out = []
    # W05 (mọi file): lời kể dài hơn tổng thời lượng shot của câu -> giọng đọc tràn sang câu sau
    for c in cau_chi_tiet(d):
        can = len(c['text'].strip()) / KY_TU_GIAY
        if c['dur'] > 0 and can > c['dur'] * DOC_DU_SUC + 0.3:
            out.append((c['dong'], 'W05', f'câu "{c["text"][:30]}…" cần ~{can:.1f} s để đọc nhưng {c["n"]} shot chỉ dài {c["dur"]:.1f} s: rút câu hoặc thêm giây'))
    if str(d['meta'].get('kiem_tong', '')).lower() == 'off' or len(sh) < 5:
        return out
    meta = d['meta']
    thieu = [k for k in HEADER_CAN if not str(meta.get(k, '')).strip()]
    if thieu:
        out.append((1, 'W03', f'header thiếu {", ".join(thieu)} (luật, điểm yếu, twist, lời giải): không có chỗ đối chiếu cốt truyện'))
    luat = str(meta.get('rule', '')).strip()
    if luat and (len(luat) > LUAT_TOI_DA_KY_TU or len(re.findall(r'[.!?…](?:\s|$)', luat)) > 1):
        out.append((1, 'W04', f'câu luật dài {len(luat)} ký tự hoặc nhiều câu: luật phải nói được trong 1 câu (≤ {LUAT_TOI_DA_KY_TU} ký tự)'))
    tw = kichban.twist_info(d)
    if tw:
        sau = 1 - tw['rel']
        if not GIAI_QUYET_RANGE[0] <= sau <= GIAI_QUYET_RANGE[1]:
            out.append((tw['dong'], 'W06', f'từ twist tới hết phim chiếm {sau * 100:.0f}% (khung {int(GIAI_QUYET_RANGE[0] * 100)}–{int(GIAI_QUYET_RANGE[1] * 100)}%: twist ~25% + giải quyết ~25%)'))
    cau = cau_chi_tiet(d)
    if cau and not any(_co_ngoi_thu_nhat(c['text']) for c in cau):
        out.append((cau[0]['dong'], 'W07', 'không câu lời kể nào có ngôi thứ nhất (tôi/mình/em/con…): format kể bởi một đứa trẻ'))
    dau = {x.get('at_hd') or x.get('env_hd') for x in sh[:3]} - {None}
    cuoi = {x.get('at_hd') or x.get('env_hd') for x in sh[-3:]} - {None}
    if dau and cuoi and not (dau & cuoi) and 'loop' not in ' '.join(x.get('notes', '').lower() for x in sh[-3:]):
        out.append((sh[-1]['_dong'], 'W08', f'cảnh cuối ({", ".join(sorted(cuoi))}) không gợi lại cảnh đầu ({", ".join(sorted(dau))}); cố ý thì ghi "loop" vào ghi chú shot cuối'))
    n_crowd = (meta.get('actors') or {}).get('crowd', {}).get('count', 0)
    if n_crowd > MAX_CROWD:
        out.append((1, 'W09', f'header crowd: {n_crowd} > {MAX_CROWD} người: nặng dựng, 6–14 đã thành đám đông trong khung dọc'))
    return out


def _so_tu(text):
    return len(re.findall(r'\w+', text, flags=re.UNICODE))


def _co_tu(text, kws):
    f = ' ' + re.sub(r'[^a-z0-9?]+', ' ', fold(text)) + ' '
    return any(f' {k} ' in f for k in kws)


def _la_moc(text):
    return '?' in text or _co_tu(text, MOC_KW)


def canh_bao_RO(path):
    """CẢNH BÁO _RO (W13–W18, không đổi mã thoát), theo sổ tay phong cách 37 video."""
    d = kichban.doc(path)
    out = []
    tot = kichban.tong_giay(d)
    cau = kichban.cac_cau(d)
    if not cau or not tot: return out
    cs = [{'dong': c['shot']['_dong'], 't0': c['t0'], 'text': c['shot'].get('narration', '')} for c in cau]
    # W13: luật nói ra xong (cuối câu 1, ước theo ~290 từ/phút) ≤ 5 s
    xong = cs[0]['t0'] + _so_tu(cs[0]['text']) / TU_GIAY
    if xong > LUAT_TOI_DA_GIAY:
        out.append((cs[0]['dong'], 'W13', f'luật nói xong ở ~{xong:.1f} s (> {LUAT_TOI_DA_GIAY:g} s): câu 1 {_so_tu(cs[0]["text"])} từ, rút câu 1 hoặc cho luật vào đầu câu'))
    # W14: vị trí twist 65–72%
    tw = kichban.twist_info(d)
    nguon = 'đánh dấu'
    if tw: rel, dong = tw['rel'] * 100, tw['dong']
    else:
        rel = dong = None
        for c in cs:
            r = c['t0'] / tot * 100
            f = fold(c['text']).strip()
            if (_co_tu(c['text'], TWIST_KW) and r >= 45) or (50 <= r <= 75 and f.startswith(TWIST_DOI_GIONG)):
                rel, dong, nguon = r, c['dong'], 'đoán từ từ khoá'; break
    if rel is None:
        out.append((1, 'W14', 'không xác định được twist (chưa ghi "twist" ở ghi chú, lời kể không có từ khoá hóa ra/thật ra/bí mật/không phải/chỉ là/năm rồi)'))
    elif not TWIST_RO[0] <= rel <= TWIST_RO[1]:
        out.append((dong, 'W14', f'twist ({nguon}) ở {rel:.0f}% thời lượng, ngoài {TWIST_RO[0]}–{TWIST_RO[1]}% (sổ tay mục 14)'))
    # W15: móc giữ chân ~25 s
    moc = [c['t0'] for c in cs if _la_moc(c['text'])]
    mốc = [0.0] + moc + [tot]
    gaps = [b - a for a, b in zip(mốc, mốc[1:])]
    tb = tot / max(len(moc), 1)
    if not moc: out.append((1, 'W15', 'không có câu móc nào ("nhưng"/"cho đến khi"/câu hỏi): cứ ~25 s một móc'))
    else:
        if not MOC_TB_RANGE[0] <= tb <= MOC_TB_RANGE[1]:
            out.append((1, 'W15', f'{len(moc)} móc trong {tot:.0f} s: tb {tb:.0f} s/móc, ngoài {MOC_TB_RANGE[0]:g}–{MOC_TB_RANGE[1]:g} s (chuẩn ~{MOC_GIAY:g} s)'))
        if max(gaps) > MOC_GAP_MAX:
            out.append((1, 'W15', f'khoảng trống dài nhất không có móc: {max(gaps):.0f} s (> {MOC_GAP_MAX:g} s)'))
    # W16: từ/phút; W18: câu tb
    tu = sum(_so_tu(c['text']) for c in cs)
    wpm = tu / tot * 60
    if not WPM_RANGE[0] <= wpm <= WPM_RANGE[1]:
        out.append((1, 'W16', f'lời kể {tu} từ / {tot:.0f} s = {wpm:.0f} từ/phút, ngoài {WPM_RANGE[0]}–{WPM_RANGE[1]} (chuẩn ~290)'))
    ctb = tu / len(cs)
    if not CAU_TB_RANGE[0] <= ctb <= CAU_TB_RANGE[1]:
        out.append((1, 'W18', f'câu trung bình {ctb:.1f} từ, ngoài {CAU_TB_RANGE[0]}–{CAU_TB_RANGE[1]} (chuẩn ~14; hook ~18)'))
    # W17: CTA
    for c in cs:
        if _co_tu(c['text'], CTA_KW):
            out.append((c['dong'], 'W17', 'lời kể có kêu gọi đăng ký/theo dõi (0/37 video có CTA)'))
    return out


def kiem_loi_ke(path):
    """narration.txt: dòng `@at <giây> câu`. Trả (lỗi, cảnh báo) dạng (dòng, mã, thông báo)."""
    errs, ws, mocs = [], [], []
    for i, raw in enumerate(Path(path).read_text(encoding='utf-8-sig').splitlines(), 1):
        m = re.match(r'^@at\s+(\S+)\s*(.*)$', raw.strip())
        if not m: continue
        try: t = float(m.group(1).replace(',', '.'))
        except ValueError: errs.append((i, 'N01', f'mốc @at "{m.group(1)}" không phải số giây')); continue
        if mocs and t <= mocs[-1][1]: errs.append((i, 'N01', f'mốc @at {t:g} không lớn hơn mốc trước ({mocs[-1][1]:g})'))
        if not m.group(2).strip(): errs.append((i, 'N01', 'dòng @at không có câu')); continue
        mocs.append((i, t, m.group(2).strip()))
    if not mocs: return [(1, 'N01', 'không có dòng @at nào')], ws
    if not fold(mocs[0][2]).startswith('o thi tran nay'):
        errs.append((mocs[0][0], 'N02', 'câu lời kể đầu phải bắt đầu bằng "Ở thị trấn này"'))
    for k, (i, t, text) in enumerate(mocs[:-1]):
        can, co = len(text) / KY_TU_GIAY_GIONG, mocs[k + 1][1] - t
        if can > co * DOC_DU_SUC + 0.3:
            ws.append((i, 'W10', f'câu cần ~{can:.1f} s nhưng tới mốc câu sau chỉ có {co:.1f} s: giọng tràn hoặc phải ép nhanh'))
    cuoi = mocs[-1][1] + len(mocs[-1][2]) / KY_TU_GIAY_GIONG
    if not TONG_LOI_KE[0] <= cuoi <= TONG_LOI_KE[1]:
        ws.append((mocs[-1][0], 'W11', f'lời kể kết thúc ~{cuoi:.0f} s, ngoài {TONG_LOI_KE[0]}–{TONG_LOI_KE[1]} s'))
    if not any(_co_ngoi_thu_nhat(t) for _, _, t in mocs):
        ws.append((mocs[0][0], 'W12', 'không câu nào có ngôi thứ nhất (tôi/mình/em/con…)'))
    # _RO
    xong = mocs[0][1] + _so_tu(mocs[0][2]) / TU_GIAY
    if xong > LUAT_TOI_DA_GIAY:
        ws.append((mocs[0][0], 'W13', f'luật nói xong ở ~{xong:.1f} s (> {LUAT_TOI_DA_GIAY:g} s)'))
    tot = mocs[-1][1] + _so_tu(mocs[-1][2]) / TU_GIAY - mocs[0][1]
    tu = sum(_so_tu(t) for _, _, t in mocs)
    if tot > 0 and not WPM_RANGE[0] <= tu / tot * 60 <= WPM_RANGE[1]:
        ws.append((mocs[0][0], 'W16', f'{tu} từ / ~{tot:.0f} s = {tu / tot * 60:.0f} từ/phút, ngoài {WPM_RANGE[0]}–{WPM_RANGE[1]}'))
    for i, _, t in mocs:
        if _co_tu(t, CTA_KW): ws.append((i, 'W17', 'lời kể có kêu gọi đăng ký/theo dõi (0/37 video có CTA)'))
    return errs, ws


def main(argv):
    if hasattr(sys.stdout, 'reconfigure'): sys.stdout.reconfigure(encoding='utf-8')
    if hasattr(sys.stderr, 'reconfigure'): sys.stderr.reconfigure(encoding='utf-8')
    args = [a for a in argv if not a.startswith('--')]
    if '--loi-ke' in argv and args:
        try: errs, ws = kiem_loi_ke(args[0])
        except OSError:
            print(f'{args[0]}: K00 không đọc được file', file=sys.stderr); return 2
        n = Path(args[0]).name
        for l, c, m in errs: print(f'{n}:{l}: {c} {m}')
        for l, c, m in ws: print(f'{n}:{l}: {c} (cảnh báo) {m}')
        print(f'kiem-loi-ke: {len(errs)} lỗi · {len(ws)} cảnh báo')
        return 1 if errs else 0
    if not args:
        print(__doc__); return 2
    p = Path(args[0])
    try: errs = lint(p)
    except OSError:
        print(f'{args[0]}: K00 không đọc được file', file=sys.stderr); return 2
    try: ws = sorted(canh_bao(p) + canh_bao_kich_ban(p) + canh_bao_RO(p))
    except Exception: ws = []
    if '--json' in argv:
        print(json.dumps([{'dong': n, 'ma': c, 'msg': m} for n, c, m in errs + ws], ensure_ascii=False, indent=2))
    else:
        for n, c, m in errs: print(f'{p.name}:{n}: {c} {m}')
        for n, c, m in ws: print(f'{p.name}:{n}: {c} (cảnh báo) {m}')
    return 1 if errs else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
