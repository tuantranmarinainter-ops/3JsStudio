#!/usr/bin/env python3
"""video2kb.py — Quăng 1 video vào → bản nháp KỊCH BẢN + khung từng shot để phân tích, đúng định dạng
docs/kich-ban-vao.md (đưa thẳng cho tools/storyboard.py dựng tập mới).

  python tools/video2kb.py <video.mp4 | URL> [--out kich-ban/<tên>] [--cua-toi]
         [--loi auto|asr|vtt|off] [--lang vi|en|…] [--model large-v3|medium|small]
         [--am-thanh | --no-am-thanh] [--thr 0.25] [--min 0.15] [--force]

Mỗi bước bật/tắt được: --loi off (không lấy lời), --no-am-thanh (không dò tiếng động/nhịp).
Lời kể: --loi auto = nhận dạng giọng faster-whisper (GPU nếu có, không thì CPU) khi đã cài, không thì phụ đề tải kèm
(link YouTube), không có gì thì để trống. Cài: pip install faster-whisper (mô hình tải lần đầu vào ~/.cache/huggingface).

Ra (kich-ban/<tên>/):
  storyboard.md        bảng shot NHÁP: id, khung, giây (đúng cú cắt gốc), lời kể (câu mới ở shot câu bắt đầu, "^" = còn câu
                       trước), tiếng động dò được — các cột loại/ai/ở đâu/hành động/mặt/máy quay để Claude xem khung rồi điền
  shot_001.jpg …       khung giữa mỗi shot (540 px) — khung storyboard
  frames/shot_001.jpg  dải 3 khung đầu | giữa | cuối mỗi shot (để thấy chuyển động/máy quay)
  sheets/sheet_01.jpg  bảng khung có nhãn (id · giây bắt đầu · dài), 6×4 ô/tờ
  phan-tich.md         ĐỌC TRƯỚC: nhịp cắt, 4 phần, lời theo shot, tiếng động, BPM, cắt khớp nhịp/khoảng lặng, việc cần làm
  loi.json / loi.srt   lời nhận dạng (có mốc từng chữ khi dùng asr) · am-thanh.json · shots.json
  _nguon/              video tải về (không commit)

Bước tiếp: Claude xem sheets + frames, điền storyboard.md (skill video-sang-kich-ban) → người dùng duyệt →
  python tools/storyboard.py kich-ban/<tên> epNNN --sheet
"""
import argparse, json, math, re, shutil, subprocess, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import ref  # noqa: E402  (dò cắt cảnh, tải video, đọc vtt — dùng chung với tools/ref.py)

for _s in (sys.stdout, sys.stderr):   # console Windows cp1252 không in được tiếng Việt
    try: _s.reconfigure(encoding='utf-8', errors='replace')
    except Exception: pass

SR = 22050
N_FFT, HOP = 1024, 256
COLS, ROWS = 6, 4


def run(cmd, **kw):
    return subprocess.run(cmd, capture_output=True, **kw)


def fmt(t):
    return f"{int(t // 60)}:{t % 60:04.1f}"


def probe(video):
    r = run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=r_frame_rate,width,height',
             '-show_entries', 'format=duration', '-of', 'json', str(video)], text=True)
    j = json.loads(r.stdout)
    st = j['streams'][0]
    a, b = (st['r_frame_rate'].split('/') + ['1'])[:2]
    has_audio = bool(json.loads(run(['ffprobe', '-v', 'error', '-select_streams', 'a', '-show_entries', 'stream=index',
                                     '-of', 'json', str(video)], text=True).stdout).get('streams'))
    return {'fps': float(a) / float(b or 1), 'w': st['width'], 'h': st['height'],
            'dur': float(j['format']['duration']), 'audio': has_audio}


