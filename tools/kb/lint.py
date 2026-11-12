"""Kiểm kich-ban.md (10 mã lỗi K00–K10).

  python tools/kb/lint.py <kich-ban.md> [--json]     in `kich-ban.md:<dòng>: <MÃ> <thông báo>`; thoát 0 = sạch, 1 = có lỗi.

Tên animation / mặt / loại shot đọc bằng regex từ engine/r15.js và engine/shottypes.js lúc chạy.
"""
import json, re, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
sys.path.insert(0, str(HERE))
import kichban  # noqa: E402
from kichban import fold, CONT  # noqa: E402

EXTRA_TYPES = {'insertRead', 'houseFull', 'hug', 'fall', 'sinkTilt'}
ACTION_TYPES = {'chase', 'fall', 'hug', 'walkBy', 'follow', 'sinkTilt'}
TOTAL_RANGE = (120, 180)
MAX_SHOTS_PER_LINE = 3


def js_keys(file, const):
    """khoá cấp 1 (thụt 2 ô) của `export const <const> = { … };`"""
    text = (ROOT / 'engine' / file).read_text(encoding='utf-8')
    m = re.search(r'export const ' + const + r'\s*=\s*\{\n(.*?)\n\};', text, re.S)
    if not m: raise RuntimeError(f'không đọc được {const} trong engine/{file}')
    return set(re.findall(r'^  ([A-Za-z_]\w*)\s*:', m.group(1), re.M))


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
    anims = js_keys('r15.js', 'R15_ANIMATIONS')
    faces = js_keys('r15.js', 'FACE_PRESETS')
    types = js_keys('shottypes.js', 'SHOT_TYPES') | EXTRA_TYPES
    custom_anims = {c['name'] for c in d['can_dung'] if c['kind'] == 'anim'}
    banned = [(b, fold(b)) for b in banned_names()]
    errs = [(e['dong'], e['ma'], e['msg']) for e in d['loi_doc']]
    add = lambda n, c, m: errs.append((n, c, m))

    total, known = 0.0, False
    first_nar_checked = False
    group = None            # [dòng bắt đầu, số shot] của câu lời kể đang chạy
    for s in d['shots']:
        n = s['_dong']
        sid = s.get('id', '?')
        if not (s.get('at') or s.get('env')): add(n, 'K01', f'shot {sid}: thiếu bối cảnh (cột "ở đâu" hoặc "env")')
        t = s.get('type')
        if t not in types: add(n, 'K02', f'shot {sid}: loại "{t or ""}" không có (cho phép: {", ".join(sorted(types))})')
        if s.get('read') and t != 'insertRead': add(n, 'K03', f'shot {sid}: có "vật cần đọc" nhưng loại là "{t}", phải là insertRead')
        for key in ('action', 'withAnim'):
            a = s.get(key)
            if a and a not in anims and a not in custom_anims:
                add(n, 'K04', f'shot {sid}: animation "{a}" không có trong R15_ANIMATIONS và không nằm trong "Cần dựng"')
        for key in ('face', 'withFace'):
            f = s.get(key)
            if f and f not in faces: add(n, 'K08', f'shot {sid}: mặt "{f}" không thuộc FACE_PRESETS')
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
    errs.sort(key=lambda e: (e[0], e[1]))
    return errs


def main(argv):
    if hasattr(sys.stdout, 'reconfigure'): sys.stdout.reconfigure(encoding='utf-8')
    args = [a for a in argv if not a.startswith('--')]
    if not args:
        print(__doc__); return 2
    p = Path(args[0])
    errs = lint(p)
    if '--json' in argv:
        print(json.dumps([{'dong': n, 'ma': c, 'msg': m} for n, c, m in errs], ensure_ascii=False, indent=2))
    else:
        for n, c, m in errs: print(f'{p.name}:{n}: {c} {m}')
    return 1 if errs else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
