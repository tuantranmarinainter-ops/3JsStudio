"""Batch 2: plot stations, the gate, bodies, the donkey cart, Mort, tools and town-square props.

Origins: ground centre, front (where players or zombies stand) facing -Y, unless noted.
Blender axes -> Roblox: X -> -X, Y -> Z, Z -> Y. So a Roblox size (x, y, z) is a Blender box (x, z, y).
Parts named "Sign" are blank wooden boards that the game writes on with a SurfaceGui.
"""

import math
import random

from mathutils import Vector

from mhg import (asset, ball, box, chip, cut, cut_below, cyl, from_profile, ico, join, lean, paint, radial, solid,
                 taper, torus, tube, wobble)


def _sign(width, height, loc, depth=0.1, rot=(0, 0, 0)):
    board = box((width, depth, height), loc=loc, rot=rot, bevel=0.03, seg=1, mat=paint("wood", grain="X"), cuts=2)
    wobble(board, 0.015, 2.0, seed=int(width * 10))
    board["rbx_collide"] = False
    return board


def _candle(x, y, z, height=0.45, radius=0.11):
    wax = cyl(radius, height, loc=(x, y, z + height / 2), verts=8, bevel=0.02, seg=1, mat=paint("wax"))
    wobble(wax, 0.01, 4, seed=int(abs(x * 100 + y * 10)))
    dish = cyl(radius * 2, 0.05, loc=(x, y, z + 0.025), verts=10, bevel=0, mat=paint("brass"))
    flame = ico(0.06, loc=(x, y, z + height + 0.09), scale=(1, 1, 1.8), level=1)
    return [wax, dish], flame


def _flames(flames, color="#FFC46A"):
    part = join(flames, "Flames")
    part.data.materials.append(solid(color, "Neon"))
    part["rbx_collide"] = False
    return part


def _skull(loc, scale=1.0, mat=None):
    """Friendly cartoon skull (round cranium, dark eye sockets carved in)."""
    mat = mat or paint("bone")
    s = scale
    x, y, z = loc
    cranium = ball(0.5 * s, loc=(x, y, z + 0.5 * s), scale=(1.0, 1.0, 0.95), segs=16, rings=10, mat=mat)
    face = box((0.62 * s, 0.4 * s, 0.38 * s), loc=(x, y - 0.22 * s, z + 0.22 * s), bevel=0.12 * s, seg=2, mat=mat)
    skull = join([cranium, face], "skull")
    for side in (-1, 1):
        cut(skull, ball(0.13 * s, loc=(x + side * 0.19 * s, y - 0.44 * s, z + 0.5 * s), segs=10, rings=6))
    cut(skull, from_profile([(-0.06 * s, 0), (0.06 * s, 0), (0, 0.1 * s)], 0.3 * s,
                            loc=(x, y - 0.5 * s, z + 0.3 * s), bevel=0))
    return skull


# ---------------------------------------------------------------- plot stations

@asset("Station_MorgueTable")
def morgue_table():
    stone = paint("marble", tint=("#6E6C6A", "#A9A6A0", "#D8D4CC"))
    slab = box((3.0, 5.8, 0.32), loc=(0, 0, 2.78), bevel=0.07, seg=2, mat=stone, cuts=3)
    cut(slab, box((2.5, 5.3, 0.2), loc=(0, 0, 2.98), bevel=0))
    wobble(slab, 0.02, 1.5, seed=1)
    legs = []
    for y in (-1.9, 1.9):
        leg = box((1.0, 0.9, 2.65), loc=(0, y, 1.3), bevel=0.08, seg=1, mat=paint("darkstone", moss=0.4), cuts=2)
        taper(leg, top=0.8)
        wobble(leg, 0.03, 1.6, seed=int(y * 10))
        legs.append(leg)
    beam = box((0.4, 3.4, 0.35), loc=(0, 0, 0.75), bevel=0.04, seg=1, mat=paint("wood", grain="Y"))
    cloth = box((1.1, 0.8, 0.12), loc=(0.6, 2.3, 2.98), rot=(0, 0, 8), bevel=0.05, seg=2, mat=paint("cloth"), cuts=2)
    wobble(cloth, 0.03, 3, seed=4)
    wax, flame = _candle(-1.05, -2.45, 2.94)
    bucket = cyl(0.42, 0.6, loc=(0.9, -1.1, 0.3), verts=12, bevel=0.03, seg=1, r2=0.5, mat=paint("wood", grain="Z"))
    bands = [torus(0.47, 0.035, loc=(0.9, -1.1, z), seg=12, minor_seg=4, mat=paint("iron")) for z in (0.12, 0.5)]
    main = join([slab, beam, cloth, bucket] + legs + wax + bands, "Main")
    sign = _sign(1.7, 0.55, loc=(0, -2.98, 2.25))
    return {"Main": main, "Sign": sign, "Flames": _flames([flame])}


