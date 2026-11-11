#!/usr/bin/env python3
"""Trộn TIẾNG ĐỘNG theo LỚP — mỗi lớp 1 track riêng, sửa lớp nào chỉ dựng lại lớp đó.

  python tools/sfx/mix.py ep001                       # mọi lớp
  python tools/sfx/mix.py ep001 nen buoc-chan         # chỉ vài lớp

Lớp (cấu hình: episodes/<ep>/sfx/layers.json):
  nen          tiếng nền theo bối cảnh từng shot (gió, sóng, mưa, côn trùng…)  ← shots.js (env/light) + layers.json:nen.map
  buoc-chan    tiếng "rầm" lúc chân nhà chạm đất                                 ← sfx/steps.json (tools/sfx/steps.mjs)
  khoanh-khac  tiếng động theo khoảnh khắc (cửa, sóng vỗ, cá voi, giấy…)         ← sfx/cues_*.json
Ra: episodes/<ep>/sfx_<lớp>.ogg (Opus mono) + sfx_layers.json (danh sách track cho trình phát + báo cáo).
Âm thanh lấy từ assets/sfx/sfx_manifest.json (tools/sfx/fetch.py, chỉ CC0/CC BY). Tất định: cùng dữ liệu → cùng file."""
import json, re, subprocess, sys
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
SR = 48000
LAYERS = ['nen', 'buoc-chan', 'khoanh-khac']
if len(sys.argv) < 2: sys.exit(__doc__)
ep = sys.argv[1]
want = [a for a in sys.argv[2:] if a in LAYERS] or LAYERS
EPD = ROOT / 'episodes' / ep
CFG = json.loads((EPD / 'sfx' / 'layers.json').read_text(encoding='utf8'))
man = json.loads((ROOT / 'assets/sfx/sfx_manifest.json').read_text(encoding='utf8'))

# tiếng không có trên kho → thử cụm gần nghĩa / tiếng tương tự đã có
ALIAS = {
    'whale blow spout': ['steam hiss burst', 'gentle water slosh'],
    'snow wind gust': ['cold wind gust', 'wind gust light'],
    'paper postcard slide': ['paper slide', 'paper rustle'],
    'wood groan stretching': ['wood creak groan', 'wood groan'],
    'low rumble stand up': ['deep rumble earth', 'low rumble rising'],
    'cloth hug rustle': ['cloth rustle'],
    'body fall sand': ['body fall', 'body thud soft'],
    'sand scatter': ['sand pour'],
    'wood joint squeak': ['wood squeak'],
    'paper cards flutter': ['paper cards falling', 'paper rustle'],
    'dirt burst thud': ['earth impact thump', 'dirt debris falling'],
    'furniture creak tilt': ['chair creak', 'wood creak long'],
    'gentle water slosh': ['water slosh'],
    'kitchen footsteps quick': ['footsteps floor'],
    'nervous footsteps floor': ['footsteps floor'],
    'magnet click fridge': ['magnet click'],
    'mailbox flap clunk': ['mailbox'],
    'paper postcard flip': ['paper flip', 'paper rustle card'],
    'sigh worried': ['woman sigh'],
    'water drip cascade': ['water streaming down'],
    'water rushing rising': ['water streaming down'],
    'ice cracking wind arctic night': ['cold wind gust', 'arctic wind night'],
    'village ambience birds day': ['forest ambience birds', 'town ambience day birds'],
    'mountain wind high': ['mountain wind howl', 'mountain wind whistle'],
}
_cache = {}
def _ok(n):
    e = man.get(n); return bool(e and not e.get('missing') and e.get('file'))
def sound(name):
    for n in [name] + ALIAS.get(name, []) + [w for w in (' '.join(name.split()[:2]), name.split()[-1]) if w != name]:
        if _ok(n):
            f = man[n]['file']
            if f not in _cache:
                raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(ROOT / f), '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-'],
                                     capture_output=True, check=True).stdout
                _cache[f] = np.frombuffer(raw, dtype=np.float32).copy()
            return _cache[f], n
    return None, None

def hsh(x):  # 0..1 tất định
    return ((int(abs(x) * 1000.0 + 0.5) * 2654435761) & 0xffffffff) % 10007 / 10007.0

def shots():
    out = []
    for m in re.finditer(r"\{ id: '([^']+)', f: \[(\d+), (\d+)\](.*?)\},?\s*$", (EPD / 'shots.js').read_text(encoding='utf8'), re.M):
        env = re.search(r"env: '([^']+)'", m.group(4)); light = re.search(r"light: '([^']+)'", m.group(4))
        out.append((m.group(1), int(m.group(2)) / 30, (int(m.group(3)) + 1) / 30, env.group(1) if env else '', light.group(1) if light else ''))
    return out

SH = shots(); TOTAL = SH[-1][2]; N = int(TOTAL * SR)

def place(buf, sig, t, vol, dur=None, fade=0.08, rate=1.0, offset=0.0, align=None):
    """Đặt tiếng vào lớp. offset = bỏ qua bao nhiêu giây đầu file; align='peak' = đỉnh lớn nhất của tiếng rơi đúng t
    (cho tiếng va chạm: rầm, nước văng, sập, đổ) — tự tìm đỉnh trong 8 s đầu, bắt đầu trước đỉnh 0,06 s."""
    if sig is None: return
    if abs(rate - 1) > 1e-3:
        sig = np.interp(np.arange(0, len(sig) - 1, rate), np.arange(len(sig)), sig).astype(np.float32)
    if align == 'peak':
        win = np.abs(sig[: int(8 * SR)]); pk = int(np.argmax(win)) if len(win) else 0
        pre = int(0.06 * SR); offset = max(0, pk - pre) / SR; t = t - min(pk, pre) / SR
    if offset: sig = sig[int(offset * SR):]
    sig = (sig[: int(dur * SR)] if dur else sig).copy()
    nf = min(len(sig), int(fade * SR))
    if nf > 0: sig[-nf:] *= np.linspace(1, 0, nf, dtype=np.float32)
    a = int(round(t * SR)); b = min(len(buf), a + len(sig))
    if 0 <= a < len(buf) and b > a: buf[a:b] += sig[: b - a] * vol

