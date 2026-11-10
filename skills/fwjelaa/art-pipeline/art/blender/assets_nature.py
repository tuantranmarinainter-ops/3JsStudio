"""Batch 3: the world between the props — more trees, bushes, grass, mushrooms, rocks, logs, leaves and clutter.

These get scattered by tools/BuildMap.luau. Keep triangle counts low: grass tufts and pebbles appear hundreds of times.
"""

import math
import random

from mathutils import Vector

from mhg import (asset, ball, box, cut, cut_below, cyl, from_profile, ico, join, paint, radial, solid, torus, tube,
                 wobble)
from assets_plot import _branch
from assets_town import _candle, _flames

LEAF_AUTUMN = ("#6A1E08", "#C8561A", "#F6A23A")
LEAF_TEAL = ("#16302C", "#2E5A50", "#5C8C7A")
PINE = ("#0E1E1A", "#1E3A30", "#3E6650")
GRASS = ("#1E3418", "#3E6430", "#86A85A")
MUSH_CAP = ("#3A1446", "#7A2E8C", "#C47ADE")


def _clump_canopy(tips, rng, radius, colors, seed, extra=3, level=1):
    """Ragged foliage: lots of small flat-shaded clumps layered around each branch tip, heavier at the top and
    thinning toward the edge, so the silhouette is broken up instead of one smooth ball."""
    leaf = paint("leaf", tint=colors, speckle=1)
    clumps = []
    for i, tip in enumerate(tips):
        count = 6 + extra * 2
        for k in range(count):
            spread = radius * (0.35 + 0.95 * rng.random())
            a = rng.uniform(0, math.tau)
            lift = rng.uniform(-0.55, 0.75) * radius * (1.0 - spread / (radius * 1.3))
            offset = Vector((math.cos(a) * spread, math.sin(a) * spread, lift))
            r = radius * rng.uniform(0.28, 0.5) * (1.1 - 0.4 * spread / (radius * 1.3))
            clump = ico(r, loc=tuple(Vector(tip) + offset), scale=(1.2, 1.2, 0.62), level=1, mat=leaf,
                        rot=(rng.uniform(-25, 25), rng.uniform(-25, 25), rng.uniform(0, 180)))
            wobble(clump, r * 0.3, 1.6, seed=seed * 31 + i * 17 + k)
            clumps.append(clump)
    canopy = join(clumps, "Canopy")
    canopy["rbx_collide"] = False
    canopy["smooth_angle"] = 14  # faceted: each little leaf mass catches the light on its own
    return canopy


@asset("Tree_Autumn", texture=1024, collide="Hull")
def tree_autumn():
    rng = random.Random(71)
    bark = paint("bark", grain="Z", moss=0.2)
    pieces, tips = [], []
    _branch(pieces, tips, rng, (0, 0, -0.4), Vector((0.05, 0.08, 1)), 3.4, 1.0, 3, bark)
    for i in range(4):
        a = i * math.tau / 4 + 0.4
        pieces.append(cyl(0.45, 1.7, loc=(math.cos(a) * 0.55, math.sin(a) * 0.55, 0.3), verts=6, bevel=0, r2=0.08,
                          rot=(0, 70, math.degrees(a)), mat=bark))
    trunk = join(pieces, "Trunk")
    wobble(trunk, 0.05, 1.1, seed=71)
    canopy = _clump_canopy(tips, rng, 2.0, LEAF_AUTUMN, 71, extra=2)
    return {"Trunk": trunk, "Canopy": canopy}


