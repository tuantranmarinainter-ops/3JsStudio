#!/usr/bin/env python3
"""phu-de-tu-giong.py — tập có SẴN file giọng + mốc từng câu (moc.json của tools/kb/goi-sang-storyboard.mjs):
ghi episodes/<ep>/captions.js có mốc từng chữ ([start, end, text, [[ws, we]…]]) + narration.json (mốc câu).
  python tools/kb/phu-de-tu-giong.py <ep> <moc.json> [--model large-v3]
Dùng lại whisper_words / align / chunk của tools/caps_whisper.py (chữ lấy từ lời kể, whisper chỉ cho mốc)."""
import json, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT / 'tools'))
import caps_whisper as cw
cw.MAXW, cw.MAXCH = 4, 26   # cụm ngắn kiểu short dọc
ep, moc = sys.argv[1], Path(sys.argv[2])
model = sys.argv[sys.argv.index('--model') + 1] if '--model' in sys.argv else None
epd = ROOT / 'episodes' / ep
lines = [{'text': l['text'], 'start': l['t0'], 'end': l['t1'], 'line': l['line']} for l in json.loads(moc.read_text(encoding='utf8'))['lines']]
W, got, n = cw.align(lines, cw.whisper_words(epd / 'narration.mp3', model))
res = cw.chunk(W)
(epd / 'captions.js').write_text('// Phụ đề theo cụm, mốc từng chữ từ giọng thật (tools/kb/phu-de-tu-giong.py). [start, end, text, [[ws, we]…]]\n'
                                 'export const CAPTIONS = ' + json.dumps(res, ensure_ascii=False, separators=(', ', ': ')) + ';\n', encoding='utf8')
(epd / 'narration.json').write_text(json.dumps({'lines': lines}, ensure_ascii=False, indent=1), encoding='utf8')
print(f'{len(res)} cụm, {n} chữ, whisper khớp {got}/{n} ({got * 100 // max(1, n)}%), hết ở {res[-1][1]:.2f} s')