@asset("Station_Workbench")
def workbench():
    top_wood = paint("wood", grain="X")
    leg_wood = paint("oldwood", grain="Z")
    planks = []
    for i, y in enumerate((-0.82, 0.0, 0.82)):
        plank = box((5.0, 0.8, 0.24), loc=(0, y, 2.86), bevel=0.04, seg=1, mat=top_wood, cuts=2)
        wobble(plank, 0.02, 1.4, seed=10 + i)
        planks.append(plank)
    legs = []
    for x in (-2.15, 2.15):
        for y in (-0.95, 0.95):
            leg = box((0.32, 0.32, 2.75), loc=(x, y, 1.37), bevel=0.04, seg=1, mat=leg_wood, cuts=2)
            wobble(leg, 0.02, 1.5, seed=int(x * 10 + y * 7))
            legs.append(leg)
    shelf = [box((4.4, 0.55, 0.12), loc=(0, y, 0.6), bevel=0.03, seg=1, mat=top_wood) for y in (-0.35, 0.35)]
    pile = [box((3.6, 0.45, 0.14), loc=(0.1, 0, 0.73 + i * 0.15), rot=(0, 0, i * 4 - 4), bevel=0.03, seg=1,
                mat=paint("wood", grain="X")) for i in range(3)]
    iron = paint("iron", rust=0.4)
    vise = [box((0.5, 0.6, 0.45), loc=(-2.2, -1.25, 2.85), bevel=0.04, seg=1, mat=iron),
            cyl(0.05, 0.9, loc=(-2.2, -1.65, 2.85), rot=(0, 90, 0), verts=6, bevel=0, mat=iron),
            cyl(0.07, 0.5, loc=(-2.2, -1.6, 2.85), rot=(90, 0, 0), verts=6, bevel=0, mat=iron)]
    saw = [box((1.5, 0.03, 0.45), loc=(0.7, -0.2, 3.03), rot=(90, 0, 12), bevel=0, mat=iron),
           box((0.45, 0.12, 0.3), loc=(1.55, 0.0, 3.05), rot=(0, 0, 12), bevel=0.04, seg=1, mat=paint("wood"))]
    hammer = [cyl(0.05, 1.0, loc=(-0.8, 0.35, 3.04), rot=(0, 90, -25), verts=6, bevel=0, mat=paint("wood")),
              box((0.18, 0.4, 0.18), loc=(-1.25, 0.13, 3.06), rot=(0, 0, -25), bevel=0.02, seg=1, mat=iron)]
    main = join(planks + legs + shelf + pile + vise + saw + hammer, "Main")
    sign = _sign(1.8, 0.5, loc=(0.6, -1.28, 2.4))
    return {"Main": main, "Sign": sign}


@asset("Station_Altar", texture=1024)
def altar():
    stone = paint("darkstone", moss=0.4)
    base = cyl(3.1, 0.9, loc=(0, 0, 0.45), verts=8, bevel=0.08, seg=2, rot=(0, 0, 22.5), mat=stone)
    top = cyl(2.5, 0.6, loc=(0, 0, 1.2), verts=8, bevel=0.06, seg=2, rot=(0, 0, 22.5), mat=paint("stone", moss=0.3))
    ring_outer = cyl(1.95, 0.3, loc=(0, 0, 1.5), verts=32, bevel=0)
    cut(ring_outer, cyl(1.7, 0.5, loc=(0, 0, 1.5), verts=32, bevel=0))
    cut(top, ring_outer)
    step = box((2.2, 0.9, 0.45), loc=(0, -3.2, 0.22), bevel=0.06, seg=1, mat=stone)
    for part, seed in ((base, 21), (top, 22), (step, 23)):
        wobble(part, 0.04, 1.2, seed=seed)
    pieces, flames = [base, top, step], []
    for i in range(4):
        a = math.radians(45 + i * 90)
        wax, flame = _candle(math.cos(a) * 2.1, math.sin(a) * 2.1, 1.5, height=0.55, radius=0.13)
        pieces += wax
        flames.append(flame)
    pieces.append(_skull((-2.4, -1.4, 0.9), scale=0.55))
    pieces.append(_skull((2.3, -1.6, 0.9), scale=0.5))
    rune_ring = cyl(1.92, 0.04, loc=(0, 0, 1.44), verts=32, bevel=0)
    cut(rune_ring, cyl(1.73, 0.2, loc=(0, 0, 1.44), verts=32, bevel=0))
    glyphs = []
    for i in range(6):
        a = i * math.tau / 6
        glyphs.append(box((0.5, 0.08, 0.04), loc=(math.cos(a) * 1.2, math.sin(a) * 1.2, 1.51),
                          rot=(0, 0, math.degrees(a) + 90), bevel=0))
        glyphs.append(box((0.08, 0.3, 0.04), loc=(math.cos(a) * 1.35, math.sin(a) * 1.35, 1.51),
                          rot=(0, 0, math.degrees(a) + 90), bevel=0))
    glyphs.append(cyl(0.35, 0.04, loc=(0, 0, 1.51), verts=6, bevel=0))
    rune = join([rune_ring] + glyphs, "Rune")
    rune.data.materials.append(solid("#7CFF6A", "Neon"))
    rune["rbx_collide"] = False
    return {"Main": join(pieces, "Main"), "Rune": rune, "Flames": _flames(flames)}


