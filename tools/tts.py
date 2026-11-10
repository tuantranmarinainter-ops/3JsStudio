#!/usr/bin/env python3
"""tts.py — Tạo giọng đọc cho 1 tập phim, MỖI CÂU MỘT LẦN, kèm thời điểm từng câu.

Dùng lại API của Voice Studio (tool TTS của người dùng):
  - Microsoft Edge (thư viện edge-tts): có giọng tiếng Việt, chạy được mọi nơi có Internet (kể cả GitHub Actions).
  - CapCut + Edge qua chính tool Voice Studio: chỉ cần --tool-dir trỏ tới thư mục chứa edge_jobs.py / capcut_engine.py.

Đầu vào: episodes/epNNN/narration.txt
  - Mỗi dòng có chữ = 1 câu (câu số 1, 2, 3… — chính là trường `line` trong shots.js).
  - Dòng trống = ngắt đoạn (khoảng lặng dài hơn).
  - Dòng bắt đầu bằng # = ghi chú, bỏ qua.
  - Giọng người dẫn: @narrator <mã giọng> [tốc độ%] [cao độ Hz]   (thay cho --voice/--rate/--pitch)
  - Khai báo vai:   @voice <vai> <mã giọng> [tốc độ%] [cao độ Hz]
        vd:          @voice me vi-VN-NamMinhNeural -5 -10
  - Câu của vai:    [me] Con đừng ra ngoài sau 6 giờ.
    (câu không ghi vai = người dẫn chuyện, dùng --voice)

Đầu ra (cạnh narration.txt):
  narration.mp3   1 track liền cho cả phim
  narration.json  {total, lines:[{line, who, text, start, end, dur}]}  ← timeline.js đọc file này
  narration.srt   phụ đề theo câu

Dùng:
  python tools/tts.py episodes/ep001/narration.txt                       # Edge, giọng mặc định vi-VN-HoaiMyNeural
  python tools/tts.py episodes/ep001/narration.txt --voice vi-VN-NamMinhNeural --rate 5
  python tools/tts.py --list-voices vi                                   # liệt kê giọng Edge
  python tools/tts.py ep.txt --tool-dir "D:/VoiceStudio" --source capcut --voice <ID giọng CapCut>
  python tools/tts.py ep.txt --dry                                       # không gọi dịch vụ: ước lượng thời lượng
                                                                         #   + âm thanh câm để dựng shot trước
Cần: ffmpeg + ffprobe; edge-tts (pip install edge-tts) cho nguồn Edge.
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

DEFAULT_VOICE = "vi-VN-HoaiMyNeural"
SR = 24000                      # mọi câu chuẩn hoá về 24 kHz mono trước khi ghép (đo thời lượng chính xác)
CACHE = Path(".cache/tts")
LIMITS = {                      # cùng giới hạn với Voice Studio
    "edge":   {"rate": (-80, 100), "pitch": (-50, 50), "volume": (-100, 100)},
    "capcut": {"rate": (-50, 100), "pitch": (0, 0),    "volume": (0, 0)},
}


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode:
        raise RuntimeError(f"{cmd[0]} lỗi: {r.stderr[-400:]}")
    return r.stdout


def need(tool):
    if not shutil.which(tool):
        sys.exit(f"Thiếu '{tool}' trong PATH.")


# ---------- Đọc kịch bản ----------
def parse(path, narrator):
    voices = {"": narrator}
    lines, para = [], 0
    raw = Path(path).read_bytes().decode("utf-8-sig").replace("\r\n", "\n").replace("\r", "\n")
    for row in raw.split("\n"):
        s = row.strip()
        if not s:
            para += 1
            continue
        if s.startswith("#"):
            continue
        m = re.match(r"@narrator\s+(\S+)(?:\s+([+-]?\d+))?(?:\s+([+-]?\d+))?\s*$", s)
        if m:   # @narrator <mã giọng> [tốc độ] [cao độ] — giọng người dẫn ghi ngay trong kịch bản
            vid, rate, pitch = m.groups()
            narrator = voices[""] = {**narrator, "voice": vid, "rate": int(rate) if rate else narrator["rate"],
                                     "pitch": int(pitch) if pitch else narrator["pitch"]}
            continue
        m = re.match(r"@voice\s+(\S+)\s+(\S+)(?:\s+([+-]?\d+))?(?:\s+([+-]?\d+))?\s*$", s)
        if m:
            name, vid, rate, pitch = m.groups()
            voices[name] = {"voice": vid, "rate": int(rate) if rate else narrator["rate"],
                            "pitch": int(pitch) if pitch else narrator["pitch"], "volume": narrator["volume"]}
            continue
        m = re.match(r"\[([^\]]+)\]\s*(.+)", s)
        who, text = (m.group(1), m.group(2)) if m else ("", s)
        if who not in voices:
            sys.exit(f"Câu dùng vai [{who}] nhưng chưa khai báo: @voice {who} <mã giọng>")
        lines.append({"line": len(lines) + 1, "who": who or "narrator", "text": text,
                      "para": para, **voices[who]})
    if not lines:
        sys.exit("narration.txt không có câu nào.")
    return lines


def check_limits(source, item):
    for k, (lo, hi) in LIMITS[source].items():
        if not lo <= item[k] <= hi:
            sys.exit(f"Câu {item['line']}: {k}={item[k]} ngoài giới hạn {source} ({lo}..{hi}).")


# ---------- Nguồn giọng ----------
class EdgeBackend:
    """Gọi thẳng thư viện edge-tts (giống nhánh Microsoft Edge của Voice Studio)."""
    name = "edge"

    def __init__(self, workers):
        try:
            import edge_tts  # noqa
        except ImportError:
            sys.exit("Chưa cài edge-tts: pip install edge-tts")
        self.sem = asyncio.Semaphore(workers)

    async def synth(self, item, out_mp3):
        import edge_tts
        async with self.sem:
            for attempt in range(4):
                try:
                    c = edge_tts.Communicate(item["text"], item["voice"], rate=f"{item['rate']:+d}%",
                                             pitch=f"{item['pitch']:+d}Hz", volume=f"{item['volume']:+d}%")
                    await asyncio.wait_for(c.save(str(out_mp3)), timeout=60)
                    if out_mp3.stat().st_size > 0:
                        return
                except Exception as e:  # mạng chập chờn / bị giới hạn tốc độ → thử lại
                    err = e
                await asyncio.sleep(2 * (attempt + 1))
            raise RuntimeError(f"Edge không tạo được câu {item['line']}: {err}")

    @staticmethod
    async def voices(prefix):
        import edge_tts
        vs = await edge_tts.list_voices()
        return [v for v in vs if not prefix or v["Locale"].lower().startswith(prefix.lower())]


class ToolBackend:
    """Dùng chính engine của Voice Studio: edge_jobs.render_job (Edge hoặc CapCut)."""

    def __init__(self, tool_dir, source, ffmpeg, workers):
        sys.path.insert(0, str(Path(tool_dir).resolve()))
        try:
            from edge_jobs import render_job
        except ImportError as e:
            sys.exit(f"Không import được edge_jobs từ {tool_dir}: {e}")
        self.render_job, self.source, self.ffmpeg, self.workers = render_job, source, ffmpeg, workers
        self.name = f"tool-{source}"
        self.cancel = threading.Event()
        self.lock = asyncio.Lock()           # render_job tự chia luồng bên trong → gọi lần lượt từng câu
        self.resource = {}
        if source == "capcut":
            from capcut_engine import list_voices
            self.resource = {v["ShortName"]: v.get("ResourceId", "") for v in list_voices()}

    async def synth(self, item, out_mp3):
        if self.source == "capcut" and item["voice"] not in self.resource:
            raise RuntimeError(f"Không có giọng CapCut '{item['voice']}' (xem --list-voices với --tool-dir)")
        async with self.lock:
            with tempfile.TemporaryDirectory(prefix="vs-") as d:
                d = Path(d)
                await self.render_job(
                    item["text"], item["voice"], item["rate"], item["pitch"], item["volume"],
                    out_mp3, d / "sub.srt", self.cancel, lambda m: None, lambda m: None,
                    d / "jobs", lambda p, done, total: None,
                    require_subtitles=False, ffmpeg=self.ffmpeg, workers=self.workers,
                    source=self.source, resource_id=self.resource.get(item["voice"], ""), metrics={})

    def voices_list(self):
        if self.source == "capcut":
            from capcut_engine import list_voices
            return list_voices()
        return asyncio.run(EdgeBackend.voices(""))


class DryBackend:
    """Không gọi dịch vụ: âm thanh câm dài theo ước lượng ~14 ký tự/giây (chỉnh theo --rate)."""
    name = "dry"

    async def synth(self, item, out_mp3):
        sec = max(0.6, len(item["text"]) / (14 * (1 + item["rate"] / 100)))
        run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", f"anullsrc=r={SR}:cl=mono",
             "-t", f"{sec:.3f}", "-c:a", "libmp3lame", "-q:a", "9", str(out_mp3)])


# ---------- Ghép + đo thời gian ----------
def cache_key(backend, item):
    sig = [backend, item["voice"], item["rate"], item["pitch"], item["volume"], item["text"]]
    return hashlib.sha256(json.dumps(sig, ensure_ascii=False).encode()).hexdigest()[:20]


def to_wav(src, dst):
    run(["ffmpeg", "-v", "error", "-y", "-i", str(src), "-ac", "1", "-ar", str(SR), "-c:a", "pcm_s16le", str(dst)])
    return (dst.stat().st_size - 44) / 2 / SR          # số mẫu thật → thời lượng chính xác tới mẫu


def srt_time(t):
    ms = int(round(t * 1000))
    return f"{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}"


async def build(args):
    narrator = {"voice": args.voice, "rate": args.rate, "pitch": args.pitch, "volume": args.volume}
    items = parse(args.script, narrator)
    if args.dry:
        backend = DryBackend()
    elif args.tool_dir:
        backend = ToolBackend(args.tool_dir, args.source, shutil.which("ffmpeg") or "", args.workers)
    else:
        backend = EdgeBackend(args.workers)
    for it in items:
        check_limits("capcut" if args.source == "capcut" and args.tool_dir else "edge", it)

    CACHE.mkdir(parents=True, exist_ok=True)
    todo = []
    for it in items:
        it["mp3"] = CACHE / f"{cache_key(backend.name, it)}.mp3"
        if not it["mp3"].exists() or it["mp3"].stat().st_size == 0:
            todo.append(it)
    print(f"{len(items)} câu • cần tạo {len(todo)} • dùng lại {len(items) - len(todo)} từ cache • nguồn {backend.name}")

    async def one(it):
        tmp = it["mp3"].with_suffix(".part.mp3")
        await backend.synth(it, tmp)
        tmp.replace(it["mp3"])
        print(f"  ✓ câu {it['line']:>3}  {it['text'][:60]}")
    await asyncio.gather(*(one(it) for it in todo))

    out = Path(args.script).with_suffix("")
    with tempfile.TemporaryDirectory(prefix="tts-") as d:
        d = Path(d)
        parts, t = [], 0.0
        sil = {}
        def silence(sec):
            if sec not in sil:
                p = d / f"sil_{int(sec * 1000)}.wav"
                run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", f"anullsrc=r={SR}:cl=mono",
                     "-t", f"{sec:.3f}", "-c:a", "pcm_s16le", str(p)])
                sil[sec] = (p, (p.stat().st_size - 44) / 2 / SR)
            return sil[sec]
        if args.lead > 0:
            p, dur = silence(args.lead)
            parts.append(p)
            t += dur
        prev_para = items[0]["para"]
        for i, it in enumerate(items):
            if i:
                p, dur = silence(args.para_gap if it["para"] != prev_para else args.gap)
                parts.append(p)
                t += dur
            prev_para = it["para"]
            w = d / f"l{it['line']:04d}.wav"
            dur = to_wav(it["mp3"], w)
            parts.append(w)
            it["start"], it["end"], it["dur"] = round(t, 3), round(t + dur, 3), round(dur, 3)
            t += dur
        p, dur = silence(args.tail)
        parts.append(p)
        t += dur
        lst = d / "list.txt"
        lst.write_text("".join(f"file '{p}'\n" for p in parts))
        full = d / "full.wav"
        run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", str(lst), "-c", "copy", str(full)])
        run(["ffmpeg", "-v", "error", "-y", "-i", str(full), "-c:a", "libmp3lame", "-b:a", "128k",
             str(out.with_suffix(".mp3"))])

    keep = ("line", "who", "text", "voice", "start", "end", "dur")
    meta = {"source": backend.name, "total": round(t, 3), "lines": [{k: it[k] for k in keep} for it in items]}
    out.with_suffix(".json").write_text(json.dumps(meta, ensure_ascii=False, indent=1), encoding="utf-8")
    out.with_suffix(".srt").write_text("\n".join(
        f"{it['line']}\n{srt_time(it['start'])} --> {srt_time(it['end'])}\n{it['text']}\n" for it in items),
        encoding="utf-8")
    m, s = divmod(t, 60)
    print(f"Xong: {out.with_suffix('.mp3')} • {int(m)}:{s:04.1f} • {len(items)} câu"
          f" • TB {sum(i['dur'] for i in items) / len(items):.2f}s/câu")
    if args.dry:
        print("(--dry: thời lượng chỉ là ƯỚC LƯỢNG, âm thanh câm — tạo lại bằng giọng thật trước khi render)")


def main():
    p = argparse.ArgumentParser(description="Giọng đọc theo câu cho 1 tập phim (dựa trên API của Voice Studio).")
    p.add_argument("script", nargs="?", help="đường dẫn narration.txt")
    p.add_argument("--voice", default=DEFAULT_VOICE, help=f"giọng người dẫn (mặc định {DEFAULT_VOICE})")
    p.add_argument("--rate", type=int, default=0, help="tốc độ %% (Edge -80..100, CapCut -50..100)")
    p.add_argument("--pitch", type=int, default=0, help="cao độ Hz (Edge -50..50; CapCut không hỗ trợ)")
    p.add_argument("--volume", type=int, default=0, help="âm lượng %% (Edge -100..100; CapCut không hỗ trợ)")
    p.add_argument("--gap", type=float, default=0.25, help="lặng giữa 2 câu (giây)")
    p.add_argument("--para-gap", type=float, default=0.6, help="lặng giữa 2 đoạn (giây)")
    p.add_argument("--lead", type=float, default=0.3, help="lặng đầu phim (giây)")
    p.add_argument("--tail", type=float, default=0.8, help="lặng cuối phim (giây)")
    p.add_argument("--workers", type=int, default=3, help="số câu tạo song song (Edge 1–3, CapCut 1–2)")
    p.add_argument("--tool-dir", help="thư mục Voice Studio (chứa edge_jobs.py, capcut_engine.py)")
    p.add_argument("--source", choices=["edge", "capcut"], default="edge", help="nguồn khi dùng --tool-dir")
    p.add_argument("--dry", action="store_true", help="không gọi dịch vụ, chỉ ước lượng thời lượng")
    p.add_argument("--list-voices", nargs="?", const="", metavar="LOCALE", help="liệt kê giọng (vd: vi, en-US)")
    args = p.parse_args()

    if args.list_voices is not None:
        if args.tool_dir:
            vs = ToolBackend(args.tool_dir, args.source, "", 1).voices_list()
            vs = [v for v in vs if v.get("Locale", "").lower().startswith(args.list_voices.lower())]
        else:
            EdgeBackend(1)
            vs = asyncio.run(EdgeBackend.voices(args.list_voices))
        for v in vs:
            print(f"{v['ShortName']:<40} {v.get('Locale', ''):<8} {v.get('Gender', '')}")
        return
    if not args.script:
        p.error("cần đường dẫn narration.txt")
    lim = (1, 2) if args.tool_dir and args.source == "capcut" else (1, 3)
    if not lim[0] <= args.workers <= lim[1]:
        p.error(f"--workers phải trong {lim[0]}–{lim[1]}")
    need("ffmpeg")
    asyncio.run(build(args))


if __name__ == "__main__":
    main()
