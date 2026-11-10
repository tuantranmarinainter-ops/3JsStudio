"""Quick look at the UI kit: compose a Tech Tree panel and the HUD from the 9-slice pieces.  python art/ui/mockup.py"""

import json
import os

from PIL import Image, ImageDraw, ImageFont

ART = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UI = os.path.join(ART, "out", "ui")
ICONS = os.path.join(ART, "out", "icons")
KIT = json.load(open(os.path.join(UI, "kit.json"), encoding="utf-8"))
FONT_DIR = os.path.join(ART, "ui", "fonts")


FONT_SETS = {
    # title, body, numbers  ("File:Weight" for variable fonts)
    "A": ("GrenzeGotisch:Bold", "Nunito:ExtraBold", "Fredoka:Bold"),
    "B": ("LuckiestGuy", "Nunito:ExtraBold", "LuckiestGuy"),
    "C": ("Fondamento", "Fredoka:SemiBold", "Fredoka:Bold"),
}
SET = os.environ.get("UI_FONTS", "A")
ROLE = {"title.ttf": 0, "body.ttf": 1, "number.ttf": 2}


def font(name, size):
    spec = FONT_SETS[SET][ROLE[name]]
    file, _, weight = spec.partition(":")
    f = ImageFont.truetype(os.path.join(FONT_DIR, f"{file}.ttf"), size)
    if weight:
        f.set_variation_by_name(weight)
    return f


def nine(name, w, h, scale=1.0):
    """Stretch a 9-slice image to w x h (corners keep their size, scaled by `scale`)."""
    src = Image.open(os.path.join(UI, f"{name}.png")).convert("RGBA")
    m = KIT[name]["slice"]
    sm = int(m * scale)
    if m == 0:
        return src.resize((w, h), Image.LANCZOS)
    out = Image.new("RGBA", (w, h))
    sw, sh = src.size
    xs_src, ys_src = [0, m, sw - m, sw], [0, m, sh - m, sh]
    xs_dst, ys_dst = [0, sm, w - sm, w], [0, sm, h - sm, h]
    for i in range(3):
        for j in range(3):
            piece = src.crop((xs_src[i], ys_src[j], xs_src[i + 1], ys_src[j + 1]))
            size = (max(1, xs_dst[i + 1] - xs_dst[i]), max(1, ys_dst[j + 1] - ys_dst[j]))
            out.paste(piece.resize(size, Image.LANCZOS), (xs_dst[i], ys_dst[j]))
    return out


def icon(name, size):
    return Image.open(os.path.join(ICONS, f"{name}.png")).convert("RGBA").resize((size, size), Image.LANCZOS)


def text(draw, xy, s, f, fill, stroke=None, anchor="la"):
    if stroke:
        draw.text(xy, s, font=f, fill=fill, stroke_width=3, stroke_fill=stroke, anchor=anchor)
    else:
        draw.text(xy, s, font=f, fill=fill, anchor=anchor)