def _station_sign(x):
    return _sign(1.2, 0.42, loc=(x, -1.45, 0.9), rot=(-8, 0, 0))


@asset("Station_Woodcutter")
def station_woodcutter():
    bark = paint("bark", grain="Z", moss=0.3)
    stump = cyl(0.75, 0.9, loc=(0, 0, 0.45), verts=12, bevel=0.05, seg=1, r2=0.68, mat=bark)
    radial(stump, 7, 0.06)
    wobble(stump, 0.04, 2, seed=31)
    rings = cyl(0.66, 0.04, loc=(0, 0, 0.91), verts=12, bevel=0, mat=paint("wood", grain="X"))
    logs = []
    for i, (y, z) in enumerate(((0.95, 0.28), (1.45, 0.28), (1.2, 0.72))):
        log = cyl(0.28, 1.8, loc=(0.2, y, z), rot=(0, 90, 0), verts=8, bevel=0.03, seg=1, mat=bark)
        wobble(log, 0.03, 2, seed=40 + i)
        logs.append(log)
    iron = paint("iron", rust=0.3)
    axe = [cyl(0.06, 1.2, loc=(0.25, -0.2, 1.35), rot=(0, 35, 0), verts=6, bevel=0, mat=paint("wood")),
           box((0.5, 0.08, 0.4), loc=(-0.05, -0.2, 0.98), rot=(0, 35, 0), bevel=0.02, seg=1, mat=iron)]
    rng = random.Random(33)
    chips = [box((0.16, 0.1, 0.04), loc=(rng.uniform(-1.2, 1.2), rng.uniform(-1.2, 0.3), 0.02),
                 rot=(0, 0, rng.uniform(0, 180)), bevel=0, mat=paint("wood")) for _ in range(9)]
    return {"Main": join([stump, rings] + logs + axe + chips, "Main"), "Sign": _station_sign(-0.9)}


@asset("Station_Stonecutter")
def station_stonecutter():
    pallet = [box((1.9, 0.3, 0.12), loc=(0, y, 0.18), bevel=0.02, seg=1, mat=paint("oldwood", grain="X"))
              for y in (-0.6, -0.2, 0.2, 0.6)]
    pallet += [box((0.25, 1.6, 0.12), loc=(x, 0, 0.06), bevel=0.02, seg=1, mat=paint("oldwood", grain="Y"))
               for x in (-0.75, 0.75)]
    block = box((1.3, 1.0, 0.9), loc=(0, 0, 0.7), bevel=0.06, seg=1, mat=paint("stone"), cuts=2)
    chip(block, count=2, size=0.25, seed=34)
    wobble(block, 0.03, 1.5, seed=35)
    iron = paint("iron", rust=0.3)
    tools = [cyl(0.04, 0.6, loc=(0.2, -0.1, 1.2), rot=(0, 70, 30), verts=6, bevel=0, mat=iron),
             cyl(0.05, 0.7, loc=(-0.3, 0.2, 1.18), rot=(0, 90, -20), verts=6, bevel=0, mat=paint("wood")),
             box((0.25, 0.25, 0.3), loc=(-0.62, 0.33, 1.2), rot=(0, 0, -20), bevel=0.03, seg=1, mat=paint("wood"))]
    rng = random.Random(36)
    bricks = []
    for i in range(5):
        bricks.append(box((0.5, 0.3, 0.25), loc=(rng.uniform(-0.9, 0.9), 1.15 + rng.uniform(-0.15, 0.15),
                                                 0.13 + (0.26 if i == 4 else 0)),
                          rot=(0, 0, rng.uniform(-15, 15)), bevel=0.03, seg=1, mat=paint("stone")))
    return {"Main": join(pallet + [block] + tools + bricks, "Main"), "Sign": _station_sign(-0.95)}


