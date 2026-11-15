#!/usr/bin/env python3
"""Atlas texture của Gà: cắt vùng thân/tay áo/quần/giày từ ảnh phác trước/sau, LÀM PHẲNG ĐỘ SÁNG (bỏ bóng đổ nướng sẵn),
xoá dây rút khỏi áo (dây là khối 3D riêng), xếp vào 1 atlas.
Chạy lại được:  python tools/ga_atlas.py [--preview]
Ra:  assets/characters/ga/atlas.webp  +  atlas.json  +  engine/ga-atlas.js (toạ độ ô, đọc bởi engine/ga-rig.js)
Làm phẳng: với mỗi vùng chữ nhật, P(y) = trung vị theo x của độ sáng (= sọc ngang sạch), tỉ lệ bóng = L/P(y) được làm mờ
Gauss lớn rồi chia ngược -> còn lại màu + sọc + dệt vải + túi + chỉ may, mất vệt tối ở mép khối.
Mặt bên (ảnh phác không có hình nghiêng): lấy lại sọc/dệt từ tay áo cùng hàng (sọc áo và tay thẳng hàng trên ảnh).
"""
import json, os, sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
import cv2

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GA = os.path.join(ROOT, 'assets', 'characters', 'ga')
D = json.load(open(os.path.join(GA, 'dims.json'), encoding='utf8'))
S = D['stud_per_px']
FR = np.array(Image.open(os.path.join(GA, 'front.png')).convert('RGB')).astype(np.float32)
BK = np.array(Image.open(os.path.join(GA, 'back.png')).convert('RGB')).astype(np.float32)
px = lambda y: int(round(D['sole_bottom_px'] - y / S))          # độ cao stud -> hàng ảnh
R = D['rig']
Y_SH, Y_HEM = px(R['shoulder_y']), px(R['hem_y'])               # 431, 947
LOW_H = 0.33
Y_WAIST = px(R['hem_y'] + LOW_H)                                # đường UpperTorso | LowerTorso (hàng ảnh)
UA_LEN = 0.95
Y_ELBOW = px(R['shoulder_y'] - UA_LEN)
Y_CUFF = px(R['sleeve_cuff_y'])
Y_HAND = px(R['hand_bottom_y'])
Y_SH_HEM, Y_SH_BOT = px(R['shorts_y'][0]), px(R['shorts_y'][1])  # quần: hàng 947..1300


def lum(a):
    return a[..., 0] * 0.299 + a[..., 1] * 0.587 + a[..., 2] * 0.114


def flatten(crop, sigma=28.0, central=0.6):
    """Bỏ bóng nướng sẵn nhưng giữ sọc + dệt + chi tiết."""
    h, w = crop.shape[:2]
    L = lum(crop) + 1e-3
    x0, x1 = int(w * (1 - central) / 2), int(w * (1 + central) / 2)
    P = np.median(L[:, x0:x1], axis=1)
    P = ndi.gaussian_filter1d(P, 0.7)
    ratio = np.clip(L / P[:, None], 0.35, 1.8)
    sh = ndi.gaussian_filter(ratio, sigma, mode='nearest')
    out = crop / sh[..., None]
    return np.clip(out, 0, 255)


BGC = np.array([219, 210, 219], np.float32)


def clean(crop, yellow=False, dil=5):
    """Xoá nền xám (và da vàng nếu yellow) ở góc bo bằng inpaint từ vải kế bên."""
    c = np.clip(crop, 0, 255).astype(np.uint8)
    m = (np.abs(crop - BGC).sum(2) < 70)
    if yellow:
        m |= (crop[..., 0] > 190) & (crop[..., 1] > 150) & (crop[..., 2] < 120)
    m = cv2.dilate(m.astype(np.uint8), np.ones((dil, dil), np.uint8))
    return cv2.inpaint(c, m, 7, cv2.INPAINT_TELEA).astype(np.float32)


def fill_cols(img, xa, xb, y0, y1, margin=3, weave=None):
    """Xoá dải cột [xa,xb] ở các hàng y0..y1 bằng nội suy ngang giữa hai bên (hợp với sọc ngang); weave = ảnh sọc sạch để thêm vân dệt."""
    out = img.copy()
    for y in range(y0, y1):
        l, r = out[y, xa - margin], out[y, xb + margin]
        t = np.linspace(0, 1, xb - xa + 1)[:, None]
        v = l * (1 - t) + r * t
        if weave is not None:
            wv = weave[y, xa:xb + 1]; v = v * (wv / (np.median(weave[y], axis=0) + 1e-3))
        out[y, xa:xb + 1] = v
    return out


def mirror_tile(a, width):
    """Lát ngang (lật xen kẽ để không lộ mép) rồi cắt giữa đúng bề rộng."""
    reps = int(np.ceil(width / a.shape[1])) + 2
    parts = [a if i % 2 == 0 else a[:, ::-1] for i in range(reps)]
    big = np.concatenate(parts, 1)
    s = (big.shape[1] - width) // 2
    return big[:, s:s + width]


