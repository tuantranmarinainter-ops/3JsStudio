#!/usr/bin/env python3
"""hoc_phong_cach.py — học phong cách từ 37 video "Ở thị trấn này" (kế hoạch: docs/hoc-phong-cach.md).

  python tools/hoc_phong_cach.py may   [--chi "<từ>"] [--force] [--jobs 3]   B máy + E/I máy: cắt shot (ref.detect_cuts như video2kb),
        10 frame/shot → output/hoc-phong-cach/<slug>/frames/sNNN.jpg (dải 10 ô), may.json (độ sáng/bão hoà/tông, zoom/pan,
        dấu vân ảnh, sự kiện chớp/rung/đổi màu/zoom giật)
  python tools/hoc_phong_cach.py loi   [--chi "<từ>"]            A: đọc .srt → loi.json (hook, luật, 4 phần, nhịp, giọng, móc, nhân vật, twist, kết)
  python tools/hoc_phong_cach.py ghep                            C (cắt vs câu) + E (lặp trong/giữa video) + tổng → tong.json
  python tools/hoc_phong_cach.py so-tay                          ghi docs/so-tay-phong-cach.md + dist/so-tay-phong-cach.html
  python tools/hoc_phong_cach.py tat-ca                          may → loi → ghep → so-tay

Nguồn: thư mục NGUON (37 .mp4 + .vi.srt, tên có dấu → chép sang output/hoc-phong-cach/_nguon/<slug>.mp4|.srt).
Dùng lại slug() của tools/nghien_cuu_map.py và ref.detect_cuts/build_shots của tools/video2kb.py. Số liệu là HEURISTIC máy
đo (ghi rõ trong sổ tay); phần cần nhìn ảnh để agent làm sau.
"""
import argparse, json, math, re, shutil, sys, statistics as st
from collections import Counter, defaultdict
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import ref  # noqa: E402
from nghien_cuu_map import slug  # noqa: E402

for _s in (sys.stdout, sys.stderr):
    try: _s.reconfigure(encoding='utf-8', errors='replace')
    except Exception: pass

ROOT = Path(__file__).resolve().parent.parent
NGUON = Path(r'S:\MINECRAFT MOD\YOUTUBE MC w BAO\ROTOICHOI\Rô Tới Chơi')
GOC = ROOT / 'output' / 'hoc-phong-cach'
PHAN = [('Hook', 0.0, 0.10), ('Leo thang', 0.10, 0.50), ('Twist', 0.50, 0.75), ('Giải quyết', 0.75, 1.0)]
N_FR = 10


def phan_cua(p):
    for i, (_, a, b) in enumerate(PHAN):
        if p < b: return i
    return 3


def tb(xs, nd=2):
    xs = [x for x in xs if x is not None]
    return round(sum(xs) / len(xs), nd) if xs else None


def danh_sach(chi=None):
    vids = sorted(NGUON.glob('*.mp4'))
    if chi: vids = [v for v in vids if chi.lower() in v.name.lower() or chi.lower() in slug(v.name)]
    return vids


def chuan_bi(v):
    s = slug(v.name)
    (GOC / '_nguon').mkdir(parents=True, exist_ok=True)
    for ext_src, ext_dst in ((v, '.mp4'), (v.with_suffix('.vi.srt'), '.srt')):
        dst = GOC / '_nguon' / f'{s}{ext_dst}'
        if ext_src.exists() and not dst.exists(): shutil.copy2(ext_src, dst)
    return s


# ================================================================ MÁY (B, E, I)
def _dhash(img_bgr):
    import cv2
    g = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    g = cv2.resize(g, (17, 16), interpolation=cv2.INTER_AREA)
    bits = (g[:, 1:] > g[:, :-1]).flatten()
    n = 0
    for b in bits: n = (n << 1) | int(b)
    return f'{n:064x}'


