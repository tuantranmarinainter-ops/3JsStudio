"""r6-bobj-ga.py — Gà (Anh Gà MC) thành mô hình R6 BOBJ cho BBS FS 2.7 + trang thử.

Đọc assets/r6-bobj/r6.bobj (R6, UV kiểu skin Steve), vẽ tấm da 256x256 theo màu Gà trong engine/r6-looks.js
(đầu vàng, băng đô đỏ, hoodie ô-liu sọc, quần lửng nâu, giày đen đế kem), dán mặt Gà (assets/characters/ga/faces),
thêm chỏm 3 múi (3 khối gắn xương head). Ghi assets/r6-bobj/ga/{ga-r6.bobj, ga.png, config.json}.

  python tools/r6-bobj-ga.py [--mat 00_binh_thuong] [--khong-chom] [--khong-mat]
"""
import argparse, json, os
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'assets', 'r6-bobj', 'r6.bobj')
OUT = os.path.join(ROOT, 'assets', 'r6-bobj', 'ga')
FACES = os.path.join(ROOT, 'assets', 'characters', 'ga', 'faces')
W = 256  # cỡ da (UV chuẩn hoá nên BBS nhận mọi cỡ)

# ---- màu Gà (engine/r6-looks.js R6_LOOKS.ga) ----
VANG, BANG = '#ffe000', '#e01b1b'
AO, AO_DUOI, SOC, TUI, TUI_VIEN = '#7da33c', '#6b8f32', '#c9d95a', '#77993a', '#5f7f2c'
QUAN, QUAN_VIEN, GIAY, DE = '#6b2e1e', '#a8512e', '#222426', '#d9d2be'
CHOM = '#ffd800'
# vùng phần (block, R6 1 stud = 0.4 block): y0..y1
PHAN = {'head': (1.6, 2.0), 'torso': (0.8, 1.6), 'larm': (0.8, 1.6), 'rarm': (0.8, 1.6), 'lleg': (0.0, 0.8), 'rleg': (0.0, 0.8)}


def rgb(h):
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))


def group(bone):
    if bone == 'head': return 'head'
    if bone in ('anchor', 'body', 'low_body'): return 'torso'
    if 'left_arm' in bone: return 'larm'
    if 'right_arm' in bone: return 'rarm'
    if 'left_leg' in bone: return 'lleg'
    return 'rleg'


def bands(f, spec):
    for a, b, c in spec:
        if a <= f <= b: return c
    return spec[-1][2]


def stripes(f, n, h, y0, y1):
    if not (y0 <= f <= y1): return False
    step = (y1 - y0) / n
    k = (f - y0) % step
    return k < h


def color(part, side, p, face_img):
    y0, y1 = PHAN[part]
    f = (y1 - p[1]) / (y1 - y0)  # 0 = đỉnh phần, 1 = đáy
    if part == 'head':
        if side == 'top': return VANG
        if 0.22 <= f <= 0.42: return BANG
        return VANG
    if part == 'torso':
        if side in ('top', 'bottom'): return AO_DUOI
        c = bands(f, [(0, 0.92, AO), (0.92, 1, AO_DUOI)])
        if side == 'front':
            # túi kangaroo: hình thang từ 0.6 → 0.88
            if 0.6 <= f <= 0.88:
                k = (f - 0.6) / 0.28
                half = 0.26 + 0.1 * k
                u = p[0] / 0.8  # -0.5..0.5 theo bề ngang thân (0.8 block)
                if abs(u) <= half:
                    return TUI_VIEN if (half - abs(u) < 0.02 or f < 0.615) else TUI
        if f < 0.92 and stripes(f, 7, 0.035, 0.02, 0.9): return SOC
        return c
    if part in ('larm', 'rarm'):
        if side == 'top': return AO
        if side == 'bottom': return VANG
        c = bands(f, [(0, 0.74, AO), (0.74, 0.8, AO_DUOI), (0.8, 1, VANG)])
        if f < 0.74 and stripes(f, 6, 0.035, 0.02, 0.74): return SOC
        return c
    # chân
    if side == 'top': return QUAN
    if side == 'bottom': return DE
    return bands(f, [(0, 0.5, QUAN), (0.5, 0.52, QUAN_VIEN), (0.52, 0.8, VANG), (0.8, 0.94, GIAY), (0.94, 1, DE)])