# ---------------------------------------------------------------- khung
def grab(video, shots, fps, out):
    """1 lần giải mã: lấy khung đầu/giữa/cuối mỗi shot (select theo số khung)."""
    from PIL import Image, ImageDraw
    want = {}
    for s in shots:
        a = int(math.ceil(s['start'] * fps + 1)); b = max(a, int(s['end'] * fps) - 2); m = (a + b) // 2
        s['_f'] = (a, m, b)
        for n in (a, m, b): want.setdefault(n, None)
    nums = sorted(want)
    tmp = out / '_tmp'
    shutil.rmtree(tmp, ignore_errors=True); tmp.mkdir()
    expr = '+'.join(f'eq(n\\,{n})' for n in nums)
    r = run(['ffmpeg', '-v', 'error', '-y', '-i', str(video), '-vf', f"select='{expr}',scale=540:-2",
             '-fps_mode', 'passthrough', '-q:v', '3', str(tmp / '%05d.jpg')], text=True)
    files = sorted(tmp.glob('*.jpg'))
    if len(files) < len(nums):   # khung cuối video có thể thiếu → lấy khung gần nhất
        print(f'  (lấy được {len(files)}/{len(nums)} khung) {r.stderr[-200:]}')
    if not files:
        sys.exit('Không lấy được khung nào từ video.')
    for i, n in enumerate(nums):
        want[n] = files[min(i, len(files) - 1)]
    (out / 'frames').mkdir(exist_ok=True)
    for i, s in enumerate(shots, 1):
        a, m, b = (Image.open(want[n]).convert('RGB') for n in s['_f'])
        m.save(out / f'shot_{i:03d}.jpg', quality=88)
        tw = 240; th = round(m.height * tw / m.width)
        strip = Image.new('RGB', (tw * 3 + 8, th + 26), 'white')
        d = ImageDraw.Draw(strip)
        for k, (im, lab) in enumerate(((a, 'đầu'), (m, 'giữa'), (b, 'cuối'))):
            strip.paste(im.resize((tw, th)), (k * (tw + 4), 0))
            d.text((k * (tw + 4) + 4, th + 4), f"{s['id']} {lab}", fill='black', font=font(16))
        strip.save(out / 'frames' / f'shot_{i:03d}.jpg', quality=85)
        del s['_f']
    shutil.rmtree(tmp, ignore_errors=True)


_FONTS = {}


def font(size):
    from PIL import ImageFont
    if size not in _FONTS:
        f = None
        for p in ('assets/fonts/BeVietnamPro-Bold.ttf', 'C:/Windows/Fonts/segoeuib.ttf', 'C:/Windows/Fonts/arialbd.ttf',
                  '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'):
            try:
                f = ImageFont.truetype(p, size); break
            except OSError:
                pass
        _FONTS[size] = f or ImageFont.load_default()
    return _FONTS[size]


