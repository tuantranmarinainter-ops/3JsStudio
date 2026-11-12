#!/usr/bin/env python3
"""Neo (anchor) của tiếng = giây tính từ đầu file tới gói 5 ms có RMS mạnh nhất (đỉnh va chạm).
  python tools/sfx/anchor.py "wooden door creak"      # in neo của một tên trong sfx_manifest
  python tools/sfx/anchor.py --all                     # tính + cache mọi tiếng trong manifest
  python tools/sfx/anchor.py --cues ep001              # bảng neo của các cue (chỉ in)
Cache: .cache/sfx_anchors.json (khoá = đường dẫn file; hết hạn khi đổi mtime/kích thước)."""
import json, subprocess, sys
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
SR = 48000
CACHE = ROOT / '.cache' / 'sfx_anchors.json'
PACKET = 0.005

def peak_anchor(sig, sr=SR, packet=PACKET):
    """Giây tới gói 5 ms có RMS lớn nhất (0.0 nếu rỗng). Hàm thuần — có test."""
    n = max(1, int(packet * sr))
    if len(sig) < n: return 0.0
    x = np.asarray(sig, dtype=np.float64) ** 2
    c = np.concatenate(([0.0], np.cumsum(x)))
    e = c[n:] - c[:-n]                       # năng lượng mỗi cửa sổ n mẫu (bước 1 mẫu)
    i = int(np.argmax(e))
    return round((i + n / 2) / sr, 4)         # tâm gói

def _load_cache():
    try: return json.loads(CACHE.read_text(encoding='utf8'))
    except Exception: return {}

_mem = None
def file_anchor(rel):
    """Neo của file (đường dẫn tương đối từ gốc repo), có cache theo mtime+size."""
    global _mem
    if _mem is None: _mem = _load_cache()
    p = ROOT / rel; st = p.stat(); key = f'{st.st_mtime_ns}:{st.st_size}'
    ent = _mem.get(rel)
    if ent and ent.get('sig') == key: return ent['anchor']
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(p), '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-'],
                         capture_output=True, check=True).stdout
    a = peak_anchor(np.frombuffer(raw, dtype=np.float32))
    _mem[rel] = {'sig': key, 'anchor': a}
    CACHE.parent.mkdir(exist_ok=True)
    CACHE.write_text(json.dumps(_mem, ensure_ascii=False, indent=0, sort_keys=True), encoding='utf8')
    return a

if __name__ == '__main__':
    man = json.loads((ROOT / 'assets/sfx/sfx_manifest.json').read_text(encoding='utf8'))
    a = sys.argv[1:]
    if not a: sys.exit(__doc__)
    if a[0] == '--all':
        for n, e in man.items():
            if e.get('file') and not e.get('missing'): print(f"{file_anchor(e['file']):7.3f}  {n}")
    elif a[0] == '--json':                                   # {tên: neo đo được} cho các tên trong danh sách a[1:]
        print(json.dumps({n: (file_anchor(man[n]['file']) if man.get(n, {}).get('file') and not man[n].get('missing') else None) for n in a[1:]}, ensure_ascii=False))
    elif a[0] == '--cues':
        import glob
        for f in sorted(glob.glob(str(ROOT / 'episodes' / a[1] / 'sfx' / 'cues_*.json'))):
            for c in json.loads(Path(f).read_text(encoding='utf8')):
                e = man.get(c['name'])
                if e and e.get('file') and not e.get('missing'): print(f"{file_anchor(e['file']):7.3f}  t={c.get('t')}  {c['name']}  anchor={c.get('anchor','-')}")
    else:
        e = man.get(a[0])
        if not e or not e.get('file'): sys.exit('không có trong manifest: ' + a[0])
        print(file_anchor(e['file']))
