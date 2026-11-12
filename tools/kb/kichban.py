"""Bộ đọc kich-ban.md (định dạng mở rộng của storyboard.md, xem docs/kich-ban-vao.md).

  python tools/kb/kichban.py <kich-ban.md> --json

doc(path) -> {"meta", "shots", "can_dung", "loi_doc"}; mỗi shot có `_dong` (số dòng 1-based).
Lỗi dữ liệu không ném ngoại lệ: thành mục trong loi_doc {"dong", "ma": "K00", "msg"}.
"""
import json, re, sys
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
        for k, ok, label in (('time', TIME_OK, 'giờ'), ('weather', WEATHER_OK, 'thời tiết'), ('pose', POSE_OK, 'tư thế')):
            if k in sh and sh[k] not in ok: err(n, f'{label} "{sh[k]}" không hợp lệ (cho phép: {", ".join(sorted(ok))})')
        out['shots'].append(sh)
    return out


def main(argv):
    if hasattr(sys.stdout, 'reconfigure'): sys.stdout.reconfigure(encoding='utf-8')
    args = [a for a in argv if not a.startswith('--')]
    if not args:
        print(__doc__); return 2
    d = doc(args[0])
    print(json.dumps(d, ensure_ascii=False, indent=2) if '--json' in argv else f'{len(d["shots"])} shot, {len(d["loi_doc"])} lỗi đọc')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
