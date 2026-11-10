"""UI icons, painted like the props so the HUD and the world match. Rendered to art/out/icons (see icons_post.py).

Each icon faces the camera (-Y). Shapes are chunky on purpose: they must read at 40-60 pixels on a phone.
"""

import math

from mhg import (arch_points, ball, box, cut, cyl, from_profile, ico, icon, join, paint, torus, tube, wobble)
from mathutils import Matrix

import assets_plot
import assets_town
from assets_town import _bundle, _skull

GOLD = ("#8A5A10", "#E0A830", "#FFE58A")


def _squash_y(obj, factor):
    """Flatten toward the camera around the object's own centre (for reliefs on coins, books, medallions)."""
    ys = [v.co.y for v in obj.data.vertices]
    centre = (min(ys) + max(ys)) / 2
    for v in obj.data.vertices:
        v.co.y = centre + (v.co.y - centre) * factor
    obj.data.update()
    return obj


def _disc(radius, depth, loc, mat, verts=40):
    return cyl(radius, depth, loc=loc, rot=(90, 0, 0), verts=verts, bevel=0.04, seg=2, mat=mat)


def _relief(points, depth, y, mat, bevel=0.02):
    """A flat shape in the XZ plane, raised toward the camera from the face at y."""
    return from_profile(points, depth, loc=(0, y - depth / 2, 0), bevel=bevel, seg=1, mat=mat)


def _star_points(r_outer, r_inner, cx=0.0, cz=0.0, n=5):
    pts = []
    for i in range(n * 2):
        r = r_outer if i % 2 == 0 else r_inner
        a = math.pi / 2 + i * math.pi / n
        pts.append((cx + math.cos(a) * r, cz + math.sin(a) * r))
    return pts


def _heart_points(scale, cz=0.0, steps=32):
    pts = []
    for i in range(steps):
        t = i / steps * math.tau
        x = 16 * math.sin(t) ** 3
        z = 13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t)
        pts.append((x / 17 * scale, z / 17 * scale + cz))
    return list(reversed(pts))


def _circle_points(r, cx=0.0, cz=0.0, steps=32):
    return [(cx + math.cos(i / steps * math.tau) * r, cz + math.sin(i / steps * math.tau) * r) for i in range(steps)]


# ---------------------------------------------------------------- currency and resources

@icon("Icon_Coin")
def coin():
    gold = paint("brass", tint=GOLD)
    face = _disc(1.0, 0.24, (0, 0, 0), gold)
    rim = torus(0.96, 0.07, loc=(0, -0.12, 0), rot=(90, 0, 0), seg=40, minor_seg=6, mat=gold)
    skull = _squash_y(_skull((0, 0.0, -0.42), scale=0.85, mat=gold), 0.3)
    for v in skull.data.vertices:
        v.co.y -= 0.12
    back = _disc(1.0, 0.24, (0.55, 0.45, -0.35), gold)
    return join([face, rim, skull, back], "Main")


@icon("Icon_Wood")
def wood():
    bark = paint("bark", grain="Y", moss=0.2)
    ends = paint("wood", tint=("#7A5230", "#C08A58", "#F0C894"))
    rings = paint("wood", tint=("#4A2E18", "#7A5230", "#A8784A"))
    logs = []
    for i, (x, z) in enumerate(((-0.5, -0.42), (0.5, -0.42), (0.0, 0.42))):
        log = cyl(0.48, 1.6, loc=(x, 0.1, z), rot=(90, 0, 0), verts=14, bevel=0.03, seg=1, mat=bark)
        wobble(log, 0.03, 2, seed=i)
        cap = cyl(0.42, 0.05, loc=(x, -0.72, z), rot=(90, 0, 0), verts=14, bevel=0, mat=ends)
        ring = torus(0.22, 0.025, loc=(x, -0.75, z), rot=(90, 0, 0), seg=14, minor_seg=4, mat=rings)
        logs += [log, cap, ring]
    return join(logs, "Main")


