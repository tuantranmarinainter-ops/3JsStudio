#!/usr/bin/env python3
"""popscan.py — Dò lỗi "pop"/"nhảy hình" trong video đã render (trò "tìm điểm khác nhau" tự động).

So từng frame với frame liền trước. Ở chỗ bình thường, độ chênh giữa 2 frame thay đổi từ từ;
lỗi hiện ra thành một CÚ VỌT gấp nhiều lần các frame hàng xóm:
  - pop   (khung lạc): đúng 1 frame khác hẳn cả trước lẫn sau, còn frame trước và sau lại giống nhau
                       → nhân vật/camera/vật thể "chớp" sai trong 1 frame.
  - jump  (nhảy hình): 1 cú vọt KHÔNG nằm ở điểm cắt cảnh → vật/camera dịch đột ngột giữa shot.
  - flicker (nhấp nháy): nhiều cú vọt sát nhau (cách ≤ 3 frame) → chớp/nháy sáng liên tục
                       (tia chớp, đèn) — cố ý thì bỏ qua, nhưng nháy theo từng frame thường chói mắt.
  - cut   (cắt cảnh) : cú vọt nằm đúng điểm nối 2 shot → bình thường, chỉ đếm, không báo lỗi.
Điểm cắt lấy từ timeline của tập (--ep) nên báo lỗi theo id shot (s012…).

Dùng:
  python3 tools/popscan.py output/ep001.mp4 --ep ep001
  python3 tools/popscan.py output/part_03.mp4 --ep ep001 --start 34.2      # đoạn render bắt đầu ở giây 34.2
  python3 tools/popscan.py out.mp4 --ep ep001 --thumbs output/pops --report output/popscan.md
Tuỳ chọn: --ratio (mặc định 3: vọt ≥ 3× hàng xóm), --floor (độ chênh tối thiểu, 0..1, mặc định 0.02),
          --fail (thoát mã 1 nếu có pop/jump — dùng trong CI).
Cần: ffmpeg, ffprobe, numpy; node (khi dùng --ep).
"""
import argparse, json, subprocess, sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent


def probe(video):
    out = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
                          "stream=width,height,r_frame_rate", "-of", "json", str(video)],
                         capture_output=True, text=True, check=True).stdout
    s = json.loads(out)["streams"][0]
    n, d = s["r_frame_rate"].split("/")
    return s["width"], s["height"], float(n) / float(d)


def frames(video, w, h):
    """Giải mã từng frame (xám, thu nhỏ) qua ffmpeg; trả về generator mảng float32 h×w trong 0..1."""
    p = subprocess.Popen(["ffmpeg", "-v", "error", "-i", str(video), "-vf", f"scale={w}:{h}:flags=area,format=gray",
                          "-f", "rawvideo", "-"], stdout=subprocess.PIPE)
    size = w * h
    try:
        while True:
            b = p.stdout.read(size)
            if len(b) < size:
                break
            yield np.frombuffer(b, np.uint8).reshape(h, w).astype(np.float32) / 255.0
    finally:
        p.stdout.close(); p.wait()


def diffs(video, w, h):
    """d[i] = chênh lệch trung bình frame i so với i-1 (d[0]=0); br[i] = chênh i-1 so với i+1 (cầu nối)."""
    d, br = [0.0], [0.0]
    prev2 = prev = None
    for f in frames(video, w, h):
        if prev is not None:
            d.append(float(np.abs(f - prev).mean()))
        if prev2 is not None:
            br.append(float(np.abs(f - prev2).mean()))   # cầu nối cho frame giữa (prev)
        prev2, prev = prev, f
    br.append(0.0)
    return np.array(d), np.array(br[: len(d)])


def load_timeline(ep, fps):
    out = subprocess.run(["node", str(ROOT / "tools" / "ep_timeline.mjs"), ep, str(round(fps))],
                         capture_output=True, text=True, check=True, cwd=ROOT).stdout
    return json.loads(out)


def scan(d, br, ratio, floor, cut_frames):
    n = len(d)
    res = []
    for i in range(1, n):
        lo, hi = max(1, i - 5), min(n, i + 6)
        nb = [d[j] for j in range(lo, hi) if abs(j - i) > 1]       # hàng xóm, bỏ chính nó và 2 frame sát
        base = float(np.median(nb)) if nb else 0.0
        if d[i] < floor or d[i] < ratio * max(base, floor / ratio):
            continue
        res.append((i, base))
    found, used = [], set()
    spikes = {i for i, _ in res}
    for i, base in res:
        if i in used:
            continue
        nxt = i + 1
        # pop: frame i vọt lên, frame i+1 vọt về, và frame i-1 ≈ frame i+1
        if nxt in spikes and br[i] < 0.5 * min(d[i], d[nxt]):
            found.append(("pop", i, d[i], base)); used |= {i, nxt}; continue
        if i in cut_frames or (i - 1) in cut_frames or (i + 1) in cut_frames:
            found.append(("cut", i, d[i], base)); used.add(i); continue
        found.append(("jump", i, d[i], base)); used.add(i)
    # gộp các jump/pop sát nhau thành 1 mục flicker: (kind, i_đầu, chênh_lớn_nhất, hàng_xóm, i_cuối)
    out, k = [], 0
    while k < len(found):
        kind, i, di, base = found[k]
        if kind == "cut":
            out.append((kind, i, di, base, i)); k += 1; continue
        j = k
        while j + 1 < len(found) and found[j + 1][0] != "cut" and found[j + 1][1] - found[j][1] <= 3:
            j += 1
        if j > k:
            grp = found[k:j + 1]
            out.append(("flicker", i, max(g[2] for g in grp), min(g[3] for g in grp), grp[-1][1]))
        else:
            out.append((kind, i, di, base, i))
        k = j + 1
    return out


