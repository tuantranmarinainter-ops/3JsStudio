"""Pack every exported mesh part into one FBX for Studio's File > Import 3D (one object per part, named
"<Asset>_<Part>"). Run in Blender:  blender -b --factory-startup -P art/tools/make_fbx.py
Only some assets, into another file:  ... -P art/tools/make_fbx.py -- MHG_Props_v2.fbx "Decor_*" "Fence_Silver*"

The .luau mesh files hold Roblox coordinates (Y up, front -Z), already centred. Blender's FBX exporter maps
Blender (x, y, z) to FBX (x, z, -y), so vertices are built as (x, -z, y) and the FBX ends up in Roblox coordinates.
"""

import fnmatch
import os
import re
import sys

import bpy

ART = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MESHES = os.path.join(ART, "out", "meshes")
ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
TARGET = os.path.join(ART, "out", ARGS[0] if ARGS else "MHG_Props.fbx")
PATTERNS = ARGS[1:] or ["*"]


def numbers(text):
    return [float(x) for x in text.split(",")] if text else []


def load(path):
    source = open(path, encoding="utf-8").read()
    fields = dict(re.findall(r'(\w) = "([^"]*)"', source))
    return numbers(fields["v"]), numbers(fields["n"]), numbers(fields["t"]), [int(i) for i in fields["f"].split(",")]


bpy.ops.wm.read_factory_settings(use_empty=True)
for file in sorted(os.listdir(MESHES)):
    if not file.endswith(".luau"):
        continue
    name = file[:-5]
    if not any(fnmatch.fnmatch(name, pattern) for pattern in PATTERNS):
        continue
    v, n, t, f = load(os.path.join(MESHES, file))
    verts = [(v[i], -v[i + 2], v[i + 1]) for i in range(0, len(v), 3)]
    faces = [tuple(f[i:i + 3]) for i in range(0, len(f), 3)]
    faces = [face for face in faces if len(set(face)) == 3]  # drop degenerate triangles (they crash Blender)
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.validate(clean_customdata=False)
    print(f"[fbx] {name}: {len(verts)} verts, {len(faces)} tris", flush=True)
    uv_layer = mesh.uv_layers.new(name="UVMap")
    normals = []
    for loop in mesh.loops:
        vi = loop.vertex_index
        uv_layer.data[loop.index].uv = (t[vi * 2], 1 - t[vi * 2 + 1])
        normals.append((n[vi * 3], -n[vi * 3 + 2], n[vi * 3 + 1]))
    mesh.normals_split_custom_set(normals)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)

bpy.ops.export_scene.fbx(filepath=TARGET, use_selection=False, object_types={"MESH"}, axis_forward="-Z",
                         axis_up="Y", apply_unit_scale=True, apply_scale_options="FBX_SCALE_ALL",
                         mesh_smooth_type="OFF", use_mesh_modifiers=False, path_mode="AUTO", embed_textures=False)
print(f"[fbx] wrote {TARGET} with {len(bpy.data.objects)} objects")
