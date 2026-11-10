#!/usr/bin/env python3
"""Gộp cue SRT (JSON [{start,end,text}]) thành câu, mỗi câu có mốc @at = thời điểm bắt đầu ước theo ký tự.

  python tools/srt2narration.py refs/ngoinha/subtitles.json > episodes/ep001/narration.txt
"""
import json, re, sys

cues = json.load(open(sys.argv[1], encoding='utf-8'))
# chuỗi ký tự có mốc thời gian (nội suy tuyến tính trong từng cue)
chars = []
for c in cues:
    txt = re.sub(r'\[[^\]]*\]', '', c['text']).strip()
    txt = re.sub(r'\s+', ' ', txt)
    n = max(1, len(txt))
    for i, ch in enumerate(txt):
        chars.append((ch, c['start'] + (c['end'] - c['start']) * i / n))
    chars.append((' ', c['end']))
sent, cur, t0 = [], '', None
for ch, t in chars:
    if not cur.strip() and ch == ' ':
        continue
    if t0 is None: t0 = t
    cur += ch
    if ch in '.?!' :
        sent.append((t0, cur)); cur, t0 = '', None
if cur.strip(): sent.append((t0, cur))
print('# Ngôi nhà biết đi — lời kể từ SRT gốc (refs/ngoinha/subtitles.srt). @at = giây bắt đầu theo SRT.')
print('@source capcut')
print('@narrator BV074_streaming_dsp 20')
print()
for t, s in sent:
    s = re.sub(r'\s+', ' ', s).strip().replace(' "', ' “').replace('"', '”') if False else re.sub(r'\s+', ' ', s).strip()
    print(f'@at {t:.2f} {s}')