def sheets(shots, out):
    from PIL import Image, ImageDraw
    sd = out / 'sheets'
    shutil.rmtree(sd, ignore_errors=True); sd.mkdir()
    first = Image.open(out / 'shot_001.jpg')
    tw = 240; th = round(first.height * tw / first.width); lab = 30
    per = COLS * ROWS; res = []
    for k in range(0, len(shots), per):
        grp = shots[k:k + per]
        rows = -(-len(grp) // COLS)   # tờ cuối chỉ cao vừa số hàng có ảnh
        sheet = Image.new('RGB', (COLS * (tw + 6) + 6, rows * (th + lab + 6) + 6), 'white')
        d = ImageDraw.Draw(sheet)
        for j, s in enumerate(grp):
            x = 6 + (j % COLS) * (tw + 6); y = 6 + (j // COLS) * (th + lab + 6)
            sheet.paste(Image.open(out / f'shot_{k + j + 1:03d}.jpg').resize((tw, th)), (x, y))
            d.text((x + 2, y + th + 4), f"{s['id']}  {fmt(s['start'])}  {s['dur']:.1f}s", fill='black', font=font(18))
        name = f'sheet_{k // per + 1:02d}.jpg'
        sheet.save(sd / name, quality=85)
        res.append((name, grp[0]['id'], grp[-1]['id']))
    return res


# ---------------------------------------------------------------- lời
def asr(video, out, lang, model_name, force):
    cache = out / 'loi.json'
    if cache.exists() and not force:
        j = json.loads(cache.read_text(encoding='utf8'))
        if j.get('src') == 'asr':
            print('  dùng lại loi.json'); return j
    try:   # thư viện CUDA cài bằng pip (nvidia-cublas-cu12, nvidia-cudnn-cu12) → cho ctranslate2 tìm thấy DLL
        import os, nvidia
        for root in nvidia.__path__:
            for b in Path(root).glob('*/bin'):
                os.add_dll_directory(str(b)); os.environ['PATH'] = str(b) + os.pathsep + os.environ['PATH']
    except Exception:
        pass
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        print('  chưa cài faster-whisper → bỏ qua nhận dạng giọng (pip install faster-whisper)'); return None
    import numpy as np   # tự giải mã bằng ffmpeg → mảng 16 kHz (tránh lệch phiên bản PyAV của faster-whisper)
    pcm = np.frombuffer(run(['ffmpeg', '-v', 'error', '-i', str(video), '-ac', '1', '-ar', '16000', '-f', 'f32le', '-']).stdout,
                        np.float32).copy()
    m = None
    for dev, ct in (('cuda', 'float16'), ('cpu', 'int8')):
        try:
            name = model_name or ('large-v3' if dev == 'cuda' else 'small')
            m = WhisperModel(name, device=dev, compute_type=ct)
            segs, info = m.transcribe(pcm, language=lang, word_timestamps=True, vad_filter=True, beam_size=5)
            segs = list(segs)
            print(f'  nhận dạng giọng: {name} trên {dev}, ngôn ngữ {info.language} ({info.language_probability:.0%})')
            break
        except Exception as e:  # thiếu CUDA/cuDNN → chạy CPU
            print(f'  {dev} lỗi ({str(e)[:120]}) → thử tiếp'); m = None
    if m is None:
        return None
    lines = [{'start': round(s.start, 3), 'end': round(s.end, 3), 'text': s.text.strip(),
              'words': [[round(w.start, 3), round(w.end, 3), w.word.strip()] for w in (s.words or [])]}
             for s in segs if s.text.strip()]
    return {'src': 'asr', 'model': name, 'lang': info.language, 'lines': lines}


def vtt_lines(out, total):
    subs = sorted((out / '_nguon').glob('video*.vtt'), key=lambda p: (0 if '.vi' in p.name else 1, p.name))
    if not subs:
        return None
    raw = ref.parse_vtt(subs[0])
    lines = [{'start': t, 'end': (raw[i + 1][0] if i + 1 < len(raw) else total), 'text': x} for i, (t, x) in enumerate(raw)]
    return {'src': 'vtt', 'file': subs[0].name, 'lines': lines}


def srt(lines, path):
    def ts(t):
        return f'{int(t // 3600):02d}:{int(t % 3600 // 60):02d}:{int(t % 60):02d},{int(round(t % 1 * 1000)) % 1000:03d}'
    path.write_text('\n'.join(f"{i}\n{ts(l['start'])} --> {ts(l['end'])}\n{l['text']}\n" for i, l in enumerate(lines, 1)),
                    encoding='utf8')


def assign_lines(shots, lines):
    """Câu → shot nơi câu bắt đầu (câu bắt đầu ngay trước cú cắt ≤0,25 s thì dời sang shot sau);
    các shot tiếp theo còn nằm trong câu → '^'."""
    for s in shots:
        s['loi'] = ''
    for ln in lines:
        st = ln['start']
        idx = next((i for i, s in enumerate(shots) if s['start'] <= st < s['end']), len(shots) - 1)
        if idx + 1 < len(shots) and shots[idx]['end'] - st < 0.25:
            idx += 1
        s = shots[idx]
        s['loi'] = (s['loi'] + ' ' + ln['text']).strip() if s['loi'] not in ('', '^') else ln['text']
        for t in shots[idx + 1:]:
            if t['start'] < ln['end'] - 0.2 and not t['loi']:
                t['loi'] = '^'
            else:
                break


# ---------------------------------------------------------------- âm thanh (chỉ numpy)
SFX_NAME = {'impact': 'impact thud', 'whoosh': 'whoosh', 'click': 'click', 'ding': 'ding bell', 'hit': 'hit'}


def audio_analysis(video, shots, speech, total):
    import numpy as np
    raw = run(['ffmpeg', '-v', 'error', '-i', str(video), '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-']).stdout
    x = np.frombuffer(raw, np.float32)
    if len(x) < N_FFT * 4:
        return None
    nfr = 1 + (len(x) - N_FFT) // HOP
    win = np.hanning(N_FFT).astype(np.float32)
    mag = np.empty((nfr, N_FFT // 2 + 1), np.float32)
    for k in range(0, nfr, 2048):   # theo khối cho nhẹ RAM
        idx = np.arange(k, min(nfr, k + 2048))[:, None] * HOP + np.arange(N_FFT)[None, :]
        mag[k:k + len(idx)] = np.abs(np.fft.rfft(x[idx] * win, axis=1))
    freqs = np.fft.rfftfreq(N_FFT, 1 / SR)
    hop_t = HOP / SR
    db = 10 * np.log10((mag ** 2).mean(1) + 1e-10)
    lg = np.log1p(mag * 10)
    flux = np.maximum(lg[1:] - lg[:-1], 0).sum(1); flux = np.concatenate([[0], flux])
    # ngưỡng thích nghi: trung vị trượt 0,5 s + 3·MAD
    w = int(0.5 / hop_t)
    pad = np.pad(flux, (w, w), mode='edge')
    from numpy.lib.stride_tricks import sliding_window_view as swv
    med = np.median(swv(pad, 2 * w + 1)[:len(flux)], axis=1)
    mad = np.median(np.abs(flux - med)) + 1e-6
    thr = med + 3 * 1.4826 * mad
    gap = int(0.12 / hop_t)
    peaks = []
    for i in range(1, len(flux) - 1):
        if flux[i] > thr[i] and flux[i] >= flux[i - 1] and flux[i] >= flux[i + 1]:
            if peaks and i - peaks[-1] < gap:
                if flux[i] > flux[peaks[-1]]: peaks[-1] = i
            else:
                peaks.append(i)
    low = freqs < 200
    in_speech = lambda t: any(a - 0.05 <= t <= b + 0.05 for a, b in speech)
    events = []
    for i in peaks:
        t = i * hop_t
        before = db[max(0, i - int(0.3 / hop_t)):max(1, i - 1)]
        rise = db[i:i + 3].max() - np.median(before)
        if rise < 6:
            continue
        spec = mag[i:i + 3].mean(0) ** 2
        cen = float((spec * freqs).sum() / (spec.sum() + 1e-9))
        lowr = float(spec[low].sum() / (spec.sum() + 1e-9))
        peak = db[i:i + 3].max(); j = i
        while j < len(db) - 1 and db[j] > peak - 10 and (j - i) * hop_t < 1.5: j += 1
        dur = (j - i) * hop_t
        slow = db[max(0, i - int(0.25 / hop_t)):i + 1]
        gradual = len(slow) > 3 and (slow[-1] - slow[0]) > 8 and (np.diff(slow) > 0).mean() > 0.6
        tonal = float(spec.max() / (spec.mean() + 1e-9)) > 40
        kind = ('impact' if lowr > 0.45 else 'whoosh' if gradual and cen > 1500 else
                'ding' if tonal and cen > 1500 and dur > 0.25 else 'click' if cen > 3500 and dur < 0.12 else 'hit')
        sp = in_speech(t)
        if sp and not (kind == 'impact' and rise > 12):   # âm tiết lời nói không phải tiếng động
            continue
        events.append({'t': round(t, 3), 'kind': kind, 'rise_db': round(float(rise), 1), 'dur': round(dur, 2),
                       'centroid': round(cen), 'low': round(lowr, 2), 'trong_loi': sp})
    # nhịp (BPM) từ tự tương quan đường bao onset, 60–180 BPM
    env = flux - med; env[env < 0] = 0
    env = env - env.mean()
    ac = np.correlate(env, env, mode='full')[len(env) - 1:]
    ac /= ac[0] + 1e-9
    lo, hi = int(60 / 180 / hop_t), int(60 / 60 / hop_t)
    lag = lo + int(np.argmax(ac[lo:hi])); strength = float(ac[lag])
    bpm = 60 / (lag * hop_t)
    beat_ok = strength > 0.25
    cuts = [s['start'] for s in shots[1:]]
    on_t = np.array([e['t'] for e in events]) if events else np.array([])
    near = lambda c: on_t.size and np.min(np.abs(on_t - c)) <= 0.07
    res = {
        'events': events,
        'bpm': round(bpm, 1) if beat_ok else None, 'bpm_do_ro': round(strength, 2),
        'cat_trung_tieng_dong': round(sum(1 for c in cuts if near(c)) / max(1, len(cuts)), 2),
        'cat_trong_khoang_lang': (round(sum(1 for c in cuts if not in_speech(c)) / max(1, len(cuts)), 2) if speech else None),
        'do_on_db': {'tb': round(float(np.median(db)), 1), 'max': round(float(db.max()), 1)},
    }
    if beat_ok:
        period = 60 / bpm
        res['cat_khop_nhip'] = round(sum(1 for c in cuts if min(c % period, period - c % period) <= 0.07) / max(1, len(cuts)), 2)
    for s in shots:
        s['sfx'] = [e for e in events if s['start'] <= e['t'] < s['end']]
    return res


# ---------------------------------------------------------------- ra file
HEAD = ['id', 'khung', 'giây', 'lời kể', 'loại', 'ai', 'cùng', 'ở đâu', 'hành động', 'mặt', 'máy quay', 'chữ', 'tiếng động', 'ghi chú']


def cell(v):
    return str(v).replace('|', '/').replace('\n', ' ').strip()


def write_storyboard(out, title, shots):
    L = [f'title: {title}', 'seed: 1',
         'rule: (Claude điền — luật lạ của thị trấn, 1 câu)', 'weakness: (điểm yếu của nhân vật chính)',
         'twist: (nguyên nhân ẩn / bí mật người lớn / kẽ hở của luật)', 'solution: (điểm yếu thành lời giải)', '',
         '| ' + ' | '.join(HEAD) + ' |', '|' + '---|' * len(HEAD)]
    for i, s in enumerate(shots, 1):
        sfx = '; '.join(f"{SFX_NAME[e['kind']]}@{e['t'] - s['start']:.2f}" for e in s.get('sfx', [])[:4])
        row = [i, f'shot_{i:03d}.jpg', f"{s['dur']:.2f}", s.get('loi', ''), '', '', '', '', '', '', '', '', sfx, '']
        L.append('| ' + ' | '.join(cell(v) for v in row) + ' |')
    (out / 'storyboard.md').write_text('\n'.join(L) + '\n', encoding='utf8')


def write_report(out, meta, shots, sh, loi, au, mine):
    import statistics as stt
    total = meta['dur']; durs = [s['dur'] for s in shots]; n = len(shots)
    L = [f"# Phân tích: {meta['title']}", '',
         f"- Nguồn: `{meta['src']}` · {meta['w']}×{meta['h']} · {meta['fps']:.2f} fps · {fmt(total)} ({total:.1f}s)",
         f"- **{n} shot** → {n / total * 60:.0f} shot/phút · shot TB {stt.mean(durs):.2f}s, trung vị {stt.median(durs):.2f}s, "
         f"ngắn nhất {min(durs):.2f}s, dài nhất {max(durs):.2f}s · 3 giây đầu: {sum(1 for s in shots if s['start'] < 3)} shot",
         f"- Lời: {('nhận dạng giọng ' + loi.get('model', '') + ' (' + loi.get('lang', '') + ')') if loi and loi['src'] == 'asr' else ('phụ đề ' + loi['file']) if loi else 'không có (tắt hoặc không lấy được)'}"
         + (f", {len(loi['lines'])} câu" if loi else ''), '']
    if not mine:
        L += ['> **Video của kênh khác** → chỉ học nhịp, bố cục, cách cắt, cách đặt tiếng động. Khi điền storyboard.md phải đổi',
              '> luật, nhân vật, twist và lời kể thành ý của mình (CLAUDE.md: không chép cốt truyện). Video của bạn → chạy lại với `--cua-toi`.', '']
    if au:
        L += ['## Âm thanh',
              f"- Tiếng động dò được: **{len(au['events'])}** ("
              + ', '.join(f"{k} {sum(1 for e in au['events'] if e['kind'] == k)}" for k in SFX_NAME if any(e['kind'] == k for e in au['events'])) + ')',
              f"- Nhịp nhạc: {str(au['bpm']) + ' BPM' if au['bpm'] else 'không rõ'} (độ rõ {au['bpm_do_ro']})"
              + (f" · cắt khớp nhịp ±70 ms: {au['cat_khop_nhip']:.0%}" if au.get('cat_khop_nhip') is not None else ''),
              f"- Cú cắt trùng tiếng động (±70 ms): {au['cat_trung_tieng_dong']:.0%}"
              + (f" · cú cắt rơi vào khoảng lặng giữa câu: {au['cat_trong_khoang_lang']:.0%}" if au['cat_trong_khoang_lang'] is not None else ''),
              '- Loại tiếng động chỉ là đoán thô theo phổ (impact = trầm/rầm, whoosh = vút, click/hit = gõ, ding = chuông); '
              'trong storyboard.md ghi bằng tên tiếng Anh để tools/sfx tìm âm thanh CC0.', '']
    L += ['## 4 phần (theo % thời lượng — ước lượng)', '| Phần | Khoảng | Số shot | Shot TB |', '|---|---|---|---|']
    a = 0.0
    for name, frac in ref.SECTIONS:
        b = a + frac * total; ss = [s for s in shots if a <= s['start'] < b]
        L.append(f"| {name} | {fmt(a)}–{fmt(b)} | {len(ss)} | {(stt.mean(x['dur'] for x in ss) if ss else 0):.2f}s |"); a = b
    L += ['', '## Bảng khung', *[f'- `sheets/{f}`: {lo}–{hi}' for f, lo, hi in sh],
          '- Dải đầu|giữa|cuối từng shot: `frames/shot_NNN.jpg` (xem khi cần biết chuyển động / máy quay)', '',
          '## Shot', '| id | bắt đầu | dài | lời | tiếng động |', '|---|---|---|---|---|']
    for s in shots:
        L.append(f"| {s['id']} | {fmt(s['start'])} | {s['dur']:.2f}s | {cell(s.get('loi', ''))[:90]} | "
                 + ', '.join(f"{e['kind']}@{e['t'] - s['start']:.2f}" for e in s.get('sfx', [])) + ' |')
    L += ['', '## Việc tiếp theo (skill `video-sang-kich-ban`)',
          '1. Xem `sheets/*.jpg` (và `frames/` khi cần) → điền các cột loại / ai / ở đâu / hành động / mặt / máy quay / chữ trong `storyboard.md`;',
          '   điền rule / weakness / twist / solution + `actor …` ở đầu file. Lời nhận dạng sai chính tả → sửa luôn.',
          '2. Gửi người dùng duyệt `storyboard.md` + bảng khung.',
          f"3. Duyệt xong: `python tools/storyboard.py {out.as_posix()} epNNN --sheet`."]
    (out / 'phan-tich.md').write_text('\n'.join(L) + '\n', encoding='utf8')


def main():
    ap = argparse.ArgumentParser(description='Video → bản nháp kịch bản + khung từng shot (docs/kich-ban-vao.md)')
    ap.add_argument('src', help='file video hoặc URL (YouTube…)')
    ap.add_argument('--out', help='thư mục ra (mặc định kich-ban/<tên>)')
    ap.add_argument('--cua-toi', action='store_true', help='video của chính người dùng (không cần đổi cốt truyện)')
    ap.add_argument('--loi', default='auto', choices=['auto', 'asr', 'vtt', 'off'], help='nguồn lời kể')
    ap.add_argument('--lang', default=None, help='ngôn ngữ lời (vi, en…); trống = tự nhận')
    ap.add_argument('--model', default=None, help='mô hình faster-whisper; trống = large-v3 trên GPU, small trên CPU')
    ap.add_argument('--am-thanh', dest='audio', action=argparse.BooleanOptionalAction, default=True, help='dò tiếng động + nhịp')
    ap.add_argument('--thr', type=float, default=0.25, help='độ nhạy cắt cảnh (thấp = bắt nhiều cắt hơn)')
    ap.add_argument('--min', type=float, default=0.15, help='gộp shot ngắn hơn N giây')
    ap.add_argument('--force', action='store_true', help='làm lại cả phần nhận dạng giọng')
    a = ap.parse_args()
    for t in ('ffmpeg', 'ffprobe'):
        ref.need(t)
    info = {}
    if Path(a.src).is_file():
        video = Path(a.src).resolve()
        out = Path(a.out or f'kich-ban/{re.sub(r"[^\w.-]+", "_", video.stem)}')
        out.mkdir(parents=True, exist_ok=True)
    else:
        ref.need('yt-dlp')
        vid, url = ref.resolve(a.src)[0]
        out = Path(a.out or f'kich-ban/{vid}')
        ref.download(url, out / '_nguon')
        video = out / '_nguon' / 'video.mp4'
        ip = next((out / '_nguon').glob('video*.info.json'), None)
        info = json.loads(ip.read_text(encoding='utf8')) if ip else {}
    meta = probe(video)
    meta.update(src=a.src, title=info.get('title') or video.stem)
    print(f"[video2kb] {meta['title']} — {meta['dur']:.1f}s {meta['w']}×{meta['h']} → {out}")
    shots = ref.build_shots(ref.detect_cuts(video, a.thr), meta['dur'], a.min)
    print(f'  {len(shots)} shot → lấy khung…')
    grab(video, shots, meta['fps'], out)
    sh = sheets(shots, out)
    loi = None
    if a.loi != 'off' and meta['audio']:
        if a.loi in ('auto', 'asr'):
            loi = asr(video, out, a.lang, a.model, a.force)
        if loi is None and a.loi in ('auto', 'vtt'):
            loi = vtt_lines(out, meta['dur'])
    for s in shots: s['loi'] = ''
    if loi:
        assign_lines(shots, loi['lines'])
        (out / 'loi.json').write_text(json.dumps(loi, ensure_ascii=False, indent=1), encoding='utf8')
        srt(loi['lines'], out / 'loi.srt')
    au = None
    if a.audio and meta['audio']:
        print('  dò tiếng động + nhịp…')
        speech = [(l['start'], l['end']) for l in loi['lines']] if loi else []
        au = audio_analysis(video, shots, speech, meta['dur'])
        if au:
            (out / 'am-thanh.json').write_text(json.dumps(au, ensure_ascii=False, indent=1), encoding='utf8')
    (out / 'shots.json').write_text(json.dumps({'meta': meta, 'shots': shots}, ensure_ascii=False, indent=1), encoding='utf8')
    write_storyboard(out, meta['title'], shots)
    write_report(out, meta, shots, sh, loi, au, a.cua_toi)
    print(f"  xong → {out / 'phan-tich.md'} · {out / 'storyboard.md'} · {len(sh)} bảng khung")


if __name__ == '__main__':
    main()
