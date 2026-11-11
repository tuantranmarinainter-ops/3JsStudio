#!/usr/bin/env python3
"""Trộn NHẠC NỀN theo kế hoạch episodes/<ep>/music/plan.json → episodes/<ep>/music_nhac.ogg (stereo Opus).

  python tools/music/mix.py ep001

Mỗi đoạn: cắt bài từ `offset`, lặp có hoà dần nếu thiếu, fadeIn/fadeOut, nhân vol; các đoạn chồng nhau = chuyển bài mượt.
Chuẩn hoá cả track về ~targetLUFS (nằm DƯỚI giọng đọc ~-18.5 LUFS), đỉnh luôn <= -6 dBFS. Tất định.
Nhạc lấy từ assets/sfx/sfx_manifest.json (assets/music/music_manifest.json, tải bằng: python tools/sfx/fetch.py --music "<cụm>" --pick N --as <tên>)."""
import json, re, subprocess, sys
sys.stdout.reconfigure(encoding="utf8", errors="replace")
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
SR = 48000
if len(sys.argv) < 2: sys.exit(__doc__)
ep = sys.argv[1]
EPD = ROOT / 'episodes' / ep
plan = json.loads((EPD / 'music' / 'plan.json').read_text(encoding='utf8'))
man = json.loads((ROOT / 'assets/music/music_manifest.json').read_text(encoding='utf8'))

def load(track):
    e = man.get(track)
    if not e or e.get('missing'): sys.exit(f"Thiếu bài '{track}' trong assets/music/music_manifest.json — tải: python tools/sfx/fetch.py --music \"<cụm>\" --pick N --as {track}")
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(ROOT / e['file']), '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).copy()

def lufs(x):  # tích phân ngắn gọn qua ffmpeg ebur128
    r = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-af', 'ebur128', '-f', 'null', '-'],
                       input=x.astype(np.float32).tobytes(), capture_output=True)
    m = re.findall(r'I:\s+(-?[\d.]+) LUFS', r.stderr.decode('utf8', 'replace'))
    return float(m[-1]) if m else None

def segment(sig, offset, n, loopfade):
    """n mẫu từ sig bắt đầu offset; hết bài thì quay về đầu với hoà dần loopfade giây."""
    pos = int(offset * SR) % len(sig); lf = int(loopfade * SR)
    out = np.zeros((n, 2), np.float32); filled = 0
    while filled < n:
        take = min(n - filled, len(sig) - pos); chunk = sig[pos:pos + take]
        if filled > 0:   # nối vòng: hoà dần đầu chunk với đuôi đã có
            k = min(lf, take, filled); w = np.linspace(0, 1, k, dtype=np.float32)[:, None]
            out[filled - k:filled] = out[filled - k:filled] * (1 - w) + chunk[:k] * w
            chunk = chunk[k:]
        out[filled:filled + len(chunk)] = chunk; filled += len(chunk); pos = 0
    return out

total = max(s['to'] for s in plan['segments']); N = int(total * SR) + SR
buf = np.zeros((N, 2), np.float32); cache = {}
for s in plan['segments']:
    tr = cache[s['track']] if s['track'] in cache else cache.setdefault(s['track'], load(s['track']))
    n = int((s['to'] - s['from']) * SR)
    seg = segment(tr, s.get('offset', 0), n, plan.get('loopFade', 2.0))
    rms = float(np.sqrt(np.mean(seg ** 2))) or 1.0
    seg *= 0.1 / rms                                   # mọi đoạn về cùng độ to trước, rồi mới nhân vol (các bài to nhỏ rất khác nhau)
    fi, fo = min(n // 2, int(s.get('fadeIn', 1) * SR)), min(n // 2, int(s.get('fadeOut', 1) * SR))
    if fi: seg[:fi] *= (np.sin(np.linspace(0, np.pi / 2, fi, dtype=np.float32)) ** 2)[:, None]    # đường cong công suất đều khi chồng
    if fo: seg[-fo:] *= (np.cos(np.linspace(0, np.pi / 2, fo, dtype=np.float32)) ** 2)[:, None]
    a = int(round(s['from'] * SR)); buf[a:a + n] += seg * float(s.get('vol', 1.0))
    print(f"  {s['from']:6.1f}–{s['to']:6.1f}  {s['track']}  offset {s.get('offset', 0)}  vol {s.get('vol', 1.0)}")
buf = buf[:int(total * SR)]
cur = lufs(buf)
gain = 10 ** ((plan.get('targetLUFS', -28) - cur) / 20) if cur is not None else 0.1
peak = float(np.max(np.abs(buf))) * gain
if peak > 0.5: gain *= 0.5 / peak
buf *= gain
out = EPD / 'music_nhac.ogg'
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-c:a', 'libopus', '-b:a', '96k', str(out)],
               input=buf.astype(np.float32).tobytes(), check=True)
print(f"[nhac] → {out.relative_to(ROOT)}  {total:.1f}s  {lufs(buf):.1f} LUFS  đỉnh {20*np.log10(np.max(np.abs(buf))+1e-9):.1f} dBFS")
# ghi vào sfx_layers.json để báo cáo (không bắt buộc cho trình phát)
