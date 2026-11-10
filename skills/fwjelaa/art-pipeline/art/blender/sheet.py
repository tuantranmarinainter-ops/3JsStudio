"""Contact sheet of every preview render (system Python + Pillow):  python art/blender/sheet.py [pattern]"""

import fnmatch
import os
import sys

from PIL import Image, ImageDraw, ImageFont

ART = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PREVIEWS = os.path.join(ART, "previews")
CELL = 320
LABEL = 34
COLUMNS = 5

pattern = sys.argv[1] if len(sys.argv) > 1 else "*"
names = sorted(n[:-4] for n in os.listdir(PREVIEWS) if n.endswith(".png") and not n.startswith("_")
               and fnmatch.fnmatch(n[:-4], pattern))
rows = max(1, (len(names) + COLUMNS - 1) // COLUMNS)
sheet = Image.new("RGB", (COLUMNS * CELL, rows * (CELL + LABEL)), (30, 26, 42))
draw = ImageDraw.Draw(sheet)
try:
    font = ImageFont.truetype("arialbd.ttf", 18)
except OSError:
    font = ImageFont.load_default()
for i, name in enumerate(names):
    x, y = (i % COLUMNS) * CELL, (i // COLUMNS) * (CELL + LABEL)
    draw.rectangle([x + 4, y + 4, x + CELL - 4, y + CELL + LABEL - 4], fill=(44, 38, 62))
    image = Image.open(os.path.join(PREVIEWS, f"{name}.png")).convert("RGBA").resize((CELL - 16, CELL - 16))
    sheet.paste(image, (x + 8, y + 8), image)
    draw.text((x + 12, y + CELL - 2), name, fill=(240, 220, 190), font=font)
out = os.path.join(PREVIEWS, "_sheet.png")
sheet.save(out)
print(out, len(names))