@icon("Icon_Stone")
def stone():
    rock = ico(1.0, loc=(0, 0, 0), scale=(1.15, 0.9, 0.85), level=1, mat=paint("stone", moss=0.6))
    wobble(rock, 0.12, 1.2, seed=5)
    chip = ico(0.45, loc=(0.85, -0.3, -0.45), level=1, mat=paint("stone"))
    rock = join([rock, chip], "Main")
    rock["smooth_angle"] = 20
    return rock


@icon("Icon_Iron")
def iron():
    metal = paint("iron", tint=("#34343E", "#6C6C7C", "#C4C4D4"))
    bars = []
    for (x, z) in ((-0.55, -0.3), (0.55, -0.3), (0.0, 0.32)):
        bar = box((1.0, 0.7, 0.55), loc=(x, 0, z), bevel=0.08, seg=2, mat=metal)
        for v in bar.data.vertices:
            if v.co.z > z:
                v.co.x = x + (v.co.x - x) * 0.72
                v.co.y *= 0.72
        bar.data.update()
        bars.append(bar)
    return join(bars, "Main")


@icon("Icon_Quality")
def quality():
    head = from_profile(arch_points(1.4, 1.9, segments=12), 0.4, loc=(0, 0, -0.95), bevel=0.06, seg=2,
                        mat=paint("stone", moss=0.5))
    star = _relief(_star_points(0.45, 0.2, cz=0.15), 0.14, -0.2, paint("brass", tint=GOLD))
    return join([head, star], "Main")


@icon("Icon_SkullWhite")
def skull_white():
    return _skull((0, 0, -0.6), scale=2.0)


@icon("Icon_SkullRed")
def skull_red():
    return _skull((0, 0, -0.6), scale=2.0, mat=paint("bone", tint=("#4A0C0C", "#B02A22", "#FF7058")))


@icon("Icon_Body")
def body():
    pieces = _bundle(2.6, 1.4, 1.0, seed=7)
    obj = join(pieces, "Main")
    obj.rotation_euler = (0, 0, math.radians(70))
    return obj


# ---------------------------------------------------------------- HUD buttons

@icon("Icon_Tech")
def tech():
    paper = paint("paper")
    sheet = box((1.5, 0.06, 1.6), loc=(0, 0, -0.1), bevel=0.02, seg=1, mat=paper, cuts=3)
    wobble(sheet, 0.03, 2, seed=11)
    roll = cyl(0.22, 1.7, loc=(0, -0.05, 0.75), rot=(0, 90, 0), verts=14, bevel=0.02, seg=1, mat=paper)
    knobs = [ball(0.16, loc=(x, -0.05, 0.75), segs=10, rings=6, mat=paint("wood")) for x in (-0.95, 0.95)]
    lines = [box((1.0 - i * 0.12, 0.03, 0.06), loc=(-0.05, -0.05, 0.35 - i * 0.28), bevel=0, mat=paint("leather"))
             for i in range(4)]
    seal = _disc(0.28, 0.1, (0.45, -0.08, -0.7), paint("redcloth"), verts=20)
    return join([sheet, roll, seal] + knobs + lines, "Main")


@icon("Icon_Daily")
def daily():
    box_mat = paint("pumpkin")
    ribbon = paint("leaf", tint=("#2A1446", "#6A34A8", "#B07AF0"))
    gift = box((1.5, 1.5, 1.2), loc=(0, 0, -0.35), bevel=0.06, seg=2, mat=box_mat)
    lid = box((1.65, 1.65, 0.35), loc=(0, 0, 0.35), bevel=0.06, seg=2, mat=box_mat)
    bands = [box((0.28, 1.7, 1.62), loc=(0, 0, -0.18), bevel=0.02, seg=1, mat=ribbon),
             box((1.7, 0.28, 1.62), loc=(0, 0, -0.18), bevel=0.02, seg=1, mat=ribbon)]
    bow = [torus(0.32, 0.1, loc=(side * 0.3, 0, 0.72), rot=(90, side * 35, 0), seg=14, minor_seg=6, mat=ribbon)
           for side in (-1, 1)]
    return join([gift, lid] + bands + bow, "Main")


