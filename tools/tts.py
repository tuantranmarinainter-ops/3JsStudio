#!/usr/bin/env python3
"""tts.py — Tạo giọng đọc cho 1 tập phim, MỖI CÂU MỘT LẦN, kèm thời điểm từng câu.

Dùng chính engine của Voice Studio (tool TTS của người dùng) trong tools/voice_studio/:
  edge_jobs.render_job  →  Microsoft Edge (edge-tts) hoặc CapCut
  capcut_engine.list_voices  →  danh sách giọng CapCut (Anh/Việt)
CapCut cần thêm SDK ở tools/voice_studio/vendor/capcut-tts-api/ (gói capcut_tts_api + PROVENANCE.json).

Đầu vào: episodes/epNNN/narration.txt
  - Mỗi dòng có chữ = 1 câu (câu số 1, 2, 3… — chính là trường `line` trong shots.js).
  - Dòng trống = ngắt đoạn (lặng dài hơn). Dòng bắt đầu bằng # = ghi chú.
  - @source capcut|edge                         nguồn mặc định cho cả tập (thay cho --source)
  - @narrator <giọng> [tốc độ%] [cao độ Hz]     giọng người dẫn (thay cho --voice/--rate/--pitch)
  - @voice <vai> <giọng> [tốc độ%] [cao độ Hz]  khai báo vai;  câu của vai: [vai] Nội dung…
  - Giọng có thể ghi kèm nguồn: capcut:<ID> hoặc edge:<ID>  → trộn 2 nguồn trong 1 tập.

Đầu ra (cạnh narration.txt): narration.mp3 (1 track liền), narration.json (start/end từng câu), narration.srt.

Dùng:
  python tools/tts.py episodes/ep001/narration.txt
  python tools/tts.py --list-voices vi                 # giọng Edge
  python tools/tts.py --list-voices vi --source capcut # giọng CapCut
  python tools/tts.py ep.txt --dry                     # không gọi dịch vụ: ước lượng thời lượng, âm thanh câm
Cần: ffmpeg + ffprobe; pip install edge-tts aiohttp miniaudio requests.
Kết quả từng câu được cache ở .cache/tts/ → sửa 1 câu chỉ tạo lại câu đó.
"""
import argparse
import asyncio
import hashlib
import json
import re
import shutil
import subprocess
import sys
import tempfile
import threading
from pathlib import Path

ENGINE = Path(__file__).resolve().parent / "voice_studio"
DEFAULT_VOICE = {"edge": "vi-VN-HoaiMyNeural", "capcut": None}
SR = 24000                      # mọi câu chuẩn hoá về 24 kHz mono trước khi ghép (đo thời lượng chính xác)
CACHE = Path(".cache/tts")
LIMITS = {                      # cùng giới hạn với Voice Studio
    "edge":   {"rate": (-80, 100), "pitch": (-50, 50), "volume": (-100, 100)},
    "capcut": {"rate": (-50, 100), "pitch": (0, 0),    "volume": (0, 0)},
}
WORKERS = {"edge": (1, 3), "capcut": (1, 2)}


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode:
        raise RuntimeError(f"{cmd[0]} lỗi: {r.stderr[-400:]}")
    return r.stdout


def split_voice(value, default_source):
    m = re.match(r"(edge|capcut):(.+)", value)
    return (m.group(1), m.group(2)) if m else (default_source, value)


