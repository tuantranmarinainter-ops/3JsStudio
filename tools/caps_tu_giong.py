#!/usr/bin/env python3
"""caps_tu_giong.py — Phụ đề tiếng Việt của tập từ narration.json (mốc start/end từng câu).

  python tools/caps_tu_giong.py ep002

Mỗi câu chia thành cụm 1–3 chữ (cân đối, không để cụm lẻ 1 chữ nếu tránh được); thời gian mỗi cụm chia TỈ LỆ theo số chữ-số
trong khoảng [start, end] của câu. Ghi episodes/<ep>/captions.js (CAPTIONS = [[start, end, "chữ"], …]). Không gọi dịch vụ nào.
"""
import json, math, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def nhom(words):
    n = len(words)
    k = max(1, math.ceil(n / 3))
    base, du = divmod(n, k)
    out, i = [], 0
    for j in range(k):
        m = base + (1 if j < du else 0)
        out.append(words[i:i + m]); i += m
    return out


def main(ep):
    d = ROOT / 'episodes' / ep
    nj = json.loads((d / 'narration.json').read_text(encoding='utf-8'))
    caps = []
    for ln in nj['lines']:
        ws = ln['text'].split()
        gs = nhom(ws)
        w = [max(1, sum(c.isalnum() for c in ' '.join(g))) for g in gs]
        tot, t = sum(w), ln['start']
        for g, wi in zip(gs, w):
            e = t + (ln['end'] - ln['start']) * wi / tot
            caps.append([round(t, 3), round(e, 3), ' '.join(g)])
            t = e
    head = f'// Phụ đề tiếng Việt theo narration.json của {ep} (giọng BV075_streaming): cụm 1–3 chữ, mốc chia tỉ lệ ký tự trong từng câu. Tạo lại: python tools/caps_tu_giong.py {ep}\n'
    (d / 'captions.js').write_text(head + 'export const CAPTIONS = ' + json.dumps(caps, ensure_ascii=False, separators=(',', ':')) + ';\n', encoding='utf-8')
    print(f'{ep}: {len(caps)} cụm phụ đề từ {len(nj["lines"])} câu')


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'ep002')
