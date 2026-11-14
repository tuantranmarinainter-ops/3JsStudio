#!/usr/bin/env python3
"""mix.py — Trộn track âm thanh cuối cho một tập: giọng đọc + nhạc nền + hiệu ứng (sfx) → chuẩn hoá -14 LUFS.

  python3 tools/mix.py ep001                       → episodes/ep001/mix.m4a
  python3 tools/mix.py ep001 --music path/song.mp3 --music-db -20 --out output/ep001_mix.m4a

Nguồn:
  - Giọng đọc: episodes/<ep>/narration.mp3 (1 track liền cả phim). Thiếu thì dùng nền im lặng.
  - Nhạc: --music, hoặc tự tìm episodes/<ep>/music.(mp3|wav|ogg|m4a|flac). Nhạc tự hạ xuống
    (--duck-db) khi đang có giọng đọc rồi lên lại từ từ.
  - SFX: trường `sfx` của từng shot trong episodes/<ep>/shots.js, file ở assets/sfx/<tên>.(wav|ogg|mp3|flac):
        sfx: 'thud'                                   // phát tại đầu shot
        sfx: { n: 'thud', at: 0.4, db: -3 }           // at = giây tính từ đầu shot (hoặc k: 0..1 = tiến độ shot)
        sfx: ['whoosh', { n: 'thud', k: 0.8 }]        // nhiều tiếng
    ĐIỂM QUAN TRỌNG: mỗi file được đo vị trí ĐỈNH ÂM (chỗ to nhất, ví dụ lúc "bịch") và đặt sao cho
    đỉnh đó rơi đúng thời điểm sự kiện — không phải đầu file. File có 0.3 s im lặng/lấy đà ở đầu vẫn khớp.
    Đặt `peak: false` để căn theo đầu file (tiếng nền, tiếng kéo dài).

Cuối cùng chuẩn hoá loudnorm 2 lượt (đo rồi áp, linear) về -14 LUFS, true peak -1.5 dBTP — mức chuẩn của
YouTube/TikTok/Reels, xem không phải chỉnh loa. Độ dài track = đúng độ dài phim theo timeline.
Cần: ffmpeg, numpy, node.
"""
import argparse, json, re, subprocess, sys, tempfile
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
SR = 48000
AUDIO_EXT = (".wav", ".ogg", ".mp3", ".flac", ".m4a")


def decode(path):
    """Giải mã file âm thanh → float32 (n, 2) @ 48 kHz."""
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-ac", "2", "-ar", str(SR), "-f", "f32le", "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2).copy()


def db(x):
    return 10 ** (x / 20)


def envelope(x, win_s=0.005):
    """Đường bao RMS (cửa sổ ~5 ms) của tín hiệu stereo."""
    m = (x.astype(np.float64) ** 2).mean(axis=1)
    w = max(1, int(SR * win_s))
    c = np.cumsum(np.concatenate([[0.0], m]))
    e = np.sqrt(np.maximum(0, (c[w:] - c[:-w]) / w))
    return np.concatenate([e, np.full(w - 1, e[-1] if len(e) else 0.0)])


def peak_time(x):
    """Thời điểm (giây) của đỉnh âm: chỗ đường bao 5 ms lớn nhất."""
    if not len(x):
        return 0.0
    return float(np.argmax(envelope(x))) / SR


def find_audio(base):
    for e in AUDIO_EXT:
        p = Path(str(base) + e)
        if p.exists():
            return p
    return None


def timeline(ep):
    out = subprocess.run(["node", str(ROOT / "tools" / "ep_timeline.mjs"), ep], capture_output=True, text=True,
                         check=True, cwd=ROOT).stdout
    return json.loads(out)


def sfx_events(shots):
    """Đọc trường sfx của mọi shot → [(tên, thời điểm sự kiện, db, căn_theo_đỉnh, id shot)]."""
    ev = []
    for s in shots:
        v = s.get("sfx")
        if v is None:
            continue
        items = v if isinstance(v, list) else [v]
        for it in items:
            if isinstance(it, str):
                it = {"n": it}
            dur = s["t1"] - s["t0"]
            off = it.get("at", it.get("k", 0) * dur if "k" in it else 0)
            ev.append((it["n"], s["t0"] + off, float(it.get("db", 0)), it.get("peak", True), s["id"]))
    return ev


def add(bus, clip, start, gain):
    """Cộng clip vào bus tại mẫu `start` (có thể âm → cắt phần đầu)."""
    a = max(0, start)
    b = min(len(bus), start + len(clip))
    if b <= a:
        return
    bus[a:b] += clip[a - start:b - start] * gain


