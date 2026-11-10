"""Helpers run inside the persistent Blender session (loaded with exec) for the zombie animations.

The R15 rig is a Motor6D rig: bones are not deform bones, the meshes follow through CHILD_OF constraints, so the
skill's render_pose_views() can't compute bounds. render_views() below frames the driven meshes itself and keeps its
cameras and lights in the export-excluded 'Review' collection.
"""

import json
import math
import os

import bpy
from mathutils import Euler, Vector

ARM = "__R15_Armature"
OUT = os.path.join(os.path.dirname(os.path.abspath(bpy.data.filepath)), "review")
os.makedirs(OUT, exist_ok=True)
FPS = 30


def arm():
    return bpy.data.objects[ARM]


def meshes():
    return [o for o in bpy.data.objects if o.type == "MESH" and o.name.startswith("R15.model/")]


def review_collection():
    coll = bpy.data.collections.get("Review")
    if coll is None:
        coll = bpy.data.collections.new("Review")
        bpy.context.scene.collection.children.link(coll)
    return coll


def setup_review():
    """Cameras (front, side, three-quarter) and three lights; idempotent."""
    coll = review_collection()
    for o in list(coll.objects):
        bpy.data.objects.remove(o, do_unlink=True)
    centre = Vector((0, 0, 2.7)) * 0 + Vector((0, 0, 9.0))  # rig is ~18 units tall (1 unit = 0.28 stud x 3.5)
    specs = {
        # the character faces +Y (Roblox front after the importer's axis conversion)
        "Cam_Front": ((0, 42, 17.2), (0, 0, 17.2)),
        "Cam_Side": ((42, 0, 17.2), (0, 0, 17.2)),
        "Cam_ThreeQuarter": ((26, 30, 19.5), (0, 0, 17.2)),
    }
    for name, (loc, target) in specs.items():
        cam_data = bpy.data.cameras.new(name)
        cam_data.type = "ORTHO"
        cam_data.ortho_scale = 10.5
        cam = bpy.data.objects.new(name, cam_data)
        coll.objects.link(cam)
        cam.location = loc
        direction = Vector(target) - Vector(loc)
        cam.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    for name, energy, loc in (("Key", 4.0, (22, 26, 30)), ("Fill", 1.6, (-26, 18, 20)), ("Rim", 3.0, (4, -28, 28))):
        data = bpy.data.lights.new(name, "AREA")
        data.energy = energy * 1500
        data.size = 18
        light = bpy.data.objects.new(name, data)
        coll.objects.link(light)
        light.location = loc
        light.rotation_euler = (Vector((0, 0, 17)) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 520
    scene.render.resolution_y = 520
    scene.render.fps = FPS
    scene.render.image_settings.file_format = "PNG"
    world = scene.world or bpy.data.worlds.new("World")
    scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    if bg:
        bg.inputs[0].default_value = (0.17, 0.15, 0.22, 1)
        bg.inputs[1].default_value = 1.0
    cube = bpy.data.objects.get("Cube")
    if cube:
        cube.hide_render = True
        cube.hide_viewport = True


def render_view(cam_name, label, frame=None):
    scene = bpy.context.scene
    if frame is not None:
        scene.frame_set(frame)
    scene.camera = bpy.data.objects[cam_name]
    path = os.path.join(OUT, f"{label}_{cam_name.split('_')[1]}.png")
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    return path


def bone_world(name):
    a = arm()
    pb = a.pose.bones[name]
    return [round(v, 3) for v in (a.matrix_world @ pb.head)], [round(v, 3) for v in (a.matrix_world @ pb.tail)]


def key_pose(frame, bones, interp="CONSTANT", action=None):
    """bones: {name: {'rotation_degrees': (x, y, z), 'location': (x, y, z)}} through the skill's apply_pose()."""
    import sys

    sys.path.insert(0, __import__("os").environ.get("ANIMATE_SKILL_SCRIPTS", "."))
    import animation_tools

    payload = {"frame": frame, "bones": bones, "interpolation": interp}
    if action:
        payload["action"] = action
    return animation_tools.apply_pose(payload)
