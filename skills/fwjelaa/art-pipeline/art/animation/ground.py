"""Feet on the floor: keys LowerTorso height every frame so the lowest foot rests exactly on the floor.
Load after rig_helpers.py (needs arm() and meshes())."""

from mathutils import Vector

FEET = None


def lowest_foot():
    global FEET
    if FEET is None:
        FEET = [o for o in meshes() if o.name.endswith(("LeftFoot.MeshPart", "RightFoot.MeshPart"))]
    dg = bpy.context.evaluated_depsgraph_get()
    low = 1e9
    for o in FEET:
        ev = o.evaluated_get(dg)
        low = min(low, min((ev.matrix_world @ Vector(c)).z for c in ev.bound_box))
    return low


def floor_level():
    a = arm()
    a.animation_data_create()
    a.animation_data.action = None
    for pb in a.pose.bones:
        pb.rotation_quaternion = (1, 0, 0, 0)
        pb.location = (0, 0, 0)
    bpy.context.view_layer.update()
    return lowest_foot()


def _curves(action):
    import sys
    sys.path.insert(0, __import__("os").environ.get("ANIMATE_SKILL_SCRIPTS", "."))
    import animation_tools
    return animation_tools._action_fcurves(action)


def plant(name, end_frame, floor, seam=False):
    """Key LowerTorso height every frame so the lowest foot sits exactly on the floor."""
    a = arm()
    act = bpy.data.actions[name]
    a.animation_data.action = act
    pb = a.pose.bones["LowerTorso"]
    frames = list(range(1, end_frame + 1))
    lows, designed = {}, {}
    for f in frames:
        bpy.context.scene.frame_set(f)
        lows[f] = lowest_foot()
        designed[f] = pb.location[1]
    values = {f: designed[f] + (floor - lows[f]) for f in frames}
    for f in frames:
        bpy.context.scene.frame_set(f)
        pb.location[1] = values[f]
        pb.keyframe_insert("location", index=1, frame=f)
    if seam:
        bpy.context.scene.frame_set(1)
        pb.location[1] = values[1]
        pb.keyframe_insert("location", index=1, frame=end_frame + 1)
    for fc in _curves(act):
        if fc.data_path == 'pose.bones["LowerTorso"].location' and fc.array_index == 1:
            for kp in fc.keyframe_points:
                kp.interpolation = "BEZIER"
                kp.handle_left_type = kp.handle_right_type = "AUTO_CLAMPED"
            fc.update()
    worst = 0.0
    for f in frames:
        bpy.context.scene.frame_set(f)
        worst = max(worst, abs(lowest_foot() - floor))
    return round(worst, 4)