def main():
    W, H = 1280, 720
    bg = Image.open(os.path.join(ART, "previews", "_sheet.png")).convert("RGBA").resize((W, H)).point(
        lambda v: int(v * 0.55))
    canvas = bg.copy()
    title_f, body_f, small_f, num_f = font("title.ttf", 34), font("body.ttf", 22), font("body.ttf", 17), font(
        "number.ttf", 24)
    ink, bone, parchment_ink = (26, 16, 32), (246, 238, 222), (58, 38, 24)

    # HUD: coin chip top centre, resources top left, day badge
    chip = nine("ui_chip", 230, 64, 0.8)
    canvas.alpha_composite(chip, (W // 2 - 115, 14))
    canvas.alpha_composite(icon("Icon_Coin", 58), (W // 2 - 122, 17))
    d = ImageDraw.Draw(canvas)
    text(d, (W // 2 + 20, 46), "12,480", num_f, bone, ink, anchor="mm")
    x = 16
    canvas.alpha_composite(icon("Icon_DayGreen", 64), (x, 10))
    text(d, (x + 72, 26), "Green Day", body_f, (170, 240, 140), ink)
    text(d, (x + 72, 52), "2:14 left", small_f, bone, ink)
    for i, (ic, value) in enumerate((("Icon_Wood", "42"), ("Icon_Stone", "17"), ("Icon_Iron", "6"),
                                     ("Icon_Quality", "+23"))):
        cx = 16 + i * 118
        canvas.alpha_composite(nine("ui_chip", 108, 46, 0.6), (cx, 84))
        canvas.alpha_composite(icon(ic, 44), (cx - 4, 85))
        text(d, (cx + 70, 107), value, num_f, bone, ink, anchor="mm")
    # side buttons
    for i, (ic, label) in enumerate((("Icon_Tech", "Tech"), ("Icon_Daily", "Daily"), ("Icon_Book", "Book"),
                                     ("Icon_Store", "Store"))):
        by = 220 + i * 92
        canvas.alpha_composite(nine("ui_btn_secondary", 84, 84, 0.6), (16, by))
        canvas.alpha_composite(icon(ic, 62), (27, by + 4))
        text(d, (58, by + 76), label, small_f, bone, ink, anchor="mm")

    # Tech Tree panel
    pw, ph = 620, 560
    px, py = (W - pw) // 2 + 60, 140
    canvas.alpha_composite(nine("ui_panel", pw, ph, 0.7), (px, py))
    ribbon = nine("ui_ribbon", 330, 70, 0.7)
    canvas.alpha_composite(ribbon, (px + pw // 2 - 165, py - 26))
    d = ImageDraw.Draw(canvas)
    text(d, (px + pw // 2, py + 8), "Tech Tree", title_f, (255, 236, 210), ink, anchor="mm")
    canvas.alpha_composite(icon("Icon_Coin", 1).resize((1, 1)), (0, 0))
    canvas.alpha_composite(Image.open(os.path.join(UI, "ui_close.png")).resize((58, 58)), (px + pw - 52, py - 10))
    rows = (("Icon_Daily", "Donkey Treats", "Bodies arrive faster", "Lv 2/5", "240", "ui_btn_primary"),
            ("Icon_Quality", "Grave Plots", "Dig more graves", "Lv 4/10", "1,200", "ui_btn_disabled"),
            ("Icon_Iron", "Mining", "Mine iron ore", "Unlock", "500", "ui_btn_primary"),
            ("Icon_SkullWhite", "Bishop's Favor", "Bigger burial fees", "MAX", "", "ui_btn_good"))
    for i, (ic, name, desc, lvl, cost, btn) in enumerate(rows):
        ry = py + 58 + i * 116
        canvas.alpha_composite(nine("ui_card", pw - 88, 104, 0.6), (px + 44, ry))
        canvas.alpha_composite(icon(ic, 78), (px + 56, ry + 13))
        d = ImageDraw.Draw(canvas)
        text(d, (px + 146, ry + 18), name, body_f, parchment_ink)
        text(d, (px + 146, ry + 50), f"{desc}  ·  {lvl}", small_f, (110, 84, 60))
        bw = 150
        canvas.alpha_composite(nine(btn, bw, 60, 0.6), (px + pw - 44 - bw - 14, ry + 22))
        d = ImageDraw.Draw(canvas)
        if cost:
            canvas.alpha_composite(icon("Icon_Coin", 34), (px + pw - 44 - bw - 2, ry + 33))
            text(d, (px + pw - 44 - bw / 2 - 2, ry + 50), cost, num_f, bone, ink, anchor="mm")
        else:
            text(d, (px + pw - 44 - bw / 2 - 14, ry + 50), "MAX", num_f, bone, ink, anchor="mm")

    # toast
    canvas.alpha_composite(nine("ui_toast", 420, 58, 0.6), (W - 440, 20))
    d = ImageDraw.Draw(canvas)
    text(d, (W - 410, 49), "Laid Old Tom to rest. Add a gravestone!", small_f, bone, ink, anchor="lm")
    canvas.convert("RGB").save(os.path.join(ART, "previews", f"_ui_mockup_{SET}.png"))
    print("ok")


if __name__ == "__main__":
    main()
