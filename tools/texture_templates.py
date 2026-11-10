#!/usr/bin/env python3
"""Nguồn sự thật cho bố cục texture: ghi layout JSON (engine đọc để gán UV) + ảnh template có nhãn (Codex vẽ lên).

  python tools/texture_templates.py
Ra:
  assets/textures/characters/outfit_layout.json + outfit_template.png   (1024×1024, 128 px/stud)
  assets/textures/faces/face_layout.json        + face_template.png     (1024×1024, ô 256×128)
"""
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
PX = 128  # px mỗi stud

# Kích thước bộ phận R15 (studs: rộng X, cao Y, sâu Z). Phải khớp engine/r15.js (R15_DIMS).
DIMS = {
    'UpperTorso': (2.0, 1.6, 1.0), 'LowerTorso': (2.0, 0.4, 1.0),
    'UpperArm': (1.0, 1.0, 1.0), 'LowerArm': (1.0, 0.6, 1.0), 'Hand': (1.0, 0.4, 1.0),
    'UpperLeg': (1.0, 1.0, 1.0), 'LowerLeg': (1.0, 0.7, 1.0), 'Foot': (1.0, 0.3, 1.0),
}

def strip(x, y, part):
    """4 mặt bên nối ngang: front | right | back | left (nhìn từ ngoài vào, trên = phía đầu)."""
    w, h, d = DIMS[part]
    W, H, D = round(w * PX), round(h * PX), round(d * PX)
    out, cx = {}, x
    for face, fw in (('front', W), ('right', D), ('back', W), ('left', D)):
        out[face] = [cx, y, fw, H]; cx += fw
    return out, cx - x, H

def build_outfit():
    L = {'size': [1024, 1024], 'px_per_stud': PX, 'dims': DIMS, 'parts': {}}
    P = L['parts']
    s, _, h = strip(0, 0, 'UpperTorso'); P['UpperTorso'] = s
    P['UpperTorso']['top'] = [768, 0, 256, 128]; P['UpperTorso']['bottom'] = [768, 128, 256, 128]
    s, _, h2 = strip(0, h, 'LowerTorso'); P['LowerTorso'] = s
    
    y = h + h2 + 8
    for side, x0 in (('Right', 0), ('Left', 512)):
        yy = y
        for seg in ('UpperArm', 'LowerArm', 'Hand'):
            s, _, hh = strip(x0, yy, seg); P[side + seg] = s; yy += hh
    yarm = yy + 8
    for side, x0 in (('Right', 0), ('Left', 512)):
        yy = yarm
        for seg in ('UpperLeg', 'LowerLeg', 'Foot'):
            s, _, hh = strip(x0, yy, seg); P[side + seg] = s; yy += hh
    ycap = yy + 8
    caps = [('RightUpperArm', 'top'), ('LeftUpperArm', 'top'), ('RightHand', 'bottom'), ('LeftHand', 'bottom'),
            ('RightFoot', 'bottom'), ('LeftFoot', 'bottom'), ('RightUpperLeg', 'top'), ('LeftUpperLeg', 'top')]
    for i, (p, f) in enumerate(caps):
        P[p][f] = [(i % 8) * 128, ycap, 128, 128]
    P['LowerTorso']['top'] = [0, ycap + 128, 256, 100]; P['LowerTorso']['bottom'] = [256, ycap + 128, 256, 100]
    assert ycap + 228 <= 1024, ycap
    return L

FACE_CELLS = {
    'eyes': ['open', 'half', 'closed', 'happy', 'wide', 'squint', 'sad', 'look_up'],
    'brows': ['neutral', 'raised', 'worried', 'angry'],
    'mouth': ['smile', 'grin', 'open', 'o', 'frown', 'flat', 'wobble', 'laugh', 'smallsmile', 'scream', 'pout', 'teeth_clench'],
    'extra': ['blush', 'tears', 'sweat', 'shine', 'eyelashes', 'freckles', 'nose', 'cold_cheeks'],
}

def build_face():
    L = {'size': [1024, 1024], 'cell': [256, 128], 'sprites': {}, 'note':
         'Mỗi ô 256×128, nền TRONG SUỐT. Mắt: cả cặp trong 1 ô, tâm giữa 2 mắt ở giữa ô. Miệng: tâm ở giữa ô. '
         'Lông mày: cặp lông mày nằm nửa trên ô. Engine ghép: brows (y=0.28) / eyes (y=0.42) / mouth (y=0.72) theo chiều cao mặt.'}
    i = 0
    for group, names in FACE_CELLS.items():
        for n in names:
            c, r = i % 4, i // 4
            L['sprites'][f'{group}.{n}'] = [c * 256, r * 128, 256, 128]; i += 1
    assert i <= 32
    return L

def font(sz):
    for f in ['/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf']:
        try: return ImageFont.truetype(f, sz)
        except OSError: pass
    return ImageFont.load_default()

def draw_outfit(L, out):
    im = Image.new('RGBA', (1024, 1024), (40, 40, 48, 255)); d = ImageDraw.Draw(im)
    cols = {'front': (231, 76, 60), 'back': (52, 152, 219), 'right': (46, 204, 113), 'left': (241, 196, 15), 'top': (155, 89, 182), 'bottom': (127, 140, 141)}
    for part, faces in L['parts'].items():
        for face, (x, y, w, h) in faces.items():
            c = cols[face]; d.rectangle([x, y, x + w - 1, y + h - 1], fill=c + (110,), outline=(255, 255, 255, 255), width=2)
            d.text((x + 4, y + 3), f'{part}', fill='white', font=font(12 if h > 40 else 9))
            if h > 30: d.text((x + 4, y + 17), f'{face} {w}x{h}', fill='white', font=font(11))
            d.line([x + w // 2, y + 2, x + w // 2, y + 12], fill='white', width=2)  # vạch "phía trên"
    im.save(out)

def draw_face(L, out):
    im = Image.new('RGBA', (1024, 1024), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    for name, (x, y, w, h) in L['sprites'].items():
        d.rectangle([x, y, x + w - 1, y + h - 1], outline=(255, 0, 255, 255), width=2)
        d.line([x + w // 2, y + 4, x + w // 2, y + h - 4], fill=(255, 0, 255, 90)); d.line([x + 4, y + h // 2, x + w - 4, y + h // 2], fill=(255, 0, 255, 90))
        d.text((x + 6, y + 4), name, fill=(255, 0, 255, 255), font=font(14))
    im.save(out)

if __name__ == '__main__':
    o = build_outfit(); f = build_face()
    cd = ROOT / 'assets/textures/characters'; fd = ROOT / 'assets/textures/faces'
    cd.mkdir(parents=True, exist_ok=True); fd.mkdir(parents=True, exist_ok=True)
    json.dump(o, open(cd / 'outfit_layout.json', 'w'), indent=1); draw_outfit(o, cd / 'outfit_template.png')
    json.dump(f, open(fd / 'face_layout.json', 'w'), indent=1); draw_face(f, fd / 'face_template.png')
    print('ok', len(o['parts']), 'parts;', len(f['sprites']), 'face sprites')
