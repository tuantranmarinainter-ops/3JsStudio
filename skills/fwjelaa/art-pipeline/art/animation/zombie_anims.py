"""Animation definitions for My Haunted Graveyard (R15 Motor6D rig, 30 fps, in place).

Run inside the persistent Blender session after rig_helpers.py. Conventions measured on this rig (facing +Y):
  pitch  > 0 swings a limb / leans the torso FORWARD         (local X rotation, negated)
  lat    > 0 moves a limb's end toward the character's RIGHT (local Z; sign flips for torso / head)
  twist  > 0 turns the part (local Y)
  loc    = (right, up, back) offsets of LowerTorso / HumanoidRootPart in studs
Each animation is a function pose(frame) -> {bone: dict}. Loops key N frames plus a duplicate seam key at N+1.
"""

import math

import bpy
from mathutils import Euler

TAU = math.tau
UPRIGHT = ("UpperTorso", "Head", "LowerTorso")  # bones that point up: their Z lateral sign is flipped
BONES = [
    "HumanoidRootPart", "LowerTorso", "UpperTorso", "Head",
    "LeftUpperArm", "LeftLowerArm", "LeftHand", "RightUpperArm", "RightLowerArm", "RightHand",
    "LeftUpperLeg", "LeftLowerLeg", "LeftFoot", "RightUpperLeg", "RightLowerLeg", "RightFoot",
]


TILTED = ("LeftUpperArm", "RightUpperArm")  # their rest axes are rolled ~35 degrees: pose them in world axes
_rest_cache = {}


def _rest_q(bone):
    if bone not in _rest_cache:
        _rest_cache[bone] = bpy.data.objects["__R15_Armature"].data.bones[bone].matrix_local.to_quaternion()
    return _rest_cache[bone]


def quat(pitch=0.0, lat=0.0, twist=0.0, flip_lat=False, bone=None):
    if bone in TILTED:
        # desired armature-space rotation: spread about world Y first, then swing forward about world X
        from mathutils import Quaternion

        Q = Quaternion((1, 0, 0), math.radians(pitch)) @ Quaternion((0, 1, 0), math.radians(-lat))
        r = _rest_q(bone)
        local = r.inverted() @ Q @ r
        return tuple(local @ Quaternion((0, 1, 0), math.radians(twist)))
    z = -lat if flip_lat else lat
    # ZYX = the sideways spread (Z) is applied first, then twist, then the forward swing (X)
    return tuple(Euler((math.radians(-pitch), math.radians(twist), math.radians(z)), "ZYX").to_quaternion())


def P(bone, pitch=0.0, lat=0.0, twist=0.0, loc=None):
    """One bone's pose entry in apply_pose() form (quaternion rotation + optional location).
    `_params` keeps the readable values so poses can be blended; build() strips it before keying."""
    entry = {"rotation_quaternion": quat(pitch, lat, twist, bone in UPRIGHT, bone), "_params": (pitch, lat, twist, loc)}
    if loc is not None:
        entry["location"] = tuple(loc)
    return entry


def lerp_pose(a, b, k):
    """Blend two full poses parameter-by-parameter (k = 0 -> a, 1 -> b)."""
    out = {}
    for bone in BONES:
        pa = a.get(bone, P(bone))["_params"]
        pb = b.get(bone, P(bone))["_params"]
        la = pa[3] or (0.0, 0.0, 0.0)
        lb = pb[3] or (0.0, 0.0, 0.0)
        loc = tuple(x + (y - x) * k for x, y in zip(la, lb)) if (pa[3] or pb[3]) else None
        out[bone] = P(bone, *(x + (y - x) * k for x, y in zip(pa[:3], pb[:3])), loc=loc)
    return out