@asset("Station_Miner")
def station_miner():
    wood = paint("oldwood", grain="X")
    iron = paint("iron", rust=0.6)
    bed = box((1.8, 1.3, 0.9), loc=(0, 0, 0.75), bevel=0.05, seg=1, mat=wood, cuts=1)
    taper(bed, top=1.12)
    cut(bed, box((1.55, 1.05, 0.9), loc=(0, 0, 1.0), bevel=0))
    rims = [box((1.95, 0.08, 0.1), loc=(0, y, 1.2), bevel=0, mat=iron) for y in (-0.72, 0.72)]
    wheels = [cyl(0.24, 0.12, loc=(x, y, 0.24), rot=(0, 90, 0), verts=10, bevel=0.02, seg=1, mat=iron)
              for x in (-0.95, 0.95) for y in (-0.42, 0.42)]
    rng = random.Random(37)
    ore = []
    for i in range(7):
        nugget = ico(rng.uniform(0.2, 0.3), loc=(rng.uniform(-0.55, 0.55), rng.uniform(-0.35, 0.35),
                                                 1.15 + rng.uniform(0, 0.15)), level=1,
                     mat=paint("ore") if i % 2 == 0 else paint("darkstone"))
        wobble(nugget, 0.04, 3, seed=50 + i)
        ore.append(nugget)
    pick = [cyl(0.05, 1.5, loc=(1.15, -0.2, 0.7), rot=(0, -25, 0), verts=6, bevel=0, mat=paint("wood")),
            tube([(0.75, -0.2, 1.25), (1.45, -0.2, 1.52), (2.0, -0.2, 1.3)], 0.06, verts=6, taper=0.4, mat=iron)]
    return {"Main": join([bed] + rims + wheels + ore + pick, "Main"), "Sign": _station_sign(-1.0)}


@asset("Gate_Arch", texture=1024)
def gate_arch():
    stone = paint("stone", moss=0.6)
    pillars = []
    for x in (-7.0, 7.0):
        plinth = box((2.0, 2.0, 0.6), loc=(x, 0, 0.3), bevel=0.08, seg=1, mat=stone)
        shaft = box((1.5, 1.5, 6.6), loc=(x, 0, 3.9), bevel=0.08, seg=1, mat=stone, cuts=3)
        cap = box((1.9, 1.9, 0.45), loc=(x, 0, 7.4), bevel=0.08, seg=1, mat=stone)
        finial = ball(0.45, loc=(x, 0, 8.05), segs=12, rings=8, mat=stone)
        for part, seed in ((plinth, 1), (shaft, 2), (cap, 3)):
            wobble(part, 0.04, 1.2, seed=seed + int(x))
        chip(shaft, count=2, size=0.35, seed=int(x) + 9)
        pillars += [plinth, shaft, cap, finial]
    iron = paint("iron", rust=0.4)
    arc = [(x, 0, 7.3 + 2.0 * math.cos(x / 6.2 * math.pi / 2)) for x in [i * 0.62 - 6.2 for i in range(21)]]
    lower = [(x, 0, z - 0.6) for x, _, z in arc]
    bars = [tube(arc, 0.11, verts=6, mat=iron), tube(lower, 0.08, verts=6, mat=iron)]
    for x, _, z in arc[1:-1:2]:
        bars.append(cyl(0.05, 0.75, loc=(x, 0, z - 0.3), verts=6, bevel=0, mat=iron))
        bars.append(cyl(0.09, 0.3, loc=(x, 0, z + 0.22), verts=6, bevel=0, r2=0.0, mat=iron))
    for side in (-1, 1):
        bars.append(torus(0.3, 0.05, loc=(side * 5.2, 0, 7.75), rot=(90, 0, 0), seg=12, minor_seg=4, mat=iron))
    chains = []
    for x in (-3.6, 3.6):
        z_top = 7.3 + 2.0 * math.cos(x / 6.2 * math.pi / 2) - 0.6
        for i in range(4):
            chains.append(torus(0.1, 0.025, loc=(x, 0, z_top - 0.12 - i * 0.17), rot=(90 * (i % 2), 0, 90),
                                seg=8, minor_seg=4, mat=iron))
    deck = []
    rng = random.Random(61)
    for i in range(6):
        plank = box((11.6, 0.62, 0.16), loc=(rng.uniform(-0.1, 0.1), 1.25 + i * 0.66, 0.08), rot=(0, 0, rng.uniform(-1, 1)),
                    bevel=0.03, seg=1, mat=paint("oldwood", grain="X"), cuts=2)
        wobble(plank, 0.015, 2, seed=70 + i)
        deck.append(plank)
    main = join(pillars + bars + chains + deck, "Main")
    sign = _sign(8.4, 1.7, loc=(0, 0, 6.15), depth=0.22)
    return {"Main": main, "Sign": sign}