def duck_curve(voice, n, depth_db, attack=0.08, release=0.45):
    """Hệ số nhạc: 1 khi im, db(-depth) khi có giọng; lên/xuống mượt (attack/release giây)."""
    if voice is None or depth_db <= 0:
        return None
    env = envelope(voice[:n], 0.05)
    on = (env > db(-38)).astype(np.float64)                       # có giọng
    # làm mượt bằng 2 bộ lọc 1 cực (lên nhanh, xuống chậm) — tính trên lưới 10 ms cho nhanh rồi nội suy
    hop = SR // 100
    g = on[::hop]
    out = np.empty_like(g); s = 0.0
    ka, kr = 1 - np.exp(-0.01 / attack), 1 - np.exp(-0.01 / release)
    for i, x in enumerate(g):
        s += (x - s) * (ka if x > s else kr); out[i] = s
    sm = np.interp(np.arange(n) / hop, np.arange(len(out)), out)
    return (1 - sm * (1 - db(-depth_db)))[:, None].astype(np.float32)


def loudnorm(src, dst, lufs, tp):
    flt = f"loudnorm=I={lufs}:TP={tp}:LRA=11"
    r = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(src), "-af", flt + ":print_format=json", "-f", "null", "-"],
                       capture_output=True, text=True, check=True).stderr
    m = json.loads(re.search(r"\{[^{}]*\"input_i\"[^{}]*\}", r, re.S).group(0))
    flt2 = (f"{flt}:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}"
            f":measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true")
    args = ["-c:a", "aac", "-b:a", "192k"] if str(dst).endswith((".m4a", ".mp4", ".aac")) else []
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(src), "-af", flt2, "-ar", str(SR), *args, str(dst)], check=True)
    return float(m["input_i"])


def measure(path):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(path), "-af", "ebur128=peak=true", "-f", "null", "-"],
                       capture_output=True, text=True).stderr
    i = re.findall(r"I:\s+(-?[\d.]+) LUFS", r)
    p = re.findall(r"Peak:\s+(-?[\d.]+) dBFS", r)
    return (float(i[-1]) if i else None, float(p[-1]) if p else None)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("ep")
    ap.add_argument("--out")
    ap.add_argument("--music")
    ap.add_argument("--music-db", type=float, default=-18.0, help="mức nhạc so với giọng (dB)")
    ap.add_argument("--duck-db", type=float, default=6.0, help="hạ nhạc thêm bao nhiêu dB khi có giọng (0 = tắt)")
    ap.add_argument("--sfx-db", type=float, default=-6.0, help="mức chung của sfx (dB) — để nhỏ dưới giọng/nhạc")
    ap.add_argument("--sfx-dir", default=str(ROOT / "assets" / "sfx"))
    ap.add_argument("--lufs", type=float, default=-14.0)
    ap.add_argument("--tp", type=float, default=-1.5)
    a = ap.parse_args()

    epdir = ROOT / "episodes" / a.ep
    tl = timeline(a.ep)
    n = int(round(tl["total"] * SR))
    bus = np.zeros((n, 2), np.float32)
    log = [f"# mix {a.ep} — {tl['total']:.2f}s", ""]

    voice = None
    vp = epdir / "narration.mp3"
    if vp.exists():
        voice = decode(vp)
        add(bus, voice, 0, 1.0)
        log.append(f"- giọng đọc: {vp.relative_to(ROOT)} ({len(voice) / SR:.2f}s)")
    else:
        log.append("- giọng đọc: (không có — nền im lặng)")

    mp = Path(a.music) if a.music else find_audio(epdir / "music")
    if mp:
        mus = decode(mp)[:n]
        g = db(a.music_db)
        duck = duck_curve(voice, len(mus), a.duck_db)
        add(bus, mus * duck if duck is not None else mus, 0, g)
        log.append(f"- nhạc: {mp} ({a.music_db:+g} dB, hạ {a.duck_db:g} dB khi có giọng)")

    missing, placed = set(), []
    cache = {}
    for name, t, gdb, by_peak, sid in sfx_events(tl["shots"]):
        f = find_audio(Path(a.sfx_dir) / name)
        if not f:
            missing.add(name); continue
        if name not in cache:
            clip = decode(f); cache[name] = (clip, peak_time(clip))
        clip, pk = cache[name]
        off = pk if by_peak else 0.0
        add(bus, clip, int(round((t - off) * SR)), db(a.sfx_db + gdb))
        placed.append((sid, name, t, off))
    if placed:
        log += ["", "| shot | sfx | sự kiện | đỉnh trong file | file bắt đầu |", "|---|---|---|---|---|"]
        log += [f"| {sid} | {nm} | {t:.3f}s | {off * 1000:.0f} ms | {t - off:.3f}s |" for sid, nm, t, off in placed]
    if missing:
        log.append(f"\n⚠️ thiếu file sfx trong {a.sfx_dir}: {', '.join(sorted(missing))}")

    out = Path(a.out) if a.out else epdir / "mix.m4a"
    out.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as td:
        raw = Path(td) / "bus.wav"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", "-",
                        "-c:a", "pcm_f32le", str(raw)], input=bus.tobytes(), check=True)
        before = loudnorm(raw, out, a.lufs, a.tp)
    li, pk = measure(out)
    log += ["", f"- loudnorm: {before:.1f} → {li} LUFS (mục tiêu {a.lufs:g}), đỉnh {pk} dBFS (trần {a.tp:g} dBTP)",
            f"- ra: {out}"]
    print("\n".join(log))


if __name__ == "__main__":
    main()
