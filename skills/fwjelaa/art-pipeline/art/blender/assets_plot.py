"""Batch 1: everything on a player's graveyard plot that players look at most.

Origins: ground centre of each prop, front (the side players read) facing -Y.
Gravestones sit at the head of a grave; fences and grave mounds are centred on the 4 x 6.5 grave slot.
"""

import math
import random

from mathutils import Matrix, Vector

from mhg import (arch_points, asset, ball, box, chip, cut, cut_below, cyl, from_profile, ico, join, lean, paint,
                 radial, solid, taper, text, torus, tube, wobble)


# ---------------------------------------------------------------- gravestones

@asset("Gravestone_WoodenSign")
def wooden_sign():
    post = box((0.3, 0.28, 2.7), loc=(0, 0.05, 1.15), bevel=0.05, mat=paint("wood", grain="Z"), cuts=2)
    taper(post, top=0.82)
    wobble(post, 0.03, 2.0, seed=1)
    board = box((1.9, 0.16, 0.82), loc=(0.05, -0.18, 1.95), bevel=0.05, mat=paint("wood", grain="X"), cuts=3)
    carve = text("R.I.P.", 0.42, 0.2, loc=(0.05, -0.31, 1.93))
    cut(board, carve)
    chip(board, count=2, size=0.24, seed=3)
    wobble(board, 0.02, 2.0, seed=2)
    iron = paint("iron", rust=0.7)
    nails = [cyl(0.05, 0.1, loc=(x, -0.27, 1.95), rot=(90, 0, 0), verts=6, bevel=0, mat=iron) for x in (-0.72, 0.8)]
    sign = join([post, board] + nails, "Main")
    lean(sign, degrees_x=-3, degrees_y=6)
    return sign


@asset("Gravestone_WoodenCross")
def wooden_cross():
    wood = paint("wood", grain="Z")
    upright = box((0.38, 0.36, 3.4), loc=(0, 0, 1.5), bevel=0.06, mat=wood, cuts=3)
    taper(upright, top=0.86)
    wobble(upright, 0.035, 1.6, seed=4)
    arm = box((2.1, 0.32, 0.34), loc=(0, -0.04, 2.35), bevel=0.06, mat=paint("wood", grain="X"), cuts=3)
    wobble(arm, 0.03, 1.6, seed=5)
    chip(arm, count=2, size=0.2, seed=6)
    rope = paint("rope")
    wraps = [torus(0.25, 0.04, loc=(0, -0.02, 2.35 + dz), rot=(0, 90 + tilt, 45), seg=12, minor_seg=5, mat=rope)
             for dz, tilt in ((-0.08, -20), (0.0, 0), (0.08, 20))]
    cross = join([upright, arm] + wraps, "Main")
    lean(cross, degrees_x=4, degrees_y=-5)
    return cross


@asset("Gravestone_StoneMarker")
def stone_marker():
    slab = from_profile(arch_points(2.0, 1.75, segments=10), 0.5, loc=(0, 0, -0.1), bevel=0.09, seg=2,
                        mat=paint("stone", moss=0.8))
    taper(slab, top=0.92)
    wobble(slab, 0.04, 1.3, seed=8)
    lean(slab, degrees_x=-5, degrees_y=3)
    return slab


@asset("Gravestone_CarvedHeadstone")
def carved_headstone():
    stone = paint("darkstone", moss=0.6)
    plinth = box((2.7, 1.05, 0.38), loc=(0, 0.05, 0.12), bevel=0.06, mat=stone, cuts=2)
    wobble(plinth, 0.03, 1.5, seed=9)
    head = from_profile(arch_points(2.2, 2.7, segments=12), 0.55, loc=(0, 0, 0.28), bevel=0.07, seg=2,
                        mat=paint("stone", moss=0.5))
    cross_outline = [(-0.11, -0.5), (0.11, -0.5), (0.11, 0.1), (0.34, 0.1), (0.34, 0.32), (0.11, 0.32), (0.11, 0.5),
                     (-0.11, 0.5), (-0.11, 0.32), (-0.34, 0.32), (-0.34, 0.1), (-0.11, 0.1)]
    cut(head, from_profile([(x, z + 2.0) for x, z in cross_outline], 0.4, loc=(0, -0.34, 0), bevel=0))
    cut(head, text("R.I.P.", 0.34, 0.2, loc=(0, -0.33, 1.08)))
    chip(head, count=2, size=0.24, seed=10)
    wobble(head, 0.025, 1.4, seed=11)
    stone_obj = join([plinth, head], "Main")
    lean(stone_obj, degrees_x=3, degrees_y=-2)
    return stone_obj


