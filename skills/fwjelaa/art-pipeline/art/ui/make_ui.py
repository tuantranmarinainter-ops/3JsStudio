"""Paint the UI kit textures (9-slice frames, buttons, chips) in the game's hand-painted style.

    python art/ui/make_ui.py        ->  art/out/ui/*.png  (+ art/out/ui/kit.json with each image's 9-slice margin)

Everything is drawn at 2x and downsampled. Colours come from the same palette as the Blender props.
"""

import json
import os

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ART = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ART, "out", "ui")
os.makedirs(OUT, exist_ok=True)
SS = 2  # supersampling

INK = (26, 16, 32)
PALETTE = {
    "wood": ((58, 37, 22), (107, 69, 41), (162, 113, 74)),
    "parchment": ((196, 170, 124), (233, 220, 192), (248, 240, 222)),
    "candle": ((168, 70, 14), (242, 140, 40), (255, 196, 110)),
    "moss": ((40, 84, 28), (96, 160, 56), (170, 222, 110)),
    "blood": ((92, 18, 14), (190, 52, 38), (240, 110, 84)),
    "stone": ((66, 64, 72), (118, 116, 124), (170, 168, 176)),
    "night": ((14, 10, 22), (28, 20, 42), (52, 40, 74)),
    "iron": ((22, 21, 26), (48, 46, 54), (96, 92, 104)),
    "brass": ((110, 70, 18), (200, 146, 52), (255, 222, 130)),
    "wax": ((96, 14, 16), (176, 34, 30), (236, 90, 70)),
    "cloth": ((70, 16, 20), (140, 36, 34), (200, 80, 64)),
}
KIT = {}


def noise(h, w, scale, octaves=4, seed=0, stretch=(1.0, 1.0)):
    """Fractal value noise in 0..1. stretch > 1 along an axis makes streaks (wood grain)."""
    rng = np.random.default_rng(seed)
    total = np.zeros((h, w), np.float32)
    amp, norm = 1.0, 0.0
    for o in range(octaves):
        gh = max(2, int(h / (scale * stretch[0]) * 2 ** o) + 2)
        gw = max(2, int(w / (scale * stretch[1]) * 2 ** o) + 2)
        grid = (rng.random((gh, gw)) * 255).astype(np.uint8)
        layer = np.asarray(Image.fromarray(grid).resize((w, h), Image.BICUBIC), np.float32) / 255
        total += layer * amp
        norm += amp
        amp *= 0.5
    return np.clip(total / norm, 0, 1)


def colorize(n, colors, contrast=1.0):
    dark, mid, light = (np.array(c, np.float32) for c in colors)
    t = np.clip((n - 0.5) * contrast + 0.5, 0, 1)[..., None]
    low = dark + (mid - dark) * np.clip(t * 2, 0, 1)
    high = mid + (light - mid) * np.clip(t * 2 - 1, 0, 1)
    return np.where(t < 0.5, low, high)


def rounded_mask(w, h, r, inset=0):
    img = Image.new("L", (w, h), 0)
    ImageDraw.Draw(img).rounded_rectangle([inset, inset, w - 1 - inset, h - 1 - inset], radius=max(0, r - inset),
                                          fill=255)
    return np.asarray(img, np.float32) / 255