@asset("Fence_PlotSegment")
def fence_plot_segment():
    iron = paint("iron", rust=0.4)
    pieces = [box((8.0, 0.1, 0.1), loc=(0, 0, z), bevel=0, mat=iron) for z in (0.35, 2.3)]
    for i in range(20):
        x = -3.8 + i * 0.4
        pieces.append(cyl(0.04, 2.3, loc=(x, 0, 1.25), verts=6, bevel=0, mat=iron))
        pieces.append(cyl(0.08, 0.24, loc=(x, 0, 2.5), verts=6, bevel=0, r2=0.0, mat=iron))
    for x in (-2.0, 2.0):
        pieces.append(torus(0.22, 0.035, loc=(x, 0, 1.95), rot=(90, 0, 0), seg=10, minor_seg=4, mat=iron))
    stone = paint("stone", moss=0.7)
    pillar = box((0.9, 0.9, 3.0), loc=(4.0, 0, 1.5), bevel=0.06, seg=1, mat=stone, cuts=2)
    wobble(pillar, 0.04, 1.4, seed=81)
    cap = box((1.1, 1.1, 0.28), loc=(4.0, 0, 3.12), bevel=0.06, seg=1, mat=stone)
    return join(pieces + [pillar, cap], "Main")


# ---------------------------------------------------------------- characters and carried things

def _bundle(length, width, height, loc=(0, 0, 0), seed=0):
    """A body wrapped in cloth and tied with rope (centred on loc)."""
    x, y, z = loc
    cloth = ico(1.0, loc=loc, scale=(width / 2, length / 2, height / 2), level=3, mat=paint("cloth"))
    wobble(cloth, 0.05 * width, 2.2, seed=seed)
    pieces = [cloth]
    rope = paint("rope")
    for t in (-0.6, 0.0, 0.6):
        k = math.sqrt(max(0.05, 1 - t * t))
        tie = torus(1.0, 0.07, loc=(x, y + t * length / 2, z), rot=(90, 0, 0), seg=14, minor_seg=4, mat=rope)
        tie.data.transform(_scale_about(Vector((x, y + t * length / 2, z)), (width / 2 * k + 0.03, 1, height / 2 * k + 0.03)))
        pieces.append(tie)
    return pieces


def _scale_about(center, factors):
    from mathutils import Matrix
    c = Vector(center)
    return Matrix.Translation(c) @ Matrix.Diagonal((*factors, 1.0)) @ Matrix.Translation(-c)


@asset("Body_Wrapped")
def body_wrapped():
    """Centred on its middle (not the ground): BodyService positions bodies by their centre."""
    pieces = _bundle(5.0, 1.8, 1.1, seed=91)
    tag = box((0.36, 0.03, 0.26), loc=(0.92, 0.1, -0.05), rot=(0, 0, 90), bevel=0.01, seg=1, mat=paint("paper"))
    string = cyl(0.015, 0.3, loc=(0.92, 0.05, 0.15), rot=(10, 0, 0), verts=4, bevel=0, mat=paint("rope"))
    return join(pieces + [tag, string], "Main")


