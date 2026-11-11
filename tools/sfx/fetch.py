#!/usr/bin/env python3
"""Fetch free (CC0 / CC BY only) sound effects from Openverse, normalise, record credits.

  python tools/sfx/fetch.py "big water splash" "wooden door creak"
  python tools/sfx/fetch.py --cues episodes/ep001/sfx/cues_*.json
  python tools/sfx/fetch.py --ambience
  options: --force (refetch phrases already in manifest), --amb (treat CLI phrases as ambience beds)

Output: assets/sfx/<slug>.mp3, assets/sfx/sfx_manifest.json, assets/sfx/CREDITS.md
Openverse anonymous limits: ~20 req/min, 200/day -> searches are throttled and cached
(.cache/sfx/search_*.json), so re-runs cost no API calls.
"""
import argparse, glob, hashlib, json, re, subprocess, sys, time, unicodedata
from pathlib import Path
import requests

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "assets" / "sfx"
CACHE = ROOT / ".cache" / "sfx"
MANIFEST = OUT / "sfx_manifest.json"
CREDITS = OUT / "CREDITS.md"
API = "https://api.openverse.org/v1/audio/"
UA = {"User-Agent": "3JsStudio-sfx-fetch/1.0"}
OK_LICENSES = {"cc0", "by"}
MIN_GAP = 3.5  # seconds between API calls (~17/min)

AMBIENCE = [
    "town ambience day birds", "night crickets ambience", "forest ambience birds",
    "antarctic wind ambience", "ocean waves open sea", "waves beach shore gentle",
    "rain heavy storm ambience", "mountain wind high", "kitchen room tone quiet",
    "ice cracking wind arctic night",
]

_last_call = 0.0


class DailyLimit(Exception):
    pass


def slug(p):
    s = unicodedata.normalize("NFKD", p).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "_", s).strip("_") or hashlib.md5(p.encode()).hexdigest()[:8]


def search(phrase):
    global _last_call
    CACHE.mkdir(parents=True, exist_ok=True)
    cf = CACHE / f"search_{slug(phrase)}.json"
    if cf.exists():
        return json.loads(cf.read_text(encoding="utf-8"))
    for attempt in range(4):
        wait = MIN_GAP - (time.time() - _last_call)
        if wait > 0:
            time.sleep(wait)
        _last_call = time.time()
        r = requests.get(API, params={"q": phrase, "license": "cc0,by", "page_size": 20},
                         headers=UA, timeout=30)
        if r.status_code == 429:
            ra = r.headers.get("Retry-After")
            detail = r.text[:200]
            print(f"  429 rate limited (Retry-After={ra}) {detail}", file=sys.stderr)
            secs = int(ra) if ra and ra.isdigit() else 30 * (attempt + 1)
            if secs > 300 or "day" in detail.lower():
                raise DailyLimit(detail)
            time.sleep(secs)
            continue
        r.raise_for_status()
        res = r.json().get("results", [])
        cf.write_text(json.dumps(res), encoding="utf-8")
        return res
    raise DailyLimit("repeated 429")


def pick(results, ambience):
    ok = [(i, x) for i, x in enumerate(results)
          if (x.get("license") or "").lower() in OK_LICENSES and x.get("url")]
    if not ok:
        return None

    def dur(x):
        return (x.get("duration") or 0) / 1000.0
    if ambience:
        pref = ([(i, x) for i, x in ok if 20 <= dur(x) <= 120]
                or [(i, x) for i, x in ok if dur(x) >= 10] or ok)
    else:
        pref = ([(i, x) for i, x in ok if 0 < dur(x) <= 6]
                or [(i, x) for i, x in ok if 0 < dur(x) <= 15] or ok)
    best = pref[0]
    if best[1]["license"].lower() != "cc0":
        for i, x in pref:
            if x["license"].lower() == "cc0" and i - best[0] <= 3:
                best = (i, x)
                break
    return best[1]


def run(cmd):
    return subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")


def volume_stats(path, af=""):
    chain = (af + "," if af else "") + "volumedetect"
    r = run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(path), "-vn", "-af", chain, "-f", "null", "-"])
    m = re.search(r"max_volume:\s*(-?[\d.]+) dB", r.stderr)
    mean = re.search(r"mean_volume:\s*(-?[\d.]+) dB", r.stderr)
    return (float(m.group(1)) if m else None, float(mean.group(1)) if mean else None)


def convert(src, dst, ambience):
    trim = "silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.02"
    pre = trim + (",atrim=0:120" if ambience else "")
    mx, _ = volume_stats(src, pre)
    target = -6.0 if ambience else -3.0
    gain = max(-30.0, min(30.0, (target - mx) if mx is not None else 0.0))
    af = f"{pre},volume={gain:.2f}dB,alimiter=limit=0.95"
    r = run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(src), "-vn",
             "-af", af, "-ar", "48000", "-ac", "2" if ambience else "1",
             "-c:a", "libmp3lame", "-b:a", "128k", str(dst)])
    if r.returncode != 0:
        raise RuntimeError(r.stderr[-300:])