def _pumpkin_body(radius, loc, seed):
    body = ball(radius, loc=loc, scale=(1.08, 1.0, 0.8), segs=32, rings=16, mat=paint("pumpkin"))
    radial(body, 9, 0.16, center=(loc[0], loc[1]))
    top = loc[2] + radius * 0.8
    for v in body.data.vertices:
        rxy = math.hypot(v.co.x - loc[0], v.co.y - loc[1]) / radius
        if v.co.z > loc[2]:
            v.co.z -= 0.22 * radius * max(0.0, 1 - rxy) ** 2
        else:
            v.co.z += 0.12 * radius * max(0.0, 1 - rxy) ** 2
    body.data.update()
    wobble(body, 0.03 * radius, 1.2, seed=seed)
    stem = tube([(loc[0], loc[1], top - 0.25 * radius), (loc[0] + 0.05, loc[1], top + 0.15 * radius),
                 (loc[0] + 0.22 * radius, loc[1] + 0.05, top + 0.32 * radius)], 0.13 * radius, verts=6, taper=0.55,
                mat=paint("stem"))
    return body, stem


def _face_shapes(radius, center_z, depth, y):
    """Triangle eyes, a triangle nose and a jagged grin, as extruded outlines facing -Y."""
    r = radius
    eye = [(-0.2 * r, 0), (0.2 * r, 0), (0, 0.3 * r)]
    nose = [(-0.1 * r, 0), (0.1 * r, 0), (0, 0.16 * r)]
    mouth = [(-0.55 * r, 0.05 * r), (-0.35 * r, -0.05 * r), (-0.25 * r, 0.06 * r), (-0.12 * r, -0.08 * r),
             (0.0, 0.05 * r), (0.12 * r, -0.08 * r), (0.25 * r, 0.06 * r), (0.35 * r, -0.05 * r),
             (0.55 * r, 0.05 * r), (0.3 * r, -0.3 * r), (-0.3 * r, -0.3 * r)]
    shapes = []
    for pts, dx, dz in ((eye, -0.36 * r, 0.2 * r), (eye, 0.36 * r, 0.2 * r), (nose, 0, 0.0), (mouth, 0, -0.25 * r)):
        moved = [(x + dx, z + dz + center_z) for x, z in pts]
        shapes.append(from_profile(moved, depth, loc=(0, y, 0), bevel=0))
    return shapes


@asset("Gravestone_JackOLantern")
def jack_o_lantern_stone():
    base = box((1.9, 1.3, 0.75), loc=(0, 0.05, 0.3), bevel=0.12, seg=2, mat=paint("darkstone", moss=0.5), cuts=2)
    chip(base, count=2, size=0.25, seed=12)
    wobble(base, 0.04, 1.4, seed=13)
    radius = 1.05
    center = (0, 0, 0.62 + radius * 0.8)
    body, stem = _pumpkin_body(radius, center, seed=14)
    for shape in _face_shapes(radius, center[2], 1.0, -radius - 0.15):
        cut(body, shape)
    glow = join(_face_shapes(radius, center[2], 0.08, -radius * 0.62), "Glow")
    glow.data.materials.append(solid("#FFB040", "Neon"))
    main = join([base, body, stem], "Main")
    return {"Main": main, "Glow": glow}


