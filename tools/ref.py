#!/usr/bin/env python3
"""ref.py — Tải video tham khảo và mổ xẻ để Claude tự đọc.

Cần: yt-dlp, ffmpeg, ffprobe trong PATH. Python 3.9+ (chỉ thư viện chuẩn).

Dùng:
  python tools/ref.py "https://www.youtube.com/shorts/XXXX"
  python tools/ref.py "ytsearch5:In This Town roblox story"     # tải 5 video đầu kết quả tìm kiếm
  python tools/ref.py url1 url2 url3
  python tools/ref.py video.mp4                                   # phân tích file có sẵn
Tuỳ chọn:
  --out refs          thư mục kết quả (mặc định refs/)
  --thr 0.25          độ nhạy cắt cảnh (thấp hơn = bắt nhiều cắt hơn)
  --min 0.15          bỏ "shot" ngắn hơn N giây (chớp sáng, hiệu ứng)
  --cols 6 --rows 5   lưới contact sheet
  --drop-video        xoá video sau khi phân tích (tiết kiệm dung lượng)

Kết quả mỗi video: refs/<id>/
  report.md       ← ĐỌC FILE NÀY TRƯỚC: thông tin, thống kê shot, nhịp theo 4 phần, lời thoại
  shots.csv       id, start, end, dur
  sheets/*.jpg    contact sheet (mỗi ô = khung giữa của 1 shot, đọc trái→phải, trên→dưới)
  frames/*.jpg    ảnh từng shot (s001.jpg…)
  transcript.txt  phụ đề tải từ nền tảng (vi/en, gồm phụ đề tự động), có mốc thời gian

Chỉ dùng để nghiên cứu nhịp/cấu trúc. Không đăng lại nội dung của người khác.
"""
import argparse
import json
import re
import shutil
import statistics
import subprocess
import sys
from pathlib import Path

SECTIONS = [("Hook", 0.10), ("Leo thang", 0.40), ("Twist", 0.25), ("Giải quyết", 0.25)]


def run(cmd, **kw):
    return subprocess.run(cmd, capture_output=True, text=True, **kw)


def need(tool):
    if not shutil.which(tool):
        sys.exit(f"Thiếu '{tool}'. Cài rồi chạy lại (vd: pip install yt-dlp / tải ffmpeg).")


def fmt(t):
    return f"{int(t // 60):02d}:{t % 60:05.2f}"


# ---------- Tải ----------
COOKIES = []  # ["--cookies", path] nếu có


class Fail(Exception):
    pass


def resolve(target):
    """URL/tìm kiếm → danh sách (id, url)."""
    r = run(["yt-dlp", *COOKIES, "--flat-playlist", "--no-warnings", "--print", "%(id)s\t%(webpage_url,url)s", target])
    items = []
    for line in r.stdout.splitlines():
        if "\t" in line:
            vid, url = line.split("\t", 1)
            items.append((vid, url if url.startswith("http") else target))
    if not items:
        raise Fail(f"Không lấy được video từ: {target}\n{r.stderr[-500:]}")
    return items


def download(url, d):
    d.mkdir(parents=True, exist_ok=True)
    if (d / "video.mp4").exists():
        print("  đã có video, bỏ qua tải")
        return
    r = run([
        "yt-dlp", *COOKIES, "--no-playlist", "--no-warnings",
        "--ignore-errors", "--sleep-subtitles", "2",   # lỗi tải phụ đề (429) không làm hỏng cả video
        "-f", "bv*[height<=720]+ba/b[height<=720]/b",
        "--merge-output-format", "mp4",
        "--write-info-json", "--write-subs", "--write-auto-subs",
        "--sub-langs", "vi.*,en.*", "--sub-format", "vtt/best", "--convert-subs", "vtt",
        "-o", str(d / "video.%(ext)s"), url,
    ])
    if not (d / "video.mp4").exists():
        raise Fail(f"Tải thất bại: {url}\n{r.stderr[-800:]}")


# ---------- Phân tích ----------
def duration(video):
    r = run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(video)])
    return float(r.stdout.strip())


def detect_cuts(video, thr):
    r = run(["ffmpeg", "-hide_banner", "-i", str(video), "-vf", f"select='gt(scene,{thr})',showinfo",
             "-an", "-f", "null", "-"])
    return sorted(float(m) for m in re.findall(r"pts_time:([0-9.]+)", r.stderr))


def build_shots(cuts, total, min_len):
    bounds = [0.0] + [c for c in cuts if 0 < c < total] + [total]
    shots = []
    for a, b in zip(bounds, bounds[1:]):
        if shots and b - a < min_len:          # gộp mảnh quá ngắn vào shot trước
            shots[-1][1] = b
        else:
            shots.append([a, b])
    if len(shots) > 1 and shots[0][1] - shots[0][0] < min_len:
        shots[1][0] = 0.0
        shots.pop(0)
    return [{"id": f"s{i:03d}", "start": a, "end": b, "dur": b - a} for i, (a, b) in enumerate(shots, 1)]


