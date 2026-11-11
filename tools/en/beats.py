#!/usr/bin/env python3
"""Chia lời kể của tập thành NHỊP bám theo cú cắt (shot) — dùng để dịch/đọc bản tiếng Anh sao cho mỗi cụm
bắt đầu đúng lúc chuyển khung (đọc nhấn khi cắt cảnh).
  python tools/en/beats.py ep001 [--keep s055,...] > episodes/ep001/beats.json
  --keep: shot luôn là nhịp riêng dù ngắn (ep001: s055 — cá voi bơi vòng, cắt sang s056 cá nhảy).
Mỗi nhịp: {id, start, end, shots:[...], vi:"…"}. Nhịp ngắn < MIN giây được gộp vào nhịp trước (cùng câu ưu tiên)."""
import json, re, sys
ep = sys.argv[1]
KEEP = set(sys.argv[sys.argv.index('--keep') + 1].split(',')) if '--keep' in sys.argv else set()
d = f'episodes/{ep}'
src = open(f'{d}/shots.js', encoding='utf8').read()
shots = [(m.group(1), int(m.group(2)), int(m.group(3))) for m in re.finditer(r"id: '([^']+)', f: \[(\d+), (\d+)\]", src)]
caps = json.loads(re.search(r'CAPTIONS = (\[.*\]);', open(f'{d}/captions.js', encoding='utf8').read(), re.S).group(1))
FPS, MIN = 30, 1.15
beats = []
for sid, f0, f1 in shots:
    s, e = f0 / FPS, (f1 + 1) / FPS
    words = [c[2] for c in caps if s - 1e-3 <= c[0] < e - 1e-3]
    beats.append({'start': round(s, 3), 'end': round(e, 3), 'shots': [sid], 'vi': ' '.join(words)})
# gộp: nhịp không có lời → vào nhịp trước; nhịp quá ngắn → vào nhịp trước
out = []
for b in beats:
    if out and b['shots'][0] not in KEEP and (not b['vi'].strip() or (b['end'] - b['start'] < MIN and not re.search(r'[.?!]"?$', out[-1]['vi']))):
        o = out[-1]; o['end'] = b['end']; o['shots'] += b['shots']; o['vi'] = (o['vi'] + ' ' + b['vi']).strip()
    else:
        out.append(b)
for i, b in enumerate(out): b['id'] = f'b{i+1:03d}'
json.dump([{k: b[k] for k in ('id', 'start', 'end', 'shots', 'vi')} for b in out], sys.stdout, ensure_ascii=False, indent=0)