@asset("Gravestone_MarbleAngel", texture=1024)
def marble_angel():
    marble = paint("marble", moss=0.35)
    plinth = box((2.2, 1.4, 0.48), loc=(0, 0.05, 0.2), bevel=0.06, mat=marble, cuts=2)
    step = box((1.6, 1.05, 0.42), loc=(0, 0.05, 0.62), bevel=0.06, mat=marble, cuts=2)
    chip(plinth, count=2, size=0.22, seed=15)
    for part, seed in ((plinth, 16), (step, 17)):
        wobble(part, 0.025, 1.5, seed=seed)
    robe = cyl(0.58, 1.75, loc=(0, 0.05, 1.7), verts=24, bevel=0, r2=0.24, mat=marble)
    radial(robe, 7, 0.12, center=(0, 0.05))
    wobble(robe, 0.03, 2.0, seed=18)
    chest = ball(0.3, loc=(0, 0.05, 2.62), scale=(1.25, 0.95, 1.05), segs=16, rings=10, mat=marble)
    head = ball(0.27, loc=(0, 0.02, 3.02), segs=16, rings=10, mat=marble)
    hair = ball(0.29, loc=(0, 0.08, 3.08), scale=(1.0, 1.0, 0.82), segs=16, rings=10, mat=marble)
    hands = ball(0.14, loc=(0, -0.26, 2.42), scale=(0.9, 0.8, 1.6), segs=10, rings=8, mat=marble)
    arms = [tube([(s * 0.32, 0.05, 2.7), (s * 0.3, -0.12, 2.4), (s * 0.08, -0.25, 2.4)], 0.09, verts=6,
                  mat=marble) for s in (-1, 1)]
    wing_outline = [(0.08, 2.05), (0.3, 2.85), (0.62, 3.32), (1.0, 3.55), (1.22, 3.45), (1.2, 3.1), (1.08, 2.85),
                    (0.96, 2.62), (0.84, 2.66), (0.8, 2.44), (0.66, 2.46), (0.62, 2.24), (0.48, 2.25),
                    (0.44, 2.02), (0.3, 1.95)]
    covert_outline = [(0.1, 2.35), (0.32, 2.95), (0.62, 3.3), (0.92, 3.38), (0.95, 3.12), (0.82, 2.95),
                      (0.72, 2.98), (0.66, 2.78), (0.54, 2.8), (0.48, 2.6), (0.36, 2.6), (0.3, 2.38)]
    wings = []
    for side in (-1, 1):
        for outline_src, y, depth, seed in ((wing_outline, 0.34, 0.09, 19), (covert_outline, 0.26, 0.08, 23)):
            outline = [(x * side, z) for x, z in outline_src]
            if side < 0:
                outline.reverse()
            wing = from_profile(outline, depth, loc=(0, y, 0), rot=(0, 0, -24 * side), bevel=0.03, seg=1,
                                mat=marble)
            wobble(wing, 0.02, 2.5, seed=seed + side)
            wings.append(wing)
    halo = torus(0.22, 0.035, loc=(0, 0.1, 3.42), rot=(18, 0, 0), seg=20, minor_seg=6, mat=paint("brass"))
    return join([plinth, step, robe, chest, head, hair, hands, halo] + arms + wings, "Main")


# ---------------------------------------------------------------- grave borders (4 x 6.2 rectangle)

HALF_X, HALF_Y = 2.0, 3.1


def _perimeter(spacing):
    """Points along the border rectangle with the direction (degrees around Z) each run follows."""
    points = []
    for (x0, y0, x1, y1) in ((-HALF_X, -HALF_Y, HALF_X, -HALF_Y), (HALF_X, -HALF_Y, HALF_X, HALF_Y),
                             (HALF_X, HALF_Y, -HALF_X, HALF_Y), (-HALF_X, HALF_Y, -HALF_X, -HALF_Y)):
        length = math.hypot(x1 - x0, y1 - y0)
        count = max(1, round(length / spacing))
        angle = math.degrees(math.atan2(y1 - y0, x1 - x0))
        for i in range(count):
            t = (i + 0.5) / count
            points.append((x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, angle))
    return points


