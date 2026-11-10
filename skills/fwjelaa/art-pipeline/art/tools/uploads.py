"""Upload bookkeeping for the Blender art (the uploads themselves run in Studio, see docs/ART.md).

    python art/tools/uploads.py pending            # JSON list of meshes/textures that changed or were never uploaded
    python art/tools/uploads.py record ids.json    # record {"<mesh or texture key>": <asset id>, ...} with file hashes
"""

import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from make_art import MANIFEST, UPLOADS, load, mesh_file, pending, sha1, texture_file  # noqa: E402


def main():
    command = sys.argv[1] if len(sys.argv) > 1 else "pending"
    manifest = load(MANIFEST, {})
    uploads = load(UPLOADS, {})
    if command == "pending":
        todo = pending(manifest, uploads)
        print(json.dumps({
            "meshes": sorted({key for kind, key, _ in todo if kind == "mesh"}),
            "textures": sorted({key for kind, key, _ in todo if kind == "texture"}),
        }, indent=1))
    elif command == "record":
        with open(sys.argv[2], encoding="utf-8") as fh:
            ids = json.load(fh)
        for key, asset_id in ids.items():
            if "/" in key:  # icons/Icon_Coin.png, ui/ui_panel.png: relative to art/out
                path = os.path.join(os.path.dirname(MANIFEST), *key.split("/"))
            else:
                path = texture_file(key) if key.endswith(".png") else mesh_file(key)
            uploads[key] = {"id": int(str(asset_id).replace("rbxassetid://", "")), "sha1": sha1(path)}
        with open(UPLOADS, "w", encoding="utf-8", newline="\n") as fh:
            json.dump(uploads, fh, indent=1, sort_keys=True)
        print(f"recorded {len(ids)} ids")
    else:
        raise SystemExit(__doc__)


if __name__ == "__main__":
    main()