def probe_dur(path):
    r = run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)])
    try:
        return round(float(r.stdout.strip()), 2)
    except ValueError:
        return None


def write_credits(man):
    by, cc0 = [], []
    for _, e in sorted(man.items()):
        if e.get("missing"):
            continue
        if e["license"] == "by":
            line = f'"{e["title"]}" by {e["creator"]} ({e["source_url"]}), licensed under CC BY 4.0'
            if line not in by:
                by.append(line)
        else:
            line = f'"{e["title"]}" by {e["creator"]} ({e["source_url"]}), CC0'
            if line not in cc0:
                cc0.append(line)
    t = ["# Sound credits", "",
         "Sounds found via Openverse (Freesound). Paste the CC BY lines into the video description.", "",
         "## CC BY 4.0 (attribution required)", ""]
    t += by or ["(none)"]
    t += ["", "## CC0 (no attribution required; thanks to:)", ""]
    t += cc0 or ["(none)"]
    CREDITS.write_text("\n".join(t) + "\n", encoding="utf-8")


def fetch_one(phrase, ambience, man):
    x = pick(search(phrase), ambience)
    if not x:
        man[phrase] = {"missing": True}
        return False
    tmp = CACHE / f"dl_{slug(phrase)}.mp3"
    r = requests.get(x["url"], headers=UA, timeout=120)
    r.raise_for_status()
    tmp.write_bytes(r.content)
    dst = OUT / f"{slug(phrase)}.mp3"
    convert(tmp, dst, ambience)
    d = probe_dur(dst)
    if not d or d < 0.05:
        man[phrase] = {"missing": True}
        return False
    man[phrase] = {
        "file": f"assets/sfx/{dst.name}", "title": x.get("title") or "untitled",
        "creator": x.get("creator") or "unknown", "license": x["license"].lower(),
        "license_url": x.get("license_url"),
        "source_url": x.get("foreign_landing_url") or x.get("url"),
        "duration": d, "ambience": ambience,
    }
    return True


def cue_names(files):
    names = []
    for pat in files:
        for f in glob.glob(pat):
            data = json.loads(Path(f).read_text(encoding="utf-8"))
            items = data if isinstance(data, list) else [c for v in data.values() if isinstance(v, list) for c in v]
            names += [c["name"] for c in items if isinstance(c, dict) and c.get("name")]
    return names


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("phrases", nargs="*")
    ap.add_argument("--cues", nargs="*", help="cue JSON files (glob ok); reads 'name' of each entry")
    ap.add_argument("--ambience", action="store_true", help="fetch the built-in ambience bed list")
    ap.add_argument("--amb", action="store_true", help="treat CLI phrases as ambience beds")
    ap.add_argument("--force", action="store_true")
    a = ap.parse_args()

    jobs = [(p, a.amb) for p in a.phrases]
    if a.ambience:
        jobs += [(p, True) for p in AMBIENCE]
    jobs += [(p, False) for p in cue_names(a.cues or [])]
    seen = set()
    jobs = [j for j in jobs if not (j[0] in seen or seen.add(j[0]))]
    if not jobs:
        ap.error("no phrases")

    OUT.mkdir(parents=True, exist_ok=True)
    CACHE.mkdir(parents=True, exist_ok=True)
    man = json.loads(MANIFEST.read_text(encoding="utf-8")) if MANIFEST.exists() else {}
    got = miss = skip = 0
    missing = []
    try:
        for ph, amb in jobs:
            if ph in man and not a.force:
                skip += 1
                continue
            print(f"[{'amb' if amb else 'sfx'}] {ph}", flush=True)
            try:
                ok = fetch_one(ph, amb, man)
            except DailyLimit as e:
                print(f"!! API limit reached, stopping: {e}", file=sys.stderr)
                break
            except Exception as e:
                print(f"  error: {e}", file=sys.stderr)
                continue
            if ok:
                got += 1
                e = man[ph]
                print(f"  -> {e['file']} {e['duration']}s {e['license']} \"{e['title']}\" by {e['creator']}")
            else:
                miss += 1
                missing.append(ph)
                print("  -> MISSING")
            MANIFEST.write_text(json.dumps(man, indent=2, ensure_ascii=False), encoding="utf-8")
    finally:
        MANIFEST.write_text(json.dumps(man, indent=2, ensure_ascii=False), encoding="utf-8")
        write_credits(man)
    print(f"\nfetched {got}, missing {miss}, skipped {skip}. Credits: {CREDITS}")
    if missing:
        print("WARNING no acceptable result for:", ", ".join(missing))


if __name__ == "__main__":
    main()