@asset("Tree_Willow", texture=1024, collide="Hull")
def tree_willow():
    rng = random.Random(72)
    bark = paint("bark", grain="Z", moss=0.6)
    pieces, tips = [], []
    _branch(pieces, tips, rng, (0, 0, -0.4), Vector((0.1, 0.0, 1)), 5.0, 1.0, 2, bark)
    trunk_tips = list(tips)
    moss = paint("leaf", tint=LEAF_TEAL)
    strands = []
    for i, tip in enumerate(trunk_tips):
        for k in range(6):
            a = rng.uniform(0, math.tau)
            start = Vector(tip) + Vector((math.cos(a), math.sin(a), 0)) * rng.uniform(0.3, 1.6)
            length = rng.uniform(2.5, 4.5)
            mid = start + Vector((math.cos(a) * 0.4, math.sin(a) * 0.4, -length * 0.5))
            end = start + Vector((math.cos(a) * 0.6, math.sin(a) * 0.6, -length))
            strands.append(tube([tuple(start), tuple(mid), tuple(end)], 0.09, verts=4, taper=0.4, mat=moss))
    trunk = join(pieces, "Trunk")
    wobble(trunk, 0.07, 1.0, seed=72)
    canopy = _clump_canopy(trunk_tips, rng, 1.4, LEAF_TEAL, 72, extra=3)
    canopy = join([canopy] + strands, "Canopy")
    canopy["rbx_collide"] = False
    canopy["smooth_angle"] = 30
    return {"Trunk": trunk, "Canopy": canopy}


@asset("Tree_Pine", texture=1024, collide="Hull")
def tree_pine():
    bark = paint("bark", grain="Z")
    trunk = cyl(0.45, 9.0, loc=(0, 0, 4.2), verts=8, bevel=0, r2=0.15, mat=bark)
    wobble(trunk, 0.04, 1.5, seed=81)
    needles = paint("leaf", tint=PINE, speckle=1)
    tiers = []
    for i, (z, r, h) in enumerate(((2.4, 2.6, 2.8), (4.2, 2.2, 2.6), (5.9, 1.75, 2.4), (7.4, 1.3, 2.1), (8.8, 0.8, 1.8))):
        tier = cyl(r, h, loc=(0, 0, z), verts=10, bevel=0, r2=0.05, rot=(0, 0, i * 17), mat=needles)
        radial(tier, 10, 0.18)
        wobble(tier, 0.12, 1.4, seed=82 + i)
        tiers.append(tier)
    canopy = join(tiers, "Canopy")
    canopy["rbx_collide"] = False
    canopy["smooth_angle"] = 25
    return {"Trunk": trunk, "Canopy": canopy}


@asset("Bush_Spooky", collide="Box")
def bush_spooky():
    rng = random.Random(91)
    leaf = paint("leaf", tint=("#1A1426", "#36284A", "#5E4A78"), speckle=1)
    clumps = []
    for i in range(6):
        a = i * math.tau / 6 + rng.uniform(-0.3, 0.3)
        r = rng.uniform(0.55, 0.85)
        clump = ico(r, loc=(math.cos(a) * 0.7, math.sin(a) * 0.6, r * 0.7), scale=(1, 1, 0.85), level=2, mat=leaf)
        wobble(clump, 0.12, 1.5, seed=91 + i)
        clumps.append(clump)
    clumps.append(ico(0.95, loc=(0, 0, 0.95), level=2, mat=leaf))
    bush = join(clumps, "Main")
    cut_below(bush, 0.0)
    bush["smooth_angle"] = 60
    berries = join([ball(0.09, loc=(math.cos(a) * 1.05, math.sin(a) * 0.95, 0.9 + 0.3 * math.sin(a * 3)), segs=8,
                         rings=5) for a in [i * 0.9 for i in range(7)]], "Glow")
    berries.data.materials.append(solid("#FF8A3A", "Neon"))
    berries["rbx_collide"] = False
    return {"Main": bush, "Glow": berries}


