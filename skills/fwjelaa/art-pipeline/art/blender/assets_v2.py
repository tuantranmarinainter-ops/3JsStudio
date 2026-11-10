"""Batch 5 (v2 progression): the new gravestones and fence, the Build Mode hero decorations, and their UI icons.

Origins: ground centre of each prop, front facing -Y (same as assets_plot). Glowing bits (gems, souls, ghost water)
are separate untextured parts so they export as Roblox Neon/Glass.
"""

import math

from mhg import (arch_points, asset, ball, box, cut, cyl, from_profile, icon, ico, join, paint, solid, taper, text,
                 torus, tube, wobble)

import assets_plot
from assets_icons import GOLD, _circle_points, _disc, _relief, _squash_y, _star_points, _thumb
from assets_town import _skull

SILVER = ("#4A4E5A", "#A8AEBC", "#EEF2FF")
GHOST = "#96FFE6"
VIOLET = "#AA78FF"


# ---------------------------------------------------------------- gravestones and fence

@asset("Gravestone_MarbleObelisk", texture=1024)
def marble_obelisk():
    marble = paint("marble", moss=0.3)
    plinth = box((2.4, 1.6, 0.5), loc=(0, 0.05, 0.25), bevel=0.06, seg=2, mat=marble, cuts=2)
    step = box((1.7, 1.3, 0.4), loc=(0, 0.05, 0.7), bevel=0.05, seg=2, mat=marble, cuts=2)
    shaft = box((1.0, 1.0, 3.4), loc=(0, 0.05, 2.6), bevel=0.04, seg=1, mat=marble, cuts=4)
    taper(shaft, top=0.62)
    tip = cyl(0.5, 0.75, loc=(0, 0.05, 4.65), verts=4, bevel=0, r2=0.0, rot=(0, 0, 45), mat=marble)
    cut(shaft, text("R.I.P.", 0.28, 0.2, loc=(0, -0.48, 2.2), rot=(90, 0, 0)))
    for obj, seed in ((plinth, 31), (step, 32), (shaft, 33)):
        wobble(obj, 0.02, 1.6, seed=seed)
    orb = ball(0.22, loc=(0, 0.05, 5.12), segs=12, rings=8, mat=paint("brass", tint=GOLD))
    return join([plinth, step, shaft, tip, orb], "Main")


@asset("Gravestone_Mausoleum", texture=1024)
def mausoleum():
    stone = paint("darkstone", moss=0.5)
    marble = paint("marble", moss=0.25)
    base = box((3.6, 3.0, 0.45), loc=(0, 0.35, 0.22), bevel=0.06, seg=2, mat=marble, cuts=2)
    body = box((3.0, 2.4, 2.6), loc=(0, 0.45, 1.75), bevel=0.05, seg=2, mat=stone, cuts=3)
    door = box((1.0, 0.2, 1.7), loc=(0, -0.78, 1.3), bevel=0.03, seg=1, mat=paint("slate"))
    arch = from_profile(arch_points(1.3, 2.0, segments=10), 0.22, loc=(0, -0.72, 0.45), bevel=0.03, seg=1,
                        mat=marble)
    cut(arch, box((1.0, 0.6, 1.7), loc=(0, -0.72, 1.3), bevel=0))
    columns = [cyl(0.22, 2.7, loc=(x, -0.95, 1.8), verts=12, bevel=0.02, seg=1, mat=marble) for x in (-1.25, 1.25)]
    roof = from_profile([(-1.9, 3.05), (1.9, 3.05), (0, 4.05)], 3.0, loc=(0, 0.45, 0), bevel=0.05, seg=1,
                        mat=marble)
    cornice = box((3.5, 3.0, 0.25), loc=(0, 0.45, 3.0), bevel=0.04, seg=1, mat=marble)
    for obj, seed in ((body, 41), (roof, 42), (base, 43)):
        wobble(obj, 0.02, 1.5, seed=seed)
    gem = ico(0.22, loc=(0, -1.05, 3.55), level=1, mat=solid(VIOLET))
    return {"Main": join([base, body, door, arch, roof, cornice] + columns, "Main"), "Glow": gem}


