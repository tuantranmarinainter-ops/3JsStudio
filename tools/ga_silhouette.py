#!/usr/bin/env python3
"""So SILHOUETTE Gà 3D (camera trực giao khớp khung ảnh phác) với front.png / back.png.
Chụp trước:  node tools/ga-shoot.mjs <ra> jobs.json  (job ortho: view=front|back &anim=ref &ortho=1 &mode=v2) → o_front.png, o_back.png
Chạy:  python tools/ga_silhouette.py <thư mục chứa o_front.png,o_back.png> [out.png]
In: IoU tổng (thô và sau khi dời ngang tối ưu <= 30 px), lệch bề rộng theo dải chiều cao (%), lưu ảnh chồng mask:
3D = đỏ, phác = lục, trùng = vàng.
"""
import os, sys
sys.stdout.reconfigure(encoding="utf-8")
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GA = os.path.join(ROOT, 'assets', 'characters', 'ga')
BGC = np.array([219, 210, 219], float)
BANDS = [('chỏm', 10, 70), ('đầu (vòm)', 71, 138), ('băng đô', 141, 220), ('đầu (dưới)', 222, 350), ('cổ/vai', 360, 440),
         ('thân+tay', 450, 900), ('bàn tay', 906, 962), ('quần', 975, 1290), ('cẳng chân', 1302, 1364), ('giày', 1375, 1516)]
FLOOR = 1518


def mask(path, sketch):
    a = np.array(Image.open(path).convert('RGB')).astype(float)
    d = np.sqrt(((a - BGC) ** 2).sum(2))
    if not sketch:
        m = d > 9                      # render 3D: nền phẳng đúng màu → ngưỡng thấp (bắt cả đế kem)
    else:                              # ảnh phác: có bóng đổ nền dưới giày → từ hàng 1365 chỉ nhận màu vật thể (đen / kem đế / vàng)
        m = d > 22
        R, G, B = a[..., 0], a[..., 1], a[..., 2]
        obj = ((R < 90) & (G < 90) & (B < 90)) | ((R > 215) & (G > 200) & (B > 185) & (R - B > 8) & (B < 240)) | ((R > 200) & (G > 160) & (B < 110))
        m[1365:] &= obj[1365:]
        from scipy import ndimage as ndi
        m[1365:] = ndi.binary_closing(m[1365:], iterations=3)
    m[FLOOR + 1:] = False
    return m


def band_stats(m3, ms):
    out = []
    for name, y0, y1 in BANDS:
        w3, ws, ioub = [], [], []
        for y in range(y0, y1 + 1):
            a, b = np.where(m3[y])[0], np.where(ms[y])[0]
            if len(a) and len(b):
                w3.append(a.max() - a.min()); ws.append(b.max() - b.min())
            i = (m3[y] & ms[y]).sum(); u = (m3[y] | ms[y]).sum(); ioub.append(i / u if u else 1)
        W3, WS = float(np.median(w3)), float(np.median(ws))
        out.append((name, y0, y1, WS, W3, 100 * (W3 - WS) / WS, float(np.mean(ioub))))
    return out


def aligned_iou(m3, ms):
    """IoU sau khi dời ngang TỪNG DẢI (<=30 px) — bù ảnh phác lệch tâm giữa đầu và thân (đầu trước lệch phải ~23 px)."""
    I = U = 0
    edges = [(0, 140), (141, 220), (221, 440), (441, 960), (961, 1290), (1291, FLOOR + 1)]
    shifts = []
    for y0, y1 in edges:
        best = max(((np.roll(m3[y0:y1], dx, 1) & ms[y0:y1]).sum() / max(1, (np.roll(m3[y0:y1], dx, 1) | ms[y0:y1]).sum()), dx) for dx in range(-30, 31, 1))
        dx = best[1]; a = np.roll(m3[y0:y1], dx, 1); I += (a & ms[y0:y1]).sum(); U += (a | ms[y0:y1]).sum(); shifts.append(dx)
    return I / U, shifts


def iou(a, b):
    return (a & b).sum() / max(1, (a | b).sum())


def main(d, outp):
    res = {}
    tiles = []
    for view in ('front', 'back'):
        m3 = mask(os.path.join(d, f'o_{view}.png'), False)
        ms = mask(os.path.join(GA, f'{view}.png'), True)
        raw = iou(m3, ms)
                # dời theo từng dải để bù lệch tâm của ảnh phác (đầu trước lệch phải ~23 px so với thân)
        res[view] = (raw, aligned_iou(m3, ms), band_stats(m3, ms))
        img = np.zeros(m3.shape + (3,), np.uint8)
        img[..., 0] = m3 * 255; img[..., 1] = ms * 255
        tiles.append(Image.fromarray(img).resize((514, 765), Image.LANCZOS))
    sheet = Image.new('RGB', (1028 + 8, 765), (30, 30, 30))
    sheet.paste(tiles[0], (0, 0)); sheet.paste(tiles[1], (522, 0)); sheet.save(outp)
    for view in ('front', 'back'):
        raw, (b, dx), bands = res[view]
        print(f'== {view}: IoU thô {raw:.3f} | IoU sau dời ngang từng dải {b:.3f} (dời {dx} px)')
        print(f'   {"dải":<12}{"hàng":>11}{"rộng phác":>11}{"rộng 3D":>9}{"lệch %":>8}{"IoU dải":>9}')
        for n, y0, y1, ws, w3, dp, ib in bands:
            print(f'   {n:<12}{y0:>5}-{y1:<5}{ws:>11.0f}{w3:>9.0f}{dp:>+8.1f}{ib:>9.3f}')
    return res


if __name__ == '__main__':
    d = sys.argv[1]
    main(d, sys.argv[2] if len(sys.argv) > 2 else os.path.join(ROOT, 'output', 'look', 'ga2', 'ga2_silhouette.png'))