def _blades(rng, count, height, spread, mat):
    blades = []
    for _ in range(count):
        a = rng.uniform(0, math.tau)
        r = rng.uniform(0, spread)
        h = height * rng.uniform(0.6, 1.1)
        base = (math.cos(a) * r, math.sin(a) * r, 0)
        lean = Vector((math.cos(a), math.sin(a), 0)) * rng.uniform(0.15, 0.45) * h
        tip = (base[0] + lean.x, base[1] + lean.y, h)
        mid = (base[0] + lean.x * 0.3, base[1] + lean.y * 0.3, h * 0.55)
        blades.append(tube([base, mid, tip], 0.05, verts=3, taper=0.15, mat=mat))
    return blades


@asset("Grass_Tuft", collide="Box")
def grass_tuft():
    rng = random.Random(101)
    tuft = join(_blades(rng, 9, 0.9, 0.25, paint("leaf", tint=GRASS)), "Main")
    tuft["rbx_collide"] = False
    return tuft


@asset("Grass_TuftTall", collide="Box")
def grass_tuft_tall():
    rng = random.Random(102)
    tuft = join(_blades(rng, 12, 1.6, 0.35, paint("leaf", tint=("#3A3418", "#7A6A30", "#C8B060"))), "Main")
    tuft["rbx_collide"] = False
    return tuft


@asset("Mushroom_Cluster", collide="Box")
def mushroom_cluster():
    rng = random.Random(111)
    stems, caps, spots = [], [], []
    stem_mat, cap_mat = paint("cream"), paint("leaf", tint=MUSH_CAP)
    for i in range(5):
        a = rng.uniform(0, math.tau)
        r = rng.uniform(0, 0.45)
        h = rng.uniform(0.35, 0.8)
        x, y = math.cos(a) * r, math.sin(a) * r
        stems.append(cyl(0.07 + h * 0.05, h, loc=(x, y, h / 2), verts=6, bevel=0, r2=0.05, mat=stem_mat))
        cap = ball(0.18 + h * 0.18, loc=(x, y, h), scale=(1, 1, 0.55), segs=10, rings=6, mat=cap_mat)
        cut_below(cap, h - 0.02)
        caps.append(cap)
        for k in range(3):
            b = rng.uniform(0, math.tau)
            spots.append(ball(0.035, loc=(x + math.cos(b) * 0.12, y + math.sin(b) * 0.12, h + 0.06), segs=6, rings=4))
    main = join(stems + caps, "Main")
    main["rbx_collide"] = False
    glow = join(spots, "Glow")
    glow.data.materials.append(solid("#7CFFE6", "Neon"))
    glow["rbx_collide"] = False
    return {"Main": main, "Glow": glow}


@asset("Rock_Small", collide="Hull")
def rock_small():
    rng = random.Random(121)
    stone = paint("stone", moss=0.5)
    pieces = []
    for i in range(3):
        r = rng.uniform(0.25, 0.5)
        p = ico(r, loc=(rng.uniform(-0.4, 0.4), rng.uniform(-0.4, 0.4), r * 0.4), scale=(1.2, 1, 0.75), level=1,
                mat=stone)
        wobble(p, r * 0.25, 2, seed=121 + i)
        pieces.append(p)
    rock = join(pieces, "Main")
    cut_below(rock, 0.0)
    rock["smooth_angle"] = 25
    return rock


@asset("Log_Fallen", collide="Box")
def log_fallen():
    bark = paint("bark", grain="X", moss=0.8)
    log = cyl(0.55, 4.2, loc=(0, 0, 0.45), rot=(0, 90, 8), verts=10, bevel=0.03, seg=1, mat=bark)
    cut(log, cyl(0.38, 4.6, loc=(0, 0, 0.45), rot=(0, 90, 8), verts=10, bevel=0))
    wobble(log, 0.05, 1.5, seed=131)
    branch = tube([(0.8, 0.1, 0.8), (1.2, -0.4, 1.4), (1.5, -0.6, 1.6)], 0.12, verts=6, taper=0.4, mat=bark)
    rng = random.Random(132)
    shrooms = []
    for i in range(3):
        x = rng.uniform(-1.5, 1.5)
        shrooms.append(ball(0.18, loc=(x, -0.5, 0.55), scale=(1, 0.5, 0.6), segs=8, rings=5,
                            mat=paint("leaf", tint=("#6A4A20", "#B08040", "#E8C080"))))
    return join([log, branch] + shrooms, "Main")


