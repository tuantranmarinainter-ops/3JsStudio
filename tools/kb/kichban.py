"""Bộ đọc kich-ban.md (định dạng mở rộng của storyboard.md, xem docs/kich-ban-vao.md).

  python tools/kb/kichban.py <kich-ban.md> --json
  python tools/kb/kichban.py <kich-ban.md> --tom-tat     số câu/shot/giây, mục cần dựng, shot dài/ngắn nhất
  python tools/kb/kichban.py --danh-sach                 giá trị hợp lệ (loại, hành động, mặt, giờ, thời tiết, tư thế)

doc(path) -> {"meta", "shots", "can_dung", "loi_doc"}; mỗi shot có `_dong` (số dòng 1-based).
Lỗi dữ liệu không ném ngoại lệ: thành mục trong loi_doc {"dong", "ma": "K00", "msg"}.
"""
import difflib, json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT / 'tools'))
from storyboard import fold, match, COL_OF, parse_meta_lines  # noqa: E402,F401

# cột chỉ có ở kich-ban.md (khoá đã bỏ dấu → khoá shot)
EXTRA_COLS = {'gio': 'time', 'thoi tiet': 'weather', 'vat can doc': 'read', 'tu the': 'pose', 'toi thieu': 'min'}
KEY_OF = dict(COL_OF)
KEY_OF.update(EXTRA_COLS)
KEY_OF['notes'] = 'notes'

CONT = ('^', '〃', '"', '""', '…cont', '+')     # cùng câu với shot trước (như storyboard.py)
TIME_OK = {'sang', 'trua', 'chieu', 'hoang-hon', 'dem'}
WEATHER_OK = {'nang', 'may', 'mua', 'giong', 'bao', 'tuyet', 'suong'}
POSE_OK = {'standing', 'flying', 'sitting', 'swimming'}
NUM_KEYS = ('dur', 'min')
EXTRA_TYPES = {'insertRead', 'houseFull', 'hug', 'fall', 'sinkTilt'}


def js_keys(file, const):
    """khoá cấp 1 (thụt 2 ô) của `export const <const> = { … };`"""
    text = (ROOT / 'engine' / file).read_text(encoding='utf-8')
    m = re.search(r'export const ' + const + r'\s*=\s*\{\n(.*?)\n\};', text, re.S)
    if not m: raise RuntimeError(f'không đọc được {const} trong engine/{file}')
    return set(re.findall(r'^  ([A-Za-z_]\w*)\s*:', m.group(1), re.M))


def vocab():
    return {'anims': js_keys('r15.js', 'R15_ANIMATIONS'), 'faces': js_keys('r15.js', 'FACE_PRESETS'),
            'types': js_keys('shottypes.js', 'SHOT_TYPES') | EXTRA_TYPES}


def canon(value, names):
    """(tên canonical không phân biệt hoa thường | None, gợi ý gần nhất | None)"""
    low = {n.lower(): n for n in names}
    v = str(value).lower()
    if v in low: return low[v], None
    near = difflib.get_close_matches(v, list(low), n=1, cutoff=0.5)
    return None, (low[near[0]] if near else None)


def hint(h):
    return f' (gần nhất: {h})' if h else ''


def _num(s):
    return float(str(s).strip().replace(',', '.'))


