#!/usr/bin/env python3
"""caps_whisper.py — chế độ WHISPER của tools/caps_vi.py (phụ đề tiếng Việt từng chữ).

  python tools/caps_vi.py ep001 --whisper [--model large-v3] [<id> ...]

faster-whisper (GPU, word_timestamps, language='vi') nghe từng file giọng voices/vi/<id>.ogg|mp3 CHỈ để lấy mốc thời gian;
CHỮ lấy từ lời kể (voices/vi/<id>.json lines[].text = sự thật). Căn hai chuỗi chữ-bỏ-dấu bằng difflib; chữ không khớp thì nội suy
trong biên câu. Gom cụm: ngắt khi hở > 0,4 s, > 8 chữ, > 3,5 s, > 58 ký tự, hoặc hết câu (.!?); không để từ nhỏ (của, và, là…) cuối cụm.
Ghi voices/vi/<id>.caps.json = [[start, end, text, [[ws, we], …]], …] — phần tử thứ 4 = mốc từng chữ (theo thứ tự chữ cách nhau
bằng dấu cách trong text); trình phát chỉ cần 3 phần tử đầu, ô FX 'chuTungChu' dùng phần tử thứ 4. Ở chế độ này Giọng Bé cũng có caps.json.
"""
import difflib, json, os, re, subprocess, unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FUNC = {'cua', 'va', 'la', 'thi', 'ma', 'nhung', 'cac', 'mot', 'cho', 'voi', 'o', 'da', 'se', 'tai', 'boi', 'nhu', 'de', 'trong',
        'khi', 'neu', 'nen', 'vi', 'rang', 'cung', 'hay', 'hoac', 'nay', 'do'}
MAXW, MAXDUR, MAXCH, GAP = 8, 3.5, 58, 0.4


def fold(s):
    s = unicodedata.normalize('NFD', s.replace('đ', 'd').replace('Đ', 'D'))
    return ''.join(c for c in s.lower() if c.isalnum())


def whisper_words(audio, model_name):
    try:   # DLL CUDA cài bằng pip (như tools/video2kb.py)
        import nvidia
        for root in nvidia.__path__:
            for b in Path(root).glob('*/bin'):
                os.add_dll_directory(str(b)); os.environ['PATH'] = str(b) + os.pathsep + os.environ['PATH']
    except Exception:
        pass
    import numpy as np
    from faster_whisper import WhisperModel
    pcm = np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-i', str(audio), '-ac', '1', '-ar', '16000', '-f', 'f32le', '-'],
                                       capture_output=True, check=True).stdout, np.float32).copy()
    for dev, ct in (('cuda', 'float16'), ('cpu', 'int8')):
        try:
            m = WhisperModel(model_name or ('large-v3' if dev == 'cuda' else 'small'), device=dev, compute_type=ct)
            segs, _ = m.transcribe(pcm, language='vi', word_timestamps=True, vad_filter=False, beam_size=5,
                                   condition_on_previous_text=False)
            return [(w.start, w.end, w.word.strip()) for sg in segs for w in (sg.words or [])]
        except Exception as e:
            print(f'    {dev} lỗi ({str(e)[:100]}) → thử tiếp')
    raise SystemExit('faster-whisper không chạy được')