@asset("Gravestone_SoulLantern", texture=1024)
def soul_lantern():
    stone = paint("darkstone", moss=0.4)
    iron = paint("iron", rust=0.3)
    base = box((1.7, 1.5, 0.5), loc=(0, 0, 0.25), bevel=0.06, seg=2, mat=stone, cuts=2)
    wobble(base, 0.03, 1.6, seed=51)
    pole = cyl(0.16, 2.6, loc=(0, 0, 1.8), verts=8, bevel=0.02, seg=1, mat=iron)
    bars = [cyl(0.05, 1.5, loc=(math.cos(a) * 0.55, math.sin(a) * 0.55, 3.85), verts=6, bevel=0, mat=iron)
            for a in (i * math.tau / 6 for i in range(6))]
    rings = [torus(0.56, 0.06, loc=(0, 0, z), seg=18, minor_seg=5, mat=iron) for z in (3.1, 4.6)]
    cap = cyl(0.7, 0.45, loc=(0, 0, 4.85), verts=6, bevel=0.02, seg=1, r2=0.12, mat=iron)
    glass = cyl(0.52, 1.45, loc=(0, 0, 3.85), verts=12, bevel=0, mat=solid(GHOST, kind="Glass", transparency=0.55))
    soul = ball(0.32, loc=(0, 0, 3.85), segs=12, rings=8, mat=solid(GHOST))
    return {"Main": join([base, pole, cap] + bars + rings, "Main"), "Glass": glass, "Glow": soul}


@asset("Fence_Silver")
def fence_silver():
    silver = paint("iron", tint=SILVER)
    pieces = assets_plot._rails(0.08, 0.08, 0.25, silver, bevel=0) + assets_plot._rails(0.08, 0.08, 1.35, silver,
                                                                                        bevel=0)
    for x, y, _ in assets_plot._perimeter(0.32):
        pieces.append(cyl(0.035, 1.45, loc=(x, y, 0.74), verts=6, bevel=0, mat=silver))
        pieces.append(cyl(0.08, 0.22, loc=(x, y, 1.56), verts=6, bevel=0, r2=0.0, mat=silver))
    for x in (-assets_plot.HALF_X, assets_plot.HALF_X):
        for y in (-assets_plot.HALF_Y, assets_plot.HALF_Y):
            pieces.append(box((0.18, 0.18, 1.7), loc=(x, y, 0.85), bevel=0.02, seg=1, mat=silver))
            pieces.append(ball(0.14, loc=(x, y, 1.78), segs=10, rings=6, mat=paint("brass", tint=GOLD)))
    return join(pieces, "Main")


# ---------------------------------------------------------------- Build Mode hero decorations

@asset("Decor_Gargoyle", texture=1024)
def gargoyle():
    stone = paint("stone", moss=0.6)
    pedestal = box((1.6, 1.6, 1.3), loc=(0, 0, 0.65), bevel=0.08, seg=2, mat=paint("darkstone", moss=0.5), cuts=2)
    wobble(pedestal, 0.03, 1.5, seed=61)
    body = ball(0.62, loc=(0, 0.1, 1.95), scale=(0.95, 0.85, 1.05), segs=16, rings=10, mat=stone)
    head = ball(0.45, loc=(0, -0.35, 2.75), scale=(1.0, 1.05, 0.95), segs=16, rings=10, mat=stone)
    snout = ball(0.22, loc=(0, -0.75, 2.62), scale=(1.1, 1.2, 0.8), segs=10, rings=6, mat=stone)
    horns = [cyl(0.1, 0.5, loc=(side * 0.25, -0.25, 3.18), rot=(10, side * -25, 0), verts=8, bevel=0, r2=0.0,
                 mat=stone) for side in (-1, 1)]
    claws = [ball(0.18, loc=(side * 0.32, -0.5, 1.42), scale=(1, 1.4, 0.7), segs=10, rings=6, mat=stone)
             for side in (-1, 1)]
    wing_outline = [(0.2, 1.9), (0.55, 2.6), (1.0, 3.1), (1.35, 3.05), (1.2, 2.7), (1.3, 2.45), (1.05, 2.3),
                    (1.1, 2.05), (0.8, 1.95)]
    wings = []
    for side in (-1, 1):
        outline = [(x * side, z) for x, z in wing_outline]
        if side < 0:
            outline.reverse()
        wing = from_profile(outline, 0.1, loc=(0, 0.45, 0), rot=(0, 0, 18 * side), bevel=0.03, seg=1, mat=stone)
        wobble(wing, 0.02, 2.0, seed=62 + side)
        wings.append(wing)
    eyes = [ball(0.07, loc=(side * 0.17, -0.74, 2.83), segs=8, rings=5, mat=solid("#FF5038")) for side in (-1, 1)]
    return {"Main": join([pedestal, body, head, snout] + horns + claws + wings, "Main"), "Glow": join(eyes, "Glow")}