def shot_at(shots, t):
    for s in shots:
        if s["t0"] - 1e-6 <= t < s["t1"] - 1e-6:
            return s
    return shots[-1] if shots else None


def thumbs(video, items, fps, w, h, outdir):
    """Ảnh 3 ô (frame trước | frame lỗi | frame sau) cho mỗi lỗi."""
    outdir.mkdir(parents=True, exist_ok=True)
    paths = []
    for kind, i, _, _, _ in items:
        p = outdir / f"{kind}_F{i:05d}.jpg"
        sel = "+".join(f"eq(n\\,{j})" for j in (i - 1, i, i + 1))
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(video), "-vf",
                        f"select='{sel}',scale={w * 2}:{h * 2},tile=3x1:padding=4:color=white",
                        "-frames:v", "1", "-q:v", "3", str(p)], check=True)
        paths.append(p)
    return paths


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("video")
    ap.add_argument("--ep", help="tập (vd ep001) để biết điểm cắt + id shot")
    ap.add_argument("--start", type=float, default=0.0, help="giây bắt đầu của video trong phim (render theo đoạn)")
    ap.add_argument("--ratio", type=float, default=3.0)
    ap.add_argument("--floor", type=float, default=0.02)
    ap.add_argument("--width", type=int, default=96, help="bề ngang khi phân tích (nhỏ = nhanh)")
    ap.add_argument("--thumbs", help="thư mục lưu ảnh 3 ô cho mỗi lỗi")
    ap.add_argument("--report", help="ghi báo cáo markdown")
    ap.add_argument("--fail", action="store_true", help="thoát mã 1 nếu có pop/jump")
    a = ap.parse_args()

    W, H, fps = probe(a.video)
    w = a.width; h = max(2, round(w * H / W / 2) * 2)
    shots, cut_frames = [], set()
    if a.ep:
        tl = load_timeline(a.ep, fps)
        shots = tl["shots"]
        cut_frames = {round((s["t0"] - a.start) * fps) for s in shots[1:]}
    d, br = diffs(a.video, w, h)
    found = scan(d, br, a.ratio, a.floor, cut_frames)
    bad = [x for x in found if x[0] != "cut"]
    spk = {x[1] for x in found if x[0] == "cut"}
    ncut = sum(1 for c in cut_frames if spk & {c - 1, c, c + 1})

    lines = [f"# popscan — {a.video}", "",
             f"{len(d)} frame @ {fps:g} fps · ngưỡng: vọt ≥ {a.ratio:g}× hàng xóm và ≥ {a.floor:g} · "
             + (f"điểm cắt có cú vọt: {ncut}/{len(cut_frames)} (cắt êm như match cut thì không vọt)" if cut_frames else "không có timeline (--ep) nên cắt cảnh cũng bị báo là jump"), ""]
    if not bad:
        lines.append("Không thấy pop/nhảy hình. ✅")
    else:
        lines += ["| loại | frame | thời điểm (phim) | shot | chênh | hàng xóm | × |", "|---|---|---|---|---|---|---|"]
        for kind, i, di, base, i2 in bad:
            t = a.start + i / fps
            s = shot_at(shots, t)
            sid = f"{s['id']} (+{t - s['t0']:.2f}s)" if s else "—"
            fr = f"F{i}" if i2 == i else f"F{i}–F{i2}"
            lines.append(f"| {kind} | {fr} | {t:.3f}s | {sid} | {di:.3f} | {base:.3f} | {di / max(base, 1e-4):.1f} |")
    if a.thumbs and bad:
        ps = thumbs(a.video, bad, fps, w, h, Path(a.thumbs))
        lines += ["", "Ảnh (trước | lỗi | sau): " + ", ".join(str(p) for p in ps)]
    text = "\n".join(lines) + "\n"
    print(text, end="")
    if a.report:
        Path(a.report).parent.mkdir(parents=True, exist_ok=True)
        Path(a.report).write_text(text, encoding="utf-8")
    if a.fail and bad:
        sys.exit(1)


if __name__ == "__main__":
    main()
