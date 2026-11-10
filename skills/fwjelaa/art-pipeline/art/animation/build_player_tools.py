"""Builds, polishes, grounds, exports and renders the player work animations, headless:

    blender -b art/animation/zombie_r15_work.blend -P art/animation/build_player_tools.py

Writes art/animation/export/<name>.rbxanim, review frames in art/animation/review/ (<name>_<frame>_<view>.png) and
saves the .blend with the new actions.
"""

import json
import os
import sys

import bpy

BASE = os.path.dirname(os.path.abspath(bpy.data.filepath)) + os.sep  # art/animation (open the .blend from here)
SKILL = __import__("os").environ.get("ANIMATE_SKILL_SCRIPTS", ".")
sys.path.insert(0, SKILL)

for module in ("rig_helpers.py", "zombie_anims.py", "ground.py", "player_tools_anims.py"):
    exec(open(BASE + module, encoding="utf-8").read())

import authentic_rig  # noqa: E402

EXPORT = BASE + "export"
REVIEW_FRAMES = 6

# The live session had the companion add-on enabled; headless Blender needs it switched on before the skill's
# authenticity check can see the importer/exporter operators
addon = authentic_rig.enable_bundled_addon()
check = authentic_rig.inspect_authenticity(bpy.data.objects[ARM])
print("AUTHENTICITY " + json.dumps({"addon": addon.get("ok"), "ready": check.get("authentic_ready"),
                                    "workflow": check.get("workflow"), "errors": addon.get("errors")}, default=str))

setup_review()
floor = floor_level()
report = {"floor": round(floor, 4)}
for name, (factory, frames, loops) in PLAYER_TOOLS.items():
    keys = sorted(set(list(range(1, frames + 1, 2)) + [frames]))
    built = build(name, frames, factory(frames), loop=loops, key_frames=keys)
    if not built.get("ok"):
        report[name] = {"build": built}
        continue
    polish(name)
    worst = plant(name, frames, floor, seam=loops)
    bpy.data.actions[name].use_fake_user = True
    exported = authentic_rig.export_rbxanim(f"{EXPORT}/{name}", ARM, name, 1, frames)
    a = arm()
    a.animation_data.action = bpy.data.actions[name]
    renders = []
    for i in range(REVIEW_FRAMES):
        f = 1 + round(i * (frames - 1) / (REVIEW_FRAMES - 1))
        for view in ("ThreeQuarter", "Side"):
            renders.append(render_view("Cam_" + view, f"{name}_{f:03d}", f))
    report[name] = {
        "feet_error": worst,
        "export_ok": exported.get("ok"),
        "export_errors": exported.get("errors"),
        "renders": len(renders),
    }

for action in bpy.data.actions:
    action.use_fake_user = True
bpy.ops.wm.save_mainfile()
print("PLAYER_TOOLS_REPORT " + json.dumps(report, default=str))