@icon("Icon_Store")
def store():
    wood_mat = paint("wood", grain="X")
    iron_mat = paint("iron", rust=0.3)
    base = box((1.9, 1.2, 0.95), loc=(0, 0, -0.35), bevel=0.05, seg=1, mat=wood_mat)
    lid = cyl(0.6, 1.9, loc=(0, 0.0, 0.12), rot=(0, 90, 0), verts=16, bevel=0.03, seg=1, mat=wood_mat)
    cut(lid, box((2.2, 1.4, 0.7), loc=(0, 0.0, -0.23), bevel=0))
    bands = [box((0.14, 1.26, 1.0), loc=(x, 0, -0.33), bevel=0.01, seg=1, mat=iron_mat) for x in (-0.7, 0.7)]
    lock = box((0.3, 0.12, 0.36), loc=(0, -0.64, 0.0), bevel=0.03, seg=1, mat=paint("brass", tint=GOLD))
    gold = paint("brass", tint=GOLD)
    coins = [_disc(0.22, 0.06, (x, y, 0.2 + i * 0.03), gold, verts=16) for i, (x, y) in
             enumerate(((-0.4, -0.1), (0.1, -0.2), (0.45, 0.0), (-0.1, 0.15)))]
    return join([base, lid, lock] + bands + coins, "Main")


@icon("Icon_Book")
def book():
    cover = paint("leather")
    pages = paint("paper")
    block = box((1.5, 0.5, 1.9), loc=(0.05, 0.02, 0), bevel=0.02, seg=1, mat=pages)
    front = box((1.6, 0.1, 2.0), loc=(0, -0.3, 0), bevel=0.04, seg=2, mat=cover)
    back = box((1.6, 0.1, 2.0), loc=(0, 0.33, 0), bevel=0.04, seg=2, mat=cover)
    spine = cyl(0.33, 2.0, loc=(-0.8, 0.02, 0), verts=12, bevel=0.02, seg=1, mat=cover)
    emblem = _squash_y(_skull((0.05, 0.0, -0.45), scale=0.7, mat=paint("bone")), 0.35)
    for v in emblem.data.vertices:
        v.co.y -= 0.42
    return join([block, front, back, spine, emblem], "Main")


# ---------------------------------------------------------------- day medallions (StatusBar)

def _medallion(enamel, symbol_objs):
    rim_mat = paint("brass", tint=GOLD)
    base = _disc(1.0, 0.22, (0, 0, 0), rim_mat)
    rim = torus(0.95, 0.09, loc=(0, -0.12, 0), rot=(90, 0, 0), seg=40, minor_seg=6, mat=rim_mat)
    inner = _disc(0.82, 0.08, (0, -0.13, 0), paint("slate", tint=enamel), verts=40)
    return join([base, rim, inner] + symbol_objs, "Main")


@icon("Icon_DayMoon")
def day_moon():
    silver = paint("marble")
    moon = _relief(_circle_points(0.52), 0.12, -0.18, silver)
    cut(moon, from_profile(_circle_points(0.45, cx=0.28, cz=0.12), 0.6, loc=(0, -0.2, 0), bevel=0))
    stars = [_relief(_star_points(0.12, 0.05, cx=x, cz=z), 0.08, -0.17, silver) for x, z in ((0.45, 0.35), (0.3, -0.45))]
    return _medallion(("#0C1230", "#1E2C66", "#3A52A8"), [moon] + stars)


@icon("Icon_DayGreen")
def day_green():
    heart = _relief(_heart_points(0.62), 0.14, -0.18, paint("leaf", tint=("#1E5A16", "#4CC23A", "#B4FF8A")))
    return _medallion(("#0E1E0C", "#1E3A18", "#386A2C"), [heart])