@asset("Decor_Obelisk", texture=1024)
def obelisk():
    marble = paint("marble", moss=0.2)
    base = box((2.6, 2.6, 0.8), loc=(0, 0, 0.4), bevel=0.08, seg=2, mat=marble, cuts=2)
    shaft = box((1.4, 1.4, 5.6), loc=(0, 0, 3.6), bevel=0.04, seg=1, mat=marble, cuts=4)
    taper(shaft, top=0.55)
    bands = [box((1.5 - i * 0.1, 1.5 - i * 0.1, 0.12), loc=(0, 0, 1.4 + i * 1.6), bevel=0.02, seg=1,
                 mat=paint("brass", tint=GOLD)) for i in range(3)]
    wobble(base, 0.03, 1.5, seed=71)
    crystal = ico(0.55, loc=(0, 0, 6.95), scale=(0.8, 0.8, 1.3), level=1, mat=solid(VIOLET))
    return {"Main": join([base, shaft] + bands, "Main"), "Glow": crystal}


@asset("Decor_HauntedOrgan", texture=1024)
def haunted_organ():
    wood = paint("wood", grain="Z")
    dark = paint("oldwood", grain="X")
    console = box((4.4, 1.8, 1.6), loc=(0, 0.1, 0.8), bevel=0.06, seg=2, mat=dark, cuts=2)
    keys = box((3.8, 0.7, 0.14), loc=(0, -0.6, 1.62), bevel=0.02, seg=1, mat=paint("bone"))
    back = box((4.6, 0.8, 3.2), loc=(0, 0.75, 3.0), bevel=0.06, seg=2, mat=wood, cuts=3)
    pipes = []
    for i in range(7):
        x = -1.8 + i * 0.6
        height = 3.2 - abs(3 - i) * 0.35
        pipes.append(cyl(0.22, height, loc=(x, 0.3, 3.0 + height / 2), verts=12, bevel=0.02, seg=1,
                         mat=paint("brass", tint=GOLD)))
        pipes.append(cyl(0.24, 0.12, loc=(x, 0.3, 3.0 + height), verts=12, bevel=0.01, seg=1, r2=0.12,
                         mat=paint("brass", tint=GOLD)))
    skull = _skull((0, 0.3, 5.3), scale=0.7)
    wobble(console, 0.02, 1.8, seed=81)
    return join([console, keys, back, skull] + pipes, "Main")


@asset("Decor_GhostFountain", texture=1024)
def ghost_fountain():
    marble = paint("marble", moss=0.3)
    basin = cyl(2.5, 0.9, loc=(0, 0, 0.45), verts=32, bevel=0.06, seg=2, mat=marble)
    cut(basin, cyl(2.15, 0.8, loc=(0, 0, 0.75), verts=32, bevel=0))
    pillar = cyl(0.38, 2.2, loc=(0, 0, 1.6), verts=16, bevel=0.03, seg=1, mat=marble)
    bowl = cyl(1.1, 0.4, loc=(0, 0, 2.9), verts=24, bevel=0.04, seg=1, r2=0.7, mat=marble)
    cut(bowl, cyl(0.9, 0.3, loc=(0, 0, 3.05), verts=24, bevel=0))
    wobble(basin, 0.02, 1.6, seed=91)
    water = cyl(2.12, 0.12, loc=(0, 0, 0.82), verts=32, bevel=0, mat=solid(GHOST, transparency=0.25))
    spout = ball(0.45, loc=(0, 0, 3.45), segs=14, rings=8, mat=solid(GHOST))
    return {"Main": join([basin, pillar, bowl], "Main"), "Water": water, "Glow": spout}