SHORT = {
    "R": "HumanoidRootPart", "L": "LowerTorso", "T": "UpperTorso", "H": "Head",
    "LA": "LeftUpperArm", "LF": "LeftLowerArm", "LH": "LeftHand", "RA": "RightUpperArm", "RF": "RightLowerArm",
    "RH": "RightHand", "LU": "LeftUpperLeg", "LL": "LeftLowerLeg", "LT": "LeftFoot", "RU": "RightUpperLeg",
    "RL": "RightLowerLeg", "RT": "RightFoot",
}


def table_pose(keys):
    """keys: [(frame, {short: (pitch, lat, twist[, (x, y, z)])})]. Unlisted bones keep the previous key's value.
    Returns pose(frame) interpolating neighbouring keys with a smoothstep ease (keys are returned exactly)."""
    resolved = []
    state = {}
    for frame, spec in sorted(keys, key=lambda kv: kv[0]):
        for short, v in spec.items():
            state[SHORT[short]] = v
        resolved.append((frame, {b: state.get(b, (0, 0, 0)) for b in BONES}))

    def entry(bone, v):
        # hip position is always keyed (zero when a key doesn't move it) so loops close and curves never pop
        loc = v[3] if len(v) > 3 else (0.0, 0.0, 0.0)
        return P(bone, v[0], v[1], v[2], loc=loc if bone in ("LowerTorso", "HumanoidRootPart") else None)

    def pose(f):
        if f <= resolved[0][0]:
            return {b: entry(b, v) for b, v in resolved[0][1].items()}
        for (f0, a), (f1, b) in zip(resolved, resolved[1:]):
            if f0 <= f <= f1:
                k = smooth((f - f0) / max(1, f1 - f0))
                return lerp_pose({bn: entry(bn, v) for bn, v in a.items()}, {bn: entry(bn, v) for bn, v in b.items()}, k)
        return {b: entry(b, v) for b, v in resolved[-1][1].items()}

    return pose


def merge(*poses):
    out = {}
    for pose in poses:
        out.update(pose)
    return out


def full(pose):
    """Every bone keyed (identity where unspecified) so curves never interpolate through stale values."""
    out = {}
    for b in BONES:
        entry = dict(pose.get(b, P(b)))
        entry.pop("_params", None)
        out[b] = entry
    return out


def build(name, frames, pose, loop=True, key_frames=None, bezier=True):
    """Create/replace action `name` with keys at key_frames (default every 4th frame)."""
    import sys

    sys.path.insert(0, __import__("os").environ.get("ANIMATE_SKILL_SCRIPTS", "."))
    import animation_tools

    arm = bpy.data.objects["__R15_Armature"]
    old = bpy.data.actions.get(name)
    if old:
        if arm.animation_data and arm.animation_data.action == old:
            arm.animation_data.action = None
        bpy.data.actions.remove(old)
    key_frames = key_frames or list(range(1, frames + 1, 4))
    key_frames = sorted(set(key_frames))
    if loop:
        key_frames = [k for k in key_frames if k <= frames] + [frames + 1]
    results = []
    for k in key_frames:
        # a loop's seam key repeats frame 1's pose
        f = 1 if (loop and k == frames + 1) else k
        r = animation_tools.apply_pose({"frame": k, "bones": full(pose(f)), "interpolation": "CONSTANT", "action": name})
        # apply_pose() also reports ok=False only because its own review render is skipped (it cannot frame a
        # non-deform Motor6D rig); real failures show up in errors
        if r.get("errors"):
            return {"ok": False, "frame": k, "errors": r.get("errors")}
        results.append(k)
    bpy.context.scene.frame_start = 1
    bpy.context.scene.frame_end = frames + (1 if loop else 0)
    return {"ok": True, "action": name, "keys": results}


def polish(name):
    import sys

    sys.path.insert(0, __import__("os").environ.get("ANIMATE_SKILL_SCRIPTS", "."))
    import animation_tools

    return animation_tools.polish_curves("__R15_Armature", name)


def s(t, phase=0.0):
    return math.sin(TAU * t + phase)


def c(t, phase=0.0):
    return math.cos(TAU * t + phase)