@icon("Icon_DaySun")
def day_sun():
    sun_mat = paint("brass", tint=("#8A4A08", "#F0A428", "#FFE68A"))
    core = _relief(_circle_points(0.32), 0.14, -0.18, sun_mat)
    rays = []
    for i in range(8):
        a = i * math.tau / 8
        tip = (math.cos(a) * 0.68, math.sin(a) * 0.68)
        left = (math.cos(a + 0.28) * 0.4, math.sin(a + 0.28) * 0.4)
        right = (math.cos(a - 0.28) * 0.4, math.sin(a - 0.28) * 0.4)
        rays.append(_relief([right, tip, left], 0.1, -0.17, sun_mat, bevel=0))
    return _medallion(("#4A1E06", "#A8481A", "#E07A30"), [core] + rays)


@icon("Icon_DayRed")
def day_red():
    heart = _relief(_heart_points(0.62), 0.14, -0.18, paint("redcloth", tint=("#5A0A0A", "#D02A22", "#FF8A6A")))
    return _medallion(("#1E0808", "#3E1010", "#6A1C1C"), [heart])


@icon("Icon_DaySkull")
def day_skull():
    skull = _squash_y(_skull((0, 0.0, -0.5), scale=1.0), 0.4)
    for v in skull.data.vertices:
        v.co.y -= 0.2
    return _medallion(("#160C24", "#30184C", "#54307E"), [skull])


@icon("Icon_DayStar")
def day_star():
    star = _relief(_star_points(0.66, 0.28), 0.14, -0.18, paint("brass", tint=GOLD))
    return _medallion(("#0A1024", "#18244A", "#2E4278"), [star])


# ---------------------------------------------------------------- thumbnails of game items and tech-tree nodes

def _turn(obj, degrees_y=0.0, degrees_z=0.0):
    obj.data.transform(Matrix.Rotation(math.radians(degrees_z), 4, "Z") @ Matrix.Rotation(math.radians(degrees_y), 4, "Y"))
    obj.data.update()
    return obj


def _thumb(fn, degrees_z=0.0):
    parts = fn()
    if not isinstance(parts, dict):
        parts = {"Main": parts}
    for obj in parts.values():
        _turn(obj, degrees_z=degrees_z)
    return parts


for _stone in ("WoodenSign", "WoodenCross", "StoneMarker", "CarvedHeadstone", "JackOLantern", "MarbleAngel"):
    icon(f"Icon_Item_{_stone}")(lambda s=_stone: _thumb(getattr(assets_plot, {
        "WoodenSign": "wooden_sign", "WoodenCross": "wooden_cross", "StoneMarker": "stone_marker",
        "CarvedHeadstone": "carved_headstone", "JackOLantern": "jack_o_lantern_stone", "MarbleAngel": "marble_angel",
    }[s]), degrees_z=-18))
for _fence, _fn in (("WoodenFence", "fence_wooden"), ("StoneFence", "fence_stone"), ("IronFence", "fence_iron")):
    icon(f"Icon_Item_{_fence}")(lambda f=_fn: _thumb(getattr(assets_plot, f), degrees_z=-30))


@icon("Icon_Shovel")
def shovel():
    return _turn(assets_town.tool_shovel(), degrees_y=-40)


@icon("Icon_Axe")
def axe():
    return _turn(assets_town.tool_axe(), degrees_y=-40)


@icon("Icon_Pickaxe")
def pickaxe():
    return _turn(assets_town.tool_pickaxe(), degrees_y=-40)


@icon("Icon_Angel")
def angel():
    return _thumb(assets_plot.marble_angel, degrees_z=-15)