# ---------------------------------------------------------------- icons

def _potion(liquid, cork="wood"):
    """A round flask full of coloured brew: the liquid is the flask, with a pale glass rim and a shine."""
    glass = paint("cream", tint=("#6A7C86", "#B4D2DC", "#F0FCFF"))
    brew = paint("leaf", tint=liquid)
    flask = ball(0.82, loc=(0, 0, -0.35), segs=18, rings=12, mat=brew)
    rim = torus(0.3, 0.08, loc=(0, 0, 0.35), seg=16, minor_seg=5, mat=glass)
    neck = cyl(0.26, 0.55, loc=(0, 0, 0.62), verts=14, bevel=0.03, seg=1, mat=glass)
    stopper = cyl(0.3, 0.3, loc=(0, 0, 1.0), verts=14, bevel=0.04, seg=1, r2=0.24, mat=paint(cork))
    shine = ball(0.16, loc=(-0.38, -0.66, -0.05), scale=(0.7, 0.4, 1.3), segs=8, rings=6, mat=paint("bone"))
    bubbles = [ball(0.09, loc=(x, -0.76, z), segs=8, rings=5, mat=paint("bone")) for x, z in ((0.22, -0.35), (0.38, -0.05))]
    return join([flask, rim, neck, stopper, shine] + bubbles, "Main")


@icon("Icon_Build")
def build_icon():
    head = box((1.4, 0.6, 0.55), loc=(0.2, 0, 0.55), bevel=0.08, seg=2, mat=paint("iron", rust=0.2))
    handle = cyl(0.16, 2.0, loc=(0.2, 0, -0.45), verts=10, bevel=0.03, seg=1, mat=paint("wood"))
    lantern = cyl(0.36, 0.7, loc=(-0.75, -0.2, -0.55), verts=8, bevel=0.03, seg=1, mat=paint("pumpkin"))
    cap = cyl(0.42, 0.18, loc=(-0.75, -0.2, -0.12), verts=8, bevel=0.02, seg=1, r2=0.1, mat=paint("iron"))
    obj = join([head, handle, lantern, cap], "Main")
    obj.rotation_euler = (0, math.radians(25), 0)
    return obj


@icon("Icon_Weather")
def weather_icon():
    cloud_mat = paint("slate", tint=("#3A3650", "#6A6488", "#A49CC8"))
    puffs = [ball(r, loc=(x, 0, z), segs=14, rings=8, mat=cloud_mat)
             for r, x, z in ((0.6, -0.55, 0.35), (0.75, 0.15, 0.55), (0.55, 0.75, 0.3), (0.5, 0.1, 0.15))]
    bolt = _relief([(0.05, 0.1), (-0.35, -0.55), (-0.02, -0.5), (-0.25, -1.15), (0.4, -0.3), (0.05, -0.35),
                    (0.3, 0.1)], 0.18, -0.55, paint("brass", tint=GOLD))
    return join(puffs + [bolt], "Main")


@icon("Icon_Pass")
def pass_icon():
    ticket = from_profile([(-1.1, -0.6), (1.1, -0.6), (1.1, -0.15), (0.95, 0.0), (1.1, 0.15), (1.1, 0.6),
                           (-1.1, 0.6), (-1.1, 0.15), (-0.95, 0.0), (-1.1, -0.15)], 0.16, loc=(0, 0, 0),
                          bevel=0.04, seg=1, mat=paint("leaf", tint=("#2A1446", "#6A34A8", "#B07AF0")))
    star = _relief(_star_points(0.4, 0.17), 0.12, -0.08, paint("brass", tint=GOLD))
    return join([ticket, star], "Main")


