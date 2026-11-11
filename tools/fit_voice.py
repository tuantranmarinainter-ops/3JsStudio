#!/usr/bin/env python3
"""Canh giọng đọc tiếng Việt cho KHỚP PHIM — dùng cho giọng đọc chậm / nhiều khoảng lặng (nhóm CapCut *_bigtts
không nhận tham số tốc độ) khiến tools/tts.py trễ dồn (câu sau nối câu trước, không bao giờ đuổi kịp).

  python tools/fit_voice.py episodes/ep001/voices/vi/<id>.mp3 [--max-tempo 1.6] [--pause 0.12]
  python tools/fit_voice.py --auto episodes/ep001/voices/vi      # mọi giọng dài hơn phim > 1 s

Đọc <id>.json (start/end/at từng câu do tts.py ghi) → cắt từng câu khỏi <id>.mp3 → bỏ lặng đầu/cuối, rút khoảng
ngừng > pause → tăng tốc vừa đủ cho câu nằm trong [at, at_kế − 0,08 s] (tối đa --max-tempo) → đặt ĐÚNG mốc at.
Bản gốc giữ ở <id>.raw.mp3 / <id>.raw.json (chạy lại sẽ dùng bản gốc, không canh chồng lên bản đã canh).
"""
import argparse, json, shutil, subprocess, sys, tempfile
from pathlib import Path

SR = 48000
ap = argparse.ArgumentParser()
ap.add_argument('path', help='file .mp3 của giọng, hoặc thư mục khi --auto')
ap.add_argument('--auto', action='store_true')
ap.add_argument('--max-tempo', type=float, default=1.6)
ap.add_argument('--pause', type=float, default=0.12, help='khoảng ngừng giữ lại tối đa (giây)')
ap.add_argument('--total', type=float, default=171.067, help='độ dài phim (giây)')
args = ap.parse_args()


def ff(*a, inp=None):
    return subprocess.run(['ffmpeg', '-v', 'error', '-y', *a], input=inp, capture_output=True, check=True).stdout


def dur_of(p):
    return float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(p)],
                                capture_output=True, text=True).stdout.strip() or 0)


def fit(mp3: Path):
    raw_mp3, raw_js = mp3.with_suffix('.raw.mp3'), mp3.with_suffix('.raw.json')
    js = mp3.with_suffix('.json')
    if not raw_mp3.exists():
        shutil.copy(mp3, raw_mp3); shutil.copy(js, raw_js)
    meta = json.load(open(raw_js, encoding='utf8'))
    L = meta['lines']
    import array
    track = array.array('f', [0.0]) * int((args.total + 0.3) * SR)
    rep = []
    cursor = 0.0   # cuối câu trước: câu tràn thì câu sau lùi vừa đủ (không chồng tiếng), rồi tự đuổi kịp mốc ở các câu sau
    with tempfile.TemporaryDirectory() as d:
        for i, ln in enumerate(L):
            at = ln.get('at')
            if at is None: at = cursor
            at = max(at, cursor + 0.06)
            nxt = next((x['at'] for x in L[i + 1:] if x.get('at') is not None), args.total)
            slot = max(0.3, nxt - at - 0.08)
            seg = Path(d) / f'{i}.wav'
            # cắt câu khỏi bản gốc, bỏ lặng đầu/cuối, rút ngừng giữa câu
            ff('-ss', f"{ln['start']:.3f}", '-to', f"{ln['end']:.3f}", '-i', str(raw_mp3), '-ac', '1', '-ar', str(SR),
               '-af', f'silenceremove=start_periods=1:start_threshold=-42dB:start_silence=0.02,'
                      f'areverse,silenceremove=start_periods=1:start_threshold=-42dB:start_silence=0.04,areverse,'
                      f'silenceremove=stop_periods=-1:stop_duration={args.pause}:stop_threshold=-42dB:stop_silence={args.pause}',
               str(seg))
            dd = dur_of(seg)
            tempo = min(args.max_tempo, max(1.0, dd / slot))
            raw = ff('-i', str(seg), '-af', f'atempo={tempo:.4f}' if tempo > 1.001 else 'anull', '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-')
            a = array.array('f'); a.frombytes(raw)
            o = int(at * SR)
            for k, v in enumerate(a):
                if o + k < len(track): track[o + k] += v
            nd = len(a) / SR
            cursor = at + nd
            ln.update(start=round(at, 3), end=round(at + nd, 3), dur=round(nd, 3), tempo=round(tempo, 3))
            rep.append((ln['line'], tempo, nd - slot, at - (ln.get('at') or at)))
    raw_all = track.tobytes()
    ff('-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-', '-t', f'{args.total:.3f}', '-c:a', 'libmp3lame', '-b:a', '128k', str(mp3), inp=raw_all)
    meta['total'] = args.total; meta['fitted'] = {'max_tempo': args.max_tempo, 'pause': args.pause}
    json.dump(meta, open(js, 'w', encoding='utf8'), ensure_ascii=False, indent=1)
    late = [r for r in rep if r[3] > 0.05]
    mx = max(r[1] for r in rep)
    print(f'{mp3.stem}: {len(L)} câu, tempo lớn nhất ×{mx:.2f}, {len(late)} câu bắt đầu trễ mốc' +
          (f' (trễ nhất {max(r[3] for r in late):.2f}s ở câu ' + ', '.join(str(r[0]) for r in late[:8]) + ')' if late else ' — mọi câu đúng mốc'))


if args.auto:
    for mp3 in sorted(Path(args.path).glob('*.mp3')):
        if mp3.name.endswith('.raw.mp3'): continue
        base = mp3.with_suffix('.raw.mp3') if mp3.with_suffix('.raw.mp3').exists() else mp3
        if dur_of(base) > args.total + 1.0: fit(mp3)
else:
    fit(Path(args.path))