def side_of(n):
    ax = max(range(3), key=lambda i: abs(n[i]))
    return {(0, 1): 'left', (0, -1): 'right', (1, 1): 'top', (1, -1): 'bottom', (2, 1): 'front', (2, -1): 'back'}[(ax, 1 if n[ax] > 0 else -1)]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--mat', default='00_binh_thuong')
    ap.add_argument('--khong-chom', action='store_true')
    ap.add_argument('--khong-mat', action='store_true')
    a = ap.parse_args()
    lines = open(SRC, encoding='utf-8').read().splitlines()
    V, T, N, WT, faces = [], [], [], [], []
    for l in lines:
        p = l.split()
        if not p: continue
        if p[0] == 'v': V.append([float(x) for x in p[1:4]]); WT.append([])
        elif p[0] == 'vt': T.append([float(x) for x in p[1:3]])
        elif p[0] == 'vn': N.append([float(x) for x in p[1:4]])
        elif p[0] == 'vw': WT[-1].append((p[1], float(p[2])))
        elif p[0] == 'f': faces.append([[int(x) - 1 for x in c.split('/')] for c in p[1:]])

    img = Image.new('RGBA', (W, W), (0, 0, 0, 0))
    px = img.load()
    for fc in faces:
        bone = max(WT[fc[0][0]], key=lambda w: w[1])[0]
        part, side = group(bone), side_of(N[fc[0][2]])
        pts = [(T[c[1]][0] * W, (1 - T[c[1]][1]) * W, V[c[0]]) for c in fc]
        for tri in ([pts[0], pts[i], pts[i + 1]] for i in range(1, len(pts) - 1)):
            (x0, y0, P0), (x1, y1, P1), (x2, y2, P2) = tri
            d = (y1 - y2) * (x0 - x2) + (x2 - x1) * (y0 - y2)
            if abs(d) < 1e-9: continue
            for yy in range(int(min(y0, y1, y2)), int(max(y0, y1, y2)) + 1):
                for xx in range(int(min(x0, x1, x2)), int(max(x0, x1, x2)) + 1):
                    cx, cy = xx + 0.5, yy + 0.5
                    l0 = ((y1 - y2) * (cx - x2) + (x2 - x1) * (cy - y2)) / d
                    l1 = ((y2 - y0) * (cx - x2) + (x0 - x2) * (cy - y2)) / d
                    l2 = 1 - l0 - l1
                    if min(l0, l1, l2) < -1e-6 or not (0 <= xx < W and 0 <= yy < W): continue
                    P = [l0 * P0[i] + l1 * P1[i] + l2 * P2[i] for i in range(3)]
                    px[xx, yy] = rgb(color(part, side, P, None)) + (255,)

    # mặt Gà: dán lên mặt trước đầu (dưới băng đô)
    if not a.khong_mat:
        head_front = None
        for fc in faces:
            bone = max(WT[fc[0][0]], key=lambda w: w[1])[0]
            if group(bone) == 'head' and side_of(N[fc[0][2]]) == 'front':
                head_front = fc
        uv = [(T[c[1]][0] * W, (1 - T[c[1]][1]) * W, V[c[0]]) for c in head_front]
        # khung mặt trong toạ độ 3D: x -0.4..0.4, y 1.6..2.0; tìm điểm UV ứng với x/y bằng nội suy theo 2 trục
        # ánh xạ affine (x,y) → (u,v) từ 3 góc của mặt trước đầu
        (ua, va, A), (ub, vb, B), (uc, vc, C) = uv[0], uv[1], uv[2]
        det = (B[0] - A[0]) * (C[1] - A[1]) - (C[0] - A[0]) * (B[1] - A[1])
        def to_uv(x, y):
            s = ((x - A[0]) * (C[1] - A[1]) - (C[0] - A[0]) * (y - A[1])) / det
            t = ((B[0] - A[0]) * (y - A[1]) - (x - A[0]) * (B[1] - A[1])) / det
            return (ua + s * (ub - ua) + t * (uc - ua), va + s * (vb - va) + t * (vc - va))
        face = Image.open(os.path.join(FACES, a.mat + '.png')).convert('RGBA')
        face = face.crop(face.getchannel('A').getbbox())
        fh = 0.21  # block, phần dưới băng đô
        fw = fh * face.width / face.height
        cy = 2.0 - 0.71 * 0.4
        (u0, v0), (u1, v1) = to_uv(-fw / 2, cy + fh / 2), to_uv(fw / 2, cy - fh / 2)
        box = (round(min(u0, u1)), round(min(v0, v1)), round(max(u0, u1)), round(max(v0, v1)))
        fimg = face.resize((box[2] - box[0], box[3] - box[1]), Image.LANCZOS)
        if u0 > u1: fimg = fimg.transpose(Image.FLIP_LEFT_RIGHT)
        if v0 > v1: fimg = fimg.transpose(Image.FLIP_TOP_BOTTOM)
        img.alpha_composite(fimg, (box[0], box[1]))

    # ô màu chỏm ở góc da
    ImageDraw.Draw(img).rectangle([W - 8, W - 8, W - 1, W - 1], fill=rgb(CHOM) + (255,))
    os.makedirs(OUT, exist_ok=True)
    img.save(os.path.join(OUT, 'ga.png'))

    out = [l for l in lines]
    out[0] = '# Ga (Anh Ga MC) R6 BOBJ — tools/r6-bobj-ga.py tu assets/r6-bobj/r6.bobj'
    if not a.khong_chom:
        add = []  # chung object 'body' để BBS dùng một tấm da
        nv, nt, nn = len(V), len(T), len(N)
        add += ['vt %.6f %.6f' % ((W - 4) / W, 1 - (W - 4) / W)]
        for n in [(1, 0, 0), (-1, 0, 0), (0, 1, 0), (0, -1, 0), (0, 0, 1), (0, 0, -1)]: add.append('vn %d %d %d' % n)
        k = 0
        for bx, h in [(-0.1, 0.12), (0.0, 0.18), (0.1, 0.13)]:
            w, dz = 0.09, 0.09
            x0, x1, y0, y1, z0, z1 = bx - w / 2, bx + w / 2, 1.99, 1.99 + h, -dz / 2, dz / 2
            corners = [(x, y, z) for x in (x0, x1) for y in (y0, y1) for z in (z0, z1)]
            for c in corners: add += ['v %.6f %.6f %.6f' % c, 'vw head 1.000000']
            b = nv + k * 8 + 1
            idx = lambda i, j, l: b + i * 4 + j * 2 + l
            quads = [([idx(1, 0, 0), idx(1, 1, 0), idx(1, 1, 1), idx(1, 0, 1)], 1), ([idx(0, 0, 0), idx(0, 0, 1), idx(0, 1, 1), idx(0, 1, 0)], 2),
                     ([idx(0, 1, 0), idx(0, 1, 1), idx(1, 1, 1), idx(1, 1, 0)], 3), ([idx(0, 0, 0), idx(1, 0, 0), idx(1, 0, 1), idx(0, 0, 1)], 4),
                     ([idx(0, 0, 1), idx(1, 0, 1), idx(1, 1, 1), idx(0, 1, 1)], 5), ([idx(0, 0, 0), idx(0, 1, 0), idx(1, 1, 0), idx(1, 0, 0)], 6)]
            for q, ni in quads:  # tam giác (như bản Blender xuất)
                for tri in ((q[0], q[1], q[2]), (q[0], q[2], q[3])): add.append('f ' + ' '.join('%d/%d/%d' % (v, nt + 1, nn + ni) for v in tri))
            k += 1
        # chèn trước khối "# Animation data" (nếu có) để giữ thứ tự BOBJ
        at = next((i for i, l in enumerate(out) if l.startswith('# Animation data')), len(out))
        out = out[:at] + add + out[at:]
    open(os.path.join(OUT, 'ga-r6.bobj'), 'w', encoding='utf-8', newline='\n').write('\n'.join(out) + '\n')
    cfg = json.load(open(os.path.join(ROOT, 'assets', 'r6-bobj', 'config.json'), encoding='utf-8'))
    cfg['texture'] = 'assets:models/ga_r6/ga.png'
    json.dump(cfg, open(os.path.join(OUT, 'config.json'), 'w', encoding='utf-8'), indent='\t', ensure_ascii=False)
    print('ok', os.path.join(OUT, 'ga-r6.bobj'), 'mat', 'tat' if a.khong_mat else a.mat, 'chom', 'tat' if a.khong_chom else 'bat')


if __name__ == '__main__':
    main()