@icon("Icon_Soul")
def soul_icon():
    wax = paint("wax")
    candle = cyl(0.42, 1.5, loc=(0, 0, -0.35), verts=16, bevel=0.04, seg=1, mat=wax)
    drips = [ball(0.12, loc=(math.cos(a) * 0.42, math.sin(a) * 0.42, 0.25), scale=(1, 1, 1.6), segs=8, rings=5,
                  mat=wax) for a in (0.4, 2.2, 4.1)]
    wick = cyl(0.04, 0.2, loc=(0, 0, 0.5), verts=6, bevel=0, mat=paint("slate"))
    flame = ball(0.28, loc=(0, 0, 0.82), scale=(0.8, 0.8, 1.5), segs=12, rings=8,
                 mat=paint("leaf", tint=("#3AA08A", "#7CF0D0", "#E6FFF8")))
    return join([candle, wick, flame] + drips, "Main")


@icon("Icon_Rank")
def rank_icon():
    disc = _disc(1.0, 0.22, (0, 0, 0), paint("leaf", tint=("#2A1446", "#6A34A8", "#B07AF0")))
    rim = torus(0.97, 0.08, loc=(0, -0.11, 0), rot=(90, 0, 0), seg=40, minor_seg=6, mat=paint("brass", tint=GOLD))
    star = _relief(_star_points(0.6, 0.26), 0.16, -0.12, paint("brass", tint=GOLD))
    return join([disc, rim, star], "Main")


@icon("Icon_Land")
def land_icon():
    ground = cyl(1.1, 0.35, loc=(0, 0, -0.75), verts=24, bevel=0.06, seg=1, mat=paint("dirt"))
    grass = cyl(1.05, 0.12, loc=(0, 0, -0.55), verts=24, bevel=0.03, seg=1,
                mat=paint("leaf", tint=("#1E3A16", "#3E7A2E", "#7AC05A")))
    grave = from_profile(arch_points(0.6, 0.8, segments=8), 0.2, loc=(-0.35, 0.1, -0.5), bevel=0.03, seg=1,
                         mat=paint("stone"))
    pole = cyl(0.05, 1.5, loc=(0.45, 0, 0.2), verts=6, bevel=0, mat=paint("wood"))
    flag = from_profile([(0.48, 0.95), (1.15, 0.75), (0.48, 0.5)], 0.06, loc=(0, 0, 0), bevel=0.01, seg=1,
                        mat=paint("redcloth"))
    return join([ground, grass, grave, pole, flag], "Main")


@icon("Icon_Index")
def index_icon():
    cover = paint("leaf", tint=("#2A1446", "#6A34A8", "#B07AF0"))
    pages = paint("paper")
    block = box((1.5, 0.5, 1.9), loc=(0.05, 0.02, 0), bevel=0.02, seg=1, mat=pages)
    front = box((1.6, 0.1, 2.0), loc=(0, -0.3, 0), bevel=0.04, seg=2, mat=cover)
    spine = cyl(0.33, 2.0, loc=(-0.8, 0.02, 0), verts=12, bevel=0.02, seg=1, mat=cover)
    lens = torus(0.42, 0.09, loc=(0.35, -0.5, -0.25), rot=(90, 0, 0), seg=24, minor_seg=6,
                 mat=paint("brass", tint=GOLD))
    grip = cyl(0.09, 0.8, loc=(0.85, -0.5, -0.85), rot=(0, -45, 0), verts=8, bevel=0, mat=paint("wood"))
    star = _relief(_star_points(0.3, 0.13, cx=-0.1, cz=0.35), 0.1, -0.38, paint("brass", tint=GOLD))
    return join([block, front, spine, lens, grip, star], "Main")


@icon("Icon_Potion")
def potion_icon():
    return _potion(("#1E6A3A", "#4AD07A", "#B8FFC8"))


@icon("Icon_Item_LuckBrew")
def luck_brew_icon():
    return _potion(("#7A5A10", "#E8C030", "#FFF0A0"))


@icon("Icon_Item_GrowthTonic")
def growth_tonic_icon():
    return _potion(("#6A1414", "#D84A3A", "#FFB0A0"), cork="leather")


