#!/usr/bin/env python3
"""caps_vi.py — Phụ đề tiếng Việt THEO TỪNG GIỌNG.

captions.js (cụm 1–3 chữ) có mốc thời gian của SRT gốc = chỉ khớp "Giọng Bé" (BV074_streaming_dsp).
Với mỗi giọng Việt khác: lấy start/end từng CÂU trong voices/vi/<id>.json (tools/tts.py / fit_voice.py),
gán mỗi cụm chữ vào câu của nó theo vị trí ký tự, rồi chia lại thời gian các cụm TỈ LỆ theo số ký tự chữ-số
trong khoảng [start, end] của câu → ghi voices/vi/<id>.caps.json, định dạng [start, end, text] như captions.js.

  python tools/caps_vi.py ep001            # mọi giọng Việt trong voices/index.json (hoặc mọi voices/vi/*.json)
  python tools/caps_vi.py ep001 <id> ...   # chỉ các giọng này
Giọng mặc định (Giọng Bé) giữ mốc gốc của captions.js → không tạo caps.json (xoá file cũ nếu có).
"""
import io, json, re, sys, unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_VOICE = 'BV074_streaming_dsp'


def norm(s):
    s = unicodedata.normalize('NFC', s).lower()
    return ''.join(c for c in s if c.isalnum())


def load_captions(epd):
    js = (epd / 'captions.js').read_text(encoding='utf8')
    return json.loads(js[js.index('[['):js.rindex(']]') + 2])


def build(caps, lines):
    """Trả về danh sách [start,end,text] mới cho một giọng."""
    sent = [norm(l['text']) for l in lines]
    stream = ''.join(sent)
    # vị trí ký tự (trong dòng chữ-số liên tục) của đầu mỗi cụm
    starts, pos = [], 0
    for c in caps:
        starts.append(pos); pos += len(norm(c[2]))
    if pos != len(stream):
        raise SystemExit(f'Số ký tự phụ đề ({pos}) khác lời kể ({len(stream)}): captions.js lệch narration.txt')
    # ranh giới câu
    base, acc = [], 0
    for s in sent: base.append(acc); acc += len(s)

    def t_of(p):
        # câu chứa ký tự p (câu rỗng bị bỏ qua)
        k = max(i for i in range(len(sent)) if base[i] <= p and sent[i])  if p < len(stream) else len(sent) - 1
        l = lines[k]; n = max(1, len(sent[k]))
        return l['start'] + (min(p, base[k] + n) - base[k]) / n * (l['end'] - l['start'])

    out = []
    for i, c in enumerate(caps):
        out.append([round(t_of(starts[i]) if i else 0.0, 3), 0.0, c[2]])
    for i in range(len(out) - 1): out[i][1] = out[i + 1][0]   # liền mạch như captions.js
    out[-1][1] = round(max(lines[-1]['end'], out[-1][0] + 0.3), 3)
    # cụm đầu câu thứ nhất bắt đầu đúng 0
    return out


def main():
    a = sys.argv[1:]
    ep = a[0] if a else 'ep001'; only = set(a[1:])
    epd = ROOT / 'episodes' / ep; vd = epd / 'voices' / 'vi'
    caps = load_captions(epd)
    ids = sorted(p.stem for p in vd.glob('*.json') if not p.stem.endswith(('.caps', '.raw')))
    idx = epd / 'voices' / 'index.json'
    if idx.exists() and not only:
        keep = {v['id'] for v in json.loads(idx.read_text(encoding='utf8')) if v['lang'] == 'vi'}
        ids = [i for i in ids if i in keep]
    if only: ids = [i for i in ids if i in only]
    n = 0
    for vid in ids:
        out = vd / f'{vid}.caps.json'
        if vid == DEFAULT_VOICE:
            if out.exists(): out.unlink()
            continue
        d = json.loads((vd / f'{vid}.json').read_text(encoding='utf8'))
        lines = d['lines']
        res = build(caps, lines)
        out.write_text(json.dumps(res, ensure_ascii=False, separators=(',', ':')), encoding='utf8')
        n += 1
        print(f'  {vid}: {len(res)} cụm, {res[-1][1]:.1f} s')
    print(f'caps_vi: {n} giọng Việt có phụ đề riêng (Giọng Bé giữ mốc gốc)')


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf8')
    main()
