"""My Haunted Graveyard art kit for Blender 5.x (run headless through build.py).

Units are studs (1 Blender unit = 1 stud). Blender is Z-up with the front facing -Y; export converts to Roblox
(Y-up, front facing -Z) with the rotation roblox = (-x, z, y), which keeps triangle winding counter-clockwise.

Every asset is a list of parts. A textured part gets its own baked 'hand-painted' colour texture (procedural paint
+ ambient occlusion + worn edge highlights + vertical gradient). Glow/glass parts stay untextured and become
Neon/Glass MeshParts in Roblox.
"""

import json
import math
import os
import random

import bpy
import bmesh
from mathutils import Matrix, Vector, noise

ART = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_MESH = os.path.join(ART, "out", "meshes")
OUT_TEX = os.path.join(ART, "out", "textures")
OUT_PREVIEW = os.path.join(ART, "previews")
OUT_ICON_RAW = os.path.join(ART, "out", "icons", "raw")
MANIFEST = os.path.join(ART, "out", "manifest.json")

for folder in (OUT_MESH, OUT_TEX, OUT_PREVIEW, OUT_ICON_RAW):
    os.makedirs(folder, exist_ok=True)


# ---------------------------------------------------------------- colour

def srgb(hex_code):
    """'#RRGGBB' -> linear RGBA for shader nodes."""
    hex_code = hex_code.lstrip("#")
    out = []
    for i in (0, 2, 4):
        c = int(hex_code[i:i + 2], 16) / 255
        out.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    return (out[0], out[1], out[2], 1.0)


def rgb255(hex_code):
    hex_code = hex_code.lstrip("#")
    return [int(hex_code[i:i + 2], 16) for i in (0, 2, 4)]


# dark, mid, light (+ optional accent) per paint. One palette for the whole game keeps it cohesive.
PALETTE = {
    "wood": ("#3A2516", "#6B4529", "#A2714A"),
    "oldwood": ("#2E241E", "#5A4A3E", "#8C7A68"),
    "stone": ("#4A4A50", "#7E7E86", "#B4B3B8"),
    "darkstone": ("#34343A", "#56565E", "#86868E"),
    "marble": ("#9A958C", "#D9D3C8", "#F5F1E9"),
    "iron": ("#16151A", "#2C2A32", "#5A5664"),
    "pumpkin": ("#97380C", "#E06A18", "#FFAE45"),
    "stem": ("#2E3B19", "#56692C", "#8C9E4E"),
    "dirt": ("#24180F", "#4C3423", "#7A573C"),
    "rope": ("#5C4A2E", "#937A50", "#C7AE7A"),
    "cloth": ("#6F675A", "#B4A98F", "#E2D8BE"),
    "leaf": ("#241A33", "#45325F", "#76589C"),
    "bark": ("#1F1712", "#3F3026", "#6B5544"),
    "ore": ("#5A2A12", "#B2561E", "#F09848"),
    "bone": ("#8C8270", "#D6CDB6", "#FBF6E6"),
    "brass": ("#5C3D12", "#A87A2C", "#F2C86A"),
    "fur": ("#4A423D", "#7E7269", "#B0A498"),
    "darkfur": ("#231E1B", "#3F3733", "#635853"),
    "cream": ("#9C8F7C", "#D6CAB4", "#F5ECDD"),
    "wax": ("#B8A98A", "#E8DFC8", "#FFF8E8"),
    "paper": ("#A89A7A", "#DCCFAE", "#F4EBD2"),
    "leather": ("#2E1A10", "#5A3420", "#8A5634"),
    "redcloth": ("#4A1414", "#8A2A22", "#C2503A"),
    "slate": ("#1E1C24", "#2E2B36", "#47434F"),
    "straw": ("#7A5E22", "#C2A04A", "#EED68A"),
    "zombie": ("#2E4A28", "#6E9A52", "#B4D894"),
}
MOSS = ("#2F4A22", "#5F8034")
RUST = "#7A4428"


# ---------------------------------------------------------------- scene

def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.unit_settings.system = "NONE"
    scene.render.engine = "CYCLES"
    _use_gpu(scene)
    return scene


def _use_gpu(scene):
    prefs = bpy.context.preferences
    cycles = prefs.addons["cycles"].preferences
    for device_type in ("OPTIX", "CUDA"):
        try:
            cycles.compute_device_type = device_type
            cycles.get_devices()
            gpus = [d for d in cycles.devices if d.type == device_type]
            if gpus:
                for d in cycles.devices:
                    d.use = d.type == device_type
                scene.cycles.device = "GPU"
                return
        except TypeError:
            continue
    scene.cycles.device = "CPU"


def _activate(obj):
    bpy.context.view_layer.update()  # deleted objects linger as None until the view layer refreshes
    for other in bpy.context.view_layer.objects:
        if other is not None:
            other.select_set(False)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)