def _rails(height, thickness, z, mat, bevel=0.02):
    rails = []
    for (x, y, sx, sy) in ((0, -HALF_Y, HALF_X * 2, thickness), (0, HALF_Y, HALF_X * 2, thickness),
                           (-HALF_X, 0, thickness, HALF_Y * 2), (HALF_X, 0, thickness, HALF_Y * 2)):
        rails.append(box((sx, sy, height), loc=(x, y, z), bevel=bevel, seg=1, mat=mat))
    return rails


@asset("Fence_Wooden")
def fence_wooden():
    rng = random.Random(21)
    rail_wood = paint("oldwood", grain="X")
    picket_wood = paint("oldwood", grain="Z")
    pieces = _rails(0.12, 0.06, 0.35, rail_wood) + _rails(0.12, 0.06, 0.78, rail_wood)
    for x, y, angle in _perimeter(0.4):
        h = rng.uniform(0.92, 1.08)
        outline = [(-0.08, 0), (0.08, 0), (0.08, h - 0.1), (0, h), (-0.08, h - 0.1)]
        picket = from_profile(outline, 0.05, loc=(x, y, 0), rot=(rng.uniform(-3, 3), 0, angle), bevel=0.012, seg=1,
                              mat=picket_wood)
        pieces.append(picket)
    for x in (-HALF_X, HALF_X):
        for y in (-HALF_Y, HALF_Y):
            pieces.append(box((0.2, 0.2, 1.2), loc=(x, y, 0.55), bevel=0.03, seg=1, mat=picket_wood))
            pieces.append(cyl(0.16, 0.18, loc=(x, y, 1.24), verts=4, bevel=0, r2=0.0, rot=(0, 0, 45),
                              mat=picket_wood))
    return join(pieces, "Main")


@asset("Fence_Stone")
def fence_stone():
    rng = random.Random(22)
    stone = paint("stone", moss=0.9)
    pieces = []
    for x, y, angle in _perimeter(0.7):
        size = (rng.uniform(0.62, 0.78), rng.uniform(0.5, 0.6), rng.uniform(0.42, 0.58))
        rock = box(size, loc=(x, y, size[2] / 2), rot=(0, 0, angle + rng.uniform(-6, 6)), bevel=0.1, seg=1, mat=stone)
        wobble(rock, 0.05, 1.8, seed=rng.randint(0, 999))
        pieces.append(rock)
    for x in (-HALF_X, HALF_X):
        for y in (-HALF_Y, HALF_Y):
            cap = box((0.75, 0.75, 0.8), loc=(x, y, 0.4), bevel=0.12, seg=1, mat=stone)
            wobble(cap, 0.05, 1.8, seed=rng.randint(0, 999))
            pieces.append(cap)
    return join(pieces, "Main")


@asset("Fence_Iron")
def fence_iron():
    iron = paint("iron", rust=0.5)
    pieces = _rails(0.08, 0.08, 0.22, iron, bevel=0) + _rails(0.08, 0.08, 1.12, iron, bevel=0)
    for x, y, _ in _perimeter(0.34):
        pieces.append(cyl(0.035, 1.2, loc=(x, y, 0.62), verts=6, bevel=0, mat=iron))
        pieces.append(cyl(0.075, 0.2, loc=(x, y, 1.3), verts=6, bevel=0, r2=0.0, mat=iron))
    for x in (-HALF_X, HALF_X):
        for y in (-HALF_Y, HALF_Y):
            pieces.append(box((0.16, 0.16, 1.45), loc=(x, y, 0.72), bevel=0.02, seg=1, mat=iron))
            pieces.append(ball(0.11, loc=(x, y, 1.52), segs=8, rings=6, mat=iron))
    return join(pieces, "Main")