def shade(mask, strength=0.35, blur=6):
    """Soft bevel: light from the top-left, shade toward the bottom-right, following the mask edges."""
    m = Image.fromarray((mask * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(blur))
    a = np.asarray(m, np.float32) / 255
    gy, gx = np.gradient(a)
    light = -(gx + gy) * blur * 2.2
    return 1 + np.clip(light, -1, 1)[..., None] * strength


def vertical_light(h, w, top=1.12, bottom=0.82):
    return np.linspace(top, bottom, h, dtype=np.float32)[:, None, None].repeat(w, axis=1)


def outline(mask, px):
    m = Image.fromarray((mask * 255).astype(np.uint8))
    grown = m.filter(ImageFilter.MaxFilter(px * 2 + 1))
    return np.asarray(grown, np.float32) / 255


def compose(rgb, alpha):
    rgba = np.dstack([np.clip(rgb, 0, 255), np.clip(alpha * 255, 0, 255)]).astype(np.uint8)
    return Image.fromarray(rgba, "RGBA")


def over(bottom, top):
    return Image.alpha_composite(bottom, top)


def save(name, image, slice_px, note=""):
    final = image.resize((image.width // SS, image.height // SS), Image.LANCZOS)
    final.save(os.path.join(OUT, f"{name}.png"))
    KIT[name] = {"size": [final.width, final.height], "slice": slice_px, "note": note}
    print(name, final.size)


def flat(w, h, color, alpha):
    rgb = np.zeros((h, w, 3), np.float32) + np.array(color, np.float32)
    return compose(rgb, alpha)


def rivet(draw, x, y, r):
    draw.ellipse([x - r, y - r, x + r, y + r], fill=PALETTE["iron"][0] + (255,))
    draw.ellipse([x - r * 0.75, y - r * 0.75, x + r * 0.55, y + r * 0.55], fill=PALETTE["iron"][2] + (255,))
    draw.ellipse([x - r * 0.4, y - r * 0.45, x, y - r * 0.05], fill=(170, 166, 180, 255))


# ---------------------------------------------------------------- panel: parchment page in a wood frame

def panel():
    w = h = 512 * SS
    r = 40 * SS
    frame_w = 38 * SS
    outer = rounded_mask(w, h, r, inset=4 * SS)
    inner = rounded_mask(w, h, 18 * SS, inset=frame_w)
    grain_h = noise(h, w, 60 * SS, 5, seed=1, stretch=(0.15, 3.0))
    grain_v = noise(h, w, 60 * SS, 5, seed=2, stretch=(3.0, 0.15))
    yy, xx = np.mgrid[0:h, 0:w]
    side = (np.minimum(xx, w - 1 - xx) < np.minimum(yy, h - 1 - yy))
    grain = np.where(side, grain_v, grain_h)
    wood = colorize(grain, PALETTE["wood"], 1.6) * shade(outer, 0.45, 8) * vertical_light(h, w, 1.08, 0.88)
    paper_n = noise(h, w, 90 * SS, 5, seed=3) * 0.7 + noise(h, w, 12 * SS, 3, seed=4) * 0.3
    paper = colorize(paper_n, PALETTE["parchment"], 1.3)
    # burnt, darker edge on the page and a shadow cast by the frame
    dist = np.asarray(Image.fromarray((inner * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(26 * SS)),
                      np.float32) / 255
    paper *= (0.62 + 0.38 * np.clip(dist * 1.6 - 0.25, 0, 1))[..., None]
    rgb = np.where(inner[..., None] > 0.5, paper, wood)
    # dark rim between frame and page
    rim = np.clip(outline(inner, 3 * SS) - inner, 0, 1)[..., None]
    rgb = rgb * (1 - rim) + np.array(INK, np.float32) * rim
    ink = np.clip(outline(outer, 3 * SS) - outer, 0, 1)
    base = compose(rgb, outer)
    image = over(flat(w, h, INK, ink), base)
    # iron corner brackets with rivets
    brackets = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(brackets)
    arm, thick = 96 * SS, 26 * SS
    for cx, cy, sx, sy in ((0, 0, 1, 1), (w, 0, -1, 1), (0, h, 1, -1), (w, h, -1, -1)):
        x0, y0 = cx + sx * 10 * SS, cy + sy * 10 * SS
        for rect in ((x0, y0, x0 + sx * arm, y0 + sy * thick), (x0, y0, x0 + sx * thick, y0 + sy * arm)):
            box = [min(rect[0], rect[2]), min(rect[1], rect[3]), max(rect[0], rect[2]), max(rect[1], rect[3])]
            d.rounded_rectangle([box[0] - 3 * SS, box[1] - 3 * SS, box[2] + 3 * SS, box[3] + 3 * SS], radius=8 * SS,
                                fill=INK + (255,))
            d.rounded_rectangle(box, radius=6 * SS, fill=PALETTE["iron"][1] + (255,))
        for px, py in ((x0 + sx * 13 * SS, y0 + sy * 13 * SS), (x0 + sx * 70 * SS, y0 + sy * 13 * SS),
                       (x0 + sx * 13 * SS, y0 + sy * 70 * SS)):
            rivet(d, px, py, 6 * SS)
    image = over(image, brackets)
    save("ui_panel", image, 112, "Panel: parchment page in a wood frame with iron corners")


# ---------------------------------------------------------------- title ribbon

def ribbon():
    w, h = 512 * SS, 112 * SS
    notch = 34 * SS
    poly = [(0, 8 * SS), (w, 8 * SS), (w - notch, h / 2), (w, h - 8 * SS), (0, h - 8 * SS), (notch, h / 2)]
    m = Image.new("L", (w, h), 0)
    ImageDraw.Draw(m).polygon(poly, fill=255)
    mask = np.asarray(m.filter(ImageFilter.GaussianBlur(0.8 * SS)), np.float32) / 255
    cloth = colorize(noise(h, w, 40 * SS, 4, seed=8, stretch=(0.3, 2.0)), PALETTE["cloth"], 1.4)
    folds = 1 + 0.12 * np.sin(np.linspace(0, 9 * np.pi, w))[None, :, None]
    rgb = cloth * folds * vertical_light(h, w, 1.15, 0.78)
    stitch = Image.new("L", (w, h), 0)
    sd = ImageDraw.Draw(stitch)
    for y in (20 * SS, h - 21 * SS):
        for x in range(notch + 10 * SS, w - notch - 10 * SS, 18 * SS):
            sd.line([x, y, x + 9 * SS, y], fill=255, width=2 * SS)
    s = np.asarray(stitch, np.float32)[..., None] / 255
    rgb = rgb * (1 - s * 0.6) + np.array((236, 190, 150), np.float32) * s * 0.6
    ink = np.clip(outline(mask, 3 * SS) - mask, 0, 1)
    save("ui_ribbon", over(flat(w, h, INK, ink), compose(rgb, mask)), 48, "Title ribbon, stretch horizontally")


# ---------------------------------------------------------------- buttons

def button(name, colors, grain=False, w=256, h=96):
    w, h = w * SS, h * SS
    r = 26 * SS
    body = rounded_mask(w, h, r, inset=4 * SS)
    face = rounded_mask(w, h - 8 * SS, r, inset=4 * SS)
    face = np.vstack([face, np.zeros((8 * SS, w), np.float32)])
    n = noise(h, w, 40 * SS, 4, seed=hash(name) % 1000, stretch=(0.2, 3.0) if grain else (1, 1))
    top = colorize(n, colors, 1.2 if grain else 0.6) * shade(face, 0.3, 5) * vertical_light(h, w, 1.18, 0.9)
    lip = np.array(colors[0], np.float32) * 0.9
    rgb = np.where(face[..., None] > 0.5, top, lip)
    gloss = rounded_mask(w, h, r, inset=12 * SS)
    gloss[int(h * 0.42):, :] = 0
    gloss = np.asarray(Image.fromarray((gloss * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(4 * SS)),
                       np.float32)[..., None] / 255
    rgb = rgb + (255 - rgb) * gloss * 0.22
    ink = np.clip(outline(body, 3 * SS) - body, 0, 1)
    save(name, over(flat(w, h, INK, ink), compose(rgb, body)), 40, "Button, 9-slice")


def chip():
    w, h = 256 * SS, 80 * SS
    mask = rounded_mask(w, h, 40 * SS, inset=4 * SS)
    rgb = colorize(noise(h, w, 30 * SS, 3, seed=12), PALETTE["night"], 0.8) * vertical_light(h, w, 1.25, 0.85)
    ring = np.clip(outline(mask, 3 * SS) - mask, 0, 1)
    brass = flat(w, h, PALETTE["brass"][1], ring)
    inner = np.clip(mask - rounded_mask(w, h, 40 * SS, inset=7 * SS), 0, 1)
    sheen = flat(w, h, PALETTE["brass"][0], inner * 0.9)
    image = over(over(compose(rgb, mask * 0.92), sheen), brass)
    save("ui_chip", image, 38, "HUD counter background (pill), 9-slice")


def card():
    w, h = 512 * SS, 128 * SS
    mask = rounded_mask(w, h, 16 * SS, inset=3 * SS)
    paper = colorize(noise(h, w, 50 * SS, 4, seed=13), ((214, 196, 158), (241, 231, 208), (252, 247, 236)), 1.0)
    rgb = paper * shade(mask, 0.2, 6) * vertical_light(h, w, 1.04, 0.94)
    ink = np.clip(outline(mask, 2 * SS) - mask, 0, 1)
    inner_line = np.clip(rounded_mask(w, h, 12 * SS, inset=9 * SS) - rounded_mask(w, h, 12 * SS, inset=11 * SS), 0, 1)
    image = over(flat(w, h, (120, 90, 60), ink * 0.85), compose(rgb, mask))
    image = over(image, flat(w, h, (170, 140, 100), inner_line * 0.6))
    save("ui_card", image, 24, "List row / item card on a panel, 9-slice")


def close_seal():
    w = h = 128 * SS
    rng = np.random.default_rng(14)
    angles = np.linspace(0, 2 * np.pi, 28, endpoint=False)
    radii = 56 * SS + rng.uniform(-5, 4, size=angles.size) * SS
    pts = [(w / 2 + np.cos(a) * r, h / 2 + np.sin(a) * r) for a, r in zip(angles, radii)]
    m = Image.new("L", (w, h), 0)
    ImageDraw.Draw(m).polygon(pts, fill=255)
    mask = np.asarray(m.filter(ImageFilter.GaussianBlur(1.2 * SS)), np.float32) / 255
    rgb = colorize(noise(h, w, 30 * SS, 3, seed=15), PALETTE["wax"], 0.9) * shade(mask, 0.5, 10)
    x = Image.new("L", (w, h), 0)
    xd = ImageDraw.Draw(x)
    c, s = w / 2, 22 * SS
    for a, b in (((c - s, c - s), (c + s, c + s)), ((c - s, c + s), (c + s, c - s))):
        xd.line([a, b], fill=255, width=11 * SS)
    xm = np.asarray(x.filter(ImageFilter.GaussianBlur(1 * SS)), np.float32)[..., None] / 255
    rgb = rgb * (1 - xm) + np.array((255, 226, 196), np.float32) * xm
    ink = np.clip(outline(mask, 3 * SS) - mask, 0, 1)
    save("ui_close", over(flat(w, h, INK, ink), compose(rgb, mask)), 0, "Close button (wax seal)")


def bars():
    w, h = 256 * SS, 40 * SS
    mask = rounded_mask(w, h, 20 * SS, inset=3 * SS)
    track = colorize(noise(h, w, 20 * SS, 3, seed=16), PALETTE["night"], 0.6) * vertical_light(h, w, 0.8, 1.15)
    ink = np.clip(outline(mask, 2 * SS) - mask, 0, 1)
    save("ui_bar_track", over(flat(w, h, INK, ink), compose(track, mask)), 18, "Progress bar track")
    for name, colors in (("ui_bar_fill", PALETTE["candle"]), ("ui_bar_fill_good", PALETTE["moss"])):
        fill = colorize(noise(h, w, 20 * SS, 3, seed=17), colors, 0.5) * vertical_light(h, w, 1.25, 0.8)
        save(name, compose(fill, rounded_mask(w, h, 20 * SS, inset=7 * SS)), 18, "Progress bar fill")


def bubble():
    w, h = 512 * SS, 192 * SS
    mask = rounded_mask(w, h, 36 * SS, inset=4 * SS)
    paper = colorize(noise(h, w, 60 * SS, 4, seed=18), PALETTE["parchment"], 1.0)
    ink = np.clip(outline(mask, 3 * SS) - mask, 0, 1)
    save("ui_bubble", over(flat(w, h, INK, ink), compose(paper * shade(mask, 0.2, 8), mask)), 48,
         "Mort's speech bubble, 9-slice")
    tw, th = 64 * SS, 48 * SS
    tail = Image.new("L", (tw, th), 0)
    ImageDraw.Draw(tail).polygon([(4 * SS, 0), (tw - 8 * SS, 0), (12 * SS, th - 4 * SS)], fill=255)
    tm = np.asarray(tail, np.float32) / 255
    tink = np.clip(outline(tm, 3 * SS) - tm, 0, 1)
    tink[: 3 * SS, :] = 0
    tp = colorize(noise(th, tw, 20 * SS, 2, seed=19), PALETTE["parchment"], 1.0)
    save("ui_bubble_tail", over(flat(tw, th, INK, tink), compose(tp, tm)), 0, "Bubble tail, sits under the bubble")


def toast():
    w, h = 512 * SS, 96 * SS
    mask = rounded_mask(w, h, 22 * SS, inset=4 * SS)
    rgb = colorize(noise(h, w, 40 * SS, 3, seed=20), PALETTE["night"], 0.7) * vertical_light(h, w, 1.2, 0.85)
    accent = np.zeros((h, w), np.float32)
    accent[:, 4 * SS: 16 * SS] = 1
    accent *= mask
    image = over(compose(rgb, mask * 0.94), flat(w, h, PALETTE["candle"][1], accent))
    ring = np.clip(outline(mask, 2 * SS) - mask, 0, 1)
    save("ui_toast", over(image, flat(w, h, PALETTE["brass"][0], ring)), 32, "Toast / event banner background")


if __name__ == "__main__":
    panel()
    ribbon()
    button("ui_btn_primary", PALETTE["candle"])
    button("ui_btn_secondary", PALETTE["wood"], grain=True)
    button("ui_btn_good", PALETTE["moss"])
    button("ui_btn_danger", PALETTE["blood"])
    button("ui_btn_disabled", PALETTE["stone"])
    chip()
    card()
    close_seal()
    bars()
    bubble()
    toast()
    with open(os.path.join(OUT, "kit.json"), "w", encoding="utf-8", newline="\n") as fh:
        json.dump(KIT, fh, indent=1, sort_keys=True)