def rs(a, w, h):
    return cv2.resize(a, (int(w), int(h)), interpolation=cv2.INTER_AREA if (a.shape[1] > w) else cv2.INTER_LINEAR)


# ---- ô cần dựng ---------------------------------------------------------------------------
rects = {}   # tên -> mảng float32 (h,w,3)

# tay áo (trước: tay phải nhân vật = nửa trái ảnh; sau: tay trái nhân vật = nửa trái ảnh)
ARM_X = {'front': {'R': (60, 272), 'L': (754, 974)}, 'back': {'L': (60, 268), 'R': (758, 978)}}
sleeve_clean = None
for side in ('R', 'L'):
    for view, img in (('front', FR), ('back', BK)):
        x0, x1 = ARM_X[view][side]
        crop = flatten(clean(img[Y_SH:Y_CUFF, x0:x1]))
        w = int(round(R['arm_w'] / S))
        crop = rs(crop, w, crop.shape[0])
        if view == 'front' and side == 'R':
            sleeve_clean = crop
        ua = crop[:Y_ELBOW - Y_SH]
        la = crop[Y_ELBOW - Y_SH:]
        rects[f'{side}UA_{view}'] = ua
        rects[f'{side}LA_{view}'] = la
        if view == 'front':
            rects[f'{side}UA_side'] = ua
            rects[f'{side}LA_side'] = la
    rects[f'{side}UA_top'] = np.tile(sleeve_clean[10:40].mean((0, 1)), (int(round(R['arm_w'] / S)), int(round(R['arm_w'] / S)), 1)).astype(np.float32)

# sọc sạch dùng cho vá chỗ che (cổ áo, mũ trùm) và mặt bên thân: tay áo kéo giãn ngang
TW = int(round(R['torso_w'] / S))      # 476
TD = int(round(R['torso_w'] / 1.9 / S))  # sâu thân ~0.89 stud
sleeve_rows = sleeve_clean          # hàng Y_SH..Y_CUFF
torso_fill = mirror_tile(sleeve_rows, TW)
torso_h = Y_HEM - Y_SH

# thân trước: dây rút + cổ áo thay bằng sọc sạch
tf = flatten(FR[Y_SH:Y_HEM, 274:274 + TW])
tf = fill_cols(tf, 443 - 274, 497 - 274, 0, 650 - Y_SH, weave=torso_fill)           # dây trái (trong ảnh) + lỗ xỏ  (x 443..497)
tf = fill_cols(tf, 553 - 274, 612 - 274, 0, 650 - Y_SH, weave=torso_fill)           # dây phải
# bóng/cổ áo ở 70 hàng trên cùng (cổ mũ trùm 3D che)
rows_cover = 82
blend = np.clip((np.arange(rows_cover) / rows_cover)[:, None, None], 0, 1)
tf[:rows_cover] = torso_fill[:rows_cover] * (1 - blend) + tf[:rows_cover] * blend
tf[:30] = torso_fill[:30]
# sau: mũ trùm che từ trên xuống ~ hàng 610 -> thay bằng sọc sạch (mũ trùm 3D che), chuyển mượt
bf = flatten(BK[Y_SH:Y_HEM, 272:272 + TW + 4])
bf = rs(bf, TW, torso_h)
cover = 610 - Y_SH
blend = np.clip(((np.arange(cover + 30) - cover) / -30.0)[:, None, None] * -1 + 1, 0, 1)  # 1 trên cùng -> 0 tại cover+30
fillw = np.clip(1 - (np.arange(cover + 40) - cover) / 40.0, 0, 1)[:, None, None]
bf[:cover + 40] = torso_fill[:cover + 40] * fillw + bf[:cover + 40] * (1 - fillw)
y_cut = Y_WAIST - Y_SH
rects['UT_front'], rects['LT_front'] = tf[:y_cut], tf[y_cut:]
rects['UT_back'], rects['LT_back'] = bf[:y_cut], bf[y_cut:]
# cạnh thân: sọc tay áo (kéo ngang) ; hàng ở gấu lấy từ gấu sau sạch
side_up = rs(sleeve_rows, TD, sleeve_rows.shape[0])
hem_side = rs(bf[-(Y_HEM - Y_CUFF) - 10:, 100:100 + TD], TD, Y_HEM - Y_CUFF + 10) if False else rs(bf[:, 100:100 + 253], TD, torso_h)
side_t = np.concatenate([side_up, hem_side[side_up.shape[0]:]], 0)[:torso_h]
rects['UT_side'], rects['LT_side'] = side_t[:y_cut], side_t[y_cut:]
rects['UT_top'] = np.tile(torso_fill[5:35].mean((0, 1)), (TD, TW, 1)).astype(np.float32)