def clamp01(x):
    return max(0.0, min(1.0, x))


def smooth(x):
    x = clamp01(x)
    return x * x * (3 - 2 * x)


# ---------------------------------------------------------------------------------------------------- player ---


def idle_player(frames=60):
    def pose(f):
        t = (f - 1) / frames
        breath = s(t)
        return {
            "LowerTorso": P("LowerTorso", pitch=0.4 * breath, loc=(0, 0.02 * breath, 0)),
            "UpperTorso": P("UpperTorso", pitch=-1.2 * s(t, 0.5) - 1.0, twist=1.2 * s(t, 1.0)),
            "Head": P("Head", pitch=1.0 + 1.4 * s(t, 1.2), lat=1.2 * s(t, 0.2), twist=2.0 * s(t, 2.0)),
            "LeftUpperArm": P("LeftUpperArm", pitch=2.0 + 2.2 * s(t, 0.7), lat=-3.0),
            "RightUpperArm": P("RightUpperArm", pitch=2.0 + 2.2 * s(t, 0.7 + 0.4), lat=3.0),
            "LeftLowerArm": P("LeftLowerArm", pitch=5.0 + 2.0 * s(t, 1.1)),
            "RightLowerArm": P("RightLowerArm", pitch=5.0 + 2.0 * s(t, 1.5)),
            "LeftHand": P("LeftHand", pitch=2.0 * s(t, 1.7)),
            "RightHand": P("RightHand", pitch=2.0 * s(t, 2.1)),
            "LeftUpperLeg": P("LeftUpperLeg", pitch=-1.0, lat=-1.0),
            "RightUpperLeg": P("RightUpperLeg", pitch=-0.5, lat=1.0),
            "LeftLowerLeg": P("LeftLowerLeg", pitch=1.5),
            "RightLowerLeg": P("RightLowerLeg", pitch=1.0),
        }

    return pose