# ---------- Đọc kịch bản ----------
def parse(path, args):
    raw = Path(path).read_bytes().decode("utf-8-sig").replace("\r\n", "\n").replace("\r", "\n")
    m = re.search(r"^\s*@source\s+(edge|capcut)\s*$", raw, re.M)
    source = m.group(1) if m else args.source
    voice = args.voice or DEFAULT_VOICE[source]
    narrator = {"source": source, "voice": voice, "rate": args.rate, "pitch": args.pitch, "volume": args.volume}
    voices, lines, para = {"": narrator}, [], 0

    def spec(vid, rate, pitch, base):
        src, vid = split_voice(vid, source)
        return {"source": src, "voice": vid, "rate": int(rate) if rate else base["rate"],
                "pitch": int(pitch) if pitch else (0 if src == "capcut" else base["pitch"]),
                "volume": 0 if src == "capcut" else base["volume"]}

    for row in raw.split("\n"):
        s = row.strip()
        if not s:
            para += 1
            continue
        if s.startswith("#") or s.startswith("@source"):
            continue
        m = re.match(r"@narrator\s+(\S+)(?:\s+([+-]?\d+))?(?:\s+([+-]?\d+))?\s*$", s)
        if m:
            narrator = voices[""] = spec(*m.groups(), narrator)
            continue
        m = re.match(r"@voice\s+(\S+)\s+(\S+)(?:\s+([+-]?\d+))?(?:\s+([+-]?\d+))?\s*$", s)
        if m:
            voices[m.group(1)] = spec(*m.groups()[1:], narrator)
            continue
        m = re.match(r"\[([^\]]+)\]\s*(.+)", s)
        who, text = (m.group(1), m.group(2)) if m else ("", s)
        if who not in voices:
            sys.exit(f"Câu dùng vai [{who}] nhưng chưa khai báo: @voice {who} <giọng>")
        lines.append({"line": len(lines) + 1, "who": who or "narrator", "text": text, "para": para, **voices[who]})
    if not lines:
        sys.exit("narration.txt không có câu nào.")
    for it in lines:
        if not it["voice"]:
            sys.exit("Chưa chọn giọng CapCut: dùng --voice <ID> hoặc @narrator <ID> (xem --list-voices vi --source capcut)")
        for k, (lo, hi) in LIMITS[it["source"]].items():
            if not lo <= it[k] <= hi:
                sys.exit(f"Câu {it['line']} ({it['source']}): {k}={it[k]} ngoài giới hạn {lo}..{hi}.")
    return lines


# ---------- Engine Voice Studio ----------
class Studio:
    """Gọi edge_jobs.render_job của Voice Studio cho từng câu."""

    def __init__(self, engine_dir, workers):
        sys.path.insert(0, str(Path(engine_dir).resolve()))
        try:
            from edge_jobs import render_job
        except ImportError as e:
            sys.exit(f"Thiếu thư viện cho engine Voice Studio ({e}). Cài: pip install edge-tts aiohttp miniaudio requests")
        self.render_job = render_job
        self.workers = workers
        self.sem = {s: asyncio.Semaphore(min(workers, WORKERS[s][1])) for s in WORKERS}
        self.cancel = threading.Event()
        self._capcut = None

    def capcut_voices(self):
        if self._capcut is None:
            try:
                import capcut_engine
            except ImportError as e:
                sys.exit(f"CapCut chưa dùng được: {e}\n→ Cần SDK ở {ENGINE / 'vendor' / 'capcut-tts-api'} "
                         "(chép thư mục vendor/capcut-tts-api từ Voice Studio).")
            voices = capcut_engine.list_voices()
            capcut_engine.list_voices = lambda: voices   # tải catalog 1 lần, không gọi lại mỗi câu
            self._capcut = {v["ShortName"]: v for v in voices}
        return self._capcut

    async def synth(self, it, out_mp3):
        resource = ""
        if it["source"] == "capcut":
            v = self.capcut_voices().get(it["voice"])
            if not v:
                raise RuntimeError(f"Không có giọng CapCut '{it['voice']}' (xem --list-voices vi --source capcut)")
            resource = v["ResourceId"]
        async with self.sem[it["source"]]:
            with tempfile.TemporaryDirectory(prefix="vs-") as d:
                d = Path(d)
                await self.render_job(
                    it["text"], it["voice"], it["rate"], it["pitch"], it["volume"],
                    out_mp3, d / "sub.srt", self.cancel, lambda m: None, lambda m: None,
                    d / "jobs", lambda p, done, total: None,
                    require_subtitles=False, ffmpeg=shutil.which("ffmpeg") or "", workers=1,
                    source=it["source"], resource_id=resource, metrics={})