def _apply_modifiers(obj):
    _activate(obj)
    for mod in list(obj.modifiers):
        bpy.ops.object.modifier_apply(modifier=mod.name)


def _apply_transform(obj, location=False):
    _activate(obj)
    bpy.ops.object.transform_apply(location=location, rotation=True, scale=True)


def _finish(obj, name, loc, rot, bevel, seg, mat):
    obj.name = name
    obj.location = loc
    obj.rotation_euler = [math.radians(a) for a in rot]
    _apply_transform(obj, location=True)
    if bevel:
        mod = obj.modifiers.new("bevel", "BEVEL")
        mod.width = bevel
        mod.segments = seg
        mod.limit_method = "ANGLE"
        mod.angle_limit = math.radians(35)
        mod.harden_normals = False
        _apply_modifiers(obj)
    if mat:
        assign(obj, mat)
    return obj


# ---------------------------------------------------------------- primitives (all applied immediately)

def box(size, loc=(0, 0, 0), rot=(0, 0, 0), bevel=0.05, seg=2, mat=None, name="box", cuts=0):
    bpy.ops.mesh.primitive_cube_add(size=1)
    obj = bpy.context.active_object
    obj.scale = size
    _apply_transform(obj)
    if cuts:
        subdivide(obj, cuts)
    return _finish(obj, name, loc, rot, bevel, seg, mat)


def cyl(radius, depth, loc=(0, 0, 0), rot=(0, 0, 0), verts=12, bevel=0.04, seg=2, mat=None, name="cyl", r2=None):
    if r2 is None:
        bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=radius, depth=depth)
    else:
        bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=radius, radius2=r2, depth=depth)
    return _finish(bpy.context.active_object, name, loc, rot, bevel, seg, mat)


def ball(radius, loc=(0, 0, 0), rot=(0, 0, 0), scale=(1, 1, 1), segs=16, rings=10, mat=None, name="ball"):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segs, ring_count=rings, radius=radius)
    obj = bpy.context.active_object
    obj.scale = scale
    _apply_transform(obj)
    return _finish(obj, name, loc, rot, 0, 0, mat)


def ico(radius, loc=(0, 0, 0), rot=(0, 0, 0), scale=(1, 1, 1), level=2, mat=None, name="ico"):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=level, radius=radius)
    obj = bpy.context.active_object
    obj.scale = scale
    _apply_transform(obj)
    return _finish(obj, name, loc, rot, 0, 0, mat)


def torus(major, minor, loc=(0, 0, 0), rot=(0, 0, 0), seg=16, minor_seg=6, mat=None, name="torus"):
    bpy.ops.mesh.primitive_torus_add(major_radius=major, minor_radius=minor, major_segments=seg,
                                     minor_segments=minor_seg)
    return _finish(bpy.context.active_object, name, loc, rot, 0, 0, mat)


def from_profile(points, depth, loc=(0, 0, 0), rot=(0, 0, 0), bevel=0.05, seg=2, mat=None, name="profile"):
    """Extrude a closed 2D outline (x, z pairs in the XZ plane) along Y, centred on y=0."""
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    verts = [bm.verts.new((x, -depth / 2, z)) for x, z in points]
    face = bm.faces.new(verts)
    result = bmesh.ops.extrude_face_region(bm, geom=[face])
    moved = [e for e in result["geom"] if isinstance(e, bmesh.types.BMVert)]
    bmesh.ops.translate(bm, verts=moved, vec=(0, depth, 0))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    return _finish(obj, name, loc, rot, bevel, seg, mat)


def arch_points(width, height, segments=10):
    """Tombstone outline: straight sides with a round top."""
    r = width / 2
    pts = [(-r, 0), (r, 0), (r, height - r)]
    for i in range(1, segments):
        a = math.pi * i / segments
        pts.append((r * math.cos(a), height - r + r * math.sin(a)))
    pts.append((-r, height - r))
    return pts


