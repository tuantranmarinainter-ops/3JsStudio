"""Finish the raw icon renders: dark sticker outline + soft drop shadow, 256 px.  python art/blender/icons_post.py"""

import os

from PIL import Image, ImageChops, ImageFilter

ART = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ART, "out", "icons", "raw")
OUT = os.path.join(ART, "out", "icons")
SIZE = 256
OUTLINE = (26, 16, 32, 255)
OUTLINE_PX = 14  # at the 512 px render size
SHADOW_OFFSET = (0, 10)

for name in sorted(os.listdir(RAW)):
    if not name.endswith(".png"):
        continue
    icon = Image.open(os.path.join(RAW, name)).convert("RGBA")
    # pad so the outline and shadow never clip
    pad = OUTLINE_PX * 2 + 12
    canvas = Image.new("RGBA", (icon.width + pad * 2, icon.height + pad * 2), (0, 0, 0, 0))
    canvas.paste(icon, (pad, pad), icon)
    alpha = canvas.getchannel("A").point(lambda a: 255 if a > 24 else 0)
    ring = alpha.filter(ImageFilter.MaxFilter(OUTLINE_PX * 2 + 1)).filter(ImageFilter.GaussianBlur(1.5))
    outline = Image.new("RGBA", canvas.size, OUTLINE)
    outline.putalpha(ring)
    shadow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    shadow_alpha = ImageChops.offset(ring, *SHADOW_OFFSET).filter(ImageFilter.GaussianBlur(8)).point(lambda a: a * 0.55)
    shadow.putalpha(shadow_alpha)
    result = Image.alpha_composite(shadow, outline)
    result = Image.alpha_composite(result, canvas)
    bbox = result.getchannel("A").point(lambda a: 255 if a > 8 else 0).getbbox()
    if bbox:
        result = result.crop(bbox)
    side = max(result.width, result.height)
    square = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    square.paste(result, ((side - result.width) // 2, (side - result.height) // 2))
    square.resize((SIZE, SIZE), Image.LANCZOS).save(os.path.join(OUT, name))
    print("icon", name)