class Dry:
    """Không gọi dịch vụ: âm thanh câm dài theo ước lượng ~14 ký tự/giây (chỉnh theo tốc độ)."""

    async def synth(self, it, out_mp3):
        sec = max(0.6, len(it["text"]) / (14 * (1 + it["rate"] / 100)))
        run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", f"anullsrc=r={SR}:cl=mono",
             "-t", f"{sec:.3f}", "-c:a", "libmp3lame", "-q:a", "9", str(out_mp3)])


# ---------- Ghép + đo thời gian ----------
def cache_key(dry, it):
    sig = ["dry" if dry else "vs-" + it["source"], it["voice"], it["rate"], it["pitch"], it["volume"], it["text"]]
    return hashlib.sha256(json.dumps(sig, ensure_ascii=False).encode()).hexdigest()[:20]


def to_wav(src, dst):
    run(["ffmpeg", "-v", "error", "-y", "-i", str(src), "-ac", "1", "-ar", str(SR), "-c:a", "pcm_s16le", str(dst)])
    return (dst.stat().st_size - 44) / 2 / SR          # số mẫu thật → thời lượng chính xác tới mẫu


def srt_time(t):
    ms = int(round(t * 1000))
    return f"{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}"


async def build(args):
    items = parse(args.script, args)
    engine = Dry() if args.dry else Studio(args.engine_dir, args.workers)
    CACHE.mkdir(parents=True, exist_ok=True)
    for it in items:
        it["mp3"] = CACHE / f"{cache_key(args.dry, it)}.mp3"
    todo = [it for it in items if not it["mp3"].exists() or it["mp3"].stat().st_size == 0]
    srcs = sorted({it["source"] for it in items})
    print(f"{len(items)} câu • cần tạo {len(todo)} • dùng lại {len(items) - len(todo)} từ cache • "
          f"nguồn {'dry' if args.dry else '+'.join(srcs)}")

    async def one(it):
        tmp = it["mp3"].with_suffix(".part.mp3")
        await engine.synth(it, tmp)
        tmp.replace(it["mp3"])
        print(f"  ✓ câu {it['line']:>3} [{it['source']}] {it['text'][:60]}")
    await asyncio.gather(*(one(it) for it in todo))

    out = Path(args.script).with_suffix("")
    with tempfile.TemporaryDirectory(prefix="tts-") as d:
        d = Path(d)
        parts, t, sil = [], 0.0, {}

        def silence(sec):
            if sec not in sil:
                p = d / f"sil_{int(sec * 1000)}.wav"
                run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", f"anullsrc=r={SR}:cl=mono",
                     "-t", f"{sec:.3f}", "-c:a", "pcm_s16le", str(p)])
                sil[sec] = (p, (p.stat().st_size - 44) / 2 / SR)
            return sil[sec]

        def add(p, dur):
            nonlocal t
            parts.append(p)
            t += dur

        if args.lead > 0:
            add(*silence(args.lead))
        for i, it in enumerate(items):
            if i:
                add(*silence(args.para_gap if it["para"] != items[i - 1]["para"] else args.gap))
            w = d / f"l{it['line']:04d}.wav"
            dur = to_wav(it["mp3"], w)
            it["start"], it["end"], it["dur"] = round(t, 3), round(t + dur, 3), round(dur, 3)
            add(w, dur)
        add(*silence(args.tail))
        lst = d / "list.txt"
        lst.write_text("".join(f"file '{p}'\n" for p in parts))
        full = d / "full.wav"
        run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", str(lst), "-c", "copy", str(full)])
        run(["ffmpeg", "-v", "error", "-y", "-i", str(full), "-c:a", "libmp3lame", "-b:a", "128k",
             str(out.with_suffix(".mp3"))])

    keep = ("line", "who", "text", "source", "voice", "start", "end", "dur")
    meta = {"dry": args.dry, "total": round(t, 3), "lines": [{k: it[k] for k in keep} for it in items]}
    out.with_suffix(".json").write_text(json.dumps(meta, ensure_ascii=False, indent=1), encoding="utf-8")
    out.with_suffix(".srt").write_text("\n".join(
        f"{it['line']}\n{srt_time(it['start'])} --> {srt_time(it['end'])}\n{it['text']}\n" for it in items),
        encoding="utf-8")
    m, s = divmod(t, 60)
    print(f"Xong: {out.with_suffix('.mp3')} • {int(m)}:{s:04.1f} • {len(items)} câu"
          f" • TB {sum(i['dur'] for i in items) / len(items):.2f}s/câu")
    if args.dry:
        print("(--dry: thời lượng chỉ là ƯỚC LƯỢNG, âm thanh câm — tạo lại bằng giọng thật trước khi render)")