@icon("Icon_Coffin")
def coffin_icon():
    wood = paint("wood", grain="Z")
    lid = from_profile([(-0.45, -1.2), (0.45, -1.2), (0.7, 0.55), (0.45, 1.2), (-0.45, 1.2), (-0.7, 0.55)], 0.45,
                       loc=(0, 0, 0), bevel=0.06, seg=2, mat=wood)
    cross = [box((0.16, 0.12, 1.1), loc=(0, -0.28, 0.1), bevel=0.02, seg=1, mat=paint("brass", tint=GOLD)),
             box((0.6, 0.12, 0.16), loc=(0, -0.28, 0.35), bevel=0.02, seg=1, mat=paint("brass", tint=GOLD))]
    question = _relief(_circle_points(0.12, cz=-0.75, steps=12), 0.1, -0.3, paint("brass", tint=GOLD))
    return join([lid, question] + cross, "Main")


@icon("Icon_Guild")
def guild_icon():
    banner = from_profile([(-0.75, 1.1), (0.75, 1.1), (0.75, -0.8), (0, -0.35), (-0.75, -0.8)], 0.12, loc=(0, 0, 0),
                          bevel=0.03, seg=1, mat=paint("leaf", tint=("#2A1446", "#6A34A8", "#B07AF0")))
    rod = cyl(0.08, 1.9, loc=(0, -0.05, 1.15), rot=(0, 90, 0), verts=8, bevel=0, mat=paint("brass", tint=GOLD))
    skull = _squash_y(_skull((0, 0, -0.05), scale=0.75, mat=paint("brass", tint=GOLD)), 0.35)
    for v in skull.data.vertices:
        v.co.y -= 0.12
    return join([banner, rod, skull], "Main")


@icon("Icon_Marble")
def marble_icon():
    marble = paint("marble", moss=0.1)
    chunks = [box((0.9, 0.8, 0.7), loc=(x, 0, z), rot=(0, r, 10), bevel=0.06, seg=1, mat=marble)
              for x, z, r in ((-0.45, -0.35, 8), (0.5, -0.4, -12), (0.0, 0.35, 20))]
    for i, chunk in enumerate(chunks):
        wobble(chunk, 0.05, 1.5, seed=100 + i)
    return join(chunks, "Main")


@icon("Icon_Pumpkin")
def pumpkin_icon():
    return _thumb(assets_plot.pumpkin, degrees_z=-10)


@icon("Icon_Silver")
def silver_icon():
    metal = paint("iron", tint=SILVER)
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


@icon("Icon_Ectoplasm")
def ectoplasm_icon():
    jar = cyl(0.75, 1.5, loc=(0, 0, -0.2), verts=20, bevel=0.06, seg=1,
              mat=paint("cream", tint=("#6A7C86", "#B4D2DC", "#F0FCFF")))
    lid = cyl(0.8, 0.25, loc=(0, 0, 0.65), verts=20, bevel=0.04, seg=1, mat=paint("iron"))
    goo = ball(0.6, loc=(0, -0.2, -0.3), scale=(1, 1, 1.1), segs=14, rings=10,
               mat=paint("leaf", tint=("#1E7A6A", "#56F0C8", "#D8FFF4")))
    wobble(goo, 0.08, 2, seed=7)
    return join([jar, lid, goo], "Main")


@icon("Icon_Ghost")
def ghost_icon():
    sheet = paint("cloth", tint=("#9AB4C0", "#DCF0F8", "#FFFFFF"))
    head = ball(0.75, loc=(0, 0, 0.35), segs=18, rings=12, mat=sheet)
    tail = cyl(0.75, 1.1, loc=(0, 0, -0.4), verts=18, bevel=0.02, seg=1, r2=0.9, mat=sheet)
    wobble(tail, 0.08, 3, seed=9)
    eyes = [ball(0.13, loc=(side * 0.25, -0.68, 0.45), scale=(1, 0.6, 1.4), segs=8, rings=6, mat=paint("slate"))
            for side in (-1, 1)]
    return join([head, tail] + eyes, "Main")


for _name, _fn in (("Gargoyle", gargoyle), ("Obelisk", obelisk), ("Organ", haunted_organ),
                   ("Fountain", ghost_fountain), ("Item_MarbleObelisk", marble_obelisk),
                   ("Item_Mausoleum", mausoleum), ("Item_SoulLantern", soul_lantern)):
    icon(f"Icon_{_name}")(lambda f=_fn: _thumb(f, degrees_z=-18))
icon("Icon_Item_SilverFence")(lambda: _thumb(fence_silver, degrees_z=-30))