# ---------------------------------------------------------------- graves

def _tuft(loc, rng, height=0.38):
    blades = []
    for _ in range(rng.randint(4, 6)):
        lean_x, lean_y = rng.uniform(-28, 28), rng.uniform(-28, 28)
        blades.append(cyl(0.05, height * rng.uniform(0.7, 1.1), loc=(loc[0], loc[1], loc[2] + height * 0.4), verts=3,
                          bevel=0, r2=0.0, rot=(lean_x, lean_y, rng.uniform(0, 120)), mat=paint("stem")))
    return blades


@asset("Grave_Mound")
def grave_mound():
    rng = random.Random(24)
    dirt = paint("dirt", speckle=1)
    mound = ico(1.0, loc=(0, 0.0, 0), scale=(1.4, 2.6, 0.72), level=3, mat=dirt)
    wobble(mound, 0.08, 1.4, seed=23)
    cut_below(mound, 0.0)
    pieces = [mound]
    for i in range(9):
        angle = i * math.tau / 9 + rng.uniform(-0.2, 0.2)
        pieces.append(ico(rng.uniform(0.1, 0.17), loc=(math.cos(angle) * 1.5, math.sin(angle) * 2.7, 0.04), level=1,
                          scale=(1, 1, 0.65), mat=paint("darkstone")))
    for angle in (0.6, 2.2, 3.7, 5.2):
        pieces += _tuft((math.cos(angle) * 1.45, math.sin(angle) * 2.55, 0), rng)
    return join(pieces, "Main")


@asset("Grave_Open")
def grave_open():
    dirt = paint("dirt", speckle=1)
    pit = paint("dirt", tint=("#0E0906", "#1C130D", "#2E2016"))
    rim = []
    for (x, y, sx, sy) in ((0, -2.85, 3.4, 0.55), (0, 2.85, 3.4, 0.55), (-1.6, 0, 0.45, 5.4), (1.6, 0, 0.45, 5.4)):
        side = box((sx, sy, 0.34), loc=(x, y, 0.13), bevel=0.12, seg=2, mat=dirt, cuts=3)
        wobble(side, 0.07, 1.6, seed=int(x * 10 + y * 3) % 97)
        rim.append(side)
    floor = box((2.9, 5.3, 0.06), loc=(0, 0, 0.03), bevel=0, mat=pit, cuts=4)
    wobble(floor, 0.03, 2.0, seed=25)
    pile = ico(1.0, loc=(-2.2, 2.0, 0.05), scale=(0.9, 1.15, 0.92), level=3, mat=dirt)
    wobble(pile, 0.12, 1.6, seed=26)
    cut_below(pile, 0.0)
    wood = paint("wood", grain="Z")
    iron = paint("iron", rust=0.4)
    handle = cyl(0.085, 2.4, loc=(-2.05, 2.2, 1.55), rot=(-14, 18, 0), verts=8, bevel=0, mat=wood)
    grip = torus(0.17, 0.045, loc=(-1.7, 2.48, 2.78), rot=(-14, 18, 90), seg=10, minor_seg=4, mat=wood)
    blade = box((0.6, 0.07, 0.72), loc=(-2.4, 1.9, 0.45), rot=(-14, 18, 0), bevel=0.03, seg=1, mat=iron)
    return join(rim + [floor, pile, handle, grip, blade], "Main")


# ---------------------------------------------------------------- nature