def list_voices(args):
    if args.source == "capcut":
        vs = list(Studio(args.engine_dir, 1).capcut_voices().values())
    else:
        try:
            import edge_tts
        except ImportError:
            sys.exit("Cài edge-tts: pip install edge-tts")
        vs = asyncio.run(edge_tts.list_voices())
    for v in vs:
        if v.get("Locale", "").lower().startswith(args.list_voices.lower()):
            print(f"{v['ShortName']:<40} {v.get('Locale', ''):<8} {v.get('Gender', ''):<8} {v.get('DisplayName', '')}")


def main():
    p = argparse.ArgumentParser(description="Giọng đọc theo câu cho 1 tập phim (engine Voice Studio).")
    p.add_argument("script", nargs="?", help="đường dẫn narration.txt")
    p.add_argument("--source", choices=["edge", "capcut"], default="edge", help="nguồn mặc định (hoặc @source)")
    p.add_argument("--voice", help="giọng người dẫn (Edge mặc định vi-VN-HoaiMyNeural)")
    p.add_argument("--rate", type=int, default=0, help="tốc độ %% (Edge -80..100, CapCut -50..100)")
    p.add_argument("--pitch", type=int, default=0, help="cao độ Hz (Edge -50..50; CapCut không hỗ trợ)")
    p.add_argument("--volume", type=int, default=0, help="âm lượng %% (Edge -100..100; CapCut không hỗ trợ)")
    p.add_argument("--gap", type=float, default=0.25, help="lặng giữa 2 câu (giây)")
    p.add_argument("--para-gap", type=float, default=0.6, help="lặng giữa 2 đoạn (giây)")
    p.add_argument("--lead", type=float, default=0.3, help="lặng đầu phim (giây)")
    p.add_argument("--tail", type=float, default=0.8, help="lặng cuối phim (giây)")
    p.add_argument("--workers", type=int, default=2, help="số câu tạo song song (Edge tối đa 3, CapCut tối đa 2)")
    p.add_argument("--engine-dir", default=str(ENGINE), help="thư mục engine Voice Studio (mặc định tools/voice_studio)")
    p.add_argument("--dry", action="store_true", help="không gọi dịch vụ, chỉ ước lượng thời lượng")
    p.add_argument("--list-voices", nargs="?", const="", metavar="LOCALE", help="liệt kê giọng (vd: vi, en-US)")
    args = p.parse_args()
    if args.list_voices is not None:
        return list_voices(args)
    if not args.script:
        p.error("cần đường dẫn narration.txt")
    if not 1 <= args.workers <= 3:
        p.error("--workers phải trong 1–3")
    for t in ("ffmpeg", "ffprobe"):
        if not shutil.which(t):
            sys.exit(f"Thiếu '{t}' trong PATH.")
    asyncio.run(build(args))


if __name__ == "__main__":
    main()
