#!/usr/bin/env python3
"""Đo ảnh phác Gà (front.png / back.png) BẰNG SỐ -> assets/characters/ga/dims.json + engine/ga-dims.js.
Chạy lại được:  python tools/ga_measure.py
- Tách nền (màu nền phẳng ~ (219,210,219)), phân lớp màu (vàng da, đỏ băng đô, xanh áo, nâu quần, đen giày, kem đế/dây).
- px = pixel ảnh phác (1028x1530). Hệ số quy đổi: STUD = 5.2 / (đáy đế - đỉnh đầu) -> đỉnh đầu = 5.2 stud (bằng hero cũ),
  chân chạm y=0, nên camera các shot vẫn đúng khung. Chỏm lông cao thêm ~0.19.
- Mọi kích thước "rig" suy ra từ số đo (không đoán); chỉ độ sâu (trục Z; ảnh phác không có hình nghiêng) chọn theo tỉ lệ.
"""
import json, os
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GA = os.path.join(ROOT, 'assets', 'characters', 'ga')
W, H = 1028, 1530


def load(n):
    return np.array(Image.open(os.path.join(GA, n + '.png')).convert('RGB')).astype(int)


def classes(im):
    R, G, B = im[..., 0], im[..., 1], im[..., 2]
    return {
        'yellow': (R > 200) & (G > 160) & (B < 110),
        'red': (R > 170) & (G < 90) & (B < 90),
        'green': (G > R + 8) & (G > B + 30) & (G > 100),
        'brown': (R > 60) & (R < 150) & (G < 70) & (B < 60) & (R > G + 25),
        'dark': (R < 75) & (G < 75) & (B < 75),
        'cream': (R > 215) & (G > 200) & (B > 185) & (B < 240) & (R - B > 10),
    }


def bb(m, x0=0, x1=W, y0=0, y1=H):
    s = m[y0:y1, x0:x1]
    ys, xs = np.where(s)
    if len(ys) == 0:
        return None
    return [int(xs.min() + x0), int(xs.max() + x0), int(ys.min() + y0), int(ys.max() + y0)]


def measure(name):
    im = load(name)
    C = classes(im)
    yel, red, grn, brn, drk, crm = (C[k] for k in ('yellow', 'red', 'green', 'brown', 'dark', 'cream'))
    M = {}

    def half(y):
        r = np.where((yel | red)[y, 300:760])[0]
        return (r.max() - r.min()) / 2 if len(r) else 0

    xs = np.arange(92, 133, 4)
    hs = np.array([half(y) for y in xs]) ** 2
    k, b = np.polyfit(xs, hs, 1)
    M['head_top'] = int(round(-b / k))
    M['head_half_rows'] = {int(y): float(half(y)) for y in list(range(M['head_top'] + 14, 140, 6)) + list(range(222, 428, 10))}
    r = np.where(yel[300, 300:760])[0]
    M['head_x'] = [int(r.min() + 300), int(r.max() + 300)]
    M['crest'] = bb(yel, 300, 760, 0, 72)
    M['band'] = bb(red, 300, 760, 120, 232)
    if name == 'back':
        M['band_tails'] = bb(red, 300, 760, 222, 400)
        M['band_knot'] = bb(red, 480, 570, 150, 225)
    M['torso_green'] = bb(grn, 268, 760, 600, 960)
    M['arm_green_L'] = bb(grn, 0, 276, 420, 960)
    M['arm_green_R'] = bb(grn, 752, W, 420, 960)
    M['hand_L'] = bb(yel, 0, 280, 880, 1100)
    M['hand_R'] = bb(yel, 740, W, 880, 1100)
    M['shorts'] = bb(brn, 100, 930, 900, 1340)
    M['shin_L'] = bb(yel, 190, 516, 1250, 1400)
    M['shin_R'] = bb(yel, 520, 840, 1250, 1400)
    M['shoe_L'] = bb(drk | crm, 190, 516, 1360, 1522)
    M['shoe_R'] = bb(drk | crm, 520, 840, 1360, 1522)
    M['dark_shoes_top'] = bb(drk, 190, 840, 1350, 1522)
    cr = crm[1380:1525, 190:516].sum(1)
    M['sole_top_row'] = int(1380 + np.argmax(cr > 120))
    return M


F = measure('front')
B = measure('back')
head_top = F['head_top']
sole_bot = 1518
STUD = 5.2 / (sole_bot - head_top)