def doc(path):
    path = Path(path)
    lines = path.read_text(encoding='utf-8-sig').splitlines()
    out = {'meta': {}, 'shots': [], 'can_dung': [], 'loi_doc': []}
    err = lambda n, m: out['loi_doc'].append({'dong': n, 'ma': 'K00', 'msg': m})

    first_tbl = next((i for i, l in enumerate(lines) if l.strip().startswith('|')), len(lines))
    out['meta'] = parse_meta_lines(lines[:first_tbl])

    head, section = None, ''
    for i, raw in enumerate(lines):
        n, s = i + 1, raw.strip()
        if s.startswith('#'):
            section = fold(s.lstrip('#')) if s.startswith('##') else section
            continue
        if section == 'can dung':
            m = re.match(r'^[-*]\s*(\w+)\s*:\s*([^:]+?)\s*(?::\s*(.*))?$', s)
            if m: out['can_dung'].append({'kind': m.group(1), 'name': m.group(2), 'desc': m.group(3) or '', '_dong': n})
            elif s: err(n, f'dòng "Cần dựng" không đúng dạng "- loại: tên: mô tả": {s}')
            continue
        if not s.startswith('|'): continue
        cells = [c.strip() for c in s.strip('|').split('|')]
        if all(re.fullmatch(r':?-{2,}:?', c) or c == '' for c in cells): continue
        if head is None:
            head = [KEY_OF.get(fold(c)) for c in cells]
            for need, label in (('id', 'id'), ('dur', 'giây')):
                if need not in head: err(n, f'thiếu cột bắt buộc "{label}"')
            continue
        if len(cells) != len(head):
            err(n, f'hàng có {len(cells)} ô, bảng có {len(head)} cột'); continue
        sh = {'_dong': n}
        for key, v in zip(head, cells):
            if key and v != '': sh[key] = v
        for k in NUM_KEYS:
            if k in sh:
                try: sh[k] = _num(sh[k])
                except ValueError: err(n, f'ô "{k}" không phải số: {sh[k]!r}'); del sh[k]
        out['shots'].append(sh)
    if head is None: err(1, 'không có bảng shot')

    v = vocab()
    anims = v['anims'] | {c['name'] for c in out['can_dung'] if c['kind'] == 'anim'}
    sets = {'type': v['types'], 'action': anims, 'withAnim': anims, 'face': v['faces'], 'withFace': v['faces'],
            'time': TIME_OK, 'weather': WEATHER_OK, 'pose': POSE_OK}
    labels = {'time': 'giờ', 'weather': 'thời tiết', 'pose': 'tư thế'}
    cur_at, cur_env = None, out['meta'].get('env')
    for sh in out['shots']:
        for k, names in sets.items():
            if k in sh:
                c, h = canon(sh[k], names)
                if c: sh[k] = c
                elif k in labels: err(sh['_dong'], f'{labels[k]} "{sh[k]}" không hợp lệ (cho phép: {", ".join(sorted(names))}){hint(h)}')
                else: sh['_goi_y_' + k] = h
        cur_at = sh.get('at') or cur_at
        cur_env = sh.get('env') or cur_env
        sh['at_hd'], sh['env_hd'] = cur_at, cur_env
    return out


def so_cau(d):
    """số câu lời kể, gom như K10: ô có chữ mở câu mới; `^`… thuộc câu trước; ô trống = không lời."""
    n, open_ = 0, False
    for sh in d['shots']:
        nar = sh.get('narration', '')
        if nar in CONT:
            continue
        open_ = bool(nar)
        n += open_
    return n


def tom_tat(d):
    shots = d['shots']
    durs = [s for s in shots if 'dur' in s]
    out = [f'số câu: {so_cau(d)}', f'số shot: {len(shots)}',
           f'tổng giây: {round(sum(s["dur"] for s in durs), 1):g}']
    kinds = {}
    for c in d['can_dung']: kinds[c['kind']] = kinds.get(c['kind'], 0) + 1
    out.append(f'cần dựng: {len(d["can_dung"])} (' + ', '.join(f'{k} {v}' for k, v in sorted(kinds.items())) + ')')
    if durs:
        hi, lo = max(durs, key=lambda s: s['dur']), min(durs, key=lambda s: s['dur'])
        out.append(f'shot dài nhất: {hi.get("id", "?")} ({hi["dur"]:g} s)')
        out.append(f'shot ngắn nhất: {lo.get("id", "?")} ({lo["dur"]:g} s)')
    return '\n'.join(out)


def danh_sach():
    v, sets = vocab(), {'giờ': TIME_OK, 'thời tiết': WEATHER_OK, 'tư thế': POSE_OK}
    rows = [('loại', v['types']), ('hành động', v['anims']), ('mặt', v['faces'])] + list(sets.items())
    return '\n'.join(f'{k}: ' + ', '.join(sorted(vals)) for k, vals in rows)


def main(argv):
    if hasattr(sys.stdout, 'reconfigure'): sys.stdout.reconfigure(encoding='utf-8')
    if hasattr(sys.stderr, 'reconfigure'): sys.stderr.reconfigure(encoding='utf-8')
    args = [a for a in argv if not a.startswith('--')]
    if '--danh-sach' in argv:
        print(danh_sach()); return 0
    if not args:
        print(__doc__); return 2
    try: d = doc(args[0])
    except OSError:
        print(f'{args[0]}: K00 không đọc được file', file=sys.stderr); return 2
    if '--tom-tat' in argv:
        print(tom_tat(d)); return 0
    print(json.dumps(d, ensure_ascii=False, indent=2) if '--json' in argv else f'{len(d["shots"])} shot, {len(d["loi_doc"])} lỗi đọc')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
