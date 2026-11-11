#!/usr/bin/env python3
"""Giọng đọc + phụ đề tiếng Anh cho một tập, bám theo NHỊP cắt cảnh (beats.json).

  python tools/en/tts_en.py ep001 [--voice en-US-AndrewMultilingualNeural] [--base-rate 8]

- Mỗi nhịp đọc riêng bằng Microsoft Edge TTS (edge-tts) và đặt ĐÚNG thời điểm cú cắt (+ OFFSET) → mỗi lần chuyển
  khung là một cụm mới bắt đầu (đọc nhấn khi cắt cảnh, như bản tiếng Việt).
- Đọc dài hơn khung nhịp → tăng tốc độ (rate) tới MAX_RATE; vẫn dài → nén thêm bằng ffmpeg atempo (tối đa 1.25).
- Phụ đề lấy mốc từng chữ (WordBoundary) → cụm 1–3 chữ như bản Việt.
Ra: episodes/<ep>/narration_en.mp3, captions_en.js (CAPTIONS_EN), narration_en.json (báo cáo từng nhịp).
Cache từng nhịp ở .cache/tts_en/ (sửa 1 câu chỉ đọc lại câu đó). Cần: pip install edge-tts; ffmpeg.
"""
import argparse, asyncio, hashlib, importlib.util, json, re, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ap = argparse.ArgumentParser()
ap.add_argument('ep')
ap.add_argument('--voice', default='en-US-AndrewMultilingualNeural')
ap.add_argument('--base-rate', type=int, default=8, help='tốc độ nền (%%) cho mọi nhịp')
ap.add_argument('--until', type=float, help='chỉ làm đoạn đầu tới giây này (đoạn nghe thử)')
ap.add_argument('--out', help='tiền tố file ra (vd episodes/ep001/voices/en/en-US-AvaNeural) → .mp3, .caps.json, .json; '
                'bỏ trống = narration_en.mp3 + captions_en.js của tập')
args = ap.parse_args()
EPD = ROOT / 'episodes' / args.ep
CACHE = ROOT / '.cache' / 'tts_en'; CACHE.mkdir(parents=True, exist_ok=True)
SR, OFFSET, GAP, MAX_RATE, MAX_TEMPO = 48000, 0.04, 0.08, 45, 1.25

spec = importlib.util.spec_from_file_location('en', ROOT / 'tools' / 'en' / f'en_{args.ep}.py')
mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
beats = json.load(open(EPD / 'beats.json', encoding='utf8'))
if args.until: beats = [b for b in beats if b['end'] <= args.until + 0.05]
total = max(b['end'] for b in beats)


async def synth(text, rate):
    import edge_tts
    key = hashlib.sha1(f'{args.voice}|{rate}|{text}'.encode()).hexdigest()[:16]
    mp3, js = CACHE / f'{key}.mp3', CACHE / f'{key}.json'
    if mp3.exists() and js.exists():
        return mp3, json.load(open(js, encoding='utf8'))
    for attempt in range(4):
        try:
            com = edge_tts.Communicate(text, args.voice, rate=f'{rate:+d}%', boundary='WordBoundary')
            audio, words = bytearray(), []
            async for ch in com.stream():
                if ch['type'] == 'audio': audio += ch['data']
                elif ch['type'] == 'WordBoundary':
                    words.append([ch['offset'] / 1e7, (ch['offset'] + ch['duration']) / 1e7, ch['text']])
            if not audio: raise RuntimeError('không có audio')
            mp3.write_bytes(audio); json.dump(words, open(js, 'w', encoding='utf8'), ensure_ascii=False)
            return mp3, words
        except Exception as e:
            print(f'   thử lại ({e})', file=sys.stderr); await asyncio.sleep(2 + attempt * 3)
    raise SystemExit(f'Edge TTS lỗi: {text}')


def pcm(path, tempo=1.0):
    af = ['-af', f'atempo={tempo:.4f}'] if abs(tempo - 1) > 1e-3 else []
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(path), *af, '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-'],
                         capture_output=True, check=True).stdout
    import array
    a = array.array('f'); a.frombytes(raw); return a


def trim_silence(a, thr=0.004):
    """bỏ khoảng lặng đầu/cuối (Edge chèn ~0.1 s) → trả (mảng, giây bị cắt ở đầu)."""
    i, j = 0, len(a)
    while i < j and abs(a[i]) < thr: i += 1
    while j > i and abs(a[j - 1]) < thr: j -= 1
    i = max(0, i - int(0.015 * SR))
    return a[i:j], i / SR


