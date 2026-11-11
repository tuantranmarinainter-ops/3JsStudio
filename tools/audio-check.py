#!/usr/bin/env python3
"""Báo cáo nhanh về file âm thanh: thời lượng, âm lượng, LUFS, lặng đầu, cờ lỗi.
Dùng: python tools/audio-check.py <file hoặc glob…> [--min-dur 0.2] [--max-dur 30] [--silent -45] [--json]
Cờ: SILENT (mean < --silent), TOO_SHORT, TOO_LONG, CLIPPING (max >= -0.1 dB), LONG_LEAD (lặng đầu > 0.3 s).
"""
import argparse, glob, json, os, re, subprocess, sys
from concurrent.futures import ThreadPoolExecutor

NULL = 'NUL' if os.name == 'nt' else '/dev/null'


def run(cmd):
    return subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='replace')


def fnum(m):
    return float(m.group(1)) if m else None


def analyze(path, a):
    r = {'file': path, 'dur': None, 'mean': None, 'max': None, 'lufs': None, 'lead': None, 'flags': [], 'error': None}
    p = run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', path])
    try:
        r['dur'] = float(p.stdout.strip())
    except ValueError:
        r['error'] = (p.stderr.strip().splitlines() or ['không đọc được'])[-1]
        r['flags'].append('ERROR')
        return r
    # 1 lần chạy ffmpeg: volumedetect + ebur128 + silencedetect (lặng đầu)
    f = run(['ffmpeg', '-hide_banner', '-nostats', '-i', path, '-af',
             'volumedetect,ebur128=framelog=quiet,silencedetect=n=-50dB:d=0.02', '-f', 'null', NULL])
    t = f.stderr
    r['mean'] = fnum(re.search(r'mean_volume:\s*(-?[\d.]+|-inf)', t) and re.search(r'mean_volume:\s*(-?[\d.]+)', t))
    r['max'] = fnum(re.search(r'max_volume:\s*(-?[\d.]+)', t))
    # tóm tắt ebur128 nằm ở cuối: lấy "I:" sau "Integrated loudness"
    m = re.search(r'Integrated loudness:\s*I:\s*(-?[\d.]+|-inf)\s*LUFS', t)
    if m and m.group(1) != '-inf':
        r['lufs'] = float(m.group(1))
    # lặng đầu: silence_start ~ 0 → silence_end đầu tiên
    s0 = re.search(r'silence_start:\s*(-?[\d.]+)', t)
    e0 = re.search(r'silence_end:\s*(-?[\d.]+)', t)
    if s0 and abs(float(s0.group(1))) < 0.02:
        r['lead'] = float(e0.group(1)) if e0 else r['dur']   # cả file lặng
    else:
        r['lead'] = 0.0
    if r['mean'] is None or r['mean'] < a.silent:
        r['flags'].append('SILENT')
    if r['dur'] < a.min_dur:
        r['flags'].append('TOO_SHORT')
    if r['dur'] > a.max_dur:
        r['flags'].append('TOO_LONG')
    if r['max'] is not None and r['max'] >= -0.1:
        r['flags'].append('CLIPPING')
    if r['lead'] is not None and r['lead'] > 0.3:
        r['flags'].append('LONG_LEAD')
    return r


def main():
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
    ap = argparse.ArgumentParser(description='Báo cáo nhanh file âm thanh')
    ap.add_argument('files', nargs='+', help='file hoặc glob')
    ap.add_argument('--min-dur', type=float, default=0.2)
    ap.add_argument('--max-dur', type=float, default=30)
    ap.add_argument('--silent', type=float, default=-45, help='ngưỡng mean dB coi là lặng')
    ap.add_argument('--json', action='store_true')
    a = ap.parse_args()

    paths = []
    for x in a.files:
        g = sorted(glob.glob(x))
        paths += g if g else [x]
    paths = [p for p in dict.fromkeys(paths) if os.path.isfile(p)] or sys.exit('Không có file nào khớp.')

    with ThreadPoolExecutor(max_workers=6) as ex:
        res = list(ex.map(lambda p: analyze(p, a), paths))
    res.sort(key=lambda r: (not r['flags'], r['file']))   # file có cờ lên trước

    if a.json:
        print(json.dumps(res, ensure_ascii=False, indent=1))
        return
    fm = lambda v, w, d=1: (f'{v:.{d}f}' if v is not None else '-').rjust(w)
    wn = min(max(len(os.path.basename(r['file'])) for r in res), 48)
    print(f"{'file'.ljust(wn)} {'dur(s)':>7} {'mean':>7} {'max':>7} {'LUFS':>7} {'lead(s)':>7}  cờ")
    for r in res:
        n = os.path.basename(r['file'])
        n = n if len(n) <= wn else n[:wn - 1] + '…'
        print(f"{n.ljust(wn)} {fm(r['dur'], 7, 2)} {fm(r['mean'], 7)} {fm(r['max'], 7)} {fm(r['lufs'], 7)} {fm(r['lead'], 7, 2)}  "
              + (' '.join(r['flags']) or '-') + (f" ({r['error']})" if r['error'] else ''))
    bad = sum(1 for r in res if r['flags'])
    print(f'Tổng: {len(res)} file, {bad} có cờ.')


if __name__ == '__main__':
    main()