def _branch(pieces, tips, rng, start, direction, length, radius, depth, bark):
    d = direction.normalized()
    p = Vector(start)
    points = [tuple(p)]
    for _ in range(3):
        bend = Vector((rng.uniform(-0.5, 0.5), rng.uniform(-0.5, 0.5), rng.uniform(-0.1, 0.2)))
        d = (d + bend * 0.5).normalized()
        p = p + d * (length / 3)
        points.append(tuple(p))
    pieces.append(tube(points, radius, verts=8 if radius > 0.3 else 6, taper=0.62, mat=bark))
    if depth == 0:
        tips.append(p.copy())
        return
    roll = rng.uniform(0, math.tau)
    for k in range(2 if depth > 1 else rng.choice((2, 3))):
        spread = math.radians(rng.uniform(28, 46))
        roll += math.pi * (2 / 3 if depth == 1 else 1) + rng.uniform(-0.4, 0.4)
        child = Matrix.Rotation(roll, 3, d) @ Matrix.Rotation(spread, 3, d.orthogonal().normalized()) @ d
        child.z = max(child.z, 0.05)
        _branch(pieces, tips, rng, p, child, length * rng.uniform(0.62, 0.74), radius * 0.62, depth - 1, bark)


def _tree(seed, leaves):
    rng = random.Random(seed)
    bark = paint("bark", grain="Z", moss=0.35)
    pieces, tips = [], []
    _branch(pieces, tips, rng, (0, 0, -0.4), Vector((0.1, 0.05, 1)), 5.4, 1.1, 3, bark)
    for i in range(5):
        angle = i * math.tau / 5 + rng.uniform(-0.3, 0.3)
        pieces.append(cyl(0.5, 1.9, loc=(math.cos(angle) * 0.62, math.sin(angle) * 0.62, 0.3), verts=6, bevel=0,
                          r2=0.08, rot=(0, 70, math.degrees(angle)), mat=bark))
    trunk = join(pieces, "Trunk")
    wobble(trunk, 0.06, 1.1, seed=seed)
    if not leaves:
        return trunk
    leaf = paint("leaf", speckle=1)
    clumps = []
    for i, tip in enumerate(tips):
        for k in range(8):
            spread = rng.uniform(0.4, 1.7)
            ang = rng.uniform(0, math.tau)
            offset = Vector((math.cos(ang) * spread, math.sin(ang) * spread, rng.uniform(-0.5, 0.7) * (1.8 - spread * 0.5)))
            r = rng.uniform(0.38, 0.8) * (1.2 - 0.25 * spread)
            clump = ico(r, loc=tuple(Vector(tip) + offset), scale=(1.25, 1.25, 0.6), level=1, mat=leaf,
                        rot=(rng.uniform(-25, 25), rng.uniform(-25, 25), rng.uniform(0, 180)))
            wobble(clump, r * 0.3, 1.6, seed=seed * 10 + i * 9 + k)
            clumps.append(clump)
    canopy = join(clumps, "Canopy")
    canopy["rbx_collide"] = False
    canopy["smooth_angle"] = 14
    return {"Trunk": trunk, "Canopy": canopy}


@asset("Tree_Dead", texture=1024, collide="Hull")
def tree_dead():
    return _tree(seed=3, leaves=True)


@asset("Tree_Bare", texture=1024, collide="Hull")
def tree_bare():
    return {"Trunk": _tree(seed=8, leaves=False)}


@asset("Rock_Boulder", collide="Hull")
def rock_boulder():
    stone = paint("stone", moss=0.7)
    a = ico(1.35, loc=(0, 0, 0.75), scale=(1.15, 0.95, 0.78), level=2, mat=stone)
    wobble(a, 0.22, 0.9, seed=31)
    b = ico(0.85, loc=(1.15, -0.45, 0.45), scale=(1.0, 0.9, 0.75), level=2, mat=stone)
    wobble(b, 0.15, 1.2, seed=32)
    c = ico(0.55, loc=(-1.1, 0.65, 0.28), scale=(1.0, 1.0, 0.7), level=1, mat=stone)
    wobble(c, 0.1, 1.4, seed=33)
    rock = join([a, b, c], "Main")
    cut_below(rock, 0.0)
    rock["smooth_angle"] = 28
    return rock