def may_mot(args):
    """Một video → may.json + frames/. Chạy trong tiến trình con."""
    import cv2, numpy as np
    from PIL import Image, ImageDraw
    cv2.setNumThreads(1)
    s, force = args
    out = GOC / s
    if (out / 'may.json').exists() and not force: return s, 'đã có'
    out.mkdir(parents=True, exist_ok=True)
    src = GOC / '_nguon' / f'{s}.mp4'
    cap = cv2.VideoCapture(str(src))
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    nf = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)); W = int(cap.get(3)); H = int(cap.get(4))
    dur = nf / fps
    shots = ref.build_shots(ref.detect_cuts(src, 0.25), dur, 0.15)
    for sh in shots:
        sh['f0'] = int(round(sh['start'] * fps)); sh['f1'] = max(sh['f0'] + 1, min(nf, int(round(sh['end'] * fps))))
    starts = {sh['f0'] for sh in shots}
    samp = {}                                    # frame → (shot idx, k)
    for i, sh in enumerate(shots):
        for k in range(N_FR):
            f = min(sh['f1'] - 1, sh['f0'] + int((k + 0.5) / N_FR * (sh['f1'] - sh['f0'])))
            samp.setdefault(f, []).append((i, k))
    lum, sat, warm = np.zeros(nf), np.zeros(nf), np.zeros(nf)
    div, tx, ty = np.zeros(nf), np.zeros(nf), np.zeros(nf)
    pics = defaultdict(dict)
    prev = None
    ys, xs = np.mgrid[0:142, 0:80]
    cx, cy = 39.5, 70.5
    xr, yr = xs - cx, ys - cy
    r2 = (xr ** 2 + yr ** 2).mean()
    i = 0
    while i < nf:
        ok, fr = cap.read()
        if not ok: break
        sm = cv2.resize(fr, (80, 142), interpolation=cv2.INTER_AREA)
        g = cv2.cvtColor(sm, cv2.COLOR_BGR2GRAY)
        hsv = cv2.cvtColor(sm, cv2.COLOR_BGR2HSV)
        lum[i] = g.mean(); sat[i] = hsv[:, :, 1].mean()
        warm[i] = (sm[:, :, 2].mean() - sm[:, :, 0].mean()) / 255.0
        if prev is not None and i not in starts:
            fl = cv2.calcOpticalFlowFarneback(prev, g, None, 0.5, 2, 9, 2, 5, 1.1, 0)
            fx, fy = fl[:, :, 0], fl[:, :, 1]
            div[i] = (xr * fx + yr * fy).mean() / r2
            tx[i] = float(np.median(fx)); ty[i] = float(np.median(fy))
        prev = g
        if i in samp:
            big = cv2.resize(fr, (108, 192), interpolation=cv2.INTER_AREA)
            for (si, k) in samp[i]: pics[si][k] = (big, i)
        i += 1
    cap.release()
    nf = i
    # ---- dải 10 ô mỗi shot + dấu vân
    (out / 'frames').mkdir(exist_ok=True)
    for si, sh in enumerate(shots):
        ks = sorted(pics[si])
        if not ks: continue
        strip = Image.new('RGB', (108 * N_FR, 192 + 14), 'white')
        d = ImageDraw.Draw(strip)
        for k in ks:
            im = Image.fromarray(cv2.cvtColor(pics[si][k][0], cv2.COLOR_BGR2RGB))
            strip.paste(im, (k * 108, 0))
        d.text((2, 194), f"{sh['id']}  {sh['start']:.1f}-{sh['end']:.1f}s", fill='black')
        strip.save(out / 'frames' / f"{sh['id']}.jpg", quality=80)
        sh['hash'] = _dhash(pics[si][ks[len(ks) // 2]][0])
    # ---- số đo từng shot
    for sh in shots:
        a, b = sh['f0'], min(sh['f1'], nf)
        if b <= a: b = a + 1
        sl = slice(a, b)
        sh['sang'] = round(float(lum[sl].mean()), 1); sh['bh'] = round(float(sat[sl].mean()), 1)
        sh['am'] = round(float(warm[sl].mean()), 3)
        zoom = float(div[sl].sum()); pan = float(math.hypot(tx[sl].sum(), ty[sl].sum()) / 80.0)
        sh['zoom'] = round(zoom, 3); sh['pan'] = round(pan, 3)
        sh['cd'] = 'zoom-in' if zoom > 0.10 else 'zoom-out' if zoom < -0.10 else 'pan' if pan > 0.06 else 'dung'
    # ---- sự kiện VFX máy dò
    ev = {'chop': [], 'rung': [], 'doi-mau': [], 'zoom-giat': []}
    for si, sh in enumerate(shots):
        a, b = sh['f0'], min(sh['f1'], nf)
        for f in range(a + 2, b):
            dl = lum[f] - lum[f - 1]
            if abs(dl) > 22: ev['chop'].append({'t': round(f / fps, 2), 'shot': sh['id'], 'dl': round(float(dl), 1)})
            if abs(warm[f] - warm[f - 1]) > 0.06 or abs(sat[f] - sat[f - 1]) > 14:
                ev['doi-mau'].append({'t': round(f / fps, 2), 'shot': sh['id']})
        dv = np.abs(div[a:b]); md = float(np.median(dv)) if len(dv) else 0
        for j in np.where((dv > 0.03) & (dv > 4 * md + 0.01))[0]:
            ev['zoom-giat'].append({'t': round((a + int(j)) / fps, 2), 'shot': sh['id'], 'd': round(float(div[a + j]), 3)})
        # rung: tx/ty đổi dấu liên tục trong cửa sổ 12 khung
        for w in range(a, b - 12, 6):
            seg = np.concatenate([tx[w:w + 12], ty[w:w + 12]]) if False else None
            for ax in (tx, ty):
                v = ax[w:w + 12]; big = v[np.abs(v) > 0.5]
                if len(big) >= 5 and (np.sign(big[1:]) != np.sign(big[:-1])).sum() >= 4:
                    ev['rung'].append({'t': round(w / fps, 2), 'shot': sh['id']}); break
    # gộp sự kiện liền nhau (< 0.5 s) cùng loại
    for k, L in ev.items():
        m = []
        for e in L:
            if m and e['t'] - m[-1]['t'] < 0.5 and e['shot'] == m[-1]['shot']: m[-1]['n'] = m[-1].get('n', 1) + 1
            else: m.append(dict(e, n=1))
        ev[k] = m
    for sh in shots:
        for k in ('f0', 'f1'): sh.pop(k)
    meta = {'slug': s, 'w': W, 'h': H, 'fps': round(fps, 2), 'dur': round(dur, 2), 'khung': nf}
    nguon = next((v.name for v in NGUON.glob('*.mp4') if slug(v.name) == s), s)
    meta['ten'] = re.sub(r'\s*\[[^\]]*\]\s*$', '', Path(nguon).stem)
    (out / 'may.json').write_text(json.dumps({'meta': meta, 'shots': shots, 'su-kien': ev}, ensure_ascii=False), encoding='utf-8')
    return s, f'{len(shots)} shot'


def cmd_may(a):
    ten = [chuan_bi(v) for v in danh_sach(a.chi)]
    print(f'{len(ten)} video, {a.jobs} tiến trình…')
    with ProcessPoolExecutor(max_workers=a.jobs) as ex:
        for s, msg in ex.map(may_mot, [(t, a.force) for t in ten]):
            print(f'  ✓ {s}: {msg}', flush=True)


# ================================================================ A: .srt
def doc_srt(p):
    txt = Path(p).read_text(encoding='utf-8-sig', errors='replace').replace('\r', '')
    cues = []
    for blk in re.split(r'\n\s*\n', txt.strip()):
        ln = blk.strip().split('\n')
        if len(ln) < 3: continue
        m = re.match(r'(\d+):(\d+):(\d+)[,.](\d+)\s*-->\s*(\d+):(\d+):(\d+)[,.](\d+)', ln[1])
        if not m: continue
        g = [int(x) for x in m.groups()]
        cues.append((g[0] * 3600 + g[1] * 60 + g[2] + g[3] / 1000, g[4] * 3600 + g[5] * 60 + g[6] + g[7] / 1000, ' '.join(ln[2:]).strip()))
    return cues


def cau_tu_cues(cues):
    """Ghép các cue thành câu; mốc giây nội suy theo vị trí ký tự trong cue."""
    ch = []          # (ký tự, giây)
    for a, b, t in cues:
        n = max(1, len(t))
        for i, c in enumerate(t + ' '): ch.append((c, a + (b - a) * min(1.0, i / n)))
    sents, cur, t0 = [], [], None
    for i, (c, t) in enumerate(ch):
        if t0 is None and c.strip(): t0 = t
        cur.append(c)
        if c in '.?!…' and (i + 1 >= len(ch) or ch[i + 1][0] == ' '):
            s = ''.join(cur).strip()
            if s: sents.append({'t0': round(t0 or t, 2), 't1': round(t, 2), 'text': s})
            cur, t0 = [], None
    s = ''.join(cur).strip()
    if s: sents.append({'t0': round(t0 or ch[-1][1], 2), 't1': round(cues[-1][1], 2), 'text': s})
    return sents


def tu(s): return re.findall(r"[\wÀ-ỹ]+", s.lower())


XUNG = ['tôi', 'mình', 'em', 'con', 'ba', 'mẹ', 'bố', 'bà', 'ông', 'anh', 'chị', 'cô', 'chú', 'cậu', 'bạn', 'chúng tôi', 'chúng ta', 'mọi người']
NOI = ['nhưng', 'rồi', 'thế là', 'và', 'sau đó', 'vì', 'nên', 'thì', 'cho đến khi', 'cho tới khi', 'bỗng', 'đột nhiên', 'lúc đó', 'từ đó', 'hoá ra', 'thật ra', 'thì ra', 'vậy là', 'thế nhưng', 'tuy nhiên']
TWIST = ['hoá ra', 'hóa ra', 'thì ra', 'thật ra', 'thực ra', 'sự thật', 'thực chất', 'mới hiểu', 'mới biết', 'tôi hiểu', 'chợt hiểu', 'bí mật là', 'thật sự là']
BIMAT = ['bí mật', 'giấu', 'không được nói', 'không ai biết', 'không bao giờ nói', 'cấm', 'dặn', 'đừng nói', 'chẳng ai nói', 'giả vờ']
GAME = ['thanh máu', '%', 'phần trăm', 'pin', 'đếm ngược', 'điểm', 'cấp', 'level', 'con số', 'lượt', 'mạng', 'thời gian còn', 'còn lại', 'hồi sinh', 'sinh nhật', 'tích luỹ', 'cộng', 'trừ', 'hiện lên', 'trên đầu']
GIA = ['mất', 'chết', 'biến mất', 'phải', 'nếu', 'trả giá', 'đánh đổi', 'hậu quả', 'quên', 'đau', 'cái giá', 'sẽ bị', 'không thể']
MOC = ['?', 'nhưng', 'cho đến khi', 'cho tới khi', 'bỗng', 'đột nhiên', 'bí mật', 'không ai biết', 'chuyện gì', 'tại sao', 'vì sao', 'thế rồi']
CTA = ['đăng ký', 'theo dõi', 'like', 'bình luận', 'chia sẻ', 'subscribe', 'kênh', 'xem tiếp', 'tập sau', 'comment']


def co(s, ds): s = s.lower(); return [d for d in ds if d in s]


def phan_tich_loi(s):
    srt = GOC / '_nguon' / f'{s}.srt'
    if not srt.exists(): return None
    cues = doc_srt(srt)
    if not cues: return None
    cs = cau_tu_cues(cues)
    T0, T1 = cues[0][0], cues[-1][1]; dur = T1 - T0
    for x in cs:
        x['p'] = round((x['t0'] - T0) / dur, 3); x['n'] = len(tu(x['text']))
    words = sum(x['n'] for x in cs)
    # --- hook + luật
    luat = next((x for x in cs if x['p'] <= 0.25 and re.search(r'(ở|tại|trong) (thị trấn|thế giới|thành phố|ngôi làng|vùng đất|nơi|thị xã)', x['text'].lower())), cs[0])
    li = cs.index(luat)
    luat_ctx = ' '.join(c['text'] for c in cs[li:li + 2])
    # --- 4 phần
    ph = []
    for i, (nm, pa, pb) in enumerate(PHAN):
        sel = [x for x in cs if phan_cua(x['p']) == i]
        w = sum(x['n'] for x in sel); d = (pb - pa) * dur
        ph.append({'ten': nm, 'cau': len(sel), 'tu': w, 'tu_phut': round(w / d * 60, 1) if d else 0,
                   'do_dai_cau': tb([x['n'] for x in sel], 1)})
    # --- twist: câu sau 40% có từ khoá twist đầu tiên + khoảng cách gài (bí mật) → mở
    tw = next((x for x in cs if x['p'] >= 0.40 and co(x['text'], TWIST)), None)
    gai = next((x for x in cs if co(x['text'], BIMAT)), None)
    # --- giọng kể
    full = ' '.join(x['text'] for x in cs).lower(); tk = tu(full)
    xung = {k: len(re.findall(rf'(?<![\wÀ-ỹ]){k}(?![\wÀ-ỹ])', full)) for k in XUNG}
    noi = {k: len(re.findall(rf'(?<![\wÀ-ỹ]){k}(?![\wÀ-ỹ])', full)) for k in NOI}
    ngoi1 = sum(xung[k] for k in ('tôi', 'mình', 'em')) / max(1, len(cs))
    tri = Counter(' '.join(tk[i:i + 3]) for i in range(len(tk) - 2))
    cua_mieng = [(k, v) for k, v in tri.most_common(40) if v >= 3][:8]
    # --- móc giữ chân
    moc = [x for x in cs if co(x['text'], MOC)]
    gap = [moc[i + 1]['t0'] - moc[i]['t0'] for i in range(len(moc) - 1)]
    # --- tên riêng: từ viết hoa giữa câu
    ten = Counter()
    for x in cs:
        ws = re.findall(r"[\wÀ-ỹ]+", x['text'])
        for w in ws[1:]:
            if w[0].isupper() and len(w) > 1: ten[w] += 1
    ten = [(k, v) for k, v in ten.most_common(12) if v >= 2]
    # --- khoảng lặng giữa cue (hiếm) + độ dài câu
    lang = [(cues[i + 1][0] - cues[i][1]) for i in range(len(cues) - 1)]
    lang = [g for g in lang if g > 0.35]
    # --- kết
    cta = [x for x in cs[-4:] if co(x['text'], CTA)]
    return {
        'slug': s, 'dur_loi': round(dur, 1), 'cau': len(cs), 'tu': words, 'tu_phut': round(words / dur * 60, 1),
        'do_dai_cau': {'tb': tb([x['n'] for x in cs], 1), 'max': max(x['n'] for x in cs), 'ngan(<=5)': sum(1 for x in cs if x['n'] <= 5)},
        'hook': [{'t': x['t0'], 'text': x['text']} for x in cs[:3]],
        'luat': {'giay': luat['t0'], 'chi_so_cau': li, 'text': luat_ctx, 'co_che_game': co(luat_ctx, GAME), 'cai_gia': co(' '.join(c['text'] for c in cs[li:li + 4]), GIA)},
        'phan': ph,
        'twist': {'giay': tw['t0'], 'p': tw['p'], 'text': tw['text'], 'tu_khoa': co(tw['text'], TWIST)} if tw else None,
        'gai_bi_mat': {'giay': gai['t0'], 'p': gai['p'], 'text': gai['text']} if gai else None,
        'khoang_gai_mo_s': round(tw['t0'] - gai['t0'], 1) if tw and gai and tw['t0'] > gai['t0'] else None,
        'xung_ho': {k: v for k, v in xung.items() if v}, 'ngoi_thu_nhat_moi_cau': round(ngoi1, 2),
        'tu_noi': {k: v for k, v in noi.items() if v}, 'cau_cua_mieng': cua_mieng,
        'moc': {'so': len(moc), 'cach_nhau_s': tb(gap, 1), 'moi_n_giay': round(dur / max(1, len(moc)), 1)},
        'ten_rieng': ten,
        'bi_mat': [{'t': x['t0'], 'text': x['text'][:140]} for x in cs if co(x['text'], BIMAT)][:5],
        'khoang_lang': {'so': len(lang), 'max_s': round(max(lang), 2) if lang else 0},
        'ket': {'cau_chot': cs[-1]['text'], 'ba_cau_cuoi': [x['text'] for x in cs[-3:]], 'cta': [x['text'] for x in cta]},
        'cau_list': cs,
    }


def cmd_loi(a):
    for v in danh_sach(a.chi):
        s = chuan_bi(v)
        r = phan_tich_loi(s)
        if not r: print(f'  ✗ {s}: không có .srt'); continue
        (GOC / s).mkdir(parents=True, exist_ok=True)
        (GOC / s / 'loi.json').write_text(json.dumps(r, ensure_ascii=False, indent=1), encoding='utf-8')
        print(f'  ✓ {s}: {r["cau"]} câu · {r["tu_phut"]} từ/phút · luật @{r["luat"]["giay"]}s')


# ================================================================ C + E + tổng
def popcnt(x): return bin(x).count('1')


def cmd_ghep(a):
    vids = sorted(d for d in GOC.iterdir() if d.is_dir() and not d.name.startswith('_') and (d / 'may.json').exists())
    tong, allh = [], []
    for d in vids:
        m = json.loads((d / 'may.json').read_text(encoding='utf-8'))
        L = json.loads((d / 'loi.json').read_text(encoding='utf-8')) if (d / 'loi.json').exists() else None
        sh = m['shots']; dur = m['meta']['dur']; n = len(sh)
        row = {'slug': d.name, 'ten': m['meta']['ten'], 'dur': dur, 'shot': n, 'shot_phut': round(n / dur * 60, 1) if dur else 0,
               'shot_dai_tb': tb([x['dur'] for x in sh]), 'shot_dai_trung_vi': round(st.median([x['dur'] for x in sh]), 2)}
        # B máy theo phần
        ph = []
        for i, (nm, pa, pb) in enumerate(PHAN):
            sel = [x for x in sh if phan_cua((x['start'] + x['end']) / 2 / dur) == i]
            c = Counter(x['cd'] for x in sel)
            ph.append({'ten': nm, 'shot': len(sel), 'dai': tb([x['dur'] for x in sel]), 'sang': tb([x['sang'] for x in sel], 1),
                       'bh': tb([x['bh'] for x in sel], 1), 'am': tb([x['am'] for x in sel], 3),
                       'cd': {k: round(v / max(1, len(sel)), 2) for k, v in c.items()}})
        row['phan'] = ph
        c = Counter(x['cd'] for x in sh); row['cd'] = {k: round(v / n, 2) for k, v in c.items()}
        row['sang'] = tb([x['sang'] for x in sh], 1); row['bh'] = tb([x['bh'] for x in sh], 1); row['am'] = tb([x['am'] for x in sh], 3)
        # I máy
        ev = m['su-kien']; row['vfx'] = {k: len(v) for k, v in ev.items()}
        row['vfx_phut'] = {k: round(len(v) / dur * 60, 1) for k, v in ev.items()}
        # E máy: shot lặp trong video (hamming ≤ 48/256) chỉ tính cặp cách ≥ 2 shot
        hs = [(i, int(x['hash'], 16)) for i, x in enumerate(sh) if x.get('hash')]
        lap = []
        for ii in range(len(hs)):
            for jj in range(ii + 2, len(hs)):
                dist = popcnt(hs[ii][1] ^ hs[jj][1])
                if dist <= 48: lap.append((hs[ii][0], hs[jj][0], dist))
        in_lap = set()
        for i, j, _ in lap: in_lap.update((i, j))
        row['lap'] = {'cap': len(lap), 'shot_lap': len(in_lap), 'ti_le': round(len(in_lap) / max(1, n), 2),
                      'cap_dau': [(sh[i]['id'], sh[j]['id'], dd) for i, j, dd in sorted(lap, key=lambda x: x[2])[:6]]}
        # chuỗi lặp: i,i+1 giống j,j+1
        lapset = {(i, j) for i, j, _ in lap}
        row['lap']['chuoi2'] = sum(1 for i, j in lapset if (i + 1, j + 1) in lapset)
        for i, x in hs: allh.append((d.name, sh[i]['id'], x))
        # C máy
        if L:
            cs = L['cau_list']; cuts = [x['start'] for x in sh[1:]]
            def gan(t): return min((abs(c - t) for c in cuts), default=9)
            ket_cau = [gan(x['t1']) for x in cs]
            sat = sum(1 for g in ket_cau if g <= 0.3)
            cut_cuoi_cau = sum(1 for c in cuts if min(abs(c - x['t1']) for x in cs) <= 0.3)
            cut_dau_cau = sum(1 for c in cuts if min(abs(c - x['t0']) for x in cs) <= 0.3)
            def shot_tai(t): return next((x for x in sh if x['start'] <= t < x['end']), sh[-1])
            key = [L['luat']['giay']] + ([L['twist']['giay']] if L['twist'] else [])
            sau_cau = [shot_tai(x['t1'] + 0.05) for x in cs]
            sh_cau = [len({shot_tai(t)['id'] for t in (x['t0'] + 0.05, (x['t0'] + x['t1']) / 2, x['t1'] - 0.05)}) for x in cs]
            tw = None
            if L['twist']:
                t = L['twist']['giay']; tt = shot_tai(t)
                tw = {'giay': t, 'shot': tt['id'], 'dai': round(tt['dur'], 2), 'cd': tt['cd']}
            row['hinh_khop_loi'] = {
                'cau': len(cs), 'cau_ket_sat_cut(<=0.3s)': sat, 'ti_le_cau_cat_dung': round(sat / len(cs), 2),
                'cut_cuoi_cau': round(cut_cuoi_cau / max(1, len(cuts)), 2), 'cut_dau_cau': round(cut_dau_cau / max(1, len(cuts)), 2),
                'cut_giua_cau': round(sum(1 for c in cuts if min(abs(c - x['t1']) for x in cs) > 0.3 and min(abs(c - x['t0']) for x in cs) > 0.3) / max(1, len(cuts)), 2),
                'shot_moi_cau_tb': tb(sh_cau, 2), 'shot_dai_sau_cau_hoi': tb([shot_tai(x['t1'] + 0.05)['dur'] for x in cs if x['text'].endswith('?')]),
                'twist': tw}
            row['loi'] = {k: L[k] for k in ('tu_phut', 'cau', 'do_dai_cau')}
        tong.append(row)
    # E giữa video: cặp shot giống nhau ở video khác nhau
    gv = Counter(); thuoc = defaultdict(set)
    H = allh
    for x in range(len(H)):
        for y in range(x + 1, len(H)):
            if H[x][0] != H[y][0] and popcnt(H[x][2] ^ H[y][2]) <= 40:
                gv[H[x][0]] += 1; gv[H[y][0]] += 1; thuoc[H[x][0]].add(H[y][0]); thuoc[H[y][0]].add(H[x][0])
    for r in tong: r['lap_giua_video'] = {'shot_giong_video_khac': gv.get(r['slug'], 0), 'so_video_khac': len(thuoc.get(r['slug'], ()))}
    # câu chữ lặp giữa video: 4-gram xuất hiện ở ≥ 4 video
    ng = defaultdict(set); ngs = Counter()
    for r in tong:
        p = GOC / r['slug'] / 'loi.json'
        if not p.exists(): continue
        L = json.loads(p.read_text(encoding='utf-8'))
        tk = tu(' '.join(x['text'] for x in L['cau_list']))
        for i in range(len(tk) - 3):
            g = ' '.join(tk[i:i + 4]); ng[g].add(r['slug']); ngs[g] += 1
    chung = sorted(((g, len(v), ngs[g]) for g, v in ng.items() if len(v) >= 4), key=lambda x: (-x[1], -x[2]))[:25]
    (GOC / 'tong.json').write_text(json.dumps({'video': tong, 'cum_tu_chung': chung}, ensure_ascii=False, indent=1), encoding='utf-8')
    print(f'  ✓ tong.json: {len(tong)} video, {len(chung)} cụm từ chung')


# ================================================================ SỔ TAY
def cmd_so_tay(a):
    tj = GOC / 'tong.json'
    if not tj.exists(): sys.exit('Chưa có tong.json — chạy `ghep` trước.')
    T = json.loads(tj.read_text(encoding='utf-8')); V = T['video']
    Ls = {r['slug']: json.loads((GOC / r['slug'] / 'loi.json').read_text(encoding='utf-8')) for r in V if (GOC / r['slug'] / 'loi.json').exists()}

    def kh(xs, nd=1):
        xs = [x for x in xs if x is not None]
        if not xs: return '—'
        return f'{round(st.mean(xs), nd)} ({round(min(xs), nd)}–{round(max(xs), nd)})'
    md = ['# Sổ tay phong cách (BẢN NHÁP — phần A + số liệu máy, 37 video)', '',
          f'Sinh bởi `tools/hoc_phong_cach.py so-tay` · dữ liệu `output/hoc-phong-cach/` · **{len(V)} video**. Ô số = trung bình (nhỏ nhất–lớn nhất).',
          'Số liệu máy là **heuristic**: luật/twist/móc tìm theo từ khoá; zoom/pan đo bằng optical flow toàn khung (nhân vật chuyển động có thể nhiễu).',
          'Phần cần nhìn ảnh (cỡ cảnh, bố cục D, F, G, H, chữ nổi, VFX gọi tên) chưa làm — chờ duyệt Dừng lần 1.', '']
    md += ['## 1. Nhịp cắt (B máy)', '', '| Chỉ số | Trung bình (min–max) |', '|---|---|',
           f'| Thời lượng video (s) | {kh([r["dur"] for r in V])} |', f'| Số shot | {kh([r["shot"] for r in V], 0)} |',
           f'| Shot/phút | {kh([r["shot_phut"] for r in V])} |', f'| Độ dài shot trung bình (s) | {kh([r["shot_dai_tb"] for r in V], 2)} |',
           f'| Độ dài shot trung vị (s) | {kh([r["shot_dai_trung_vi"] for r in V], 2)} |', '', '**Theo phần** (tb qua 37 video):', '',
           '| Phần | Shot | Dài shot (s) | Sáng 0–255 | Bão hoà | Ấm (R−B) | Zoom-in | Zoom-out | Pan | Đứng |', '|---|---|---|---|---|---|---|---|---|---|']
    for i, (nm, _, _) in enumerate(PHAN):
        P = [r['phan'][i] for r in V]
        g = lambda k: kh([p['cd'].get(k, 0) * 100 for p in P], 0)
        md.append(f'| {nm} | {kh([p["shot"] for p in P], 0)} | {kh([p["dai"] for p in P], 2)} | {kh([p["sang"] for p in P])} | {kh([p["bh"] for p in P])} | '
                  f'{kh([p["am"] for p in P], 3)} | {g("zoom-in")}% | {g("zoom-out")}% | {g("pan")}% | {g("dung")}% |')
    gc = lambda k: kh([r['cd'].get(k, 0) * 100 for r in V], 0)
    md += ['', f'Cả video: zoom-in {gc("zoom-in")}% · zoom-out {gc("zoom-out")}% · pan {gc("pan")}% · đứng {gc("dung")}% (tỉ lệ shot).', '']
    # A
    md += ['## 2. Kịch bản (A, từ .srt)', '', '| Chỉ số | Trung bình (min–max) |', '|---|---|',
           f'| Từ/phút | {kh([l["tu_phut"] for l in Ls.values()])} |', f'| Số câu | {kh([l["cau"] for l in Ls.values()], 0)} |',
           f'| Độ dài câu (từ) | {kh([l["do_dai_cau"]["tb"] for l in Ls.values()])} |',
           f'| Giây nói ra luật | {kh([l["luat"]["giay"] for l in Ls.values()])} |',
           f'| Luật nằm ở câu số | {kh([l["luat"]["chi_so_cau"] + 1 for l in Ls.values()])} |',
           f'| Twist (từ khoá) ở % video | {kh([l["twist"]["p"] * 100 for l in Ls.values() if l["twist"]], 0)} |',
           f'| Khoảng gài bí mật → twist (s) | {kh([l["khoang_gai_mo_s"] for l in Ls.values()], 0)} |',
           f'| Móc giữ chân cách nhau (s) | {kh([l["moc"]["cach_nhau_s"] for l in Ls.values()])} |',
           f'| Ngôi thứ nhất / câu | {kh([l["ngoi_thu_nhat_moi_cau"] for l in Ls.values()], 2)} |',
           f'| Câu chốt có CTA | {sum(1 for l in Ls.values() if l["ket"]["cta"])}/{len(Ls)} video |', '',
           '**Nhịp lời theo phần** (từ/phút):', '', '| Phần | Từ/phút | Độ dài câu |', '|---|---|---|']
    for i, (nm, _, _) in enumerate(PHAN):
        md.append(f'| {nm} | {kh([l["phan"][i]["tu_phut"] for l in Ls.values()])} | {kh([l["phan"][i]["do_dai_cau"] for l in Ls.values()])} |')
    xc = Counter(); [xc.update(l['xung_ho']) for l in Ls.values()]
    nc = Counter(); [nc.update(l['tu_noi']) for l in Ls.values()]
    md += ['', '**Xưng hô (tổng lần xuất hiện):** ' + ', '.join(f'{k} {v}' for k, v in xc.most_common(10)),
           '', '**Từ nối hay dùng:** ' + ', '.join(f'{k} {v}' for k, v in nc.most_common(10)), '',
           '**Cụm 4 từ lặp ở ≥ 4 video (câu cửa miệng của loạt):**', '']
    md += [f'- "{g}" — {nv} video, {n} lần' for g, nv, n in T['cum_tu_chung'][:15]] or ['- (không có)']
    md += ['', '### Hook + luật từng video', '', '| # | Video | Luật @s | Câu mở (3 câu đầu rút gọn) | Câu chốt |', '|---|---|---|---|---|']
    for i, r in enumerate(V, 1):
        l = Ls.get(r['slug'])
        if not l: continue
        hk = ' / '.join(h['text'] for h in l['hook'])[:150].replace('|', '/')
        md.append(f'| {i} | {r["ten"]} | {l["luat"]["giay"]} | {hk} | {l["ket"]["cau_chot"][:90].replace("|", "/")} |')
    # C
    md += ['', '## 3. Hình khớp lời (C máy)', '', '| Chỉ số | Trung bình (min–max) |', '|---|---|']
    H = [r['hinh_khop_loi'] for r in V if 'hinh_khop_loi' in r]
    md += [f'| % câu có cú cắt ngay cuối câu (±0.3s) | {kh([h["ti_le_cau_cat_dung"] * 100 for h in H], 0)} |',
           f'| % cú cắt rơi cuối câu | {kh([h["cut_cuoi_cau"] * 100 for h in H], 0)} |',
           f'| % cú cắt rơi đầu câu | {kh([h["cut_dau_cau"] * 100 for h in H], 0)} |',
           f'| % cú cắt rơi giữa câu | {kh([h["cut_giua_cau"] * 100 for h in H], 0)} |',
           f'| Số shot mỗi câu | {kh([h["shot_moi_cau_tb"] for h in H], 2)} |',
           f'| Shot dài sau câu hỏi (s) | {kh([h["shot_dai_sau_cau_hoi"] for h in H], 2)} |', '',
           'Chưa đo máy được: "% câu có hình minh hoạ đúng lời", "shot phản ứng sau câu quan trọng" (cần xem ảnh — phần agent).', '']
    # E
    md += ['## 4. Lặp lại (E máy)', '', '| Chỉ số | Trung bình (min–max) |', '|---|---|',
           f'| % shot có bản "gần giống hệt" trong cùng video | {kh([r["lap"]["ti_le"] * 100 for r in V], 0)} |',
           f'| Số cặp chuỗi ≥2 shot lặp | {kh([r["lap"]["chuoi2"] for r in V], 0)} |',
           f'| Shot giống hệt shot ở video khác (số cặp) | {kh([r["lap_giua_video"]["shot_giong_video_khac"] for r in V], 0)} |', '',
           'Top video lặp nhiều (tỉ lệ shot): ' + ', '.join(f'{r["ten"]} {int(r["lap"]["ti_le"] * 100)}%' for r in sorted(V, key=lambda r: -r['lap']['ti_le'])[:6]),
           '', '*Top 20 thứ lặp (chuyển động máy, biểu cảm, bố cục…) cần agent xem ảnh — chưa làm.*', '']
    # I
    md += ['## 5. VFX máy dò (I máy, mỗi phút video)', '', '| Hiệu ứng | /phút | Tổng | Video nhiều nhất |', '|---|---|---|---|']
    nm_vfx = {'chop': 'Chớp (độ sáng vọt)', 'rung': 'Rung khung', 'doi-mau': 'Đổi màu cả khung', 'zoom-giat': 'Zoom giật'}
    for k, nmv in nm_vfx.items():
        top = max(V, key=lambda r: r['vfx_phut'][k])
        md.append(f'| {nmv} | {kh([r["vfx_phut"][k] for r in V])} | {sum(r["vfx"][k] for r in V)} | {top["ten"]} ({top["vfx_phut"][k]}/ph) |')
    md += ['', 'Sự kiện chi tiết (giây + shot): `output/hoc-phong-cach/<slug>/may.json` → `su-kien`. Agent gọi tên + dải 10 frame: chưa làm.', '']
    md += ['## 6. Bảng từng video', '', '| # | Video | s | Shot | Shot/ph | Dài tb | Từ/ph | Zoom-in% | Lặp% | Chớp | Rung | Đổi màu | Zoom giật |', '|---|---|---|---|---|---|---|---|---|---|---|---|---|']
    for i, r in enumerate(V, 1):
        l = Ls.get(r['slug'], {'tu_phut': '—'})
        md.append(f'| {i} | {r["ten"]} | {r["dur"]:.0f} | {r["shot"]} | {r["shot_phut"]} | {r["shot_dai_tb"]} | {l["tu_phut"]} | '
                  f'{int(r["cd"].get("zoom-in", 0) * 100)} | {int(r["lap"]["ti_le"] * 100)} | {r["vfx"]["chop"]} | {r["vfx"]["rung"]} | {r["vfx"]["doi-mau"]} | {r["vfx"]["zoom-giat"]} |')
    md += ['', '## Chưa làm (chờ duyệt Dừng lần 1)', '- B agent (cỡ cảnh, góc máy, chữ nổi) · D bố cục 3 lớp · F thẻ tổng · G cảm xúc mặt · H mô típ truyện · C/E/I phần cần nhìn ảnh.',
           '- Ngưỡng nạp vào `viet-kich-ban` / `lam-phim` / `tools/gates.json` và mục "chữ ký riêng": viết sau khi đủ 9 phần.', '']
    text = '\n'.join(md)
    (ROOT / 'docs' / 'so-tay-phong-cach.md').write_text(text, encoding='utf-8')
    (ROOT / 'dist').mkdir(exist_ok=True)
    (ROOT / 'dist' / 'so-tay-phong-cach.html').write_text(md_html(text), encoding='utf-8')
    print('  ✓ docs/so-tay-phong-cach.md · dist/so-tay-phong-cach.html')


def md_html(text):
    import html
    out, tab = [], False
    inl = lambda s: re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', re.sub(r'`(.+?)`', r'<code>\1</code>', html.escape(s)))
    for ln in text.split('\n'):
        if ln.startswith('|'):
            cells = [c.strip() for c in ln.strip('|').split('|')]
            if all(re.fullmatch(r'-+', c) for c in cells): continue
            if not tab: out.append('<table>'); tab = True; tag = 'th'
            else: tag = 'td'
            out.append('<tr>' + ''.join(f'<{tag}>{inl(c)}</{tag}>' for c in cells) + '</tr>'); continue
        if tab: out.append('</table>'); tab = False
        if ln.startswith('### '): out.append(f'<h3>{inl(ln[4:])}</h3>')
        elif ln.startswith('## '): out.append(f'<h2>{inl(ln[3:])}</h2>')
        elif ln.startswith('# '): out.append(f'<h1>{inl(ln[2:])}</h1>')
        elif ln.startswith('- '): out.append(f'<li>{inl(ln[2:])}</li>')
        elif ln.strip(): out.append(f'<p>{inl(ln)}</p>')
    if tab: out.append('</table>')
    css = ('body{font:15px/1.5 system-ui,sans-serif;max-width:1100px;margin:24px auto;padding:0 16px;background:#fff;color:#1a1a1a}'
           'table{border-collapse:collapse;margin:10px 0;display:block;overflow-x:auto}td,th{border:1px solid #ccc;padding:3px 8px;font-size:13px;text-align:left}'
           'th{background:#eee}code{background:#f0f0f0;padding:1px 4px}h2{border-bottom:2px solid #ccc;margin-top:28px}'
           '@media(prefers-color-scheme:dark){body{background:#1b1b1b;color:#e6e6e6}td,th{border-color:#555}th{background:#333}code{background:#333}}')
    return f'<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sổ tay phong cách</title><style>{css}</style>' + '\n'.join(out)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('lenh', choices=['may', 'loi', 'ghep', 'so-tay', 'tat-ca'])
    ap.add_argument('--chi'); ap.add_argument('--force', action='store_true'); ap.add_argument('--jobs', type=int, default=3)
    a = ap.parse_args()
    if a.lenh in ('may', 'tat-ca'): cmd_may(a)
    if a.lenh in ('loi', 'tat-ca'): cmd_loi(a)
    if a.lenh in ('ghep', 'tat-ca'): cmd_ghep(a)
    if a.lenh in ('so-tay', 'tat-ca'): cmd_so_tay(a)


if __name__ == '__main__':
    main()