def grab_frames(video, shots, d):
    fd = d / "frames"
    if fd.exists():
        shutil.rmtree(fd)
    fd.mkdir()
    for s in shots:
        mid = s["start"] + s["dur"] / 2
        run(["ffmpeg", "-v", "error", "-ss", f"{mid:.3f}", "-i", str(video), "-frames:v", "1",
             "-vf", "scale=240:-2", "-q:v", "4", str(fd / f"{s['id']}.jpg")])
    return fd


def contact_sheets(frames_dir, n, d, cols, rows):
    sd = d / "sheets"
    if sd.exists():
        shutil.rmtree(sd)
    sd.mkdir()
    per = cols * rows
    tmp = d / "_tile"
    if tmp.exists():
        shutil.rmtree(tmp)
    tmp.mkdir()
    first = frames_dir / "s001.jpg"
    # đánh số liên tục + đệm ô trống cho đủ lưới (tránh lỗi ô cuối)
    total = -(-n // per) * per
    blank = tmp / "blank.jpg"
    run(["ffmpeg", "-v", "error", "-i", str(first), "-vf", "drawbox=c=black:t=fill", "-frames:v", "1", str(blank)])
    for i in range(1, total + 1):
        src = frames_dir / f"s{i:03d}.jpg"
        shutil.copy(src if src.exists() else blank, tmp / f"{i:04d}.jpg")
    sheets = []
    for k in range(total // per):
        out = sd / f"sheet_{k + 1:02d}.jpg"
        run(["ffmpeg", "-v", "error", "-start_number", str(k * per + 1), "-i", str(tmp / "%04d.jpg"),
             "-frames:v", "1", "-vf", f"tile={cols}x{rows}:padding=4:margin=4:color=white", str(out)])
        lo, hi = k * per + 1, min((k + 1) * per, n)
        sheets.append((out.name, f"s{lo:03d}", f"s{hi:03d}"))
    shutil.rmtree(tmp)
    return sheets


def parse_vtt(path):
    out, last = [], None
    cue_t = 0.0
    for line in path.read_text(encoding="utf-8", errors="ignore").splitlines():
        m = re.match(r"(\d+):(\d+):([\d.]+)\s+-->", line) or re.match(r"(\d+):([\d.]+)\s+-->", line)
        if m:
            g = [float(x) for x in m.groups()]
            cue_t = g[0] * 3600 + g[1] * 60 + g[2] if len(g) == 3 else g[0] * 60 + g[1]
            continue
        text = re.sub(r"<[^>]+>", "", line).strip()
        if not text or text.startswith(("WEBVTT", "Kind:", "Language:", "NOTE")) or text == last:
            continue
        out.append((cue_t, text))
        last = text
    return out


def transcript(d, video):
    subs = sorted(d.glob("video*.vtt"), key=lambda p: (0 if ".vi" in p.name else 1, p.name))
    lines, src = [], None
    if subs:
        lines, src = parse_vtt(subs[0]), subs[0].name
    if lines:
        (d / "transcript.txt").write_text("\n".join(f"[{fmt(t)}] {x}" for t, x in lines), encoding="utf-8")
    return lines, src


def report(d, info, shots, total, sheets, lines, src):
    durs = [s["dur"] for s in shots]
    n = len(shots)
    L = [f"# {info.get('title', d.name)}", ""]
    for k, lab in [("channel", "Kênh"), ("upload_date", "Ngày đăng"), ("view_count", "Lượt xem"),
                   ("like_count", "Lượt thích"), ("webpage_url", "Link")]:
        if info.get(k) is not None:
            L.append(f"- {lab}: {info[k]}")
    L += ["", "## Nhịp cắt cảnh",
          f"- Thời lượng: {fmt(total)} ({total:.1f}s)",
          f"- Số shot: **{n}** → {n / total * 60:.0f} shot/phút",
          f"- Shot dài: TB {statistics.mean(durs):.2f}s · trung vị {statistics.median(durs):.2f}s · "
          f"ngắn nhất {min(durs):.2f}s · dài nhất {max(durs):.2f}s",
          f"- 3 giây đầu: {sum(1 for s in shots if s['start'] < 3)} shot", "",
          "## Theo 4 phần (chia theo % thời lượng — chỉ ước lượng)",
          "| Phần | Khoảng | Số shot | Shot TB |", "|---|---|---|---|"]
    a = 0.0
    for name, frac in SECTIONS:
        b = a + frac * total
        ss = [s for s in shots if a <= s["start"] < b]
        avg = statistics.mean(s["dur"] for s in ss) if ss else 0
        L.append(f"| {name} | {fmt(a)}–{fmt(b)} | {len(ss)} | {avg:.2f}s |")
        a = b
    L += ["", "## Contact sheet (mỗi ô = 1 shot, trái→phải, trên→dưới)"]
    L += [f"- sheets/{f}: {lo}–{hi}" for f, lo, hi in sheets]
    L += ["", "## Danh sách shot", "| id | bắt đầu | dài | lời thoại lúc đó |", "|---|---|---|---|"]
    for s in shots:
        said = " / ".join(x for t, x in lines if s["start"] <= t < s["end"])[:80]
        L.append(f"| {s['id']} | {fmt(s['start'])} | {s['dur']:.2f}s | {said} |")
    L += ["", f"## Lời thoại ({src or 'video không có phụ đề'})", ""]
    L += [f"[{fmt(t)}] {x}" for t, x in lines] or ["(trống)"]
    (d / "report.md").write_text("\n".join(L), encoding="utf-8")


def analyze(d, video, args):
    info_p = next(d.glob("video*.info.json"), None)
    info = json.loads(info_p.read_text(encoding="utf-8")) if info_p else {"title": video.stem}
    total = duration(video)
    print(f"  dài {total:.1f}s → dò cắt cảnh…")
    shots = build_shots(detect_cuts(video, args.thr), total, args.min)
    print(f"  {len(shots)} shot → chụp khung…")
    fd = grab_frames(video, shots, d)
    sheets = contact_sheets(fd, len(shots), d, args.cols, args.rows)
    lines, src = transcript(d, video)
    with open(d / "shots.csv", "w", encoding="utf-8") as f:
        f.write("id,start,end,dur\n")
        f.writelines(f"{s['id']},{s['start']:.3f},{s['end']:.3f},{s['dur']:.3f}\n" for s in shots)
    report(d, info, shots, total, sheets, lines, src)
    if args.drop_video and video.parent == d:
        video.unlink()
    print(f"  xong → {d / 'report.md'}")
    return {"dir": d.name, "title": info.get("title", ""), "dur": total, "shots": len(shots)}


def main():
    p = argparse.ArgumentParser(description="Tải + mổ xẻ video tham khảo cho Claude đọc.")
    p.add_argument("targets", nargs="+", help="URL, 'ytsearchN:từ khoá', hoặc file video")
    p.add_argument("--out", default="refs")
    p.add_argument("--thr", type=float, default=0.25)
    p.add_argument("--min", type=float, default=0.15)
    p.add_argument("--cols", type=int, default=6)
    p.add_argument("--rows", type=int, default=5)
    p.add_argument("--drop-video", action="store_true")
    p.add_argument("--cookies", help="file cookies.txt (khi YouTube đòi xác minh không phải bot)")
    args = p.parse_args()
    if args.cookies:
        COOKIES.extend(["--cookies", args.cookies])
    for t in ("ffmpeg", "ffprobe"):
        need(t)
    out = Path(args.out)
    out.mkdir(exist_ok=True)
    results, errors = [], []
    for target in args.targets:
        if Path(target).is_file():
            v = Path(target)
            d = out / v.stem
            d.mkdir(exist_ok=True)
            print(f"[file] {v}")
            results.append(analyze(d, v, args))
            continue
        need("yt-dlp")
        try:
            items = resolve(target)
        except Fail as e:
            errors.append(str(e))
            print(e)
            continue
        for vid, url in items:
            d = out / vid
            print(f"[{vid}] {url}")
            try:
                download(url, d)
                results.append(analyze(d, d / "video.mp4", args))
            except Exception as e:  # 1 video lỗi không làm dừng cả lô
                errors.append(f"{url}: {e}")
                print(f"  LỖI: {e}")
    if len(results) > 1:   # bảng so sánh khi phân tích nhiều video
        L = ["# So sánh video tham khảo", "", "| thư mục | tiêu đề | dài | shot | shot/phút |", "|---|---|---|---|---|"]
        L += [f"| {r['dir']} | {r['title'][:50]} | {fmt(r['dur'])} | {r['shots']} | {r['shots'] / r['dur'] * 60:.0f} |"
              for r in results]
        (out / "summary.md").write_text("\n".join(L), encoding="utf-8")
        print(f"So sánh: {out / 'summary.md'}")
    if errors:
        (out / "errors.md").write_text("# Lỗi\n\n" + "\n\n".join(f"- {e}" for e in errors), encoding="utf-8")
        print(f"{len(errors)} lỗi → {out / 'errors.md'}")
    if not results:
        sys.exit(1)


if __name__ == "__main__":
    main()