# quần short: chân phải nhân vật = nửa trái ảnh trước (nửa phải ảnh sau)
LEG_X = {'front': {'R': (214, 512), 'L': (516, 814)}, 'back': {'L': (214, 512), 'R': (516, 814)}}
for side in ('R', 'L'):
    for view, img in (('front', FR), ('back', BK)):
        x0, x1 = LEG_X[view][side]
        c = flatten(clean(img[Y_SH_HEM + 20:Y_SH_BOT - 3, x0:x1], yellow=True), central=0.5)
        rects[f'{side}SH_{view}'] = c
        if view == 'front':
            rects[f'{side}SH_side'] = c
        if view == 'back':
            rects[f'{side}SH_top'] = np.tile(c[8:30].mean((0, 1)), (60, 60, 1)).astype(np.float32)

# giày: đế kem + thân đen; dây giày/lỗ xỏ là khối 3D -> xoá khỏi ảnh
Y_SOLE = px(R['sole_top_y'])        # hàng ảnh bắt đầu đế
Y_SHOE_T = px(R['shoe_top_y'])
SHOE_X = {'front': {'R': (209, 502), 'L': (531, 817)}, 'back': {'L': (209, 502), 'R': (531, 817)}}
for side in ('R', 'L'):
    for view, img in (('front', FR), ('back', BK)):
        x0, x1 = SHOE_X[view][side]
        up = img[Y_SHOE_T + 6:Y_SOLE - 2, x0:x1].copy()
        so = flatten(img[Y_SOLE + 2:1516, x0:x1], sigma=18, central=0.5)
        if view == 'front':
            m = (lum(up) > 70).astype(np.uint8)
            m[:, :18] = 0; m[:, -18:] = 0                          # giữ mép vát hai bên
            m = cv2.dilate(m, np.ones((5, 5), np.uint8))
            up = cv2.inpaint(np.clip(up, 0, 255).astype(np.uint8), m, 5, cv2.INPAINT_TELEA).astype(np.float32)
        else:
            m = (lum(up) > 95).astype(np.uint8)
            m[:, :18] = 0; m[:, -18:] = 0
            m = cv2.dilate(m, np.ones((5, 5), np.uint8))
            up = cv2.inpaint(np.clip(up, 0, 255).astype(np.uint8), m, 5, cv2.INPAINT_TELEA).astype(np.float32)
        rects[f'{side}UP_{view}'] = up
        rects[f'{side}SO_{view}'] = so
        if view == 'back':
            rects[f'{side}UP_side'] = rs(up, 340, up.shape[0])
            rects[f'{side}SO_side'] = rs(so, 340, so.shape[0])
            rects[f'{side}UP_top'] = np.tile(up[2:12].mean((0, 1)), (60, 60, 1)).astype(np.float32)
            rects[f'{side}SO_top'] = np.tile(so[2:8].mean((0, 1)), (60, 60, 1)).astype(np.float32)

# mũ trùm + cổ áo: sọc sạch rộng (3 lần tay áo) — UV theo độ cao thế giới
rects['HOOD'] = mirror_tile(sleeve_rows, 3 * sleeve_rows.shape[1])

# ---- xếp (shelf packer) ----------------------------------------------------------------
PAD = 3
ATLAS = 2048
items = sorted(rects.items(), key=lambda kv: -kv[1].shape[0])
x = y = rowh = 0
placed = {}
for name, a in items:
    h, w = a.shape[:2]
    if x + w + 2 * PAD > ATLAS:
        x = 0; y += rowh; rowh = 0
    placed[name] = [x + PAD, y + PAD, int(w), int(h)]
    x += w + 2 * PAD; rowh = max(rowh, h + 2 * PAD)
Hh = int(np.ceil((y + rowh) / 64) * 64)
atlas = np.zeros((Hh, ATLAS, 3), np.float32)
atlas[:] = (120, 150, 80)
for name, a in rects.items():
    rx, ry, w, h = placed[name]
    padded = np.pad(a, ((PAD, PAD), (PAD, PAD), (0, 0)), mode='edge')
    atlas[ry - PAD:ry + h + PAD, rx - PAD:rx + w + PAD] = padded
out = Image.fromarray(np.clip(atlas, 0, 255).astype(np.uint8))
out.save(os.path.join(GA, 'atlas.webp'), quality=90, method=6)
if '--preview' in sys.argv:
    out.save(os.path.join(GA, '..', '..', '..', 'output', 'look', 'ga2', 'atlas_preview.png'))
meta = {'size': [ATLAS, Hh], 'rects': placed}
json.dump(meta, open(os.path.join(GA, 'atlas.json'), 'w'), indent=0)
open(os.path.join(ROOT, 'engine', 'ga-atlas.js'), 'w', encoding='utf8').write(
    '// ga-atlas.js — SINH TỰ ĐỘNG bởi tools/ga_atlas.py (toạ độ ô trong assets/characters/ga/atlas.webp). Đừng sửa tay.\nexport const GA_ATLAS = ' + json.dumps(meta) + ';\n')
print('atlas', ATLAS, Hh, 'ô:', len(placed), 'webp', os.path.getsize(os.path.join(GA, 'atlas.webp')) // 1024, 'KB')