@asset("Donkey_Cart", texture=1024, collide="Box")
def donkey_cart():
    """Origin on the ground under the donkey's middle, walking toward -Y; the cart trails behind (+Y)."""
    fur, dark, cream = paint("fur"), paint("darkfur"), paint("cream")
    body = ico(1.0, loc=(0, 0, 2.8), scale=(1.1, 2.1, 1.0), level=3, mat=fur)
    wobble(body, 0.05, 1.5, seed=101)
    neck = tube([(0, -1.5, 3.1), (0, -2.1, 3.7), (0, -2.45, 4.2)], 0.55, verts=10, taper=0.85, mat=fur)
    head = ball(0.62, loc=(0, -2.85, 4.25), scale=(0.95, 1.35, 0.95), segs=16, rings=10, rot=(-28, 0, 0), mat=fur)
    muzzle = ball(0.5, loc=(0, -3.55, 3.85), scale=(1.0, 1.0, 0.85), segs=14, rings=8, mat=cream)
    ears = []
    for side in (-1, 1):
        ear = cyl(0.2, 1.25, loc=(side * 0.35, -2.55, 5.05), verts=8, bevel=0, r2=0.06, rot=(-15, side * 22, 0),
                  mat=fur)
        ear.scale = (1.0, 0.55, 1.0)
        ears.append(ear)
    eyes = [ball(0.11, loc=(side * 0.43, -3.15, 4.42), segs=10, rings=6, mat=paint("slate")) for side in (-1, 1)]
    mane = [box((0.22, 0.32, 0.4), loc=(0, -1.55 - i * 0.28, 3.65 + i * 0.3), rot=(-35, 0, 0), bevel=0.06, seg=1,
                mat=dark) for i in range(4)]
    legs, hooves = [], []
    for x in (-0.62, 0.62):
        for y in (-1.35, 1.35):
            legs.append(tube([(x, y, 2.4), (x * 1.02, y * 1.02, 1.2), (x * 1.04, y * 1.04, 0.3)], 0.26, verts=8,
                             taper=0.72, mat=fur))
            hooves.append(cyl(0.22, 0.3, loc=(x * 1.04, y * 1.04, 0.15), verts=8, bevel=0.03, seg=1, mat=dark))
    tail = tube([(0, 2.05, 3.1), (0, 2.45, 2.6), (0, 2.5, 1.9)], 0.08, verts=6, mat=dark)
    tuft = ico(0.2, loc=(0, 2.5, 1.8), scale=(1, 1, 1.6), level=1, mat=dark)
    blanket = box((2.4, 1.6, 0.12), loc=(0, 0.2, 3.72), bevel=0.05, seg=2, mat=paint("redcloth"), cuts=3)
    for v in blanket.data.vertices:
        v.co.z -= 0.35 * (abs(v.co.x) / 1.2) ** 2  # drape over the back
    blanket.data.update()
    collar = torus(0.62, 0.1, loc=(0, -1.55, 3.25), rot=(60, 0, 0), seg=16, minor_seg=6, mat=paint("leather"))
    donkey = join([body, neck, head, muzzle, tail, tuft, blanket, collar] + ears + eyes + mane + legs + hooves,
                  "Donkey")

    wood, iron = paint("wood", grain="Y"), paint("iron", rust=0.5)
    bed = box((3.2, 3.4, 0.25), loc=(0, 5.4, 1.75), bevel=0.04, seg=1, mat=wood)
    sides = [box((0.15, 3.4, 0.7), loc=(x, 5.4, 2.2), bevel=0.03, seg=1, mat=wood) for x in (-1.55, 1.55)]
    sides += [box((3.2, 0.15, 0.7), loc=(0, y, 2.2), bevel=0.03, seg=1, mat=paint("wood", grain="X"))
              for y in (3.75, 7.05)]
    wheels = []
    for x in (-1.85, 1.85):
        wheels.append(torus(0.95, 0.12, loc=(x, 5.4, 1.0), rot=(0, 90, 0), seg=20, minor_seg=6, mat=iron))
        wheels.append(cyl(0.2, 0.3, loc=(x, 5.4, 1.0), rot=(0, 90, 0), verts=10, bevel=0.02, seg=1, mat=wood))
        for i in range(6):
            a = i * 30
            wheels.append(box((0.08, 0.1, 1.85), loc=(x, 5.4, 1.0), rot=(a, 0, 0), bevel=0, mat=wood))
    axle = cyl(0.08, 3.9, loc=(0, 5.4, 1.0), rot=(0, 90, 0), verts=8, bevel=0, mat=iron)
    shafts = [tube([(x, 3.75, 1.9), (x * 1.05, 2.0, 2.45), (x * 1.1, 0.4, 2.75)], 0.07, verts=6, mat=wood)
              for x in (-0.95, 0.95)]
    load = _bundle(3.0, 1.3, 0.8, loc=(0, 5.4, 2.3), seed=103)
    cart = join([bed, axle] + sides + wheels + shafts + load, "Cart")
    return {"Donkey": donkey, "Cart": cart}


@asset("Mort_Skull", collide="Box")
def mort_skull():
    """Mort, the talking skull. Centred on the cranium; faces -Y. The jaw is separate so it can chatter."""
    bone = paint("bone")
    cranium = ball(0.62, loc=(0, 0, 0.15), scale=(1.0, 1.05, 0.95), segs=24, rings=14, mat=bone)
    cheeks = box((0.86, 0.6, 0.5), loc=(0, -0.3, -0.25), bevel=0.2, seg=3, mat=bone)
    skull = join([cranium, cheeks], "Skull")
    for side in (-1, 1):
        cut(skull, ball(0.2, loc=(side * 0.24, -0.6, 0.05), scale=(1.0, 0.8, 1.15), segs=12, rings=8))
    cut(skull, from_profile([(-0.08, 0), (0.08, 0), (0, 0.15)], 0.4, loc=(0, -0.68, -0.25), bevel=0))
    teeth = [box((0.1, 0.08, 0.13), loc=(x, -0.62, -0.47), bevel=0.02, seg=1, mat=bone)
             for x in (-0.2, -0.07, 0.07, 0.2)]
    skull = join([skull] + teeth, "Skull")
    jaw = box((0.7, 0.55, 0.22), loc=(0, -0.3, -0.66), bevel=0.1, seg=2, mat=bone)
    jaw_teeth = [box((0.09, 0.07, 0.1), loc=(x, -0.55, -0.52), bevel=0.02, seg=1, mat=bone)
                 for x in (-0.18, -0.06, 0.06, 0.18)]
    jaw = join([jaw] + jaw_teeth, "Jaw")
    jaw["rbx_collide"] = False
    eyes = join([ball(0.09, loc=(side * 0.24, -0.6, 0.05), segs=10, rings=6) for side in (-1, 1)], "Eyes")
    eyes.data.materials.append(solid("#9CFF6A", "Neon"))
    eyes["rbx_collide"] = False
    skull["rbx_collide"] = False
    return {"Skull": skull, "Jaw": jaw, "Eyes": eyes}