def tube(points, radius, verts=8, mat=None, name="tube", taper=1.0):
    """A bent branch/rail along a polyline using a curve with bevel, converted to mesh."""
    curve = bpy.data.curves.new(name, "CURVE")
    curve.dimensions = "3D"
    curve.bevel_depth = radius
    curve.bevel_resolution = max(1, verts // 4)
    curve.use_fill_caps = True
    spline = curve.splines.new("POLY")
    spline.points.add(len(points) - 1)
    for i, p in enumerate(points):
        spline.points[i].co = (p[0], p[1], p[2], 1)
        spline.points[i].radius = 1 + (taper - 1) * i / max(1, len(points) - 1)
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    _activate(obj)
    bpy.ops.object.convert(target="MESH")
    obj = bpy.context.active_object
    if mat:
        assign(obj, mat)
    return obj


# ---------------------------------------------------------------- shaping

def subdivide(obj, cuts=1):
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bmesh.ops.subdivide_edges(bm, edges=bm.edges[:], cuts=cuts, use_grid_fill=True)
    bm.to_mesh(obj.data)
    bm.free()
    return obj


def wobble(obj, strength=0.05, scale=1.5, seed=0):
    """Hand-made irregularity: push vertices by smooth 3D noise so nothing is perfectly straight."""
    offset = Vector((seed * 13.1, seed * 7.7, seed * 3.3))
    for v in obj.data.vertices:
        world = obj.matrix_world @ v.co
        v.co += noise.noise_vector(world * scale + offset) * strength
    obj.data.update()
    return obj


def taper(obj, top=0.85, axis_min=None, axis_max=None):
    """Scale X/Y linearly along Z, from 1 at the bottom to `top` at the top."""
    zs = [v.co.z for v in obj.data.vertices]
    lo = min(zs) if axis_min is None else axis_min
    hi = max(zs) if axis_max is None else axis_max
    for v in obj.data.vertices:
        t = 0 if hi == lo else (v.co.z - lo) / (hi - lo)
        s = 1 + (top - 1) * t
        v.co.x *= s
        v.co.y *= s
    obj.data.update()
    return obj


def lean(obj, degrees_x=0, degrees_y=0, pivot=(0, 0, 0)):
    """Rotate around a ground pivot (gravestones that have settled crooked)."""
    p = Vector(pivot)
    m = (Matrix.Translation(p) @ Matrix.Rotation(math.radians(degrees_x), 4, "X")
         @ Matrix.Rotation(math.radians(degrees_y), 4, "Y") @ Matrix.Translation(-p))
    obj.data.transform(m)
    obj.data.update()
    return obj


def chip(obj, count=4, size=0.25, seed=1):
    """Knock small chunks off the outer edges, centred on real surface vertices so every cut bites."""
    rng = random.Random(seed)
    center = sum((v.co for v in obj.data.vertices), Vector()) / max(1, len(obj.data.vertices))
    # prefer vertices far from the centre (corners and rims), skip the buried bottom
    candidates = sorted((v.co.copy() for v in obj.data.vertices if v.co.z > 0.15),
                        key=lambda co: (co - center).length, reverse=True)[:max(8, len(obj.data.vertices) // 6)]
    for _ in range(count):
        if not candidates:
            break
        c = rng.choice(candidates)
        cutter = box((size, size, size), loc=c, rot=(rng.uniform(0, 90), rng.uniform(0, 90), rng.uniform(0, 90)),
                     bevel=0, name="chip")
        cut(obj, cutter)
    return obj


def cut(obj, cutter, keep_cutter=False):
    if obj.data.materials and obj.data.materials[0] is not None:
        assign(cutter, obj.data.materials[0])  # otherwise the boolean appends an empty material slot
    mod = obj.modifiers.new("cut", "BOOLEAN")
    mod.operation = "DIFFERENCE"
    mod.object = cutter
    mod.solver = "EXACT"
    mod.use_hole_tolerant = True
    mod.use_self = True
    _apply_modifiers(obj)
    if not keep_cutter:
        bpy.data.objects.remove(cutter, do_unlink=True)
    return obj


def cut_below(obj, z=0.0):
    """Slice the mesh flat at height z and cap it, so props sit on the ground without hidden geometry."""
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    geom = bm.verts[:] + bm.edges[:] + bm.faces[:]
    result = bmesh.ops.bisect_plane(bm, geom=geom, plane_co=(0, 0, z), plane_no=(0, 0, 1), clear_inner=True)
    cut_edges = [e for e in result["geom_cut"] if isinstance(e, bmesh.types.BMEdge)]
    if cut_edges:
        bmesh.ops.holes_fill(bm, edges=cut_edges, sides=0)
    bm.to_mesh(obj.data)
    bm.free()
    obj.data.update()
    return obj


def radial(obj, lobes, depth, center=(0, 0)):
    """Pumpkin ribs / robe folds: scale each vertex's distance from the Z axis by a cosine of its angle."""
    cx, cy = center
    for v in obj.data.vertices:
        dx, dy = v.co.x - cx, v.co.y - cy
        theta = math.atan2(dy, dx)
        k = 1 - depth * (1 - math.cos(lobes * theta)) / 2
        v.co.x = cx + dx * k
        v.co.y = cy + dy * k
    obj.data.update()
    return obj


def text(body, size, depth, loc, rot=(90, 0, 0)):
    """Mesh lettering (for carving into gravestones with cut())."""
    curve = bpy.data.curves.new("text", "FONT")
    curve.body = body
    curve.size = size
    curve.extrude = depth
    curve.align_x = "CENTER"
    curve.align_y = "CENTER"
    obj = bpy.data.objects.new("text", curve)
    bpy.context.collection.objects.link(obj)
    obj.location = loc
    obj.rotation_euler = [math.radians(a) for a in rot]
    _activate(obj)
    bpy.ops.object.convert(target="MESH")
    obj = bpy.context.active_object
    _apply_transform(obj, location=True)
    return obj


def join(objs, name):
    objs = [o for o in objs if o is not None]
    _activate(objs[0])
    for o in objs[1:]:
        o.select_set(True)
    bpy.ops.object.join()
    obj = bpy.context.active_object
    obj.name = name
    return obj


def mirror_x(obj):
    copy = obj.copy()
    copy.data = obj.data.copy()
    bpy.context.collection.objects.link(copy)
    copy.data.transform(Matrix.Scale(-1, 4, (1, 0, 0)))
    copy.data.flip_normals()
    copy.data.update()
    return copy


def duplicate(obj, loc_offset=(0, 0, 0), rot_z=0):
    copy = obj.copy()
    copy.data = obj.data.copy()
    bpy.context.collection.objects.link(copy)
    copy.data.transform(Matrix.Translation(Vector(loc_offset)) @ Matrix.Rotation(math.radians(rot_z), 4, "Z"))
    copy.data.update()
    return copy


# ---------------------------------------------------------------- paint (procedural, baked to texture)

_materials = {}


def assign(obj, mat):
    if obj.data.materials:
        obj.data.materials[0] = mat
    else:
        obj.data.materials.append(mat)
    for poly in obj.data.polygons:
        poly.material_index = 0


def paint(kind, grain="Z", moss=0.0, rust=0.0, scale=1.0, tint=None, speckle=0.0):
    """A hand-painted look material. `grain` sets wood streak direction (X, Y or Z)."""
    key = (kind, grain, moss, rust, scale, tint, speckle)
    if key in _materials:
        return _materials[key]
    dark, mid, light = PALETTE[kind]
    if tint:
        dark, mid, light = tint
    mat = bpy.data.materials.new(f"{kind}_{len(_materials)}")
    mat.use_nodes = True
    nt = mat.node_tree
    nodes, links = nt.nodes, nt.links
    nodes.clear()

    def node(kind_name, x, y, **props):
        n = nodes.new(kind_name)
        n.location = (x, y)
        for k, v in props.items():
            setattr(n, k, v)
        return n

    def ramp(x, y, stops):
        r = node("ShaderNodeValToRGB", x, y)
        elems = r.color_ramp.elements
        while len(elems) > 2:
            elems.remove(elems[-1])
        for i, (pos, col) in enumerate(stops):
            if i < 2:
                elems[i].position = pos
                elems[i].color = col
            else:
                e = elems.new(pos)
                e.color = col
        return r

    def mix(x, y, blend, a, b, factor=1.0):
        """Colour mix by socket identifier (Mix has same-named float/vector/colour sockets)."""
        m = node("ShaderNodeMix", x, y, data_type="RGBA", blend_type=blend)
        ins = {s.identifier: s for s in m.inputs}
        if isinstance(factor, (int, float)):
            ins["Factor_Float"].default_value = factor
        else:
            links.new(factor, ins["Factor_Float"])
        for key, value in (("A_Color", a), ("B_Color", b)):
            if isinstance(value, tuple):
                ins[key].default_value = value
            else:
                links.new(value, ins[key])
        return next(s for s in m.outputs if s.identifier == "Result_Color")

    coords = node("ShaderNodeTexCoord", -1400, 0)
    mapping = node("ShaderNodeMapping", -1200, 0)
    stretch = {"X": (0.15, 1, 1), "Y": (1, 0.15, 1), "Z": (1, 1, 0.15)}[grain] if kind in (
        "wood", "oldwood", "bark") else (1, 1, 1)
    mapping.inputs["Scale"].default_value = [s * scale for s in stretch]
    links.new(coords.outputs["Object"], mapping.inputs["Vector"])

    # large colour variation
    big = node("ShaderNodeTexNoise", -1000, 200)
    big.inputs["Scale"].default_value = 2.2
    big.inputs["Detail"].default_value = 3
    links.new(mapping.outputs["Vector"], big.inputs["Vector"])
    base_ramp = ramp(-800, 200, [(0.25, srgb(dark)), (0.5, srgb(mid)), (0.78, srgb(light))])
    links.new(big.outputs["Fac"], base_ramp.inputs["Fac"])
    color = base_ramp.outputs["Color"]

    # detail layer per material type
    if kind in ("wood", "oldwood", "bark"):
        wave = node("ShaderNodeTexWave", -1000, -100)
        wave.wave_type = "BANDS"
        wave.bands_direction = "X"
        wave.inputs["Scale"].default_value = 3.0
        wave.inputs["Distortion"].default_value = 6.0
        wave.inputs["Detail"].default_value = 3.0
        links.new(mapping.outputs["Vector"], wave.inputs["Vector"])
        grain_ramp = ramp(-800, -100, [(0.0, (0.62, 0.62, 0.62, 1)), (0.55, (1, 1, 1, 1))])
        links.new(wave.outputs["Fac"], grain_ramp.inputs["Fac"])
        color = mix(-560, 100, "MULTIPLY", color, grain_ramp.outputs["Color"], 0.85)
    elif kind in ("stone", "darkstone", "marble"):
        vor = node("ShaderNodeTexVoronoi", -1000, -100)
        vor.feature = "DISTANCE_TO_EDGE"
        vor.inputs["Scale"].default_value = 1.6 * scale
        links.new(mapping.outputs["Vector"], vor.inputs["Vector"])
        crack = ramp(-800, -100, [(0.0, (0.0, 0.0, 0.0, 1)), (0.025, (1, 1, 1, 1))])
        links.new(vor.outputs["Distance"], crack.inputs["Fac"])
        sparse = node("ShaderNodeTexNoise", -1000, -200)
        sparse.inputs["Scale"].default_value = 2.5
        links.new(mapping.outputs["Vector"], sparse.inputs["Vector"])
        keep = ramp(-800, -200, [(0.5, (1, 1, 1, 1)), (0.58, (0, 0, 0, 1))])
        links.new(sparse.outputs["Fac"], keep.inputs["Fac"])
        lines = node("ShaderNodeMix", -650, -150, data_type="RGBA", blend_type="ADD")
        lines_in = {s.identifier: s for s in lines.inputs}
        lines_in["Factor_Float"].default_value = 1.0
        links.new(crack.outputs["Color"], lines_in["A_Color"])
        links.new(keep.outputs["Color"], lines_in["B_Color"])
        lines_out = next(s for s in lines.outputs if s.identifier == "Result_Color")
        darken = ramp(-560, -150, [(0.0, (0.55, 0.55, 0.58, 1)), (1.0, (1, 1, 1, 1))])
        links.new(lines_out, darken.inputs["Fac"])
        color = mix(-560, 100, "MULTIPLY", color, darken.outputs["Color"], 0.8 if kind != "marble" else 0.3)
    if speckle or kind in ("stone", "dirt", "darkstone"):
        fine = node("ShaderNodeTexNoise", -1000, -300)
        fine.inputs["Scale"].default_value = 28
        fine.inputs["Detail"].default_value = 2
        links.new(mapping.outputs["Vector"], fine.inputs["Vector"])
        sp = ramp(-800, -300, [(0.38, (0.8, 0.8, 0.8, 1)), (0.5, (1, 1, 1, 1)), (0.64, (1.12, 1.12, 1.12, 1))])
        links.new(fine.outputs["Fac"], sp.inputs["Fac"])
        color = mix(-420, 0, "MULTIPLY", color, sp.outputs["Color"], 0.7)

    geometry = node("ShaderNodeNewGeometry", -1000, -500)

    if moss > 0:
        sep = node("ShaderNodeSeparateXYZ", -800, -500)
        links.new(geometry.outputs["Normal"], sep.inputs["Vector"])
        mnoise = node("ShaderNodeTexNoise", -800, -650)
        mnoise.inputs["Scale"].default_value = 5
        links.new(mapping.outputs["Vector"], mnoise.inputs["Vector"])
        up = node("ShaderNodeMath", -600, -500, operation="MULTIPLY")
        links.new(sep.outputs["Z"], up.inputs[0])
        links.new(mnoise.outputs["Fac"], up.inputs[1])
        mask = ramp(-420, -500, [(0.42 - moss * 0.12, (0, 0, 0, 1)), (0.5 - moss * 0.1, (1, 1, 1, 1))])
        links.new(up.outputs["Value"], mask.inputs["Fac"])
        moss_col = ramp(-420, -700, [(0.3, srgb(MOSS[0])), (0.7, srgb(MOSS[1]))])
        links.new(mnoise.outputs["Fac"], moss_col.inputs["Fac"])
        color = mix(-240, -100, "MIX", color, moss_col.outputs["Color"], mask.outputs["Color"])

    if rust > 0:
        rnoise = node("ShaderNodeTexNoise", -800, -850)
        rnoise.inputs["Scale"].default_value = 6
        rnoise.inputs["Detail"].default_value = 6
        links.new(mapping.outputs["Vector"], rnoise.inputs["Vector"])
        rmask = ramp(-600, -850, [(0.62 - rust * 0.15, (0, 0, 0, 1)), (0.7 - rust * 0.1, (1, 1, 1, 1))])
        links.new(rnoise.outputs["Fac"], rmask.inputs["Fac"])
        color = mix(-240, -250, "MIX", color, srgb(RUST), rmask.outputs["Color"])

    # vertical gradient: darker at the ground, as if lit from above
    sep_pos = node("ShaderNodeSeparateXYZ", -800, 500)
    links.new(coords.outputs["Object"], sep_pos.inputs["Vector"])
    grad = node("ShaderNodeMapRange", -600, 500)
    grad.inputs["From Min"].default_value = 0.0
    grad.inputs["From Max"].default_value = 3.0
    grad.inputs["To Min"].default_value = 0.72
    grad.inputs["To Max"].default_value = 1.08
    links.new(sep_pos.outputs["Z"], grad.inputs["Value"])
    gcol = node("ShaderNodeCombineColor", -400, 500)
    for ch in ("Red", "Green", "Blue"):
        links.new(grad.outputs["Result"], gcol.inputs[ch])
    color = mix(-100, 300, "MULTIPLY", color, gcol.outputs["Color"])

    # worn edges: where a bevelled normal differs from the true normal, lighten
    bevel = node("ShaderNodeBevel", -600, 800)
    bevel.inputs["Radius"].default_value = 0.06
    bevel.samples = 8
    dot = node("ShaderNodeVectorMath", -400, 800, operation="DOT_PRODUCT")
    links.new(bevel.outputs["Normal"], dot.inputs[0])
    links.new(geometry.outputs["Normal"], dot.inputs[1])
    edge = node("ShaderNodeMapRange", -200, 800)
    edge.inputs["From Min"].default_value = 0.985
    edge.inputs["From Max"].default_value = 0.9
    links.new(dot.outputs["Value"], edge.inputs["Value"])
    color = mix(100, 400, "SCREEN", color, srgb(light), edge.outputs["Result"])

    # ambient occlusion: crevices and contact shadows painted in
    ao = node("ShaderNodeAmbientOcclusion", 100, 700)
    ao.samples = 24
    ao.inputs["Distance"].default_value = 0.6
    aoramp = ramp(300, 700, [(0.0, (0.38, 0.34, 0.42, 1)), (1.0, (1, 1, 1, 1))])
    links.new(ao.outputs["AO"], aoramp.inputs["Fac"])
    color = mix(500, 400, "MULTIPLY", color, aoramp.outputs["Color"])

    emit = node("ShaderNodeEmission", 750, 300)
    links.new(color, emit.inputs["Color"])
    out = node("ShaderNodeOutputMaterial", 950, 300)
    links.new(emit.outputs["Emission"], out.inputs["Surface"])
    _materials[key] = mat
    return mat


def solid(hex_code, kind="Neon", transparency=0.0):
    """Marker for an untextured Roblox part (Neon glow, Glass)."""
    mat = bpy.data.materials.new(f"solid_{kind}_{hex_code}")
    mat["rbx_material"] = kind
    mat["rbx_color"] = hex_code
    mat["rbx_transparency"] = transparency
    mat.use_nodes = True
    emit = mat.node_tree.nodes.new("ShaderNodeEmission")
    emit.inputs["Color"].default_value = srgb(hex_code)
    emit.inputs["Strength"].default_value = 4.0 if kind == "Neon" else 1.0
    out = mat.node_tree.nodes.get("Material Output") or mat.node_tree.nodes.new("ShaderNodeOutputMaterial")
    for n in list(mat.node_tree.nodes):
        if n.type == "BSDF_PRINCIPLED":
            mat.node_tree.nodes.remove(n)
    mat.node_tree.links.new(emit.outputs["Emission"], out.inputs["Surface"])
    return mat


# ---------------------------------------------------------------- bake + export

def _clean_materials(obj):
    """Drop empty or duplicate material slots, remapping every face in one pass."""
    mats = list(obj.data.materials)
    unique = []
    for mat in mats:
        if mat is not None and mat not in unique:
            unique.append(mat)
    if not unique:
        return
    remap = [unique.index(mat) if mat is not None else 0 for mat in mats]
    indices = [remap[p.material_index] if p.material_index < len(mats) else 0 for p in obj.data.polygons]
    obj.data.materials.clear()
    for mat in unique:
        obj.data.materials.append(mat)
    for poly, index in zip(obj.data.polygons, indices):
        poly.material_index = index


def smooth(obj, angle=40):
    obj.data.shade_smooth()
    obj.data.set_sharp_from_angle(angle=math.radians(angle))
    return obj


def _unwrap(obj):
    _activate(obj)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.smart_project(angle_limit=math.radians(60), island_margin=0.02, area_weight=0.0,
                             scale_to_bounds=False)
    bpy.ops.object.mode_set(mode="OBJECT")


def _bake(obj, asset, part, size):
    image = bpy.data.images.new(f"{asset}_{part}", width=size, height=size, alpha=False)
    image.colorspace_settings.name = "sRGB"
    for mat in obj.data.materials:
        nt = mat.node_tree
        tex = nt.nodes.new("ShaderNodeTexImage")
        tex.image = image
        nt.nodes.active = tex
    scene = bpy.context.scene
    scene.cycles.samples = 48
    scene.render.bake.margin = 6
    scene.render.bake.use_clear = True
    _activate(obj)
    bpy.ops.object.bake(type="EMIT")
    path = os.path.join(OUT_TEX, f"{asset}_{part}.png")
    image.filepath_raw = path
    image.file_format = "PNG"
    image.save()
    return image, path


def _to_roblox(v):
    return Vector((-v.x, v.z, v.y))


def _export_mesh(obj, asset, part):
    deps = bpy.context.evaluated_depsgraph_get()
    evaluated = obj.evaluated_get(deps)
    mesh = evaluated.to_mesh()
    mesh.calc_loop_triangles()
    uv_data = mesh.uv_layers.active.data if mesh.uv_layers.active else None
    normals = mesh.corner_normals
    world = obj.matrix_world
    normal_matrix = world.to_3x3().inverted().transposed()

    index_of, positions, norms, uvs, faces = {}, [], [], [], []
    for tri in mesh.loop_triangles:
        corner = []
        for loop_index in tri.loops:
            vi = mesh.loops[loop_index].vertex_index
            p = _to_roblox(world @ mesh.vertices[vi].co)
            n = _to_roblox((normal_matrix @ normals[loop_index].vector).normalized())
            uv = uv_data[loop_index].uv if uv_data else Vector((0, 0))
            key = (round(p.x, 4), round(p.y, 4), round(p.z, 4), round(n.x, 3), round(n.y, 3), round(n.z, 3),
                   round(uv.x, 4), round(uv.y, 4))
            if key not in index_of:
                index_of[key] = len(positions)
                positions.append(p)
                norms.append(n)
                uvs.append((uv.x, 1 - uv.y))
            corner.append(index_of[key])
        faces.append(corner)
    evaluated.to_mesh_clear()

    lo = Vector((min(p.x for p in positions), min(p.y for p in positions), min(p.z for p in positions)))
    hi = Vector((max(p.x for p in positions), max(p.y for p in positions), max(p.z for p in positions)))
    center = (lo + hi) / 2
    size = hi - lo

    def fmt(x):
        s = f"{x:.4f}".rstrip("0").rstrip(".")
        return "0" if s in ("-0", "") else s

    v = ",".join(fmt(c) for p in positions for c in (p - center))
    n = ",".join(fmt(c) for q in norms for c in q)
    t = ",".join(fmt(c) for uv in uvs for c in uv)
    f = ",".join(str(i) for tri in faces for i in tri)
    name = f"{asset}_{part}"
    with open(os.path.join(OUT_MESH, f"{name}.luau"), "w", encoding="utf-8", newline="\n") as fh:
        fh.write(f'-- Generated by art/blender/build.py. Do not edit.\nreturn {{\n\tv = "{v}",\n\tn = "{n}",\n'
                 f'\tt = "{t}",\n\tf = "{f}",\n}}\n')
    return {
        "mesh": name,
        "size": [round(size.x, 4), round(size.y, 4), round(size.z, 4)],
        "offset": [round(center.x, 4), round(center.y, 4), round(center.z, 4)],
        "tris": len(faces),
        "verts": len(positions),
    }


# ---------------------------------------------------------------- preview render

def _preview_material(image):
    mat = bpy.data.materials.new("preview")
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = nt.nodes.get("Principled BSDF")
    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.image = image
    nt.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    bsdf.inputs["Roughness"].default_value = 0.85
    return mat


def _render_preview(asset, objects, icon=False):
    scene = bpy.context.scene
    lo = Vector((1e9, 1e9, 1e9))
    hi = Vector((-1e9, -1e9, -1e9))
    for obj in objects:
        for c in obj.bound_box:
            w = obj.matrix_world @ Vector(c)
            lo = Vector((min(lo.x, w.x), min(lo.y, w.y), min(lo.z, w.z)))
            hi = Vector((max(hi.x, w.x), max(hi.y, w.y), max(hi.z, w.z)))
    center = (lo + hi) / 2
    radius = (hi - lo).length / 2

    world = bpy.data.worlds.new("night")
    world.use_nodes = True
    bg = world.node_tree.nodes["Background"]
    bg.inputs["Color"].default_value = srgb("#2A2140")
    bg.inputs["Strength"].default_value = 0.6
    scene.world = world

    def light(kind, energy, color, rot, size=1.0):
        data = bpy.data.lights.new(kind, kind)
        data.energy = energy
        data.color = srgb(color)[:3]
        if kind == "SUN":
            data.angle = math.radians(8)
        else:
            data.size = size
        obj = bpy.data.objects.new(kind, data)
        bpy.context.collection.objects.link(obj)
        obj.rotation_euler = [math.radians(a) for a in rot]
        if kind != "SUN":
            obj.location = center + Vector((radius * 2.5, radius * 3, radius * 2.5))
        return obj

    light("SUN", 2.6, "#FFE2BC", (50, 0, -35))
    light("SUN", 1.2, "#8E7CFF", (-60, 0, 150))

    cam_data = bpy.data.cameras.new("cam")
    cam_data.lens = 50
    cam = bpy.data.objects.new("cam", cam_data)
    bpy.context.collection.objects.link(cam)
    direction = Vector((-0.35, -1.0, 0.45)).normalized() if icon else Vector((-0.55, -1.0, 0.55)).normalized()
    distance = radius / math.tan(math.radians(18)) * (0.92 if icon else 1.05)
    cam.location = center + direction * distance
    cam.rotation_euler = (center - cam.location).to_track_quat("-Z", "Y").to_euler()
    scene.camera = cam

    scene.render.resolution_x = 512
    scene.render.resolution_y = 512
    scene.render.film_transparent = True
    scene.cycles.samples = 64
    scene.cycles.use_denoising = True
    scene.view_settings.view_transform = "AgX"
    for look in ("AgX - Medium High Contrast", "Medium High Contrast"):
        try:
            scene.view_settings.look = look
            break
        except TypeError:
            continue
    scene.render.filepath = os.path.join(OUT_ICON_RAW if icon else OUT_PREVIEW, f"{asset}.png")
    bpy.ops.render.render(write_still=True)


# ---------------------------------------------------------------- asset registry

ASSETS = {}


def asset(name, texture=512, collide="Box", category="Prop"):
    def register(fn):
        ASSETS[name] = {"fn": fn, "texture": texture, "collide": collide, "category": category}
        return fn

    return register


ICONS = {}


def icon(name, texture=512):
    """A UI icon: same painted look as the props, rendered to a transparent PNG instead of exported as a mesh."""
    def register(fn):
        ICONS[name] = {"fn": fn, "texture": texture}
        return fn

    return register


def build_icon(name):
    spec = ICONS[name]
    reset()
    _materials.clear()
    parts = spec["fn"]()
    if not isinstance(parts, dict):
        parts = {"Main": parts}
    objects = []
    for part_name, obj in parts.items():
        _apply_modifiers(obj)
        _clean_materials(obj)
        smooth(obj, obj.get("smooth_angle", 40))
        first = obj.data.materials[0] if obj.data.materials else None
        if first is not None and "rbx_material" not in first:
            _unwrap(obj)
            image, _ = _bake(obj, name, part_name, spec["texture"])
            obj.data.materials.clear()
            obj.data.materials.append(_preview_material(image))
        objects.append(obj)
    _render_preview(name, objects, icon=True)


def build_asset(name):
    spec = ASSETS[name]
    reset()
    _materials.clear()
    parts = spec["fn"]()
    if not isinstance(parts, dict):
        parts = {"Main": parts}
    entry = {"category": spec["category"], "collide": spec["collide"], "parts": []}
    preview_objects = []
    for part_name, obj in parts.items():
        _apply_modifiers(obj)
        _clean_materials(obj)
        smooth(obj, obj.get("smooth_angle", 40))
        first = obj.data.materials[0] if obj.data.materials else None
        textured = first is not None and "rbx_material" not in first
        record = {"name": part_name, "collide": bool(obj.get("rbx_collide", True))}
        if textured:
            _unwrap(obj)
            image, _ = _bake(obj, name, part_name, spec["texture"])
            record["texture"] = f"{name}_{part_name}.png"
            record["material"] = obj.get("rbx_material", "SmoothPlastic")
            preview = _preview_material(image)
            obj.data.materials.clear()
            obj.data.materials.append(preview)
        else:
            record["material"] = first["rbx_material"] if first else "SmoothPlastic"
            record["color"] = rgb255(first["rbx_color"]) if first else [200, 200, 200]
            record["transparency"] = first["rbx_transparency"] if first else 0
        record.update(_export_mesh(obj, name, part_name))
        entry["parts"].append(record)
        preview_objects.append(obj)
    _render_preview(name, preview_objects)
    return entry


def write_manifest(entries):
    data = {}
    if os.path.exists(MANIFEST):
        with open(MANIFEST, encoding="utf-8") as fh:
            data = json.load(fh)
    data.update(entries)
    with open(MANIFEST, "w", encoding="utf-8", newline="\n") as fh:
        json.dump(data, fh, indent=2, sort_keys=True)
