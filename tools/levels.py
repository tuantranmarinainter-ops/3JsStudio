#!/usr/bin/env python3
"""levels.py — Đường bao âm lượng giọng đọc để NHÉP MIỆNG (không cần âm vị).

  python tools/levels.py ep001            # mọi giọng trong voices/index.json + narration.mp3 / narration_en.mp3
  python tools/levels.py ep001 <id> ...   # chỉ các giọng này (id trong index.json)

Mỗi file âm thanh <tên>.ogg|mp3 → <tên>.levels.json = {"fps":30,"q":9,"d":"0012349..."}:
RMS mỗi khung 1/30 s (cửa sổ 50 ms), chuẩn hoá theo p95 về 0..1, nhả chậm (release ~0,1 s), lượng tử 1/9 (một chữ số 0–9).
Giá trị ở thời điểm t = d[floor(t*30)]/9. Engine (engine/shots.js, shot có `talk`) đọc qua globalThis.__nhep.
"""
import json, math, subprocess, sys
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
FPS, Q, SR, REL = 30, 9, 16000, 0.1


def levels(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(path), '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'],
                         capture_output=True, check=True).stdout
    x = np.frombuffer(raw, np.float32)
    n = int(len(x) / SR * FPS) + 1
    half = int(SR * 0.025)
    rms = np.zeros(n, np.float64)
    c2 = np.concatenate([[0.0], np.cumsum(x.astype(np.float64) ** 2)])
    for i in range(n):
        c = int((i + 0.5) / FPS * SR); a, b = max(0, c - half), min(len(x), c + half)
        rms[i] = math.sqrt((c2[b] - c2[a]) / (b - a)) if b > a else 0.0
    ref = float(np.percentile(rms, 95)) or 1.0
    v = np.clip(rms / ref, 0, 1)
    k = math.exp(-1 / FPS / REL); env = np.zeros(n)
    for i in range(n):
        env[i] = max(v[i], env[i - 1] * k if i else 0.0)
    return ''.join(str(int(round(e * Q))) for e in env)


def main():
    a = sys.argv[1:]
    ep = a[0] if a else 'ep001'; only = set(a[1:])
    epd = ROOT / 'episodes' / ep
    files = []
    idx = epd / 'voices' / 'index.json'
    if idx.exists():
        for v in json.loads(idx.read_text(encoding='utf8')):
            if not only or v['id'] in only:
                files.append(ROOT / v['audio'].lstrip('/'))
    if not only:
        files += [p for p in (epd / 'narration.mp3', epd / 'narration_en.mp3') if p.exists()]
    for f in files:
        if not f.exists():
            print(f'  thiếu {f}'); continue
        d = levels(f)
        out = f.with_suffix('.levels.json')
        out.write_text(json.dumps({'fps': FPS, 'q': Q, 'd': d}, separators=(',', ':')), encoding='utf8')
        print(f'  {f.name}: {len(d)} khung, {sum(c != "0" for c in d) * 100 // len(d)}% có tiếng')
    print(f'levels: {len(files)} file')


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf8')
    main()