# ---------------------------------------------------------------- held tools (origin at the grip, hanging down -Z)

def _handle(length, radius=0.11):
    return cyl(radius, length, loc=(0, 0, -length / 2 + 0.2), verts=8, bevel=0.02, seg=1,
               mat=paint("wood", grain="Z"))


@asset("Tool_Shovel")
def tool_shovel():
    handle = _handle(3.3)
    grip = torus(0.2, 0.05, loc=(0, 0, 0.42), rot=(90, 0, 0), seg=12, minor_seg=4, mat=paint("wood"))
    blade_outline = [(-0.5, 0.0), (0.5, 0.0), (0.48, -0.85), (0.25, -1.15), (0.0, -1.25), (-0.25, -1.15),
                     (-0.48, -0.85)]
    blade = from_profile([(x, z - 3.1) for x, z in blade_outline], 0.06, bevel=0.02, seg=1,
                         mat=paint("iron", rust=0.3))
    socket = cyl(0.14, 0.35, loc=(0, 0, -3.0), verts=8, bevel=0, r2=0.2, mat=paint("iron", rust=0.3))
    tool = join([handle, grip, blade, socket], "Main")
    tool["rbx_collide"] = False
    return tool


@asset("Tool_Axe")
def tool_axe():
    handle = _handle(3.0)
    head_outline = [(-0.15, 0.25), (0.25, 0.3), (0.85, 0.55), (0.95, 0.0), (0.85, -0.55), (0.25, -0.3), (-0.15, -0.25)]
    head = from_profile([(x, z - 2.6) for x, z in head_outline], 0.18, bevel=0.03, seg=1, mat=paint("iron", rust=0.3))
    tool = join([handle, head], "Main")
    tool["rbx_collide"] = False
    return tool


@asset("Tool_Pickaxe")
def tool_pickaxe():
    handle = _handle(3.1)
    iron = paint("iron", rust=0.3)
    head = tube([(-1.05, 0, -2.55), (-0.5, 0, -2.8), (0, 0, -2.85), (0.5, 0, -2.8), (1.05, 0, -2.55)], 0.11,
                verts=8, taper=1.0, mat=iron)
    tips = [cyl(0.11, 0.35, loc=(s * 1.18, 0, -2.47), rot=(0, s * -62, 0), verts=8, bevel=0, r2=0.0, mat=iron)
            for s in (-1, 1)]
    collar = box((0.3, 0.3, 0.36), loc=(0, 0, -2.83), bevel=0.04, seg=1, mat=iron)
    tool = join([handle, head, collar] + tips, "Main")
    tool["rbx_collide"] = False
    return tool


# ---------------------------------------------------------------- town square

@asset("Board_Notice", texture=1024)
def notice_board():
    """Frame for the Top Graveyards board. The game's own board part (14 x 10.7) sits inside at z 1.15..11.85."""
    wood = paint("wood", grain="Z")
    plank = paint("wood", grain="X")
    posts = []
    for x in (-7.55, 7.55):
        post = box((0.7, 0.7, 13.4), loc=(x, 0.1, 6.7), bevel=0.06, seg=1, mat=wood, cuts=3)
        wobble(post, 0.04, 1.2, seed=int(x * 3))
        posts.append(post)
    frame = [box((15.4, 0.5, 0.5), loc=(0, 0.05, z), bevel=0.05, seg=1, mat=plank) for z in (0.95, 12.05)]
    roof = []
    for side in (-1, 1):
        r = box((16.8, 1.7, 0.18), loc=(0, side * 0.55, 13.35), rot=(-side * 28, 0, 0), bevel=0.04, seg=1,
                mat=paint("darkstone"), cuts=4)
        wobble(r, 0.03, 1.5, seed=110 + side)
        roof.append(r)
    ridge = box((17.0, 0.25, 0.25), loc=(0, 0, 13.75), bevel=0.04, seg=1, mat=plank)
    lanterns, flames = [], []
    for x in (-7.55, 7.55):
        lanterns.append(box((0.5, 0.5, 0.6), loc=(x, -0.65, 10.6), bevel=0.04, seg=1, mat=paint("iron")))
        flames.append(ico(0.14, loc=(x, -0.92, 10.6), scale=(1, 0.4, 1.5), level=1))
    main = join(posts + frame + roof + [ridge] + lanterns, "Main")
    return {"Main": main, "Flames": _flames(flames)}