def layer_nen(buf, rep):
    c = CFG['nen']; segs = []
    for sid, a, b, env, light in SH:
        name = c['night'].get(env) if light in ('night', 'bedNight') and env in c['night'] else c['map'].get(env)
        if segs and segs[-1][2] == name and abs(segs[-1][1] - a) < 1e-3: segs[-1][1] = b
        else: segs.append([a, b, name])
    for a, b, name in segs:
        if not name: continue
        sig, used = sound(name)
        if sig is None: rep['missing'].append(name); continue
        n = int((b - a) * SR); off = int(hsh(a) * max(1, len(sig) - n)) if len(sig) > n else 0
        bed = np.tile(sig, int(np.ceil((n + off) / len(sig))) + 1)[off: off + n].copy()
        f = min(n // 2, int(c['fade'] * SR))
        if f > 0: bed[:f] *= np.linspace(0, 1, f, dtype=np.float32); bed[-f:] *= np.linspace(1, 0, f, dtype=np.float32)
        s0 = int(a * SR); buf[s0: s0 + n] += bed * c['vol'] * c['boost'].get(name, 1.0)
        rep['items'].append([round(a, 2), round(b, 2), name if used == name else f'{name} → {used}'])

def layer_buoc_chan(buf, rep):
    c = CFG['buoc-chan']; p = EPD / 'sfx' / 'steps.json'
    if not p.exists(): rep['missing'].append('sfx/steps.json'); return
    thud, used = sound(c['sound'])
    if thud is None: rep['missing'].append(c['sound']); return
    last = -9
    for e in sorted(json.loads(p.read_text(encoding='utf8')), key=lambda e: e['t']):
        if e['t'] - last < 0.07: continue          # 2 chân chéo chạm cùng lúc → 1 tiếng
        last = e['t']; d = float(e.get('dist') or 80)
        vol = (c['near'] * min(1.0, c['refDist'] / max(d, 20.0))) if e.get('onScreen', True) else c['offscreen']
        vol *= 0.85 + 0.3 * hsh(e['t'])
        place(buf, thud, e['t'] + c.get('shift', 0), vol, dur=c['maxDur'], rate=0.88 + 0.16 * hsh(e['t'] * 3.1),
              offset=c.get('offset', 0.0), align=c.get('align', 'peak'))
        rep['items'].append([round(e['t'], 3), e.get('shot'), round(vol, 2)])

def layer_khoanh_khac(buf, rep):
    c = CFG['khoanh-khac']
    allc = sorted((x for f in sorted((EPD / 'sfx').glob('cues_*.json')) for x in json.loads(f.read_text(encoding='utf8'))), key=lambda x: float(x['t']))
    seen = {}; key = lambda n: re.sub(r'\b(open|soft|short|long|heavy)\b', '', n).strip()
    for x in allc:
        k = key(x['name'])
        if k in seen and float(x['t']) - seen[k] < c['dedupe']: continue   # 2 danh sách đặt trùng ở chỗ nối
        seen[k] = float(x['t'])
        sig, used = sound(x['name'])
        if sig is None: rep['missing'].append(x['name']); continue
        place(buf, sig, float(x['t']), float(x.get('vol', 0.5)), dur=x.get('dur'), offset=float(x.get('offset', 0) or 0), align=x.get('align'))
        rep['items'].append([x['t'], x['name'] if used == x['name'] else f"{x['name']} → {used}", x.get('shot')])

FN = {'nen': layer_nen, 'buoc-chan': layer_buoc_chan, 'khoanh-khac': layer_khoanh_khac}
idx_path = EPD / 'sfx_layers.json'
idx = json.loads(idx_path.read_text(encoding='utf8')) if idx_path.exists() else {}
for L in want:
    buf = np.zeros(N + SR, dtype=np.float32); rep = {'items': [], 'missing': []}
    FN[L](buf, rep)
    buf = buf[:N]; peak = float(np.max(np.abs(buf))) or 1.0
    buf *= CFG[L].get('peak', 0.5) / peak            # đưa đỉnh lớp về mức mục tiêu (layers.json: peak), nâng hoặc hạ
    out = EPD / f'sfx_{L}.ogg'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-', '-c:a', 'libopus', '-b:a', '64k', str(out)],
                   input=buf.astype(np.float32).tobytes(), check=True)
    idx[L] = {'label': CFG[L]['label'], 'gain': CFG[L].get('gain', 1.0), 'src': out.name, 'count': len(rep['items']),
              'missing': sorted(set(rep['missing'])), 'items': rep['items']}
    print(f"[{L}] → {out.relative_to(ROOT)}: {len(rep['items'])} mục; thiếu {len(set(rep['missing']))}: {sorted(set(rep['missing']))[:6]}")
idx_path.write_text(json.dumps({k: idx[k] for k in LAYERS if k in idx}, ensure_ascii=False, indent=1), encoding='utf8')
