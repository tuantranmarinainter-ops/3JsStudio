"""Convert art/animation/export/*.rbxanim to Roblox KeyframeSequence files (.rbxmx) and publish them.

    python art/tools/publish_animations.py convert              # write art/animation/rbxmx/*.rbxmx
    python art/tools/publish_animations.py publish              # upload every clip, write ids to art/animation/ids.json
    python art/tools/publish_animations.py luau                 # patch the ids into src/shared/Game/Animations.luau

Publishing uses Roblox Open Cloud (Assets API). It needs an API key with the Assets read+write permission, read from
the ROBLOX_API_KEY environment variable (never written to disk), and the owner's user id in ROBLOX_USER_ID.
"""

import json
import os
import re
import sys
import time
import urllib.request
import uuid
import zlib
from xml.sax.saxutils import escape

ART = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ROOT = os.path.dirname(ART)
EXPORT = os.path.join(ART, "animation", "export")
OUT = os.path.join(ART, "animation", "rbxmx")
IDS = os.path.join(ART, "animation", "ids.json")
LUAU = os.path.join(ROOT, "src", "shared", "Game", "Animations.luau")

# R15 joint hierarchy: pose name -> parent pose name (a Pose is nested under its parent part's Pose)
PARENT = {
    "LowerTorso": "HumanoidRootPart", "UpperTorso": "LowerTorso", "Head": "UpperTorso",
    "LeftUpperArm": "UpperTorso", "LeftLowerArm": "LeftUpperArm", "LeftHand": "LeftLowerArm",
    "RightUpperArm": "UpperTorso", "RightLowerArm": "RightUpperArm", "RightHand": "RightLowerArm",
    "LeftUpperLeg": "LowerTorso", "LeftLowerLeg": "LeftUpperLeg", "LeftFoot": "LeftLowerLeg",
    "RightUpperLeg": "LowerTorso", "RightLowerLeg": "RightUpperLeg", "RightFoot": "RightLowerLeg",
}
CLIPS = {  # file -> (Animations.Custom name, loops, priority token)
    "Player_Idle": ("PlayerIdle", True, 0), "Player_Walk": ("PlayerWalk", True, 1), "Player_Run": ("PlayerRun", True, 1),
    "Player_CarryIdle": ("PlayerCarryIdle", True, 2), "Player_CarryWalk": ("PlayerCarryWalk", True, 2),
    "Zombie_Idle": ("ZombieIdle", True, 2), "Zombie_Shamble": ("ZombieShamble", True, 2),
    "Zombie_Rise": ("ZombieRise", False, 2), "Zombie_Chop": ("ZombieChop", True, 2),
    "Zombie_Mine": ("ZombieMine", True, 2), "Zombie_Bonk": ("ZombieBonk", False, 2),
    "Player_Dig": ("PlayerDig", True, 2), "Player_Chop": ("PlayerChop", True, 2), "Player_Mine": ("PlayerMine", True, 2),
    "Player_PutDown": ("PlayerPutDown", False, 2), "Player_Craft": ("PlayerCraft", True, 2),
}
EASING_STYLE = {"Linear": 0, "Constant": 1, "Elastic": 2, "Cubic": 3, "Bounce": 4}
EASING_DIRECTION = {"In": 0, "Out": 1, "InOut": 2}


def pose_xml(name, kf, ref):
    entry = kf.get(name) or [[0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1], "Linear", "Out"]  # the root is sometimes omitted
    values, style, direction = entry[0], entry[1], entry[2]
    x, y, z, *r = values
    children = "".join(pose_xml(child, kf, ref) for child, parent in PARENT.items() if parent == name)
    ref[0] += 1
    cf = "".join(f"<{tag}>{v:.6g}</{tag}>" for tag, v in zip(
        ("X", "Y", "Z", "R00", "R01", "R02", "R10", "R11", "R12", "R20", "R21", "R22"), (x, y, z, *r)))
    # the root part has no joint driving it: Roblox ignores its pose, and the file holds the armature's own offset
    if name == "HumanoidRootPart":
        cf = "<X>0</X><Y>0</Y><Z>0</Z><R00>1</R00><R01>0</R01><R02>0</R02><R10>0</R10><R11>1</R11><R12>0</R12><R20>0</R20><R21>0</R21><R22>1</R22>"
    return (
        f'<Item class="Pose" referent="RBX{ref[0]}"><Properties><string name="Name">{escape(name)}</string>'
        f'<CoordinateFrame name="CFrame">{cf}</CoordinateFrame><float name="MaskWeight">0</float>'
        f'<token name="EasingDirection">{EASING_DIRECTION.get(direction, 1)}</token>'
        f'<token name="EasingStyle">{EASING_STYLE.get(style, 0)}</token><float name="Weight">1</float></Properties>{children}</Item>'
    )