@asset("Sign_DonkeyStop")
def donkey_stop():
    wood = paint("wood", grain="Z")
    posts = [box((0.45, 0.45, 5.0), loc=(x, 0, 2.5), bevel=0.05, seg=1, mat=wood, cuts=2) for x in (-2.9, 2.9)]
    for i, post in enumerate(posts):
        wobble(post, 0.03, 1.5, seed=120 + i)
    shoe = torus(0.32, 0.07, loc=(0, -0.22, 4.85), rot=(90, 0, 0), seg=14, minor_seg=4, mat=paint("iron"))
    cut(shoe, box((0.5, 0.5, 0.4), loc=(0, -0.22, 4.6), bevel=0))
    hay = box((1.6, 1.0, 0.9), loc=(3.9, 0.2, 0.45), rot=(0, 0, 12), bevel=0.15, seg=2, mat=paint("straw"), cuts=2)
    wobble(hay, 0.06, 3, seed=125)
    hay_bands = [box((0.08, 1.05, 0.95), loc=(3.9 + dx, 0.2, 0.45), rot=(0, 0, 12), bevel=0.02, seg=1,
                     mat=paint("rope")) for dx in (-0.4, 0.4)]
    trough = box((2.2, 0.8, 0.6), loc=(-3.9, 0.1, 0.32), bevel=0.04, seg=1, mat=paint("oldwood", grain="X"))
    cut(trough, box((2.0, 0.6, 0.6), loc=(-3.9, 0.1, 0.55), bevel=0))
    main = join(posts + [shoe, hay, trough] + hay_bands, "Main")
    sign = _sign(6.2, 2.0, loc=(0, -0.05, 3.6), depth=0.22)
    return {"Main": main, "Sign": sign}


@asset("Well", texture=1024, collide="Hull")
def well():
    stone = paint("stone", moss=0.6)
    wall = cyl(1.6, 1.2, loc=(0, 0, 0.6), verts=16, bevel=0.06, seg=1, mat=stone)
    cut(wall, cyl(1.2, 1.6, loc=(0, 0, 0.75), verts=16, bevel=0))
    wobble(wall, 0.05, 1.3, seed=131)
    water = cyl(1.22, 0.05, loc=(0, 0, 0.55), verts=16, bevel=0, mat=paint("slate"))
    wood = paint("wood", grain="Z")
    posts = [box((0.3, 0.3, 3.0), loc=(x, 0, 2.3), bevel=0.04, seg=1, mat=wood) for x in (-1.45, 1.45)]
    roof = [box((3.6, 1.6, 0.14), loc=(0, s * 0.62, 4.05), rot=(-s * 32, 0, 0), bevel=0.03, seg=1,
                mat=paint("oldwood", grain="X"), cuts=3) for s in (-1, 1)]
    crank = [cyl(0.12, 3.1, loc=(0, 0, 3.1), rot=(0, 90, 0), verts=8, bevel=0, mat=wood),
             box((0.08, 0.08, 0.55), loc=(1.75, 0, 2.85), bevel=0, mat=paint("iron"))]
    rope = cyl(0.03, 1.3, loc=(0, 0, 2.4), verts=4, bevel=0, mat=paint("rope"))
    bucket = cyl(0.28, 0.4, loc=(0, 0, 1.55), verts=10, bevel=0.02, seg=1, r2=0.33, mat=paint("wood", grain="Z"))
    return join([wall, water, rope, bucket] + posts + roof + crank, "Main")


@asset("Bench")
def bench():
    wood = paint("wood", grain="X")
    iron = paint("iron", rust=0.3)
    seat = [box((3.4, 0.32, 0.1), loc=(0, y, 1.05), bevel=0.02, seg=1, mat=wood) for y in (-0.3, 0.05, 0.4)]
    back = [box((3.4, 0.1, 0.28), loc=(0, 0.62, z), rot=(-10, 0, 0), bevel=0.02, seg=1, mat=wood) for z in (1.5, 1.9)]
    legs = []
    for x in (-1.45, 1.45):
        legs.append(tube([(x, -0.4, 0.0), (x, -0.35, 1.0), (x, 0.45, 1.0), (x, 0.65, 2.1)], 0.06, verts=6, mat=iron))
        legs.append(tube([(x, 0.45, 0.0), (x, 0.4, 1.0)], 0.06, verts=6, mat=iron))
    return join(seat + back + legs, "Main")