@asset("Ore_Iron", collide="Hull")
def ore_iron():
    stone = paint("darkstone", moss=0.3)
    base = ico(1.25, loc=(0, 0, 0.7), scale=(1.1, 1.0, 0.82), level=2, mat=stone)
    wobble(base, 0.18, 0.9, seed=41)
    cut_below(base, 0.0)
    ore = paint("ore")
    rng = random.Random(42)
    up = Vector((0, 0, 1))
    spots = [(v.co.copy(), v.normal.copy()) for v in base.data.vertices if v.co.z > 0.55]
    rng.shuffle(spots)
    chosen = []
    for co, normal in spots:
        if all((co - other).length > 0.55 for other, _ in chosen):
            chosen.append((co, normal))
        if len(chosen) == 6:
            break
    crystals = []
    for i, (co, normal) in enumerate(chosen):
        direction = (normal * 0.8 + up * 0.2).normalized()
        size = rng.uniform(0.36, 0.52) * (1.25 if i == 0 else 1.0)
        center = co + direction * (size * 0.18)
        nugget = ico(size, loc=tuple(center), scale=(1.0, 0.8, 0.7), level=1, mat=ore,
                     rot=(rng.uniform(0, 90), rng.uniform(0, 90), rng.uniform(0, 90)))
        wobble(nugget, 0.06, 2.0, seed=60 + i)
        crystals.append(nugget)
    rock = join([base] + crystals, "Main")
    rock["smooth_angle"] = 28
    return rock


# ---------------------------------------------------------------- lights and decor

@asset("Lamp_Post", collide="Box")
def lamp_post():
    iron = paint("iron", rust=0.3)
    pieces = [
        cyl(0.5, 0.35, loc=(0, 0, 0.17), verts=8, bevel=0.04, mat=iron),
        cyl(0.34, 0.35, loc=(0, 0, 0.5), verts=8, bevel=0.03, r2=0.22, mat=iron),
        cyl(0.17, 8.0, loc=(0, 0, 4.65), verts=8, bevel=0, mat=iron),
        torus(0.24, 0.06, loc=(0, 0, 1.1), seg=10, minor_seg=4, mat=iron),
        torus(0.24, 0.06, loc=(0, 0, 8.45), seg=10, minor_seg=4, mat=iron),
        box((1.1, 1.1, 0.12), loc=(0, 0, 8.8), bevel=0.03, seg=1, mat=iron),
        cyl(0.82, 0.55, loc=(0, 0, 10.2), verts=4, bevel=0, r2=0.08, rot=(0, 0, 45), mat=iron),
        ball(0.1, loc=(0, 0, 10.58), segs=8, rings=6, mat=iron),
    ]
    for x in (-0.47, 0.47):
        for y in (-0.47, 0.47):
            pieces.append(cyl(0.045, 1.15, loc=(x, y, 9.42), verts=6, bevel=0, mat=iron))
    main = join(pieces, "Main")
    glass = box((0.86, 0.86, 1.02), loc=(0, 0, 9.4), bevel=0)
    glass.data.materials.append(solid("#FFC27A", "Glass", 0.35))
    flame = ico(0.12, loc=(0, 0, 9.25), scale=(1, 1, 1.7), level=1)
    flame.data.materials.append(solid("#FFD27A", "Neon"))
    glass["rbx_collide"] = False
    flame["rbx_collide"] = False
    return {"Main": main, "Glass": glass, "Flame": flame}


@asset("Pumpkin", collide="Box")
def pumpkin():
    body, stem = _pumpkin_body(1.0, (0, 0, 0.8), seed=51)
    return join([body, stem], "Main")


@asset("Pumpkin_Carved", collide="Box")
def pumpkin_carved():
    radius = 1.0
    body, stem = _pumpkin_body(radius, (0, 0, 0.8), seed=52)
    for shape in _face_shapes(radius, 0.8, 1.0, -radius - 0.15):
        cut(body, shape)
    glow = join(_face_shapes(radius, 0.8, 0.08, -radius * 0.62), "Glow")
    glow.data.materials.append(solid("#FFB040", "Neon"))
    glow["rbx_collide"] = False
    return {"Main": join([body, stem], "Main"), "Glow": glow}