def to_rbxmx(display, data, loop, priority):
    ref = [0]
    frames = []
    for i, keyframe in enumerate(data["kfs"]):
        ref[0] += 1
        root = pose_xml("HumanoidRootPart", keyframe["kf"], ref)
        frames.append(
            f'<Item class="Keyframe" referent="RBX{ref[0] + 100000}"><Properties><string name="Name">Keyframe</string>'
            f'<float name="Time">{keyframe["t"]:.6g}</float></Properties>{root}</Item>'
        )
    return (
        '<roblox version="4"><Item class="KeyframeSequence" referent="RBX0"><Properties>'
        f'<string name="Name">{escape(display)}</string><bool name="Loop">{"true" if loop else "false"}</bool>'
        f'<token name="Priority">{priority}</token><float name="AuthoredHipHeight">2</float></Properties>'
        + "".join(frames) + "</Item></roblox>"
    )


def convert():
    os.makedirs(OUT, exist_ok=True)
    for file, (name, loop, priority) in CLIPS.items():
        data = json.loads(zlib.decompress(open(os.path.join(EXPORT, file + ".rbxanim"), "rb").read()))
        xml = to_rbxmx(f"MHG_{file}", data, loop, priority)
        path = os.path.join(OUT, file + ".rbxmx")
        open(path, "w", encoding="utf-8", newline="\n").write(xml)
        poses = xml.count('class="Pose"')
        print(f"{file}: {len(data['kfs'])} keyframes, {poses} poses, {len(xml) // 1024} KB")


def upload(file):
    key = os.environ["ROBLOX_API_KEY"]
    user = int(os.environ["ROBLOX_USER_ID"])
    body = open(os.path.join(OUT, file + ".rbxmx"), "rb").read()
    boundary = uuid.uuid4().hex
    request_json = json.dumps({
        "assetType": "Animation", "displayName": f"MHG_{file}",
        "description": "My Haunted Graveyard animation (Blender)",
        "creationContext": {"creator": {"userId": str(user)}},
    })
    parts = (
        f'--{boundary}\r\nContent-Disposition: form-data; name="request"\r\nContent-Type: application/json\r\n\r\n{request_json}\r\n'
        f'--{boundary}\r\nContent-Disposition: form-data; name="fileContent"; filename="{file}.rbxmx"\r\n'
        f'Content-Type: model/x-rbxm\r\n\r\n'
    ).encode() + body + f"\r\n--{boundary}--\r\n".encode()
    req = urllib.request.Request("https://apis.roblox.com/assets/v1/assets", data=parts, method="POST", headers={
        "x-api-key": key, "Content-Type": f"multipart/form-data; boundary={boundary}"})
    operation = json.loads(urllib.request.urlopen(req, timeout=60).read())
    path = operation["path"]
    for _ in range(40):
        time.sleep(1.5)
        status = json.loads(urllib.request.urlopen(urllib.request.Request(
            f"https://apis.roblox.com/assets/v1/{path}", headers={"x-api-key": key}), timeout=30).read())
        if status.get("done"):
            if "response" in status:
                return int(status["response"]["assetId"])
            raise RuntimeError(f"{file}: {status.get('error')}")
    raise RuntimeError(f"{file}: timed out")


def publish():
    ids = json.load(open(IDS)) if os.path.exists(IDS) else {}
    for file in CLIPS:
        if file in ids:
            continue
        try:
            ids[file] = upload(file)
            print(file, ids[file])
        except Exception as error:  # report and keep going so one bad clip doesn't block the rest
            print(file, "FAILED", error)
        json.dump(ids, open(IDS, "w"), indent=1)


def patch_luau():
    ids = json.load(open(IDS))
    s = open(LUAU, encoding="utf-8").read()
    for file, (name, _, _) in CLIPS.items():
        if file in ids:
            s = re.sub(rf'({name} = {{ file = "{file}", id = )\d+', rf"\g<1>{ids[file]}", s)
    open(LUAU, "w", encoding="utf-8", newline="\n").write(s)
    print("patched", len(ids), "ids")


if __name__ == "__main__":
    {"convert": convert, "publish": publish, "luau": patch_luau}[sys.argv[1] if len(sys.argv) > 1 else "convert"]()