def walk_cycle(frames, stride, knee, arm_swing, elbow, bob, lean, twist_amt, sway, hip_drop=0.0, carry=False, arm_up=0.0):
    """Generic locomotion cycle. Left leg contacts at frame 1; legs/arms are opposite."""

    def pose(f):
        t = (f - 1) / frames
        ph = lambda off=0.0: TAU * t + off
        # leg swing: forward on contact, back on push-off; knee flexes during the recovery (swing-through)
        def leg(side):
            a = ph(0.0 if side == "L" else math.pi)
            swing = stride * math.cos(a)  # +forward at contact (a = 0), back through the stance phase (0..pi)
            # the leg swings forward through the air for a in (pi, 2pi): that is when the knee folds
            flex = 8.0 + knee * max(0.0, -math.sin(a - 0.15 * math.pi)) ** 1.2
            foot = -0.5 * swing + 0.3 * flex
            return swing, flex, foot

        lsw, lfx, lft = leg("L")
        rsw, rfx, rft = leg("R")
        bounce = bob * math.cos(2 * ph(0.35))  # two bobs per cycle: highest mid-stance
        arm_l = -arm_swing * math.cos(ph(0.0))  # opposite to the same-side leg
        arm_r = -arm_swing * math.cos(ph(math.pi))
        pose_ = {
            "LowerTorso": P("LowerTorso", pitch=-lean * 0.5, lat=sway * math.cos(ph(0.0)) * 0.6,
                            twist=-twist_amt * 0.5 * math.cos(ph(0.0)),
                            loc=(sway * 0.05 * math.cos(ph(math.pi)), bounce - hip_drop, 0)),
            "UpperTorso": P("UpperTorso", pitch=-lean * 0.5 + 0.8 * math.cos(2 * ph(0.9)),
                            lat=-sway * 0.5 * math.cos(ph(0.0)), twist=twist_amt * math.cos(ph(0.0))),
            "Head": P("Head", pitch=lean * 0.6 - 0.5 * math.cos(2 * ph(0.9)), lat=sway * 0.25 * math.cos(ph(0.0)),
                      twist=-twist_amt * 0.5 * math.cos(ph(0.0))),
            "LeftUpperLeg": P("LeftUpperLeg", pitch=lsw, lat=-sway * 0.15),
            "RightUpperLeg": P("RightUpperLeg", pitch=rsw, lat=sway * 0.15),
            "LeftLowerLeg": P("LeftLowerLeg", pitch=lfx),
            "RightLowerLeg": P("RightLowerLeg", pitch=rfx),
            "LeftFoot": P("LeftFoot", pitch=lft),
            "RightFoot": P("RightFoot", pitch=rft),
        }
        if carry:
            up = arm_up + 2.0 * math.cos(2 * ph(0.9))
            pose_.update({
                "LeftUpperArm": P("LeftUpperArm", pitch=up, lat=-4.0),
                "RightUpperArm": P("RightUpperArm", pitch=up, lat=4.0),
                "LeftLowerArm": P("LeftLowerArm", pitch=elbow + 3.0 * math.cos(2 * ph(0.4))),
                "RightLowerArm": P("RightLowerArm", pitch=elbow + 3.0 * math.cos(2 * ph(0.4))),
                "LeftHand": P("LeftHand", pitch=-8.0),
                "RightHand": P("RightHand", pitch=-8.0),
            })
        else:
            pose_.update({
                "LeftUpperArm": P("LeftUpperArm", pitch=arm_l, lat=-3.0 - abs(arm_l) * 0.12),
                "RightUpperArm": P("RightUpperArm", pitch=arm_r, lat=3.0 + abs(arm_r) * 0.12),
                "LeftLowerArm": P("LeftLowerArm", pitch=elbow + 0.55 * max(0.0, arm_l)),
                "RightLowerArm": P("RightLowerArm", pitch=elbow + 0.55 * max(0.0, arm_r)),
                "LeftHand": P("LeftHand", pitch=-0.15 * arm_l),
                "RightHand": P("RightHand", pitch=-0.15 * arm_r),
            })
        return pose_

    return pose


def walk_player(frames=24):
    return walk_cycle(frames, stride=30, knee=48, arm_swing=26, elbow=14, bob=0.10, lean=4, twist_amt=7, sway=3)


def run_player(frames=18):
    return walk_cycle(frames, stride=52, knee=92, arm_swing=58, elbow=70, bob=0.22, lean=14, twist_amt=14, sway=4)


def carry_idle(frames=60):
    base = idle_player(frames)

    def pose(f):
        t = (f - 1) / frames
        p = base(f)
        p.update({
            # hands up over the head, as when carrying a body on the shoulders of the donkey road
            "LeftUpperArm": P("LeftUpperArm", pitch=158 + 2.0 * s(t, 0.3), lat=-8.0),
            "RightUpperArm": P("RightUpperArm", pitch=158 + 2.0 * s(t, 0.3), lat=8.0),
            "LeftLowerArm": P("LeftLowerArm", pitch=-6.0 + 2.5 * s(t, 1.0)),
            "RightLowerArm": P("RightLowerArm", pitch=-6.0 + 2.5 * s(t, 1.0)),
            "LeftHand": P("LeftHand", pitch=-10.0 + 2.0 * s(t, 1.4)),
            "RightHand": P("RightHand", pitch=-10.0 + 2.0 * s(t, 1.4)),
            "UpperTorso": P("UpperTorso", pitch=5.0 - 1.2 * s(t, 0.5), twist=0.8 * s(t, 1.0)),
            "Head": P("Head", pitch=-8.0 + 1.2 * s(t, 1.2), lat=0.8 * s(t, 0.2)),
        })
        return p

    return pose


def carry_walk(frames=28):
    return walk_cycle(frames, stride=22, knee=34, arm_swing=0, elbow=-6, bob=0.13, lean=-4, twist_amt=4, sway=4,
                      carry=True, arm_up=158)