def align(lines, ww):
    """Chữ của lời kể ← mốc whisper. Trả ([(text, start, end)], số chữ khớp, tổng chữ)."""
    words = []   # [text, chỉ số câu]
    for li, l in enumerate(lines):
        for w in l['text'].split():
            if fold(w): words.append([w, li])
    A = [fold(w[0]) for w in words]; B = [fold(w[2]) for w in ww]
    t0 = [None] * len(words)
    for tag, i1, i2, j1, j2 in difflib.SequenceMatcher(None, A, B, autojunk=False).get_opcodes():
        if tag == 'equal' or (tag == 'replace' and i2 - i1 == j2 - j1):
            for k in range(i2 - i1):
                st, en = ww[j1 + k][0], ww[j1 + k][1]
                l = lines[words[i1 + k][1]]
                if l['start'] - 0.5 <= st <= l['end'] + 0.5: t0[i1 + k] = [st, max(en, st + 0.04)]
    got = sum(x is not None for x in t0)
    n = len(words); i = 0
    while i < n:   # nội suy đoạn chữ chưa khớp giữa hai mốc đã biết (hoặc biên câu), chia theo số ký tự
        if t0[i] is not None: i += 1; continue
        j = i
        while j < n and t0[j] is None: j += 1
        li = words[i][1]
        a = t0[i - 1][1] if i else lines[li]['start']
        if i and words[i - 1][1] != li: a = max(a, lines[li]['start'])
        b = t0[j][0] if j < n else lines[words[j - 1][1]]['end']
        if j < n and words[j][1] != words[j - 1][1]: b = min(b, lines[words[j - 1][1]]['end'])
        b = max(b, a + 0.05 * (j - i))
        tot = sum(len(fold(words[k][0])) or 1 for k in range(i, j)); c = a
        for k in range(i, j):
            d = (b - a) * (len(fold(words[k][0])) or 1) / tot
            t0[k] = [c, c + d]; c += d
        i = j
    for k in range(1, n):   # đơn điệu, không chồng
        if t0[k][0] < t0[k - 1][0]: t0[k][0] = t0[k - 1][0]
        if t0[k - 1][1] > t0[k][0]: t0[k - 1][1] = max(t0[k - 1][0] + 0.02, t0[k][0])
        if t0[k][1] < t0[k][0] + 0.02: t0[k][1] = t0[k][0] + 0.02
    return [(words[k][0], t0[k][0], t0[k][1]) for k in range(n)], got, n


def chunk(W):
    out, cur = [], []

    def flush():
        nonlocal cur
        if cur:
            out.append([round(cur[0][1], 3), round(cur[-1][2], 3), ' '.join(w[0] for w in cur),
                        [[round(w[1], 3), round(w[2], 3)] for w in cur]])
        cur = []
    for w in W:
        if cur:
            over = len(cur) >= MAXW or w[2] - cur[0][1] > MAXDUR or len(' '.join(x[0] for x in cur)) + 1 + len(w[0]) > MAXCH
            if w[1] - cur[-1][2] > GAP:
                flush()
            elif over:
                carry = []
                while len(cur) > 1 and fold(cur[-1][0]) in FUNC: carry.insert(0, cur.pop())
                flush(); cur = carry
        cur.append(w)
        if re.search(r'[.!?…]["”)]*$', w[0]): flush()
    flush()
    for k in range(len(out)):   # kéo dài chút cho dễ đọc, không đè cụm sau
        out[k][1] = round(min(out[k][1] + 0.12, out[k + 1][0] if k + 1 < len(out) else 1e9), 3)
    return out


def run(ep, only, model):
    epd = ROOT / 'episodes' / ep; vd = epd / 'voices' / 'vi'
    ids = sorted(p.stem for p in vd.glob('*.json') if not p.stem.endswith(('.caps', '.raw', '.levels')))
    idx = epd / 'voices' / 'index.json'
    if idx.exists() and not only:
        keep = {v['id'] for v in json.loads(idx.read_text(encoding='utf8')) if v['lang'] == 'vi'}
        ids = [i for i in ids if i in keep]
    if only: ids = [i for i in ids if i in only]
    for vid in ids:
        audio = next((vd / f'{vid}{e}' for e in ('.ogg', '.mp3') if (vd / f'{vid}{e}').exists()), None)
        if not audio: print(f'  {vid}: thiếu file âm thanh'); continue
        lines = json.loads((vd / f'{vid}.json').read_text(encoding='utf8'))['lines']
        W, got, n = align(lines, whisper_words(audio, model))
        res = chunk(W)
        (vd / f'{vid}.caps.json').write_text(json.dumps(res, ensure_ascii=False, separators=(',', ':')), encoding='utf8')
        print(f'  {vid}: {len(res)} cụm, {n} chữ, whisper khớp {got}/{n} ({got * 100 // max(1, n)}%), {res[-1][1]:.1f} s')
    print('caps_vi --whisper: xong (giọng chưa có khoá "caps" trong voices/index.json: chạy lại voices_build.py … index).')