@asset("Leaves_Pile", collide="Box")
def leaves_pile():
    rng = random.Random(141)
    leaf = paint("leaf", tint=LEAF_AUTUMN)
    leaves = []
    for i in range(18):
        a = rng.uniform(0, math.tau)
        r = rng.uniform(0, 1.0)
        z = 0.05 + (1 - r) * 0.25 + rng.uniform(0, 0.08)
        outline = [(-0.16, 0), (0, -0.09), (0.16, 0), (0, 0.09)]
        piece = from_profile(outline, 0.02, loc=(math.cos(a) * r, math.sin(a) * r, z),
                             rot=(90 + rng.uniform(-20, 20), 0, rng.uniform(0, 180)), bevel=0, mat=leaf)
        leaves.append(piece)
    mound = ico(0.8, loc=(0, 0, 0), scale=(1.2, 1.2, 0.3), level=1, mat=leaf)
    pile = join([mound] + leaves, "Main")
    cut_below(pile, 0.0)
    pile["rbx_collide"] = False
    return pile


@asset("Candles_Cluster", collide="Box")
def candles_cluster():
    pieces, flames = [], []
    for x, y, h in ((0, 0, 0.7), (0.32, 0.15, 0.45), (-0.25, 0.22, 0.55), (0.1, -0.3, 0.35)):
        wax, flame = _candle(x, y, 0, height=h, radius=0.11)
        pieces += wax[:1]
        flames.append(flame)
    drips = [ball(0.06, loc=(0.1, -0.1, 0.5), scale=(1, 1, 2), segs=6, rings=4, mat=paint("wax"))]
    main = join(pieces + drips, "Main")
    main["rbx_collide"] = False
    return {"Main": main, "Flames": _flames(flames)}


@asset("Coffin_Stack", collide="Box")
def coffin_stack():
    wood = paint("wood", grain="X")
    outline = [(-1.1, -0.35), (-0.55, -0.6), (1.1, -0.42), (1.1, 0.42), (-0.55, 0.6), (-1.1, 0.35)]
    coffins = []
    for i, (z, turn) in enumerate(((0.3, 0), (0.9, 6), (1.5, -5))):
        body = from_profile([(x, y) for x, y in outline], 0.55, loc=(0, 0, z), rot=(90, 0, turn), bevel=0.04, seg=1,
                            mat=wood)
        coffins.append(body)
        lid_cross = box((0.12, 0.6, 0.04), loc=(-0.2, 0, z + 0.3), bevel=0, mat=paint("brass"))
        coffins.append(lid_cross)
    return join(coffins, "Main")


@asset("Barrel", collide="Hull")
def barrel():
    wood = paint("wood", grain="Z")
    body = cyl(0.55, 1.3, loc=(0, 0, 0.65), verts=14, bevel=0.03, seg=1, mat=wood)
    for v in body.data.vertices:
        k = 1 + 0.12 * (1 - ((v.co.z - 0.65) / 0.65) ** 2)
        v.co.x *= k
        v.co.y *= k
    body.data.update()
    bands = [torus(0.6, 0.035, loc=(0, 0, z), seg=14, minor_seg=4, mat=paint("iron")) for z in (0.25, 1.05)]
    return join([body] + bands, "Main")


@asset("Crate", collide="Box")
def crate():
    wood = paint("oldwood", grain="X")
    shell = box((1.2, 1.2, 1.1), loc=(0, 0, 0.55), bevel=0.04, seg=1, mat=wood)
    braces = [box((1.25, 0.06, 0.15), loc=(0, -0.62, 0.55), rot=(0, a, 0), bevel=0, mat=paint("wood", grain="X"))
              for a in (40, -40)]
    return join([shell] + braces, "Main")