@icon("Icon_Donkey")
def donkey():
    fur, cream = paint("fur"), paint("cream")
    head = ball(0.8, loc=(0, 0, 0), scale=(0.95, 1.0, 1.15), segs=20, rings=12, mat=fur)
    muzzle = ball(0.62, loc=(0, -0.55, -0.62), scale=(1.05, 0.9, 0.8), segs=16, rings=10, mat=cream)
    ears = [cyl(0.26, 1.5, loc=(side * 0.45, 0.1, 1.25), verts=10, bevel=0, r2=0.07, rot=(0, side * 22, 0), mat=fur)
            for side in (-1, 1)]
    eyes = [ball(0.13, loc=(side * 0.38, -0.66, 0.18), segs=10, rings=6, mat=paint("slate")) for side in (-1, 1)]
    nostrils = [ball(0.07, loc=(side * 0.2, -1.08, -0.62), segs=8, rings=5, mat=paint("darkfur")) for side in (-1, 1)]
    mane = box((0.3, 0.5, 0.6), loc=(0, 0.35, 0.95), bevel=0.1, seg=2, mat=paint("darkfur"))
    return join([head, muzzle, mane] + ears + eyes + nostrils, "Main")


@icon("Icon_Zombie")
def zombie():
    skin, cloth = paint("zombie"), paint("cloth", tint=("#2A2440", "#4A3E6A", "#7A6AA0"))
    dirt = ico(1.0, loc=(0, 0, -1.1), scale=(1.3, 1.0, 0.45), level=2, mat=paint("dirt", speckle=1))
    wobble(dirt, 0.08, 1.5, seed=3)
    arm = tube([(0, 0, -1.0), (0.05, 0, 0.0), (0.0, 0, 0.6)], 0.28, verts=10, taper=0.9, mat=skin)
    sleeve = cyl(0.36, 0.5, loc=(0.02, 0, -0.55), verts=10, bevel=0.03, seg=1, mat=cloth)
    palm = ball(0.36, loc=(0, -0.02, 0.85), scale=(1.1, 0.6, 1.0), segs=12, rings=8, mat=skin)
    fingers = []
    for i, angle in enumerate((-38, -14, 8, 30)):
        a = math.radians(angle)
        base = (math.sin(a) * 0.25, -0.02, 1.05)
        tip = (math.sin(a) * 0.62, -0.08, 1.05 + math.cos(a) * (0.55 if i in (1, 2) else 0.45))
        fingers.append(tube([base, tip], 0.08, verts=6, taper=0.7, mat=skin))
    thumb = tube([(-0.3, -0.02, 0.8), (-0.62, -0.05, 0.95)], 0.08, verts=6, taper=0.7, mat=skin)
    return join([dirt, arm, sleeve, palm, thumb] + fingers, "Main")


@icon("Icon_Lock")
def lock():
    body = box((1.3, 0.5, 1.05), loc=(0, 0, -0.35), bevel=0.12, seg=2, mat=paint("brass", tint=GOLD))
    cut(body, from_profile([(-0.1, -0.35), (0.1, -0.35), (0.06, -0.05)] + _circle_points(0.14, cz=0.02, steps=12)[3:9],
                           0.4, loc=(0, -0.25, -0.35), bevel=0))
    shackle = torus(0.42, 0.11, loc=(0, 0, 0.3), rot=(90, 0, 0), seg=20, minor_seg=6, mat=paint("iron", rust=0.2))
    cut(shackle, box((1.2, 0.5, 0.5), loc=(0, 0, 0.05), bevel=0))
    return join([body, shackle], "Main")


@icon("Icon_Check")
def check():
    seal = _disc(1.0, 0.18, (0, 0, 0), paint("leaf", tint=("#1E5A16", "#3E9A2E", "#8AE06A")))
    mark = _relief([(-0.55, 0.05), (-0.32, 0.28), (-0.12, 0.06), (0.36, 0.55), (0.58, 0.32), (-0.12, -0.42)], 0.14,
                   -0.1, paint("bone"))
    return join([seal, mark], "Main")