async def main():
    import array
    mix = array.array('f', [0.0]) * int((total + 0.5) * SR)
    caps, report = [], []
    for k, b in enumerate(beats):
        text = mod.EN[b['id']]
        start = b['start'] + OFFSET
        nxt = beats[k + 1]['start'] if k + 1 < len(beats) else total
        slot = nxt - start - GAP
        rate = args.base_rate
        mp3, words = await synth(text, rate)
        a, cut = trim_silence(pcm(mp3)); dur = len(a) / SR
        if dur > slot and rate < MAX_RATE:
            rate = min(MAX_RATE, int((dur / slot) * (100 + rate) - 100) + 3)
            mp3, words = await synth(text, rate)
            a, cut = trim_silence(pcm(mp3)); dur = len(a) / SR
        tempo = 1.0
        if dur > slot:
            tempo = min(MAX_TEMPO, dur / slot)
            a, cut2 = trim_silence(pcm(mp3, tempo)); cut = cut2 * tempo; dur = len(a) / SR
        o = int(start * SR)
        for i, v in enumerate(a):
            if o + i < len(mix): mix[o + i] += v
        # phụ đề: cụm 1–3 chữ theo mốc từng chữ
        ws = [[start + (w0 - cut) / tempo, start + (w1 - cut) / tempo, w] for w0, w1, w in align(text, words)]
        chunks, cur = [], []
        for w in ws:
            cur.append(w)
            txt = ' '.join(x[2] for x in cur)
            weak = w[2].lower() in ('the', 'a', 'an', 'of', 'to', 'in', 'on', 'at', 'and', 'my', 'our', 'his', 'its', 'he', 'i', 'we', 'it')
            if re.search(r'[.,:;?!"”]$', w[2]) or ((len(cur) >= 3 or len(txt) >= 11) and not (weak and len(cur) < 4)):
                chunks.append(cur); cur = []
        if cur: chunks.append(cur)
        for i, c in enumerate(chunks):
            s = c[0][0]; e = chunks[i + 1][0][0] if i + 1 < len(chunks) else min(nxt, start + dur + 0.25)
            caps.append([round(max(b['start'], s), 3), round(e, 3), clean(' '.join(x[2] for x in c))])
        over = dur - slot
        report.append({**b, 'en': text, 'rate': rate, 'tempo': round(tempo, 3), 'dur': round(dur, 3), 'slot': round(slot, 3)})
        flag = '  <-- DÀI' if over > 0.02 else ''
        print(f"{b['id']} {b['start']:7.2f}  rate {rate:+3d}% tempo {tempo:.2f}  {dur:4.2f}/{slot:4.2f}s{flag}  {text}")
    # nối liền phụ đề: cụm trước kéo tới cụm sau nếu khoảng trống < 0.35 s
    for i in range(len(caps) - 1):
        if 0 < caps[i + 1][0] - caps[i][1] < 0.35: caps[i][1] = caps[i + 1][0]
    peak = max(1e-6, max(abs(v) for v in mix)); g = min(1.0, 0.89 / peak)
    raw = array.array('f', (v * g for v in mix)).tobytes()
    out = Path(args.out + '.mp3') if args.out else EPD / 'narration_en.mp3'
    out.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-', '-t', f'{total:.3f}',
                    '-c:a', 'libmp3lame', '-b:a', '160k', str(out)], input=raw, check=True)
    if args.out:
        Path(args.out + '.caps.json').write_text(json.dumps(caps, ensure_ascii=False), encoding='utf8')
        json.dump({'voice': args.voice, 'source': 'edge', 'total': total, 'beats': report},
                  open(args.out + '.json', 'w', encoding='utf8'), ensure_ascii=False, indent=1)
        print(f'→ {out}'); return
    (EPD / 'captions_en.js').write_text(
        f'// Phụ đề tiếng Anh theo cụm 1–3 chữ, sinh bởi tools/en/tts_en.py từ mốc từng chữ của giọng {args.voice}. [start, end, text]\n'
        f'export const CAPTIONS_EN = {json.dumps(caps, ensure_ascii=False)};\n', encoding='utf8')
    json.dump({'voice': args.voice, 'source': 'edge', 'total': total, 'beats': report},
              open(EPD / 'narration_en.json', 'w', encoding='utf8'), ensure_ascii=False, indent=1)
    print(f'→ {out}, captions_en.js ({len(caps)} cụm), narration_en.json')


def align(text, words):
    """Mốc WordBoundary (không có dấu câu) → gán cho từng chữ của câu gốc (giữ dấu câu, ngoặc kép)."""
    core = lambda s: re.sub(r'\W', '', s).lower()
    out, j = [], 0
    for t in text.split():
        c = core(t)
        if not c or j >= len(words):
            if out: out[-1][2] += ' ' + t
            continue
        s, e, acc = words[j][0], words[j][1], core(words[j][2]); j += 1
        while len(acc) < len(c) and j < len(words):
            acc += core(words[j][2]); e = words[j][1]; j += 1
        out.append([s, e, t])
    return out


def clean(s):
    return re.sub(r'\s+([,.:;?!])', r'\1', s).replace('" ', '"').strip()


asyncio.run(main())
