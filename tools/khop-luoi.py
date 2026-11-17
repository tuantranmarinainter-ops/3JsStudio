#!/usr/bin/env python
"""Ghép lưới duyệt khop: mỗi hàng = tên model + % méo | trước | sau (cắt quanh model). Dùng: python tools/khop-luoi.py <thư mục look.mjs xuất> [--ra luoi.jpg]
Đọc <thư mục>/chon-shot.json (khop-chon-shot.mjs) + ảnh PNG A/B của look.mjs (tên có giây). Rộng ~800 px."""
import sys, json, glob, os, re
from PIL import Image, ImageDraw, ImageFont, ImageChops
d = sys.argv[1]; ra = sys.argv[sys.argv.index('--ra')+1] if '--ra' in sys.argv else os.path.join(d, 'luoi.jpg')
ms = json.load(open(os.path.join(d, 'chon-shot.json'), encoding='utf8'))
def anh(t, ab):
    f = glob.glob(os.path.join(d, 't%07.2f_*_%s.png' % (t, 'B' if ab == 'b' else 'A')))
    return f[0] if f else None
W, L, C = 800, 190, 305
try: F = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 15); Fb = ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf', 15)
except Exception: F = Fb = ImageFont.load_default()
rows = []
for m in ms:
    a, b = anh(m['t'], 'a'), anh(m['t'], 'b')
    if not (a and b): print('thiếu ảnh', m['id'], m['t'], a, b); continue
    ia, ib = Image.open(a).convert('RGB'), Image.open(b).convert('RGB')
    # cắt dải ngang giữa khung (tỉ lệ 305×305 từ khung 9:16: lấy phần trọng tâm theo nhóm model)
    h = ia.height; vung = int(h * 0.42)
    df = ImageChops.difference(ia, ib).convert('L').point(lambda v: 255 if v > 16 else 0)   # chỗ đổi giữa trước/sau → cắt quanh đó
    bb = df.getbbox(); m['doi'] = bool(bb)
    cy = ((bb[1] + bb[3]) / 2 / h) if bb else 0.5
    y0 = max(0, min(h - vung, int(h * cy) - vung // 2))
    ca, cb = ia.crop((0, y0, ia.width, y0 + vung)).resize((C, int(C * vung / ia.width))), ib.crop((0, y0, ib.width, y0 + vung)).resize((C, int(C * vung / ib.width)))
    rows.append((m, ca, cb))
H = sum(r[1].height + 6 for r in rows) + 28
g = Image.new('RGB', (W, H), 'white'); dr = ImageDraw.Draw(g)
dr.text((8, 6), 'Model (méo)', fill='black', font=Fb); dr.text((L + 8, 6), 'TRƯỚC (hiện tại)', fill='black', font=Fb); dr.text((L + C + 14, 6), 'SAU (?khop=1)', fill='black', font=Fb)
y = 28
for m, ca, cb in rows:
    dr.text((8, y + 6), m['id'].replace('nhap/', ''), fill='black', font=Fb)
    dr.text((8, y + 26), 'méo %d%%' % round((m['meo'] - 1) * 100), fill=(180, 40, 40), font=F)
    dr.text((8, y + 46), '%s · %gs%s' % (m.get('shot', ''), m['t'], '' if m['doi'] else ' · KHÔNG ĐỔI'), fill=(90, 90, 90), font=F)
    g.paste(ca, (L, y)); g.paste(cb, (L + C + 6, y)); y += ca.height + 6
g.save(ra, quality=85); print('đã ghi', ra, g.size, len(rows), 'hàng')
