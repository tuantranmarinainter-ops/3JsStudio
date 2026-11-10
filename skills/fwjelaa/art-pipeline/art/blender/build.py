"""Build art assets headless:  blender -b --factory-startup -P art/blender/build.py -- [name patterns]"""

import fnmatch
import os
import sys
import time
import traceback

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import mhg  # noqa: E402
import assets_plot  # noqa: E402,F401  (registers assets)
import assets_town  # noqa: E402,F401
import assets_icons  # noqa: E402,F401
import assets_nature  # noqa: E402,F401
import assets_v2  # noqa: E402,F401

args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
patterns = args or ["*"]
names = [n for n in mhg.ASSETS if any(fnmatch.fnmatch(n, p) for p in patterns)]
icons = [n for n in mhg.ICONS if any(fnmatch.fnmatch(n, p) for p in patterns)]
entries, failed = {}, []
for name in names:
    started = time.time()
    try:
        entry = mhg.build_asset(name)
        entries[name] = entry
        tris = sum(p["tris"] for p in entry["parts"])
        print(f"[art] OK {name}: {len(entry['parts'])} part(s), {tris} tris, {time.time() - started:.1f}s")
    except Exception:
        failed.append(name)
        print(f"[art] FAIL {name}\n{traceback.format_exc()}")
for name in icons:
    started = time.time()
    try:
        mhg.build_icon(name)
        print(f"[art] OK icon {name}: {time.time() - started:.1f}s")
    except Exception:
        failed.append(name)
        print(f"[art] FAIL {name}\n{traceback.format_exc()}")
mhg.write_manifest(entries)
print(f"[art] done: {len(entries)} built, {len(failed)} failed {failed}")