def Y(px):
    return round((sole_bot - px) * STUD, 4)


def L(px):
    return round(px * STUD, 4)


def seams(name):
    g = np.array(Image.open(os.path.join(GA, name + '.png')).convert('L')).astype(float)[620:880].mean(0)
    return 255 + int(np.argmin(g[255:295])), 730 + int(np.argmin(g[730:775]))


_sf, _sb = seams('front'), seams('back')
torso_w_px = ((_sf[1] - _sf[0]) + (_sb[1] - _sb[0])) / 2      # khoảng giữa hai đường may vai (trung bình trước/sau)
armL_w = F['arm_green_L'][1] - F['arm_green_L'][0]
armR_w = F['arm_green_R'][1] - F['arm_green_R'][0]
arm_w_px = (_sf[0] - F['arm_green_L'][0] + F['arm_green_R'][1] - _sf[1]) / 2
shoulder_top = F['arm_green_L'][2]          # hàng trên cùng của tay áo (trái, không dính cổ áo)
sleeve_bot = F['arm_green_R'][3]
hem_px = F['torso_green'][3]
shorts_bot = F['shin_L'][2]
leg_cx_px = ((F['shoe_L'][0] + F['shoe_L'][1]) / 2, (F['shoe_R'][0] + F['shoe_R'][1]) / 2)
cx = W / 2
head_bot_px = 445
prof = [(y, h) for y, h in sorted(F['head_half_rows'].items()) if not (140 <= y <= 222)]
dims = {
    'note': 'px = ảnh phác 1028x1530; stud = px * stud_per_px (đỉnh đầu = 5.2, chân y=0). Sinh bởi tools/ga_measure.py',
    'image': [W, H], 'stud_per_px': STUD, 'sole_bottom_px': sole_bot,
    'front': F, 'back': B,
    'rig': {
        'crest_top': Y(F['crest'][2]),
        'head': {
            'top': 5.2, 'bottom': Y(head_bot_px), 'width': L(F['head_x'][1] - F['head_x'][0]),
            'profile_top_down': [[round((y - head_top) * STUD, 4), round(h * STUD, 4)] for y, h in prof if y <= 425],
        },
        'band': {'y0': Y(F['band'][3]), 'y1': Y(F['band'][2]), 'w': L(F['band'][1] - F['band'][0])},
        'crest': {'x': [round((F['crest'][0] - cx) * STUD, 4), round((F['crest'][1] - cx) * STUD, 4)], 'y': [Y(F['crest'][3]), Y(F['crest'][2])]},
        'shoulder_y': Y(shoulder_top), 'hem_y': Y(hem_px), 'sleeve_cuff_y': Y(sleeve_bot),
        'hand_bottom_y': Y(F['hand_R'][3]), 'hand_w': L(F['hand_R'][1] - F['hand_R'][0]),
        'torso_w': L(torso_w_px), 'arm_w': L(arm_w_px),
        'arm_cx': round((torso_w_px / 2 + arm_w_px / 2) * STUD, 4),
        'shorts_y': [Y(hem_px), Y(shorts_bot)], 'shorts_w_total': L(F['shorts'][1] - F['shorts'][0]),
        'shoe_top_y': Y(F['dark_shoes_top'][2]), 'sole_top_y': Y(F['sole_top_row']), 'shoe_w': L(F['shoe_L'][1] - F['shoe_L'][0]),
        'leg_cx': round(abs(leg_cx_px[1] - leg_cx_px[0]) / 2 * STUD, 4),
    },
}
json.dump(dims, open(os.path.join(GA, 'dims.json'), 'w', encoding='utf8'), indent=1, ensure_ascii=False)
open(os.path.join(ROOT, 'engine', 'ga-dims.js'), 'w', encoding='utf8').write(
    '// ga-dims.js — SINH TỰ ĐỘNG bởi tools/ga_measure.py từ assets/characters/ga/dims.json. Đừng sửa tay.\nexport const GA_DIMS = ' + json.dumps(dims, ensure_ascii=False) + ';\n')
print(json.dumps(dims['rig'], indent=1, ensure_ascii=False))
print('STUD/px', STUD, 'head_top px', head_top)
for k in ('crest', 'band', 'torso_green', 'arm_green_L', 'arm_green_R', 'hand_L', 'hand_R', 'shorts', 'shin_L', 'shin_R', 'shoe_L', 'shoe_R', 'dark_shoes_top'):
    print(k, F[k])
